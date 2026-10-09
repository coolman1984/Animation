// Film 12 score — original energetic Western track at 120 BPM (beat 0.5 s, bar 2 s), 10 bars = 20.0 s, D minor.
// One two-bar hook (A asks, B answers) returns in every chapter, re-voiced: pluck (drafting) → saw lead (3D drop) →
// bells (options break) → low + high doubled lead (work-floor drop) → soft pluck (app) → full chorus on the logo (loudest).
// Progression Dm–Bb | F–C (two chords per bar). Every on-screen event has its own designed sound, placed from the
// shared clock (timing.js): pen scribble, dimension ticks, wall rise, laser cut, furniture landing as hook-scale marimba notes,
// finish sweeps, tile cascade, zone builds, container drops, app window, light wipe, logo bloom, CTA pop.
// No samples, no licence needed. Voice functions follow film6's synth recipes (studio tools, not a copied idea).
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, noiseHit, bell, reverb, writeWav, peak, biquad, rng, pan, bloop } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { HOME, WORK, SWEEP, EV, DUR } from './timing.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'takes', 'film12');
mkdirSync(OUT, { recursive: true });
const BEAT = 0.5, BAR = 2, S16 = 0.125, N = DUR + 2;
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

// ---------- harmony + hook (D minor) ----------
const CH = { Dm: { v: [62, 65, 69, 74], r: 38 }, Bb: { v: [62, 65, 70, 74], r: 34 }, F: { v: [60, 65, 69, 72], r: 41 }, C: { v: [60, 64, 67, 72], r: 36 } };
const PROG = [['Dm', 'Bb'], ['F', 'C']];
const pair = (bar) => PROG[bar % 2].map((k) => CH[k]);
const HOOK_A = [[0, 81, 2], [2, 79, 1], [3, 77, 1], [4, 79, 2], [6, 74, 2], [8, 77, 1], [9, 79, 1], [10, 81, 2], [12, 84, 3], [15, 81, 1]];
const HOOK_B = [[0, 81, 2], [2, 79, 1], [3, 77, 1], [4, 79, 2], [6, 74, 2], [8, 72, 2], [10, 74, 1], [11, 77, 1], [12, 74, 4]];
const hookFor = (bar) => (bar % 2 ? HOOK_B : HOOK_A);
function beatDrums(bar, lvl = 1, { to = 4 } = {}) {
  for (let b = 0; b < to; b++) kick(bt(bar, b), 0.95 * lvl);
  for (const b of [1, 3]) if (b < to) clap(bt(bar, b), 0.42 * lvl);
  for (let s = 0; s < to * 4; s++) hat(bt(bar) + s * S16, s % 4 === 2 ? 0.1 * lvl : 0.04 * lvl, s % 4 === 2, s % 2 ? 0.35 : -0.35);
}
function popChords(bar, lvl = 1, cut0 = 5200) { pair(bar).forEach((c, h) => { for (let e = 0; e < 4; e++) saw(chords, bt(bar, h * 2) + e * BEAT / 2, c.v, BEAT * 0.42, 0.5 * lvl, { cut0, cut1: 1300, decay: 0.12 }); }); }
function offBass(bar, lvl = 1) { pair(bar).forEach((c, h) => { for (let b = 0; b < 2; b++) sub(bt(bar, h * 2 + b + 0.5), c.r + 12, BEAT * 0.42, 0.8 * lvl); sub(bt(bar, h * 2 + 1.75), c.r + 24, S16 * 0.8, 0.45 * lvl); }); }
function hookLead(bar, { oct = 0, lvl = 1, cut0 = 8000, doubled = true } = {}) {
  for (const [s, m, l] of hookFor(bar)) saw(lead, bt(bar) + s * S16, doubled ? [m + oct, m + oct + 12] : [m + oct], l * S16 * 0.85, 0.4 * lvl, { cut0, cut1: 1700, decay: 0.09, voices: 3, detune: 0.08, width: 0.3 });
}

// ---------- 0–4 · drafting: plucked hook, filtered chords opening, build into the drop ----------
for (const bar of [0, 1]) {
  for (const [s, m, l] of hookFor(bar)) saw(lead, bt(bar) + s * S16, [m, m + 12], l * S16 * 0.8, 0.4, { cut0: 4200 + bar * 2000, cut1: 900, decay: 0.07, voices: 2, detune: 0.1, width: 0.4 });
  popChords(bar, 0.6, 1600 + bar * 1300);
  for (let e = 0; e < 8; e++) hat(bt(bar) + e * BEAT / 2, e % 2 ? 0.055 : 0.03, e % 2 === 1, e % 2 ? 0.3 : -0.3);
  pair(bar).forEach((c, h) => sub(bt(bar, h * 2), c.r + 12, BEAT * 1.5, 0.4));
}
kick(0.5, 0.7); kick(1.0, 0.75); for (let b = 0; b < 4; b++) kick(bt(1, b), 0.7); clap(bt(1, 1), 0.3); clap(bt(1, 3), 0.3);
roll(3.0, 3.92, 0.05, 0.32); riser(fx, EV.rise, { dur: 1.4, vel: 0.3, f0: 300, f1: 9000, tonal: 0.3, seed: 12 });

