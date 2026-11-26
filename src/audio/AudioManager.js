// Web Audio playback with a master volume and simple 3D attenuation + panning.
// The AudioContext is created on the first user gesture (browser autoplay policies).
import { SOUND_DEFINITIONS, renderShot } from './SoundSynth.js';
import { WEAPONS } from '../config/weapons.js';

const MAX_DISTANCE = 140; // meters, a sound is silent beyond this
const MAX_VOICES = 48;

export class AudioManager {
  constructor(volume = 0.7) {
    this.volume = volume;
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.voices = 0;
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
      for (const w of Object.values(WEAPONS)) this.buffers.set(`shot:${w.id}`, renderShot(this.ctx, w.sound));
      this.buffers.set('shot:turret', renderShot(this.ctx, WEAPONS.pistol.sound));
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.master) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
  }

  // Camera position and yaw (yaw 0 looks toward -Z).
  setListener(x, y, z, yaw) {
    const l = this.listener;
    l.x = x; l.y = y; l.z = z; l.yaw = yaw;
  }

  /**
   * @param {string} name
   * @param {{volume?:number, pitch?:number, pitchVariance?:number, position?:{x:number,y:number,z:number}}} [o]
   */
  play(name, { volume = 1, pitch = 1, pitchVariance = 0, position = null } = {}) {
    if (!this.ctx || this.ctx.state !== 'running' || this.volume <= 0) return;
    const buffer = this.buffers.get(name);
    if (!buffer || this.voices >= MAX_VOICES) return;
    let gainValue = volume;
    let pan = 0;
    if (position) {
      const l = this.listener;
      const dx = position.x - l.x;
      const dy = position.y - l.y;
      const dz = position.z - l.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > MAX_DISTANCE) return;
      gainValue *= 1 / (1 + d * 0.06) * (1 - d / MAX_DISTANCE);
      // Right vector of the listener = (cos yaw, 0, -sin yaw).
      const right = (dx * Math.cos(l.yaw) - dz * Math.sin(l.yaw)) / Math.max(1, Math.hypot(dx, dz));
      pan = Math.max(-1, Math.min(1, right)) * 0.8;
    }
    if (!Number.isFinite(gainValue) || !Number.isFinite(pan) || gainValue < 0.005) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = pitch * (1 + (Math.random() * 2 - 1) * pitchVariance);
    const gain = this.ctx.createGain();
    gain.gain.value = gainValue;
    let node = src.connect(gain);
    if (pan !== 0 && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(this.master);
    this.voices += 1;
    src.onended = () => {
      this.voices -= 1;
    };
    src.start();
  }
}
