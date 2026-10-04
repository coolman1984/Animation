// Film 11 — AI × HR workshop — 25 s showreel-grade motion graphics, 1920×1080 @ 60 fps, 144 BPM (beat = 25 frames, bar = 100 frames).
// One hero: the "×". It starts as the scratch of a storm of paperwork, becomes the multiplier between AI and HR, flips six HR areas from
// "before" to "with AI", spins a ring of workshop ingredients around itself, and ends as the yellow slab of «WORKSHOP COMING SOON».
// Real CSS 3D (perspective, extruded type, flip cards, a cylinder ring, a floor grid), one camera per chapter, impact shakes on the beats.
// Every frame is a closed-form function of t (hash-seeded particles, springs): any frame renders identically in any order.
import { clamp, lerp, ramp, ease, el, textLine } from '../lib/motion.js';
import { springStep, hash } from '../lib/kinetics.js';
import { BEAT, CH, EV } from './timing.js';

const C = { ink: '#030818', deep: '#071336', blue: '#1E6BFF', blueD: '#0B3FCB', cyan: '#4FD8FF', ice: '#BFEFFF', white: '#FFFFFF', yellow: '#FFD21F', yellowD: '#E8A800', warm: '#EFE6D2', grey: '#8CA0C8' };
const AR = "'Alexandria'", MONO = "'Space Mono'";
let W = 1920, H = 1080, SH, FX, fxg;
const SC = [], S = {};

