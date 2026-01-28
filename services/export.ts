import { Project, Layer } from '../types';
import { loadLayerImage } from './db';

const compositeSticker = async (project: Project, stickerIndex: number, layers: Layer[]): Promise<string> => {
  const sticker = project.stickers[stickerIndex];
  // LINE specifications
  const width = sticker.type === 'main' ? 240 : sticker.type === 'tab' ? 96 : 370;
  const height = sticker.type === 'main' ? 240 : sticker.type === 'tab' ? 74 : 320;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context creation failed");

  ctx.clearRect(0, 0, width, height);

  let hasDrawnContent = false;

  for (const layer of layers) {
    if (!layer.visible) continue;
    
    const key = `${project.id}_${stickerIndex}_${layer.id}`;
    let dataUrl = await loadLayerImage(key);
    
    // Safety retry if first load returns null (occasionally happens due to DB sync)
    if (!dataUrl) {
      await new Promise(r => setTimeout(r, 100));
      dataUrl = await loadLayerImage(key);
    }

    if (dataUrl && dataUrl.startsWith('data:image')) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(img, 0, 0, width, height);
          hasDrawnContent = true;
          resolve();
        };
        img.onerror = () => resolve(); 
        img.src = dataUrl as string;
      });
    }
  }
  
  const finalData = canvas.toDataURL('image/png');
  // Log warning if image seems blank but skip main/tab if they are genuinely empty
  if (!hasDrawnContent && sticker.type === 'regular') {
      console.warn(`Export: Sticker ${stickerIndex} appears to be blank.`);
  }
  return finalData;
};

export const exportProjectToZip = async (project: Project, layers: Layer[]) => {
  if (!window.JSZip || !window.saveAs) {
    alert("外部套件 JSZip 尚未載入，請稍後。");
    return;
  }

  // Mandatory pause to allow last-second canvas saves to commit to IndexedDB
  await new Promise(r => setTimeout(r, 500));

  const zip = new window.JSZip();
  const folderName = project.name.replace(/[\\/:*?"<>|]/g, '_') || 'Stickers';
  const folder = zip.folder(folderName);

  for (let i = 0; i < project.stickers.length; i++) {
    const sticker = project.stickers[i];
    try {
      const dataUrl = await compositeSticker(project, i, layers);
      const base64 = dataUrl.split(',')[1];
      
      let fileName = '';
      if (sticker.type === 'main') {
        fileName = 'main.png';
      } else if (sticker.type === 'tab') {
        fileName = 'tab.png';
      } else {
        const regularStickers = project.stickers.filter(s => s.type === 'regular');
        const regularIndex = regularStickers.findIndex(s => s.id === sticker.id) + 1;
        fileName = `${regularIndex.toString().padStart(2, '0')}.png`;
      }
      
      folder.file(fileName, base64, { base64: true });
    } catch (e) {
      console.error(`Export Error - Index ${i}:`, e);
    }
  }

  try {
    const content = await zip.generateAsync({ type: 'blob' });
    window.saveAs(content, `${project.name}_LINE_Stickers.zip`);
  } catch (err) {
    console.error("ZIP Generation Failed:", err);
    alert("匯出壓縮檔時發生錯誤。");
  }
};