import React, { useState, useEffect } from 'react';
import { Download, X, AlertTriangle, CheckCircle, Sparkles, Sliders } from 'lucide-react';
import { CellRect, CollageSettings, ExportConfig, ImageItem, ResolutionPresetId } from '../types';
import { exportCollageImage } from '../utils/canvasRenderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageItem[];
  cells: CellRect[];
  settings: CollageSettings;
  canvasAspectRatio: number;
  loadedImages: Map<string, HTMLImageElement>;
  totalCollages?: number;
  allCollageBatches?: { images: ImageItem[]; cells: CellRect[]; index: number }[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  images,
  cells,
  settings,
  canvasAspectRatio,
  loadedImages,
  totalCollages = 1,
  allCollageBatches = [],
}) => {
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    presetId: '4k',
    targetWidth: 3840,
    targetHeight: 2160,
    lockAspectRatio: true,
    format: 'png',
    quality: 0.92,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recalculate dimensions when preset or canvas aspect ratio changes
  useEffect(() => {
    updateDimensionsForPreset(exportConfig.presetId);
  }, [canvasAspectRatio, exportConfig.presetId]);

  const updateDimensionsForPreset = (presetId: ResolutionPresetId) => {
    let baseDim = 3840;
    if (presetId === 'hd') baseDim = 1280;
    else if (presetId === 'fhd') baseDim = 1920;
    else if (presetId === '2k') baseDim = 2560;
    else if (presetId === '4k') baseDim = 3840;
    else if (presetId === '8k') baseDim = 7680;

    let w = baseDim;
    let h = Math.round(baseDim / canvasAspectRatio);

    if (canvasAspectRatio < 1) {
      h = baseDim;
      w = Math.round(baseDim * canvasAspectRatio);
    }

    setExportConfig(prev => ({
      ...prev,
      presetId,
      targetWidth: w,
      targetHeight: h,
    }));
  };

  const handleWidthChange = (w: number) => {
    const val = Math.max(100, Math.min(16000, w));
    if (exportConfig.lockAspectRatio) {
      const h = Math.round(val / canvasAspectRatio);
      setExportConfig(prev => ({ ...prev, presetId: 'custom', targetWidth: val, targetHeight: h }));
    } else {
      setExportConfig(prev => ({ ...prev, presetId: 'custom', targetWidth: val }));
    }
  };

  const handleHeightChange = (h: number) => {
    const val = Math.max(100, Math.min(16000, h));
    if (exportConfig.lockAspectRatio) {
      const w = Math.round(val * canvasAspectRatio);
      setExportConfig(prev => ({ ...prev, presetId: 'custom', targetWidth: w, targetHeight: val }));
    } else {
      setExportConfig(prev => ({ ...prev, presetId: 'custom', targetHeight: val }));
    }
  };

  const megaPixels = ((exportConfig.targetWidth * exportConfig.targetHeight) / 1000000).toFixed(1);
  const isHighMemory = parseFloat(megaPixels) > 30;

  const handleDownload = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setProgressMsg('Initializing canvas buffer...');

    try {
      await new Promise(r => setTimeout(r, 100));

      if (exportScope === 'all' && allCollageBatches.length > 0) {
        // Export all batches sequentially
        for (let i = 0; i < allCollageBatches.length; i++) {
          const batch = allCollageBatches[i];
          setProgressMsg(`Rendering Collage ${i + 1} of ${allCollageBatches.length} (${exportConfig.targetWidth}×${exportConfig.targetHeight})...`);

          const { dataUrl } = await exportCollageImage(
            batch.images,
            batch.cells,
            settings,
            exportConfig.targetWidth,
            exportConfig.targetHeight,
            exportConfig.format,
            exportConfig.quality,
            loadedImages
          );

          const filename = `collage-${i + 1}-of-${allCollageBatches.length}-${exportConfig.targetWidth}x${exportConfig.targetHeight}.${exportConfig.format}`;
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          await new Promise(r => setTimeout(r, 300));
        }
      } else {
        // Single export
        setProgressMsg(`Rendering high-resolution ${exportConfig.targetWidth}×${exportConfig.targetHeight} collage...`);

        const { dataUrl } = await exportCollageImage(
          images,
          cells,
          settings,
          exportConfig.targetWidth,
          exportConfig.targetHeight,
          exportConfig.format,
          exportConfig.quality,
          loadedImages
        );

        const filename = `nocrop-collage-${exportConfig.targetWidth}x${exportConfig.targetHeight}.${exportConfig.format}`;
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setIsExporting(false);
      onClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      setIsExporting(false);
      setErrorMsg(
        err?.message ||
          'Failed to render high-resolution export. Your browser memory may be too low for this resolution. Try selecting a lower resolution preset.'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Export High-Resolution Collage</h2>
              <p className="text-xs text-slate-400">
                Render at full uncropped quality directly to your device.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Collage Batch Selector */}
        {totalCollages > 1 && (
          <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 space-y-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Multi-Collage Batch Detected ({totalCollages} Collages)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setExportScope('current')}
                className={`py-2 px-3 rounded-lg border font-semibold text-left transition-all ${
                  exportScope === 'current'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Export Active Collage Only
              </button>
              <button
                onClick={() => setExportScope('all')}
                className={`py-2 px-3 rounded-lg border font-semibold text-left transition-all ${
                  exportScope === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Batch Download All {totalCollages} Collages
              </button>
            </div>
          </div>
        )}

        {/* Resolution Presets */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Select Resolution Preset
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'hd', label: 'HD', desc: '1280 max px' },
              { id: 'fhd', label: 'Full HD', desc: '1920 max px' },
              { id: '2k', label: '2K', desc: '2560 max px' },
              { id: '4k', label: '4K Ultra HD', desc: '3840 max px', badge: 'RECOMMENDED' },
              { id: '8k', label: '8K Ultra HD', desc: '7680 max px' },
              { id: 'custom', label: 'Custom', desc: 'Specify pixels' },
            ].map(item => {
              const isSelected = exportConfig.presetId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => updateDimensionsForPreset(item.id as ResolutionPresetId)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {item.badge && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-amber-400 bg-amber-500/20 px-1 rounded">
                      {item.badge}
                    </span>
                  )}
                  <div className="text-xs font-bold text-slate-200">{item.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Pixel Input */}
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Export Dimensions</span>
            <span className="font-mono text-indigo-400 font-bold">
              {exportConfig.targetWidth} × {exportConfig.targetHeight} px ({megaPixels} MP)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Width (px)</label>
              <input
                type="number"
                min="100"
                max="16000"
                value={exportConfig.targetWidth}
                onChange={e => handleWidthChange(parseInt(e.target.value) || 100)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Height (px)</label>
              <input
                type="number"
                min="100"
                max="16000"
                value={exportConfig.targetHeight}
                onChange={e => handleHeightChange(parseInt(e.target.value) || 100)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={exportConfig.lockAspectRatio}
              onChange={e => setExportConfig(prev => ({ ...prev, lockAspectRatio: e.target.checked }))}
              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            Lock aspect ratio ({canvasAspectRatio.toFixed(2)}:1)
          </label>
        </div>

        {/* High Memory Warning */}
        {isHighMemory && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/50 border border-amber-800/60 text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Large Image Resolution ({megaPixels} Megapixels)</span>
              Rendering 8K+ images requires significant browser memory. If export fails, choose 4K.
            </div>
          </div>
        )}

        {/* Format & Quality */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">File Format</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
              {(['png', 'jpeg', 'webp'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setExportConfig(prev => ({ ...prev, format: fmt }))}
                  className={`py-1.5 font-bold uppercase rounded-lg transition-colors ${
                    exportConfig.format === fmt
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {exportConfig.format !== 'png' ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Quality</span>
                <span className="text-indigo-400 font-mono font-bold">
                  {Math.round(exportConfig.quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.0}
                step={0.05}
                value={exportConfig.quality}
                onChange={e => setExportConfig(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
              />
            </div>
          ) : (
            <div className="flex items-center text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-xl">
              <CheckCircle className="w-4 h-4 shrink-0 mr-2" />
              <span>Lossless PNG format supports transparent background</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Action Buttons / Progress */}
        <div className="pt-2">
          {isExporting ? (
            <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-800/60 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-xs font-medium text-indigo-200">{progressMsg}</span>
            </div>
          ) : (
            <button
              onClick={handleDownload}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-400 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download {exportConfig.targetWidth}×{exportConfig.targetHeight} {exportConfig.format.toUpperCase()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
