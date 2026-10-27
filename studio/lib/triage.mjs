// Frame triage: measure EVERY sampled frame of a finished MP4 in code (no model), then hand the critic only the frames
// that a measurement flagged, as full-size stills with the problem boxed, plus one critic brief. The critic's frame views
// (time and money) drop from "every frame" to "the flagged few". Idea learned from SageCut (levantolabs, 2026-10); written
// from scratch on ffmpeg + plain JavaScript, no OCR and no extra model.
//   triage(mp4, { format, palette, floorPx, fps, out, questions }) → { checks, moments, sampled, opened, out }
// Checks per sampled frame (4 fps, decoded at 540 px on the short side):
//   blank      almost no edges (away from the first/last 0.5 s)
//   frozen     the picture does not change for ≥ minFrozen seconds
//   text-small a text box lower than floorPx at a 1080 short side (box ≈ type size + 8 px; 36 ≈ the house 26–28 px floor)
//   text-edge  a text box touching the frame edge (cut off) or outside the placement's safe area
//   off-brand  a coloured text fill far (ΔE > 20) from every brand colour (only with a palette)
// Plus the delivery spec once per file: size and fps for the placement, loudness −14 LUFS ±1, true peak ≤ −1 dBTP.
// Text is located, not read, by tools/textboxes.py (PP-OCRv3 detector, 2.4 MB, onnxruntime). Without it the text checks
// are reported as not measured, never as passed. A flag means "look here", never a verdict.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deltaE } from './color.mjs';
import { PYTHON } from './platform.mjs';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const FPS = 4, SHORT = 540, FLOOR_PX = 36, FROZEN_DIFF = 0.35, BLANK_GRAD = 24, BLANK_FRAC = 0.002, EDGE_S = 0.5, MAX_MOMENTS = 12;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

function probeFile(path) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,avg_frame_rate:format=duration', '-of', 'json', path], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cannot read ${path}: ${r.stderr.trim().slice(0, 200)}`);
  const j = JSON.parse(r.stdout), v = j.streams.find((s) => s.codec_type === 'video');
  if (!v) throw new Error(`${path} has no video stream`);
  const [n, d] = v.avg_frame_rate.split('/').map(Number);
  return { w: v.width, h: v.height, fps: +(n / d).toFixed(3), duration: +j.format.duration, audio: j.streams.some((s) => s.codec_type === 'audio') };
}

const dims = (p, short) => { const k = Math.min(1, short / Math.min(p.w, p.h)); return { w: Math.round(p.w * k / 2) * 2, h: Math.round(p.h * k / 2) * 2 }; };
// One slice of the film as RGB frames (slices keep memory flat: 30 s at 540 px ≈ 190 MB).
export function decodeRGB(path, { fps = FPS, short = SHORT, start = 0, seconds = 30, src } = {}) {
  const p = src || probeFile(path), { w, h } = dims(p, short);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(start), '-t', String(seconds), '-i', path, '-vf', `fps=${fps},scale=${w}:${h}:flags=area,format=rgb24`, '-f', 'rawvideo', '-'], { maxBuffer: 2 ** 31 - 1 });
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${path}: ${String(r.stderr).slice(0, 300)}`);
  const n = Math.floor(r.stdout.length / (w * h * 3)), frames = [];
  for (let i = 0; i < n; i++) frames.push(r.stdout.subarray(i * w * h * 3, (i + 1) * w * h * 3));
  return { frames, w, h, fps, src: p };
}

// Text boxes for every sampled frame, from the detector (one Python launch per film).
export function textBoxes(path, { fps = FPS, short = SHORT } = {}) {
  const r = spawnSync(PYTHON, [join(STUDIO, 'tools', 'textboxes.py'), path, `--fps=${fps}`, `--short=${short}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.error || r.status !== 0) return { error: (r.error?.message || r.stderr || '').trim().split('\n').at(-1) || `exit ${r.status}` };
  return JSON.parse(r.stdout);
}

