// Playable characters. The id is what is stored in localStorage and sent over
// the network; `name` is shown in the UI. Each character is a list of pieces
// built on the shared chibi base (see config/characters/kit.js).
// To add a character: create a file in config/characters/ and list it here.
import ninjaBleu from './characters/ninjaBleu.js';
import samouraiRouge from './characters/samouraiRouge.js';
import streetwearJaune from './characters/streetwearJaune.js';
import gamerViolet from './characters/gamerViolet.js';
import pirateNoir from './characters/pirateNoir.js';

export const SKINS = [ninjaBleu, samouraiRouge, streetwearJaune, gamerViolet, pirateNoir];

export const DEFAULT_SKIN_ID = 'ninja_bleu';

const BY_ID = new Map(SKINS.map((s) => [s.id, s]));

// Any unknown id (old color skins, corrupted or remote data) falls back to the default.
export function normalizeSkinId(id) {
  return typeof id === 'string' && BY_ID.has(id) ? id : DEFAULT_SKIN_ID;
}

export function getSkin(id) {
  return BY_ID.get(normalizeSkinId(id));
}
