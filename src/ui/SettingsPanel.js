// Settings form shared by the main menu and the pause menu.
import { MOUSE_SETTINGS } from '../config/controlsConfig.js';
import { el } from './dom.js';

export class SettingsPanel {
  constructor(settings, { onFullscreen } = {}) {
    this.settings = settings;
    this.root = el('div', 'settings-panel');
    const sens = settings.get('mouseSensitivity');
    this.root.innerHTML = `
      <label class="field">
        <span>Sensibilité de la souris <output data-out="sens"></output></span>
        <input type="range" data-key="mouseSensitivity" min="${MOUSE_SETTINGS.minSensitivity}" max="${MOUSE_SETTINGS.maxSensitivity}" step="0.0001" value="${sens}">
      </label>
      <label class="field">
        <span>Volume <output data-out="vol"></output></span>
        <input type="range" data-key="volume" min="0" max="1" step="0.01" value="${settings.get('volume')}">
      </label>
      <label class="field">
        <span>Qualité graphique</span>
        <select data-key="quality">
          <option value="auto">Automatique</option>
          <option value="high">Élevée</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" data-key="invertY"> Inverser l'axe vertical</label>
      <label class="check"><input type="checkbox" data-key="crouchToggle"> Accroupi en mode bascule</label>
      <label class="check"><input type="checkbox" data-key="showFps"> Afficher les performances</label>
      <button class="btn btn-ghost" data-action="fullscreen">Plein écran</button>`;
    this.sync();
    // Keep several panels (menu + pause) consistent.
    settings.events.on('settings:changed', () => this.sync());
    this.root.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      if (!key) return;
      const value = e.target.type === 'checkbox' ? e.target.checked
        : e.target.type === 'range' ? Number(e.target.value) : e.target.value;
      settings.set(key, value);
      this._updateOutputs();
    });
    this.root.querySelector('[data-action="fullscreen"]').addEventListener('click', () => onFullscreen?.());
  }

  sync() {
    const s = this.settings;
    this.root.querySelector('[data-key="mouseSensitivity"]').value = s.get('mouseSensitivity');
    this.root.querySelector('[data-key="volume"]').value = s.get('volume');
    this.root.querySelector('[data-key="quality"]').value = s.get('quality');
    for (const key of ['invertY', 'crouchToggle', 'showFps']) {
      this.root.querySelector(`[data-key="${key}"]`).checked = Boolean(s.get(key));
    }
    this._updateOutputs();
  }

  _updateOutputs() {
    const s = this.settings;
    const ratio = s.get('mouseSensitivity') / MOUSE_SETTINGS.defaultSensitivity;
    this.root.querySelector('[data-out="sens"]').textContent = `${s.get('mouseSensitivity').toFixed(4)} rad/px (×${ratio.toFixed(2)})`;
    this.root.querySelector('[data-out="vol"]').textContent = `${Math.round(s.get('volume') * 100)} %`;
  }
}