// The ink colour inside a text box: the pixels farthest from the box's median tone.
function inkColour(rgb, w, h, [x, y, bw, bh]) {
  const px = []; for (let j = y; j < Math.min(h, y + bh); j++) for (let i = x; i < Math.min(w, x + bw); i++) { const k = (j * w + i) * 3; px.push([rgb[k], rgb[k + 1], rgb[k + 2]]); }
  if (!px.length) return [0, 0, 0];
  const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11, med = px.map(lum).sort((a, b) => a - b)[px.length >> 1];
  const far = px.map((c) => [Math.abs(lum(c) - med), c]).sort((a, b) => b[0] - a[0]).slice(0, Math.max(1, px.length >> 3)).map((v) => v[1]);
  return [0, 1, 2].map((c) => far.reduce((s, v) => s + v[c], 0) / far.length);
}

const grayOf = (rgb, n) => { const g = new Uint8Array(n); for (let k = 0, j = 0; k < n; k++, j += 3) g[k] = (rgb[j] * 77 + rgb[j + 1] * 150 + rgb[j + 2] * 29) >> 8; return g; };

const edgeFrac = (g, w, h) => { let e = 0; for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const k = y * w + x; if (Math.abs(g[k + 1] - g[k]) + Math.abs(g[k + w] - g[k]) > BLANK_GRAD) e++; } return e / ((w - 1) * (h - 1)); };
function tiny(g, w, h, f = 6) { const tw = Math.floor(w / f), th = Math.floor(h / f), t = new Float32Array(tw * th); for (let y = 0; y < th * f; y++) for (let x = 0; x < tw * f; x++) t[Math.floor(y / f) * tw + Math.floor(x / f)] += g[y * w + x] / (f * f); return t; }
const chroma = (c) => { const m = Math.max(...c), n = Math.min(...c); return m - n; };

function brandFormats() { try { return JSON.parse(readFileSync(join(STUDIO, 'studio-engine', 'brand', 'brand.json'), 'utf8')).export; } catch { return null; } }

// Delivery: size/fps for the placement, loudness and true peak (one ebur128 pass).
function delivery(path, src, format) {
  const ex = brandFormats(), out = [], fmt = format && ex?.formats?.[format];
  if (format && !fmt) throw new Error(`unknown format "${format}" (known: ${Object.keys(ex?.formats || {}).join(', ')})`);
  if (fmt) out.push({ id: 'size', ok: src.w === fmt.w && src.h === fmt.h, value: `${src.w}x${src.h}`, want: `${fmt.w}x${fmt.h}` });
  if (ex?.fps) out.push({ id: 'fps', ok: Math.abs(src.fps - ex.fps) < 0.01, value: src.fps, want: ex.fps });
  if (src.audio) {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
    const sum = (r.stderr || '').slice((r.stderr || '').lastIndexOf('Summary:')), num = (re) => { const m = sum.match(re); return m ? +m[1] : null; };
    const I = num(/I:\s+(-?[\d.]+) LUFS/), TP = num(/Peak:\s+(-?[\d.]+) dBFS/), want = ex?.lufs ?? -14;
    out.push({ id: 'loudness', ok: I != null && Math.abs(I - want) <= 1, value: I, want: `${want} ±1 LUFS` });
    out.push({ id: 'true-peak', ok: TP != null && TP <= -1, value: TP, want: '≤ −1 dBTP' });
  } else out.push({ id: 'audio', ok: false, value: 'none', want: 'an audio track' });
  return out;
}

