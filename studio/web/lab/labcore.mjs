// Motion lab core. Pure functions: no DOM, no clock, no network.
// House curves match studio/lib/motion.js `ease` (the test locks that).
// Export lines use only flags that studio.mjs, make.mjs and studio-engine/run.mjs really accept.

export const FPS_LIST = Object.freeze([24, 25, 30, 60]);

// CSS keyword curves, as cubic-bezier control points (x1, y1, x2, y2).
export const CSS_EASINGS = Object.freeze({
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
});

// Cubic pictures of the house functions (the handles). The film snippet still calls the real function.
// GSAP names are the core easings (power2 is cubic, power4 is quint, expo / sine / back).
const HOUSE_FN = {
  linear: (p) => p,
  outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  inCubic: (p) => p * p * p,
  outCubic: (p) => 1 - Math.pow(1 - p, 3),
  inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
  outBack: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
  inOutQuint: (p) => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2),
};

export const HOUSE = Object.freeze({
  linear: { bezier: [0, 0, 1, 1], gsap: 'none' },
  outExpo: { bezier: [0.16, 1, 0.3, 1], gsap: 'expo.out' },
  inOutCubic: { bezier: [0.65, 0, 0.35, 1], gsap: 'power2.inOut' },
  inCubic: { bezier: [0.32, 0, 0.67, 0], gsap: 'power2.in' },
  outCubic: { bezier: [0.33, 1, 0.68, 1], gsap: 'power2.out' },
  inOutSine: { bezier: [0.37, 0, 0.63, 1], gsap: 'sine.inOut' },
  outBack: { bezier: [0.34, 1.56, 0.64, 1], gsap: 'back.out' },
  inOutQuint: { bezier: [0.83, 0, 0.17, 1], gsap: 'power4.inOut' },
});

export const PRESETS = Object.freeze([
  { id: 'linear', kind: 'css', label: 'Linear' },
  { id: 'ease', kind: 'css', label: 'Ease' },
  { id: 'ease-in', kind: 'css', label: 'Ease in' },
  { id: 'ease-out', kind: 'css', label: 'Ease out' },
  { id: 'ease-in-out', kind: 'css', label: 'Ease in out' },
  { id: 'outExpo', kind: 'house', label: 'House out expo' },
  { id: 'inOutCubic', kind: 'house', label: 'House in out cubic' },
  { id: 'inCubic', kind: 'house', label: 'House in cubic' },
  { id: 'outCubic', kind: 'house', label: 'House out cubic' },
  { id: 'inOutSine', kind: 'house', label: 'House in out sine' },
  { id: 'outBack', kind: 'house', label: 'House out back' },
  { id: 'inOutQuint', kind: 'house', label: 'House in out quint' },
  { id: 'spring', kind: 'spring', label: 'Spring' },
]);

// Engine formats (studio-engine/brand/brand.json) and the hand-coded placements (studio.mjs PLACEMENTS).
export const ASPECTS = Object.freeze({
  '9:16': { format: 'reel', w: 1080, h: 1920, placement: 'reels' },
  '16:9': { format: 'youtube', w: 1920, h: 1080, placement: 'youtube' },
  '1:1': { format: null, w: 1080, h: 1080, placement: 'square' },
});

