// Film 9 sound — NeuroAnara — NO MUSIC (owner request): sound effects only, timed to the picture. A very low room tone keeps the
// silence from feeling dead; every other sound belongs to an on-screen event (a chair, a neuron firing, a synapse lighting, letters decoding).
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, bell, noiseHit, reverb, writeWav, peak, biquad, pan } from '../lib/audio.mjs';
import { softHit, click, uiConfirm, whooshBy, sweep, mechanical, texture } from '../lib/sfx.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film9'); mkdirSync(OUT, { recursive: true });
const DUR = 20, fx = new Bus(DUR + 2);
function glide(t, dur, f0, f1, vel = 0.1, p = 0) { // tonal neuron "zap": triangle glide with a soft envelope
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < len; k++) { const u = k / len, f = f0 * Math.pow(f1 / f0, u); ph += 2 * Math.PI * f / SR; const s = (2 / Math.PI) * Math.asin(Math.sin(ph)) * Math.sin(Math.PI * u) ** 1.2 * vel; fx.add(i0 + k, s * gl, s * gr); }
}
function tone(t, f0, f1, { dur = 0.12, vel = 0.2, p = 0, g = 0.04 } = {}) {
  const i0 = Math.round(t * SR), [gl, gr] = pan(p); let ph = 0;
  for (let k = 0; k < dur * 3 * SR; k++) { const tt = k / SR, f = f1 + (f0 - f1) * Math.exp(-tt / g); ph += 2 * Math.PI * f / SR; const s = Math.sin(ph) * Math.min(1, tt / 0.002) * Math.exp(-tt / dur) * vel * 0.35; fx.add(i0 + k, s * gl, s * gr); }
}
texture(fx, 0, DUR, { level: 0.02, kind: 'room', seed: 9, fade: 0.8 });
// A · the sign — expressive, physical sounds (owner: the first version was "very bad and not expressive"):
// a quiet heartbeat under the struggle, a breath in as he leans forward, a real wooden creak (stick-slip friction),
// the body dropping back onto the seat with a felt thump and a rattle of the chair legs, a tired breath out.
function noiseBand(t, dur, f0, f1, vel, { q = 1.2, p = 0, attack = 0.4, seed = 1 } = {}) { // breath: band-passed noise with a moving centre
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), [gl, gr] = pan(p); let st = { x1: 0, x2: 0, y1: 0, y2: 0 }, r = seed * 9301 + 49297;
  for (let k = 0; k < len; k++) {
    const u = k / len, f = f0 * Math.pow(f1 / f0, u), w = 2 * Math.PI * f / SR, c = Math.cos(w), sn = Math.sin(w), a = sn / (2 * q);
    r = (r * 1103515245 + 12345) & 0x7fffffff; const x = r / 0x3fffffff - 1;
    const y = (a * x - a * st.x2 + 2 * c * st.y1 - (1 - a) * st.y2) / (1 + a); st = { x2: st.x1, x1: x, y2: st.y1, y1: y };
    const env = Math.pow(Math.min(1, u / attack), 1.5) * Math.pow(1 - u, 1.3); fx.add(i0 + k, y * env * vel * gl, y * env * vel * gr);
  }
}
function creak(t, dur, { vel = 0.5, f = 620, rate0 = 28, rate1 = 55, p = 0 } = {}) { // stick-slip: a train of tiny clicks ringing a wooden resonance
  let tt = t, k = 0;
  while (tt < t + dur) {
    const u = (tt - t) / dur, rate = rate0 + (rate1 - rate0) * Math.sin(Math.PI * u), env = Math.sin(Math.PI * u) ** 0.7;
    const i0 = Math.round(tt * SR), ff = f * (1 + 0.08 * Math.sin(k * 1.7)), [gl, gr] = pan(p);
    for (let j = 0; j < SR * 0.025; j++) { const x = j / SR, v = Math.sin(2 * Math.PI * ff * x) * Math.exp(-x / 0.006) + 0.4 * Math.sin(2 * Math.PI * ff * 2.31 * x) * Math.exp(-x / 0.003); fx.add(i0 + j, v * env * vel * 0.3 * gl, v * env * vel * 0.3 * gr); }
    tt += 1 / rate * (0.85 + 0.3 * ((k * 0.618) % 1)); k++;
  }
}
function thump(t, vel = 0.5) { // a body landing on a seat: low felt thud
  const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.35; k++) { const x = k / SR, f = 55 + 70 * Math.exp(-x / 0.03); ph += 2 * Math.PI * f / SR; const v = Math.sin(ph) * Math.exp(-x / 0.09) * Math.min(1, x / 0.004) * vel * 0.5; fx.add(i0 + k, v, v); }
  noiseHit(fx, t, { dur: 0.06, vel: vel * 0.25, bp: 350, q: 0.8, seed: Math.round(t * 100), attack: 0.003 });
}
function heart(t, vel = 0.2) { for (const [dt, g] of [[0, 1], [0.16, 0.65]]) { const i0 = Math.round((t + dt) * SR); let ph = 0; for (let k = 0; k < SR * 0.18; k++) { const x = k / SR, f = 48 + 20 * Math.exp(-x / 0.02); ph += 2 * Math.PI * f / SR; const v = Math.sin(ph) * Math.exp(-x / 0.05) * Math.min(1, x / 0.005) * vel * g; fx.add(i0 + k, v, v); } } }
for (let t = 0.25; t < 3.7; t += 0.82) heart(t, 0.11 + 0.03 * Math.min(1, t / 2.5));                     // a heartbeat that quickens a little with the effort
[[0.7, 1.7, 0], [2.0, 3.0, 1]].forEach(([up, back, i]) => {
  noiseBand(up, 0.55, 500, 1400, 0.032 + 0.01 * i, { q: 1.4, attack: 0.7, seed: 11 + i });                // breath in, gathering effort
  creak(up + 0.12, 0.42 + 0.08 * i, { vel: 0.3 + 0.08 * i, f: 560 + 60 * i, p: -0.2 });                 // the chair creaks as weight shifts forward
  creak(back - 0.22, 0.2, { vel: 0.25, f: 480, rate0: 40, rate1: 70, p: -0.2 });                         // a short creak as he gives up
  thump(back, 0.28 + 0.05 * i);                                                                            // he drops back onto the seat
  [0.03, 0.075].forEach((d, j) => noiseHit(fx, back + d, { dur: 0.012, vel: 0.07, bp: 1800 - j * 400, q: 6, seed: 70 + j + i * 5 })); // chair legs knock
  noiseBand(back + 0.08, 0.7, 1100, 380, 0.028 + 0.006 * i, { q: 1.1, attack: 0.15, seed: 21 + i });       // a tired breath out
});
noiseBand(2.55, 0.5, 900, 2200, 0.015, { q: 2.5, attack: 0.5, seed: 31 });                              // the question tag appears: a soft air
whooshBy(fx, 3.95, { dur: 0.6, vel: 0.06, direction: 'lr', low: 250, high: 1800, seed: 6 });              // the figure steps back
// B · causes branch out like dendrites
for (let i = 0; i < 8; i++) { const t0 = 4.2 + i * 0.22; glide(t0 - 0.28, 0.32, 500 + i * 40, 1500 + i * 90, 0.035, 0.4); click(fx, t0, { vel: 0.1, bright: 0.85, p: 0.4 }); bell(fx, t0 + 0.02, 81 + (i % 4) * 2, 0.04, { decay: 0.5, p: 0.4 }); }
uiConfirm(fx, 6.25, { vel: 0.16, notes: [69, 76] });                                                       // "understand why the movement failed"
sweep(fx, 7.2, { dur: 0.5, vel: 0.07, up: false, seed: 7 });
// C · decode along the axon
glide(7.55, 0.8, 180, 520, 0.05, -0.3); sweep(fx, 7.9, { dur: 0.8, vel: 0.05, up: true, seed: 8 });
glide(8.3, 2.5, 220, 330, 0.025, -0.3);                                                                    // the pulse travelling
[[8.35, 81], [9.55, 85], [10.75, 88]].forEach(([t, m]) => { bell(fx, t, m, 0.14, { decay: 1.2, p: -0.3 }); softHit(fx, t, { vel: 0.22, tone: 140 }); }); // three synapses light
sweep(fx, 11.75, { dur: 0.5, vel: 0.06, up: false, seed: 9 });
// D · فكّر. اربط. قرّر.
[11.95, 12.45, 12.95].forEach((t, i) => { softHit(fx, t, { vel: 0.26, tone: 150 + i * 25 }); click(fx, t, { vel: 0.12, bright: 0.7 }); });
// E · not memorized → decoded
click(fx, 13.75, { vel: 0.1, bright: 0.8 });
whooshBy(fx, 14.7, { dur: 0.35, vel: 0.1, direction: 'lr', low: 1200, high: 6000, seed: 10 });             // the strike
for (let k = 0; k < 22; k++) click(fx, 14.85 + k * 0.045, { vel: 0.05 + 0.02 * (k % 3 === 0), bright: 0.95, p: (k % 5) / 2.5 - 0.8, seed: 500 + k }); // letters decoding
bell(fx, 15.87, 93, 0.14, { decay: 1.4 }); bell(fx, 15.91, 100, 0.06, { decay: 1.0 });                     // decoded
// F · the lock-up
[0, 1, 2, 3, 4].forEach((i) => bell(fx, 17.22 + i * 0.05, [88, 93, 96, 100, 105][i], 0.05, { decay: 0.9, p: -0.4 + i * 0.2 })); // the star
whooshBy(fx, 17.5, { dur: 0.8, vel: 0.08, direction: 'center', low: 400, high: 3500, seed: 11 });
sweep(fx, 18.15, { dur: 0.7, vel: 0.04, up: true, seed: 12 });
tone(18.9, 800, 1300, { dur: 0.08, vel: 0.2 }); uiConfirm(fx, 19.1, { vel: 0.14, notes: [81, 88] });
// processing: a small room, high-pass, end fade
const hp = biquad('hp', 60, 0.7), hpR = biquad('hp', 60, 0.7); for (let i = 0; i < fx.n; i++) { fx.L[i] = hp(fx.L[i]); fx.R[i] = hpR(fx.R[i]); }
const sfx = new Bus(DUR + 2); fx.mixInto(sfx, 1); const send = new Bus(DUR + 2); fx.mixInto(send, 0.4); reverb(send, { room: 0.7, damp: 0.35 }).mixInto(sfx, 0.5);
for (let i = 0; i < sfx.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.6 ? (DUR - t) / 0.6 : 1; sfx.L[i] *= g; sfx.R[i] *= g; }
sfx.n = DUR * SR; sfx.L = sfx.L.subarray(0, sfx.n); sfx.R = sfx.R.subarray(0, sfx.n);
const music = new Bus(DUR); // silent on purpose: no music in this film
// gentle peak control: sparse effects normalised to −16 LUFS would otherwise overshoot the true-peak ceiling
{ const p0 = peak(sfx), k = 2.2; for (let i = 0; i < sfx.n; i++) { sfx.L[i] = Math.tanh(k * sfx.L[i] / p0) / Math.tanh(k) * p0; sfx.R[i] = Math.tanh(k * sfx.R[i] / p0) / Math.tanh(k) * p0; } }
const norm = 0.5 / peak(sfx);
writeWav(join(OUT, 'music.wav'), music); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm }); writeWav(join(OUT, 'mix.wav'), sfx, { gain: norm });
console.log(`film9 sound: ${DUR}s, sfx only (no music), norm ${norm.toFixed(3)}`);
