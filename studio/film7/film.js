// Film 7 — Pixel Plus — «من فكرة صغيرة… لأنظمة بتشتغل كل يوم» — 3:00 company presentation, YouTube 1920×1080 @ 30 fps.
// One hero: the blue pixel of the logo's i-dot. It lands on a calm page, orders the chaos of daily manual work into a system,
// becomes the logo, appears on a TV in a 3D factory studio, drives four project windows, orbits the results, walks the method
// path and finally bursts into 1,699 traced pixels that build the logo. Light theme, El Messiri + IBM Plex Sans Arabic
// (+ Instrument Serif italic for Latin accents). Every frame is a closed-form function of t (springs, seeded hashes, a 3D
// camera computed from t): any frame renders identically in any order. Shared clock with the score: ./timing.js.
import { clamp, lerp, ramp, ease, el, textLine } from '../lib/motion.js';
import { springStep, springTrack, hash, noise1 } from '../lib/kinetics.js';
import { cursorAt, cursorClick, circleWipe, assembly, flight, ripple, twinkle } from '../lib/uimorph.js';
import { typeOn, caretVisible, orbitPoint } from '../lib/uimotion.js';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CH, CHAPTERS, T } from './timing.js';

const C = {
  paper: '#F7F6F2', paper2: '#EEF0F3', ink: '#1F2328', ink2: '#3A414B', grey: '#6B7480', grey2: '#A3AAB3', line: '#E3E6EB',
  blue: '#0A66FF', blueD: '#0846D6', cyan: '#18B6FF', navy: '#0732AF', amber: '#E8A33D', green: '#1E9E62', white: '#FFFFFF',
};
const PAPER_BG = 'radial-gradient(ellipse 80% 70% at 50% 42%, #FFFFFF 0%, #F7F6F2 58%, #ECEDEF 100%)';
const PIX_BG = 'linear-gradient(135deg, #2C88FF 0%, #0A5EF5 60%, #0846D6 100%)';
const PIX_SHADOW = '0 14px 30px rgba(10,80,230,0.28), 0 3px 8px rgba(10,60,200,0.22)';
const CARD_SHADOW = '0 30px 60px rgba(31,35,40,0.10), 0 6px 16px rgba(31,35,40,0.08)';
const DISPLAY = "'El Messiri'", TEXT = "'Plex Arabic'", SERIF = "'Instrument Serif'";
const FPS = 30;
let W = 1920, H = 1080, stage, LOGO;
const S = {}, SC = [];

// ---------- helpers ----------
const px = (v) => `${(+v).toFixed(2)}px`;
const oE = ease.outExpo, ioC = ease.inOutCubic, oC = ease.outCubic;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const pulse = (t, t0, d) => Math.pow(Math.sin(Math.PI * clamp((t - t0) / d)), 2);
const spr = (t, start, duration = 0.5, bounce = 0.15) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const place = (n, x, y, w, h, r) => { n.style.left = px(x - w / 2); n.style.top = px(y - h / 2); n.style.width = px(Math.max(0, w)); n.style.height = px(Math.max(0, h)); if (r !== undefined) n.style.borderRadius = px(Math.max(0, r)); };
const setBlur = (n, b) => { n.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : 'none'; };
const show = (n, v) => { n.style.display = v ? 'block' : 'none'; };
const vis = (n, o) => { n.style.opacity = clamp(o).toFixed(3); n.style.visibility = o > 0.002 ? 'visible' : 'hidden'; };

// Text line of word spans (.line/.word: the studio reads it back for safe-area/overlap checks).
// align: 'center' | 'right' (x = right edge) | 'left' (x = left edge). Arabic is RTL; Latin lines pass dir: 'ltr'.
function line(parent, text, { x = W / 2, y, size, weight = 500, font = TEXT, color = C.ink, align = 'center', width = 1600, dir = 'rtl', lh = 1.3, z = 10, accent = {}, track = 0, italic = false }) {
  const left = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  const justify = align === 'center' ? 'center' : (align === 'right') === (dir === 'rtl') ? 'flex-start' : 'flex-end';
  const L = textLine(parent, text, { left: px(left), top: px(y - (size * lh) / 2), width: px(width), justifyContent: justify, fontFamily: font, fontSize: px(size),
    fontWeight: String(weight), color, lineHeight: String(lh), direction: dir, zIndex: String(z), letterSpacing: `${track}em`, fontStyle: italic ? 'italic' : 'normal' });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; });
  return L;
}
// Words rise out of blur, staggered; leave upward. Returns nothing; hides the line outside its life.
function rise(L, t, tIn, tOut = 999, { stagger = 0.06, dur = 0.8, dy = 34, blur = 12, outDur = 0.4, outDy = -22, scale0 = 1 } = {}) {
  const live = t >= tIn - 0.01 && t <= tOut + outDur + L.words.length * 0.025 + 0.02;
  L.line.style.display = live ? 'flex' : 'none';
  if (!live) return;
  const n = L.words.length;
  L.words.forEach((w, k) => {
    const i = n - 1 - k < 0 ? k : k; // reading order = DOM order (first word is rightmost in RTL)
    const a = tIn + i * stagger, pin = oE(ramp(t, a, a + dur)), b0 = tOut + i * 0.025, pout = ioC(ramp(t, b0, b0 + outDur));
    w.style.opacity = (clamp(pin * 1.35) * (1 - pout)).toFixed(3);
    w.style.transform = `translateY(${((1 - pin) * dy + pout * outDy).toFixed(2)}px) scale(${lerp(scale0, 1, pin).toFixed(4)})`;
    setBlur(w, (1 - pin) * blur + pout * 10);
  });
}
// A big decorative keyword behind the action (reference grammar: words slammed behind the subject). Graphic, not read back.
function slam(parent, text, { x, y, size = 300, z = 1, color = 'rgba(10,102,255,0.055)', stroke = 'rgba(10,102,255,0.20)' }) {
  const n = div(parent, { width: px(W), left: px(x - W / 2), top: px(y - size * 0.62), textAlign: 'center', fontFamily: DISPLAY, fontWeight: '700', fontSize: px(size), lineHeight: '1.25',
    color, WebkitTextStroke: `1.6px ${stroke}`, whiteSpace: 'nowrap', direction: 'rtl', zIndex: String(z), pointerEvents: 'none', transformOrigin: '50% 55%' });
  n.textContent = text;
  return n;
}
function slamAt(n, t, tIn, tOut, { drift = 18 } = {}) {
  const a = oE(ramp(t, tIn, tIn + 0.9)), b = ioC(ramp(t, tOut, tOut + 0.5));
  vis(n, a * (1 - b));
  n.style.transform = `translateX(${(noise1(t * 0.15, 3) * drift).toFixed(1)}px) scale(${(lerp(1.1, 1, a) + 0.03 * ramp(t, tIn, tOut) + 0.06 * b).toFixed(4)})`;
  setBlur(n, (1 - a) * 18 + b * 14);
  // the word "inks in": El Messiri is a variable font (wght 400–700), so the stroke thickens as it lands and thins as it leaves
  n.style.fontVariationSettings = `'wght' ${Math.round(lerp(400, 700, oC(ramp(t, tIn, tIn + 1.4))) - 200 * b)}`;
}
// A light sweep across a traced logo (right → left, the reading direction): each part brightens as the band passes its centre.
// Dark letters need a stronger lift than blue/grey ones to read as the same light.
function logoSheen(parts, t, t0, { dur = 1.1 } = {}) {
  const xs = parts.map((p) => (p.bb[0] + p.bb[2]) / 2), x0 = Math.min(...xs), x1 = Math.max(...xs);
  return parts.map((p, k) => {
    const u = 1 - (xs[k] - x0) / (x1 - x0), local = (t - t0) / dur - u * 0.55;
    const bump = local > 0 && local < 0.45 ? Math.pow(Math.sin((Math.PI * local) / 0.45), 2) : 0;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(p.col.slice(i, i + 2), 16)), lum = (r + g + b) / 3;
    return bump * (lum < 80 ? 1.5 : b > r + 60 ? 0.4 : 0.55);
  });
}
const partFilter = (im, blur, glow) => {
  const f = `${blur > 0.15 ? `blur(${blur.toFixed(2)}px) ` : ''}${glow > 0.005 ? `brightness(${(1 + glow).toFixed(3)}) saturate(${(1 + 0.3 * glow).toFixed(3)})` : ''}`.trim();
  im.style.filter = f || 'none';
};
const PIXEL = (parent, z = 20) => div(parent, { background: PIX_BG, boxShadow: PIX_SHADOW, zIndex: String(z) });
// Simple line icons (24-unit viewBox), stroke = currentColor.
const ICONS = {
  report: 'M6 3h9l4 4v14H6z M15 3v4h4 M9 12h7 M9 16h7',
  data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  plan: 'M4 5h16v15H4z M4 9h16 M9 3v4 M15 3v4 M8 13h3 M8 16h6',
  chart: 'M4 20V4 M4 20h16 M8 16v-4 M12 16V8 M16 16v-6',
  chat: 'M4 5h16v11H9l-5 4z M8 9h8 M8 12h5',
  decide: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M8.5 12l2.5 2.5 4.5-5',
  train: 'M3 8l9-4 9 4-9 4z M7 10v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5',
  system: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M7.8 7.8l2.1 2.1 M14.1 14.1l2.1 2.1 M7.8 16.2l2.1-2.1 M14.1 9.9l2.1-2.1 M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 7v5l3 2',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z M8.5 12l2.5 2.5 4.5-5',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M16 11a3 3 0 1 0 0-6 M17 14c2.4.4 4 2.6 4 5',
  ai: 'M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  excel: 'M4 4h16v16H4z M9 8l6 8 M15 8l-6 8',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  gear: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
};
function icon(parent, name, { size = 28, color = C.blue, width = 1.8, style = {} } = {}) {
  const s = el('svg', { viewBox: '0 0 24 24', width: size, height: size, style: { position: 'absolute', overflow: 'visible', color, ...style } }, parent);
  el('path', { d: ICONS[name], fill: 'none', stroke: 'currentColor', 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s);
  return s;
}
// A white card ("window") with soft shadow and an optional title bar (graphic UI, not read back).
function card(parent, { w, h, title, z = 5, radius = 18, bg = '#FFFFFF' } = {}) {
  const n = div(parent, { width: px(w), height: px(h), background: bg, borderRadius: px(radius), boxShadow: CARD_SHADOW, zIndex: String(z), overflow: 'hidden', transformOrigin: '50% 50%' });
  if (title !== undefined) {
    const bar = div(n, { width: '100%', height: '44px', background: '#F6F7F9', borderBottom: `1px solid ${C.line}` });
    ['#FF6B6B', '#FFC24B', '#3DCB7A'].forEach((c, i) => div(bar, { width: '11px', height: '11px', borderRadius: '50%', background: c, left: px(18 + i * 19), top: '16px', opacity: '0.85' }));
    if (title) { const tt = div(bar, { left: 'auto', right: '20px', top: '10px', fontFamily: TEXT, fontSize: '18px', color: C.grey, whiteSpace: 'nowrap', direction: 'rtl' }); tt.textContent = title; }
  }
  return n;
}
const txt = (parent, text, style = {}) => { const n = div(parent, { fontFamily: TEXT, whiteSpace: 'nowrap', ...style }); n.textContent = text; return n; };
// Cursor (dark arrow) with click ring.
function makeCursor(parent, z = 80) {
  const ring = div(parent, { width: '84px', height: '84px', borderRadius: '50%', border: '3px solid rgba(10,102,255,0.55)', zIndex: String(z - 1), opacity: '0' });
  const s = el('svg', { width: 40, height: 54, viewBox: '0 0 44 60', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: String(z), transformOrigin: '4px 3px', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.20))', display: 'none' } }, parent);
  el('path', { d: 'M4 3 L4 45 L14.5 35 L21.5 51.5 L29 48.5 L22 32.5 L36.5 32.5 Z', fill: C.ink, stroke: '#FFFFFF', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, s);
  return { s, ring };
}
function renderCursor(c, t, keys, clicks = []) {
  const t0 = keys[0].t, t1 = keys[keys.length - 1].t, on = t >= t0 && t <= t1 + 0.25;
  c.s.style.display = on ? 'block' : 'none';
  if (on) {
    const p = cursorAt(keys, t), k = cursorClick(t, clicks), o = sm(t0, t0 + 0.22, t) * (1 - sm(t1, t1 + 0.25, t));
    c.s.style.transform = `translate(${(p.x - 4).toFixed(1)}px, ${(p.y - 3).toFixed(1)}px) scale(${k.scale.toFixed(3)})`;
    c.s.style.opacity = o.toFixed(3);
    if (k.ring.opacity > 0) { c.ring.style.transform = `translate(${(p.x - 42).toFixed(1)}px, ${(p.y - 42).toFixed(1)}px) scale(${(k.ring.r / 42).toFixed(3)})`; c.ring.style.opacity = k.ring.opacity.toFixed(3); }
    else c.ring.style.opacity = '0';
  } else c.ring.style.opacity = '0';
}

// ---------- logo (traced from the owner's file: film7/plates, never redrawn) ----------
// parts: 0 P · 1 i-dot · 2 l · 3 i-stem · 4 x-blue · 5 x-arm · 6 e · 7 x-arm · 8 P · 9 l · 10 plus · 11 u · 12 s
const SRC = { x0: 145, y0: 383, x1: 1109, y1: 864 }; // logo ink bbox in source px
function buildLogo(parent, { width, cx, top, z = 10 }) {
  const LS = width / (SRC.x1 - SRC.x0), LX = cx - width / 2 - SRC.x0 * LS, LY = top - SRC.y0 * LS;
  const box = div(parent, { zIndex: String(z), transformOrigin: '0 0', transform: `translate(${LX.toFixed(3)}px, ${LY.toFixed(3)}px) scale(${LS.toFixed(5)})` });
  const [cx0, cy0, cx1, cy1] = LOGO.crop, shift = (d) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, a, b) => `${(+a - cx0).toFixed(2)} ${(+b - cy0).toFixed(2)}`);
  const parts = LOGO.parts.map((p) => {
    const im = el('img', { src: new URL('./plates/logo-color.png', import.meta.url).href, style: { position: 'absolute', left: px(cx0), top: px(cy0), width: px(cx1 - cx0), height: px(cy1 - cy0), clipPath: `path('${shift(p.d)}')`, opacity: '0' } }, box);
    const [a, b, c, d] = p.bbox; im.style.transformOrigin = `${((a + c) / 2 - cx0).toFixed(1)}px ${((b + d) / 2 - cy0).toFixed(1)}px`;
    return { im, bb: p.bbox, col: p.color };
  });
  const toScr = (x, y) => [LX + x * LS, LY + y * LS];
  return { box, parts, toScr, LS };
}

