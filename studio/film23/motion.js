// Pure motion maths for film 23 (Node + browser): springs by damping ratio, rect morphs, the cursor's bowed path.
import { T } from './timing.js';

// Closed-form spring step response from rest, 0 → 1, by damping ratio ζ and natural frequency ω (rad/s). Any frame renders alone.
export function zspring(tau, zeta = 0.7, w = 22) {
  if (tau <= 0) return 0;
  if (Math.abs(zeta - 1) < 1e-4) return 1 - (1 + w * tau) * Math.exp(-w * tau);
  if (zeta < 1) { const wd = w * Math.sqrt(1 - zeta * zeta); return 1 - Math.exp(-zeta * w * tau) * (Math.cos(wd * tau) + (zeta * w / wd) * Math.sin(wd * tau)); }
  const s = Math.sqrt(zeta * zeta - 1), r1 = -w * (zeta - s), r2 = -w * (zeta + s);
  return 1 - (r2 * Math.exp(r1 * tau) - r1 * Math.exp(r2 * tau)) / (r2 - r1);
}
const lerp = (a, b, p) => a + (b - a) * p;

// ---------- layout (1920×1080) ----------
// The window lives on the left (the UI stage); copy lives in a right-hand column (RTL reading starts there).
export const COPY = { cx: 1420, y1: 430, y2: 560, width: 760 };
export const PAGE = { x: 560, y: 540, w: 400, h: 540, r: 14 };
export const WIN = {
  ac: { x: 560, y: 545, w: 900, h: 760, r: 18 },
  lv: { x: 560, y: 545, w: 900, h: 760, r: 18 },
  sc: { x: 575, y: 545, w: 960, h: 640, r: 18 },
  lab: { x: 560, y: 545, w: 900, h: 700, r: 18 },
  pr: { x: 560, y: 545, w: 900, h: 760, r: 18 },
  qz: { x: 560, y: 545, w: 860, h: 640, r: 18 },
};
// The window's rect at time t: a chain of spring morphs between chapter rects (page → ac → … → qz). Content swaps around each morph.
const CHAIN = [[T.wake, 'ac', 0.72, 15], [T.sc - 0.05, 'sc', 0.78, 17], [T.lab - 0.05, 'lab', 0.78, 17], [T.dark + 0.05, 'pr', 0.8, 17], [T.qz - 0.05, 'qz', 0.78, 17]];
export function winRect(t) {
  let cur = { ...PAGE }, last = { ...PAGE }, p = 1;
  for (const [t0, key, z, w] of CHAIN) { if (t < t0) break; last = cur; cur = WIN[key]; p = zspring(t - t0, z, w); }
  const q = Math.min(p, 1.06);
  return { x: lerp(last.x, cur.x, q), y: lerp(last.y, cur.y, q), w: lerp(last.w, cur.w, q), h: lerp(last.h, cur.h, q), r: lerp(last.r, cur.r, Math.min(1, p)), v: Math.abs(1 - p) };
}

// ---------- the cursor narrator: rests, then hops on a bowed path to the next point ----------
// Waypoints {t, x, y, arc}. A click dips it (scale 0.86) for 0.12 s; clicks are listed separately.
const WP = [
  { t: 0, x: 1180, y: 1180 },
  { t: T.cur0, x: 640, y: 560, arc: 140 },                 // onto the page
  { t: T.wake + 0.6, x: 1040, y: 1020, arc: -60 },          // steps aside while the window grows
  { t: T.labClick - 0.55, x: 956, y: 356, arc: 120 },        // to the lab checkbox
  { t: T.dark - 0.5, x: 262, y: 223, arc: 80 },             // to the moon toggle in the title bar
  { t: T.pick - 0.55, x: 640, y: 372, arc: -70 },           // to the first prompt in the list
  { t: T.copy - 0.55, x: 236, y: 792, arc: 90 },            // to the copy button
  { t: T.qzPick - 0.6, x: 640, y: 512, arc: 80 },           // to the right answer
  { t: T.light - 0.5, x: 282, y: 253, arc: -60 },           // to the sun toggle
  { t: T.implode - 0.1, x: 1220, y: 1180, arc: 100 },       // leaves the frame while the pages fly
  { t: T.cta + 0.9, x: 1012, y: 784, arc: 140 },            // to the CTA
];
export const CLICKS = [T.wake, T.labClick, T.dark, T.pick, T.copy, T.qzPick, T.light, T.ctaClick];
export function cursor(t) {
  let k = 0; while (k + 1 < WP.length && t >= WP[k + 1].t) k++;
  const b = WP[k], a = WP[Math.max(0, k - 1)];
  if (k === 0) return { x: b.x, y: b.y, s: 1, tilt: 0 };
  const p = zspring(t - b.t, 0.82, 13), lin = Math.min(1, Math.max(0, (t - b.t) / 0.55));
  const bow = -Math.sin(Math.PI * lin) * (b.arc || 0);
  let s = 1; for (const c of CLICKS) { const u = (t - c) / 0.14; if (u > 0 && u < 1) s = Math.min(s, 1 - 0.16 * Math.sin(Math.PI * u)); }
  return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) + bow, s, tilt: -8 * Math.sin(Math.PI * lin) * Math.sign(b.x - a.x || 1) };
}
