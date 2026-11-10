import React, {useLayoutEffect, useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {ContactShadows} from '@react-three/drei';
import {EffectComposer, TiltShift2} from '@react-three/postprocessing';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ease, expoOut, rng} from '../easing';

export type MoneyBar = {
  label: string;
  value: number;
  /** Note or coin colour; the highlighted bar gets the video's accent. */
  color?: string;
};

export type CameraSpec = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export type MoneyBars3DProps = {
  bars: MoneyBar[];
  /** Value at the top of the axis. A bar of value == axisMax is exactly BAR_MAX_HEIGHT tall. */
  axisMax: number;
  width?: number;
  height?: number;
  kind?: 'notes' | 'coins';
  /** Notes (or coins) per axis unit; the stack is value/axisMax * maxNotes high, rounded up. */
  maxNotes?: number;
  start?: number;
  riseFrames?: number;
  /** Frames between bars starting. */
  stagger?: number;
  noteColor?: string;
  groundColor?: string;
  background?: string;
  tiltShift?: boolean;
  /** Slow orbit in radians over `orbitFrames`. */
  orbit?: number;
  orbitFrames?: number;
  seed?: number;
  tickCount?: number;
};

export const BAR_MAX_HEIGHT = 5;
const SLOT = 1.45;

const defaultCamera: CameraSpec = {position: [0, 6.2, 14.5], target: [0, 2.9, 0], fov: 42};

export const cameraAt = (orbit: number, t: number, base: CameraSpec = defaultCamera): CameraSpec => {
  const a = orbit * t;
  const [x, y, z] = base.position;
  const nx = x * Math.cos(a) + z * Math.sin(a);
  const nz = -x * Math.sin(a) + z * Math.cos(a);
  return {position: [nx, y, nz], target: base.target, fov: base.fov};
};

/** Screen position (px) of a world point for a camera spec: place HTML labels over the 3D scene. */
export const projectPoint = (p: [number, number, number], cam: CameraSpec, width: number, height: number): {x: number; y: number} => {
  const c = new THREE.PerspectiveCamera(cam.fov, width / height, 0.1, 100);
  c.position.set(...cam.position);
  c.lookAt(...cam.target);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(c);
  return {x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height};
};

export const barX = (i: number, n: number): number => (i - (n - 1) / 2) * SLOT;

export const barTopY = (value: number, axisMax: number): number => (value / axisMax) * BAR_MAX_HEIGHT;

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
  const notes = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: n}, () => ({dx: (r() - 0.5) * 0.05, dz: (r() - 0.5) * 0.05, yaw: (r() - 0.5) * 0.07}));
  }, [n, seed]);
  const base = useMemo(() => new THREE.Color(color), [color]);
  const alt = useMemo(() => base.clone().multiplyScalar(0.9), [base]);
  const lit = Math.max(0, p) * n;
  return (
    <group position={[x, 0, 0]}>
      {notes.map((nt, i) => {
        const vis = Math.min(1, Math.max(0, lit - i));
        if (vis <= 0) return null;
        const th = t * vis;
        return (
          <mesh key={i} position={[nt.dx, i * t + th / 2, nt.dz]} rotation={[0, nt.yaw, 0]} scale={[1, th, 1]} castShadow receiveShadow>
            {kind === 'notes' ? <boxGeometry args={[1.0, 1, 0.5]} /> : <cylinderGeometry args={[0.45, 0.45, 1, 36]} />}
            <meshStandardMaterial color={i % 2 === 0 ? base : alt} roughness={kind === 'coins' ? 0.38 : 0.82} metalness={kind === 'coins' ? 0.55 : 0} />
          </mesh>
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
  groundColor = '#e6d6b6',
  background = '#efe6d2',
  tiltShift = false,
  seed = 3,
  tickCount = 4,
  cam,
}) => {
  const frame = useCurrentFrame();
  const n = bars.length;
  const span = n * SLOT + 1.6;
  const ticks = Array.from({length: tickCount + 1}, (_, k) => (k / tickCount) * BAR_MAX_HEIGHT);
  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 28, 48]} />
      <Rig cam={cam} />
      <ambientLight intensity={0.9} color="#fff3de" />
      <directionalLight
        position={[-5, 9, 6]}
        intensity={2.5}
        color="#fff0d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={groundColor} roughness={1} />
      </mesh>
      {ticks.map((y, k) => (
        <mesh key={k} position={[0, y, -1.3]}>
          <boxGeometry args={[span, 0.02, 0.01]} />
          <meshBasicMaterial color={k === 0 ? '#5b4a35' : '#b8a684'} />
        </mesh>
      ))}
      {bars.map((b, i) => {
        const p = ease(frame, start + i * stagger, riseFrames, expoOut);
        return <Stack key={i} value={b.value} axisMax={axisMax} maxNotes={maxNotes} kind={kind} color={b.color ?? noteColor} x={barX(i, n)} p={p} seed={seed + i * 13} />;
      })}
      <ContactShadows position={[0, 0.002, 0]} opacity={0.4} scale={16} blur={2.8} far={4.5} resolution={512} color="#5a4328" />
      {tiltShift ? (
        <EffectComposer multisampling={0}>
          <TiltShift2 blur={0.22} taper={0.5} start={[0.5, 0.42]} end={[0.5, 0.62]} samples={12} />
        </EffectComposer>
      ) : null}
    </>
  );
};

/**
 * 3D bar chart where each bar is a stack of notes or coins. Heights are exactly value/axisMax * BAR_MAX_HEIGHT.
 * One key light, soft contact shadows, warm ground. Render with `--gl=angle` on Windows.
 */
export const MoneyBars3D: React.FC<MoneyBars3DProps> = (props) => {
  const {width = 1080, height = 1920, orbit = 0.35, orbitFrames = 240} = props;
  const frame = useCurrentFrame();
  const cam = cameraAt(orbit, Math.min(1, frame / orbitFrames));
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows="soft"
      camera={{position: cam.position, fov: cam.fov, near: 0.1, far: 100}}
      gl={{antialias: true, toneMapping: THREE.NoToneMapping}}
    >
      <Scene {...props} cam={cam} />
    </ThreeCanvas>
  );
};
