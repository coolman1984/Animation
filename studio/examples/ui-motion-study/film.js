// UI MOTION STUDY — the product-UI grammar of lib/uimotion.js on abstract (unbranded) cards, 7 s, authored 960×540 and fitted to any canvas.
//  0.0–1.9  a floating input card tilted in 3-D types a line with a caret; the Send button pulses
//  1.9–2.3  zoomContinuation (the whoosh) dollies through into the next scene
//  2.3–3.9  an app window tilted in perspective with provider "satellites" orbiting it, which scatter away
//  3.9–5.6  a UI wall of dim windows with travelling spotlights; a two-line headline rises out of a mask
//  5.6–7.0  centred stack (older lines dim) and a logo that arrives with one expanding ring
import { el, clamp, lerp, ramp } from '../../lib/motion.js';
import { applyTransition } from '../../lib/transitions.js';
import { planeTransform, tiltSettle, planeDrift, typeOn, typeEnd, caretVisible, stackLines, orbitPoint, scatterOut, litCells, wallCells, pulseRing } from '../../lib/uimotion.js';
import { hash } from '../../lib/kinetics.js';

const C = { bg0: '#071238', bg1: '#02050f', ink: '#F4F6FB', blue: '#4C7DFF', dim: '#8EA0C8', card: '#0E1424', line: 'rgba(255,255,255,0.10)' };
const A = { w: 960, h: 540 };
const PROMPT = 'Write a launch tagline for Orbit', TYPE0 = 0.25, CPS = 16;
let world, scenes = {}, overlay, stars = [], wallNodes = [], sat = [], sendBtn, caret, typed, ring, ringLogo;
const abs = (parent, css = {}, tag = 'div') => el(tag, { style: { position: 'absolute', ...css } }, parent);

