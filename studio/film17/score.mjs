// Film 17 score = film 16's score (same 25 s timeline, same shared clock). Builds it, then places the three wavs where this film's build expects them.
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url)), STUDIO = join(HERE, '..');
execFileSync(process.execPath, [join(STUDIO, 'film16', 'score.mjs')], { stdio: 'inherit' });
const out = join(STUDIO, 'takes', 'film17'); mkdirSync(out, { recursive: true });
for (const f of ['mix.wav', 'music.wav', 'sfx.wav']) copyFileSync(join(STUDIO, 'takes', 'film16', f), join(out, f));
console.log('film17 score: copied film16 mix');
