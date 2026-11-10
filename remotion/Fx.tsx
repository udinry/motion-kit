import React from 'react';
import {AbsoluteFill, Audio, Sequence, useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {clamp01, cubicInOut, ease, expoOut, rng} from './easing';
import {jCut} from './timing';

type ConfettiProps = {
  /** Front colours; the winner's accent first. Backs of the paper pieces are a darker shade of the front. */
  colors: string[];
  /** Local frame the finish happens. Use at finish moments only. */
  start: number;
  count?: number;
  duration?: number;
  seed?: number;
  /** 'burst' pops out of `origin` (a popper) and stalls in the air; 'rain' falls from the top. */
  mode?: 'burst' | 'rain';
  origin?: {x: number; y: number};
  /** Aim of the burst in degrees (-90 = straight up) and half-spread. */
  aim?: number;
  spread?: number;
  /** Pieces come to rest here (px from top); omit to let them fall out of frame. */
  floorY?: number;
  /** Piece size multiplier; the base piece is 30 x 16 px. */
  size?: number;
  width?: number;
  height?: number;
};

const darken = (hex: string, k: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number): number => Math.round(v * k);
  return `rgb(${c((n >> 16) & 255)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
};

/**
 * Paper confetti flown in closed form (position = f(frame)): thrown hard, air drag stalls it, then it falls
 * and flutters (a swing that grows, a flip that shows the darker back) and settles on `floorY`.
 * Burst / stall / flutter / settle follows pixelfx's confetti; the maths here is ours.
 */
export const Confetti: React.FC<ConfettiProps> = ({colors, start, count = 60, duration = 110, seed = 7, mode = 'burst', origin = {x: 540, y: 1000}, aim = -90, spread = 38, floorY, size = 1, width = 1080, height = 1920}) => {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0 || t > duration) return null;
  const r = rng(seed);
  const g = 0.55;
  const drag = 0.07;
  const pieces = Array.from({length: count}, (_, i) => {
    const delay = mode === 'rain' ? r() * 30 : r() * 3;
    const a = ((aim + (r() * 2 - 1) * spread) * Math.PI) / 180;
    const sp = mode === 'rain' ? 0 : 26 + r() * 26;
    const x0 = mode === 'rain' ? r() * width : origin.x;
    const y0 = mode === 'rain' ? -60 - r() * 300 : origin.y;
    const vx = mode === 'rain' ? (r() - 0.5) * 3 : Math.cos(a) * sp;
    const vy = mode === 'rain' ? 4 + r() * 4 : Math.sin(a) * sp;
    const w = (24 + r() * 22) * size;
    const h = w * (0.45 + r() * 0.25);
    const spin = (r() - 0.5) * 18;
    const ph = r() * Math.PI * 2;
    const fs = 0.16 + r() * 0.16;
    const amp = 18 + r() * 34;
    const front = colors[i % colors.length];
    return {delay, x0, y0, vx, vy, w, h, spin, ph, fs, amp, front};
  });
  const pos = (p: (typeof pieces)[number], tt: number): {x: number; y: number} => {
    const e = 1 - Math.exp(-drag * tt);
    const x = p.x0 + (p.vx / drag) * e;
    const y = p.y0 + ((p.vy + g / drag) / drag) * e - (g / drag) * tt;
    const flutter = Math.min(1, tt / 18);
    return {x: x + Math.sin(tt * p.fs + p.ph) * p.amp * flutter, y};
  };
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      {pieces.map((p, i) => {
        let tt = t - p.delay;
        if (tt < 0) return null;
        let rest = false;
        if (floorY !== undefined) {
          for (let k = 0; k <= tt; k += 1) {
            if (pos(p, k).y >= floorY - p.h) {
              tt = k;
              rest = true;
              break;
            }
          }
        }
        const {x, y} = pos(p, tt);
        const flip = rest ? 0.8 : Math.cos(tt * p.fs * 1.6 + p.ph);
        const fade = floorY === undefined ? 1 - clamp01((t - (duration - 20)) / 20) : 1;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: p.w,
              height: p.h,
              background: flip >= 0 ? p.front : darken(p.front, 0.72),
              opacity: fade,
              borderRadius: 2,
              boxShadow: '0 3px 5px rgba(50,30,10,0.25)',
              transform: `rotate(${rest ? p.spin * tt * 0.5 : p.spin * tt}deg) scaleY(${Math.max(0.12, Math.abs(flip))})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Camera flash: bright on `at`, expo decay. One flash per reveal, never a flashing background. */
export const CameraFlash: React.FC<{at: number; frames?: number; peak?: number; color?: string}> = ({at, frames = 5, peak = 0.92, color = '#fffaf0'}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > frames) return null;
  const a = t === 0 ? peak : peak * (1 - expoOut(t / frames));
  return <AbsoluteFill style={{background: color, opacity: a, pointerEvents: 'none'}} />;
};