export default {
  duration: 7, fps: 30,
  init(stage, { W, H }) {
    stage.style.background = C.bg1;
    const k = Math.min(W / A.w, H / A.h);
    world = abs(stage, { left: `${(W - A.w * k) / 2}px`, top: `${(H - A.h * k) / 2}px`, width: `${A.w}px`, height: `${A.h}px`, transformOrigin: '0 0', transform: `scale(${k})`, overflow: 'hidden', background: `radial-gradient(ellipse 80% 70% at 50% 40%, ${C.bg0}, ${C.bg1})` });
    for (let i = 0; i < 70; i++) { const s = abs(world, { left: `${hash(1, i) * A.w}px`, top: `${hash(2, i) * A.h}px`, width: '2px', height: '2px', borderRadius: '50%', background: '#cfe0ff' }); stars.push({ s, ph: hash(3, i) * 6, base: 0.15 + hash(4, i) * 0.5 }); }
    for (const id of ['a', 'b', 'c', 'd']) scenes[id] = abs(world, { inset: '0', display: 'none' });
    // A: input card
    const card = abs(scenes.a, { left: '170px', top: '210px', width: '620px', height: '110px', borderRadius: '10px', background: C.card, border: `1px solid ${C.line}`, boxShadow: '0 30px 60px rgba(0,0,0,0.5)' });
    typed = abs(card, { left: '20px', top: '18px', font: '500 20px/1.3 Inter, "Space Mono", sans-serif', color: C.ink, whiteSpace: 'nowrap' });
    caret = abs(card, { width: '2px', height: '24px', background: C.blue, top: '18px' });
    sendBtn = abs(card, { right: '18px', bottom: '16px', padding: '8px 18px', borderRadius: '8px', background: C.blue, color: '#fff', font: '700 15px Inter, sans-serif' }); sendBtn.textContent = 'Send';
    scenes.a.card = card;
    // B: tilted window + satellites
    const win = abs(scenes.b, { left: '250px', top: '120px', width: '460px', height: '300px', borderRadius: '12px', background: '#101729', border: `1px solid ${C.line}`, boxShadow: '0 40px 80px rgba(0,0,0,0.55)' });
    abs(win, { left: '24px', top: '24px', width: '120px', height: '12px', borderRadius: '6px', background: '#24304f' });
    for (let i = 0; i < 6; i++) abs(win, { left: '24px', top: `${64 + i * 34}px`, width: `${250 + (i % 3) * 60}px`, height: '10px', borderRadius: '5px', background: '#1b2542' });
    scenes.b.win = win;
    for (let i = 0; i < 6; i++) { const n = abs(scenes.b, { width: '46px', height: '46px', borderRadius: '12px', background: ['#e8e8e8', '#e9885f', '#4c8bf5', '#111', '#7a5cff', '#2bb673'][i], boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }); sat.push(n); }
    // C: UI wall + headline
    const wall = abs(scenes.c, { left: '-300px', top: '-80px', width: '1800px', height: '1000px', transformOrigin: '50% 50%' });
    scenes.c.wall = wall;
    for (const c of wallCells({ cols: 6, rows: 4, w: 250, h: 150, gap: 28 })) wallNodes.push(abs(wall, { left: `${c.x}px`, top: `${c.y}px`, width: `${c.w}px`, height: `${c.h}px`, borderRadius: '8px', background: '#0d1426', border: `1px solid ${C.line}` }));
    scenes.c.lines = ['The AI client', 'you actually own.'].map((t, i) => { const m = abs(scenes.c, { left: '0', width: '960px', top: `${210 + i * 64}px`, height: '64px', overflow: 'hidden', textAlign: 'center' }); const s = abs(m, { left: '0', top: '0', width: '960px', font: '800 54px/64px Inter, Archivo, sans-serif', color: i ? C.blue : C.ink }); s.textContent = t; return s; });
    // D: centred stack + logo
    scenes.d.lines = ['No subscription.', 'Pay once.', 'Use forever.'].map((t, i) => { const s = abs(scenes.d, { left: '0', width: '960px', top: `${70 + i * 62}px`, textAlign: 'center', font: '800 46px/56px Inter, Archivo, sans-serif', color: i === 2 ? C.blue : C.ink }); s.textContent = t; return s; });
    ring = abs(scenes.d, { left: '480px', top: '400px', borderRadius: '50%', border: `3px solid ${C.blue}`, boxShadow: `0 0 24px ${C.blue}` });
    ringLogo = abs(scenes.d, { left: '450px', top: '370px', width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg,#ff8a5c,#d23c5a)' });
    overlay = abs(world, { inset: '0', display: 'none', zIndex: 9 });
  },
  render(t) {
    const show = (id, on) => { scenes[id].style.display = on ? 'block' : 'none'; };
    stars.forEach(({ s, ph, base }) => { s.style.opacity = String(base * (0.6 + 0.4 * Math.sin(t * 1.3 + ph))); });
    show('a', t < 2.35); show('b', t >= 1.9 && t < 4.3); show('c', t >= 3.9 && t < 5.9); show('d', t >= 5.6);
    // A: tilted input card, typewriter, caret, Send pulse
    const a = tiltSettle(t, { start: 0, duration: 0.8, bounce: 0.15, from: { ry: -22, rx: 10, x: 140, z: -120 }, to: { ry: -7, rx: 7, x: 0, z: 0 } }), d = planeDrift(t, { period: 6 });
    scenes.a.card.style.transform = planeTransform({ ...a, rx: a.rx + d.rx, ry: a.ry + d.ry, rz: a.rz + d.rz, perspective: 1100 });
    const ty = typeOn(PROMPT, t, { start: TYPE0, cps: CPS }), end = typeEnd(PROMPT, { start: TYPE0, cps: CPS });
    typed.textContent = ty.text; caret.style.left = `${20 + typed.offsetWidth + 3}px`;
    caret.style.opacity = caretVisible(t, { start: 0.1, end, hold: 0.3 }) ? '1' : '0';
    const press = Math.pow(Math.sin(Math.PI * clamp((t - end - 0.1) / 0.3)), 2);
    sendBtn.style.transform = `scale(${1 + 0.1 * press})`; sendBtn.style.boxShadow = `0 0 ${24 * press}px ${C.blue}`;
    // A → B: the whoosh
    applyTransition('zoomContinuation', t, { a: scenes.a, b: scenes.b, overlay, start: 1.9, duration: 0.4, w: A.w, h: A.h, cx: 0.5, cy: 0.5, factor: 2.4, maxBlur: 14 });
    // B: window tilt + satellites, then scatter
    const b = tiltSettle(t, { start: 2.1, duration: 0.8, from: { ry: 20, rx: -4, x: 80, z: -160 }, to: { ry: -9, rx: 6 } }), bd = planeDrift(t, { period: 5, phase: 1 });
    scenes.b.win.style.transform = planeTransform({ ...b, rx: b.rx + bd.rx, ry: b.ry + bd.ry, rz: b.rz + bd.rz, perspective: 1300 });
    sat.forEach((n, i) => {
      const o = orbitPoint(t, { cx: 480, cy: 270, rx: 330, ry: 130, period: 7, phase: (i / 6) * Math.PI * 2, tilt: -0.12 }), s = scatterOut(t, { start: 3.75 + i * 0.03, dur: 0.5, angle: (i / 6) * 360 + 20, distance: 300 });
      n.style.transform = `translate(${o.x - 23 + s.dx}px, ${o.y - 23 + s.dy}px) scale(${o.scale * s.scale})`; n.style.opacity = String(o.opacity * s.opacity * ramp(t, 2.2, 2.6));
      n.style.filter = `blur(${(o.blur + s.blur).toFixed(2)}px)`; n.style.zIndex = o.depth > 0 ? '3' : '1';
    });
    scenes.b.win.style.opacity = String(1 - 0.7 * ramp(t, 3.8, 4.2));
    // C: UI wall with travelling spotlights; headline rising out of masks
    const wk = lerp(1, 1.08, ramp(t, 3.9, 5.9)), lit = litCells(t, wallNodes.length, { count: 3, period: 0.8, seed: 9 });
    scenes.c.wall.style.transform = `perspective(1000px) rotateX(42deg) rotateZ(-12deg) scale(${wk * 1.15})`;
    wallNodes.forEach((n, i) => { n.style.background = lit[i] > 0.01 ? `rgb(${Math.round(13 + 215 * lit[i])},${Math.round(20 + 218 * lit[i])},${Math.round(38 + 212 * lit[i])})` : '#0d1426'; n.style.boxShadow = lit[i] > 0.05 ? `0 0 ${18 * lit[i]}px rgba(76,125,255,${0.8 * lit[i]})` : 'none'; });
    const sl = stackLines(t, 2, { start: 4.3, each: 0.5, dur: 0.7, dimTo: 1 });
    scenes.c.lines.forEach((s, i) => { s.style.transform = `translateY(${sl[i].y * 2}px)`; s.style.opacity = String(sl[i].opacity); s.style.filter = sl[i].blur > 0.05 ? `blur(${sl[i].blur}px)` : 'none'; });
    scenes.c.style.opacity = String(1 - ramp(t, 5.55, 5.9));
    // D: centred stack with dimming, logo + ring
    const st = stackLines(t, 3, { start: 5.7, each: 0.45, dur: 0.6, dimTo: 0.5 });
    scenes.d.lines.forEach((s, i) => { s.style.transform = `translateY(${st[i].y}px)`; s.style.opacity = String(st[i].opacity); });
    const r = pulseRing(t, { start: 6.1, dur: 0.9, r0: 30, r1: 160, width: 3 });
    ring.style.opacity = String(r.opacity); ring.style.width = ring.style.height = `${2 * r.r}px`; ring.style.marginLeft = ring.style.marginTop = `${-r.r}px`; ring.style.borderWidth = `${r.width}px`; ring.style.top = '400px'; ring.style.left = '480px';
    const lp = clamp(ramp(t, 6.05, 6.5)); ringLogo.style.opacity = String(lp); ringLogo.style.transform = `scale(${lerp(0.4, 1, lp)})`;
  },
};
