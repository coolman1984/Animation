// Aspect-ratio intelligence: recompose, don't crop. Pure functions (Node + browser).
// A composition names its slots (product, title, logo, CTA...) and gives each aspect class its own
// geometry; films then place elements by slot. Subjects are framed by intent (where in the frame and
// how big), and the framing reports when the source cannot honour that intent without exposing edges.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Aspect classes ordered wide → tall. Thresholds sit between common delivery ratios.
export const ASPECTS = [
  { name: 'wide', min: 1.55 },      // 16:9, 2:1, 21:9
  { name: 'landscape', min: 1.15 }, // 4:3, 3:2
  { name: 'square', min: 0.9 },     // 1:1
  { name: 'portrait', min: 0.7 },   // 4:5, 3:4
  { name: 'tall', min: 0 },         // 9:16, 9:19.5
];
export function aspectClass(w, h) {
  if (!(w > 0 && h > 0)) throw new Error('aspectClass needs positive size');
  const r = w / h;
  return ASPECTS.find(a => r >= a.min).name;
}
const ORDER = ASPECTS.map(a => a.name);

// Choose a value by aspect: exact ratio keys ('9:16') win, then the class, then the nearest class.
export function pick(options, w, h) {
  if (!options || typeof options !== 'object') throw new Error('pick needs an options object');
  const exact = Object.keys(options).find(k => /^\d+(\.\d+)?:\d+(\.\d+)?$/.test(k) && Math.abs(k.split(':').reduce((a, b) => a / b) - w / h) < 0.01);
  if (exact) return options[exact];
  const cls = aspectClass(w, h);
  if (cls in options) return options[cls];
  const i = ORDER.indexOf(cls);
  for (let d = 1; d < ORDER.length; d++) for (const j of [i - d, i + d]) if (ORDER[j] in options) return options[ORDER[j]];
  if ('default' in options) return options.default;
  throw new Error(`no layout option for ${cls}`);
}

// Platform safe areas as [x0, y0, x1, y1] pixels. These are working guidance values, not official
// platform guarantees; verify current placements before a paid campaign (see platform-delivery skill).
export const SAFE_PRESETS = Object.freeze({
  none: { top: 0, bottom: 0, left: 0, right: 0 },
  feed: { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
  reels: { top: 0.14, bottom: 0.35, left: 0.06, right: 0.06 },
  shorts: { top: 0.12, bottom: 0.25, left: 0.06, right: 0.12 },
  tiktok: { top: 0.1, bottom: 0.3, left: 0.05, right: 0.15 },
  titleSafe: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 },
  actionSafe: { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
});
export function safeArea(w, h, preset = 'feed') {
  const p = typeof preset === 'string' ? SAFE_PRESETS[preset] : preset;
  if (!p) throw new Error(`unknown safe preset ${preset}`);
  return [Math.round(w * p.left), Math.round(h * p.top), Math.round(w * (1 - p.right)), Math.round(h * (1 - p.bottom))];
}

// Grid of cells inside a rectangle; returns { cell(col,row,colSpan,rowSpan) → rect, cols, rows }.
export function grid([x0, y0, x1, y1], { cols = 12, rows = 12, gutter = 0 } = {}) {
  const cw = (x1 - x0 - gutter * (cols - 1)) / cols, ch = (y1 - y0 - gutter * (rows - 1)) / rows;
  return { cols, rows, cell: (c, r, cs = 1, rs = 1) => ({ x: x0 + c * (cw + gutter), y: y0 + r * (ch + gutter), w: cs * cw + (cs - 1) * gutter, h: rs * ch + (rs - 1) * gutter }) };
}

// Resolve a composition: slots → per-aspect rects in FRACTIONS of the safe area ([x, y, w, h]),
// optional scene overrides keyed the same way. Returns pixel rects plus the class and safe area.
export function compose(slots, w, h, { safe = 'feed', overrides = {} } = {}) {
  const area = Array.isArray(safe) ? safe : safeArea(w, h, safe);
  const [sx0, sy0, sx1, sy1] = area, sw = sx1 - sx0, sh = sy1 - sy0;
  const rects = {};
  for (const [name, spec] of Object.entries(slots)) {
    const f = pick({ ...spec, ...(overrides[name] || {}) }, w, h);
    if (!Array.isArray(f) || f.length !== 4 || !f.every(Number.isFinite)) throw new Error(`slot ${name} needs [x, y, w, h] fractions`);
    rects[name] = { x: sx0 + f[0] * sw, y: sy0 + f[1] * sh, w: f[2] * sw, h: f[3] * sh };
  }
  return { aspect: aspectClass(w, h), safe: area, rects };
}

// Contain/cover a content aspect into a rect.
export function fitRect(contentW, contentH, rect, mode = 'contain', [ax, ay] = [0.5, 0.5]) {
  const s = mode === 'cover' ? Math.max(rect.w / contentW, rect.h / contentH) : Math.min(rect.w / contentW, rect.h / contentH);
  const w = contentW * s, h = contentH * s;
  return { x: rect.x + (rect.w - w) * ax, y: rect.y + (rect.h - h) * ay, w, h, scale: s };
}

// Frame a subject inside a source image for a viewport: put the subject's centre at `anchor`
// (viewport fractions) with its height = `fill` × viewport height, while the image still covers
// the viewport. Returns the image placement and how far the intent had to be compromised.
// subject: {x,y,w,h} in source px; source: {w,h}; viewport: {w,h}; maxScale guards against upscaling.
export function frameSubject({ subject, source, viewport, anchor = [0.5, 0.5], fill = 0.6, maxScale = 1.5 }) {
  for (const v of [subject.x, subject.y, subject.w, subject.h, source.w, source.h, viewport.w, viewport.h, fill]) if (!Number.isFinite(v)) throw new Error('frameSubject needs finite geometry');
  const cover = Math.max(viewport.w / source.w, viewport.h / source.h);
  const wanted = (fill * viewport.h) / subject.h;
  const scale = clamp(wanted, cover, Math.max(cover, maxScale));
  const cx = subject.x + subject.w / 2, cy = subject.y + subject.h / 2;
  let x = anchor[0] * viewport.w - cx * scale, y = anchor[1] * viewport.h - cy * scale;
  x = clamp(x, viewport.w - source.w * scale, 0); y = clamp(y, viewport.h - source.h * scale, 0);
  const actual = [(x + cx * scale) / viewport.w, (y + cy * scale) / viewport.h];
  const shift = Math.hypot(actual[0] - anchor[0], actual[1] - anchor[1]);
  return { x, y, scale, anchor: actual, fill: (subject.h * scale) / viewport.h,
    compromised: shift > 0.03 || Math.abs(scale - wanted) / wanted > 0.08, upscaled: scale > 1,
    note: scale > maxScale - 1e-9 && wanted > maxScale ? 'subject wants more magnification than the source supports' : undefined };
}

// Thirds lines/points for composition checks and guides.
export const thirds = (w, h) => ({ x: [w / 3, (2 * w) / 3], y: [h / 3, (2 * h) / 3], points: [[w / 3, h / 3], [(2 * w) / 3, h / 3], [w / 3, (2 * h) / 3], [(2 * w) / 3, (2 * h) / 3]] });

// Rects that overlap (e.g. title over product). Returns [nameA, nameB, overlapArea].
export function overlaps(rects, { ignore = [] } = {}) {
  const names = Object.keys(rects).filter(n => !ignore.includes(n)), out = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = rects[names[i]], b = rects[names[j]];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0 && oy > 0) out.push([names[i], names[j], ox * oy]);
  }
  return out;
}
