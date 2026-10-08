// Film 12 — MIZAN (ميزان · "the scale") — 25 s Reels ad for the Al-Store shop program, 1080×1920 @ 30 fps, 120 BPM.
// Idea: the product's name is a scale, and its mark is two bars balanced on a fulcrum. The shop's daily loads (invoices,
// instalments, stock, the safe) pile on one end of the beam and tip it; the copper bar — the hero of the whole film — slams
// in under the beam and levels it: that IS the logo. Then the same copper bar does every job in the program: the barcode
// scanner's laser, the shop total, the "paid" button, the shelf every appliance stands on, the instalment progress, the
// tallest bar of the sales chart — and it finally returns into the logo. Worlds: night (problem) → cream tile → ivory (sell)
// → night shelves → copper (instalments) → night numbers → the night gathers into the navy tile on ivory (payoff).
// Colours, fonts, icons and the mark's geometry are the client's own (Store/docs/DESIGN.md, web/img/icons.svg).
// Every frame is a closed-form function of t (springs, seeded hashes): any frame renders identically in any order.
import { clamp, lerp, ramp, ease, el, textLine, grain } from '../lib/motion.js';
import { springStep, hash } from '../lib/kinetics.js';
import { mixHex } from '../lib/uimorph.js';
import { T } from './timing.js';

const C = {
  navy: '#13213c', rail: '#101c33', night: '#0a101c', night2: '#111a2b', night3: '#1b2740', steel: '#24365a',
  ivory: '#f5f3ee', cream: '#f3e9d8', copper: '#c8743c', copperL: '#e08a4c', copperD: '#a4531c', copperSoft: '#fbe6d8',
  hot: '#ffb070', ok: '#137a48', okL: '#4cc98a', okSoft: '#dff3e7', bad: '#ff7a6e', ink: '#12161b', mute: '#5b6477', white: '#ffffff',
};
const DISP = "'Alexandria'", UI = "'Readex Pro'";
const FPS = 30;
let W = 1080, H = 1920, CAM, GRAIN, STAGE;
const S = {}, SC = [];

// ---------- helpers ----------
const px = (v) => `${(+v).toFixed(2)}px`;
const oE = ease.outExpo, ioC = ease.inOutCubic, oC = ease.outCubic, iC = ease.inCubic;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const spr = (t, start, duration = 0.5, bounce = 0.2) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const place = (n, x, y, w, h, r) => { n.style.left = px(x - w / 2); n.style.top = px(y - h / 2); n.style.width = px(Math.max(0, w)); n.style.height = px(Math.max(0, h)); if (r !== undefined) n.style.borderRadius = px(Math.max(0, Math.min(r, w / 2, h / 2))); };
const setBlur = (n, b) => { n.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : 'none'; };
const vis = (n, on) => { n.style.display = on ? (n.dataset.d || 'block') : 'none'; };
const op = (n, o) => { n.style.opacity = clamp(o).toFixed(3); };
// Lines that physically leave the frame (a blind, a fling, a dive) stop being readable copy: hide them from the text gate and the eye.
const hideLines = (root, hidden) => { root._lines = root._lines || [...root.querySelectorAll('.line')]; for (const l of root._lines) l.style.visibility = hidden ? 'hidden' : 'visible'; };
const fmt = (v) => Math.round(v).toLocaleString('en-US');
const lerpS = (a, b, p) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b), 'rot'])) o[k] = lerp(a[k] ?? 0, b[k] ?? 0, p); return o; };

// The client's own UI icons (Store web/img/icons.svg: 24 grid, 1.75 stroke, round joins) + appliance glyphs drawn to match.
const ICON = {
  receipt: '<path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  instal: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  safe: '<rect x="3" y="3.5" width="18" height="16" rx="2"/><circle cx="12" cy="11.5" r="3.5"/><path d="M12 8v1M12 14v1M5.5 19.5v1.5M18.5 19.5v1.5"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M17 20h4v-3M14 20v.01"/>',
  store: '<path d="M3.5 9 5 4h14l1.5 5"/><path d="M3.5 9a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0"/><path d="M5 11.5V20h14v-8.5M10 20v-5h4v5"/>',
  warehouse: '<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8M7 17h10"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  shield: '<path d="M12 2.8 4.5 5.6v6c0 4.7 3.2 8.4 7.5 9.6 4.3-1.2 7.5-4.9 7.5-9.6v-6L12 2.8Z"/><path d="m8.8 12 2.2 2.2 4.4-4.6"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  barcode: '<path d="M3 5v14M6.5 5v14M9 5v14M12.5 5v14M15 5v14M18.5 5v14M21 5v14"/>',
  message: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-4.6A8.5 8.5 0 1 1 20.5 11.5Z"/>',
  wifiOff: '<path d="M2.5 8.8a14 14 0 0 1 5-2.9M11 5.2a14 14 0 0 1 10.5 3.6M5.5 12.3a9 9 0 0 1 4-2.1M15.6 10.6a9 9 0 0 1 2.9 1.7M8.8 15.6a4.6 4.6 0 0 1 6.4 0M12 19.5h.01M3.5 3.5l17 17"/>',
  // appliance glyphs (drawn for this film in the same 24-grid line style)
  fridge: '<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M6 10h12M9 5.5v2M9 12.5v3"/>',
  washer: '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><circle cx="12" cy="13.5" r="4.3"/><path d="M7.5 6h3M16 6h.01"/>',
  stove: '<rect x="4" y="3" width="16" height="18.5" rx="2"/><path d="M4 9h16"/><circle cx="8.5" cy="6" r="1.2"/><circle cx="15.5" cy="6" r="1.2"/><rect x="7" y="12" width="10" height="6.5" rx="1"/>',
  ac: '<rect x="2.5" y="5.5" width="19" height="8.5" rx="2"/><path d="M6 11h12M8 17l-1 2.5M12 17v3M16 17l1 2.5"/>',
  blender: '<path d="M8 3h8l-1 9.5H9L8 3Z"/><rect x="7.5" y="13" width="9" height="8" rx="1.5"/><path d="M12 16.8h.01M10 6.5h4"/>',
};
function icon(parent, name, size, color, sw = 1.75, style = {}) {
  const s = el('svg', { viewBox: '0 0 24 24', width: size, height: size, style: { position: 'absolute', overflow: 'visible', fill: 'none', stroke: color, strokeWidth: String(sw), strokeLinecap: 'round', strokeLinejoin: 'round', ...style } }, parent);
  s.innerHTML = ICON[name];
  return s;
}

// A line of words (`.line/.word` so the studio's text and safe-area gates read it). align: center | right | left.
function words(parent, text, { size, weight = 700, color = C.navy, cx = W / 2, cy, width = W, font = DISP, lh = 1.15, accent = {}, align = 'center', z = 8, tr = 0, dir = 'rtl' } = {}) {
  const jc = align === 'center' ? 'center' : (align === 'right') === (dir === 'rtl') ? 'flex-start' : 'flex-end';
  const L = textLine(parent, text, { left: px(cx - width / 2), top: px(cy - (size * lh) / 2), width: px(width), justifyContent: jc, fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), letterSpacing: `${tr}em`, direction: dir, zIndex: String(z), fontFeatureSettings: '"tnum" 1' });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; });
  return L;
}
// Word animation styles (never split an Arabic word): slam | rise | drop | flip | blur. Exit: blur-lift.
function play(L, t, tIn, tOut = 99, { style = 'rise', stagger = 0.07, dur = 0.55, outDur = 0.3, dy = 46, outDy = -30 } = {}) {
  const on = t >= tIn - 0.01 && t <= tOut + outDur + L.words.length * 0.03 + 0.02;
  L.line.style.display = on ? 'flex' : 'none';
  if (!on) return;
  L.words.forEach((w, i) => {
    const a = tIn + i * stagger, u = ramp(t, a, a + dur), b0 = tOut + i * 0.03, q = ioC(ramp(t, b0, b0 + outDur));
    let o = clamp(u * 2.2), tf = '', b = 0;
    if (style === 'slam') { const s = spr(t, a, 0.42, 0.32); tf = `scale(${lerp(1.35, 1, clamp(s, 0, 1.3)).toFixed(4)})`; b = (1 - clamp(s)) * 16; o = clamp(s * 3); }
    else if (style === 'drop') { const s = spr(t, a, 0.5, 0.38); tf = `translateY(${((1 - s) * -dy * 0.9).toFixed(2)}px)`; b = (1 - clamp(s)) * 10; o = clamp(s * 2.5); }
    else if (style === 'flip') { const s = spr(t, a, 0.55, 0.2); tf = `perspective(900px) rotateX(${((1 - s) * -88).toFixed(2)}deg)`; b = (1 - clamp(s)) * 6; o = clamp(s * 2.5); }
    else if (style === 'blur') { const e = oC(u); tf = `scale(${lerp(1.12, 1, e).toFixed(4)})`; b = (1 - e) * 22; o = clamp(e * 1.6); }
    else { const e = oE(u); tf = `translateY(${((1 - e) * dy).toFixed(2)}px)`; b = (1 - e) * 12; }
    w.style.opacity = (o * (1 - q)).toFixed(3);
    w.style.transform = `${tf} translateY(${(q * outDy).toFixed(2)}px)`;
    setBlur(w, b + q * 10);
  });
}
// Counter text in a one-word line.
const setText = (L, s) => { if (L.words[0].textContent !== s) L.words[0].textContent = s; };

