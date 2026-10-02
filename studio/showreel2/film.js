// SHOWREEL 2 — "CLAUDE · motion designer" — 15 s, 128 BPM, 8 bars, 60 fps, 16:9 (1920×1080).
// A native recreation of the visual grammar studied in references/user-ref (see BRIEF.md): one capability per bar,
// a running HUD (index, timecode, BPM, beat squares, bar n/8), three typefaces, one coral accent that returns as the
// full stop and as the pattern wave. All motion is a closed-form function of t (springs, staggers, point clouds,
// Truchet waves, confetti): any frame renders identically in any order. Nothing here is copied from the reference:
// the burst glyph is drawn procedurally, fonts are open-licence, the score is original.
import { el, clamp, lerp, ramp, show } from '../lib/motion.js';
import { springStep, hash, curves, noise1 } from '../lib/kinetics.js';

const C = { ink: '#0E0E10', orange: '#FF5A37', cream: '#F3EDE3', blue: '#2B39FC', lime: '#E2FE3D', violet: 'rgba(120,84,255,0.85)' };
const BEAT = 60 / 128, BAR = 4 * BEAT, E8 = BEAT / 2;
const FPS = 60;
const LABELS = ['01 — IDENTITY', '01 — IDENTITY', '02 — EASING', '03 — MORPHING', '04 — SYSTEMS', '05 — DEPTH', '06 — KINETIC TYPE', '07 — FIN'];

// ---------- helpers ----------
let W, H, K, stage, roots = {}, hudNodes = {}, defs;
const px = v => `${(+v).toFixed(2)}px`;
const k = v => v * K;               // authored at 1920 → current width
const mk = (parent, css = {}, tag = 'div') => el(tag, { style: { position: 'absolute', ...css } }, parent);
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const outBack = (p, s = 1.8) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
const outExpo = p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const inOut3 = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const outElastic = p => (p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
const outBounce = p => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; };
const spr = (t, start, duration = 0.5, bounce = 0.25) => springStep(t - start, { duration, bounce }).value;

// Directional gaussian blur through one SVG filter per id (stdDeviation "x y").
const blurs = new Map();
function dblur(node, id, bx = 0, by = 0) {
  let f = blurs.get(id);
  if (!f) {
    if (!defs) { const svg = el('svg', { width: 0, height: 0, style: { position: 'absolute', left: '0', top: '0' } }, stage); defs = el('defs', {}, svg); }
    const flt = el('filter', { id: `db-${id}`, x: '-60%', y: '-60%', width: '220%', height: '220%', 'color-interpolation-filters': 'sRGB' }, defs);
    f = el('feGaussianBlur', { stdDeviation: '0 0' }, flt); blurs.set(id, f);
  }
  const on = bx > 0.05 || by > 0.05;
  if (on) f.setAttribute('stdDeviation', `${bx.toFixed(2)} ${by.toFixed(2)}`);
  node.style.filter = on ? `url(#db-${id})` : 'none';
}

// A word made of letter spans (inline-block). Widths are animated through the variable-font width axis.
function word(parent, text, { font = 'Archivo', wght = 900, wdth = 125, color = C.ink, size = 200, track = -0.02, style = 'normal', css = {} } = {}) {
  const row = mk(parent, { left: '0', top: '0', display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap', fontFamily: `"${font}"`, fontStyle: style, fontSize: px(size), lineHeight: '1', color, letterSpacing: `${track}em`, ...css });
  const letters = [...text].map(ch => ({ ch, node: el('span', { text: ch === ' ' ? ' ' : ch, style: { display: 'inline-block', fontVariationSettings: `'wdth' ${wdth}, 'wght' ${wght}`, transformOrigin: '50% 60%' } }, row) }));
  return { row, letters, wdth, wght, size, text };
}
const setWidth = (L, w, wght = L.wght) => { L.node.style.fontVariationSettings = `'wdth' ${w.toFixed(1)}, 'wght' ${wght}`; };
// Fit a word to a pixel width at its full width axis (call once after fonts are loaded), then centre it on (cx, cy).
function fitWord(Wd, targetW) {
  Wd.row.style.fontSize = '100px';
  const w100 = Wd.row.getBoundingClientRect().width || 1;
  Wd.size = (100 * targetW) / w100; Wd.row.style.fontSize = px(Wd.size);
  Wd.fullWidth = targetW;
}
const placeWord = (Wd, cx, cy, align = 'center') => {
  const r = Wd.row.getBoundingClientRect();
  Wd.row.style.left = px(align === 'left' ? cx : cx - Wd.fullWidth / 2);
  Wd.row.style.top = px(cy - Wd.size * 0.36);
};
const mono = (parent, text, css = {}) => mk(parent, { fontFamily: '"Space Mono"', fontSize: px(k(16)), letterSpacing: '0.12em', whiteSpace: 'nowrap', textTransform: 'uppercase', lineHeight: '1', ...css }).appendChild(document.createTextNode(text)) && parent.lastChild;

// Procedural burst glyph (own design): n rounded rays of uneven length around a small hub.
function burstPath(n, R, seed, grow, spin = 0, inner = 0.12, width = 0.17) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const len = R * (0.62 + 0.38 * hash(seed, i, 1)), a = spin + (i / n) * Math.PI * 2 + (hash(seed, i, 2) - 0.5) * 0.28, g = grow(i);
    d += `M${(Math.cos(a) * R * inner).toFixed(2)} ${(Math.sin(a) * R * inner).toFixed(2)}L${(Math.cos(a) * (R * inner + (len - R * inner) * g)).toFixed(2)} ${(Math.sin(a) * (R * inner + (len - R * inner) * g)).toFixed(2)}`;
  }
  return d;
}

// ---------- HUD ----------
const hudParts = [];
function initHud() {
  const hud = mk(stage, { left: '0', top: '0', width: px(W), height: px(H), zIndex: '500', pointerEvents: 'none' });
  const inset = k(46), len = k(36), th = Math.max(1, k(2.4));
  for (const [x, y, dx, dy] of [[inset, inset, 1, 1], [W - inset, inset, -1, 1], [inset, H - inset, 1, -1], [W - inset, H - inset, -1, -1]]) {
    const a = mk(hud, { left: px(dx > 0 ? x : x - len), top: px(dy > 0 ? y : y - th), width: px(len), height: px(th), background: 'currentColor' });
    const b = mk(hud, { left: px(dx > 0 ? x : x - th), top: px(dy > 0 ? y : y - len), width: px(th), height: px(len), background: 'currentColor' });
    hudParts.push(a, b);
  }
  const t = (css, text, extra = {}) => { const n = mk(hud, { fontFamily: '"Space Mono"', fontSize: px(k(12.5)), letterSpacing: '0.12em', whiteSpace: 'nowrap', lineHeight: '1', color: 'currentColor', ...css }); n.textContent = text; Object.assign(n.style, extra); return n; };
  const topY = k(74), botY = H - k(74);
  hudNodes.brand = t({ left: px(k(79)), top: px(topY) }, 'CLAUDE', { fontWeight: '700' });
  hudNodes.sub = t({ left: px(k(185)), top: px(topY), opacity: '0.55' }, 'MOTION REEL — 2026');
  hudNodes.label = t({ right: px(W - k(1842)), top: px(topY), fontWeight: '700' }, LABELS[0]);
  hudNodes.tc = t({ left: px(k(79)), top: px(botY), fontWeight: '700' }, '00:00:00:00');
  hudNodes.fps = t({ left: px(k(262)), top: px(botY), opacity: '0.55' }, '60 FPS');
  hudNodes.bpm = t({ left: px(k(1584)), top: px(botY), opacity: '0.7' }, '128 BPM');
  hudNodes.squares = [0, 1, 2, 3].map(i => mk(hud, { left: px(k(1702) + i * k(18)), top: px(botY - k(2)), width: px(k(11)), height: px(k(11)), border: `${Math.max(1, k(1.4))}px solid currentColor`, boxSizing: 'border-box' }));
  hudNodes.bar = t({ right: px(W - k(1842)), top: px(botY) }, 'BAR 1/8', { opacity: '0.8' });
  hudNodes.line = mk(hud, { left: px(k(43)), top: px(H - k(31)), height: px(Math.max(1.5, k(2.4))), width: px(1), background: 'currentColor', transformOrigin: '0 50%' });
  hudNodes.root = hud;
}
const hudColor = T => (T < 1.875 ? C.cream : T < 3.5 ? C.ink : T < 3.62 ? C.ink : T < 5.625 ? C.ink : T < 7.5 ? C.cream : T < 11.25 ? C.cream
  : T < 11.484 ? C.ink : T < 11.719 ? C.cream : T < 11.953 ? C.ink : T < 12.187 ? C.cream : T < 12.42 ? C.ink : T < 12.65 ? C.ink : T < 13.35 ? C.cream : C.ink);
