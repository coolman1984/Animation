// Studio Engine — core helpers (browser). Pure functions of t; no state outside the nodes they build.
// Lifted from films 6–11 and generalised: units, 3D rig, kinetic type (gate-safe), extruded type, icons.
import { clamp, lerp, ramp, ease, el, textLine } from '../../lib/motion.js';
import { springStep, hash } from '../../lib/kinetics.js';
export { clamp, lerp, ramp, ease, el, hash };

export const px = (v) => `${(+v).toFixed(2)}px`;
export const oE = ease.outExpo, ioC = ease.inOutCubic, oC = ease.outCubic, ioQ = ease.inOutQuint;
export const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const spr = (t, start, duration = 0.5, bounce = 0.2) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
export const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
export const T3 = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`;
export const setBlur = (n, b) => { n.style.filter = b > 0.2 ? `blur(${b.toFixed(2)}px)` : 'none'; };
export const isArabic = (s) => /[؀-ۿ]/.test(s);
export const canvas = (parent, W, H, z = 10) => el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: String(z), pointerEvents: 'none' } }, parent).getContext('2d');

// a 3D stage: perspective on a full-frame shell, a zero-size camera node at the centre (children are centre-relative)
export function rig(root, W, H, persp = 1500) {
  const p = div(root, { width: px(W), height: px(H), perspective: `${persp}px`, perspectiveOrigin: '50% 50%' });
  const cam = div(p, { left: px(W / 2), top: px(H / 2), width: '0', height: '0', transformStyle: 'preserve-3d' });
  return { p, cam };
}
export const obj = (parent, w, h, style = {}) => div(parent, { left: px(-w / 2), top: px(-h / 2), width: px(w), height: px(h), transformStyle: 'preserve-3d', ...style });

// text line → { line, words }. Width-fits the font to the box (never leaves the safe area), dir from the script.
export function words(parent, text, ctx, { size, weight = 800, color, x = 0.5, y = 0.5, cx, cy, width, font, dir, track = 0, lh = 1.2, accent = {}, z = 8, shadow = '' } = {}) {
  const { W, H, safe, brand } = ctx;
  const d = dir || (isArabic(text) ? 'rtl' : 'ltr');
  const X = cx ?? x * W, Y = cy ?? y * H, room = Math.min(safe[2] - safe[0], 2 * Math.min(X - safe[0], safe[2] - X)) * 0.93, maxW = Math.min(width ?? room, room); // 7% for camera shake + shell scale
  const chars = [...text].length, est = chars * size * (d === 'rtl' ? 0.5 : 0.56);
  const fs = Math.max(18, Math.min(size, size * (maxW / Math.max(1, est))));
  const L = textLine(parent, text, { left: px(X - maxW / 2), top: px(Y - (fs * lh) / 2), width: px(maxW), justifyContent: 'center', fontFamily: `'${font || brand.fonts.display}'`, fontSize: px(fs), fontWeight: String(weight), color: color || brand.colors.text, lineHeight: String(lh), letterSpacing: `${track}em`, direction: d, zIndex: String(z), textShadow: shadow });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; if (d === 'ltr' && i < L.words.length - 1) w.style.marginInlineEnd = '0.36em'; });
  // measure the real rendered width (fonts are loaded before init) and shrink to fit — estimates miss heavy Latin weights
  L.line.style.width = 'max-content'; const nat = L.line.offsetWidth; L.line.style.width = px(maxW);
  let f2 = fs; if (nat > maxW * 0.97) { f2 = fs * (maxW * 0.97) / nat; L.line.style.fontSize = px(f2); L.line.style.top = px(Y - (f2 * lh) / 2); }
  L.fs = f2; L.box = { x: X, y: Y, w: maxW, h: f2 * lh };
  return L;
}

// Kinetic entries. Gate-safe: a word counts as "on screen" (opacity > 0.5) only once it is within 8 % of its final scale,
// so the big blurred approach never trips the safe-area gate; exits drop below 0.5 before they move.
export function kinetic(L, t, tIn, tOut = 1e9, { style = 'slam', stagger = 0.07, s0 = 2.2, dur = 0.34, blur = 22, outDur = 0.22 } = {}) {
  const vis = t >= tIn - 0.005 && t <= tOut + outDur + L.words.length * 0.03 + 0.02;
  L.line.style.display = vis ? 'flex' : 'none';
  if (!vis) return;
  L.words.forEach((w, i) => {
    const a = tIn + i * stagger, e = spr(t, a, dur, 0.28), out = ioC(ramp(t, tOut + i * 0.03, tOut + i * 0.03 + outDur));
    const k = clamp(e, 0, 1.12);
    let sc = 1, ty = 0, op;
    if (style === 'slam') { sc = lerp(s0, 1, k); const near = clamp(1 - Math.abs(sc - 1) / (0.08 * Math.max(1, s0))); op = Math.min(0.42, clamp((t - a) / dur * 3)) + 0.58 * near * near; }
    else if (style === 'rise') { ty = (1 - k) * 0.6 * L.fs; op = clamp((t - a) / (dur * 0.6)); }
    else if (style === 'pop') { sc = lerp(0.4, 1, k); op = clamp((t - a) / (dur * 0.5)); }
    else op = clamp((t - a) / 0.05);                                      // 'cut'
    // living type: once landed, a word keeps breathing (tiny scale + float), so a held line is never a still image
    const live = sm(a + dur, a + dur + 0.4, t) * (1 - out); sc *= 1 + 0.014 * live * Math.sin((t - a) * 2.3 + i * 0.8); ty += live * Math.sin((t - a) * 1.7 + i * 1.3) * 0.022 * L.fs;
    op *= 1 - clamp(out * 4);                                         // below the gate's 0.5 before the exit moves
    w.style.opacity = clamp(op).toFixed(3);
    w.style.transform = `translateY(${(ty - out * 40).toFixed(1)}px) scale(${(sc * (1 + 0.04 * out)).toFixed(4)})`;
    setBlur(w, style === 'slam' ? (1 - clamp(e)) * blur + out * 12 : style === 'rise' ? (1 - clamp(e)) * 6 + out * 8 : out * 8);
  });
}

// Extruded 3D type: stacked copies behind a gradient face; glow sits on the layer behind as a text-shadow (no filters in 3D).
export function extrude(parent, text, { size, font = 'Alexandria', weight = 900, layers = 20, step = 5, side = '#1347C8', sideDark = '#061A55', face = ['#FFFFFF', '#CFEFFF'], glow = 'rgba(79,216,255,0.65)', dir } = {}) {
  layers = Math.min(layers, 30);
  const g = obj(parent, 4, 4, {});
  const d = dir || (isArabic(text) ? 'rtl' : 'ltr');
  const hx = (c, k) => parseInt(c.slice(1 + 2 * k, 3 + 2 * k), 16);
  for (let i = layers; i >= 0; i--) {
    const s = div(g, { transform: `translate(-50%,-50%) translate3d(0,0,${(-i * step).toFixed(1)}px)`, fontFamily: `'${font}'`, fontSize: px(size), fontWeight: String(weight), lineHeight: '1', whiteSpace: 'nowrap', direction: d });
    s.textContent = text;
    if (i === 0) { s.style.backgroundImage = `linear-gradient(180deg, ${face[0]} 10%, ${face[1]} 100%)`; s.style.webkitBackgroundClip = 'text'; s.style.backgroundClip = 'text'; s.style.color = 'transparent'; }
    else { if (i === 1 && glow) s.style.textShadow = `0 0 22px ${glow}, 0 0 44px ${glow}`; const m = i / layers; s.style.color = `rgb(${[0, 1, 2].map((k) => Math.round(lerp(hx(side, k), hx(sideDark, k), m))).join(',')})`; }
  }
  return g;
}

export function icon(parent, d, size, color, sw = 4) {
  const sv = el('svg', { viewBox: '0 0 100 100', style: { position: 'absolute', left: '0', top: '0', width: px(size), height: px(size), overflow: 'visible' } }, parent);
  el('path', { d, fill: 'none', stroke: color, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
  return sv;
}
export const IC = {
  doc: 'M25 12 H60 L78 30 V88 H25 Z M60 12 V30 H78 M35 48 H68 M35 60 H68 M35 72 H55', mag: 'M42 46 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 M54 58 L74 78',
  stack: 'M30 18 H66 V70 H30 Z M38 26 H74 V78 H38 Z M46 34 H82 V86 H46 Z', check: 'M30 52 L45 67 L72 36', pen: 'M22 82 L28 62 L68 22 L80 34 L40 74 Z M60 30 L72 42',
  grid: 'M15 20 H85 V80 H15 Z M15 40 H85 M15 60 H85 M42 20 V80 M63 20 V80', bars: 'M22 82 V58 M42 82 V40 M62 82 V24 M82 82 V46',
  clip: 'M25 20 H75 V88 H25 Z M38 12 H62 V28 H38 Z M35 48 H65 M35 60 H65 M35 72 H55', radar: 'M50 12 L83 31 V69 L50 88 L17 69 V31 Z M50 30 L68 41 V59 L50 70 L32 59 V41 Z',
  clock: 'M50 50 m-32 0 a32 32 0 1 0 64 0 a32 32 0 1 0 -64 0 M50 28 V50 L66 58',
  gear: 'M50 36 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M50 10 V22 M50 78 V90 M10 50 H22 M78 50 H90 M22 22 L31 31 M69 69 L78 78 M78 22 L69 31 M31 69 L22 78 M50 66 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0',
  spark: 'M50 12 L57 43 L88 50 L57 57 L50 88 L43 57 L12 50 L43 43 Z', board: 'M14 18 H86 V58 H14 Z M50 58 V72 M34 88 L50 72 L66 88',
  chat: 'M14 20 H86 V62 H48 L30 82 V62 H14 Z M30 38 H70 M30 48 H56',
  people: 'M35 36 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M65 36 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M10 84 C10 60 60 60 60 84 M40 84 C40 64 90 64 90 84',
  live: 'M50 50 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 M28 28 A32 32 0 0 0 28 72 M72 28 A32 32 0 0 1 72 72 M16 16 A48 48 0 0 0 16 84 M84 16 A48 48 0 0 1 84 84',
  cases: 'M16 30 H84 V84 H16 Z M36 30 V18 H64 V30 M16 54 H84 M46 54 V62 H54 V54', tmpl: 'M20 12 H62 L80 30 V88 H20 Z M62 12 V30 H80 M30 44 H70 M30 56 H70 M30 68 H52',
  hands: 'M14 62 L34 42 L52 52 L70 34 L86 50 M30 70 L44 84 M48 64 L58 76 M64 56 L74 66', qa: 'M14 20 H66 V54 H34 L20 68 V54 H14 Z M46 62 H86 V92 H78 V80 L66 92 H46 Z',
  gift: 'M16 44 H84 V88 H16 Z M10 30 H90 V44 H10 Z M50 30 V88 M50 30 C30 8 22 28 50 30 C78 28 70 8 50 30', mega: 'M16 40 L66 18 V82 L16 60 Z M16 40 H8 V60 H16 M30 60 L36 84 H48 L44 66',
  star: 'M50 10 L61 38 L91 39 L67 58 L76 88 L50 70 L24 88 L33 58 L9 39 L39 38 Z', bolt: 'M56 8 L20 56 H46 L40 92 L80 40 H54 Z', heart: 'M50 84 C10 56 10 22 34 20 C44 19 50 28 50 34 C50 28 56 19 66 20 C90 22 90 56 50 84 Z',
  rocket: 'M50 10 C70 26 74 50 64 72 H36 C26 50 30 26 50 10 Z M50 36 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M36 64 L22 80 L36 76 M64 64 L78 80 L64 76', globe: 'M50 50 m-38 0 a38 38 0 1 0 76 0 a38 38 0 1 0 -76 0 M12 50 H88 M50 12 C30 30 30 70 50 88 M50 12 C70 30 70 70 50 88',
};
// colour roles → hex (brand), raw hex passes through
export const col = (brand, c, fallback) => (c ? (brand.colors[c] || c) : fallback);
