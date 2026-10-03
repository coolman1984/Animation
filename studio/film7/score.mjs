// Film 7 score — SANAD «معاك سند» — original, 96 BPM (beat 0.625 s, bar 2.5 s, 10 bars = 25.0 s). Calm, premium, hopeful; Western
// cinematic-pop language with a real beat and one hook that comes back. Written on the picture's own event times.
// Form: night (0–5, thin, minor, heavy: heartbeat, a hopeful arpeggio that is dragged down by four low thuds on 2.5/3.125/3.75/4.375,
//   E7 hanging) · the breath (4.85–5.0 cut, 5.0–5.6 a swell) · DAWN: E7 resolves to C major at 5.625 (a deceptive resolution = relief),
//   light groove from 6.25 · GROOVE from 7.5: C G | Am F, the hook (E5 G5 E5 / D5 B4 D5 / C5 E5 C5 / A4 C5 F5) over rhodes, pluck 8ths,
//   soft 909 kick, clap, shaker; builds with each meaning (trust, partnership) · LIFT 15.0 (arrow): F G, riser + impact, more layers ·
//   17.5 «shared»: Am F, warm, no kick-heavy drums · LOGO 20.0: C arrival, impact + shimmer · final C ring under the hold.
// No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, pad, rhodes, pluck, bell, noiseHit, reverb, writeWav, peak, biquad, pan } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film7');
mkdirSync(OUT, { recursive: true });
const CUT = 7.5, SKIP = 10, OUT_DUR = 15; // owner cut: bars 4–7 (the logo build) are removed from the long score
const DUR = 25, BEAT = 0.625, BAR = 2.5, E8 = BEAT / 2, S16 = BEAT / 4, N = DUR + 2;
const mk = () => new Bus(N);
const drums = mk(), low = mk(), pads = mk(), keys = mk(), arp = mk(), lead = mk(), fx = mk();
const kicks = [];

