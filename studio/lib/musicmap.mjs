// Music map: structured timing evidence for the editor (tempo, beats, downbeats, sections, energy,
// quiet holds, builds, releases/drops, peaks, phrase candidates, transient density).
// Analyzers, best first: Python librosa (tools/music_analysis.py, optional) → built-in Node analyzer
// (energy/onsets/constant-tempo grid) → manual BPM (rhythm.mjs grid, no audio needed).
// Editorial events are derived HERE for every analyzer, so the rules are the same everywhere.
// It is evidence for decisions ("this cut is 80 ms before the downbeat"), never an order to cut on beats.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beatGrid } from './rhythm.mjs';
import { PYTHON } from './platform.mjs';
import { run } from './render.mjs';

const TOOL = join(dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'music_analysis.py');
const r3 = v => +v.toFixed(3);

// ---------- analysis ----------
export function pythonAvailable(python = PYTHON) {
  const r = spawnSync(python, ['-c', 'import numpy, librosa'], { encoding: 'utf8' });
  return r.status === 0;
}

// Analyze an audio file. engine: 'auto' | 'python' | 'node'. Returns a complete (derived) map.
export async function analyzeMusic(src, { engine = 'auto', bpmHint, beatsPerBar = 4, python = PYTHON, out } = {}) {
  if (!existsSync(src)) throw new Error(`music file not found: ${src}`);
  let map;
  if (engine === 'python' || (engine === 'auto' && pythonAvailable(python))) {
    const tmp = (out || src) + '.raw.json';
    const args = [TOOL, src, '-o', tmp, '--beats-per-bar', String(beatsPerBar), ...(bpmHint ? ['--bpm-hint', String(bpmHint)] : [])];
    const r = spawnSync(python, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status !== 0) throw new Error(`music_analysis.py failed: ${r.stderr.slice(-1500)}`);
    map = JSON.parse(readFileSync(tmp, 'utf8'));
    try { (await import('node:fs')).rmSync(tmp, { force: true }); } catch {}
  } else map = await analyzeNode(src, { bpmHint, beatsPerBar });
  const full = deriveEvents(map);
  if (out) writeFileSync(out, JSON.stringify(full, null, 1));
  return full;
}

// Manual BPM fallback: a constant grid with no energy information.
export function fromBpm({ bpm, duration, offset = 0, beatsPerBar = 4 }) {
  const grid = beatGrid({ bpm, duration, offset, beatsPerBar });
  return deriveEvents({ version: 1, source: 'manual bpm', analyzer: 'manual-bpm', duration, beatsPerBar,
    tempo: { bpm, confidence: null }, beats: grid.map(g => g.time), downbeats: grid.filter(g => g.downbeat).map(g => g.time),
    downbeatConfidence: null, downbeatMethod: 'declared bar grid', onsets: [], sections: [{ start: 0, end: duration, label: 'S1', energy: null }],
    curves: null, notes: ['manual BPM grid: no energy, sections or onsets were measured'] });
}

// ---------- built-in Node analyzer (no Python) ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
const pctl = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round(p / 100 * (s.length - 1))))]; };
const normalize = arr => { const lo = pctl(arr, 5), hi = pctl(arr, 95); return arr.map(v => (hi - lo < 1e-9 ? 0 : Math.min(1, Math.max(0, (v - lo) / (hi - lo))))); };
const resample = (vals, srcHop, dstHop, duration) => Array.from({ length: Math.max(1, Math.round(duration / dstHop)) }, (_, i) => {
  const x = (i * dstHop) / srcHop, a = Math.floor(x), f = x - a; const v0 = vals[Math.min(a, vals.length - 1)], v1 = vals[Math.min(a + 1, vals.length - 1)];
  return +(v0 + (v1 - v0) * f).toFixed(4);
});

