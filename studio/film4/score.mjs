// Film 4 score: 96 BPM, 8 bars = 20.0 s. Hook (bar 1: one rolled chord + ice), development (bars 2–4: keys,
// hats, bass), lift at 10 s (bar 5: kick/rim, fuller pad, lead motif bars 5–7), resolution at 17.5 s (D6/9 rings).
// Sound design only where the picture asks: ice (hook), rope pass (2.5 s), a soft tick on the match cut (9.375 s),
// air on the pillar (13.1 s), bells on the brand (17.55 s). Synthesised with lib/audio.mjs — no samples.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, rhodes, pluck, bass, pad, kick, noiseHit, ice, whoosh, bell, reverb, writeWav, peak, biquad } from '../lib/audio.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film4');
mkdirSync(OUT, { recursive: true });
const DUR = 20, BEAT = 60 / 96, BAR = 4 * BEAT;
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;
const CH = {
  Em9: { v: [55, 59, 62, 66], root: 40 }, A13: { v: [55, 61, 66, 71], root: 45 }, Dmaj9: { v: [54, 57, 61, 64], root: 38 },
  Bm9: { v: [50, 54, 57, 61], root: 47 }, Gmaj9: { v: [59, 62, 66, 69], root: 43 }, D69: { v: [54, 59, 64, 69], root: 38 },
};
const prog = ['Em9', 'A13', 'Dmaj9', 'Bm9', 'Em9', 'A13', 'Gmaj9', 'D69'];
const keys = new Bus(DUR + 2), low = new Bus(DUR + 2), drums = new Bus(DUR + 2), lead = new Bus(DUR + 2), pads = new Bus(DUR + 2), fx = new Bus(DUR + 2);
const roll = (c, t0, d, v, gap = 0.01) => c.v.forEach((m, i) => rhodes(keys, t0 + i * gap, m, d, v, { p: -0.3 + i * 0.2 }));

prog.forEach((name, bar) => {
  const c = CH[name], t0 = bt(bar), lift = bar >= 4;
  if (bar === 0) { roll(c, t0 + 0.05, BAR * 0.98, 0.34, 0.05); pad(pads, t0, c.v.map((m) => m - 12).slice(1), BAR, 0.26, { cutoff: 900 }); bass(low, t0 + 0.05, c.root, BAR * 0.9, 0.35); return; }
  if (bar === 7) { roll(c, t0, 2.4, 0.42, 0.045); bass(low, t0, c.root, 2.3, 0.55); pad(pads, t0, [50, 57, 64, 69], 2.4, 0.3); return; }
  if (bar === 6) { // Gmaj9 → A13 turnaround
    roll(CH.Gmaj9, t0, BEAT * 1.8, 0.36); roll(CH.A13, t0 + 2 * BEAT, BEAT * 1.8, 0.38);
    bass(low, t0, 43, BEAT * 1.8, 0.58); bass(low, t0 + 2 * BEAT, 45, BEAT * 1.8, 0.58);
    pad(pads, t0, [55, 59, 66], BAR, 0.3, { cutoff: 1500 }); return;
  }
  for (const [b, d, v] of [[0, 1.4, 0.36], [1.5, 0.45, 0.24], [3, 0.8, 0.28]]) roll(c, t0 + b * BEAT, d * BEAT, v, 0.008);
  pad(pads, t0, c.v.map((m) => m - 12).slice(1), BAR, lift ? 0.3 : 0.24, { cutoff: lift ? 1500 : 1000 });
  bass(low, t0, c.root, BEAT * 1.5, 0.58); bass(low, t0 + 2.5 * BEAT, c.root + 7, BEAT * 0.9, 0.44);
  if (lift) bass(low, t0 + 3.5 * BEAT, c.root + 12, BEAT * 0.4, 0.38);
});
for (let bar = 1; bar < 7; bar++) {
  const t0 = bt(bar), lift = bar >= 4;
  for (let e = 0; e < 8; e++) noiseHit(drums, t0 + e * BEAT / 2 + (e % 2 ? 0.018 : 0), { dur: 0.026, vel: (e % 2 ? 0.03 : 0.05) * (lift ? 1.25 : 1), hp: 7500, p: 0.3, seed: 10 + e });
  if (!lift) continue;
  if (bar === 6) { kick(drums, t0, 0.5); continue; }
  kick(drums, t0, 0.55); kick(drums, t0 + 2.5 * BEAT, 0.36);
  for (const b of [1, 3]) noiseHit(drums, t0 + b * BEAT, { dur: 0.045, vel: 0.12, bp: 1900, q: 1.4, tone: 210, p: -0.1, seed: 40 + b });
}
const motif = [[4, 0, 78, 0.5], [4, 0.5, 81, 0.5], [4, 1, 76, 1], [4, 3, 73, 1], [5, 0, 74, 0.5], [5, 0.5, 78, 0.5], [5, 1, 83, 1.5], [5, 3, 81, 1]];
for (const [bar, b, m] of motif) pluck(lead, bt(bar, b), m, 0.4, { p: 0.2, seed: bar * 9 + b * 3, bright: 0.5 });
bell(lead, bt(7) + 0.05, 81, 0.26, { p: 0.15, decay: 1.8 }); bell(lead, bt(7) + 0.13, 86, 0.16, { p: -0.2, decay: 1.8 });

ice(fx, 0.06, 0.75, 1); ice(fx, 0.55, 0.45, 2); ice(fx, 1.3, 0.25, 3);
whoosh(fx, 2.2, 0.62, 0.11, { f0: 140, f1: 900, p0: 0.8, p1: -0.8, seed: 7, q: 0.9 });             // rope passes the lens
noiseHit(fx, 2.48, { dur: 0.09, vel: 0.05, bp: 420, q: 2.5, tone: 95, p: -0.3, seed: 21 });          // rope fibre creak
ice(fx, 9.375, 0.3, 4);                                                                              // match cut
whoosh(fx, 12.86, 0.52, 0.09, { f0: 180, f1: 1400, p0: 0.8, p1: -0.8, seed: 8, q: 0.9 });          // pillar
[83, 86, 90].forEach((m, i) => bell(fx, 17.55 + i * 0.09, m, 0.12, { p: -0.3 + i * 0.3, decay: 1.3 })); // brand

const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
hp(keys, 90); hp(pads, 70); hp(lead, 140); hp(fx, 40);
const music = new Bus(DUR + 2);
keys.mixInto(music, 1); low.mixInto(music, 1); drums.mixInto(music, 1); lead.mixInto(music, 0.85); pads.mixInto(music, 1);
const send = new Bus(DUR + 2); keys.mixInto(send, 0.45); lead.mixInto(send, 0.6); pads.mixInto(send, 0.5); drums.mixInto(send, 0.1);
reverb(send, { room: 0.84, damp: 0.4 }).mixInto(music, 0.85);
hp(music, 30);
const sfx = new Bus(DUR + 2); fx.mixInto(sfx, 2.0);
const sendF = new Bus(DUR + 2); fx.mixInto(sendF, 0.9); reverb(sendF, { room: 0.78, damp: 0.3 }).mixInto(sfx, 0.6);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR; const g = t >= DUR ? 0 : t > DUR - 0.35 ? Math.cos(((t - (DUR - 0.35)) / 0.35) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film4 score: ${DUR}s, norm ${norm.toFixed(3)}`);
