// Film 3 score: 96 BPM, 10 bars = 25.0 s exactly. Warm keys, light beat, soft bass; quick opening,
// lift at the climax (bars 6–7, 15–20 s), complete cadence landing at 22.5 s and ringing out by 25 s.
// Generated in code (lib/audio.mjs) — no samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, rhodes, pluck, bass, pad, kick, noiseHit, ice, whoosh, bell, reverb, writeWav, peak, biquad } from '../lib/audio.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film3');
mkdirSync(OUT, { recursive: true });
const DUR = 25, BEAT = 60 / 96, BAR = 4 * BEAT;
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;

const CH = {
  Em9: { v: [55, 59, 62, 66], root: 40 }, A13: { v: [55, 61, 66, 71], root: 45 }, Dmaj9: { v: [54, 57, 61, 64], root: 38 },
  Bm9: { v: [50, 54, 57, 61], root: 47 }, Gmaj9: { v: [59, 62, 66, 69], root: 43 }, D69: { v: [54, 59, 64, 69], root: 38 },
};
const prog = ['Em9', 'A13', 'Dmaj9', 'Bm9', 'Em9', 'A13', 'Dmaj9', 'Bm9', 'Gmaj9', 'D69'];
const keys = new Bus(DUR + 2), low = new Bus(DUR + 2), drums = new Bus(DUR + 2), lead = new Bus(DUR + 2), pads = new Bus(DUR + 2), fx = new Bus(DUR + 2);

prog.forEach((name, bar) => {
  const c = CH[name], t0 = bt(bar);
  if (bar === 9) { // final chord, rolled, rings to the end
    c.v.forEach((m, i) => rhodes(keys, t0 + i * 0.04, m, 2.3, 0.42, { p: -0.3 + i * 0.2 }));
    bass(low, t0, c.root, 2.2, 0.55); pad(pads, t0, [50, 57, 64, 69], 2.2, 0.32); return;
  }
  if (bar === 8) { // Gmaj9 → A13 turnaround, half bar each
    CH.Gmaj9.v.forEach((m, i) => rhodes(keys, t0 + i * 0.01, m, BEAT * 1.8, 0.36, { p: -0.3 + i * 0.2 }));
    CH.A13.v.forEach((m, i) => rhodes(keys, t0 + 2 * BEAT + i * 0.01, m, BEAT * 1.8, 0.38, { p: -0.3 + i * 0.2 }));
    bass(low, t0, 43, BEAT * 1.8, 0.55); bass(low, t0 + 2 * BEAT, 45, BEAT * 1.8, 0.55);
    pad(pads, t0, [55, 59, 66], BAR, 0.28); return;
  }
  if (bar === 0) { // opening: one sustained, rolled chord carries the hook (no dip before bar 2)
    c.v.forEach((m, i) => rhodes(keys, t0 + i * 0.03, m, BAR * 0.98, 0.38, { p: -0.3 + i * 0.2 }));
    c.v.forEach((m, i) => rhodes(keys, t0 + 3 * BEAT + i * 0.008, m, 0.6 * BEAT, 0.22, { p: -0.3 + i * 0.2 }));
    pad(pads, t0, c.v.map((m) => m - 12).slice(1), BAR, 0.3); return;
  }
  // Keys: chord on 1, short re-strikes on the and-of-2 and 4 (light syncopation)
  for (const [b, d, v] of [[0, 1.4, 0.36], [1.5, 0.45, 0.26], [3, 0.8, 0.3]]) c.v.forEach((m, i) => rhodes(keys, t0 + b * BEAT + i * 0.008, m, d * BEAT, v, { p: -0.3 + i * 0.2 }));
  pad(pads, t0, c.v.map((m) => m - 12).slice(1), BAR, bar >= 6 ? 0.3 : 0.24, { cutoff: bar >= 6 ? 1500 : 1100 });
  if (bar >= 1) { bass(low, t0, c.root, BEAT * 1.5, 0.6); bass(low, t0 + 2.5 * BEAT, c.root + 7, BEAT * 0.9, 0.48); bass(low, t0 + 3.5 * BEAT, c.root + 12, BEAT * 0.4, 0.4); }
});
// Groove: hats from beat 2 of bar 0; kick/rim from bar 1; fuller at the climax; bar 8 breathes.
for (let bar = 0; bar < 9; bar++) {
  const t0 = bt(bar), climax = bar === 6 || bar === 7;
  for (let e = bar === 0 ? 4 : 0; e < 8; e++) noiseHit(drums, t0 + e * BEAT / 2 + (e % 2 ? 0.018 : 0), { dur: 0.026, vel: (e % 2 ? 0.035 : 0.055) * (climax ? 1.25 : 1), hp: 7500, p: 0.3, seed: 10 + e });
  if (bar === 0) continue;
  if (bar === 8) { kick(drums, t0, 0.45); continue; }
  kick(drums, t0, 0.55); kick(drums, t0 + 2.5 * BEAT, 0.38);
  if (climax) kick(drums, t0 + 1.75 * BEAT, 0.3);
  for (const b of [1, 3]) noiseHit(drums, t0 + b * BEAT, { dur: 0.045, vel: 0.13, bp: 1900, q: 1.4, tone: 210, p: -0.1, seed: 40 + b });
  if (climax) for (const b of [0.5, 2.25]) noiseHit(drums, t0 + b * BEAT, { dur: 0.02, vel: 0.06, bp: 3200, q: 3, p: 0.4, seed: 70 + b });
}
// Lead motif at the climax and a resolving note at the end.
const motif = [[6, 0, 78, 0.5], [6, 0.5, 81, 0.5], [6, 1, 76, 1], [6, 3, 73, 1], [7, 0, 74, 0.5], [7, 0.5, 78, 0.5], [7, 1, 83, 1.5], [7, 3, 81, 1]];
for (const [bar, b, m] of motif) pluck(lead, bt(bar, b), m, 0.42, { p: 0.2, seed: bar * 9 + b * 3, bright: 0.5 });
bell(lead, bt(9) + 0.05, 81, 0.28, { p: 0.15, decay: 1.6 }); bell(lead, bt(9) + 0.12, 86, 0.18, { p: -0.2, decay: 1.6 });

