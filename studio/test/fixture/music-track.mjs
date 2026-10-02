// Synthetic 16 s test track with known structure: 120 BPM, first beat 0.25 s, 4/4.
// 0–6 s quiet (soft pad + hats), 6–8 s riser (build), 8 s drop into kick/bass/chords (downbeats accented).
import { Bus, pad, kick, bass, noiseHit, writeWav, peak } from '../../lib/audio.mjs';
import { riser } from '../../lib/sfx.mjs';
export const TRACK = { bpm: 120, offset: 0.25, duration: 16, drop: 8.25, quiet: [0.3, 5.8], build: [5.25, 8.25] };
export function writeTestTrack(path) {
  const D = TRACK.duration, beat = 60 / TRACK.bpm, bus = new Bus(D);
  const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]];
  for (let i = 0; TRACK.offset + i * beat < D - 0.1; i++) {
    const t = TRACK.offset + i * beat, bar = Math.floor(i / 4), down = i % 4 === 0, loud = t >= TRACK.drop - 1e-6;
    noiseHit(bus, t, { dur: 0.02, vel: loud ? 0.08 : 0.025, hp: 7000, seed: i });
    noiseHit(bus, t + beat / 2, { dur: 0.02, vel: loud ? 0.05 : 0.015, hp: 7000, seed: i + 500 });
    if (loud) {
      kick(bus, t, down ? 0.95 : 0.45);
      if (down) { bass(bus, t, chords[bar % 4][0] - 24, beat * 3.5, 0.7); pad(bus, t, chords[bar % 4], beat * 4, 1.6, { cutoff: 2200 }); }
    } else if (down) pad(bus, t, chords[bar % 4], beat * 4, 0.35, { cutoff: 900 });
  }
  riser(bus, TRACK.drop, { dur: TRACK.drop - TRACK.build[0], vel: 0.3 });
  writeWav(path, bus, { gain: 0.6 / peak(bus) });
  return TRACK;
}
