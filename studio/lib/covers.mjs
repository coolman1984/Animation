// Cover and title cards. Satori 0.63.2 draws an SVG from a plain element tree (no JSX, no React);
// @resvg/resvg-js 2.6.2 rasterises it. Both are MPL-2.0, installed unmodified by `setup covers`
// into studio/vendor, so the MPL file-level copyleft is not triggered.
// Arabic shaping: SATORI_ARABIC records a look at the satori 0.63.2 PNG (examples/cover-study).
// 'ok' keeps Arabic on Satori. Anything else screenshots with the studio's Chromium
// (lib/cdp.mjs launch + screenshot — the same browser path as composer stills in lib/render.mjs).
// stillAt() in lib/finish.mjs only grabs a JPEG from a finished video; it is not this path.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve, sep, basename, extname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { STUDIO } from './capabilities.mjs';

export const PRESETS = Object.freeze({
  youtube: { w: 1280, h: 720 },
  reel: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
  'title-card': { w: 1920, h: 1080 },
});

// Keys are the font-family name passed to Satori and @font-face. Files live in assets/fonts (OFL).
export const FONTS = Object.freeze({
  'IBM Plex Sans Arabic': 'assets/fonts/IBMPlexSansArabic-Regular.ttf',
  'IBM Plex Sans Arabic Medium': 'assets/fonts/IBMPlexSansArabic-Medium.ttf',
  Cairo: 'assets/fonts/Cairo.ttf',
  'El Messiri': 'assets/fonts/ElMessiri.ttf',
  Lalezar: 'assets/fonts/Lalezar-Regular.ttf',
  'Aref Ruqaa': 'assets/fonts/ArefRuqaa-Regular.ttf',
  Montserrat: 'assets/fonts/Montserrat.ttf',
  Archivo: 'assets/fonts/Archivo.ttf',
  'Space Mono': 'assets/fonts/SpaceMono-Regular.ttf',
});

export const DEFAULT_BRAND = Object.freeze({ bg: '#030818', fg: '#F4EBD9', accent: '#FFD21F', muted: '#8CA0C8' });
const BRAND_KEYS = ['bg', 'fg', 'accent', 'muted'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Looked at studio/out/covers/youtube-ar-satori.png (2026-10-24): بكسل بلس, استوديو and
// فيلم يُصنع بالكود are joined, right-aligned, gold bar on the right. No Chromium comparison.
// 'ok' keeps that route on Satori. Anything else routes Arabic cards to Chromium.
export const SATORI_ARABIC = 'ok';

export const ARABIC_NOTE = 'Headless Chromium (lib/cdp.mjs), the same browser path as composer stills in lib/render.mjs. stillAt() in lib/finish.mjs only grabs a frame from a finished video. Satori 0.63.2 joined the cover-study Arabic phrase; --renderer=chromium is the override.';

export function hasArabic(text) {
  return ARABIC.test(String(text ?? ''));
}

export function coverDir(spec) {
  if (spec?.dir === 'rtl' || spec?.dir === 'ltr') return spec.dir;
  return [spec?.title, spec?.kicker, spec?.subtitle].some(hasArabic) ? 'rtl' : 'ltr';
}

export function validateSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return ['spec must be an object'];
  if (typeof spec.title !== 'string' || !spec.title.trim()) errors.push('title is required');
  if (spec.kicker !== undefined && typeof spec.kicker !== 'string') errors.push('kicker must be a string');
  if (spec.subtitle !== undefined && typeof spec.subtitle !== 'string') errors.push('subtitle must be a string');
  if (!Object.prototype.hasOwnProperty.call(PRESETS, spec.preset)) errors.push(`preset must be one of ${Object.keys(PRESETS).join(', ')}`);
  if (spec.font !== undefined && !Object.prototype.hasOwnProperty.call(FONTS, spec.font)) errors.push(`font must be one of ${Object.keys(FONTS).join(', ')}`);
  if (spec.dir !== undefined && spec.dir !== 'rtl' && spec.dir !== 'ltr') errors.push('dir must be rtl or ltr');
  if (spec.logo !== undefined && (typeof spec.logo !== 'string' || !spec.logo || spec.logo.includes('..'))) errors.push('logo must be a path inside the studio');
  if (spec.brand !== undefined) {
    if (!spec.brand || typeof spec.brand !== 'object' || Array.isArray(spec.brand)) errors.push('brand must be an object');
    else for (const [k, v] of Object.entries(spec.brand)) {
      if (!BRAND_KEYS.includes(k)) errors.push(`unknown brand colour ${k}`);
      else if (typeof v !== 'string' || !HEX.test(v)) errors.push(`brand.${k} must be a #RRGGBB colour`);
    }
  }
  return errors;
}