export function triage(path, { format, palette = [], floorPx = FLOOR_PX, fps = FPS, minFrozen = 1.0, out, questions = [], maxMoments = MAX_MOMENTS } = {}) {
  if (!existsSync(path)) throw new Error(`no such file: ${path}`);
  const text = textBoxes(path, { fps });
  const src = probeFile(path), SLICE = 30, { w, h } = dims(src, SHORT);
  const toOut = Math.min(src.w, src.h) / Math.min(w, h), to1080 = 1080 / Math.min(src.w, src.h);
  const fmt = format ? brandFormats()?.formats?.[format] : null, pal = palette.map(hexRgb);
  const flags = [], diffs = [];
  let prev = null, n = 0;
  for (let start = 0; start < src.duration; start += SLICE) for (const rgb of decodeRGB(path, { fps, src, start, seconds: Math.min(SLICE, src.duration - start) }).frames) {
    const i = n++, t = +(i / fps).toFixed(2), g = grayOf(rgb, w * h), small = tiny(g, w, h);
    if (prev) { let s = 0; for (let k = 0; k < small.length; k++) s += Math.abs(small[k] - prev[k]); diffs.push(s / small.length); }
    prev = small;
    if (t >= EDGE_S && t <= src.duration - EDGE_S && edgeFrac(g, w, h) < BLANK_FRAC) flags.push({ i, t, kind: 'blank', severity: 3, why: 'almost no picture (no edges)' });
    const tb = text.frames?.[i] || [];
    for (const b of tb) {
      // a short piece beside a taller box on the same row is part of that line, not a line of its own
      if (tb.some((o) => o !== b && o[3] > b[3] * 1.2 && Math.min(o[1] + o[3], b[1] + b[3]) - Math.max(o[1], b[1]) > b[3] * 0.5 && Math.max(o[0] - (b[0] + b[2]), b[0] - (o[0] + o[2])) < o[3])) continue;
      const box = b.slice(0, 4).map((v) => Math.round(v * toOut)), [x, y, bw, bh] = b, boxPx = Math.round(bh * toOut * to1080);
      if (boxPx < floorPx && bw >= 1.5 * bh) flags.push({ i, t, kind: 'text-small', severity: 2, box, value: boxPx, why: `text box ${boxPx} px high at a 1080 short side (floor ${floorPx} px ≈ 26–28 px type)` });
      const m = Math.max(3, bh / 2);   // a glyph sliced by the edge is often not boxed: allow half a line of slack
      if (x <= m || y <= m || x + bw >= w - m || y + bh >= h - m) flags.push({ i, t, kind: 'text-edge', severity: 3, box, why: 'text touches the frame edge (cut off?)' });
      else if (fmt?.safe) { const [sx0, sy0, sx1, sy1] = fmt.safe, [bx, by, bbw, bbh] = box; if (bx < sx0 || by < sy0 || bx + bbw > sx1 || by + bbh > sy1) flags.push({ i, t, kind: 'text-edge', severity: 2, box, why: `text outside the ${format} safe area` }); }
      if (pal.length) {
        const ink = inkColour(rgb, w, h, [x, y, bw, bh]);
        if (chroma(ink) > 40) { const d = Math.min(...pal.map((c) => deltaE(c, ink))); if (d > 20) flags.push({ i, t, kind: 'off-brand', severity: 2, box, value: rgbHex(ink), why: `text colour ${rgbHex(ink)} is ΔE ${d.toFixed(0)} from the nearest brand colour` }); }
      }
    }
  }
  // frozen runs: consecutive near-zero changes lasting ≥ minFrozen
  for (let a = 0; a < diffs.length;) {
    if (diffs[a] >= FROZEN_DIFF) { a++; continue; }
    let b = a; while (b < diffs.length && diffs[b] < FROZEN_DIFF) b++;
    const secs = (b - a) / fps;
    if (secs >= minFrozen && (a + 1) / fps < src.duration - EDGE_S) flags.push({ i: a + 1, t: +((a + 1) / fps).toFixed(2), kind: 'frozen', severity: 2, value: +secs.toFixed(2), why: `the picture does not move for ${secs.toFixed(1)} s (${(a / fps).toFixed(1)}–${(b / fps).toFixed(1)} s)` });
    a = b;
  }
  // moments: neighbouring flags of one kind collapse to one frame (the worst, else the middle)
  const moments = [];
  for (const kind of [...new Set(flags.map((f) => f.kind))]) {
    const fs = flags.filter((f) => f.kind === kind).sort((a, b) => a.i - b.i), groups = [];
    for (const f of fs) { const g = groups.at(-1); if (g && f.i - g.at(-1).i <= 2) g.push(f); else groups.push([f]); }
    for (const g of groups) {
      const pick = kind === 'text-small' ? g.reduce((m, f) => (f.value < m.value ? f : m)) : g[Math.floor(g.length / 2)];
      moments.push({ ...pick, span: [g[0].t, g.at(-1).t], boxes: g.filter((f) => f.i === pick.i && f.box).map((f) => f.box) });
    }
  }
  moments.sort((a, b) => b.severity - a.severity || a.t - b.t);
  const opened = moments.slice(0, maxMoments).sort((a, b) => a.t - b.t);
  const checks = delivery(path, src, format);
  const dir = out || join(dirname(path), `${basename(path, extname(path))}-triage`);
  rmSync(join(dir, 'frames'), { recursive: true, force: true }); mkdirSync(join(dir, 'frames'), { recursive: true });
  opened.forEach((m, k) => {
    m.file = join('frames', `${String(k + 1).padStart(2, '0')}-${m.kind}-${m.t.toFixed(2)}s.jpg`);
    const boxes = m.boxes.slice(0, 8).map(([x, y, bw, bh]) => `drawbox=x=${x - 4}:y=${y - 4}:w=${bw + 8}:h=${bh + 8}:color=0xFF2E88@0.95:t=4`).join(',');
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(m.t), '-i', path, '-frames:v', '1', ...(boxes ? ['-vf', boxes] : []), '-q:v', '3', join(dir, m.file)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`could not extract the frame at ${m.t} s: ${r.stderr.slice(0, 300)}`);
  });
  const result = { file: path, src, format: format || null, sampled: n, fps, text: text.error ? `not measured: ${text.error}` : 'measured (PP-OCRv3 detector)', opened: opened.length, flagged: moments.length, checks, moments: opened.map(({ i, ...m }) => m), out: dir };
  writeFileSync(join(dir, 'triage.json'), JSON.stringify(result, null, 2));
  writeFileSync(join(dir, 'CRITIC.md'), criticBrief(result, questions));
  return result;
}

