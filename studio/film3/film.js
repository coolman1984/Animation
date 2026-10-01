// Film 3 — BALACONBAR "خُد لحظتك" — 25 s, 4:5 (1080×1350) and 9:16 (1080×1920), each composed for its frame.
// Pure render(t). Source space = the owner's hero photo (1600²): cup logo centre (1005,1150), cup base y 1548,
// carton base y 1442, counter edge y 1304. Transitions: product-matched cut (3 s, 11 s), pass in front of the
// lens (7 s, 15 s), masked reveal (20 s). Music: 96 BPM, bar = 2.5 s (score.mjs).
import { clamp, lerp, ramp, ease, prog, rng, el, show, textLine, playLine, grain } from '../lib/motion.js';

const P = (f) => new URL(`./plates/${f}`, import.meta.url).href;
const C = { deep: '#0F2A22', deep2: '#1C4436', ink: '#08170F', matcha: '#9BB85A', cream: '#F3E9D6', creamDk: '#E1D0B0', gold: '#C9A55C' };
const CUP = [1005, 1150];
const TITLE = { fontFamily: 'El Messiri', fontWeight: 600 };
const BODY = { fontFamily: 'Plex Arabic', fontWeight: 500 };
const SHADOW = '0 2px 22px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.45)';

let W, H, V, stage, grainAt;
const S = {};
const F = (a, b) => (V ? b : a); // per-format value: F(feed 4:5, vertical 9:16)

// ---------- layers ----------
function img(parent, src, w, h, style = {}) {
  const box = el('div', { class: 'abs', style: { width: w + 'px', height: h + 'px', transformOrigin: '0 0', ...style } }, parent);
  el('img', { src, width: w, height: h, style: { width: w + 'px', height: h + 'px' } }, box);
  return box;
}
const T = (cx, cy, s) => `translate(${(W / 2 - cx * s).toFixed(2)}px, ${(H / 2 - cy * s).toFixed(2)}px) scale(${s.toFixed(5)})`;
// Camera for "put source point (sx,sy) at screen (X,Y) at scale s".
const at = (sx, sy, X, Y, s) => ({ cx: sx - (X - W / 2) / s, cy: sy - (Y - H / 2) / s, s });
const cupAt = (X, Y, s) => at(CUP[0], CUP[1], X, Y, s);
const screenOf = (cam, sx, sy) => [W / 2 + (sx - cam.cx) * cam.s, H / 2 + (sy - cam.cy) * cam.s];
// Background plate camera: parallax (moves k× as far) and always covers the frame.
function bgCam(cam, k, sMul, iw, ih) {
  const s = Math.max(cam.s * sMul, W / iw, H / ih);
  const cx = CUP[0] + (cam.cx - CUP[0]) * k, cy = CUP[1] + (cam.cy - CUP[1]) * k;
  return { s, cx: clamp(cx, W / 2 / s, iw - W / 2 / s), cy: clamp(cy, H / 2 / s, ih - H / 2 / s) };
}
const kf = (keys, t, fn = ease.inOutCubic) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const p = (keys[i][2] || fn)(ramp(t, keys[i - 1][0], keys[i][0]));
    return keys[i - 1][1].map((v, j) => lerp(v, keys[i][1][j], p));
  }
  return keys[keys.length - 1][1];
};
function line(parent, text, font, size, color, style) {
  return textLine(parent, text, { ...font, fontSize: size + 'px', lineHeight: 1.3, color, textShadow: color === C.deep ? 'none' : SHADOW, ...style });
}
const centered = (top) => ({ top: top + 'px', left: '0', width: W + 'px', justifyContent: 'center' });

