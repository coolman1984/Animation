// Film 23 score — «أكاديمية أساسيات الذكاء الاصطناعي» 30 s — original, 120 BPM (beat 0.5 s, bar 2 s), written on the picture's own clock
// (timing.js). Owner taste (QUALITY_PLAYBOOK §0): Western, a real beat and ONE hook that returns in every chapter, locked to the cuts;
// a symbolic sound for the problem (a low wavering warning bell); drops on the page waking (4 s) and on the logo (24 s).
// Hook motif E G A G (eighths) changes instrument per chapter: pluck → bells → keys → pluck → dark mallets → bells → full saw lead.
//   bars 1–2  (0–4)   Am F   the problem: warning bell, two thuds, a ticking that speeds up, riser, breath
//   bars 3–8  (4–16)  groove: units pop as hook notes, counters tick, level steps, equation bells, the lab's confirm
//   bars 9–11 (16–22) dark mode: half-time, filtered pads, mallets; typing ticks, bracket pops, copy, the right answer
//   bar 12    (22–24) light returns: 41 page ticks climb a pentatonic run, snare roll and riser into the drop
//   bars 13–15 (24–30) DROP: the hook in full on a saw lead, the CTA's confirm, the final C rings out
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, pad, rhodes, pluck, bell, noiseHit, reverb, writeWav, peak, biquad, pan } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { T, BEAT, DUR, tb } from './timing.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film23');
mkdirSync(OUT, { recursive: true });
const E8 = BEAT / 2, N = DUR + 1;
const mk = () => new Bus(N);
const drums = mk(), low = mk(), pads = mk(), keys = mk(), arp = mk(), lead = mk(), fx = mk();
const kicks = [];

