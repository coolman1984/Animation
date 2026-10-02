// Film 7 — PIXEL Plus «ريل الموشن» (20 s, 9:16, 144 BPM). A motion-design showreel in ONE continuous gesture:
// a single black box morphs through eleven interface states (button → player → slider → switch → segmented
// control → live numbers → curve editor → aspect-ratio frames → search → full-screen type → button → check → brand)
// while a cursor drives it. Grammar learned from an owner-supplied UI micro-interaction reel (one container that
// morphs, content that blurs out and in, long calm holds, quick springy morphs); everything here is original and
// Arabic. Pure in t: no clocks, no randomness outside seeded noise.
import { el, clamp, lerp, ramp, ease } from '../lib/motion.js';
import { springStep, springTrack, curves, cubicBezier, noise1, formatNumber, catmullRom } from '../lib/kinetics.js';
import { lineDraw } from '../lib/fx.js';
import { typeOn, caretVisible } from '../lib/uimotion.js';
import { fitFontSize, textBlock } from '../lib/typography.js';
import { mascotLayer } from '../film6/mascot.js';
import { S, E, MS, BEAT, BAR, at } from './timing.js';
import { W, H, C, F, ARD, abs, hex, rgbMix, wline, setText, pixelCanvas, pixelCircle, cover, GW, GH, bayer } from './kit.js';

const ein = curves.emphasized;
const sp = (t, start, { dur = 0.5, bounce = 0.3, from = 0, to = 1 } = {}) => (t <= start ? from : from + (to - from) * springStep(t - start, { duration: dur, bounce }).value);
const pulse = (t, k = 5) => Math.exp(-(((t % BEAT) + BEAT) % BEAT) / BEAT * k);
const INK = hex(C.ink), WHITE = hex(C.white), BLUE = hex(C.blue);
const NUM = n => ARD(n);

// ---------- the box: keys (target values from time t on); every property chases its key with its own spring ----------
const CY = 780, SRC_TOP = 700;
// Box size per state (content group size) and the scale applied to its content (the groups are authored at one size and scaled up).
const ST = { btn: { w: 520, h: 150, s: 1.25 }, ply: { w: 880, h: 470, s: 1.04 }, sld: { w: 760, h: 120, s: 1.18 }, tgl: { w: 260, h: 140, s: 1.3 },
  seg: { w: 860, h: 128, s: 1.06 }, sta: { w: 900, h: 780, s: 1.03 }, cur: { w: 900, h: 780, s: 1.03 }, src: { w: 880, h: 410, s: 1.04 } };
