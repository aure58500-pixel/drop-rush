// Input bindings. Keys use KeyboardEvent.code (physical position), so the
// AZERTY keys Z/Q/S/D map to codes KeyW/KeyA/KeyS/KeyD. QWERTY users get W/A/S/D.
export const KEY_BINDINGS = {
  moveForward: ['KeyW', 'ArrowUp'],
  moveBackward: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  sprint: ['ShiftLeft'],
  crouch: ['ControlLeft', 'KeyC'],
  reload: ['KeyR'],
  interact: ['KeyE'],
  drop: ['KeyG'],
  build: ['KeyB'],
  rotateBuild: ['KeyX'],
  slot1: ['Digit1', 'Numpad1'],
  slot2: ['Digit2', 'Numpad2'],
  slot3: ['Digit3', 'Numpad3'],
  slot4: ['Digit4', 'Numpad4'],
  slot5: ['Digit5', 'Numpad5'],
  useItem1: ['Digit6', 'Numpad6'],
  useItem2: ['Digit7', 'Numpad7'],
  useItem3: ['Digit8', 'Numpad8'],
  useItem4: ['Digit9', 'Numpad9'],
  pause: ['Escape', 'KeyP'],
  toggleHelp: ['KeyH'],
};

export const MOUSE_BINDINGS = {
  fire: 0, // left button
  aim: 2, // right button
};

export const MOUSE_SETTINGS = {
  defaultSensitivity: 0.002, // radians per pixel
  minSensitivity: 0.0005,
  maxSensitivity: 0.006,
  maxEventMovement: 400, // ignore browser spikes larger than this (px)
};

export const TOUCH_SETTINGS = {
  lookSensitivity: 0.0055, // radians per pixel
  joystickRadius: 60,
  joystickDeadZone: 0.12,
  sprintThreshold: 0.92, // joystick deflection that triggers sprint
  minButtonSize: 56, // pixels
};

// Labels shown in the UI when the Keyboard Layout API is unavailable (AZERTY).
export const DEFAULT_KEY_LABELS = {
  KeyW: 'Z', KeyA: 'Q', KeyS: 'S', KeyD: 'D', KeyQ: 'A', KeyZ: 'W',
  KeyC: 'C', KeyR: 'R', KeyE: 'E', KeyG: 'G', KeyB: 'B', KeyX: 'X', KeyP: 'P', KeyH: 'H',
  Space: 'Espace', ShiftLeft: 'Maj gauche', ControlLeft: 'Ctrl gauche', Escape: 'Échap',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',
};
