// Film 4 — BALACONBAR "Your Matcha Moment" — 20 s, authored 9:16 (1080×1920), recomposed for 4:5 (1080×1350).
// Pure render(t). Every product pixel is the owner's real cup/carton photo (hero space = that photo, 1600²:
// logo centre (1005,1150), cup base y 1558, carton base y 1442). The swing poster gives only rope + seat.
// One depth camera per scene (cinema.js cameraPath/rackFocus/microDrift/composeCamera + depth.js depthScene).
// Transitions (3 families): foreground occlusion (rope 2.5 s, pillar 13.125 s), focus handoff (6.25 s),
// match cut (9.375 s). 17–20 s is the same shot as 13–17 s: light falls to deep green, camera breathes out.
// Music 96 BPM, bar 2.5 s (score.mjs).
import { clamp, lerp, ramp, ease, rng, el, show, textLine, playLine, grain } from '../lib/motion.js';
import { cameraPath, rackFocus, microDrift, composeCamera } from '../lib/cinema.js';
import { depthScene } from '../lib/depth.js';

const P = (f) => new URL(`./plates/${f}`, import.meta.url).href;
const C = { ink: '#07120D', deep: '#0E2219', deep2: '#183A2B', cream: '#F4EADA', gold: '#C9A55C', goldLt: '#E3C688' };
const AR = { fontFamily: 'El Messiri', fontWeight: 500 };
const EN = { fontFamily: 'Montserrat', fontWeight: 500 };
const SHADOW = '0 2px 24px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.4)';
const T1 = 2.5, T2 = 6.25, T3 = 9.375, T4 = 13.125, T5 = 17.0, END = 20.0;

let W, H, V, stage, grainAt;
const S = {};
const F = (feed, vert) => (V ? vert : feed);

// ---------- hero-space staging ----------
// A scene maps hero-photo points to zoom-1 screen points: (hx,hy) → (X0 + (hx-HX)·sc, Y0 + (hy-HY)·sc).
const mapper = (HX, HY, X0, Y0, sc) => ({ sc, at: (hx, hy) => [X0 + (hx - HX) * sc, Y0 + (hy - HY) * sc] });
// Image whose pixel p sits at hero point off + p/res.
function heroImg(ds, id, m, src, w, h, { res = 1, off = [0, 0], depth = 1, z = 0, filter } = {}) {
  const [x, y] = m.at(off[0] + w / 2 / res, off[1] + h / 2 / res);
  const content = ds.add(id, { src, width: w, height: h, x, y, depth, scale: m.sc / res, z });
  if (filter) content.firstChild.style.filter = filter;
  return content;
}
// Camera pan that puts a zoom-1 screen point at screen (sx,sy) for zoom z (depth-1 plane).
const aim = ([x1, y1], sx, sy, z) => ({ x: x1 - W / 2 - (sx - W / 2) / z, y: y1 - H / 2 - (sy - H / 2) / z, zoom: z });
const div = (parent, style) => el('div', { class: 'abs', style }, parent);
function sceneRoot() { return div(stage, { width: W + 'px', height: H + 'px', overflow: 'hidden', background: C.ink }); }
function line(parent, text, font, size, color, style, extra = {}) {
  return textLine(parent, text, { ...font, fontSize: size + 'px', lineHeight: 1.25, color, textShadow: SHADOW, ...style, ...extra });
}
const centered = (top) => ({ top: top + 'px', left: '0', width: W + 'px', justifyContent: 'center' });
const soft = { rise: 18, blur: 10, dur: 1.0, stagger: 0.09, exitDur: 0.45, exitRise: -8 };

