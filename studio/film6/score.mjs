// Film 6 score v2 — original energetic Western dance-pop at 120 BPM (beat 0.5 s, bar 2 s), 15 bars = 30.0 s, A minor.
// v1 (soft minimal tech-pop) was rejected by the owner as "very bad and ugly"; v2 keeps the picture's grid (every chapter
// starts on a bar line: 0, 4, 10, 16, 22, 24, 28) and every UI foley event, and replaces the music with a catchy, driving track:
//   909 four-on-the-floor, clap on 2/4, off-beat sub bass, pumping supersaw chords Am–F | C–G (two chords per bar),
//   one two-bar 3-3-2 HOOK that returns in every chapter (pluck intro → lead in the drop → bells in the bounce →
//   low saw in the dark section → full chorus on the logo), snare-roll builds and risers into each drop.
// Form: hook teaser + build (0–4) · DROP 1 (4–10) · bounce (10–13) + heartbeat break (13–16) · dark driving (16–22)
//       · three stabs + breath (22–24) · final chorus on the logo (24–28) · last chord rings under the credit (28–30).
// No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, noiseHit, bell, reverb, writeWav, peak, biquad, rng, pan, bloop } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film6');
mkdirSync(OUT, { recursive: true });
const DUR = 30, BEAT = 0.5, BAR = 2, S16 = 0.125, N = DUR + 2;
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;
const mk = () => new Bus(N);
const drums = mk(), low = mk(), chords = mk(), lead = mk(), fx = mk();
const kicks = [];

// ---------- voices ----------
function kick909(t, vel = 1) { // punchy kick: pitch drop 160→45 Hz, click, soft saturation
  kicks.push(t); const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.42; k++) { const tt = k / SR, f = 45 + 115 * Math.exp(-tt / 0.03); ph += 2 * Math.PI * f / SR;
    const s = Math.tanh(1.8 * Math.sin(ph) * Math.exp(-tt / 0.26)) * 0.75 + (k < 90 ? Math.sin(k * 0.9) * 0.25 * (1 - k / 90) : 0);
    drums.add(i0 + k, s * vel * 0.6); }
}
const clap = (t, v = 0.45) => { for (let i = 0; i < 4; i++) noiseHit(drums, t + i * 0.008, { dur: i === 3 ? 0.11 : 0.01, vel: v * (i === 3 ? 1 : 0.55), bp: 1400, q: 0.8, seed: 31 + i + Math.round(t * 100) }); };
const hat = (t, v = 0.07, open = false, p = 0.25) => noiseHit(drums, t, { dur: open ? 0.09 : 0.02, vel: v, hp: 8500, p, seed: Math.round(t * 1000) });
const snare = (t, v) => noiseHit(drums, t, { dur: 0.04, vel: v, bp: 1900, q: 0.8, tone: 230, seed: Math.round(t * 997) });
function roll(t0, t1, v0 = 0.05, v1 = 0.3) { // accelerating snare roll ending just before t1
  let t = t0, step = (t1 - t0) / 6, i = 0; while (t < t1 - 0.02) { const u = (t - t0) / (t1 - t0); snare(t, v0 + (v1 - v0) * u); t += step; step = Math.max(S16 / 2, step * 0.8); i++; }
}
// supersaw with a filter envelope and stereo spread (chords, lead, stabs)
function saw(bus, t, midis, dur, vel, { cut0 = 6000, cut1 = 900, decay = 0.25, p = 0, detune = 0.16, voices = 5, width = 0.6 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round((dur + 0.3) * SR);
  const osc = []; for (const m of midis) for (let v = 0; v < voices; v++) osc.push({ f: mtof(m) * Math.pow(2, ((v - (voices - 1) / 2) * detune) / 12), ph: ((m * 0.137 + v * 0.371) % 1), p: voices > 1 ? (v / (voices - 1) - 0.5) * 2 * width : 0 });
  const st = [{ x1: 0, x2: 0, y1: 0, y2: 0 }, { x1: 0, x2: 0, y1: 0, y2: 0 }]; let co;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    if (k % 32 === 0) { const fc = cut1 + (cut0 - cut1) * Math.exp(-tt / decay), w = 2 * Math.PI * Math.min(fc, SR * 0.45) / SR, c = Math.cos(w), sn = Math.sin(w), a = sn / 1.6; co = [(1 - c) / 2 / (1 + a), (1 - c) / (1 + a), (1 - c) / 2 / (1 + a), -2 * c / (1 + a), (1 - a) / (1 + a)]; }
    let l = 0, r = 0; for (const o of osc) { o.ph = (o.ph + o.f / SR) % 1; const x = 2 * o.ph - 1, [gl, gr] = pan(Math.max(-1, Math.min(1, o.p + p))); l += x * gl; r += x * gr; }
    const env = Math.min(1, tt / 0.004) * (tt > dur ? Math.exp(-(tt - dur) / 0.07) : 1), g = env * vel * 0.3 / Math.sqrt(osc.length);
    const out = [l, r].map((x, ch) => { const S = st[ch], y = co[0] * x + co[1] * S.x1 + co[2] * S.x2 - co[3] * S.y1 - co[4] * S.y2; S.x2 = S.x1; S.x1 = x; S.y2 = S.y1; S.y1 = y; return y; });
    bus.add(i0 + k, out[0] * g, out[1] * g);
  }
}
function sub(t, midi, dur, vel = 0.7) { // sine sub + 2nd harmonic, saturated
  const i0 = Math.round(t * SR), f = mtof(midi); let ph = 0;
  for (let k = 0; k < (dur + 0.05) * SR; k++) { const tt = k / SR; ph += 2 * Math.PI * f / SR; const env = Math.min(1, tt / 0.005) * (tt > dur ? Math.exp(-(tt - dur) / 0.02) : 1);
    low.add(i0 + k, Math.tanh(1.6 * (Math.sin(ph) + 0.3 * Math.sin(2 * ph))) * env * vel * 0.45); }
}
// Sine with a pitch drop and a soft tail: tuned "boing" for the ball, "pop" for UI elements, marimba-ish hook notes.
function tone(bus, t, f0, f1, { dur = 0.25, vel = 0.3, p = 0, glide = 0.04, harm = 0.25 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * 3 * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const tt = k / SR, f = f1 + (f0 - f1) * Math.exp(-tt / glide); ph += (2 * Math.PI * f) / SR; const s = (Math.sin(ph) + harm * Math.sin(2 * ph)) * Math.min(1, tt / 0.002) * Math.exp(-tt / dur) * vel * 0.35; bus.add(i0 + k, s * gl, s * gr); }
}
// Pitch glide over [t, t+dur] (the curve being dragged).
function glide(bus, t, dur, f0, f1, vel = 0.12, p = 0) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const u = k / len, f = f0 * Math.pow(f1 / f0, u * u * (3 - 2 * u)); ph += (2 * Math.PI * f) / SR; const tri = (2 / Math.PI) * Math.asin(Math.sin(ph)); const s = tri * Math.sin(Math.PI * u) ** 0.7 * vel; bus.add(i0 + k, s * gl, s * gr); }
}

