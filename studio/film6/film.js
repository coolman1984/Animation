// Film 6 — Pixel Plus — «بكسل واحد» — 30 s Facebook Reels, authored 1080×1920 @ 30 fps, 120 BPM (beat 0.5 s, bar 2 s).
// One hero: the blue pixel from the logo's i-dot. It morphs through three worlds — ADS on brand blue (4–10), ANIMATION on
// paper (10–16), SOFTWARE in dark mode (16–22) — the worlds slam in as three bands (22–24) and implode into the pixel, which
// bursts into 1,699 pixels that build the owner's logo pixel by pixel (24–28); credit hold (28–30).
// Grammar from the owner's two UI-morph references: one container that springs between shapes with motion blur,
// blur cross-faded content, a cursor that drives every change, soft shadows on a calm field.
// Every frame is a closed-form function of t (springs, seeded hashes): any frame renders identically in any order.
import { clamp, lerp, ramp, ease, rng, el, textLine } from '../lib/motion.js';
import { springStep, springTrack, hash } from '../lib/kinetics.js';

const C = {
  paper: '#F2F0EB', ink: '#1F2328', grey: '#8D949E', greyD: '#5F6670', blue: '#0A66FF', blueD: '#0838C8', cyan: '#18B6FF',
  night: '#0E1013', card: '#15181D', tile: '#1E2228', heart: '#FF4D6D', white: '#FFFFFF',
};
const PAPER_BG = 'radial-gradient(ellipse 85% 55% at 50% 36%, #FCFBF8 0%, #F2F0EB 56%, #E5E2DB 100%)';
const BLUE_BG = 'radial-gradient(ellipse 95% 62% at 50% 38%, #3586FF 0%, #0B5CF2 50%, #0738C2 100%)';
const NIGHT_BG = 'radial-gradient(ellipse 90% 55% at 50% 36%, #1A2132 0%, #0F1219 52%, #0A0C10 100%)';
const PIX_BG = 'linear-gradient(160deg, #2C88FF 0%, #0A5EF5 60%, #0846D6 100%)';
const PIX_SHADOW = '0 16px 34px rgba(10,80,230,0.30), 0 3px 8px rgba(10,60,200,0.25)';
const AR = "'Alexandria'", MONO = "'Space Mono'";
const FPS = 30;
let W = 1080, H = 1920, stage, LOGO;
const S = {}, SC = [];

