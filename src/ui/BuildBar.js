// Build mode bar: piece slots, orientation, build counter and placement status.
import { el } from './dom.js';
import { actionLabel } from '../core/input/keyLabels.js';

const ICONS = {
  wall: '<svg viewBox="0 0 48 48"><rect x="14" y="6" width="20" height="36" rx="2" fill="currentColor"/><rect x="14" y="20" width="20" height="3" fill="rgba(0,0,0,.25)"/></svg>',
  ramp: '<svg viewBox="0 0 48 48"><path d="M6 40 L42 40 L42 8 Z" fill="currentColor"/></svg>',
  platform: '<svg viewBox="0 0 48 48"><path d="M6 22 L24 12 L42 22 L24 32 Z" fill="currentColor"/><path d="M6 22 L24 32 L24 37 L6 27 Z M42 22 L24 32 L24 37 L42 27 Z" fill="rgba(0,0,0,.28)"/></svg>',
};
const ARROWS = ['↑ Nord', '→ Est', '↓ Sud', '← Ouest'];

export class BuildBar {
  constructor(root, { isTouch, pieces, onSelect }) {
    this.pieces = pieces;
    this.root = el('div', 'build-bar hidden');
    const keys = pieces.map((_, i) => actionLabel(`slot${i + 1}`));
    this.root.innerHTML = `
      <div class="build-slots">
        ${pieces.map((p, i) => `
          <button class="build-slot" data-index="${i}" aria-label="${p.name}">
            <span class="build-icon">${ICONS[p.id] || ''}</span>
            <span class="build-name">${p.name}</span>
            ${isTouch ? '' : `<kbd>${keys[i]}</kbd>`}
          </button>`).join('')}
      </div>
      <div class="build-meta"><span class="build-rot"></span><span class="build-count"></span></div>
      <div class="build-status"></div>
      ${isTouch ? '' : `<div class="build-help">
        <span><kbd>Molette</kbd> pièce</span>
        <span><kbd>${actionLabel('rotateBuild')}</kbd> pivoter</span>
        <span><kbd>Clic gauche</kbd> poser</span>
        <span><kbd>Clic droit</kbd> annuler</span>
        <span><kbd>${actionLabel('build')}</kbd> quitter</span>
      </div>`}`;
    root.appendChild(this.root);
    this.slots = [...this.root.querySelectorAll('.build-slot')];
    this.rot = this.root.querySelector('.build-rot');
    this.count = this.root.querySelector('.build-count');
    this.status = this.root.querySelector('.build-status');
    this.slots.forEach((s) => s.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(Number(s.dataset.index));
    }));
    this._last = {};
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
  }

  update(ui) {
    if (this._last.index !== ui.pieceIndex) {
      this.slots.forEach((s, i) => s.classList.toggle('selected', i === ui.pieceIndex));
      this._last.index = ui.pieceIndex;
    }
    const rotText = ui.pieces[ui.pieceIndex].id === 'platform' ? 'Plateforme : sans orientation' : `Orientation : ${ARROWS[ui.rotation]}`;
    if (this._last.rot !== rotText) {
      this.rot.textContent = rotText;
      this._last.rot = rotText;
    }
    const countText = `Constructions ${ui.count} / ${ui.max}`;
    if (this._last.count !== countText) {
      this.count.textContent = countText;
      this.count.classList.toggle('full', ui.count >= ui.max);
      this._last.count = countText;
    }
    const statusText = ui.valid ? 'Prêt à poser' : ui.reason || '';
    if (this._last.status !== statusText || this._last.valid !== ui.valid) {
      this.status.textContent = statusText;
      this.status.classList.toggle('ok', ui.valid);
      this.status.classList.toggle('bad', !ui.valid);
      this._last.status = statusText;
      this._last.valid = ui.valid;
    }
  }
}