// ---------- harmony + hook ----------
const C = { // voicing + bass root
  Am: { v: [57, 64, 69, 72], r: 33 }, F: { v: [57, 60, 65, 69], r: 29 }, C: { v: [55, 60, 64, 67], r: 36 }, G: { v: [55, 59, 62, 67], r: 31 },
  Dm: { v: [57, 62, 65, 69], r: 38 }, E: { v: [56, 59, 64, 68], r: 28 },
};
const POP = [['Am', 'F'], ['C', 'G']], DARK = [['Am', 'F'], ['Dm', 'E']];
const pair = (bar, prog) => prog[bar % 2].map((k) => C[k]);
// the two-bar 3-3-2 hook (step, midi, length in 16ths): A asks, B answers. Same notes in every chapter.
const HOOK_A = [[0, 76, 2], [3, 76, 1], [4, 79, 2], [6, 81, 2], [8, 84, 3], [11, 83, 1], [12, 81, 2], [14, 79, 2]];
const HOOK_B = [[0, 76, 2], [3, 76, 1], [4, 79, 2], [6, 81, 2], [8, 79, 2], [10, 76, 2], [12, 74, 1], [13, 76, 3]];
const hookFor = (bar) => (bar % 2 ? HOOK_B : HOOK_A);

function beatDrums(bar, lvl = 1, { from = 0 } = {}) {
  for (let b = from; b < 4; b++) kick909(bt(bar, b), 0.95 * lvl);
  for (const b of [1, 3]) if (b >= from) clap(bt(bar, b), 0.42 * lvl);
  for (let s = from * 4; s < 16; s++) hat(bt(bar) + s * S16, s % 4 === 2 ? 0.1 * lvl : 0.04 * lvl, s % 4 === 2, s % 2 ? 0.35 : -0.35);
}
function popChords(bar, prog, lvl = 1, cut0 = 5200) { // 8th-note supersaw stabs; the sidechain turns them into the pump
  pair(bar, prog).forEach((c, h) => { for (let e = 0; e < 4; e++) saw(chords, bt(bar, h * 2) + e * BEAT / 2, c.v, BEAT * 0.42, 0.5 * lvl, { cut0, cut1: 1300, decay: 0.12 }); });
}
function offBass(bar, prog, lvl = 1) { // rest on the kick, hit the "and" + an octave pop at the end of each chord
  pair(bar, prog).forEach((c, h) => { for (let b = 0; b < 2; b++) sub(bt(bar, h * 2 + b + 0.5), c.r + 12, BEAT * 0.42, 0.8 * lvl); sub(bt(bar, h * 2 + 1.75), c.r + 24, S16 * 0.8, 0.45 * lvl); });
}
function hookLead(bar, { oct = 0, lvl = 1, cut0 = 8000, doubled = true } = {}) {
  for (const [s, m, l] of hookFor(bar)) saw(lead, bt(bar) + s * S16, doubled ? [m + oct, m + oct + 12] : [m + oct], l * S16 * 0.85, 0.4 * lvl, { cut0, cut1: 1700, decay: 0.09, voices: 3, detune: 0.08, width: 0.3 });
}

