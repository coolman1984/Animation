// Film 14 score v4 — «اتكلم كورة»: the SAME sound and build as film12's «مخطط المساحات» score (owner 2026-10-07: "make it like that project's music,
// fast and distinctive"), re-timed to 150 BPM (beat 0.4 s = 12 frames, bar 1.6 s, 12.5 bars = 20.0 s), D minor.
// Same voices (909 kick, supersaw chords, off-beat sub bass, doubled saw lead, claps, snare rolls, risers), same progression Dm–Bb | F–C and the same
// two-bar hook (A asks, B answers) returning in every chapter: plucked + filtered chords (kick-off, tactics) → full drop (teams, results) →
// half-time break with the hook on bells + a rolling-16th build (analysis) → tutti stabs, one per word (blast) → the loudest chorus, hook doubled
// an octave apart (host + title) → last chord + final whistle. Sound for every on-screen event from timing.js; marimba notes on the cards and rows.
// Groove: half-time (kick and clap on 1 and 3, 8th-note hats, sustained chords) so it reads slower on the same picture grid.
// No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, noiseHit, bell, reverb, writeWav, peak, biquad, rng, pan, bloop } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep, texture } from '../lib/sfx.mjs';
import { EV, DUR } from './timing.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'takes', 'film14');
mkdirSync(OUT, { recursive: true });
const BEAT = 0.4, BAR = 1.6, S16 = 0.1, N = DUR + 2;
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;
const mk = () => new Bus(N);
const drums = mk(), low = mk(), chords = mk(), lead = mk(), fx = mk();
const kicks = [];

// ---------- voices ----------
function kick(t, vel = 1) {
  kicks.push(t); const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.42; k++) { const tt = k / SR, f = 46 + 120 * Math.exp(-tt / 0.028); ph += 2 * Math.PI * f / SR;
    const s = Math.tanh(1.9 * Math.sin(ph) * Math.exp(-tt / 0.25)) * 0.75 + (k < 90 ? Math.sin(k * 0.9) * 0.25 * (1 - k / 90) : 0);
    drums.add(i0 + k, s * vel * 0.6); }
}
const clap = (t, v = 0.45) => { for (let i = 0; i < 4; i++) noiseHit(drums, t + i * 0.008, { dur: i === 3 ? 0.11 : 0.01, vel: v * (i === 3 ? 1 : 0.55), bp: 1350, q: 0.8, seed: 31 + i + Math.round(t * 100) }); };
const hat = (t, v = 0.07, open = false, p = 0.25) => noiseHit(drums, t, { dur: open ? 0.09 : 0.02, vel: v, hp: 8500, p, seed: Math.round(t * 1000) });
const snare = (t, v) => noiseHit(drums, t, { dur: 0.04, vel: v, bp: 1900, q: 0.8, tone: 230, seed: Math.round(t * 997) });
function roll(t0, t1, v0 = 0.05, v1 = 0.3) { let t = t0, step = (t1 - t0) / 6; while (t < t1 - 0.02) { snare(t, v0 + (v1 - v0) * ((t - t0) / (t1 - t0))); t += step; step = Math.max(S16 / 2, step * 0.8); } }
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
function sub(t, midi, dur, vel = 0.7) { const i0 = Math.round(t * SR), f = mtof(midi); let ph = 0;
  for (let k = 0; k < (dur + 0.05) * SR; k++) { const tt = k / SR; ph += 2 * Math.PI * f / SR; const env = Math.min(1, tt / 0.005) * (tt > dur ? Math.exp(-(tt - dur) / 0.02) : 1);
    low.add(i0 + k, Math.tanh(1.6 * (Math.sin(ph) + 0.3 * Math.sin(2 * ph))) * env * vel * 0.45); } }