// ---------- pixel grid (the page) ----------
function dotGrid(parent, { step = 48, size = 3, z = 0 } = {}) {
  const cv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: String(z) } }, parent);
  const g = cv.getContext('2d'), cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1, ox = (W - (cols - 1) * step) / 2, oy = (H - (rows - 1) * step) / 2;
  return { cv, draw(t, boost, alpha = 0.075) {
    g.clearRect(0, 0, W, H); g.fillStyle = `rgba(31,35,40,${alpha})`; const hot = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = ox + i * step, y = oy + j * step, b = boost(x, y, i, j);
      if (b > 0.02) hot.push([x, y, Math.min(1, b)]); else g.fillRect(x - size / 2, y - size / 2, size, size);
    }
    for (const [x, y, b] of hot) { const s = size * (1 + 1.6 * b); g.fillStyle = `rgba(10,102,255,${(alpha + (0.85 - alpha) * b).toFixed(3)})`; g.fillRect(x - s / 2, y - s / 2, s, s); }
  } };
}

// =====================================================================================================
// OPEN 0–12 — a pixel lands, draws the line, the promise resolves; the pixel then flies up to become the HUD mark.
const OPEN_BEATS = [6.0, 9.0]; // bar lines of the opening hold (80 BPM: a bar is 3 s)
SC.push({ id: 'open', a: CH.open[0], b: CH.open[1], z: 10, init(root) {
  const cam = div(root, { width: px(W), height: px(H), transformOrigin: '50% 48%' });
  const l1 = line(cam, 'من فكرة صغيرة', { y: 405, size: 112, weight: 600, font: DISPLAY, color: C.ink, lh: 1.25 });
  const l2 = line(cam, 'لأنظمة بتشتغل كل يوم', { y: 545, size: 112, weight: 700, font: DISPLAY, color: C.ink, lh: 1.25, accent: { 0: C.blue } });
  const sub = line(cam, 'عرض تقديمي للشركة', { y: 752, size: 34, weight: 400, color: C.grey }); // Arabic only: textLine splits on every space (incl. NBSP), which reverses Latin pairs in RTL
  const hair = div(cam, { height: '3px', top: '668px', background: 'linear-gradient(90deg, rgba(10,102,255,0), #0A66FF 50%, rgba(10,102,255,0))', zIndex: '3' });
  const pix = PIXEL(root, 30);
  const rings = OPEN_BEATS.map(() => div(root, { borderRadius: '50%', border: '2px solid rgba(10,102,255,0.55)', zIndex: '29', opacity: '0' }));
  S.open = { cam, l1, l2, sub, hair, pix, rings };
}, render(t) {
  const s = S.open;
  // heartbeat on the bar lines of the hold: the pixel breathes, one thin ring, the grid ripples (renderGlobal)
  s.rings.forEach((r, i) => { const u = ramp(t, OPEN_BEATS[i], OPEN_BEATS[i] + 1.4); if (u <= 0 || u >= 1) { r.style.opacity = '0'; return; } const rr = lerp(20, 260, oE(u)); place(r, 960, 683, 2 * rr, 2 * rr, rr); r.style.opacity = (0.6 * Math.pow(1 - u, 1.5)).toFixed(3); });
  s.cam.style.transform = `scale(${(1 + 0.03 * ioC(ramp(t, 2, 10))).toFixed(4)})`;
  // the pixel: fall, squash on landing, rest as the "full stop" of the page, then fly to the HUD mark
  let x = 960, y = 668, w = 30, h = 30;
  if (t < T.land) { const u = ramp(t, 0.15, T.land); y = lerp(-60, 668, u * u); w = 30 * (1 - 0.12 * u); h = 30 * (1 + 0.25 * u); }
  else if (t < 10.4) { const tau = t - T.land, d = Math.exp(-tau * 7) * Math.cos(tau * 22), beat = OPEN_BEATS.reduce((m, b) => m + 0.22 * pulse(t, b - 0.08, 0.36), 0); w = 30 * (1 + 0.35 * d + beat); h = 30 * (1 - 0.32 * d + beat); y = 668 + (30 - h) / 2; }
  else { const u = ioC(ramp(t, 10.4, 11.5)); x = lerp(960, 112, u); y = lerp(668, 76, u) - 160 * Math.sin(Math.PI * u); w = h = lerp(30, 16, u); }
  place(s.pix, x, y, w, h, Math.min(w, h) * 0.22);
  vis(s.pix, t < 11.55 ? 1 : 1 - sm(11.55, 11.7, t));
  // hairline grows from the pixel, retracts into it before the exit
  const hw = 620 * oE(ramp(t, 1.6, 3.0)) * (1 - ioC(ramp(t, 9.5, 10.3)));
  place(s.hair, 960, 669, hw, 3); vis(s.hair, hw > 2 ? 0.85 : 0);
  rise(s.l1, t, 2.2, 9.6, { stagger: 0.09, dy: 44 });
  rise(s.l2, t, 3.1, 9.7, { stagger: 0.09, dy: 44 });
  rise(s.sub, t, 4.6, 9.4, { stagger: 0.07, dy: 22, blur: 8 });
} });

// =====================================================================================================
// PROBLEM 12–40 — the daily pile-up: windows of manual work arrive one after another while the facts stack on the right.
const PROBLEM_CARDS = [ // final messy pose: centre x, y, w, h, rotation°, kind, title
  { x: 420, y: 450, w: 520, h: 330, r: -5, kind: 'sheet', title: 'تقرير_المخزون_نهائي.xlsx' },
  { x: 760, y: 400, w: 460, h: 270, r: 4, kind: 'mail', title: 'Re: Fw: تحديث الأرقام' },
  { x: 560, y: 640, w: 540, h: 340, r: 3, kind: 'sheet', title: 'خطة_الإنتاج_v7_نهائي٢.xlsx' },
  { x: 900, y: 600, w: 290, h: 250, r: -7, kind: 'note', title: null },
  { x: 300, y: 740, w: 300, h: 260, r: 6, kind: 'clock', title: '' },
  { x: 880, y: 820, w: 420, h: 190, r: -3, kind: 'chat', title: 'المحادثة' },
  { x: 380, y: 360, w: 470, h: 300, r: 8, kind: 'sheet', title: 'نسخة_من_نسخة_من_التقرير.xlsx' },
];
const RING = Array.from({ length: 6 }, (_, i) => { const a = Math.PI * (0.5 + i / 6 * 2) + Math.PI / 6; return { x: 960 + Math.cos(a) * 600, y: 520 + Math.sin(a) * 240 }; });
const RING_LABELS = [['report', 'تقارير'], ['data', 'بيانات'], ['plan', 'تخطيط'], ['chart', 'متابعة'], ['chat', 'تواصل'], ['decide', 'قرارات']];
function sheetContent(n, w, h, seed) {
  const g = div(n, { left: '0', top: '44px', width: px(w), height: px(h - 44) });
  const cols = 6, rows = Math.floor((h - 60) / 34), cw = (w - 40) / cols;
  for (let r = 0; r <= rows; r++) div(g, { left: '20px', top: px(12 + r * 34), width: px(w - 40), height: '1px', background: C.line });
  for (let c = 0; c <= cols; c++) div(g, { left: px(20 + c * cw), top: '12px', width: '1px', height: px(rows * 34), background: C.line });
  div(g, { left: '20px', top: '12px', width: px(w - 40), height: '34px', background: 'rgba(30,158,98,0.10)' });
  for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) if (hash(r, c, seed) > 0.35) div(g, { left: px(28 + c * cw), top: px(24 + r * 34), width: px((cw - 18) * (0.35 + 0.6 * hash(c, r, seed + 1))), height: '9px', borderRadius: '5px', background: hash(r, c, seed + 2) > 0.85 ? 'rgba(232,163,61,0.55)' : '#DDE1E7' });
}
SC.push({ id: 'problem', a: CH.problem[0], b: CH.problem[1], z: 12, init(root) {
  const sl = slam(root, 'العمل اليدوي', { x: 680, y: 570, size: 215 });
  const cards = PROBLEM_CARDS.map((p, i) => {
    const n = card(root, { w: p.w, h: p.h, title: p.title === null ? undefined : p.title, z: 5 + i, bg: p.kind === 'note' ? '#FFF6CC' : '#FFFFFF', radius: p.kind === 'note' ? 6 : 18 });
    if (p.kind === 'sheet') sheetContent(n, p.w, p.h, 11 + i);
    if (p.kind === 'mail') { for (let k = 0; k < 5; k++) div(n, { left: '28px', top: px(72 + k * 34), width: px((p.w - 56) * (k === 0 ? 0.55 : 0.92 - 0.12 * hash(k, 3))), height: '10px', borderRadius: '5px', background: k === 0 ? '#C9CED6' : '#E4E7EC' }); }
    if (p.kind === 'note') { txt(n, 'ابعتلي آخر نسخة تاني', { left: 'auto', right: '26px', top: '58px', fontSize: '28px', fontWeight: '500', color: '#6B5A1E', direction: 'rtl' }); txt(n, 'ضروري النهارده!', { left: 'auto', right: '26px', top: '110px', fontSize: '24px', color: '#9C7A12', direction: 'rtl' }); }
    if (p.kind === 'chat') { const b = div(n, { left: 'auto', right: '24px', top: '64px', padding: '14px 20px', background: '#EEF3FF', borderRadius: '18px 18px 4px 18px', fontFamily: TEXT, fontSize: '24px', color: C.ink2, whiteSpace: 'nowrap', direction: 'rtl' }); b.textContent = 'فين أرقام امبارح؟'; div(n, { left: '24px', top: '128px', width: '180px', height: '12px', borderRadius: '6px', background: '#E4E7EC' }); }
    let hand1 = null, hand2 = null;
    if (p.kind === 'clock') {
      const face = div(n, { left: px(p.w / 2 - 80), top: '70px', width: '160px', height: '160px', borderRadius: '50%', border: `4px solid ${C.ink}`, boxSizing: 'border-box' });
      for (let k = 0; k < 12; k++) div(face, { left: '74px', top: '6px', width: '4px', height: k % 3 ? '8px' : '14px', background: C.grey, transformOrigin: '2px 70px', transform: `rotate(${k * 30}deg)` });
      hand1 = div(face, { left: '74px', top: '30px', width: '5px', height: '46px', borderRadius: '3px', background: C.ink, transformOrigin: '2.5px 46px' });
      hand2 = div(face, { left: '75px', top: '16px', width: '3px', height: '60px', borderRadius: '2px', background: C.amber, transformOrigin: '1.5px 60px' });
    }
    const badge = div(root, { width: '44px', height: '44px', borderRadius: '50%', background: C.amber, color: '#fff', fontFamily: TEXT, fontWeight: '700', fontSize: '28px', textAlign: 'center', lineHeight: '44px', zIndex: String(20 + i), opacity: '0' });
    badge.textContent = '!';
    return { n, p, hand1, hand2, badge, from: { x: p.x + (hash(i, 9) - 0.5) * 500, y: p.y + 520 + hash(i, 10) * 200, r: p.r * 4 + (hash(i, 11) - 0.5) * 30 } };
  });
  const head = line(root, 'كل يوم، في كل إدارة', { x: 1824, y: 300, size: 66, weight: 700, font: DISPLAY, align: 'right', width: 640, lh: 1.25 });
  const facts = ['تقارير بتتعمل يدوي', 'بيانات في ملفات متفرقة', 'نسخ ولصق… وأخطاء صغيرة', 'مراجعات مالهاش آخر', 'وقرارات بتستنى الأرقام'].map((s, i) =>
    ({ L: line(root, s, { x: 1824, y: 420 + i * 82, size: 40, weight: 500, color: C.ink2, align: 'right', width: 640, lh: 1.3 }), dot: div(root, { width: '12px', height: '12px', borderRadius: '3px', background: C.blue, left: '1838px', top: px(414 + i * 82), zIndex: '10' }) }));
  const tail = line(root, 'والوقت بيضيع', { x: 1824, y: 860, size: 54, weight: 700, font: DISPLAY, color: C.blue, align: 'right', width: 640, lh: 1.25 });
  S.problem = { sl, cards, head, facts, tail };
}, render(t) {
  const s = S.problem;
  slamAt(s.sl, t, 12.3, 39.6);
  // cards: fly in (spring), then live with a small drift; from 36 they straighten; at the snap they become the system ring (reframe owns them after)
  s.cards.forEach((c, i) => {
    const t0 = T.cards[i], e = spr(t, t0, 0.75, 0.18), live = t >= t0 - 0.05;
    show(c.n, live && t < T.snap + 0.02);
    if (!live) { vis(c.badge, 0); return; }
    const straighten = ioC(ramp(t, 36.2, T.snap)), jitter = 1 - straighten;
    let x = lerp(c.from.x, c.p.x, e) + noise1(t * 0.35, i * 7) * 10 * jitter, y = lerp(c.from.y, c.p.y, e) + noise1(t * 0.3, i * 7 + 3) * 8 * jitter;
    let r = lerp(c.from.r, c.p.r, e) * (1 - straighten) + noise1(t * 0.25, i * 5) * 1.2 * jitter;
    // pile-up pressure: the later the pile, the more the earlier cards are pushed aside
    const crowd = sm(26, 33, t) * (1 - straighten); x += (c.p.x - 600) * 0.06 * crowd; y += (c.p.y - 560) * 0.05 * crowd;
    // straighten towards the system ring position (reframe takes over exactly at the snap)
    const ring = RING[i % 6]; if (straighten > 0 && i < 6) { x = lerp(x, lerp(x, ring.x, 0.15), straighten); y = lerp(y, lerp(y, ring.y, 0.15), straighten); }
    c.n.style.left = px(x - c.p.w / 2); c.n.style.top = px(y - c.p.h / 2); c.n.style.width = px(c.p.w); c.n.style.height = px(c.p.h);
    c.n.style.transform = `rotate(${r.toFixed(2)}deg) scale(${(0.86 + 0.14 * clamp(e)).toFixed(4)})`;
    c.n.style.opacity = clamp(e * 1.6).toFixed(3);
    setBlur(c.n, Math.max(0, 1 - e) * 10 + 6 * pulse(t, T.snap - 0.35, 0.4));
    if (c.hand1) { c.hand1.style.transform = `rotate(${(t * 40 + 120).toFixed(1)}deg)`; c.hand2.style.transform = `rotate(${(t * (220 + 900 * sm(26, 34, t))).toFixed(1)}deg)`; }
    // warning badges on the busiest moments
    const bt = 30.6 + i * 0.32, bo = spr(t, bt, 0.45, 0.4) * (1 - sm(35.6, 36.2, t));
    if (i % 2 === 0) { place(c.badge, x + c.p.w * 0.42, y - c.p.h * 0.5, 44, 44, 22); c.badge.style.transform = `scale(${clamp(bo, 0, 1.3).toFixed(3)})`; vis(c.badge, clamp(bo)); } else vis(c.badge, 0);
  });
  rise(s.head, t, 13.2, 35.4, { stagger: 0.08 });
  s.facts.forEach((f, i) => {
    const tIn = T.problemLines[i], next = T.problemLines[i + 1] ?? 32.6;
    rise(f.L, t, tIn, 35.6 + i * 0.06, { stagger: 0.06, dy: 26, blur: 10 });
    f.L.line.style.opacity = (1 - 0.5 * sm(next, next + 0.4, t)).toFixed(3); // older facts dim as the next arrives
    const d = oE(ramp(t, tIn, tIn + 0.5)) * (1 - ioC(ramp(t, 35.6, 36.0)));
    vis(f.dot, d * (1 - 0.5 * sm(next, next + 0.4, t))); f.dot.style.transform = `scale(${d.toFixed(3)}) rotate(${(45 * (1 - d)).toFixed(1)}deg)`;
  });
  rise(s.tail, t, 32.8, 35.7, { stagger: 0.1, dy: 30 });
} });

