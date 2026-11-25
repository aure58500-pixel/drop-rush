// Applies quality presets and, in "auto" mode, steps quality down when the
// average FPS stays under the threshold (shadows, view distance, vegetation).
import { ADAPTIVE_QUALITY, QUALITY_LEVELS, QUALITY_PRESETS } from '../config/graphicsConfig.js';

export class QualityManager {
  constructor({ settings, isTouch, apply }) {
    this.settings = settings;
    this.applyCallback = apply;
    this.autoLevel = isTouch ? 'medium' : 'high';
    this.level = null;
    this.fpsAccumulator = 0;
    this.frameCount = 0;
    this.cooldown = ADAPTIVE_QUALITY.warmup;
    this.fps = 60;
    this._fpsTimer = 0;
    this._fpsFrames = 0;
  }

  get mode() {
    return this.settings.get('quality');
  }

  get preset() {
    return QUALITY_PRESETS[this.level];
  }

  refresh() {
    const level = this.mode === 'auto' ? this.autoLevel : this.mode;
    if (level === this.level) return;
    this.level = level;
    this.cooldown = ADAPTIVE_QUALITY.warmup;
    this.fpsAccumulator = 0;
    this.frameCount = 0;
    this.applyCallback(QUALITY_PRESETS[level], level);
  }

  // Call every frame; `measuring` is true only while actually playing.
  update(dt, measuring) {
    this._fpsTimer += dt;
    this._fpsFrames++;
    if (this._fpsTimer >= 0.5) {
      this.fps = this._fpsFrames / this._fpsTimer;
      this._fpsTimer = 0;
      this._fpsFrames = 0;
    }
    if (!measuring || this.mode !== 'auto') return;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    this.fpsAccumulator += dt;
    this.frameCount++;
    if (this.fpsAccumulator < ADAPTIVE_QUALITY.sampleWindow) return;
    const avg = this.frameCount / this.fpsAccumulator;
    this.fpsAccumulator = 0;
    this.frameCount = 0;
    const index = QUALITY_LEVELS.indexOf(this.autoLevel);
    if (avg < ADAPTIVE_QUALITY.fpsThreshold && index < QUALITY_LEVELS.length - 1) {
      this.autoLevel = QUALITY_LEVELS[index + 1];
      this.refresh();
      this.cooldown = ADAPTIVE_QUALITY.cooldown;
    }
  }
}
