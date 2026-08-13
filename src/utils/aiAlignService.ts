import { ImageItem, CollageSettings, LayoutType, ImageOrientation, OutputOrientation, HorizontalAlignment, VerticalAlignment } from '../types';

export interface AIAlignResult {
  reorderedImageIds: string[];
  recommendedLayout: LayoutType;
  recommendedColumns: number;
  recommendedOrientation: ImageOrientation;
  recommendedOutputOrientation?: OutputOrientation;
  recommendedAspectRatioId?: string;
  recommendedGap?: number;
  recommendedPadding?: number;
  recommendedAlignHorizontal?: HorizontalAlignment;
  recommendedAlignVertical?: VerticalAlignment;
  reasoning: string;
}

/**
 * Creates low-res base64 thumbnail strings for AI visual analysis
 */
async function generateLowResThumbnails(images: ImageItem[]): Promise<Array<{ data: string; mimeType: string }>> {
  const maxImages = Math.min(images.length, 8);
  const thumbs: Array<{ data: string; mimeType: string }> = [];

  for (let i = 0; i < maxImages; i++) {
    const item = images[i];
    if (!item.src) continue;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = item.src;
      });

      const canvas = document.createElement('canvas');
      const maxDim = 128;
      const scale = Math.min(maxDim / img.width, maxDim / img.height);
      canvas.width = Math.max(16, Math.round(img.width * scale));
      canvas.height = Math.max(16, Math.round(img.height * scale));

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const base64Data = dataUrl.split(',')[1];
        if (base64Data) {
          thumbs.push({
            data: base64Data,
            mimeType: 'image/jpeg',
          });
        }
      }
    } catch {
      // Ignore thumbnail generation errors
    }
  }

  return thumbs;
}

export async function requestAIAutoAlign(
  images: ImageItem[],
  currentSettings: CollageSettings
): Promise<AIAlignResult> {
  if (images.length === 0) {
    throw new Error('Please upload at least one image before running AI Auto-Align.');
  }

  // Generate low-res thumbnails asynchronously
  let thumbnails: Array<{ data: string; mimeType: string }> = [];
  try {
    thumbnails = await generateLowResThumbnails(images);
  } catch (e) {
    console.warn('Thumbnail generation skipped:', e);
  }

  const payload = {
    images: images.map(img => ({
      id: img.id,
      name: img.name,
      width: img.width,
      height: img.height,
      aspectRatio: img.aspectRatio,
      orientation: img.orientation,
    })),
    currentSettings: {
      imageOrientation: currentSettings.imageOrientation,
      outputOrientation: currentSettings.outputOrientation,
      aspectRatioId: currentSettings.aspectRatioId,
      layoutType: currentSettings.layoutType,
      columns: currentSettings.columns,
      gap: currentSettings.gap,
      padding: currentSettings.padding,
    },
    thumbnails,
  };

  try {
    const response = await fetch('/api/ai-align', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const data: AIAlignResult = await response.json();
    return data;
  } catch (err: any) {
    console.warn('AI Align API fetch error, applying smart local alignment fallback:', err);
    return computeClientFallbackAlignment(images, currentSettings);
  }
}

function computeClientFallbackAlignment(images: ImageItem[], currentSettings: CollageSettings): AIAlignResult {
  const count = images.length;
  let landscapeCount = 0;
  let portraitCount = 0;
  let totalAR = 0;

  images.forEach(img => {
    const ar = img.aspectRatio || (img.width && img.height ? img.width / img.height : 1);
    totalAR += ar;
    if (ar > 1.1) landscapeCount++;
    else if (ar < 0.9) portraitCount++;
  });

  const avgAR = count > 0 ? totalAR / count : 1;
  let recOrientation: ImageOrientation = 'mixed';
  if (landscapeCount / count > 0.6) recOrientation = 'landscape';
  else if (portraitCount / count > 0.6) recOrientation = 'portrait';

  // Sort images: widest/most hero-like photo first
  const sortedImages = [...images].sort((a, b) => (b.aspectRatio || 1) - (a.aspectRatio || 1));

  let recLayout: LayoutType = 'auto';
  let recCols = Math.round(Math.sqrt(count));
  if (recOrientation === 'landscape') {
    recLayout = count <= 6 ? 'horizontal_strips' : 'masonry';
    recCols = Math.min(count, Math.ceil(Math.sqrt(count * 1.3)));
  } else if (recOrientation === 'portrait') {
    recLayout = 'masonry';
    recCols = Math.min(count, Math.ceil(Math.sqrt(count * 1.2)));
  } else if (count >= 3 && sortedImages[0].aspectRatio > 1.3) {
    recLayout = 'featured_left';
  }

  return {
    reorderedImageIds: sortedImages.map(img => img.id),
    recommendedLayout: recLayout,
    recommendedColumns: Math.max(1, recCols),
    recommendedOrientation: recOrientation,
    recommendedOutputOrientation: avgAR > 1.2 ? 'landscape' : avgAR < 0.8 ? 'portrait' : 'square',
    recommendedAspectRatioId: avgAR > 1.3 ? '16-9' : avgAR < 0.8 ? '9-16' : '1-1',
    recommendedGap: Math.min(24, Math.max(8, Math.round(16 - count * 0.5))),
    recommendedPadding: 8,
    recommendedAlignHorizontal: 'center',
    recommendedAlignVertical: 'center',
    reasoning: `Smart auto-alignment calculated for ${count} images (${landscapeCount} landscape, ${portraitCount} portrait). Optimized for zero-crop visualization.`,
  };
}
