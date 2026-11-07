// Studio web — a site is ONE site.json; this module plans it, validates it and builds a static, fast, accessible site (studio/web/WEB.md).
//   plan(brief)          → { site, todo }   house structure + the ambition questions, ‹…› where the model must write
//   validate(site)       → { errors, warnings }   placeholders, honesty (numbers and quotes need a source), alt text, links
//   build(site, outDir)  → { files, bytes }   index.html + site.css + motion.js + fonts (zero dependencies, no build step)
//   fakeContacts(site)   → warnings for placeholder phones/emails (555, 0100000000, example.com …) (skill data-honesty)
//   portable(outDir)     → problems that stop dist/ working as ONE drag-and-drop folder (root-absolute or missing local files)
//   replaceSection(site, id, section) → a new site with one section swapped (`web edit`)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..'), FONTS = join(WEB, '..', 'assets', 'fonts');
export const STYLES = () => JSON.parse(readFileSync(join(WEB, 'styles', 'index.json'), 'utf8'));
const P = (what) => `‹${what}›`;
const PH = /[‹›]/;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const SECTION_TYPES = ['hero', 'problem', 'features', 'steps', 'story', 'ring', 'stats', 'quote', 'marquee', 'faq', 'cta'];
// The hero motion (2026-11-06, WEB.md "Hero motion"): ONE scroll-drawn line per site that means something for this business
// (water through a pipe, a launch trajectory, a production timeline, a pen line). Stations sit along it; reduced motion = drawn.
export const STORY_SHAPES = {
  pipe: 'M60 0 V200 H104 V460 H16 V740 H60 V1000',
  trajectory: 'M60 1000 C 6 760, 114 520, 60 300 S 40 80, 60 0',
  timeline: 'M60 0 V1000',
  pen: 'M60 0 C 112 120, 8 240, 60 360 S 112 600, 60 720 S 8 900, 60 1000',
};

// Per-site design settings are data, never raw CSS. Existing presets remain fallbacks.
const contrast = (a, b) => {
  const luminance = hex => { const v=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return v[0]*0.2126+v[1]*0.7152+v[2]*0.0722; };
  const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
};
export function resolveDesign(site) {
  const catalog=STYLES(), base=catalog.styles.find(x=>x.slug===site.style);
  const errors=[];
  if(!base)return {errors:[`unknown style ${site.style}`]};
  const theme=site.theme ?? {}, layout=site.layout ?? {};
  const object=x=>x && typeof x==='object' && !Array.isArray(x);
  if(!object(theme)||!object(layout))return {errors:['theme and layout must be objects']};
  const tokens={...base.tokens},fonts={...base.fonts};
  for(const key of Object.keys(theme))if(!['tokens','fonts'].includes(key))errors.push(`unknown theme field ${key}`);
  for(const [group,target] of [['tokens',tokens],['fonts',fonts]]){
    if(theme[group]!==undefined&&!object(theme[group])){errors.push(`theme.${group} must be an object`);continue;}
    for(const [key,value] of Object.entries(theme[group]||{})){
      if(!Object.hasOwn(target,key)){errors.push(`unknown theme.${group}.${key}`);continue;}
      if(typeof value!=='string'){errors.push(`theme.${group}.${key} must be a string`);continue;}
      if(group==='tokens'){
        if(key==='radius' ? !/^(?:[0-9]|[1-3][0-9]|4[0-8])px$/.test(value) : !/^#[0-9a-fA-F]{6}$/.test(value)){errors.push(`invalid theme token ${key}`);continue;}
      }else{
        if(!Object.hasOwn(catalog.faces,value)){errors.push(`unknown font ${value}`);continue;}
        if(site.lang==='ar'&&!catalog.faces[value].some(f=>(f.range||'').includes('U+0600'))){errors.push(`font ${value} lacks a registered Arabic face`);continue;}
      }
      target[key]=value;
    }
  }
  for(const [foreground,background] of [['ink','bg'],['muted','bg'],['accent-ink','accent'],['card-ink','card']])if(contrast(tokens[foreground],tokens[background])<4.5)errors.push(`theme contrast ${foreground}/${background} must be at least 4.5:1`);
  const choices={hero:['split','media-first','stacked'],features:['rows','grid'],width:['narrow','standard','wide']};
  for(const [key,value] of Object.entries(layout))if(!choices[key]?.includes(value))errors.push(`invalid layout.${key}`);
  return {errors,style:{...base,tokens,fonts},layout:{hero:'split',features:'rows',width:'standard',...layout}};
}

// ---------- plan: what a top professional would build, as a skeleton ----------
export function plan(brief = {}) {
  const ar = (brief.lang || 'ar') === 'ar';
  const site = {
    title: brief.title || brief.brand || P('site title'), lang: ar ? 'ar' : 'en', style: brief.style || 'paper-editorial',
    brand: { name: brief.brand || P('brand name exactly as the logo writes it'), ...(brief.logo ? { logo: brief.logo, logoAlt: brief.brand || P('logo alt text') } : {}) },
    description: brief.description || P('one sentence for search results, ≤ 155 characters'),
    // "be ambitious" (after Felix Rieseberg's prompt): decide like the best in the field before writing a line
    ambition: { topPro: P('what the best studio in this field would build for this client, in two lines'), rawMaterial: P('the rawest real material to start from: the client\'s own photos, words, product, numbers'), methods: P('the specific methods and tools they would use (choose methods only after defining the visitor task)') },
    sections: [
      { type: 'hero', id: 'top', title: brief.promise || P('the promise, ≤ 7 words'), subtitle: P('who it is for and what changes, one sentence'), cta: { label: brief.cta || P('one action'), href: brief.ctaHref || '#contact' } },
      { type: 'features', id: 'what', label: P('nav label'), title: P('what you get, ≤ 6 words'), items: Array.isArray(brief.items) && brief.items.length ? brief.items : [{ title: P('specific offering'), text: P('supporting detail verified by the client') }] },
      { type: 'cta', id: 'contact', title: P('next action, stated plainly'), text: P('practical details needed to take that action'), cta: { label: brief.cta || P('one action'), href: brief.ctaHref || P('mailto:, tel:, wa.me link or form URL') } },
    ],
    footer: { text: P('© year, brand'), links: [] },
    honesty: 'Only the client\'s words, photos, numbers and real quotes; stats and quotes carry a source.',
  };
  const todo = []; const walk = (o, path) => { if (typeof o === 'string' && PH.test(o)) todo.push({ path, write: o.replace(/[‹›]/g, '') }); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k); };
  walk(site, '');
  return { site, todo };
}

