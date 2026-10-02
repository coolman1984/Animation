// Deterministic camera choreography for code-driven films.
// Pure functions only: safe for seeking, parallel frame rendering and exact re-renders.
import { springStep, springFollow, drift as organicDrift, motionPath, catmullRom } from './kinetics.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const finite = (v, name) => {
  if (!Number.isFinite(v)) throw new Error(`${name} must be finite`);
  return v;
};

export const cinematicEase = (p) => {
  p = clamp(p);
  return p * p * p * (p * (p * 6 - 15) + 10);
};

const cameraDefaults = { x: 0, y: 0, zoom: 1, focus: 1, aperture: 0 };

function validatedKey(key, i) {
  if (!key || typeof key !== 'object') throw new Error(`camera key ${i} must be an object`);
  finite(key.t, `camera key ${i}.t`);
  const out = { ...key };
  for (const f of ['x', 'y', 'zoom', 'focus', 'aperture']) {
    if (out[f] !== undefined) finite(out[f], `camera key ${i}.${f}`);
  }
  if (out.zoom !== undefined && out.zoom <= 0) throw new Error(`camera key ${i}.zoom must be > 0`);
  if (out.aperture !== undefined && out.aperture < 0) throw new Error(`camera key ${i}.aperture must be >= 0`);
  return out;
}

function expandedKeys(keys) {
  if (!Array.isArray(keys) || keys.length < 2) throw new Error('cameraPath needs at least two keys');
  const src = keys.map(validatedKey);
  for (let i = 1; i < src.length; i++) if (src[i].t <= src[i - 1].t) throw new Error('camera keys must be strictly ordered by time');
  const state = { ...cameraDefaults };
  return src.map((k) => {
    for (const f of Object.keys(cameraDefaults)) if (k[f] !== undefined) state[f] = k[f];
    return { ...state, ...k };
  });
}

function pick(k) {
  return { x: k.x, y: k.y, zoom: k.zoom, focus: k.focus, aperture: k.aperture };
}

export function cameraPath(keys, t, { ease = cinematicEase } = {}) {
  finite(t, 'camera time');
  const src = expandedKeys(keys);
  if (t <= src[0].t) return pick(src[0]);
  if (t >= src.at(-1).t) return pick(src.at(-1));
  let i = 1;
  while (t > src[i].t) i++;
  const a = src[i - 1], b = src[i];
  const p = ease(clamp((t - a.t) / (b.t - a.t)));
  return {
    x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), zoom: lerp(a.zoom, b.zoom, p),
    focus: lerp(a.focus, b.focus, p), aperture: lerp(a.aperture, b.aperture, p),
  };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let z = Math.imul(a ^ (a >>> 15), 1 | a);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

export function microDrift(t, { seed = 1, x = 0, y = 0, zoom = 0, frequency = 0.32 } = {}) {
  finite(t, 'microDrift time');
  for (const [name, value] of Object.entries({ x, y, zoom, frequency })) finite(value, `microDrift ${name}`);
  if (frequency < 0) throw new Error('microDrift frequency must be >= 0');
  const r = mulberry32(seed);
  const phases = Array.from({ length: 6 }, () => r() * Math.PI * 2);
  const w = Math.PI * 2 * frequency;
  return {
    x: x * (0.64 * Math.sin(w * t + phases[0]) + 0.36 * Math.sin(w * 0.43 * t + phases[1])),
    y: y * (0.62 * Math.sin(w * 0.81 * t + phases[2]) + 0.38 * Math.sin(w * 0.37 * t + phases[3])),
    zoomDelta: zoom * (0.68 * Math.sin(w * 0.29 * t + phases[4]) + 0.32 * Math.sin(w * 0.61 * t + phases[5])),
  };
}

