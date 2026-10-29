import { Howl } from 'howler';

/**
 * Sound Effects Engine untuk Kamera Analog SudutBingkai
 * Menggunakan kombinasi Howler.js dan Web Audio API Synthesizer
 * sehingga suara mekanik kamera analog selalu berbunyi instan tanpa jeda unduhan.
 */

class CameraSoundEngine {
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private customHowlShutter: Howl | null = null;
  private customHowlWinding: Howl | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('sb_camera_muted');
      this.isMuted = storedMute === 'true';
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb_camera_muted', muted ? 'true' : 'false');
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb_camera_muted', this.isMuted ? 'true' : 'false');
    }
    return this.isMuted;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Suara 1: Shutter Klik Mekanik Kamera Analog
   * Menghasilkan suara 'clack-click' mekanikal daun rana kamera vintage
   */
  public playShutterSound(): void {
    if (this.isMuted) return;

    // Jika ada file custom Howler
    if (this.customHowlShutter) {
      this.customHowlShutter.play();
      return;
    }

    // High-fidelity Procedural Synthesis via Web Audio API (Zero Latency)
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. First click: Shutter curtain opens (sharp impulse)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      gain1.gain.setValueAtTime(0.7, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // Noise burst for mechanical texture
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);

      // 2. Second click: Shutter curtain closes & mirror return (50ms later)
      const t2 = now + 0.06;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(450, t2);
      osc2.frequency.exponentialRampToValueAtTime(80, t2 + 0.06);
      gain2.gain.setValueAtTime(0.6, t2);
      gain2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.06);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.06);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Suara 2: Penggulung Film Motor Advance (Film Winding Whirr)
   * Menghasilkan suara motor tuas film berputar ke frame berikutnya
   */
  public playFilmWindingSound(): void {
    if (this.isMuted) return;

    if (this.customHowlWinding) {
      this.customHowlWinding.play();
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.22;

      // Motor gear hum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(260, now + duration * 0.5);
      osc.frequency.exponentialRampToValueAtTime(90, now + duration);

      // Rhythmic gear clicks modulation
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      mod.frequency.setValueAtTime(28, now); // 28 clicks per second
      modGain.gain.setValueAtTime(40, now);
      mod.connect(osc.frequency);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      mod.start(now);
      osc.start(now);
      mod.stop(now + duration);
      osc.stop(now + duration);
    } catch {
      // Fallback
    }
  }

  /**
   * Suara 3: Dial click/tick saat memilih filter atau memutar kenop kamera
   */
  public playDialTick(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.015);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.015);
    } catch {
      // Fallback
    }
  }
}

export const cameraSounds = new CameraSoundEngine();
