import { CellRect, ImageItem, LayoutType, CollageSettings } from '../types';

/**
 * Calculates normalized bounding boxes [0,1] x [0,1] for each image in the layout
 */
export function calculateLayout(
  images: ImageItem[],
  settings: CollageSettings,
  canvasAspectRatio: number // width / height
): CellRect[] {
  const count = images.length;
  if (count === 0) return [];

  const layoutType = settings.layoutType;

  switch (layoutType) {
    case 'auto':
      return calculateAutoLayout(images, canvasAspectRatio, settings);

    case 'uniform_grid':
      return calculateUniformGrid(count, settings.columns);

    case 'masonry':
      return calculateMasonryLayout(images, settings.columns);

    case 'horizontal_strips':
      return calculateHorizontalStrips(images, settings.columns);

    case 'vertical_strips':
      return calculateVerticalStrips(images, settings.columns);

    case 'featured_left':
      return calculateFeaturedLeft(count);

    case 'featured_top':
      return calculateFeaturedTop(count);

    case 'custom_grid':
      return calculateUniformGrid(count, Math.max(1, settings.columns));

    case 'ai_smart_crop':
      return calculateAISmartCropLayout(images, canvasAspectRatio, settings);

    default:
      return calculateAutoLayout(images, canvasAspectRatio, settings);
  }
}

/**
 * Automatic balanced layout based on image count, image aspect ratios, and canvas ratio
 */
function calculateAutoLayout(
  images: ImageItem[],
  canvasAspectRatio: number,
  settings: CollageSettings
): CellRect[] {
  const count = images.length;
  if (count === 1) {
    return [{ x: 0, y: 0, w: 1, h: 1, imageIndex: 0 }];
  }

  // Determine columns & rows (use user specified columns if set)
  let cols = settings.columns;
  if (!cols || cols < 1) {
    if (settings.imageOrientation === 'portrait') {
      cols = Math.ceil(Math.sqrt(count * 1.2));
    } else if (settings.imageOrientation === 'landscape') {
      if (canvasAspectRatio >= 1) {
        cols = Math.ceil(Math.sqrt(count * 1.3));
      } else {
        cols = Math.ceil(Math.sqrt(count * 0.8));
      }
    } else {
      cols = Math.round(Math.sqrt(count * (canvasAspectRatio > 1 ? 1.2 : 0.9)));
    }
  }

  cols = Math.max(1, Math.min(count, cols));
  const rows = Math.ceil(count / cols);

  return calculateGridWithCenteredLastRow(count, cols, rows);
}

/**
 * Uniform Grid with smart centering for partial last row
 */
function calculateUniformGrid(count: number, columns: number): CellRect[] {
  const cols = Math.max(1, Math.min(count, columns));
  const rows = Math.ceil(count / cols);
  return calculateGridWithCenteredLastRow(count, cols, rows);
}

function calculateGridWithCenteredLastRow(count: number, cols: number, rows: number): CellRect[] {
  const rects: CellRect[] = [];
  const cellHeight = 1 / rows;

  for (let r = 0; r < rows; r++) {
    const isLastRow = r === rows - 1;
    const itemsInRow = isLastRow ? count - r * cols : cols;
    const cellWidth = 1 / itemsInRow;
    const rowY = r * cellHeight;

    for (let c = 0; c < itemsInRow; c++) {
      const idx = r * cols + c;
      if (idx >= count) break;

      rects.push({
        x: c * cellWidth,
        y: rowY,
        w: cellWidth,
        h: cellHeight,
        imageIndex: idx,
      });
    }
  }

  return rects;
}

/**
 * Masonry layout - divides into C columns and stacks images based on aspect ratio
 */
