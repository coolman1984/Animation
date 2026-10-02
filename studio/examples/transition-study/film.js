// TRANSITION STUDY — six graphic shots joined by six motivated transitions (lib/transitions.js).
// circle → window (shapeMatch: the sun's outline becomes the window), a passing bar hides the next cut
// (foregroundWipe), attention melts between planes (focusHandoff), a dot's colour floods the frame
// (colorHandoff), an organic matte (textureWipe), and a push through the centre (zoomContinuation).
// The caption under each shot names the transition that brought it in.
import { el } from '../../lib/motion.js';
import { applyTransition, TRANSITIONS } from '../../lib/transitions.js';
import { textBlock, reveal } from '../../lib/typography.js';

let W, H, u, roots = [], overlay, occluder, labels = [], final;
const SHOT = 1.3, DUR = 0.6;
const PLAN = [
  { bg: '#1D2B53', name: null },
  { bg: '#F28C38', name: 'shapeMatch' },
  { bg: '#2E6F4E', name: 'foregroundWipe' },
  { bg: '#EFE6D2', name: 'focusHandoff' },
  { bg: '#C8372D', name: 'colorHandoff' },
  { bg: '#111111', name: 'textureWipe' },
  { bg: '#F4EFE6', name: 'zoomContinuation' },
];
const starts = PLAN.map((_, i) => i * SHOT); // transition into shot i starts at starts[i] - DUR/2

function root(bg, z) { return el('div', { style: { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px', overflow: 'hidden', background: bg, zIndex: String(z) } }); }
const box = (parent, style) => el('div', { style: { position: 'absolute', ...style } }, parent);

export default {
  duration: PLAN.length * SHOT, fps: 30,
  init(stage, { W: w, H: h }) {
    W = w; H = h; u = Math.min(w, h) / 100;
    roots = PLAN.map((p, i) => stage.appendChild(root(p.bg, i)));
    const d = u * 56, cx = W / 2, cy = H * 0.46;
    box(roots[0], { left: cx - d / 2 + 'px', top: cy - d / 2 + 'px', width: d + 'px', height: d + 'px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #FFC46B, #F28C38 70%)' });
    box(roots[1], { left: cx - u * 22 + 'px', top: cy - u * 30 + 'px', width: u * 44 + 'px', height: u * 60 + 'px', background: '#1D2B53', boxShadow: `0 0 0 ${u * 3}px #FCE2C4` });
    for (let i = 0; i < 9; i++) box(roots[2], { left: '0', top: H * (0.18 + i * 0.075) + 'px', width: W + 'px', height: u * 2.2 + 'px', background: i % 2 ? '#8CC084' : '#CDE7B0', opacity: 0.85 });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) box(roots[3], { left: W * (0.2 + c * 0.2) - u * 4 + 'px', top: H * (0.22 + r * 0.12) - u * 4 + 'px', width: u * 8 + 'px', height: u * 8 + 'px', borderRadius: '50%', background: r === 2 && c === 1 ? '#C8372D' : '#2B2B2B' });
    for (let i = 0; i < 3; i++) box(roots[4], { left: W * (0.18 + i * 0.25) + 'px', top: H * 0.3 + 'px', width: u * 14 + 'px', height: H * 0.34 + 'px', background: '#F6D7CF', borderRadius: u * 7 + 'px' });
    box(roots[5], { left: W / 2 - u * 20 + 'px', top: H * 0.46 - u * 20 + 'px', width: u * 40 + 'px', height: u * 40 + 'px', border: `${u * 1.2}px solid #F4EFE6`, borderRadius: '50%' });
    overlay = el('div', { style: { position: 'absolute', inset: '0', zIndex: '40', display: 'none', pointerEvents: 'none' } }, stage);
    occluder = el('div', { style: { position: 'absolute', left: '0', top: '-5%', width: u * 22 + 'px', height: '110%', background: 'linear-gradient(90deg,#0d1a12,#20372a 50%,#0d1a12)', filter: `blur(${u * 1.5}px)`, zIndex: '41', display: 'none' } }, stage);
    labels = PLAN.map((p, i) => p.name && textBlock(roots[i], p.name.replace(/([A-Z])/g, ' $1').toUpperCase(), { left: '0', width: W + 'px', top: H * 0.86 + 'px', fontFamily: 'Montserrat', fontWeight: 600, fontSize: u * 3.1 + 'px', letterSpacing: '0.22em', color: i === 3 || i === 6 ? '#2B2B2B' : '#F4EFE6' }));
    final = textBlock(roots[6], 'كل انتقال له سبب', { left: '0', width: W + 'px', top: H * 0.4 + 'px', fontFamily: 'Aref Ruqaa', fontWeight: 700, fontSize: u * 10 + 'px', color: '#111111' });
  },
  render(t) {
    const i = Math.min(PLAN.length - 1, Math.max(0, Math.floor((t + DUR / 2) / SHOT))); // shot that owns t after its transition
    roots.forEach((r, k) => { if (k !== i && k !== i - 1) r.style.visibility = 'hidden'; });
    overlay.style.display = 'none'; occluder.style.display = 'none'; // each frame starts clean (pure in t)
    if (i > 0) {
      const p = PLAN[i], start = starts[i] - DUR / 2;
      const d = u * 56;
      const opts = {
        shapeMatch: { box: { x: W / 2 - d / 2, y: H * 0.46 - d / 2, w: d, h: d }, round: d / 2 },
        foregroundWipe: { direction: 'rtl', occluder, occluderWidth: u * 22 },
        focusHandoff: { maxBlur: u * 5 },
        colorHandoff: { color: '#C8372D', cx: 0.4, cy: 0.46 },
        textureWipe: { seed: 11, scale: 2.6, softness: 0.1 },
        zoomContinuation: { cx: 0.5, cy: 0.46, factor: 2.4, maxBlur: u * 2 },
      }[p.name];
      applyTransition(p.name, t, { a: roots[i - 1], b: roots[i], overlay, start, duration: TRANSITIONS[p.name].family === 'occlusion' ? 0.5 : DUR, w: W, h: H, ...opts });
    } else roots[0].style.visibility = 'visible';
    labels.forEach((L, k) => L && reveal(L, t, { tIn: starts[k] + 0.25, tOut: starts[k] + SHOT - DUR / 2 - 0.2, style: 'fade', stagger: 0.03, dur: 0.35, exitDur: 0.2 }));
    reveal(final, t, { tIn: starts[6] + 0.35, style: 'rise', stagger: 0.1, dur: 0.6 });
  },
};
