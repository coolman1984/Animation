// LIVE 1 score — energetic Western future-bounce / tech-pop at 133⅓ BPM (beat 0.45 s, bar 1.8 s). The grid is locked to the edit:
// bar downbeats at -0.4, 1.4, 3.2, 5.0, 6.8, 8.6, 10.4 — every scene change lands on a downbeat.
// Form: filtered build + snare roll (0–1.4) → DROP 1 with the hook (1.4) → TAPE-STOP on the freeze (3.2), held chord + riser →
// DROP 2 on the unfreeze (5.0) → hook variation + punch accent (6.8) → big final chorus (8.6) → stab + tail (10.4–12).
// Em – C – G – D (vi–IV–I–V in G): supersaw chords pumping under the kick, punchy sub bass, a syncopated 3-3-2 pluck hook.
// Then the dialogue chain from lib/dialogue.mjs: voice polished, the music ducked under it by sidechain compression.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, mtof, noiseHit, bell, reverb, writeWav, peak, biquad, pan } from '../lib/audio.mjs';
import { riser, impact, whooshBy, click } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import { polish, duck, render } from '../lib/dialogue.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'live1'); mkdirSync(OUT, { recursive: true });
const DUR = 12, BEAT = 0.45, BAR = 1.8, S16 = BEAT / 4, T0 = -0.4; // bar k starts at T0 + k·BAR
const bt = (bar, beat = 0) => T0 + bar * BAR + beat * BEAT;
const N = DUR + 2, mk = () => new Bus(N);
const drums = mk(), low = mk(), chords = mk(), lead = mk(), fx = mk();
const kicks = [];

// ---------- voices ----------
function kick909(bus, t, vel = 1) { // punchy kick: pitch drop 160→45 Hz, click, soft saturation
  if (t < 0) return; kicks.push(t); const i0 = Math.round(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.45; k++) { const tt = k / SR, f = 45 + 115 * Math.exp(-tt / 0.03); ph += 2 * Math.PI * f / SR;
    const s = Math.tanh(1.8 * Math.sin(ph) * Math.exp(-tt / 0.28)) * 0.75 + (k < 90 ? Math.sin(k * 0.9) * 0.25 * (1 - k / 90) : 0);
    bus.add(i0 + k, s * vel * 0.6); }
}
const clap = (t, v = 0.5) => { if (t < 0) return; for (let i = 0; i < 4; i++) noiseHit(drums, t + i * 0.008, { dur: i === 3 ? 0.11 : 0.01, vel: v * (i === 3 ? 1 : 0.55), bp: 1400, q: 0.8, seed: 31 + i + Math.round(t * 100) }); };
const hat = (t, v = 0.08, open = false, p = 0.25) => { if (t >= 0) noiseHit(drums, t, { dur: open ? 0.09 : 0.02, vel: v, hp: 8500, p, seed: Math.round(t * 1000) }); };
function saw(bus, t, midis, dur, vel, { cut0 = 6000, cut1 = 900, decay = 0.25, p = 0, detune = 0.16, voices = 5, width = 0.6 } = {}) {
  if (t < -0.05) return; const i0 = Math.round(t * SR), len = Math.round((dur + 0.3) * SR);
  const osc = []; for (const m of midis) for (let v = 0; v < voices; v++) osc.push({ f: mtof(m) * Math.pow(2, ((v - (voices - 1) / 2) * detune) / 12), ph: ((m * 0.137 + v * 0.371) % 1), p: (v / (voices - 1) - 0.5) * 2 * width });
  const st = [{ x1: 0, x2: 0, y1: 0, y2: 0 }, { x1: 0, x2: 0, y1: 0, y2: 0 }]; let co;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    if (k % 32 === 0) { const fc = cut1 + (cut0 - cut1) * Math.exp(-tt / decay), w = 2 * Math.PI * Math.min(fc, SR * 0.45) / SR, c = Math.cos(w), sn = Math.sin(w), a = sn / 1.6; co = [(1 - c) / 2 / (1 + a), (1 - c) / (1 + a), (1 - c) / 2 / (1 + a), -2 * c / (1 + a), (1 - a) / (1 + a)]; }
    let l = 0, r = 0; for (const o of osc) { o.ph = (o.ph + o.f / SR) % 1; const x = 2 * o.ph - 1, [gl, gr] = pan(Math.max(-1, Math.min(1, o.p + p))); l += x * gl; r += x * gr; }
    const env = Math.min(1, tt / 0.004) * (tt > dur ? Math.exp(-(tt - dur) / 0.07) : 1), g = env * vel * 0.3 / Math.sqrt(osc.length);
    const out = [l, r].map((x, ch) => { const S = st[ch], y = co[0] * x + co[1] * S.x1 + co[2] * S.x2 - co[3] * S.y1 - co[4] * S.y2; S.x2 = S.x1; S.x1 = x; S.y2 = S.y1; S.y1 = y; return y; });
    bus.add(i0 + k, out[0] * g, out[1] * g);
  }
}
function sub(bus, t, midi, dur, vel = 0.7) { // sine sub + a touch of 2nd harmonic, saturated
  if (t < 0) return; const i0 = Math.round(t * SR), f = mtof(midi); let ph = 0;
  for (let k = 0; k < (dur + 0.05) * SR; k++) { const tt = k / SR; ph += 2 * Math.PI * f / SR; const env = Math.min(1, tt / 0.005) * (tt > dur ? Math.exp(-(tt - dur) / 0.02) : 1);
    bus.add(i0 + k, Math.tanh(1.6 * (Math.sin(ph) + 0.3 * Math.sin(2 * ph))) * env * vel * 0.45); }
}