// =====================================================================================================
// REFRAME 36–48 — «not more tools: a system». The six windows become one ring of tidy tiles around a hub pixel; lines connect;
// the ring implodes into the pixel.
SC.push({ id: 'reframe', a: CH.reframe[0], b: CH.reframe[1], z: 14, init(root) {
  const sl = slam(root, 'أنظمة', { x: 960, y: 560, size: 360 });
  const q = line(root, 'المشكلة مش في الناس… ولا في الأدوات', { y: 172, size: 58, weight: 600, font: DISPLAY, color: C.ink, lh: 1.3 });
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', zIndex: '4', overflow: 'visible' } }, root);
  const links = RING.map((p) => el('path', { d: `M 960 520 L ${p.x} ${p.y}`, stroke: C.blue, 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '6 9', opacity: 0.0 }, svg));
  const tiles = RING.map((p, i) => {
    const n = card(root, { w: 300, h: 150, z: 6, radius: 22 });
    const ic = icon(n, RING_LABELS[i][0], { size: 46, color: C.blue, width: 1.7, style: { left: 'auto', right: '28px', top: '52px' } });
    const lb = txt(n, RING_LABELS[i][1], { left: 'auto', right: '92px', top: '48px', fontSize: '38px', fontWeight: '500', color: C.ink, direction: 'rtl' });
    return { n, ic, lb, p };
  });
  const hub = PIXEL(root, 9);
  const halo = div(root, { borderRadius: '50%', border: '2px solid rgba(10,102,255,0.35)', zIndex: '3' });
  const ans = line(root, 'المشكلة في غياب النظام', { y: 948, size: 62, weight: 700, font: DISPLAY, color: C.ink, lh: 1.25, accent: { 3: C.blue } });
  S.reframe = { sl, q, links, tiles, hub, halo, ans };
}, render(t) {
  const s = S.reframe;
  slamAt(s.sl, t, T.snap - 0.1, T.implode1 - 0.2);
  rise(s.q, t, 36.3, 39.5, { stagger: 0.07 });
  // tiles: appear at the snap where the problem windows were (problem scene hides its cards at the same instant)
  s.tiles.forEach((tl, i) => {
    const pc = PROBLEM_CARDS[i], e = spr(t, T.snap, 0.55, 0.16), imp = ioC(ramp(t, T.implode1 + i * 0.04, T.implode1 + 0.75 + i * 0.04));
    const startX = lerp(pc.x, tl.p.x, 0.15), startY = lerp(pc.y, tl.p.y, 0.15);
    let x = lerp(startX, tl.p.x, e), y = lerp(startY, tl.p.y, e), w = lerp(pc.w, 300, e), h = lerp(pc.h, 150, e);
    x = lerp(x, 960, imp); y = lerp(y, 520, imp); w *= 1 - 0.85 * imp; h *= 1 - 0.85 * imp;
    show(tl.n, t >= T.snap && t < T.implode1 + 1.0);
    place(tl.n, x + noise1(t * 0.3, i) * 3 * (1 - imp), y + noise1(t * 0.3, i + 9) * 3 * (1 - imp), w, h, 22);
    setBlur(tl.n, 8 * (1 - clamp(e)) * 0.6 + 10 * imp);
    tl.n.style.opacity = (1 - imp).toFixed(3);
    const c = sm(T.snap + 0.15, T.snap + 0.45, t); tl.ic.style.opacity = tl.lb.style.opacity = c.toFixed(3);
    const lk = sm(41.0 + i * 0.12, 41.6 + i * 0.12, t) * (1 - imp);
    s.links[i].setAttribute('opacity', (0.7 * lk).toFixed(3));
    s.links[i].setAttribute('stroke-dashoffset', (-t * 30).toFixed(1));
  });
  // hub pixel: grows in at the snap, pulses with the links, swallows the ring, then waits to become the logo's i-dot
  const hb = spr(t, T.snap + 0.2, 0.6, 0.3), big = 1 + 0.4 * sm(T.implode1 + 0.4, T.implode1 + 1.0, t) - 0.15 * pulse(t, 47.6, 0.4);
  const hs = 54 * clamp(hb, 0, 1.2) * big;
  show(s.hub, t >= T.snap && t < T.burst1 + 0.02);
  place(s.hub, 960, 520, hs, hs, hs * 0.22);
  const halo = 140 + 30 * Math.sin(t * 2.2);
  place(s.halo, 960, 520, halo, halo, halo / 2); vis(s.halo, 0.6 * sm(41, 42, t) * (1 - sm(T.implode1, T.implode1 + 0.5, t)));
  rise(s.ans, t, 41.6, 46.0, { stagger: 0.08, dy: 30 });
} });

// =====================================================================================================
// BRAND 48–60 — the hub pixel flies to the logo's i-dot; the letters resolve; who we are; three pillars; circle wipe from the plus.
const LOGO1 = { width: 620, cx: 960, top: 215 };
SC.push({ id: 'brand', a: CH.brand[0], b: CH.brand[1], z: 16, init(root) {
  const cam = div(root, { width: px(W), height: px(H), transformOrigin: '50% 40%' });
  const logo = buildLogo(cam, LOGO1);
  const hero = PIXEL(cam, 30);
  const tag = line(cam, 'بنصمم ونبني أنظمة ذكية', { y: 652, size: 64, weight: 600, font: DISPLAY, color: C.ink, lh: 1.25, accent: { 3: C.blue } });
  const sub = line(cam, 'وندرّب الفرق تشتغل بيها كل يوم', { y: 738, size: 36, weight: 400, color: C.grey });
  const chips = [['train', 'تدريب'], ['system', 'أنظمة'], ['gear', 'أتمتة']].map(([ic, label], i) => {
    const n = div(cam, { width: '260px', height: '88px', borderRadius: '44px', background: '#FFFFFF', boxShadow: CARD_SHADOW, zIndex: '12', left: px(960 + (1 - i) * 300 - 130), top: '818px' });
    icon(n, ic, { size: 36, style: { left: 'auto', right: '34px', top: '26px' } });
    const L = line(n, label, { x: 186, y: 44, size: 36, weight: 500, color: C.ink, align: 'center', width: 150 });
    return { n, L };
  });
  S.brand = { cam, logo, hero, tag, sub, chips };
}, render(t) {
  const s = S.brand, lg = s.logo;
  const exit = ioC(ramp(t, 57.6, 58.9));
  s.cam.style.transform = `translateY(${(-40 * exit).toFixed(1)}px) scale(${(1 + 0.025 * ramp(t, 48, 58) - 0.04 * exit).toFixed(4)})`;
  s.cam.style.opacity = (1 - 0.0 * exit).toFixed(3);
  // the hub pixel (reframe) hands over at 48.0: flight to the i-dot with a spin, landing squash
  const [dx, dy] = lg.toScr((459 + 519) / 2, (408 + 459) / 2), dw = 60 * lg.LS, dh = 51 * lg.LS;
  let hx = 960, hy = 520, hw = 75, hh = 75, rot = 0;
  if (t < 48.6) { const u = ioC(ramp(t, T.burst1, 48.6)); hx = lerp(960, dx, u); hy = lerp(520, dy, u) - 140 * Math.sin(Math.PI * u); hw = lerp(75, dw, u); hh = lerp(75, dh, u); rot = 180 * u; }
  else { const tau = t - 48.6, d = Math.exp(-tau * 8) * Math.cos(tau * 24); hx = dx; hy = dy; hw = dw * (1 + 0.3 * d); hh = dh * (1 - 0.28 * d); }
  place(s.hero, hx, hy, hw, hh, Math.min(hw, hh) * 0.18);
  s.hero.style.transform = `rotate(${rot.toFixed(1)}deg)`;
  const dotSwap = sm(49.0, 49.3, t); vis(s.hero, 1 - dotSwap);
  // letters resolve one after another (reading order of the logo) from blur, slightly rising
  const order = [0, 3, 5, 4, 7, 6, 2, 8, 9, 11, 12, 10];
  const glow = logoSheen(lg.parts, t, 50.2);
  lg.parts.forEach((p, k) => {
    if (k === 1) { vis(p.im, dotSwap * (1 - exit)); partFilter(p.im, 0, glow[k]); return; }
    const i = order.indexOf(k), a = 48.5 + i * 0.07, e = oE(ramp(t, a, a + 0.7));
    vis(p.im, e * (1 - exit)); p.im.style.transform = `translateY(${((1 - e) * 30).toFixed(1)}px) ${k === 10 ? `rotate(${((1 - e) * -120).toFixed(1)}deg)` : ''}`;
    partFilter(p.im, (1 - e) * 14 + exit * 10, glow[k]);
  });
  rise(s.tag, t, 51.4, 57.6, { stagger: 0.09, dy: 34 });
  rise(s.sub, t, 52.6, 57.5, { stagger: 0.06, dy: 22, blur: 8 });
  s.chips.forEach((c, i) => {
    const e = spr(t, 54.4 + i * 0.3, 0.55, 0.25), o = (1 - ioC(ramp(t, 57.4 + i * 0.05, 57.9 + i * 0.05)));
    vis(c.n, clamp(e * 1.5) * o); c.n.style.transform = `translateY(${((1 - clamp(e)) * 40).toFixed(1)}px) scale(${lerp(0.8, 1, clamp(e, 0, 1.1)).toFixed(4)})`;
    rise(c.L, t, 54.6 + i * 0.3, 57.4, { dy: 14, blur: 6 });
  });
} });

