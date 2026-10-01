// Code-only music + sound-design engine. Deterministic (seeded noise), no packages.
// Buses are Float32 stereo buffers; instruments add into them; a Freeverb-style room adds space.
import { writeFileSync } from 'node:fs';

export const SR = 48000;
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class Bus {
  constructor(seconds) { this.n = Math.ceil(seconds * SR); this.L = new Float32Array(this.n); this.R = new Float32Array(this.n); }
  add(i, l, r = l) { if (i >= 0 && i < this.n) { this.L[i] += l; this.R[i] += r; } }
  mixInto(dst, gain = 1) { for (let i = 0; i < this.n; i++) { dst.L[i] += this.L[i] * gain; dst.R[i] += this.R[i] * gain; } }
}

// Constant-power pan: p in [-1, 1].
export const pan = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

// RBJ biquad.
export function biquad(type, f, q = 0.707) {
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
  else { b0 = a; b1 = 0; b2 = -a; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; } // bp
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const f_ = (x) => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  return f_;
}

// ---------- instruments (each writes into a bus at time t, seconds) ----------
export function rhodes(bus, t, midi, dur, vel = 0.5, { p = 0, trem = 0.18 } = {}) {
  const f = mtof(midi), i0 = Math.round(t * SR);
  const decay = 2.2 * Math.pow(0.5, (midi - 60) / 24);
  const len = Math.round((dur + 0.6) * SR);
  const [gl, gr] = pan(p);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const env = Math.min(1, tt / 0.003) * Math.exp(-tt / decay) * (tt > dur ? Math.exp(-(tt - dur) / 0.12) : 1);
    if (env < 1e-4 && tt > 0.05) break;
    const idx = 1.6 * Math.exp(-tt / 0.35) * (0.6 + vel) + 0.25;
    const tine = 0.5 * Math.exp(-tt / 0.03) * Math.sin(2 * Math.PI * f * 14 * tt);
    const s = Math.sin(2 * Math.PI * f * tt + idx * Math.sin(2 * Math.PI * f * tt) + tine) + 0.15 * Math.sin(2 * Math.PI * 2 * f * tt);
    const tr = 1 - trem * (0.5 + 0.5 * Math.sin(2 * Math.PI * 4.6 * (t + tt)));
    const tl = 1 - trem * (0.5 + 0.5 * Math.sin(2 * Math.PI * 4.6 * (t + tt) + Math.PI));
    const v = s * env * vel * 0.22;
    bus.add(i0 + k, v * gl * tl * 1.2, v * gr * tr * 1.2);
  }
}

export function pluck(bus, t, midi, vel = 0.5, { p = 0, damp = 0.5, decay = 0.9965, seed = 1, bright = 0.5 } = {}) {
  const f = mtof(midi), N = Math.max(2, Math.round(SR / f));
  const r = rng(seed + midi * 31 + Math.round(t * 1000));
  const buf = new Float32Array(N);
  let prev = 0;
  for (let k = 0; k < N; k++) { const x = r() * 2 - 1; prev = prev + bright * (x - prev); buf[k] = prev; }
  const i0 = Math.round(t * SR), len = Math.round(3.2 * SR);
  const [gl, gr] = pan(p);
  let idx = 0, last = 0;
  const body = biquad('bp', 220, 1.2);
  for (let k = 0; k < len; k++) {
    const y = buf[idx];
    const nxt = buf[(idx + 1) % N];
    buf[idx] = decay * ((1 - damp) * y + damp * 0.5 * (y + nxt));
    idx = (idx + 1) % N;
    const out = (y + 0.25 * body(y)) * vel * 0.4 * Math.min(1, k / 24);
    last = out;
    bus.add(i0 + k, out * gl, out * gr);
  }
  return last;
}

