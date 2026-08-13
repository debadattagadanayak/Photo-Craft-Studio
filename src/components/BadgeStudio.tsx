import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Medal,
  Upload,
  Sparkles,
  Download,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Move,
  Type,
  Sliders,
  FileArchive,
  Loader2,
  Trash2,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Maximize2,
  RefreshCw,
  Layers,
  CornerUpRight
} from 'lucide-react';
import JSZip from 'jszip';
import { ImageItem, BadgeSettings, BadgeType } from '../types';
import {
  DEFAULT_BADGE_SETTINGS,
  createBadgeFrameImage,
  renderBadgeToCanvas
} from '../utils/badgeRenderer';
import { ImageUploader } from './ImageUploader';

interface BadgeStudioProps {
  images: ImageItem[];
  onAddImages: (files: File[]) => void;
  onLoadSampleImages: () => void;
  onClearAll: () => void;
}

export const BadgeStudio: React.FC<BadgeStudioProps> = ({
  images,
  onAddImages,
  onLoadSampleImages,
  onClearAll,
}) => {
  // Selected photo ID
  const [selectedImageId, setSelectedImageId] = useState<string>('');
  const [settings, setSettings] = useState<BadgeSettings>(DEFAULT_BADGE_SETTINGS);

  // Canvas & UI Refs/State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [showAdvancedRingTune, setShowAdvancedRingTune] = useState(false);
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);

  // Loaded Frame Images Cache
  const [winnerFrameImg, setWinnerFrameImg] = useState<HTMLImageElement | null>(null);
  const [runnerUpFrameImg, setRunnerUpFrameImg] = useState<HTMLImageElement | null>(null);
  const [thirdPlaceFrameImg, setThirdPlaceFrameImg] = useState<HTMLImageElement | null>(null);
  const [customFrameImg, setCustomFrameImg] = useState<HTMLImageElement | null>(null);
  const [userLoadedImgMap, setUserLoadedImgMap] = useState<Map<string, HTMLImageElement>>(new Map());

  // Custom Frame File Ref
  const customFrameInputRef = useRef<HTMLInputElement>(null);

  // Photoshop Transform Tool State
  const [activeTransformLayer, setActiveTransformLayer] = useState<'photo' | 'text'>('photo');
  const [showTransformHandles, setShowTransformHandles] = useState<boolean>(true);
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<number>(400);

  // Measure display size on resize
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setCanvasDisplaySize(rect.width);
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Pointer state for Photoshop Transform handle dragging
  const pointerStateRef = useRef<{
    isInteracting: boolean;
    layer: 'photo' | 'text';
    mode: 'move' | 'scale' | 'rotate';
    startX: number;
    startY: number;
    centerX: number;
    centerY: number;
    initialSettings: BadgeSettings;
  }>({
    isInteracting: false,
    layer: 'photo',
    mode: 'move',
    startX: 0,
    startY: 0,
    centerX: 0,
    centerY: 0,
    initialSettings: DEFAULT_BADGE_SETTINGS,
  });

  // Start Photoshop Transform Interaction
  const startTransformInteraction = (
    e: React.PointerEvent,
    layer: 'photo' | 'text',
    mode: 'move' | 'scale' | 'rotate'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const size = rect.width;

    let cx = rect.left + size * 0.5;
    let cy = rect.top + size * (settings.innerOffsetYPercent || 0.472);

    if (layer === 'photo') {
      const radius = size * (settings.innerRadiusPercent || 0.315);
      let rW = radius * 2;
      let rH = radius * 2;
      if (currentHTMLImage) {
        const ar = currentHTMLImage.width / currentHTMLImage.height;
        if (ar > 1) {
          rW = radius * 2 * ar;
        } else {
          rH = (radius * 2) / ar;
        }
      }
      rW *= settings.zoom;
      rH *= settings.zoom;

      const offX = (settings.panX - 0.5) * rW;
      const offY = (settings.panY - 0.5) * rH;

      cx = cx + offX;
      cy = cy + offY;
    } else {
      cx = rect.left + size * (settings.textXPercent ?? 0.5);
      cy = rect.top + size * (settings.textYPercent ?? 0.88);
    }

    pointerStateRef.current = {
      isInteracting: true,
      layer,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      centerX: cx,
      centerY: cy,
      initialSettings: { ...settings },
    };

    setActiveTransformLayer(layer);

    const onPointerMove = (ev: PointerEvent) => {
      const state = pointerStateRef.current;
      if (!state.isInteracting || !canvasRef.current) return;

      const cRect = canvasRef.current.getBoundingClientRect();
      const cSize = cRect.width;

      const dx = ev.clientX - state.startX;
      const dy = ev.clientY - state.startY;

      if (state.mode === 'move') {
        if (state.layer === 'photo') {
          const radius = cSize * (state.initialSettings.innerRadiusPercent || 0.315);
          let rW = radius * 2;
          let rH = radius * 2;
          if (currentHTMLImage) {
            const ar = currentHTMLImage.width / currentHTMLImage.height;
            if (ar > 1) {
              rW = radius * 2 * ar;
            } else {
              rH = (radius * 2) / ar;
            }
          }
          rW *= state.initialSettings.zoom;
          rH *= state.initialSettings.zoom;

          const deltaPanX = dx / Math.max(rW, 1);
          const deltaPanY = dy / Math.max(rH, 1);

          setSettings(prev => ({
            ...prev,
            panX: Math.max(0, Math.min(1, state.initialSettings.panX + deltaPanX)),
            panY: Math.max(0, Math.min(1, state.initialSettings.panY + deltaPanY)),
          }));
        } else {
          const deltaX = dx / Math.max(cSize, 1);
          const deltaY = dy / Math.max(cSize, 1);
          setSettings(prev => ({
            ...prev,
            textXPercent: Math.max(0.05, Math.min(0.95, (state.initialSettings.textXPercent ?? 0.5) + deltaX)),
            textYPercent: Math.max(0.05, Math.min(0.95, (state.initialSettings.textYPercent ?? 0.88) + deltaY)),
          }));
        }
      } else if (state.mode === 'scale') {
        const distStart = Math.hypot(state.startX - state.centerX, state.startY - state.centerY);
        const distCurrent = Math.hypot(ev.clientX - state.centerX, ev.clientY - state.centerY);
        const ratio = distCurrent / Math.max(distStart, 1);

        if (state.layer === 'photo') {
          const newZoom = Math.max(0.2, Math.min(5.0, state.initialSettings.zoom * ratio));
          setSettings(prev => ({ ...prev, zoom: newZoom }));
        } else {
          const newSize = Math.max(16, Math.min(120, Math.round((state.initialSettings.textSizePx ?? 48) * ratio)));
          setSettings(prev => ({ ...prev, textSizePx: newSize }));
        }
      } else if (state.mode === 'rotate') {
        const startAngle = Math.atan2(state.startY - state.centerY, state.startX - state.centerX) * (180 / Math.PI);
        const currentAngle = Math.atan2(ev.clientY - state.centerY, ev.clientX - state.centerX) * (180 / Math.PI);
        const deltaAngle = currentAngle - startAngle;

        if (state.layer === 'photo') {
          let newRot = Math.round(state.initialSettings.rotation + deltaAngle);
          while (newRot > 180) newRot -= 360;
          while (newRot < -180) newRot += 360;
          setSettings(prev => ({ ...prev, rotation: newRot }));
        } else {
          let newRot = Math.round((state.initialSettings.textRotation ?? 0) + deltaAngle);
          while (newRot > 180) newRot -= 360;
          while (newRot < -180) newRot += 360;
          setSettings(prev => ({ ...prev, textRotation: newRot }));
        }
      }
    };

    const onPointerUp = () => {
      pointerStateRef.current.isInteracting = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Mouse Drag state for canvas panning
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0.5,
    panY: 0.5,
  });

  // Select first image when images change if none selected
  useEffect(() => {
    if (images.length > 0 && (!selectedImageId || !images.some(i => i.id === selectedImageId))) {
      setSelectedImageId(images[0].id);
    }
  }, [images, selectedImageId]);

  // Preload Badge Frames (Gold Winner, Silver Runner Up & Bronze 3rd Place)
  useEffect(() => {
    let isMounted = true;
    createBadgeFrameImage('winner')
      .then(img => { if (isMounted) setWinnerFrameImg(img); })
      .catch(err => console.error('Winner frame load error:', err));

    createBadgeFrameImage('runner_up')
      .then(img => { if (isMounted) setRunnerUpFrameImg(img); })
      .catch(err => console.error('Runner Up frame load error:', err));

    createBadgeFrameImage('3rd_place')
      .then(img => { if (isMounted) setThirdPlaceFrameImg(img); })
      .catch(err => console.error('3rd Place frame load error:', err));

    return () => { isMounted = false; };
  }, []);

  // Preload User Images
  useEffect(() => {
    if (images.length === 0) return;
    let isMounted = true;

    const newMap = new Map<string, HTMLImageElement>();
    let loadedCount = 0;

    images.forEach(imgItem => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (isMounted) {
          newMap.set(imgItem.id, img);
          loadedCount++;
          if (loadedCount === images.length) {
            setUserLoadedImgMap(new Map(newMap));
          }
        }
      };
      img.src = imgItem.src;
    });

    return () => { isMounted = false; };
  }, [images]);

  // Current active user image
  const currentImageItem = images.find(i => i.id === selectedImageId) || null;
  const currentHTMLImage = currentImageItem ? userLoadedImgMap.get(currentImageItem.id) || null : null;

  // Active badge frame image
  const activeFrameImg =
    settings.badgeType === 'custom'
      ? customFrameImg
      : settings.badgeType === 'winner'
      ? winnerFrameImg
      : settings.badgeType === '3rd_place'
      ? thirdPlaceFrameImg
      : runnerUpFrameImg;

  // Custom Frame Image Upload Handler
  const handleCustomFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setCustomFrameImg(img);
      setSettings(s => ({
        ...s,
        badgeType: 'custom',
        customFrameUrl: url,
      }));
    };
    img.src = url;
  };

  // Re-render Canvas on any setting change or image load
  useEffect(() => {
    if (canvasRef.current) {
      renderBadgeToCanvas(
        canvasRef.current,
        currentHTMLImage,
        settings,
        activeFrameImg
      );
    }
  }, [currentHTMLImage, settings, activeFrameImg]);

  // Canvas Mouse / Touch Drag handlers for direct pan positioning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: settings.panX,
      panY: settings.panY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !canvasRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const rect = canvasRef.current.getBoundingClientRect();

    const radius = rect.width * (settings.innerRadiusPercent || 0.315);
    let rW = radius * 2;
    let rH = radius * 2;
    if (currentHTMLImage) {
      const ar = currentHTMLImage.width / currentHTMLImage.height;
      if (ar > 1) {
        rW = radius * 2 * ar;
      } else {
        rH = (radius * 2) / ar;
      }
    }
    rW *= settings.zoom;
    rH *= settings.zoom;

    const deltaPanX = dx / Math.max(rW, 1);
    const deltaPanY = dy / Math.max(rH, 1);

    setSettings(prev => ({
      ...prev,
      panX: Math.max(0, Math.min(1, dragStartRef.current.panX + deltaPanX)),
      panY: Math.max(0, Math.min(1, dragStartRef.current.panY + deltaPanY)),
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Single Image Export (Transparent PNG)
  const handleExportSingle = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    const badgeName = settings.badgeType === 'winner' ? 'winner-badge' : 'runner-up-badge';
    const personName = currentImageItem ? currentImageItem.name.replace(/\.[^/.]+$/, '') : 'badge';
    
    link.download = `${personName}-${badgeName}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  // Batch Export All Badges in ZIP
  const handleExportBatchZip = async () => {
    if (images.length === 0 || !activeFrameImg) return;
    setIsExportingZip(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder('Winner_RunnerUp_Badges');

      for (let i = 0; i < images.length; i++) {
        const imgItem = images[i];
        let htmlImg = userLoadedImgMap.get(imgItem.id);

        if (!htmlImg) {
          htmlImg = await new Promise<HTMLImageElement>((res, rej) => {
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => res(im);
            im.onerror = rej;
            im.src = imgItem.src;
          });
        }

        const tempCanvas = document.createElement('canvas');
        renderBadgeToCanvas(tempCanvas, htmlImg, settings, activeFrameImg);

        const dataUrl = tempCanvas.toDataURL('image/png', 1.0);
        const base64Data = dataUrl.split(',')[1];
        const fileName = `${imgItem.name.replace(/\.[^/.]+$/, '')}-${settings.badgeType}-badge.png`;

        if (folder) {
          folder.file(fileName, base64Data, { base64: true });
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `${settings.badgeType}-badges-package.zip`;
      link.href = URL.createObjectURL(zipBlob);
      link.click();
    } catch (err) {
      console.error('Batch ZIP export error:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Header / Upload Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-slate-100 overflow-hidden">
        {images.length === 0 ? (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Winner & Runner Up Badge Generator
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold px-2.5 py-0.5 rounded-full">
                      Gold & Silver Badges
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Upload photos to place inside Gold Winner or Silver Runner Up badge rings with transparent PNG export.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onLoadSampleImages}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Load Sample Photos
              </button>
            </div>

            <ImageUploader onAddImages={onAddImages} />
          </div>
        ) : (
          <div className="p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {images.length} Photo{images.length === 1 ? '' : 's'} Loaded for Badges
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold px-2 py-0.2 rounded-full">
                      Clipped Inside Ring
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Photos are automatically clipped strictly inside the inner badge window.
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
                  {isUploadExpanded ? 'Hide Upload' : '+ Add More Photos'}
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

            {isUploadExpanded && (
              <div className="pt-2 border-t border-slate-800/80 animate-fadeIn">
                <ImageUploader onAddImages={onAddImages} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Two-Column Workspace: Left Controls Sidebar + Right Badge Canvas Preview */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT COLUMN: Controls Sidebar */}
        <div className="w-full lg:w-[340px] xl:w-[360px] flex-shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pr-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Badge & Frame Controls</h3>
              <p className="text-[11px] text-slate-400">Customize badge type, position, and text</p>
            </div>
          </div>

          {/* 1. Badge Type Selector */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                1. Select Badge Frame
              </span>
            </label>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, badgeType: 'winner' }))}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left ${
                  settings.badgeType === 'winner'
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500 text-amber-200 font-bold shadow-md shadow-amber-500/10'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-950 p-0.5 border border-amber-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src="https://res.cloudinary.com/pf2i8uws/image/upload/v1786602002/winner-1.png"
                    alt="Winner Frame"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-100 font-bold">Gold Winner</div>
                  <div className="text-[10px] text-amber-300/80">1st Place Frame</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, badgeType: 'runner_up' }))}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left ${
                  settings.badgeType === 'runner_up'
                    ? 'bg-gradient-to-r from-slate-300/20 to-slate-400/20 border-slate-300 text-slate-100 font-bold shadow-md shadow-slate-300/10'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-950 p-0.5 border border-slate-400/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src="https://res.cloudinary.com/pf2i8uws/image/upload/v1786602003/Runnerup-1.png"
                    alt="Runner Up Frame"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-100 font-bold">Silver Runner Up</div>
                  <div className="text-[10px] text-slate-400">2nd Place Frame</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, badgeType: '3rd_place' }))}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left ${
                  settings.badgeType === '3rd_place'
                    ? 'bg-gradient-to-r from-amber-700/20 to-amber-600/20 border-amber-600 text-amber-100 font-bold shadow-md shadow-amber-600/10'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-950 p-0.5 border border-amber-600/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src="https://res.cloudinary.com/pf2i8uws/image/upload/v1786602327/3rd-place-1.png"
                    alt="3rd Place Frame"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-100 font-bold">Bronze 3rd Place</div>
                  <div className="text-[10px] text-amber-500">3rd Place Frame</div>
                </div>
              </button>
            </div>

            {/* Custom Frame PNG Upload Button */}
            <div className="pt-1 border-t border-slate-800/80 flex flex-col gap-1.5">
              <input
                ref={customFrameInputRef}
                type="file"
                accept="image/png,image/webp,image/svg+xml"
                onChange={handleCustomFrameUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => customFrameInputRef.current?.click()}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  settings.badgeType === 'custom' && customFrameImg
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-400 text-indigo-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-indigo-500/30'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {customFrameImg
                    ? 'Change Custom Frame PNG'
                    : '+ Upload Your Specific Frame PNG'}
                </span>
              </button>
              {customFrameImg && (
                <p className="text-[10px] text-emerald-400 text-center flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Custom PNG Frame Active
                </p>
              )}
            </div>
          </div>

          {/* 2. Photo Selector */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                2. Select Photo ({images.length})
              </label>
            </div>

            {images.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                {images.map(img => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImageId(img.id)}
                    className={`relative w-12 h-12 rounded-xl border-2 flex-shrink-0 overflow-hidden transition-all ${
                      selectedImageId === img.id
                        ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/30 ring-2 ring-indigo-500/40'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.src} alt={img.name} className="w-full h-full object-cover" />
                    {selectedImageId === img.id && (
                      <div className="absolute top-0.5 right-0.5 bg-indigo-600 rounded-full p-0.5 text-white">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No photos uploaded yet.</p>
            )}
          </div>

          {/* 3. Photo Zoom, Pan & Rotation */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-purple-400" />
                3. Photo Adjustment
              </span>
              <span className="text-[10px] text-slate-400">Drag Canvas or Sliders</span>
            </span>

            {/* Zoom Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Zoom Level</span>
                <span className="font-mono text-indigo-300 font-semibold">{settings.zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={settings.zoom}
                onChange={e => setSettings(s => ({ ...s, zoom: parseFloat(e.target.value) }))}
                className="accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
              />
            </div>

            {/* Rotation Slider & Flip */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Rotation</span>
                <span className="font-mono text-indigo-300 font-semibold">{settings.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={settings.rotation}
                onChange={e => setSettings(s => ({ ...s, rotation: parseInt(e.target.value, 10) }))}
                className="accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
              />

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, flipHorizontal: !s.flipHorizontal }))}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                    settings.flipHorizontal
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  Flip H
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, flipVertical: !s.flipVertical }))}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                    settings.flipVertical
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  Flip V
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, zoom: 1.0, panX: 0.5, panY: 0.5, rotation: 0, flipHorizontal: false, flipVertical: false }))}
                  className="py-1.5 px-2.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium"
                  title="Reset Position"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* 4. Text & Name Plate Overlay */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-pink-400" />
              4. Text & Name Plate
            </span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Show Name Plate</span>
              <input
                type="checkbox"
                checked={settings.showTextOverlay}
                onChange={e => setSettings(s => ({ ...s, showTextOverlay: e.target.checked }))}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            {settings.showTextOverlay && (
              <div className="flex flex-col gap-2.5 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Participant Name</label>
                  <input
                    type="text"
                    placeholder="e.g. JOHN DOE"
                    value={settings.participantName}
                    onChange={e => setSettings(s => ({ ...s, participantName: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Subtitle / Category</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Place Champion"
                    value={settings.subTitle}
                    onChange={e => setSettings(s => ({ ...s, subTitle: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Font Size</span>
                      <span className="font-mono text-indigo-300">{settings.textSizePx ?? 48}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="2"
                      value={settings.textSizePx ?? 48}
                      onChange={e => setSettings(s => ({ ...s, textSizePx: parseInt(e.target.value, 10) }))}
                      className="accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Rotation</span>
                      <span className="font-mono text-indigo-300">{settings.textRotation ?? 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={settings.textRotation ?? 0}
                      onChange={e => setSettings(s => ({ ...s, textRotation: parseInt(e.target.value, 10) }))}
                      className="accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Color:</span>
                    <input
                      type="color"
                      value={settings.textColor || '#ffffff'}
                      onChange={e => setSettings(s => ({ ...s, textColor: e.target.value }))}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, textXPercent: 0.5, textYPercent: 0.88, textSizePx: 48, textRotation: 0 }))}
                    className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-2 py-1 rounded"
                  >
                    Reset Text Position
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Advanced Ring Alignment Tune */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedRingTune(!showAdvancedRingTune)}
              className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider w-full"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                Fine-Tune Inner Ring
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedRingTune ? 'rotate-180' : ''}`} />
            </button>

            {showAdvancedRingTune && (
              <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-800/80 animate-fadeIn text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Ring Radius Size</span>
                    <span className="font-mono text-indigo-300">{(settings.innerRadiusPercent * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.4"
                    step="0.005"
                    value={settings.innerRadiusPercent}
                    onChange={e => setSettings(s => ({ ...s, innerRadiusPercent: parseFloat(e.target.value) }))}
                    className="accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Ring Y Center</span>
                    <span className="font-mono text-indigo-300">{(settings.innerOffsetYPercent * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.35"
                    max="0.6"
                    step="0.005"
                    value={settings.innerOffsetYPercent}
                    onChange={e => setSettings(s => ({ ...s, innerOffsetYPercent: parseFloat(e.target.value) }))}
                    className="accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Resolution */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Export Dimension</span>
            <select
              value={settings.exportDimension}
              onChange={e => setSettings(s => ({ ...s, exportDimension: parseInt(e.target.value, 10) }))}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="1080">1080 x 1080 (HD PNG)</option>
              <option value="2048">2048 x 2048 (4K Ultra HD)</option>
            </select>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Live Canvas Preview */}
        <div className="flex-1 w-full flex flex-col gap-4">
          {/* Header Bar - Sticky */}
          <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Badge Studio Preview
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold px-2 py-0.5 rounded-full">
                  {settings.badgeType === 'winner' ? '🏆 Winner Badge' : '🥈 Runner Up Badge'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Click & drag inside canvas to position photo. Export produces transparent PNG.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleExportSingle}
                disabled={!currentImageItem}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Export Transparent PNG</span>
              </button>

              {images.length > 1 && (
                <button
                  type="button"
                  onClick={handleExportBatchZip}
                  disabled={isExportingZip}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
                  title="Export all uploaded photos formatted as badges in a ZIP file"
                >
                  {isExportingZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Zipping Badges...</span>
                    </>
                  ) : (
                    <>
                      <FileArchive className="w-4 h-4 text-amber-400" />
                      <span>ZIP Export ({images.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Interactive Canvas Display Card with Photoshop Transform Tool Overlay */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            {currentImageItem ? (
              <div className="relative flex flex-col items-center gap-3 w-full max-w-[540px]">
                {/* Photoshop Transform Control Toolbar Bar */}
                <div className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-lg backdrop-blur-md">
                  {/* Layer Toggle Tabs */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTransformLayer('photo')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        activeTransformLayer === 'photo'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Photo Layer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTransformLayer('text');
                        if (!settings.showTextOverlay) {
                          setSettings(s => ({ ...s, showTextOverlay: true }));
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        activeTransformLayer === 'text'
                          ? 'bg-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span>Name Tag</span>
                    </button>
                  </div>

                  {/* Quick Action Transform Controls */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTransformLayer === 'photo') {
                          setSettings(s => ({ ...s, rotation: (s.rotation - 15) % 360 }));
                        } else {
                          setSettings(s => ({ ...s, textRotation: ((s.textRotation ?? 0) - 15) % 360 }));
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
                      title="Rotate 15° Left"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeTransformLayer === 'photo') {
                          setSettings(s => ({ ...s, rotation: (s.rotation + 15) % 360 }));
                        } else {
                          setSettings(s => ({ ...s, textRotation: ((s.textRotation ?? 0) + 15) % 360 }));
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
                      title="Rotate 15° Right"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeTransformLayer === 'photo') {
                          setSettings(s => ({ ...s, zoom: Math.min(4.0, s.zoom + 0.15) }));
                        } else {
                          setSettings(s => ({ ...s, textSizePx: Math.min(100, (s.textSizePx ?? 48) + 4) }));
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
                      title="Expand / Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeTransformLayer === 'photo') {
                          setSettings(s => ({ ...s, zoom: Math.max(0.5, s.zoom - 0.15) }));
                        } else {
                          setSettings(s => ({ ...s, textSizePx: Math.max(20, (s.textSizePx ?? 48) - 4) }));
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTransformHandles(!showTransformHandles)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                        showTransformHandles
                          ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                      title="Toggle Transform Bounding Box Handles"
                    >
                      {showTransformHandles ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Canvas Container with Photoshop Transform Handles Overlay */}
                <div
                  ref={canvasContainerRef}
                  className="relative w-full aspect-square rounded-2xl p-2 bg-slate-950/60 border border-slate-800/80 shadow-2xl group select-none overflow-hidden"
                >
                  {/* Main Rendering Canvas */}
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain rounded-xl shadow-2xl"
                  />

                  {/* PHOTOSHOP TRANSFORM OVERLAY HANDLES */}
                  {showTransformHandles && canvasDisplaySize > 0 && (
                    <div className="absolute inset-0 pointer-events-none p-2">
                      <div className="relative w-full h-full">
                        {/* 1. PHOTO TRANSFORM BOUNDING BOX */}
                        {(() => {
                          const cx = canvasDisplaySize * 0.5;
                          const cy = canvasDisplaySize * (settings.innerOffsetYPercent || 0.472);
                          const radius = canvasDisplaySize * (settings.innerRadiusPercent || 0.315);

                          let renderW = radius * 2;
                          let renderH = radius * 2;
                          if (currentHTMLImage) {
                            const imgAR = currentHTMLImage.width / currentHTMLImage.height;
                            if (imgAR > 1) {
                              renderW = radius * 2 * imgAR;
                            } else {
                              renderH = (radius * 2) / imgAR;
                            }
                          }
                          renderW *= settings.zoom;
                          renderH *= settings.zoom;

                          const offsetX = (settings.panX - 0.5) * renderW;
                          const offsetY = (settings.panY - 0.5) * renderH;

                          const boxCX = cx + offsetX;
                          const boxCY = cy + offsetY;
                          const isSelected = activeTransformLayer === 'photo';

                          return (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${boxCX}px`,
                                top: `${boxCY}px`,
                                width: `${renderW}px`,
                                height: `${renderH}px`,
                                transform: `translate(-50%, -50%) rotate(${settings.rotation}deg)`,
                              }}
                              className={`pointer-events-auto rounded-lg transition-colors ${
                                isSelected
                                  ? 'border-2 border-dashed border-indigo-400 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                                  : 'border border-dashed border-indigo-400/40 hover:border-indigo-400 cursor-pointer'
                              }`}
                              onClick={() => setActiveTransformLayer('photo')}
                            >
                              {isSelected && (
                                <>
                                  {/* Center Drag Move Area */}
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'photo', 'move')}
                                    className="w-full h-full cursor-move flex items-center justify-center group/center"
                                  >
                                    <div className="w-7 h-7 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg border border-indigo-300 opacity-80 group-hover/center:opacity-100 transition-opacity">
                                      <Move className="w-3.5 h-3.5" />
                                    </div>
                                  </div>

                                  {/* Top Rotation Stalk & Handle */}
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                    <div
                                      onPointerDown={(e) => startTransformInteraction(e, 'photo', 'rotate')}
                                      className="w-6 h-6 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center cursor-grab shadow-lg border border-white/80 active:cursor-grabbing hover:scale-110 transition-transform"
                                      title="Click & Drag to Rotate Photo"
                                    >
                                      <RotateCw className="w-3 h-3" />
                                    </div>
                                    <div className="w-0.5 h-3 bg-indigo-400"></div>
                                  </div>

                                  {/* 4 Corner Scale/Expand Handles */}
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'photo', 'scale')}
                                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize hover:scale-125 transition-transform shadow-md"
                                    title="Drag Corner to Expand / Scale Photo"
                                  />
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'photo', 'scale')}
                                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize hover:scale-125 transition-transform shadow-md"
                                    title="Drag Corner to Expand / Scale Photo"
                                  />
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'photo', 'scale')}
                                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize hover:scale-125 transition-transform shadow-md"
                                    title="Drag Corner to Expand / Scale Photo"
                                  />
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'photo', 'scale')}
                                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize hover:scale-125 transition-transform shadow-md"
                                    title="Drag Corner to Expand / Scale Photo"
                                  />
                                </>
                              )}
                            </div>
                          );
                        })()}

                        {/* 2. NAME TAG TRANSFORM BOUNDING BOX (If Text Enabled) */}
                        {settings.showTextOverlay && (() => {
                          const cx = canvasDisplaySize * (settings.textXPercent ?? 0.5);
                          const cy = canvasDisplaySize * (settings.textYPercent ?? 0.88);
                          const fontPx = (settings.textSizePx ?? 48) * (canvasDisplaySize / 1080);
                          const textLen = Math.max(6, (settings.participantName || 'NAME TAG').length);
                          const boxW = Math.max(120, fontPx * textLen * 0.55);
                          const boxH = Math.max(36, fontPx * 1.6);
                          const isSelected = activeTransformLayer === 'text';

                          return (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${cx}px`,
                                top: `${cy}px`,
                                width: `${boxW}px`,
                                height: `${boxH}px`,
                                transform: `translate(-50%, -50%) rotate(${settings.textRotation ?? 0}deg)`,
                              }}
                              className={`pointer-events-auto rounded-lg transition-colors ${
                                isSelected
                                  ? 'border-2 border-dashed border-pink-400 bg-pink-500/10 shadow-lg shadow-pink-500/20'
                                  : 'border border-dashed border-pink-400/40 hover:border-pink-400 cursor-pointer'
                              }`}
                              onClick={() => setActiveTransformLayer('text')}
                            >
                              {isSelected && (
                                <>
                                  {/* Center Drag Move Area */}
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'text', 'move')}
                                    className="w-full h-full cursor-move flex items-center justify-center group/center"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-lg border border-pink-200 opacity-80 group-hover/center:opacity-100 transition-opacity">
                                      <Move className="w-3 h-3" />
                                    </div>
                                  </div>

                                  {/* Top Rotation Stalk & Handle */}
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                    <div
                                      onPointerDown={(e) => startTransformInteraction(e, 'text', 'rotate')}
                                      className="w-6 h-6 rounded-full bg-pink-500 hover:bg-pink-400 text-white flex items-center justify-center cursor-grab shadow-lg border border-white/80 active:cursor-grabbing hover:scale-110 transition-transform"
                                      title="Click & Drag to Rotate Name Tag"
                                    >
                                      <RotateCw className="w-3 h-3" />
                                    </div>
                                    <div className="w-0.5 h-3 bg-pink-400"></div>
                                  </div>

                                  {/* 4 Corner Scale Handles for Text */}
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'text', 'scale')}
                                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-pink-600 rounded-sm cursor-nwse-resize hover:scale-125 transition-transform shadow-md"
                                    title="Drag Corner to Scale Text Size"
                                  />
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'text', 'scale')}
                                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-pink-600 rounded-sm cursor-nesw-resize hover:scale-125 transition-transform shadow-md"
                                    title="Drag Corner to Scale Text Size"
                                  />
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'text', 'scale')}
                                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-pink-600 rounded-sm cursor-nesw-resize hover:scale-125 transition-transform shadow-md"
                                    title="Drag Corner to Scale Text Size"
                                  />
                                  <div
                                    onPointerDown={(e) => startTransformInteraction(e, 'text', 'scale')}
                                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-pink-600 rounded-sm cursor-nwse-resize hover:scale-125 transition-transform shadow-md"
                                    title="Drag Corner to Scale Text Size"
                                  />
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between w-full text-xs text-slate-400 px-1">
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Photoshop Transform Tool Active: Drag handles on canvas to Move, Scale or Rotate!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(DEFAULT_BADGE_SETTINGS)}
                    className="text-[11px] text-slate-400 hover:text-white underline"
                  >
                    Reset All Transforms
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center flex flex-col items-center justify-center gap-4 py-12">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200">No Photo Selected for Badge</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Upload a photo or select sample photos above to render inside the Gold Winner or Silver Runner Up badge frame.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
