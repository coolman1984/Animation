// Film 20 — PIXEL Plus «ريل الموشن» (20 s, 9:16, 144 BPM). A motion-design showreel in ONE continuous gesture:
// a single black box morphs through interface states — button → player → dial → segmented control → rising bars and a
// counting number → easing-curve editor → aspect-ratio frames → search → full-screen type → button → check → brand —
// while a cursor drives it. Grammar learned from an owner-supplied UI micro-interaction reel (one container that morphs,
// content that blurs out and in, calm holds, quick springy morphs, a narrating cursor). States, copy, art, numbers and
// music are original and Arabic. Pure in t: no clocks, no randomness outside seeded noise.
import { el, clamp, lerp, ramp, ease } from '../lib/motion.js';
import { springStep, springTrack, curves, cubicBezier, noise1, formatNumber } from '../lib/kinetics.js';
import { typeOn, caretVisible } from '../lib/uimotion.js';
import { fitFontSize, textBlock } from '../lib/typography.js';
import { mascotLayer } from '../film19/mascot.js';
import { S, E, MS, MSK, BEAT, BAR, at } from './timing.js';
import { W, H, C, F, ARD, abs, hex, rgbMix, wline, setText, pixelCanvas, pixelCircle, cover, GW, GH, bayer } from './kit.js';

const ein = curves.emphasized;
const sp = (t, start, { dur = 0.5, bounce = 0.3, from = 0, to = 1 } = {}) => (t <= start ? from : from + (to - from) * springStep(t - start, { duration: dur, bounce }).value);
const pulse = (t, k = 5) => Math.exp(-(((t % BEAT) + BEAT) % BEAT) / BEAT * k);
const INK = hex(C.ink), WHITE = hex(C.white), BLUE = hex(C.blue);

// ---------- the box: keys (targets from time t on); every property chases its key with its own spring ----------
const CY = 780, SRC_TOP = 700;
// Box size per state (the content group's authored size) and the scale applied to its content.
const ST = { btn: { w: 520, h: 150, s: 1.25 }, ply: { w: 880, h: 470, s: 1.04 }, dial: { w: 420, h: 420, s: 1.05 },
  seg: { w: 860, h: 150, s: 1.06 }, sta: { w: 900, h: 780, s: 1.03 }, cur: { w: 900, h: 780, s: 1.03 }, src: { w: 880, h: 410, s: 1.04 } };
const bw = k => ST[k].w * ST[k].s, bh = k => ST[k].h * ST[k].s, br = (k, r) => r * ST[k].s;
const pg = (k, lx, ly, cy = CY) => [540 + (lx - ST[k].w / 2) * ST[k].s, cy + (ly - ST[k].h / 2) * ST[k].s];
const pgSearch = (lx, ly) => [540 + (lx - 440) * ST.src.s, SRC_TOP + ly * ST.src.s];
const K0 = { cx: 540, cy: CY, w: bw('btn'), h: bh('btn'), r: 90, col: INK, sh: 0.5 };
const SRCH = bh('src') * 150 / 410;
const KEYS = [
  [0, {}],
  [MS(S.player), { w: bw('ply'), h: bh('ply'), r: br('ply', 56), sh: 1 }],
  [MS(S.dial), { w: bw('dial'), h: bh('dial'), r: 300, sh: 0.8 }],
  [MS(S.seg), { w: bw('seg'), h: bh('seg'), r: 90, col: WHITE, sh: 1 }],
  [MS(S.stats), { w: bw('sta'), h: bh('sta'), r: br('sta', 56) }],
  [MS(S.curve), { col: INK }],
  [MS(S.ratio), { w: 480, h: 853, r: 46 }],
  [E.ratio[1] - 0.15, { w: 700, h: 700 }],
  [E.ratio[2] - 0.15, { w: 920, h: 518 }],
  [E.ratio[3] - 0.15, { w: 640, h: 800 }],
  [MS(S.search), { w: bw('src'), h: SRCH, r: br('src', 44), col: WHITE, cy: SRC_TOP + SRCH / 2 }],
  [E.results - 0.1, { h: bh('src'), cy: SRC_TOP + bh('src') / 2 }],
  [MSK, { cx: 540, cy: 960, w: 1180, h: 2040, r: 0, col: INK, sh: 0 }],
  [MS(S.again), { cx: 540, cy: CY, w: bw('btn'), h: bh('btn'), r: 90, sh: 0.5 }],
  [E.spin, { w: 170, h: 170, r: 90 }],
];
const TRACKS = (() => {
  const props = ['cx', 'cy', 'w', 'h', 'r', 'sh'], cur = { ...K0 };
  const chan = { cx: [], cy: [], w: [], h: [], r: [], sh: [], R: [], G: [], B: [] };
  for (const p of props) chan[p].push([0, cur[p]]);
  chan.R.push([0, cur.col[0]]); chan.G.push([0, cur.col[1]]); chan.B.push([0, cur.col[2]]);
  for (const [t, d] of KEYS.slice(1)) {
    Object.assign(cur, d);
    for (const p of props) if (d[p] !== undefined) chan[p].push([t, cur[p]]);
    if (d.col) { chan.R.push([t, d.col[0]]); chan.G.push([t, d.col[1]]); chan.B.push([t, d.col[2]]); }
  }
  return chan;
})();
// Colour changes are quick (≈2 frames) so a card never lingers in a muddy mid-grey while it changes tone.
const SPR = { size: { duration: 0.5, bounce: 0.14 }, pos: { duration: 0.5, bounce: 0.08 }, rad: { duration: 0.42, bounce: 0.08 }, col: { duration: 0.025, bounce: 0 }, sh: { duration: 0.4, bounce: 0 } };
function boxAt(t) {
  const T = TRACKS, g = (k, cfg) => springTrack(T[k], t, cfg);
  return { cx: g('cx', SPR.pos), cy: g('cy', SPR.pos), w: Math.max(8, g('w', SPR.size)), h: Math.max(8, g('h', SPR.size)), r: Math.max(0, g('r', SPR.rad)),
    sh: clamp(g('sh', SPR.sh), 0, 1.2), col: [g('R', SPR.col), g('G', SPR.col), g('B', SPR.col)].map(v => clamp(v, 0, 255)) };
}

