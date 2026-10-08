// Film 12 score — MIZAN «بيع بسهولة.. وحاسب بثقة» — original, 120 BPM (beat 0.5 s, bar 2 s), 25.0 s. Western electro-pop with a real
// beat and ONE hook that returns in every chapter (owner taste, QUALITY_PLAYBOOK §0), written on the picture's own clock (timing.js).
// Form: HOOK 0–4 F minor, thin and heavy — a low thud + falling note for each load on the beam, ticking 16ths, a low wavering
//   warning bell under the question, riser, a breath (3.92) → DROP 4.0 on A♭ major (the scale levels = the problem resolves).
//   4–6 the hook's first statement (pluck + bell) · 6–10 SELL: the scanner beeps PLAY the hook's notes, ka-ching on the change
//   · 10–14 STOCK: the hook on a low saw, box lands are woody hits · 14–16 INSTALMENTS: the hook on bells, a tick per paid cell
//   · 16–20 NUMBERS: build, the line draws a pitch glide, snare roll + riser · 20–24 PAYOFF: the full chorus, loudest, on the logo
//   · 24 final A♭ rings to 25. Progression per bar: A♭ E♭ Fm D♭ (I V vi IV). No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, pad, rhodes, pluck, bell, noiseHit, reverb, writeWav, peak, biquad, pan } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import { T, BEAT, BAR, DUR } from './timing.js';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film12');
mkdirSync(OUT, { recursive: true });
const E8 = BEAT / 2, S16 = BEAT / 4, N = DUR + 1;
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

// ---------- harmony ----------
const CH = {
  Ab: { v: [56, 60, 63, 68], r: 32 }, Eb: { v: [55, 58, 63, 67], r: 27 }, Fm: { v: [53, 56, 60, 65], r: 29 }, Db: { v: [53, 56, 61, 65], r: 25 },
  Fm9: { v: [53, 56, 60, 63, 67], r: 29 }, Dbmaj7: { v: [53, 56, 60, 61], r: 25 }, Eb7: { v: [55, 58, 61, 67], r: 27 },
};
// one chord per bar from the drop; the last bar splits D♭ | E♭ into the final A♭
const PROG = [];
['Ab', 'Eb', 'Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Ab'].forEach((c, i) => PROG.push([4 + i * BAR, c]));
PROG.push([22, 'Db'], [23, 'Eb'], [24, 'Ab']);
const chordAt = (t) => { let c = PROG[0]; for (const p of PROG) if (p[0] <= t + 1e-6) c = p; return c; };
// THE HOOK — one bar, [eighth, midi, length in eighths] per chord
const HOOK = {
  Ab: [[0, 75, 1.5], [1.5, 80, 1.5], [3, 84, 1], [4, 82, 1.5], [5.5, 80, 0.5], [6, 84, 2]],
  Eb: [[0, 75, 1.5], [1.5, 79, 1.5], [3, 82, 1], [4, 80, 1.5], [5.5, 79, 0.5], [6, 75, 2]],
  Fm: [[0, 72, 1.5], [1.5, 77, 1.5], [3, 80, 1], [4, 79, 1.5], [5.5, 77, 0.5], [6, 84, 2]],
  Db: [[0, 73, 1.5], [1.5, 77, 1.5], [3, 80, 1], [4, 84, 1.5], [5.5, 82, 0.5], [6, 80, 2]],
};
const lvl = (t, lanes) => { for (const [a, b, v] of lanes) if (t >= a && t < b) return v; return 0; };
// instrument of the hook per chapter (the same tune, a new voice each time)
const HOOKV = [[4, 6, 'pluck', 0.8], [6, 10, 'pluck', 0.55], [10, 14, 'saw', 0.5], [14, 16, 'bell', 0.75], [16, 20, 'pluck', 0.75], [20, 22, 'lead', 0.5], [22, 24, 'bell', 0.65]]; // owner 2026-10-08: the ending was too loud and harsh
const DRUMS = [[4, 6, 1], [6, 10, 0.95], [10, 14, 0.9], [14, 16, 0.85], [16, 18, 0.95], [18, 19.85, 1.05], [20, 22, 0.9], [22, 23, 0.8], [23, 24, 0.68]];

