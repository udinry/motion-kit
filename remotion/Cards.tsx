import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp01, critSpring, cubicInOut, ease, expoIn, expoOut, lerp, rng} from './easing';
import {cleanText} from './timing';
import {formatNumber} from './Numbers';

/* ---------------------------------------------------------------- flying-words */

type FlyingProps = {
  words: string[];
  start?: number;
  /** Frames each word is on screen before the next one flies in. */
  gap?: number;
  /** 0-based key word: accent colour. */
  accent?: number;
  accentColor?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  seed?: number;
};

/**
 * One word at a time flies in from depth (small, soft) to the plane, holds, then flies past the lens
 * (big, blurred, fading) as the next arrives. Words are stacked at the centre with a seeded drift.
 * Pattern from video-shotcraft's flying-words card.
 */
export const FlyingWords: React.FC<FlyingProps> = ({words, start = 0, gap = 12, accent, accentColor = '#c8452d', color = '#1d1a16', fontSize = 190, fontFamily = 'Georgia, serif', fontWeight = 800, seed = 5}) => {
  const frame = useCurrentFrame();
  const r = rng(seed);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
      {words.slice(0, 6).map((raw, i) => {
        const w = cleanText(raw);
        const dx = (r() - 0.5) * 90;
        const dy = (r() - 0.5) * 120;
        const t0 = start + i * gap;
        const inP = ease(frame, t0, 9, expoOut);
        const last = i === words.length - 1;
        const outDur = Math.max(4, Math.round(gap * 0.3));
        const outP = last ? 0 : ease(frame, t0 + gap - outDur - 2, outDur, expoIn);
        if (frame < t0 || outP >= 1) return null;
        const scale = lerp(0.3, 1, inP) * lerp(1, 3.2, outP);
        const blur = (1 - inP) * 10 + outP * 14;
        const alpha = clamp01(inP * 1.4) * (1 - outP);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              fontSize,
              fontFamily,
              fontWeight,
              color: i === accent ? accentColor : color,
              transform: `translate(${dx * (1 - outP * 2)}px, ${dy}px) scale(${scale})`,
              filter: `blur(${blur.toFixed(1)}px)`,
              opacity: alpha,
              whiteSpace: 'nowrap',
            }}
          >
            {w}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- card-stack */

type StackProps = {
  cards: React.ReactNode[];
  start?: number;
  gap?: number;
  width?: number;
  height?: number;
  /** Vertical step each older card moves up, px. */
  step?: number;
  radius?: number;
  background?: string;
};

/** Cards arrive from below one after another; older ones ease back (up, smaller, dimmer) to make a stack. */
export const CardStack: React.FC<StackProps> = ({cards, start = 0, gap = 20, width = 860, height = 640, step = 96, radius = 36, background = '#f6efdf'}) => {
  const frame = useCurrentFrame();
  const arrive = (i: number): number => ease(frame, start + i * gap, 16, expoOut);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      {cards.map((c, i) => {
        const p = arrive(i);
        if (p <= 0) return null;
        let depth = 0;
        for (let j = i + 1; j < cards.length; j++) depth += arrive(j);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width,
              height,
              borderRadius: radius,
              background,
              overflow: 'hidden',
              boxShadow: '0 28px 60px rgba(60,40,20,0.25), 0 2px 0 rgba(255,255,255,0.6) inset',
              transform: `translateY(${(1 - p) * 1300 - depth * step}px) scale(${1 - depth * 0.05}) rotate(${(1 - p) * (i % 2 === 0 ? -6 : 6)}deg)`,
              filter: `brightness(${1 - Math.min(0.3, depth * 0.1)})`,
            }}
          >
            {c}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- text-as-mask */

type TextMaskProps = {
  text: string;
  /** Any CSS background (gradient, url()) that is seen only through the letters. */
  fill: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  start?: number;
  frames?: number;
  /** Pans the fill so the picture moves through the letters (px over the whole shot). */
  pan?: number;
  outline?: string;
  align?: React.CSSProperties['textAlign'];
  style?: React.CSSProperties;
};

/** Giant letters that act as a window onto a moving picture; revealed by a left-to-right wipe. */
export const TextAsMask: React.FC<TextMaskProps> = ({text, fill, fontSize = 300, fontFamily = 'Georgia, serif', fontWeight = 900, start = 0, frames = 16, pan = 600, outline, align = 'center', style}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, start, frames, expoOut);
  const drift = clamp01((frame - start) / 150) * pan;
  return (
    <div
      style={{
        fontSize,
        fontFamily,
        fontWeight,
        lineHeight: 0.95,
        textAlign: align,
        background: fill,
        backgroundSize: '220% 220%',
        backgroundPosition: `${drift}px 50%`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        WebkitTextStroke: outline ? `3px ${outline}` : undefined,
        clipPath: `inset(-10% ${(1 - p) * 100}% -10% 0)`,
        ...style,
      }}
    >
      {cleanText(text)}
    </div>
  );
};

/* ---------------------------------------------------------------- gauge-readout */

type GaugeProps = {
  value: number;
  max: number;
  start?: number;
  frames?: number;
  size?: number;
  label?: string;
  unit?: string;
  ink?: string;
  accent?: string;
  /** Fraction of the dial (from the end) painted in the accent as the danger zone. */
  zone?: number;
  fontFamily?: string;
  decimals?: number;
};

/** Needle sweep with a critically damped spring (no wobble); tick arc, danger zone and a live readout. */
export const GaugeNeedle: React.FC<GaugeProps> = ({value, max, start = 0, frames = 30, size = 880, label, unit, ink = '#1d1a16', accent = '#c8452d', zone = 0.25, fontFamily = 'Georgia, serif', decimals = 0}) => {
  const frame = useCurrentFrame();
  const p = critSpring((frame - start) / frames);
  const cur = (value / max) * p;
  const cx = size / 2;
  const cy = size * 0.56;
  const R = size * 0.42;
  const a0 = Math.PI * 0.85;
  const a1 = Math.PI * 2.15;
  const ang = (k: number): number => a0 + (a1 - a0) * k;
  const pt = (k: number, rr: number): [number, number] => [cx + Math.cos(ang(k)) * rr, cy + Math.sin(ang(k)) * rr];
  const ticks = Array.from({length: 41}, (_, i) => i / 40);
  const arc = (k0: number, k1: number, rr: number): string => {
    const [x0, y0] = pt(k0, rr);
    const [x1, y1] = pt(k1, rr);
    return `M ${x0} ${y0} A ${rr} ${rr} 0 ${(k1 - k0) * (a1 - a0) > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const [nx, ny] = pt(cur, R * 0.86);
  const fade = ease(frame, start - 6, 8, expoOut);
  return (
    <div style={{position: 'relative', width: size, height: size * 0.8, opacity: fade, fontFamily}}>
      <svg width={size} height={size * 0.8} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <path d={arc(0, 1 - zone, R)} stroke={ink} strokeOpacity={0.25} strokeWidth={22} fill="none" strokeLinecap="butt" />
        <path d={arc(1 - zone, 1, R)} stroke={accent} strokeWidth={22} fill="none" />
        {ticks.map((k, i) => {
          const major = i % 5 === 0;
          const [x0, y0] = pt(k, R - 26);
          const [x1, y1] = pt(k, R - (major ? 62 : 44));
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={ink} strokeWidth={major ? 6 : 3} strokeOpacity={major ? 0.9 : 0.5} />;
        })}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={ink} strokeWidth={14} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={30} fill={ink} />
        <circle cx={cx} cy={cy} r={11} fill="#efe6d2" />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: cy + 70, textAlign: 'center', color: ink}}>
        <div style={{fontSize: 250, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>
          {formatNumber(cur * max, decimals)}
          {unit ? <span style={{fontSize: 120, marginLeft: 14, color: accent}}>{unit}</span> : null}
        </div>
        {label ? <div style={{fontSize: 72, opacity: 0.75, marginTop: 8}}>{label}</div> : null}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- paparazzi-flash */

type PaparazziProps = {
  /** Frames (local) of the flashes. Each flash hard-cuts to the next shot. */
  flashes: number[];
  /** Renders shot k (0 = before the first flash). */
  shot: (k: number) => React.ReactNode;
  /** Frames of distant camera pops before the first flash. */
  pops?: number;
  seed?: number;
  tint?: string;
  width?: number;
  height?: number;
};

/**
 * Burst of white flashes; every flash cuts to a new crop of the subject, the cut settles 1.03 to 1 and
 * the exposure rolls off. Small star pops from other cameras fill the live part before the first flash.
 * After video-shotcraft's paparazzi-flash card.
 */
export const PaparazziFlash: React.FC<PaparazziProps> = ({flashes, shot, pops = 6, seed = 3, tint = '255,250,240', width = 1080, height = 1920}) => {
  const frame = useCurrentFrame();
  let k = 0;
  let last = -999;
  flashes.forEach((f, i) => {
    if (frame >= f) {
      k = i + 1;
      last = f;
    }
  });
  const since = frame - last;
  const settle = k === 0 ? 1 : lerp(1.03, 1, ease(frame, last, 6, expoOut));
  const bloom = k === 0 ? 0 : 1 - expoOut(clamp01(since / 7));
  const flashA = k === 0 ? 0 : since <= 0 ? 0.95 : 0.95 * (1 - expoOut(clamp01(since / 4)));
  const r = rng(seed);
  const first = flashes[0] ?? 0;
  const popList = Array.from({length: pops}, () => ({f: Math.floor(r() * Math.max(1, first - 2)), x: r() * width, y: r() * height * 0.6 + height * 0.1}));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${settle})`, filter: `brightness(${1 + bloom * 0.5}) saturate(${k === 0 ? 1 : 0.92})`}}>{shot(k)}</AbsoluteFill>
      {k === 0
        ? popList.map((p, i) => {
            const t = frame - p.f;
            if (t < 0 || t > 3) return null;
            const a = 1 - t / 3;
            return (
              <div key={i} style={{position: 'absolute', left: p.x - 110, top: p.y - 110, width: 220, height: 220, opacity: a}}>
                <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, rgba(${tint},0.95) 0%, rgba(${tint},0.3) 20%, rgba(${tint},0) 60%)`}} />
                <div style={{position: 'absolute', left: 0, right: 0, top: 108, height: 4, background: `linear-gradient(90deg, transparent, rgba(${tint},0.9), transparent)`}} />
                <div style={{position: 'absolute', top: 20, bottom: 20, left: 108, width: 4, background: `linear-gradient(180deg, transparent, rgba(${tint},0.8), transparent)`}} />
              </div>
            );
          })
        : null}
      {flashA > 0 ? <AbsoluteFill style={{background: `rgb(${tint})`, opacity: flashA}} /> : null}
    </AbsoluteFill>
  );
};

/** Warm-white bloom laid over a hard cut. */
export const FlashCut: React.FC<{at: number; frames?: number; peak?: number}> = ({at, frames = 10, peak = 0.85}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > frames) return null;
  const o = t < frames * 0.4 ? (t / (frames * 0.4)) * peak : peak * (1 - (t - frames * 0.4) / (frames * 0.6));
  return <AbsoluteFill style={{pointerEvents: 'none', opacity: o, background: 'radial-gradient(ellipse at 50% 45%, rgba(255,248,235,0.98), rgba(255,244,224,0.55) 55%, rgba(255,244,224,0) 80%)'}} />;
};

/* ---------------------------------------------------------------- 2.5D page camera */

export type CamKey = {frame: number; cx: number; cy: number; zoom: number; rotX?: number; rotY?: number; rotZ?: number; persp?: number};

type PageCamProps = {
  /** Page content laid out in CSS px at `pageWidth` wide. */
  children: React.ReactNode;
  pageWidth?: number;
  pageHeight: number;
  keys: CamKey[];
  width?: number;
  height?: number;
  background?: string;
  ease?: (t: number) => number;
  /** Soft focus band: blur px applied to the top `focusY` part of the screen, fading out. */
  dof?: {focusY: number; strength: number};
};

/**
 * A flat page (screenshot, poster, DOM layout) seen by a virtual camera: keys give the page point (cx, cy)
 * at screen centre, zoom, and optional tilt. Zoom is applied as CSS zoom so text rasterises at the enlarged
 * size and stays sharp. Same method as video-shotcraft's PageCam, set up for a 1080x1920 viewport.
 */
export const PageCam: React.FC<PageCamProps> = ({children, pageWidth = 1080, pageHeight, keys, width = 1080, height = 1920, background = '#efe6d2', ease: easeFn = cubicInOut, dof}) => {
  const frame = useCurrentFrame();
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (frame >= keys[i].frame && frame <= keys[i + 1].frame) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const t = a.frame === b.frame ? 1 : easeFn(clamp01((frame - a.frame) / (b.frame - a.frame)));
  const cx = lerp(a.cx, b.cx, t);
  const cy = lerp(a.cy, b.cy, t);
  const zoom = lerp(a.zoom, b.zoom, t);
  const rotX = lerp(a.rotX ?? 0, b.rotX ?? 0, t);
  const rotY = lerp(a.rotY ?? 0, b.rotY ?? 0, t);
  const rotZ = lerp(a.rotZ ?? 0, b.rotZ ?? 0, t);
  const persp = lerp(a.persp ?? 1600, b.persp ?? 1600, t);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background}}>
      <div style={{position: 'absolute', inset: 0, perspective: `${persp * zoom}px`, perspectiveOrigin: `${width / 2}px ${height / 2}px`}}>
        <div
          style={{
            position: 'absolute',
            width: pageWidth,
            height: pageHeight,
            zoom,
            transform: `translate(${width / 2 / zoom - cx}px, ${height / 2 / zoom - cy}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transformStyle: 'preserve-3d',
          }}
        >
          {children}
        </div>
      </div>
      {dof ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: dof.focusY,
            backdropFilter: `blur(${dof.strength}px)`,
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
