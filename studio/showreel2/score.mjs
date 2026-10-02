// Showreel 2 score — original, 128 BPM, 8 bars = 15.0 s. Written for this film's cue sheet (production.json).
// Bar 1 hook: sub drone + filtered hats, riser into the iris punch at 1.875 s. Bars 2–4 groove (kick, offbeat bass, claps),
// bar 5 the drop (full arp), bar 6 breakdown (no kick, airy bells), bar 7 the 1/8-note type hits + a linear sine sweep for
// LINEAR., bar 8 the bloom: impact, bell chord, confetti sparkles, tail to silence at 15.0 s. No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, pluck, bass, pad, kick, noiseHit, bell, reverb, writeWav, peak, biquad, rng, pan } from '../lib/audio.mjs';
import { riser, impact, softHit, click, sweep } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'showreel2');
mkdirSync(OUT, { recursive: true });
const DUR = 15, BEAT = 60 / 128, BAR = 4 * BEAT, S16 = BEAT / 4, E8 = BEAT / 2;
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;
const CH = [
  { v: [50, 57, 60, 64, 65], root: 38 },   // Dm9
  { v: [46, 53, 57, 60, 62], root: 34 },   // Bbmaj9
  { v: [53, 57, 62, 64, 69], root: 41 },   // F6/9
  { v: [43, 55, 58, 62, 65], root: 31 },   // Gm9
];
const PROG = [0, 0, 1, 3, 0, 1, 2, 0];
const drums = new Bus(DUR + 2), low = new Bus(DUR + 2), pads = new Bus(DUR + 2), arp = new Bus(DUR + 2), lead = new Bus(DUR + 2), fx = new Bus(DUR + 2);
const kicks = [];
const K = (t, v = 0.8) => { kick(drums, t, v); kicks.push(t); };

// ---- bar 1: hook ----
pad(pads, 0, [38, 45, 50, 53], BAR + 0.3, 1.6, { cutoff: 700 });
bass(low, 0.02, 26, BAR * 0.95, 0.5);
for (let s = 4; s < 16; s++) noiseHit(drums, s * S16, { dur: 0.02, vel: 0.012 + 0.002 * s, hp: 8500, seed: 90 + s });
riser(fx, bt(1) - 0.012, { dur: 1.3, vel: 0.3, f0: 180, f1: 6800, tonal: 0.25, seed: 4 });