// Sound design, only where it serves the picture (times from film.js).
ice(fx, 0.08, 0.7, 1); ice(fx, 0.62, 0.42, 2);
noiseHit(fx, 3.0, { dur: 0.03, vel: 0.08, bp: 2600, q: 2, p: 0, seed: 91 });          // matched cut 3 s
whoosh(fx, 6.76, 0.48, 0.16, { f0: 260, f1: 2400, p0: 0.7, p1: -0.7, seed: 7 });          // leaf pass 7 s
noiseHit(fx, 11.0, { dur: 0.03, vel: 0.08, bp: 2600, q: 2, p: 0, seed: 92 });         // matched cut 11 s
whoosh(fx, 14.76, 0.48, 0.16, { f0: 260, f1: 2400, p0: 0.7, p1: -0.7, seed: 8 });         // leaf pass 15 s
[83, 86, 90].forEach((m, i) => bell(fx, 19.65 + i * 0.09, m, 0.14, { p: -0.3 + i * 0.3, decay: 1.2 })); // arch reveal

const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
hp(keys, 90); hp(pads, 70); hp(lead, 140); hp(fx, 40);
const music = new Bus(DUR + 2);
keys.mixInto(music, 1); low.mixInto(music, 1); drums.mixInto(music, 1); lead.mixInto(music, 0.85); pads.mixInto(music, 1);
const send = new Bus(DUR + 2); keys.mixInto(send, 0.45); lead.mixInto(send, 0.6); pads.mixInto(send, 0.5); drums.mixInto(send, 0.1);
reverb(send, { room: 0.84, damp: 0.4 }).mixInto(music, 0.85);
hp(music, 30);
const sfx = new Bus(DUR + 2); fx.mixInto(sfx, 2.2);
const sendF = new Bus(DUR + 2); fx.mixInto(sendF, 0.9); reverb(sendF, { room: 0.78, damp: 0.3 }).mixInto(sfx, 0.6);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR; const g = t >= DUR ? 0 : t > DUR - 0.35 ? Math.cos(((t - (DUR - 0.35)) / 0.35) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film3 score: ${DUR}s, norm ${norm.toFixed(3)}`);
