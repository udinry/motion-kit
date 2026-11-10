import React, {useLayoutEffect, useRef} from 'react';
import {getRemotionEnvironment, useCurrentFrame} from 'remotion';

/** Side margin kept clear on a 1080 wide frame; type must fit inside SAFE_WIDTH at rest. */
export const SAFE_SIDE = 90;
export const SAFE_WIDTH = 1080 - 2 * SAFE_SIDE;

let ctx: CanvasRenderingContext2D | null | undefined;

/** Width of a string in px. Uses a canvas so it is the same in every render tab; falls back to an estimate. */
export const measureText = (text: string, fontSize: number, fontFamily = 'Georgia, serif', fontWeight: number | string = 800): number => {
  if (ctx === undefined) ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (!ctx) return Array.from(text).length * fontSize * 0.58;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
};

const warned = new Set<string>();
const devWarn = (key: string, message: string): void => {
  if (warned.has(key)) return;
  let studio = false;
  try {
    studio = getRemotionEnvironment().isStudio;
  } catch {
    studio = false;
  }
  if (!studio) return;
  warned.add(key);
  console.warn(`[motion-kit] ${message}`);
};

type FitOpts = {
  fontFamily?: string;
  fontWeight?: number | string;
  maxWidth?: number;
  /** Never shrink below this fraction of the requested size. */
  minScale?: number;
  /** Multiplier for effects that grow the word (key word 1.15x, drift). */
  grow?: number;
  name?: string;
};

/** Font size at which the widest of `texts` fits `maxWidth`; warns in the Studio when it had to shrink. */
export const fitFontSize = (texts: string[], fontSize: number, opts: FitOpts = {}): number => {
  const {fontFamily, fontWeight, maxWidth = SAFE_WIDTH, minScale = 0.3, grow = 1, name = 'text'} = opts;
  const widest = texts.reduce((a, t) => (measureText(t, fontSize, fontFamily, fontWeight) > measureText(a, fontSize, fontFamily, fontWeight) ? t : a), texts[0] ?? '');
  const w = measureText(widest, fontSize, fontFamily, fontWeight) * grow;
  if (w <= maxWidth) return fontSize;
  const scale = Math.max(minScale, maxWidth / w);
  devWarn(`${name}:${widest}`, `${name} "${widest}" is ${Math.round(w)}px wide at ${fontSize}px; scaled to ${Math.round(scale * 100)}% to fit ${maxWidth}px`);
  return fontSize * scale;
};

/** Same for a line made of parts that have their own size ratio (a number plus a smaller unit). */
export const fitFontSizeParts = (parts: [string, number][], fontSize: number, extra: number, opts: FitOpts = {}): number => {
  const {fontFamily, fontWeight, maxWidth = SAFE_WIDTH, minScale = 0.3, name = 'text'} = opts;
  const w = parts.reduce((a, [t, r]) => a + measureText(t, fontSize * r, fontFamily, fontWeight), 0) + extra * fontSize;
  if (w <= maxWidth) return fontSize;
  const scale = Math.max(minScale, maxWidth / w);
  devWarn(`${name}:${parts[0]?.[0]}`, `${name} "${parts.map((p) => p[0]).join(' ')}" is ${Math.round(w)}px wide at ${fontSize}px; scaled to ${Math.round(scale * 100)}% to fit ${maxWidth}px`);
  return fontSize * scale;
};

type FitTextProps = {
  children: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: number | string;
  color?: string;
  maxWidth?: number;
  style?: React.CSSProperties;
};

/** One line of big type that shrinks to fit the safe width. Use inside cards, posters and custom layouts. */
export const FitText: React.FC<FitTextProps> = ({children, fontSize, fontFamily = 'Georgia, serif', fontWeight = 800, color, maxWidth = SAFE_WIDTH, style}) => {
  const fs = fitFontSize([children], fontSize, {fontFamily, fontWeight, maxWidth, name: 'FitText'});
  return <div style={{fontSize: fs, fontFamily, fontWeight, color, whiteSpace: 'nowrap', lineHeight: 1.05, ...style}}>{children}</div>;
};

/**
 * Dev-only: warns in the Studio when visible text inside it leaves the 90 px side margin. Renders nothing extra in
 * a render. Wrap a composition (or one scene) while building; transitions in flight can trigger false positives.
 */
export const OverflowGuard: React.FC<{children: React.ReactNode; margin?: number}> = ({children, margin = SAFE_SIDE}) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    let studio = false;
    try {
      studio = getRemotionEnvironment().isStudio;
    } catch {
      studio = false;
    }
    const root = ref.current;
    if (!studio || !root) return;
    const box = root.getBoundingClientRect();
    root.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0);
      if (!own) return;
      if (Number(getComputedStyle(el).opacity) < 0.6) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      if (r.left < box.left + margin - 2 || r.right > box.right - margin + 2) {
        devWarn(`guard:${el.textContent}`, `text "${(el.textContent ?? '').slice(0, 30)}" leaves the ${margin}px side margin at frame ${frame}`);
      }
    });
  });
  return (
    <div ref={ref} style={{position: 'absolute', inset: 0}}>
      {children}
    </div>
  );
};
