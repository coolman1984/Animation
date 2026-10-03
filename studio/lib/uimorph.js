// UI-morph showreel kit — the reusable core of film 6 (Pixel Plus), extracted so any film can use it.
// Grammar (measured on the owner's two UI-morph references, see TECHNIQUES.md → "UI-morph showreel grammar"): one container
// springs between shapes with motion blur, content blurs out/in around each morph, a cursor causes every change, a calm
// field with a pixel grid. Everything is pure in t and seeded (seek any frame in any order). Numbers in, numbers/strings out.
//   morphBox / morphBlur      per-property spring tracks for a container (w, h, r, x, y …) + CSS blur from its own speed
//   swap                      opacity/blur of outgoing and incoming content around a morph time
//   cursorAt / cursorClick    arc-path pointer and its click dip + ring
//   ripple / twinkle          pixel-grid life: a landing wave and seeded sparkles
//   gridDots                  square dot positions for a W×H field
//   portal / circleWipe       clip-path strings for a dive into an object and a wipe that opens from one
//   assembly / flight         "pixel by pixel" logo build: particle setup and the position of one particle at t
//   mixHex / coverRadius      colour mix and the radius that covers a frame from a point
import { clamp, lerp, ramp, ease } from './motion.js';
import { springTrack, springStep, hash } from './kinetics.js';

const num = (v, n) => { if (!Number.isFinite(v)) throw new Error(`${n} must be a finite number`); return v; };
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// ---------- container ----------
// tracks: { w: [[t, v], …], h: […], … }. Each property is a spring chasing stepped targets (retargets keep momentum).
export function morphBox(t, tracks, { duration = 0.45, bounce = 0.14 } = {}) {
  num(t, 't'); const out = {};
  for (const [k, keys] of Object.entries(tracks)) out[k] = springTrack(keys, t, { duration, bounce });
  return out;
}
// CSS blur (px) from the container's summed per-property speed; zero when settled.
export function morphBlur(t, tracks, { duration = 0.45, bounce = 0.14, k = 1 / 1100, max = 5, dt = 1 / 60 } = {}) {
  const a = morphBox(t, tracks, { duration, bounce }), b = morphBox(t - dt, tracks, { duration, bounce });
  let v = 0; for (const key of Object.keys(a)) v += Math.abs(a[key] - b[key]);
  const b2 = clamp((v / dt) * k, 0, max);
  return b2 < 0.01 ? 0 : b2; // exactly 0 once settled, so the final hold is crisp
}
// Content around a morph at time m: the old content leaves first, the new one resolves from blur slightly later.
export function swap(t, m, { out = 0.1, lead = 0.04, inDur = 0.18, blur = 8 } = {}) {
  const o = 1 - sm(m - lead, m - lead + out, t), i = sm(m + 0.04, m + 0.04 + inDur, t);
  return { old: { opacity: o, blur: (1 - o) * blur }, next: { opacity: i, blur: (1 - i) * blur } };
}

// ---------- cursor ----------
// keys: [{ t, x, y, arc? }] — ease-in-out between keys with a perpendicular sine bow (arc px, scaled for short moves).
export function cursorAt(keys, t) {
  if (!Array.isArray(keys) || !keys.length) throw new Error('cursorAt needs keys');
  if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
  for (let i = 1; i < keys.length; i++) if (t <= keys[i].t) {
    const a = keys[i - 1], b = keys[i], u = ease.inOutCubic(ramp(t, a.t, b.t));
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, off = Math.sin(Math.PI * u) * (b.arc ?? 70) * Math.min(1, len / 500);
    return { x: lerp(a.x, b.x, u) + (-dy / len) * off, y: lerp(a.y, b.y, u) + (dx / len) * off };
  }
  const k = keys[keys.length - 1]; return { x: k.x, y: k.y };
}
// Pointer scale (dips to 0.8 around each click) and the click ring { r, opacity } (0.45 s).
export function cursorClick(t, clicks = [], { dip = 0.2, ring = 0.45, r0 = 10, r1 = 56 } = {}) {
  let scale = 1, r = 0, opacity = 0;
  for (const c of clicks) {
    scale -= dip * Math.pow(Math.sin(Math.PI * clamp((t - c + 0.05) / 0.2)), 2);
    const u = ramp(t, c, c + ring); if (u > 0 && u < 1) { r = lerp(r0, r1, ease.outExpo(u)); opacity = 0.8 * (1 - u); }
  }
  return { scale, ring: { r, opacity } };
}

