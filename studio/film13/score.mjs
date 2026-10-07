// Film 13 score — original stadium-energy track at 120 BPM (beat 0.5 s, bar 2 s), 10 bars = 20.0 s, E minor (Em–C | G–D).
// One two-bar hook returns in every chapter: plucked under the floodlights → saw lead on the tactics drop → full on the attack →
// a filtered, half-time version in the frozen replay (time stands still) → lead again for the host → full chorus on the title (loudest).
// Designed sound per on-screen event from the shared clock (timing.js): floodlight clunks, chalk scribble and taps, the line sweep,
// players rising, passes and the shot as ball thumps, net swish + crowd roar on the goal, tape rewind into the replay, HUD ticks,
// screen whoosh, title hit with bells. Voice functions follow film6/film12 synth recipes. No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, noiseHit, bell, reverb, writeWav, peak, biquad, rng, pan, bloop } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep, texture } from '../lib/sfx.mjs';
import { EV, DUR } from './timing.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'takes', 'film13');
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

// crowd roar: band-limited noise swell (the goal), and a low bed for the stadium
function crowd(t0, dur, vel = 0.2, { attack = 0.08, bright = 0.12 } = {}) { const i0 = Math.round(t0 * SR), n = Math.round(dur * SR), r = rng(Math.round(t0 * 100)); let a = 0, b = 0, c = 0;
  for (let k = 0; k < n; k++) { const tt = k / SR, x = r() * 2 - 1; a += bright * (x - a); b += 0.02 * (a - b); c = a - b; const env = Math.min(1, tt / attack) * Math.exp(-Math.max(0, tt - attack) / (dur * 0.45)) * (1 + 0.15 * Math.sin(tt * 2 * Math.PI * 3.1));
    fx.add(i0 + k, c * env * vel * 2.2, (a - b * 0.9) * env * vel * 2.2); } }
function thump(t, vel = 0.5) { kickBall(t, vel); noiseHit(fx, t, { dur: 0.03, vel: vel * 0.4, bp: 900, q: 1.2, seed: Math.round(t * 333) }); }
function kickBall(t, vel) { const i0 = Math.round(t * SR); let ph = 0; for (let k = 0; k < SR * 0.18; k++) { const tt = k / SR, f = 90 + 160 * Math.exp(-tt / 0.012); ph += 2 * Math.PI * f / SR; fx.add(i0 + k, Math.sin(ph) * Math.exp(-tt / 0.05) * vel * 0.5); } }
function clunk(t, vel = 0.5, p = 0) { impact(fx, t, { vel: vel * 0.7, weight: 0.9, p }); tone(fx, t, 180, 60, { dur: 0.12, vel: vel * 0.6, p }); noiseHit(fx, t + 0.01, { dur: 0.25, vel: vel * 0.12, hp: 5000, p, seed: Math.round(t * 71) }); }

// ---------- harmony + hook (E minor) ----------
const CH = { Em: { v: [64, 67, 71, 76], r: 40 }, C: { v: [64, 67, 72, 76], r: 36 }, G: { v: [62, 67, 71, 74], r: 43 }, D: { v: [62, 66, 69, 74], r: 38 } };
const PROG = [['Em', 'C'], ['G', 'D']];
const pair = (bar) => PROG[bar % 2].map((k) => CH[k]);
const HOOK_A = [[0, 83, 2], [2, 83, 1], [3, 81, 1], [4, 79, 2], [6, 76, 1], [7, 79, 1], [8, 81, 3], [11, 79, 1], [12, 76, 2], [14, 74, 2]];
const HOOK_B = [[0, 83, 2], [2, 83, 1], [3, 81, 1], [4, 79, 2], [6, 76, 1], [7, 79, 1], [8, 86, 2], [10, 83, 2], [12, 79, 4]];
const hookFor = (bar) => (bar % 2 ? HOOK_B : HOOK_A);
function beatDrums(bar, lvl = 1, { to = 4 } = {}) {
  for (let b = 0; b < to; b++) kick(bt(bar, b), 0.95 * lvl);
  for (const b of [1, 3]) if (b < to) clap(bt(bar, b), 0.45 * lvl);
  for (let s = 0; s < to * 4; s++) hat(bt(bar) + s * S16, s % 4 === 2 ? 0.1 * lvl : 0.04 * lvl, s % 4 === 2, s % 2 ? 0.35 : -0.35);
}
function popChords(bar, lvl = 1, cut0 = 5200) { pair(bar).forEach((c, h) => { for (let e = 0; e < 4; e++) saw(chords, bt(bar, h * 2) + e * BEAT / 2, c.v, BEAT * 0.42, 0.5 * lvl, { cut0, cut1: 1300, decay: 0.12 }); }); }
function offBass(bar, lvl = 1) { pair(bar).forEach((c, h) => { for (let b = 0; b < 2; b++) sub(bt(bar, h * 2 + b + 0.5), c.r + 12, BEAT * 0.42, 0.8 * lvl); sub(bt(bar, h * 2 + 1.75), c.r + 24, S16 * 0.8, 0.45 * lvl); }); }
function hookLead(bar, { oct = 0, lvl = 1, cut0 = 8000, doubled = true } = {}) {
  for (const [s, m, l] of hookFor(bar)) saw(lead, bt(bar) + s * S16, doubled ? [m + oct, m + oct + 12] : [m + oct], l * S16 * 0.85, 0.4 * lvl, { cut0, cut1: 1700, decay: 0.09, voices: 3, detune: 0.08, width: 0.3 });
}