function calculateMasonryLayout(images: ImageItem[], numCols: number): CellRect[] {
  const count = images.length;
  const cols = Math.max(1, Math.min(count, numCols));
  const colWidth = 1 / cols;

  // Track height accumulator for each column
  const colHeights = new Array(cols).fill(0);
  const colItems: { idx: number; relativeHeight: number }[][] = Array.from({ length: cols }, () => []);

  for (let i = 0; i < count; i++) {
    // Find column with smallest current height
    let minCol = 0;
    for (let c = 1; c < cols; c++) {
      if (colHeights[c] < colHeights[minCol]) {
        minCol = c;
      }
    }

    const img = images[i];
    // Height relative to cell width = (1 / aspectRatio)
    const relH = img ? 1 / Math.max(0.2, img.aspectRatio) : 1;
    colItems[minCol].push({ idx: i, relativeHeight: relH });
    colHeights[minCol] += relH;
  }

  // Find max column height to normalize
  const maxColH = Math.max(...colHeights, 1);

  const rects: CellRect[] = new Array(count);

  for (let c = 0; c < cols; c++) {
    const items = colItems[c];
    let currentY = 0;
    const colTotalH = colHeights[c];

    // Scale each item so column spans full height [0, 1] evenly
    for (const item of items) {
      const normalizedH = colTotalH > 0 ? item.relativeHeight / maxColH : 1 / items.length;
      rects[item.idx] = {
        x: c * colWidth,
        y: currentY,
        w: colWidth,
        h: normalizedH,
        imageIndex: item.idx,
      };
      currentY += normalizedH;
    }
  }

  return rects;
}

/**
 * Horizontal Strips - arranges images into horizontal rows where all images in a row share same height
 */
function calculateHorizontalStrips(images: ImageItem[], numCols?: number): CellRect[] {
  const count = images.length;
  const itemsPerRow = (numCols && numCols > 0) ? numCols : 3;
  if (count <= itemsPerRow) {
    // Single row with proportional widths
    const totalAR = images.reduce((acc, img) => acc + (img.aspectRatio || 1), 0);
    let currentX = 0;
    return images.map((img, idx) => {
      const w = (img.aspectRatio || 1) / totalAR;
      const rect = { x: currentX, y: 0, w, h: 1, imageIndex: idx };
      currentX += w;
      return rect;
    });
  }

  // Split into rows based on itemsPerRow
  const numRows = Math.ceil(count / itemsPerRow);

  const rows: { idx: number; ar: number }[][] = Array.from({ length: numRows }, () => []);

  for (let i = 0; i < count; i++) {
    const rowIndex = Math.floor(i / itemsPerRow);
    const targetRow = Math.min(rowIndex, numRows - 1);
    rows[targetRow].push({ idx: i, ar: images[i]?.aspectRatio || 1 });
  }

  // Compute row heights based on 1 / sum(AR)
  const rowInvAR = rows.map(r => 1 / r.reduce((sum, item) => sum + item.ar, 0));
  const totalInvAR = rowInvAR.reduce((a, b) => a + b, 0);

  const rects: CellRect[] = new Array(count);
  let currentY = 0;

  for (let r = 0; r < numRows; r++) {
    const rowHeight = rowInvAR[r] / totalInvAR;
    const rowItems = rows[r];
    const rowTotalAR = rowItems.reduce((sum, item) => sum + item.ar, 0);

    let currentX = 0;
    for (const item of rowItems) {
      const itemWidth = item.ar / rowTotalAR;
      rects[item.idx] = {
        x: currentX,
        y: currentY,
        w: itemWidth,
        h: rowHeight,
        imageIndex: item.idx,
      };
      currentX += itemWidth;
    }
    currentY += rowHeight;
  }

  return rects;
}

/**
 * Vertical Strips - arranges images into vertical columns where all images in a column share same width
 */
