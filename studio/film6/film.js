// Film 6 — living poster: chrome title in space, 1080×1080, 15 s, 128 BPM (bar 1.875 s). Original design.
// Studied reference (private pack references/wa0033): a static chrome album poster whose background is a 6-second loop
// repeated five times; the letters never move, and its music stops at 24 s of a 30 s video. This design keeps the idea
// (chrome lettering, deep space, flares) and fixes what the reference lacks: a real reveal, light that TRAVELS over the
// chrome (specular sweeps on the downbeats), depth parallax, beat glints, a clear hierarchy and sound for the whole film.
// Everything is procedural and pure in t: nebula from seeded fBm, seeded stars, CSS chrome (gradient-clipped text with
// extrusion, rim and sweep layers). Type: Archivo (Latin) + El Messiri (the Arabic of the same role).
import { clamp, lerp, ramp, ease, el, textLine, playLine, grain } from '../lib/motion.js';
import { springStep, fbm, hash } from '../lib/kinetics.js';

const W0 = 1080, BEAT = 60 / 128, BAR = 4 * BEAT;
const C = { void: '#02040c', navy: '#030817', blue: '#0B2A6B', ice: '#9CC3FF', white: '#F4F8FF', violet: '#7C4DFF' };
let W = W0, H = W0, K = 1, stage, world, bg, starsCv, starsCtx, warpCv, warpCtx, planet, moon, title = {}, flares = [], glints = [], gTick, stars = [], arLine;
const px = v => `${(+v).toFixed(2)}px`;
const k = v => v * K;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const spr = (t, s, d = 0.6, b = 0.2) => (t <= s ? 0 : springStep(t - s, { duration: d, bounce: b }).value);
const bump = (t, t0, d = 0.3) => Math.pow(Math.sin(Math.PI * clamp((t - t0) / d)), 2);
const div = (p, css = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...css } }, p);

// ---------- chrome lettering ----------
const CHROME = 'linear-gradient(180deg, #ffffff 0%, #d9e8ff 18%, #8fb6f5 40%, #1a2a5a 50%, #0d1838 53%, #7fa6e8 64%, #e9f2ff 82%, #9fb9e6 100%)';
function chrome(parent, text, { size, font = '"Archivo"', wdth = 125, wght = 900, depth = 14, track = 0.02, skew = -6, rim = 2.2 } = {}) {
  const box = div(parent, { left: '50%', top: '0', transformOrigin: '50% 50%' });
  const base = { position: 'absolute', left: '0', top: '0', whiteSpace: 'nowrap', fontFamily: font, fontSize: px(size), lineHeight: '1', letterSpacing: `${track}em`,
    fontVariationSettings: `'wdth' ${wdth}, 'wght' ${wght}`, fontWeight: String(wght), transform: `translateX(-50%) skewX(${skew}deg)` };
  const shadows = []; for (let i = 1; i <= depth; i++) { const c = Math.round(48 - i * 2.6); shadows.push(`${(i * 0.45).toFixed(2)}px ${i}px 0 rgb(${c * 0.35 | 0},${c * 0.55 | 0},${c | 0})`); }
  shadows.push(`0 ${depth + 6}px ${depth * 2}px rgba(0,0,0,0.65)`);
  const ext = el('div', { text, style: { ...base, color: '#0a1636', textShadow: shadows.join(',') } }, box);
  const fill = el('div', { text, style: { ...base, color: 'transparent', backgroundImage: CHROME, backgroundSize: '100% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text' } }, box);
  // diagonal reflection bands (what makes chrome read as chrome rather than a gradient)
  el('div', { text, style: { ...base, color: 'transparent', backgroundImage: 'repeating-linear-gradient(118deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 22px, rgba(255,255,255,0.55) 26px, rgba(20,40,90,0.35) 31px, rgba(255,255,255,0) 38px, rgba(255,255,255,0) 74px)', WebkitBackgroundClip: 'text', backgroundClip: 'text', mixBlendMode: 'overlay' } }, box);
  const edge = el('div', { text, style: { ...base, color: 'transparent', WebkitTextStroke: `${rim}px rgba(214,232,255,0.9)`, mixBlendMode: 'screen', opacity: '0.75' } }, box);
  const sweep = el('div', { text, style: { ...base, color: 'transparent', backgroundImage: 'linear-gradient(105deg, rgba(255,255,255,0) 42%, rgba(255,255,255,0.95) 50%, rgba(160,200,255,0.0) 58%)', backgroundSize: '320% 100%', backgroundRepeat: 'no-repeat', WebkitBackgroundClip: 'text', backgroundClip: 'text', mixBlendMode: 'screen' } }, box);
  return { box, ext, fill, edge, sweep };
}
// sweep progress p 0→1 moves a white band across the letters (background-position 100 % → 0 %)
const setSweep = (c, p) => { c.sweep.style.backgroundPosition = `${(110 - 120 * clamp(p)).toFixed(2)}% 0`; c.sweep.style.opacity = p > 0 && p < 1 ? '1' : '0'; };