function tone(bus, t, f0, f1, { dur = 0.25, vel = 0.3, p = 0, glide = 0.04, harm = 0.25 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * 3 * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const tt = k / SR, f = f1 + (f0 - f1) * Math.exp(-tt / glide); ph += (2 * Math.PI * f) / SR; const s = (Math.sin(ph) + harm * Math.sin(2 * ph)) * Math.min(1, tt / 0.002) * Math.exp(-tt / dur) * vel * 0.35; bus.add(i0 + k, s * gl, s * gr); }
}
// marimba-ish mallet (fundamental + 4th partial, fast decay) — the furniture "lands" on the hook's scale
function mallet(bus, t, midi, vel = 0.3, p = 0) { const i0 = Math.round(t * SR), f = mtof(midi), [gl, gr] = pan(p);
  for (let k = 0; k < SR * 0.6; k++) { const tt = k / SR, s = (Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt / 0.22) + 0.35 * Math.sin(2 * Math.PI * f * 3.93 * tt) * Math.exp(-tt / 0.05)) * Math.min(1, tt / 0.001) * vel * 0.4; bus.add(i0 + k, s * gl, s * gr); } }
// pen on paper: band-passed noise whose centre follows the stroke, with a light scratch texture
function scribble(t0, t1, vel = 0.08) { const i0 = Math.round(t0 * SR), n = Math.round((t1 - t0) * SR), r = rng(808); let y = 0, yb = 0;
  for (let k = 0; k < n; k++) { const u = k / n, x = r() * 2 - 1, a = 0.06 + 0.04 * Math.sin(u * 40); y += a * (x - y); yb += 0.5 * (y - yb); const env = Math.min(1, u * 12, (1 - u) * 12) * (0.7 + 0.3 * Math.sin(u * 2 * Math.PI * 9)); const s = (y - yb) * env * vel * 6; fx.add(i0 + k, s * 0.9, s); } }
// laser slice: a falling sine sweep with a buzz, for the cut plane slicing the walls
function laser(t, dur, vel = 0.12) { const i0 = Math.round(t * SR), n = Math.round(dur * SR); let ph = 0;
  for (let k = 0; k < n; k++) { const u = k / n, f = 2400 * Math.pow(0.3, u); ph += 2 * Math.PI * f / SR; const env = Math.sin(Math.PI * u) ** 0.6; const s = (Math.sin(ph) * 0.6 + 0.4 * Math.sign(Math.sin(ph * 0.5))) * env * vel; fx.add(i0 + k, s * 0.8, s); } }

function crowd(t0, dur, vel = 0.2, { attack = 0.08, bright = 0.12 } = {}) { const i0 = Math.round(t0 * SR), n = Math.round(dur * SR), r = rng(Math.round(t0 * 100)); let a = 0, b = 0, c = 0;
  for (let k = 0; k < n; k++) { const tt = k / SR, x = r() * 2 - 1; a += bright * (x - a); b += 0.02 * (a - b); c = a - b; const env = Math.min(1, tt / attack) * Math.exp(-Math.max(0, tt - attack) / (dur * 0.45)) * (1 + 0.15 * Math.sin(tt * 2 * Math.PI * 3.1));
    fx.add(i0 + k, c * env * vel * 2.2, (a - b * 0.9) * env * vel * 2.2); } }
function thump(t, vel = 0.5) { kickBall(t, vel); noiseHit(fx, t, { dur: 0.03, vel: vel * 0.4, bp: 900, q: 1.2, seed: Math.round(t * 333) }); }
function kickBall(t, vel) { const i0 = Math.round(t * SR); let ph = 0; for (let k = 0; k < SR * 0.18; k++) { const tt = k / SR, f = 90 + 160 * Math.exp(-tt / 0.012); ph += 2 * Math.PI * f / SR; fx.add(i0 + k, Math.sin(ph) * Math.exp(-tt / 0.05) * vel * 0.5); } }
function clunk(t, vel = 0.5, p = 0) { impact(fx, t, { vel: vel * 0.7, weight: 0.9, p }); tone(fx, t, 180, 60, { dur: 0.12, vel: vel * 0.6, p }); noiseHit(fx, t + 0.01, { dur: 0.25, vel: vel * 0.12, hp: 5000, p, seed: Math.round(t * 71) }); }


