// In-game HUD for stage 1: dynamic crosshair, movement state, map boundary
// warning, elimination overlay, performance panel and controls help.
import { el } from './dom.js';
import { createControlsList } from './ControlsHelp.js';
import { actionLabel } from '../core/input/keyLabels.js';

const STATUS_LABELS = {
  idle: 'Immobile', walk: 'Marche', sprint: 'Course', crouch: 'Accroupi', air: 'En l’air',
};

export class HUD {
  constructor(root, { isTouch }) {
    this.root = el('div', 'hud hidden');
    this.root.innerHTML = `
      <div class="crosshair"><i class="ch-top"></i><i class="ch-bottom"></i><i class="ch-left"></i><i class="ch-right"></i><b></b></div>
      <div class="hud-status"><span class="status-chip"></span><span class="water-chip hidden">Dans l’eau · -30 %</span></div>
      <div class="perf-panel hidden"></div>
      <div class="boundary-warning hidden">Limite de la carte <strong></strong></div>
      <div class="help-panel hidden"></div>
      <div class="help-hint">${isTouch ? '' : `<kbd>${actionLabel('toggleHelp')}</kbd> Commandes`}</div>
      <div class="lock-hint hidden">Cliquez pour reprendre le contrôle</div>
      <div class="elimination hidden">
        <div class="elim-card">
          <h1>Éliminé</h1>
          <p class="elim-reason"></p>
          <p class="elim-timer"></p>
        </div>
      </div>`;
    root.appendChild(this.root);
    this.q = (s) => this.root.querySelector(s);
    this.crosshair = this.q('.crosshair');
    this.statusChip = this.q('.status-chip');
    this.waterChip = this.q('.water-chip');
    this.perf = this.q('.perf-panel');
    this.boundary = this.q('.boundary-warning');
    this.help = this.q('.help-panel');
    this.help.appendChild(createControlsList(isTouch));
    this.lockHint = this.q('.lock-hint');
    this.elimination = this.q('.elimination');
    this.spread = 0;
    this._lastStatus = null;
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }

  toggleHelp() {
    this.help.classList.toggle('hidden');
  }

  setLockHint(visible) {
    this.lockHint.classList.toggle('hidden', !visible);
  }

  showElimination(reason, seconds) {
    this.elimination.classList.remove('hidden');
    this.q('.elim-reason').textContent = reason;
    this.q('.elim-timer').textContent = seconds > 0 ? `Réapparition dans ${Math.ceil(seconds)} s (entraînement)` : '';
  }

  hideElimination() {
    this.elimination.classList.add('hidden');
  }

  update(dt, { player, aiming, boundaryDistance, warningDistance, perf, spreadPx = null, crosshair = 'default' }) {
    // Crosshair gap = real weapon spread in pixels (or a movement-based gap with empty hands).
    const speed = player.controller.state.horizontalSpeed;
    let target = spreadPx;
    if (target === null) {
      target = 6 + speed * 1.6;
      if (!player.motor.grounded) target += 10;
      if (player.motor.crouched) target *= 0.7;
      if (aiming) target *= 0.5;
    }
    target = Math.max(4, Math.min(160, target));
    this.spread += (target - this.spread) * Math.min(1, dt * 18);
    if (this.crosshairKind !== crosshair) {
      this.crosshairKind = crosshair;
      this.crosshair.dataset.kind = crosshair;
    }
    this.crosshair.style.setProperty('--gap', `${this.spread.toFixed(1)}px`);
    this.crosshair.classList.toggle('aiming', aiming);

    if (player.status !== this._lastStatus) {
      this._lastStatus = player.status;
      this.statusChip.textContent = STATUS_LABELS[player.status] || '';
      this.statusChip.dataset.status = player.status;
    }
    this.waterChip.classList.toggle('hidden', !player.inWater);

    const warn = player.alive && boundaryDistance < warningDistance;
    this.boundary.classList.toggle('hidden', !warn);
    if (warn) this.boundary.querySelector('strong').textContent = `${Math.max(0, boundaryDistance).toFixed(0)} m`;

    this.perf.classList.toggle('hidden', !perf);
    if (perf) {
      const p = player.position;
      this.perf.textContent = `${perf.fps.toFixed(0)} FPS · ${perf.quality}\n`
        + `Appels de rendu : ${perf.calls} · Triangles : ${(perf.triangles / 1000).toFixed(0)} k\n`
        + `Position : ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}\n`
        + `Vitesse : ${speed.toFixed(2)} m/s`;
    }
  }
}