// ---------- procedural space ----------
function nebula(size = 360) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d'); const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const n = fbm(u * 3.2 + 7, v * 3.2 + 3, { octaves: 5, seed: 11 }), m = fbm(u * 2.1 + 1, v * 2.1 + 9, { octaves: 4, seed: 23 });
    const ridge = Math.pow(1 - Math.abs(fbm(u * 5 + 2, v * 5 + 5, { octaves: 4, seed: 37 })), 6);
    const dens = clamp(0.5 + 0.7 * n), vio = clamp(0.5 + 0.9 * m);
    const vign = clamp(1.05 - Math.hypot(u - 0.5, v - 0.45) * 1.6) * 0.85 + 0.1;
    const d2 = dens * dens; let r = 2 + 34 * d2 * vio + 40 * ridge * vio, gg = 4 + 16 * d2 * (1 - vio * 0.6) + 46 * ridge, b = 12 + 70 * d2 + 80 * ridge;
    r *= vign; gg *= vign; b *= vign;
    const i = (y * size + x) * 4; img.data[i] = Math.min(255, r); img.data[i + 1] = Math.min(255, gg); img.data[i + 2] = Math.min(255, b); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return cv.toDataURL();
}
function makeStars() {
  for (let i = 0; i < 520; i++) {
    const d = i < 360 ? 0.35 : i < 480 ? 0.7 : 1.15;
    stars.push({ x: hash(1, i) * 1.3 - 0.15, y: hash(2, i) * 1.3 - 0.15, r: (0.4 + hash(3, i) * (d > 1 ? 1.8 : 1.1)) * (d > 1 ? 1.4 : 1), d, ph: hash(4, i) * 6.28, w: 1 + hash(5, i) * 3, a: 0.35 + hash(6, i) * 0.65, blue: hash(7, i) > 0.6 });
  }
}