// Defocused bokeh discs inside a depth scene (fixed seeds, physically still; parallax comes from the camera).
function bokeh(ds, id, n, seed, { depth = 0.45, colors, size = [60, 180], area = [0, 0, 1, 0.7], z = 1, alpha = 1 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const d = size[0] + r() * (size[1] - size[0]);
    const c = colors[i % colors.length];
    const node = ds.add(`${id}${i}`, { width: d, height: d, depth, z, x: W * (area[0] + r() * (area[2] - area[0])), y: H * (area[1] + r() * (area[3] - area[1])) });
    node.style.borderRadius = '50%';
    node.style.background = `radial-gradient(circle, ${c} 0%, ${c} 52%, rgba(0,0,0,0) 72%)`;
    node.style.opacity = String(alpha * (0.5 + r() * 0.5));
  }
}
// Vector leaf (out-of-focus foreground only).
function leaf(parent, id, c1 = '#21502B', c2 = '#6E9A3E') {
  const s = el('svg', { width: 260, height: 260, viewBox: '-130 -130 260 260', style: { overflow: 'visible', width: '100%', height: '100%' } }, parent);
  const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, el('defs', {}, s));
  el('stop', { offset: 0, 'stop-color': c2 }, g); el('stop', { offset: 1, 'stop-color': c1 }, g);
  el('path', { d: 'M -112 10 C -60 -80 60 -95 116 -10 C 60 60 -50 75 -112 10 Z', fill: `url(#${id})` }, s);
  el('path', { d: 'M -104 9 C -40 -6 40 -14 110 -9', fill: 'none', stroke: 'rgba(214,232,170,0.5)', 'stroke-width': 3.2 }, s);
  return s;
}
const ellipseShadow = (node, a = 0.6) => { node.style.borderRadius = '50%'; node.style.background = `radial-gradient(closest-side, rgba(0,0,0,${a}), rgba(0,0,0,0))`; };
const sweepStyle = (mask, w, h) => ({ width: w + 'px', height: h + 'px', mixBlendMode: 'screen', WebkitMaskImage: `url(${mask})`, WebkitMaskSize: `${w}px ${h}px`, backgroundSize: '300% 100%', backgroundRepeat: 'no-repeat' });

// =====================================================================================================
// S1 HOOK 0–2.5 — macro on the real cup (2× plate), cool light; pull back while focus travels ice → logo.
const m1 = () => mapper(1005, 1130, W / 2, H / 2, 1);
const cam1Keys = () => {
  const m = m1();
  return [
    { t: 0, ...aim(m.at(1000, 880), W / 2, H * F(0.5, 0.47), F(2.3, 2.6)), focus: 1, aperture: 18 },
    { t: 2.3, ...aim(m.at(1005, 1130), W / 2, H * F(0.55, 0.53), F(0.98, 1.08)), focus: 1, aperture: 18 },
  ];
};
function initS1() {
  const root = sceneRoot(), ds = depthScene(root, { w: W, h: H }), m = m1();
  heroImg(ds, 'bg', m, P('bar-tall.png'), 1600, 2400, { depth: 0.3, filter: 'blur(6px) saturate(0.45) brightness(0.5) contrast(1.15) hue-rotate(-14deg)' });
  const tint = ds.add('tint', { width: W * 3, height: H * 3, depth: 0 }); tint.style.background = 'linear-gradient(180deg, rgba(40,70,90,0.38), rgba(12,26,30,0.55))';
  const back = ds.add('back', { width: 1200, height: 1200, depth: 0.6, ...(() => { const [x, y] = m.at(1005, 900); return { x, y }; })() });
  back.style.background = 'radial-gradient(closest-side, rgba(214,240,226,0.42), rgba(214,240,226,0))';
  const cupSoft = heroImg(ds, 'cupSoft', m, P('cup-2x.png'), 1280, 1800, { res: 2, off: [690, 680], z: 2, filter: 'blur(5px)' });
  const cup = heroImg(ds, 'cup', m, P('cup-2x.png'), 1280, 1800, { res: 2, off: [690, 680], z: 3 });
  bokeh(ds, 'drop', 5, 11, { depth: 2.1, z: 4, colors: ['rgba(225,245,240,0.16)', 'rgba(255,255,255,0.12)'], size: [90, 220], area: [0, 0.05, 1, 0.95] });
  const scrim = div(root, { width: W + 'px', height: F(420, 760) + 'px', background: 'linear-gradient(180deg, rgba(4,10,12,0.62), rgba(4,10,12,0))', zIndex: 5 });
  const l1 = line(root, 'مش أي ماتشا', AR, F(84, 92), C.cream, centered(F(96, 300)), { zIndex: 6 });
  S.s1 = { root, ds, cup, cupSoft, scrim, l1 };
}
function renderS1(t) {
  const s = S.s1; const vis = t < T1 + 0.4; show(s.root, vis); if (!vis) return;
  const keys = cam1Keys();
  s.ds.render(composeCamera(cameraPath(keys, t), microDrift(t, { seed: 3, x: 1.2, y: 1.2, zoom: 0.0015 })));
  // Focus point travels from the ice band to the printed logo (cup-2x pixels).
  const f = ease.inOutSine(ramp(t, 0.35, 2.2));
  const fx = lerp(620, 630, f), fy = lerp(380, 940, f), r = lerp(520, 760, f);
  s.cup.style.webkitMaskImage = `radial-gradient(circle ${r.toFixed(0)}px at ${fx.toFixed(0)}px ${fy.toFixed(0)}px, #000 58%, transparent 100%)`;
  playLine(s.l1, t, 0.45, 2.05, soft);
}

