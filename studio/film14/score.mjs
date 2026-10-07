// Film 14 score v2 — epic football anthem at 150 BPM (beat 0.4 s = 12 frames, bar 1.6 s), 12.5 bars = 20.0 s, A minor.
// Owner (2026-10-07): v1 synth chant was "very bad"; wants energetic World-Cup-anthem energy. The 2026 World Cup anthem pairs an
// operatic/orchestral sound with an EDM drop; this score takes that STYLE (no melody or recording copied): real recorded orchestra
// samples — trumpets, trombones, French horns, violin/viola/cello spiccato, timpani, snare rolls, crash cymbals — from VS Chamber
// Orchestra Community Edition (CC0, assets/audio/vsco, git-ignored), over an EDM kick/sub/supersaw bed. One original brass fanfare
// hook (I–VI–III–VII: Am–F | C–G) returns in every chapter; the loudest statement is on the host + title. Whistle at kick-off and end.
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, noiseHit, bell, reverb, writeWav, peak, biquad, rng, pan, bloop } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep, texture } from '../lib/sfx.mjs';
import { EV, DUR } from './timing.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'takes', 'film14');
mkdirSync(OUT, { recursive: true });
const BEAT = 0.4, BAR = 1.6, S16 = 0.1, N = DUR + 2;
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;
const mk = () => new Bus(N);
const drums = mk(), low = mk(), chords = mk(), lead = mk(), fx = mk(), vox = mk(), orch = mk();
const kicks = [];

// ---------- voices ----------
function kick(t, vel = 1) {
  kicks.push(t); const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.42; k++) { const tt = k / SR, f = 46 + 120 * Math.exp(-tt / 0.028); ph += 2 * Math.PI * f / SR;
    const body = Math.tanh(2.6 * Math.sin(ph) * Math.exp(-tt / 0.11)) * 0.7, click = k < 140 ? (Math.sin(k * 1.9) + Math.sin(k * 0.7)) * 0.3 * (1 - k / 140) : 0, thud = Math.sin(2 * Math.PI * 160 * tt) * Math.exp(-tt / 0.03) * 0.35;
    drums.add(i0 + k, (body + click + thud) * vel * 0.7); }
}
const clap = (t, v = 0.45) => { for (let i = 0; i < 4; i++) noiseHit(drums, t + i * 0.008, { dur: i === 3 ? 0.16 : 0.012, vel: v * 1.9 * (i === 3 ? 1 : 0.6), bp: 1700, q: 0.7, seed: 31 + i + Math.round(t * 100) }); };
const hat = (t, v = 0.07, open = false, p = 0.25) => noiseHit(drums, t, { dur: open ? 0.11 : 0.03, vel: v * 3.2, hp: 6500, p, seed: Math.round(t * 1000) });
const snare = (t, v) => noiseHit(drums, t, { dur: 0.04, vel: v, bp: 1900, q: 0.8, tone: 230, seed: Math.round(t * 997) });
function roll(t0, t1, v0 = 0.05, v1 = 0.3) { let t = t0, step = (t1 - t0) / 6; while (t < t1 - 0.02) { snare(t, v0 + (v1 - v0) * ((t - t0) / (t1 - t0))); t += step; step = Math.max(S16 / 2, step * 0.8); } }
function saw(bus, t, midis, dur, vel, { cut0 = 6000, cut1 = 900, decay = 0.25, p = 0, detune = 0.16, voices = 5, width = 0.6 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round((dur + 0.3) * SR);
  const osc = []; for (const m of midis) for (let v = 0; v < voices; v++) osc.push({ f: mtof(m) * Math.pow(2, ((v - (voices - 1) / 2) * detune) / 12), ph: ((m * 0.137 + v * 0.371) % 1), p: voices > 1 ? (v / (voices - 1) - 0.5) * 2 * width : 0 });
  const st = [{ x1: 0, x2: 0, y1: 0, y2: 0 }, { x1: 0, x2: 0, y1: 0, y2: 0 }]; let co;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    if (k % 32 === 0) { const fc = cut1 + (cut0 - cut1) * Math.exp(-tt / decay), w = 2 * Math.PI * Math.min(fc, SR * 0.45) / SR, c = Math.cos(w), sn = Math.sin(w), a = sn / 1.6; co = [(1 - c) / 2 / (1 + a), (1 - c) / (1 + a), (1 - c) / 2 / (1 + a), -2 * c / (1 + a), (1 - a) / (1 + a)]; }
    let l = 0, r = 0; for (const o of osc) { o.ph = (o.ph + o.f / SR) % 1; const x = 2 * o.ph - 1, [gl, gr] = pan(Math.max(-1, Math.min(1, o.p + p))); l += x * gl; r += x * gr; }
    const env = Math.min(1, tt / 0.004) * (tt > dur ? Math.exp(-(tt - dur) / 0.07) : 1), g = env * vel * 0.3 / Math.sqrt(osc.length);
    const out = [l, r].map((x, ch) => { const S = st[ch], y = co[0] * x + co[1] * S.x1 + co[2] * S.x2 - co[3] * S.y1 - co[4] * S.y2; S.x2 = S.x1; S.x1 = x; S.y2 = S.y1; S.y1 = y; return y; });
    bus.add(i0 + k, out[0] * g, out[1] * g);
  }
}
function sub(t, midi, dur, vel = 0.7) { const i0 = Math.round(t * SR), f = mtof(midi); let ph = 0;
  for (let k = 0; k < (dur + 0.05) * SR; k++) { const tt = k / SR; ph += 2 * Math.PI * f / SR; const env = Math.min(1, tt / 0.005) * (tt > dur ? Math.exp(-(tt - dur) / 0.02) : 1);
    low.add(i0 + k, Math.tanh(2.2 * (Math.sin(ph) + 0.7 * Math.sin(2 * ph) + 0.55 * Math.sin(3 * ph) + 0.35 * Math.sin(4 * ph))) * env * vel * 0.34); } }