function renderHud(T) {
  const bar = Math.min(7, Math.floor(T / BAR)), beat = Math.floor((T / BEAT) % 4), c = hudColor(T);
  hudNodes.root.style.color = c;
  hudNodes.label.textContent = LABELS[bar];
  const f = Math.min(Math.floor(T * FPS + 1e-6), 15 * FPS - 1), ss = Math.floor(f / FPS), ff = f % FPS;
  hudNodes.tc.textContent = `00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  hudNodes.bar.textContent = `BAR ${bar + 1}/8`;
  hudNodes.squares.forEach((s, i) => { s.style.background = i === beat ? 'currentColor' : 'transparent'; });
  hudNodes.line.style.width = px(Math.max(1, (T / 15) * (W - k(86))));
}

// =====================================================================================================
// 0 INTRO (0–1.875): black, ring + dot, a procedurally drawn burst grows, text ring turns, collapse to a dot.
const S0 = {};
function init0(root) {
  const cx = W / 2, cy = H / 2;
  S0.dots = mk(root, { left: '0', top: '0', width: px(W), height: px(H), opacity: '0.07', backgroundImage: `radial-gradient(circle, ${C.cream} ${k(1.4)}px, transparent ${k(1.6)}px)`, backgroundSize: `${k(48)}px ${k(48)}px` });
  S0.svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, root);
  S0.outer = el('circle', { cx, cy, r: k(635), fill: 'none', stroke: 'rgba(243,237,227,0.11)', 'stroke-width': k(1.6) }, S0.svg);
  S0.inner = el('circle', { cx, cy, r: k(406), fill: 'none', stroke: 'rgba(255,90,55,0.42)', 'stroke-width': k(1.6) }, S0.svg);
  const path = el('path', { id: 'ring-text', d: `M${cx - k(305)} ${cy}a${k(305)} ${k(305)} 0 1 1 ${k(610)} 0a${k(305)} ${k(305)} 0 1 1 ${-k(610)} 0`, fill: 'none' }, S0.svg);
  S0.ringG = el('g', {}, S0.svg);
  const txt = el('text', { 'font-family': 'Space Mono', 'font-size': k(17), 'letter-spacing': k(5.5), fill: C.cream }, S0.ringG);
  el('textPath', { href: '#ring-text', text: 'CLAUDE · MOTION DESIGN · SHOWREEL 2026 · CLAUDE · MOTION DESIGN · SHOWREEL 2026 · ' }, txt);
  S0.burst = el('path', { d: '', fill: 'none', stroke: C.orange, 'stroke-width': k(40), 'stroke-linecap': 'round', transform: `translate(${cx} ${cy})` }, S0.svg);
  S0.dot = el('circle', { cx, cy, r: k(28), fill: C.orange }, S0.svg);
  S0.glow = mk(root, { left: px(cx - k(60)), top: px(cy - k(60)), width: px(k(120)), height: px(k(120)), borderRadius: '50%', background: `radial-gradient(circle, rgba(255,90,55,0.55), rgba(255,90,55,0))`, opacity: '0' });
  S0.R = k(267);
}
function render0(T) {
  const cx = W / 2, cy = H / 2;
  const appear = sm(0, 0.35, T), collapse = ramp(T, 1.62, 1.86);
  S0.outer.setAttribute('r', k(635) * lerp(0.96, 1, sm(0, 0.8, T)));
  S0.outer.style.opacity = String(appear); S0.inner.style.opacity = String(appear);
  S0.ringG.setAttribute('transform', `rotate(${-T * 22} ${cx} ${cy})`);
  S0.ringG.style.opacity = String(sm(0.55, 0.95, T) * (1 - sm(1.5, 1.72, T)));
  // burst: rays spring out one after another, whole glyph slowly rotating; collapses back into the dot.
  const spin = T * 0.2;
  const grown = i => clamp(spr(T, 0.42 + i * 0.045, 0.5, 0.32)) * (1 - inOut3(collapse)), maxG = Math.max(...Array.from({ length: 12 }, (_, i) => grown(i)));
  S0.burst.setAttribute('d', burstPath(12, S0.R, 5, grown, spin, 0.0));
  S0.burst.style.opacity = maxG < 0.12 ? '0' : '1'; // below this the round caps would only draw a scalloped blob around the dot
  const dotR = k(28) * (T < 0.42 ? 1 : lerp(1, 0.55, sm(0.42, 0.7, T))) * (1 - 0.7 * sm(1.62, 1.86, T));
  S0.dot.setAttribute('r', Math.max(0, dotR));
  S0.glow.style.opacity = String(sm(1.7, 1.86, T) * (T < 1.9 ? 1 : 0));
  S0.glow.style.transform = `scale(${lerp(0.5, 1.2, sm(1.7, 1.875, T))})`;
}

// =====================================================================================================
// 1 IDENTITY (1.875–3.5): iris reveals orange; the wordmark's letters change width as they land; subtitle rises.
const S1 = {};
function init1(root) {
  S1.rule = mk(root, { left: px(k(140)), top: px(k(239)), width: px(k(1638)), height: px(Math.max(1.5, k(2.2))), background: C.ink, transformOrigin: '0 50%' });
  S1.no = mk(root, { left: px(k(140)), top: px(k(214)), fontFamily: '"Space Mono"', fontSize: px(k(12)), letterSpacing: '0.12em', color: C.ink, lineHeight: '1' }); S1.no.textContent = 'Nº 01';
  S1.yr = mk(root, { right: px(W - k(1778)), top: px(k(214)), fontFamily: '"Space Mono"', fontSize: px(k(12)), letterSpacing: '0.12em', color: C.ink, lineHeight: '1' }); S1.yr.textContent = 'SHOWREEL — 2026';
  S1.word = word(root, 'CLAUDE', { wdth: 125, wght: 900, size: k(300), track: -0.015, color: C.ink });
  S1.sub = word(root, 'motion designer', { font: 'Instrument Serif', style: 'italic', wght: 400, wdth: 100, size: k(150), track: 0, color: C.cream });
  S1.subClip = S1.sub.row; S1.sub.row.style.overflow = 'hidden';
}
function layout1() {
  fitWord(S1.word, k(1630)); placeWord(S1.word, W / 2, H * 0.5);
  S1.sub.row.style.fontSize = '100px'; const w100 = S1.sub.row.getBoundingClientRect().width; S1.sub.size = 100 * k(1000) / w100; S1.sub.row.style.fontSize = px(S1.sub.size); S1.sub.fullWidth = k(1000);
  S1.sub.row.style.left = px(W / 2 - k(500)); S1.laid = true;
}
function render1(T) {
  if (!S1.laid) layout1();
  const t = T - 1.875;
  S1.rule.style.transform = `scaleX(${curves.decelerate(ramp(t, 0.1, 0.55)).toFixed(4)})`;
  S1.no.style.opacity = S1.yr.style.opacity = String(sm(0.4, 0.6, t));
  const lockupUp = inOut3(ramp(T, 3.0, 3.3)); // wordmark makes room for the subtitle
  const cy = H * (0.5 - 0.1 * lockupUp);
  S1.word.row.style.top = px(cy - S1.word.size * 0.36);
  // glitch exit: the C tears away, the rest stretches and smears
  const glitch = ramp(T, 3.38, 3.5);
  S1.word.letters.forEach((L, i) => {
    const p = clamp(spr(T, 1.95 + i * 0.045, 0.5, 0.28));
    const wd = lerp(62, 125, Math.max(0, outBack(clamp((T - (1.95 + i * 0.045)) / 0.42), 1.5)));
    const wave = 1 - 0.55 * Math.pow(Math.sin(Math.PI * clamp((T - (2.5 + i * 0.07)) / 0.3)), 2) * (T > 2.5 ? 1 : 0);
    setWidth(L, glitch > 0 ? (i === 0 ? 62 : lerp(125, 125 + (i % 2 ? 0 : -63), glitch)) : Math.min(125, Math.max(62, Math.min(wd, 125 * wave))));
    const slide = (1 - p) * k(160) * (1 + 0.2 * i) * (i < 3 ? -1 : 1);
    const gx = glitch * (i === 0 ? -k(260) : k(14) * i);
    L.node.style.transform = `translateX(${(slide + gx).toFixed(2)}px)`;
    L.node.style.opacity = String(clamp(p * 3) * (1 - 0.7 * (i === 0 ? glitch : 0)));
    dblur(L.node, `w1-${i}`, (1 - p) * k(34) + glitch * k(i === 0 ? 40 : 10), 0);
  });
  // subtitle rises through a mask
  const sp = outExpo(ramp(T, 3.0, 3.4));
  S1.sub.row.style.top = px(H * 0.62 - S1.sub.size * 0.36 + (1 - sp) * S1.sub.size * 0.9);
  S1.sub.row.style.height = px(S1.sub.size * 1.18); S1.sub.row.style.clipPath = `inset(0 0 ${(1 - sp) * 55}% 0)`;
  S1.sub.row.style.opacity = String(sp > 0 ? 1 : 0);
}

// =====================================================================================================
// 2 EASING (3.5–5.625): six dots race A→B with six curves; the page then folds into one blue dot.
const S2 = {};
const EASES = [['linear', p => p], ['ease-in-out', inOut3], ['expo-out', outExpo], ['back-out', p => outBack(p, 2.2)], ['elastic', outElastic], ['bounce', outBounce]];
const DOTC = [C.ink, C.blue, C.orange, C.ink, C.blue, C.orange];
function init2(root) {
  S2.cutWedge = mk(root, { left: '0', top: '0', width: px(W), height: px(H), background: C.orange, zIndex: '30' });
  S2.title = mk(root, { left: px(k(150)), top: px(k(155)), fontFamily: '"Instrument Serif"', fontStyle: 'italic', fontSize: px(k(66)), color: C.ink, lineHeight: '1', whiteSpace: 'nowrap' }); S2.title.textContent = 'Six ways to get from A to B.';
  S2.cap = mk(root, { right: px(W - k(1702)), top: px(k(205)), fontFamily: '"Space Mono"', fontSize: px(k(13)), letterSpacing: '0.12em', color: 'rgba(14,14,16,0.6)', lineHeight: '1', textTransform: 'uppercase', whiteSpace: 'nowrap' }); S2.cap.textContent = 'same distance — same duration (0.64s)';
  S2.ab = ['A', 'B'].map((t, i) => { const n = mk(root, { left: px(i ? k(1702) : k(660)), top: px(k(258)), fontFamily: '"Space Mono"', fontSize: px(k(13)), color: C.ink, lineHeight: '1', transform: 'translateX(-50%)' }); n.textContent = t; return n; });
  S2.x0 = k(660); S2.x1 = k(1702); S2.rows = [];
  const ys = [333, 424, 516, 607, 701, 793].map(v => k(v + 22));
  EASES.forEach(([name], i) => {
    const y = ys[i], r = { y };
    r.no = mk(root, { left: px(k(152)), top: px(y - k(7)), fontFamily: '"Space Mono"', fontSize: px(k(13)), color: C.orange, lineHeight: '1' }); r.no.textContent = `0${i + 1}`;
    r.name = mk(root, { left: px(k(193)), top: px(y - k(9)), fontFamily: '"Space Mono"', fontSize: px(k(19)), fontWeight: '700', color: C.ink, lineHeight: '1' }); r.name.textContent = name;
    r.icon = el('svg', { width: k(64), height: k(52), viewBox: '0 0 64 52', style: { position: 'absolute', left: px(k(456)), top: px(y - k(26)), overflow: 'visible' } }, root);
    el('rect', { x: 0, y: 0, width: 64, height: 52, fill: 'none', stroke: 'rgba(14,14,16,0.15)', 'stroke-width': 1 }, r.icon);
    r.curve = el('path', { d: curveD(EASES[i][1]), fill: 'none', stroke: C.ink, 'stroke-width': 2, 'stroke-linecap': 'round' }, r.icon);
    r.cdot = el('circle', { r: 3.4, fill: DOTC[i] }, r.icon);
    r.track = mk(root, { left: px(S2.x0), top: px(y), width: px(S2.x1 - S2.x0), height: px(Math.max(1, k(1.6))), background: 'rgba(14,14,16,0.2)', transformOrigin: '0 50%' });
    r.ticks = Array.from({ length: 9 }, (_, j) => mk(root, { left: px(S2.x0 + hash(i, j, 4) * (S2.x1 - S2.x0)), top: px(y - k(14) - hash(i, j, 6) * k(8)), width: px(Math.max(1, k(1.4))), height: px(k(9)), background: j % 3 === 1 ? DOTC[i] : 'rgba(14,14,16,0.45)', opacity: '0' }));
    r.ghosts = [1, 2, 3].map(g => mk(root, { width: px(k(56)), height: px(k(56)), borderRadius: '50%', border: `${Math.max(1, k(1.5))}px solid ${DOTC[i]}`, opacity: '0', boxSizing: 'border-box' }));
    r.ring = mk(root, { width: px(k(56)), height: px(k(56)), borderRadius: '50%', border: `${Math.max(1, k(1.6))}px solid ${DOTC[i]}`, opacity: '0', boxSizing: 'border-box' });
    r.dot = mk(root, { width: px(k(56)), height: px(k(56)), borderRadius: '50%', background: DOTC[i] });
    S2.rows.push(r);
  });
  S2.arc = EASES.map((_, i) => mk(root, { width: px(k(46)), height: px(k(26)), borderRadius: '50%', background: C.ink, display: 'none', zIndex: '20' }));
  S2.fin = mk(root, { width: px(k(56)), height: px(k(56)), borderRadius: '50%', background: C.blue, display: 'none', zIndex: '25' });
}
function curveD(f) { let d = ''; for (let i = 0; i <= 40; i++) { const p = i / 40; d += `${i ? 'L' : 'M'}${(4 + p * 56).toFixed(1)} ${(46 - clamp(f(p), -0.4, 1.4) * 38).toFixed(1)} `; } return d; }
const ARC = i => { const p = i / 5; return [lerp(0.2, 0.4, 0) * W + p * W * 0.62 + W * 0.04, H * (0.2 + 0.2 * Math.sin(p * 2.3) + 0.13 * p)]; };
function render2(T) {
  const t = T - 3.5, race0 = 4.3, dur = 0.64, settle = 4.95, fold0 = 5.2, fold1 = 5.55;
  // wedge wipe orange → cream (top-left corner retreats), six black ovals streak along an arc and land at their rows
  const wedge = ramp(T, 3.5, 3.66);
  S2.cutWedge.style.clipPath = wedge >= 1 ? 'polygon(0 0, 0 0, 0 0)' : `polygon(0 0, ${px(W * (1 - wedge) * 1.0)} 0, 0 ${px(H * (1 - wedge) * 1.0)})`;
  S2.cutWedge.style.display = wedge >= 1 ? 'none' : 'block';
  EASES.forEach((_, i) => {
    const r = S2.rows[i], a = S2.arc[i];
    const travel = clamp((T - (3.5 + i * 0.012)) / 0.34), land = outExpo(clamp((T - 3.7 - i * 0.035) / 0.42));
    const [ax, ay] = ARC(i), sx = S2.x0, sy = r.y;
    const midx = lerp(ax - W * 0.1, ax, sm(0, 0.3, travel));
    const x = T < 3.72 ? lerp(ax - W * 0.12, ax + W * 0.05, travel) : lerp(ax + W * 0.05, sx, land);
    const y = T < 3.72 ? lerp(ay - H * 0.05, ay, travel) : lerp(ay, sy, land);
    const speed = T < 3.72 ? 1.2 : (1 - land);
    const ang = Math.atan2(T < 3.72 ? 0.35 : (sy - ay), T < 3.72 ? 1 : (sx - ax)) * 180 / Math.PI;
    a.style.display = T < 3.5 + 0.0 || T > 4.1 ? 'none' : 'block';
    a.style.left = px(x - k(23)); a.style.top = px(y - k(13)); a.style.background = DOTC[i]; a.style.transform = `rotate(${ang}deg) scaleX(${1 + 1.4 * speed})`; dblur(a, `a2-${i}`, k(5) * speed, 0);
    // list furniture appears with a stagger
    const rv = sm(3.78 + i * 0.05, 3.98 + i * 0.05, T);
    for (const n of [r.no, r.name, r.icon]) n.style.opacity = String(rv);
    r.track.style.transform = `scaleX(${rv})`;
    // the race
    const rp = clamp((T - race0 - i * 0.0) / dur), v = EASES[i][1](rp), dx = lerp(S2.x0, S2.x1, v);
    const racing = T >= race0 && T < settle + 0.3;
    const dotX = racing || T >= race0 ? dx : S2.x0, dotY = r.y;
    // arrival ring + dot position through the end: gather to the centre blue dot
    const gather = inOut3(ramp(T, fold0, fold1));
    const px_ = lerp(dotX, W / 2, gather), py_ = lerp(dotY, H / 2, gather);
    const vel = (EASES[i][1](clamp((T + 0.008 - race0) / dur)) - EASES[i][1](clamp((T - 0.008 - race0) / dur))) / 0.016 * (S2.x1 - S2.x0) / dur / 1000;
    const stretch = 1 + Math.min(2.4, Math.abs(vel) * 0.35);
    const showDot = T >= 3.7 + 0.2;
    r.dot.style.display = showDot ? 'block' : 'none';
    const size = k(56) * (1 - 0.0 * gather);
    r.dot.style.background = gather > 0 ? mixHex(DOTC[i] === C.ink ? '#0E0E10' : DOTC[i], C.blue, gather) : DOTC[i]; r.dot.style.left = px(px_ - size / 2); r.dot.style.top = px(py_ - size / 2); r.dot.style.opacity = String(T < 4.0 ? clamp((T - 3.7) / 0.2) : 1);
    r.dot.style.transform = `scaleX(${gather < 0.01 ? stretch : lerp(stretch, 1, gather)}) scaleY(${gather < 0.01 ? 1 / Math.sqrt(stretch) : 1})`;
    dblur(r.dot, `d2-${i}`, gather < 0.01 ? Math.min(k(14), Math.abs(vel) * k(2.6)) : 0, 0);
    r.cdot.setAttribute('cx', 4 + rp * 56); r.cdot.setAttribute('cy', 46 - clamp(v, -0.4, 1.4) * 38);
    r.ghosts.forEach((g, gi) => {
      const gp = clamp((T - (gi + 1) * 0.034 - race0) / dur), gx = lerp(S2.x0, S2.x1, EASES[i][1](gp));
      g.style.left = px(lerp(gx, W / 2, gather) - k(28)); g.style.top = px(lerp(r.y, H / 2, gather) - k(28));
      g.style.opacity = String(T >= race0 && rp < 1 && gather === 0 ? 0.55 / (gi + 1) : 0);
    });
    const arr = T - (race0 + dur * (i === 3 ? 0.5 : 1));
    r.ring.style.left = px(S2.x1 - k(28)); r.ring.style.top = px(r.y - k(28));
    r.ring.style.opacity = String(arr > 0 && arr < 0.45 && gather === 0 ? 1 - arr / 0.45 : 0);
    r.ring.style.transform = `scale(${1 + 1.6 * clamp(arr / 0.45)})`;
    r.ticks.forEach((tk, j) => { tk.style.opacity = String(T >= race0 + 0.04 * j && T < race0 + 0.9 ? 0.9 * (1 - ramp(T, race0 + dur, race0 + 0.9)) : 0); });
    // rows fold away
    const fade = 1 - sm(fold0 - 0.08, fold0 + 0.12, T);
    for (const n of [r.no, r.name, r.icon, r.track]) n.style.opacity = String(Math.min(rv, fade));
    r.track.style.opacity = String(Math.min(rv, fade) * 1);
  });
  const hold = 1 - sm(fold0 - 0.08, fold0 + 0.1, T);
  S2.title.style.opacity = S2.cap.style.opacity = String(sm(3.82, 4.0, T) * hold);
  S2.ab.forEach(n => { n.style.opacity = String(sm(3.9, 4.05, T) * hold); });
  // the one blue dot (centre) pulses before the blue scene begins
  S2.fin.style.display = T >= fold1 ? 'block' : 'none';
  S2.fin.style.left = px(W / 2 - k(28)); S2.fin.style.top = px(H / 2 - k(28));
  const pulse = 1 + 0.25 * Math.sin(Math.PI * clamp((T - fold1) / 0.075));
  S2.fin.style.transform = `scale(${pulse * (1 + 0.1 * Math.sin(Math.PI * clamp((T - fold1) / 0.07)))}) scaleX(${1 + 0.4 * (1 - clamp((T - fold1) / 0.07))})`;
  S2.rows.forEach(r => { if (T >= fold1) r.dot.style.display = 'none'; });
}

// =====================================================================================================
// 3 MORPHING (5.625–7.5): circle → triangle → star → square with coral echoes and an orbit of 12 markers.
const S3 = {};
const MORPH = [ // [start, end, from, to]
  [5.95, 6.32, 'circle', 'triangle'], [6.5, 6.9, 'triangle', 'star'], [6.95, 7.3, 'star', 'square'],
];
const RAD = { circle: () => 1, triangle: th => polyR(th, 3, -Math.PI / 2), square: th => polyR(th, 4, Math.PI / 4), star: th => starR(th, 5, 0.46, -Math.PI / 2) };
function polyR(th, n, off) { const a = ((th - off) % (2 * Math.PI / n) + 2 * Math.PI / n) % (2 * Math.PI / n); return Math.cos(Math.PI / n) / Math.cos(a - Math.PI / n); }
function starR(th, n, inner, off) { const seg = Math.PI / n, a = ((th - off) % (2 * seg) + 2 * seg) % (2 * seg); const u = a / seg; return u <= 1 ? lerp(1, inner, u) : lerp(inner, 1, u - 1); }
function morphState(T) {
  let from = 'circle', to = 'circle', p = 0;
  for (const [a, b, f, g] of MORPH) { if (T >= a) { from = f; to = g; p = clamp(spr(T, a, 0.34, 0.2)); } }
  return { from, to, p };
}
function shapePath(T, R, rot) {
  const { from, to, p } = morphState(T), n = 120; let d = '';
  for (let i = 0; i < n; i++) { const th = (i / n) * Math.PI * 2, r = R * lerp(RAD[from](th), RAD[to](th), p), a = th + rot; d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; }
  return d + 'Z';
}
const rotAt = T => { const s = (T - 5.625); return 0.25 * s + 1.0 * (spr(T, 5.95, 0.6, 0.25) + spr(T, 6.5, 0.6, 0.25) + spr(T, 6.95, 0.6, 0.25)); };
function init3(root) {
  const cx = W / 2, cy = H / 2;
  S3.svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, root);
  S3.hl = el('line', { x1: k(300), x2: W - k(300), y1: cy, y2: cy, stroke: 'rgba(243,237,227,0.22)', 'stroke-width': 1 }, S3.svg);
  S3.vl = el('line', { y1: k(160), y2: H - k(160), x1: cx, x2: cx, stroke: 'rgba(243,237,227,0.22)', 'stroke-width': 1 }, S3.svg);
  S3.orbit = el('circle', { cx, cy, r: k(385), fill: 'none', stroke: 'rgba(243,237,227,0.22)', 'stroke-width': 1, 'stroke-dasharray': `${k(3)} ${k(7)}` }, S3.svg);
  S3.echoes = Array.from({ length: 9 }, () => el('path', { d: '', fill: 'none', stroke: C.orange, 'stroke-width': k(2.2), 'stroke-linejoin': 'round', transform: `translate(${cx} ${cy})` }, S3.svg));
  S3.rim = Array.from({ length: 3 }, (_, i) => el('circle', { cx, cy, r: k(250 + i * 12), fill: 'none', stroke: C.orange, 'stroke-width': k(1.6), opacity: 0 }, S3.svg));
  S3.shape = el('path', { d: '', fill: C.cream, transform: `translate(${cx} ${cy})` }, S3.svg);
  S3.marks = Array.from({ length: 12 }, () => el('path', { d: '', fill: C.cream }, S3.svg));
  const L = (css, text, extra = {}) => { const n = mk(root, { fontFamily: '"Space Mono"', fontSize: px(k(14)), letterSpacing: '0.12em', color: 'rgba(243,237,227,0.75)', lineHeight: '1.7', textTransform: 'uppercase', whiteSpace: 'pre', ...css }); n.textContent = text; Object.assign(n.style, extra); return n; };
  S3.l = L({ left: px(k(262)), top: px(cy - k(10)) }, 'MORPH   CIRCLE ⇄ CIRCLE');
  S3.r = L({ right: px(W - k(1660)), top: px(cy - k(10)), textAlign: 'right' }, 'T 0.00   ROT 000.0°\nSPRING F=2.0 ζ=0.30');
  S3.t = L({ left: px(cx - k(60)), top: px(cy - k(244)), color: 'rgba(243,237,227,0.55)' }, '270°');
  S3.b = L({ left: px(cx - k(30)), top: px(cy + k(224)), color: 'rgba(243,237,227,0.55)' }, '90°');
}
function render3(T) {
  const cx = W / 2, cy = H / 2, t = T - 5.625;
  const appear = spr(T, 5.65, 0.45, 0.3), R = k(250) * Math.max(0, appear) * (1 + 0.04 * Math.sin(T * 3));
  const rot = rotAt(T), { from, to, p } = morphState(T);
  S3.shape.setAttribute('d', shapePath(T, R, rot * 0)); // shape rotates as a whole (keeps echoes comparable)
  const spin = rot * 180 / Math.PI;
  S3.shape.setAttribute('transform', `translate(${cx} ${cy}) rotate(${spin.toFixed(2)})`);
  // blur at peak angular speed
  const w = Math.abs(rotAt(T + 0.01) - rotAt(T - 0.01)) / 0.02;
  S3.shape.style.filter = w > 3.2 ? `blur(${Math.min(2.5, (w - 3.2) * 0.9).toFixed(2)}px)` : 'none';
  S3.echoes.forEach((e, i) => {
    const tt = T - (i + 1) * 0.022;
    const active = T > 5.95 && T < 7.55;
    e.setAttribute('d', active ? shapePath(tt, R * 1.0, 0) : '');
    e.setAttribute('transform', `translate(${cx} ${cy}) rotate(${(rotAt(tt) * 180 / Math.PI).toFixed(2)})`);
    e.style.opacity = String(0.75 * (1 - i / 10) * (p > 0.02 && p < 0.98 ? 1 : 0.5));
  });
  S3.rim.forEach((c, i) => { c.setAttribute('r', R * (1.0 + 0.045 * (i + 1))); c.setAttribute('opacity', T < 6.0 ? 0.55 * (1 - i / 3) * sm(5.7, 5.9, T) : 0); });
  // orbit markers change species with the morph: dot → triangle → star → dash
  S3.marks.forEach((m, i) => {
    const a0 = (i / 12) * Math.PI * 2 + t * 0.35, rr = k(385), x = cx + Math.cos(a0) * rr, y = cy + Math.sin(a0) * rr;
    const shape = T < 5.95 ? 'dot' : T < 6.5 ? 'tri' : T < 6.95 ? 'star' : 'dash';
    const vis = clamp(spr(T, 5.7 + i * 0.015, 0.4, 0.25)), s = k(19) * vis;
    let d = '';
    if (shape === 'dot') { d = `M${x - s} ${y}a${s} ${s} 0 1 0 ${2 * s} 0a${s} ${s} 0 1 0 ${-2 * s} 0`; }
    else if (shape === 'tri') { const g = a0 + Math.PI / 2 + t * 0.8; d = [0, 1, 2].map(j => `${j ? 'L' : 'M'}${(x + Math.cos(g + j * 2.094 - 1.57) * s * 1.6).toFixed(1)} ${(y + Math.sin(g + j * 2.094 - 1.57) * s * 1.6).toFixed(1)}`).join('') + 'Z'; }
    else if (shape === 'star') { d = Array.from({ length: 10 }, (_, j) => `${j ? 'L' : 'M'}${(x + Math.cos(a0 + j * 0.628 - 1.57) * s * (j % 2 ? 0.8 : 2)).toFixed(1)} ${(y + Math.sin(a0 + j * 0.628 - 1.57) * s * (j % 2 ? 0.8 : 2)).toFixed(1)}`).join('') + 'Z'; }
    else { const g = a0, c = Math.cos(g), sn = Math.sin(g), L1 = s * 2.2, W1 = s * 0.7; d = `M${x - c * L1 - sn * W1} ${y - sn * L1 + c * W1}L${x + c * L1 - sn * W1} ${y + sn * L1 + c * W1}L${x + c * L1 + sn * W1} ${y + sn * L1 - c * W1}L${x - c * L1 + sn * W1} ${y - sn * L1 - c * W1}Z`; }
    m.setAttribute('d', d); m.style.filter = shape === 'dash' ? `blur(${(2.5 * clamp((T - 7.0) / 0.2)).toFixed(1)}px)` : 'none';
  });
  const names = { circle: 'CIRCLE', triangle: 'TRIANGLE', star: 'STAR', square: 'SQUARE' };
  S3.l.textContent = `MORPH   ${names[from]} ⇄ ${names[to]}`;
  S3.r.textContent = `T ${p.toFixed(2)}   ROT ${(((spin % 360) + 360) % 360).toFixed(1).padStart(5, '0')}°\nSPRING F=2.0 ζ=0.30`;
  const lab = sm(5.75, 5.95, T); S3.l.style.opacity = S3.r.style.opacity = S3.t.style.opacity = S3.b.style.opacity = String(lab);
  S3.hl.style.opacity = S3.vl.style.opacity = S3.orbit.style.opacity = String(lab);
}

// =====================================================================================================
// 4 SYSTEMS (7.5–9.375): a cream square becomes a Truchet field; three colour waves flip the tiles.
const S4 = {};
function init4(root) {
  S4.cv = mk(root, { left: '0', top: '0' }, 'canvas'); S4.cv.width = W; S4.cv.height = H; S4.cv.style.width = px(W); S4.cv.style.height = px(H);
  S4.ctx = S4.cv.getContext('2d');
  S4.s = k(120); S4.cols = Math.ceil(W / S4.s) + 1; S4.rows = Math.ceil(H / S4.s) + 1;
  S4.cap = mk(root, { left: '0', width: px(W), top: px(H - k(150)), textAlign: 'center', fontFamily: '"Space Mono"', fontSize: px(k(14)), letterSpacing: '0.18em', color: C.cream, lineHeight: '1', textTransform: 'uppercase', opacity: '0', textShadow: `0 0 ${k(8)}px ${C.ink}, 0 0 ${k(14)}px ${C.ink}` });
  S4.cap.textContent = `TRUCHET × ${S4.cols * S4.rows}   ·   3 WAVES   ·   SEED 0x2A`;
}
const WAVES = [8.0, 8.38, 8.76]; // start times of the three colour waves (left → right)
function render4(T) {
  const ctx = S4.ctx, s = S4.s, t = T - 7.5;
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  // 0–0.12: the cream square from the previous scene; then it grows into the field
  const sq = k(367) * (1 + 0.02 * Math.sin(t * 20));
  if (T < 7.62) { ctx.fillStyle = C.cream; ctx.fillRect(cx - sq / 2, cy - sq / 2, sq, sq); ctx.strokeStyle = C.violet; ctx.lineWidth = k(1.5); ctx.strokeRect(cx - sq / 2, cy - sq / 2, sq, sq); }
  const reveal = outExpo(ramp(T, 7.55, 8.2)) * Math.hypot(W, H) * 0.62;
  ctx.lineCap = 'round';
  for (let j = 0; j < S4.rows; j++) for (let i = 0; i < S4.cols; i++) {
    const x = i * s - (S4.cols * s - W) / 2, y = j * s - (S4.rows * s - H) / 2, mx = x + s / 2, my = y + s / 2;
    const d = Math.hypot(mx - cx, my - cy);
    if (d > reveal) continue;
    const edge = clamp((reveal - d) / (s * 1.5));
    let done = 0, active = 0, energy = 0;
    WAVES.forEach((w, wi) => {
      const tw = w + (mx / W) * 0.5 + hash(i, j, wi) * 0.04, p = clamp((T - tw) / 0.26);
      if (p >= 1) done++; else if (p > 0) active = inOut3(p);
      energy = Math.max(energy, Math.sin(Math.PI * clamp((T - tw + 0.1) / 0.78)) * (T >= tw - 0.1 ? 1 : 0));
    });
    // a Truchet tile turned by 90° is the other orientation: waves rotate each tile one quarter turn
    const base = hash(i, j, 42) > 0.5 ? 1 : 0, ang = (base + done + active) * Math.PI / 2;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
    const e = energy, w0 = k(26) * lerp(1, 0.62, e) * (0.4 + 0.6 * edge);
    const col = mixHex(C.cream, '#FF6A48', e);
    ctx.strokeStyle = col; ctx.lineWidth = w0; ctx.globalAlpha = (0.5 + 0.5 * edge) * (e > 0.55 ? 0.95 : 1);
    // coral tiles are short, separate arcs (centred on each quarter circle); cream tiles join into long lines
    const half = lerp(Math.PI / 4, Math.PI / 8.5, sm(0.2, 0.7, e));
    ctx.beginPath(); ctx.arc(-s / 2, -s / 2, s / 2, Math.PI / 4 - half, Math.PI / 4 + half); ctx.stroke();
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, Math.PI * 1.25 - half, Math.PI * 1.25 + half); ctx.stroke();
    ctx.restore();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  S4.cap.style.opacity = String(sm(8.0, 8.2, T));
}
const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, p) => { const A = hex2(a), B = hex2(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], p))).join(',')})`; };