// =====================================================================================================
// S2 HERO 2.5–6.25 — the real cup on the wooden swing; camera trucks behind the foreground rope and settles.
// Swing rig image = poster space + 900 px of extended rope above (1080×2250). Seat centre (545, 1880).
const RIG = { w: 1080, h: 2250, seat: [545, 1880] };
const k2 = () => F(1.12, 1.32);
const seatScreen = () => [W / 2 - 20 * k2(), F(1010, 1430)];
const cam2Keys = () => [
  { t: T1 - 0.3, x: -170, y: 0, zoom: 1.075, focus: 1, aperture: 12 },
  { t: 4.9, x: 0, y: 0, zoom: 1.0, focus: 1, aperture: 12 },
  { t: T2 + 0.3, x: 8, y: -4, zoom: 1.012, focus: 1, aperture: 12 },
];
const swingTheta = (t) => 0.5 * Math.exp(-(t - T1) * 0.18) * Math.sin((2 * Math.PI * (t - T1)) / 3.6 + 0.4);
function initS2() {
  const root = sceneRoot(), ds = depthScene(root, { w: W, h: H });
  const m = mapper(1005, 1150, W / 2, F(560, 760), F(0.9, 1.1));
  heroImg(ds, 'bg', m, P('bar-tall.png'), 1600, 2400, { depth: 0.25, filter: 'blur(9px) saturate(0.8) brightness(0.5) sepia(0.25) hue-rotate(28deg) contrast(1.1)' });
  const tint = ds.add('tint', { width: W * 3, height: H * 3, depth: 0 });
  tint.style.background = `radial-gradient(ellipse 60% 45% at 50% 42%, rgba(120,150,80,0.20), rgba(8,22,14,0.62) 75%)`;
  bokeh(ds, 'bk', 8, 23, { depth: 0.45, z: 1, colors: ['rgba(236,206,140,0.22)', 'rgba(170,205,120,0.16)', 'rgba(250,236,200,0.14)'], size: [70, 190], area: [-0.1, 0.05, 1.1, 0.6] });
  const [sx, sy] = seatScreen(), k = k2();
  const rig = ds.add('rig', { src: P('swing-rig.png'), width: RIG.w, height: RIG.h, x: sx + (540 - RIG.seat[0]) * k, y: sy - RIG.seat[1] * k, anchor: [0.5, 0], scale: k, z: 3 });
  rig.firstChild.style.filter = 'brightness(0.86) saturate(0.92) contrast(1.05)';
  // Contact shadow + the real cup (hero-cup 1600², scale 0.62 → base centre on the seat at rig (544,1866)).
  const sh = div(rig, { left: (544 - 150) + 'px', top: (1866 - 22) + 'px', width: '300px', height: '44px' }); ellipseShadow(sh, 0.62);
  const cupS = 0.62;
  el('img', { src: P('hero-cup.png'), class: 'abs', style: { width: 1600 * cupS + 'px', height: 1600 * cupS + 'px', left: (544 - 1006 * cupS).toFixed(1) + 'px', top: (1866 - 1558 * cupS).toFixed(1) + 'px' } }, rig);
  const rim = div(rig, { left: (544 - 300) + 'px', top: (1866 - 560) + 'px', width: '600px', height: '560px', background: 'radial-gradient(ellipse 50% 50% at 50% 30%, rgba(255,236,190,0.10), rgba(0,0,0,0))', mixBlendMode: 'screen' });
  const lf = ds.add('leaf', { width: 260, height: 260, x: F(-60, -70), y: H - F(60, 120), depth: 1.9, scale: F(2.4, 2.8), rotation: -58, z: 5, opacity: 0.85 });
  lf.style.filter = 'brightness(0.55)';
  leaf(lf, 'lf2a');
  const scrim = div(root, { width: W + 'px', height: F(360, 680) + 'px', background: 'linear-gradient(180deg, rgba(4,12,8,0.6), rgba(4,12,8,0))', zIndex: 6 });
  const l1 = line(root, 'لحظتك مع الماتشا', AR, F(80, 88), C.cream, centered(F(92, 330)), { zIndex: 7 });
  S.s2 = { root, ds, l1, rim };
}
function renderS2(t) {
  const s = S.s2; const vis = t >= T1 - 0.45 && t < T2 + 0.3; show(s.root, vis); if (!vis) return;
  let cam = composeCamera(cameraPath(cam2Keys(), t), microDrift(t, { seed: 5, x: 1.5, y: 1, zoom: 0.001 }));
  // Focus handoff: focus pulls to the foreground leaf; the cup melts before the next shot resolves.
  if (t > 5.75) cam = { ...cam, ...rackFocus(t, { start: 5.75, end: T2 + 0.15, from: 1, to: 1.9, aperture: 20 }) };
  s.ds.render(cam, { rig: { rotation: swingTheta(t) } });
  playLine(s.l1, t, 3.4, 5.55, soft);
}

