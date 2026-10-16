// Taste gate: reads a finished MP4 (any source, any model) and measures what the owner rejects, in numbers (ANY_MODEL.md).
// Idea adapted from huashu-art-motion's film_gate.py (MIT, alchaincyf): judge the export itself, and calibrate thresholds on the
// owner's own verdicts instead of taste words. Rewritten on ffmpeg only (no OpenCV); thresholds live in taste/calibration.json.
//   tasteGate(mp4, { vertical, calibration }) → { metrics, lights: [{ id, light: red|yellow|green|info, value, why }], verdict }
//   calibrate(verdicts) → per-metric separation between approved and rejected takes (writes nothing itself)
// Metrics (12 fps, 320 px wide, grey, subtitle band masked):
//   fastRatio  share of frame pairs inside shots whose mean grey change ≥ 9 (a "slideshow" film stays low); cuts are excluded
//   blankRunS  longest run of near-empty frames (edge pixels < 0.2 %) away from the first/last 0.5 s and from cuts — a fact, not taste
//   stillRunS  longest run with almost no change (report only: "stop → burst → stop" is good editing)
//   by10s      fastRatio per 10 s window (where the film sags)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const FPS = 12, WIDTH = 320, FAST = 9, STILL = 0.3, BLANK_GRAD = 24, BLANK_FRAC = 0.002, BLANK_EDGE_S = 0.5, BLANK_MIN_S = 0.3;
// Provisional motion thresholds: huashu's calibration on 13 of its author's films (approved ≥ 0.068, rejected ≤ 0.021).
// Until taste/calibration.json holds a fit on OUR owner's verdicts, motion can only reach yellow ("go and look").
export const PROVISIONAL = { fastRatio: { red: 0.035, yellow: 0.06, source: 'huashu-art-motion film_gate.py calibration (13 films, 2026-10-09)' } };

function probe(path) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', path], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cannot read ${path}: ${r.stderr.trim().slice(0, 200)}`);
  const j = JSON.parse(r.stdout), s = j.streams?.[0];
  if (!s) throw new Error(`${path} has no video stream`);
  return { w: s.width, h: s.height, duration: +j.format.duration };
}
export function decodeGray(path, { fps = FPS, width = WIDTH, maxSeconds = 600 } = {}) {
  const p = probe(path), h = Math.max(2, Math.round((p.h / p.w) * width / 2) * 2);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-t', String(maxSeconds), '-i', path, '-vf', `fps=${fps},scale=${width}:${h}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${path}: ${String(r.stderr).slice(0, 300)}`);
  const n = Math.floor(r.stdout.length / (width * h)), frames = [];
  for (let i = 0; i < n; i++) frames.push(r.stdout.subarray(i * width * h, (i + 1) * width * h));
  return { frames, w: width, h, fps, src: p };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

export function measure({ frames, w, h, fps }, { vertical } = {}) {
  const portrait = vertical ?? h > w, rows = Math.floor(h * (1 - (portrait ? 0.18 : 0.15)));   // subtitle band masked
  const n = frames.length, d = new Float64Array(Math.max(0, n - 1)), edge = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const f = frames[i]; let e = 0;
    for (let y = 0; y < rows - 1; y++) for (let x = 0; x < w - 1; x++) { const k = y * w + x; if (Math.abs(f[k + 1] - f[k]) + Math.abs(f[k + w] - f[k]) > BLANK_GRAD) e++; }
    edge[i] = e / ((rows - 1) * (w - 1));
    if (i) { const g = frames[i - 1]; let s = 0; for (let k = 0; k < rows * w; k++) s += Math.abs(f[k] - g[k]); d[i - 1] = s / (rows * w); }
  }
  const med = median(d), cut = Array.from(d, (v) => v >= Math.max(8, 3 * med + 2));
  const excluded = (i) => cut[i] || cut[i - 1] || cut[i + 1];
  const inside = [...d.keys()].filter((i) => !excluded(i));
  const fastRatio = inside.length ? inside.filter((i) => d[i] >= FAST).length / inside.length : 0;
  let stillRun = 0, run = 0; for (const i of d.keys()) { run = d[i] < STILL && !cut[i] ? run + 1 : 0; stillRun = Math.max(stillRun, run); }
  const blankRuns = []; let start = -1;
  for (let i = 0; i <= n; i++) {
    const t = i / fps, near = cut[i] || cut[i - 1] || cut[i - 2];
    const blank = i < n && edge[i] < BLANK_FRAC && t >= BLANK_EDGE_S && t <= n / fps - BLANK_EDGE_S && !near;
    if (blank && start < 0) start = i; else if (!blank && start >= 0) { blankRuns.push([+(start / fps).toFixed(2), +(i / fps).toFixed(2)]); start = -1; }
  }
  const by10s = []; for (let a = 0; a < d.length; a += 10 * fps) { const idx = inside.filter((i) => i >= a && i < a + 10 * fps); by10s.push(idx.length ? +(idx.filter((i) => d[i] >= FAST).length / idx.length).toFixed(3) : null); }
  const runs = blankRuns.filter(([a, b]) => b - a >= BLANK_MIN_S - 1e-9);
  return { seconds: +(n / fps).toFixed(2), cuts: cut.filter(Boolean).length, fastRatio: +fastRatio.toFixed(4), stillRunS: +(stillRun / fps).toFixed(2), blankRunS: +Math.max(0, ...runs.map(([a, b]) => b - a)).toFixed(2), blankRuns: runs, by10s };
}

