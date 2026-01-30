import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrushSettings, BrushType } from '../types';
import {
    Brush, Eraser, Undo, Redo, Trash2, PaintBucket,
    PenTool, Highlighter, SprayCan, Pencil, Minus, Type, Feather,
    ChevronLeft, ChevronRight, Image as ImageIcon, Upload
} from 'lucide-react';

interface ToolbarProps {
    settings: BrushSettings;
    onChange: (settings: BrushSettings) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onSave: () => void;
    onClearLayer: () => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onImportImage: (dataUrl: string) => void;
    isMobile?: boolean;
}

const BRUSH_PRESETS: { id: BrushType; name: string; icon: React.ReactNode; defaultSize: number; defaultOpacity: number; defaultStabilization: number }[] = [
    { id: 'pen', name: '沾水筆', icon: <PenTool size={18} />, defaultSize: 4, defaultOpacity: 1, defaultStabilization: 2 },
    { id: 'marker', name: '麥克筆', icon: <Highlighter size={18} />, defaultSize: 12, defaultOpacity: 1, defaultStabilization: 0 },
    { id: 'calligraphy', name: '書法', icon: <Feather size={18} />, defaultSize: 24, defaultOpacity: 0.9, defaultStabilization: 5 },
    { id: 'pencil', name: '鉛筆', icon: <Pencil size={18} />, defaultSize: 3, defaultOpacity: 0.8, defaultStabilization: 0 },
    { id: 'crayon', name: '蠟筆', icon: <Minus size={18} className="transform rotate-45" />, defaultSize: 15, defaultOpacity: 1, defaultStabilization: 0 },
    { id: 'watercolor', name: '水彩', icon: <Brush size={18} />, defaultSize: 20, defaultOpacity: 0.4, defaultStabilization: 0 },
    { id: 'airbrush', name: '噴槍', icon: <SprayCan size={18} />, defaultSize: 30, defaultOpacity: 0.6, defaultStabilization: 0 },
];

const SWATCHES = [
    '#000000', '#333333', '#666666', '#FFFFFF',
    '#EF4444', '#F87171', '#FCA5A5',
    '#F97316', '#FDBA74', '#FFEDD5',
    '#F59E0B', '#FCD34D', '#FEF3C7',
    '#10B981', '#34D399', '#6EE7B7',
    '#06C755', '#3B82F6', '#60A5FA',
    '#6366F1', '#8B5CF6', '#A78BFA',
    '#EC4899', '#F472B6', '#FBCFE8',
    '#78350F', '#92400E', '#B45309',
];

const DEFAULT_FONTS = ['sans-serif', 'serif', 'monospace', 'Arial', 'Verdana', 'Times New Roman'];

