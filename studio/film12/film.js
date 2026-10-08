// Film 12 — "إتكلم كورة" 25 s motion-graphics showreel for a football tactics channel (16:9, 1920×1080).
// Language: voxel/cube mosaics, flat colour worlds with radial rays, an equalizer driven by the real mix,
// manga speed-lines, a cube-built 3D pitch with live pitch-control. Pure render(t); every random is seeded.
// Timeline (bar = 2.0833 s @ 115.2 BPM): 1 ball · 2 pitch (2 bars) · 3 players · 4 Premier League · 5 Egyptian
// league bar-race · 6 manga · 7 data · 8 host · 9 title. Five transition families: iris, blinds, whip, cube-wipe, flash.
import { clamp, lerp, ramp, ease, rng, el, show, textLine, playLine } from '../lib/motion.js';
import { microDrift } from '../lib/cinema.js';
import { TAU, easeOutCubic, easeInOut, easeOutBack, hex, rgb, faces, makeVoxels, textCanvas, cube, drawVoxels, alphaBBox, silhouette } from './voxel.js';
import { makePitch, drawPitch } from './pitch3d.js';
import SPEC from './data/spectrum.js';

const P = (f) => new URL(`./plates/${f}`, import.meta.url).href;
const BPM = 115.2, BEAT = 60 / BPM, BAR = 4 * BEAT;
const SB = [0, 1, 3, 4, 5, 6, 7, 8, 9, 12].map((b) => b * BAR); // scene boundaries
const C = { blue: '#1f2fe0', blue2: '#3a4dff', deep: '#0a1050', yellow: '#f6bd16', yellow2: '#ffd84a', purple: '#38003c', purple2: '#5d0b72', neon: '#00ff85',
  red: '#e0283d', red2: '#b9162f', ink: '#080a14', teal: '#0aa6c8', teal2: '#22cbe8', white: '#ffffff', cream: '#f6efe0', pink: '#ff3d8b' };
const DISPLAY = { fontFamily: 'Lalezar' }, BODY = { fontFamily: 'Cairo', fontWeight: 800 };

let W, H, ctx, world, layer, imgs = {}, built = false, grainTiles = [];
const S = {}, L = {};

// ---------- audio-reactive helpers ----------
const specRow = (f) => SPEC.data[clamp(Math.round(f), 0, SPEC.data.length - 1)];
function band(t, bi) { const f = clamp(t * SPEC.fps, 0, SPEC.data.length - 1), a = Math.floor(f), b = Math.min(SPEC.data.length - 1, a + 1), k = f - a, x = clamp(bi, 0, SPEC.bands - 1), i0 = Math.floor(x), i1 = Math.min(SPEC.bands - 1, i0 + 1), kb = x - i0, row = (r) => lerp(SPEC.data[r][i0], SPEC.data[r][i1], kb); return lerp(row(a), row(b), k) / 255; }
const bassE = (t) => (band(t, 1) + band(t, 2) + band(t, 3) + band(t, 4)) / 4;
const kickEnv = (t) => (t < 1.0417 ? 0 : Math.exp(-((t < 20.9 ? (t - 1.0417) % BEAT : t - 20.83)) / 0.17));
function eq(t, color, { alpha = 0.32, hmax = 0.17, n = 64, y = H, x0 = 0, w = W } = {}) {
  const bw = w / n; ctx.fillStyle = color; ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const v = Math.pow(band(t, Math.min(31, (i / (n - 1)) * 31)), 0.7), h = (0.035 + v * 0.965) * H * hmax;
    ctx.fillRect(x0 + i * bw + bw * 0.14, y - h, bw * 0.72, h);
  }
  ctx.globalAlpha = 1;
}
function rays(cx, cy, ang, n, color, alpha = 1) {
  const R = Math.hypot(W, H); ctx.fillStyle = color; ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i += 2) { const a0 = ang + (i / n) * TAU, a1 = ang + ((i + 1) / n) * TAU; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function rings(t, cx, cy, color, maxR = 820) {
  if (t < 1.0417 || t > 20.9) return;
  const age = ((t - 1.0417) % BEAT) / BEAT, r = easeOutCubic(age) * maxR;
  ctx.strokeStyle = color; ctx.lineWidth = 7;
  ctx.globalAlpha = (1 - age) * 0.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.globalAlpha = (1 - age) * 0.3; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
}
const fillBG = (c) => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); };
const glowDisc = (x, y, r, c0, c1) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };

// ---------- text ----------
function big(text, { size = 170, color = '#fff', ext = '#0b1070', n = 11, top = 40, left = 0, right = null, width = W, justify = 'center', font = DISPLAY, extra = {}, halo = 0 } = {}) {
  const ring = halo ? Array.from({ length: 16 }, (_, i) => `${(halo * Math.cos(i / 16 * TAU)).toFixed(1)}px ${(halo * Math.sin(i / 16 * TAU)).toFixed(1)}px 0 #000`).join(',') + ',' : '';
  const sh = ring + Array.from({ length: n }, (_, i) => `${-(i + 1) * 0.85}px ${(i + 1) * 0.95}px 0 ${ext}`).join(',') + ',0 22px 36px rgba(0,0,0,0.28)';
  const style = { ...font, fontSize: size + 'px', lineHeight: 1.0, color, textShadow: sh, top: top + 'px', justifyContent: justify, ...extra };
  if (right !== null) { style.right = right + 'px'; style.left = 'auto'; } else { style.left = left + 'px'; style.width = width + 'px'; }
  return textLine(layer, text, style);
}
const chip = (text, { top, left, right, color = '#fff', size = 34 }) => textLine(layer, text, { ...BODY, fontSize: size + 'px', lineHeight: 1.2, color, top: top + 'px', ...(right !== undefined ? { right: right + 'px' } : { left: left + 'px' }),
  background: 'rgba(5,8,30,0.55)', padding: '8px 26px 12px', borderRadius: '999px', border: '2px solid rgba(255,255,255,0.55)' });
const POP = { rise: 30, blur: 6, dur: 0.55, stagger: 0.08, scaleFrom: 1.18, exitDur: 0.22, exitRise: -10 };

