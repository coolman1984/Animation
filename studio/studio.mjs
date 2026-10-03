#!/usr/bin/env node
// Front door of the studio. One command for the questions an agent asks before making a film:
//   node studio.mjs                          this help
//   node studio.mjs caps                     every capability: maturity, installed?, best use
//   node studio.mjs route text particles:4000 3d     which engine for these layers (or: route <film>)
//   node studio.mjs setup <profile>          install a tool pack (vision, audio, live, logo, gpu, color) or show links (core, pro)
//   node studio.mjs doctor                   full machine check (lib/doctor.mjs)
//   node studio.mjs new <film> --placement=reels|youtube|feed|square --duration=30 [--fps=30]
// Films are then built with make.mjs (WORKFLOW.md). Registry: capabilities.json. Architecture: PLATFORM.md.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadRegistry, detect, route, STUDIO } from './lib/capabilities.mjs';
import { PYTHON, WINDOWS, isMain } from './lib/platform.mjs';

const PLACEMENTS = {
  reels: { w: 1080, h: 1920, safe: [65, 269, 1015, 1248], note: 'Facebook/Instagram Reels, YouTube Shorts (commonly published Meta safe band)' },
  youtube: { w: 1920, h: 1080, safe: [96, 54, 1824, 1026], note: 'normal YouTube video (5 % margins)' },
  feed: { w: 1080, h: 1350, safe: [54, 68, 1026, 1282], note: 'Facebook/Instagram portrait feed (5 % margins)' },
  square: { w: 1080, h: 1080, safe: [54, 54, 1026, 1026], note: 'square post (5 % margins)' },
};

const pad = (s, n) => String(s ?? '').padEnd(n);
const flags = args => Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));

function caps() {
  const all = detect(loadRegistry());
  console.log(`\n${pad('CAPABILITY', 16)}${pad('MATURITY', 14)}${pad('STATUS', 11)}${pad('DEPT', 13)}BEST FOR`);
  for (const c of all) console.log(`${pad(c.id, 16)}${pad(c.maturity, 14)}${pad(c.status, 11)}${pad(c.department, 13)}${c.bestFor}`);
  const missing = all.filter(c => c.status === 'missing' && c.profile);
  if (missing.length) console.log(`\nInstall when a film needs it: ${[...new Set(missing.map(c => `node studio.mjs setup ${c.profile}`))].join(' | ')}`);
  console.log('Maturity: CORE > PRODUCTION > PROVEN > EXPERIMENTAL > PLANNED > LEARN (ideas only). See capabilities.json.\n');
}

async function routeCmd(args) {
  const all = detect(loadRegistry());
  let groups;
  if (args.length === 1 && existsSync(join(STUDIO, args[0], 'config.mjs'))) {
    const cfg = (await import(pathToFileURL(join(STUDIO, args[0], 'config.mjs')).href)).default;
    const plan = cfg.production ? JSON.parse(readFileSync(join(STUDIO, cfg.production), 'utf8')) : null;
    groups = (plan?.shots || []).map(s => ({ label: `${s.id} (${s.start}–${s.end}s)`, needs: s.craft?.layers || [] }));
    if (!groups.some(g => g.needs.length)) console.log('No shot declares craft.layers yet; e.g. "layers": ["text", "particles:4000", "3d"].');
  } else groups = [{ label: 'request', needs: args }];
  for (const g of groups) {
    if (!g.needs.length) continue;
    console.log(`\n${g.label}`);
    for (const r of route(g.needs, all)) {
      console.log(`  ${pad(r.need, 18)} → ${r.engine ? `${pad(r.engine, 14)} [${r.maturity}] ${r.why}` : r.why}`);
      if (r.install.length) console.log(`  ${pad('', 18)}   better engine not installed: ${r.install.join(', ')}`);
      if (!r.engine && r.planned.length) console.log(`  ${pad('', 18)}   planned, not built: ${r.planned.join(', ')}`);
    }
  }
  console.log('');
}

function setup(profile) {
  const reg = loadRegistry(), p = reg.profiles[profile];
  if (!p) { console.error(`profiles: ${Object.keys(reg.profiles).join(', ')}`); process.exit(2); }
  console.log(`${profile}: ${p.about}`);
  // npm on Windows is a .cmd and needs a shell; it then runs inside vendor/ so no argument contains the spaced path.
  const run = (cmd, args, cwd) => { console.log('> ' + [cmd, ...args].join(' ')); const r = WINDOWS && cmd === 'npm' ? spawnSync([cmd, ...args].join(' '), { stdio: 'inherit', cwd, shell: true }) : spawnSync(cmd, args, { stdio: 'inherit', cwd }); if (r.status !== 0) { console.error(`failed (${r.status})`); process.exit(1); } };
  if (p.pip) run(PYTHON, ['-m', 'pip', 'install', ...p.pip]);
  if (p.npm) {
    mkdirSync(join(STUDIO, 'vendor'), { recursive: true });
    if (!existsSync(join(STUDIO, 'vendor', 'package.json'))) writeFileSync(join(STUDIO, 'vendor', 'package.json'), JSON.stringify({ name: 'studio-vendor', private: true, description: 'Pinned browser engines served to the composer at /vendor/node_modules. Installed by node studio.mjs setup gpu.' }, null, 2));
    run('npm', ['install', '--no-audit', '--no-fund', ...p.npm], join(STUDIO, 'vendor'));
  }
  for (const m of p.manual || []) console.log(`  manual: ${m}`);
  console.log('Done. Check with: node studio.mjs caps');
}

