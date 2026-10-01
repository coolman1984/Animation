// Film 2 — BALACONBAR "خُد لحظتك" — 60 s Facebook ad, 4:5. Pure renderAt(t).
// Music grid: 90 BPM, 1 bar = 8/3 s. Scenes start on bar lines (see BRIEF.md §3).
import { clamp, lerp, ramp, ease, prog, track, rng, el, show, textLine, playLine, grain, archPath, wavePath } from '../lib/motion.js';

const BAR = 8 / 3;
const P = (f) => new URL(`./plates/${f}`, import.meta.url).href;
const SRC = (f) => new URL(`./source/${f}`, import.meta.url).href;
const C = { cream: '#F6EEDF', teal: '#1F5E55', ink: '#0E1F1C', matcha: '#A8C66C', matchaLight: '#C9DD93' };
const FONT = {
  display: { fontFamily: 'El Messiri', fontWeight: 600 },
  ruqaa: { fontFamily: 'Aref Ruqaa', fontWeight: 700 },
};
const SHADOW = '0 2px 24px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.5)';

let W, H, stage, grainAt;
const S = {}; // scene handles

// ---------- photo layers --------------------------------------------------------------------------
// A layer holds one image in its own pixel space; cam = { cx, cy, s } puts source point (cx, cy) at the
// frame centre at scale s. Parallax: layer depth p < 1 moves and scales less than the camera.
function photo(parent, src, w, h, style = {}) {
  const box = el('div', { class: 'abs', style: { width: w + 'px', height: h + 'px', transformOrigin: '0 0', ...style } }, parent);
  const img = el('img', { src, width: w, height: h, style: { width: w + 'px', height: h + 'px' } }, box);
  return { box, img, w, h };
}
function camT(cam, p = 1, ref = { cx: 800, cy: 800 }) {
  const s = Math.pow(cam.s, p);
  const cx = ref.cx + (cam.cx - ref.cx) * p, cy = ref.cy + (cam.cy - ref.cy) * p;
  return { s, x: W / 2 - cx * s, y: H / 2 - cy * s };
}
function place(layer, cam, p = 1, ref, extra = '') {
  const k = camT(cam, p, ref);
  layer.box.style.transform = `translate(${k.x.toFixed(2)}px, ${k.y.toFixed(2)}px) scale(${k.s.toFixed(5)})${extra}`;
  return k;
}
const proj = (k, x, y) => [k.x + x * k.s, k.y + y * k.s];
// Keep a camera inside its image so the frame is always filled.
function fill(cam, iw, ih) {
  const s = Math.max(cam.s, W / iw, H / ih);
  return { s, cx: clamp(cam.cx, W / 2 / s, iw - W / 2 / s), cy: clamp(cam.cy, H / 2 / s, ih - H / 2 / s) };
}

// The hero photo as three depth layers (background plate, carton, cup) + light sweeps.
function heroGroup(parent) {
  const g = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px' } }, parent);
  const bg = photo(g, P('hero-bg.png'), 1600, 1600);
  const carton = photo(g, P('hero-carton.png'), 1600, 1600);
  const cup = photo(g, P('hero-cup.png'), 1600, 1600);
  const sweep = (maskSrc) => {
    const d = el('div', { class: 'abs', style: {
      width: '1600px', height: '1600px', transformOrigin: '0 0', mixBlendMode: 'screen', pointerEvents: 'none',
      WebkitMaskImage: `url(${maskSrc})`, WebkitMaskSize: '1600px 1600px',
      backgroundImage: 'linear-gradient(105deg, rgba(255,255,255,0) 42%, rgba(255,246,228,0.55) 50%, rgba(255,255,255,0) 58%)',
      backgroundSize: '300% 100%', backgroundRepeat: 'no-repeat',
    } }, g);
    return { box: d };
  };
  const sweepCarton = sweep(P('hero-carton.png'));
  const sweepCup = sweep(P('hero-cup.png'));
  return {
    g, bg, carton, cup, sweepCarton, sweepCup,
    set(cam, { pBg = 0.88, pCarton = 0.97, sweepP = -1, ref } = {}) {
      place(bg, cam, pBg, ref); place(carton, cam, pCarton, ref); const k = place(cup, cam, 1, ref);
      place(sweepCarton, cam, pCarton, ref); place(sweepCup, cam, 1, ref);
      const on = sweepP > 0 && sweepP < 1;
      show(sweepCarton.box, on); show(sweepCup.box, on);
      if (on) {
        const pos = `${lerp(100, -10, sweepP).toFixed(2)}% 0`;
        sweepCarton.box.style.backgroundPosition = pos; sweepCup.box.style.backgroundPosition = pos;
      }
      return k;
    },
  };
}

function svgLayer(parent, style = {}) {
  return el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'abs', style: { overflow: 'visible', pointerEvents: 'none', ...style } }, parent);
}