// ---------- voices ----------
function kick909(t, vel = 1) { // soft, round kick: pitch drop 150→46 Hz
  kicks.push(t); const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.42; k++) { const tt = k / SR, f = 46 + 104 * Math.exp(-tt / 0.032); ph += 2 * Math.PI * f / SR;
    const s = Math.tanh(1.6 * Math.sin(ph) * Math.exp(-tt / 0.27)) * 0.78 + (k < 80 ? Math.sin(k * 0.9) * 0.2 * (1 - k / 80) : 0);
    drums.add(i0 + k, s * vel * 0.58); }
}
const clap = (t, v = 0.36) => { for (let i = 0; i < 4; i++) noiseHit(drums, t + i * 0.008, { dur: i === 3 ? 0.1 : 0.01, vel: v * (i === 3 ? 1 : 0.5), bp: 1500, q: 0.8, seed: 31 + i + Math.round(t * 100) }); };
const hat = (t, v = 0.06, open = false, p = 0.25) => noiseHit(drums, t, { dur: open ? 0.09 : 0.02, vel: v, hp: 8500, p, seed: Math.round(t * 1000) });
const shaker = (t, v = 0.03, p = -0.3) => noiseHit(drums, t, { dur: 0.035, vel: v, hp: 6000, p, seed: 900 + Math.round(t * 1000), attack: 0.006 });
function sub(t, midi, dur, vel = 0.7) {
  const i0 = Math.round(t * SR), f = mtof(midi); let ph = 0;
  for (let k = 0; k < (dur + 0.05) * SR; k++) { const tt = k / SR; ph += 2 * Math.PI * f / SR; const env = Math.min(1, tt / 0.008) * (tt > dur ? Math.exp(-(tt - dur) / 0.03) : 1);
    low.add(i0 + k, Math.tanh(1.5 * (Math.sin(ph) + 0.28 * Math.sin(2 * ph))) * env * vel * 0.42); }
}
function tone(bus, t, f0, f1, { dur = 0.25, vel = 0.3, p = 0, glide = 0.04, harm = 0.25 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * 3 * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const tt = k / SR, f = f1 + (f0 - f1) * Math.exp(-tt / glide); ph += (2 * Math.PI * f) / SR; const s = (Math.sin(ph) + harm * Math.sin(2 * ph)) * Math.min(1, tt / 0.002) * Math.exp(-tt / dur) * vel * 0.35; bus.add(i0 + k, s * gl, s * gr); }
}
function glide(bus, t, dur, f0, f1, vel = 0.12, p = 0) { // pitch glide with a smooth envelope (a pen of light drawing)
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const u = k / len, f = f0 * Math.pow(f1 / f0, u * u * (3 - 2 * u)); ph += (2 * Math.PI * f) / SR; const tri = (2 / Math.PI) * Math.asin(Math.sin(ph)); const s = (tri * 0.8 + Math.sin(ph * 2) * 0.12) * Math.sin(Math.PI * u) ** 0.8 * vel; bus.add(i0 + k, s * gl, s * gr); }
}
// warm detuned-saw chord (filter envelope), the pad's "body"
function saw(bus, t, midis, dur, vel, { cut0 = 3200, cut1 = 700, decay = 0.4, p = 0, detune = 0.14, voices = 4, width = 0.5 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round((dur + 0.4) * SR);
  const osc = []; for (const m of midis) for (let v = 0; v < voices; v++) osc.push({ f: mtof(m) * Math.pow(2, ((v - (voices - 1) / 2) * detune) / 12), ph: ((m * 0.137 + v * 0.371) % 1), p: voices > 1 ? (v / (voices - 1) - 0.5) * 2 * width : 0 });
  const st = [{ x1: 0, x2: 0, y1: 0, y2: 0 }, { x1: 0, x2: 0, y1: 0, y2: 0 }]; let co;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    if (k % 32 === 0) { const fc = cut1 + (cut0 - cut1) * Math.exp(-tt / decay), w = 2 * Math.PI * Math.min(fc, SR * 0.45) / SR, c = Math.cos(w), sn = Math.sin(w), a = sn / 1.6; co = [(1 - c) / 2 / (1 + a), (1 - c) / (1 + a), (1 - c) / 2 / (1 + a), -2 * c / (1 + a), (1 - a) / (1 + a)]; }
    let l = 0, r = 0; for (const o of osc) { o.ph = (o.ph + o.f / SR) % 1; const x = 2 * o.ph - 1, [gl, gr] = pan(Math.max(-1, Math.min(1, o.p + p))); l += x * gl; r += x * gr; }
    const env = Math.min(1, tt / 0.012) * (tt > dur ? Math.exp(-(tt - dur) / 0.18) : 1), g = env * vel * 0.3 / Math.sqrt(osc.length);
    const out = [l, r].map((x, ch) => { const S = st[ch], y = co[0] * x + co[1] * S.x1 + co[2] * S.x2 - co[3] * S.y1 - co[4] * S.y2; S.x2 = S.x1; S.x1 = x; S.y2 = S.y1; S.y1 = y; return y; });
    bus.add(i0 + k, out[0] * g, out[1] * g);
  }
}

