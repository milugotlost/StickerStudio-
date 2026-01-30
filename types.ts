export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
}

export type StickerType = 'regular' | 'main' | 'tab';

export interface StickerMetadata {
  id: string;
  index: number;
  type: StickerType;
  status: 'empty' | 'draft' | 'complete';
  thumbnail?: string;
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  totalStickers: number;
  createdAt: number;
  updatedAt: number;
  stickers: StickerMetadata[];
  layers?: Layer[]; // Making it optional for backward compatibility
}

export type BrushType = 'pen' | 'marker' | 'airbrush' | 'pencil' | 'crayon' | 'watercolor' | 'calligraphy';

export interface TextSettings {
  content: string;
  fontFamily: string;
  fontSize: number;       // 新增：文字大小
  x: number;              // 新增：水平位置 (0-100%)
  y: number;              // 新增：垂直位置 (0-100%)
  hasBorder: boolean;
  borderWidth: number;
  borderColor: string;
  hasBackground: boolean;
  backgroundColor: string;
  letterSpacing: number;
}

export interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
  tool: 'brush' | 'eraser' | 'fill' | 'text';
  brushType: BrushType;
  stabilization: number;
  text: TextSettings;
}

export interface CanvasHandle {
  undo: () => void;
  redo: () => void;
  clearLayer: (layerId?: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  exportImage: () => Promise<string>;
  drawImageOnLayer: (layerId: string, dataUrl: string) => Promise<void>;
  save: () => Promise<string>;
  getPreview: () => string; // 新增：取得即時預覽
}

declare global {
  interface Window {
    JSZip: any;
    saveAs: any;
  }
}