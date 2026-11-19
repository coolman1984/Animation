// Builds rave-studio.html: one self-contained file (Three.js + app + fonts + Blender GLB + poster inlined),
// so it opens from a phone's file manager or offline with no server.
//   node studio/web/rave-studio/build.mjs [--three=<node_modules dir holding three>] [--out=<file>]
// Needs esbuild and three@0.186.1 resolvable (studio/vendor after `node studio/studio.mjs setup gpu`, or --three).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const studio = resolve(here, '../../');
const candidates = [args.three, process.env.RAVE_NODE_MODULES, join(studio, 'vendor', 'node_modules')].filter(Boolean);
const nm = candidates.find((d) => existsSync(join(d, 'three', 'package.json')));
if (!nm) { console.error('three not found. Run `node studio/studio.mjs setup gpu` or pass --three=<node_modules>'); process.exit(2); }
const require = createRequire(join(nm, 'noop.js'));
const esbuild = require('esbuild');
const threeVersion = JSON.parse(readFileSync(join(nm, 'three', 'package.json'), 'utf8')).version;

const result = await esbuild.build({
  entryPoints: [join(here, 'src', 'main.js')],
  bundle: true, minify: true, format: 'iife', target: ['es2020'], write: false, legalComments: 'inline',
  nodePaths: [nm],
  alias: { 'three/addons': join(nm, 'three', 'examples', 'jsm') },
  logLevel: 'warning',
});
let app = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const b64 = (p) => readFileSync(p).toString('base64');
const fonts = join(studio, 'assets', 'fonts');
const glbPath = join(here, 'assets', 'stage.glb');
const posterPath = join(here, 'assets', 'poster.jpg');
let html = readFileSync(join(here, 'index.src.html'), 'utf8');
const swap = { FONT_ALEX_AR: b64(join(fonts, 'Alexandria-arabic.woff2')), FONT_ALEX_LAT: b64(join(fonts, 'Alexandria-latin.woff2')),
  FONT_PLEX: b64(join(fonts, 'PlexArabic-500.woff2')), FONT_MONO: b64(join(fonts, 'JetBrainsMono-latin.woff2')),
  GLB: existsSync(glbPath) ? b64(glbPath) : '', POSTER: existsSync(posterPath) ? b64(posterPath) : '' };
for (const [k, v] of Object.entries(swap)) html = html.replaceAll(`{{${k}}}`, v);
html = html.replace('{{APP}}', () => `/* Rave Studio · Three.js ${threeVersion} (MIT) bundled · fonts OFL (studio/assets/fonts) */\n${app}`);
const out = args.out || join(here, 'rave-studio.html');
writeFileSync(out, html);
console.log(`${out}  ${(html.length / 1024).toFixed(0)} KB  (three ${threeVersion}, app ${(app.length / 1024).toFixed(0)} KB)`);
