// Film 12 score — Hessa «٤ أسئلة» — original, 120 BPM (beat 0.5 s, bar 2 s). A minor / C major, no samples, no licence needed.
// Every sound is placed from film12/timing.js — the SAME constants the picture uses.
// Shape: the four hop notes E G A C are a question (they rise and stay open); each answered chip plays a higher C-major tone; the logo hit plays the whole
// motif and RESOLVES it on C. Kick on every beat from the first frame (the owner's taste: a real beat), clap from chapter A, bells for coins/receipts,
// a low vault for the drawer, a one-frame breath before the hit (the music ducks 70 ms), then the full groove under the lock-up.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, rhodes, pluck, bell, noiseHit, reverb, writeWav, peak, biquad, pan, rng } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };
import { T, HOP_NOTES, BEAT, BAR, DUR, litList } from './timing.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film12');
mkdirSync(OUT, { recursive: true });
const E8 = BEAT / 2, S16 = BEAT / 4, N = DUR + 2, END = DUR;
const mk = () => new Bus(N);
const drums = mk(), low = mk(), pads = mk(), keys = mk(), arp = mk(), lead = mk(), fx = mk();
const kicks = [];

// ---------- voices ----------
function kick909(t, vel = 1) { // round kick: pitch drop 150→46 Hz
  kicks.push(t); const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.42; k++) { const tt = k / SR, f = 46 + 104 * Math.exp(-tt / 0.032); ph += 2 * Math.PI * f / SR;
    const s = Math.tanh(1.6 * Math.sin(ph) * Math.exp(-tt / 0.27)) * 0.78 + (k < 80 ? Math.sin(k * 0.9) * 0.2 * (1 - k / 80) : 0);
    drums.add(i0 + k, s * vel * 0.58); }
}
const clap = (t, v = 0.36) => { for (let i = 0; i < 4; i++) noiseHit(drums, t + i * 0.008, { dur: i === 3 ? 0.1 : 0.01, vel: v * (i === 3 ? 1 : 0.5), bp: 1500, q: 0.8, seed: 31 + i + Math.round(t * 100) }); };
const hat = (t, v = 0.06, open = false, p = 0.25) => noiseHit(drums, t, { dur: open ? 0.09 : 0.02, vel: v, hp: 8500, p, seed: Math.round(t * 1000) });
function sub(t, midi, dur, vel = 0.7) {
  const i0 = Math.round(t * SR), f = mtof(midi); let ph = 0;
  for (let k = 0; k < (dur + 0.05) * SR; k++) { const tt = k / SR; ph += 2 * Math.PI * f / SR; const env = Math.min(1, tt / 0.008) * (tt > dur ? Math.exp(-(tt - dur) / 0.03) : 1);
    low.add(i0 + k, Math.tanh(1.5 * (Math.sin(ph) + 0.28 * Math.sin(2 * ph))) * env * vel * 0.42); }
}
function tone(bus, t, f0, f1, { dur = 0.25, vel = 0.3, p = 0, glide = 0.04, harm = 0.25 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * 3 * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const tt = k / SR, f = f1 + (f0 - f1) * Math.exp(-tt / glide); ph += (2 * Math.PI * f) / SR; const s = (Math.sin(ph) + harm * Math.sin(2 * ph)) * Math.min(1, tt / 0.002) * Math.exp(-tt / dur) * vel * 0.35; bus.add(i0 + k, s * gl, s * gr); }
}
function glide(bus, t, dur, f0, f1, vel = 0.12, p = 0) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const u = k / len, f = f0 * Math.pow(f1 / f0, u * u * (3 - 2 * u)); ph += (2 * Math.PI * f) / SR; const tri = (2 / Math.PI) * Math.asin(Math.sin(ph)); const s = (tri * 0.8 + Math.sin(ph * 2) * 0.12) * Math.sin(Math.PI * u) ** 0.8 * vel; bus.add(i0 + k, s * gl, s * gr); }
}
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
function crash(t, vel = 0.2, dur = 1.8) { noiseHit(fx, t, { dur, vel, hp: 3500, p: 0, seed: 77, attack: 0.004 }); noiseHit(fx, t, { dur: dur * 0.5, vel: vel * 0.6, hp: 7000, p: 0.2, seed: 78, attack: 0.002 }); }