// ---------- voices ----------
function kick(t, vel = 1) { // punchy electro kick: pitch drop 170→48 Hz + click
  kicks.push(t); const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.4; k++) { const tt = k / SR, f = 48 + 122 * Math.exp(-tt / 0.03); ph += 2 * Math.PI * f / SR;
    const s = Math.tanh(1.9 * Math.sin(ph) * Math.exp(-tt / 0.24)) * 0.8 + (k < 90 ? Math.sin(k * 1.1) * 0.25 * (1 - k / 90) : 0);
    drums.add(i0 + k, s * vel * 0.42); }
}
const clap = (t, v = 0.36) => { for (let i = 0; i < 4; i++) noiseHit(drums, t + i * 0.009, { dur: i === 3 ? 0.12 : 0.01, vel: v * (i === 3 ? 1 : 0.5), bp: 1600, q: 0.8, seed: 31 + i + Math.round(t * 100) }); };
const snare = (t, v = 0.3) => { noiseHit(drums, t, { dur: 0.09, vel: v, bp: 2200, q: 0.6, seed: 700 + Math.round(t * 1000) }); tone(drums, t, 260, 180, { dur: 0.06, vel: v * 0.8 }); };
const hat = (t, v = 0.06, open = false, p = 0.25) => noiseHit(drums, t, { dur: open ? 0.1 : 0.022, vel: v * 1.5, hp: 8500, p, seed: Math.round(t * 1000) });
function sub(t, midi, dur, vel = 0.7) {
  const i0 = Math.round(t * SR), f = mtof(midi); let ph = 0;
  for (let k = 0; k < (dur + 0.05) * SR; k++) { const tt = k / SR; ph += 2 * Math.PI * f / SR; const env = Math.min(1, tt / 0.006) * (tt > dur ? Math.exp(-(tt - dur) / 0.03) : 1);
    low.add(i0 + k, Math.tanh(1.6 * (Math.sin(ph) + 0.3 * Math.sin(2 * ph))) * env * vel * 0.42); }
}
function tone(bus, t, f0, f1, { dur = 0.25, vel = 0.3, p = 0, glide = 0.04, harm = 0.25 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * 3 * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const tt = k / SR, f = f1 + (f0 - f1) * Math.exp(-tt / glide); ph += (2 * Math.PI * f) / SR; const s = (Math.sin(ph) + harm * Math.sin(2 * ph)) * Math.min(1, tt / 0.002) * Math.exp(-tt / dur) * vel * 0.35; bus.add(i0 + k, s * gl, s * gr); }
}
function beep(bus, t, midi, { dur = 0.12, vel = 0.2, p = 0 } = {}) { // the scanner: a soft square, pitched to the hook
  const i0 = Math.round(t * SR), f = mtof(midi), len = Math.round((dur + 0.05) * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const tt = k / SR; ph = (ph + f / SR) % 1; const sq = (ph < 0.5 ? 1 : -1) * 0.5 + Math.sin(2 * Math.PI * ph) * 0.5; const env = Math.min(1, tt / 0.003) * (tt > dur ? Math.exp(-(tt - dur) / 0.015) : 1); const s = sq * env * vel * 0.3; bus.add(i0 + k, s * gl, s * gr); }
}
function glide(bus, t, dur, f0, f1, vel = 0.12, p = 0) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const u = k / len, f = f0 * Math.pow(f1 / f0, u * u * (3 - 2 * u)); ph += (2 * Math.PI * f) / SR; const tri = (2 / Math.PI) * Math.asin(Math.sin(ph)); const s = (tri * 0.8 + Math.sin(ph * 2) * 0.12) * Math.sin(Math.PI * u) ** 0.8 * vel; bus.add(i0 + k, s * gl, s * gr); }
}
function wobble(bus, t, midi, dur, vel = 0.2) { // the low wavering warning bell (owner taste: a symbolic sound for "a problem")
  const i0 = Math.round(t * SR), f = mtof(midi), len = Math.round(dur * SR); let p1 = 0, p2 = 0;
  for (let k = 0; k < len; k++) { const tt = k / SR, w = 1 + 0.012 * Math.sin(2 * Math.PI * 5.5 * tt); p1 += 2 * Math.PI * f * w / SR; p2 += 2 * Math.PI * f * 2.76 * w / SR;
    const s = (Math.sin(p1) + 0.35 * Math.sin(p2) * Math.exp(-tt / 0.4)) * Math.min(1, tt / 0.01) * Math.exp(-tt / (dur * 0.55)) * vel * 0.4; bus.add(i0 + k, s, s); }
}
// detuned saw chord/lead with a filter envelope
function saw(bus, t, midis, dur, vel, { cut0 = 3200, cut1 = 700, decay = 0.4, p = 0, detune = 0.14, voices = 4, width = 0.5, q = 1.6 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round((dur + 0.3) * SR);
  const osc = []; for (const m of midis) for (let v = 0; v < voices; v++) osc.push({ f: mtof(m) * Math.pow(2, ((v - (voices - 1) / 2) * detune) / 12), ph: ((m * 0.137 + v * 0.371) % 1), p: voices > 1 ? (v / (voices - 1) - 0.5) * 2 * width : 0 });
  const st = [{ x1: 0, x2: 0, y1: 0, y2: 0 }, { x1: 0, x2: 0, y1: 0, y2: 0 }]; let co;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    if (k % 32 === 0) { const fc = cut1 + (cut0 - cut1) * Math.exp(-tt / decay), w = 2 * Math.PI * Math.min(fc, SR * 0.45) / SR, c = Math.cos(w), sn = Math.sin(w), a = sn / (2 * q); co = [(1 - c) / 2 / (1 + a), (1 - c) / (1 + a), (1 - c) / 2 / (1 + a), -2 * c / (1 + a), (1 - a) / (1 + a)]; }
    let l = 0, r = 0; for (const o of osc) { o.ph = (o.ph + o.f / SR) % 1; const x = 2 * o.ph - 1, [gl, gr] = pan(Math.max(-1, Math.min(1, o.p + p))); l += x * gl; r += x * gr; }
    const env = Math.min(1, tt / 0.008) * (tt > dur ? Math.exp(-(tt - dur) / 0.12) : 1), g = env * vel * 0.3 / Math.sqrt(osc.length);
    const out = [l, r].map((x, ch) => { const S = st[ch], y = co[0] * x + co[1] * S.x1 + co[2] * S.x2 - co[3] * S.y1 - co[4] * S.y2; S.x2 = S.x1; S.x1 = x; S.y2 = S.y1; S.y1 = y; return y; });
    bus.add(i0 + k, out[0] * g, out[1] * g);
  }
}



