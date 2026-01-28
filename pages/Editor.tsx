import React, { useState, useRef } from 'react';
import { Project, Layer, BrushSettings, CanvasHandle } from '../types';
import { saveProject } from '../services/db';
import { exportProjectToZip } from '../services/export';
import { Toolbar } from '../components/Toolbar';
import { LayerPanel } from '../components/LayerPanel';
import { CanvasBoard } from '../components/CanvasBoard';
import { ChevronLeft, ArrowLeft, ArrowRight, Download, Maximize2, Minimize2, Loader2, Archive } from 'lucide-react';
import { backupProject } from '../services/backup';

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

  const [layers, setLayers] = useState<Layer[]>(project.layers || [
    { id: 'l_draft', name: '草稿', visible: true, opacity: 0.5 },
    { id: 'l_color', name: '上色', visible: true, opacity: 1 },
    { id: 'l_line', name: '線稿', visible: true, opacity: 1 },
  ]);

  const [activeLayerId, setActiveLayerId] = useState(layers.find(l => l.id === 'l_line') ? 'l_line' : layers[layers.length - 1].id);
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    color: '#000000', size: 4, opacity: 1, tool: 'brush', brushType: 'pen', stabilization: 2,
    text: { content: '你好', fontFamily: 'sans-serif', hasBorder: false, borderColor: '#ffffff', borderWidth: 4, hasBackground: false, backgroundColor: '#fbbf24', letterSpacing: 0 }
  });

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  const isNavigatingBack = useRef(false);

  const activeSticker = project.stickers.find(s => s.id === activeStickerId) || project.stickers[0];
  const activeStickerIndex = project.stickers.indexOf(activeSticker);
  const canvasSize = {
    width: activeSticker.type === 'main' ? 240 : activeSticker.type === 'tab' ? 96 : 370,
    height: activeSticker.type === 'main' ? 240 : activeSticker.type === 'tab' ? 74 : 320,
  };

  // Improved save sticker with safety timeout to prevent hanging UI
  const handleSaveSticker = async () => {
    if (!canvasRef.current || isSaving) return "";
    setIsSaving(true);
    try {
      // Use a timeout to ensure we don't wait forever if IndexedDB/Canvas is busy
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
    // Only update project if we actually got a thumbnail
    if (!thumbnail) return;
    const updatedStickers = project.stickers.map(s =>
      s.id === activeStickerId ? { ...s, status: 'draft' as const, thumbnail } : s
    );
    // Save layers state into project
    const updatedProject = { ...project, updatedAt: Date.now(), stickers: updatedStickers, layers: layers };
    await saveProject(updatedProject);

    // If we are going back, DO NOT update the parent state as it would re-open the project
    if (!isNavigatingBack.current) {
      onUpdateProject(updatedProject);
    }
  };

  const switchSticker = async (newId: string | undefined) => {
    if (!newId || newId === activeStickerId || isSaving) return;
    // Attempt save, but move on even if it takes a bit too long
    await handleSaveSticker();
    setActiveStickerId(newId);
  };

  const handleExport = async () => {
    await handleSaveSticker();
    exportProjectToZip(project, layers);
  };

  // Simplest possible back navigation to ensure it NEVER fails
  const handleGoBack = () => {
    isNavigatingBack.current = true;
    // 1. Trigger navigation immediately for better UX
    onBack();
    // 2. Try to save in background if possible, but don't wait for it
    if (canvasRef.current) {
      canvasRef.current.save().catch(err => console.error("Background save on exit failed:", err));
    }
  };

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
          />
        )}
      </div>

      {!isZenMode && (
        <div className="h-20 bg-white border-t border-gray-200 flex items-center px-4 gap-3 overflow-x-auto shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] custom-scrollbar z-20">
          {project.stickers.map((s, i) => (
            <div
              key={s.id}
              onClick={() => switchSticker(s.id)}
              className={`flex-shrink-0 w-14 h-14 bg-gray-50 rounded-lg cursor-pointer border-2 transition-all overflow-hidden ${s.id === activeStickerId ? 'border-slate-800 scale-105 shadow-md' : 'border-gray-100 opacity-60 hover:opacity-100 hover:border-gray-300'}`}
            >
              {s.thumbnail ? (
                <img src={s.thumbnail} className="w-full h-full object-contain p-1 pointer-events-none" key={s.thumbnail} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase">
                  {s.type === 'main' ? 'M' : s.type === 'tab' ? 'T' : i - 1}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};