function archAt(cx, cy, w, h) {
  const r = w / 2, top = cy - h / 2, bot = cy + h / 2;
  return `M ${(cx - r).toFixed(1)} ${bot.toFixed(1)} L ${(cx - r).toFixed(1)} ${(top + r).toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + r).toFixed(1)} ${(top + r).toFixed(1)} L ${(cx + r).toFixed(1)} ${bot.toFixed(1)} Z`;
}
const archLen = (w, h) => Math.PI * w / 2 + 2 * (h - w / 2) + w;

function line(parent, text, font, size, color, style = {}) {
  return textLine(parent, text, { ...font, fontSize: size + 'px', lineHeight: 1.25, color, textShadow: color === C.teal ? 'none' : SHADOW, ...style });
}
const centered = (top) => ({ top: top + 'px', left: '0', width: '100%', justifyContent: 'center' });

// ---------- scenes ----------------------------------------------------------------------------------
const T = {
  s1: [0, 2 * BAR], s2: [2 * BAR, 5 * BAR], s3: [5 * BAR, 8 * BAR], s4: [8 * BAR, 12 * BAR],
  s5: [12 * BAR, 16 * BAR], s6: [16 * BAR, 19 * BAR], s7: [19 * BAR, 60],
};

function initS1() {
  const root = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px' } }, stage);
  const hero = heroGroup(root);
  const top = el('div', { class: 'abs', style: { width: W + 'px', height: '420px', background: 'linear-gradient(180deg, rgba(8,6,4,0.55), rgba(8,6,4,0))' } }, root);
  const l1 = line(root, 'مش أي ماتشا…', FONT.display, 96, C.cream, centered(118));
  S.s1 = { root, hero, top, l1 };
}
const camS1 = (t) => {
  const p = ease.outCubic(ramp(t, 0, T.s1[1]));
  return { cx: lerp(1005, 900, p), cy: lerp(1010, 900, p), s: lerp(1.5, 0.98, p) };
};
function renderS1(t) {
  const { root, hero, top, l1 } = S.s1;
  const vis = t < T.s1[1] + 0.05;
  show(root, vis); if (!vis) return;
  hero.set(camS1(t), { sweepP: ramp(t, 2.0, 3.5) });
  // Isolation hand-off: the world fades away around the cup into the studio (scene 2 underneath).
  const iso = prog(t, T.s1[1] - 0.45, T.s1[1]);
  hero.bg.box.style.opacity = 1 - iso; hero.carton.box.style.opacity = 1 - iso; top.style.opacity = 1 - iso;
  playLine(l1, t, 0.45, 4.45);
}

