// Film 7 score — original, 144 BPM (beat 0.4167 s, bar 1.6667 s), 12 bars = 20.0 s, D Hijaz (D Eb F# G A Bb C).
// "Electro-shaabi": tresillo kick + 808 slides, half-time clap, rolling 16th hats with a swing, darbuka maqsum, a reedy
// mizmar-style lead with vibrato and slides, organ stabs on the off-beats. Written bar by bar against film7/timing.js — the
// SAME constants that place every click and morph in the picture. No samples, no voiceover.
// bar 0 intro hit + hook (the click lands on beat 3) · 1–3 groove builds · 4–5 tension · 6 fill into the ratios · 7 breakdown
// (typing, riser) · 8 DROP on the full-screen type · 9 stripped (button, spinner) · 10 climax + brand drop · 11 resolve.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, pan, pluck, pad, kick, noiseHit, bell, rhodes, reverb, writeWav, peak, biquad, whoosh, bloop, rng } from '../lib/audio.mjs';
import { riser, impact, softHit, click, sweep, whooshBy, uiConfirm, mechanical } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import { BEAT, BAR, DUR, S, E, at } from './timing.js';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film7');
mkdirSync(OUT, { recursive: true });
const STEP = BEAT / 4, N = DUR + 2, mk = () => new Bus(N);
const drums = mk(), tabla = mk(), low = mk(), keys = mk(), pads = mk(), lead = mk(), fx = mk(), hats = mk();
const kicks = [];
const st = (bar, s) => bar * BAR + s * STEP + (s % 2 ? STEP * 0.12 : 0);      // 16th grid with a light swing on the off-16ths
const stp = (bar, s) => bar * BAR + s * STEP;                                  // straight

// ---------- voices ----------
function sub808(bus, t, midi, dur, vel = 0.7, { dive = 0.5, drive = 1.8 } = {}) {
  const f0 = mtof(midi), i0 = Math.round(t * SR), len = Math.round((dur + 0.25) * SR); let ph = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR, f = f0 * (1 + dive * Math.exp(-tt / 0.045));
    ph += 2 * Math.PI * f / SR;
    const env = Math.min(1, tt / 0.003) * Math.exp(-tt / (dur * 0.7 + 0.05)) * (tt > dur ? Math.exp(-(tt - dur) / 0.04) : 1);
    const s = Math.tanh((Math.sin(ph) + 0.22 * Math.sin(2 * ph + 0.6)) * drive) * 0.72;
    bus.add(i0 + k, s * env * vel * 0.5);
  }
}
function reed(bus, t, midi, dur, vel = 0.4, { p = 0, vib = 5.6, vdepth = 0.22, slide = 0, bright = 1 } = {}) {
  const f0 = mtof(midi), i0 = Math.round(t * SR), len = Math.round((dur + 0.18) * SR); let ph = 0;
  const lp = biquad('lp', 2600 + 1400 * bright, 0.8), nasal = biquad('bp', 1350, 1.4), pr = pan(p);
  for (let k = 0; k < len; k++) {
    const tt = k / SR, onset = Math.min(1, tt / 0.14);
    const semis = slide * Math.exp(-tt / 0.06) + vdepth * onset * Math.sin(2 * Math.PI * vib * tt);
    ph += 2 * Math.PI * f0 * Math.pow(2, semis / 12) / SR;
    let s = 0; for (let n = 1; n <= 9; n++) s += Math.sin(n * ph) * (n % 2 ? 1 : 0.5) / n;
    s = lp(s) + 0.5 * nasal(s);
    const env = Math.min(1, tt / 0.012) * (tt < dur ? 1 : Math.exp(-(tt - dur) / 0.07)) * (0.88 + 0.12 * Math.sin(2 * Math.PI * 6.5 * tt));
    bus.add(i0 + k, s * env * vel * 0.34 * pr[0], s * env * vel * 0.34 * pr[1]);
  }
}
const clap = (bus, t, vel = 0.6, seed = 1) => { for (const d of [0, 0.011, 0.022]) noiseHit(bus, t + d, { dur: 0.012, vel: vel * 0.5, bp: 1800, q: 0.9, seed: seed + d * 1000 }); noiseHit(bus, t + 0.03, { dur: 0.1, vel: vel * 0.5, bp: 1500, q: 0.8, seed: seed + 7 }); };
const hat = (bus, t, vel, open = false, p = 0.3) => noiseHit(bus, t, { dur: open ? 0.08 : 0.016, vel, hp: 8800, p, seed: 70 });
const doum = (t, v = 1) => noiseHit(tabla, t, { dur: 0.17, vel: 0.36 * v, bp: 140, q: 0.7, tone: 92, p: -0.15, seed: 700 });
const tak = (t, v = 1) => noiseHit(tabla, t, { dur: 0.05, vel: 0.22 * v, bp: 3000, q: 1.2, tone: 560, p: 0.2, seed: 720 });
const kaa = (t, v = 1) => noiseHit(tabla, t, { dur: 0.04, vel: 0.1 * v, bp: 2200, q: 1, tone: 410, p: 0.25, seed: 740 });
const K = (t, v = 0.8) => { kick(drums, t, v); kicks.push(t); };
const D = { D: [62, 66, 69], Eb: [63, 67, 70], G: [55, 67, 70], A: [57, 69, 73] };