// =====================================================================================================
// SAMSUNG 60–84 — real 3D: a TV and a phone in a white studio, a slow orbit, labels drawn to the products, a 12-month ribbon;
// then the camera dives into the TV screen, whose blue becomes the first project window (match cut at 83.8).
const TV = { x: -1.05, y: 0.05, w: 3.2, h: 1.86 }, PHONE = { x: 1.55, y: -0.925, z: 0.35, w: 0.46, h: 0.95 }, FLOOR = -1.4;
function roundedShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// Live screens: canvases redrawn from t every frame (deterministic), uploaded as textures. The TV runs a factory dashboard
// that clears to the plain brand blue during the dive, so its last frame matches the first project window (match cut).
function liveScreen(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { c, g: c.getContext('2d'), tex, w, h };
}
const rrect = (g, x, y, w, h, r, fill, a = 1) => { g.globalAlpha = a; g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); g.globalAlpha = 1; };
function drawTV(S2, t) {
  const { g, w, h } = S2, grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#2C88FF'); grd.addColorStop(0.6, '#0A5EF5'); grd.addColorStop(1, '#0846D6');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.08)'; for (let y = 20; y < h; y += 40) for (let x = 20; x < w; x += 40) g.fillRect(x - 1.5, y - 1.5, 3, 3);
  const ui = 1 - sm(T.dive[0], T.dive[0] + 1.4, t);
  if (ui > 0.001) {
    g.save(); g.globalAlpha = ui;
    rrect(g, 60, 52, w - 120, 52, 14, '#FFFFFF', 0.16);                                   // top bar
    rrect(g, w - 104, 66, 24, 24, 5, '#FFFFFF', 0.95);                                    // the pixel mark
    for (let i = 0; i < 3; i++) {                                                         // KPI cards with filling bars
      const y = 140 + i * 180; rrect(g, 60, y, 470, 150, 18, '#FFFFFF', 0.14);
      rrect(g, 90, y + 36, 180, 16, 8, '#FFFFFF', 0.55);
      const f = oE(ramp(t, 61.2 + i * 0.5, 63.4 + i * 0.5)) * (0.55 + 0.35 * hash(i, 41)) + 0.04 * Math.sin(t * 1.3 + i);
      rrect(g, 90, y + 84, 400, 22, 11, '#FFFFFF', 0.18); rrect(g, 90, y + 84, 400 * clamp(f), 22, 11, i === 1 ? '#7FD8FF' : '#FFFFFF', 0.9);
    }
    rrect(g, 570, 140, w - 630, 510, 18, '#FFFFFF', 0.12);                                // chart panel
    const pts = Array.from({ length: 24 }, (_, j) => [610 + j * ((w - 710) / 23), 560 - 300 * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(j * 0.55 + 0.6)) * (0.7 + 0.3 * hash(j, 43)) + 0.15 * j / 23)]);
    const drawn = ramp(t, 62.0, 68.0) * (pts.length - 1);
    g.lineWidth = 6; g.lineJoin = g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.beginPath();
    for (let j = 0; j <= Math.floor(drawn); j++) j ? g.lineTo(...pts[j]) : g.moveTo(...pts[j]);
    if (drawn < pts.length - 1) { const k = Math.floor(drawn), u = drawn - k; g.lineTo(lerp(pts[k][0], pts[k + 1][0], u), lerp(pts[k][1], pts[k + 1][1], u)); }
    g.stroke();
    if (t > 68) { const k = (t - 68) * 2.2 % (pts.length - 1), j = Math.floor(k), u = k - j, p = [lerp(pts[j][0], pts[j + 1][0], u), lerp(pts[j][1], pts[j + 1][1], u)]; // live scan dot
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(p[0], p[1], 11, 0, Math.PI * 2); g.fill(); g.globalAlpha = ui * 0.25; g.beginPath(); g.arc(p[0], p[1], 26, 0, Math.PI * 2); g.fill(); g.globalAlpha = ui; }
    for (let j = 0; j < 14; j++) { const bh = 30 + 40 * (0.5 + 0.5 * Math.sin(t * 1.6 + j * 0.7)); rrect(g, 610 + j * 42, 620 - bh, 24, bh, 6, '#FFFFFF', 0.35); }
    g.restore();
  }
  const ps = h * 0.07 * (1 - sm(T.dive[0] + 0.6, T.dive[1] - 0.4, t));                       // the centre pixel leaves before the cut
  if (ps > 0.5) rrect(g, w / 2 - ps / 2, h / 2 - ps / 2, ps, ps, ps * 0.2, '#FFFFFF', 1 - ui * 0.85);
  S2.tex.needsUpdate = true;
}
function drawPhone(S2, t) {
  const { g, w, h } = S2, grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#18B6FF'); grd.addColorStop(0.6, '#0A66FF'); grd.addColorStop(1, '#0732AF');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  rrect(g, 28, 40, w - 56, 70, 18, '#FFFFFF', 0.92); rrect(g, 48, 64, 90, 20, 10, '#0A66FF', 0.5);
  const p = oE(ramp(t, 62.5, 69.0)), cx = w / 2, cy = 230;                                   // progress ring → check
  g.lineWidth = 14; g.strokeStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(cx, cy, 70, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#FFFFFF'; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); g.stroke();
  if (p > 0.98) { g.lineWidth = 12; g.beginPath(); g.moveTo(cx - 28, cy + 2); g.lineTo(cx - 6, cy + 24); g.lineTo(cx + 32, cy - 22); g.stroke(); }
  for (let i = 0; i < 4; i++) {                                                             // rows tick one by one
    const y = 350 + i * 72; rrect(g, 28, y, w - 56, 56, 14, '#FFFFFF', 0.16); rrect(g, 90, y + 21, 150 - 20 * i, 14, 7, '#FFFFFF', 0.6);
    const ok = sm(66 + i * 0.8, 66.3 + i * 0.8, t); rrect(g, 44, y + 14, 28, 28, 8, ok > 0.5 ? '#3DDC97' : '#FFFFFF', ok > 0.5 ? 1 : 0.3);
  }
  S2.tex.needsUpdate = true;
}
function contactShadow(w, d, a = 0.5) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128); grd.addColorStop(0, `rgba(20,30,50,${a})`); grd.addColorStop(0.55, `rgba(20,30,50,${a * 0.35})`); grd.addColorStop(1, 'rgba(20,30,50,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; return m;
}
// lazy: the WebGL renderer, PMREM environment and geometry are built on the first frame inside the chapter, so render workers
// whose time slice never reaches 59–84 s never pay the ~0.5 GB SwiftShader cost (six eager copies starved a 16 GB machine).
SC.push({ id: 'samsung', a: CH.samsung[0], b: CH.samsung[1], z: 30, lazy: true, init(root) {
  full(root, { background: PAPER_BG });
  const canvas = el('canvas', { style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '2' } }, root);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
  const bezel = new THREE.MeshStandardMaterial({ color: '#15181D', metalness: 0.55, roughness: 0.32 });
  const silver = new THREE.MeshStandardMaterial({ color: '#C9CED6', metalness: 0.9, roughness: 0.25 });
  // TV: rounded slim panel, screen, neck and base
  const tv = new THREE.Group(); tv.position.set(TV.x, TV.y, 0); scene.add(tv);
  const panel = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedShape(TV.w, TV.h, 0.05), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 10 }), bezel);
  panel.position.z = -0.06; tv.add(panel);
  const tvLive = liveScreen(1280, 744), phLive = liveScreen(320, 660);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(TV.w - 0.08, TV.h - 0.08), new THREE.MeshBasicMaterial({ map: tvLive.tex, toneMapped: false, fog: false }));
  screen.position.z = 0.0135; tv.add(screen);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.05), silver); neck.position.set(0, -TV.h / 2 - 0.2, -0.05); tv.add(neck);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.035, 64), silver); base.scale.z = 0.42; base.position.set(0, FLOOR - TV.y + 0.0175, -0.05); tv.add(base);
  const tvShadow = contactShadow(2.6, 1.2, 0.42); tvShadow.position.set(TV.x, FLOOR + 0.002, -0.05); scene.add(tvShadow);
  // phone: rounded slab with a screen, standing on the floor, slightly turned
  const phone = new THREE.Group(); phone.position.set(PHONE.x, PHONE.y, PHONE.z); scene.add(phone);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedShape(PHONE.w, PHONE.h, 0.06), { depth: 0.035, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 12 }), bezel);
  body.position.z = -0.035; phone.add(body);
  const pscreen = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(PHONE.w - 0.04, PHONE.h - 0.04, 0.05)), new THREE.MeshBasicMaterial({ map: phLive.tex, toneMapped: false, fog: false }));
  const uv = pscreen.geometry.attributes.uv, pos = pscreen.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (PHONE.w - 0.04) + 0.5, pos.getY(i) / (PHONE.h - 0.04) + 0.5);
  pscreen.position.z = 0.0105; phone.add(pscreen);
  const phShadow = contactShadow(0.9, 0.5, 0.45); phShadow.position.set(PHONE.x, FLOOR + 0.002, PHONE.z); scene.add(phShadow);
  const key = new THREE.DirectionalLight('#FFFFFF', 1.6); key.position.set(3, 5, 4); scene.add(key);
  scene.add(new THREE.AmbientLight('#FFFFFF', 0.35));
  // the factory: a production line behind the products carrying screens and phones, fading into the paper with distance
  scene.fog = new THREE.Fog('#F3F2EE', 9.5, 24);
  const BELT = { z: -3.8, y: -0.62, len: 22 };
  const beltMat = new THREE.MeshStandardMaterial({ color: '#2B3038', metalness: 0.2, roughness: 0.7 });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(BELT.len, 0.07, 0.9), beltMat); belt.position.set(0, BELT.y, BELT.z); scene.add(belt);
  for (const dz of [-0.47, 0.47]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(BELT.len, 0.12, 0.05), silver); rail.position.set(0, BELT.y + 0.03, BELT.z + dz); scene.add(rail); }
  for (let x = -10; x <= 10; x += 2.5) for (const dz of [-0.4, 0.4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, BELT.y - FLOOR, 0.06), silver); leg.position.set(x, (BELT.y + FLOOR) / 2, BELT.z + dz); scene.add(leg); }
  const lineShadow = contactShadow(BELT.len, 1.6, 0.25); lineShadow.position.set(0, FLOOR + 0.002, BELT.z); scene.add(lineShadow);
  const itemScreen = new THREE.MeshBasicMaterial({ color: '#2F7BFF', toneMapped: false });
  const items = Array.from({ length: 16 }, (_, i) => {
    const big = i % 3 === 0, w = big ? 0.95 : 0.3, h = big ? 0.56 : 0.6, gI = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.035), bezel); gI.add(b);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.05, h - 0.05), itemScreen); sc.position.z = 0.019; gI.add(sc);
    gI.position.set(0, BELT.y + 0.035 + h / 2 + (big ? 0.06 : 0), BELT.z); gI.userData = { x0: -BELT.len / 2 + i * (BELT.len / 16) };
    if (big) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.05), silver); st.position.y = -h / 2 - 0.035; gI.add(st); }
    scene.add(gI); return gI;
  });
  // DOM overlay: titles, labels with leader lines, the 12-month ribbon
  const title = line(root, 'سنة كاملة من التطبيق الفعلي', { y: 158, size: 70, weight: 700, font: DISPLAY, color: C.ink, lh: 1.25, z: 10 });
  const latin = line(root, 'Samsung Electronics Egypt', { y: 250, size: 62, weight: 400, font: SERIF, italic: true, color: C.navy, dir: 'ltr', lh: 1.2, z: 10 });
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', zIndex: '9', overflow: 'visible' } }, root);
  const leads = [0, 1].map(() => el('path', { d: '', stroke: C.blue, 'stroke-width': 2, fill: 'none', opacity: 0 }, svg));
  const anchors = [0, 1].map(() => el('circle', { r: 6, fill: C.blue, opacity: 0 }, svg));
  const tvL = line(root, 'مصنع الشاشات', { y: 880, size: 40, weight: 500, color: C.ink, width: 420, z: 10 });
  const phL = line(root, 'مصنع الموبايل', { y: 880, size: 40, weight: 500, color: C.ink, width: 420, z: 10 });
  const rib = el('path', { d: 'M 1640 958 L 280 958', stroke: C.line, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, svg);
  const ribOn = el('path', { d: 'M 1640 958 L 280 958', stroke: C.blue, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-dasharray': '1360', 'stroke-dashoffset': '1360' }, svg);
  const ticks = Array.from({ length: 12 }, (_, i) => el('rect', { x: 1640 - i * (1360 / 11) - 6, y: 952, width: 12, height: 12, rx: 3, fill: '#FFFFFF', stroke: C.blue, 'stroke-width': 2, opacity: 0 }, svg));
  const ribL = line(root, '١٢ شهر من التدريب والمشاريع والتطبيق', { y: 1000, size: 30, weight: 400, color: C.grey, z: 10 });
  void rib;
  S.samsung = { renderer, scene, camera, tv, phone, title, latin, leads, anchors, tvL, phL, ribOn, ticks, ribL, root, tvLive, phLive, items, beltLen: BELT.len };
}, render(t) {
  const s = S.samsung, cam = s.camera;
  // circle wipe from the logo's plus (brand scene) into the studio
  const plus = S.brand.logo.toScr((923 + 1109) / 2, (679 + 859) / 2);
  s.root.style.clipPath = circleWipe(t, { a: T.wipe[0], b: T.wipe[1], x: plus[0], y: plus[1], W, H }).clip;
  // camera: a close, low reveal that pulls back into the wide (59–64.5), a slow orbit, then the dive into the TV screen
  const rv = oC(ramp(t, 59.0, 64.5)), orb = ioC(ramp(t, 64.5, 80.8));
  const look = new THREE.Vector3(lerp(0.15, -0.35, rv), lerp(-0.45, -0.1, rv), 0);
  const a = lerp(-0.62, -0.22, rv) + 0.42 * orb, R = lerp(5.6, 9.6, rv) - 0.5 * orb;
  let pos = new THREE.Vector3(look.x + Math.sin(a) * R, lerp(0.05, 0.55, rv) + 0.25 * orb, Math.cos(a) * R);
  drawTV(s.tvLive, t); drawPhone(s.phLive, t);
  s.items.forEach((it) => { const L = s.beltLen, x = ((it.userData.x0 + 0.42 * (t - 59) + L / 2) % L + L) % L - L / 2; it.position.x = x; });
  const dv = ioC(ramp(t, T.dive[0], T.dive[1]));
  if (dv > 0) { const tgt = new THREE.Vector3(TV.x, TV.y, 2.75), tl = new THREE.Vector3(TV.x, TV.y, 0); pos = pos.lerp(tgt, dv); look.lerp(tl, dv); }
  cam.position.copy(pos); cam.lookAt(look); cam.updateMatrixWorld();
  s.phone.rotation.y = -0.38 + 0.18 * Math.sin((t - 60) * 0.25); s.phone.rotation.x = 0;
  s.tv.rotation.y = 0.04 * Math.sin((t - 60) * 0.18);
  if (t >= T.wipe[0]) s.renderer.render(s.scene, cam);
  const out = 1 - ioC(ramp(t, 80.4, 81.2));
  rise(s.title, t, 63.0, 80.3, { stagger: 0.07, dy: 30 });
  rise(s.latin, t, 64.0, 80.4, { stagger: 0.12, dy: 24, blur: 10 });
  // labels sit under each product; leader lines from the label up to the product base (projected every frame)
  const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  const tvB = proj(TV.x, FLOOR + 0.05, -0.05), phB = proj(PHONE.x, FLOOR + 0.05, PHONE.z);
  [[s.tvL, tvB, T.tvLabel, 0], [s.phL, phB, T.phoneLabel, 1]].forEach(([L, b, t0, k]) => {
    // the label stays clear of its product as the orbit brings it closer: never above the projected base + 44 px
    const top = Math.max(854, b[1] + 44); L.line.style.left = px(b[0] - 210); L.line.style.top = px(top);
    rise(L, t, t0 + 0.4, 80.2, { stagger: 0.08, dy: 18, blur: 8 });
    const d = oE(ramp(t, t0, t0 + 0.6)) * out;
    s.leads[k].setAttribute('d', `M ${b[0].toFixed(1)} ${(b[1] + 8).toFixed(1)} L ${b[0].toFixed(1)} ${lerp(b[1] + 8, top - 8, d).toFixed(1)}`);
    s.leads[k].setAttribute('opacity', (0.8 * d).toFixed(3));
    s.anchors[k].setAttribute('cx', b[0].toFixed(1)); s.anchors[k].setAttribute('cy', (b[1] + 8).toFixed(1)); s.anchors[k].setAttribute('opacity', d.toFixed(3));
  });
  // 12-month ribbon (right → left), ticks light in sequence
  const rp = ioC(ramp(t, T.ribbon, T.ribbon + 3.4)) * out;
  s.ribOn.setAttribute('stroke-dashoffset', (1360 * (1 - rp)).toFixed(1)); s.ribOn.setAttribute('opacity', out.toFixed(3));
  s.ticks.forEach((r, i) => { const on = sm(T.ribbon + i * 0.28, T.ribbon + i * 0.28 + 0.2, t) * out; r.setAttribute('opacity', on.toFixed(3)); r.setAttribute('fill', on > 0.5 ? C.blue : '#FFFFFF'); });
  rise(s.ribL, t, T.ribbon + 1.4, 80.2, { stagger: 0.05, dy: 16, blur: 8 });
} });