function calculateVerticalStrips(images: ImageItem[], numCols?: number): CellRect[] {
  const count = images.length;
  const numColsTarget = (numCols && numCols > 0) ? numCols : (count <= 6 ? 2 : Math.ceil(count / 3));

  const itemsPerCol = Math.ceil(count / numColsTarget);

  const cols: { idx: number; invAr: number }[][] = Array.from({ length: numColsTarget }, () => []);

  for (let i = 0; i < count; i++) {
    const colIndex = Math.floor(i / itemsPerCol);
    const targetCol = Math.min(colIndex, numColsTarget - 1);
    cols[targetCol].push({ idx: i, invAr: 1 / (images[i]?.aspectRatio || 1) });
  }

  // Compute column widths based on AR sum
  const colAR = cols.map(c => 1 / c.reduce((sum, item) => sum + item.invAr, 0));
  const totalAR = colAR.reduce((a, b) => a + b, 0);

  const rects: CellRect[] = new Array(count);
  let currentX = 0;

  for (let c = 0; c < numColsTarget; c++) {
    const colWidth = colAR[c] / totalAR;
    const colItems = cols[c];
    const colTotalInvAR = colItems.reduce((sum, item) => sum + item.invAr, 0);

    let currentY = 0;
    for (const item of colItems) {
      const itemHeight = item.invAr / colTotalInvAR;
      rects[item.idx] = {
        x: currentX,
        y: currentY,
        w: colWidth,
        h: itemHeight,
        imageIndex: item.idx,
      };
      currentY += itemHeight;
    }
    currentX += colWidth;
  }

  return rects;
}

/**
 * Featured Left: First image takes 60% left width, remaining take right 40%
 */
function calculateFeaturedLeft(count: number): CellRect[] {
  if (count === 1) return [{ x: 0, y: 0, w: 1, h: 1, imageIndex: 0 }];

  const rects: CellRect[] = [];
  const featuredW = count === 2 ? 0.5 : 0.6;
  const remainingW = 1 - featuredW;

  // Main featured image
  rects.push({ x: 0, y: 0, w: featuredW, h: 1, imageIndex: 0 });

  // Remaining images
  const remCount = count - 1;
  const remCols = remCount > 4 ? 2 : 1;
  const remRows = Math.ceil(remCount / remCols);
  const cellH = 1 / remRows;

  for (let i = 0; i < remCount; i++) {
    const r = Math.floor(i / remCols);
    const c = i % remCols;
    const isLastRow = r === remRows - 1;
    const itemsInRow = isLastRow ? remCount - r * remCols : remCols;
    const cellW = remainingW / itemsInRow;

    rects.push({
      x: featuredW + c * cellW,
      y: r * cellH,
      w: cellW,
      h: cellH,
      imageIndex: i + 1,
    });
  }

  return rects;
}

/**
 * Featured Top: First image takes 60% top height, remaining take bottom 40%
 */
function calculateFeaturedTop(count: number): CellRect[] {
  if (count === 1) return [{ x: 0, y: 0, w: 1, h: 1, imageIndex: 0 }];

  const rects: CellRect[] = [];
  const featuredH = count === 2 ? 0.5 : 0.6;
  const remainingH = 1 - featuredH;

  // Main featured top
  rects.push({ x: 0, y: 0, w: 1, h: featuredH, imageIndex: 0 });

  // Remaining images
  const remCount = count - 1;
  const remCols = Math.min(remCount, remCount > 3 ? 3 : remCount);
  const remRows = Math.ceil(remCount / remCols);
  const cellH = remainingH / remRows;

  for (let i = 0; i < remCount; i++) {
    const r = Math.floor(i / remCols);
    const c = i % remCols;
    const isLastRow = r === remRows - 1;
    const itemsInRow = isLastRow ? remCount - r * remCols : remCols;
    const cellW = 1 / itemsInRow;

    rects.push({
      x: c * cellW,
      y: featuredH + r * cellH,
      w: cellW,
      h: cellH,
      imageIndex: i + 1,
    });
  }

  return rects;
}

/**
 * AI Smart Crop Layout: Asymmetric mosaic grid with smart cover-crop metadata
 */
