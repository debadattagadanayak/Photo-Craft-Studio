import { CellRect, CollageSettings, ImageItem } from '../types';

// Global image cache to prevent reload flickering
const imageCache = new Map<string, HTMLImageElement>();

export async function preloadImages(images: ImageItem[]): Promise<Map<string, HTMLImageElement>> {
  const promises = images.map(
    item =>
      new Promise<[string, HTMLImageElement]>((resolve, reject) => {
        if (imageCache.has(item.src)) {
          resolve([item.id, imageCache.get(item.src)!]);
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageCache.set(item.src, img);
          resolve([item.id, img]);
        };
        img.onerror = () => {
          // Resolve fallback canvas element if image fails
          const fallback = createFallbackCanvasImage(item.name);
          resolve([item.id, fallback]);
        };
        img.src = item.src;
      })
  );

  const entries = await Promise.all(promises);
  return new Map(entries);
}

function createFallbackCanvasImage(label: string): HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label || 'Image Error', 200, 150);
  }
  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  images: ImageItem[];
  cells: CellRect[];
  settings: CollageSettings;
  targetWidth: number;
  targetHeight: number;
  loadedImages: Map<string, HTMLImageElement>;
  isExport?: boolean;
}

export function renderCollage({
  canvas,
  images,
  cells,
  settings,
  targetWidth,
  targetHeight,
  loadedImages,
  isExport = false,
}: RenderOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set logical buffer dimensions
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.save();

  // Clear canvas
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  // Canvas background
  if (!settings.isCanvasTransparent) {
    ctx.fillStyle = settings.canvasBgColor || '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // Calculate scale factor relative to standard 1000px reference base
  const scale = Math.min(targetWidth, targetHeight) / 1000;

  // Scaled padding & gap
  const paddingPx = settings.padding * scale;
  const gapPx = settings.gap * scale;

  const activeWidth = Math.max(0, targetWidth - paddingPx * 2);
  const activeHeight = Math.max(0, targetHeight - paddingPx * 2);

  // Render cells
  for (const cell of cells) {
    const imgItem = images[cell.imageIndex];
    if (!imgItem) continue;

    const imgElement = loadedImages.get(imgItem.id) || imageCache.get(imgItem.src);
    if (!imgElement) continue;

    // Cell outer box in pixels
    const cellX = paddingPx + cell.x * activeWidth + gapPx / 2;
    const cellY = paddingPx + cell.y * activeHeight + gapPx / 2;
    const cellW = Math.max(0, cell.w * activeWidth - gapPx);
    const cellH = Math.max(0, cell.h * activeHeight - gapPx);

    if (cellW <= 0 || cellH <= 0) continue;

    // 1. Draw cell background (if cellBgColor set and not transparent)
    if (settings.cellBgColor && settings.cellBgColor !== 'transparent') {
      ctx.fillStyle = settings.cellBgColor;
      ctx.fillRect(cellX, cellY, cellW, cellH);
    }

    // 2. Compute image box and crop parameters
    let fitX = cellX;
    let fitY = cellY;
    let fitW = cellW;
    let fitH = cellH;

    let srcX = 0;
    let srcY = 0;
    let srcW = imgElement.naturalWidth || 1000;
    let srcH = imgElement.naturalHeight || 1000;

    if (imgItem.crop) {
      // User manual custom crop
      fitX = cellX;
      fitY = cellY;
      fitW = cellW;
      fitH = cellH;

      srcX = imgItem.crop.sx * srcW;
      srcY = imgItem.crop.sy * srcH;
      srcW = imgItem.crop.sw * srcW;
      srcH = imgItem.crop.sh * srcH;
    } else if (cell.crop && settings.layoutType === 'ai_smart_crop') {
      // Smart cover crop for flawless mosaic layout
      fitX = cellX;
      fitY = cellY;
      fitW = cellW;
      fitH = cellH;

      srcX = cell.crop.sx * srcW;
      srcY = cell.crop.sy * srcH;
      srcW = cell.crop.sw * srcW;
      srcH = cell.crop.sh * srcH;
    } else {
      // Contain mode (NO CROPPING)
      const imgRatio = imgItem.aspectRatio || srcW / srcH || 1;
      const cellRatio = cellW / cellH;

      if (imgRatio > cellRatio) {
        fitW = cellW;
        fitH = cellW / imgRatio;
      } else {
        fitH = cellH;
        fitW = cellH * imgRatio;
      }

      // Alignment inside cell
      if (settings.alignHorizontal === 'center') {
        fitX = cellX + (cellW - fitW) / 2;
      } else if (settings.alignHorizontal === 'right') {
        fitX = cellX + cellW - fitW;
      }

      if (settings.alignVertical === 'center') {
        fitY = cellY + (cellH - fitH) / 2;
      } else if (settings.alignVertical === 'bottom') {
        fitY = cellY + cellH - fitH;
      }
    }

    // 3. Corner Radius, Border & Shadow scaling
    const cornerRadiusPx = settings.cornerRadius * scale;
    const borderWidthPx = settings.borderWidth * scale;

    ctx.save();

    // Shadow configuration
    if (settings.shadowEnabled) {
      ctx.shadowColor = settings.shadowColor || 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = settings.shadowBlur * scale;
      ctx.shadowOffsetX = settings.shadowOffsetX * scale;
      ctx.shadowOffsetY = settings.shadowOffsetY * scale;
    }

    // Path for rounded corners
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(fitX, fitY, fitW, fitH, cornerRadiusPx);
    } else {
      drawRoundRectPath(ctx, fitX, fitY, fitW, fitH, cornerRadiusPx);
    }

    // If shadow is enabled, fill path to project drop shadow
    if (settings.shadowEnabled) {
      if (settings.cellBgColor && settings.cellBgColor !== 'transparent') {
        ctx.fillStyle = settings.cellBgColor;
      } else if (!settings.isCanvasTransparent && settings.canvasBgColor) {
        ctx.fillStyle = settings.canvasBgColor;
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
      }
      ctx.fill();

      // Clear shadow properties before drawing actual image
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Clip to rounded image boundary
    ctx.clip();

    // Draw image
    try {
      ctx.drawImage(
        imgElement,
        srcX,
        srcY,
        srcW,
        srcH,
        fitX,
        fitY,
        fitW,
        fitH
      );
    } catch (e) {
      console.error('Error drawing image:', e);
    }

    ctx.restore(); // Restore clip and shadow state

    // 5. Draw border around image box if borderWidth > 0
    if (borderWidthPx > 0) {
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(fitX, fitY, fitW, fitH, cornerRadiusPx);
      } else {
        drawRoundRectPath(ctx, fitX, fitY, fitW, fitH, cornerRadiusPx);
      }
      ctx.lineWidth = borderWidthPx;
      ctx.strokeStyle = settings.borderColor || '#000000';
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Renders high-res offscreen export and returns data URL or Blob
 */
export async function exportCollageImage(
  images: ImageItem[],
  cells: CellRect[],
  settings: CollageSettings,
  exportWidth: number,
  exportHeight: number,
  format: 'png' | 'jpeg' | 'webp',
  quality: number,
  loadedImages: Map<string, HTMLImageElement>
): Promise<{ blob: Blob; dataUrl: string }> {
  const offscreenCanvas = document.createElement('canvas');

  renderCollage({
    canvas: offscreenCanvas,
    images,
    cells,
    settings,
    targetWidth: exportWidth,
    targetHeight: exportHeight,
    loadedImages,
    isExport: true,
  });

  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

  return new Promise((resolve, reject) => {
    offscreenCanvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Failed to generate canvas blob'));
          return;
        }
        const dataUrl = URL.createObjectURL(blob);
        resolve({ blob, dataUrl });
      },
      mimeType,
      format === 'png' ? undefined : quality
    );
  });
}
