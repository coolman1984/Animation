// Film 6 score — original, 120 BPM (beat 0.5 s, bar 2 s), 10 bars = 20.0 s. Modern Egyptian groove in A Hijaz
// (A Bb C# D E F G): a house kick and claps carry the reference's energy; on top, darbuka MAQSUM (dum tak _ tak dum _ tak _),
// riq jingles and an oud-like plucked melody give it an Egyptian voice. No voiceover: the music carries the ad.
// bar 1 hook motif · 3.0 blue drop · services/result groove · whip ticks · board checks · 12.0 stamp ·
// 13.0 dark breakdown (oud solo over Gm → A, no kick) · riser into the 16.0 brand drop · final A chord at 19.0.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, pluck, bass, pad, kick, noiseHit, bell, rhodes, reverb, writeWav, peak, biquad, whoosh, bloop } from '../lib/audio.mjs';
import { riser, impact, softHit, click, sweep, whooshBy, uiConfirm } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film6');
mkdirSync(OUT, { recursive: true });
const DUR = 20, BEAT = 0.5, BAR = 2, S16 = 0.125;
const N = DUR + 2, mk = () => new Bus(N);
const drums = mk(), low = mk(), keys = mk(), pads = mk(), lead = mk(), fx = mk(), tabla = mk();
const kicks = [];

const CH = {
  A: { root: 45, v: [57, 61, 64, 69] },    // A (Hijaz tonic, major third C#)
  Bb: { root: 46, v: [58, 62, 65, 70] },   // Bb (the flat second)
  Gm: { root: 43, v: [55, 58, 62, 67] },   // G minor
  Dm: { root: 38, v: [57, 62, 65, 69] },   // D minor
};
const PROG = ['A', 'Bb', 'A', 'Gm', 'A', 'Bb', 'Dm', 'Gm', 'A', 'Bb'];
const HJ = [69, 70, 73, 74, 76, 77, 79, 81]; // A Hijaz from A4

// darbuka maqsum over one bar of eighths: D T _ T D _ T _ (+ ghost taks), riq jingles on sixteenths
const maqsum = (t0, lvl = 1) => {
  for (const [k, e] of [['D', 0], ['T', 1], ['T', 3], ['D', 4], ['T', 6], ['t', 7]]) {
    const t = t0 + e * 0.25;
    if (k === 'D') noiseHit(tabla, t, { dur: 0.16, vel: 0.34 * lvl, bp: 140, q: 0.7, tone: 92, p: -0.15, seed: 700 + e });
    else noiseHit(tabla, t, { dur: 0.05, vel: (k === 'T' ? 0.2 : 0.09) * lvl, bp: 3000, q: 1.2, tone: 560, p: 0.2, seed: 720 + e });
  }
};
const riq = (t0, lvl = 1) => { for (let s = 0; s < 16; s++) if (s % 4 !== 0) noiseHit(tabla, t0 + s * 0.125, { dur: 0.03, vel: (s % 2 ? 0.018 : 0.03) * lvl, hp: 9000, q: 2, p: 0.5, seed: 760 + s }); };
const oud = (t, m, vel = 0.4, p = 0) => pluck(lead, t, m, vel, { p, seed: 800 + Math.round(t * 16) + m, bright: 0.32, decay: 0.993, damp: 0.55 });

