// Studio web — a site is ONE site.json; this module plans it, validates it and builds a static, fast, accessible site (studio/web/WEB.md).
//   plan(brief)          → { site, todo }   house structure + the ambition questions, ‹…› where the model must write
//   validate(site)       → { errors, warnings }   placeholders, honesty (numbers and quotes need a source), alt text, links
//   build(site, outDir)  → { files, bytes }   index.html + site.css + motion.js + fonts (zero dependencies, no build step)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..'), FONTS = join(WEB, '..', 'assets', 'fonts');
export const STYLES = () => JSON.parse(readFileSync(join(WEB, 'styles', 'index.json'), 'utf8'));
const P = (what) => `‹${what}›`;
const PH = /[‹›]/;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const SECTION_TYPES = ['hero', 'problem', 'features', 'steps', 'ring', 'stats', 'quote', 'marquee', 'faq', 'cta'];

// ---------- plan: what a top professional would build, as a skeleton ----------
export function plan(brief = {}) {
  const ar = (brief.lang || 'ar') === 'ar';
  const site = {
    title: brief.title || brief.brand || P('site title'), lang: ar ? 'ar' : 'en', style: brief.style || 'paper-editorial',
    brand: { name: brief.brand || P('brand name exactly as the logo writes it'), ...(brief.logo ? { logo: brief.logo, logoAlt: brief.brand || P('logo alt text') } : {}) },
    description: brief.description || P('one sentence for search results, ≤ 155 characters'),
    // "be ambitious" (after Felix Rieseberg's prompt): decide like the best in the field before writing a line
    ambition: { topPro: P('what the best studio in this field would build for this client, in two lines'), rawMaterial: P('the rawest real material to start from: the client\'s own photos, words, product, numbers'), methods: P('the specific methods and tools they would use (e.g. sticky storytelling, a 3D ring of real products, a live demo)') },
    sections: [
      { type: 'hero', id: 'top', eyebrow: P('short label'), title: brief.promise || P('the promise, ≤ 7 words'), subtitle: P('who it is for and what changes, one sentence'), cta: { label: brief.cta || P('one action'), href: brief.ctaHref || '#contact' }, visual: 'orb' },
      { type: 'problem', id: 'why', label: P('nav label'), title: brief.problem || P('the visitor\'s problem in their words'), text: P('two sentences that name the cost of the problem') },
      { type: 'features', id: 'what', label: P('nav label'), title: P('what you get, ≤ 6 words'), items: [1, 2, 3].map((i) => ({ icon: ['✦', '◐', '↗'][i - 1], title: P(`benefit ${i}, ≤ 4 words`), text: P(`proof of benefit ${i}, one sentence`) })) },
      { type: 'steps', id: 'how', label: P('nav label'), title: P('how it works, ≤ 5 words'), items: [1, 2, 3].map((i) => ({ title: P(`step ${i}`), text: P(`what happens in step ${i}, one sentence`) })) },
      { type: 'ring', id: 'work', label: P('nav label'), title: P('real work / products / menu, ≤ 5 words'), hint: ar ? 'اسحب للّف' : 'Drag to spin', items: [1, 2, 3, 4, 5, 6].map((i) => ({ title: P(`item ${i}`), text: P(`one line about item ${i}`) })) },
      { type: 'faq', id: 'faq', label: P('nav label'), title: P('questions people ask'), items: [1, 2, 3].map((i) => ({ q: P(`question ${i}`), a: P(`answer ${i}`) })) },
      { type: 'cta', id: 'contact', title: P('the closing promise'), text: P('one reassuring sentence'), cta: { label: brief.cta || P('one action'), href: brief.ctaHref || P('mailto:, tel:, wa.me link or form URL') } },
    ],
    footer: { text: P('© year, brand'), links: [] },
    honesty: 'Only the client\'s words, photos, numbers and real quotes; stats and quotes carry a source.',
  };
  const todo = []; const walk = (o, path) => { if (typeof o === 'string' && PH.test(o)) todo.push({ path, write: o.replace(/[‹›]/g, '') }); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k); };
  walk(site, '');
  return { site, todo };
}

