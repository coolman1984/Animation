// CAMERA STUDY — one operator for a whole sequence (lib/cinema.js choreography).
// Shot A: macro discovery across the sphere's edge, opening up. Hard cut at 2.0 s to a wide side view
// that INHERITS the outgoing truck velocity (handoff), flows through keys (cameraSpline, no dead stops),
// lets a foreground column pass, focus-tracks to the sphere and settles with weight for the copy.
// Unbranded geometric set built in code; resolution-independent (all sizes from W/H).
import { el } from '../../lib/motion.js';
import { cameraSpline, moves, choreography, focusTrack, composeCamera, handheld } from '../../lib/cinema.js';
import { depthScene, contactShadow, projectLayer, PLANES } from '../../lib/depth.js';
import { textBlock, reveal } from '../../lib/typography.js';
import { curves } from '../../lib/kinetics.js';

const C = { plaster: '#E7E1D6', plasterDk: '#CFC6B6', ink: '#27323A', terracotta: '#C2593A', terraDk: '#7E3220', sky: '#A9BCC6' };
let W, H, u, A, B, film, shadowA, shadowB, title, caption;

function set(ds, sphereScale) {
  const wall = ds.add('wall', { width: W * 1.8, height: H * 1.6, depth: 0.3, cover: true, z: 0 });
  wall.style.background = `linear-gradient(180deg, ${C.sky} 0%, ${C.plaster} 46%, ${C.plasterDk} 100%)`;
  const floor = ds.add('floor', { width: W * 2.4, height: H * 0.5, y: H * 0.9, depth: 0.9, z: 1 });
  floor.style.background = `linear-gradient(180deg, ${C.plasterDk}, #B8AE9C)`;
  for (const [i, x, d] of [[0, 0.12, 0.55], [1, 0.36, 0.55], [2, 0.88, 0.55], [3, 0.7, 0.75]]) {
    const col = ds.add(`col${i}`, { width: u * 9, height: H * 1.5, x: W * x, y: H * 0.55, depth: d, z: 2 });
    col.style.background = `linear-gradient(90deg, ${C.plasterDk}, ${C.plaster} 35%, #DDD5C8 70%, #BFB5A3)`;
  }
  const base = ds.add('plinthShadow', { width: u * 40, height: u * 5, x: W * 0.54, y: H * 0.74 + u * 15, depth: PLANES.hero, z: 2 });
  base.style.background = 'radial-gradient(closest-side, rgba(60,45,35,0.45), rgba(60,45,35,0))';
  const plinth = ds.add('plinth', { width: u * 26, height: u * 30, x: W * 0.54, y: H * 0.74, depth: PLANES.hero, z: 3 });
  plinth.style.background = `linear-gradient(90deg, #D8D0C2, ${C.plaster} 40%, #C9BFAE)`;
  const sphere = ds.add('sphere', { width: u * 22 * sphereScale, height: u * 22 * sphereScale, x: W * 0.54, y: H * 0.74 - u * 15 - u * 11 * sphereScale, depth: PLANES.hero, z: 4 });
  Object.assign(sphere.style, { borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, #E58A63 0%, ${C.terracotta} 38%, ${C.terraDk} 100%)`, boxShadow: `inset -${u * 2}px -${u * 2}px ${u * 4}px rgba(40,10,4,0.35)` });
  const fg = ds.add('fgcol', { width: u * 16, height: H * 1.3, x: W * 0.2, y: H * 0.5, depth: PLANES.foreground, z: 6 });
  fg.style.background = `linear-gradient(90deg, #8F877A, #B3AA9B 50%, #857D70)`;
  return ds;
}

export default {
  duration: 5, fps: 30,
  init(stage, { W: w, H: h }) {
    W = w; H = h; u = Math.min(w, h) / 100;
    stage.style.background = C.plaster;
    A = set(depthScene(stage, { w, h, atmosphere: { density: 0.3 } }), 1);
    shadowA = contactShadow(A.root, { width: u * 30, height: u * 3.4, color: '#4A3A2E', z: 3 });
    B = set(depthScene(stage, { w, h, atmosphere: { density: 0.3 } }), 1);
    shadowB = contactShadow(B.root, { width: u * 30, height: u * 3.4, color: '#4A3A2E', z: 3 });
    const sx = W * 0.54, sy = H * 0.74 - u * 26; // sphere centre at zoom 1
    // Camera pan targets are offsets from frame centre (depth-1 plane).
    const aim = (x, y, zoom) => ({ x: x - W / 2, y: y - H / 2, zoom });
    const shotA = moves.macroDiscovery({ start: 0, end: 2.3, waypoints: [[sx - u * 9 - W / 2, sy - u * 6 - H / 2], [sx - W / 2, sy - u * 10 - H / 2], [sx + u * 7 - W / 2, sy - u * 4 - H / 2]], zoom: 3.2, settleZoom: 2.1, open: 0.5 });
    const shotB = t => cameraSpline([
      { t: 2.0, ...aim(W * 0.44, H * 0.52, 1.18) },
      { t: 3.1, ...aim(W * 0.52, H * 0.55, 1.1) },
      { t: 4.2, ...aim(W * 0.56, H * 0.56, 1.06), hold: true },
      { t: 5.0, ...aim(W * 0.565, H * 0.56, 1.055) },
    ], t);
    film = choreography([
      { id: 'macro', start: 0, end: 2.0, camera: t => ({ ...shotA(t), ...focusTrack(t, () => 1, { aperture: 6 }) }) },
      { id: 'reveal', start: 2.0, end: 5.0, camera: t => ({ ...shotB(t), ...focusTrack(t, s => (s < 2.6 ? PLANES.foreground : PLANES.hero), { aperture: 14, lag: { duration: 0.6 } }) }), handoff: { duration: 0.7, scale: 0.4 } },
    ]);
    title = textBlock(stage, 'حركة واحدة، بقصد', { left: '0', width: W + 'px', top: H * 0.1 + 'px', fontFamily: 'El Messiri', fontWeight: 600, fontSize: u * 7.5 + 'px', color: C.ink, zIndex: 20 }, { by: 'word' });
    caption = textBlock(stage, 'CAMERA STUDY · HANDOFF · SETTLE', { left: '0', width: W + 'px', top: H * 0.1 + u * 11 + 'px', fontFamily: 'Montserrat', fontWeight: 500, fontSize: u * 2.2 + 'px', letterSpacing: '0.18em', color: C.terraDk, zIndex: 20 }, { by: 'word' });
  },
  camera(t) { return film.at(t); },
  render(t) {
    const cam = composeCamera(film.at(t), handheld(t, { seed: 4, amplitude: u * 0.15, frequency: 0.4, zoom: 0.0008 }));
    const inA = t < 2.0;
    A.root.style.display = inA ? 'block' : 'none'; B.root.style.display = inA ? 'none' : 'block';
    const ds = inA ? A : B, sh = inA ? shadowA : shadowB;
    ds.render(cam);
    const ground = projectLayer({ width: 1, height: 1, x: W * 0.54, y: H * 0.74 - u * 15, depth: PLANES.hero }, cam, { w: W, h: H });
    sh({ x: ground.x, y: ground.y, scale: ground.scale });
    reveal(title, t, { tIn: 3.55, style: 'mask', stagger: 0.09, dur: 0.8, curve: curves.emphasized });
    reveal(caption, t, { tIn: 3.9, style: 'fade', stagger: 0.05, dur: 0.6 });
  },
};
