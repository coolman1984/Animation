// Motion physics and procedural primitives. Pure math, no DOM: usable in film.js, score.mjs and tests.
// Every function is a closed-form (or fixed-sample) function of explicit time t, so seeking backwards,
// rendering frames in parallel and re-rendering give identical values. No wall clock, no Math.random().
import { clamp, lerp } from './motion.js';

const finite = (v, name) => { if (!Number.isFinite(v)) throw new Error(`${name} must be finite`); return v; };

// ---------- easing ----------
// CSS-compatible cubic-bezier(x1,y1,x2,y2): Newton iterations with a bisection fallback.
export function cubicBezier(x1, y1, x2, y2) {
  for (const [n, v] of Object.entries({ x1, y1, x2, y2 })) finite(v, `cubicBezier ${n}`);
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) throw new Error('cubicBezier x values must be in [0,1]');
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = u => ((ax * u + bx) * u + cx) * u, sy = u => ((ay * u + by) * u + cy) * u;
  const dx = u => (3 * ax * u + 2 * bx) * u + cx;
  return (p) => {
    if (p <= 0) return 0; if (p >= 1) return 1;
    let u = p;
    for (let i = 0; i < 8; i++) {
      const e = sx(u) - p, d = dx(u);
      if (Math.abs(e) < 1e-7) return sy(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    let lo = 0, hi = 1; u = p;
    for (let i = 0; i < 40; i++) { const x = sx(u); if (Math.abs(x - p) < 1e-7) break; if (x < p) lo = u; else hi = u; u = (lo + hi) / 2; }
    return sy(u);
  };
}

// Anticipation / overshoot curves: s controls how far the motion pulls back or overshoots (0 = none).
export const backIn = (s = 1.70158) => p => p * p * ((s + 1) * p - s);
export const backOut = (s = 1.70158) => p => { const q = p - 1; return 1 + q * q * ((s + 1) * q + s); };
export const backInOut = (s = 1.70158) => { const k = s * 1.525; return p => p < 0.5
  ? (Math.pow(2 * p, 2) * ((k + 1) * 2 * p - k)) / 2
  : (Math.pow(2 * p - 2, 2) * ((k + 1) * (p * 2 - 2) + k) + 2) / 2; };

// Named curves with an intent, so films choose a feeling rather than a magic number.
export const curves = Object.freeze({
  standard: cubicBezier(0.2, 0, 0, 1),        // general UI-like movement, quick start, long settle
  decelerate: cubicBezier(0, 0, 0, 1),        // things arriving
  accelerate: cubicBezier(0.3, 0, 1, 1),      // things leaving
  emphasized: cubicBezier(0.05, 0.7, 0.1, 1), // confident hero arrivals
  gentle: cubicBezier(0.45, 0, 0.55, 1),      // symmetric, calm
});

// ---------- springs ----------
// Designer-facing parameters (duration, bounce) like SwiftUI/Motion; bounce 0 = critically damped,
// 0.3 = visible overshoot, negative = overdamped. Mass 1.
export function springConfig({ duration = 0.6, bounce = 0 } = {}) {
  finite(duration, 'spring duration'); finite(bounce, 'spring bounce');
  if (duration <= 0 || bounce <= -1 || bounce >= 1) throw new Error('spring duration must be > 0 and bounce in (-1,1)');
  const stiffness = (2 * Math.PI / duration) ** 2;
  const damping = bounce >= 0 ? (1 - bounce) * 4 * Math.PI / duration : 4 * Math.PI / (duration * (1 + bounce));
  return { stiffness, damping, mass: 1 };
}
const springParams = (cfg = {}) => {
  const c = cfg.stiffness === undefined ? springConfig(cfg) : cfg;
  const { stiffness: k, damping: d, mass: m = 1, velocity = 0 } = c;
  for (const [n, v] of Object.entries({ k, d, m, velocity })) finite(v, `spring ${n}`);
  if (k <= 0 || d < 0 || m <= 0) throw new Error('spring stiffness/mass must be > 0 and damping >= 0');
  const w0 = Math.sqrt(k / m), zeta = d / (2 * Math.sqrt(k * m));
  return { w0, zeta, v0: velocity };
};

// Analytic unit-step response (0 → 1) and its velocity at elapsed time tau. velocity = initial velocity
// in units of the move per second, e.g. to continue a motion that was already travelling.
export function springStep(tau, cfg) {
  finite(tau, 'spring time');
  if (tau <= 0) return { value: 0, velocity: tau === 0 ? (springParams(cfg).v0) : 0 };
  const { w0, zeta, v0 } = springParams(cfg);
  let y, dy;
  if (zeta < 1 - 1e-9) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta), a = -1, b = (v0 + zeta * w0 * a) / wd;
    const e = Math.exp(-zeta * w0 * tau), c = Math.cos(wd * tau), s = Math.sin(wd * tau);
    y = e * (a * c + b * s);
    dy = e * ((-zeta * w0) * (a * c + b * s) + (-a * wd * s + b * wd * c));
  } else if (zeta <= 1 + 1e-9) {
    const a = -1, b = v0 + w0 * a, e = Math.exp(-w0 * tau);
    y = e * (a + b * tau);
    dy = e * (b - w0 * (a + b * tau));
  } else {
    const r = Math.sqrt(zeta * zeta - 1), r1 = -w0 * (zeta - r), r2 = -w0 * (zeta + r);
    const c2 = (v0 + r1) / (r2 - r1), c1 = -1 - c2;
    y = c1 * Math.exp(r1 * tau) + c2 * Math.exp(r2 * tau);
    dy = c1 * r1 * Math.exp(r1 * tau) + c2 * r2 * Math.exp(r2 * tau);
  }
  return { value: 1 + y, velocity: dy };
}

