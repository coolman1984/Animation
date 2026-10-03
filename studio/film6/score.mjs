// Film 6 score — original, 120 BPM (beat 0.5 s, bar 2 s), 15 bars = 30.0 s, A minor. Written to production.json's cue sheet
// and to the picture's own event times (every interaction has its foley: lands, taps, pops, typing, morph whooshes).
// Form: intro (pad + ticks, 0–4) · DROP on 4.0 (four-on-the-floor tech-pop, ads) · bouncy half-time (animation, tuned bounce
// plucks, heartbeat kicks 13.5–15) · dark filtered 16th arp (software, typing clicks) · three stabs 22.0/22.5/23.0, a reverse
// swell and a breath before 24.0 · logo: impact, pixel shimmer, plus ping, light groove, final chord rings to 30.0.
// No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, bass, pad, kick, noiseHit, bell, reverb, writeWav, peak, biquad, rng, pan, bloop } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film6');
mkdirSync(OUT, { recursive: true });
const DUR = 30, BEAT = 0.5, BAR = 2, E8 = 0.25, S16 = 0.125, N = DUR + 2;
const mk = () => new Bus(N);
const drums = mk(), low = mk(), pads = mk(), arp = mk(), lead = mk(), fx = mk(), keys = mk();
const kicks = [];
const K = (t, v = 0.8) => { kick(drums, t, v); kicks.push(t); };

// ---------- local voices ----------
// Detuned-saw stab with a filter envelope (modern pluck/stab). midis: array; dur: gate.
function saw(bus, t, midis, dur, vel = 0.3, { cut0 = 5200, cut1 = 700, decay = 0.18, p = 0, detune = 0.12, voices = 3 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round((dur + 0.35) * SR), [gl, gr] = pan(p);
  const osc = []; for (const m of midis) for (let v = 0; v < voices; v++) osc.push({ f: mtof(m) * Math.pow(2, ((v - (voices - 1) / 2) * detune) / 12), ph: (m * 0.13 + v * 0.37) % 1 });
  let st = { x1: 0, x2: 0, y1: 0, y2: 0 }, co = null;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    if (k % 32 === 0) { const fc = cut1 + (cut0 - cut1) * Math.exp(-tt / decay), w = (2 * Math.PI * Math.min(fc, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * 0.9); co = { b0: (1 - c) / 2 / (1 + a), b1: (1 - c) / (1 + a), b2: (1 - c) / 2 / (1 + a), a1: (-2 * c) / (1 + a), a2: (1 - a) / (1 + a) }; }
    let x = 0; for (const o of osc) { o.ph = (o.ph + o.f / SR) % 1; x += 2 * o.ph - 1; }
    x /= Math.sqrt(osc.length);
    const y = co.b0 * x + co.b1 * st.x1 + co.b2 * st.x2 - co.a1 * st.y1 - co.a2 * st.y2; st = { x2: st.x1, x1: x, y2: st.y1, y1: y };
    const env = Math.min(1, tt / 0.004) * (tt > dur ? Math.exp(-(tt - dur) / 0.08) : 1) * Math.exp(-tt / (dur * 2 + 0.2));
    const v = y * env * vel * 0.35; bus.add(i0 + k, v * gl, v * gr);
  }
}
// Sine with a pitch drop and a soft tail: tuned "boing" for the ball, "pop" for UI elements.
function tone(bus, t, f0, f1, { dur = 0.25, vel = 0.3, p = 0, glide = 0.04, harm = 0.25 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * 3 * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const tt = k / SR, f = f1 + (f0 - f1) * Math.exp(-tt / glide); ph += (2 * Math.PI * f) / SR; const s = (Math.sin(ph) + harm * Math.sin(2 * ph)) * Math.min(1, tt / 0.002) * Math.exp(-tt / dur) * vel * 0.35; bus.add(i0 + k, s * gl, s * gr); }
}
// Pitch glide over [t, t+dur] (the curve being dragged).
function glide(bus, t, dur, f0, f1, vel = 0.12, p = 0) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const u = k / len, f = f0 * Math.pow(f1 / f0, u * u * (3 - 2 * u)); ph += (2 * Math.PI * f) / SR; const tri = (2 / Math.PI) * Math.asin(Math.sin(ph)); const s = tri * Math.sin(Math.PI * u) ** 0.7 * vel; bus.add(i0 + k, s * gl, s * gr); }
}
const clap = (t, v = 0.3, p = 0) => { for (let i = 0; i < 3; i++) noiseHit(drums, t + i * 0.009, { dur: i === 2 ? 0.09 : 0.012, vel: v * (i === 2 ? 1 : 0.6), bp: 1300, q: 0.9, p, seed: 60 + i + Math.round(t * 10) }); };
const hat = (t, v = 0.05, open = false, p = 0.2) => noiseHit(drums, t, { dur: open ? 0.08 : 0.018, vel: v, hp: 8200, p, seed: Math.round(t * 1000) });
const rim = (t, v = 0.12) => noiseHit(drums, t, { dur: 0.015, vel: v, bp: 2400, q: 3, tone: 800, seed: 41 + Math.round(t * 8) });