// ---------- cursor ----------
const DIAL = { r: 150 }, A0 = -135 * Math.PI / 180, SWEEP = 270 * Math.PI / 180;
const dialAng = p => A0 + p * SWEEP;
const dialPos = p => [540 + DIAL.r * ST.dial.s * Math.sin(dialAng(p)), CY - DIAL.r * ST.dial.s * Math.cos(dialAng(p))];
const knobP = t => 0.3 + 0.7 * ease.inOutCubic(ramp(t, E.dragA, E.dragB));
const GRAPH = { x0: 130, y0: 600, w: 640, h: 300 };
const P1A = [0.25, 0.25], P1B = [0.22, 1.3], P2A = [0.75, 0.75], P2B = [0.36, 1.0];
const hl = (p) => [GRAPH.x0 + p[0] * GRAPH.w, GRAPH.y0 - p[1] * GRAPH.h];
const hp = (p) => { const l = hl(p); return pg('cur', l[0], l[1]); };
const P1 = t => { const u = ease.outCubic(ramp(t, E.handleA, E.handleA + 0.32)); return [lerp(P1A[0], P1B[0], u), lerp(P1A[1], P1B[1], u)]; };
const P2 = t => { const u = ease.outCubic(ramp(t, E.handleB, E.handleB + 0.28)); return [lerp(P2A[0], P2B[0], u), lerp(P2A[1], P2B[1], u)]; };
const BARS = [0.22, 0.3, 0.27, 0.4, 0.38, 0.5, 0.47, 0.62, 0.6, 0.74, 0.82, 1.0], BAR_W = 44, BAR_X = i => i * (BAR_W + (788 - 12 * BAR_W) / 11), BAR_BASE = 390, BAR_MAX = 350;
const LAST_BAR_TOP = pg('sta', 56 + BAR_X(11) + BAR_W / 2 + 46, 330 + BAR_BASE - BAR_MAX + 30);
const OFF = (p, dx = 0, dy = 0) => [p[0] + dx, p[1] + dy];
const BTN = pg('btn', 452, 108), PLAY = pg('ply', 480, 416), PICK = [470, pgSearch(0, 298)[1] + 6];
const segTip = cx => pg('seg', cx + 62, 126);
const CTA_TIP = [772, 1218];
const WP = [
  [0.0, 300, 1040], [0.74, ...BTN], [E.click1 + 0.25, ...OFF(BTN, 4, 2)], [1.6, 780, 1010],
  [2.62, ...PLAY], [E.pause + 0.2, ...OFF(PLAY, 2, 2)], [3.3, 720, 1010], [E.dragA - 0.08, ...OFF(dialPos(0.3), 26, 16)],
  [E.dragB + 0.05, ...OFF(dialPos(1), 26, 16)], [4.45, 800, 1060], [5.0, ...segTip(715)],
  [E.segA - 0.1, ...segTip(430)], [E.segA + 0.12, ...OFF(segTip(430), 2, 2)], [E.segB - 0.1, ...segTip(145)], [E.segB + 0.14, ...OFF(segTip(145), 2, 2)], [6.0, 360, 1000],
  [6.7, 600, 900], [E.tip - 0.05, ...LAST_BAR_TOP], [7.5, ...OFF(LAST_BAR_TOP, -90, 120)], [E.handleA - 0.06, ...OFF(hp(P1A), 3, 3)],
  [E.handleB - 0.04, ...OFF(hp(P1B), 3, 3)], [E.handleB, ...OFF(hp(P2A), 3, 3)], [E.handleB + 0.3, ...OFF(hp(P2B), 3, 3)], [9.5, 800, 1150], [10.2, 940, 1150], [11.4, 940, 1150],
  [11.9, 780, 1060], [12.35, ...PICK], [E.pick + 0.12, ...OFF(PICK, 2, 2)], [12.95, 900, 1150],
  [14.9, 900, 1400], [15.1, ...OFF(BTN, 70, 40)], [E.click2 - 0.08, ...BTN], [E.click2 + 0.2, ...OFF(BTN, 4, 2)], [15.8, ...OFF(BTN, 90, 100)],
  [18.0, 990, 1500], [E.ctaClick - 0.05, ...CTA_TIP], [18.9, ...CTA_TIP], [19.3, 900, 1330],
];
function cursorAt(t) {
  if (t >= E.dragA && t <= E.dragB) { const q = dialPos(knobP(t)); return [q[0] + 26, q[1] + 16]; }
  if (t < WP[0][0]) return [WP[0][1], WP[0][2]];
  for (let i = 1; i < WP.length; i++) if (t <= WP[i][0]) {
    const a = WP[i - 1], b = WP[i], u = ease.inOutCubic(ramp(t, a[0], b[0])), dx = b[1] - a[1], dy = b[2] - a[2], dist = Math.hypot(dx, dy) || 1;
    const arc = Math.sin(Math.PI * u) * Math.min(90, dist * 0.12);
    return [lerp(a[1], b[1], u) - dy / dist * arc, lerp(a[2], b[2], u) + dx / dist * arc];
  }
  return [WP.at(-1)[1], WP.at(-1)[2]];
}
const CLICKS = [E.click1, E.pause, E.dragA, E.segA, E.segB, E.handleA, E.handleB, E.pick, E.click2, E.ctaClick];
const cursorVisible = t => t < 18.0 ? (t < MSK + 0.05 || (t > 14.9 && t < 16.3)) : t < 19.5;

