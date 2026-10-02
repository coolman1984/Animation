// Film 5 — BALACONBAR Beni Suef — «طعم زمان.. بمذاق النهارده» — 25 s, authored 9:16 (1080×1920) @ 30 fps, one delivery (Reels).
// Old world (sepia paper, film grain, Ruqaa) against new world (saturated matcha green, variable-width Archivo, directional blur),
// on one 120 BPM grid: beat 0.5 s, bar 2 s. Every frame is a closed-form function of t (springs, staggers, seeded noise, bursts):
// any frame renders identically in any order. Product pixels are the owner's real photos (cut-outs by film5/plates.mjs); the
// storyboard / vintage-board crops are decoration and atmosphere only (never product proof; the spelling BALAKON never appears).
// Scenes (bars): hook 0–2 · zaman 2–4 · naharda 4–6 · ingredients 6–8 · menu 8–10 · place 10–12 · sensory 12–14 ·
// montage 14–16 · arch 16–18 · collide 18–20 · brand 20–22.5 · hold 22.5–25.
import { clamp, lerp, ramp, ease, rng, el, show, textLine, playLine, grain } from '../lib/motion.js';
import { springStep, noise1, hash } from '../lib/kinetics.js';
import { cameraPath, rackFocus, microDrift, composeCamera } from '../lib/cinema.js';
import { depthScene } from '../lib/depth.js';
import { burst } from '../lib/particles.js';

const P = (f) => new URL(`./plates/${f}`, import.meta.url).href;
const C = {
  ink: '#0C1F18', deep: '#14463A', green: '#1F6A56', matcha: '#B7D36B', lime: '#D5F25A', cream: '#F4E9D2', paper: '#E6D3AA',
  sepia: '#3A2412', gold: '#D8A53C', goldLt: '#EBC878', red: '#B8472F',
};
const FPS = 30, BEAT = 0.5;
let W = 1080, H = 1920, stage;