function tone(bus, t, f0, f1, { dur = 0.25, vel = 0.3, p = 0, glide = 0.04, harm = 0.25 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * 3 * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const tt = k / SR, f = f1 + (f0 - f1) * Math.exp(-tt / glide); ph += (2 * Math.PI * f) / SR; const s = (Math.sin(ph) + harm * Math.sin(2 * ph)) * Math.min(1, tt / 0.002) * Math.exp(-tt / dur) * vel * 0.35; bus.add(i0 + k, s * gl, s * gr); }
}
// marimba-ish mallet (fundamental + 4th partial, fast decay) — the furniture "lands" on the hook's scale
function mallet(bus, t, midi, vel = 0.3, p = 0) { const i0 = Math.round(t * SR), f = mtof(midi), [gl, gr] = pan(p);
  for (let k = 0; k < SR * 0.6; k++) { const tt = k / SR, s = (Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt / 0.22) + 0.35 * Math.sin(2 * Math.PI * f * 3.93 * tt) * Math.exp(-tt / 0.05)) * Math.min(1, tt / 0.001) * vel * 0.4; bus.add(i0 + k, s * gl, s * gr); } }
// pen on paper: band-passed noise whose centre follows the stroke, with a light scratch texture
function scribble(t0, t1, vel = 0.08) { const i0 = Math.round(t0 * SR), n = Math.round((t1 - t0) * SR), r = rng(808); let y = 0, yb = 0;
  for (let k = 0; k < n; k++) { const u = k / n, x = r() * 2 - 1, a = 0.06 + 0.04 * Math.sin(u * 40); y += a * (x - y); yb += 0.5 * (y - yb); const env = Math.min(1, u * 12, (1 - u) * 12) * (0.7 + 0.3 * Math.sin(u * 2 * Math.PI * 9)); const s = (y - yb) * env * vel * 6; fx.add(i0 + k, s * 0.9, s); } }
// laser slice: a falling sine sweep with a buzz, for the cut plane slicing the walls
function laser(t, dur, vel = 0.12) { const i0 = Math.round(t * SR), n = Math.round(dur * SR); let ph = 0;
  for (let k = 0; k < n; k++) { const u = k / n, f = 2400 * Math.pow(0.3, u); ph += 2 * Math.PI * f / SR; const env = Math.sin(Math.PI * u) ** 0.6; const s = (Math.sin(ph) * 0.6 + 0.4 * Math.sign(Math.sin(ph * 0.5))) * env * vel; fx.add(i0 + k, s * 0.8, s); } }