// ---------- 0–4 · hook teaser + build (the pixel lands, hops, full stop; the dive pulls into the drop) ----------
for (const bar of [0, 1]) {
  for (const [s, m, l] of hookFor(bar)) saw(lead, bt(bar) + s * S16, [m, m + 12], l * S16 * 0.8, 0.42, { cut0: 4800 + bar * 1800, cut1: 900, decay: 0.07, voices: 2, detune: 0.1, width: 0.4 }); // pluck
  popChords(bar, POP, 0.65, 1800 + bar * 1200);                       // filtered chords open over the build
  clap(bt(bar, 1), 0.3); clap(bt(bar, 3), 0.3);
  for (let e = 0; e < 8; e++) hat(bt(bar) + e * BEAT / 2 , e % 2 ? 0.06 : 0.035, e % 2 === 1, e % 2 ? 0.3 : -0.3);
}
kick909(0.5, 0.7); kick909(1.5, 0.6); for (let b = 0; b < 3; b++) kick909(bt(1, b), 0.75);       // the landing, then a pulse in bar 1
for (const bar of [0, 1]) pair(bar, POP).forEach((c, h) => sub(bt(bar, h * 2) + (bar ? 0 : 0.5), c.r + 12, BEAT * (bar ? 1.6 : 1.1), 0.45));
roll(3.0, 3.85, 0.05, 0.3); riser(fx, 3.9, { dur: 1.3, vel: 0.3, f0: 300, f1: 9000, tonal: 0.3, seed: 12 });