// ---------- 0–4 · hook: thin, minor, heavy ----------
pad(pads, 0, CH.Fm9.v, 2.0, 1.5, { cutoff: 700 }); pad(pads, 2, CH.Dbmaj7.v, 1.0, 1.5, { cutoff: 640 }); pad(pads, 3, CH.Eb7.v, 1.0, 1.6, { cutoff: 900 });
sub(0.02, 29 + 12, 1.95, 0.4); sub(2, 25 + 12, 0.95, 0.45); sub(3, 27 + 12, 0.9, 0.5);
for (let t = 0; t < 3.9; t += E8) pluck(arp, t, [65, 68, 72, 68][Math.round(t / E8) % 4] + 12, 0.13 + 0.07 * (t / 4), { p: (Math.round(t / E8) % 2 ? 0.4 : -0.4), damp: 0.6, decay: 0.993, bright: 0.5, seed: 3 });
// four loads: a heavy thud + a falling low note each, louder each time
T.chips.forEach((t, i) => { kick(t, 0.75 + i * 0.08); softHit(fx, t, { vel: 0.45 + i * 0.07, tone: 110 - i * 10, p: -0.3 }); sub(t, 41 - i * 2, 0.4, 0.55 + 0.05 * i); whooshBy(fx, t - 0.25, { dur: 0.28, vel: 0.06, direction: 'center', low: 300, high: 1600, seed: 40 + i }); });
for (let t = 2; t < 3.9; t += S16) hat(t, 0.02 + 0.03 * ((t - 2) / 2), false, (Math.round(t / S16) % 2 ? 0.3 : -0.3)); // the clock starts ticking
wobble(fx, T.headIn, 43, 1.8, 0.55); wobble(fx, T.headIn + 0.02, 55, 1.6, 0.18);           // the warning: "I have a problem"
for (const t of [2.5, 3.0, 3.5]) kick(t, 0.35);
riser(fx, 2.9, { dur: 1.05, vel: 0.28, f0: 200, f1: 6000, tonal: 0.3, seed: 5 });
whooshBy(fx, T.fling - 0.05, { dur: 0.3, vel: 0.12, direction: 'lr', low: 600, high: 6000, seed: 6 });       // the loads are flung off
whooshBy(fx, T.arrive - 0.06, { dur: 0.22, vel: 0.14, direction: 'rl', low: 800, high: 7000, seed: 7 });     // the copper bar streaks in

