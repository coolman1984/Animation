// A football pitch made of cubes, drawn with a small orbit camera (canvas 2D, no WebGL):
// tiles rain in, the markings draw on, 22 cube-players grow, and the tiles recolour live as a Voronoi
// "pitch control" map — whichever team's player is nearest to a tile owns it. Tiles rise where control is strong.
import { clamp, lerp, rng } from '../lib/motion.js';
import { TAU, easeOutCubic } from './voxel.js';

export const PITCH = { w: 105, h: 68 };
const NX = 42, NY = 27, TX = PITCH.w / NX, TY = PITCH.h / NY;
const GREEN_A = [20, 176, 106], GREEN_B = [14, 150, 90], TEAM_A = [255, 196, 0], TEAM_B = [58, 96, 255];

export function projector({ az, el, dist, f, W, H, cy = 0.56 }) {
  const a = az * Math.PI / 180, e = el * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
  const proj = (x, y, z) => {
    const X = x * ca - y * sa, Y = x * sa + y * ca, d = dist + Y * ce - z * se, u = z * ce + Y * se;
    return [W / 2 + f * X / d, H * cy - f * u / d, d];
  };
  return { proj, cam: { x: -dist * ce * sa, y: -dist * ce * ca, z: dist * se } };
}

const bounce = (q) => { q = clamp(q); if (q < 1 / 2.75) return 7.5625 * q * q; if (q < 2 / 2.75) { q -= 1.5 / 2.75; return 7.5625 * q * q + 0.75; } if (q < 2.5 / 2.75) { q -= 2.25 / 2.75; return 7.5625 * q * q + 0.9375; } q -= 2.625 / 2.75; return 7.5625 * q * q + 0.984375; };
const sh = (c, k) => (k >= 0 ? c + (255 - c) * k : c * (1 + k));
const col = (c, k) => `rgb(${sh(c[0], k) | 0},${sh(c[1], k) | 0},${sh(c[2], k) | 0})`;

// Marking polylines in pitch metres (centre origin).
const LINES = (() => {
  const w = PITCH.w / 2, h = PITCH.h / 2, L = [];
  L.push([[-w, -h], [w, -h], [w, h], [-w, h], [-w, -h]], [[0, -h], [0, h]]);
  L.push(Array.from({ length: 49 }, (_, i) => [9.15 * Math.cos(i / 48 * TAU), 9.15 * Math.sin(i / 48 * TAU)]));
  for (const s of [-1, 1]) {
    L.push([[s * w, -20.15], [s * (w - 16.5), -20.15], [s * (w - 16.5), 20.15], [s * w, 20.15]]);
    L.push([[s * w, -9.15], [s * (w - 5.5), -9.15], [s * (w - 5.5), 9.15], [s * w, 9.15]]);
    L.push([[s * w, -3.66], [s * (w + 2.4), -3.66], [s * (w + 2.4), 3.66], [s * w, 3.66]]);
  }
  return L;
})();

const LEN = LINES.map((poly) => { const c = [0]; for (let i = 1; i < poly.length; i++) c.push(c[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1])); return c; });

export function makePitch() {
  const r = rng(4242), tiles = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const x = (i + 0.5) * TX - PITCH.w / 2, y = (j + 0.5) * TY - PITCH.h / 2;
    tiles.push({ x, y, base: Math.floor(i / 3) % 2 ? GREEN_A : GREEN_B, rnd: r(), dl: 0.62 * r() + 0.38 * (Math.hypot(x / 52, y / 34) / 1.2), de: r(), ang: r() * TAU });
  }
  return { tiles };
}