// ---------- harmony: Am F C G | Am F C G | Am F C G | C — one chord per bar ----------
const CH = { Am: { v: [57, 60, 64, 69], r: 33 }, F: { v: [53, 57, 60, 65], r: 29 }, C: { v: [55, 60, 64, 67], r: 36 }, G: { v: [55, 59, 62, 67], r: 31 } };
const BARS = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'C'];
const chordAt = (t) => BARS[Math.min(BARS.length - 1, Math.floor(t / BAR + 1e-6))];
const lvl = (t, lanes) => { for (const [a, b, v] of lanes) if (t >= a - 1e-6 && t < b) return v; return 0; };
//        hook         A            B            C             D (night: sparser)  build        lock-up
const KICK = [[0, 4, 0.85], [4, 15, 0.9], [15, 19, 0.62], [19, 19.9, 0.7], [20, 25, 0.9]];
const CLAP = [[4, 15, 0.9], [15, 19, 0.55], [19, 19.9, 0.6], [20, 24.5, 0.95]];
const HATS = [[2, 19.9, 0.8], [20, 24.6, 1.0]];
const ARPL = [[4, 15, 1.0], [15, 19.9, 0.85], [20, 24.5, 0.85]];
const PADL = [[0, 4, 0.8], [4, 15, 1.0], [15, 19.9, 0.9], [20, 25, 0.85]];
const SUBL = [[0, 19.93, 1.0], [20, 25, 0.9]];

// ---------- the line ----------
for (let t = 0; t < END - 1e-6; t += BEAT) {
  const beat = Math.round((t % BAR) / BEAT), kv = lvl(t, KICK);
  if (kv && !(t >= 19.9 && t < 20)) kick909(t, kv);
  const cv = lvl(t, CLAP); if (cv && (beat === 1 || beat === 3)) clap(t, 0.32 * cv);
  const hv = lvl(t, HATS); if (hv) { hat(t + E8, 0.05 * hv, beat === 3, 0.3); if (t >= 4) hat(t, 0.022 * hv, false, -0.25); }
}
for (let k = 0; k < Math.ceil(END / BAR); k++) {
  const t0 = k * BAR, name = chordAt(t0), c = CH[name], pl = lvl(t0, PADL), sl = lvl(t0, SUBL);
  if (pl) saw(pads, t0, c.v, BAR * 0.98, 0.3 * pl, { cut0: t0 >= 4 ? 3000 : 1600, cut1: 800, decay: 0.5 });
  if (sl) { sub(t0, c.r + 12, E8 * 3.8, 0.62 * sl); sub(t0 + BEAT * 2, c.r + 12, E8 * 1.8, 0.5 * sl); sub(t0 + BEAT * 3 - E8, c.r + 12, E8 * 0.9, 0.42 * sl); }
}
// arpeggio: 16ths on the chord, bright pluck; thinner in the night chapter
for (let t = 4; t < END - 0.3; t += S16) {
  const av = lvl(t, ARPL); if (!av) continue; const c = CH[chordAt(t)], n = Math.round((t % BAR) / S16);
  const night = t >= 15 && t < 19; if (night && n % 2) continue;
  pluck(arp, t, c.v[[0, 1, 2, 3, 2, 1, 3, 2][n % 8] % c.v.length] + (night ? 12 : 24), 0.13 * av, { p: n % 2 ? 0.4 : -0.4, damp: 0.55, decay: 0.995, bright: 0.7, seed: 5 + n });
}

// ---------- the hook (E5 G5 A5 C6): four hops of the ball, one instrument per chapter, resolved on the logo ----------
HOP_NOTES.forEach((m, i) => {
  const t = T.hop[i];
  pluck(lead, t, m, 0.52, { p: 0.1, damp: 0.5, decay: 0.997, bright: 0.85, seed: 40 + i }); bell(lead, t, m + 12, 0.06, { decay: 0.5, p: 0.2 });
  softHit(fx, t, { vel: 0.5, tone: 150 - i * 6, p: 0.2 }); click(fx, t, { vel: 0.2, bright: 0.5, seed: 60 + i });                 // the ball on the ruled page
  noiseHit(fx, t + 0.015, { dur: 0.05, vel: 0.05, hp: 5000, p: -0.3, seed: 300 + i });                                              // paper scratch as the question is born
});
const stmt = (t0, kind) => HOP_NOTES.forEach((m, i) => {
  const t = t0 + i * BEAT, mm = kind === 'low' ? m - 12 : m;
  if (kind === 'pluck') pluck(lead, t, mm, 0.3, { p: 0.15, damp: 0.5, decay: 0.997, bright: 0.8, seed: 90 + i });
  else if (kind === 'bell') bell(lead, t, mm + 12, 0.22, { decay: 0.9, p: 0.15 });
  else if (kind === 'rhodes') rhodes(lead, t, mm, BEAT * 0.9, 0.3, { p: 0.15, trem: 0.06 });
  else rhodes(lead, t, mm, BEAT * 0.9, 0.34, { p: 0.0, trem: 0.1 });
});
stmt(T.A + 0.5, 'pluck'); stmt(T.B + 0.5, 'bell'); stmt(T.C, 'rhodes'); stmt(T.D + 0.5, 'low');
// the logo: the whole motif, resolved on C (E G A G C), over the lock-up
[[0, 76, 1], [0.5, 79, 1], [1, 81, 1], [1.5, 79, 1], [2, 84, 4]].forEach(([e, m, len]) => { const t = T.HIT + e; rhodes(lead, t, m, len * BEAT * 0.95, 0.4, { p: 0.15, trem: 0.06 }); bell(lead, t, m + 12, 0.14, { decay: 1.0, p: 0.2 }); pluck(lead, t, m, 0.3, { p: -0.1, decay: 0.997, bright: 0.8, seed: 120 + e * 10 }); });
[[22, 79], [22.5, 83], [23, 86], [23.5, 83]].forEach(([t, m]) => rhodes(lead, t, m, BEAT * 0.9, 0.3, { p: 0.15, trem: 0.06 }));