// chords
const CH = {
  Am9: { v: [57, 60, 64, 67, 71], root: 33 }, Am: { v: [57, 60, 64, 69], root: 33 }, F: { v: [53, 57, 60, 64], root: 29 },
  C: { v: [55, 60, 64, 67], root: 36 }, G: { v: [55, 59, 62, 67], root: 31 }, Dm: { v: [53, 57, 60, 62], root: 38 }, E7: { v: [52, 56, 59, 62], root: 28 },
};
const arpNotes = (c) => [...c.v.map((m) => m + 12), c.v[1] + 24, c.v[2] + 24];

// ---------- 0–4 · intro: Am9 → Fmaj7 pad, clock ticks, a quiet motif; the dive pulls into the drop ----------
pad(pads, 0, CH.Am9.v, BAR + 0.2, 2.3, { cutoff: 1900 }); pad(pads, 2, CH.F.v, BAR, 2.3, { cutoff: 2200 });
bass(low, 0, 45, BAR * 0.9, 0.34); bass(low, 2, 41, BAR * 0.9, 0.34);
for (let e = 0; e < 16; e++) hat(e * E8, e % 2 ? 0.022 : 0.035, false, e % 2 ? 0.35 : -0.35);
[[0.75, 76], [1.0, 79], [1.3, 83], [1.55, 81], [2.4, 88], [2.75, 84], [3.0, 81]].forEach(([t, m], i) => bell(keys, t, m, 0.13, { p: i % 2 ? 0.4 : -0.4, decay: 0.9 }));
tone(fx, 0.5, 520, 150, { dur: 0.14, vel: 0.55 }); kick(fx, 0.5, 0.35);                   // the pixel lands
whooshBy(fx, 0.42, { dur: 0.45, vel: 0.12, direction: 'center', low: 900, high: 5000, seed: 3 }); // falling
tone(fx, 2.0, 300, 900, { dur: 0.1, vel: 0.28, glide: 0.06 }); tone(fx, 2.4, 700, 260, { dur: 0.08, vel: 0.32 }); // hop + full stop lands
click(fx, 3.5, { vel: 0.5, bright: 0.7 });
riser(fx, 4.0, { dur: 1.2, vel: 0.32, f0: 300, f1: 9000, tonal: 0.3, seed: 12 });
for (let i = 0; i < 8; i++) noiseHit(drums, 3.5 + i * (S16 / 2) * (1 + i * 0.02), { dur: 0.03, vel: 0.05 + i * 0.02, bp: 1700, q: 0.8, tone: 220, seed: 300 + i }); // fill into the drop
whooshBy(fx, 3.92, { dur: 0.5, vel: 0.22, direction: 'center', low: 200, high: 2600, seed: 4 });
// intro presence: a filtered pulse under the hook (opens at the drop) and the pixel motif in the mids
for (let b = 1; b < 7; b++) { kick(drums, b * BEAT, 0.42); }
for (let s = 0; s < 28; s++) if (s % 2) hat(s * S16 + 0.5, 0.018, false, 0.1);
[[0.5, 81], [0.75, 76], [1.0, 84], [1.5, 83], [2.0, 81], [2.25, 76], [2.5, 79], [3.0, 76]].forEach(([t, m], i) => saw(lead, t, [m], 0.09, 0.2, { cut0: 3800, cut1: 900, decay: 0.07, p: i % 2 ? 0.3 : -0.3, voices: 2 }));