// ---------- helpers ----------
const px = (v) => `${(+v).toFixed(2)}px`;
const oE = ease.outExpo, ioC = ease.inOutCubic, oC = ease.outCubic, ioQ = ease.inOutQuint;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const spr = (t, start, duration = 0.5, bounce = 0.2) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const setBlur = (n, b) => { n.style.filter = b > 0.2 ? `blur(${b.toFixed(2)}px)` : 'none'; };
const T3 = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`;
// a 3D stage: perspective on the shell, the camera node sits at the stage centre (children are centre-relative)
function rig(root, persp = 1500) {
  const p = full(root, { perspective: `${persp}px`, perspectiveOrigin: '50% 50%' });
  const cam = div(p, { left: '960px', top: '540px', width: '0', height: '0', transformStyle: 'preserve-3d' });
  return { p, cam };
}
const obj = (parent, w, h, style = {}) => div(parent, { left: px(-w / 2), top: px(-h / 2), width: px(w), height: px(h), transformStyle: 'preserve-3d', ...style });
// Kinetic line (gate-visible): words as spans, centred in a box.
function words(parent, text, { size, weight = 800, color = C.white, cx = 960, cy, width = 1700, font = AR, dir = 'rtl', track = 0, lh = 1.2, accent = {}, z = 8, shadow = '' } = {}) {
  const L = textLine(parent, text, { left: px(cx - width / 2), top: px(cy - (size * lh) / 2), width: px(width), justifyContent: 'center', fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), letterSpacing: `${track}em`, direction: dir, zIndex: String(z), textShadow: shadow });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; if (dir === 'ltr' && i < L.words.length - 1) w.style.marginInlineEnd = '0.36em'; });
  return L;
}
// slam: a word drops out of the camera with blur, overshoots, settles; exits upward
function slam(L, t, tIn, tOut = 999, { stagger = 0.07, s0 = 2.2, dur = 0.34, blur = 22, outDur = 0.25 } = {}) {
  const vis = t >= tIn - 0.005 && t <= tOut + outDur + L.words.length * 0.03 + 0.02;
  L.line.style.display = vis ? 'flex' : 'none';
  if (!vis) return;
  L.words.forEach((w, i) => {
    const a = tIn + i * stagger, u = clamp((t - a) / dur), e = spr(t, a, dur, 0.28), out = ioC(ramp(t, tOut + i * 0.03, tOut + i * 0.03 + outDur));
    const sc = lerp(s0, 1, clamp(e, 0, 1.12)) * (1 + 0.04 * out);
    w.style.opacity = (clamp(u * 3) * (1 - out)).toFixed(3);
    w.style.transform = `translateY(${(-out * 40).toFixed(1)}px) scale(${sc.toFixed(4)})`;
    setBlur(w, (1 - clamp(e)) * blur + out * 12);
  });
}
// extruded 3D type: stacked copies behind a gradient front face
function extrude(parent, text, { size, weight = 900, font = AR, layers = 26, step = 3.4, side = '#1347C8', sideDark = '#061A55', front = ['#FFFFFF', '#CFEFFF'], glow = 'rgba(79,216,255,0.65)', dir = 'ltr' } = {}) {
  const g = obj(parent, 4, 4, {});
  const mk = (i) => {
    const s = div(g, { left: '0', top: '0', transform: `translate(-50%,-50%) translate3d(0,0,${(-i * step).toFixed(1)}px)`, fontFamily: font, fontSize: px(size), fontWeight: String(weight), lineHeight: '1', whiteSpace: 'nowrap', direction: dir });
    s.textContent = text;
    if (i === 0) { s.style.backgroundImage = `linear-gradient(180deg, ${front[0]} 10%, ${front[1]} 100%)`; s.style.webkitBackgroundClip = 'text'; s.style.backgroundClip = 'text'; s.style.color = 'transparent'; }
    else { if (i === 1 && glow) s.style.textShadow = `0 0 22px ${glow}, 0 0 44px ${glow}`; // glow on the layer behind the face: a text-shadow, not a drop-shadow filter (a filter forces a costly 3D surface)
      const m = i / layers; s.style.color = `rgb(${[0, 1, 2].map((k) => Math.round(lerp(parseInt(side.slice(1 + 2 * k, 3 + 2 * k), 16), parseInt(sideDark.slice(1 + 2 * k, 3 + 2 * k), 16), m))).join(',')})`; }
    return s;
  };
  for (let i = layers; i >= 0; i--) mk(i);
  return g;
}
function icon(parent, paths, size, color, sw = 4) {
  const sv = el('svg', { viewBox: '0 0 100 100', style: { position: 'absolute', left: '0', top: '0', width: px(size), height: px(size), overflow: 'visible' } }, parent);
  el('path', { d: paths, fill: 'none', stroke: color, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
  return sv;
}
const IC = {
  doc: 'M25 12 H60 L78 30 V88 H25 Z M60 12 V30 H78 M35 48 H68 M35 60 H68 M35 72 H55',
  mag: 'M42 46 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 M54 58 L74 78',
  stack: 'M30 18 H66 V70 H30 Z M38 26 H74 V78 H38 Z M46 34 H82 V86 H46 Z',
  check: 'M30 52 L45 67 L72 36',
  pen: 'M22 82 L28 62 L68 22 L80 34 L40 74 Z M60 30 L72 42',
  grid: 'M15 20 H85 V80 H15 Z M15 40 H85 M15 60 H85 M42 20 V80 M63 20 V80',
  bars: 'M22 82 V58 M42 82 V40 M62 82 V24 M82 82 V46',
  clip: 'M25 20 H75 V88 H25 Z M38 12 H62 V28 H38 Z M35 48 H65 M35 60 H65 M35 72 H55',
  radar: 'M50 12 L83 31 V69 L50 88 L17 69 V31 Z M50 30 L68 41 V59 L50 70 L32 59 V41 Z',
  clock: 'M50 50 m-32 0 a32 32 0 1 0 64 0 a32 32 0 1 0 -64 0 M50 28 V50 L66 58',
  gear: 'M50 36 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M50 10 V22 M50 78 V90 M10 50 H22 M78 50 H90 M22 22 L31 31 M69 69 L78 78 M78 22 L69 31 M31 69 L22 78 M50 66 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0',
  spark: 'M50 12 L57 43 L88 50 L57 57 L50 88 L43 57 L12 50 L43 43 Z',
  board: 'M14 18 H86 V58 H14 Z M50 58 V72 M34 88 L50 72 L66 88',
  chat: 'M14 20 H86 V62 H48 L30 82 V62 H14 Z M30 38 H70 M30 48 H56',
  people: 'M35 36 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M65 36 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 M10 84 C10 60 60 60 60 84 M40 84 C40 64 90 64 90 84',
  live: 'M50 50 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 M28 28 A32 32 0 0 0 28 72 M72 28 A32 32 0 0 1 72 72 M16 16 A48 48 0 0 0 16 84 M84 16 A48 48 0 0 1 84 84',
  cases: 'M16 30 H84 V84 H16 Z M36 30 V18 H64 V30 M16 54 H84 M46 54 V62 H54 V54',
  tmpl: 'M20 12 H62 L80 30 V88 H20 Z M62 12 V30 H80 M30 44 H70 M30 56 H70 M30 68 H52',
  hands: 'M14 62 L34 42 L52 52 L70 34 L86 50 M30 70 L44 84 M48 64 L58 76 M64 56 L74 66',
  qa: 'M14 20 H66 V54 H34 L20 68 V54 H14 Z M46 62 H86 V92 H78 V80 L66 92 H46 Z',
  gift: 'M16 44 H84 V88 H16 Z M10 30 H90 V44 H10 Z M50 30 V88 M50 30 C30 8 22 28 50 30 C78 28 70 8 50 30',
  mega: 'M16 40 L66 18 V82 L16 60 Z M16 40 H8 V60 H16 M30 60 L36 84 H48 L44 66',
};

// ---------- camera shake on the beats (decaying, deterministic) ----------
const HITS = [[EV.words1[0], 1], [EV.words1[1], 0.8], [EV.words1[2], 1.1], [EV.flash, 1.6], [EV.slash, 1.0], [EV.title, 1.5], [EV.xspin, 0.9], [CH.flip, 0.8], [CH.ring, 1.0], [CH.mega, 1.2], [EV.wipe1, 1.0], [EV.wipe2, 0.9], [EV.wipe3, 0.9], [CH.end, 1.8], [EV.soon, 1.0]];
function shake(t) {
  let x = 0, y = 0, r = 0;
  for (const [t0, a] of HITS) { const tau = t - t0; if (tau < 0 || tau > 0.55) continue; const d = Math.exp(-tau * 9) * a; x += Math.sin(tau * 75 + t0) * 13 * d; y += Math.cos(tau * 83 + t0 * 2) * 11 * d; r += Math.sin(tau * 61) * 0.5 * d; }
  return [x, y, r];
}

// =====================================================================================================
// WORLD — the dark glass room: radial glow, a perspective floor grid that travels toward the camera, drifting dust
SC.push({ id: 'world', a: 0, b: 25.1, z: 1, init(root) {
  const bg = full(root, { background: 'radial-gradient(ellipse 70% 70% at 50% 46%, #14306E 0%, #0A1B4A 38%, #040B22 78%, #02050F 100%)' });
  const hz = div(root, { left: '0', top: '470px', width: px(W), height: '240px', background: 'linear-gradient(180deg, rgba(79,216,255,0), rgba(79,216,255,0.28), rgba(79,216,255,0))', zIndex: '1' });
  const floorP = full(root, { perspective: '700px', perspectiveOrigin: '50% 40%', zIndex: '1', overflow: 'hidden' });
  const floor = div(floorP, { left: '-1200px', top: '540px', width: px(W + 2400), height: '3000px', transformOrigin: '50% 0', transform: 'rotateX(78deg)',
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(120,190,255,0.5) 0 2px, transparent 2px 110px), repeating-linear-gradient(90deg, rgba(120,190,255,0.5) 0 2px, transparent 2px 110px)', maskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 100%)', webkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 100%)' });
  const ceilP = full(root, { perspective: '700px', perspectiveOrigin: '50% 60%', zIndex: '1', overflow: 'hidden', opacity: '0.5' });
  const ceil = div(ceilP, { left: '-1200px', top: '-3000px', width: px(W + 2400), height: '3540px', transformOrigin: '50% 100%', transform: 'rotateX(-78deg)',
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(120,190,255,0.35) 0 2px, transparent 2px 110px), repeating-linear-gradient(90deg, rgba(120,190,255,0.35) 0 2px, transparent 2px 110px)', maskImage: 'linear-gradient(0deg, transparent 0%, #000 25%, #000 100%)', webkitMaskImage: 'linear-gradient(0deg, transparent 0%, #000 25%, #000 100%)' });
  const dust = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '2' } }, root);
  S.world = { bg, hz, floor, ceil, dg: dust.getContext('2d') };
}, render(t) {
  const s = S.world, speed = 60 + 520 * sm(0, 3.2, t) + 380 * sm(CH.ring - 0.3, CH.ring + 2, t) - 420 * sm(CH.mega - 0.2, CH.mega + 0.4, t) + 560 * sm(CH.end - 1, CH.end, t);
  const dist = 60 * t + 0.5 * (520 * 3.2) * Math.max(0, ramp(t, 0, 3.2)) ** 2 * 0.3 + 90 * Math.max(0, t - 3.2) + 0.1 * speed * t;
  s.floor.style.backgroundPosition = `0 ${(dist % 110).toFixed(1)}px`; s.ceil.style.backgroundPosition = `0 ${(-dist % 110).toFixed(1)}px`;
  s.hz.style.opacity = (0.5 + 0.5 * sm(CH.title - 0.2, CH.title + 0.4, t)).toFixed(3);
  // chapter tint
  const hue = t < CH.brain ? 0 : t < CH.title ? -10 : t < CH.ring ? 0 : t < CH.mega ? 12 : 0;
  s.bg.style.filter = `hue-rotate(${hue}deg) brightness(${(0.95 + 0.25 * sm(CH.end - 0.1, CH.end + 0.3, t)).toFixed(3)})`;
  const g = s.dg; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { const sp = 12 + hash(i, 1) * 40, x = (hash(i, 2) * W + t * sp * (hash(i, 3) < 0.5 ? 1 : -1)) % W, y = (hash(i, 4) * H - t * sp * 0.6 + H * 4) % H, r = 1 + hash(i, 5) * 2.6;
    g.globalAlpha = 0.12 + 0.28 * hash(i, 6) * (0.5 + 0.5 * Math.sin(t * 2 + i)); g.fillStyle = i % 5 === 0 ? C.yellow : C.cyan; g.beginPath(); g.arc(x < 0 ? x + W : x, y, r, 0, 6.283); g.fill(); }
  g.globalAlpha = 1;
} });

// =====================================================================================================
// 1 · STORM 0–3.33 — a tunnel of paperwork rushes the camera: «الـ HR بيتغير بسرعة…»
const PAPER_TEXT = ['Reports…', 'Follow ups…', 'Manual work…', 'So many tasks…'];
const N_PAPER = 38;
SC.push({ id: 'storm', a: 0, b: CH.brain + 0.4, z: 3, init(root) {
  const { cam } = rig(root, 1400);
  const papers = Array.from({ length: N_PAPER }, (_, i) => {
    const n = obj(cam, 360, 470, { background: 'linear-gradient(160deg, #FFFFFF, #E9EEF8)', borderRadius: '10px', boxShadow: '0 0 40px rgba(79,216,255,0.35)', transformStyle: 'preserve-3d' });
    div(n, { left: '28px', top: '30px', width: '150px', height: '18px', background: C.blue, borderRadius: '4px' });
    for (let k = 0; k < 7; k++) div(n, { left: '28px', top: px(86 + k * 40), width: px(160 + hash(i, k) * 140), height: '10px', background: 'rgba(30,60,120,0.28)', borderRadius: '5px' });
    if (i % 4 === 0) { const L = div(n, { left: '24px', top: '170px', width: '320px', fontFamily: AR, fontWeight: '800', fontSize: '50px', color: '#0B1E5A', lineHeight: '1.1', direction: 'ltr', transform: 'rotate(-6deg)' }); L.textContent = PAPER_TEXT[(i / 4) % 4]; }
    return n;
  });
  const hr = words(root, 'الـ HR', { size: 330, weight: 900, cy: 400, accent: { 1: C.yellow }, shadow: '0 0 60px rgba(79,216,255,0.55)' });
  const w2 = words(root, 'بيتغير', { size: 190, weight: 900, cx: 1370, cy: 700, width: 700, shadow: '0 0 40px rgba(0,0,0,0.5)' });
  const w3 = words(root, 'بسرعة…', { size: 190, weight: 900, cx: 520, cy: 700, width: 800, color: C.yellow, shadow: '0 0 40px rgba(0,0,0,0.5)' });
  S.storm = { root, cam, papers, hr, w2, w3 };
}, render(t) {
  const s = S.storm, k = 0.25 * t + 0.2 * Math.pow(t / 3.2, 3.2) * 3.2;           // integrated speed ramp
  s.papers.forEach((n, i) => {
    const u = (hash(i, 1) + k * (0.6 + 0.8 * hash(i, 2))) % 1, z = lerp(-3400, 980, u), ang = hash(i, 3) * 6.283 + t * 0.35 * (hash(i, 4) - 0.5), rad = 380 + 720 * hash(i, 5);
    n.style.transform = T3(Math.cos(ang) * rad * 1.5, Math.sin(ang) * rad * 0.9, z, 40 * Math.sin(t + i), 60 * Math.sin(t * 0.7 + i * 2) + i * 9, 40 * (hash(i, 6) - 0.5) + t * 30 * (hash(i, 7) - 0.5));
    n.style.opacity = (sm(-3400, -2400, z) * (1 - sm(780, 980, z)) * sm(0, 0.15, t)).toFixed(3);
  });
  s.cam.style.transform = `rotateZ(${(-6 * Math.sin(t * 0.8) * sm(0, 3, t)).toFixed(2)}deg)`;
  slam(s.hr, t, EV.words1[0], EV.flash - 0.05, { s0: 2.6, outDur: 0.12 });
  slam(s.w2, t, EV.words1[1], EV.flash - 0.05, { outDur: 0.12 });
  slam(s.w3, t, EV.words1[2], EV.flash - 0.05, { s0: 2.8, outDur: 0.12 });
} });

// =====================================================================================================
// 2 · BRAIN 3.33–6.67 — «والـ AI مش بقى مجرد Tool»: extruded AI, the word "Tool" is sliced and falls, everything implodes into the ×
SC.push({ id: 'brain', a: CH.brain - 0.02, b: CH.title + 0.1, z: 4, init(root) {
  const { cam } = rig(root, 1500);
  const core = obj(cam, 900, 900, { borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(79,216,255,0.55), rgba(30,107,255,0.25) 55%, rgba(30,107,255,0))' });
  const ring1 = obj(cam, 1100, 1100, { borderRadius: '50%', border: '3px solid rgba(79,216,255,0.8)' }), ring2 = obj(cam, 760, 760, { borderRadius: '50%', border: '2px dashed rgba(255,210,31,0.8)' });
  const ai = extrude(cam, 'AI', { size: 520, font: AR, layers: 30, step: 3.6, front: ['#FFFFFF', '#9FE6FF'], side: '#1B63F0', sideDark: '#071B66' });
  const wla = words(root, 'والـ', { size: 150, weight: 700, cx: 1240, cy: 390, width: 400, shadow: '0 0 30px rgba(0,0,0,0.5)' });
  const m = words(root, 'مش بقى مجرد', { size: 128, weight: 900, cx: 1290, cy: 700, width: 800, shadow: '0 0 30px rgba(0,0,0,0.5)' });
  const tl = div(root, { left: px(400 - 360), top: px(700 - 130), width: '720px', height: '260px', zIndex: '9' });
  const toolA = div(tl, { width: '720px', height: '260px', clipPath: 'polygon(0 0, 100% 0, 0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: AR, fontWeight: '900', fontSize: '190px', color: '#C7D4F2', textShadow: '0 0 30px rgba(0,0,0,0.5)', direction: 'ltr' });
  const toolB = div(tl, { width: '720px', height: '260px', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: AR, fontWeight: '900', fontSize: '190px', color: '#C7D4F2', textShadow: '0 0 30px rgba(0,0,0,0.5)', direction: 'ltr' });
  toolA.textContent = 'Tool'; toolB.textContent = 'Tool';
  const slab = div(root, { left: px(-300), top: px(690), width: '1900px', height: '120px', background: `linear-gradient(90deg, ${C.yellowD}, ${C.yellow} 30%, #FFE97A)`, transform: 'rotate(-14deg) skewX(-20deg)', transformOrigin: '0 50%', zIndex: '11', opacity: '0', boxShadow: '0 0 60px rgba(255,210,31,0.7)' });
  const use = words(root, 'نستخدمه وقت الحاجة', { size: 78, weight: 500, color: C.grey, cy: 930, width: 1300 });
  S.brain = { root, cam, core, ring1, ring2, ai, wla, m, tl, toolA, toolB, slab, use };
}, render(t) {
  const s = S.brain, sw = 5 * 0; void sw;
  const imp = ioQ(ramp(t, EV.implode, CH.title)), pop = spr(t, EV.ai, 0.7, 0.3);
  // AI flies out of the camera, spins, settles; implodes at the end
  const ay = lerp(180, 0, clamp(pop)), az = lerp(1100, 0, clamp(pop, 0, 1.1)) - 1500 * imp, spin = lerp(220, 0, clamp(pop, 0, 1.05)) + 12 * Math.sin((t - EV.ai) * 1.4);
  s.ai.style.transform = T3(-220 * (1 - imp), -170 * (1 - imp), az, -8 * Math.sin((t - EV.ai) * 1.1), spin, 0, (1 - 0.7 * imp));
  s.ai.style.opacity = (sm(EV.ai - 0.02, EV.ai + 0.06, t) * (1 - sm(CH.title - 0.18, CH.title - 0.02, t))).toFixed(3);
  s.core.style.transform = T3(0, 0, -400, 0, 0, 0, 0.9 + 0.12 * Math.sin(t * 5) + 1.6 * imp);
  s.core.style.opacity = (sm(EV.ai - 0.1, EV.ai + 0.2, t) * (1 - sm(CH.title - 0.05, CH.title + 0.08, t))).toFixed(3);
  s.ring1.style.transform = T3(0, 0, -300, 72, 0, t * 70, 1 - 0.9 * imp); s.ring2.style.transform = T3(0, 0, -300, 72, 0, -t * 110, 1 - 0.9 * imp);
  const rg = sm(EV.ai + 0.1, EV.ai + 0.5, t) * (1 - sm(CH.title - 0.2, CH.title, t)); s.ring1.style.opacity = (rg * 0.8).toFixed(3); s.ring2.style.opacity = (rg * 0.7).toFixed(3);
  slam(s.wla, t, EV.ai + 0.1, EV.implode - 0.05, { s0: 1.6, outDur: 0.18 });
  slam(s.m, t, EV.mashi, EV.implode - 0.05, { s0: 2.0, outDur: 0.18 });
  // "Tool": glitch in, then the yellow slab slices it diagonally; both halves fall away
  const tIn = sm(EV.tool, EV.tool + 0.12, t), glitch = t > EV.tool && t < EV.slash ? 10 * Math.sin(t * 90) * hash(Math.round(t * 60), 9) : 0;
  const cut = ioC(ramp(t, EV.slash + 0.08, EV.slash + 0.7)), fade = 1 - sm(EV.slash + 0.35, EV.slash + 0.75, t);
  s.tl.style.display = t >= EV.tool && t < EV.slash + 0.9 ? 'block' : 'none';
  s.toolA.style.transform = `translate(${(glitch - 360 * cut).toFixed(1)}px, ${(-260 * cut).toFixed(1)}px) rotate(${(-26 * cut).toFixed(1)}deg)`;
  s.toolB.style.transform = `translate(${(-glitch + 330 * cut).toFixed(1)}px, ${(420 * cut * cut + 40 * cut).toFixed(1)}px) rotate(${(32 * cut).toFixed(1)}deg)`;
  s.toolA.style.opacity = (tIn * fade).toFixed(3); s.toolB.style.opacity = (tIn * fade).toFixed(3);
  const sl = ramp(t, EV.slash - 0.02, EV.slash + 0.22);
  s.slab.style.display = sl > 0 && sl < 1 ? 'block' : 'none'; s.slab.style.opacity = '1';
  s.slab.style.transform = `translateX(${lerp(-200, 2200, oE(sl)).toFixed(0)}px) rotate(-14deg) skewX(-20deg)`;
  s.slab.style.top = px(690 - 60 + 40 * (1 - sl));
  slam(s.use, t, EV.tail, EV.implode - 0.05, { s0: 1.25, blur: 12, outDur: 0.18 });
} });

