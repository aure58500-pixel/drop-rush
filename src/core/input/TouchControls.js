// Touch interface: dynamic virtual joystick (left half), drag-to-look (right
// half) and action buttons (>= 56 px). Feeds the shared Input instance.
import { TOUCH_SETTINGS } from '../../config/controlsConfig.js';

export class TouchControls {
  constructor(root, input, { onPause }) {
    this.input = input;
    this.cfg = TOUCH_SETTINGS;
    this.crouchToggled = false;
    this.aimToggled = false;
    this.joystickId = null;
    this.lookIds = new Map();

    this.el = document.createElement('div');
    this.el.className = 'touch-layer hidden';
    this.el.innerHTML = `
      <div class="touch-zone touch-zone-move"></div>
      <div class="touch-zone touch-zone-look"></div>
      <div class="joystick hidden"><div class="joystick-knob"></div></div>
      <button class="touch-btn touch-pause" data-action="pause" aria-label="Pause">❚❚</button>
      <div class="touch-buttons">
        <button class="touch-btn touch-aim" data-action="aim">Viser</button>
        <button class="touch-btn touch-crouch" data-action="crouch">Accroupir</button>
        <button class="touch-btn touch-jump" data-action="jump">Sauter</button>
      </div>`;
    root.appendChild(this.el);
    this.joystick = this.el.querySelector('.joystick');
    this.knob = this.el.querySelector('.joystick-knob');
    this.el.style.setProperty('--touch-btn-min', `${this.cfg.minButtonSize}px`);

    const moveZone = this.el.querySelector('.touch-zone-move');
    const lookZone = this.el.querySelector('.touch-zone-look');
    moveZone.addEventListener('pointerdown', (e) => this._joyStart(e));
    lookZone.addEventListener('pointerdown', (e) => this._lookStart(e));
    window.addEventListener('pointermove', (e) => this._move(e), { passive: false });
    window.addEventListener('pointerup', (e) => this._end(e));
    window.addEventListener('pointercancel', (e) => this._end(e));

    for (const btn of this.el.querySelectorAll('.touch-btn')) {
      const action = btn.dataset.action;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('active');
        if (action === 'pause') onPause();
        else if (action === 'crouch') {
          this.crouchToggled = !this.crouchToggled;
          btn.classList.toggle('toggled', this.crouchToggled);
        } else if (action === 'aim') {
          this.aimToggled = !this.aimToggled;
          btn.classList.toggle('toggled', this.aimToggled);
        } else {
          this.input.pressVirtual(action);
        }
      });
      const release = () => {
        btn.classList.remove('active');
        if (action === 'jump') this.input.releaseVirtual(action);
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    }
  }

  setVisible(visible) {
    this.el.classList.toggle('hidden', !visible);
    if (!visible) this.resetState();
  }

  resetState() {
    this.joystickId = null;
    this.lookIds.clear();
    this.joystick.classList.add('hidden');
    this.input.setVirtualMove(0, 0, false);
  }

  // Toggle states exposed to the game.
  get crouch() {
    return this.crouchToggled;
  }

  get aim() {
    return this.aimToggled;
  }

  _joyStart(e) {
    if (this.joystickId !== null) return;
    e.preventDefault();
    this.joystickId = e.pointerId;
    this.joyOrigin = { x: e.clientX, y: e.clientY };
    this.joystick.style.left = `${e.clientX}px`;
    this.joystick.style.top = `${e.clientY}px`;
    this.joystick.classList.remove('hidden');
    this._joyUpdate(e.clientX, e.clientY);
  }

  _lookStart(e) {
    e.preventDefault();
    this.lookIds.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  _move(e) {
    if (e.pointerId === this.joystickId) {
      e.preventDefault();
      this._joyUpdate(e.clientX, e.clientY);
      return;
    }
    const last = this.lookIds.get(e.pointerId);
    if (last) {
      e.preventDefault();
      this.input.addTouchLook(e.clientX - last.x, e.clientY - last.y);
      last.x = e.clientX;
      last.y = e.clientY;
    }
  }

  _joyUpdate(x, y) {
    const r = this.cfg.joystickRadius;
    let dx = x - this.joyOrigin.x;
    let dy = y - this.joyOrigin.y;
    const len = Math.hypot(dx, dy);
    if (len > r) {
      dx = (dx / len) * r;
      dy = (dy / len) * r;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    let mx = dx / r;
    let my = -dy / r;
    const mag = Math.hypot(mx, my);
    if (mag < this.cfg.joystickDeadZone) {
      mx = 0;
      my = 0;
    }
    this.input.setVirtualMove(mx, my, mag >= this.cfg.sprintThreshold);
  }

  _end(e) {
    if (e.pointerId === this.joystickId) {
      this.joystickId = null;
      this.joystick.classList.add('hidden');
      this.knob.style.transform = 'translate(0px, 0px)';
      this.input.setVirtualMove(0, 0, false);
    }
    this.lookIds.delete(e.pointerId);
  }
}
