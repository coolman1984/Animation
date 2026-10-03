// Film 7 — SANAD (سند) — «معاك سند» — 25 s Reels ad, authored 1080×1920 @ 30 fps, 96 BPM (beat 0.625 s, bar 2.5 s, 10 bars).
// Idea: the name literally means "support". An owner's growth line is dragged down by the four things they carry alone
// (accounts · team · sales · decisions); the ground rises under the line like a dawn (the support), the weights become light,
// and the brand's own icon is built from its three meanings — shield = trust, infinity ribbon = partnership, arrow = growth —
// then the four weights come back as four calm service rows ("what was heavy became shared") and the logo lands.
// Worlds: night navy (0–6.7) → ivory dawn (5–25). One display family (Alexandria, Arabic + Latin).
// Every frame is a closed-form function of t (springs, seeded hashes): any frame renders identically in any order.
import { clamp, lerp, ramp, ease, el, textLine, track } from '../lib/motion.js';
import { springStep, hash } from '../lib/kinetics.js';

const C = {
  navy: '#0A192F', navyD: '#050E1B', navyL: '#13294B', navyM: '#1B3A66', emerald: '#10B981', emeraldD: '#0B8F66', gold: '#D4AF37', goldL: '#EBCF74', goldD: '#B8921F',
  ivory: '#F8F6F0', ivoryD: '#ECE8DC', mute: '#46536B', white: '#FFFFFF',
};
const NIGHT_BG = 'radial-gradient(ellipse 95% 62% at 50% 40%, #16335F 0%, #0A192F 56%, #050E1B 100%)';
const DAY_BG = 'radial-gradient(ellipse 100% 62% at 50% 36%, #FFFFFF 0%, #F8F6F0 54%, #ECE8DC 100%)';
const AR = "'Alexandria'";
const FPS = 30;
let W = 1080, H = 1920, stage, ICON, WM, AB;
const S = {}, SC = [];

// ---------- helpers ----------
const px = (v) => `${(+v).toFixed(2)}px`;
const oE = ease.outExpo, ioC = ease.inOutCubic, oC = ease.outCubic, ioS = ease.inOutSine;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const spr = (t, start, duration = 0.5, bounce = 0.2) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const place = (n, x, y, w, h, r) => { n.style.left = px(x - w / 2); n.style.top = px(y - h / 2); n.style.width = px(Math.max(0, w)); n.style.height = px(Math.max(0, h)); if (r !== undefined) n.style.borderRadius = px(Math.max(0, r)); };
const setBlur = (n, b) => { n.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : 'none'; };
const shift = (d, dx, dy) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, a, b) => `${(+a - dx).toFixed(2)} ${(+b - dy).toFixed(2)}`);

// Centred Arabic (or Latin) line of word spans — `.line/.word` so the studio's text/safe-area checks see it.
function words(parent, text, { size, weight = 700, color = C.navy, cy, accent = {}, font = AR, track: tr = 0, dir = 'rtl', lh = 1.3, z = 8, cx = W / 2, width = W } = {}) {
  const L = textLine(parent, text, { left: px(cx - width / 2), top: px(cy - (size * lh) / 2), width: px(width), justifyContent: 'center', fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), letterSpacing: `${tr}em`, direction: dir, zIndex: String(z) });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; });
  return L;
}
// Words rise out of blur (content resolves, never just fades), then leave upward.
function rise(L, t, tIn, tOut = 99, { stagger = 0.08, dur = 0.8, dy = 40, blur = 12, outDur = 0.4, outDy = -22, scale0 = 1 } = {}) {
  const vis = t >= tIn - 0.01 && t <= tOut + outDur + L.words.length * 0.03 + 0.02;
  L.line.style.display = vis ? 'flex' : 'none';
  if (!vis) return;
  L.words.forEach((w, i) => {
    const a = tIn + i * stagger, pin = oE(ramp(t, a, a + dur)), b0 = tOut + i * 0.03, pout = ioC(ramp(t, b0, b0 + outDur));
    w.style.opacity = (clamp(pin * 1.4) * (1 - pout)).toFixed(3);
    w.style.transform = `translateY(${((1 - pin) * dy + pout * outDy).toFixed(2)}px) scale(${lerp(scale0, 1, pin).toFixed(4)})`;
    setBlur(w, (1 - pin) * blur + pout * 9);
  });
}
function ringAt(n, t, t0, cx, cy, { dur = 0.9, r0 = 30, r1 = 240, a = 0.6 } = {}) {
  const u = ramp(t, t0, t0 + dur);
  if (u <= 0 || u >= 1) { n.style.opacity = '0'; return; }
  const r = lerp(r0, r1, oE(u));
  place(n, cx, cy, 2 * r, 2 * r, r);
  n.style.opacity = (a * Math.pow(1 - u, 1.4)).toFixed(3);
}
// Closed Catmull-Rom through control points (the ribbon's centre line, fitted on the traced shape).
function catmull(P, n = 24) {
  const out = [], N = P.length;
  for (let i = 0; i < N; i++) {
    const p0 = P[(i - 1 + N) % N], p1 = P[i], p2 = P[(i + 1) % N], p3 = P[(i + 2) % N];
    for (let k = 0; k < n; k++) {
      const u = k / n;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u * u + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u * u * u)));
    }
  }
  return out;
}

// =====================================================================================================
// THE CHART LINE — one geometry used by the line, the four weights and the dawn that lifts them.
const LX0 = 36, LX1 = 992, RISE = 1380;
const base = (x) => 1005 - (x - LX0) * 0.44 + 18 * Math.sin(x / 83 + 0.6);
const WEIGHTS = [
  { label: 'الحسابات', x: 884, t: 2.5 }, { label: 'الفريق', x: 652, t: 3.125 }, { label: 'المبيعات', x: 420, t: 3.75 }, { label: 'القرارات', x: 188, t: 4.375 },
];
const relief = (t) => ioC(ramp(t, 5.0, 5.9));
const rising = (t) => RISE * ioC(ramp(t, 5.0, 6.75));
function lineY(x, t) {
  let sag = 0;
  for (const w of WEIGHTS) sag += 118 * spr(t, w.t, 0.6, 0.3) * Math.exp(-(((x - w.x) / 185) ** 2));
  const trem = 6 * Math.sin(t * 9 + x * 0.021) * sm(1.8, 2.2, t);
  return base(x) + (sag + trem) * (1 - relief(t)) - rising(t);
}