// One spring move from `from` to `to` starting at `start`.
export function spring(t, { from = 0, to = 1, start = 0, ...cfg } = {}) {
  return from + (to - from) * springStep(t - start, cfg).value;
}

// Spring that chases a stepped target track [[t, value], ...]. Linear superposition of exact step
// responses: retargeting mid-flight carries momentum and overshoot naturally, still pure in t.
export function springTrack(keys, t, cfg = {}) {
  if (!Array.isArray(keys) || !keys.length) throw new Error('springTrack needs keys');
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (keys[i][0] < keys[i - 1][0]) throw new Error('springTrack keys must be ordered');
    if (t <= keys[i][0]) break;
    v += (keys[i][1] - keys[i - 1][1]) * springStep(t - keys[i][0], { ...cfg, velocity: 0 }).value;
  }
  return v;
}

// Time after which the envelope stays inside `tolerance` of the target (design check: "settled before copy").
export function springSettleTime(cfg = {}, tolerance = 0.001) {
  const { w0, zeta } = springParams(cfg);
  if (zeta < 1 - 1e-9) return Math.max(0, Math.log(1 / (Math.sqrt(1 - zeta * zeta) * tolerance)) / (zeta * w0));
  // Critically/over-damped responses are monotone: bisect for the tolerance crossing.
  const err = tau => 1 - springStep(tau, { ...cfg, velocity: 0 }).value;
  let lo = 0, hi = 1 / w0;
  while (err(hi) > tolerance && hi < 1e4) hi *= 2;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (err(mid) > tolerance) lo = mid; else hi = mid; }
  return hi;
}

