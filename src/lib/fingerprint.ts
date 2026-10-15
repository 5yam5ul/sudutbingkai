/**
 * Client-side deterministic device fingerprinting.
 * Generates a stable hardware & canvas signature to enforce fair photo quotas
 * even if a guest switches to incognito mode or clears browser cookies.
 */

function fnv1a(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function getCanvasSignature(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'nocanvas';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', sans-serif";
    ctx.fillStyle = '#C27803';
    ctx.fillRect(10, 10, 80, 20);

    ctx.fillStyle = '#1D1D1F';
    ctx.fillText('SudutBingkai•Camera', 15, 15);

    ctx.strokeStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(120, 25, 12, 0, Math.PI * 2);
    ctx.stroke();

    return fnv1a(canvas.toDataURL());
  } catch {
    return 'canvaserr';
  }
}

export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';

  try {
    // 1. Check if persistent ID exists in standard storage
    const stored = localStorage.getItem('sb_device_fp');
    const canvasSig = getCanvasSignature();
    const screenSig = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
    const navSig = `${navigator.userAgent || ''}-${navigator.language || ''}-${navigator.hardwareConcurrency || 1}`;

    const rawSignature = `${canvasSig}::${screenSig}::${navSig}`;
    const hardwareHash = fnv1a(rawSignature);
    const combinedId = `dev_${hardwareHash}`;

    if (!stored) {
      try {
        localStorage.setItem('sb_device_fp', combinedId);
      } catch {}
    }

    return combinedId;
  } catch {
    return 'dev_unknown';
  }
}

/**
 * Detects if the current browser window is running inside an in-app webview
 * (such as Instagram, TikTok, Facebook, WhatsApp, or Line browser).
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  return (
    ua.includes('instagram') ||
    ua.includes('fbav') ||
    ua.includes('fban') ||
    ua.includes('bytedance') ||
    ua.includes('musical_ly') ||
    ua.includes('tiktok') ||
    ua.includes('line') ||
    ua.includes('micromessenger') ||
    ua.includes('wechat')
  );
}
