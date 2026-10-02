// Analytic particle systems on a 2D canvas. Each particle's state is a closed-form function of
// (seed, index, t): no simulation steps to accumulate, so any frame renders identically in any
// order. Depth-aware: particles share the depth camera (pan/zoom parallax) and defocus by distance
// from the focus plane. Use sparingly — atmosphere supports the subject, it never competes with it.
import { el, clamp } from './motion.js';
import { hash, fbm } from './kinetics.js';

const r01 = (seed, i, k) => hash(seed, i, k);
const wrap = (v, lo, span) => lo + ((((v - lo) % span) + span) % span);

// Presets are starting points; override any field.
export const PARTICLE_PRESETS = Object.freeze({
  dust: { count: 70, size: [1.2, 3.2], speed: [4, 14], wind: [6, -3], turbulence: 18, depth: [0.4, 1.6], color: 'rgba(255,244,220,0.85)', life: 0, softness: 0.6 },
  bokeh: { count: 14, size: [40, 120], speed: [2, 6], wind: [3, -2], turbulence: 10, depth: [1.6, 2.4], color: 'rgba(255,236,200,0.18)', life: 0, softness: 0.35 },
  embers: { count: 40, size: [1.5, 4], speed: [20, 60], wind: [8, -45], turbulence: 30, depth: [0.6, 1.4], color: 'rgba(255,170,90,0.9)', life: 3, softness: 0.4, glow: 3 },
  snow: { count: 120, size: [1.5, 5], speed: [10, 30], wind: [-6, 40], turbulence: 20, depth: [0.3, 1.8], color: 'rgba(255,255,255,0.9)', life: 0, softness: 0.5 },
});

