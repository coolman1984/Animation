// Studio web quality gate: open the built site in headless Chromium at phone, tablet and desktop sizes and check what a top studio
// checks before launch — nothing overflows, every image has alt text, type is readable with enough contrast, taps are big enough,
// motion never hides content, reduced-motion visitors get a still page, no script errors, the page is light. Plus screenshots.
// Taste lights (yellow only: borrowed thresholds warn, they never block — CRAFT "calibrate taste on the owner"), adapted from
// taste-skill (Leonxlnx, MIT: a study of 247 award sites) and Impeccable (Paul Bakaus, Apache-2.0: AI-design detector rules), measured here:
// headlines ≤ 2 lines, ≤ 2 typefaces, no decorative gradients / resting shadows / glows, tinted neutrals, no grey text on colour,
// no tiny tracked caps, 45–75 characters per line, no bounce easing, no blank stretch over half a screen, enough moving parts, hero media.
//   checkSite({ dir, outDir }) → { lights: [{ id, light, why }], viewports: [{ name, w, h, sheet, ...measures }], verdict }
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, screenshot } from '../../lib/cdp.mjs';
import { serve } from '../../lib/serve.mjs';

export const VIEWPORTS = [{ name: 'phone', w: 390, h: 844, mobile: true }, { name: 'tablet', w: 820, h: 1180, mobile: true }, { name: 'desktop', w: 1440, h: 900, mobile: false }];
const sizeOf = (d) => readdirSync(d).reduce((s, f) => { const p = join(d, f); return s + (statSync(p).isDirectory() ? sizeOf(p) : statSync(p).size); }, 0);