function calculateAISmartCropLayout(
  images: ImageItem[],
  canvasAspectRatio: number,
  settings: CollageSettings
): CellRect[] {
  const count = images.length;
  if (count === 0) return [];

  let rawRects: { x: number; y: number; w: number; h: number; imageIndex: number }[] = [];

  if (count === 1) {
    rawRects = [{ x: 0, y: 0, w: 1, h: 1, imageIndex: 0 }];
  } else if (count === 2) {
    if (canvasAspectRatio >= 1) {
      rawRects = [
        { x: 0, y: 0, w: 0.5, h: 1, imageIndex: 0 },
        { x: 0.5, y: 0, w: 0.5, h: 1, imageIndex: 1 },
      ];
    } else {
      rawRects = [
        { x: 0, y: 0, w: 1, h: 0.5, imageIndex: 0 },
        { x: 0, y: 0.5, w: 1, h: 0.5, imageIndex: 1 },
      ];
    }
  } else if (count === 3) {
    if (canvasAspectRatio >= 1) {
      rawRects = [
        { x: 0, y: 0, w: 0.6, h: 1, imageIndex: 0 },
        { x: 0.6, y: 0, w: 0.4, h: 0.5, imageIndex: 1 },
        { x: 0.6, y: 0.5, w: 0.4, h: 0.5, imageIndex: 2 },
      ];
    } else {
      rawRects = [
        { x: 0, y: 0, w: 1, h: 0.6, imageIndex: 0 },
        { x: 0, y: 0.6, w: 0.5, h: 0.4, imageIndex: 1 },
        { x: 0.5, y: 0.6, w: 0.5, h: 0.4, imageIndex: 2 },
      ];
    }
  } else if (count === 4) {
    rawRects = [
      { x: 0, y: 0, w: 0.6, h: 0.6, imageIndex: 0 },
      { x: 0.6, y: 0, w: 0.4, h: 0.6, imageIndex: 1 },
      { x: 0, y: 0.6, w: 0.4, h: 0.4, imageIndex: 2 },
      { x: 0.4, y: 0.6, w: 0.6, h: 0.4, imageIndex: 3 },
    ];
  } else if (count === 5) {
    rawRects = [
      { x: 0, y: 0, w: 0.5, h: 0.6, imageIndex: 0 },
      { x: 0.5, y: 0, w: 0.5, h: 0.3, imageIndex: 1 },
      { x: 0.5, y: 0.3, w: 0.5, h: 0.3, imageIndex: 2 },
      { x: 0, y: 0.6, w: 0.5, h: 0.4, imageIndex: 3 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.4, imageIndex: 4 },
    ];
  } else {
    const cols = Math.max(1, settings.columns || Math.ceil(Math.sqrt(count)));
    const rows = Math.ceil(count / cols);
    rawRects = calculateGridWithCenteredLastRow(count, cols, rows);
  }

  // Calculate cover crop coordinates for flawless filling
  return rawRects.map(cell => {
    const img = images[cell.imageIndex];
    const imgAR = img?.aspectRatio || (img?.width && img?.height ? img.width / img.height : 1);
    const cellPixelWidth = cell.w * canvasAspectRatio;
    const cellPixelHeight = cell.h * 1;
    const cellAR = cellPixelWidth / Math.max(0.001, cellPixelHeight);

    let sx = 0;
    let sy = 0;
    let sw = 1;
    let sh = 1;

    if (imgAR > cellAR) {
      sw = cellAR / imgAR;
      sh = 1;
      sx = (1 - sw) / 2;
      sy = 0;
    } else if (imgAR < cellAR) {
      sw = 1;
      sh = imgAR / cellAR;
      sx = 0;
      // Face-aware top-weighted cropping:
      // Human heads and faces in portrait and group photos are located in the upper 10% - 60% of the image.
      // Bias sy towards the top so that human heads and faces stay completely in frame.
      sy = Math.max(0, (1 - sh) * 0.12);
    }

    return {
      ...cell,
      crop: { sx, sy, sw, sh },
    };
  });
}