// Rope occlusion 2.2–2.85: a defocused rope crosses right → left in front of the lens; S1 is clipped to the
// region ahead of the rope's centre, S2 is revealed behind it (no frame shows both cups).
function initRope() {
  const layer = div(stage, { width: W + 'px', height: H + 'px', pointerEvents: 'none', zIndex: 20, overflow: 'hidden' });
  const box = div(layer, { width: '900px', height: (H + 800) + 'px', overflow: 'hidden', transformOrigin: '50% 50%' });
  el('img', { src: P('rope.png'), style: { position: 'absolute', width: 140 * 22 + 'px', height: 520 * 22 + 'px', left: (450 - 50 * 22) + 'px', top: '-3000px', filter: 'brightness(0.62) contrast(1.1)' } }, box);
  return { layer, box };
}
const ropeX = (t) => lerp(W + 700, -700, ease.inOutSine(ramp(t, 2.18, 2.86)));
function renderRope(t) {
  const r = S.rope; const on = t > 2.18 && t < 2.86; show(r.layer, on);
  if (t < 2.18) { S.s1.root.style.clipPath = 'none'; return; }
  const xc = ropeX(t);
  r.box.style.transform = `translate(${(xc - 450).toFixed(1)}px, -400px) rotate(5deg)`;
  r.box.style.filter = 'blur(16px)';
  S.s1.root.style.clipPath = on ? `inset(0 ${(W - clamp(xc, 0, W)).toFixed(1)}px 0 0)` : 'inset(0 0 0 100%)';
}