// ---------- harmony: Am F C G, one chord per bar ----------
const CH = [
  { r: 45, v: [57, 60, 64], hook: [76, 79, 81, 79] },   // Am
  { r: 41, v: [53, 57, 60], hook: [77, 81, 84, 81] },   // F
  { r: 36, v: [55, 60, 64], hook: [76, 79, 84, 79] },   // C
  { r: 43, v: [55, 59, 62], hook: [74, 79, 83, 79] },   // G
];
const chordAt = (bar) => CH[bar % 4];
const bt = (b) => tb(b);
const cut = (bus, t0, t1, t2) => { for (let i = Math.round(t0 * SR); i < Math.min(bus.n, Math.round(t2 * SR)); i++) { const t = i / SR, g = t < t1 ? 1 - (t - t0) / (t1 - t0) : Math.min(1, (t - t1) / (t2 - t1)); bus.L[i] *= g; bus.R[i] *= g; } };
function hookOn(kind, t0, notes, vel = 0.15) {
  notes.forEach((m, i) => {
    const t = t0 + i * E8;
    if (kind === 'pluck') pluck(arp, t, m, vel, { p: -0.2 + i * 0.13, damp: 0.3, decay: 0.994, bright: 0.85, seed: 500 + Math.round(t * 100) });
    else if (kind === 'bell') bell(arp, t, m, vel * 0.8, { decay: 1.2, p: -0.3 + i * 0.2 });
    else if (kind === 'keys') rhodes(keys, t, m, E8 * 0.9, vel * 1.1, { p: -0.1 + i * 0.07 });
    else if (kind === 'mallet') { bell(arp, t, m - 12, vel * 0.7, { decay: 0.7, p: -0.2 + i * 0.13 }); pluck(arp, t, m - 12, vel * 0.5, { damp: 0.5, decay: 0.99, bright: 0.5, seed: 600 + i }); }
    else if (kind === 'saw') saw(lead, t, [m], E8 * 0.9, vel * 1.8, { cut0: 5200, cut1: 1200, decay: 0.25, voices: 3, detune: 0.1, width: 0.3 });
  });
}
function groove(b0, b1, { half = false, hatV = 0.06 } = {}) {
  for (let b = b0; b < b1; b++) {
    const t = bt(b), bar = Math.floor(b / 4), ch = chordAt(bar);
    if (!half || b % 2 === 0) kick(t, b % 4 === 0 ? 1 : 0.85);
    if (b % 2 === 1) (half ? snare : clap)(t, half ? 0.18 : 0.3);
    hat(t + E8, half ? hatV * 0.8 : hatV + 0.01, !half && b % 2 === 1); if (!half) hat(t, hatV * 0.8);
    sub(t, ch.r - 12 + (ch.r < 40 ? 12 : 0), E8 * 1.6, half ? 0.55 : 0.65);
  }
  for (let bar = Math.floor(b0 / 4); bar < Math.ceil(b1 / 4); bar++) saw(pads, bt(bar * 4), chordAt(bar).v, 1.9, half ? 0.16 : 0.18, { cut0: half ? 1100 : 2400, cut1: half ? 450 : 750, decay: 0.6, voices: 4, width: 0.6 });
}

