// Film 11 score — AI × HR workshop showreel — original, 144 BPM (beat 0.41667 s = 25 frames at 60 fps, bar 1.667 s, 15 bars = 25 s). Western
// electro-pop with a real beat and one hook that returns: build (storm) → DROP on the flash (3.33) → big chorus on the title (6.67) →
// rhythmic chops while six areas flip (10) → a rising ring build (15) → breakdown + three wipes (18.33) → the final drop (21.67).
// Every picture event in timing.js has its own sound; sound design is mixed with the groove. Not listened to (measured only).
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
const DUR = 25, E8 = BEAT / 2, S16 = BEAT / 4, N = DUR + 2, b = (n) => n * BEAT;
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



// ---------- harmony: Am F C G ×3, then F G C ----------
const CH_ = { Am: { v: [57, 60, 64, 69], r: 33 }, F: { v: [53, 57, 60, 65], r: 29 }, C: { v: [55, 60, 64, 67], r: 36 }, G: { v: [55, 59, 62, 67], r: 31 } };
const BARS = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'C'];
const HOOK = { Am: [[0, 76, 2], [3, 81, 1], [4, 79, 1], [6, 76, 2]], F: [[0, 77, 2], [3, 81, 1], [4, 84, 2], [6, 81, 1]], C: [[0, 79, 2], [3, 76, 1], [4, 72, 2], [6, 76, 1]], G: [[0, 74, 2], [3, 79, 1], [4, 83, 2], [6, 79, 1]] };
const lvl = (t, lanes) => { for (const [a, c, v] of lanes) if (t >= a - 1e-6 && t < c) return v; return 0; };
// [from, to, level] in beats
const KICK = [[0, 8, 0.8], [8, 36, 1], [36, 44, 0.9], [45, 52, 0.9], [52, 58, 1.15]];
const CLAP = [[8, 24, 1], [24, 36, 1], [36, 44, 0.8], [52, 58, 1.1]];
const HATS = [[0, 8, 0.7], [8, 44, 1], [45, 48, 0.7], [48, 52, 0.8], [52, 58, 1.1]];
const PADS = [[0, 8, 0.6], [8, 16, 0.8], [16, 24, 1.15], [24, 36, 0.7], [36, 44, 0.9], [44, 48, 0.6], [48, 52, 0.8], [52, 58, 1.2]];
const HOOKL = [[8, 16, 0.8], [16, 24, 1.1], [36, 44, 0.8], [52, 58, 1.2]];
const ARPL = [[4, 8, 0.7], [8, 16, 0.7], [16, 24, 1], [24, 36, 1.1], [36, 44, 1.2], [45, 48, 0.8], [48, 52, 1], [52, 58, 1]];
const BASS = [[0, 8, 0.7], [8, 44, 1], [45, 58, 1.1]];