// ---------- 4–10 · DROP: the walls rise; the furniture groove ----------
for (let bar = 2; bar < 5; bar++) { beatDrums(bar); offBass(bar); popChords(bar); hookLead(bar, { lvl: bar === 4 ? 1.06 : 1 }); }
for (const st of [13, 14, 15]) snare(bt(4) + st * S16, 0.12 + st * 0.01);
// ---------- 10–12 · options break: half-time, the hook on bells, a held chord, build into drop 2 ----------
kick(10.0, 0.9); kick(10.75, 0.5); kick(11.0, 0.85); clap(10.5, 0.36); clap(11.5, 0.36);
for (let s = 0; s < 16; s++) hat(10.0 + s * S16, s % 4 === 2 ? 0.08 : 0.03, s % 4 === 2, s % 2 ? 0.35 : -0.35);
saw(chords, 10.0, CH.Dm.v, 0.95, 0.26, { cut0: 2400, cut1: 700, decay: 0.6, voices: 7, width: 0.9 }); saw(chords, 11.0, CH.Bb.v, 0.95, 0.26, { cut0: 2400, cut1: 700, decay: 0.6, voices: 7, width: 0.9 });
sub(10.0, 50, 0.9, 0.7); sub(11.0, 46, 0.9, 0.7);
for (const [s, m] of HOOK_A) tone(lead, 10.0 + s * S16, mtof(m + 12), mtof(m + 12), { dur: 0.2, vel: 0.2, harm: 0.15, p: s % 2 ? 0.3 : -0.3 });
roll(11.45, 11.97, 0.06, 0.32); riser(fx, EV.sink, { dur: 0.9, vel: 0.28, f0: 400, f1: 10000, tonal: 0.25, seed: 41 });
// ---------- 12–16 · DROP 2: the work floor (biggest groove before the logo) ----------
for (let bar = 6; bar < 8; bar++) { beatDrums(bar, 1.04); offBass(bar, 1.04); popChords(bar, 1.0, 6000); hookLead(bar, { oct: -12, lvl: 0.95, doubled: true }); hookLead(bar, { lvl: 0.55, doubled: false, cut0: 9000 }); }
roll(15.5, 15.97, 0.05, 0.22);
// ---------- 16–18 · the app: lighter, plucked hook, filtered pulse ----------
for (let b = 0; b < 4; b++) kick(bt(8, b), 0.7); clap(bt(8, 1), 0.3); clap(bt(8, 3), 0.3);
for (let e = 0; e < 8; e++) hat(bt(8) + e * BEAT / 2, e % 2 ? 0.05 : 0.025, e % 2 === 1, e % 2 ? 0.3 : -0.3);
for (const [s, m, l] of HOOK_B) saw(lead, bt(8) + s * S16, [m, m + 12], l * S16 * 0.8, 0.34, { cut0: 3600, cut1: 900, decay: 0.07, voices: 2, detune: 0.1, width: 0.4 });
popChords(8, 0.55, 1800); pair(8).forEach((c, h) => sub(bt(8, h * 2), c.r + 12, BEAT * 1.6, 0.5));
riser(fx, EV.logo, { dur: 0.6, vel: 0.26, f0: 500, f1: 11000, tonal: 0.2, seed: 51, tail: 0.002 });
// ---------- 18–20 · LOGO: full chorus on the first bar half, then the last chord rings to the end ----------
beatDrums(9, 1.18, { to: 3 }); offBass(9, 1.12); hookLead(9, { lvl: 1.2 }); popChords(9, 1.15, 6800);
saw(chords, 19.5, [62, 69, 74, 76, 81], 0.5, 0.42, { cut0: 7000, cut1: 1100, decay: 0.4, voices: 7, width: 0.9 }); sub(19.5, 38, 0.48, 0.8);