// ---------- bars 1–2 (0–4): the problem ----------
wobble(fx, 0.04, 45, 1.95, 0.22); wobble(fx, 2.0, 41, 1.9, 0.18);
softHit(fx, T.page + 0.03, { vel: 0.3, tone: 140 });
for (const t of [T.l1, T.l2]) { kick(t, 0.8); sub(t, 33, 0.4, 0.7); softHit(fx, t + 0.01, { vel: 0.4, tone: 110 }); tone(fx, t + 0.02, 420, 160, { dur: 0.18, vel: 0.2 }); }
saw(pads, 0, CH[0].v, 1.95, 0.1, { cut0: 900, cut1: 400, decay: 1.2, voices: 4, width: 0.6 }); saw(pads, 2, CH[1].v, 1.95, 0.12, { cut0: 1000, cut1: 450, decay: 1.2, voices: 4, width: 0.6 });
for (let k = 0; k < 20; k++) { const t = 2.3 + k * (1.6 / 20) * (1 - k * 0.012); click(fx, t, { vel: 0.012 + 0.03 * (k / 20), bright: 0.95, p: k % 2 ? 0.3 : -0.3, seed: 200 + k }); }
whooshBy(fx, T.cur0 - 0.1, { dur: 0.5, vel: 0.08, direction: 'center', low: 400, high: 4000, seed: 41 });
riser(fx, 3.0, { dur: 0.96, vel: 0.24, f0: 250, f1: 8000, tonal: 0.3, seed: 42 });
hookOn('pluck', bt(6), CH[1].hook, 0.1);
// ---------- bar 3 (4.0): the page wakes — DROP 1 ----------
kick(T.wake, 1.1); sub(T.wake, 33, 1.9, 0.85); impact(fx, T.wake, { vel: 0.6, weight: 0.6 }); clap(T.wake, 0.36);
click(fx, T.wake - 0.01, { vel: 0.3, bright: 0.85 });
[88, 91, 96].forEach((m, i) => bell(fx, T.wake + 0.03 + i * 0.04, m, 0.08, { decay: 1.6, p: -0.3 + i * 0.3 }));
for (let i = 0; i < 6; i++) whooshBy(fx, T.wake + 0.02 + i * 0.05, { dur: 0.3, vel: 0.035, direction: 'center', low: 600, high: 5000, seed: 60 + i });
groove(8, 32);
// units pop as the hook's notes (picture: T.units), counters tick and land
[76, 79, 81, 79, 84, 88].forEach((m, i) => pluck(fx, T.units[i] + 0.02, m, 0.11, { p: -0.4 + i * 0.16, damp: 0.25, decay: 0.993, bright: 0.9, seed: 80 + i }));
T.stats.forEach((a, i) => { softHit(fx, a + 0.01, { vel: 0.18, tone: 180 }); for (let k = 0; k < 9; k++) click(fx, a + 0.05 + k * 0.095, { vel: 0.03, bright: 0.95, p: i % 2 ? 0.25 : -0.25, seed: 900 + i * 20 + k }); bell(fx, a + 0.9, [84, 86, 88, 91][i], 0.06, { decay: 1.0 }); });
hookOn('pluck', bt(14), CH[3].hook, 0.13);
// ---------- bar 5 (8–10): four levels ----------
whooshBy(fx, T.lv - 0.05, { dur: 0.25, vel: 0.05, direction: 'center', low: 700, high: 4000, seed: 70 });
T.lvSteps.slice(0, 3).forEach((t, i) => { click(fx, t, { vel: 0.16, bright: 0.85 }); bell(fx, t + 0.01, [79, 81, 84][i], 0.07, { decay: 0.9, p: -0.2 + i * 0.2 }); });
hookOn('bell', bt(18), CH[0].hook, 0.12);
// ---------- bars 6–7 (10–14): the equation ----------
whooshBy(fx, T.sc - 0.06, { dur: 0.32, vel: 0.07, direction: 'center', low: 400, high: 4500, seed: 71 });
T.parts.forEach((t, i) => { softHit(fx, t + 0.02, { vel: 0.22, tone: 160 }); bell(fx, t + 0.02, [76, 79, 81, 84][i], 0.11, { decay: 1.3, p: 0.3 - i * 0.2 }); });
glide(fx, T.parts[0], T.result - T.parts[0], 300, 900, 0.025);
impact(fx, T.result, { vel: 0.35, weight: 0.4 }); uiConfirm(fx, T.result + 0.05, { vel: 0.2, notes: [84, 88, 91], gap: 0.06 });
hookOn('keys', bt(26), CH[2].hook, 0.14);
// ---------- bar 8 (14–16): the lab ----------
whooshBy(fx, T.lab - 0.06, { dur: 0.3, vel: 0.06, direction: 'center', low: 500, high: 4000, seed: 72 });
click(fx, T.labClick, { vel: 0.3, bright: 0.85 }); uiConfirm(fx, T.labClick + 0.04, { vel: 0.16, notes: [88, 95] });
[0.12, 0.24].forEach((d, i) => { tone(fx, T.labClick + d, 700 + i * 200, 1200 + i * 300, { dur: 0.08, vel: 0.12, glide: 0.02 }); });
glide(fx, T.labClick + 0.1, 0.45, 600, 1600, 0.04, -0.2);
hookOn('pluck', bt(30), CH[3].hook, 0.13);
riser(fx, 15.2, { dur: 0.8, vel: 0.16, f0: 300, f1: 5000, tonal: 0.2, seed: 43 });
// ---------- bars 9–11 (16–22): dark mode ----------
click(fx, T.dark, { vel: 0.3, bright: 0.7 }); kick(T.dark, 1.0); sub(T.dark, 29, 1.2, 0.8); sweep(fx, T.dark, { dur: 0.6, vel: 0.1, up: false, seed: 44 }); impact(fx, T.dark + 0.02, { vel: 0.35, weight: 0.8 });
groove(33, 44, { half: true, hatV: 0.05 });
for (let i = 0; i < 3; i++) click(fx, T.type0 + i * 0.16, { vel: 0.08, bright: 0.85, seed: 300 + i });
for (let i = 0; i < 4; i++) pluck(fx, T.type0 + 0.37 + i * 0.07, [72, 76, 79, 84][i], 0.06, { damp: 0.4, decay: 0.99, bright: 0.6, seed: 310 + i });
click(fx, T.pick, { vel: 0.26, bright: 0.8 }); whooshBy(fx, T.pick, { dur: 0.35, vel: 0.06, direction: 'center', low: 300, high: 3500, seed: 73 });
T.fill.forEach((t, i) => { tone(fx, t, 900 + i * 150, 1500 + i * 200, { dur: 0.07, vel: 0.13, glide: 0.015 }); bell(fx, t + 0.02, [84, 88, 91][i], 0.06, { decay: 0.8 }); });
click(fx, T.copy, { vel: 0.3, bright: 0.85 }); uiConfirm(fx, T.copy + 0.08, { vel: 0.2, notes: [91, 96] });
hookOn('mallet', bt(34), CH[0].hook, 0.13); hookOn('mallet', bt(38), CH[0].hook, 0.13);
whooshBy(fx, T.qz - 0.06, { dur: 0.3, vel: 0.06, direction: 'center', low: 400, high: 3500, seed: 74 });
click(fx, T.qzPick, { vel: 0.3, bright: 0.85 }); bell(fx, T.qzPick + 0.06, 84, 0.12, { decay: 1.2 }); bell(fx, T.qzPick + 0.14, 91, 0.1, { decay: 1.4 });
hookOn('bell', bt(42), CH[2].hook, 0.11);
// ---------- bar 12 (22–24): light returns, 41 pages, build ----------
click(fx, T.light, { vel: 0.3, bright: 0.85 }); sweep(fx, T.light, { dur: 0.55, vel: 0.12, up: true, seed: 45 }); kick(T.light, 0.95); sub(T.light, 31, 0.5, 0.6);
groove(44, 47);
const PENTA = [64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91];
for (let n = 1; n <= 41; n++) { const t = T.cascade[0] + (n - 1) / 40 * (T.cascade[1] - T.cascade[0]); bell(fx, t, PENTA[Math.min(PENTA.length - 1, Math.floor((n - 1) / 3.5))], 0.028, { decay: 0.35, p: Math.sin(n) * 0.5 }); }
riser(fx, T.cascade[0], { dur: T.drop - T.cascade[0] - 0.02, vel: 0.32, f0: 300, f1: 9500, tonal: 0.4, seed: 46 });
for (let k = 0; k < 8; k++) snare(bt(46.5) + k * (BEAT / 4), 0.08 + k * 0.03);
whooshBy(fx, T.implode, { dur: T.drop - T.implode + 0.05, vel: 0.12, direction: 'center', low: 200, high: 6000, seed: 47 });
// ---------- bars 13–15 (24–30): DROP 2 — payoff ----------
kick(T.drop, 1.2); sub(T.drop, 24, 1.9, 0.95); impact(fx, T.drop, { vel: 0.75, weight: 0.85 }); clap(T.drop, 0.4);
saw(pads, T.drop, [48, 55, 60, 64, 67], 1.95, 0.26, { cut0: 3000, cut1: 800, decay: 0.7, voices: 5, width: 0.7 });
hookOn('saw', T.drop, [79, 84, 88, 84], 0.16); hookOn('saw', T.drop + 1.0, [81, 84, 88, 91], 0.14);
[84, 88, 91, 96].forEach((m, i) => bell(fx, T.drop + 0.02 + i * 0.05, m, 0.08, { decay: 1.8, p: -0.4 + i * 0.27 }));
for (let b = 49; b < 56; b++) { kick(bt(b), 0.85); if (b % 2) clap(bt(b), 0.28); hat(bt(b) + E8, 0.06, true); hat(bt(b), 0.045); sub(bt(b), b < 52 ? 29 : 31, E8 * 1.6, 0.6); }
saw(pads, 26, [53, 57, 60, 64], 1.95, 0.2, { cut0: 2400, cut1: 750, decay: 0.7, voices: 4, width: 0.6 });
bell(fx, T.name + 0.02, 96, 0.07, { decay: 1.0 });
for (let i = 0; i < 3; i++) pluck(fx, T.tag + i * 0.09, [84, 88, 91][i], 0.08, { p: -0.3 + i * 0.3, damp: 0.3, decay: 0.995, bright: 0.9, seed: 120 + i });
softHit(fx, T.cta, { vel: 0.2, tone: 200 }); hookOn('pluck', T.cta + 0.5, [76, 79, 84, 79], 0.12);
click(fx, T.ctaClick, { vel: 0.32, bright: 0.8 }); uiConfirm(fx, T.ctaClick + 0.06, { vel: 0.22, notes: [91, 96] });
saw(pads, 28, [48, 55, 60, 64, 67], 1.9, 0.18, { cut0: 1800, cut1: 700, decay: 0.8, voices: 5, width: 0.7 });
kick(28, 0.8); sub(28, 24, 1.6, 0.7);
[72, 76, 79, 84].forEach((m, i) => bell(fx, 28.02 + i * 0.09, m + 12, 0.045, { decay: 2.2, p: -0.3 + i * 0.2 }));

