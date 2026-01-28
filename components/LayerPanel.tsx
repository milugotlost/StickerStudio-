import React, { useState } from 'react';
import { Layer } from '../types';
import { Layers, Eye, EyeOff, Plus, Trash2, Eraser, GripVertical, ChevronLeft, ChevronRight, Sliders } from 'lucide-react';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRenameLayer: (id: string, newName: string) => void;
  onUpdateOpacity: (id: string, opacity: number) => void;
  onClearLayer: (id: string) => void;
  onReorderLayers: (draggedId: string, targetId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onAddLayer,
  onDeleteLayer,
  onSelectLayer,
  onToggleVisibility,
  onRenameLayer,
  onUpdateOpacity,
  onClearLayer,
  onReorderLayers,
  collapsed,
  onToggleCollapse
}) => {
  // Reverse layers for display so top layer is at top of list
  const displayLayers = [...layers].reverse();
  const activeLayer = layers.find(l => l.id === activeLayerId);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const startEditing = (layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) {
      onRenameLayer(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditing();
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault(); 
    if (dragOverId !== id) {
        setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== targetId) {
      onReorderLayers(draggedId, targetId);
    }
  };

  const handleDragEnd = () => {
      setDragOverId(null);
  };

  return (
    <div className={`bg-white border-l border-gray-200 flex flex-col h-full shadow-lg transition-all duration-300 ease-in-out ${collapsed ? 'w-12' : 'w-64'}`}>
      
      {/* Header */}
      <div className={`p-2 border-b border-gray-100 flex items-center bg-gray-50 ${collapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
        {!collapsed && (
            <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Layers size={18} />
            <span>圖層列表</span>
            </div>
        )}
        
        {collapsed && (
            <div className="text-gray-400 py-2" title="圖層">
                <Layers size={20} />
            </div>
        )}

        <div className="flex flex-col gap-2">
            <button
                onClick={onToggleCollapse}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title={collapsed ? "展開" : "折疊"}
            >
                {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
            {!collapsed && (
                <button
                onClick={onAddLayer}
                className="p-1.5 hover:bg-green-100 text-green-600 rounded transition-colors"
                title="新增圖層"
                >
                <Plus size={18} />
                </button>
            )}
        </div>
      </div>
      
      {/* Active Layer Property (Opacity) - Only when expanded */}
      {!collapsed && activeLayer && (
          <div className="p-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1"><Sliders size={12}/> 不透明度</span>
                  <span>{Math.round(activeLayer.opacity * 100)}%</span>
              </div>
              <input 
                  type="range" 
                  min="0" max="1" step="0.01" 
                  value={activeLayer.opacity}
                  onChange={(e) => onUpdateOpacity(activeLayer.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
          </div>
      )}
      
      {/* Collapsed View: Just Add Button if needed or Vertical Text */}
      {collapsed && (
          <div className="flex flex-col items-center pt-2">
               <button
                onClick={onAddLayer}
                className="p-2 hover:bg-green-100 text-green-600 rounded-full transition-colors mb-2"
                title="新增圖層"
                >
                <Plus size={18} />
                </button>
                <div className="writing-vertical-rl text-xs text-gray-400 tracking-widest mt-4 select-none">
                    圖層管理
                </div>
          </div>
      )}

      {/* Expanded View: Full List */}
      {!collapsed && (
        <>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {displayLayers.map((layer) => (
                <div
                    key={layer.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, layer.id)}
                    onDragOver={(e) => handleDragOver(e, layer.id)}
                    onDrop={(e) => handleDrop(e, layer.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectLayer(layer.id)}
                    className={`
                    group flex items-center gap-2 p-2 rounded cursor-pointer border transition-all relative
                    ${
                        layer.id === activeLayerId
                        ? 'bg-blue-50 border-blue-400 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-300'
                    }
                    ${dragOverId === layer.id ? 'border-t-4 border-t-blue-500' : ''}
                    `}
                >
                    {/* Drag Handle */}
                    <div className="cursor-grab text-gray-300 hover:text-gray-500">
                        <GripVertical size={14} />
                    </div>

                    {/* Visibility Toggle */}
                    <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(layer.id);
                    }}
                    className={`p-1 rounded hover:bg-gray-200 ${layer.visible ? 'text-gray-600' : 'text-gray-300'}`}
                    title={layer.visible ? "隱藏圖層" : "顯示圖層"}
                    >
                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    {/* Layer Name */}
                    <div className="flex-1 min-w-0">
                    {editingId === layer.id ? (
                        <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={saveEditing}
                        onKeyDown={handleKeyDown}
                        className="w-full text-sm !text-black !bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span 
                        className="block text-sm font-medium text-gray-700 select-none truncate"
                        onDoubleClick={() => startEditing(layer)}
                        title="雙擊重新命名"
                        >
                        {layer.name}
                        </span>
                    )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                        e.stopPropagation();
                        onClearLayer(layer.id);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="清空圖層內容"
                    >
                        <Eraser size={14} />
                    </button>

                    {layers.length > 1 && (
                        <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLayer(layer.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded ml-1"
                        title="刪除圖層"
                        >
                        <Trash2 size={14} />
                        </button>
                    )}
                    </div>
                </div>
                ))}
            </div>
            <div className="p-2 text-xs text-center text-gray-400 border-t bg-gray-50">
                雙擊名稱可重新命名
            </div>
        </>
      )}
      <style>{`
          .writing-vertical-rl {
              writing-mode: vertical-rl;
              text-orientation: upright;
          }
      `}</style>
    </div>
  );
};