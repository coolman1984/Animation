// PARTICLES STUDY — analytic particles (lib/particles.js): every particle is a closed-form function of
// (seed, index, t), so frames render identically in any order. Rising embers with trails, defocused
// bokeh nearer the lens, and one burst on a single cue (2.4 s) — restraint: the burst is the event.
import { el } from '../../lib/motion.js';
import { particleField, burst } from '../../lib/particles.js';
import { cameraSpline } from '../../lib/cinema.js';
import { textBlock, reveal } from '../../lib/typography.js';
import { livingGradient } from '../../lib/fx.js';

let W, H, u, bg, glow, embers, bokeh, sparks, title;
const CUE = 2.4;
export default {
  duration: 5, fps: 30,
  init(stage, { W: w, H: h }) {
    W = w; H = h; u = Math.min(w, h) / 100;
    bg = el('div', { style: { position: 'absolute', inset: '0' } }, stage);
    glow = el('div', { style: { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px', mixBlendMode: 'screen' } }, stage);
    embers = particleField(stage, { w, h, preset: 'embers', seed: 21, count: 55, z: 3 });
    bokeh = particleField(stage, { w, h, preset: 'bokeh', seed: 5, count: 9, colors: ['rgba(255,170,90,0.16)', 'rgba(255,214,150,0.12)'], z: 4 });
    sparks = burst(stage, { w, h, x: W * 0.5, y: H * 0.62, t0: CUE, count: 70, speed: [u * 30, u * 110], spread: 160, angle: -90, gravity: u * 120, drag: 2.2,
      life: [0.7, 1.6], size: [u * 0.25, u * 0.6], colors: ['#FFE3A3', '#FFB566', '#FF8A3D'], seed: 9, z: 5, blend: 'screen' });
    title = textBlock(stage, 'شرارة واحدة تكفي', { left: '0', width: W + 'px', top: H * 0.16 + 'px', fontFamily: 'Aref Ruqaa', fontWeight: 700, fontSize: u * 9 + 'px', color: '#FFE7C2', zIndex: 10, textShadow: `0 0 ${u * 3}px rgba(255,140,60,0.45)` });
  },
  camera(t) { return { ...cameraSpline([{ t: 0, y: H * 0.03, zoom: 1.0 }, { t: 5, y: -H * 0.02, zoom: 1.08 }], t), focus: 1, aperture: 12 }; },
  render(t) {
    const flare = Math.exp(-Math.max(0, t - CUE) * 3) * (t >= CUE ? 1 : 0);
    bg.style.background = livingGradient(t, { stops: ['#160C08', '#2A140B', '#120806'], angle: 175, seed: 4 });
    glow.style.background = `radial-gradient(ellipse ${42 + 10 * flare}% ${30 + 8 * flare}% at 50% 64%, rgba(255,150,70,${0.42 + 0.35 * flare}), rgba(255,120,50,0) 70%)`;
    const cam = this.camera(t);
    embers.render(t, cam, { trail: 0.18, trailSteps: 5 });
    bokeh.render(t, cam);
    sparks.render(t);
    reveal(title, t, { tIn: CUE + 0.35, style: 'blur', stagger: 0.1, dur: 0.9 });
  },
};