export async function analyzeNode(src, { bpmHint, beatsPerBar = 4 } = {}) {
  const SR = 22050, N = 1024, HOP = 256, hopS = HOP / SR;
  const { out } = await new Promise((res, rej) => {
    const chunks = []; import('node:child_process').then(({ spawn }) => {
      const p = spawn('ffmpeg', ['-v', 'error', '-i', src, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let err = ''; p.stdout.on('data', d => chunks.push(d)); p.stderr.on('data', d => (err += d));
      p.on('close', c => (c === 0 ? res({ out: Buffer.concat(chunks) }) : rej(new Error('ffmpeg decode failed: ' + err))));
    });
  });
  const y = new Float32Array(out.buffer, out.byteOffset, Math.floor(out.length / 4));
  const duration = y.length / SR;
  if (duration < 1) throw new Error('track shorter than 1 s');
  const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const frames = Math.floor((y.length - N) / HOP) + 1, lowBin = Math.round((250 * N) / SR);
  const rms = [], flux = [], lowFlux = [], centroid = [], low = [];
  let prev = new Float32Array(N / 2);
  for (let f = 0; f < frames; f++) {
    const re = new Float64Array(N), im = new Float64Array(N); let e = 0;
    for (let i = 0; i < N; i++) { const v = y[f * HOP + i]; e += v * v; re[i] = v * win[i]; }
    fft(re, im);
    let fl = 0, lf = 0, cs = 0, ms = 0, lo = 0; const mag = new Float32Array(N / 2);
    for (let k = 1; k < N / 2; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k])); mag[k] = m;
      const d = Math.max(0, m - prev[k]); fl += d; if (k <= lowBin) { lf += d; lo += m; }
      cs += k * m; ms += m;
    }
    prev = mag; rms.push(10 * Math.log10(e / N + 1e-12)); flux.push(fl); lowFlux.push(lf); centroid.push(ms ? cs / ms : 0); low.push(lo);
  }
  const fluxN = normalize(flux);
  // Onsets: local maxima above an adaptive threshold, ≥ 50 ms apart.
  const onsets = [];
  // Starts at frame 0 (not 3): a hit on the very first frame (an opening impact) is a real onset.
  for (let i = 0; i < fluxN.length - 3; i++) {
    const w0 = Math.max(0, i - 40), w1 = Math.min(fluxN.length, i + 40), local = fluxN.slice(w0, w1), mean = local.reduce((a, b) => a + b, 0) / local.length;
    if (fluxN[i] > mean + 0.15 && fluxN[i] >= Math.max(...fluxN.slice(Math.max(0, i - 3), i + 4)) && (!onsets.length || i * hopS - onsets.at(-1) > 0.05)) onsets.push(r3(i * hopS));
  }
  // Tempo: autocorrelation of the onset envelope (60–180 BPM) with a gentle prior around the hint/120.
  const centre = bpmHint || 120; let best = { score: -Infinity, lag: 0 };
  const minLag = Math.round(60 / 180 / hopS), maxLag = Math.round(60 / 60 / hopS);
  const ac = lag => { let s = 0; for (let i = 0; i + lag < fluxN.length; i++) s += fluxN[i] * fluxN[i + lag]; return s / (fluxN.length - lag); };
  const acs = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = 60 / (lag * hopS), prior = Math.exp(-0.5 * (Math.log2(bpm / centre) / 0.5) ** 2), score = ac(lag) * prior; acs.push(score);
    if (score > best.score) best = { score, lag };
  }
  const i0 = best.lag - minLag, a = acs[i0 - 1] ?? acs[i0], c = acs[i0 + 1] ?? acs[i0], denom = a - 2 * acs[i0] + c;
  const lag = best.lag + (denom ? 0.5 * (a - c) / denom : 0), period = lag * hopS, bpm = 60 / period;
  const sorted = [...acs].sort((x, z) => z - x), confidence = r3(Math.min(1, Math.max(0, (sorted[0] - sorted[Math.min(5, sorted.length - 1)]) / (sorted[0] || 1) * 2)));
  // Beat phase: the constant grid offset collecting the most onset energy.
  let bestPhase = 0, bestSum = -1;
  for (let ph = 0; ph < period; ph += hopS) {
    let s = 0; for (let t = ph; t < duration; t += period) s += fluxN[Math.round(t / hopS)] || 0;
    if (s > bestSum) { bestSum = s; bestPhase = ph; }
  }
  const beats = []; for (let t = bestPhase; t < duration; t += period) beats.push(r3(t));
  // Raw (un-normalized) low-band attack, peak within ±2 frames: loud bars outweigh quiet ones.
  const lowAt = i => Math.max(...[-2, -1, 0, 1, 2].map(d => lowFlux[i + d] || 0));
  const scores = Array.from({ length: beatsPerBar }, (_, k) => {
    const idx = beats.filter((_, i) => i % beatsPerBar === k).map(t => Math.round(t / hopS)); return idx.reduce((s, i) => s + lowAt(i), 0) / Math.max(1, idx.length);
  });
  const order = scores.map((s, k) => [s, k]).sort((x, z) => z[0] - x[0]);
  const downbeats = beats.filter((_, i) => i % beatsPerBar === order[0][1]);
  const hop = 0.05;
  return { version: 1, source: src, analyzer: 'node-basic', duration: r3(duration), sampleRate: SR, beatsPerBar,
    tempo: { bpm: +bpm.toFixed(2), confidence }, beats, downbeats,
    downbeatConfidence: r3((order[0][0] - (order[1]?.[0] ?? 0)) / (order[0][0] || 1)), downbeatMethod: 'heuristic: low-frequency attack per bar phase',
    onsets, sections: null,
    curves: { hop, energy: resample(normalize(rms), hopS, hop, duration), onset: resample(fluxN, hopS, hop, duration),
      brightness: resample(normalize(centroid), hopS, hop, duration), low: resample(normalize(low), hopS, hop, duration) },
    notes: ['node-basic analyzer: constant-tempo grid; install numpy+librosa for beat tracking that follows tempo changes'] };
}