function whistle(t, dur, vel = 0.18) { const i0 = Math.round(t * SR), n = Math.round(dur * SR), r = rng(Math.round(t * 50)); let ph = 0;
  for (let k = 0; k < n; k++) { const tt = k / SR, f = 2850 + 60 * Math.sin(tt * 2 * Math.PI * 28); ph += 2 * Math.PI * f / SR; const env = Math.min(1, tt / 0.02, (dur - tt) / 0.04) * (0.75 + 0.25 * Math.sin(tt * 2 * Math.PI * 28)); const s = (Math.sin(ph) * 0.8 + (r() - 0.5) * 0.25) * env * vel; fx.add(i0 + k, s, s); } }
// crowd-chant voice: detuned saws through vowel formants ("oh"), loose timing like a stand singing
// ---------- harmony + hook (D minor) ----------
const CH = { Dm: { v: [62, 65, 69, 74], r: 38 }, Bb: { v: [62, 65, 70, 74], r: 34 }, F: { v: [60, 65, 69, 72], r: 41 }, C: { v: [60, 64, 67, 72], r: 36 } };
const PROG = [['Dm', 'Bb'], ['F', 'C']];
const pair = (bar) => PROG[bar % 2].map((k) => CH[k]);
const HOOK_A = [[0, 81, 2], [2, 79, 1], [3, 77, 1], [4, 79, 2], [6, 74, 2], [8, 77, 1], [9, 79, 1], [10, 81, 2], [12, 84, 3], [15, 81, 1]];
const HOOK_B = [[0, 81, 2], [2, 79, 1], [3, 77, 1], [4, 79, 2], [6, 74, 2], [8, 72, 2], [10, 74, 1], [11, 77, 1], [12, 74, 4]];
const hookFor = (bar) => (bar % 2 ? HOOK_B : HOOK_A);
function beatDrums(bar, lvl = 1) { // half-time groove: kick on 1 and 3, clap on 3, 8th-note hats (the picture stays on the 150 grid)
  kick(bt(bar, 0), 0.95 * lvl); kick(bt(bar, 2), 0.9 * lvl); clap(bt(bar, 2), 0.42 * lvl);
  for (let e = 0; e < 8; e++) hat(bt(bar) + e * BEAT / 2, e % 2 ? 0.1 * lvl : 0.05 * lvl, e % 2 === 1, e % 2 ? 0.35 : -0.35);
}
function popChords(bar, lvl = 1, cut0 = 5200) { pair(bar).forEach((c, h) => { saw(chords, bt(bar, h * 2), c.v, BEAT * 1.9, 0.5 * lvl, { cut0, cut1: 1300, decay: 0.3 }); }); }
function offBass(bar, lvl = 1) { pair(bar).forEach((c, h) => { sub(bt(bar, h * 2), c.r + 12, BEAT * 1.6, 0.85 * lvl); sub(bt(bar, h * 2 + 1.5), c.r + 24, S16 * 0.8, 0.4 * lvl); }); }
function hookLead(bar, { oct = 0, lvl = 1, cut0 = 8000, doubled = true } = {}) {
  for (const [s, m, l] of hookFor(bar)) saw(lead, bt(bar) + s * S16, doubled ? [m + oct, m + oct + 12] : [m + oct], l * S16 * 0.85, 0.4 * lvl, { cut0, cut1: 1700, decay: 0.09, voices: 3, detune: 0.08, width: 0.3 });
}


