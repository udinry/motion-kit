import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cubicInOut, ease, rng} from './easing';

type Base = {
  start?: number;
  frames?: number;
  color?: string;
  strokeWidth?: number;
  seed?: number;
  /** Frame at which the mark fades out; 0 keeps it. */
  endAt?: number;
};

const useDraw = (start: number, frames: number, endAt: number): {p: number; alpha: number} => {
  const frame = useCurrentFrame();
  const p = ease(frame, start, frames, cubicInOut);
  const alpha = endAt > 0 ? 1 - ease(frame, endAt, 6, cubicInOut) : 1;
  return {p, alpha};
};

const Stroke: React.FC<{d: string; p: number; alpha: number; color: string; w: number}> = ({d, p, alpha, color, w}) =>
  p <= 0 ? null : (
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={1}
      strokeDashoffset={1 - p}
      opacity={alpha}
    />
  );

type CircleProps = Base & {cx: number; cy: number; rx: number; ry: number};

/** Hand-drawn circle: overshoots its start a little; wobble is seeded so every render tab agrees. */
export const TelestratorCircle: React.FC<CircleProps> = ({cx, cy, rx, ry, start = 0, frames = 14, color = '#c8452d', strokeWidth = 9, seed = 1, endAt = 0}) => {
  const {p, alpha} = useDraw(start, frames, endAt);
  const r = rng(seed);
  const n = 28;
  const turns = 1.12;
  const tilt = (r() - 0.5) * 0.25;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 - 0.4 + (i / n) * Math.PI * 2 * turns;
    const grow = 1 + (i / n) * 0.06;
    const wob = 1 + (r() - 0.5) * 0.035;
    const x = cx + Math.cos(a + tilt) * rx * grow * wob;
    const y = cy + Math.sin(a + tilt) * ry * grow * wob;
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return <Stroke d={d} p={p} alpha={alpha} color={color} w={strokeWidth} />;
};

type ArrowProps = Base & {x1: number; y1: number; x2: number; y2: number; bend?: number};

/** Curved shaft first, then the head strokes. */
export const TelestratorArrow: React.FC<ArrowProps> = ({x1, y1, x2, y2, bend = 0.18, start = 0, frames = 14, color = '#c8452d', strokeWidth = 9, endAt = 0}) => {
  const shaftP = useDraw(start, frames, endAt);
  const headP = useDraw(start + frames - 2, 6, endAt);
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const hl = 46;
  const a1 = ang + Math.PI - 0.5;
  const a2 = ang + Math.PI + 0.5;
  const shaft = `M ${x1} ${y1} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2} ${y2}`;
  const head = `M ${x2 + Math.cos(a1) * hl} ${y2 + Math.sin(a1) * hl} L ${x2} ${y2} L ${x2 + Math.cos(a2) * hl} ${y2 + Math.sin(a2) * hl}`;
  return (
    <>
      <Stroke d={shaft} p={shaftP.p} alpha={shaftP.alpha} color={color} w={strokeWidth} />
      <Stroke d={head} p={headP.p} alpha={headP.alpha} color={color} w={strokeWidth} />
    </>
  );
};

type UnderlineProps = Base & {x: number; y: number; width: number; double?: boolean};

export const TelestratorUnderline: React.FC<UnderlineProps> = ({x, y, width, double = true, start = 0, frames = 10, color = '#c8452d', strokeWidth = 8, seed = 1, endAt = 0}) => {
  const a = useDraw(start, frames, endAt);
  const b = useDraw(start + 5, frames, endAt);
  const r = rng(seed);
  const j1 = (r() - 0.5) * 8;
  const j2 = (r() - 0.5) * 8;
  const d1 = `M ${x} ${y + j1} Q ${x + width / 2} ${y - 10 + j2} ${x + width} ${y + j2}`;
  const d2 = `M ${x + width * 0.08} ${y + 18 + j2} Q ${x + width / 2} ${y + 10 + j1} ${x + width * 0.94} ${y + 16 + j1}`;
  return (
    <>
      <Stroke d={d1} p={a.p} alpha={a.alpha} color={color} w={strokeWidth} />
      {double ? <Stroke d={d2} p={b.p} alpha={b.alpha} color={color} w={strokeWidth * 0.8} /> : null}
    </>
  );
};

/** Full-frame SVG layer that hosts telestrator marks in screen coordinates. */
export const TelestratorLayer: React.FC<{width?: number; height?: number; children: React.ReactNode}> = ({width = 1080, height = 1920, children}) => (
  <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
    {children}
  </svg>
);
