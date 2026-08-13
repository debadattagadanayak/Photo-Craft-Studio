import React from 'react';
import { OutputOrientation } from '../types';
import { ASPECT_RATIO_PRESETS } from '../data/aspectRatios';
import { Monitor, Smartphone, Square, Sliders } from 'lucide-react';

interface AspectRatioSelectorProps {
  outputOrientation: OutputOrientation;
  onOutputOrientationChange: (orientation: OutputOrientation) => void;
  aspectRatioId: string;
  onAspectRatioIdChange: (id: string) => void;
  customWidthRatio: number;
  onCustomWidthChange: (val: number) => void;
  customHeightRatio: number;
  onCustomHeightChange: (val: number) => void;
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  outputOrientation,
  onOutputOrientationChange,
  aspectRatioId,
  onAspectRatioIdChange,
  customWidthRatio,
  onCustomWidthChange,
  customHeightRatio,
  onCustomHeightChange,
}) => {
  const categories: { id: OutputOrientation; label: string; icon: React.ReactNode }[] = [
    { id: 'landscape', label: 'Landscape', icon: <Monitor className="w-3.5 h-3.5" /> },
    { id: 'portrait', label: 'Portrait', icon: <Smartphone className="w-3.5 h-3.5" /> },
    { id: 'square', label: 'Square', icon: <Square className="w-3.5 h-3.5" /> },
    { id: 'custom', label: 'Custom', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  const filteredPresets = ASPECT_RATIO_PRESETS.filter(
    p => p.category === outputOrientation && p.id !== 'custom'
  );

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
        Output Aspect Ratio
      </label>

      {/* Category Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              onOutputOrientationChange(cat.id);
              // Set default preset for category
              if (cat.id === 'landscape') onAspectRatioIdChange('16-9');
              else if (cat.id === 'portrait') onAspectRatioIdChange('9-16');
              else if (cat.id === 'square') onAspectRatioIdChange('1-1');
              else if (cat.id === 'custom') onAspectRatioIdChange('custom');
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              outputOrientation === cat.id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat.icon}
            <span className="hidden sm:inline">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Preset Chips */}
      {outputOrientation !== 'custom' && (
        <div className="grid grid-cols-3 gap-2">
          {filteredPresets.map(preset => {
            const isSelected = aspectRatioId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onAspectRatioIdChange(preset.id)}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200 font-semibold'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{preset.wRatio}:{preset.hRatio}</div>
                <div className="text-[10px] text-slate-400 truncate">{preset.name.split(' ')[1] || preset.name}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Inputs */}
      {outputOrientation === 'custom' && (
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-2">
          <div className="text-xs font-medium text-slate-300">Enter Ratio Dimensions</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Width Ratio</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={customWidthRatio}
                onChange={e => onCustomWidthChange(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Height Ratio</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={customHeightRatio}
                onChange={e => onCustomHeightChange(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
