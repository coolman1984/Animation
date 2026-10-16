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
  assert.deepEqual(site.sections.map((s) => s.type), ['hero', 'problem', 'features', 'steps', 'ring', 'faq', 'cta']);
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
    assert.match(html, /<html lang="ar" dir="rtl">/); assert.match(html, /data-ring/); assert.match(html, /data-steps/); assert.match(html, /<h1 data-split>/);
    assert.ok(!/[‹›]/.test(html)); assert.ok(r.bytes < 700 * 1024, `${r.bytes} bytes`);
    for (const f of ['assets/site.css', 'assets/motion.js']) assert.ok(existsSync(join(out, f)));
    assert.match(readFileSync(join(out, 'assets/site.css'), 'utf8'), /@media \(prefers-reduced-motion: reduce\)/);
  } finally { rmSync(out, { recursive: true, force: true }); }
  for (const s of STYLES().styles) for (const f of Object.values(s.fonts)) assert.ok(STYLES().faces[f], `${s.slug}: no faces for ${f}`);
  assert.throws(() => build(plan({}).site, mkdtempSync(join(tmpdir(), 'web-'))), /placeholder/);
});