// ---------- groove ----------
for (let bar = 0; bar < 10; bar++) {
  const t0 = bar * BAR, c = CH[PROG[bar]];
  const dark = t0 >= 12 && t0 < 16, brand = t0 >= 16;
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    if (tb >= 19.0) break;
    const breakdown = tb >= 13.0 && tb < 16.0;
    if (!breakdown) { kick(drums, tb, b === 0 ? 0.85 : 0.75); kicks.push(tb); }
    if (b % 2 === 1) noiseHit(drums, tb, { dur: 0.09, vel: breakdown ? 0.12 : 0.24, bp: 1500, q: 0.8, tone: 210, p: 0.1, seed: 40 + bar * 4 + b });  // clap
    noiseHit(drums, tb + 0.25, { dur: 0.08, vel: breakdown ? 0.03 : 0.07, hp: 7500, p: 0.35, seed: 90 + bar * 4 + b });                         // open hat
    for (let s = 0; s < 4; s++) if (!breakdown && s !== 2) noiseHit(drums, tb + s * S16, { dur: 0.015, vel: s % 2 ? 0.022 : 0.03, hp: 9500, p: -0.4, seed: 300 + bar * 16 + b * 4 + s }); // shaker
    if (!breakdown) { bass(low, tb + 0.25, c.root - 12, BEAT * 0.38, 0.62); if (b === 0) bass(low, tb, c.root - 12, BEAT * 0.22, 0.45); }
  }
  if (t0 < 19) { const lvl = dark ? 0.55 : t0 < 2 ? 0.7 : 1; maqsum(t0, lvl); riq(t0, dark ? 0.5 : 1); }
  // Rhodes stabs on syncopated 16ths; held chord in the breakdown
  if (dark) {
    pad(pads, 13.0, CH.Gm.v, 1.5, 1.6, { cutoff: 1400 }); pad(pads, 14.5, CH.A.v, 1.5, 1.7, { cutoff: 1600 });
    rhodes(keys, 13.0, CH.Gm.root - 12, 1.4, 0.3); rhodes(keys, 14.5, CH.A.root - 12, 1.4, 0.3);
    if (t0 === 12) for (const st of [3, 6, 10]) for (const m of CH.Dm.v) rhodes(keys, t0 + st * S16, m, 0.2, 0.2, { p: (m % 3) / 3 - 0.3 });
    continue;
  }
  for (const st of [3, 6, 10, 14]) { const ts = t0 + st * S16; if (ts >= 19.0) break; for (const m of c.v) rhodes(keys, ts, m, 0.22, 0.2, { p: (m % 3) / 3 - 0.3, trem: 0.1 }); }
  pad(pads, t0, c.v, BAR + 0.2, brand ? 1.4 : 1.0, { cutoff: brand ? 2600 : 1600 });
}
// final A chord at 19.0 (with the Hijaz C#), ringing out; one doum under it
kick(drums, 19.0, 0.8); bass(low, 19.0, 33, 0.9, 0.7); noiseHit(tabla, 19.0, { dur: 0.3, vel: 0.4, bp: 140, q: 0.7, tone: 92, seed: 790 });
for (const m of [57, 61, 64, 69, 73, 76]) rhodes(keys, 19.0, m, 1.0, 0.24, { p: (m % 4) / 4 - 0.35 });
pad(pads, 19.0, [45, 52, 57, 61, 64, 69], 1.0, 1.6, { cutoff: 2200 });

// oud motif in A Hijaz: the hook (0–2), answered on the services (4–6), solo in the dark (13–16), resolved on the brand (16–19)
const motif = [[0, 69], [0.5, 70], [0.75, 73], [1, 74], [1.5, 73], [1.75, 70], [2, 69], [3, 76], [3.25, 74], [3.5, 73]];
for (const [b, m] of motif) oud(0.0 + b * BEAT, m, 0.42, 0.2);
for (const [b, m] of [[0, 74], [0.5, 73], [1, 70], [1.5, 69], [2.5, 70], [3, 73]]) oud(4.0 + b * BEAT, m, 0.3, -0.3);
const solo = [[0, 69], [0.25, 70], [0.5, 73], [1, 74], [1.5, 76], [2, 77], [2.25, 76], [2.5, 74], [3, 73], [3.5, 70], [4, 73], [4.5, 74], [5, 73], [5.25, 70], [5.5, 69]];
for (const [b, m] of solo) oud(13.0 + b * BEAT, m, 0.48, 0);
for (const [b, m] of [...motif.slice(0, 7), [3, 73], [3.5, 69]]) oud(16.0 + b * BEAT, m + 12, 0.36, -0.2);
[57, 61, 64, 69, 73].forEach((m, i) => bell(lead, 16.02 + i * 0.045, m + 12, 0.16, { p: -0.5 + i * 0.25, decay: 1.8 }));

