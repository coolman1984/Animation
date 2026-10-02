// Film 6 score — original, 120 BPM (beat 0.5 s, bar 2 s), 10 bars = 20.0 s, A minor with a Phrygian (Bb) turn.
// House groove like the reference's energy (kick on every beat, claps on 2 & 4, off-beat bass and hats, Rhodes
// stabs), but our own progression, arrangement and sound design. Sections follow production.json:
// bar 1 filtered hook opening · 3.0 blue drop · services/result groove · whip ticks · board checks · 12.0 stamp ·
// 13.0 dark breakdown (Bb → E) · riser into the 16.0 brand drop · final A chord at 19.0, ring-out.
// Optional voiceover: film6/voice/<id>.mp3 placed at script.json times; the music ducks under it.
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, pluck, bass, pad, kick, noiseHit, bell, rhodes, reverb, writeWav, peak, biquad, whoosh, bloop } from '../lib/audio.mjs';
import { riser, impact, softHit, click, sweep, whooshBy, uiConfirm } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film6');
mkdirSync(OUT, { recursive: true });
const DUR = 20, BEAT = 0.5, BAR = 2, S16 = 0.125;
const N = DUR + 2, mk = () => new Bus(N);
const drums = mk(), low = mk(), keys = mk(), pads = mk(), lead = mk(), fx = mk(), vo = mk();
const kicks = [];

const CH = {
  Am: { root: 45, v: [57, 60, 64, 67, 71] },   // Am9
  F: { root: 41, v: [53, 57, 60, 64] },        // Fmaj7
  Dm: { root: 38, v: [53, 57, 60, 64] },       // Dm9 (no root in the voicing)
  E: { root: 40, v: [56, 59, 62, 65] },        // E7(b9)
  Bb: { root: 46, v: [53, 58, 62, 65] },       // Bbmaj7 — the Phrygian turn in the dark
};
const PROG = ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'Dm', 'Bb', 'Am', 'F'];

// ---------- groove ----------
for (let bar = 0; bar < 10; bar++) {
  const t0 = bar * BAR, c = CH[PROG[bar]];
  const dark = t0 >= 12 && t0 < 16, brand = t0 >= 16;
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    if (tb >= 19.0) break;
    const breakdown = tb >= 13.0 && tb < 16.0;
    if (!breakdown) { kick(drums, tb, b === 0 ? 0.85 : 0.75); kicks.push(tb); }
    if (b % 2 === 1) noiseHit(drums, tb, { dur: 0.09, vel: breakdown ? 0.12 : 0.24, bp: 1500, q: 0.8, tone: 210, p: 0.1, seed: 40 + bar * 4 + b });  // clap
    noiseHit(drums, tb + 0.25, { dur: 0.08, vel: breakdown ? 0.03 : 0.07, hp: 7500, p: 0.35, seed: 90 + bar * 4 + b });                         // open hat
    for (let s = 0; s < 4; s++) if (!breakdown && s !== 2) noiseHit(drums, tb + s * S16, { dur: 0.015, vel: s % 2 ? 0.022 : 0.03, hp: 9500, p: -0.4, seed: 300 + bar * 16 + b * 4 + s }); // shaker
    if (!breakdown) { bass(low, tb + 0.25, c.root - 12 + 12, BEAT * 0.38, 0.62); if (b === 0) bass(low, tb, c.root - 12 + 12, BEAT * 0.22, 0.45); }
  }
  // Rhodes stabs on syncopated 16ths; held chord in the breakdown
  if (dark) {
    pad(pads, 13.0, CH.Bb.v, 1.5, 1.6, { cutoff: 1400 }); pad(pads, 14.5, CH.E.v, 1.5, 1.7, { cutoff: 1600 });
    rhodes(keys, 13.0, CH.Bb.root - 12, 1.4, 0.35); rhodes(keys, 14.5, CH.E.root, 1.4, 0.35);
    for (const m of CH.Bb.v) rhodes(keys, 13.02, m, 1.3, 0.16, { p: (m % 5) / 5 - 0.4 });
    for (const m of CH.E.v) rhodes(keys, 14.52, m, 1.3, 0.16, { p: (m % 5) / 5 - 0.4 });
    if (t0 === 12) for (const st of [3, 6, 10]) for (const m of CH.Dm.v) rhodes(keys, t0 + st * S16, m, 0.2, 0.2, { p: (m % 3) / 3 - 0.3 });
    continue;
  }
  for (const st of [3, 6, 10, 14]) { const ts = t0 + st * S16; if (ts >= 19.0) break; for (const m of c.v) rhodes(keys, ts, m, 0.22, 0.2, { p: (m % 3) / 3 - 0.3, trem: 0.1 }); }
  pad(pads, t0, c.v, BAR + 0.2, brand ? 1.4 : 1.0, { cutoff: brand ? 2600 : 1600 });
}
// final A chord at 19.0, ringing out
kick(drums, 19.0, 0.8); bass(low, 19.0, 33, 0.9, 0.7);
for (const m of [57, 60, 64, 67, 71, 76]) rhodes(keys, 19.0, m, 1.0, 0.24, { p: (m % 4) / 4 - 0.35 });
pad(pads, 19.0, [45, 52, 57, 60, 64, 71], 1.0, 1.6, { cutoff: 2200 });

