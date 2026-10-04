// Studio Engine — score engine (Node). One function turns a spec into music.wav / sfx.wav / mix.wav:
// the groove is arranged from each scene's `music` section label on the shared beat clock, and every picture event
// (events.js) gets its sound automatically. Voices are the film-11 synth voices (original synthesis, no samples).
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SR, Bus, mtof, rhodes, pluck, bell, noiseHit, reverb, writeWav, peak, biquad, pan } from '../../lib/audio.mjs';
import { riser, impact, softHit, click, uiConfirm, whooshBy, sweep } from '../../lib/sfx.mjs';
import { timeline, eventsOf } from './events.js';

const CHORDS = { Am: { v: [57, 60, 64, 69], r: 33 }, F: { v: [53, 57, 60, 65], r: 29 }, C: { v: [55, 60, 64, 67], r: 36 }, G: { v: [55, 59, 62, 67], r: 31 },
  Dm: { v: [57, 62, 65, 69], r: 38 }, Em: { v: [55, 59, 64, 67], r: 40 }, E: { v: [56, 59, 64, 68], r: 40 }, D: { v: [54, 57, 62, 66], r: 38 }, Bb: { v: [53, 58, 62, 65], r: 34 } };
// hooks: [8th position, interval above the chord's top-voice octave anchor (midi), length in 8ths] — 'pop332' is film 11's hook
const HOOKS = {
  pop332: { Am: [[0, 76, 1.5], [1.5, 76, 1.5], [3, 79, 1], [4, 81, 1.5], [5.5, 79, 1], [6.5, 76, 1.5]], F: [[0, 77, 1.5], [1.5, 77, 1.5], [3, 76, 1], [4, 72, 2], [6, 74, 2]],
    C: [[0, 76, 1.5], [1.5, 76, 1.5], [3, 79, 1], [4, 84, 1.5], [5.5, 83, 1], [6.5, 79, 1.5]], G: [[0, 79, 1.5], [1.5, 79, 1.5], [3, 81, 1], [4, 83, 2], [6, 86, 1], [7, 83, 1]] },
};
// a hook for any chord: arpeggiated 3-3-2 over the chord tones (used when the named hook has no line for that chord)
const autoHook = (c) => { const v = c.v.map((m) => m + 12); return [[0, v[2], 1.5], [1.5, v[2], 1.5], [3, v[3], 1], [4, v[3] + 2, 1.5], [5.5, v[3], 1], [6.5, v[2], 1.5]]; };

