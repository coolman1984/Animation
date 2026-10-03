// Film 7 score — original, elegant Western underscore. 80 BPM (beat 0.75 s, bar 3 s), 60 bars = 180 s, D major.
// Voices: a modal-synthesis grand piano (inharmonic partials, hammer, damper), a harp (Karplus–Strong pluck), string pads,
// a soft pulse (felt kick + shaker) only in the middle, bells for the logo moments. Very light UI foley on the picture's own
// clicks (./timing.js). Mixed low and smooth; the studio masters it to −18 LUFS. No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, pad, kick, noiseHit, bell, reverb, writeWav, peak, biquad, rng, pan, pluck } from '../lib/audio.mjs';
import { whooshBy, click, uiConfirm } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import { T, BEAT, BAR, DUR } from './timing.js';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film10');
mkdirSync(OUT, { recursive: true });
const N = DUR + 4;
const mk = () => new Bus(N);
const piano = mk(), harp = mk(), strings = mk(), low = mk(), perc = mk(), bells = mk(), fx = mk();

// ---------- grand piano: modal synthesis with a recursive oscillator per partial (cheap, no Math.sin per sample) ----------
function pianoNote(bus, t, midi, dur, vel = 0.5, p = 0) {
  const f0 = mtof(midi), i0 = Math.round(t * SR), B = 0.00035 * Math.pow(2, (midi - 60) / 24), [gl, gr] = pan(p * 0.6 + (midi - 64) / 60);
  const base = 4.2 * Math.pow(0.5, (midi - 45) / 22), rel = 0.32, len = Math.round((dur + rel * 5) * SR);
  const parts = [];
  for (let k = 1; k <= 8; k++) {
    const f = f0 * k * Math.sqrt(1 + B * k * k); if (f > 9000) break;
    const amp = Math.pow(k, -1.25) * (k === 1 ? 1 : 0.55 + 0.6 * vel) * (k === 2 ? 1.1 : 1);
    const w = (2 * Math.PI * f) / SR;
    parts.push({ c: Math.cos(w), s: Math.sin(w), x: 1, y: 0, amp, dec: base / (1 + 0.45 * (k - 1)), w2: (2 * Math.PI * f * 1.0006) / SR, x2: 1, y2: 0 });
    const q = parts[parts.length - 1]; q.c2 = Math.cos(q.w2); q.s2 = Math.sin(q.w2);
  }
  const r = rng(Math.round(t * 1000) + midi * 17), lp = biquad('lp', 2200 + 2400 * vel, 0.7);
  for (let n = 0; n < len; n++) {
    const tt = n / SR, damp = tt > dur ? Math.exp(-(tt - dur) / rel) : 1; let s = 0;
    for (const q of parts) {
      const nx = q.x * q.c - q.y * q.s; q.y = q.x * q.s + q.y * q.c; q.x = nx;              // unison string 1
      const nx2 = q.x2 * q.c2 - q.y2 * q.s2; q.y2 = q.x2 * q.s2 + q.y2 * q.c2; q.x2 = nx2;   // unison string 2 (slow beating)
      s += q.amp * (q.y + 0.6 * q.y2) * Math.exp(-tt / q.dec);
    }
    const hammer = tt < 0.012 ? lp((r() * 2 - 1)) * (1 - tt / 0.012) * 0.25 * vel : 0;
    const v = (s * Math.min(1, tt / 0.0025) * damp * 0.09 + hammer) * vel;
    if (damp < 1e-4) break;
    bus.add(i0 + n, v * gl, v * gr);
  }
}
const chord = (t, notes, dur, vel = 0.32, roll = 0.018) => notes.forEach((m, i) => pianoNote(piano, t + i * roll, m, dur, vel * (i === 0 ? 1 : 0.85), (i / notes.length - 0.5) * 0.8));
const harpArp = (t0, notes, bars = 1, vel = 0.32, step = BEAT / 2) => { const n = Math.round((bars * BAR) / step); for (let i = 0; i < n; i++) { const up = [...notes, ...notes.slice(1, -1).reverse()]; pluck(harp, t0 + i * step, up[i % up.length], vel * (i % 4 === 0 ? 1 : 0.75), { p: (i % 2 ? 0.35 : -0.35), damp: 0.35, decay: 0.9975, bright: 0.45, seed: 31 + i }); } };
const strPad = (t0, notes, bars = 1, vel = 1.0, cutoff = 1500) => pad(strings, t0, notes, bars * BAR + 0.3, vel, { cutoff });
const bassNote = (t0, m, dur, vel = 0.32) => { const i0 = Math.round(t0 * SR), f = mtof(m), len = Math.round((dur + 0.8) * SR); let ph = 0; for (let n = 0; n < len; n++) { const tt = n / SR; ph += (2 * Math.PI * f) / SR; const env = Math.min(1, tt / 0.04) * Math.exp(-tt / 2.6) * (tt > dur ? Math.exp(-(tt - dur) / 0.35) : 1); low.add(i0 + n, (Math.sin(ph) + 0.18 * Math.sin(2 * ph)) * env * vel * 0.35); } };
const shaker = (t, v = 0.022, p = 0.25) => noiseHit(perc, t, { dur: 0.035, vel: v, hp: 7500, p, attack: 0.006, seed: Math.round(t * 977) });

