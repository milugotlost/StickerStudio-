import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Project, Layer, BrushSettings, CanvasHandle } from '../types';
import { saveProject, loadLayerImage } from '../services/db';
import { exportProjectToZip } from '../services/export';
import { Toolbar } from '../components/Toolbar';
import { LayerPanel } from '../components/LayerPanel';
import { CanvasBoard } from '../components/CanvasBoard';
import { ChevronLeft, ArrowLeft, ArrowRight, Download, Maximize2, Minimize2, Loader2, Archive, Palette, Layers, Image as ImageIcon, Undo, Redo } from 'lucide-react';
import { backupProject } from '../services/backup';

// 為指定貼圖生成縮圖
const generateThumbnailForSticker = async (
  projectId: string,
  stickerIndex: number,
  stickerType: string,
  layerIds: string[]
): Promise<string | null> => {
  const width = stickerType === 'main' ? 240 : stickerType === 'tab' ? 96 : 370;
  const height = stickerType === 'main' ? 240 : stickerType === 'tab' ? 74 : 320;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let hasContent = false;
  for (const layerId of layerIds) {
    const key = `${projectId}_${stickerIndex}_${layerId}`;
    const dataUrl = await loadLayerImage(key);
    if (dataUrl) {
      hasContent = true;
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      });
    }
  }

  return hasContent ? canvas.toDataURL('image/png', 0.5) : null;
};

// 即時預覽元件
const PreviewCanvas: React.FC<{ canvasRef: React.RefObject<CanvasHandle> }> = ({ canvasRef }) => {
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    let rafId: number;
    let lastUpdate = 0;
    const updatePreview = (time: number) => {
      if (time - lastUpdate > 100 && canvasRef.current) { // 每 100ms 更新一次
        setPreview(canvasRef.current.getPreview());
        lastUpdate = time;
      }
      rafId = requestAnimationFrame(updatePreview);
    };
    rafId = requestAnimationFrame(updatePreview);
    return () => cancelAnimationFrame(rafId);
  }, [canvasRef]);

  return preview ? (
    <img src={preview} className="w-full h-full object-contain" alt="預覽" />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">載入中...</div>
  );
};

interface EditorProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (p: Project) => void;
}

