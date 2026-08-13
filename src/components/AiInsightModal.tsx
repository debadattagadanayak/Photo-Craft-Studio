import React from 'react';
import { Sparkles, Check, RotateCcw, X, Wand2, LayoutGrid, Layers, ArrowRight } from 'lucide-react';
import { AIAlignResult } from '../utils/aiAlignService';

interface AiInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AIAlignResult | null;
  onUndo: () => void;
  onReRun: () => void;
}

export const AiInsightModal: React.FC<AiInsightModalProps> = ({
  isOpen,
  onClose,
  result,
  onUndo,
  onReRun,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
        {/* Header with gradient badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">AI Auto-Aligned Layout</h3>
                <span className="text-[10px] uppercase font-extrabold tracking-wide px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Composition optimized for zero image cropping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rationale Quote Box */}
        <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Composition Insight</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300 italic">
            &ldquo;{result.reasoning}&rdquo;
          </p>
        </div>

        {/* Parameters Applied Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" /> Layout
            </span>
            <span className="font-semibold text-slate-200 capitalize">
              {result.recommendedLayout.replace('_', ' ')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Columns
            </span>
            <span className="font-semibold text-slate-200">
              {result.recommendedColumns} cols
            </span>
          </div>

          {result.recommendedOrientation && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <span className="text-slate-400">Photo Flow</span>
              <span className="font-semibold text-slate-200 capitalize">
                {result.recommendedOrientation}
              </span>
            </div>
          )}

          {result.recommendedOutputOrientation && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <span className="text-slate-400">Canvas Ratio</span>
              <span className="font-semibold text-slate-200 uppercase">
                {result.recommendedOutputOrientation} ({result.recommendedAspectRatioId || 'Auto'})
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              onUndo();
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revert Layout
          </button>

          <button
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            Keep AI Layout
          </button>
        </div>
      </div>
    </div>
  );
};