// D major palette (MIDI): Dmaj9, Bm9, Gmaj7(9), A6sus → A, Em9, F#m7
const CHD = {
  D: { v: [62, 66, 69, 73, 76], root: 38, arp: [62, 66, 69, 73, 74, 78] }, Bm: { v: [59, 62, 66, 69, 73], root: 35, arp: [59, 62, 66, 69, 71, 74] },
  G: { v: [55, 59, 62, 66, 69], root: 31, arp: [55, 59, 62, 66, 67, 71] }, A: { v: [57, 61, 64, 66, 69], root: 33, arp: [57, 61, 64, 66, 69, 73] },
  Asus: { v: [57, 62, 64, 69, 71], root: 33, arp: [57, 62, 64, 69, 71, 74] }, Em: { v: [55, 59, 62, 66, 67], root: 40, arp: [52, 55, 59, 62, 66, 67] },
  Fsm: { v: [57, 61, 64, 66, 69], root: 42, arp: [54, 57, 61, 64, 66, 69] },
};
const PROG_A = ['D', 'Bm', 'G', 'Asus'], PROG_B = ['Bm', 'G', 'Em', 'A'];
const barAt = (b) => b * BAR;
// main piano theme (beats from phrase start, midi, beats long) — a calm rising line that answers itself
const THEME = [[0, 78, 1.5], [1.5, 76, 0.5], [2, 74, 1], [3, 73, 1], [4, 74, 2], [6, 71, 1], [7, 73, 1],
  [8, 74, 1.5], [9.5, 76, 0.5], [10, 78, 1], [11, 81, 1], [12, 79, 2], [14, 78, 1], [15, 76, 1]];
const playTheme = (t0, vel = 0.4, octave = 0) => THEME.forEach(([b, m, d]) => pianoNote(piano, t0 + b * BEAT, m + octave, d * BEAT * 0.95, vel * (b % 4 === 0 ? 1 : 0.85), 0.15));

