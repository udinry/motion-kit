import React, {useLayoutEffect} from 'react';
import {useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {EffectComposer, TiltShift2} from '@react-three/postprocessing';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';

export type BakedRace = {
  fps: number;
  frames: number;
  tiltDeg: number;
  lane: {width: number; length: number; finishZ: number; pegs: {x: number; z: number; r: number}[]};
  marbles: {id: number; color: string; radius: number; finishFrame: number; frames: number[][]}[];
  finish: {order: number[]; winner: number; winnerFrame: number};
  hits: {frame: number; a: number; b: number; speed: number}[];
};

type Props = {
  race: BakedRace;
  width?: number;
  height?: number;
  /** Playback speed: 0.4 gives the slow-mo into the finish. */
  rate?: number;
  /** Frame offset into the baked race. */
  offset?: number;
  background?: string;
  laneColor?: string;
  tiltShift?: boolean;
};

const Cam: React.FC<{pos: [number, number, number]; target: [number, number, number]}> = ({pos, target}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.fov = 42;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
    invalidate();
  });
  return null;
};

/** Plays a race baked by tools/bake-marbles.mjs. Pure lookup by frame: no simulation at render time. */
export const BakedMarbles: React.FC<Props> = ({race, width = 1080, height = 1920, rate = 1, offset = 0, background = '#efe6d2', laneColor = '#dcc79e', tiltShift = true}) => {
  const frame = useCurrentFrame();
  const idx = Math.max(0, Math.min(race.frames - 1, Math.floor(frame * rate + offset)));
  const th = (race.tiltDeg * Math.PI) / 180;
  const pts = race.marbles.map((m) => m.frames[idx]);
  const lead = pts.reduce((a, p) => (p[2] > a[2] ? p : a), pts[0]);
  const avg = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  const focus: [number, number, number] = [avg[0] * 0.3, avg[1], lerp(avg[2], lead[2], 0.8) - 1];
  const camPos: [number, number, number] = [0, focus[1] + 15, focus[2] - 19];
  const {width: W, length: L, finishZ, pegs} = race.lane;
  return (
    <ThreeCanvas width={width} height={height} shadows="soft" camera={{position: camPos, fov: 42, near: 0.1, far: 150}} gl={{antialias: true, toneMapping: THREE.NoToneMapping}}>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 30, 70]} />
      <Cam pos={camPos} target={focus} />
      <ambientLight intensity={0.95} color="#fff3de" />
      <directionalLight position={[-8, 16, -4]} intensity={2.6} color="#fff0d6" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-bias={-0.0004} />
      <group rotation={[th, 0, 0]}>
        <mesh position={[0, -0.25, L / 2]} receiveShadow>
          <boxGeometry args={[W + 1, 0.5, L + 4]} />
          <meshStandardMaterial color={laneColor} roughness={0.95} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (W / 2 + 0.25), 0.6, L / 2]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 1.8, L + 4]} />
            <meshStandardMaterial color="#c9b48a" roughness={0.95} />
          </mesh>
        ))}
        {pegs.map((p, i) => (
          <mesh key={i} position={[p.x, 0.6, p.z]} castShadow receiveShadow>
            <cylinderGeometry args={[p.r, p.r, 1.2, 28]} />
            <meshStandardMaterial color="#9c7f55" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0.01, finishZ]}>
          <boxGeometry args={[W, 0.02, 0.5]} />
          <meshStandardMaterial color="#1d1a16" roughness={1} />
        </mesh>
      </group>
      {race.marbles.map((m) => {
        const f = m.frames[idx];
        return (
          <mesh key={m.id} position={[f[0], f[1], f[2]]} quaternion={new THREE.Quaternion(f[3], f[4], f[5], f[6])} castShadow>
            <sphereGeometry args={[m.radius, 32, 24]} />
            <meshStandardMaterial color={m.color} roughness={0.28} metalness={0.1} />
          </mesh>
        );
      })}
      {tiltShift ? (
        <EffectComposer multisampling={0}>
          <TiltShift2 blur={0.35} taper={0.55} start={[0, 0.45]} end={[1, 0.45]} samples={12} direction={[0, 1]} />
        </EffectComposer>
      ) : null}
    </ThreeCanvas>
  );
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
