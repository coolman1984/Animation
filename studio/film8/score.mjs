// Film 8 score — Pixel Plus factory pitch — original, 96 BPM (beat 0.625 s, bar 2.5 s, 10 bars = 25 s). Formal and confident:
// a machine's pulse (kick on 1 and 3, a tick each beat) and a pluck ostinato from the first second; the groove opens on the method (7.5),
// the hook enters at 10.0, lifts at 15.0, arrives on C under the lock-up (22.5). Each station of the rail gets a click + a short metallic tone.
// Voices copied from film7/score.mjs. No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, pad, rhodes, pluck, bell, noiseHit, reverb, writeWav, peak, biquad, pan } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film8');
mkdirSync(OUT, { recursive: true });
const DUR = 25, BEAT = 0.625, BAR = 2.5, E8 = BEAT / 2, S16 = BEAT / 4, N = DUR + 2;
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


// ---------- harmony ----------
const CH = {
  Am: { v: [57, 60, 64, 69], r: 33 }, F: { v: [53, 57, 60, 65], r: 29 }, C: { v: [55, 60, 64, 67], r: 36 }, G: { v: [55, 59, 62, 67], r: 31 }, Am9: { v: [57, 60, 64, 67, 71], r: 33 },
};
const HALF = 2 * BEAT, END = 22.5;
const PROG = [[0, 'Am9'], [2.5, 'F'], [3.75, 'G'], [5, 'Am'], [6.25, 'F'], [7.5, 'C'], [8.75, 'G'], [10, 'Am'], [11.25, 'F'], [12.5, 'C'], [13.75, 'G'], [15, 'F'], [16.25, 'G'], [17.5, 'Am'], [18.75, 'F'], [20, 'F'], [21.25, 'G']];
const chordAt = (t) => { let c = PROG[0]; for (const p of PROG) if (p[0] <= t + 1e-6) c = p; return c; };
const HOOK = { C: [[0, 76, 2], [2, 79, 1], [3, 76, 1]], G: [[0, 74, 2], [2, 71, 1], [3, 74, 1]], Am: [[0, 72, 2], [2, 76, 1], [3, 72, 1]], F: [[0, 69, 2], [2, 72, 1], [3, 77, 1]] };
const lvl = (t, lanes) => { for (const [a, b, v] of lanes) if (t >= a - 1e-6 && t < b) return v; return 0; };
const DRUMS = [[0, 5, 0.5], [5, 7.5, 0.65], [7.5, 12.5, 0.85], [12.5, 15, 0.95], [15, 20, 1.05], [20, 22.5, 1.1]];
const HOOKL = [[10, 12.5, 0.55], [12.5, 15, 0.65], [15, 20, 0.8], [20, 22.5, 0.9]];
const ARPL = [[0, 5, 0.75], [5, 7.5, 0.6], [7.5, 22.5, 1]];
const STATIONS = [0.4, 5.0, 7.5, 12.5, 15.0, 17.5, 20.2];