// ---------- build (first frame; images are decoded by then) ----------
function build() {
  const bbox = (img) => alphaBBox(img);
  // S3 players
  { const img = imgs.players, bb = bbox(img), hh = 960, ww = hh * bb[2] / bb[3];
    S.pl = makeVoxels({ img, src: bb, dest: [(W - ww) / 2, H - hh + 50, ww, hh], cell: 12, seed: 3, order: (nx, ny, r) => nx * 0.72 + r * 0.28, start: 'left' }); }
  // S4 PL logo + trophy
  { const img = imgs.logo, bb = bbox(img), ww = 760, hh = ww * bb[3] / bb[2];
    S.logo = makeVoxels({ img, src: bb, dest: [W * 0.06, H * 0.40 - hh / 2, ww, hh], cell: 10, seed: 4, flat: hex(C.neon), order: (nx, ny, r) => ny * 0.7 + r * 0.3, start: 'fall' }); }
  { const img = imgs.trophy, bb = bbox(img), hh = 900, ww = hh * bb[2] / bb[3];
    S.trophy = makeVoxels({ img, src: bb, dest: [W * 0.75 - ww / 2, H * 0.5 - hh / 2 + 10, ww, hh], cell: 8, seed: 5, order: (nx, ny, r) => (1 - ny) * 0.7 + r * 0.3, start: 'rise' }); }
  // S6 silhouettes
  { const bb = bbox(imgs.players); S.silB = silhouette(imgs.players, '#2f4bff'); S.silBB = bb;
    // comic-ink version of the photo: white / halftone / ink by luminance, clipped to the player silhouette
    const ink = (invert) => { const im = imgs.players, w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
      g.filter = 'blur(1.1px)'; g.drawImage(im, 0, 0); g.filter = 'none'; const d = g.getImageData(0, 0, w, h), q = d.data, orig = document.createElement('canvas'); orig.width = w; orig.height = h; const og = orig.getContext('2d', { willReadFrequently: true }); og.drawImage(im, 0, 0); const oa = og.getImageData(0, 0, w, h).data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, L0 = (q[i] * 0.3 + q[i + 1] * 0.59 + q[i + 2] * 0.11) / 255, Lc = clamp((L0 - 0.5) * 1.8 + 0.5); let white = Lc > 0.64 ? 1 : Lc < 0.3 ? 0 : (((x >> 1) + (y >> 1)) & 1); if (invert) white = 1 - white; const v = white ? 250 : 12; q[i] = q[i + 1] = q[i + 2] = v; q[i + 3] = oa[i + 3]; }
      g.putImageData(d, 0, 0); return c; };
    S.inkA = ink(false); S.inkB = ink(true); }
  // S8 host
  { const img = imgs.host, bb = bbox(img), hh = 900, ww = hh * bb[2] / bb[3];
    S.hostBB = bb; S.hostDest = [W * 0.31 - ww / 2, H - hh + 40, ww, hh];
    S.host = makeVoxels({ img, src: bb, dest: S.hostDest, cell: 9, seed: 8, order: (nx, ny, r) => Math.abs(nx - 0.5) * 0.9 + (1 - ny) * 0.25 + r * 0.25, start: 'swarm' }); }
  // S9 title cubes
  { const c1 = textCanvas('إتكلم كورة', { font: 'Lalezar', size: 340, w: 1500, h: 460 }); const bb1 = alphaBBox(c1), ww = bb1[2];
    S.t1 = makeVoxels({ img: c1, src: bb1, dest: [W / 2 - ww / 2, H * 0.30 - bb1[3] / 2, ww, bb1[3]], cell: 11, seed: 9, flat: [255, 255, 255], order: (nx, ny, r) => r * 0.8 + nx * 0.2, start: 'swarm', minA: 0.4 });
    const c2 = textCanvas('مع تيتو', { font: 'Lalezar', size: 215, w: 900, h: 340 }); const bb2 = alphaBBox(c2);
    S.t2 = makeVoxels({ img: c2, src: bb2, dest: [W / 2 - bb2[2] / 2, H * 0.575 - bb2[3] / 2, bb2[2], bb2[3]], cell: 8, seed: 10, flat: hex(C.yellow), order: (nx, ny, r) => r * 0.8 + (1 - nx) * 0.2, start: 'swarm', minA: 0.4 });
    S.t1c = bb1; S.t2c = bb2; }
  // S1 football
  { const ph = (1 + Math.sqrt(5)) / 2, ico = [[0, 1, ph], [0, -1, ph], [0, 1, -ph], [0, -1, -ph], [1, ph, 0], [-1, ph, 0], [1, -ph, 0], [-1, -ph, 0], [ph, 0, 1], [-ph, 0, 1], [ph, 0, -1], [-ph, 0, -1]].map((v) => { const l = Math.hypot(...v); return v.map((x) => x / l); });
    const r = rng(11), c = 26, R = 292, cells = [];
    for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (let k = -12; k <= 12; k++) {
      const x = i * c, y = j * c, z = k * c, d = Math.hypot(x, y, z);
      if (d > R || d < R - c * 1.15) continue;
      const n = [x / d, y / d, z / d]; let best = -1; for (const v of ico) best = Math.max(best, n[0] * v[0] + n[1] * v[1] + n[2] * v[2]);
      const col = best > 0.936 ? [22, 22, 32] : best > 0.9 ? [150, 156, 176] : [246, 246, 250], a = r() * TAU, m = 700 + r() * 900;
      cells.push({ p: [x, y, z], n, col, dl: r() * 0.55, sx: Math.cos(a) * m, sy: Math.sin(a) * m * 0.75, sz: (r() - 0.5) * 900, rnd: r(), rot: (r() - 0.5) * 2 });
    }
    S.ball = cells; }
  S.pitch = makePitch();
  // S5 bars
  { const teams = [['بيراميدز', 15], ['الزمالك', 13], ['الأهلي', 13], ['سيراميكا كليوباترا', 12], ['مودرن سبورت', 10], ['الاتحاد السكندري', 10], ['المقاولون العرب', 7], ['بتروجت', 7], ['طلائع الجيش', 7], ['زد', 7], ['القناة', 6], ['المصري', 6]];
    const r = rng(55), cs = 20, u = 88, x0 = 1470, top = 296, step = 60;
    const V = { n: 0, cell: cs, x: [], y: [], fill: [], top: [], side: [], h: [], dl: [], de: [], sx: [], sy: [], rot: [], rnd: [], cx: W / 2, cy: H / 2, row: [] };
    teams.forEach(([name, pts], ri) => {
      const len = Math.round(pts * u / cs), base = ri === 0 ? hex(C.yellow) : [255, 255, 255];
      for (let k = 0; k < len; k++) for (let rr = 0; rr < 2; rr++) {
        const f = faces(...(ri === 0 ? base : k % 2 ? [255, 255, 255] : [246, 232, 232]));
        V.x.push(x0 - (k + 0.5) * cs); V.y.push(top + ri * step + (rr + 0.5) * cs); V.fill.push(f.fill); V.top.push(f.top); V.side.push(f.side);
        V.h.push(0.9); V.dl.push(clamp(ri * 0.045 + (k / len) * 0.42 + r() * 0.1)); V.de.push(r()); V.rot.push((r() - 0.5) * 2); V.rnd.push(r()); V.row.push(ri);
        const a = r() * TAU, m = 500 + r() * 800; V.sx.push(Math.cos(a) * m); V.sy.push(Math.sin(a) * m * 0.7); V.n++;
      }
    });
    S.bars = V; S.teams = teams; S.barGeom = { u, x0, top, step }; }
  built = true;
}