// ---------- processing ----------
const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (SR * rel); const g = 1 - depth * Math.exp(-u * 3); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(pads, 0.6); pump(low, 0.45, 0.1); pump(arp, 0.25, 0.1); pump(lead, 0.15, 0.08); pump(keys, 0.2, 0.1);
for (const b of [drums, pads, arp, low]) cut(b, 3.93, 3.96, 3.999);   // the breath before the page wakes
for (const b of [drums, pads, arp, keys]) cut(b, 23.9, 23.95, 23.999); // the breath before the drop
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(pads, 150); hp(arp, 220); hp(lead, 200); hp(keys, 160); hp(fx, 35);
const music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.32); pads.mixInto(music, 1.3); keys.mixInto(music, 1.2); arp.mixInto(music, 1.6); lead.mixInto(music, 2.3);
const send = mk(); pads.mixInto(send, 0.35); arp.mixInto(send, 0.45); lead.mixInto(send, 0.5); keys.mixInto(send, 0.3);
reverb(send, { room: 0.78, damp: 0.4 }).mixInto(music, 0.5);
hp(music, 28);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.7, damp: 0.3 }).mixInto(sfx, 0.4);
for (const b of [music, sfx]) for (let i = 0; i < b.n; i++) { const t = i / SR, g = t > DUR - 0.8 ? Math.max(0, Math.cos(((t - (DUR - 0.8)) / 0.8) * Math.PI / 2)) : 1; b.L[i] *= g; b.R[i] *= g; }
const out = (b) => { const o = new Bus(DUR); for (let i = 0; i < o.n; i++) { o.L[i] = b.L[i]; o.R[i] = b.R[i]; } return o; };
const M = out(music), F = out(sfx), mix = new Bus(DUR); M.mixInto(mix, 1); F.mixInto(mix, 0.95);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), M, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), F, { gain: norm * 0.95 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film23 score: ${DUR}s 120 BPM, norm ${norm.toFixed(3)}`);