// media: relative paths that stay inside the site folder (copied into dist at the same path), or https URLs
const mediaOf = (site) => [site.brand?.logo, ...(site.sections || []).flatMap((s) => [s?.image, ...(Array.isArray(s?.items) ? s.items : []).map((it) => it?.image)])].filter((p) => typeof p === 'string' && p);
export const safeMedia = (p) => /^https:\/\//.test(p) || (!/^([a-z]+:|\/|\\)/i.test(p) && !p.split(/[\\/]/).includes('..'));

// ---------- validate ----------
// The site's design record (WEB.md "One workflow"): stages A–D written, no ‹…› left. Builds and checks refuse without it (draft excepted).
export function designRecord(siteDir) {
  const p = join(siteDir, 'DESIGN.md');
  if (!existsSync(p)) return { ok: false, errors: ['no DESIGN.md: copy web/templates/DESIGN.md and fill stages A–D (WEB.md "One workflow")'] };
  const md = readFileSync(p, 'utf8'), left = (md.match(/‹[^›]*›/g) || []).length;
  const missing = ['## A.', '## B.', '## C.', '## D.'].filter((h) => !md.includes(h));
  const errors = [...(left ? [`DESIGN.md: ${left} ‹…› placeholder(s) left`] : []), ...missing.map((h) => `DESIGN.md: section "${h}" missing`)];
  return { ok: !errors.length, errors };
}

export function validate(site) {
  const errors = [], warnings = [], E = (m) => errors.push(m), W = (m) => warnings.push(m);
  if (!site || typeof site !== 'object') return { errors: ['site.json must be an object'], warnings };
  errors.push(...resolveDesign(site).errors);
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
    if (s.type === 'story') {
      if (!Object.hasOwn(STORY_SHAPES, s.shape)) E(`${at}: shape must be one of ${Object.keys(STORY_SHAPES).join(', ')}`);
      if (!s.why || String(s.why).trim().length < 12) E(`${at}: the hero motion needs "why": what it means for this business, one sentence (also in DESIGN.md §C)`);
      if (!Array.isArray(s.items) || !s.items.length) E(`${at}: items must be a nonempty array (the stations along the line)`);
    }
    if (s.type === 'quote' && (!s.name || !s.source)) E(`${at}: a quote needs the real person's name and a source (permission, link or date)`);

    if (s.cta && (!s.cta.label || !s.cta.href)) E(`${at}: cta needs label and href`);
    if (s.image && !s.imageAlt) E(`${at}: image needs imageAlt`);
    if (s.imageWidth !== undefined || s.imageHeight !== undefined) { if (![s.imageWidth,s.imageHeight].every(n=>Number.isInteger(n)&&n>0&&n<=16384)) E(`${at}: image dimensions must be positive integers up to 16384`); }
    if (s.imageFit !== undefined && !['contain','cover'].includes(s.imageFit)) E(`${at}: imageFit must be contain or cover`);
    if ((s.title || '').split(/\s+/).length > 12) W(`${at}: title has ${(s.title || '').split(/\s+/).length} words — headlines read best under 10`);
  });
  if (site.sections.filter((s) => s?.type === 'story').length > 1) E('one hero motion per site: keep one story section (WEB.md "Hero motion")');
  warnings.push(...fakeContacts(site));
  if (site.brand?.logo && !site.brand.logoAlt) E('brand.logo needs brand.logoAlt');
  for (const m of mediaOf(site)) if (!safeMedia(m)) E(`image path "${m}" must be a relative path inside the site folder (no "..", no absolute path) or an https URL`);
  if (!site.description || site.description.length > 170) W('description should be one sentence ≤ 155 characters (search results)');
  if (!site.sections.some((s) => s.cta)) E('no call to action anywhere: give the hero or the closing section a cta');
  return { errors, warnings };
}

