// Film 11 score v2 — AI × HR workshop showreel — original, 120 BPM (beat 0.5 s = 15 frames at 30 fps, bar 2 s, 22 bars = 44 s).
// Western dance-pop: four-on-the-floor kick, offbeat open hats and octave bass (the house bounce), off-beat chord stabs, and ONE syncopated
// 3-3-2 hook that returns in every chapter: filtered pluck (intro) → full lead (drop on the flash, chorus on the title) → bells (hosts)
// → soft pluck under the six areas → snare build 4/8/16/32 through the ring → a breath → the biggest drop on "Bigger" → finale + final chord.
// Every picture event in timing.js has its own sound. Not listened to (measured only).
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, pad, rhodes, pluck, bell, noiseHit, reverb, writeWav, peak, biquad, pan } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };
import { BEAT, BAR, CH, EV } from './timing.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film11');
mkdirSync(OUT, { recursive: true });
const DUR = 44, E8 = BEAT / 2, S16 = BEAT / 4, N = DUR + 2, b = (n) => n * BEAT;
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



// ---------- v2 harmony and form (120 BPM, 22 bars): Am F C G pop loop, one syncopated hook (3-3-2), arranged by chapter ----------
const CH_ = { Am: { v: [57, 60, 64, 69], r: 33 }, F: { v: [53, 57, 60, 65], r: 29 }, C: { v: [55, 60, 64, 67], r: 36 }, G: { v: [55, 59, 62, 67], r: 31 } };
const LOOP = ['Am', 'F', 'C', 'G'];
const chordAt = (bar) => (bar >= 21 ? 'C' : LOOP[bar % 4]);
// the hook: [8th position, midi, length in 8ths] — 3+3+2 syncopation, call (Am F) and answer (C G)
const HOOK = {
  Am: [[0, 76, 1.5], [1.5, 76, 1.5], [3, 79, 1], [4, 81, 1.5], [5.5, 79, 1], [6.5, 76, 1.5]],
  F: [[0, 77, 1.5], [1.5, 77, 1.5], [3, 76, 1], [4, 72, 2], [6, 74, 2]],
  C: [[0, 76, 1.5], [1.5, 76, 1.5], [3, 79, 1], [4, 84, 1.5], [5.5, 83, 1], [6.5, 79, 1.5]],
  G: [[0, 79, 1.5], [1.5, 79, 1.5], [3, 81, 1], [4, 83, 2], [6, 86, 1], [7, 83, 1]],
};
// sections in beats: intro 0–8 · drop 8–16 · chorus 16–24 · hosts 24–32 · verse (six areas) 32–64 · build (ring) 64–72 · DROP 72–80 · finale 80–88
const sec = (k) => (k < 8 ? 'intro' : k < 16 ? 'drop' : k < 24 ? 'chorus' : k < 32 ? 'hosts' : k < 64 ? 'verse' : k < 72 ? 'build' : k < 80 ? 'drop2' : 'finale');
const BIG = new Set(['drop', 'chorus', 'drop2', 'finale']);

