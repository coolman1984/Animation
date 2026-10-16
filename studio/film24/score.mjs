// Film 24 score — 3D fly-over of the academy landing page — original, 120 BPM, 14.5 s. The bar grid is shifted by −0.03 s so a
// downbeat lands exactly on the dive's hit (9.97 s). One steady groove under the steady glide (no surges), a build under the rise,
// whooshes on 8.66 (the rise) and 9.80 (the dive), the hit on 9.97, then the hook resolves on bells while the title writes itself.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, pad, rhodes, pluck, bell, noiseHit, reverb, writeWav, peak, biquad, pan } from '../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../lib/sfx.mjs';
import { T, DUR } from './timing.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film24');
mkdirSync(OUT, { recursive: true });
const BEAT = 0.5, E8 = BEAT / 2, G0 = -0.03, N = DUR + 1.5;
const bt = (b) => G0 + b * BEAT;
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




// ---------- harmony: Fmaj7 | Am7 | Fmaj7 | G6 → C (hit) ----------
const CH = [
  { r: 41, v: [53, 57, 60, 64], hook: [72, 76, 79, 76] },   // Fmaj7
  { r: 45, v: [57, 60, 64, 67], hook: [72, 76, 81, 76] },   // Am7
  { r: 41, v: [53, 57, 60, 64], hook: [72, 76, 79, 81] },   // Fmaj7
  { r: 43, v: [55, 59, 62, 64], hook: [74, 79, 83, 79] },   // G6
  { r: 36, v: [48, 55, 60, 64, 67], hook: [79, 84, 88, 84] }, // C (the hit)
];
const chordAt = (bar) => CH[Math.min(bar, 3) % 4];
// bars: 0 (−0.03–1.97) intro · 1–3 (1.97–7.97) the glide · 4 (7.97–9.97) the rise and dive · 5–7 (9.97–15.97) the title card
// intro: a soft pad and a filtered arp in eighths, the hook's first statement on a pluck at the end of bar 0
saw(pads, 0, CH[0].v, 1.95, 0.1, { cut0: 900, cut1: 500, decay: 1.4, voices: 4, width: 0.7 });
for (let i = 0; i < 16; i++) pluck(arp, bt(i * 0.5), CH[0].v[i % 4] + 12, 0.05 + 0.03 * (i / 16), { p: (i % 2 ? 0.35 : -0.35), damp: 0.55, decay: 0.99, bright: 0.45, seed: 30 + i });
CH[0].hook.forEach((m, i) => pluck(arp, bt(2 + i * 0.5), m, 0.1, { p: -0.2 + i * 0.13, damp: 0.3, decay: 0.994, bright: 0.85, seed: 50 + i }));
softHit(fx, 0.02, { vel: 0.12, tone: 160 });
// the glide (bars 1–3): one steady groove — four-on-the-floor kick, offbeat hats, sub on the root, arps that never stop
for (let b = 4; b < 16; b++) {
  const bar = Math.floor(b / 4), ch = chordAt(bar), t = bt(b);
  kick(t, b % 4 === 0 ? 0.9 : 0.75); if (b % 2) clap(t, 0.2); hat(t + E8, 0.05, b % 4 === 3); hat(t, 0.03);
  sub(t, ch.r - 12 + (ch.r < 40 ? 12 : 0), E8 * 1.6, 0.55);
  for (let e = 0; e < 2; e++) pluck(arp, t + e * E8, ch.v[(b * 2 + e) % ch.v.length] + 12, 0.06, { p: e ? 0.3 : -0.3, damp: 0.5, decay: 0.99, bright: 0.55, seed: 100 + b * 2 + e });
}
for (let bar = 1; bar < 4; bar++) saw(pads, bt(bar * 4), chordAt(bar).v, 1.95, 0.14, { cut0: 1500 + bar * 300, cut1: 650, decay: 0.8, voices: 4, width: 0.7 });
chordAt(1).hook.forEach((m, i) => bell(arp, bt(7 + i * 0.5), m, 0.09, { decay: 1.1, p: -0.3 + i * 0.2 }));
chordAt(3).hook.forEach((m, i) => pluck(arp, bt(14 + i * 0.5), m, 0.11, { p: -0.2 + i * 0.13, damp: 0.3, decay: 0.994, bright: 0.85, seed: 140 + i }));
// the rise and the dive (bar 4): build — filter opens, snare roll, riser; whooshes on 8.66 and 9.80; a breath before the hit
for (let b = 16; b < 20; b++) { const t = bt(b); kick(t, 0.8); hat(t + E8, 0.06, true); sub(t, 31, E8 * 1.6, 0.5); }
saw(pads, bt(16), CH[3].v, 1.95, 0.16, { cut0: 900, cut1: 4200, decay: 4, voices: 5, width: 0.8 });
riser(fx, 8.0, { dur: T.hit - 8.02, vel: 0.3, f0: 260, f1: 9000, tonal: 0.35, seed: 61 });
for (let k = 0; k < 12; k++) snare(bt(18) + k * (BEAT / 6) * (1 - k * 0.02), 0.06 + k * 0.022);
whooshBy(fx, T.whoosh[0] - 0.3, { dur: 0.75, vel: 0.2, direction: 'center', low: 200, high: 5000, seed: 62 });
whooshBy(fx, T.whoosh[1] - 0.12, { dur: 0.3, vel: 0.22, direction: 'center', low: 400, high: 7000, seed: 63 });
// the hit (9.97) and the title card
kick(T.hit, 1.2); sub(T.hit, 24, 2.4, 0.9); impact(fx, T.hit, { vel: 0.8, weight: 0.85 }); clap(T.hit, 0.35);
saw(pads, T.hit, CH[4].v, 4.2, 0.22, { cut0: 3200, cut1: 900, decay: 1.4, voices: 5, width: 0.8 });
CH[4].hook.forEach((m, i) => saw(lead, T.hit + i * E8, [m], E8 * 0.9, 0.24, { cut0: 5200, cut1: 1300, decay: 0.25, voices: 3, detune: 0.1, width: 0.3 }));
[84, 88, 91, 96].forEach((m, i) => bell(fx, T.hit + 0.02 + i * 0.05, m, 0.08, { decay: 2.0, p: -0.4 + i * 0.27 }));
bell(fx, T.badge + 0.02, 96, 0.05, { decay: 1.2 });
[0, 1, 2].forEach((i) => pluck(fx, T.line1 + i * 0.06 + 0.04, [84, 88, 91][i], 0.06, { p: -0.3 + i * 0.3, damp: 0.3, decay: 0.995, bright: 0.9, seed: 170 + i }));
[0, 1, 2, 3].forEach((i) => bell(fx, T.line2 + i * 0.05 + 0.05, [79, 84, 88, 91][i], 0.045, { decay: 1.6, p: -0.3 + i * 0.2 }));
for (let b = 21; b < 28; b++) { const t = bt(b); kick(t, b % 4 === 0 ? 0.6 : 0.45); hat(t + E8, 0.035, false); }
CH[4].hook.forEach((m, i) => bell(arp, bt(26 + i * 0.5), m, 0.07, { decay: 1.6, p: -0.3 + i * 0.2 }));
saw(pads, bt(28), [48, 55, 60, 64, 67], 1.6, 0.14, { cut0: 1500, cut1: 600, decay: 1.2, voices: 5, width: 0.8 });
[72, 76, 79, 84].forEach((m, i) => bell(fx, bt(28) + 0.02 + i * 0.09, m + 12, 0.035, { decay: 2.4, p: -0.3 + i * 0.2 }));

