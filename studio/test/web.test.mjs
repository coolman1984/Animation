// Web department (web/WEB.md): plan, validation and static build. No browser (the browser check runs with `studio.mjs web check`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { plan, validate, build, STYLES } from '../web/lib/site.mjs';
import { STUDIO } from '../lib/capabilities.mjs';

const fill = (o) => typeof o === 'string' && /[‹›]/.test(o) ? (/href|mailto/.test(o) ? '#top' : 'نص تجريبي') : Array.isArray(o) ? o.map(fill) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fill(v)])) : o;

test('plan: the house structure with ambition questions, refused until written', () => {
  const { site, todo } = plan({ brand: 'نور', style: 'ink-studio' });
  assert.deepEqual(site.sections.map((s) => s.type), ['hero', 'features', 'cta']);
  assert.ok(todo.some((t) => t.path === 'ambition.topPro'));
  assert.ok(validate(site).errors.some((e) => /placeholder left/.test(e)));
  assert.deepEqual(validate(fill(site)).errors, []);
});

test('validate: honesty and accessibility rules', () => {
  const base = fill(plan({ brand: 'x' }).site);
  const bad = { ...base, sections: [...base.sections, { type: 'stats', items: [{ value: 120, label: 'عميل' }] }, { type: 'quote', text: 'حلو' }, { type: 'hero', image: 'a.png', title: 't' }] };
  const e = validate(bad).errors.join('\n');
  assert.match(e, /needs its source/); assert.match(e, /quote needs the real person/); assert.match(e, /imageAlt/);
  assert.match(validate({ ...base, style: 'nope' }).errors.join(), /unknown/);
  for (const p of ['../assets/logo.png', '/etc/passwd', 'a/../../b.png', 'C:\\x.png', 'file:///x']) assert.match(validate({ ...base, brand: { ...base.brand, logo: p, logoAlt: 'x' } }).errors.join(), /inside the site folder/, p);
  assert.deepEqual(validate({ ...base, brand: { ...base.brand, logo: 'img/logo.png', logoAlt: 'x' } }).errors, []);
});