// ---------- groove ----------
for (let k = 0; k < 60; k++) {
  const t = b(k), bar = Math.floor(k / 4), beat = k % 4, name = BARS[Math.min(14, bar)], c = CH_[name];
  const kv = lvl(k, KICK), cv = lvl(k, CLAP), hv = lvl(k, HATS), pv = lvl(k, PADS), av = lvl(k, ARPL), bv = lvl(k, BASS), hk = lvl(k, HOOKL);
  const half = k >= 24 && k < 36;                                         // flip chapter: half-time chops (kick on 1 & 3 only, snare on 3)
  if (kv && (!half || beat % 2 === 0)) kick909(t, 0.85 * kv);
  if (cv && (half ? beat === 2 : (beat === 1 || beat === 3))) clap(t, 0.38 * cv);
  if (hv) { hat(t + E8, 0.07 * hv, beat === 3, 0.3); hat(t, 0.035 * hv, false, -0.25); if (k < 8) { hat(t + S16, 0.03 * hv + 0.004 * k, false, 0.4); hat(t + E8 + S16, 0.03 * hv + 0.004 * k, false, -0.4); } }
  if (bv && beat % 2 === 0) { sub(t + E8, c.r + 12, E8 * 0.85, 0.72 * bv); sub(t + E8 * 3, c.r + 12, E8 * 0.5, 0.5 * bv); sub(t, c.r, E8 * 0.9, 0.5 * bv); }
  if (pv && beat === 0) saw(pads, t, c.v, BAR * 0.98, 0.3 * pv, { cut0: 900 + 2600 * Math.min(1, k / 8) * (k < 8 ? 1 : 1) + (k >= 8 ? 1700 : 0), cut1: 700, decay: 0.7, voices: 5, width: 0.7 });
  if (pv && beat === 2 && pv > 0.9) saw(pads, t, c.v.map((m) => m + 12), BEAT * 1.9, 0.18 * pv, { cut0: 4800, cut1: 1200, decay: 0.25, voices: 4 });
  if (av) for (let e = 0; e < 2; e++) pluck(arp, t + e * E8, c.v[(k * 2 + e) % 4] + 24, 0.2 * av, { p: e ? 0.4 : -0.4, damp: 0.55, decay: 0.995, bright: 0.7, seed: 3 + k });
  if (beat === 0 && hk) for (const [e, m, len] of HOOK[name]) { rhodes(lead, t + e * E8, m, len * E8 * 0.9, 0.34 * hk, { p: 0.15, trem: 0.05 }); saw(lead, t + e * E8, [m, m + 12], len * E8 * 0.85, 0.2 * hk, { cut0: 7000, cut1: 1800, decay: 0.12, voices: 3, detune: 0.08, width: 0.3 }); }
}
// ---------- builds and drops ----------
for (let i = 0; i < 12; i++) { const t = b(6) + i * (b(2) / 12) * (1 - 0.02 * i); noiseHit(drums, t, { dur: 0.04, vel: 0.06 + i * 0.03, bp: 1900, q: 0.8, tone: 240, seed: 600 + i }); }   // snare roll into the flash
riser(fx, EV.flash, { dur: b(3), vel: 0.34, f0: 260, f1: 9500, tonal: 0.3, seed: 2 });
riser(fx, CH.title, { dur: b(3.5), vel: 0.38, f0: 200, f1: 10000, tonal: 0.35, seed: 4, tail: 0.002 });
for (let i = 0; i < 10; i++) noiseHit(drums, b(14) + i * b(2) / 10 * (1 - 0.01 * i), { dur: 0.04, vel: 0.07 + i * 0.03, bp: 2000, q: 0.8, tone: 260, seed: 700 + i });
const cutBuses = [drums, low, pads, arp, lead];                           // the breath before the title: everything stops for 0.12 s
// ---------- picture events ----------
EV.words1.forEach((t, i) => { impact(fx, t, { vel: 0.5 + 0.08 * i, weight: 0.6 }); whooshBy(fx, t - 0.06, { dur: 0.3, vel: 0.14, direction: i % 2 ? 'rl' : 'lr', low: 300, high: 4200, seed: 10 + i }); });
for (let i = 0; i < 16; i++) { const t = b(0.5) + i * 0.19; whooshBy(fx, t, { dur: 0.12, vel: 0.03 + 0.05 * (i / 16), direction: i % 2 ? 'lr' : 'rl', low: 900, high: 7000, seed: 40 + i }); }   // papers streaking past
impact(fx, EV.flash, { vel: 1.0, weight: 0.95 }); noiseHit(fx, EV.flash, { dur: 0.9, vel: 0.25, hp: 5000, seed: 21, attack: 0.01 });
sweep(fx, EV.ai + 0.1, { dur: 0.7, vel: 0.14, up: true, seed: 5 });
[[EV.mashi, 78], [EV.tail, 74]].forEach(([t, m], i) => { bell(fx, t, m + 12, 0.14, { decay: 0.7 }); click(fx, t, { vel: 0.25, bright: 0.7 }); });
for (let i = 0; i < 9; i++) noiseHit(fx, EV.tool + i * 0.04, { dur: 0.02, vel: 0.12, hp: 3000 + 500 * i, seed: 900 + i });                 // "Tool" glitches in
whooshBy(fx, EV.slash, { dur: 0.22, vel: 0.5, direction: 'lr', low: 600, high: 9000, seed: 30 }); impact(fx, EV.slash + 0.08, { vel: 0.85, weight: 0.7 });
[[EV.slash + 0.5, 70], [EV.slash + 0.62, 62]].forEach(([t, f]) => softHit(fx, t, { vel: 0.35, tone: f }));                                       // the two halves land
riser(fx, b(15.9), { dur: 1.0, vel: 0.3, f0: 200, f1: 6000, tonal: 0.45, seed: 8 });
whooshBy(fx, EV.implode + 0.2, { dur: 0.7, vel: 0.35, direction: 'center', low: 200, high: 1500, seed: 31 });
impact(fx, EV.title, { vel: 1.0, weight: 1.0 }); sub(EV.title, 33, BEAT * 3.4, 0.95);
[0, 1, 2, 3, 4].forEach((i) => bell(fx, EV.title + 0.03 + i * 0.05, [76, 81, 84, 88, 93][i], 0.14, { decay: 1.4, p: -0.5 + i * 0.25 }));
whooshBy(fx, EV.xspin, { dur: 0.5, vel: 0.3, direction: 'rl', low: 300, high: 6000, seed: 33 }); glide(fx, EV.xspin, 0.55, 300, 1500, 0.1, 0.2);
for (let i = 0; i < 8; i++) click(fx, EV.sub + 0.06 * i * 3, { vel: 0.13, bright: 0.9, p: i % 2 ? 0.4 : -0.4, seed: 100 + i });                    // the subtitle words tick in
[EV.hosts, EV.hosts + 0.12].forEach((t, i) => whooshBy(fx, t, { dur: 0.45, vel: 0.2, direction: i ? 'rl' : 'lr', low: 400, high: 4500, seed: 50 + i }));
tone(fx, EV.pill, 700, 1500, { dur: 0.1, vel: 0.28 }); uiConfirm(fx, EV.pill + 0.05, { vel: 0.2, notes: [84, 91] });
for (let i = 0; i < EV.flipN; i++) {                                                                                                          // six flips: a ratchet that rises each card
  const t = CH.flip + i * EV.flipStep, f = 620 * Math.pow(1.12, i);
  whooshBy(fx, t + 0.1, { dur: 0.3, vel: 0.2, direction: 'center', low: 400, high: 5000, seed: 60 + i }); impact(fx, t + 0.2, { vel: 0.4, weight: 0.3 });
  for (let r = 0; r < 4; r++) click(fx, t + 0.05 + r * 0.045, { vel: 0.14, bright: 0.5 + 0.1 * r, seed: 200 + i * 5 + r });
  tone(fx, t + 0.28, f * 1.5, f * 1.5, { dur: 0.12, vel: 0.22 }); bell(fx, t + 0.4, 79 + i * 2, 0.15, { decay: 0.8, p: 0.3 });                   // old → new, the AI badge pings
}
glide(fx, CH.ring, 2.0, 200, 1200, 0.12, 0); sweep(fx, CH.ring + 0.6, { dur: 1.6, vel: 0.15, up: true, seed: 15 });
for (let i = 0; i < 6; i++) { bell(fx, CH.ring + 0.1 + i * 0.1, 84 + i * 2, 0.12, { decay: 0.9, p: -0.6 + i * 0.24 }); click(fx, CH.ring + 0.1 + i * 0.1, { vel: 0.2, bright: 0.8 }); }
for (let i = 0; i < 12; i++) whooshBy(fx, CH.ring + 0.8 + i * 0.18, { dur: 0.22, vel: 0.07, direction: i % 2 ? 'lr' : 'rl', low: 500, high: 5000, seed: 70 + i });   // the ring whirling
riser(fx, CH.mega, { dur: b(3), vel: 0.34, f0: 240, f1: 11000, tonal: 0.35, seed: 16, tail: 0.002 });
impact(fx, CH.mega, { vel: 0.95, weight: 0.9 }); sub(CH.mega, 33, BEAT * 1.8, 0.9);
impact(fx, EV.than, { vel: 0.6, weight: 0.5 });
[EV.wipe1, EV.wipe2, EV.wipe3].forEach((t, i) => { whooshBy(fx, t, { dur: 0.3, vel: 0.35, direction: 'rl', low: 300, high: 8000, seed: 80 + i }); impact(fx, t + 0.08, { vel: 0.75 + 0.1 * i, weight: 0.6 }); bell(fx, t + 0.08, 81 + i * 4, 0.16, { decay: 1.0 }); });
riser(fx, CH.end, { dur: b(1.6), vel: 0.3, f0: 600, f1: 12000, tonal: 0.2, seed: 18, tail: 0.002 });
impact(fx, CH.end, { vel: 1.0, weight: 1.0 }); sub(CH.end, 33, BEAT * 4, 1.0); noiseHit(fx, CH.end, { dur: 1.6, vel: 0.3, hp: 4500, seed: 25, attack: 0.01 });
for (let i = 0; i < 28; i++) bell(fx, CH.end + 0.05 + i * 0.045, [88, 91, 93, 96, 100][i % 5], 0.05, { decay: 0.6, p: (i % 7) / 3.5 - 0.9 });  // sparks
impact(fx, EV.soon, { vel: 0.8, weight: 0.8 });
tone(fx, EV.cta, 800, 1400, { dur: 0.1, vel: 0.28 }); uiConfirm(fx, EV.cta + 0.05, { vel: 0.22, notes: [84, 91, 96], gap: 0.06 });
// the final chord rings under the hold
saw(pads, b(56), [45, 57, 60, 64, 67, 72], b(4), 0.36, { cut0: 3600, cut1: 1100, decay: 1.2, voices: 6, width: 0.8 });
[72, 76, 79, 84, 88, 91].forEach((m, i) => bell(fx, b(56) + 0.02 + i * 0.07, m, 0.12, { decay: 2.4, p: -0.5 + i * 0.2 }));
placeCues(fx, plan.cues);

