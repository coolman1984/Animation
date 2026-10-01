// Unbranded geometric fixture: demonstrates the reusable API, not a client product render.
import { el, textLine, track, ease } from '../../lib/motion.js';
import { depthScene, projectLayer, contactShadow } from '../../lib/depth.js';
let scene, shadow, W, H;
export default {
  duration: 4, fps: 30,
  init(stage, { W: w, H: h }) {
    W = w; H = h;
    stage.style.background = '#e5dbc7';
    scene = depthScene(stage, { w, h });
    const bg = scene.add('background', { width: w * 1.4, height: h * 1.4, depth: 0.35, z: 0 });
    Object.assign(bg.style, { background: 'radial-gradient(ellipse at 70% 20%,#fff7e5,transparent 60%),linear-gradient(135deg,#c4b59a,#eee5d1)' });
    const texture = scene.add('back-form', { x: w * 0.72, y: h * 0.36, width: w * 0.36, height: h * 0.48, depth: 0.5, z: 1 });
    Object.assign(texture.style, { border: `${w * 0.022}px solid #a3ad90`, borderRadius: '100px 100px 0 0' });
    // Shadow sits between background and hero, with an explicitly projected ground anchor.
    shadow = contactShadow(scene.root, { width: w * 0.34, height: h * 0.025, z: 2 });
    const hero = scene.add('hero', { x: w * 0.5, y: h * 0.55, width: w * 0.32, height: h * 0.40, depth: 1, z: 3 });
    Object.assign(hero.style, { borderRadius: `${w * 0.05}px`, border: '1px solid #506750',
      background: 'linear-gradient(100deg,#183f35,#547765 28%,#234b3e 65%,#102f28)', boxShadow: 'inset 4px 0 8px #ffffff20' });
    el('div', { text: 'STUDIO', style: { position: 'absolute', top: '42%', width: '100%', textAlign: 'center', color: '#eee6d0', font: `${w * 0.038}px Montserrat`, letterSpacing: '0.12em' } }, hero);
    const fg = scene.add('foreground', { x: w * 0.93, y: h * 0.84, width: w * 0.45, height: h * 0.46, depth: 1.8, z: 5, rotation: 30 });
    Object.assign(fg.style, { background: '#647a48', borderRadius: '80% 0 80% 0' });
    textLine(stage, 'عمق من غير زحمة', { top: '12%', width: '100%', justifyContent: 'center', color: '#214a3b', fontFamily: 'Plex Arabic', fontSize: `${w * 0.065}px` });
    el('div', { text: 'LAYER / FOCUS STUDY', style: { position: 'absolute', top: '21%', width: '100%', textAlign: 'center', color: '#61735b', font: `${w * 0.019}px Montserrat`, letterSpacing: '0.12em' } }, stage);
  },
  render(t) {
    const camera = { x: track([[0, -W * 0.025], [4, W * 0.025]], t), y: 0,
      zoom: track([[0, 1.02], [4, 1.08]], t),
      focus: track([[0, 0.5], [0.5, 0.5], [1.5, 1]], t, ease.inOutCubic), aperture: 14, maxBlur: 15 };
    scene.render(camera);
    const ground = projectLayer({ width: 1, height: 1, x: W * 0.5, y: H * 0.75, depth: 1 }, camera, { w: W, h: H });
    shadow({ x: ground.x, y: ground.y, scale: ground.scale });
  },
};
