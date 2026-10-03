// LIVE 1 score — a soft 120 BPM bed + edit-event SFX synthesised here, then the dialogue chain from lib/dialogue.mjs:
// voice polished (high-pass, spectral denoise, de-ess, compressor) and the bed ducked under it by sidechain compression.
// Outputs takes/live1/{music.wav (voice + ducked bed), sfx.wav, mix.wav} like every studio score.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, Bus, bass, pad, kick, noiseHit, bell, reverb, writeWav, peak, pluck } from '../lib/audio.mjs';
import { riser, impact, softHit, whooshBy, click } from '../lib/sfx.mjs';
import { placeCues } from '../lib/cues.mjs';
import { polish, duck, render } from '../lib/dialogue.mjs';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'takes', 'live1'); mkdirSync(OUT, { recursive: true });
const DUR = 12, BEAT = 0.5, S16 = 0.125;
const bed = new Bus(DUR + 2), fx = new Bus(DUR + 2);
const CH = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 56, 59, 64]], ROOT = [45, 41, 43, 40];
for (let bar = 0; bar < 6; bar++) {
  const t0 = bar * 2, c = CH[bar % 4];
  pad(bed, t0, c, 2.1, 1.4, { cutoff: 1800 });
  for (let b = 0; b < 4; b++) { if (bar !== 1 || b < 2) kick(bed, t0 + b * BEAT, 0.5); noiseHit(bed, t0 + b * BEAT + 0.25, { dur: 0.03, vel: 0.04, hp: 8000, seed: bar * 4 + b }); }
  for (let st = 0; st < 16; st++) if (st % 3 === 0) pluck(bed, t0 + st * S16, c[st % 4] + 12, 0.18, { p: st % 2 ? 0.4 : -0.4, seed: bar * 16 + st, bright: 0.5 });
  bass(bed, t0, ROOT[bar % 4] - 12, 1.8, 0.4);
}
// edit events
riser(fx, 3.2, { dur: 0.8, vel: 0.28, f0: 300, f1: 7000 }); click(fx, 3.2, { vel: 0.5, bright: 0.8 });   // shutter + freeze
bell(fx, 3.47, 88, 0.16, { decay: 0.6 });                                                                  // tag pops
whooshBy(fx, 5.0, { dur: 0.4, vel: 0.2, direction: 'lr' });                                                // unfreeze
whooshBy(fx, 6.8, { dur: 0.3, vel: 0.18, direction: 'rl' });                                               // punch-in hides the jump cut
whooshBy(fx, 8.8, { dur: 0.5, vel: 0.2, direction: 'center', low: 250, high: 2600 });                      // into the card
for (let i = 0; i < 6; i++) bell(fx, 9.0 + i * 0.05, [76, 81, 83, 88, 93, 95][i], 0.07, { p: -0.5 + i * 0.2, decay: 0.5 }); // outline sparkle
bell(fx, 10.0, 81, 0.14, { decay: 1.6 }); bell(fx, 10.0, 88, 0.1, { decay: 1.6 });
placeCues(fx, plan.cues);
const send = new Bus(DUR + 2); bed.mixInto(send, 0.4); reverb(send, { room: 0.8, damp: 0.4 }).mixInto(bed, 0.5);
for (const b of [bed, fx]) { for (let i = 0; i < b.n; i++) { const t = i / SR, g = t >= DUR ? 0 : t > DUR - 0.6 ? (DUR - t) / 0.6 : 1; b.L[i] *= g; b.R[i] *= g; } b.n = DUR * SR; b.L = b.L.subarray(0, b.n); b.R = b.R.subarray(0, b.n); }
const nb = 0.45 / Math.max(peak(bed), 1e-9), nf = 0.45 / Math.max(peak(fx), 1e-9);
const bedWav = join(OUT, 'bed.wav'); writeWav(bedWav, bed, { gain: nb }); writeWav(join(OUT, 'sfx.wav'), fx, { gain: nf * 0.8 });
// dialogue: polish the voice, duck the bed under it, then add the SFX → mix
const voice = join(HERE, 'plates', 'pack', 'voice.wav');
const graph = [`[0:a]aresample=${SR},pan=stereo|c0=c0|c1=c0,${polish({ nr: 8 })},volume=2dB,apad=whole_dur=${DUR}[v]`, `[1:a]volume=-9dB[m]`,
  duck({ voice: 'v', music: 'm', out: 'md', threshold: 0.025, ratio: 6, attack: 15, release: 350 }), `[vo][md]amix=inputs=2:duration=longest:normalize=0,atrim=0:${DUR}[mus]`].join(';');
await render({ inputs: [voice, bedWav], graph, map: '[mus]', out: join(OUT, 'music.wav'), extra: ['-c:a', 'pcm_f32le'] });
await render({ inputs: [join(OUT, 'music.wav'), join(OUT, 'sfx.wav')], graph: `[0:a][1:a]amix=inputs=2:duration=first:normalize=0[mix]`, map: '[mix]', out: join(OUT, 'mix.wav'), extra: ['-c:a', 'pcm_f32le'] });
console.log('live1 score: bed + sfx synthesised, voice polished, bed ducked under the voice');
