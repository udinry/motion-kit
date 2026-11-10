import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {rng} from './easing';

export type HitStopOptions = {
  freeze?: number;
  shakePx?: number;
  shakeFrames?: number;
};

export type HitStopState = {
  /** Remapped frame to drive animations with. Holds still for `freeze` frames at every impact. */
  frame: number;
  shake: {x: number; y: number};
  frozen: boolean;
};

/**
 * Pure function of the frame. Each impact freezes time for `freeze` (3-4) frames, then shakes
 * `shakePx` (6-10) decaying to zero over `shakeFrames` (8). Impacts must be sorted ascending.
 */
export const hitStopAt = (frame: number, impactFrames: number[], opts: HitStopOptions = {}): HitStopState => {
  const freeze = opts.freeze ?? 4;
  const amp = opts.shakePx ?? 8;
  const decay = opts.shakeFrames ?? 8;
  let removed = 0;
  let frozen = false;
  let shakeX = 0;
  let shakeY = 0;
  impactFrames.forEach((imp, idx) => {
    const sinceImpact = frame - imp;
    if (sinceImpact >= 0 && sinceImpact < freeze) frozen = true;
    if (sinceImpact >= freeze) removed += freeze;
    else if (sinceImpact >= 0) removed += sinceImpact;
    const shakeAge = sinceImpact - freeze;
    if (shakeAge >= 0 && shakeAge < decay) {
      const k = 1 - shakeAge / decay;
      const r = rng(idx * 977 + Math.floor(frame) * 31 + 7);
      shakeX += (r() * 2 - 1) * amp * k;
      shakeY += (r() * 2 - 1) * amp * k;
    }
  });
  return {frame: frame - removed, shake: {x: shakeX, y: shakeY}, frozen};
};

export const useHitStop = (impactFrames: number[], opts?: HitStopOptions): HitStopState =>
  hitStopAt(useCurrentFrame(), impactFrames, opts);

type HitStopProps = {
  impacts: number[];
  options?: HitStopOptions;
  children: React.ReactNode;
};

/**
 * Wraps a scene: children see the remapped (frozen) time via useCurrentFrame and the whole layer shakes.
 * Impact frames are in the parent's local time.
 */
export const HitStop: React.FC<HitStopProps> = ({impacts, options, children}) => {
  const {frame, shake} = useHitStop(impacts, options);
  const outer = useCurrentFrame();
  return (
    <AbsoluteFill style={{transform: `translate(${shake.x.toFixed(2)}px, ${shake.y.toFixed(2)}px)`}}>
      <Sequence from={outer - frame} layout="none">
        {children}
      </Sequence>
    </AbsoluteFill>
  );
};