const CUP_C = [1005, 1150];
function camS2(t) {
  const p = ease.inOutSine(ramp(t, T.s2[0], T.s2[1] + 1));
  const X = lerp(642.9, 715, p), Y = lerp(920, 770, p), s = lerp(0.98, 1.04, p);
  return { cx: CUP_C[0] - (X - W / 2) / s, cy: CUP_C[1] - (Y - H / 2) / s, s };
}
function initS2() {
  const root = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: '#0b0806' } }, stage);
  const back = photo(root, P('hero-bg.png'), 1600, 1600, { filter: 'blur(28px) brightness(0.42) saturate(0.9)' });
  el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: 'radial-gradient(ellipse 46% 38% at 60% 52%, rgba(255,186,110,0.22), rgba(255,186,110,0) 70%), linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.45))' } }, root);
  const shadow = el('div', { class: 'abs', style: { width: '520px', height: '70px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.65), rgba(0,0,0,0))' } }, root);
  const refl = photo(root, P('hero-cup.png'), 1600, 1600, { opacity: 0.17, WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 1240px, rgba(0,0,0,1) 1540px)' });
  const cup = photo(root, P('hero-cup.png'), 1600, 1600);
  const sweep = el('div', { class: 'abs', style: { width: '1600px', height: '1600px', transformOrigin: '0 0', mixBlendMode: 'screen', WebkitMaskImage: `url(${P('hero-cup.png')})`, WebkitMaskSize: '1600px 1600px', backgroundImage: 'linear-gradient(100deg, rgba(255,255,255,0) 44%, rgba(255,246,228,0.45) 50%, rgba(255,255,255,0) 56%)', backgroundSize: '300% 100%', backgroundRepeat: 'no-repeat' } }, root);
  const head = line(root, 'جوّاها إيه؟', FONT.display, 84, C.cream, centered(70));
  const callouts = [
    { label: 'ماتشا', a: [800, 965], tIn: T.s2[0] + 1.15 },
    { label: 'لبن جوز الهند', a: [830, 1352], tIn: T.s2[0] + 3.3 },
    { label: 'بوبا', a: [872, 1480], tIn: T.s2[0] + 5.3 },
  ].map((c) => {
    const dot = el('div', { class: 'abs', style: { width: '18px', height: '18px', borderRadius: '50%', background: C.cream, boxShadow: '0 0 0 6px rgba(246,238,223,0.18), 0 0 18px rgba(255,240,210,0.7)' } }, root);
    const bar = el('div', { class: 'abs', style: { height: '2.5px', background: `linear-gradient(270deg, ${C.cream}, rgba(246,238,223,0.6))`, transformOrigin: '100% 50%', boxShadow: '0 0 8px rgba(0,0,0,0.4)' } }, root);
    const L = line(root, c.label, FONT.display, 52, C.cream, { top: '0', left: '0' });
    return { ...c, dot, bar, L };
  });
  S.s2 = { root, back, shadow, refl, cup, sweep, head, callouts };
}
function renderS2(t) {
  const s2 = S.s2;
  const vis = t >= T.s2[0] - 0.5 && t < 14.5;
  show(s2.root, vis); if (!vis) return;
  s2.root.style.opacity = prog(t, T.s2[0] - 0.45, T.s2[0]);
  const cam = camS2(t);
  place(s2.back, { cx: 1300, cy: 700, s: 1.0 + 0.04 * ramp(t, T.s2[0], 14) }, 1, { cx: 1300, cy: 700 });
  const k = place(s2.cup, cam);
  place(s2.refl, cam, 1, undefined, ' translate(0px, 3096px) scale(1, -1)');
  s2.sweep.style.transform = s2.cup.box.style.transform;
  const sp = ramp(t, 11.2, 12.6); show(s2.sweep, sp > 0 && sp < 1); s2.sweep.style.backgroundPosition = `${lerp(100, -10, sp)}% 0`;
  const [bx, by] = proj(k, 1005, 1556);
  s2.shadow.style.transform = `translate(${(bx - 260 * k.s).toFixed(1)}px, ${(by - 30 * k.s).toFixed(1)}px) scale(${k.s.toFixed(4)}, ${k.s.toFixed(4)})`;
  s2.shadow.style.transformOrigin = '0 0';
  playLine(s2.head, t, T.s2[0] + 0.45, 12.55);
  for (const c of s2.callouts) {
    const [ax, ay] = proj(k, c.a[0], c.a[1]);
    const out = prog(t, 12.6, 13.1);
    const pd = ease.outBack(ramp(t, c.tIn, c.tIn + 0.45));
    const pl = ease.outExpo(ramp(t, c.tIn + 0.15, c.tIn + 0.95));
    const len = 140;
    const on = t >= c.tIn && t < 13.2;
    show(c.dot, on); show(c.bar, on);
    c.dot.style.transform = `translate(${(ax - 9).toFixed(1)}px, ${(ay - 9).toFixed(1)}px) scale(${(pd * (1 - out)).toFixed(4)})`;
    c.bar.style.width = len + 'px';
    c.bar.style.transform = `translate(${(ax - len - 4).toFixed(1)}px, ${(ay - 1.25).toFixed(1)}px) scaleX(${(pl * (1 - out)).toFixed(4)})`;
    c.L.line.style.top = (ay - 38).toFixed(1) + 'px';
    c.L.line.style.left = '0'; c.L.line.style.width = (ax - len - 26).toFixed(1) + 'px'; c.L.line.style.justifyContent = 'flex-start';
    playLine(c.L, t, c.tIn + 0.35, 12.6, { rise: 0, blur: 8 });
    // slide-in from the line end
    c.L.words.forEach((w) => { w.style.transform += ` translateX(${(-24 * (1 - pl)).toFixed(2)}px)`; });
  }
}