// =====================================================================================================
// S3 COCONUT 6.25–9.375 — the real counter: carton sharp, cup soft in front; rack back to the cup; push to the boba.
const m3 = () => mapper(860, 1150, W / 2, H * F(0.53, 0.55), F(0.86, 1.0));
const cam3Keys = () => {
  const m = m3();
  return [
    { t: T2 - 0.2, ...aim(m.at(760, 1000), W * 0.46, H * F(0.52, 0.52), F(0.94, 1.1)) },
    { t: 8.35, ...aim(m.at(820, 1060), W * 0.5, H * F(0.54, 0.53), F(0.9, 1.04)) },
    ...cam4Keys(),
  ];
};
function initS3() {
  const root = sceneRoot(), ds = depthScene(root, { w: W, h: H }), m = m3();
  heroImg(ds, 'bg', m, P('bar-tall.png'), 1600, 2400, { depth: 0.55, filter: 'sepia(0.35) saturate(0.85) brightness(0.82) contrast(1.02)' });
  const warm = ds.add('warm', { width: W * 3, height: H * 3, depth: 0, z: 1 });
  warm.style.background = 'radial-gradient(ellipse 40% 30% at 42% 46%, rgba(255,226,180,0.22), rgba(40,24,12,0.35) 80%)';
  const [ccx, ccy] = m.at(575, 1444);
  const csh = ds.add('cartonSh', { width: 520, height: 60, x: ccx, y: ccy, depth: 0.8, scale: m.sc, z: 2 }); ellipseShadow(csh, 0.75);
  heroImg(ds, 'carton', m, P('hero-carton.png'), 1600, 1600, { depth: 0.8, z: 3, filter: 'brightness(1.02) saturate(0.96)' });
  const cream = ds.add('cream', { width: 900, height: 1300, depth: 0.8, z: 4, scale: m.sc, ...(() => { const [x, y] = m.at(560, 760); return { x, y }; })() });
  cream.style.background = 'radial-gradient(closest-side, rgba(255,240,215,0.22), rgba(255,240,215,0))'; cream.style.mixBlendMode = 'screen';
  const [ux, uy] = m.at(1006, 1556);
  const ush = ds.add('cupSh', { width: 640, height: 80, x: ux, y: uy, depth: 1, scale: m.sc, z: 5 }); ellipseShadow(ush, 0.7);
  heroImg(ds, 'cup', m, P('cup-2x.png'), 1280, 1800, { res: 2, off: [690, 680], z: 6 });
  const fade = div(root, { width: W + 'px', height: H + 'px', zIndex: 7, background: `linear-gradient(180deg, rgba(10,6,3,0.55) 0%, rgba(10,6,3,0) ${F(26, 30)}%, rgba(10,6,3,0) ${F(80, 70)}%, rgba(10,6,3,0.75) 100%)` });
  const l1 = line(root, 'بجوز الهند', AR, F(80, 88), C.cream, { top: F(96, 330) + 'px', right: F(64, 80) + 'px', justifyContent: 'flex-start' }, { zIndex: 8 });
  S.s3 = { root, ds, l1, fade };
}
function renderS3(t) {
  const s = S.s3; const vis = t >= T2 - 0.2 && t < T3; show(s.root, vis); if (!vis) return;
  let cam = composeCamera(cameraPath(cam3Keys(), t), microDrift(t, { seed: 9, x: 1, y: 1, zoom: 0.001 }));
  // Resolve from the handoff blur onto the carton, hold, then rack back to the cup.
  const f = t < 8.2 ? rackFocus(t, { start: T2 - 0.2, end: 7.0, from: 1.6, to: 0.8, aperture: lerp(26, 22, ramp(t, T2 - 0.2, 7.0)) })
    : rackFocus(t, { start: 8.2, end: 8.85, from: 0.8, to: 1, aperture: 22 });
  cam = { ...cam, ...f };
  s.ds.render(cam);
  s.root.style.opacity = ease.inOutSine(ramp(t, T2 - 0.2, T2 + 0.2)).toFixed(3);
  playLine(s.l1, t, 6.8, 8.45, soft);
}