// =====================================================================================================
// PROJECTS 84–144 — one window that morphs between four projects (cursor-led), a text panel on the right (before → after),
// a keyword slammed behind the window. The window starts as the TV screen's blue (match cut from the 3D dive).
const WIN = [ // window centre/size per project
  { x: 600, y: 552, w: 980, h: 700 }, { x: 600, y: 560, w: 1000, h: 640 }, { x: 600, y: 552, w: 1000, h: 700 }, { x: 600, y: 552, w: 940, h: 700 },
];
const PROJECTS = [
  { n: 'مشروع ١', title: 'أتمتة تقارير SAP', before: 'تقرير يومي بيتجمّع يدوي', after: 'يطلع جاهز في Excel بضغطة', tags: 'SAP · NERP · Excel', slam: 'أتمتة', app: 'NERP · SAP' },
  { n: 'مشروع ٢', title: 'تخطيط الإنتاج والمواد', before: 'خطط بتتعدل في جداول كتير', after: 'خطة واحدة متزامنة وواضحة', tags: "MRP · Plan Q'ty · SAP", slam: 'تخطيط', app: 'خطة الإنتاج' },
  { n: 'مشروع ٣', title: 'لوحات متابعة للإدارة', before: 'بيانات متفرقة في ملفات', after: 'صورة واحدة واضحة لكل قرار', tags: 'Data · Dashboards', slam: 'رؤية', app: 'لوحة المتابعة' },
  { n: 'مشروع ٤', title: 'مساعد ذكي وتدريب للفرق', before: 'أسئلة يومية بتاخد وقت', after: 'إجابة فورية… وفريق مدرَّب', tags: 'AI · Workshops', slam: 'ذكاء', app: 'المساعد الذكي' },
];
const PANEL_X = 1824, PANEL_W = 640;
const P1_ROWS = 8, P2_ROWS = 5;
SC.push({ id: 'projects', a: CH.projects[0], b: CH.projects[1], z: 32, init(root) {
  full(root, { background: PAPER_BG });
  const slams = PROJECTS.map((p) => slam(root, p.slam, { x: 600, y: 560, size: 330 }));
  const win = div(root, { background: '#FFFFFF', boxShadow: CARD_SHADOW, zIndex: '6', overflow: 'hidden' });
  // the TV screen colour as seen at the end of the dive (its centre region, filling the frame): the match-cut frame
  const flood = div(win, { left: '0', top: '0', width: '100%', height: '100%', background: 'linear-gradient(135deg, #1B71FA 0%, #0A5EF5 55%, #0953E7 100%)', zIndex: '20' });
  const bar = div(win, { width: '100%', height: '52px', background: '#F6F7F9', borderBottom: `1px solid ${C.line}`, zIndex: '2' });
  ['#FF6B6B', '#FFC24B', '#3DCB7A'].forEach((c, i) => div(bar, { width: '12px', height: '12px', borderRadius: '50%', background: c, left: px(22 + i * 21), top: '20px', opacity: '0.85' }));
  const apps = PROJECTS.map((p) => txt(bar, p.app, { left: 'auto', right: '24px', top: '12px', fontSize: '20px', color: C.grey, direction: 'rtl' }));
  const content = PROJECTS.map(() => div(win, { left: '0', top: '52px', width: '100%', height: 'calc(100% - 52px)', zIndex: '1' }));
  // ---- P1: T-code → table → Excel
  const c1 = content[0];
  txt(c1, 'T-Code', { left: '48px', top: '40px', fontSize: '20px', color: C.grey });
  const input = div(c1, { left: '48px', top: '72px', width: '300px', height: '58px', borderRadius: '12px', border: `2px solid ${C.line}`, background: '#FBFBFC' });
  const typed = txt(input, '', { left: '18px', top: '10px', fontSize: '28px', fontWeight: '500', color: C.ink, direction: 'ltr', letterSpacing: '0.06em' });
  const caret = div(input, { left: '20px', top: '14px', width: '2px', height: '30px', background: C.blue });
  const exec = div(c1, { left: '372px', top: '72px', width: '170px', height: '58px', borderRadius: '12px', background: PIX_BG, boxShadow: '0 10px 20px rgba(10,80,230,0.25)' });
  txt(exec, 'تشغيل', { left: '0', top: '11px', width: '170px', textAlign: 'center', fontSize: '24px', fontWeight: '500', color: '#fff', direction: 'rtl' });
  const expBtn = div(c1, { left: 'auto', right: '48px', top: '72px', width: '200px', height: '58px', borderRadius: '12px', border: `2px solid ${C.green}`, background: '#F2FBF6' });
  icon(expBtn, 'excel', { size: 26, color: C.green, style: { left: '22px', top: '14px' } });
  txt(expBtn, 'تصدير', { left: 'auto', right: '28px', top: '11px', fontSize: '24px', fontWeight: '500', color: C.green, direction: 'rtl' });
  const table = div(c1, { left: '48px', top: '168px', width: '884px', height: '420px' });
  const heads = ['الحالة', 'الوحدة', 'الكمية', 'المخزن', 'المادة'];
  heads.forEach((h, i) => txt(table, h, { left: px(i * 177 + 20), top: '8px', fontSize: '20px', color: C.grey, direction: 'rtl' }));
  div(table, { left: '0', top: '44px', width: '884px', height: '2px', background: C.line });
  const rows = Array.from({ length: P1_ROWS }, (_, r) => {
    const row = div(table, { left: '0', top: px(56 + r * 44), width: '884px', height: '36px' });
    for (let c = 0; c < 5; c++) div(row, { left: px(c * 177 + 20), top: '13px', width: px(c === 0 ? 70 : 60 + 80 * hash(r, c, 5)), height: '11px', borderRadius: '6px', background: c === 0 ? (r % 4 === 1 ? 'rgba(232,163,61,0.6)' : 'rgba(30,158,98,0.45)') : '#DDE1E7' });
    return row;
  });
  const toast = div(c1, { left: 'auto', right: '48px', top: '540px', height: '60px', padding: '0 26px', borderRadius: '30px', background: '#FFFFFF', boxShadow: CARD_SHADOW, zIndex: '5' });
  icon(toast, 'check', { size: 28, color: C.green, width: 2.4, style: { left: 'auto', right: '22px', top: '16px' } });
  txt(toast, 'تم التصدير إلى Excel', { position: 'relative', top: '13px', marginRight: '40px', fontSize: '24px', fontWeight: '500', color: C.ink, direction: 'rtl' });
  const xfile = div(root, { width: '110px', height: '130px', borderRadius: '14px', background: '#FFFFFF', boxShadow: CARD_SHADOW, zIndex: '40', border: `2px solid ${C.green}` });
  icon(xfile, 'excel', { size: 54, color: C.green, style: { left: '28px', top: '22px' } }); txt(xfile, 'xlsx', { left: '0', top: '86px', width: '110px', textAlign: 'center', fontSize: '20px', fontWeight: '500', color: C.green });
  // ---- P2: planning board
  const c2 = content[1];
  const lanes = Array.from({ length: P2_ROWS }, (_, i) => {
    txt(c2, `خط ${['١', '٢', '٣', '٤', '٥'][i]}`, { left: 'auto', right: '40px', top: px(70 + i * 96), fontSize: '22px', color: C.ink2, direction: 'rtl' });
    div(c2, { left: '40px', top: px(118 + i * 96), width: '820px', height: '1px', background: C.line });
    const bars = [0, 1].map((k) => div(c2, { top: px(62 + i * 96), height: '40px', borderRadius: '10px', zIndex: '2' }));
    return bars;
  });
  for (let k = 0; k <= 7; k++) div(c2, { left: px(40 + k * 117), top: '50px', width: '1px', height: '480px', background: 'rgba(227,230,235,0.6)' });
  const syncBtn = div(c2, { left: '40px', top: '540px', width: '230px', height: '56px', borderRadius: '12px', background: PIX_BG, boxShadow: '0 10px 20px rgba(10,80,230,0.25)' });
  txt(syncBtn, 'مزامنة الخطة', { left: '0', top: '11px', width: '230px', textAlign: 'center', fontSize: '24px', fontWeight: '500', color: '#fff', direction: 'rtl' });
  const mrp = div(c2, { left: '300px', top: '546px', height: '44px', padding: '0 20px', borderRadius: '22px', background: '#EEF5FF', border: `1.5px solid ${C.blue}` });
  txt(mrp, "MRP ✓  Plan Q'ty", { position: 'relative', top: '7px', fontSize: '22px', fontWeight: '500', color: C.blue, direction: 'ltr' });
  const today = div(c2, { top: '50px', width: '2px', height: '480px', background: C.blue, opacity: '0.5', zIndex: '3' });
  // ---- P3: dashboard
  const c3 = content[2];
  const kpis = [['الإنتاج', 'chart'], ['المخزون', 'data'], ['الجودة', 'shield']].map(([label, ic], i) => {
    const k = div(c3, { left: px(40 + i * 312), top: '34px', width: '290px', height: '170px', borderRadius: '16px', background: '#F8FAFD', border: `1px solid ${C.line}` });
    icon(k, ic, { size: 30, style: { left: 'auto', right: '22px', top: '22px' } });
    txt(k, label, { left: 'auto', right: '66px', top: '20px', fontSize: '24px', fontWeight: '500', color: C.ink, direction: 'rtl' });
    const sv = el('svg', { width: 250, height: 80, viewBox: '0 0 250 80', style: { position: 'absolute', left: '20px', top: '76px', overflow: 'visible' } }, k);
    const pts = Array.from({ length: 11 }, (_, j) => [j * 25, 60 - 40 * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(j * 0.9 + i * 1.7)) * (0.6 + 0.4 * hash(i, j, 3)))]);
    const path = el('path', { d: 'M ' + pts.map((p) => p.join(' ')).join(' L '), fill: 'none', stroke: C.blue, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '400', 'stroke-dashoffset': '400' }, sv);
    return { k, path };
  });
  const chart = div(c3, { left: '40px', top: '232px', width: '600px', height: '360px', borderRadius: '16px', background: '#F8FAFD', border: `1px solid ${C.line}` });
  const cbars = Array.from({ length: 12 }, (_, j) => div(chart, { left: px(30 + j * 46), width: '30px', borderRadius: '8px 8px 3px 3px', background: j % 3 === 2 ? C.cyan : C.blue }));
  const donut = el('svg', { width: 280, height: 280, viewBox: '-140 -140 280 280', style: { position: 'absolute', left: '672px', top: '262px', overflow: 'visible' } }, c3);
  el('circle', { r: 100, fill: 'none', stroke: '#E6EBF2', 'stroke-width': 28 }, donut);
  const arcs = [[C.blue, 0.46], [C.cyan, 0.28], [C.navy, 0.16]].map(([col]) => el('circle', { r: 100, fill: 'none', stroke: col, 'stroke-width': 28, 'stroke-dasharray': '0 628', transform: 'rotate(-90)' }, donut));
  const filters = ['اليوم', 'الأسبوع', 'الشهر'].map((f, i) => { const n = div(c3, { left: px(672 + i * 92), top: '232px', width: '84px', height: '34px', borderRadius: '17px', background: '#F1F3F6' }); const tx = txt(n, f, { left: '0', top: '4px', width: '84px', textAlign: 'center', fontSize: '18px', color: C.grey, direction: 'rtl' }); return { n, tx }; });
  // ---- P4: chat, then training grid
  const c4 = content[3];
  const chat = div(c4, { left: '0', top: '0', width: '100%', height: '100%' });
  const ub = div(chat, { left: 'auto', right: '40px', top: '48px', padding: '18px 26px', borderRadius: '22px 22px 6px 22px', background: '#EEF3FF', fontFamily: TEXT, fontSize: '28px', color: C.ink, whiteSpace: 'nowrap', direction: 'rtl', minWidth: '40px', minHeight: '40px' });
  const dots = div(chat, { left: '40px', top: '170px', width: '110px', height: '56px', borderRadius: '22px 22px 22px 6px', background: '#F4F5F7' });
  const dd = [0, 1, 2].map((i) => div(dots, { left: px(26 + i * 22), top: '22px', width: '12px', height: '12px', borderRadius: '50%', background: C.grey2 }));
  const ab = div(chat, { left: '40px', top: '170px', width: '620px', height: '300px', borderRadius: '22px 22px 22px 6px', background: '#FFFFFF', border: `1.5px solid ${C.line}`, boxShadow: '0 12px 30px rgba(31,35,40,0.06)', overflow: 'hidden' });
  const aiHead = txt(ab, 'ملخص اليوم', { left: 'auto', right: '28px', top: '22px', fontSize: '26px', fontWeight: '500', color: C.blue, direction: 'rtl' });
  icon(ab, 'ai', { size: 30, style: { left: 'auto', right: '170px', top: '24px' } });
  const ansLines = ['مواد قربت من حد الطلب', 'طلبات شراء محتاجة متابعة', 'اقتراح: تحديث الخطة بكرة الصبح'].map((s, i) => {
    const r = div(ab, { left: 'auto', right: '28px', top: px(86 + i * 62), height: '46px' });
    div(r, { left: 'auto', right: '0', top: '17px', width: '10px', height: '10px', borderRadius: '3px', background: i === 2 ? C.green : C.blue });
    txt(r, s, { left: 'auto', right: '24px', top: '4px', fontSize: '25px', color: C.ink2, direction: 'rtl' });
    return r;
  });
  void aiHead;
  const send = div(chat, { left: '40px', top: '520px', width: '860px', height: '62px', borderRadius: '31px', background: '#F6F7F9', border: `1px solid ${C.line}` });
  div(send, { left: '8px', top: '8px', width: '46px', height: '46px', borderRadius: '50%', background: PIX_BG });
  const train = div(c4, { left: '0', top: '0', width: '100%', height: '100%' });
  txt(train, 'تدريب عملي لكل إدارة', { left: 'auto', right: '40px', top: '34px', fontSize: '34px', fontWeight: '500', color: C.ink, direction: 'rtl' });
  const depts = ['التخطيط', 'المخازن', 'الإنتاج', 'الجودة', 'المشتريات', 'الإدارة'].map((d, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const n = div(train, { left: px(40 + (2 - col) * 290), top: px(118 + row * 220), width: '270px', height: '196px', borderRadius: '18px', background: '#F8FAFD', border: `1.5px solid ${C.line}` });
    const ic = icon(n, 'people', { size: 38, color: C.grey2, style: { left: 'auto', right: '26px', top: '26px' } });
    txt(n, d, { left: 'auto', right: '26px', top: '86px', fontSize: '30px', fontWeight: '500', color: C.ink, direction: 'rtl' });
    txt(n, 'ورشة عملية', { left: 'auto', right: '26px', top: '134px', fontSize: '20px', color: C.grey, direction: 'rtl' });
    const ok = div(n, { left: '22px', top: '24px', width: '40px', height: '40px', borderRadius: '50%', background: C.green, opacity: '0' });
    icon(ok, 'check', { size: 26, color: '#fff', width: 2.6, style: { left: '7px', top: '7px' } });
    return { n, ic, ok };
  });
  // ---- text panel (right) per project
  const panels = PROJECTS.map((p) => ({
    n: line(root, p.n, { x: PANEL_X, y: 250, size: 28, weight: 500, color: C.blue, align: 'right', width: PANEL_W }),
    title: line(root, p.title, { x: PANEL_X, y: 338, size: 54, weight: 700, font: DISPLAY, color: C.ink, align: 'right', width: PANEL_W, lh: 1.25 }),
    bl: line(root, 'قبل', { x: PANEL_X, y: 462, size: 26, weight: 500, color: C.grey, align: 'right', width: PANEL_W }),
    before: line(root, p.before, { x: PANEL_X, y: 516, size: 36, weight: 400, color: C.ink2, align: 'right', width: PANEL_W }),
    al: line(root, 'بعد', { x: PANEL_X, y: 612, size: 26, weight: 500, color: C.blue, align: 'right', width: PANEL_W }),
    after: line(root, p.after, { x: PANEL_X, y: 666, size: 38, weight: 500, color: C.ink, align: 'right', width: PANEL_W }),
    tags: line(root, p.tags, { x: PANEL_X, y: 790, size: 26, weight: 400, color: C.grey, align: 'right', width: PANEL_W, dir: 'ltr' }),
  }));
  const strike = div(root, { height: '2px', background: C.grey2, zIndex: '12' });
  const hairs = [div(root, { width: '3px', height: '30px', background: C.grey2, zIndex: '11', left: px(PANEL_X + 18), top: '448px' }), div(root, { width: '3px', height: '30px', background: C.blue, zIndex: '11', left: px(PANEL_X + 18), top: '598px' })];
  S.projects = { slams, win, flood, apps, content, typed, caret, exec, expBtn, rows, toast, xfile, lanes, syncBtn, mrp, today, kpis, cbars, arcs, filters, chat, ub, dots, dd, ab, ansLines, train, depts, panels, strike, hairs, cur: makeCursor(root) };
}, render(t) {
  const s = S.projects;
  const k = t < T.projects[1] ? 0 : t < T.projects[2] ? 1 : t < T.projects[3] ? 2 : 3;
  // window: starts as the full-frame TV blue, springs to project 1; morphs between projects; implodes at the end
  const tracks = { x: [[0, 960]], y: [[0, 540]], w: [[0, W]], h: [[0, H]], r: [[0, 0]] };
  T.projects.forEach((tp, i) => { const g = WIN[i], at = i === 0 ? 84.15 : tp; tracks.x.push([at, g.x]); tracks.y.push([at, g.y]); tracks.w.push([at, g.w]); tracks.h.push([at, g.h]); tracks.r.push([at, 26]); });
  const sp = (key) => springTrack(tracks[key], t, { duration: 0.6, bounce: 0.12 });
  const imp = ioC(ramp(t, T.implode2, T.implode2 + 0.9));
  let wx = sp('x'), wy = sp('y'), ww = sp('w'), wh = sp('h');
  wx = lerp(wx, 960, imp); wy = lerp(wy, 540, imp); ww = lerp(ww, 46, imp); wh = lerp(wh, 46, imp);
  place(s.win, wx, wy, ww, wh, lerp(sp('r'), 10, imp));
  const sp2 = springTrack(tracks.w, t - 1 / 60, { duration: 0.6, bounce: 0.12 }), speed = Math.abs(ww - sp2) * 60;
  setBlur(s.win, Math.min(4, speed / 900));
  s.win.style.background = imp > 0.6 ? PIX_BG : '#FFFFFF';
  vis(s.flood, Math.max(1 - sm(84.15, 84.75, t), sm(T.implode2 + 0.45, T.implode2 + 0.8, t)));
  // the window lives in 3D: it swings gently on every project change (out and back on a spring) and floats with a slow drift
  const swingAt = k === 0 ? 84.15 : T.projects[k], sw = springStep(Math.max(0, t - swingAt), { duration: 1.1, bounce: 0.2 }).value;
  const ry = 8 * Math.sin(Math.PI * clamp(sw)) * (k % 2 ? -1 : 1) * (1 - imp) + 1.4 * Math.sin(t * 0.31 + 1) * (1 - imp), rx = 1.1 * Math.sin(t * 0.43) * (1 - imp);
  s.win.style.transform = `perspective(2200px) translateY(${(Math.sin(t * 0.5) * 3).toFixed(2)}px) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg)`;
  // content swaps (old out, new in, around each project start)
  s.content.forEach((c, i) => {
    const a = T.projects[i], b = T.projects[i + 1] ?? T.implode2;
    const o = sm(a + 0.15, a + 0.45, t) * (1 - sm(b - 0.3, b - 0.05, t)); vis(c, o); setBlur(c, (1 - o) * 8);
    vis(s.apps[i], o);
  });
  s.slams.forEach((n, i) => slamAt(n, t, T.projects[i] + 0.3, (T.projects[i + 1] ?? T.implode2) - 0.45));
  // panel lines: chip, title, before (struck when "after" arrives), after, tags
  s.panels.forEach((p, i) => {
    const a = T.projects[i], b = (T.projects[i + 1] ?? T.implode2) - 0.55;
    rise(p.n, t, a + 0.4, b, { dy: 16, blur: 8 });
    rise(p.title, t, a + 0.6, b, { stagger: 0.08, dy: 30 });
    rise(p.bl, t, a + 1.2, b, { dy: 12, blur: 6 });
    rise(p.before, t, a + 1.35, b, { stagger: 0.05, dy: 18, blur: 8 });
    rise(p.al, t, a + 5.6, b, { dy: 12, blur: 6 });
    rise(p.after, t, a + 5.75, b, { stagger: 0.06, dy: 22, blur: 10 });
    rise(p.tags, t, a + 6.6, b, { stagger: 0.06, dy: 12, blur: 6 });
    p.before.line.style.opacity = (1 - 0.45 * sm(a + 5.4, a + 5.9, t)).toFixed(3);
  });
  // the "before" strike-through and the two hairlines track the current project
  const a = T.projects[k], b = (T.projects[k + 1] ?? T.implode2) - 0.55;
  const bw = s.panels[k].before.line.getBoundingClientRect().width;
  const wordsW = s.panels[k].before.words.reduce((m, w) => m + w.getBoundingClientRect().width, 0) + 12 * (s.panels[k].before.words.length - 1);
  void bw;
  const st = oE(ramp(t, a + 5.3, a + 5.9)) * (1 - ioC(ramp(t, b, b + 0.35)));
  place(s.strike, PANEL_X - wordsW * st / 2, 518, wordsW * st, 2); s.strike.style.left = px(PANEL_X - wordsW * st); vis(s.strike, st > 0.01 ? 0.8 : 0);
  s.hairs.forEach((h, i) => { const e = oE(ramp(t, a + (i ? 5.5 : 1.1), a + (i ? 6.0 : 1.6))) * (1 - ioC(ramp(t, b, b + 0.35))); vis(h, e); h.style.transform = `scaleY(${e.toFixed(3)})`; });
  // ---- P1 actions
  const tp1 = T.p1Type, code = typeOn('MB52', t, { start: tp1, cps: 6 }).text;
  s.typed.textContent = code; s.caret.style.left = px(20 + code.length * 21.5);
  vis(s.caret, caretVisible(t, { start: tp1, end: tp1 + 0.67 }) && t < T.p1Execute + 0.2 ? 1 : 0);
  s.exec.style.transform = `scale(${(1 - 0.06 * pulse(t, T.p1Execute - 0.05, 0.25)).toFixed(3)})`;
  s.rows.forEach((r, i) => { const e = oE(ramp(t, T.p1Execute + 0.3 + i * 0.13, T.p1Execute + 0.8 + i * 0.13)); vis(r, e); r.style.transform = `translateX(${((1 - e) * -30).toFixed(1)}px)`; });
  s.expBtn.style.transform = `scale(${(1 - 0.06 * pulse(t, T.p1Export - 0.05, 0.25)).toFixed(3)})`;
  const ft = ramp(t, T.p1Export + 0.15, T.p1Export + 1.05), fe = ioC(ft);
  const fx0 = wx + ww / 2 - 48 - 100, fy0 = wy - wh / 2 + 52 + 72 + 29, fx1 = 1240, fy1 = 900;
  place(s.xfile, lerp(fx0, fx1, fe), lerp(fy0, fy1, fe) - 160 * Math.sin(Math.PI * fe), 110, 130, 14);
  vis(s.xfile, ft > 0 && t < 98.6 ? Math.min(1, ft * 4) * (1 - sm(97.6, 98.4, t)) : 0); s.xfile.style.transform = `rotate(${(fe * 8 - 4).toFixed(1)}deg) scale(${(0.6 + 0.4 * clamp(ft * 3)).toFixed(3)})`;
  const ts = spr(t, T.p1Export + 0.6, 0.5, 0.3); vis(s.toast, clamp(ts * 1.4) * (1 - sm(97.8, 98.5, t))); s.toast.style.transform = `translateY(${((1 - clamp(ts)) * 30).toFixed(1)}px)`;
  // ---- P2 actions: conflicting bars → synced plan
  const syncE = (i) => springStep(Math.max(0, t - T.p2Sync - 0.2 - i * 0.08), { duration: 0.6, bounce: 0.16 }).value;
  s.lanes.forEach((bars, i) => bars.forEach((n, j) => {
    const e = t <= T.p2Sync + 0.2 ? 0 : syncE(i * 2 + j), appear = oE(ramp(t, 99.5 + i * 0.12, 100.2 + i * 0.12));
    const x0 = 60 + 600 * hash(i, j, 21), w0 = 160 + 140 * hash(i, j, 22), x1 = 60 + j * 400 + 40 * i, w1 = 300 + 40 * hash(i, j, 23);
    n.style.left = px(lerp(x0, x1, e)); n.style.width = px(lerp(w0, w1, e)); vis(n, appear);
    n.style.background = e > 0.5 ? (j ? C.cyan : C.blue) : 'rgba(232,163,61,0.75)';
    n.style.top = px(62 + i * 96 + (1 - e) * (hash(i, j, 24) - 0.5) * 30);
  }));
  s.syncBtn.style.transform = `scale(${(1 - 0.06 * pulse(t, T.p2Sync - 0.05, 0.25)).toFixed(3)})`;
  const mb = spr(t, T.p2Sync + 1.4, 0.5, 0.35); vis(s.mrp, clamp(mb * 1.5)); s.mrp.style.transform = `scale(${clamp(mb, 0, 1.2).toFixed(3)})`;
  s.today.style.left = px(40 + 820 * ramp(t, 104.6, 113.0)); vis(s.today, sm(104.6, 105.2, t) * 0.6);
  // ---- P3 actions: KPI sparklines draw, bars grow, donut fills; a filter click re-cuts the data
  const recut = sm(T.p3Filter + 0.2, T.p3Filter + 0.8, t);
  s.kpis.forEach((kp, i) => kp.path.setAttribute('stroke-dashoffset', (400 * (1 - oE(ramp(t, 115.0 + i * 0.3, 116.6 + i * 0.3)))).toFixed(1)));
  s.cbars.forEach((n, j) => { const h0 = 80 + 220 * (0.35 + 0.65 * hash(j, 31)), h1 = 80 + 220 * (0.35 + 0.65 * hash(j, 37)); const e = spr(t, 116.0 + j * 0.06, 0.6, 0.12); const h = lerp(h0, h1, recut) * clamp(e, 0, 1.1); n.style.height = px(h); n.style.top = px(330 - h); });
  let acc = 0; [0.46, 0.28, 0.16].forEach((f, i) => { const ff = f * oE(ramp(t, 117.0 + i * 0.25, 118.4 + i * 0.25)) * lerp(1, [0.85, 1.25, 1.1][i], recut); s.arcs[i].setAttribute('stroke-dasharray', `${(628 * ff).toFixed(1)} 628`); s.arcs[i].setAttribute('transform', `rotate(${(-90 + 360 * acc).toFixed(1)})`); acc += ff; });
  s.filters.forEach((f, i) => { const on = i === 1 ? sm(T.p3Filter, T.p3Filter + 0.15, t) : 0; f.n.style.background = on > 0.5 ? C.blue : '#F1F3F6'; f.tx.style.color = on > 0.5 ? '#fff' : C.grey; });
  // ---- P4 actions: question types, the assistant thinks and answers; then the window becomes the training grid
  const q = 'لخّصلي حالة المواد الناقصة النهارده';
  s.ub.textContent = typeOn(q, t, { start: T.p4Type, wordsPerSecond: 2.6 }).text || '\u00A0';
  vis(s.ub, sm(T.p4Type - 0.3, T.p4Type, t));
  const think = t >= T.p4Send + 0.2 && t < T.p4Send + 1.3;
  vis(s.dots, think ? 1 : 0); s.dd.forEach((d, i) => { d.style.transform = `translateY(${(-6 * pulse(t, T.p4Send + 0.2 + i * 0.12 + Math.floor((t - T.p4Send) / 0.5) * 0.5, 0.3)).toFixed(1)}px)`; });
  const ans = spr(t, T.p4Send + 1.3, 0.55, 0.12); vis(s.ab, clamp(ans * 1.5)); s.ab.style.transform = `translateY(${((1 - clamp(ans)) * 24).toFixed(1)}px)`;
  s.ansLines.forEach((r, i) => { const e = oE(ramp(t, T.p4Send + 1.7 + i * 0.35, T.p4Send + 2.3 + i * 0.35)); vis(r, e); r.style.transform = `translateX(${((1 - e) * 24).toFixed(1)}px)`; });
  const tr = sm(T.p4Train, T.p4Train + 0.5, t); vis(s.chat, 1 - tr); setBlur(s.chat, tr * 10); vis(s.train, tr); setBlur(s.train, (1 - tr) * 10);
  s.depts.forEach((d, i) => { const on = sm(137.5 + i * 0.55, 137.8 + i * 0.55, t); d.n.style.borderColor = on > 0.5 ? C.blue : C.line; d.n.style.background = on > 0.5 ? '#F2F7FF' : '#F8FAFD'; d.ic.style.color = on > 0.5 ? C.blue : C.grey2; const ok = spr(t, 137.5 + i * 0.55, 0.45, 0.4); vis(d.ok, clamp(ok)); d.ok.style.transform = `scale(${clamp(ok, 0, 1.25).toFixed(3)})`; });
  // ---- cursor narrates the actions of each project
  renderCursor(s.cur, t, [
    { t: 85.0, x: 1000, y: 980 }, { t: 85.5, x: 310, y: 330, arc: 80 }, { t: 86.6, x: 470, y: 330, arc: 30 }, { t: 90.9, x: 470, y: 340 }, { t: 91.7, x: 930, y: 330, arc: -60 }, { t: 93.5, x: 1040, y: 760, arc: 50 },
    { t: 101.6, x: 1040, y: 760 }, { t: 102.6, x: 260, y: 905, arc: 80 }, { t: 104.4, x: 520, y: 980, arc: -40 },
    { t: 119.6, x: 1000, y: 980 }, { t: 120.6, x: 865, y: 330, arc: 60 }, { t: 122.4, x: 1040, y: 820, arc: -40 },
    { t: 131.2, x: 1040, y: 820 }, { t: 132.1, x: 202, y: 914, arc: 60 }, { t: 133.6, x: 640, y: 980, arc: -40 },
  ], [T.p1Execute, T.p1Export, T.p2Sync, T.p3Filter, T.p4Send]);
} });