// ---------- glints & flares ----------
function glint(parent) {
  const s = el('svg', { width: 120, height: 120, viewBox: '-60 -60 120 120', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', mixBlendMode: 'screen' } }, parent);
  const g = el('radialGradient', { id: `gl${glints.length}` }, el('defs', {}, s)); el('stop', { offset: 0, 'stop-color': '#ffffff' }, g); el('stop', { offset: 0.35, 'stop-color': '#bcd6ff' }, g); el('stop', { offset: 1, 'stop-color': 'rgba(120,170,255,0)' }, g);
  el('circle', { r: 26, fill: `url(#gl${glints.length})`, opacity: 0.75 }, s);
  el('path', { d: 'M 0 -58 Q 3 -3 58 0 Q 3 3 0 58 Q -3 3 -58 0 Q -3 -3 0 -58 Z', fill: '#ffffff' }, s);
  return s;
}
function flare(parent, w, h, color = 'rgba(120,180,255,0.9)') {
  return div(parent, { width: px(w), height: px(h), marginLeft: px(-w / 2), marginTop: px(-h / 2), borderRadius: '50%', background: `radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, ${color} 18%, rgba(60,110,255,0) 70%)`, mixBlendMode: 'screen' });
}

export default {
  duration: 15, fps: 30,
  init(st, { W: w, H: h }) {
    stage = st; W = w; H = h; K = Math.min(w, h) / W0;
    stage.style.background = C.void;
    world = div(stage, { width: px(W), height: px(H), overflow: 'hidden', background: C.navy });
    bg = el('img', { src: nebula(360), style: { position: 'absolute', left: px(W / 2 - k(780)), top: px(H / 2 - k(780)), width: px(k(1560)), height: px(k(1560)), filter: 'blur(2px) saturate(1.15)', transformOrigin: '50% 50%' } }, world);
    starsCv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H) } }, world); starsCtx = starsCv.getContext('2d');
    makeStars();
    planet = div(world, { width: px(k(1240)), height: px(k(1240)), borderRadius: '50%', left: px(k(-440)), top: px(k(640)), background: 'radial-gradient(circle at 70% 18%, #1f3f8a 0%, #0a1838 22%, #040a1c 48%, #010208 72%)', boxShadow: `0 0 ${k(70)}px ${k(16)}px rgba(80,140,255,0.42), inset ${k(26)}px ${k(-18)}px ${k(60)}px rgba(150,200,255,0.38)` });
    moon = div(world, { width: px(k(150)), height: px(k(150)), borderRadius: '50%', left: px(k(905)), top: px(k(840)), background: 'radial-gradient(circle at 30% 30%, #6d8fd6 0%, #1c2f66 45%, #050b1e 80%)', boxShadow: `0 0 ${k(26)}px rgba(110,160,255,0.35)`, opacity: '0.85' });
    warpCv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), mixBlendMode: 'screen' } }, world); warpCtx = warpCv.getContext('2d');
    // title stack (centre column)
    const col = div(world, { width: px(W), height: px(H), transformOrigin: '50% 50%' }); title.col = col;
    title.top = chrome(col, 'MOTION STUDIO', { size: k(84), depth: 8, rim: 1.6, wdth: 112 });
    title.mono = chrome(col, 'G3', { size: k(440), depth: 22, rim: 3, track: -0.01 });
    title.sub = div(col, { left: '0', width: px(W), textAlign: 'center', fontFamily: '"Archivo"', fontVariationSettings: "'wdth' 110, 'wght' 600", fontSize: px(k(30)), color: '#cfe0ff', letterSpacing: '0.32em', textShadow: `0 0 ${k(14)}px rgba(110,170,255,0.8)` }); title.sub.textContent = 'THE THIRD GENERATION';
    title.rowL = div(col, { height: px(k(2)), background: 'linear-gradient(90deg, rgba(120,170,255,0), #9cc3ff)', transformOrigin: '100% 50%' });
    title.rowR = div(col, { height: px(k(2)), background: 'linear-gradient(90deg, #9cc3ff, rgba(120,170,255,0))', transformOrigin: '0% 50%' });
    title.soon = div(col, { left: '0', width: px(W), textAlign: 'center', fontFamily: '"Archivo"', fontVariationSettings: "'wdth' 125, 'wght' 700", fontSize: px(k(46)), color: '#e8f1ff', letterSpacing: '0.42em', textShadow: `0 0 ${k(18)}px rgba(110,170,255,0.9)` }); title.soon.textContent = 'COMING SOON';
    arLine = textLine(col, 'قريبًا', { fontFamily: 'El Messiri', fontWeight: 700, fontSize: px(k(64)), color: '#dfeaff', textShadow: `0 0 ${k(16)}px rgba(110,170,255,0.85)`, top: px(k(880)), left: '0', width: px(W), justifyContent: 'center', lineHeight: '1.25' });
    // flares + glints
    for (const [x, y, w2, h2] of [[230, 300, 760, 22], [860, 640, 520, 16], [300, 735, 420, 14], [540, 196, 900, 10]]) { const f = flare(world, k(w2), k(h2)); f.dataset.x = x; f.dataset.y = y; flares.push(f); }
    for (const [x, y] of [[250, 300], [842, 312], [276, 742], [800, 690], [410, 200], [706, 200]]) { const g = glint(world); g.dataset.x = x; g.dataset.y = y; glints.push(g); }
    gTick = grain(world, { opacity: 0.06, tiles: 6, size: 256, seed: 3 });
  },
  render(t, frame) {
    // camera: slow push, parallax by depth
    const z = 1 + 0.05 * (t / 15);
    const zl = d => Math.pow(z, d);
    world.style.opacity = String(ease.inOutSine(ramp(t, 0, 0.6)));
    bg.style.transform = `translate(${(Math.sin(t * 0.42) * 22 * K).toFixed(2)}px, ${(t * 7 * K).toFixed(2)}px) scale(${zl(0.35).toFixed(5)}) rotate(${(t * 0.9).toFixed(3)}deg)`;
    planet.style.transform = `translate(${(-t * 1.2 * K).toFixed(2)}px, ${(t * 0.5 * K).toFixed(2)}px) scale(${zl(0.6).toFixed(5)})`;
    planet.style.boxShadow = `0 0 ${k(70 + 20 * bump(t % BAR, 0, BAR))}px ${k(16)}px rgba(80,140,255,${(0.38 + 0.1 * Math.sin(t * 1.3)).toFixed(3)}), inset ${k(26)}px ${k(-18)}px ${k(60)}px rgba(150,200,255,0.38)`;
    moon.style.transform = `translate(${(t * 0.9 * K).toFixed(2)}px, 0) scale(${zl(0.8).toFixed(5)})`;
    // stars (twinkle + parallax)
    const c = starsCtx; c.clearRect(0, 0, W, H);
    for (const s of stars) {
      const zz = zl(s.d), ang = t * 0.006 * s.d, ox = (s.x * W - W / 2) * zz, oy = (s.y * H - H / 2) * zz, x = W / 2 + ox * Math.cos(ang) - oy * Math.sin(ang), y = H / 2 + ox * Math.sin(ang) + oy * Math.cos(ang);
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      const a = s.a * (0.35 + 0.65 * Math.sin(t * s.w * 1.6 + s.ph) ** 2) * (s.d > 1 ? 1 : 0.9);
      c.globalAlpha = clamp(a); c.fillStyle = s.blue ? '#a9c8ff' : '#ffffff';
      c.beginPath(); c.arc(x, y, s.r * K, 0, 6.2832); c.fill();
    }
    c.globalAlpha = 1;
    // warp streaks: long during the reveal, a faint drift afterwards
    const wc = warpCtx; wc.clearRect(0, 0, W, H);
    const warp = 1 - sm(0.4, 1.9, t), drift = 0.12;
    for (let i = 0; i < 90; i++) {
      const a = hash(9, i) * 6.2832, r0 = (0.08 + ((hash(10, i) + t * (0.05 + warp * 0.8)) % 1) * 0.9) * W * 0.75, len = (0.02 + warp * 0.22) * W * (0.4 + hash(11, i));
      wc.strokeStyle = `rgba(170,205,255,${(drift + 0.55 * warp) * (0.4 + 0.6 * hash(12, i))})`; wc.lineWidth = K * (0.6 + hash(13, i) * 1.4);
      wc.beginPath(); wc.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); wc.lineTo(W / 2 + Math.cos(a) * (r0 + len), H / 2 + Math.sin(a) * (r0 + len)); wc.stroke();
    }
    // title: G3 from depth (0.25–1.3), MOTION STUDIO drop (1.875), subtitle gathers, COMING SOON rules (3.75), Arabic (5.6)
    title.col.style.transform = `scale(${zl(1).toFixed(5)})`;
    const pm = clamp(spr(t, 0.25, 0.95, 0.12), 0, 1.1), mono = title.mono;
    mono.box.style.top = px(k(545) - k(440) * 0.5);
    mono.box.style.transform = `scale(${lerp(1.7, 1, clamp(pm)).toFixed(4)})`; mono.box.style.opacity = String(clamp(ramp(t, 0.25, 0.7)));
    mono.box.style.filter = pm < 0.999 ? `blur(${(26 * (1 - clamp(pm))).toFixed(2)}px)` : (t > 13.125 && t < 14.4 ? `brightness(${(1 + 0.45 * bump(t, 13.125, 1.2)).toFixed(3)})` : 'none');
    const pt = clamp(spr(t, 1.875, 0.6, 0.3), 0, 1.15);
    title.top.box.style.top = px(k(205) - k(84) * 0.5 + (1 - pt) * k(-170)); title.top.box.style.opacity = String(clamp(pt * 1.6));
    const g = ease.outCubic(ramp(t, 2.3, 3.5));
    title.sub.style.top = px(k(790)); title.sub.style.opacity = String(g); title.sub.style.letterSpacing = `${lerp(0.95, 0.32, g).toFixed(3)}em`;
    const r = ease.outExpo(ramp(t, 3.75, 4.45)), sy = k(850);
    title.rowL.style.left = px(W / 2 - k(470)); title.rowL.style.width = px(k(150)); title.rowL.style.top = px(sy); title.rowL.style.transform = `scaleX(${r.toFixed(4)})`;
    title.rowR.style.left = px(W / 2 + k(320)); title.rowR.style.width = px(k(150)); title.rowR.style.top = px(sy); title.rowR.style.transform = `scaleX(${r.toFixed(4)})`;
    const sp = ease.outExpo(ramp(t, 3.85, 4.6));
    title.soon.style.top = px(sy - k(24)); title.soon.style.opacity = String(sp); title.soon.style.transform = `translateY(${((1 - sp) * k(24)).toFixed(2)}px)`;
    title.soon.style.textShadow = `0 0 ${k(18 + 22 * bump(t % (2 * BAR), 0, 0.5))}px rgba(110,170,255,0.9)`;
    playLine(arLine, t, 5.7, 99, { dur: 0.8, rise: k(18), blur: 10, stagger: 0 });
    // specular sweeps: reveal, every two bars from 5.625, a big one at 13.125
    const SW = [[1.0, 0.9], [5.625, 0.9], [9.375, 0.9], [13.125, 1.1]];
    for (const ch of [title.mono, title.top]) {
      let p = 0; for (const [s0, d0] of SW) if (t >= s0 && t < s0 + d0 + (ch === title.top ? 0.25 : 0)) p = (t - s0 - (ch === title.top ? 0.18 : 0)) / d0;
      setSweep(ch, p);
    }
    // flares breathe; glints fire on beats in a travelling order from 5.625 (and on the reveal impact)
    flares.forEach((f, i) => {
      const x = +f.dataset.x, y = +f.dataset.y, zz = zl(1);
      const pulse = 0.55 + 0.25 * Math.sin(t * (0.9 + i * 0.3) + i) + 0.6 * bump(t, 1.875, 0.6) + 0.8 * bump(t, 13.125, 0.9);
      f.style.left = px(W / 2 + (k(x) - W / 2) * zz); f.style.top = px(H / 2 + (k(y) - H / 2) * zz);
      f.style.opacity = String(clamp(pulse * sm(0.3, 1.2, t))); f.style.transform = `scaleX(${(0.8 + 0.4 * pulse).toFixed(3)})`;
    });
    const beat = Math.floor((t - 5.625) / BEAT);
    glints.forEach((gl, i) => {
      const x = +gl.dataset.x, y = +gl.dataset.y, zz = zl(1);
      let v = 0;
      if (t >= 5.625 && ((beat % glints.length) + glints.length) % glints.length === i) v = bump(t, 5.625 + beat * BEAT, 0.42);
      v = Math.max(v, (i < 2 ? 1 : 0) * bump(t, 1.9, 0.5), bump(t, 13.15 + i * 0.05, 0.6));
      gl.style.transform = `translate(${(W / 2 + (k(x) - W / 2) * zz - 60).toFixed(2)}px, ${(H / 2 + (k(y) - H / 2) * zz - 60).toFixed(2)}px) scale(${(K * (0.15 + 0.85 * v)).toFixed(4)}) rotate(${(t * 20).toFixed(1)}deg)`;
      gl.style.opacity = String(v);
    });
    gTick(frame);
  },
};