export function composeCamera(base, ...offsets) {
  if (!base || typeof base !== 'object') throw new Error('composeCamera needs a base camera');
  const out = { ...cameraDefaults, ...base };
  for (const o of offsets) {
    if (!o) continue;
    for (const f of ['x', 'y', 'focus', 'aperture']) if (o[f] !== undefined) out[f] += finite(o[f], `camera offset ${f}`);
    if (o.zoomDelta !== undefined) out.zoom *= 1 + finite(o.zoomDelta, 'camera offset zoomDelta');
    if (o.zoom !== undefined) out.zoom *= finite(o.zoom, 'camera offset zoom');
  }
  if (!(out.zoom > 0) || out.aperture < 0) throw new Error('composed camera is invalid');
  return out;
}

export function rackFocus(t, { start, end, from = 1, to = 1, aperture = 10 } = {}) {
  for (const [name, value] of Object.entries({ t, start, end, from, to, aperture })) finite(value, `rackFocus ${name}`);
  if (end <= start) throw new Error('rackFocus end must be after start');
  if (aperture < 0) throw new Error('rackFocus aperture must be >= 0');
  const p = cinematicEase(clamp((t - start) / (end - start)));
  return { focus: lerp(from, to, p), aperture };
}

export function lensBreathing(focus, { reference = 1, amount = 0.012, max = 0.02 } = {}) {
  for (const [name, value] of Object.entries({ focus, reference, amount, max })) finite(value, `lensBreathing ${name}`);
  if (max < 0) throw new Error('lensBreathing max must be >= 0');
  return clamp((reference - focus) * amount, -max, max);
}

export function cameraKinematics(keys, t, { dt = 1 / 120 } = {}) {
  finite(dt, 'cameraKinematics dt');
  if (dt <= 0) throw new Error('cameraKinematics dt must be > 0');
  const a = cameraPath(keys, t - dt), b = cameraPath(keys, t), c = cameraPath(keys, t + dt);
  const derivative = (f) => (c[f] - a[f]) / (2 * dt);
  const acceleration = (f) => (c[f] - 2 * b[f] + a[f]) / (dt * dt);
  return {
    velocity: { x: derivative('x'), y: derivative('y'), zoom: derivative('zoom'), focus: derivative('focus') },
    acceleration: { x: acceleration('x'), y: acceleration('y'), zoom: acceleration('zoom'), focus: acceleration('focus') },
  };
}

// ======================================================================================
// Generation 2: smooth multi-key paths, intent-level moves, sequence choreography,
// shot hand-offs with velocity continuity, focus pulling, and motion diagnostics.
// Everything below is still a pure function of t. Camera = { x, y, zoom, focus, aperture }.
// ======================================================================================

const CHANNELS = ['x', 'y', 'zoom', 'focus', 'aperture'];
const toLin = (f, v) => (f === 'zoom' ? Math.log(v) : v);
const fromLin = (f, v) => (f === 'zoom' ? Math.exp(v) : v);

// C1-continuous camera through keys (monotone cubic Hermite per channel, zoom in log space so equal
// zoom ratios take equal time). Unlike cameraPath, interior keys do NOT stop the camera: it flows
// through them. `hold: true` on a key forces a settle (zero velocity) there. First/last keys settle
// unless they carry explicit velocities (vx, vy, vzoom as d(ln zoom)/dt, vfocus).
export function cameraSpline(keys, t) {
  finite(t, 'camera time');
  const src = expandedKeys(keys);
  if (t <= src[0].t) return pick(src[0]);
  if (t >= src.at(-1).t) return pick(src.at(-1));
  let i = 1; while (t > src[i].t) i++;
  const a = src[i - 1], b = src[i], h = b.t - a.t, u = (t - a.t) / h;
  const out = {};
  for (const f of CHANNELS) {
    const ma = tangent(src, i - 1, f), mb = tangent(src, i, f);
    const p0 = toLin(f, a[f]), p1 = toLin(f, b[f]);
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    out[f] = fromLin(f, h00 * p0 + h10 * h * ma + h01 * p1 + h11 * h * mb);
  }
  if (out.aperture < 0) out.aperture = 0;
  return out;
}
const VEL = { x: 'vx', y: 'vy', zoom: 'vzoom', focus: 'vfocus', aperture: 'vaperture' };
function tangent(src, i, f) {
  const k = src[i];
  if (k[VEL[f]] !== undefined) return finite(k[VEL[f]], `camera key ${i}.${VEL[f]}`);
  if (k.hold || i === 0 || i === src.length - 1) return 0;
  const p = src[i - 1], n = src[i + 1];
  const d0 = (toLin(f, k[f]) - toLin(f, p[f])) / (k.t - p.t), d1 = (toLin(f, n[f]) - toLin(f, k[f])) / (n.t - k.t);
  if (d0 * d1 <= 0) return 0; // turning point: monotone, never overshoots a key
  // PCHIP (Fritsch–Butland) weighted harmonic mean keeps each segment monotone.
  const h0 = k.t - p.t, h1 = n.t - k.t, w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
  return (w1 + w2) / (w1 / d0 + w2 / d1);
}