// lead motif (A minor pentatonic) on the hook and the brand
const motif = [[0, 76], [0.75, 74], [1.5, 72], [2.0, 69], [2.5, 72], [3.0, 74]];
for (const [b, m] of motif) pluck(lead, 0.0 + b * BEAT, m, 0.42, { p: 0.2, seed: 500 + b * 4, bright: 0.55, decay: 0.995 });
for (const [b, m] of motif) pluck(lead, 16.0 + b * BEAT, m + 12 - 12, 0.4, { p: -0.2, seed: 600 + b * 4, bright: 0.6, decay: 0.995 });
[57, 64, 69, 72, 76].forEach((m, i) => bell(lead, 16.02 + i * 0.045, m + 12, 0.18, { p: -0.5 + i * 0.25, decay: 1.8 }));

// ---------- sound design (only the events that matter) ----------
sweep(fx, 1.6, { dur: 0.35, vel: 0.07, up: true });                                    // the accent word is written
bloop(fx, 2.62, 0.32, { f0: 880, f1: 330 });                                          // the dot appears
riser(fx, 2.72, { dur: 0.3, vel: 0.16, f0: 400, f1: 6000, tonal: 0.3, seed: 31 });     // dot grows
softHit(fx, 3.02, { vel: 0.35, tone: 110 });                                          // blue lands
[3.55, 3.8, 4.05].forEach((t, i) => bloop(fx, t, 0.16, { f0: 1100 + i * 180, f1: 620 + i * 90, p: 0.4 - i * 0.4 }));
whooshBy(fx, 5.68, { dur: 0.5, vel: 0.3, direction: 'lr', low: 200, high: 2400, seed: 33 }); // the push
uiConfirm(fx, 8.0, { vel: 0.17, notes: [88, 95] });                                    // heart on the reel
[9.0, 9.25, 9.5].forEach((t, i) => whooshBy(fx, t - 0.03, { dur: 0.24, vel: 0.24, direction: i % 2 ? 'rl' : 'lr', low: 300, high: 3200, seed: 40 + i }));
click(fx, 9.85, { vel: 0.5, bright: 0.7 });
sweep(fx, 9.88, { dur: 0.22, vel: 0.1, up: true });
for (let i = 0; i < 6; i++) click(fx, 10.0 + i * 0.09, { vel: 0.08, bright: 0.4, p: i % 2 ? 0.4 : -0.4, seed: 70 + i });
[10.55, 11.1, 11.8].forEach(t => uiConfirm(fx, t, { vel: 0.16, notes: [84, 91] }));
[10.75, 11.0, 11.25].forEach((t, i) => click(fx, t, { vel: 0.13, bright: 0.8, p: -0.3 + i * 0.3, seed: 80 + i }));
sweep(fx, 11.75, { dur: 0.25, vel: 0.08, up: true });
whoosh(fx, 12.68, 0.42, 0.22, { f0: 2400, f1: 140, p0: 0, p1: 0, seed: 12 });          // the iris closes
riser(fx, 15.0, { dur: 1.0, vel: 0.22, f0: 300, f1: 9000, tonal: 0.35, seed: 51 });   // into the bloom
impact(fx, 16.0, { vel: 0.5, weight: 0.45 });
bloop(fx, 17.45, 0.18, { f0: 900, f1: 500 });                                         // CTA pill
click(fx, 18.45, { vel: 0.45, bright: 0.7 });
placeCues(fx, plan.cues);