// ---------- chapter A — مين حضر؟ ----------
sweep(fx, 3.5, { dur: 0.6, vel: 0.1, up: true, seed: 3 });                                                                          // the dot's long arc across the frame
riser(fx, T.A, { dur: 1.0, vel: 0.2, f0: 300, f1: 7000, tonal: 0.3, seed: 4 });
impact(fx, T.A, { vel: 0.3, weight: 0.3 }); bell(fx, T.A, 84, 0.1, { decay: 0.8 });
softHit(fx, T.aCard, { vel: 0.25, tone: 200, p: 0 });                                                                                // card grows out of the dot
for (let i = 0; i < 10; i++) click(fx, T.aType0 + (i / 10) * (T.aType1 - T.aType0), { vel: 0.1, bright: 0.8, p: 0.1, seed: 200 + i });  // typing
tone(fx, T.aRow, 700, 900, { dur: 0.08, vel: 0.12 });
click(fx, T.aClick, { vel: 0.4, bright: 0.7, seed: 11 }); tone(fx, T.aClick, 520, 260, { dur: 0.09, vel: 0.3 });
glide(fx, T.aClick + 0.1, 0.5, 380, 1500, 0.07, 0);                                                                                 // button → dot, flying home
bell(fx, T.aClick + 0.6, 91, 0.12, { decay: 0.5 });
{ const sc = [81, 84, 86, 88, 91, 93, 96, 98, 100]; litList().forEach((d, n) => bell(fx, d.t, sc[Math.min(sc.length - 1, Math.floor((n / 82) * sc.length))], 0.03 + 0.02 * (n % 3 === 0), { decay: 0.22, p: (d.x - 960) / 900 })); }   // the check cascade
[T.chip[0], T.chip[1], T.chip[2], T.chip[3]].forEach((t, i) => { const m = [84, 88, 91, 96][i]; bell(fx, t, m, 0.22, { decay: 0.9 }); bell(fx, t + 0.07, m + 7, 0.1, { decay: 0.6 }); click(fx, t, { vel: 0.12, bright: 0.9 }); });   // each question answered: a higher C-major ring
riser(fx, T.B, { dur: 0.7, vel: 0.2, f0: 400, f1: 6500, tonal: 0.35, seed: 6 });                                                      // the amber flood
impact(fx, T.B, { vel: 0.4, weight: 0.45 });

// ---------- chapter B — مين دفع؟ ----------
softHit(fx, T.bCard, { vel: 0.25, tone: 190, p: -0.3 });
click(fx, T.bAmount + 0.05, { vel: 0.12, bright: 0.8, seed: 21 }); click(fx, T.bAmount + 0.14, { vel: 0.12, bright: 0.8, seed: 22 });
click(fx, T.bClick, { vel: 0.4, bright: 0.7, seed: 23 }); tone(fx, T.bClick, 560, 300, { dur: 0.08, vel: 0.3, p: -0.3 });
const printer = (t0, p) => { for (let i = 0; i < 14; i++) { const t = t0 + (i / 14) * 0.78; click(fx, t, { vel: 0.1, bright: 0.45, p, seed: 400 + i }); noiseHit(fx, t, { dur: 0.018, vel: 0.07, hp: 3800, p, seed: 450 + i }); tone(fx, t, 300 + (i % 3) * 20, 250, { dur: 0.03, vel: 0.05, p }); }
  noiseHit(fx, t0 + 0.8, { dur: 0.05, vel: 0.1, hp: 2500, p, seed: 490 }); };                                                        // thermal printer, one tick per paper step, a tear at the end
