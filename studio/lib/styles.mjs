// House style cards (styles/README.md): proven looks from our own delivered films, as rules any model can follow.
//   listStyles() → index rows · readStyle(slug) → STYLE.md text · brandFor(slug) → Studio Engine brand (style tokens over the default)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..'), DIR = join(STUDIO, 'styles');
const index = () => JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')).styles;
export const listStyles = () => index().map(({ brand, ...row }) => row);
function find(slug) {
  const s = index().find((x) => x.slug === slug);
  if (!s) throw new Error(`unknown style "${slug}" (node studio/studio.mjs styles lists them)`);
  return s;
}
export function readStyle(slug) {
  find(slug);
  const p = join(DIR, slug, 'STYLE.md');
  if (!existsSync(p)) throw new Error(`style ${slug} has no STYLE.md`);
  return readFileSync(p, 'utf8');
}
export function brandFor(slug) {
  const s = find(slug), base = JSON.parse(readFileSync(join(STUDIO, 'studio-engine', 'brand', 'brand.json'), 'utf8'));
  return { ...base, name: `style:${slug}`, colors: { ...base.colors, ...(s.brand?.colors || {}) }, fonts: { ...base.fonts, ...(s.brand?.fonts || {}) } };
}
