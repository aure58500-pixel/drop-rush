// Pause menu: resume, settings (sensitivity, volume...), controls, quit.
import { el } from './dom.js';
import { SettingsPanel } from './SettingsPanel.js';
import { createControlsList } from './ControlsHelp.js';

export class PauseMenu {
  constructor(root, { settings, isTouch, onResume, onQuit, onFullscreen }) {
    this.root = el('div', 'screen pause-menu hidden');
    this.root.innerHTML = `
      <div class="pause-card">
        <h1>Pause</h1>
        <div class="pause-tabs">
          <button class="tab active" data-tab="settings">Paramètres</button>
          <button class="tab" data-tab="controls">Commandes</button>
        </div>
        <div class="tab-body" data-body="settings"></div>
        <div class="tab-body hidden" data-body="controls"></div>
        <div class="pause-actions">
          <button class="btn btn-primary" data-action="resume">Reprendre</button>
          <button class="btn btn-danger" data-action="quit">Quitter la partie</button>
        </div>
      </div>`;
    root.appendChild(this.root);
    this.root.querySelector('[data-body="settings"]').appendChild(new SettingsPanel(settings, { onFullscreen }).root);
    this.root.querySelector('[data-body="controls"]').appendChild(createControlsList(isTouch));
    this.root.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
      this.root.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      this.root.querySelectorAll('.tab-body').forEach((b) => b.classList.toggle('hidden', b.dataset.body !== tab.dataset.tab));
    }));
    this.root.querySelector('[data-action="resume"]').addEventListener('click', onResume);
    this.root.querySelector('[data-action="quit"]').addEventListener('click', onQuit);
  }

  get visible() {
    return !this.root.classList.contains('hidden');
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }
}
