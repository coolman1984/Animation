// Showreel score: 128 BPM, 8 bars = 15.0 s, F minor (Fm9 – Dbmaj7 – Abmaj7 – Eb6/9, twice).
// Bar 1 hook: impact + filtered arp, no kick. Bars 2–4 groove (kick, offbeat bass, claps, hats), riser into
// the drop at 7.5 s. Bars 5–7 full (wider pads, lead motif, open hats). Bar 8: one held chord, kick stops.
// Accents come from the shared cue sheet (production.json → lib/cues.mjs placeCues).
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, pluck, bass, pad, kick, noiseHit, bell, reverb, writeWav, peak, biquad } from '../lib/audio.mjs';
import { riser } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'showreel');
mkdirSync(OUT, { recursive: true });
const DUR = 15, BEAT = 60 / 128, BAR = 4 * BEAT, S16 = BEAT / 4;
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;
const CH = [
  { v: [53, 56, 60, 63, 67], root: 41 }, // Fm9
  { v: [53, 56, 60, 61], root: 37 },     // Dbmaj7
  { v: [51, 55, 56, 60], root: 44 },     // Abmaj7
  { v: [51, 55, 58, 60], root: 39 },     // Eb6/9
];
const drums = new Bus(DUR + 2), low = new Bus(DUR + 2), pads = new Bus(DUR + 2), arp = new Bus(DUR + 2), lead = new Bus(DUR + 2), fx = new Bus(DUR + 2);
const kicks = [];

for (let bar = 0; bar < 8; bar++) {
  const c = CH[bar % 4], t0 = bt(bar), drop = bar >= 4, end = bar === 7;
  if (end) { // one held chord, ringing
    pad(pads, t0, [...c.v, c.v[2] + 12], 1.6, 2.6, { cutoff: 2600 });
    bass(low, t0, CH[0].root, 1.4, 0.7);
    [77, 80, 84].forEach((m, i) => bell(lead, t0 + i * 0.04, m, 0.14, { p: -0.3 + i * 0.3, decay: 1.6 }));
    kick(drums, t0, 0.9); kicks.push(t0);
    continue;
  }
  // Pads: the bed; filter opens across the reel.
  pad(pads, t0, c.v, BAR + 0.2, drop ? 3.0 : bar === 0 ? 2.2 : 1.5, { cutoff: drop ? 2600 : 900 + bar * 250 });
  if (bar === 0) bass(low, t0 + 0.02, 29, BAR * 0.95, 0.55); // sub drone under the hook
  // Arp: 16ths over chord tones, brighter each bar; bar 1 starts on beat 2 (after the opening impact).
  for (let s = bar === 0 ? 2 : 0; s < 16; s++) {
    const m = c.v[(s * 3) % c.v.length] + (s % 8 >= 4 ? 12 : 0);
    pluck(arp, t0 + s * S16, m, (s % 4 === 0 ? 0.42 : 0.28) * (drop ? 1 : bar === 0 ? 1.5 : 0.85), { p: s % 2 ? 0.35 : -0.35, seed: bar * 31 + s, bright: Math.min(0.85, 0.35 + bar * 0.07), decay: 0.994 });
  }
  if (bar === 0) continue;
  // Groove.
  // Bar 4 drops its last kick: half a beat of air before the drop, the riser owns it.
  for (let b = 0; b < (bar === 3 ? 3 : 4); b++) { kick(drums, t0 + b * BEAT, drop ? 0.95 : 0.6); kicks.push(t0 + b * BEAT); }
  if (bar >= 2) for (const b of [1, 3]) if (!(bar === 3 && b === 3)) noiseHit(drums, t0 + b * BEAT, { dur: 0.06, vel: drop ? 0.24 : 0.13, bp: 1600, q: 0.9, tone: 190, seed: 40 + b + bar });
  for (let e = 0; e < 8; e++) {
    const open = drop && e % 2 === 1;
    noiseHit(drums, t0 + e * BEAT / 2, { dur: open ? 0.09 : 0.022, vel: (e % 2 ? 0.06 : 0.035) * (drop ? 1.2 : 0.8), hp: open ? 6500 : 8500, p: 0.25, seed: 70 + e });
  }
  for (let b = 0; b < 4; b++) if (!(bar === 3 && b === 3)) bass(low, t0 + (b + 0.5) * BEAT, c.root + (drop && b === 3 ? 12 : 0), BEAT * 0.42, drop ? 0.72 : 0.42);
  if (drop) {
    const motif = [[0, 72], [0.75, 75], [1.5, 77], [2.5, 80], [3, 77]];
    for (const [b, m] of motif) pluck(lead, t0 + b * BEAT, m + (bar === 6 ? 2 : 0), 0.5, { p: 0.15, seed: bar * 7 + b * 3, bright: 0.6 });
  }
}
riser(fx, bt(4) - 0.01, { dur: BAR, vel: 0.32, f0: 250, f1: 7000, tonal: 0.3, seed: 12 });

// Sidechain-style ducking of the bed after each kick (keeps the kick clear, gives the pump).
const duck = (bus, depth = 0.55) => {
  for (const k of kicks) { const i0 = Math.round(k * SR), n = Math.round(0.22 * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const g = 1 - depth * Math.exp(-i / (0.07 * SR)); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } }
};
duck(pads, 0.6); duck(arp, 0.35); duck(low, 0.45);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
hp(pads, 120); hp(arp, 180); hp(lead, 200); hp(fx, 60);

const music = new Bus(DUR + 2);
drums.mixInto(music, 1); low.mixInto(music, 1); pads.mixInto(music, 0.9); arp.mixInto(music, 0.85); lead.mixInto(music, 1); fx.mixInto(music, 1);
const send = new Bus(DUR + 2); pads.mixInto(send, 0.4); arp.mixInto(send, 0.5); lead.mixInto(send, 0.6);
reverb(send, { room: 0.82, damp: 0.4 }).mixInto(music, 0.7);
hp(music, 28);
const sfx = new Bus(DUR + 2);
placeCues(sfx, plan.cues);
const sendF = new Bus(DUR + 2); sfx.mixInto(sendF, 0.6); reverb(sendF, { room: 0.7, damp: 0.3 }).mixInto(sfx, 0.5);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.4 ? Math.cos(((t - (DUR - 0.4)) / 0.4) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1.4);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 1.4 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`showreel score: ${DUR}s, norm ${norm.toFixed(3)}`);
