// Film 2 score + sound design, locked to the picture timeline in film.js (90 BPM, bar = 8/3 s).
// Writes takes/film2/music.wav, sfx.wav, mix.wav (float32, 48 kHz, unmastered).
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, rhodes, pluck, bass, pad, kick, noiseHit, ice, bloop, whoosh, bell, reverb, writeWav, peak, rng, biquad } from '../lib/audio.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film2');
mkdirSync(OUT, { recursive: true });

const DUR = 60;
const BEAT = 60 / 90, BAR = 4 * BEAT;
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;

// Chords per bar. Voicings (rootless, Rhodes), bass root, pad notes.
const CH = {
  Dm9: { v: [53, 57, 60, 64], root: 38, fifth: 45, pad: [50, 57, 64] },
  G13: { v: [53, 59, 64, 69], root: 43, fifth: 50, pad: [55, 59, 65] },
  Cmaj9: { v: [52, 55, 59, 62], root: 36, fifth: 43, pad: [48, 55, 64] },
  A7: { v: [55, 61, 65, 67], root: 45, fifth: 52, pad: [49, 57, 64] },
  C69: { v: [52, 57, 62, 67], root: 36, fifth: 43, pad: [48, 55, 64, 69] },
};
const cycle = ['Dm9', 'G13', 'Cmaj9', 'A7'];
const chordAt = (bar) => (bar >= 21 ? 'C69' : bar === 19 ? 'Dm9' : bar === 20 ? 'G13' : cycle[bar % 4]);

// Sections (bars): intro 0-1, inside 2-4, duo 5-7, moment 8-11, montage 12-15, place 16-18, end 19-22.
const sec = (bar) => (bar < 2 ? 'intro' : bar < 5 ? 'inside' : bar < 8 ? 'duo' : bar < 12 ? 'moment' : bar < 16 ? 'montage' : bar < 19 ? 'place' : 'end');

const keys = new Bus(DUR + 1), plk = new Bus(DUR + 1), low = new Bus(DUR + 1), drums = new Bus(DUR + 1), pads = new Bus(DUR + 1), fx = new Bus(DUR + 1);

// ---------- harmony ----------
const COMP = [0, 3, 6, 10, 12]; // bossa comp, eighths over two bars
for (let bar = 0; bar < 23; bar++) {
  const c = CH[chordAt(bar)], s = sec(bar), t0 = bt(bar);
  if (t0 >= DUR) break;
  if (s === 'intro' || s === 'place' || bar >= 21) {
    // sustained, rolled chords
    c.v.forEach((m, i) => rhodes(keys, t0 + i * 0.035, m, bar >= 21 ? 3.6 : BAR * 0.95, 0.36 + (s === 'intro' ? 0 : 0.04), { p: -0.3 + i * 0.2 }));
  } else {
    for (const e of COMP) {
      const pos = (bar % 2) * 8;
      if (e < pos || e >= pos + 8) continue;
      const tt = t0 + (e - pos) * BEAT / 2;
      const vel = s === 'moment' || s === 'inside' ? 0.3 : 0.38;
      c.v.forEach((m, i) => rhodes(keys, tt + i * 0.008, m, BEAT * (e % 2 ? 0.55 : 0.9), vel, { p: -0.3 + i * 0.2 }));
    }
  }
  // pad bed everywhere except the busiest montage bars (kept lower there)
  pad(pads, t0, c.pad, BAR, s === 'montage' ? 0.22 : s === 'duo' ? 0.28 : 0.4, { cutoff: s === 'moment' ? 1500 : 1000 });
  // bass from "inside" on
  if (s !== 'intro') {
    const v = s === 'place' ? 0.45 : 0.6;
    if (bar >= 21) { bass(low, t0, c.root, 3.2, 0.6); continue; }
    bass(low, t0, c.root, BEAT * 1.4, v);
    bass(low, t0 + 2 * BEAT, c.fifth, BEAT * 1.2, v * 0.85);
    if (s === 'duo' || s === 'montage') bass(low, t0 + 3.5 * BEAT, CH[chordAt(bar + 1)].root, BEAT * 0.45, v * 0.7);
  }
}

