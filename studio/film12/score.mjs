// Film 12 score: 115.2 BPM (bar = 2.0833 s, 12 bars = 25.000 s). Original, synthesised in code — no samples.
// Structure follows the picture: bar 0 hook (arp + riser into the ball), bars 1–2 pitch groove, bar 3 players,
// bar 4 PL stab break, bar 5 bar-race ticks, bar 6 stop-time (manga), bars 7–8 data/host build, bar 9 riser +
// a clap roll into the title lock at 20.833 s, bars 10–11 resolution. Also writes data/spectrum.js: 32 band
// levels per frame measured from the final mix, so the on-screen equalizer is the real music, not a loop.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { SCALE, MUSIC_BEAT, FIRST_HIT, LEAD } from './timing.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, rng, pluck, bass, pad, kick, noiseHit, whoosh, bell, reverb, writeWav, peak, biquad, mtof, pan } from '../lib/audio.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film12');
mkdirSync(OUT, { recursive: true }); mkdirSync(join(HERE, 'data'), { recursive: true });
const DUR = 25, BPM = 115.2, BEAT = 60 / BPM, BAR = 4 * BEAT;
const bt = (bar, beat = 0) => (bar * 4 + beat) * BEAT;
const B = () => new Bus(DUR + 2);
const kicks = B(), clap = B(), hats = B(), low = B(), stabs = B(), pads = B(), lead = B(), fx = B();
const kickTimes = [];

// ---------- instruments local to this score ----------
function stab(bus, t, midis, dur, vel = 0.3, { cut = 2600, p = 0 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round((dur + 0.25) * SR), [gl, gr] = pan(p);
  const voices = [];
  for (const m of midis) for (const c of [-14, -7, 0, 6, 13]) voices.push({ f: mtof(m) * Math.pow(2, c / 1200), ph: (m * 0.173 + c * 0.031) % 1 });
  const lp = biquad('lp', cut, 0.8);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const env = Math.min(1, tt / 0.004) * (tt < dur ? Math.exp(-tt / (dur * 0.7)) : Math.exp(-1 / 0.7 - (tt - dur) / 0.06));
    let s = 0;
    for (const v of voices) { v.ph = (v.ph + v.f / SR) % 1; s += 2 * v.ph - 1; }
    s = lp(s / Math.sqrt(voices.length)) * env * vel * 0.5;
    bus.add(i0 + k, s * gl, s * gr);
  }
}
function clapHit(bus, t, vel = 0.5) {
  for (const [dt, g] of [[0, 0.7], [0.011, 0.8], [0.024, 1]]) noiseHit(bus, t + dt, { dur: 0.012 + dt, vel: vel * g, bp: 1350, q: 0.9, seed: 5 });
  noiseHit(bus, t + 0.03, { dur: 0.11, vel: vel * 0.55, bp: 2100, q: 0.7, seed: 6 });
}
function impact(bus, t, vel = 1, { boom = 0.8 } = {}) {
  const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * boom * 2; k++) {
    const tt = k / SR, f = 32 + 90 * Math.exp(-tt / 0.07);
    ph += 2 * Math.PI * f / SR;
    bus.add(i0 + k, Math.sin(ph) * Math.exp(-tt / (boom * 0.45)) * vel * 0.8);
  }
  noiseHit(bus, t, { dur: 0.32, vel: vel * 0.32, hp: 2800, seed: 31 });
  noiseHit(bus, t, { dur: 0.06, vel: vel * 0.4, bp: 900, q: 0.6, seed: 32 });
}
function riser(bus, t, dur, vel = 0.3, { f0 = 200, f1 = 9000, seed = 3 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), r = rng(seed);
  let hpf = biquad('hp', f0, 0.7), ph = 0;
  for (let k = 0; k < len; k++) {
    const u = k / len;
    if (k % 128 === 0) hpf = biquad('hp', f0 * Math.pow(f1 / f0, u * u), 0.7);
    ph += 2 * Math.PI * (180 + 1800 * u * u) / SR;
    const env = u ** 2.2;
    const s = (hpf(r() * 2 - 1) * 0.8 + Math.sin(ph) * 0.18) * env * vel;
    const [gl, gr] = pan(Math.sin(u * 9) * 0.5);
    bus.add(i0 + k, s * gl, s * gr);
  }
}
// A swarm of tiny plastic/cube clicks inside a window: the sound of the voxels assembling or scattering.
function clatter(bus, t, dur, n, vel = 0.25, seed = 1, { up = false } = {}) {
  const r = rng(seed * 101);
  for (let i = 0; i < n; i++) {
    const u = r();
    const tt = t + dur * (up ? Math.pow(u, 0.5) : u);
    noiseHit(bus, tt, { dur: 0.004 + r() * 0.01, vel: vel * (0.35 + r() * 0.65), bp: 2400 + r() * 5200, q: 3, p: (r() - 0.5) * 1.6, seed: i + seed });
  }
}
const duck = (bus, amount = 0.62, rel = 0.16) => {
  const ks = kickTimes.map((x) => Math.round(x * SR)).sort((a, b) => a - b); let j = 0;
  for (let i = 0; i < bus.n; i++) {
    while (j + 1 < ks.length && ks[j + 1] <= i) j++;
    const age = ks.length && ks[j] <= i ? (i - ks[j]) / SR : 9;
    const g = 1 - amount * Math.exp(-age / rel);
    bus.L[i] *= g; bus.R[i] *= g;
  }
};

