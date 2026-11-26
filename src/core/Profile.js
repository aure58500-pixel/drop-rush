// Player profile (nickname + skin) stored in localStorage.
import { GAME_CONFIG } from '../config/gameConfig.js';
import { normalizeSkinId } from '../config/skins.js';

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;
const NICKNAME_PATTERN = /^[\p{L}\p{N} _.\-]+$/u;

export function generateNickname() {
  return `Joueur${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

// Returns an error message in French, or null if valid.
export function validateNickname(name) {
  const n = name.trim();
  if (n.length < NICKNAME_MIN) return `Le pseudo doit contenir au moins ${NICKNAME_MIN} caractères.`;
  if (n.length > NICKNAME_MAX) return `Le pseudo ne peut pas dépasser ${NICKNAME_MAX} caractères.`;
  if (!NICKNAME_PATTERN.test(n)) return 'Lettres, chiffres, espaces, « _ », « - » et « . » uniquement.';
  return null;
}

export class Profile {
  constructor() {
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(GAME_CONFIG.storageKeys.profile) || '{}');
    } catch {
      data = {};
    }
    this.nickname = typeof data.nickname === 'string' && !validateNickname(data.nickname) ? data.nickname.trim() : generateNickname();
    // Unknown ids (for example the old color skins) fall back to the default character.
    this.skinId = normalizeSkinId(data.skinId);
    this.save();
  }

  setNickname(name) {
    const trimmed = name.trim();
    this.nickname = trimmed.length === 0 ? generateNickname() : trimmed;
    this.save();
    return this.nickname;
  }

  setSkin(id) {
    this.skinId = normalizeSkinId(id);
    this.save();
  }

  save() {
    try {
      localStorage.setItem(GAME_CONFIG.storageKeys.profile, JSON.stringify({ nickname: this.nickname, skinId: this.skinId }));
    } catch {
      // Storage unavailable.
    }
  }
}