export function coverLayout(spec) {
  const errors = validateSpec(spec);
  if (errors.length) throw new Error(errors.join('; '));
  const { w, h } = PRESETS[spec.preset];
  const dir = coverDir(spec);
  const brand = { ...DEFAULT_BRAND, ...(spec.brand || {}) };
  const font = spec.font || 'IBM Plex Sans Arabic';
  const short = Math.min(w, h);
  const scale = {
    pad: Math.round(short * 0.072),
    bar: Math.max(8, Math.round(short * 0.012)),
    kicker: Math.round(short * 0.034),
    title: Math.round(short * 0.092),
    subtitle: Math.round(short * 0.038),
    logo: Math.round(short * 0.14),
    gap: Math.round(short * 0.018),
  };
  return { w, h, dir, brand, font, scale };
}

function textNode(content, style) {
  return { type: 'div', props: { style, children: content } };
}

// Plain Satori element tree. Each string is one node — Arabic is never split into letters.
export function elementTree(spec, { logoSrc } = {}) {
  const { dir, brand, font, scale } = coverLayout(spec);
  const track = dir === 'rtl' ? 0 : Math.round(scale.kicker * 0.14);
  const align = dir === 'rtl' ? 'right' : 'left';
  const children = [];
  if (spec.kicker) children.push(textNode(spec.kicker, {
    color: brand.accent, fontSize: scale.kicker, letterSpacing: track, marginBottom: scale.gap,
    fontFamily: font, direction: dir, textAlign: align, width: '100%',
  }));
  children.push(textNode(spec.title, {
    color: brand.fg, fontSize: scale.title, lineHeight: 1.05, fontFamily: font,
    direction: dir, textAlign: align, width: '100%',
  }));
  if (spec.subtitle) children.push(textNode(spec.subtitle, {
    color: brand.muted, fontSize: scale.subtitle, lineHeight: 1.3, marginTop: scale.gap,
    fontFamily: font, direction: dir, textAlign: align, width: '100%',
  }));
  if (logoSrc) children.push({
    type: 'img',
    props: {
      src: logoSrc, width: scale.logo, height: scale.logo,
      style: { marginTop: scale.pad, objectFit: 'contain' },
    },
  });
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'row', width: '100%', height: '100%', backgroundColor: brand.bg, direction: dir },
      children: [
        { type: 'div', props: { style: { width: scale.bar, height: '100%', backgroundColor: brand.accent } } },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, height: '100%',
              padding: scale.pad, direction: dir, fontFamily: font,
            },
            children,
          },
        },
      ],
    },
  };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function resolveLogo(logo) {
  if (typeof logo !== 'string' || !logo || logo.includes('..')) throw new Error('logo must be a path inside the studio');
  const abs = resolve(STUDIO, logo);
  if (abs !== STUDIO && !abs.startsWith(STUDIO + sep)) throw new Error('logo must stay inside the studio');
  if (!existsSync(abs)) throw new Error(`logo not found: ${logo}`);
  return abs;
}

