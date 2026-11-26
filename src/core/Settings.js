// Persistent user settings (localStorage).
import { GAME_CONFIG } from '../config/gameConfig.js';
import { MOUSE_SETTINGS } from '../config/controlsConfig.js';
import { clamp } from './utils/math.js';
import { normalizeMapId } from '../config/maps/index.js';

const DEFAULTS = {
  mouseSensitivity: MOUSE_SETTINGS.defaultSensitivity,
  invertY: false,
  volume: 0.7,
  quality: 'auto', // auto | high | medium | low
  showFps: false,
  crouchToggle: false,
  mapId: 'ile',
};

export class Settings {
  constructor(events) {
    this.events = events;
    this.values = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(GAME_CONFIG.storageKeys.settings);
      if (raw) Object.assign(this.values, JSON.parse(raw));
    } catch {
      // Private mode or corrupted data: keep defaults.
    }
    this.values.mouseSensitivity = clamp(Number(this.values.mouseSensitivity) || DEFAULTS.mouseSensitivity,
      MOUSE_SETTINGS.minSensitivity, MOUSE_SETTINGS.maxSensitivity);
    this.values.volume = clamp(Number(this.values.volume), 0, 1);
    if (!['auto', 'high', 'medium', 'low'].includes(this.values.quality)) this.values.quality = 'auto';
    this.values.mapId = normalizeMapId(this.values.mapId);
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    this.values[key] = value;
    try {
      localStorage.setItem(GAME_CONFIG.storageKeys.settings, JSON.stringify(this.values));
    } catch {
      // Storage unavailable: setting still applies for this session.
    }
    this.events.emit('settings:changed', { key, value });
  }
}