// ---------- scenes ----------
const scenes = [];
const sc = (i, o) => { scenes[i] = { i, start: SB[i], end: SB[i + 1], dur: SB[i + 1] - SB[i], ...o }; };
const expl = (tl, dur, w = 0.42) => ramp(tl, dur - w, dur - 0.02);

// 1 · ball ---------------------------------------------------------------------------------------------
sc(0, {
  base(tl) {
    fillBG(C.blue); const cx = W / 2, cy = H * 0.42;
    rays(cx, cy, tl * 0.22, 28, C.blue2, 0.7); glowDisc(cx, cy, 900, 'rgba(120,150,255,0.35)', 'rgba(31,47,224,0)');
    rings(tl, cx, cy, '#ffffff'); eq(tl, '#ffffff', { alpha: 0.3 });
  },
  fg(tl) {
    const cx = W / 2, cy = H * 0.42, R = 292, cells = S.ball, t = tl;
    const pa = ramp(t, 0.04, 1.02), e = expl(t, this.dur);
    const yaw = 0.4 + t * 1.5, tilt = 0.42, cy0 = Math.cos(yaw), sy0 = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
    const bump = 1 + (t > 1.04 ? 0.07 * Math.exp(-(t - 1.04) * 7) * Math.cos((t - 1.04) * 26) : 0) + 0.035 * kickEnv(t);
    const out = [];
    for (const c of cells) {
      const rot = (v) => { const x1 = v[0] * cy0 + v[2] * sy0, z1 = -v[0] * sy0 + v[2] * cy0, y2 = v[1] * ct - z1 * st, z2 = v[1] * st + z1 * ct; return [x1, y2, z2]; };
      const p = rot(c.p), n = rot(c.n);
      if (n[2] < -0.3) continue;
      const q = easeOutCubic(clamp((pa - c.dl * 0.55) / 0.45)); if (q <= 0) continue;
      let x = p[0] * bump * q + c.sx * (1 - q), y = p[1] * bump * q + c.sy * (1 - q), z = p[2] * q + c.sz * (1 - q);
      if (e > 0) { const k = e * (0.4 + e) * (500 + c.rnd * 1100); x += n[0] * k; y += n[1] * k + 900 * e * e * (0.4 + c.rnd); z += n[2] * k; }
      out.push({ x, y, z, n, c, q });
    }
    out.sort((a, b) => a.z - b.z);
    const sd = ramp(t, 0.9, 1.1) * (1 - e); ctx.fillStyle = `rgba(5,10,90,${0.32 * sd})`; ctx.beginPath(); ctx.ellipse(cx, cy + R * 1.12, 300 * (1 + 0.05 * kickEnv(t)), 36, 0, 0, TAU); ctx.fill();
    const Lx = -0.45, Ly = -0.62, Lz = 0.64;
    for (const o of out) {
      const per = 1 / (1 - o.z / 2200), sz = 26 * per * (0.3 + 0.7 * o.q) * (1 - 0.8 * e * e) + 0.01;
      const dif = clamp(o.n[0] * Lx + o.n[1] * Ly + o.n[2] * Lz, 0, 1), k = 0.5 + 0.62 * dif, f = faces(o.c.col[0] * k, o.c.col[1] * k, o.c.col[2] * k);
      const a = Math.sqrt(o.q) * (1 - e * e * e); if (a < 0.02) continue; if (a < 0.995) ctx.globalAlpha = a;
      const x = cx + o.x * per, y = cy + o.y * per, rotA = o.c.rot * ((1 - o.q) * 5 + e * 7);
      if (Math.abs(rotA) < 0.002) cube(ctx, x, y, sz, sz * 0.3, -sz * 0.24, f.fill, f.top, f.side);
      else { ctx.save(); ctx.translate(x, y); ctx.rotate(rotA); cube(ctx, 0, 0, sz, sz * 0.3, -sz * 0.24, f.fill, f.top, f.side); ctx.restore(); }
      if (a < 0.995) ctx.globalAlpha = 1;
    }
  },
});

