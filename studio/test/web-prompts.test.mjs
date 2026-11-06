// Web additions of 2026-11-06 (web/prompts/README.md, WEB.md "Hero motion" … "Promo reel of a site"): prompt library, hero-motion story
// section, placeholder-contact warnings, photos folder credits, one-folder output, one-section edit, phone review note, reel curve.
// No browser here (the browser runs with `studio.mjs web check|edit|reel`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validate, build, fakeContacts, portable, replaceSection, STORY_SHAPES } from '../web/lib/site.mjs';
import { prompts, fillPrompt, promptText, slot } from '../web/lib/prompts.mjs';
import { reviewNote } from '../web/lib/check.mjs';
import { scrollCurve } from '../web/lib/reel.mjs';
import { STUDIO } from '../lib/capabilities.mjs';

const WEB = join(STUDIO, 'web'), example = () => JSON.parse(readFileSync(join(WEB, 'sites/example/site.json'), 'utf8'));

test('prompt library: every prompt names an existing example and brief, every group is used', () => {
  const { groups, prompts: list } = prompts();
  assert.ok(groups.length >= 6 && list.length >= 10);
  for (const g of ['local-services', 'food-cafe', 'saas', 'courses', 'video-production', 'seasonal']) assert.ok(list.some((p) => p.group === g), g);
  for (const p of list) {
    assert.ok(groups.some((g) => g.id === p.group), p.id);
    assert.ok(existsSync(join(WEB, 'gallery/specimens', `${p.specimen}.html`)), p.specimen);
    assert.ok(existsSync(join(WEB, 'prompts', p.file)), p.file);
    if (p.storyShape) assert.ok(Object.hasOwn(STORY_SHAPES, p.storyShape), p.storyShape);
  }
  assert.equal(new Set(list.map((p) => p.id)).size, list.length, 'unique ids');
  const gallery = readFileSync(join(WEB, 'gallery/index.html'), 'utf8');
  for (const s of new Set(list.map((p) => p.specimen))) assert.match(gallery, new RegExp(`id:'${s}'`), `${s} is on the gallery wall`);
});