export const Toolbar: React.FC<ToolbarProps> = ({
    settings, onChange, canUndo, canRedo, onUndo, onRedo, onClearLayer, collapsed, onToggleCollapse, onImportImage, isMobile = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const [customFonts, setCustomFonts] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'tool' | 'brush' | 'color'>('tool');

    // 顏色歷史記錄（最多 8 個）
    const [colorHistory, setColorHistory] = useState<string[]>(() => {
        const saved = localStorage.getItem('stix_color_history');
        return saved ? JSON.parse(saved) : [];
    });

    // 當顏色改變時，更新歷史
    useEffect(() => {
        if (settings.color && settings.tool !== 'eraser') {
            setColorHistory(prev => {
                const filtered = prev.filter(c => c !== settings.color);
                const newHistory = [settings.color, ...filtered].slice(0, 8);
                localStorage.setItem('stix_color_history', JSON.stringify(newHistory));
                return newHistory;
            });
        }
    }, [settings.color]);

    const handleToolChange = (tool: 'brush' | 'eraser' | 'fill' | 'text') => {
        onChange({ ...settings, tool });
    };

    const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const buffer = await file.arrayBuffer();
                const fontName = file.name.split('.')[0];
                const font = new FontFace(fontName, buffer);
                await font.load();
                document.fonts.add(font);
                setCustomFonts(prev => [...prev, fontName]);
                onChange({ ...settings, text: { ...settings.text, fontFamily: fontName } });
            } catch (err) { alert("字型載入失敗"); }
        }
    };

    // ==================== 手機版 Toolbar ====================
    if (isMobile) {
        return (
            <div className="space-y-4">
                <input type="file" ref={fileInputRef} onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { const r = new FileReader(); r.onload = (ev) => onImportImage(ev.target?.result as string); r.readAsDataURL(f); }
                }} accept="image/*" className="hidden" />
                <input type="file" ref={fontInputRef} onChange={handleFontUpload} accept=".ttf,.otf,.woff,.woff2" className="hidden" />

                {/* 分頁選擇 */}
                <div className="flex bg-gray-100 rounded-xl p-1">
                    {[
                        { id: 'tool', label: '工具' },
                        { id: 'brush', label: '筆刷' },
                        { id: 'color', label: '顏色' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === tab.id ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 工具分頁 */}
                {activeTab === 'tool' && (
                    <div className="space-y-4">
                        <div className="mobile-tool-grid">
                            {[
                                { id: 'brush', icon: <Brush size={24} />, label: '畫筆' },
                                { id: 'eraser', icon: <Eraser size={24} />, label: '橡皮擦' },
                                { id: 'fill', icon: <PaintBucket size={24} />, label: '填色' },
                                { id: 'text', icon: <Type size={24} />, label: '文字' },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleToolChange(t.id as any)}
                                    className={`mobile-tool-btn ${settings.tool === t.id ? 'active' : ''}`}
                                >
                                    {t.icon}
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* 文字設定 - 選中文字工具時優先顯示 */}
                        {settings.tool === 'text' ? (
                            <div className="space-y-3 bg-white rounded-xl">
                                {/* 文字輸入 */}
                                <input
                                    type="text"
                                    value={settings.text.content}
                                    onChange={(e) => onChange({ ...settings, text: { ...settings.text, content: e.target.value } })}
                                    className="w-full p-4 border-2 border-blue-300 rounded-xl text-base text-slate-900 bg-white focus:border-blue-500 focus:outline-none"
                                    placeholder="輸入文字..."
                                />

                                {/* 字型選擇 */}
                                <div className="flex gap-2">
                                    <select
                                        value={settings.text.fontFamily}
                                        onChange={(e) => onChange({ ...settings, text: { ...settings.text, fontFamily: e.target.value } })}
                                        className="flex-1 p-3 border border-gray-300 rounded-xl text-sm bg-white text-slate-900"
                                        style={{ maxHeight: '200px' }}
                                    >
                                        {DEFAULT_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                        {customFonts.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                    <button
                                        onClick={() => fontInputRef.current?.click()}
                                        className="p-3 bg-slate-200 rounded-xl text-slate-600"
                                        title="上傳字型"
                                    >
                                        <Upload size={18} />
                                    </button>
                                </div>

                                {/* 文字大小 */}
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                                        <span className="font-bold">大小</span>
                                        <span>{settings.text.fontSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="12" max="120" step="2"
                                        value={settings.text.fontSize}
                                        onChange={(e) => onChange({ ...settings, text: { ...settings.text, fontSize: parseInt(e.target.value) } })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                {/* 提示 */}
                                <div className="text-xs text-center text-gray-400 py-2">
                                    💡 輸入文字後可在畫布上拖曳調整位置
                                </div>

                                {/* 描邊 & 背景 */}
                                <div className="flex gap-2">
                                    <div className="flex-1 flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                            <input
                                                type="checkbox"
                                                checked={settings.text.hasBorder}
                                                onChange={(e) => onChange({ ...settings, text: { ...settings.text, hasBorder: e.target.checked } })}
                                                className="w-4 h-4 rounded"
                                            />
                                            描邊
                                        </label>
                                        {settings.text.hasBorder && (
                                            <input
                                                type="color"
                                                value={settings.text.borderColor}
                                                onChange={(e) => onChange({ ...settings, text: { ...settings.text, borderColor: e.target.value } })}
                                                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                            <input
                                                type="checkbox"
                                                checked={settings.text.hasBackground}
                                                onChange={(e) => onChange({ ...settings, text: { ...settings.text, hasBackground: e.target.checked } })}
                                                className="w-4 h-4 rounded"
                                            />
                                            背景
                                        </label>
                                        {settings.text.hasBackground && (
                                            <input
                                                type="color"
                                                value={settings.text.backgroundColor}
                                                onChange={(e) => onChange({ ...settings, text: { ...settings.text, backgroundColor: e.target.value } })}
                                                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* 快捷操作 - 非文字工具時才顯示 */}
                                <div className="flex gap-2">
                                    <button onClick={onUndo} disabled={!canUndo} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-600 font-bold text-sm disabled:opacity-30 flex items-center justify-center gap-2">
                                        <Undo size={18} /> 復原
                                    </button>
                                    <button onClick={onRedo} disabled={!canRedo} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-600 font-bold text-sm disabled:opacity-30 flex items-center justify-center gap-2">
                                        <Redo size={18} /> 重做
                                    </button>
                                    <button onClick={onClearLayer} className="py-3 px-4 bg-red-50 rounded-xl text-red-500 font-bold text-sm flex items-center justify-center gap-2">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {/* 匯入圖片 */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold text-sm flex items-center justify-center gap-2"
                                >
                                    <ImageIcon size={20} /> 匯入圖片
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* 筆刷分頁 */}
                {activeTab === 'brush' && (
                    <div className="space-y-4">
                        <div className="mobile-brush-grid">
                            {BRUSH_PRESETS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => onChange({ ...settings, brushType: p.id, size: p.defaultSize, opacity: p.defaultOpacity, stabilization: p.defaultStabilization })}
                                    className={`mobile-brush-btn ${settings.brushType === p.id ? 'active' : ''}`}
                                >
                                    <div className={settings.brushType === p.id ? 'text-blue-600' : 'text-gray-400'}>{p.icon}</div>
                                    <span>{p.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* 滑桿設定 */}
                        <div className="mobile-slider-group">
                            <div className="mobile-slider-row">
                                <span className="mobile-slider-label">尺寸</span>
                                <input type="range" min="1" max="150" value={settings.size} onChange={(e) => onChange({ ...settings, size: parseInt(e.target.value) })} className="flex-1 accent-slate-800" />
                                <span className="mobile-slider-value">{settings.size}px</span>
                            </div>
                            <div className="mobile-slider-row">
                                <span className="mobile-slider-label">透明度</span>
                                <input type="range" min="0.01" max="1" step="0.01" value={settings.opacity} onChange={(e) => onChange({ ...settings, opacity: parseFloat(e.target.value) })} className="flex-1 accent-slate-800" />
                                <span className="mobile-slider-value">{Math.round(settings.opacity * 100)}%</span>
                            </div>
                            <div className="mobile-slider-row">
                                <span className="mobile-slider-label">抖動修正</span>
                                <input type="range" min="0" max="10" value={settings.stabilization} onChange={(e) => onChange({ ...settings, stabilization: parseInt(e.target.value) })} className="flex-1 accent-slate-800" />
                                <span className="mobile-slider-value">{settings.stabilization}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 顏色分頁 */}
                {activeTab === 'color' && (
                    <div className="space-y-4">
                        {/* 顏色歷史 */}
                        {colorHistory.length > 0 && (
                            <div>
                                <div className="text-xs text-slate-500 mb-2 font-bold">最近使用</div>
                                <div className="flex gap-2 flex-wrap">
                                    {colorHistory.map((c, i) => (
                                        <motion.button
                                            key={`${c}-${i}`}
                                            onClick={() => onChange({ ...settings, color: c })}
                                            className={`w-8 h-8 rounded-lg border-2 ${settings.color.toLowerCase() === c.toLowerCase() ? 'border-slate-800 scale-110' : 'border-gray-200'}`}
                                            style={{ backgroundColor: c }}
                                            whileHover={{ scale: 1.15 }}
                                            whileTap={{ scale: 0.95 }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="mobile-color-grid">
                            {SWATCHES.map(c => (
                                <motion.button
                                    key={c}
                                    onClick={() => onChange({ ...settings, color: c })}
                                    className={`mobile-color-btn ${settings.color.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
                                    style={{ backgroundColor: c }}
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <input type="color" value={settings.color} onChange={(e) => onChange({ ...settings, color: e.target.value })} className="w-12 h-12 cursor-pointer border-0 p-0 rounded-lg" />
                            <span className="text-sm font-mono text-slate-600 font-bold">{settings.color.toUpperCase()}</span>
                            <div className="flex-1" />
                            <div className="w-12 h-12 rounded-lg border-2 border-gray-200" style={{ backgroundColor: settings.color }} />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==================== 桌面版 Toolbar (原版) ====================
    return (
        <div className={`h-full bg-white border-r border-gray-200 flex flex-col shadow-xl z-20 transition-all duration-300 ${collapsed ? 'w-16' : 'w-80'}`}>
            <input type="file" ref={fileInputRef} onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { const r = new FileReader(); r.onload = (ev) => onImportImage(ev.target?.result as string); r.readAsDataURL(f); }
            }} accept="image/*" className="hidden" />
            <input type="file" ref={fontInputRef} onChange={handleFontUpload} accept=".ttf,.otf,.woff,.woff2" className="hidden" />

            {/* History Actions */}
            <div className={`p-2 border-b border-gray-100 flex ${collapsed ? 'flex-col gap-2 items-center' : 'flex-row gap-2'}`}>
                <div className="flex gap-1 flex-1">
                    <button onClick={onUndo} disabled={!canUndo} className="flex-1 p-2 rounded-lg bg-gray-100 text-slate-700 hover:bg-slate-200 disabled:opacity-20" title="復原">
                        <Undo size={18} />
                    </button>
                    <button onClick={onRedo} disabled={!canRedo} className="flex-1 p-2 rounded-lg bg-gray-100 text-slate-700 hover:bg-slate-200 disabled:opacity-20" title="重做">
                        <Redo size={18} />
                    </button>
                </div>
                <button onClick={onClearLayer} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="清空圖層">
                    <Trash2 size={18} />
                </button>
                <button onClick={onToggleCollapse} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
                    <ChevronLeft size={16} className={collapsed ? 'rotate-180' : ''} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                {/* Main Tool Selector */}
                <div className={`bg-gray-100 p-1 rounded-xl flex ${collapsed ? 'flex-col gap-1' : 'flex-row'}`}>
                    {[
                        { id: 'brush', icon: <Brush size={18} />, label: '畫筆' },
                        { id: 'eraser', icon: <Eraser size={18} />, label: '橡皮擦' },
                        { id: 'fill', icon: <PaintBucket size={18} />, label: '填色' },
                        { id: 'text', icon: <Type size={18} />, label: '文字' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleToolChange(t.id as any)}
                            className={`flex-1 py-2 flex justify-center rounded-lg transition-all ${settings.tool === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            title={collapsed ? t.label : undefined}
                        >
                            {t.icon}
                        </button>
                    ))}
                </div>

                {/* Text Settings */}
                {!collapsed && settings.tool === 'text' && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">文字設定</h3>
                        <input
                            type="text" value={settings.text.content}
                            onChange={(e) => onChange({ ...settings, text: { ...settings.text, content: e.target.value } })}
                            className="w-full p-2 border border-gray-300 rounded text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="輸入貼圖文字..."
                        />
                        <div className="flex gap-2">
                            <select value={settings.text.fontFamily} onChange={(e) => onChange({ ...settings, text: { ...settings.text, fontFamily: e.target.value } })} className="flex-1 p-2 border border-gray-300 rounded text-sm bg-white text-slate-900">
                                {DEFAULT_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                {customFonts.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <button onClick={() => fontInputRef.current?.click()} className="p-2 bg-slate-200 hover:bg-slate-300 rounded text-slate-600" title="自訂字型">
                                <Upload size={16} />
                            </button>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500 font-medium"><span>文字大小</span><span>{settings.size}px</span></div>
                            <input type="range" min="10" max="150" value={settings.size} onChange={(e) => onChange({ ...settings, size: parseInt(e.target.value) })} className="w-full accent-slate-800" />
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-bold">
                                <input type="checkbox" checked={settings.text.hasBorder} onChange={(e) => onChange({ ...settings, text: { ...settings.text, hasBorder: e.target.checked } })} className="rounded" /> 描邊
                            </label>
                            <input type="color" value={settings.text.borderColor} onChange={(e) => onChange({ ...settings, text: { ...settings.text, borderColor: e.target.value } })} className="w-8 h-8 rounded border-0 p-0 overflow-hidden cursor-pointer" />
                        </div>
                        {settings.text.hasBorder && (
                            <input type="range" min="1" max="20" value={settings.text.borderWidth} onChange={(e) => onChange({ ...settings, text: { ...settings.text, borderWidth: parseInt(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-800" />
                        )}
                        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-bold">
                                <input type="checkbox" checked={settings.text.hasBackground} onChange={(e) => onChange({ ...settings, text: { ...settings.text, hasBackground: e.target.checked } })} className="rounded" /> 背景色塊
                            </label>
                            <input type="color" value={settings.text.backgroundColor} onChange={(e) => onChange({ ...settings, text: { ...settings.text, backgroundColor: e.target.value } })} className="w-8 h-8 rounded border-0 p-0 overflow-hidden cursor-pointer" />
                        </div>
                    </div>
                )}

                {/* Brush Presets */}
                {!collapsed && settings.tool === 'brush' && (
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">筆刷預設</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {BRUSH_PRESETS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => onChange({ ...settings, brushType: p.id, size: p.defaultSize, opacity: p.defaultOpacity, stabilization: p.defaultStabilization })}
                                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${settings.brushType === p.id ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-800' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                >
                                    <div className={settings.brushType === p.id ? 'text-slate-800' : 'text-slate-400'}>{p.icon}</div>
                                    <span className="text-[10px] font-bold text-slate-600">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sliders for Brush/Eraser */}
                {!collapsed && (settings.tool === 'brush' || settings.tool === 'eraser') && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500 font-bold"><span>尺寸</span><span>{settings.size}px</span></div>
                            <input type="range" min="1" max="150" value={settings.size} onChange={(e) => onChange({ ...settings, size: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-800" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500 font-bold"><span>不透明度</span><span>{Math.round(settings.opacity * 100)}%</span></div>
                            <input type="range" min="0.01" max="1" step="0.01" value={settings.opacity} onChange={(e) => onChange({ ...settings, opacity: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-800" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500 font-bold"><span>抖動修正</span><span>{settings.stabilization}</span></div>
                            <input type="range" min="0" max="10" value={settings.stabilization} onChange={(e) => onChange({ ...settings, stabilization: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-800" />
                        </div>
                    </div>
                )}

                {/* Color Section */}
                {settings.tool !== 'eraser' && (
                    <div className="space-y-3">
                        {!collapsed && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">顏色</h3>}
                        <div className={`flex flex-wrap gap-1.5 ${collapsed ? 'justify-center' : ''}`}>
                            {SWATCHES.map(c => (
                                <button
                                    key={c}
                                    onClick={() => onChange({ ...settings, color: c })}
                                    className={`w-6 h-6 rounded-full border border-gray-200 ${settings.color.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-slate-800 ring-offset-1 scale-110' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        {!collapsed && (
                            <div className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <input type="color" value={settings.color} onChange={(e) => onChange({ ...settings, color: e.target.value })} className="w-10 h-10 cursor-pointer border-0 p-0 overflow-hidden" />
                                <span className="text-xs font-mono text-slate-600 font-bold">{settings.color.toUpperCase()}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Import */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-300 hover:bg-blue-50 text-gray-400 transition-all ${collapsed ? 'flex-col text-[10px]' : 'text-sm font-bold'}`}
                >
                    <ImageIcon size={20} />
                    {!collapsed && "匯入圖片"}
                </button>
            </div>
        </div>
    );
};