// STUDIO SHOWREEL — 15 s, 128 BPM, one ability per bar (bar = 1.875 s). Authored for 16:9; 9:16 is a real
// recomposition (F(wide, tall) values, its own safe band), not a crop. Pure render(t): every value derives
// from t (springs, staggers, falls and particles are closed-form). The vermilion dot is the protagonist:
// each hand-off carries a shape into the next section (see BRIEF.md). The BPM shown is measured from this
// film's own score (music.musicmap.json); the money value is read back from the captured fixture app.
import { el, clamp, lerp, ramp, show, grain } from '../lib/motion.js';
import { springStep, springTrack, staggerGrid, hash, curves, fbm } from '../lib/kinetics.js';
import { cameraSpline, focusTrack, composeCamera, handheld } from '../lib/cinema.js';
import { depthScene, projectLayer, contactShadow } from '../lib/depth.js';
import { applyTransition } from '../lib/transitions.js';
import { textBlock, reveal, fitBlock, highlight, counter } from '../lib/typography.js';
import { compose } from '../lib/layout.js';
import { particleField, burst } from '../lib/particles.js';
import { shaderLayer, SHADERS, rgb } from '../lib/gpu.js';
import { lineDraw, glowFilter } from '../lib/fx.js';
import { screenPlate, focusRing } from '../lib/screen.js';
import map from './music.musicmap.json' with { type: 'json' };
import capture from '../examples/app-film-study/capture/capture.json' with { type: 'json' };

const C = { ink: '#191920', paper: '#F2EEE6', red: '#FF4A2B', blue: '#2F4BFF', blueDk: '#18268F', night: '#0A0E33', app: '#F4F1EA' };
const BEAT = 60 / 128, BAR = 4 * BEAT, S = i => i * BAR;
const SECTIONS = [
  { en: 'KINETIC TYPE', ar: 'حركة الحروف', bg: C.ink, hud: C.paper },
  { en: 'PHYSICS', ar: 'فيزياء الحركة', bg: C.paper, hud: C.ink },
  { en: 'CAMERA + DEPTH', ar: 'كاميرا وعمق', bg: C.blue, hud: C.paper },
  { en: 'LIGHT + PARTICLES', ar: 'ضوء وجزيئات', bg: C.ink, hud: C.paper },
  { en: 'SOUND SYNC', ar: 'مزيكا مقاسة', bg: C.red, hud: C.ink },
  { en: 'EVERY FORMAT', ar: 'كل المقاسات', bg: C.paper, hud: C.ink },
  { en: 'REAL DATA', ar: 'بيانات حقيقية', bg: C.blue, hud: C.paper },
  { en: 'YOUR FILM', ar: 'فيلمك', bg: C.ink, hud: C.paper },
];
const CAPTURE = f => new URL(`../examples/app-film-study/capture/${f}`, import.meta.url).href;

let W, H, u, V, D, cy, stage, roots = [], overlay, hud = [], progress = [], grainAt;
const F = (wide, tall) => (V ? tall : wide);
const px = v => `${v}px`;
const div = (parent, style) => el('div', { style: { position: 'absolute', ...style } }, parent);
const kick = (t, at, dur = 0.32) => (t >= at ? 1 - springStep(t - at, { duration: dur, bounce: 0 }).value : 0); // 1 → 0 after a hit
const beatsIn = (a, b) => map.beats.filter(x => x >= a - 1e-6 && x < b);
const energyAt = t => { const c = map.curves, x = clamp(t / c.hop, 0, c.energy.length - 1), i = Math.floor(x), j = Math.min(i + 1, c.energy.length - 1); return c.energy[i] + (c.energy[j] - c.energy[i]) * (x - i); };
// Center a text block vertically on y once fonts are laid out (first render), keeping it inside its slot.
const centerOn = (B, y) => { if (B.centered) return; B.box.style.top = px(y - B.box.offsetHeight / 2); B.centered = true; B.lines = null; };

// =====================================================================================================
// 01 KINETIC TYPE — the thesis lands on frame one's dot.
const S1 = {};
function init1(root) {
  S1.head = textBlock(root, 'كل حركة محسوبة', { left: px(W / 2 - F(48, 44) * u), width: px(F(96, 88) * u), top: px(cy), fontFamily: 'El Messiri', fontWeight: 700,
    fontSize: px(F(15, 13) * u), lineHeight: 1.12, color: C.paper }, { align: 'center' });
  S1.head.words[2].span.style.color = C.red;
  S1.mark = highlight(S1.head, [2], { color: C.red, height: 0.07, offset: 1.02 });
  S1.dot = div(root, { width: px(3.4 * u), height: px(3.4 * u), borderRadius: '50%', background: C.red, left: '0', top: '0' });
}
function dotRest1() { // left of the headline's last word (end of the RTL line)
  const b = S1.head.words[2].outer.getBoundingClientRect();
  return [b.left - 3.2 * u, b.top + b.height * 0.62];
}
function render1(t) {
  if (!S1.fit) { fitBlock(S1.head, { maxWidth: F(96, 80) * u, maxHeight: F(20, 34) * u, max: F(15, 13) * u }); centerOn(S1.head, cy); S1.fit = true; S1.rest = dotRest1(); }
  reveal(S1.head, t, { tIn: 0.24, style: 'mask', stagger: 0.1, dur: 0.62, curve: curves.emphasized });
  S1.mark(t, { start: 0.95, dur: 0.4 });
  const p = springStep(t - 0.3, { duration: 0.62, bounce: 0.18 }).value;
  const x = lerp(W / 2, S1.rest[0], p), y = lerp(cy, S1.rest[1], p);
  // Frame one: the dot arrives huge on the opening impact and springs down to its working size.
  let s = lerp(4.2, 1, springStep(t, { duration: 0.5, bounce: 0.3 }).value);
  for (const b of [0.47, 0.94, 1.41]) s *= 1 + 0.22 * kick(t, b);
  s *= 1 - 0.18 * Math.sin(Math.PI * ramp(t, 1.5, 1.66)); // anticipation before the reveal grows out of it
  S1.dot.style.transform = `translate(${(x - 1.7 * u).toFixed(2)}px, ${(y - 1.7 * u).toFixed(2)}px) scale(${s.toFixed(4)})`;
  S1.center = [x, y];
}