// 2 · cube pitch ------------------------------------------------------------------------------------------
const FA1 = [[-50, 0], [-30, -24], [-30, -8], [-30, 8], [-30, 24], [-8, -16], [-8, 0], [-8, 16], [14, -22], [14, 0], [14, 22]];
const FA2 = [[-44, 0], [-12, -26], [-12, -9], [-12, 9], [-12, 26], [14, -18], [14, 0], [14, 18], [34, -24], [36, 0], [34, 24]];
const FB1 = [[50, 0], [34, -24], [34, -8], [34, 8], [34, 24], [18, -27], [18, -9], [18, 9], [18, 27], [2, -8], [2, 8]];
const FB2 = [[48, 0], [26, -22], [26, -7], [26, 7], [26, 22], [12, -23], [12, -8], [12, 8], [12, 23], [6, -8], [6, 8]];
const PASS = [[0, 2], [2, 6], [6, 8], [8, 9]]; // A-player indices; then a shot from 9
const PT0 = 3.95, PD = 0.36, PL = 0.33;
const teamAt = (t, F1, F2, seed) => { const m = ease.inOutSine(ramp(t, 4.3, 5.1)); return F1.map((a, i) => [lerp(a[0], F2[i][0], m) + Math.sin(t * 1.7 + i * 2.1 + seed) * 0.9, lerp(a[1], F2[i][1], m) + Math.cos(t * 1.3 + i * 1.7 + seed) * 0.9]); };
sc(1, {
  base(tl) {
    const t = this.start + tl; fillBG('#032a27'); glowDisc(W / 2, H * 0.6, 1100, 'rgba(18,150,100,0.5)', 'rgba(3,42,39,0)');
    ctx.strokeStyle = 'rgba(120,255,200,0.07)'; ctx.lineWidth = 2; for (let i = -6; i < 16; i++) { const x = i * 140 + ((t * 20) % 140); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 360, H); ctx.stroke(); }
    eq(t, '#7dffc9', { alpha: 0.22, hmax: 0.12 });
  },
  fg(tl) {
    const t = this.start + tl, u = ramp(t, 1.8, 6.4);
    const az = -50 + 86 * ease.inOutSine(u) + microDrift(t, { seed: 2, x: 0.6 }).x, el_ = 64 - 27 * Math.sin(Math.PI * Math.pow(u, 0.92)) + microDrift(t, { seed: 3, y: 0.5 }).y, dist = 152 - 40 * Math.sin(Math.PI * u) - 10 * u;
    const A = teamAt(t, FA1, FA2, 0), B = teamAt(t, FB1, FB2, 3);
    // ball + passes
    let ball = null; const passes = []; const holder = (k) => (k === 0 ? 0 : PASS[k - 1][1]);
    const tShot = PT0 + PD * PASS.length;
    if (t > 3.4) {
      let cur = 0, pos = [A[0][0], A[0][1], 0];
      PASS.forEach(([a, b], k) => {
        const t0 = PT0 + PD * k, u2 = clamp((t - t0) / PL);
        if (t >= t0) { passes.push({ a: A[a], b: A[b], u: u2, k: clamp(1 - (t - t0 - PL) / 0.9) }); }
        if (t >= t0 + PL) cur = b; else if (t >= t0) { cur = -1; pos = [lerp(A[a][0], A[b][0], easeInOut(u2)), lerp(A[a][1], A[b][1], easeInOut(u2)), 6 * Math.sin(Math.PI * u2)]; }
      });
      if (t >= tShot) { const us = clamp((t - tShot) / 0.3); const from = A[9]; pos = [lerp(from[0], 52.5, easeInOut(us)), lerp(from[1], 1.5, easeInOut(us)), 3 * Math.sin(Math.PI * us)]; cur = -1; }
      else if (cur >= 0) pos = [A[cur][0] + 1.4, A[cur][1], 0];
      ball = [pos[0], pos[1], pos[2]];
    }
    const e = ramp(t, 5.78, 6.2);
    drawPitch(ctx, S.pitch, { cam: { az, el: el_, dist, f: 1500 }, W, H, cy: 0.58, drop: ramp(t, 1.7, 2.7), lines: ease.inOutSine(ramp(t, 2.45, 3.15)), players: ramp(t, 2.7, 3.4), vor: ease.inOutSine(ramp(t, 3.6, 4.4)),
      e, A, B, ball, passes, offside: { x: lerp(34, 26, ease.inOutSine(ramp(t, 4.3, 5.1))), k: ramp(t, 4.6, 4.9) * (1 - ramp(t, 5.55, 5.7)) }, kick: kickEnv(t) });
    // goal flash
    const gf = Math.max(0, 1 - Math.abs(t - 5.62) / 0.14); if (gf > 0) { ctx.fillStyle = `rgba(255,255,255,${0.55 * gf})`; ctx.fillRect(0, 0, W, H); }
  },
});

// 3 · players ---------------------------------------------------------------------------------------------
sc(2, {
  base(tl) {
    const t = this.start + tl; fillBG(C.yellow);
    const s = 120, off = (t * 60) % (s * 2);
    ctx.fillStyle = C.yellow2; for (let j = -1; j < H / s + 1; j++) for (let i = -2; i < W / s + 2; i++) if ((i + j) % 2 === 0) ctx.fillRect(i * s + off - s * (j % 2 ? 0 : 0) , j * s, s, s);
    glowDisc(W * 0.5, H * 0.55, 900, 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)');
    rings(t, W / 2, H * 0.55, '#ffffff', 900); eq(t, '#a87400', { alpha: 0.38, hmax: 0.2 });
  },
  fg(tl) {
    const t = this.start + tl, p = ramp(tl, -0.3, 0.62), e = expl(tl, this.dur), b = bassE(t);
    drawVoxels(ctx, S.pl, { p, e, ext: 1.5 + 1.6 * b, scale: 1 + 0.018 * kickEnv(t), alpha: 1, ox: W * 0.5, oy: H * 0.55, dx: Math.sin(t * 1.2) * 6, dy: 0 });
  },
});

// 4 · Premier League ---------------------------------------------------------------------------------------
sc(3, {
  base(tl) {
    const t = this.start + tl; fillBG(C.purple); const cx = W * 0.5, cy = H * 0.5;
    rays(cx, cy, -tl * 0.18, 30, C.purple2, 0.85); glowDisc(W * 0.72, H * 0.4, 800, 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)');
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(W * 0.72 - 40, 0); ctx.lineTo(W * 0.72 + 40, 0); ctx.lineTo(W * 0.72 + 360, H); ctx.lineTo(W * 0.72 - 360, H); ctx.fill();
    rings(t, W * 0.72, H * 0.5, C.neon, 800); eq(t, C.neon, { alpha: 0.28, hmax: 0.16 });
  },
  fg(tl) {
    const t = this.start + tl, e = expl(tl, this.dur), b = bassE(t);
    drawVoxels(ctx, S.logo, { p: ramp(tl, -0.32, 0.5), e, ext: 1 + 1.2 * b, ox: W * 0.3, oy: H * 0.4, scale: 1 + 0.015 * kickEnv(t) });
    drawVoxels(ctx, S.trophy, { p: ramp(tl, -0.25, 0.6), e, ext: 1 + 1.2 * b, ox: W * 0.72, oy: H * 0.5, scale: 1 + 0.012 * kickEnv(t), dy: Math.sin(t * 1.4) * 6 });
  },
});

// 5 · Egyptian league bar race ------------------------------------------------------------------------------
sc(4, {
  base(tl) {
    const t = this.start + tl; fillBG(C.red); rays(W * 0.3, H * 0.55, tl * 0.2, 26, C.red2, 0.8); glowDisc(W * 0.35, H * 0.55, 1000, 'rgba(255,120,120,0.3)', 'rgba(224,40,61,0)');
    eq(t, '#7a0c1e', { alpha: 0.45, hmax: 0.14 });
  },
  fg(tl) {
    const t = this.start + tl, e = expl(tl, this.dur, 0.32), { u, x0, top, step } = S.barGeom;
    drawVoxels(ctx, S.bars, { p: ramp(tl, -0.3, 0.95), e, ext: 0.9 + 0.8 * bassE(t), ox: W * 0.5, oy: H * 0.6, ux: 0.7, uy: -0.7 });
    // labels + counters (canvas text uses the same Arabic shaping as the DOM)
    ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    S.teams.forEach(([name, pts], ri) => {
      const y = top + ri * step + 20, a = ramp(tl, -0.15 + ri * 0.04, 0.12 + ri * 0.04) * (1 - e);
      if (a <= 0) return;
      ctx.globalAlpha = a; ctx.textAlign = 'right'; ctx.fillStyle = ri === 0 ? C.yellow : '#fff'; ctx.font = `800 36px Cairo`;
      ctx.fillText(name, W - 100, y);
      const v = Math.round(pts * easeOutCubic(ramp(tl, -0.1 + ri * 0.04, 1.1))); ctx.textAlign = 'right'; ctx.font = `40px Lalezar`; ctx.fillStyle = '#fff';
      ctx.fillText(String(v).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]), x0 - pts * u - 18, y + 2); ctx.globalAlpha = 1;
    });
  },
});