// ---------- harmony ----------
const CH = {
  Am: { v: [57, 60, 64, 69], r: 33 }, F: { v: [53, 57, 60, 65], r: 29 }, C: { v: [55, 60, 64, 67], r: 36 }, G: { v: [55, 59, 62, 67], r: 31 },
  E7: { v: [52, 56, 59, 62], r: 28 }, Cm9: { v: [55, 59, 62, 64, 71], r: 36 }, Am9: { v: [57, 60, 64, 67, 71], r: 33 },
};
// chord of every 1.25 s (a half-bar)
const HALF = 2 * BEAT;
const PROG = [ // [start, chord]
  [0, 'Am9'], [2.5, 'F'], [3.75, 'E7'], [5.625, 'C'], [6.875, 'G'],
  [7.5, 'C'], [8.75, 'G'], [10, 'Am'], [11.25, 'F'], [12.5, 'C'], [13.75, 'G'], [15, 'F'], [16.25, 'G'], [17.5, 'Am'], [18.75, 'F'],
  [20, 'C'], [21.25, 'G'], [22.5, 'F'], [23.75, 'C'],
];
const chordAt = (t) => { let c = PROG[0]; for (const p of PROG) if (p[0] <= t + 1e-6) c = p; return c; };
// hook per chord (eighth index within the half-bar, midi, length in eighths)
const HOOK = {
  C: [[0, 76, 2], [2, 79, 1], [3, 76, 1]], G: [[0, 74, 2], [2, 71, 1], [3, 74, 1]], Am: [[0, 72, 2], [2, 76, 1], [3, 72, 1]], F: [[0, 69, 2], [2, 72, 1], [3, 77, 1]],
};
// build lanes per section: [from, to, level]
const lvl = (t, lanes) => { for (const [a, b, v] of lanes) if (t >= a && t < b) return v; return 0; };
const DRUMS = [[6.25, 7.5, 0.5], [7.5, 10, 0.8], [10, 12.5, 0.9], [12.5, 15, 1.0], [15, 17.5, 1.1], [17.5, 20, 0.62], [20, 22.5, 1.12], [22.5, 23.75, 0.75]];
const HOOKL = [[7.5, 10, 0.5], [10, 12.5, 0.6], [12.5, 15, 0.7], [15, 17.5, 0.85], [17.5, 20, 0.55], [20, 22.5, 0.95], [22.5, 23.75, 0.6]];
const ARPL = [[7.5, 10, 0.5], [10, 12.5, 0.8], [12.5, 15, 1], [15, 17.5, 1.1], [17.5, 20, 0.7], [20, 22.5, 1], [22.5, 23.75, 0.6]];
const PADL = [[5.625, 7.5, 0.7], [7.5, 10, 0.8], [10, 12.5, 0.9], [12.5, 15, 1], [15, 17.5, 1.1], [17.5, 20, 0.9], [20, 22.5, 1.05], [22.5, 23.75, 0.85]];

// ---------- 0–5 · night: thin, minor and heavy ----------
pad(pads, 0, CH.Am9.v, 2.45, 1.7, { cutoff: 760 });
sub(0.05, 33, 2.3, 0.45);
for (const t of [0.625, 1.875]) { kick909(t, 0.5); kick909(t + 0.2, 0.3); }                   // heartbeat
[57, 60, 64, 69, 72, 76].forEach((m, i) => rhodes(keys, 0.62 + i * 0.27, m, 0.4, 0.2 + i * 0.015, { p: -0.3 + i * 0.12 })); // the line climbs, hopeful
bell(keys, 1.95, 88, 0.1, { decay: 1.0, p: 0.3 });
for (let i = 0; i < 6; i++) click(keys, 1.25 + i * 0.3125, { vel: 0.035 + i * 0.01, bright: 0.85, p: i % 2 ? 0.3 : -0.3, seed: 100 + i }); // a clock beginning to tick
pad(pads, 2.5, CH.F.v, 1.3, 1.5, { cutoff: 680 });
pad(pads, 3.75, CH.E7.v, 1.3, 1.5, { cutoff: 620 });
sub(2.5, 29, 1.2, 0.5); sub(3.75, 28, 1.2, 0.5);
// four weights: a thud each, one beat apart, each lower and heavier
[[2.5, 36, 0.5], [3.125, 34, 0.55], [3.75, 32, 0.6], [4.375, 30, 0.66]].forEach(([t, m, v], i) => { kick909(t, v + 0.15); softHit(fx, t, { vel: 0.5 + i * 0.07, tone: 96 - i * 8, p: -0.25 + i * 0.16 }); sub(t, m - 12, 0.5, 0.6 + 0.05 * i); });
for (const t of [2.5, 3.125, 3.75, 4.375]) whooshBy(fx, t - 0.14, { dur: 0.34, vel: 0.06, direction: 'center', low: 300, high: 1500, seed: Math.round(t * 10) });
sweep(fx, 1.7, { dur: 1.2, vel: 0.05, up: true, seed: 3 });
bell(fx, 4.45, 57, 0.12, { decay: 1.8 });
riser(fx, 5.0, { dur: 0.55, vel: 0.1, f0: 200, f1: 1800, tonal: 0.1, seed: 5 });             // a held breath