// ---------- scene objects ----------
let stage, box, glow, hudL, hudR, cursor, ripple, tr, cap = [], G = {}, bursts = [], brandMascot;
const grp = (w, h, { top = false, s = 1 } = {}) => { const g = el('div', { style: abs({ left: '50%', top: top ? '0' : '50%', width: w + 'px', height: h + 'px', marginLeft: -w / 2 + 'px', marginTop: top ? '0' : -h / 2 + 'px', display: 'none', transformOrigin: top ? '50% 0' : '50% 50%', transform: `scale(${s})` }) }, box); g.base = s; return g; };
function fade(g, t, [a, b], { inD = 0.2, outD = 0.1 } = {}) {
  const o = ramp(t, a, a + inD) * (1 - ramp(t, b - outD, b));
  if (o <= 0.001) { g.style.display = 'none'; return 0; }
  g.style.display = 'block'; g.style.opacity = o.toFixed(3);
  const bl = (1 - o) * 12; g.style.filter = bl > 0.25 ? `blur(${bl.toFixed(2)}px)` : 'none';
  return o;
}
const svgEl = (parent, w, h, style = {}) => el('svg', { width: String(w), height: String(h), viewBox: `0 0 ${w} ${h}`, style: abs({ left: '0', top: '0', overflow: 'visible', ...style }) }, parent);
const pathEl = (parent, d, attrs = {}) => el('path', { d, fill: 'none', ...attrs }, parent);
const circ = (parent, cx, cy, r, attrs = {}) => el('circle', { cx, cy, r, ...attrs }, parent);
const pad2 = n => String(n).padStart(2, '0');
const icon = (parent, size, style = {}) => svgEl(parent, 24, 24, { width: size + 'px', height: size + 'px', ...style });
function iconPause(parent, size, color) { const s = icon(parent, size); el('rect', { x: 6, y: 4, width: 4.2, height: 16, rx: 1.4, fill: color }, s); el('rect', { x: 13.8, y: 4, width: 4.2, height: 16, rx: 1.4, fill: color }, s); }
function iconPlay(parent, size, color) { const s = icon(parent, size); el('path', { d: 'M8 4.5 L19 12 L8 19.5 Z', fill: color, stroke: color, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, s); }
function iconSkip(parent, size, color, dir) { const s = icon(parent, size, { transform: dir < 0 ? 'scaleX(-1)' : 'none' }); el('path', { d: 'M5 5 L15 12 L5 19 Z', fill: color }, s); el('rect', { x: 16.5, y: 5, width: 3, height: 14, rx: 1, fill: color }, s); }
function iconSearch(parent, size, color) { const s = icon(parent, size); circ(s, 10.5, 10.5, 6.3, { fill: 'none', stroke: color, 'stroke-width': 2.2 }); pathEl(s, 'M15.4 15.4 L20 20', { stroke: color, 'stroke-width': 2.4, 'stroke-linecap': 'round' }); }
function iconSpring(parent, size, color) { const s = icon(parent, size); pathEl(s, 'M4 7 C 9 3, 15 3, 20 7 M4 12 C 9 8, 15 8, 20 12 M4 17 C 9 13, 15 13, 20 17', { stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round' }); }
function iconBeat(parent, size, color) { const s = icon(parent, size); for (const [x, y, h] of [[4, 9, 8], [9, 4, 16], [14, 7, 10], [19, 10, 6]]) el('rect', { x: x - 1.4, y, width: 2.8, height: h, rx: 1.4, fill: color }, s); }
const MOSAIC = [C.blue, C.soft, C.gold, C.deep];

export default {
  duration: 20, fps: 30,
  init(root) {
    stage = root;
    G.bg = el('div', { style: abs({ inset: '0', background: C.paper, zIndex: '0' }) }, stage);
    glow = el('div', { style: abs({ left: '-200px', top: '120px', width: '1480px', height: '1300px', zIndex: '1', background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0))' }) }, stage);
    box = el('div', { style: abs({ left: '0', top: '0', overflow: 'hidden', zIndex: '10', willChange: 'transform' }) }, stage);

    // --- 0/9 button ---
    G.button = grp(520, 150, { s: ST.btn.s }); G.again = grp(520, 150, { s: ST.btn.s });
    for (const g of [G.button, G.again]) {
      g.label = wline(g, 'حرّك فكرتك', abs({ left: '0', width: '520px', top: '36px', textAlign: 'center', fontFamily: F.head, fontWeight: 600, fontSize: '56px', lineHeight: '1.25', color: C.white }));
      g.shine = el('div', { style: abs({ top: '-20px', width: '120px', height: '200px', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))', transform: 'skewX(-18deg)' }) }, g);
    }
    G.dots = [0, 1, 2].map(i => el('div', { style: abs({ left: 260 - 14 + (i - 1) * 46 + 'px', top: '62px', width: '26px', height: '26px', borderRadius: '50%', background: C.white, display: 'none' }) }, G.button));
    // --- 1 player ---
    G.player = grp(880, 470, { s: ST.ply.s });
    G.thumb = el('div', { style: abs({ right: '40px', top: '40px', width: '200px', height: '200px', borderRadius: '42px', overflow: 'hidden', background: C.ink }) }, G.player);
    G.cells = Array.from({ length: 25 }, (_, i) => el('div', { style: abs({ left: (i % 5) * 40 + 2 + 'px', top: Math.floor(i / 5) * 40 + 2 + 'px', width: '36px', height: '36px', borderRadius: '8px' }) }, G.thumb));
    G.pTitle = wline(G.player, 'إعلان المنتج · لقطة ٣', abs({ right: '268px', top: '44px', fontFamily: F.head, fontWeight: 700, fontSize: '40px', lineHeight: '1.25', color: C.white }));
    G.pSub = wline(G.player, 'موشن + صوت + إيقاع', abs({ right: '268px', top: '112px', fontFamily: F.label, fontWeight: 500, fontSize: '28px', color: '#9C9DA3' }));
    G.viz = Array.from({ length: 14 }, (_, i) => el('div', { style: abs({ left: 48 + i * 17 + 'px', width: '10px', borderRadius: '5px', background: C.white }) }, G.player));
    el('div', { style: abs({ left: '40px', right: '40px', top: '268px', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.22)' }) }, G.player);
    G.pFill = el('div', { style: abs({ right: '40px', top: '268px', height: '8px', borderRadius: '4px', background: C.white, width: '0px' }) }, G.player);
    G.pKnob = el('div', { style: abs({ top: '260px', width: '24px', height: '24px', borderRadius: '50%', background: C.white }) }, G.player);
    G.pNow = wline(G.player, '٠:٠٠', abs({ right: '40px', top: '292px', fontFamily: F.label, fontWeight: 500, fontSize: '24px', color: '#9C9DA3' }));
    G.pEnd = wline(G.player, '٠:٢٠', abs({ left: '40px', top: '292px', fontFamily: F.label, fontWeight: 500, fontSize: '24px', color: '#9C9DA3' }));
    G.pPrev = el('div', { style: abs({ left: '272px', top: '364px', width: '56px', height: '56px' }) }, G.player); iconSkip(G.pPrev, 56, '#C9CACE', -1);
    G.pNext = el('div', { style: abs({ left: '552px', top: '364px', width: '56px', height: '56px' }) }, G.player); iconSkip(G.pNext, 56, '#C9CACE', 1);
    G.pBtn = el('div', { style: abs({ left: '412px', top: '356px', width: '72px', height: '72px', borderRadius: '50%' }) }, G.player);
    G.pPause = el('div', { style: abs({ left: '8px', top: '8px', width: '56px', height: '56px' }) }, G.pBtn); iconPause(G.pPause, 56, C.white);
    G.pPlay = el('div', { style: abs({ left: '8px', top: '8px', width: '56px', height: '56px' }) }, G.pBtn); iconPlay(G.pPlay, 56, C.white);
    // --- 2 dial (a round control: the box becomes a circle) ---
    G.dial = grp(420, 420, { s: ST.dial.s });
    G.dSvg = svgEl(G.dial, 420, 420);
    G.dTicks = Array.from({ length: 28 }, (_, i) => { const a = A0 + (i / 27) * SWEEP, x1 = 210 + Math.sin(a) * 178, y1 = 210 - Math.cos(a) * 178, x2 = 210 + Math.sin(a) * 194, y2 = 210 - Math.cos(a) * 194; return pathEl(G.dSvg, `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`, { 'stroke-width': 5, 'stroke-linecap': 'round' }); });
    pathEl(G.dSvg, `M${(210 + Math.sin(A0) * 150).toFixed(1)} ${(210 - Math.cos(A0) * 150).toFixed(1)} A150 150 0 1 1 ${(210 + Math.sin(A0 + SWEEP) * 150).toFixed(1)} ${(210 - Math.cos(A0 + SWEEP) * 150).toFixed(1)}`, { stroke: 'rgba(255,255,255,0.16)', 'stroke-width': 18, 'stroke-linecap': 'round' });
    G.dArc = pathEl(G.dSvg, 'M0 0', { stroke: C.white, 'stroke-width': 18, 'stroke-linecap': 'round' });
    G.dKnob = circ(G.dSvg, 0, 0, 24, { fill: C.gold, stroke: C.ink, 'stroke-width': 6 });
    G.dVal = wline(G.dial, '٢٤', abs({ left: '0', width: '420px', top: '92px', textAlign: 'center', fontFamily: F.head, fontWeight: 800, fontSize: '150px', lineHeight: '1.15', color: C.white }));
    G.dUnit = wline(G.dial, 'إطار في الثانية', abs({ left: '0', width: '420px', top: '306px', textAlign: 'center', fontFamily: F.label, fontWeight: 500, fontSize: '28px', color: '#9C9DA3' }));
    // --- 3 segmented ---
    G.seg = grp(860, 150, { s: ST.seg.s });
    G.segSel = el('div', { style: abs({ top: '12px', width: '270px', height: '126px', borderRadius: '63px', background: C.ink }) }, G.seg);
    G.segL = [['ريلز', 715], ['مربّع', 430], ['عريض', 145]].map(([txt, cx]) => ({ cx, L: wline(G.seg, txt, abs({ left: cx - 135 + 'px', width: '270px', top: '44px', textAlign: 'center', fontFamily: F.head, fontWeight: 600, fontSize: '48px', lineHeight: '1.25', color: C.grey })) }));
    // --- 4 rising bars + counting number ---
    G.stats = grp(900, 780, { s: ST.sta.s });
    G.sLabel = wline(G.stats, 'وصول الإعلان', abs({ right: '56px', top: '46px', fontFamily: F.head, fontWeight: 600, fontSize: '36px', lineHeight: '1.25', color: C.dim }));
    G.example = wline(G.stats, 'مثال توضيحي', abs({ left: '56px', top: '52px', fontFamily: F.label, fontWeight: 500, fontSize: '24px', color: C.dim, padding: '4px 16px', border: `2px solid ${C.line}`, borderRadius: '24px' }));
    G.num = wline(G.stats, '٠٫٠ مليون', abs({ right: '56px', top: '118px', fontFamily: F.head, fontWeight: 800, fontSize: '140px', lineHeight: '1.2', color: C.ink }));
    G.barSvg = svgEl(G.stats, 788, 400, { left: '56px', top: '330px' });
    pathEl(G.barSvg, `M0 ${BAR_BASE + 8} L788 ${BAR_BASE + 8}`, { stroke: C.line, 'stroke-width': 3 });
    G.bars = BARS.map((v, i) => el('rect', { x: BAR_X(i), y: BAR_BASE, width: BAR_W, height: 0, rx: 12, fill: i === 11 ? C.blue : C.ink }, G.barSvg));
    G.tip = el('div', { style: abs({ left: '0', top: '0', padding: '4px 22px 10px', borderRadius: '20px', background: C.blue, display: 'none' }) }, G.stats);
    wline(G.tip, 'الذروة', { fontFamily: F.head, fontWeight: 700, fontSize: '30px', lineHeight: '1.2', color: C.white });
    // --- 5 curve editor ---
    G.curve = grp(900, 780, { s: ST.cur.s });
    G.cTitle = wline(G.curve, 'منحنى الحركة', abs({ right: '56px', top: '34px', fontFamily: F.head, fontWeight: 700, fontSize: '40px', lineHeight: '1.25', color: C.white }));
    G.cRead = wline(G.curve, '٠٫٢٥ ، ٠٫٢٥ ، ٠٫٧٥ ، ٠٫٧٥', abs({ left: '56px', top: '46px', fontFamily: F.label, fontWeight: 500, fontSize: '30px', color: '#9C9DA3' }));
    G.cSvg = svgEl(G.curve, 900, 780);
    const g0 = hl([0, 0]), g1 = hl([1, 1]);
    pathEl(G.cSvg, `M${g0[0]} ${g0[1]} L${g0[0]} ${g0[1] - GRAPH.h - 130}`, { stroke: '#2A2A2E', 'stroke-width': 3 });
    pathEl(G.cSvg, `M${g0[0]} ${g0[1]} L${g1[0]} ${g0[1]}`, { stroke: '#2A2A2E', 'stroke-width': 3 });
    pathEl(G.cSvg, `M${g0[0]} ${g1[1]} L${g1[0]} ${g1[1]}`, { stroke: '#2A2A2E', 'stroke-width': 2, 'stroke-dasharray': '8 10' });
    pathEl(G.cSvg, `M${g0[0]} ${g0[1]} L${g1[0]} ${g1[1]}`, { stroke: '#2A2A2E', 'stroke-width': 2, 'stroke-dasharray': '4 8' });
    G.cArm1 = pathEl(G.cSvg, 'M0 0', { stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 3 });
    G.cArm2 = pathEl(G.cSvg, 'M0 0', { stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 3 });
    G.cPath = pathEl(G.cSvg, 'M0 0', { stroke: C.soft, 'stroke-width': 8, 'stroke-linecap': 'round' });
    G.cH1 = circ(G.cSvg, 0, 0, 17, { fill: C.white, stroke: C.blue, 'stroke-width': 7 });
    G.cH2 = circ(G.cSvg, 0, 0, 17, { fill: C.white, stroke: C.blue, 'stroke-width': 7 });
    circ(G.cSvg, g0[0], g0[1], 9, { fill: C.white }); circ(G.cSvg, g1[0], g1[1], 9, { fill: C.white });
    G.cDot = circ(G.cSvg, 0, 0, 11, { fill: C.gold });
    pathEl(G.cSvg, `M${g0[0]} 700 L${g1[0]} 700`, { stroke: '#2A2A2E', 'stroke-width': 8, 'stroke-linecap': 'round' });
    G.cBall = circ(G.cSvg, 0, 700, 24, { fill: C.gold });
    // --- 6 aspect-ratio frames ---
    G.ratio = el('div', { style: abs({ inset: '0', display: 'none' }) }, box);
    G.rBg = el('div', { style: abs({ inset: '0' }) }, G.ratio);
    G.rSafe = el('div', { style: abs({ border: '3px dashed rgba(255,255,255,0.55)', borderRadius: '20px' }) }, G.ratio);
    G.rText = textBlock(G.ratio, 'نفس الإعلان لكل مقاس', { fontFamily: F.head, fontWeight: 800, color: C.white, lineHeight: '1.3', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }, { align: 'center' });
    G.rChip = wline(G.ratio, '٩:١٦', abs({ left: '0', right: '0', textAlign: 'center', fontFamily: F.head, fontWeight: 700, fontSize: '34px', color: C.white }));
    // --- 7 search ---
    G.search = grp(880, 410, { top: true, s: ST.src.s });
    G.sIc = el('div', { style: abs({ right: '40px', top: '40px', width: '48px', height: '48px' }) }, G.search); iconSearch(G.sIc, 48, C.ink);
    G.sHint = wline(G.search, 'ابحث في المكتبة…', abs({ right: '110px', top: '40px', fontFamily: F.label, fontWeight: 500, fontSize: '40px', lineHeight: '1.25', color: '#8E8C84' }));
    G.sType = el('div', { class: 'line', style: abs({ right: '110px', top: '36px', direction: 'rtl', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }) }, G.search);
    G.sTypeW = el('span', { class: 'word', text: '', style: { fontFamily: F.head, fontWeight: 600, fontSize: '46px', lineHeight: '1.3', color: C.ink } }, G.sType);
    G.sCaret = el('span', { style: { display: 'inline-block', width: '4px', height: '52px', background: C.blue, borderRadius: '2px' } }, G.sType);
    G.sType.dataset.text = '';
    el('div', { style: abs({ left: '0', right: '0', top: '134px', height: '2px', background: C.line }) }, G.search);
    G.rows = [['نابض بارتداد خفيف', iconSpring, 150], ['إيقاع على الدقّة', iconBeat, 246]].map(([txt, ic, top]) => {
      const row = el('div', { style: abs({ left: '16px', right: '16px', top: top + 12 + 'px', height: '80px', borderRadius: '24px' }) }, G.search);
      const icw = el('div', { style: abs({ right: '24px', top: '18px', width: '44px', height: '44px' }) }, row);
      const L = wline(row, txt, abs({ right: '90px', top: '16px', fontFamily: F.head, fontWeight: 600, fontSize: '40px', lineHeight: '1.25', color: C.ink }));
      return { row, icw, ic, L };
    });
    G.rows.forEach(r => r.ic(r.icw, 44, C.ink));
    // --- 8 kinetic ---
    G.kin = el('div', { style: abs({ left: '50%', top: '50%', width: '1180px', height: '2040px', marginLeft: '-590px', marginTop: '-1020px', display: 'none', overflow: 'hidden' }) }, box);
    G.kBg = el('div', { style: abs({ inset: '0', background: C.ink }) }, G.kin);
    G.kWords = ['حركة', 'إيقاع', 'صوت', 'فكرة.'].map((w, i) => el('div', { class: 'kw', text: w, style: abs({ left: '0', width: '1180px', top: '760px', textAlign: 'center', direction: 'rtl', whiteSpace: 'nowrap', fontFamily: i === 3 ? F.accent : F.head, fontWeight: i === 3 ? 700 : 800, fontSize: '330px', lineHeight: '1.2', color: i === 3 ? C.gold : C.white, display: 'none' }) }, G.kin));
    G.kBars = Array.from({ length: 21 }, (_, i) => el('div', { style: abs({ left: 120 + i * 47 + 'px', width: '24px', borderRadius: '12px', background: C.white, display: 'none' }) }, G.kin));
    G.kRing = el('div', { style: abs({ borderRadius: '50%', border: `10px solid ${C.white}`, display: 'none' }) }, G.kin);
    G.kStreaks = Array.from({ length: 9 }, (_, i) => el('div', { style: abs({ left: '0', height: '5px', width: '420px', background: C.white, top: 600 + i * 96 + 'px', display: 'none' }) }, G.kin));
    // --- spinner / check ---
    G.spin = grp(150, 150, { s: 1.1 }); G.check = grp(150, 150, { s: 1.1 });
    const sv = svgEl(G.spin, 150, 150); circ(sv, 75, 75, 36, { fill: 'none', stroke: 'rgba(255,255,255,0.22)', 'stroke-width': 8 });
    G.spinArc = pathEl(sv, 'M75 39 A36 36 0 0 1 111 75', { stroke: C.white, 'stroke-width': 8, 'stroke-linecap': 'round' });
    const cv = svgEl(G.check, 150, 150); G.checkP = pathEl(cv, 'M48 78 L68 98 L104 54', { stroke: C.white, 'stroke-width': 11, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

    // --- ghost chapter numeral behind the lower third (decor: no .word span, so the text gate ignores it) ---
    G.ghost = el('div', { text: '٠١', style: abs({ left: '0', width: W + 'px', top: '1330px', textAlign: 'center', direction: 'rtl', fontFamily: F.head, fontWeight: 800, fontSize: '520px', lineHeight: '1', color: 'rgba(11,11,12,0.055)', zIndex: '2', whiteSpace: 'nowrap' }) }, stage);
    // --- opening title ---
    G.intro = [['ريل الموشن', 400, 128, 800, C.ink], ['بيكسل بلس · ٢٠ ثانية بالكود', 568, 44, 500, C.dim]].map(([txt, top, size, wt, col]) => wline(stage, txt, abs({ left: '0', width: W + 'px', top: top + 'px', textAlign: 'center', fontFamily: F.head, fontWeight: wt, fontSize: size + 'px', lineHeight: '1.25', color: col, zIndex: '20' })));
    // --- reel timeline (chapters = the scenes) ---
    G.tl = el('div', { style: abs({ left: '65px', top: '1304px', width: '950px', height: '24px', zIndex: '20' }) }, stage);
    G.tlTrack = el('div', { style: abs({ left: '0', top: '10px', width: '950px', height: '4px', borderRadius: '2px' }) }, G.tl);
    G.tlFill = el('div', { style: abs({ left: '0', top: '10px', width: '0px', height: '4px', borderRadius: '2px' }) }, G.tl);
    G.tlTicks = Object.values(S).map(ts => el('div', { style: abs({ left: (ts / 20) * 950 - 5 + 'px', top: '7px', width: '10px', height: '10px', borderRadius: '50%' }) }, G.tl));
    G.tlHead = el('div', { style: abs({ top: '3px', width: '18px', height: '18px', borderRadius: '50%', background: C.blue }) }, G.tl);
    // --- captions + HUD (with the pixel brand mark from frame 0) ---
    const capTexts = [[0.35, E.click1 + 0.3, 'بضغطة واحدة…'], [MS(S.player) + 0.45, MS(S.dial), 'مشغّل بيتحرّك على الإيقاع'], [MS(S.dial) + 0.4, MS(S.seg), 'ضبط السرعة بلمسة دائرية'],
      [MS(S.stats) + 0.4, MS(S.curve), 'أرقام بتتعدّ وأعمدة بتطلع'], [MS(S.curve) + 0.45, MS(S.ratio), 'منحنى الحركة بإيدك'], [MS(S.ratio) + 0.2, MS(S.search), 'نفس الإعلان… لكل مقاس']];
    cap = capTexts.map(([a, b, txt]) => ({ a, b, L: wline(stage, txt, abs({ left: '0', width: W + 'px', top: '1172px', textAlign: 'center', fontFamily: F.head, fontWeight: 600, fontSize: '44px', lineHeight: '1.25', color: '#34353A', zIndex: '20', display: 'none' })) }));
    G.mk = el('div', { style: abs({ left: '65px', top: '286px', width: '48px', height: '40px', zIndex: '25' }) }, stage);
    G.mkA = el('div', { style: abs({ left: '0', top: '8px', width: '30px', height: '30px', borderRadius: '8px', background: C.blue }) }, G.mk);
    G.mkB = el('div', { style: abs({ left: '24px', top: '0', width: '16px', height: '16px', borderRadius: '5px', background: C.gold }) }, G.mk);
    hudL = wline(stage, 'بيكسل بلس — ريل الموشن', abs({ left: '125px', top: '290px', direction: 'rtl', fontFamily: F.label, fontWeight: 500, fontSize: '27px', zIndex: '25' }));
    hudR = wline(stage, '// ٠١ — ضغطة', abs({ right: '65px', top: '290px', fontFamily: F.label, fontWeight: 500, fontSize: '27px', zIndex: '25' }));
    // --- bursts (small pixel squares) ---
    const bl = [[E.click1, ...BTN, C.blue], [E.pause, ...PLAY, C.gold], [E.segA, ...segTip(430), C.blue], [E.segB, ...segTip(145), C.gold], [E.tip, ...LAST_BAR_TOP, C.blue], [E.pick, ...PICK, C.blue], [E.click2, ...BTN, C.gold], [E.check, 540, CY, C.white], [E.ctaClick, ...CTA_TIP, C.gold]];
    bursts = bl.map(([t, x, y, color], k) => ({ t, x, y, color, sq: Array.from({ length: 12 }, (_, i) => ({ ang: (i / 12) * Math.PI * 2 + k * 0.7 + noise1(i * 3.1 + k, 2) * 0.4, dist: 50 + 60 * Math.abs(noise1(i * 1.7 + k * 5, 3)), size: 10 + 10 * Math.abs(noise1(i * 2.3 + k, 5)), el: el('div', { style: abs({ zIndex: '35', display: 'none' }) }, stage) })) }));
    // --- cursor ---
    cursor = el('svg', { width: '70', height: '92', viewBox: '0 0 18 23', style: abs({ left: '0', top: '0', zIndex: '40', overflow: 'visible', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.28))' }) }, stage);
    el('path', { d: 'M1.2 1.2 L1.2 18 L5.5 13.9 L8.4 20.6 L11.5 19.2 L8.6 12.6 L14.7 12.4 Z', fill: C.ink, stroke: C.white, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, cursor);
    ripple = el('div', { style: abs({ zIndex: '39', borderRadius: '50%', border: `5px solid ${C.blue}`, opacity: '0' }) }, stage);

    // --- brand card ---
    G.brand = el('div', { style: abs({ left: '0', top: '0', width: W + 'px', height: H + 'px', zIndex: '30', display: 'none' }) }, stage);
    G.mark = el('div', { class: 'line', style: abs({ left: '0', width: W + 'px', top: '790px', textAlign: 'center', direction: 'ltr', whiteSpace: 'nowrap', zIndex: '12', lineHeight: '1' }) }, G.brand);
    G.mark.dataset.text = 'PIXEL Plus';
    const mw = el('span', { class: 'word', style: { display: 'inline-block' } }, G.mark);
    el('span', { text: 'PIXEL', style: { fontFamily: F.head, fontWeight: 800, fontSize: '170px', color: C.white, letterSpacing: '-0.02em' } }, mw);
    el('span', { text: 'Plus', style: { fontFamily: "'Instrument Serif'", fontStyle: 'italic', fontSize: '188px', color: C.gold, marginLeft: '0.2em' } }, mw);
    G.tag = el('div', { class: 'line', style: abs({ left: '0', width: W + 'px', top: '994px', textAlign: 'center', direction: 'rtl', whiteSpace: 'nowrap', lineHeight: '1.2' }) }, G.brand);
    G.tag.dataset.text = 'بنحرّك فكرتك.';
    G.tagW = [['بنحرّك', { fontFamily: F.head, fontWeight: 800, fontSize: '78px', color: C.white }], ['فكرتك.', { fontFamily: F.accent, fontWeight: 700, fontSize: '96px', color: C.gold, lineHeight: '1', marginInline: '16px' }]].map(([txt, st], i) => {
      const o = el('span', { class: 'word', text: txt, style: { display: 'inline-block', ...st } }, G.tag); if (!i) G.tag.appendChild(document.createTextNode(' ')); return o;
    });
    G.ctaRow = el('div', { style: abs({ left: '0', width: W + 'px', top: '1136px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', direction: 'rtl' }) }, G.brand);
    G.ctaPill = el('div', { style: { background: C.white, borderRadius: '60px', padding: '16px 76px 26px', transformOrigin: '50% 50%' } }, G.ctaRow);
    wline(G.ctaPill, 'ابدأ مشروعك', { position: 'relative', fontFamily: F.head, fontWeight: 700, fontSize: '54px', color: C.blue, lineHeight: '1.3' });
    G.ctaNote = wline(G.ctaRow, 'ابعتلنا رسالة', { position: 'relative', fontFamily: F.label, fontWeight: 500, fontSize: '40px', color: C.white });
    G.resolve = pixelCanvas(G.brand, 13, GW, 22, { top: '768px' });
    brandMascot = mascotLayer(stage, { w: W, h: H, cell: 4, z: 29 });
    tr = pixelCanvas(stage, 60);
  },

  render(t) {
    const sec = (a, b) => t >= a && t < b;
    const B = boxAt(t), [cxp, cyp] = cursorAt(t);
    // ---- background glow + beat pulse ----
    const pb = pulse(t, 5), pBar = Math.exp(-(((t % BAR) + BAR) % BAR) / BAR * 7);
    glow.style.opacity = (sec(MSK + 0.3, S.again) || t >= 16.4 ? 0 : 0.7 + 0.1 * pb).toFixed(3);
    glow.style.transform = `translate(${(Math.sin(t * 0.6) * 30).toFixed(1)}px, ${(Math.cos(t * 0.5) * 24).toFixed(1)}px)`;
    G.bg.style.background = t >= 16.7 ? C.blue : C.paper;

    // ---- box geometry, colour, shadow, tilt ----
    const bs = 1 + (0.006 * pb + 0.01 * pBar) * (B.w < 1000 ? 1 : 0);
    const rx = clamp(-(cyp - B.cy) / H * 7, -4, 4), ry = clamp((cxp - B.cx) / W * 9, -5, 5);
    const dark = (B.col[0] + B.col[1] + B.col[2]) / 3 < 128, el_ = B.sh;
    Object.assign(box.style, { left: (B.cx - B.w / 2).toFixed(2) + 'px', top: (B.cy - B.h / 2).toFixed(2) + 'px', width: B.w.toFixed(2) + 'px', height: B.h.toFixed(2) + 'px', borderRadius: B.r.toFixed(2) + 'px',
      background: `rgb(${B.col.map(Math.round).join(',')})`, display: t >= 16.67 ? 'none' : 'block',
      transform: `perspective(1800px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${bs.toFixed(4)})`,
      boxShadow: B.w > 1100 ? 'none' : dark ? `0 ${(24 * el_).toFixed(1)}px ${(60 * el_).toFixed(1)}px rgba(20,12,0,${(0.28 * el_).toFixed(3)})` : `0 ${(30 * el_).toFixed(1)}px ${(80 * el_).toFixed(1)}px rgba(70,50,10,${(0.16 * el_).toFixed(3)}), 0 2px 8px rgba(0,0,0,0.06)` });

    // ---- content groups ----
    // 0 button: label → loader dots after the click
    if (fade(G.button, t, [-0.2, MS(S.player)], { inD: 0.12, outD: 0.08 })) {
      G.button.shine.style.left = ((((t * 0.8) % 2.6) - 0.5) * 520 - 100).toFixed(1) + 'px';
      const press = 1 - 0.05 * Math.sin(Math.PI * ramp(t, E.click1 - 0.08, E.click1 + 0.12)); G.button.style.transform = `scale(${(press * G.button.base).toFixed(4)})`;
      const lo = 1 - ramp(t, E.click1 + 0.05, E.click1 + 0.2); G.button.label.line.style.opacity = lo.toFixed(3);
      G.dots.forEach((d, i) => { const on = t > E.click1 + 0.12; d.style.display = on ? 'block' : 'none'; d.style.transform = `translateY(${(-12 * Math.max(0, Math.sin((t - E.click1) * 14 - i * 0.9))).toFixed(1)}px)`; d.style.opacity = ramp(t, E.click1 + 0.12, E.click1 + 0.24).toFixed(3); });
    }
    // 1 player
    if (fade(G.player, t, [MS(S.player) + 0.22, MS(S.dial)])) {
      const playing = t < E.pause, bi = Math.floor(Math.min(t, E.pause) / BEAT);
      G.cells.forEach((c, i) => { const v = Math.abs(noise1(i * 2.1 + bi * 0.93, 3)); c.style.background = MOSAIC[Math.min(3, Math.floor(v * 4.6))]; c.style.transform = `scale(${(1 - 0.12 * (playing ? pulse(t, 6) * (i % 3 === 0) : 0)).toFixed(3)})`; });
      const energy = playing ? 1 : Math.max(0, 1 - ramp(t, E.pause, E.pause + 0.25)) * 0.9 + 0.08;
      G.viz.forEach((b, i) => { const h = 12 + 84 * (0.3 + 0.7 * Math.abs(noise1(i * 0.9 + t * 3.4, 7))) * (0.5 + 0.5 * pulse(t, 3.5)) * energy; b.style.height = h.toFixed(1) + 'px'; b.style.top = (230 - h).toFixed(1) + 'px'; });
      const prog = Math.min(t, E.pause) / 20; G.pFill.style.width = (prog * 800).toFixed(1) + 'px'; G.pKnob.style.left = (840 - prog * 800 - 12).toFixed(1) + 'px';
      setText(G.pNow, ARD('0:' + pad2(Math.floor(Math.min(t, E.pause)))));
      const pc = ein(ramp(t, E.pause - 0.05, E.pause + 0.2)); G.pPause.style.opacity = (1 - pc).toFixed(3); G.pPlay.style.opacity = pc.toFixed(3);
      G.pBtn.style.transform = `scale(${(1 - 0.12 * Math.sin(Math.PI * ramp(t, E.pause - 0.08, E.pause + 0.16))).toFixed(4)})`;
      G.pBtn.style.background = `rgba(255,255,255,${(0.16 * Math.sin(Math.PI * ramp(t, E.pause - 0.08, E.pause + 0.5))).toFixed(3)})`;
    }
    // 2 dial
    if (fade(G.dial, t, [MS(S.dial) + 0.22, MS(S.seg)])) {
      const p = knobP(t), a = dialAng(p), x = 210 + Math.sin(a) * 150, y = 210 - Math.cos(a) * 150, x0 = 210 + Math.sin(A0) * 150, y0 = 210 - Math.cos(A0) * 150;
      G.dArc.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)} A150 150 0 ${p * SWEEP > Math.PI ? 1 : 0} 1 ${x.toFixed(1)} ${y.toFixed(1)}`);
      G.dKnob.setAttribute('cx', x.toFixed(1)); G.dKnob.setAttribute('cy', y.toFixed(1));
      const drag = ramp(t, E.dragA - 0.05, E.dragA + 0.1) * (1 - ramp(t, E.dragB, E.dragB + 0.1)); G.dKnob.setAttribute('r', (24 + 6 * drag).toFixed(1));
      G.dTicks.forEach((tk, i) => { const on = i / 27 <= p; tk.setAttribute('stroke', on ? C.white : 'rgba(255,255,255,0.22)'); });
      setText(G.dVal, ARD(Math.round(24 + ((p - 0.3) / 0.7) * 36)));
      const land = sp(t, E.dragB, { dur: 0.4, bounce: 0.45, from: 0.9 }); G.dVal.line.style.transform = t >= E.dragB ? `scale(${land.toFixed(3)})` : 'none';
    }
    // 3 segmented
    if (fade(G.seg, t, [MS(S.seg) + 0.22, MS(S.stats)])) {
      const selX = springTrack([[0, 715], [E.segA, 430], [E.segB, 145]], t, { duration: 0.4, bounce: 0.24 });
      G.segSel.style.left = (selX - 135).toFixed(2) + 'px';
      for (const s of G.segL) s.L.line.style.color = rgbMix(hex(C.grey), WHITE, clamp(1 - Math.abs(selX - s.cx) / 200));
    }
    // 4 bars rise (staggered springs), the number counts, the peak is tagged, then a long hold
    if (fade(G.stats, t, [MS(S.stats) + 0.22, MS(S.curve)])) {
      const cp = ramp(t, E.countA, E.countB), v = 2.4 * ease.outCubic(cp);
      setText(G.num, formatNumber(v, { decimals: 1 }) + ' مليون'); G.num.line.style.filter = cp > 0 && cp < 0.9 ? `blur(${(2.4 * (1 - cp)).toFixed(2)}px)` : 'none';
      G.bars.forEach((b, i) => { const u = sp(t, E.countA + i * 0.045, { dur: 0.5, bounce: 0.3 }), h = Math.max(0, BARS[i] * BAR_MAX * u); b.setAttribute('height', h.toFixed(1)); b.setAttribute('y', (BAR_BASE - h).toFixed(1)); });
      const tp = sp(t, E.tip, { dur: 0.4, bounce: 0.35 });
      G.tip.style.display = t >= E.tip ? 'block' : 'none'; G.tip.style.left = (56 + BAR_X(11) + BAR_W / 2 - 62).toFixed(1) + 'px'; G.tip.style.top = (330 + BAR_BASE - BAR_MAX - 62 - 10 * (1 - tp)).toFixed(1) + 'px'; G.tip.style.transform = `scale(${(0.7 + 0.3 * tp).toFixed(3)})`;
    }
    // 5 curve editor
    if (fade(G.curve, t, [MS(S.curve) + 0.22, MS(S.ratio)])) {
      const p1 = P1(t), p2 = P2(t), a = hl([0, 0]), b = hl([1, 1]), c1 = hl(p1), c2 = hl(p2);
      G.cPath.setAttribute('d', `M${a[0]} ${a[1]} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${b[0]} ${b[1]}`);
      G.cArm1.setAttribute('d', `M${a[0]} ${a[1]} L${c1[0].toFixed(1)} ${c1[1].toFixed(1)}`); G.cArm2.setAttribute('d', `M${b[0]} ${b[1]} L${c2[0].toFixed(1)} ${c2[1].toFixed(1)}`);
      G.cH1.setAttribute('cx', c1[0].toFixed(1)); G.cH1.setAttribute('cy', c1[1].toFixed(1)); G.cH2.setAttribute('cx', c2[0].toFixed(1)); G.cH2.setAttribute('cy', c2[1].toFixed(1));
      const ff = cubicBezier(clamp(p1[0], 0, 1), p1[1], clamp(p2[0], 0, 1), p2[1]), rp = ramp(t, E.ballA, E.ballB), e = ff(rp);
      G.cBall.setAttribute('cx', (a[0] + GRAPH.w * e).toFixed(1)); G.cDot.setAttribute('cx', (a[0] + GRAPH.w * rp).toFixed(1)); G.cDot.setAttribute('cy', (a[1] - GRAPH.h * e).toFixed(1));
      G.cDot.style.opacity = rp > 0 ? '1' : '0'; G.cBall.style.opacity = rp > 0 ? '1' : '0.5';
      setText(G.cRead, [p1[0], p1[1], p2[0], p2[1]].map(v => ARD(v.toFixed(2)).replace('.', '٫')).join(' ، '));
      const hd = Math.max(ramp(t, E.handleA - 0.05, E.handleA + 0.05) * (1 - ramp(t, E.handleA + 0.3, E.handleA + 0.4)), ramp(t, E.handleB - 0.05, E.handleB + 0.05) * (1 - ramp(t, E.handleB + 0.26, E.handleB + 0.36)));
      G.cH1.setAttribute('r', (17 + 5 * (t < E.handleB ? hd : 0)).toFixed(1)); G.cH2.setAttribute('r', (17 + 5 * (t >= E.handleB ? hd : 0)).toFixed(1));
    }
    // 6 ratio frames (live-sized)
    if (t >= MS(S.ratio) + 0.15 && t < MS(S.search)) {
      G.ratio.style.display = 'block'; G.ratio.style.opacity = (ramp(t, MS(S.ratio) + 0.15, MS(S.ratio) + 0.32) * (1 - ramp(t, MS(S.search) - 0.1, MS(S.search)))).toFixed(3);
      const w = B.w, h = B.h, m = Math.min(w, h), fs = clamp(m * 0.115, 30, 78);
      G.rBg.style.background = `linear-gradient(${(120 + t * 70).toFixed(1)}deg, ${C.blue}, ${C.soft} 38%, ${C.blue} 62%, ${C.deep})`;
      const inset = Math.round(m * 0.07); Object.assign(G.rSafe.style, { left: inset + 'px', top: inset + 'px', right: inset + 'px', bottom: inset + 'px' });
      Object.assign(G.rText.box.style, { fontSize: fs.toFixed(1) + 'px', width: (w * 0.72).toFixed(1) + 'px' }); G.rText.box.style.left = '50%';
      const idx = t < E.ratio[1] - 0.15 ? 0 : t < E.ratio[2] - 0.15 ? 1 : t < E.ratio[3] - 0.15 ? 2 : 3;
      setText(G.rChip, ['٩:١٦', '١:١', '١٦:٩', '٤:٥'][idx]); G.rChip.line.style.top = (h - inset - 62) + 'px';
    } else G.ratio.style.display = 'none';
    // 7 search
    if (fade(G.search, t, [MS(S.search) + 0.22, MSK])) {
      const ty = typeOn('حركة مرنة', t, { start: E.typeStart, wordsPerSecond: 6 });
      G.sTypeW.textContent = ty.text; G.sType.dataset.text = ty.text; G.sHint.line.style.display = ty.count ? 'none' : 'block';
      G.sCaret.style.display = caretVisible(t, { start: E.typeStart - 0.1, end: E.typeStart + 0.4, rate: 1.4 }) && t < E.pick ? 'inline-block' : 'none';
      G.rows.forEach((r, i) => { const a = E.results + i * 0.08, u = ein(ramp(t, a, a + 0.28)); r.row.style.opacity = u.toFixed(3); r.row.style.transform = `translateY(${((1 - u) * 26).toFixed(1)}px)`; });
      const pk = ease.inOutCubic(ramp(t, E.pick, E.pick + 0.14)), r2 = G.rows[1];
      r2.row.style.background = rgbMix(WHITE, INK, pk); r2.L.line.style.color = rgbMix(INK, WHITE, pk); r2.icw.style.filter = pk > 0.5 ? 'invert(1)' : 'none';
      G.rows[0].row.style.opacity = (parseFloat(G.rows[0].row.style.opacity) * (1 - 0.6 * pk)).toFixed(3);
    }
    // 8 kinetic
    if (fade(G.kin, t, [MSK + 0.12, MS(S.again)], { inD: 0.06, outD: 0.12 })) this.kinetic(t);
    // 9 button again → spinner → check
    if (fade(G.again, t, [MS(S.again) + 0.22, E.spin], { inD: 0.12 })) { G.again.shine.style.left = ((((t * 0.8) % 2.6) - 0.5) * 520 - 100).toFixed(1) + 'px'; G.again.style.transform = `scale(${((1 - 0.05 * Math.sin(Math.PI * ramp(t, E.click2 - 0.08, E.click2 + 0.12))) * G.again.base).toFixed(4)})`; }
    if (fade(G.spin, t, [E.spin + 0.12, E.check], { inD: 0.08, outD: 0.06 })) G.spinArc.setAttribute('transform', `rotate(${((t - E.spin) * 760).toFixed(1)} 75 75)`);
    if (fade(G.check, t, [E.check, 16.67], { inD: 0.06, outD: 0.02 })) { lineDrawPath(G.checkP, ease.outCubic(ramp(t, E.check + 0.03, E.check + 0.28))); G.check.style.transform = `scale(${(sp(t, E.check, { dur: 0.4, bounce: 0.4, from: 0.7 }) * G.check.base).toFixed(3)})`; }

    // ---- ghost numeral ----
    { const starts = [0, MS(S.player), MS(S.dial), MS(S.seg), MS(S.stats), MS(S.curve), MS(S.ratio), MS(S.search), MSK, MS(S.again), S.brand];
      const gi = Math.max(0, starts.reduce((m, a, i) => (t >= a ? i : m), 0)), gu = ein(ramp(t, starts[gi], starts[gi] + 0.5));
      G.ghost.textContent = ARD(pad2(gi + 1)); G.ghost.style.transform = `translateY(${((1 - gu) * 120).toFixed(1)}px)`; G.ghost.style.opacity = (gu * (gi === 8 || (gi === 9 && t < MS(S.again) + 0.3) ? 0 : 1)).toFixed(3);
      G.ghost.style.color = t >= 16.7 ? 'rgba(255,255,255,0.09)' : 'rgba(11,11,12,0.055)'; }
    // ---- opening title (springs in from frame 0) + timeline ----
    const ni = t > 0.16 && t < 0.9 ? Math.floor(10 + 89 * Math.abs(noise1(t * 26, 9))) : 20;
    setText(G.intro[1], 'بيكسل بلس · ' + ARD(ni) + ' ثانية بالكود');
    G.intro.forEach((L, i) => { const a = i * 0.08, pop = sp(t, a, { dur: 0.5, bounce: 0.5, from: 0.9 }), out = ramp(t, MS(S.player) - 0.12, MS(S.player) + 0.08), o = (0.55 + 0.45 * ramp(t, a, a + 0.25)) * (1 - out);
      L.line.style.display = o > 0.001 ? 'block' : 'none'; L.word.style.opacity = o.toFixed(3); L.word.style.transform = `translateY(${(-out * 70).toFixed(1)}px) scale(${pop.toFixed(4)})`; L.word.style.filter = out > 0 ? `blur(${(out * 14).toFixed(1)}px)` : 'none'; });
    const onBlue = t >= 16.7, tlOn = !(t >= MSK && t < MS(S.again) + 0.2);
    G.tl.style.display = tlOn ? 'block' : 'none';
    G.tlTrack.style.background = onBlue ? 'rgba(255,255,255,0.28)' : 'rgba(11,11,12,0.12)'; G.tlFill.style.background = onBlue ? C.white : C.ink; G.tlFill.style.width = (t / 20 * 950).toFixed(1) + 'px';
    G.tlTicks.forEach((k, i) => { const ts = Object.values(S)[i]; k.style.background = t >= ts ? (onBlue ? C.white : C.ink) : (onBlue ? 'rgba(255,255,255,0.4)' : 'rgba(11,11,12,0.2)'); });
    G.tlHead.style.left = (t / 20 * 950 - 9).toFixed(1) + 'px'; G.tlHead.style.background = onBlue ? C.gold : C.blue;

    // ---- captions + HUD ----
    for (const c of cap) {
      const o = ramp(t, c.a, c.a + 0.25) * (1 - ramp(t, c.b - 0.12, c.b));
      c.L.line.style.display = o > 0.001 ? 'block' : 'none';
      if (o > 0.001) { c.L.word.style.opacity = o.toFixed(3); c.L.word.style.transform = `translateY(${((1 - ein(ramp(t, c.a, c.a + 0.3))) * 22).toFixed(1)}px)`; c.L.word.style.filter = o < 0.98 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none'; }
    }
    const names = [[0, '٠١', 'ضغطة'], [MS(S.player), '٠٢', 'مشغّل'], [MS(S.dial), '٠٣', 'تحكّم'], [MS(S.seg), '٠٤', 'اختيار'], [MS(S.stats), '٠٥', 'أرقام'], [MS(S.curve), '٠٦', 'منحنى'], [MS(S.ratio), '٠٧', 'مقاسات'], [MS(S.search), '٠٨', 'بحث'], [MSK, '٠٩', 'إيقاع'], [MS(S.again), '١٠', 'ضغطة'], [S.brand, '١١', 'بيكسل بلس']];
    const cur = names.filter(n => t >= n[0]).at(-1);
    setText(hudR, `// ${cur[1]} — ${cur[2]}`);
    const hudOn = !(t >= MSK + 0.1 && t < MS(S.again) + 0.25), hc = t >= 16.67 ? 'rgba(255,255,255,0.7)' : 'rgba(11,11,12,0.5)';
    for (const h_ of [hudL, hudR]) { h_.line.style.display = hudOn ? 'block' : 'none'; h_.line.style.color = hc; }
    G.mk.style.display = hudOn ? 'block' : 'none'; G.mkA.style.background = t >= 16.67 ? C.white : C.blue; G.mkA.style.transform = `scale(${(1 + 0.08 * pulse(t, 6)).toFixed(3)})`;

    // ---- bursts, cursor ----
    for (const b of bursts) {
      const u = (t - b.t) / 0.6, on = u > 0 && u < 1;
      for (const s of b.sq) { if (!on) { s.el.style.display = 'none'; continue; } const e = ease.outCubic(u), sz = s.size * (1 - u * 0.7);
        Object.assign(s.el.style, { display: 'block', left: (b.x + Math.cos(s.ang) * s.dist * e - sz / 2).toFixed(1) + 'px', top: (b.y + Math.sin(s.ang) * s.dist * e - sz / 2 + 30 * u * u).toFixed(1) + 'px', width: sz.toFixed(1) + 'px', height: sz.toFixed(1) + 'px', background: b.color, opacity: (1 - u * u).toFixed(3) }); }
    }
    const vis = cursorVisible(t);
    cursor.style.display = vis ? 'block' : 'none';
    const press = CLICKS.reduce((m, c) => Math.max(m, Math.sin(Math.PI * clamp((t - (c - 0.07)) / 0.2))), 0);
    cursor.style.transform = `translate(${cxp.toFixed(1)}px, ${cyp.toFixed(1)}px) scale(${(1 - 0.16 * press).toFixed(3)})`;
    let rr = 0, ro = 0; for (const c of CLICKS) { const u = (t - c) / 0.4; if (u > 0 && u < 1) { rr = 14 + 70 * ease.outCubic(u); ro = (1 - u) * 0.8; } }
    Object.assign(ripple.style, { left: (cxp + 4 - rr).toFixed(1) + 'px', top: (cyp + 4 - rr).toFixed(1) + 'px', width: (2 * rr).toFixed(1) + 'px', height: (2 * rr).toFixed(1) + 'px', opacity: vis ? ro.toFixed(3) : '0', borderColor: t > 17 ? C.white : C.blue });

    // ---- iris into the brand card + brand ----
    tr.c.style.display = 'none';
    if (sec(E.iris, S.brand + 0.02)) { const g = ease.inCubic(ramp(t, E.iris, S.brand)); tr.c.style.display = 'block'; pixelCircle(tr, { cx: 540, cy: CY, r: 40 + g * cover(540, CY) * 1.1, band: 0.35, color: BLUE }); }
    this.brand(t);
  },

  kinetic(t) {
    const idx = E.words.reduce((m, w, i) => (t >= w ? i : m), -1);
    G.kBg.style.background = idx < 0 ? C.ink : [C.ink, C.blue, C.paper, C.ink][idx];
    G.kWords.forEach((w, i) => {
      const a = E.words[i], on = i === idx; w.style.display = on ? 'block' : 'none'; if (!on) return;
      const u = t - a, e = ein(ramp(u, 0, i === 0 ? 0.17 : 0.3));
      w.style.color = i === 2 ? C.ink : i === 3 ? C.gold : C.white;
      const size = fitFontSize(w.textContent, { family: i === 3 ? 'Aref Ruqaa' : 'Alexandria', weight: i === 3 ? 700 : 800, maxWidth: i === 3 ? 820 : 900, max: i === 3 ? 760 : 340, min: 120 }); w.style.fontSize = size + 'px';
      if (i === 3) w.style.top = '640px';
      const op = ramp(u, 0, 0.04).toFixed(3);
      if (i === 0) { w.style.transform = `translateX(${((1 - e) * 900).toFixed(1)}px) scale(${lerp(1.12, 1, e).toFixed(3)})`; w.style.filter = e < 0.97 ? `blur(${((1 - e) * 26).toFixed(1)}px)` : 'none'; w.style.opacity = '1'; }
      if (i === 1) { w.style.transform = `perspective(900px) rotateX(${((1 - e) * -85).toFixed(1)}deg) translateY(${((1 - e) * 60).toFixed(1)}px)`; w.style.filter = 'none'; w.style.opacity = op; }
      if (i === 2) { w.style.transform = `scale(${lerp(2.4, 1, e).toFixed(3)})`; w.style.filter = e < 0.97 ? `blur(${((1 - e) * 22).toFixed(1)}px)` : 'none'; w.style.opacity = op; }
      if (i === 3) { w.style.transform = `translateY(${((1 - e) * 120).toFixed(1)}px) rotate(${(-5 * (1 - e)).toFixed(2)}deg) scale(${lerp(0.7, 1.0, ease.outCubic(ramp(u, 0, 0.45))).toFixed(3)})`; w.style.filter = e < 0.97 ? `blur(${((1 - e) * 14).toFixed(1)}px)` : 'none'; w.style.opacity = op; }
    });
    const wu = idx >= 0 ? t - E.words[idx] : 0;
    G.kBars.forEach((b, i) => { const on = idx === 1; b.style.display = on ? 'block' : 'none'; if (!on) return; const h = 40 + 280 * (0.2 + 0.8 * Math.abs(noise1(i * 0.8 + t * 6, 11))) * (0.4 + 0.6 * pulse(t, 3)); b.style.height = h.toFixed(1) + 'px'; b.style.top = (1590 - h / 2).toFixed(1) + 'px'; b.style.background = 'rgba(255,255,255,0.9)'; });
    const rOn = idx === 2; G.kRing.style.display = rOn ? 'block' : 'none';
    if (rOn) { const rr = 120 + 900 * ease.outCubic(ramp(wu, 0, 0.5)); Object.assign(G.kRing.style, { left: 590 - rr + 'px', top: 1020 - rr + 'px', width: 2 * rr + 'px', height: 2 * rr + 'px', opacity: (1 - ramp(wu, 0, 0.5)).toFixed(3), borderColor: C.blue }); }
    G.kStreaks.forEach((s, i) => { const on = idx === 0; s.style.display = on ? 'block' : 'none'; if (!on) return; const e = ease.outCubic(ramp(wu, 0, 0.3)); s.style.left = ((1 - e) * 1300 - 300 + (i % 3) * 150).toFixed(1) + 'px'; s.style.width = (300 + (i % 4) * 120).toFixed(0) + 'px'; s.style.opacity = (0.5 * (1 - e)).toFixed(3); });
  },

  brand(t) {
    const on = t >= S.brand - 0.02;
    G.brand.style.display = on ? 'block' : 'none';
    if (!on) { brandMascot.render(t, {}, { visible: false }); return; }
    const rp = ramp(t, S.brand + 0.06, S.brand + 0.55), P = G.resolve, d = P.img.data;
    for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { const i = (y * P.w + x) * 4; d[i] = BLUE[0]; d[i + 1] = BLUE[1]; d[i + 2] = BLUE[2]; d[i + 3] = bayer(x, y) >= rp ? 255 : 0; }
    P.g.putImageData(P.img, 0, 0); P.c.style.visibility = rp < 1 ? 'visible' : 'hidden';
    G.tagW.forEach((w, i) => { const a = E.tag + i * 0.12, p = ein(ramp(t, a, a + 0.5)); w.style.opacity = ramp(t, a, a + 0.28).toFixed(3); w.style.transform = i ? `translateY(${((1 - p) * 40).toFixed(1)}px) rotate(${(-4 * (1 - p)).toFixed(2)}deg)` : `translateY(${((1 - p) * 40).toFixed(1)}px)`; w.style.filter = p < 0.98 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none'; });
    const cp = sp(t, E.cta, { dur: 0.45, bounce: 0.4 }) * (1 - 0.06 * Math.sin(Math.PI * ramp(t, E.ctaClick - 0.06, E.ctaClick + 0.14))) * (1 + 0.025 * pulse(t, 6) * ramp(t, E.cta + 0.4, E.cta + 0.6));
    G.ctaPill.style.transform = `scale(${cp.toFixed(4)})`; G.ctaPill.style.opacity = ramp(t, E.cta, E.cta + 0.05).toFixed(3); G.ctaNote.line.style.opacity = ramp(t, E.cta + 0.25, E.cta + 0.5).toFixed(3);
    // the character stands ON the wordmark (soles on the letter tops), waves, then winks at the CTA
    const IDLE = [0.3, 0.2], gr = sp(t, E.hero, { dur: 0.6, bounce: 0.4, from: 0.02 });
    const wave = ramp(t, E.hero + 0.45, E.hero + 0.65), wv = 2.5 + 0.6 * Math.sin(t * 11);
    const hop = (a, b, hh) => hh * Math.sin(Math.PI * ramp(t, a, b));
    const rPx = 92 * gr, feet = 834, ox = 540;
    brandMascot.render(t, { x: ox / W, y: 1 - (feet - 3.04 * rPx) / H, size: rPx / H, yaw: 0.2 * Math.sin((t - E.hero) * 1.6) * (1 - ramp(t, E.cta + 0.2, E.cta + 0.6)), pitch: 0.04, roll: 0.05 * Math.sin((t - E.hero) * 2.1), smile: 0.9 + 0.1 * ramp(t, E.cta, E.cta + 0.2),
      open: t > E.tag && t < E.tag + 0.45 ? 0.45 : 0, wink: t > E.ctaClick + 0.1 && t < E.ctaClick + 0.55 ? 1 : 0, blink: t > 19.1 && t < 19.22 ? 1 : 0, look: [0.2, 0], bounce: hop(E.hero + 0.1, E.hero + 0.5, 0.4) + hop(E.ctaClick, E.ctaClick + 0.4, 0.3), shadow: 0,
      armL: IDLE, armR: [lerp(0.3, wv, wave), lerp(0.2, wv - 0.1, wave)] }, { visible: true });
  },
};
// stroke-dash draw for a single path (kept local so this film does not depend on lib/fx for one line)
function lineDrawPath(p, u) { if (p.__len === undefined) p.__len = p.getTotalLength(); p.style.strokeDasharray = `${p.__len} ${p.__len}`; p.style.strokeDashoffset = String(p.__len * (1 - u)); p.style.opacity = u > 0 ? '1' : '0'; }