// Follow-through / secondary motion: the response of a spring driven by any function of time,
// computed as a fixed-sample convolution with the spring's impulse response. DC gain is normalized
// to exactly 1, so a resting source yields exactly the same resting value (no drift, no accumulation).
export function springFollow(source, t, cfg = {}, { samples = 48, window } = {}) {
  if (typeof source !== 'function') throw new Error('springFollow source must be a function of time');
  if (!Number.isInteger(samples) || samples < 4 || samples > 512) throw new Error('springFollow samples must be 4..512');
  const W = window ?? Math.min(4, springSettleTime(cfg, 0.002));
  const dt = W / samples;
  let acc = 0, norm = 0;
  for (let i = 0; i <= samples; i++) {
    const tau = i * dt, w = (i === 0 || i === samples ? 0.5 : 1) * springStep(tau, { ...cfg, velocity: 0 }).velocity;
    acc += w * source(t - tau); norm += w;
  }
  return acc / norm;
}

// ---------- inertia / anticipation ----------
// A thrown object decelerating under friction (exponential, like iOS scroll decay).
export function inertia(t, { start = 0, from = 0, velocity = 0, friction = 4 } = {}) {
  for (const [n, v] of Object.entries({ t, start, from, velocity, friction })) finite(v, `inertia ${n}`);
  if (friction <= 0) throw new Error('inertia friction must be > 0');
  const tau = Math.max(0, t - start);
  return from + (velocity / friction) * (1 - Math.exp(-friction * tau));
}
// The launch velocity that makes an inertia move come to rest exactly on `to`.
export const inertiaVelocity = ({ from = 0, to, friction = 4 }) => (to - from) * friction;

// Move from `from` to `to` over [start, end] with a small pull back first (amount × distance).
export function anticipate(t, { start, end, from = 0, to = 1, amount = 0.12, ease } = {}) {
  const p = clamp((t - start) / (end - start));
  const f = ease || backInOut(amount * 14);
  return lerp(from, to, f(p));
}

// ---------- stagger / delay chains ----------
// Delay (seconds) for item i of n. from: 'start' | 'end' | 'center' | 'edges' | index | 'random' (seeded).
export function stagger(i, n, { each = 0.05, total, from = 'start', ease, seed = 1 } = {}) {
  if (!Number.isInteger(i) || !Number.isInteger(n) || n < 1 || i < 0 || i >= n) throw new Error('stagger index out of range');
  if (n === 1) return 0;
  let origin;
  if (from === 'start') origin = 0; else if (from === 'end') origin = n - 1;
  else if (from === 'center' || from === 'edges') origin = (n - 1) / 2;
  else if (from === 'random') { const order = shuffle([...Array(n).keys()], seed); return order.indexOf(i) * (total !== undefined ? total / (n - 1) : each); }
  else if (Number.isFinite(from)) origin = clamp(from, 0, n - 1);
  else throw new Error('stagger from must be start/end/center/edges/random or an index');
  const maxDist = Math.max(origin, n - 1 - origin);
  let d = Math.abs(i - origin);
  if (from === 'edges') d = maxDist - d;
  const unit = total !== undefined ? total / maxDist : each;
  const pos = ease ? ease(d / maxDist) * maxDist : d;
  return pos * unit;
}
// Distance-based grid stagger: ripple from a cell (or fractional point).
export function staggerGrid(x, y, cols, rows, { from = [0, 0], each = 0.04 } = {}) {
  if (![x, y, cols, rows].every(Number.isInteger) || x < 0 || y < 0 || x >= cols || y >= rows) throw new Error('grid index out of range');
  return Math.hypot(x - from[0], y - from[1]) * each;
}
// Each link of a chain lags the previous by `delay`: tails, ropes, ribbons, typographic echoes.
export const delayChain = (fn, t, index, delay = 0.06) => fn(t - index * delay);