// ---------- harmony + hook ----------
const PROG = [ // per bar: chord voicing (MIDI) + bass root
  { v: [64, 67, 71, 76], r: 40 }, { v: [60, 64, 67, 72], r: 36 }, { v: [62, 67, 71, 74], r: 43 }, { v: [62, 66, 69, 74], r: 38 },
];
// syncopated 3-3-2 hook over 16 steps (step, midi, len in steps) — answers itself every other bar
const HOOK_A = [[0, 76, 2], [3, 79, 2], [6, 83, 1], [8, 81, 2], [10, 79, 1], [12, 78, 2], [14, 79, 2]];
const HOOK_B = [[0, 76, 2], [3, 79, 2], [6, 86, 2], [8, 83, 1], [10, 81, 1], [11, 79, 1], [12, 76, 4]];
function grooveBar(bar, { lvl = 1, hook = null, fills = false } = {}) {
  const c = PROG[(bar + 3) % 4], t0 = bt(bar);
  for (let b = 0; b < 4; b++) kick909(drums, bt(bar, b), 0.95 * lvl);
  clap(bt(bar, 1), 0.42 * lvl); clap(bt(bar, 3), 0.42 * lvl);
  for (let st = 0; st < 16; st++) hat(t0 + st * S16, st % 4 === 2 ? 0.11 * lvl : 0.045 * lvl, st % 4 === 2, st % 2 ? 0.35 : -0.35);
  if (fills) for (const st of [13, 14, 15]) noiseHit(drums, t0 + st * S16, { dur: 0.03, vel: 0.18, bp: 1900, q: 0.9, tone: 230, seed: st + bar * 20 });
  // bass: off-beat bounce (rest on the kick, hit the "and") + octave pop on the last 16th
  for (let b = 0; b < 4; b++) sub(low, bt(bar, b + 0.5), c.r, BEAT * 0.42, 0.8 * lvl);
  sub(low, bt(bar, 3.75), c.r + 12, S16 * 0.8, 0.5 * lvl);
  // chords: 8th-note stabs that the sidechain turns into the pump
  for (let e = 0; e < 8; e++) saw(chords, t0 + e * BEAT / 2, c.v, BEAT * 0.42, 0.55 * lvl, { cut0: 5200, cut1: 1400, decay: 0.12, p: 0 });
  if (hook) for (const [st, m, l] of hook) saw(lead, t0 + st * S16, [m, m + 12], l * S16 * 0.85, 0.42 * lvl, { cut0: 8000, cut1: 1800, decay: 0.09, voices: 3, detune: 0.08, width: 0.3 });
}
// bar 0 (−0.4–1.4): filtered build — chords + 16th snare roll + riser, no kick until the drop
{ const c = PROG[3]; for (let e = 1; e < 8; e++) saw(chords, bt(0) + e * BEAT / 2, c.v, BEAT * 0.4, 0.3 + e * 0.04, { cut0: 900 + e * 300, cut1: 500, decay: 0.2 });
  for (let i = 0; i < 12; i++) { const t = 0.05 + i * (1.35 / 12); noiseHit(drums, t, { dur: 0.04, vel: 0.06 + i * 0.022, bp: 1800, q: 0.8, tone: 220, seed: 500 + i }); }
  for (let st = 0; st < 12; st++) hat(0.05 + st * S16, 0.03 + st * 0.004); riser(fx, 1.4, { dur: 1.3, vel: 0.3, f0: 400, f1: 9000, tonal: 0.3 }); }
grooveBar(1, { hook: HOOK_A });                                  // 1.4–3.2  DROP 1 (the walk)
// bar 2 (3.2–5.0): FREEZE = the music stops too — tape-stop + held chord + riser back into drop 2
{ impact(fx, 3.2, { vel: 0.8, weight: 0.8 }); kick909(drums, 3.2, 1);
  const tape = (t, m) => saw(chords, t, m, 0.35, 0.5, { cut0: 3000, cut1: 300, decay: 0.12 });
  tape(3.2, [64, 67, 71]); sub(low, 3.2, 40, 0.3, 0.9);
  saw(chords, 3.45, [64, 71, 76, 79], 1.5, 0.28, { cut0: 1400, cut1: 700, decay: 0.8, voices: 7, width: 0.9 });
  riser(fx, 5.0, { dur: 1.2, vel: 0.32, f0: 300, f1: 10000, tonal: 0.35 });
  for (let i = 0; i < 8; i++) noiseHit(drums, 4.55 + i * S16 / 2, { dur: 0.03, vel: 0.08 + i * 0.03, bp: 1900, q: 0.8, tone: 240, seed: 700 + i }); }