// =====================================================================================================
// 02 PHYSICS — a grid springs in as a ripple, turns on the beat, falls away; the centre becomes the sphere.
const S2 = {};
const SPH = () => F(30, 34) * u;
function init2(root) {
  const cols = F(11, 5), rows = F(5, 9), cell = 7 * u, gap = 2.4 * u;
  const gw = cols * cell + (cols - 1) * gap, gh = rows * cell + (rows - 1) * gap;
  S2.cells = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = W / 2 - gw / 2 + i * (cell + gap) + cell / 2, y = cy - gh / 2 + j * (cell + gap) + cell / 2;
    const node = div(root, { left: px(x - cell / 2), top: px(y - cell / 2), width: px(cell), height: px(cell), borderRadius: px(1.4 * u), background: C.ink });
    S2.cells.push({ i, j, x, y, node, centre: i === (cols - 1) / 2 && j === (rows - 1) / 2 });
  }
  S2.cols = cols; S2.rows = rows; S2.cell = cell;
}
function render2(t) {
  const { cols, rows, cell } = S2, ci = (cols - 1) / 2, cj = (rows - 1) / 2;
  for (const c of S2.cells) {
    const d = staggerGrid(c.i, c.j, cols, rows, { from: [ci, cj], each: 0.032 });
    const sIn = springStep(t - (1.7 + d), { duration: 0.55, bounce: 0.42 }).value;
    let rot = 45 * springStep(t - (S(1) + BEAT + c.i * 0.022), { duration: 0.5, bounce: 0.35 }).value;
    let dx = 0, dy = 0, scale = sIn, size = cell, radius = 1.4 * u, color = C.ink;
    if (c.centre) {
      const grow = springStep(t - 2.88, { duration: 0.62, bounce: 0.22 }).value;
      scale *= 1 - 0.16 * Math.sin(Math.PI * ramp(t, 2.72, 2.9));
      size = lerp(cell, SPH(), grow); radius = lerp(1.4 * u, SPH() / 2, Math.min(1, grow * 1.4)); rot *= 1 - Math.min(1, grow);
      color = t >= S(1) + 2 * BEAT ? C.red : C.ink;
      dx = (W / 2 - c.x) * grow; dy = (cy - c.y) * grow;
    } else {
      const f0 = 2.9 + hash(c.i, c.j, 3) * 0.28, tau = Math.max(0, t - f0);
      dy = -12 * u * tau + 0.5 * 300 * u * tau * tau; dx = (hash(c.i, c.j, 5) - 0.5) * 30 * u * tau;
      rot += (hash(c.i, c.j, 7) - 0.5) * 520 * tau;
    }
    Object.assign(c.node.style, { width: px(size), height: px(size), left: px(c.x - size / 2), top: px(c.y - size / 2), borderRadius: px(radius), background: color,
      transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})` });
  }
}

// =====================================================================================================
// 03 CAMERA + DEPTH — the sphere becomes a lit object in a layered set; one operator pulls back through it.
const S3 = {};
function init3(root) {
  const ds = depthScene(root, { w: W, h: H, atmosphere: { density: 0.32 } });
  const wall = ds.add('wall', { width: W * 2, height: H * 1.8, depth: 0.3, z: 0 });
  wall.style.background = `linear-gradient(180deg, #4A63FF 0%, ${C.blue} 45%, ${C.blueDk} 100%)`;
  const floor = ds.add('floor', { width: W * 3, height: H * 0.7, y: H * F(0.97, 0.93), depth: 0.92, z: 1 });
  floor.style.background = `linear-gradient(180deg, #1B2A9C, ${C.night})`;
  for (const [k, fx, d] of [[0, -0.12, 0.5], [1, 0.16, 0.5], [2, 0.86, 0.5], [3, 1.1, 0.5], [4, 0.3, 0.72], [5, 0.74, 0.72]]) {
    const col = ds.add(`col${k}`, { width: 7 * u, height: H * 1.8, x: W * fx, y: H * 0.5, depth: d, z: 2 });
    col.style.background = 'linear-gradient(90deg, #9AA8FF, #D9DEFF 40%, #B8C2FF 75%, #8090F0)';
  }
  S3.sx = W * 0.5; S3.sy = H * F(0.6, 0.58); S3.ds = F(16, 20) * u;
  // Motivated light: a soft pool on the wall behind the sphere, and a horizon glow where the floor meets it.
  const pool = ds.add('pool', { width: W * 0.9, height: W * 0.9, x: S3.sx + W * 0.06, y: S3.sy - H * 0.1, depth: 0.34, z: 1, blend: 'screen' });
  pool.style.background = 'radial-gradient(closest-side, rgba(200,214,255,0.55), rgba(120,140,255,0.18) 55%, rgba(0,0,0,0))';
  const horizon = ds.add('horizon', { width: W * 3, height: H * 0.12, y: H * F(0.97, 0.93) - H * 0.35, depth: 0.9, z: 2, blend: 'screen' });
  horizon.style.background = 'linear-gradient(180deg, rgba(160,176,255,0.45), rgba(0,0,0,0))';
  const plinth = ds.add('plinth', { width: S3.ds * 1.25, height: H * 0.4, x: S3.sx, y: S3.sy + S3.ds / 2 + H * 0.2, depth: 1, z: 3 });
  plinth.style.background = 'linear-gradient(90deg, #C9CEEA, #F2EEE6 42%, #D8D9E8 70%, #AEB3D6)';
  S3.shadow = contactShadow(ds.root, { width: S3.ds * 1.1, height: S3.ds * 0.14, color: '#060A2A', z: 3 });
  const sphere = ds.add('sphere', { width: S3.ds, height: S3.ds, x: S3.sx, y: S3.sy, depth: 1, z: 4 });
  Object.assign(sphere.style, { borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, #FF9A80 0%, ${C.red} 36%, #B22410 100%)` });
  const fg = ds.add('fg', { width: 11 * u, height: H * 2, x: S3.sx - F(46, 30) * u, y: H * 0.5, depth: 1.8, z: 6 });
  fg.style.background = `linear-gradient(90deg, ${C.night}, #1A2380 55%, ${C.night})`;
  S3.scene = ds;
}
const aim3 = (sx, sy, X, Y, z) => ({ x: sx - W / 2 - (X - W / 2) / z, y: sy - H / 2 - (Y - H / 2) / z, zoom: z });
function cam3(t) {
  const z0 = SPH() / S3.ds;
  const base = cameraSpline([
    { t: S(2), ...aim3(S3.sx, S3.sy, W / 2, cy, z0), vzoom: -0.45 },
    { t: S(2) + 0.8, ...aim3(S3.sx, S3.sy, W * F(0.56, 0.5), H * F(0.57, 0.56), 1.22) },
    { t: S(2) + 1.5, ...aim3(S3.sx, S3.sy, W * F(0.62, 0.52), H * F(0.6, 0.58), 1.04) },
    { t: S(3) + 0.3, ...aim3(S3.sx, S3.sy, W * F(0.64, 0.53), H * F(0.6, 0.58), 1.0) },
  ], t);
  const focus = focusTrack(t, s => (s > S(2) + 0.85 && s < S(2) + 1.25 ? 1.8 : 1), { aperture: 9, lag: { duration: 0.22 } });
  return composeCamera({ ...base, ...focus, maxBlur: 2.4 * u }, handheld(t, { seed: 9, amplitude: 0.12 * u, frequency: 0.5, zoom: 0.0006 }));
}
function render3(t) {
  const cam = cam3(t);
  S3.scene.render(cam);
  const g = projectLayer({ width: 1, height: 1, x: S3.sx, y: S3.sy + S3.ds / 2, depth: 1 }, cam, { w: W, h: H });
  S3.shadow({ x: g.x, y: g.y, scale: g.scale });
}

// =====================================================================================================
// 04 LIGHT + PARTICLES — shader light, a ring that draws itself and ignites on beat 3, embers in depth.
const S4 = {};
function init4(root) {
  S4.field = shaderLayer(root, { w: W, h: H, fragment: SHADERS.colorField, scale: 0.4, z: 0 });
  S4.rays = shaderLayer(root, { w: W, h: H, fragment: SHADERS.rays, scale: 0.4, z: 1, blend: 'screen' });
  S4.dust = particleField(root, { w: W, h: H, preset: 'embers', seed: 31, count: 46, colors: ['rgba(255,120,80,0.9)', 'rgba(255,214,190,0.8)'], z: 2 });
  const R = F(16, 19) * u, size = R * 2 + 4 * u;
  S4.R = R;
  S4.svg = el('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { position: 'absolute', left: px(W / 2 - size / 2), top: px(cy - size / 2), zIndex: '3', overflow: 'visible' } }, root);
  S4.ring = el('circle', { cx: size / 2, cy: size / 2, r: R, fill: 'none', stroke: C.red, 'stroke-width': 0.8 * u, 'stroke-linecap': 'round', transform: `rotate(-90 ${size / 2} ${size / 2})` }, S4.svg);
  S4.inner = el('circle', { cx: size / 2, cy: size / 2, r: R * 0.62, fill: 'none', stroke: 'rgba(242,238,230,0.5)', 'stroke-width': 0.18 * u }, S4.svg);
  S4.sparks = burst(root, { w: W, h: H, x: W / 2, y: cy, t0: S(3) + 2 * BEAT, count: 110, speed: [28 * u, 95 * u], spread: 360, angle: 0, gravity: 18 * u, drag: 1.7,
    life: [0.6, 1.5], size: [0.18 * u, 0.42 * u], colors: ['#FFE2D8', '#FF7A55', C.red, '#FFFFFF'], seed: 17, z: 4, blend: 'screen' });
}
function render4(t) {
  const build = ramp(t, S(3), S(4));
  S4.field.render(t, { u_c0: rgb('#0B0B10'), u_c1: rgb('#131A63'), u_c2: rgb('#2A0E1A'), u_c3: rgb('#07081A'), u_amount: 0.35 + 0.2 * build });
  S4.rays.render(t, { u_origin: [0.82, 1.05], u_amount: 0.3 + 0.55 * build * build, u_color: rgb('#FFD3C4') });
  S4.dust.render(t, { x: 0, y: -build * 4 * u, zoom: 1 + 0.04 * build, focus: 1, aperture: 6 });
  lineDraw(S4.ring, curves.decelerate(ramp(t, S(3) + 0.06, S(3) + 0.7)));
  lineDraw(S4.inner, curves.decelerate(ramp(t, S(3) + 0.35, S(3) + 0.95)));
  let s = 1;
  for (const b of beatsIn(S(3), S(4))) s *= 1 + 0.06 * kick(t, b, 0.3);
  s *= 1 + 0.12 * kick(t, S(3) + 2 * BEAT, 0.5);
  S4.svg.style.transform = `scale(${s.toFixed(4)}) rotate(${(t - S(3)) * 30}deg)`;
  S4.svg.style.filter = glowFilter({ radius: 3.5 * u, color: 'rgba(255,74,43,0.85)', intensity: 0.25 + 0.75 * build });
  S4.sparks.render(t);
}

// =====================================================================================================
// 05 SOUND SYNC — bars and the BPM are driven by the measured music map, not by a guessed grid.
const S5 = {};
function init5(root) {
  const n = F(40, 24), x0 = D.x0, x1 = D.x1, gap = F(0.7, 0.9) * u, bw = (x1 - x0 - (n - 1) * gap) / n;
  S5.base = F(D.y1 - 7 * u, D.y1 - 6 * u); S5.hmax = F(34, 30) * u;
  S5.bars = Array.from({ length: n }, (_, i) => div(root, { left: px(x0 + i * (bw + gap)), top: px(S5.base - S5.hmax), width: px(bw), height: px(S5.hmax), background: C.ink, borderRadius: px(bw / 2), transformOrigin: '50% 100%' }));
  const bpm = Math.round(map.tempo.bpm);
  S5.bpm = bpm;
  S5.num = counter(root, { left: px(F(D.x0, W / 2 - 40 * u)), top: px(F(D.y0 + 7 * u, D.y0 + 6 * u)), width: px(F(60, 80) * u), textAlign: F('left', 'center'),
    fontFamily: 'Montserrat', fontWeight: 800, fontSize: px(F(21, 24) * u), lineHeight: 1, color: C.ink, letterSpacing: '-0.03em' }, { digits: 'latn' });
  S5.unit = textBlock(root, 'BPM', { left: px(F(D.x0 + 0.6 * u, 0)), width: px(F(30 * u, W)), top: px(F(D.y0 + 30 * u, D.y0 + 33 * u)), fontFamily: 'Montserrat', fontWeight: 700,
    fontSize: px(3.4 * u), letterSpacing: '0.34em', color: C.ink }, { align: F('left', 'center') });
  S5.line = textBlock(root, 'إيقاع متقاس… مش متخمّن', { left: px(F(W - D.x0 - 70 * u, 0)), width: px(F(70 * u, W)), top: px(F(D.y0 + 15 * u, D.y0 + 39 * u)), fontFamily: 'El Messiri', fontWeight: 700,
    fontSize: px(F(5.6, 5.4) * u), color: C.ink }, { align: F('right', 'center') });
}
function render5(t) {
  const n = S5.bars.length, e = energyAt(t), lastBeat = beatsIn(S(4) - 0.5, t + 1e-6).at(-1), pulse = lastBeat === undefined ? 0 : kick(t, lastBeat, 0.36);
  for (const [i, b] of S5.bars.entries()) {
    const win = Math.pow(Math.sin(Math.PI * (i + 0.5) / n), 0.55);
    const shape = 0.3 + 0.7 * (0.5 + 0.5 * fbm(i * 0.31, t * 2.4, { octaves: 2, seed: 11 }));
    const enter = springStep(t - (S(4) - 0.02 + Math.abs(i - (n - 1) / 2) * 0.012), { duration: 0.45, bounce: 0.4 }).value;
    const h = clamp(0.06 + e * shape * win * (0.55 + 0.45 * pulse), 0.04, 1) * enter;
    b.style.transform = `scaleY(${h.toFixed(4)})`;
  }
  S5.num.render(t, { start: S(4) + 0.05, end: S(4) + 0.85, from: 0, to: S5.bpm, curve: curves.decelerate, visible: t >= S(4) });
  S5.num.line.style.transform = `scale(${(1 + 0.05 * pulse).toFixed(4)})`; S5.num.line.style.transformOrigin = F('0% 60%', '50% 60%');
  reveal(S5.unit, t, { tIn: S(4) + 0.2, style: 'fade', stagger: 0, dur: 0.3 });
  reveal(S5.line, t, { tIn: S(4) + 0.45, style: 'mask', stagger: 0.07, dur: 0.55 });
}

// =====================================================================================================
// 06 EVERY FORMAT — one composition springs 16:9 → 1:1 → 9:16 and re-lays itself out; the 9:16 frame is the next phone.
const S6 = {};
const PHONE = () => { const w = F(30, 30) * u, h = w * 16 / 9; return { w, h, cx: F(W * 0.33, W / 2), cy: F(cy, D.y0 + 9 * u + h / 2) }; };
const SLOTS = {
  product: { wide: [0.56, 0.16, 0.34, 0.68], square: [0.27, 0.1, 0.46, 0.46], tall: [0.18, 0.1, 0.64, 0.36] },
  title: { wide: [0.08, 0.26, 0.4, 0.14], square: [0.12, 0.64, 0.76, 0.1], tall: [0.12, 0.54, 0.76, 0.07] },
  title2: { wide: [0.08, 0.46, 0.28, 0.09], square: [0.24, 0.78, 0.52, 0.06], tall: [0.2, 0.65, 0.6, 0.045] },
  cta: { wide: [0.08, 0.66, 0.18, 0.1], square: [0.36, 0.88, 0.28, 0.06], tall: [0.3, 0.8, 0.4, 0.06] },
};
function init6(root) {
  const ph = PHONE();
  S6.states = [
    { w: F(66, 82) * u, h: F(66, 82) * u * 9 / 16, cx: W / 2, cy: F(cy - 2 * u, D.y0 + 30 * u), t: 0, label: '16:9' },
    { w: F(46, 62) * u, h: F(46, 62) * u, cx: W / 2, cy: F(cy - 2 * u, D.y0 + 36 * u), t: S(5) + BEAT, label: '1:1' },
    { w: ph.w, h: ph.h, cx: ph.cx, cy: ph.cy, t: S(5) + 2 * BEAT, label: '9:16' },
  ];
  S6.frame = div(root, { left: '0', top: '0', border: `${0.45 * u}px solid ${C.ink}`, borderRadius: px(1.6 * u), boxSizing: 'border-box', overflow: 'hidden' });
  S6.items = { product: div(S6.frame, { borderRadius: '50%', background: C.red }), title: div(S6.frame, { background: C.ink, borderRadius: px(0.5 * u) }),
    title2: div(S6.frame, { background: 'rgba(11,11,16,0.35)', borderRadius: px(0.5 * u) }), cta: div(S6.frame, { background: C.blue, borderRadius: px(5 * u) }) };
  for (const s of S6.states) s.rects = compose(SLOTS, s.w, s.h, { safe: 'none' }).rects;
  S6.labels = S6.states.map((s, k) => textBlock(root, s.label, { left: px(s.cx - 20 * u), width: px(40 * u), top: px(s.cy + s.h / 2 + 2.2 * u), fontFamily: 'Montserrat', fontWeight: 800,
    fontSize: px(4.6 * u), letterSpacing: '0.04em', color: C.ink }, { align: 'center' }));
}
function frame6(t) {
  const sp = { duration: 0.42, bounce: 0.3 }, keys = f => S6.states.map(s => [s.t, f(s)]);
  return { w: springTrack(keys(s => s.w), t, sp), h: springTrack(keys(s => s.h), t, sp), cx: springTrack(keys(s => s.cx), t, sp), cy: springTrack(keys(s => s.cy), t, sp) };
}
function render6(t) {
  const f = frame6(t), enter = springStep(t - (S(5) - 0.12), { duration: 0.5, bounce: 0.3 }).value;
  Object.assign(S6.frame.style, { width: px(f.w), height: px(f.h), left: px(f.cx - f.w / 2), top: px(f.cy - f.h / 2), transform: `scale(${lerp(0.7, 1, enter).toFixed(4)})`, opacity: String(clamp(enter * 1.5)) });
  const sp = { duration: 0.42, bounce: 0.28 };
  for (const [name, node] of Object.entries(S6.items)) {
    const k = g => S6.states.map(s => [s.t, g(s.rects[name])]);
    const r = { x: springTrack(k(r => r.x), t, sp), y: springTrack(k(r => r.y), t, sp), w: springTrack(k(r => r.w), t, sp), h: springTrack(k(r => r.h), t, sp) };
    if (name === 'product') { const d = Math.min(r.w, r.h); r.x += (r.w - d) / 2; r.y += (r.h - d) / 2; r.w = r.h = d; }
    Object.assign(node.style, { left: px(r.x), top: px(r.y), width: px(r.w), height: px(r.h) });
  }
  S6.labels.forEach((L, k) => reveal(L, t, { tIn: k ? S6.states[k].t + 0.05 : S(5) + 0.05, tOut: k < 2 ? S6.states[k + 1].t - 0.16 : Infinity, style: 'rise', stagger: 0, dur: 0.3, exitDur: 0.12 }));
  S6.current = f;
}

// =====================================================================================================
// 07 REAL DATA — the 9:16 frame is now a phone showing the captured app; the camera finds the real total.
const S7 = {};
function init7(root) {
  const ph = PHONE();
  S7.rig = div(root, { left: '0', top: '0', width: px(W), height: px(H), transformOrigin: '0 0' });
  div(S7.rig, { left: px(ph.cx - ph.w / 2 - 1.3 * u), top: px(ph.cy - ph.h / 2 - 1.3 * u), width: px(ph.w + 2.6 * u), height: px(ph.h + 2.6 * u), borderRadius: px(4 * u), background: C.night,
    boxShadow: `0 ${3 * u}px ${8 * u}px rgba(4,6,30,0.45)` });
  S7.screen = div(S7.rig, { left: px(ph.cx - ph.w / 2), top: px(ph.cy - ph.h / 2), width: px(ph.w), height: px(ph.h), borderRadius: px(2.8 * u), overflow: 'hidden', background: C.app });
  S7.plate = screenPlate(S7.screen, capture, 'filled', { src: CAPTURE('filled.png'), x: 0, y: ph.h * 0.05, width: ph.w, shadow: 'none' });
  S7.ring = focusRing(S7.rig, { color: C.red, width: 0.5 * u, radius: 1.4 * u, pad: 0.8 * u, z: 5 });
  const b = S7.plate.box('total');
  S7.total = { x: b.x + ph.cx - ph.w / 2, y: b.y + ph.cy - ph.h / 2, w: b.w, h: b.h };
  const value = capture.values.total;
  S7.num = counter(root, { left: px(F(W * 0.56, 0)), width: px(F(W * 0.38, W)), top: px(F(cy - 11 * u, D.y1 - 21 * u)), textAlign: 'center', fontFamily: 'El Messiri', fontWeight: 700,
    fontSize: px(F(12, 9) * u), lineHeight: 1, color: C.paper, direction: 'rtl' }, { digits: 'arab', decimals: 2, suffix: ' ج.م' });
  S7.value = value;
  S7.ar = textBlock(root, 'الرقم ده من التطبيق نفسه', { left: px(F(W * 0.56, 0)), width: px(F(W * 0.38, W)), top: px(F(cy + 4 * u, D.y1 - 9 * u)), fontFamily: 'El Messiri', fontWeight: 600,
    fontSize: px(F(3.8, 3.6) * u), color: C.paper }, { align: 'center' });
  if (!V) S7.en = textBlock(root, 'READ BACK · VERIFIED', { left: px(W * 0.56), width: px(W * 0.38), top: px(cy + 12 * u), fontFamily: 'Montserrat', fontWeight: 700, fontSize: px(2.1 * u),
    letterSpacing: '0.32em', color: 'rgba(242,238,230,0.75)' }, { align: 'center' });
}
function cam7(t) {
  const ph = PHONE(), tx = S7.total.x + S7.total.w / 2, ty = S7.total.y + S7.total.h / 2, z = F(1.55, 1.16);
  // pan so the total moves toward the phone's centre line while zooming in (2D camera about frame centre)
  // wide: bring the total toward the phone's centre line; tall: zoom about the total so the phone keeps clear of the copy below
  const target = V ? { x: (tx - W / 2) * (1 - 1 / z), y: (ty - H / 2) * (1 - 1 / z), zoom: z }
    : { x: (tx - ph.cx) * 0.9 + (ph.cx - W / 2) * (1 - 1 / z), y: (ty - ph.cy) * 0.9 + (ph.cy - H / 2) * (1 - 1 / z), zoom: z };
  return cameraSpline([{ t: S(6), x: 0, y: 0, zoom: 1 }, { t: S(6) + 0.3, x: 0, y: 0, zoom: 1.01 }, { t: S(6) + 0.95, ...target }, { t: S(7) + 0.3, ...target, zoom: z * 1.025 }], t);
}
const apply7 = (c, [x, y]) => [W / 2 + (x - W / 2 - c.x) * c.zoom, H / 2 + (y - H / 2 - c.y) * c.zoom];
function render7(t) {
  const c = cam7(t);
  S7.rig.style.transform = `translate(${W / 2}px, ${H / 2}px) scale(${c.zoom.toFixed(5)}) translate(${(-W / 2 - c.x).toFixed(2)}px, ${(-H / 2 - c.y).toFixed(2)}px)`;
  S7.ring(S7.total, curves.decelerate(ramp(t, 11.95, 12.3)));
  S7.num.render(t, { start: 12.0, end: 12.62, from: 0, to: S7.value, curve: curves.decelerate, visible: t >= 11.98 });
  reveal(S7.ar, t, { tIn: 12.05, style: 'mask', stagger: 0.06, dur: 0.5 });
  if (S7.en) reveal(S7.en, t, { tIn: 12.2, style: 'fade', stagger: 0.03, dur: 0.4 });
}
// Where the focus ring sits on screen at time t (pure: used as the fixed origin of the hand-off to the end card).
const ring7At = t => apply7(cam7(t), [S7.total.x + S7.total.w / 2, S7.total.y + S7.total.h / 2]);

// =====================================================================================================
// 08 YOUR FILM — the dot returns, a frame draws itself around the invitation, everything settles and holds.
const S8 = {};
function init8(root) {
  S8.head = textBlock(root, 'فيلمك الجاي يبدأ هنا', { left: px(W / 2 - F(44, 42) * u), width: px(F(88, 84) * u), top: px(cy), fontFamily: 'El Messiri', fontWeight: 700,
    fontSize: px(F(10.5, 11) * u), lineHeight: 1.15, color: C.paper }, { align: 'center' });
  S8.sub = textBlock(root, 'CODE-DRIVEN MOTION STUDIO', { left: '0', width: px(W), top: px(cy), fontFamily: 'Montserrat', fontWeight: 700, fontSize: px(F(2.2, 2.4) * u),
    letterSpacing: '0.34em', color: 'rgba(242,238,230,0.72)' }, { align: 'center' });
  S8.dot = div(root, { width: px(3.4 * u), height: px(3.4 * u), borderRadius: '50%', background: C.red, left: '0', top: '0' });
  S8.svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, root);
  S8.frame = el('path', { d: 'M0 0', fill: 'none', stroke: 'rgba(242,238,230,0.55)', 'stroke-width': 0.22 * u, 'stroke-linecap': 'round' }, S8.svg);
}
function layout8() {
  fitBlock(S8.head, { maxWidth: F(88, 80) * u, maxHeight: F(14, 28) * u, max: F(10.5, 11) * u });
  const hh = S8.head.box.offsetHeight, sh = S8.sub.box.offsetHeight, gap = 3 * u, total = hh + gap + sh, top = cy - total / 2;
  S8.head.box.style.top = px(top); S8.sub.box.style.top = px(top + hh + gap); S8.head.lines = null;
  const words = S8.head.words.map(w => w.outer.getBoundingClientRect());
  const x0 = Math.min(...words.map(r => r.left)), x1 = Math.max(...words.map(r => r.right));
  const pad = F(6, 5) * u, fx0 = Math.min(x0, W / 2 - 30 * u) - pad, fx1 = Math.max(x1, W / 2 + 30 * u) + pad, fy0 = top - pad, fy1 = top + total + pad, r = 2 * u;
  S8.frame.setAttribute('d', `M${W / 2} ${fy1} H${fx0 + r} Q${fx0} ${fy1} ${fx0} ${fy1 - r} V${fy0 + r} Q${fx0} ${fy0} ${fx0 + r} ${fy0} H${fx1 - r} Q${fx1} ${fy0} ${fx1} ${fy0 + r} V${fy1 - r} Q${fx1} ${fy1} ${fx1 - r} ${fy1} H${W / 2}`);
  S8.rest = [W / 2, fy1];
  S8.laid = true;
}
function render8(t) {
  if (!S8.laid) layout8();
  const from = ring7At(HANDOFFS[7].start);
  const p = springStep(t - 13.1, { duration: 0.6, bounce: 0.15 }).value;
  const x = lerp(from[0], S8.rest[0], p), y = lerp(from[1], S8.rest[1], p);
  const s = springStep(t - S(7), { duration: 0.42, bounce: 0.45 }).value * (1 + 0.25 * kick(t, S(7) + BEAT));
  S8.dot.style.transform = `translate(${(x - 1.7 * u).toFixed(2)}px, ${(y - 1.7 * u).toFixed(2)}px) scale(${s.toFixed(4)})`;
  lineDraw(S8.frame, curves.decelerate(ramp(t, 13.2, 13.9)));
  reveal(S8.head, t, { tIn: 13.36, style: 'mask', stagger: 0.08, dur: 0.6, curve: curves.emphasized });
  reveal(S8.sub, t, { tIn: 13.52, style: 'fade', stagger: 0.02, dur: 0.45 });
}

// =====================================================================================================
// Edit: hand-off windows into section k (start, duration, transition, options).
const HANDOFFS = [
  null,
  { start: 1.62, dur: 0.4, name: 'maskedReveal', opts: () => ({ cx: S1.center[0] / W, cy: S1.center[1] / H }) },
  { start: S(2), dur: 0, name: 'cut', opts: () => ({}) }, // a true match cut: the sphere sits exactly where the circle was
  { start: S(3) - 0.2, dur: 0.38, name: 'cameraPass', opts: () => ({ direction: 'left', maxBlur: 3 * u }) },
  { start: S(4) - 0.18, dur: 0.34, name: 'lightWipe', opts: () => ({ angle: 100, width: 0.24, color: 'rgba(255,238,228,0.98)' }) },
  { start: S(5) - 0.18, dur: 0.36, name: 'colorHandoff', opts: () => ({ color: C.paper, cx: 0.5, cy: S5.base / H }) },
  { start: S(6) - 0.12, dur: 0.42, name: 'shapeMatch', opts: () => { const f = S6.current; return { box: { x: f.cx - f.w / 2, y: f.cy - f.h / 2, w: f.w, h: f.h }, round: 1.6 * u }; } },
  { start: S(7) - 0.16, dur: 0.38, name: 'maskedReveal', opts: () => { const [x, y] = ring7At(S(7) - 0.16); return { cx: x / W, cy: y / H }; } },
];
const RENDER = [render1, render2, render3, render4, render5, render6, render7, render8];

function initHud() {
  const top = D.y0, size = 2.2 * u;
  SECTIONS.forEach((s, k) => {
    const idx = textBlock(stage, `0${k + 1}/08`, { left: px(D.x0), width: px(12 * u), top: px(top), fontFamily: 'Montserrat', fontWeight: 500, fontSize: px(size), letterSpacing: '0.12em', color: s.hud, zIndex: 100 }, { align: 'left' });
    const en = textBlock(stage, s.en, { left: px(D.x0 + 11 * u), width: px(F(50, 46) * u), top: px(top), fontFamily: 'Montserrat', fontWeight: 800, fontSize: px(size), letterSpacing: '0.2em', color: s.hud, zIndex: 100 }, { align: 'left' });
    const ar = textBlock(stage, s.ar, { left: px(D.x1 - F(40, 30) * u), width: px(F(40, 30) * u), top: px(top - 0.35 * u), fontFamily: 'El Messiri', fontWeight: 600, fontSize: px(2.6 * u), color: s.hud, zIndex: 100 }, { align: 'right' });
    hud.push({ idx, en, ar });
  });
  const n = 8, gap = 0.8 * u, sw = (D.x1 - D.x0 - gap * (n - 1)) / n;
  for (let k = 0; k < n; k++) {
    const track = div(stage, { left: px(D.x0 + k * (sw + gap)), top: px(D.y1 - 0.25 * u), width: px(sw), height: px(0.25 * u), background: 'rgba(128,128,128,0.35)', zIndex: '100' });
    progress.push({ track, fill: div(track, { left: '0', top: '0', width: '100%', height: '100%', transformOrigin: '0 50%' }) });
  }
}
function renderHud(t) {
  const cur = Math.min(7, Math.floor(t / BAR));
  hud.forEach((h, k) => {
    const into = HANDOFFS[k], next = HANDOFFS[k + 1];
    const opts = { tIn: k === 0 ? -1 : into.start + into.dur + 0.02, tOut: k === 7 ? Infinity : (next.dur ? next.start : S(k + 1)) - 0.16, stagger: 0.03, dur: 0.38, exit: 'fade', exitDur: 0.12 };
    reveal(h.idx, t, { ...opts, style: 'mask' }); reveal(h.en, t, { ...opts, style: 'mask' }); reveal(h.ar, t, { ...opts, style: 'mask' });
  });
  progress.forEach((p, k) => {
    p.track.style.background = cur === 4 ? 'rgba(11,11,16,0.25)' : SECTIONS[cur].hud === C.ink ? 'rgba(11,11,16,0.18)' : 'rgba(242,238,230,0.22)';
    p.fill.style.background = k === cur ? (cur === 4 ? C.ink : C.red) : SECTIONS[cur].hud;
    p.fill.style.transform = `scaleX(${clamp((t - S(k)) / BAR).toFixed(4)})`;
  });
}

export default {
  duration: 15, fps: 30,
  init(st, { W: w, H: h }) {
    stage = st; W = w; H = h; u = Math.min(w, h) / 100; V = h > w;
    const safe = V ? [65, 269, 1015, 1248].map((v, i) => v * (i % 2 ? h / 1920 : w / 1080)) : [96, 54, 1824, 1026].map((v, i) => v * (i % 2 ? h / 1080 : w / 1920));
    D = { x0: safe[0] + 1.4 * u, y0: safe[1] + 1.4 * u, x1: safe[2] - 1.4 * u, y1: safe[3] - 1.4 * u };
    cy = (D.y0 + D.y1) / 2 + F(1, 0) * u;
    stage.style.background = C.ink;
    roots = SECTIONS.map((s, k) => div(stage, { left: '0', top: '0', width: px(W), height: px(H), overflow: 'hidden', background: s.bg, zIndex: String(k + 1) }));
    [init1, init2, init3, init4, init5, init6, init7, init8].forEach((f, k) => f(roots[k]));
    overlay = div(stage, { left: '0', top: '0', width: px(W), height: px(H), zIndex: '60', display: 'none', pointerEvents: 'none' });
    initHud();
    grainAt = grain(stage, { opacity: 0.035, tiles: 6, size: 256, seed: 5 });
    grainAt.layer = stage.lastChild; grainAt.layer.style.zIndex = '200';
  },
  camera(t) { // exposed for the studio's camera diagnostics (section 3 depth camera, section 7 screen camera)
    if (t >= S(2) && t < S(3)) { const c = cam3(t); return { x: c.x, y: c.y, zoom: c.zoom, focus: c.focus, aperture: c.aperture }; }
    if (t >= S(6) && t < S(7)) return { ...cam7(t), focus: 1, aperture: 0 };
    return { x: 0, y: 0, zoom: 1, focus: 1, aperture: 0 };
  },
  render(t, frame) {
    const own = Math.min(7, Math.floor(t / BAR));
    const live = new Set([own]);
    let active = null;
    for (let k = 1; k < 8; k++) { const h = HANDOFFS[k]; if (h.dur > 0 && t >= h.start && t < h.start + h.dur) { active = k; live.add(k - 1); live.add(k); } }
    roots.forEach((r, k) => { r.style.display = live.has(k) ? 'block' : 'none'; });
    overlay.style.display = 'none';
    for (const k of [...live].sort((a, b) => a - b)) RENDER[k](t);
    if (active) {
      const h = HANDOFFS[active];
      applyTransition(h.name, t, { a: roots[active - 1], b: roots[active], overlay, start: h.start, duration: h.dur, w: W, h: H, ...h.opts() });
    } else {
      const r = roots[own];
      Object.assign(r.style, { visibility: 'visible', opacity: '1', transform: 'none', filter: 'none', clipPath: 'none', maskImage: 'none', webkitMaskImage: 'none' });
    }
    renderHud(t);
    grainAt(frame ?? Math.round(t * 30));
  },
};