// ---------- 4–10 · ADS: the drop ----------
const ADS = ['Am', 'F', 'C'];
for (let bar = 2; bar < 5; bar++) {
  const t0 = bar * BAR, c = CH[ADS[bar - 2]];
  for (let b = 0; b < 4; b++) { K(t0 + b * BEAT, 0.85); hat(t0 + b * BEAT + E8, 0.07, true, 0.25); }
  for (const b of [1, 3]) clap(t0 + b * BEAT, 0.26);
  for (let s = 0; s < 16; s++) if (s % 4 !== 2) hat(t0 + s * S16, s % 2 ? 0.02 : 0.03, false, -0.3);
  for (let e = 0; e < 8; e++) bass(low, t0 + e * E8, c.root + (e % 4 === 3 ? 12 : 0) + 12, E8 * 0.7, 0.5);
  pad(pads, t0, c.v, BAR + 0.2, 1.4, { cutoff: 2400 });
  const an = arpNotes(c); for (let s = 0; s < 16; s++) saw(arp, t0 + s * S16, [an[s % an.length]], 0.07, s % 4 === 0 ? 0.24 : 0.16, { cut0: 4200, cut1: 900, decay: 0.06, p: s % 2 ? 0.45 : -0.45, voices: 2 });
  if (bar === 4) { saw(lead, t0 + 1.0, CH.G.v, 0.4, 0.22, { cut0: 6000, cut1: 1200 }); }
}
// the hook melody of the ads section (two-bar phrase in A minor, answered on the third bar)
const MEL = [[0, 76, 0.5], [0.75, 79, 0.25], [1, 81, 0.5], [1.75, 84, 0.25], [2, 83, 0.5], [2.5, 81, 0.5], [3, 79, 0.75],
  [4, 77, 0.5], [4.75, 76, 0.25], [5, 77, 0.5], [5.5, 81, 0.5], [6, 79, 1.0], [8, 76, 0.5], [8.75, 79, 0.25], [9, 81, 0.5], [9.5, 84, 0.5], [10, 88, 1.5]];
for (const [b, m, d] of MEL) saw(lead, 4.0 + b * BEAT, [m], d * BEAT * 0.8, 0.26, { cut0: 5200, cut1: 1300, decay: 0.12, p: 0.1, voices: 3, detune: 0.1 });
impact(fx, 4.0, { vel: 0.5, weight: 0.5 }); tone(fx, 4.12, 1200, 600, { dur: 0.08, vel: 0.25 });   // frame pops open
[4.5, 4.58, 4.66].forEach((t, i) => bloop(fx, t, 0.4, { f0: 1300 + i * 250, f1: 700 + i * 150, p: 0.5 }));  // reaction icons
click(fx, 5.0, { vel: 0.45, bright: 0.8, p: 0.4 }); tone(fx, 5.0, 1500, 1500, { dur: 0.18, vel: 0.3, p: 0.4 }); bell(keys, 5.02, 93, 0.2, { p: 0.4, decay: 0.6 });
{ const pent = [81, 84, 86, 88, 91, 93, 96]; for (let i = 0; i < 16; i++) bell(keys, 5.04 + i * 0.16, pent[Math.floor(rng(70 + i)() * pent.length)], 0.06 + 0.04 * rng(90 + i)(), { p: rng(110 + i)() * 1.6 - 0.8, decay: 0.5 }); } // hearts rising
whooshBy(fx, 6.0, { dur: 0.32, vel: 0.2, direction: 'lr', low: 300, high: 3000, seed: 6 }); whooshBy(fx, 6.5, { dur: 0.32, vel: 0.2, direction: 'rl', low: 300, high: 3000, seed: 7 });
softHit(fx, 7.1, { vel: 0.35, tone: 220 });
saw(lead, 7.0, CH.G.v.map((m) => m + 12), 0.25, 0.14, { cut0: 7000, cut1: 1500, p: 0.2 });
sweep(fx, 9.55, { dur: 0.4, vel: 0.14, up: false, seed: 14 });          // the frame collapses into a ball
whooshBy(fx, 9.9, { dur: 0.45, vel: 0.2, direction: 'center', low: 250, high: 2200, seed: 8 }); // circle wipe