// =====================================================================================================
// 3 · TITLE 6.67–10 — AI × HR in extruded 3D with an orbiting camera, a glossy floor reflection, the subtitle, the two hosts
SC.push({ id: 'title', a: CH.title - 0.02, b: CH.flip + 0.2, z: 5, init(root) {
  const { cam } = rig(root, 1700);
  const stageG = obj(cam, 10, 10, {});
  const mkLetters = (parent, flip) => {
    const g = obj(parent, 10, 10, flip ? { transform: 'scaleY(-1)' } : {});
    const ai = div(g, { left: '0', top: '0', transformStyle: 'preserve-3d' }), x = div(g, { left: '0', top: '0', transformStyle: 'preserve-3d' }), hr = div(g, { left: '0', top: '0', transformStyle: 'preserve-3d' });
    const A = extrude(ai, 'AI', { size: 560, layers: flip ? 5 : 20, step: flip ? 23 : 5.8, front: ['#FFFFFF', '#8FE3FF'], side: '#1A5FEF', sideDark: '#071B66', glow: flip ? null : 'rgba(79,216,255,0.7)' });
    const X = extrude(x, '×', { size: 460, layers: flip ? 4 : 16, step: flip ? 24 : 6, front: ['#FFF3A8', '#FFD21F'], side: '#E8A800', sideDark: '#7A4A00', glow: flip ? null : 'rgba(255,210,31,0.7)' });
    const R = extrude(hr, 'HR', { size: 560, layers: flip ? 5 : 20, step: flip ? 23 : 5.8, front: ['#FFFFFF', '#DCE6FF'], side: '#3C58B8', sideDark: '#0B1C5C', glow: flip ? null : 'rgba(255,255,255,0.4)' });
    return { g, ai, x, hr };
  };
  const main = mkLetters(stageG, false);
  const refl = obj(cam, 10, 10, { transform: 'translate3d(0,470px,0)', opacity: '0.16', maskImage: 'linear-gradient(0deg, transparent 0%, #000 100%)', webkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 90%)' });
  const rl = mkLetters(refl, true);
  const sub = words(root, 'From HR Professional to AI-Powered HR Professional', { size: 62, weight: 600, font: AR, dir: 'ltr', cy: 790, width: 1700, accent: { 3: C.cyan, 4: C.cyan }, shadow: '0 0 30px rgba(0,0,0,0.45)' });
  const pill = div(root, { left: px(960 - 520), top: px(880 - 52), width: '1040px', height: '104px', borderRadius: '52px', border: `4px solid ${C.cyan}`, background: 'rgba(8,24,70,0.7)', boxShadow: '0 0 40px rgba(79,216,255,0.45)', zIndex: '7' });
  const pl = words(root, 'مشروع جديد .. ورشة عمل جديدة', { size: 66, weight: 800, cy: 880, width: 1000, z: 9 });
  const host = (name, role, x, side) => {
    const b = div(root, { left: px(x - 400), top: px(930), width: '800px', height: '120px', zIndex: '7' });
    div(b, { left: px(side > 0 ? 0 : 796), top: '10px', width: '4px', height: '100px', background: C.yellow });
    const n = words(b, name, { size: 62, weight: 900, font: AR, dir: 'ltr', cy: 40, cx: 400, width: 760, lh: 1.05, color: C.white });
    const r = words(b, role, { size: 34, weight: 500, font: AR, dir: 'ltr', cy: 96, cx: 400, width: 760, lh: 1.1, color: C.cyan });
    for (const L of [n, r]) { L.line.style.left = px(20); L.line.style.width = px(760); L.line.style.justifyContent = side > 0 ? 'flex-start' : 'flex-end'; }
    return { b, n, r, x, side };
  };
  const h1 = host('Ayman Essam', 'RBA, PHRi', 480, 1), h2 = host('Mohamed Fawzy', 'AI Automation | Lecturer', 1440, -1);
  void h1; void h2;
  S.title = { root, cam, stageG, main, refl, rl, sub, pill, pl, h1, h2 };
}, render(t) {
  const s = S.title, u = t - CH.title, ex = spr(t, CH.title, 0.7, 0.25), xs = spr(t, EV.xspin, 0.75, 0.3);
  const orbit = lerp(-26, 9, ioC(clamp(u / 3.4))), dolly = lerp(-260, 60, ioC(clamp(u / 3.4)));
  s.cam.style.transform = `translate3d(0,0,${dolly}px) rotateX(-4deg) rotateY(${orbit}deg)`;
  const place = (L, ox, oz, e) => { L.ai.style.transform = T3(-460 - (1 - clamp(e)) * 900, -40, oz, 0, (1 - clamp(e)) * 80, 0); L.hr.style.transform = T3(430 + (1 - clamp(e)) * 900, -40, oz, 0, -(1 - clamp(e)) * 80, 0); };
  place(s.main, 0, 0, ex); place(s.rl, 0, 0, ex);
  const xr = lerp(-540, 0, clamp(xs, 0, 1.1)), xsz = lerp(0.1, 1, clamp(xs, 0, 1.15));
  for (const L of [s.main, s.rl]) L.x.style.transform = T3(0, -40, 60, 0, xr * 1.0 + 12 * Math.sin(t * 2), -30 * Math.sin(t * 1.3) + (1 - clamp(xs)) * 720, xsz);
  s.stageG.style.opacity = sm(CH.title - 0.02, CH.title + 0.05, t).toFixed(3);
  const ro = 0.16 * sm(CH.title + 0.2, CH.title + 0.8, t); s.refl.style.opacity = ro.toFixed(3); s.refl.style.display = ro > 0.002 ? 'block' : 'none'; // the mirrored copy costs a full 3D pass: skip it while invisible
  const out = ioC(ramp(t, CH.flip - 0.12, CH.flip + 0.12));
  s.root.style.opacity = (1 - out).toFixed(3);
  slam(s.sub, t, EV.sub, CH.flip - 0.14, { stagger: 0.06, s0: 1.35, blur: 12, dur: 0.4, outDur: 0.12 });
  const pi = spr(t, EV.pill, 0.5, 0.22);
  s.pill.style.opacity = (clamp(pi * 2) * (1 - out)).toFixed(3); s.pill.style.transform = `scaleX(${lerp(0.2, 1, clamp(pi, 0, 1.08)).toFixed(3)})`; s.pill.style.display = t >= EV.pill - 0.02 ? 'block' : 'none';
  slam(s.pl, t, EV.pill + 0.1, CH.flip - 0.14, { stagger: 0.09, s0: 1.4, blur: 10, outDur: 0.12 });
  [s.h1, s.h2].forEach((h, i) => { const p = spr(t, EV.hosts + i * 0.12, 0.55, 0.2); h.b.style.display = t >= EV.hosts - 0.02 && t < CH.flip + 0.1 ? 'block' : 'none'; h.b.style.opacity = (clamp(p * 2) * (1 - out)).toFixed(3); h.b.style.transform = `translateX(${((1 - clamp(p)) * (i ? 600 : -600)).toFixed(1)}px)`;
    for (const L of [h.n, h.r]) { L.line.style.display = h.b.style.display; L.words.forEach((w) => { w.style.opacity = (clamp(p * 2) * (1 - out)).toFixed(3); }); } });
} });

// =====================================================================================================
// 4 · FLIP 10–15 — Traditional HR → AI-Powered HR: six areas flip on the beat (the poster's before / after, word for word)
const AREAS = [
  { en: 'Recruitment & Selection', ar: 'التوظيف والاختيار', oEn: 'Manual screening and traditional methods', oAr: 'فرز يدوي ومقابلات تقليدية', nEn: 'AI Screening & Shortlisting', nAr: 'فرز ومقابلات مدعومة بالذكاء الاصطناعي', oi: [IC.stack, IC.mag], ni: [IC.doc, IC.check, IC.spark] },
  { en: 'Job Description', ar: 'الوصف الوظيفي', oEn: 'Write from scratch', oAr: 'كتابة من الصفر وتعديل يدوي', nEn: 'Generate & Optimize with AI', nAr: 'إنشاء وتحسين باستخدام AI', oi: [IC.doc, IC.pen], ni: [IC.doc, IC.spark] },
  { en: 'HR Analytics', ar: 'تحليلات الموارد البشرية', oEn: 'Excel reports and manual analysis', oAr: 'تقارير وتحليل Excel يدوي', nEn: 'Interactive Dashboards & Insights', nAr: 'لوحة بيانات تفاعلية ورؤى فورية', oi: [IC.grid], ni: [IC.bars, IC.spark] },
  { en: 'Performance Management', ar: 'إدارة الأداء', oEn: 'Track data manually', oAr: 'متابعة الأرقام والتقارير بشكل تقليدي', nEn: 'Analyze, Identify Gaps & Get Recommendations', nAr: 'تحليل الأداء وتحديد الفجوات وتقديم توصيات', oi: [IC.clip], ni: [IC.radar, IC.star || IC.spark] },
  { en: 'HR Operations', ar: 'العمليات والمهام الإدارية', oEn: 'Routine tasks & follow ups', oAr: 'مهام روتينية ومتابعات مستمرة', nEn: 'Automation & Smart Support', nAr: 'أتمتة المهام ودعم ذكي', oi: [IC.clock, IC.stack], ni: [IC.gear, IC.spark] },
  { en: 'Training · Employee Communication', ar: 'التدريب والتواصل مع الموظفين', oEn: '', oAr: '', nEn: 'Now AI-powered too', nAr: 'والذكاء الاصطناعي هنا برضه', oi: [IC.board], ni: [IC.chat, IC.people] },
];
const FLIP = EV.flipStep;
SC.push({ id: 'flip', a: CH.flip - 0.2, b: CH.ring + 0.25, z: 6, init(root) {
  const { cam } = rig(root, 1700);
  const frame = obj(cam, 1640, 760, { transform: 'translate3d(0,40px,0)' });
  const L0 = div(frame, { left: '0', top: '0', width: '820px', height: '760px', background: 'linear-gradient(160deg, #F4EBD9, #D8CBAE)', borderRadius: '30px 0 0 30px', boxShadow: 'inset 0 0 80px rgba(120,90,40,0.25)' });
  const R0 = div(frame, { left: '820px', top: '0', width: '820px', height: '760px', background: 'linear-gradient(160deg, #1C58E8, #0A2A8C 70%, #071B66)', borderRadius: '0 30px 30px 0', boxShadow: '0 0 80px rgba(79,216,255,0.35), inset 0 0 60px rgba(79,216,255,0.25)' });
  void L0; void R0;
  const hdr = ['Traditional HR', 'AI-Powered HR'].map((txt, i) => { const L = words(root, txt, { size: 52, weight: 900, font: AR, dir: 'ltr', cy: 118, cx: i ? 1330 : 590, width: 700, color: i ? C.cyan : C.warm, z: 9 }); return L; });
  const sub = ['Keep things running', 'Work Smarter. Create More Impact.'].map((txt, i) => words(root, txt, { size: 30, weight: 500, font: AR, dir: 'ltr', cy: 168, cx: i ? 1330 : 590, width: 760, color: i ? C.ice : C.grey, z: 9 }));
  const chev = el('svg', { viewBox: '0 0 120 60', style: { position: 'absolute', left: px(960 - 60), top: px(60), width: '120px', height: '60px', overflow: 'visible', zIndex: '9' } }, root);
  const cp = [0, 1, 2].map((i) => el('path', { d: `M${10 + i * 30} 8 L${34 + i * 30} 30 L${10 + i * 30} 52`, fill: 'none', stroke: C.yellow, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, chev));
  const dots = AREAS.map((a, i) => div(root, { left: px(960 - 150 + i * 60 - 9), top: '1005px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', zIndex: '9' }));
  const fit = (txt, maxW, base, k = 0.56) => Math.min(base, Math.floor(maxW / (Math.max(1, [...txt].length) * k)));
  const cards = AREAS.map((a, i) => {
    const c = div(frame, { left: '0', top: '0', width: '1640px', height: '760px', transformStyle: 'preserve-3d', transformOrigin: '50% 100%' });
    div(c, { left: '0', top: '0', width: '1640px', height: '206px', background: 'linear-gradient(90deg, rgba(5,16,60,0.94), rgba(10,44,140,0.94))', borderRadius: '30px 30px 0 0', borderBottom: `4px solid ${C.yellow}` });
    const name = words(c, a.en, { size: fit(a.en, 1500, 76, 0.6), weight: 900, font: AR, dir: 'ltr', cy: 78, cx: 820, width: 1600, color: C.white, z: 10 });
    const nameAr = words(c, a.ar, { size: 48, weight: 700, cy: 152, cx: 820, width: 1600, color: C.yellow, z: 10 });
    const oldSide = div(c, { left: '0', top: '0', width: '820px', height: '760px' }), newSide = div(c, { left: '820px', top: '0', width: '820px', height: '760px' });
    const oIc = div(oldSide, { left: '280px', top: '250px', width: '260px', height: '260px' }); a.oi.forEach((p) => icon(oIc, p, 260, '#3A2E18', 3.4));
    const nIc = div(newSide, { left: '280px', top: '250px', width: '260px', height: '260px' }); a.ni.forEach((p, k) => icon(nIc, p, 260, k === a.ni.length - 1 && k > 0 ? C.yellow : C.ice, 3.4));
    const ot = a.oEn ? words(oldSide, a.oEn, { size: fit(a.oEn, 740, 46), weight: 700, font: AR, dir: 'ltr', cy: 590, cx: 410, width: 780, color: '#3A2E18', lh: 1.15, z: 10 }) : null;
    const otA = a.oAr ? words(oldSide, a.oAr, { size: fit(a.oAr, 740, 40, 0.5), weight: 600, cy: 666, cx: 410, width: 780, color: '#5B4A28', z: 10 }) : null;
    const nt = words(newSide, a.nEn, { size: fit(a.nEn, 740, 46), weight: 800, font: AR, dir: 'ltr', cy: 590, cx: 410, width: 780, color: '#FFFFFF', lh: 1.15, z: 10 });
    const ntA = words(newSide, a.nAr, { size: fit(a.nAr, 740, 40, 0.5), weight: 600, cy: 666, cx: 410, width: 780, color: C.ice, z: 10 });
    const badge = div(newSide, { left: '590px', top: '262px', width: '130px', height: '72px', borderRadius: '36px', background: C.yellow, color: '#0A1A52', fontFamily: AR, fontWeight: '900', fontSize: '44px', textAlign: 'center', lineHeight: '72px' }); badge.textContent = 'AI';
    return { c, name, nameAr, oIc, nIc, oldSide, newSide, ot, otA, nt, ntA, badge };
  });
  S.flip = { root, cam, frame, hdr, sub, chev, cp, dots, cards, L0, R0 };
}, render(t) {
  const s = S.flip, u = t - CH.flip, idx = clamp(Math.floor(u / FLIP), 0, AREAS.length - 1);
  const inn = ioC(ramp(t, CH.flip - 0.18, CH.flip + 0.16)), out = ioC(ramp(t, CH.ring - 0.14, CH.ring + 0.14));
  s.root.style.opacity = (inn * (1 - out)).toFixed(3);
  s.cam.style.transform = `translate3d(${(-30 + 60 * ramp(t, CH.flip, CH.ring)).toFixed(1)}px,0,${(lerp(-300, 120, ioC(ramp(t, CH.flip - 0.15, CH.ring)))).toFixed(1)}px) rotateY(${(-6 + 12 * ramp(t, CH.flip, CH.ring)).toFixed(2)}deg)`;
  s.frame.style.transform = `translate3d(0,40px,0) scale(${lerp(0.4, 1, spr(t, CH.flip - 0.15, 0.5, 0.15)).toFixed(3)})`;
  s.cp.forEach((p, i) => p.setAttribute('opacity', (0.35 + 0.65 * Math.max(0, Math.sin((t * 6 - i * 0.9)))).toFixed(2)));
  s.dots.forEach((d, i) => { d.style.background = i <= idx && t >= CH.flip ? C.yellow : 'rgba(255,255,255,0.25)'; d.style.opacity = (inn * (1 - out)).toFixed(3); d.style.transform = i === idx ? `scale(${(1.4 + 0.3 * Math.sin(t * 10)).toFixed(2)})` : 'scale(1)'; });
  for (const L of [...s.hdr, ...s.sub]) { L.line.style.display = 'flex'; L.words.forEach((w) => { w.style.opacity = (inn * (1 - out)).toFixed(3); }); }
  s.cards.forEach((k, i) => {
    const t0 = CH.flip + i * FLIP, t1 = t0 + FLIP, live = t >= t0 - 0.02 && t < t1 + 0.02;
    k.c.style.display = live ? 'block' : 'none';
    if (!live) { for (const L of [k.name, k.nameAr, k.ot, k.otA, k.nt, k.ntA]) if (L) L.line.style.display = 'none'; return; }
    const a = spr(t, t0, 0.42, 0.18), b = ioC(ramp(t, t1 - 0.12, t1 + 0.02)), rx = lerp(88, 0, clamp(a, 0, 1.05)) - (i < AREAS.length - 1 ? 88 * b : 0);
    k.c.style.transform = `rotateX(${rx.toFixed(2)}deg)`; k.c.style.opacity = (1 - 0.0 * b).toFixed(3);
    const vis = clamp((a - 0.3) * 3) * (1 - (i < AREAS.length - 1 ? b : 0));
    for (const L of [k.name, k.nameAr, k.ot, k.otA, k.nt, k.ntA]) if (L) { L.line.style.display = 'flex'; L.words.forEach((w) => { w.style.opacity = vis.toFixed(3); w.style.transform = 'none'; }); }
    // the old icon turns into the new one across the beat
    const m = ioC(ramp(t, t0 + 0.28, t0 + 0.62));
    k.oIc.style.opacity = (1 - 0.55 * m).toFixed(3); k.oIc.style.transform = `scale(${(1 - 0.12 * m).toFixed(3)})`;
    k.nIc.style.opacity = m.toFixed(3); k.nIc.style.transform = `scale(${(0.6 + 0.4 * clamp(spr(t, t0 + 0.28, 0.45, 0.3), 0, 1.2)).toFixed(3)}) rotate(${((1 - m) * -30).toFixed(1)}deg)`;
    k.badge.style.opacity = m.toFixed(3); k.badge.style.transform = `scale(${clamp(spr(t, t0 + 0.4, 0.4, 0.4), 0, 1.3).toFixed(3)})`;
    k.nt.line.style.opacity = m.toFixed(3); k.ntA.line.style.opacity = m.toFixed(3);
  });
} });

// =====================================================================================================
// 5 · RING 15–18.33 — «مش مجرد كلام نظري…»: the workshop's ingredients on a cylinder that spins up around a glowing core
const ING = [
  ['Live Sessions', 'جلسات مباشرة', IC.live], ['Real HR Cases', 'حالات عملية من الواقع', IC.cases], ['Practical Templates', 'نماذج جاهزة', IC.tmpl],
  ['Hands-on Application', 'تطبيق عملي', IC.hands], ['Q&A Sessions', 'جلسات أسئلة وأجوبة', IC.qa], ['Special Surprises', 'مفاجآت خاصة', IC.gift],
];
SC.push({ id: 'ring', a: CH.ring - 0.2, b: CH.mega + 0.2, z: 7, init(root) {
  const { cam } = rig(root, 1300);
  const core = obj(cam, 360, 360, { borderRadius: '50%', background: 'radial-gradient(circle at 38% 35%, #FFFFFF, #7FE3FF 25%, #1E6BFF 70%, #0B3FCB)', boxShadow: '0 0 120px rgba(79,216,255,0.9)' });
  const coreT = div(core, { left: '0', top: '0', width: '360px', height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: AR, fontWeight: '900', fontSize: '150px', color: '#fff', textShadow: '0 0 30px rgba(10,60,200,0.9)' }); coreT.textContent = 'AI×HR'; coreT.style.fontSize = '84px';
  const tracks = [1500, 1180].map((d, i) => obj(cam, d, d, { borderRadius: '50%', border: `${3 - i}px solid rgba(79,216,255,${0.6 - i * 0.2})` }));
  const cards = ING.map(([en, ar, ic], i) => {
    const c = obj(cam, 460, 290, { borderRadius: '24px', background: 'linear-gradient(160deg, rgba(40,100,240,0.92), rgba(10,34,120,0.92))', border: '2px solid rgba(160,230,255,0.9)', boxShadow: '0 0 50px rgba(79,216,255,0.5)', backfaceVisibility: 'visible' });
    const ib = div(c, { left: '30px', top: '50px', width: '124px', height: '124px' }); icon(ib, ic, 124, C.yellow, 4.2);
    div(c, { left: '30px', top: '206px', width: '400px', height: '3px', background: 'rgba(160,230,255,0.5)' });
    const e = div(c, { left: '176px', top: '58px', width: '270px', fontFamily: AR, fontWeight: '800', fontSize: '40px', color: '#fff', lineHeight: '1.12', direction: 'ltr' }); e.textContent = en;
    const a = div(c, { left: '20px', top: '222px', width: '420px', textAlign: 'center', fontFamily: AR, fontWeight: '600', fontSize: '34px', color: C.ice, direction: 'rtl' }); a.textContent = ar;
    return c;
  });
  const h1 = words(root, 'مش مجرد كلام نظري…', { size: 110, weight: 900, cy: 150, width: 1600, shadow: '0 0 40px rgba(0,0,0,0.5)', z: 12 });
  const bar = div(root, { left: px(960 - 640), top: px(938 - 56), width: '1280px', height: '112px', borderRadius: '56px', background: `linear-gradient(90deg, ${C.yellowD}, ${C.yellow} 40%, #FFE97A)`, zIndex: '11', boxShadow: '0 0 60px rgba(255,210,31,0.5)' });
  const h2 = words(root, 'تطبيقات وأدوات وحالات عملية للـ HR.', { size: 62, weight: 900, color: '#0A1A52', cy: 938, width: 1250, z: 12 });
  const lines = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '10', pointerEvents: 'none' } }, root);
  S.ring = { root, cam, core, coreT, tracks, cards, h1, bar, h2, lg: lines.getContext('2d') };
}, render(t) {
  const s = S.ring, u = t - CH.ring, inn = sm(CH.ring - 0.15, CH.ring + 0.1, t), out = ioC(ramp(t, CH.mega - 0.12, CH.mega + 0.12));
  s.root.style.opacity = (inn * (1 - out)).toFixed(3);
  const spin = 760 * (1 - Math.pow(1 - clamp(u / 2.2), 3)) + 28 * Math.max(0, u - 2.2), push = ioQ(ramp(t, EV.ringPush, CH.mega)) * 1400;
  const R = 760, cz = -330 + push * 0.55;
  s.cam.style.transform = `translate3d(0,0,${(push * 0.35).toFixed(1)}px) rotateX(${(-10 + 6 * Math.sin(t * 0.8)).toFixed(2)}deg)`;
  s.core.style.transform = T3(0, 0, cz, 0, 0, 0, (0.4 + 0.6 * clamp(spr(t, CH.ring, 0.6, 0.3), 0, 1.15)) * (1 + 0.05 * Math.sin(t * 12)));
  s.tracks.forEach((n, i) => { n.style.transform = T3(0, 0, cz, 90, 0, t * (40 + 30 * i)); });
  s.cards.forEach((c, i) => {
    const ang = (i * 60 + spin) * Math.PI / 180, x = Math.sin(ang) * R, z = cz + Math.cos(ang) * R, fr = (Math.cos(ang) + 1) / 2;
    const pin = spr(t, CH.ring + 0.05 + i * 0.05, 0.5, 0.25);
    c.style.transform = T3(x, -10 + 14 * Math.sin(t * 3 + i), z, 0, (i * 60 + spin) % 360, 0, clamp(pin, 0, 1.1));
    c.style.opacity = (clamp(pin * 2) * (0.35 + 0.65 * fr)).toFixed(3);
    c.style.filter = fr < 0.35 ? `blur(${((0.35 - fr) * 8).toFixed(1)}px)` : 'none';
  });
  slam(s.h1, t, EV.headline, CH.mega - 0.15, { stagger: 0.09, s0: 1.8, outDur: 0.12 });
  const bp = spr(t, EV.caption, 0.55, 0.22);
  s.bar.style.opacity = (clamp(bp * 2) * (1 - out)).toFixed(3); s.bar.style.transform = `scaleX(${lerp(0.1, 1, clamp(bp, 0, 1.06)).toFixed(3)})`; s.bar.style.display = t >= EV.caption - 0.02 ? 'block' : 'none';
  slam(s.h2, t, EV.caption + 0.12, CH.mega - 0.15, { stagger: 0.07, s0: 1.3, blur: 10, outDur: 0.12 });
  // speed lines during the final push
  const g = s.lg; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const pu = ramp(t, EV.ringPush, CH.mega);
  if (pu > 0) for (let i = 0; i < 90; i++) { const a = hash(i, 11) * 6.283, r0 = 160 + 640 * hash(i, 12), len = 40 + 700 * pu * hash(i, 13); g.globalAlpha = 0.55 * pu * (1 - out); g.strokeStyle = i % 4 ? C.ice : C.yellow; g.lineWidth = 2 + 3 * hash(i, 14); g.beginPath(); g.moveTo(960 + Math.cos(a) * r0, 540 + Math.sin(a) * r0 * 0.62); g.lineTo(960 + Math.cos(a) * (r0 + len), 540 + Math.sin(a) * (r0 + len) * 0.62); g.stroke(); }
  g.globalAlpha = 1;
} });

