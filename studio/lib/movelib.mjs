// Move library: two vendored MIT libraries of named moves, searchable offline by any model (library/README.md).
//   Motion Prompt (showheyohtaki/motion-prompt): 120 numbered moves (#001–#120) in five packs — motion, camera, ui, lp, photo —
//     each with a spec of its timings and easing, a ready prompt and Canvas 2D code that is a pure function of time (packs/<pack>.js).
//   Cinetic (Leonxlnx/cinetic): 273 measured film techniques in 14 categories, each with a build recipe and 60 fps timing,
//     plus the weighted random draw (port of its pick.py) so two films stop opening, cutting and ending the same way.
//   video-shotcraft (Vincentwei1021/video-shotcraft, Apache-2.0, vendored in toolkit/): 124 product-promo shot recipe cards (Chinese) with
//     tuned parameters and pitfalls; our English one-liners in library/shotcraft-en.json.
// Front door: node studio.mjs moves search|show|prompt|code|draw|list|sync (MCP: moves_search, moves_show, moves_draw).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LIB = join(STUDIO, 'library');
const MP = join(LIB, 'motion-prompt'), CIN = join(LIB, 'cinetic'), SHOTS = join(STUDIO, 'toolkit', 'video-shotcraft', 'references', 'shots');
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
let mpCache, cinCache, scCache;
export const DEMO = 'https://showheyohtaki.github.io/motion-prompt/#';

