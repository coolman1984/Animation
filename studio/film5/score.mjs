// Film 5 score — original, 120 BPM (beat 0.5 s, bar 2 s), 12 bars + a 1 s tail = 25.0 s. Written for production.json's cue sheet.
// "Jeel-synth in Hijaz": D hijaz (D Eb F# G A Bb C), synth bass, plucked-string arps, darbuka MAQSUM (dum tak _ tak dum _ tak _ over eighths).
// bar 1 hook (kick + groove, tape spins down at 1.55) · bar 2 the old world (radio low-pass + crackle, oud phrase, filter opens into the drop)
// bar 3 DROP at 4.0 · bar 4 stabs on the type · bar 5 menu: dotted-eighth stabs every 0.375 s · bar 6 half-time café · bar 7 sensory: three hits,
// snare roll · bar 8 montage: a hit on every 1/8 · bar 9 arch impact · bar 10 ping-pong stabs · bar 11 bell-chord resolution · bar 12 held pad, ding at 24.0.
// No samples, no licence needed.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, pluck, bass, pad, kick, noiseHit, bell, reverb, writeWav, peak, biquad, rng, pan, whoosh, bloop } from '../lib/audio.mjs';
import { riser, impact, softHit, click, sweep, whooshBy } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'film5');
mkdirSync(OUT, { recursive: true });
const DUR = 25, BEAT = 0.5, BAR = 2, E8 = 0.25, S16 = 0.125;
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;
const N = DUR + 2;
const mk = () => new Bus(N);
const drums = mk(), low = mk(), pads = mk(), arp = mk(), lead = mk(), fx = mk(), radio = mk(), hook = mk(), crack = mk();
const kicks = [];
const K = (bus, t, v = 0.8) => { kick(bus, t, v); if (bus === drums) kicks.push(t); };

// chords (MIDI): D(b2 colour) · Eb · Gm · A
const CH = {
  D: { v: [50, 54, 57, 62], root: 38, arp: [62, 66, 69, 74, 69, 66, 63, 66] },
  Eb: { v: [51, 55, 58, 63], root: 39, arp: [63, 67, 70, 75, 70, 67, 66, 63] },
  G: { v: [43, 50, 55, 58], root: 43, arp: [62, 67, 70, 74, 70, 67, 63, 62] },
  A: { v: [45, 52, 57, 61], root: 45, arp: [61, 64, 69, 73, 69, 64, 63, 64] },
};
const PROG = ['D', 'D', 'D', 'Eb', 'D', 'G', 'D', 'Eb', 'D', 'A', 'D', 'D'];
const HJ = [62, 63, 66, 67, 69, 70, 72, 74]; // D hijaz, one octave above D4

// maqsum on a bus: [D, T, -, T, D, -, T, -] over eighths; vel scales with `lvl`
const maqsum = (bus, t0, lvl = 1, { kickOn = true, taks = true } = {}) => {
  const P = [['D', 0], ['T', 1], ['T', 3], ['D', 4], ['T', 6]];
  for (const [kind, e] of P) {
    const t = t0 + e * E8;
    if (kind === 'D') { if (kickOn) K(bus, t, 0.72 * lvl); }
    else if (taks) noiseHit(bus, t, { dur: 0.04, vel: 0.2 * lvl, bp: 2600, q: 1.1, tone: 480, p: e === 3 ? 0.25 : -0.2, seed: 50 + e });
  }
};
const hats = (bus, t0, lvl = 1, open = true) => { for (let s = 0; s < 16; s++) noiseHit(bus, t0 + s * S16, { dur: s % 4 === 2 && open ? 0.07 : 0.018, vel: (s % 2 ? 0.02 : 0.035) * lvl, hp: 8500, p: s % 2 ? 0.3 : -0.3, seed: 70 + s }); };
const arpBar = (bus, t0, ch, vel = 0.3, from = 0) => {
  for (let s = from; s < 16; s++) pluck(bus, t0 + s * S16, ch.arp[s % 8] + (s >= 8 ? 12 : 0) - 12 * ((s >> 2) % 2 ? 0 : 0), (s % 4 === 0 ? 1.15 : 0.8) * vel, { p: s % 2 ? 0.4 : -0.4, seed: Math.round(t0 * 10) + s, bright: 0.55, decay: 0.994 });
};
const bassBar = (bus, t0, ch, vel = 0.6, drive = true) => { for (let b = 0; b < 4; b++) bass(bus, t0 + (b + 0.5) * BEAT, ch.root + (b === 3 && drive ? 12 : 0), BEAT * 0.42, vel); bass(bus, t0, ch.root, BEAT * 0.45, vel * 0.9); };