// =====================================================================================================
// 6 · MEGA 18.33–21.67 — «Bigger Than a Training…» then three colour wipes: مساعد ذكي · عقل ثاني · أتمتة التقارير
SC.push({ id: 'mega', a: CH.mega - 0.1, b: CH.end + 0.2, z: 8, init(root) {
  const b1 = words(root, 'Bigger', { size: 430, weight: 900, font: AR, dir: 'ltr', cy: 400, width: 1800, shadow: '0 0 70px rgba(79,216,255,0.6)' });
  const b2 = words(root, 'Than a Training…', { size: 190, weight: 800, font: AR, dir: 'ltr', cy: 760, width: 1800, color: C.yellow, shadow: '0 0 40px rgba(0,0,0,0.5)' });
  const wipes = [[C.blue, '#fff', 'مساعد ذكي', IC.spark], ['#FFFFFF', '#0A1A52', 'عقل ثاني', IC.people], [C.yellow, '#0A1A52', 'أتمتة التقارير', IC.gear]].map(([bg, fg, txt, ic], i) => {
    const slab = full(root, { background: bg, zIndex: String(20 + i), transform: 'translateX(100%)', display: 'none', overflow: 'hidden' });
    const stripes = div(slab, { left: '0', top: '0', width: px(W), height: px(H), backgroundImage: `repeating-linear-gradient(115deg, rgba(255,255,255,0.0) 0 60px, rgba(${i === 1 ? '10,26,82' : '255,255,255'},0.10) 60px 120px)` });
    void stripes;
    const L = words(slab, txt, { size: [250, 270, 210][i], weight: 900, color: fg, cy: 580, width: 1800, z: 3 });
    const ib = div(slab, { left: px(960 - 130), top: '110px', width: '260px', height: '260px' }); icon(ib, ic, 260, fg, 3.4);
    return { slab, L, ib };
  });
  S.mega = { root, b1, b2, wipes };
}, render(t) {
  const s = S.mega, out = sm(CH.end - 0.05, CH.end + 0.05, t);
  s.root.style.opacity = (1 - out).toFixed(3);
  slam(s.b1, t, EV.bigger, EV.wipe1 - 0.05, { s0: 3.0, blur: 30, dur: 0.4, outDur: 0.1 });
  slam(s.b2, t, EV.than, EV.wipe1 - 0.05, { stagger: 0.09, s0: 2.0, outDur: 0.1 });
  const T = [EV.wipe1, EV.wipe2, EV.wipe3], E = [EV.wipe2, EV.wipe3, CH.end];
  s.wipes.forEach((w, i) => {
    const e = oE(ramp(t, T[i], T[i] + 0.2)), live = t >= T[i] - 0.01 && t < CH.end + 0.1;
    w.slab.style.display = live ? 'block' : 'none';
    w.slab.style.transform = `translateX(${((1 - e) * 100).toFixed(2)}%) skewX(${(-12 * (1 - e)).toFixed(2)}deg)`;
    slam(w.L, t, T[i] + 0.08, 999, { s0: 2.4, blur: 18, dur: 0.32 });
    const ip = spr(t, T[i] + 0.1, 0.4, 0.35); w.ib.style.transform = `scale(${clamp(ip, 0, 1.25).toFixed(3)}) rotate(${((1 - clamp(ip)) * -90).toFixed(1)}deg)`; w.ib.style.opacity = clamp(ip * 2).toFixed(3);
    if (i === 2) w.slab.style.opacity = (1 - out).toFixed(3);
  });
} });