// ---------- derived editorial events ----------
const smooth = (arr, n) => arr.map((_, i) => { let s = 0, c = 0; for (let k = Math.max(0, i - n); k <= Math.min(arr.length - 1, i + n); k++) { s += arr[k]; c++; } return s / c; });

export function deriveEvents(raw) {
  const map = { ...raw, notes: [...(raw.notes || [])] };
  validateMusicMap(map, { derived: false });
  const D = map.duration, E0 = map.curves?.energy, hop = map.curves?.hop;
  map.quiet = []; map.builds = []; map.releases = []; map.peaks = [];
  if (E0?.length) {
    const E = smooth(E0, Math.round(0.25 / hop)), T = i => r3(i * hop);
    // Quiet holds: sustained low energy (≥ 1 s).
    let qs = null;
    for (let i = 0; i <= E.length; i++) {
      const q = i < E.length && E[i] < 0.25;
      if (q && qs === null) qs = i; if (!q && qs !== null) { if ((i - qs) * hop >= 1) map.quiet.push({ start: T(qs), end: T(i) }); qs = null; }
    }
    // Builds: energy rising ≥ 0.12/s for ≥ 1.5 s with a total rise ≥ 0.25.
    const w = Math.round(1 / hop), hw = Math.round(w / 2);
    const slope = E.map((_, i) => E[Math.min(E.length - 1, i + hw)] - E[Math.max(0, i - hw)]); // centred, per second
    let bs = null;
    for (let i = 0; i <= slope.length; i++) {
      const up = i < slope.length && slope[i] > 0.12;
      if (up && bs === null) bs = i;
      if (!up && bs !== null) { const end = Math.min(E.length - 1, i), rise = E[end] - E[bs]; if ((end - bs) * hop >= 1.5 && rise >= 0.25) map.builds.push({ start: T(bs), end: T(end), rise: r3(rise) }); bs = null; }
    }
    // Releases / drops: energy after a point exceeds energy before it by ≥ 0.3 (strongest per 2 s).
    // A release is a jump in overall energy OR in low end (kick/bass entering after a riser).
    const step = arr => arr.map((_, i) => { const a = arr.slice(Math.max(0, i - w), i), b = arr.slice(i, i + w); return a.length && b.length ? b.reduce((x, y) => x + y, 0) / b.length - a.reduce((x, y) => x + y, 0) / a.length : 0; });
    const dE = step(E), dL = map.curves.low?.length === E0.length ? step(smooth(map.curves.low, Math.round(0.25 / hop))) : dE;
    const diff = dE.map((v, i) => Math.max(v, dL[i]));
    const cand = [];
    for (let i = 1; i < diff.length - 1; i++) if (diff[i] >= 0.3 && diff[i] >= diff[i - 1] && diff[i] >= diff[i + 1]) cand.push(i);
    for (const i of cand.sort((a, b) => diff[b] - diff[a])) {
      let t = i * hop; const snap = nearestIn(map.downbeats?.length ? map.downbeats : map.beats, t);
      if (snap && Math.abs(snap.value - t) <= 0.2) t = snap.value;
      if (!map.releases.some(r => Math.abs(r.t - t) < 2)) map.releases.push({ t: r3(t), rise: r3(diff[i]), snapped: !!snap && Math.abs(snap.value - i * hop) <= 0.2 });
    }
    map.releases.sort((a, b) => a.t - b.t);
    // Peaks: prominent local maxima of the 1.5 s-smoothed energy, ≥ 2 s apart.
    const P = smooth(E0, Math.round(0.75 / hop));
    const peakCand = [];
    for (let i = 1; i < P.length - 1; i++) if (P[i] >= P[i - 1] && P[i] > P[i + 1]) {
      const lo = Math.min(...P.slice(Math.max(0, i - 3 * w), i + 1)), lo2 = Math.min(...P.slice(i, i + 3 * w));
      if (P[i] - Math.max(lo, lo2) >= 0.12 || (P[i] - Math.min(lo, lo2) >= 0.3)) peakCand.push(i);
    }
    for (const i of peakCand.sort((a, b) => P[b] - P[a])) if (!map.peaks.some(p => Math.abs(p.t - i * hop) < 2)) map.peaks.push({ t: T(i), energy: r3(P[i]) });
    map.peaks.sort((a, b) => a.t - b.t);
  }
  // Sections fallback: split on energy changes when the analyzer gave none.
  if (!Array.isArray(map.sections) || !map.sections.length) {
    const bounds = [0, ...map.releases.map(r => r.t), D].filter((t, i, a) => i === 0 || t - a[i - 1] >= 2);
    if (bounds.at(-1) !== D) bounds.push(D);
    map.sections = bounds.slice(0, -1).map((a, i) => ({ start: r3(a), end: r3(bounds[i + 1]), label: `S${i + 1}`, energy: E0 ? r3(mean(E0, a / hop, bounds[i + 1] / hop)) : null }));
  }
  // Phrase candidates: every 4 bars from the first downbeat, plus section starts snapped to a downbeat.
  const bars = map.downbeats || [], bpb4 = [];
  for (let i = 0; i < bars.length; i += 4) bpb4.push(bars[i]);
  const secStarts = map.sections.slice(1).map(s => { const n = nearestIn(bars, s.start); return n && Math.abs(n.value - s.start) < 0.6 ? n.value : s.start; });
  map.phrases = [...new Set([...bpb4, ...secStarts].map(r3))].sort((a, b) => a - b);
  // Transient density: onsets per second in 2 s windows (hop 1 s).
  map.density = [];
  for (let t = 0; t + 1e-9 < D; t += 1) { const end = Math.min(D, t + 2); map.density.push({ start: r3(t), end: r3(end), perSecond: r3((map.onsets || []).filter(o => o >= t && o < end).length / (end - t)) }); }
  map.derived = 'lib/musicmap.mjs v1';
  return map;
}
const mean = (arr, a, b) => { const s = arr.slice(Math.max(0, Math.floor(a)), Math.max(Math.floor(a) + 1, Math.ceil(b))); return s.reduce((x, y) => x + y, 0) / (s.length || 1); };
function nearestIn(list, t) {
  if (!list?.length) return null;
  let lo = 0, hi = list.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (list[m] < t) lo = m; else hi = m; }
  const i = Math.abs(list[lo] - t) <= Math.abs(list[hi] - t) ? lo : hi;
  return { index: i, value: list[i] };
}