const bw = k => ST[k].w * ST[k].s, bh = k => ST[k].h * ST[k].s, br = (k, r) => r * ST[k].s;
// page position of local point (lx, ly) of group k, whose box is centred at (540, cy)
const pg = (k, lx, ly, cy = CY) => [540 + (lx - ST[k].w / 2) * ST[k].s, cy + (ly - ST[k].h / 2) * ST[k].s];
const pgSearch = (lx, ly) => [540 + (lx - 440) * ST.src.s, SRC_TOP + ly * ST.src.s];
const K0 = { cx: 540, cy: CY, w: bw('btn'), h: bh('btn'), r: 90, col: INK, sh: 0.5 };
const KEYS = [
  [0, {}],
  [MS(S.player), { w: bw('ply'), h: bh('ply'), r: br('ply', 56), sh: 1 }],
  [MS(S.slider), { w: bw('sld'), h: bh('sld'), r: 90, sh: 0.6 }],
  [E.toggleMorph, { w: bw('tgl'), h: bh('tgl'), r: 90 }],
  [E.toggle, { col: BLUE }],
  [MS(S.seg), { w: bw('seg'), h: bh('seg'), r: 90, col: WHITE, sh: 1 }],
  [MS(S.stats), { w: bw('sta'), h: bh('sta'), r: br('sta', 56) }],
  [MS(S.curve), { col: INK }],
  [MS(S.ratio), { w: 480, h: 853, r: 46 }],
  [E.ratio[1] - 0.15, { w: 700, h: 700 }],
  [E.ratio[2] - 0.15, { w: 920, h: 518 }],
  [E.ratio[3] - 0.15, { w: 640, h: 800 }],
  [MS(S.search), { w: bw('src'), h: bh('src') * 150 / 410, r: br('src', 44), col: WHITE, cy: SRC_TOP + bh('src') * 150 / 410 / 2 }],
  [E.results - 0.1, { h: bh('src'), cy: SRC_TOP + bh('src') / 2 }],
  [MS(S.kinetic), { cx: 540, cy: 960, w: 1180, h: 2040, r: 0, col: INK, sh: 0 }],
  [MS(S.again), { cx: 540, cy: CY, w: bw('btn'), h: bh('btn'), r: 90, sh: 0.5 }],
  [E.spin, { w: 170, h: 170, r: 90 }],
];
const TRACKS = (() => {
  const props = ['cx', 'cy', 'w', 'h', 'r', 'sh'], out = {}, cur = { ...K0 };
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
const SPR = { size: { duration: 0.5, bounce: 0.14 }, pos: { duration: 0.5, bounce: 0.08 }, rad: { duration: 0.42, bounce: 0.08 }, col: { duration: 0.32, bounce: 0 } };
function boxAt(t) {
  const T = TRACKS, g = (k, cfg) => springTrack(T[k], t, cfg);
  return { cx: g('cx', SPR.pos), cy: g('cy', SPR.pos), w: Math.max(8, g('w', SPR.size)), h: Math.max(8, g('h', SPR.size)), r: Math.max(0, g('r', SPR.rad)),
    sh: clamp(g('sh', SPR.col), 0, 1.2), col: [g('R', SPR.col), g('G', SPR.col), g('B', SPR.col)].map(v => clamp(v, 0, 255)) };
}

// ---------- cursor ----------
const sliderPos = p => pg('sld', 650 - p * 440, 60);
const knobP = t => 0.3 + 0.7 * ease.inOutCubic(ramp(t, E.dragA, E.dragB));
const GRAPH = { x0: 130, y0: 600, w: 640, h: 300 };               // curve-editor graph in card-local coords (y = 0 at the bottom-left)
const P1A = [0.25, 0.25], P1B = [0.22, 1.3], P2A = [0.75, 0.75], P2B = [0.36, 1.0];
const hl = (p) => [GRAPH.x0 + p[0] * GRAPH.w, GRAPH.y0 - p[1] * GRAPH.h];
const hp = (p) => { const l = hl(p); return pg('cur', l[0], l[1]); };
const P1 = t => { const u = ease.outCubic(ramp(t, E.handleA, E.handleA + 0.32)); return [lerp(P1A[0], P1B[0], u), lerp(P1A[1], P1B[1], u)]; };
const P2 = t => { const u = ease.outCubic(ramp(t, E.handleB, E.handleB + 0.28)); return [lerp(P2A[0], P2B[0], u), lerp(P2A[1], P2B[1], u)]; };
const CHART_PTS = (() => { const v = [0.15, 0.22, 0.18, 0.3, 0.28, 0.42, 0.38, 0.52, 0.47, 0.62, 0.58, 0.74, 0.7, 0.86, 0.82, 0.95]; return v.map((y, i) => [24 + i * (752 / 15), 300 - y * 262]); })();
const CHART_END = pg('sta', 56 + CHART_PTS.at(-1)[0], 380 + CHART_PTS.at(-1)[1]);
const OFF = (p, dx = 3, dy = 3) => [p[0] + dx, p[1] + dy];
const PICK = pgSearch(440, 294);
const WP = [
  [0.0, 1000, 1400], [1.0, ...OFF(pg('btn', 300, 80), 60, 20)], [1.4, ...OFF(pg('btn', 300, 80), 56, 18)], [1.95, 800, 1000],
  [2.62, ...OFF(pg('ply', 448, 392))], [3.12, ...OFF(pg('ply', 448, 392))], [3.34, 700, 1030], [3.46, ...OFF(sliderPos(0.3))],
  [E.dragB + 0.05, ...OFF(sliderPos(1))], [4.4, ...OFF(pg('tgl', 190, 70))], [E.toggle + 0.1, ...OFF(pg('tgl', 190, 70))], [4.88, ...OFF(pg('seg', 715, 70), -20, 8)],
  [E.segA - 0.12, ...OFF(pg('seg', 430, 70))], [E.segA + 0.1, ...OFF(pg('seg', 430, 70))], [E.segB - 0.1, ...OFF(pg('seg', 145, 70))], [E.segB + 0.12, ...OFF(pg('seg', 145, 70))], [6.5, 300, 960],
  [7.3, 500, 880], [E.tip - 0.05, ...OFF(CHART_END)], [8.25, ...OFF(CHART_END, -60, 90)], [E.handleA - 0.06, ...OFF(hp(P1A))],
  [E.handleB - 0.04, ...OFF(hp(P1B))], [E.handleB, ...OFF(hp(P2A))], [E.handleB + 0.3, ...OFF(hp(P2B))], [9.5, 800, 1150], [10.2, 940, 1150], [11.4, 940, 1150],
  [11.9, 780, 1030], [12.45, ...OFF(PICK, 90, 8)], [E.pick + 0.1, ...OFF(PICK, 90, 8)], [13.1, 900, 1150],
  [14.9, 900, 1400], [15.1, ...OFF(pg('btn', 300, 80), 80, 40)], [E.click2 - 0.08, ...OFF(pg('btn', 300, 80), 56, 18)], [15.7, ...OFF(pg('btn', 300, 80), 90, 90)],
  [18.0, 990, 1500], [E.ctaClick - 0.05, 650, 1182], [18.9, 650, 1182], [19.3, 860, 1320],
];
function cursorAt(t) {
  if (t >= E.dragA && t <= E.dragB) { const q = sliderPos(knobP(t)); return [q[0] + 3, q[1] + 3]; }
  if (t < WP[0][0]) return [WP[0][1], WP[0][2]];
  for (let i = 1; i < WP.length; i++) if (t <= WP[i][0]) {
    const a = WP[i - 1], b = WP[i], u = ease.inOutCubic(ramp(t, a[0], b[0])), dx = b[1] - a[1], dy = b[2] - a[2], dist = Math.hypot(dx, dy) || 1;
    const arc = Math.sin(Math.PI * u) * Math.min(90, dist * 0.12);
    return [lerp(a[1], b[1], u) - dy / dist * arc, lerp(a[2], b[2], u) + dx / dist * arc];
  }
  return [WP.at(-1)[1], WP.at(-1)[2]];
}
const CLICKS = [E.click1, E.pause, E.dragA, E.toggle, E.segA, E.segB, E.handleA, E.handleB, E.pick, E.click2, E.ctaClick];
const cursorVisible = t => t < 18.0 ? (t < 13.0 || (t > 14.9 && t < 16.3)) : t < 19.5;

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
const arPercent = (s) => s;

function iconPause(parent, size, color) { const s = svgEl(parent, 24, 24, { width: size + 'px', height: size + 'px' }); el('rect', { x: 6, y: 4, width: 4.2, height: 16, rx: 1.4, fill: color }, s); el('rect', { x: 13.8, y: 4, width: 4.2, height: 16, rx: 1.4, fill: color }, s); return s; }
function iconPlay(parent, size, color) { const s = svgEl(parent, 24, 24, { width: size + 'px', height: size + 'px' }); el('path', { d: 'M8 4.5 L19 12 L8 19.5 Z', fill: color, stroke: color, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, s); return s; }
function iconSkip(parent, size, color, dir) { const s = svgEl(parent, 24, 24, { width: size + 'px', height: size + 'px', transform: dir < 0 ? 'scaleX(-1)' : 'none' }); el('path', { d: 'M5 5 L15 12 L5 19 Z', fill: color }, s); el('rect', { x: 16.5, y: 5, width: 3, height: 14, rx: 1, fill: color }, s); return s; }
function iconSearch(parent, size, color) { const s = svgEl(parent, 24, 24, { width: size + 'px', height: size + 'px' }); circ(s, 10.5, 10.5, 6.3, { fill: 'none', stroke: color, 'stroke-width': 2.2 }); pathEl(s, 'M15.4 15.4 L20 20', { stroke: color, 'stroke-width': 2.4, 'stroke-linecap': 'round' }); return s; }
function iconCode(parent, size, color) { const s = svgEl(parent, 24, 24, { width: size + 'px', height: size + 'px' }); pathEl(s, 'M9 6 L3.5 12 L9 18', { stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); pathEl(s, 'M15 6 L20.5 12 L15 18', { stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); return s; }
function iconFrames(parent, size, color) { const s = svgEl(parent, 24, 24, { width: size + 'px', height: size + 'px' }); el('rect', { x: 3.5, y: 6, width: 17, height: 12, rx: 2.4, fill: 'none', stroke: color, 'stroke-width': 2 }, s); for (const y of [8, 12, 16]) { el('rect', { x: 5.2, y: y - 0.9, width: 1.8, height: 1.8, fill: color }, s); el('rect', { x: 17, y: y - 0.9, width: 1.8, height: 1.8, fill: color }, s); } return s; }

export default {
  duration: 20, fps: 30,
  init(root) {
    stage = root;
    el('div', { style: abs({ inset: '0', background: C.paper, zIndex: '0' }) }, stage);
    G.bg = stage.firstChild;
    glow = el('div', { style: abs({ left: '-200px', top: '120px', width: '1480px', height: '1300px', zIndex: '1', background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0))' }) }, stage);
    box = el('div', { style: abs({ left: '0', top: '0', overflow: 'hidden', zIndex: '10', willChange: 'transform' }) }, stage);

    // --- 0/9 button ---
    G.button = grp(520, 150, { s: ST.btn.s }); G.again = grp(520, 150, { s: ST.btn.s });
    for (const g of [G.button, G.again]) {
      g.label = wline(g, 'ولّد إعلان', abs({ left: '0', width: '520px', top: '36px', textAlign: 'center', fontFamily: F.head, fontWeight: 600, fontSize: '56px', lineHeight: '1.25', color: C.white }));
      g.shine = el('div', { style: abs({ top: '-20px', width: '120px', height: '200px', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))', transform: 'skewX(-18deg)' }) }, g);
    }
    // --- 1 player ---
    G.player = grp(880, 470, { s: ST.ply.s });
    G.thumb = el('div', { style: abs({ right: '40px', top: '40px', width: '200px', height: '200px', borderRadius: '42px', overflow: 'hidden' }) }, G.player);
    G.thumbShine = el('div', { style: abs({ left: '-30%', top: '-30%', width: '90%', height: '90%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.55), rgba(255,255,255,0))' }) }, G.thumb);
    G.pTitle = wline(G.player, 'ريل الموشن ٠٢', abs({ right: '268px', top: '44px', fontFamily: F.head, fontWeight: 700, fontSize: '42px', lineHeight: '1.25', color: C.white }));
    G.pSub = wline(G.player, 'اتعمل بالكود', abs({ right: '268px', top: '112px', fontFamily: F.label, fontWeight: 500, fontSize: '28px', color: '#9C9DA3' }));
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
    // --- 2 slider + switch ---
    G.slider = grp(760, 120, { s: ST.sld.s });
    G.sIcon = el('div', { style: abs({ right: '40px', top: '38px', width: '44px', height: '44px' }) }, G.slider); iconFrames(G.sIcon, 44, C.white);
    el('div', { style: abs({ left: '210px', top: '56px', width: '440px', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.22)' }) }, G.slider);
    G.sFill = el('div', { style: abs({ right: '110px', top: '56px', height: '8px', borderRadius: '4px', background: C.white, width: '0px' }) }, G.slider);
    G.sKnob = el('div', { style: abs({ top: '38px', width: '44px', height: '44px', borderRadius: '50%', background: C.white }) }, G.slider);
    G.sVal = wline(G.slider, '٢٤ إطار', abs({ left: '34px', top: '34px', fontFamily: F.head, fontWeight: 700, fontSize: '34px', color: C.white }));
    G.toggle = grp(260, 140, { s: ST.tgl.s });
    G.tKnob = el('div', { style: abs({ top: '20px', width: '100px', height: '100px', borderRadius: '50%', background: C.white }) }, G.toggle);
    // --- 3 segmented ---
    G.seg = grp(860, 128, { s: ST.seg.s });
    G.segSel = el('div', { style: abs({ top: '12px', width: '270px', height: '104px', borderRadius: '52px', background: C.ink }) }, G.seg);
    G.segL = [['إعلان', 715], ['موشن', 430], ['فيديو', 145]].map(([txt, cx]) => ({ cx, L: wline(G.seg, txt, abs({ left: cx - 135 + 'px', width: '270px', top: '34px', textAlign: 'center', fontFamily: F.head, fontWeight: 600, fontSize: '42px', lineHeight: '1.25', color: C.grey })) }));
    // --- 4 stats ---
    G.stats = grp(900, 780, { s: ST.sta.s });
    G.tabSel = el('div', { style: abs({ top: '36px', width: '150px', height: '58px', borderRadius: '29px', background: C.ink }) }, G.stats);
    G.tabs = [['يوم', 620], ['أسبوع', 450], ['شهر', 280]].map(([txt, cx]) => ({ cx, L: wline(G.stats, txt, abs({ left: cx - 75 + 'px', width: '150px', top: '44px', textAlign: 'center', fontFamily: F.label, fontWeight: 500, fontSize: '28px', lineHeight: '1.25', color: C.grey })) }));
    G.num = wline(G.stats, '٠', abs({ right: '56px', top: '122px', fontFamily: F.head, fontWeight: 800, fontSize: '150px', lineHeight: '1.2', color: C.ink }));
    G.numLabel = wline(G.stats, 'مشاهدة في الشهر', abs({ right: '60px', top: '312px', fontFamily: F.label, fontWeight: 500, fontSize: '30px', color: C.dim }));
    G.example = wline(G.stats, 'مثال توضيحي', abs({ left: '56px', top: '316px', fontFamily: F.label, fontWeight: 500, fontSize: '22px', color: C.dim, padding: '4px 16px', border: `2px solid ${C.line}`, borderRadius: '24px' }));
    G.chart = svgEl(G.stats, 788, 340, { left: '56px', top: '380px' });
    for (const y of [60, 140, 220, 300]) pathEl(G.chart, `M0 ${y} L788 ${y}`, { stroke: C.line, 'stroke-width': 2 });
    const segs = catmullRom(CHART_PTS, { tension: 0.5 });
    G.chartD = `M ${segs[0][0].map(v => v.toFixed(2)).join(' ')} ` + segs.map(s => `C ${s[1].map(v => v.toFixed(2)).join(' ')} ${s[2].map(v => v.toFixed(2)).join(' ')} ${s[3].map(v => v.toFixed(2)).join(' ')}`).join(' ');
    G.area = pathEl(G.chart, G.chartD + ' L 776 310 L 24 310 Z', { fill: 'rgba(35,72,255,0.10)', stroke: 'none' });
    G.line = pathEl(G.chart, G.chartD, { stroke: C.ink, 'stroke-width': 5.5, 'stroke-linecap': 'round' });
    G.dot = circ(G.chart, 0, 0, 11, { fill: C.blue, stroke: '#fff', 'stroke-width': 4 });
    G.tip = el('div', { style: abs({ left: '0', top: '0', padding: '6px 20px 10px', borderRadius: '20px', background: C.ink }) }, G.stats);
    G.tipT = wline(G.tip, formatNumber(80250), { fontFamily: F.head, fontWeight: 700, fontSize: '30px', lineHeight: '1.2', color: C.white });
    // --- 5 curve editor ---
    G.curve = grp(900, 780, { s: ST.cur.s });
    G.cTitle = wline(G.curve, 'منحنى الحركة', abs({ right: '56px', top: '34px', fontFamily: F.head, fontWeight: 700, fontSize: '40px', lineHeight: '1.25', color: C.white }));
    G.cRead = wline(G.curve, '٠٫٢٥ ، ٠٫٢٥ ، ٠٫٧٥ ، ٠٫٧٥', abs({ left: '56px', top: '50px', fontFamily: F.label, fontWeight: 500, fontSize: '26px', color: '#9C9DA3' }));
    G.cSvg = svgEl(G.curve, 900, 780);
    const g0 = hl([0, 0]), g1 = hl([1, 1]);
    pathEl(G.cSvg, `M${g0[0]} ${g0[1]} L${g0[0]} ${g0[1] - GRAPH.h - 130}`, { stroke: '#2A2A2E', 'stroke-width': 3 });
    pathEl(G.cSvg, `M${g0[0]} ${g0[1]} L${g1[0]} ${g0[1]}`, { stroke: '#2A2A2E', 'stroke-width': 3 });
    pathEl(G.cSvg, `M${g0[0]} ${g1[1]} L${g1[0]} ${g1[1]}`, { stroke: '#2A2A2E', 'stroke-width': 2, 'stroke-dasharray': '8 10' });
    pathEl(G.cSvg, `M${g0[0]} ${g0[1]} L${g1[0]} ${g1[1]}`, { stroke: '#2A2A2E', 'stroke-width': 2, 'stroke-dasharray': '4 8' });
    G.cArm1 = pathEl(G.cSvg, 'M0 0', { stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 3 });
    G.cArm2 = pathEl(G.cSvg, 'M0 0', { stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 3 });
    G.cPath = pathEl(G.cSvg, 'M0 0', { stroke: '#6F8BFF', 'stroke-width': 8, 'stroke-linecap': 'round' });
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
    G.sHint = wline(G.search, 'ابحث عن حركة…', abs({ right: '110px', top: '40px', fontFamily: F.label, fontWeight: 500, fontSize: '40px', lineHeight: '1.25', color: '#B7B5AD' }));
    G.sType = el('div', { class: 'line', style: abs({ right: '110px', top: '36px', direction: 'rtl', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }) }, G.search);
    G.sTypeW = el('span', { class: 'word', text: '', style: { fontFamily: F.head, fontWeight: 600, fontSize: '46px', lineHeight: '1.3', color: C.ink } }, G.sType);
    G.sCaret = el('span', { style: { display: 'inline-block', width: '4px', height: '52px', background: C.blue, borderRadius: '2px' } }, G.sType);
    G.sTypeW.parentNode.dataset.text = '';
    el('div', { style: abs({ left: '0', right: '0', top: '134px', height: '2px', background: C.line }) }, G.search);
    G.rows = [['٦٠ إطار في الثانية', iconFrames, 150], ['كل إطار هو كود', iconCode, 246]].map(([txt, ic, top]) => {
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

    // --- ghost chapter numeral behind the lower third ---
    G.ghost = el('div', { text: '٠١', style: abs({ left: '0', width: W + 'px', top: '1330px', textAlign: 'center', direction: 'rtl', fontFamily: F.head, fontWeight: 800, fontSize: '520px', lineHeight: '1', color: 'rgba(11,11,12,0.055)', zIndex: '2', whiteSpace: 'nowrap' }) }, stage);
    // --- opening title (frames 0–1.5) ---
    G.intro = [['ريل الموشن', 400, 128, 800, C.ink], ['٢٠ ثانية · كل إطار فيها كود', 568, 44, 500, C.dim]].map(([txt, top, size, wt, col]) => wline(stage, txt, abs({ left: '0', width: W + 'px', top: top + 'px', textAlign: 'center', fontFamily: F.head, fontWeight: wt, fontSize: size + 'px', lineHeight: '1.25', color: col, zIndex: '20' })));
    // --- reel timeline (chapters = the scenes) ---
    G.tl = el('div', { style: abs({ left: '65px', top: '1304px', width: '950px', height: '24px', zIndex: '20' }) }, stage);
    G.tlTrack = el('div', { style: abs({ left: '0', top: '10px', width: '950px', height: '4px', borderRadius: '2px' }) }, G.tl);
    G.tlFill = el('div', { style: abs({ left: '0', top: '10px', width: '0px', height: '4px', borderRadius: '2px' }) }, G.tl);
    G.tlTicks = Object.values(S).map(ts => el('div', { style: abs({ left: (ts / 20) * 950 - 5 + 'px', top: '7px', width: '10px', height: '10px', borderRadius: '50%' }) }, G.tl));
    G.tlHead = el('div', { style: abs({ top: '3px', width: '18px', height: '18px', borderRadius: '50%', background: C.blue }) }, G.tl);
    // --- captions + HUD ---
    const capTexts = [[0.35, S.player - 0.2, 'بضغطة واحدة…'], [MS(S.player) + 0.45, MS(S.slider), 'مشغّل بيتحرّك على الإيقاع'], [MS(S.slider) + 0.45, MS(S.seg), 'تحكّم بلمسة… وحركة بنابض'],
      [MS(S.seg) + 0.45, MS(S.stats), 'اختيار بينزلق بمرونة'], [MS(S.stats) + 0.45, MS(S.curve), 'أرقام بتتعدّ وخط بيترسم'], [MS(S.curve) + 0.45, MS(S.ratio), 'منحنى الحركة بإيدك'],
      [MS(S.ratio) + 0.2, MS(S.search), 'نفس الإعلان… لكل مقاس']];
    cap = capTexts.map(([a, b, txt]) => ({ a, b, L: wline(stage, txt, abs({ left: '0', width: W + 'px', top: '1192px', textAlign: 'center', fontFamily: F.head, fontWeight: 500, fontSize: '36px', lineHeight: '1.25', color: C.dim, zIndex: '20', display: 'none' })) }));
    hudL = wline(stage, 'بيكسل بلس — ريل الموشن', abs({ left: '65px', top: '290px', direction: 'rtl', fontFamily: F.label, fontWeight: 500, fontSize: '27px', zIndex: '25' }));
    hudR = wline(stage, '// ٠١ — ضغطة', abs({ right: '65px', top: '290px', fontFamily: F.label, fontWeight: 500, fontSize: '27px', zIndex: '25' }));
    // --- bursts (pixel squares) ---
    const bl = [[E.click1, ...OFF(pg('btn', 300, 80), 60, 20), C.blue], [E.pause, ...pg('ply', 448, 392), C.gold], [E.toggle, ...pg('tgl', 70, 70), C.cyan], [E.segA, ...pg('seg', 430, 70), C.blue], [E.segB, ...pg('seg', 145, 70), C.coral], [E.tip, ...CHART_END, C.blue], [E.pick, ...OFF(PICK, 90, 8), C.blue], [E.click2, ...OFF(pg('btn', 300, 80), 56, 18), C.gold], [E.check, 540, CY, C.white], [E.ctaClick, 650, 1182, C.gold]];
    bursts = bl.map(([t, x, y, color], k) => ({ t, x, y, color, sq: Array.from({ length: 14 }, (_, i) => ({ ang: (i / 14) * Math.PI * 2 + k * 0.7 + noise1(i * 3.1 + k, 2) * 0.4, dist: 90 + 110 * Math.abs(noise1(i * 1.7 + k * 5, 3)), size: 12 + 14 * Math.abs(noise1(i * 2.3 + k, 5)), el: el('div', { style: abs({ zIndex: '35', display: 'none' }) }, stage) })) }));
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
    G.ctaRow = el('div', { style: abs({ left: '0', width: W + 'px', top: '1136px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '26px', direction: 'rtl' }) }, G.brand);
    G.ctaPill = el('div', { style: { background: C.white, borderRadius: '44px', padding: '12px 46px 18px', transformOrigin: '50% 50%' } }, G.ctaRow);
    wline(G.ctaPill, 'ابدأ مشروعك', { position: 'relative', fontFamily: F.head, fontWeight: 700, fontSize: '44px', color: C.blue, lineHeight: '1.3' });
    G.ctaNote = wline(G.ctaRow, 'ابعتلنا رسالة', { position: 'relative', fontFamily: F.label, fontWeight: 500, fontSize: '36px', color: 'rgba(255,255,255,0.85)' });
    G.resolve = pixelCanvas(G.brand, 13, GW, 22, { top: '768px' });
    brandMascot = mascotLayer(stage, { w: W, h: H, cell: 4, z: 29 });
    tr = pixelCanvas(stage, 60);
  },

  render(t) {
    const sec = (a, b) => t >= a && t < b;
    const B = boxAt(t), [cxp, cyp] = cursorAt(t);
    // ---- background glow + beat pulse ----
    const pb = pulse(t, 5), pBar = Math.exp(-(((t % BAR) + BAR) % BAR) / BAR * 7);
    glow.style.opacity = (sec(MS(S.kinetic) + 0.3, S.again) || t >= 16.4 ? 0 : 0.7 + 0.1 * pb).toFixed(3);
    glow.style.transform = `translate(${(Math.sin(t * 0.6) * 30).toFixed(1)}px, ${(Math.cos(t * 0.5) * 24).toFixed(1)}px)`;
    G.bg.style.background = t >= 16.7 ? C.blue : C.paper;

    // ---- box geometry, colour, shadow, tilt ----
    const bs = 1 + (0.006 * pb + 0.01 * pBar) * (B.w < 1000 ? 1 : 0);
    const rx = clamp(-(cyp - B.cy) / H * 7, -4, 4), ry = clamp((cxp - B.cx) / W * 9, -5, 5);
    const dark = (B.col[0] + B.col[1] + B.col[2]) / 3 < 128;
    const el_ = B.sh;
    Object.assign(box.style, { left: (B.cx - B.w / 2).toFixed(2) + 'px', top: (B.cy - B.h / 2).toFixed(2) + 'px', width: B.w.toFixed(2) + 'px', height: B.h.toFixed(2) + 'px', borderRadius: B.r.toFixed(2) + 'px',
      background: `rgb(${B.col.map(Math.round).join(',')})`, display: t >= 16.67 ? 'none' : 'block',
      transform: `perspective(1800px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${bs.toFixed(4)})`,
      boxShadow: B.w > 1100 ? 'none' : dark ? `0 ${(24 * el_).toFixed(1)}px ${(60 * el_).toFixed(1)}px rgba(20,12,0,${(0.28 * el_).toFixed(3)})` : `0 ${(30 * el_).toFixed(1)}px ${(80 * el_).toFixed(1)}px rgba(70,50,10,${(0.16 * el_).toFixed(3)}), 0 2px 8px rgba(0,0,0,0.06)` });

    // ---- content groups ----
    // 0 button
    if (fade(G.button, t, [-0.2, MS(S.player)], { inD: 0.15 })) { G.button.shine.style.left = ((((t * 0.8) % 2.6) - 0.5) * 520 - 100).toFixed(1) + 'px'; const press = 1 - 0.05 * Math.sin(Math.PI * ramp(t, E.click1 - 0.08, E.click1 + 0.12)); G.button.style.transform = `scale(${(press * G.button.base).toFixed(4)})`; }
    // 1 player
    if (fade(G.player, t, [MS(S.player) + 0.3, MS(S.slider)])) {
      const playing = t < E.pause;
      G.thumb.style.background = `linear-gradient(${(135 + t * 50).toFixed(1)}deg, ${C.blue}, ${C.violet} 52%, ${C.coral})`;
      G.thumbShine.style.transform = `translate(${(Math.sin(t * 1.3) * 26).toFixed(1)}px, ${(Math.cos(t * 1.1) * 20).toFixed(1)}px)`;
      const energy = playing ? 1 : Math.max(0, 1 - ramp(t, E.pause, E.pause + 0.25)) * 0.9 + 0.08;
      G.viz.forEach((b, i) => { const h = 12 + 84 * (0.3 + 0.7 * Math.abs(noise1(i * 0.9 + t * 3.4, 7))) * (0.5 + 0.5 * pulse(t, 3.5)) * energy; b.style.height = h.toFixed(1) + 'px'; b.style.top = (230 - h).toFixed(1) + 'px'; });
      const prog = Math.min(t, E.pause) / 20; G.pFill.style.width = (prog * 800).toFixed(1) + 'px'; G.pKnob.style.left = (840 - prog * 800 - 12).toFixed(1) + 'px';
      setText(G.pNow, ARD('0:' + pad2(Math.floor(Math.min(t, E.pause))))); 
      const pc = ein(ramp(t, E.pause - 0.05, E.pause + 0.2)); G.pPause.style.opacity = (1 - pc).toFixed(3); G.pPlay.style.opacity = pc.toFixed(3);
      G.pBtn.style.transform = `scale(${(1 - 0.12 * Math.sin(Math.PI * ramp(t, E.pause - 0.08, E.pause + 0.16))).toFixed(4)})`;
      G.pBtn.style.background = `rgba(255,255,255,${(0.16 * Math.sin(Math.PI * ramp(t, E.pause - 0.08, E.pause + 0.5))).toFixed(3)})`;
    }
    // 2 slider → switch
    if (fade(G.slider, t, [MS(S.slider) + 0.3, E.toggleMorph])) {
      const p = knobP(t), kx = 650 - p * 440; // group x of the knob centre
      G.sKnob.style.left = (kx - 22).toFixed(1) + 'px'; G.sFill.style.width = (p * 440).toFixed(1) + 'px';
      const drag = ramp(t, E.dragA - 0.05, E.dragA + 0.1) * (1 - ramp(t, E.dragB, E.dragB + 0.1)); G.sKnob.style.transform = `scale(${(1 + 0.22 * drag).toFixed(3)})`;
      setText(G.sVal, ARD(Math.round(24 + ((p - 0.3) / 0.7) * 36)) + ' إطار');
      G.sIcon.style.transform = `scale(${(1 + 0.12 * pulse(t, 4)).toFixed(3)})`;
    }
    if (fade(G.toggle, t, [E.toggleMorph + 0.15, MS(S.seg)], { inD: 0.12 })) { const u = sp(t, E.toggle, { dur: 0.42, bounce: 0.3 }); G.tKnob.style.left = lerp(140, 20, u).toFixed(2) + 'px'; G.tKnob.style.transform = `scaleX(${(1 + 0.18 * Math.sin(Math.PI * ramp(t, E.toggle - 0.05, E.toggle + 0.3))).toFixed(3)})`; }
    // 3 segmented
    if (fade(G.seg, t, [MS(S.seg) + 0.3, MS(S.stats)])) {
      const selX = springTrack([[0, 715], [E.segA, 430], [E.segB, 145]], t, { duration: 0.46, bounce: 0.24 });
      G.segSel.style.left = (selX - 135).toFixed(2) + 'px';
      for (const s of G.segL) { const near = clamp(1 - Math.abs(selX - s.cx) / 200); s.L.line.style.color = rgbMix(hex(C.grey), WHITE, near); }
    }
    // 4 stats
    if (fade(G.stats, t, [MS(S.stats) + 0.3, MS(S.curve)])) {
      const sx = springTrack([[0, 450], [E.countA - 0.12, 280]], t, { duration: 0.4, bounce: 0.22 });
      G.tabSel.style.left = (sx - 75).toFixed(2) + 'px';
      for (const s of G.tabs) s.L.line.style.color = rgbMix(hex(C.grey), WHITE, clamp(1 - Math.abs(sx - s.cx) / 120));
      const cp = ramp(t, E.countA, E.countB), cv = Math.round(84320 * ease.outCubic(cp));
      setText(G.num, formatNumber(cv)); G.num.line.style.filter = cp > 0 && cp < 0.85 ? `blur(${(2.6 * (1 - cp)).toFixed(2)}px)` : 'none';
      const dp = ease.inOutCubic(ramp(t, E.countA, E.countB));
      lineDraw(G.line, dp); G.area.style.opacity = ease.inCubic(dp).toFixed(3);
      if (dp > 0.001) { const len = G.line.getTotalLength(), pt = G.line.getPointAtLength(len * dp); G.dot.setAttribute('cx', pt.x.toFixed(2)); G.dot.setAttribute('cy', pt.y.toFixed(2)); G.dot.style.display = 'block';
        const tp = sp(t, E.tip, { dur: 0.4, bounce: 0.3 }); G.tip.style.opacity = ramp(t, E.tip, E.tip + 0.1).toFixed(3); G.tip.style.display = 'block'; G.tip.style.left = Math.max(12, 56 + pt.x - 175).toFixed(1) + 'px'; G.tip.style.top = (380 + pt.y - 76 - 8 * (1 - tp)).toFixed(1) + 'px'; G.tip.style.transform = `scale(${(0.7 + 0.3 * tp).toFixed(3)})`; }
      else { G.dot.style.display = 'none'; G.tip.style.display = 'none'; }
    }
    // 5 curve editor
    if (fade(G.curve, t, [MS(S.curve) + 0.3, MS(S.ratio)])) {
      const p1 = P1(t), p2 = P2(t);
      const a = hl([0, 0]), b = hl([1, 1]), c1 = hl(p1), c2 = hl(p2);
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
    if (t >= MS(S.ratio) + 0.2 && t < MS(S.search)) {
      G.ratio.style.display = 'block'; const o = ramp(t, MS(S.ratio) + 0.2, MS(S.ratio) + 0.4) * (1 - ramp(t, MS(S.search) - 0.1, MS(S.search))); G.ratio.style.opacity = o.toFixed(3);
      const w = B.w, h = B.h, m = Math.min(w, h), fs = clamp(m * 0.115, 30, 78);
      G.rBg.style.background = `linear-gradient(${(120 + t * 70).toFixed(1)}deg, ${C.blue}, ${C.violet} 55%, ${C.coral})`;
      const inset = Math.round(m * 0.07); Object.assign(G.rSafe.style, { left: inset + 'px', top: inset + 'px', right: inset + 'px', bottom: inset + 'px' });
      Object.assign(G.rText.box.style, { fontSize: fs.toFixed(1) + 'px', width: (w * 0.72).toFixed(1) + 'px' });
      G.rText.box.style.left = '50%';
      const idx = t < E.ratio[1] - 0.15 ? 0 : t < E.ratio[2] - 0.15 ? 1 : t < E.ratio[3] - 0.15 ? 2 : 3;
      setText(G.rChip, ['٩:١٦', '١:١', '١٦:٩', '٤:٥'][idx]); G.rChip.line.style.top = (h - inset - 62) + 'px';
    } else G.ratio.style.display = 'none';
    // 7 search
    if (fade(G.search, t, [MS(S.search) + 0.3, MS(S.kinetic)])) {
      const ty = typeOn('كل إطار', t, { start: E.typeStart, wordsPerSecond: 6 }), done = ty.done;
      G.sTypeW.textContent = ty.text; G.sType.dataset.text = ty.text; G.sHint.line.style.display = ty.count ? 'none' : 'block';
      G.sCaret.style.display = caretVisible(t, { start: E.typeStart - 0.1, end: E.typeStart + 0.4, rate: 1.4 }) && t < E.pick ? 'inline-block' : 'none';
      G.rows.forEach((r, i) => { const a = E.results + i * 0.08, u = ein(ramp(t, a, a + 0.28)); r.row.style.opacity = u.toFixed(3); r.row.style.transform = `translateY(${((1 - u) * 26).toFixed(1)}px)`; });
      const pk = ease.inOutCubic(ramp(t, E.pick, E.pick + 0.14)); const r2 = G.rows[1];
      r2.row.style.background = rgbMix(WHITE, INK, pk); r2.L.line.style.color = rgbMix(INK, WHITE, pk); G.rows[1].icw.style.filter = pk > 0.5 ? 'invert(1)' : 'none';
      G.rows[0].row.style.opacity = (parseFloat(G.rows[0].row.style.opacity) * (1 - 0.6 * pk)).toFixed(3);
    }
    // 8 kinetic
    if (fade(G.kin, t, [MS(S.kinetic) + 0.12, MS(S.again)], { inD: 0.08, outD: 0.12 })) this.kinetic(t);
    // 9 button again → spinner → check
    if (fade(G.again, t, [MS(S.again) + 0.3, E.spin], { inD: 0.15 })) { G.again.shine.style.left = ((((t * 0.8) % 2.6) - 0.5) * 520 - 100).toFixed(1) + 'px'; G.again.style.transform = `scale(${((1 - 0.05 * Math.sin(Math.PI * ramp(t, E.click2 - 0.08, E.click2 + 0.12))) * G.again.base).toFixed(4)})`; }
    if (fade(G.spin, t, [E.spin + 0.12, E.check], { inD: 0.08, outD: 0.06 })) G.spinArc.setAttribute('transform', `rotate(${((t - E.spin) * 760).toFixed(1)} 75 75)`);
    if (fade(G.check, t, [E.check, 16.67], { inD: 0.06, outD: 0.02 })) { lineDraw(G.checkP, ease.outCubic(ramp(t, E.check + 0.03, E.check + 0.28))); G.check.style.transform = `scale(${(sp(t, E.check, { dur: 0.4, bounce: 0.4, from: 0.7 }) * G.check.base).toFixed(3)})`; }

    // ---- opening title + timeline ----
    setText(G.intro[1], ARD(t > 0.16 && t < 0.9 ? Math.floor(10 + 89 * Math.abs(noise1(t * 26, 9))) : 20) + ' ثانية · كل إطار فيها كود');
    G.intro.forEach((L, i) => { const a = -0.7 + i * 0.1, o = ramp(t, a, a + 0.5) * (1 - ramp(t, MS(S.player) - 0.12, MS(S.player) + 0.08)), e = ein(ramp(t, a, a + 0.6));
      L.line.style.display = o > 0.001 ? 'block' : 'none'; L.word.style.opacity = o.toFixed(3); L.word.style.transform = `translateY(${((1 - e) * 50 - ramp(t, MS(S.player) - 0.12, MS(S.player) + 0.1) * 70).toFixed(1)}px)`; L.word.style.filter = o < 0.98 ? `blur(${((1 - o) * 14).toFixed(1)}px)` : 'none'; });
    const onBlue = t >= 16.7, tlOn = !(t >= MS(S.kinetic) && t < MS(S.again) + 0.2);
    G.tl.style.display = tlOn ? 'block' : 'none';
    G.tlTrack.style.background = onBlue ? 'rgba(255,255,255,0.28)' : 'rgba(11,11,12,0.12)'; G.tlFill.style.background = onBlue ? C.white : C.ink; G.tlFill.style.width = (t / 20 * 950).toFixed(1) + 'px';
    G.tlTicks.forEach((k, i) => { const ts = Object.values(S)[i]; k.style.background = t >= ts ? (onBlue ? C.white : C.ink) : (onBlue ? 'rgba(255,255,255,0.4)' : 'rgba(11,11,12,0.2)'); });
    G.tlHead.style.left = (t / 20 * 950 - 9).toFixed(1) + 'px'; G.tlHead.style.background = onBlue ? C.gold : C.blue;
    // ---- ghost numeral ----
    { const gi = Math.max(0, [0, MS(S.player), MS(S.slider), MS(S.seg), MS(S.stats), MS(S.curve), MS(S.ratio), MS(S.search), MS(S.kinetic), MS(S.again), S.brand].reduce((m, a, i) => (t >= a ? i : m), 0));
      const ga = [0, MS(S.player), MS(S.slider), MS(S.seg), MS(S.stats), MS(S.curve), MS(S.ratio), MS(S.search), MS(S.kinetic), MS(S.again), S.brand][gi], gu = ein(ramp(t, ga, ga + 0.5));
      G.ghost.textContent = ARD(pad2(gi + 1)); G.ghost.style.transform = `translateY(${((1 - gu) * 120).toFixed(1)}px)`; G.ghost.style.opacity = (gu * (gi === 8 || (gi === 9 && t < MS(S.again) + 0.3) ? 0 : 1)).toFixed(3);
      G.ghost.style.color = t >= 16.7 ? 'rgba(255,255,255,0.09)' : 'rgba(11,11,12,0.055)'; }
    // ---- captions + HUD ----
    for (const c of cap) {
      const o = ramp(t, c.a, c.a + 0.25) * (1 - ramp(t, c.b - 0.12, c.b));
      c.L.line.style.display = o > 0.001 ? 'block' : 'none';
      if (o > 0.001) { c.L.word.style.opacity = o.toFixed(3); c.L.word.style.transform = `translateY(${((1 - ein(ramp(t, c.a, c.a + 0.3))) * 22).toFixed(1)}px)`; c.L.word.style.filter = o < 0.98 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none'; }
    }
    const names = [[0, '٠١', 'ضغطة'], [MS(S.player), '٠٢', 'مشغّل'], [MS(S.slider), '٠٣', 'تحكّم'], [MS(S.seg), '٠٤', 'اختيار'], [MS(S.stats), '٠٥', 'أرقام'], [MS(S.curve), '٠٦', 'منحنى'], [MS(S.ratio), '٠٧', 'مقاسات'], [MS(S.search), '٠٨', 'بحث'], [MS(S.kinetic), '٠٩', 'إيقاع'], [MS(S.again), '١٠', 'ضغطة'], [S.brand, '١١', 'بيكسل بلس']];
    const cur = names.filter(n => t >= n[0]).at(-1);
    setText(hudR, `// ${cur[1]} — ${cur[2]}`);
    const hudOn = !(t >= MS(S.kinetic) + 0.1 && t < MS(S.again) + 0.25);
    const hc = t >= 16.67 ? 'rgba(255,255,255,0.7)' : 'rgba(11,11,12,0.42)';
    for (const h_ of [hudL, hudR]) { h_.line.style.display = hudOn ? 'block' : 'none'; h_.line.style.color = hc; }

    // ---- bursts, cursor ----
    for (const b of bursts) {
      const u = (t - b.t) / 0.7; const on = u > 0 && u < 1;
      for (const s of b.sq) { if (!on) { s.el.style.display = 'none'; continue; } const e = ease.outCubic(u), sz = s.size * (1 - u * 0.7);
        Object.assign(s.el.style, { display: 'block', left: (b.x + Math.cos(s.ang) * s.dist * e - sz / 2).toFixed(1) + 'px', top: (b.y + Math.sin(s.ang) * s.dist * e - sz / 2 + 40 * u * u).toFixed(1) + 'px', width: sz.toFixed(1) + 'px', height: sz.toFixed(1) + 'px', background: b.color, opacity: (1 - u * u).toFixed(3) }); }
    }
    const vis = cursorVisible(t);
    cursor.style.display = vis ? 'block' : 'none';
    const press = CLICKS.reduce((m, c) => Math.max(m, Math.sin(Math.PI * clamp((t - (c - 0.07)) / 0.2)) ), 0);
    cursor.style.transform = `translate(${cxp.toFixed(1)}px, ${cyp.toFixed(1)}px) scale(${(1 - 0.16 * press).toFixed(3)})`;
    let rr = 0, ro = 0; for (const c of CLICKS) { const u = (t - c) / 0.4; if (u > 0 && u < 1) { rr = 14 + 96 * ease.outCubic(u); ro = (1 - u) * 0.85; } }
    Object.assign(ripple.style, { left: (cxp + 4 - rr).toFixed(1) + 'px', top: (cyp + 4 - rr).toFixed(1) + 'px', width: (2 * rr).toFixed(1) + 'px', height: (2 * rr).toFixed(1) + 'px', opacity: vis ? ro.toFixed(3) : '0', borderColor: t > 17 ? C.white : C.blue });

    // ---- iris into the brand card + brand ----
    tr.c.style.display = 'none';
    if (sec(E.iris, S.brand + 0.02)) {
      const g = ease.inCubic(ramp(t, E.iris, S.brand));
      tr.c.style.display = 'block'; pixelCircle(tr, { cx: 540, cy: 760, r: 40 + g * cover(540, 760) * 1.1, band: 0.35, color: BLUE });
    }
    this.brand(t);
  },

  kinetic(t) {
    const idx = E.words.reduce((m, w, i) => (t >= w ? i : m), -1);
    const bgs = [C.ink, C.blue, C.paper, C.ink];
    G.kBg.style.background = idx < 0 ? C.ink : bgs[idx];
    G.kWords.forEach((w, i) => {
      const a = E.words[i], on = i === idx; w.style.display = on ? 'block' : 'none'; if (!on) return;
      const u = t - a, e = ein(ramp(u, 0, 0.3));
      w.style.color = i === 2 ? C.ink : i === 3 ? C.gold : C.white;
      const size = fitFontSize(w.textContent, { family: i === 3 ? 'Aref Ruqaa' : 'Alexandria', weight: i === 3 ? 700 : 800, maxWidth: 900, max: i === 3 ? 380 : 340, min: 120 }); w.style.fontSize = size + 'px';
      if (i === 0) { w.style.transform = `translateX(${((1 - e) * 900).toFixed(1)}px) scale(${lerp(1.12, 1, e).toFixed(3)})`; w.style.filter = e < 0.97 ? `blur(${((1 - e) * 26).toFixed(1)}px)` : 'none'; w.style.opacity = '1'; }
      if (i === 1) { w.style.transform = `perspective(900px) rotateX(${((1 - e) * -85).toFixed(1)}deg) translateY(${((1 - e) * 60).toFixed(1)}px)`; w.style.filter = 'none'; w.style.opacity = ramp(u, 0, 0.1).toFixed(3); }
      if (i === 2) { const z = lerp(2.4, 1, e); w.style.transform = `scale(${z.toFixed(3)})`; w.style.filter = e < 0.97 ? `blur(${((1 - e) * 22).toFixed(1)}px)` : 'none'; w.style.opacity = ramp(u, 0, 0.08).toFixed(3); }
      if (i === 3) { w.style.transform = `translateY(${((1 - e) * 120).toFixed(1)}px) rotate(${(-5 * (1 - e)).toFixed(2)}deg) scale(${lerp(0.7, 1.04, ease.outCubic(ramp(u, 0, 0.5))).toFixed(3)})`; w.style.filter = e < 0.97 ? `blur(${((1 - e) * 14).toFixed(1)}px)` : 'none'; w.style.opacity = ramp(u, 0, 0.08).toFixed(3); }
    });
    // beat-locked furniture: waveform on the blue word, ring on the paper word, streaks on the first word
    const wu = idx >= 0 ? t - E.words[idx] : 0;
    G.kBars.forEach((b, i) => { const on = idx === 1; b.style.display = on ? 'block' : 'none'; if (!on) return; const h = 40 + 280 * (0.2 + 0.8 * Math.abs(noise1(i * 0.8 + t * 6, 11))) * (0.4 + 0.6 * pulse(t, 3)); b.style.height = h.toFixed(1) + 'px'; b.style.top = (1480 - h / 2 + 110).toFixed(1) + 'px'; b.style.background = 'rgba(255,255,255,0.9)'; });
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
    // the character stands on the wordmark, waves, then winks at the CTA
    const IDLE = [0.3, 0.2], gr = sp(t, E.hero, { dur: 0.6, bounce: 0.4, from: 0.02 });
    const wave = ramp(t, E.hero + 0.45, E.hero + 0.65), wv = 2.5 + 0.6 * Math.sin(t * 11);
    const hop = (a, b, hh) => hh * Math.sin(Math.PI * ramp(t, a, b));
    const rPx = 100 * gr, feet = 846, ox = 420;
    brandMascot.render(t, { x: ox / W, y: 1 - (feet - 3.04 * rPx) / H, size: rPx / H, yaw: 0.2 * Math.sin((t - E.hero) * 1.6) * (1 - ramp(t, E.cta + 0.2, E.cta + 0.6)), pitch: 0.04, roll: 0.05 * Math.sin((t - E.hero) * 2.1), smile: 0.9 + 0.1 * ramp(t, E.cta, E.cta + 0.2),
      open: t > E.tag && t < E.tag + 0.45 ? 0.45 : 0, wink: t > E.ctaClick + 0.1 && t < E.ctaClick + 0.55 ? 1 : 0, blink: t > 19.1 && t < 19.22 ? 1 : 0, look: [0.2, 0], bounce: hop(E.hero + 0.1, E.hero + 0.5, 0.4) + hop(E.ctaClick, E.ctaClick + 0.4, 0.3), shadow: 0,
      armL: IDLE, armR: [lerp(0.3, wv, wave), lerp(0.2, wv - 0.1, wave)] }, { visible: true });
  },
};