// =====================================================================================================
// S4 TEXTURE 9.375–13.125 — match cut: same cup position, warm macro studio light; crane boba → gradient → ice.
const cam4Keys = () => {
  const m = m3();
  // One push runs from S3 through the match cut (9.375 s): the camera is moving when the light changes.
  return [
    { t: 11.4, ...aim(m.at(1005, 1200), W / 2, H * F(0.52, 0.52), F(2.45, 2.7)) },
    { t: T4, ...aim(m.at(1000, 880), W / 2, H * F(0.47, 0.46), F(2.8, 3.05)) },
  ];
};
function initS4() {
  const root = sceneRoot(), ds = depthScene(root, { w: W, h: H }), m = m3();
  root.style.background = `radial-gradient(ellipse 70% 60% at 50% 45%, #5A3E22, #24160B 70%, #120B05)`;
  bokeh(ds, 'gb', 7, 41, { depth: 0.4, z: 1, colors: ['rgba(240,200,130,0.2)', 'rgba(255,236,200,0.14)'], size: [120, 260], area: [-0.2, -0.1, 1.2, 1.1] });
  const cupSoft = heroImg(ds, 'cupSoft', m, P('cup-2x.png'), 1280, 1800, { res: 2, off: [690, 680], z: 2, filter: 'blur(4px) saturate(1.04)' });
  const cup = heroImg(ds, 'cup', m, P('cup-2x.png'), 1280, 1800, { res: 2, off: [690, 680], z: 3, filter: 'saturate(1.06) contrast(1.04)' });
  const [x, y] = m.at(1010, 1130);
  const sweep = ds.add('sweep', { width: 1280, height: 1800, x, y, depth: 1, scale: m.sc / 2, z: 4 });
  Object.assign(sweep.style, sweepStyle(P('cup-2x.png'), 1280, 1800), { backgroundImage: 'linear-gradient(105deg, rgba(255,236,200,0) 42%, rgba(255,232,190,0.5) 50%, rgba(255,236,200,0) 58%)' });
  S.s4 = { root, ds, cup, cupSoft, sweep };
}
function renderS4(t) {
  const s = S.s4; const vis = t >= T3 && t < T4 + 0.02; show(s.root, vis); if (!vis) return;
  const cam = composeCamera(cameraPath(cam3Keys(), t), microDrift(t, { seed: 13, x: 0.8, y: 0.8, zoom: 0.0008 }));
  s.ds.render(cam);
  // Focus band follows the frame centre (in cup-2x pixels: screen centre back-projected through the camera).
  const m = m3(); const cy = (H * 0.5 - H / 2) / cam.zoom + H / 2 + cam.y; // zoom-1 screen y at frame centre
  const heroY = 1130 + (cy - m.at(1010, 1130)[1]) / m.sc;
  const by = (heroY - 680) * 2;
  s.cup.style.webkitMaskImage = `linear-gradient(180deg, transparent ${(by - 760).toFixed(0)}px, #000 ${(by - 330).toFixed(0)}px, #000 ${(by + 330).toFixed(0)}px, transparent ${(by + 760).toFixed(0)}px)`;
  const sp = ramp(t, 10.9, 12.3); show(s.sweep, sp > 0 && sp < 1);
  s.sweep.style.backgroundPosition = `${lerp(100, 0, ease.inOutSine(sp)).toFixed(2)}% 0`;
}

