// SHADER STUDY — optional WebGL2 layer (lib/gpu.js), deterministic on SwiftShader; needs gpu: true
// (config) or --gpu=1 (render CLI). Three uses that serve a subject rather than decorate it:
// a living colour field (background material), light rays (motivated light), and a liquid
// displacement that settles to rest so the mark reads cleanly. Time enters only as a uniform.
import { el } from '../../lib/motion.js';
import { shaderLayer, SHADERS, rgb } from '../../lib/gpu.js';
import { spring } from '../../lib/kinetics.js';
import { textBlock, reveal } from '../../lib/typography.js';

let W, H, u, field, rays, liquid, title;
function markCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#F4EFE6'; g.lineWidth = w * 0.035; g.lineCap = 'round';
  g.beginPath(); g.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(w * 0.32, h * 0.5); g.quadraticCurveTo(w * 0.5, h * 0.22, w * 0.68, h * 0.5); g.quadraticCurveTo(w * 0.5, h * 0.78, w * 0.32, h * 0.5); g.stroke();
  return c;
}
export default {
  duration: 5, fps: 30,
  init(stage, { W: w, H: h }) {
    W = w; H = h; u = Math.min(w, h) / 100;
    field = shaderLayer(stage, { w, h, fragment: SHADERS.colorField, scale: 0.5, z: 0 });
    rays = shaderLayer(stage, { w, h, fragment: SHADERS.rays, scale: 0.5, z: 1, blend: 'screen' });
    const m = Math.round(u * 60);
    const holder = el('div', { style: { position: 'absolute', left: (W - m) / 2 + 'px', top: H * 0.46 - m / 2 + 'px', width: m + 'px', height: m + 'px', zIndex: '2' } }, stage);
    liquid = shaderLayer(holder, { w: m, h: m, fragment: SHADERS.displace, textures: { u_tex: markCanvas(512, 512) }, z: 2 });
    title = textBlock(stage, 'ضوء، هوا، خامة', { left: '0', width: W + 'px', top: H * 0.8 + 'px', fontFamily: 'El Messiri', fontWeight: 500, fontSize: u * 6.5 + 'px', color: '#F4EFE6', zIndex: 5 });
  },
  render(t) {
    field.render(t, { u_c0: rgb('#0E2A3B'), u_c1: rgb('#1F4E5F'), u_c2: rgb('#2B1F3A'), u_c3: rgb('#0B1620'), u_amount: 0.45 });
    rays.render(t, { u_origin: [0.15, 1.05], u_amount: 0.55 + 0.15 * Math.sin(t * 0.6), u_color: rgb('#FFE2B0') });
    // Displacement amount springs from turbulent to rest by 3 s, so the mark ends perfectly legible.
    const amount = 0.08 * (1 - spring(t, { from: 0, to: 1, start: 0.4, duration: 2.2, bounce: 0 }));
    liquid.render(t, { u_amount: amount, u_scale: 3.0 });
    reveal(title, t, { tIn: 3.0, style: 'rise', stagger: 0.1, dur: 0.8 });
  },
};
