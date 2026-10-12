/**
 * Cross-Platform 15-Second Video Guestbook Recording Engine
 * Optimized for iOS Safari & Android Chrome (auto-detects supported mimeType)
 * Includes Web Audio countdown beeper and video thumbnail extractor.
 */

export function getSupportedVideoMimeType(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return 'video/webm';
  }

  const candidateTypes = [
    'video/mp4',
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/quicktime'
  ];

  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

/**
 * Synthesizes retro camcorder countdown audio beeps using Web Audio API
 * Zero latency, 100% offline, no external audio files required.
 */
export function playCountdownBeep(isFinalBeep: boolean = false) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // 440Hz for 3, 2, 1 beeps; 880Hz for the RECORD START beep
    osc.frequency.setValueAtTime(isFinalBeep ? 880 : 520, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isFinalBeep ? 0.35 : 0.18));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isFinalBeep ? 0.35 : 0.18));
  } catch (err) {
    // Audio context may be restricted by autoplay policy before user gesture
  }
}

/**
 * Generates an image thumbnail data URL (JPEG) from a video Blob
 */
export async function generateVideoThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.7);
          resolve(thumb);
          return;
        }
      } catch (e) {}
      resolve('');
    };

    video.onerror = () => resolve('');

    // Fallback timer if video cannot seek
    setTimeout(() => resolve(''), 2000);
  });
}