function initS3() {
  const root = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: '#0b0806' } }, stage);
  const hero = heroGroup(root);
  const shade = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: 'linear-gradient(200deg, rgba(6,5,4,0.62) 0%, rgba(6,5,4,0.15) 38%, rgba(6,5,4,0) 55%)' } }, root);
  const l1 = line(root, 'جوز الهند × الماتشا', FONT.display, 74, C.cream, { top: '205px', right: '44px', justifyContent: 'flex-start' });
  l1.words[2].style.color = C.matchaLight; l1.words[2].style.fontFamily = 'Montserrat'; l1.words[2].style.fontWeight = 400; l1.words[2].style.fontSize = '82px';
  const l2 = line(root, 'ثنائي… على مزاجك', FONT.ruqaa, 88, C.matchaLight, { top: '314px', right: '44px', justifyContent: 'flex-start' });
  const frame = svgLayer(stage);
  const stroke = el('path', { fill: 'none', stroke: C.cream, 'stroke-width': 3.5, 'stroke-linecap': 'round', style: 'filter: drop-shadow(0 0 10px rgba(255,236,200,0.65))' }, frame);
  S.s3 = { root, hero, shade, l1, l2, frame, stroke };
}
const camS3 = (t) => {
  const p = ease.outCubic(ramp(t, 12.95, T.s3[1] + 0.9));
  return { cx: lerp(900, 885, p), cy: lerp(860, 815, p), s: lerp(1.08, 0.88, p) };
};
function renderS3(t) {
  const s3 = S.s3;
  const vis = t >= 12.7 && t < 21.7;
  show(s3.root, vis); show(s3.frame, vis); if (!vis) return;
  s3.hero.set(camS3(t), { ref: { cx: 885, cy: 815 }, sweepP: ramp(t, 16.2, 17.9) });
  // Portal: the balcony arch draws itself, then opens to fill the frame.
  const cx = 540, cy0 = 650;
  const grow = ease.inOutCubic(ramp(t, 13.45, 14.5));
  const w = lerp(190, 2900, grow), h = lerp(270, 4100, grow), cy = lerp(cy0, cy0 + 600, grow);
  const d = archAt(cx, cy, w, h);
  const peek = prog(t, 13.15, 13.5);
  s3.root.style.clipPath = grow >= 1 ? 'none' : `path('${d}')`;
  s3.root.style.opacity = grow > 0 ? 1 : peek;
  const drawP = ease.inOutCubic(ramp(t, 12.75, 13.5));
  const L = archLen(w, h);
  s3.stroke.setAttribute('d', d);
  s3.stroke.setAttribute('stroke-dasharray', `${L} ${L}`);
  s3.stroke.setAttribute('stroke-dashoffset', (L * (1 - drawP)).toFixed(1));
  s3.stroke.style.opacity = (1 - prog(t, 13.9, 14.4)).toFixed(3);
  s3.shade.style.opacity = prog(t, 14.2, 15.0) * (1 - prog(t, 20.6, 21.4));
  playLine(s3.l1, t, 14.75, 20.35);
  playLine(s3.l2, t, 16.85, 20.45);
  const xw = s3.l1.words[2]; // the "×" pops
  const px = ease.outBack(ramp(t, 14.95, 15.55), 2.4);
  if (t < 20.35) xw.style.transform += ` scale(${(0.4 + 0.6 * px).toFixed(4)})`;
}