// Placeholder contact details read as real to a visitor (and to the client): warn, never silently ship them (skill data-honesty).
const FAKE_PHONE = [/(?:^|\D)\(?555\)?[\s.-]?\d{3,4}/, /(\d)(?:[\s.-]?\1){6,}/, /0?123[\s.-]?456[\s.-]?78(?:9|90)?/, /x{3,}/i];
const FAKE_MAIL = /[\w.+-]+@(?:example\.(?:com|org|net)|test\.com|email\.com|domain\.com|yourdomain\.\w+|company\.com|mail\.com)\b|\b(?:test|you|your|name|user|email)@[\w.-]+/i;
export function fakeContacts(site) {
  const out = [], seen = new Set();
  const walk = (o, path) => {
    if (typeof o === 'string') {
      const v = o.replace(/^(tel:|mailto:|https:\/\/wa\.me\/)/i, ''), phoneish = /^(tel:|https:\/\/wa\.me\/)/i.test(o) || /\+?\d[\d\s().-]{5,}\d/.test(o);
      const hit = (FAKE_MAIL.test(o) && 'email') || (phoneish && FAKE_PHONE.some((r) => r.test(v)) && 'phone');
      if (hit && !seen.has(path)) { seen.add(path); out.push(`${path}: "${o.slice(0, 50)}" looks like a placeholder ${hit} — use the client's real contact or remove it (skill data-honesty)`); }
    } else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(site, '');
  return out;
}

// `web edit <site> --section=<id>`: change one section only; everything else stays byte-for-byte the same.
export function replaceSection(site, id, section) {
  const i = (site.sections || []).findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`no section with id "${id}" (ids: ${(site.sections || []).map((s) => s.id).filter(Boolean).join(', ') || 'none — give sections an id'})`);
  if (!section || typeof section !== 'object' || Array.isArray(section)) throw new Error('the new section must be a JSON object');
  return { ...site, sections: site.sections.map((s, k) => (k === i ? { ...section, id } : s)) };
}