test('build: lang/dir, every section, styles fonts copied, no placeholders, small', () => {
  const site = JSON.parse(readFileSync(join(STUDIO, 'web/sites/example/site.json'), 'utf8')), out = mkdtempSync(join(tmpdir(), 'web-'));
  try {
    const r = build(site, out, { siteDir: join(STUDIO, 'web/sites/example') }), html = readFileSync(join(out, 'index.html'), 'utf8');
    assert.match(html, /<html lang="ar" dir="rtl">/); assert.match(html, /data-ring/); assert.match(html, /<h1>/);
    assert.ok(!/[‹›]/.test(html));
    assert.doesNotMatch(html, /class="orb"|data-magnetic|data-parallax|data-count|data-split|data-reveal/, 'quiet content-first defaults');
    const opted = {...site, sections:site.sections.map((section,i)=>i===0?{...section,motion:'reveal'}:section)};
    build(opted,out,{siteDir:join(STUDIO,'web/sites/example')});
    assert.match(readFileSync(join(out,'index.html'),'utf8'),/data-reveal/, 'authored reveal remains available'); assert.ok(r.bytes < 700 * 1024, `${r.bytes} bytes`);
    for (const f of ['assets/site.css', 'assets/motion.js']) assert.ok(existsSync(join(out, f)));
    assert.match(readFileSync(join(out, 'assets/site.css'), 'utf8'), /src:url\('fonts\//, 'font URLs are relative to assets/site.css');
    assert.match(readFileSync(join(out, 'assets/site.css'), 'utf8'), /@media \(prefers-reduced-motion: reduce\)/);
  } finally { rmSync(out, { recursive: true, force: true }); }
  for (const s of STYLES().styles) for (const f of Object.values(s.fonts)) assert.ok(STYLES().faces[f], `${s.slug}: no faces for ${f}`);
  assert.throws(() => build(plan({}).site, mkdtempSync(join(tmpdir(), 'web-'))), /placeholder/);
});

test('audit compare: before → after names what got better and what got worse', async () => {
  const { compareAudits } = await import('../web/lib/check.mjs');
  const c = compareAudits({ lights: [{ id: 'contrast', light: 'red' }, { id: 'taste-easing', light: 'green' }] },
    { lights: [{ id: 'contrast', light: 'green' }, { id: 'taste-easing', light: 'yellow' }, { id: 'weight', light: 'green' }] });
  assert.equal(c.better, 1); assert.deepEqual(c.worse, ['taste-easing']);
  assert.equal(c.rows.find((r) => r.id === 'weight').change, 'new');
  // inside the same colour the measure decides: more tap-target misses, or weight up > 10 %, is worse
  const d = compareAudits({ lights: [{ id: 'tap-targets', light: 'yellow', n: 1 }, { id: 'weight', light: 'yellow', n: 701 }] },
    { lights: [{ id: 'tap-targets', light: 'yellow', n: 6 }, { id: 'weight', light: 'yellow', n: 1499 }] });
  assert.deepEqual(d.worse, ['tap-targets', 'weight']);
});

test('design record: build and check need DESIGN.md with stages A–D and no placeholders', async () => {
  const { designRecord } = await import('../web/lib/site.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'design-'));
  try {
    assert.equal(designRecord(dir).ok, false);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(dir, 'DESIGN.md'), readFileSync(join(STUDIO, 'web/templates/DESIGN.md'), 'utf8'));
    const t = designRecord(dir); assert.equal(t.ok, false); assert.match(t.errors[0], /placeholder/);
    assert.equal(designRecord(join(STUDIO, 'web/sites/example')).ok, true, 'the example site carries a filled record');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('site safety and shape (audit B7): links, targets, required text, real image sizes, no empty tags', async () => {
  const { imageSize, safeHref } = await import('../web/lib/site.mjs');
  const base = fill(plan({ brand: 'x' }).site);
  assert.match(validate({ ...base, brand: undefined }).errors.join(), /brand\.name is required/);   // used to crash in build
  const withHref = (href) => ({ ...base, sections: base.sections.map((s) => (s.cta ? { ...s, cta: { ...s.cta, href } } : s)) });
  assert.match(validate(withHref('javascript:alert(1)')).errors.join(), /must be https/);
  assert.match(validate(withHref('#nowhere')).errors.join(), /points at no section/);
  for (const ok of ['https://x.org', 'mailto:a@b.c', 'tel:+20100', '#top', 'pricing.html']) assert.ok(safeHref(ok), ok);
  for (const bad of ['javascript:x', 'data:text/html,x', '//evil.org', '']) assert.ok(!safeHref(bad), bad);
  const e = validate({ ...base, sections: [...base.sections, { type: 'features', title: 'T', items: [{ title: 'a' }] }, { type: 'faq', title: 'F', items: [{ q: 'q' }] }, null] }).errors.join('\n');
  assert.match(e, /items\.0: text is required/); assert.match(e, /items\.0: a is required/); assert.match(e, /unknown type/);
  assert.deepEqual(validate({ ...base, sections: [...base.sections, { type: 'collection', title: 'C', items: [{ title: 'one' }] }] }).errors, []);
  const png = Buffer.alloc(24); png.set([0x89, 0x50, 0x4e, 0x47]); png.writeUInt32BE(640, 16); png.writeUInt32BE(200, 20);
  assert.deepEqual(imageSize(png), { w: 640, h: 200 });
  assert.deepEqual(imageSize(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100"></svg>'), 'logo.svg'), { w: 300, h: 100 });
  const out = mkdtempSync(join(tmpdir(), 'web-'));
  try {
    const mono = { ...base, theme: { fonts: { display: 'Space Mono' } }, lang: 'en' };
    if (!validate(mono).errors.length) { build(mono, out, { siteDir: out }); assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /type="font\/ttf"/); }
    build(base, out, { siteDir: out }); const html = readFileSync(join(out, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /<h2><\/h2>|<p><\/p>|<span><\/span>/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
