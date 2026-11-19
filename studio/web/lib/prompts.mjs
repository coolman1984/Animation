// Prompt library (web/prompts/README.md, 2026-11-06): one ready brief per example site, grouped by business type, written so ANY
// model can build a house-standard site from it. The business slots use the same names as site.json, so a filled site.json fills
// the prompt; a slot with no value stays a visible ‹…› that the build refuses later.
//   prompts()                → { groups, prompts }   (web/prompts/index.json)
//   slot(site, path)         → the value for a {{path}} slot ("hero.title" = the first hero section's title; arrays become lists)
//   fillPrompt(text, site)   → text with every {{path}} filled from site.json or left as ‹path›
//   promptText(id, { site, lang }) → the template (in that language) + the example's brief, filled
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTION_TYPES } from './site.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'prompts');
export const prompts = () => JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));

export function slot(site, path) {
  if (!site) return undefined;
  const [head, ...rest] = path.split('.');
  let v = SECTION_TYPES.includes(head) && !Object.hasOwn(site, head) ? (site.sections || []).find((s) => s.type === head) : site[head];
  for (const k of rest) v = v == null ? undefined : v[k];
  if (Array.isArray(v)) v = v.map((it) => (typeof it === 'string' ? `- ${it}` : `- ${[it.title || it.q || it.label, it.text || it.a || it.value].filter(Boolean).join(': ')}`)).join('\n');
  return typeof v === 'string' || typeof v === 'number' ? String(v) : undefined;
}

export const fillPrompt = (text, site) => text.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_, p) => { const v = slot(site, p); return v && !/[‹›]/.test(v) ? v : `‹${p}›`; });

export function promptText(id, { site = null, lang = 'ar' } = {}) {
  const { prompts: list } = prompts(), p = list.find((x) => x.id === id);
  if (!p) throw new Error(`no prompt "${id}" (node studio/studio.mjs web prompts)`);
  const file = join(DIR, p.file);
  if (!existsSync(file)) throw new Error(`prompt file missing: web/prompts/${p.file}`);
  const tpl = readFileSync(join(DIR, 'PROMPT_TEMPLATE.md'), 'utf8'), part = tpl.split(/^<!-- (ar|en) -->$/m);
  const pick = (code) => { const i = part.indexOf(code); return i >= 0 ? part[i + 1].trim() : ''; };
  const body = pick(lang === 'en' ? 'en' : 'ar').replace('{{design}}', readFileSync(file, 'utf8').trim()).replace('{{specimen}}', `studio/web/gallery/specimens/${p.specimen}.html`);
  return fillPrompt(body, site);
}