export function loadCalibration() {
  const p = join(STUDIO, 'taste', 'calibration.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}
export function grade(m, calibration = loadCalibration()) {
  const lights = [], cal = calibration?.metrics?.fastRatio?.separates ? calibration.metrics.fastRatio : null;
  lights.push({ id: 'blank-frames', light: m.blankRunS > 0 ? 'red' : 'green', value: m.blankRunS, why: m.blankRunS ? `near-empty frames mid-film: ${m.blankRuns.map(([a, b]) => `${a}–${b} s`).join(', ')}` : 'no empty frame away from cuts and the ends' });
  const t = cal ? { red: cal.red, yellow: cal.yellow, source: `our owner's verdicts (${cal.n} takes, ${calibration.date})` } : PROVISIONAL.fastRatio;
  const low = m.fastRatio < t.red ? (cal ? 'red' : 'yellow') : m.fastRatio < t.yellow ? 'yellow' : 'green';
  lights.push({ id: 'motion', light: low, value: m.fastRatio, why: `${(m.fastRatio * 100).toFixed(1)} % of in-shot frame pairs move fast (red < ${t.red}, yellow < ${t.yellow}; thresholds: ${t.source}${cal ? '' : ' — provisional, yellow at most'})` });
  const weak = m.by10s.map((v, i) => [i, v]).filter(([, v]) => v != null && v < t.red);
  lights.push({ id: 'sagging-window', light: weak.length ? 'yellow' : 'green', value: weak.map(([i]) => `${i * 10}–${i * 10 + 10} s`), why: weak.length ? 'go and look: these 10 s windows barely move' : 'no 10 s window sags' });
  lights.push({ id: 'still-run', light: 'info', value: m.stillRunS, why: 'longest near-still run (report only: holds can be good editing)' });
  const red = lights.filter((l) => l.light === 'red').length, yellow = lights.filter((l) => l.light === 'yellow').length;
  return { lights, verdict: red ? 'rejected: fix the red lights' : yellow ? 'passes; watch the yellow ranges' : 'passes' };
}
export function tasteGate(path, opts = {}) {
  const m = measure(decodeGray(path), opts);
  return { file: path, metrics: m, ...grade(m, opts.calibration === undefined ? loadCalibration() : opts.calibration) };
}

// Fit thresholds on the owner's verdicts: a metric "separates" only if every approved take beats every rejected one.
export function calibrate(rows) {
  const pic = rows.filter((r) => r.about !== 'sound' && r.metrics);
  const ok = pic.filter((r) => r.verdict === 'approved').map((r) => r.metrics.fastRatio), no = pic.filter((r) => r.verdict === 'rejected').map((r) => r.metrics.fastRatio);
  const minOk = ok.length ? Math.min(...ok) : null, maxNo = no.length ? Math.max(...no) : null;
  const separates = ok.length >= 3 && no.length >= 2 && minOk > maxNo;
  return { metrics: { fastRatio: { n: ok.length + no.length, approvedMin: minOk, rejectedMax: maxNo, separates, ...(separates ? { red: +((minOk + maxNo) / 2).toFixed(4), yellow: +minOk.toFixed(4) } : {}) } },
    note: separates ? 'motion threshold fitted on the owner\'s verdicts' : 'not enough picture verdicts (≥ 3 approved, ≥ 2 rejected) or no clean separation: motion stays provisional (yellow at most)' };
}
