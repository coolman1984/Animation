// Score = the study track (music stem) + sounds placed from the SAME cue sheet the picture reads.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bus, writeWav, peak } from '../../lib/audio.mjs';
import { placeCues } from '../../lib/cues.mjs';
import { writeTrack } from './track.mjs';
import { execFileSync } from 'node:child_process';
import plan from './production.json' with { type: 'json' };

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'takes', 'examples', 'music-sync-study');
mkdirSync(OUT, { recursive: true });
writeTrack(join(OUT, 'music.wav'));
const sfx = new Bus(plan.duration);
placeCues(sfx, plan.cues);
writeWav(join(OUT, 'sfx.wav'), sfx, { gain: 0.5 / Math.max(peak(sfx), 1e-6) * 0.6 });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(OUT, 'music.wav'), '-i', join(OUT, 'sfx.wav'), '-filter_complex', 'amix=inputs=2:normalize=0', '-c:a', 'pcm_f32le', join(OUT, 'mix.wav')]);
console.log('music-sync score written');