// ---------- pixel grid ----------
export function gridDots(W, H, step = 54) {
  const cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1, ox = (W - (cols - 1) * step) / 2, oy = (H - (rows - 1) * step) / 2, out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push({ i, j, x: ox + i * step, y: oy + j * step });
  return out;
}
// A wave front leaving (cx, cy) at t0: 0..1 lift for a dot at (x, y).
export function ripple(t, t0, x, y, cx, cy, { speed = 1500, band = 70, decay = 1.3 } = {}) {
  if (t < t0) return 0;
  const d = Math.hypot(x - cx, y - cy), f = (t - t0) * speed;
  return Math.exp(-(((d - f) / band) ** 2)) * Math.exp(-(t - t0) * decay);
}
// Sparse seeded sparkles so holds never freeze: `share` of dots blink at `rate` Hz.
export function twinkle(t, i, j, seed = 1, { rate = 0.45, share = 0.05, peak = 0.75 } = {}) {
  if (hash(i, j, seed) > share) return 0;
  const c = (t * rate + hash(i, j, seed + 1)) % 1;
  return c < 0.16 ? Math.pow(Math.sin((Math.PI * c) / 0.16), 2) * peak : 0;
}

// ---------- transitions ----------
export const coverRadius = (cx, cy, W, H) => Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
// Dive: the clicked object grows exponentially from size0 to `max` over [a, b]; returns its size, the camera scale for the
// scene around it, and the clip for the NEXT world (an inset rectangle with proportional rounding).
export function portal(t, { a, b, x, y, size0, max = 5200, W, H, round = 0.22, camera = 2.4 }) {
  const u = ramp(t, a, b), size = size0 * Math.exp(Math.log(max / size0) * Math.pow(u, 2.3)), h = size / 2, r = Math.min(size * round, 600);
  return { u, size, camera: 1 + camera * u * u, clip: u > 0 ? `inset(${(y - h).toFixed(2)}px ${(W - x - h).toFixed(2)}px ${(H - y - h).toFixed(2)}px ${(x - h).toFixed(2)}px round ${r.toFixed(2)}px)` : 'none' };
}
// Wipe that opens from an object: ease-out radius, ×overshoot so it completes before the cut-over.
export function circleWipe(t, { a, b, x, y, W, H, r0 = 0, power = 2.6, overshoot = 1.08 }) {
  const u = ramp(t, a, b), r = lerp(r0, coverRadius(x, y, W, H) * overshoot, 1 - Math.pow(1 - u, power));
  return { u, r, clip: t < b ? `circle(${r.toFixed(2)}px at ${x}px ${y}px)` : 'none' };
}

// ---------- pixel assembly ----------
// targets: [{ x, y, color }] in screen px; burst from (ox, oy) at t0. Delay mixes randomness with distance; flights bow sideways.
export function assembly(targets, { ox, oy, t0, seed = 7, spread = 0.3, swirl = 560, bias = 160, reach = 700 } = {}) {
  return targets.map((p, i) => {
    const r1 = hash(i, seed), r2 = hash(i, seed + 4), r3 = hash(i, seed + 6);
    const dx = p.x - ox, dy = p.y - oy, len = Math.hypot(dx, dy) || 1, off = (r2 - 0.5) * swirl + bias;
    return { ...p, ox, oy, t0, delay: 0.02 + spread * (0.55 * r1 + 0.45 * clamp(len / reach)), cx: (ox + p.x) / 2 - (dy / len) * off, cy: (oy + p.y) / 2 + (dx / len) * off, rot: (r3 - 0.5) * 300 };
  });
}
// Position, size and rotation of one particle at t (null before it leaves). Spring progress gives a small snap past the target.
export function flight(p, t, { duration = 0.55, bounce = 0.16, size0 = 4, size1 = 8.7 } = {}) {
  const tau = t - p.t0 - p.delay; if (tau <= 0) return null;
  const e = springStep(tau, { duration, bounce }).value, v = 1 - e;
  return { x: v * v * p.ox + 2 * v * e * p.cx + e * e * p.x, y: v * v * p.oy + 2 * v * e * p.cy + e * e * p.y, size: lerp(size0, size1, clamp(e)), rot: p.rot * clamp(1 - e), e };
}

// ---------- colour ----------
const hex = (h) => { if (!/^#[0-9a-f]{6}$/i.test(h)) throw new Error(`bad colour ${h}`); return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
export const mixHex = (a, b, p) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(p)))).join(',')})`; };
