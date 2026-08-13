import { AspectRatioPreset } from '../types';

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  // Landscape
  {
    id: '16-9',
    name: '16:9 Landscape',
    ratio: 16 / 9,
    wRatio: 16,
    hRatio: 9,
    category: 'landscape',
  },
  {
    id: '3-2',
    name: '3:2 Landscape (Classic)',
    ratio: 3 / 2,
    wRatio: 3,
    hRatio: 2,
    category: 'landscape',
  },
  {
    id: '4-3',
    name: '4:3 Landscape (Standard)',
    ratio: 4 / 3,
    wRatio: 4,
    hRatio: 3,
    category: 'landscape',
  },

  // Portrait
  {
    id: '9-16',
    name: '9:16 Portrait (Story / Mobile)',
    ratio: 9 / 16,
    wRatio: 9,
    hRatio: 16,
    category: 'portrait',
  },
  {
    id: '2-3',
    name: '2:3 Portrait (Poster)',
    ratio: 2 / 3,
    wRatio: 2,
    hRatio: 3,
    category: 'portrait',
  },
  {
    id: '3-4',
    name: '3:4 Portrait (Standard)',
    ratio: 3 / 4,
    wRatio: 3,
    hRatio: 4,
    category: 'portrait',
  },

  // Square
  {
    id: '1-1',
    name: '1:1 Square (Instagram)',
    ratio: 1 / 1,
    wRatio: 1,
    hRatio: 1,
    category: 'square',
  },

  // Custom
  {
    id: 'custom',
    name: 'Custom Ratio',
    ratio: 1,
    wRatio: 1,
    hRatio: 1,
    category: 'custom',
  },
];

export function getAspectRatioValue(
  presetId: string,
  customW: number,
  customH: number
): number {
  if (presetId === 'custom') {
    const w = Math.max(0.1, customW || 1);
    const h = Math.max(0.1, customH || 1);
    return w / h;
  }
  const found = ASPECT_RATIO_PRESETS.find(p => p.id === presetId);
  return found ? found.ratio : 1;
}