// ---------- 4–24 · the groove ----------
const END = 24;
for (let t = 4; t < END - 1e-6; t += BEAT) {
  const d = lvl(t, DRUMS); if (!d) continue;
  const beat = Math.round(((t - 4) % BAR) / BEAT);
  kick(t, 0.85 * d);
  if (beat === 1 || beat === 3) clap(t, 0.32 * d);
  hat(t + E8, 0.06 * d, beat === 3, 0.3);
  for (let s = 1; s < 4; s += 2) hat(t + s * S16, 0.025 * d, false, -0.3);
}
// build into the payoff: 16th snare roll rising
for (let t = 18.5; t < T.gather - 0.01; t += S16) snare(t, 0.06 + 0.22 * ((t - 18.5) / 1.35));
for (let k = 0; k < 10; k++) {
  const t0 = 4 + k * BAR; if (t0 >= END) break;
  const [, name] = chordAt(t0), c = CH[name];
  const split = t0 === 22;
  const chords = split ? [[22, CH.Db], [23, CH.Eb]] : [[t0, c]];
  for (const [ta, cc] of chords) {
    const len = split ? 1 : BAR;
    saw(pads, ta, cc.v, len * 0.98, 0.26 * (ta >= 22 ? 0.9 : 1), { cut0: ta >= 22 ? 2200 : ta >= 16 ? 4200 : 3000, cut1: ta >= 22 ? 600 : 900, decay: 0.5 });
    for (let e = 0; e < len / E8; e += 2) { sub(ta + e * E8, cc.r + 12, E8 * 1.7, 0.6); sub(ta + (e + 1.5) * E8, cc.r + 24, E8 * 0.4, 0.35); }
    for (let e = 0; e < len / E8; e++) pluck(arp, ta + e * E8, cc.v[[0, 2, 1, 3][e % 4]] + 12, 0.11 * (ta >= 22 ? 0.8 : ta >= 16 ? 1.2 : 1), { p: e % 2 ? 0.45 : -0.45, damp: 0.55, decay: 0.994, bright: 0.65, seed: 9 + k });
  }
  // the hook
  const hv = HOOKV.find(([a, b]) => t0 >= a && t0 < b); if (!hv) continue;
  const [, , voice, v] = hv;
  for (const [ta, cc, nm] of split ? [[22, CH.Db, 'Db'], [23, CH.Eb, 'Eb']] : [[t0, c, name]]) {
    for (const [e, m, l] of HOOK[nm]) {
      if (split && e >= 4) continue;
      const tt = ta + e * E8, dur = l * E8 * 0.92;
      if (voice === 'pluck') { pluck(lead, tt, m, 0.32 * v, { p: 0.1, damp: 0.4, decay: 0.997, bright: 0.85, seed: 77 }); bell(lead, tt, m + 12, 0.06 * v, { decay: 0.6, p: 0.2 }); }
      else if (voice === 'saw') saw(lead, tt, [m - 12], dur, 0.45 * v, { cut0: 2600, cut1: 500, decay: 0.15, voices: 3, detune: 0.1 });
      else if (voice === 'bell') { bell(lead, tt, m, 0.22 * v, { decay: 1.0, p: -0.1 }); bell(lead, tt, m + 12, 0.07 * v, { decay: 0.7, p: 0.2 }); }
      else { saw(lead, tt, [m], dur, 0.42 * v, { cut0: 3000, cut1: 1100, decay: 0.2, voices: 5, detune: 0.16, width: 0.6 }); pluck(lead, tt, m, 0.1 * v, { p: 0.15, damp: 0.5, decay: 0.995, bright: 0.6, seed: 78 }); }
    }
  }
}

