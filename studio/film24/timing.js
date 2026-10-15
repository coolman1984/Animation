// Film 24 — 3D fly-over of the AI Essentials Academy landing page. 14.5 s, 1440×1152 @ 60 fps.
// ONE camera, never a cut. Everything here is pure (Node + browser): the film, the score and the optical-flow check share it.
import layout from './capture/layout.json' with { type: 'json' };
export const W = 1440, HI = 1152, FPS = 60, DUR = 14.5, F = 1880;
export const PAGE_W = layout.width, PAGE_H = layout.height, HERO_B = 1180;     // the hero card = page y 0..1180
export const T = { flightEnd: 8.2, rise0: 7.75, rise1: 9.25, over1: 9.47, dive1: 9.97, badge: 10.02, line1: 10.12, line2: 10.36, settle: 10.6, end: DUR,
  hit: 9.97, whoosh: [8.66, 9.80] };
export const LY0 = 330, LY_FOOT = 4368, D0 = 1360, D1 = 1700, TILT = 56 * Math.PI / 180;
const ss = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const lerp = (a, b, p) => a + (b - a) * p;
const ioQ = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

// ---------- one speed curve (share of cruise) → integrated page position ----------
export function speed(t) {
  if (t < 0.6) return 0.5 * ss(0, 0.6, t);
  if (t < 1.25) return 0.5;
  if (t < 1.6) return 0.5 + 0.5 * ss(1.25, 1.6, t);
  if (t < 7.3) return 1.0;
  if (t < 8.3) return lerp(1.0, 0.12, ss(7.3, 8.3, t));
  return 0.12 * (1 - ss(8.3, 8.65, t));
}
const DT = 1 / 2000, TAB = [];
{ let s = 0; for (let i = 0; i <= Math.ceil(9 / DT); i++) { TAB.push(s); s += speed((i + 0.5) * DT) * DT; } }
const integ = (t) => { const x = Math.min(TAB.length - 1.001, Math.max(0, t / DT)), i = Math.floor(x); return lerp(TAB[i], TAB[i + 1], x - i); };
export const CRUISE = (LY_FOOT - LY0) / integ(8.0);                       // ≈ page px per second at share 1.0
export const glideY = (t) => LY0 + CRUISE * integ(t);

// ---------- distance / scale ----------
export const S_STRIP = (HI - 84) / PAGE_H;                                  // the whole page as one strip, 42 px top and bottom
export const D_STRIP = F / S_STRIP;
export const S_CARD = 1018 / PAGE_W;                                         // the hero card, 1018 px wide
const flightD = (t) => D0 + (D1 - D0) * (1 - Math.pow(1 - Math.min(1, t / T.flightEnd), 2));
// trapezoid speed in log(distance): ramp 7.75–8.35, even 8.35–8.95, ramp down to 9.25
function trapezoid(t) {
  const a = T.rise0, b = 8.35, c = 8.95, d = T.rise1, vmax = 1 / ((b - a) / 2 + (c - b) + (d - c) / 2);
  if (t <= a) return 0; if (t >= d) return 1;
  if (t < b) return vmax * (t - a) ** 2 / (2 * (b - a));
  const A = vmax * (b - a) / 2; if (t < c) return A + vmax * (t - b);
  const B = A + vmax * (c - b), u = t - c; return B + vmax * (u - u * u / (2 * (d - c)));
}
// ---------- the camera: look-at (720, ly, 0), tilt off straight-down, distance ----------
export function camera(t) {
  if (t < T.rise1) {
    const theta = TILT * (1 - ioQ(Math.min(1, Math.max(0, (t - 8.15) / 0.8))));
    const D = t < T.rise0 ? flightD(t) : Math.exp(lerp(Math.log(flightD(T.rise0)), Math.log(D_STRIP), trapezoid(t)));
    const a = 534 * D / (F * Math.cos(theta) + 534 * Math.sin(theta));       // pins the page's bottom edge at y 1110
    const ly = lerp(glideY(t), PAGE_H - a, ss(8.22, 8.42, t));
    return { ly, D, theta, s: F / D };
  }
  if (t < T.over1) {                                                           // the centred strip creeps 3.5 % closer
    const s = S_STRIP * (1 + 0.035 * ss(T.rise1, T.over1, t));
    return { ly: PAGE_H / 2, D: F / s, theta: 0, s };
  }
  if (t < T.dive1) {                                                           // dive: log scale, quadratic in-out; top edge pinned, then drops to 283
    const u = (t - T.over1) / (T.dive1 - T.over1), s1 = S_STRIP * 1.035;
    const s = Math.exp(lerp(Math.log(s1), Math.log(S_CARD), ioQ(u)));
    const top0 = 576 - (PAGE_H / 2) * s1, topY = lerp(top0, 283, ss(0.5, 1, u));
    return { ly: (576 - topY) / s, D: F / s, theta: 0, s };
  }
  const s = S_CARD * (1 + 0.02 * ss(T.dive1, T.end, t));                      // hold: the card creeps 2 % closer about its centre
  const cy = HERO_B / 2, sc = 283 + cy * S_CARD;
  return { ly: cy - (sc - 576) / s, D: F / s, theta: 0, s };
}
// screen y of a page point (on the floor) for the optical-flow / speed checks
export function screenY(py, c) { const a = py - c.ly; return 576 + F * Math.cos(c.theta) * a / (c.D - a * Math.sin(c.theta)); }
