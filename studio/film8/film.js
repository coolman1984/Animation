// Film 8 — Pixel Plus — «المحطة القادمة» — 25 s formal pitch film for a factory's top management, 1920×1080 @ 30 fps, 96 BPM (bar 2.5 s).
// Same order as the owner's reference: who we work with → who we are → not ready-made tools, built from the real work → hand in hand →
// our clients → never theory: we go onto the floor → (instead of "and many more") your factory is the next station → logo.
// Grammar: a production line (rail) runs along the bottom; the brand's blue pixel travels station to station like a work-piece; every
// statement is a station. Blueprint line-art on deep navy, white type, the Pixel Plus blue. Client named in text only (no third-party logo art).
import { clamp, lerp, ramp, ease, el, textLine } from '../lib/motion.js';
import { springStep, hash } from '../lib/kinetics.js';

const C = { ink: '#070B14', navy: '#0E1A33', blue: '#0A66FF', blueL: '#3D8BFF', cyan: '#18B6FF', line: '#5DA9FF', white: '#FFFFFF', grey: '#9AA8BF', greyD: '#5E6B82', red: '#FF6B6B' };
const BG = 'radial-gradient(ellipse 80% 75% at 55% 40%, #13274A 0%, #0B1528 55%, #070B14 100%)';
const PIX_BG = 'linear-gradient(160deg, #3D8BFF 0%, #0A66FF 60%, #0846D6 100%)';
const AR = "'Alexandria'", MONO = "'Space Mono'";
let W = 1920, H = 1080, stage, LOGO;
const S = {}, SC = [];