// ---------- seeded randomness + noise ----------
export function hash(...ints) {
  let h = 0x811c9dc5 | 0;
  for (const v of ints) { h ^= v | 0; h = Math.imul(h, 0x01000193); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; }
  return (h >>> 0) / 4294967296;
}
export function shuffle(list, seed = 1) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(hash(seed, i) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const fade = u => u * u * u * (u * (u * 6 - 15) + 10);
const grad1 = (i, seed) => hash(seed, i) * 2 - 1;
// 1D gradient noise in [-1, 1] (≈), smooth, seeded, zero at integer lattice points.
export function noise1(x, seed = 0) {
  finite(x, 'noise x');
  const i = Math.floor(x), f = x - i;
  const a = grad1(i, seed) * f, b = grad1(i + 1, seed) * (f - 1);
  return 2 * lerp(a, b, fade(f));
}
const grad2 = (ix, iy, seed) => { const a = hash(seed, ix, iy) * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; };
// 2D gradient (Perlin-style) noise in roughly [-1, 1].
export function noise2(x, y, seed = 0) {
  finite(x, 'noise x'); finite(y, 'noise y');
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const dot = (gx, gy, dx, dy) => { const g = grad2(gx, gy, seed); return g[0] * dx + g[1] * dy; };
  const u = fade(fx), v = fade(fy);
  const n0 = lerp(dot(ix, iy, fx, fy), dot(ix + 1, iy, fx - 1, fy), u);
  const n1 = lerp(dot(ix, iy + 1, fx, fy - 1), dot(ix + 1, iy + 1, fx - 1, fy - 1), u);
  return Math.SQRT2 * lerp(n0, n1, v);
}
// Fractal sum of noise octaves, normalized back into roughly [-1, 1].
export function fbm(x, y = 0, { octaves = 4, lacunarity = 2, gain = 0.5, seed = 0 } = {}) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) { sum += amp * noise2(x * freq, y * freq, seed + o * 131); norm += amp; amp *= gain; freq *= lacunarity; }
  return sum / norm;
}
// Organic 2D drift for handheld feel, floating objects or living light. amplitude in px, frequency in Hz.
export function drift(t, { seed = 1, amplitude = [4, 4], frequency = 0.25, octaves = 2 } = {}) {
  const [ax, ay] = Array.isArray(amplitude) ? amplitude : [amplitude, amplitude];
  return {
    x: ax * fbm(t * frequency, 0.37, { octaves, seed }),
    y: ay * fbm(t * frequency, 7.91, { octaves, seed: seed + 17 }),
    rotation: fbm(t * frequency * 0.7, 3.3, { octaves: 1, seed: seed + 29 }),
  };
}

// ---------- paths ----------
export const cubicPoint = (a, b, c, d, u) => {
  const v = 1 - u;
  return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0],
    v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]];
};
// SVG path subset → cubic segments. Supports M L H V C S Q T Z, absolute and relative.
export function parsePath(d) {
  if (typeof d !== 'string' || !d.trim()) throw new Error('path data required');
  const tokens = d.match(/[MLHVCSQTZmlhvcsqtz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const segs = []; let i = 0, cmd = null, cur = [0, 0], start = [0, 0], lastCtrl = null, lastCmd = '';
  const num = () => { const v = Number(tokens[i++]); if (!Number.isFinite(v)) throw new Error('bad path number'); return v; };
  const line = (p) => { segs.push([cur, lerpPt(cur, p, 1 / 3), lerpPt(cur, p, 2 / 3), p]); cur = p; };
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) throw new Error('path must start with a command');
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const pt = () => { const x = num(), y = num(); return rel ? [cur[0] + x, cur[1] + y] : [x, y]; };
    if (C === 'M') { cur = pt(); start = cur; cmd = rel ? 'l' : 'L'; lastCtrl = null; }
    else if (C === 'L') { line(pt()); lastCtrl = null; }
    else if (C === 'H') { const x = num(); line([rel ? cur[0] + x : x, cur[1]]); lastCtrl = null; }
    else if (C === 'V') { const y = num(); line([cur[0], rel ? cur[1] + y : y]); lastCtrl = null; }
    else if (C === 'C') { const c1 = pt(), c2 = pt(), p = pt(); segs.push([cur, c1, c2, p]); lastCtrl = c2; cur = p; }
    else if (C === 'S') { const c1 = lastCtrl && /[CS]/.test(lastCmd) ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur; const c2 = pt(), p = pt(); segs.push([cur, c1, c2, p]); lastCtrl = c2; cur = p; }
    else if (C === 'Q' || C === 'T') {
      const q = C === 'Q' ? pt() : (lastCtrl && /[QT]/.test(lastCmd) ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur);
      const p = pt();
      segs.push([cur, lerpPt(cur, q, 2 / 3), lerpPt(p, q, 2 / 3), p]); lastCtrl = q; cur = p;
    } else if (C === 'Z') { if (cur[0] !== start[0] || cur[1] !== start[1]) line(start); cur = start; lastCtrl = null; }
    else throw new Error('unsupported path command ' + cmd);
    lastCmd = C;
  }
  if (!segs.length) throw new Error('path has no drawable segments');
  return segs;
}
const lerpPt = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