// ---------- bar 1 · hook (0–2): impact, groove, tape spins down from 1.55 ----------
{
  const c = CH.D, t0 = bt(0);
  maqsum(hook, t0, 1.1); K(hook, 1.0, 0.7); K(hook, 1.5, 0.6);
  for (const b of [1, 3]) noiseHit(hook, t0 + b * BEAT, { dur: 0.06, vel: 0.2, bp: 1700, q: 0.9, tone: 200, seed: 33 + b });
  hats(hook, t0, 1.1); arpBar(hook, t0, c, 0.34); bassBar(hook, t0, c, 0.65); pad(hook, t0, c.v, BAR + 0.1, 1.5, { cutoff: 1800 });
  whoosh(fx, 1.5, 0.5, 0.3, { f0: 7000, f1: 160, p0: 0.7, p1: -0.7, seed: 9 });          // tape spins down
  bloop(fx, 1.62, 0.3, { f0: 520, f1: 60 });
}

// ---------- bar 2 · the old world (2–4): radio, oud, crackle; opens into the drop ----------
{
  const t0 = bt(1), c = CH.D;
  maqsum(radio, t0, 0.6, { kickOn: true }); maqsum(radio, t0 + BEAT * 2, 0.55, { kickOn: false });
  const phrase = [[0, 62, 0.5], [0.5, 63, 0.25], [0.75, 66, 0.25], [1.0, 67, 0.5], [1.5, 66, 0.25], [1.75, 63, 0.25], [2.0, 62, 0.5], [2.5, 66, 0.25], [2.75, 67, 0.25], [3.0, 69, 0.75], [3.75, 67, 0.25]];
  for (const [b, m] of phrase) pluck(radio, t0 + b * BEAT, m - 12 * 0 , 0.55, { p: 0, seed: 200 + Math.round(b * 4), bright: 0.3, decay: 0.9965, damp: 0.6 });
  pad(radio, t0, c.v, BAR + 0.2, 1.2, { cutoff: 900 }); bass(radio, t0, 38, BAR * 0.9, 0.35);
  const r = rng(404); for (let i = 0; i < 70; i++) click(crack, 2.0 + r() * 1.9, { vel: 0.025 + r() * 0.05, bright: 0.9, p: r() * 2 - 1, seed: 600 + i });
  riser(fx, 4.0 - 0.01, { dur: 1.0, vel: 0.3, f0: 260, f1: 8000, tonal: 0.25, seed: 12 });
  whooshBy(fx, 3.68, { dur: 0.7, vel: 0.3, direction: 'rl', low: 160, high: 1500, seed: 21 });  // rope occlusion
}