// ---------- 4–10 · DROP 1 (ads) ----------
for (let bar = 2; bar < 5; bar++) { beatDrums(bar); offBass(bar, POP); popChords(bar, POP); hookLead(bar, { lvl: bar === 4 ? 1.08 : 1 }); }
for (const st of [13, 14, 15]) snare(bt(4) + st * S16, 0.12 + st * 0.01);
// ---------- 10–16 · ANIMATION: bounce groove, the hook on marimba bells, heartbeat break ----------
for (let bar = 5; bar < 7; bar++) {
  const half = bar === 6; // bar 6 loses its second half to the heartbeat break
  kick909(bt(bar, 0), 0.9); kick909(bt(bar, 1.75), 0.55); if (!half) { kick909(bt(bar, 2), 0.85); kick909(bt(bar, 3.5), 0.5); }
  clap(bt(bar, 1), 0.4); if (!half) clap(bt(bar, 3), 0.4);
  for (let s = 0; s < (half ? 8 : 16); s++) hat(bt(bar) + s * S16, s % 4 === 2 ? 0.09 : s % 2 ? 0.035 : 0.05, s % 4 === 2, s % 2 ? 0.35 : -0.35);
  pair(bar, POP).forEach((c, h) => { if (half && h) return; for (const e of [1, 3]) saw(chords, bt(bar, h * 2) + e * BEAT / 2, c.v.map((m) => m + 12), BEAT * 0.22, 0.42, { cut0: 4800, cut1: 1200, decay: 0.05, voices: 3 }); // off-beat skank
    sub(bt(bar, h * 2), c.r + 12, BEAT * 0.4, 0.75); sub(bt(bar, h * 2 + 0.75), c.r + 12, BEAT * 0.2, 0.55); sub(bt(bar, h * 2 + 1.5), c.r + 19, BEAT * 0.35, 0.6); });
  for (const [s, m] of hookFor(bar)) { if (half && s >= 8) continue; tone(lead, bt(bar) + s * S16, mtof(m + 12), mtof(m + 12), { dur: 0.18, vel: 0.22, harm: 0.15, p: s % 2 ? 0.25 : -0.25 }); }
}
// 13–16 break: the heartbeat is the kick; filtered hook + held chord, toggle switches the world dark at 15.5
saw(chords, 13.0, C.C.v, 1.4, 0.24, { cut0: 1400, cut1: 600, decay: 0.8, voices: 7, width: 0.9 }); saw(chords, 14.5, C.G.v, 1.0, 0.22, { cut0: 1200, cut1: 500, decay: 0.6, voices: 7, width: 0.9 });
for (const [s, m] of HOOK_A) if (s < 12) tone(lead, 14.0 + s * S16, mtof(m + 12), mtof(m + 12), { dur: 0.14, vel: 0.12, harm: 0.1 });
for (let e = 0; e < 4; e++) hat(15.0 + e * BEAT / 2, 0.03 + e * 0.01, false, 0);
roll(15.55, 15.98, 0.06, 0.24);

// ---------- 16–22 · SOFTWARE: dark and driving, rolling 16th bass, hook on a low saw ----------
for (let bar = 8; bar < 11; bar++) {
  beatDrums(bar, bar === 8 ? 0.9 : 1);
  pair(bar, DARK).forEach((c, h) => { for (let b = 0; b < 2; b++) for (const s of [1, 2, 3]) sub(bt(bar, h * 2 + b) + s * S16, c.r + 12, S16 * 0.7, s === 2 ? 0.75 : 0.55); });
  popChords(bar, DARK, 0.75, 1600 + (bar - 8) * 1400);                // the filter opens across the section
  if (bar > 8) hookLead(bar, { oct: -12, lvl: 0.9, cut0: 3200 + (bar - 9) * 2500, doubled: true });
}
roll(21.0, 21.95, 0.06, 0.34); riser(fx, 22.0, { dur: 1.4, vel: 0.3, f0: 260, f1: 9500, tonal: 0.25, seed: 41 });

// ---------- 22–24 · three stabs, reverse swell, a breath ----------
[[22.0, 'F', -0.5], [22.5, 'G', 0.5], [23.0, 'E', 0]].forEach(([t, ch, p], i) => {
  impact(fx, t, { vel: 0.7, weight: 0.7, p: p * 0.6 }); kick909(t, 1);
  saw(chords, t, C[ch].v.map((m) => m + 12), 0.32, 0.6, { cut0: 8000, cut1: 1400, decay: 0.12, p, voices: 7, width: 0.9 });
  sub(t, C[ch].r + 12, 0.4, 0.9);
  whooshBy(fx, t - 0.02, { dur: 0.25, vel: 0.16, direction: i === 0 ? 'rl' : i === 2 ? 'lr' : 'center', low: 400, high: 4000, seed: 20 + i });
});
saw(chords, 23.0, C.E.v, 0.9, 0.2, { cut0: 2600, cut1: 800, decay: 0.4, voices: 7, width: 0.9 });
riser(fx, 23.86, { dur: 0.5, vel: 0.34, f0: 400, f1: 11000, tonal: 0.2, seed: 51, tail: 0.002 }); // implosion suck
sweep(fx, 23.7, { dur: 0.35, vel: 0.18, up: true, seed: 22 });

