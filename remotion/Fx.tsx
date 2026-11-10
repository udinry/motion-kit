import React from 'react';
import {AbsoluteFill, Audio, Sequence, useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {clamp01, cubicInOut, ease, expoOut, rng} from './easing';
import {jCut} from './timing';

type ConfettiProps = {
  /** The winner's colour first; the rest are tints around it. */
  colors: string[];
  /** Local frame the finish happens. Use at finish moments only. */
  start: number;
  count?: number;
  duration?: number;
  seed?: number;
  mode?: 'rain' | 'cannon';
  width?: number;
  height?: number;
};

/** Seeded confetti flown in closed form (position = f(frame)); no particle state. */
export const Confetti: React.FC<ConfettiProps> = ({colors, start, count = 90, duration = 90, seed = 7, mode = 'rain', width = 1080, height = 1920}) => {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0 || t > duration) return null;
  const r = rng(seed);
  const pieces = Array.from({length: count}, (_, i) => {
    const delay = mode === 'rain' ? r() * 24 : r() * 4;
    const side = i % 2 === 0 ? -1 : 1;
    const x0 = mode === 'rain' ? r() * width : side < 0 ? -20 : width + 20;
    const y0 = mode === 'rain' ? -40 - r() * 200 : height * 0.82;
    const vx = mode === 'rain' ? (r() - 0.5) * 4 : -side * (14 + r() * 18);
    const vy = mode === 'rain' ? 6 + r() * 7 : -(30 + r() * 22);
    const g = mode === 'rain' ? 0.04 : 0.9;
    const w = 14 + r() * 14;
    const h = w * (0.45 + r() * 0.4);
    const spin = (r() - 0.5) * 24;
    const flutter = r() * Math.PI * 2;
    const color = colors[Math.floor(r() * colors.length)];
    return {delay, x0, y0, vx, vy, g, w, h, spin, flutter, color};
  });
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      {pieces.map((p, i) => {
        const tt = t - p.delay;
        if (tt < 0) return null;
        const x = p.x0 + p.vx * tt + Math.sin(tt * 0.18 + p.flutter) * 22;
        const y = p.y0 + p.vy * tt + 0.5 * p.g * tt * tt;
        const fade = 1 - clamp01((t - (duration - 18)) / 18);
        const flip = Math.cos(tt * 0.3 + p.flutter);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: p.w,
              height: p.h,
              background: p.color,
              opacity: fade,
              transform: `rotate(${p.spin * tt}deg) scaleY(${flip})`,
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
