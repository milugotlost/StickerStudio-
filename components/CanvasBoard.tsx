import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Layer, BrushSettings, CanvasHandle } from '../types';
import { loadLayerImage, saveLayerImage } from '../services/db';
import { Check, X } from 'lucide-react';

interface CanvasBoardProps {
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string;
  settings: BrushSettings;
  projectId: string;
  stickerIndex: number;
  onSaveComplete: (thumbnail: string) => void;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
}

interface HistoryStep {
  layerId: string;
  before: ImageData;
  after: ImageData;
}

interface Point {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

const FILL_TOLERANCE = 40;

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
};

export const CanvasBoard = forwardRef<CanvasHandle, CanvasBoardProps>(({
  width, height, layers, activeLayerId, settings, projectId, stickerIndex, onSaveComplete, onHistoryChange
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [textPos, setTextPos] = useState({ x: width / 2, y: height / 2 });
  const [isDraggingText, setIsDraggingText] = useState(false);

  const lastStablePoint = useRef<Point | null>(null);
  const currentHistoryStart = useRef<ImageData | null>(null);
  const undoStack = useRef<HistoryStep[]>([]);
  const redoStack = useRef<HistoryStep[]>([]);

  // Use local refs to ensure the save logic always uses the ID/Index present when it was triggered
  const currentInfoRef = useRef({ projectId, stickerIndex });
  useEffect(() => {
    currentInfoRef.current = { projectId, stickerIndex };
  }, [projectId, stickerIndex]);

  const performSave = async (): Promise<string> => {
    // Capture the info at the start of the save
    const { projectId: pid, stickerIndex: sidx } = currentInfoRef.current;

    try {
      // 1. Save each layer to IndexedDB
      for (const l of layers) {
        const canvas = canvasRefs.current[l.id];
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          await saveLayerImage(`${pid}_${sidx}_${l.id}`, dataUrl);
        }
      }

      // 2. Generate composite thumbnail
      const temp = document.createElement('canvas');
      temp.width = width;
      temp.height = height;
      const tctx = temp.getContext('2d');
      if (tctx) {
        for (const l of layers) {
          if (l.visible) {
            tctx.globalAlpha = l.opacity;
            const canvas = canvasRefs.current[l.id];
            if (canvas) tctx.drawImage(canvas, 0, 0, width, height);
          }
        }
      }
      const thumbnail = temp.toDataURL('image/png', 0.5);
      onSaveComplete(thumbnail);
      return thumbnail;
    } catch (err) {
      console.error("Internal canvas save error:", err);
      return "";
    }
  };

  useImperativeHandle(ref, () => ({
    save: performSave,
    undo: () => {
      const step = undoStack.current.pop();
      if (step) {
        redoStack.current.push(step);
        const ctx = canvasRefs.current[step.layerId]?.getContext('2d');
        ctx?.putImageData(step.before, 0, 0);
        onHistoryChange(undoStack.current.length > 0, redoStack.current.length > 0);
      }
    },
    redo: () => {
      const step = redoStack.current.pop();
      if (step) {
        undoStack.current.push(step);
        const ctx = canvasRefs.current[step.layerId]?.getContext('2d');
        ctx?.putImageData(step.after, 0, 0);
        onHistoryChange(undoStack.current.length > 0, redoStack.current.length > 0);
      }
    },
    clearLayer: (id) => {
      const targetId = id || activeLayerId;
      const ctx = canvasRefs.current[targetId]?.getContext('2d');
      if (ctx) {
        const before = ctx.getImageData(0, 0, width, height);
        ctx.clearRect(0, 0, width, height);
        undoStack.current.push({ layerId: targetId, before, after: ctx.getImageData(0, 0, width, height) });
        onHistoryChange(undoStack.current.length > 0, redoStack.current.length > 0);
      }
    },
    exportImage: async () => {
      const temp = document.createElement('canvas');
      temp.width = width; temp.height = height;
      const tctx = temp.getContext('2d');
      layers.forEach(l => {
        if (l.visible) {
          tctx!.globalAlpha = l.opacity;
          tctx!.drawImage(canvasRefs.current[l.id]!, 0, 0, width, height);
        }
      });
      return temp.toDataURL();
    },
    drawImageOnLayer: async (id, url) => {
      const ctx = canvasRefs.current[id]?.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        const before = ctx.getImageData(0, 0, width, height);
        const scale = Math.min(width / img.width, height / img.height);
        ctx.drawImage(img, (width - img.width * scale) / 2, (height - img.height * scale) / 2, img.width * scale, img.height * scale);
        undoStack.current.push({ layerId: id, before, after: ctx.getImageData(0, 0, width, height) });
        onHistoryChange(true, false);
      };
      img.src = url;
    },
    getPreview: () => {
      const temp = document.createElement('canvas');
      temp.width = width; temp.height = height;
      const tctx = temp.getContext('2d');
      if (tctx) {
        layers.forEach(l => {
          if (l.visible) {
            tctx.globalAlpha = l.opacity;
            const c = canvasRefs.current[l.id];
            if (c) tctx.drawImage(c, 0, 0, width, height);
          }
        });
      }
      return temp.toDataURL('image/png', 0.5);
    }
  }), [layers, activeLayerId, width, height]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      // Clear canvases immediately to avoid ghosting
      (Object.values(canvasRefs.current) as (HTMLCanvasElement | null)[]).forEach(c => {
        c?.getContext('2d', { willReadFrequently: true })?.clearRect(0, 0, width, height);
      });

      for (const l of layers) {
        const url = await loadLayerImage(`${projectId}_${stickerIndex}_${l.id}`);
        if (!active) return;
        if (url) {
          const img = new Image();
          await new Promise<void>((resolve) => {
            img.onload = () => {
              if (active) canvasRefs.current[l.id]?.getContext('2d')?.drawImage(img, 0, 0, width, height);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          });
        }
      }

      if (active) {
        undoStack.current = [];
        redoStack.current = [];
        onHistoryChange(false, false);
        setTextPos({ x: width / 2, y: height / 2 });
      }
    };
    loadData();
    return () => { active = false; };
  }, [projectId, stickerIndex]);

  const getCoords = (e: React.PointerEvent | MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (width / rect.width), y: (e.clientY - rect.top) * (height / rect.height) };
  };

  const floodFill = (startX: number, startY: number, fillColor: string, opacity: number) => {
    const ctx = canvasRefs.current[activeLayerId]?.getContext('2d');
    if (!ctx) return;
    const x = Math.floor(startX), y = Math.floor(startY);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const { r, g, b } = hexToRgb(fillColor);
    const a = Math.floor(opacity * 255);
    const startIdx = (y * width + x) * 4;
    const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2], sa = data[startIdx + 3];

    if (Math.abs(sr - r) < 1 && Math.abs(sg - g) < 1 && Math.abs(sb - b) < 1 && Math.abs(sa - a) < 1) return;

    const stack: [number, number][] = [[x, y]];
    const visited = new Uint8Array(width * height);
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
      const idx = cy * width + cx;
      if (visited[idx]) continue;
      visited[idx] = 1;
      const pos = idx * 4;
      if (Math.abs(data[pos] - sr) <= FILL_TOLERANCE && Math.abs(data[pos + 1] - sg) <= FILL_TOLERANCE && Math.abs(data[pos + 2] - sb) <= FILL_TOLERANCE && Math.abs(data[pos + 3] - sa) <= FILL_TOLERANCE) {
        data[pos] = r; data[pos + 1] = g; data[pos + 2] = b; data[pos + 3] = a;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return imageData;
  };

  const startDraw = (e: React.PointerEvent) => {
    if (settings.tool === 'text') return;
    const ctx = canvasRefs.current[activeLayerId]?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    currentHistoryStart.current = ctx.getImageData(0, 0, width, height);
    if (settings.tool === 'fill') {
      const after = floodFill(x, y, settings.color, settings.opacity);
      if (after) {
        undoStack.current.push({ layerId: activeLayerId, before: currentHistoryStart.current!, after });
        onHistoryChange(true, false);
      }
      return;
    }
    setIsDrawing(true);
    lastStablePoint.current = { x, y, pressure: e.pressure || 0.5, time: Date.now() };
    drawPoint(lastStablePoint.current, lastStablePoint.current);
  };

  const drawPoint = (s: Point, e: Point) => {
    const ctx = canvasRefs.current[activeLayerId]?.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (settings.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = settings.size;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = settings.color;
      ctx.globalAlpha = settings.opacity;
      ctx.lineWidth = settings.brushType === 'calligraphy' ? settings.size * (0.4 + e.pressure * 1.6) : settings.size;
    }
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const onMove = (e: React.PointerEvent) => {
    if (isDraggingText) { setTextPos(getCoords(e)); return; }
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    let tx = x, ty = y;
    if (settings.stabilization > 0 && lastStablePoint.current) {
      const f = 1 - (settings.stabilization * 0.08);
      tx = lastStablePoint.current.x + (x - lastStablePoint.current.x) * f;
      ty = lastStablePoint.current.y + (y - lastStablePoint.current.y) * f;
    }
    const p = { x: tx, y: ty, pressure: e.pressure || 0.5, time: Date.now() };
    if (lastStablePoint.current) drawPoint(lastStablePoint.current, p);
    lastStablePoint.current = p;
  };

  const stopDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const ctx = canvasRefs.current[activeLayerId]?.getContext('2d');
      if (ctx && currentHistoryStart.current) {
        undoStack.current.push({ layerId: activeLayerId, before: currentHistoryStart.current, after: ctx.getImageData(0, 0, width, height) });
        onHistoryChange(true, false);
      }
    }
    setIsDraggingText(false);
  };

  const bakeText = () => {
    const ctx = canvasRefs.current[activeLayerId]?.getContext('2d');
    if (ctx) {
      const before = ctx.getImageData(0, 0, width, height);
      ctx.font = `${settings.text.fontSize}px "${settings.text.fontFamily}", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (settings.text.hasBackground) {
        const textMetrics = ctx.measureText(settings.text.content);
        const padding = settings.text.fontSize * 0.2;
        ctx.fillStyle = settings.text.backgroundColor;
        ctx.fillRect(
          textPos.x - textMetrics.width / 2 - padding,
          textPos.y - settings.text.fontSize / 2 - padding,
          textMetrics.width + padding * 2,
          settings.text.fontSize + padding * 2
        );
      }
      if (settings.text.hasBorder) {
        ctx.lineWidth = settings.text.borderWidth;
        ctx.strokeStyle = settings.text.borderColor;
        ctx.strokeText(settings.text.content, textPos.x, textPos.y);
      }
      ctx.fillStyle = settings.color;
      ctx.fillText(settings.text.content, textPos.x, textPos.y);
      undoStack.current.push({ layerId: activeLayerId, before, after: ctx.getImageData(0, 0, width, height) });
      onHistoryChange(true, false);
    }
  };

  return (
    <div className="flex-1 bg-gray-200 flex items-center justify-center p-8 overflow-auto relative custom-scrollbar">
      <div
        ref={containerRef}
        className="relative bg-white shadow-2xl checkerboard-bg"
        style={{ width: '90vmin', aspectRatio: `${width}/${height}`, touchAction: 'none' }}
        onPointerDown={startDraw} onPointerMove={onMove} onPointerUp={stopDraw} onPointerLeave={stopDraw}
      >
        {layers.map(l => (
          <canvas key={l.id} ref={el => canvasRefs.current[l.id] = el} width={width} height={height} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: l.visible ? l.opacity : 0 }} />
        ))}
        {settings.tool === 'text' && settings.text.content && (
          <div className="absolute origin-center flex flex-col items-center group pointer-events-none" style={{ left: `${(textPos.x / width) * 100}%`, top: `${(textPos.y / height) * 100}%`, transform: 'translate(-50%, -50%)' }}>
            <div
              onPointerDown={(e) => { e.stopPropagation(); setIsDraggingText(true); }}
              className="cursor-move select-none whitespace-pre pointer-events-auto border-2 border-blue-400 border-dashed rounded-lg"
              style={{
                fontFamily: settings.text.fontFamily,
                fontSize: `${(settings.text.fontSize / width) * 90}vmin`,
                color: settings.color,
                WebkitTextStroke: settings.text.hasBorder ? `${(settings.text.borderWidth / width) * 90}vmin ${settings.text.borderColor}` : '0',
                paintOrder: 'stroke fill',
                backgroundColor: settings.text.hasBackground ? settings.text.backgroundColor : 'transparent',
                padding: settings.text.hasBackground ? '0.2em 0.4em' : '0.1em',
              }}
            >
              {settings.text.content}
            </div>
            <div className="flex gap-2 mt-2 bg-white shadow-xl rounded-full p-2 border border-gray-200 pointer-events-auto">
              <button onClick={bakeText} className="p-2 bg-green-500 text-white rounded-full transition-transform active:scale-90"><Check size={20} /></button>
              <button onClick={() => setTextPos({ x: -1000, y: -1000 })} className="p-2 bg-red-500 text-white rounded-full transition-transform active:scale-90"><X size={20} /></button>
            </div>
          </div>
        )}
      </div>
      <style>{`.checkerboard-bg { background-image: linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%); background-size: 20px 20px; }`}</style>
    </div>
  );
});

CanvasBoard.displayName = "CanvasBoard";