// ---------- 5–7.5 · the dawn ----------
pad(pads, 5.0, [60, 64, 67, 71, 76], 2.5, 1.9, { cutoff: 2300 });                           // the swell opens on the breath
riser(fx, 5.625, { dur: 0.62, vel: 0.22, f0: 300, f1: 7000, tonal: 0.3, seed: 6 });
sweep(fx, 5.9, { dur: 1.4, vel: 0.09, up: true, seed: 7 });                                  // the ground rising
bell(fx, 5.06, 93, 0.14, { decay: 1.8, p: 0.2 });
for (const [i, m] of [[0, 72], [1, 76], [2, 79], [3, 83], [4, 88]]) bell(keys, 5.625 + i * 0.08, m, 0.15, { decay: 1.4, p: -0.3 + i * 0.15 });
sub(5.625, 36, 1.8, 0.7); kick909(5.625, 0.55);
saw(pads, 5.625, CH.C.v, 1.25, 0.34, { cut0: 3400, cut1: 1100, decay: 0.7 });

// ---------- 6.25–25 · groove: kick, clap, shaker, hats; sub bass; rhodes comping; pluck 8ths; the hook ----------
const END = 23.75;
for (let t = 6.25; t < END - 1e-6; t += BEAT) {
  const bar = Math.floor(t / BAR + 1e-6), beat = Math.round((t - bar * BAR) / BEAT), d = lvl(t, DRUMS);
  if (!d) continue;
  if (beat === 0 || beat === 2) kick909(t, 0.8 * d);
  if (beat === 1 || beat === 3) if (t >= 7.5 && t < 17.5 || t >= 20) clap(t, 0.34 * d);
  if (t >= 7.5) { hat(t + E8, 0.055 * d, beat === 3, 0.3); hat(t, 0.03 * d, false, -0.25); }
  for (let s = 0; s < 4; s++) if (t >= 7.5 && t < END && d > 0.7) shaker(t + s * S16, (s % 2 ? 0.026 : 0.016) * d);
}
// ghost kick on the "and" of 3 in the fuller sections (the groove's push)
for (let t = 12.5 + 2 * BEAT + E8; t < 22.5; t += BAR) kick909(t, 0.42);
for (let t = 7.5 + 2 * BEAT + E8; t < 12.5; t += BAR) kick909(t, 0.3);
// per half-bar
for (let k = 0; k < 13; k++) {
  const t0 = 7.5 + k * HALF;
  const [, name] = chordAt(t0);
  const c = CH[name];
  {
    const pl = lvl(t0, PADL), al = lvl(t0, ARPL), hl = lvl(t0, HOOKL);
    if (pl) saw(pads, t0, c.v, HALF * 0.98, 0.3 * pl, { cut0: 2400 + 800 * pl, cut1: 900, decay: 0.5, p: 0 });
    // sub: root on the beat, a syncopated pop on the "and" of 2 (eighth 3) and the octave on the last eighth
    sub(t0, c.r + 12, E8 * 2.85, 0.62 * Math.min(1.1, pl)); sub(t0 + E8 * 3, c.r + 12, E8 * 0.9, 0.5 * pl);
    // rhodes comp on eighth 0 and 3
    for (const e of [0, 3]) c.v.slice(0, 3).forEach((m, i) => rhodes(keys, t0 + e * E8 + i * 0.006, m + 12, E8 * 1.6, 0.17 * Math.min(1, pl), { p: -0.2 + i * 0.2, trem: 0.1 }));
    // pluck arpeggio, 4 eighths
    if (al) [0, 1, 2, 1].forEach((n, e) => pluck(arp, t0 + e * E8, c.v[n] + 24, 0.2 * al, { p: e % 2 ? 0.4 : -0.4, damp: 0.55, decay: 0.995, bright: 0.7, seed: 5 + k }));
    // hook (rhodes + a soft bell on top)
    if (hl) for (const [e, m, len] of HOOK[name] || []) { rhodes(lead, t0 + e * E8, m, len * E8 * 0.9, 0.34 * hl, { p: 0.15, trem: 0.06 }); if (len >= 2) bell(lead, t0 + e * E8, m + 12, 0.1 * hl, { decay: 0.7, p: 0.2 }); }
  }
}
// dawn comping: rhodes on C and G before the groove
for (const [t, name] of [[5.625, 'C'], [6.875, 'G']]) CH[name].v.slice(0, 3).forEach((m, i) => rhodes(keys, t + 0.03 + i * 0.008, m + 12, 1.0, 0.16, { p: -0.2 + i * 0.2, trem: 0.1 }));
sub(6.875, 31 + 12, HALF * 0.9, 0.55);

