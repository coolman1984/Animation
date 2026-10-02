// Film 7 helpers: constants, Arabic digits, a gate-readable text line, and the 12 px pixel-circle canvas used for
// the iris into the brand card (same Bayer dither as film 6 so every transition lives on the pixel grid).
import { el, lerp } from '../lib/motion.js';

export const W = 1080, H = 1920;
export const C = { paper: '#EEEBE5', ink: '#0B0B0C', blue: '#2348FF', grey: '#8C8D93', dim: '#6B6C72', white: '#FFFFFF', line: '#E3E0D9', gold: '#FFC63A', soft: '#5B7BFF', deep: '#0B1B7A' };
export const F = { head: "'Alexandria'", label: "'Plex Arabic'", accent: "'Aref Ruqaa'" };
export const ARD = s => String(s).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
export const abs = (style = {}) => ({ position: 'absolute', ...style });
export const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export const rgbMix = (a, b, p) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], p))).join(',')})`;

// A single-span text line that the text gate (window.textBoxes) can read back.
export function wline(parent, text, style = {}, inner = {}) {
  const line = el('div', { class: 'line', style: { whiteSpace: 'nowrap', direction: 'rtl', ...style } }, parent);
  line.dataset.text = text;
  const word = el('span', { class: 'word', text, style: { display: 'inline-block', ...inner } }, line);
  return { line, word };
}
// Set text of a wline (keeps the read-back string in sync).
export function setText(L, text) { if (L.word.textContent !== text) { L.word.textContent = text; L.line.dataset.text = text; } }

// ---------- pixel iris ----------
export const CELL = 12, GW = W / CELL, GH = H / CELL;
const BAYER = (() => { const m = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
  const xr = x ^ y; m.push(((((xr & 1) << 5) | ((x & 1) << 4) | (((xr >> 1) & 1) << 3) | (((x >> 1) & 1) << 2) | (((xr >> 2) & 1) << 1) | ((x >> 2) & 1)) + 0.5) / 64); } return m; })();
export const bayer = (x, y) => BAYER[(y & 7) * 8 + (x & 7)];
export function pixelCanvas(parent, z, w = GW, h = GH, style = {}) {
  const c = el('canvas', { width: String(w), height: String(h), style: abs({ left: '0', top: '0', width: w * CELL + 'px', height: h * CELL + 'px', imageRendering: 'pixelated', zIndex: String(z), pointerEvents: 'none', ...style }) }, parent);
  const g = c.getContext('2d'); const img = g.createImageData(w, h);
  return { c, g, img, w, h };
}
export function pixelCircle(P, { cx, cy, r, band = 0.25, color }) {
  const [R, G, B] = color, d = P.img.data;
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    const dist = Math.hypot((x + 0.5) * CELL - cx, (y + 0.5) * CELL - cy);
    const edge = (r - dist) / Math.max(1, r * band);
    const on = edge >= 1 || (edge > 0 && edge > bayer(x, y)), i = (y * P.w + x) * 4;
    d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = on ? 255 : 0;
  }
  P.g.putImageData(P.img, 0, 0);
}
export const cover = (cx, cy) => Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