export function validateMusicMap(map, { derived = true } = {}) {
  const errs = [];
  if (!map || map.version !== 1) errs.push('music map version must be 1');
  if (!(map?.duration > 0)) errs.push('duration must be positive');
  for (const k of ['beats', 'downbeats']) {
    if (!Array.isArray(map?.[k])) { errs.push(`${k} must be an array`); continue; }
    for (let i = 1; i < map[k].length; i++) if (!(map[k][i] > map[k][i - 1])) { errs.push(`${k} must be strictly increasing`); break; }
  }
  if (map?.curves && (!(map.curves.hop > 0) || !Array.isArray(map.curves.energy))) errs.push('curves need hop and energy');
  if (derived) for (const k of ['quiet', 'builds', 'releases', 'peaks', 'phrases', 'sections']) if (!Array.isArray(map?.[k])) errs.push(`${k} missing: run deriveEvents`);
  if (errs.length) throw new Error('invalid music map: ' + errs.join('; '));
  return true;
}

export function loadMusicMap(path) {
  const map = JSON.parse(readFileSync(path, 'utf8'));
  return map.derived ? (validateMusicMap(map), map) : deriveEvents(map);
}

// ---------- queries an editor can reason with ----------
export function energyAt(map, t) {
  const c = map.curves; if (!c) return null;
  const x = t / c.hop, a = Math.max(0, Math.min(c.energy.length - 1, Math.floor(x))), b = Math.min(c.energy.length - 1, a + 1);
  return c.energy[a] + (c.energy[b] - c.energy[a]) * Math.min(1, Math.max(0, x - a));
}
export function trendAt(map, t, span = 1) {
  const a = energyAt(map, Math.max(0, t - span)), b = energyAt(map, Math.min(map.duration, t + span));
  if (a === null) return 'unknown';
  return b - a > 0.15 ? 'rising' : a - b > 0.15 ? 'falling' : 'steady';
}
export const sectionAt = (map, t) => map.sections.find(s => t >= s.start && t < s.end) || map.sections.at(-1);

