// Film 22 score — «Claude Code» 10 s — original, 120 BPM (beat 0.5 s, bar 2 s), written on the picture's own clock (timing.js, motion.js).
// Owner taste (QUALITY_PLAYBOOK §0): Western, a real beat and ONE hook that returns, locked to the cuts; a symbolic sound for the problem
// (a low wavering warning bell), no literal foley beyond the typing ticks. Hook motif: E G A G over the chord, eighths.
//   bar 1 (0–2) Am  the warning bell, soft thuds on the two slams, a ticking clock, a riser, a breath at 1.94
//   bar 2 (2–4) F   the hop whoosh, typing ticks (one per character, the picture's own CHAR_T), a pluck hook answers
//   bar 3 (4–6) C   groove in: step bleeps play the hook's notes, the fix is a rising confirm
//   bar 4 (6–8) G   each test pops a bell (G B D), snare roll and riser into the wipe
//   bar 5 (8–10) C  DROP on the tile: the full hook on a saw lead, bells, the pill's confirm, final C rings out
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, pad, rhodes, pluck, bell, noiseHit, reverb, writeWav, peak, biquad, pan } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { T, BEAT, DUR, tb } from './timing.js';
import { CHAR_T } from './motion.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film22');
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


// ---------- harmony: Am | F | C | G | C ----------
const BARS = [
  { r: 45, v: [57, 60, 64], hook: [76, 79, 81, 79] },   // Am
  { r: 41, v: [53, 57, 60], hook: [77, 81, 84, 81] },   // F
  { r: 36, v: [55, 60, 64], hook: [76, 79, 84, 79] },   // C
  { r: 43, v: [55, 59, 62], hook: [74, 79, 83, 79] },   // G
  { r: 36, v: [55, 60, 64], hook: [79, 84, 88, 84] },   // C (payoff)
];
const bt = (b) => tb(b);