// ---------- bar plan ----------
const ROOT = [38, 38, 38, 39, 43, 38, 38, 45, 38, 38, 38, 38];                 // 808 roots (D2 Eb2 G2 A2)
const CHORD = ['D', 'D', 'D', 'Eb', 'G', 'D', 'D', 'A', 'D', 'D', 'D', 'D'];
const KICKS = { base: [0, 3, 6, 10], busy: [0, 3, 6, 10, 12, 14], drop: [0, 4, 8, 12, 14] };
const hatPat = (bar, vel, roll = false) => {
  for (let s = 0; s < 16; s++) { const a = [0.5, 0.2, 0.34, 0.2][s % 4] * vel; hat(hats, st(bar, s), a * (s === 10 ? 1.4 : 1), s === 14 && !roll); }
  if (roll) for (let s = 12; s < 16; s++) { hat(hats, stp(bar, s) + STEP / 2, 0.22 * vel); }
};
const maqsum = (bar, v = 1) => { doum(stp(bar, 0), v); tak(stp(bar, 2), v); tak(stp(bar, 6), v); doum(stp(bar, 8), v); tak(stp(bar, 12), v); kaa(stp(bar, 14), v); };

for (let bar = 0; bar < 12; bar++) {
  const root = ROOT[bar], t0 = bar * BAR;
  const intro = bar === 0, groove = bar >= 1 && bar <= 6, tense = bar === 4 || bar === 5, bd = bar === 7, drop = bar === 8, strip = bar === 9, climax = bar === 10, resolve = bar === 11;
  // kicks + 808
  const kp = drop || climax ? KICKS.drop : (bar === 6 || tense) ? KICKS.busy : KICKS.base;
  if (intro) K(stp(0, 0), 0.9);
  else if (bd) { K(stp(bar, 0), 0.8); K(stp(bar, 6), 0.7); }
  else if (strip) { /* no kick: the button bar breathes */ }
  else if (resolve) { K(stp(bar, 0), 0.85); K(stp(bar, 8), 0.7); }
  else for (const s of kp) K(stp(bar, s), s === 0 ? 0.9 : 0.74);
  if (!intro && !strip && !resolve) {
    sub808(low, stp(bar, 0), root, STEP * 5.2, 0.8, { dive: 0.7 });
    if (!bd) { sub808(low, stp(bar, 6), root + (bar === 3 ? 0 : 0), STEP * 3.4, 0.62, { dive: 0.3 }); sub808(low, stp(bar, 10), bar === 3 ? 43 : root + (drop || climax ? 12 : 0), STEP * 4, 0.6, { dive: 0.35 }); }
    if (bar === 3) sub808(low, stp(bar, 12), 39, STEP * 3.6, 0.6, { dive: 0.3 });
  }
  if (intro) sub808(low, 0, 26, STEP * 7, 0.9, { dive: 1.2 });
  if (resolve) { sub808(low, 0, 38, STEP * 6, 0.8, { dive: 0.7 }); sub808(low, stp(bar, 8), 38, STEP * 8, 0.6, { dive: 0.3 }); }
  if (strip) sub808(low, stp(bar, 0), 38, STEP * 8, 0.5, { dive: 0.2 });
  // claps (half-time) + hats + tabla
  if (!intro && !strip) { clap(drums, stp(bar, 8), bd ? 0.4 : 0.62, 31 + bar); if (bar === 3 || bar === 6 || bar === 10) { clap(drums, stp(bar, 14), 0.3, 51); clap(drums, stp(bar, 15), 0.22, 52); } }
  if (drop || climax) { clap(drums, stp(bar, 4), 0.34, 61 + bar); clap(drums, stp(bar, 12), 0.34, 71 + bar); }
  if (bar >= 1 && !strip && !resolve) hatPat(bar, bd ? 0.6 : (drop || climax) ? 1.15 : 1, bar === 3 || bar === 6 || drop);
  if (bar === 0) for (const s of [2, 6, 10, 14]) noiseHit(hats, stp(0, s), { dur: 0.02, vel: 0.1, hp: 7500, p: s % 8 ? 0.4 : -0.4, seed: 90 });
  if (bar >= 1 && bar <= 10) maqsum(bar, strip ? 0.5 : bd ? 0.6 : (drop || climax) ? 1.2 : 1);
  // organ stabs (Hijaz chords on the off-16ths) and pads
  const ch = D[CHORD[bar]];
  if (bar >= 3 && bar <= 8 || climax) for (const s of [3, 6, 11]) { if (bd && s === 11) continue; for (const m of ch) reed(keys, stp(bar, s), m, STEP * 1.3, 0.2, { vib: 0, vdepth: 0, bright: 0.3, p: ((m % 5) - 2) * 0.2 }); }
  if (!intro) pad(pads, t0, ch.map(m => m - 12), BAR + 0.1, strip ? 0.7 : 1.1, { cutoff: climax ? 2800 : 1500 });
}