// ---------- helpers ----------
const px = (v) => `${(+v).toFixed(2)}px`;
const oE = ease.outExpo, ioC = ease.inOutCubic, oC = ease.outCubic;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const spr = (t, start, duration = 0.5, bounce = 0.2) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const place = (n, x, y, w, h, r) => { n.style.left = px(x - w / 2); n.style.top = px(y - h / 2); n.style.width = px(Math.max(0, w)); n.style.height = px(Math.max(0, h)); if (r !== undefined) n.style.borderRadius = px(Math.max(0, r)); };
const setBlur = (n, b) => { n.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : 'none'; };
const shift = (d, dx, dy) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, a, b) => `${(+a - dx).toFixed(2)} ${(+b - dy).toFixed(2)}`);
const pulse = (t, t0, d) => Math.pow(Math.sin(Math.PI * clamp((t - t0) / d)), 2);
const svgIn = (parent, z = 2) => el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: String(z) } }, parent);
// A text line in a box: justify 'end' = right-aligned for Arabic in the right column.
function words(parent, text, { size, weight = 700, color = C.white, cy, x0 = 1000, x1 = 1800, font = AR, dir = 'rtl', track = 0, lh = 1.3, accent = {}, justify = 'flex-start', z = 8 } = {}) {
  const L = textLine(parent, text, { left: px(x0), top: px(cy - (size * lh) / 2), width: px(x1 - x0), justifyContent: justify, fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), letterSpacing: `${track}em`, direction: dir, zIndex: String(z) });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; });
  return L;
}
function rise(L, t, tIn, tOut = 99, { stagger = 0.07, dur = 0.8, dy = 34, blur = 10, outDur = 0.38, outDy = -18 } = {}) {
  const vis = t >= tIn - 0.01 && t <= tOut + outDur + L.words.length * 0.03 + 0.02;
  L.line.style.display = vis ? 'flex' : 'none';
  if (!vis) return;
  L.words.forEach((w, i) => {
    const a = tIn + i * stagger, pin = oE(ramp(t, a, a + dur)), b0 = tOut + i * 0.03, pout = ioC(ramp(t, b0, b0 + outDur));
    w.style.opacity = (clamp(pin * 1.4) * (1 - pout)).toFixed(3);
    w.style.transform = `translateY(${((1 - pin) * dy + pout * outDy).toFixed(2)}px)`;
    setBlur(w, (1 - pin) * blur + pout * 8);
  });
}
function ringAt(n, t, t0, cx, cy, { dur = 0.8, r0 = 14, r1 = 120, a = 0.7 } = {}) {
  const u = ramp(t, t0, t0 + dur);
  if (u <= 0 || u >= 1) { n.style.opacity = '0'; return; }
  const r = lerp(r0, r1, oE(u)); place(n, cx, cy, 2 * r, 2 * r, r); n.style.opacity = (a * Math.pow(1 - u, 1.4)).toFixed(3);
}
// blueprint stroke that draws itself (pathLength = 1) with a soft glow twin
function drawPath(svg, d, { color = C.line, width = 2.5, glow = 9 } = {}) {
  const g = el('path', { d, pathLength: '1', fill: 'none', stroke: color, 'stroke-width': glow, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '0.14', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, svg);
  const p = el('path', { d, pathLength: '1', fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, svg);
  return { g, p, set(u, o = 1, shimmer = 0) { for (const n of [g, p]) n.setAttribute('stroke-dashoffset', (1 - clamp(u)).toFixed(4)); p.setAttribute('opacity', o.toFixed(3)); g.setAttribute('opacity', ((0.14 + shimmer) * o).toFixed(3)); } };
}

// ---------- the production line (rail) and its stations ----------
const RAIL = 930;
const STN = [
  { t: 0.4, label: 'الخبرة' }, { t: 5.0, label: 'الهوية' }, { t: 7.5, label: 'المنهج' }, { t: 12.5, label: 'الشراكة' },
  { t: 15.0, label: 'العملاء' }, { t: 17.5, label: 'الميدان' }, { t: 20.2, label: 'مصنعكم', open: true },
].map((s, i) => ({ ...s, x: 1740 - i * 262, n: String(i + 1).padStart(2, '0') }));
function pixX(t) { let x = STN[0].x; for (let i = 1; i < STN.length; i++) x += (STN[i].x - STN[i - 1].x) * clamp(spr(t, STN[i].t - 0.45, 0.55, 0.12), 0, 1.06); return x; }
const pixAt = (t) => ({ x: pixX(t), y: RAIL - 22 });

// ---------- factory blueprint (generic illustration, not any real plant) ----------
const FACT = [
  'M 140 760 H 880',
  'M 170 760 V 585 L 255 525 V 585 L 340 525 V 585 L 425 525 V 585 L 510 525 V 760',
  'M 455 545 V 440 H 485 V 523',
  'M 560 760 V 610 H 700 V 545 H 860 V 760',
  'M 230 640 H 450 Q 458 640 458 648 V 716 Q 458 724 450 724 H 230 Q 222 724 222 716 V 648 Q 222 640 230 640 Z M 312 724 L 300 744 M 368 724 L 380 744 M 290 744 H 390',
  'M 690 600 H 742 Q 752 600 752 610 V 726 Q 752 736 742 736 H 690 Q 680 736 680 726 V 610 Q 680 600 690 600 Z M 706 612 H 726',
  'M 780 760 V 690 H 830 V 760',
];
const TV_ICON = 'M -38 -26 H 38 Q 44 -26 44 -20 V 20 Q 44 26 38 26 H -38 Q -44 26 -44 20 V -20 Q -44 -26 -38 -26 Z M -14 26 L -20 38 M 14 26 L 20 38 M -26 38 H 26';
const PHONE_ICON = 'M -18 -40 H 18 Q 26 -40 26 -32 V 32 Q 26 40 18 40 H -18 Q -26 40 -26 32 V -32 Q -26 -40 -18 -40 Z M -7 -31 H 7 M -4 31 H 4';
// pixel-art monitor with a play mark (the "custom solution" built from pixels): 15 × 11
const PIXART = [
  '###############',
  '#.............#',
  '#.............#',
  '#.....#.......#',
  '#.....##......#',
  '#.....###.....#',
  '#.....##......#',
  '#.....#.......#',
  '#.............#',
  '###############',
  '......###......',
].flatMap((row, j) => [...row].map((c, i) => (c === '#' ? [i, j] : null)).filter(Boolean));

// =====================================================================================================
SC.push({ id: 'world', a: 0, b: 25.1, z: 1, init(root) {
  full(root, { background: BG });
  const grid = div(root, { left: '-80px', top: '-80px', width: px(W + 160), height: px(H + 160), transformOrigin: '50% 50%',
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(120,160,230,0.07) 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, rgba(120,160,230,0.07) 0 1px, transparent 1px 48px), repeating-linear-gradient(0deg, rgba(120,160,230,0.08) 0 1.5px, transparent 1.5px 240px), repeating-linear-gradient(90deg, rgba(120,160,230,0.08) 0 1.5px, transparent 1.5px 240px)' });
  const glow = div(root, { width: '1400px', height: '1400px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,102,255,0.26), rgba(10,102,255,0))' });
  const veil = full(root, { background: '#0B1528', zIndex: '40' });
  S.world = { root, grid, glow, veil };
}, render(t) {
  const s = S.world;
  s.grid.style.transform = `translate(${(-24 * Math.sin(t * 0.12)).toFixed(1)}px, ${(-16 * t / 25).toFixed(1)}px) scale(${(1 + 0.03 * t / 25).toFixed(4)})`;
  s.grid.style.opacity = sm(0, 1.0, t).toFixed(3);
  place(s.glow, 960 + 380 * Math.sin(t * 0.8), 470 + 160 * Math.cos(t * 0.63), 1400, 1400);
  s.veil.style.opacity = (0.6 * (1 - sm(0, 0.45, t))).toFixed(3);
} });

// ---------- the rail ----------
SC.push({ id: 'rail', a: 0, b: 25.1, z: 6, init(root) {
  const svg = svgIn(root, 1);
  const defs = el('defs', {}, svg), lg = el('linearGradient', { id: 's8done', gradientUnits: 'userSpaceOnUse', x1: 1800, y1: 0, x2: 120, y2: 0 }, defs);
  el('stop', { offset: '0', 'stop-color': C.cyan }, lg); el('stop', { offset: '1', 'stop-color': C.blue }, lg);
  const base = el('path', { d: `M 1800 ${RAIL} H 120`, pathLength: '1', fill: 'none', stroke: 'rgba(154,168,191,0.45)', 'stroke-width': 2, 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, svg);
  const done = el('path', { d: `M 1800 ${RAIL} H 120`, fill: 'none', stroke: 'url(#s8done)', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  const flow = el('path', { d: `M 1800 ${RAIL} H 120`, fill: 'none', stroke: 'rgba(24,182,255,0.55)', 'stroke-width': 3, 'stroke-dasharray': '10 30' }, svg);
  let ticks = ''; for (let x = 1800; x >= 120; x -= 40) ticks += `M ${x} ${RAIL - 5} V ${RAIL + 5} `;
  const tk = el('path', { d: ticks, fill: 'none', stroke: 'rgba(154,168,191,0.35)', 'stroke-width': 1.5 }, svg);
  const nodes = STN.map((s) => {
    const ring = el('circle', { cx: s.x, cy: RAIL, r: 11, fill: '#0B1528', stroke: s.open ? C.cyan : 'rgba(154,168,191,0.7)', 'stroke-width': 2, 'stroke-dasharray': s.open ? '4 4' : 'none' }, svg);
    const dot = el('circle', { cx: s.x, cy: RAIL, r: 5, fill: C.cyan, opacity: '0' }, svg);
    const num = words(root, s.n, { size: 18, weight: 400, font: MONO, color: C.greyD, cy: RAIL - 36, x0: s.x - 60, x1: s.x + 60, justify: 'center', dir: 'ltr', lh: 1.2, z: 3 });
    const lab = words(root, s.label, { size: 26, weight: 500, color: C.grey, cy: RAIL + 44, x0: s.x - 120, x1: s.x + 120, justify: 'center', lh: 1.25, z: 3 });
    return { s, ring, dot, num, lab };
  });
  const pix = div(root, { background: PIX_BG, boxShadow: '0 0 26px rgba(24,182,255,0.55), 0 6px 14px rgba(0,0,0,0.4)', zIndex: '5' });
  const ring = div(root, { borderRadius: '50%', border: `2px solid ${C.cyan}`, zIndex: '4', opacity: '0' });
  S.rail = { root, flow, base, done, tk, nodes, pix, ring };
}, render(t) {
  const s = S.rail, draw = oC(ramp(t, 0.1, 1.3)), out = sm(21.7, 22.3, t);
  s.root.style.opacity = (1 - out).toFixed(3);
  s.base.setAttribute('stroke-dashoffset', (1 - draw).toFixed(4));
  s.tk.setAttribute('opacity', draw.toFixed(3));
  s.flow.setAttribute('stroke-dashoffset', (t * 80).toFixed(1)); s.flow.setAttribute('opacity', (draw * 0.8).toFixed(3));
  const x = pixX(t);
  s.done.setAttribute('d', `M 1800 ${RAIL} H ${Math.min(1800, x).toFixed(1)}`);
  s.done.setAttribute('opacity', sm(0.3, 0.8, t).toFixed(3));
  s.nodes.forEach(({ s: st, ring, dot, num, lab }, i) => {
    const seen = sm(0.2 + i * 0.12, 0.5 + i * 0.12, t);
    ring.setAttribute('opacity', seen.toFixed(3));
    const reached = t >= st.t - 0.1;
    dot.setAttribute('opacity', reached ? '1' : '0');
    ring.setAttribute('stroke', reached ? C.cyan : st.open ? C.cyan : 'rgba(154,168,191,0.7)');
    for (const L of [num, lab]) { L.line.style.display = 'flex'; L.words.forEach((w) => { w.style.opacity = seen.toFixed(3); w.style.color = reached ? (L === lab ? C.white : C.cyan) : ''; }); }
  });
  // the work-piece pixel: squash on each arrival, small hop between stations
  let hop = 0, sq = 0;
  for (let i = 1; i < STN.length; i++) { const u = ramp(t, STN[i].t - 0.45, STN[i].t + 0.05); hop += Math.sin(Math.PI * u) * 34; sq += Math.exp(-Math.max(0, t - STN[i].t) * 9) * Math.cos(Math.max(0, t - STN[i].t) * 26) * (t > STN[i].t ? 1 : 0); }
  const z = 26, sx = 1 + 0.25 * sq, sy = 1 - 0.22 * sq;
  place(s.pix, x, RAIL - z / 2 - 6 - hop + (z * (1 - sy)) / 2, z * sx, z * sy, 5);
  s.pix.style.opacity = sm(0.3, 0.6, t).toFixed(3);
  let shown = false;
  for (const st of STN) { const u = ramp(t, st.t, st.t + 0.8); if (u > 0 && u < 1) { ringAt(s.ring, t, st.t, st.x, RAIL, { r0: 12, r1: 70, a: 0.8 }); shown = true; } }
  if (!shown) s.ring.style.opacity = '0';
} });

// =====================================================================================================
// The stage above the rail: left = visuals, right = statements (RTL).
const LOGO_C = [627, 623.5];
SC.push({ id: 'stage', a: 0, b: 25.1, z: 4, init(root) {
  // --- 1. factory blueprint (S1 and again in S6)
  const fsvg = svgIn(root, 2);
  const fact = FACT.map((d) => drawPath(fsvg, d));
  const flab1 = words(root, 'مصنع التليفزيونات', { size: 30, weight: 500, color: C.grey, cy: 800, x0: 140, x1: 540, justify: 'center' });
  const flab2 = words(root, 'مصنع الموبايلات', { size: 30, weight: 500, color: C.grey, cy: 800, x0: 540, x1: 900, justify: 'center' });
  const reticle = el('g', { opacity: '0' }, fsvg);
  el('circle', { cx: 0, cy: 0, r: 46, fill: 'none', stroke: C.cyan, 'stroke-width': 2.5 }, reticle);
  el('path', { d: 'M -66 0 H -30 M 30 0 H 66 M 0 -66 V -30 M 0 30 V 66', stroke: C.cyan, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, reticle);
  const pings = [0, 1, 2].map(() => div(root, { borderRadius: '50%', border: `2.5px solid ${C.cyan}`, zIndex: '5', opacity: '0' }));
  const marks = [0, 1, 2].map(() => div(root, { width: '16px', height: '16px', background: C.blue, boxShadow: '0 0 14px rgba(24,182,255,0.8)', zIndex: '5', opacity: '0' }));
  // S1 copy
  const a1 = words(root, 'من الفريق الذي يعمل مع', { size: 56, weight: 400, color: C.grey, cy: 360 });
  const a2 = words(root, 'سامسونج إلكترونيكس مصر', { size: 84, weight: 700, cy: 480, lh: 1.2 });
  const a3 = words(root, 'SAMSUNG ELECTRONICS EGYPT', { size: 26, weight: 400, font: MONO, color: C.cyan, cy: 580, dir: 'ltr', justify: 'flex-end', track: 0.28 });
  // --- 2. logo (white letters, blue dot and plus), particles from the work-piece pixel
  const logo = div(root, { zIndex: '7', transformOrigin: '0 0' });
  const letters = {};
  for (const [k, v] of Object.entries(LOGO.letters)) {
    const blue = k === 'dot' || k === 'plus';
    const n = div(logo, { left: '0', top: '0', width: '1200px', height: '900px', background: blue ? PIX_BG : '#FFFFFF', clipPath: `path('${v.paths.join(' ')}')`, opacity: '0' });
    n.style.transformOrigin = `${((v.bbox[0] + v.bbox[2]) / 2).toFixed(1)}px ${((v.bbox[1] + v.bbox[3]) / 2).toFixed(1)}px`;
    letters[k] = n;
  }
  const cv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '8' } }, root);
  const LS = 0.9, toScr = (x, y) => [960 + (x - LOGO_C[0]) * LS, 440 + (y - LOGO_C[1]) * LS];
  const parts = LOGO.particles.map((p, i) => {
    const [tx, ty] = toScr(p[0], p[1]), r1 = hash(i, 7), r2 = hash(i, 11);
    return { tx, ty, col: p[3] === 'dot' || p[3] === 'plus' ? '#2F86FF' : '#FFFFFF', delay: 0.25 * r1, off: (r2 - 0.5) * 520 };
  });
  const svcs = words(root, 'إعلانات  ·  أنيميشن  ·  برمجيات', { size: 46, weight: 500, color: C.grey, cy: 720, x0: 360, x1: 1560, justify: 'center' });
  svcs.words.forEach((w, i) => { if (i % 2) w.style.color = C.cyan; });
  // --- 3. ready-made templates rejected, a custom solution built from pixels
  const tiles = Array.from({ length: 12 }, (_, i) => { const n = div(root, { borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(154,168,191,0.35)', zIndex: '3', opacity: '0' });
    const ic = div(n, { left: '30%', top: '30%', width: '40%', height: '40%', borderRadius: i % 3 === 0 ? '50%' : '6px', border: '1.5px solid rgba(154,168,191,0.4)' }); return n; });
  const beam = div(root, { width: '6px', height: '520px', background: `linear-gradient(180deg, rgba(24,182,255,0), ${C.cyan}, rgba(24,182,255,0))`, boxShadow: '0 0 28px rgba(24,182,255,0.8)', zIndex: '6', opacity: '0' });
  const pxls = PIXART.map(() => div(root, { background: PIX_BG, borderRadius: '4px', zIndex: '6', opacity: '0' }));
  const b1 = words(root, 'حلولنا لم تبدأ كأدوات جاهزة..', { size: 64, weight: 600, cy: 420 });
  const b2 = words(root, 'بل بُنيت من واقع خطوط الإنتاج', { size: 64, weight: 700, cy: 420, accent: { 4: C.cyan, 5: C.cyan } });
  const b3 = words(root, 'لكل مصنع تحدياته.. ولكل تحدٍّ حلّه', { size: 40, weight: 400, color: C.grey, cy: 530 });
  // --- 4. hand in hand: two strands braid and become one line
  const hsvg = svgIn(root, 3);
  const strandA = el('path', { fill: 'none', stroke: C.blueL, 'stroke-width': 7, 'stroke-linecap': 'round' }, hsvg);
  const strandB = el('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 7, 'stroke-linecap': 'round' }, hsvg);
  const c1 = words(root, 'نعمل يدًا بيد مع فِرق التصنيع', { size: 64, weight: 700, cy: 420 });
  const c2 = words(root, 'HAND IN HAND', { size: 30, weight: 700, font: MONO, color: C.cyan, cy: 520, dir: 'ltr', justify: 'flex-end', track: 0.5 });
  // --- 5. clients: two cards (text only for the client's name — no third-party logo artwork)
  const cards = [['مصنع التليفزيونات', TV_ICON], ['مصنع الهواتف المحمولة', PHONE_ICON]].map(([label, icon], i) => {
    const box = div(root, { width: '620px', height: '170px', borderRadius: '26px', zIndex: '5', background: 'linear-gradient(100deg, rgba(255,255,255,0) 40%, rgba(160,200,255,0.16) 50%, rgba(255,255,255,0) 60%) no-repeat, linear-gradient(160deg, rgba(36,64,112,0.85), rgba(16,32,62,0.85))', backgroundSize: '600px 100%, 100% 100%', border: '1.5px solid rgba(93,169,255,0.45)', boxShadow: '0 24px 50px rgba(0,0,0,0.35)', opacity: '0' });
    const sv = el('svg', { viewBox: '-60 -60 120 120', style: { position: 'absolute', left: px(620 - 36 - 110), top: '30px', width: '110px', height: '110px', overflow: 'visible' } }, box);
    el('path', { d: icon, fill: 'none', stroke: C.cyan, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
    const L = textLine(box, label, { left: '0', top: '34px', width: px(620 - 170), justifyContent: 'flex-start', fontFamily: AR, fontSize: '36px', fontWeight: '600', color: '#fff', direction: 'rtl', lineHeight: '1.3' });
    const chip = div(box, { left: px(620 - 170 - 150), top: '104px', width: '150px', height: '40px', borderRadius: '20px', background: 'rgba(10,102,255,0.28)', border: `1px solid ${C.cyan}` });
    textLine(chip, 'عميل حالي', { left: '0', top: '0', width: '150px', height: '40px', justifyContent: 'center', alignItems: 'center', fontFamily: AR, fontSize: '22px', fontWeight: '500', color: C.cyan, direction: 'rtl' });
    return { box, L, i };
  });
  const d1 = words(root, 'عملاؤنا اليوم', { size: 56, weight: 400, color: C.grey, cy: 360 });
  const d2 = words(root, 'سامسونج إلكترونيكس مصر', { size: 84, weight: 700, cy: 470, lh: 1.2 });
  const d3 = words(root, 'SAMSUNG ELECTRONICS EGYPT', { size: 26, weight: 400, font: MONO, color: C.cyan, cy: 565, dir: 'ltr', justify: 'flex-end', track: 0.28 });
  // --- 6. on the floor
  const e1 = words(root, 'لا نقدّم عروضًا نظرية..', { size: 58, weight: 400, color: C.grey, cy: 350 });
  const e2 = words(root, 'ندخل معكم أرض المصنع', { size: 78, weight: 700, cy: 465, lh: 1.2 });
  const e3 = words(root, 'ونفهم التحديات التي تواجهونها', { size: 50, weight: 400, cy: 572, accent: { 1: C.cyan } });
  // --- 7. your factory is the next station → logo
  const f1 = words(root, 'ومصنعكم..', { size: 70, weight: 400, color: C.grey, cy: 380, x0: 360, x1: 1560, justify: 'center' });
  const f2 = words(root, 'المحطة القادمة', { size: 128, weight: 800, color: C.cyan, cy: 520, x0: 260, x1: 1660, justify: 'center', lh: 1.15 });
  const tag = words(root, 'نصنع الفرق.. بكسل ببكسل', { size: 60, weight: 600, cy: 760, x0: 260, x1: 1660, justify: 'center', accent: { 2: C.cyan, 3: C.cyan } });
  const svc2 = words(root, 'ADVERTISING · ANIMATION · SOFTWARE', { size: 24, weight: 400, font: MONO, color: C.grey, cy: 850, x0: 260, x1: 1660, justify: 'center', dir: 'ltr', track: 0.3 });
  const ringL = div(root, { borderRadius: '50%', border: `2.5px solid ${C.cyan}`, zIndex: '6', opacity: '0' });
  S.stage = { root, fact, flab1, flab2, reticle, pings, marks, a1, a2, a3, logo, letters, cv, g: cv.getContext('2d'), parts, svcs, tiles, beam, pxls, b1, b2, b3, strandA, strandB, c1, c2, cards, d1, d2, d3, e1, e2, e3, f1, f2, tag, svc2, ringL };
}, render(t) {
  const s = S.stage;
  // 1 + 6: factory blueprint
  const fOut1 = sm(4.55, 4.95, t), fIn2 = sm(17.55, 18.0, t), fOut2 = sm(19.9, 20.3, t);
  s.fact.forEach((p, i) => {
    const u = t < 10 ? ioC(ramp(t, 0.3 + i * 0.18, 1.5 + i * 0.18)) : 1;
    const o = t < 10 ? 1 - fOut1 : fIn2 * (1 - fOut2);
    p.set(u, o, 0.16 * (0.5 + 0.5 * Math.sin(t * 3.1 + i * 0.9)));
  });
  rise(s.flab1, t, 2.2, 4.45, { dy: 14 }); rise(s.flab2, t, 2.35, 4.5, { dy: 14 });
  rise(s.a1, t, 0.6, 4.4); rise(s.a2, t, 1.15, 4.45, { stagger: 0.1 }); rise(s.a3, t, 1.9, 4.5, { stagger: 0.12, dy: 18 });
  // reticle scanning the floor, three pings
  const RK = [[18.0, 760, 700], [18.6, 330, 680], [19.2, 400, 560], [19.8, 720, 650]];
  let rx = RK[0][1], ry = RK[0][2];
  for (let i = 1; i < RK.length; i++) { const u = ioC(ramp(t, RK[i - 1][0], RK[i][0])); if (t >= RK[i - 1][0]) { rx = lerp(RK[i - 1][1], RK[i][1], u); ry = lerp(RK[i - 1][2], RK[i][2], u); } }
  s.reticle.setAttribute('transform', `translate(${rx.toFixed(1)} ${ry.toFixed(1)})`);
  s.reticle.setAttribute('opacity', (sm(17.9, 18.15, t) * (1 - fOut2)).toFixed(3));
  [[18.6, 330, 680], [19.2, 400, 560], [19.8, 720, 650]].forEach(([tp, x, y], i) => { ringAt(s.pings[i], t, tp, x, y, { r0: 10, r1: 90, a: 0.9 }); const m = spr(t, tp, 0.4, 0.3); place(s.marks[i], x, y, 16 * clamp(m, 0, 1.3), 16 * clamp(m, 0, 1.3)); s.marks[i].style.opacity = (clamp(m * 3) * (1 - fOut2)).toFixed(3); });
  rise(s.e1, t, 17.6, 19.95); rise(s.e2, t, 18.0, 20.0, { stagger: 0.1 }); rise(s.e3, t, 18.5, 20.05, { stagger: 0.08 });
  // 2: logo — particles from the work-piece pixel, crisp letters, then it parks small in the corner (a presentation's brand mark), returns at the end
  const P0 = pixAt(t), g = s.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  if (t >= 5.0 && t < 6.4) {
    for (const p of s.parts) {
      const tau = t - 5.05 - p.delay; if (tau <= 0) continue;
      const e = springStep(tau, { duration: 0.6, bounce: 0.14 }).value, v = 1 - e, cx = (STN[1].x + p.tx) / 2 + p.off * 0.4, cy = (RAIL + p.ty) / 2 - 260;
      const x = v * v * STN[1].x + 2 * v * e * cx + e * e * p.tx, y = v * v * (RAIL - 22) + 2 * v * e * cy + e * e * p.ty, sz = lerp(4, 9.5, clamp(e));
      g.globalAlpha = 1 - sm(5.95, 6.3, t); g.fillStyle = p.col; g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
  }
  const crisp = sm(5.85, 6.2, t);
  const park = ioC(ramp(t, 7.25, 7.95)), back = spr(t, 21.95, 0.7, 0.14);
  let ls = lerp(0.9, 0.22, park), lx = lerp(960, 230, park), ly = lerp(440, 96, park);
  ls = lerp(ls, 0.8, clamp(back, 0, 1.05)); lx = lerp(lx, 960, clamp(back, 0, 1)); ly = lerp(ly, 470, clamp(back, 0, 1));
  s.logo.style.transform = `translate(${lx.toFixed(2)}px, ${ly.toFixed(2)}px) scale(${ls.toFixed(4)}) translate(${-LOGO_C[0]}px, ${-LOGO_C[1]}px)`;
  for (const [k, n] of Object.entries(s.letters)) {
    if (k === 'plus') { const p = spr(t, 6.05, 0.55, 0.32); n.style.opacity = clamp(p * 2).toFixed(3); n.style.transform = `rotate(${lerp(-135, 0, clamp(p, 0, 1.1)).toFixed(2)}deg) scale(${clamp(p, 0, 1.2).toFixed(4)})`; continue; }
    if (k === 'dot') { const p = spr(t, 6.2, 0.45, 0.35); n.style.opacity = clamp(p * 2).toFixed(3); n.style.transform = `translateY(${((1 - clamp(p, 0, 1)) * -60).toFixed(1)}px)`; continue; }
    n.style.opacity = crisp.toFixed(3);
  }
  s.logo.style.opacity = (1 - 0.0 * park).toFixed(3);
  rise(s.svcs, t, 6.35, 7.2, { stagger: 0.06, dy: 20 });
  // 3: templates scanned and rejected → pixels build the custom solution
  const TX = 440, TY = 470;
  s.tiles.forEach((n, i) => {
    const c = i % 4, r = Math.floor(i / 4), x = TX + (c - 1.5) * 150, y = TY + (r - 1) * 150;
    const pin = spr(t, 7.6 + 0.04 * i, 0.5, 0.2), hit = t > 8.4 + (3 - c) * 0.22, fall = ioC(ramp(t, 9.0 + (3 - c) * 0.1, 9.7 + (3 - c) * 0.1));
    place(n, x, y + fall * 160, 124, 124, 18);
    n.style.opacity = (clamp(pin * 2) * (1 - fall)).toFixed(3);
    n.style.transform = `scale(${clamp(pin, 0, 1.1).toFixed(3)}) rotate(${(fall * (c % 2 ? 14 : -14)).toFixed(1)}deg)`;
    n.style.borderColor = hit ? 'rgba(255,107,107,0.75)' : 'rgba(154,168,191,0.35)';
  });
  const bu = ramp(t, 8.35, 9.35);
  place(s.beam, lerp(TX + 330, TX - 330, ioC(bu)), TY, 6, 540); s.beam.style.opacity = (bu > 0 && bu < 1 ? 1 : 0).toFixed(0);
  const PS = 26, gx = TX - (15 * PS) / 2, gy = TY - (11 * PS) / 2;
  s.pxls.forEach((n, i) => {
    const [ci, cj] = PIXART[i], tx = gx + ci * PS + PS / 2, ty = gy + cj * PS + PS / 2, d = hash(i, 5) * 0.45, p = clamp(spr(t, 10.0 + d, 0.55, 0.16), 0, 1.08), out = sm(12.15, 12.5, t);
    const sx = STN[2].x, sy = RAIL - 22;
    place(n, lerp(sx, tx, p), lerp(sy, ty, p) - Math.sin(Math.PI * clamp(p)) * 120, PS - 4, PS - 4, 4);
    n.style.opacity = (t >= 10.0 + d ? clamp(p * 3) * (1 - out) : 0).toFixed(3);
  });
  rise(s.b1, t, 7.7, 9.95, { stagger: 0.08 }); rise(s.b2, t, 10.1, 12.3, { stagger: 0.08 }); rise(s.b3, t, 10.6, 12.35, { stagger: 0.06, dy: 18 });
  // 4: two strands braid, then become one line
  const hu = ioC(ramp(t, 12.55, 13.7)), amp = 90 * (1 - ioC(ramp(t, 13.8, 14.5))), ho = sm(12.5, 12.7, t) * (1 - sm(14.7, 15.0, t));
  const strand = (ph) => { const pts = []; const xe = lerp(840, 120, hu); for (let x = 840; x >= xe; x -= 8) pts.push(`${pts.length ? 'L' : 'M'} ${x} ${(470 + amp * Math.sin((840 - x) / 70 + ph + t * 2.2)).toFixed(1)}`); return pts.join(' ') || 'M 0 0'; };
  s.strandA.setAttribute('d', strand(0)); s.strandB.setAttribute('d', strand(Math.PI));
  s.strandA.setAttribute('opacity', ho.toFixed(3)); s.strandB.setAttribute('opacity', (ho * (1 - 0.6 * ioC(ramp(t, 14.0, 14.5)))).toFixed(3));
  rise(s.c1, t, 12.6, 14.85, { stagger: 0.08 }); rise(s.c2, t, 13.0, 14.9, { stagger: 0.12, dy: 18 });
  // 5: clients
  s.cards.forEach(({ box, i }) => {
    const p = clamp(spr(t, 15.15 + i * 0.25, 0.55, 0.16), 0, 1.1), out = ioC(ramp(t, 17.2 + i * 0.05, 17.55 + i * 0.05));
    box.style.display = t >= 15.1 && t < 17.7 ? 'block' : 'none';
    place(box, 440 - (1 - clamp(p)) * 60, 390 + i * 210, 620, 170, 26);
    box.style.backgroundPosition = `${(-600 + ((t - 15) * 420) % 1400).toFixed(0)}px 0`;
    box.style.opacity = (clamp(p * 1.6) * (1 - out)).toFixed(3); setBlur(box, (1 - clamp(p)) * 8 + out * 6);
  });
  rise(s.d1, t, 15.1, 17.25); rise(s.d2, t, 15.35, 17.3, { stagger: 0.1 }); rise(s.d3, t, 15.7, 17.35, { stagger: 0.12, dy: 18 });
  // 7: your factory → logo lock-up
  rise(s.f1, t, 20.3, 21.75); rise(s.f2, t, 20.6, 21.8, { stagger: 0.12, dur: 0.9 });
  ringAt(s.ringL, t, 22.1, 960, 470, { r0: 60, r1: 620, a: 0.45, dur: 1.1 });
  rise(s.tag, t, 22.65, 99, { stagger: 0.09 }); rise(s.svc2, t, 23.1, 99, { stagger: 0.1, dy: 14 });
} });

// =====================================================================================================
export default {
  duration: 25, fps: 30,
  async init(st, { W: w, H: h }) {
    stage = st; W = w; H = h;
    LOGO = await (await fetch(new URL('../film6/plates/logo.json', import.meta.url))).json();
    stage.style.background = C.ink;
    SC.forEach((s) => { s.root = full(stage, { overflow: 'hidden', zIndex: String(s.z), display: 'none' }); s.init(s.root); });
  },
  render(t) {
    for (const s of SC) { const on = t >= s.a && t < s.b; s.root.style.display = on ? 'block' : 'none'; if (on) s.render(t); }
  },
};
