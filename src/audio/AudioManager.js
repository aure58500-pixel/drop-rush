// Web Audio playback with a master volume. The AudioContext is created on the
// first user gesture (browser autoplay policies).
import { SOUND_DEFINITIONS } from './SoundSynth.js';

export class AudioManager {
  constructor(volume = 0.7) {
    this.volume = volume;
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      for (const [name, make] of Object.entries(SOUND_DEFINITIONS)) this.buffers.set(name, make(this.ctx));
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.master) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
  }

  play(name, { volume = 1, pitch = 1, pitchVariance = 0 } = {}) {
    if (!this.ctx || this.ctx.state !== 'running' || this.volume <= 0) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = pitch * (1 + (Math.random() * 2 - 1) * pitchVariance);
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.master);
    src.start();
  }
}
