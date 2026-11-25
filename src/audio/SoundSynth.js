// Procedurally generated sound effects (rendered once into AudioBuffers).
// Keeps the download size at zero while giving distinct sounds per surface.
import { mulberry32 } from '../core/utils/random.js';

function render(ctx, duration, fn, seed = 1) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  const rng = mulberry32(seed);
  const state = { lp: 0, lp2: 0, hp: 0, prev: 0 };
  for (let i = 0; i < length; i++) data[i] = fn(i / rate, rng() * 2 - 1, state, i / length);
  // Normalize to avoid clipping.
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0) for (let i = 0; i < length; i++) data[i] *= 0.9 / peak;
  return buffer;
}

const lowpass = (s, x, a) => (s.lp += (x - s.lp) * a);

export const SOUND_DEFINITIONS = {
  stepGrass: (ctx) => render(ctx, 0.16, (t, n, s) => lowpass(s, n, 0.18) * Math.exp(-t * 28) * (1 - Math.exp(-t * 400)), 11),
  stepStone: (ctx) => render(ctx, 0.12, (t, n, s) => {
    const body = lowpass(s, n, 0.45) * Math.exp(-t * 45);
    return body + Math.sin(t * 2 * Math.PI * 180) * Math.exp(-t * 60) * 0.4;
  }, 12),
  stepWood: (ctx) => render(ctx, 0.14, (t, n, s) => {
    const knock = Math.sin(t * 2 * Math.PI * (220 - t * 600)) * Math.exp(-t * 38);
    return knock * 0.8 + lowpass(s, n, 0.3) * Math.exp(-t * 50) * 0.5;
  }, 13),
  stepMetal: (ctx) => render(ctx, 0.25, (t, n, s) => {
    const ring = Math.sin(t * 2 * Math.PI * 820) * 0.4 + Math.sin(t * 2 * Math.PI * 1370) * 0.25;
    return (ring + lowpass(s, n, 0.5) * 0.6) * Math.exp(-t * 22);
  }, 14),
  splash: (ctx) => render(ctx, 0.35, (t, n, s) => {
    const hp = n - lowpass(s, n, 0.08);
    return hp * Math.exp(-t * 9) * (0.6 + 0.4 * Math.sin(t * 70));
  }, 15),
  jump: (ctx) => render(ctx, 0.22, (t, n, s, k) => lowpass(s, n, 0.05 + k * 0.25) * Math.sin(Math.PI * k) * 0.8, 16),
  land: (ctx) => render(ctx, 0.3, (t, n, s) => {
    const thump = Math.sin(t * 2 * Math.PI * (90 - t * 120)) * Math.exp(-t * 16);
    return thump + lowpass(s, n, 0.12) * Math.exp(-t * 25) * 0.6;
  }, 17),
  buildPlace: (ctx) => render(ctx, 0.24, (t, n, s) => {
    const thump = Math.sin(t * 2 * Math.PI * (150 - t * 220)) * Math.exp(-t * 18);
    const knock = Math.sin(t * 2 * Math.PI * 430) * Math.exp(-t * 55) * 0.5;
    return thump + knock + lowpass(s, n, 0.25) * Math.exp(-t * 40) * 0.45;
  }, 21),
  buildFail: (ctx) => render(ctx, 0.14, (t) => (Math.sin(t * 2 * Math.PI * 170) + Math.sin(t * 2 * Math.PI * 185) * 0.7) * Math.exp(-t * 26), 22),
  buildBreak: (ctx) => render(ctx, 0.5, (t, n, s) => {
    const crack = n * Math.exp(-t * 70);
    const rumble = lowpass(s, n, 0.28) * Math.exp(-t * 8) * (0.7 + 0.3 * Math.sin(t * 90));
    return crack * 0.7 + rumble;
  }, 23),
  click: (ctx) => render(ctx, 0.06, (t) => Math.sin(t * 2 * Math.PI * 1200) * Math.exp(-t * 80), 18),
  hover: (ctx) => render(ctx, 0.05, (t) => Math.sin(t * 2 * Math.PI * 900) * Math.exp(-t * 90) * 0.5, 19),
};
