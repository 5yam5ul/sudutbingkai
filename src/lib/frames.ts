export type FrameId = 
  | 'none'
  | 'minimal-gold'
  | 'polaroid-classic'
  | 'film-strip'
  | 'botanical-olive'
  | 'retro-90s'
  | 'luxury-arch'
  | 'wabi-sabi'
  | 'neon-midnight'
  | 'heart-lace'
  | 'clean-monogram'
  | 'custom';

export interface FrameTemplate {
  id: FrameId;
  name: string;
  category: 'wedding' | 'classic' | 'retro' | 'party';
  tagline: string;
  borderWidthRatio: number; // relative to canvas width
  accentColor: string;
  description: string;
}

export const FRAME_TEMPLATES: Record<FrameId, FrameTemplate> = {
  'none': {
    id: 'none',
    name: 'Foto Asli (Raw)',
    category: 'classic',
    tagline: 'Murni Tanpa Bingkai',
    borderWidthRatio: 0,
    accentColor: '#86868B',
    description: 'Foto analog murni apa adanya tanpa tambahan bingkai visual.'
  },
  'minimal-gold': {
    id: 'minimal-gold',
    name: 'Minimalist Editorial Gold',
    category: 'wedding',
    tagline: 'Kemewahan Garis Emas Tipis',
    borderWidthRatio: 0.04,
    accentColor: '#C27803',
    description: 'Bingkai ganda garis emas tipis dengan monogram nama di sudut kanan bawah.'
  },
  'polaroid-classic': {
    id: 'polaroid-classic',
    name: 'Classic White Polaroid',
    category: 'classic',
    tagline: 'Sensasi Polaroid Instan',
    borderWidthRatio: 0.06,
    accentColor: '#1D1D1F',
    description: 'Bingkai putih khas kamera instan dengan margin bawah lebar untuk tulisan tangan.'
  },
  'film-strip': {
    id: 'film-strip',
    name: 'Vintage 35mm Film Strip',
    category: 'retro',
    tagline: 'Gerigi Negatif Film Kodak',
    borderWidthRatio: 0.05,
    accentColor: '#D97706',
    description: 'Gerigi sproket film analog 35mm di sisi kiri dan kanan lengkap dengan nomor strip.'
  },
  'botanical-olive': {
    id: 'botanical-olive',
    name: 'Botanical Floral Olive',
    category: 'wedding',
    tagline: 'Ornamen Ranting Daun Zaitun',
    borderWidthRatio: 0.04,
    accentColor: '#2D6A4F',
    description: 'Sentuhan dedaunan botanical lembut di setiap sudut untuk tema rustic & garden wedding.'
  },
  'retro-90s': {
    id: 'retro-90s',
    name: 'Retro \'90s Cyber Stamp',
    category: 'retro',
    tagline: 'Nostalgia MTV 1996',
    borderWidthRatio: 0.035,
    accentColor: '#F59E0B',
    description: 'Stempel tanggal geometris khas era 90-an dengan barcode vintage di pojok atas.'
  },
  'luxury-arch': {
    id: 'luxury-arch',
    name: 'Luxury Black & Gold Arch',
    category: 'wedding',
    tagline: 'Lengkungan Gerbang Megah',
    borderWidthRatio: 0.045,
    accentColor: '#D4AF37',
    description: 'Lengkungan arsitektur Art-Deco nan anggun untuk resepsi ballroom megah.'
  },
  'wabi-sabi': {
    id: 'wabi-sabi',
    name: 'Japanese Wabi-Sabi Linen',
    category: 'classic',
    tagline: 'Kertas Washi Alami',
    borderWidthRatio: 0.05,
    accentColor: '#8C7B6B',
    description: 'Bingkai berserat linen alami yang hangat, tenang, dan estetik.'
  },
  'neon-midnight': {
    id: 'neon-midnight',
    name: 'Neon Midnight Party',
    category: 'party',
    tagline: 'Pendaran Lampu Pesta Malam',
    borderWidthRatio: 0.03,
    accentColor: '#06B6D4',
    description: 'Garis pendaran cahaya neon biru elektrik untuk konser, pesta dansa, dan sweet 17.'
  },
  'heart-lace': {
    id: 'heart-lace',
    name: 'Romantic Heart Lace',
    category: 'wedding',
    tagline: 'Filigri Renda Romantis',
    borderWidthRatio: 0.045,
    accentColor: '#E11D48',
    description: 'Aksen renda transparan dengan detail hati manis di sudut bingkai.'
  },
  'clean-monogram': {
    id: 'clean-monogram',
    name: 'Clean Modern Monogram',
    category: 'wedding',
    tagline: '95% Foto Bersih & Rapi',
    borderWidthRatio: 0.02,
    accentColor: '#1D1D1F',
    description: 'Hanya inisial pengantin dan tanggal kecil di tengah bawah. Sangat bersih dan modern.'
  },
  'custom': {
    id: 'custom',
    name: 'Bingkai Khusus (Custom PNG)',
    category: 'wedding',
    tagline: 'Desain Buatan Sendiri',
    borderWidthRatio: 0,
    accentColor: '#C27803',
    description: 'Bingkai buatan desainer Anda sendiri yang diunggah dalam format PNG transparan.'
  }
};