// 6 · manga --------------------------------------------------------------------------------------------------
const NEG = [0.0, 0.52, 1.04, 1.56];
sc(5, {
  base(tl) {
    const t = this.start + tl, inv = NEG.some((n) => tl >= n && tl < n + 0.07); fillBG(inv ? '#f4f4f4' : '#06060c');
    const st = Math.floor(tl * 12), r = rng(900 + st), cx = W / 2, cy = H * 0.56;
    ctx.fillStyle = inv ? '#0a0a14' : '#ffffff';
    for (let i = 0; i < 140; i++) {
      const a = r() * TAU, r0 = 330 + r() * 260, r1 = 1500, da = 0.003 + r() * 0.011;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.8); ctx.lineTo(cx + Math.cos(a - da) * r1, cy + Math.sin(a - da) * r1); ctx.lineTo(cx + Math.cos(a + da) * r1, cy + Math.sin(a + da) * r1); ctx.fill();
    }
    ctx.fillStyle = inv ? 'rgba(10,10,20,0.55)' : 'rgba(255,255,255,0.4)';
    for (let y = 0; y < H + 30; y += 30) for (let x = ((y / 30) % 2) * 15; x < W + 30; x += 30) { const d = Math.hypot(x - cx, (y - cy) * 1.2), k = clamp((d - 760) / 520); if (k <= 0) continue; ctx.beginPath(); ctx.arc(x, y, k * 8.5, 0, TAU); ctx.fill(); }
  },
  fg(tl) {
    const bb = S.silBB, hh = 860, ww = hh * bb[2] / bb[3], e = expl(tl, this.dur, 0.28);
    const st = Math.floor(tl * 12), r = rng(300 + st), jx = (r() - 0.5) * 16, jy = (r() - 0.5) * 12, inv = NEG.some((n) => tl >= n && tl < n + 0.07);
    const pop = 1 + 0.12 * Math.exp(-tl * 9) + 0.02 * kickEnv(this.start + tl), cx = W / 2, cy = H * 0.65;
    if (e >= 1) return; ctx.save(); ctx.translate(cx + jx, cy + jy); ctx.scale(pop * (1 + 0.6 * e), pop * (1 + 0.6 * e)); ctx.globalAlpha = 1 - e * e;
    const off = 22 + 10 * kickEnv(this.start + tl);
    ctx.drawImage(S.silB, bb[0], bb[1], bb[2], bb[3], -ww / 2 + off, -hh / 2 + off * 0.7, ww, hh);
    ctx.drawImage(inv ? S.inkB : S.inkA, bb[0], bb[1], bb[2], bb[3], -ww / 2, -hh / 2, ww, hh); ctx.restore(); ctx.globalAlpha = 1;
  },
});

