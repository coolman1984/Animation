// Film 4 plates from the owner's photos (film5/source, git-ignored). Run once: node film5/plates.mjs
// Reuses the measured cut-out jobs from films 2/3 (same hero photo 1600², same swing poster 1080×1350).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLab } from '../lib/imagelab.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const url = (f) => `data:image/jpeg;base64,${readFileSync(join(HERE, 'source', f)).toString('base64')}`;
const out = join(HERE, 'plates');
console.log(await runLab({ job: join(HERE, '..', 'film2', 'plates-hero.js'), outDir: out, args: { hero: url('hero-duo.jpg') } }));
console.log(await runLab({ job: join(HERE, '..', 'film2', 'plates-swing.js'), outDir: out, args: { swing: url('swing.jpg') } }));
console.log(await runLab({ job: join(HERE, '..', 'film3', 'plates-bar.js'), outDir: out, args: { hero: url('hero-duo.jpg') } }));
const png = (f) => `data:image/png;base64,${readFileSync(join(out, f)).toString('base64')}`;
console.log(await runLab({ job: join(HERE, '..', 'film4', 'plates-f4.js'), outDir: out, args: { layer: png('swing-layer.png'), cup: png('hero-cup.png'), plate: png('swing-plate.png') } }));