// ---------- bar 1 (0–2): the problem ----------
wobble(fx, 0.04, 45, 1.9, 0.22);                               // low wavering warning bell = "something is wrong"
for (const t of [T.h1, T.h2]) { kick(t, 0.8); sub(t, 33, 0.4, 0.7); softHit(fx, t + 0.01, { vel: 0.4, tone: 110 }); tone(fx, t + 0.02, 420, 160, { dur: 0.18, vel: 0.22 }); } // a falling note per slam
kick(bt(3), 0.7);
for (let k = 0; k < 24; k++) { const t = 0.5 + k * (1.5 / 24); click(fx, t, { vel: 0.012 + 0.03 * (k / 24), bright: 0.95, p: k % 2 ? 0.3 : -0.3, seed: 200 + k }); } // the ticking clock accelerates
riser(fx, 1.0, { dur: 0.94, vel: 0.22, f0: 250, f1: 8000, tonal: 0.3, seed: 41 });
// ---------- bar 2 (2–4): the cursor hops in, types ----------
const cut = (bus, t0, t1, t2) => { for (let i = Math.round(t0 * SR); i < Math.min(bus.n, Math.round(t2 * SR)); i++) { const t = i / SR, g = t < t1 ? 1 - (t - t0) / (t1 - t0) : Math.min(1, (t - t1) / (t2 - t1)); bus.L[i] *= g; bus.R[i] *= g; } };
kick(T.hop, 1.0); sub(T.hop, 41 - 12, 1.9, 0.8); impact(fx, T.hop, { vel: 0.5, weight: 0.5 });
whooshBy(fx, T.hop - 0.04, { dur: 0.42, vel: 0.2, direction: 'center', low: 250, high: 5000, seed: 42 });
saw(pads, T.hop, BARS[1].v, 1.9, 0.2, { cut0: 1800, cut1: 600, decay: 0.7, voices: 4, width: 0.6 });
CHAR_T.forEach((t, i) => click(fx, t - 0.004, { vel: 0.07 + 0.02 * (i % 3 === 0), bright: 0.85, p: -0.1 + (i % 5) * 0.05, seed: 300 + i }));  // typing, on the picture's own times
for (const b of [5, 6, 7]) { const t = bt(b); kick(t, 0.6); }
clap(bt(6), 0.25);
BARS[1].hook.forEach((m, i) => pluck(arp, bt(7.25) + i * E8 * 0.5, m - 12, 0.13 * (i === 0 ? 1.2 : 1), { p: 0.1, damp: 0.3, decay: 0.994, bright: 0.8, seed: 70 + i }));
// ---------- bar 3 (4–6): groove in ----------
kick(T.enter, 1.0); clap(T.enter, 0.34); uiConfirm(fx, T.enter + 0.02, { vel: 0.18, notes: [88, 95] });
for (let b = 8; b < 12; b++) { kick(bt(b), b === 8 ? 1 : 0.85); if (b % 2) clap(bt(b), 0.3); for (let h = 0; h < 2; h++) hat(bt(b) + h * E8 + E8 / 2 * 0, h ? 0.05 : 0.04, false); hat(bt(b) + E8, 0.07, b % 2 === 1); }
for (let b = 8; b < 12; b++) sub(bt(b), BARS[2].r, E8 * 1.6, 0.7);
saw(pads, 4.0, BARS[2].v, 1.9, 0.18, { cut0: 2200, cut1: 700, decay: 0.6, voices: 4, width: 0.6 });
[[T.steps[0], 76], [T.steps[1], 79], [T.steps[2], 84]].forEach(([t, m], i) => { beep(fx, t + 0.02, m, { vel: 0.3, p: -0.2 + i * 0.2 }); beep(fx, t + 0.025, m + 12, { vel: 0.06 }); }); // the three steps play the hook's notes
softHit(fx, T.diffIn + 0.06, { vel: 0.3, tone: 150 }); whooshBy(fx, T.diffIn - 0.03, { dur: 0.22, vel: 0.08, direction: 'center', low: 500, high: 3500, seed: 43 });
click(fx, T.strike, { vel: 0.3, bright: 0.9 }); glide(fx, T.strike, 0.18, 900, 420, 0.07);                  // the old line is struck
glide(fx, T.fix - 0.02, 0.3, 500, 1700, 0.08, 0.2); uiConfirm(fx, T.fix + 0.2, { vel: 0.18, notes: [84, 91, 96], gap: 0.06 });   // the fix is wiped in
BARS[2].hook.forEach((m, i) => pluck(arp, bt(11) + i * E8, m, 0.15, { p: 0.15, damp: 0.3, decay: 0.994, bright: 0.85, seed: 90 + i }));
// ---------- bar 4 (6–8): tests ----------
for (let b = 12; b < 16; b++) { kick(bt(b), 0.9); if (b % 2) clap(bt(b), 0.32); hat(bt(b) + E8, 0.07, true); hat(bt(b), 0.05); sub(bt(b), BARS[3].r, E8 * 1.6, 0.65); }
saw(pads, 6.0, BARS[3].v, 1.9, 0.18, { cut0: 2400, cut1: 800, decay: 0.6, voices: 4, width: 0.6 });
[[T.chips[0], 79], [T.chips[1], 83], [T.chips[2], 86]].forEach(([t, m], i) => { whooshBy(fx, t - 0.14, { dur: 0.16, vel: 0.07, direction: 'center', low: 700, high: 4000, seed: 50 + i }); bell(fx, t + 0.05, m, 0.17, { decay: 1.2, p: -0.3 + i * 0.3 }); click(fx, t + 0.05, { vel: 0.12, bright: 0.9 }); });
bell(fx, T.passed, 91, 0.1, { decay: 1.4 }); bell(fx, T.passed + 0.03, 98, 0.06, { decay: 1.4 });
riser(fx, T.wipe[0] - 0.2, { dur: 1.2, vel: 0.3, f0: 300, f1: 9500, tonal: 0.4, seed: 44 });
sweep(fx, T.wipe[0], { dur: 0.5, vel: 0.14, up: true, seed: 45 });
for (let k = 0; k < 8; k++) snare(bt(14.5) + k * (BEAT / 4) * (1 - k * 0.03), 0.1 + k * 0.03);                // snare roll into the drop
// the breath before the drop: everything but the tails is cut for 70 ms
// ---------- bar 5 (8–10): payoff ----------
kick(T.tile, 1.15); sub(T.tile, 24, 1.9, 0.95); impact(fx, T.tile, { vel: 0.7, weight: 0.8 }); clap(T.tile, 0.4);
for (let b = 17; b < 20; b++) { kick(bt(b), b === 19 ? 0.7 : 0.9); if (b % 2) clap(bt(b), 0.3); hat(bt(b) + E8, 0.07, true); hat(bt(b), 0.05); }
saw(pads, T.tile, [48, 55, 60, 64, 67], 1.9, 0.26, { cut0: 3000, cut1: 800, decay: 0.7, voices: 5, width: 0.7 });
BARS[4].hook.forEach((m, i) => saw(lead, T.tile + i * E8, [m], E8 * 0.9, 0.28, { cut0: 5200, cut1: 1200, decay: 0.25, voices: 3, detune: 0.1, width: 0.3 }));  // the hook, full
[84, 88, 91, 96].forEach((m, i) => bell(fx, T.tile + 0.02 + i * 0.05, m, 0.09, { decay: 1.8, p: -0.4 + i * 0.27 }));
bell(fx, T.name + 0.02, 96, 0.08, { decay: 1.0 });
for (let i = 0; i < 3; i++) pluck(fx, T.tag + i * 0.09, [84, 88, 91][i], 0.1, { p: -0.3 + i * 0.3, damp: 0.3, decay: 0.995, bright: 0.9, seed: 120 + i });
click(fx, T.cta + 0.02, { vel: 0.3, bright: 0.8 }); uiConfirm(fx, T.cta + 0.08, { vel: 0.2, notes: [91, 96] });
sweep(fx, T.cta + 0.4, { dur: 0.5, vel: 0.04, up: true, seed: 46 });
kick(bt(19), 0.7);
saw(pads, 9.0, [48, 55, 60, 64, 67], 0.9, 0.2, { cut0: 1800, cut1: 700, decay: 0.8, voices: 5, width: 0.7 });
[72, 76, 79, 84].forEach((m, i) => bell(fx, 9.02 + i * 0.09, m + 12, 0.045, { decay: 2.2, p: -0.3 + i * 0.2 }));