// =====================================================================================================
// 7 · END 21.67–25 — the yellow slab smashes in: WORKSHOP / COMING SOON, the × sits between AI and HR, the call to action
SC.push({ id: 'end', a: CH.end - 0.05, b: 25.1, z: 9, init(root) {
  const { cam } = rig(root, 1600);
  const bg = full(root, { background: 'radial-gradient(ellipse 70% 70% at 50% 46%, #1B4BCB 0%, #0A2A8C 45%, #050F3E 100%)', zIndex: '0' }); root.insertBefore(bg, root.firstChild);
  const logo = obj(cam, 10, 10, {});
  const A = extrude(logo, 'AI', { size: 250, layers: 20, step: 3, front: ['#FFFFFF', '#8FE3FF'], side: '#1A5FEF', sideDark: '#071B66' });
  const X = extrude(logo, '×', { size: 210, layers: 16, step: 3, front: ['#FFF3A8', '#FFD21F'], side: '#E8A800', sideDark: '#7A4A00', glow: 'rgba(255,210,31,0.7)' });
  const R = extrude(logo, 'HR', { size: 250, layers: 20, step: 3, front: ['#FFFFFF', '#DCE6FF'], side: '#3C58B8', sideDark: '#0B1C5C' });
  const slab = div(root, { left: px(960 - 780), top: px(560 - 190), width: '1560px', height: '380px', background: `linear-gradient(90deg, ${C.yellowD}, ${C.yellow} 25%, #FFE97A 60%, ${C.yellow})`, transform: 'skewX(-10deg)', boxShadow: '0 0 90px rgba(255,210,31,0.6)', zIndex: '6' });
  const wk = words(root, 'WORKSHOP', { size: 230, weight: 900, font: AR, dir: 'ltr', cy: 482, width: 1500, color: '#0A1A52', z: 8 });
  const cs = words(root, 'COMING SOON', { size: 138, weight: 900, font: AR, dir: 'ltr', cy: 660, width: 1500, color: '#0A1A52', z: 8 });
  const cta = div(root, { left: px(960 - 620), top: px(880 - 60), width: '1240px', height: '120px', borderRadius: '60px', background: 'linear-gradient(160deg, #FFFFFF, #DCE6FF)', zIndex: '9', boxShadow: '0 0 70px rgba(79,216,255,0.6)' });
  const ctaL = words(root, 'اكتب في الكومنت', { size: 56, weight: 900, color: '#0A1A52', cx: 1270, cy: 880, width: 520, z: 10 });
  const ctaE = words(root, "I'M INTERESTED", { size: 56, weight: 900, color: '#1E4FD8', cx: 690, cy: 880, width: 640, z: 10, dir: 'ltr' });
  div(root, { left: px(960 - 3), top: px(836), width: '6px', height: '88px', background: '#0A1A52', zIndex: '10', opacity: '0.35' });
  const spark = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '12', pointerEvents: 'none' } }, root);
  S.end = { root, cam, bg, logo, A, X, R, slab, wk, cs, cta, ctaL, ctaE, sg: spark.getContext('2d') };
}, render(t) {
  const s = S.end, u = t - CH.end;
  s.bg.style.opacity = sm(CH.end - 0.04, CH.end + 0.02, t).toFixed(3);
  const sl = spr(t, CH.end, 0.5, 0.28);
  s.slab.style.opacity = clamp(sl * 3).toFixed(3); s.slab.style.transform = `skewX(-10deg) scale(${lerp(3.2, 1, clamp(sl, 0, 1.06)).toFixed(3)}) translateY(${(lerp(-40, 0, clamp(sl))).toFixed(1)}px)`;
  s.slab.style.top = px(560 - 190 - 10 * Math.sin(u * 0.9));
  slam(s.wk, t, CH.end + 0.1, 999, { stagger: 0.04, s0: 1.7, blur: 20, dur: 0.38 });
  slam(s.cs, t, EV.soon, 999, { stagger: 0.12, s0: 1.8, blur: 16, dur: 0.38 });
  // lock-up above the slab
  const lg = spr(t, CH.end + 0.2, 0.6, 0.25);
  s.cam.style.transform = `translate3d(0,${(-370).toFixed(0)}px,${(clamp(lg, 0, 1.05) * 120 - 120).toFixed(0)}px) rotateY(${(Math.sin(t * 1.2) * 8).toFixed(2)}deg)`;
  s.A.style.transform = T3(-300, 0, 0); s.X.style.transform = T3(0, 0, 20, 0, 0, t * 40); s.R.style.transform = T3(300, 0, 0);
  s.logo.style.opacity = clamp(lg * 2).toFixed(3);
  const cp = spr(t, EV.cta, 0.55, 0.25);
  s.cta.style.opacity = clamp(cp * 2).toFixed(3); s.cta.style.transform = `scale(${lerp(0.6, 1, clamp(cp, 0, 1.08)).toFixed(3)})`; s.cta.style.display = t >= EV.cta - 0.02 ? 'block' : 'none';
  slam(s.ctaL, t, EV.cta + 0.1, 999, { stagger: 0.06, s0: 1.3, blur: 10, dur: 0.36 }); slam(s.ctaE, t, EV.cta + 0.2, 999, { stagger: 0.06, s0: 1.3, blur: 10, dur: 0.36 });
  const g = s.sg; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) { const tau = u - 0.02 - hash(i, 1) * 0.05; if (tau < 0 || tau > 1.6) continue; const a = hash(i, 2) * 6.283, v = 300 + 1500 * hash(i, 3), d = v * (1 - Math.exp(-tau * 3.2)) / 3.2, x = 960 + Math.cos(a) * d, y = 560 + Math.sin(a) * d * 0.7 + 260 * tau * tau;
    g.globalAlpha = Math.max(0, 1 - tau / 1.6); g.fillStyle = i % 3 ? C.yellow : C.ice; const r = 3 + 6 * hash(i, 4); g.fillRect(x - r / 2, y - r / 2, r, r); }
  g.globalAlpha = 1;
  // slow breathing so the final hold is never frozen
  s.root.style.transform = `scale(${(1 + 0.012 * Math.sin(u * 0.9) + 0.02 * ramp(t, CH.end + 1.2, 25)).toFixed(4)})`;
} });