// ---------- small helpers ----------
const px = (v) => `${(+v).toFixed(2)}px`;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const spr = (t, start, duration = 0.5, bounce = 0.25) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
const bump = (t, t0, d = 0.35) => Math.pow(Math.sin(Math.PI * clamp((t - t0) / d)), 2);
const div = (parent, style = {}, cls) => el('div', { ...(cls ? { class: cls } : {}), style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const img = (parent, f, style = {}) => el('img', { src: P(f), style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const AR = { fontFamily: 'El Messiri', fontWeight: 700 };
const RUQ = { fontFamily: 'Aref Ruqaa', fontWeight: 700 };
const SHADOW = '0 3px 26px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.45)';
const centered = (top) => ({ top: top + 'px', left: '0', width: W + 'px', justifyContent: 'center' });
const soft = { rise: 22, blur: 12, dur: 0.8, stagger: 0.09, exitDur: 0.35, exitRise: -10 };
const line = (parent, text, font, size, color, style, extra = {}) =>
  textLine(parent, text, { ...font, fontSize: size + 'px', lineHeight: 1.25, color, textShadow: SHADOW, ...style, ...extra });

// Directional gaussian blur through one SVG filter per id (stdDeviation "x y").
const blurs = new Map(); let defs;
function dblur(node, id, bx = 0, by = 0) {
  let f = blurs.get(id);
  if (!f) {
    if (!defs) { const svg = el('svg', { width: 0, height: 0, style: { position: 'absolute', left: '0', top: '0' } }, stage); defs = el('defs', {}, svg); }
    const flt = el('filter', { id: `db-${id}`, x: '-60%', y: '-60%', width: '220%', height: '220%', 'color-interpolation-filters': 'sRGB' }, defs);
    f = el('feGaussianBlur', { stdDeviation: '0 0' }, flt); blurs.set(id, f);
  }
  const on = bx > 0.05 || by > 0.05;
  if (on) f.setAttribute('stdDeviation', `${bx.toFixed(2)} ${by.toFixed(2)}`);
  node.style.filter = on ? `url(#db-${id})` : 'none';
}

// Latin word of letter spans; width axis animated per letter. The row is full width and centres its inner flex box.
function word(parent, text, { wght = 900, wdth = 125, color = C.cream, size = 200, track = -0.01, font = 'Archivo', style = 'normal', css = {} } = {}) {
  const row = div(parent, { width: W + 'px', display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap', fontFamily: `"${font}"`, fontStyle: style, fontSize: px(size), lineHeight: '1', color, letterSpacing: `${track}em`, ...css });
  const inner = el('div', { style: { display: 'flex', alignItems: 'baseline' } }, row);
  const letters = [...text].map((ch) => ({ ch, node: el('span', { text: ch === ' ' ? ' ' : ch, style: { display: 'inline-block', fontVariationSettings: `'wdth' ${wdth}, 'wght' ${wght}`, transformOrigin: '50% 70%' } }, inner) }));
  return { row, inner, letters, wdth, wght, size, text, fitted: false, target: 0 };
}
const setW = (L, w, wght) => { L.node.style.fontVariationSettings = `'wdth' ${clamp(w, 62, 125).toFixed(1)}, 'wght' ${wght}`; };
// Lazy fit (needs fonts + layout, so it runs the first time the scene renders): font size so the full-width word is `target` px wide.
function fit(Wd) {
  if (Wd.fitted) return;
  const was = Wd.letters.map((L) => L.node.style.fontVariationSettings);
  Wd.letters.forEach((L) => setW(L, 125, Wd.wght));
  Wd.row.style.fontSize = '100px';
  const w100 = Wd.inner.getBoundingClientRect().width || 1;
  Wd.size = (100 * Wd.target) / w100; Wd.row.style.fontSize = px(Wd.size);
  Wd.letters.forEach((L, i) => { L.node.style.fontVariationSettings = was[i]; });
  Wd.fitted = true;
}
const wordAt = (Wd, cy) => { Wd.row.style.top = px(cy - Wd.size * 0.5); };

// Arabic display word (decorative, graphic): centred, scaled/blurred by the scene each frame.
function arWord(parent, text, { font = RUQ, size = 200, color = C.cream, cy = 800, shadow = SHADOW, css = {} } = {}) {
  const n = div(parent, { width: W + 'px', textAlign: 'center', whiteSpace: 'nowrap', direction: 'rtl', fontSize: px(size), lineHeight: '1.3', color, textShadow: shadow, ...font, top: px(cy), transformOrigin: '50% 50%', ...css });
  n.textContent = text; n.style.marginTop = px(-size * 0.65);
  return n;
}
// Burst of confetti/dust with its own small canvas (rendered only while alive).
function confetti(parent, cx, cy, t0, o = {}) {
  const hgt = 1100, life = o.life || [0.6, 1.3];
  const b = burst(parent, { w: W, h: hgt, x: cx, y: hgt / 2, t0, count: 46, speed: [260, 900], spread: 360, angle: -90, gravity: 1100, drag: 2.2, life, size: [3, 8], seed: 5, shape: 'rect', colors: [C.lime, C.cream, C.gold, C.matcha], z: 30, ...o });
  b.canvas.style.top = px(cy - hgt / 2);
  return { ...b, t0, end: t0 + life[1] + 0.15, render(t) { const on = t >= t0 - 0.02 && t <= this.end; b.canvas.style.display = on ? 'block' : 'none'; if (on) b.render(t); } };
}
// Endless outlined/filled text band (marquee): translate = -(t·speed mod unit); the unit width is measured on first render.
function marquee(parent, text, { y, size = 170, speed = 300, dir = -1, color = C.cream, stroke = 3, wght = 900, wdth = 110, opacity = 1, z = 1 } = {}) {
  const row = div(parent, { top: px(y), width: px(W), height: px(size * 1.12), overflow: 'hidden', zIndex: String(z), opacity });
  const track = div(row, { display: 'flex', whiteSpace: 'nowrap', fontFamily: '"Archivo"', fontVariationSettings: `'wdth' ${wdth}, 'wght' ${wght}`, fontSize: px(size), lineHeight: '1.1', color: stroke ? 'transparent' : color, WebkitTextStroke: stroke ? `${stroke}px ${color}` : '0px transparent' });
  const spans = [0, 1, 2, 3].map(() => el('span', { text, style: { paddingRight: '0.45em' } }, track));
  return { row, track, spans, unit: 0, speed, dir };
}
function marqueeRender(m, t) {
  if (!m.unit) m.unit = m.spans[0].getBoundingClientRect().width || 1;
  const o = (t * m.speed) % m.unit;
  m.track.style.transform = `translateX(${(m.dir < 0 ? -o : o - m.unit).toFixed(1)}px)`;
}
const ellipseShadow = (node, a = 0.6) => { node.style.borderRadius = '50%'; node.style.background = `radial-gradient(closest-side, rgba(0,0,0,${a}), rgba(0,0,0,0))`; };
// Seeded scratches + dust for the film-look layers (changes every frame, deterministic).
function filmLook(parent, { z = 40 } = {}) {
  const layer = div(parent, { width: W + 'px', height: H + 'px', pointerEvents: 'none', zIndex: String(z), overflow: 'hidden' });
  const leak = div(layer, { width: W + 'px', height: H + 'px', background: 'linear-gradient(100deg, rgba(255,150,60,0.36), rgba(255,150,60,0) 36%)', mixBlendMode: 'screen' });
  const scan = div(layer, { width: W + 'px', height: H + 'px', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)' });
  const vig = div(layer, { width: W + 'px', height: H + 'px', background: 'radial-gradient(ellipse 75% 60% at 50% 50%, rgba(0,0,0,0) 45%, rgba(30,14,4,0.58) 100%)' });
  const scratches = Array.from({ length: 5 }, () => div(layer, { width: '2px', height: '0px', background: 'rgba(255,248,230,0.55)' }));
  const dust = Array.from({ length: 9 }, () => { const d = div(layer, { width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(30,16,6,0.55)' }); return d; });
  return {
    layer,
    render(t, frame, amt = 1) {
      leak.style.opacity = String((0.55 + 0.45 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1)) * amt); scan.style.opacity = String(Math.min(1, amt));
      scratches.forEach((s, i) => { const on = hash(frame, i, 11) % 100 < 22; s.style.display = on ? 'block' : 'none'; if (on) { const x = (hash(frame, i, 12) % 1000) / 1000 * W, h = 300 + (hash(frame, i, 13) % 900); s.style.left = px(x); s.style.top = px((hash(frame, i, 14) % 1000) / 1000 * (H - h)); s.style.height = px(h); s.style.opacity = String(amt); } });
      dust.forEach((d, i) => { const on = hash(frame, i, 21) % 100 < 45; d.style.display = on ? 'block' : 'none'; if (on) { const sz = 3 + (hash(frame, i, 22) % 9); d.style.width = d.style.height = px(sz); d.style.left = px((hash(frame, i, 23) % 1000) / 1000 * W); d.style.top = px((hash(frame, i, 24) % 1000) / 1000 * H); d.style.opacity = String(amt); } });
    },
  };
}

// ---------- hero-space staging (copied from film 4: the hero photo is 1600², logo centre (1005,1150), cup base y 1558, carton base y 1442) ----------
const mapper = (HX, HY, X0, Y0, sc) => ({ sc, at: (hx, hy) => [X0 + (hx - HX) * sc, Y0 + (hy - HY) * sc] });
function heroImg(ds, id, m, src, w, h, { res = 1, off = [0, 0], depth = 1, z = 0, filter } = {}) {
  const [x, y] = m.at(off[0] + w / 2 / res, off[1] + h / 2 / res);
  const content = ds.add(id, { src, width: w, height: h, x, y, depth, scale: m.sc / res, z });
  if (filter) content.firstChild.style.filter = filter;
  return content;
}
function bokeh(ds, id, n, seed, { depth = 0.45, colors, size = [60, 180], area = [0, 0, 1, 0.7], z = 1, alpha = 1 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const d = size[0] + r() * (size[1] - size[0]), c = colors[i % colors.length];
    const node = ds.add(`${id}${i}`, { width: d, height: d, depth, z, x: W * (area[0] + r() * (area[2] - area[0])), y: H * (area[1] + r() * (area[3] - area[1])) });
    node.style.borderRadius = '50%';
    node.style.background = `radial-gradient(circle, ${c} 0%, ${c} 52%, rgba(0,0,0,0) 72%)`;
    node.style.opacity = String(alpha * (0.5 + r() * 0.5));
  }
}
function leaf(parent, id, c1 = '#21502B', c2 = '#6E9A3E') {
  const s = el('svg', { width: 260, height: 260, viewBox: '-130 -130 260 260', style: { overflow: 'visible', width: '100%', height: '100%' } }, parent);
  const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, el('defs', {}, s));
  el('stop', { offset: 0, 'stop-color': c2 }, g); el('stop', { offset: 1, 'stop-color': c1 }, g);
  el('path', { d: 'M -112 10 C -60 -80 60 -95 116 -10 C 60 60 -50 75 -112 10 Z', fill: `url(#${id})` }, s);
  el('path', { d: 'M -104 9 C -40 -6 40 -14 110 -9', fill: 'none', stroke: 'rgba(214,232,170,0.5)', 'stroke-width': 3.2 }, s);
  return s;
}
const aim = ([x1, y1], sx, sy, z) => ({ x: x1 - W / 2 - (sx - W / 2) / z, y: y1 - H / 2 - (sy - H / 2) / z, zoom: z });
const smoothPath = (keys, t, r = 0.45) => { const n = 9, acc = { x: 0, y: 0, zoom: 0, focus: 0, aperture: 0 }; for (let i = 0; i < n; i++) { const c = cameraPath(keys, t + r * (i / (n - 1) * 2 - 1)); for (const k in acc) acc[k] += c[k] / n; } return acc; };

const S = {};   // per-scene state
const SC = [];  // scene table: { id, a, b, z, init(root), render(t, frame) }

// =====================================================================================================
// 1 HOOK 0–2.0 — the real cup lands on frame 1 in front of stretchy MATCHA; at 1.55 the picture rewinds like a tape into the old world.
SC.push({ id: 'hook', a: 0, b: 2.0, z: 5, bg: C.ink, init(root) {
  const bg = div(root, { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 80% 52% at 50% 40%, ${C.green} 0%, ${C.deep} 52%, ${C.ink} 100%)` });
  const ring = div(root, { left: px(W / 2 - 430), top: px(1000 - 430), width: '860px', height: '860px', borderRadius: '50%', border: `3px solid rgba(213,242,90,0.35)` });
  const m = word(root, 'MATCHA', { size: 200, color: C.cream, css: { zIndex: 2 } }); m.target = 960;
  const tag = div(root, { width: W + 'px', textAlign: 'center', top: px(285), fontFamily: '"Space Mono"', fontWeight: 700, fontSize: '38px', letterSpacing: '0.28em', color: C.lime, zIndex: 2 }); tag.textContent = 'ICED · BOBA · BENI SUEF';
  const cup = img(root, 'cup-2x.png', { width: px(1280 * 0.55), height: px(1800 * 0.55), left: px(W / 2 - 626 * 0.55), top: px(1470 - 1756 * 0.55), zIndex: 3, transformOrigin: '50% 90%' });
  const shadow = div(root, { left: px(W / 2 - 330), top: px(1470 - 36), width: '660px', height: '72px', zIndex: 2 }); ellipseShadow(shadow, 0.55);
  const conf = confetti(root, W / 2, 760, 0.12);
  const rewind = div(root, { width: W + 'px', textAlign: 'center', top: px(330), fontFamily: '"Space Mono"', fontWeight: 700, fontSize: '40px', letterSpacing: '0.3em', color: C.cream, zIndex: 6, display: 'none' }); rewind.textContent = '◂◂ REW';
  const band = div(root, { width: W + 'px', height: '210px', zIndex: 7, display: 'none', background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.22) 0 3px, rgba(0,0,0,0.18) 3px 7px)', mixBlendMode: 'overlay' });
  const flash = div(root, { width: W + 'px', height: H + 'px', background: '#fff', opacity: 0, zIndex: 8 });
  const mq = [marquee(root, 'MATCHA · BOBA · ICED · ', { y: 1565, size: 190, speed: 380, dir: -1, color: C.lime, stroke: 3, opacity: 0.55, z: 1 }), marquee(root, 'BALACONBAR · BENI SUEF · ', { y: 1735, size: 130, speed: 300, dir: 1, color: C.cream, stroke: 0, opacity: 0.12, z: 1 })];
  S.hook = { root, m, cup, shadow, ring, conf, rewind, band, flash, bg, mq };
}, render(t, frame) {
  const s = S.hook; fit(s.m); wordAt(s.m, 400);
  const p = spr(t, 0, 0.62, 0.34);
  const sway = 7 * Math.sin(t * 5.2) * sm(0.5, 0.9, t);
  s.cup.style.transform = `translateY(${((1 - p) * 130 + sway).toFixed(1)}px) rotate(${((1 - p) * -4 + 1.4 * Math.sin(t * 4)).toFixed(2)}deg)`;
  s.shadow.style.opacity = String(0.3 + 0.7 * clamp(p)); s.shadow.style.transform = `scaleX(${(0.6 + 0.4 * clamp(p)).toFixed(3)})`;
  s.ring.style.transform = `scale(${(0.6 + 0.4 * spr(t, 0.05, 0.9, 0.2)).toFixed(3)})`; s.ring.style.opacity = String(1 - sm(1.4, 1.8, t));
  // stretchy MATCHA: each letter opens from 62 to full width (spring), then squashes on beat 2 (t = 1.0) and opens again
  let mean = 0;
  s.m.letters.forEach((L, i) => {
    const o = clamp(spr(t, 0.04 + i * 0.045, 0.5, 0.3), 0, 1.15);
    const sq = bump(t, 1.0 + i * 0.03, 0.4);
    setW(L, lerp(84, 125, o) - 58 * sq, 900); mean += o / s.m.letters.length;
    L.node.style.transform = `translateY(${(-18 * sq + (1 - clamp(o)) * 26).toFixed(1)}px)`;
  });
  dblur(s.m.row, 'hook', 8 * (1 - clamp(mean)), 0);
  s.conf.render(t); s.mq.forEach((q) => marqueeRender(q, t));
  // tape rewind into the old world (1.55–2.0): desaturate, jitter, rolling noise band, flash on the cut
  const a = ramp(t, 1.55, 2.0), j = a > 0 ? (noise1(t * 40, 3) * 2 - 1) * 26 * a : 0;
  const sp = (7 + 9 * a * (noise1(t * 30, 9))).toFixed(1);
  s.root.style.filter = a > 0 ? `saturate(${(1 - 0.85 * a).toFixed(3)}) sepia(${(0.9 * a).toFixed(3)}) contrast(${(1 + 0.25 * a).toFixed(3)}) drop-shadow(${sp}px 0 0 rgba(255,40,80,${(0.6 * a).toFixed(2)})) drop-shadow(-${sp}px 0 0 rgba(40,220,255,${(0.5 * a).toFixed(2)}))` : 'none';
  s.cup.style.left = px(W / 2 - 626 * 0.55 + j);
  show(s.rewind, a > 0 && Math.floor(t * 8) % 2 === 0); show(s.band, a > 0);
  s.band.style.top = px(((t - 1.55) * 2400) % (H + 210) - 210); s.band.style.opacity = String(0.4 + 0.6 * a);
  s.flash.style.opacity = String(Math.max(0.22 * (1 - ramp(t, 0, 0.1)), 0.8 * bump(t, 1.88, 0.14)));
  const shake = Math.exp(-t * 9) * Math.sin(t * 70) * 14;
  s.bg.style.transform = `translate(${shake.toFixed(1)}px, ${(shake * 0.6).toFixed(1)}px)`;
} });

// =====================================================================================================
// 2 ZAMAN 2.0–4.0 — the old world: a sepia film frame of the café and a polaroid of the man with his car; colour blooms at 3.5.
SC.push({ id: 'zaman', a: 2.0, b: 4.4, z: 6, bg: C.paper, init(root) {
  const paper = div(root, { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 80% 70% at 50% 45%, #F0E2BE 0%, ${C.paper} 55%, #B9A173 100%)` });
  const pat = div(root, { width: W + 'px', height: H + 'px', opacity: 0.1, background: 'radial-gradient(circle at 0 0, transparent 40px, #5a3d1d 41px 44px, transparent 45px) 0 0/90px 90px, radial-gradient(circle at 90px 90px, transparent 40px, #5a3d1d 41px 44px, transparent 45px) 0 0/90px 90px' });
  const old = line(root, 'طعم زمان..', RUQ, 190, C.sepia, centered(290), { zIndex: 5, textShadow: '0 2px 0 rgba(255,244,214,0.6)' });
  // film strip: dark strip, perforations, one frame
  const strip = div(root, { left: '0', top: px(640), width: W + 'px', height: '470px', background: '#17110B', transformOrigin: '50% 50%', boxShadow: '0 14px 40px rgba(40,20,5,0.45)' });
  const holes = (y) => div(strip, { left: '0', top: px(y), width: W + 'px', height: '26px', background: `repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 14px, ${C.paper} 14px 44px, rgba(0,0,0,0) 44px 58px)`, opacity: 0.9 });
  holes(16); holes(428);
  const frame = div(strip, { left: '40px', top: '60px', width: '1000px', height: '350px', overflow: 'hidden', outline: '4px solid #000' });
  const photo = img(frame, 'sb4-cafe.jpg', { width: '1000px', height: '393px', top: '-21px', filter: 'sepia(1) contrast(1.08) brightness(0.92)' });
  const pol = div(root, { left: px(330), top: px(990), width: '640px', height: '380px', background: '#F7EFDD', padding: '0', transformOrigin: '50% 50%', boxShadow: '0 16px 36px rgba(30,14,4,0.5)', zIndex: 4 });
  img(pol, 'v-mancar.jpg', { left: '18px', top: '18px', width: '604px', height: '256px', filter: 'sepia(0.55) contrast(1.05)' });
  const cap = div(pol, { left: '18px', top: '292px', width: '604px', textAlign: 'center', fontFamily: '"Space Mono"', fontSize: '24px', letterSpacing: '0.26em', color: C.sepia }); cap.textContent = 'A TASTE OF YESTERDAY';
  const look = filmLook(root, { z: 20 });
  S.zaman = { root, old, strip, photo, pol, look, frame };
}, render(t, frame) {
  const s = S.zaman, u = t - 2.0;
  const jx = (noise1(t * 11, 5) * 2 - 1) * 3.2, jy = (noise1(t * 9, 8) * 2 - 1) * 2.4;     // gate weave
  const push = 1 + 0.045 * ramp(t, 2.0, 4.0), land = spr(t, 2.0, 0.55, 0.3);
  s.strip.style.transform = `translate(${jx.toFixed(2)}px, ${(jy + (1 - land) * 160).toFixed(2)}px) scale(${(push * (1.12 - 0.12 * land)).toFixed(4)})`;
  s.strip.style.opacity = String(clamp(land * 1.4));
  const bloom = ramp(t, 3.45, 3.95);
  s.photo.style.filter = `sepia(${(1 - bloom).toFixed(3)}) saturate(${(0.45 + 0.7 * bloom).toFixed(3)}) contrast(1.08) brightness(${(0.92 + 0.1 * bloom).toFixed(3)})`;
  const pp = spr(t, 2.55, 0.6, 0.3);
  s.pol.style.transform = `translate(${(jx * 0.7).toFixed(2)}px, ${((1 - pp) * 420 + jy).toFixed(2)}px) rotate(${(4 - (1 - pp) * 12).toFixed(2)}deg)`;
  playLine(s.old, t, 2.12, 3.86, { ...soft, dur: 0.9 });
  s.look.render(t, frame, 1 - 0.65 * bloom);
} });

// =====================================================================================================
// 3 NAHARDA 4.0–6.0 — the real cup on the wooden swing (film 4's rig), «بمذاق النهارده» + stretchy YOUR MATCHA MOMENT.
const RIG = { w: 1080, h: 2250, seat: [545, 1880] };
const T1 = 4.0, T2 = 6.0;
const swingTheta = (t) => 0.5 * Math.exp(-(t - T1) * 0.18) * Math.sin((2 * Math.PI * (t - T1)) / 3.6 + 0.4);
SC.push({ id: 'naharda', a: T1 - 0.45, b: T2 + 0.5, z: 4, bg: C.ink, init(root) {
  const ds = depthScene(root, { w: W, h: H });
  const m = mapper(1005, 1150, W / 2, 760, 1.1);
  heroImg(ds, 'bg', m, P('bar-tall.png'), 1600, 2400, { depth: 0.25, filter: 'blur(9px) saturate(0.85) brightness(0.55) sepia(0.2) hue-rotate(28deg) contrast(1.1)' });
  const tint = ds.add('tint', { width: W * 3, height: H * 3, depth: 0 }); tint.style.background = 'radial-gradient(ellipse 60% 45% at 50% 42%, rgba(150,190,70,0.22), rgba(8,26,16,0.62) 75%)';
  bokeh(ds, 'bk', 8, 23, { depth: 0.45, z: 1, colors: ['rgba(236,206,140,0.22)', 'rgba(190,225,110,0.18)', 'rgba(250,236,200,0.14)'], size: [70, 190], area: [-0.1, 0.05, 1.1, 0.6] });
  const k = 1.32, sx = W / 2 - 20 * k, sy = 1430;
  const rig = ds.add('rig', { src: P('swing-rig.png'), width: RIG.w, height: RIG.h, x: sx + (540 - RIG.seat[0]) * k, y: sy - RIG.seat[1] * k, anchor: [0.5, 0], scale: k, z: 3 });
  rig.firstChild.style.filter = 'brightness(0.88) saturate(0.95) contrast(1.05)';
  const sh2 = div(rig, { left: px(544 - 200), top: px(1862 - 30), width: '400px', height: '60px' }); ellipseShadow(sh2, 0.4);
  const sh = div(rig, { left: px(544 - 128), top: px(1864 - 13), width: '256px', height: '26px' }); ellipseShadow(sh, 0.85);
  const cupS = 0.645;
  el('img', { src: P('hero-cup.png'), style: { position: 'absolute', width: 1600 * cupS + 'px', height: 1600 * cupS + 'px', left: (544 - 1006 * cupS).toFixed(1) + 'px', top: (1866 - 1558 * cupS).toFixed(1) + 'px' } }, rig);
  const lf = ds.add('leaf', { width: 260, height: 260, x: -70, y: H - 120, depth: 1.9, scale: 2.8, rotation: -58, z: 5, opacity: 0.85 }); lf.style.filter = 'brightness(0.55)'; leaf(lf, 'lf5a');
  const scrim = div(root, { width: W + 'px', height: '700px', background: 'linear-gradient(180deg, rgba(4,12,8,0.62), rgba(4,12,8,0))', zIndex: 6 });
  const l1 = line(root, 'بمذاق النهارده', RUQ, 120, C.cream, centered(300), { zIndex: 7 });
  const yr = word(root, 'YOUR MATCHA MOMENT', { size: 80, wght: 800, color: C.lime, css: { zIndex: 7 } }); yr.target = 900;
  S.naharda = { root, ds, l1, yr };
}, render(t) {
  const s = S.naharda; fit(s.yr); wordAt(s.yr, 500);
  let cam = composeCamera(cameraPath([{ t: T1 - 0.3, x: -170, y: 0, zoom: 1.075, focus: 1, aperture: 12 }, { t: T2 + 0.3, x: 6, y: -4, zoom: 1.0, focus: 1, aperture: 12 }], t), microDrift(t, { seed: 5, x: 1.5, y: 1, zoom: 0.001 }));
  s.ds.render(cam, { rig: { rotation: swingTheta(t) } });
  playLine(s.l1, t, 4.3, 5.8, soft);
  let mean = 0;
  s.yr.letters.forEach((L, i) => { const o = clamp(spr(t, 4.55 + i * 0.03, 0.5, 0.3), 0, 1.1); setW(L, lerp(62, 125, o), 800); mean += o / s.yr.letters.length; });
  dblur(s.yr.row, 'naharda', 18 * (1 - clamp(mean)), 0);
  s.yr.row.style.opacity = String(sm(4.5, 4.7, t) * (1 - sm(5.85, 6.0, t)));
} });
// Rope occlusion 3.68–4.36: a defocused rope crosses right → left; the old world is clipped to the region ahead of the rope.
const ropeX = (t) => lerp(W + 700, -700, ease.inOutSine(ramp(t, T1 - 0.32, T1 + 0.36)));
function initRope() {
  const layer = div(stage, { width: W + 'px', height: H + 'px', pointerEvents: 'none', zIndex: '50', overflow: 'hidden' });
  const box = div(layer, { width: '900px', height: (H + 800) + 'px', overflow: 'hidden', transformOrigin: '50% 50%' });
  el('img', { src: P('rope.png'), style: { position: 'absolute', width: 140 * 22 + 'px', height: 520 * 22 + 'px', left: (450 - 50 * 22) + 'px', top: '-3000px', filter: 'brightness(0.62) contrast(1.1)' } }, box);
  return { layer, box };
}
function renderRope(t) {
  const r = S.rope, on = t > T1 - 0.32 && t < T1 + 0.36; show(r.layer, on);
  const z = S.zaman.root;
  if (t < T1 - 0.32) { z.style.clipPath = 'none'; return; }
  const xc = ropeX(t);
  r.box.style.transform = `translate(${(xc - 450).toFixed(1)}px, -400px) rotate(5deg)`; r.box.style.filter = 'blur(16px)';
  z.style.clipPath = on ? `inset(0 ${(W - clamp(xc, 0, W)).toFixed(1)}px 0 0)` : 'inset(0 0 0 100%)';
}

// =====================================================================================================
// 4 INGREDIENTS 6.0–8.0 — the real counter: carton + cup. MATCHA + COCONUT slides in; the focus pulls from the carton to the cup.
const mDuo = mapper(860, 1150, W / 2, 1186, 0.72);
SC.push({ id: 'ingredients', a: T2 - 0.05, b: 8.4, z: 5, bg: C.ink, init(root) {
  const ds = depthScene(root, { w: W, h: H });
  const bgm = mapper(860, 1150, W / 2, 900, 1.3);
  heroImg(ds, 'bg', bgm, P('bar-tall.png'), 1600, 2400, { depth: 0.4, filter: 'sepia(0.3) saturate(0.9) brightness(0.8) contrast(1.02)' });
  const warm = ds.add('warm', { width: W * 3, height: H * 3, depth: 0, z: 1 }); warm.style.background = 'radial-gradient(ellipse 55% 36% at 50% 45%, rgba(255,226,180,0.22), rgba(20,10,4,0.5) 85%)';
  const m = mDuo, [ccx, ccy] = m.at(575, 1444);
  const csh = ds.add('cartonSh', { width: 520, height: 60, x: ccx, y: ccy, depth: 0.8, scale: m.sc, z: 2 }); ellipseShadow(csh, 0.75);
  heroImg(ds, 'carton', m, P('hero-carton.png'), 1600, 1600, { depth: 0.8, z: 3, filter: 'brightness(1.02) saturate(0.96)' });
  const [ux, uy] = m.at(1006, 1556);
  const ush = ds.add('cupSh', { width: 640, height: 80, x: ux, y: uy, depth: 1, scale: m.sc, z: 5 }); ellipseShadow(ush, 0.7);
  heroImg(ds, 'cup', m, P('cup-2x.png'), 1280, 1800, { res: 2, off: [690, 680], z: 6 });
  for (let i = 0; i < 14; i++) { const r = rng(40 + i); const d = ds.add(`dust${i}`, { width: 14, height: 14, depth: 1.5 + r() * 0.8, z: 8, x: r() * W, y: 500 + r() * 900 }); d.style.borderRadius = '50%'; d.style.background = i % 3 ? 'rgba(197,222,120,0.75)' : 'rgba(255,230,160,0.7)'; d.style.opacity = '0.8'; }
  const fade = div(root, { width: W + 'px', height: H + 'px', zIndex: 7, background: 'linear-gradient(180deg, rgba(10,6,3,0.62) 0%, rgba(10,6,3,0) 28%, rgba(10,6,3,0) 66%, rgba(10,6,3,0.75) 100%)' });
  const w1 = word(root, 'MATCHA + COCONUT', { size: 110, wght: 900, color: C.cream, css: { zIndex: 8 } }); w1.target = 940;
  const l1 = line(root, 'ماتشا بلبن جوز الهند', AR, 78, C.cream, centered(322), { zIndex: 8 });
  S.ingredients = { root, ds, w1, l1 };
}, render(t) {
  const s = S.ingredients; fit(s.w1); wordAt(s.w1, 298);
  const key = [{ t: T2 - 0.2, ...aim(mDuo.at(760, 1000), W * 0.46, H * 0.52, 1.0) }, { t: 8.2, ...aim(mDuo.at(820, 1060), W * 0.52, H * 0.52, 1.1) }];
  let cam = composeCamera(smoothPath(key, t), microDrift(t, { seed: 9, x: 1, y: 1, zoom: 0.001 }));
  const f = t < 7.2 ? rackFocus(t, { start: T2, end: 6.7, from: 1.6, to: 0.8, aperture: 24 }) : rackFocus(t, { start: 7.2, end: 7.75, from: 0.8, to: 1, aperture: 22 });
  const ov = {}; for (let i = 0; i < 14; i++) { const r = rng(40 + i); const x0 = r() * W, y0 = 500 + r() * 900; ov[`dust${i}`] = { x: x0 + 18 * Math.sin(t * 1.3 + i), y: y0 - (t - 6) * (30 + 14 * (i % 5)) }; }
  s.ds.render({ ...cam, ...f }, ov);
  playLine(s.l1, t, 6.7, 7.95, soft);
  // words slide together from both sides and stretch on beats 6.0 and 7.0
  let mean = 0;
  s.w1.letters.forEach((L, i) => { const o = clamp(spr(t, 6.05 + i * 0.022, 0.45, 0.3), 0, 1.1); const sq = bump(t, 7.0 + i * 0.015, 0.3); setW(L, lerp(62, 125, o) - 40 * sq, 900); mean += o / s.w1.letters.length; });
  dblur(s.w1.row, 'ing', 26 * (1 - clamp(mean)) + 10 * bump(t, 7.0, 0.3), 0);
  s.w1.row.style.opacity = String(1 - sm(7.9, 8.1, t));
  // paper slam: this scene rises over the swing at 6.0 (vertical smear), leaves under the menu at 8.0
  const up = spr(t, T2 - 0.05, 0.4, 0.05);
  s.root.style.transform = `translateY(${((1 - clamp(up)) * H).toFixed(1)}px)`;
  s.root.style.filter = up < 0.98 ? 'blur(2px)' : 'none';
} });

// =====================================================================================================
// 5 MENU 8.0–10.0 — five cards from the vintage board on a dotted-eighth rhythm (every 0.375 s): slam centre, fly to a row.
const MENU = [
  { img: 'v-card0.png', w: 354, h: 552, en: 'COFFEE', ar: 'آيس كوفي' },
  { img: 'v-card1.png', w: 408, h: 552, en: 'LATTE', ar: 'لاتيه' },
  { img: 'v-card2.png', w: 354, h: 552, en: 'LEMON', ar: 'ليمون طازج' },
  { img: 'v-card3.png', w: 354, h: 552, en: 'SHAKE', ar: 'ميلك شيك' },
  { img: 'v-card4.png', w: 420, h: 552, en: 'BAKERY', ar: 'مخبوزات' },
];
const MT = (i) => 8.0 + i * 0.375;
SC.push({ id: 'menu', a: 7.95, b: 10.3, z: 6, bg: C.paper, init(root) {
  div(root, { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 80% 70% at 50% 45%, #F2E5C4 0%, ${C.paper} 60%, #C2AA7C 100%)` });
  div(root, { width: W + 'px', height: H + 'px', opacity: 0.1, background: 'radial-gradient(circle at 0 0, transparent 40px, #5a3d1d 41px 44px, transparent 45px) 0 0/90px 90px, radial-gradient(circle at 90px 90px, transparent 40px, #5a3d1d 41px 44px, transparent 45px) 0 0/90px 90px' });
  S.menu = { root, cards: [], confs: [] };
  MENU.forEach((c, i) => {
    const en = word(root, c.en, { size: 200, wght: 900, color: C.deep, css: { zIndex: 3 } }); en.target = 900;
    const ar = arWord(root, c.ar, { font: RUQ, size: 150, color: C.red, cy: 1135, shadow: '0 2px 0 rgba(255,244,214,0.7)', css: { zIndex: 7 } });
    const card = div(root, { width: '390px', height: '600px', background: '#EFE0BC', border: `5px solid ${C.deep}`, borderRadius: '14px', boxShadow: '0 20px 40px rgba(40,20,5,0.42)', overflow: 'hidden', zIndex: 5 });
    const scale = 590 / c.h; img(card, c.img, { width: px(c.w * scale), height: '590px', left: px((390 - c.w * scale) / 2 - 5), top: '0px', mixBlendMode: 'multiply' });
    S.menu.cards.push({ en, ar, card });
    S.menu.confs.push(confetti(root, W / 2, 780, MT(i) + 0.02, { colors: [C.red, C.deep, C.gold, '#fff'], count: 34 }));
  });
  S.menu.mq = [marquee(root, 'COFFEE · LATTE · LEMON · SHAKE · BAKERY · ', { y: 1560, size: 150, speed: 520, dir: -1, color: C.deep, stroke: 3, opacity: 0.55, z: 2 }), marquee(root, 'ENJOY TODAY · ENJOY TODAY · ', { y: 1720, size: 120, speed: 420, dir: 1, color: C.red, stroke: 0, opacity: 0.2, z: 2 })];
  S.menu.look = filmLook(root, { z: 20 });
}, render(t, frame) {
  const s = S.menu;
  MENU.forEach((c, i) => {
    const o = s.cards[i], ts = MT(i), tf = ts + 0.375, active = t >= ts - 0.01;
    show(o.card, active); show(o.en.row, t >= ts && t < tf + 0.04); show(o.ar, t >= ts && t < tf + 0.04);
    if (!active) return;
    fit(o.en); wordAt(o.en, 395);
    const sp = spr(t, ts, 0.36, 0.38), fly = ease.inOutCubic(ramp(t, tf, tf + 0.3));
    const slam = 1 + (1 - clamp(sp, 0, 1.2)) * 0.9, rot = (i % 2 ? 1 : -1) * (1 - sp) * 9;
    const rx = 130 + i * 205, ry = 1285, rs = 0.34;           // row slot
    const cx = lerp(W / 2, rx, fly), cy = lerp(780, ry, fly), sc = lerp(slam, rs, fly);
    o.card.style.transform = `translate(${(cx - 195).toFixed(1)}px, ${(cy - 300).toFixed(1)}px) rotate(${(rot * (1 - fly) + (i - 2) * 1.4 * fly).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
    o.card.style.opacity = String(clamp(sp * 3));
    let mean = 0; o.en.letters.forEach((L, k) => { const q = clamp(spr(t, ts + k * 0.018, 0.34, 0.3), 0, 1.1); setW(L, lerp(62, 125, q), 900); mean += q / o.en.letters.length; });
    dblur(o.en.row, `m${i}`, 24 * (1 - clamp(mean)), 0);
    const ap = clamp(spr(t, ts + 0.04, 0.32, 0.3), 0, 1.15);
    o.ar.style.transform = `scale(${lerp(1.7, 1, ap).toFixed(3)}, ${lerp(0.7, 1, ap).toFixed(3)})`; o.ar.style.opacity = String(clamp(ap * 2));
    s.confs[i].render(t);
  });
  s.mq.forEach((q) => marqueeRender(q, t));
  s.look.render(t, frame, 0.5);
  // the row of finished cards bobs on the beat
  s.cards.forEach((o, i) => { if (t > MT(i) + 0.7) o.card.style.transform += ` translateY(${(-8 * bump(t % 0.5, 0, 0.5)).toFixed(1)}px)`; });
  s.root.style.transform = `translateY(${((1 - ease.outCubic(ramp(t, 7.95, 8.25))) * H).toFixed(1)}px)`;
} });

// =====================================================================================================
// 6 PLACE 10.0–12.0 — three bands of the café (owner's scene art) slide in alternately; the pin drops on «بني سويف».
const BANDS = [
  { f: 'sb2-swing.jpg', w: 800, h: 475, x: 230, y: 620, rot: -2, dir: 1, filter: 'saturate(1.05) contrast(1.04)' },
  { f: 'sb4-cafe.jpg', w: 780, h: 306, x: 40, y: 1000, rot: 1.5, dir: -1, filter: 'saturate(1.05) contrast(1.04)' },
  { f: 'v-mancar.jpg', w: 520, h: 221, x: 500, y: 1160, rot: -3, dir: 1, filter: 'sepia(0.65) contrast(1.05)' },
];
SC.push({ id: 'place', a: 9.95, b: 12.25, z: 7, bg: C.ink, init(root) {
  div(root, { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 90% 60% at 50% 40%, #2a4a30 0%, ${C.deep} 45%, ${C.ink} 100%)` });
  S.place = { root, bands: [] };
  BANDS.forEach((b, i) => {
    const wrap = div(root, { left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h), overflow: 'hidden', border: '8px solid #F4E9D2', boxShadow: '0 22px 44px rgba(0,0,0,0.5)', boxSizing: 'content-box', zIndex: 3 + i });
    const im = img(wrap, b.f, { width: px(b.w), height: px(b.h), filter: b.filter });
    S.place.bands.push({ wrap, im, b });
  });
  S.place.title = line(root, 'كافيه في بني سويف', AR, 100, C.cream, centered(275), { zIndex: 9 });
  const pin = el('svg', { width: 110, height: 150, viewBox: '0 0 110 150', style: { position: 'absolute', left: '0', top: '0', zIndex: 9, overflow: 'visible' } }, root);
  el('path', { d: 'M55 148 C55 148 6 86 6 52 A49 49 0 0 1 104 52 C104 86 55 148 55 148 Z', fill: C.red, stroke: C.cream, 'stroke-width': 7 }, pin); el('circle', { cx: 55, cy: 52, r: 18, fill: C.cream }, pin);
  S.place.pin = pin;
  const bs = word(root, 'BENI SUEF', { size: 120, wght: 900, color: C.gold, css: { zIndex: 9 } }); bs.target = 760; S.place.bs = bs;
  S.place.mq = [marquee(root, 'BALACONBAR · BENI SUEF · ', { y: 1470, size: 190, speed: 380, dir: 1, color: C.gold, stroke: 3, opacity: 0.6, z: 2 }), marquee(root, 'YOUR MATCHA MOMENT · ', { y: 1670, size: 130, speed: 300, dir: -1, color: C.cream, stroke: 0, opacity: 0.12, z: 2 })];
  S.place.conf = confetti(root, W / 2, 500, 10.62, { count: 30, colors: [C.gold, C.cream, C.lime] });
}, render(t) {
  const s = S.place;
  s.bands.forEach((o, i) => {
    const ts = 10.0 + i * 0.1, p = spr(t, ts, 0.5, 0.22), vx = (1 - clamp(p, 0, 1.2)) * o.b.dir * -1100;
    const drift = (t - 10) * o.b.dir * 16;
    o.wrap.style.transform = `translate(${(vx + drift).toFixed(1)}px, 0) rotate(${o.b.rot}deg)`;
    dblur(o.wrap, `pl${i}`, 40 * (1 - clamp(p)), 0);
    o.im.style.transform = `translateX(${(-drift * 0.9).toFixed(1)}px) scale(1.06)`;
  });
  playLine(s.title, t, 10.25, 11.95, soft);
  fit(s.bs); wordAt(s.bs, 485);
  const pp = spr(t, 10.55, 0.55, 0.45);
  s.pin.style.transform = `translate(${(70).toFixed(1)}px, ${(lerp(-200, 420, clamp(pp, 0, 1.1))).toFixed(1)}px) scale(${(0.62 + 0.08 * bump(t, 10.6, 0.3)).toFixed(3)})`;
  s.bs.letters.forEach((L, i) => { const q = clamp(spr(t, 10.6 + i * 0.03, 0.4, 0.3), 0, 1.1); setW(L, lerp(62, 125, q), 900); });
  s.bs.row.style.opacity = String(sm(10.55, 10.7, t));
  s.conf.render(t); s.mq.forEach((q) => marqueeRender(q, t));
  const wipe = ease.outExpo(ramp(t, 9.95, 10.3));
  s.root.style.clipPath = `inset(0 ${((1 - wipe) * 100).toFixed(2)}% 0 0)`;
} });

// =====================================================================================================
// 7 SENSORY 12.0–14.0 — «بارد. كريمي. منعش.» on three beats around the real cup (graphic: words behind, in front, behind).
SC.push({ id: 'sensory', a: 11.95, b: 14.05, z: 8, bg: C.deep, init(root) {
  div(root, { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 85% 55% at 50% 44%, ${C.green} 0%, ${C.deep} 50%, ${C.ink} 100%)` });
  const halo = div(root, { left: px(W / 2 - 440), top: px(1000 - 440), width: '880px', height: '880px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(213,242,90,0.36), rgba(213,242,90,0))' });
  const WORDS = [
    { t: 'بارد.', cy: 385, color: C.cream, dir: -1 },
    { t: 'كريمي.', cy: 385, color: C.lime, dir: 1 },
    { t: 'منعش.', cy: 385, color: C.cream, dir: 0 },
  ];
  const words = WORDS.map((w) => arWord(root, w.t, { font: AR, size: 300, color: w.color, cy: w.cy, shadow: '0 6px 40px rgba(0,0,0,0.5)', css: { zIndex: 6, fontWeight: 800 } }));
  const cup = img(root, 'cup-2x.png', { width: px(1280 * 0.6), height: px(1800 * 0.6), left: px(W / 2 - 626 * 0.6), top: px(1560 - 1756 * 0.6), zIndex: 4, transformOrigin: '50% 90%' });
  const sh = div(root, { left: px(W / 2 - 360), top: px(1560 - 40), width: '720px', height: '80px', zIndex: 3 }); ellipseShadow(sh, 0.6);
  const confs = [12.0, 12.5, 13.0].map((t0, i) => confetti(root, W / 2 + (i - 1) * 200, 540, t0 + 0.02, { colors: [C.lime, C.cream, '#BFE8FF'], count: 30, size: [3, 7] }));
  const flash = div(root, { width: W + 'px', height: H + 'px', background: '#fff', opacity: 0, zIndex: 9 });
  S.sensory = { root, words, WORDS, cup, halo, confs, flash };
}, render(t) {
  const s = S.sensory;
  s.WORDS.forEach((w, i) => {
    const ts = 12.0 + i * 0.5, te = ts + 0.5, p = clamp(spr(t, ts, 0.4, 0.34), 0, 1.15), n = s.words[i];
    const out = i < 2 ? ease.inCubic(ramp(t, te - 0.12, te)) : sm(13.8, 14.0, t), vis = t >= ts - 0.01 && (i === 2 || t < te + 0.02);
    show(n, vis); if (!vis) return;
    n.style.transform = `translate(${((1 - p) * w.dir * 700 + out * -w.dir * 500).toFixed(1)}px, ${(w.dir === 0 ? -(1 - p) * 500 : 0).toFixed(1)}px) scale(${lerp(2.4, 1, clamp(p)).toFixed(3)}, ${lerp(0.55, 1, clamp(p)).toFixed(3)})`;
    n.style.opacity = String(clamp(p * 2.2) * (1 - out)); dblur(n, `sn${i}`, 36 * (1 - clamp(p)) + 40 * out, w.dir === 0 ? 30 * (1 - clamp(p)) : 0);
  });
  const hit = Math.max(bump(t, 12.0, 0.3), bump(t, 12.5, 0.3), bump(t, 13.0, 0.3));
  const wob = spr(t, 12.0, 0.6, 0.35), z = 1 + 0.5 * sm(13.4, 14.0, t) + 0.04 * hit;
  s.cup.style.transform = `translateY(${((1 - wob) * 260).toFixed(1)}px) rotate(${(Math.sin(t * 5.5) * 1.8 * wob + (12.4 - Math.min(t, 12.4)) * 0).toFixed(2)}deg) scale(${z.toFixed(4)})`;
  s.halo.style.transform = `scale(${(0.8 + 0.5 * hit + 0.25 * sm(12, 14, t)).toFixed(3)})`;
  s.confs.forEach((c) => c.render(t));
  s.flash.style.opacity = String(0.55 * bump(t, 12.0, 0.1) + 0.55 * bump(t, 13.9, 0.2));
} });

// =====================================================================================================
// 8 MONTAGE 14.0–16.0 — eight cuts on 1/8 notes alternating the real photo (macro, full bleed) and the old world (sepia bands).
const HERO_IMG = 'hero-duo.jpg';
const MON = [
  { kind: 'macro', c: [1005, 1150], word: 'ماتشا', bg: C.lime },
  { kind: 'old', f: 'v-statue.jpg', w: 387, h: 873, word: 'زمان', bg: C.paper, sepia: 0.7 },
  { kind: 'macro', c: [1010, 1405], word: 'بوبا', bg: C.cream },
  { kind: 'old', f: 'sb4-cafe.jpg', w: 1060, h: 416, word: 'المكان', bg: C.deep, sepia: 0 },
  { kind: 'macro', c: [1000, 840], word: 'ثلج', bg: C.lime },
  { kind: 'old', f: 'v-mancar.jpg', w: 960, h: 408, word: 'زمان', bg: C.paper, sepia: 0.7 },
  { kind: 'macro', c: [575, 700], word: 'جوز الهند', bg: C.cream },
  { kind: 'old', f: 'sb2-swing.jpg', w: 1000, h: 593, word: 'لحظتك', bg: C.deep, sepia: 0 },
];
SC.push({ id: 'montage', a: 13.98, b: 16.05, z: 9, bg: C.ink, init(root) {
  S.montage = { root, slots: [] };
  MON.forEach((m, i) => {
    const box = div(root, { width: W + 'px', height: H + 'px', overflow: 'hidden', background: m.bg });
    let im;
    if (m.kind === 'macro') {
      const [cx, cy] = m.c; const s0 = 1.5, sb = 3.4;
      img(box, HERO_IMG, { width: px(1600 * sb), height: px(1600 * sb), left: px(W / 2 - cx * sb * 0.9 - 700), top: px(H / 2 - cy * sb * 0.9 - 300), filter: 'blur(36px) brightness(0.7) saturate(1.15)' });
      const win = div(box, { width: W + 'px', height: H + 'px', overflow: 'hidden', WebkitMaskImage: 'linear-gradient(180deg, transparent 0, #000 10%, #000 90%, transparent 100%)' });
      im = img(win, HERO_IMG, { width: px(1600 * s0), height: px(1600 * s0), left: px(W / 2 - cx * s0), top: px(H / 2 - cy * s0 + 40), transformOrigin: `${cx}px ${cy}px` });
      div(box, { width: W + 'px', height: H + 'px', background: 'linear-gradient(180deg, rgba(8,20,14,0.5), rgba(8,20,14,0) 28%, rgba(8,20,14,0) 62%, rgba(8,20,14,0.5))' });
    } else {
      div(box, { width: W + 'px', height: H + 'px', background: m.bg === C.paper ? `radial-gradient(ellipse 80% 60% at 50% 45%, #F2E5C4, ${C.paper} 65%, #B9A173)` : `radial-gradient(ellipse 80% 60% at 50% 45%, ${C.green}, ${C.deep} 60%, ${C.ink})` });
      const frame = div(box, { left: px((W - m.w) / 2), top: px(760 - m.h / 2), width: px(m.w), height: px(m.h), overflow: 'hidden', border: '10px solid #F4E9D2', boxSizing: 'content-box', boxShadow: '0 22px 44px rgba(0,0,0,0.5)' });
      im = img(frame, m.f, { width: px(m.w), height: px(m.h), filter: m.sepia ? `sepia(${m.sepia}) contrast(1.06)` : 'saturate(1.05) contrast(1.04)' });
      im.dataset.frame = '1'; im.parentNode.dataset.k = '1';
    }
    const w = arWord(box, m.word, { font: m.kind === 'old' && m.bg === C.paper ? RUQ : AR, size: m.kind === 'old' && m.bg === C.paper ? 250 : 240, color: m.bg === C.paper ? C.red : C.cream, cy: m.kind === 'macro' ? 430 : 1230, shadow: m.bg === C.paper ? '0 2px 0 rgba(255,244,214,0.7)' : '0 6px 34px rgba(0,0,0,0.6)', css: { fontWeight: 800 } });
    const flash = div(box, { width: W + 'px', height: H + 'px', background: m.bg === C.paper ? C.cream : C.lime, opacity: 0, mixBlendMode: 'screen' });
    S.montage.slots.push({ box, im, w, flash, m });
  });
  S.montage.look = filmLook(root, { z: 30 });
}, render(t, frame) {
  const s = S.montage, idx = Math.floor((t - 14.0) / 0.25 + 1e-9), cur = clamp(idx, 0, MON.length - 1);
  s.slots.forEach((o, i) => show(o.box, i === cur && t < 16.02));
  const o = s.slots[cur], tau = clamp(t - (14.0 + cur * 0.25), 0, 0.25), p = clamp(spr(t, 14.0 + cur * 0.25, 0.22, 0.3), 0, 1.15);
  if (o.m.kind === 'macro') o.im.style.transform = `scale(${(1.0 + 0.22 * (tau / 0.25) + 0.06 * (1 - p)).toFixed(4)})`;
  else o.im.parentNode.style.transform = `scale(${(1.08 - 0.08 * clamp(p) + 0.04 * (tau / 0.25)).toFixed(4)}) rotate(${((cur % 4 === 1 ? -2 : 2) * (1 - clamp(p))).toFixed(2)}deg)`;
  o.w.style.transform = `scale(${lerp(1.8, 1, clamp(p)).toFixed(3)}, ${lerp(0.55, 1, clamp(p)).toFixed(3)})`; o.w.style.opacity = String(clamp(p * 3));
  dblur(o.w, `mo${cur}`, 30 * (1 - clamp(p)), 0);
  o.flash.style.opacity = String(0.8 * (1 - clamp(tau / 0.06)));
  s.look.render(t, frame, o.m.kind === 'old' && o.m.sepia ? 0.9 : 0.15);
  s.look.layer.style.display = 'block';
} });

// =====================================================================================================
// 9 ARCH 16.0–18.0 — the balcony window (brand motif) opens as a portal onto the café; «تعالى جرّب».
const archD = (cx, top, w, h) => { const r = w / 2, x0 = cx - r, x1 = cx + r, yb = top + h; return `M ${x0.toFixed(1)} ${yb.toFixed(1)} L ${x0.toFixed(1)} ${(top + r).toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${(top + r).toFixed(1)} L ${x1.toFixed(1)} ${yb.toFixed(1)} Z`; };
SC.push({ id: 'arch', a: 15.98, b: 18.1, z: 10, bg: C.deep, init(root) {
  div(root, { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 80% 55% at 50% 45%, ${C.green} 0%, ${C.deep} 55%, ${C.ink} 100%)` });
  const portal = div(root, { width: W + 'px', height: H + 'px', overflow: 'hidden' });
  const ds = depthScene(portal, { w: W, h: H });
  const bgm = mapper(860, 1150, W / 2, 900, 1.3);
  heroImg(ds, 'bg', bgm, P('bar-tall.png'), 1600, 2400, { depth: 0.4, filter: 'sepia(0.35) saturate(1) brightness(0.9) contrast(1.05)' });
  const warm = ds.add('warm', { width: W * 3, height: H * 3, depth: 0, z: 1 }); warm.style.background = 'radial-gradient(ellipse 50% 35% at 50% 42%, rgba(255,214,150,0.3), rgba(20,10,4,0.45) 85%)';
  const m = mapper(860, 1150, W / 2, 1283, 0.58), [ccx, ccy] = m.at(575, 1444);
  const csh = ds.add('cartonSh', { width: 520, height: 60, x: ccx, y: ccy, depth: 0.8, scale: m.sc, z: 2 }); ellipseShadow(csh, 0.75);
  heroImg(ds, 'carton', m, P('hero-carton.png'), 1600, 1600, { depth: 0.8, z: 3 });
  const [ux, uy] = m.at(1006, 1556);
  const ush = ds.add('cupSh', { width: 640, height: 80, x: ux, y: uy, depth: 1, scale: m.sc, z: 5 }); ellipseShadow(ush, 0.7);
  heroImg(ds, 'cup', m, P('cup-2x.png'), 1280, 1800, { res: 2, off: [690, 680], z: 6 });
  const ol = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: 3 } }, root);
  const echo2 = el('path', { fill: 'none', stroke: C.gold, 'stroke-width': 3, opacity: 0.5 }, ol), echo1 = el('path', { fill: 'none', stroke: C.goldLt, 'stroke-width': 4, opacity: 0.8 }, ol), edge = el('path', { fill: 'none', stroke: C.gold, 'stroke-width': 10 }, ol);
  const l1 = line(root, 'تعالى جرّب', RUQ, 120, C.cream, centered(292), { zIndex: 8 });
  const tr = word(root, 'TRY IT', { size: 160, wght: 900, color: C.lime, css: { zIndex: 8 } }); tr.target = 600;
  S.arch = { root, portal, ds, ol, echo1, echo2, edge, l1, tr, conf: confetti(root, W / 2, 700, 16.05, { count: 52 }) };
}, render(t) {
  const s = S.arch, p = clamp(spr(t, 16.0, 0.7, 0.28), 0, 1.12);
  const w = lerp(180, 880, p), h = lerp(400, 1100, p), cx = W / 2, top = 650 + (1100 - h) * 0.5;
  const d = archD(cx, top, w, h);
  s.portal.style.clipPath = `path('${d}')`;
  s.edge.setAttribute('d', d); s.echo1.setAttribute('d', archD(cx, top - 28, w + 56, h + 28)); s.echo2.setAttribute('d', archD(cx, top - 58, w + 116, h + 58));
  const ln = sm(16.15, 16.5, t); s.echo1.style.opacity = String(0.8 * ln); s.echo2.style.opacity = String(0.5 * ln);
  const cam = composeCamera(cameraPath([{ t: 16, x: 0, y: 0, zoom: 1.0, focus: 1, aperture: 12 }, { t: 18.1, x: 0, y: -20, zoom: 1.1, focus: 1, aperture: 12 }], t), microDrift(t, { seed: 7, x: 1, y: 1, zoom: 0.001 }));
  s.ds.render(cam);
  playLine(s.l1, t, 16.3, 17.75, { ...soft, exitRise: -3 });
  fit(s.tr); wordAt(s.tr, 540);
  s.tr.letters.forEach((L, i) => { const q = clamp(spr(t, 16.55 + i * 0.04, 0.45, 0.3), 0, 1.1); setW(L, lerp(62, 125, q) - 30 * bump(t, 17.0 + i * 0.02, 0.3), 900); });
  s.tr.row.style.opacity = String(sm(16.5, 16.65, t) * (1 - sm(17.85, 18.0, t)));
  s.conf.render(t);
} });

// =====================================================================================================
// 10 COLLIDE 18.0–20.0 — old against new: a diagonal split swaps on every beat, then the new world wins.
SC.push({ id: 'collide', a: 17.98, b: 20.1, z: 11, bg: C.deep, init(root) {
  const newer = div(root, { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 85% 55% at 50% 45%, ${C.green}, ${C.deep} 58%, ${C.ink})` });
  div(newer, { width: W + 'px', height: H + 'px', opacity: 0.22, background: `radial-gradient(circle, ${C.lime} 3px, transparent 4px) 0 0/54px 54px` });
  const nw = arWord(newer, 'النهارده', { font: AR, size: 300, color: C.cream, cy: 1020, shadow: '0 8px 44px rgba(0,0,0,0.5)', css: { fontWeight: 800 } });
  const nl = word(newer, 'NOW', { size: 200, wght: 900, color: C.lime }); nl.target = 520;
  const older = div(root, { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 80% 70% at 50% 45%, #F2E5C4, ${C.paper} 60%, #B9A173)` });
  // Truchet tiles (seeded rotations) on the old side
  const T = 135, cols = Math.ceil(W / T), rows = Math.ceil(H / T);
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', opacity: 0.2 } }, older);
  const tiles = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const g = el('g', {}, svg); const x = c * T + T / 2, y = r * T + T / 2;
    el('path', { d: `M ${-T / 2} 0 A ${T / 2} ${T / 2} 0 0 0 0 ${-T / 2} M 0 ${T / 2} A ${T / 2} ${T / 2} 0 0 0 ${T / 2} 0`, fill: 'none', stroke: '#5a3d1d', 'stroke-width': 14 }, g);
    tiles.push({ g, x, y, k: hash(c, r, 7) % 4 });
  }
  const ow = arWord(older, 'زمان', { font: RUQ, size: 440, color: C.red, cy: 640, shadow: '0 3px 0 rgba(255,244,214,0.8)' });
  const look = filmLook(older, { z: 5 });
  const edgeSvg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', zIndex: 6 } }, root);
  const edge = el('line', { x1: 0, y1: 0, x2: 0, y2: H, stroke: C.gold, 'stroke-width': 8 }, edgeSvg);
  S.collide = { root, newer, older, nw, nl, ow, tiles, look, edge, conf: confetti(root, W / 2, 900, 19.62, { count: 56 }) };
}, render(t, frame) {
  const s = S.collide;
  const stops = [[18.0, 0.62], [18.5, 0.2], [19.0, 0.8], [19.5, 0.35], [19.75, -0.1]];
  let pos = stops[0][1];
  for (let i = 1; i < stops.length; i++) { const [t1, p1] = stops[i], [t0, p0] = stops[i - 1]; if (t >= t0) pos = lerp(p0, p1, clamp(spr(t, t1 - 0.28, 0.3, 0.32), 0, 1.1)); }
  const skew = 150, x = pos * (W + skew * 2) - skew;
  s.older.style.clipPath = `polygon(0 0, ${(x + skew).toFixed(1)}px 0, ${(x - skew).toFixed(1)}px ${H}px, 0 ${H}px)`;
  s.edge.setAttribute('x1', (x + skew).toFixed(1)); s.edge.setAttribute('x2', (x - skew).toFixed(1)); s.edge.style.opacity = String(x > -skew && x < W + skew ? 1 : 0);
  fit(s.nl); wordAt(s.nl, 700);
  s.nl.letters.forEach((L, i) => setW(L, 125 - 50 * bump(t, 18.0 + Math.floor((t - 18) / 0.5) * 0.5 + i * 0.02, 0.35), 900));
  const sh = (hash(Math.floor(t * 30), 3) % 100) / 100 - 0.5;
  s.ow.style.transform = `translateX(${(sh * 8).toFixed(1)}px) scale(${(1 + 0.08 * bump(t % 0.5, 0, 0.3)).toFixed(3)})`;
  s.nw.style.transform = `scale(${(1 + 0.08 * bump(t % 0.5, 0.25, 0.3)).toFixed(3)})`;
  s.tiles.forEach((o) => { const rot = (o.k * 90 + 90 * Math.floor(Math.max(0, t - 18) / 0.5) * ((o.x * 3 + o.y) % 2 ? 1 : 0)) + 90 * spr(t % 0.5, 0, 0.3, 0.2); o.g.setAttribute('transform', `translate(${o.x} ${o.y}) rotate(${rot.toFixed(1)})`); });
  s.look.render(t, frame, 0.45);
  s.conf.render(t);
} });

// =====================================================================================================
// 11–12 BRAND 20.0–25.0 — logo, «لحظتك مع الماتشا», Beni Suef; held and sparkling.
SC.push({ id: 'brand', a: 19.95, b: 25.1, z: 12, bg: C.deep, init(root) {
  div(root, { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 85% 58% at 50% 40%, ${C.green} 0%, ${C.deep} 52%, ${C.ink} 100%)` });
  const ghost = img(root, 'logo-white.png', { width: '1500px', height: px(1500 * 688 / 800), left: px(W / 2 - 750), top: px(560 - 645), opacity: 0.05, clipPath: 'inset(0 0 21% 0)' });
  const fr = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', zIndex: 3 } }, root);
  const f1 = el('rect', { x: 34, y: 34, width: W - 68, height: H - 68, fill: 'none', stroke: C.gold, 'stroke-width': 3, rx: 6 }, fr), f2 = el('rect', { x: 52, y: 52, width: W - 104, height: H - 104, fill: 'none', stroke: C.gold, 'stroke-width': 1.5, rx: 3, opacity: 0.7 }, fr);
  const cupG = div(root, { left: px(W / 2 - 440), top: px(1420), width: '880px', height: '880px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(213,242,90,0.3), rgba(213,242,90,0))', zIndex: 3 });
  const cup = img(root, 'cup-2x.png', { width: px(1280 * 0.5), height: px(1800 * 0.5), left: px(W / 2 - 626 * 0.5), top: px(2140 - 1756 * 0.5), zIndex: 4, transformOrigin: '50% 90%' });
  const logo = img(root, 'logo-white.png', { width: '560px', height: px(560 * 688 / 800), left: px(W / 2 - 280), top: px(300), zIndex: 5, transformOrigin: '50% 60%', filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.4))' });
  const l1 = line(root, 'لحظتك مع الماتشا', AR, 100, C.cream, centered(920), { zIndex: 7 });
  const l2 = div(root, { width: W + 'px', textAlign: 'center', top: px(1040), fontFamily: '"Instrument Serif"', fontStyle: 'italic', fontSize: '76px', color: C.goldLt, zIndex: 7, whiteSpace: 'nowrap' }); l2.textContent = 'Your Matcha Moment';
  const l3 = line(root, 'كافيه في بني سويف', AR, 64, C.cream, centered(1135), { zIndex: 7, opacity: 0.95 });
  const stars = Array.from({ length: 16 }, (_, i) => { const r = rng(90 + i); const sNode = el('svg', { width: 40, height: 40, viewBox: '-20 -20 40 40', style: { position: 'absolute', left: px(r() * W), top: px(200 + r() * 1100), zIndex: 6, overflow: 'visible' } }, root); el('path', { d: 'M 0 -18 Q 2 -2 18 0 Q 2 2 0 18 Q -2 2 -18 0 Q -2 -2 0 -18 Z', fill: i % 2 ? C.goldLt : C.lime }, sNode); return { node: sNode, ph: r() * 6, s: 0.5 + r() * 0.9 }; });
  const flood = div(root, { width: W + 'px', height: H + 'px', background: C.lime, opacity: 0, zIndex: 9, mixBlendMode: 'screen' });
  S.brand = { root, logo, l1, l2, l3, cup, cupG, stars, f1, f2, flood, conf: confetti(root, W / 2, 620, 20.12, { count: 60 }) };
}, render(t) {
  const s = S.brand, u = t - 20.0;
  const lp = spr(t, 20.0, 0.7, 0.3);
  s.logo.style.transform = `scale(${lerp(0.5, 1, clamp(lp, 0, 1.15)).toFixed(4)}) translateY(${(Math.sin(t * 1.2) * 3).toFixed(2)}px)`; s.logo.style.opacity = String(clamp(lp * 2));
  dblur(s.logo, 'logo5', 0, 18 * (1 - clamp(lp)));
  s.cup.style.transform = `translateY(${((1 - clamp(spr(t, 20.35, 0.8, 0.3), 0, 1.1)) * 1100 + Math.sin(t * 1.6) * 5).toFixed(1)}px)`;
  s.cupG.style.opacity = String(sm(20.3, 21.0, t));
  playLine(s.l1, t, 20.55, 24.9, { ...soft, exitDur: 99 });
  const q = clamp(spr(t, 20.9, 0.6, 0.25), 0, 1.1); s.l2.style.opacity = String(clamp(q * 2)); s.l2.style.transform = `translateY(${((1 - q) * 30).toFixed(1)}px)`; s.l2.style.letterSpacing = `${(0.18 - 0.14 * clamp(q)).toFixed(3)}em`;
  playLine(s.l3, t, 21.3, 24.9, { ...soft, exitDur: 99 });
  s.stars.forEach((o) => { const v = Math.max(0, Math.sin(t * 3.1 + o.ph)); const on = sm(21.4, 22.0, t); o.node.style.transform = `scale(${(o.s * v * on).toFixed(3)})`; o.node.style.opacity = String(v * on); });
  const draw = sm(20.0, 20.7, t); s.f1.setAttribute('stroke-dasharray', `${(2 * (W + H) * draw).toFixed(0)} 99999`); s.f2.style.opacity = String(0.7 * sm(20.3, 20.9, t));
  s.flood.style.opacity = String(0.9 * bump(t, 19.95, 0.18));
  s.conf.render(t);
} });

// =====================================================================================================
let gTick;
export default {
  duration: 25, fps: FPS,
  init(st, { W: w, H: h }) {
    stage = st; W = w; H = h;
    stage.style.background = C.ink;
    SC.forEach((s) => { s.root = div(stage, { width: px(W), height: px(H), overflow: 'hidden', background: s.bg, zIndex: String(s.z), display: 'none' }); s.init(s.root); });
    S.rope = initRope();
    gTick = grain(stage, { opacity: 0.075, tiles: 8, size: 256, seed: 17 });
    stage.lastChild.style.zIndex = '90';
  },
  render(t, frame) {
    for (const s of SC) {
      const on = t >= s.a && t < s.b;
      if (on) { s.root.style.display = 'block'; s.render(t, frame); } else s.root.style.display = 'none';
    }
    renderRope(t);
    gTick(frame);
  },
};