// ---------- harmony ----------
const CH = {
  Am: { v: [57, 60, 64], root: 33 }, F: { v: [57, 60, 65], root: 29 }, C: { v: [55, 60, 64], root: 36 }, G: { v: [55, 59, 62], root: 31 },
  Am9: { v: [57, 60, 64, 71], root: 33 },
};
const prog = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Am9', 'Am9'];

// ---------- drums ----------
for (let b = 2; b < 4 * 10 + 1; b++) {                                    // kick on every beat from 1.04 s to just before the title lock
  if (b === 27) continue;                                                  // bar 6: the last beat drops out before the 14.58 s hit
  const t = b * BEAT;
  kick(kicks, t, b % 4 === 0 ? 0.95 : 0.8); kickTimes.push(t);
}
kick(kicks, bt(10), 1.5); kickTimes.push(bt(10));
for (let b = 0; b < 12; b++) {
  const t0 = bt(b);
  if (b >= 1 && b < 10) for (const beat of [1, 3]) { if (b === 6 && beat === 3) continue; clapHit(clap, t0 + beat * BEAT, 0.42); }
  if (b >= 1 && b < 10) for (let s = 0; s < 16; s++) {                       // 16th hats, open on the off-beat
    if (b === 6 && s >= 12) continue;
    const t = t0 + s * BEAT / 4, acc = s % 4 === 2 ? 1 : s % 2 ? 0.45 : 0.7;
    noiseHit(hats, t + (s % 2 ? 0.006 : 0), { dur: s % 4 === 2 ? 0.07 : 0.018, vel: 0.07 * acc, hp: 7800, p: s % 2 ? 0.35 : -0.35, seed: 20 + s });
  }
  if (b === 0) for (let s = 8; s < 16; s++) noiseHit(hats, t0 + s * BEAT / 4, { dur: 0.016, vel: 0.04 + s * 0.003, hp: 8200, p: (s % 2) - 0.5, seed: 80 + s });
}
// clap roll into the title lock (bar 9): accelerating hits that stop on the bar line
for (let i = 0; i < 26; i++) {
  const u = i / 26, t = bt(9) + BAR * (1 - Math.pow(1 - u, 1.9)) * 0.985;
  clapHit(clap, t, 0.14 + 0.36 * u);
}