// ---------- 0–12 · opening: piano alone, strings breathe in ----------
PROG_A.forEach((c, i) => { chord(barAt(i), CHD[c].v.slice(0, 4).map((m) => m - 12), BAR * 0.95, 0.24); bassNote(barAt(i), CHD[c].root + 12, BAR * 0.9, 0.2); });
strPad(barAt(1), CHD.Bm.v, 3, 0.7, 1100);
[[T.land, 81], [2.4, 78], [3.0, 76], [3.6, 74], [5.1, 73], [6.0, 74], [7.6, 76], [8.4, 78]].forEach(([t, m], i) => pianoNote(piano, t, m, 1.2, 0.34 - i * 0.012, 0.3));
// ---------- 12–36 · the daily problem: harp arpeggios, a gentle B-minor tension ----------
for (let b = 4; b < 12; b++) {
  const c = CHD[PROG_B[(b - 4) % 4]];
  harpArp(barAt(b), c.arp, 1, 0.24); strPad(barAt(b), c.v, 1, 0.9, 1300); bassNote(barAt(b), c.root + 12, BAR * 0.95, 0.24);
  if (b % 2 === 0) chord(barAt(b) + 2 * BEAT, c.v.slice(1, 4), BEAT * 1.5, 0.18);
}
T.cards.forEach((t, i) => pianoNote(piano, t, [81, 78, 83, 81, 76, 78, 74][i], 0.8, 0.22, 0.4)); // a soft note on every window that arrives
// ---------- 36–48 · the turn: Em → Asus → A, then the chord opens on the snap ----------
chord(barAt(12), CHD.Em.v.map((m) => m - 12), BAR, 0.24); strPad(barAt(12), CHD.Em.v, 1, 1.0, 1200); bassNote(barAt(12), CHD.Em.root, BAR, 0.26);
chord(T.snap, CHD.G.v, BAR * 1.6, 0.3); strPad(T.snap, CHD.G.v, 1.6, 1.15, 1800); bassNote(T.snap, CHD.G.root + 12, BAR * 1.6, 0.3);
[86, 83, 81, 78].forEach((m, i) => bell(bells, T.snap + 0.05 + i * 0.09, m, 0.07, { p: -0.4 + i * 0.25, decay: 1.4 }));
chord(barAt(15), CHD.Asus.v, BAR, 0.26); strPad(barAt(15), CHD.A.v, 1, 1.1, 1700); bassNote(barAt(15), CHD.A.root + 12, BAR, 0.28);
harpArp(barAt(14) + 1.5, CHD.Asus.arp, 1.5, 0.2, BEAT / 3);
// ---------- 48–84 · Pixel Plus + Samsung: the theme, a soft pulse appears ----------
for (let b = 16; b < 28; b++) {
  const c = CHD[PROG_A[(b - 16) % 4]], t0 = barAt(b);
  strPad(t0, c.v, 1, 1.0, b >= 20 ? 1900 : 1600); bassNote(t0, c.root + 12, BAR * 0.95, 0.3);
  chord(t0, c.v.slice(0, 3).map((m) => m - 12), BAR * 0.9, 0.17);
  for (let k = 0; k < 4; k++) { if (k % 2 === 0) kick(perc, t0 + k * BEAT, 0.16); shaker(t0 + k * BEAT + BEAT / 2, 0.02, k % 2 ? 0.3 : -0.3); }
  if (b >= 20) harpArp(t0, c.arp, 1, 0.16);
}
playTheme(barAt(16), 0.38); playTheme(barAt(20), 0.36); playTheme(barAt(24), 0.34, 12);
[[T.burst1, [74, 78, 81, 86]], [T.tvLabel, [86, 90]], [T.phoneLabel, [88, 93]]].forEach(([t, ms]) => ms.forEach((m, i) => bell(bells, t + i * 0.07, m, 0.08, { p: -0.3 + i * 0.2, decay: 1.6 })));
for (let i = 0; i < 12; i++) bell(bells, T.ribbon + i * 0.28, [74, 76, 78, 81, 83, 86][i % 6] + (i >= 6 ? 12 : 0), 0.035, { p: 0.6 - i * 0.1, decay: 0.8 });
// ---------- 84–144 · the projects: steady pulse, a different colour per project ----------
for (let b = 28; b < 48; b++) {
  const pi = Math.floor((b - 28) / 5), inBar = (b - 28) % 5, c = CHD[inBar === 4 ? 'Asus' : PROG_A[inBar]], t0 = barAt(b);
  strPad(t0, c.v, 1, 0.95, 1700 + pi * 100); bassNote(t0, c.root + 12, BAR * 0.95, 0.3);
  for (let k = 0; k < 4; k++) { if (k % 2 === 0) kick(perc, t0 + k * BEAT, 0.18); for (const e of [0, 0.5]) shaker(t0 + (k + e) * BEAT, e ? 0.014 : 0.022, e ? 0.35 : -0.35); }
  if (pi === 0) for (let k = 0; k < 8; k++) pianoNote(piano, t0 + k * BEAT / 2, c.arp[(k * 2) % c.arp.length] + 12, BEAT * 0.4, 0.16, k % 2 ? 0.4 : -0.4);
  if (pi === 1) harpArp(t0, c.arp, 1, 0.2, BEAT / 3);
  if (pi === 2) { harpArp(t0, c.arp, 1, 0.14); for (let k = 0; k < 4; k++) bell(bells, t0 + k * BEAT, c.arp[(k + 2) % c.arp.length] + 12, 0.04, { p: k % 2 ? 0.5 : -0.5, decay: 1.0 }); }
  if (pi === 3) { harpArp(t0, c.arp, 1, 0.18); chord(t0, c.v.slice(1, 4), BAR * 0.9, 0.16); }
}
playTheme(barAt(29), 0.3); playTheme(barAt(39), 0.3, 12);
// ---------- 144–162 · results: fullest, strings high, the theme an octave up ----------
for (let b = 48; b < 54; b++) {
  const c = CHD[[...PROG_A, 'Em', 'A'][b - 48]], t0 = barAt(b);
  strPad(t0, c.v, 1, 1.15, 2300); strPad(t0, c.v.map((m) => m + 12), 1, 0.45, 2600); bassNote(t0, c.root + 12, BAR * 0.95, 0.32);
  chord(t0, c.v.slice(0, 4).map((m) => m - 12), BAR * 0.9, 0.2); harpArp(t0, c.arp, 1, 0.2);
  for (let k = 0; k < 4; k++) { kick(perc, t0 + k * BEAT, k % 2 ? 0.12 : 0.2); for (const e of [0, 0.5]) shaker(t0 + (k + e) * BEAT, e ? 0.014 : 0.024, e ? 0.35 : -0.35); }
}
playTheme(barAt(48), 0.36, 12);
T.results.forEach((t, i) => { [74, 78, 81].forEach((m, k) => bell(bells, t + k * 0.06, m + 12 * (i % 2), 0.07, { p: -0.3 + k * 0.3, decay: 1.4 })); });
// ---------- 162–171 · method: piano alone, one note per step ----------
[['G', 54], ['A', 55], ['Bm', 56]].forEach(([c, b]) => { chord(barAt(b), CHD[c].v.slice(0, 4).map((m) => m - 12), BAR * 0.95, 0.2); strPad(barAt(b), CHD[c].v, 1, 0.75, 1300); bassNote(barAt(b), CHD[c].root + 12, BAR * 0.95, 0.22); });
T.methodNodes.forEach((t, i) => pianoNote(piano, t, [74, 76, 78, 81, 83][i], 1.4, 0.34, 0.2));
// ---------- 171–180 · finale: G → A → Dmaj9, bells for the pixels, the last chord rings out ----------
chord(barAt(57), CHD.G.v, BAR, 0.26); strPad(barAt(57), CHD.G.v, 1, 1.0, 1800); bassNote(barAt(57), CHD.G.root + 12, BAR, 0.28);
chord(T.burst2 - 0.02, CHD.Asus.v, 0.9, 0.24); bassNote(T.burst2, CHD.A.root + 12, 1.0, 0.28);
chord(barAt(58) + 0.9, CHD.A.v, 1.2, 0.26);
{ const r = rng(77), pent = [74, 76, 78, 81, 83, 86, 88, 90]; for (let i = 0; i < 40; i++) bell(bells, T.burst2 + 0.05 + Math.pow(r(), 0.8) * 1.0, pent[Math.floor(r() * pent.length)] + 12, 0.018 + r() * 0.02, { p: r() * 2 - 1, decay: 0.45 }); }
chord(barAt(59), [50, 57, 62, 66, 69, 73, 76], 2.9, 0.3, 0.03); strPad(barAt(59), CHD.D.v, 1, 1.1, 1900); bassNote(barAt(59), CHD.D.root, 2.9, 0.34);
[86, 90, 93, 98].forEach((m, i) => bell(bells, barAt(59) + 0.05 + i * 0.08, m, 0.06, { p: -0.3 + i * 0.2, decay: 2.4 }));
// ---------- light UI foley on the picture's clicks (very low) ----------
for (const t of [T.p1Execute, T.p1Export, T.p2Sync, T.p3Filter, T.p4Send, T.ctaClick]) click(fx, t, { vel: 0.12, bright: 0.6 });
uiConfirm(fx, T.p1Export + 0.6, { vel: 0.08, notes: [86, 93] }); uiConfirm(fx, T.p2Sync + 1.4, { vel: 0.07, notes: [85, 90] });
{ const r = rng(55); for (let t = T.p1Type; t < T.p1Type + 0.7; t += 0.17) click(fx, t + r() * 0.01, { vel: 0.03, bright: 0.9 }); for (let t = T.p4Type; t < T.p4Type + 1.6; t += 0.13) click(fx, t + r() * 0.02, { vel: 0.025, bright: 0.9 }); }
for (const [t, d] of [[11.5, 'lr'], [T.snap - 0.2, 'center'], [T.wipe[0], 'center'], [T.dive[1] - 0.6, 'center'], [99, 'rl'], [114, 'lr'], [129, 'rl'], [T.implode2, 'center'], [170.2, 'center']]) whooshBy(fx, t, { dur: 0.6, vel: 0.06, direction: d, low: 250, high: 2600, seed: Math.round(t) });
placeCues(fx, plan.cues, { gain: 0.5 });

