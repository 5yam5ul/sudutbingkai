/**
 * Photostrip Generator Engine (Korean Photobooth / Life Four Cuts)
 * Merges 4 selected photos into a high-resolution 2x6 inch vertical photo strip canvas.
 */

export interface PhotostripOptions {
  photos: string[]; // 4 image URLs or base64 data URLs
  eventTitle: string;
  coupleOrHost?: string;
  dateStr?: string;
  theme?: 'cream' | 'dark' | 'kraft' | 'amber';
  watermark?: string;
}

export async function generatePhotostripCanvas(options: PhotostripOptions): Promise<HTMLCanvasElement> {
  const {
    photos,
    eventTitle,
    coupleOrHost,
    dateStr,
    theme = 'cream',
    watermark = 'SUDUTBINGKAI • ANALOG MEMORIES'
  } = options;

  if (photos.length === 0) {
    throw new Error('Minimal 1 foto diperlukan untuk membuat photostrip');
  }

  // Target standard 2x6 inch strip at high print resolution (1200 x 3600 px)
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 3600;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Theme palettes
  const palettes = {
    cream: {
      bg: '#FBFBFA',
      photoBorder: '#FFFFFF',
      textPrimary: '#1D1D1F',
      textSecondary: '#86868B',
      accent: '#C27803',
      shadow: 'rgba(0, 0, 0, 0.08)'
    },
    dark: {
      bg: '#181715',
      photoBorder: '#262420',
      textPrimary: '#FFFFFF',
      textSecondary: '#A1A1A6',
      accent: '#F59E0B',
      shadow: 'rgba(0, 0, 0, 0.45)'
    },
    kraft: {
      bg: '#ECE5D8',
      photoBorder: '#F9F7F3',
      textPrimary: '#2B2319',
      textSecondary: '#7A6E5F',
      accent: '#8C5311',
      shadow: 'rgba(50, 35, 20, 0.12)'
    },
    amber: {
      bg: '#FFF8EE',
      photoBorder: '#FFFFFF',
      textPrimary: '#261805',
      textSecondary: '#9A7442',
      accent: '#C27803',
      shadow: 'rgba(194, 120, 3, 0.1)'
    }
  };

  const palette = palettes[theme] || palettes.cream;

  // 1. Draw strip background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle film grain overlay
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 120;
  grainCanvas.height = 120;
  const gCtx = grainCanvas.getContext('2d');
  if (gCtx) {
    const imgData = gCtx.createImageData(120, 120);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 12; // faint opacity
    }
    gCtx.putImageData(imgData, 0, 0);
    const pattern = ctx.createPattern(grainCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // 3. Layout geometry
  const outerMarginX = 90;
  const outerMarginTop = 110;
  const photoW = width - (outerMarginX * 2); // 1020px
  const photoH = 680; // 3:2 ratio frames
  const photoGap = 44;
  const photoRadius = 14;

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  // Helper roundRect polyfill/draw
  const drawRoundedRect = (
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };

  // Draw 4 photo frames
  const loadedImages = await Promise.allSettled(photos.slice(0, 4).map(loadImage));

  for (let i = 0; i < 4; i++) {
    const frameY = outerMarginTop + i * (photoH + photoGap);

    // Frame outer shadow
    ctx.save();
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = palette.photoBorder;
    drawRoundedRect(ctx, outerMarginX - 8, frameY - 8, photoW + 16, photoH + 16, photoRadius + 4);
    ctx.fill();
    ctx.restore();

    // Clip photo
    ctx.save();
    drawRoundedRect(ctx, outerMarginX, frameY, photoW, photoH, photoRadius);
    ctx.clip();

    const res = loadedImages[i];
    if (res && res.status === 'fulfilled') {
      const img = res.value;
      // Object-fit: cover inside photoW x photoH
      const imgAspect = img.width / img.height;
      const targetAspect = photoW / photoH;
      let drawW = photoW;
      let drawH = photoH;
      let drawX = outerMarginX;
      let drawY = frameY;

      if (imgAspect > targetAspect) {
        drawW = photoH * imgAspect;
        drawX = outerMarginX - (drawW - photoW) / 2;
      } else {
        drawH = photoW / imgAspect;
        drawY = frameY - (drawH - photoH) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // Placeholder if empty or failed
      ctx.fillStyle = '#E5E5EA';
      ctx.fillRect(outerMarginX, frameY, photoW, photoH);
      ctx.fillStyle = '#86868B';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Frame ${i + 1}`, outerMarginX + photoW / 2, frameY + photoH / 2);
    }

    ctx.restore();

    // Subtle inner stroke on photo
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, outerMarginX, frameY, photoW, photoH, photoRadius);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Footer Brand & Event Typographic Section
  const footerStartY = outerMarginTop + 4 * (photoH + photoGap) + 40;
  const centerX = width / 2;

  // Event Host / Couple Name
  if (coupleOrHost) {
    ctx.font = 'bold 44px serif';
    ctx.fillStyle = palette.textPrimary;
    ctx.textAlign = 'center';
    ctx.fillText(coupleOrHost.toUpperCase(), centerX, footerStartY + 60);
  }

  // Event Title
  ctx.font = '600 32px sans-serif';
  ctx.fillStyle = palette.accent;
  ctx.textAlign = 'center';
  ctx.fillText(eventTitle, centerX, footerStartY + 120);

  // Date and location string
  if (dateStr) {
    ctx.font = '500 26px sans-serif';
    ctx.fillStyle = palette.textSecondary;
    ctx.textAlign = 'center';
    ctx.fillText(dateStr, centerX, footerStartY + 170);
  }

  // Bottom Monogram Film Bar
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = palette.textSecondary;
  ctx.letterSpacing = '4px';
  ctx.textAlign = 'center';
  ctx.fillText(watermark, centerX, height - 90);

  return canvas;
}