// ---------- 24–30 · LOGO: the final chorus, then the last chord rings under the credit ----------
for (let bar = 12; bar < 14; bar++) { beatDrums(bar, 1.05); offBass(bar, POP, 1.05); popChords(bar, POP, 1.05, 6200); hookLead(bar, { lvl: 1.12 }); }
kick909(28.0, 1); impact(fx, 28.0, { vel: 0.45, weight: 0.5 });
saw(chords, 28.0, [57, 64, 69, 71, 76], 1.8, 0.45, { cut0: 7000, cut1: 1100, decay: 0.7, voices: 7, width: 0.9 });
saw(lead, 28.0, [81, 69], 1.4, 0.3, { cut0: 8000, cut1: 1800, decay: 0.4, voices: 3 }); sub(28.0, 33, 1.7, 0.85);
for (let e = 0; e < 4; e++) hat(28.0 + e * BEAT / 2 + BEAT / 2, 0.04 - e * 0.008, true, e % 2 ? 0.3 : -0.3);

// ---------- foley: every on-screen interaction (unchanged from v1, all on the fx bus) ----------
tone(fx, 0.5, 520, 150, { dur: 0.14, vel: 0.55 });                                               // the pixel lands
whooshBy(fx, 0.42, { dur: 0.45, vel: 0.12, direction: 'center', low: 900, high: 5000, seed: 3 });
tone(fx, 2.0, 300, 900, { dur: 0.1, vel: 0.28, glide: 0.06 }); tone(fx, 2.4, 700, 260, { dur: 0.08, vel: 0.32 }); // hop + full stop
click(fx, 3.5, { vel: 0.5, bright: 0.7 });
whooshBy(fx, 3.92, { dur: 0.5, vel: 0.22, direction: 'center', low: 200, high: 2600, seed: 4 });
impact(fx, 4.0, { vel: 0.5, weight: 0.5 }); tone(fx, 4.12, 1200, 600, { dur: 0.08, vel: 0.25 });   // frame pops open
[4.5, 4.58, 4.66].forEach((t, i) => bloop(fx, t, 0.4, { f0: 1300 + i * 250, f1: 700 + i * 150, p: 0.5 })); // reaction icons
click(fx, 5.0, { vel: 0.45, bright: 0.8, p: 0.4 }); tone(fx, 5.0, 1500, 1500, { dur: 0.18, vel: 0.3, p: 0.4 }); bell(fx, 5.02, 93, 0.16, { p: 0.4, decay: 0.6 });
{ const pent = [81, 84, 86, 88, 91, 93, 96]; for (let i = 0; i < 16; i++) bell(fx, 5.04 + i * 0.16, pent[Math.floor(rng(70 + i)() * pent.length)], 0.04 + 0.03 * rng(90 + i)(), { p: rng(110 + i)() * 1.6 - 0.8, decay: 0.5 }); } // hearts rising
whooshBy(fx, 6.0, { dur: 0.32, vel: 0.2, direction: 'lr', low: 300, high: 3000, seed: 6 }); whooshBy(fx, 6.5, { dur: 0.32, vel: 0.2, direction: 'rl', low: 300, high: 3000, seed: 7 });
softHit(fx, 7.1, { vel: 0.35, tone: 220 });
sweep(fx, 9.55, { dur: 0.4, vel: 0.14, up: false, seed: 14 });                                     // the frame collapses into a ball
whooshBy(fx, 9.9, { dur: 0.45, vel: 0.2, direction: 'center', low: 250, high: 2200, seed: 8 });    // circle wipe
[[10.5, 76, 0.5], [11.25, 72, 0.38], [11.75, 69, 0.28], [12.0, 64, 0.18]].forEach(([t, m, v]) => tone(fx, t, mtof(m) * 1.6, mtof(m), { dur: 0.22, vel: v, glide: 0.025 })); // bounces
tone(fx, 10.0, 900, 900, { dur: 0.05, vel: 0.08 });
bell(fx, 12.3, 88, 0.12, { decay: 0.6 }); bell(fx, 12.42, 95, 0.1, { decay: 0.6 });                 // keyframes appear
click(fx, 12.6, { vel: 0.4, bright: 0.6, p: -0.3 }); glide(fx, 12.62, 0.4, 330, 880, 0.1, -0.2);    // grab + drag the handle
whooshBy(fx, 13.2, { dur: 0.45, vel: 0.16, direction: 'lr', low: 400, high: 3200, seed: 9 });
for (const tb of [13.5, 14.0, 14.5]) { kick909(tb, 0.75); kick909(tb + 0.17, 0.45); }               // heartbeat (the break's kick)
tone(fx, 15.05, 700, 1100, { dur: 0.08, vel: 0.22 });                                               // toggle appears
click(fx, 15.5, { vel: 0.6, bright: 0.5 }); tone(fx, 15.52, 600, 140, { dur: 0.25, vel: 0.3, glide: 0.1 }); // switch → dark
sweep(fx, 15.85, { dur: 0.5, vel: 0.16, up: false, seed: 16 });
impact(fx, 16.0, { vel: 0.4, weight: 0.6 });
whooshBy(fx, 16.12, { dur: 0.28, vel: 0.14, direction: 'center', low: 500, high: 3500, seed: 17 });
click(fx, 16.5, { vel: 0.5, bright: 0.7 });
for (let i = 0; i < 12; i++) click(fx, 16.6 + i * 0.033, { vel: 0.06, bright: 0.95, seed: 400 + i }); // spinner
uiConfirm(fx, 17.0, { vel: 0.28, notes: [81, 88] });
whooshBy(fx, 17.3, { dur: 0.4, vel: 0.18, direction: 'center', low: 250, high: 2400, seed: 18 });    // editor opens
{ const r = rng(55); for (let t = 17.45; t < 18.65; t += 1 / 76 * 3) click(fx, t + r() * 0.01, { vel: 0.05 + r() * 0.05, bright: 0.85 + r() * 0.1, p: r() * 0.6 - 0.3, seed: Math.round(t * 1000) }); } // typing
whooshBy(fx, 18.8, { dur: 0.4, vel: 0.2, direction: 'center', low: 300, high: 3000, seed: 19 });    // code → app
[0, 1, 2, 3, 4, 5].forEach((i) => bell(fx, 19.0 + i * 0.15, [76, 79, 83, 86, 88, 91][i], 0.07, { p: -0.5 + i * 0.2, decay: 0.5 })); // chart rises
softHit(fx, 19.3, { vel: 0.3, tone: 196 });
impact(fx, 24.0, { vel: 0.95, weight: 0.9 });
[57, 64, 69, 72, 76, 81].forEach((m, i) => bell(fx, 24.02 + i * 0.045, m + 12, 0.12, { p: -0.5 + i * 0.2, decay: 1.4 }));
{ const r = rng(77), pent = [81, 84, 86, 88, 91, 93, 96, 98]; for (let i = 0; i < 46; i++) { const t = 24.05 + Math.pow(r(), 0.8) * 0.85; bell(fx, t, pent[Math.floor(r() * pent.length)], 0.02 + r() * 0.03, { p: r() * 2 - 1, decay: 0.3 }); if (i % 2) click(fx, t, { vel: 0.04, bright: 0.95, p: r() * 2 - 1, seed: 700 + i }); } } // 1,699 pixels landing
tone(fx, 24.5, 1300, 520, { dur: 0.1, vel: 0.3 }); tone(fx, 24.0, 300, 900, { dur: 0.12, vel: 0.2, glide: 0.08 }); // hero pixel lands on the i
whooshBy(fx, 24.98, { dur: 0.35, vel: 0.18, direction: 'center', low: 600, high: 5000, seed: 23 }); bell(fx, 25.0, 93, 0.18, { decay: 1.2 }); // plus spins in
tone(fx, 26.78, 800, 1300, { dur: 0.08, vel: 0.24 });                                               // CTA pops
click(fx, 27.5, { vel: 0.5, bright: 0.7 }); uiConfirm(fx, 27.52, { vel: 0.26, notes: [84, 91] });
[69, 76, 81, 83, 88].forEach((m, i) => bell(fx, 28.02 + i * 0.06, m, 0.1, { p: -0.4 + i * 0.2, decay: 2.0 }));
placeCues(fx, plan.cues);

// ---------- processing ----------
// sidechain pump: chords/bass breathe after every kick (the signature of Western dance-pop)
const pump = (bus, depth, rel = 0.16) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(chords, 0.75); pump(low, 0.5, 0.09); pump(lead, 0.25, 0.08);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(chords, 170); hp(lead, 240); hp(fx, 40);
const music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.9); chords.mixInto(music, 0.68); lead.mixInto(music, 0.72);
const send = mk(); chords.mixInto(send, 0.3); lead.mixInto(send, 0.5); reverb(send, { room: 0.78, damp: 0.4 }).mixInto(music, 0.5);
hp(music, 28);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.7, damp: 0.3 }).mixInto(sfx, 0.45);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.5 ? Math.cos(((t - (DUR - 0.5)) / 0.5) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 0.9);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 0.9 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film6 score v2: ${DUR}s 120 BPM dance-pop, norm ${norm.toFixed(3)}`);