// =====================================================================================================
// 5 DEPTH (9.375–11.25): a 30×19 dot mesh (570 vertices) waves in perspective, becomes a sphere, then a torus.
const S5 = {};
const NU = 30, NV = 19;
function init5(root) {
  S5.cv = mk(root, { left: '0', top: '0' }, 'canvas'); S5.cv.width = W; S5.cv.height = H; S5.cv.style.width = px(W); S5.cv.style.height = px(H);
  S5.ctx = S5.cv.getContext('2d');
  S5.cap = mk(root, { left: '0', width: px(W), top: px(H - k(118)), textAlign: 'center', fontFamily: '"Space Mono"', fontSize: px(k(14)), letterSpacing: '0.18em', color: 'rgba(243,237,227,0.8)', lineHeight: '1', textTransform: 'uppercase' });
}
function vertex(shape, u, v, T) {
  const U = u / (NU - 1), V = v / (NV - 1);
  if (shape === 'plane') { const x = (U - 0.5) * k(2300), z = (V - 0.5) * k(1500), y = Math.sin(U * 9 + T * 3) * k(120) * Math.sin(V * 3.1 + 0.4) + Math.cos(V * 7 - T * 2) * k(48) - Math.pow(U - 0.5, 2) * k(420); return [x, y, z]; }
  if (shape === 'sphere') { const th = (u / NU) * Math.PI * 2, ph = (V - 0.5) * Math.PI * 0.94, r = k(500); return [Math.cos(ph) * Math.cos(th) * r, Math.sin(ph) * r, Math.cos(ph) * Math.sin(th) * r]; }
  const th = (u / NU) * Math.PI * 2, ph = (v / NV) * Math.PI * 2, R = k(430), r = k(175);
  return [(R + r * Math.cos(ph)) * Math.cos(th), r * Math.sin(ph), (R + r * Math.cos(ph)) * Math.sin(th)];
}
function project5(T) {
  const cx = W / 2, cy = H * 0.46;
  const toSphere = inOut3(ramp(T, 10.02, 10.46)), toTorus = inOut3(ramp(T, 10.5, 10.92));
  const rotY = (T - 9.375) * 1.1 + 0.3, tilt = lerp(1.05, 0.5, sm(9.375, 10.1, T)) + 0.55 * toTorus;
  const pts = [];
  for (let v = 0; v < NV; v++) for (let u = 0; u < NU; u++) {
    const A = vertex('plane', u, v, T), B = vertex('sphere', u, v, T), Cc = vertex('torus', u, v, T);
    let P = [0, 1, 2].map(i => lerp(lerp(A[i], B[i], toSphere), Cc[i], toTorus));
    const planeAmt = 1 - toSphere;
    const ry = rotY * (1 - 0.8 * planeAmt * (1 - sm(9.375, 9.8, T)));
    let [x, y, z] = P;
    const cyr = Math.cos(ry), syr = Math.sin(ry); [x, z] = [x * cyr + z * syr, -x * syr + z * cyr];
    const ct = Math.cos(tilt), st = Math.sin(tilt); [y, z] = [y * ct - z * st, y * st + z * ct];
    const f = k(1400), sc = f / (f + z + k(520));
    pts.push([cx + x * sc, cy + y * sc, sc, z, (hash(u, v, 9) < 0.14)]);
  }
  return { pts, toSphere, toTorus, rotY };
}
function render5(T) {
  const ctx = S5.ctx;
  ctx.clearRect(0, 0, W, H);
  const { pts, toSphere, toTorus, rotY } = project5(T), prev = project5(T - 0.04).pts;
  const at = (u, v) => pts[v * NU + u];
  ctx.lineWidth = Math.max(1, k(1.3)); ctx.strokeStyle = 'rgba(243,237,227,0.16)';
  for (let v = 0; v < NV; v++) { ctx.beginPath(); for (let u = 0; u < NU; u++) { const p = at(u, v); u ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } if (toSphere > 0.5) { const p = at(0, v); ctx.lineTo(p[0], p[1]); } ctx.stroke(); }
  for (let u = 0; u < NU; u++) { ctx.beginPath(); for (let v = 0; v < NV; v++) { const p = at(u, v); v ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } if (toTorus > 0.5) { const p = at(u, 0); ctx.lineTo(p[0], p[1]); } ctx.stroke(); }
  const appear = sm(9.375, 9.55, T);
  ctx.lineCap = 'round';
  pts.forEach((p, i) => {
    const near = clamp(1.2 - (p[3] / k(700) + 0.6) * 0.5 + 0.2), a = clamp(0.25 + 0.6 * near) * appear, r = Math.max(1, k(3.4) * p[2]);
    ctx.strokeStyle = ctx.fillStyle = p[4] ? C.orange : C.cream;
    // motion trail: the dot's screen path over the last 0.04 s (rotation blur, longer where the mesh sweeps fast)
    const q = prev[i], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d > r * 1.2 && d < k(400)) { ctx.globalAlpha = a * 0.55; ctx.lineWidth = r * 1.6; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); }
    ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  S5.cap.textContent = `VERTICES ${NU * NV}   ·   FOCAL 1400   ·   ROT.Y ${(((rotY * 180 / Math.PI) % 360)).toFixed(1)}°`;
  S5.cap.style.opacity = String(sm(9.5, 9.7, T));
}