// HTML for the Chromium path. dir="rtl" on the document; each phrase stays one text node.
export function coverHtml(spec) {
  const { w, h, dir, brand, font, scale } = coverLayout(spec);
  const fontUrl = pathToFileURL(join(STUDIO, FONTS[font])).href;
  const logo = spec.logo ? pathToFileURL(resolveLogo(spec.logo)).href : '';
  const track = dir === 'rtl' ? '0' : '0.14em';
  return `<!doctype html>
<html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}">
<meta charset="utf-8">
<style>
@font-face { font-family: ${JSON.stringify(font)}; src: url("${fontUrl}") format("truetype"); font-weight: 400; font-style: normal; }
html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: ${brand.bg}; }
.row { display: flex; flex-direction: row; width: ${w}px; height: ${h}px; direction: ${dir}; }
.bar { width: ${scale.bar}px; height: 100%; background: ${brand.accent}; flex: none; }
.col { flex: 1; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; padding: ${scale.pad}px; font-family: ${JSON.stringify(font)}, sans-serif; color: ${brand.fg}; direction: ${dir}; text-align: start; }
.kicker { color: ${brand.accent}; font-size: ${scale.kicker}px; letter-spacing: ${track}; margin: 0 0 ${scale.gap}px; }
.title { font-size: ${scale.title}px; line-height: 1.05; margin: 0; }
.sub { color: ${brand.muted}; font-size: ${scale.subtitle}px; line-height: 1.3; margin: ${scale.gap}px 0 0; }
.logo { width: ${scale.logo}px; height: ${scale.logo}px; margin-top: ${scale.pad}px; object-fit: contain; align-self: flex-start; }
</style>
<body>
<div class="row">
  <div class="bar"></div>
  <div class="col">
    ${spec.kicker ? `<div class="kicker">${esc(spec.kicker)}</div>` : ''}
    <div class="title">${esc(spec.title)}</div>
    ${spec.subtitle ? `<div class="sub">${esc(spec.subtitle)}</div>` : ''}
    ${logo ? `<img class="logo" alt="" src="${logo}" width="${scale.logo}" height="${scale.logo}">` : ''}
  </div>
</div>
</body>
</html>`;
}

function vendorRequire() {
  const pkg = join(STUDIO, 'vendor', 'package.json');
  if (!existsSync(pkg)) throw new Error('studio/vendor is missing (node studio.mjs setup covers)');
  return createRequire(pkg);
}

async function loadExport(name) {
  let entry;
  try { entry = vendorRequire().resolve(name); }
  catch { throw new Error(`${name} is not installed (node studio.mjs setup covers)`); }
  return import(pathToFileURL(entry).href);
}

async function loadSatori() {
  const mod = await loadExport('satori');
  const satori = mod.default?.default || mod.default || mod;
  if (typeof satori !== 'function') throw new Error('satori did not export a render function');
  return satori;
}

async function loadResvg() {
  const mod = await loadExport('@resvg/resvg-js');
  const Resvg = mod.Resvg || mod.default?.Resvg || mod.default;
  if (typeof Resvg !== 'function') throw new Error('@resvg/resvg-js did not export Resvg');
  return Resvg;
}