// ---------- groove ----------
for (let bar = 0; bar < 22; bar++) {
  const s = sec(bar), t0 = bt(bar);
  const full = s === 'duo' || s === 'montage' || (s === 'end' && bar < 21);
  const light = s === 'inside' || s === 'moment';
  if (!full && !light) continue;
  for (let e = 0; e < 16; e++) { // shaker 16ths
    const acc = e % 2 === 0 ? 1 : 0.55;
    noiseHit(drums, t0 + e * BEAT / 4, { dur: 0.028, vel: (full ? 0.06 : 0.045) * acc, hp: 7000, p: 0.35, seed: 20 + e });
  }
  for (const b of [1, 3]) noiseHit(drums, t0 + b * BEAT, { dur: 0.16, vel: full ? 0.07 : 0.05, bp: 3500, q: 0.6, attack: 0.015, p: -0.2, seed: 40 + b }); // brush swish
  if (full) {
    for (const e of [0, 3, 4, 7]) kick(drums, t0 + e * BEAT / 2, e % 4 === 0 ? 0.55 : 0.35);
    const pos = (bar % 2) * 8;
    for (const e of COMP) if (e >= pos && e < pos + 8) noiseHit(drums, t0 + (e - pos) * BEAT / 2, { dur: 0.018, vel: 0.12, bp: 1800, q: 4, tone: 1700, p: 0.15, seed: 60 + e }); // rim clave
  }
}

// ---------- melody (nylon pluck) ----------
const A = [[0, 69, 0.5], [0.5, 72, 0.5], [1, 76, 1], [2, 74, 1.5], [4.5, 72, 0.5], [5, 71, 1], [6, 67, 1.5]];
const B = [[0, 67, 0.5], [0.5, 71, 0.5], [1, 74, 1], [2, 76, 1.5], [4, 73, 0.5], [4.5, 74, 0.5], [5, 73, 1], [6, 69, 1.5]];
const phrases = [[6, B, 0.42], [8, A, 0.34], [10, B, 0.34], [12, A, 0.44], [14, B, 0.44], [19, A, 0.4]];
for (const [bar, ph, vel] of phrases) for (const [b, m, d] of ph) pluck(plk, bt(bar, b), m, vel, { p: 0.25, seed: bar * 13 + b * 7, bright: 0.45 });
pluck(plk, bt(21), 76, 0.42, { p: 0.25, seed: 999, decay: 0.998 }); // final note
pluck(plk, bt(21) + 0.02, 67, 0.3, { p: -0.2, seed: 998, decay: 0.998 });

