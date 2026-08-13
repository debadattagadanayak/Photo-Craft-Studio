import { ImageItem } from '../types';

// High quality reliable sample photos with known natural sizes and orientations
export const SAMPLE_IMAGES: Omit<ImageItem, 'imgElement'>[] = [
  {
    id: 'sample-1',
    src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    name: 'Mountain Lake Sunset (Landscape)',
    width: 1200,
    height: 800,
    aspectRatio: 1.5,
    orientation: 'landscape',
  },
  {
    id: 'sample-2',
    src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
    name: 'Starry Night Peak (Portrait)',
    width: 800,
    height: 1200,
    aspectRatio: 0.667,
    orientation: 'portrait',
  },
  {
    id: 'sample-3',
    src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=80',
    name: 'Misty Forest Valley (Landscape)',
    width: 1000,
    height: 667,
    aspectRatio: 1.5,
    orientation: 'landscape',
  },
  {
    id: 'sample-4',
    src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
    name: 'Sunlight Forest (Portrait)',
    width: 800,
    height: 1200,
    aspectRatio: 0.667,
    orientation: 'portrait',
  },
  {
    id: 'sample-5',
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    name: 'Tropical Ocean Beach (Landscape)',
    width: 1000,
    height: 667,
    aspectRatio: 1.5,
    orientation: 'landscape',
  },
  {
    id: 'sample-6',
    src: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    name: 'Northern Lights Aurora (Square)',
    width: 800,
    height: 800,
    aspectRatio: 1.0,
    orientation: 'square',
  },
];
