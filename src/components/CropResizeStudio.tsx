import React, { useState, useEffect, useRef } from 'react';
import {
  ImageItem,
  CropStudioSettings,
  CropShape,
} from '../types';
import {
  DEFAULT_CROP_STUDIO_SETTINGS,
  getEffectiveCropSettings,
  renderCroppedImageToCanvas,
  renderCropGuideToCanvas,
  CropMetadata,
} from '../utils/cropStudioRenderer';
import { ImageUploader } from './ImageUploader';
import JSZip from 'jszip';
import {
  Crop,
  Circle,
  Square,
  RectangleHorizontal,
  Sliders,
  CheckSquare,
  SquareDashed,
  Download,
  Palette,
  ZoomIn,
  Layers,
  Image as ImageIcon,
  Check,
  Loader2,
  Eye,
  Upload,
  Sparkles,
  Scissors,
  Trash2,
  Maximize2,
  Info,
  Heart,
  Star,
  Hexagon,
  Shield,
  Zap,
  FolderDown,
  FileArchive,
} from 'lucide-react';

interface CropResizeStudioProps {
  images: ImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  onAddImages: (newImages: ImageItem[]) => void;
  onLoadSampleImages: () => void;
  onClearAll: () => void;
}

export const CropResizeStudio: React.FC<CropResizeStudioProps> = ({
  images,
  setImages,
  onAddImages,
  onLoadSampleImages,
  onClearAll, }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeImageForModal, setActiveImageForModal] = useState<ImageItem | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [globalPreviewMode, setGlobalPreviewMode] = useState<'guide' | 'result'>('result');

  // Global / Bulk Master Settings
  const [bulkSettings, setBulkSettings] = useState<CropStudioSettings>({
    ...DEFAULT_CROP_STUDIO_SETTINGS,
  });

  // Toggle selection
  const toggleSelectImage = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === images.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(images.map(img => img.id));
    }
  };

  // Apply settings to target images (selected or all)
  const applyBulkSettings = (updates: Partial<CropStudioSettings>) => {
    setBulkSettings(prev => ({ ...prev, ...updates }));

    const targets = selectedIds.length > 0 ? selectedIds : images.map(i => i.id);

    setImages(prev =>
      prev.map(img => {
        if (targets.includes(img.id)) {
          const current = getEffectiveCropSettings(img);
          return {
            ...img,
            cropStudioSettings: {
              ...current,
              ...updates,
            },
          };
        }
        return img;
      })
    );
  };

  // Apply preset shapes
  const handleApplyShape = (shape: CropShape, ar: number = 1) => {
    applyBulkSettings({ shape, aspectRatio: ar });
  };

  // Download single image from canvas
  const handleDownloadSingle = (img: ImageItem) => {
    const settings = getEffectiveCropSettings(img);
    const canvas = document.createElement('canvas');
    
    // Ensure image element loaded
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      const dim = settings.shape === 'original' ? undefined : settings.targetDimension;
      renderCroppedImageToCanvas(canvas, img, settings, dim, tempImg);
      const link = document.createElement('a');
      link.download = `${img.name.replace(/\.[^/.]+$/, '')}-${settings.shape === 'original' ? 'compressed' : 'cropped'}.${settings.outputFormat}`;
      const quality = settings.enableCompression ? (settings.compressionQuality || 0.75) : 0.95;
      link.href = canvas.toDataURL(`image/${settings.outputFormat}`, quality);
      link.click();
    };
    tempImg.src = img.src;
  };

  // Sequential Batch Download
  const handleBatchDownload = async () => {
    if (images.length === 0) return;
    setIsBatchDownloading(true);

    const targets = selectedIds.length > 0
      ? images.filter(img => selectedIds.includes(img.id))
      : images;

    for (let i = 0; i < targets.length; i++) {
      handleDownloadSingle(targets[i]);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsBatchDownloading(false);
  };

  // Bulk Export All or Selected as ZIP
  const handleExportZip = async () => {
    if (images.length === 0) return;
    setIsExportingZip(true);

    try {
      const zip = new JSZip();
      const targets = selectedIds.length > 0
        ? images.filter(img => selectedIds.includes(img.id))
        : images;

      for (let i = 0; i < targets.length; i++) {
        const img = targets[i];
        const settings = getEffectiveCropSettings(img);
        
        await new Promise<void>((resolve) => {
          const tempImg = new Image();
          tempImg.crossOrigin = 'anonymous';
          tempImg.onload = () => {
            const canvas = document.createElement('canvas');
            const dim = settings.shape === 'original' ? undefined : settings.targetDimension;
            renderCroppedImageToCanvas(canvas, img, settings, dim, tempImg);
            const quality = settings.enableCompression ? (settings.compressionQuality || 0.75) : 0.95;
            const dataUrl = canvas.toDataURL(`image/${settings.outputFormat}`, quality);
            const base64Data = dataUrl.split(',')[1];
            const filename = `${i + 1}_${img.name.replace(/\.[^/.]+$/, '')}_${settings.shape}.${settings.outputFormat}`;
            zip.file(filename, base64Data, { base64: true });
            resolve();
          };
          tempImg.onerror = () => resolve();
          tempImg.src = img.src;
        });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cropped-photos-batch-${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export ZIP:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Available Shape Definitions
  const shapeOptions: { id: CropShape; label: string; icon: string; defaultAr: number }[] = [
    { id: 'original', label: 'Free / Original', icon: '🖼️', defaultAr: 1 },
    { id: 'circular', label: 'Circular', icon: '⭕', defaultAr: 1 },
    { id: 'square', label: 'Square (1:1)', icon: '🟦', defaultAr: 1 },
    { id: 'rectangle', label: 'Rectangle', icon: '📷', defaultAr: 1.333 },
    { id: 'oval', label: 'Oval', icon: '🥚', defaultAr: 1.333 },
    { id: 'heart', label: 'Heart', icon: '❤️', defaultAr: 1 },
    { id: 'star', label: 'Star', icon: '⭐', defaultAr: 1 },
    { id: 'hexagon', label: 'Hexagon', icon: '⬡', defaultAr: 1 },
    { id: 'octagon', label: 'Octagon', icon: '🛑', defaultAr: 1 },
    { id: 'diamond', label: 'Diamond', icon: '💎', defaultAr: 1 },
    { id: 'shield', label: 'Shield', icon: '🛡️', defaultAr: 1 },
    { id: 'capsule', label: 'Capsule', icon: '💊', defaultAr: 1.6 },
  ];

  const [isUploadExpanded, setIsUploadExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Dedicated Upload Zone (Compact when images uploaded, hover/click expandable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-slate-100 overflow-hidden transition-all duration-300">
        {images.length === 0 ? (
          /* Empty state upload zone */
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Crop & Resize Direct Upload
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold px-2.5 py-0.5 rounded-full">
                      Dedicated Input
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Upload photos directly here for custom shapes, compression, and transparent border editing.
                  </p>
                </div>
              </div>
            </div>

            <ImageUploader onAddImages={onAddImages} />
          </div>
        ) : (
          /* Compact Upload Bar when photos exist */
          <div className="p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {images.length} Photo{images.length === 1 ? '' : 's'} Loaded
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold px-2 py-0.2 rounded-full">
                      Ready for Crop & Compress
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Need more photos? Hover or expand below to drop more files.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadExpanded(!isUploadExpanded)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadExpanded ? 'Collapse Upload' : '+ Add More Photos'}
                </button>

                <button
                  type="button"
                  onClick={onClearAll}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All ({images.length})
                </button>
              </div>
            </div>

            {/* Expandable Drop Area */}
            {isUploadExpanded && (
              <div className="pt-2 border-t border-slate-800/80 animate-fadeIn">
                <ImageUploader onAddImages={onAddImages} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Two-Column Theme Layout: Left Options Sidebar + Right Results Preview */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT COLUMN: Controls & Settings Sidebar (Independent Desktop Scroll) */}
        <div className="w-full lg:w-[320px] xl:w-[350px] flex-shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pr-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Crop & Edit Options</h3>
              <p className="text-[11px] text-slate-400">Applies live to selected or all photos</p>
            </div>
          </div>

          {/* 1. Shape Selection with Dropdown & Grid */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5 text-indigo-400" />
                1. Crop Shape
              </label>
              <span className="text-[10px] text-indigo-300 font-medium">Select Shape</span>
            </div>

            {/* Dropdown for shape selection */}
            <select
              value={bulkSettings.shape}
              onChange={(e) => {
                const shape = e.target.value as CropShape;
                const opt = shapeOptions.find(s => s.id === shape);
                handleApplyShape(shape, opt?.defaultAr || 1);
              }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {shapeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>

            {/* Quick-Access Shape Buttons */}
            <div className="grid grid-cols-4 gap-1 mt-1">
              {shapeOptions.slice(0, 8).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleApplyShape(s.id, s.defaultAr)}
                  className={`p-1.5 rounded-lg border text-[10px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                    bulkSettings.shape === s.id
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md font-bold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  title={s.label}
                >
                  <span className="text-xs">{s.icon}</span>
                  <span className="truncate max-w-[50px]">{s.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Sub-Ratios for Rectangle */}
            {bulkSettings.shape === 'rectangle' && (
              <div className="flex items-center gap-1 mt-1 overflow-x-auto pb-1">
                {[
                  { name: '4:3', ar: 1.333 },
                  { name: '16:9', ar: 1.777 },
                  { name: '3:2', ar: 1.5 },
                  { name: '9:16', ar: 0.5625 },
                ].map(r => (
                  <button
                    key={r.name}
                    onClick={() => handleApplyShape('rectangle', r.ar)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all ${
                      Math.abs(bulkSettings.aspectRatio - r.ar) < 0.05
                        ? 'bg-indigo-500/30 text-indigo-200 border-indigo-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Focus & Zoom */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-purple-400" />
              2. Focus & Zoom
            </span>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Zoom Level</span>
                <span className="font-mono text-indigo-300 font-semibold">{bulkSettings.zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={bulkSettings.zoom}
                onChange={e => applyBulkSettings({ zoom: parseFloat(e.target.value) })}
                className="accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
              />

              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-400">Focus Position</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: 'Top Face', px: 0.5, py: 0.2 },
                  { label: 'Center', px: 0.5, py: 0.5 },
                  { label: 'Bottom', px: 0.5, py: 0.8 },
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyBulkSettings({ panX: p.px, panY: p.py })}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-medium text-slate-300 text-center"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. High-Tech Image Compression */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              3. Smart Compression
            </span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                High-Tech Compress
              </span>
              <input
                type="checkbox"
                checked={bulkSettings.enableCompression}
                onChange={e => applyBulkSettings({ enableCompression: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {bulkSettings.enableCompression ? (
              <div className="flex flex-col gap-2 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">Target Quality</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {Math.round((bulkSettings.compressionQuality || 0.75) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.95"
                    step="0.05"
                    value={bulkSettings.compressionQuality || 0.75}
                    onChange={e => applyBulkSettings({ compressionQuality: parseFloat(e.target.value) })}
                    className="accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Auto Rescale 4K Images</span>
                  <input
                    type="checkbox"
                    checked={bulkSettings.smartRescale}
                    onChange={e => applyBulkSettings({ smartRescale: e.target.checked })}
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] p-1.5 rounded-lg">
                  ⚡ Reduces file size ~50-80% with zero visual quality loss.
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                Enable smart quantization to drastically reduce file sizes without quality loss.
              </p>
            )}
          </div>

          {/* 4. Border & Radius */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-pink-400" />
              4. Border & Radius
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bulkSettings.borderColor}
                    onChange={e => applyBulkSettings({ borderColor: e.target.value })}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-slate-300">{bulkSettings.borderColor}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Width ({bulkSettings.borderWidth}px)</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={bulkSettings.borderWidth}
                  onChange={e => applyBulkSettings({ borderWidth: parseInt(e.target.value, 10) })}
                  className="accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Radius ({bulkSettings.shape === 'circular' ? '100%' : `${bulkSettings.borderRadius}%`})
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  disabled={bulkSettings.shape === 'circular'}
                  value={bulkSettings.borderRadius}
                  onChange={e => applyBulkSettings({ borderRadius: parseInt(e.target.value, 10) })}
                  className="accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full disabled:opacity-40"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Opacity ({Math.round(bulkSettings.borderOpacity * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bulkSettings.borderOpacity}
                  onChange={e => applyBulkSettings({ borderOpacity: parseFloat(e.target.value) })}
                  className="accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
                />
              </div>
            </div>
          </div>

          {/* 5. Format & Canvas */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              5. Format & Dimension
            </span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Transparent Canvas</span>
              <input
                type="checkbox"
                checked={bulkSettings.isBgTransparent}
                onChange={e => applyBulkSettings({ isBgTransparent: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Output Format</span>
              <select
                value={bulkSettings.outputFormat}
                onChange={e => applyBulkSettings({ outputFormat: e.target.value as any })}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-mono"
              >
                <option value="png">PNG (Transparent)</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Target Size</span>
              <select
                value={bulkSettings.targetDimension}
                onChange={e => applyBulkSettings({ targetDimension: parseInt(e.target.value, 10) })}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-mono"
              >
                <option value="1080">1080px (FHD Square)</option>
                <option value="2048">2048px (High Res)</option>
                <option value="800">800px (Web standard)</option>
                <option value="500">500px (Thumbnail)</option>
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results Preview Grid & Header Bar */}
        <div className="flex-1 w-full flex flex-col gap-4">
          {/* Header Bar - Sticky on scroll */}
          <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Results Preview
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold px-2 py-0.5 rounded-full">
                  {images.length} Photos
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Live output view. Click any photo to fine-tune crop or drag canvas.
              </p>
            </div>

            {/* Controls & Mode Toggles */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
              {/* View Mode Toggle: Guide vs Result */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setGlobalPreviewMode('guide')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    globalPreviewMode === 'guide'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Shows full photo with visual crop overlay box"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Crop Box</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGlobalPreviewMode('result')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    globalPreviewMode === 'result'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Shows rendered cut image output"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Result</span>
                </button>
              </div>

              <button
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                {selectedIds.length === images.length && images.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                    Deselect
                  </>
                ) : (
                  <>
                    <SquareDashed className="w-3.5 h-3.5 text-slate-400" />
                    Select ({images.length})
                  </>
                )}
              </button>

              {/* Export Options */}
              <button
                onClick={handleBatchDownload}
                disabled={images.length === 0 || isBatchDownloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
                title="Download files individually"
              >
                {isBatchDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  <FolderDown className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>Batch</span>
              </button>

              <button
                onClick={handleExportZip}
                disabled={images.length === 0 || isExportingZip}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                title="Download all selected cropped photos bundled in a ZIP archive"
              >
                {isExportingZip ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Zipping...</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="w-3.5 h-3.5 text-white" />
                    <span>
                      ZIP ({selectedIds.length > 0 ? `${selectedIds.length}` : 'All'})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Grid View */}
          {images.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">No Photos for Crop & Resize</h3>
                <p className="text-xs text-slate-400 max-w-md mt-1">
                  Upload your photos above or click sample photos to crop them into Free, Circular, Square, Heart, Star, or Custom shapes.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((img) => {
                const isSelected = selectedIds.includes(img.id);
                const settings = getEffectiveCropSettings(img);

                return (
                  <CropCardItem
                    key={img.id}
                    image={img}
                    settings={settings}
                    previewMode={globalPreviewMode}
                    isSelected={isSelected}
                    onToggleSelect={() => toggleSelectImage(img.id)}
                    onEdit={() => setActiveImageForModal(img)}
                    onDownload={() => handleDownloadSingle(img)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Single Photo Fine-Tune Modal */}
      {activeImageForModal && (
        <CropFineTuneModal
          image={activeImageForModal}
          onClose={() => setActiveImageForModal(null)}
          onSave={(updatedSettings) => {
            setImages(prev =>
              prev.map(img =>
                img.id === activeImageForModal.id
                  ? { ...img, cropStudioSettings: updatedSettings }
                  : img
              )
            );
            setActiveImageForModal(null);
          }}
        />
      )}
    </div>
  );
};

// Sub-Component: Individual Card Preview with Image Preloading & Crop Overlay Support
interface CropCardItemProps {
  image: ImageItem;
  settings: CropStudioSettings;
  previewMode: 'guide' | 'result';
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDownload: () => void;
}

const CropCardItem: React.FC<CropCardItemProps> = ({
  image,
  settings,
  previewMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDownload,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(image.imgElement || null);
  const [cropStats, setCropStats] = useState<CropMetadata | null>(null);

  // Dynamic Image Loader to guarantee rendering
  useEffect(() => {
    if (image.imgElement && image.imgElement.complete && image.imgElement.naturalWidth > 0) {
      setLoadedImg(image.imgElement);
      return;
    }
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isMounted) setLoadedImg(img);
    };
    img.src = image.src;
    return () => {
      isMounted = false;
    };
  }, [image]);

  // Render canvas whenever loaded image, settings, or previewMode changes
  useEffect(() => {
    if (!canvasRef.current || !loadedImg) return;

    if (previewMode === 'guide') {
      const stats = renderCropGuideToCanvas(canvasRef.current, image, settings, loadedImg);
      setCropStats(stats);
    } else {
      const stats = renderCroppedImageToCanvas(canvasRef.current, image, settings, 400, loadedImg);
      setCropStats(stats);
    }
  }, [image, settings, previewMode, loadedImg]);

  return (
    <div
      onClick={onToggleSelect}
      className={`group relative bg-slate-900 border rounded-2xl p-3 flex flex-col gap-3 transition-all cursor-pointer ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-950/20 shadow-xl'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      {/* Top Bar Checkbox & Badge */}
      <div className="flex items-center justify-between z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-indigo-600 text-white'
              : 'border border-slate-700 bg-slate-950/80 text-transparent hover:border-slate-500'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        <div className="flex items-center gap-1">
          {settings.enableCompression && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ⚡ Compressed
            </span>
          )}
          <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-md bg-slate-950/80 text-slate-300 border border-slate-800">
            {settings.shape}
          </span>
        </div>
      </div>

      {/* Canvas Preview Container */}
      <div className="relative aspect-square w-full rounded-xl bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 border border-slate-850 flex items-center justify-center overflow-hidden p-1.5">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="max-w-full max-h-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Footer Info & Quick Actions */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex flex-col min-w-0">
          <span className="truncate max-w-[100px] text-slate-200 font-semibold" title={image.name}>
            {image.name}
          </span>
          {cropStats && (
            <span className="text-[10px] text-slate-500 font-mono">
              {cropStats.cropW}×{cropStats.cropH}px
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700 transition-colors"
            title="Fine-tune photo crop & drag canvas"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700 transition-colors"
            title="Download cropped image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-Component: Fine-Tune Modal with Dual Split View Mode + Drag Canvas Support
interface CropFineTuneModalProps {
  image: ImageItem;
  onClose: () => void;
  onSave: (settings: CropStudioSettings) => void;
}

const CropFineTuneModal: React.FC<CropFineTuneModalProps> = ({
  image,
  onClose,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<CropStudioSettings>(
    getEffectiveCropSettings(image)
  );

  const [modalTab, setModalTab] = useState<'guide' | 'result'>('guide');
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(image.imgElement || null);
  const [cropMetadata, setCropMetadata] = useState<CropMetadata | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number } | null>(null);

  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pointer Drag handling to move crop window on canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: localSettings.panX ?? 0.5,
      initialPanY: localSettings.panY ?? 0.5,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const deltaX = dx / (rect.width || 300);
    const deltaY = dy / (rect.height || 300);

    const newPanX = Math.max(0, Math.min(1, dragStartRef.current.initialPanX + deltaX));
    const newPanY = Math.max(0, Math.min(1, dragStartRef.current.initialPanY + deltaY));

    setLocalSettings(prev => ({
      ...prev,
      panX: newPanX,
      panY: newPanY,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Dynamic image loader for modal
  useEffect(() => {
    if (image.imgElement && image.imgElement.complete && image.imgElement.naturalWidth > 0) {
      setLoadedImg(image.imgElement);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedImg(img);
    };
    img.src = image.src;
  }, [image]);

  // Render guide canvas
  useEffect(() => {
    if (guideCanvasRef.current && loadedImg) {
      const stats = renderCropGuideToCanvas(guideCanvasRef.current, image, localSettings, loadedImg);
      setCropMetadata(stats);
    }
  }, [image, localSettings, loadedImg, modalTab]);

  // Render result canvas
  useEffect(() => {
    if (resultCanvasRef.current && loadedImg) {
      const stats = renderCroppedImageToCanvas(resultCanvasRef.current, image, localSettings, 600, loadedImg);
      setCropMetadata(stats);
    }
  }, [image, localSettings, loadedImg, modalTab]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col gap-5 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Fine-tune Photo Crop: {image.name}
              </h3>
              <p className="text-xs text-slate-400">
                Drag canvas directly to position crop, adjust zoom, and toggle shape formats.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 rounded-lg bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setModalTab('guide')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modalTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>1. Interactive Drag Box</span>
            </button>
            <button
              onClick={() => setModalTab('result')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modalTab === 'result'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>2. Final Cropped Result</span>
            </button>
          </div>

          {cropMetadata && (
            <div className="hidden md:flex items-center gap-3 text-xs text-slate-300 font-mono px-3">
              <span>Kept: <strong className="text-emerald-400">{cropMetadata.percentageKept}%</strong></span>
              <span>Cropped Out: <strong className="text-rose-400">{100 - cropMetadata.percentageKept}%</strong></span>
            </div>
          )}
        </div>

        {/* Interactive Canvas Stage with Pointer Drag */}
        <div className="relative aspect-square max-h-[320px] w-full rounded-2xl bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950 border border-slate-800 flex items-center justify-center p-3 overflow-hidden select-none">
          {modalTab === 'guide' ? (
            <canvas
              ref={guideCanvasRef}
              width={500}
              height={500}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`max-w-full max-h-full object-contain drop-shadow-xl touch-none transition-cursor ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            />
          ) : (
            <canvas
              ref={resultCanvasRef}
              width={500}
              height={500}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`max-w-full max-h-full object-contain drop-shadow-xl touch-none transition-cursor ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            />
          )}

          {/* Floating Drag Instruction Hint */}
          <div className="absolute top-3 left-3 bg-indigo-600/90 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-pulse">
            <Maximize2 className="w-3 h-3" />
            <span>Click & Drag Canvas to Pan Crop</span>
          </div>

          {/* Floating HUD Badge */}
          {cropMetadata && (
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-200 shadow-xl flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                Original: {cropMetadata.originalW}×{cropMetadata.originalH}px
              </span>
              <span className="border-l border-slate-700 pl-3">
                Crop Window: {cropMetadata.cropW}×{cropMetadata.cropH}px
              </span>
            </div>
          )}
        </div>

        {/* Real-time Fine-Tune Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          {/* Focus presets */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Crop Focus Position (or Drag Canvas above)</span>
              </label>
              <span className="font-mono text-indigo-400 text-[11px]">
                X: {Math.round((localSettings.panX ?? 0.5) * 100)}% | Y: {Math.round((localSettings.panY ?? 0.5) * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: 'Top-Left', px: 0.1, py: 0.1 },
                { label: 'Top Face', px: 0.5, py: 0.15 },
                { label: 'Center', px: 0.5, py: 0.5 },
                { label: 'Bottom Face', px: 0.5, py: 0.85 },
                { label: 'Bottom-Right', px: 0.9, py: 0.9 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setLocalSettings(prev => ({ ...prev, panX: p.px, panY: p.py }))}
                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                    Math.abs((localSettings.panX ?? 0.5) - p.px) < 0.15 && Math.abs((localSettings.panY ?? 0.5) - p.py) < 0.15
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium">Zoom Level</label>
              <span className="font-mono text-indigo-400">{localSettings.zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={localSettings.zoom}
              onChange={e => setLocalSettings(p => ({ ...p, zoom: parseFloat(e.target.value) }))}
              className="accent-indigo-500 w-full cursor-pointer h-1.5 bg-slate-800 rounded"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium">Border Width</label>
              <span className="font-mono text-indigo-400">{localSettings.borderWidth}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={localSettings.borderWidth}
              onChange={e => setLocalSettings(p => ({ ...p, borderWidth: parseInt(e.target.value, 10) }))}
              className="accent-indigo-500 w-full cursor-pointer h-1.5 bg-slate-800 rounded"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(localSettings)}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