// Cup with a contact shadow and a faint counter/floor reflection (one source, three uses).
function cupRig(parent, { reflect = 0.12, shadow = 0.55 } = {}) {
  const sh = el('div', { class: 'abs', style: { width: '640px', height: '90px', borderRadius: '50%', transformOrigin: '0 0', background: `radial-gradient(closest-side, rgba(0,0,0,${shadow}), rgba(0,0,0,0))` } }, parent);
  const refl = img(parent, P('hero-cup.png'), 1600, 1600, { opacity: reflect, WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 1300px, rgba(0,0,0,1) 1545px)' });
  const cup = img(parent, P('hero-cup.png'), 1600, 1600);
  return {
    sh, refl, cup,
    set(cam) {
      cup.style.transform = T(cam.cx, cam.cy, cam.s);
      refl.style.transform = T(cam.cx, cam.cy, cam.s) + ' translate(0px, 3096px) scale(1, -1)';
      const [bx, by] = screenOf(cam, 1005, 1552);
      sh.style.transform = `translate(${(bx - 320 * cam.s).toFixed(1)}px, ${(by - 45 * cam.s).toFixed(1)}px) scale(${cam.s.toFixed(4)})`;
    },
  };
}
// A soft-edged matcha leaf (vector, drawn here) — used as an out-of-focus foreground element.
function leaf(parent, id, c1 = '#2E6B35', c2 = '#7FA84A') {
  const s = el('svg', { width: 260, height: 260, viewBox: '-130 -130 260 260', class: 'abs', style: { overflow: 'visible', transformOrigin: '130px 130px', pointerEvents: 'none' } }, parent);
  const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, el('defs', {}, s));
  el('stop', { offset: 0, 'stop-color': c2 }, g); el('stop', { offset: 1, 'stop-color': c1 }, g);
  el('path', { d: 'M -112 10 C -60 -80 60 -95 116 -10 C 60 60 -50 75 -112 10 Z', fill: `url(#${id})` }, s);
  el('path', { d: 'M -104 9 C -40 -6 40 -14 110 -9', fill: 'none', stroke: 'rgba(214,232,170,0.55)', 'stroke-width': 3.2 }, s);
  const veins = [-70, -40, -10, 20, 50, 80].map((x) => `M ${x} ${(-2 - x * 0.04).toFixed(1)} Q ${x + 14} ${-30 - Math.abs(x) * 0.1} ${x + 30} ${-52 + Math.abs(x) * 0.25} M ${x} ${(-2 - x * 0.04).toFixed(1)} Q ${x + 12} ${22} ${x + 26} ${44 - Math.abs(x) * 0.22}`).join(' ');
  el('path', { d: veins, fill: 'none', stroke: 'rgba(190,215,140,0.32)', 'stroke-width': 1.6 }, s);
  return s;
}
function placeLeaf(L, x, y, rot, sc, blur, op = 1) {
  L.style.transform = `translate(${(x - 130).toFixed(1)}px, ${(y - 130).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
  L.style.filter = `blur(${(blur / sc).toFixed(2)}px)`; L.style.opacity = op.toFixed(3); // blur is in screen px
}

// ---------- timeline ----------
const T1 = 3.0, T2 = 7.0, T3 = 11.0, T4 = 15.0, T5 = 20.0, END = 25.0;

// S1 — cold detail: lid and ice in the real bar, short pull-back; focus travels from the ice to the logo.
const camS1 = (t) => {
  const [cx, cy, s] = kf([[0, [1060, F(820, 860), F(1.6, 1.75)]], [T1, V ? [985, 1159, 1.05] : [1005, 1080, 0.98], ease.outCubic]], t);
  return { cx, cy, s };
};
// S3 — the real counter: truck from the cup to the carton (focus pulls to it), back, then push into the cup.
const camS3 = (t) => {
  const [cx, cy, s] = kf([
    [T2, [960, F(1000, 1160), 1.0]],
    [8.3, [F(815, 840), F(1000, 1160), 1.0], ease.inOutSine],
    [9.4, [F(820, 845), F(1000, 1160), 1.0], ease.linear],
    [T3, [1005, F(1235, 1420), 1.35], ease.inOutCubic],
  ], t);
  return { cx, cy, s };
};
// Product poses (screen X, Y, scale of the logo point) for the studio scenes.
const S1_END = () => { const c = camS1(T1); const [X, Y] = screenOf(c, ...CUP); return [X, Y, c.s]; };
const S3_END = () => { const c = camS3(T3); const [X, Y] = screenOf(c, ...CUP); return [X, Y, c.s]; };
const poseS2 = (t) => { const [X, Y, s] = S1_END(); return kf([[T1, [X, Y, s]], [T2, [X - F(60, 50), Y + F(14, 8), s * 1.05], ease.inOutSine]], t); };
const poseS4 = (t) => { const [X, Y, s] = S3_END(); return kf([[T3, [X, Y, s]], [12.3, [F(760, 720), F(430, 600), F(1.22, 1.4)], ease.inOutCubic], [T4, [F(754, 714), F(424, 594), F(1.24, 1.42)], ease.linear]], t); };
const poseS5 = (t) => kf([[T4, [F(575, 570), F(780, 975), F(1.0, 1.06)]], [20.6, [F(560, 556), F(758, 950), F(1.07, 1.12)], ease.inOutSine]], t);
const poseS6 = (t) => {
  const a = poseS5(Math.min(t, 20.6)), b = [540, F(690, 785), F(0.74, 0.64)];
  const m = ease.inOutCubic(ramp(t, 20.6, 21.7));
  const breath = 1 + 0.012 * ease.inOutSine(ramp(t, 21.7, END));
  return [lerp(a[0], b[0], m), lerp(a[1], b[1], m), lerp(a[2], b[2], m) * breath];
};

// ---------- scenes ----------
function sceneRoot(bg) { return el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', overflow: 'hidden', background: bg || 'none' } }, stage); }

function barRig(root) {
  const bg = img(root, P('bar-tall.png'), 1600, 2400);
  const cartonSh = el('div', { class: 'abs', style: { width: '520px', height: '70px', borderRadius: '50%', transformOrigin: '0 0', background: 'radial-gradient(closest-side, rgba(0,0,0,0.78), rgba(0,0,0,0))' } }, root);
  const carton = img(root, P('hero-carton.png'), 1600, 1600);
  const rig = cupRig(root, { reflect: 0.1, shadow: 0.6 });
  const cupSoft = img(root, P('hero-cup.png'), 1600, 1600, { filter: 'blur(3px)' });
  root.appendChild(rig.cup); // sharp cup above its blurred twin (rack focus)
  return {
    bg, carton, cartonSh, rig, cupSoft,
    set(cam, { cartonBlur = 0, cupBlur = 0, focus } = {}) {
      const b = bgCam(cam, 0.6, F(0.95, 0.95), 1600, 2400);
      bg.style.transform = T(b.cx, b.cy, b.s);
      const cc = { cx: CUP[0] + (cam.cx - CUP[0]) * 0.97, cy: CUP[1] + (cam.cy - CUP[1]) * 0.97, s: cam.s * 0.985 };
      carton.style.transform = T(cc.cx, cc.cy, cc.s);
      carton.style.filter = cartonBlur > 0.05 ? `blur(${cartonBlur.toFixed(2)}px)` : 'none';
      const [cxs, cys] = screenOf(cc, 575, 1446);
      cartonSh.style.transform = `translate(${(cxs - 260 * cc.s).toFixed(1)}px, ${(cys - 35 * cc.s).toFixed(1)}px) scale(${cc.s.toFixed(4)})`;
      rig.set(cam);
      cupSoft.style.transform = T(cam.cx, cam.cy, cam.s);
      if (focus) {
        // sharp only around the focus point (cup-space px), the twin underneath carries the defocus
        rig.cup.style.webkitMaskImage = `radial-gradient(circle 430px at ${focus[0].toFixed(0)}px ${focus[1].toFixed(0)}px, #000 62%, transparent 100%)`;
        show(cupSoft, true);
      } else { rig.cup.style.webkitMaskImage = 'none'; show(cupSoft, cupBlur > 0.05); cupSoft.style.filter = `blur(${cupBlur.toFixed(2)}px)`; }
      if (!focus) rig.cup.style.opacity = (1 - clamp(cupBlur / 2.5)).toFixed(3);
      else rig.cup.style.opacity = '1';
    },
  };
}