// crowd roar: band-limited noise swell (the goal), and a low bed for the stadium
function crowd(t0, dur, vel = 0.2, { attack = 0.08, bright = 0.12 } = {}) { const i0 = Math.round(t0 * SR), n = Math.round(dur * SR), r = rng(Math.round(t0 * 100)); let a = 0, b = 0, c = 0;
  for (let k = 0; k < n; k++) { const tt = k / SR, x = r() * 2 - 1; a += bright * (x - a); b += 0.02 * (a - b); c = a - b; const env = Math.min(1, tt / attack) * Math.exp(-Math.max(0, tt - attack) / (dur * 0.45)) * (1 + 0.15 * Math.sin(tt * 2 * Math.PI * 3.1));
    fx.add(i0 + k, c * env * vel * 2.2, (a - b * 0.9) * env * vel * 2.2); } }
function thump(t, vel = 0.5) { kickBall(t, vel); noiseHit(fx, t, { dur: 0.03, vel: vel * 0.4, bp: 900, q: 1.2, seed: Math.round(t * 333) }); }
function kickBall(t, vel) { const i0 = Math.round(t * SR); let ph = 0; for (let k = 0; k < SR * 0.18; k++) { const tt = k / SR, f = 90 + 160 * Math.exp(-tt / 0.012); ph += 2 * Math.PI * f / SR; fx.add(i0 + k, Math.sin(ph) * Math.exp(-tt / 0.05) * vel * 0.5); } }
function clunk(t, vel = 0.5, p = 0) { impact(fx, t, { vel: vel * 0.7, weight: 0.9, p }); tone(fx, t, 180, 60, { dur: 0.12, vel: vel * 0.6, p }); noiseHit(fx, t + 0.01, { dur: 0.25, vel: vel * 0.12, hp: 5000, p, seed: Math.round(t * 71) }); }


function whistle(t, dur, vel = 0.18) { const i0 = Math.round(t * SR), n = Math.round(dur * SR), r = rng(Math.round(t * 50)); let ph = 0;
  for (let k = 0; k < n; k++) { const tt = k / SR, f = 2850 + 60 * Math.sin(tt * 2 * Math.PI * 28); ph += 2 * Math.PI * f / SR; const env = Math.min(1, tt / 0.02, (dur - tt) / 0.04) * (0.75 + 0.25 * Math.sin(tt * 2 * Math.PI * 28)); const s = (Math.sin(ph) * 0.8 + (r() - 0.5) * 0.25) * env * vel; fx.add(i0 + k, s, s); } }
// crowd-chant voice: detuned saws through vowel formants ("oh"), loose timing like a stand singing
function chant(t, midi, dur, vel = 0.3, { vowel = 'o', voices = 6 } = {}) {
  const F = vowel === 'a' ? [[730, 6], [1090, 7], [2440, 9]] : [[470, 6], [820, 7], [2600, 9]], r = rng(Math.round(t * 1000) + midi);
  for (let v = 0; v < voices; v++) { const off = (r() - 0.5) * 0.03, det = (r() - 0.5) * 0.22, i0 = Math.round((t + off) * SR), len = Math.round((dur + 0.12) * SR), f = mtof(midi + det + (v % 3 === 2 ? -12 : 0)), [gl, gr] = pan((v / (voices - 1) - 0.5) * 1.4);
    const bps = F.map(([fc, q]) => biquad('bp', fc * (1 + (r() - 0.5) * 0.05), q)); let ph = r();
    for (let k = 0; k < len; k++) { const tt = k / SR, vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.2 * tt + v), x = 2 * ph - 1; ph = (ph + f * vib / SR) % 1;
      const env = Math.min(1, tt / 0.03) * (tt > dur ? Math.exp(-(tt - dur) / 0.05) : 1); const y = bps[0](x) + 0.7 * bps[1](x) + 0.25 * bps[2](x); const s = y * env * vel * 0.5 / Math.sqrt(voices); vox.add(i0 + k, s * gl, s * gr); } }
}
function horn(t, midis, dur = 0.28, vel = 0.5) { for (const m of midis) saw(chords, t, [m], dur, vel, { cut0: 4500, cut1: 1600, decay: 0.1, voices: 3, detune: 0.2, width: 0.5 }); }