printer(T.bPrint1, -0.1); printer(T.bPrint2, 0.35);
bell(fx, T.bPrint1 + 0.8, 88, 0.1, { decay: 0.6, p: -0.1 });
tone(fx, T.bPrint1 + 0.75, 800, 1100, { dur: 0.06, vel: 0.1 });                                                                     // «قيد عكسي» offered
click(fx, T.bRev0, { vel: 0.4, bright: 0.8, seed: 24 });
impact(fx, T.bRev0 + 0.55, { vel: 0.5, weight: 0.4, p: -0.1 }); noiseHit(fx, T.bRev0 + 0.55, { dur: 0.05, vel: 0.12, bp: 2400, q: 1, seed: 25 });     // the stamp
glide(fx, T.bRev0 + 0.5, 0.45, 500, 1000, 0.05, 0.1);                                                                               // the link draws
bell(fx, T.bRev0 + 0.72, 79, 0.12, { decay: 0.5, p: 0.1 });
bell(fx, T.bNet, 84, 0.16, { decay: 0.9, p: 0.3 }); bell(fx, T.bNet + 0.08, 88, 0.12, { decay: 0.9, p: 0.3 });
whooshBy(fx, T.bOut + 0.3, { dur: 0.6, vel: 0.14, direction: 'center', low: 250, high: 3000, seed: 8 });                           // the page scrolls

// ---------- chapter C — مين عليه فلوس؟ ----------
softHit(fx, T.C + 0.1, { vel: 0.22, tone: 170 });
for (let i = 0; i < 8; i++) { whooshBy(fx, T.cList + i * 0.05 + 0.15, { dur: 0.22, vel: 0.05, direction: 'rl', low: 500, high: 2200, seed: 30 + i }); }
for (let k = 0; k < 5; k++) { const t = T.cCount0 + k * 0.1 + 0.05; tone(fx, t, 640 - k * 18, 380, { dur: 0.06, vel: 0.16, p: (k - 2) * 0.12 }); click(fx, t, { vel: 0.1, bright: 0.7, seed: 500 + k }); }   // each due flags itself
sweep(fx, T.cSort + 0.15, { dur: 0.5, vel: 0.1, up: true, seed: 14 });
for (let i = 0; i < 8; i++) softHit(fx, T.cSort + 0.3 + i * 0.045, { vel: 0.12, tone: 130 + i * 6, p: (i - 4) * 0.1 });             // rows settle
bell(fx, T.cSort + 0.65, 88, 0.1, { decay: 0.5 });
click(fx, T.cMoon, { vel: 0.45, bright: 0.9, seed: 26 }); tone(fx, T.cMoon, 700, 1000, { dur: 0.06, vel: 0.22 });                   // the moon toggle
sweep(fx, T.cMoon + 0.3, { dur: 0.7, vel: 0.14, up: false, seed: 27 });
impact(fx, T.D, { vel: 0.35, weight: 0.5 });

// ---------- chapter D — والدرج فيه كام؟ ----------
softHit(fx, T.dModal, { vel: 0.3, tone: 110 });
const DEN = [6, 11, 10, 17, 15, 14, 60, 0];
DEN.forEach((c, i) => { const n = Math.min(c, 9); for (let k = 0; k < n; k++) { const t = T.dTile0 + i * T.dTileStep + (k / Math.max(1, n)) * 0.5; click(fx, t, { vel: 0.07, bright: 0.6 + 0.04 * k, p: ((i % 4) - 1.5) * 0.25, seed: 600 + i * 20 + k }); } });   // counting notes
tone(fx, T.dTile0 + 0.1, 400, 600, { dur: 0.3, vel: 0.05 });
uiConfirm(fx, T.dZero, { vel: 0.3, notes: [79, 86, 91] }); impact(fx, T.dZero, { vel: 0.5, weight: 0.65 });                          // the difference reaches zero
click(fx, T.dClick, { vel: 0.4, bright: 0.5, seed: 28 }); impact(fx, T.dClick + 0.04, { vel: 0.55, weight: 0.8 });
noiseHit(fx, T.dClick + 0.03, { dur: 0.04, vel: 0.12, bp: 1800, q: 4, seed: 29 });                                                  // the vault latches
uiConfirm(fx, T.dClick + 0.18, { vel: 0.22, notes: [84, 91] });