// ---------- 0–4.8 · kick-off + tactics: whistle, plucked hook, filtered chords opening, the beat enters, snare roll into the drop ----------
for (const bar of [0, 1, 2]) {
  for (const [s, m, l] of hookFor(bar)) saw(lead, bt(bar) + s * S16, [m, m + 12], l * S16 * 0.8, 0.4, { cut0: 4200 + bar * 1400, cut1: 900, decay: 0.07, voices: 2, detune: 0.1, width: 0.4 });
  popChords(bar, 0.6, 1600 + bar * 1000);
  for (let e = 0; e < 8; e++) hat(bt(bar) + e * BEAT / 2, e % 2 ? 0.055 : 0.03, e % 2 === 1, e % 2 ? 0.3 : -0.3);
  pair(bar).forEach((c, h) => sub(bt(bar, h * 2), c.r + 12, BEAT * 1.5, 0.4));
}
whistle(0.0, 0.32, 0.2); kick(0.8, 0.85);
kick(bt(1, 0), 0.7); kick(bt(1, 2), 0.7); kick(bt(2, 0), 0.8); kick(bt(2, 2), 0.8); clap(bt(1, 2), 0.3); clap(bt(2, 2), 0.4); offBass(2, 0.7);
roll(4.05, 4.78, 0.05, 0.32); riser(fx, 4.8, { dur: 1.2, vel: 0.3, f0: 300, f1: 9000, tonal: 0.3, seed: 12 });
// ---------- 4.8–11.2 · DROP: teams, leagues, results — the full groove ----------
for (let bar = 3; bar < 7; bar++) { beatDrums(bar); offBass(bar); popChords(bar); hookLead(bar, { lvl: bar === 6 ? 1.06 : 1 }); }
for (const st of [13, 14, 15]) snare(bt(6) + st * S16, 0.12 + st * 0.01);
// ---------- 11.2–14.4 · analysis: half-time break with the hook on bells, then a rolling-16th build ----------
kick(bt(7, 0), 0.9); kick(bt(7, 2), 0.85); clap(bt(7, 2), 0.36);
for (let e = 0; e < 8; e++) hat(bt(7) + e * BEAT / 2, e % 2 ? 0.07 : 0.035, e % 2 === 1, e % 2 ? 0.35 : -0.35);
saw(chords, bt(7, 0), CH.Dm.v, 0.7, 0.26, { cut0: 2400, cut1: 700, decay: 0.5, voices: 7, width: 0.9 }); saw(chords, bt(7, 2), CH.Bb.v, 0.7, 0.26, { cut0: 2400, cut1: 700, decay: 0.5, voices: 7, width: 0.9 });
sub(bt(7, 0), 50, 0.7, 0.7); sub(bt(7, 2), 46, 0.7, 0.7);
for (const [s, m] of HOOK_A) tone(lead, bt(7) + s * S16, mtof(m + 12), mtof(m + 12), { dur: 0.18, vel: 0.2, harm: 0.15, p: s % 2 ? 0.3 : -0.3 });
kick(bt(8, 0), 0.85); kick(bt(8, 2), 0.85); clap(bt(8, 2), 0.4);
pair(8).forEach((c, h) => sub(bt(8, h * 2), c.r + 12, BEAT * 1.6, 0.75));
popChords(8, 0.75, 1800 + 2600); hookLead(8, { lvl: 0.7, cut0: 4500 });
for (let e = 0; e < 8; e++) hat(bt(8) + e * BEAT / 2, e % 2 ? 0.08 : 0.04, e % 2 === 1, e % 2 ? 0.35 : -0.35);
roll(13.75, 14.38, 0.06, 0.34); riser(fx, 14.4, { dur: 1.0, vel: 0.28, f0: 400, f1: 10000, tonal: 0.25, seed: 41 });
// ---------- 14.4–16 · word blast: one tutti stab per word, then the roll into the host ----------
[['Dm', 0], ['Bb', 1], ['F', 2], ['C', 3]].forEach(([c, b]) => { const t = 14.4 + b * BEAT;
  impact(fx, t, { vel: 0.6, weight: 0.6 }); kick(t, 1); saw(chords, t, CH[c].v.map((m) => m + 12), 0.32, 0.6, { cut0: 8000, cut1: 1400, decay: 0.12, voices: 7, width: 0.9 }); sub(t, CH[c].r + 12, 0.4, 0.9); });