// ---- bars 2–8 ----
for (let bar = 1; bar < 8; bar++) {
  const c = CH[PROG[bar]], t0 = bt(bar), drop = bar === 4 || bar === 5 || bar === 6, ending = bar === 7;
  if (bar !== 7) pad(pads, t0, c.v, BAR + 0.25, bar >= 4 ? 2.6 : 1.8, { cutoff: bar >= 4 ? 2400 : 1100 + bar * 200 });
  if (bar === 7) continue; // the bloom is written below
  const breakdown = bar === 5;
  // arp: 16ths over chord tones
  if (bar !== 6) for (let s = 0; s < 16; s++) {
    if (bar === 1 && s < 8) continue;
    const m = c.v[(s * 3) % c.v.length] + (s % 8 >= 4 ? 12 : 0);
    pluck(arp, t0 + s * S16, m, (s % 4 === 0 ? 0.4 : 0.26) * (drop && !breakdown ? 1.1 : 0.85), { p: s % 2 ? 0.4 : -0.4, seed: bar * 31 + s, bright: 0.45 + bar * 0.05, decay: 0.994 });
  }
  if (!breakdown) { for (let b = 0; b < 4; b++) K(t0 + b * BEAT, drop ? 0.95 : 0.7); }
  if (bar >= 2 && !breakdown) for (const b of [1, 3]) noiseHit(drums, t0 + b * BEAT, { dur: 0.06, vel: drop ? 0.24 : 0.14, bp: 1600, q: 0.9, tone: 190, seed: 40 + b + bar });
  for (let e = 0; e < 8; e++) noiseHit(drums, t0 + e * E8, { dur: e % 2 && drop ? 0.09 : 0.022, vel: (e % 2 ? 0.06 : 0.035) * (drop ? 1.2 : 0.8), hp: 8500, p: 0.25, seed: 70 + e });
  if (!breakdown) for (let b = 0; b < 4; b++) bass(low, t0 + (b + 0.5) * BEAT, c.root + (b === 3 && drop ? 12 : 0), BEAT * 0.42, drop ? 0.72 : 0.5);
  if (breakdown) { bass(low, t0, c.root, BAR * 0.9, 0.5); for (let b = 0; b < 8; b++) bell(lead, t0 + b * E8, [74, 77, 81, 84][b % 4] + (b > 3 ? 0 : 0), 0.14, { p: b % 2 ? 0.5 : -0.5, decay: 0.9 }); }
  if (drop && !breakdown) for (const [b, m] of [[0, 69], [0.75, 72], [1.5, 74], [2.5, 77], [3, 74]]) pluck(lead, t0 + b * BEAT, m, 0.5, { p: 0.15, seed: bar * 7 + b * 3, bright: 0.6 });
}
// builds into the drop (bar 4 → bar 5 at 7.5 s) and into the bloom (13.0 → 13.35)
riser(fx, bt(4) - 0.01, { dur: BAR * 0.9, vel: 0.28, f0: 220, f1: 7500, tonal: 0.3, seed: 12 });
riser(fx, 13.35 - 0.01, { dur: 0.7, vel: 0.3, f0: 400, f1: 9000, tonal: 0.1, seed: 21 });