// ---------- processing ----------
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
const lp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('lp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(strings, 170); lp(strings, 6500); hp(harp, 160); hp(piano, 75); hp(bells, 300); hp(perc, 45); hp(fx, 80); hp(low, 45);
const music = mk();
piano.mixInto(music, 1.1); harp.mixInto(music, 0.9); strings.mixInto(music, 0.85); low.mixInto(music, 0.45); perc.mixInto(music, 0.4); bells.mixInto(music, 0.85);
const send = mk(); piano.mixInto(send, 0.55); harp.mixInto(send, 0.6); strings.mixInto(send, 0.3); bells.mixInto(send, 0.9);
reverb(send, { room: 0.88, damp: 0.42 }).mixInto(music, 0.8);
hp(music, 38);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.75, damp: 0.35 }).mixInto(sfx, 0.4);
// gentle bus compression (slow RMS levelling) keeps the long-form loudness range modest (LRA gate < 8 LU)
const level = (bus, target = 0.12, win = 1.5) => { const n = Math.round(win * SR); const env = new Float32Array(bus.n); const cum = new Float64Array(bus.n + 1);
  for (let i = 0; i < bus.n; i++) cum[i + 1] = cum[i] + bus.L[i] * bus.L[i] + bus.R[i] * bus.R[i];
  for (let i = 0; i < bus.n; i++) { const a = Math.max(0, i + 1 - n); env[i] = Math.sqrt((cum[i + 1] - cum[a]) / (i + 1 - a)); }
  for (let i = 0; i < bus.n; i++) { const g = Math.min(2.2, Math.max(0.55, Math.pow(target / Math.max(env[Math.min(bus.n - 1, i + (n >> 1))], 1e-5), 0.45))); bus.L[i] *= g; bus.R[i] *= g; } };
level(music);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 1.2 ? Math.cos(((t - (DUR - 1.2)) / 1.2) * Math.PI / 2) : t < 0.05 ? t / 0.05 : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 0.9);
const norm = 0.45 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 0.9 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film10 score: ${DUR}s, norm ${norm.toFixed(3)}`);
