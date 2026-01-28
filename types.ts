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
  save: () => Promise<string>; // New: Returns the thumbnail URL after finishing DB write
}

declare global {
  interface Window {
    JSZip: any;
    saveAs: any;
  }
}