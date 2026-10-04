// Studio Engine — audio analysis (Node, ffmpeg only): decode, tempo + beat phase, onsets; voice words via tools/live.py.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function decode(file, { sr = 48000, mono = false, af = null } = {}) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, ...(af ? ['-af', af] : []), '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', mono ? '1' : '2', '-ar', String(sr), '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`cannot decode ${file}: ${r.stderr}`);
  const f = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
  if (mono) return { sr, mono: f };
  const n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return { sr, L, R, n };
}
// onset-strength envelope (positive energy flux) at hop seconds
export function onsetEnvelope(x, sr, hop = 0.01) {
  const H = Math.round(sr * hop), n = Math.floor(x.length / H), e = new Float32Array(n), o = new Float32Array(n);
  let prev = 0; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < H; j++) { const v = x[i * H + j]; s += v * v; } e[i] = Math.log1p(1000 * s / H); }
  for (let i = 1; i < n; i++) { o[i] = Math.max(0, e[i] - prev); prev = e[i] * 0.5 + prev * 0.5; }
  return o;
}
export function onsets(file, { thresh = 0.6, minGap = 0.06 } = {}) {
  const { mono, sr } = decode(file, { sr: 24000, mono: true }), o = onsetEnvelope(mono, sr), hop = 0.01, out = [];
  // adaptive threshold: a peak counts when it clears the local (±0.5 s) mean by `thresh` × the local spread
  const W = 50;
  for (let i = 1; i < o.length - 1; i++) { if (!(o[i] >= o[i - 1] && o[i] >= o[i + 1])) continue;
    let s = 0, s2 = 0, n = 0; for (let j = Math.max(0, i - W); j < Math.min(o.length, i + W); j++) { s += o[j]; s2 += o[j] * o[j]; n++; }
    const m = s / n, sd = Math.sqrt(Math.max(0, s2 / n - m * m));
    if (o[i] > m + thresh * 2 * sd && o[i] > 0.02 && (!out.length || i * hop - out[out.length - 1] > minGap)) out.push(+(i * hop).toFixed(3)); }
  return out;
}
// tempo 70–180 BPM by autocorrelation of the onset envelope, then the beat phase with the most onset energy
export function tempo(file) {
  const { mono, sr } = decode(file, { sr: 24000, mono: true, af: 'lowpass=f=160,lowpass=f=160' }), o = onsetEnvelope(mono, sr), hop = 0.01;   // the kick band carries the pulse; hats and offbeats confuse the grid
  let best = { bpm: 120, score: -1 };
  for (let bpm = 70; bpm <= 180; bpm += 0.5) { const lag = 60 / bpm / hop; let s = 0; for (let i = 0; i + 2 * lag < o.length; i += 1) s += o[i] * (o[Math.round(i + lag)] + 0.5 * o[Math.round(i + 2 * lag)]); if (s > best.score) best = { bpm, score: s }; }
  for (let bpm = best.bpm - 0.5; bpm <= best.bpm + 0.5; bpm += 0.05) { const lag = 60 / bpm / hop; let s = 0; for (let i = 0; i + 2 * lag < o.length; i += 1) s += o[i] * (o[Math.round(i + lag)] + 0.5 * o[Math.round(i + 2 * lag)]); if (s > best.score) best = { bpm, score: s }; }   // fine pass
  let bpm = best.bpm; while (bpm < 90) bpm *= 2; while (bpm > 160) bpm /= 2;
  const per = 60 / bpm / hop; let ph = 0, pbest = -1;
  for (let p = 0; p < per; p++) { let s = 0; for (let i = p; i < o.length; i += per) s += o[Math.round(i)] || 0; if (s > pbest) { pbest = s; ph = p; } }
  // refine over the WHOLE track: comb-score every (bpm ± 1, phase) pair by the onset energy at the predicted beats
  { const at = (x) => { const k = Math.floor(x), f = x - k; return (o[k] || 0) * (1 - f) + (o[k + 1] || 0) * f; };
    let bestS = -1, bb = bpm, bp = ph;
    for (let q = bpm - 1; q <= bpm + 1; q += 0.02) { const per = 60 / q / hop;
      for (let p = 0; p < per; p += 0.5) { let sc = 0; for (let x = p; x < o.length; x += per) sc += at(x); if (sc > bestS) { bestS = sc; bb = q; bp = p; } } }
    bpm = bb; ph = bp; }
  const period = 60 / bpm, off = ((ph * hop) % period + period) % period;
  return { bpm: +bpm.toFixed(2), offset: +(off > period - 0.05 ? off - period : off).toFixed(3), duration: +(mono.length / sr).toFixed(3) };   // a phase just before the period is beat 0
}
// narration → word timings using the studio's offline Whisper (tools/live.py); returns null when the tool is missing
export function voiceWords(file, packDir) {
  mkdirSync(packDir, { recursive: true });
  const tr = join(packDir, 'transcript.json');
  if (existsSync(tr)) return JSON.parse(readFileSync(tr, 'utf8'));
  // audio-only pack for tools/live.py (its ingest expects video): 16 kHz mono + a minimal pack.json, then VAD + Whisper
  const a = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vn', '-ac', '1', '-ar', '16000', join(packDir, 'audio16k.wav')]);
  if (a.status !== 0) return { error: 'cannot decode the voice file' };
  const dur = +(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim() || 0);
  writeFileSync(join(packDir, 'pack.json'), JSON.stringify({ source: file, ss: 0, fps: 30, frames: Math.round(dur * 30), w: 0, h: 0, duration: dur, audio: true }));
  for (const step of [['vad', packDir], ['transcribe', packDir]]) {
    const r = spawnSync('python3', ['tools/live.py', ...step], { encoding: 'utf8' });
    if (r.status !== 0) return { error: `live.py ${step[0]} failed: ${(r.stderr || '').trim().split('\n').slice(-2).join(' ')}` };
  }
  return existsSync(tr) ? JSON.parse(readFileSync(tr, 'utf8')) : { error: 'no transcript.json produced' };
}
