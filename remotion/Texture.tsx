import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

type GrainProps = {
  /** 0.04-0.06 per MOTION.md rule 10. */
  opacity?: number;
  /** Re-seed every `hold` frames; 1 = every frame, 2 gives a 15 fps filmic flutter. */
  hold?: number;
  seed?: number;
  blend?: React.CSSProperties['mixBlendMode'];
  size?: number;
};

/** Film grain. feTurbulence is seeded with the frame number, so every render tab draws the same noise. */
export const Grain: React.FC<GrainProps> = ({opacity = 0.05, hold = 1, seed = 0, blend = 'multiply', size = 1}) => {
  const frame = useCurrentFrame();
  const s = (Math.floor(frame / hold) + seed * 101) % 997;
  const id = `grain-${seed}`;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity, mixBlendMode: blend}}>
      <svg width="100%" height="100%" style={{position: 'absolute', inset: 0}}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={0.8 / size} numOctaves={2} seed={s} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="2.4" intercept="-0.7" />
            <feFuncG type="linear" slope="2.4" intercept="-0.7" />
            <feFuncB type="linear" slope="2.4" intercept="-0.7" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** 15-25% darkening toward the corners. */
export const Vignette: React.FC<{strength?: number; tint?: string}> = ({strength = 0.2, tint = '40,28,16'}) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(${tint},0) 55%, rgba(${tint},${strength}) 100%)`,
    }}
  />
);

type PaperProps = {
  color?: string;
  fiber?: number;
  /** Warm light falling from the top-left. */
  light?: number;
  children?: React.ReactNode;
};

/** Warm paper ground: flat colour, a static fibre texture and one soft light direction. No gradients on chrome. */
export const PaperGround: React.FC<PaperProps> = ({color = '#efe6d2', fiber = 0.22, light = 0.35, children}) => (
  <AbsoluteFill style={{background: color}}>
    <AbsoluteFill style={{background: `radial-gradient(ellipse 90% 60% at 20% 8%, rgba(255,250,236,${light}) 0%, rgba(255,250,236,0) 70%)`}} />
    <AbsoluteFill style={{opacity: fiber, mixBlendMode: 'multiply'}}>
      <svg width="100%" height="100%" style={{position: 'absolute', inset: 0}}>
        <filter id="paper-fiber" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.9" numOctaves={3} seed={11} />
          <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.24  0 0 0 0.9 -0.28" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-fiber)" />
      </svg>
    </AbsoluteFill>
    {children}
  </AbsoluteFill>
);
