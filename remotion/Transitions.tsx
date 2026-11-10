import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp01, cubicInOut, ease, expoOut, lerp, rng} from './easing';

type Base = {
  from: React.ReactNode;
  to: React.ReactNode;
  start: number;
  frames?: number;
  width?: number;
  height?: number;
};

/* ---------------------------------------------------------------- iris */

type IrisProps = Base & {
  /** Centre of the circle in px; match it to an object in both shots for a match-cut iris. */
  cx?: number;
  cy?: number;
  ringColor?: string;
  ringWidth?: number;
};

/** The next shot opens as a growing circle with a thin ring on its edge. Idea from pixelfx's iris transition. */
export const IrisWipe: React.FC<IrisProps> = ({from, to, start, frames = 18, width = 1080, height = 1920, cx = width / 2, cy = height / 2, ringColor, ringWidth = 10}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, start, frames, cubicInOut);
  const maxR = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
  const r = p * maxR;
  const done = p >= 1;
  return (
    <AbsoluteFill>
      {done ? null : <AbsoluteFill>{from}</AbsoluteFill>}
      {frame < start ? null : <AbsoluteFill style={{clipPath: done ? undefined : `circle(${r}px at ${cx}px ${cy}px)`}}>{to}</AbsoluteFill>}
      {ringColor && !done && frame >= start ? (
        <div style={{position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `${ringWidth}px solid ${ringColor}`, boxSizing: 'border-box'}} />
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- slash */

type SlashProps = Base & {
  angle?: number;
  lineColor?: string;
  /** Frames the slash line takes to draw before the halves part. */
  drawFrames?: number;
};

/** A line draws across the shot, then the shot splits along it and the halves slide away. After pixelfx's slash wipe. */
export const SlashWipe: React.FC<SlashProps> = ({from, to, start, frames = 20, width = 1080, height = 1920, angle = -24, lineColor = '#c8452d', drawFrames = 5}) => {
  const frame = useCurrentFrame();
  const draw = ease(frame, start, drawFrames, expoOut);
  const part = ease(frame, start + drawFrames, frames - drawFrames, expoOut);
  const done = part >= 1;
  const rad = (angle * Math.PI) / 180;
  const half = Math.hypot(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const x0 = cx - Math.cos(rad) * half;
  const y0 = cy - Math.sin(rad) * half;
  const x1 = cx + Math.cos(rad) * half;
  const y1 = cy + Math.sin(rad) * half;
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);
  const poly = (side: 1 | -1): string => {
    const o = 4000 * side;
    return `polygon(${x0}px ${y0}px, ${x1}px ${y1}px, ${x1 + nx * o}px ${y1 + ny * o}px, ${x0 + nx * o}px ${y0 + ny * o}px)`;
  };
  const slide = part * 1500;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (done) return <AbsoluteFill>{to}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <AbsoluteFill>{to}</AbsoluteFill>
      {[1, -1].map((s) => (
        <AbsoluteFill key={s} style={{clipPath: poly(s as 1 | -1), transform: `translate(${nx * slide * s}px, ${ny * slide * s}px)`}}>
          {from}
        </AbsoluteFill>
      ))}
      <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity: 1 - part}}>
        <line x1={lerp(x0, x1, 0.5 - draw / 2)} y1={lerp(y0, y1, 0.5 - draw / 2)} x2={lerp(x0, x1, 0.5 + draw / 2)} y2={lerp(y0, y1, 0.5 + draw / 2)} stroke={lineColor} strokeWidth={10} strokeLinecap="round" />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- burn away */

const hash2 = (x: number, y: number, s: number): number => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (t: number): number => t * t * (3 - 2 * t);
const vnoise = (x: number, y: number, s: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = smooth(x - xi);
  const fy = smooth(y - yi);
  return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), fx), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), fx), fy);
};
const fbm = (x: number, y: number, s: number): number => vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15;

type BurnProps = Base & {
  /** Colour of the char that covers the cut. */
  char?: string;
  seed?: number;
  /** Low-res canvas width; the height follows the frame. 270 gives chunky 4 px burn pixels. */
  res?: number;
};