roll(15.55, 15.98, 0.08, 0.36); riser(fx, EV.end, { dur: 0.8, vel: 0.3, f0: 400, f1: 11000, tonal: 0.25, seed: 51 });
// ---------- 16–19.2 · the host + the title: the loudest chorus (hook doubled an octave apart), then the last chord + final whistle ----------
for (let bar = 10; bar < 12; bar++) { beatDrums(bar, 1.06); offBass(bar, 1.06); popChords(bar, 1.0, 6000); hookLead(bar, { lvl: 1.1 }); hookLead(bar, { oct: -12, lvl: 0.8, doubled: false, cut0: 4000 }); }
for (let s = 12; s < 16; s++) hat(bt(11) + s * S16, 0.09, true, 0.3);
kick(19.2, 1); impact(fx, 19.2, { vel: 0.45, weight: 0.5 });
saw(chords, 19.2, [50, 57, 62, 65, 69], 0.6, 0.45, { cut0: 7000, cut1: 1100, decay: 0.5, voices: 7, width: 0.9 }); saw(lead, 19.2, [81, 69], 0.5, 0.3, { cut0: 8000, cut1: 1800, decay: 0.4, voices: 3 }); sub(19.2, 38, 0.6, 0.85);
whistle(19.3, 0.1, 0.15); whistle(19.45, 0.1, 0.15); whistle(19.6, 0.3, 0.17);
// marimba notes on the hook's scale: each result card lands on a rising note, each standings row ticks up the scale
{ const sc = [74, 77, 79, 81, 84, 86]; EV.cards.forEach((t, i) => mallet(fx, t + 0.3, sc[i * 2] + 12, 0.34, -0.4 + i * 0.4)); for (let r = 0; r < 5; r++) for (const c of [0, 1]) mallet(fx, EV.table + 0.15 + r * 0.07 + c * 0.04, sc[r] + 12, 0.18, c ? -0.5 : 0.5); }