// ---------- validate ----------
export function validate(site) {
  const errors = [], warnings = [], E = (m) => errors.push(m), W = (m) => warnings.push(m);
  if (!site || typeof site !== 'object') return { errors: ['site.json must be an object'], warnings };
  const strings = []; const walk = (o, path) => { if (typeof o === 'string') strings.push([path, o]); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k); };
  walk(site, '');
  for (const [path, s] of strings) if (PH.test(s)) E(`${path}: placeholder left ("${s.slice(0, 60)}") — write the real text`);
  if (!STYLES().styles.some((s) => s.slug === site.style)) E(`style "${site.style}" unknown (${STYLES().styles.map((s) => s.slug).join(', ')})`);
  if (!['ar', 'en'].includes(site.lang)) E('lang must be "ar" or "en"');
  if (!Array.isArray(site.sections) || !site.sections.length) return { errors: [...errors, 'sections must be a nonempty array'], warnings };
  if (site.sections[0].type !== 'hero') W('the first section is usually the hero: the promise and one action above the fold');
  const ids = new Set();
  site.sections.forEach((s, i) => {
    const at = `sections.${i} (${s?.type})`;
    if (!SECTION_TYPES.includes(s?.type)) { E(`${at}: unknown type (use ${SECTION_TYPES.join(', ')})`); return; }
    if (s.id) { if (!/^[a-z][a-z0-9-]*$/.test(s.id) || ids.has(s.id)) E(`${at}: id must be unique lowercase words`); ids.add(s.id); }
    if (['features', 'steps', 'ring', 'stats', 'faq', 'marquee'].includes(s.type) && (!Array.isArray(s.items) || !s.items.length)) E(`${at}: items must be a nonempty array`);
    if (s.type === 'stats') for (const [j, it] of (s.items || []).entries()) { if (!Number.isFinite(+it.value)) E(`${at}.items.${j}: value must be a number`); if (!it.source) E(`${at}.items.${j}: a number on a site needs its source (skill data-honesty)`); }
    if (s.type === 'quote' && (!s.name || !s.source)) E(`${at}: a quote needs the real person's name and a source (permission, link or date)`);
    if (s.type === 'ring' && (s.items || []).length < 5) W(`${at}: a 3D ring reads best with 5–10 items`);
    if (s.cta && (!s.cta.label || !s.cta.href)) E(`${at}: cta needs label and href`);
    if (s.image && !s.imageAlt) E(`${at}: image needs imageAlt`);
    if ((s.title || '').split(/\s+/).length > 12) W(`${at}: title has ${(s.title || '').split(/\s+/).length} words — headlines read best under 10`);
  });
  if (site.brand?.logo && !site.brand.logoAlt) E('brand.logo needs brand.logoAlt');
  if (!site.description || site.description.length > 170) W('description should be one sentence ≤ 155 characters (search results)');
  if (!site.sections.some((s) => s.cta)) E('no call to action anywhere: give the hero or the closing section a cta');
  return { errors, warnings };
}

