// Combat HUD: health/shield, five weapon slots, ammo, consumables, item use
// progress, pickup prompt, hit markers, damage numbers, damage direction,
// hurt vignette, toasts and the elimination feed.
import { el, escapeHtml } from './dom.js';
import { actionLabel } from '../core/input/keyLabels.js';
import { getWeapon, WEAPON_CATEGORIES } from '../config/weapons.js';
import { CONSUMABLES, CONSUMABLE_ORDER, MAX_CONSUMABLE_STACK } from '../config/consumables.js';
import { COMBAT_CONFIG } from '../config/combatConfig.js';
import { weaponIconSvg } from '../weapons/WeaponModels.js';
import { SLOT_COUNT } from '../player/Inventory.js';

const FEED_SIZE = 5;
const FEED_TIME = 6;

export class CombatHUD {
  constructor(root, { isTouch, onSlot, onConsumable, onPickup }) {
    this.isTouch = isTouch;
    this.root = el('div', 'combat-hud hidden');
    const slotKeys = Array.from({ length: SLOT_COUNT }, (_, i) => actionLabel(`slot${i + 1}`));
    this.root.innerHTML = `
      <div class="vignette"></div>
      <div class="damage-indicator"></div>
      <div class="damage-numbers"></div>
      <div class="hitmarker"><i></i><i></i><i></i><i></i></div>
      <div class="use-progress hidden"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" class="track"/><circle cx="32" cy="32" r="27" class="bar"/></svg><span class="use-label"></span></div>
      <div class="pickup-prompt hidden">${isTouch ? '<span class="pickup-button">Ramasser</span>' : `<kbd>${actionLabel('interact')}</kbd>`}<div><strong></strong><small></small></div></div>
      <div class="toasts"></div>
      <div class="killfeed"></div>
      <div class="vitals">
        <div class="consumables">
          ${CONSUMABLE_ORDER.map((id) => {
            const c = CONSUMABLES[id];
            return `<button class="consumable" data-id="${id}" style="--c:${c.color}" aria-label="${escapeHtml(c.name)}">
              <i class="ci ${c.stat}"></i><b class="count">0</b>${isTouch ? '' : `<kbd>${actionLabel(c.key)}</kbd>`}<span>${escapeHtml(c.short)}</span>
            </button>`;
          }).join('')}
        </div>
        <div class="bar shield"><i></i><span></span></div>
        <div class="bar health"><i></i><span></span></div>
      </div>
      <div class="loadout">
        <div class="ammo-panel">
          <div class="weapon-name"></div>
          <div class="ammo"><b class="mag"></b><span class="reserve"></span></div>
          <div class="reload-bar hidden"><i></i></div>
        </div>
        <div class="slots">
          ${slotKeys.map((k, i) => `<button class="slot" data-index="${i}">${isTouch ? '' : `<kbd>${k}</kbd>`}<span class="icon"></span><small></small></button>`).join('')}
        </div>
      </div>`;
    root.appendChild(this.root);
    const q = (s) => this.root.querySelector(s);
    this.vignette = q('.vignette');
    this.indicator = q('.damage-indicator');
    this.numbers = q('.damage-numbers');
    this.hitmarkerEl = q('.hitmarker');
    this.useEl = q('.use-progress');
    this.useBar = q('.use-progress .bar');
    this.useLabel = q('.use-label');
    this.prompt = q('.pickup-prompt');
    this.toastsEl = q('.toasts');
    this.feedEl = q('.killfeed');
    this.shieldBar = q('.bar.shield');
    this.healthBar = q('.bar.health');
    this.weaponName = q('.weapon-name');
    this.mag = q('.mag');
    this.reserve = q('.reserve');
    this.reloadBar = q('.reload-bar');
    this.slotEls = [...this.root.querySelectorAll('.slot')];
    this.consumableEls = [...this.root.querySelectorAll('.consumable')];
    this.ammoPanel = q('.ammo-panel');
    this.useCircumference = 2 * Math.PI * 27;
    this.useBar.style.strokeDasharray = `${this.useCircumference}`;

    const press = (elements, fn) => elements.forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn(b);
    }));
    press(this.slotEls, (b) => onSlot?.(Number(b.dataset.index)));
    press(this.consumableEls, (b) => onConsumable?.(b.dataset.id));
    press([this.prompt], () => onPickup?.());

    this.cache = {};
    this.feed = [];
    this.indicators = [];
    this.hitTimer = 0;
    this.vignetteLevel = 0;
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }

  setBuildMode(active) {
    this.root.classList.toggle('building', active);
  }

  _set(key, value, apply) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    apply(value);
  }

  /**
   * @param {number} dt
   * @param {{loadout:object, pickup:null|{title:string, detail:string}, camYaw:number}} s
   */
  update(dt, s) {
    const { loadout } = s;
    const h = loadout.health;
    this._set('hp', Math.ceil(h.health), (v) => {
      this.healthBar.querySelector('i').style.width = `${(v / h.maxHealth) * 100}%`;
      this.healthBar.querySelector('span').textContent = `${v}`;
      this.healthBar.classList.toggle('low', v <= 30);
    });
    this._set('sh', Math.ceil(h.shield), (v) => {
      this.shieldBar.querySelector('i').style.width = `${(v / h.maxShield) * 100}%`;
      this.shieldBar.querySelector('span').textContent = `${v}`;
    });

    const inv = loadout.inventory;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const item = inv.slots[i];
      const key = item ? `${item.id}:${item.mag}:${i === inv.active}` : `empty:${i === inv.active}`;
      this._set(`slot${i}`, key, () => {
        const elx = this.slotEls[i];
        elx.classList.toggle('active', i === inv.active);
        elx.classList.toggle('empty', !item);
        if (item) {
          const w = getWeapon(item.id);
          if (elx.dataset.weapon !== item.id) {
            elx.querySelector('.icon').innerHTML = weaponIconSvg(item.id);
            elx.dataset.weapon = item.id;
            elx.style.setProperty('--cat', WEAPON_CATEGORIES[w.category]?.color || '#fff');
            elx.title = w.name;
          }
          elx.querySelector('small').textContent = `${item.mag}`;
        } else {
          elx.querySelector('.icon').innerHTML = '';
          elx.dataset.weapon = '';
          elx.querySelector('small').textContent = '';
          elx.title = '';
        }
      });
    }

    const item = inv.activeItem;
    const wc = loadout.weapon;
    if (item) {
      const w = getWeapon(item.id);
      this._set('wname', w.name, (v) => { this.weaponName.textContent = v; });
      this._set('mag', item.mag, (v) => {
        this.mag.textContent = `${v}`;
        this.mag.classList.toggle('empty', v === 0);
      });
      this._set('res', item.reserve, (v) => { this.reserve.textContent = `/ ${v}`; });
      this.ammoPanel.classList.remove('hidden');
      this.reloadBar.classList.toggle('hidden', !wc.reloading);
      if (wc.reloading) this.reloadBar.querySelector('i').style.width = `${wc.reloadProgress * 100}%`;
    } else {
      this._set('wname', 'Mains nues', (v) => { this.weaponName.textContent = v; });
      this._set('mag', '–', (v) => { this.mag.textContent = v; this.mag.classList.remove('empty'); });
      this._set('res', '', (v) => { this.reserve.textContent = v; });
      this.reloadBar.classList.add('hidden');
    }

    for (const b of this.consumableEls) {
      const n = inv.consumables[b.dataset.id];
      this._set(`c:${b.dataset.id}`, n, (v) => {
        b.querySelector('.count').textContent = `${v}`;
        b.classList.toggle('none', v === 0);
        b.classList.toggle('full', v >= MAX_CONSUMABLE_STACK);
      });
    }

    const use = loadout.use;
    this.useEl.classList.toggle('hidden', !use.active);
    if (use.active) {
      this.useBar.style.strokeDashoffset = `${this.useCircumference * (1 - use.progress)}`;
      this._set('useLabel', `${CONSUMABLES[use.current.id].name} · ${use.remaining.toFixed(1)} s`, (v) => { this.useLabel.textContent = v; });
    }

    const pk = s.pickup;
    this.prompt.classList.toggle('hidden', !pk);
    if (pk) {
      this._set('pk', `${pk.title}|${pk.detail}|${pk.disabled}`, () => {
        this.prompt.querySelector('strong').textContent = pk.title;
        this.prompt.querySelector('small').textContent = pk.detail;
        this.prompt.classList.toggle('disabled', Boolean(pk.disabled));
      });
    }

    // Hit marker, vignette, indicators, feed.
    this.hitTimer = Math.max(0, this.hitTimer - dt);
    this.hitmarkerEl.style.opacity = this.hitTimer > 0 ? `${Math.min(1, this.hitTimer / 0.12)}` : '0';
    this.vignetteLevel = Math.max(0, this.vignetteLevel - dt * 1.6);
    const lowHealth = h.health > 0 && h.health <= 30 ? 0.25 + 0.1 * Math.sin(performance.now() / 180) : 0;
    this.vignette.style.opacity = `${Math.max(this.vignetteLevel, lowHealth)}`;
    for (let i = this.indicators.length - 1; i >= 0; i--) {
      const d = this.indicators[i];
      d.life -= dt;
      if (d.life <= 0) {
        d.el.remove();
        this.indicators.splice(i, 1);
        continue;
      }
      // Rotate relative to the current camera yaw so it follows when turning.
      const rel = d.worldAngle - s.camYaw;
      d.el.style.transform = `rotate(${(-rel * 180) / Math.PI}deg)`;
      d.el.style.opacity = `${Math.min(1, d.life / 0.4)}`;
    }
    for (let i = this.feed.length - 1; i >= 0; i--) {
      this.feed[i].life -= dt;
      if (this.feed[i].life <= 0) {
        this.feed[i].el.remove();
        this.feed.splice(i, 1);
      }
    }
  }

  hitmarker({ headshot = false, kill = false } = {}) {
    this.hitTimer = 0.22;
    this.hitmarkerEl.classList.toggle('headshot', headshot);
    this.hitmarkerEl.classList.toggle('kill', kill);
  }

  damageNumber(x, y, amount, { headshot = false, shield = false } = {}) {
    const n = el('span', `dmg${headshot ? ' headshot' : ''}${shield ? ' shield' : ''}`, `${Math.round(amount)}`);
    n.style.left = `${x + (Math.random() - 0.5) * 30}px`;
    n.style.top = `${y + (Math.random() - 0.5) * 16}px`;
    this.numbers.appendChild(n);
    while (this.numbers.childElementCount > COMBAT_CONFIG.maxDamageNumbers) this.numbers.firstChild.remove();
    setTimeout(() => n.remove(), 900);
  }

  // worldAngle: direction toward the attacker, same convention as the camera yaw.
  damageFrom(worldAngle) {
    const arc = el('div', 'dmg-arc');
    this.indicator.appendChild(arc);
    this.indicators.push({ el: arc, worldAngle, life: COMBAT_CONFIG.damageIndicatorTime });
    if (this.indicators.length > 6) this.indicators.shift().el.remove();
  }

  hurt(intensity) {
    this.vignetteLevel = Math.min(0.85, this.vignetteLevel + intensity);
  }

  toast(text, tone = 'info') {
    const t = el('div', `toast ${tone}`, escapeHtml(text));
    this.toastsEl.appendChild(t);
    while (this.toastsEl.childElementCount > 3) this.toastsEl.firstChild.remove();
    setTimeout(() => t.remove(), 1800);
  }

  killfeed(html) {
    const e = el('div', 'feed-entry', html);
    this.feedEl.prepend(e);
    this.feed.push({ el: e, life: FEED_TIME });
    while (this.feed.length > FEED_SIZE) this.feed.shift().el.remove();
  }

  clearTransient() {
    this.indicators.forEach((d) => d.el.remove());
    this.indicators = [];
    this.vignetteLevel = 0;
    this.numbers.innerHTML = '';
  }
}
