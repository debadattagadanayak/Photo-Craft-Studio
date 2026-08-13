import React, { useState, useEffect, useMemo } from 'react';
import { ImageItem, CollageSettings, OutputOrientation, ImageOrientation, LayoutType, ImageCrop, ActiveStudioTab } from './types';
import { SAMPLE_IMAGES } from './data/sampleImages';
import { getAspectRatioValue } from './data/aspectRatios';
import { calculateLayout } from './utils/layoutEngine';
import { preloadImages } from './utils/canvasRenderer';
import { requestAIAutoAlign, AIAlignResult } from './utils/aiAlignService';

import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { UploadedImageList } from './components/UploadedImageList';
import { OrientationSelector } from './components/OrientationSelector';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { LayoutSelector } from './components/LayoutSelector';
import { CollageSettingsControls } from './components/CollageSettings';
import { CollagePreview } from './components/CollagePreview';
import { ExportModal } from './components/ExportModal';
import { AiInsightModal } from './components/AiInsightModal';
import { ImageCropModal } from './components/ImageCropModal';
import { CropResizeStudio } from './components/CropResizeStudio';
import { BadgeStudio } from './components/BadgeStudio';

import { Images, Sliders, Palette, LayoutGrid } from 'lucide-react';

const DEFAULT_SETTINGS: CollageSettings = {
  imageOrientation: 'mixed',
  outputOrientation: 'landscape',
  aspectRatioId: '16-9',
  customWidthRatio: 16,
  customHeightRatio: 9,

  imagesPerCollage: 0,

  layoutType: 'auto',
  columns: 3,

  gap: 8,
  padding: 8,
  cellBgColor: 'transparent',
  canvasBgColor: '#ffffff',
  isCanvasTransparent: true,
  cornerRadius: 8,
  borderWidth: 0,
  borderColor: '#000000',

  shadowEnabled: false,
  shadowBlur: 15,
  shadowColor: 'rgba(0, 0, 0, 0.25)',
  shadowOffsetX: 0,
  shadowOffsetY: 4,

  alignHorizontal: 'center',
  alignVertical: 'center',
};