export function bass(bus, t, midi, dur, vel = 0.6) {
  const f = mtof(midi), i0 = Math.round(t * SR), len = Math.round((dur + 0.25) * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const env = Math.min(1, tt / 0.006) * Math.exp(-tt / 0.9) * (tt > dur ? Math.exp(-(tt - dur) / 0.05) : 1);
    ph += 2 * Math.PI * f / SR;
    let s = Math.sin(ph) + 0.28 * Math.sin(2 * ph) + 0.08 * Math.sin(3 * ph) * Math.exp(-tt / 0.08);
    s = Math.tanh(s * 1.3) * 0.75;
    bus.add(i0 + k, s * env * vel * 0.42);
  }
}

export function pad(bus, t, midis, dur, vel = 0.3, { cutoff = 1100 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round((dur + 1.2) * SR);
  const voices = [];
  for (const m of midis) for (const d of [-0.07, 0.0, 0.08]) voices.push({ f: mtof(m) * Math.pow(2, d / 12), ph: (m * 0.37 + d * 5) % 1, p: d * 8 });
  const lpL = biquad('lp', cutoff, 0.6), lpR = biquad('lp', cutoff, 0.6);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const env = Math.min(1, tt / 1.1) * (tt > dur ? Math.exp(-(tt - dur) / 0.6) : 1);
    let l = 0, r = 0;
    for (const v of voices) { v.ph = (v.ph + v.f / SR) % 1; const s = 2 * v.ph - 1; l += s * (0.5 - v.p * 0.4); r += s * (0.5 + v.p * 0.4); }
    const g = env * vel * 0.05 / Math.sqrt(voices.length);
    bus.add(i0 + k, lpL(l) * g, lpR(r) * g);
  }
}

export function kick(bus, t, vel = 0.6) {
  const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.4; k++) {
    const tt = k / SR; const f = 48 + 80 * Math.exp(-tt / 0.035);
    ph += 2 * Math.PI * f / SR;
    bus.add(i0 + k, Math.sin(ph) * Math.exp(-tt / 0.22) * vel * 0.55);
  }
}

export function noiseHit(bus, t, { dur = 0.05, vel = 0.3, hp = 6000, bp, q = 1, p = 0, attack = 0.001, seed = 3, tone } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * 4 * SR);
  const r = rng(seed + Math.round(t * 997));
  const f1 = bp ? biquad('bp', bp, q) : biquad('hp', hp, 0.7);
  const [gl, gr] = pan(p);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const env = Math.min(1, tt / attack) * Math.exp(-tt / dur);
    let s = f1(r() * 2 - 1);
    if (tone) s += 0.6 * Math.sin(2 * Math.PI * tone * tt) * Math.exp(-tt / (dur * 0.6));
    bus.add(i0 + k, s * env * vel * gl, s * env * vel * gr);
  }
}

// Ice cube clink: inharmonic glassy partials + click, with a small bounce.
export function ice(bus, t, vel = 0.4, seed = 1) {
  const r = rng(seed * 7 + 11);
  for (const [dt, g] of [[0, 1], [0.065 + r() * 0.03, 0.45]]) {
    const i0 = Math.round((t + dt) * SR);
    const base = 2300 + r() * 900;
    const parts = [1, 1.58, 2.31, 3.07].map((m, j) => ({ f: base * m * (1 + (r() - 0.5) * 0.02), d: 0.12 / (1 + j * 0.6), a: 1 / (1 + j) }));
    const p = (r() - 0.5) * 0.8; const [gl, gr] = pan(p);
    for (let k = 0; k < SR * 0.5; k++) {
      const tt = k / SR; let s = 0;
      for (const q of parts) s += q.a * Math.sin(2 * Math.PI * q.f * tt) * Math.exp(-tt / q.d);
      s *= Math.min(1, tt / 0.0006);
      bus.add(i0 + k, s * vel * g * 0.16 * gl, s * vel * g * 0.16 * gr);
    }
  }
}

