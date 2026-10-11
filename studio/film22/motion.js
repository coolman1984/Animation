// Pure motion maths for film 22 (Node + browser): springs by damping ratio, the cursor hero's path. Imported by film.js and speedgraph.mjs.
import { T, tb, FPS } from './timing.js';

// Closed-form spring step response from rest, 0 → 1, by damping ratio ζ and natural frequency ω (rad/s). Any frame renders alone.
export function zspring(tau, zeta = 0.7, w = 22) {
  if (tau <= 0) return 0;
  if (Math.abs(zeta - 1) < 1e-4) return 1 - (1 + w * tau) * Math.exp(-w * tau);
  if (zeta < 1) { const wd = w * Math.sqrt(1 - zeta * zeta); return 1 - Math.exp(-zeta * w * tau) * (Math.cos(wd * tau) + (zeta * w / wd) * Math.sin(wd * tau)); }
  const s = Math.sqrt(zeta * zeta - 1), r1 = -w * (zeta - s), r2 = -w * (zeta + s);
  return 1 - (r2 * Math.exp(r1 * tau) - r1 * Math.exp(r2 * tau)) / (r2 - r1);
}
export const spr = (t, start, zeta, w) => zspring(t - start, zeta, w);

// ---------- layout (1080×1920 canvas) ----------
export const WIN = { x: 90, y: 330, w: 900, h: 850 };            // the terminal window; centre (540, 755)
export const PROMPT = { x: 214, y: 442, cw: 23.26, text: 'fix the failing checkout test', size: 38 };  // Space Mono advance 0.612 em
export const ROWS = [[150, 560], [150, 640], [150, 720]];         // step bullets (x, y)
export const DIFF = { x: 120, y: 780, w: 840, h: 250, red: 878, green: 958 };
export const CHIP = [[250, 1112], [540, 1112], [830, 1112]];      // test chips (cx, cy)
// typing: the time each character appears (24 chars/s, a short stall after each space) — shared by picture and score
export const CHAR_T = (() => { let tt = 0; return [...PROMPT.text].map((c) => { tt += 1 / 24 + (c === ' ' ? 0.045 : 0); return T.type0 + tt; }); })();
export const typedCount = (t) => CHAR_T.filter((x) => x <= t + 1e-9).length;
export const HOOK_CURSOR = { x: 540, y: 1010, w: 76, h: 140 };

// ---------- the hero: the orange cursor ----------
// Waypoints: it rests, then hops (arc + overshoot) to the next one. Each hop starts at `t`; state = rect {x,y,w,h} + radius.
const WAYPOINTS = [
  { t: 0, x: HOOK_CURSOR.x, y: HOOK_CURSOR.y, w: HOOK_CURSOR.w, h: HOOK_CURSOR.h, r: 6 },
  { t: T.hop, x: PROMPT.x, y: PROMPT.y, w: 22, h: 50, r: 3, arc: 150, zeta: 0.62, w0: 20 },
  { t: T.enter, x: ROWS[0][0], y: ROWS[0][1], w: 22, h: 22, r: 11, arc: 40, zeta: 0.6, w0: 24 },
  { t: T.steps[1], x: ROWS[1][0], y: ROWS[1][1], w: 22, h: 22, r: 11, arc: 26, zeta: 0.6, w0: 26 },
  { t: T.steps[2], x: ROWS[2][0], y: ROWS[2][1], w: 22, h: 22, r: 11, arc: 26, zeta: 0.6, w0: 26 },
  { t: T.diffIn + 0.12, x: DIFF.x + 26, y: DIFF.red, w: 14, h: 40, r: 3, arc: 60, zeta: 0.7, w0: 24 },
  { t: T.strike + 0.03, x: DIFF.x + 26, y: DIFF.green, w: 14, h: 40, r: 3, arc: 34, zeta: 0.68, w0: 26 },
  { t: T.chips[0] - 0.12, x: CHIP[0][0] - 100, y: CHIP[0][1], w: 30, h: 30, r: 15, arc: 90, zeta: 0.66, w0: 24 },
  { t: T.chips[1] - 0.12, x: CHIP[1][0] - 100, y: CHIP[1][1], w: 30, h: 30, r: 15, arc: 70, zeta: 0.66, w0: 26 },
  { t: T.chips[2] - 0.12, x: CHIP[2][0] - 100, y: CHIP[2][1], w: 30, h: 30, r: 15, arc: 70, zeta: 0.66, w0: 26 },
];
const lerp = (a, b, p) => a + (b - a) * p;

export function hero(t) {
  let k = 0; while (k + 1 < WAYPOINTS.length && t >= WAYPOINTS[k + 1].t) k++;   // waypoint k is the hop's destination, started at its own t
  if (k === 0) return { ...WAYPOINTS[0], sx: 1, sy: 1, tilt: 0 };
  const a = WAYPOINTS[k - 1], b = WAYPOINTS[k];
  const p = zspring(t - b.t, b.zeta, b.w0);                          // overshoots when ζ < 1: position and size may bounce
  const lin = Math.min(1, Math.max(0, (t - b.t) / 0.42));            // linear phase drives the arc bow
  const bow = -Math.sin(Math.PI * lin) * (b.arc || 0);               // lift off the straight line, land from above
  const x = lerp(a.x, b.x, p), y = lerp(a.y, b.y, p) + bow;
  const w = lerp(a.w, b.w, Math.min(1.12, p)), h = lerp(a.h, b.h, Math.min(1.12, p));
  const dt = 1 / 240, q = zspring(t + dt - b.t, b.zeta, b.w0);
  const speed = Math.abs(q - p) / dt * Math.hypot(b.x - a.x, b.y - a.y);      // px/s along the hop
  const stretch = Math.min(0.55, speed / 5200);                                  // stretch along motion, squash across (area kept)
  return { x, y, w, h, r: lerp(a.r, b.r, Math.min(1, p)), sx: 1 + stretch, sy: 1 / (1 + stretch * 0.6), tilt: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
}

// blink: on for the first half of each beat pair (eighth-note grid), always on while moving
export const cursorOn = (t) => {
  if (t < T.hop || (t >= T.type0 && t < T.enter && false)) return t < 1.5 ? 1 : (Math.floor(t / tb(0.5)) % 2 === 0 ? 1 : 0.28);
  return 1;
};
export { FPS };
