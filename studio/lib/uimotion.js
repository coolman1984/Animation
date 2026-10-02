// Product-UI motion kit — the grammar of a modern SaaS/app promo (learned from the TypingMind reference, see
// ../references is private; the principles are recorded in TECHNIQUES.md and CHANGELOG.md). Everything is a pure
// function of t (seekable in any order), seeded, and returns plain numbers/strings for the film to apply.
//   planeTransform / tiltSettle   a flat UI card living in 3-D: perspective + rotateX/Y/Z that settles with a spring
//   typeOn / caretVisible         typewriter with a caret (Arabic never splits inside a word)
//   stackLines                    headline lines that rise out of a mask one after another; older lines dim
//   orbitPoint / scatterOut       provider-logo "satellites" that float around a window, then scatter and blur away
//   litCells                      which windows of a UI wall are lit at time t (spotlights that travel)
//   pulseRing                     one thin ring expanding from a logo
// Whole-scene changes use the existing transitions: zoomContinuation (the "whoosh" into the next scene) and cameraPass.
import { clamp, lerp, ramp } from './motion.js';
import { springStep, hash } from './kinetics.js';

const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const outExpo = p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const num = (v, name) => { if (!Number.isFinite(v)) throw new Error(`${name} must be a finite number`); return v; };

// ---------- 3-D plane ----------
const PLANE0 = Object.freeze({ rx: 0, ry: 0, rz: 0, x: 0, y: 0, z: 0, scale: 1 });
// CSS transform for a flat card tilted in perspective. Angles in degrees, x/y/z in px. Put `perspective` on the card itself
// (this string already starts with perspective()) so every card has its own vanishing point; use transform-origin 50% 50%.
export function planeTransform({ rx = 0, ry = 0, rz = 0, x = 0, y = 0, z = 0, scale = 1, perspective = 1400 } = {}) {
  for (const [k, v] of Object.entries({ rx, ry, rz, x, y, z, scale, perspective })) num(v, k);
  if (perspective <= 0) throw new Error('perspective must be positive');
  return `perspective(${perspective}px) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
}
// A card that arrives tilted/offset and settles flat (or into a resting tilt) with a spring. Returns plane params at t.
export function tiltSettle(t, { start = 0, duration = 0.7, bounce = 0, from = {}, to = {} } = {}) {
  const a = { ...PLANE0, ...from }, b = { ...PLANE0, ...to };
  const p = t <= start ? 0 : springStep(t - start, { duration, bounce }).value;
  const out = {}; for (const k of Object.keys(PLANE0)) out[k] = lerp(a[k], b[k], p);
  return out;
}
// Slow resting drift so a "settled" card never looks pasted on (degrees / px, deterministic).
export function planeDrift(t, { rx = 0.6, ry = 0.9, rz = 0.2, period = 7, phase = 0 } = {}) {
  const w = (2 * Math.PI) / period;
  return { rx: rx * Math.sin(w * t + phase), ry: ry * Math.sin(w * t * 0.83 + phase + 1.1), rz: rz * Math.sin(w * t * 0.61 + phase + 2.3) };
}

// ---------- typewriter ----------
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const graphemes = s => (SEG ? [...SEG.segment(s)].map(x => x.segment) : [...s]);
// Visible prefix of `text` at time t. Latin types by grapheme; Arabic types by WORD (letters join, so a half-typed word would reshape).
export function typeOn(text, t, { start = 0, cps = 16, wordsPerSecond = 3.2 } = {}) {
  if (typeof text !== 'string') throw new Error('typeOn needs text');
  num(t, 't'); if (!(cps > 0) || !(wordsPerSecond > 0)) throw new Error('typing speed must be positive');
  const tau = Math.max(0, t - start);
  if (ARABIC.test(text)) {
    const words = text.split(/\s+/u).filter(Boolean), n = Math.min(words.length, Math.floor(tau * wordsPerSecond));
    return { text: words.slice(0, n).join(' '), count: n, total: words.length, done: n >= words.length };
  }
  const units = graphemes(text), n = Math.min(units.length, Math.floor(tau * cps));
  return { text: units.slice(0, n).join(''), count: n, total: units.length, done: n >= units.length };
}
// Caret: solid while typing (and for `hold` seconds after the last key), then blinks at `rate` Hz.
export function caretVisible(t, { start = 0, end = start, hold = 0.45, rate = 1.1 } = {}) {
  if (t < start) return false;
  if (t <= end + hold) return true;
  return Math.floor((t - end - hold) * rate * 2) % 2 === 0;
}
// Time the typing of `text` finishes (so a send-button press or a transition can be cued from it).
export const typeEnd = (text, { start = 0, cps = 16, wordsPerSecond = 3.2 } = {}) => start + (ARABIC.test(text) ? text.split(/\s+/u).filter(Boolean).length / wordsPerSecond : graphemes(text).length / cps);

// ---------- headline stack ----------
// n lines that rise out of a mask one after another (`each` s apart). When the NEXT line starts, the older ones dim to `dimTo`
// (the reader's eye follows the newest line). The last line stays at full strength. Returns per-line { opacity, y, blur, clip, dim }.
export function stackLines(t, n, { start = 0, each = 0.5, dur = 0.7, dimTo = 0.5, dimDur = 0.4, rise = 28, blur = 10 } = {}) {
  if (!Number.isInteger(n) || n < 1) throw new Error('stackLines needs n >= 1');
  return Array.from({ length: n }, (_, i) => {
    const t0 = start + i * each, p = outExpo(ramp(t, t0, t0 + dur));
    const dim = i < n - 1 ? 1 - (1 - dimTo) * smooth(t0 + each, t0 + each + dimDur, t) : 1;
    return { opacity: clamp(p * 1.6) * dim, y: (1 - p) * rise, blur: (1 - p) * blur, clip: p, dim };
  });
}

// ---------- satellites ----------
// A point on a tilted elliptical orbit. depth −1 (far side) … 1 (near side) drives scale/opacity/blur; period in seconds.
export function orbitPoint(t, { cx = 0, cy = 0, rx = 300, ry = 120, period = 8, phase = 0, tilt = 0 } = {}) {
  const a = (2 * Math.PI * t) / period + phase, x0 = Math.cos(a) * rx, y0 = Math.sin(a) * ry, c = Math.cos(tilt), s = Math.sin(tilt);
  const depth = Math.sin(a);
  return { x: cx + x0 * c - y0 * s, y: cy + x0 * s + y0 * c, depth, scale: 1 + 0.18 * depth, opacity: 0.72 + 0.28 * (depth * 0.5 + 0.5), blur: 1.6 * (1 - (depth * 0.5 + 0.5)) };
}
// Scatter away from the centre along `angle` (deg) with growing blur and fading out; identity before `start`.
export function scatterOut(t, { start = 0, dur = 0.5, angle = 0, distance = 220, blur = 14, scaleTo = 1.35 } = {}) {
  const p = smooth(start, start + dur, t), a = (angle * Math.PI) / 180, e = p * p;
  return { dx: Math.cos(a) * distance * e, dy: Math.sin(a) * distance * e, scale: lerp(1, scaleTo, p), blur: blur * p, opacity: 1 - p };
}

// ---------- UI wall ----------
// Brightness (0..1) of each of n windows at time t: `count` windows are lit per epoch of `period` s, chosen by seed,
// cross-fading between epochs over `fade` (fraction of the period). Deterministic and order-independent.
export function litCells(t, n, { count = 3, period = 0.9, fade = 0.45, seed = 1 } = {}) {
  if (!Number.isInteger(n) || n < 1) throw new Error('litCells needs n >= 1');
  const k = Math.min(count, n), epoch = Math.floor(t / period), f = (t / period) - epoch;
  const pick = e => { const s = new Set(); for (let i = 0; s.size < k; i++) s.add(Math.floor(hash(seed, e, i) * n)); return s; };
  const A = pick(epoch), B = pick(epoch + 1), mixB = smooth(1 - fade, 1, f);
  return Array.from({ length: n }, (_, i) => (A.has(i) ? 1 - mixB : 0) + (B.has(i) ? mixB : 0)).map(v => clamp(v));
}
// Grid layout for a wall of windows laid out on a plane (before the plane itself is tilted): returns cell rects.
export function wallCells({ cols = 6, rows = 4, w = 420, h = 260, gap = 36, seed = 3, jitter = 0.08 } = {}) {
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const j = k => (hash(seed, r, c, k) - 0.5) * 2 * jitter;
    cells.push({ id: r * cols + c, col: c, row: r, x: c * (w + gap) + j(1) * w, y: r * (h + gap) + j(2) * h, w: w * (1 + j(3)), h: h * (1 + j(4)) });
  }
  return cells;
}

// ---------- ring ----------
// One thin ring expanding from a point: radius eases out, opacity peaks early then fades, the stroke thins as it grows.
export function pulseRing(t, { start = 0, dur = 1.2, r0 = 24, r1 = 280, width = 3 } = {}) {
  const p = ramp(t, start, start + dur);
  if (p <= 0 || p >= 1) return { r: p <= 0 ? r0 : r1, opacity: 0, width };
  const e = outExpo(p);
  return { r: lerp(r0, r1, e), opacity: Math.sin(Math.PI * Math.pow(p, 0.55)) * (1 - p) ** 0.5, width: width * (1 - 0.7 * p) };
}