// ---------- 0–4 · floodlights + chalk: plucked hook, chords open, build ----------
for (const bar of [0, 1]) {
  for (const [s, m, l] of hookFor(bar)) saw(lead, bt(bar) + s * S16, [m - 12, m], l * S16 * 0.8, 0.38, { cut0: 3800 + bar * 2400, cut1: 900, decay: 0.07, voices: 2, detune: 0.1, width: 0.4 });
  popChords(bar, 0.55, 1500 + bar * 1500);
  for (let e = 0; e < 8; e++) hat(bt(bar) + e * BEAT / 2, e % 2 ? 0.05 : 0.025, e % 2 === 1, e % 2 ? 0.3 : -0.3);
  pair(bar).forEach((c, h) => sub(bt(bar, h * 2), c.r + 12, BEAT * 1.5, 0.45));
}
for (let b = 0; b < 4; b++) kick(bt(1, b), 0.7); clap(bt(1, 1), 0.3); clap(bt(1, 3), 0.3);
roll(3.0, 3.94, 0.05, 0.32); riser(fx, EV.lift, { dur: 1.3, vel: 0.3, f0: 300, f1: 9000, tonal: 0.3, seed: 12 });
// ---------- 4–9 · DROP: tactics in 3D, the attack ----------
for (let bar = 2; bar < 5; bar++) { beatDrums(bar); offBass(bar); popChords(bar); hookLead(bar, { lvl: bar === 4 ? 1.08 : 1 }); }
// ---------- 9–10 · GOAL: big hit, the groove keeps going one bar ----------
// (the groove carries through the goal; no doubled kicks)
// ---------- 10–14 · frozen replay: time stands still — held filtered chords, half-time pulse, hook on bells ----------
for (const bar of [5, 6]) { pair(bar).forEach((c, h) => { saw(chords, bt(bar, h * 2), c.v, 0.95, 0.24, { cut0: 1500, cut1: 600, decay: 0.6, voices: 7, width: 0.9 }); sub(bt(bar, h * 2), c.r + 12, 0.95, 0.6); });
  kick(bt(bar, 0), 0.75); kick(bt(bar, 2.5), 0.45); clap(bt(bar, 2), 0.3);
  for (const [s, m] of hookFor(bar)) tone(lead, bt(bar) + s * S16, mtof(m), mtof(m), { dur: 0.22, vel: 0.18, harm: 0.15, p: s % 2 ? 0.3 : -0.3 }); }
roll(13.45, 13.97, 0.05, 0.3); riser(fx, EV.screen, { dur: 0.9, vel: 0.26, f0: 400, f1: 10000, tonal: 0.25, seed: 41 });
// ---------- 14–17.5 · the host on the big screen: driving but lighter ----------
for (let bar = 7; bar < 8; bar++) { beatDrums(bar, 0.9); offBass(bar, 0.9); popChords(bar, 0.8, 3600); hookLead(bar, { lvl: 0.75, cut0: 4200 }); }
for (let b = 0; b < 3; b++) kick(bt(8, b), 0.85); clap(bt(8, 1), 0.38); hookLead(8, { lvl: 0.7, cut0: 4500 }); popChords(8, 0.75, 3800); offBass(8, 0.85);
roll(16.6, 17.47, 0.05, 0.34);
// ---------- 17.5–20 · TITLE: full chorus (loudest), then the last chord rings ----------
kick(17.5, 1.1); impact(fx, 17.5, { vel: 0.95, weight: 0.9 });
saw(chords, 17.5, [64, 71, 76, 79, 83], 0.48, 0.5, { cut0: 8000, cut1: 1400, decay: 0.3, voices: 7, width: 0.9 }); sub(17.5, 52, 0.45, 0.9);
beatDrums(9, 1.3, { to: 3 }); offBass(9, 1.2); hookLead(9, { lvl: 1.35 }); popChords(9, 1.25, 7400);
saw(chords, 19.5, [64, 71, 76, 79, 83], 0.5, 0.42, { cut0: 7000, cut1: 1100, decay: 0.4, voices: 7, width: 0.9 }); sub(19.5, 40, 0.48, 0.8);

