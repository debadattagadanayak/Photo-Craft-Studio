import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Eye, Sparkles, Upload, ChevronLeft, ChevronRight, Layers, X, GripVertical, Crop } from 'lucide-react';
import { CellRect, CollageSettings, ImageItem } from '../types';
import { renderCollage } from '../utils/canvasRenderer';

interface CollagePreviewProps {
  images: ImageItem[];
  cells: CellRect[];
  settings: CollageSettings;
  canvasAspectRatio: number;
  loadedImages: Map<string, HTMLImageElement>;
  onLoadSampleImages: () => void;
  onAddImagesClick: () => void;
  totalCollages?: number;
  activeBatchIndex?: number;
  onSelectBatchIndex?: (idx: number) => void;
  onRemoveImage?: (id: string) => void;
  onSwapImages?: (sourceBatchIdx: number, targetBatchIdx: number) => void;
  onOpenCropModal?: (image: ImageItem, cellRatio: number) => void;
}

export const CollagePreview: React.FC<CollagePreviewProps> = ({
  images,
  cells,
  settings,
  canvasAspectRatio,
  loadedImages,
  onLoadSampleImages,
  onAddImagesClick,
  totalCollages = 1,
  activeBatchIndex = 0,
  onSelectBatchIndex,
  onRemoveImage,
  onSwapImages,
  onOpenCropModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0 = fit to container
  const [containerDim, setContainerDim] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  // Interactive selection & drag-and-drop state
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [draggedCellIndex, setDraggedCellIndex] = useState<number | null>(null);
  const [dragOverCellIndex, setDragOverCellIndex] = useState<number | null>(null);

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerDim({
          w: containerRef.current.clientWidth || 800,
          h: containerRef.current.clientHeight || 600,
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Compute preview logical resolution (e.g. 1600px max preview buffer)
  const maxPreviewDimension = 1600;
  let targetWidth = maxPreviewDimension;
  let targetHeight = Math.round(maxPreviewDimension / canvasAspectRatio);

  if (canvasAspectRatio < 1) {
    targetHeight = maxPreviewDimension;
    targetWidth = Math.round(maxPreviewDimension * canvasAspectRatio);
  }

  // Render canvas whenever inputs change
  useEffect(() => {
    if (!canvasRef.current || images.length === 0) return;

    renderCollage({
      canvas: canvasRef.current,
      images,
      cells,
      settings,
      targetWidth,
      targetHeight,
      loadedImages,
      isExport: false,
    });
  }, [images, cells, settings, targetWidth, targetHeight, loadedImages, canvasAspectRatio]);

  // Handle Zoom buttons
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.4));
  const handleFitScreen = () => setZoomLevel(1.0);
  const handle100Percent = () => setZoomLevel(1.75);

  // Drag and drop photo swap handlers
  const handleDragStart = (e: React.DragEvent, cellImageIdx: number) => {
    setDraggedCellIndex(cellImageIdx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cellImageIdx.toString());
  };

  const handleDragOver = (e: React.DragEvent, cellImageIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCellIndex !== cellImageIdx) {
      setDragOverCellIndex(cellImageIdx);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetCellImageIdx: number) => {
    e.preventDefault();
    const sourceIdx = draggedCellIndex !== null ? draggedCellIndex : parseInt(e.dataTransfer.getData('text/plain'));
    if (!isNaN(sourceIdx) && sourceIdx !== targetCellImageIdx) {
      onSwapImages?.(sourceIdx, targetCellImageIdx);
    }
    setDraggedCellIndex(null);
    setDragOverCellIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedCellIndex(null);
    setDragOverCellIndex(null);
  };

  if (images.length === 0) {
    return (
      <div className="w-full h-full min-h-[450px] flex flex-col items-center justify-center p-8 text-center bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-200 mb-2">No Images Uploaded Yet</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Upload any number of landscape, portrait, or mixed images. No image will ever be cropped or distorted.
        </p>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={onAddImagesClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload Your Photos
          </button>
          <button
            onClick={onLoadSampleImages}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Try Sample Collage
          </button>
        </div>
      </div>
    );
  }

  // Calculate base display dimensions inside viewport
  const padding = 32;
  const availW = Math.max(200, containerDim.w - padding * 2);
  const availH = Math.max(200, containerDim.h - padding * 2);

  let displayW = availW;
  let displayH = availW / canvasAspectRatio;

  if (displayH > availH) {
    displayH = availH;
    displayW = availH * canvasAspectRatio;
  }

  const finalDisplayWidth = Math.round(displayW * zoomLevel);
  const finalDisplayHeight = Math.round(displayH * zoomLevel);

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Top Floating Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Aspect Ratio & Scale Badge */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg flex items-center gap-2 text-xs text-slate-200">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">{targetWidth} × {targetHeight} px</span>
            <span className="text-[10px] text-slate-400 font-mono">({canvasAspectRatio.toFixed(2)}:1)</span>
          </div>

          {/* Multi-Collage Batch Pagination (if imagesPerCollage > 0) */}
          {totalCollages > 1 && (
            <div className="pointer-events-auto bg-indigo-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-indigo-500/40 shadow-lg flex items-center gap-2 text-xs text-indigo-200">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <button
                onClick={() => onSelectBatchIndex?.(Math.max(0, activeBatchIndex - 1))}
                disabled={activeBatchIndex <= 0}
                className="p-1 rounded hover:bg-indigo-900/60 disabled:opacity-30 transition-colors"
                title="Previous Collage"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="font-bold text-amber-300 px-0.5">
                Collage {activeBatchIndex + 1} of {totalCollages}
              </span>

              <button
                onClick={() => onSelectBatchIndex?.(Math.min(totalCollages - 1, activeBatchIndex + 1))}
                disabled={activeBatchIndex >= totalCollages - 1}
                className="p-1 rounded hover:bg-indigo-900/60 disabled:opacity-30 transition-colors"
                title="Next Collage"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-slate-300 px-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5" />
          <button
            onClick={handleFitScreen}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handle100Percent}
            className="px-2 py-1 text-[10px] font-bold rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Actual Size"
          >
            100%
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        onClick={() => setSelectedImageId(null)}
        className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
      >
        <div
          className="relative transition-all duration-150 shadow-2xl rounded-lg border-2 border-indigo-500/40 ring-4 ring-black/40"
          style={{
            width: `${finalDisplayWidth}px`,
            height: `${finalDisplayHeight}px`,
            // Transparency checkerboard if canvas is set to transparent
            backgroundImage: settings.isCanvasTransparent
              ? 'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)'
              : undefined,
            backgroundSize: settings.isCanvasTransparent ? '20px 20px' : undefined,
            backgroundPosition: settings.isCanvasTransparent ? '0 0, 0 10px, 10px -10px, -10px 0px' : undefined,
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block object-contain pointer-events-none"
          />

          {/* Interactive Cell Overlay Layer */}
          {(() => {
            const scale = Math.min(targetWidth, targetHeight) / 1000;
            const paddingPx = settings.padding * scale;
            const gapPx = settings.gap * scale;

            const activeWidth = Math.max(0, targetWidth - paddingPx * 2);
            const activeHeight = Math.max(0, targetHeight - paddingPx * 2);

            return cells.map((cell, idx) => {
              const img = images[cell.imageIndex];
              if (!img) return null;

              // Calculate cell rect in canvas coordinate space
              const cellX = paddingPx + cell.x * activeWidth + gapPx / 2;
              const cellY = paddingPx + cell.y * activeHeight + gapPx / 2;
              const cellW = Math.max(0, cell.w * activeWidth - gapPx);
              const cellH = Math.max(0, cell.h * activeHeight - gapPx);

              // Scale to DOM screen display coordinates
              const cellLeft = (cellX / targetWidth) * finalDisplayWidth;
              const cellTop = (cellY / targetHeight) * finalDisplayHeight;
              const cellWidth = (cellW / targetWidth) * finalDisplayWidth;
              const cellHeight = (cellH / targetHeight) * finalDisplayHeight;

              const isSelected = selectedImageId === img.id;
              const isDraggingThis = draggedCellIndex === cell.imageIndex;
              const isDragTarget = dragOverCellIndex === cell.imageIndex && draggedCellIndex !== cell.imageIndex;

              return (
                <div
                  key={`${img.id}-${idx}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cell.imageIndex)}
                  onDragOver={(e) => handleDragOver(e, cell.imageIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cell.imageIndex)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageId(img.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onOpenCropModal?.(img, cellWidth / (cellHeight || 1));
                  }}
                  className={`absolute group cursor-grab active:cursor-grabbing transition-all rounded-sm select-none ${
                    isSelected
                      ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-950 z-20 shadow-2xl bg-indigo-500/10'
                      : 'hover:ring-2 hover:ring-indigo-400/80 hover:z-10 hover:bg-white/5'
                  } ${isDraggingThis ? 'opacity-30 scale-95' : ''} ${
                    isDragTarget ? 'bg-indigo-500/40 ring-2 ring-amber-400 ring-dashed z-30' : ''
                  }`}
                  style={{
                    left: `${cellLeft}px`,
                    top: `${cellTop}px`,
                    width: `${cellWidth}px`,
                    height: `${cellHeight}px`,
                  }}
                >
                  {/* Action Buttons strictly at Top-Right Corner of the image cell */}
                  <div className={`absolute top-1.5 right-1.5 z-30 flex items-center gap-1.5 transition-all transform ${
                    isSelected ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'
                  }`}>
                    {/* Crop Photo Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCropModal?.(img, cellWidth / (cellHeight || 1));
                      }}
                      className="p-1.5 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white shadow-xl border border-slate-700 hover:border-indigo-400 transition-all transform hover:scale-110 active:scale-95 backdrop-blur-md"
                      title="Crop & Focus Photo (Double-click)"
                    >
                      <Crop className="w-3.5 h-3.5 text-indigo-300" />
                    </button>

                    {/* Remove 'X' Icon Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage?.(img.id);
                        if (isSelected) setSelectedImageId(null);
                      }}
                      className="p-1.5 rounded-full bg-slate-900/90 hover:bg-red-600 text-white shadow-xl border border-slate-700 hover:border-red-400 transition-all transform hover:scale-110 active:scale-95 backdrop-blur-md"
                      title="Remove Photo"
                    >
                      <X className="w-3.5 h-3.5 text-red-400 hover:text-white" />
                    </button>
                  </div>

                  {/* Drag / Double click tooltip indicator */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20 px-2.5 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-[10px] text-slate-200 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-none shadow-lg whitespace-nowrap">
                    <Crop className="w-3 h-3 text-indigo-400" />
                    <span>Double-click to crop</span>
                    <span className="text-slate-500">•</span>
                    <GripVertical className="w-3 h-3 text-indigo-400" />
                    <span>Drag to swap</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};
