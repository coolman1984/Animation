// Film 3 plates: clean bar background (cut-outs and logo are reused from film 2's plates).
// Run once: node film3/plates.mjs  (needs film3/source/IMG-20261001-WA0017.jpg — owner photo, not in git)
import { readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLab } from '../lib/imagelab.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(HERE, 'plates'), { recursive: true });
for (const f of ['hero-cup.png', 'hero-carton.png', 'logo-white.png']) copyFileSync(join(HERE, '..', 'film2', 'plates', f), join(HERE, 'plates', f));
const hero = `data:image/jpeg;base64,${readFileSync(join(HERE, 'source', 'IMG-20261001-WA0017.jpg')).toString('base64')}`;
console.log(await runLab({ job: join(HERE, 'plates-bar.js'), outDir: join(HERE, 'plates'), args: { hero } }));