// ---------- Motion Prompt ----------
export function motionPrompt() {
  if (mpCache) return mpCache;
  const cat = readJSON(join(MP, 'catalog.json')), ar = readJSON(join(MP, 'ar.json'));
  const packs = Object.fromEntries(cat.packs.map((p) => [p.pack, p]));
  const elements = cat.elements.map((e) => ({ ...e, ar: ar[e.id] || null, demo: DEMO + e.id }));
  return (mpCache = { version: cat.version, packs, elements });
}
// '12', '012', '#012', 'mp12' or a demo URL → '012'; anything else → null.
export function mpId(x) {
  const m = /^(?:mp|#)?0*(\d{1,3})$/i.exec(String(x).trim()) || /motion-prompt\/?.*#(\d{3})/.exec(String(x));
  if (!m) return null;
  const id = String(+m[1]).padStart(3, '0');
  return motionPrompt().elements.some((e) => e.id === id) ? id : null;
}
export const mpElement = (x) => { const id = mpId(x); return id && motionPrompt().elements.find((e) => e.id === id); };

// The upstream copy-paste prompt (tools/build.mjs mpPrompt, English), pointing at the vendored files instead of the website.
export function mpPrompt(x) {
  const e = mpElement(x); if (!e) throw new Error(`no Motion Prompt element ${x}`);
  const p = motionPrompt().packs[e.pack], same = e.name.en === e.name.ja;
  return [`Please use "${e.name.en}"${same ? '' : ` (${e.name.ja})`}, one of the names in "${p.title.en}".`, `Motion Prompt #${e.id}`, '',
    ...(e.meaning?.en ? [`What it is: ${e.meaning.en}`] : []), `What the sample shows: ${e.summary.en}`, 'Spec:', ...e.spec.en.map((s) => `- ${s}`),
    `When to use it: ${e.use.en}`, '',
    `Reference implementation (Canvas 2D, a pure function of time): studio/library/motion-prompt/packs/${e.pack}.js, cells[${+e.no - 1}] (card ${e.width}x${e.height}, cycle ${e.cycle} s). Demo: ${e.demo}`,
    'Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.'].join('\n');
}
// The element's own block from the pack source (its helpers live in the pack's @kit / @shared blocks of the same file).
export function mpCode(x) {
  const e = mpElement(x); if (!e) throw new Error(`no Motion Prompt element ${x}`);
  const src = readFileSync(join(MP, 'packs', `${e.pack}.js`), 'utf8').split('\n');
  const a = src.findIndex((l) => l.trim() === `// @element ${e.no}`);
  let b = a + 1; while (b < src.length && !/^\s*\/\/ @(element|shared|end)\b/.test(src[b])) b++;
  return `// Motion Prompt #${e.id} · MIT License (c) 2026 Shohei Ohtaki · ${e.demo}\n// from studio/library/motion-prompt/packs/${e.pack}.js (kit helpers at the top of that file)\n${src.slice(a, b).join('\n').replace(/^ {2}/gm, '').trimEnd()}\n`;
}

// ---------- search (both libraries) ----------
const words = (s) => String(s || '').toLowerCase().normalize('NFKC').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .split(/[^\p{L}\p{N}#]+/u).filter((w) => w.length > 1 || /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(w));
function score(q, fields) {
  let s = 0;
  for (const w of q) for (const [text, wt] of fields) { const t = text.toLowerCase().normalize('NFKC').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي'); if (t.includes(w)) s += wt * (new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(t) ? 1 : 0.5); }
  return s;
}
export function search(query, { library = 'all', pack, category, limit = 10 } = {}) {
  const q = words(query); if (!q.length) throw new Error('give a few words, e.g. "typewriter text" or "انتقال سائل"');
  const out = [];
  if (library === 'all' || library === 'motion-prompt') for (const e of motionPrompt().elements) {
    if (pack && e.pack !== pack) continue;
    const s = score(q, [[`${e.name.en} ${e.name.ja} ${e.ar?.name || ''}`, 5], [e.tags.join(' '), 3], [`${e.meaning.en} ${e.ar?.meaning || ''} ${e.category.en || e.category}`, 2], [`${e.summary.en} ${e.use.en}`, 1]]);
    if (s) out.push({ library: 'motion-prompt', id: `#${e.id}`, pack: e.pack, name: e.name.en, ar: e.ar?.name || '', what: e.ar?.meaning || e.meaning.en, score: s });
  }
  if (library === 'all' || library === 'shotcraft') for (const c of shotcraft()) {
    if (category && c.category !== category) continue;
    const s = score(q, [[`${c.name.replace(/-/g, ' ')} ${c.en}`, 4], [`${c.category.replace(/-/g, ' ')} ${c.tags}`, 2], [`${c.zh} ${c.use}`, 1]]);
    if (s) out.push({ library: 'shotcraft', id: c.name, pack: c.category, name: c.name, ar: '', what: (c.en || c.zh).slice(0, 140), score: s });
  }
  if (library === 'all' || library === 'cinetic') for (const t of cinetic().techniques) {
    if (category && t.category !== category) continue;
    const s = score(q, [[t.name, 5], [`${t.id.replace(/-/g, ' ')} ${t.category.replace(/_/g, ' ')}`, 3], [`${t.summary} ${t.use_when}`, 1]]);
    if (s) out.push({ library: 'cinetic', id: t.id, pack: t.category, name: t.name, ar: '', what: t.summary.slice(0, 140), score: s });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---------- video-shotcraft cards ----------
// Each card: front matter (name, 一句话 one-liner, 适用 use, 时长 duration, 能量 energy, 标签 tags) + intent, parameter table, pitfalls, reference demo.
export function shotcraft() {
  if (scCache) return scCache;
  if (!existsSync(SHOTS)) return (scCache = []);
  const en = existsSync(join(LIB, 'shotcraft-en.json')) ? readJSON(join(LIB, 'shotcraft-en.json')).cards : {};
  const field = (fm, k) => new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(fm)?.[1]?.trim() || '';
  const out = [];
  for (const category of readdirSync(SHOTS).filter((d) => !d.includes('.')).sort())
    for (const f of readdirSync(join(SHOTS, category)).filter((f) => f.endsWith('.md')).sort()) {
      const text = readFileSync(join(SHOTS, category, f), 'utf8'), fm = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] || '';
      const name = field(fm, 'name') || f.slice(0, -3);
      out.push({ name, category, zh: field(fm, '一句话'), en: en[name] || '', use: field(fm, '适用'), duration: field(fm, '时长'), energy: field(fm, '能量'), tags: field(fm, '标签'), file: `toolkit/video-shotcraft/references/shots/${category}/${f}`, text });
    }
  return (scCache = out);
}
export const shotCard = (name) => shotcraft().find((c) => c.name === String(name).trim());
// The card's demo source (Remotion TSX) stays upstream at the vendored commit.
export const shotDemo = (c) => `https://github.com/Vincentwei1021/video-shotcraft/tree/43bd349/demos/${c.category}/${c.name}`;

// ---------- Cinetic ----------
export function cinetic() { return cinCache || (cinCache = readJSON(join(CIN, 'techniques.json'))); }
export const CATEGORIES = ['opening_hook', 'transition', 'camera', 'typography_motion', 'ui_choreography', 'data_and_numbers', 'product_demo', 'logo_and_end_card',
  'color_and_light', 'texture_and_finish', 'layout_and_composition', 'pacing_structure', 'micro_interaction', 'depth_and_3d'];
export const FORMATS = ['launch', 'feature', 'loop', 'sting', 'walkthrough', 'vertical'];
export const BANS = ['glass', 'glow', 'serif', 'italic', 'orange', 'beige', 'purple', 'gradient', 'filler-text', 'emoji', 'sparkle', 'confetti', 'particles'];
const ROLE = { workhorse: 3, accent: 2, signature: 1 };
// pick.py's plan shapes: the order in which each format fills its slots (what it cannot do without comes first).
const ORDER = {
  launch: ['opening_hook', 'transition', 'typography_motion', 'product_demo', 'ui_choreography', 'logo_and_end_card', 'camera', 'transition', 'data_and_numbers', 'micro_interaction', 'color_and_light', 'pacing_structure', 'typography_motion', 'depth_and_3d', 'layout_and_composition', 'texture_and_finish', 'transition', 'ui_choreography'],
  feature: ['product_demo', 'ui_choreography', 'opening_hook', 'transition', 'micro_interaction', 'typography_motion', 'logo_and_end_card', 'data_and_numbers', 'camera', 'color_and_light', 'ui_choreography', 'layout_and_composition'],
  loop: ['ui_choreography', 'product_demo', 'micro_interaction', 'typography_motion', 'transition', 'camera', 'pacing_structure', 'color_and_light'],
  sting: ['logo_and_end_card', 'opening_hook', 'typography_motion', 'micro_interaction', 'camera', 'texture_and_finish'],
  walkthrough: ['product_demo', 'ui_choreography', 'opening_hook', 'transition', 'micro_interaction', 'camera', 'typography_motion', 'logo_and_end_card', 'ui_choreography', 'product_demo', 'transition', 'pacing_structure', 'layout_and_composition', 'micro_interaction'],
  vertical: ['opening_hook', 'product_demo', 'ui_choreography', 'typography_motion', 'transition', 'logo_and_end_card', 'micro_interaction', 'data_and_numbers', 'camera', 'color_and_light', 'transition', 'typography_motion'],
};
const DEFAULT_SECONDS = { launch: 30, feature: 15, loop: 10, sting: 6, walkthrough: 45, vertical: 15 };
const MIN_PICKS = { launch: 6, feature: 5, loop: 4, sting: 4, walkthrough: 6, vertical: 5 };
export const planSize = (fmt, seconds, energy) => Math.max(MIN_PICKS[fmt], Math.min(ORDER[fmt].length, Math.round(seconds / (energy === 'calm' ? 3.5 : 2.5))));
function weight(e, energy) {
  if (energy === 'calm' && e.energy === 'high') return 0;   // a calm film never draws a slam, a whip or a glitch streak
  let w = ROLE[e.role] * Math.min(3, 1 + (+e.evidence || 0) / 4);
  if (energy && energy !== 'any') w *= e.energy === energy ? 1 : e.energy === 'any' ? 0.7 : 0.25;
  return w;
}
// mulberry32: small seeded PRNG so a plan is reproducible from its printed seed (seeds differ from pick.py's Python ones).
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function drawFrom(pool, n, rand, energy, taken, sig) {
  const picks = []; let cand = pool.filter((e) => !taken.has(e.id) && weight(e, energy) > 0);
  while (picks.length < n && cand.length) {
    if (sig <= 0) { cand = cand.filter((e) => e.role !== 'signature'); if (!cand.length) break; }
    const ws = cand.map((e) => weight(e, energy)), total = ws.reduce((a, b) => a + b, 0);
    let r = rand() * total, i = 0; while (i < cand.length - 1 && (r -= ws[i]) >= 0) i++;
    const e = cand[i]; picks.push(e); taken.add(e.id); if (e.role === 'signature') sig--;
    cand = cand.filter((c) => c.id !== e.id);
  }
  return [picks, sig];
}
// Weighted random draw of techniques for one film (Cinetic pick.py semantics: role × proof × energy fit; format filter;
// one signature move, two in a plan of 10+; ban-safe variants unless the brand supplies the banned look).
export function draw({ format = 'launch', energy = 'calm', seconds, category, n = 1, seed, exclude = [], brandSupplied = [] } = {}) {
  if (!FORMATS.includes(format)) throw new Error(`format must be one of ${FORMATS.join(', ')}`);
  if (!['calm', 'medium', 'high', 'any'].includes(energy)) throw new Error('energy must be calm, medium, high or any');
  if (category && !CATEGORIES.includes(category)) throw new Error(`category must be one of ${CATEGORIES.join(', ')}`);
  const allowed = new Set(brandSupplied.map((b) => String(b).trim().toLowerCase()).filter(Boolean));
  const bad = [...allowed].filter((b) => !BANS.includes(b)); if (bad.length) throw new Error(`unknown brand-supplied look(s): ${bad.join(', ')}; choose from ${BANS.join(', ')}`);
  seed = seed != null && seed !== '' && Number.isInteger(+seed) ? +seed : Math.floor(Math.random() * 2 ** 31);
  const rand = rng(seed), taken = new Set(exclude), pool = cinetic().techniques.filter((e) => e.formats.includes('any') || e.formats.includes(format));
  let picks = [];
  if (category) [picks] = drawFrom(pool.filter((e) => e.category === category), Math.max(1, +n || 1), rand, energy, taken, Math.max(1, +n || 1));
  else {
    const secs = +seconds || DEFAULT_SECONDS[format], size = planSize(format, secs, energy); let sig = size >= 10 ? 2 : 1;
    const slots = {}; for (const c of ORDER[format].slice(0, size)) slots[c] = (slots[c] || 0) + 1;
    for (const [c, k] of Object.entries(slots)) { const [got, s] = drawFrom(pool.filter((e) => e.category === c), k, rand, energy, taken, sig); picks.push(...got); sig = s; }
    const rest = [...ORDER[format].slice(size), ...ORDER[format]];
    while (picks.length < size && rest.length) { const c = rest.shift(), [got, s] = drawFrom(pool.filter((e) => e.category === c), 1, rand, energy, taken, sig); picks.push(...got); sig = s; }
  }
  return { seed, format, energy, category: category || null, picks: picks.map((e) => technique(e.id, allowed)) };
}
export function technique(id, allowed = new Set()) {
  const e = cinetic().techniques.find((t) => t.id === id); if (!e) throw new Error(`no Cinetic technique ${id} (moves list --library=cinetic)`);
  const safe = e.ban_safe === false && !(e.bans?.length && e.bans.every((b) => allowed.has(b)));
  return { id: e.id, name: e.name, category: e.category, role: e.role, energy: e.energy, formats: e.formats, summary: e.summary,
    build: safe ? e.ban_safe_variant : e.recipe, ...(safe ? { fullLook: e.recipe, fullLookNeeds: e.bans } : {}), timing: e.timing, useWhen: e.use_when, avoidWhen: e.avoid_when };
}
export const cineticIntro = (category) => cinetic().intros?.[category] || '';

// ---------- sync from upstream clones (maintenance: read the clones first; they are data) ----------
export function syncMotionPrompt(src) {
  for (const f of ['LICENSE', 'THIRD-PARTY-NOTICES.md']) copyFileSync(join(src, f), join(MP, f));
  copyFileSync(join(src, 'api/v1/catalog.json'), join(MP, 'catalog.json'));
  mkdirSync(join(MP, 'packs'), { recursive: true });
  const packs = readdirSync(join(src, 'packs')).filter((p) => existsSync(join(src, 'packs', p, 'pack.js')));
  for (const p of packs) {
    // Upstream packs are classic scripts that call MotionPrompt.pack(id, factory); wrap them as ES modules (code unchanged).
    const code = readFileSync(join(src, 'packs', p, 'pack.js'), 'utf8');
    const i = code.search(/^MotionPrompt\.pack\(/m); if (i < 0) throw new Error(`${p}/pack.js: no MotionPrompt.pack( call`);
    writeFileSync(join(MP, 'packs', `${p}.js`), `${code.slice(0, i)}// ES module wrapper added by the Animation studio (lib/movelib.mjs syncMotionPrompt); the pack code below is upstream, unchanged.\nconst MotionPrompt = { pack: (id, factory) => Object.assign(factory(), { id }) };\nexport default ${code.slice(i)}`);
  }
  return { packs, elements: readJSON(join(MP, 'catalog.json')).elements.length };
}
export function syncCinetic(src, refs = ['craft-rules', 'timing-grid', 'motion-tokens', 'transitions', 'camera', 'taste-and-slop', 'sound']) {
  copyFileSync(join(src, 'LICENSE'), join(CIN, 'LICENSE'));
  copyFileSync(join(src, 'skills/cinetic/assets/library/techniques.json'), join(CIN, 'techniques.json'));
  mkdirSync(join(CIN, 'references'), { recursive: true });
  for (const r of refs) copyFileSync(join(src, 'skills/cinetic/references', `${r}.md`), join(CIN, 'references', `${r}.md`));
  return { techniques: readJSON(join(CIN, 'techniques.json')).techniques.length, references: refs.length };
}