// ---------- reed melody (D Hijaz) ----------
const PH = {
  hook: [[0, 74, 2], [2, 75, 1], [3, 78, 2], [5, 79, 1], [6, 78, 1], [7, 75, 1], [8, 74, 3], [11, 75, 1], [12, 78, 2], [14, 79, 2]],
  ans: [[0, 81, 2], [2, 79, 1], [3, 78, 2], [5, 75, 1], [6, 74, 2], [8, 75, 2], [10, 74, 1], [11, 70, 1], [12, 69, 4]],
  high: [[0, 86, 2], [2, 84, 1], [3, 82, 2], [5, 81, 1], [6, 79, 2], [8, 78, 2], [10, 79, 1], [11, 81, 1], [12, 82, 2], [14, 84, 2]],
  trill: [[0, 78, 1], [1, 79, 1], [2, 78, 1], [3, 79, 1], [4, 78, 2], [6, 75, 2], [8, 74, 4], [12, 78, 1], [13, 79, 1], [14, 81, 2]],
  solo: [[0, 86, 1], [1, 87, 1], [2, 90, 2], [4, 91, 2], [6, 90, 1], [7, 87, 1], [8, 86, 4], [12, 90, 1], [13, 91, 1], [14, 93, 2]],
  brand: [[0, 86, 3], [3, 87, 1], [4, 90, 3], [7, 91, 1], [8, 93, 4], [12, 91, 2], [14, 90, 2]],
  end: [[0, 86, 6], [8, 78, 10]],
};
const play = (bar, key, vel = 0.5, transpose = 0, p = 0.1) => { for (const [s, m, l] of PH[key]) reed(lead, stp(bar, s) + (s % 2 ? STEP * 0.1 : 0), m + transpose, l * STEP * 0.95, vel, { p, slide: l <= 1 ? 0 : -0.5, bright: 1 }); };
play(0, 'hook', 0.42, -12); play(1, 'ans', 0.5, -12); play(2, 'hook', 0.5, -12); play(3, 'ans', 0.5, -12);
play(4, 'high', 0.46, -12); play(5, 'trill', 0.5, -12); play(6, 'high', 0.5, -12, -0.1);
for (const [s, m, l] of PH.hook.slice(0, 5)) reed(lead, stp(7, s), m - 12, l * STEP * 0.95, 0.3, { slide: -0.5 });
play(8, 'solo', 0.5, -12); play(9, 'trill', 0.3, 0); play(10, 'brand', 0.48, -12); play(11, 'end', 0.4, -12);
play(8, 'hook', 0.26, -24, -0.4);
// bells on the brand hit
[62, 69, 74, 78, 81].forEach((m, i) => bell(lead, at(10) + 0.02 + i * 0.045, m + 12, 0.18, { p: -0.5 + i * 0.25, decay: 1.8 }));
for (const m of [62, 66, 69, 74, 78]) rhodes(keys, at(11), m, 1.4, 0.18, { p: (m % 5) / 5 - 0.4 });
pad(pads, at(11), [50, 57, 62, 66, 69, 74], 1.0, 1.6, { cutoff: 2400 });

