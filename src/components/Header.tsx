import React from 'react';
import { LayoutGrid, Sparkles, Trash2, RotateCcw, Wand2, Loader2, Crop, Trophy } from 'lucide-react';
import { ActiveStudioTab } from '../types';

interface HeaderProps {
  activeTab: ActiveStudioTab;
  onTabChange: (tab: ActiveStudioTab) => void;
  imageCount: number;
  onLoadSampleImages: () => void;
  onClearAll: () => void;
  onResetSettings: () => void;
  onOpenExport: () => void;
  onAIAutoAlign?: () => void;
  isAIAligning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  imageCount,
  onLoadSampleImages,
  onClearAll,
  onResetSettings,
  onOpenExport,
  onAIAutoAlign,
  isAIAligning = false,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 px-4 py-3 sm:px-6">
      <div className="w-full max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Photo Craft Studio
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                AI Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Collage maker, bulk crop, circular/custom shapes & transparent borders.
            </p>
          </div>
        </div>

        {/* Studio Navigation Panel */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shadow-inner">
          <button
            type="button"
            onClick={() => onTabChange('collage')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'collage'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Collage Studio</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('crop_resize')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'crop_resize'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Crop className="w-4 h-4" />
            <span>Crop & Resize</span>
            {imageCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-200">
                {imageCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onTabChange('badge_studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'badge_studio'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Winner & Runner Up Badges</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {imageCount > 0 && (
            <>
              {activeTab === 'collage' && onAIAutoAlign && (
                <button
                  onClick={onAIAutoAlign}
                  disabled={isAIAligning}
                  title="Auto-align images for optimal layout using Gemini AI"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-200 border border-amber-500/30 transition-all shadow-sm disabled:opacity-50"
                >
                  {isAIAligning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>AI Aligning...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>AI Auto-Align</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={onResetSettings}
                title="Reset layout and style options"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>

              <button
                onClick={onClearAll}
                title="Remove all uploaded photos"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-300 transition-colors border border-red-800/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>

              {activeTab === 'collage' && (
                <button
                  onClick={onOpenExport}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-md shadow-indigo-500/25 transition-all"
                >
                  Export Collage
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

