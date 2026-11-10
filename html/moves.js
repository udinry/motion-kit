import {clamp01, lerp, ease, expoOut, cubicInOut, anticipation, overshoot, rng} from './ease.js';

export const drift = (t, dur, from = 1, to = 1.04) => lerp(from, to, clamp01(t / dur));

export const punchIn = (t, at, to = 1.12, dur = 4 / 30) => lerp(1, to, ease(t, at, dur, expoOut));

/** depth 0.3 / 0.6 / 1: returns {x, y, scale} for a layer. */
export const parallax = (t, dur, depth, travelX = -80, travelY = 0, bleed = 0.04) => {
  const k = clamp01(t / dur);
  return {x: travelX * depth * k, y: travelY * depth * k, scale: 1 + bleed * (0.5 + depth * 0.5) * (1 + k * 0.5)};
};

export const cleanText = (s) => s.replace(/[.।]+/g, '').replace(/\s+/g, ' ').trim();

export const readTime = (text, script = 'latin') => {
  const n = Array.from(text.replace(/[\s.,!?;:'"()\-]/g, '')).length;
  return script === 'devanagari' ? n / 12 + 1.2 : n / 15 + 1.0;
};

/** Per-word state for kinetic type: y in % of the line box (0 = settled), scale, key flag. Max 6 words. */
export const maskRise = (t, text, {accent = -1, start = 0, rise = 0.4, gap = 1.75 / 30, maxWords = 6} = {}) =>
  cleanText(text).split(' ').slice(0, maxWords).map((word, i) => {
    const p = ease(t, start + i * gap, rise, expoOut);
    return {word, y: (1 - p) * 110, scale: i === accent ? 1 + 0.15 * p : 1, key: i === accent, p};
  });

export const formatNumber = (n, decimals = 0, indian = false) => {
  const [int, dec] = Math.abs(n).toFixed(decimals).split('.');
  const g = indian && int.length > 3
    ? int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + int.slice(-3)
    : int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + g + (dec ? '.' + dec : '');
};

export const countUp = (t, to, {from = 0, start = 0, dur = 0.8} = {}) => lerp(from, to, ease(t, start, dur, expoOut));

/**
 * Digit roll columns. Digit columns carry `dist` (strip length in digit heights) and `offset` (digit heights
 * still to travel; 0 = settled on the char). Show digit (start + offset) % 10 at a vertical shift of frac(offset).
 */
export const digitRoll = (t, value, {start = 0, dur = 0.8, stagger = 2 / 30, loops = 1} = {}) => {
  const chars = Array.from(value);
  const total = chars.filter((c) => /\d/.test(c)).length;
  let di = 0;
  return chars.map((char) => {
    if (!/\d/.test(char)) return {char, digit: false, offset: 0, p: ease(t, start + stagger * 2, 0.2, expoOut)};
    const order = total - 1 - di++;
    const p = ease(t, start + order * stagger, dur, expoOut);
    const dist = loops * 10 + Number(char);
    return {char, digit: true, dist, offset: dist * (1 - p), p};
  });
};

/** SVG stroke reveal: returns strokeDashoffset for a path with pathLength=1. */
export const drawStroke = (t, start, dur = 0.45) => 1 - ease(t, start, dur, cubicInOut);

/** Remaps time around impacts and gives a decaying shake. Impacts ascending, in seconds. */
export const hitStop = (t, impacts, {freeze = 4 / 30, shakePx = 8, shakeDur = 8 / 30} = {}) => {
  let removed = 0, sx = 0, sy = 0, frozen = false;
  impacts.forEach((imp, idx) => {
    const d = t - imp;
    if (d >= 0 && d < freeze) frozen = true;
    removed += d >= freeze ? freeze : d >= 0 ? d : 0;
    const age = d - freeze;
    if (age >= 0 && age < shakeDur) {
      const k = 1 - age / shakeDur;
      const r = rng(idx * 977 + Math.floor(t * 30) * 31 + 7);
      sx += (r() * 2 - 1) * shakePx * k;
      sy += (r() * 2 - 1) * shakePx * k;
    }
  });
  return {t: t - removed, shake: {x: sx, y: sy}, frozen};
};

/** Camera flash opacity (one flash per reveal). */
export const flash = (t, at, dur = 5 / 30, peak = 0.92) => {
  const d = t - at;
  if (d < 0 || d > dur) return 0;
  return d === 0 ? peak : peak * (1 - expoOut(d / dur));
};

/** Spotlight band: gradient stops in percent, or null when idle. */
export const spotlight = (t, start, dur = 1.2, band = 0.28) => {
  if (t < start || t > start + dur) return null;
  const p = cubicInOut((t - start) / dur);
  const center = -band * 100 + p * (100 + band * 200);
  return {center, a: center - band * 50, b: center, c: center + band * 50};
};

export const confetti = (t, start, colors, {count = 90, duration = 3, seed = 7, width = 1080, height = 1920, mode = 'rain'} = {}) => {
  const tt = (t - start) * 30;
  if (tt < 0 || tt > duration * 30) return [];
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const delay = mode === 'rain' ? r() * 24 : r() * 4;
    const side = i % 2 === 0 ? -1 : 1;
    const x0 = mode === 'rain' ? r() * width : side < 0 ? -20 : width + 20;
    const y0 = mode === 'rain' ? -40 - r() * 200 : height * 0.82;
    const vx = mode === 'rain' ? (r() - 0.5) * 4 : -side * (14 + r() * 18);
    const vy = mode === 'rain' ? 6 + r() * 7 : -(30 + r() * 22);
    const g = mode === 'rain' ? 0.04 : 0.9;
    const w = 14 + r() * 14, h = w * (0.45 + r() * 0.4), spin = (r() - 0.5) * 24, fl = r() * Math.PI * 2;
    const color = colors[Math.floor(r() * colors.length)];
    const k = tt - delay;
    if (k < 0) continue;
    out.push({x: x0 + vx * k + Math.sin(k * 0.18 + fl) * 22, y: y0 + vy * k + 0.5 * g * k * k, w, h, rot: spin * k, flip: Math.cos(k * 0.3 + fl), color, alpha: 1 - clamp01((tt - (duration * 30 - 18)) / 18)});
  }
  return out;
};

/** Characters: squash and stretch (volume kept) from vertical speed and a landing impulse. */
export const squashStretch = (vy, landed = 0, k = 0.012) => {
  const sy = (1 + Math.min(0.35, Math.abs(vy) * k)) * (1 - 0.32 * landed);
  return {sx: 1 / Math.sqrt(sy), sy};
};

/** Anticipation, move, follow-through: dips below 0 first, overshoots past 1, settles on 1. */
export const anticipate = (t, start, dur, dip = 0.18, k = 1.2) => anticipation(clamp01((t - start) / dur), dip, k);

/** 12 fps line boil: jitter reseeded 12 times a second; index i keeps each element's own offset. */
export const boilSeed = (t, fps = 12) => Math.floor(t * fps);
export const boil = (t, i, amp = 1.5, fps = 12) => {
  const r = rng(boilSeed(t, fps) * 7919 + i * 104729);
  return {dx: (r() - 0.5) * 2 * amp, dy: (r() - 0.5) * 2 * amp};
};

export {overshoot};