// Position relative to the beat/bar grid: bar and beat numbers are 1-based from the first downbeat.
export function beatAt(map, t) {
  const n = nearestIn(map.beats, t);
  if (!n) return null;
  const beatTime = n.value, downs = map.downbeats || [];
  const dIdx = downs.filter(d => d <= beatTime + 1e-6).length;
  const lastDown = dIdx ? downs[dIdx - 1] : null;
  const beatInBar = lastDown === null ? null : map.beats.filter(b => b >= lastDown - 1e-6 && b <= beatTime + 1e-6).length;
  return { time: beatTime, delta: r3(t - beatTime), index: n.index, bar: dIdx || null, beatInBar, downbeat: beatInBar === 1 };
}

const ms = s => `${Math.round(Math.abs(s) * 1000)} ms`;
const word = e => (e === null || e === undefined ? 'unmeasured' : e < 0.3 ? 'quiet' : e < 0.65 ? 'medium' : 'high');

// One sentence about a moment: grid position, section, energy trend and nearby musical events.
export function describeTime(map, t) {
  const parts = [], b = beatAt(map, t);
  const period = map.tempo?.bpm ? 60 / map.tempo.bpm : Infinity;
  if (b && Math.abs(b.delta) > 0.75 * period) parts.push(`no beat grid here (nearest detected beat ${b.time}s)`);
  else if (b) {
    const where = b.downbeat ? `the downbeat of bar ${b.bar}` : b.bar ? `beat ${b.beatInBar} of bar ${b.bar}` : `beat ${b.index + 1}`;
    parts.push(Math.abs(b.delta) < 0.015 ? `on ${where}` : `${ms(b.delta)} ${b.delta < 0 ? 'before' : 'after'} ${where}`);
  }
  const s = sectionAt(map, t), e = energyAt(map, t);
  parts.push(`${s.label}${s.energy !== null && s.energy !== undefined ? ` (${word(s.energy)})` : ''}`);
  if (e !== null) parts.push(`energy ${e.toFixed(2)} ${trendAt(map, t)}`);
  const near = [
    ...map.releases.map(r => ({ t: r.t, what: 'release' })), ...map.peaks.map(p => ({ t: p.t, what: 'peak' })),
    ...map.builds.map(x => ({ t: x.end, what: 'end of build' })), ...map.phrases.map(p => ({ t: p, what: 'phrase start' })),
  ].filter(x => Math.abs(x.t - t) <= 0.75).sort((x, y) => Math.abs(x.t - t) - Math.abs(y.t - t))[0];
  if (near) parts.push(Math.abs(near.t - t) < 0.015 ? `on the ${near.what}` : `${ms(near.t - t)} ${near.t > t ? 'before' : 'after'} the ${near.what} at ${near.t}s`);
  if (map.quiet.some(q => t >= q.start && t < q.end)) parts.push('inside a quiet hold');
  if (map.builds.some(x => t >= x.start && t < x.end)) parts.push('inside a build');
  return parts.join(' · ');
}

