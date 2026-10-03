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
// A · the sign — owner direction: no human or chair sounds at all. A low, wavering warning bell, as if the case itself says
// "I have a problem and I'm worried": inharmonic bell partials, each doubled slightly out of tune so they beat (the waver),
// a slow vibrato and tremolo, tolled on the start and on each failed attempt; under it a faint uneasy hum that beats at 1.6 Hz.
function alarmBell(t, f, vel = 0.3, { decay = 2.2, p = 0 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(decay * 2.4 * SR), [gl, gr] = pan(p);
  const parts = [[1, 1, 1], [2.0, 0.45, 0.6], [2.76, 0.3, 0.45], [5.4, 0.12, 0.2]];
  for (let k = 0; k < len; k++) {
    const x = k / SR, vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * x), trem = 1 - 0.35 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 6.3 * x));
    let v = 0;
    for (const [m, amp, d] of parts) { const ff = f * m * vib; v += amp * (Math.sin(2 * Math.PI * ff * x) + Math.sin(2 * Math.PI * ff * 1.006 * x)) * 0.5 * Math.exp(-x / (decay * d)); }
    v *= Math.min(1, x / 0.004) * trem * vel * 0.3; fx.add(i0 + k, v * gl, v * gr);
  }
}
function unease(t0, t1, f = 98, vel = 0.05) { // a faint hum that beats (two sines 1.6 Hz apart), swelling and fading
  const i0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR);
  for (let k = 0; k < len; k++) { const x = k / SR, u = k / len, env = Math.min(1, u / 0.15) * Math.min(1, (1 - u) / 0.2); const v = (Math.sin(2 * Math.PI * f * x) + Math.sin(2 * Math.PI * (f + 1.6) * x) + 0.3 * Math.sin(2 * Math.PI * f * 2 * x)) * env * vel; fx.add(i0 + k, v, v); }
}
unease(0.1, 3.95, 98, 0.016);
alarmBell(0.3, 196, 0.11, { decay: 2.0 });             // the case announces itself
alarmBell(1.7, 185, 0.12, { decay: 2.0, p: -0.15 });   // first failed attempt: the bell again, a little lower
alarmBell(3.0, 175, 0.14, { decay: 2.4, p: 0.15 });    // second failure: lower and longer — the worry grows
whooshBy(fx, 3.95, { dur: 0.6, vel: 0.05, direction: 'lr', low: 250, high: 1800, seed: 6 }); // the figure steps back
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