// ---------- 10–16 · ANIMATION: bouncy half-time ----------
const ANI = ['Am', 'F', 'G'];
for (let bar = 5; bar < 8; bar++) {
  const t0 = bar * BAR, c = CH[ANI[bar - 5]];
  pad(pads, t0, c.v, BAR + 0.2, 1.3, { cutoff: 2000 });
  bass(low, t0, c.root + 12, BEAT * 0.8, 0.5); bass(low, t0 + 1.5 * BEAT, c.root + 12, BEAT * 0.4, 0.38); bass(low, t0 + 2.5 * BEAT, c.root + 19, BEAT * 0.4, 0.34);
  for (let e = 0; e < 8; e++) hat(t0 + e * E8, e % 2 ? 0.025 : 0.04, e === 7, 0.3);
  if (bar < 7) { K(t0, 0.8); clap(t0 + 2 * BEAT, 0.2); K(t0 + 2.75 * BEAT, 0.5); hat(t0 + 3.5 * BEAT, 0.06, true); }
  const mar = [c.v[2] + 12, c.v[3] + 12, c.v[1] + 12, c.v[2] + 12]; mar.forEach((m, i) => tone(keys, t0 + i * BEAT + (i % 2 ? E8 : 0), mtof(m), mtof(m), { dur: 0.16, vel: 0.12, p: i % 2 ? 0.5 : -0.5, harm: 0.1 }));
}
[[10.5, 76, 0.5], [11.25, 72, 0.38], [11.75, 69, 0.28], [12.0, 64, 0.18]].forEach(([t, m, v]) => { tone(fx, t, mtof(m) * 1.6, mtof(m), { dur: 0.22, vel: v, glide: 0.025 }); kick(fx, t, v * 0.5); }); // bounces
tone(fx, 10.0, 900, 900, { dur: 0.05, vel: 0.08 });
bell(keys, 12.3, 88, 0.12, { decay: 0.6 }); bell(keys, 12.42, 95, 0.1, { decay: 0.6 });  // keyframes appear
click(fx, 12.6, { vel: 0.4, bright: 0.6, p: -0.3 }); glide(fx, 12.62, 0.4, 330, 880, 0.1, -0.2);  // grab + drag the handle
whooshBy(fx, 13.2, { dur: 0.45, vel: 0.16, direction: 'lr', low: 400, high: 3200, seed: 9 }); // the ball rides the curve
for (const tb of [13.5, 14.0, 14.5]) { kick(fx, tb, 0.7); kick(fx, tb + 0.17, 0.42); }      // heartbeat
tone(fx, 15.05, 700, 1100, { dur: 0.08, vel: 0.22 });                                        // toggle appears
click(fx, 15.5, { vel: 0.6, bright: 0.5 }); tone(fx, 15.52, 600, 140, { dur: 0.25, vel: 0.3, glide: 0.1 }); // switch → dark
sweep(fx, 15.85, { dur: 0.5, vel: 0.16, up: false, seed: 16 });