// =====================================================================================================
// RESULTS 144–162 — the pixel at the centre with orbiting icons; four keywords land on the bars; then four tidy cards.
const RESULTS = [['clock', 'وقت أقل', 'تقارير جاهزة بدل الشغل اليدوي'], ['shield', 'أخطاء أقل', 'بيانات من مصدر واحد'], ['bolt', 'قرارات أسرع', 'متابعة واضحة في وقتها'], ['people', 'فرق أقوى', 'تدريب عملي على أدوات الشغل']];
SC.push({ id: 'results', a: CH.results[0], b: CH.results[1], z: 34, init(root) {
  const pix = PIXEL(root, 20);
  const halo = [0, 1].map(() => div(root, { borderRadius: '50%', border: '2px solid rgba(10,102,255,0.28)', zIndex: '5' }));
  const sats = ['report', 'data', 'plan', 'chart', 'ai', 'gear'].map((ic) => { const n = div(root, { width: '76px', height: '76px', borderRadius: '50%', background: '#FFFFFF', boxShadow: CARD_SHADOW, zIndex: '8' }); icon(n, ic, { size: 34, style: { left: '21px', top: '21px' } }); return n; });
  const words = RESULTS.map(([ic, w, d]) => ({ big: line(root, w, { y: 300, size: 132, weight: 700, font: DISPLAY, color: C.ink, lh: 1.2 }), sub: line(root, d, { y: 432, size: 38, weight: 400, color: C.grey }) }));
  const head = line(root, 'نتايج بتحسّها الإدارة كل يوم', { y: 300, size: 66, weight: 700, font: DISPLAY, color: C.ink, lh: 1.25, accent: { 3: C.blue } });
  const cards = RESULTS.map(([ic, w], i) => {
    const n = div(root, { width: '360px', height: '150px', borderRadius: '22px', background: '#FFFFFF', boxShadow: CARD_SHADOW, zIndex: '12', left: px(960 + (1.5 - i) * 400 - 180), top: '700px' });
    const icn = div(n, { left: 'auto', right: '28px', top: '42px', width: '66px', height: '66px', borderRadius: '18px', background: '#EEF5FF' }); icon(icn, ic, { size: 36, style: { left: '15px', top: '15px' } });
    const L = line(n, w, { x: 250, y: 75, size: 40, weight: 600, font: DISPLAY, color: C.ink, align: 'right', width: 240, lh: 1.25 });
    return { n, L };
  });
  S.results = { pix, halo, sats, words, head, cards };
}, render(t) {
  const s = S.results, grid = sm(T.resultsGrid, T.resultsGrid + 0.8, t), out = ioC(ramp(t, 161.2, 162.0));
  // the pixel (from the project implosion) rests at the centre, then rises under the head line when the cards arrive
  const py = lerp(560, 520, grid), ps = 48 + 6 * Math.sin(t * 2) - 30 * out;
  place(s.pix, 960, py, ps, ps, ps * 0.2); vis(s.pix, 1 - sm(161.7, 162.1, t));
  s.halo.forEach((h, i) => { const r = 120 + i * 70 + 10 * Math.sin(t * 1.6 + i); place(h, 960, py, r * 2, r * 2, r); vis(h, (0.8 - i * 0.3) * sm(144.2, 145, t) * (1 - out)); });
  s.sats.forEach((n, i) => {
    const o = orbitPoint(t, { cx: 960, cy: py, rx: lerp(470, 560, grid), ry: lerp(150, 120, grid), period: 14, phase: i / 6, tilt: -4 });
    const appear = spr(t, 144.4 + i * 0.12, 0.6, 0.2) * (1 - out);
    place(n, o.x, o.y, 76, 76, 38); n.style.transform = `scale(${(o.scale * clamp(appear, 0, 1.1)).toFixed(3)})`;
    vis(n, clamp(appear) * o.opacity); n.style.zIndex = o.depth > 0 ? '22' : '8'; setBlur(n, o.blur ?? 0);
  });
  s.words.forEach((w, i) => {
    const a = T.results[i], b = (T.results[i + 1] ?? T.resultsGrid) - 0.45;
    rise(w.big, t, a, b, { stagger: 0.1, dy: 50, blur: 16, scale0: 1.08 });
    rise(w.sub, t, a + 0.45, b, { stagger: 0.05, dy: 20, blur: 8 });
  });
  rise(s.head, t, T.resultsGrid + 0.3, 161.2, { stagger: 0.08, dy: 30 });
  s.cards.forEach((c, i) => {
    const e = spr(t, T.resultsGrid + 0.5 + i * 0.18, 0.6, 0.2), o = 1 - ioC(ramp(t, 161.0 + i * 0.05, 161.5 + i * 0.05));
    vis(c.n, clamp(e * 1.5) * o); c.n.style.transform = `translateY(${((1 - clamp(e)) * 60).toFixed(1)}px) scale(${lerp(0.85, 1, clamp(e, 0, 1.1)).toFixed(4)})`;
    rise(c.L, t, T.resultsGrid + 0.7 + i * 0.18, 161.0, { dy: 14, blur: 6 });
  });
} });