// ---------- the story's events ----------
// 4.0 the drop: the copper bar levels the beam (impact from the cue sheet) + the cream world bursts out of the fulcrum
sub(4, 32 + 12, 1.0, 0.8);
[68, 72, 75, 80, 84].forEach((m, i) => bell(fx, 4.02 + i * 0.04, m + 12, 0.1, { decay: 1.3, p: -0.4 + i * 0.2 }));
sweep(fx, T.wipe[0], { dur: 0.35, vel: 0.12, up: true, seed: 21 });
whooshBy(fx, T.zoom, { dur: 0.5, vel: 0.1, direction: 'center', low: 300, high: 3000, seed: 22 });          // the world gathers into the tile
bell(fx, T.word, 92, 0.1, { decay: 1.0 });
// 6.0 the dive into the tile
whooshBy(fx, T.dive - 0.1, { dur: 0.45, vel: 0.14, direction: 'center', low: 200, high: 5000, seed: 23 });
glide(fx, T.dive + 0.02, 0.3, 700, 1800, 0.05);                                                              // the bar turns into a laser
// three scans: the beeps play the hook's own notes (A♭5 C6 E♭6)
[[T.scans[0], 80], [T.scans[1], 84], [T.scans[2], 87]].forEach(([t, m]) => { beep(fx, t, m, { vel: 0.3 }); beep(fx, t + 0.005, m + 12, { vel: 0.06 }); whooshBy(fx, t - 0.32, { dur: 0.32, vel: 0.07, direction: 'rl', low: 500, high: 4000, seed: Math.round(t * 10) }); tone(fx, t + 0.32, 900, 500, { dur: 0.05, vel: 0.12 }); });
click(fx, T.receipt, { vel: 0.12, bright: 0.5 });
sweep(fx, T.toTotal, { dur: 0.3, vel: 0.08, up: false, seed: 24 });
for (let i = 0; i < 6; i++) pluck(fx, T.chipsIn + i * 0.06, [80, 84, 87, 92, 96, 99][i], 0.12, { p: -0.5 + i * 0.2, damp: 0.3, decay: 0.995, bright: 0.9, seed: 50 + i }); // chips burst
click(fx, T.tapCash, { vel: 0.3, bright: 0.8 });
// ka-ching: the change is right
[[84, 0], [88, 0.05], [91, 0.1], [96, 0.15]].forEach(([m, d]) => bell(fx, T.change + d, m, 0.14, { decay: 1.2, p: -0.3 + d * 3 }));
noiseHit(fx, T.change, { dur: 0.25, vel: 0.08, hp: 7000, seed: 61, attack: 0.002 });
whooshBy(fx, T.toButton - 0.05, { dur: 0.25, vel: 0.06, direction: 'center', low: 800, high: 4000, seed: 25 });
click(fx, T.tapDone, { vel: 0.3, bright: 0.8 }); uiConfirm(fx, T.tapDone + 0.06, { vel: 0.22, notes: [80, 87] });
// 9.9 the blind is pulled up off the night shelves
whooshBy(fx, T.blind, { dur: 0.45, vel: 0.16, direction: 'lr', low: 300, high: 6000, seed: 26 });
softHit(fx, T.stock + 0.05, { vel: 0.4, tone: 120 });
T.boxes.forEach((t, i) => { softHit(fx, t, { vel: 0.32, tone: 150 + i * 12, p: 0.5 - i * 0.25 }); tone(fx, t, 340 - i * 20, 220 - i * 10, { dur: 0.08, vel: 0.22, p: 0.5 - i * 0.25 }); click(fx, t + 0.12, { vel: 0.08, bright: 0.9, p: 0.5 - i * 0.25 }); });
whooshBy(fx, T.transfer, { dur: 0.5, vel: 0.1, direction: 'rl', low: 400, high: 3000, seed: 27 }); softHit(fx, T.transfer + 0.5, { vel: 0.3, tone: 170 });
beep(fx, T.serial + 0.1, 92, { vel: 0.2, dur: 0.07 }); beep(fx, T.serial + 0.18, 96, { vel: 0.16, dur: 0.07 });
bell(fx, T.serial + 0.3, 87, 0.12, { decay: 1.0 }); bell(fx, T.serial + 0.33, 94, 0.08, { decay: 0.8 }); // warranty shield
[915, 775, 635, 445, 305, 165].forEach((x, i) => click(fx, T.count + x / 4000 + 0.06, { vel: 0.07, bright: 0.95, p: 0.5 - i * 0.2, seed: 80 + i })); // count ticks: one per badge, as each flashes
// 13.85 copper wipe
whooshBy(fx, T.copper[0], { dur: 0.4, vel: 0.13, direction: 'center', low: 200, high: 4500, seed: 28 });
T.cells.forEach((t, i) => uiConfirm(fx, t, { vel: 0.12, notes: [80 + [0, 4, 7, 12][i], 87 + [0, 4, 7, 12][i]], gap: 0.05 }));
for (let k = 0; k < 2; k++) tone(fx, T.due + k * 0.5, 600, 600, { dur: 0.06, vel: 0.06 });
// 15.85 the night rises like a level
sweep(fx, T.rise[0], { dur: 0.45, vel: 0.12, up: true, seed: 29 });
softHit(fx, T.bars + 0.1, { vel: 0.45, tone: 100 });
for (let i = 0; i < 12; i++) click(fx, T.kpi + 0.05 + i * 0.085, { vel: 0.035, bright: 0.95, p: i % 2 ? 0.3 : -0.3, seed: 90 + i }); // the counter rolling
glide(fx, T.line[0], T.line[1] - T.line[0], 420, 1400, 0.07, 0.3);                                            // the trend line drawing
bell(fx, T.line[1], 92, 0.1, { decay: 1.0 });
uiConfirm(fx, T.insight, { vel: 0.14, notes: [87, 92] });
riser(fx, 18.4, { dur: 1.45, vel: 0.3, f0: 250, f1: 9000, tonal: 0.35, seed: 30 });
whooshBy(fx, T.gather - 0.05, { dur: 0.3, vel: 0.12, direction: 'center', low: 300, high: 5000, seed: 31 }); // the night gathers into the tile
// 20.1 the logo
sub(T.logo, 32 + 12, 1.5, 0.85);
[68, 72, 75, 80, 84, 87].forEach((m, i) => bell(fx, T.logo + 0.02 + i * 0.05, m + 12, 0.11, { decay: 1.8, p: -0.5 + i * 0.2 }));
bell(fx, T.word2, 96, 0.08, { decay: 1.0 });
sweep(fx, T.tag, { dur: 0.6, vel: 0.06, up: true, seed: 32 });
tone(fx, T.cta, 700, 1000, { dur: 0.08, vel: 0.1 }); uiConfirm(fx, T.cta + 0.2, { vel: 0.08, notes: [75, 80] });
whooshBy(fx, T.shine, { dur: 0.7, vel: 0.04, direction: 'lr', low: 400, high: 3000, seed: 33 });
// the final A♭ rings under the hold
saw(pads, 24, [44, 56, 60, 63, 68], 1.0, 0.22, { cut0: 1600, cut1: 700, decay: 0.8, voices: 5, width: 0.7 });
kick(24, 0.45); sub(24, 32 + 12, 0.95, 0.55);
[63, 68, 72, 75].forEach((m, i) => bell(fx, 24.03 + i * 0.09, m, 0.045, { decay: 2.2, p: -0.3 + i * 0.2 }));
placeCues(fx, plan.cues);