// ---------- groove ----------
for (let k = 0; k < 86; k++) {
  const t = b(k), bar = Math.floor(k / 4), beat = k % 4, name = chordAt(bar), c = CH_[name], S = sec(k);
  const big = BIG.has(S), lift = S === 'drop2' || S === 'finale' ? 1.15 : 1;
  // kick: four on the floor everywhere but the intro start and the last two beats of the build
  const kOn = S === 'intro' ? k >= 4 : S === 'build' ? k < 70 : true;
  if (kOn) kick909(t, (big ? 0.95 : S === 'hosts' ? 0.8 : 0.85) * lift);
  if (S === 'build' && k >= 68 && k < 70) kick909(t + E8, 0.6);
  // clap on 2 and 4 (snare roll in the build)
  if ((beat === 1 || beat === 3) && S !== 'intro' && S !== 'build') clap(t, (big ? 0.42 : 0.34) * lift);
  // hats: offbeat open hat (the house "tss"), 16ths in the intro and the second half of the verse
  if (S !== 'intro') hat(t + E8, (big ? 0.085 : 0.065) * lift, true, 0.3);
  if (S === 'intro' || (S === 'verse' && k >= 48) || S === 'build' || BIG.has(S)) { hat(t + S16, 0.028, false, 0.4); hat(t + E8 + S16, 0.028, false, -0.4); }
  if (k % 2 === 1 && S !== 'intro') shaker(t + S16 * 3, 0.03);
  // bass: offbeat octave bounce, root on the downbeat in the big sections
  if (S !== 'intro') { sub(t + E8, c.r + 12, E8 * 0.8, 0.7 * lift); if (big && beat % 2 === 0) sub(t, c.r, E8 * 0.7, 0.45); if (beat === 3) sub(t + E8 + S16, c.r + 19, S16 * 0.8, 0.35); }
  // pads: one chord per bar, filter opening through the intro and the build
  if (beat === 0) { const open = S === 'intro' ? 900 + 2400 * k / 8 : S === 'build' ? 1800 + 3600 * (k - 64) / 8 : big ? 4200 : 2600;
    saw(pads, t, c.v, BAR * 0.98, (big ? 0.32 : 0.24) * lift, { cut0: open, cut1: 700, decay: 0.8, voices: 5, width: 0.7 }); }
  // stabs: off-beat chord stabs (the bounce) in the big sections and the verse
  if ((big || S === 'verse' || S === 'hosts') && (beat === 1 || beat === 3)) saw(keys, t + E8, c.v.map((m) => m + 12), E8 * 0.6, (big ? 0.2 : 0.14) * lift, { cut0: 6000, cut1: 1500, decay: 0.08, voices: 3, detune: 0.1 });
  // arp: 16th plucks climbing the chord (verse, build, hosts)
  if (S === 'verse' || S === 'build' || S === 'hosts' || S === 'intro') for (let e = 0; e < 4; e++) pluck(arp, t + e * S16, c.v[(k * 4 + e) % 4] + 12 + (e === 3 ? 12 : 0), (S === 'intro' ? 0.1 + 0.012 * k : 0.13), { p: e % 2 ? 0.45 : -0.45, damp: 0.6, decay: 0.993, bright: 0.75, seed: 3 + k * 4 + e });
  // the hook, by chapter: full lead in the big sections, bells answering in the hosts chapter, a soft pluck every other pair of bars in the verse
  if (beat === 0) {
    const notes = HOOK[name];
    if (big) for (const [e, m, len] of notes) { rhodes(lead, t + e * E8, m, len * E8 * 0.9, 0.36 * lift, { p: 0.12, trem: 0.04 }); saw(lead, t + e * E8, [m, m + 12], len * E8 * 0.8, 0.22 * lift, { cut0: 7500, cut1: 2000, decay: 0.14, voices: 3, detune: 0.09, width: 0.35 }); if (S === 'drop2' || S === 'finale') pluck(lead, t + e * E8, m + 12, 0.16, { p: -0.2, bright: 0.9, seed: 50 + e }); }
    else if (S === 'hosts') for (const [e, m] of notes) bell(lead, t + e * E8, m + 12, 0.12, { decay: 0.9, p: e < 4 ? -0.4 : 0.4 });
    else if (S === 'verse' && bar % 4 >= 2) for (const [e, m, len] of notes) pluck(lead, t + e * E8, m, 0.17, { p: 0.2, bright: 0.8, decay: 0.996, seed: 70 + e });
    else if (S === 'intro' && bar === 1) for (const [e, m] of notes) pluck(lead, t + e * E8, m, 0.12, { p: 0.1, bright: 0.4, seed: 80 + e });
  }
}
// ---------- builds and drops ----------
for (let i = 0; i < 16; i++) { const t = b(6) + i * (b(2) / 16); noiseHit(drums, t, { dur: 0.04, vel: 0.05 + i * 0.022, bp: 1900, q: 0.8, tone: 240, seed: 600 + i }); }     // snare roll into the first drop
riser(fx, EV.flash, { dur: b(4), vel: 0.34, f0: 260, f1: 9500, tonal: 0.3, seed: 2 });
riser(fx, CH.title, { dur: b(3), vel: 0.34, f0: 200, f1: 10000, tonal: 0.35, seed: 4, tail: 0.002 });
for (let i = 0; i < 12; i++) noiseHit(drums, b(14) + i * b(2) / 12, { dur: 0.04, vel: 0.06 + i * 0.025, bp: 2000, q: 0.8, tone: 260, seed: 700 + i });
{ let n = 0; for (let k = 64; k < 72; k++) { const per = k < 66 ? 1 : k < 68 ? 2 : k < 70 ? 4 : 8; for (let j = 0; j < per; j++) noiseHit(drums, b(k) + j * BEAT / per, { dur: 0.045, vel: 0.06 + 0.2 * (k - 64) / 8, bp: 1800 + 120 * (k - 64), q: 0.8, tone: 220 + 10 * (k - 64), seed: 800 + n++ }); } }  // the ring build: snare 4 → 8 → 16 → 32
riser(fx, CH.mega, { dur: b(8), vel: 0.36, f0: 180, f1: 12000, tonal: 0.4, seed: 16, tail: 0.002 });
const cutBuses = [drums, low, pads, keys, arp, lead];                     // breaths: everything stops just before the title and the final drop
// ---------- picture events ----------
EV.words1.forEach((t, i) => { impact(fx, t, { vel: 0.5 + 0.08 * i, weight: 0.6 }); whooshBy(fx, t - 0.06, { dur: 0.3, vel: 0.14, direction: i % 2 ? 'rl' : 'lr', low: 300, high: 4200, seed: 10 + i }); });
for (let i = 0; i < 18; i++) { const t = b(0.5) + i * 0.2; whooshBy(fx, t, { dur: 0.12, vel: 0.03 + 0.05 * (i / 18), direction: i % 2 ? 'lr' : 'rl', low: 900, high: 7000, seed: 40 + i }); }   // papers streaking past
impact(fx, EV.flash, { vel: 1.0, weight: 0.95 }); noiseHit(fx, EV.flash, { dur: 0.9, vel: 0.25, hp: 5000, seed: 21, attack: 0.01 });
sweep(fx, EV.ai + 0.1, { dur: 0.7, vel: 0.14, up: true, seed: 5 });
[[EV.mashi, 78], [EV.tail, 74]].forEach(([t, m]) => { bell(fx, t, m + 12, 0.14, { decay: 0.7 }); click(fx, t, { vel: 0.25, bright: 0.7 }); });
for (let i = 0; i < 9; i++) noiseHit(fx, EV.tool + i * 0.04, { dur: 0.02, vel: 0.12, hp: 3000 + 500 * i, seed: 900 + i });                 // "Tool" glitches in
whooshBy(fx, EV.slash, { dur: 0.22, vel: 0.5, direction: 'lr', low: 600, high: 9000, seed: 30 }); impact(fx, EV.slash + 0.08, { vel: 0.85, weight: 0.7 });
[[EV.slash + 0.5, 70], [EV.slash + 0.62, 62]].forEach(([t, f]) => softHit(fx, t, { vel: 0.35, tone: f }));
whooshBy(fx, EV.implode + 0.2, { dur: 0.8, vel: 0.35, direction: 'center', low: 200, high: 1500, seed: 31 });
impact(fx, EV.title, { vel: 1.0, weight: 1.0 }); sub(EV.title, 33, BEAT * 3, 0.95);
[0, 1, 2, 3, 4].forEach((i) => bell(fx, EV.title + 0.03 + i * 0.05, [76, 81, 84, 88, 93][i], 0.14, { decay: 1.4, p: -0.5 + i * 0.25 }));
whooshBy(fx, EV.xspin, { dur: 0.5, vel: 0.3, direction: 'rl', low: 300, high: 6000, seed: 33 }); glide(fx, EV.xspin, 0.55, 300, 1500, 0.1, 0.2);
for (let i = 0; i < 8; i++) click(fx, EV.sub + 0.07 * i * 3, { vel: 0.13, bright: 0.9, p: i % 2 ? 0.4 : -0.4, seed: 100 + i });
tone(fx, EV.pill, 700, 1500, { dur: 0.1, vel: 0.28 }); uiConfirm(fx, EV.pill + 0.05, { vel: 0.2, notes: [84, 91] });
// hosts: the light line, two name slams, the roles tick in, a shimmer on the sweep
glide(fx, EV.line, 0.5, 400, 1600, 0.12, 0); sweep(fx, EV.line, { dur: 0.6, vel: 0.12, up: true, seed: 90 });
[EV.host1, EV.host2].forEach((t, i) => { impact(fx, t, { vel: 0.62, weight: 0.55 }); whooshBy(fx, t - 0.05, { dur: 0.35, vel: 0.22, direction: i ? 'rl' : 'lr', low: 400, high: 5000, seed: 91 + i }); bell(fx, t + 0.42, [88, 91][i], 0.12, { decay: 1.0, p: i ? 0.5 : -0.5 }); });
for (let i = 0; i < 6; i++) click(fx, EV.roles - 0.25 + i * 0.09, { vel: 0.12, bright: 0.9, p: i % 2 ? 0.5 : -0.5, seed: 120 + i });
for (let i = 0; i < 10; i++) bell(fx, EV.roles + 0.3 + i * 0.09, [84, 88, 91, 96][i % 4], 0.05, { decay: 0.6, p: -0.8 + i * 0.17 });
for (let i = 0; i < EV.flipN; i++) {                                                                                                          // six flips: a ratchet that rises each card
  const t = EV.flip0 + i * EV.flipStep, f = 620 * Math.pow(1.1, i);
  whooshBy(fx, t - 0.3, { dur: 0.35, vel: 0.2, direction: 'center', low: 400, high: 5000, seed: 60 + i }); impact(fx, t, { vel: 0.42, weight: 0.3 });
  for (let r = 0; r < 4; r++) click(fx, t - 0.25 + r * 0.05, { vel: 0.13, bright: 0.5 + 0.1 * r, seed: 200 + i * 5 + r });
  tone(fx, t + 0.5, f * 1.5, f * 1.5, { dur: 0.12, vel: 0.2 }); bell(fx, t + 0.62, 79 + i * 2, 0.14, { decay: 0.8, p: 0.3 });                  // old → new, the AI badge pings
}
glide(fx, CH.ring, 2.0, 200, 1200, 0.12, 0); sweep(fx, CH.ring + 0.6, { dur: 1.6, vel: 0.15, up: true, seed: 15 });
for (let i = 0; i < 6; i++) { bell(fx, CH.ring + 0.1 + i * 0.1, 84 + i * 2, 0.12, { decay: 0.9, p: -0.6 + i * 0.24 }); click(fx, CH.ring + 0.1 + i * 0.1, { vel: 0.2, bright: 0.8 }); }
for (let i = 0; i < 14; i++) whooshBy(fx, CH.ring + 0.8 + i * 0.2, { dur: 0.22, vel: 0.07, direction: i % 2 ? 'lr' : 'rl', low: 500, high: 5000, seed: 70 + i });
impact(fx, CH.mega, { vel: 1.0, weight: 0.95 }); sub(CH.mega, 33, BEAT * 2, 0.95); noiseHit(fx, CH.mega, { dur: 1.0, vel: 0.25, hp: 5000, seed: 26, attack: 0.01 });
impact(fx, EV.than, { vel: 0.6, weight: 0.5 });
[EV.wipe1, EV.wipe2, EV.wipe3].forEach((t, i) => { whooshBy(fx, t, { dur: 0.3, vel: 0.35, direction: 'rl', low: 300, high: 8000, seed: 80 + i }); impact(fx, t + 0.08, { vel: 0.75 + 0.1 * i, weight: 0.6 }); bell(fx, t + 0.08, 81 + i * 4, 0.16, { decay: 1.0 }); });
riser(fx, CH.end, { dur: b(2), vel: 0.3, f0: 600, f1: 12000, tonal: 0.2, seed: 18, tail: 0.002 });
impact(fx, CH.end, { vel: 1.0, weight: 1.0 }); sub(CH.end, 33, BEAT * 4, 1.0); noiseHit(fx, CH.end, { dur: 1.6, vel: 0.3, hp: 4500, seed: 25, attack: 0.01 });
for (let i = 0; i < 28; i++) bell(fx, CH.end + 0.05 + i * 0.045, [88, 91, 93, 96, 100][i % 5], 0.05, { decay: 0.6, p: (i % 7) / 3.5 - 0.9 });  // sparks
impact(fx, EV.soon, { vel: 0.8, weight: 0.8 });
tone(fx, EV.cta, 800, 1400, { dur: 0.1, vel: 0.28 }); uiConfirm(fx, EV.cta + 0.05, { vel: 0.22, notes: [84, 91, 96], gap: 0.06 });
for (let i = 0; i < 4; i++) click(fx, EV.names + i * 0.12, { vel: 0.14, bright: 0.9, p: -0.4 + i * 0.27, seed: 140 + i });
// the final chord rings under the hold
saw(pads, b(86), [45, 57, 60, 64, 67, 72], b(4), 0.38, { cut0: 3600, cut1: 1100, decay: 1.2, voices: 6, width: 0.8 });
[72, 76, 79, 84, 88, 91].forEach((m, i) => bell(fx, b(86) + 0.02 + i * 0.07, m, 0.12, { decay: 2.4, p: -0.5 + i * 0.2 }));
impact(fx, b(86), { vel: 0.7, weight: 0.8 }); sub(b(86), 36, BEAT * 3.5, 0.9);
placeCues(fx, plan.cues);

