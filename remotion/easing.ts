export const FPS = 30;

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const expoOut = (t: number): number => {
  const x = clamp01(t);
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
};

export const expoIn = (t: number): number => {
  const x = clamp01(t);
  return x === 0 ? 0 : Math.pow(2, 10 * (x - 1));
};

export const cubicOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);

export const cubicInOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/**
 * Closed-form step response of a critically damped spring (zeta = 1).
 * t is normalised 0..1 over `settle` (the time it takes to reach ~99%), so no overshoot and no state.
 */
export const critSpring = (t: number, settle = 1): number => {
  const x = clamp01(t / settle);
  if (x >= 1) return 1;
  const w = 6.64;
  return 1 - (1 + w * x) * Math.exp(-w * x);
};

/** Overshoot for characters and toys; 1.70158 is the classic back-out constant. */
export const overshoot = (t: number, amount = 1.70158): number => {
  const x = clamp01(t);
  const c3 = amount + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + amount * Math.pow(x - 1, 2);
};

/** Dips backwards (anticipation) first, then travels to 1 with a small overshoot (follow-through). */
export const anticipation = (t: number, dip = 0.18, amount = 1.2): number => {
  const x = clamp01(t);
  const split = 0.3;
  if (x < split) {
    const k = x / split;
    return -dip * Math.sin((k * Math.PI) / 2);
  }
  const k = (x - split) / (1 - split);
  const start = -dip;
  return start + (1 - start) * overshoot(k, amount);
};

/** Exits run at ~60% of the entrance duration (MOTION.md rule 4). */
export const exitFrames = (entranceFrames: number): number => Math.max(1, Math.round(entranceFrames * 0.6));

export type EaseFn = (t: number) => number;

/** Progress 0..1 of `frame` over [start, start+dur] through `fn`. */
export const ease = (frame: number, start: number, dur: number, fn: EaseFn = expoOut): number =>
  fn(clamp01((frame - start) / Math.max(1, dur)));

/** Start frame of item i in a stagger. Elements 2-3 frames apart, words 1.5-2 frames. */
export const stagger = (i: number, gap = 2.5, base = 0): number => base + i * gap;

export const STAGGER = {element: 2.5, word: 1.75} as const;

/** Deterministic PRNG (mulberry32). Same seed gives the same sequence on any render tab. */
export const rng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hash01 = (n: number): number => rng(Math.floor(n) * 2654435761)();

/**
 * Squash and stretch for characters and toys: returns [scaleX, scaleY] with volume kept (sx * sy ~ 1).
 * `v` is vertical speed in px/frame (positive = moving up); `landed` 0..1 decays after a landing.
 */
export const squashStretch = (v: number, landed = 0, k = 0.012): [number, number] => {
  const stretch = 1 + Math.min(0.35, Math.abs(v) * k);
  const squash = 1 - 0.32 * landed;
  const sy = stretch * squash;
  return [1 / Math.sqrt(sy), sy];
};
