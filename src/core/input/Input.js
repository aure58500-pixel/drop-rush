// Unified input: keyboard (physical codes), mouse with Pointer Lock, wheel,
// and virtual inputs fed by the touch controls.
import { KEY_BINDINGS, MOUSE_BINDINGS, MOUSE_SETTINGS } from '../../config/controlsConfig.js';

function isTextField(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export class Input {
  constructor(canvas, bindings = KEY_BINDINGS) {
    this.canvas = canvas;
    this.bindings = bindings;
    this.codeToActions = new Map();
    for (const [action, codes] of Object.entries(bindings)) {
      for (const code of codes) {
        if (!this.codeToActions.has(code)) this.codeToActions.set(code, []);
        this.codeToActions.get(code).push(action);
      }
    }
    this.downCodes = new Set();
    this.mouseDown = new Set();
    this.pressed = new Set();
    this.virtualHeld = new Set();
    this.virtualMove = { x: 0, y: 0, sprint: false };
    this.look = { x: 0, y: 0 };
    this.touchLook = { x: 0, y: 0 };
    this.wheel = 0;
    this.gameActive = false; // when true, bound keys are captured (preventDefault)
    this.pointerLocked = false;
    this.onPointerLockChange = null;

    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (isTextField(e.target)) return;
      const actions = this.codeToActions.get(e.code);
      if (!actions) return;
      if (this.gameActive && e.code !== 'Escape') e.preventDefault();
      if (e.repeat) return;
      this.downCodes.add(e.code);
      for (const a of actions) this.pressed.add(a);
    });
    window.addEventListener('keyup', (e) => {
      this.downCodes.delete(e.code);
    });
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked) return;
      this.mouseDown.add(e.button);
      for (const [action, button] of Object.entries(MOUSE_BINDINGS)) {
        if (button === e.button) this.pressed.add(action);
      }
    });
    window.addEventListener('mouseup', (e) => this.mouseDown.delete(e.button));
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      const max = MOUSE_SETTINGS.maxEventMovement;
      if (Math.abs(e.movementX) > max || Math.abs(e.movementY) > max) return; // browser spike
      this.look.x += e.movementX;
      this.look.y += e.movementY;
    });
    window.addEventListener('wheel', (e) => {
      if (!this.gameActive) return;
      this.wheel += Math.sign(e.deltaY);
    }, { passive: true });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (!this.pointerLocked) this.mouseDown.clear();
      this.onPointerLockChange?.(this.pointerLocked);
    });
  }

  async requestPointerLock() {
    if (!this.canvas.requestPointerLock) return false;
    try {
      await this.canvas.requestPointerLock();
      return true;
    } catch {
      // Browsers refuse a re-lock right after Escape; the user can click again.
      return false;
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  isDown(action) {
    if (this.virtualHeld.has(action)) return true;
    const codes = this.bindings[action];
    if (codes) for (const c of codes) if (this.downCodes.has(c)) return true;
    const button = MOUSE_BINDINGS[action];
    return button !== undefined && this.mouseDown.has(button);
  }

  wasPressed(action) {
    return this.pressed.has(action);
  }

  // Move vector: x = right, y = forward, magnitude <= 1.
  getMove() {
    const vm = this.virtualMove;
    if (Math.hypot(vm.x, vm.y) > 0.01) return { x: vm.x, y: vm.y, analogSprint: vm.sprint };
    const x = (this.isDown('moveRight') ? 1 : 0) - (this.isDown('moveLeft') ? 1 : 0);
    const y = (this.isDown('moveForward') ? 1 : 0) - (this.isDown('moveBackward') ? 1 : 0);
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len, analogSprint: false };
  }

  consumeLook() {
    const out = { x: this.look.x, y: this.look.y, touchX: this.touchLook.x, touchY: this.touchLook.y };
    this.look.x = this.look.y = 0;
    this.touchLook.x = this.touchLook.y = 0;
    return out;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  // Virtual inputs (touch).
  pressVirtual(action) {
    this.virtualHeld.add(action);
    this.pressed.add(action);
  }

  releaseVirtual(action) {
    this.virtualHeld.delete(action);
  }

  tapVirtual(action) {
    this.pressed.add(action);
  }

  addTouchLook(dx, dy) {
    this.touchLook.x += dx;
    this.touchLook.y += dy;
  }

  setVirtualMove(x, y, sprint) {
    this.virtualMove.x = x;
    this.virtualMove.y = y;
    this.virtualMove.sprint = sprint;
  }

  reset() {
    this.downCodes.clear();
    this.mouseDown.clear();
    this.virtualHeld.clear();
    this.setVirtualMove(0, 0, false);
  }

  endFrame() {
    this.pressed.clear();
  }
}
