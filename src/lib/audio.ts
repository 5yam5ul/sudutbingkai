/**
 * Web Audio API synthesizer for realistic analog camera mechanical sounds.
 * Synthesizes mechanical shutter slap + aperture spring release without external MP3 files.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('AudioContext init error:', err);
    return null;
  }
}

export function playAnalogShutterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Shutter strike click (oscillator sweep)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(860, now);
    osc1.frequency.exponentialRampToValueAtTime(110, now + 0.045);

    gain1.gain.setValueAtTime(0.75, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.05);

    // 2. Mechanical noise burst (curtain movement)
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1550, now + 0.015);
    noiseFilter.Q.setValueAtTime(3.2, now + 0.015);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, now + 0.015);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now + 0.015);
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

/**
 * Mechanical film winding ratchet sound effect (disposable camera wheel krr-krr-tik).
 */
export function playFilmWindingSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.12;

    // Series of 4 quick ratchet clicks
    for (let i = 0; i < 4; i++) {
      const clickTime = now + i * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1400 - i * 80, clickTime);
      osc.frequency.exponentialRampToValueAtTime(320, clickTime + 0.018);

      gain.gain.setValueAtTime(0.25, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.022);
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

