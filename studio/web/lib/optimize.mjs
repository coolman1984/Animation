// Web delivery optimisation for a built static site (2026-11-06): responsive images and subset fonts, written for the studio.
// Images — our own pipeline on the FFmpeg we already ship (CORE), instead of sharp (Apache-2.0, a native addon): sharp's idea
// (resize once at build time into a few widths, encode WebP/AVIF, let the browser pick from srcset) is kept; the dependency is not.
// Fonts — fontTools (MIT) through tools/font_subset.py: only the characters the pages use, all layout features kept for Arabic.
//   optimizeImages({ dist, avif }) → [{ src, natural, widths, bytesBefore, bytesAfter }]
//   subsetFonts({ dist })           → [{ file, before, after }]  (python + fontTools + brotli: node studio.mjs setup webperf)
//   widthsFor(natural), rewriteImg(tag, variants), pageText(html) are pure (test/web-optimize.test.mjs)
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, extname, basename, relative, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PYTHON, slash } from '../../lib/platform.mjs';

const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const STEPS = [480, 800, 1200, 1600, 2000];

/** Widths to encode: the standard steps below the source width, plus the source width itself (never upscale, cap 2400). */
export function widthsFor(natural, steps = STEPS) { const top = Math.min(natural, 2400); return [...new Set([...steps.filter((w) => w < top), top])]; }