export function renderScore(spec, outDir, { log = console.log, music: musicPCM = null, voice: voicePCM = null } = {}) {
  const tl = timeline(spec), BEAT = tl.B, BAR = BEAT * 4, E8 = BEAT / 2, S16 = BEAT / 4, DUR = tl.duration, N = DUR + 2, b = (n) => n * BEAT;
  const mk = () => new Bus(N);
  const drums = mk(), low = mk(), pads = mk(), keys = mk(), arp = mk(), lead = mk(), fx = mk(), kicks = [];


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

  const M = spec.music || {}, prog = M.progression || ['Am', 'F', 'C', 'G'], HK = HOOKS[M.hook || 'pop332'] || {};
  const totalBars = Math.ceil(tl.beats / 4), chordAt = (bar) => (M.final && bar >= totalBars - 1 ? M.final : prog[bar % prog.length]);
  const secAt = (k) => { const s = tl.scenes.find((q) => k >= q.a0 && k < q.b0); return s?.music || 'verse'; };
  const BIG = new Set(['drop', 'chorus', 'drop2', 'finale']);
  const lastBeat = tl.beats - (M.tailBeats ?? 2);
  const synth = M.mode !== 'sfx' && !musicPCM;
  if (synth) for (let k = 0; k < lastBeat; k++) {
    const t = b(k), bar = Math.floor(k / 4), beat = k % 4, name = chordAt(bar), c = CHORDS[name] || CHORDS.Am, S = secAt(k);
    const s0 = tl.scenes.find((q) => k >= q.a0 && k < q.b0), kin = k - s0.a0, big = BIG.has(S), lift = S === 'drop2' || S === 'finale' ? 1.15 : 1, quiet = S === 'breath';
    if (quiet) continue;
    const kOn = S === 'intro' ? kin >= 4 : S === 'build' ? kin < s0.beats - 2 : true;
    if (kOn) kick909(t, (big ? 0.95 : S === 'hosts' ? 0.8 : 0.85) * lift);
    if (S === 'build' && kin >= s0.beats - 4 && kin < s0.beats - 2) kick909(t + E8, 0.6);
    if ((beat === 1 || beat === 3) && S !== 'intro' && S !== 'build') clap(t, (big ? 0.42 : 0.34) * lift);
    if (S !== 'intro') hat(t + E8, (big ? 0.085 : 0.065) * lift, true, 0.3);
    if (S === 'intro' || (S === 'verse' && kin >= s0.beats / 2) || S === 'build' || big) { hat(t + S16, 0.028, false, 0.4); hat(t + E8 + S16, 0.028, false, -0.4); }
    if (k % 2 === 1 && S !== 'intro') shaker(t + S16 * 3, 0.03);
    if (S !== 'intro') { sub(t + E8, c.r + 12, E8 * 0.8, 0.7 * lift); if (big && beat % 2 === 0) sub(t, c.r, E8 * 0.7, 0.45); if (beat === 3) sub(t + E8 + S16, c.r + 19, S16 * 0.8, 0.35); }
    if (beat === 0) { const open = S === 'intro' ? 900 + 2400 * kin / s0.beats : S === 'build' ? 1800 + 3600 * kin / s0.beats : big ? 4200 : 2600;
      saw(pads, t, c.v, BAR * 0.98, (big ? 0.32 : 0.24) * lift, { cut0: open, cut1: 700, decay: 0.8, voices: 5, width: 0.7 }); }
    if ((big || S === 'verse' || S === 'hosts') && (beat === 1 || beat === 3)) saw(keys, t + E8, c.v.map((m) => m + 12), E8 * 0.6, (big ? 0.2 : 0.14) * lift, { cut0: 6000, cut1: 1500, decay: 0.08, voices: 3, detune: 0.1 });
    if (S === 'verse' || S === 'build' || S === 'hosts' || S === 'intro') for (let e = 0; e < 4; e++) pluck(arp, t + e * S16, c.v[(k * 4 + e) % 4] + 12 + (e === 3 ? 12 : 0), (S === 'intro' ? 0.1 + 0.1 * kin / s0.beats : 0.13), { p: e % 2 ? 0.45 : -0.45, damp: 0.6, decay: 0.993, bright: 0.75, seed: 3 + k * 4 + e });
    if (beat === 0) {
      const notes = HK[name] || autoHook(c);
      if (big) for (const [e, m, len] of notes) { rhodes(lead, t + e * E8, m, len * E8 * 0.9, 0.36 * lift, { p: 0.12, trem: 0.04 }); saw(lead, t + e * E8, [m, m + 12], len * E8 * 0.8, 0.22 * lift, { cut0: 7500, cut1: 2000, decay: 0.14, voices: 3, detune: 0.09, width: 0.35 }); if (lift > 1) pluck(lead, t + e * E8, m + 12, 0.16, { p: -0.2, bright: 0.9, seed: 50 + e }); }
      else if (S === 'hosts') for (const [e, m] of notes) bell(lead, t + e * E8, m + 12, 0.12, { decay: 0.9, p: e < 4 ? -0.4 : 0.4 });
      else if (S === 'verse' && bar % 4 >= 2) for (const [e, m] of notes) pluck(lead, t + e * E8, m, 0.17, { p: 0.2, bright: 0.8, decay: 0.996, seed: 70 + e });
      else if (S === 'intro' && kin >= 4) for (const [e, m] of notes) pluck(lead, t + e * E8, m, 0.12, { p: 0.1, bright: 0.4, seed: 80 + e });
    }
  }
  // builds into every drop scene, the build section's snare 4 → 8 → 16 → 32
  for (const s of tl.scenes) {
    if (s.drop && s.a > 0) { riser(fx, s.a, { dur: Math.min(b(4), s.a), vel: 0.34, f0: 240, f1: 10000, tonal: 0.35, seed: 2 + s.index, tail: 0.002 }); for (let i = 0; i < 16; i++) noiseHit(drums, s.a - b(2) + i * b(2) / 16, { dur: 0.04, vel: 0.05 + i * 0.022, bp: 1900, q: 0.8, tone: 240, seed: 600 + 20 * s.index + i }); }
    if (s.music === 'build') { let n = 0; for (let kk = 0; kk < s.beats; kk++) { const q = kk / s.beats, per = q < 0.25 ? 1 : q < 0.5 ? 2 : q < 0.75 ? 4 : 8; for (let j = 0; j < per; j++) noiseHit(drums, s.a + kk * BEAT + j * BEAT / per, { dur: 0.045, vel: 0.06 + 0.2 * q, bp: 1800 + 960 * q, q: 0.8, tone: 220 + 80 * q, seed: 800 + 50 * s.index + n++ }); } }
  }
  // every picture event → its sound
  let seed = 0;
  for (const e of eventsOf(spec)) { const t = e.t, a = e.amp, sd = 1000 + seed++;
    switch (e.kind) {
      case 'slam': impact(fx, t, { vel: 0.45 + 0.1 * a, weight: 0.55 }); whooshBy(fx, t - 0.06, { dur: 0.3, vel: 0.14, direction: sd % 2 ? 'rl' : 'lr', low: 300, high: 4200, seed: sd }); break;
      case 'impact': impact(fx, t, { vel: Math.min(1, 0.6 * a), weight: 0.9 }); sub(t, 33, BEAT * 2, 0.8); [0, 1, 2, 3, 4].forEach((i) => bell(fx, t + 0.03 + i * 0.05, [76, 81, 84, 88, 93][i], 0.12, { decay: 1.2, p: -0.5 + i * 0.25 })); break;
      case 'flash': impact(fx, t, { vel: 1.0, weight: 0.95 }); noiseHit(fx, t, { dur: 0.9, vel: 0.25, hp: 5000, seed: sd, attack: 0.01 }); break;
      case 'smash': impact(fx, t, { vel: 1.0, weight: 1.0 }); sub(t, 33, BEAT * 4, 1.0); noiseHit(fx, t, { dur: 1.6, vel: 0.3, hp: 4500, seed: sd, attack: 0.01 }); for (let i = 0; i < 28; i++) bell(fx, t + 0.05 + i * 0.045, [88, 91, 93, 96, 100][i % 5], 0.05, { decay: 0.6, p: (i % 7) / 3.5 - 0.9 }); break;
      case 'spin': whooshBy(fx, t, { dur: 0.5, vel: 0.3, direction: 'rl', low: 300, high: 6000, seed: sd }); glide(fx, t, 0.55, 300, 1500, 0.1, 0.2); break;
      case 'implode': whooshBy(fx, t + 0.2, { dur: 0.8, vel: 0.35, direction: 'center', low: 200, high: 1500, seed: sd }); break;
      case 'glitch': for (let i = 0; i < 9; i++) noiseHit(fx, t + i * 0.04, { dur: 0.02, vel: 0.12, hp: 3000 + 500 * i, seed: sd * 10 + i }); break;
      case 'slash': whooshBy(fx, t - 0.12, { dur: 0.22, vel: 0.5, direction: 'lr', low: 600, high: 9000, seed: sd }); impact(fx, t, { vel: 0.85, weight: 0.7 }); break;
      case 'land': softHit(fx, t, { vel: 0.35, tone: 70 }); softHit(fx, t + 0.12, { vel: 0.3, tone: 62 }); break;
      case 'flip': { const f = 620 * a; whooshBy(fx, t - 0.3, { dur: 0.35, vel: 0.2, direction: 'center', low: 400, high: 5000, seed: sd }); impact(fx, t, { vel: 0.42, weight: 0.3 }); for (let r = 0; r < 4; r++) click(fx, t - 0.25 + r * 0.05, { vel: 0.13, bright: 0.5 + 0.1 * r, seed: sd * 5 + r }); tone(fx, t + 0.5, f * 1.5, f * 1.5, { dur: 0.12, vel: 0.2 }); bell(fx, t + 0.62, Math.round(79 + 10 * (a - 0.8)), 0.14, { decay: 0.8, p: 0.3 }); break; }
      case 'whirl': glide(fx, t, 2.0, 200, 1200, 0.12, 0); sweep(fx, t + 0.6, { dur: 1.6, vel: 0.15, up: true, seed: sd }); for (let i = 0; i < 6; i++) { bell(fx, t + 0.1 + i * 0.1, 84 + i * 2, 0.12, { decay: 0.9, p: -0.6 + i * 0.24 }); click(fx, t + 0.1 + i * 0.1, { vel: 0.2, bright: 0.8 }); } for (let i = 0; i < 14; i++) whooshBy(fx, t + 0.8 + i * 0.2, { dur: 0.22, vel: 0.07, direction: i % 2 ? 'lr' : 'rl', low: 500, high: 5000, seed: sd * 3 + i }); break;
      case 'push': sweep(fx, t, { dur: 1.2, vel: 0.18, up: true, seed: sd }); break;
      case 'wipe': whooshBy(fx, t - 0.12, { dur: 0.3, vel: 0.35, direction: 'rl', low: 300, high: 8000, seed: sd }); impact(fx, t, { vel: 0.8, weight: 0.6 }); bell(fx, t + 0.02, 81 + (sd % 3) * 4, 0.16, { decay: 1.0 }); break;
      case 'confirm': tone(fx, t, 800, 1400, { dur: 0.1, vel: 0.28 }); uiConfirm(fx, t + 0.05, { vel: 0.22, notes: [84, 91, 96], gap: 0.06 }); break;
      case 'line': glide(fx, t, 0.5, 400, 1600, 0.12, 0); sweep(fx, t, { dur: 0.6, vel: 0.12, up: true, seed: sd }); break;
      case 'tick': for (let i = 0; i < 6; i++) click(fx, t + i * 0.09, { vel: 0.12, bright: 0.9, p: i % 2 ? 0.5 : -0.5, seed: sd * 7 + i }); break;
      case 'sparks': for (let i = 0; i < 10; i++) bell(fx, t + i * 0.06, [84, 88, 91, 96][i % 4], 0.05, { decay: 0.6, p: -0.8 + i * 0.17 }); break;
      default: break;
    } }
  // final chord under the hold
  if (synth) { const tf = b(lastBeat), c = CHORDS[M.final || prog[0]] || CHORDS.C;
    saw(pads, tf, [c.r + 12, ...c.v, c.v[0] + 12], b(4), 0.38, { cut0: 3600, cut1: 1100, decay: 1.2, voices: 6, width: 0.8 });
    c.v.concat(c.v.map((m) => m + 12)).slice(0, 6).forEach((m, i) => bell(fx, tf + 0.02 + i * 0.07, m + 12, 0.12, { decay: 2.4, p: -0.5 + i * 0.2 }));
    impact(fx, tf, { vel: 0.7, weight: 0.8 }); sub(tf, c.r, BEAT * 3.5, 0.9); }
  // mix
  const pump = (bus, depth, rel = 0.18) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
  pump(pads, 0.6); pump(low, 0.5, 0.1); pump(keys, 0.4, 0.1); pump(arp, 0.3, 0.1); pump(lead, 0.2, 0.08);
  const cutB = (bus, t0, t1) => { for (let i = Math.max(0, Math.round(t0 * SR)); i < Math.round(t1 * SR); i++) { bus.L[i] = 0; bus.R[i] = 0; } };
  for (const s of tl.scenes) if (s.drop && s.a > 0) for (const bus of [drums, low, pads, keys, arp, lead]) cutB(bus, s.a - 0.18, s.a);    // a breath before each drop
  const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
  hp(pads, 150); hp(arp, 200); hp(lead, 220); hp(keys, 160); hp(fx, 40);
  const music = mk(); drums.mixInto(music, 1); low.mixInto(music, 0.75); pads.mixInto(music, 1.25); keys.mixInto(music, 1.3); arp.mixInto(music, 1.35); lead.mixInto(music, 1.2);
  const send = mk(); pads.mixInto(send, 0.4); keys.mixInto(send, 0.55); arp.mixInto(send, 0.5); lead.mixInto(send, 0.6);
  reverb(send, { room: 0.86, damp: 0.4 }).mixInto(music, 0.75); hp(music, 28);
  if (musicPCM) for (let i = 0; i < Math.min(music.n, musicPCM.n); i++) { music.L[i] += musicPCM.L[i] * 0.9; music.R[i] += musicPCM.R[i] * 0.9; }
  if (voicePCM) { // narration on top; the music ducks under it (follow the voice envelope, 6 dB)
    let env = 0; const a = Math.exp(-1 / (0.01 * SR)), r = Math.exp(-1 / (0.25 * SR));
    for (let i = 0; i < Math.min(music.n, voicePCM.n); i++) { const v = Math.abs(voicePCM.L[i]) + Math.abs(voicePCM.R[i]); env = v > env ? a * env + (1 - a) * v : r * env + (1 - r) * v; const g = 1 - 0.5 * Math.min(1, env * 8); music.L[i] *= g; music.R[i] *= g; }
  }
  const sfx = mk(); fx.mixInto(sfx, 1);
  for (const bb of [music, sfx]) { for (let i = 0; i < bb.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.6 ? Math.cos(((t - (DUR - 0.6)) / 0.6) * Math.PI / 2) : 1; bb.L[i] *= g; bb.R[i] *= g; } bb.n = Math.round(DUR * SR); bb.L = bb.L.subarray(0, bb.n); bb.R = bb.R.subarray(0, bb.n); }
  const mix = new Bus(DUR); music.mixInto(mix, M.mode === 'sfx' && !musicPCM ? 0 : 1); sfx.mixInto(mix, 0.9);
  if (voicePCM) for (let i = 0; i < Math.min(mix.n, voicePCM.n); i++) { mix.L[i] += voicePCM.L[i] * 1.6; mix.R[i] += voicePCM.R[i] * 1.6; }
  { const p0 = peak(mix), kk = 2.6; for (let i = 0; i < mix.n; i++) { mix.L[i] = Math.tanh(kk * mix.L[i] / p0) / Math.tanh(kk) * p0; mix.R[i] = Math.tanh(kk * mix.R[i] / p0) / Math.tanh(kk) * p0; } }
  const norm = 0.5 / peak(mix);
  mkdirSync(outDir, { recursive: true });
  writeWav(join(outDir, 'music.wav'), music, { gain: norm }); writeWav(join(outDir, 'sfx.wav'), sfx, { gain: norm * 0.9 }); writeWav(join(outDir, 'mix.wav'), mix, { gain: norm });
  log(`score: ${DUR.toFixed(2)} s, ${tl.bpm} BPM, ${eventsOf(spec).length} sounded events`);
}
