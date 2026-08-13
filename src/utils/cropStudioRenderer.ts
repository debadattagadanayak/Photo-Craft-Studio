import { ImageItem, CropStudioSettings, CropShape } from '../types';

export const DEFAULT_CROP_STUDIO_SETTINGS: CropStudioSettings = {
  shape: 'original',
  aspectRatio: 1, // 1:1 for square & circular
  zoom: 1.0,
  panX: 0.5,
  panY: 0.5,
  borderWidth: 0,
  borderColor: '#ffffff',
  borderOpacity: 1.0,
  borderRadius: 16,
  bgColor: '#0f172a',
  bgOpacity: 0.0, // Default transparent background
  isBgTransparent: true,
  outputFormat: 'png',
  targetDimension: 1080,
  enableCompression: false,
  compressionQuality: 0.75,
  smartRescale: false,
};

export function getEffectiveCropSettings(image: ImageItem): CropStudioSettings {
  return image.cropStudioSettings || { ...DEFAULT_CROP_STUDIO_SETTINGS };
}

export interface CropMetadata {
  originalW: number;
  originalH: number;
  cropW: number;
  cropH: number;
  percentageKept: number;
  estimatedSizeKB?: number;
}

/**
 * Helper function to draw universal paths for all supported shapes
 */
export function drawShapePath(
  ctx: CanvasRenderingContext2D,
  shape: CropShape,
  x: number,
  y: number,
  w: number,
  h: number,
  borderRadius: number = 0
) {
  ctx.beginPath();
  const cx = x + w / 2;
  const cy = y + h / 2;

  switch (shape) {
    case 'circular': {
      const radius = Math.min(w, h) / 2;
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      break;
    }
    case 'oval': {
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    }
    case 'heart': {
      ctx.moveTo(cx, y + h * 0.85);
      ctx.bezierCurveTo(x - w * 0.1, y + h * 0.45, x + w * 0.1, y, cx, y + h * 0.28);
      ctx.bezierCurveTo(x + w * 0.9, y, x + w * 1.1, y + h * 0.45, cx, y + h * 0.85);
      ctx.closePath();
      break;
    }
    case 'star': {
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.42;
      const points = 5;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'hexagon': {
      const rx = w / 2;
      const ry = h / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const px = cx + rx * Math.cos(angle);
        const py = cy + ry * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'octagon': {
      const rx = w / 2;
      const ry = h / 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 - Math.PI / 8;
        const px = cx + rx * Math.cos(angle);
        const py = cy + ry * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'diamond': {
      ctx.moveTo(cx, y);
      ctx.lineTo(x + w, cy);
      ctx.lineTo(cx, y + h);
      ctx.lineTo(x, cy);
      ctx.closePath();
      break;
    }
    case 'shield': {
      ctx.moveTo(cx, y);
      ctx.lineTo(x + w, y + h * 0.25);
      ctx.quadraticCurveTo(x + w, y + h * 0.7, cx, y + h);
      ctx.quadraticCurveTo(x, y + h * 0.7, x, y + h * 0.25);
      ctx.closePath();
      break;
    }
    case 'capsule': {
      const r = Math.min(w, h) / 2;
      if (w >= h) {
        ctx.arc(x + r, cy, r, Math.PI / 2, (3 * Math.PI) / 2);
        ctx.arc(x + w - r, cy, r, (3 * Math.PI) / 2, Math.PI / 2);
      } else {
        ctx.arc(cx, y + r, r, Math.PI, 0);
        ctx.arc(cx, y + h - r, r, 0, Math.PI);
      }
      ctx.closePath();
      break;
    }
    case 'square':
    case 'rectangle':
    default: {
      const maxRadius = Math.min(w, h) / 2;
      const r = Math.min(maxRadius, (borderRadius / 100) * maxRadius);
      ctx.roundRect(x, y, w, h, r);
      break;
    }
  }
}

/**
 * Calculates crop coordinates (sx, sy, sw, sh) on the original image
 */
export function calculateCropSourceBounds(
  nw: number,
  nh: number,
  settings: CropStudioSettings
) {
  let ar = settings.aspectRatio || 1;
  if (settings.shape === 'original') {
    ar = nw / nh;
  } else {
    // Shapes that default to 1:1 square aspect ratio unless customized
    const symmetricalShapes: CropShape[] = ['circular', 'square', 'star', 'hexagon', 'octagon', 'diamond', 'heart', 'shield'];
    if (symmetricalShapes.includes(settings.shape)) {
      ar = 1;
    }
  }

  const imgAR = nw / nh;
  const targetAR = ar;

  let baseW = nw;
  let baseH = nh;

  if (imgAR > targetAR) {
    baseW = nh * targetAR;
    baseH = nh;
  } else {
    baseW = nw;
    baseH = nw / targetAR;
  }

  const zoom = Math.max(1.0, settings.zoom || 1.0);
  const sw = Math.min(nw, baseW / zoom);
  const sh = Math.min(nh, baseH / zoom);

  const maxSx = Math.max(0, nw - sw);
  const maxSy = Math.max(0, nh - sh);

  const px = settings.panX ?? 0.5;
  const py = settings.panY ?? 0.5;

  const sx = Math.max(0, Math.min(maxSx, px * maxSx));
  const sy = Math.max(0, Math.min(maxSy, py * maxSy));

  return { sx, sy, sw, sh, targetAR };
}

/**
 * Renders the final cropped result on a canvas
 */
export function renderCroppedImageToCanvas(
  canvas: HTMLCanvasElement,
  imgItem: ImageItem,
  settings: CropStudioSettings,
  overrideDimension?: number,
  loadedImgElement?: HTMLImageElement
): CropMetadata | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgElement = loadedImgElement || imgItem.imgElement;
  if (!imgElement || !imgElement.complete || imgElement.naturalWidth === 0) {
    return null;
  }

  const nw = imgElement.naturalWidth || imgItem.width || 800;
  const nh = imgElement.naturalHeight || imgItem.height || 600;

  const { sx, sy, sw, sh, targetAR } = calculateCropSourceBounds(nw, nh, settings);

  let targetDim = overrideDimension;
  if (!targetDim) {
    targetDim = settings.shape === 'original' ? nw : (settings.targetDimension || 1080);
  }
  
  // Smart Rescale option
  if (settings.enableCompression && settings.smartRescale) {
    targetDim = Math.min(targetDim, 1200);
  }

  const width = targetDim;
  const height = Math.round(targetDim / targetAR);

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  // 1. Background
  if (!settings.isBgTransparent && settings.bgOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = settings.bgOpacity;
    ctx.fillStyle = settings.bgColor || '#0f172a';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Border & Content bounds
  const borderWidth = settings.borderWidth || 0;
  const halfBorder = borderWidth / 2;
  const contentX = borderWidth;
  const contentY = borderWidth;
  const contentW = Math.max(1, width - borderWidth * 2);
  const contentH = Math.max(1, height - borderWidth * 2);

  // 2. Path Clipping according to Shape
  ctx.save();
  drawShapePath(ctx, settings.shape, contentX, contentY, contentW, contentH, settings.borderRadius);
  ctx.clip();

  // Draw Image
  ctx.drawImage(imgElement, sx, sy, sw, sh, contentX, contentY, contentW, contentH);
  ctx.restore();

  // 3. Draw Border
  if (borderWidth > 0 && settings.borderOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = settings.borderOpacity;
    ctx.strokeStyle = settings.borderColor || '#ffffff';
    ctx.lineWidth = borderWidth;

    drawShapePath(ctx, settings.shape, halfBorder, halfBorder, width - borderWidth, height - borderWidth, settings.borderRadius);
    ctx.stroke();
    ctx.restore();
  }

  const percentageKept = Math.round(((sw * sh) / (nw * nh)) * 100);

  return {
    originalW: nw,
    originalH: nh,
    cropW: Math.round(sw),
    cropH: Math.round(sh),
    percentageKept,
  };
}

/**
 * Renders the Original Photo with a Visual Crop Overlay Box / Shape to show EXACTLY what is cropped out
 */
export function renderCropGuideToCanvas(
  canvas: HTMLCanvasElement,
  imgItem: ImageItem,
  settings: CropStudioSettings,
  loadedImgElement?: HTMLImageElement
): CropMetadata | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgElement = loadedImgElement || imgItem.imgElement;
  if (!imgElement || !imgElement.complete || imgElement.naturalWidth === 0) {
    return null;
  }

  const nw = imgElement.naturalWidth || imgItem.width || 800;
  const nh = imgElement.naturalHeight || imgItem.height || 600;

  const cw = canvas.width || 500;
  const ch = canvas.height || 500;

  ctx.clearRect(0, 0, cw, ch);

  // Fit image into canvas display box
  const scale = Math.min(cw / nw, ch / nh);
  const drawW = nw * scale;
  const drawH = nh * scale;
  const offsetX = (cw - drawW) / 2;
  const offsetY = (ch - drawH) / 2;

  // 1. Draw Full Original Image
  ctx.drawImage(imgElement, offsetX, offsetY, drawW, drawH);

  // 2. Dark Overlay over non-cropped areas
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'; // Dark Slate Overlay
  ctx.fillRect(0, 0, cw, ch);

  // Calculate Crop Box in original coordinates
  const { sx, sy, sw, sh } = calculateCropSourceBounds(nw, nh, settings);

  // Map to canvas display coordinates
  const cropX = offsetX + sx * scale;
  const cropY = offsetY + sy * scale;
  const cropW = sw * scale;
  const cropH = sh * scale;

  // Punch out hole for Crop Window using destination-out
  ctx.globalCompositeOperation = 'destination-out';
  drawShapePath(ctx, settings.shape, cropX, cropY, cropW, cropH, settings.borderRadius);
  ctx.fill();

  // Restore Composite & re-draw original image in cropped hole
  ctx.globalCompositeOperation = 'source-over';
  ctx.save();
  drawShapePath(ctx, settings.shape, cropX, cropY, cropW, cropH, settings.borderRadius);
  ctx.clip();
  ctx.drawImage(imgElement, offsetX, offsetY, drawW, drawH);
  ctx.restore();

  // 3. Draw Bright Crop Guideline Frame & Grid Lines
  ctx.save();
  ctx.strokeStyle = '#6366f1'; // Indigo-500
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  drawShapePath(ctx, settings.shape, cropX, cropY, cropW, cropH, settings.borderRadius);
  ctx.stroke();

  // Rule of Thirds subtle lines inside crop (for rectangular / square shapes)
  if (['square', 'rectangle', 'capsule'].includes(settings.shape)) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    // Vertical third lines
    ctx.moveTo(cropX + cropW / 3, cropY);
    ctx.lineTo(cropX + cropW / 3, cropY + cropH);
    ctx.moveTo(cropX + (2 * cropW) / 3, cropY);
    ctx.lineTo(cropX + (2 * cropW) / 3, cropY + cropH);
    // Horizontal third lines
    ctx.moveTo(cropX, cropY + cropH / 3);
    ctx.lineTo(cropX + cropW, cropY + cropH / 3);
    ctx.moveTo(cropX, cropY + (2 * cropH) / 3);
    ctx.lineTo(cropX + cropW, cropY + (2 * cropH) / 3);
    ctx.stroke();
  }

  ctx.restore();

  const percentageKept = Math.round(((sw * sh) / (nw * nh)) * 100);

  return {
    originalW: nw,
    originalH: nh,
    cropW: Math.round(sw),
    cropH: Math.round(sh),
    percentageKept,
  };
}