const zoomLerp = (a, b, p) => Math.exp(lerp(Math.log(a), Math.log(b), p));
const camLerp = (a, b, p) => ({ x: lerp(a.x ?? 0, b.x ?? 0, p), y: lerp(a.y ?? 0, b.y ?? 0, p), zoom: zoomLerp(a.zoom ?? 1, b.zoom ?? 1, p),
  focus: lerp(a.focus ?? 1, b.focus ?? 1, p), aperture: lerp(a.aperture ?? 0, b.aperture ?? 0, p) });
const full = c => ({ ...cameraDefaults, ...c });

// Intent-level camera behaviours. Each returns a function t → camera; compose with composeCamera,
// sequence with choreography(). Parameters are authored pixels / zoom factors / seconds.
export const moves = {
  // Hold a framing. Static holds are legitimate direction, not a failure to animate.
  hold: (cam = {}) => () => full(cam),
  // Interpolate between two framings over [start, end]. zoom changes are log-uniform.
  between: ({ start, end, from, to, ease = cinematicEase }) => {
    if (!(end > start)) throw new Error('move end must be after start');
    return t => camLerp(full(from), full(to), ease(clamp((t - start) / (end - start))));
  },
  // Push in / pull out toward an aim point (pan target) by a zoom ratio.
  pushIn: ({ start, end, at = {}, from = 1, to = 1.15, ease = cinematicEase, ...rest }) =>
    moves.between({ start, end, ease, from: { ...rest, ...at, zoom: from }, to: { ...rest, ...at, zoom: to } }),
  pullOut: ({ start, end, at = {}, from = 1.15, to = 1, ease = cinematicEase, ...rest }) =>
    moves.between({ start, end, ease, from: { ...rest, ...at, zoom: from }, to: { ...rest, ...at, zoom: to } }),
  // Lateral (truck) and vertical (pedestal) travel at constant framing.
  truck: ({ start, end, from = 0, to, zoom = 1, y = 0, ease = cinematicEase, ...rest }) =>
    moves.between({ start, end, ease, from: { ...rest, x: from, y, zoom }, to: { ...rest, x: to, y, zoom } }),
  pedestal: ({ start, end, from = 0, to, zoom = 1, x = 0, ease = cinematicEase, ...rest }) =>
    moves.between({ start, end, ease, from: { ...rest, y: from, x, zoom }, to: { ...rest, y: to, x, zoom } }),
  // Reveal: start withholding (tight / offset / soft), arrive on the full composition.
  reveal: ({ start, end, from, to, ease = cinematicEase }) => moves.between({ start, end, from, to, ease }),
  // Arrive with physical weight: spring from `from` to `to` (bounce 0 = no overshoot, ~0.15 = subtle settle).
  heroSettle: ({ start, from, to, duration = 1.2, bounce = 0.12 }) => t => {
    const p = springStep(t - start, { duration, bounce }).value;
    const a = full(from), b = full(to);
    return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), p)),
      focus: lerp(a.focus, b.focus, p), aperture: Math.max(0, lerp(a.aperture, b.aperture, p)) };
  },
  // Macro discovery: travel a tight lens along waypoints across a detail at constant speed, then open up.
  macroDiscovery: ({ start, end, waypoints, zoom = 2.4, settleZoom = 1.6, open = 0.35, ease = cinematicEase, focus = 1, aperture = 0 }) => {
    if (!Array.isArray(waypoints) || waypoints.length < 2) throw new Error('macroDiscovery needs two or more waypoints');
    const path = motionPath(catmullRom(waypoints));
    return t => {
      const p = ease(clamp((t - start) / (end - start)));
      const pt = path.at(p), z = zoomLerp(zoom, settleZoom, clamp((p - (1 - open)) / open));
      return { x: pt.x, y: pt.y, zoom: z, focus, aperture };
    };
  },
  // Operator following a moving subject (subject(t) → {x, y} pan target) with spring lag.
  follow: ({ subject, zoom = 1, lag = { duration: 0.8, bounce: 0 }, offset = { x: 0, y: 0 }, focus = 1, aperture = 0 }) => t => ({
    x: springFollow(u => subject(u).x, t, lag) + offset.x, y: springFollow(u => subject(u).y, t, lag) + offset.y, zoom, focus, aperture }),
};