// =====================================================================================================
// 6 KINETIC TYPE (11.25–13.35): five 1/8-note cards, the tile row, then LINEAR. whose full stop floods the frame.
const S6 = {};
const CARDS = [
  { id: 'ease1', text: 'EASE', bg: C.orange, fg: C.ink, wdth: 125, frac: 0.86, dot: false },
  { id: 'in', text: 'IN', bg: C.ink, fg: C.cream, wdth: 78, frac: 0.44, dot: true },
  { id: 'ease2', text: 'EASE', bg: C.cream, fg: C.blue, wdth: 62, frac: 0.94, dot: false },
  { id: 'out', text: 'OUT', bg: C.blue, fg: C.cream, wdth: 92, frac: 0.60, dot: true },
  { id: 'never', text: 'NEVER', bg: C.lime, fg: C.ink, wdth: 125, frac: 0.80, dot: false },
  { id: 'rows', text: 'NEVER', bg: C.lime, fg: C.ink, wdth: 125, frac: 0.74, dot: false },
  { id: 'linear', text: 'LINEAR', bg: C.ink, fg: C.cream, wdth: 100, frac: 0.68, dot: true },
];
const CARD_T = [11.25, 11.484, 11.719, 11.953, 12.187, 12.42, 12.65, 13.35];
function init6(root) {
  S6.bg = mk(root, { left: '0', top: '0', width: px(W), height: px(H), background: C.orange });
  S6.cards = CARDS.map((c, i) => {
    const g = mk(root, { left: '0', top: '0', width: px(W), height: px(H), overflow: 'hidden', display: 'none' });
    const o = { c, g };
    if (c.id === 'rows') {
      o.rows = Array.from({ length: 9 }, (_, r) => { const wd = word(g, 'NEVER NEVER NEVER NEVER', { wdth: 125, wght: 900, size: k(150), track: 0.01, color: 'transparent', css: { webkitTextStroke: `${Math.max(1, k(2))}px rgba(14,14,16,0.55)` } }); return wd; });
      o.main = word(g, 'NEVER NEVER NEVER', { wdth: 125, wght: 900, size: k(150), track: 0.01, color: C.ink });
    } else {
      o.w = word(g, c.text, { wdth: c.wdth, wght: 900, size: k(280), track: c.id === 'never' ? 0.06 : -0.02, color: c.fg });
      if (c.dot) o.dotEl = mk(g, { width: px(k(60)), height: px(k(60)), borderRadius: '50%', background: C.orange });
    }
    if (c.id === 'linear') {
      o.svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0' } }, g);
      o.axisV = el('line', { x1: k(385), x2: k(385), y1: k(300), y2: k(900), stroke: 'rgba(243,237,227,0.3)', 'stroke-dasharray': `${k(2)} ${k(7)}`, 'stroke-width': k(2) }, o.svg);
      o.axisH = el('line', { x1: k(385), x2: k(1500), y1: k(900), y2: k(900), stroke: 'rgba(243,237,227,0.3)', 'stroke-dasharray': `${k(2)} ${k(7)}`, 'stroke-width': k(2) }, o.svg);
      o.diag = el('line', { x1: k(385), y1: k(900), x2: k(385), y2: k(900), stroke: 'rgba(243,237,227,0.78)', 'stroke-width': k(2) }, o.svg);
      o.ft = mk(g, { right: px(W - k(1540)), top: px(k(250)), fontFamily: '"Space Mono"', fontSize: px(k(15)), letterSpacing: '0.12em', color: 'rgba(243,237,227,0.7)', lineHeight: '1' }); o.ft.textContent = 'f(t) = t';
    }
    return o;
  });
  S6.flood = mk(root, { width: px(k(60)), height: px(k(60)), borderRadius: '50%', background: C.orange, display: 'none', zIndex: '40' });
}
function layout6() {
  S6.cards.forEach(o => { o.g.style.display = 'block'; o.g.style.visibility = 'hidden'; });
  for (const o of S6.cards) {
    if (o.rows) { o.rows.forEach(r => fitWord(r, k(2900))); fitWord(o.main, k(2500)); continue; }
    fitWord(o.w, W * o.c.frac); placeWord(o.w, W / 2 - (o.c.dot ? k(36) : 0), H * 0.47);
  }
  S6.cards.forEach(o => { o.g.style.visibility = 'visible'; });
  S6.laid = true;
}
function render6(T) {
  if (!S6.laid) layout6();
  let idx = CARD_T.findIndex((a, i) => T >= a && T < CARD_T[i + 1]); if (idx < 0) idx = T < 11.25 ? 0 : 6;
  S6.bg.style.background = CARDS[idx].bg;
  S6.cards.forEach((o, i) => { o.g.style.display = i === idx ? 'block' : 'none'; });
  const o = S6.cards[idx], c = o.c, t = T - CARD_T[idx], p = clamp(t / 0.16);
  const cx = W / 2, cy = H * 0.47;
  if (c.id === 'ease1' || c.id === 'ease2') {
    o.w.letters.forEach((L, i) => {
      const lp = clamp((t - i * (c.id === 'ease2' ? 0.026 : 0.012)) / 0.15), e = outBack(lp, 1.2);
      if (c.id === 'ease1') { L.node.style.transform = `translateX(${((1 - e) * k(520) * (1 + i * 0.15)).toFixed(1)}px) scaleX(${(1 + (1 - lp) * 0.7).toFixed(3)})`; dblur(L.node, `e1-${i}`, (1 - lp) * k(70), 0); }
      else { L.node.style.transform = `translateY(${((1 - e) * k(700)).toFixed(1)}px) scaleY(${(1 + (1 - lp) * 0.6).toFixed(3)})`; dblur(L.node, `e2-${i}`, 0, (1 - lp) * k(60)); }
    });
  } else if (c.id === 'in' || c.id === 'out') {
    const dir = c.id === 'in' ? 1 : -1;
    o.w.letters.forEach((L, i) => { const lp = clamp((t - i * 0.02) / 0.15), e = outExpo(lp); L.node.style.transform = `translateX(${((1 - e) * dir * k(900) * (1 + i * 0.2)).toFixed(1)}px)`; dblur(L.node, `${c.id}-${i}`, (1 - lp) * k(80), 0); });
    const dp = clamp(spr(T, CARD_T[idx] + 0.07, 0.3, 0.4)), r = o.w.row.getBoundingClientRect();
    o.dotEl.style.left = px(W / 2 - k(36) + o.w.fullWidth / 2 + k(4)); o.dotEl.style.top = px(cy + o.w.size * 0.16);
    o.dotEl.style.transform = `scale(${dp})`;
  } else if (c.id === 'never') {
    o.w.letters.forEach((L, i) => {
      const lp = clamp((t - i * 0.016) / 0.14), e = outBack(lp, 1.4), ang = (1 - lp) * (18 + i * 8) * (i % 2 ? 1 : -1);
      L.node.style.transform = `translate(${((1 - e) * k(160) * i * 0.4).toFixed(1)}px, ${(-(1 - e) * k(520)).toFixed(1)}px) rotate(${ang.toFixed(1)}deg)`;
      dblur(L.node, `nv-${i}`, (1 - lp) * k(30), (1 - lp) * k(50));
    });
  } else if (c.id === 'rows') {
    const x = k(-300);
    o.rows.forEach((r, i) => { const rowY = H * (0.04 + i * 0.115) + k(0); const dir = i % 2 ? 1 : -1; r.row.style.left = px(x + dir * t * k(500) - (i % 2) * k(500)); r.row.style.top = px(rowY); r.row.style.opacity = String(i === 4 ? 0 : 1); });
    o.main.row.style.left = px(k(-260) - t * k(380)); o.main.row.style.top = px(H * 0.04 + 4 * H * 0.115);
    o.rows.forEach(r => { r.row.style.webkitTextStroke = `${Math.max(1, k(2))}px rgba(14,14,16,0.5)`; });
  } else if (c.id === 'linear') {
    const lp = clamp(t / 0.07), reveal = 0.3 + 0.7 * lp; // linear: constant-speed left→right wipe (the first letters are already in on the cut)
    o.w.row.style.clipPath = `inset(0 ${(100 - reveal * 100).toFixed(2)}% 0 0)`;
    const drift = -t * k(46); o.w.row.style.transform = `translateX(${drift.toFixed(2)}px)`; dblur(o.w.row, 'lin', k(26) * (1 - clamp(t / 0.1)), 0);
    const tt = clamp(t / 0.45), x2 = k(385) + tt * k(520), y2 = k(900) - tt * k(300);
    o.diag.setAttribute('x2', x2); o.diag.setAttribute('y2', y2);
    o.ft.style.opacity = String(sm(0.1, 0.3, t));
    const dp = clamp(spr(T, CARD_T[idx] + 0.05, 0.3, 0.3));
    o.dotEl.style.left = px(W / 2 - k(36) + o.w.fullWidth / 2 + k(4) + drift); o.dotEl.style.top = px(cy + o.w.size * 0.16); o.dotEl.style.transform = `scale(${dp})`;
  }
  // the full stop of LINEAR grows into the orange field
  const grow = ramp(T, 13.05, 13.35), bx = W / 2 - k(36) + S6.cards[6].w.fullWidth / 2 + k(34) - Math.max(0, T - CARD_T[6]) * k(46), by = cy + S6.cards[6].w.size * 0.16 + k(30);
  S6.flood.style.display = grow > 0 ? 'block' : 'none';
  const rr = k(30) + (Math.hypot(W, H) * 1.05) * Math.pow(grow, 2.4);
  S6.flood.style.left = px(bx - rr); S6.flood.style.top = px(by - rr); S6.flood.style.width = px(2 * rr); S6.flood.style.height = px(2 * rr);
  dblur(S6.cards[6].w.row, 'lin', Math.max(0, k(26) * (1 - clamp((T - 12.65) / 0.1))) + grow * k(30), 0);
}

