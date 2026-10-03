// PIXI STUDY — 20,000 GPU particles through the vendored PixiJS 8 (node studio.mjs setup gpu), software WebGL
// (config gpu: true / render CLI --gpu=1). The DOM canvas path (lib/particles.js) is preferred up to a few thousand;
// this proves the larger case. Contract: no ticker (autoStart false), every particle position is a closed-form
// function of t and a seeded hash, and app.render() runs once per requested frame, so any frame renders in any order.
// Subject: a spiral galaxy of sparks that contracts into a calm ring, leaving room for a readable line.
import { Application, ParticleContainer, Particle, Texture } from 'pixi.js';
import { textLine, playLine, ease, ramp, lerp } from '../../lib/motion.js';
import { hash } from '../../lib/kinetics.js';

const N = 20000;
let app, parts, seeds, W, H, title;
export default {
  duration: 5, fps: 30,
  async init(stage, { W: w, H: h }) {
    W = w; H = h;
    stage.style.background = '#07090F';
    app = new Application();
    await app.init({ width: W, height: H, preference: 'webgl', antialias: false, backgroundAlpha: 0, autoStart: false, resolution: 1, preserveDrawingBuffer: true });
    app.ticker.stop();
    Object.assign(app.canvas.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px' });
    stage.appendChild(app.canvas);
    // One soft dot texture drawn once.
    const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
    const grad = g.createRadialGradient(8, 8, 0, 8, 8, 8); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 16, 16);
    const tex = Texture.from(c);
    parts = new ParticleContainer({ dynamicProperties: { position: true, color: true } });
    seeds = [];
    for (let i = 0; i < N; i++) {
      const s = { a: hash(i, 1, 7) * Math.PI * 2, r: 0.15 + 0.85 * Math.sqrt(hash(i, 2, 7)), k: hash(i, 3, 7), warm: hash(i, 4, 7) < 0.25 };
      seeds.push(s);
      parts.addParticle(new Particle({ texture: tex, x: 0, y: 0, anchorX: 0.5, anchorY: 0.5, scaleX: 0.35 + s.k * 0.5, scaleY: 0.35 + s.k * 0.5, tint: s.warm ? 0xFFC27A : 0x8FB8FF }));
    }
    app.stage.addChild(parts);
    title = textLine(stage, 'عشرون ألف شرارة', { left: '0', top: `${H * 0.82}px`, width: `${W}px`, justifyContent: 'center', fontFamily: "'Alexandria'", fontSize: `${Math.round(Math.min(W, H) * 0.065)}px`, fontWeight: '600', color: '#EAF0FF', zIndex: '5' });
  },
  render(t) {
    const cx = W / 2, cy = H * 0.44, R = Math.min(W, H) * 0.34, settle = ease.inOutCubic(ramp(t, 0.6, 3.6));
    for (let i = 0; i < N; i++) {
      const s = seeds[i], p = parts.particleChildren[i];
      // Galaxy: radius-dependent angular speed (inner faster); settle pulls every spark onto a ring of radius R.
      const ang = s.a + t * (1.6 - s.r) * 1.4 + s.r * 5.0 * (1 - settle);
      const rad = lerp(s.r * R * 1.25, R * (0.96 + 0.08 * s.k), settle);
      p.x = cx + Math.cos(ang) * rad;
      p.y = cy + Math.sin(ang) * rad * lerp(0.55, 1, settle);
      p.alpha = 0.35 + 0.65 * s.k;
    }
    parts.update();
    app.render();
    playLine(title, t, 3.4, 99);
  },
};