// ---------- processing ----------

const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(pads, 0.6); pump(low, 0.45, 0.1); pump(arp, 0.3, 0.1); pump(lead, 0.2, 0.08);
{ const cutB = (bus, t0, t1) => { for (let i = Math.round(t0 * SR); i < Math.round(t1 * SR); i++) { bus.L[i] *= 0.0; bus.R[i] *= 0.0; } }; for (const bus of cutBuses) cutB(bus, CH.title - 0.12, CH.title); }
const cut = (bus, t0, t1, t2) => { for (let i = Math.round(t0 * SR); i < Math.min(bus.n, Math.round(t2 * SR)); i++) { const t = i / SR, g = t < t1 ? 1 - (t - t0) / (t1 - t0) : Math.min(1, (t - t1) / (t2 - t1)); bus.L[i] *= g; bus.R[i] *= g; } };
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(pads, 150); hp(arp, 200); hp(lead, 220); hp(keys, 160); hp(fx, 40);
let music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.75); pads.mixInto(music, 1.25); keys.mixInto(music, 1.3); arp.mixInto(music, 1.35); lead.mixInto(music, 1.2);
const send = mk(); pads.mixInto(send, 0.4); keys.mixInto(send, 0.55); arp.mixInto(send, 0.5); lead.mixInto(send, 0.6);
reverb(send, { room: 0.86, damp: 0.4 }).mixInto(music, 0.75);
hp(music, 28);
let sfx = mk(); fx.mixInto(sfx, 1);

const DUR_OUT = 25;
for (const b of [music, sfx]) { for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR_OUT ? 0 : t > DUR_OUT - 0.6 ? Math.cos(((t - (DUR_OUT - 0.6)) / 0.6) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; } b.n = DUR_OUT * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n); }
const mix = new Bus(DUR_OUT); music.mixInto(mix, 1); sfx.mixInto(mix, 0.9);
{ const p0 = peak(mix), k = 2.6; for (let i = 0; i < mix.n; i++) { mix.L[i] = Math.tanh(k * mix.L[i] / p0) / Math.tanh(k) * p0; mix.R[i] = Math.tanh(k * mix.R[i] / p0) / Math.tanh(k) * p0; } } // soft limiting: more loudness, same peak
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 0.9 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film11 score: ${DUR_OUT}s 144 BPM, norm ${norm.toFixed(3)}`);