// ---------- designed sound ----------
texture(fx, 0, DUR, { level: 0.01, kind: 'room', seed: 19, fade: 0.6 });
EV.bounces.forEach((t, i) => tone(fx, t, 520 - i * 60, 180, { dur: 0.1, vel: 0.5 })); whooshBy(fx, 1.45, { dur: 0.5, vel: 0.24, direction: 'center', low: 150, high: 3000, seed: 3 }); thump(EV.kickBall, 0.9);
impact(fx, EV.slamA, { vel: 0.35, weight: 0.4 }); impact(fx, EV.slamB, { vel: 0.35, weight: 0.4 });
for (let i = 0; i < 11; i++) click(fx, EV.dots + i * 0.05, { vel: 0.14, bright: 0.35, p: -0.6 + i * 0.12, seed: 40 + i });            // chalk dots
for (let i = 0; i < 5; i++) click(fx, EV.dots + 0.35 + i * 0.06, { vel: 0.1, bright: 0.5, p: 0.5 - i * 0.2, seed: 60 + i });
scribble(EV.arrows, EV.arrows + 0.3, 0.06); sweep(fx, EV.morph + 0.1, { dur: 0.4, vel: 0.12, up: true, seed: 7 }); uiConfirm(fx, EV.morph + 0.2, { vel: 0.14, notes: [81, 88] });
EV.passes.forEach((t) => { thump(t, 0.5); scribble(t - 0.15, t + 0.15, 0.04); });
whooshBy(fx, EV.wipe + 0.15, { dur: 0.4, vel: 0.22, direction: 'lr', low: 300, high: 4000, seed: 5 });
EV.teams.forEach((t, i) => { whooshBy(fx, t, { dur: 0.3, vel: 0.16, direction: i % 2 ? 'rl' : 'lr', low: 400, high: 3800, seed: 20 + i }); impact(fx, t + 0.05, { vel: 0.3, weight: 0.45 }); });
bell(fx, EV.teams[3] + 0.05, 81, 0.12, { decay: 0.8 }); bell(fx, EV.teams[3] + 0.2, 88, 0.1, { decay: 0.8 });
EV.cards.forEach((t, i) => { whooshBy(fx, t + 0.1, { dur: 0.3, vel: 0.16, direction: 'rl', low: 500, high: 4000, seed: 30 + i }); for (let k = 0; k < 9; k++) click(fx, t + 0.02 + k * 0.033, { vel: 0.06, bright: 0.85, seed: 300 + i * 20 + k }); uiConfirm(fx, t + 0.3, { vel: 0.18, notes: [84 + i * 2, 91 + i * 2] }); });
crowd(EV.cards[0] + 0.3, 1.0, 0.07);
for (let i = 0; i < 25; i++) click(fx, EV.clock[0] + i * 0.1, { vel: 0.035, bright: 0.95, p: i % 2 ? 0.3 : -0.3, seed: 500 + i });                   // clock
for (let i = 0; i < 11; i++) bloop(fx, 11.9 + i * 0.04, 0.08, { f0: 900 + i * 70, f1: 1400 + i * 50, p: -0.6 + i * 0.12 });                        // nodes
whooshBy(fx, 13.3, { dur: 0.9, vel: 0.12, direction: 'lr', low: 600, high: 5000, seed: 9 });                                                          // the run
whooshBy(fx, 15.9, { dur: 0.35, vel: 0.24, direction: 'center', low: 200, high: 4000, seed: 31 });
crowd(EV.end, 2.6, 0.12, { attack: 0.05, bright: 0.15 }); impact(fx, EV.end, { vel: 0.85, weight: 0.9 });
impact(fx, EV.freeze, { vel: 0.6, weight: 0.6 }); [69, 76, 81, 84, 88].forEach((m, i) => bell(fx, EV.freeze + 0.03 + i * 0.05, m + 12, 0.1, { p: -0.5 + i * 0.25, decay: 1.4 }));
EV.sweep.forEach((t) => sweep(fx, t + 0.3, { dur: 0.6, vel: 0.1, up: true, seed: 29 }));

// ---------- processing ----------
const pump = (bus, depth, rel = 0.16) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(chords, 0.75); pump(low, 0.5, 0.09); pump(lead, 0.25, 0.08);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(chords, 170); hp(lead, 240); hp(fx, 40);
const music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.9); chords.mixInto(music, 0.66); lead.mixInto(music, 0.72);
const send = mk(); chords.mixInto(send, 0.3); lead.mixInto(send, 0.5); reverb(send, { room: 0.78, damp: 0.4 }).mixInto(music, 0.5);
hp(music, 28);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.7, damp: 0.3 }).mixInto(sfx, 0.45);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.45 ? Math.cos(((t - (DUR - 0.45)) / 0.45) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
// soft-limit before normalising so sparse transients cannot dominate the loudness target (CRAFT 47)
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 0.9);
const lim = (b) => { for (const ch of ['L', 'R']) for (let i = 0; i < b.n; i++) b[ch][i] = Math.tanh(b[ch][i] * 1.6) / 1.6; };
const norm0 = 0.9 / peak(mix); for (const b of [mix]) { for (const ch of ['L', 'R']) for (let i = 0; i < b.n; i++) b[ch][i] *= norm0; lim(b); }
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm * norm0 }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * norm0 * 0.9 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film14 score: ${DUR}s 150 BPM grid, half-time groove, ${kicks.length} kicks (${(kicks.length / DUR * 60).toFixed(0)}/min), norm ${norm.toFixed(3)}`);