// ---------- bass / chords / lead ----------
prog.forEach((name, bar) => {
  const c = CH[name], t0 = bt(bar);
  if (bar === 0) {                                                         // hook: filtered 16th arp on Am
    const notes = [57, 64, 69, 72, 76, 72, 69, 64];
    for (let s = 0; s < 16; s++) pluck(lead, t0 + s * BEAT / 4, notes[s % 8] + 12, 0.22 + s * 0.012, { p: Math.sin(s) * 0.5, seed: s + 3, bright: 0.35 + s * 0.03 });
    pad(pads, t0, [45, 52, 57, 60], BAR + 0.3, 1.1, { cutoff: 700 }); return;
  }
  if (bar >= 10) {                                                         // resolution: rolled Am9, slow arp
    c.v.forEach((m, i) => stab(stabs, t0 + i * 0.03, [m + 12], BAR * (bar === 10 ? 1.9 : 3), 0.18, { cut: 3400, p: -0.3 + i * 0.2 }));
    if (bar === 10) { bass(low, t0, 33, BAR * 0.95, 0.7); bass(low, t0 + BAR, 33, BAR * 1.9, 0.6); impact(fx, t0, 2.1, { boom: 1.5 }); }
    pad(pads, t0, [45, 52, 57, 60, 64], BAR + 0.5, 2.0, { cutoff: 1600 });
    const arp = [69, 72, 76, 83, 76, 72];
    for (let s = 0; s < 8; s++) pluck(lead, t0 + s * BEAT / 2, arp[s % 6], 0.3 - s * 0.012, { p: ((s % 3) - 1) * 0.4, seed: 70 + s + bar, bright: 0.5 });
    return;
  }
  const pat = [[0, 1.5], [1.5, 0.5], [2, 1], [3.5, 0.5]];                 // root on the beat + syncopated pops
  for (const [b, d] of pat) { if (bar === 6 && b >= 3) continue; bass(low, t0 + b * BEAT, c.root + (b === 1.5 ? 12 : b === 3.5 ? 7 : 0), d * BEAT * 0.95, 0.62); }
  for (const b of [0.5, 1.5, 2.5, 3.5]) if (!(bar === 6 && b > 3)) stab(stabs, t0 + b * BEAT, c.v.map((m) => m + 12), BEAT * 0.26, bar >= 4 ? 0.3 : 0.22, { cut: bar >= 3 ? 3200 : 2200, p: b % 2 ? 0.2 : -0.2 });
  pad(pads, t0, c.v.map((m) => m - 12), BAR + 0.35, bar >= 3 ? 1.5 : 1.2, { cutoff: 1100 });
});
// stop-time accents in bar 6 (manga) exactly on the picture's jolts
for (const b of [0, 0.5, 1, 1.5, 2.5, 3.25]) stab(stabs, bt(6) + b * BEAT, [57, 60, 64, 69], 0.1, 0.34, { cut: 3800 });
// lead hook: bars 3–4 and 7 (A minor pentatonic, two bars)
const hook = [[0, 76], [0.5, 79], [1, 81], [2, 79], [2.5, 76], [3, 74], [4, 72], [4.5, 76], [5, 79], [6, 76], [6.5, 74], [7, 72]];
for (const bar of [3, 7]) for (const [b, m] of hook) pluck(lead, bt(bar) + b * BEAT, m, 0.42, { p: 0.15, seed: bar * 5 + Math.round(b * 3), bright: 0.55 });
for (const [b, m] of hook) pluck(lead, bt(4) + b * BEAT, m + 12, 0.18, { p: -0.3, seed: 90 + Math.round(b * 3), bright: 0.7 });

// ---------- sound design locked to the picture (times from film.js) ----------
const SC = [2.0833, 6.25, 8.3333, 10.4167, 12.5, 14.5833, 16.6667, 18.75];
riser(fx, 0.15, 0.9, 0.22, { f0: 300, f1: 6000, seed: 1 });
clatter(fx, 0.12, 0.9, 38, 0.26, 1, { up: true });                                                // cubes fly into the ball
impact(fx, bt(0, 2), 1.5, { boom: 1.0 });                                                        // ball lands (1.04 s)
for (const [i, t] of SC.entries()) {
  if (i > 0) impact(fx, t, i === 7 ? 0.7 : 0.6, { boom: 0.5 });
  clatter(fx, t - 0.42, 0.42, 26, 0.22, 10 + i);                                                  // outgoing cubes burst
  clatter(fx, t, 0.5, 32, 0.2, 40 + i, { up: true });                                              // incoming cubes assemble
  whoosh(fx, t - 0.34, 0.5, 0.1, { f0: 400, f1: 5200, p0: -0.8 + (i % 2) * 1.6, p1: 0.8 - (i % 2) * 1.6, seed: 100 + i, q: 0.8 });
}
riser(fx, bt(8), BAR * 2 - 0.02, 0.34, { f0: 220, f1: 11000, seed: 9 });                          // 16.67 → 20.83 build
for (let i = 0; i < 12; i++) noiseHit(fx, 11.0 + i * 0.085 + i * i * 0.0011, { dur: 0.012, vel: 0.1 + i * 0.01, bp: 5200 + i * 380, q: 5, p: 0.3, seed: 200 + i }); // bar-race ticks
for (const t of [12.5, 12.5 + BEAT * 0.5, 12.5 + BEAT, 12.5 + BEAT * 1.5, 12.5 + BEAT * 2.5, 12.5 + BEAT * 3.25]) noiseHit(fx, t, { dur: 0.02, vel: 0.16, bp: 3200, q: 2, seed: 61 });
[81, 88, 93].forEach((m, i) => bell(fx, bt(10) + 0.04 + i * 0.07, m, 0.2, { p: -0.4 + i * 0.4, decay: 1.5 }));
[93, 100].forEach((m, i) => bell(fx, 22.4 + i * 0.08, m, 0.13, { p: 0.3 - i * 0.6, decay: 0.9 }));      // CTA pop
clatter(fx, 19.0, 1.6, 70, 0.22, 77, { up: true });                                                // title cubes assemble