type SpotlightProps = {
  start: number;
  frames?: number;
  angle?: number;
  /** Width of the light band as a fraction of the frame. */
  band?: number;
  strength?: number;
  color?: string;
};

/** A soft band of light sweeping across the print. Sits above the content with a soft-light blend. */
export const SpotlightSweep: React.FC<SpotlightProps> = ({start, frames = 36, angle = 18, band = 0.28, strength = 0.7, color = '255,246,224'}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, start, frames, cubicInOut);
  if (frame < start || frame > start + frames) return null;
  const centre = -band * 100 + p * (100 + band * 200);
  const a = centre - band * 50;
  const b = centre;
  const c = centre + band * 50;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'soft-light',
        background: `linear-gradient(${90 + angle}deg, rgba(${color},0) ${a}%, rgba(${color},${strength}) ${b}%, rgba(${color},0) ${c}%)`,
      }}
    />
  );
};

type WipeProps = {
  from: React.ReactNode;
  to: React.ReactNode;
  start: number;
  frames?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  slant?: number;
  /** Accent edge strip that travels with the wipe, instead of a fade through colour. */
  edgeColor?: string;
  edgeWidth?: number;
};

/** Masked wipe: `to` is revealed through a slanted moving edge; `direction` is the way the edge travels. */
export const MaskedWipe: React.FC<WipeProps> = ({from, to, start, frames = 14, direction = 'right', slant = 0.12, edgeColor, edgeWidth = 0.03}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, start, frames, expoOut);
  const vertical = direction === 'up' || direction === 'down';
  const rev = direction === 'left' || direction === 'up';
  const e = p * (1 + slant + edgeWidth) - slant - edgeWidth;
  const poly = (pts: number[][]): string =>
    `polygon(${pts
      .map(([u, v]) => {
        const uu = rev ? 1 - u : u;
        const [x, y] = vertical ? [v, uu] : [uu, v];
        return `${(x * 100).toFixed(3)}% ${(y * 100).toFixed(3)}%`;
      })
      .join(', ')})`;
  const revealed = poly([[0, 0], [e + slant, 0], [e, 1], [0, 1]]);
  const band = poly([[e + slant, 0], [e + slant + edgeWidth, 0], [e + edgeWidth, 1], [e, 1]]);
  const done = p >= 1;
  return (
    <AbsoluteFill>
      {done ? null : <AbsoluteFill>{from}</AbsoluteFill>}
      {frame < start ? null : <AbsoluteFill style={{clipPath: done ? undefined : revealed}}>{to}</AbsoluteFill>}
      {edgeColor && !done && frame >= start ? <AbsoluteFill style={{clipPath: band, background: edgeColor}} /> : null}
    </AbsoluteFill>
  );
};

type JCutProps = {
  src: string;
  /** Frame the scene's picture starts at. */
  sceneStart: number;
  /** 4-8 frames. */
  lead?: number;
  volume?: number;
  durationInFrames?: number;
};

/** The next scene's sound arrives `lead` frames before its picture (J-cut). */
export const JCutAudio: React.FC<JCutProps> = ({src, sceneStart, lead = 6, volume = 1, durationInFrames}) => {
  const {from, trimBefore} = jCut(sceneStart, lead);
  return (
    <Sequence from={from} durationInFrames={durationInFrames}>
      <Audio src={src} trimBefore={trimBefore || undefined} volume={volume} />
    </Sequence>
  );
};

/** Motion blur on fast moves. Wrap only the shot that needs it; it renders its children `samples` times. */
export const MotionBlur: React.FC<{children: React.ReactNode; samples?: number; shutterAngle?: number}> = ({children, samples = 8, shutterAngle = 200}) => (
  <CameraMotionBlur samples={samples} shutterAngle={shutterAngle}>
    {children}
  </CameraMotionBlur>
);