// ---------- the line: kick on 1 and 3 from the start (a machine's pulse), clap from 7.5, hats from 2.5 ----------
for (let t = 0; t < END - 1e-6; t += BEAT) {
  const bar = Math.floor(t / BAR + 1e-6), beat = Math.round((t - bar * BAR) / BEAT), d = lvl(t, DRUMS);
  if (beat === 0 || beat === 2) kick909(t, 0.75 * d + 0.1);
  if ((beat === 1 || beat === 3) && t >= 7.5) clap(t, 0.32 * d);
  if (t >= 2.5) { hat(t + E8, 0.05 * d, beat === 3, 0.3); hat(t, 0.025 * d, false, -0.25); }
  if (t >= 7.5) for (let k = 0; k < 4; k++) shaker(t + k * S16, (k % 2 ? 0.024 : 0.014) * d);
  if (t < 7.5) click(keys, t, { vel: 0.05 + 0.02 * (beat === 0), bright: 0.9, p: beat % 2 ? 0.3 : -0.3, seed: 300 + Math.round(t * 10) }); // the machine's tick
}
for (let t = 7.5 + 2 * BEAT + E8; t < END; t += BAR) kick909(t, 0.35);
for (let k = 0; k < 18; k++) {
  const t0 = k * HALF; if (t0 >= END - 1e-6) break;
  const [, name] = chordAt(t0), c = CH[name], al = lvl(t0, ARPL), hl = lvl(t0, HOOKL), big = t0 >= 7.5;
  saw(pads, t0, c.v, HALF * 0.98, big ? 0.3 : 0.22, { cut0: big ? 3000 : 1600, cut1: 800, decay: 0.5 });
  sub(t0, c.r + 12, E8 * 2.85, 0.6); sub(t0 + E8 * 3, c.r + 12, E8 * 0.9, 0.45);
  if (big) for (const e of [0, 3]) c.v.slice(0, 3).forEach((m, i) => rhodes(keys, t0 + e * E8 + i * 0.006, m + 12, E8 * 1.6, 0.16, { p: -0.2 + i * 0.2, trem: 0.1 }));
  if (al) [0, 1, 2, 1].forEach((n, e) => pluck(arp, t0 + e * E8, c.v[n % c.v.length] + 24, 0.2 * al, { p: e % 2 ? 0.4 : -0.4, damp: 0.55, decay: 0.995, bright: 0.7, seed: 5 + k }));
  if (hl) for (const [e, m, len] of HOOK[name] || []) { rhodes(lead, t0 + e * E8, m, len * E8 * 0.9, 0.34 * hl, { p: 0.15, trem: 0.06 }); if (len >= 2) bell(lead, t0 + e * E8, m + 12, 0.1 * hl, { decay: 0.7, p: 0.2 }); }
}
// final C under the lock-up
saw(pads, 22.5, [48, 55, 60, 64, 67, 71], 2.5, 0.34, { cut0: 3000, cut1: 1000, decay: 0.9, voices: 5, width: 0.7 });
kick909(22.5, 0.75); sub(22.5, 36, 2.3, 0.7);
[72, 76, 79, 83, 88].forEach((m, i) => bell(fx, 22.53 + i * 0.07, m, 0.1, { decay: 2.4, p: -0.4 + i * 0.2 }));

// ---------- events ----------
for (const t of STATIONS) { click(fx, t, { vel: 0.3, bright: 0.6 }); tone(fx, t, 620, 340, { dur: 0.09, vel: 0.22 }); }      // the work-piece lands on each station
sweep(fx, 0.9, { dur: 1.2, vel: 0.06, up: false, seed: 2 });                                                                // the rail draws
riser(fx, 5.0, { dur: 0.9, vel: 0.22, f0: 300, f1: 8000, tonal: 0.3, seed: 4 });
{ for (let i = 0; i < 26; i++) bell(fx, 5.1 + (i * 0.037) % 0.9, [81, 84, 86, 88, 91, 93, 96][i % 7], 0.04, { p: (i % 5) / 2.5 - 0.8, decay: 0.4 }); } // pixels assembling
bell(fx, 6.05, 91, 0.13, { decay: 1.2 }); tone(fx, 6.2, 1300, 520, { dur: 0.1, vel: 0.26 });                                 // plus, dot
whooshBy(fx, 7.6, { dur: 0.5, vel: 0.1, direction: 'rl', low: 300, high: 2600, seed: 6 });                                  // logo parks
sweep(fx, 8.85, { dur: 1.0, vel: 0.1, up: true, seed: 7 });                                                                 // the scan beam
[9.0, 9.1, 9.2, 9.3].forEach((t, i) => softHit(fx, t + 0.15, { vel: 0.3, tone: 110 - i * 8, p: 0.4 - i * 0.25 }));          // templates drop
for (let i = 0; i < 14; i++) click(fx, 10.1 + i * 0.035, { vel: 0.06, bright: 0.95, seed: 400 + i });                        // pixels snap in
bell(fx, 10.6, 88, 0.12, { decay: 1.0 });
glide(fx, 12.6, 1.3, 330, 990, 0.05, -0.2);                                                                                 // two strands braid
[15.15, 15.4].forEach((t, i) => whooshBy(fx, t, { dur: 0.4, vel: 0.12, direction: 'lr', low: 300, high: 2800, seed: 8 + i }));  // client cards
[18.6, 19.2, 19.8].forEach((t, i) => { bell(fx, t, 84 + i * 3, 0.11, { decay: 0.9 }); tone(fx, t, 900, 1300, { dur: 0.07, vel: 0.15 }); }); // pings on the floor
riser(fx, 20.6, { dur: 0.6, vel: 0.18, f0: 300, f1: 6000, tonal: 0.3, seed: 9 });
placeCues(fx, plan.cues);

// ---------- processing ----------
const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(pads, 0.55); pump(low, 0.4, 0.1); pump(arp, 0.25, 0.1); pump(lead, 0.15, 0.08);
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
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 0.9 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film8 score: ${DUR_OUT}s 96 BPM, norm ${norm.toFixed(3)}`);
