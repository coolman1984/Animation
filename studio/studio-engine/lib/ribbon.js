// A deterministic, depth-sorted ribbon sculpture. CPU Canvas; no GPU or assets.
// Analytic torus/Mobius mesh, lit per face, evaluated independently at every t.
import { canvas, clamp, sm, col } from './core.js';

export function ribbonGeometry(u, v, { radius = 230, width = 78, twist = 1, phase = 0, fold = 0 } = {}) {
  const a = u * Math.PI * 2, b = twist * a / 2 + phase;
  const r = radius + v * width * Math.cos(b);
  return [r * Math.cos(a), r * Math.sin(a), v * width * Math.sin(b) + fold * Math.sin(a * 3 + phase) * radius * 0.35];
}

export function rotatePoint([x, y, z], ax, ay, az) {
  const y1 = y * Math.cos(ax) - z * Math.sin(ax), z1 = y * Math.sin(ax) + z * Math.cos(ax);
  const x2 = x * Math.cos(ay) + z1 * Math.sin(ay), z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
  return [x2 * Math.cos(az) - y1 * Math.sin(az), x2 * Math.sin(az) + y1 * Math.cos(az), z2];
}

const rgb = hex => hex.replace('#', '').match(/../g).map(x => parseInt(x, 16));
export function ribbon(ctx, e) {
  const g = canvas(ctx.root, ctx.W, ctx.H, e.z ?? 5), k = Math.min(ctx.W, ctx.H) / 1080;
  const ink = rgb(col(ctx.brand, e.color, '#9F7AE8'));
  const a = ctx.T(e.at ?? 0), speed = e.speed ?? 0.5;
  const count = Math.min(24, Math.max(1, e.count ?? 1));
  const draw = (t, cx, cy, scale, index) => {
    const u = t - a, entry = sm(a - 0.05, a + 0.65, t);
    const R = (e.radius ?? 250) * k * scale * (0.55 + 0.45 * entry);
    const ax = (e.tilt ?? 1.03) + 0.22 * Math.sin(u * 0.45 + index);
    const ay = u * speed + index * 0.3, az = (e.rotate ?? -0.35) + 0.16 * Math.sin(u * 0.8);
    const rings = 100, bands = 9, faces = [];
    const point = (i, j) => rotatePoint(ribbonGeometry(i / rings, j / bands * 2 - 1,
      { radius: R, width: (e.width ?? 93) * k * scale, twist: e.twist ?? 1, phase: u * 0.38, fold: e.fold ?? 0 }), ax, ay, az);
    const project = p => { const q = 1250 * k / (1250 * k - p[2]); return [cx + p[0] * q, cy + p[1] * q]; };
    const pts = Array.from({ length: rings + 1 }, (_, i) => Array.from({ length: bands + 1 }, (_, j) => point(i, j)));
    for (let i = 0; i < rings; i++) for (let j = 0; j < bands; j++) {
      const p = [pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1]];
      const A = p[1].map((n, q) => n - p[0][q]), B = p[3].map((n, q) => n - p[0][q]);
      const normal = [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
      const len = Math.hypot(...normal) || 1;
      const light = Math.abs((normal[0] * -0.3 + normal[1] * -0.5 + normal[2] * 0.81) / len);
      const shine = Math.pow(light, 14) * 0.32, shade = 0.38 + light * 0.67;
      const c = ink.map(v => Math.round(Math.min(255, v * shade + (255 - v) * shine)));
      faces.push({ p: p.map(project), z: p.reduce((s, p) => s + p[2], 0) / 4, c });
    }
    // Soft contact shadow grounds the sculpture, separate from its surface light.
    if (e.shadow !== false) {
      g.save(); g.translate(cx, cy + R * 0.75); g.scale(1, 0.16);
      const shadow = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.2);
      shadow.addColorStop(0, 'rgba(16,20,36,0.18)'); shadow.addColorStop(1, 'rgba(16,20,36,0)');
      g.fillStyle = shadow; g.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4); g.restore();
    }
    faces.sort((x, y) => x.z - y.z);
    g.globalAlpha = entry;
    for (const f of faces) {
      g.beginPath(); f.p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
      g.fillStyle = g.strokeStyle = `rgb(${f.c.join(',')})`; g.lineWidth = 0.65 * k;
      g.fill(); g.stroke();
    }
    g.globalAlpha = 1;
  };
  return t => {
    g.clearRect(0, 0, ctx.W, ctx.H);
    if (count === 1) draw(t, (e.x ?? 0.5) * ctx.W, (e.y ?? 0.53) * ctx.H, 1, 0);
    else {
      const cols = e.cols ?? 4, rows = Math.ceil(count / cols);
      const w = (e.fieldWidth ?? 0.55) * ctx.W, h = (e.fieldHeight ?? 0.65) * ctx.H;
      const x0 = (e.x ?? 0.68) * ctx.W - w / 2, y0 = (e.y ?? 0.52) * ctx.H - h / 2;
      for (let i = 0; i < count; i++) draw(t + i * 0.09, x0 + (i % cols + 0.5) * w / cols,
        y0 + (Math.floor(i / cols) + 0.5) * h / rows, e.itemScale ?? 0.32, i);
    }
  };
}