// ---------- the story's events ----------
sweep(fx, 7.7, { dur: 0.9, vel: 0.08, up: true, seed: 11 });                                // the outline draws
click(fx, 8.05, { vel: 0.35, bright: 0.7 }); bell(fx, 8.3, 88, 0.12, { decay: 1.0 });       // the halves meet (impact comes from the cue sheet)
whooshBy(fx, 8.85, { dur: 0.6, vel: 0.1, direction: 'lr', low: 600, high: 5000, seed: 12 }); // light sweep across the shield
[[10.0, 83], [10.0, 90]].forEach(([t, m], i) => bell(fx, t + i * 0.04, m, 0.1, { decay: 1.4, p: 0.2 })); // trust
glide(fx, 10.05, 1.65, 520, 1560, 0.045, 0.3);                                               // the light running round the shield
glide(fx, 12.5, 1.55, 392, 1175, 0.06, -0.2);                                                // the pen drawing the ribbon
bell(fx, 14.02, 91, 0.12, { decay: 1.6 });
whooshBy(fx, 14.5, { dur: 0.6, vel: 0.1, direction: 'lr', low: 500, high: 5200, seed: 13 }); // light sweep across the ribbon
riser(fx, 15.0, { dur: 0.9, vel: 0.2, f0: 300, f1: 9000, tonal: 0.3, seed: 14 });             // growth: the arrow is about to spring
for (let i = 0; i < 5; i++) bell(fx, 15.02 + i * 0.07, [79, 83, 86, 91, 95][i], 0.11, { decay: 1.2, p: -0.4 + i * 0.2 });
noiseHit(fx, 15.0, { dur: 0.9, vel: 0.12, hp: 7000, seed: 15, attack: 0.02 });                // a soft cymbal swell
sweep(fx, 16.05, { dur: 1.4, vel: 0.08, up: true, seed: 16 });                              // the trail climbing out of frame
whooshBy(fx, 17.35, { dur: 0.6, vel: 0.1, direction: 'center', low: 250, high: 2400, seed: 17 }); // the icon climbs to the top
[17.8125, 18.125, 18.4375, 18.75].forEach((t, i) => { tone(fx, t, 700 + i * 90, 1000 + i * 90, { dur: 0.1, vel: 0.2, glide: 0.05, p: -0.1 + i * 0.07 }); uiConfirm(fx, t + 0.3125, { vel: 0.13, notes: [79 + i * 2, 86 + i * 2], gap: 0.06 }); }); // rows land, checks tick
whooshBy(fx, 20.0 - 0.1, { dur: 0.5, vel: 0.1, direction: 'center', low: 200, high: 2000, seed: 18 });
for (let k = 0; k < 5; k++) click(fx, 20.2 + k * 0.12 + 0.2, { vel: 0.06, bright: 0.9, p: -0.3 + k * 0.15, seed: 200 + k }); // letters resolve
bell(fx, 21.15, 96, 0.12, { decay: 1.2 });
[0, 1, 2].forEach((i) => bell(fx, 21.55 + i * 0.07, 88 + i * 4, 0.07, { decay: 0.8, p: -0.3 + i * 0.3 }));
whooshBy(fx, 22.7, { dur: 0.7, vel: 0.1, direction: 'lr', low: 500, high: 5200, seed: 19 }); // glint across the wordmark
tone(fx, 23.3, 800, 1300, { dur: 0.08, vel: 0.22 }); uiConfirm(fx, 23.55, { vel: 0.18, notes: [84, 91] });
sweep(fx, 24.5, { dur: 0.8, vel: 0.06, up: true, seed: 20 });