// =====================================================================================================
// METHOD 162–171 — five steps on one path (right → left); a pixel travels and lights each node; the path collapses into it.
const PATH_D = 'M 1720 600 C 1500 470, 1330 470, 1160 560 S 820 690, 640 590 S 360 470, 200 560';
SC.push({ id: 'method', a: CH.method[0], b: CH.method[1], z: 36, init(root) {
  const title = line(root, 'إزاي بنشتغل معاك', { y: 214, size: 70, weight: 700, font: DISPLAY, color: C.ink, lh: 1.25 });
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', zIndex: '4', overflow: 'visible' } }, root);
  const base = el('path', { d: PATH_D, stroke: C.line, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, svg);
  const on = el('path', { d: PATH_D, stroke: C.blue, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, svg);
  const len = on.getTotalLength(); on.setAttribute('stroke-dasharray', `${len}`); on.setAttribute('stroke-dashoffset', `${len}`);
  base.setAttribute('stroke-dasharray', `${len}`); base.setAttribute('stroke-dashoffset', `${len}`);
  const steps = ['نفهم المشكلة', 'نصمم الحل', 'نبني النظام', 'ندرّب الفريق', 'نتابع ونطوّر'];
  const nodes = steps.map((label, i) => {
    const u = (i + 0.5) / steps.length, p = on.getPointAtLength(len * u);
    const c = el('circle', { cx: p.x, cy: p.y, r: 15, fill: '#FFFFFF', stroke: C.blue, 'stroke-width': 3, opacity: 0 }, svg);
    const above = i % 2 === 0;
    const L = line(root, label, { x: p.x, y: p.y + (above ? -78 : 86), size: 38, weight: 500, color: C.ink, width: 320, z: 10 });
    const num = line(root, ['١', '٢', '٣', '٤', '٥'][i], { x: p.x, y: p.y + (above ? -128 : 136), size: 26, weight: 500, color: C.blue, width: 120, z: 10 });
    return { c, L, num, p, u };
  });
  const pix = PIXEL(root, 20);
  S.method = { title, on, base, len, nodes, pix };
}, render(t) {
  const s = S.method, out = ioC(ramp(t, 170.2, 171.0));
  rise(s.title, t, 162.6, 170.0, { stagger: 0.08, dy: 30 });
  const draw = oE(ramp(t, 162.8, 164.2));
  s.base.setAttribute('stroke-dashoffset', (s.len * (1 - draw)).toFixed(1)); s.base.setAttribute('opacity', (1 - out).toFixed(3));
  // the travelling pixel: from the right end to each node in turn (spring between nodes)
  const keys = [[0, 0.02]]; T.methodNodes.forEach((tn, i) => keys.push([tn - 0.5, s.nodes[i].u]));
  const u = clamp(springTrack(keys, t, { duration: 0.7, bounce: 0.1 }), 0, 1), p = s.on.getPointAtLength(s.len * u);
  s.on.setAttribute('stroke-dashoffset', (s.len * (1 - u)).toFixed(1)); s.on.setAttribute('opacity', (1 - out).toFixed(3));
  const cx = lerp(p.x, 960, out), cy = lerp(p.y, 470, out), sz = 30 + 10 * out;
  place(s.pix, cx, cy, sz, sz, sz * 0.2); vis(s.pix, sm(162.9, 163.2, t));
  s.nodes.forEach((n, i) => {
    const tn = T.methodNodes[i], lit = sm(tn - 0.1, tn + 0.1, t), appear = sm(163.0 + i * 0.12, 163.4 + i * 0.12, t) * (1 - out);
    n.c.setAttribute('opacity', appear.toFixed(3)); n.c.setAttribute('fill', lit > 0.5 ? C.blue : '#FFFFFF'); n.c.setAttribute('r', (15 + 5 * pulse(t, tn, 0.5)).toFixed(1));
    const cxN = lerp(n.p.x, 960, out), cyN = lerp(n.p.y, 470, out); n.c.setAttribute('cx', cxN.toFixed(1)); n.c.setAttribute('cy', cyN.toFixed(1));
    rise(n.L, t, tn, 170.0, { stagger: 0.07, dy: 18, blur: 8 });
    rise(n.num, t, tn - 0.15, 170.0, { dy: 12, blur: 6 });
    n.L.line.style.opacity = (0.55 + 0.45 * lit).toFixed(3);
  });
} });

// =====================================================================================================
// FINALE 171–180 — offer; the pixel bursts into 1,699 traced pixels that build the logo; the i-dot lands last; tagline + CTA.
const LOGO2 = { width: 760, cx: 960, top: 262 };
SC.push({ id: 'finale', a: CH.finale[0], b: CH.finale[1], z: 38, init(root) {
  const cam = div(root, { width: px(W), height: px(H), transformOrigin: '50% 44%' });
  const offer = line(cam, 'جاهزين ننقل نفس التجربة لشركتك', { y: 214, size: 62, weight: 700, font: DISPLAY, color: C.ink, lh: 1.25, accent: { 4: C.blue } });
  const logo = buildLogo(cam, LOGO2);
  const cv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '15' } }, cam);
  const targets = LOGO.particles.map((p) => { const [x, y] = logo.toScr(p[0], p[1]); return { x, y, color: p[2] }; });
  const parts = assembly(targets, { ox: 960, oy: 470, t0: T.burst2, seed: 7, spread: 0.32, swirl: 620, bias: 160, reach: 760 });
  const hero = PIXEL(cam, 30);
  const rings = [0, 1].map(() => div(cam, { borderRadius: '50%', border: `3px solid ${C.blue}`, zIndex: '14', opacity: '0' }));
  const tag = line(cam, 'أنظمة ذكية… لشغل حقيقي', { y: 742, size: 64, weight: 700, font: DISPLAY, color: C.ink, lh: 1.25, accent: { 1: C.blue } });
  const cta = div(cam, { zIndex: '20', overflow: 'hidden', background: PIX_BG, boxShadow: '0 22px 44px rgba(10,80,230,0.30), inset 0 1px 0 rgba(255,255,255,0.25)' });
  const ctaL = line(cta, 'ابدأ معنا', { x: 190, y: 44, size: 40, weight: 500, color: '#FFFFFF', width: 380 });
  const ripl = div(cta, { borderRadius: '50%', background: 'rgba(255,255,255,0.35)', opacity: '0' });
  S.finale = { cam, offer, logo, cv, g: cv.getContext('2d'), parts, hero, rings, tag, cta, ctaL, ripl, cur: makeCursor(cam) };
}, render(t) {
  const s = S.finale, lg = s.logo;
  s.cam.style.transform = `scale(${(1 + 0.025 * ramp(t, 174, 180)).toFixed(4)})`;
  rise(s.offer, t, 171.2, 173.4, { stagger: 0.08, dy: 30 });
  // hero pixel: anticipation, burst, flight to the i-dot (spinning), landing squash
  const [dx, dy] = lg.toScr((459 + 519) / 2, (408 + 459) / 2), dw = 60 * lg.LS, dh = 51 * lg.LS;
  let hx = 960, hy = 470, hw = 40, hh = 40, rot = 0;
  if (t < T.burst2) { const a = sm(T.burst2 - 0.15, T.burst2, t); hw = 40 * (1 + 0.3 * a); hh = 40 * (1 - 0.25 * a); }
  else if (t < T.burst2 + 0.6) { const u = ramp(t, T.burst2, T.burst2 + 0.6), e = ioC(u); hx = lerp(960, dx, e); hy = lerp(470, dy, u) - 260 * 4 * u * (1 - u); hw = lerp(40, dw, e); hh = lerp(40, dh, e); rot = 360 * e; }
  else { const tau = t - T.burst2 - 0.6, d = Math.exp(-tau * 8) * Math.cos(tau * 24); hx = dx; hy = dy; hw = dw * (1 + 0.32 * d); hh = dh * (1 - 0.3 * d); hy += (dh - hh) / 2; }
  place(s.hero, hx, hy, hw, hh, Math.min(hw, hh) * 0.18); s.hero.style.transform = `rotate(${rot.toFixed(1)}deg)`;
  const dotSwap = sm(T.burst2 + 0.95, T.burst2 + 1.15, t); vis(s.hero, 1 - dotSwap);
  // particles fly on bowed paths with a spring snap, then dissolve into the crisp vector letters
  const g = s.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const live = t >= T.burst2 && t < T.burst2 + 1.5; s.cv.style.display = live ? 'block' : 'none';
  if (live) {
    for (let i = 0; i < s.parts.length; i++) {
      const p = s.parts[i], f = flight(p, t, { duration: 0.6, bounce: 0.16, size0: 4, size1: 8.4 }); if (!f) continue;
      const fade = 1 - clamp((t - (T.burst2 + 1.0 + 0.3 * hash(i, 17))) / 0.12); if (fade <= 0) continue;
      const a = (f.rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
      g.globalAlpha = fade; g.fillStyle = p.color; g.setTransform(c, sn, -sn, c, f.x, f.y); g.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  }
  const crisp = sm(T.burst2 + 0.95, T.burst2 + 1.3, t), glow = logoSheen(lg.parts, t, T.burst2 + 1.6, { dur: 1.2 });
  lg.parts.forEach((p, k) => {
    partFilter(p.im, 0, glow[k]);
    if (k === 1) { vis(p.im, dotSwap); return; }
    if (k === 10) { const e = spr(t, T.burst2 + 1.0, 0.55, 0.32); vis(p.im, clamp(e * 2)); p.im.style.transform = `rotate(${lerp(-135, 0, clamp(e, 0, 1.1)).toFixed(2)}deg) scale(${clamp(e, 0, 1.2).toFixed(4)})`; return; }
    vis(p.im, crisp);
  });
  const plus = lg.toScr((923 + 1109) / 2, (679 + 859) / 2);
  [[T.burst2, 960, 470, 36, 640], [T.burst2 + 1.0, plus[0], plus[1], 60, 300]].forEach(([t0, x, y, r0, r1], i) => {
    const u = ramp(t, t0, t0 + 0.9); if (u <= 0 || u >= 1) { s.rings[i].style.opacity = '0'; return; }
    const r = lerp(r0, r1, oE(u)); place(s.rings[i], x, y, 2 * r, 2 * r, r); s.rings[i].style.opacity = (0.5 * Math.pow(1 - u, 1.4)).toFixed(3);
  });
  rise(s.tag, t, 175.9, 999, { stagger: 0.1, dy: 34 });
  const cp = clamp(spr(t, T.cta, 0.5, 0.26), 0, 1.15), press = 1 - 0.05 * pulse(t, T.ctaClick, 0.18);
  place(s.cta, 960, 860, 380, 88, 44); vis(s.cta, clamp(cp * 1.6)); s.cta.style.transform = `scale(${(lerp(0.6, 1, cp) * press).toFixed(4)})`;
  rise(s.ctaL, t, T.cta + 0.12, 999, { dy: 16, blur: 8, stagger: 0.05 });
  const ru = ramp(t, T.ctaClick, T.ctaClick + 0.55); place(s.ripl, 230, 50, 700 * oE(ru), 700 * oE(ru)); s.ripl.style.opacity = ru > 0 && ru < 1 ? (0.9 * (1 - ru)).toFixed(3) : '0';
  renderCursor(s.cur, t, [{ t: 176.6, x: 1320, y: 1010 }, { t: 177.2, x: 1010, y: 872, arc: 70 }, { t: 177.6, x: 1040, y: 890 }, { t: 178.1, x: 1400, y: 1010, arc: -40 }], [T.ctaClick]);
} });

// =====================================================================================================
// GLOBAL: the page (paper + pixel grid) and the presentation HUD (brand mark, chapter label, progress hairline).
let BG, HUD;
function initGlobal() {
  BG = { root: full(stage, { background: PAPER_BG, zIndex: '0' }) };
  BG.grid = dotGrid(BG.root, { step: 48, size: 3, z: 1 });
  const root = full(stage, { zIndex: '60', pointerEvents: 'none' });
  const mark = PIXEL(root, 61); place(mark, 112, 76, 16, 16, 3.5);
  const brand = line(root, 'Pixel Plus', { x: 132, y: 76, size: 30, weight: 400, font: SERIF, italic: true, color: C.ink2, align: 'left', width: 300, dir: 'ltr', lh: 1.2, z: 61 });
  const labels = CHAPTERS.map(([, n, name]) => line(root, `${n}  ${name}`, { x: 1824, y: 76, size: 26, weight: 500, color: C.grey, align: 'right', width: 500, z: 61 }));
  const prog = div(root, { left: '96px', top: '1044px', height: '3px', borderRadius: '2px', background: C.blue, zIndex: '61' });
  const track = div(root, { left: '96px', top: '1044px', width: px(1728), height: '3px', borderRadius: '2px', background: 'rgba(31,35,40,0.08)', zIndex: '60' });
  HUD = { root, mark, brand, labels, prog, track };
}
function renderGlobal(t) {
  const in3d = t >= T.wipe[1] && t < 83.9;
  show(BG.root, !in3d);
  if (!in3d) BG.grid.draw(t, (x, y, i, j) => ripple(t, T.land, x, y, 960, 668, { speed: 1300, decay: 1.4 }) * 0.9 + ripple(t, T.snap, x, y, 960, 520, { speed: 1500, decay: 1.6 }) * 0.6
    + OPEN_BEATS.reduce((m, b) => m + ripple(t, b, x, y, 960, 683, { speed: 900, band: 60, decay: 2.2 }) * 0.45, 0)
    + ripple(t, T.burst1, x, y, 960, 520, { speed: 1600, decay: 1.6 }) * 0.6 + ripple(t, T.burst2, x, y, 960, 470, { speed: 1500, decay: 1.2 }) * 0.9 + twinkle(t, i, j, 23, { rate: 0.4, share: 0.04 }),
  t > 84 && t < 144 ? 0.05 : 0.075);
  BG.root.style.transform = `translate(${(noise1(t * 0.05, 1) * 10).toFixed(1)}px, ${(noise1(t * 0.05, 2) * 6).toFixed(1)}px) scale(1.02)`;
  const hv = sm(11.6, 12.2, t) * (1 - sm(170.6, 171.2, t));
  vis(HUD.mark, hv); HUD.mark.style.transform = `rotate(${(45 * pulse(t, 48, 0.8)).toFixed(1)}deg)`;
  rise(HUD.brand, t, 11.7, 170.6, { stagger: 0.05, dy: 10, blur: 6 });
  HUD.labels.forEach((L, i) => { const a = CHAPTERS[i][0], b = (CHAPTERS[i + 1]?.[0] ?? 171) - 0.35; rise(L, t, a + 0.15, b, { stagger: 0.04, dy: 10, blur: 6, outDur: 0.3 }); });
  HUD.prog.style.width = px(1728 * clamp((t - 12) / (171 - 12))); vis(HUD.prog, hv); vis(HUD.track, hv);
}

// =====================================================================================================
export default {
  duration: 180, fps: FPS,
  async init(st, { W: w, H: h }) {
    stage = st; W = w; H = h;
    LOGO = await (await fetch(new URL('./plates/logo.json', import.meta.url))).json();
    stage.style.background = C.paper;
    initGlobal();
    SC.forEach((s) => { s.root = full(stage, { overflow: 'hidden', zIndex: String(s.z), display: 'none' }); if (!s.lazy) { s.init(s.root); s.ready = true; } });
  },
  render(t) {
    renderGlobal(t);
    for (const s of SC) {
      const on = t >= s.a && t < s.b; s.root.style.display = on ? 'block' : 'none';
      if (!on) continue;
      if (!s.ready) { s.init(s.root); s.ready = true; } // lazy chapters build themselves on first use; output is pure in t either way
      s.render(t);
    }
  },
};
