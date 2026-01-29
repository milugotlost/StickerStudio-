import React, { useState } from 'react';
import { Layer } from '../types';
import { Layers, Eye, EyeOff, Plus, Trash2, Eraser, GripVertical, ChevronLeft, ChevronRight, Sliders, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  isMobile?: boolean;
  onClose?: () => void;
}

// ==================== SortableLayerItem 元件 ====================
interface SortableLayerItemProps {
  layer: Layer;
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onStartEditing: () => void;
  onEditNameChange: (name: string) => void;
  onSaveEditing: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClearLayer: () => void;
  onDeleteLayer?: () => void;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({
  layer,
  isActive,
  isEditing,
  editName,
  onSelect,
  onToggleVisibility,
  onStartEditing,
  onEditNameChange,
  onSaveEditing,
  onKeyDown,
  onClearLayer,
  onDeleteLayer,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 999 : undefined,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`mobile-layer-item ${isActive ? 'active' : ''} ${isDragging ? 'shadow-xl ring-2 ring-blue-400 scale-105' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center text-gray-400 cursor-grab active:cursor-grabbing p-2 -ml-1"
      >
        <GripVertical size={22} />
      </div>

      {/* Visibility Toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
        className={`mobile-layer-btn ${layer.visible ? 'text-gray-600' : 'text-gray-300'}`}
      >
        {layer.visible ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>

      {/* Layer Name - 點擊進入編輯 */}
      <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onBlur={onSaveEditing}
            onKeyDown={onKeyDown}
            className="w-full text-sm text-black bg-white border border-blue-300 rounded-lg px-2 py-1 focus:outline-none"
            autoFocus
          />
        ) : (
          <span
            className="layer-name truncate cursor-text"
            onClick={onStartEditing}
          >
            {layer.name}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mobile-layer-actions">
        <button
          onClick={(e) => { e.stopPropagation(); onClearLayer(); }}
          className="mobile-layer-btn"
        >
          <Eraser size={16} />
        </button>
        {onDeleteLayer && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteLayer(); }}
            className="mobile-layer-btn text-red-400"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

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
  onToggleCollapse,
  isMobile = false,
  onClose
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

  // ==================== @dnd-kit 設定 (手機版觸控拖曳) ====================
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });
  const sensors = useSensors(touchSensor);

  const handleDndDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderLayers(active.id as string, over.id as string);
    }
  };

  // ==================== 手機版 LayerPanel ====================
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-700 font-bold">
            <Layers size={20} />
            <span>圖層管理</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onAddLayer} className="p-2 bg-green-100 text-green-600 rounded-xl">
              <Plus size={20} />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 text-gray-400">
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Active Layer Opacity */}
        {activeLayer && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span className="flex items-center gap-1 font-medium"><Sliders size={14} /> 不透明度</span>
              <span className="font-bold">{Math.round(activeLayer.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0" max="1" step="0.01"
              value={activeLayer.opacity}
              onChange={(e) => onUpdateOpacity(activeLayer.id, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        )}

        {/* Layer List (Sortable) */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDndDragEnd}
        >
          <SortableContext items={displayLayers.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {displayLayers.map((layer) => (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  isActive={layer.id === activeLayerId}
                  isEditing={editingId === layer.id}
                  editName={editName}
                  onSelect={() => onSelectLayer(layer.id)}
                  onToggleVisibility={() => onToggleVisibility(layer.id)}
                  onStartEditing={() => startEditing(layer)}
                  onEditNameChange={setEditName}
                  onSaveEditing={saveEditing}
                  onKeyDown={handleKeyDown}
                  onClearLayer={() => onClearLayer(layer.id)}
                  onDeleteLayer={layers.length > 1 ? () => onDeleteLayer(layer.id) : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="p-3 text-xs text-center text-gray-400 border-t bg-gray-50">
          長按拖曳調整順序 • 雙擊名稱可重新命名
        </div>
      </div>
    );
  }

  // ==================== 桌面版 LayerPanel (原版) ====================
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
            <span className="flex items-center gap-1"><Sliders size={12} /> 不透明度</span>
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
                    ${layer.id === activeLayerId
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