test('prompt template: Arabic and English, five parts, slots are site.json paths', () => {
  const tpl = readFileSync(join(WEB, 'prompts/PROMPT_TEMPLATE.md'), 'utf8');
  assert.match(tpl, /<!-- ar -->/); assert.match(tpl, /<!-- en -->/);
  const en = promptText('plumbing', { lang: 'en' }), ar = promptText('plumbing');
  for (const h of ['## 1. The business', '## 2. The design', '## 3. Photo conditions', '## 4. Steps', '## 5. Check at three sizes']) assert.ok(en.includes(h), h);
  assert.match(ar, /## ٥\. الفحص على ٣ مقاسات/);
  assert.match(en, /‹hero\.title›/, 'unfilled slot stays visible');
  assert.match(en, /sabbak-plumbing\.html/);
  const filled = promptText('plumbing', { site: example(), lang: 'en' });
  assert.ok(filled.includes(example().brand.name)); assert.doesNotMatch(filled, /‹brand\.name›/);
  assert.equal(slot({ sections: [{ type: 'features', items: [{ title: 'A', text: 'b' }] }] }, 'features.items'), '- A: b');
  assert.equal(fillPrompt('{{brand.name}} {{x.y}}', { brand: { name: '‹brand›' } }), '‹brand.name› ‹x.y›', 'a plan placeholder is not a value');
  assert.throws(() => promptText('nope'), /no prompt/);
});

test('hero motion: one story section with a shape and a reason, drawn without pathLength', () => {
  const site = example(), story = { type: 'story', id: 'how', shape: 'pipe', why: 'water reaches every room, step by step', items: [{ title: 'one' }] };
  assert.deepEqual(validate({ ...site, sections: [...site.sections, story] }).errors, []);
  const e = validate({ ...site, sections: [...site.sections, { ...story, shape: 'spiral', why: 'x' }, { ...story, id: 'two' }] }).errors.join('\n');
  assert.match(e, /shape must be one of/); assert.match(e, /needs "why"/); assert.match(e, /one hero motion per site/);
  const out = mkdtempSync(join(tmpdir(), 'web-story-'));
  try {
    build({ ...site, sections: [...site.sections, story] }, out, { siteDir: join(WEB, 'sites/example') });
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    assert.match(html, /data-story/); assert.match(html, /class="story-fill"/); assert.doesNotMatch(html, /pathLength/);
    assert.match(readFileSync(join(out, 'assets/motion.js'), 'utf8'), /drawStory/);
    assert.match(readFileSync(join(out, 'assets/site.css'), 'utf8'), /\.story-stops/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('placeholder contacts warn; real ones do not', () => {
  for (const s of ['للتواصل: 555-0123', 'tel:01000000000', 'mailto:info@example.com', 'https://wa.me/201111111111', '+1 (555) 123-4567', 'test@gmail.com', '0123456789'])
    assert.equal(fakeContacts({ footer: { text: s } }).length, 1, s);
  for (const s of ['hello@noor-cafe.com', 'tel:+201001234567', '2026 – 2027', '٣٠ ساعة', '1200 ج.م'])
    assert.equal(fakeContacts({ footer: { text: s } }).length, 0, s);
  assert.ok(validate({ ...example(), footer: { text: 'tel:5550123' } }).warnings.some((w) => /placeholder phone/.test(w)));
});

test('photos folder: copied into dist, a photo without a credit row warns; the output is one portable folder', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'web-photos-')), site = join(tmp, 'site'), out = join(tmp, 'dist');
  try {
    cpSync(join(WEB, 'sites/example'), site, { recursive: true, filter: (s) => !s.includes('dist') });
    mkdirSync(join(site, 'photos')); writeFileSync(join(site, 'photos/a.jpg'), 'x'); writeFileSync(join(site, 'photos/b.jpg'), 'x');
    writeFileSync(join(site, 'photos/CREDITS.json'), JSON.stringify([{ file: 'a.jpg', source: 'https://unsplash.com/photos/x', author: 'A', licence: 'Unsplash License' }]));
    const r = build(example(), out, { siteDir: site });
    assert.ok(existsSync(join(out, 'photos/a.jpg')) && existsSync(join(out, 'photos/b.jpg')));
    assert.deepEqual(r.warnings.filter((w) => /photos\//.test(w)).map((w) => w.split(':')[0]), ['photos/b.jpg']);
    assert.deepEqual(portable(out), [], 'the built folder only uses relative paths that exist');
    writeFileSync(join(out, 'index.html'), readFileSync(join(out, 'index.html'), 'utf8').replace('</body>', '<img src="/logo.png" alt="x"><a href="gone.html">x</a></body>'));
    const p = portable(out).join('\n');
    assert.match(p, /root-absolute path \/logo\.png/); assert.match(p, /gone\.html is not inside the folder/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('web edit: replaceSection swaps one section and keeps the rest', () => {
  const site = example(), id = site.sections.find((s) => s.id)?.id, next = replaceSection(site, id, { type: 'cta', title: 'جديد', cta: { label: 'اطلب', href: '#top' } });
  assert.equal(next.sections.find((s) => s.id === id).title, 'جديد');
  assert.equal(next.sections.length, site.sections.length);
  assert.deepEqual(next.sections.filter((s) => s.id !== id), site.sections.filter((s) => s.id !== id));
  assert.throws(() => replaceSection(site, 'missing', {}), /no section with id/);
  assert.throws(() => replaceSection(site, id, []), /JSON object/);
});

test('phone review note and the reel scroll curve', () => {
  const note = reviewNote('demo', { verdict: 'ready', lights: [{ id: 'contrast', light: 'red', why: 'x' }], viewports: [{ name: 'phone', w: 390, sheet: 'p.png' }, { name: 'desktop', w: 1440, sheet: 'd.png' }] });
  assert.match(note, /تمام كده، ولا محتاج تعديل/); assert.match(note, /موبايل \(390px\): p\.png/); assert.match(note, /لازم يتصلّح: contrast/);
  const n = 90, v = Array.from({ length: n }, (_, i) => scrollCurve(i, n));
  assert.equal(v[0], 0); assert.equal(v[n - 1], 1);
  for (let i = 1; i < n; i++) assert.ok(v[i] >= v[i - 1], 'never scrolls back');
  assert.equal(v[5], 0, 'holds the first screen'); assert.equal(v[n - 6], 1, 'holds the closing action');
});