// ---------- designed sound for every on-screen event ----------
scribble(EV.penStart, EV.penEnd, 0.07);                                                              // the pen draws the outer walls
for (let i = 0; i < 6; i++) { click(fx, 0.9 + i * 0.1, { vel: 0.07, bright: 0.9, p: 0.3, seed: 60 + i }); click(fx, 1.2 + i * 0.08, { vel: 0.06, bright: 0.9, p: 0.6, seed: 70 + i }); } // dimensions counting
impact(fx, 0.5, { vel: 0.32, weight: 0.4 }); impact(fx, 1.0, { vel: 0.3, weight: 0.35 });          // hook words slam
for (let i = 0; i < 6; i++) tone(fx, EV.interior + i * 0.11, 1500 + i * 120, 900, { dur: 0.05, vel: 0.14, p: -0.4 + i * 0.16 }); // inner walls snap
for (let i = 0; i < 4; i++) bloop(fx, 2.35 + i * 0.12, 0.22, { f0: 1200 + i * 160, f1: 700 + i * 90, p: -0.5 + i * 0.33 }); // room areas pop
impact(fx, EV.rise, { vel: 0.85, weight: 0.85 }); whooshBy(fx, EV.rise + 0.35, { dur: 0.7, vel: 0.2, direction: 'center', low: 150, high: 2200, seed: 4 }); // walls rise with the sheet
laser(EV.cut, EV.cutEnd - EV.cut, 0.1); sweep(fx, EV.cut + 0.35, { dur: 0.6, vel: 0.12, up: false, seed: 14 }); // the cut plane slices to 1.10 m
impact(fx, 4.3, { vel: 0.35, weight: 0.4 });
{ const scale = [62, 65, 67, 69, 72, 74, 77, 79, 81]; let n = 0;                                    // furniture lands = rising marimba notes on the hook's scale
  for (const [i, c] of ['bedroom', 'living', 'kitchen', 'bath'].entries()) { const cnt = { bedroom: 8, living: 9, kitchen: 3, bath: 5 }[c];
    uiConfirm(fx, HOME[c], { vel: 0.16, notes: [81 + i * 2, 88 + i * 2] });
    for (let k = 0; k < cnt; k++) { const t = HOME[c] + 0.12 + k * 0.125; mallet(fx, t, scale[(k + i * 2) % scale.length] + 12, 0.32 - k * 0.012, -0.6 + ((n * 0.37) % 1.2)); softHit(fx, t, { vel: 0.12, tone: 150 + k * 6 }); n++; } } }
for (const [a, b] of SWEEP) { whooshBy(fx, (a + b) / 2, { dur: b - a + 0.2, vel: 0.24, direction: 'lr', low: 300, high: 4200, seed: Math.round(a * 10) }); click(fx, a + 0.25, { vel: 0.4, bright: 0.7 }); bell(fx, a + 0.27, 88, 0.12, { decay: 0.7 }); } // finish sweeps + selector
impact(fx, EV.sink, { vel: 0.85, weight: 0.9 }); sweep(fx, EV.sink + 0.2, { dur: 0.45, vel: 0.14, up: false, seed: 16 });
{ const r = rng(99); for (let i = 0; i < 26; i++) click(fx, EV.tiles + 0.05 + Math.pow(i / 26, 1.2) * 0.75 + r() * 0.02, { vel: 0.05 + r() * 0.05, bright: 0.5 + r() * 0.3, p: r() * 2 - 1, seed: 300 + i }); } // tiles flip
for (const [z, t0] of Object.entries(WORK)) { whooshBy(fx, t0 + 0.28, { dur: 0.55, vel: 0.18, direction: z === 'offices' || z === 'line' ? 'rl' : 'lr', low: 250, high: 3600, seed: Math.round(t0 * 7) }); uiConfirm(fx, t0, { vel: 0.14, notes: [86, 93] }); }
for (let i = 0; i < 7; i++) impact(fx, WORK.containers + [0, 0.08, 0.12, 0.2, 0.24, 0.32, 0.36][i] + 0.06, { vel: 0.32 - i * 0.02, weight: 0.8, p: -0.4 + i * 0.13, seed: 90 + i }); // containers drop
{ const r = rng(5); for (let i = 0; i < 10; i++) click(fx, WORK.line + 0.6 + i * 0.25, { vel: 0.04, bright: 0.3, p: -0.5, seed: 500 + i }); }                  // conveyor
whooshBy(fx, EV.appIn + 0.2, { dur: 0.6, vel: 0.24, direction: 'center', low: 200, high: 3000, seed: 23 }); softHit(fx, EV.appIn + 0.45, { vel: 0.3, tone: 196 }); // app window lands
uiConfirm(fx, 16.78, { vel: 0.24, notes: [86, 93] });                                                 // "ready" box highlighted
whooshBy(fx, EV.wipe + 0.2, { dur: 0.45, vel: 0.2, direction: 'center', low: 500, high: 6000, seed: 29 }); // light wipe
impact(fx, EV.logo, { vel: 0.9, weight: 0.85 }); [62, 69, 74, 77, 81, 86].forEach((m, i) => bell(fx, EV.logo + 0.02 + i * 0.045, m + 12, 0.11, { p: -0.5 + i * 0.2, decay: 1.4 })); // logo bloom
tone(fx, EV.cta, 800, 1300, { dur: 0.08, vel: 0.26 }); click(fx, 19.0, { vel: 0.35, bright: 0.7 }); uiConfirm(fx, 19.02, { vel: 0.2, notes: [86, 93] }); // CTA + pulse
[74, 81, 86, 88, 93].forEach((m, i) => bell(fx, 19.5 + i * 0.06, m, 0.08, { p: -0.4 + i * 0.2, decay: 1.6 }));

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
console.log(`film12 score: ${DUR}s 120 BPM D minor, norm ${norm.toFixed(3)}`);
