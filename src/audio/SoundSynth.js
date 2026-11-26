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
  reload: (ctx) => render(ctx, 0.42, (t) => {
    const click = (t0, f) => (t > t0 ? Math.sin((t - t0) * 2 * Math.PI * f) * Math.exp(-(t - t0) * 90) : 0);
    return click(0, 1900) * 0.8 + click(0.08, 1300) + click(0.3, 2400) * 0.9;
  }, 31),
  reloadDone: (ctx) => render(ctx, 0.12, (t) => Math.sin(t * 2 * Math.PI * 2600) * Math.exp(-t * 70) + Math.sin(t * 2 * Math.PI * 700) * Math.exp(-t * 50) * 0.6, 32),
  dryFire: (ctx) => render(ctx, 0.07, (t) => Math.sin(t * 2 * Math.PI * 3100) * Math.exp(-t * 140), 33),
  equip: (ctx) => render(ctx, 0.2, (t, n, s) => lowpass(s, n, 0.4) * Math.exp(-t * 30) + Math.sin(t * 2 * Math.PI * 1600) * Math.exp(-t * 60) * 0.5, 34),
  pickup: (ctx) => render(ctx, 0.22, (t) => Math.sin(t * 2 * Math.PI * (700 + t * 2600)) * Math.exp(-t * 14), 35),
  hitmarker: (ctx) => render(ctx, 0.06, (t) => Math.sin(t * 2 * Math.PI * 2100) * Math.exp(-t * 70), 36),
  headshot: (ctx) => render(ctx, 0.28, (t) => (Math.sin(t * 2 * Math.PI * 2800) + Math.sin(t * 2 * Math.PI * 4200) * 0.5) * Math.exp(-t * 16), 37),
  kill: (ctx) => render(ctx, 0.4, (t) => Math.sin(t * 2 * Math.PI * (t < 0.1 ? 880 : 1320)) * Math.exp(-t * 7), 38),
  hurt: (ctx) => render(ctx, 0.22, (t, n, s) => lowpass(s, n, 0.2) * Math.exp(-t * 18) + Math.sin(t * 2 * Math.PI * 140) * Math.exp(-t * 20) * 0.6, 39),
  shieldBreak: (ctx) => render(ctx, 0.45, (t, n) => (n * 0.6 + Math.sin(t * 2 * Math.PI * (1800 - t * 2400))) * Math.exp(-t * 9), 40),
  healDone: (ctx) => render(ctx, 0.45, (t) => Math.sin(t * 2 * Math.PI * (t < 0.15 ? 660 : t < 0.3 ? 880 : 1100)) * Math.exp(-t * 4) * 0.7, 41),
  explosion: (ctx) => render(ctx, 1.4, (t, n, s) => {
    const boom = Math.sin(t * 2 * Math.PI * (55 - t * 25)) * Math.exp(-t * 3.5);
    const crackle = (n - s.lp2) * Math.exp(-t * 6) * 0.5;
    s.lp2 += (n - s.lp2) * 0.6;
    return boom + lowpass(s, n, 0.08) * Math.exp(-t * 2.2) * 1.4 + crackle;
  }, 42),
  impactStone: (ctx) => render(ctx, 0.12, (t, n, s) => (n - lowpass(s, n, 0.3)) * Math.exp(-t * 60), 43),
  impactWood: (ctx) => render(ctx, 0.12, (t, n, s) => Math.sin(t * 2 * Math.PI * 330) * Math.exp(-t * 45) + lowpass(s, n, 0.35) * Math.exp(-t * 60) * 0.6, 44),
  impactMetal: (ctx) => render(ctx, 0.3, (t) => (Math.sin(t * 2 * Math.PI * 2300) + Math.sin(t * 2 * Math.PI * 3550) * 0.6) * Math.exp(-t * 18), 45),
  impactDirt: (ctx) => render(ctx, 0.14, (t, n, s) => lowpass(s, n, 0.15) * Math.exp(-t * 35), 46),
  impactFlesh: (ctx) => render(ctx, 0.1, (t, n, s) => lowpass(s, n, 0.25) * Math.exp(-t * 50) + Math.sin(t * 2 * Math.PI * 210) * Math.exp(-t * 60) * 0.5, 47),
  click: (ctx) => render(ctx, 0.06, (t) => Math.sin(t * 2 * Math.PI * 1200) * Math.exp(-t * 80), 18),
  hover: (ctx) => render(ctx, 0.05, (t) => Math.sin(t * 2 * Math.PI * 900) * Math.exp(-t * 90) * 0.5, 19),
};

// Shot sound built from the `sound` parameters of a weapon config:
// a noise crack, a pitched body that drops in frequency and a low-passed tail.
// `kind: 'bow'` gives a string twang, `kind: 'rocket'` a long whoosh.
export function renderShot(ctx, p) {
  const twoPi = 2 * Math.PI;
  return render(ctx, p.duration, (t, n, s) => {
    if (p.kind === 'bow') {
      const twang = Math.sin(t * twoPi * p.body * (1 + 0.35 * Math.exp(-t * 30))) * Math.exp(-t * p.bodyDecay);
      return twang + (n - lowpass(s, n, 0.4)) * Math.exp(-t * p.crackDecay) * p.crack;
    }
    if (p.kind === 'rocket') {
      const attack = 1 - Math.exp(-t * 60);
      const whoosh = lowpass(s, n, p.lowpass + 0.25 * Math.exp(-t * 4)) * Math.exp(-t * p.tail) * attack;
      return whoosh * 1.6 + Math.sin(t * twoPi * p.body * (1 - t * 0.4)) * Math.exp(-t * p.bodyDecay) * 0.7;
    }
    const crack = n * Math.exp(-t * p.crackDecay) * p.crack;
    const body = Math.sin(t * twoPi * p.body * (1 - Math.min(0.6, t * 2.5))) * Math.exp(-t * p.bodyDecay);
    s.lp2 += (n - s.lp2) * p.lowpass;
    const tail = s.lp2 * Math.exp(-t * p.tail) * 1.3;
    return crack + body + tail;
  }, p.seed);
}