// Offsets (add with composeCamera): bounded organic drift for a living handheld feel.
export const handheld = (t, { seed = 1, amplitude = 2, frequency = 0.3, zoom = 0.002 } = {}) => {
  const d = organicDrift(t, { seed, amplitude, frequency });
  return { x: d.x, y: d.y, zoomDelta: zoom * d.rotation };
};

// Motivated lens breathing: zoom compensation tied to focus distance (subtle, bounded).
export function breathe(camera, opts = {}) { return composeCamera(camera, { zoomDelta: lensBreathing(camera.focus, opts) }); }

// Focus puller: focus follows a subject's depth (depth(t) → number) with a human reaction lag.
export function focusTrack(t, depth, { lag = { duration: 0.45, bounce: 0 }, aperture = 10 } = {}) {
  return { focus: springFollow(depth, t, lag), aperture };
}

// Sampled velocity of any camera function (zoom as d ln(zoom)/dt).
export function cameraVelocity(fn, t, dt = 1 / 240) {
  const a = full(fn(t - dt)), b = full(fn(t + dt));
  return { x: (b.x - a.x) / (2 * dt), y: (b.y - a.y) / (2 * dt), zoom: (Math.log(b.zoom) - Math.log(a.zoom)) / (2 * dt), focus: (b.focus - a.focus) / (2 * dt) };
}

// Hand-off: the incoming shot inherits the outgoing camera's velocity at the cut, decaying over
// `duration` (critically damped). matchPosition also removes the position jump (use for continuous
// spaces / match cuts; leave false for a hard cut between different spaces). scale converts outgoing
// pixels to incoming pixels when the two framings differ.
export function handoff(prev, cut, next, { duration = 0.6, matchPosition = false, scale = 1 } = {}) {
  finite(cut, 'handoff cut'); finite(duration, 'handoff duration');
  if (duration <= 0) throw new Error('handoff duration must be > 0');
  const vp = cameraVelocity(prev, cut - 1 / 480), vn = cameraVelocity(next, cut + 1 / 480);
  const pp = full(prev(cut)), pn = full(next(cut)), T = duration / 4;
  const dv = { x: vp.x * scale - vn.x, y: vp.y * scale - vn.y, zoom: vp.zoom - vn.zoom };
  const dp = matchPosition ? { x: pp.x - pn.x, y: pp.y - pn.y, zoom: Math.log(pp.zoom) - Math.log(pn.zoom) } : { x: 0, y: 0, zoom: 0 };
  return t => {
    const c = full(next(t));
    if (t < cut) return c;
    const tau = t - cut, e = Math.exp(-tau / T);
    const o = f => (dp[f] + (dv[f] + dp[f] / T) * tau) * e;
    return { ...c, x: c.x + o('x'), y: c.y + o('y'), zoom: c.zoom * Math.exp(o('zoom')) };
  };
}

