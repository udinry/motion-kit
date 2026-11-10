// Simulate a marble race once from a seed with Rapier (the engine under @react-three/rapier) and write the
// per-frame transforms, so the Remotion render is a pure lookup by frame number.
//
//   node tools/bake-marbles.mjs --seed 7 --marbles 8 --fps 30 --out demo/src/marbles.json
//
// Re-roll seeds until the race is exciting; `finish.order` and `hits` tell you who wins and where the big
// collisions are (use them for hit-stop and sound). Output is world space; the lane is tilted by tiltDeg
// about the x axis, so render the lane group with the same rotation.
import fs from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
};
const seed = Number(arg('seed', 7));
const nMarbles = Number(arg('marbles', 8));
const fps = Number(arg('fps', 30));
const out = arg('out', 'marbles.json');
const maxSeconds = Number(arg('max', 14));
const tiltDeg = Number(arg('tilt', 14));
const COLORS = (arg('colors', '#c8452d,#e0a43a,#5f8f6a,#3f6f9e,#8a5a9e,#2f2a24,#d77f9c,#6aa6a0')).split(',');

const mulberry = (s) => {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const rnd = mulberry(seed);

await RAPIER.init();
const world = new RAPIER.World({x: 0, y: -9.81, z: 0});
world.timestep = 1 / 60;

const W = 8;
const L = 46;
const th = (tiltDeg * Math.PI) / 180;
const rotQ = {x: Math.sin(th / 2), y: 0, z: 0, w: Math.cos(th / 2)};
const rot = (v) => ({x: v.x, y: v.y * Math.cos(th) - v.z * Math.sin(th), z: v.y * Math.sin(th) + v.z * Math.cos(th)});

const fixedBox = (local, half) => {
  const p = rot(local);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x, p.y, p.z).setRotation(rotQ));
  world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setFriction(0.5).setRestitution(0.4), body);
};
fixedBox({x: 0, y: -0.25, z: L / 2}, {x: W / 2 + 0.5, y: 0.25, z: L / 2 + 2});
fixedBox({x: -(W / 2 + 0.25), y: 0.6, z: L / 2}, {x: 0.25, y: 0.9, z: L / 2 + 2});
fixedBox({x: W / 2 + 0.25, y: 0.6, z: L / 2}, {x: 0.25, y: 0.9, z: L / 2 + 2});
fixedBox({x: 0, y: 0.6, z: -1.5}, {x: W / 2 + 0.5, y: 0.9, z: 0.25});

const pegs = [];
for (let z = 8; z < L - 9; z += 3.4) {
  const row = Math.round((z - 8) / 3.4);
  const count = row % 2 === 0 ? 3 : 2;
  for (let k = 0; k < count; k++) {
    const x = ((k + (row % 2 === 0 ? 0.5 : 1)) / (count + (row % 2 === 0 ? 0 : 1)) - 0.5) * (W - 1.2) * 1.0 + (rnd() - 0.5) * 0.5;
    const pz = z + (rnd() - 0.5) * 0.8;
    pegs.push({x: Number(x.toFixed(3)), z: Number(pz.toFixed(3)), r: 0.34});
    const p = rot({x, y: 0.6, z: pz});
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x, p.y, p.z).setRotation(rotQ));
    world.createCollider(RAPIER.ColliderDesc.cylinder(0.6, 0.34).setRestitution(0.55).setFriction(0.3).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
  }
}

const R = 0.45;
const marbles = [];
for (let i = 0; i < nMarbles; i++) {
  const x = ((i + 0.5) / nMarbles - 0.5) * (W - 1.4) + (rnd() - 0.5) * 0.25;
  const z = 1 + rnd() * 1.2;
  const p = rot({x, y: R + 0.05, z});
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setLinvel((rnd() - 0.5) * 0.8, 0, 0).setCcdEnabled(true).setLinearDamping(0.04).setAngularDamping(0.05),
  );
  const col = world.createCollider(
    RAPIER.ColliderDesc.ball(R).setRestitution(0.55).setFriction(0.35).setDensity(1).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    body,
  );
  marbles.push({id: i, color: COLORS[i % COLORS.length], radius: R, body, handle: col.handle, frames: [], finished: -1});
}
const byHandle = new Map(marbles.map((m) => [m.handle, m]));
const queue = new RAPIER.EventQueue(true);
const hits = [];
const finishZ = L - 3;
const inv = (v) => ({x: v.x, y: v.y * Math.cos(th) + v.z * Math.sin(th), z: -v.y * Math.sin(th) + v.z * Math.cos(th)});

const steps = Math.round(60 / fps);
const total = Math.round(maxSeconds * fps);
let frame = 0;
for (; frame < total; frame++) {
  for (let s = 0; s < steps; s++) {
    world.step(queue);
    queue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const a = byHandle.get(h1);
      const b = byHandle.get(h2);
      const m = a ?? b;
      if (!m) return;
      const v = m.body.linvel();
      const speed = Math.hypot(v.x, v.y, v.z);
      hits.push({frame, a: a ? a.id : -1, b: b ? b.id : -1, speed: Number(speed.toFixed(2)), marble: m.id});
    });
  }
  for (const m of marbles) {
    const t = m.body.translation();
    const q = m.body.rotation();
    m.frames.push([t.x, t.y, t.z, q.x, q.y, q.z, q.w].map((v) => Number(v.toFixed(4))));
    const lz = inv(t).z;
    if (m.finished < 0 && lz >= finishZ) m.finished = frame;
  }
  const firstDone = marbles.reduce((a, m) => (m.finished >= 0 ? Math.min(a, m.finished) : a), 1e9);
  if (marbles.every((m) => m.finished >= 0) ? frame > marbles.reduce((a, m) => Math.max(a, m.finished), 0) + fps : frame > firstDone + 3 * fps) {
    frame++;
    break;
  }
}

const order = [...marbles].sort((a, b) => (a.finished < 0 ? 1e9 : a.finished) - (b.finished < 0 ? 1e9 : b.finished)).map((m) => m.id);
const bigHits = hits.filter((h) => h.speed > 4 && h.a !== -1 && h.b !== -1).sort((a, b) => b.speed - a.speed).slice(0, 12).sort((a, b) => a.frame - b.frame);
const result = {
  seed,
  fps,
  frames: frame,
  tiltDeg,
  lane: {width: W, length: L, finishZ, pegs},
  marbles: marbles.map((m) => ({id: m.id, color: m.color, radius: m.radius, finishFrame: m.finished, frames: m.frames})),
  finish: {order, winner: order[0], winnerFrame: marbles[order[0]].finished},
  hits: bigHits,
  collisions: hits.length,
};
fs.writeFileSync(out, JSON.stringify(result));
console.log(`seed ${seed}: ${frame} frames, winner marble ${order[0]} at frame ${result.finish.winnerFrame}, order ${order.join(',')}, ${hits.length} contacts, ${bigHits.length} hard hits -> ${out}`);
