import React, { useRef, useState } from 'react';
import { Upload, ImagePlus, ShieldCheck, AlertCircle } from 'lucide-react';
import heic2any from 'heic2any';
import { ImageItem } from '../types';

interface ImageUploaderProps {
  onAddImages: (newImages: ImageItem[]) => void;
  compact?: boolean;
}

const isHeicFile = (file: File) => {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || type.includes('heic') || type.includes('heif');
};

const convertHeicIfNeeded = async (file: File): Promise<File> => {
  if (isHeicFile(file)) {
    try {
      const result = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92,
      });
      const blobResult = Array.isArray(result) ? result[0] : result;
      const convertedFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([blobResult], convertedFileName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } catch (err) {
      console.error('HEIC conversion failed:', err);
      throw new Error(`Could not convert HEIC photo (${file.name})`);
    }
  }
  return file;
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onAddImages, compact = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    setErrorMsg(null);
    setLoadingFiles(true);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'];
    const newItems: ImageItem[] = [];
    const invalidFiles: string[] = [];

    const fileArray = Array.from(files);

    for (const rawFile of fileArray) {
      const isHeic = isHeicFile(rawFile);
      const isStandard = validTypes.includes(rawFile.type.toLowerCase()) || rawFile.type.startsWith('image/') || rawFile.type === '';

      if (!isHeic && !isStandard) {
        invalidFiles.push(rawFile.name);
        continue;
      }

      try {
        const fileToLoad = await convertHeicIfNeeded(rawFile);
        const item = await loadImageFromFile(fileToLoad);
        newItems.push(item);
      } catch (err) {
        console.error('Failed to load image:', rawFile.name, err);
        invalidFiles.push(rawFile.name);
      }
    }

    setLoadingFiles(false);

    if (invalidFiles.length > 0) {
      setErrorMsg(`Unsupported or unreadable file(s): ${invalidFiles.join(', ')}. Please select JPG, PNG, WEBP, or HEIC.`);
    }

    if (newItems.length > 0) {
      onAddImages(newItems);
    }
  };

  const loadImageFromFile = (file: File): Promise<ImageItem> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || 800;
          const h = img.naturalHeight || 600;
          const ratio = w / h;

          let orientation: 'landscape' | 'portrait' | 'square' = 'square';
          if (ratio > 1.05) orientation = 'landscape';
          else if (ratio < 0.95) orientation = 'portrait';

          resolve({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file,
            src,
            name: file.name,
            width: w,
            height: h,
            aspectRatio: ratio,
            orientation,
          });
        };
        img.onerror = reject;
        img.src = src;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  if (compact) {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
        >
          <ImagePlus className="w-4 h-4" />
          Add More Photos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
            {loadingFiles ? (
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-200">
              Drag & drop photos here, or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WEBP, and HEIC (iPhone photos)</p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Private — processed inside your browser</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
