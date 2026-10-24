// House style cards (styles/README.md): proven looks from our own delivered films, as rules any model can follow.
//   listStyles() → index rows · readStyle(slug) → STYLE.md text · brandFor(slug) → Studio Engine brand (style tokens over the default)
//   listStyles({ library: 'lemo' }) / readStyle('lemo/<slug>') → Lemo-Opuscar's 59 film-style cards (MIT, library/lemo-styles; grammar
//   to adapt, never a template: their fonts, sample films and model tuning are theirs, our house method decides taste)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..'), DIR = join(STUDIO, 'styles'), LEMO = join(STUDIO, 'library', 'lemo-styles');
const index = () => JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')).styles;
const lemo = () => existsSync(LEMO) ? readdirSync(LEMO).filter((d) => !d.startsWith('_') && existsSync(join(LEMO, d, 'STYLE.md'))).sort().map((slug) => {
  const meta = existsSync(join(LEMO, slug, 'style.json')) ? JSON.parse(readFileSync(join(LEMO, slug, 'style.json'), 'utf8')) : {};
  const essence = /^>\s*(.+)$/m.exec(readFileSync(join(LEMO, slug, 'STYLE.md'), 'utf8'))?.[1] || '';
  return { slug: `lemo/${slug}`, library: 'lemo', name: meta.en || slug, category: meta.category_en || '', uses: meta.uses || [], essence };
}) : [];
export const listStyles = ({ library } = {}) => library === 'lemo' ? lemo() : index().map(({ brand, ...row }) => row);
function find(slug) {
  const s = index().find((x) => x.slug === slug);
  if (!s) throw new Error(`unknown style "${slug}" (node studio/studio.mjs styles lists them)`);
  return s;
}
export function readStyle(slug) {
  const m = /^lemo\/([a-z0-9-]+)$/.exec(String(slug));
  if (m) { const p = join(LEMO, m[1], 'STYLE.md'); if (!existsSync(p)) throw new Error(`unknown Lemo style "${m[1]}" (node studio/studio.mjs styles --library=lemo)`); return readFileSync(p, 'utf8'); }
  find(slug);
  const p = join(DIR, slug, 'STYLE.md');
  if (!existsSync(p)) throw new Error(`style ${slug} has no STYLE.md`);
  return readFileSync(p, 'utf8');
}
export function brandFor(slug) {
  const s = find(slug), base = JSON.parse(readFileSync(join(STUDIO, 'studio-engine', 'brand', 'brand.json'), 'utf8'));
  return { ...base, name: `style:${slug}`, colors: { ...base.colors, ...(s.brand?.colors || {}) }, fonts: { ...base.fonts, ...(s.brand?.fonts || {}) } };
}