// ---------- processing ----------

const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(pads, 0.6); pump(low, 0.5, 0.1); pump(keys, 0.4, 0.1); pump(arp, 0.3, 0.1); pump(lead, 0.2, 0.08);
{ const cutB = (bus, t0, t1) => { for (let i = Math.round(t0 * SR); i < Math.round(t1 * SR); i++) { bus.L[i] *= 0.0; bus.R[i] *= 0.0; } }; for (const bus of cutBuses) { cutB(bus, CH.title - 0.12, CH.title); cutB(bus, CH.mega - 0.25, CH.mega); } }
const cut = (bus, t0, t1, t2) => { for (let i = Math.round(t0 * SR); i < Math.min(bus.n, Math.round(t2 * SR)); i++) { const t = i / SR, g = t < t1 ? 1 - (t - t0) / (t1 - t0) : Math.min(1, (t - t1) / (t2 - t1)); bus.L[i] *= g; bus.R[i] *= g; } };
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(pads, 150); hp(arp, 200); hp(lead, 220); hp(keys, 160); hp(fx, 40);
let music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.75); pads.mixInto(music, 1.25); keys.mixInto(music, 1.3); arp.mixInto(music, 1.35); lead.mixInto(music, 1.2);
const send = mk(); pads.mixInto(send, 0.4); keys.mixInto(send, 0.55); arp.mixInto(send, 0.5); lead.mixInto(send, 0.6);
reverb(send, { room: 0.86, damp: 0.4 }).mixInto(music, 0.75);
hp(music, 28);
let sfx = mk(); fx.mixInto(sfx, 1);

const DUR_OUT = 44;
for (const b of [music, sfx]) { for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR_OUT ? 0 : t > DUR_OUT - 0.6 ? Math.cos(((t - (DUR_OUT - 0.6)) / 0.6) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; } b.n = DUR_OUT * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n); }
const mix = new Bus(DUR_OUT); music.mixInto(mix, 1); sfx.mixInto(mix, 0.9);
{ const p0 = peak(mix), k = 2.6; for (let i = 0; i < mix.n; i++) { mix.L[i] = Math.tanh(k * mix.L[i] / p0) / Math.tanh(k) * p0; mix.R[i] = Math.tanh(k * mix.R[i] / p0) / Math.tanh(k) * p0; } } // soft limiting: more loudness, same peak
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 0.9 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film11 score: ${DUR_OUT}s 120 BPM, norm ${norm.toFixed(3)}`);