export const Editor: React.FC<EditorProps> = ({ project, onBack, onUpdateProject }) => {
  const [activeStickerId, setActiveStickerId] = useState(project.stickers[2]?.id || project.stickers[0].id);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isLayerPanelCollapsed, setIsLayerPanelCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 本地管理 stickers 以確保縮圖更新後 UI 會重新渲染
  const [localStickers, setLocalStickers] = useState(project.stickers);

  // 手機版狀態
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [mobilePanel, setMobilePanel] = useState<'none' | 'stickers' | 'tools' | 'layers'>('none');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [layers, setLayers] = useState<Layer[]>(project.layers || [
    { id: 'l_draft', name: '草稿', visible: true, opacity: 0.5 },
    { id: 'l_color', name: '上色', visible: true, opacity: 1 },
    { id: 'l_line', name: '線稿', visible: true, opacity: 1 },
  ]);

  const [activeLayerId, setActiveLayerId] = useState(layers.find(l => l.id === 'l_line') ? 'l_line' : layers[layers.length - 1].id);
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    color: '#000000', size: 4, opacity: 1, tool: 'brush', brushType: 'pen', stabilization: 2,
    text: { content: '你好', fontFamily: 'sans-serif', fontSize: 48, x: 50, y: 50, hasBorder: false, borderColor: '#ffffff', borderWidth: 4, hasBackground: false, backgroundColor: '#fbbf24', letterSpacing: 0 }
  });

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  // 即時預覽（用於底部縮圖）
  const [livePreview, setLivePreview] = useState<string>('');
  useEffect(() => {
    let rafId: number;
    let lastUpdate = 0;
    const updatePreview = (time: number) => {
      if (time - lastUpdate > 200 && canvasRef.current) { // 每 200ms 更新一次
        setLivePreview(canvasRef.current.getPreview());
        lastUpdate = time;
      }
      rafId = requestAnimationFrame(updatePreview);
    };
    rafId = requestAnimationFrame(updatePreview);
    return () => cancelAnimationFrame(rafId);
  }, [activeStickerId]);

  // 載入時為所有貼圖生成縮圖
  const thumbnailsGenerated = useRef(false);
  useEffect(() => {
    if (thumbnailsGenerated.current) return; // 防止 StrictMode 重複執行
    thumbnailsGenerated.current = true;

    const generateAllThumbnails = async () => {
      const layerIds = layers.map(l => l.id);
      const updatedStickers = await Promise.all(
        project.stickers.map(async (s, i) => {
          const thumb = await generateThumbnailForSticker(project.id, i, s.type, layerIds);
          return thumb ? { ...s, thumbnail: thumb } : s;
        })
      );

      const hasChanges = updatedStickers.some((s, i) => s.thumbnail !== project.stickers[i].thumbnail);
      if (hasChanges) {
        setLocalStickers(updatedStickers);
        const updatedProject = { ...project, stickers: updatedStickers };
        onUpdateProject(updatedProject);
        await saveProject(updatedProject);
      }
    };
    generateAllThumbnails();
  }, []);

  const isNavigatingBack = useRef(false);

  const activeSticker = project.stickers.find(s => s.id === activeStickerId) || project.stickers[0];
  const activeStickerIndex = project.stickers.indexOf(activeSticker);
  const canvasSize = {
    width: activeSticker.type === 'main' ? 240 : activeSticker.type === 'tab' ? 96 : 370,
    height: activeSticker.type === 'main' ? 240 : activeSticker.type === 'tab' ? 74 : 320,
  };

  const handleSaveSticker = async () => {
    if (!canvasRef.current || isSaving) return "";
    setIsSaving(true);
    try {
      const savePromise = canvasRef.current.save();
      const timeoutPromise = new Promise<string>((resolve) => setTimeout(() => resolve(""), 500));
      return await Promise.race([savePromise, timeoutPromise]);
    } catch (e) {
      console.error("Save process encountered an error:", e);
      return "";
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveComplete = async (thumbnail: string) => {
    if (!thumbnail) return;
    const updatedStickers = localStickers.map(s =>
      s.id === activeStickerId ? { ...s, status: 'draft' as const, thumbnail } : s
    );
    setLocalStickers(updatedStickers); // 更新本地 state
    const updatedProject = { ...project, updatedAt: Date.now(), stickers: updatedStickers, layers: layers };
    await saveProject(updatedProject);

    if (!isNavigatingBack.current) {
      onUpdateProject(updatedProject);
    }
  };

  const switchSticker = async (newId: string | undefined) => {
    if (!newId || newId === activeStickerId || isSaving) return;
    await handleSaveSticker();
    setActiveStickerId(newId);
  };

  const handleExport = async () => {
    await handleSaveSticker();
    exportProjectToZip(project, layers);
  };

  const handleGoBack = () => {
    isNavigatingBack.current = true;
    onBack();
    if (canvasRef.current) {
      canvasRef.current.save().catch(err => console.error("Background save on exit failed:", err));
    }
  };

  const closeMobilePanel = () => setMobilePanel('none');

  // ==================== 手機版介面 ====================
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 font-sans no-select">
        {/* 手機版 Header */}
        <header className="mobile-header shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={handleGoBack} className="touch-target text-gray-600">
              <ChevronLeft size={24} />
            </button>
            <div className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs font-bold">
              {activeSticker.type === 'main' ? 'M' : activeSticker.type === 'tab' ? 'T' : activeStickerIndex - 1}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => canvasRef.current?.undo()} disabled={!canUndo} className="touch-target text-gray-500 disabled:opacity-30">
              <Undo size={20} />
            </button>
            <button onClick={() => canvasRef.current?.redo()} disabled={!canRedo} className="touch-target text-gray-500 disabled:opacity-30">
              <Redo size={20} />
            </button>
            <button onClick={() => setIsZenMode(!isZenMode)} className={`touch-target ${isZenMode ? 'text-blue-600' : 'text-gray-500'}`}>
              {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={handleExport} disabled={isSaving} className="touch-target text-gray-500 disabled:opacity-50">
              <Download size={20} />
            </button>
          </div>
        </header>

        {/* 手機版貼圖選擇器 (頂部 strip) */}
        {!isZenMode && (
          <div className="mobile-sticker-strip shrink-0">
            {project.stickers.map((s, i) => (
              <div
                key={s.id}
                onClick={() => switchSticker(s.id)}
                className={`mobile-sticker-item ${s.id === activeStickerId ? 'active' : ''}`}
              >
                {s.id === activeStickerId && livePreview ? (
                  <img src={livePreview} className="w-full h-full object-contain p-1 pointer-events-none" alt="Preview" />
                ) : s.thumbnail ? (
                  <img src={s.thumbnail} key={s.thumbnail} className="w-full h-full object-contain p-1" alt={`Sticker ${i + 1}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold">
                    {s.type === 'main' ? 'M' : s.type === 'tab' ? 'T' : i - 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Canvas 區域 */}
        <div className="flex-1 overflow-hidden relative" style={{ paddingBottom: isZenMode ? 0 : '56px' }}>
          <CanvasBoard
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            layers={layers}
            activeLayerId={activeLayerId}
            settings={brushSettings}
            projectId={project.id}
            stickerIndex={activeStickerIndex}
            onSaveComplete={handleSaveComplete}
            onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
          />
        </div>

        {/* 底部導航列 */}
        {!isZenMode && (
          <nav className="mobile-bottom-nav">
            <button onClick={() => setMobilePanel(mobilePanel === 'stickers' ? 'none' : 'stickers')} className={`mobile-nav-btn ${mobilePanel === 'stickers' ? 'active' : ''}`}>
              <ImageIcon size={22} />
              <span>貼圖</span>
            </button>
            <button onClick={() => setMobilePanel(mobilePanel === 'tools' ? 'none' : 'tools')} className={`mobile-nav-btn ${mobilePanel === 'tools' ? 'active' : ''}`}>
              <Palette size={22} />
              <span>工具</span>
            </button>
            <button onClick={() => setMobilePanel(mobilePanel === 'layers' ? 'none' : 'layers')} className={`mobile-nav-btn ${mobilePanel === 'layers' ? 'active' : ''}`}>
              <Layers size={22} />
              <span>圖層</span>
            </button>
          </nav>
        )}

        {/* Mobile Overlay */}
        {mobilePanel !== 'none' && <div className="mobile-overlay" onClick={closeMobilePanel} />}

        {/* 工具面板 (底部 Sheet) */}
        {mobilePanel === 'tools' && (
          <div className="mobile-sheet">
            <div className="mobile-sheet-handle" />
            <Toolbar
              settings={brushSettings}
              onChange={setBrushSettings}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={() => canvasRef.current?.undo()}
              onRedo={() => canvasRef.current?.redo()}
              onSave={handleSaveSticker}
              onClearLayer={() => canvasRef.current?.clearLayer()}
              collapsed={false}
              onToggleCollapse={() => { }}
              onImportImage={(url) => canvasRef.current?.drawImageOnLayer(activeLayerId, url)}
              isMobile={true}
            />
          </div>
        )}

        {/* 圖層面板 (右側 Drawer) */}
        {mobilePanel === 'layers' && (
          <div className="mobile-drawer">
            <LayerPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onAddLayer={() => { const id = `l_${Date.now()}`; setLayers([...layers, { id, name: `圖層 ${layers.length + 1}`, visible: true, opacity: 1 }]); setActiveLayerId(id); }}
              onDeleteLayer={(id) => setLayers(layers.filter(l => l.id !== id))}
              onSelectLayer={setActiveLayerId}
              onToggleVisibility={(id) => setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l))}
              onRenameLayer={(id, name) => setLayers(layers.map(l => l.id === id ? { ...l, name } : l))}
              onUpdateOpacity={(id, opacity) => setLayers(layers.map(l => l.id === id ? { ...l, opacity } : l))}
              onClearLayer={(id) => canvasRef.current?.clearLayer(id)}
              onReorderLayers={(d, t) => { const from = layers.findIndex(l => l.id === d); const to = layers.findIndex(l => l.id === t); const newL = [...layers]; const [m] = newL.splice(from, 1); newL.splice(to, 0, m); setLayers(newL); }}
              collapsed={false}
              onToggleCollapse={() => { }}
              isMobile={true}
              onClose={closeMobilePanel}
            />
          </div>
        )}

        {/* 貼圖選擇器面板 */}
        {mobilePanel === 'stickers' && (
          <div className="mobile-sheet">
            <div className="mobile-sheet-handle" />
            <h3 className="text-sm font-bold text-gray-700 mb-3">選擇貼圖</h3>
            <div className="grid grid-cols-5 gap-3">
              {project.stickers.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => { switchSticker(s.id); closeMobilePanel(); }}
                  className={`aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${s.id === activeStickerId ? 'border-slate-800 shadow-lg scale-105' : 'border-gray-200 opacity-70'}`}
                >
                  {s.id === activeStickerId && livePreview ? (
                    <img src={livePreview} className="w-full h-full object-contain p-1 pointer-events-none" alt="Preview" />
                  ) : s.thumbnail ? (
                    <img src={s.thumbnail} key={s.thumbnail} className="w-full h-full object-contain p-1" alt={`Sticker ${i + 1}`} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold bg-gray-50">
                      {s.type === 'main' ? 'M' : s.type === 'tab' ? 'T' : i - 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== 桌面版介面 (原本的) ====================
  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-bold text-sm select-none"
            title="點擊此處返回主畫面"
          >
            <ChevronLeft size={18} />
            <span>返回專案</span>
          </button>

          <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-800 text-white px-2.5 py-1 rounded-md font-mono text-xs font-bold">
              {activeSticker.type === 'main' ? 'M' : activeSticker.type === 'tab' ? 'T' : activeStickerIndex - 1}
            </div>
            <h2 className="font-bold text-gray-800 truncate max-w-[150px] hidden sm:block">{project.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sticker Switcher */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => switchSticker(project.stickers[activeStickerIndex - 1]?.id)}
              disabled={activeStickerIndex === 0 || isSaving}
              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md disabled:opacity-20 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-tighter min-w-[60px] text-center">
              {isSaving ? <Loader2 size={12} className="animate-spin inline" /> : "貼圖切換"}
            </div>
            <button
              onClick={() => switchSticker(project.stickers[activeStickerIndex + 1]?.id)}
              disabled={activeStickerIndex === project.stickers.length - 1 || isSaving}
              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md disabled:opacity-20 transition-all"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="h-8 w-[1px] bg-gray-200 mx-1"></div>

          <button onClick={() => setIsZenMode(!isZenMode)} className={`p-2 rounded-lg transition-colors ${isZenMode ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`} title="專注模式">
            {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          <button
            onClick={() => backupProject(project)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="備份專案 (下載原始檔)"
          >
            <Archive size={20} />
          </button>

          <button
            onClick={handleExport}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Download size={16} /> <span>匯出貼圖包</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {!isZenMode && (
          <Toolbar
            settings={brushSettings}
            onChange={setBrushSettings}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => canvasRef.current?.undo()}
            onRedo={() => canvasRef.current?.redo()}
            onSave={handleSaveSticker}
            onClearLayer={() => canvasRef.current?.clearLayer()}
            collapsed={isToolbarCollapsed}
            onToggleCollapse={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
            onImportImage={(url) => canvasRef.current?.drawImageOnLayer(activeLayerId, url)}
            isMobile={false}
          />
        )}

        <CanvasBoard
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          layers={layers}
          activeLayerId={activeLayerId}
          settings={brushSettings}
          projectId={project.id}
          stickerIndex={activeStickerIndex}
          onSaveComplete={handleSaveComplete}
          onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
        />

        {!isZenMode && (
          <LayerPanel
            layers={layers}
            activeLayerId={activeLayerId}
            onAddLayer={() => { const id = `l_${Date.now()}`; setLayers([...layers, { id, name: `圖層 ${layers.length + 1}`, visible: true, opacity: 1 }]); setActiveLayerId(id); }}
            onDeleteLayer={(id) => setLayers(layers.filter(l => l.id !== id))}
            onSelectLayer={setActiveLayerId}
            onToggleVisibility={(id) => setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l))}
            onRenameLayer={(id, name) => setLayers(layers.map(l => l.id === id ? { ...l, name } : l))}
            onUpdateOpacity={(id, opacity) => setLayers(layers.map(l => l.id === id ? { ...l, opacity } : l))}
            onClearLayer={(id) => canvasRef.current?.clearLayer(id)}
            onReorderLayers={(d, t) => { const from = layers.findIndex(l => l.id === d); const to = layers.findIndex(l => l.id === t); const newL = [...layers]; const [m] = newL.splice(from, 1); newL.splice(to, 0, m); setLayers(newL); }}
            collapsed={isLayerPanelCollapsed}
            onToggleCollapse={() => setIsLayerPanelCollapsed(!isLayerPanelCollapsed)}
            isMobile={false}
          />
        )}
      </div>

      {!isZenMode && (
        <div className="h-20 bg-white border-t border-gray-200 flex items-center px-4 gap-3 overflow-x-auto shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] custom-scrollbar z-20">
          {localStickers.map((s, i) => (
            <motion.div
              key={s.id}
              onClick={() => switchSticker(s.id)}
              className={`flex-shrink-0 w-14 h-14 bg-gray-50 rounded-lg cursor-pointer border-2 overflow-hidden ${s.id === activeStickerId ? 'border-slate-800 shadow-md' : 'border-gray-100'}`}
              animate={{
                scale: s.id === activeStickerId ? 1.08 : 1,
                opacity: s.id === activeStickerId ? 1 : 0.7,
              }}
              whileHover={{ scale: 1.1, opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {/* 當前選中的貼圖顯示即時預覽 */}
              {s.id === activeStickerId && livePreview ? (
                <img src={livePreview} className="w-full h-full object-contain p-1 pointer-events-none" />
              ) : s.thumbnail ? (
                <img src={s.thumbnail} className="w-full h-full object-contain p-1 pointer-events-none" key={s.thumbnail} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase">
                  {s.type === 'main' ? 'M' : s.type === 'tab' ? 'T' : i - 1}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};