// ---------- the mark (client geometry: 48-unit grid; bars x 11–37, y 12/19.5, h 4.5; fulcrum M24 26 32 36H16Z) ----------
function markGeom(k, cx, cy) {
  const g = (u, v) => [cx + (u - 24) * k, cy + (v - 24) * k];
  const [tx, ty] = g(0, 0);
  return { k, cx, cy, tile: { x: tx, y: ty, s: 48 * k, r: 12 * k },
    top: { cx, cy: g(24, 14.25)[1], w: 26 * k, h: 4.5 * k }, copper: { cx, cy: g(24, 21.75)[1], w: 26 * k, h: 4.5 * k },
    apex: g(24, 26), base: g(24, 36)[1], half: 8 * k };
}
const K1 = 22, M1 = [540, 1000];             // hook: the beam, big
const K2 = 280 / 48, M2 = [540, 650];        // name: the logo
const K3 = 260 / 48, M3 = [540, 560];        // payoff: the logo
const G1 = markGeom(K1, ...M1), G3 = markGeom(K3, ...M3);
// Hook beam: before the copper bar arrives, the top bar pivots on the fulcrum's apex and tips under the loads.
const TILT = [-5, -5.5, -4, -4];
function beam(t) {
  let rot = 0;
  T.chips.forEach((c, i) => { rot += TILT[i] * spr(t, c, 0.6, 0.45); });
  rot += sm(1.9, 2.3, t) * (1 - sm(3.7, 3.86, t)) * (1.1 * Math.sin(t * 57) + 0.6 * Math.sin(t * 31 + 1));
  const L = spr(t, T.lift, 0.42, 0.3);           // the copper bar lifts and levels it (overshoot = a balance wobble)
  const r = (rot * Math.PI) / 180, hh = G1.top.h / 2;
  const pre = [G1.apex[0] + hh * Math.sin(r), G1.apex[1] - hh * Math.cos(r)];
  return { cx: lerp(pre[0], G1.top.cx, L), cy: lerp(pre[1], G1.top.cy, L), rot: rot * (1 - L), L };
}
// Mark scale/centre through the film.
function markState(t) {
  if (t < T.zoom) return { k: K1, cx: M1[0], cy: M1[1] };
  if (t < T.dive) { const s = spr(t, T.zoom, 0.62, 0.12); return { k: K1 * Math.pow(K2 / K1, s), cx: M2[0], cy: lerp(M1[1], M2[1], s), s }; }
  if (t < T.gather) { const e = iC(ramp(t, T.dive, T.dive + 0.42)); return { k: K2 * Math.exp(2.6 * e), cx: M2[0], cy: M2[1], e }; }
  return { k: K3, cx: M3[0], cy: M3[1] };
}

// ---------- the hero: ONE copper container that does every job (anchors switch with a spring; pure in t) ----------
const heroLaser = { cx: 540, cy: 640, w: 310, h: 12, r: 6, hot: 1, glow: 1, rot: 90 };
const heroTotal = { cx: 540, cy: 712, w: 800, h: 116, r: 58, hot: 0, glow: 0.25 };
const heroButton = { cx: 540, cy: 712, w: 620, h: 104, r: 52, hot: 0, glow: 0.35 };
const heroPlank = { cx: 540, cy: 960, w: 940, h: 24, r: 12, hot: 0.15, glow: 0.7 };
const instP = (t) => clamp(0.06 + T.cells.reduce((a, c) => a + spr(t, c, 0.4, 0.2) / 6, 0), 0, 1);
const heroProgress = (t) => { const w = 800 * instP(t); return { cx: 940 - w / 2, cy: 1010, w, h: 22, r: 11, hot: 0, glow: 0.3 }; };
const BARH = [80, 128, 100, 158, 134, 192, 236], BASE = 1232, barX = (i) => 150 + i * 125;
const heroBar = { cx: barX(6), cy: BASE - BARH[6] / 2, w: 78, h: BARH[6], r: 14, hot: 0, glow: 0.45 };
const heroLogo = { cx: G3.copper.cx, cy: G3.copper.cy, w: G3.copper.w, h: G3.copper.h, r: G3.copper.h / 2, hot: 0, glow: 0 };
const markCopper = (t) => { const m = markState(t), g = markGeom(m.k, m.cx, m.cy); return { cx: g.copper.cx, cy: g.copper.cy, w: g.copper.w, h: g.copper.h, r: g.copper.h / 2, hot: 0, glow: 0.2 }; };
const HERO = [
  { t: -1, f: () => ({ cx: 1760, cy: G1.copper.cy, w: G1.copper.w, h: G1.copper.h, r: G1.copper.h / 2, hot: 1, glow: 0.8 }) },
  { t: T.arrive, f: markCopper, cfg: { duration: 0.22, bounce: 0.12 } },
  { t: T.dive + 0.02, f: () => heroLaser, cfg: { duration: 0.42, bounce: 0.16 } },
  { t: T.toTotal, f: () => heroTotal, cfg: { duration: 0.45, bounce: 0.14 } },
  { t: T.toButton, f: () => heroButton, cfg: { duration: 0.32, bounce: 0.12 } },
  { t: T.blind + 0.06, f: () => heroPlank, cfg: { duration: 0.5, bounce: 0.14 } },
  { t: T.copper[0] + 0.1, f: heroProgress, cfg: { duration: 0.42, bounce: 0.1 } },
  { t: T.bars + 0.06, f: () => heroBar, cfg: { duration: 0.5, bounce: 0.18 } },
  { t: T.gather + 0.05, f: () => heroLogo, cfg: { duration: 0.5, bounce: 0.14 } },
];
// Segment i blends the live state of segment i-1 into anchor i with its spring (superposition: continuous, pure in t).
function heroSeg(i, t) {
  if (i === 0) return HERO[0].f(t);
  return lerpS(heroSeg(i - 1, t), HERO[i].f(t), springStep(t - HERO[i].t, HERO[i].cfg).value);
}
function heroAt(t) { let i = 0; while (i + 1 < HERO.length && t >= HERO[i + 1].t) i++; return heroSeg(i, t); }