// =====================================================================================================
// S5 WORLD 13.125–17 + S6 PAYOFF 17–20 — one shot. Cup inside an arched window, gold café light, slow push;
// then the light falls to deep green, the arch leaves, the camera breathes out and locks for the brand.
const m5 = () => mapper(1005, 1130, W / 2, F(700, 1060), F(0.86, 0.98));
const cam5Keys = () => {
  const m = m5(), c = m.at(1005, 1130);
  return [
    { t: T4 - 0.25, ...aim(c, W / 2 + 40, F(700, 1060), 1.0), focus: 1, aperture: 10 },
    { t: 16.85, ...aim(c, W / 2, F(700, 1060), 1.09), focus: 1, aperture: 10 },
    { t: 18.25, ...aim(c, W / 2, F(880, 1200), F(1.0, 1.04)), focus: 1, aperture: 16 },
  ];
};
function archSvg(parent, w, h, ow, oh, cx, cy) {
  const s = el('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, style: { width: '100%', height: '100%', overflow: 'visible' } }, parent);
  const r = ow / 2, top = cy - oh / 2, bot = cy + oh / 2;
  const open = `M ${cx - r} ${bot} L ${cx - r} ${top + r} A ${r} ${r} 0 0 1 ${cx + r} ${top + r} L ${cx + r} ${bot} Z`;
  const g = el('linearGradient', { id: 'archg', x1: 0, y1: 0, x2: 1, y2: 1 }, el('defs', {}, s));
  el('stop', { offset: 0, 'stop-color': '#13281D' }, g); el('stop', { offset: 1, 'stop-color': '#060D09' }, g);
  el('path', { d: `M 0 0 H ${w} V ${h} H 0 Z ${open}`, fill: 'url(#archg)', 'fill-rule': 'evenodd' }, s);
  const r2 = r + 26;
  el('path', { d: `M ${cx - r2} ${bot} L ${cx - r2} ${top + r} A ${r2} ${r2} 0 0 1 ${cx + r2} ${top + r} L ${cx + r2} ${bot}`, fill: 'none', stroke: 'rgba(227,198,136,0.32)', 'stroke-width': 5 }, s);
  el('path', { d: open, fill: 'none', stroke: 'rgba(240,210,150,0.55)', 'stroke-width': 3 }, s);
  return s;
}
function initS5() {
  const root = sceneRoot(), ds = depthScene(root, { w: W, h: H }), m = m5();
  const bg = heroImg(ds, 'bg', m, P('bar-tall.png'), 1600, 2400, { depth: 0.3, filter: 'blur(8px) sepia(0.85) saturate(1.7) brightness(0.42) hue-rotate(-8deg) contrast(1.15)' });
  const glow = ds.add('glow', { width: 1500, height: 1500, depth: 0.5, z: 1, ...(() => { const [x, y] = m.at(1005, 950); return { x, y }; })() });
  glow.style.background = 'radial-gradient(closest-side, rgba(240,186,96,0.55), rgba(240,186,96,0))'; glow.style.mixBlendMode = 'screen';
  bokeh(ds, 'gold', 9, 57, { depth: 0.5, z: 1, colors: ['rgba(240,196,118,0.30)', 'rgba(255,224,170,0.20)'], size: [70, 170], area: [0, 0.04, 1, F(0.5, 0.45)] });
  const green = ds.add('green', { width: W * 3, height: H * 3, depth: 0, z: 2 });
  green.style.background = `radial-gradient(ellipse 48% 38% at 50% ${F(62, 58)}%, ${C.deep2}, ${C.ink} 78%)`;
  const [ux, uy] = m.at(1006, 1556);
  const ush = ds.add('cupSh', { width: 700, height: 90, x: ux, y: uy, depth: 1, scale: m.sc, z: 3 }); ellipseShadow(ush, 0.72);
  const refl = heroImg(ds, 'refl', m, P('hero-cup.png'), 1600, 1600, { z: 3 });
  refl.style.transform = 'translateY(1556px) scaleY(-1) translateY(-1556px)'; refl.style.opacity = '0.12';
  refl.style.webkitMaskImage = 'linear-gradient(180deg, rgba(0,0,0,0) 1300px, rgba(0,0,0,1) 1550px)';
  heroImg(ds, 'cup', m, P('hero-cup.png'), 1600, 1600, { z: 4, filter: 'saturate(1.04) contrast(1.03)' });
  const [sx, sy] = m.at(800, 800);
  const sweep = ds.add('sweep', { width: 1600, height: 1600, x: sx, y: sy, depth: 1, scale: m.sc, z: 5 });
  Object.assign(sweep.style, sweepStyle(P('hero-cup.png'), 1600, 1600), { backgroundImage: 'linear-gradient(100deg, rgba(255,240,210,0) 44%, rgba(255,226,170,0.55) 50%, rgba(255,240,210,0) 56%)' });
  const AW = 2400, AH = 3200;
  const [ax, ay] = m.at(1005, 1080);
  const arch = ds.add('arch', { width: AW, height: AH, x: W / 2, y: F(640, 1000), depth: 0, z: 6 });
  arch.style.filter = 'blur(5px)';
  archSvg(arch, AW, AH, F(700, 740), F(1180, 1560), AW / 2, AH / 2);
  // Brand payoff (outside the depth scene: focus never blurs type).
  const logoW = F(200, 290), logoTop = F(52, 286);
  const logo = el('img', { src: P('logo-white.png'), class: 'abs', style: { width: logoW + 'px', left: (W / 2 - logoW / 2) + 'px', top: logoTop + 'px', zIndex: 8 } }, root);
  const yAr = logoTop + logoW * 0.86 + F(22, 34);
  const ar = line(root, 'لحظتك مع الماتشا', AR, F(62, 80), C.cream, centered(yAr), { zIndex: 8 });
  const en = line(root, 'YOUR MATCHA MOMENT', EN, F(21, 24), C.goldLt, centered(yAr + F(84, 112)), { zIndex: 8, direction: 'ltr', letterSpacing: '0.34em', textShadow: 'none' });
  S.s5 = { root, ds, green, glow, sweep, arch, logo, ar, en, bg };
}
function renderS5(t) {
  const s = S.s5; const vis = t >= T4 - 0.02; show(s.root, vis); if (!vis) return;
  const keys = cam5Keys();
  const settle = ramp(t, 17.6, 18.25);
  const drift = microDrift(t, { seed: 17, x: 1.4 * (1 - settle), y: 1 * (1 - settle), zoom: 0.0012 * (1 - settle) });
  s.ds.render(composeCamera(cameraPath(keys, Math.min(t, 18.25)), drift), {
    green: { opacity: ease.inOutSine(ramp(t, 16.7, 17.9)) },
    arch: { opacity: 1 - ease.inOutSine(ramp(t, 16.6, 17.25)), scale: Math.pow(cameraPath(keys, Math.min(t, 18.25)).zoom, 2.6), x: W / 2 - 40 * (1 - ease.inOutSine(ramp(t, T4 - 0.25, 16.85))) * 1.6 },
    glow: { opacity: 1 - 0.6 * ease.inOutSine(ramp(t, 16.8, 17.9)) },
  });
  const sp = ramp(t, 14.7, 16.0); show(s.sweep, sp > 0 && sp < 1);
  s.sweep.style.backgroundPosition = `${lerp(100, 0, ease.inOutSine(sp)).toFixed(2)}% 0`;
  const lp = ease.outCubic(ramp(t, 17.55, 18.45));
  s.logo.style.opacity = lp.toFixed(3);
  s.logo.style.transform = `translateY(${lerp(10, 0, lp).toFixed(1)}px)`;
  s.logo.style.filter = lp < 0.999 ? `blur(${(5 * (1 - lp)).toFixed(2)}px)` : 'none';
  playLine(s.ar, t, 17.75, 99, { ...soft, rise: 10 });
  playLine(s.en, t, 18.0, 99, { rise: 0, blur: 6, dur: 0.9, stagger: 0 });
}

// Pillar occlusion 12.9–13.35: a dark, defocused column of the arch passes the lens (full cover ≈ 3 frames).
function initPillar() {
  const layer = div(stage, { width: W + 'px', height: H + 'px', pointerEvents: 'none', zIndex: 20 });
  const p = div(layer, { width: '1500px', height: (H + 400) + 'px', top: '-200px', filter: 'blur(14px)',
    background: 'linear-gradient(90deg, rgba(10,22,15,0) 0%, #0B1A12 9%, rgba(201,165,92,0.55) 12%, #0D1F15 15%, #07110B 50%, #0D1F15 85%, rgba(201,165,92,0.45) 88%, #0B1A12 91%, rgba(10,22,15,0) 100%)' });
  return { layer, p };
}
function renderPillar(t) {
  const r = S.pillar; const on = t > 12.88 && t < 13.37; show(r.layer, on); if (!on) return;
  const x = lerp(W + 80, -1580, ease.inOutSine(ramp(t, 12.88, 13.37)));
  r.p.style.transform = `translateX(${x.toFixed(1)}px)`;
}

export default {
  duration: END, fps: 30,
  init(stageEl, opts) {
    stage = stageEl; W = opts.W; H = opts.H; V = H / W > 1.5;
    initS1(); initS2(); initS3(); initS4(); initS5();
    // S2 sits under S1 during the rope wipe; later scenes stack in order.
    S.s1.root.style.zIndex = '2'; S.s2.root.style.zIndex = '1';
    S.s3.root.style.zIndex = '3'; S.s4.root.style.zIndex = '4'; S.s5.root.style.zIndex = '5';
    S.rope = initRope(); S.pillar = initPillar();
    div(stage, { width: W + 'px', height: H + 'px', pointerEvents: 'none', zIndex: 30, background: 'radial-gradient(ellipse 88% 80% at 50% 48%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.32))' });
    grainAt = grain(stage, { opacity: 0.03 });
  },
  render(t, frame) {
    renderS1(t); renderS2(t); renderS3(t); renderS4(t); renderS5(t);
    renderRope(t); renderPillar(t);
    grainAt(frame);
  },
};