grooveBar(3, { hook: HOOK_B, lvl: 1.05 });                       // 5.0–6.8  DROP 2 (unfreeze, halo)
grooveBar(4, { hook: HOOK_A, fills: true });                     // 6.8–8.6  punch-in on the downbeat
grooveBar(5, { hook: HOOK_B, lvl: 1.1 });                        // 8.6–10.4 final chorus (card + title)
// bar 6 (10.4–12): final stab on the downbeat, then ring-out
{ kick909(drums, 10.4, 1); impact(fx, 10.4, { vel: 0.5, weight: 0.5 }); saw(chords, 10.4, [64, 67, 71, 76, 79], 1.3, 0.5, { cut0: 7000, cut1: 1200, decay: 0.6, voices: 7, width: 0.9 });
  saw(lead, 10.4, [88, 76], 0.9, 0.3, { cut0: 8000, cut1: 2000, decay: 0.3, voices: 3 }); sub(low, 10.4, 40, 1.2, 0.8); }
// sidechain pump: duck chords/bass after every kick (the signature "breathing" of Western dance-pop)
const pump = (bus, depth, rel = 0.16) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(BEAT * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { if (i0 + i < 0) continue; const u = i / (rel * SR), g = 1 - depth * Math.max(0, 1 - u) ** 2; bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
pump(chords, 0.75); pump(low, 0.5, 0.09); pump(lead, 0.25, 0.08);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = a(x[i]); } };
hp(chords, 180); hp(lead, 250);
const bed = mk(); drums.mixInto(bed, 1); low.mixInto(bed, 0.9); chords.mixInto(bed, 0.7); lead.mixInto(bed, 0.75);
const sendB = mk(); chords.mixInto(sendB, 0.35); lead.mixInto(sendB, 0.5); reverb(sendB, { room: 0.78, damp: 0.4 }).mixInto(bed, 0.55);

// edit events
click(fx, 3.2, { vel: 0.5, bright: 0.8 });   // shutter on the freeze (the riser into it is in the build)
bell(fx, 3.47, 88, 0.16, { decay: 0.6 });                                                                  // tag pops
whooshBy(fx, 5.0, { dur: 0.4, vel: 0.2, direction: 'lr' });                                                // unfreeze
whooshBy(fx, 6.8, { dur: 0.3, vel: 0.18, direction: 'rl' });                                               // punch-in hides the jump cut
whooshBy(fx, 8.8, { dur: 0.5, vel: 0.2, direction: 'center', low: 250, high: 2600 });                      // into the card
for (let i = 0; i < 6; i++) bell(fx, 9.0 + i * 0.05, [76, 81, 83, 88, 93, 95][i], 0.07, { p: -0.5 + i * 0.2, decay: 0.5 }); // outline sparkle
bell(fx, 10.0, 81, 0.14, { decay: 1.6 }); bell(fx, 10.0, 88, 0.1, { decay: 1.6 });
placeCues(fx, plan.cues);
for (const b of [bed, fx]) { for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.6 ? (DUR - t) / 0.6 : 1; b.L[i] *= g; b.R[i] *= g; } b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n); }
const nb = 0.45 / Math.max(peak(bed), 1e-9), nf = 0.45 / Math.max(peak(fx), 1e-9);
const bedWav = join(OUT, 'bed.wav'); writeWav(bedWav, bed, { gain: nb }); writeWav(join(OUT, 'sfx.wav'), fx, { gain: nf * 0.8 });
// dialogue: polish the voice, duck the bed under it, then add the SFX → mix
const voice = join(HERE, 'plates', 'pack', 'voice.wav');
const graph = [`[0:a]aresample=${SR},pan=stereo|c0=c0|c1=c0,${polish({ nr: 8 })},volume=2dB,apad=whole_dur=${DUR}[v]`, `[1:a]volume=-5dB[m]`,
  duck({ voice: 'v', music: 'm', out: 'md', threshold: 0.03, ratio: 4, attack: 15, release: 300 }), `[vo][md]amix=inputs=2:duration=longest:normalize=0,atrim=0:${DUR}[mus]`].join(';');
await render({ inputs: [voice, bedWav], graph, map: '[mus]', out: join(OUT, 'music.wav'), extra: ['-c:a', 'pcm_f32le'] });
await render({ inputs: [join(OUT, 'music.wav'), join(OUT, 'sfx.wav')], graph: `[0:a][1:a]amix=inputs=2:duration=first:normalize=0[mix]`, map: '[mix]', out: join(OUT, 'mix.wav'), extra: ['-c:a', 'pcm_f32le'] });
console.log('live1 score: 133 BPM tech-pop bed + sfx, voice polished, music ducked under the voice');