// 7 · data -----------------------------------------------------------------------------------------------------
const SHOTS = [[0.62, 0.30, 0.9, 0], [0.74, 0.46, 1.0, 1], [0.58, 0.58, 0.45, 0], [0.80, 0.55, 1.0, 1], [0.70, 0.70, 0.5, 0], [0.64, 0.42, 0.7, 0], [0.86, 0.40, 0.8, 1], [0.52, 0.48, 0.3, 0], [0.77, 0.30, 0.6, 0]];
const HOT = [[0.72, 0.5, 0.18, 1.0], [0.55, 0.32, 0.16, 0.7], [0.58, 0.7, 0.15, 0.6]];
const ramp5 = (v) => { const c = [[10, 20, 90], [40, 90, 255], [20, 220, 235], [255, 220, 40], [255, 70, 60]], x = clamp(v) * 4, i = Math.min(3, Math.floor(x)), k = x - i; return c[i].map((a, j) => a + (c[i + 1][j] - a) * k); };
sc(6, {
  base(tl) {
    const t = this.start + tl; fillBG('#080d3a'); glowDisc(W * 0.4, H * 0.55, 1100, 'rgba(60,90,255,0.35)', 'rgba(8,13,58,0)');
    ctx.strokeStyle = 'rgba(120,150,255,0.14)'; ctx.lineWidth = 2; for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    rings(t, W * 0.4, H * 0.56, '#5b7cff', 900); eq(t, '#4f6cff', { alpha: 0.4, hmax: 0.16 });
  },
  fg(tl) {
    const t = this.start + tl, e = expl(tl, this.dur), X0 = 130, Y0 = 250, PW = 900, PHH = 690, b = bassE(t);
    const px = (u) => X0 + u * PW, py = (v) => Y0 + v * PHH;
    // heat cubes
    const cs = 30, r = rng(77);
    for (let j = 0; j < PHH / cs; j++) for (let i = 0; i < PW / cs; i++) {
      const u = (i + 0.5) * cs / PW, v = (j + 0.5) * cs / PHH; let h = 0;
      for (const [hx, hy, s, w] of HOT) h += w * Math.exp(-(((u - hx) / s) ** 2 + ((v - hy) / s) ** 2) / 2 * 1.3);
      h = clamp(h); const dl = Math.hypot(u - 0.7, v - 0.5), g = clamp((tl + 0.25 - dl * 0.6) / 0.35) * (1 - clamp((e - r() * 0.4) / 0.6));
      if (h < 0.1 || g <= 0) continue;
      const c = ramp5(h * (0.9 + 0.2 * b)), f = faces(...c), s = cs * (0.4 + 0.6 * easeOutCubic(g)) * (1 - 0.6 * e);
      ctx.globalAlpha = Math.min(1, g * 1.4) * (1 - e); cube(ctx, px(u), py(v), s - 2, s * 0.26 * (0.5 + h + b * 0.6), -s * 0.22 * (0.5 + h + b * 0.6), f.fill, f.top, f.side);
    }
    ctx.globalAlpha = 1 - e * e;
    // pitch lines
    const lp = easeInOut(ramp(tl, -0.3, 0.4)); ctx.strokeStyle = `rgba(255,255,255,${lp})`; ctx.lineWidth = 5;
    const rect = (a, b2, c2, d) => ctx.strokeRect(px(a), py(b2), (c2 - a) * PW, (d - b2) * PHH);
    rect(0, 0, 1, 1); rect(0.6, 0.22, 1, 0.78); rect(0.86, 0.38, 1, 0.62); ctx.beginPath(); ctx.arc(px(0.0), py(0.5), 0.14 * PHH, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(px(0.72), py(0.5), 5, 0, TAU); ctx.stroke();
    // shots with arcs
    SHOTS.forEach(([sx, sy, xg, goal], i) => {
      const t0 = 0.1 + i * 0.1, a = clamp((tl - t0) / 0.28); if (a <= 0) return;
      const gx = px(1), gy = py(0.5 + (sy - 0.5) * 0.18), x1 = px(sx), y1 = py(sy), cxp = (x1 + gx) / 2, cyp = Math.min(y1, gy) - 80 * xg;
      ctx.strokeStyle = goal ? C.yellow2 : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2 + 3 * xg; ctx.beginPath(); ctx.moveTo(x1, y1);
      for (let k = 1; k <= 14; k++) { const uu = (k / 14) * a, ax = (1 - uu) * (1 - uu) * x1 + 2 * (1 - uu) * uu * cxp + uu * uu * gx, ay = (1 - uu) * (1 - uu) * y1 + 2 * (1 - uu) * uu * cyp + uu * uu * gy; ctx.lineTo(ax, ay); } ctx.stroke();
      const sz = (10 + 22 * xg) * easeOutBack(clamp((tl - t0 + 0.05) / 0.25)); ctx.fillStyle = goal ? C.yellow : '#ffffff'; ctx.fillRect(x1 - sz / 2, y1 - sz / 2, sz, sz);
      ctx.strokeStyle = '#06103a'; ctx.lineWidth = 3; ctx.strokeRect(x1 - sz / 2, y1 - sz / 2, sz, sz);
    });
    ctx.globalAlpha = 1;
    // radar + meters (right panel) — abstract shapes, no figures claimed
    const rx = 1440, ry = 545, RR = 265, k = easeOutBack(clamp((tl + 0.1) / 0.5)) * (1 - e);
    if (k > 0.01) {
      ctx.globalAlpha = Math.min(1, k); ctx.strokeStyle = 'rgba(160,185,255,0.45)'; ctx.lineWidth = 2;
      for (const f of [0.34, 0.67, 1]) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; ctx[i ? 'lineTo' : 'moveTo'](rx + Math.cos(a) * RR * f * k, ry + Math.sin(a) * RR * f * k); } ctx.closePath(); ctx.stroke(); }
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(a) * RR * k, ry + Math.sin(a) * RR * k); ctx.stroke(); }
      const m = ease.inOutSine(ramp(tl, 0.5, 1.3)), shapeA = [0.5, 0.62, 0.4, 0.55, 0.45, 0.6], shapeB = [0.92, 0.7, 0.85, 0.95, 0.66, 0.88];
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6, v = lerp(shapeA[i], shapeB[i], m) * (0.95 + 0.07 * b); ctx[i ? 'lineTo' : 'moveTo'](rx + Math.cos(a) * RR * v * k, ry + Math.sin(a) * RR * v * k); } ctx.closePath();
      ctx.fillStyle = 'rgba(255,216,74,0.32)'; ctx.fill(); ctx.strokeStyle = C.yellow2; ctx.lineWidth = 5; ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6, v = lerp(shapeA[i], shapeB[i], m); ctx.fillStyle = '#fff'; ctx.fillRect(rx + Math.cos(a) * RR * v * k - 9, ry + Math.sin(a) * RR * v * k - 9, 18, 18); }
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 3; i++) {
      const y = 862 + i * 50, lenN = 18, fill = [0.78, 0.55, 0.9][i] * easeOutCubic(ramp(tl, 0.3 + i * 0.12, 1.1)) * lenN;
      for (let j = 0; j < lenN; j++) { const on = j < fill, a = (on ? 1 : 0.2) * (1 - e); if (a <= 0.02) continue; ctx.globalAlpha = a; const f = faces(...(on ? hex(j > lenN * 0.7 ? C.yellow : '#4f7cff') : [90, 110, 190])); cube(ctx, 1160 + j * 28, y, 22, 6, -5, f.fill, f.top, f.side); }
    }
    ctx.globalAlpha = 1;
  },
});

// 8 · host -------------------------------------------------------------------------------------------------------
sc(7, {
  base(tl) {
    const t = this.start + tl; fillBG(C.teal); const cx = W * 0.31, cy = H * 0.5;
    rays(cx, cy, tl * 0.2, 26, C.teal2, 0.85); glowDisc(cx, cy, 800, 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)');
    rings(t, cx, cy, '#ffffff', 800); eq(t, '#056a82', { alpha: 0.45, hmax: 0.18 });
    // HUD orbit: arcs and plus signs around the host
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; const a0 = tl * 1.2;
    for (const [R, w, s] of [[560, 0.9, 1], [640, 0.55, -1.4], [720, 0.35, 0.8]]) { ctx.beginPath(); ctx.arc(cx, cy, R, a0 * s, a0 * s + TAU * w * 0.5); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, R, a0 * s + Math.PI, a0 * s + Math.PI + TAU * w * 0.3); ctx.stroke(); }
    ctx.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { const a = i * 0.7 + tl * 0.5, R = 480 + (i % 3) * 80, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.9; ctx.fillRect(x - 14, y - 3, 28, 6); ctx.fillRect(x - 3, y - 14, 6, 28); }
  },
  fg(tl) {
    const t = this.start + tl, e = expl(tl, this.dur), b = bassE(t), d = S.hostDest, bb = S.hostBB;
    const real = ease.inOutSine(ramp(tl, 0.8, 1.15)) * (1 - ramp(tl, 1.62, 1.78));
    drawVoxels(ctx, S.host, { p: ramp(tl, -0.32, 0.8), e, ext: (1.5 + 1.3 * b) * (1 - 0.8 * real), alpha: 1, ox: W * 0.31, oy: H * 0.55, cellScale: 1 + 0.05 * real });
    if (real > 0.01) { ctx.globalAlpha = real; ctx.drawImage(imgs.host, bb[0], bb[1], bb[2], bb[3], d[0], d[1], d[2], d[3]); ctx.globalAlpha = 1; }
  },
});