// dist/ must work as one folder dropped on any static host (Netlify drag-and-drop, GitHub Pages, a USB stick): relative paths only.
export function portable(outDir) {
  const problems = [], files = [];
  const list = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? list(p) : files.push(p); } };
  list(outDir);
  for (const f of files.filter((x) => /\.(html|css)$/.test(x))) {
    const text = readFileSync(f, 'utf8'), base = dirname(f), rel = f.slice(outDir.length + 1);
    const refs = [...text.matchAll(/(?:src|href)="([^"]+)"|url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1] || m[2]);
    for (const r of refs) {
      if (/^(https:|mailto:|tel:|#|data:|sms:|whatsapp:)/i.test(r)) continue;
      if (/^http:/i.test(r)) { problems.push(`${rel}: insecure link ${r}`); continue; }
      if (/^\/|^[a-z]:\\/i.test(r)) { problems.push(`${rel}: root-absolute path ${r} breaks when the folder is moved; make it relative`); continue; }
      let clean = r.split(/[?#]/)[0]; try { clean = decodeURI(clean); } catch {}
      if (clean && !existsSync(join(base, clean))) problems.push(`${rel}: ${r} is not inside the folder`);
    }
  }
  return problems;
}

// ---------- build ----------
const sectionHtml = (s, i, ar) => {
  const id = s.id ? ` id="${esc(s.id)}"` : '', h = (t, lvl = 2) => `<h${lvl}>${esc(t)}</h${lvl}>`;
  const cta = (c, cls = '') => c ? `<a class="btn ${cls}" href="${esc(c.href)}">${esc(c.label)}</a>` : '';
  switch (s.type) {
    case 'hero': return `<section class="hero${s.image ? '' : ' hero-text'}"${id}><div class="wrap"><div>${s.eyebrow ? `<p class="label"${s.motion === 'reveal' ? ' data-reveal' : ''}>${esc(s.eyebrow)}</p>` : ''}<h1>${esc(s.title)}</h1>${s.subtitle ? `<p class="sub"${s.motion === 'reveal' ? ' data-reveal' : ''}>${esc(s.subtitle)}</p>` : ''}<div class="actions"${s.motion === 'reveal' ? ' data-reveal' : ''}>${cta(s.cta)}${cta(s.secondary, 'ghost')}</div></div>
${s.image ? `<div class="visual ${s.imageFit || 'contain'}"><img src="${esc(s.image)}" alt="${esc(s.imageAlt)}" width="${s.imageWidth || 900}" height="${s.imageHeight || 900}" fetchpriority="high"></div>` : ''}</div></section>`;
    case 'problem': return `<section class="problem"${id}><div class="wrap">${h(s.title)}<p class="muted"${s.motion === 'reveal' ? ' data-reveal' : ''}>${esc(s.text)}</p></div></section>`;
    case 'features': return `<section class="features"${id}><div class="wrap">${h(s.title)}${s.text ? `<p class="muted"${s.motion === 'reveal' ? ' data-reveal' : ''}>${esc(s.text)}</p>` : ''}<div class="grid">${s.items.map((it) => `<article class="card"${s.motion === 'reveal' ? ' data-reveal' : ''}>${it.icon ? `<div class="icon" aria-hidden="true">${esc(it.icon)}</div>` : ''}<h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></article>`).join('')}</div></div></section>`;
    case 'steps': return `<section class="steps" data-steps${id}><div class="wrap"><div class="pin" aria-hidden="true">${s.items.map((_, k) => `<span${k ? '' : ' class="on"'}>${(k + 1).toLocaleString(ar ? 'ar-EG' : 'en')}</span>`).join('')}</div><div>${h(s.title)}${s.items.map((it, k) => `<div data-step="${k}"><h3>${esc(it.title)}</h3><p class="muted">${esc(it.text)}</p></div>`).join('')}</div></div></section>`;
    case 'story': return `<section class="story story-${esc(s.shape)}" data-story${id}><div class="wrap"><div class="story-line" aria-hidden="true"><svg viewBox="0 0 120 1000" preserveAspectRatio="none"><path class="story-track" d="${STORY_SHAPES[s.shape]}"/><path class="story-fill" d="${STORY_SHAPES[s.shape]}"/></svg><span class="story-tip"></span></div><div>${s.title ? h(s.title) : ''}${s.text ? `<p class="muted">${esc(s.text)}</p>` : ''}<ol class="story-stops">${s.items.map((it, k) => `<li data-stop="${k}"><h3>${esc(it.title)}</h3>${it.text ? `<p class="muted">${esc(it.text)}</p>` : ''}</li>`).join('')}</ol></div></div></section>`;
    case 'ring': return `<section class="ring-sec"${id}><div class="wrap">${h(s.title)}${s.hint ? `<p class="label">${esc(s.hint)}</p>` : ''}<div class="ring" data-ring tabindex="0" role="region" aria-label="${esc(s.title)}"><div class="ring-stage">${s.items.map((it) => `<article class="ring-card">${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.imageAlt || it.title)}" loading="lazy">` : ''}<h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></article>`).join('')}</div></div></div></section>`;
    case 'stats': return `<section class="stats"${id}><div class="wrap">${s.title ? h(s.title) : ''}<div class="grid">${s.items.map((it) => `<div class="stat"${s.motion === 'reveal' ? ' data-reveal' : ''}><b>${(+it.value).toLocaleString(ar ? 'ar-EG' : 'en')}</b>${it.suffix ? `<span>${esc(it.suffix)}</span>` : ''}<p>${esc(it.label)}</p><small>${esc(it.source)}</small></div>`).join('')}</div></div></section>`;
    case 'quote': return `<section class="quote"${id}><div class="wrap"><blockquote${s.motion === 'reveal' ? ' data-reveal' : ''}>${esc(s.text)}</blockquote><p class="who"${s.motion === 'reveal' ? ' data-reveal' : ''}>${esc(s.name)}${s.role ? ` · ${esc(s.role)}` : ''}</p></div></section>`;
    case 'marquee': return `<div class="marquee"><div class="track">${s.items.map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>`;
    case 'faq': return `<section class="faq"${id}><div class="wrap">${h(s.title)}${s.items.map((it) => `<details${s.motion === 'reveal' ? ' data-reveal' : ''}><summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join('')}</div></section>`;
    case 'cta': return `<section class="cta-final"${id}><div class="wrap">${h(s.title)}${s.text ? `<p class="muted"${s.motion === 'reveal' ? ' data-reveal' : ''}>${esc(s.text)}</p>` : ''}<div${s.motion === 'reveal' ? ' data-reveal' : ''}>${cta(s.cta)}</div></div></section>`;
    default: return '';
  }
};
export function build(site, outDir, { siteDir } = {}) {
  const v = validate(site);
  if (v.errors.length) throw Object.assign(new Error(`site.json has ${v.errors.length} error(s):\n- ${v.errors.join('\n- ')}`), { validation: v });
  const S = STYLES(), {style,layout}=resolveDesign(site), ar = site.lang === 'ar';
  rmSync(outDir, { recursive: true, force: true }); mkdirSync(join(outDir, 'assets', 'fonts'), { recursive: true });
  const faces = [...new Set(Object.values(style.fonts))].flatMap((fam) => (S.faces[fam] || []).map((f) => { copyFileSync(join(FONTS, f.file), join(outDir, 'assets', 'fonts', f.file));
    return `@font-face{font-family:'${fam}';src:url('fonts/${f.file}') format('${f.file.endsWith('.woff2') ? 'woff2' : 'truetype'}');font-weight:${f.weight};font-display:swap;${f.range ? `unicode-range:${f.range};` : ''}}`; })).join('\n');
  const vars = `:root{${Object.entries(style.tokens).map(([k, val]) => `--${k}:${val}`).join(';')};--font-display:'${style.fonts.display}',system-ui,sans-serif;--font-text:'${style.fonts.text}',system-ui,sans-serif;--font-label:'${style.fonts.label}',ui-monospace,monospace}`;
  writeFileSync(join(outDir, 'assets', 'site.css'), `${faces}\n${vars}\n${readFileSync(join(WEB, 'motion', 'site.css'), 'utf8')}`);
  copyFileSync(join(WEB, 'motion', 'motion.js'), join(outDir, 'assets', 'motion.js'));
  // site images (logo, hero, ring items) are copied from the site folder; only local relative paths are allowed
  const media = mediaOf(site).filter((p) => !/^https:/.test(p));
  for (const m of media) { if (!siteDir || !existsSync(join(siteDir, m))) throw new Error(`missing image ${m} (put it next to site.json)`); mkdirSync(dirname(join(outDir, m)), { recursive: true }); copyFileSync(join(siteDir, m), join(outDir, m)); }
  // photos/ (WEB.md "Photos folder"): the client's or free-licence photos sit in web/sites/<site>/photos/ with photos/CREDITS.json
  // ([{ file, source, author, licence }]); every photo is copied, and a photo without a credit row is a warning (ASSETS.md licence rule).
  const photoWarnings = [];
  if (siteDir && existsSync(join(siteDir, 'photos'))) {
    const pics = readdirSync(join(siteDir, 'photos')).filter((f) => /\.(jpe?g|png|webp|avif|gif|svg)$/i.test(f));
    let credits = [];
    try { credits = existsSync(join(siteDir, 'photos', 'CREDITS.json')) ? JSON.parse(readFileSync(join(siteDir, 'photos', 'CREDITS.json'), 'utf8')) : []; } catch { photoWarnings.push('photos/CREDITS.json is not valid JSON'); }
    mkdirSync(join(outDir, 'photos'), { recursive: true });
    for (const f of pics) {
      copyFileSync(join(siteDir, 'photos', f), join(outDir, 'photos', f));
      const c = Array.isArray(credits) && credits.find((x) => x?.file === f);
      if (!c || !c.source || !c.licence) photoWarnings.push(`photos/${f}: no source + licence row in photos/CREDITS.json (ASSETS.md: every photo's source and licence; Unsplash photos carry the Unsplash License)`);
    }
  }
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
<body class="hero-${layout.hero} features-${layout.features} width-${layout.width}">
<a class="skip" href="#main">${ar ? 'تخطَّ إلى المحتوى' : 'Skip to content'}</a>
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
  return { files: files.map((f) => f.slice(outDir.length + 1)), bytes: files.reduce((s, f) => s + statSync(f).size, 0), warnings: [...v.warnings, ...photoWarnings, ...portable(outDir).map((p) => `not portable: ${p}`)] };
}