// One cinematographer for the whole film: shots [{ id, start, end, camera: fn | keys, handoff? }].
// at(t) evaluates the active shot; handoff options on a shot blend velocity in from the previous one.
export function choreography(shots) {
  if (!Array.isArray(shots) || !shots.length) throw new Error('choreography needs shots');
  const list = shots.map((s, i) => {
    if (!(s.end > s.start)) throw new Error(`shot ${s.id ?? i}: end must be after start`);
    if (i && s.start < shots[i - 1].end - 1e-9) throw new Error(`shot ${s.id ?? i}: overlaps previous shot`);
    const base = typeof s.camera === 'function' ? s.camera : Array.isArray(s.camera) ? (t => cameraSpline(s.camera, t)) : moves.hold(s.camera);
    return { ...s, base };
  });
  for (let i = 1; i < list.length; i++) if (list[i].handoff) list[i].fn = handoff(list[i - 1].fn || list[i - 1].base, list[i].start, list[i].base, list[i].handoff === true ? {} : list[i].handoff);
  for (const s of list) s.fn ||= s.base;
  const find = t => list.find(s => t < s.end) || list.at(-1);
  return {
    shots: list.map(({ id, start, end }) => ({ id, start, end })),
    at: t => full(find(t).fn(t)), shotAt: t => find(t).id,
    cuts: list.slice(1).map(s => s.start),
    continuous: list.slice(1).map(s => !!s.handoff),
  };
}