function counterFade(root) { if (V) el('div', { class: 'abs', style: { top: '1180px', width: W + 'px', height: '740px', background: 'linear-gradient(180deg, rgba(5,4,3,0), rgba(5,4,3,0.82) 55%, rgba(5,4,3,0.95))' } }, root); }
function initS1() {
  const root = sceneRoot('#0b0806');
  const rig = barRig(root); counterFade(root);
  const scrim = el('div', { class: 'abs', style: { width: W + 'px', height: F(460, 760) + 'px', background: 'linear-gradient(180deg, rgba(6,5,4,0.6), rgba(6,5,4,0))' } }, root);
  const l1 = line(root, 'مش أي ماتشا…', TITLE, F(88, 88), C.cream, V ? { top: '330px', right: '72px', justifyContent: 'flex-start' } : centered(118));
  S.s1 = { root, rig, scrim, l1 };
}
function renderS1(t) {
  const s = S.s1; show(s.root, t < T1); if (t >= T1) return;
  const f = ease.inOutCubic(ramp(t, 0.2, 2.2));
  s.rig.set(camS1(t), { cartonBlur: lerp(9, 3, ease.inOutSine(ramp(t, 0, T1))), focus: [lerp(1000, 1003, f), lerp(815, 1150, f)] });
  playLine(s.l1, t, 0.08, 2.6);
}