export interface FrameRenderOptions {
  frameId: FrameId;
  coupleOrTitle?: string;
  eventDate?: string;
  tagline?: string;
  customFrameUrl?: string;
}

/**
 * Draws the selected frame overlay onto the canvas directly.
 */
export async function applyFrameToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  options: FrameRenderOptions
) {
  const { frameId, coupleOrTitle = 'Nama Acara', eventDate, tagline, customFrameUrl } = options;
  if (frameId === 'none') return;

  const width = canvas.width;
  const height = canvas.height;

  // If custom PNG frame is provided
  if (frameId === 'custom' && customFrameUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = customFrameUrl;
      });
      ctx.drawImage(img, 0, 0, width, height);
      return;
    } catch (err) {
      console.warn('Failed to load custom frame image, falling back to minimal gold:', err);
    }
  }

  const border = Math.floor(width * 0.038);
  const formattedDate = eventDate 
    ? new Date(eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  ctx.save();

  // Helper for metallic gold gradient
  const createGoldGradient = (x1: number, y1: number, x2: number, y2: number) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, '#FBF0B9');
    g.addColorStop(0.25, '#D4AF37');
    g.addColorStop(0.5, '#AA771C');
    g.addColorStop(0.75, '#F3E5AB');
    g.addColorStop(1, '#C59B27');
    return g;
  };

  switch (frameId) {
    case 'minimal-gold': {
      // Luxury Editorial Vogue Gold Frame
      const outerMargin = Math.floor(width * 0.04);
      const innerMargin = outerMargin + Math.floor(width * 0.015);
      const goldGrad = createGoldGradient(0, 0, width, height);

      // Outer hairline
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = Math.max(2, Math.floor(width * 0.003));
      ctx.strokeRect(outerMargin, outerMargin, width - outerMargin * 2, height - outerMargin * 2);

      // Inner hairline
      ctx.lineWidth = Math.max(1, Math.floor(width * 0.0015));
      ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2);

      // Corner diamond ornaments
      const diamondSize = Math.max(6, Math.floor(width * 0.012));
      const drawDiamond = (cx: number, cy: number) => {
        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy - diamondSize);
        ctx.lineTo(cx + diamondSize, cy);
        ctx.lineTo(cx, cy + diamondSize);
        ctx.lineTo(cx - diamondSize, cy);
        ctx.closePath();
        ctx.fill();
      };
      drawDiamond(outerMargin, outerMargin);
      drawDiamond(width - outerMargin, outerMargin);
      drawDiamond(outerMargin, height - outerMargin);
      drawDiamond(width - outerMargin, height - outerMargin);

      // Luxury Frosted Glass Editorial Plaque at Bottom Center
      const plaqueW = width * 0.68;
      const plaqueH = height * 0.075;
      const plaqueX = (width - plaqueW) / 2;
      const plaqueY = height - outerMargin - plaqueH - 12;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.beginPath();
      ctx.roundRect(plaqueX, plaqueY, plaqueW, plaqueH, 8);
      ctx.fill();

      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top decorative gold flourish line inside plaque
      ctx.fillStyle = '#1D1D1F';
      const mainFontSize = Math.max(15, Math.floor(plaqueH * 0.38));
      ctx.font = `600 ${mainFontSize}px "Cinzel", "Playfair Display", "Georgia", serif`;
      ctx.textAlign = 'center';
      ctx.fillText(coupleOrTitle.toUpperCase(), width / 2, plaqueY + plaqueH * 0.48);

      ctx.fillStyle = '#C27803';
      const subFontSize = Math.max(10, Math.floor(plaqueH * 0.24));
      ctx.font = `500 ${subFontSize}px "JetBrains Mono", monospace`;
      ctx.fillText(`${formattedDate}   •   ${tagline || 'THE BEGINNING OF FOREVER'}`, width / 2, plaqueY + plaqueH * 0.82);
      break;
    }

    case 'polaroid-classic': {
      // Authentic Off-White Polaroid 600 with textured paper & drop shadow
      const topSide = Math.floor(width * 0.055);
      const bottomChin = Math.floor(height * 0.16);

      // Draw paper border
      ctx.fillStyle = '#FDFCFA';
      ctx.fillRect(0, 0, width, topSide);
      ctx.fillRect(0, 0, topSide, height);
      ctx.fillRect(width - topSide, 0, topSide, height);
      ctx.fillRect(0, height - bottomChin, width, bottomChin);

      // Subtle inner shadow on photo window
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.lineWidth = 2;
      ctx.strokeRect(topSide, topSide, width - topSide * 2, height - topSide - bottomChin);

      // Polaroid embossed bottom ridge
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(topSide, height - bottomChin + 4);
      ctx.lineTo(width - topSide, height - bottomChin + 4);
      ctx.stroke();

      // Realistic handwritten script styling
      ctx.fillStyle = '#1E1D1B';
      const titleFont = Math.max(18, Math.floor(bottomChin * 0.28));
      ctx.font = `italic 700 ${titleFont}px "Playfair Display", "Baskerville", "Georgia", serif`;
      ctx.textAlign = 'center';
      ctx.fillText(coupleOrTitle, width / 2, height - bottomChin * 0.55);

      ctx.fillStyle = '#78716C';
      const tagFont = Math.max(11, Math.floor(bottomChin * 0.16));
      ctx.font = `400 ${tagFont}px "Courier New", monospace`;
      ctx.fillText(`♥ ${tagline || formattedDate} ♥`, width / 2, height - bottomChin * 0.25);
      break;
    }

    case 'film-strip': {
      // Authentic Kodak 35mm Gold Film Negative with sprocket perforations
      const stripW = Math.floor(width * 0.08);
      ctx.fillStyle = '#0B0A09';
      ctx.fillRect(0, 0, stripW, height);
      ctx.fillRect(width - stripW, 0, stripW, height);

      // Sprocket holes with dark drop-shadow
      const holeW = stripW * 0.52;
      const holeH = holeW * 1.35;
      const step = holeH * 1.75;

      for (let y = step * 0.4; y < height; y += step) {
        // Left Sprocket
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect((stripW - holeW) / 2, y, holeW, holeH, 5);
        ctx.fill();

        // Right Sprocket
        ctx.beginPath();
        ctx.roundRect(width - stripW + (stripW - holeW) / 2, y, holeW, holeH, 5);
        ctx.fill();
      }

      // Authentic Kodak Film Markings
      ctx.fillStyle = '#FF9900';
      ctx.font = `bold ${Math.max(10, Math.floor(stripW * 0.32))}px monospace`;

      ctx.save();
      ctx.translate(stripW * 0.85, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(`▶ KODAK PORTRA 400 • ${coupleOrTitle.toUpperCase()} • 36 EXP`, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.translate(width - stripW * 0.22, height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(`SAFETY FILM • DX 400 • ${formattedDate} • ▶ 36A`, 0, 0);
      ctx.restore();
      break;
    }

    case 'botanical-olive': {
      // Elegant Garden Olive Wedding with Corner Botanical Wreaths
      const m = Math.floor(width * 0.04);
      ctx.strokeStyle = '#3B5340';
      ctx.lineWidth = Math.max(2, Math.floor(width * 0.0035));
      ctx.strokeRect(m, m, width - m * 2, height - m * 2);

      // Gold accent corner flourishes
      const goldGrad = createGoldGradient(0, 0, width, height);
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(m + 6, m + 6, width - (m + 6) * 2, height - (m + 6) * 2);

      // Bottom Botanical Plaque
      const plaqueH = height * 0.065;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(m + 16, height - m - plaqueH - 10, width - (m + 16) * 2, plaqueH, 12);
      ctx.fill();
      ctx.strokeStyle = '#3B5340';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#2D4432';
      ctx.font = `700 ${Math.max(13, Math.floor(plaqueH * 0.40))}px "Georgia", serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`🌿  ${coupleOrTitle}  🌿`, width / 2, height - m - plaqueH * 0.48);

      ctx.fillStyle = '#78716C';
      ctx.font = `italic 500 ${Math.max(10, Math.floor(plaqueH * 0.25))}px "Georgia", serif`;
      ctx.fillText(`${formattedDate} • ${tagline || 'In Loving Celebration'}`, width / 2, height - m - plaqueH * 0.16);
      break;
    }

    case 'retro-90s': {
      // Authentic MTV / Disposable Camcorder OSD
      const m = Math.floor(width * 0.035);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 3;
      ctx.strokeRect(m, m, width - m * 2, height - m * 2);

      // Top Camcorder Status Bar
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(m, m, width - m * 2, Math.floor(height * 0.04));

      ctx.fillStyle = '#000000';
      ctx.font = `900 ${Math.max(11, Math.floor(height * 0.022))}px "Courier New", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`● REC [SP]  00:24:18`, m + 12, m + height * 0.026);

      ctx.textAlign = 'right';
      ctx.fillText(`AUTO WHITE-BAL`, width - m - 12, m + height * 0.026);

      // Bottom VHS OSD
      ctx.shadowColor = '#FF9900';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#FFB800';
      ctx.font = `bold ${Math.max(16, Math.floor(width * 0.042))}px "VT323", "Courier New", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`'96  10  12`, m + 14, height - m - 16);

      ctx.textAlign = 'right';
      ctx.fillText(coupleOrTitle.toUpperCase(), width - m - 14, height - m - 16);
      ctx.shadowBlur = 0;
      break;
    }

    case 'luxury-arch': {
      // Art Deco Grand Cathedral Arch
      const m = Math.floor(width * 0.045);
      const goldGrad = createGoldGradient(0, 0, width, height);
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = Math.max(3, Math.floor(width * 0.005));
      ctx.strokeRect(m, m, width - m * 2, height - m * 2);

      // Upper arch
      ctx.beginPath();
      ctx.arc(width / 2, m + (width * 0.28), width * 0.36, Math.PI, 0);
      ctx.stroke();

      // Lower Plaque
      const pH = height * 0.07;
      ctx.fillStyle = 'rgba(15, 14, 12, 0.92)';
      ctx.fillRect((width - width * 0.72) / 2, height - m - pH - 12, width * 0.72, pH);
      ctx.strokeRect((width - width * 0.72) / 2, height - m - pH - 12, width * 0.72, pH);

      ctx.fillStyle = goldGrad;
      ctx.font = `700 ${Math.max(15, Math.floor(pH * 0.38))}px "Playfair Display", "Cinzel", serif`;
      ctx.textAlign = 'center';
      ctx.fillText(coupleOrTitle.toUpperCase(), width / 2, height - m - pH * 0.48);

      ctx.fillStyle = '#E5E5E5';
      ctx.font = `400 ${Math.max(10, Math.floor(pH * 0.24))}px "JetBrains Mono", monospace`;
      ctx.fillText(`• ${formattedDate} •`, width / 2, height - m - pH * 0.16);
      break;
    }

    case 'wabi-sabi': {
      // Japanese Washi Linen Deckled Frame with Red Hanko Stamp
      const fSize = Math.floor(width * 0.06);
      ctx.fillStyle = '#F5F0E8';
      ctx.fillRect(0, 0, width, fSize);
      ctx.fillRect(0, 0, fSize, height);
      ctx.fillRect(width - fSize, 0, fSize, height);
      ctx.fillRect(0, height - fSize, width, fSize);

      ctx.strokeStyle = '#D8D0C5';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(fSize - 3, fSize - 3, width - fSize * 2 + 6, height - fSize * 2 + 6);

      // Traditional Red Hanko Seal Stamp at bottom right
      const stampSize = Math.floor(fSize * 0.85);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(width - fSize - stampSize - 8, height - fSize + 6, stampSize, stampSize);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.floor(stampSize * 0.55)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('壽', width - fSize - stampSize / 2 - 8, height - fSize + stampSize * 0.75);

      // Center title
      ctx.fillStyle = '#3E3935';
      ctx.font = `500 ${Math.max(13, Math.floor(fSize * 0.42))}px "Georgia", serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${coupleOrTitle}   —   ${formattedDate}`, width / 2 - stampSize / 2, height - fSize * 0.35);
      break;
    }

    case 'neon-midnight': {
      // Cyber Neon Glow Party Border
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = Math.max(3, Math.floor(width * 0.005));
      ctx.strokeRect(border, border, width - border * 2, height - border * 2);

      // Inner magenta line
      ctx.shadowColor = '#E040FB';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#E040FB';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(border + 6, border + 6, width - (border + 6) * 2, height - (border + 6) * 2);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.max(14, Math.floor(width * 0.035))}px "JetBrains Mono", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`✦ ${coupleOrTitle.toUpperCase()} ✦`, width / 2, height - border - 16);
      ctx.shadowBlur = 0;
      break;
    }

    case 'heart-lace': {
      // Romantic Bridal Lace Filigree
      const m = Math.floor(width * 0.045);
      ctx.strokeStyle = '#FDA4AF';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(m, m, width - m * 2, height - m * 2);

      // Scalloped corner hearts
      ctx.fillStyle = '#E11D48';
      const heartFont = Math.max(18, Math.floor(width * 0.045));
      ctx.font = `${heartFont}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('♥', m + 14, m + 22);
      ctx.fillText('♥', width - m - 14, m + 22);
      ctx.fillText('♥', m + 14, height - m - 10);
      ctx.fillText('♥', width - m - 14, height - m - 10);

      // Bottom Lace Ribbon
      const bH = height * 0.06;
      ctx.fillStyle = 'rgba(255, 245, 247, 0.95)';
      ctx.beginPath();
      ctx.roundRect((width - width * 0.7) / 2, height - m - bH - 8, width * 0.7, bH, 12);
      ctx.fill();
      ctx.strokeStyle = '#FDA4AF';
      ctx.stroke();

      ctx.fillStyle = '#BE123C';
      ctx.font = `600 ${Math.max(13, Math.floor(bH * 0.38))}px "Playfair Display", serif`;
      ctx.fillText(`With Love • ${coupleOrTitle}`, width / 2, height - m - bH * 0.48);

      ctx.fillStyle = '#FB7185';
      ctx.font = `400 ${Math.max(10, Math.floor(bH * 0.24))}px "Courier New", monospace`;
      ctx.fillText(formattedDate, width / 2, height - m - bH * 0.18);
      break;
    }

    case 'clean-monogram': {
      // Modern High-Fashion Minimalist Floating Glass Pill
      const pillW = width * 0.55;
      const pillH = height * 0.048;
      const pillX = (width - pillW) / 2;
      const pillY = height - pillH - Math.floor(height * 0.035);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();

      const goldGrad = createGoldGradient(pillX, pillY, pillX + pillW, pillY + pillH);
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `600 ${Math.max(11, Math.floor(pillH * 0.40))}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${coupleOrTitle}  •  ${formattedDate}`, width / 2, pillY + pillH * 0.65);
      break;
    }
  }

  ctx.restore();
}