// ---------- sampler (VSCO 2 CE, CC0): file names are one octave below scientific pitch (measured: "A2" = 220 Hz) ----------
const VS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio', 'vsco');
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const cache = new Map();
function readWav(path) { if (cache.has(path)) return cache.get(path); const b = readFileSync(path); let o = 12, fmt, data;
  while (o < b.length - 8) { const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4); if (id === 'fmt ') fmt = { ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) }; if (id === 'data') { data = [o + 8, sz]; break; } o += 8 + sz + (sz & 1); }
  const [st, sz] = data, bps = fmt.bits / 8, n = Math.floor(sz / (bps * fmt.ch)), L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let c = 0; c < fmt.ch; c++) { const off = st + (i * fmt.ch + c) * bps, v = fmt.bits === 16 ? b.readInt16LE(off) / 32768 : fmt.bits === 24 ? b.readIntLE(off, 3) / 8388608 : b.readFloatLE(off); if (c === 0) { L[i] = v; if (fmt.ch === 1) R[i] = v; } else R[i] = v; }
  const w = { L, R, sr: fmt.sr }; cache.set(path, w); return w; }
function instrument(dir) { return readdirSync(join(VS, dir)).filter((f) => f.endsWith('.wav')).map((f) => { const m = f.match(/_([A-G]#?)(-?\d)_/); return m ? { midi: (+m[2] + 2) * 12 + NOTE[m[1]], path: join(VS, dir, f) } : null; }).filter(Boolean).sort((x, y) => x.midi - y.midi); }
const I = { tptS: instrument('Brass/Trumpet/stac'), tptL: instrument('Brass/Trumpet/sus'), tbnS: instrument('Brass/Tenor Trombone/stac'), tbnL: instrument('Brass/Tenor Trombone/sus'), hrnS: instrument('Brass/F Horn/stac'), hrnL: instrument('Brass/F Horn/sus'),
  vln: instrument('Strings/Violin Section/Spic'), vla: instrument('Strings/Viola Section/spic'), vc: instrument('Strings/Cello Section/spic'), vlnL: instrument('Strings/Violin Section/susVib') };
// play a pitched sample: nearest recorded note, resampled; sustained samples are cut at dur with a release
function play(set, t, midi, dur, vel = 0.5, { p = 0, rel = 0.12, att = 0.004 } = {}) {
  let best = set[0]; for (const s of set) if (Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s;
  const w = readWav(best.path), ratio = (w.sr / SR) * Math.pow(2, (midi - best.midi) / 12), maxK = Math.floor((w.L.length - 2) / ratio), dK = dur ? Math.round(dur * SR) : maxK, n = Math.min(maxK, dur ? dK + Math.round(rel * 5 * SR) : maxK);
  const i0 = Math.round(t * SR), [gl, gr] = pan(p);
  for (let k = 0; k < n; k++) { const pos = k * ratio, j = pos | 0, f = pos - j, env = Math.min(1, k / (att * SR + 1)) * (dur && k > dK ? Math.exp(-(k - dK) / (rel * SR)) : 1);
    orch.add(i0 + k, (w.L[j] + (w.L[j + 1] - w.L[j]) * f) * env * vel * gl * 1.4, (w.R[j] + (w.R[j + 1] - w.R[j]) * f) * env * vel * gr * 1.4); }
}
function hit(file, t, vel = 0.6, p = 0) { const w = readWav(join(VS, file)), i0 = Math.round(t * SR), ratio = w.sr / SR, n = Math.floor((w.L.length - 2) / ratio), [gl, gr] = pan(p);
  for (let k = 0; k < n; k++) { const pos = k * ratio, j = pos | 0, f = pos - j; orch.add(i0 + k, (w.L[j] + (w.L[j + 1] - w.L[j]) * f) * vel * gl * 1.4, (w.R[j] + (w.R[j + 1] - w.R[j]) * f) * vel * gr * 1.4); } }
const PERC = 'Percussion/', TIMP_LO = PERC + 'Timpani/Timpani2_Hit_v4_rr1_Sum.wav', TIMP_HI = PERC + 'Timpani/Timpani3_Hit_v4_rr1_Sum.wav', TIMP_ROLL = PERC + 'Timpani/Rolls/Timpani3_Roll_v5_rr1_Sum.wav',
  CRASH = PERC + 'cymbal-crash1_ff_rr1.wav', BD = PERC + 'BDrumNewhit_v7_rr1_Sum.wav';
const snareRollFile = readdirSync(join(VS, 'Percussion')).find((f) => f.startsWith('Snare2-rollNS'));
// a timpani roll / snare roll that ENDS on time te (crescendo by fade-in)
function rollInto(file, te, len, vel = 0.5) { const w = readWav(join(VS, file)), ratio = w.sr / SR, n = Math.min(Math.round(len * SR), Math.floor((w.L.length - 2) / ratio)), i0 = Math.round((te - n / SR) * SR);
  for (let k = 0; k < n; k++) { const pos = k * ratio, j = pos | 0, env = (k / n) ** 1.6; orch.add(i0 + k, w.L[j] * env * vel * 1.4, w.R[j] * env * vel * 1.4); } }

// ---------- harmony + fanfare hook ----------
const CH = { Am: { v: [57, 60, 64, 69], r: 45 }, F: { v: [57, 60, 65, 69], r: 41 }, C: { v: [55, 60, 64, 67], r: 48 }, G: { v: [55, 59, 62, 67], r: 43 } };
const PROG = [['Am', 'F'], ['C', 'G']];
const pair = (bar) => PROG[bar % 2].map((k) => CH[k]);
const HOOK_A = [[0, 76, 2], [2, 81, 3], [5, 83, 1], [6, 84, 2], [8, 83, 1], [9, 81, 1], [10, 79, 2], [12, 76, 4]];
const HOOK_B = [[0, 76, 2], [2, 81, 3], [5, 83, 1], [6, 84, 2], [8, 86, 2], [10, 88, 2], [12, 84, 4]];
const hookFor = (bar) => (bar % 2 ? HOOK_B : HOOK_A);
function synthHook(bar, lvl = 1, cut = 7500) { for (const [s, m, l] of hookFor(bar)) saw(lead, bt(bar) + s * S16, [m, m + 12], l * S16 * 0.9, 0.55 * lvl, { cut0: cut, cut1: 2600, decay: 0.12, voices: 5, detune: 0.14, width: 0.5 }); }
function fanfare(bar, lvl = 1) { synthHook(bar, lvl); for (const [s, m0, l] of hookFor(bar)) { const m = m0 - 12, t = bt(bar) + s * S16, d = l * S16;
  if (l >= 2) { play(I.tptL, t, m, d * 0.92, 0.55 * lvl, { p: -0.15, att: 0.01, rel: 0.08 }); play(I.hrnL, t, m - 12, d * 0.92, 0.42 * lvl, { p: 0.25, att: 0.015, rel: 0.1 }); }
  play(I.tptS, t, m, 0, 0.5 * lvl, { p: 0.1 }); } }
function brassPad(bar, lvl = 1) { pair(bar).forEach((c, h) => { const t = bt(bar, h * 2); play(I.tbnL, t, c.r + 12, BAR / 2 - 0.04, 0.35 * lvl, { p: -0.3, att: 0.03 }); play(I.tbnL, t, c.r + 19, BAR / 2 - 0.04, 0.3 * lvl, { p: 0.3, att: 0.03 }); play(I.hrnL, t, c.v[1], BAR / 2 - 0.04, 0.28 * lvl, { p: 0, att: 0.04 }); }); }
function ostinato(bar, lvl = 1) { pair(bar).forEach((c, h) => { const v = c.v.map((m) => m + 12), seq = [v[3], v[1], v[2], v[1]];
  for (let s = 0; s < 8; s++) { const t = bt(bar, h * 2) + s * S16; play(I.vln, t, seq[s % 4], 0, (s % 4 === 0 ? 0.42 : 0.3) * lvl, { p: 0.35 }); play(I.vla, t, seq[(s + 2) % 4] - 12, 0, 0.22 * lvl, { p: -0.2 }); }
  for (let e = 0; e < 4; e++) play(I.vc, bt(bar, h * 2) + e * BEAT / 2, c.r, 0, 0.45 * lvl, { p: -0.35 }); }); }
function stabs(t, chord, lvl = 1) { const c = CH[chord]; c.v.forEach((m, i) => { play(I.tptS, t, m + 12, 0, 0.42 * lvl, { p: -0.4 + i * 0.25 }); play(I.tbnS, t, m - 12, 0, 0.4 * lvl, { p: 0.4 - i * 0.25 }); play(I.hrnS, t, m, 0, 0.3 * lvl, { p: 0 }); }); hit(TIMP_HI, t, 0.6 * lvl); }
function edm(bar, lvl = 1, { kicks: kk = 4 } = {}) { for (let b = 0; b < kk; b++) kick(bt(bar, b), 0.85 * lvl); for (const b of [1, 3]) clap(bt(bar, b), 0.4 * lvl);
  for (let s = 0; s < 16; s++) hat(bt(bar) + s * S16, s % 4 === 2 ? 0.08 * lvl : 0.035 * lvl, s % 4 === 2, s % 2 ? 0.35 : -0.35);
  pair(bar).forEach((c, h) => { for (let b = 0; b < 2; b++) sub(bt(bar, h * 2 + b + 0.5), c.r, BEAT * 0.42, 0.85 * lvl); for (let e = 0; e < 4; e++) saw(chords, bt(bar, h * 2) + e * BEAT / 2, c.v, BEAT * 0.4, 0.3 * lvl, { cut0: 4200, cut1: 1200, decay: 0.1 }); }); }
const timps = (bar, lvl = 1) => { hit(TIMP_LO, bt(bar, 0), 0.75 * lvl, -0.1); hit(TIMP_HI, bt(bar, 2), 0.55 * lvl, 0.1); };

// ---------- 0–1.6 · kick-off: whistle, timpani + brass stabs on the slams, a trumpet pickup ----------
whistle(0.0, 0.32, 0.2);
hit(BD, 0.0, 0.7); stabs(0.4, 'Am', 0.9); stabs(0.8, 'Am', 1.0); hit(CRASH, 0.4, 0.35, -0.3);
[[1.2, 64], [1.3, 69], [1.4, 71], [1.5, 72]].forEach(([t, m]) => play(I.tptS, t, m + 12, 0, 0.45, { p: 0.1 })); rollInto(TIMP_ROLL, 1.6, 0.9, 0.5);
// ---------- 1.6–4.8 · tactics: strings ostinato drives, horns hold, the pulse builds ----------
ostinato(1, 1.15); ostinato(2, 1.3); brassPad(1, 0.95); brassPad(2, 1.05); timps(1, 0.9); timps(2, 1.0);
edm(1, 0.6, { kicks: 4 }); edm(2, 0.85);
rollInto(TIMP_ROLL, 4.8, 1.2, 0.7); rollInto(PERC + snareRollFile, 4.8, 1.0, 0.55); riser(fx, 4.8, { dur: 1.0, vel: 0.18, f0: 300, f1: 8000, tonal: 0.2, seed: 12 });
// ---------- 4.8–11.2 · DROP: the anthem — fanfare + strings + brass + EDM ----------
for (let bar = 3; bar < 7; bar++) { fanfare(bar, bar < 5 ? 1 : 0.92); ostinato(bar, 0.9); brassPad(bar, 0.85); timps(bar); edm(bar, 1); }
hit(CRASH, 4.8, 0.7, -0.2); hit(CRASH, 8.0, 0.6, 0.2);
// ---------- 11.2–14.4 · analysis: the trumpets rest — strings + low brass + a lighter pulse, rising ----------
for (let bar = 7; bar < 9; bar++) { ostinato(bar, 1.25); brassPad(bar, 1.0); fanfare(bar, 0.45); edm(bar, 0.9); hit(TIMP_LO, bt(bar, 0), 0.7); }
hit(CRASH, 11.2, 0.35); rollInto(TIMP_ROLL, 14.4, 1.0, 0.6);
// ---------- 14.4–16.0 · word blast: one tutti brass stab per word ----------
[['Am', 0], ['F', 1], ['C', 2], ['G', 3]].forEach(([c, b]) => { const t = 14.4 + b * BEAT; stabs(t, c, 1.5); kick(t, 0.8); sub(t, CH[c].r, 0.3, 0.45); saw(lead, t, [CH[c].v[3] + 12, CH[c].v[3] + 24], 0.3, 0.6, { cut0: 8000, cut1: 2800, decay: 0.12, voices: 5, detune: 0.14, width: 0.6 }); });
rollInto(PERC + snareRollFile, 16.0, 0.8, 0.65); riser(fx, EV.end, { dur: 0.8, vel: 0.22, f0: 400, f1: 11000, tonal: 0.25, seed: 41 });
// ---------- 16.0–20.0 · the host + title: the fanfare at full strength, then the final chord and whistle ----------
for (let bar = 10; bar < 12; bar++) { fanfare(bar, 1.2); ostinato(bar, 1.05); brassPad(bar, 1.05); timps(bar, 1.1); edm(bar, 1.1); }
hit(CRASH, 16.0, 0.85, -0.2); hit(CRASH, 16.02, 0.6, 0.3);
{ const t = 19.2; CH.Am.v.forEach((m, i) => { play(I.tptL, t, m + 12, 0.7, 0.5, { p: -0.4 + i * 0.25, att: 0.01, rel: 0.2 }); play(I.tbnL, t, m - 12, 0.7, 0.45, { p: 0.3 - i * 0.2, att: 0.01, rel: 0.2 }); play(I.vlnL, t, m + 12, 0.7, 0.4, { p: 0.4, att: 0.02, rel: 0.2 }); });
  hit(CRASH, t, 0.8); hit(TIMP_LO, t, 0.9); hit(BD, t, 0.8); kick(t, 1.1); sub(t, 33, 0.6, 0.9); }
whistle(19.3, 0.1, 0.15); whistle(19.45, 0.1, 0.15); whistle(19.6, 0.3, 0.17);

// ---------- designed sound ----------
texture(fx, 0, DUR, { level: 0.01, kind: 'room', seed: 19, fade: 0.6 });
EV.bounces.forEach((t, i) => tone(fx, t, 520 - i * 60, 180, { dur: 0.1, vel: 0.5 })); whooshBy(fx, 1.45, { dur: 0.5, vel: 0.24, direction: 'center', low: 150, high: 3000, seed: 3 }); thump(EV.kickBall, 0.9);
impact(fx, EV.slamA, { vel: 0.35, weight: 0.4 }); impact(fx, EV.slamB, { vel: 0.35, weight: 0.4 });
for (let i = 0; i < 11; i++) click(fx, EV.dots + i * 0.05, { vel: 0.14, bright: 0.35, p: -0.6 + i * 0.12, seed: 40 + i });            // chalk dots
for (let i = 0; i < 5; i++) click(fx, EV.dots + 0.35 + i * 0.06, { vel: 0.1, bright: 0.5, p: 0.5 - i * 0.2, seed: 60 + i });
scribble(EV.arrows, EV.arrows + 0.3, 0.06); sweep(fx, EV.morph + 0.1, { dur: 0.4, vel: 0.12, up: true, seed: 7 }); uiConfirm(fx, EV.morph + 0.2, { vel: 0.14, notes: [81, 88] });
EV.passes.forEach((t) => { thump(t, 0.5); scribble(t - 0.15, t + 0.15, 0.04); });
whooshBy(fx, EV.wipe + 0.15, { dur: 0.4, vel: 0.22, direction: 'lr', low: 300, high: 4000, seed: 5 });
EV.teams.forEach((t, i) => { whooshBy(fx, t, { dur: 0.3, vel: 0.16, direction: i % 2 ? 'rl' : 'lr', low: 400, high: 3800, seed: 20 + i }); impact(fx, t + 0.05, { vel: 0.3, weight: 0.45 }); });
bell(fx, EV.teams[3] + 0.05, 81, 0.12, { decay: 0.8 }); bell(fx, EV.teams[3] + 0.2, 88, 0.1, { decay: 0.8 });
EV.cards.forEach((t, i) => { whooshBy(fx, t + 0.1, { dur: 0.3, vel: 0.16, direction: 'rl', low: 500, high: 4000, seed: 30 + i }); for (let k = 0; k < 9; k++) click(fx, t + 0.02 + k * 0.033, { vel: 0.06, bright: 0.85, seed: 300 + i * 20 + k }); uiConfirm(fx, t + 0.3, { vel: 0.18, notes: [84 + i * 2, 91 + i * 2] }); });
crowd(EV.cards[0] + 0.3, 1.0, 0.07);
for (let i = 0; i < 25; i++) click(fx, EV.clock[0] + i * 0.1, { vel: 0.035, bright: 0.95, p: i % 2 ? 0.3 : -0.3, seed: 500 + i });                   // clock
for (let i = 0; i < 11; i++) bloop(fx, 11.9 + i * 0.04, 0.08, { f0: 900 + i * 70, f1: 1400 + i * 50, p: -0.6 + i * 0.12 });                        // nodes
whooshBy(fx, 13.3, { dur: 0.9, vel: 0.12, direction: 'lr', low: 600, high: 5000, seed: 9 });                                                          // the run
whooshBy(fx, 15.9, { dur: 0.35, vel: 0.24, direction: 'center', low: 200, high: 4000, seed: 31 });
crowd(EV.end, 2.6, 0.12, { attack: 0.05, bright: 0.15 }); impact(fx, EV.end, { vel: 0.85, weight: 0.9 });
impact(fx, EV.freeze, { vel: 0.6, weight: 0.6 }); [69, 76, 81, 84, 88].forEach((m, i) => bell(fx, EV.freeze + 0.03 + i * 0.05, m + 12, 0.1, { p: -0.5 + i * 0.25, decay: 1.4 }));
EV.sweep.forEach((t) => sweep(fx, t + 0.3, { dur: 0.6, vel: 0.1, up: true, seed: 29 }));

// ---------- processing ----------
const pump = (bus, depth, rel = 0.16) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(chords, 0.75); pump(low, 0.5, 0.09); pump(lead, 0.25, 0.08);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(chords, 170); hp(lead, 240); hp(fx, 40);
const music = mk();
drums.mixInto(music, 0.6); low.mixInto(music, 0.3); chords.mixInto(music, 3.2); lead.mixInto(music, 1.6); orch.mixInto(music, 1.25);
const send = mk(); chords.mixInto(send, 0.3); orch.mixInto(send, 0.35); reverb(send, { room: 0.78, damp: 0.4 }).mixInto(music, 0.5);
hp(music, 28);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.7, damp: 0.3 }).mixInto(sfx, 0.45);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.45 ? Math.cos(((t - (DUR - 0.45)) / 0.45) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
// soft-limit before normalising so sparse transients cannot dominate the loudness target (CRAFT 47)
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 0.9);
const lim = (b) => { for (const ch of ['L', 'R']) for (let i = 0; i < b.n; i++) b[ch][i] = Math.tanh(b[ch][i] * 1.6) / 1.6; };
const norm0 = 0.9 / peak(mix); for (const b of [mix]) { for (const ch of ['L', 'R']) for (let i = 0; i < b.n; i++) b[ch][i] *= norm0; lim(b); }
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm * norm0 }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * norm0 * 0.9 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm }); writeWav(join(OUT, 'orch.wav'), orch, { gain: norm * norm0 * 1.25 });
console.log(`film14 score: ${DUR}s 150 BPM A minor orchestral anthem, norm ${norm.toFixed(3)}`);
if (process.env.SCORE_DEBUG) for (const [n, b] of Object.entries({ drums, low, chords, lead, orch, fx })) writeWav(join(OUT, `dbg-${n}.wav`), b, { gain: 1 });