// ---------- logo + final chord ----------
[67, 72, 76, 79, 84, 88].forEach((m, i) => bell(fx, 20.03 + i * 0.05, m, 0.13, { decay: 1.8, p: -0.5 + i * 0.2 }));
// the final C: pad + rhodes + a long bell, ringing under the hold
saw(pads, 23.75, [48, 55, 60, 64, 67, 71], 1.25, 0.34, { cut0: 3000, cut1: 1000, decay: 0.9, voices: 5, width: 0.7 });
kick909(23.75, 0.7); sub(23.75, 36, 1.25, 0.75);
[72, 76, 79, 83, 88].forEach((m, i) => bell(fx, 23.78 + i * 0.07, m, 0.1, { decay: 2.4, p: -0.4 + i * 0.2 }));
// cue sheet is in the short (delivered) timeline; the score is composed on the long one and spliced below
placeCues(fx, plan.cues.map((c) => ({ ...c, t: c.t < CUT ? c.t : c.t + SKIP })));
bell(fx, 17.52, 84, 0.12, { decay: 1.4 }); whooshBy(fx, 17.5, { dur: 0.5, vel: 0.08, direction: 'center', low: 400, high: 3000, seed: 33 }); // the finished logo enters

// ---------- processing ----------
const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(pads, 0.55); pump(low, 0.4, 0.1); pump(arp, 0.25, 0.1); pump(lead, 0.15, 0.08);
// the breath before the dawn: everything but the reverb tail is cut for a moment
const cut = (bus, t0, t1, t2) => { for (let i = Math.round(t0 * SR); i < Math.min(bus.n, Math.round(t2 * SR)); i++) { const t = i / SR, g = t < t1 ? 1 - (t - t0) / (t1 - t0) : Math.min(1, (t - t1) / (t2 - t1)); bus.L[i] *= g; bus.R[i] *= g; } };
for (const b of [drums, low, keys, arp, lead]) cut(b, 4.82, 4.98, 5.0 + 1e-3);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(pads, 150); hp(arp, 200); hp(lead, 220); hp(keys, 160); hp(fx, 40);
let music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.75); pads.mixInto(music, 1.25); keys.mixInto(music, 1.3); arp.mixInto(music, 1.35); lead.mixInto(music, 1.2);
const send = mk(); pads.mixInto(send, 0.4); keys.mixInto(send, 0.55); arp.mixInto(send, 0.5); lead.mixInto(send, 0.6);
reverb(send, { room: 0.86, damp: 0.4 }).mixInto(music, 0.75);
hp(music, 28);
let sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.45); reverb(sendF, { room: 0.74, damp: 0.3 }).mixInto(sfx, 0.5);
// splice: [0, 7.5) + [17.5, 25) with a 20 ms equal-power crossfade at the bar line, then the end fade
const splice = (b) => {
  const o = new Bus(OUT_DUR), c = Math.round(CUT * SR), sk = Math.round(SKIP * SR), xf = Math.round(0.02 * SR);
  for (let i = 0; i < o.n; i++) {
    let l, r;
    if (i < c - xf) { l = b.L[i]; r = b.R[i]; }
    else if (i < c) { const u = (i - (c - xf)) / xf, ga = Math.cos(u * Math.PI / 2), gb = Math.sin(u * Math.PI / 2); l = b.L[i] * ga + b.L[i + sk] * gb; r = b.R[i] * ga + b.R[i + sk] * gb; }
    else { l = b.L[i + sk] || 0; r = b.R[i + sk] || 0; }
    const t = i / SR, g = t > OUT_DUR - 0.6 ? Math.cos(((t - (OUT_DUR - 0.6)) / 0.6) * Math.PI / 2) : 1;
    o.L[i] = l * g; o.R[i] = r * g;
  }
  return o;
};
music = splice(music); sfx = splice(sfx);
const mix = new Bus(OUT_DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 0.9);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 0.9 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film7 score: ${OUT_DUR}s (cut from ${DUR}s) 96 BPM, norm ${norm.toFixed(3)}`);