// 9 · title ----------------------------------------------------------------------------------------------------------
const LOCK = 10 * BAR; // 20.833 — the title locks on the downbeat of bar 11
sc(8, {
  base(tl) {
    const t = this.start + tl; fillBG(C.blue); const cx = W / 2, cy = H * 0.42;
    rays(cx, cy, 0.3 + tl * 0.16, 30, C.blue2, 0.75); glowDisc(cx, cy, 1000, 'rgba(140,165,255,0.4)', 'rgba(31,47,224,0)');
    rings(t, cx, cy, '#ffffff', 900);
    // shockwave on the lock
    const sw = clamp((t - LOCK) / 0.9); if (sw > 0 && sw < 1) { ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - sw)})`; ctx.lineWidth = 14 * (1 - sw) + 2; ctx.beginPath(); ctx.arc(cx, H * 0.42, easeOutCubic(sw) * 1300, 0, TAU); ctx.stroke(); }
    eq(t, '#ffffff', { alpha: 0.34, hmax: 0.2 });
  },
  fg(tl) {
    const t = this.start + tl, b = bassE(t), lock = t >= LOCK, k = kickEnv(t);
    const p1 = ramp(t, 18.5, 19.95), p2 = ramp(t, 19.35, 20.45), real = ease.inOutSine(ramp(t, LOCK, LOCK + 0.35));
    const pulse = 1 + (lock ? 0.05 * Math.exp(-(t - LOCK) * 5) : 0.012 * k);
    if (real < 1) {
      ctx.globalAlpha = 1 - real; drawVoxels(ctx, S.t1, { p: p1, ext: 0.9 + 1.3 * b - 0.8 * real, scale: pulse, ux: 0.8, uy: -0.7 });
      drawVoxels(ctx, S.t2, { p: p2, ext: 0.9 + 1.3 * b - 0.8 * real, scale: pulse, ux: 0.8, uy: -0.7 }); ctx.globalAlpha = 1;
    }
    const f = Math.max(0, 1 - Math.abs(t - LOCK) / 0.1); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${0.6 * f})`; ctx.fillRect(0, 0, W, H); }
    // ambient cubes drift upward through the closing hold, so the end card is alive, never frozen
    if (t > LOCK + 0.3) { const r = rng(33); for (let i = 0; i < 34; i++) { const sx = r() * W, sp = 18 + r() * 40, sz = 8 + r() * 20, ph = r() * 8, y = H + 40 - ((t * sp + ph * 200) % (H + 80)), x = sx + Math.sin(t * 0.8 + ph) * 26, a = 0.18 + 0.3 * r(); ctx.globalAlpha = a * ramp(t, LOCK + 0.3, LOCK + 1.0); const f = faces(...(i % 4 === 0 ? hex(C.yellow) : [255, 255, 255])); cube(ctx, x, y, sz, sz * 0.3, -sz * 0.25, f.fill, f.top, f.side); } ctx.globalAlpha = 1; }
    // CTA sparks
    const sp = ramp(t, 22.3, 22.9); if (sp > 0 && sp < 1) { const r = rng(5); ctx.fillStyle = '#fff'; for (let i = 0; i < 26; i++) { const a = r() * TAU, d = easeOutCubic(sp) * (140 + r() * 260), s = 10 * (1 - sp); ctx.fillRect(W / 2 + Math.cos(a) * d - s / 2, H * 0.915 + Math.sin(a) * d * 0.5 - s / 2, s, s); } }
  },
});

// ---------- transitions ----------
const TR = [
  { type: 'iris', pt: [0.5, 0.42], dur: 0.42 }, { type: 'blinds', dur: 0.42 }, { type: 'whip', dir: -1, dur: 0.42 }, { type: 'cubewipe', dur: 0.42 },
  { type: 'flash', dur: 0.14 }, { type: 'whip', dir: 0, dur: 0.42 }, { type: 'iris', pt: [0.31, 0.5], dur: 0.42 }, { type: 'blinds', dir: 1, dur: 0.42 },
];
function clipFor(tr, p) {
  ctx.beginPath();
  if (tr.type === 'iris') { const [px, py] = [tr.pt[0] * W, tr.pt[1] * H]; ctx.arc(px, py, easeInOut(p) * Math.hypot(W, H), 0, TAU); }
  else if (tr.type === 'blinds') { const n = 9; for (let i = 0; i < n; i++) { const q = clamp(p * 1.55 - i * 0.065); if (tr.dir) { const h = H / n; ctx.rect(0, i * h, W, h * easeInOut(q) + 1); } else { const w = W / n; ctx.rect(i * w, 0, w * easeInOut(q) + 1, H); } } }
  else if (tr.type === 'cubewipe') { const cs = 120, nx = Math.ceil(W / cs), ny = Math.ceil(H / cs); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = easeOutBack(clamp(p * 1.8 - (i / nx + j / ny) * 0.4), 0.9), s = cs * Math.max(0, q) * 1.03; ctx.rect(i * cs + (cs - s) / 2, j * cs + (cs - s) / 2, s, s); } }
  ctx.clip();
}

// ---------- shake / flash ----------
const BOOMS = [1.0417, ...SB.slice(1, 9), LOCK];
function shake(t) {
  let ax = 0, ay = 0;
  for (const b of BOOMS) { const a = t - b; if (a >= 0 && a < 0.4) { const k = Math.exp(-a / 0.09) * (b === LOCK ? 20 : 12); ax += Math.sin(a * 83) * k; ay += Math.cos(a * 71) * k * 0.8; } }
  return [ax, ay];
}