// The brief for the critic model: open ONLY these frames, answer these questions, report in the qa-judge ledger form.
function criticBrief(r, questions) {
  const bad = r.checks.filter((c) => !c.ok);
  return [`# Critic brief — ${basename(r.file)}`, '',
    `Code measured ${r.sampled} frames (${r.fps} per second). Open ONLY the ${r.opened} frame(s) below; a pink box marks where the measurement looked.`,
    'A flag means "look here", not a verdict: confirm or dismiss each one, then answer the questions for the same frames.', '',
    `Text checks: ${r.text}.`, '',
    '## Delivery', ...r.checks.map((c) => `- ${c.ok ? 'PASS' : 'FAIL'} ${c.id}: ${c.value} (want ${c.want})`), bad.length ? '' : '- all delivery checks pass', '',
    '## Frames to open', ...(r.moments.length ? r.moments.map((m) => `- \`${m.file}\` · ${m.t} s · **${m.kind}** · ${m.why}${m.span[0] !== m.span[1] ? ` (seen ${m.span[0]}–${m.span[1]} s)` : ''}`) : ['- none: no frame was flagged. Do a normal phone-size pass of the contact sheet instead.']), '',
    '## Questions for every opened frame', '- Is any text cut off, too small to read on a phone, or over a busy area?', '- Is any colour off the brand?', '- Does this frame look like a generic AI template?',
    ...questions.map((q) => `- ${q}`), '',
    '## Answer as a ledger', 'time → observed defect (or "false flag") → blocker / major / minor → smallest fix.', ''].join('\n');
}