// ---------- bars 3–5 · modern groove (4–10) ----------
for (let bar = 2; bar < 12; bar++) {
  const t0 = bt(bar), c = CH[PROG[bar]];
  const section = bar <= 4 ? 'drop' : bar === 5 ? 'half' : bar === 6 ? 'build' : bar === 7 ? 'mont' : bar === 8 ? 'arch' : bar === 9 ? 'col' : bar === 10 ? 'brand' : 'hold';
  pad(pads, t0, c.v, BAR + 0.25, section === 'hold' ? 2.6 : 2.0, { cutoff: section === 'arch' || section === 'brand' ? 3200 : 1700 });
  const lvl = { drop: 1, half: 0.7, build: 0.9, mont: 1, arch: 1.15, col: 1.05, brand: 0.6, hold: 0.0 }[section];
  if (section === 'hold') { arpBar(arp, t0, c, 0.12, 8); continue; }
  if (section === 'half') {
    K(drums, t0, 0.8); K(drums, t0 + 3 * BEAT, 0.7); noiseHit(drums, t0 + 2 * BEAT, { dur: 0.1, vel: 0.26, bp: 1800, q: 0.8, tone: 200, seed: 77 });
    for (let e = 0; e < 8; e++) noiseHit(drums, t0 + e * E8, { dur: 0.02, vel: 0.03, hp: 9000, seed: 90 + e });
    bass(low, t0, c.root, BAR * 0.95, 0.5);
    const mel = [[0, 69], [0.5, 70], [1, 69], [1.5, 67], [2, 66], [2.5, 67], [3, 63], [3.5, 62]];
    for (const [b, m] of mel) pluck(lead, t0 + b * BEAT, m, 0.42, { p: 0.1, seed: 300 + Math.round(b * 2), bright: 0.35, decay: 0.996 });
    continue;
  }
  maqsum(drums, t0, lvl * (section === 'brand' ? 0.8 : 1), { kickOn: section !== 'brand' || bar === 10 });
  if (section !== 'brand') for (const b of [0, 1, 2, 3]) K(drums, t0 + b * BEAT, 0.62 * lvl); // four on the floor under the maqsum
  for (const b of [1, 3]) noiseHit(drums, t0 + b * BEAT, { dur: 0.07, vel: 0.2 * lvl, bp: 1700, q: 0.9, tone: 200, seed: 40 + b + bar });
  hats(drums, t0, lvl); bassBar(low, t0, c, 0.62 * lvl);
  arpBar(arp, t0, c, section === 'brand' ? 0.22 : 0.34 * lvl);
  if (section === 'drop' || section === 'mont' || section === 'arch' || section === 'col')
    for (const [b, m] of [[0, 74], [0.75, 75], [1.5, 78], [2.5, 79], [3, 78]]) pluck(lead, t0 + b * BEAT, m, 0.42, { p: 0.15, seed: bar * 7 + Math.round(b * 4), bright: 0.6 });
}