// o: { cam:{az,el,dist,f}, W,H, drop, lines, players, vor, e (explode), A:[[x,y]..11], B:[..], ball:[x,y,z]|null, passes:[{a,b,k}], offside:{x,k}|null, kick, t }
export function drawPitch(ctx, P, o) {
  const { proj, cam } = projector({ ...o.cam, W: o.W, H: o.H, cy: o.cy });
  const all = [...o.A.map((p, i) => [p, 0, i]), ...o.B.map((p, i) => [p, 1, i])];
  const vor = o.vor ?? 0, kick = o.kick ?? 0, e = o.e ?? 0;
  // --- tiles (back to front) ---
  const items = [];
  for (const t of P.tiles) {
    const q = clamp((o.drop - t.dl * 0.6) / 0.4), qe = e > 0 ? clamp((e - t.de * 0.4) / 0.6) : 0;
    if (q <= 0 || qe >= 1) continue;
    let dA = 1e9, dB = 1e9;
    if (vor > 0) for (const [p, team] of all) { const d = (p[0] - t.x) ** 2 + (p[1] - t.y) ** 2; if (team === 0) { if (d < dA) dA = d; } else if (d < dB) dB = d; }
    const ctrl = vor > 0 ? clamp((Math.sqrt(dB) - Math.sqrt(dA)) / 14, -1, 1) : 0, strength = Math.abs(ctrl);
    const tint = ctrl >= 0 ? TEAM_A : TEAM_B, m = vor * (0.25 + 0.6 * strength);
    const c = [lerp(t.base[0], tint[0], m), lerp(t.base[1], tint[1], m), lerp(t.base[2], tint[2], m)];
    const top = 0.5 + vor * strength * 1.5 + kick * 0.5 * strength * vor;
    const z0 = (1 - bounce(q)) * 42 + qe * qe * (18 + t.de * 46), sc = 1 - 0.8 * qe * qe;
    const cx = t.x + (qe > 0 ? Math.cos(t.ang) * qe * 14 : 0), cy = t.y + (qe > 0 ? Math.sin(t.ang) * qe * 14 : 0);
    items.push({ d: proj(cx, cy, z0 + top / 2)[2], cx, cy, hx: TX / 2 * sc * 0.97, hy: TY / 2 * sc * 0.97, z0: z0, z1: z0 + top, c, a: 1 - qe * qe });
  }
  items.sort((a, b) => b.d - a.d);
  for (const it of items) {
    if (it.a < 0.98) ctx.globalAlpha = it.a;
    boxDraw(ctx, proj, cam, it.cx, it.cy, it.hx, it.hy, it.z0, it.z1, col(it.c, 0.16), col(it.c, -0.2), col(it.c, -0.38));
    if (it.a < 0.98) ctx.globalAlpha = 1;
  }
  if (e > 0.6) return;
  // --- markings (hologram: always on top of the tiles) ---
  const lp = clamp(o.lines ?? 0);
  if (lp > 0) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const pass of [[9, 'rgba(180,255,210,0.22)'], [3.2, 'rgba(255,255,255,0.95)']]) {
      ctx.lineWidth = pass[0]; ctx.strokeStyle = pass[1];
      LINES.forEach((poly, pi) => {
        const cum = LEN[pi], target = cum[cum.length - 1] * lp;
        ctx.beginPath();
        for (let k = 0; k < poly.length; k++) {
          let [x, y] = poly[k];
          if (cum[k] > target) { const f = (target - cum[k - 1]) / (cum[k] - cum[k - 1]); x = poly[k - 1][0] + (x - poly[k - 1][0]) * f; y = poly[k - 1][1] + (y - poly[k - 1][1]) * f; }
          const s = proj(x, y, 0.62); if (k === 0) ctx.moveTo(s[0], s[1]); else ctx.lineTo(s[0], s[1]);
          if (cum[k] > target) break;
        }
        ctx.stroke();
      });
    }
  }
  // --- offside wall ---
  if (o.offside && o.offside.k > 0) {
    const k = o.offside.k, x = o.offside.x, hh = 36;
    const a = proj(x, -hh, 0.6), b = proj(x, hh, 0.6), c = proj(x, hh, 7 * k), d = proj(x, -hh, 7 * k);
    ctx.fillStyle = `rgba(255,61,139,${0.2 * k})`; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.fill();
    ctx.strokeStyle = `rgba(255,61,139,${0.35 + 0.65 * k})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  // --- pass trails ---
  for (const ps of o.passes ?? []) {
    if (ps.k <= 0) continue;
    const n = 18, pts = [];
    for (let i = 0; i <= n * ps.u; i++) { const u = i / n; pts.push(proj(lerp(ps.a[0], ps.b[0], u), lerp(ps.a[1], ps.b[1], u), 1 + 5 * Math.sin(Math.PI * u))); }
    if (pts.length < 2) continue;
    for (const [w, c] of [[11, `rgba(255,214,64,${0.28 * ps.k})`], [3.6, `rgba(255,255,255,${0.95 * ps.k})`]]) {
      ctx.lineWidth = w; ctx.strokeStyle = c; ctx.beginPath(); pts.forEach((s, i) => (i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]))); ctx.stroke();
    }
  }
  // --- players + ball (back to front) ---
  const pg = o.players ?? 0, objs = [];
  all.forEach(([p, team, i], n) => {
    const g = easeOutCubic(clamp((pg - n * 0.025) / 0.42)) * (1 + 0.25 * Math.sin(Math.PI * clamp((pg - n * 0.025) / 0.42)));
    if (g <= 0.01) return;
    objs.push({ d: proj(p[0], p[1], 1)[2], draw: () => player(ctx, proj, cam, p[0], p[1], g, team, i === 0) });
  });
  if (o.ball) objs.push({ d: proj(o.ball[0], o.ball[1], o.ball[2])[2] - 0.5, draw: () => {
    const [x, y, z] = o.ball, s = proj(x, y, 0.6); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(s[0], s[1], 14, 5, 0, 0, TAU); ctx.fill();
    boxDraw(ctx, proj, cam, x, y, 0.95, 0.95, z + 0.6, z + 2.5, '#ffffff', '#d9dcec', '#a9aec8');
  } });
  objs.sort((a, b) => b.d - a.d); for (const ob of objs) ob.draw();
}

function player(ctx, proj, cam, x, y, g, team, gk) {
  const c = gk ? (team ? [0, 224, 255] : [255, 122, 0]) : team ? TEAM_B : TEAM_A;
  const s0 = proj(x, y, 0.55); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(s0[0], s0[1], 21 * g * (130 / s0[2]) * 0.65, 7.5 * g * (130 / s0[2]) * 0.65, 0, 0, TAU); ctx.fill();
  const k = 1.55; g *= k;
  boxDraw(ctx, proj, cam, x, y, 0.55 * g, 0.55 * g, 0.5, 0.5 + 1.0 * g, col(c, -0.45), col(c, -0.55), col(c, -0.7));
  boxDraw(ctx, proj, cam, x, y, 0.82 * g, 0.7 * g, 0.5 + 1.0 * g, 0.5 + 2.1 * g, col(c, 0.1), col(c, -0.15), col(c, -0.35));
  boxDraw(ctx, proj, cam, x, y, 0.46 * g, 0.46 * g, 0.5 + 2.1 * g, 0.5 + 2.9 * g, '#ffe0c2', '#d8b08c', '#b58d6c');
}

function boxDraw(ctx, proj, cam, cx, cy, hx, hy, z0, z1, cTop, cX, cY) {
  const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.fill(); };
  if (cam.x > cx + hx) poly([proj(cx + hx, cy - hy, z0), proj(cx + hx, cy + hy, z0), proj(cx + hx, cy + hy, z1), proj(cx + hx, cy - hy, z1)], cX);
  else if (cam.x < cx - hx) poly([proj(cx - hx, cy - hy, z0), proj(cx - hx, cy + hy, z0), proj(cx - hx, cy + hy, z1), proj(cx - hx, cy - hy, z1)], cX);
  if (cam.y > cy + hy) poly([proj(cx - hx, cy + hy, z0), proj(cx + hx, cy + hy, z0), proj(cx + hx, cy + hy, z1), proj(cx - hx, cy + hy, z1)], cY);
  else if (cam.y < cy - hy) poly([proj(cx - hx, cy - hy, z0), proj(cx + hx, cy - hy, z0), proj(cx + hx, cy - hy, z1), proj(cx - hx, cy - hy, z1)], cY);
  poly([proj(cx - hx, cy - hy, z1), proj(cx + hx, cy - hy, z1), proj(cx + hx, cy + hy, z1), proj(cx - hx, cy + hy, z1)], cTop);
}