// ---------- helpers ----------
const px = (v) => `${(+v).toFixed(2)}px`;
const oE = ease.outExpo, ioC = ease.inOutCubic, oC = ease.outCubic;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const pulse = (t, t0, d) => Math.pow(Math.sin(Math.PI * clamp((t - t0) / d)), 2);
const spr = (t, start, duration = 0.5, bounce = 0.2) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
const sT = (keys, t, duration = 0.45, bounce = 0.14) => springTrack(keys, t, { duration, bounce });
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, p) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(p)))).join(',')})`; };
const cover = (cx, cy) => Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
// Place a box by its centre.
const place = (n, x, y, w, h, r) => { n.style.left = px(x - w / 2); n.style.top = px(y - h / 2); n.style.width = px(Math.max(0, w)); n.style.height = px(Math.max(0, h)); if (r !== undefined) n.style.borderRadius = px(Math.max(0, r)); };
// Motion blur from the speed of a geometry function g(t) → {k: number}.
const mblur = (g, t, k = 1 / 1100, max = 5) => { const a = g(t), b = g(t - 1 / 60); let v = 0; for (const key of Object.keys(a)) v += Math.abs(a[key] - b[key]); return clamp(v * 60 * k, 0, max); };
const setBlur = (n, b) => { n.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : 'none'; };

// Centred Arabic (or Latin) line of word spans — `.line/.word` so the studio's text/safe-area checks see it.
function words(parent, text, { size, weight = 700, color = C.ink, cy, accent = {}, font = AR, track = 0, dir = 'rtl', lh = 1.35, z = 8 }) {
  const L = textLine(parent, text, { left: '0', top: px(cy - (size * lh) / 2), width: px(W), justifyContent: 'center', fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), letterSpacing: `${track}em`, direction: dir, zIndex: String(z) });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; });
  return L;
}
// Words rise out of a soft mask with blur (reference grammar: content resolves from blur), then leave upward.
function rise(L, t, tIn, tOut = 99, { stagger = 0.07, dur = 0.75, dy = 46, blur = 12, outDur = 0.35, outDy = -26, scale0 = 1 } = {}) {
  const vis = t >= tIn - 0.01 && t <= tOut + outDur + L.words.length * 0.03 + 0.02;
  L.line.style.display = vis ? 'flex' : 'none';
  if (!vis) return;
  L.words.forEach((w, i) => {
    const a = tIn + i * stagger, pin = oE(ramp(t, a, a + dur)), b0 = tOut + i * 0.03, pout = ioC(ramp(t, b0, b0 + outDur));
    const y = (1 - pin) * dy + pout * outDy, b = (1 - pin) * blur + pout * 9;
    w.style.opacity = (clamp(pin * 1.4) * (1 - pout)).toFixed(3);
    w.style.transform = `translateY(${y.toFixed(2)}px) scale(${lerp(scale0, 1, pin).toFixed(4)})`;
    setBlur(w, b);
  });
}

// The pixel grid: square dots (pixels, not circles) on every world; boost(x, y, i, j) lifts a dot towards `hot`.
function dotGrid(parent, { rgb = '31,35,40', alpha = 0.1, hot = '10,102,255', step = 54, size = 4, z = 1 } = {}) {
  const cv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: String(z) } }, parent);
  const g = cv.getContext('2d');
  const cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1, ox = (W - (cols - 1) * step) / 2, oy = (H - (rows - 1) * step) / 2;
  return {
    cv,
    draw(boost) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = `rgba(${rgb},${alpha})`;
      const hotList = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = ox + i * step, y = oy + j * step, b = boost ? boost(x, y, i, j) : 0;
        if (b > 0.02) hotList.push([x, y, Math.min(1, b)]); else g.fillRect(x - size / 2, y - size / 2, size, size);
      }
      for (const [x, y, b] of hotList) { const s = size * (1 + 1.5 * b); g.fillStyle = `rgba(${hot},${(alpha + (0.9 - alpha) * b).toFixed(3)})`; g.fillRect(x - s / 2, y - s / 2, s, s); }
    },
  };
}
// Sparse seeded twinkles so held frames never look frozen; a ripple ring from (cx, cy) starting at t0.
const twinkle = (t, i, j, seed, rate = 0.45, share = 0.05) => {
  if (hash(i, j, seed) > share) return 0;
  const c = (t * rate + hash(i, j, seed + 1)) % 1;
  return c < 0.16 ? Math.pow(Math.sin((Math.PI * c) / 0.16), 2) * 0.75 : 0;
};
const ripple = (t, t0, x, y, cx, cy, { speed = 1500, band = 70, decay = 1.3 } = {}) => {
  if (t < t0) return 0;
  const d = Math.hypot(x - cx, y - cy), f = (t - t0) * speed;
  return Math.exp(-(((d - f) / band) ** 2)) * Math.exp(-(t - t0) * decay);
};

// Chapter eyebrow: brand name left, chapter number + name right (information: a showreel's three chapters).
function eyebrow(parent, num, label, { light = false } = {}) {
  const col = light ? 'rgba(255,255,255,0.74)' : 'rgba(31,35,40,0.56)';
  const left = div(parent, { left: '72px', top: '294px', fontFamily: MONO, fontSize: '26px', letterSpacing: '0.22em', color: col, whiteSpace: 'nowrap', zIndex: '20' });
  left.textContent = 'PIXEL PLUS';
  const right = div(parent, { left: 'auto', right: '72px', top: '284px', display: 'flex', gap: '16px', alignItems: 'center', direction: 'rtl', whiteSpace: 'nowrap', zIndex: '20', color: col });
  el('span', { text: label, style: { fontFamily: AR, fontWeight: '500', fontSize: '34px' } }, right);
  el('span', { text: num, style: { fontFamily: MONO, fontSize: '26px', letterSpacing: '0.12em' } }, right);
  return { left, right };
}
function eyebrowAt(E, t, tIn, tOut) {
  const p = oE(ramp(t, tIn, tIn + 0.6)), q = ioC(ramp(t, tOut, tOut + 0.3));
  for (const [n, k] of [[E.left, 1], [E.right, -1]]) {
    n.style.opacity = (p * (1 - q)).toFixed(3);
    n.style.transform = `translateX(${((1 - p) * 30 * k).toFixed(1)}px) translateY(${(-q * 14).toFixed(1)}px)`;
  }
}

// Cursor: a pointer that glides on a soft arc, dips on click and leaves a ring.
function makeCursor(parent, { light = false } = {}) {
  const ring = div(parent, { width: '84px', height: '84px', borderRadius: '50%', border: `3px solid ${light ? 'rgba(255,255,255,0.85)' : 'rgba(31,35,40,0.5)'}`, zIndex: '59', opacity: '0' });
  const s = el('svg', { width: 44, height: 60, viewBox: '0 0 44 60', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '60', transformOrigin: '4px 3px', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.22))', display: 'none' } }, parent);
  el('path', { d: 'M4 3 L4 45 L14.5 35 L21.5 51.5 L29 48.5 L22 32.5 L36.5 32.5 Z', fill: light ? '#FFFFFF' : C.ink, stroke: light ? C.ink : '#FFFFFF', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, s);
  return { s, ring };
}
function cursorAt(keys, t) {
  if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
  for (let i = 1; i < keys.length; i++) if (t <= keys[i].t) {
    const a = keys[i - 1], b = keys[i], u = ioC(ramp(t, a.t, b.t));
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, off = Math.sin(Math.PI * u) * (b.arc ?? 70) * Math.min(1, len / 500);
    return { x: lerp(a.x, b.x, u) + (-dy / len) * off, y: lerp(a.y, b.y, u) + (dx / len) * off };
  }
  const k = keys[keys.length - 1];
  return { x: k.x, y: k.y };
}
function renderCursor(c, t, keys, clicks = [], { fadeIn = 0.22, fadeOut = 0.25 } = {}) {
  const t0 = keys[0].t, t1 = keys[keys.length - 1].t, vis = t >= t0 && t <= t1 + fadeOut;
  c.s.style.display = vis ? 'block' : 'none';
  if (vis) {
    const p = cursorAt(keys, t), o = sm(t0, t0 + fadeIn, t) * (1 - sm(t1, t1 + fadeOut, t));
    let sc = 1; for (const tc of clicks) sc -= 0.2 * pulse(t, tc - 0.05, 0.2);
    c.s.style.transform = `translate(${(p.x - 4).toFixed(1)}px, ${(p.y - 3).toFixed(1)}px) scale(${sc.toFixed(3)})`;
    c.s.style.opacity = o.toFixed(3);
  }
  let shown = false;
  for (const tc of clicks) {
    const u = ramp(t, tc, tc + 0.45);
    if (u > 0 && u < 1) { const p = cursorAt(keys, tc), r = 10 + 46 * oE(u); c.ring.style.transform = `translate(${(p.x - 42).toFixed(1)}px, ${(p.y - 42).toFixed(1)}px) scale(${(r / 42).toFixed(3)})`; c.ring.style.opacity = (0.8 * (1 - u)).toFixed(3); shown = true; }
  }
  if (!shown) c.ring.style.opacity = '0';
}
// One thin ring expanding from a point.
function ringAt(n, t, t0, cx, cy, { dur = 0.8, r0 = 30, r1 = 220, a = 0.7 } = {}) {
  const u = ramp(t, t0, t0 + dur);
  if (u <= 0 || u >= 1) { n.style.opacity = '0'; return; }
  const r = lerp(r0, r1, oE(u));
  place(n, cx, cy, 2 * r, 2 * r, r);
  n.style.opacity = (a * Math.pow(1 - u, 1.4)).toFixed(3);
}
const heartPath = 'M0 9 C-2 4 -10 -2 -16 -2 C-24 -2 -28 6 -26 12 C-24 19 -10 28 0 34 C10 28 24 19 26 12 C28 6 24 -2 16 -2 C10 -2 2 4 0 9 Z';

// =====================================================================================================
// HOOK 0–4 — a pixel drops onto paper, a ripple runs through the pixel grid, the promise line; the pixel hops into the
// sentence as its full stop; the cursor clicks it and we dive into it (the pixel becomes a portal into the blue world).
const DIVE = [3.55, 4.0];
SC.push({ id: 'hook', a: 0, b: 4.0, z: 1, init(root) {
  full(root, { background: PAPER_BG });
  const grid = dotGrid(root, {});
  const cam = full(root, { zIndex: '3', transformOrigin: '0 0' });
  const l1 = words(cam, 'كل فكرة عظيمة', { size: 98, weight: 700, cy: 1000, lh: 1.2 });
  const l2 = words(cam, 'تبدأ ببكسل واحد', { size: 98, weight: 700, cy: 1128, lh: 1.2, accent: { 1: C.blue } });
  const shadow = div(cam, { borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,40,120,0.26), rgba(10,40,120,0))', zIndex: '4' });
  const ghosts = [0, 1, 2].map(() => div(cam, { borderRadius: '16px', background: C.blue, zIndex: '5' }));
  const pix = div(cam, { background: PIX_BG, boxShadow: PIX_SHADOW, zIndex: '6' });
  const ring = div(cam, { border: `3px solid ${C.blue}`, zIndex: '5', opacity: '0' });
  S.hook = { root, grid, cam, l1, l2, shadow, ghosts, pix, ring, cur: makeCursor(root), B: null };
}, render(t) {
  const s = S.hook;
  if (!s.B) { // the full stop sits after the last word (left end in RTL), on the baseline — measured once, untransformed
    const keep = s.l2.words.map((w) => w.style.transform); s.l2.words.forEach((w) => { w.style.transform = 'none'; });
    const was = s.l2.line.style.display; s.l2.line.style.display = 'flex'; s.cam.style.transform = 'none';
    const left = Math.min(...s.l2.words.map((w) => w.getBoundingClientRect().left));
    s.l2.line.style.display = was; s.l2.words.forEach((w, i) => { w.style.transform = keep[i]; });
    s.B = { x: left - 30, y: 1128 + 98 * 0.27 + 4 };
  }
  const B = s.B, A = { x: 540, y: 700 };
  // pixel state (centre, size, squash)
  let x, y, z = 72, sx = 1, sy = 1, rot = 0;
  if (t < 0.5) { const u = t / 0.5; x = A.x; y = lerp(330, A.y, u * u); sx = 1 - 0.2 * u ** 1.5; sy = 1 + 0.42 * u ** 1.5; }
  else if (t < 2.0) { const tau = t - 0.5, d = Math.exp(-tau * 7) * Math.cos(tau * 22); x = A.x; y = A.y; sx = 1 + 0.36 * d; sy = 1 - 0.32 * d; }
  else if (t < 2.4) { const u = ramp(t, 2.0, 2.4), e = ioC(u); x = lerp(A.x, B.x, e); y = lerp(A.y, B.y, u) - 240 * 4 * u * (1 - u); z = lerp(72, 30, e); sy = 1 + 0.22 * Math.sin(Math.PI * u); sx = 1 / sy; rot = -180 * e; }
  else { const tau = t - 2.4, d = Math.exp(-tau * 8) * Math.cos(tau * 24) * 0.7; x = B.x; y = B.y; z = 30; sx = 1 + 0.36 * d; sy = 1 - 0.32 * d; rot = -180 + 16 * Math.exp(-tau * 6) * Math.sin(tau * 18); }
  const hover = 1 + 0.3 * clamp(spr(t, 3.15, 0.35, 0.3), 0, 1.2) - 0.18 * pulse(t, 3.47, 0.14);
  z *= hover;
  y += (z * (1 - sy)) / 2; // squash grows from the contact edge
  // dive: the camera pushes through the full stop; the pixel grows into a portal
  const u = ramp(t, DIVE[0], DIVE[1]), push = 1 + 0.045 * sm(1.3, 3.55, t), camS = push * (1 + 2.4 * u * u), Sz = z * Math.exp(Math.log(5200 / z) * Math.pow(u, 2.3));
  s.cam.style.transform = `translate(${B.x}px, ${B.y}px) scale(${camS.toFixed(4)}) translate(${-B.x}px, ${-B.y}px)`;
  setBlur(s.cam, 14 * Math.pow(u, 1.4));
  const zPix = u > 0 ? Sz / camS : z / push;
  place(s.pix, x, y, zPix * sx, zPix * sy, zPix * 0.22);
  s.pix.style.transform = `rotate(${rot.toFixed(2)}deg)`;
  s.pix.style.display = t < DIVE[0] + 0.06 ? 'block' : 'none';
  S.portal = u > 0 ? { x: B.x, y: B.y, size: Sz, r: Math.min(Sz * 0.22, 600) } : null;
  // fall ghosts (motion trail) and contact shadow
  s.ghosts.forEach((g, i) => {
    const tg = t - (i + 1) * 0.045;
    if (t < 0.5 && tg > -0.14) { const ug = tg / 0.5, uq = Math.max(0, ug); place(g, A.x, lerp(330, A.y, ug * Math.abs(ug)), 72 * (1 - 0.2 * uq ** 1.5), 72 * (1 + 0.42 * uq ** 1.5), 16); g.style.opacity = (0.22 - i * 0.06).toFixed(3); }
    else g.style.opacity = '0';
  });
  const onA = t < 2.15, gy = onA ? A.y + 36 : B.y + 15, gx = onA ? A.x : B.x, gw = onA ? 110 * clamp(t / 0.5) * (1 - 0.6 * sm(2.0, 2.15, t)) : 50 * sm(2.3, 2.4, t);
  place(s.shadow, gx, gy + 10, gw * sx, 22);
  s.shadow.style.opacity = String(u > 0 ? 0 : 1);
  ringAt(s.ring, t, 0.5, A.x, A.y + 10, { r0: 40, r1: 190, dur: 0.9, a: 0.55 });
  if (t > 2.38 && t < 3.3) ringAt(s.ring, t, 2.4, B.x, B.y, { r0: 18, r1: 90, dur: 0.6, a: 0.5 });
  // copy
  rise(s.l1, t, 0.75, 99);
  rise(s.l2, t, 1.3, 99);
  const fadeDive = 1 - sm(DIVE[0] + 0.01, DIVE[0] + 0.17, t);
  for (const L of [s.l1, s.l2]) L.words.forEach((w) => { w.style.opacity = ((+w.style.opacity || 0) * fadeDive).toFixed(3); });
  // grid: landing ripple + second ripple from the full stop + twinkles
  s.grid.draw((gx2, gy2, i, j) => ripple(t, 0.5, gx2, gy2, A.x, A.y + 36) * 0.9 + ripple(t, 2.4, gx2, gy2, B.x, B.y, { speed: 1100, decay: 2.2 }) * 0.6 + twinkle(t, i, j, 3));
  renderCursor(s.cur, t, [{ t: 2.65, x: 1000, y: 1520 }, { t: 3.3, x: B.x + 8, y: B.y + 10, arc: 90 }, { t: 3.62, x: B.x + 8, y: B.y + 10 }], [3.5], { fadeOut: 0.12 });
} });

// =====================================================================================================
// ADS 4–10 — inside the pixel: a Reels ad («إعلانك هنا»), a tap starts a stream of hearts, the frame morphs
// 9:16 → 1:1 → 16:9, headline; the frame collapses into a ball that falls into the paper world.
const AD_W = [[3.6, 0], [3.98, 0], [4.0, 110], [4.12, 400], [6.0, 560], [6.5, 800], [7.0, 720], [9.42, 88]];
const AD_H = [[3.6, 0], [3.98, 0], [4.0, 110], [4.12, 711], [6.0, 560], [6.5, 450], [7.0, 405], [9.42, 88]];
const AD_Y = [[3.6, 745], [7.0, 600], [9.4, 520]];
const AD_X = [[3.6, 540], [9.4, 860]];
const AD_R = [[3.6, 24], [4.12, 42], [6.0, 34], [6.5, 28], [9.42, 44]];
const adFrame = (t) => ({ x: sT(AD_X, t, 0.38, 0.06), y: sT(AD_Y, t, 0.38, 0.06), w: sT(AD_W, t, 0.42, 0.18), h: sT(AD_H, t, 0.42, 0.18), r: sT(AD_R, t, 0.42, 0.1) });
// Layout of the ad inside a frame of size w×h (media on top, skeleton copy and CTA below while the frame is tall).
function adLayout(w, h) {
  const a = w / Math.max(1, h), pad = clamp(w * 0.035, 3, 16), mf = lerp(0.64, 1, clamp((a - 0.5625) / (1.6 - 0.5625)));
  const mw = Math.max(0, w - 2 * pad), mh = Math.max(0, h * mf - (mf < 0.999 ? pad : 2 * pad)), k = clamp(mw / 372, 0, 1.25);
  return { a, pad, mw, mh, k, below: 1 - clamp((a - 1.15) / 0.35), wide: clamp((a - 1.5) / 0.25) };
}
const iconBox = (L, i) => { const sz = 56 * Math.min(1, L.k); return { x: L.pad + L.mw - 14 * L.k - sz, y: L.pad + L.mh - 14 * L.k - sz * (3 - i) - 12 * L.k * (2 - i), sz }; };
const HEARTS = Array.from({ length: 16 }, (_, i) => ({ t0: 5.04 + i * 0.16, ph: hash(i, 3) * 6.28, sw: 26 + hash(i, 5) * 34, sz: 30 + hash(i, 7) * 34, col: [C.heart, '#FFFFFF', '#FF8FA6'][i % 3], dx: (hash(i, 9) - 0.6) * 160 }));
SC.push({ id: 'ads', a: 3.6, b: 10.12, z: 2, init(root) {
  full(root, { background: BLUE_BG });
  const grid = dotGrid(root, { rgb: '255,255,255', alpha: 0.1, hot: '255,255,255' });
  const glow = div(root, { width: '1100px', height: '1100px', left: px(540 - 550), top: px(745 - 550), borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.28), rgba(255,255,255,0))', zIndex: '2' });
  const E = eyebrow(root, '01', 'إعلانات', { light: true });
  const label = div(root, { height: '50px', borderRadius: '25px', background: 'rgba(255,255,255,0.16)', border: '1.5px solid rgba(255,255,255,0.32)', zIndex: '9', overflow: 'hidden' });
  const labels = ['Reels · 9:16', 'Post · 1:1', 'YouTube · 16:9'].map((txt) => { const n = div(label, { width: '100%', top: '8px', textAlign: 'center', fontFamily: MONO, fontSize: '22px', color: '#fff', letterSpacing: '0.06em', whiteSpace: 'nowrap' }); n.textContent = txt; return n; });
  const frame = div(root, { background: '#fff', overflow: 'hidden', zIndex: '6', boxShadow: '0 40px 80px rgba(4,20,90,0.35), 0 8px 20px rgba(4,20,90,0.22)' });
  const media = div(frame, { background: 'linear-gradient(160deg, #0A66FF 0%, #18B6FF 100%)', overflow: 'hidden' });
  const shine = div(media, { width: '60%', height: '200%', top: '-50%', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.28), rgba(255,255,255,0))', transform: 'rotate(18deg)' });
  const mpix = div(media, { background: '#fff', boxShadow: '0 8px 18px rgba(0,30,120,0.25)' });
  const mtext = div(media, { width: '100%', textAlign: 'center', direction: 'rtl', fontFamily: AR, fontWeight: '800', color: '#fff', whiteSpace: 'nowrap' });
  mtext.textContent = 'إعلانك هنا';
  const track = div(media, { height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.35)' });
  const fill = div(track, { height: '6px', borderRadius: '3px', background: '#fff' });
  const bars = [0, 1].map(() => div(frame, { background: '#E7EAEF', borderRadius: '8px' }));
  const cta = div(frame, { background: C.blue, borderRadius: '26px' });
  const icons = [0, 1, 2].map((i) => {
    const b = div(media, { borderRadius: '50%', background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.4)' });
    const sv = el('svg', { viewBox: '-32 -24 64 64', style: { position: 'absolute', left: '18%', top: '18%', width: '64%', height: '64%', overflow: 'visible' } }, b);
    const path = el('path', { d: i === 0 ? heartPath : i === 1 ? 'M-22 -10 Q-22 -18 -14 -18 L14 -18 Q22 -18 22 -10 L22 10 Q22 18 14 18 L-4 18 L-14 28 L-12 18 L-14 18 Q-22 18 -22 10 Z' : 'M-20 20 L-20 6 Q-20 -6 -6 -6 L8 -6 L8 -18 L26 0 L8 18 L8 6 L-4 6 Q-12 6 -14 14 Z', fill: 'none', stroke: '#fff', 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, sv);
    return { b, path };
  });
  const hearts = HEARTS.map((h) => { const sv = el('svg', { viewBox: '-30 -6 60 44', style: { position: 'absolute', left: '0', top: '0', width: px(h.sz), height: px(h.sz * 0.75), overflow: 'visible', zIndex: '12', display: 'none' } }, root); el('path', { d: heartPath, fill: h.col }, sv); return sv; });
  const burst = Array.from({ length: 8 }, () => div(root, { width: '10px', height: '10px', borderRadius: '50%', background: '#fff', zIndex: '13', opacity: '0' }));
  const l1 = words(root, 'إعلانات', { size: 150, weight: 800, color: '#fff', cy: 930, lh: 1.12 });
  const l2 = words(root, 'تصنع الأثر', { size: 86, weight: 300, color: 'rgba(255,255,255,0.9)', cy: 1072, lh: 1.2 });
  S.ads = { root, grid, glow, E, label, labels, frame, media, shine, mpix, mtext, track, fill, bars, cta, icons, hearts, burst, l1, l2, cur: makeCursor(root, { light: true }) };
}, render(t) {
  const s = S.ads;
  // portal from the hook (the pixel grows into this world), then a circle wipe hands over to the paper world
  s.root.style.clipPath = S.portal && t < DIVE[1] ? `inset(${px(S.portal.y - S.portal.size / 2)} ${px(W - S.portal.x - S.portal.size / 2)} ${px(H - S.portal.y - S.portal.size / 2)} ${px(S.portal.x - S.portal.size / 2)} round ${px(S.portal.r)})` : 'none';
  const f = adFrame(t), L = adLayout(f.w, f.h);
  place(s.frame, f.x, f.y, f.w, f.h, f.r);
  setBlur(s.frame, mblur(adFrame, t, 1 / 1400, 4));
  s.frame.style.display = f.w > 1 ? 'block' : 'none';
  const ballP = sm(9.5, 9.72, t); // frame → white ball: content fades away
  // media and its content
  place(s.media, L.pad + L.mw / 2, L.pad + L.mh / 2, L.mw, L.mh, Math.max(0, f.r - L.pad * 0.6));
  s.media.style.opacity = (1 - ballP).toFixed(3);
  s.shine.style.left = px(lerp(-L.mw * 0.8, L.mw * 1.4, ((t - 4.3) / 2.2) % 1));
  const fs = clamp(L.mw * 0.125, 8, 70), bob = Math.abs(Math.sin(Math.PI * (t - 4.0) * 2)) * 12 * L.k;
  s.mtext.style.fontSize = px(fs); s.mtext.style.top = px(L.mh / 2 - fs * 0.62 + fs * 0.45); s.mtext.style.opacity = sm(4.2, 4.45, t).toFixed(3);
  const ps = fs * 0.62; place(s.mpix, L.mw / 2, L.mh / 2 - fs * 0.62 - bob, ps, ps, ps * 0.22); s.mpix.style.opacity = sm(4.15, 4.35, t).toFixed(3);
  // progress bar while the frame is wide (a video playing)
  place(s.track, L.mw / 2, L.mh - 26, L.mw - 48, 6, 3); s.track.style.opacity = (L.wide * sm(6.9, 7.1, t)).toFixed(3);
  s.fill.style.width = px((L.mw - 48) * ramp(t, 7.0, 9.6));
  // skeleton copy below the media while the frame is tall
  const yb = L.pad + L.mh;
  place(s.bars[0], L.pad + L.mw - (L.mw * 0.66) / 2, yb + 34, L.mw * 0.66, 15, 8);
  place(s.bars[1], L.pad + L.mw - (L.mw * 0.42) / 2, yb + 66, L.mw * 0.42, 15, 8);
  place(s.cta, L.pad + 70 * L.k, f.h - L.pad - 30 * L.k, 140 * L.k, 50 * L.k, 25 * L.k);
  const belowO = (L.below * sm(4.25, 4.5, t) * (1 - ballP)).toFixed(3);
  for (const n of [...s.bars, s.cta]) n.style.opacity = belowO;
  // reaction column (heart, comment, share); the heart fills on the tap
  s.icons.forEach((ic, i) => {
    const b = iconBox(L, i), p = clamp(spr(t, 4.5 + i * 0.08, 0.45, 0.3), 0, 1.3);
    place(ic.b, b.x + b.sz / 2, b.y + b.sz / 2, b.sz, b.sz);
    ic.b.style.transform = `scale(${(p * (i === 0 ? 1 + 0.35 * pulse(t, 5.0, 0.3) : 1)).toFixed(3)})`;
    ic.b.style.opacity = clamp(p).toFixed(3);
  });
  const liked = t >= 5.0;
  s.icons[0].path.setAttribute('fill', liked ? C.heart : 'none'); s.icons[0].path.setAttribute('stroke', liked ? C.heart : '#fff');
  // heart icon in screen space (for the cursor, the burst and the stream)
  const heartAt = (tt) => { const ff = adFrame(tt), LL = adLayout(ff.w, ff.h), b = iconBox(LL, 0); return { x: ff.x - ff.w / 2 + b.x + b.sz / 2, y: ff.y - ff.h / 2 + b.y + b.sz / 2 }; };
  const h0 = heartAt(5.0);
  s.burst.forEach((d, i) => { const u = ramp(t, 5.0, 5.4), a = (i / 8) * 6.283 + 0.3, r = 20 + 60 * oE(u); place(d, h0.x + Math.cos(a) * r, h0.y + Math.sin(a) * r, 10 * (1 - u), 10 * (1 - u)); d.style.opacity = u > 0 && u < 1 ? String(1 - u) : '0'; });
  s.hearts.forEach((n, i) => {
    const h = HEARTS[i], tau = t - h.t0, life = 1.9;
    if (tau < 0 || tau > life) { n.style.display = 'none'; return; }
    const p0 = heartAt(h.t0), u = tau / life, y = p0.y - 620 * oC(u), x = p0.x + h.dx * u + Math.sin(tau * 3.2 + h.ph) * h.sw;
    const sc = clamp(spr(t, h.t0, 0.35, 0.4), 0, 1.3), o = 1 - sm(0.6, 1, u);
    n.style.display = 'block'; n.style.transform = `translate(${(x - h.sz / 2).toFixed(1)}px, ${(y - h.sz * 0.37).toFixed(1)}px) rotate(${(Math.sin(tau * 2.6 + h.ph) * 14).toFixed(1)}deg) scale(${sc.toFixed(3)})`;
    n.style.opacity = o.toFixed(3);
  });
  // format label above the frame
  const lw = 300, lo = sm(4.35, 4.6, t) * (1 - sm(6.95, 7.15, t));
  place(s.label, 540, f.y - f.h / 2 - 54, lw, 50, 25); s.label.style.opacity = lo.toFixed(3);
  s.labels.forEach((n, i) => { const a = [4.0, 6.0, 6.5][i], b = [6.0, 6.5, 99][i], vin = sm(a - 0.02, a + 0.14, t), vout = sm(b - 0.02, b + 0.12, t), v = i === 0 ? 1 - vout : vin * (1 - vout); n.style.opacity = v.toFixed(3); n.style.transform = `translateY(${((1 - vin) * (i ? 18 : 0) - vout * 18).toFixed(1)}px)`; setBlur(n, (1 - v) * 6); });
  s.glow.style.transform = `translate(${(f.x - 540).toFixed(1)}px, ${(f.y - 745).toFixed(1)}px) scale(${(0.4 + 0.6 * clamp(f.w / 560)).toFixed(3)})`;
  eyebrowAt(s.E, t, 4.15, 9.5);
  rise(s.l1, t, 7.1, 9.3);
  rise(s.l2, t, 7.32, 9.32, { stagger: 0.09 });
  const hb = heartAt(5.0);
  renderCursor(s.cur, t, [{ t: 4.42, x: 1010, y: 1330 }, { t: 4.9, x: hb.x + 6, y: hb.y + 8, arc: 80 }, { t: 5.2, x: hb.x + 6, y: hb.y + 8 }, { t: 5.7, x: 1060, y: 1460, arc: -60 }], [5.0]);
  s.grid.draw((x, y, i, j) => ripple(t, 4.0, x, y, 540, 745, { speed: 1700, decay: 1.6 }) * 0.8 + twinkle(t, i, j, 5, 0.5, 0.06));
} });

// =====================================================================================================
// ANIMATION 10–16 — a bouncing ball (squash/stretch, onion skin, spacing dots), the floor bends into an ease curve that the
// cursor drags, the ball rides it, then beats like a heart under the headline and becomes a dark-mode toggle.
const FLOOR = 902, BR = 44, G = 3056, BOUNCES = [[10.5, 0.75], [11.25, 0.5], [11.75, 0.25]];
function ballBase(t) {
  const u = ramp(t, 10.0, 12.3), x = 860 - 560 * (1 - Math.pow(1 - u, 1.6));
  let y = FLOOR;
  if (t < 10.5) { const q = clamp((t - 10.0) / 0.5); y = 520 + (FLOOR - 520) * q * q; }
  else for (const [t0, D] of BOUNCES) if (t >= t0 && t < t0 + D) { const tau = t - t0, h = (G * (D / 2) ** 2) / 2; y = FLOOR - ((4 * h) / (D * D)) * tau * (D - tau); }
  return { x, y };
}
const P0 = { x: 250, y: FLOOR }, P3 = { x: 830, y: 520 };
const cub = (a, b, c, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
function curveAt(t) { // the floor (right→left) bends into a linear graph, then the cursor drags it into an ease-in-out
  const m = clamp(spr(t, 12.25, 0.45, 0.12), 0, 1.1), drag = ioC(ramp(t, 12.62, 12.98));
  const L0 = { x: lerp(170, P0.x, m), y: lerp(FLOOR + BR, P0.y, m) }, L3 = { x: lerp(920, P3.x, m), y: lerp(FLOOR + BR, P3.y, m) };
  const h1 = { x: lerp(0.33, 0.8, drag), y: lerp(0.33, 0, drag) }, h2 = { x: 1 - h1.x, y: 1 - h1.y };
  const c1 = { x: L0.x + (L3.x - L0.x) * h1.x, y: L0.y + (L3.y - L0.y) * h1.y }, c2 = { x: L0.x + (L3.x - L0.x) * h2.x, y: L0.y + (L3.y - L0.y) * h2.y };
  return { L0, c1, c2, L3, m };
}
function ballAt(t) {
  if (t < 12.3) return { ...ballBase(t), s: 1 };
  if (t < 12.9) { const p = clamp(spr(t, 12.3, 0.4, 0.1), 0, 1.1); return { x: lerp(300, P0.x, p), y: FLOOR, s: 1 }; }
  if (t < 13.36) { const c = curveAt(t), u = ioC(ramp(t, 12.95, 13.35)); return { x: cub(c.L0.x, c.c1.x, c.c2.x, c.L3.x, u), y: cub(c.L0.y, c.c1.y, c.c2.y, c.L3.y, u), s: 1 }; }
  const p = clamp(spr(t, 13.36, 0.5, 0.18), 0, 1.15), q = clamp(spr(t, 15.02, 0.38, 0.2), 0, 1.1);
  return { x: lerp(lerp(P3.x, 540, p), 540 + 40, q), y: lerp(P3.y, 640, p), s: lerp(1, 0.86, clamp(q)) };
}
SC.push({ id: 'anim', a: 9.78, b: 16.06, z: 3, init(root) {
  full(root, { background: PAPER_BG });
  const grid = dotGrid(root, {});
  const E = eyebrow(root, '02', 'أنيميشن');
  const sv = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', zIndex: '4', overflow: 'visible' } }, root);
  const axes = el('path', { d: `M 230 ${FLOOR + BR} L 870 ${FLOOR + BR} M 230 ${FLOOR + BR} L 230 470`, fill: 'none', stroke: 'rgba(31,35,40,0.22)', 'stroke-width': 2, opacity: 0 }, sv);
  const floor = el('path', { d: '', fill: 'none', stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, sv);
  const tans = el('path', { d: '', fill: 'none', stroke: 'rgba(31,35,40,0.45)', 'stroke-width': 2 }, sv);
  const dots = Array.from({ length: 72 }, () => el('circle', { r: 3.6, fill: C.blue, opacity: 0 }, sv));
  const ghosts = Array.from({ length: 6 }, () => el('circle', { r: BR, fill: 'none', stroke: C.ink, 'stroke-width': 2.2, opacity: 0 }, sv));
  const keys = [0, 1].map(() => div(root, { width: '24px', height: '24px', borderRadius: '6px', background: PIX_BG, zIndex: '6', opacity: '0' }));
  const handles = [0, 1].map(() => div(root, { width: '22px', height: '22px', borderRadius: '50%', border: `3px solid ${C.ink}`, background: C.paper, zIndex: '6', opacity: '0' }));
  const shadow = div(root, { borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,30,90,0.3), rgba(10,30,90,0))', zIndex: '3' });
  const track = div(root, { zIndex: '5', opacity: '0', background: '#DAD6CF', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.12)' });
  const ball = div(root, { borderRadius: '50%', background: 'radial-gradient(circle at 36% 30%, #5B9DFF 0%, #0A5EF5 55%, #0846D6 100%)', boxShadow: '0 14px 30px rgba(10,80,230,0.32)', zIndex: '7' });
  const ring = div(root, { borderRadius: '50%', border: `3px solid ${C.blue}`, zIndex: '5', opacity: '0' });
  const l1 = words(root, 'أنيميشن', { size: 150, weight: 800, cy: 930, lh: 1.12 });
  const l2 = words(root, 'ينبض بالحياة', { size: 86, weight: 300, cy: 1072, lh: 1.2, accent: { 1: C.blue } });
  const tl = words(root, 'الوضع الليلي', { size: 42, weight: 500, color: 'rgba(31,35,40,0.72)', cy: 770 });
  S.anim = { root, grid, E, axes, floor, tans, dots, ghosts, keys, handles, shadow, track, ball, ring, l1, l2, tl, cur: makeCursor(root), cur2: makeCursor(root) };
}, render(t) {
  const s = S.anim;
  // circle wipe from the falling ball (the white ad frame became this ball)
  const wu = ramp(t, 9.8, 10.12); // the blue fills the white ball first, then the paper opens outward (ease-out radius)
  s.root.style.clipPath = t < 10.12 ? `circle(${px(cover(860, 520) * 1.08 * (1 - Math.pow(1 - wu, 2.6)))} at 860px 520px)` : 'none';
  const b = ballAt(t), on = t >= 15.5;
  // squash & stretch: stretch along the velocity in flight, squash on each contact (anchored at the floor)
  let sx = b.s, sy = b.s, ang = 0, yOff = 0;
  if (t >= 10.0 && t < 12.35) {
    const b2 = ballAt(t - 1 / 120), vx = (b.x - b2.x) * 120, vy = (b.y - b2.y) * 120, v = Math.hypot(vx, vy), st = clamp(v / 3600, 0, 0.26);
    ang = (Math.atan2(vy, vx) * 180) / Math.PI - 90; sy *= 1 + st; sx *= 1 - st * 0.55;
    for (const [tc, I] of [[10.5, 1], [11.25, 0.62], [11.75, 0.36], [12.0, 0.16]]) {
      const a = I * Math.max(0, 1 - Math.abs(t - tc - 0.02) / 0.075);
      if (a > 0) { ang = 0; sx = 1 + 0.38 * a; sy = 1 - 0.34 * a; yOff = BR * (1 - sy); }
    }
  }
  // heartbeat under the headline (lub-dub on the beats)
  let beat = 1;
  for (const tb of [13.5, 14.0, 14.5]) beat += 0.16 * pulse(t, tb, 0.13) + 0.08 * pulse(t, tb + 0.17, 0.13);
  const d = 2 * BR * beat;
  place(s.ball, b.x, b.y + yOff, d * sx, d * sy);
  s.ball.style.transform = `rotate(${ang.toFixed(2)}deg)`;
  s.ball.style.background = on ? mixHex('#0A5EF5', '#FFFFFF', sm(15.53, 15.66, t)) : 'radial-gradient(circle at 36% 30%, #5B9DFF 0%, #0A5EF5 55%, #0846D6 100%)';
  if (on) { const kx = lerp(540 + 40, 540 - 40, clamp(spr(t, 15.5, 0.3, 0.2), 0, 1.1)); place(s.ball, kx, 640, 76, 76); }
  // ground shadow scales with height
  const hgt = clamp((FLOOR - b.y) / 420), showSh = t < 12.4;
  place(s.shadow, b.x, FLOOR + BR + 4, 110 * (1 - 0.55 * hgt), 20 * (1 - 0.4 * hgt)); s.shadow.style.opacity = showSh ? (1 - 0.7 * hgt).toFixed(3) : '0';
  // onion skin + spacing dots (one per frame along the path) during the bounce
  const trailO = sm(10.02, 10.2, t) * (1 - sm(12.25, 12.6, t));
  s.ghosts.forEach((g, i) => { const tg = t - (i + 1) * (2 / FPS); if (tg < 10.0 || t > 12.6) { g.setAttribute('opacity', 0); return; } const p = ballBase(tg); g.setAttribute('cx', p.x.toFixed(1)); g.setAttribute('cy', p.y.toFixed(1)); g.setAttribute('opacity', ((0.34 - i * 0.05) * trailO).toFixed(3)); });
  s.dots.forEach((c, i) => { const td = 10.0 + i / FPS; if (td > Math.min(t, 12.3)) { c.setAttribute('opacity', 0); return; } const p = ballBase(td); c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1)); c.setAttribute('opacity', (0.5 * trailO).toFixed(3)); });
  // floor → curve (drawn right to left first), keyframes, handles, tangents
  const cv = curveAt(t), draw = oE(ramp(t, 10.0, 10.45)), gone = sm(13.35, 13.6, t);
  if (t < 12.25) { const xr = 920, xl = lerp(920, 170, draw); s.floor.setAttribute('d', `M ${xr} ${FLOOR + BR} L ${xl.toFixed(1)} ${FLOOR + BR}`); }
  else s.floor.setAttribute('d', `M ${cv.L0.x.toFixed(1)} ${cv.L0.y.toFixed(1)} C ${cv.c1.x.toFixed(1)} ${cv.c1.y.toFixed(1)} ${cv.c2.x.toFixed(1)} ${cv.c2.y.toFixed(1)} ${cv.L3.x.toFixed(1)} ${cv.L3.y.toFixed(1)}`);
  s.floor.setAttribute('opacity', (1 - gone).toFixed(3));
  const g2 = sm(12.3, 12.55, t) * (1 - gone);
  s.axes.setAttribute('opacity', (g2 * 0.9).toFixed(3));
  s.tans.setAttribute('d', `M ${cv.L0.x} ${cv.L0.y} L ${cv.c1.x} ${cv.c1.y} M ${cv.L3.x} ${cv.L3.y} L ${cv.c2.x} ${cv.c2.y}`); s.tans.setAttribute('opacity', g2.toFixed(3));
  [[cv.L0, s.keys[0]], [cv.L3, s.keys[1]]].forEach(([p, n]) => { place(n, p.x, p.y, 24, 24, 6); n.style.opacity = g2.toFixed(3); n.style.transform = `rotate(45deg) scale(${clamp(spr(t, 12.4, 0.35, 0.3), 0, 1.2).toFixed(3)})`; });
  [[cv.c1, s.handles[0]], [cv.c2, s.handles[1]]].forEach(([p, n], i) => { place(n, p.x, p.y, 22, 22); n.style.opacity = g2.toFixed(3); n.style.transform = `scale(${(1 + (i === 0 ? 0.3 * sm(12.55, 12.62, t) * (1 - sm(12.98, 13.05, t)) : 0)).toFixed(3)})`; });
  // heartbeat rings
  for (const tb of [13.5, 14.0, 14.5]) if (t >= tb && t < tb + 0.5) ringAt(s.ring, t, tb, 540, 640, { r0: 50, r1: 170, dur: 0.5, a: 0.45 });
  if (t < 13.5 || t >= 15.0) s.ring.style.opacity = '0';
  // toggle: the ball becomes the knob of a dark-mode switch
  const tp = clamp(spr(t, 15.0, 0.4, 0.2), 0, 1.15);
  place(s.track, 540, 640, 176 * (0.6 + 0.4 * tp), 96 * (0.6 + 0.4 * tp), 48);
  s.track.style.opacity = clamp(tp * 1.5).toFixed(3);
  s.track.style.background = mixHex('#DAD6CF', C.ink, sm(15.49, 15.58, t));
  rise(s.tl, t, 15.12, 99, { dy: 24 });
  // copy
  s.root.style.transformOrigin = '540px 820px'; s.root.style.transform = `scale(${(1 + 0.04 * sm(13.3, 15.2, t)).toFixed(4)})`;
  rise(s.l1, t, 13.3, 15.0);
  rise(s.l2, t, 13.52, 15.04, { stagger: 0.09 });
  eyebrowAt(s.E, t, 10.1, 15.4);
  renderCursor(s.cur, t, [{ t: 12.35, x: 1000, y: 1250 }, { t: 12.6, x: cv.c1.x + 4, y: cv.c1.y + 6, arc: 40 }, { t: 12.62, x: curveAt(12.62).c1.x + 4, y: curveAt(12.62).c1.y + 6 }, { t: 12.98, x: curveAt(12.98).c1.x + 4, y: curveAt(12.98).c1.y + 6, arc: 0 }, { t: 13.3, x: 980, y: 1180, arc: -50 }], [12.6]);
  renderCursor(s.cur2, t, [{ t: 14.9, x: 140, y: 1340 }, { t: 15.38, x: 590, y: 652, arc: -80 }, { t: 16.1, x: 590, y: 652 }], [15.5]);
  s.grid.draw((x, y, i, j) => ripple(t, 10.5, x, y, ballBase(10.5).x, FLOOR + BR, { speed: 1200, decay: 2.4 }) * 0.5 + ripple(t, 11.25, x, y, ballBase(11.25).x, FLOOR + BR, { speed: 1100, decay: 2.8 }) * 0.35 + twinkle(t, i, j, 9));
} });

// =====================================================================================================
// SOFTWARE 16–22 — dark mode. Toggle → button «إنشاء تطبيق» → spinner → check → code editor typing → the code
// becomes a live app card; headline.
const BW = [[15.5, 176], [16.05, 176], [16.15, 470], [16.55, 112], [17.25, 900], [18.75, 380]];
const BH = [[15.5, 96], [16.15, 112], [17.25, 600], [18.75, 560]];
const BRR = [[15.5, 48], [16.15, 56], [17.25, 30], [18.75, 44]];
const BY = [[15.5, 640], [17.25, 700], [18.75, 600]];
const boxAt = (t) => ({ w: sT(BW, t, 0.45, 0.14), h: sT(BH, t, 0.45, 0.14), r: sT(BRR, t, 0.45, 0.1), y: sT(BY, t, 0.5, 0.1) });
const K = '#5EA0FF', ID = '#E6E8EB', PU = '#8D949E', STR = C.cyan, FN = '#FFFFFF', CM = '#5C6370';
const CODE = [
  [['const ', K], ['idea', ID], [' = ', PU], ['new ', K], ['Pixel', STR], ['();', PU]],
  [['idea', ID], ['.', PU], ['add', FN], ['(', PU], ['plus', ID], [');', PU]],
  [['idea', ID], ['.', PU], ['animate', FN], ['({ ', PU], ['ease', ID], [': ', PU], ["'spring'", STR], [' });', PU]],
  [['launch', FN], ['(', PU], ['idea', ID], [');', PU], ['  // live', CM]],
];
const CODE_T0 = 17.45, CPS = 76;
SC.push({ id: 'soft', a: 15.5, b: 22.0, z: 4, init(root) {
  full(root, { background: NIGHT_BG });
  const grid = dotGrid(root, { rgb: '255,255,255', alpha: 0.06, hot: '24,182,255' });
  const E = eyebrow(root, '03', 'برمجيات', { light: true });
  const world = full(root, { zIndex: '5', transformOrigin: '540px 700px' });
  const glow = div(world, { width: '1000px', height: '1000px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,102,255,0.32), rgba(10,102,255,0))', zIndex: '1' });
  const box = div(world, { overflow: 'hidden', zIndex: '3' });
  const knob = div(world, { borderRadius: '50%', background: '#fff', zIndex: '4', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' });
  const btn = div(box, { width: '100%', top: '0', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontFamily: AR, fontWeight: '600', fontSize: '42px', color: '#fff', whiteSpace: 'nowrap' });
  btn.textContent = 'إنشاء تطبيق';
  const spin = el('svg', { viewBox: '-30 -30 60 60', style: { position: 'absolute', left: '50%', top: '50%', width: '56px', height: '56px', marginLeft: '-28px', marginTop: '-28px', overflow: 'visible' } }, box);
  const arc = el('circle', { r: 22, fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': '104 200' }, spin);
  const chk = el('path', { d: 'M -14 1 L -4 11 L 15 -10', fill: 'none', stroke: '#fff', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '50', 'stroke-dashoffset': '50' }, spin);
  // editor
  const ed = div(box, { width: '900px', height: '600px', left: '50%', top: '50%', marginLeft: '-450px', marginTop: '-300px' });
  [0, 1, 2].forEach((i) => div(ed, { left: px(40 + i * 30), top: '34px', width: '16px', height: '16px', borderRadius: '50%', background: ['#3A3F47', '#33373F', '#2C3037'][i] }));
  const fname = div(ed, { width: '100%', top: '26px', textAlign: 'center', fontFamily: MONO, fontSize: '22px', color: '#6B7280' }); fname.textContent = 'pixel.js';
  div(ed, { top: '78px', left: '0', width: '900px', height: '1px', background: 'rgba(255,255,255,0.07)' });
  const lines = CODE.map((ln, i) => {
    const num = div(ed, { left: '40px', top: px(126 + i * 64), fontFamily: MONO, fontSize: '30px', color: '#3A3F47' }); num.textContent = String(i + 1);
    const row = div(ed, { left: '96px', top: px(122 + i * 64), fontFamily: MONO, fontSize: '33px', whiteSpace: 'pre', direction: 'ltr' });
    return ln.map(([txt, col]) => el('span', { text: '', style: { color: col } }, row));
  });
  const caret = div(ed, { width: '4px', height: '42px', background: C.blue, borderRadius: '2px' });
  // app card
  const app = div(box, { width: '380px', height: '560px', left: '50%', top: '50%', marginLeft: '-190px', marginTop: '-280px', direction: 'rtl' });
  div(app, { left: px(380 - 28 - 46), top: '28px', width: '46px', height: '46px', borderRadius: '14px', background: PIX_BG });
  const title = div(app, { left: 'auto', right: px(28 + 46 + 14), top: '28px', fontFamily: AR, fontWeight: '600', fontSize: '30px', color: '#fff', whiteSpace: 'nowrap', lineHeight: '46px' }); title.textContent = 'تطبيقك';
  const chip = div(app, { left: '28px', top: '34px', height: '34px', padding: '0 14px', borderRadius: '17px', background: 'rgba(24,182,255,0.14)', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: AR, fontSize: '20px', color: C.cyan, whiteSpace: 'nowrap', direction: 'rtl' });
  el('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: C.cyan, display: 'inline-block' } }, chip); el('span', { text: 'يعمل الآن' }, chip);
  const chart = el('svg', { viewBox: '0 0 332 210', style: { position: 'absolute', left: '24px', top: '104px', width: '332px', height: '210px', overflow: 'visible' } }, app);
  const gd = el('linearGradient', { id: 'f6area', x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, chart));
  el('stop', { offset: 0, 'stop-color': C.blue, 'stop-opacity': 0.55 }, gd); el('stop', { offset: 1, 'stop-color': C.blue, 'stop-opacity': 0 }, gd);
  const CH = [[0, 170], [40, 150], [80, 158], [120, 120], [160, 128], [200, 92], [240, 98], [280, 56], [332, 30]];
  const area = el('path', { d: '', fill: 'url(#f6area)' }, chart);
  const lineP = el('path', { d: '', fill: 'none', stroke: C.cyan, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, chart);
  const endDot = el('circle', { r: 8, fill: '#fff' }, chart);
  const tiles = [0, 1].map((i) => { const tn = div(app, { left: px(24 + i * 174), top: '338px', width: '158px', height: '96px', borderRadius: '20px', background: C.tile }); div(tn, { left: 'auto', right: '18px', top: '22px', width: '90px', height: '12px', borderRadius: '6px', background: '#2E333B' }); div(tn, { left: 'auto', right: '18px', top: '50px', width: '56px', height: '20px', borderRadius: '6px', background: i ? C.blue : '#3A404A' }); return tn; });
  const pill = div(app, { left: '24px', top: '462px', width: '332px', height: '70px', borderRadius: '35px', background: PIX_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: AR, fontWeight: '600', fontSize: '26px', color: '#fff', direction: 'rtl', whiteSpace: 'nowrap' }); pill.textContent = 'نشر التطبيق';
  const l1 = words(root, 'برمجيات', { size: 150, weight: 800, color: '#fff', cy: 1010, lh: 1.12 });
  const l2 = words(root, 'تعمل بذكاء', { size: 86, weight: 300, color: 'rgba(255,255,255,0.88)', cy: 1150, lh: 1.2, accent: { 1: C.cyan } });
  S.soft = { root, grid, E, world, glow, box, knob, btn, spin, arc, chk, ed, lines, caret, app, chartPts: CH, area, lineP, endDot, tiles, pill, chip, l1, l2, cur: makeCursor(root, { light: true }) };
}, render(t) {
  const s = S.soft;
  // dark-mode wipe from the toggle knob
  const wu = ramp(t, 15.55, 16.0), kx = 500;
  s.root.style.clipPath = t < 16.0 ? `circle(${px(lerp(38, cover(kx, 640) * 1.08, 1 - Math.pow(1 - wu, 2.4)))} at ${kx}px 640px)` : 'none';
  const b = boxAt(t), press = 1 - 0.06 * pulse(t, 16.47, 0.16);
  place(s.box, 540, b.y, b.w, b.h, b.r);
  s.box.style.transform = `scale(${press.toFixed(4)})`;
  setBlur(s.box, mblur(boxAt, t, 1 / 1500, 4));
  const dark = sm(17.2, 17.45, t);
  s.box.style.background = mixHex(C.blue, C.card, dark);
  s.box.style.boxShadow = dark > 0.5 ? '0 40px 90px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.07)' : '0 20px 50px rgba(10,102,255,0.45)';
  place(s.glow, 540, b.y, 1000, 1000);
  // the knob is absorbed as the switch widens into the button
  const kp = sm(16.02, 16.18, t); place(s.knob, lerp(500, 540, kp), 640, 76 * (1 - kp), 76 * (1 - kp)); s.knob.style.opacity = (1 - kp).toFixed(3);
  const bIn = sm(16.18, 16.36, t), bOut = sm(16.5, 16.6, t), bv = bIn * (1 - bOut);
  s.btn.style.opacity = bv.toFixed(3); setBlur(s.btn, (1 - bv) * 8);
  const sv = sm(16.58, 16.66, t) * (1 - sm(17.22, 17.3, t));
  s.spin.style.opacity = sv.toFixed(3); s.spin.style.display = sv > 0 ? 'block' : 'none';
  s.arc.setAttribute('transform', `rotate(${((t - 16.58) * 760).toFixed(1)})`); s.arc.setAttribute('opacity', (1 - sm(16.96, 17.02, t)).toFixed(3));
  s.chk.setAttribute('stroke-dashoffset', (50 * (1 - oC(ramp(t, 17.0, 17.16)))).toFixed(2));
  s.spin.style.transform = `scale(${(1 + 0.22 * pulse(t, 17.0, 0.2)).toFixed(3)})`;
  // editor content + typewriter
  const ev = sm(17.36, 17.52, t) * (1 - sm(18.68, 18.8, t));
  s.ed.style.opacity = ev.toFixed(3); s.ed.style.display = ev > 0 ? 'block' : 'none'; setBlur(s.ed, (1 - ev) * 8);
  if (ev > 0) {
    let n = Math.max(0, Math.floor((t - CODE_T0) * CPS));
    CODE.forEach((ln, i) => ln.forEach(([txt], j) => { const k = Math.min(txt.length, n); s.lines[i][j].textContent = txt.slice(0, k); n -= k; }));
    let typed = Math.max(0, Math.floor((t - CODE_T0) * CPS)), line = 0, col = 0;
    for (let i = 0; i < CODE.length; i++) { const len = CODE[i].reduce((a, [x]) => a + x.length, 0); if (typed <= len) { line = i; col = typed; break; } typed -= len; line = i; col = len; }
    place(s.caret, 96 + col * 33 * 0.612 + 4, 122 + line * 64 + 24, 4, 42, 2);
    s.caret.style.opacity = (t < 18.7 || Math.floor(t * 3) % 2 === 0 ? 1 : 0).toFixed(0);
  }
  // app card: the code becomes a running app
  const av = sm(18.86, 19.08, t);
  s.app.style.opacity = av.toFixed(3); s.app.style.display = av > 0 ? 'block' : 'none'; setBlur(s.app, (1 - av) * 8);
  if (av > 0) {
    const dp = oC(ramp(t, 19.0, 19.9)), pts = s.chartPts, lastX = 332 * dp;
    const vis = []; for (let i = 0; i < pts.length; i++) { if (pts[i][0] <= lastX) vis.push(pts[i]); else { const a = pts[i - 1], bq = pts[i], u = (lastX - a[0]) / (bq[0] - a[0]); vis.push([lastX, lerp(a[1], bq[1], u)]); break; } }
    const dline = vis.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    s.lineP.setAttribute('d', dline); s.area.setAttribute('d', vis.length > 1 ? `${dline} L ${lastX.toFixed(1)} 210 L 0 210 Z` : '');
    const e = vis[vis.length - 1]; s.endDot.setAttribute('cx', e[0].toFixed(1)); s.endDot.setAttribute('cy', e[1].toFixed(1)); s.endDot.setAttribute('r', (7 + 3 * pulse(t % 1, 0, 0.5)).toFixed(2));
    s.tiles.forEach((tn, i) => { const p = clamp(spr(t, 19.2 + i * 0.08, 0.4, 0.2), 0, 1.2); tn.style.opacity = clamp(p).toFixed(3); tn.style.transform = `translateY(${((1 - clamp(p)) * 24).toFixed(1)}px)`; });
    const pp = clamp(spr(t, 19.4, 0.45, 0.25), 0, 1.2); s.pill.style.opacity = clamp(pp).toFixed(3); s.pill.style.transform = `scale(${(0.8 + 0.2 * pp).toFixed(3)})`;
  }
  s.world.style.transform = `scale(${(1 + 0.035 * sm(17.3, 18.7, t) - 0.035 * sm(18.75, 19.3, t)).toFixed(4)})`;
  s.root.style.transformOrigin = '540px 820px'; s.root.style.transform = `scale(${(1 + 0.04 * sm(19.3, 21.7, t)).toFixed(4)})`;
  rise(s.l1, t, 19.3, 21.6);
  rise(s.l2, t, 19.52, 21.62, { stagger: 0.09 });
  eyebrowAt(s.E, t, 16.1, 21.6);
  renderCursor(s.cur, t, [{ t: 15.98, x: 980, y: 1260 }, { t: 16.4, x: 610, y: 668, arc: 70 }, { t: 16.75, x: 640, y: 700 }, { t: 17.15, x: 1070, y: 1150, arc: -40 }], [16.5]);
  s.grid.draw((x, y, i, j) => ripple(t, 16.0, x, y, 540, 640, { speed: 1600, decay: 1.8 }) * 0.6 + ripple(t, 17.0, x, y, 540, 700, { speed: 1300, decay: 2.4 }) * 0.5 + twinkle(t, i, j, 13, 0.5, 0.05));
} });

// =====================================================================================================
// TRI 22–24 — the three worlds slam in as bands on three beats, then implode into one pixel.
const BANDS = [[0, 595], [595, 921], [921, 1920]], MIDY = 760;
SC.push({ id: 'tri', a: 22.0, b: 23.97, z: 6, init(root) {
  const mk = (bg, word, color, cy) => { const n = div(root, { width: px(W), overflow: 'hidden', background: bg, zIndex: '2' }); const L = words(root, word, { size: 176, weight: 800, color, cy, z: 4, lh: 1.12 }); return { n, L, cy }; };
  const b2 = mk(NIGHT_BG, 'تقنية', '#fff', 758);
  const b1 = mk(PAPER_BG, 'إبداع', C.ink, 432);
  const b3 = mk(BLUE_BG, 'أثر', '#fff', 1085);
  b1.n.style.zIndex = '3'; b3.n.style.zIndex = '3';
  const bar = div(root, { background: PIX_BG, zIndex: '6', boxShadow: PIX_SHADOW });
  S.tri = { root, b1, b2, b3, bar };
}, render(t) {
  const s = S.tri, imp = Math.pow(ramp(t, 23.5, 23.84), 2.2);
  const ry = (y) => MIDY + (y - MIDY) * (1 - imp);
  const setBand = (B, [y0, y1], dx) => { B.n.style.top = px(ry(y0)); B.n.style.height = px(Math.max(0, ry(y1) - ry(y0))); B.n.style.transform = `translateX(${dx.toFixed(1)}px)`; B.n.style.display = t < 23.86 ? 'block' : 'none'; };
  const d1 = W * (1 - oE(ramp(t, 22.0, 22.24))), d3 = -W * (1 - oE(ramp(t, 23.0, 23.24)));
  setBand(s.b2, t < 23.45 ? [0, 1920] : BANDS[1], 0);
  setBand(s.b1, BANDS[0], d1);
  setBand(s.b3, BANDS[2], d3);
  const word = (B, t0, dx) => {
    const p = oE(ramp(t, t0, t0 + 0.28)), drift = 1 + 0.04 * ramp(t, t0, 23.5);
    B.L.line.style.display = t >= t0 && t < 23.86 ? 'flex' : 'none';
    B.L.line.style.top = px(ry(B.cy) - (176 * 1.12) / 2);
    B.L.words.forEach((w) => { w.style.opacity = clamp(p * 1.5).toFixed(3); w.style.transform = `translateX(${dx.toFixed(1)}px) scale(${(lerp(1.3, 1, p) * drift).toFixed(4)}, ${(lerp(1.3, 1, p) * drift * (1 - imp)).toFixed(4)})`; setBlur(w, (1 - p) * 16); });
  };
  word(s.b1, 22.0, d1); word(s.b2, 22.5, 0); word(s.b3, 23.0, d3);
  // the line that remains contracts into the pixel
  const q = ramp(t, 23.8, 23.94), on = t >= 23.8;
  s.bar.style.display = on ? 'block' : 'none';
  if (on) { const e = ioC(q); place(s.bar, 540, MIDY, lerp(W, 64, e), lerp(8, 64, Math.pow(q, 1.6)), lerp(4, 14, e)); }
  s.root.style.background = 'transparent';
} });

// =====================================================================================================
// LOGO 24–30 — the pixel bursts into 1,699 pixels that build the owner's logo; the hero pixel lands as the i-dot, the
// plus spins in; tagline, services, CTA clicked; credit.
const LS = 820 / 964, LX = 130 - 145 * LS, LY = 330 - 383 * LS; // logo source bbox (145..1109, 383..864) → 820 px wide, top 330
const toScr = (x, y) => [LX + x * LS, LY + y * LS];
SC.push({ id: 'logo', a: 23.4, b: 30.1, z: 5, init(root) {
  full(root, { background: PAPER_BG });
  const grid = dotGrid(root, {});
  const logo = div(root, { zIndex: '4', transformOrigin: '0 0', transform: `translate(${LX.toFixed(3)}px, ${LY.toFixed(3)}px) scale(${LS.toFixed(5)})` });
  const shift = (d) => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, a, b) => `${(+a - 130).toFixed(2)} ${(+b - 370).toFixed(2)}`);
  const letters = {};
  for (const [k, v] of Object.entries(LOGO.letters)) {
    const im = el('img', { src: new URL('./plates/logo-color.png', import.meta.url).href, style: { position: 'absolute', left: '130px', top: '370px', width: '995px', height: '505px', clipPath: `path('${v.paths.map(shift).join(' ')}')`, opacity: '0' } }, logo);
    const bb = v.bbox; im.style.transformOrigin = `${((bb[0] + bb[2]) / 2 - 130).toFixed(1)}px ${((bb[1] + bb[3]) / 2 - 370).toFixed(1)}px`;
    letters[k] = { im, bb };
  }
  const cv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '5' } }, root);
  const parts = LOGO.particles.filter((p) => p[3] !== 'dot' && p[3] !== 'plus').map((p, i) => {
    const [tx, ty] = toScr(p[0], p[1]), r1 = hash(i, 7), r2 = hash(i, 11), r3 = hash(i, 13);
    const dist = clamp(Math.hypot(tx - 540, ty - MIDY) / 700), dx = tx - 540, dy = ty - MIDY, len = Math.hypot(dx, dy) || 1, off = (r2 - 0.5) * 560 + 160;
    return { tx, ty, col: p[2], delay: 0.02 + 0.3 * (0.55 * r1 + 0.45 * dist), cx: (540 + tx) / 2 - (dy / len) * off, cy: (MIDY + ty) / 2 + (dx / len) * off, rot: (r3 - 0.5) * 300, fade: 24.92 + 0.3 * hash(i, 17) };
  });
  const hero = div(root, { background: PIX_BG, boxShadow: PIX_SHADOW, zIndex: '7' });
  const ring = div(root, { borderRadius: '50%', border: `3px solid ${C.blue}`, zIndex: '3', opacity: '0' });
  const ring2 = div(root, { borderRadius: '50%', border: `3px solid ${C.blue}`, zIndex: '3', opacity: '0' });
  const tag = words(root, 'نصنع الفرق.. بكسل ببكسل', { size: 66, weight: 600, cy: 832, accent: { 2: C.blue, 3: C.blue } });
  const svc = words(root, 'إعلانات · أنيميشن · برمجيات', { size: 38, weight: 400, color: C.greyD, cy: 924 });
  svc.words.forEach((w, i) => { if (i % 2) w.style.color = C.blue; });
  const cta = div(root, { zIndex: '8', overflow: 'hidden', background: PIX_BG, boxShadow: '0 22px 44px rgba(10,80,230,0.32), inset 0 1px 0 rgba(255,255,255,0.25)' });
  const ctaL = textLine(cta, 'ابدأ مشروعك معنا', { left: '0', top: '22px', width: '100%', justifyContent: 'center', fontFamily: AR, fontWeight: '600', fontSize: '44px', color: '#fff', lineHeight: '1.5', paddingLeft: '56px' });
  const arrow = el('svg', { viewBox: '-20 -20 40 40', style: { position: 'absolute', left: '44px', top: '38px', width: '36px', height: '36px', overflow: 'visible' } }, cta);
  el('path', { d: 'M 14 0 L -12 0 M -2 -10 L -12 0 L -2 10', fill: 'none', stroke: '#fff', 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, arrow);
  const ripl = div(cta, { borderRadius: '50%', background: 'rgba(255,255,255,0.35)', opacity: '0' });
  const hair = div(root, { width: '72px', height: '2px', left: px(540 - 36), top: '1124px', background: 'rgba(31,35,40,0.25)', zIndex: '6' });
  const credit = words(root, 'Made by: Mohamed Fawzy Labib', { size: 46, weight: 600, cy: 1182, dir: 'ltr', font: AR });
  credit.words.forEach((w, i) => { if (i < 2) { w.style.fontFamily = MONO; w.style.fontWeight = '400'; w.style.fontSize = '32px'; w.style.color = C.greyD; w.style.alignSelf = 'center'; } });
  S.logo = { root, grid, logo, letters, cv, g: cv.getContext('2d'), parts, hero, ring, ring2, tag, svc, cta, ctaL, arrow, ripl, hair, credit, cur: makeCursor(root) };
}, render(t) {
  const s = S.logo, D = toScr((459 + 519) / 2, (408 + 459) / 2), Dw = 60 * LS, Dh = 51 * LS;
  const plusC = toScr((923 + 1109) / 2, (679 + 859) / 2);
  // hero pixel: anticipation, burst, flight to the i-dot (spinning), landing squash
  let hx = 540, hy = MIDY, hw = 64, hh = 64, rot = 0;
  if (t < 24.0) { const a = sm(23.94, 24.0, t); hw = 64 * (1 + 0.25 * a); hh = 64 * (1 - 0.22 * a); }
  else if (t < 24.5) { const u = ramp(t, 24.0, 24.5), e = ioC(u); hx = lerp(540, D[0], e); hy = lerp(MIDY, D[1], u) - 300 * 4 * u * (1 - u); hw = lerp(64, Dw, e); hh = lerp(64, Dh, e); rot = 360 * e; }
  else { const tau = t - 24.5, d = Math.exp(-tau * 8) * Math.cos(tau * 24); hx = D[0]; hy = D[1]; hw = Dw * (1 + 0.32 * d); hh = Dh * (1 - 0.3 * d); hy += (Dh - hh) / 2; }
  place(s.hero, hx, hy, hw, hh, Math.min(hw, hh) * 0.2);
  s.hero.style.display = t >= 23.94 ? 'block' : 'none';
  s.hero.style.transform = `rotate(${rot.toFixed(2)}deg)`;
  const dotSwap = sm(24.85, 25.05, t);
  s.hero.style.opacity = (1 - dotSwap).toFixed(3); s.hero.style.boxShadow = t > 24.5 ? 'none' : PIX_SHADOW;
  // particles (canvas) fly on curved paths with a spring snap, then dissolve into the crisp vector logo
  const g = s.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  if (t >= 24.0 && t < 25.3) {
    for (const p of s.parts) {
      const tau = t - 24.0 - p.delay; if (tau <= 0) continue;
      const fo = 1 - clamp((t - p.fade) / 0.08); if (fo <= 0) continue;
      const e = springStep(tau, { duration: 0.55, bounce: 0.16 }).value, v = 1 - e;
      const x = v * v * 540 + 2 * v * e * p.cx + e * e * p.tx, y = v * v * MIDY + 2 * v * e * p.cy + e * e * p.ty;
      const sz = lerp(4, 8.7, clamp(e)), a = (p.rot * clamp(1 - e) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
      g.globalAlpha = fo; g.fillStyle = p.col; g.setTransform(c, sn, -sn, c, x, y); g.fillRect(-sz / 2, -sz / 2, sz, sz);
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  }
  s.cv.style.display = t >= 24.0 && t < 25.3 ? 'block' : 'none';
  const crisp = sm(24.9, 25.22, t);
  for (const [k, L] of Object.entries(s.letters)) {
    if (k === 'dot') { L.im.style.opacity = dotSwap.toFixed(3); continue; }
    if (k === 'plus') { const p = spr(t, 24.95, 0.55, 0.32); L.im.style.opacity = clamp(p * 2).toFixed(3); L.im.style.transform = `rotate(${lerp(-135, 0, clamp(p, 0, 1.1)).toFixed(2)}deg) scale(${clamp(p, 0, 1.2).toFixed(4)})`; continue; }
    L.im.style.opacity = crisp.toFixed(3);
  }
  ringAt(s.ring, t, 24.0, 540, MIDY, { r0: 36, r1: 520, dur: 0.9, a: 0.5 });
  ringAt(s.ring2, t, 25.0, plusC[0], plusC[1], { r0: 60, r1: 260, dur: 0.8, a: 0.55 });
  // copy, services, CTA, credit
  rise(s.tag, t, 25.55, 99, { stagger: 0.09 });
  rise(s.svc, t, 26.2, 99, { stagger: 0.07, dy: 26 });
  const cp = clamp(spr(t, 26.75, 0.5, 0.26), 0, 1.15), press = 1 - 0.05 * pulse(t, 27.46, 0.18);
  place(s.cta, 540, 1030, 560, 112, 56); s.cta.style.opacity = clamp(cp * 1.6).toFixed(3);
  s.cta.style.transform = `scale(${(lerp(0.6, 1, cp) * press).toFixed(4)})`;
  rise(s.ctaL, t, 26.88, 99, { dy: 20, blur: 8, stagger: 0.05 });
  s.arrow.style.transform = `translateX(${(-6 * pulse(t, 27.5, 0.3) + (1 - clamp(cp)) * 20).toFixed(1)}px)`;
  const ru = ramp(t, 27.5, 28.0); place(s.ripl, 640 - (540 - 280), 1052 - (1030 - 56), 900 * oE(ru), 900 * oE(ru)); s.ripl.style.opacity = ru > 0 && ru < 1 ? (0.9 * (1 - ru)).toFixed(3) : '0';
  s.hair.style.transform = `scaleX(${oE(ramp(t, 28.0, 28.5)).toFixed(4)})`;
  rise(s.credit, t, 28.08, 99, { stagger: 0.06, dy: 22, blur: 8 });
  renderCursor(s.cur, t, [{ t: 26.95, x: 1000, y: 1480 }, { t: 27.4, x: 640, y: 1052, arc: 80 }, { t: 27.8, x: 690, y: 1080 }, { t: 28.3, x: 1040, y: 1500, arc: -50 }], [27.5]);
  s.grid.draw((x, y, i, j) => ripple(t, 24.0, x, y, 540, MIDY, { speed: 1500, decay: 1.2 }) * 0.9 + ripple(t, 24.5, x, y, D[0], D[1], { speed: 1100, decay: 2.4 }) * 0.4 + twinkle(t, i, j, 21, 0.4, 0.05));
} });

// =====================================================================================================
export default {
  duration: 30, fps: FPS,
  async init(st, { W: w, H: h }) {
    stage = st; W = w; H = h;
    LOGO = await (await fetch(new URL('./plates/logo.json', import.meta.url))).json();
    stage.style.background = C.paper;
    SC.forEach((s) => { s.root = full(stage, { overflow: 'hidden', zIndex: String(s.z), display: 'none' }); s.init(s.root); });
    const dv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '95', pointerEvents: 'none' } }, stage);
    const dg = dv.getContext('2d'), img = dg.createImageData(W, H), r = rng(606);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() < 0.5 ? 0 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = Math.round(r() * 7); }
    dg.putImageData(img, 0, 0);
  },
  render(t, frame) {
    for (const s of SC) {
      const on = t >= s.a && t < s.b;
      s.root.style.display = on ? 'block' : 'none';
      if (on) s.render(t, frame);
    }
  },
};