const GSAP = [
  ['none', (p) => p],
  ['power1.in', (p) => p * p],
  ['power1.out', (p) => 1 - (1 - p) ** 2],
  ['power1.inOut', (p) => (p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2)],
  ['power2.in', (p) => p ** 3],
  ['power2.out', (p) => 1 - (1 - p) ** 3],
  ['power2.inOut', (p) => (p < 0.5 ? 4 * p ** 3 : 1 - ((-2 * p + 2) ** 3) / 2)],
  ['power3.in', (p) => p ** 4],
  ['power3.out', (p) => 1 - (1 - p) ** 4],
  ['power3.inOut', (p) => (p < 0.5 ? 8 * p ** 4 : 1 - ((-2 * p + 2) ** 4) / 2)],
  ['power4.in', (p) => p ** 5],
  ['power4.out', (p) => 1 - (1 - p) ** 5],
  ['power4.inOut', (p) => (p < 0.5 ? 16 * p ** 5 : 1 - ((-2 * p + 2) ** 5) / 2)],
  ['sine.in', (p) => 1 - Math.cos((p * Math.PI) / 2)],
  ['sine.out', (p) => Math.sin((p * Math.PI) / 2)],
  ['sine.inOut', (p) => -(Math.cos(Math.PI * p) - 1) / 2],
  ['expo.in', (p) => (p <= 0 ? 0 : 2 ** (10 * p - 10))],
  ['expo.out', (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p))],
  ['expo.inOut', (p) => (p === 0 ? 0 : p === 1 ? 1 : p < 0.5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2)],
  ['circ.in', (p) => 1 - Math.sqrt(1 - p * p)],
  ['circ.out', (p) => Math.sqrt(1 - (p - 1) ** 2)],
  ['circ.inOut', (p) => (p < 0.5 ? (1 - Math.sqrt(1 - (2 * p) ** 2)) / 2 : (Math.sqrt(1 - (-2 * p + 2) ** 2) + 1) / 2)],
  ['back.out', (p) => { const s = 1.70158, q = p - 1; return 1 + (s + 1) * q ** 3 + s * q ** 2; }],
];

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function fmt(n) {
  if (!Number.isFinite(n)) throw new Error('fmt needs a finite number');
  const v = Math.round(n * 10000) / 10000;
  const s = v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

export function houseFn(name) {
  const fn = HOUSE_FN[name];
  if (!fn) throw new Error(`unknown house ease ${name}`);
  return fn;
}

function coeffs(x1, y1, x2, y2) {
  for (const [n, v] of [['x1', x1], ['y1', y1], ['x2', x2], ['y2', y2]]) {
    if (!Number.isFinite(v)) throw new Error(`cubicBezier ${n} must be finite`);
  }
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) throw new Error('cubicBezier x values must be in [0,1]');
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return {
    sx: (u) => ((ax * u + bx) * u + cx) * u,
    sy: (u) => ((ay * u + by) * u + cy) * u,
    dx: (u) => (3 * ax * u + 2 * bx) * u + cx,
  };
}

// Parameter u in [0,1] whose bezier x equals the progress x. Monotonic while x1 and x2 stay in [0,1].
export function solveBezierX(x1, x2, x) {
  if (!Number.isFinite(x)) throw new Error('solveBezierX needs a finite x');
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const { sx, dx } = coeffs(x1, 0, x2, 0);
  let u = x;
  for (let i = 0; i < 8; i++) {
    const err = sx(u) - x, d = dx(u);
    if (Math.abs(err) < 1e-7) return clamp(u, 0, 1);
    if (Math.abs(d) < 1e-6) break;
    u = clamp(u - err / d, 0, 1);
  }
  let lo = 0, hi = 1;
  u = clamp(x, 0, 1);
  for (let i = 0; i < 48; i++) {
    const at = sx(u);
    if (Math.abs(at - x) < 1e-7) break;
    if (at < x) lo = u; else hi = u;
    u = (lo + hi) / 2;
  }
  return u;
}

// Progress x (0 at the start, 1 at the end) → eased y. Endpoints are 0 and 1.
export function evaluateBezier(x1, y1, x2, y2, x) {
  if (!Number.isFinite(x)) throw new Error('evaluateBezier needs a finite x');
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return coeffs(x1, y1, x2, y2).sy(solveBezierX(x1, x2, x));
}

export function cubicBezier(x1, y1, x2, y2) {
  coeffs(x1, y1, x2, y2);
  return (x) => evaluateBezier(x1, y1, x2, y2, x);
}

export function cssKeyword(x1, y1, x2, y2) {
  const here = [x1, y1, x2, y2];
  for (const [name, v] of Object.entries(CSS_EASINGS)) {
    if (v.every((n, i) => Math.abs(n - here[i]) < 1e-4)) return name;
  }
  return null;
}

export function bezierText(x1, y1, x2, y2) {
  return `cubic-bezier(${fmt(x1)}, ${fmt(y1)}, ${fmt(x2)}, ${fmt(y2)})`;
}