// ---------- sound design on the events (picture shares these exact times) ----------
const tick = (t, v = 0.2, b = 0.9, p = 0) => click(fx, t, { vel: v, bright: b, p, seed: Math.round(t * 997) % 90 + 17 });
impact(fx, 0.0, { vel: 0.5, weight: 0.6 });
sweep(fx, 0.55, { dur: 0.7, vel: 0.07, up: true });
// every state change: a quiet landing whoosh peaking on the bar line (the box spring's overshoot)
[S.player, S.dial, S.seg, S.stats, S.curve, S.ratio, S.search].forEach((t, i) => whooshBy(fx, t - 0.02, { dur: 0.3, vel: 0.2, direction: i % 2 ? 'lr' : 'rl', low: 240, high: 2400, seed: 20 + i }));
tick(E.click1, 0.5, 0.7); softHit(fx, E.click1 + 0.02, { vel: 0.35, tone: 300 });
tick(E.pause, 0.4, 0.7); softHit(fx, E.pause + 0.02, { vel: 0.3, tone: 260 });
for (let i = 0; i < 14; i++) tick(E.dragA + i * ((E.dragB - E.dragA) / 13), 0.1, 0.5 + i * 0.03, -0.3 + i * 0.045);    // dial detents rising
uiConfirm(fx, E.dragB + 0.02, { vel: 0.22, notes: [88, 95] }); softHit(fx, E.dragB + 0.02, { vel: 0.3, tone: 200 });
tick(E.segA, 0.4, 0.8); softHit(fx, E.segA + 0.02, { vel: 0.28, tone: 330 }); tick(E.segB, 0.4, 0.85, 0.3); softHit(fx, E.segB + 0.02, { vel: 0.28, tone: 392 });
for (let i = 0; i < 12; i++) softHit(fx, E.countA + 0.05 + i * 0.045, { vel: 0.12 + i * 0.006, tone: 300 + i * 40, p: -0.4 + i * 0.07 });   // bars rising, staggered
for (let i = 0; i < 20; i++) tick(E.countA + 0.05 + i * ((E.countB - E.countA) / 20), 0.05 + 0.002 * i, 0.95, -0.2 + (i % 4) * 0.13);   // number roll
bell(fx, E.tip + 0.01, 93, 0.16, { decay: 1.0 }); softHit(fx, E.tip + 0.02, { vel: 0.25, tone: 440 });
for (let i = 0; i < 5; i++) { tick(E.handleA + i * 0.065, 0.08, 0.5); tick(E.handleB + i * 0.06, 0.08, 0.6, 0.3); }
whoosh(fx, E.ballA, E.ballB - E.ballA, 0.14, { f0: 500, f1: 2600, p0: -0.5, p1: 0.5, seed: 8 }); bell(fx, E.ballB, 91, 0.2, { decay: 1.2 });
E.ratio.forEach((t, i) => { softHit(fx, t, { vel: 0.4 + i * 0.04, tone: [220, 262, 330, 392][i] }); sweep(fx, t - 0.12, { dur: 0.16, vel: 0.08, up: i % 2 === 0 }); });
tick(E.typeStart + 0.17, 0.2, 0.9); tick(E.typeStart + 0.34, 0.2, 0.95, 0.2);
whooshBy(fx, E.results, { dur: 0.3, vel: 0.14, direction: 'center', low: 500, high: 3000, seed: 41 });
tick(E.pick, 0.5, 0.8); softHit(fx, E.pick + 0.02, { vel: 0.3, tone: 300 });
riser(fx, at(5), { dur: 0.9, vel: 0.22, f0: 300, f1: 7000, tonal: 0.3, seed: 15 });          // short build into the curve editor
riser(fx, at(8), { dur: 1.7, vel: 0.3, f0: 240, f1: 9000, tonal: 0.3, seed: 12 });
impact(fx, at(8), { vel: 0.85, weight: 0.85 });
E.words.forEach((t, i) => { impact(fx, t, { vel: 0.5 + i * 0.08, weight: 0.5, p: [0.5, -0.5, 0.4, 0][i], seed: 90 + i }); whooshBy(fx, t - 0.03, { dur: 0.24, vel: 0.22, direction: i % 2 ? 'rl' : 'lr', low: 300, high: 3200, seed: 50 + i }); });
whooshBy(fx, at(9) - 0.18 + 0.2, { dur: 0.3, vel: 0.2, direction: 'center', low: 150, high: 1800, seed: 61 });
tick(E.click2, 0.5, 0.7); softHit(fx, E.click2 + 0.02, { vel: 0.35, tone: 300 });
mechanical(fx, E.spin + 0.1, { dur: E.check - E.spin - 0.12, vel: 0.07, f0: 120, f1: 260 });
uiConfirm(fx, E.check, { vel: 0.3, notes: [84, 91, 96], gap: 0.06 }); bell(fx, E.check + 0.02, 96, 0.2, { decay: 1.4 });
riser(fx, S.brand, { dur: 0.5, vel: 0.35, f0: 600, f1: 9000, tonal: 0.2, seed: 77 });
impact(fx, S.brand, { vel: 0.85, weight: 0.9 });
{ const r = rng(7); for (let i = 0; i < 16; i++) bell(fx, E.mark + 0.05 + i * 0.03, 90 + Math.floor(r() * 9), 0.05 + r() * 0.04, { p: r() * 2 - 1, decay: 0.4 }); }   // sparkles as the wordmark resolves
bloop(fx, E.hero, 0.3, { f0: 520, f1: 1180 }); whooshBy(fx, E.tag, { dur: 0.3, vel: 0.2, direction: 'rl', low: 300, high: 2400, seed: 71 }); bloop(fx, E.cta, 0.22, { f0: 900, f1: 520 });
tick(E.ctaClick, 0.5, 0.7); uiConfirm(fx, E.ctaClick + 0.02, { vel: 0.24, notes: [88, 95] });
impact(fx, at(11), { vel: 0.5, weight: 0.5 });
// a clear full stop instead of a fade-out: stinger on the last upbeat, bell ring-out
impact(fx, at(11, 3), { vel: 0.7, weight: 0.7 }); for (const m of [74, 78, 81, 86]) bell(fx, at(11, 3) + 0.01, m + 12, 0.2, { p: (m % 4) / 4 - 0.4, decay: 1.2 }); sub808(low, at(11, 3), 38, 0.6, 0.9, { dive: 0.9 });
placeCues(fx, plan.cues);

