import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Move, Check, Crop } from 'lucide-react';
import { ImageItem, ImageCrop } from '../types';

interface ImageCropModalProps {
  isOpen: boolean;
  image: ImageItem | null;
  cellRatio?: number; // Target cell aspect ratio (w / h)
  onClose: () => void;
  onSave: (imageId: string, crop: ImageCrop | undefined) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  image,
  cellRatio = 1,
  onClose,
  onSave,
}) => {
  const [panX, setPanX] = useState<number>(0.5);
  const [panY, setPanY] = useState<number>(0.5);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number }>({
    x: 0,
    y: 0,
    initialPanX: 0.5,
    initialPanY: 0.5,
  });

  // Initialize state when image changes
  useEffect(() => {
    if (image) {
      if (image.crop) {
        setPanX(image.crop.panX ?? 0.5);
        setPanY(image.crop.panY ?? 0.5);
        setZoom(image.crop.zoom ?? 1.0);
      } else {
        setPanX(0.5);
        setPanY(0.5);
        setZoom(1.0);
      }
    }
  }, [image]);

  // Compute normalized crop rect (sx, sy, sw, sh in [0, 1])
  const getCropBounds = (nw: number, nh: number, targetAR: number, currentZoom: number, px: number, py: number) => {
    const imgAR = nw / nh;
    let baseW = nw;
    let baseH = nh;

    if (imgAR > targetAR) {
      baseW = nh * targetAR;
      baseH = nh;
    } else {
      baseW = nw;
      baseH = nw / targetAR;
    }

    const sw = Math.min(nw, baseW / currentZoom);
    const sh = Math.min(nh, baseH / currentZoom);

    const maxSx = Math.max(0, nw - sw);
    const maxSy = Math.max(0, nh - sh);

    const sx = Math.max(0, Math.min(maxSx, px * maxSx));
    const sy = Math.max(0, Math.min(maxSy, py * maxSy));

    return {
      sx: sx / nw,
      sy: sy / nh,
      sw: sw / nw,
      sh: sh / nh,
      pixelSx: sx,
      pixelSy: sy,
      pixelSw: sw,
      pixelSh: sh,
    };
  };

  // Render preview canvas
  useEffect(() => {
    if (!isOpen || !image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const nw = img.naturalWidth || image.width || 800;
      const nh = img.naturalHeight || image.height || 600;

      // Container canvas dimensions
      const previewW = 400;
      const previewH = Math.round(Math.max(120, Math.min(320, previewW / (cellRatio || 1))));

      canvas.width = previewW;
      canvas.height = previewH;

      ctx.clearRect(0, 0, previewW, previewH);

      const bounds = getCropBounds(nw, nh, cellRatio, zoom, panX, panY);

      // Draw cropped portion
      ctx.drawImage(
        img,
        bounds.pixelSx,
        bounds.pixelSy,
        bounds.pixelSw,
        bounds.pixelSh,
        0,
        0,
        previewW,
        previewH
      );

      // Draw subtle Rule of Thirds grid overlay
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(previewW / 3, 0);
      ctx.lineTo(previewW / 3, previewH);
      ctx.moveTo((previewW * 2) / 3, 0);
      ctx.lineTo((previewW * 2) / 3, previewH);

      // Horizontal lines
      ctx.moveTo(0, previewH / 3);
      ctx.lineTo(previewW, previewH / 3);
      ctx.moveTo(0, (previewH * 2) / 3);
      ctx.lineTo(previewW, (previewH * 2) / 3);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    img.src = image.src;
  }, [isOpen, image, cellRatio, panX, panY, zoom]);

  if (!isOpen || !image) return null;

  // Drag interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panX,
      initialPanY: panY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Scale mouse movement to pan range
    const sensitivity = 0.003 / zoom;
    const newPanX = Math.max(0, Math.min(1, dragStartRef.current.initialPanX - dx * sensitivity));
    const newPanY = Math.max(0, Math.min(1, dragStartRef.current.initialPanY - dy * sensitivity));

    setPanX(newPanX);
    setPanY(newPanY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setPanX(0.5);
    setPanY(0.5);
    setZoom(1.0);
  };

  const handleSave = () => {
    const nw = image.width || 800;
    const nh = image.height || 600;
    const bounds = getCropBounds(nw, nh, cellRatio, zoom, panX, panY);

    const cropData: ImageCrop = {
      panX,
      panY,
      zoom,
      sx: bounds.sx,
      sy: bounds.sy,
      sw: bounds.sw,
      sh: bounds.sh,
    };

    onSave(image.id, cropData);
    onClose();
  };

  const handleRemoveCrop = () => {
    onSave(image.id, undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Adjust Photo Crop & Focus</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">{image.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Interactive Canvas Preview */}
          <div className="flex flex-col items-center">
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative rounded-xl overflow-hidden border-2 border-indigo-500/50 shadow-inner group select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <canvas ref={canvasRef} className="block bg-slate-950" />

              {/* Drag Hint Overlay */}
              <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300 font-medium flex items-center gap-1.5 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
                <Move className="w-3 h-3 text-indigo-400" />
                <span>Drag to reposition photo</span>
              </div>
            </div>
          </div>

          {/* Zoom Slider */}
          <div className="space-y-2 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                Zoom Level
              </span>
              <span className="font-bold text-indigo-400 font-mono">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(1.0, Math.round((prev - 0.1) * 10) / 10))}
                className="p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={1.0}
                max={3.0}
                step={0.05}
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(3.0, Math.round((prev + 0.1) * 10) / 10))}
                className="p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Focal Point Presets */}
          <div className="space-y-2 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-xs font-medium text-slate-300 block">Focus Alignment Presets</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Top-Left', px: 0, py: 0 },
                { label: 'Top-Center', px: 0.5, py: 0 },
                { label: 'Top-Right', px: 1, py: 0 },
                { label: 'Center-Left', px: 0, py: 0.5 },
                { label: 'Center', px: 0.5, py: 0.5 },
                { label: 'Center-Right', px: 1, py: 0.5 },
                { label: 'Bottom-Left', px: 0, py: 1 },
                { label: 'Bottom-Center', px: 0.5, py: 1 },
                { label: 'Bottom-Right', px: 1, py: 1 },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setPanX(preset.px);
                    setPanY(preset.py);
                  }}
                  className={`py-1.5 text-[10px] font-medium rounded-lg border transition-all ${
                    Math.abs(panX - preset.px) < 0.1 && Math.abs(panY - preset.py) < 0.1
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm font-semibold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            {image.crop && (
              <button
                type="button"
                onClick={handleRemoveCrop}
                className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-950/40 hover:bg-red-900/60 rounded-lg border border-red-800/50 transition-colors"
              >
                Clear Custom Crop
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
