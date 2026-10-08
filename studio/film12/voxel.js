// Voxel engine for film 12: turns any RGBA image / rasterised text / procedural shape into a field of
// shaded cubes that can assemble, pulse with the music and burst apart. Pure functions of time: every
// per-cube random is seeded at build time, nothing is simulated frame to frame.
import { clamp, lerp, rng } from '../lib/motion.js';

export const TAU = Math.PI * 2;
export const easeOutCubic = (p) => 1 - Math.pow(1 - clamp(p), 3);
export const easeInOut = (p) => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
export const easeOutBack = (p, s = 1.5) => { p = clamp(p); return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); };
export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const rgb = (r, g, b, a = 1) => (a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`);
const sh = (c, k) => (k >= 0 ? c + (255 - c) * k : c * (1 + k));
export const faces = (r, g, b) => ({ fill: rgb(r, g, b), top: rgb(sh(r, 0.34), sh(g, 0.34), sh(b, 0.34)), side: rgb(sh(r, -0.38), sh(g, -0.38), sh(b, -0.38)) });

// Box-filtered downscale so thin features survive sampling.
export function sample(img, [sx, sy, sw, sh_], gw, gh) {
  let cur = document.createElement('canvas'); cur.width = Math.round(sw); cur.height = Math.round(sh_);
  let g = cur.getContext('2d'); g.drawImage(img, sx, sy, sw, sh_, 0, 0, cur.width, cur.height);
  while (cur.width > gw * 2 || cur.height > gh * 2) {
    const n = document.createElement('canvas'); n.width = Math.max(gw, Math.ceil(cur.width / 2)); n.height = Math.max(gh, Math.ceil(cur.height / 2));
    const ng = n.getContext('2d'); ng.imageSmoothingQuality = 'high'; ng.drawImage(cur, 0, 0, n.width, n.height); cur = n;
  }
  const out = document.createElement('canvas'); out.width = gw; out.height = gh;
  const og = out.getContext('2d', { willReadFrequently: true }); og.imageSmoothingQuality = 'high'; og.drawImage(cur, 0, 0, gw, gh);
  return og.getImageData(0, 0, gw, gh).data;
}

// Rasterise text with the browser's own Arabic shaping, for cube-text.
export function textCanvas(text, { font, size, w, h, color = '#fff', dir = 'rtl', lineGap = 1.0 }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.font = `${size}px ${font}`; g.fillStyle = color; g.direction = dir; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = Array.isArray(text) ? text : [text];
  lines.forEach((t, i) => g.fillText(t, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * lineGap));
  return c;
}

// Build a cube set from an image. opts:
//  img, src:[sx,sy,sw,sh], dest:[dx,dy,dw,dh], cell, seed, flat:[r,g,b]|null, colorFn(r,g,b,i,j)->[r,g,b],
//  order(nx,ny,rand)->delay 0..1 (assembly order), start:'swarm'|'fall'|'rise'|'left'|'right'|'center'
export function makeVoxels({ img, src, dest, cell, seed = 1, flat = null, colorFn = null, order = (nx, ny, r) => r, start = 'swarm', minA = 0.5, relief = 1 }) {
  const [dx, dy, dw, dh] = dest, gw = Math.max(2, Math.round(dw / cell)), gh = Math.max(2, Math.round(dh / cell));
  const px = sample(img, src, gw, gh), cw = dw / gw, ch = dh / gh, r = rng(seed);
  const V = { n: 0, cell: Math.max(cw, ch), x: [], y: [], fill: [], top: [], side: [], h: [], dl: [], de: [], sx: [], sy: [], rot: [], rnd: [], cx: dx + dw / 2, cy: dy + dh / 2 };
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const k = (j * gw + i) * 4, a = px[k + 3] / 255;
    if (a < minA) continue;
    let R = px[k], G = px[k + 1], B = px[k + 2];
    if (flat) [R, G, B] = flat; else if (colorFn) [R, G, B] = colorFn(R, G, B, i, j);
    const f = faces(R, G, B), nx = i / (gw - 1), ny = j / (gh - 1), rr = r();
    V.x.push(dx + (i + 0.5) * cw); V.y.push(dy + (j + 0.5) * ch); V.fill.push(f.fill); V.top.push(f.top); V.side.push(f.side);
    V.h.push((0.45 + 0.55 * ((R * 0.3 + G * 0.59 + B * 0.11) / 255)) * relief);
    V.dl.push(clamp(order(nx, ny, rr))); V.de.push(r()); V.rot.push((r() - 0.5) * 2); V.rnd.push(rr);
    const ang = r() * TAU, mag = 260 + r() * 640;
    if (start === 'fall') { V.sx.push((r() - 0.5) * 260); V.sy.push(-(520 + r() * 520)); }
    else if (start === 'rise') { V.sx.push((r() - 0.5) * 260); V.sy.push(520 + r() * 520); }
    else if (start === 'left') { V.sx.push(-(700 + r() * 700)); V.sy.push((r() - 0.5) * 500); }
    else if (start === 'right') { V.sx.push(700 + r() * 700); V.sy.push((r() - 0.5) * 500); }
    else { V.sx.push(Math.cos(ang) * mag); V.sy.push(Math.sin(ang) * mag * 0.7); }
    V.n++;
  }
  return V;
}

// One shaded cube: front face, top face and right face (light from upper left).
export function cube(ctx, x, y, s, ux, uy, fill, top, side) {
  const h = s / 2;
  ctx.fillStyle = side; ctx.beginPath();
  ctx.moveTo(x + h, y - h); ctx.lineTo(x + h + ux, y - h + uy); ctx.lineTo(x + h + ux, y + h + uy); ctx.lineTo(x + h, y + h); ctx.fill();
  ctx.fillStyle = top; ctx.beginPath();
  ctx.moveTo(x - h, y - h); ctx.lineTo(x + h, y - h); ctx.lineTo(x + h + ux, y - h + uy); ctx.lineTo(x - h + ux, y - h + uy); ctx.fill();
  ctx.fillStyle = fill; ctx.fillRect(x - h, y - h, s - 0.5, s - 0.5);
}

// Draw a voxel set.
//  o.p assemble 0..1 · o.e explode 0..1 (from o.ox,o.oy) · o.ext extrusion scale (music reactive) · o.alpha · o.scale
//  o.dx,o.dy offset · o.ux,o.uy extrusion direction · o.spin extra rotation of scattered cubes · o.cellScale
export function drawVoxels(ctx, V, o) {
  const p = o.p ?? 1, e = o.e ?? 0, ext = (o.ext ?? 1) * 0.36, alpha = o.alpha ?? 1, S = o.scale ?? 1, ox = o.ox ?? V.cx, oy = o.oy ?? V.cy;
  const dx = o.dx ?? 0, dy = o.dy ?? 0, uxd = o.ux ?? 0.78, uyd = o.uy ?? -0.62, cs = o.cellScale ?? 1;
  const cx = V.cx, cy = V.cy;
  for (let i = 0; i < V.n; i++) {
    const qa = clamp((p - V.dl[i] * 0.55) / 0.45);
    if (qa <= 0) continue;
    const qe = e > 0 ? clamp((e - V.de[i] * 0.45) / 0.55) : 0;
    if (qe >= 1) continue;
    const ea = easeOutCubic(qa);
    let x = V.x[i], y = V.y[i];
    x = cx + (x - cx) * S + dx; y = cy + (y - cy) * S + dy;
    x += V.sx[i] * (1 - ea); y += V.sy[i] * (1 - ea);
    let rot = V.rot[i] * ((1 - ea) * 5 + (o.spin ?? 0));
    if (qe > 0) {
      const vx = x - ox, vy = y - oy, len = Math.hypot(vx, vy) + 1e-3, mag = (360 + V.rnd[i] * 1100) * qe * (0.4 + qe), g = 900 * qe * qe * (0.4 + V.de[i]);
      x += (vx / len) * mag + V.sx[i] * 0.25 * qe; y += (vy / len) * mag + V.sy[i] * 0.2 * qe + g;
      rot += V.rot[i] * qe * 7;
    }
    const sz = V.cell * cs * S * (0.4 + 0.6 * ea) * (1 - 0.75 * qe * qe) + 0.001;
    const a = (0.35 + 0.65 * Math.sqrt(ea)) * (1 - qe * qe * qe) * alpha;
    if (a < 0.02) continue;
    if (a < 0.995) ctx.globalAlpha = a;
    const eh = sz * ext * V.h[i];
    if (Math.abs(rot) < 0.002) cube(ctx, x, y, sz, uxd * eh, uyd * eh, V.fill[i], V.top[i], V.side[i]);
    else { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); cube(ctx, 0, 0, sz, uxd * eh, uyd * eh, V.fill[i], V.top[i], V.side[i]); ctx.restore(); }
    if (a < 0.995) ctx.globalAlpha = 1;
  }
}

// Bounding box of the opaque part of an image (found on a small copy, returned in source pixels).
export function alphaBBox(img, thr = 40) {
  const k = Math.min(1, 220 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)), w = Math.max(1, Math.round((img.naturalWidth || img.width) * k)), h = Math.max(1, Math.round((img.naturalHeight || img.height) * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  return [Math.floor(x0 / k), Math.floor(y0 / k), Math.ceil((x1 - x0 + 1) / k), Math.ceil((y1 - y0 + 1) / k)].map((v, i) => Math.min(v, i % 2 ? ih : iw));
}

// Flat single-colour copy of an image's silhouette.
export function silhouette(img, color) {
  const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); return c;
}