// ---------- 16–22 · SOFTWARE: dark, filtered 16th arp, typing ----------
const SW = ['Am', 'Dm', 'E7'];
for (let bar = 8; bar < 11; bar++) {
  const t0 = bar * BAR, c = CH[SW[bar - 8]];
  pad(pads, t0, c.v.map((m) => m - 12), BAR + 0.2, 1.5, { cutoff: 900 });
  for (let b = 0; b < 4; b++) K(t0 + b * BEAT, b % 2 ? 0.6 : 0.8);
  for (const b of [1, 3]) rim(t0 + b * BEAT, 0.2);
  for (let s = 0; s < 16; s++) hat(t0 + s * S16, s % 4 === 2 ? 0.05 : 0.018, s % 4 === 2, s % 2 ? 0.4 : -0.4);
  for (let e = 0; e < 8; e++) bass(low, t0 + e * E8, c.root + 12, E8 * 0.55, e % 2 ? 0.35 : 0.5);
  const an = arpNotes(c).map((m) => m - 12); for (let s = 0; s < 16; s++) saw(arp, t0 + s * S16, [an[(s * 3) % an.length]], 0.06, 0.2, { cut0: 2200 + 1600 * ((bar - 8) / 2), cut1: 500, decay: 0.05, p: s % 2 ? 0.5 : -0.5, voices: 2 });
}
impact(fx, 16.0, { vel: 0.4, weight: 0.6 });
whooshBy(fx, 16.12, { dur: 0.28, vel: 0.14, direction: 'center', low: 500, high: 3500, seed: 17 }); // switch → button
click(fx, 16.5, { vel: 0.5, bright: 0.7 });
for (let i = 0; i < 12; i++) click(fx, 16.6 + i * 0.033, { vel: 0.06, bright: 0.95, seed: 400 + i }); // spinner
uiConfirm(fx, 17.0, { vel: 0.28, notes: [81, 88] });
whooshBy(fx, 17.3, { dur: 0.4, vel: 0.18, direction: 'center', low: 250, high: 2400, seed: 18 }); // editor opens
{ const r = rng(55); for (let t = 17.45; t < 18.65; t += 1 / 76 * 3) click(keys, t + r() * 0.01, { vel: 0.05 + r() * 0.05, bright: 0.85 + r() * 0.1, p: r() * 0.6 - 0.3, seed: Math.round(t * 1000) }); } // typing
whooshBy(fx, 18.8, { dur: 0.4, vel: 0.2, direction: 'center', low: 300, high: 3000, seed: 19 }); // code → app
saw(lead, 18.85, CH.E7.v.map((m) => m + 12), 0.5, 0.12, { cut0: 6000, cut1: 1500 });
[0, 1, 2, 3, 4, 5].forEach((i) => bell(keys, 19.0 + i * 0.15, [76, 79, 83, 86, 88, 91][i], 0.08, { p: -0.5 + i * 0.2, decay: 0.5 })); // chart rises
softHit(fx, 19.3, { vel: 0.3, tone: 196 });
riser(fx, 22.0, { dur: 1.4, vel: 0.3, f0: 260, f1: 9500, tonal: 0.25, seed: 41 });
for (let i = 0; i < 8; i++) noiseHit(drums, 21.5 + i * S16 / 2 * 2, { dur: 0.04, vel: 0.06 + i * 0.025, bp: 1800, q: 0.8, tone: 210, seed: 500 + i }); // fill

// ---------- 22–24 · three stabs, reverse swell, a breath ----------
[[22.0, 'F', -0.5], [22.5, 'G', 0.5], [23.0, 'E7', 0]].forEach(([t, ch, p], i) => {
  impact(fx, t, { vel: 0.7, weight: 0.7, p: p * 0.6 }); K(t, 0.9);
  saw(lead, t, CH[ch].v.map((m) => m + 12), 0.32, 0.3, { cut0: 8000, cut1: 1400, decay: 0.12, p });
  bass(low, t, CH[ch].root + 12, 0.4, 0.6);
  whooshBy(fx, t - 0.02, { dur: 0.25, vel: 0.16, direction: i === 0 ? 'rl' : i === 2 ? 'lr' : 'center', low: 400, high: 4000, seed: 20 + i });
});
pad(pads, 22.0, CH.E7.v, 1.6, 1.0, { cutoff: 2600 });
riser(fx, 23.86, { dur: 0.5, vel: 0.34, f0: 400, f1: 11000, tonal: 0.2, seed: 51, tail: 0.002 }); // implosion suck
sweep(fx, 23.7, { dur: 0.35, vel: 0.18, up: true, seed: 22 });

