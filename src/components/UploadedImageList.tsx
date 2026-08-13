import React, { useState } from 'react';
import { ArrowUp, ArrowDown, X, GripVertical, Image as ImageIcon } from 'lucide-react';
import { ImageItem } from '../types';
import { ImageUploader } from './ImageUploader';

interface UploadedImageListProps {
  images: ImageItem[];
  onReorder: (newImages: ImageItem[]) => void;
  onRemove: (id: string) => void;
  onAddImages: (newImages: ImageItem[]) => void;
}

export const UploadedImageList: React.FC<UploadedImageListProps> = ({
  images,
  onReorder,
  onRemove,
  onAddImages,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newArr = [...images];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    onReorder(newArr);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newArr = [...images];
    const draggedItem = newArr[draggedIndex];
    newArr.splice(draggedIndex, 1);
    newArr.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    onReorder(newArr);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (images.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
          Uploaded Photos ({images.length})
        </h3>
        <span className="text-[11px] text-slate-400">Drag items to reorder</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
        {images.map((img, idx) => (
          <div
            key={img.id}
            draggable
            onDragStart={e => handleDragStart(e, idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 p-2 rounded-lg bg-slate-800/80 border transition-all ${
              draggedIndex === idx
                ? 'border-indigo-500 bg-indigo-950/40 opacity-50'
                : 'border-slate-700/80 hover:border-slate-600'
            }`}
          >
            {/* Drag Handle */}
            <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-0.5">
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
              <img
                src={img.src}
                alt={img.name}
                className="w-full h-full object-contain bg-slate-950"
              />
              <span className="absolute bottom-0 left-0 bg-slate-900/90 text-[9px] font-bold text-slate-300 px-1 py-0.2 rounded-tr">
                #{idx + 1}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{img.name}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span>
                  {img.width} × {img.height}
                </span>
                <span className="capitalize px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300">
                  {img.orientation}
                </span>
              </div>
            </div>

            {/* Reorder Buttons */}
            <div className="flex flex-col gap-0.5">
              <button
                disabled={idx === 0}
                onClick={() => handleMove(idx, 'up')}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Move up"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                disabled={idx === images.length - 1}
                onClick={() => handleMove(idx, 'down')}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Move down"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => onRemove(img.id)}
              className="p-1.5 rounded-lg hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors ml-1"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <ImageUploader onAddImages={onAddImages} compact />
    </div>
  );
};