// ---------- sound design (only the events that matter) ----------
sweep(fx, 1.6, { dur: 0.35, vel: 0.07, up: true });                                    // the accent word is written
bloop(fx, 2.62, 0.32, { f0: 880, f1: 330 });                                          // the dot appears
riser(fx, 2.72, { dur: 0.3, vel: 0.16, f0: 400, f1: 6000, tonal: 0.3, seed: 31 });     // dot grows
softHit(fx, 3.02, { vel: 0.35, tone: 110 });                                          // blue lands
[3.55, 3.8, 4.05].forEach((t, i) => bloop(fx, t, 0.16, { f0: 1100 + i * 180, f1: 620 + i * 90, p: 0.4 - i * 0.4 }));
whooshBy(fx, 5.68, { dur: 0.5, vel: 0.3, direction: 'lr', low: 200, high: 2400, seed: 33 }); // the push
uiConfirm(fx, 8.0, { vel: 0.17, notes: [88, 95] });                                    // heart on the reel
[9.0, 9.25, 9.5].forEach((t, i) => whooshBy(fx, t - 0.03, { dur: 0.24, vel: 0.24, direction: i % 2 ? 'rl' : 'lr', low: 300, high: 3200, seed: 40 + i }));
click(fx, 9.85, { vel: 0.5, bright: 0.7 });
sweep(fx, 9.88, { dur: 0.22, vel: 0.1, up: true });
for (let i = 0; i < 6; i++) click(fx, 10.0 + i * 0.09, { vel: 0.08, bright: 0.4, p: i % 2 ? 0.4 : -0.4, seed: 70 + i });
[10.55, 11.1, 11.8].forEach(t => uiConfirm(fx, t, { vel: 0.16, notes: [84, 91] }));
[10.75, 11.0, 11.25].forEach((t, i) => click(fx, t, { vel: 0.13, bright: 0.8, p: -0.3 + i * 0.3, seed: 80 + i }));
sweep(fx, 11.75, { dur: 0.25, vel: 0.08, up: true });
whoosh(fx, 12.68, 0.42, 0.22, { f0: 2400, f1: 140, p0: 0, p1: 0, seed: 12 });          // the iris closes
riser(fx, 15.0, { dur: 1.0, vel: 0.22, f0: 300, f1: 9000, tonal: 0.35, seed: 51 });   // into the bloom
impact(fx, 16.0, { vel: 0.5, weight: 0.45 });
bloop(fx, 17.45, 0.18, { f0: 900, f1: 500 });                                         // CTA pill
click(fx, 18.45, { vel: 0.45, bright: 0.7 });
placeCues(fx, plan.cues);

// ---------- processing ----------
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
// time-varying one-pole low-pass: cutoff(t) in Hz
const lpCurve = (bus, cutoff, ta, tb) => { for (const ch of ['L', 'R']) { const x = bus[ch]; let y = 0; for (let i = Math.round(ta * SR); i < Math.min(bus.n, Math.round(tb * SR)); i++) { y += (1 - Math.exp(-2 * Math.PI * cutoff(i / SR) / SR)) * (x[i] - y); x[i] = y; } } };
const sidechain = (bus, depth) => { for (const k of kicks) { const i0 = Math.round(k * SR), n = Math.round(0.24 * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const g = 1 - depth * Math.exp(-i / (0.08 * SR)); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
sidechain(pads, 0.55); sidechain(keys, 0.3); sidechain(low, 0.5);
hp(pads, 120); hp(keys, 140); hp(lead, 160); hp(tabla, 60); hp(fx, 45); hp(drums, 30);
const music = mk();
drums.mixInto(music, 1); tabla.mixInto(music, 1.1); low.mixInto(music, 0.95); keys.mixInto(music, 0.8); pads.mixInto(music, 0.7); lead.mixInto(music, 0.8);
const send = mk(); keys.mixInto(send, 0.35); pads.mixInto(send, 0.3); lead.mixInto(send, 0.5);
reverb(send, { room: 0.8, damp: 0.4 }).mixInto(music, 0.55);
// hook opens from a filtered intro; the dark breakdown is filtered and opens into the 16.0 drop
const lerpE = (a, b, u) => a * Math.pow(b / a, Math.min(1, Math.max(0, u)));
lpCurve(music, t => t < 3.0 ? lerpE(700, 16000, (t - 0.2) / 2.8) : t < 13.0 ? 16000 : t < 16.0 ? lerpE(1100, 16000, (t - 14.6) / 1.4) : 16000, 0, 16.2);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.65, damp: 0.3 }).mixInto(sfx, 0.45);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.5 ? Math.cos(((t - (DUR - 0.5)) / 0.5) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1.1);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 1.1 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film6 score: ${DUR}s, norm ${norm.toFixed(3)}`);