export default {
  duration: 25, fps: 30,
  init(stageEl, opts) {
    W = opts.W; H = opts.H;
    world = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px' } }, stageEl);
    const cv = el('canvas', { width: W, height: H, class: 'abs' }, world); ctx = cv.getContext('2d');
    layer = el('div', { class: 'abs', style: { width: W + 'px', height: H + 'px' } }, world);
    for (const [k, f] of [['players', 'players-cut.png'], ['host', 'host-cut.png'], ['logo', 'pl-logo-cut.png'], ['trophy', 'trophy-cut.png']]) {
      imgs[k] = el('img', { src: P(f), style: { display: 'none' } }, stageEl);
    }
    // text lines (all hidden until their window)
    L.s1 = big('الكورة', { size: 230, top: H * 0.705, color: '#fff', ext: '#0a1060' });
    L.s2a = big('مش حظ', { size: 180, top: 80, color: '#fff', ext: '#04503c' }); L.s2b = big('دي خطة', { size: 180, top: 80, color: C.yellow2, ext: '#6a4a00' });
    L.c2a = chip('خريطة السيطرة على المساحة', { top: H - 150, left: 90, size: 34 }); L.c2b = chip('خط التسلل', { top: H - 150, right: 90, size: 34 });
    L.s3 = big('كل لاعب له دور', { size: 140, top: 80, color: C.ink, ext: '#ffffff', n: 9, left: 90, width: 1100, justify: 'flex-start' });
    L.s4 = big('من البريميرليج', { size: 150, top: H * 0.66, left: 70, width: 1000, justify: 'flex-start', color: '#fff', ext: '#8a0aa0' });
    L.s5 = big('للدوري المصري', { size: 140, top: 78, right: 120, width: 1000, justify: 'flex-end', color: '#fff', ext: '#7a0c1e', n: 10 }); L.c5 = chip('بعد ٥ جولات', { top: 206, right: 128, size: 32 });
    L.s6a = big('كل ضغطة', { size: 200, top: 76, left: 110, width: 1100, justify: 'flex-start', color: C.yellow2, ext: '#000', n: 12, halo: 7 });
    L.s6b = big('كل قرار', { size: 200, top: H - 286, right: 130, width: 1100, justify: 'flex-end', color: C.pink, ext: '#000', n: 12, halo: 7 });
    L.s7 = big('والأرقام بتحكي', { size: 130, top: 80, left: 0, width: W, justify: 'center', color: '#fff', ext: '#1020a0' }); L.c7a = chip('خريطة التسديد (توضيحي)', { top: 960, left: 130, size: 28 }); L.c7b = chip('ملف الأداء (توضيحي)', { top: 212, left: 1290, size: 28 });
    L.s8a = big('نحلّلها', { size: 220, top: 260, right: 146, width: 880, justify: 'flex-end', color: '#fff', ext: '#04566e' }); L.s8b = big('ونبسّطها', { size: 220, top: 500, right: 146, width: 880, justify: 'flex-end', color: C.yellow2, ext: '#6a4a00' });
    L.t1 = big('إتكلم كورة', { size: 340, top: 0, color: '#fff', ext: '#0a1060', n: 14 }); L.t2 = big('مع تيتو', { size: 215, top: 0, color: C.yellow, ext: '#5b4300', n: 12 });
    L.tag = big('تحليل.. تكتيك.. كورة بجد', { size: 78, top: H * 0.715, color: '#fff', ext: '#0a1060', n: 5, font: { ...BODY, fontWeight: 900 } });
    L.cta = textLine(layer, 'تابع القناة', { ...BODY, fontSize: '72px', lineHeight: 1.1, color: C.ink, top: H * 0.835 + 'px', left: (W / 2 - 260) + 'px', width: '520px', justifyContent: 'center', background: C.yellow, padding: '14px 0 20px', borderRadius: '999px', boxShadow: '0 10px 0 #a67f00, 0 22px 40px rgba(0,0,0,0.3)' });
    grainTiles = [];
  },
  render(t, frame) {
    if (!built) build();
    const [sx, sy] = shake(t); world.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    let i = 0; while (i < scenes.length - 1 && t >= scenes[i + 1].start) i++;
    const cur = scenes[i], nxt = scenes[i + 1], tr = TR[i];
    const inTr = nxt && tr && t > nxt.start - tr.dur;
    const p = inTr ? (t - (nxt.start - tr.dur)) / tr.dur : 0;
    const draw = (s) => { const tl = t - s.start; s.base(tl); s.fg(tl); };
    if (inTr && tr.type === 'whip') {
      const q = easeInOut(p), o = tr.dir === 0 ? [0, -H * q] : [tr.dir * W * q, 0], o2 = tr.dir === 0 ? [0, o[1] + H] : [o[0] - tr.dir * W, 0];
      ctx.save(); ctx.translate(o[0], o[1]); draw(cur); ctx.restore(); ctx.save(); ctx.translate(o2[0], o2[1]); draw(nxt); ctx.restore();
      const st = Math.sin(Math.PI * p); ctx.fillStyle = `rgba(255,255,255,${0.5 * st})`; const r = rng(Math.floor(t * 60) + 7);
      for (let k = 0; k < 46; k++) { const y = r() * H, x = r() * W, len = (300 + r() * 900) * st, h = 2 + r() * 5; if (tr.dir === 0) ctx.fillRect(y * W / H, x * H / W, h, len); else ctx.fillRect(x - len / 2, y, len, h); }
    } else {
      draw(cur);
      if (inTr && tr.type !== 'flash') { ctx.save(); clipFor(tr, p); draw(nxt); ctx.restore(); }
    }
    if (nxt && tr && tr.type === 'flash') { const f = Math.max(0, 1 - Math.abs(t - nxt.start) / 0.07); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H); } }
    // vignette + grain
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.32)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // ---- DOM text ----
    const T = (L_, a, b, o = POP) => playLine(L_, t, a, b, o);
    T(L.s1, 1.08, 1.78, { ...POP, exitDur: 0.14 }); T(L.s2a, 2.5, 3.65); T(L.s2b, 4.35, 5.55); T(L.c2a, 3.7, 5.35, { rise: 14, blur: 0, dur: 0.4, stagger: 0.02, exitDur: 0.2 }); T(L.c2b, 4.55, 5.45, { rise: 14, blur: 0, dur: 0.4, stagger: 0.02, exitDur: 0.2 });
    T(L.s3, 6.62, 7.85); T(L.s4, 8.7, 9.95); T(L.s5, 10.78, 12.1); T(L.c5, 11.1, 12.1, { rise: 12, blur: 0, dur: 0.35, stagger: 0.02, exitDur: 0.2 });
    T(L.s6a, 12.58, 13.5, { ...POP, scaleFrom: 1.3, dur: 0.3 }); T(L.s6b, 13.55, 14.2, { ...POP, scaleFrom: 1.3, dur: 0.3 });
    T(L.s7, 14.95, 16.2); T(L.c7a, 15.3, 16.2, { rise: 12, blur: 0, dur: 0.35, stagger: 0.02, exitDur: 0.2 }); T(L.c7b, 15.45, 16.2, { rise: 12, blur: 0, dur: 0.35, stagger: 0.02, exitDur: 0.2 });
    T(L.s8a, 17.0, 18.15); T(L.s8b, 17.4, 18.15);
    // title: DOM text is positioned to match the cube text (placed once from the build geometry)
    if (built && !L.placed) {
      const place = (line, c, cyFrac) => { const top = H * cyFrac - parseFloat(line.line.style.fontSize) * 0.5; line.line.style.top = top + 'px'; };
      place(L.t1, S.t1c, 0.30); place(L.t2, S.t2c, 0.575); L.placed = true;
    }
    T(L.t1, LOCK, 99, { rise: 0, blur: 0, dur: 0.01, stagger: 0, scaleFrom: 1 }); T(L.t2, LOCK, 99, { rise: 0, blur: 0, dur: 0.01, stagger: 0, scaleFrom: 1 });
    T(L.tag, 21.4, 99, { rise: 26, blur: 8, dur: 0.6, stagger: 0.07 });
    // CTA
    const c = ease.outBack(ramp(t, 22.3, 22.75), 1.8); show(L.cta.line, t >= 22.28); L.cta.line.style.transform = `scale(${c.toFixed(4)})`; L.cta.line.style.opacity = clamp(c * 1.5).toFixed(3);
    playLine(L.cta, t, 22.4, 99, { rise: 8, blur: 3, dur: 0.4, stagger: 0.05 });
  },
};
