import { FilmPreset, FilmPresetId } from './types';

export const FILM_PRESETS: Record<FilmPresetId, FilmPreset> = {
  portra: {
    id: 'portra',
    name: 'Kodak Portra 400',
    tagline: 'Warm Soft Skin Tones',
    badge: 'WEDDING FAVORITE',
    description: 'Tone hangat lembut dengan kontras halus, favorit fotografer pernikahan dunia.',
    accentColor: '#e0a96d',
    iso: 'ISO 400'
  },
  funsaver: {
    id: 'funsaver',
    name: 'Kodak FunSaver',
    tagline: '90s Golden Nostalgia',
    badge: 'DISPO CLASSIC',
    description: 'Karakter kamera sekali pakai tahun 90-an dengan saturasi ceria dan vignette hangat.',
    accentColor: '#f59e0b',
    iso: 'ISO 400'
  },
  quicksnap: {
    id: 'quicksnap',
    name: 'Fuji QuickSnap',
    tagline: 'Cool Green & Vivid Cyan',
    badge: 'VIBRANT PARTY',
    description: 'Tone kehijauan khas film Fuji yang segar dengan kontras dinamis untuk pesta.',
    accentColor: '#10b981',
    iso: 'ISO 400'
  },
  ektar: {
    id: 'ektar',
    name: 'Kodak Ektar 100',
    tagline: 'Ultra Vivid & High Contrast',
    badge: 'RICH COLORS',
    description: 'Ketajaman tinggi dengan saturasi pekat untuk menangkap warna dekorasi megah.',
    accentColor: '#f97316',
    iso: 'ISO 100'
  },
  cinestill: {
    id: 'cinestill',
    name: 'CineStill 800T',
    tagline: 'Cinematic Tungsten & Halation',
    badge: 'NIGHT PARTY',
    description: 'Nuansa sinematik malam hari dengan bayangan kebiruan dan pendaran lampu lembut.',
    accentColor: '#38bdf8',
    iso: 'ISO 800T'
  },
  ilford: {
    id: 'ilford',
    name: 'Ilford HP5 Plus',
    tagline: 'Classic Monochrome & Heavy Grain',
    badge: 'TIMELESS B&W',
    description: 'Hitam putih dramatis dengan tekstur butiran film kaya yang abadi dan artistik.',
    accentColor: '#9ca3af',
    iso: 'ISO 400'
  },
  agfa: {
    id: 'agfa',
    name: 'Agfa Vista 200',
    tagline: 'Warm European Pastel & Dreamy Sun',
    badge: 'SUMMER RETRO',
    description: 'Warna pastel hangat dengan kontras lembut, nuansa liburan musim panas Eropa yang dreamy.',
    accentColor: '#f472b6',
    iso: 'ISO 200'
  },
  trix: {
    id: 'trix',
    name: 'Kodak Tri-X 400',
    tagline: 'Moody Gritty Contrast Monochrome',
    badge: 'DRAMATIC B&W',
    description: 'Hitam-putih legendaris dengan butiran kasar pekat dan bayangan dalam yang sangat ekspresif.',
    accentColor: '#4b5563',
    iso: 'ISO 400'
  }
};

/**
 * Apply analog film color curves, grain, vignette, and classic '90s date stamp
 */