// ---------- scene sound design (musical hits, selective) ----------
for (let i = 0; i < 4; i++) bell(lead, 0.06 + i * 0.06, [74, 78, 81, 86][i], 0.16, { p: -0.5 + i * 0.33, decay: 0.8 }); // confetti sparkles
impact(radio, 2.0, { vel: 0.45, weight: 0.4 });                              // the old world starts
for (let i = 0; i < 5; i++) pluck(lead, 4.4 + i * 0.045, [74, 77, 79, 81, 86][i], 0.3, { p: -0.6 + i * 0.3, seed: 400 + i, bright: 0.7 }); // stretchy line lands
impact(fx, 6.0, { vel: 0.55, weight: 0.5 }); whooshBy(fx, 5.85, { dur: 0.35, vel: 0.2, direction: 'lr', seed: 5 }); // paper slam up
for (const t of [7.0]) softHit(fx, t, { vel: 0.4, tone: 196 });
whooshBy(fx, 7.8, { dur: 0.3, vel: 0.22, direction: 'lr', seed: 6 });
// menu: dotted-eighth stabs (0.375 s) on a rising D-hijaz chord stab + card slam
[0, 1, 2, 3, 4].forEach((i) => {
  const t = 8.0 + i * 0.375, root = [50, 51, 54, 55, 57][i];
  impact(fx, t, { vel: i === 0 ? 0.75 : 0.5, weight: 0.45 });
  for (const iv of [0, 7, 12]) pluck(lead, t, root + 12 + iv, 0.5, { p: (i % 2 ? 0.45 : -0.45), seed: 500 + i * 3 + iv, bright: 0.75, decay: 0.993 });
  bell(lead, t + 0.04, root + 36, 0.1, { p: i % 2 ? -0.6 : 0.6, decay: 0.5 });
});
whooshBy(fx, 9.95, { dur: 0.3, vel: 0.2, direction: 'rl', seed: 8 });          // band wipe
softHit(fx, 10.0, { vel: 0.35, tone: 150 }); bloop(fx, 10.55, 0.4, { f0: 900, f1: 300 }); // pin drops
// sensory: three words on beats + snare roll + riser into the montage
for (const [t, tone] of [[12.0, 196], [12.5, 247], [13.0, 294]]) { impact(fx, t, { vel: 0.7, weight: 0.6 }); softHit(fx, t, { vel: 0.35, tone }); }
for (let i = 0; i < 12; i++) { const t = 13.5 + i * (0.5 / 12) * (1 - i * 0.025); noiseHit(drums, t, { dur: 0.05, vel: 0.1 + i * 0.022, bp: 1900, q: 0.8, tone: 220, seed: 800 + i }); }
riser(fx, 14.0 - 0.01, { dur: 0.9, vel: 0.3, f0: 300, f1: 9000, tonal: 0.2, seed: 31 });
// montage: a hit on every 1/8 (alternating kick-click / bell), rising hijaz notes
for (let i = 0; i < 8; i++) { const t = 14.0 + i * E8; if (i % 2 === 0) { K(drums, t, 0.9); click(fx, t, { vel: 0.3, bright: 0.7, p: -0.3, seed: 900 + i }); } else { click(fx, t, { vel: 0.26, bright: 0.9, p: 0.3, seed: 900 + i }); bell(lead, t, HJ[i] + 12, 0.16, { p: 0.5, decay: 0.6 }); } pluck(lead, t + 0.01, HJ[i], 0.5, { p: 0, seed: 950 + i, bright: 0.7 }); }
riser(fx, 16.0 - 0.01, { dur: 0.7, vel: 0.32, f0: 300, f1: 9500, tonal: 0.2, seed: 41 });
pad(pads, 16.0, [50, 57, 62, 66, 69, 74], 2.0, 3.0, { cutoff: 3600 });
[62, 69, 74, 78, 81, 86].forEach((m, i) => bell(lead, 16.04 + i * 0.05, m + 12, 0.2, { p: -0.5 + i * 0.2, decay: 1.6 }));
// collide: ping-pong stabs on 18.0 / 18.5 / 19.0 / 19.5, riser into the brand
[18.0, 18.5, 19.0, 19.5].forEach((t, i) => { const [gl, gr] = pan(i % 2 ? 0.8 : -0.8); impact(fx, t, { vel: 0.55, weight: 0.5, p: i % 2 ? 0.7 : -0.7 }); for (const m of [62, 69, 74]) pluck(lead, t, m + (i % 2 ? 12 : 0), 0.4, { p: i % 2 ? 0.8 : -0.8, seed: 1000 + i * 3 + m, bright: 0.7 }); });
riser(fx, 20.0 - 0.01, { dur: 1.0, vel: 0.32, f0: 260, f1: 9000, tonal: 0.25, seed: 51 });
// brand: resolution (D with the F#), bells, sparkles; held pad; the last ding at 24.0
impact(fx, 20.0, { vel: 0.8, weight: 0.8 });
[50, 57, 62, 66, 69, 74].forEach((m, i) => bell(lead, 20.03 + i * 0.05, m + 12, 0.22, { p: -0.5 + i * 0.2, decay: 2.0 }));
pad(pads, 20.0, [38, 50, 57, 62, 66, 69], 2.5, 3.2, { cutoff: 3000 }); bass(low, 20.0, 26, 2.0, 0.7);
{ const r = rng(77); for (let i = 0; i < 16; i++) bell(lead, 21.4 + r() * 2.2, 86 + Math.floor(r() * 10), 0.05 + r() * 0.05, { p: r() * 2 - 1, decay: 0.5 }); }
pad(pads, 22.0, [38, 45, 50, 54, 57], 2.2, 2.4, { cutoff: 2200 });
bell(lead, 24.0, 86, 0.24, { p: 0, decay: 2.4 }); bell(lead, 24.0, 74, 0.2, { p: -0.2, decay: 2.4 });
placeCues(fx, plan.cues);