// Unit step 0 → 1, mass 1, rest at 1, released from 0 with no initial velocity.
export function springValue(t, { dampingRatio = 1, stiffness = 180, mass = 1 } = {}) {
  if (!(dampingRatio > 0) || !(stiffness > 0) || !(mass > 0)) throw new Error('spring needs damping ratio > 0, stiffness > 0 and mass > 0');
  if (!(t > 0)) return 0;
  const w0 = Math.sqrt(stiffness / mass), z = dampingRatio;
  if (z < 1 - 1e-6) {
    const wd = w0 * Math.sqrt(1 - z * z);
    const e = Math.exp(-z * w0 * t);
    return 1 - e * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  if (z <= 1 + 1e-6) {
    const e = Math.exp(-w0 * t);
    return 1 - e * (1 + w0 * t);
  }
  const wd = w0 * Math.sqrt(z * z - 1);
  const e = Math.exp(-z * w0 * t);
  return 1 - e * (Math.cosh(wd * t) + ((z * w0) / wd) * Math.sinh(wd * t));
}

function settleTime(spec) {
  const dt = 0.002;
  let calm = 0;
  for (let t = 0; t <= 60; t += dt) {
    if (Math.abs(springValue(t, spec) - 1) < 0.001) calm += dt;
    else calm = 0;
    if (t > 0.05 && calm >= 0.02) return t;
  }
  return 60;
}

// Even samples of the step, last one forced to the rest value 1. `easing` is CSS linear().
export function sampleSpring({ dampingRatio = 1, stiffness = 180, mass = 1, steps = 16 } = {}) {
  if (!Number.isInteger(steps) || steps < 2 || steps > 64) throw new Error('spring steps must be an integer from 2 to 64');
  const spec = { dampingRatio, stiffness, mass };
  const duration = settleTime(spec);
  const values = [];
  for (let i = 0; i <= steps; i++) {
    const y = springValue((duration * i) / steps, spec);
    values.push(i === 0 ? 0 : i === steps ? 1 : Math.round(y * 10000) / 10000);
  }
  values[0] = 0;
  values[values.length - 1] = 1;
  return { dampingRatio, stiffness, mass, duration, values, easing: `linear(${values.map(fmt).join(', ')})` };
}

export function linearEase(values) {
  if (!Array.isArray(values) || values.length < 2) throw new Error('linearEase needs at least two samples');
  return (p) => {
    if (p <= 0) return values[0];
    if (p >= 1) return values[values.length - 1];
    const x = p * (values.length - 1), i = Math.floor(x), f = x - i;
    return values[i] * (1 - f) + values[i + 1] * f;
  };
}

function samplesOf(fn) {
  const ys = [];
  for (let i = 0; i <= 20; i++) ys.push(fn(i / 20));
  return ys;
}

function nearest(fn, rows) {
  const want = samplesOf(fn);
  let best = rows[0][0], err = Infinity;
  for (const [name, g] of rows) {
    const got = samplesOf(g);
    let e = 0;
    for (let i = 0; i < want.length; i++) e += (want[i] - got[i]) ** 2;
    if (e < err) { err = e; best = name; }
  }
  return { name: best, err };
}

export function nearestHouse(fn) {
  return nearest(fn, Object.keys(HOUSE_FN).map((name) => [name, HOUSE_FN[name]])).name;
}

export function nearestGsap(fn) {
  return nearest(fn, GSAP);
}

function modelFn(model) {
  if (model.spring) return linearEase(model.spring.values);
  if (model.house) return houseFn(model.house);
  return cubicBezier(model.x1, model.y1, model.x2, model.y2);
}

function easingToken(model) {
  if (model.spring) return model.spring.easing;
  return bezierText(model.x1, model.y1, model.x2, model.y2);
}

function secondsOf(model) {
  const s = model.seconds ?? 0.8;
  if (!(s > 0)) throw new Error('duration must be > 0');
  return s;
}

export function cssCode(model) {
  const token = easingToken(model);
  const lines = [];
  const word = !model.spring && cssKeyword(model.x1, model.y1, model.x2, model.y2);
  if (word) lines.push(`/* CSS keyword: ${word} */`);
  if (model.spring) lines.push(`/* Sampled spring, damping ${fmt(model.spring.dampingRatio)}, stiffness ${fmt(model.spring.stiffness)}. Rest is the last stop. Settle about ${fmt(model.spring.duration)}s; the duration below stretches that shape. */`);
  else if (model.house) lines.push(`/* Cubic picture of ease.${model.house}. The film block calls the real function. */`);
  lines.push('.mover {', `  transition: transform ${fmt(secondsOf(model))}s ${token};`, '}');
  return lines.join('\n');
}

export function waapiCode(model) {
  const token = easingToken(model);
  const ms = Math.round(secondsOf(model) * 1000);
  return [
    'el.animate(',
    '  [{ transform: "translateX(0)" }, { transform: "translateX(120px)" }],',
    `  { duration: ${ms}, easing: "${token}", fill: "both" }`,
    ');',
  ].join('\n');
}

export function gsapCode(model) {
  const fn = modelFn(model);
  const picked = model.house ? { name: HOUSE[model.house].gsap, err: 0 } : nearestGsap(fn);
  const token = easingToken(model);
  const close = picked.err < 1e-6;
  const gsapLine = model.house
    ? `// ease.${model.house} maps to the GSAP core ease "${picked.name}". CustomEase is a plugin (not in the core build); it is not needed for this named ease.`
    : close
      ? `// "${picked.name}" matches this curve in GSAP core. CustomEase is a plugin (not in the core build); it is not needed here.`
      : `// Nearest GSAP core ease: "${picked.name}". An exact copy needs CustomEase, which is a plugin and is not in the core build.`;
  return [
    `// ${token}`,
    gsapLine,
    '// GSAP is under the Standard no-charge licence, not MIT.',
    `gsap.to(el, { duration: ${fmt(secondsOf(model))}, x: 120, ease: "${picked.name}" });`,
  ].join('\n');
}

export function filmCode(model) {
  const name = model.house || nearestHouse(modelFn(model));
  if (!HOUSE[name]) throw new Error(`unknown house ease ${name}`);
  const lines = [
    "import { ease, prog, track } from '../lib/motion.js';",
    '// From a film folder (studio/filmN/film.js). ease exports:',
    '// linear, outExpo, inOutCubic, inCubic, outCubic, inOutSine, outBack, inOutQuint.',
  ];
  if (model.spring) lines.push(`// motion.js does not export a spring. Nearest house ease for this sample: ease.${name}.`, `// ${model.spring.easing}`);
  else if (model.house) lines.push(`// ease.${name} is the house function. ${bezierText(model.x1, model.y1, model.x2, model.y2)} is only the cubic picture used in CSS.`);
  else lines.push(`// motion.js has no cubic-bezier helper. Nearest house ease: ease.${name}.`, `// ${bezierText(model.x1, model.y1, model.x2, model.y2)}`);
  lines.push(`const p = prog(t, t0, t1, ease.${name});`, `const v = track([[t0, 0], [t1, 1, ease.${name}]], t);`);
  return lines.join('\n');
}

export function smpte(frame, fps) {
  if (!FPS_LIST.includes(fps)) throw new Error('fps must be 24, 25, 30 or 60');
  if (!Number.isInteger(frame) || frame < 0) throw new Error('frame must be a non-negative integer');
  const ff = frame % fps;
  const total = Math.floor(frame / fps);
  const ss = total % 60, mm = Math.floor(total / 60) % 60, hh = Math.floor(total / 3600);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

export function frameCount(duration, fps) {
  if (!(duration > 0) || !FPS_LIST.includes(fps)) throw new Error('bad duration or fps');
  return Math.round(duration * fps);
}

// Frame F is time F/fps. The last frame index is duration × fps (the end).
export function frameState(frame, fps, duration, easeFn) {
  const frames = frameCount(duration, fps);
  if (!Number.isInteger(frame) || frame < 0 || frame > frames) throw new Error('frame outside the film');
  const seconds = frame / fps;
  const linear = duration === 0 ? 0 : clamp(seconds / duration, 0, 1);
  return { frame, frames, fps, seconds, smpte: smpte(frame, fps), linear, eased: easeFn(linear) };
}

export function addMarker(markers, frame) {
  const f = Math.round(frame);
  if (!Number.isInteger(f) || f < 0) throw new Error('marker frame must be a non-negative integer');
  return markers.includes(f) ? markers.slice() : [...markers, f].sort((a, b) => a - b);
}

export function removeMarker(markers, frame) {
  const f = Math.round(frame);
  return markers.filter((m) => m !== f);
}

export function secondMarks(duration) {
  if (!(duration > 0)) throw new Error('duration must be > 0');
  const step = duration <= 16 ? 1 : duration <= 60 ? 5 : 10;
  const marks = [];
  for (let s = 0; s <= duration + 1e-9; s += step) marks.push(Math.round(Math.min(s, duration) * 1000) / 1000);
  if (marks[marks.length - 1] !== Math.round(duration * 1000) / 1000) marks.push(Math.round(duration * 1000) / 1000);
  return marks;
}

function num(n) {
  return String(Math.round(n * 1000) / 1000);
}

function filmName(film) {
  if (typeof film !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(film)) {
    throw new Error('film folder must be a name: letters, digits, _ and -');
  }
  return film;
}

// Commands the repo really runs, as two pipelines. Native engine formats are youtube (16:9) and reel (9:16).
// 1:1 has no engine format: the engine block is an ffmpeg reframe of a delivered master, with no run.mjs line.
// Build flags: --profile --range --only --workers (and make.mjs also accepts --shot).
// Engine flags: --format --fps --stage --scene. new: --placement --duration --fps.
// Returns { engine, hand }. engine is the Studio Engine film (spec.json). hand is the hand-coded film (film.js).
export function exportCommands({ film, aspect, fps, duration, mode }) {
  const name = filmName(film);
  const shape = ASPECTS[aspect];
  if (!shape) throw new Error('aspect must be 9:16, 1:1 or 16:9');
  if (!FPS_LIST.includes(fps)) throw new Error('fps must be 24, 25, 30 or 60');
  if (!(duration > 0) || duration > 3600) throw new Error('duration must be between 0 and 3600 seconds');
  if (mode !== 'preview' && mode !== 'final') throw new Error('mode must be preview or final');
  const dur = num(duration);
  const profile = mode === 'preview' ? 'draft' : 'final';
  const range = mode === 'preview' ? ` --range=0:${dur}` : '';
  const fpsNote = fps === 60 ? ' 60 fps only when the owner asks (STUDIO.md).' : '';
  const hand = [
    '# Hand-coded film (film.js). The frame size is set when the film is created, not by build.',
    `node studio/studio.mjs new ${name} --placement=${shape.placement} --duration=${dur} --fps=${fps}`,
    `node studio/studio.mjs build ${name} --profile=${profile}${range}`,
  ].join('\n');

  if (!shape.format) {
    const vf = 'scale=1080:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1080,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=0x16140F,setsar=1';
    const engine = [
      '# Studio Engine film (spec.json). 1:1 has no native format, so there is no run.mjs line.',
      '# youtube is 1920×1080 and reel is 1080×1920.',
      '# ffmpeg reframe of the delivered master. This is not a studio render.',
      '# Master: studio/out/studio-engine/b-' + name + '-youtube/takeNN/*-share-*.mp4 (or b-' + name + '-reel).',
      '# scale covers the square, crop keeps the centre, pad holds the exact 1080×1080 canvas.',
      `ffmpeg -v error -y -i master.mp4 -vf "${vf}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a copy ${name}-square.mp4`,
    ].join('\n');
    return { engine, hand };
  }

  const built = `studio-engine/b-${name}-${shape.format}`;
  const engine = [
    `# Studio Engine film (spec.json). Run from the repo root. Native format: ${shape.format}, ${shape.w}×${shape.h}.`,
    `# Engine flags are --format --fps --stage. Draft preview is 15 fps at half scale (lib/build-options.mjs).${fpsNote}`,
    `# --fps is the spec rate. Final uses it. Workers default from memory (lib/platform.mjs); --workers is 1..16.`,
    `node studio/studio-engine/run.mjs ${name} --format=${shape.format} --fps=${fps} --stage=${mode}`,
    '# The build that command spawns. Final rejects a range. --only and --shot exist and are unused here.',
    `node studio/studio.mjs build ${built} --profile=${profile}${range}`,
  ].join('\n');
  return { engine, hand };
}