// =====================================================================================================
// 7 FIN (13.35–15): the burst glyph blooms with confetti, the wordmark and subtitle build around it, then a held lock-up.
const S7 = {};
function init7(root) {
  S7.ring = mk(root, { width: px(k(300)), height: px(k(300)), borderRadius: '50%', border: `${Math.max(1, k(3))}px solid rgba(255,230,210,0.9)`, opacity: '0', boxSizing: 'border-box' });
  S7.svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, root);
  S7.conf = Array.from({ length: 46 }, (_, i) => { const kind = hash(i, 0, 3) < 0.55 ? 'dot' : hash(i, 0, 3) < 0.8 ? 'tri' : 'ring'; const cc = [C.ink, C.cream, C.blue, '#FFFFFF'][Math.floor(hash(i, 0, 4) * 4)]; return { kind, node: el(kind === 'ring' ? 'circle' : kind === 'dot' ? 'circle' : 'path', { fill: kind === 'ring' ? 'none' : cc, stroke: kind === 'ring' ? cc : 'none', 'stroke-width': k(2.4) }, S7.svg) }; });
  S7.glyph = el('path', { d: '', fill: 'none', stroke: C.ink, 'stroke-width': k(34), 'stroke-linecap': 'round' }, S7.svg);
  S7.word = word(root, 'CLAUDE', { wdth: 125, wght: 900, size: k(220), track: -0.015, color: C.ink });
  S7.sub = word(root, 'motion designer', { font: 'Instrument Serif', style: 'italic', wght: 400, wdth: 100, size: k(100), track: 0, color: C.ink, css: { overflow: 'hidden' } });
  S7.rule = mk(root, { left: px(k(517)), top: px(k(729)), width: px(k(1149)), height: px(Math.max(1.5, k(2.2))), background: C.ink, transformOrigin: '0 50%' });
  S7.credit = mk(root, { left: px(k(517)), top: px(k(748)), fontFamily: '"Space Mono"', fontSize: px(k(17)), letterSpacing: '0.1em', color: C.ink, lineHeight: '1', whiteSpace: 'pre', textTransform: 'uppercase' });
  S7.credit.textContent = 'SHOWREEL 2026   ·   15 SECONDS   ·   EVERY FRAME WRITTEN IN CODE        ◉        AVAILABLE FOR NEW PROJECTS';
  S7.top = mk(root, { left: px(k(288)), top: px(k(142)), width: px(k(1344)), height: px(Math.max(1.5, k(2.2))), background: C.ink, opacity: '0.0' });
}
function layout7() {
  fitWord(S7.word, k(1148)); S7.word.row.style.left = px(k(517)); S7.word.row.style.top = px(k(478) - S7.word.size * 0.36);
  S7.sub.row.style.fontSize = '100px'; const w100 = S7.sub.row.getBoundingClientRect().width; S7.sub.size = 100 * k(610) / w100; S7.sub.row.style.fontSize = px(S7.sub.size); S7.sub.fullWidth = k(610);
  S7.sub.row.style.left = px(k(517)); S7.laid = true;
}
function render7(T) {
  if (!S7.laid) layout7();
  const t = T - 13.35, cx = W / 2, cy = H / 2, endX = k(343), endY = k(480);
  // ring pulse from the flood
  const rp = clamp(t / 0.7);
  S7.ring.style.opacity = String(rp > 0 && rp < 1 ? 0.9 * (1 - rp) : 0);
  const rs = k(160) + rp * k(1500); S7.ring.style.width = S7.ring.style.height = px(rs * 2); S7.ring.style.left = px(cx - rs); S7.ring.style.top = px(cy - rs);
  // glyph: blooms at the centre (spring), then glides to the lock-up position while the wordmark builds
  const bloom = i => clamp(spr(T, 13.4 + i * 0.012, 0.5, 0.35));
  const glide = inOut3(ramp(T, 13.82, 14.3));
  const gx = lerp(cx, endX, glide), gy = lerp(cy, endY, glide), gR = lerp(k(150), k(95), glide) * (1 + 0.04 * Math.sin(T * 7) * (1 - glide));
  S7.glyph.setAttribute('d', burstPath(12, gR, 11, bloom, T * 0.5 * (1 - glide), 0.14, 0.2));
  S7.glyph.setAttribute('stroke-width', lerp(k(36), k(26), glide));
  S7.glyph.setAttribute('transform', `translate(${gx.toFixed(1)} ${gy.toFixed(1)})`);
  // confetti: analytic outward flight, then slow drift
  S7.conf.forEach((c, i) => {
    const a = hash(i, 1, 7) * Math.PI * 2, sp = k(300 + hash(i, 2, 7) * 900), tt = Math.max(0, T - 13.42 - hash(i, 3, 7) * 0.1);
    const flight = 1 - Math.exp(-tt * 3.6), x = cx + Math.cos(a) * sp * flight + noise1(T * 0.4 + i, 3) * k(14) * flight, y = cy + Math.sin(a) * sp * 0.62 * flight + noise1(T * 0.4 + i, 9) * k(14) * flight + tt * k(8);
    const sz = k(3 + hash(i, 4, 7) * 6), vis = tt > 0 ? 1 : 0;
    if (c.kind === 'tri') { const g = hash(i, 5, 7) * 6 + T; c.node.setAttribute('d', [0, 1, 2].map(j => `${j ? 'L' : 'M'}${(x + Math.cos(g + j * 2.094) * sz * 1.5).toFixed(1)} ${(y + Math.sin(g + j * 2.094) * sz * 1.5).toFixed(1)}`).join('') + 'Z'); }
    else { c.node.setAttribute('cx', x); c.node.setAttribute('cy', y); c.node.setAttribute('r', c.kind === 'ring' ? sz * 1.3 : sz); }
    c.node.style.opacity = String(vis * 0.95 * (1 - 0.9 * sm(14.25, 14.7, T)));
  });
  // wordmark: letters sweep in from behind the glyph with width + blur, subtitle rises, rule draws, credit fades
  S7.word.letters.forEach((L, i) => {
    const s0 = 13.92 + i * 0.045, p = clamp(spr(T, s0, 0.45, 0.2)), wd = lerp(62, 125, clamp(outBack(clamp((T - s0) / 0.38), 1.4)));
    setWidth(L, Math.min(125, Math.max(62, wd)));
    L.node.style.transform = `translateX(${((1 - p) * -k(240)).toFixed(1)}px)`; L.node.style.opacity = String(clamp(p * 3));
    dblur(L.node, `w7-${i}`, (1 - p) * k(36), 0);
  });
  const sp = outExpo(ramp(T, 14.3, 14.65));
  S7.sub.row.style.top = px(k(643) - S7.sub.size * 0.36 + (1 - sp) * S7.sub.size * 0.9); S7.sub.row.style.height = px(S7.sub.size * 1.18); S7.sub.row.style.clipPath = `inset(0 0 ${(1 - sp) * 55}% 0)`; S7.sub.row.style.opacity = sp > 0 ? '1' : '0';
  S7.rule.style.transform = `scaleX(${curves.decelerate(ramp(T, 14.4, 14.85)).toFixed(4)})`;
  S7.credit.style.opacity = String(sm(14.35, 14.6, T));
}

