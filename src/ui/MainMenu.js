// Home screen: logo, nickname, skin selection, training launch, settings.
import { SKINS, getSkin } from '../config/skins.js';
import { NICKNAME_MAX, validateNickname } from '../core/Profile.js';
import { el, escapeHtml } from './dom.js';
import { SettingsPanel } from './SettingsPanel.js';
import { createControlsList } from './ControlsHelp.js';

export class MainMenu {
  constructor(root, { profile, settings, isTouch, onPlay, onSkinChange, onFullscreen, onUiSound, onPreviewDrag, maps = [], mapId, onMapChange }) {
    this.profile = profile;
    this.root = el('div', 'screen main-menu');
    this.root.innerHTML = `
      <header class="menu-header">
        <div class="logo"><span>DROP</span><span>RUSH</span></div>
        <p class="tagline">Saute. Construis. Survis.</p>
      </header>
      <div class="menu-body">
        <section class="menu-card profile-card">
          <h2>Profil</h2>
          <label class="field">
            <span>Pseudo</span>
            <input type="text" class="nickname-input" maxlength="${NICKNAME_MAX}" autocomplete="off" spellcheck="false" value="${escapeHtml(profile.nickname)}">
            <small class="field-error" aria-live="polite"></small>
          </label>
          <div class="field">
            <span>Personnage <output class="skin-name"></output></span>
            <div class="skin-grid">
              ${SKINS.map((s) => `
                <button class="skin-chip" data-skin="${s.id}" title="${escapeHtml(s.name)}" aria-label="${escapeHtml(s.name)}" style="--c1:${s.ui.primary};--c2:${s.ui.secondary};--c3:${s.ui.accent}">
                  <i></i><span>${escapeHtml(s.name)}</span>
                </button>`).join('')}
            </div>
          </div>
        </section>
        <section class="menu-card play-card">
          <h2>Jouer</h2>
          <div class="field map-field">
            <span>Carte <output class="map-name"></output></span>
            <div class="map-grid">
              ${maps.map((m) => `
                <button class="map-tile" data-map="${m.id}" aria-label="${escapeHtml(m.name)}" title="${escapeHtml(m.name)}">
                  <img src="${import.meta.env?.BASE_URL ?? '/'}${m.thumbnail}" alt="" loading="lazy" onerror="this.remove()">
                  <span>${escapeHtml(m.name)}</span>
                </button>`).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-xl" data-action="play">Entraînement</button>
          <p class="hint">Sur la carte choisie : armes à essayer, mannequins, construction et zone.</p>
          <button class="btn btn-ghost" data-action="settings">Paramètres</button>
          <button class="btn btn-ghost" data-action="controls">Commandes</button>
        </section>
      </div>
      <div class="modal hidden" data-modal="settings"><div class="modal-card"><h2>Paramètres</h2><div class="modal-content"></div><button class="btn btn-primary" data-close>Fermer</button></div></div>
      <div class="modal hidden" data-modal="controls"><div class="modal-card"><h2>Commandes</h2><div class="modal-content"></div><button class="btn btn-primary" data-close>Fermer</button></div></div>
      <footer class="menu-footer">Version 0.1 · Étape 1</footer>`;
    root.appendChild(this.root);

    this.root.querySelector('[data-modal="settings"] .modal-content').appendChild(new SettingsPanel(settings, { onFullscreen }).root);
    this.root.querySelector('[data-modal="controls"] .modal-content').appendChild(createControlsList(isTouch));

    const input = this.root.querySelector('.nickname-input');
    const error = this.root.querySelector('.field-error');
    const commit = () => {
      const value = input.value.trim();
      if (value.length === 0) {
        input.value = profile.setNickname('');
        error.textContent = '';
        return true;
      }
      const message = validateNickname(value);
      error.textContent = message || '';
      if (!message) profile.setNickname(value);
      return !message;
    };
    input.addEventListener('input', () => {
      const message = input.value.trim() ? validateNickname(input.value) : null;
      error.textContent = message || '';
    });
    input.addEventListener('change', commit);

    this.root.querySelectorAll('.skin-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        onUiSound?.();
        profile.setSkin(chip.dataset.skin);
        this._highlightSkin();
        onSkinChange(chip.dataset.skin);
      });
    });
    this._highlightSkin();

    this.maps = maps;
    this.setMap(mapId);
    this.root.querySelectorAll('.map-tile').forEach((tile) => {
      tile.addEventListener('click', async () => {
        if (this.root.classList.contains('loading')) return;
        onUiSound?.();
        this.root.classList.add('loading');
        tile.classList.add('busy');
        try {
          await onMapChange?.(tile.dataset.map);
        } finally {
          this.root.classList.remove('loading');
          tile.classList.remove('busy');
        }
      });
    });

    // Drag on the free area of the screen to turn the character preview.
    let drag = null;
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target !== this.root && !e.target.closest('.menu-header')) return;
      drag = { id: e.pointerId, x: e.clientX };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      onPreviewDrag?.(e.clientX - drag.x);
      drag.x = e.clientX;
    });
    const end = (e) => {
      if (drag && e.pointerId === drag.id) drag = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    this.root.querySelector('[data-action="play"]').addEventListener('click', () => {
      onUiSound?.();
      if (commit()) onPlay();
      else input.focus();
    });
    for (const name of ['settings', 'controls']) {
      this.root.querySelector(`[data-action="${name}"]`).addEventListener('click', () => {
        onUiSound?.();
        this.root.querySelector(`[data-modal="${name}"]`).classList.remove('hidden');
      });
    }
    this.root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => {
      b.closest('.modal').classList.add('hidden');
    }));
  }

  _highlightSkin() {
    this.root.querySelectorAll('.skin-chip').forEach((c) => c.classList.toggle('selected', c.dataset.skin === this.profile.skinId));
    this.root.querySelector('.skin-name').textContent = getSkin(this.profile.skinId).name;
  }

  setMap(id) {
    this.mapId = id;
    this.root.querySelectorAll('.map-tile').forEach((t) => t.classList.toggle('selected', t.dataset.map === id));
    const m = this.maps.find((x) => x.id === id);
    this.root.querySelector('.map-name').textContent = m ? m.name : '';
  }

  // Screen rectangle (pixels) not covered by the logo or the cards.
  getFreeRect() {
    const W = this.root.clientWidth || window.innerWidth;
    const H = this.root.clientHeight || window.innerHeight;
    const header = this.root.querySelector('.menu-header').getBoundingClientRect();
    const body = this.root.querySelector('.menu-body').getBoundingClientRect();
    // Candidate A: column on the left of the cards, below the logo (wide screens).
    const left = { x0: 0, x1: Math.max(0, body.left - 10), y0: Math.min(header.bottom, H * 0.5), y1: H - 10 };
    // Candidate B: band between the logo and the cards (portrait phones).
    const band = { x0: 0, x1: W, y0: header.bottom, y1: Math.max(header.bottom + 80, body.top - 6) };
    // Keep the candidate where a standing character can be drawn the largest.
    const score = (r) => Math.min((r.y1 - r.y0) / 1.9, ((r.x1 - r.x0) * 1.4) / 1.3);
    return score(left) >= score(band) ? left : band;
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.root.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
  }
}
