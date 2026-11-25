// Home screen: logo, nickname, skin selection, training launch, settings.
import { SKINS } from '../config/skins.js';
import { NICKNAME_MAX, validateNickname } from '../core/Profile.js';
import { el, escapeHtml } from './dom.js';
import { SettingsPanel } from './SettingsPanel.js';
import { createControlsList } from './ControlsHelp.js';

export class MainMenu {
  constructor(root, { profile, settings, isTouch, onPlay, onSkinChange, onFullscreen, onUiSound }) {
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
            <span>Apparence</span>
            <div class="skin-grid">
              ${SKINS.map((s) => `
                <button class="skin-chip" data-skin="${s.id}" style="--c1:${s.colors.primary};--c2:${s.colors.secondary};--c3:${s.colors.accent}">
                  <i></i><span>${escapeHtml(s.name)}</span>
                </button>`).join('')}
            </div>
          </div>
        </section>
        <section class="menu-card play-card">
          <h2>Jouer</h2>
          <button class="btn btn-primary btn-xl" data-action="play">Entraînement</button>
          <p class="hint">Terrain d'essai : déplacements, sauts, escaliers, rampes, tunnel accroupi et bâtiments.</p>
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
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.root.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
  }
}
