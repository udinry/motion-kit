import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ease, expoOut, lerp} from './easing';

type DriftProps = {
  children: React.ReactNode;
  from?: number;
  to?: number;
  /** Total frames over which the drift runs. Defaults to the composition length. */
  frames?: number;
  /** Optional slow pan in px over the whole drift. */
  panX?: number;
  panY?: number;
  origin?: string;
  style?: React.CSSProperties;
};

/** Held shots are never dead: linear scale 1.00 to 1.04 (linear is correct for continuous drift). */
export const DriftCamera: React.FC<DriftProps> = ({
  children,
  from = 1,
  to = 1.04,
  frames,
  panX = 0,
  panY = 0,
  origin = '50% 50%',
  style,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const t = Math.min(1, frame / (frames ?? durationInFrames));
  const s = lerp(from, to, t);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${panX * t}px, ${panY * t}px) scale(${s})`,
        transformOrigin: origin,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

type PunchProps = {
  children: React.ReactNode;
  /** Frame (local) where the punch starts. */
  at: number;
  to?: number;
  frames?: number;
  /** Frames to hold before easing back. 0 = stay punched. */
  hold?: number;
  release?: number;
  origin?: string;
};

/** 1.00 to 1.12 in 4 frames, expo-out, on the key word or the reveal. */
export const PunchIn: React.FC<PunchProps> = ({children, at, to = 1.12, frames = 4, hold = 0, release = 10, origin = '50% 50%'}) => {
  const frame = useCurrentFrame();
  const inP = ease(frame, at, frames, expoOut);
  let s = lerp(1, to, inP);
  if (hold > 0) {
    const out = ease(frame, at + frames + hold, release, expoOut);
    s = lerp(to, 1, out);
  }
  return <AbsoluteFill style={{transform: `scale(${s})`, transformOrigin: origin}}>{children}</AbsoluteFill>;
};

export const punchScale = (frame: number, at: number, to = 1.12, frames = 4): number =>
  lerp(1, to, ease(frame, at, frames, expoOut));

export type ParallaxLayer = {
  node: React.ReactNode;
  /** 0.3 background, 0.6 mid, 1 foreground. */
  depth: number;
  key?: string;
};

type ParallaxProps = {
  layers: ParallaxLayer[];
  /** Total camera travel at depth 1, in px, over `frames`. Negative moves the camera left. */
  travelX?: number;
  travelY?: number;
  frames?: number;
  /** Extra scale per depth so the edges never show: layer scale = 1 + bleed * depth. */
  bleed?: number;
};

/** 2.5D parallax. Layers move at depth x camera travel; a slight depth-scaled zoom adds the push. */
export const Parallax: React.FC<ParallaxProps> = ({layers, travelX = -80, travelY = 0, frames, bleed = 0.04}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const t = Math.min(1, frame / (frames ?? durationInFrames));
  return (
    <AbsoluteFill>
      {layers.map((l, i) => (
        <AbsoluteFill
          key={l.key ?? i}
          style={{
            transform: `translate(${travelX * l.depth * t}px, ${travelY * l.depth * t}px) scale(${1 + bleed * (0.5 + l.depth * 0.5) * (1 + t * 0.5)})`,
          }}
        >
          {l.node}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
