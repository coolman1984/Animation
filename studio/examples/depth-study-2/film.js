// DEPTH STUDY 2 — aerial perspective, named planes, cover-safe camera, focus travel, depth particles.
// Seven planes share one camera (lib/depth.js): sky (cover, never exposes an edge thanks to clamp()),
// four ridges whose contrast falls with distance (atmosphere haze), the hero stone with a contact
// shadow, and near grass that the focus leaves behind. Dust lives in the same space (lib/particles.js).
// Everything is drawn in code: this is graphic 2.5D, not reconstructed 3D.
import { el } from '../../lib/motion.js';
import { depthScene, PLANES, contactShadow, projectLayer } from '../../lib/depth.js';
import { cameraSpline, rackFocus } from '../../lib/cinema.js';
import { fbm } from '../../lib/kinetics.js';
import { particleField } from '../../lib/particles.js';
import { textBlock, reveal } from '../../lib/typography.js';

let W, H, u, ds, shadow, dust, title;
const ridge = (w, h, seed, rough, base) => {
  let d = `M0 ${h}`;
  for (let x = 0; x <= w; x += w / 80) d += ` L${x.toFixed(1)} ${(base + fbm(x / w * rough, 0.5, { octaves: 4, seed }) * h * 0.35).toFixed(1)}`;
  return d + ` L${w} ${h} Z`;
};
function svgLayer(id, { depth, z, fill, seed, rough, base, height = 0.75 }) {
  const w = W * 1.8, h = H * height;
  const node = ds.add(id, { width: w, height: h, x: W / 2, y: H - h / 2 + H * 0.05, depth, z });
  const s = el('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, style: { width: '100%', height: '100%', overflow: 'visible' } }, node);
  el('path', { d: ridge(w, h, seed, rough, h * base), fill }, s);
}

export default {
  duration: 6, fps: 30,
  init(stage, { W: w, H: h }) {
    W = w; H = h; u = Math.min(w, h) / 100;
    stage.style.background = '#E9B894';
    ds = depthScene(stage, { w, h, atmosphere: { density: 0.55, near: 1 } });
    const sky = ds.add('sky', { width: W * 1.6, height: H * 1.4, depth: PLANES.sky, cover: true, z: 0 });
    sky.style.background = 'linear-gradient(180deg,#F6D7B9 0%,#EDB48F 45%,#C98B78 70%,#8C6C7A 100%)';
    const sun = ds.add('sun', { width: u * 26, height: u * 26, x: W * 0.68, y: H * 0.36, depth: 0.05, z: 1 });
    Object.assign(sun.style, { borderRadius: '50%', background: 'radial-gradient(circle,#FFF2DC 0%,#FFE1B8 40%,rgba(255,225,184,0) 70%)' });
    svgLayer('ridge1', { depth: PLANES.atmosphere, z: 2, fill: '#9C8FA8', seed: 3, rough: 2, base: 0.12 });
    svgLayer('ridge2', { depth: 0.3, z: 3, fill: '#7C7393', seed: 7, rough: 3, base: 0.24 });
    svgLayer('ridge3', { depth: PLANES.background, z: 4, fill: '#5D5878', seed: 11, rough: 4, base: 0.36 });
    svgLayer('ridge4', { depth: PLANES.mid, z: 5, fill: '#3D3A52', seed: 19, rough: 5, base: 0.5 });
    const ground = ds.add('ground', { width: W * 2.2, height: H * 0.3, x: W / 2, y: H * 0.94, depth: 0.95, z: 6 });
    ground.style.background = 'linear-gradient(180deg,#2C2A3A,#1F1D29)';
    shadow = contactShadow(ds.root, { width: u * 36, height: u * 4, color: '#0B0A10', z: 7 });
    const stone = ds.add('stone', { width: u * 15, height: u * 42, x: W * 0.55, y: H * 0.8 - u * 21, depth: PLANES.hero, z: 8 });
    Object.assign(stone.style, { borderRadius: `${u * 6}px ${u * 6}px ${u}px ${u}px`, background: 'linear-gradient(90deg,#1E1C24 0%,#2F2C37 55%,#E8A983 92%,#F5C9A6 100%)' });
    const grass = ds.add('grass', { width: W * 0.9, height: H * 0.42, x: W * 0.12, y: H * 0.9, depth: PLANES.foreground, z: 10 });
    const gs = el('svg', { viewBox: '0 0 100 40', preserveAspectRatio: 'none', style: { width: '100%', height: '100%' } }, grass);
    let d = ''; for (let i = 0; i < 60; i++) { const x = i * 1.7 + fbm(i * 0.3, 1, { seed: 5 }) * 2, hgt = 14 + 20 * (0.5 + 0.5 * fbm(i * 0.21, 2, { seed: 6 })); d += `M${x} 40 Q${x + 1.6} ${40 - hgt * 0.6} ${x + 3 + fbm(i, 3, { seed: 7 }) * 3} ${40 - hgt} Q${x + 1.4} ${40 - hgt * 0.5} ${x + 1.2} 40 Z `; }
    el('path', { d, fill: '#14121A' }, gs);
    dust = particleField(stage, { w, h, preset: 'dust', seed: 8, count: 60, color: 'rgba(255,236,210,0.75)', depth: [0.6, 1.7], z: 11 });
    title = textBlock(stage, 'الأبعد… أهدأ', { left: '0', width: W + 'px', top: H * 0.12 + 'px', fontFamily: 'El Messiri', fontWeight: 500, fontSize: u * 8 + 'px', color: '#3B2E3F', zIndex: 20 });
  },
  camera(t) {
    const base = cameraSpline([{ t: 0, x: -W * 0.08, y: H * 0.02, zoom: 1.04 }, { t: 3.2, x: W * 0.02, y: 0, zoom: 1.1 }, { t: 6, x: W * 0.05, y: -H * 0.01, zoom: 1.13 }], t);
    return { ...base, ...rackFocus(t, { start: 0.6, end: 2.2, from: PLANES.foreground, to: PLANES.hero, aperture: 9 }), maxBlur: u * 2.5 };
  },
  render(t) {
    const cam = ds.clamp(this.camera(t)).camera;
    ds.render(cam);
    const g = projectLayer({ width: 1, height: 1, x: W * 0.55, y: H * 0.8, depth: PLANES.hero }, cam, { w: W, h: H });
    shadow({ x: g.x, y: g.y, scale: g.scale });
    dust.render(t, cam);
    reveal(title, t, { tIn: 2.6, style: 'blur', stagger: 0.12, dur: 1.1 });
  },
};