// Advisory motion diagnostics in screen-relative units (frame widths per second, ln-zoom per second).
// Events describe what happened and when; they are prompts to LOOK at the shot, not a taste verdict.
export function cameraDiagnostics(fn, { start, end, fps = 30, viewport = { w: 1080, h: 1920 }, holds = [], cuts = [], continuous = [],
  limits = {} } = {}) {
  const L = { speed: 0.6, zoomRate: 0.45, accel: 2.5, maxZoom: 3.2, pumping: 2, focusReversals: 2, deadStop: 0.25, ...limits };
  if (!(end > start) || !(fps > 0)) throw new Error('invalid diagnostics range');
  const sub = 4, dt = 1 / (fps * sub), n = Math.round((end - start) / dt);
  const cutSet = cuts.filter(c => c > start && c < end);
  const nearCut = t => cutSet.some(c => Math.abs(t - c) < 2.5 / fps);
  const rows = [];
  for (let i = 0; i <= n; i++) {
    const t = start + i * dt, c = full(fn(t)), v = cameraVelocity(fn, t, dt / 2);
    rows.push({ t, zoom: c.zoom, focus: c.focus, speed: Math.hypot(v.x, v.y) * c.zoom / viewport.w, zoomRate: v.zoom, focusRate: v.focus });
  }
  const events = [];
  const push = (t, kind, value, message) => { if (!events.some(e => e.kind === kind && Math.abs(e.t - t) < 0.5)) events.push({ t: +t.toFixed(3), kind, value: +value.toFixed(4), message }); };
  let maxSpeed = 0, maxZoomRate = 0, maxAccel = 0, maxZoom = 0, peakT = start;
  for (let i = 1; i < rows.length - 1; i++) {
    const r = rows[i];
    if (nearCut(r.t)) continue;
    const accel = Math.abs(rows[i + 1].speed - rows[i - 1].speed) / (2 * dt);
    if (r.speed > maxSpeed) { maxSpeed = r.speed; peakT = r.t; }
    maxZoomRate = Math.max(maxZoomRate, Math.abs(r.zoomRate)); maxAccel = Math.max(maxAccel, accel); maxZoom = Math.max(maxZoom, r.zoom);
    if (r.speed > L.speed) push(r.t, 'fast-pan', r.speed, `pan ${r.speed.toFixed(2)} frame-widths/s; check legibility and judder`);
    if (Math.abs(r.zoomRate) > L.zoomRate) push(r.t, 'fast-zoom', r.zoomRate, `zoom rate ${r.zoomRate.toFixed(2)} ln/s`);
    if (accel > L.accel) push(r.t, 'abrupt-acceleration', accel, `screen acceleration ${accel.toFixed(2)} widths/s²; ease the move`);
    if (r.zoom > L.maxZoom) push(r.t, 'excessive-zoom', r.zoom, `zoom ${r.zoom.toFixed(2)}× may exceed source resolution`);
    if (holds.some(([a, b]) => r.t > a && r.t < b) && (r.speed > 0.01 || Math.abs(r.zoomRate) > 0.01))
      push(r.t, 'motion-in-hold', r.speed, 'camera moves inside a declared reading/hero hold');
  }
  // Pumping: zoom direction reverses repeatedly within a 3 s window.
  // A reversal = a significant rate whose sign differs from the last significant rate.
  const reversals = (key, floor) => {
    const out = []; let last = 0;
    for (const r of rows) {
      if (nearCut(r.t)) { last = 0; continue; }
      if (Math.abs(r[key]) < floor) continue;
      const s = Math.sign(r[key]);
      if (last && s !== last) out.push(r.t);
      last = s;
    }
    return out;
  };
  const turns = reversals('zoomRate', 0.03);
  for (let i = 0; i < turns.length; i++) {
    const inWindow = turns.filter(x => x >= turns[i] && x < turns[i] + 3).length;
    if (inWindow >= L.pumping) push(turns[i], 'camera-pumping', inWindow, `zoom reverses ${inWindow}× within 3 s`);
  }
  const fturns = reversals('focusRate', 0.05);
  for (const t0 of fturns) { const k = fturns.filter(x => x >= t0 && x < t0 + 3).length; if (k >= L.focusReversals) push(t0, 'focus-hunting', k, `focus reverses ${k}× within 3 s`); }
  // Dead stop: the camera halts briefly between two moving spans (cameraPath interior keys do this).
  let moving = false, stopAt = null;
  for (const r of rows) {
    if (nearCut(r.t)) { moving = false; stopAt = null; continue; }
    const m = r.speed > 0.01 || Math.abs(r.zoomRate) > 0.01;
    if (moving && !m) stopAt = r.t;
    if (!moving && m && stopAt !== null && r.t - stopAt < L.deadStop && !holds.some(([a, b]) => stopAt >= a && stopAt <= b)) push(stopAt, 'dead-stop', r.t - stopAt, 'camera stops for an instant mid-move; use cameraSpline or a hold');
    if (m) stopAt = null; moving = m;
  }
  // Velocity across cuts: continuous transitions should not reverse direction or jump in speed.
  const boundaries = cutSet.map(c => {
    const i = cuts.indexOf(c);
    const a = cameraVelocity(fn, c - 3 / fps), b = cameraVelocity(fn, c + 3 / fps);
    const za = full(fn(c - 3 / fps)).zoom, zb = full(fn(c + 3 / fps)).zoom;
    const va = [a.x * za / viewport.w, a.y * za / viewport.w, a.zoom], vb = [b.x * zb / viewport.w, b.y * zb / viewport.w, b.zoom];
    const sa = Math.hypot(...va), sb = Math.hypot(...vb), dot = va.reduce((s, x, k) => s + x * vb[k], 0);
    const reversal = sa > 0.02 && sb > 0.02 && dot < 0, ratio = Math.max(sa, sb) / Math.max(1e-3, Math.min(sa, sb));
    const row = { t: c, continuous: !!continuous[i], speedBefore: +sa.toFixed(4), speedAfter: +sb.toFixed(4), reversal };
    if (row.continuous && (reversal || (ratio > 3 && Math.max(sa, sb) > 0.05))) push(c, 'transition-velocity', ratio, reversal ? 'camera direction reverses across a continuous transition' : `speed jumps ×${ratio.toFixed(1)} across a continuous transition`);
    return row;
  });
  return { max: { speed: +maxSpeed.toFixed(4), zoomRate: +maxZoomRate.toFixed(4), accel: +maxAccel.toFixed(4), zoom: +maxZoom.toFixed(4) },
    peakSpeedTime: +peakT.toFixed(3), events: events.sort((a, b) => a.t - b.t), boundaries };
}
