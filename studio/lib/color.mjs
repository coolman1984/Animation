// Colour management for browser films. Contract: the composer renders sRGB (Chrome --force-color-profile=srgb); exports are
// BT.709, limited (tv) range, tagged bt709 (lib/render.mjs encodeFilter). This module PROVES that contract on real encodes,
// draws scopes for review, checks legal range, and applies an optional creative LUT (.cube, e.g. baked by tools/ocio_bake.py).
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { run, encodeFilter, lutFilter } from './render.mjs';
export { lutFilter };

// 24 reference patches (sRGB 8-bit), a ColorChecker-like set: skin, sky, foliage, primaries, secondaries, grey ramp.
export const CHART = ['#735244', '#C29682', '#627A9D', '#576C43', '#8580B1', '#67BDAA', '#D67E2C', '#505BA6', '#C15A63', '#5E3C6C', '#9DBC40', '#E0A32E',
  '#383D96', '#469449', '#AF363C', '#E7C71F', '#BB5695', '#0885A1', '#F3F3F2', '#C8C8C8', '#A0A0A0', '#7A7A79', '#555555', '#343434'];

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function lab([r, g, b]) {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export const deltaE = (a, b) => { const [p, q] = [lab(a), lab(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };


// Encode the chart exactly like a film (encodeFilter + x264 CRF 14), decode it back with BT.709/tv, compare each patch (ΔE76).
// < 1 is invisible, 1–2 visible only side by side, > 3 a real shift. Proves matrix, range and tags agree end to end.
export async function colorCheck({ dither = false, lut, crf = 14 } = {}) {
  const dir = join(tmpdir(), `studio-color-${process.pid}`); mkdirSync(dir, { recursive: true });
  const cell = 64, cols = 6, rows = 4, w = cell * cols, h = cell * rows, ppm = Buffer.alloc(w * h * 3);
  CHART.forEach((c, i) => { const [r, g, b] = hex(c), x0 = (i % cols) * cell, y0 = Math.floor(i / cols) * cell;
    for (let y = y0; y < y0 + cell; y++) for (let x = x0; x < x0 + cell; x++) { const k = (y * w + x) * 3; ppm[k] = r; ppm[k + 1] = g; ppm[k + 2] = b; } });
  const src = join(dir, 'chart.ppm'), mp4 = join(dir, 'chart.mp4'), raw = join(dir, 'chart.rgb');
  writeFileSync(src, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`), ppm]));
  let px;
  try {
    const vf = encodeFilter({ dither, lut }); // the exact filter a film export uses
    await run('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-i', src, '-frames:v', '3', '-r', '30', '-c:v', 'libx264', '-crf', String(crf), '-pix_fmt', 'yuv420p',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-vf', vf, mp4]);
    // Decode the way a player does: BT.709 matrix, limited range → RGB. Raw bytes go through a file (run() collects text).
    await run('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-frames:v', '1', '-vf', 'scale=in_color_matrix=bt709:in_range=tv,format=rgb24', '-f', 'rawvideo', raw]);
    px = readFileSync(raw);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const patches = CHART.map((c, i) => {
    const cx = (i % cols) * cell + cell / 2, cy = Math.floor(i / cols) * cell + cell / 2, acc = [0, 0, 0]; let n = 0;
    for (let y = cy - 12; y < cy + 12; y++) for (let x = cx - 12; x < cx + 12; x++) { const k = (y * w + x) * 3; acc[0] += px[k]; acc[1] += px[k + 1]; acc[2] += px[k + 2]; n++; }
    const got = acc.map(v => Math.round(v / n));
    return { want: c, got: '#' + got.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(), dE: +deltaE(hex(c), got).toFixed(2) };
  });
  const des = patches.map(p => p.dE);
  return { maxDE: Math.max(...des), meanDE: +(des.reduce((a, b) => a + b, 0) / des.length).toFixed(2), patches, lut: lut || null, dither };
}

// Waveform (luma parade), vectorscope and histogram of one moment, side by side: the colourist's view of an export.
export async function scopes(video, t, out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  const graph = '[0:v]format=yuv444p,split=4[f][a][b][c];[f]scale=-2:256[F];[a]waveform=d=parade:g=green:fl=numbers,scale=-2:256[W];[b]vectorscope=m=color3:g=green,scale=256:256[V];[c]histogram,scale=-2:256[H];[F][W][V][H]hstack=inputs=4[o]';
  await run('ffmpeg', ['-v', 'error', '-y', '-ss', Math.max(0, t - 0.001).toFixed(4), '-i', video, '-frames:v', '1', '-filter_complex', graph, '-map', '[o]', out]);
  return out;
}

// Scopes for several moments in ONE ffmpeg launch (one select branch per moment; ~1 s per launch on Windows).
export async function scopesAt(video, items, fps) {
  if (!items.length) return [];
  for (const it of items) mkdirSync(dirname(resolve(it.out)), { recursive: true });
  const parts = [`[0:v]split=${items.length}${items.map((_, i) => `[s${i}]`).join('')}`];
  items.forEach((it, i) => parts.push(`[s${i}]select=eq(n\\,${Math.max(0, Math.round(it.t * fps))}),setpts=0,format=yuv444p,split=4[f${i}][a${i}][b${i}][c${i}];` +
    `[f${i}]scale=-2:256[F${i}];[a${i}]waveform=d=parade:g=green:fl=numbers,scale=-2:256[W${i}];[b${i}]vectorscope=m=color3:g=green,scale=256:256[V${i}];[c${i}]histogram,scale=-2:256[H${i}];` +
    `[F${i}][W${i}][V${i}][H${i}]hstack=inputs=4[o${i}]`));
  await run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-filter_complex', parts.join(';'), ...items.flatMap((it, i) => ['-map', `[o${i}]`, '-frames:v', '1', it.out])]);
  return items.map(it => it.out);
}

// Legal range over the whole export: frames whose luma leaves 16–235 (clipped/illegal on broadcast-style displays) and peak saturation.
export async function legalRange(video) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', video, '-an', '-vf', 'signalstats,metadata=print' /* one key= only keeps the last key: print all, parse three */, '-f', 'null', '-']);
  const num = re => [...err.matchAll(re)].map(m => +m[1]);
  const ymin = num(/YMIN=([\d.]+)/g), ymax = num(/YMAX=([\d.]+)/g), sat = num(/SATMAX=([\d.]+)/g);
  return { frames: ymin.length, below16: ymin.filter(v => v < 16).length, above235: ymax.filter(v => v > 235).length, minY: Math.min(...ymin), maxY: Math.max(...ymax), maxSat: Math.max(...sat) };
}
