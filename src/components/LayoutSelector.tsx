import React from 'react';
import { LayoutType } from '../types';
import { Sparkles, Grid3X3, Layers, AlignLeft, Rows, Columns, Wand2, Loader2 } from 'lucide-react';

interface LayoutSelectorProps {
  layoutType: LayoutType;
  onChangeLayout: (type: LayoutType) => void;
  columns: number;
  onChangeColumns: (cols: number) => void;
  imageCount: number;
  onAIAutoAlign?: () => void;
  isAIAligning?: boolean;
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  layoutType,
  onChangeLayout,
  columns,
  onChangeColumns,
  imageCount,
  onAIAutoAlign,
  isAIAligning = false,
}) => {
  const layouts: {
    id: LayoutType;
    label: string;
    icon: React.ReactNode;
    desc: string;
    recommended?: boolean;
  }[] = [
    {
      id: 'auto',
      label: 'Auto Balanced',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      desc: 'Optimal row/col distribution',
      recommended: true,
    },
    {
      id: 'ai_smart_crop',
      label: 'AI Smart Mosaic',
      icon: <Wand2 className="w-4 h-4 text-indigo-400" />,
      desc: 'Smart crop & seamless fill',
    },
    {
      id: 'uniform_grid',
      label: 'Uniform Grid',
      icon: <Grid3X3 className="w-4 h-4" />,
      desc: 'Equal column grid',
    },
    {
      id: 'masonry',
      label: 'Masonry Flow',
      icon: <Layers className="w-4 h-4" />,
      desc: 'Staggered image heights',
    },
    {
      id: 'horizontal_strips',
      label: 'Horizontal Rows',
      icon: <AlignLeft className="w-4 h-4 rotate-90" />,
      desc: 'Matching row heights',
    },
    {
      id: 'vertical_strips',
      label: 'Vertical Columns',
      icon: <Columns className="w-4 h-4" />,
      desc: 'Matching col widths',
    },
    {
      id: 'featured_left',
      label: 'Hero Left',
      icon: <Columns className="w-4 h-4" />,
      desc: 'Large left image',
    },
    {
      id: 'featured_top',
      label: 'Hero Top',
      icon: <Rows className="w-4 h-4" />,
      desc: 'Large top image',
    },
  ];

  const showColumnsControl =
    layoutType === 'auto' ||
    layoutType === 'ai_smart_crop' ||
    layoutType === 'uniform_grid' ||
    layoutType === 'masonry' ||
    layoutType === 'vertical_strips' ||
    layoutType === 'horizontal_strips' ||
    layoutType === 'custom_grid';

  return (
    <div className="space-y-4">
      {/* Gemini AI Auto-Align Magic Banner */}
      {onAIAutoAlign && imageCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/50 to-slate-900 border border-indigo-500/30 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
                <Wand2 className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  AI Smart Auto-Align
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </h4>
                <p className="text-[10px] text-slate-400">
                  Gemini analyzes image ratios to choose the perfect layout & reorder for zero crop.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onAIAutoAlign}
            disabled={isAIAligning}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {isAIAligning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>Gemini Analyzing Layout...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto-Align Photos with Gemini</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Collage Layout Presets
        </label>
        {layoutType === 'auto' && (
          <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3" /> Auto Balanced
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {layouts.map(item => {
          const isSelected = layoutType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeLayout(item.id)}
              className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`p-1 rounded-md ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.icon}
                </span>
                {item.recommended && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded">
                    SUGGESTED
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-200">{item.label}</span>
              <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{item.desc}</span>
            </button>
          );
        })}
      </div>

      {showColumnsControl && (
        <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Columns className="w-3.5 h-3.5 text-indigo-400" />
              Number of Columns
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={20}
                value={columns}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  onChangeColumns(isNaN(val) || val < 1 ? 1 : Math.min(20, val));
                }}
                className="w-12 bg-slate-900 border border-slate-700 text-indigo-400 font-bold text-center text-xs py-0.5 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <span className="text-slate-400 text-[11px]">cols</span>
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={Math.max(1, Math.min(12, imageCount > 0 ? imageCount : 12))}
            value={columns}
            onChange={e => onChangeColumns(parseInt(e.target.value) || 1)}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => onChangeColumns(num)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md border transition-all ${
                  columns === num
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

