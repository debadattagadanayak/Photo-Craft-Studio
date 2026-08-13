import { BadgeSettings, BadgeType } from '../types';

export const DEFAULT_BADGE_SETTINGS: BadgeSettings = {
  badgeType: 'winner',
  zoom: 1.0,
  panX: 0.5,
  panY: 0.5,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  participantName: '',
  subTitle: '1st Place',
  showTextOverlay: false,
  textColor: '#ffffff',
  innerRadiusPercent: 0.315,
  innerOffsetYPercent: 0.472,
  textXPercent: 0.5,
  textYPercent: 0.88,
  textSizePx: 48,
  textRotation: 0,
  outputFormat: 'png',
  exportDimension: 1080,
};

/**
 * Generates an SVG string for Winner (Gold) or Runner Up (Silver) frames.
 */
export function getBadgeFrameSvg(type: BadgeType): string {
  const isWinner = type === 'winner';
  const is3rd = type === '3rd_place';

  // Theme colors
  const primaryMain = isWinner ? '#FFD700' : is3rd ? '#CD7F32' : '#E0E0E0'; // Gold vs Bronze vs Silver
  const primaryDark = isWinner ? '#B8860B' : is3rd ? '#8B4513' : '#78909C';
  const primaryLight = isWinner ? '#FFF8DC' : is3rd ? '#FFDAB9' : '#FFFFFF';
  const accentRibbon = isWinner ? '#DAA520' : is3rd ? '#A0522D' : '#90A4AE';
  const titleText = isWinner ? 'WINNER' : is3rd ? '3RD PLACE' : 'RUNNER UP';
  const trophyIconColor = isWinner ? '#FFD700' : is3rd ? '#CD7F32' : '#CFD8DC';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <!-- Metallic Gradients -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryLight}" />
      <stop offset="30%" stop-color="${primaryMain}" />
      <stop offset="70%" stop-color="${primaryDark}" />
      <stop offset="100%" stop-color="${primaryLight}" />
    </linearGradient>

    <linearGradient id="ringBezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>

    <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#090D16" />
      <stop offset="25%" stop-color="${primaryDark}" />
      <stop offset="50%" stop-color="${primaryMain}" />
      <stop offset="75%" stop-color="${primaryDark}" />
      <stop offset="100%" stop-color="#090D16" />
    </linearGradient>

    <radialGradient id="sparkleGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${primaryLight}" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="${primaryMain}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${primaryMain}" stop-opacity="0"/>
    </radialGradient>

    <!-- Drop Shadow Filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.6"/>
    </filter>

    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Outer Bezel Ring -->
  <g filter="url(#shadow)">
    <!-- Main Outer Metallic Circle -->
    <circle cx="500" cy="472" r="375" fill="none" stroke="url(#goldGrad)" stroke-width="24" />
    <circle cx="500" cy="472" r="360" fill="none" stroke="url(#ringBezelGrad)" stroke-width="28" />
    <circle cx="500" cy="472" r="342" fill="none" stroke="url(#goldGrad)" stroke-width="10" />
    <circle cx="500" cy="472" r="315" fill="none" stroke="url(#goldGrad)" stroke-width="12" />
  </g>

  <!-- Stars along the Top Arc -->
  <g fill="url(#goldGrad)" filter="url(#shadow)">
    <!-- Central Star Top -->
    <path d="M 500,122 L 507,138 L 524,138 L 510,148 L 515,164 L 500,154 L 485,164 L 490,148 L 476,138 L 493,138 Z" transform="scale(1.2) translate(-83, -20)" />
    <path d="M 500,165 L 505,178 L 518,178 L 507,186 L 511,198 L 500,190 L 489,198 L 493,186 L 482,178 L 495,178 Z" transform="rotate(-18, 500, 472)" />
    <path d="M 500,165 L 505,178 L 518,178 L 507,186 L 511,198 L 500,190 L 489,198 L 493,186 L 482,178 L 495,178 Z" transform="rotate(18, 500, 472)" />
    <path d="M 500,165 L 505,178 L 518,178 L 507,186 L 511,198 L 500,190 L 489,198 L 493,186 L 482,178 L 495,178 Z" transform="rotate(-36, 500, 472)" />
    <path d="M 500,165 L 505,178 L 518,178 L 507,186 L 511,198 L 500,190 L 489,198 L 493,186 L 482,178 L 495,178 Z" transform="rotate(36, 500, 472)" />
    <path d="M 500,165 L 505,178 L 518,178 L 507,186 L 511,198 L 500,190 L 489,198 L 493,186 L 482,178 L 495,178 Z" transform="rotate(-54, 500, 472)" />
    <path d="M 500,165 L 505,178 L 518,178 L 507,186 L 511,198 L 500,190 L 489,198 L 493,186 L 482,178 L 495,178 Z" transform="rotate(54, 500, 472)" />
  </g>

  <!-- Crown at Top -->
  <g filter="url(#shadow)">
    <!-- Crown Base -->
    <path d="M 400,120 L 370,50 L 435,80 L 500,30 L 565,80 L 630,50 L 600,120 C 530,135 470,135 400,120 Z" fill="url(#goldGrad)" stroke="#0F172A" stroke-width="4" />
    <circle cx="370" cy="45" r="12" fill="url(#goldGrad)" />
    <circle cx="435" cy="75" r="10" fill="url(#goldGrad)" />
    <circle cx="500" cy="25" r="16" fill="url(#goldGrad)" />
    <circle cx="565" cy="75" r="10" fill="url(#goldGrad)" />
    <circle cx="630" cy="45" r="12" fill="url(#goldGrad)" />
    <!-- Crown Center Star -->
    <polygon points="500,50 505,65 520,65 508,74 512,88 500,80 488,88 492,74 480,65 495,65" fill="#FFFFFF" />
  </g>

  <!-- Side Laurel Wreath Leaves (Left and Right) -->
  <g fill="url(#goldGrad)" stroke="#1E293B" stroke-width="2" filter="url(#shadow)">
    <!-- Left Wreath Leaves -->
    <path d="M 130,220 C 100,260 80,310 70,370 C 100,350 140,320 160,280 C 145,260 135,240 130,220 Z" />
    <path d="M 100,320 C 70,370 50,430 50,500 C 80,470 120,440 140,390 C 120,360 110,340 100,320 Z" />
    <path d="M 80,440 C 60,500 50,560 60,630 C 90,590 130,550 140,490 C 120,470 100,450 80,440 Z" />
    <path d="M 90,560 C 80,630 90,690 120,750 C 140,700 170,650 170,580 C 140,570 110,565 90,560 Z" />

    <!-- Right Wreath Leaves -->
    <path d="M 870,220 C 900,260 920,310 930,370 C 900,350 860,320 840,280 C 855,260 865,240 870,220 Z" />
    <path d="M 900,320 C 930,370 950,430 950,500 C 920,470 880,440 860,390 C 880,360 890,340 900,320 Z" />
    <path d="M 920,440 C 940,500 950,560 940,630 C 910,590 870,550 860,490 C 880,470 900,450 920,440 Z" />
    <path d="M 910,560 C 920,630 910,690 880,750 C 860,700 830,650 830,580 C 860,570 890,565 910,560 Z" />
  </g>

  <!-- Bottom Ribbon Banner with Text -->
  <g filter="url(#shadow)">
    <!-- Banner Ribbon Tails -->
    <path d="M 180,820 L 120,930 L 220,900 L 260,830 Z" fill="${accentRibbon}" stroke="#0F172A" stroke-width="3" />
    <path d="M 820,820 L 880,930 L 780,900 L 740,830 Z" fill="${accentRibbon}" stroke="#0F172A" stroke-width="3" />

    <!-- Main Ribbon Bar -->
    <path d="M 200,770 C 350,740 650,740 800,770 Q 860,840 800,900 C 650,870 350,870 200,900 Q 140,840 200,770 Z" fill="url(#bannerGrad)" stroke="url(#goldGrad)" stroke-width="8" />

    <!-- Banner Inner Border -->
    <path d="M 215,782 C 350,755 650,755 785,782 C 810,835 785,888 785,888 C 650,860 350,860 215,888 C 215,888 190,835 215,782 Z" fill="none" stroke="url(#goldGrad)" stroke-dasharray="6 4" stroke-width="2" />

    <!-- 3D Text Title -->
    <text x="500" y="845" text-anchor="middle" font-family="'Impact', 'Arial Black', sans-serif" font-size="${isWinner ? '72' : '58'}" font-weight="900" letter-spacing="4" fill="url(#goldGrad)" stroke="#090D16" stroke-width="6" paint-order="stroke fill">
      ${titleText}
    </text>

    <!-- Bottom Banner Stars -->
    <g fill="url(#goldGrad)">
      <polygon points="500,865 504,874 514,874 506,880 509,889 500,883 491,889 494,880 486,874 496,874" />
      <polygon points="450,867 453,874 461,874 455,879 457,886 450,881 443,886 445,879 439,874 447,874" transform="scale(0.8) translate(110, 130)" />
      <polygon points="550,867 553,874 561,874 555,879 557,886 550,881 543,886 545,879 539,874 547,874" transform="scale(0.8) translate(135, 130)" />
    </g>
  </g>

  <!-- Bottom-Left Trophy Medallion -->
  <g filter="url(#shadow)" transform="translate(140, 750)">
    <!-- Hanging Ribbon -->
    <path d="M -15,-90 L 15,-90 L 25,0 L -25,0 Z" fill="#1E293B" stroke="url(#goldGrad)" stroke-width="3" />
    <!-- Medal Outer Ring -->
    <circle cx="0" cy="30" r="105" fill="url(#ringBezelGrad)" stroke="url(#goldGrad)" stroke-width="12" />
    <circle cx="0" cy="30" r="90" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-dasharray="4 3" />
    <circle cx="0" cy="30" r="82" fill="url(#bannerGrad)" />

    <!-- Trophy Icon in Medallion -->
    <path d="M -25,0 L 25,0 L 20,35 C 15,50 -15,50 -20,35 Z M -32,-5 C -42,-5 -42,20 -25,20 M 32,-5 C 42,-5 42,20 25,20 M -3,50 L 3,50 L 5,68 L -5,68 Z M -18,68 L 18,68 L 22,78 L -22,78 Z" fill="${trophyIconColor}" stroke="#0F172A" stroke-width="2" />
    <!-- Medallion Stars -->
    <polygon points="0,-18 3,-10 11,-10 5,-5 7,3 0,-1 -7,3 -5,-5 -11,-10 -3,-10" fill="url(#goldGrad)" />
  </g>

  <!-- Sparkle Highlights -->
  <circle cx="210" cy="200" r="30" fill="url(#sparkleGlow)" />
  <circle cx="800" cy="220" r="30" fill="url(#sparkleGlow)" />
  <circle cx="160" cy="710" r="25" fill="url(#sparkleGlow)" />
  <circle cx="270" cy="800" r="25" fill="url(#sparkleGlow)" />