// ---------- processing ----------
// time-varying one-pole low-pass over [ta, tb]: cutoff f0 before t0, exponential sweep to f1 at t1, then f1.
const lpSweep = (bus, ta, tb, t0, t1, f0, f1) => {
  for (const ch of ['L', 'R']) {
    const x = bus[ch]; let y = 0;
    for (let i = Math.round(ta * SR); i < Math.min(bus.n, Math.round(tb * SR)); i++) {
      const t = i / SR, u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), f = f0 * Math.pow(f1 / f0, u);
      y += (1 - Math.exp(-2 * Math.PI * f / SR)) * (x[i] - y); x[i] = y;
    }
  }
};
lpSweep(radio, 2.0, 4.3, 2.0, 4.0, 1700, 9000);        // radio opens into the drop
lpSweep(hook, 0, 2.2, 1.55, 2.0, 12000, 260);          // the tape spins down
for (let i = 0; i < hook.n; i++) { const t = i / SR; if (t > 2.0) { hook.L[i] = 0; hook.R[i] = 0; } }
const duck = (bus, depth) => { for (const kk of kicks) { const i0 = Math.round(kk * SR), n = Math.round(0.22 * SR); for (let i = 0; i < n && i0 + i < bus.n; i++) { const g = 1 - depth * Math.exp(-i / (0.07 * SR)); bus.L[i0 + i] *= g; bus.R[i0 + i] *= g; } } };
duck(pads, 0.6); duck(arp, 0.35); duck(low, 0.45);
const hp = (bus, f) => { for (const ch of ['L', 'R']) { const a = biquad('hp', f, 0.7), b = biquad('hp', f, 0.7); const x = bus[ch]; for (let i = 0; i < bus.n; i++) x[i] = b(a(x[i])); } };
hp(pads, 110); hp(arp, 170); hp(lead, 200); hp(fx, 45); hp(radio, 60);
const music = mk();
drums.mixInto(music, 1); low.mixInto(music, 1); pads.mixInto(music, 0.9); arp.mixInto(music, 0.85); lead.mixInto(music, 1);
hook.mixInto(music, 1); radio.mixInto(music, 1.1); crack.mixInto(music, 1);
const send = mk(); pads.mixInto(send, 0.4); arp.mixInto(send, 0.5); lead.mixInto(send, 0.6); radio.mixInto(send, 0.25);
reverb(send, { room: 0.82, damp: 0.4 }).mixInto(music, 0.7);
hp(music, 28);
const sfx = mk(); fx.mixInto(sfx, 1);
const sendF = mk(); fx.mixInto(sendF, 0.5); reverb(sendF, { room: 0.7, damp: 0.3 }).mixInto(sfx, 0.5);
for (const b of [music, sfx]) {
  for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.6 ? Math.cos(((t - (DUR - 0.6)) / 0.6) * Math.PI / 2) : 1; b.L[i] *= g; b.R[i] *= g; }
  b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n);
}
const mix = new Bus(DUR); music.mixInto(mix, 1); sfx.mixInto(mix, 1.2);
const norm = 0.5 / peak(mix);
writeWav(join(OUT, 'music.wav'), music, { gain: norm }); writeWav(join(OUT, 'sfx.wav'), sfx, { gain: norm * 1.2 }); writeWav(join(OUT, 'mix.wav'), mix, { gain: norm });
console.log(`film5 score: ${DUR}s, norm ${norm.toFixed(3)}`);