// =====================================================================================================
const SCENES = [
  { id: 'intro', a: 0, b: 2.1, bg: C.ink, init: init0, render: render0 },
  { id: 'ident', a: 1.875, b: 3.5, bg: C.orange, init: init1, render: render1 },
  { id: 'ease', a: 3.5, b: 5.625, bg: C.cream, init: init2, render: render2 },
  { id: 'morph', a: 5.625, b: 7.5, bg: C.blue, init: init3, render: render3 },
  { id: 'truchet', a: 7.5, b: 9.375, bg: C.ink, init: init4, render: render4 },
  { id: 'depth', a: 9.375, b: 11.25, bg: C.ink, init: init5, render: render5 },
  { id: 'type', a: 11.25, b: 13.4, bg: C.orange, init: init6, render: render6 },
  { id: 'fin', a: 13.35, b: 15.01, bg: C.orange, init: init7, render: render7 },
];

export default {
  duration: 15, fps: FPS,
  init(st, { W: w, H: h }) {
    stage = st; W = w; H = h; K = w / 1920;
    stage.style.background = C.ink;
    SCENES.forEach((s, i) => { s.root = mk(stage, { left: '0', top: '0', width: px(W), height: px(H), overflow: 'hidden', background: s.bg, zIndex: String(i + 1), display: 'none' }); s.init(s.root); });
    irisRim = mk(stage, { borderRadius: '50%', background: 'transparent', boxShadow: `0 0 0 ${k(34)}px ${C.cream}, 0 0 0 ${k(40)}px ${C.violet}`, zIndex: '3', display: 'none', pointerEvents: 'none' });
    initHud();
  },
  render(T) {
    // iris (1.875–2.0): the ident scene is only visible inside a circle that grows from the centre
    for (const s of SCENES) {
      let on = T >= s.a && T < s.b;
      if (s.id === 'ident' && T >= 3.5) on = false;
      s.root.style.display = on ? 'block' : 'none';
    }
    const ident = SCENES[1].root, iris = ramp(T, 1.875, 2.08);
    if (T >= 1.875 && T < 2.1) {
      const R = outExpo(iris) * Math.hypot(W, H) * 0.56 + k(4);
      ident.style.clipPath = `circle(${R.toFixed(1)}px at 50% 50%)`;
      irisRim.style.display = 'block'; irisRim.style.width = irisRim.style.height = px(2 * R); irisRim.style.left = px(W / 2 - R); irisRim.style.top = px(H / 2 - R);
      irisRim.style.opacity = String(1 - sm(0.85, 1, iris));
    } else { ident.style.clipPath = 'none'; irisRim.style.display = 'none'; }
    for (const s of SCENES) if (s.root.style.display === 'block') s.render(T);
    renderHud(T);
  },
};
let irisRim;