// ---------- payoff ----------
riser(fx, T.HIT, { dur: 1.3, vel: 0.3, f0: 200, f1: 7500, tonal: 0.3, seed: 9 });
{ const tt = [19.5, 19.56, 19.62, 19.67, 19.72, 19.76, 19.8, 19.84, 19.87, 19.9, 19.92]; tt.forEach((t, i) => click(fx, t, { vel: 0.07 + 0.01 * i, bright: 0.85, p: ((i % 4) - 1.5) * 0.3, seed: 700 + i })); }   // the tiles count up
sweep(fx, 19.8, { dur: 0.35, vel: 0.1, up: false, seed: 15 });                                                                       // everything is drawn into one point
kick909(T.HIT, 1.0); sub(T.HIT, 36, 2.4, 0.9); impact(fx, T.HIT, { vel: 0.8, weight: 0.9 }); crash(T.HIT, 0.2, 1.6);
saw(pads, T.HIT, [48, 55, 60, 64, 67, 71], BAR * 1.0, 0.36, { cut0: 3000, cut1: 1000, decay: 0.9, voices: 5, width: 0.7 });
[72, 76, 79, 83, 88].forEach((m, i) => bell(fx, T.HIT + 0.03 + i * 0.07, m, 0.1, { decay: 2.4, p: -0.4 + i * 0.2 }));
whooshBy(fx, T.shift + 0.15, { dur: 0.5, vel: 0.12, direction: 'center', low: 300, high: 2800, seed: 16 });                         // name and tile glide up
impact(fx, T.tag, { vel: 0.3, weight: 0.35 }); impact(fx, T.tag + 0.3, { vel: 0.3, weight: 0.35 });                                    // «سنترك كله» «قدام عينك»
tone(fx, T.sub, 600, 900, { dur: 0.05, vel: 0.1 });
uiConfirm(fx, T.cta, { vel: 0.3, notes: [84, 91, 96] }); softHit(fx, T.cta, { vel: 0.25, tone: 170 });
[96, 100, 103].forEach((m, i) => bell(fx, T.cta + 0.6 + i * 0.07, m, 0.05, { decay: 0.4, p: -0.3 + i * 0.3 }));                         // the sheen
saw(pads, 24.0, [48, 55, 60, 64, 67, 72], 1.2, 0.3, { cut0: 3000, cut1: 1200, decay: 0.9, voices: 5, width: 0.7 }); sub(24.0, 36, 1.0, 0.7);
bell(fx, 24.0, 84, 0.12, { decay: 1.6 });
placeCues(fx, plan.cues);

// ---------- processing ----------
const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(pads, 0.55); pump(low, 0.4, 0.1); pump(arp, 0.25, 0.1); pump(lead, 0.12, 0.08);
const duck = (bus, t0, t1, floor = 0.15) => { for (let i = Math.round(t0 * SR); i < Math.min(bus.n, Math.round(t1 * SR)); i++) { const u = (i / SR - t0) / (t1 - t0), g = 1 - (1 - floor) * Math.sin(Math.PI * Math.min(1, u)) ** 0.5; bus.L[i] *= g; bus.R[i] *= g; } };
for (const b of [pads, low, arp, lead, drums]) duck(b, 19.9, 20.0, 0.0);                                                           // the one-frame breath before the hit
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(pads, 150); hp(arp, 200); hp(lead, 220); hp(keys, 160); hp(fx, 40);
let music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.62); pads.mixInto(music, 1.2); keys.mixInto(music, 1.2); arp.mixInto(music, 1.3); lead.mixInto(music, 1.35);
const send = mk(); pads.mixInto(send, 0.4); arp.mixInto(send, 0.5); lead.mixInto(send, 0.6); fx.mixInto(send, 0.2);
reverb(send, { room: 0.86, damp: 0.4 }).mixInto(music, 0.75);
hp(music, 28);
// phone speakers keep only 300 Hz–3.4 kHz: add a band-passed copy of the music (presence) so the hook and the arp survive a small speaker, and keep the sub in check
{ const mid = mk(); music.mixInto(mid, 1); for (const ch of ['L', 'R']) { const a = biquad('bp', 1500, 0.45), x = mid[ch]; for (let i = 0; i < mid.n; i++) x[i] = a(x[i]); } mid.mixInto(music, 1.1); }
let sfx = mk(); fx.mixInto(sfx, 1);
{ const mid = mk(); fx.mixInto(mid, 1); for (const ch of ['L', 'R']) { const a = biquad('bp', 2200, 0.5), x = mid[ch]; for (let i = 0; i < mid.n; i++) x[i] = a(x[i]); } mid.mixInto(sfx, 0.5); }

for (const b of [music, sfx]) { for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.7 ? Math.cos(((t - (DUR - 0.7)) / 0.7) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; } b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n); }
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 0.9);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 0.9 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film12 score: ${DUR}s 120 BPM, norm ${norm.toFixed(3)}`);
