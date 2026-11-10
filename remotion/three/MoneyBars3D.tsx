import React, {useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {ContactShadows} from '@react-three/drei';
import {EffectComposer, TiltShift2} from '@react-three/postprocessing';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ease, expoOut, lerp, rng} from '../easing';
import {measureText} from '../fit';

export type MoneyBar = {
  label: string;
  value: number;
  /** Note or coin colour; give the highlighted bar the video's accent. */
  color?: string;
};

export type CameraSpec = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export type PushSpec = {
  /** Local frame the push starts. */
  start?: number;
  frames?: number;
  /** Camera distance from the target at the start and at the end of the push. */
  from?: number;
  to?: number;
  /** Elevation above the ground in degrees (20-25 reads as a tabletop shot). */
  elevation?: number;
  /** Azimuth sweep in radians over the push (the slow orbit). */
  orbit?: number;
  fov?: number;
};

export type MoneyBars3DProps = {
  bars: MoneyBar[];
  /** Value at the top of the axis. A bar of value == axisMax is exactly BAR_MAX_HEIGHT tall. */
  axisMax: number;
  width?: number;
  height?: number;
  kind?: 'notes' | 'coins';
  /** Notes (or coins) in a full-height bar; a bar holds ceil(value/axisMax * maxNotes) of them. */
  maxNotes?: number;
  start?: number;
  riseFrames?: number;
  stagger?: number;
  noteColor?: string;
  groundColor?: string;
  wallColor?: string;
  background?: string;
  tiltShift?: boolean;
  push?: PushSpec;
  seed?: number;
  tickCount?: number;
  labels?: boolean;
  formatValue?: (n: number) => string;
  formatTick?: (n: number) => string;
  ink?: string;
  fontFamily?: string;
};

export const BAR_MAX_HEIGHT = 6.2;
const SLOT = 1.32;
const DEPTH = 3.6;
const WALL_Z = -1.8;
const PLINTH_H = 0.3;

export const barX = (i: number, n: number): number => (i - (n - 1) / 2) * SLOT;
export const barTopY = (value: number, axisMax: number): number => (value / axisMax) * BAR_MAX_HEIGHT;

export const moneyCamera = (frame: number, p: PushSpec = {}): CameraSpec => {
  const {start = 0, frames = 150, from = 27, to = 20, elevation = 22, orbit = 0.5, fov = 36} = p;
  const k = ease(frame, start, frames, expoOut);
  const d = lerp(from, to, k);
  const az = (k - 0.5) * orbit;
  const el = (elevation * Math.PI) / 180;
  const target: [number, number, number] = [0, BAR_MAX_HEIGHT * 0.40, 0];
  return {
    position: [Math.sin(az) * Math.cos(el) * d, target[1] + Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d],
    target,
    fov,
  };
};

/** Screen position (px) of a world point for a camera spec: anchors HTML labels to the 3D scene. */
export const projectPoint = (p: [number, number, number], cam: CameraSpec, width: number, height: number): {x: number; y: number} => {
  const c = new THREE.PerspectiveCamera(cam.fov, width / height, 0.1, 200);
  c.position.set(...cam.position);
  c.lookAt(...cam.target);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(c);
  return {x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height};
};

const Rig: React.FC<{cam: CameraSpec}> = ({cam}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    camera.position.set(...cam.position);
    camera.fov = cam.fov;
    camera.lookAt(...cam.target);
    camera.updateProjectionMatrix();
    invalidate();
  });
  return null;
};