/** Char to singed paper, no fire colours: the edge scorches from ink to tan. */
const SCORCH = ['#241c14', '#33281c', '#4a3a28', '#6b5638', '#8c7656', '#b49d74'];
const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/**
 * Paper burn: the picture chars in from its edges behind a ragged scorched edge (ink to tan, no flame colours), the
 * char smoulders, then burns open from the middle onto the next shot. The two fronts are noise fields thresholded against time, so the
 * frame is a pure function of the frame number. Design after pixelfx's burn-away transition; the flame
 * particles are left out on purpose (determinism, and no neon).
 */
export const BurnAway: React.FC<BurnProps> = ({from, to, start, frames = 54, width = 1080, height = 1920, char = '#241c14', seed = 4, res = 270}) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const t = (frame - start) / frames;
  const gw = res;
  const gh = Math.round((res * height) / width);
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv || t < 0 || t > 1) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(gw, gh);
    const ink = hexRgb(char);
    const ramp = SCORCH.map(hexRgb);
    const closeEnd = 0.42;
    const openStart = 0.5;
    const kIn = clamp01(t / closeEnd) ** 1.2;
    const kOut = clamp01((t - openStart) / (1 - openStart));
    const band = 0.05;
    const r = rng(seed);
    const ox = 0.5 + (r() - 0.5) * 0.1;
    const oy = 0.5 + (r() - 0.5) * 0.1;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const ux = x / gw;
        const uy = y / gh;
        const m = Math.pow(Math.pow(Math.abs(ux - 0.5) * 2, 4) + Math.pow(Math.abs(uy - 0.5) * 2, 4), 0.25);
        const n = fbm(x / 14, y / 14, seed) - 0.5;
        const fin = 1 - m + n * 0.35 + (0.5 - uy) * 0.06;
        const d = Math.hypot((ux - ox) * 1, (uy - oy) * (height / width)) / 0.9;
        const fout = d + n * 0.3;
        const i = (y * gw + x) * 4;
        let a = 0;
        let col: [number, number, number] = ink;
        const covered = fin < kIn * 1.25;
        const edgeIn = Math.abs(fin - kIn * 1.25);
        if (t < openStart) {
          if (covered) a = 255;
          else if (kIn > 0 && edgeIn < band) {
            const h = 1 - edgeIn / band;
            col = ramp[Math.min(ramp.length - 1, Math.floor(h * ramp.length))];
            a = 255 * Math.min(1, h * 2.2);
          }
          if (covered && kIn > 0 && edgeIn < band * 0.6) {
            const h = 1 - edgeIn / (band * 0.6);
            col = ramp[Math.min(ramp.length - 1, Math.floor(h * ramp.length))];
          }
        } else {
          const hole = fout < kOut * 1.3;
          const edge = Math.abs(fout - kOut * 1.3);
          if (!hole) {
            a = 255;
            if (kOut > 0 && edge < band) {
              const h = 1 - edge / band;
              col = ramp[Math.min(ramp.length - 1, Math.floor(h * ramp.length))];
            }
          } else if (edge < band * 0.7) {
            const h = 1 - edge / (band * 0.7);
            col = ramp[Math.min(ramp.length - 1, Math.floor(h * ramp.length))];
            a = 255 * h;
          }
        }
        const smoulder = t > closeEnd * 0.95 && t < openStart + 0.1 && hash2(x >> 1, y >> 1, seed + Math.floor(t * 20)) > 0.992 && a === 255;
        if (smoulder) col = ramp[3];
        img.data[i] = col[0];
        img.data[i + 1] = col[1];
        img.data[i + 2] = col[2];
        img.data[i + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  const underTo = t >= 0.46;
  const underFrom = t < 0.46;
  return (
    <AbsoluteFill>
      {frame < start ? <AbsoluteFill>{from}</AbsoluteFill> : null}
      {t >= 1 ? <AbsoluteFill>{to}</AbsoluteFill> : null}
      {t >= 0 && t < 1 ? (
        <>
          {underFrom ? <AbsoluteFill>{from}</AbsoluteFill> : null}
          {underTo ? <AbsoluteFill>{to}</AbsoluteFill> : null}
          <canvas ref={ref} width={gw} height={gh} style={{position: 'absolute', inset: 0, width, height, imageRendering: 'pixelated'}} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