function initS2() {
  const root = sceneRoot(`radial-gradient(ellipse 70% 55% at 50% ${F(48, 46)}%, ${C.deep2}, ${C.ink} 80%)`);
  const glow = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 38% 30% at 50% ${F(52, 48)}%, rgba(201,165,92,0.22), rgba(201,165,92,0) 70%)` } }, root);
  const r = rng(31);
  const bokeh = Array.from({ length: 6 }, (_, i) => {
    const d = 80 + r() * 140;
    return { e: el('div', { class: 'abs', style: { width: d + 'px', height: d + 'px', borderRadius: '50%', background: i % 2 ? 'rgba(243,233,214,0.10)' : 'rgba(201,165,92,0.14)', filter: 'blur(14px)' } }, root), x: r() * W, y: r() * H * 0.55 + H * 0.05, d };
  });
  const floor = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: `linear-gradient(180deg, rgba(0,0,0,0) ${F(72, 62)}%, rgba(0,0,0,0.35) 100%)` } }, root);
  const rig = cupRig(root, { reflect: 0.16, shadow: 0.65 });
  const fg = leaf(root, 'lf2');
  const l1 = line(root, 'ماتشا… على مزاجك', TITLE, F(80, 84), C.cream, centered(F(110, 320)));
  S.s2 = { root, glow, bokeh, floor, rig, fg, l1 };
}
function renderS2(t) {
  const s = S.s2; const vis = t >= T1 && t < T2 + 0.05; show(s.root, vis); if (!vis) return;
  const [X, Y, sc] = poseS2(t);
  s.rig.set(cupAt(X, Y, sc));
  const u = ease.inOutSine(ramp(t, T1, T2));
  s.bokeh.forEach((b) => { b.e.style.transform = `translate(${(b.x - b.d / 2 + 26 * u).toFixed(1)}px, ${(b.y - b.d / 2).toFixed(1)}px)`; });
  placeLeaf(s.fg, F(-20, -30) - 140 * u, F(1220, 1700), 30 + 6 * u, F(1.7, 1.9), 16, 0.95);
  playLine(s.l1, t, 3.4, 6.55);
}

function initS3() {
  const root = sceneRoot('#0b0806');
  const rig = barRig(root); counterFade(root);
  const scrim = el('div', { class: 'abs', style: { width: W + 'px', height: F(420, 720) + 'px', background: 'linear-gradient(180deg, rgba(6,5,4,0.55), rgba(6,5,4,0))' } }, root);
  const l1 = line(root, 'مع جوز الهند', TITLE, F(76, 72), C.cream, { top: F(138, 330) + 'px', right: F(60, 72) + 'px', justifyContent: 'flex-start' });
  S.s3 = { root, rig, scrim, l1 };
}
function renderS3(t) {
  const s = S.s3; const vis = t >= T2 - 0.05 && t < T3; show(s.root, vis); if (!vis) return;
  const toCarton = ease.inOutSine(ramp(t, 7.2, 8.2)), back = ease.inOutSine(ramp(t, 9.4, 10.2));
  const k = toCarton * (1 - back);
  s.rig.set(camS3(t), { cartonBlur: 1.2 + 3.5 * (1 - k), cupBlur: 1.6 * k });
  playLine(s.l1, t, 7.75, 10.35);
}

function initS4() {
  const root = sceneRoot(`radial-gradient(ellipse 80% 70% at 62% 45%, ${C.cream}, ${C.creamDk} 85%)`);
  const rig = cupRig(root, { reflect: 0.1, shadow: 0.32 });
  const l1 = line(root, 'وبوبا', TITLE, F(88, 82), C.deep, { top: F(640, 760) + 'px', left: F(60, 70) + 'px', width: F(400, 330) + 'px', justifyContent: 'flex-start' });
  const l2 = line(root, 'تكمل اللحظة', TITLE, F(68, 54), C.deep, { top: F(752, 868) + 'px', left: F(60, 70) + 'px', width: F(400, 330) + 'px', justifyContent: 'flex-start' });
  S.s4 = { root, rig, l1, l2 };
}
function renderS4(t) {
  const s = S.s4; const vis = t >= T3 && t < T4 + 0.05; show(s.root, vis); if (!vis) return;
  const [X, Y, sc] = poseS4(t);
  s.rig.set(cupAt(X, Y, sc));
  playLine(s.l1, t, 12.05, 14.5);
  playLine(s.l2, t, 12.3, 14.55);
}

function initS5() {
  const root = sceneRoot(`radial-gradient(ellipse 80% 62% at 50% ${F(46, 44)}%, #6B4A22, #2A1A0C 62%, #120a05)`);
  const bg = img(root, P('bar-tall.png'), 1600, 2400, { filter: 'blur(16px) sepia(0.45) saturate(1.3) brightness(0.7)', opacity: 0.38, mixBlendMode: 'screen' });
  const glow = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 42% 34% at 50% ${F(50, 46)}%, rgba(236,190,105,0.42), rgba(236,190,105,0) 72%)` } }, root);
  const cartonSh = el('div', { class: 'abs', style: { width: '520px', height: '70px', borderRadius: '50%', transformOrigin: '0 0', background: 'radial-gradient(closest-side, rgba(0,0,0,0.45), rgba(0,0,0,0))' } }, root);
  const carton = img(root, P('hero-carton.png'), 1600, 1600, { display: 'none' });
  const r5 = rng(55);
  const gold = Array.from({ length: 11 }, () => { const d = 70 + r5() * 150; return { e: el('div', { class: 'abs', style: { width: d + 'px', height: d + 'px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,196,120,0.30), rgba(236,196,120,0) 70%)', filter: 'blur(6px)' } }, root), x: r5() * W, y: H * (0.08 + r5() * 0.5), d }; });
  const rig = cupRig(root, { reflect: 0.18, shadow: 0.62 });
  const sweep = el('div', { class: 'abs', style: { width: '1600px', height: '1600px', transformOrigin: '0 0', mixBlendMode: 'screen', WebkitMaskImage: `url(${P('hero-cup.png')})`, WebkitMaskSize: '1600px 1600px', backgroundImage: 'linear-gradient(100deg, rgba(255,240,210,0) 44%, rgba(255,236,196,0.62) 50%, rgba(255,240,210,0) 56%)', backgroundSize: '300% 100%', backgroundRepeat: 'no-repeat' } }, root);
  const fg = leaf(root, 'lf5', '#24552C', '#6E9A3E');
  const scrim = el('div', { class: 'abs', style: { width: W + 'px', height: F(400, 700) + 'px', background: 'linear-gradient(180deg, rgba(10,6,3,0.5), rgba(10,6,3,0))' } }, root);
  const l1 = line(root, 'خُد لحظتك', TITLE, F(104, 108), C.cream, centered(F(110, 320)));
  S.s5 = { root, bg, glow, carton, cartonSh, rig, sweep, fg, scrim, l1, gold };
}
const u5 = (t) => ease.inOutSine(ramp(t, T4, 20.6));
function renderS5(t) {
  const s = S.s5; const vis = t >= T4 - 0.05 && t < 20.7; show(s.root, vis); if (!vis) return;
  const [X, Y, sc] = poseS5(t);
  const cam = cupAt(X, Y, sc);
  s.rig.set(cam);
  s.sweep.style.transform = T(cam.cx, cam.cy, cam.s);
  const sp = ramp(t, 16.6, 18.1); show(s.sweep, sp > 0 && sp < 1); s.sweep.style.backgroundPosition = `${lerp(100, -10, sp)}% 0`;
  show(s.cartonSh, false);
  const b = bgCam(cam, 0.35, 1.05, 1600, 2400); s.bg.style.transform = T(b.cx, b.cy, b.s);
  // Carton set back and to the left: smaller, softer, its base higher than the cup's (depth).
  const cs = sc * 0.58, cxScreen = X - F(380, 360) * sc, baseY = screenOf(cam, 1005, 1552)[1] - 150 * sc;
  s.gold.forEach((g, i) => { g.e.style.transform = `translate(${(g.x - g.d / 2 - 40 * u5(t) * (i % 3 + 1) / 2).toFixed(1)}px, ${(g.y - g.d / 2).toFixed(1)}px)`; });
  const cc = at(575, 1442, cxScreen, baseY, cs);
  s.carton.style.transform = T(cc.cx, cc.cy, cc.s);
  s.cartonSh.style.transform = `translate(${(cxScreen - 260 * cs).toFixed(1)}px, ${(baseY - 35 * cs).toFixed(1)}px) scale(${cs.toFixed(4)})`;
  const u = ramp(t, T4, 20.6);
  placeLeaf(s.fg, W + F(30, 40) - 120 * u, F(140, 260) + 30 * u, -150, F(1.5, 1.7), 18, 0.9);
  playLine(s.l1, t, 15.95, 19.35);
}

function initS6() {
  const root = sceneRoot(`radial-gradient(ellipse 75% 60% at 50% 46%, ${C.deep2}, ${C.ink} 82%)`);
  const glow = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: 'radial-gradient(ellipse 36% 28% at 50% 50%, rgba(201,165,92,0.22), rgba(201,165,92,0) 70%)' } }, root);
  const rig = cupRig(root, { reflect: 0.14, shadow: 0.7 });
  const logoW = F(190, 220);
  const logo = el('img', { src: P('logo-white.png'), class: 'abs', style: { width: logoW + 'px', left: (W / 2 - logoW / 2) + 'px', top: F(64, 290) + 'px' } }, root);
  const ruleY = F(64, 290) + logoW * 0.86 * 0.42;
  const rules = [-1, 1].map((d) => el('div', { class: 'abs', style: { top: ruleY + 'px', height: '3px', width: F(120, 130) + 'px', left: (W / 2 + d * (logoW / 2 + 30) - (d < 0 ? F(110, 120) : 0)) + 'px', background: `linear-gradient(${d < 0 ? 90 : 270}deg, rgba(201,165,92,0), ${C.gold})`, transformOrigin: d < 0 ? '100% 50%' : '0 50%' } }, root));
  const name = line(root, 'ماتشا جوز الهند بالبوبا', TITLE, F(46, 44), C.cream, centered(F(1028, 1066)));
  const pill = el('div', { class: 'abs', style: { left: '0', top: F(1112, 1140) + 'px', width: W + 'px', display: 'flex', justifyContent: 'center' } }, root);
  const pillIn = el('div', { style: { background: C.cream, color: C.deep, borderRadius: '999px', padding: '16px 60px 20px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', direction: 'rtl' } }, pill);
  const cta = textLine(pillIn, 'جرّبها النهارده', { ...BODY, fontSize: F(54, 52) + 'px', lineHeight: 1.2, color: C.deep });
  cta.line.style.position = 'relative';
  const edge = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'abs', style: { pointerEvents: 'none', overflow: 'visible' } }, stage);
  const stroke = el('path', { fill: 'none', stroke: C.gold, 'stroke-width': 2.5 }, edge);
  S.s6 = { root, glow, rig, logo, rules, name, pill, pillIn, cta, edge, stroke };
}
function archAt(cx, cy, w, h) {
  const r = w / 2, top = cy - h / 2, bot = cy + h / 2;
  return `M ${(cx - r).toFixed(1)} ${bot.toFixed(1)} L ${(cx - r).toFixed(1)} ${(top + r).toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + r).toFixed(1)} ${(top + r).toFixed(1)} L ${(cx + r).toFixed(1)} ${bot.toFixed(1)} Z`;
}
function renderS6(t) {
  const s = S.s6; const vis = t >= 19.55; show(s.root, vis); show(s.edge, vis && t < 20.6); if (!vis) return;
  const [X, Y, sc] = poseS6(t);
  s.rig.set(cupAt(X, Y, sc));
  // Masked reveal: an arch (the brand's balcony window) opens around the same cup.
  const g = ease.inOutCubic(ramp(t, 19.6, 20.5));
  const [, Yc] = poseS5(Math.min(t, 20.6));
  const w = lerp(F(300, 320), F(2600, 3400), g), h = w * 1.35, cy = Yc - 30 + (h / 2) * 0.12;
  const d = archAt(X, cy, w, h);
  s.root.style.clipPath = g >= 1 ? 'none' : `path('${d}')`;
  s.stroke.setAttribute('d', d); s.stroke.style.opacity = (prog(t, 19.55, 19.75) * (1 - prog(t, 20.2, 20.55))).toFixed(3);
  s.glow.style.transform = `translate(${(18 * Math.sin(t * 0.7)).toFixed(1)}px, ${(-30 * ramp(t, 20, END)).toFixed(1)}px) scale(${(1 + 0.08 * ramp(t, 20, END)).toFixed(4)})`;
  const lp = ease.outExpo(ramp(t, 20.7, 21.6));
  s.logo.style.opacity = lp.toFixed(3);
  s.logo.style.transform = `translateY(${lerp(14, 0, lp).toFixed(1)}px)`;
  s.logo.style.filter = lp < 0.999 ? `blur(${(6 * (1 - lp)).toFixed(2)}px)` : 'none';
  const rp = ease.outExpo(ramp(t, 21.0, 21.9));
  s.rules.forEach((r) => { r.style.transform = `scaleX(${rp.toFixed(4)})`; r.style.opacity = rp.toFixed(3); });
  playLine(s.name, t, 21.05, 99, { rise: 10 });
  const pp = ease.outBack(ramp(t, 21.4, 21.95), 1.4);
  show(s.pill, t >= 21.4);
  s.pillIn.style.transform = `scale(${pp.toFixed(4)})`;
  s.pillIn.style.opacity = clamp(pp * 1.6).toFixed(3);
  playLine(s.cta, t, 21.55, 99, { rise: 8, blur: 4 });
}

// Pass in front of the lens: a defocused leaf crosses and fully covers the frame at the cut.
function initPass(id) {
  const layer = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', pointerEvents: 'none' } }, stage);
  return { layer, lf: leaf(layer, id, '#16351D', '#4F7A32') };
}
function renderPass(p, t, mid) {
  const on = t > mid - 0.24 && t < mid + 0.24; show(p.layer, on); if (!on) return;
  const u = (t - mid) / 0.24; // -1 … 1 — full cover only for ~3 frames around the cut
  const x = W / 2 - u * (W * 1.25);
  placeLeaf(p.lf, x, H / 2 + u * 60, 80 + u * 8, F(13, 14.5), 14, 1);
}

export default {
  duration: END, fps: 30,
  init(stageEl, opts) {
    stage = stageEl; W = opts.W; H = opts.H; V = H / W > 1.5;
    initS1(); initS2(); initS3(); initS4(); initS5(); initS6();
    S.p2 = initPass('lfp2'); S.p4 = initPass('lfp4');
    el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', pointerEvents: 'none', background: 'radial-gradient(ellipse 85% 78% at 50% 48%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.3))' } }, stage);
    grainAt = grain(stage, { opacity: 0.035 });
  },
  render(t, frame) {
    renderS1(t); renderS2(t); renderS3(t); renderS4(t); renderS5(t); renderS6(t);
    renderPass(S.p2, t, T2); renderPass(S.p4, t, T4);
    grainAt(frame);
  },
};
