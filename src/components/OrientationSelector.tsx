import React from 'react';
import { ImageOrientation } from '../types';
import { Monitor, Smartphone, Layers } from 'lucide-react';

interface OrientationSelectorProps {
  value: ImageOrientation;
  onChange: (value: ImageOrientation) => void;
}

export const OrientationSelector: React.FC<OrientationSelectorProps> = ({ value, onChange }) => {
  const options: { id: ImageOrientation; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'landscape',
      label: 'Landscape',
      icon: <Monitor className="w-4 h-4" />,
      desc: 'Wider cell proportions',
    },
    {
      id: 'portrait',
      label: 'Portrait',
      icon: <Smartphone className="w-4 h-4" />,
      desc: 'Taller cell proportions',
    },
    {
      id: 'mixed',
      label: 'Mixed',
      icon: <Layers className="w-4 h-4" />,
      desc: 'Adaptive balanced grid',
    },
  ];

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
        Uploaded Image Orientation
      </label>
      <div className="grid grid-cols-3 gap-2">
        {options.map(opt => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg mb-1 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {opt.icon}
              </div>
              <span className="text-xs font-medium text-slate-200">{opt.label}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
