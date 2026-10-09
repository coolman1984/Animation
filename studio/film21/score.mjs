// Film 21 score — original 128 BPM synthwave, 8 bars = 15.0 s, A minor (Am – F – C – G).
// bar 1: riser into the reveal impact at 1.875 · bars 2–7: kick/snare/hats, side-chained pad, arp, sub · a shimmer on every
// specular sweep (5.625, 9.375, 13.125) and soft glints on beats · bar 8: reverse swell into the final hit, ring-out to 15.0.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, pluck, bass, pad, kick, noiseHit, bell, reverb, writeWav, peak, biquad, rng } from '../lib/audio.mjs';
import { riser, sweep } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, '..', 'takes', 'film21'); mkdirSync(OUT, { recursive: true });
const DUR = 15, BEAT = 60 / 128, BAR = 4 * BEAT, S16 = BEAT / 4, N = DUR + 2;
const drums = new Bus(N), low = new Bus(N), pads = new Bus(N), arp = new Bus(N), lead = new Bus(N), fx = new Bus(N);
const kicks = []; const K = (t, v) => { kick(drums, t, v); kicks.push(t); };
const CH = [{ v: [57, 60, 64, 69], root: 33 }, { v: [53, 57, 60, 65], root: 29 }, { v: [48, 55, 60, 64], root: 36 }, { v: [55, 59, 62, 67], root: 31 }];
for (let bar = 0; bar < 8; bar++) {
  const t0 = bar * BAR, c = CH[bar % 4], full = bar >= 1 && bar <= 6;
  pad(pads, t0, c.v, BAR + 0.3, bar === 0 ? 1.2 : 2.2, { cutoff: bar === 0 ? 700 : 1900 });
  if (bar === 0) { bass(low, 0.05, c.root, BAR, 0.4); continue; }
  for (let s = 0; s < 16; s++) pluck(arp, t0 + s * S16, c.v[(s * 3) % 4] + 12 + (s % 8 >= 4 ? 12 : 0), s % 4 === 0 ? 0.32 : 0.22, { p: s % 2 ? 0.45 : -0.45, seed: bar * 17 + s, bright: 0.55, decay: 0.993 });
  if (full) {
    for (let b = 0; b < 4; b++) { K(t0 + b * BEAT, 0.85); bass(low, t0 + (b + 0.5) * BEAT, c.root + 12, BEAT * 0.45, 0.6); }
    for (const b of [1, 3]) noiseHit(drums, t0 + b * BEAT, { dur: 0.12, vel: 0.22, bp: 1800, q: 0.8, tone: 190, seed: 30 + bar + b });
    for (let e = 0; e < 8; e++) noiseHit(drums, t0 + e * BEAT / 2, { dur: e % 2 ? 0.06 : 0.02, vel: e % 2 ? 0.05 : 0.03, hp: 8000, seed: 60 + e });
  } else { bass(low, t0, c.root, BAR * 0.95, 0.55); K(t0, 0.9); }
}
riser(fx, 1.875 - 0.01, { dur: 1.6, vel: 0.32, f0: 160, f1: 7600, tonal: 0.3, seed: 4 });
for (const t of [5.625, 9.375, 13.125]) { sweep(fx, t + 0.4, { dur: 0.9, vel: 0.12, up: true, seed: Math.round(t * 10) }); [81, 88, 93, 100].forEach((m, i) => bell(lead, t + 0.1 + i * 0.12, m, 0.12, { p: -0.6 + i * 0.4, decay: 1.6 })); }
for (let i = 0; Math.round((5.625 + i * BEAT) * 1000) < 13125; i++) bell(lead, 5.625 + i * BEAT, [93, 96, 100, 98, 95, 91][i % 6], 0.05, { p: (i % 3 - 1) * 0.6, decay: 0.7 });
riser(fx, 13.125 - 0.01, { dur: 1.2, vel: 0.26, f0: 400, f1: 9000, tonal: 0.15, seed: 21 });
pad(pads, 13.125, [45, 57, 64, 69, 72, 76], 1.9, 3.0, { cutoff: 3000 }); bass(low, 13.125, 33, 1.8, 0.7);
{ const r = rng(5); for (let i = 0; i < 10; i++) bell(lead, 13.3 + r() * 1.2, 96 + Math.floor(r() * 8), 0.05, { p: r() * 2 - 1, decay: 0.6 }); }
placeCues(fx, plan.cues);
const duck = (bus, d) => { for (const kk of kicks) { const i0 = Math.round(kk * SR); for (let i = 0; i < 0.22 * SR && i0 + i < bus.n; i++) { const g = 1 - d * Math.exp(-i / (0.07 * SR)); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
duck(pads, 0.6); duck(arp, 0.35);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
hp(pads, 110); hp(arp, 180); hp(lead, 200); hp(fx, 45);
const music = new Bus(N); drums.mixInto(music, 1); low.mixInto(music, 1); pads.mixInto(music, 0.9); arp.mixInto(music, 0.8); lead.mixInto(music, 1);
const send = new Bus(N); pads.mixInto(send, 0.4); arp.mixInto(send, 0.55); lead.mixInto(send, 0.7); reverb(send, { room: 0.86, damp: 0.35 }).mixInto(music, 0.75);
hp(music, 28);
const sfx = new Bus(N); fx.mixInto(sfx, 1);
for (const b of [music, sfx]) { for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.5 ? Math.cos(((t - (DUR - 0.5)) / 0.5) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; } b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n); }
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1.15);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 1.15 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film21 score: ${DUR}s, norm ${norm.toFixed(3)}`);