// ---------- processing ----------
const cut = (bus, t0, t1, t2) => { for (let i = Math.round(t0 * SR); i < Math.min(bus.n, Math.round(t2 * SR)); i++) { const t = i / SR, g = t < t1 ? 1 - (t - t0) / (t1 - t0) : Math.min(1, (t - t1) / (t2 - t1)); bus.L[i] *= g; bus.R[i] *= g; } };
const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (SR * rel); const g = 1 - depth * Math.exp(-u * 3); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(pads, 0.5); pump(low, 0.45, 0.1); pump(arp, 0.2, 0.1);
for (const b of [drums, pads, arp, low]) cut(b, T.hit - 0.08, T.hit - 0.04, T.hit - 0.001);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(pads, 140); hp(arp, 220); hp(lead, 200); hp(keys, 160); hp(fx, 35);
const music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.32); pads.mixInto(music, 1.3); keys.mixInto(music, 1.2); arp.mixInto(music, 1.6); lead.mixInto(music, 2.2);
const send = mk(); pads.mixInto(send, 0.35); arp.mixInto(send, 0.5); lead.mixInto(send, 0.5);
reverb(send, { room: 0.82, damp: 0.38 }).mixInto(music, 0.55);
hp(music, 28);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.45); reverb(sendF, { room: 0.75, damp: 0.3 }).mixInto(sfx, 0.4);
for (const b of [music, sfx]) for (let i = 0; i < b.n; i++) { const t = i / SR, g = t > DUR - 1.2 ? Math.max(0, Math.cos(((t - (DUR - 1.2)) / 1.2) * Math.PI / 2)) : 1; b.L[i] *= g; b.R[i] *= g; }
const out = (b) => { const o = new Bus(DUR); for (let i = 0; i < o.n; i++) { o.L[i] = b.L[i]; o.R[i] = b.R[i]; } return o; };
const M = out(music), Fx = out(sfx), mix = new Bus(DUR); M.mixInto(mix, 1); Fx.mixInto(mix, 0.95);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), M, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), Fx, { gain: norm * 0.95 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film24 score: ${DUR}s, hit ${T.hit}s, norm ${norm.toFixed(3)}`);
