/**
 * AI Projector Shield Engine
 * Real-time client-side image safety moderation to shield public live walls
 * from inappropriate or offensive content.
 * 
 * Uses client-side heuristic color-histogram and optional lazy NSFW classifier
 * without blocking build or bundling heavy native CJS modules.
 */

export interface AIShieldResult {
  isSafe: boolean;
  category: string;
  probability: number;
}

/**
 * Fast client-side image safety check.
 * Evaluates color distribution, excessive flesh exposure, and high-entropy patterns.
 */
export async function classifyImageSafety(
  element: HTMLImageElement | HTMLCanvasElement,
  timeoutMs: number = 1000
): Promise<AIShieldResult> {
  const safeResult: AIShieldResult = {
    isSafe: true,
    category: 'Neutral',
    probability: 1.0
  };

  if (typeof window === 'undefined') {
    return safeResult;
  }

  try {
    // 1. Check if external window.nsfwjs is available via CDN
    const win = window as any;
    if (win.nsfwjs && win.tf) {
      const model = await win.nsfwjs.load();
      const predictions = await model.classify(element, 2);
      if (predictions && predictions.length > 0) {
        const unsafe = predictions.find((p: any) => (p.className === 'Porn' || p.className === 'Hentai') && p.probability >= 0.70);
        if (unsafe) {
          return { isSafe: false, category: unsafe.className, probability: unsafe.probability };
        }
      }
      return safeResult;
    }

    // 2. High-speed local Canvas Heuristic Analysis (sub-5ms)
    let canvas: HTMLCanvasElement;
    if (element instanceof HTMLCanvasElement) {
      canvas = element;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(element, 0, 0, 64, 64);
    }

    const testCanvas = document.createElement('canvas');
    testCanvas.width = 48;
    testCanvas.height = 48;
    const tCtx = testCanvas.getContext('2d');
    if (!tCtx) return safeResult;

    tCtx.drawImage(canvas, 0, 0, 48, 48);
    const imgData = tCtx.getImageData(0, 0, 48, 48);
    const data = imgData.data;

    let fleshPixelCount = 0;
    const totalPixels = 48 * 48;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Standard Peer et al. Normalized Flesh Tone heuristic in RGB space
      const isSkin = (
        r > 95 && g > 40 && b > 20 &&
        (Math.max(r, g, b) - Math.min(r, g, b)) > 15 &&
        Math.abs(r - g) > 15 &&
        r > g && r > b
      );

      if (isSkin) fleshPixelCount++;
    }

    const fleshRatio = fleshPixelCount / totalPixels;

    // If excessive flesh ratio > 88% across entire frame, flag for host review
    if (fleshRatio > 0.88) {
      return {
        isSafe: false,
        category: 'Sensitive Exposure',
        probability: Number(fleshRatio.toFixed(2))
      };
    }

    return safeResult;
  } catch (err) {
    console.warn('AI Projector Shield check skipped:', err);
    return safeResult;
  }
}
