// Health and shield. Damage drains the shield first, then the health.
export class Health {
  constructor({ maxHealth = 100, maxShield = 100, health = maxHealth, shield = 0 } = {}) {
    this.maxHealth = maxHealth;
    this.maxShield = maxShield;
    this.health = health;
    this.shield = shield;
  }

  get alive() {
    return this.health > 0;
  }

  reset(health = this.maxHealth, shield = 0) {
    this.health = health;
    this.shield = shield;
  }

  /** @returns {{shieldDamage:number, healthDamage:number, total:number, died:boolean, shieldBroken:boolean}} */
  applyDamage(amount) {
    const out = { shieldDamage: 0, healthDamage: 0, total: 0, died: false, shieldBroken: false };
    if (amount <= 0 || this.health <= 0) return out;
    const hadShield = this.shield > 0;
    out.shieldDamage = Math.min(this.shield, amount);
    this.shield -= out.shieldDamage;
    out.healthDamage = Math.min(this.health, amount - out.shieldDamage);
    this.health -= out.healthDamage;
    out.total = out.shieldDamage + out.healthDamage;
    out.shieldBroken = hadShield && this.shield <= 0;
    out.died = this.health <= 0;
    if (out.died) this.health = 0;
    return out;
  }

  // Adds health or shield without exceeding `cap`. Returns the amount gained.
  restore(stat, amount, cap) {
    const max = Math.min(cap, stat === 'shield' ? this.maxShield : this.maxHealth);
    const before = this[stat];
    this[stat] = Math.min(max, before + amount);
    return this[stat] - before;
  }

  canRestore(stat, cap) {
    const max = Math.min(cap, stat === 'shield' ? this.maxShield : this.maxHealth);
    return this[stat] < max;
  }
}
