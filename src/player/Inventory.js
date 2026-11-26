// Five weapon slots + stacked consumables. Pure data and rules.
import { CONSUMABLE_ORDER, MAX_CONSUMABLE_STACK } from '../config/consumables.js';
import { getWeapon } from '../config/weapons.js';

export const SLOT_COUNT = 5;

export class Inventory {
  constructor() {
    this.slots = new Array(SLOT_COUNT).fill(null);
    this.active = 0;
    this.consumables = Object.fromEntries(CONSUMABLE_ORDER.map((id) => [id, 0]));
  }

  get activeItem() {
    return this.slots[this.active];
  }

  get isFull() {
    return this.slots.every(Boolean);
  }

  clear() {
    this.slots.fill(null);
    this.active = 0;
    for (const id of CONSUMABLE_ORDER) this.consumables[id] = 0;
  }

  findWeapon(id) {
    return this.slots.findIndex((s) => s && s.id === id);
  }

  /**
   * What picking up a weapon would do, without doing it.
   * @returns {{action:'refill'|'add'|'swap'|'none', slot:number, reason?:string}}
   */
  previewWeapon(item) {
    const owned = this.findWeapon(item.id);
    if (owned >= 0) {
      const w = getWeapon(item.id);
      const s = this.slots[owned];
      return s.mag < w.magazine ? { action: 'refill', slot: owned } : { action: 'none', slot: owned, reason: 'Chargeur déjà plein' };
    }
    if (!this.slots[this.active]) return { action: 'add', slot: this.active };
    const free = this.slots.indexOf(null);
    if (free >= 0) return { action: 'add', slot: free };
    return { action: 'swap', slot: this.active };
  }

  /**
   * Picks a weapon up. Owning the same weapon refills its magazine to full capacity.
   * When the inventory is full, the active weapon is swapped (returned in `dropped`).
   */
  addWeapon(item) {
    const p = this.previewWeapon(item);
    if (p.action === 'none') return { ...p, accepted: false, dropped: null };
    if (p.action === 'refill') {
      this.slots[p.slot].mag = getWeapon(item.id).magazine;
      return { ...p, accepted: true, dropped: null };
    }
    const dropped = p.action === 'swap' ? this.slots[p.slot] : null;
    const handsWereEmpty = !this.slots[this.active];
    this.slots[p.slot] = item;
    if (handsWereEmpty || p.action === 'swap') this.active = p.slot;
    return { ...p, accepted: true, dropped };
  }

  removeActive() {
    const item = this.slots[this.active];
    this.slots[this.active] = null;
    return item;
  }

  select(index) {
    if (index < 0 || index >= SLOT_COUNT) return false;
    if (index === this.active) return false;
    this.active = index;
    return true;
  }

  // Next / previous occupied slot (wheel). Stays put if none.
  cycle(step) {
    for (let i = 1; i <= SLOT_COUNT; i++) {
      const idx = (this.active + step * i + SLOT_COUNT * SLOT_COUNT) % SLOT_COUNT;
      if (this.slots[idx]) return this.select(idx);
    }
    return false;
  }

  // Returns the number of units accepted (stack limit).
  addConsumable(id, count = 1) {
    const room = MAX_CONSUMABLE_STACK - this.consumables[id];
    const accepted = Math.max(0, Math.min(room, count));
    this.consumables[id] += accepted;
    return accepted;
  }
}