function newFilm(name, opt) {
  if (!/^[a-z0-9_-]+$/i.test(name || '')) { console.error('usage: node studio.mjs new <film> --placement=reels|youtube|feed|square --duration=30 [--fps=30]'); process.exit(2); }
  const dir = join(STUDIO, name);
  if (existsSync(dir)) { console.error(`${name}/ already exists; nothing written`); process.exit(1); }
  const place = PLACEMENTS[opt.placement || 'reels']; if (!place) { console.error(`placement: ${Object.keys(PLACEMENTS).join(', ')}`); process.exit(2); }
  const duration = Number(opt.duration || 30), fps = Number(opt.fps || 30), delivery = `${opt.placement || 'reels'}${duration}`;
  mkdirSync(dir);
  const plan = JSON.parse(readFileSync(join(STUDIO, 'templates', 'production.json'), 'utf8'));
  plan.duration = duration; plan.fps = fps; plan.assets = [];
  plan.shots = [{ id: 'hook', start: 0, end: duration, purpose: 'REPLACE: split into hook / proof / payoff shots', assetIds: [], craft: { scale: 'REPLACE', camera: 'REPLACE', focal: 'REPLACE', transition: 'cut', layers: ['text'] } }];
  delete plan.cues;
  writeFileSync(join(dir, 'production.json'), JSON.stringify(plan, null, 2));
  writeFileSync(join(dir, 'config.mjs'), `// ${name} — ${duration} s, ONE delivery: ${place.note}. Authored ${place.w}×${place.h} @ ${fps} fps.
export default {
  title: '${name}',
  film: '${name}/film.js',
  score: '${name}/score.mjs',
  production: '${name}/production.json',
  ownerRequest: { delivery: '${delivery}', w: ${place.w}, h: ${place.h}, duration: ${duration}, fps: ${fps} }, // AUTONOMOUS_FILM.md
  w: ${place.w}, h: ${place.h}, fps: ${fps}, lufs: -14, tp: -1.5, shareMB: 14,
  preview: { delivery: '${delivery}', range: [0, ${Math.min(12, duration)}] },
  deliveries: [{ name: '${delivery}', duration: ${duration}, safe: ${JSON.stringify(place.safe)}, shareMB: 14, poster: ${Math.max(0, duration - 2)} }],
  thumbs: [], holds: [],
};
`);
  writeFileSync(join(dir, 'film.js'), `// ${name}: every frame is a pure function of t (no Date.now, no Math.random; use rng/hash from lib/motion.js / lib/kinetics.js).
import { textLine, playLine } from '../lib/motion.js';

let W, H, title;
export default {
  duration: ${duration},
  fps: ${fps},
  init(stage, { W: w, H: h }) {
    W = w; H = h;
    stage.style.background = '#101418';
    // Readable copy uses .line/.word spans (textLine) so the studio's text checks can read it back.
    title = textLine(stage, 'REPLACE العنوان', { left: '0', top: \`\${H * 0.4}px\`, width: \`\${W}px\`, justifyContent: 'center', fontFamily: "'Alexandria'", fontSize: '96px', fontWeight: '700', color: '#fff' });
  },
  render(t) {
    playLine(title, t, 0.5, ${Math.max(1, duration - 1.5)});
  },
};
`);
  writeFileSync(join(dir, 'score.mjs'), `// ${name} score: writes takes/${name}/{mix,music,sfx}.wav. Compose on the picture's own cue times (production.json cues).
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bus, writeWav, pad } from '../lib/audio.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'takes', '${name}');
mkdirSync(OUT, { recursive: true });
const D = ${duration} + 1, music = new Bus(D), sfx = new Bus(D), mix = new Bus(D);
pad(music, 0, [57, 60, 64], ${duration}, 0.8); // REPLACE with the real score
music.mixInto(mix); sfx.mixInto(mix);
writeWav(join(OUT, 'music.wav'), music); writeWav(join(OUT, 'sfx.wav'), sfx); writeWav(join(OUT, 'mix.wav'), mix);
`);
  writeFileSync(join(dir, 'BRIEF.md'), `# ${name} — brief\n\nPlacement: ${place.note}, ${place.w}×${place.h}, ${duration} s, ${fps} fps.\n\n- Viewer:\n- One promise:\n- Real evidence (assets + rights):\n- CTA:\n- Direction (one hero, palette, two type roles, camera, transitions, sound):\n- Assumptions:\n`);
  writeFileSync(join(dir, 'LEDGER.md'), `# LEDGER — ${name}\ntime → issue → severity → fix → result. Takes live in \`studio/out/${name}/\` (not in git).\n\n| time | issue | sev | fix | result |\n|---|---|---|---|---|\n`);
  console.log(`Created ${name}/ (config, production.json, film.js, score.mjs, BRIEF.md, LEDGER.md).\nNext: fill BRIEF + production.json, declare craft.layers per shot, then: node studio.mjs route ${name} && node make.mjs ${name}`);
}

if (isMain(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'caps') caps();
  else if (cmd === 'route') await routeCmd(args.filter(a => !a.startsWith('--')));
  else if (cmd === 'setup') setup(args[0]);
  else if (cmd === 'doctor') { const { doctor } = await import('./lib/doctor.mjs'); const r = await doctor(); caps(); process.exitCode = r.ok ? 0 : 1; }
  else if (cmd === 'new') newFilm(args[0], flags(args));
  else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 9).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
}