const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g)].slice(1).map(([, k, v]) => [k.toLowerCase(), v == null ? '' : v.replace(/^["']|["']$/g, '')]));
const attr = (k, v) => (v === '' ? ` ${k}` : ` ${k}="${String(v).replace(/"/g, '&quot;')}"`);

/** <img> → <picture> with AVIF/WebP sources. variants: { natural: [w, h], webp: [[w, url]], avif: [[w, url]] }, first = above the fold. */
export function rewriteImg(tag, { natural, webp = [], avif = [] }, { first = false } = {}) {
  const a = attrsOf(tag);
  if (!a.width || !a.height) { a.width = String(natural[0]); a.height = String(natural[1]); }
  const shown = +a.width || natural[0], sizes = a.sizes || `(max-width: ${shown}px) 100vw, ${shown}px`;
  if (!first && !a.loading && a.fetchpriority !== 'high') a.loading = 'lazy';
  if (!a.decoding) a.decoding = 'async';
  delete a.sizes;
  const set = (list) => list.map(([w, u]) => `${u} ${w}w`).join(', ');
  const img = `<img${Object.entries(a).map(([k, v]) => attr(k, v)).join('')}>`;
  return `<picture>${avif.length ? `<source type="image/avif" srcset="${set(avif)}" sizes="${sizes}">` : ''}${webp.length ? `<source type="image/webp" srcset="${set(webp)}" sizes="${sizes}">` : ''}${img}</picture>`;
}

const probe = (file) => { const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }); const [w, h] = r.stdout.trim().split(',').map(Number); return w && h ? [w, h] : null; };
const encoders = () => spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout || '';

function encode(src, out, w, kind) {
  const codec = kind === 'webp' ? ['-c:v', 'libwebp', '-quality', '78', '-compression_level', '6'] : ['-c:v', encoders().includes('libaom-av1') ? 'libaom-av1' : 'libsvtav1', '-still-picture', '1', '-crf', '32', '-pix_fmt', 'yuv420p'];
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', `scale=${w}:-2:flags=lanczos`, '-frames:v', '1', ...codec, out], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg ${kind} ${basename(src)}: ${r.stderr.slice(-300)}`);
}

export function optimizeImages({ dist, avif = false }) {
  const report = [], cache = new Map();
  if (avif && !/libaom-av1|libsvtav1/.test(encoders())) throw new Error('this FFmpeg has no AV1 encoder (libaom-av1 / libsvtav1); run without --avif');
  const pages = walk(dist).filter((f) => f.endsWith('.html'));
  for (const page of pages) {
    let html = readFileSync(page, 'utf8'), first = true;
    html = html.replace(/<picture>[\s\S]*?<\/picture>|<img\b[^>]*>/gi, (tag) => {
      if (/^<picture/i.test(tag)) { first = false; return tag; }
      const a = attrsOf(tag), src = a.src || '';
      const isFirst = first; first = false;
      if (a.srcset || !/\.(jpe?g|png|webp)$/i.test(src) || /^(https?:|data:|\/\/)/i.test(src)) return tag;
      const file = resolve(dirname(page), src); if (!file.startsWith(resolve(dist)) || !existsSync(file)) return tag;
      if (!cache.has(file)) {
        const natural = probe(file); if (!natural) return tag;
        const dir = join(dirname(file), 'opt'); mkdirSync(dir, { recursive: true });
        const stem = basename(file, extname(file)), v = { natural, webp: [], avif: [] }, widths = widthsFor(natural[0]);
        for (const w of widths) for (const kind of avif ? ['avif', 'webp'] : ['webp']) { const out = join(dir, `${stem}-${w}.${kind}`); encode(file, out, w, kind); v[kind].push([w, out]); }
        const after = (v.webp.at(-1) && statSync(v.webp.at(-1)[1]).size) || 0;
        report.push({ src: slash(relative(dist, file)), natural, widths, bytesBefore: statSync(file).size, bytesAfter: after });
        cache.set(file, v);
      }
      const v = cache.get(file), rel = (p) => slash(relative(dirname(page), p));
      return rewriteImg(tag, { natural: v.natural, webp: v.webp.map(([w, p]) => [w, rel(p)]), avif: v.avif.map(([w, p]) => [w, rel(p)]) }, { first: isFirst || a.fetchpriority === 'high' });
    });
    writeFileSync(page, html);
  }
  return report;
}

/** Every character a visitor can see: text, alt/title/aria-label/placeholder/content values, plus digits and basic punctuation. */
export function pageText(html) {
  const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const visible = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const attrs = [...html.matchAll(/\b(?:alt|title|aria-label|placeholder|content|value)\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).join(' ');
  return [...new Set(decode(visible + ' ' + attrs + ' 0123456789.,:;!?()[]-–—«»،؛؟٪%+ ').replace(/\s+/g, ''))].sort().join('') + ' ';
}

export function subsetFonts({ dist, python = PYTHON }) {
  const files = walk(dist), pages = files.filter((f) => f.endsWith('.html')), css = files.filter((f) => f.endsWith('.css'));
  const text = pageText(pages.map((p) => readFileSync(p, 'utf8')).join(' ') + ' ' + css.map((c) => [...readFileSync(c, 'utf8').matchAll(/content\s*:\s*"([^"]*)"/g)].map((m) => m[1]).join(' ')).join(' '));
  const charsFile = join(dist, '.subset-chars.txt'); writeFileSync(charsFile, text);
  const report = [], renamed = new Map();
  try {
    for (const sheet of css) {
      let s = readFileSync(sheet, 'utf8');
      s = s.replace(/url\((['"]?)([^)'"]+\.(?:ttf|otf|woff2?))\1\)\s*format\((['"])[^'"]+\3\)/g, (m, q, url) => {
        const font = resolve(dirname(sheet), url); if (!existsSync(font) || /-sub-[0-9a-f]{6}\.woff2$/.test(font)) return m;
        if (!renamed.has(font)) {
          const tag = createHash('sha1').update(text + basename(font)).digest('hex').slice(0, 6), out = font.replace(/\.(ttf|otf|woff2?)$/, `-sub-${tag}.woff2`);
          const r = spawnSync(python, [join(STUDIO, 'tools', 'font_subset.py'), font, charsFile, out, `--name=Studio Sub ${tag.toUpperCase()}`], { encoding: 'utf8' });
          if (r.status !== 0) throw new Error(`font subset failed for ${basename(font)} (needs: node studio.mjs setup webperf): ${(r.stderr || r.stdout).slice(-400)}`);
          const j = JSON.parse(r.stdout.trim().split('\n').at(-1)); report.push({ file: basename(font), before: j.in, after: j.out, glyphs: j.glyphs });
          renamed.set(font, out);
        }
        return `url('${slash(relative(dirname(sheet), renamed.get(font)))}') format('woff2')`;
      });
      writeFileSync(sheet, s);
    }
    for (const page of pages) {   // preload links follow the renamed files
      let h = readFileSync(page, 'utf8');
      for (const [from, to] of renamed) h = h.split(slash(relative(dirname(page), from))).join(slash(relative(dirname(page), to)));
      writeFileSync(page, h);
    }
    for (const from of renamed.keys()) rmSync(from);   // the full font is no longer referenced: do not ship it
  } finally { rmSync(charsFile, { force: true }); }
  return report;
}
