export type ImageOrientation = 'landscape' | 'portrait' | 'mixed';

export type OutputOrientation = 'landscape' | 'portrait' | 'square' | 'custom';

export type AspectRatioPreset = {
  id: string;
  name: string;
  ratio: number; // width / height
  wRatio: number;
  hRatio: number;
  category: OutputOrientation;
};

export type LayoutType =
  | 'auto'
  | 'uniform_grid'
  | 'masonry'
  | 'horizontal_strips'
  | 'vertical_strips'
  | 'featured_left'
  | 'featured_top'
  | 'custom_grid'
  | 'ai_smart_crop';

export type HorizontalAlignment = 'center' | 'left' | 'right';
export type VerticalAlignment = 'center' | 'top' | 'bottom';

export interface ImageCrop {
  panX: number; // 0 to 1 (0.5 = center)
  panY: number; // 0 to 1 (0.5 = center)
  zoom: number; // 1.0 to 3.0+
  sx: number;   // normalized 0 to 1 source x
  sy: number;   // normalized 0 to 1 source y
  sw: number;   // normalized 0 to 1 source width
  sh: number;   // normalized 0 to 1 source height
}

export type ActiveStudioTab = 'collage' | 'crop_resize' | 'badge_studio';

export type BadgeType = 'winner' | 'runner_up' | '3rd_place' | 'custom';

export interface BadgeSettings {
  badgeType: BadgeType;
  customFrameUrl?: string;
  zoom: number; // 1.0 to 3.0+
  panX: number; // 0 to 1 (0.5 = center)
  panY: number; // 0 to 1 (0.5 = center)
  rotation: number; // -180 to 180
  flipHorizontal: boolean;
  flipVertical: boolean;
  participantName: string;
  subTitle: string; // e.g. "1st Place", "2026 Champion"
  showTextOverlay: boolean;
  textColor: string;
  // Inner ring alignment tuning if needed
  innerRadiusPercent: number; // e.g. 32% of width
  innerOffsetYPercent: number; // e.g. 47% Y
  // Text Overlay Transform Position & Size
  textXPercent?: number; // 0 to 1 (default 0.5)
  textYPercent?: number; // 0 to 1 (default 0.89)
  textSizePx?: number; // default 48
  textRotation?: number; // -180 to 180 (default 0)
  outputFormat: 'png' | 'jpeg' | 'webp';
  exportDimension: number; // 1080 or 2048
}

export type CropShape = 
  | 'original'
  | 'circular' 
  | 'square' 
  | 'rectangle' 
  | 'oval' 
  | 'heart' 
  | 'star' 
  | 'hexagon' 
  | 'octagon' 
  | 'diamond' 
  | 'shield' 
  | 'capsule' 
  | 'custom';

export interface CropStudioSettings {
  shape: CropShape;
  aspectRatio: number; // width / height, e.g. 1 for square/circle, 1.333 for 4:3, 1.777 for 16:9
  zoom: number; // 1.0 to 3.0+
  panX: number; // 0 to 1 (0.5 = center)
  panY: number; // 0 to 1 (0.5 = center)
  borderWidth: number; // 0 to 40px
  borderColor: string;
  borderOpacity: number; // 0.0 to 1.0
  borderRadius: number; // 0 to 50 (% or px)
  bgColor: string;
  bgOpacity: number; // 0.0 to 1.0
  isBgTransparent: boolean;
  outputFormat: 'png' | 'jpeg' | 'webp';
  targetDimension: number; // e.g. 1080px
  // Smart Compression Settings
  enableCompression: boolean; // Smart lossy/lossless visual compression
  compressionQuality: number; // 0.1 to 1.0 (default 0.75)
  smartRescale: boolean; // Auto-rescale large images to optimal web dimensions
}

export interface ImageItem {
  id: string;
  file?: File;
  src: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'landscape' | 'portrait' | 'square';
  imgElement?: HTMLImageElement;
  crop?: ImageCrop;
  cropStudioSettings?: CropStudioSettings;
}

export interface CellRect {
  x: number; // 0 to 1 relative
  y: number; // 0 to 1 relative
  w: number; // 0 to 1 relative
  h: number; // 0 to 1 relative
  imageIndex: number;
  crop?: { sx: number; sy: number; sw: number; sh: number }; // 0 to 1 normalized source crop bounds
}

export interface CollageSettings {
  // Orientation & Ratio
  imageOrientation: ImageOrientation;
  outputOrientation: OutputOrientation;
  aspectRatioId: string;
  customWidthRatio: number;
  customHeightRatio: number;

  // Multi-Collage Batch
  imagesPerCollage: number; // 0 = all images in 1 collage, >0 = split into multiple collages

  // Layout
  layoutType: LayoutType;
  columns: number; // For grids / masonry / custom

  // Styling & Spacing
  gap: number; // pixels in preview canvas base coordinates
  padding: number; // pixels in preview canvas base coordinates
  cellBgColor: string; // empty space background color around contain image
  canvasBgColor: string; // canvas background color
  isCanvasTransparent: boolean;
  bgOpacity?: number; // 0 to 1
  cornerRadius: number; // image rounded corners
  borderWidth: number;
  borderColor: string;
  borderOpacity?: number; // 0 to 1

  // Shadow
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;

  // Alignment within cell
  alignHorizontal: HorizontalAlignment;
  alignVertical: VerticalAlignment;
}

export type ResolutionPresetId = 'hd' | 'fhd' | '2k' | '4k' | '8k' | 'custom';

export interface ExportConfig {
  presetId: ResolutionPresetId;
  targetWidth: number;
  targetHeight: number;
  lockAspectRatio: boolean;
  format: 'png' | 'jpeg' | 'webp';
  quality: number; // 0.1 to 1.0
}