</svg>`;
}

export const BADGE_FRAME_URLS = {
  winner: 'https://res.cloudinary.com/pf2i8uws/image/upload/v1786602002/winner-1.png',
  runner_up: 'https://res.cloudinary.com/pf2i8uws/image/upload/v1786602003/Runnerup-1.png',
  '3rd_place': 'https://res.cloudinary.com/pf2i8uws/image/upload/v1786602327/3rd-place-1.png',
};

/**
 * Loads the PNG badge frame from the Cloudinary URLs (with SVG fallback)
 */
export function createBadgeFrameImage(type: BadgeType): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (type === 'custom') {
      reject(new Error('Custom frame handled separately'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Cloudinary frame load failed for ${type}, falling back to vector SVG frame`);
      const svgStr = getBadgeFrameSvg(type);
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => {
        URL.revokeObjectURL(url);
        resolve(fallbackImg);
      };
      fallbackImg.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      fallbackImg.src = url;
    };

    img.src = BADGE_FRAME_URLS[type];
  });
}

/**
 * Renders the person's photo strictly clipped behind the badge ring window,
 * then draws the badge frame on top.
 */
export function renderBadgeToCanvas(
  canvas: HTMLCanvasElement,
  userImg: HTMLImageElement | null,
  settings: BadgeSettings,
  badgeFrameImg: HTMLImageElement | null
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dim = settings.exportDimension || 1080;
  canvas.width = dim;
  canvas.height = dim;

  // Clear canvas (ensures transparent PNG background outside badge)
  ctx.clearRect(0, 0, dim, dim);

  const cx = dim * 0.5;
  const cy = dim * (settings.innerOffsetYPercent || 0.472);
  const radius = dim * (settings.innerRadiusPercent || 0.315);

  // 1. DRAW PERSON'S PHOTO CLIPPED STRICTLY BEHIND THE INNER RING
  if (userImg) {
    ctx.save();

    // STRICT CLIP PATH: Ensures no part of the person is visible outside the badge ring!
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Fill background behind user photo (optional subtle neutral dark background inside hole)
    ctx.fillStyle = '#0F172A';
    ctx.fill();

    // Position and transform person's photo
    ctx.translate(cx, cy);

    if (settings.rotation) {
      ctx.rotate((settings.rotation * Math.PI) / 180);
    }

    const scaleX = settings.flipHorizontal ? -1 : 1;
    const scaleY = settings.flipVertical ? -1 : 1;
    ctx.scale(scaleX, scaleY);

    // Calculate scaling to fill the inner ring window
    const imgAR = userImg.width / userImg.height;
    let renderW = radius * 2;
    let renderH = radius * 2;

    if (imgAR > 1) {
      renderW = radius * 2 * imgAR;
    } else {
      renderH = (radius * 2) / imgAR;
    }

    // Apply zoom
    renderW *= settings.zoom;
    renderH *= settings.zoom;

    // Pan offsets
    const offsetX = (settings.panX - 0.5) * renderW;
    const offsetY = (settings.panY - 0.5) * renderH;

    const drawX = -renderW / 2 + offsetX;
    const drawY = -renderH / 2 + offsetY;

    ctx.drawImage(userImg, drawX, drawY, renderW, renderH);

    ctx.restore();
  }

  // 2. DRAW BADGE FRAME OVERLAY ON TOP
  if (badgeFrameImg) {
    ctx.drawImage(badgeFrameImg, 0, 0, dim, dim);
  }

  // 3. DRAW OPTIONAL TEXT OVERLAY (Participant Name / Subtitle)
  if (settings.showTextOverlay && settings.participantName) {
    ctx.save();

    const textX = dim * (settings.textXPercent ?? 0.5);
    const textY = dim * (settings.textYPercent ?? 0.88);
    const fontSize = Math.round((settings.textSizePx ?? 48) * (dim / 1080));

    ctx.translate(textX, textY);
    if (settings.textRotation) {
      ctx.rotate((settings.textRotation * Math.PI) / 180);
    }

    // Participant Name Overlay
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;

    // Drop shadow text effect
    ctx.fillStyle = '#000000';
    ctx.fillText(settings.participantName.toUpperCase(), 2, 2);

    ctx.fillStyle = settings.textColor || '#FFFFFF';
    ctx.fillText(settings.participantName.toUpperCase(), 0, 0);

    // Subtitle / Designation (e.g. "1ST PLACE CHAMPION")
    if (settings.subTitle) {
      const subFontSize = Math.round(fontSize * 0.55);
      const subY = Math.round(fontSize * 0.85);
      ctx.font = `bold ${subFontSize}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = '#FFD700';
      ctx.fillText(settings.subTitle.toUpperCase(), 0, subY);
    }

    ctx.restore();
  }
}