// ---------- processing ----------
const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { if (kk < 4) continue; const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(pads, 0.6); pump(low, 0.45, 0.1); pump(arp, 0.3, 0.1); pump(lead, 0.15, 0.08);
// the breath before the drop: everything but tails is cut for 80 ms
const cut = (bus, t0, t1, t2) => { for (let i = Math.round(t0 * SR); i < Math.min(bus.n, Math.round(t2 * SR)); i++) { const t = i / SR, g = t < t1 ? 1 - (t - t0) / (t1 - t0) : Math.min(1, (t - t1) / (t2 - t1)); bus.L[i] *= g; bus.R[i] *= g; } };
for (const b of [drums, low, pads, arp]) cut(b, 3.9, 3.95, 3.999);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(pads, 150); hp(arp, 220); hp(lead, 200); hp(keys, 160); hp(fx, 35);
const music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.32); pads.mixInto(music, 1.3); keys.mixInto(music, 1.2); arp.mixInto(music, 1.7); lead.mixInto(music, 2.6);
const send = mk(); pads.mixInto(send, 0.35); arp.mixInto(send, 0.45); lead.mixInto(send, 0.5);
reverb(send, { room: 0.82, damp: 0.4 }).mixInto(music, 0.6);
hp(music, 28);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.72, damp: 0.3 }).mixInto(sfx, 0.45);
// end: a short fade in the last 0.35 s
// the ending settles: a gentle −3 dB tilt from 21.5 to 24, a soft top-end shelf over the payoff, then a 1 s fade
const lpEnd = (bus) => { for (const ch of ['L', 'R']) { const a = biquad('lp', 5000, 0.7), x = bus[ch]; for (let i = Math.round(20 * SR); i < bus.n; i++) { const t = i / SR, y = a(x[i]), w = Math.min(1, Math.max(0, (t - 20) / 0.5)); x[i] = x[i] * (1 - w) + y * w; } } };
lpEnd(music); lpEnd(sfx);
for (const b of [music, sfx]) for (let i = 0; i < b.n; i++) { const t = i / SR, tilt = 1 - 0.22 * Math.min(1, Math.max(0, (t - 21.5) / 3)), g = (t > DUR - 1 ? Math.max(0, Math.cos(((t - (DUR - 1)) / 1) * Math.PI / 2)) : 1) * tilt; b.L[i] *= g; b.R[i] *= g; }
const out = (b) => { const o = new Bus(DUR); for (let i = 0; i < o.n; i++) { o.L[i] = b.L[i]; o.R[i] = b.R[i]; } return o; };
const M = out(music), F = out(sfx), mix = new Bus(DUR); M.mixInto(mix, 1); F.mixInto(mix, 0.95);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), M, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), F, { gain: norm * 0.95 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film12 score: ${DUR}s 120 BPM, norm ${norm.toFixed(3)}`);