// Boba "bloop": a short falling sine with a soft wet tail.
export function bloop(bus, t, vel = 0.4, { f0 = 900, f1 = 320, p = 0 } = {}) {
  const i0 = Math.round(t * SR); let ph = 0; const [gl, gr] = pan(p);
  for (let k = 0; k < SR * 0.18; k++) {
    const tt = k / SR; const f = f1 + (f0 - f1) * Math.exp(-tt / 0.018);
    ph += 2 * Math.PI * f / SR;
    const s = Math.sin(ph) * Math.min(1, tt / 0.002) * Math.exp(-tt / 0.045);
    bus.add(i0 + k, s * vel * 0.3 * gl, s * vel * 0.3 * gr);
  }
}

// Filtered-noise whoosh with a moving band and stereo travel.
export function whoosh(bus, t, dur, vel = 0.3, { f0 = 300, f1 = 3500, p0 = -0.7, p1 = 0.7, seed = 5, q = 1.4 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR);
  const r = rng(seed);
  let bp = biquad('bp', f0, q);
  for (let k = 0; k < len; k++) {
    const u = k / len;
    if (k % 64 === 0) bp = rebp(bp, f0 * Math.pow(f1 / f0, u), q);
    const env = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 1.6;
    const s = bp.f(r() * 2 - 1) * env * vel;
    const [gl, gr] = pan(p0 + (p1 - p0) * u);
    bus.add(i0 + k, s * gl, s * gr);
  }
}
function rebp(old, f, q) {
  // keep filter state continuous while moving the centre frequency
  const st = old.state || { x1: 0, x2: 0, y1: 0, y2: 0 };
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  const b0 = a, b2 = -a, a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  const o = { state: st, f: (x) => { const y = (b0 * x + b2 * st.x2 - a1 * st.y1 - a2 * st.y2) / a0; st.x2 = st.x1; st.x1 = x; st.y2 = st.y1; st.y1 = y; return y; } };
  return o;
}

export function bell(bus, t, midi, vel = 0.3, { p = 0, decay = 1.4 } = {}) {
  const f = mtof(midi), i0 = Math.round(t * SR); const [gl, gr] = pan(p);
  const parts = [[1, 1, 1], [2.0, 0.35, 0.6], [3.01, 0.18, 0.4], [4.2, 0.08, 0.25]];
  for (let k = 0; k < SR * decay * 3; k++) {
    const tt = k / SR; let s = 0;
    for (const [m, a, d] of parts) s += a * Math.sin(2 * Math.PI * f * m * tt) * Math.exp(-tt / (decay * d));
    s *= Math.min(1, tt / 0.002);
    bus.add(i0 + k, s * vel * 0.12 * gl, s * vel * 0.12 * gr);
  }
}

// ---------- room ----------
export function reverb(src, { room = 0.84, damp = 0.35, wet = 1 } = {}) {
  const out = new Bus(src.n / SR);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * SR / 44100));
  const aps = [556, 441, 341, 225].map((x) => Math.round(x * SR / 44100));
  for (const [ch, spread] of [['L', 0], ['R', 23]]) {
    const x = src[ch], y = out[ch];
    const cb = combs.map((d) => ({ b: new Float32Array(d + spread), i: 0, s: 0 }));
    const ab = aps.map((d) => ({ b: new Float32Array(d + spread), i: 0 }));
    for (let n = 0; n < src.n; n++) {
      const inp = x[n] * 0.015; let acc = 0;
      for (const c of cb) { const o = c.b[c.i]; c.s = o * (1 - damp) + c.s * damp; c.b[c.i] = inp + c.s * room; c.i = (c.i + 1) % c.b.length; acc += o; }
      for (const a of ab) { const o = a.b[a.i]; const v = -acc + o; a.b[a.i] = acc + o * 0.5; a.i = (a.i + 1) % a.b.length; acc = v; }
      y[n] = acc * wet;
    }
  }
  return out;
}

export function writeWav(path, bus, { gain = 1 } = {}) {
  const n = bus.n, data = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) { data.writeFloatLE(bus.L[i] * gain, i * 8); data.writeFloatLE(bus.R[i] * gain, i * 8 + 4); }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
}

export function peak(bus) { let m = 0; for (let i = 0; i < bus.n; i++) m = Math.max(m, Math.abs(bus.L[i]), Math.abs(bus.R[i])); return m; }
