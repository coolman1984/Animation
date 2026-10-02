// Visual primitives for composer pages: masks, reveals, light, gradients, glow, line drawing.
// Pure functions of t that return CSS strings, plus thin DOM setters. No CSS animations/transitions.
// These are ingredients, not a look: a film should use few of them, each for a reason.
import { clamp, lerp, el } from './motion.js';
import { fbm } from './kinetics.js';

const pct = v => `${(v * 100).toFixed(3)}%`;

// ---------- clip shapes (CSS clip-path strings) ----------
export const clipCircle = (cx, cy, r) => `circle(${r.toFixed(2)}px at ${cx.toFixed(2)}px ${cy.toFixed(2)}px)`;
export const clipEllipse = (cx, cy, rx, ry) => `ellipse(${rx.toFixed(2)}px ${ry.toFixed(2)}px at ${cx.toFixed(2)}px ${cy.toFixed(2)}px)`;
export const clipInset = (top, right, bottom, left, round = 0) =>
  `inset(${[top, right, bottom, left].map(v => `${Math.max(0, v).toFixed(2)}px`).join(' ')}${round ? ` round ${round}px` : ''})`;
export const clipPolygon = points => `polygon(${points.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(', ')})`;
export const clipPathData = d => `path('${d}')`;

// Radius that reaches the farthest corner of a w×h frame from (cx, cy): a reveal that truly completes.
export const coverRadius = (cx, cy, w, h) => Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));

// Soft directional mask: angle in degrees (CSS gradient convention, 90 = left→right), progress p in [0,1].
// The edge travels the whole frame including its softness, so p=0 hides fully and p=1 shows fully.
export function softWipeMask(p, { angle = 90, softness = 0.12 } = {}) {
  const s = clamp(softness, 0.001, 1), e = lerp(-s, 1, clamp(p));
  return `linear-gradient(${angle}deg, #000 ${pct(e)}, transparent ${pct(e + s)})`;
}
// Radial soft reveal from a point (fractions of the frame), radius as a fraction of the diagonal.
export function softRadialMask(p, { cx = 0.5, cy = 0.5, softness = 0.08 } = {}) {
  const r = lerp(0, 1.5, clamp(p));
  return `radial-gradient(circle at ${pct(cx)} ${pct(cy)}, #000 ${pct(Math.max(0, r - softness))}, transparent ${pct(r)})`;
}

// Set a mask on an element (with the -webkit- alias Chromium still honours).
export function setMask(node, image, { size = '100% 100%' } = {}) {
  node.style.maskImage = node.style.webkitMaskImage = image || 'none';
  node.style.maskSize = node.style.webkitMaskSize = size;
  node.style.maskRepeat = node.style.webkitMaskRepeat = 'no-repeat';
}

// ---------- light ----------
// A band of light crossing a surface. Returns a background-image; apply to an overlay with
// mix-blend-mode: screen (or soft-light) and mask it by the subject's alpha so light stays on the object.
export function lightSweep(t, { start, end, angle = 105, width = 0.18, color = 'rgba(255,248,230,0.55)' } = {}) {
  const p = clamp((t - start) / (end - start));
  if (p <= 0 || p >= 1) return 'none';
  const c = lerp(-width, 1 + width, p);
  return `linear-gradient(${angle}deg, transparent ${pct(c - width)}, ${color} ${pct(c)}, transparent ${pct(c + width)})`;
}

// Gradient whose stops drift organically (seeded noise): living backgrounds without a looping cycle.
export function livingGradient(t, { stops, angle = 160, drift = 0.06, speed = 0.08, seed = 3, kind = 'linear' } = {}) {
  if (!Array.isArray(stops) || stops.length < 2) throw new Error('livingGradient needs two or more colour stops');
  const n = stops.length;
  const parts = stops.map((c, i) => {
    const base = i / (n - 1), off = i === 0 || i === n - 1 ? 0 : drift * fbm(t * speed, i * 1.7, { octaves: 2, seed });
    return `${c} ${pct(clamp(base + off))}`;
  });
  const a = angle + 8 * fbm(t * speed * 0.5, 9.1, { octaves: 1, seed: seed + 5 });
  return kind === 'radial' ? `radial-gradient(ellipse at 50% 40%, ${parts.join(', ')})` : `linear-gradient(${a.toFixed(2)}deg, ${parts.join(', ')})`;
}

// Controlled glow: bounded drop-shadow stack (no runaway bloom). intensity 0..1.
export function glowFilter({ radius = 18, color = 'rgba(255,230,180,0.6)', intensity = 0.5 } = {}) {
  const k = clamp(intensity);
  if (k <= 0) return '';
  return `drop-shadow(0 0 ${(radius * 0.35 * k).toFixed(2)}px ${color}) drop-shadow(0 0 ${(radius * k).toFixed(2)}px ${color})`;
}

// ---------- line drawing ----------
// Draw an SVG stroke from 0..1 (reads the path length once per element; deterministic).
export function lineDraw(pathEl, p, { from = 0 } = {}) {
  if (pathEl.__len === undefined) pathEl.__len = pathEl.getTotalLength();
  const L = pathEl.__len, a = clamp(from), b = clamp(p);
  pathEl.style.strokeDasharray = `${L} ${L}`;
  pathEl.style.strokeDashoffset = String(L * (1 - b + a));
  pathEl.style.opacity = b > a ? '1' : '0';
}

// ---------- texture / atmosphere ----------
// Edge-darkening vignette layer (strength 0..1). Static by design: it frames, it does not move.
export function vignette(parent, { strength = 0.35, color = '0,0,0', z = 50 } = {}) {
  return el('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: String(z),
    background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(${color},0) 55%, rgba(${color},${clamp(strength)}) 100%)` } }, parent);
}
