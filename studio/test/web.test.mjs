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

// ---- 2026-11-11 improvement pass ----
test('validate: a page can never render an empty heading, the word "undefined", a dead in-page link or a script link', () => {
  const base = fill(plan({ brand: 'x' }).site), errs = (site) => validate(site).errors.join('\n');
  assert.match(errs({ ...base, brand: undefined }), /brand\.name is required/);
  assert.match(errs({ ...base, brand: { name: '  ' } }), /brand\.name is required/);
  assert.match(errs({ ...base, title: '' }), /title is required/);
  assert.match(errs({ ...base, sections: [null, ...base.sections] }), /sections\.0: must be an object/);
  const withSection = (s) => errs({ ...base, sections: [...base.sections, s] });
  assert.match(withSection({ type: 'problem' }), /title is required[\s\S]*text is required/);
  assert.match(withSection({ type: 'faq', title: 'أسئلة', items: [{ q: 'س' }, null] }), /items\.0: a is required[\s\S]*items\.1: must be an object/);
  assert.match(withSection({ type: 'features', title: 'ما نقدمه', items: ['نص'] }), /items\.0: must be an object/);
  assert.match(withSection({ type: 'marquee', items: [{ title: 'x' }] }), /items\.0: must be a line of text/);
  assert.match(withSection({ type: 'stats', items: [{ value: '', label: 'عميل', source: 's' }] }), /value must be a number/);
  for (const href of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', 'vbscript:x', ' ', 'java\tscript:x']) assert.match(withSection({ type: 'cta', title: 'تواصل', cta: { label: 'اضغط', href } }), /link|cta needs label and href/, href);
  for (const href of ['#contact', 'https://example.com/a', 'mailto:a@example.com', 'tel:+201000000000', 'sms:+201000000000', 'https://wa.me/201000000000', 'menu.html', 'pages/menu.html#top']) assert.deepEqual(validate({ ...base, sections: [...base.sections, { type: 'cta', title: 'تواصل', cta: { label: 'اضغط', href } }] }).errors, [], href);
  assert.match(withSection({ type: 'cta', title: 'تواصل', cta: { label: 'اضغط', href: '#nowhere' } }), /"#nowhere" points at no section \(ids here: .*#contact/);
  assert.match(errs({ ...base, footer: { text: 'x', links: [{ label: 'سياسة', href: 'javascript:void(0)' }, { label: 'x' }] } }), /footer\.links\.0: link[\s\S]*footer\.links\.1: needs label and href/);
  assert.match(errs({ ...base, url: 'http://example.com' }), /url must be the site's public https address/);
  assert.match(errs({ ...base, shareImage: '../x.png' }), /shareImage must be/);
  assert.match(validate({ ...base, shareImage: 'share.png' }).warnings.join(), /shareImage needs "url"/);
});

test('build: a tab icon, sharing cards, a canonical link when the address is known, and layout widths that really change', () => {
  const dir = join(STUDIO, 'web/sites/example'), site = JSON.parse(readFileSync(join(dir, 'site.json'), 'utf8')), out = mkdtempSync(join(tmpdir(), 'web-'));
  try {
    build(site, out, { siteDir: dir });
    let html = readFileSync(join(out, 'index.html'), 'utf8');
    assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,/, 'no /favicon.ico request, so no 404 on every visit');
    assert.match(html, /<meta property="og:type" content="website">/); assert.match(html, /<meta property="og:site_name" content="نور">/); assert.match(html, /<meta name="twitter:card" content="summary">/);
    assert.doesNotMatch(html, /rel="canonical"|og:url|og:image/, 'nothing is invented when the address is unknown');
    assert.match(html, /<link rel="preload" href="assets\/fonts\/[^"]+\.woff2" as="font" type="font\/woff2" crossorigin>/); assert.doesNotMatch(html, /undefined/);
    build({ ...site, url: 'https://noor.example/menu', shareImage: 'https://noor.example/share.jpg' }, out, { siteDir: dir });
    html = readFileSync(join(out, 'index.html'), 'utf8');
    assert.match(html, /<link rel="canonical" href="https:\/\/noor\.example\/menu">/); assert.match(html, /og:image" content="https:\/\/noor\.example\/share\.jpg"/); assert.match(html, /twitter:card" content="summary_large_image"/);
    const css = readFileSync(join(out, 'assets/site.css'), 'utf8');
    assert.match(css, /\.wrap \{ width: min\(var\(--wrap, 1180px\)/, 'the wrap width is a variable');
    assert.match(css, /\.width-wide \{ --wrap: 1440px; \}/, '"wide" used to set a max-width the width rule ignored'); assert.match(css, /\.width-narrow \{ --wrap: 960px; \}/);
    assert.match(css, /scroll-padding-top/); assert.match(css, /@media print/); assert.match(css, /\.btn:active \{ transform: scale\(\.98\); \}/);
    assert.doesNotMatch(css, /\.btn:hover \{\s*\}|@keyframes slide/, 'no empty or dead rules');
    // a feature card without supporting text renders no empty paragraph
    build({ ...site, sections: [...site.sections, { type: 'features', id: 'what', title: 'ما نقدمه', items: [{ title: 'قهوة مختصة' }] }] }, out, { siteDir: dir });
    assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /<h3>قهوة مختصة<\/h3><\/article>/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('browser check: a missing stylesheet is red, a missing tab icon is a note, an unnamed button is red, a carousel is not page overflow', { skip: process.env.STUDIO_RENDER_TEST !== '1', timeout: 120000 }, async () => {
  const { checkSite } = await import('../web/lib/check.mjs'), { writeFileSync, mkdirSync } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'web-check-')), outDir = join(dir, 'out');
  const page = (extra) => `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>t</title><meta name="description" content="d">${extra.head || ''}</head><body style="margin:0;font:18px system-ui;background:#fff;color:#111"><h1>Title</h1><p>Some text for the page.</p>${extra.body || ''}</body></html>`;
  try {
    mkdirSync(outDir);
    writeFileSync(join(dir, 'bad.html'), page({ head: '<link rel="stylesheet" href="gone.css">', body: '<button style="width:48px;height:48px"></button><input name="q"><div style="overflow-x:auto;width:100%"><div style="width:3000px;height:60px"><a href="#" style="display:inline-block;margin-left:2000px;min-height:44px">far link</a></div></div>' }));
    writeFileSync(join(dir, 'good.html'), page({ head: '<link rel="icon" href="data:,">', body: '<button style="width:48px;height:48px" aria-label="Open menu"></button><label>Search <input name="q"></label>' }));
    const light = (r, id) => r.lights.find((l) => l.id === id);
    const bad = await checkSite({ dir, outDir, page: 'bad.html' });
    assert.equal(light(bad, 'missing-files').light, 'red'); assert.match(light(bad, 'missing-files').why, /gone\.css 404/);
    assert.equal(light(bad, 'names').light, 'red'); assert.ok(light(bad, 'names').items.some((x) => /button has no name/.test(x)) && light(bad, 'names').items.some((x) => /input\[q\] has no label/.test(x)));
    assert.equal(light(bad, 'no-sideways-scroll').light, 'green', 'content inside a sideways scroller does not widen the page');
    const good = await checkSite({ dir, outDir, page: 'good.html' });
    assert.equal(light(good, 'missing-files').light, 'green'); assert.equal(light(good, 'names').light, 'green');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