// ---------- mix ----------
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
duck(low, 0.7, 0.17); duck(stabs, 0.55, 0.13); duck(pads, 0.5, 0.2);
hp(stabs, 160); hp(pads, 80); hp(lead, 180); hp(fx, 45); hp(hats, 6000); hp(clap, 250);
const music = new Bus(DUR + 2);
kicks.mixInto(music, 1.0); clap.mixInto(music, 0.9); hats.mixInto(music, 1); low.mixInto(music, 0.95); stabs.mixInto(music, 0.9); pads.mixInto(music, 0.95); lead.mixInto(music, 1.0);
const send = new Bus(DUR + 2); stabs.mixInto(send, 0.35); lead.mixInto(send, 0.6); pads.mixInto(send, 0.35); clap.mixInto(send, 0.35); fx.mixInto(send, 0.25);
reverb(send, { room: 0.8, damp: 0.45 }).mixInto(music, 0.8);
hp(music, 28);
// Owner order 2026-10-08: the reference reel's own music, untouched (original tempo and pitch). The picture follows it
// (timing.js). Source beats 0–23 play, then the track repeats from its start exactly on the 12.5 s (film-time) flash cut.
// It replaces the synthesised bed at the same RMS, so the effects and the mix chain keep their balance.
const REF = join(HERE, 'source', 'reference-reel.mp4');
if (existsSync(REF)) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', REF, '-vn', '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('reference music decode failed: ' + r.stderr);
  const f = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length)), n = f.length / 2;
  const first = FIRST_HIT - LEAD, PASS = 24 * MUSIC_BEAT, XF = 0.03;          // first drum hit lands 12 ms after t = 0
  const at = (t) => { const i = Math.round((t + first) * SR); return i >= 0 && i < n ? i : -1; };
  const rms = (b) => { let q = 0; for (let i = 0; i < b.n; i++) q += b.L[i] * b.L[i] + b.R[i] * b.R[i]; return Math.sqrt(q / (2 * b.n)); };
  const target = rms(music), ref = new Bus(DUR + 2);
  for (let i = 0; i < ref.n; i++) {
    const t = i / SR, j = PASS - 0.012 - XF;                                       // crossfade ends just before the repeat's first hit
    const g2 = Math.min(1, Math.max(0, (t - j) / XF)), g1 = 1 - g2;
    let L = 0, R = 0;
    if (g1 > 0) { const k = at(t); if (k >= 0) { L += f[2 * k] * g1; R += f[2 * k + 1] * g1; } }
    if (g2 > 0) { const k = at(t - PASS); if (k >= 0) { L += f[2 * k] * g2; R += f[2 * k + 1] * g2; } }
    ref.L[i] = L; ref.R[i] = R;
  }
  const g = target / (rms(ref) + 1e-9);
  for (let i = 0; i < music.n; i++) { music.L[i] = ref.L[i] * g; music.R[i] = ref.R[i] * g; }
  console.log(`music: reference reel at its own tempo, repeat at ${PASS.toFixed(3)} s, level ×${g.toFixed(3)}`);
}
const sfx = new Bus(DUR + 2);
for (let i = 0; i < sfx.n; i++) { const x = i * SCALE, k = Math.floor(x), u = x - k; if (k + 1 >= fx.n) break; sfx.L[i] = fx.L[k] * (1 - u) + fx.L[k + 1] * u; sfx.R[i] = fx.R[k] * (1 - u) + fx.R[k + 1] * u; } // film time → real time
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR; const g = t >= DUR ? 0 : t > DUR - 0.5 ? Math.cos(((t - (DUR - 0.5)) / 0.5) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 0.9);
// lookahead peak limiter (±3 ms window, 90 ms release) so impacts/kicks do not dominate the true peak, then a gentle soft clip
function limiter(bus, thr, rel = 0.09, look = 0.003) {
  const n = bus.n, w = Math.round(look * SR), tgt = new Float32Array(n), gmin = new Float32Array(n);
  for (let i = 0; i < n; i++) tgt[i] = Math.min(1, thr / (Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i])) + 1e-9));
  // sliding minimum (monotone deque)
  const dq = new Int32Array(n); let h = 0, t = 0;
  for (let i = 0; i < n + w; i++) {
    if (i < n) { while (t > h && tgt[dq[t - 1]] >= tgt[i]) t--; dq[t++] = i; }
    while (dq[h] < i - 2 * w) h++;
    const o = i - w; if (o >= 0 && o < n) gmin[o] = tgt[dq[h]];
  }
  const k = 1 - Math.exp(-1 / (rel * SR)); let g = 1;
  for (let i = 0; i < n; i++) { g = Math.min(gmin[i], g + (1 - g) * k); bus.L[i] *= g; bus.R[i] *= g; }
}
limiter(mix, 0.42);
// the title lock must be the biggest moment: everything else sits ~2 dB lower, the lock window (20.75–21.4 s) keeps full level
const ss = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
for (let i = 0; i < mix.n; i++) { const t = (i / SR) * SCALE, k = ss((t - 20.7) / 0.1) * (1 - ss((t - 21.0) / 0.5)), g = 0.78 + 0.22 * k; mix.L[i] *= g; mix.R[i] *= g; }
for (let i = 0; i < mix.n; i++) { mix.L[i] = Math.tanh(mix.L[i] * 1.5) / 1.5; mix.R[i] = Math.tanh(mix.R[i] * 1.5) / 1.5; }
const norm = 0.55 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });

