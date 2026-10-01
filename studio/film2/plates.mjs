// Build all image plates for film 2 from the owner's source photos.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLab } from '../lib/imagelab.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const dataUrl = (f) => `data:image/jpeg;base64,${readFileSync(join(HERE, 'source', f)).toString('base64')}`;
const which = process.argv[2] || 'all';
const jobs = {
  hero: () => runLab({ job: join(HERE, 'plates-hero.js'), outDir: join(HERE, 'plates'), args: { hero: dataUrl('hero-duo.jpg') } }),
  swing: () => runLab({ job: join(HERE, 'plates-swing.js'), outDir: join(HERE, 'plates'), args: { swing: dataUrl('swing.jpg') } }),
};
for (const [name, run] of Object.entries(jobs)) {
  if (which !== 'all' && which !== name) continue;
  console.log(name, (await run()).join(' '));
}