// ---------- designed sound ----------
texture(fx, 0, DUR, { level: 0.012, kind: 'room', seed: 19, fade: 0.6 });                                // stadium air
[0, 0.25, 0.5, 0.75, 1.0, 1.25].forEach((t, i) => clunk(t, 0.55 - i * 0.03, -0.6 + i * 0.24));           // floodlights on
crowd(0.3, 3.5, 0.05, { attack: 1.2, bright: 0.08 });                                                       // the crowd wakes
scribble(0.1, 1.2, 0.08); impact(fx, EV.title, { vel: 0.35, weight: 0.4 }); impact(fx, EV.title + 0.25, { vel: 0.3, weight: 0.35 });
whooshBy(fx, (EV.line + EV.lineEnd) / 2, { dur: 0.6, vel: 0.26, direction: 'lr', low: 300, high: 4500, seed: 3 });
for (let i = 0; i < 6; i++) click(fx, EV.board + i * 0.09, { vel: 0.16, bright: 0.35, p: -0.5 + i * 0.2, seed: 40 + i });   // chalk O
for (let i = 0; i < 6; i++) { click(fx, EV.board + 0.5 + i * 0.07, { vel: 0.12, bright: 0.45, p: 0.5 - i * 0.2, seed: 60 + i }); click(fx, EV.board + 0.535 + i * 0.07, { vel: 0.1, bright: 0.45, seed: 80 + i }); } // chalk X
for (let i = 0; i < 4; i++) scribble(EV.arrows + i * 0.16, EV.arrows + i * 0.16 + 0.4, 0.05);                    // arrows
impact(fx, EV.lift, { vel: 0.85, weight: 0.85 }); for (let i = 0; i < 12; i++) bloop(fx, EV.lift + 0.05 + (i % 6) * 0.06 + (i >= 6 ? 0.18 : 0), 0.12, { f0: 500 + i * 60, f1: 900 + i * 50, p: -0.6 + (i % 6) * 0.24 }); // players rise
EV.passes.slice(0, 3).forEach((t, i) => { thump(t, 0.55); whooshBy(fx, t + 0.25, { dur: 0.45, vel: 0.1, direction: i % 2 ? 'rl' : 'lr', low: 400, high: 3000, seed: 90 + i }); });
thump(EV.passes[3], 0.4); for (let i = 1; i < 6; i++) thump(EV.dribble + i * 0.125, 0.2);
thump(EV.shot, 0.95); whooshBy(fx, EV.shot + 0.4, { dur: 0.75, vel: 0.28, direction: 'lr', low: 250, high: 6000, seed: 7 });
impact(fx, EV.goal, { vel: 0.8, weight: 1 }); noiseHit(fx, EV.goal + 0.01, { dur: 0.35, vel: 0.22, bp: 3000, q: 0.6, seed: 101 }); // net
crowd(EV.goal, 1.6, 0.22, { attack: 0.06, bright: 0.16 }); [76, 83, 88, 91].forEach((m, i) => bell(fx, EV.goal + 0.04 + i * 0.05, m, 0.1, { p: -0.4 + i * 0.25, decay: 1.0 }));
riser(fx, EV.freeze, { dur: 0.32, vel: 0.22, f0: 6000, f1: 300, tonal: 0.4, seed: 55, tail: 0.002 }); sweep(fx, EV.replay + 0.15, { dur: 0.3, vel: 0.16, up: false, seed: 23 }); // tape rewind
uiConfirm(fx, EV.freeze + 0.05, { vel: 0.2, notes: [88, 95] }); for (let i = 0; i < 14; i++) click(fx, EV.freeze + 0.25 + i * 0.25, { vel: 0.05, bright: 0.9, p: i % 2 ? 0.4 : -0.4, seed: 200 + i }); // HUD ticks
thump(EV.unfreeze, 0.7); whooshBy(fx, EV.screen + 0.25, { dur: 0.7, vel: 0.26, direction: 'center', low: 200, high: 3500, seed: 31 }); // the ball flies, the camera whips to the screen
softHit(fx, EV.host, { vel: 0.3, tone: 196 }); crowd(EV.host, 3.0, 0.07, { attack: 0.5, bright: 0.08 });
[64, 71, 76, 83, 88].forEach((m, i) => bell(fx, EV.final + 0.03 + i * 0.05, m + 12, 0.1, { p: -0.5 + i * 0.25, decay: 1.4 }));
sweep(fx, EV.final + 0.8, { dur: 0.5, vel: 0.12, up: true, seed: 29 }); tone(fx, EV.final + 1.0, 900, 1500, { dur: 0.08, vel: 0.26 }); // underline + the dot
crowd(EV.final, 2.4, 0.2, { attack: 0.1, bright: 0.12 });
[76, 83, 88, 91, 95].forEach((m, i) => bell(fx, 19.5 + i * 0.06, m, 0.07, { p: -0.4 + i * 0.2, decay: 1.6 }));

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
console.log(`film13 score: ${DUR}s 120 BPM E minor, norm ${norm.toFixed(3)}`);