// ---- scene sound design (musical hits, not on every motion) ----
impact(fx, 1.875, { vel: 0.7, weight: 0.7 });                                  // iris punch → orange
for (let i = 0; i < 6; i++) click(fx, 1.95 + i * 0.045, { vel: 0.2, bright: 0.5 + i * 0.07, p: -0.5 + i * 0.2, seed: 100 + i }); // letters land
sweep(fx, 3.05, { dur: 0.5, vel: 0.12, up: true, seed: 3 });                    // subtitle rises
for (let i = 0; i < 6; i++) pluck(lead, 3.78 + i * 0.05, [74, 77, 79, 81, 84, 86][i], 0.34, { p: -0.6 + i * 0.24, seed: 60 + i, bright: 0.7 }); // six dots land
sweep(fx, 4.3, { dur: 0.55, vel: 0.14, up: true, seed: 8 });                    // the race
[4.94, 5.0, 5.06, 5.12].forEach((t, i) => bell(lead, t, [86, 89, 93, 98][i], 0.1, { p: i % 2 ? 0.6 : -0.6, decay: 0.7 })); // arrivals
sweep(fx, 5.55, { dur: 0.35, vel: 0.14, up: false, seed: 9 });                  // everything folds into one dot
impact(fx, 5.625, { vel: 0.4, weight: 0.45 });                                  // blue
for (const [t, f0] of [[5.95, 420], [6.5, 520], [6.95, 640]]) { // spring "boing" per morph: a sine with a pitch bend
  const i0 = Math.round(t * SR); let ph = 0; const [gl, gr] = pan(0);
  for (let n = 0; n < SR * 0.5; n++) { const tt = n / SR, f = f0 * (1 + 0.5 * Math.exp(-tt / 0.07) * Math.cos(tt * 38)); ph += 2 * Math.PI * f / SR; const s = Math.sin(ph) * Math.exp(-tt / 0.14) * Math.min(1, tt / 0.003) * 0.2; fx.add(i0 + n, s * gl, s * gr); }
}
impact(fx, 7.5, { vel: 0.85, weight: 0.9 });                                    // the drop (Truchet)
for (const w of [8.0, 8.38, 8.76]) sweep(fx, w + 0.25, { dur: 0.5, vel: 0.1, up: true, seed: Math.round(w * 10) }); // colour waves
impact(fx, 9.375, { vel: 0.4, weight: 0.4 });                                   // depth
{ // torus whirr: slow tremolo'd low tone through the final third of bar 6
  const i0 = Math.round(10.5 * SR); let ph = 0;
  for (let n = 0; n < SR * 0.8; n++) { const tt = n / SR, f = 110 + 20 * Math.sin(tt * 8), env = Math.sin(Math.PI * tt / 0.8) ** 1.5; ph += 2 * Math.PI * f / SR; const s = Math.sin(ph) * (0.6 + 0.4 * Math.sin(tt * 36)) * env * 0.14; fx.add(i0 + n, s, s); }
}
const CARD = [11.25, 11.484, 11.719, 11.953, 12.187, 12.42];                    // five 1/8-note cards + the tile row
CARD.forEach((t, i) => { impact(fx, t, { vel: 0.5 + (i === 0 ? 0.2 : 0), weight: i === 5 ? 0.2 : 0.45 - i * 0.04 }); softHit(fx, t, { vel: 0.35, tone: [196, 262, 220, 294, 247, 330][i] }); });
{ // LINEAR.: frequency rises at a constant rate (f(t) = t)
  const i0 = Math.round(12.65 * SR); let ph = 0;
  for (let n = 0; n < SR * 0.7; n++) { const tt = n / SR, f = 200 + (tt / 0.7) * 2200; ph += 2 * Math.PI * f / SR; const s = Math.sin(ph) * Math.min(1, tt / 0.02) * (tt > 0.66 ? (0.7 - tt) / 0.04 : 1) * 0.12; fx.add(i0 + n, s, s); }
}
impact(fx, 13.35, { vel: 1.0, weight: 1.0 });                                   // the bloom
[62, 69, 74, 77, 81, 86].forEach((m, i) => bell(lead, 13.38 + i * 0.05, m + 12, 0.2, { p: -0.5 + i * 0.2, decay: 1.9 }));
pad(pads, 13.35, [38, 50, 57, 60, 64, 69], 1.7, 3.2, { cutoff: 2800 });
bass(low, 13.35, 26, 1.5, 0.75); K(13.35, 0.9);
{ const r = rng(77); for (let i = 0; i < 18; i++) bell(lead, 13.5 + r() * 1.3, 88 + Math.floor(r() * 12), 0.05 + r() * 0.05, { p: r() * 2 - 1, decay: 0.5 }); } // confetti sparkles
placeCues(fx, plan.cues);

// ---- mix ----
const duck = (bus, depth) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(0.22 * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const g = 1 - depth * Math.exp(-i / (0.07 * SR)); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
duck(pads, 0.6); duck(arp, 0.35); duck(low, 0.45);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
hp(pads, 110); hp(arp, 170); hp(lead, 200); hp(fx, 45);
const music = new Bus(DUR + 2);
drums.mixInto(music, 1); low.mixInto(music, 1); pads.mixInto(music, 0.9); arp.mixInto(music, 0.85); lead.mixInto(music, 1);
const send = new Bus(DUR + 2); pads.mixInto(send, 0.4); arp.mixInto(send, 0.5); lead.mixInto(send, 0.6);
reverb(send, { room: 0.82, damp: 0.4 }).mixInto(music, 0.7);
hp(music, 28);
const sfx = new Bus(DUR + 2); fx.mixInto(sfx, 1);
const sendF = new Bus(DUR + 2); fx.mixInto(sendF, 0.5); reverb(sendF, { room: 0.7, damp: 0.3 }).mixInto(sfx, 0.5);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.5 ? Math.cos(((t - (DUR - 0.5)) / 0.5) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1.2);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 1.2 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`showreel2 score: ${DUR}s, norm ${norm.toFixed(3)}`);