// ---------- 24–30 · LOGO ----------
impact(fx, 24.0, { vel: 0.95, weight: 0.9 }); K(24.0, 1.0);
pad(pads, 24.0, CH.Am9.v, BAR + 0.3, 2.2, { cutoff: 3200 }); bass(low, 24.0, 33, 1.8, 0.75);
[57, 64, 69, 72, 76, 81].forEach((m, i) => bell(keys, 24.02 + i * 0.045, m + 12, 0.16, { p: -0.5 + i * 0.2, decay: 1.6 }));
{ const r = rng(77), pent = [81, 84, 86, 88, 91, 93, 96, 98]; for (let i = 0; i < 46; i++) { const t = 24.05 + Math.pow(r(), 0.8) * 0.85; bell(keys, t, pent[Math.floor(r() * pent.length)], 0.025 + r() * 0.035, { p: r() * 2 - 1, decay: 0.3 }); if (i % 2) click(fx, t, { vel: 0.04, bright: 0.95, p: r() * 2 - 1, seed: 700 + i }); } } // 1,699 pixels landing
tone(fx, 24.5, 1300, 520, { dur: 0.1, vel: 0.3 }); tone(fx, 24.0, 300, 900, { dur: 0.12, vel: 0.2, glide: 0.08 }); // hero pixel flies and lands on the i
whooshBy(fx, 24.98, { dur: 0.35, vel: 0.18, direction: 'center', low: 600, high: 5000, seed: 23 }); bell(keys, 25.0, 93, 0.24, { decay: 1.4 }); bell(keys, 25.0, 100, 0.12, { decay: 1.0 }); // plus spins in
pad(pads, 26.0, CH.F.v, BAR, 1.6, { cutoff: 2600 }); bass(low, 26.0, 29 + 12, BAR * 0.9, 0.45);
for (const [b, m, d] of [[0, 76, 0.5], [0.75, 79, 0.25], [1, 81, 0.5], [1.75, 84, 0.25], [2, 83, 1.0], [3, 81, 1.0]]) saw(lead, 25.5 + b * BEAT, [m], d * BEAT * 0.8, 0.2, { cut0: 4800, cut1: 1200, decay: 0.12, p: -0.1 });

for (let bar = 13; bar < 14; bar++) { const t0 = bar * BAR; for (let b = 0; b < 4; b++) { K(t0 + b * BEAT, 0.6); hat(t0 + b * BEAT + E8, 0.05, true, 0.25); } clap(t0 + BEAT, 0.18); clap(t0 + 3 * BEAT, 0.18); }
for (let e = 0; e < 8; e++) hat(25.0 + e * E8, 0.03, false, e % 2 ? 0.3 : -0.3);
tone(fx, 26.78, 800, 1300, { dur: 0.08, vel: 0.24 });                                                // CTA pops
click(fx, 27.5, { vel: 0.5, bright: 0.7 }); uiConfirm(fx, 27.52, { vel: 0.26, notes: [84, 91] });
pad(pads, 28.0, [45, 57, 64, 67, 71, 76], 1.9, 2.2, { cutoff: 2800 }); bass(low, 28.0, 33, 1.9, 0.6); K(28.0, 0.7);
[69, 76, 81, 83, 88].forEach((m, i) => bell(keys, 28.02 + i * 0.06, m, 0.14, { p: -0.4 + i * 0.2, decay: 2.2 }));
{ const r = rng(91); for (let i = 0; i < 10; i++) bell(keys, 28.6 + r() * 1.2, 88 + Math.floor(r() * 10), 0.03 + r() * 0.03, { p: r() * 2 - 1, decay: 0.5 }); }
placeCues(fx, plan.cues);

// ---------- processing ----------
const duck = (bus, depth) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(0.22 * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const g = 1 - depth * Math.exp(-i / (0.07 * SR)); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
duck(pads, 0.55); duck(arp, 0.35); duck(low, 0.5);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
hp(pads, 120); hp(arp, 180); hp(lead, 160); hp(keys, 250); hp(fx, 40);
const music = mk();
drums.mixInto(music, 1); low.mixInto(music, 1); pads.mixInto(music, 0.85); arp.mixInto(music, 0.8); lead.mixInto(music, 0.9); keys.mixInto(music, 0.9);
const send = mk(); pads.mixInto(send, 0.35); arp.mixInto(send, 0.45); lead.mixInto(send, 0.55); keys.mixInto(send, 0.7);
reverb(send, { room: 0.84, damp: 0.38 }).mixInto(music, 0.7);
hp(music, 28);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.7, damp: 0.3 }).mixInto(sfx, 0.45);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.5 ? Math.cos(((t - (DUR - 0.5)) / 0.5) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1.15);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 1.15 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film6 score: ${DUR}s, norm ${norm.toFixed(3)}`);
