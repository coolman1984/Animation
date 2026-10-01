// Deterministic camera choreography for code-driven films.
// Pure functions only: safe for seeking, parallel frame rendering and exact re-renders.

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