// =====================================================================================================
export default {
  duration: 25, fps: 60,
  async init(st, { W: w, H: h }) {
    W = w; H = h; st.style.background = C.ink;
    SH = full(st, { overflow: 'hidden', zIndex: '1' });
    SC.forEach((s) => { s.root = full(SH, { overflow: 'hidden', zIndex: String(s.z), display: 'none' }); s.init(s.root); });
    const vig = full(st, { zIndex: '60', pointerEvents: 'none', background: 'radial-gradient(ellipse 85% 85% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,10,0.55) 100%)' });
    S.flash = full(st, { zIndex: '70', background: '#FFFFFF', opacity: '0', pointerEvents: 'none' }); void vig;
    S.shell = SH;
  },
  render(t) {
    for (const s of SC) { const on = t >= s.a && t < s.b; s.root.style.display = on ? 'block' : 'none'; if (on) s.render(t); }
    const [dx, dy, r] = shake(t); S.shell.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(1.03)`;
    const f = (tt, d, a = 1) => a * Math.pow(Math.max(0, 1 - (t - tt) / d), 2) * (t >= tt ? 1 : 0);
    S.flash.style.opacity = Math.min(1, f(EV.flash, 0.22, 1) + f(EV.title, 0.16, 0.7) + f(CH.end, 0.2, 0.9) + f(EV.slash, 0.1, 0.35)).toFixed(3);
  },
};