// ---------- processing ----------
const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (SR * rel); const g = 1 - depth * Math.exp(-u * 3); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(pads, 0.6); pump(low, 0.45, 0.1); pump(arp, 0.3, 0.1); pump(lead, 0.15, 0.08);
cut(drums, 1.93, 1.96, 1.999); cut(pads, 1.93, 1.96, 1.999); cut(arp, 1.93, 1.96, 1.999);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(pads, 150); hp(arp, 220); hp(lead, 200); hp(keys, 160); hp(fx, 35);
const music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.32); pads.mixInto(music, 1.3); keys.mixInto(music, 1.2); arp.mixInto(music, 1.7); lead.mixInto(music, 2.4);
const send = mk(); pads.mixInto(send, 0.35); arp.mixInto(send, 0.45); lead.mixInto(send, 0.5);
reverb(send, { room: 0.78, damp: 0.4 }).mixInto(music, 0.5);
hp(music, 28);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.7, damp: 0.3 }).mixInto(sfx, 0.4);
// the ending settles: a 0.6 s fade out (the picture holds its last frame)
for (const b of [music, sfx]) for (let i = 0; i < b.n; i++) { const t = i / SR, g = t > DUR - 0.6 ? Math.max(0, Math.cos(((t - (DUR - 0.6)) / 0.6) * Math.PI / 2)) : 1; b.L[i] *= g; b.R[i] *= g; }
const out = (b) => { const o = new Bus(DUR); for (let i = 0; i < o.n; i++) { o.L[i] = b.L[i]; o.R[i] = b.R[i]; } return o; };
const M = out(music), F = out(sfx), mix = new Bus(DUR); M.mixInto(mix, 1); F.mixInto(mix, 0.95);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), M, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), F, { gain: norm * 0.95 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film22 score: ${DUR}s 120 BPM, norm ${norm.toFixed(3)}`);