// ---------- build ----------
const sectionHtml = (s, i, ar) => {
  const id = s.id ? ` id="${esc(s.id)}"` : '', h = (t, lvl = 2) => `<h${lvl}${lvl === 1 ? '' : ' data-split'}>${esc(t)}</h${lvl}>`;
  const cta = (c, cls = '') => c ? `<a class="btn ${cls}" href="${esc(c.href)}" data-magnetic>${esc(c.label)}</a>` : '';
  switch (s.type) {
    case 'hero': return `<section class="hero"${id}><div class="wrap"><div>${s.eyebrow ? `<p class="label" data-reveal>${esc(s.eyebrow)}</p>` : ''}<h1 data-split>${esc(s.title)}</h1>${s.subtitle ? `<p class="sub" data-reveal>${esc(s.subtitle)}</p>` : ''}<div class="actions" data-reveal>${cta(s.cta)}${cta(s.secondary, 'ghost')}</div></div>
<div class="visual" data-parallax="0.12">${s.image ? `<img src="${esc(s.image)}" alt="${esc(s.imageAlt)}" width="900" height="900" fetchpriority="high">` : '<div class="orb" aria-hidden="true"></div>'}</div></div></section>`;
    case 'problem': return `<section class="problem"${id}><div class="wrap">${h(s.title)}<p class="muted" data-reveal>${esc(s.text)}</p></div></section>`;
    case 'features': return `<section class="features"${id}><div class="wrap">${h(s.title)}${s.text ? `<p class="muted" data-reveal>${esc(s.text)}</p>` : ''}<div class="grid">${s.items.map((it) => `<article class="card" data-reveal>${it.icon ? `<div class="icon" aria-hidden="true">${esc(it.icon)}</div>` : ''}<h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></article>`).join('')}</div></div></section>`;
    case 'steps': return `<section class="steps" data-steps${id}><div class="wrap"><div class="pin" aria-hidden="true">${s.items.map((_, k) => `<span${k ? '' : ' class="on"'}>${(k + 1).toLocaleString(ar ? 'ar-EG' : 'en')}</span>`).join('')}</div><div>${h(s.title)}${s.items.map((it, k) => `<div data-step="${k}"><h3>${esc(it.title)}</h3><p class="muted">${esc(it.text)}</p></div>`).join('')}</div></div></section>`;
    case 'ring': return `<section class="ring-sec"${id}><div class="wrap">${h(s.title)}${s.hint ? `<p class="label">${esc(s.hint)}</p>` : ''}<div class="ring" data-ring tabindex="0" role="region" aria-label="${esc(s.title)}"><div class="ring-stage">${s.items.map((it) => `<article class="ring-card">${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.imageAlt || it.title)}" loading="lazy">` : ''}<h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></article>`).join('')}</div></div></div></section>`;
    case 'stats': return `<section class="stats"${id}><div class="wrap">${s.title ? h(s.title) : ''}<div class="grid">${s.items.map((it) => `<div class="stat" data-reveal><b data-count="${+it.value}">${(+it.value).toLocaleString(ar ? 'ar-EG' : 'en')}</b>${it.suffix ? `<span>${esc(it.suffix)}</span>` : ''}<p>${esc(it.label)}</p><small>${esc(it.source)}</small></div>`).join('')}</div></div></section>`;
    case 'quote': return `<section class="quote"${id}><div class="wrap"><blockquote data-reveal>${esc(s.text)}</blockquote><p class="who" data-reveal>${esc(s.name)}${s.role ? ` · ${esc(s.role)}` : ''}</p></div></section>`;
    case 'marquee': return `<div class="marquee" aria-hidden="true"><div class="track">${[...s.items, ...s.items].map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>`;
    case 'faq': return `<section class="faq"${id}><div class="wrap">${h(s.title)}${s.items.map((it) => `<details data-reveal><summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join('')}</div></section>`;
    case 'cta': return `<section class="cta-final"${id}><div class="wrap">${h(s.title)}${s.text ? `<p class="muted" data-reveal>${esc(s.text)}</p>` : ''}<div data-reveal>${cta(s.cta)}</div></div></section>`;
    default: return '';
  }
};
export function build(site, outDir, { siteDir } = {}) {
  const v = validate(site);
  if (v.errors.length) throw Object.assign(new Error(`site.json has ${v.errors.length} error(s):\n- ${v.errors.join('\n- ')}`), { validation: v });
  const S = STYLES(), style = S.styles.find((x) => x.slug === site.style), ar = site.lang === 'ar';
  rmSync(outDir, { recursive: true, force: true }); mkdirSync(join(outDir, 'assets', 'fonts'), { recursive: true });
  const faces = [...new Set(Object.values(style.fonts))].flatMap((fam) => (S.faces[fam] || []).map((f) => { copyFileSync(join(FONTS, f.file), join(outDir, 'assets', 'fonts', f.file));
    return `@font-face{font-family:'${fam}';src:url('assets/fonts/${f.file}') format('${f.file.endsWith('.woff2') ? 'woff2' : 'truetype'}');font-weight:${f.weight};font-display:swap;${f.range ? `unicode-range:${f.range};` : ''}}`; })).join('\n');
  const vars = `:root{${Object.entries(style.tokens).map(([k, val]) => `--${k}:${val}`).join(';')};--font-display:'${style.fonts.display}',system-ui,sans-serif;--font-text:'${style.fonts.text}',system-ui,sans-serif;--font-label:'${style.fonts.label}',ui-monospace,monospace}`;
  writeFileSync(join(outDir, 'assets', 'site.css'), `${faces}\n${vars}\n${readFileSync(join(WEB, 'motion', 'site.css'), 'utf8')}`);
  copyFileSync(join(WEB, 'motion', 'motion.js'), join(outDir, 'assets', 'motion.js'));
  // site images (logo, hero, ring items) are copied from the site folder; only local relative paths are allowed
  const media = [site.brand?.logo, ...site.sections.flatMap((s) => [s.image, ...(s.items || []).map((it) => it?.image)])].filter((p) => p && !/^https?:/.test(p));
  for (const m of media) { if (!siteDir || !existsSync(join(siteDir, m))) throw new Error(`missing image ${m} (put it next to site.json)`); mkdirSync(dirname(join(outDir, m)), { recursive: true }); copyFileSync(join(siteDir, m), join(outDir, m)); }
  const nav = site.sections.filter((s) => s.id && s.label && s.type !== 'hero').map((s) => `<a href="#${esc(s.id)}">${esc(s.label)}</a>`).join('');
  const html = `<!doctype html>
<html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.title)}</title>
<meta name="description" content="${esc(site.description)}">
<meta property="og:title" content="${esc(site.title)}">
<meta property="og:description" content="${esc(site.description)}">
<meta name="theme-color" content="${style.tokens.bg}">
<link rel="preload" href="assets/fonts/${(S.faces[style.fonts.display] || [{}])[0].file}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<script src="assets/motion.js" defer></script>
</head>
<body>
<a class="skip" href="#main">${ar ? 'تخطَّ إلى المحتوى' : 'Skip to content'}</a>
<div class="progress" aria-hidden="true"></div>
<header class="top"><div class="wrap"><a class="brand" href="#top">${site.brand.logo ? `<img src="${esc(site.brand.logo)}" alt="${esc(site.brand.logoAlt)}" width="120" height="34">` : ''}<span>${esc(site.brand.name)}</span></a><nav class="nav" aria-label="${ar ? 'الأقسام' : 'Sections'}">${nav}</nav></div></header>
<main id="main">
${site.sections.map((s, i) => sectionHtml(s, i, ar)).join('\n')}
</main>
<footer><div class="wrap"><span>${esc(site.footer?.text || site.brand.name)}</span><span>${(site.footer?.links || []).map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join(' · ')}</span></div></footer>
</body>
</html>
`;
  writeFileSync(join(outDir, 'index.html'), html);
  const files = []; const list = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? list(p) : files.push(p); } }; list(outDir);
  return { files: files.map((f) => f.slice(outDir.length + 1)), bytes: files.reduce((s, f) => s + statSync(f).size, 0), warnings: v.warnings };
}