function leafSVG(parent, color1, color2, seed) {
  const s = el('svg', { width: 260, height: 260, viewBox: '-130 -130 260 260', class: 'abs', style: { overflow: 'visible' } }, parent);
  const id = 'lg' + seed;
  const defs = el('defs', {}, s);
  const lg = el('linearGradient', { id, x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': color1 }, lg); el('stop', { offset: '1', 'stop-color': color2 }, lg);
  el('path', { d: 'M -110 10 C -60 -80 60 -95 115 -10 C 60 60 -50 75 -110 10 Z', fill: `url(#${id})` }, s);
  el('path', { d: 'M -105 9 C -30 -10 50 -12 112 -9', stroke: 'rgba(255,255,255,0.25)', 'stroke-width': 3, fill: 'none' }, s);
  return s;
}
function initS4() {
  const root = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: '#F1CFAF' } }, stage);
  const world = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', transformOrigin: '0 0' } }, root);
  const plate = photo(world, P('swing-plate.png'), 1080, 1350);
  const ghost = el('img', { src: P('logo-teal.png'), class: 'abs', style: { width: '820px', opacity: 0.07, transformOrigin: '0 0', clipPath: 'inset(0 0 21% 0)' } }, world);
  const swing = photo(world, P('swing-layer.png'), 1080, 1350);
  const logo = el('img', { src: P('logo-teal.png'), class: 'abs', style: { width: '150px', left: '465px', top: '26px' } }, root);
  const leaves = [
    { x: 930, y: 40, r: -30, s: 1.0, blur: 14, c: ['#6FA04A', '#2F6B2A'] },
    { x: -50, y: 1110, r: 35, s: 1.25, blur: 18, c: ['#7DB255', '#2E6A2D'] },
    { x: 20, y: 520, r: 160, s: 0.55, blur: 9, c: ['#8FC060', '#3E7A35'] },
  ].map((L, i) => ({ ...L, svg: leafSVG(root, L.c[0], L.c[1], i) }));
  const l1 = line(root, 'خُد لحظتك…', FONT.display, 94, C.teal, centered(196));
  const l2 = line(root, 'والدنيا تستنى.', { fontFamily: 'El Messiri', fontWeight: 400 }, 84, C.teal, centered(312));
  const wave = svgLayer(stage);
  const defs = el('defs', {}, wave);
  const g = el('linearGradient', { id: 'matchaGrad', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: '0', 'stop-color': '#B5CF6E' }, g); el('stop', { offset: '0.35', 'stop-color': '#8DAF4A' }, g); el('stop', { offset: '1', 'stop-color': '#4F6E2A' }, g);
  const body = el('path', { fill: 'url(#matchaGrad)' }, wave);
  const foam = el('path', { fill: 'none', stroke: '#F3EBD3', 'stroke-width': 10, 'stroke-linejoin': 'round', opacity: 0.85 }, wave);
  const bubbles = Array.from({ length: 14 }, (_, i) => el('circle', { r: 4, fill: 'rgba(255,255,240,0.5)' }, wave));
  S.s4 = { root, world, plate, ghost, swing, logo, leaves, l1, l2, wave, body, foam, bubbles };
}
function surface(W_, y, t, seed) {
  const pts = [];
  for (let x = -20; x <= W_ + 20; x += 24) pts.push([x, y + 30 * Math.sin(x * 0.008 + t * 3.0 + seed) + 13 * Math.sin(x * 0.019 - t * 4.4 + seed * 2) + 5 * Math.sin(x * 0.043 + t * 6.0)]);
  return pts;
}
function renderS4(t) {
  const s4 = S.s4;
  // Matcha liquid wipe: a band between two wavy surfaces sweeps up through the frame.
  const wv = t >= 20.85 && t < 22.45;
  show(s4.wave, wv);
  if (wv) {
    const yTop = lerp(H + 80, -140, ease.inCubic(ramp(t, 20.9, 21.55)) * 0.35 + ease.outCubic(ramp(t, 20.9, 21.55)) * 0.65);
    const yBot = lerp(H + 160, -200, ease.inOutCubic(ramp(t, 21.6, 22.4)));
    const top = surface(W, yTop, t, 0.7), bot = surface(W, yBot, t, 2.1).reverse();
    const pathOf = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1].toFixed(1)}`).join(' ');
    s4.body.setAttribute('d', pathOf(top) + ' ' + pathOf(bot).replace(/^M/, 'L') + ' Z');
    s4.foam.setAttribute('d', pathOf(top));
    const r = rng(42);
    s4.bubbles.forEach((b) => {
      const bx = r() * W, sp = 0.3 + r() * 0.5, rad = 2 + r() * 7;
      const by = lerp(yTop, yBot, sp) + Math.sin(t * 5 + bx) * 10;
      b.setAttribute('cx', bx.toFixed(1)); b.setAttribute('cy', by.toFixed(1)); b.setAttribute('r', rad.toFixed(1));
    });
  }
  const vis = t >= 21.5 && t < 32.6;
  show(s4.root, vis); if (!vis) return;
  // Camera: slow push, then a beat-cut to a close-up that follows the swinging cup.
  const close = t >= 28.0;
  const theta = 1.25 * Math.sin((2 * Math.PI * (t - 21.6)) / 3.9 + 0.5) * (Math.PI / 180);
  const pivot = [540, -900];
  let cam;
  if (!close) cam = { cx: 540, cy: 660, s: lerp(1.035, 1.1, ease.inOutSine(ramp(t, 21.6, 28.0))) };
  else {
    // follow the cup centre (rotating with the swing) with a lagged, smoothed path
    const lag = 1.25 * Math.sin((2 * Math.PI * (t - 0.35 - 21.6)) / 3.9 + 0.5) * (Math.PI / 180);
    const cxp = pivot[0] + (548 - pivot[0]) * Math.cos(lag) - (700 - pivot[1]) * Math.sin(lag);
    cam = { cx: cxp, cy: 700, s: lerp(1.3, 1.38, ramp(t, 28.0, 32.6)) };
  }
  const k = camT(cam, 1, { cx: 540, cy: 675 });
  s4.world.style.transform = `translate(${k.x.toFixed(2)}px, ${k.y.toFixed(2)}px) scale(${k.s.toFixed(5)})`;
  s4.swing.box.style.transformOrigin = `${pivot[0]}px ${pivot[1]}px`;
  s4.swing.box.style.transform = `rotate(${theta.toFixed(5)}rad)`;
  s4.ghost.style.transform = `translate(${-90 + 6 * Math.sin(t * 0.4)}px, 110px)`;
  show(s4.logo, !close); show(s4.l1.line, !close); show(s4.l2.line, !close);
  s4.leaves.forEach((L, i) => {
    const dx = 18 * Math.sin(t * 0.45 + i * 2), dy = 12 * Math.cos(t * 0.37 + i), rr = L.r + 6 * Math.sin(t * 0.5 + i);
    const s = L.s * (close ? 1.35 : 1);
    L.svg.style.transform = `translate(${L.x + dx}px, ${L.y + dy}px) rotate(${rr}deg) scale(${s})`;
    L.svg.style.filter = `blur(${L.blur * (close ? 1.4 : 1)}px)`;
  });
  if (!close) { playLine(s4.l1, t, 22.55, 27.25); playLine(s4.l2, t, 24.15, 27.35); }
  s4.logo.style.opacity = (prog(t, 22.0, 22.9) * (1 - prog(t, 27.2, 27.8))).toFixed(3);
}

// Montage: 8 beat-cut macro shots (2 beats each) from the owner's photos.
const SHOTS = [
  { img: 'hero', a: { cx: 1005, cy: 1478, s: 1.42 }, b: { cx: 950, cy: 1474, s: 1.5 } },
  { img: 'hero', a: { cx: 1010, cy: 850, s: 1.32 }, b: { cx: 1010, cy: 875, s: 1.46 } },
  { img: 'hero', a: { cx: 1003, cy: 1160, s: 1.55 }, b: { cx: 1003, cy: 1150, s: 1.42 } },
  { img: 'hero', a: { cx: 585, cy: 1330, s: 1.28 }, b: { cx: 585, cy: 1255, s: 1.3 } },
  { img: 'swing', a: { cx: 548, cy: 560, s: 1.38 }, b: { cx: 548, cy: 590, s: 1.5 } },
  { img: 'hero', a: { cx: 1060, cy: 1500, s: 1.5 }, b: { cx: 1130, cy: 1500, s: 1.5 } },
  { img: 'hero', a: { cx: 590, cy: 880, s: 1.32 }, b: { cx: 590, cy: 930, s: 1.36 } },
  { img: 'hero', a: { cx: 880, cy: 880, s: 0.95 }, b: { cx: 880, cy: 870, s: 1.03 } },
];
function pearl(svg, id) {
  const defs = el('defs', {}, svg);
  const g = el('radialGradient', { id, cx: '0.38', cy: '0.32', r: '0.75' }, defs);
  el('stop', { offset: '0', 'stop-color': '#8a5a3c' }, g); el('stop', { offset: '0.28', 'stop-color': '#3a1f12' }, g); el('stop', { offset: '1', 'stop-color': '#0a0503' }, g);
  const hg = el('radialGradient', { id: id + 'h', cx: '0.5', cy: '0.5', r: '0.5' }, defs);
  el('stop', { offset: '0', 'stop-color': 'rgba(255,250,240,0.95)' }, hg); el('stop', { offset: '1', 'stop-color': 'rgba(255,250,240,0)' }, hg);
}
function initS5() {
  const root = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: '#0b0806' } }, stage);
  const hero = photo(root, SRC('hero-duo.jpg'), 1600, 1600);
  const swing = photo(root, P('swing-clean.png'), 1080, 1350);
  const band = el('div', { class: 'abs', style: { top: (H - 520) + 'px', width: W + 'px', height: '520px', background: 'linear-gradient(0deg, rgba(8,6,4,0.72), rgba(8,6,4,0))' } }, root);
  const l1 = line(root, 'كل رشفة…', FONT.display, 92, C.cream, centered(1040));
  const l2 = line(root, 'فيها حكاية.', FONT.ruqaa, 100, C.matchaLight, centered(1164));
  const pearls = svgLayer(stage);
  pearl(pearls, 'pg');
  const r = rng(9);
  const drops = Array.from({ length: 16 }, () => {
    const g = el('g', {}, pearls);
    const rad = 16 + r() * 46;
    el('circle', { r: rad, fill: 'url(#pg)' }, g);
    el('ellipse', { cx: -rad * 0.32, cy: -rad * 0.38, rx: rad * 0.28, ry: rad * 0.18, fill: 'url(#pgh)', transform: 'rotate(-30)' }, g);
    return { g, rad, x: 60 + r() * (W - 120), delay: r() * 0.55, speed: 0.75 + r() * 0.5, spin: r() * 6.28, depth: r() };
  });
  S.s5 = { root, hero, swing, band, l1, l2, pearls, drops };
}
function renderS5(t) {
  const s5 = S.s5;
  // Pearls fall in slow motion across the cut into the montage (31.4–33.2).
  const pv = t >= 31.3 && t < 33.4;
  show(s5.pearls, pv);
  if (pv) for (const d of s5.drops) {
    const u = (t - 31.3 - d.delay) * d.speed;
    const y = -120 + u * (700 + 380 * u) * (0.7 + d.depth * 0.6);
    const x = d.x + 30 * Math.sin(u * 2 + d.spin);
    d.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.7 + d.depth * 0.6).toFixed(3)})`);
    d.g.style.filter = `blur(${(d.depth < 0.35 ? 4 + (0.35 - d.depth) * 14 : 0).toFixed(2)}px)`;
    d.g.style.opacity = u < 0 ? 0 : 1;
  }
  const vis = t >= T.s5[0] && t < T.s6[0] + 0.45;
  show(s5.root, vis); if (!vis) return;
  const beat = BAR / 4;
  const i = Math.min(SHOTS.length - 1, Math.floor((t - T.s5[0]) / (2 * beat)));
  const sh = SHOTS[i];
  const u = ramp(t, T.s5[0] + i * 2 * beat, T.s5[0] + (i + 1) * 2 * beat + (i === SHOTS.length - 1 ? 0.45 : 0));
  const raw = { cx: lerp(sh.a.cx, sh.b.cx, u), cy: lerp(sh.a.cy, sh.b.cy, u), s: lerp(sh.a.s, sh.b.s, u) };
  const cam = sh.img === 'hero' ? fill(raw, 1600, 1600) : fill(raw, 1080, 1350);
  show(s5.hero.box, sh.img === 'hero'); show(s5.swing.box, sh.img === 'swing');
  place(sh.img === 'hero' ? s5.hero : s5.swing, cam, 1, sh.img === 'hero' ? undefined : { cx: 540, cy: 675 });
  s5.band.style.opacity = 1 - prog(t, 37.0, 37.8);
  playLine(s5.l1, t, 32.45, 36.85);
  playLine(s5.l2, t, 34.0, 36.95);
  s5.root.style.opacity = 1 - prog(t, T.s6[0], T.s6[0] + 0.45);
}