// ---------- spectrum for the on-screen equalizer ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
const FPS = 30, NB = 32, N = 2048, frames = DUR * FPS, edges = Array.from({ length: NB + 1 }, (_, i) => 50 * Math.pow(12000 / 50, i / NB));
const raw = [];
for (let f = 0; f < frames; f++) {
  const c = Math.round((f / FPS) * SR), re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) { const k = c - N / 2 + i, w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N); re[i] = k >= 0 && k < mix.n ? 0.5 * (mix.L[k] + mix.R[k]) * w : 0; }
  fft(re, im);
  const row = [];
  for (let b = 0; b < NB; b++) {
    const a = Math.max(1, Math.floor(edges[b] * N / SR)), z = Math.max(a + 1, Math.floor(edges[b + 1] * N / SR));
    let s = 0; for (let k = a; k < z; k++) s += re[k] * re[k] + im[k] * im[k];
    row.push(10 * Math.log10(s / (z - a) + 1e-12));
  }
  raw.push(row);
}
const q = (arr, p) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length * p)];
const lo = Array.from({ length: NB }, (_, b) => q(raw.map((r) => r[b]), 0.08)), hi = Array.from({ length: NB }, (_, b) => q(raw.map((r) => r[b]), 0.97));
const data = raw.map((r, f) => r.map((v, b) => {
  const lvl = Math.min(1, Math.max(0, (v - lo[b]) / (hi[b] - lo[b] + 1e-6)));
  return Math.round(255 * lvl * (f / FPS > DUR - 0.4 ? Math.max(0, (DUR - f / FPS) / 0.4) : 1));
}));
writeFileSync(join(HERE, 'data', 'spectrum.js'), `// Generated by film12/score.mjs from the final mix: ${NB} bands x ${frames} frames (30 fps), 0..255.\nexport default { fps: ${FPS}, bands: ${NB}, data: ${JSON.stringify(data)} };\n`);
console.log(`film12 score: ${DUR}s @ ${BPM} BPM, norm ${norm.toFixed(3)}, spectrum ${frames}x${NB}`);