export function applyAnalogFilterToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  presetId: FilmPresetId,
  showDateStamp: boolean = true
) {
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  switch (presetId) {
    case 'portra': {
      // Soft warm highlights, creamy skin tones, subtle organic 35mm grain
      const grain = 9;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] * 1.05 + 6;
        let g = data[i + 1] * 1.02 + 3;
        let b = data[i + 2] * 0.95;
        const gN = (Math.random() - 0.5) * grain;
        data[i] = Math.min(255, Math.max(0, r + gN));
        data[i + 1] = Math.min(255, Math.max(0, g + gN));
        data[i + 2] = Math.min(255, Math.max(0, b + gN));
      }
      ctx.putImageData(imgData, 0, 0);

      // Subtle warm vignette
      const grad = ctx.createRadialGradient(width/2, height/2, width*0.35, width/2, height/2, width*0.75);
      grad.addColorStop(0, 'rgba(255,245,230,0.02)');
      grad.addColorStop(1, 'rgba(30,15,5,0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'funsaver': {
      // Classic 90s disposable: yellow-amber cast, punchy contrast, balanced nostalgic grain
      const grain = 13;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] * 1.08 + 10;
        let g = data[i + 1] * 1.02 + 5;
        let b = data[i + 2] * 0.90 - 2;
        const gN = (Math.random() - 0.5) * grain;
        data[i] = Math.min(255, Math.max(0, r + gN));
        data[i + 1] = Math.min(255, Math.max(0, g + gN));
        data[i + 2] = Math.min(255, Math.max(0, b + gN));
      }
      ctx.putImageData(imgData, 0, 0);

      const grad = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.78);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(20,10,0,0.28)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'quicksnap': {
      // Fuji greens & cyan, snappy crisp contrast
      const grain = 11;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] * 0.95;
        let g = data[i + 1] * 1.08 + 5;
        let b = data[i + 2] * 1.04 + 6;
        // Contrast curve
        r = ((r / 255 - 0.5) * 1.10 + 0.5) * 255;
        g = ((g / 255 - 0.5) * 1.10 + 0.5) * 255;
        b = ((b / 255 - 0.5) * 1.10 + 0.5) * 255;
        const gN = (Math.random() - 0.5) * grain;
        data[i] = Math.min(255, Math.max(0, r + gN));
        data[i + 1] = Math.min(255, Math.max(0, g + gN));
        data[i + 2] = Math.min(255, Math.max(0, b + gN));
      }
      ctx.putImageData(imgData, 0, 0);

      const grad = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,25,15,0.24)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'ektar': {
      // Ultra fine grain, high saturation & high contrast
      const grain = 8;
      for (let i = 0; i < data.length; i += 4) {
        let r = ((data[i] / 255 - 0.5) * 1.18 + 0.5) * 255 * 1.08;
        let g = ((data[i + 1] / 255 - 0.5) * 1.15 + 0.5) * 255 * 1.02;
        let b = ((data[i + 2] / 255 - 0.5) * 1.12 + 0.5) * 255 * 0.96;
        const gN = (Math.random() - 0.5) * grain;
        data[i] = Math.min(255, Math.max(0, r + gN));
        data[i + 1] = Math.min(255, Math.max(0, g + gN));
        data[i + 2] = Math.min(255, Math.max(0, b + gN));
      }
      ctx.putImageData(imgData, 0, 0);

      const grad = ctx.createRadialGradient(width/2, height/2, width*0.35, width/2, height/2, width*0.76);
      grad.addColorStop(0, 'rgba(255,180,0,0.02)');
      grad.addColorStop(1, 'rgba(35,10,0,0.28)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'cinestill': {
      // Tungsten cool look with warm halation
      const grain = 10;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] * 0.94;
        let g = data[i + 1] * 1.02 + 3;
        let b = data[i + 2] * 1.12 + 10;
        const gN = (Math.random() - 0.5) * grain;
        data[i] = Math.min(255, Math.max(0, r + gN));
        data[i + 1] = Math.min(255, Math.max(0, g + gN));
        data[i + 2] = Math.min(255, Math.max(0, b + gN));
      }
      ctx.putImageData(imgData, 0, 0);

      const grad = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.75);
      grad.addColorStop(0, 'rgba(255,80,0,0.04)');
      grad.addColorStop(1, 'rgba(0,15,35,0.32)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'ilford': {
      // True monochrome classic film with fine silver grain
      const grain = 15;
      for (let i = 0; i < data.length; i += 4) {
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray = ((gray / 255 - 0.5) * 1.20 + 0.5) * 255;
        const gN = (Math.random() - 0.5) * grain;
        const val = Math.min(255, Math.max(0, gray + gN));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);

      const grad = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.36)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'agfa': {
      // Warm European pastel: soft highlights, gentle film grain
      const grain = 9;
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] * 1.06 + 8;
        let g = data[i + 1] * 1.02 + 4;
        let b = data[i + 2] * 0.98 + 2;
        const gN = (Math.random() - 0.5) * grain;
        data[i] = Math.min(255, Math.max(0, r + gN));
        data[i + 1] = Math.min(255, Math.max(0, g + gN));
        data[i + 2] = Math.min(255, Math.max(0, b + gN));
      }
      ctx.putImageData(imgData, 0, 0);

      const grad = ctx.createRadialGradient(width/2, height/2, width*0.35, width/2, height/2, width*0.8);
      grad.addColorStop(0, 'rgba(255,230,240,0.03)');
      grad.addColorStop(1, 'rgba(60,20,30,0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'trix': {
      // Moody street B&W: deep contrast, rich classic grain
      const grain = 20;
      for (let i = 0; i < data.length; i += 4) {
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray = ((gray / 255 - 0.5) * 1.35 + 0.5) * 255;
        const gN = (Math.random() - 0.5) * grain;
        const val = Math.min(255, Math.max(0, gray + gN));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);

      const grad = ctx.createRadialGradient(width/2, height/2, width*0.25, width/2, height/2, width*0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.60)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }
  }

  // 90s Orange Glowing Timestamp
  if (showDateStamp) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = `'${yy} ${mm} ${dd}`;

    const fontSize = Math.max(34, Math.floor(width * 0.042));
    ctx.font = `bold ${fontSize}px "VT323", "Courier New", monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const paddingX = width * 0.05;
    const paddingY = height * 0.04;

    ctx.shadowColor = '#ff6b08';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff9900';

    ctx.fillText(dateStr, width - paddingX, height - paddingY);
    ctx.fillText(timeStr, width - paddingX, height - paddingY - (fontSize * 1.05));

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}
