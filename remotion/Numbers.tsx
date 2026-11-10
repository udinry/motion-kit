import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp01, cubicInOut, ease, expoOut, lerp} from './easing';
import {fitFontSizeParts, SAFE_WIDTH} from './fit';

const NUM_FONT = 'Georgia, serif';

type DigitRollProps = {
  /** Final text, e.g. "1,24,500". Digits roll, other characters stay. */
  value: string;
  start?: number;
  /** 18-30 frames = 0.6-1.0 s. */
  frames?: number;
  /** Frames between column starts, rightmost column first. */
  stagger?: number;
  loops?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  /** Unit text lands after the number (rule 8). */
  unit?: string;
  unitColor?: string;
  unitDelay?: number;
};

export const DigitRoll: React.FC<DigitRollProps> = ({
  value,
  start = 0,
  frames = 24,
  stagger = 2,
  loops = 1,
  fontSize: requestedSize = 140,
  color = '#1d1a16',
  fontFamily = NUM_FONT,
  fontWeight = 800,
  unit,
  unitColor,
  unitDelay = 3,
}) => {
  const frame = useCurrentFrame();
  const chars = Array.from(value);
  const digits = chars.filter((c) => /\d/.test(c)).length;
  const others = chars.filter((c) => !/\d/.test(c)).join('');
  const fontSize = fitFontSizeParts([[others, 1], [unit ?? '', unit ? 0.5 : 0]], requestedSize, digits * 0.62 + (unit ? 0.14 : 0), {fontFamily, fontWeight, maxWidth: SAFE_WIDTH, name: 'DigitRoll'});
  const lh = fontSize * 1.1;
  const digitCount = chars.filter((c) => /\d/.test(c)).length;
  let di = 0;
  const lastEnd = start + (digitCount - 1) * stagger + frames;
  const unitP = ease(frame, lastEnd + unitDelay - 2, 8, expoOut);
  return (
    <div style={{display: 'inline-flex', alignItems: 'baseline', fontFamily, fontWeight, fontSize, color, lineHeight: `${lh}px`}}>
      {chars.map((c, i) => {
        if (!/\d/.test(c)) {
          const pc = ease(frame, start + stagger * 2, 6, expoOut);
          return (
            <span key={i} style={{opacity: pc, display: 'inline-block', height: lh}}>
              {c}
            </span>
          );
        }
        const d = Number(c);
        const order = digitCount - 1 - di++;
        const p = ease(frame, start + order * stagger, frames, expoOut);
        const dist = loops * 10 + d;
        const strip = Array.from({length: dist + 1}, (_, k) => k % 10);
        return (
          <span key={i} style={{display: 'inline-block', height: lh, overflow: 'hidden', width: '0.62em', textAlign: 'center'}}>
            <span style={{display: 'block', transform: `translateY(${-dist * lh * p}px)`}}>
              {strip.map((n, k) => (
                <span key={k} style={{display: 'block', height: lh}}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
      {unit ? (
        <span
          style={{
            marginLeft: fontSize * 0.14,
            fontSize: fontSize * 0.5,
            color: unitColor ?? color,
            opacity: unitP,
            transform: `translateY(${(1 - unitP) * 16}px)`,
            display: 'inline-block',
          }}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );
};

/** Indian digit grouping (1,24,500) or western; no Intl dependency in the render tab. */
export const formatNumber = (n: number, decimals = 0, indian = false): string => {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  let grouped: string;
  if (indian && int.length > 3) {
    const head = int.slice(0, -3);
    grouped = head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + int.slice(-3);
  } else {
    grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return (n < 0 ? '-' : '') + grouped + (dec ? '.' + dec : '');
};

type CountUpProps = {
  to: number;
  from?: number;
  start?: number;
  /** 18-30 frames = 0.6-1.0 s. */
  frames?: number;
  decimals?: number;
  indian?: boolean;
  prefix?: string;
  unit?: string;
  unitDelay?: number;
  fontSize?: number;
  color?: string;
  unitColor?: string;
  fontFamily?: string;
  fontWeight?: number;
};

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  start = 0,
  frames = 24,
  decimals = 0,
  indian = false,
  prefix = '',
  unit,
  unitDelay = 3,
  fontSize: requestedSize = 140,
  color = '#1d1a16',
  unitColor,
  fontFamily = NUM_FONT,
  fontWeight = 800,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, start, frames, expoOut);
  const v = lerp(from, to, p);
  const fontSize = fitFontSizeParts([[prefix + formatNumber(to, decimals, indian), 1], [unit ?? '', unit ? 0.5 : 0]], requestedSize, unit ? 0.14 : 0, {fontFamily, fontWeight, maxWidth: SAFE_WIDTH, name: 'CountUp'});
  const unitP = ease(frame, start + frames + unitDelay - 2, 8, expoOut);
  return (
    <div style={{display: 'inline-flex', alignItems: 'baseline', fontFamily, fontWeight, fontSize, color, fontVariantNumeric: 'tabular-nums'}}>
      <span>{prefix + formatNumber(v, decimals, indian)}</span>
      {unit ? (
        <span style={{marginLeft: fontSize * 0.14, fontSize: fontSize * 0.5, color: unitColor ?? color, opacity: unitP, transform: `translateY(${(1 - unitP) * 16}px)`}}>
          {unit}
        </span>
      ) : null}
    </div>
  );
};

export type Bar = {label: string; value: number; color?: string};

const niceMax = (v: number): number => {
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
};

type AxisProps = {
  bars: Bar[];
  /** Index of the shocking value. */
  shockIndex: number;
  /** Local frame the shock bar starts to grow. */
  shockAt: number;
  width?: number;
  height?: number;
  accent?: string;
  ink?: string;
  barColor?: string;
  fontFamily?: string;
  format?: (n: number) => string;
  growFrames?: number;
  rescaleFrames?: number;
  tickSize?: number;
  labelSize?: number;
};

/** The chart's scale breaks to fit a shocking value: the bar bursts through the top, then the axis rescales. */
export const AxisRescaleShock: React.FC<AxisProps> = ({
  bars,
  shockIndex,
  shockAt,
  width: requestedWidth = 900,
  height = 700,
  accent = '#c8452d',
  ink = '#1d1a16',
  barColor = '#8a8272',
  fontFamily = 'Georgia, serif',
  format = (n) => formatNumber(n),
  growFrames = 8,
  rescaleFrames = 16,
  tickSize = 40,
  labelSize = 46,
}) => {
  const frame = useCurrentFrame();
  const width = Math.min(requestedWidth, SAFE_WIDTH);
  const padL = 200;
  const padB = 90;
  const padT = 40;
  const plotH = height - padB - padT;
  const plotW = width - padL - 10;
  const normal = Math.max(...bars.filter((_, i) => i !== shockIndex).map((b) => b.value));
  const normalMax = niceMax(normal * 1.1);
  const allMax = niceMax(Math.max(...bars.map((b) => b.value)) * 1.05);
  const grow = ease(frame, shockAt, growFrames, expoOut);
  const resc = ease(frame, shockAt + growFrames + 3, rescaleFrames, cubicInOut);
  const axisMax = lerp(normalMax, allMax, resc);
  const bw = plotW / bars.length;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * axisMax);
  const rawH = (b: Bar, i: number): number => ((i === shockIndex ? b.value * grow : b.value) / axisMax) * plotH;
  const broken = rawH(bars[shockIndex], shockIndex) > plotH;
  return (
    <svg width={width} height={height} style={{fontFamily, overflow: 'visible'}}>
      {ticks.map((t, i) => {
        const y = padT + plotH - (t / axisMax) * plotH;
        return (
          <g key={i}>
            <line x1={padL} x2={width - 10} y1={y} y2={y} stroke={ink} strokeOpacity={0.18} strokeWidth={2} />
            <text x={padL - 16} y={y + tickSize / 3} textAnchor="end" fontSize={tickSize} fill={ink} fillOpacity={0.7}>
              {format(t)}
            </text>
          </g>
        );
      })}
      {bars.map((b, i) => {
        const isShock = i === shockIndex;
        const hh = Math.min(rawH(b, i), plotH + 60);
        const x = padL + i * bw + bw * 0.15;
        const w = bw * 0.7;
        return (
          <g key={i}>
            <rect x={x} y={padT + plotH - hh} width={w} height={hh} fill={isShock ? accent : b.color ?? barColor} />
            <text x={x + w / 2} y={height - 24} textAnchor="middle" fontSize={labelSize} fill={ink}>
              {b.label}
            </text>
          </g>
        );
      })}
      {broken ? (
        <path d={`M ${padL - 6} ${padT + 14} l 14 -10 l 14 10 l 14 -10`} stroke={accent} strokeWidth={5} fill="none" strokeLinecap="round" />
      ) : null}
    </svg>
  );
};

type LineProps = {
  points: number[];
  start?: number;
  frames?: number;
  width?: number;
  height?: number;
  color?: string;
  ink?: string;
  fontFamily?: string;
  format?: (n: number) => string;
  /** Frames of range history averaged so the y-axis eases without state. */
  smooth?: number;
  tickSize?: number;
  labelSize?: number;
};

/** Line draws in with a live head; the y-range follows the visible data. */
export const LiveLineChart: React.FC<LineProps> = ({
  points,
  start = 0,
  frames = 90,
  width: requestedWidth = 900,
  height = 520,
  color = '#c8452d',
  ink = '#1d1a16',
  fontFamily = 'Georgia, serif',
  format = (n) => formatNumber(n, 0),
  smooth = 10,
  tickSize = 38,
  labelSize = 56,
}) => {
  const frame = useCurrentFrame();
  const width = Math.min(requestedWidth, SAFE_WIDTH);
  const n = points.length;
  const headAt = (f: number): number => clamp01((f - start) / frames) * (n - 1);
  const rangeAt = (f: number): [number, number] => {
    const upto = Math.max(4, Math.ceil(headAt(f)));
    const vis = points.slice(0, upto + 1);
    const hi = Math.max(...vis);
    const lo = Math.min(...vis);
    const pad = (hi - lo) * 0.15 || 1;
    return [lo - pad, hi + pad];
  };
  let lo = 0;
  let hi = 0;
  for (let k = 0; k < smooth; k++) {
    const [a, b] = rangeAt(frame - k);
    lo += a / smooth;
    hi += b / smooth;
  }
  const head = headAt(frame);
  const xs = (i: number): number => (i / (n - 1)) * width;
  const ys = (v: number): number => height - ((v - lo) / (hi - lo)) * height;
  const whole = Math.floor(head);
  let d = '';
  for (let i = 0; i <= whole; i++) d += `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(1)} ${ys(points[i]).toFixed(1)} `;
  const frac = head - whole;
  const next = points[Math.min(n - 1, whole + 1)];
  const curV = lerp(points[whole], next, frac);
  const hx = xs(head);
  const hy = ys(curV);
  if (frac > 0) d += `L ${hx.toFixed(1)} ${hy.toFixed(1)}`;
  return (
    <svg width={width} height={height} style={{overflow: 'visible', fontFamily}}>
      {[0, 0.5, 1].map((k) => (
        <g key={k}>
          <line x1={0} x2={width} y1={height * k} y2={height * k} stroke={ink} strokeOpacity={0.15} strokeWidth={2} />
          <text x={0} y={height * k - 10} fontSize={tickSize} fill={ink} fillOpacity={0.6}>
            {format(hi - (hi - lo) * k)}
          </text>
        </g>
      ))}
      <path d={d} stroke={color} strokeWidth={8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={hx} cy={hy} r={13} fill={color} />
      <text x={Math.min(hx, width - 10)} y={hy - 28} textAnchor="end" fontSize={labelSize} fontWeight={700} fill={ink}>
        {format(curV)}
      </text>
    </svg>
  );
};

type BASProps = {
  before: React.ReactNode;
  after: React.ReactNode;
  width: number;
  height: number;
  start?: number;
  frames?: number;
  /** Divider positions as fractions of width, scrubbed through in order. */
  positions?: number[];
  handleColor?: string;
};

/** Divider scrubs across; `before` shows left of the divider, `after` right. */
export const BeforeAfterSlider: React.FC<BASProps> = ({before, after, width, height, start = 0, frames = 60, positions = [0.08, 0.92], handleColor = '#f5efe3'}) => {
  const frame = useCurrentFrame();
  const t = clamp01((frame - start) / frames) * (positions.length - 1);
  const i = Math.min(positions.length - 2, Math.floor(t));
  const pos = lerp(positions[i], positions[i + 1], cubicInOut(t - i));
  const x = pos * width;
  return (
    <div style={{position: 'relative', width, height, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0}}>{after}</div>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${width - x}px 0 0)`}}>{before}</div>
      <div style={{position: 'absolute', left: x - 2, top: 0, width: 4, height, background: handleColor, boxShadow: '0 0 8px rgba(0,0,0,0.25)'}} />
      <div
        style={{
          position: 'absolute',
          left: x - 28,
          top: height / 2 - 28,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: handleColor,
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
};