// Catmull-Rom spline through points → cubic segments (smooth motion through authored waypoints).
export function catmullRom(points, { tension = 0.5, closed = false } = {}) {
  if (!Array.isArray(points) || points.length < 2) throw new Error('catmullRom needs at least two points');
  const n = points.length, P = i => points[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  const segs = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), k = tension / 3 * 2;
    segs.push([p1, [p1[0] + (p2[0] - p0[0]) * k / 2, p1[1] + (p2[1] - p0[1]) * k / 2],
      [p2[0] - (p3[0] - p1[0]) * k / 2, p2[1] - (p3[1] - p1[1]) * k / 2], p2]);
  }
  return segs;
}

// Arc-length parameterized path: at(p) gives constant-speed position + heading for p in [0,1].
export function motionPath(input, { resolution = 64 } = {}) {
  const segs = typeof input === 'string' ? parsePath(input) : input;
  if (!Array.isArray(segs) || !segs.length) throw new Error('motionPath needs path data or cubic segments');
  const pts = [], lens = [0];
  for (const s of segs) for (let k = pts.length ? 1 : 0; k <= resolution; k++) pts.push(cubicPoint(...s, k / resolution));
  for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const length = lens.at(-1);
  const at = (p) => {
    const target = clamp(p) * length;
    let lo = 0, hi = lens.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lens[mid] < target) lo = mid; else hi = mid; }
    const span = lens[hi] - lens[lo] || 1, f = (target - lens[lo]) / span;
    const a = pts[lo], b = pts[hi];
    return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
  };
  return { length, at, points: pts };
}

// Resample two closed outlines to the same point count and interpolate: a shape morph that works for
// any pair of paths (outline morph, not topology-aware). Returns SVG path data.
export function morphPath(a, b, p, { points = 96 } = {}) {
  const A = motionPath(a), B = motionPath(b);
  let d = '';
  for (let i = 0; i < points; i++) {
    const u = i / points, pa = A.at(u), pb = B.at(u);
    d += `${i ? 'L' : 'M'}${lerp(pa.x, pb.x, p).toFixed(2)} ${lerp(pa.y, pb.y, p).toFixed(2)} `;
  }
  return d + 'Z';
}

// ---------- numbers ----------
// Animated value with explicit decimals: rounding happens here, so the displayed number never jitters
// between formats. Use typography.countUp for DOM display with tabular figures.
export function countValue(t, { start, end, from = 0, to, decimals = 0, ease = curves.decelerate } = {}) {
  const p = ease(clamp((t - start) / (end - start)));
  const f = 10 ** decimals;
  return Math.round(lerp(from, to, p) * f) / f;
}
// digits: 'arab' (٠١٢) or 'latn' (012). Deterministic ICU formatting in Node and Chromium.
export function formatNumber(value, { locale = 'ar-EG', digits = 'arab', decimals = 0, grouping = true, prefix = '', suffix = '' } = {}) {
  finite(value, 'formatNumber value');
  if (!['arab', 'latn'].includes(digits)) throw new Error('digits must be arab or latn');
  const nf = new Intl.NumberFormat(`${locale}-u-nu-${digits}`, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouping });
  return prefix + nf.format(value) + suffix;
}