// Evidence table for planned cuts / landings. tolerance: how close counts as "on" the grid.
export function cutReport(map, times, { tolerance = 0.04 } = {}) {
  return times.map(t => { const b = beatAt(map, t); return { t, onBeat: !!b && Math.abs(b.delta) <= tolerance, onDownbeat: !!b && b.downbeat && Math.abs(b.delta) <= tolerance, delta: b?.delta ?? null, text: describeTime(map, t) }; });
}

// Candidate landing points in [from, to], strongest musical reason first.
export function landings(map, { from = 0, to = map.duration, near } = {}) {
  const rank = { release: 0, peak: 1, phrase: 2, downbeat: 3 };
  const c = [...map.releases.map(r => ({ t: r.t, kind: 'release' })), ...map.peaks.map(p => ({ t: p.t, kind: 'peak' })),
    ...map.phrases.map(t => ({ t, kind: 'phrase' })), ...(map.downbeats || []).map(t => ({ t, kind: 'downbeat' }))]
    .filter(x => x.t >= from && x.t <= to);
  const seen = new Set();
  return c.sort((a, b) => rank[a.kind] - rank[b.kind] || (near !== undefined ? Math.abs(a.t - near) - Math.abs(b.t - near) : a.t - b.t))
    .filter(x => { const k = x.t.toFixed(2); if (seen.has(k)) return false; seen.add(k); return true; });
}

// A short plain-text map for planning (fits in a few lines of context).
export function summary(map) {
  const L = [`${map.analyzer}: ${map.duration.toFixed(2)} s, ${map.tempo?.bpm ?? '?'} BPM${map.tempo?.confidence !== null && map.tempo?.confidence !== undefined ? ` (confidence ${map.tempo.confidence})` : ''}, ${map.beatsPerBar ?? 4}/4, ${map.beats.length} beats, first downbeat ${map.downbeats[0] ?? 'unknown'}s`];
  L.push('sections: ' + map.sections.map(s => `${s.label} ${s.start}–${s.end}s ${word(s.energy)}`).join(' | '));
  if (map.quiet.length) L.push('quiet holds: ' + map.quiet.map(q => `${q.start}–${q.end}s`).join(', '));
  if (map.builds.length) L.push('builds: ' + map.builds.map(b => `${b.start}–${b.end}s (+${b.rise})`).join(', '));
  if (map.releases.length) L.push('releases/drops: ' + map.releases.map(r => `${r.t}s (+${r.rise})`).join(', '));
  if (map.peaks.length) L.push('peaks: ' + map.peaks.map(p => `${p.t}s`).join(', '));
  L.push('phrase candidates: ' + map.phrases.map(p => `${p}s`).join(', '));
  for (const n of map.notes || []) L.push('note: ' + n);
  return L.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, file, ...rest] = process.argv.slice(2);
  const flags = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
  const args = rest.filter(a => !a.startsWith('--'));
  if (cmd === 'analyze' && file) {
    const out = args[0] || file.replace(/\.[^.]+$/, '') + '.musicmap.json';
    const map = await analyzeMusic(resolve(file), { out: resolve(out), engine: flags.engine || 'auto', bpmHint: flags['bpm-hint'] ? +flags['bpm-hint'] : undefined, beatsPerBar: flags['beats-per-bar'] ? +flags['beats-per-bar'] : 4 });
    console.log(summary(map)); console.log(`→ ${out}`);
  } else if (cmd === 'describe' && file) {
    const map = loadMusicMap(resolve(file));
    for (const t of args.map(Number)) console.log(`${t}s  ${describeTime(map, t)}`);
  } else if (cmd === 'summary' && file) console.log(summary(loadMusicMap(resolve(file))));
  else { console.error('usage: node lib/musicmap.mjs analyze track.wav [out.json] [--engine=auto|python|node] [--bpm-hint=96]\n       node lib/musicmap.mjs describe map.json 8.2 12.5\n       node lib/musicmap.mjs summary map.json'); process.exit(2); }
}