// Endless field (wraps within its bounds). opts: { w, h, preset, count, size:[min,max] px, speed:[min,max] px/s,
// wind:[x,y] px/s, turbulence px, depth:[min,max], color | colors, life (0 = immortal, else seconds per cycle),
// softness 0..1, glow, seed, blend, z, margin }. render(t, camera) with the same camera as depthScene.
export function particleField(parent, opts = {}) {
  const o = { ...PARTICLE_PRESETS[opts.preset || 'dust'], seed: 1, margin: 80, blend: 'screen', z: 10, ...opts };
  const { w, h } = o;
  if (!(w > 0 && h > 0)) throw new Error('particleField needs w and h');
  const canvas = el('canvas', { width: w, height: h, style: { position: 'absolute', left: '0', top: '0', width: w + 'px', height: h + 'px',
    pointerEvents: 'none', zIndex: String(o.z), mixBlendMode: o.blend } }, parent);
  const g = canvas.getContext('2d');
  const colors = o.colors || [o.color];
  const P = Array.from({ length: o.count }, (_, i) => {
    const sp = o.speed[0] + r01(o.seed, i, 3) * (o.speed[1] - o.speed[0]), ang = r01(o.seed, i, 4) * Math.PI * 2;
    return { x: r01(o.seed, i, 1), y: r01(o.seed, i, 2), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      size: o.size[0] + r01(o.seed, i, 5) * (o.size[1] - o.size[0]), depth: o.depth[0] + r01(o.seed, i, 6) * (o.depth[1] - o.depth[0]),
      phase: r01(o.seed, i, 7), color: colors[i % colors.length], tw: 0.6 + 0.4 * r01(o.seed, i, 8) };
  });
  // Position of particle i at time t in world px (before camera).
  const at = (p, i, t) => {
    const k = 0.5 + p.depth * 0.5; // nearer particles drift faster on screen
    const tx = fbm(t * 0.15 + p.phase * 10, i * 0.37, { octaves: 2, seed: o.seed }) * o.turbulence;
    const ty = fbm(t * 0.15 + p.phase * 10, i * 0.37 + 50, { octaves: 2, seed: o.seed + 1 }) * o.turbulence;
    const W = w + 2 * o.margin, H = h + 2 * o.margin;
    return [wrap(p.x * W + (p.vx + o.wind[0]) * k * t + tx, -o.margin, W), wrap(p.y * H + (p.vy + o.wind[1]) * k * t + ty, -o.margin, H)];
  };
  return {
    canvas,
    render(t, camera = {}, { opacity = 1, trail = 0, trailSteps = 6 } = {}) {
      const { x: panX = 0, y: panY = 0, zoom = 1, focus = 1, aperture = 0 } = camera;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
      if (opacity <= 0) return;
      g.globalCompositeOperation = 'lighter';
      for (const [i, p] of P.entries()) {
        let alpha = opacity * p.tw;
        if (o.life > 0) { const c = ((t / o.life + p.phase) % 1 + 1) % 1; alpha *= Math.sin(Math.PI * c) ** 1.5; }
        if (alpha <= 0.002) continue;
        const Z = zoom ** p.depth;
        const project = ([x, y]) => [w / 2 + (x - w / 2 - panX * p.depth) * Z, h / 2 + (y - h / 2 - panY * p.depth) * Z];
        const [sx, sy] = project(at(p, i, t));
        const defocus = Math.min(30, Math.abs(p.depth - focus) * aperture);
        const r = Math.max(0.5, p.size * Z * 0.5 + defocus * 0.5);
        const a = alpha * clamp(1 / (1 + defocus * 0.08));
        if (trail > 0) {
          g.strokeStyle = p.color; g.lineCap = 'round'; g.lineWidth = Math.max(0.5, r * 0.8);
          let prev = [sx, sy];
          for (let s = 1; s <= trailSteps; s++) {
            const q = project(at(p, i, t - (trail * s) / trailSteps));
            if (Math.hypot(q[0] - prev[0], q[1] - prev[1]) > w / 2) break; // wrapped: do not draw across the frame
            g.globalAlpha = a * (1 - s / (trailSteps + 1)) * 0.6; g.beginPath(); g.moveTo(...prev); g.lineTo(...q); g.stroke(); prev = q;
          }
        }
        const grad = g.createRadialGradient(sx, sy, 0, sx, sy, r * (1 + (o.glow || 0)));
        grad.addColorStop(0, p.color); grad.addColorStop(clamp(1 - o.softness, 0.05, 0.95) / (1 + (o.glow || 0)), p.color); grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = a; g.fillStyle = grad;
        g.beginPath(); g.arc(sx, sy, r * (1 + (o.glow || 0)), 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    },
  };
}

// One-shot burst (sparks, confetti, crumbs) from an origin at t0: exact projectile motion with
// linear drag. x = x0 + v/λ(1-e^{-λτ}); y adds gravity g: y = y0 + (vy/λ + g/λ²)(1-e^{-λτ}) - gτ/λ.
export function burst(parent, { w, h, x, y, t0 = 0, count = 40, speed = [200, 600], spread = 360, angle = -90, gravity = 900, drag = 2.5,
  life = [0.6, 1.4], size = [2, 5], colors = ['#fff'], seed = 3, z = 12, shape = 'dot', blend = 'normal' } = {}) {
  if (!(w > 0 && h > 0)) throw new Error('burst needs w and h');
  const canvas = el('canvas', { width: w, height: h, style: { position: 'absolute', left: '0', top: '0', width: w + 'px', height: h + 'px', pointerEvents: 'none', zIndex: String(z), mixBlendMode: blend } }, parent);
  const g = canvas.getContext('2d');
  const P = Array.from({ length: count }, (_, i) => {
    const a = (angle + (r01(seed, i, 1) - 0.5) * spread) * Math.PI / 180, s = speed[0] + r01(seed, i, 2) * (speed[1] - speed[0]);
    return { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life[0] + r01(seed, i, 3) * (life[1] - life[0]), size: size[0] + r01(seed, i, 4) * (size[1] - size[0]),
      color: colors[i % colors.length], spin: (r01(seed, i, 5) - 0.5) * 12 };
  });
  return {
    canvas,
    render(t) {
      g.clearRect(0, 0, w, h);
      const tau = t - t0;
      if (tau <= 0) return;
      for (const p of P) {
        if (tau > p.life) continue;
        const e = 1 - Math.exp(-drag * tau);
        const px = x + (p.vx / drag) * e, py = y + (p.vy / drag + gravity / (drag * drag)) * e - (gravity * tau) / drag;
        g.globalAlpha = (1 - tau / p.life) ** 1.4; g.fillStyle = p.color;
        if (shape === 'rect') { g.save(); g.translate(px, py); g.rotate(p.spin * tau); g.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); g.restore(); }
        else { g.beginPath(); g.arc(px, py, p.size, 0, Math.PI * 2); g.fill(); }
      }
      g.globalAlpha = 1;
    },
  };
}
