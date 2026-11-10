export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const expoOut = (t) => { const x = clamp01(t); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };
export const cubicOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const cubicInOut = (t) => { const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const critSpring = (t, settle = 1) => { const x = clamp01(t / settle); if (x >= 1) return 1; const w = 6.64; return 1 - (1 + w * x) * Math.exp(-w * x); };
export const overshoot = (t, k = 1.70158) => { const x = clamp01(t); return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2); };
export const anticipation = (t, dip = 0.18, k = 1.2) => {
  const x = clamp01(t), split = 0.3;
  if (x < split) return -dip * Math.sin((x / split) * Math.PI / 2);
  return -dip + (1 + dip) * overshoot((x - split) / (1 - split), k);
};
export const ease = (t, start, dur, fn = expoOut) => fn(clamp01((t - start) / Math.max(1e-6, dur)));
export const exitSeconds = (entrance) => entrance * 0.6;
export const rng = (seed) => {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
