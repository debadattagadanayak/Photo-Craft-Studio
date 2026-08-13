import React from 'react';
import { CollageSettings, HorizontalAlignment, VerticalAlignment } from '../types';
import {
  Palette,
  Sliders,
  Square,
  Sparkles,
} from 'lucide-react';

interface CollageSettingsProps {
  settings: CollageSettings;
  onChange: (newSettings: Partial<CollageSettings>) => void;
}

export const CollageSettingsControls: React.FC<CollageSettingsProps> = ({ settings, onChange }) => {
  const PRESET_COLORS = [
    { label: 'White', value: '#ffffff' },
    { label: 'Black', value: '#000000' },
    { label: 'Dark Slate', value: '#0f172a' },
    { label: 'Soft Cream', value: '#fef3c7' },
    { label: 'Pastel Blue', value: '#e0f2fe' },
    { label: 'Pastel Pink', value: '#fce7f3' },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Multi-Collage Batch Split & Spacing */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          Multi-Collage Batch & Spacing
        </label>

        <div className="space-y-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/80">
          {/* Images Per Output Collage */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Images Per Output Collage</span>
              <span className="text-indigo-400 font-bold">
                {settings.imagesPerCollage === 0 ? 'All Photos' : `${settings.imagesPerCollage} photos / collage`}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                min={0}
                placeholder="Enter custom count (e.g. 15)"
                value={settings.imagesPerCollage === 0 ? '' : settings.imagesPerCollage}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  onChange({ imagesPerCollage: isNaN(val) || val < 1 ? 0 : val });
                }}
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => onChange({ imagesPerCollage: 0 })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                  settings.imagesPerCollage === 0
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                All in 1
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 6, 8, 12, 16, 24, 50].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onChange({ imagesPerCollage: num })}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-all ${
                    settings.imagesPerCollage === num
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 mt-1.5">
              Type any custom number above or pick a preset to split your photos into batch collages.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/60">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">Image Gap</span>
                <span className="text-indigo-400 font-bold">{settings.gap}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={settings.gap}
                onChange={e => onChange({ gap: parseInt(e.target.value) || 0 })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">Outer Padding</span>
                <span className="text-indigo-400 font-bold">{settings.padding}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.padding}
                onChange={e => onChange({ padding: parseInt(e.target.value) || 0 })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Background Colors */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-indigo-400" />
          Background Colors
        </label>

        <div className="space-y-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/80">
          {/* Cell Background (Empty Space Color around contain image) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300">
                Cell Background
              </span>
              <button
                onClick={() => onChange({ cellBgColor: 'transparent' })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                  settings.cellBgColor === 'transparent'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Transparent
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => onChange({ cellBgColor: c.value })}
                  className={`w-6 h-6 rounded-full border border-slate-600 transition-transform ${
                    settings.cellBgColor === c.value ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
              <input
                type="color"
                value={settings.cellBgColor === 'transparent' ? '#ffffff' : settings.cellBgColor}
                onChange={e => onChange({ cellBgColor: e.target.value })}
                className="w-6 h-6 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                title="Custom Cell Color"
              />
            </div>
            {settings.cellBgColor === 'transparent' && (
              <span className="text-[10px] text-emerald-400 mt-1 block">
                ✓ Transparent cell edges: Rounded image corners show clean transparent background without white boxes.
              </span>
            )}
          </div>

          {/* Canvas Background */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300">Canvas Background</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={settings.isCanvasTransparent}
                  onChange={e => onChange({ isCanvasTransparent: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                Transparent
              </label>
            </div>

            {!settings.isCanvasTransparent && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={`canvas-${c.value}`}
                      onClick={() => onChange({ canvasBgColor: c.value })}
                      className={`w-6 h-6 rounded-full border border-slate-600 transition-transform ${
                        settings.canvasBgColor === c.value ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.canvasBgColor}
                    onChange={e => onChange({ canvasBgColor: e.target.value })}
                    className="w-6 h-6 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                    title="Custom Canvas Color"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Background Transparency</span>
                    <span className="text-indigo-400 font-bold">
                      {Math.round((settings.bgOpacity ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.bgOpacity ?? 1}
                    onChange={e => onChange({ bgOpacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Image Styling (Corner Radius, Borders, Shadow) */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Square className="w-3.5 h-3.5 text-indigo-400" />
          Image Style & Borders
        </label>

        <div className="space-y-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/80">
          {/* Corner Radius */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300">Corner Radius</span>
              <span className="text-indigo-400 font-bold">{settings.cornerRadius}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              value={settings.cornerRadius}
              onChange={e => onChange({ cornerRadius: parseInt(e.target.value) || 0 })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Border Width & Color & Opacity */}
          <div className="grid grid-cols-2 gap-2 items-center">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">Border Width</span>
                <span className="text-indigo-400 font-bold">{settings.borderWidth}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={settings.borderWidth}
                onChange={e => onChange({ borderWidth: parseInt(e.target.value) || 0 })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            <div>
              <span className="text-xs text-slate-300 block mb-1">Border Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.borderColor}
                  onChange={e => onChange({ borderColor: e.target.value })}
                  className="w-8 h-7 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                />
                <span className="text-xs font-mono text-slate-400 uppercase">{settings.borderColor}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300">Border Opacity</span>
              <span className="text-indigo-400 font-bold">{Math.round((settings.borderOpacity ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.borderOpacity ?? 1}
              onChange={e => onChange({ borderOpacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Drop Shadow Toggle */}
          <div className="pt-2 border-t border-slate-700/60">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Drop Shadow
              </span>
              <input
                type="checkbox"
                checked={settings.shadowEnabled}
                onChange={e => onChange({ shadowEnabled: e.target.checked })}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            {settings.shadowEnabled && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Shadow Blur ({settings.shadowBlur}px)</span>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={settings.shadowBlur}
                    onChange={e => onChange({ shadowBlur: parseInt(e.target.value) || 0 })}
                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Shadow Color</span>
                  <input
                    type="color"
                    value={settings.shadowColor}
                    onChange={e => onChange({ shadowColor: e.target.value })}
                    className="w-8 h-6 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Cell Alignment */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Image Cell Alignment
        </label>

        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/80">
          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Horizontal</span>
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
              {(['left', 'center', 'right'] as HorizontalAlignment[]).map(align => (
                <button
                  key={align}
                  onClick={() => onChange({ alignHorizontal: align })}
                  className={`py-1 text-[10px] font-semibold capitalize rounded transition-colors ${
                    settings.alignHorizontal === align
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Vertical</span>
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
              {(['top', 'center', 'bottom'] as VerticalAlignment[]).map(align => (
                <button
                  key={align}
                  onClick={() => onChange({ alignVertical: align })}
                  className={`py-1 text-[10px] font-semibold capitalize rounded transition-colors ${
                    settings.alignVertical === align
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