async function logoDataUri(abs, Resvg) {
  const buf = readFileSync(abs);
  if (/\.svg$/i.test(abs)) {
    const png = new Resvg(buf, { fitTo: { mode: 'width', value: 512 } }).render().asPng();
    return `data:image/png;base64,${png.toString('base64')}`;
  }
  const mime = /\.jpe?g$/i.test(abs) ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function pngSize(png) {
  if (png[0] !== 0x89 || png[1] !== 0x50) throw new Error('cover raster is not a PNG');
  return { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
}

export function coversInstalled() {
  return existsSync(join(STUDIO, 'vendor', 'node_modules', 'satori', 'package.json'))
    && existsSync(join(STUDIO, 'vendor', 'node_modules', '@resvg', 'resvg-js', 'package.json'));
}

async function satoriPng(spec) {
  const layout = coverLayout(spec);
  const satori = await loadSatori();
  const Resvg = await loadResvg();
  const logoSrc = spec.logo ? await logoDataUri(resolveLogo(spec.logo), Resvg) : null;
  const svg = await satori(elementTree(spec, { logoSrc }), {
    width: layout.w,
    height: layout.h,
    fonts: [{ name: layout.font, data: readFileSync(join(STUDIO, FONTS[layout.font])), weight: 400, style: 'normal' }],
  });
  const png = new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
  const size = pngSize(png);
  if (size.w !== layout.w || size.h !== layout.h) throw new Error(`satori cover ${size.w}x${size.h}, expected ${layout.w}x${layout.h}`);
  return { svg, png, width: layout.w, height: layout.h };
}

async function chromiumPng(spec) {
  const { w, h } = coverLayout(spec);
  const { launch, settleCapture, screenshot, imageWidth } = await import('./cdp.mjs');
  const file = join(tmpdir(), `studio-cover-${process.pid}-${Date.now()}.html`);
  writeFileSync(file, coverHtml(spec));
  const client = await launch({ width: w, height: h, scale: 1 });
  try {
    await client.goto(pathToFileURL(file).href);
    await client.eval('document.fonts.ready');
    await settleCapture(client);
    const shot = await screenshot(client, { format: 'png', captureBeyondViewport: false });
    const png = Buffer.from(shot.data, 'base64');
    if (imageWidth(png) !== w) throw new Error(`chromium cover width ${imageWidth(png)} != ${w}`);
    const size = pngSize(png);
    if (size.h !== h) throw new Error(`chromium cover height ${size.h} != ${h}`);
    const desc = [spec.kicker, spec.title, spec.subtitle].filter(Boolean).join(' — ');
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n<title>${esc(spec.title)}</title>\n<desc>${esc(desc)} — Chromium raster, because Satori did not shape this Arabic.</desc>\n<image width="${w}" height="${h}" href="data:image/png;base64,${png.toString('base64')}"/>\n</svg>\n`;
    return { svg, png, width: w, height: h };
  } finally {
    rmSync(file, { force: true });
    await client.close();
  }
}

export function specHasArabic(spec) {
  return [spec.title, spec.kicker, spec.subtitle].some(hasArabic);
}

// cover(spec) → { svg, png, renderer, width, height, arabic, note }
// renderer: 'satori' (element tree + resvg) or 'chromium' (Arabic fallback).
export async function cover(spec, { renderer } = {}) {
  const errors = validateSpec(spec);
  if (errors.length) throw new Error(errors.join('; '));
  const arabic = specHasArabic(spec);
  const use = renderer || (arabic && SATORI_ARABIC !== 'ok' ? 'chromium' : 'satori');
  if (use !== 'satori' && use !== 'chromium') throw new Error('renderer must be satori or chromium');
  const drawn = use === 'chromium' ? await chromiumPng(spec) : await satoriPng(spec);
  const note = use === 'chromium' ? ARABIC_NOTE : (arabic ? 'Satori shaped this Arabic cover.' : '');
  return { ...drawn, renderer: use, arabic, note };
}

const OUT_ROOTS = () => [resolve(STUDIO, 'out'), resolve(STUDIO, 'takes')];

export function assertOutputPath(file) {
  const roots = OUT_ROOTS();
  const inside = (abs) => roots.some((root) => abs === root || abs.startsWith(root + sep));
  for (const abs of [resolve(file), resolve(STUDIO, file), resolve(STUDIO, '..', file)]) if (inside(abs)) return abs;
  throw new Error('cover output must be inside studio/out or studio/takes');
}

export function defaultCoverPaths(name) {
  const safe = String(name || 'cover').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'cover';
  const base = join(STUDIO, 'out', 'covers', safe);
  return { png: base + '.png', svg: base + '.svg' };
}

export function pathsFromOut(out, specFile) {
  const abs = assertOutputPath(out);
  if (extname(abs).toLowerCase() === '.png' || extname(abs).toLowerCase() === '.svg') {
    const base = abs.slice(0, -extname(abs).length);
    return { png: base + '.png', svg: base + '.svg' };
  }
  const stem = basename(specFile || 'cover', extname(specFile || '')).replace(/[^a-z0-9_-]+/gi, '-') || 'cover';
  return { png: join(abs, `${stem}.png`), svg: join(abs, `${stem}.svg`) };
}

export async function writeCoverFiles(spec, dest, opts) {
  const png = assertOutputPath(dest.png);
  const svg = assertOutputPath(dest.svg);
  const result = await cover(spec, opts);
  mkdirSync(dirname(png), { recursive: true });
  writeFileSync(svg, result.svg);
  writeFileSync(png, result.png);
  return { ...result, pngPath: png, svgPath: svg };
}

export async function coverCli(file, opt = {}) {
  if (!file) { console.error('usage: node studio.mjs cover <spec.json> [--out=studio/out/covers/name.png] [--renderer=satori|chromium]'); process.exit(2); }
  const spec = JSON.parse(readFileSync(file, 'utf8'));
  const dest = opt.out ? pathsFromOut(opt.out, file) : defaultCoverPaths(basename(file, extname(file)));
  const renderer = opt.renderer || undefined;
  const r = await writeCoverFiles(spec, dest, { renderer });
  console.log(`${r.renderer}\t${r.width}x${r.height}\t${r.pngPath}`);
  if (r.note) console.log(r.note);
  console.log(r.svgPath);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await coverCli(process.argv[2], Object.fromEntries(process.argv.slice(3).filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; })));
}