export default function App() {
  const [studioTab, setStudioTab] = useState<ActiveStudioTab>('collage');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<CollageSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'photos' | 'layout' | 'style'>('photos');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);

  // AI State
  const [isAIAligning, setIsAIAligning] = useState(false);
  const [aiResult, setAiResult] = useState<AIAlignResult | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [previousState, setPreviousState] = useState<{
    images: ImageItem[];
    settings: CollageSettings;
  } | null>(null);

  const [loadedImagesMap, setLoadedImagesMap] = useState<Map<string, HTMLImageElement>>(new Map());

  // Crop modal state
  const [cropModalState, setCropModalState] = useState<{
    isOpen: boolean;
    image: ImageItem | null;
    cellRatio: number;
  }>({
    isOpen: false,
    image: null,
    cellRatio: 1,
  });

  const handleOpenCropModal = (image: ImageItem, cellRatio: number) => {
    setCropModalState({
      isOpen: true,
      image,
      cellRatio,
    });
  };

  const handleSaveCrop = (imageId: string, crop: ImageCrop | undefined) => {
    setImages(prev => prev.map(img => (img.id === imageId ? { ...img, crop } : img)));
  };

  // Load image elements whenever images change
  useEffect(() => {
    if (images.length === 0) return;
    let isMounted = true;

    preloadImages(images).then(map => {
      if (isMounted) {
        setLoadedImagesMap(map);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [images]);

  // AI Auto-Align handler
  const handleAIAutoAlign = async () => {
    if (images.length === 0) return;

    // Save previous state for undo
    setPreviousState({
      images: [...images],
      settings: { ...settings },
    });

    setIsAIAligning(true);
    try {
      const result = await requestAIAutoAlign(images, settings);

      // Re-order images array based on AI returned reorderedImageIds
      if (result.reorderedImageIds && result.reorderedImageIds.length > 0) {
        const idMap = new Map<string, ImageItem>(images.map(img => [img.id, img]));
        const newOrder: ImageItem[] = [];
        result.reorderedImageIds.forEach(id => {
          const found = idMap.get(id);
          if (found) newOrder.push(found);
        });
        // Append any images that were omitted
        images.forEach(img => {
          if (!newOrder.some(i => i.id === img.id)) {
            newOrder.push(img);
          }
        });
        setImages(newOrder);
      }

      // Apply recommended settings
      setSettings(prev => ({
        ...prev,
        layoutType: result.recommendedLayout || prev.layoutType,
        columns: result.recommendedColumns || prev.columns,
        imageOrientation: result.recommendedOrientation || prev.imageOrientation,
        ...(result.recommendedOutputOrientation ? { outputOrientation: result.recommendedOutputOrientation } : {}),
        ...(result.recommendedAspectRatioId ? { aspectRatioId: result.recommendedAspectRatioId } : {}),
        ...(result.recommendedGap !== undefined ? { gap: result.recommendedGap } : {}),
        ...(result.recommendedPadding !== undefined ? { padding: result.recommendedPadding } : {}),
        ...(result.recommendedAlignHorizontal ? { alignHorizontal: result.recommendedAlignHorizontal } : {}),
        ...(result.recommendedAlignVertical ? { alignVertical: result.recommendedAlignVertical } : {}),
      }));

      setAiResult(result);
      setIsAiModalOpen(true);
    } catch (err: any) {
      console.error('AI Auto Align failed:', err);
      alert(err.message || 'AI Auto-Align failed. Please try again.');
    } finally {
      setIsAIAligning(false);
    }
  };

  // Revert AI changes
  const handleUndoAIAlign = () => {
    if (previousState) {
      setImages(previousState.images);
      setSettings(previousState.settings);
      setPreviousState(null);
    }
  };

  // Handle image addition
  const handleAddImages = (newItems: ImageItem[]) => {
    setImages(prev => [...prev, ...newItems]);
  };

  // Load sample photos for quick demo
  const handleLoadSampleImages = () => {
    setImages(SAMPLE_IMAGES as ImageItem[]);
  };

  // Remove individual image
  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Clear all images
  const handleClearAll = () => {
    setImages([]);
  };

  // Reset settings to default
  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // Update settings partially
  const handleUpdateSettings = (partial: Partial<CollageSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  // Calculate target aspect ratio (width / height)
  const canvasAspectRatio = useMemo(() => {
    return getAspectRatioValue(
      settings.aspectRatioId,
      settings.customWidthRatio,
      settings.customHeightRatio
    );
  }, [settings.aspectRatioId, settings.customWidthRatio, settings.customHeightRatio]);

  // Swap images handler for drag-and-drop reordering in preview
  const handleSwapImages = (sourceBatchIdx: number, targetBatchIdx: number) => {
    if (sourceBatchIdx === targetBatchIdx) return;
    const start = settings.imagesPerCollage > 0 ? validBatchIndex * settings.imagesPerCollage : 0;
    const globalSourceIdx = start + sourceBatchIdx;
    const globalTargetIdx = start + targetBatchIdx;

    setImages(prev => {
      if (globalSourceIdx < 0 || globalSourceIdx >= prev.length) return prev;
      if (globalTargetIdx < 0 || globalTargetIdx >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[globalSourceIdx];
      updated[globalSourceIdx] = updated[globalTargetIdx];
      updated[globalTargetIdx] = temp;
      return updated;
    });
  };

  // Batch Multi-Collage calculations
  const imagesPerCollage = settings.imagesPerCollage;
  const totalCollages = useMemo(() => {
    if (imagesPerCollage <= 0 || images.length === 0) return 1;
    return Math.ceil(images.length / imagesPerCollage);
  }, [images.length, imagesPerCollage]);

  const validBatchIndex = Math.min(activeBatchIndex, Math.max(0, totalCollages - 1));

  // Current batch images
  const currentBatchImages = useMemo(() => {
    if (imagesPerCollage <= 0 || images.length === 0) return images;
    const start = validBatchIndex * imagesPerCollage;
    return images.slice(start, start + imagesPerCollage);
  }, [images, imagesPerCollage, validBatchIndex]);

  // Calculate cell layout for current active batch
  const currentBatchCells = useMemo(() => {
    return calculateLayout(currentBatchImages, settings, canvasAspectRatio);
  }, [currentBatchImages, settings, canvasAspectRatio]);

  // Calculate all batches for Export Modal
  const allCollageBatches = useMemo(() => {
    if (imagesPerCollage <= 0 || images.length === 0) {
      return [{ images, cells: currentBatchCells, index: 0 }];
    }
    const result = [];
    const count = Math.ceil(images.length / imagesPerCollage);
    for (let i = 0; i < count; i++) {
      const batchImgs = images.slice(i * imagesPerCollage, (i + 1) * imagesPerCollage);
      const batchCells = calculateLayout(batchImgs, settings, canvasAspectRatio);
      result.push({ images: batchImgs, cells: batchCells, index: i });
    }
    return result;
  }, [images, imagesPerCollage, settings, canvasAspectRatio, currentBatchCells]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Header */}
      <Header
        activeTab={studioTab}
        onTabChange={setStudioTab}
        imageCount={images.length}
        onLoadSampleImages={handleLoadSampleImages}
        onClearAll={handleClearAll}
        onResetSettings={handleResetSettings}
        onOpenExport={() => setIsExportOpen(true)}
        onAIAutoAlign={handleAIAutoAlign}
        isAIAligning={isAIAligning}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-3 sm:p-5 lg:p-6">
        {studioTab === 'badge_studio' ? (
          <BadgeStudio
            images={images}
            onAddImages={handleAddImages}
            onLoadSampleImages={handleLoadSampleImages}
            onClearAll={handleClearAll}
          />
        ) : studioTab === 'crop_resize' ? (
          <CropResizeStudio
            images={images}
            setImages={setImages}
            onAddImages={handleAddImages}
            onLoadSampleImages={handleLoadSampleImages}
            onClearAll={handleClearAll}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Control Sidebar (4 Columns on LG) */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5 shadow-xl">
              {/* Tab Navigation */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'photos'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Images className="w-3.5 h-3.5" />
                  <span>Photos ({images.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('layout')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'layout'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Layout</span>
                </button>

                <button
                  onClick={() => setActiveTab('style')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'style'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Style</span>
                </button>
              </div>

              {/* Tab Content 1: Photos & Uploads */}
              {activeTab === 'photos' && (
                <div className="space-y-5 animate-fade-in">
                  <ImageUploader onAddImages={handleAddImages} />

                  <OrientationSelector
                    value={settings.imageOrientation}
                    onChange={val => handleUpdateSettings({ imageOrientation: val })}
                  />

                  <UploadedImageList
                    images={images}
                    onReorder={setImages}
                    onRemove={handleRemoveImage}
                    onAddImages={handleAddImages}
                  />
                </div>
              )}

              {/* Tab Content 2: Ratio & Layout */}
              {activeTab === 'layout' && (
                <div className="space-y-5 animate-fade-in">
                  <AspectRatioSelector
                    outputOrientation={settings.outputOrientation}
                    onOutputOrientationChange={orient =>
                      handleUpdateSettings({ outputOrientation: orient })
                    }
                    aspectRatioId={settings.aspectRatioId}
                    onAspectRatioIdChange={id => handleUpdateSettings({ aspectRatioId: id })}
                    customWidthRatio={settings.customWidthRatio}
                    onCustomWidthChange={val => handleUpdateSettings({ customWidthRatio: val })}
                    customHeightRatio={settings.customHeightRatio}
                    onCustomHeightChange={val => handleUpdateSettings({ customHeightRatio: val })}
                  />

                  <LayoutSelector
                    layoutType={settings.layoutType}
                    onChangeLayout={lType => handleUpdateSettings({ layoutType: lType })}
                    columns={settings.columns}
                    onChangeColumns={cols => handleUpdateSettings({ columns: cols })}
                    imageCount={images.length}
                    onAIAutoAlign={handleAIAutoAlign}
                    isAIAligning={isAIAligning}
                  />
                </div>
              )}

              {/* Tab Content 3: Styling Controls */}
              {activeTab === 'style' && (
                <div className="animate-fade-in">
                  <CollageSettingsControls
                    settings={settings}
                    onChange={handleUpdateSettings}
                  />
                </div>
              )}
            </div>

            {/* Right Stage Preview (8 Columns on LG) */}
            <div className="lg:col-span-8 h-[calc(100vh-130px)] min-h-[550px] sticky top-20">
              <CollagePreview
                images={currentBatchImages}
                cells={currentBatchCells}
                settings={settings}
                canvasAspectRatio={canvasAspectRatio}
                loadedImages={loadedImagesMap}
                onLoadSampleImages={handleLoadSampleImages}
                onAddImagesClick={() => setActiveTab('photos')}
                totalCollages={totalCollages}
                activeBatchIndex={validBatchIndex}
                onSelectBatchIndex={setActiveBatchIndex}
                onRemoveImage={handleRemoveImage}
                onSwapImages={handleSwapImages}
                onOpenCropModal={handleOpenCropModal}
              />
            </div>
          </div>
        )}
      </main>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalState.isOpen}
        image={cropModalState.image}
        cellRatio={cropModalState.cellRatio}
        onClose={() => setCropModalState(prev => ({ ...prev, isOpen: false }))}
        onSave={handleSaveCrop}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        images={currentBatchImages}
        cells={currentBatchCells}
        settings={settings}
        canvasAspectRatio={canvasAspectRatio}
        loadedImages={loadedImagesMap}
        totalCollages={totalCollages}
        allCollageBatches={allCollageBatches}
      />

      {/* AI Insight Modal */}
      <AiInsightModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        result={aiResult}
        onUndo={handleUndoAIAlign}
        onReRun={handleAIAutoAlign}
      />
    </div>
  );
}