// ---------- voiceover (optional) ----------
const script = JSON.parse(readFileSync(join(HERE, 'voice/script.json'), 'utf8'));
let voLines = 0;
for (const line of script.lines) {
  const file = join(HERE, 'voice', `${line.id}.mp3`);
  if (!existsSync(file)) continue;
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-af', 'highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80', '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const i0 = Math.round(line.t * SR), iEnd = Math.round(line.end * SR);
  for (let i = 0; i < x.length && i0 + i < Math.min(vo.n, iEnd + SR * 0.15); i++) vo.add(i0 + i, x[i] * 0.95, x[i] * 0.95);
  voLines++;
}
console.log(`film6 score: voiceover lines placed ${voLines}/${script.lines.length}${voLines ? '' : ' (no voice files — music + SFX only)'}`);

// ---------- processing ----------
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
// time-varying one-pole low-pass: cutoff(t) in Hz
const lpCurve = (bus, cutoff, ta, tb) => { for (const ch of ['L', 'R']) { const x = bus[ch]; let y = 0; for (let i = Math.round(ta * SR); i < Math.min(bus.n, Math.round(tb * SR)); i++) { y += (1 - Math.exp(-2 * Math.PI * cutoff(i / SR) / SR)) * (x[i] - y); x[i] = y; } } };
const sidechain = (bus, depth) => { for (const k of kicks) { const i0 = Math.round(k * SR), n = Math.round(0.24 * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const g = 1 - depth * Math.exp(-i / (0.08 * SR)); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
sidechain(pads, 0.55); sidechain(keys, 0.3); sidechain(low, 0.5);
hp(pads, 120); hp(keys, 140); hp(lead, 220); hp(fx, 45); hp(drums, 30);
const music = mk();
drums.mixInto(music, 1); low.mixInto(music, 0.95); keys.mixInto(music, 0.8); pads.mixInto(music, 0.7); lead.mixInto(music, 0.8);
const send = mk(); keys.mixInto(send, 0.35); pads.mixInto(send, 0.3); lead.mixInto(send, 0.5);
reverb(send, { room: 0.8, damp: 0.4 }).mixInto(music, 0.55);
// hook opens from a filtered intro; the dark breakdown is filtered and opens into the 16.0 drop
const lerpE = (a, b, u) => a * Math.pow(b / a, Math.min(1, Math.max(0, u)));
lpCurve(music, t => t < 3.0 ? lerpE(700, 16000, (t - 0.2) / 2.8) : t < 13.0 ? 16000 : t < 16.0 ? lerpE(1100, 16000, (t - 14.6) / 1.4) : 16000, 0, 16.2);
// music ducks under the voice (envelope follower on the VO bus)
if (voLines) {
  let env = 0; const att = Math.exp(-1 / (0.02 * SR)), rel = Math.exp(-1 / (0.25 * SR));
  for (let i = 0; i < music.n; i++) { const a = Math.abs(vo.L[i]); env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a; const g = 1 - 0.55 * Math.min(1, env * 9); music.L[i] *= g; music.R[i] *= g; }
}
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.4); reverb(sendF, { room: 0.65, damp: 0.3 }).mixInto(sfx, 0.45);
vo.mixInto(sfx, 1.6);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.5 ? Math.cos(((t - (DUR - 0.5)) / 0.5) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1.1);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 1.1 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film6 score: ${DUR}s, norm ${norm.toFixed(3)}`);
