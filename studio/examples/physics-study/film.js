// PHYSICS STUDY — easing versus a baked rigid body world (lib/physics.mjs).
// Left: the same three objects (box, sphere, a stack) dropped with the studio's easing,
// an overshoot and two bounces, staying one rigid group. Right: the same start pose
// after one Rapier bake (1/120). render(t) only samples that bake, so frame order
// cannot change the picture. Needs config.gpu (software WebGL) and setup physics.
// Without Rapier the right column is the labelled Euler preview, not a delivery.
import * as THREE from 'three';
import { textLine, ease, lerp } from '../../lib/motion.js';
import { bake, sample, STEP_120 } from '../../lib/physics.mjs';

const LEFT = -1.35, RIGHT = 1.35, DROP = 1.7;
const pieces = [
  { id: 'box', shape: 'cuboid', args: [0.26, 0.26, 0.26], at: [-0.62, 0.26, 0], color: '#E2A84A', restitution: 0.45, friction: 0.4 },
  { id: 'ball', shape: 'ball', args: [0.28], at: [0.02, 0.28, 0.04], color: '#6AA8C4', restitution: 0.62, friction: 0.22 },
  { id: 's0', shape: 'cuboid', args: [0.30, 0.10, 0.20], at: [0.62, 0.10, 0], rot: [0.02, 0.18, 0.06], color: '#C4623A', restitution: 0.06, friction: 0.78 },
  { id: 's1', shape: 'cuboid', args: [0.28, 0.10, 0.20], at: [0.72, 0.32, 0.03], rot: [0.1, -0.12, 0.14], color: '#D4784C', restitution: 0.06, friction: 0.74 },
  { id: 's2', shape: 'cuboid', args: [0.26, 0.10, 0.18], at: [0.54, 0.54, -0.03], rot: [-0.08, 0.22, -0.12], color: '#B85A38', restitution: 0.06, friction: 0.7 },
  { id: 's3', shape: 'cuboid', args: [0.22, 0.10, 0.16], at: [0.66, 0.78, 0.04], rot: [0.14, 0.04, 0.2], color: '#E0895C', restitution: 0.05, friction: 0.66 },
];

function quatFromEuler(x, y, z) {
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2), cy = Math.cos(y / 2), sy = Math.sin(y / 2), cz = Math.cos(z / 2), sz = Math.sin(z / 2);
  return [sx * cy * cz - cx * sy * sz, cx * sy * cz + sx * cy * sz, cx * cy * sz - sx * sy * cz, cx * cy * cz + sx * sy * sz];
}

// Hand-tuned drop: ease-out cubic into the floor, then outBack rebounds (overshoot) and two smaller bounces.
function heightAbove(t) {
  const u = t - 0.08;
  if (u <= 0) return DROP;
  const keys = [
    [0, DROP],
    [0.5, 0, ease.outCubic],
    [0.72, DROP * 0.18, ease.outBack],
    [0.96, 0, ease.outCubic],
    [1.16, DROP * 0.05, ease.outBack],
    [1.4, 0, ease.outCubic],
  ];
  if (u >= keys[keys.length - 1][0]) return 0;
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      const [t0, y0] = keys[i - 1], [t1, y1, fn] = keys[i];
      return Math.max(0, lerp(y0, y1, (fn || ease.outCubic)((u - t0) / (t1 - t0))));
    }
  }
  return 0;
}

function meshFor(piece) {
  const geo = piece.shape === 'ball'
    ? new THREE.SphereGeometry(piece.args[0], 32, 20)
    : new THREE.BoxGeometry(piece.args[0] * 2, piece.args[1] * 2, piece.args[2] * 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: piece.color, roughness: 0.42, metalness: 0.08 }));
  mesh.position.set(piece.at[0], piece.at[1], piece.at[2]);
  if (piece.rot) { const q = quatFromEuler(...piece.rot); mesh.quaternion.set(q[0], q[1], q[2], q[3]); }
  return mesh;
}

const spec = {
  gravity: [0, -9.81, 0], step: STEP_120, duration: 4,
  ground: { hx: 6, hy: 0.25, hz: 4, y: -0.25, friction: 0.9, restitution: 0.12 },
  bodies: pieces.map((p) => ({
    id: p.id, type: 'dynamic', shape: p.shape, args: p.args,
    position: [RIGHT + p.at[0], p.at[1] + DROP, p.at[2]],
    rotation: p.rot ? quatFromEuler(...p.rot) : [0, 0, 0, 1],
    restitution: p.restitution, friction: p.friction, density: 1.2, canSleep: true,
  })),
};

let renderer, scene, camera, left, rightMeshes, readout, clip;
export default {
  duration: 4, fps: 30,
  async init(stage, { W, H }) {
    clip = await bake(spec);
    stage.style.background = '#1A1410';
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px' });
    stage.appendChild(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#1A1410');
    camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 50);
    camera.position.set(0, 2.05, 8.6); camera.lookAt(0, 0.85, 0);
    scene.add(new THREE.HemisphereLight('#F3E6D4', '#2A211C', 0.95));
    const key = new THREE.DirectionalLight('#FFF6EA', 1.7); key.position.set(3.2, 5.4, 4); scene.add(key);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 3.6), new THREE.MeshStandardMaterial({ color: '#3A3128', roughness: 0.92 }));
    floor.position.y = -0.04; scene.add(floor);
    const lane = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 3.1), new THREE.MeshStandardMaterial({ color: '#6A5646', roughness: 0.8 }));
    lane.position.y = 0.01; scene.add(lane);
    left = new THREE.Group(); left.position.x = LEFT; scene.add(left);
    rightMeshes = {};
    for (const piece of pieces) { left.add(meshFor(piece)); rightMeshes[piece.id] = meshFor(piece); scene.add(rightMeshes[piece.id]); }
    const label = { fontFamily: "'Alexandria'", fontWeight: '650', fontSize: `${Math.round(H * 0.04)}px`, color: '#F4EFE6', zIndex: '5', justifyContent: 'center' };
    textLine(stage, 'تسهيل', { left: '0', top: `${Math.round(H * 0.045)}px`, width: '50%', ...label });
    textLine(stage, clip.engine === 'rapier' ? 'فيزياء' : 'معاينة تقريبية', { left: '50%', top: `${Math.round(H * 0.045)}px`, width: '50%', ...label });
    const word = clip.engine === 'rapier' ? 'رابير' : 'preview';
    readout = textLine(stage, `الزمن 0.00 ث ${word} ${clip.hash.slice(0, 8)}`, {
      left: '0', top: `${Math.round(H * 0.9)}px`, width: `${W}px`, justifyContent: 'center',
      fontFamily: "'Alexandria'", fontWeight: '500', fontSize: `${Math.round(H * 0.028)}px`, color: '#F4EFE6', zIndex: '5',
    });
  },
  render(t) {
    left.position.y = heightAbove(t);
    const pose = sample(clip, t);
    for (const piece of pieces) {
      const b = pose.bodies[piece.id], m = rightMeshes[piece.id];
      m.position.set(b.p[0], b.p[1], b.p[2]);
      m.quaternion.set(b.q[0], b.q[1], b.q[2], b.q[3]);
    }
    readout.words[1].textContent = t.toFixed(2);
    renderer.render(scene, camera);
  },
};