// ---------- sound design (times match film.js) ----------
ice(fx, 0.10, 0.75, 1); ice(fx, 0.85, 0.5, 2); ice(fx, 2.6, 0.35, 3);
whoosh(fx, 4.95, 0.75, 0.10, { f0: 1200, f1: 300, p0: 0.5, p1: -0.5, seed: 8 }); // world falls away
[[6.5, 81], [8.6, 84], [10.6, 88]].forEach(([t, m], i) => { bell(fx, t + 0.05, m, 0.42, { p: -0.3, decay: 0.9 }); });
bloop(fx, 10.75, 0.45, { p: -0.2 }); bloop(fx, 10.92, 0.3, { f0: 1000, f1: 380, p: -0.1 });
// portal: rising shimmer arpeggio + air
whoosh(fx, 12.6, 1.9, 0.12, { f0: 500, f1: 6000, p0: -0.2, p1: 0.2, seed: 9, q: 0.9 });
[84, 88, 91, 95, 98].forEach((m, i) => bell(fx, 12.8 + i * 0.12, m, 0.22, { p: -0.5 + i * 0.25, decay: 1.2 }));
ice(fx, 16.3, 0.35, 4); // light sweep sparkle
// liquid wave
whoosh(fx, 20.75, 1.7, 0.2, { f0: 140, f1: 900, p0: 0, p1: 0, seed: 10, q: 0.7 });
{ const r = rng(77); for (let i = 0; i < 18; i++) bloop(fx, 21.0 + r() * 1.3, 0.12 + r() * 0.12, { f0: 500 + r() * 900, f1: 1200 + r() * 600, p: r() * 1.6 - 0.8 }); }
ice(fx, 26.45, 0.55, 5); ice(fx, 29.7, 0.35, 6); ice(fx, 31.0, 0.3, 7);
// pearls falling + montage cuts
{ const r = rng(31); for (let i = 0; i < 10; i++) bloop(fx, 31.45 + i * 0.13 + r() * 0.05, 0.25 + r() * 0.15, { f0: 700 + r() * 300, f1: 250 + r() * 80, p: r() * 1.4 - 0.7 }); }
for (let i = 0; i < 8; i++) bloop(fx, bt(12) + i * 2 * BEAT, 0.32, { f0: 820, f1: 300, p: i % 2 ? 0.3 : -0.3 });
// place: window draws
whoosh(fx, bt(16) - 0.1, 1.6, 0.045, { f0: 2500, f1: 7000, p0: -0.6, p1: 0.6, seed: 12, q: 1.2 });
[79, 83, 86].forEach((m, i) => bell(fx, bt(16) - 0.15 + i * 0.4, m, 0.18, { p: -0.4 + i * 0.4, decay: 1.6 }));
// end card: soft hit on the logo, pop on the CTA
{ const t = bt(19) + 0.85; kick(fx, t, 0.5); noiseHit(fx, t, { dur: 0.35, vel: 0.05, bp: 900, q: 0.5, attack: 0.004, seed: 90 }); [72, 76, 79, 83].forEach((m, i) => bell(fx, t + i * 0.02, m, 0.2, { p: -0.3 + i * 0.2, decay: 2.2 })); }
bloop(fx, bt(19) + 2.65, 0.4, { f0: 600, f1: 900, p: 0 });

// ---------- mix ----------
// Rhodes FM at 1:1 leaves a DC/sub component: high-pass keys at 90 Hz, pads at 70 Hz.
const hpf = (bus, f) => { for (const ch of ['L', 'R']) { const h1 = biquad('hp', f, 0.7), h2 = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = h2(h1(x[i])); } };
hpf(keys, 90); hpf(pads, 70); hpf(plk, 120);
const music = new Bus(DUR + 1);
keys.mixInto(music, 1.0); plk.mixInto(music, 0.9); low.mixInto(music, 1.0); drums.mixInto(music, 1.0); pads.mixInto(music, 1.0);
const sendM = new Bus(DUR + 1); keys.mixInto(sendM, 0.5); plk.mixInto(sendM, 0.6); pads.mixInto(sendM, 0.5); drums.mixInto(sendM, 0.15);
const rvM = reverb(sendM, { room: 0.86, damp: 0.4 });
rvM.mixInto(music, 0.9);
hpf(fx, 40);
const sfx = new Bus(DUR + 1); fx.mixInto(sfx, 2.6);
const sendF = new Bus(DUR + 1); fx.mixInto(sendF, 1.2);
reverb(sendF, { room: 0.8, damp: 0.3 }).mixInto(sfx, 0.7);

// Trim to the film and fade the last 1.2 s with the picture.
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) {
    const t = i / SR;
    const g = t >= DUR ? 0 : t > DUR - 1.25 ? Math.cos(((t - (DUR - 1.25)) / 1.25) * Math.PI / 2) : 1;
    b.L[i] *= g; b.R[i] *= g;
  }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
hpf(music, 30);
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1.0);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm });
writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm });
writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`score: ${DUR}s, peak before norm ${peak(mix).toFixed(3)}, gain ${norm.toFixed(3)}`);
