// Human readable key labels matching the user's real keyboard layout when the
// Keyboard Layout API is available (Chrome/Edge), AZERTY defaults otherwise.
import { DEFAULT_KEY_LABELS, KEY_BINDINGS } from '../../config/controlsConfig.js';

let layoutMap = null;

export async function initKeyLabels() {
  try {
    if (navigator.keyboard?.getLayoutMap) layoutMap = await navigator.keyboard.getLayoutMap();
  } catch {
    layoutMap = null;
  }
}

export function keyLabel(code) {
  const fromLayout = layoutMap?.get(code);
  if (fromLayout && code.startsWith('Key')) return fromLayout.toUpperCase();
  return DEFAULT_KEY_LABELS[code] || code.replace(/^Key|^Digit/, '');
}

export function actionLabel(action) {
  const codes = KEY_BINDINGS[action] || [];
  return codes.length ? keyLabel(codes[0]) : '';
}

export function isTouchDevice() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('touch') === '1') return true;
  if (params.get('touch') === '0') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const fine = window.matchMedia?.('(any-pointer: fine)').matches;
  return Boolean((coarse && !fine) || (navigator.maxTouchPoints > 0 && !fine));
}