// ---------- processing ----------
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
const lpCurve = (bus, cutoff, ta, tb) => { for (const ch of ['L', 'R']) { const x = bus[ch]; let y = 0; for (let i = Math.round(ta * SR); i < Math.min(bus.n, Math.round(tb * SR)); i++) { y += (1 - Math.exp(-2 * Math.PI * cutoff(i / SR) / SR)) * (x[i] - y); x[i] = y; } } };
const sidechain = (bus, depth) => { for (const k of kicks) { const i0 = Math.round(k * SR), n = Math.round(0.2 * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const g = 1 - depth * Math.exp(-i / (0.07 * SR)); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
sidechain(pads, 0.6); sidechain(keys, 0.35); sidechain(low, 0.3);
hp(pads, 120); hp(keys, 180); hp(lead, 200); hp(fx, 45); hp(drums, 28); hp(tabla, 60); hp(hats, 3000);
const music = mk();
drums.mixInto(music, 1); tabla.mixInto(music, 1.05); hats.mixInto(music, 1); low.mixInto(music, 1); keys.mixInto(music, 0.85); pads.mixInto(music, 0.7); lead.mixInto(music, 0.85);
const send = mk(); lead.mixInto(send, 0.45); keys.mixInto(send, 0.3); pads.mixInto(send, 0.3);
reverb(send, { room: 0.78, damp: 0.4 }).mixInto(music, 0.5);
// opens from a filtered intro; the button bar before the brand is filtered and opens into the brand drop
const lerpE = (a, b, u) => a * Math.pow(b / a, Math.min(1, Math.max(0, u)));
lpCurve(music, t => t < at(1) ? lerpE(900, 16000, (t - 0.4) / 1.2) : t < at(9) ? 16000 : t < at(10) ? lerpE(1400, 16000, (t - at(9) - 0.9) / 0.8) : 16000, 0, at(10) + 0.1);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.62, damp: 0.3 }).mixInto(sfx, 0.4);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.2 ? Math.cos(((t - (DUR - 0.2)) / 0.2) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
// Section automation on the music bed: the breakdown and the stripped button bar breathe, the drop and the brand climax push.
const GAIN = [[0, 0.85], [at(1), 0.92], [at(3), 1.0], [at(7) - 0.05, 1.0], [at(7) + 0.1, 0.7], [at(8) - 0.1, 0.72], [at(8), 1.18], [at(9) - 0.05, 1.12], [at(9) + 0.1, 0.58], [at(10) - 0.1, 0.62], [at(10), 1.22], [at(11), 1.05], [DUR - 0.6, 0.9], [DUR, 0.9]];
for (let i = 0; i < music.n; i++) { const t = i / SR; let g = GAIN[0][1]; for (let k = 1; k < GAIN.length; k++) if (t <= GAIN[k][0]) { const [a0, g0] = GAIN[k - 1], [a1, g1] = GAIN[k]; g = g0 + (g1 - g0) * Math.min(1, Math.max(0, (t - a0) / Math.max(1e-6, a1 - a0))); break; } else g = GAIN[k][1]; music.L[i] *= g; music.R[i] *= g; }
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1.1);
// Dynamics: scale by RMS to leave headroom for the loudness master, soft-clip only the transients.
let ss = 0; for (let i = 0; i < mix.n; i++) ss += mix.L[i] ** 2 + mix.R[i] ** 2;
const rms = Math.sqrt(ss / (2 * mix.n)), norm = 0.115 / rms, soft = (x) => Math.tanh(x * norm * 0.9) / 0.9 * 0.8;
const finish = (b, mul = 1) => { for (let i = 0; i < b.n; i++) { b.L[i] = soft(b.L[i] * mul); b.R[i] = soft(b.R[i] * mul); } };
finish(music); finish(sfx, 1.1); finish(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: 1 }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: 1 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: 1 });
console.log(`film7 score: ${DUR}s, rms-norm ${norm.toFixed(3)}, peak ${peak(mix).toFixed(3)}`);