function initS6() {
  const root = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: '#0b0806' } }, stage);
  const back = photo(root, P('hero-bg.png'), 1600, 1600, { filter: 'blur(22px) brightness(0.40)' });
  const ink = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: `radial-gradient(ellipse 70% 55% at 50% 42%, #1B3A34, ${C.ink})`, opacity: 0 } }, root);
  const glow = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: 'radial-gradient(ellipse 34% 30% at 50% 47%, rgba(255,196,120,0.28), rgba(255,196,120,0) 70%)' } }, root);
  const inside = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px' } }, root);
  const duo = heroGroup(inside);
  const art = svgLayer(root);
  const mk = (w = 3.5, g = art) => el('path', { fill: 'none', stroke: C.cream, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: 'filter: drop-shadow(0 0 9px rgba(255,236,200,0.55))' }, g);
  const outline = mk(3.5);
  const mull = mk(2.5);
  const cup = photo(root, P('hero-cup.png'), 1600, 1600);
  const front = svgLayer(root);
  const rail = mk(7, front);
  const balusters = mk(4, front);
  const l1 = line(root, 'قعدتك الحلوة…', FONT.display, 86, C.cream, centered(1078));
  const l2 = line(root, 'مستنياك.', FONT.ruqaa, 100, C.matchaLight, centered(1190));
  const logo = el('img', { src: P('logo-white.png'), class: 'abs', style: { width: '205px', left: (W / 2 - 102.5) + 'px', top: '36px', filter: 'drop-shadow(0 2px 14px rgba(0,0,0,0.35))' } }, root);
  const name = line(root, 'ماتشا جوز الهند بالبوبا', FONT.display, 62, C.cream, centered(1100));
  const pill = el('div', { class: 'abs', style: { left: '0', top: '1212px', width: W + 'px', display: 'flex', justifyContent: 'center' } }, root);
  const pillIn = el('div', { style: { background: C.matcha, color: C.ink, fontFamily: 'El Messiri', fontWeight: 700, fontSize: '50px', lineHeight: 1, padding: '20px 54px 26px', borderRadius: '999px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', direction: 'rtl' } }, pill);
  const cta = textLine(pillIn, 'جرّبها النهارده', {});
  cta.line.style.position = 'relative';
  const fade = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', background: '#000', opacity: 0 } }, stage);
  S.s6 = { root, back, ink, glow, inside, duo, cup, art, outline, mull, rail, balusters, l1, l2, logo, name, pill, pillIn, cta, fade };
}
function renderS6(t) {
  const s6 = S.s6;
  const vis = t >= T.s6[0] - 0.3;
  show(s6.root, vis); show(s6.fade, vis);
  if (!vis) return;
  const t0 = T.s6[0], t7 = T.s7[0];
  s6.root.style.opacity = prog(t, t0 - 0.3, t0 + 0.2);
  place(s6.back, { cx: 800, cy: 640, s: lerp(0.92, 0.98, ramp(t, t0, t7)) }, 1, { cx: 800, cy: 640 });
  // Arch: S6 balcony window → S7 end-card frame.
  const m = ease.inOutCubic(ramp(t, t7, t7 + 1.2));
  const aw = lerp(600, 730, m), ah = lerp(820, 830, m), acy = lerp(610, 665, m);
  const d = archAt(W / 2, acy, aw, ah);
  const L = archLen(aw, ah);
  const drawP = ease.inOutCubic(ramp(t, t0 - 0.25, t0 + 1.0));
  s6.outline.setAttribute('d', d);
  s6.outline.setAttribute('stroke-dasharray', `${L} ${L}`);
  s6.outline.setAttribute('stroke-dashoffset', (L * (1 - drawP)).toFixed(1));
  // Mullions: transom + fanlight spokes (echo of the logo window).
  const r = aw / 2, top = acy - ah / 2, spring = top + r, cx = W / 2;
  const spokes = [135, 90, 45].map((a) => `M ${cx} ${spring} L ${(cx + r * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(spring - r * Math.sin((a * Math.PI) / 180)).toFixed(1)}`).join(' ');
  s6.mull.setAttribute('d', `M ${cx - r} ${spring} L ${cx + r} ${spring} ${spokes}`);
  const mullP = ease.outExpo(ramp(t, t0 + 0.7, t0 + 1.6));
  s6.mull.style.opacity = (mullP * (1 - prog(t, t7, t7 + 0.6))).toFixed(3);
  // Balcony railing in front of the cup.
  const ry = 870, rb = 1035, rx0 = cx - r - 28, rx1 = cx + r + 28;
  s6.rail.setAttribute('d', `M ${rx0} ${ry} L ${rx1} ${ry} M ${rx0 + 20} ${rb} L ${rx1 - 20} ${rb}`);
  let bal = '';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = lerp(rx0 + 48, rx1 - 48, i / (n - 1)); const bow = (i - (n - 1) / 2) * 7;
    bal += ` M ${x.toFixed(1)} ${ry + 8} Q ${(x + bow).toFixed(1)} ${(ry + rb) / 2} ${x.toFixed(1)} ${rb - 8}`;
  }
  s6.balusters.setAttribute('d', bal);
  const railP = ease.inOutCubic(ramp(t, t0 + 0.6, t0 + 1.7));
  const railOut = prog(t, t7, t7 + 0.6);
  for (const p of [s6.rail, s6.balusters]) {
    const len = 3000; p.setAttribute('stroke-dasharray', `${len} ${len}`); p.setAttribute('stroke-dashoffset', (len * (1 - railP)).toFixed(1));
    p.style.opacity = (1 - railOut).toFixed(3);
  }
  // The cup stands behind the railing; in S7 the arch fills with the real duo photo.
  const cupIn = ease.outExpo(ramp(t, t0 + 0.45, t0 + 1.6));
  const cupOut = prog(t, t7 + 0.1, t7 + 0.9);
  const cs = 0.74 + 0.03 * ramp(t, t0, t7);
  const cupCam = { cx: CUP_C[0] - (W / 2 - W / 2) / cs, cy: CUP_C[1] - (lerp(735, 694, cupIn) - H / 2) / cs, s: cs };
  place(s6.cup, cupCam);
  s6.cup.box.style.opacity = (cupIn * (1 - cupOut)).toFixed(3);
  s6.glow.style.opacity = (cupIn * (1 - 0.5 * m)).toFixed(3);
  s6.inside.style.clipPath = `path('${d}')`;
  const duoIn = prog(t, t7 + 0.1, t7 + 1.0);
  s6.inside.style.opacity = duoIn.toFixed(3);
  show(s6.inside, duoIn > 0);
  if (duoIn > 0) s6.duo.set({ cx: 840, cy: 1000, s: lerp(0.7, 0.745, ease.inOutSine(ramp(t, t7, 59))) }, { ref: { cx: 840, cy: 1000 }, sweepP: ramp(t, 54.4, 56.0) });
  s6.ink.style.opacity = prog(t, t7 + 0.1, t7 + 1.1).toFixed(3);
  playLine(s6.l1, t, t0 + 2.35, t7 - 0.25);
  playLine(s6.l2, t, t0 + 3.95, t7 - 0.15);
  // End card.
  const lp = ease.outExpo(ramp(t, t7 + 0.85, t7 + 2.0));
  s6.logo.style.opacity = lp.toFixed(3);
  s6.logo.style.transform = `translateY(${lerp(16, 0, lp).toFixed(2)}px) scale(${lerp(0.94, 1, lp).toFixed(4)})`;
  s6.logo.style.filter = `blur(${(8 * (1 - lp)).toFixed(2)}px) drop-shadow(0 2px 14px rgba(0,0,0,0.35))`;
  playLine(s6.name, t, t7 + 1.6, 99);
  const pp = ease.outBack(ramp(t, t7 + 2.6, t7 + 3.25), 1.6);
  show(s6.pill, t >= t7 + 2.6);
  s6.pillIn.style.transform = `scale(${pp.toFixed(4)})`;
  s6.pillIn.style.opacity = clamp(pp * 1.5).toFixed(3);
  playLine(s6.cta, t, t7 + 2.75, 99, { rise: 10, blur: 4 });
  s6.fade.style.opacity = prog(t, 58.75, 60.0).toFixed(3);
}

export default {
  duration: 60, fps: 30,
  init(stageEl, opts) {
    stage = stageEl; W = opts.W; H = opts.H;
    initS2(); initS1(); initS3(); initS4(); initS5(); initS6();
    // Re-order: S6 above S5 above S4 ... the portal/wave/pearl SVGs stay above their scenes.
    el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px', pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 75% at 50% 48%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.38))' } }, stage);
    grainAt = grain(stage, { opacity: 0.085 });
  },
  render(t, frame) {
    renderS1(t); renderS2(t); renderS3(t); renderS4(t); renderS5(t); renderS6(t);
    grainAt(frame);
  },
};