// =====================================================================================================
// HOOK 0–4.25 — night. "كل يوم في المحل.." · four loads land on the beam one per beat · «والحساب مش بيقفل؟»
const CHIPS = [
  { label: 'فواتير', ic: 'receipt', x: -150 }, { label: 'أقساط', ic: 'instal', x: -172 },
  { label: 'مخزون', ic: 'box', x: -138 }, { label: 'خزنة', ic: 'safe', x: -164 },
];
const CHW = 250, CHH = 88;
SC.push({ id: 'hook', a: 0, b: 4.3, z: 10, init(root) {
  full(root, { background: `radial-gradient(ellipse 90% 60% at 50% 52%, ${C.night3} 0%, ${C.night2} 45%, ${C.night} 100%)` });
  const grid = div(root, { left: '-80px', top: '-80px', width: px(W + 160), height: px(H + 160), opacity: '0.5',
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(243,233,216,0.045) 0 1.5px, transparent 1.5px 120px), repeating-linear-gradient(90deg, rgba(243,233,216,0.03) 0 1.5px, transparent 1.5px 120px)' });
  const warn = div(root, { width: '900px', height: '520px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,122,110,0.34), rgba(255,122,110,0))', zIndex: '2' });
  const ctx = words(root, 'كل يوم في المحل..', { size: 64, weight: 500, color: 'rgba(243,233,216,0.82)', cy: 420, font: UI });
  const h1 = words(root, 'والحساب', { size: 124, weight: 800, color: C.cream, cy: 400 });
  const h2 = words(root, 'مش بيقفل؟', { size: 126, weight: 800, color: C.bad, cy: 570, lh: 1.12 });
  // chips ride the beam: one container with the beam's own transform
  const rig = div(root, { width: '0px', height: '0px', zIndex: '6' });
  const chips = CHIPS.map((c, i) => {
    const n = div(rig, { width: px(CHW), height: px(CHH), borderRadius: '22px', background: `linear-gradient(180deg, ${C.steel}, ${C.night3})`,
      border: '2px solid rgba(243,233,216,0.22)', boxShadow: '0 18px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)', transformOrigin: '50% 100%' });
    icon(n, c.ic, 40, C.copperL, 1.9, { right: '26px', top: px((CHH - 40) / 2) });
    const L = words(n, c.label, { size: 42, weight: 600, color: C.cream, cx: (CHW - 70) / 2, cy: CHH / 2, width: CHW - 70, font: UI, lh: 1.2 });
    return { n, L, c, i };
  });
  // a pulse ring under the beam while it trembles (the warning)
  const ring = div(root, { border: `3px solid ${C.bad}`, borderRadius: '50%', zIndex: '3' });
  S.hook = { root, grid, warn, ctx, h1, h2, rig, chips, ring };
}, render(t) {
  const s = S.hook, b = beam(t);
  s.grid.style.transform = `translateY(${(-30 * ramp(t, 0, 4)).toFixed(1)}px) scale(${(1 + 0.04 * ramp(t, 0, 4)).toFixed(4)})`;
  play(s.ctx, t, T.ctxIn, T.ctxOut, { style: 'rise', stagger: 0.09 });
  play(s.h1, t, T.headIn, T.headOut, { style: 'slam', stagger: 0.06 });
  play(s.h2, t, T.headIn + 0.16, T.headOut, { style: 'slam', stagger: 0.08 });
  const w = sm(1.95, 2.3, t) * (1 - sm(3.75, 3.95, t)) * (0.75 + 0.25 * Math.sin(t * 12.6));
  place(s.warn, 540, 1010, 960, 560); op(s.warn, w);
  const ru = ((t - 2.0) % 0.5) / 0.5, ron = t > 2.0 && t < 3.75;
  place(s.ring, b.cx, G1.apex[1] - 40, 200 + 700 * oC(ru), 70 + 240 * oC(ru)); op(s.ring, ron ? 0.5 * (1 - ru) : 0);
  s.rig.style.transform = `translate(${px(b.cx)}, ${px(b.cy)}) rotate(${b.rot.toFixed(3)}deg)`;
  s.chips.forEach(({ n, L, c, i }) => {
    const land = T.chips[i], u = ramp(t, land - 0.3, land), fallY = -1100 * (1 - u * u);
    const tau = t - land, sq = tau > 0 ? 0.2 * Math.exp(-tau / 0.09) * Math.cos(tau * 34) : 0;
    const fl = ramp(t, T.fling + i * 0.03, T.fling + 0.42 + i * 0.03), fe = oC(fl);
    const fx = fe * (-520 - i * 160), fy = fe * (-760 + i * 170) + fl * fl * 300, frot = fe * (-70 - i * 25);
    const y0 = -G1.top.h / 2 - CHH / 2 - i * (CHH + 6) + fallY + fy;
    n.style.left = px(c.x + fx - CHW / 2); n.style.top = px(y0 - CHH / 2);
    n.style.transform = `rotate(${(frot + (i % 2 ? 2.2 : -1.6)).toFixed(2)}deg) scale(${(1 + sq * 0.6).toFixed(4)}, ${(1 - sq).toFixed(4)})`;
    n.style.opacity = (t < land - 0.3 ? 0 : 1 - fl).toFixed(3);
    setBlur(n, (u < 1 ? (1 - u) * 6 : 0) + fl * 12);
    L.line.style.display = 'flex'; const lo = (t < land - 0.3 ? 0 : sm(0.6, 0.85, u)) * (fl > 0.06 ? 0 : 1); L.words.forEach((wd) => { wd.style.opacity = lo.toFixed(3); });
  });
} });

// =====================================================================================================
// NAME 4.1–6.5 — the cream world shrinks into the logo tile; «ميزان» and what it is.
SC.push({ id: 'name', a: 4.1, b: 6.5, z: 12, init(root) {
  full(root, { background: `radial-gradient(ellipse 85% 55% at 50% 42%, ${C.night3} 0%, ${C.navy} 50%, ${C.night} 100%)` });
  const halo = div(root, { width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(224,138,76,0.28), rgba(224,138,76,0))' });
  const cam = div(root, { width: px(W), height: px(H), transformOrigin: `${M2[0]}px ${M2[1]}px` });
  const word = words(cam, 'ميزان', { size: 196, weight: 800, color: C.cream, cy: 940, lh: 1.1 });
  const latin = words(cam, 'MIZAN', { size: 40, weight: 600, color: C.copperL, cy: 1072, dir: 'ltr', tr: 0.5, lh: 1.1 });
  const sub1 = words(cam, 'برنامج لمحلات الأدوات المنزلية', { size: 46, weight: 500, color: 'rgba(243,233,216,0.86)', cy: 1128, font: UI, lh: 1.2 });
  const sub2 = words(cam, 'والأجهزة الكهربائية', { size: 46, weight: 500, color: 'rgba(243,233,216,0.86)', cy: 1204, font: UI, lh: 1.2 });
  S.name = { root, halo, cam, word, latin, sub1, sub2 };
}, render(t) {
  const s = S.name, m = markState(t);
  place(s.halo, M2[0], M2[1], 960, 960); op(s.halo, sm(4.4, 5.0, t) * (1 - sm(5.9, 6.2, t)));
  const e = m.e || 0;
  s.cam.style.transform = `scale(${Math.exp(2.6 * e).toFixed(4)})`; setBlur(s.cam, e * 14); hideLines(s.cam, e > 0.03);
  play(s.word, t, T.word, T.nameOut, { style: 'blur', stagger: 0.1, dur: 0.5 });
  play(s.latin, t, T.word + 0.3, T.nameOut, { style: 'rise', dy: 20 });
  play(s.sub1, t, T.sub, T.nameOut, { style: 'rise', stagger: 0.05, dy: 30 });
  play(s.sub2, t, T.sub + 0.18, T.nameOut, { style: 'rise', stagger: 0.05, dy: 30 });
} });

// =====================================================================================================
// SELL 6.0–10.3 — ivory, inside the tile. Barcode: three scans on the beat → invoice → payment → change → paid.
const ITEMS = [
  { name: 'بوتاجاز 4 شعلة 60 سم', brand: 'Unionaire', price: 10900 },
  { name: 'سخان غاز 10 لتر', brand: 'Olympic', price: 5200 },
  { name: 'سلة غسيل بلاستيك', brand: 'El Helal', price: 95 },
];
const TOTAL = ITEMS.reduce((a, b) => a + b.price, 0), PAID = 16500;
const PAY = [
  { label: 'كاش', ic: 'cash' }, { label: 'فيزا', ic: 'card' }, { label: 'محفظة موبايل', ic: 'phone' },
  { label: 'إنستاباي', ic: 'qr' }, { label: 'شركة تقسيط', ic: 'instal' }, { label: 'تقسيط المحل', ic: 'store' },
];
const PW = 288, PH = 82, payX = (i) => [840, 540, 240][i % 3], payY = (i) => (i < 3 ? 838 : 934);
const CARD_W = 520, CARD_H = 136, RCX = 540, RW = 720;
function tileRect(t) { // the sell world's clip: the tile growing to fill the frame
  const g = markGeom(K2, ...M2).tile, e = iC(ramp(t, T.dive, T.dive + 0.42));
  const x0 = lerp(g.x, -40, e), y0 = lerp(g.y, -40, e), x1 = lerp(g.x + g.s, W + 40, e), y1 = lerp(g.y + g.s, H + 40, e);
  return { x0, y0, x1, y1, r: lerp(g.r, 0, e), e };
}
SC.push({ id: 'sell', a: T.dive, b: 10.4, z: 29, init(root) {
  const bg = full(root, { background: `linear-gradient(180deg, #f7f5f0 0%, ${C.ivory} 60%, #ece7dc 100%)` });
  const lines = full(root, { opacity: '0.6', backgroundImage: 'repeating-linear-gradient(0deg, rgba(19,33,60,0.05) 0 1.5px, transparent 1.5px 96px)' });
  const cam = div(root, { width: px(W), height: px(H), transformOrigin: '540px 300px' });
  const hA = words(cam, 'بيع بالباركود', { size: 120, weight: 800, color: C.navy, cy: 420, accent: { 1: C.copper } });
  const hB = words(cam, 'وطرق دفع متعددة', { size: 94, weight: 800, color: C.navy, cy: 420, accent: { 2: C.copper } });
  // conveyor
  const rail = div(cam, { height: '4px', borderRadius: '2px', background: 'rgba(19,33,60,0.12)' }); place(rail, 540, 640 + CARD_H / 2 + 22, 980, 4);
  const cards = ITEMS.map((it, i) => {
    const n = div(cam, { width: px(CARD_W), height: px(CARD_H), borderRadius: '26px', background: C.white, border: '1.5px solid rgba(19,33,60,0.08)', boxShadow: '0 24px 44px rgba(19,33,60,0.16)', overflow: 'hidden' });
    const bc = div(n, { left: '24px', top: '24px', width: '120px', height: px(CARD_H - 48), opacity: '0.9' });
    for (let k = 0, x = 0; x < 116; k++) { const wv = 2 + Math.floor(hash(k, i + 3) * 6); if (k % 2 === 0) div(bc, { left: px(x), top: '0', width: px(wv), height: '100%', background: C.navy }); x += wv; }
    const nm = words(n, it.name, { size: 36, weight: 600, color: C.navy, cx: 340, cy: 48, width: 330, font: UI, align: 'right', lh: 1.2 });
    const pr = words(n, `${fmt(it.price)} ج.م`, { size: 38, weight: 800, color: C.copper, cx: 340, cy: 96, width: 330, align: 'right', lh: 1.2 });
    const ok = div(n, { width: px(CARD_W), height: px(CARD_H), background: 'rgba(76,201,138,0.16)', opacity: '0' });
    return { n, nm, pr, ok, it, i };
  });
  // invoice
  const rec = div(cam, { background: C.white, borderRadius: '30px', boxShadow: '0 30px 60px rgba(19,33,60,0.14)', border: '1.5px solid rgba(19,33,60,0.07)', overflow: 'hidden' });
  const recT = words(cam, 'فاتورة بيع', { size: 40, weight: 700, color: C.navy, cx: RCX + 70, cy: 846, width: RW - 140 - 60, font: UI, align: 'right' });
  const tagBox = div(cam, { background: C.copperSoft, borderRadius: '999px' });
  const tag = words(cam, 'محل تدريب', { size: 34, weight: 600, color: C.copperD, cx: 300, cy: 846, width: 200, font: UI });
  const rows = ITEMS.map((it, i) => ({
    nm: words(cam, it.name, { size: 36, weight: 500, color: C.ink, cx: RCX + 90, cy: 930 + i * 70, width: RW - 260, font: UI, align: 'right' }),
    pr: words(cam, fmt(it.price), { size: 38, weight: 700, color: C.navy, cx: RCX - RW / 2 + 130, cy: 930 + i * 70, width: 200, align: 'left', dir: 'ltr' }),
  }));
  const rule = div(cam, { height: '2px', background: 'rgba(19,33,60,0.1)' });
  const totL = words(cam, 'الإجمالي', { size: 42, weight: 700, color: C.navy, cx: RCX + 150, cy: 1172, width: RW - 360, font: UI, align: 'right' });
  const totN = words(cam, '0 ج.م', { size: 56, weight: 800, color: C.navy, cx: RCX - 110, cy: 1172, width: 440, align: 'left' });
  // payment
  const chips = PAY.map((p, i) => {
    const n = div(cam, { width: px(PW), height: px(PH), borderRadius: '22px', background: C.white, border: '2px solid rgba(19,33,60,0.12)', boxShadow: '0 12px 24px rgba(19,33,60,0.08)' });
    const ic = icon(n, p.ic, 36, C.navy, 1.9, { right: '22px', top: px((PH - 36) / 2) });
    const L = words(n, p.label, { size: 34, weight: 600, color: C.navy, cx: (PW - 64) / 2, cy: PH / 2, width: PW - 64, font: UI, lh: 1.2 });
    return { n, ic, L, i };
  });
  const sel = div(cam, { border: `5px solid ${C.copper}`, borderRadius: '26px', boxShadow: '0 0 0 8px rgba(200,116,60,0.16)' });
  const chg = div(cam, { background: C.okSoft, borderRadius: '26px', border: '2px solid rgba(19,122,72,0.25)' });
  const chgL = words(cam, 'الباقي', { size: 44, weight: 700, color: C.ok, cx: 760, cy: 1035, width: 380, font: UI, align: 'right' });
  const chgN = words(cam, `${fmt(PAID - TOTAL)} ج.م`, { size: 64, weight: 800, color: C.ok, cx: 330, cy: 1035, width: 420, align: 'left' });
  const paidL = words(cam, `المدفوع ${fmt(PAID)}`, { size: 34, weight: 500, color: C.mute, cx: 540, cy: 1098, width: 600, font: UI });
  S.sell = { root, bg, lines, cam, hA, hB, rail, cards, rec, recT, tagBox, tag, rows, rule, totL, totN, chips, sel, chg, chgL, chgN, paidL };
}, render(t) {
  const s = S.sell, tr = tileRect(t);
  s.root.style.clipPath = tr.e < 1 ? `inset(${px(tr.y0)} ${px(W - tr.x1)} ${px(H - tr.y1)} ${px(tr.x0)} round ${px(tr.r)})` : 'none';
  // the blind: the whole ivory world is pulled up off the night shelves
  const bl = ioC(ramp(t, T.blind, T.blind + 0.38));
  s.root.style.transform = bl > 0 ? `translateY(${(-H * 1.04 * bl).toFixed(1)}px)` : 'none';
  setBlur(s.root, Math.sin(Math.PI * bl) * 10); hideLines(s.cam, bl > 0.04);
  const push = 1 + 0.035 * ramp(t, 6.2, 9.9);
  s.cam.style.transform = `scale(${push.toFixed(4)})`;
  play(s.hA, t, T.sellHeadA, T.sellHeadAOut, { style: 'drop', stagger: 0.12 });
  play(s.hB, t, T.payIn, 99, { style: 'drop', stagger: 0.1 });
  op(s.rail, sm(6.25, 6.5, t) * (1 - sm(7.75, 7.95, t)));
  // cards: enter from the right edge, decelerate onto the laser on the beat, beep, then drop into their invoice row
  s.cards.forEach(({ n, nm, pr, ok, i }) => {
    const sc = T.scans[i], inU = ramp(t, sc - 0.36, sc), x = lerp(1420, 540, oE(inU));
    const dropU = ioC(ramp(t, sc + 0.12, sc + 0.42)), y = lerp(640, 930 + i * 70, dropU), sz = lerp(1, 0.55, dropU);
    const on = t > sc - 0.36 && dropU < 1;
    vis(n, on); if (!on) return;
    place(n, x, y, CARD_W, CARD_H, 26);
    n.style.transform = `scale(${sz.toFixed(4)}) rotate(${((1 - oE(inU)) * -4).toFixed(2)}deg)`;
    n.style.opacity = (1 - sm(0.6, 1, dropU)).toFixed(3);
    setBlur(n, (1 - oE(inU)) * 8 + dropU * 4);
    op(ok, Math.exp(-Math.max(0, t - sc) / 0.12) * (t >= sc ? 1 : 0));
    const to = sm(0.55, 0.9, inU) * (1 - sm(0.05, 0.35, dropU)); [nm, pr].forEach((L) => { L.line.style.display = 'flex'; L.words.forEach((w) => { w.style.opacity = to.toFixed(3); }); });
  });
  // invoice: unrolls down from its header, rows land as each card drops in, the total rolls up
  const recU = oE(ramp(t, T.receipt, T.receipt + 0.5)), recOut = sm(T.toTotal - 0.05, T.toTotal + 0.2, t);
  const recH = lerp(90, 470, recU), recOn = t > T.receipt && recOut < 1;
  vis(s.rec, recOn); if (recOn) { place(s.rec, RCX, 790 + recH / 2, RW, recH, 30); op(s.rec, (1 - recOut) * clamp(recU * 3)); s.rec.style.transform = `scale(${lerp(1, 0.92, recOut).toFixed(4)})`; }
  play(s.recT, t, T.receipt + 0.05, T.toTotal - 0.08, { style: 'rise', dy: 16, outDur: 0.18 });
  play(s.tag, t, T.receipt + 0.12, T.toTotal - 0.08, { style: 'rise', dy: 16, outDur: 0.18 });
  place(s.tagBox, 300, 846, 196, 54, 27); op(s.tagBox, sm(T.receipt + 0.12, T.receipt + 0.35, t) * (1 - sm(T.toTotal - 0.08, T.toTotal + 0.1, t)));
  s.rows.forEach((r, i) => { const a = T.scans[i] + 0.3; play(r.nm, t, a, T.toTotal - 0.1, { style: 'rise', dy: 18, outDur: 0.18 }); play(r.pr, t, a + 0.04, T.toTotal - 0.1, { style: 'rise', dy: 18, outDur: 0.18 }); });
  place(s.rule, RCX, 1118, RW - 80, 2); op(s.rule, sm(6.6, 6.9, t) * (1 - recOut));
  let run = 0; ITEMS.forEach((it, i) => { run += it.price * oC(ramp(t, T.scans[i] + 0.3, T.scans[i] + 0.62)); });
  setText(s.totN, fmt(run));
  play(s.totL, t, 6.62, T.toTotal - 0.1, { style: 'rise', dy: 16, outDur: 0.18 });
  play(s.totN, t, 6.62, T.toTotal - 0.1, { style: 'rise', dy: 16, outDur: 0.18 });
  // payment chips burst out of the copper total, one per sixteenth
  s.chips.forEach(({ n, L, ic, i }) => {
    const a = T.chipsIn + i * 0.06, p = spr(t, a, 0.45, 0.22), on = t > a;
    vis(n, on); if (!on) return;
    const x = lerp(540, payX(i), clamp(p, 0, 1.2)), y = lerp(712, payY(i), p);
    place(n, x, y, PW, PH, 22); n.style.transform = `scale(${lerp(0.3, 1, clamp(p, 0, 1.15)).toFixed(4)})`; op(n, p * 2);
    const chosen = i === 0 && t > T.tapCash;
    n.style.background = chosen ? C.copperSoft : C.white;
    L.line.style.display = 'flex'; L.words.forEach((w) => { w.style.opacity = String(clamp((t - a - 0.22) * 6)); w.style.color = chosen ? C.copperD : C.navy; });
    ic.style.stroke = chosen ? C.copperD : C.navy;
  });
  const sp = spr(t, T.tapCash, 0.35, 0.3);
  vis(s.sel, t > T.tapCash); if (t > T.tapCash) { place(s.sel, payX(0), payY(0), PW + 14 + (1 - clamp(sp)) * 40, PH + 14 + (1 - clamp(sp)) * 30, 28); op(s.sel, clamp(sp * 2)); }
  const cp = spr(t, T.change, 0.45, 0.25);
  vis(s.chg, t > T.change); if (t > T.change) { place(s.chg, 540, 1035, 916, 106, 26); s.chg.style.transform = `scale(${lerp(0.8, 1, clamp(cp, 0, 1.1)).toFixed(4)})`; op(s.chg, cp * 2); }
  play(s.chgL, t, T.change + 0.05, 99, { style: 'rise', dy: 20 });
  play(s.chgN, t, T.change + 0.08, 99, { style: 'slam' });
  play(s.paidL, t, T.change + 0.25, T.toButton, { style: 'rise', dy: 12, outDur: 0.2 });
} });

// =====================================================================================================
// STOCK 9.9–14.3 — night shelves: «كل جهاز مكانه معروف». Showroom (left) · store (right); transfer; serial; count.
const SLOTS = [ // x, glyph, code, count, side, land
  { x: 915, g: 'fridge', code: 'M-A', n: 4, land: T.boxes[0] }, { x: 775, g: 'stove', code: 'M-C', n: 4, land: T.boxes[1] },
  { x: 635, g: 'ac', code: 'M-D', n: 2, land: T.boxes[2] }, { x: 305, g: 'blender', code: 'G-2', n: 6, land: T.boxes[3] },
  { x: 165, g: 'washer', code: 'C-1', n: 2, land: T.boxes[4] },
];
const BW = 124, BH = 150, PLANK = 960, MOVE = { from: 915, to: 445 };
function makeBox(parent, g, code, cnt) {
  const n = div(parent, { width: px(BW), height: px(BH), borderRadius: '20px', background: `linear-gradient(180deg, ${C.steel}, ${C.night3})`, border: '2px solid rgba(243,233,216,0.16)', boxShadow: '0 22px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)', transformOrigin: '50% 100%' });
  icon(n, g, 76, C.cream, 1.5, { left: px((BW - 76) / 2), top: '30px' });
  const tagL = words(parent, code, { size: 30, weight: 600, color: C.copperL, cx: 0, cy: 0, width: 120, font: UI, dir: 'ltr', lh: 1.2 });
  const badge = div(parent, { width: '50px', height: '50px', borderRadius: '25px', background: C.ok, boxShadow: '0 6px 14px rgba(0,0,0,0.35)' });
  const num = words(badge, String(cnt), { size: 28, weight: 700, color: C.white, cx: 25, cy: 25, width: 50, font: UI, dir: 'ltr', lh: 1.2 });
  const tick = icon(badge, 'check', 28, C.white, 2.6, { left: '11px', top: '11px', opacity: '0' });
  return { n, tagL, badge, num, tick };
}
SC.push({ id: 'stock', a: T.blind, b: 14.3, z: 14, init(root) {
  full(root, { background: `radial-gradient(ellipse 95% 60% at 50% 55%, ${C.night3} 0%, ${C.night2} 50%, ${C.night} 100%)` });
  const glow = div(root, { width: '1200px', height: '420px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(224,138,76,0.22), rgba(224,138,76,0))' });
  const cam = div(root, { width: px(W), height: px(H), transformOrigin: '540px 300px' });
  const back = div(cam, { width: px(W), height: px(H) });               // the second shelf (decorative, parallax)
  const plank2 = div(back, { borderRadius: '12px', background: `linear-gradient(180deg, ${C.steel}, ${C.night3})`, boxShadow: '0 0 30px rgba(224,138,76,0.18)' });
  const ghosts = [150, 300, 450, 630, 780, 930].map((x, i) => { const n = div(back, { width: px(BW), height: px(BH), borderRadius: '20px', background: C.night3, border: '2px solid rgba(243,233,216,0.08)' }); icon(n, ['ac', 'fridge', 'stove', 'washer', 'blender', 'fridge'][i], 70, 'rgba(243,233,216,0.35)', 1.5, { left: px((BW - 70) / 2), top: '34px' }); return { n, x }; });
  const h1 = words(cam, 'كل جهاز', { size: 120, weight: 800, color: C.cream, cy: 372, lh: 1.12 });
  const h2 = words(cam, 'مكانه معروف', { size: 120, weight: 800, color: C.copperL, cy: 516, lh: 1.12 });
  const sub = words(cam, 'مخزون وجرد وضمان بالسيريال', { size: 46, weight: 500, color: 'rgba(243,233,216,0.8)', cy: 636, font: UI, lh: 1.2 });
  const show = words(cam, 'المعرض', { size: 38, weight: 600, color: 'rgba(243,233,216,0.66)', cx: 305, cy: 722, width: 300, font: UI });
  const store = words(cam, 'المخزن', { size: 38, weight: 600, color: 'rgba(243,233,216,0.66)', cx: 775, cy: 722, width: 300, font: UI });
  const icS = icon(cam, 'store', 36, 'rgba(243,233,216,0.66)', 1.8); const icW = icon(cam, 'warehouse', 36, 'rgba(243,233,216,0.66)', 1.8);
  const divider = div(cam, { width: '2px', background: 'linear-gradient(180deg, rgba(243,233,216,0), rgba(243,233,216,0.22))' });
  const slot = div(cam, { width: px(BW), height: px(BH), borderRadius: '20px', border: '2.5px dashed rgba(243,233,216,0.28)' });
  const boxes = SLOTS.map((sl) => ({ ...makeBox(cam, sl.g, sl.code, sl.n), sl }));
  const moved = makeBox(cam, 'fridge', 'A-1', 1);
  const arc = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, cam);
  const arcP = el('path', { d: `M ${MOVE.from} 800 Q 685 560 ${MOVE.to} 800`, fill: 'none', stroke: C.copperL, 'stroke-width': 4, 'stroke-dasharray': '2 14', 'stroke-linecap': 'round' }, arc);
  const mv = div(cam, { background: C.copper, borderRadius: '999px', boxShadow: '0 10px 24px rgba(0,0,0,0.4)' });
  const mvIc = icon(mv, 'swap', 34, C.white, 2); const mvL = words(mv, 'نقل بضاعة', { size: 34, weight: 600, color: C.white, cx: 106, cy: 33, width: 170, font: UI, lh: 1.2 });
  const scanR = div(cam, { border: `4px solid ${C.copperL}`, borderRadius: '24px', boxShadow: '0 0 24px rgba(224,138,76,0.6)' });
  const sn = div(cam, { background: C.cream, borderRadius: '18px', boxShadow: '0 14px 28px rgba(0,0,0,0.4)' });
  const snBar = icon(sn, 'barcode', 34, C.navy, 2, { left: '16px', top: '12px' });
  const snL = words(sn, 'SN 00008', { size: 30, weight: 700, color: C.navy, cx: 128, cy: 29, width: 150, font: UI, dir: 'ltr', lh: 1.2 });
  const war = div(cam, { background: C.ok, borderRadius: '999px', boxShadow: '0 10px 24px rgba(0,0,0,0.4)' });
  const warIc = icon(war, 'shield', 36, C.white, 2); const warL = words(war, 'ضمان', { size: 34, weight: 700, color: C.white, cx: 58, cy: 32, width: 90, font: UI, lh: 1.2 });
  S.stock = { root, glow, cam, back, plank2, ghosts, h1, h2, sub, show, store, icS, icW, divider, slot, boxes, moved, arc, arcP, mv, mvIc, mvL, scanR, sn, snBar, snL, war, warIc, warL };
}, render(t) {
  const s = S.stock;
  hideLines(s.cam, t > 14.02);
  const push = 1 + 0.05 * ramp(t, 10, 14);
  s.cam.style.transform = `scale(${push.toFixed(4)})`;
  s.back.style.transform = `translateY(${(30 - 60 * ramp(t, 10, 14)).toFixed(1)}px)`;
  place(s.glow, 540, PLANK + 10, 1200, 420); op(s.glow, sm(10.1, 10.6, t));
  place(s.plank2, 540, 1228, 940, 22, 11); op(s.plank2, 0.55 * sm(10.4, 10.9, t));
  s.ghosts.forEach(({ n, x }, i) => { place(n, x, 1228 - 11 - BH / 2, BW, BH, 20); op(n, 0.32 * sm(10.6 + i * 0.05, 11.0 + i * 0.05, t)); });
  play(s.h1, t, 10.12, 99, { style: 'flip', stagger: 0.1 });
  play(s.h2, t, 10.3, 99, { style: 'flip', stagger: 0.1 });
  play(s.sub, t, 11.0, 99, { style: 'rise', dy: 24, stagger: 0.05 });
  const labOut = sm(11.85, 12.0, t);
  play(s.show, t, 10.6, 11.85, { style: 'rise', dy: 16 }); play(s.store, t, 10.5, 11.85, { style: 'rise', dy: 16 });
  [[s.icS, 305 + 92], [s.icW, 775 + 92]].forEach(([n, x]) => { n.style.left = px(x - 18); n.style.top = px(722 - 18); op(n, sm(10.5, 10.8, t) * (1 - labOut)); });
  place(s.divider, 540, 860, 2, 180); op(s.divider, sm(10.4, 10.8, t));
  place(s.slot, MOVE.to, PLANK - 12 - BH / 2, BW, BH, 20); op(s.slot, sm(11.2, 11.5, t) * (1 - sm(12.3, 12.4, t)));
  const drawBox = (b, x, land, cnt, tagOn = true, alpha = 1) => {
    const u = ramp(t, land - 0.22, land), y = PLANK - 12 - BH / 2 - 380 * (1 - u * u), tau = t - land;
    const sq = tau > 0 ? 0.16 * Math.exp(-tau / 0.08) * Math.cos(tau * 36) : 0, on = t > land - 0.22;
    vis(b.n, on); vis(b.badge, on);
    if (!on) { b.tagL.line.style.display = 'none'; return; }
    place(b.n, x, y, BW, BH, 20); b.n.style.transform = `scale(${(1 + sq * 0.7).toFixed(4)}, ${(1 - sq).toFixed(4)})`; op(b.n, alpha); setBlur(b.n, (1 - u) * 6);
    const bp = spr(t, land + 0.12, 0.35, 0.4);
    place(b.badge, x + BW / 2 - 8, y - BH / 2 + 4, 50, 50, 25); b.badge.style.transform = `scale(${clamp(bp, 0, 1.3).toFixed(3)})`; op(b.badge, alpha);
    setText(b.num, String(cnt));
    // count (جرد): each badge flashes a tick in turn
    const ck = sm(T.count + x / 4000, T.count + 0.12 + x / 4000, t) * (1 - sm(T.count + 0.55 + x / 4000, T.count + 0.7 + x / 4000, t));
    b.num.words[0].style.opacity = (1 - ck).toFixed(3); b.tick.style.opacity = ck.toFixed(3);
    b.tagL.line.style.left = px(x - 60); b.tagL.line.style.top = px(y - BH / 2 - 44);
    play(b.tagL, t, land + 0.1, tagOn ? 99 : -1, { style: 'rise', dy: 12 }); if (alpha < 1) b.tagL.words.forEach((w) => { w.style.opacity = String(Math.min(+w.style.opacity, alpha)); });
  };
  s.boxes.forEach((b) => drawBox(b, b.sl.x, b.sl.land, b.sl.g === 'fridge' && t > T.transfer + 0.25 ? 3 : b.sl.n));
  // transfer: one fridge leaves the store, arcs over the divider and lands in the showroom slot as A-1
  const mu = ioC(ramp(t, T.transfer, T.transfer + 0.5)), mOn = t > T.transfer;
  const ax = MOVE.from, bx = MOVE.to, qx = 685, qy = 560, y0 = PLANK - 12 - BH / 2;
  const mx = (1 - mu) ** 2 * ax + 2 * (1 - mu) * mu * qx + mu * mu * bx, my = (1 - mu) ** 2 * y0 + 2 * (1 - mu) * mu * (qy + 40) + mu * mu * y0;
  if (mOn) {
    const m = s.moved; vis(m.n, true); vis(m.badge, mu > 0.98);
    place(m.n, mx, my, BW, BH, 20); m.n.style.transform = `rotate(${(Math.sin(Math.PI * mu) * -10).toFixed(2)}deg) scale(${(1 + 0.08 * Math.sin(Math.PI * mu)).toFixed(4)})`; setBlur(m.n, Math.sin(Math.PI * mu) * 3);
    place(m.badge, mx + BW / 2 - 8, my - BH / 2 + 4, 50, 50, 25); m.badge.style.transform = `scale(${clamp(spr(t, T.transfer + 0.52, 0.35, 0.4), 0, 1.3).toFixed(3)})`;
    const ck = sm(T.count + bx / 4000, T.count + 0.12 + bx / 4000, t) * (1 - sm(T.count + 0.55 + bx / 4000, T.count + 0.7 + bx / 4000, t));
    m.num.words[0].style.opacity = (1 - ck).toFixed(3); m.tick.style.opacity = ck.toFixed(3);
    m.tagL.line.style.left = px(bx - 60); m.tagL.line.style.top = px(y0 - BH / 2 - 44);
    play(m.tagL, t, T.transfer + 0.5, 99, { style: 'rise', dy: 12 });
  } else { vis(s.moved.n, false); vis(s.moved.badge, false); s.moved.tagL.line.style.display = 'none'; }
  const ad = clamp(ramp(t, T.transfer - 0.1, T.transfer + 0.3)), aOut = sm(T.transfer + 0.55, T.transfer + 0.75, t);
  s.arcP.setAttribute('opacity', (ad * (1 - aOut)).toFixed(3)); s.arcP.setAttribute('stroke-dashoffset', (-t * 60).toFixed(1));
  const mp = spr(t, T.transfer - 0.05, 0.4, 0.3), mvOn = t > T.transfer - 0.05 && t < T.serial - 0.1;
  vis(s.mv, mvOn); if (mvOn) { place(s.mv, 540, 1060, 256, 66, 33); s.mv.style.transform = `translateY(${((1 - clamp(mp)) * 30).toFixed(1)}px) scale(${clamp(mp, 0, 1.2).toFixed(3)})`; op(s.mv, clamp(mp * 2) * (1 - sm(T.serial - 0.3, T.serial - 0.12, t))); s.mvIc.style.left = '202px'; s.mvIc.style.top = '16px'; s.mvL.line.style.display = 'flex'; }
  // serial: a copper scan frame closes on the moved fridge; the serial label and the warranty shield pop above it
  const su = spr(t, T.serial, 0.4, 0.2), sOn = t > T.serial && t < T.serial + 0.55;
  vis(s.scanR, sOn); if (sOn) { const k = lerp(1.6, 1.08, clamp(su)); place(s.scanR, bx, y0, BW * k, BH * k, 24); op(s.scanR, 1 - sm(T.serial + 0.35, T.serial + 0.55, t)); }
  const sp = spr(t, T.serial + 0.12, 0.42, 0.3), wp = spr(t, T.serial + 0.3, 0.42, 0.35);
  vis(s.sn, t > T.serial + 0.12); if (t > T.serial + 0.12) { place(s.sn, bx - 98, 722, 220, 58, 18); s.sn.style.transform = `scale(${clamp(sp, 0, 1.2).toFixed(3)})`; op(s.sn, sp * 2); s.snL.line.style.display = 'flex'; }
  vis(s.war, t > T.serial + 0.3); if (t > T.serial + 0.3) { place(s.war, bx + 98, 722, 160, 64, 32); s.war.style.transform = `scale(${clamp(wp, 0, 1.25).toFixed(3)})`; op(s.war, wp * 2); s.warIc.style.left = '108px'; s.warIc.style.top = '14px'; s.warL.line.style.display = 'flex'; }
} });

// =====================================================================================================
// INSTALMENTS 13.85–16.3 — copper world (circle wipe out of the warranty shield): «تقسيط وآجل», four paid cells.
const CELLX = (j) => 890 - j * 140, CELLY = 868, CELLD = 104;
SC.push({ id: 'inst', a: T.copper[0], b: 16.3, z: 15, init(root) {
  full(root, { background: `linear-gradient(160deg, ${C.copperL} 0%, ${C.copper} 45%, ${C.copperD} 100%)` });
  const stripes = full(root, { opacity: '0.12', backgroundImage: 'repeating-linear-gradient(-30deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 44px)' });
  const h = words(root, 'تقسيط وآجل', { size: 128, weight: 800, color: C.navy, cy: 450, lh: 1.12 });
  const card = div(root, { background: C.navy, borderRadius: '40px', boxShadow: '0 40px 80px rgba(60,20,0,0.35)' });
  const ttl = words(root, 'جدول الأقساط', { size: 40, weight: 600, color: 'rgba(243,233,216,0.85)', cx: 605, cy: 752, width: 520, font: UI, align: 'right' });
  const ttlIc = icon(root, 'instal', 40, C.copperL, 1.9);
  const track = div(root, { background: 'rgba(243,233,216,0.12)', borderRadius: '11px' });
  const done = words(root, 'اتدفع 4 من 6', { size: 40, weight: 600, color: C.cream, cx: 540, cy: 1068, width: 600, font: UI });
  S.inst = { root, stripes, h, card, ttl, ttlIc, track, done };
}, render(t) {
  const s = S.inst;
  const cu = ramp(t, T.copper[0], T.copper[1]), r = lerp(0, 2300, 1 - Math.pow(1 - cu, 2.4));
  s.root.style.clipPath = cu < 1 ? `circle(${px(r)} at ${MOVE.to + 98}px 722px)` : 'none';
  const lv = ramp(t, T.rise[0], T.rise[1]);
  s.stripes.style.backgroundPosition = `${(t * 40).toFixed(1)}px 0px`;
  play(s.h, t, 13.98, 15.8, { style: 'slam', stagger: 0.1 });
  const cp = spr(t, 14.2, 0.5, 0.18), cOut = sm(15.85, 16.05, t);
  place(s.card, 540, 900, 940, 440, 40); s.card.style.transform = `translateY(${((1 - clamp(cp)) * 120).toFixed(1)}px)`; op(s.card, clamp(cp * 2) * (1 - cOut));
  play(s.ttl, t, 14.3, 15.8, { style: 'rise', dy: 16 }); s.ttlIc.style.left = px(910 - 20); s.ttlIc.style.top = px(752 - 20); op(s.ttlIc, sm(14.3, 14.5, t) * (1 - cOut));
  place(s.track, 540, 1010, 800, 22, 11); op(s.track, sm(14.25, 14.45, t) * (1 - cOut));
  play(s.done, t, 15.3, 15.8, { style: 'rise', dy: 16 });
  void lv;
} });

// =====================================================================================================
// PILLS 14.2–20.0 — six instalment cells that stand up as the first six bars of the sales chart (one morphing set).
SC.push({ id: 'pills', a: 14.2, b: 19.95, z: 26, init(root) {
  const cells = [0, 1, 2, 3, 4, 5].map((j) => {
    const n = div(root, { overflow: 'hidden' });
    const num = words(n, String(j + 1), { size: 44, weight: 700, color: C.cream, cx: CELLD / 2, cy: CELLD / 2, width: CELLD, dir: 'ltr', lh: 1.1 });
    const tick = icon(n, 'check', 50, C.white, 2.8, { left: px((CELLD - 50) / 2), top: px((CELLD - 50) / 2) });
    const ring = div(root, { border: `4px solid ${C.copperL}`, borderRadius: '50%' });
    return { n, num, tick, ring, j };
  });
  S.pills = { root, cells };
}, render(t) {
  const s = S.pills;
  s.cells.forEach(({ n, num, tick, ring, j }) => {
    const appear = spr(t, 14.35 + j * 0.05, 0.45, 0.3), paid = j < 4 ? sm(T.cells[j], T.cells[j] + 0.08, t) : 0;
    const bi = 5 - j, m = spr(t, T.bars + bi * 0.04, 0.55, 0.16);               // circle → bar (no crossing paths)
    const cx = lerp(CELLX(j), barX(bi), m), h = lerp(CELLD, BARH[bi], m), w = lerp(CELLD, 78, m);
    const cy = lerp(CELLY, BASE - BARH[bi] / 2, m), rr = lerp(CELLD / 2, 14, m);
    const grow = clamp(spr(t, T.bars + 0.25 + bi * 0.05, 0.6, 0.2), 0, 1.3), barH = h * lerp(1, 1, grow);
    place(n, cx, cy, w * clamp(appear, 0, 1.2), barH * clamp(appear, 0, 1.2), rr);
    const fill = paid > 0 && m < 0.5 ? mixHex(C.night3, C.copper, paid) : m > 0 ? mixHex(paid > 0.5 ? C.copper : C.night3, C.steel, m) : C.night3;
    n.style.background = fill; n.style.border = m < 0.5 ? `3px solid rgba(243,233,216,${(0.25 * (1 - m * 2)).toFixed(3)})` : 'none';
    n.style.boxShadow = m > 0.5 ? 'inset 0 6px 0 rgba(255,255,255,0.08)' : 'none';
    op(n, clamp(appear * 2) * (1 - sm(T.numOut, T.gather + 0.05, t)));
    const txtOn = m < 0.15;
    num.line.style.display = txtOn ? 'flex' : 'none'; num.words[0].style.opacity = ((1 - paid) * clamp(appear * 2) * (1 - m * 6)).toFixed(3);
    tick.style.opacity = (paid * (1 - clamp(m * 6))).toFixed(3); tick.style.transform = `scale(${clamp(spr(t, T.cells[j] || 99, 0.35, 0.45), 0, 1.3).toFixed(3)})`;
    // the next one due breathes
    const due = j === 4 && t > T.due && m < 0.05, pu = ((t - T.due) % 0.5) / 0.5;
    vis(ring, due); if (due) { place(ring, cx, cy, CELLD + 20 + 50 * pu, CELLD + 20 + 50 * pu); op(ring, 0.9 * (1 - pu)); }
  });
} });

// =====================================================================================================
// NUMBERS 15.85–19.95 — night rises like a level over the copper: «أرقام واضحة وقرار أذكى», KPI, trend line, the owner's eye.
SC.push({ id: 'numbers', a: T.rise[0], b: 19.95, z: 16, init(root) {
  full(root, { background: `radial-gradient(ellipse 90% 60% at 50% 48%, ${C.night3} 0%, ${C.navy} 48%, ${C.night} 100%)` });
  const glow = div(root, { width: '1100px', height: '600px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(224,138,76,0.2), rgba(224,138,76,0))' });
  const h1 = words(root, 'أرقام واضحة', { size: 120, weight: 800, color: C.cream, cy: 372, lh: 1.12 });
  const h2 = words(root, 'وقرار أذكى', { size: 120, weight: 800, color: C.copperL, cy: 516, lh: 1.12 });
  const kl = words(root, 'صافي مبيعات النهارده', { size: 38, weight: 500, color: 'rgba(243,233,216,0.75)', cy: 640, font: UI, lh: 1.2 });
  const kn = words(root, '0 ج.م', { size: 92, weight: 800, color: C.cream, cy: 728, lh: 1.1 });
  const kt = words(root, 'بيانات محل تدريب', { size: 30, weight: 500, color: 'rgba(224,138,76,0.95)', cy: 808, font: UI, lh: 1.2 });
  const ins = div(root, { background: 'rgba(243,233,216,0.08)', border: '1.5px solid rgba(243,233,216,0.18)', borderRadius: '999px' });
  const insIc = icon(root, 'eye', 40, C.copperL, 1.9);
  const insL = words(root, '3 حاجة محتاجة نظرة منك', { size: 36, weight: 600, color: C.cream, cx: 510, cy: 890, width: 560, font: UI, lh: 1.2 });
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, root);
  const defs = el('defs', {}, svg);
  const gA = el('linearGradient', { id: 'f12area', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: '0', 'stop-color': C.copperL, 'stop-opacity': '0.32' }, gA); el('stop', { offset: '1', 'stop-color': C.copperL, 'stop-opacity': '0' }, gA);
  const area = el('path', { fill: 'url(#f12area)' }, svg);
  const lineG = el('path', { fill: 'none', stroke: C.copperL, 'stroke-width': 18, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '0.18' }, svg);
  const line = el('path', { fill: 'none', stroke: C.hot, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  const head = el('circle', { r: 11, fill: C.hot }, svg), headR = el('circle', { r: 26, fill: 'none', stroke: C.hot, 'stroke-width': 3 }, svg);
  const base = div(root, { height: '2px', background: 'rgba(243,233,216,0.2)' });
  const sweep = div(root, { left: '0', top: '820px', width: '260px', height: '520px', background: 'linear-gradient(90deg, rgba(255,176,112,0), rgba(255,176,112,0.16), rgba(255,176,112,0))', zIndex: '5' });
  S.numbers = { root, sweep, glow, h1, h2, kl, kn, kt, ins, insIc, insL, area, lineG, line, head, headR, base };
}, render(t) {
  const s = S.numbers;
  // the rising level: a wavy edge climbs from the bottom and covers the copper world
  const lv = ioC(ramp(t, T.rise[0], T.rise[1])), yEdge = lerp(H + 60, -80, lv);
  if (lv < 1) { let d = `M -20 ${H + 20} L -20 ${yEdge.toFixed(1)}`; for (let x = -20; x <= W + 20; x += 30) d += ` L ${x} ${(yEdge + 34 * Math.sin(x * 0.012 + t * 9) * Math.sin(Math.PI * lv)).toFixed(1)}`; d += ` L ${W + 20} ${H + 20} Z`; s.root.style.clipPath = `path('${d}')`; }
  else s.root.style.clipPath = 'none';
  const out = sm(T.numOut, T.gather + 0.05, t);
  const sw = ramp(t, 18.55, 19.7); s.sweep.style.transform = `translateX(${lerp(-400, 1300, ioC(sw)).toFixed(1)}px) rotate(14deg)`; op(s.sweep, sw > 0 && sw < 1 ? 0.9 : 0);
  place(s.glow, 540, 1080, 1100, 600); op(s.glow, sm(16.2, 16.8, t) * (1 - out));
  play(s.h1, t, 16.15, T.numOut, { style: 'drop', stagger: 0.1, outDur: 0.2 });
  play(s.h2, t, 16.35, T.numOut, { style: 'rise', stagger: 0.1, outDur: 0.2 });
  play(s.kl, t, T.kpi, T.numOut, { style: 'rise', dy: 16, outDur: 0.2 });
  play(s.kn, t, T.kpi + 0.05, T.numOut, { style: 'blur', outDur: 0.2 });
  setText(s.kn, fmt(104693 * oC(ramp(t, T.kpi + 0.05, T.kpi + 1.1))));
  play(s.kt, t, T.kpi + 0.4, T.numOut, { style: 'rise', dy: 10, outDur: 0.2 });
  const ip = spr(t, T.insight, 0.45, 0.25), iOn = t > T.insight;
  vis(s.ins, iOn); if (iOn) { place(s.ins, 540, 890, 640, 66, 33); s.ins.style.transform = `scale(${clamp(ip, 0, 1.15).toFixed(3)})`; op(s.ins, clamp(ip * 2) * (1 - out)); }
  s.insIc.style.left = px(540 + 320 - 64); s.insIc.style.top = px(890 - 20); op(s.insIc, clamp(ip * 2) * (1 - out) * (iOn ? 1 : 0));
  play(s.insL, t, T.insight + 0.08, T.numOut, { style: 'rise', dy: 12, outDur: 0.2 });
  place(s.base, 540, BASE + 1, 900, 2); op(s.base, sm(16.1, 16.4, t) * (1 - out));
  // trend line over the bar tops, drawn left → right with a hot head
  const pts = BARH.map((h, i) => [barX(i), BASE - h - 34]);
  const u = ioC(ramp(t, T.line[0], T.line[1])), seg = u * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(seg)), f = seg - k;
  const vis2 = pts.slice(0, k + 1); const hx = lerp(pts[k][0], pts[k + 1][0], f), hy = lerp(pts[k][1], pts[k + 1][1], f); vis2.push([hx, hy]);
  const d = vis2.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const lo = (t > T.line[0] ? 1 : 0) * (1 - out);
  [s.line, s.lineG].forEach((p) => { p.setAttribute('d', d); p.setAttribute('opacity', String(p === s.line ? lo : 0.18 * lo)); });
  s.area.setAttribute('d', `${d} L ${hx.toFixed(1)} ${BASE} L ${pts[0][0]} ${BASE} Z`); s.area.setAttribute('opacity', String(lo));
  s.head.setAttribute('cx', hx.toFixed(1)); s.head.setAttribute('cy', hy.toFixed(1)); s.head.setAttribute('opacity', String(lo));
  const pr = ((t - T.line[0]) % 0.5) / 0.5;
  s.headR.setAttribute('cx', hx.toFixed(1)); s.headR.setAttribute('cy', hy.toFixed(1)); s.headR.setAttribute('r', (14 + 26 * pr).toFixed(1)); s.headR.setAttribute('opacity', (lo * (1 - pr) * 0.8).toFixed(3));
} });

// =====================================================================================================
// PAYOFF 19.85–25 — ivory; the night gathers into the navy tile = the whole logo. Name, tagline, offline, CTA, hold.
SC.push({ id: 'payoff', a: T.gather, b: 25.1, z: 12, init(root) {
  full(root, { background: `radial-gradient(ellipse 90% 60% at 50% 35%, #fbfaf6 0%, ${C.ivory} 55%, #e9e3d6 100%)` });
  const lines = full(root, { opacity: '0.55', backgroundImage: 'repeating-linear-gradient(0deg, rgba(19,33,60,0.045) 0 1.5px, transparent 1.5px 96px)' });
  const halo = div(root, { width: '820px', height: '820px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(200,116,60,0.2), rgba(200,116,60,0))' });
  const ring = div(root, { border: `4px solid ${C.copper}`, borderRadius: '30%' });
  const cam = div(root, { width: px(W), height: px(H), transformOrigin: '540px 760px' });
  const badge = div(cam, { border: `2px solid rgba(19,33,60,0.18)`, borderRadius: '999px', background: 'rgba(255,255,255,0.6)' });
  const bIc = icon(cam, 'wifiOff', 38, C.copper, 2);
  const bL = words(cam, 'يشتغل من غير إنترنت', { size: 38, weight: 600, color: C.navy, cx: 515, cy: 322, width: 460, font: UI, lh: 1.2 });
  const word = words(cam, 'ميزان', { size: 200, weight: 800, color: C.navy, cy: 832, lh: 1.1 });
  const latin = words(cam, 'MIZAN', { size: 40, weight: 600, color: C.copper, cy: 972, dir: 'ltr', tr: 0.5, lh: 1.1 });
  const tag = words(cam, 'بيع بسهولة.. وحاسب بثقة', { size: 64, weight: 700, color: C.navy, cy: 1062, lh: 1.2, accent: { 2: C.copper, 3: C.copper } });
  const cta = div(cam, { background: `linear-gradient(180deg, ${C.copperL}, ${C.copper})`, borderRadius: '999px', boxShadow: '0 24px 44px rgba(164,83,28,0.35), inset 0 1px 0 rgba(255,255,255,0.3)', overflow: 'hidden' });
  const shine = div(cta, { width: '120px', height: '200px', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))' });
  const ctaIc = icon(cam, 'message', 44, C.white, 2.1);
  const ctaL = words(cam, 'راسلني واحجز عرض البرنامج', { size: 44, weight: 700, color: C.white, cx: 510, cy: 1186, width: 640, font: UI, lh: 1.2 });
  S.payoff = { root, lines, halo, ring, cam, badge, bIc, bL, word, latin, tag, cta, shine, ctaIc, ctaL };
}, render(t) {
  const s = S.payoff;
  s.cam.style.transform = `scale(${(1 + 0.03 * ramp(t, 20.5, 25)).toFixed(4)})`;
  place(s.halo, M3[0], M3[1], 820, 820); op(s.halo, sm(20.2, 20.8, t));
  const ru = ramp(t, T.logo + 0.18, T.logo + 0.95);
  place(s.ring, M3[0], M3[1], 260 + 520 * oE(ru), 260 + 520 * oE(ru)); op(s.ring, ru > 0 && ru < 1 ? 0.7 * (1 - ru) : 0);
  const bp = spr(t, T.badge, 0.45, 0.25), bOn = t > T.badge;
  vis(s.badge, bOn); if (bOn) { place(s.badge, 540, 322, 560, 76, 38); s.badge.style.transform = `scale(${clamp(bp, 0, 1.15).toFixed(3)})`; op(s.badge, clamp(bp * 2)); }
  s.bIc.style.left = px(540 + 280 - 70); s.bIc.style.top = px(322 - 19); op(s.bIc, bOn ? clamp(bp * 2) : 0);
  play(s.bL, t, T.badge + 0.06, 99, { style: 'rise', dy: 12 });
  play(s.word, t, T.word2, 99, { style: 'blur', dur: 0.5 });
  play(s.latin, t, T.latin, 99, { style: 'rise', dy: 16 });
  play(s.tag, t, T.tag, 99, { style: 'rise', stagger: 0.12, dy: 30 });
  const cp = spr(t, T.cta, 0.5, 0.28), cOn = t > T.cta;
  vis(s.cta, cOn); if (cOn) { place(s.cta, 540, 1186, 760, 110, 55); s.cta.style.transform = `scale(${lerp(0.6, 1, clamp(cp, 0, 1.12)).toFixed(4)})`; op(s.cta, clamp(cp * 2)); }
  s.ctaIc.style.left = px(540 + 380 - 92); s.ctaIc.style.top = px(1186 - 22); op(s.ctaIc, cOn ? clamp(cp * 2) : 0);
  play(s.ctaL, t, T.cta + 0.1, 99, { style: 'rise', dy: 14, stagger: 0.05 });
  const sh = ramp(t, T.shine, T.shine + 0.7); s.shine.style.transform = `translate(${lerp(-160, 820, ioC(sh)).toFixed(1)}px, -40px) rotate(18deg)`; op(s.shine, sh > 0 && sh < 1 ? 1 : 0);
  // a heartbeat on the CTA in the hold, so the last second is alive but calm
  const hb = t > 23.9 ? 0.025 * Math.max(0, Math.sin(Math.PI * (((t - 23.9) % 0.5) / 0.5))) ** 6 : 0;
  if (cOn) s.cta.style.transform = `scale(${(lerp(0.6, 1, clamp(cp, 0, 1.12)) + hb).toFixed(4)})`;
} });

// =====================================================================================================
// MARK + HERO + CURSOR + FLASH — global layers above the scenes.
function initGlobal(root) {
  const tile = div(root, { zIndex: '30' });
  const top = div(root, { zIndex: '31' });
  const tri = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '31' } }, root);
  const triP = el('path', { 'stroke-linejoin': 'round' }, tri);
  const hero = div(root, { zIndex: '32', overflow: 'hidden' });
  const hTot = div(hero, { width: '100%', height: '100%' });
  const hTotL = words(hTot, 'الإجمالي', { size: 44, weight: 700, color: C.white, cx: 0, cy: 0, width: 300, font: UI, align: 'right', lh: 1.2 });
  const hTotN = words(hTot, `${fmt(TOTAL)} ج.م`, { size: 58, weight: 800, color: C.white, cx: 0, cy: 0, width: 420, align: 'left', lh: 1.15 });
  const hBtn = div(hero, { width: '100%', height: '100%' });
  const hBtnIc = icon(hBtn, 'check', 46, C.white, 2.8);
  const hBtnL = words(hBtn, 'تم الدفع', { size: 46, weight: 700, color: C.white, cx: 0, cy: 0, width: 300, font: UI, lh: 1.2 });
  const cur = el('svg', { width: 56, height: 56, viewBox: '0 0 24 24', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '40' } }, root);
  cur.innerHTML = `<path d="M5 3.5 19 11l-6.2 1.6L10 18.8 5 3.5Z" fill="${C.navy}" stroke="${C.white}" stroke-width="1.6" stroke-linejoin="round"/>`;
  const click = div(root, { border: `3px solid ${C.copper}`, borderRadius: '50%', zIndex: '39' });
  const flash = full(root, { background: '#fff', zIndex: '80', opacity: '0' });
  S.g = { tile, top, tri, triP, hero, hTot, hTotL, hTotN, hBtn, hBtnIc, hBtnL, cur, click, flash };
}
function renderGlobal(t) {
  const g = S.g;
  // ---- mark ----
  const hookPhase = t < T.slam + 0.08, nameOn = t < T.dive + 0.45, payOn = t >= T.gather;
  const markOn = nameOn || payOn;
  vis(g.top, markOn); g.tri.style.display = markOn ? 'block' : 'none'; vis(g.tile, markOn && t >= T.wipe[0]);
  if (markOn) {
    const m = markState(t), G = markGeom(m.k, m.cx, m.cy);
    let barC, triC;
    if (payOn) { barC = C.cream; triC = C.cream; }
    else if (t < T.wipe[0] + 0.015) { barC = C.cream; triC = C.cream; }
    else { barC = C.navy; triC = C.navy; }
    // top bar: in the hook it is the beam (pivot on the apex), later exactly the logo's bar
    let tb = { cx: G.top.cx, cy: G.top.cy, rot: 0 };
    if (t < T.zoom) { const b = beam(t); tb = { cx: b.cx, cy: b.cy, rot: b.rot }; }
    let pop = 1;
    if (payOn) pop = clamp(spr(t, T.logo, 0.45, 0.3), 0, 1.2);
    const popS = payOn ? lerp(0.4, 1, pop) : 1, sx = (x) => M3[0] + (x - M3[0]) * popS, sy = (y) => M3[1] + (y - M3[1]) * popS;
    const fadeDive = payOn ? 1 : 1 - sm(T.dive + 0.1, T.dive + 0.36, t); // the dive blur belongs to 6.0–6.45 only: the payoff logo stays crisp
    if (payOn) place(g.top, sx(tb.cx), sy(tb.cy), G.top.w * popS, G.top.h * popS, (G.top.h * popS) / 2);
    else place(g.top, tb.cx, tb.cy, G.top.w, G.top.h, G.top.h / 2);
    g.top.style.background = barC; g.top.style.transform = `rotate(${tb.rot.toFixed(3)}deg)`;
    op(g.top, payOn ? clamp(pop * 3) : fadeDive);
    const ax = payOn ? sx(G.apex[0]) : G.apex[0], ay = payOn ? sy(G.apex[1]) : G.apex[1], by = payOn ? sy(G.base) : G.base, hw = (payOn ? popS : 1) * G.half;
    g.triP.setAttribute('d', `M ${ax.toFixed(2)} ${ay.toFixed(2)} L ${(ax + hw).toFixed(2)} ${by.toFixed(2)} L ${(ax - hw).toFixed(2)} ${by.toFixed(2)} Z`);
    g.triP.setAttribute('fill', triC); g.triP.setAttribute('stroke', triC); g.triP.setAttribute('stroke-width', (1.5 * m.k * (payOn ? popS : 1)).toFixed(2));
    g.tri.style.opacity = (payOn ? clamp(pop * 3) : fadeDive).toFixed(3);
    setBlur(g.top, (1 - fadeDive) * 10); g.tri.style.filter = fadeDive < 0.99 ? `blur(${((1 - fadeDive) * 10).toFixed(2)}px)` : 'none';
    // tile = a whole world: cream circle out of the apex (4.0), shrinks into the logo tile; navy night gathers into it (19.85)
    if (!payOn && t >= T.wipe[0]) {
      g.tile.style.background = C.cream;
      if (t < T.zoom) {
        const u = ramp(t, T.wipe[0], T.wipe[1]), r = 2300 * (1 - Math.pow(1 - u, 2.6));
        place(g.tile, W / 2, H / 2, W, H, 0); g.tile.style.clipPath = `circle(${px(r)} at ${G1.apex[0]}px ${G1.apex[1]}px)`;
      } else {
        g.tile.style.clipPath = 'none';
        const q = clamp((m.s ?? 1) * 1.15, 0, 1), x0 = lerp(0, G.tile.x, q), y0 = lerp(0, G.tile.y, q), x1 = lerp(W, G.tile.x + G.tile.s, q), y1 = lerp(H, G.tile.y + G.tile.s, q);
        place(g.tile, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, lerp(0, G.tile.r, clamp(q)));
        g.tile.style.boxShadow = `0 ${(30 * q).toFixed(1)}px ${(70 * q).toFixed(1)}px rgba(0,0,0,${(0.45 * clamp(q)).toFixed(3)})`;
      }
      op(g.tile, t > T.dive + 0.05 ? 0 : 1);
    } else if (payOn) {
      const q = spr(t, T.gather + 0.05, 0.62, 0.14), G3t = G3.tile;
      const x0 = lerp(-2, G3t.x, q), y0 = lerp(-2, G3t.y, q), x1 = lerp(W + 2, G3t.x + G3t.s, q), y1 = lerp(H + 2, G3t.y + G3t.s, q);
      g.tile.style.clipPath = 'none'; g.tile.style.background = C.navy;
      place(g.tile, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, lerp(0, G3t.r, clamp(q)));
      g.tile.style.boxShadow = `0 ${(36 * clamp(q)).toFixed(1)}px ${(70 * clamp(q)).toFixed(1)}px rgba(19,33,60,${(0.35 * clamp(q)).toFixed(3)})`;
      op(g.tile, sm(T.gather - 0.02, T.gather + 0.05, t));
    }
  }
  // ---- hero ----
  const hs = heroAt(t), heroOn = t > T.arrive - 0.02;
  vis(g.hero, heroOn);
  if (heroOn) {
    place(g.hero, hs.cx, hs.cy, hs.w, hs.h, hs.r);
    const hot = clamp(hs.hot), gl = clamp(hs.glow);
    g.hero.style.background = hot > 0.01 ? `linear-gradient(90deg, ${mixHex(C.copper, C.hot, hot)}, ${mixHex(C.copperL, '#fff3e6', hot)}, ${mixHex(C.copper, C.hot, hot)})` : `linear-gradient(180deg, ${C.copperL}, ${C.copper})`;
    const scanFlash = T.scans.reduce((a, c) => a + (t >= c ? Math.exp(-(t - c) / 0.1) : 0), 0);
    g.hero.style.boxShadow = `0 0 ${(20 + 40 * gl + 60 * scanFlash).toFixed(1)}px rgba(255,150,80,${(0.55 * gl + 0.4 * clamp(scanFlash)).toFixed(3)})`;
    // the arrival streak: motion blur from its own speed
    const prev = heroAt(t - 1 / 60), v = Math.hypot(hs.cx - prev.cx, hs.cy - prev.cy) + Math.abs(hs.w - prev.w) * 0.5 + Math.abs(hs.h - prev.h) * 0.5;
    setBlur(g.hero, Math.min(9, v * 0.06));
    // labels inside the hero: the total, then the paid button
    const totOn = t > T.toTotal + 0.12 && t < T.toButton + 0.05, btnOn = t > T.toButton + 0.18 && t < T.blind + 0.02;
    g.hTot.style.display = totOn ? 'block' : 'none'; g.hBtn.style.display = btnOn ? 'block' : 'none';
    if (totOn) {
      const a = sm(T.toTotal + 0.12, T.toTotal + 0.3, t) * (1 - sm(T.toButton - 0.1, T.toButton + 0.02, t));
      const L1 = g.hTotL.line, L2 = g.hTotN.line; L1.style.left = px(hs.w - 300 - 44); L1.style.top = px(hs.h / 2 - 27); L2.style.left = px(40); L2.style.top = px(hs.h / 2 - 34);
      [g.hTotL, g.hTotN].forEach((L) => { L.line.style.display = 'flex'; L.words.forEach((w) => { w.style.opacity = a.toFixed(3); }); });
    }
    if (btnOn) {
      const a = sm(T.toButton + 0.18, T.toButton + 0.32, t) * (1 - sm(T.blind - 0.02, T.blind + 0.06, t)), pressed = t > T.tapDone ? Math.exp(-(t - T.tapDone) / 0.12) : 0;
      const L = g.hBtnL.line; L.style.left = px(hs.w / 2 - 150 - 30); L.style.top = px(hs.h / 2 - 28); L.style.display = 'flex'; g.hBtnL.words.forEach((w) => { w.style.opacity = a.toFixed(3); });
      g.hBtnIc.style.left = px(hs.w / 2 + 70); g.hBtnIc.style.top = px(hs.h / 2 - 23); g.hBtnIc.style.opacity = (a * clamp((t - T.tapDone) * 8)).toFixed(3);
      g.hero.style.transform = `scale(${(1 - 0.06 * pressed * (t > T.tapDone ? 1 : 0)).toFixed(4)})`;
    } else g.hero.style.transform = Math.abs(hs.rot) > 0.01 ? `rotate(${hs.rot.toFixed(3)}deg)` : 'none';
  }
  // ---- cursor (sell): it causes the two choices ----
  const ck = [{ t: 8.3, x: 960, y: 1360 }, { t: 8.7, x: 858, y: 856 }, { t: 9.1, x: 858, y: 856 }, { t: 9.5, x: 610, y: 730 }, { t: 9.9, x: 620, y: 740 }];
  const curOn = t > 8.3 && t < 9.88;
  g.cur.style.display = curOn ? 'block' : 'none';
  if (curOn) {
    let x = ck[0].x, y = ck[0].y;
    for (let i = 1; i < ck.length; i++) if (t <= ck[i].t) { const a = ck[i - 1], b = ck[i], u = ioC(ramp(t, a.t, b.t)); const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, off = Math.sin(Math.PI * u) * 60 * Math.min(1, len / 500); x = lerp(a.x, b.x, u) + (-dy / len) * off; y = lerp(a.y, b.y, u) + (dx / len) * off; break; } else { x = ck[i].x; y = ck[i].y; }
    const dip = [T.tapCash, T.tapDone].reduce((a, c) => a - 0.2 * Math.pow(Math.sin(Math.PI * clamp((t - c + 0.05) / 0.2)), 2), 1);
    g.cur.style.transform = `translate(${px(x - 10)}, ${px(y - 6)}) scale(${dip.toFixed(3)})`; g.cur.style.opacity = (sm(8.3, 8.45, t) * (1 - sm(9.75, 9.88, t))).toFixed(3);
  }
  let cr = null; for (const c of [T.tapCash, T.tapDone]) { const u = ramp(t, c, c + 0.45); if (u > 0 && u < 1) cr = { u, c }; }
  vis(g.click, !!cr); if (cr) { const r = lerp(14, 70, oE(cr.u)), at = cr.c === T.tapCash ? [858, 856] : [610, 730]; place(g.click, at[0], at[1], 2 * r, 2 * r); op(g.click, 0.85 * (1 - cr.u)); }
  // ---- flash on the two big turns ----
  const fl = 0; // the cream burst (4.0) and the gathering tile (20.1) are the flashes; a white overlay only greyed them (strip review take02)
  g.flash.style.opacity = fl.toFixed(3);
}
// Shared camera: impacts shake the whole frame (decaying, seeded).
const HITS = [[T.chips[0], 6], [T.chips[1], 7], [T.chips[2], 8], [T.chips[3], 10], [T.slam, 22], [T.stock + 0.05, 8], [T.boxes[0], 4], [T.bars + 0.1, 8], [T.logo, 12]];
function camera(t) {
  let x = 0, y = 0, r = 0;
  for (const [h, a] of HITS) { if (t < h) continue; const d = Math.exp(-(t - h) / 0.12) * a; x += d * Math.sin((t - h) * 61 + h); y += d * Math.cos((t - h) * 53 + 2 * h); r += d * 0.02 * Math.sin((t - h) * 47); }
  return { x, y, r };
}

// =====================================================================================================
export default {
  duration: 25, fps: FPS,
  async init(st, { W: w, H: h }) {
    W = w; H = h; STAGE = st;
    st.style.background = C.night;
    CAM = full(st, { transformOrigin: '540px 960px' });
    SC.forEach((s) => { s.root = full(CAM, { overflow: 'hidden', zIndex: String(s.z), display: 'none' }); s.init(s.root); });
    initGlobal(CAM);
    GRAIN = grain(st, { opacity: 0.05, tiles: 6, seed: 12 });
  },
  render(t, frame = Math.round(t * FPS)) {
    for (const s of SC) { const on = t >= s.a && t < s.b; s.root.style.display = on ? 'block' : 'none'; if (on) s.render(t); }
    renderGlobal(t);
    const c = camera(t);
    CAM.style.transform = `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) rotate(${c.r.toFixed(3)}deg)`;
    STAGE.style.background = (t >= T.wipe[0] && t < T.dive) ? C.cream : ((t >= T.dive && t < T.blind + 0.2) || t >= T.gather + 0.1) ? C.ivory : C.night;
    GRAIN(frame);
  },
};
