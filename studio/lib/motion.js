// Browser-side motion toolkit for composer pages. Everything is a pure function of time t:
// no Date.now(), no Math.random() (seeded PRNG only), no CSS transitions or animations.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
export const ramp = (t, a, b) => b === a ? (t < a ? 0 : 1) : clamp((t - a) / (b - a));
export const mix = (a, b, p) => (typeof a === 'number' ? lerp(a, b, p) : a.map((v, i) => lerp(v, b[i], p)));

export const ease = {
  linear: (p) => p,
  outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  inCubic: (p) => p * p * p,
  outCubic: (p) => 1 - Math.pow(1 - p, 3),
  inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
  outBack: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
  inOutQuint: (p) => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2),
};

// Eased progress of t through [a, b].
export const prog = (t, a, b, fn = ease.inOutCubic) => fn(ramp(t, a, b));

// Keyframe track: [[t, value], ...] with an easing per segment (default inOutCubic).
export function track(keys, t, fn = ease.inOutCubic) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1]; const [t1, v1, f] = keys[i];
      return mix(v0, v1, (f || fn)(ramp(t, t0, t1)));
    }
  }
  return keys[keys.length - 1][1];
}

// Mulberry32 seeded PRNG.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function el(tag, attrs = {}, parent) {
  const svg = ['svg', 'path', 'circle', 'g', 'defs', 'radialGradient', 'linearGradient', 'stop', 'clipPath', 'mask', 'rect', 'ellipse', 'line', 'filter', 'feGaussianBlur', 'text', 'textPath', 'polyline', 'polygon'].includes(tag);
  const e = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'text') e.textContent = v;
    else if (k === 'class') e.setAttribute('class', v);
    else e.setAttribute(k, v);
  }
  if (parent) parent.appendChild(e);
  return e;
}

// Show/hide without losing the element's own display mode (flex lines, pills).
export function show(e, visible) {
  if (e.dataset.disp === undefined) e.dataset.disp = e.style.display === 'none' ? '' : e.style.display;
  e.style.display = visible ? e.dataset.disp : 'none';
}

// A kinetic text line: words are separate spans so Arabic shaping stays intact inside a word.
// Words enter in reading order (first word first — rightmost in RTL), staggered.
export function textLine(parent, text, style = {}) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('textLine needs nonempty text');
  const line = el('div', { class: 'line', style: { position: 'absolute', display: 'flex', flexWrap: 'nowrap', direction: 'rtl', whiteSpace: 'nowrap', ...style } }, parent);
  const words = text.trim().split(/\s+/u).map((w) => el('span', { class: 'word', text: w, style: { display: 'inline-block', willChange: 'transform', marginInlineEnd: '0.24em' } }, line));
  words[words.length - 1].style.marginInlineEnd = '0';
  return { line, words };
}

// Animate a text line: enter at tIn (ease-out-expo), exit at tOut (ease-in-out-cubic).
export function playLine(L, t, tIn, tOut, opt = {}) {
  const { stagger = 0.06, dur = 0.9, rise = 26, blur = 9, exitDur = 0.5, exitRise = -12, scaleFrom = 1 } = opt;
  const visible = t >= tIn - 0.01 && t <= tOut + exitDur + L.words.length * 0.03 + 0.05;
  show(L.line, visible);
  if (!visible) return;
  L.words.forEach((w, i) => {
    const pin = ease.outExpo(ramp(t, tIn + i * stagger, tIn + i * stagger + dur));
    const pout = ease.inOutCubic(ramp(t, tOut + i * 0.03, tOut + i * 0.03 + exitDur));
    const y = lerp(rise, 0, pin) + exitRise * pout;
    const b = blur * (1 - pin) + 6 * pout;
    const s = lerp(scaleFrom, 1, pin);
    w.style.opacity = (pin * (1 - pout)).toFixed(4);
    w.style.transform = `translateY(${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
    w.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none';
  });
}

// Film grain: N pre-generated noise tiles, one picked per frame index (deterministic).
export function grain(parent, { opacity = 0.07, tiles = 8, size = 256, seed = 7 } = {}) {
  const urls = [];
  for (let k = 0; k < tiles; k++) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); const d = g.createImageData(size, size); const r = rng(seed + k * 101);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); urls.push(c.toDataURL());
  }
  const layer = el('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none', mixBlendMode: 'overlay', opacity } }, parent);
  return (frame) => { layer.style.backgroundImage = `url(${urls[frame % tiles]})`; };
}

// Arched window outline (the brand's balcony window), centred at (0,0): w wide, h tall.
export function archPath(w, h) {
  const r = w / 2, top = -h / 2, bot = h / 2;
  return `M ${-r} ${bot} L ${-r} ${top + r} A ${r} ${r} 0 0 1 ${r} ${top + r} L ${r} ${bot} Z`;
}

// Liquid surface path across width W at height y with travelling waves; fills downwards to yBottom.
export function wavePath(W, y, t, yBottom, { amp = 26, seed = 0 } = {}) {
  const pts = [];
  for (let x = -20; x <= W + 20; x += 20) {
    const v = y + amp * Math.sin(x * 0.0085 + t * 3.1 + seed) + amp * 0.45 * Math.sin(x * 0.019 - t * 4.3 + seed * 2) + amp * 0.2 * Math.sin(x * 0.041 + t * 6.1);
    pts.push([x, v]);
  }
  let d = `M ${pts[0][0]} ${yBottom} L ${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1].toFixed(1)}`;
  return d + ` L ${pts[pts.length - 1][0]} ${yBottom} Z`;
}