/** A banknote face drawn once from a seed: border, inner frame, oval medallion, guilloche lines, corner marks. */
const useNoteTexture = (hex: string, seed: number): THREE.CanvasTexture => {
  return useMemo(() => {
    const W = 256;
    const H = 128;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const c = cv.getContext('2d') as CanvasRenderingContext2D;
    const base = new THREE.Color(hex);
    const css = (k: number): string => `#${base.clone().multiplyScalar(k).getHexString()}`;
    c.fillStyle = css(1.05);
    c.fillRect(0, 0, W, H);
    const r = rng(seed);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.06})`;
      c.fillRect(r() * W, r() * H, 1 + r() * 2, 1);
    }
    c.strokeStyle = css(0.62);
    c.lineWidth = 5;
    c.strokeRect(5, 5, W - 10, H - 10);
    c.lineWidth = 2;
    c.strokeRect(14, 14, W - 28, H - 28);
    c.strokeStyle = css(0.78);
    c.lineWidth = 1;
    for (let y = 20; y < H - 20; y += 4) {
      c.beginPath();
      for (let x = 20; x <= W - 20; x += 4) c.lineTo(x, y + Math.sin(x * 0.18 + y * 0.4) * 2.2);
      c.stroke();
    }
    c.fillStyle = css(1.18);
    c.beginPath();
    c.ellipse(W / 2, H / 2, 38, 30, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = css(0.6);
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = css(0.55);
    c.fillRect(W / 2 - 4, H / 2 - 16, 8, 32);
    for (const [x, y] of [[28, 26], [W - 52, 26], [28, H - 36], [W - 52, H - 36]]) c.fillRect(x, y, 24, 10);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [hex, seed]);
};

const Stack: React.FC<{
  value: number;
  axisMax: number;
  maxNotes: number;
  kind: 'notes' | 'coins';
  color: string;
  x: number;
  p: number;
  seed: number;
}> = ({value, axisMax, maxNotes, kind, color, x, p, seed}) => {
  const total = (value / axisMax) * BAR_MAX_HEIGHT;
  const n = Math.max(1, Math.ceil((value / axisMax) * maxNotes));
  const t = total / n;
  const jit = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: n}, () => ({dx: (r() - 0.5) * 0.07, dz: (r() - 0.5) * 0.07, yaw: (r() - 0.5) * 0.09}));
  }, [n, seed]);
  const tex = useNoteTexture(color, seed);
  const base = useMemo(() => new THREE.Color(color), [color]);
  const edgeA = useMemo(() => base.clone().lerp(new THREE.Color('#f1ead4'), 0.55), [base]);
  const edgeB = useMemo(() => base.clone().lerp(new THREE.Color('#f1ead4'), 0.3), [base]);
  const lit = Math.max(0, p) * n;
  return (
    <group position={[x, 0, 0]}>
      {jit.map((nt, i) => {
        const vis = Math.min(1, Math.max(0, lit - i));
        if (vis <= 0) return null;
        const th = t * vis;
        const edge = i % 2 === 0 ? edgeA : edgeB;
        const banded = kind === 'notes' && i % 10 === 9;
        return (
          <group key={i} position={[nt.dx, i * t + th / 2, nt.dz]} rotation={[0, nt.yaw, 0]}>
            {kind === 'notes' ? (
              <mesh scale={[1, th, 1]} castShadow receiveShadow>
                <boxGeometry args={[1.0, 1, 0.5]} />
                <meshStandardMaterial attach="material-0" color={edge} roughness={0.92} />
                <meshStandardMaterial attach="material-1" color={edge} roughness={0.92} />
                <meshStandardMaterial attach="material-2" map={tex} roughness={0.85} />
                <meshStandardMaterial attach="material-3" color={edge} roughness={0.92} />
                <meshStandardMaterial attach="material-4" color={edge} roughness={0.92} />
                <meshStandardMaterial attach="material-5" color={edge} roughness={0.92} />
              </mesh>
            ) : (
              <mesh scale={[1, th, 1]} castShadow receiveShadow>
                <cylinderGeometry args={[0.46, 0.46, 1, 48]} />
                <meshStandardMaterial color={i % 2 === 0 ? base : base.clone().multiplyScalar(0.9)} roughness={0.34} metalness={0.35} />
              </mesh>
            )}
            {banded ? (
              <mesh scale={[1, th * 1.02, 1]} castShadow>
                <boxGeometry args={[1.045, 1, 0.545]} />
                <meshStandardMaterial color="#e6d39a" roughness={0.9} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
};

const Scene: React.FC<MoneyBars3DProps & {cam: CameraSpec}> = ({
  bars,
  axisMax,
  kind = 'notes',
  maxNotes = 36,
  start = 0,
  riseFrames = 26,
  stagger = 4,
  noteColor = '#8da586',
  groundColor = '#dcc79e',
  wallColor = '#f4ecd9',
  background = '#efe6d2',
  tiltShift = true,
  seed = 3,
  tickCount = 4,
  cam,
}) => {
  const frame = useCurrentFrame();
  const n = bars.length;
  const span = n * SLOT + 1.4;
  const ticks = Array.from({length: tickCount + 1}, (_, k) => (k / tickCount) * BAR_MAX_HEIGHT);
  const wallH = BAR_MAX_HEIGHT + 0.7;
  return (
    <>
      <color attach="background" args={[background]} />
      <Rig cam={cam} />
      <ambientLight intensity={0.95} color="#fff3de" />
      <directionalLight
        position={[-2.5, 12, 6.5]}
        intensity={2.6}
        color="#fff0d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={12}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0003}
        shadow-radius={5}
      />
      <mesh position={[0, -PLINTH_H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[span, PLINTH_H, DEPTH]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} />
      </mesh>
      <mesh position={[0, wallH / 2 - PLINTH_H, WALL_Z - 0.06]} receiveShadow>
        <boxGeometry args={[span, wallH + PLINTH_H, 0.12]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>
      {ticks.map((y, k) => (
        <mesh key={k} position={[0, y, WALL_Z + 0.005]}>
          <boxGeometry args={[span - 0.3, k === 0 ? 0.045 : 0.025, 0.01]} />
          <meshBasicMaterial color={k === 0 ? '#5b4a35' : '#b9a67f'} />
        </mesh>
      ))}
      {bars.map((b, i) => {
        const p = ease(frame, start + i * stagger, riseFrames, expoOut);
        return <Stack key={i} value={b.value} axisMax={axisMax} maxNotes={maxNotes} kind={kind} color={b.color ?? noteColor} x={barX(i, n)} p={p} seed={seed + i * 13} />;
      })}
      <ContactShadows position={[0, 0.004, 0]} opacity={0.5} scale={14} blur={2.2} far={5} resolution={512} color="#5a4328" />
      {tiltShift ? (
        <EffectComposer multisampling={0}>
          <TiltShift2 blur={0.35} taper={0.55} start={[0, 0.5]} end={[1, 0.5]} samples={12} direction={[0, 1]} />
        </EffectComposer>
      ) : null}
    </>
  );
};

/**
 * 3D bar chart where each bar is a stack of notes or coins; heights are exactly value/axisMax * BAR_MAX_HEIGHT.
 * One key light, soft contact shadows, a plinth and a back wall with axis ticks, labels anchored in 3D,
 * a tilt-shift band and a dolly-and-orbit push (the native move). Render with `--gl=angle` on Windows.
 */
export const MoneyBars3D: React.FC<MoneyBars3DProps> = (props) => {
  const {width = 1080, height = 1920, push, labels = true, formatValue = (n) => String(n), formatTick, ink = '#1d1a16', fontFamily = 'Georgia, serif', bars, axisMax, start = 0, riseFrames = 26, stagger = 4, tickCount = 4} = props;
  const frame = useCurrentFrame();
  const cam = moneyCamera(frame, push);
  const n = bars.length;
  const span = n * SLOT + 1.4;
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} shadows="soft" camera={{position: cam.position, fov: cam.fov, near: 0.1, far: 120}} gl={{antialias: true, toneMapping: THREE.NoToneMapping}}>
        <Scene {...props} cam={cam} />
      </ThreeCanvas>
      {labels ? (
        <AbsoluteFill style={{pointerEvents: 'none', fontFamily, color: ink}}>
          {Array.from({length: tickCount}, (_, k0) => {
            const k = k0 + 1;
            const v = (k / tickCount) * axisMax;
            const q = projectPoint([-span / 2 + 0.12, (k / tickCount) * BAR_MAX_HEIGHT + 0.28, WALL_Z], cam, width, height);
            const a = ease(frame, start, 14, expoOut);
            return (
              <div key={k} style={{position: 'absolute', left: q.x, width: 260, top: q.y - 24, textAlign: 'left', fontSize: 38, opacity: 0.8 * a}}>
                {(formatTick ?? formatValue)(v)}
              </div>
            );
          })}
          {(() => {
            const tops = bars.map((b, i) => projectPoint([barX(i, n), barTopY(b.value, axisMax) + 0.55, 0], cam, width, height));
            const bases = bars.map((_, i) => projectPoint([barX(i, n), 0.05, DEPTH / 2 + 0.1], cam, width, height));
            const gaps = tops.slice(1).map((t, i) => t.x - tops[i].x);
            const minGap = gaps.length ? Math.min(...gaps) : 400;
            const GAP = 28;
            const widest = (texts: string[], size: number, weight: number): number => Math.max(...texts.map((t) => measureText(t, size, fontFamily, weight)));
            const vTexts = bars.map((b) => formatValue(b.value));
            const cTexts = bars.map((b) => b.label);
            let vSize = 54;
            while (vSize > 34 && widest(vTexts, vSize, 800) + GAP > minGap) vSize -= 2;
            const vStagger = widest(vTexts, vSize, 800) + GAP > minGap;
            let cSize = 40;
            while (cSize > 28 && widest(cTexts, cSize, 400) + GAP > minGap) cSize -= 2;
            return bars.map((b, i) => {
              const a = ease(frame, start + i * stagger + riseFrames - 8, 8, expoOut);
              const lift = vStagger && i % 2 === 1 ? vSize * 1.15 : 0;
              return (
                <React.Fragment key={b.label}>
                  <div style={{position: 'absolute', left: tops[i].x - 160, width: 320, top: tops[i].y - 30 - lift, textAlign: 'center', fontWeight: 800, fontSize: vSize, opacity: a, transform: `translateY(${(1 - a) * 16}px)`}}>
                    {vTexts[i]}
                  </div>
                  <div style={{position: 'absolute', left: bases[i].x - 130, width: 260, top: bases[i].y + 8, textAlign: 'center', fontSize: cSize, opacity: ease(frame, start, 14, expoOut)}}>{cTexts[i]}</div>
                </React.Fragment>
              );
            });
          })()}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