// ---------------------------------------------------------------------------------------------------
// NIGHT 0–6.8 — the world of the weight: navy, a faint chart grid that drifts (parallax) behind the line.
SC.push({ id: 'night', a: 0, b: 6.8, z: 1, init(root) {
  full(root, { background: NIGHT_BG });
  const grid = div(root, { left: '-60px', top: '-60px', width: px(W + 120), height: px(H + 120), zIndex: '1', transformOrigin: '50% 50%',
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1.5px, transparent 1.5px 160px), repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 1.5px, transparent 1.5px 135px)' });
  const veil = full(root, { background: C.navyD, zIndex: '30' });
  S.night = { root, grid, veil };
}, render(t) {
  const s = S.night;
  s.grid.style.transform = `scale(${(1 + 0.06 * ramp(t, 0, 5)).toFixed(4)}) translateY(${(-26 * ramp(t, 0, 5)).toFixed(1)}px)`;
  s.grid.style.opacity = (sm(0.1, 1.2, t) * (1 - sm(5.3, 6.3, t))).toFixed(3);
  s.veil.style.opacity = (0.55 * (1 - sm(0, 0.4, t))).toFixed(3);
} });

// ---------------------------------------------------------------------------------------------------
// THREAD 0–6.8 — the owner's growth line (it climbs, then four weights land on it one per beat), hook copy.
const CHIP_W = 222, CHIP_H = 108;
SC.push({ id: 'thread', a: 0, b: 6.8, z: 3, init(root) {
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '2' } }, root);
  const defs = el('defs', {}, svg);
  const gS = el('linearGradient', { id: 's7stroke', gradientUnits: 'userSpaceOnUse', x1: LX0, y1: 0, x2: LX1, y2: 0 }, defs);
  el('stop', { offset: '0', 'stop-color': C.goldD }, gS); el('stop', { offset: '0.6', 'stop-color': C.gold }, gS); el('stop', { offset: '1', 'stop-color': C.goldL }, gS);
  const gF = el('linearGradient', { id: 's7fill', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 520, x2: 0, y2: 1500 }, defs);
  el('stop', { offset: '0', 'stop-color': '#4A86D6', 'stop-opacity': '0.26' }, gF); el('stop', { offset: '1', 'stop-color': '#4A86D6', 'stop-opacity': '0' }, gF);
  const gM = el('linearGradient', { id: 's7fade', gradientUnits: 'userSpaceOnUse', x1: LX0, y1: 0, x2: LX1 + 40, y2: 0 }, defs);
  el('stop', { offset: '0', 'stop-color': '#fff' }, gM); el('stop', { offset: '0.8', 'stop-color': '#fff' }, gM); el('stop', { offset: '1', 'stop-color': '#000' }, gM);
  const mk = el('mask', { id: 's7mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#s7fade)' }, mk);
  const area = el('path', { fill: 'url(#s7fill)', mask: 'url(#s7mask)' }, svg);
  const halo = el('path', { fill: 'none', stroke: C.goldL, 'stroke-width': 96, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '0' }, svg);
  const glow = el('path', { fill: 'none', stroke: C.gold, 'stroke-width': 22, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '0.16' }, svg);
  const main = el('path', { fill: 'none', stroke: 'url(#s7stroke)', 'stroke-width': 6.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  const head = el('path', { d: 'M 34 0 L -28 -25 L -13 0 L -28 25 Z', fill: C.goldL, 'stroke-linejoin': 'round' }, svg);
  const l1 = words(root, 'شايل شغلك كله', { size: 100, weight: 700, color: C.white, cy: 384, lh: 1.2 });
  const l2 = words(root, 'لوحدك؟', { size: 168, weight: 800, color: C.gold, cy: 562, lh: 1.2 });
  const cap = words(root, 'والمسؤولية بتتراكم..', { size: 70, weight: 400, color: 'rgba(255,255,255,0.84)', cy: 1168, lh: 1.25 });
  const chips = WEIGHTS.map((w) => {
    const box = div(root, { width: px(CHIP_W), height: px(CHIP_H), borderRadius: '26px', zIndex: '6', transformOrigin: '50% 100%', background: 'linear-gradient(180deg, rgba(36,68,116,0.94), rgba(17,40,76,0.94))', border: '1.5px solid rgba(212,175,55,0.55)', boxShadow: '0 22px 40px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.14)', display: 'none' });
    const L = textLine(box, w.label, { left: '0', top: '0', width: px(CHIP_W), height: px(CHIP_H), justifyContent: 'center', alignItems: 'center', fontFamily: AR, fontSize: '46px', fontWeight: '600', color: C.white, direction: 'rtl' });
    return { box, L, w };
  });
  S.thread = { root, svg, area, halo, glow, main, head, l1, l2, cap, chips };
}, render(t) {
  const s = S.thread;
  // line drawn left → right, decelerating; the arrow head rides its tip
  const xe = lerp(LX0, LX1, oC(ramp(t, 0.1, 1.95)));
  const pts = []; for (let x = LX0; x < xe; x += 8) pts.push([x, lineY(x, t)]); pts.push([xe, lineY(xe, t)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  s.main.setAttribute('d', d); s.glow.setAttribute('d', d); s.halo.setAttribute('d', d);
  s.area.setAttribute('d', `${d} L ${xe.toFixed(1)} 2000 L ${LX0} 2000 Z`);
  s.area.style.opacity = (sm(0.5, 1.6, t) * (1 - sm(5.0, 5.5, t))).toFixed(3);
  s.halo.setAttribute('opacity', (0.1 * sm(5.0, 5.4, t) * (1 - sm(6.0, 6.6, t))).toFixed(3));
  const ye = lineY(xe, t), ang = (Math.atan2(lineY(xe + 4, t) - lineY(xe - 4, t), 8) * 180) / Math.PI;
  s.head.setAttribute('transform', `translate(${xe.toFixed(1)} ${ye.toFixed(1)}) rotate(${ang.toFixed(2)})`);
  s.head.setAttribute('opacity', clamp(sm(0.1, 0.35, t)).toFixed(3));
  // hook copy
  rise(s.l1, t, 0.4, 1.95, { stagger: 0.09 });
  rise(s.l2, t, 0.95, 2.0, { stagger: 0.09, scale0: 0.94 });
  rise(s.cap, t, 2.8, 4.95, { stagger: 0.14, dy: 24, blur: 9 });
  // the weights: fall one per beat (ease-in), land on the line, squash, ride its sag, then float up and dissolve into the dawn
  for (const { box, L, w } of s.chips) {
    const fall0 = w.t - 0.36, vis = t >= fall0 && t < 6.9;
    box.style.display = vis ? 'block' : 'none';
    if (!vis) continue;
    const landY = lineY(w.x, w.t) - CHIP_H / 2 - 4;
    let y = t < w.t ? lerp(330, landY, Math.pow(ramp(t, fall0, w.t), 2)) : lineY(w.x, t) - CHIP_H / 2 - 4;
    const tau = Math.max(0, t - w.t), squash = t >= w.t ? Math.exp(-tau * 9) * Math.cos(tau * 26) : 0;
    const lift = ioC(ramp(t, 5.45 + 0.05 * WEIGHTS.indexOf(w), 6.6)), slope = (lineY(w.x + 16, t) - lineY(w.x - 16, t)) / 32;
    y -= lift * 150;
    const tilt = (t >= w.t ? Math.atan(slope) * 57.3 * 0.9 : 0) + lift * (WEIGHTS.indexOf(w) % 2 ? 7 : -7);
    box.style.left = px(w.x - CHIP_W / 2); box.style.top = px(y - CHIP_H / 2);
    box.style.transform = `rotate(${tilt.toFixed(2)}deg) scale(${(1 + 0.05 * squash).toFixed(4)}, ${(1 - 0.12 * squash).toFixed(4)})`;
    const fade = (clamp((t - fall0) / 0.12) * sm(250, 430, y)).toFixed(3);
    box.style.opacity = fade; L.words.forEach((wd) => { wd.style.opacity = fade; });
  }
} });

// ---------------------------------------------------------------------------------------------------
// DAY 5–25 — the dawn: ivory ground rising under the line (clip = the region below the line), then the brand world.
// Owner revision: the build of the icon (shield → ribbon → arrow, 10 s) was cut; the finished logo enters at 7.5.
const CUT = 7.5, SKIP = 10;
const ICON_C = [626, 487];                       // icon source-space centre
const IX0 = 290, IY0 = 110;                      // plate origin (source px)
const RIB = [[372, 495], [430, 400], [520, 372], [645, 495], [740, 570], [815, 605], [880, 585], [900, 497], [870, 410], [815, 382], [740, 420], [645, 495], [560, 570], [480, 600], [410, 575]];
let RIBD = null;
function ribbonClip(p, hw = 66) {
  if (p >= 0.999) return 'none';
  const N = RIBD.length, m = Math.max(2, Math.floor(p * N)), Lp = [], Rp = [];
  for (let i = 0; i < m; i++) {
    const a = RIBD[Math.max(0, i - 1)], b = RIBD[Math.min(N - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const n = Math.hypot(tx, ty) || 1; tx /= n; ty /= n;
    Lp.push([RIBD[i][0] - ty * hw, RIBD[i][1] + tx * hw]); Rp.push([RIBD[i][0] + ty * hw, RIBD[i][1] - tx * hw]);
  }
  const cap = (c, th0, dir) => Array.from({ length: 9 }, (_, k) => { const a = th0 + dir * (k * Math.PI) / 8; return [c[0] + hw * Math.cos(a), c[1] + hw * Math.sin(a)]; });
  const a0 = Math.atan2(Lp[0][1] - RIBD[0][1], Lp[0][0] - RIBD[0][0]), a1 = Math.atan2(Lp[m - 1][1] - RIBD[m - 1][1], Lp[m - 1][0] - RIBD[m - 1][0]);
  const poly = [...cap(RIBD[0], a0 - Math.PI, -1), ...Lp, ...cap(RIBD[m - 1], a1, -1), ...Rp.reverse()];
  return `path('M ${poly.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L ')} Z')`;
}
const ROWS = [
  { label: 'الحسابات والحوكمة', tIn: 17.8125 }, { label: 'الفريق والمواهب', tIn: 18.125 }, { label: 'المبيعات والنمو', tIn: 18.4375 }, { label: 'القرارات والتشغيل', tIn: 18.75 },
];
const rowY = (i) => 856 + i * 106;
// icon pose: gentle pushes while the three meanings build, then it climbs to the top for the services, then lands in the lock-up
function iconPose(t) {
  const up = t >= 17.4 ? 1 : spr(t, 17.2, 0.6, 0.1), down = spr(t, 19.95, 0.7, 0.12);
  const s0 = track([[7.0, 0.80], [9.6, 0.86], [15.0, 0.88, ioS], [17.2, 0.89, ioS]], t, ioS);
  const y0 = track([[7.0, 826], [9.6, 822, ioS], [17.2, 822, ioS]], t, ioS);
  let s = lerp(s0, 0.46, up), y = lerp(y0, 468, up);
  s = lerp(s, 0.56, down); y = lerp(y, 548, down);
  if (t >= 17.4) s *= lerp(0.7, 1, clamp(spr(t, 17.5, 0.6, 0.22), 0, 1.15));
  return { x: 540, y, s: s * (1 + 0.005 * Math.sin(t * 1.9) + 0.035 * Math.max(0, Math.sin(Math.PI * clamp((t - 15.0) / 0.6))) ** 1.5) };
}
function shineLayer(parent, d, ox, oy, z = 9) {
  const g = div(parent, { left: '0', top: '0', width: '1200px', height: '1100px', zIndex: String(z), clipPath: `path('${shift(d, ox, oy)}')`, pointerEvents: 'none' });
  const band = div(g, { left: '0', top: '-200px', width: '150px', height: '1500px', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.6), rgba(255,255,255,0))', transform: 'rotate(18deg)', opacity: '0' });
  return { g, band };
}
SC.push({ id: 'day', a: 5.0, b: 15.1, z: 2, init(root) {
  full(root, { background: DAY_BG });
  const P = ICON.pieces, byId = (i) => P.find((p) => p.id === i);
  const PLATE = new URL('./plates/icon/icon-color.png', import.meta.url).href;
  // watermark: the brand's own letterhead ghost of the shield, as a hairline, drifting very slowly behind everything
  const ghost = el('svg', { width: 1100, height: 1000, viewBox: '0 0 1100 1000', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '1', transformOrigin: '0 0', opacity: '0.07' } }, root);
  for (const i of [2, 3, 4, 5]) el('path', { d: byId(i).d, fill: 'none', stroke: C.navy, 'stroke-width': 1.3 }, ghost);
  const warm = div(root, { left: px(W - 760), top: px(H - 1000), width: '1100px', height: '1100px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(212,175,55,0.2), rgba(212,175,55,0))', zIndex: '1' });
  const cool = div(root, { left: px(-420), top: px(120), width: '1000px', height: '1000px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(16,185,129,0.1), rgba(16,185,129,0))', zIndex: '1' });
  // --- the answer: «مش لازم / تشيل لوحدك.»
  const t1 = words(root, 'مش لازم', { size: 178, weight: 800, color: C.navy, cy: 706, lh: 1.15 });
  const t2 = words(root, 'تشيل لوحدك.', { size: 92, weight: 300, color: C.mute, cy: 872, lh: 1.25, accent: { 1: C.emeraldD } });
  // --- the icon, built from its three meanings
  const cam = div(root, { left: '0', top: '0', width: '1200px', height: '1100px', zIndex: '6', transformOrigin: '0 0' });
  const grp = (parent) => div(parent, { left: '0', top: '0', width: '1200px', height: '1100px' });
  const pieceImg = (parent, p) => el('img', { src: PLATE, style: { position: 'absolute', left: px(IX0), top: px(IY0), width: '670px', height: '750px', clipPath: `path('${shift(p.d, IX0, IY0)}')` } }, parent);
  const gNavy = grp(cam), gGold = grp(cam), gRib = grp(cam), gArr = grp(cam);
  // the logo's own white halos: the ribbon and the arrow cut through what is behind them
  const halo = (parent, ids) => { const sv = el('svg', { width: 1200, height: 1100, viewBox: '0 0 1200 1100', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, parent); ids.forEach((i) => el('path', { d: byId(i).d, fill: '#fff', stroke: '#fff', 'stroke-width': 18, 'stroke-linejoin': 'round' }, sv)); };
  // bridges: the logo's ribbon cuts the shield's sides, so the shield alone would look broken. Two stroked curves continue the sides
  // (fitted on the logo by eye, band width ≈ 48 px) and fade out as the ribbon is drawn over them.
  const bridge = (parent, d, col) => { const sv = el('svg', { width: 1200, height: 1100, viewBox: '0 0 1200 1100', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, parent); return el('path', { d, fill: 'none', stroke: col, 'stroke-width': 47, 'stroke-linecap': 'butt' }, sv); };
  const bN = bridge(gNavy, 'M 347 392 C 347 500 372 585 421 662', C.navy), bG = bridge(gGold, 'M 909 282 C 908 420 882 550 836 658', '#C9A233');
  [2, 4].forEach((i) => pieceImg(gNavy, byId(i))); [3, 5].forEach((i) => pieceImg(gGold, byId(i)));
  halo(gRib, [1, 0, 7, 9, 8]); halo(gArr, [6]);
  [1, 0, 7, 9, 8].forEach((i) => pieceImg(gRib, byId(i))); pieceImg(gArr, byId(6));
  gNavy.style.transformOrigin = '626px 487px'; gGold.style.transformOrigin = '626px 487px'; gArr.style.transformOrigin = '735px 478px';
  const outl = el('svg', { width: 1200, height: 1100, viewBox: '0 0 1200 1100', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '3' } }, cam);
  const blue = [2, 4, 3, 5].map((i) => el('path', { d: byId(i).d, fill: 'none', stroke: byId(i).cls === 'gold' ? C.gold : C.navy, 'stroke-width': 2, 'stroke-linejoin': 'round', opacity: '0' }, outl));
  const outPaths = [2, 4, 3, 5].map((i) => el('path', { d: byId(i).d, pathLength: '1', fill: 'none', stroke: byId(i).cls === 'gold' ? C.gold : C.navy, 'stroke-width': 3.4, 'stroke-linejoin': 'round', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, outl));
  const orbit = el('svg', { width: 1200, height: 1100, viewBox: '0 0 1200 1100', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '8' } }, cam);
  const orbPaths = [2, 4, 3, 5].map((i) => [8, 3].map((sw) => el('path', { d: byId(i).d, pathLength: '1', fill: 'none', stroke: sw > 5 ? 'rgba(235,207,116,0.38)' : '#FFF4C8', 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '0.1 0.9', 'stroke-dashoffset': '0', opacity: '0' }, orbit)));
  const shield = shineLayer(cam, [2, 3, 4, 5].map((i) => byId(i).d).join(' '), 0, 0);
  const rshine = shineLayer(cam, [0, 1, 7, 8, 9].map((i) => byId(i).d).join(' '), 0, 0);
  const pen = div(cam, { width: '34px', height: '34px', borderRadius: '50%', background: 'radial-gradient(closest-side, #FFFFFF, rgba(255,244,200,0.7) 45%, rgba(255,244,200,0))', zIndex: '9', opacity: '0' });
  const trailSvg = el('svg', { width: 1200, height: 1100, viewBox: '0 0 1200 1100', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '4' } }, cam);
  const tdef = el('defs', {}, trailSvg), tg = el('linearGradient', { id: 's7trail', gradientUnits: 'userSpaceOnUse', x1: 903, y1: 306, x2: 1460, y2: -280 }, tdef);
  el('stop', { offset: '0', 'stop-color': C.gold }, tg); el('stop', { offset: '1', 'stop-color': C.gold, 'stop-opacity': '0' }, tg);
  const trailGlow = el('path', { d: 'M 903 306 L 1460 -280', pathLength: '1', fill: 'none', stroke: 'url(#s7trail)', 'stroke-width': 24, 'stroke-linecap': 'round', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1', opacity: '0.2' }, trailSvg);
  const trail = el('path', { d: 'M 903 306 L 1460 -280', pathLength: '1', fill: 'none', stroke: 'url(#s7trail)', 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, trailSvg);
  const comet = div(cam, { width: '46px', height: '46px', borderRadius: '50%', background: 'radial-gradient(closest-side, #FFFFFF, rgba(255,236,170,0.75) 40%, rgba(255,236,170,0))', zIndex: '9', opacity: '0' });
  const ring3 = div(root, { borderRadius: '50%', border: `3px solid ${C.gold}`, zIndex: '5', opacity: '0' });
  const ring = div(root, { borderRadius: '50%', border: `2.5px solid ${C.gold}`, zIndex: '5', opacity: '0' });
  const ring2 = div(root, { borderRadius: '50%', border: `2.5px solid ${C.emerald}`, zIndex: '5', opacity: '0' });
  // --- headlines (one idea per bar): «معاك سند.» → ثقة → شراكة → نمو
  const arBox = div(root, { left: '0', top: '0', width: px(W), height: '200px', zIndex: '8' });
  const abody = AB.parts[0], adot = AB.parts[1], AS = 0.98, awW = (abody.bbox[2] - abody.bbox[0]) * AS;
  const awX = 232;                                    // left edge of the wordmark
  const arWord = div(arBox, { left: px(awX - abody.bbox[0] * AS), top: px(395 - ((abody.bbox[1] + abody.bbox[3]) / 2) * AS), width: '400px', height: '160px', transformOrigin: `${abody.bbox[0] * AS + awW / 2}px ${abody.bbox[1] * AS + 50}px`, opacity: '0' });
  for (const p of [abody, adot]) div(arWord, { left: '0', top: '0', width: '400px', height: '160px', background: C.navy, transform: `scale(${AS})`, transformOrigin: '0 0', clipPath: `path('${p.d}')` });
  const maak = words(root, 'معاك', { size: 92, weight: 300, color: C.mute, cy: 395, lh: 1.2, cx: awX + awW + 60 + 110, width: 280, z: 9 });
  const h1 = words(root, 'ثقة', { size: 184, weight: 800, color: C.navy, cy: 398, lh: 1.15 });
  const h2 = words(root, 'شراكة', { size: 184, weight: 800, color: C.emeraldD, cy: 398, lh: 1.15 });
  const h3 = words(root, 'نمو', { size: 184, weight: 800, color: '#946F0E', cy: 398, lh: 1.15 });
  const d1 = words(root, 'تحمي كل قرار تاخده', { size: 60, weight: 500, color: C.mute, cy: 1178, lh: 1.25 });
  const d2 = words(root, 'بتكمّل معاك الطريق', { size: 60, weight: 500, color: C.mute, cy: 1178, lh: 1.25 });
  const d3 = words(root, 'مستدام.. بثبات', { size: 60, weight: 500, color: C.mute, cy: 1178, lh: 1.25 });
  // --- shared: rows
  const shared = words(root, 'اللي كان تقيل.. بقى مشترك.', { size: 66, weight: 700, color: C.navy, cy: 738, lh: 1.25, accent: { 3: C.emeraldD, 4: C.emeraldD } });
  const rows = ROWS.map((r, i) => {
    const box = div(root, { width: '920px', height: '96px', borderRadius: '26px', zIndex: '7', background: 'rgba(255,255,255,0.92)', border: '1.5px solid rgba(10,25,47,0.09)', boxShadow: '0 16px 34px rgba(10,25,47,0.09), inset 0 1px 0 #fff', display: 'none' });
    const dot = div(box, { left: px(920 - 26 - 54), top: '21px', width: '54px', height: '54px', borderRadius: '50%', background: `linear-gradient(160deg, ${C.emerald}, ${C.emeraldD})`, boxShadow: '0 6px 14px rgba(11,143,102,0.32)' });
    const sv = el('svg', { viewBox: '-25 -25 50 50', style: { position: 'absolute', left: '0', top: '0', width: '54px', height: '54px', overflow: 'visible' } }, dot);
    const chk = el('path', { d: 'M -11 1 L -3 9 L 12 -8', pathLength: '1', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, sv);
    const L = textLine(box, r.label, { left: '0', top: '0', width: px(820), height: '96px', justifyContent: 'flex-start', alignItems: 'center', fontFamily: AR, fontSize: '46px', fontWeight: '600', color: C.navy, direction: 'rtl' });
    return { box, dot, chk, L, r };
  });
  // --- lock-up: SANAD wordmark (traced letters + the gold triangle), hairline + diamond, tagline, CTA
  const WS = 0.69, WX0 = 120, WY0 = 860, wmP = WM.parts.map((p) => ({ ...p, d: shift(p.d, WX0, WY0), bbox: [p.bbox[0] - WX0, p.bbox[1] - WY0, p.bbox[2] - WX0, p.bbox[3] - WY0] }));
  const wmX = 540 - ((wmP[0].bbox[0] + wmP[4].bbox[2]) / 2) * WS, wmY = 842 - ((wmP[0].bbox[1] + wmP[0].bbox[3]) / 2) * WS;
  const wm = div(root, { left: px(wmX), top: px(wmY), width: '1010px', height: '260px', zIndex: '8' });
  const letterSets = [[0], [1], [2], [3], [4, 5], [6]];
  const letters = letterSets.map((idx, k) => {
    const bb = [Math.min(...idx.map((i) => wmP[i].bbox[0])), Math.min(...idx.map((i) => wmP[i].bbox[1])), Math.max(...idx.map((i) => wmP[i].bbox[2])), Math.max(...idx.map((i) => wmP[i].bbox[3]))];
    const outer = div(wm, { left: '0', top: '0', width: '1010px', height: '260px', transformOrigin: `${((bb[0] + bb[2]) / 2) * WS}px ${((bb[1] + bb[3]) / 2) * WS}px`, opacity: '0' });
    div(outer, { left: '0', top: '0', width: '1010px', height: '260px', background: k === 5 ? C.gold : C.navy, transform: `scale(${WS})`, transformOrigin: '0 0', clipPath: `path('${idx.map((i) => wmP[i].d).join(' ')}')` });
    return { outer, k };
  });
  const wmShine = div(wm, { left: '0', top: '0', width: '1010px', height: '260px', zIndex: '3', pointerEvents: 'none', transform: `scale(${WS})`, transformOrigin: '0 0', clipPath: `path('${wmP.map((p) => p.d).join(' ')}')` });
  const wmBand = div(wmShine, { left: '0', top: '-120px', width: '110px', height: '600px', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.75), rgba(255,255,255,0))', transform: 'rotate(18deg)', opacity: '0' });
  const adv = words(root, 'BUSINESS ADVISORY', { size: 31, weight: 300, color: C.navy, cy: 936, dir: 'ltr', track: 0.46, lh: 1.2, z: 8 });
  adv.words[0].style.marginInlineEnd = '0.95em';
  const hair = div(root, { left: px(540 - 150), top: '990px', width: '300px', height: '2px', background: `linear-gradient(90deg, rgba(212,175,55,0), ${C.gold} 30%, ${C.gold} 70%, rgba(212,175,55,0))`, zIndex: '6', transformOrigin: '50% 50%' });
  const diamond = div(root, { left: px(540 - 7), top: px(991 - 7), width: '14px', height: '14px', background: C.gold, zIndex: '7', transform: 'rotate(45deg)' });
  const tag = words(root, 'شريكك في الثقة والنمو المستدام', { size: 52, weight: 500, color: C.navy, cy: 1060, lh: 1.3, accent: { 3: C.emeraldD, 4: C.emeraldD } });
  const cta = div(root, { width: '560px', height: '104px', borderRadius: '52px', zIndex: '8', overflow: 'hidden', background: `linear-gradient(160deg, ${C.navyM}, ${C.navy})`, boxShadow: '0 22px 44px rgba(10,25,47,0.28), inset 0 1px 0 rgba(255,255,255,0.18)', border: '1.5px solid rgba(212,175,55,0.7)' });
  const ctaL = textLine(cta, 'احجز استشارتك', { left: '0', top: '0', width: '100%', height: '104px', justifyContent: 'center', alignItems: 'center', fontFamily: AR, fontWeight: '600', fontSize: '47px', color: '#fff', direction: 'rtl', paddingLeft: '70px' });
  const arrow = el('svg', { viewBox: '-20 -20 40 40', style: { position: 'absolute', left: '54px', top: '34px', width: '36px', height: '36px', overflow: 'visible' } }, cta);
  el('path', { d: 'M 14 0 L -12 0 M -2 -10 L -12 0 L -2 10', fill: 'none', stroke: C.goldL, 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, arrow);
  const ctaShine = div(cta, { left: '0', top: '-20px', width: '120px', height: '140px', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.28), rgba(255,255,255,0))', transform: 'rotate(18deg)', opacity: '0' });
  S.day = { root, blue, bN, bG, ghost, warm, cool, t1, t2, cam, gNavy, gGold, gRib, gArr, outPaths, orbPaths, shield, rshine, pen, trail, trailGlow, comet, ring3, ring, ring2, arWord, maak, h1, h2, h3, d1, d2, d3, shared, rows, wm, letters, adv, hair, diamond, tag, cta, ctaL, arrow, ctaShine, wmBand };
}, render(tReal) {
  const t = tReal < CUT ? tReal : tReal + SKIP; // owner cut: the logo-building section (7.5–17.5 of the long cut) is removed
  const s = S.day;
  // dawn: the ivory ground is the region under the chart line while it rises
  if (t < 6.78) {
    const pts = []; for (let x = -40; x <= W + 40; x += 20) pts.push(`${x}px ${lerp(H + 60, lineY(Math.min(Math.max(x, LX0), LX1 + 30), t), oC(ramp(t, 5.0, 5.75))).toFixed(1)}px`);
    s.root.style.clipPath = `polygon(${pts.join(',')}, ${W + 40}px ${H + 60}px, -40px ${H + 60}px)`;
  } else s.root.style.clipPath = 'none';
  s.ghost.style.transform = `translate(${(-629 + 14 * Math.sin(t * 0.35)).toFixed(1)}px, ${(75 + 10 * Math.cos(t * 0.3)).toFixed(1)}px) scale(1.9)`;
  s.warm.style.transform = `translate(${(-170 * Math.sin(t * 0.8)).toFixed(1)}px, ${(-150 * Math.cos(t * 0.65)).toFixed(1)}px)`;
  s.cool.style.transform = `translate(${(150 * Math.cos(t * 0.7)).toFixed(1)}px, ${(130 * Math.sin(t * 0.55)).toFixed(1)}px)`;
  // «مش لازم / تشيل لوحدك.»
  rise(s.t1, t, 5.8, 7.0, { stagger: 0.12, dur: 0.9, scale0: 0.96 });
  rise(s.t2, t, 6.1, 7.1, { stagger: 0.1 });
  // icon pose
  const P = iconPose(t), vis = t >= 17.4 && t < 25.1;
  s.cam.style.display = vis ? 'block' : 'none'; s.cam.style.opacity = sm(17.5, 17.75, t).toFixed(3); setBlur(s.cam, (1 - sm(17.5, 17.8, t)) * 8);
  s.cam.style.transform = `translate(${P.x.toFixed(2)}px, ${P.y.toFixed(2)}px) scale(${P.s.toFixed(4)}) translate(${-ICON_C[0]}px, ${-ICON_C[1]}px)`;
  // 1) shield: outlines draw, halves fill and lock, a light sweep
  s.blue.forEach((p) => p.setAttribute('opacity', (0.22 * sm(7.15, 7.5, t) * (1 - sm(8.4, 8.9, t))).toFixed(3)));
  s.outPaths.forEach((p, k) => {
    const u = ioC(ramp(t, 7.35 + 0.1 * k, 8.15 + 0.1 * k));
    p.setAttribute('stroke-dashoffset', (1 - u).toFixed(4)); p.setAttribute('opacity', (1 - sm(8.4, 8.9, t)).toFixed(3));
  });
  const lock = clamp(spr(t, 8.1, 0.5, 0.16), 0, 1.2), fillN = sm(8.1, 8.42, t), fillG = sm(8.15, 8.47, t);
  s.gNavy.style.opacity = fillN.toFixed(3); s.gGold.style.opacity = fillG.toFixed(3);
  s.gNavy.style.transform = `translateX(${(-34 * (1 - lock)).toFixed(2)}px) scale(${(1 + 0.02 * Math.sin(Math.PI * clamp((t - 10.1) / 0.5))).toFixed(4)})`;
  s.gGold.style.transform = `translateX(${(34 * (1 - lock)).toFixed(2)}px) scale(${(1 + 0.02 * Math.sin(Math.PI * clamp((t - 10.1) / 0.5))).toFixed(4)})`;
  const bo = (1 - sm(12.8, 13.9, t)).toFixed(3); s.bN.setAttribute('opacity', bo); s.bG.setAttribute('opacity', bo);
  const sh = ramp(t, 8.45, 9.25);
  s.shield.band.style.transform = `translateX(${lerp(260, 980, ioC(sh)).toFixed(1)}px) rotate(18deg)`; s.shield.band.style.opacity = (sh > 0 && sh < 1 ? 1 : 0).toFixed(0);
  ringAt(s.ring, t, 8.3, 540, P.y, { dur: 1.0, r0: 80, r1: 520, a: 0.5 });
  // 2) trust: a light runs round the shield
  const orb = ramp(t, 10.05, 11.7), oa = Math.sin(Math.PI * clamp(orb)) ** 0.6;
  s.orbPaths.forEach((pair, k) => pair.forEach((p) => { p.setAttribute('stroke-dashoffset', (-(ioS(orb)) * 1.0 + k * 0.0).toFixed(4)); p.setAttribute('opacity', (orb > 0 && orb < 1 ? oa : 0).toFixed(3)); }));
  // 3) partnership: the ribbon is drawn along the infinity path by a pen of light
  const rp = ioC(ramp(t, 12.5, 14.05));
  s.gRib.style.clipPath = t < 12.5 ? 'path("M 0 0")' : ribbonClip(rp);
  s.gRib.style.opacity = t >= 12.5 ? '1' : '0';
  const pi = Math.min(RIBD.length - 1, Math.floor(rp * RIBD.length));
  s.pen.style.left = px(RIBD[pi][0] - 17); s.pen.style.top = px(RIBD[pi][1] - 17); s.pen.style.opacity = (t > 12.5 && t < 14.15 ? Math.sin(Math.PI * clamp((t - 12.5) / 1.65)) ** 0.5 : 0).toFixed(3);
  const rs = ramp(t, 14.1, 14.85);
  s.rshine.band.style.transform = `translateX(${lerp(280, 960, ioC(rs)).toFixed(1)}px) rotate(18deg)`; s.rshine.band.style.opacity = (rs > 0 && rs < 1 ? 1 : 0).toFixed(0);
  ringAt(s.ring2, t, 14.0, 540 + (645 - ICON_C[0]) * P.s, P.y + (495 - ICON_C[1]) * P.s, { dur: 0.9, r0: 40, r1: 330, a: 0.45 });
  // 4) growth: the arrow springs out of the ribbon and a gold trail keeps climbing past the frame
  const ap = spr(t, 15.0, 0.5, 0.3);
  s.gArr.style.opacity = clamp(ap * 3).toFixed(3);
  s.gArr.style.transform = `translate(${(-22 * (1 - clamp(ap, 0, 1))).toFixed(2)}px, ${(22 * (1 - clamp(ap, 0, 1))).toFixed(2)}px) scale(${clamp(ap, 0, 1.25).toFixed(4)})`;
  const tr = ioC(ramp(t, 15.4, 16.7));
  s.trail.setAttribute('stroke-dashoffset', (1 - tr).toFixed(4)); s.trailGlow.setAttribute('stroke-dashoffset', (1 - tr).toFixed(4));
  s.trail.setAttribute('opacity', (1 - sm(17.0, 17.4, t)).toFixed(3)); s.trailGlow.setAttribute('opacity', (0.2 * (1 - sm(17.0, 17.4, t))).toFixed(3));
  s.comet.style.left = px(903 + tr * 557 - 23); s.comet.style.top = px(306 - tr * 586 - 23); s.comet.style.opacity = (t > 15.4 && t < 16.7 ? Math.sin(Math.PI * clamp((t - 15.4) / 1.3)) ** 0.5 : 0).toFixed(3);
  ringAt(s.ring3, t, 15.0, 540 + (903 - ICON_C[0]) * P.s, P.y + (306 - ICON_C[1]) * P.s, { dur: 0.9, r0: 20, r1: 380, a: 0.55 });
  // headlines
  rise(s.maak, t, 8.45, 9.85, { stagger: 0.1 });
  const aw = ioC(ramp(t, 8.2, 9.0)), awo = ioC(ramp(t, 9.85, 10.25));
  s.arWord.style.opacity = (aw * (1 - awo)).toFixed(3); s.arWord.style.transform = `translateY(${((1 - aw) * 36 - awo * 22).toFixed(1)}px)`; setBlur(s.arWord, (1 - aw) * 10 + awo * 8);
  rise(s.h1, t, 10.0, 12.35, { stagger: 0.1, dur: 0.9, scale0: 0.95 }); rise(s.d1, t, 10.35, 12.4, { stagger: 0.09, dy: 26, blur: 8 });
  rise(s.h2, t, 12.5, 14.85, { stagger: 0.1, dur: 0.9, scale0: 0.95 }); rise(s.d2, t, 12.85, 14.9, { stagger: 0.09, dy: 26, blur: 8 });
  rise(s.h3, t, 15.0, 17.1, { stagger: 0.1, dur: 0.9, scale0: 0.95 }); rise(s.d3, t, 15.35, 17.15, { stagger: 0.09, dy: 26, blur: 8 });
  // services: the four weights come back, relieved
  rise(s.shared, t, 17.6, 19.75, { stagger: 0.09, dy: 30, blur: 10 });
  s.rows.forEach(({ box, dot, chk, r }, i) => {
    const vis = t >= r.tIn - 0.02 && t < 20.3;
    box.style.display = vis ? 'block' : 'none';
    if (!vis) return;
    const p = clamp(spr(t, r.tIn, 0.55, 0.2), 0, 1.15), out = ioC(ramp(t, 19.8 + i * 0.05, 20.3 + i * 0.05));
    place(box, 540, rowY(i) + (1 - clamp(p)) * 26 + out * 40, 920, 96, 26);
    box.style.opacity = (clamp(p * 1.8) * (1 - out)).toFixed(3);
    setBlur(box, (1 - clamp(p)) * 8 + out * 6);
    const cp = ioC(ramp(t, r.tIn + 0.3125, r.tIn + 0.62));
    chk.setAttribute('stroke-dashoffset', (1 - cp).toFixed(3));
    dot.style.transform = `scale(${(1 + 0.18 * Math.sin(Math.PI * clamp((t - r.tIn - 0.3125) / 0.3))).toFixed(3)})`;
  });
  // lock-up
  const lp = (a) => ioC(ramp(t, a, a + 0.9));
  s.letters.forEach(({ outer, k }) => {
    const a = k === 5 ? 21.15 : 20.2 + k * 0.12, u = lp(a), pop = k === 5 ? clamp(spr(t, a, 0.45, 0.35), 0, 1.3) : 1;
    outer.style.opacity = (k === 5 ? clamp(pop * 2) : u).toFixed(3);
    outer.style.transform = k === 5 ? `translateY(${((1 - clamp(pop, 0, 1)) * 18).toFixed(1)}px) scale(${lerp(0.4, 1, clamp(pop, 0, 1.2)).toFixed(3)})` : `translateY(${((1 - u) * 30).toFixed(1)}px) scale(${lerp(0.97, 1, u).toFixed(4)})`;
    setBlur(outer, (1 - u) * 9);
  });
  rise(s.adv, t, 21.0, 99, { stagger: 0.14, dy: 18, blur: 8 });
  const hr = oE(ramp(t, 21.5, 22.2)); s.hair.style.transform = `scaleX(${hr.toFixed(4)})`; s.hair.style.opacity = hr.toFixed(3);
  s.diamond.style.transform = `rotate(45deg) scale(${clamp(spr(t, 21.7, 0.5, 0.3), 0, 1.3).toFixed(3)})`;
  rise(s.tag, t, 22.5, 99, { stagger: 0.09, dy: 26, blur: 10 });
  const cp = clamp(spr(t, 23.3, 0.55, 0.24), 0, 1.15);
  place(s.cta, 540, 1172, 560, 104, 52);
  s.cta.style.opacity = clamp(cp * 1.6).toFixed(3); s.cta.style.transform = `scale(${lerp(0.7, 1, cp).toFixed(4)})`;
  rise(s.ctaL, t, 23.45, 99, { dy: 16, blur: 8, stagger: 0.07 });
  s.arrow.style.transform = `translateX(${(-5 * Math.sin(Math.PI * clamp((t - 24.0) / 0.5)) + (1 - clamp(cp)) * 16).toFixed(1)}px)`;
  const ws = ramp(t, 22.2, 23.2);
  s.wmBand.style.transform = `translateX(${lerp(-140, 1080, ioC(ws)).toFixed(1)}px) rotate(18deg)`; s.wmBand.style.opacity = (ws > 0 && ws < 1 ? 1 : 0).toFixed(0);
  const cs = ramp(t, 24.1, 24.9);
  s.ctaShine.style.transform = `translateX(${lerp(-160, 640, ioC(cs)).toFixed(1)}px) rotate(18deg)`; s.ctaShine.style.opacity = (cs > 0 && cs < 1 ? 1 : 0).toFixed(0);
} });

// =====================================================================================================
export default {
  duration: 15, fps: FPS,
  async init(st, { W: w, H: h }) {
    stage = st; W = w; H = h;
    const get = async (p) => (await fetch(new URL(p, import.meta.url))).json();
    ICON = await get('./plates/icon/icon.json'); WM = await get('./plates/wm/logo.json'); AB = await get('./plates/ar/logo.json');
    RIBD = catmull(RIB, 24);
    stage.style.background = C.navy;
    SC.forEach((s) => { s.root = full(stage, { overflow: 'hidden', zIndex: String(s.z), display: 'none' }); s.init(s.root); });
  },
  render(t) {
    for (const s of SC) {
      const on = t >= s.a && t < s.b;
      s.root.style.display = on ? 'block' : 'none';
      if (on) s.render(t);
    }
  },
};