// runs inside the page
const PROBE = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const H = () => document.documentElement.scrollHeight;
  for (let y = 0; y <= H(); y += innerHeight * 0.6) { scrollTo({ top: y, behavior: 'instant' }); await wait(140); }
  scrollTo({ top: H(), behavior: 'instant' }); await wait(500);
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p); if (/(hidden|clip)/.test(o.overflowX + o.overflow) || p.closest('.ring, .marquee')) return true; } return false; };
  const solid = (c) => { const m = c.match(/[\\d.]+/g); if (!m) return null; const k = /^color\\(srgb/.test(c) ? 255 : 1; const a = c.includes('/') ? +m[3] : m[3]; return a === undefined || +a > 0.9 ? m.slice(0, 3).map((v) => +v * k) : null; };   // rgb() and color(srgb …) (what color-mix computes to)
  const bgOf = (el) => { for (let p = el; p; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.backgroundImage !== 'none' && !p.matches('body, html')) return null; const s = solid(cs.backgroundColor); if (s) return s; } return solid(getComputedStyle(document.body).backgroundColor) || [255, 255, 255]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const VW = document.documentElement.clientWidth;
  // a mobile browser widens the layout viewport when anything overflows, so compare with the device width, not innerWidth
  const out = { overflowPx: Math.max(document.documentElement.scrollWidth - VW, Math.round(innerWidth - (visualViewport?.width || innerWidth))), wide: [], noAlt: [], broken: [], small: [], lowContrast: [], tiny: [], hidden: [], h1: document.querySelectorAll('h1').length, headingSkips: [],
    longHead: [], fonts: [], gradient: [], shadow: [], pure: [], greyOnColour: [], tinyCaps: [], longLines: [], bounce: [], blank: [], moving: 0, heroMedia: 0 };
  const exempt = (el) => el.closest('pre, code, kbd, table, input, textarea, select, [data-ui], [aria-hidden="true"]');
  const neutral = (c) => c && Math.max(...c) - Math.min(...c) < 6, chroma = (c) => c ? Math.max(...c) - Math.min(...c) : 0;
  const tag = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
  const fams = new Set(), spans = [], Y = scrollY;
  const wild = (f) => { const m = String(f).match(/cubic-bezier\\(([^)]+)\\)/g) || []; return m.some((b) => { const v = b.slice(13, -1).split(',').map(Number); return v[1] < -0.05 || v[1] > 1.05 || v[3] < -0.05 || v[3] > 1.05; }); };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    // fully off-screen = an off-canvas drawer (intentional); only a box that straddles the edge widens the page
    if ((r.right > VW + 1 || r.left < -1) && r.left < VW && r.right > 0 && !clipped(el) && !el.matches('.progress, .skip')) out.wide.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own || el.matches('img, video, canvas, svg, button, input, [data-steps], [data-ring]')) spans.push([r.top + Y, r.bottom + Y]);   // a scroll scene is tall on purpose
    if (!exempt(el)) {
      if (own) fams.add(cs.fontFamily.split(',')[0].replace(/["']/g, '').trim());
      if (/gradient\\(/.test(cs.backgroundImage) && !el.matches('img, video, picture, .scrim, [data-scrim]')) out.gradient.push(tag(el));
      if ((cs.boxShadow !== 'none' && !/inset/.test(cs.boxShadow)) || cs.textShadow !== 'none') out.shadow.push(tag(el));
      const bgc = solid(cs.backgroundColor), col = solid(cs.color);
      if ((bgc && r.width * r.height > VW * innerHeight * 0.25 && neutral(bgc) && (bgc[0] < 8 || (bgc[0] > 20 && bgc[0] < 245))) || (own && col && col.every((v) => v === 0))) out.pure.push(tag(el));
      if (own && neutral(col) && col[0] > 40 && col[0] < 215) { const b = bgOf(el); if (chroma(b) > 60) out.greyOnColour.push(el.textContent.trim().slice(0, 30)); }
      if (own && cs.textTransform === 'uppercase' && parseFloat(cs.fontSize) < 14 && parseFloat(cs.letterSpacing) > parseFloat(cs.fontSize) * 0.05) out.tinyCaps.push(el.textContent.trim().slice(0, 30));
      if (el.matches('p, li, dd, blockquote') && own && el.textContent.trim().length > 120 && r.width / (parseFloat(cs.fontSize) * 0.5) > 95) out.longLines.push(el.textContent.trim().slice(0, 30) + ' ~' + Math.round(r.width / (parseFloat(cs.fontSize) * 0.5)) + ' ch');
      if (wild(cs.transitionTimingFunction) || wild(cs.animationTimingFunction)) out.bounce.push(tag(el));
    }
    if (own && !el.closest('[aria-hidden="true"]') && !el.matches('.skip')) {
      const fs = parseFloat(cs.fontSize), color = solid(cs.color), bg = bgOf(el), text = el.textContent.trim().slice(0, 40);
      if (fs < 14) out.small.push(text + ' ' + fs + 'px');
      if (color && bg) { const c = ratio(color, bg), need = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700) ? 3 : 4.5; if (c < need) out.lowContrast.push(text + ' ' + c.toFixed(2) + ':1 (needs ' + need + ')'); }
      if (+cs.opacity < 0.5 && el.closest('[data-reveal], [data-split]') && !el.closest('[data-step]')) out.hidden.push(text);
    }
    if (el.matches('a, button, summary') && !el.closest('.nav, footer') && (r.height < 44 || r.width < 44) && VW < 900) out.tiny.push((el.textContent.trim() || el.getAttribute('aria-label') || el.tagName).slice(0, 30) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  }
  for (const img of document.images) { if (!img.hasAttribute('alt')) out.noAlt.push(img.src.split('/').pop()); if (img.complete && !img.naturalWidth) out.broken.push(img.src.split('/').pop()); }
  for (const h of document.querySelectorAll('h1, h2')) { const cs = getComputedStyle(h), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2, lines = Math.round(h.getBoundingClientRect().height / lh); if (lines > 2) out.longHead.push(h.textContent.trim().slice(0, 30) + ' ' + lines + ' lines'); }
  out.fonts = [...fams];
  spans.sort((a, b) => a[0] - b[0]); let reach = 0;
  for (const [a, b] of spans) { if (a - reach > innerHeight * 0.5 && reach > 0) out.blank.push(Math.round(reach) + '–' + Math.round(a) + ' px'); reach = Math.max(reach, b); }
  out.moving = document.querySelectorAll('[data-reveal], [data-split], [data-parallax], [data-ring], [data-count], [data-magnetic], [data-steps], .marquee, video[autoplay]').length;
  let last = 0; for (const h of document.querySelectorAll('h1, h2, h3, h4')) { const l = +h.tagName[1]; if (last && l > last + 1) out.headingSkips.push(h.textContent.trim().slice(0, 30)); last = l; }
  for (const el of document.querySelectorAll('[data-reveal]')) if (+getComputedStyle(el).opacity < 0.5) out.hidden.push(el.textContent.trim().slice(0, 40) || el.tagName);
  // above the fold: anything fully on the first screen must be fully visible without scrolling
  scrollTo({ top: 0, behavior: 'instant' }); await wait(700);
  out.heroMedia = Math.round(100 * [...document.querySelectorAll('img, video, canvas, picture, [data-ring], svg')].reduce((s, el) => { const r = el.getBoundingClientRect(), w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)), h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)); return s + (r.width * r.height > 2500 ? w * h : 0); }, 0) / (innerWidth * innerHeight));
  for (const el of document.querySelectorAll('[data-reveal], [data-split] .w')) { const r = el.getBoundingClientRect(); if (r.top >= 0 && r.bottom <= innerHeight && r.height && +getComputedStyle(el).opacity < 0.9) out.hidden.push('first screen: ' + (el.textContent.trim().slice(0, 40) || el.tagName)); }
  const ar = /[\\u0600-\\u06FF]/.test(document.body.innerText);
  out.meta = { title: document.title, description: document.querySelector('meta[name=description]')?.content || '', lang: document.documentElement.lang, dir: document.documentElement.dir, arabic: ar, viewport: !!document.querySelector('meta[name=viewport]') };
  out.running = document.getAnimations().filter((a) => a.playState === 'running').length;
  out.loadMs = Math.round(performance.getEntriesByType('navigation')[0]?.duration || 0);
  // what the page really downloads (the document + every resource it requested), not the folder it sits in
  out.pageBytes = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].reduce((s, e) => s + (e.decodedBodySize || e.encodedBodySize || 0), 0);
  out.height = H();
  return out;
})()`;

async function visit(client, url, vp, { reduce = false } = {}) {
  await client.send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.mobile });
  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }] });
  await client.goto(url);
  await client.eval('document.fonts.ready.then(() => true)');
  return client.eval(PROBE);
}

// before → after for an improvement (owner order 2026-10-19: every site we improve is measured before and after)
const RANK = { green: 0, yellow: 1, red: 2 };
export function compareAudits(before, after) {
  const was = Object.fromEntries((before?.lights || []).map((l) => [l.id, l.light]));
  // a colour step decides; inside the same colour the measure decides (more findings, or weight up > 10 %, is worse)
  const n0 = Object.fromEntries((before?.lights || []).map((l) => [l.id, l.n ?? 0]));
  const within = (id, a, b) => (id === 'weight' ? (b > a * 1.1 ? 'worse' : b < a * 0.9 ? 'better' : 'same') : b > a ? 'worse' : b < a ? 'better' : 'same');
  const rows = (after?.lights || []).map((l) => ({ id: l.id, before: was[l.id] || 'new', after: l.light, n: [n0[l.id] ?? null, l.n ?? 0],
    change: was[l.id] == null ? 'new' : RANK[l.light] < RANK[was[l.id]] ? 'better' : RANK[l.light] > RANK[was[l.id]] ? 'worse' : within(l.id, n0[l.id] ?? 0, l.n ?? 0) }));
  return { rows, better: rows.filter((r) => r.change === 'better').length, worse: rows.filter((r) => r.change === 'worse').map((r) => r.id) };
}

export async function checkSite({ dir, outDir, page = 'index.html' }) {
  mkdirSync(outDir, { recursive: true });
  const srv = await serve(dir), url = `http://127.0.0.1:${srv.port}/${page}`, errors = [];
  let client;
  const viewports = [];
  try {
    client = await launch({ width: 1440, height: 900 });
    client.on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails?.exception?.description?.split('\n')[0] || p.exceptionDetails?.text));
    client.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') errors.push(p.args?.map((a) => a.value ?? a.description).join(' ')); });
    await client.send('Runtime.enable');
    for (const vp of VIEWPORTS) {
      const m = await visit(client, url, vp);
      const shots = [];
      for (const f of [0, 0.25, 0.5, 0.75, 1]) {
        await client.eval(`scrollTo({ top: ${f} * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' }); new Promise((r) => setTimeout(() => r(true), 450))`);
        const png = Buffer.from((await screenshot(client, { format: 'png' })).data, 'base64'), p = join(outDir, `${vp.name}-${Math.round(f * 100)}.png`);
        writeFileSync(p, png); shots.push(p);
      }
      const sheet = join(outDir, `${vp.name}.png`), th = vp.mobile ? 560 : 360;
      spawnSync('ffmpeg', ['-v', 'error', '-y', ...shots.flatMap((s) => ['-i', s]), '-filter_complex', `${shots.map((_, i) => `[${i}]scale=-2:${th}[s${i}]`).join(';')};${shots.map((_, i) => `[s${i}]`).join('')}hstack=inputs=${shots.length}`, sheet]);
      viewports.push({ ...vp, ...m, sheet });
    }
    const r = await visit(client, url, VIEWPORTS[0], { reduce: true });
    viewports.push({ name: 'phone (reduced motion)', reduced: true, running: r.running, hidden: r.hidden });
  } finally { await client?.close(); srv.close(); }
  const lights = [], add = (id, light, why, n = 0) => lights.push({ id, light, why, n });   // n = the measure behind the light (count of findings, KB): compared before → after
  const all = (k) => [...new Set(viewports.filter((v) => !v.reduced).flatMap((v) => (v[k] || []).map((x) => `${v.name}: ${x}`)))];
  const over = viewports.filter((v) => !v.reduced && (v.overflowPx > 1 || v.wide.length));
  add('no-sideways-scroll', over.length ? 'red' : 'green', over.length ? over.map((v) => `${v.name}: ${v.overflowPx}px wider (${v.wide.slice(0, 3).join(', ')})`).join(' · ') : 'nothing wider than the screen at 390 / 820 / 1440 px', over.reduce((m, v) => Math.max(m, v.overflowPx || 0, v.wide.length), 0));
  add('images', all('noAlt').length || all('broken').length ? 'red' : 'green', [...all('noAlt').map((x) => 'no alt ' + x), ...all('broken').map((x) => 'broken ' + x)].slice(0, 5).join(' · ') || 'every image loads and has alt text', all('noAlt').length + all('broken').length);
  add('contrast', all('lowContrast').length ? 'red' : 'green', all('lowContrast').slice(0, 5).join(' · ') || 'all text meets WCAG AA (4.5:1, large 3:1)', all('lowContrast').length);
  add('readable-size', all('small').length ? 'yellow' : 'green', all('small').slice(0, 5).join(' · ') || 'no text under 14 px', all('small').length);
  add('tap-targets', all('tiny').length ? 'yellow' : 'green', all('tiny').slice(0, 5).join(' · ') || 'buttons and links ≥ 44 px on phone and tablet', all('tiny').length);
  add('motion-never-hides', all('hidden').length ? 'red' : 'green', all('hidden').slice(0, 4).join(' · ') || 'every revealed element is visible after scrolling', all('hidden').length);
  const red = viewports.find((v) => v.reduced);
  add('reduced-motion', red.running || red.hidden.length ? 'red' : 'green', red.running || red.hidden.length ? `${red.running} animation(s) still running, ${red.hidden.length} element(s) hidden with reduced motion` : 'reduced-motion visitors get a still, complete page', red.running + red.hidden.length);
  const d = viewports[0];
  add('structure', d.h1 === 1 && !d.headingSkips.length ? 'green' : 'yellow', `${d.h1} h1${d.headingSkips.length ? ', heading level skips at ' + d.headingSkips.slice(0, 3).join(', ') : ''}`, Math.abs(d.h1 - 1) + d.headingSkips.length);
  const meta = d.meta, metaBad = [!meta.title && 'title', !meta.description && 'description', !meta.lang && 'lang', meta.arabic && meta.dir !== 'rtl' && 'dir="rtl" for Arabic', !meta.viewport && 'viewport'].filter(Boolean);
  add('meta', metaBad.length ? 'red' : 'green', metaBad.length ? `missing: ${metaBad.join(', ')}` : 'title, description, lang, direction and viewport set', metaBad.length);
  add('script-errors', errors.length ? 'red' : 'green', errors.slice(0, 3).join(' · ') || 'no script errors', errors.length);
  const kb = Math.round((d.pageBytes || sizeOf(dir)) / 1024);
  add('weight', kb > 1500 ? 'red' : kb > 700 ? 'yellow' : 'green', `${kb} KB downloaded by the page (target ≤ 700 KB before photos; a deliberate offline single file can exceed it — say so)`, kb);
  // taste lights (yellow only; see header): after taste-skill (MIT) and Impeccable (Apache-2.0)
  const yellow = (id, list, ok, fix, n = list.length) => add(id, list.length ? 'yellow' : 'green', list.length ? list.slice(0, 4).join(' · ') + ' → ' + fix : ok, n);
  yellow('taste-headlines', all('longHead'), 'every h1/h2 fits in two lines at 390 / 820 / 1440 px', 'cut the headline (~32 characters) or lower its size');
  const fonts = [...new Set(viewports.filter((v) => !v.reduced).flatMap((v) => v.fonts || []))];
  yellow('taste-typefaces', fonts.length > 2 ? [fonts.join(', ')] : [], `${fonts.length} typeface(s): ${fonts.join(', ')}`, 'one display and one text family', Math.max(0, fonts.length - 2));
  yellow('taste-decoration', [...new Set([...all('gradient').map((x) => 'gradient ' + x), ...all('shadow').map((x) => 'shadow ' + x)])], 'no decorative gradients, resting shadows or glows', 'flat fills; a neutral scrim over a photo is the one exception; shadows only while something is lifted');
  yellow('taste-colour', [...new Set([...all('pure').map((x) => 'untinted neutral ' + x), ...all('greyOnColour').map((x) => 'grey on colour "' + x + '"')])], 'neutrals tinted toward the brand; no grey text on a coloured ground', 'tint blacks/greys toward the brand hue; on colour use a shade of that colour or white');
  yellow('taste-type-detail', [...new Set([...all('tinyCaps').map((x) => 'tiny tracked caps "' + x + '"'), ...all('longLines').map((x) => 'long line "' + x + '"')])], 'no tiny tracked caps; body lines ≤ ~75 characters', 'labels at reading size; set body max-width ≈ 65ch');
  yellow('taste-easing', all('bounce'), 'no bounce or elastic easing', 'ease-out curves that settle (no cubic-bezier value outside 0–1)');
  yellow('taste-rhythm', all('blank'), 'no blank stretch taller than half a screen', 'close the gap or put the next claim in it (section gaps 120–240 px on desktop)');
  yellow('taste-motion', d.moving < 8 ? [`${d.moving} moving element(s)`] : [], `${d.moving} moving elements`, 'give at least eight elements a reveal, split, parallax, count or ring (transform/opacity only)', Math.max(0, 8 - d.moving));
  const desk = viewports.find((v) => v.name === 'desktop');
  yellow('taste-hero-media', desk && desk.heroMedia < 40 ? [`real media covers ${desk.heroMedia} % of the first desktop screen`] : [], `media covers ${desk?.heroMedia ?? '?'} % of the first screen`, 'top sites give the hero picture ≥ 40 % of the first screen (fine to keep a type-led hero on purpose: say why)', Math.max(0, 40 - (desk?.heroMedia ?? 40)));
  const reds = lights.filter((l) => l.light === 'red').length;
  return { lights, verdict: reds ? `not ready: ${reds} red light(s)` : lights.some((l) => l.light === 'yellow') ? 'ready; read the yellow notes' : 'ready', viewports: viewports.map(({ wide, small, lowContrast, tiny, hidden, longHead, gradient, shadow, pure, greyOnColour, tinyCaps, longLines, bounce, blank, ...v }) => v) };
}
