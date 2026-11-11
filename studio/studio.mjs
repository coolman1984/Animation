#!/usr/bin/env node
// Front door of the studio: one command for the questions an agent asks before and while making a film or a site.
//   node studio.mjs                 every command, grouped by job (HELP below is the one list; the dispatcher and the test read it)
//   node studio.mjs help <word>     only the commands that mention <word>, e.g. help web · help voice · help render
// A wrong command name prints the nearest real ones and exits 2. A failed command prints one line (add --debug for the stack).
// Films are then built with make.mjs (WORKFLOW.md). Registry: capabilities.json. Architecture: PLATFORM.md.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadRegistry, detect, route, STUDIO } from './lib/capabilities.mjs';
import { PYTHON, WINDOWS, isMain, memoryBudget } from './lib/platform.mjs';

const PLACEMENTS = {
  reels: { w: 1080, h: 1920, safe: [65, 269, 1015, 1248], note: 'Facebook/Instagram Reels, YouTube Shorts (commonly published Meta safe band)' },
  youtube: { w: 1920, h: 1080, safe: [96, 54, 1824, 1026], note: 'normal YouTube video (5 % margins)', share: false }, // YouTube re-encodes uploads: deliver the master
  feed: { w: 1080, h: 1350, safe: [54, 68, 1026, 1282], note: 'Facebook/Instagram portrait feed (5 % margins)' },
  square: { w: 1080, h: 1080, safe: [54, 54, 1026, 1026], note: 'square post (5 % margins)' },
};

const pad = (s, n) => String(s ?? '').padEnd(n);
const flags = args => Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));
const pos = args => args.filter(a => !a.startsWith('--'));
// A usage error: the caller typed the command wrong (exit 2, no "error:" prefix, never a stack).
const usage = (message) => Object.assign(new Error(message.startsWith('usage:') ? message : `usage: ${message}`), { usage: true });

// Every command, grouped by the job it serves. Each row: [what to type after `node studio.mjs`, what it does].
export const HELP = [
  ['Start here', [
    ['doctor', 'full machine check: browser, ffmpeg, fonts, memory (lib/doctor.mjs)'],
    ['caps', 'every capability: maturity, installed?, best use'],
    ['setup <profile>', 'install a tool pack (vision, audio, live, logo, gpu, physics, color, whisper, covers) or show links (core, pro)'],
    ['agents [--sync]', 'any-model door: AGENTS.md, skill mirror for other agents, MCP client configs + server handshake (ANY_MODEL.md)'],
    ['toolkit [check | update <name> --from=<clone>]', 'third-party agent tools vendored whole (toolkit/README.md)'],
    ['cleanup', 'kill browsers left by crashed runs, remove their temp profiles, show memory headroom'],
  ]],
  ['Plan and make a film', [
    ['new <film> --placement=reels|youtube|feed|square --duration=30 [--fps=30]', 'a hand-built film folder (config, production.json, film.js, score.mjs, BRIEF, LEDGER)'],
    ['route text particles:4000 3d', 'which engine for these layers (or: route <film>)'],
    ['director plan <film> --placement=reels|youtube --duration=15 [--mode=showreel|product|launch-story|explainer --brand= --cta= --problem= --promise= --viewer= --endState= --logo= --style=]', 'house-method spec skeleton for the Studio Engine'],
    ['director review <film> [--format=reel|youtube] [--frames] [--json]', 'the house critic: score /100 with named rules'],
    ['director inspect <film | engine film> [--times=1,2.5]', 'eyes without vision: scene graph + character map'],
    ['storyboard <film>', 'shot-list check before any render (production.json or engine spec)'],
    ['styles [slug | lemo/<slug>] [--library=lemo]', 'house style cards (styles/README.md) + 59 Lemo-Opuscar film styles'],
    ['moves search <words> [--library=motion-prompt|cinetic|shotcraft --pack= --category=]', 'find a named move (library/README.md)'],
    ['moves show|prompt|code <#id | technique-id>  ·  moves list  ·  moves draw --format=launch|feature|loop|sting|walkthrough|vertical [--energy=calm --seconds=30 --seed=]', 'read one move, list them, or draw a seeded technique plan'],
    ['cover <spec.json> [--out=studio/out/covers/name.png] [--renderer=satori|chromium]', 'title card or thumbnail (lib/covers.mjs)'],
  ]],
  ['Render, watch and judge', [
    ['build <film> [--profile=draft|review|final] [--range=a:b] [--only=…]', 'the safe way to render: reaps orphans, sizes workers to memory, resumes, logs to takes/<film>/build-full.log'],
    ['review <film | out/<film>/takeNN> [--port=8765] [--no-open]', 'playback review: frame steps, A/B, timed notes, hash-bound approval'],
    ['triage <video.mp4> [--format=reel] [--brand=brand.json | --palette=#hex,#hex] [--ask="q1|q2"]', 'code checks every frame; the critic opens only the flagged ones'],
    ['taste <video.mp4 | film> [--json]  ·  taste calibrate', 'the owner-calibrated taste gate on a finished export'],
    ['color check|scopes|range', 'export colour accuracy (ΔE), scopes for one frame, legal range'],
  ]],
  ['Sound and voice', [
    ['sfx "words" [--n=8] [--music|--effects] [--any-license] [--download=<film> --pick=1]', 'Openverse first (owner rule): free licensed audio with its credit record'],
    ['sounds [category]', 'the house sound library with source and rights'],
    ['voice [status | say <text> --lang=ar | script <film>]', 'voice studio: providers, one line, a film\'s script (VOICE_STUDIO.md)'],
    ['transcript <pack-folder | transcript.json> [--out=base] [--translation=layer.json --layer=en]', 'captions and edit lists from one transcript'],
    ['captions <video|audio> [--lang=ar|en|auto]', 'local speech-to-text captions (whisper.cpp, faster-whisper, sherpa-onnx)'],
    ['mixcheck <audio|video>', 'clipping, mono fold-down, phone-speaker survival, stereo phase'],
  ]],
  ['Websites', [
    ['web plan <site> [--brand= --style= --lang=ar|en --cta= --problem= --promise=]', 'site.json skeleton + DESIGN.md (web/WEB.md, level: web/FOUNDATION.md)'],
    ['web build|check|serve <site> [--draft] [--all]', 'build the static site, check it in a real browser at phone/tablet/desktop (--all lists every finding), or serve it'],
    ['web audit <label> --dir=<existing site folder> [--page=index.html] [--before=<label>] [--all]', 'measure any site before and after an improvement'],
    ['web system "<product, industry, mood>" [--site=<site>]', 'UI UX Pro Max design system for web stage B'],
    ['web styles', 'the three web style presets'],
    ['gallery', 'website design gallery: directions to choose from + rating of existing work (web/gallery/README.md)'],
    ['lab', 'motion lab: easing curve, frame ruler, export commands (web/lab/README.md)'],
  ]],
];
const HELP_ROWS = HELP.flatMap(([, rows]) => rows);
export const helpCommands = () => [...new Set(HELP_ROWS.map(([u]) => u.split(/[\s|]/)[0]))];
export function helpText(word) {
  const w = String(word || '').toLowerCase(), hit = ([u, about]) => !w || `${u} ${about}`.toLowerCase().includes(w);
  const out = ['Studio front door — node studio.mjs <command> (from studio/; from the repo root: node studio/studio.mjs <command>)'];
  for (const [group, rows] of HELP) {
    const some = w && group.toLowerCase().includes(w) ? rows : rows.filter(hit); if (!some.length) continue;
    out.push('', group);
    for (const [u, about] of some) out.push(`  ${u}`, `      ${about}`);
  }
  if (out.length === 1) out.push('', `no command mentions "${word}"; node studio.mjs lists them all`);
  else out.push('', w ? 'node studio.mjs lists every command.' : 'One group only: node studio.mjs help <word> (web, voice, render…). Films are built with make.mjs / studio-engine/run.mjs (WORKFLOW.md).');
  return out.join('\n');
}
// The nearest real commands to a mistyped one: same start, or at most two edits away.
export function nearest(cmd, names) {
  const dist = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  const c = String(cmd).toLowerCase();
  return names.map((n) => [n, n.startsWith(c) || c.startsWith(n) ? 0 : dist(c, n)]).filter(([, d]) => d <= 2).sort((a, b) => a[1] - b[1]).map(([n]) => n).slice(0, 3);
}

function caps() {
  const all = detect(loadRegistry());
  console.log(`\n${pad('CAPABILITY', 20)}${pad('MATURITY', 14)}${pad('STATUS', 11)}${pad('DEPT', 13)}BEST FOR`);
  for (const c of all) console.log(`${pad(c.id, 20)}${pad(c.maturity, 14)}${pad(c.status, 11)}${pad(c.department, 13)}${c.bestFor}`);
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
  } else if (!args.length) throw usage('node studio.mjs route text particles:4000 3d   (or: route <film folder with config.mjs>)');
  else groups = [{ label: 'request', needs: args }];
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
  if (!p) throw usage(`node studio.mjs setup <profile>   profiles: ${Object.keys(reg.profiles).join(', ')}`);
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
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name || '')) throw usage('node studio.mjs new <film> --placement=reels|youtube|feed|square --duration=30 [--fps=30]');
  const dir = join(STUDIO, name);
  if (existsSync(dir)) throw new Error(`${name}/ already exists; nothing written`);
  const place = PLACEMENTS[opt.placement || 'reels']; if (!place) throw usage(`--placement must be one of: ${Object.keys(PLACEMENTS).join(', ')}`);
  // A flag without a value is `true` (Number(true) = 1) and a typo is NaN: both used to write a broken film folder.
  const num = (v, fallback) => (v === undefined ? fallback : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  const duration = num(opt.duration, 30), fps = num(opt.fps, 30), delivery = `${opt.placement || 'reels'}${duration}`;
  if (!(duration > 0 && duration <= 3600)) throw usage(`--duration must be seconds between 0 and 3600 (got ${opt.duration})`);
  if (!(Number.isInteger(fps) && fps >= 1 && fps <= 120)) throw usage(`--fps must be a whole number from 1 to 120 (got ${opt.fps})`);
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
  w: ${place.w}, h: ${place.h}, fps: ${fps}, lufs: -14, tp: -1.5,
  preview: { delivery: '${delivery}', range: [0, ${Math.min(12, duration)}] },
  deliveries: [{ name: '${delivery}', duration: ${duration}, safe: ${JSON.stringify(place.safe)}${place.share === false ? '' : ', shareMB: 14'}, poster: ${Math.max(0, duration - 2)} }],
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

// Voice studio (VOICE_STUDIO.md): providers, one line, a film's voice.json script.
async function voiceCmd([sub, ...rest], opt) {
  const v = await import('./lib/voice.mjs');
  if (!sub || sub === 'status') { for (const p of v.voiceStatus()) console.log(`${pad(p.provider, 11)}${pad(p.offline ? 'offline' : 'cloud', 9)}${pad(p.ready ? 'READY' : 'not set', 9)}${p.voices.join('; ')}`); return; }
  if (sub === 'say') {
    if (!rest.join(' ').trim()) throw usage('node studio.mjs voice say <text> --lang=ar|en [--voice=id --provider=… --final]');
    const [r] = await v.generate({ id: 'say', text: rest.join(' '), language: opt.lang || 'ar', dialect: opt.dialect, voice: opt.voice, provider: opt.provider || 'auto',
      performance: { style: opt.style, pace: opt.pace ? +opt.pace : undefined, energy: opt.energy }, out: opt.out || join(STUDIO, 'takes', 'voice-say.wav') }, { mode: opt.final ? 'final' : 'draft' });
    console.log(`${r.file} · ${r.duration}s · ${r.voice} (${r.provider}) · spoken: ${r.spoken}`); return;
  }
  if (sub === 'script') {
    if (!rest[0]) throw usage('node studio.mjs voice script <film> [--final]');
    const m = await v.renderScript(rest[0], { mode: opt.final ? 'final' : 'draft', duration: opt.duration ? +opt.duration : undefined });
    for (const l of m.lines) console.log(`${pad(l.id, 8)} t=${pad(l.t, 7)} ${pad(l.duration + 's', 9)} slot ${l.slot ?? '-'}${l.overruns ? '  OVERRUNS: shorten the line' : ''}  ${l.voice}`);
    console.log(`manifest: takes/${rest[0]}/voice/manifest.json — listen before calling it natural.`); return;
  }
  throw usage('node studio.mjs voice [status] | say <text> --lang=ar|en [--voice=id --provider=… --style=warm --pace=0.95 --final] | script <film> [--final]');
}
async function transcriptCmd(src, opt) {
  if (!src) throw usage('node studio.mjs transcript <pack-folder | transcript.json> [--out=base] [--translation=layer.json --layer=en]');
  const T = await import('./lib/transcript.mjs');
  const file = existsSync(join(src, 'transcript.json')) ? join(src, 'transcript.json') : src;
  if (!existsSync(file)) throw new Error(`no transcript at ${file}`);
  const raw = JSON.parse(readFileSync(file, 'utf8')), t = raw.version === 1 && raw.sentences ? raw : T.fromLive(raw, { file });
  if (opt.translation) T.addLayer(t, opt.layer || 'en', 'translation', t.language, JSON.parse(readFileSync(opt.translation, 'utf8')));
  const out = T.exportAll(t, opt.out || file.replace(/\.json$/, ''), { layer: opt.translation ? opt.layer || 'en' : undefined });
  console.log(`${t.sentences.length} sentences, ${t.words.length} words, language ${t.language}, speakers ${t.speakers.map(s => s.id).join(',') || '-'}`);
  console.log(`fillers ${T.fillers(t).length}, repeated phrases ${T.repeats(t).length}, best cut points: ${T.cutPoints(t).slice(0, 3).map(c => c.t + 's').join(', ')}`);
  for (const [k, f] of Object.entries(out)) console.log(`  ${pad(k, 10)} ${f}`);
}
async function captionsCmd(src, opt) {
  const { caption, USAGE } = await import('./lib/whisper.mjs');
  if (!src) throw usage(USAGE);
  if (!existsSync(src)) throw new Error(`no such file: ${src}`);
  const r = caption(src, opt);
  if (!r.ok) { console.error(r.message); process.exit(r.code || 2); }
  console.log(`${r.backend} · ${r.model || '-'} · ${r.wordTiming}`);
  console.log(`${r.transcript.sentences.length} sentences, ${r.transcript.words.length} words, language ${r.transcript.language}`);
  for (const [k, f] of Object.entries(r.files)) console.log(`  ${pad(k, 10)} ${f}`);
}
async function colorCmd([sub, video, t], opt) {
  const c = await import('./lib/color.mjs');
  if (sub === 'check') { const r = await c.colorCheck({ dither: !!opt.dither, lut: opt.lut }); console.log(`ΔE mean ${r.meanDE}, max ${r.maxDE} over ${r.patches.length} patches (< 1 invisible, > 3 a real shift)${r.lut ? ' with LUT ' + r.lut : ''}`); return; }
  if ((sub === 'scopes' || sub === 'range') && (!video || !existsSync(video))) throw usage(`node studio.mjs color ${sub} <video>${sub === 'scopes' ? ' <t> [--out=png]' : ''}   (${video ? `no such file: ${video}` : 'a video file is required'})`);
  if (sub === 'scopes') { console.log(await c.scopes(video, +(t || 0), opt.out || join(STUDIO, 'takes', 'scopes.png'))); return; }
  if (sub === 'range') { console.log(JSON.stringify(await c.legalRange(video))); return; }
  throw usage('node studio.mjs color check [--dither --lut=file.cube] | scopes <video> <t> [--out=png] | range <video>   (LUTs: python tools/ocio_bake.py)');
}

// Playback review: serve out/<film>/ and open the newest take's player (or the given take folder).
// Kill browsers whose node died, remove stale temp profiles (never a live run's), report memory headroom.
async function cleanupCmd() {
  const { reap, liveEntries } = await import('./lib/procs.mjs');
  const { readdirSync, rmSync } = await import('node:fs'); const { tmpdir } = await import('node:os');
  const killed = reap({ log: console.log });
  const keep = new Set(liveEntries().map((e) => e.profile));
  let removed = 0;
  for (const d of readdirSync(tmpdir())) { const p = join(tmpdir(), d); if (/^(studio-chrome-|doctor-)/.test(d) && !keep.has(p)) { try { rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); removed++; } catch {} } }
  const mb = memoryBudget({ refresh: true });
  console.log(`orphan browsers killed: ${killed.length} · temp profiles removed: ${removed} · live studio browsers: ${keep.size}`);
  console.log(`memory headroom now ${mb.headroomGB} GB (RAM free ${mb.freeGB} GB${mb.commitFreeGB !== null ? `, commit free ${mb.commitFreeGB} GB, page file ${mb.pagefileMB} MB ${mb.pagefileAuto ? 'system-managed' : 'FIXED'}` : ''})`);
}
// The safe way to render: orphans reaped, memory reported, make.mjs run as a child with EVERYTHING (including a native crash
// message) written to takes/<film>/build-full.log, exit code passed through. Workers are capped by memory inside render.mjs.
async function buildCmd(args) {
  const film = args.find((a) => !a.startsWith('--'));
  if (!film) throw usage('node studio.mjs build <film> [--profile=draft|review|final] [--range=a:b] [--only=…] [--workers=n]');
  if (!existsSync(join(STUDIO, film, 'config.mjs'))) throw new Error(`no film "${film}" (studio/${film}/config.mjs is missing). Hand-built films: node studio.mjs new ${film} …; Studio Engine films render with: node studio-engine/run.mjs <film>`);
  const { reap } = await import('./lib/procs.mjs');
  const { createWriteStream, mkdirSync: mk } = await import('node:fs');
  const { spawn } = await import('node:child_process');
  reap({ log: console.log });
  const mb = memoryBudget();
  console.log(`memory headroom ${mb.headroomGB} GB${mb.commitFreeGB !== null ? ` (commit free ${mb.commitFreeGB} GB, page file ${mb.pagefileMB} MB ${mb.pagefileAuto ? 'system-managed' : 'FIXED'})` : ''}`);
  mk(join(STUDIO, 'takes', film), { recursive: true });
  const logPath = join(STUDIO, 'takes', film, 'build-full.log'), out = createWriteStream(logPath);
  out.write(`${new Date().toISOString()} node make.mjs ${args.join(' ')}\n`);
  const child = spawn(process.execPath, ['make.mjs', ...args], { cwd: STUDIO, stdio: ['ignore', 'pipe', 'pipe'] });
  const tee = (chunk) => { process.stdout.write(chunk); out.write(chunk); };
  child.stdout.on('data', tee); child.stderr.on('data', tee);
  const code = await new Promise((res) => child.on('close', (c, sig) => res(c ?? `signal ${sig}`)));
  out.end(`\n[exit ${code}]\n`);
  console.log(`\nbuild exit ${code} · full log: ${logPath}`);
  if (code !== 0) { reap({ log: console.log }); console.log('the run failed: fix the cause and run the same build again; finished slices are reused (resume)'); }
  process.exitCode = code === 0 ? 0 : 1;
}
async function reviewCmd(target, opt) {
  const { readdirSync, statSync } = await import('node:fs');
  const { dirname, basename, resolve } = await import('node:path');
  let take = target && existsSync(resolve(target)) && statSync(resolve(target)).isDirectory() ? resolve(target) : null;
  if (!take && target && existsSync(join(STUDIO, 'out', target))) {
    const takes = readdirSync(join(STUDIO, 'out', target)).filter(d => /^take\d+$/.test(d)).sort();
    if (takes.length) take = join(STUDIO, 'out', target, takes.at(-1));
  }
  if (!target) throw usage('node studio.mjs review <film | out/<film>/takeNN> [--port=8765] [--no-open]');
  if (!take) throw new Error(`nothing to review for "${target}": no take folder under studio/out/${target}/ (exports are local and never in git; render one with: node studio.mjs build ${target} --profile=review)`);
  const players = readdirSync(take).filter(d => d.startsWith('review-') && existsSync(join(take, d, 'player.html')));
  if (!players.length) throw new Error(`${take} has no review player (build it with --profile=review or final)`);
  const { reviewServer } = await import('./lib/review-server.mjs');
  const srv = await reviewServer(dirname(take), { port: Number(opt.port || 0) });
  const urls = players.map(p => `http://127.0.0.1:${srv.port}/${basename(take)}/${p}/player.html`);
  console.log(`Review server for ${dirname(take)} (Ctrl+C to stop):\n${urls.map(u => '  ' + u).join('\n')}\nNotes and approval are saved next to each export (<video>.review.json); approval is tied to the file's SHA-256.`);
  if (!opt['no-open']) spawnSync(WINDOWS ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open', WINDOWS ? ['/c', 'start', '', urls[0]] : [urls[0]], { stdio: 'ignore' });
}

// Openverse first (owner rule 2026-10-16): search free licensed audio, optionally download one with its credit record.
async function sfxCmd(q, opt) {
  if (!String(q || '').trim()) throw usage('node studio.mjs sfx "words" [--n=8] [--music|--effects] [--any-license] [--download=<film> --pick=1]');
  const ov = await import('./lib/openverse.mjs');
  const category = opt.music ? 'music' : opt.effects ? 'sound_effect' : undefined;
  const { total, results } = await ov.searchAudio(q, { n: opt.n, anyLicense: !!opt['any-license'], category });
  console.log(`Openverse: ${total} results for "${q}" (${opt['any-license'] ? 'ANY licence: check before use' : 'commercial-use licences'})`);
  results.forEach((r, i) => console.log(`${pad(i + 1, 3)}${pad(r.title.slice(0, 44), 46)}${pad(ov.fmtDur(r.duration), 9)}${pad(r.license, 12)}${pad(r.creator.slice(0, 20), 22)}${r.page || r.url}`));
  if (opt.download) {
    const pick = results[(+opt.pick || 1) - 1]; if (!pick) throw new Error(`no result #${opt.pick || 1}`);
    const d = await ov.downloadAudio(pick, String(opt.download), { query: q });
    console.log(`saved ${d.path} (${d.record.license}); credit added to ${String(opt.download)}/assets/sfx/CREDITS.md`);
  }
}

// The director's kit for any model (ANY_MODEL.md): a house-method plan, the house critic, and eyes (scene graph + character map).
async function directorCmd([sub, film], opt) {
  const { readFileSync: rf, existsSync: ex, mkdirSync: mk, writeFileSync: wf } = await import('node:fs');
  const ENG = join(STUDIO, 'studio-engine'), dir = film && join(ENG, 'films', film);
  const brandOf = () => JSON.parse(rf(ex(join(dir, 'brand.json')) ? join(dir, 'brand.json') : join(ENG, 'brand', 'brand.json'), 'utf8'));
  // A typed-wrong film name used to end in a raw ENOENT stack: name the folder and the next command instead.
  const specOf = () => { if (!film) throw usage(`node studio.mjs director ${sub} <film>`); const p = join(dir, 'spec.json'); if (!ex(p)) throw new Error(`no Studio Engine film "${film}" (studio-engine/films/${film}/spec.json is missing; start one with: node studio.mjs director plan ${film} --placement=reels --duration=15)`); try { return JSON.parse(rf(p, 'utf8')); } catch (e) { throw new Error(`studio-engine/films/${film}/spec.json is not valid JSON: ${e.message}`); } };
  if (sub === 'plan') {
    if (!film || !/^[a-z0-9][a-z0-9_-]*$/.test(film)) throw usage('node studio.mjs director plan <film> --placement=reels|youtube --duration=15');
    if (opt.duration !== undefined && !(Number(opt.duration) > 0)) throw usage(`--duration must be seconds (got ${opt.duration})`);
    if (opt.style) (await import('./lib/styles.mjs')).brandFor(opt.style);   // an unknown style must fail before anything is written
    if (ex(join(dir, 'spec.json')) && !opt.force) throw new Error(`${film} already has a spec (use --force to replace it)`);
    const { plan } = await import('./studio-engine/lib/director.mjs');
    const r = plan({ ...opt, duration: opt.duration ? +opt.duration : undefined });
    mk(dir, { recursive: true }); wf(join(dir, 'spec.json'), JSON.stringify(r.spec, null, 2) + '\n');
    if (opt.style) { const { brandFor } = await import('./lib/styles.mjs'); wf(join(dir, 'brand.json'), JSON.stringify(brandFor(opt.style), null, 2) + '\n'); console.log(`style ${opt.style}: palette and fonts → studio-engine/films/${film}/brand.json (card: styles/${opt.style}/STYLE.md)`); }
    console.log(`studio-engine/films/${film}/spec.json — ${r.arc.seconds} s: hook ${r.arc.hook} beats · chapters ${r.arc.chapters.join('+')} · payoff ${r.arc.payoff}\nWrite these (${r.todo.length}):`);
    for (const t of r.todo) console.log(`  ${pad(t.path, 34)} ${t.write}`);
    console.log('Then: node studio.mjs director review ' + film + ' → node studio-engine/run.mjs ' + film + ' --stage=stills');
    return;
  }
  if (sub === 'review') {
    const { critique } = await import('./studio-engine/lib/critic.mjs');
    const spec = specOf(), brand = brandOf(), format = opt.format || spec.format || 'youtube';
    if (!brand.export.formats[format]) throw usage(`--format must be one of: ${Object.keys(brand.export.formats).join(', ')}`);
    let frames;
    if (opt.frames) {
      const pkg = spawnSync(process.execPath, ['studio-engine/run.mjs', film, '--stage=check', `--format=${format}`], { cwd: STUDIO, encoding: 'utf8' });
      if (pkg.status !== 0) throw new Error('spec check failed:\n' + pkg.stdout + pkg.stderr);
      const { inspect } = await import('./lib/scenegraph.mjs'), { timeline } = await import('./studio-engine/lib/events.js'), { forFormat } = await import('./studio-engine/lib/spec.mjs');
      const tl = timeline(forFormat(spec, format)), fmt = brand.export.formats[format];
      const times = tl.scenes.flatMap((s) => [s.a + (s.b - s.a) * 0.5, s.b - 0.3]).map((t) => +Math.max(0.05, Math.min(tl.duration - 0.05, t)).toFixed(2));
      frames = await inspect({ film: join(ENG, `b-${film}-${format}`, 'film.js'), times, w: fmt.w, h: fmt.h, safe: fmt.safe });
    }
    const r = critique(spec, brand, { format, frames, facts: ex(join(dir, 'facts.json')) ? JSON.parse(rf(join(dir, 'facts.json'), 'utf8')) : undefined });
    if (opt.json) { console.log(JSON.stringify(r, null, 2)); return; }
    console.log(`${film} · ${format} · house score ${r.score}/100 — ${r.verdict}`);
    for (const x of r.rules) console.log(`${x.status === 'pass' ? 'PASS' : x.status === 'warn' ? 'WARN' : 'FAIL'}  ${pad(x.id, 22)} ${x.evidence}${x.status !== 'pass' && x.fix ? `\n      → ${x.fix}` : ''}`);
    if (r.principles?.length) { console.log('Manual checklist (not scored) — skill animation-principles, MCP principle_read:'); for (const p of r.principles) console.log(`  ${pad(p.id, 22)} ${p.question}`); }
    process.exitCode = r.rules.some((x) => x.status === 'fail') ? 1 : 0;
    return;
  }
  if (sub === 'inspect') {
    const { inspect } = await import('./lib/scenegraph.mjs');
    let path, w, h, safe, duration;
    if (film && ex(join(STUDIO, film, 'config.mjs'))) {
      const cfg = (await import(pathToFileURL(join(STUDIO, film, 'config.mjs')).href)).default, d = cfg.deliveries?.[0] || {};
      path = join(STUDIO, cfg.film); w = cfg.w; h = cfg.h; safe = d.safe; duration = d.duration || cfg.ownerRequest?.duration;
    } else if (film && ex(join(dir, 'spec.json'))) {
      const spec = specOf(), format = opt.format || spec.format || 'youtube', fmt = brandOf().export.formats[format];
      if (!fmt) throw usage(`--format must be one of: ${Object.keys(brandOf().export.formats).join(', ')}`);
      const pkg = spawnSync(process.execPath, ['studio-engine/run.mjs', film, '--stage=check', `--format=${format}`], { cwd: STUDIO, encoding: 'utf8' });
      if (pkg.status !== 0) throw new Error('spec check failed:\n' + pkg.stdout + pkg.stderr);
      const { timeline } = await import('./studio-engine/lib/events.js'); duration = timeline(spec).duration;
      path = join(ENG, `b-${film}-${format}`, 'film.js'); ({ w, h, safe } = fmt);
    } else throw usage(`node studio.mjs director inspect <studio film folder | engine film> [--times=1,2.5]${film ? `   (no film "${film}" in studio/ or studio-engine/films/)` : ''}`);
    const times = opt.times ? String(opt.times).split(',').map(Number) : Array.from({ length: Math.max(1, Math.floor(duration || 10)) }, (_, i) => i + 0.5);
    if (!times.length || times.some((t) => !Number.isFinite(t) || t < 0)) throw usage('--times must be seconds separated by commas, e.g. --times=1,2.5');
    for (const f of await inspect({ film: path, times, w, h, safe })) {
      console.log(`\n── ${f.t} s · focal ${f.focal ? f.focal.kind + (f.focal.text ? ` "${f.focal.text}"` : '') : 'none'} · balance x ${f.balance.x} y ${f.balance.y}`);
      console.log(f.map);
      for (const i of f.items.filter((i) => i.kind === 'text')) console.log(`  T "${i.text}" ${i.size}px ${i.color} on ${i.on || '?'} contrast ${i.contrast ?? '?'} box ${[i.x0, i.y0, i.x1, i.y1].join(',')}`);
      for (const x of f.findings) console.log(`  ${x.level.toUpperCase()} ${x.rule}: ${x.msg}`);
    }
    return;
  }
  throw usage('node studio.mjs director plan|review|inspect <film> … (ANY_MODEL.md; node studio.mjs help director)');
}

// Taste gate (lib/tastegate.mjs) and storyboard lint (lib/storyboard.mjs): judgments any model can run, calibrated on the owner's verdicts.
// Frame triage (lib/triage.mjs): measure every sampled frame in code, write the flagged frames + CRITIC.md for the critic model.
async function triageCmd([video], opt) {
  if (!video) throw usage('node studio.mjs triage <video.mp4> [--format=reel|youtube|square|post] [--brand=brand.json | --palette=#hex,#hex] [--ask="q1|q2"] [--out=dir] [--json]');
  if (!existsSync(video)) throw new Error(`no such file: ${video}`);
  const { triage } = await import('./lib/triage.mjs');
  const palette = opt.palette ? String(opt.palette).split(',') : opt.brand ? Object.values(JSON.parse(readFileSync(opt.brand, 'utf8')).colors || {}).filter((c) => /^#[0-9a-f]{6}$/i.test(c)) : [];
  const r = triage(video, { format: opt.format, palette, out: opt.out, questions: opt.ask ? String(opt.ask).split('|') : [] });
  if (opt.json) { console.log(JSON.stringify(r, null, 2)); return; }
  for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${pad(c.id, 10)} ${c.value} (want ${c.want})`);
  console.log(`text: ${r.text}`);
  for (const m of r.moments) console.log(`FLAG  ${pad(m.t.toFixed(2) + ' s', 9)} ${pad(m.kind, 11)} ${m.why}`);
  console.log(`${r.sampled} frames measured → the critic opens ${r.opened}${r.flagged > r.opened ? ` (of ${r.flagged} flagged; worst first)` : ''}. Brief: ${join(r.out, 'CRITIC.md')}`);
  process.exitCode = r.checks.every((c) => c.ok) ? 0 : 1;
}

async function tasteCmd([target], opt) {
  const tg = await import('./lib/tastegate.mjs'), { readdirSync: rd, existsSync: ex, readFileSync: rf, writeFileSync: wf } = await import('node:fs');
  const latest = (film) => { const base = join(STUDIO, 'out', film); if (!ex(base)) return null; const takes = rd(base).filter((d) => /^take\d+$/.test(d)).sort((a, b) => +a.slice(4) - +b.slice(4)); for (const t of takes.reverse()) { const v = rd(join(base, t)).filter((f) => f.endsWith('.mp4')).sort((a, b) => (/-share-/.test(b) ? 1 : 0) - (/-share-/.test(a) ? 1 : 0))[0]; if (v) return join(base, t, v); } return null; };
  const takeFile = (film, take) => { const d = join(STUDIO, 'out', film, take); if (!ex(d)) return null; const v = rd(d).filter((f) => f.endsWith('.mp4')).sort((a, b) => (/-share-/.test(b) ? 1 : 0) - (/-share-/.test(a) ? 1 : 0))[0]; return v ? join(d, v) : null; };
  if (target === 'calibrate') {
    const V = JSON.parse(rf(join(STUDIO, 'taste', 'verdicts.json'), 'utf8')).verdicts, rows = [];
    for (const v of V) { const f = takeFile(v.film, v.take); console.log(`${pad(v.film + ' ' + v.take, 18)} ${pad(v.verdict, 9)} ${pad(v.about, 8)} ${f ? 'measuring…' : 'export not on this machine — skipped'}`); if (f && v.about !== 'sound') rows.push({ ...v, metrics: tg.measure(tg.decodeGray(f)) }); }
    for (const r of rows) console.log(`  ${pad(r.film + ' ' + r.take, 16)} fast ${r.metrics.fastRatio} · blank ${r.metrics.blankRunS} s · still ${r.metrics.stillRunS} s`);
    const c = tg.calibrate(rows); console.log(c.note);
    if (rows.length) { wf(join(STUDIO, 'taste', 'calibration.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), ...c, rows: rows.map(({ film, take, verdict, metrics }) => ({ film, take, verdict, fastRatio: metrics.fastRatio, blankRunS: metrics.blankRunS })) }, null, 2) + '\n'); console.log('wrote taste/calibration.json'); }
    return;
  }
  const file = target && ex(target) ? target : target ? latest(target) : null;
  if (!target) throw usage('node studio.mjs taste <video.mp4 | film with out/<film>/takeNN> [--json] · taste calibrate');
  if (!file) throw new Error(`no export found for "${target}": not a file, and studio/out/${target}/takeNN/ holds no .mp4 (exports are local and never in git)`);
  const r = tg.tasteGate(file);
  if (opt.json) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log(`${file}\n${r.verdict}`);
  for (const l of r.lights) console.log(`${pad(l.light.toUpperCase(), 7)} ${pad(l.id, 15)} ${l.why}`);
  process.exitCode = r.lights.some((l) => l.light === 'red') ? 1 : 0;
}
async function storyboardCmd([film]) {
  const sb = await import('./lib/storyboard.mjs'), { existsSync: ex, readFileSync: rf } = await import('node:fs');
  let shots;
  if (film && ex(join(STUDIO, film, 'production.json'))) shots = sb.shotsFromProduction(JSON.parse(rf(join(STUDIO, film, 'production.json'), 'utf8')));
  else if (film && ex(join(STUDIO, 'studio-engine', 'films', film, 'spec.json'))) shots = sb.shotsFromSpec(JSON.parse(rf(join(STUDIO, 'studio-engine', 'films', film, 'spec.json'), 'utf8')));
  else throw usage(`node studio.mjs storyboard <film folder with production.json | engine film>${film ? `   (no film "${film}" in studio/ or studio-engine/films/)` : ''}`);
  const r = sb.lintStoryboard(shots);
  for (const s of shots) console.log(`${pad(s.id, 14)} ${pad(`${(+s.start).toFixed(1)}–${(+s.end).toFixed(1)} s`, 12)} ${String(s.subject || '—').slice(0, 40)} → ${String(s.action || '—').slice(0, 50)}`);
  console.log(r.ok ? (r.issues.length ? 'storyboard OK, with notes:' : 'storyboard OK') : 'storyboard has RED issues: fix before any render');
  for (const x of r.issues) console.log(`${pad(x.level.toUpperCase(), 7)} ${pad(x.shot, 14)} ${x.msg}\n        → ${x.fix}`);
  process.exitCode = r.ok ? 0 : 1;
}

// Motion lab (web/lab/README.md): static teaching page, served the same way as `web serve`.
async function labCmd() {
  const { serve } = await import('./lib/serve.mjs');
  const s = await serve(join(STUDIO, 'web', 'lab'), { cache: 'no-cache' });   // an edit shows on reload
  console.log(`http://127.0.0.1:${s.port}/index.html  (Ctrl+C to stop)`);
}

// Design gallery (web/gallery/README.md): served from web/ so it can show the other web folders.
async function galleryCmd() {
  const { serve } = await import('./lib/serve.mjs');
  const s = await serve(join(STUDIO, 'web'), { cache: 'no-cache' });
  console.log(`http://127.0.0.1:${s.port}/gallery/index.html  (Ctrl+C to stop)`);
}

// Web department (web/WEB.md): plan → write → build → check (phone / tablet / desktop) → serve.
// One line per light; --all adds every finding under it (the line itself keeps only the first few).
function printLights(lights, all) {
  for (const l of lights) { console.log(`${pad(l.light.toUpperCase(), 7)} ${pad(l.id, 20)} ${l.why}`); if (all && l.light !== 'green') for (const x of l.items || []) console.log(`${pad('', 28)} · ${x}`); }
  if (!all && lights.some((l) => l.light !== 'green' && (l.items?.length || 0) > 4)) console.log('(every finding, not only the first few: add --all)');
}
async function webCmd([sub, name, ...more], opt) {
  const W = await import('./web/lib/site.mjs'), { existsSync: ex, readFileSync: rf, writeFileSync: wf, mkdirSync: mk } = await import('node:fs');
  if (sub === 'styles') { for (const s of W.STYLES().styles) console.log(`${pad(s.slug, 18)}${pad(s.mood, 52)}${s.bestFor}`); return; }
  if (sub === 'system') {   // stage B (WEB.md): UI UX Pro Max's generator; --site saves it beside DESIGN.md for §B
    const { designSystem } = await import('./lib/toolkit.mjs'), text = designSystem([name, ...more].join(' '), { name: opt.name || opt.site, stack: opt.stack });
    if (opt.site) { const d = join(STUDIO, 'web', 'sites', String(opt.site)); mk(d, { recursive: true }); wf(join(d, 'design-system.md'), text); console.log(`saved web/sites/${opt.site}/design-system.md: copy what fits into DESIGN.md §B (Arabic-capable fonts, tinted neutrals, ≥ 4.5:1); the brief and the owner's taste win.`); }
    else console.log(text);
    return;
  }
  if (!name || !/^[a-z0-9][a-z0-9_-]*$/.test(name)) throw usage('node studio.mjs web plan|build|check|serve <site> (lowercase folder name) · web audit <label> --dir=<folder> [--page=index.html] [--before=<label>] · web system "<brief>" · web styles (build/check/serve need a filled DESIGN.md, or --draft)');
  if (sub === 'audit') {   // any existing static site (the owner's site, another framework's build output): measure before and after an improvement
    if (!opt.dir || opt.dir === true) throw usage('node studio.mjs web audit <label> --dir=<folder with index.html> [--page=…] [--before=<earlier label>]');
    if (!ex(join(opt.dir, opt.page || 'index.html'))) throw new Error(`no ${opt.page || 'index.html'} in ${opt.dir}`);
    const { checkSite, compareAudits } = await import('./web/lib/check.mjs'), out = join(STUDIO, 'takes', 'web', name), r = await checkSite({ dir: opt.dir, outDir: out, page: opt.page || 'index.html' });
    wf(join(out, 'audit.json'), JSON.stringify(r, null, 2));
    console.log(`${name}: ${r.verdict}`); printLights(r.lights, opt.all);
    if (opt.before) { const p = join(STUDIO, 'takes', 'web', opt.before, 'audit.json'); if (!ex(p)) throw new Error(`no earlier audit ${opt.before}`); const c = compareAudits(JSON.parse(rf(p, 'utf8')), r);
      console.log(`\nbefore (${opt.before}) → after (${name}): ${c.better} better, ${c.worse.length} worse${c.worse.length ? ': ' + c.worse.join(', ') : ''}`); for (const x of c.rows.filter((x) => x.change !== 'same')) console.log(`  ${pad(x.id, 20)} ${x.before} → ${x.after}`); if (c.worse.length) process.exitCode = 1; }
    console.log(`screenshots: ${r.viewports.filter((v) => v.sheet).map((v) => v.sheet).join(' · ')}`);
    if (r.lights.some((l) => l.light === 'red')) process.exitCode = 1;
    return;
  }
  const dir = join(STUDIO, 'web', 'sites', name), file = join(dir, 'site.json'), dist = join(dir, 'dist');
  if (sub === 'plan') {
    if (ex(file) && !opt.force) throw new Error(`${name} already has a site.json (use --force to replace it)`);
    const r = W.plan(opt); mk(dir, { recursive: true }); wf(file, JSON.stringify(r.site, null, 2) + '\n');
    if (!ex(join(dir, 'DESIGN.md'))) wf(join(dir, 'DESIGN.md'), rf(join(STUDIO, 'web', 'templates', 'DESIGN.md'), 'utf8'));   // stages A–D record (WEB.md)
    console.log(`web/sites/${name}/site.json — style ${r.site.style}, ${r.site.sections.length} sections. First answer the ambition questions, then write these (${r.todo.length}):`);
    for (const t of r.todo) console.log(`  ${pad(t.path, 30)} ${t.write}`);
    console.log(`Also fill web/sites/${name}/DESIGN.md (direction → design system → motion storyboard → critique log) before building.`);
    console.log(`Then: node studio.mjs web build ${name} → node studio.mjs web check ${name}`);
    return;
  }
  if (!ex(file)) throw new Error(`no web/sites/${name}/site.json (node studio.mjs web plan ${name})`);
  const site = JSON.parse(rf(file, 'utf8'));
  if (['build', 'check', 'serve'].includes(sub)) {   // stages A–D come first (WEB.md "One workflow"); --draft previews without them, labelled
    const d = W.designRecord(dir);
    if (!d.ok && !opt.draft) throw new Error(`${name}: ${d.errors.join('; ')}. Fill web/sites/${name}/DESIGN.md first, or add --draft for a labelled preview.`);
    if (!d.ok) console.log(`DRAFT (not a delivery): ${d.errors.join('; ')}`);
  }
  if (sub === 'build') { const r = W.build(site, dist, { siteDir: dir }); console.log(`built web/sites/${name}/dist: ${r.files.length} files, ${Math.round(r.bytes / 1024)} KB`); for (const w of r.warnings) console.log(`note: ${w}`); return; }
  if (sub === 'check') {
    W.build(site, dist, { siteDir: dir });   // always check the current site.json, never an older build
    const { checkSite } = await import('./web/lib/check.mjs'), out = join(STUDIO, 'takes', 'web', name), r = await checkSite({ dir: dist, outDir: out });
    console.log(`${name}: ${r.verdict}`); printLights(r.lights, opt.all);
    console.log(`screenshots: ${r.viewports.filter((v) => v.sheet).map((v) => v.sheet).join(' · ')}`);
    process.exitCode = r.lights.some((l) => l.light === 'red') ? 1 : 0; return;
  }
  if (sub === 'serve') { if (!ex(join(dist, 'index.html'))) W.build(site, dist, { siteDir: dir }); const { serve } = await import('./lib/serve.mjs'); const s = await serve(dist, { cache: 'no-cache' }); console.log(`http://127.0.0.1:${s.port}/index.html  (Ctrl+C to stop)`); return; }
  throw usage(`node studio.mjs web plan|build|check|serve <site> · web audit · web system · web styles   (unknown: web ${sub})`);
}

// Move library (library/README.md): Motion Prompt's 120 numbered moves + Cinetic's 273 measured techniques, offline.
async function movesCmd([sub, ...rest], opt) {
  const M = await import('./lib/movelib.mjs');
  if (sub === 'search') {
    if (!rest.join(' ').trim()) throw usage('node studio.mjs moves search <words> [--library=motion-prompt|cinetic|shotcraft --pack= --category=]');
    const r = M.search(rest.join(' '), { library: opt.library || 'all', pack: opt.pack, category: opt.category, limit: +opt.limit || 12 });
    if (!r.length) console.log('nothing matched; try other words (English, Arabic or Japanese) or: node studio.mjs moves list');
    for (const x of r) console.log(`${pad(x.id, 34)}${pad(x.pack, 20)}${x.name}${x.ar ? ` · ${x.ar}` : ''}\n${pad('', 34)}${x.what}`);
    return;
  }
  if (sub === 'list') {
    if (opt.library === 'shotcraft') { for (const c of M.shotcraft()) { if (opt.category && c.category !== opt.category) continue; console.log(`${pad(c.category, 14)}${pad(c.name, 36)}${c.en.slice(0, 110)}`); } return; }
    if (opt.library !== 'cinetic') { const { packs, elements } = M.motionPrompt(); for (const p of Object.values(packs)) { if (opt.pack && p.pack !== opt.pack) continue; console.log(`\nMotion Prompt · ${p.pack} — ${p.title.en} (#${p.first}–#${p.last}, card ${p.width}x${p.height}, cycle ${p.cycle} s)`); for (const e of elements.filter((e) => e.pack === p.pack)) console.log(`  #${e.id} ${pad(e.name.en, 26)}${e.ar?.name || ''}`); } }
    if (opt.library !== 'motion-prompt' && !opt.pack) { const t = M.cinetic().techniques; console.log(`\nCinetic: ${t.length} techniques`); for (const c of M.CATEGORIES) { if (opt.category && c !== opt.category) continue; const xs = t.filter((x) => x.category === c); console.log(`  ${pad(c, 24)}${xs.length}${opt.category ? '\n' + xs.map((x) => `    ${pad(x.id, 40)}${pad(x.role, 10)}${x.name}`).join('\n') : ''}`); } }
    return;
  }
  const id = rest[0];
  if (['show', 'prompt', 'code'].includes(sub)) {
    if (!id) throw usage(`node studio.mjs moves ${sub} <#012 | technique-id>`);
    const e = M.mpElement(id);
    if (e) {
      if (sub === 'prompt') return console.log(M.mpPrompt(id));
      if (sub === 'code') return console.log(M.mpCode(id));
      console.log(`#${e.id} ${e.name.en} (${e.name.ja})${e.ar ? ` · ${e.ar.name}: ${e.ar.meaning}` : ''}\npack ${e.pack} · ${e.category} · card ${e.width}x${e.height} · cycle ${e.cycle} s · demo ${e.demo}\n\n${e.summary.en}\n${e.spec.en.map((s) => `- ${s}`).join('\n')}\nUse it: ${e.use.en}\nAsk for it: ${e.ask.en}${e.ar?.studio ? `\nStudio already has: ${e.ar.studio}` : ''}\n\nIn a film: import ${e.pack} from '../library/motion-prompt/packs/${e.pack}.js'; drawCard(ctx, ${e.pack}, ${+e.no}, u, { x, y, scale }) from lib/mpcard.js`);
      return;
    }
    const sc = M.shotCard(id);
    if (sc && sub === 'show') return console.log(`${sc.name}  [video-shotcraft · ${sc.category}]\n${sc.en}\n${sc.file} · demo source ${M.shotDemo(sc)}\n\n${sc.text}`);
    if (sub !== 'show') throw new Error(`${id} is not a Motion Prompt number (#001–#120); Cinetic techniques have only "show"`);
    const t = M.technique(id);
    console.log(`${t.name}  [${t.id}]\n${t.category} · ${t.role} · energy ${t.energy} · ${t.formats.join(', ')}\n\n${t.summary}\n\nBuild: ${t.build}${t.fullLook ? `\n(Full look needs ${t.fullLookNeeds.join(', ')}: ${t.fullLook})` : ''}\nTiming (60 fps): ${t.timing}\nUse when: ${t.useWhen}\nAvoid when: ${t.avoidWhen}`);
    return;
  }
  if (sub === 'draw') {
    const r = M.draw({ format: opt.format || 'launch', energy: opt.energy || 'calm', seconds: opt.seconds, category: opt.category, n: opt.n, seed: opt.seed, exclude: String(opt.exclude || '').split(',').filter(Boolean), brandSupplied: String(opt['brand-supplied'] || '').split(',').filter(Boolean) });
    console.log(`Drawn techniques (seed ${r.seed}: --seed=${r.seed} repeats this plan). Build the picks the concept can carry; reroll one at most twice (--category=<cat> --exclude=<id>) or drop it with a reason. Our house method still decides taste.\n`);
    for (const t of r.picks) console.log(`${pad(t.category, 24)}${pad(t.id, 40)}${t.name}\n${pad('', 24)}build: ${t.build.slice(0, 220)}${t.build.length > 220 ? '…' : ''}\n${pad('', 24)}timing: ${t.timing.slice(0, 160)}${t.timing.length > 160 ? '…' : ''}`);
    console.log('\nRead one in full: node studio.mjs moves show <id>');
    return;
  }
  if (sub === 'sync') {
    if (opt['motion-prompt']) console.log('motion-prompt', M.syncMotionPrompt(opt['motion-prompt']));
    if (opt.cinetic) console.log('cinetic', M.syncCinetic(opt.cinetic));
    if (!opt['motion-prompt'] && !opt.cinetic) throw usage('node studio.mjs moves sync --motion-prompt=<clone> --cinetic=<clone>  (read the clones first: they are third-party data)');
    return;
  }
  throw usage('node studio.mjs moves search|list|show|prompt|code|draw|sync (library/README.md)');
}

// Toolkit (toolkit/README.md): third-party agent tools from pinned commits, each with its licence and a wrapper skill.
async function toolkitCmd([sub, name], opt) {
  const T = await import('./lib/toolkit.mjs');
  if (!sub) { for (const p of T.packages()) console.log(`${pad(p.name, 16)}${pad(p.licence, 12)}${pad(p.skill ? `skill ${p.skill}` : 'library', 24)}${p.what.slice(0, 120)}${p.what.length > 120 ? '…' : ''}`); for (const x of T.manifest().notVendored) console.log(`${pad(x.name, 22)}${pad(x.licence, 12)}${pad('not copied', 24)}${x.why.slice(0, 120)}…`); return; }
  if (sub === 'check') { const r = T.checkToolkit(); for (const i of r.items) console.log(`${i.ok ? 'PASS' : 'FAIL'}  ${i.what}${i.detail ? ` — ${i.detail}` : ''}`); process.exitCode = r.ok ? 0 : 1; return; }
  if (sub === 'update' && name && opt.from) { console.log(T.updatePackage(name, opt.from)); return; }
  throw usage('node studio.mjs toolkit [check | update <name> --from=<clone>]  (read the clone first: it is third-party code)');
}

// Any model, one studio (ANY_MODEL.md): every agent must see the same rules, skills and tools.
async function agentsCmd(opt) {
  const ag = await import('./lib/agents.mjs');
  if (opt.sync) { const r = ag.syncSkills(); console.log(`skills mirrored to .agents/skills: ${r.skills} (${r.wrote.length} file(s) written${r.removed.length ? `, removed ${r.removed.join(', ')}` : ''})`); }
  const door = ag.doorCheck();
  for (const i of door.items) console.log(`${i.ok ? 'PASS' : 'FAIL'}  ${i.what}${i.detail ? ` — ${i.detail}` : ''}`);
  try {
    const h = await ag.handshake();
    const tools = h.tools.result?.tools?.map((t) => t.name) || [];
    console.log(`${tools.length ? 'PASS' : 'FAIL'}  MCP server: protocol ${h.initialize.result?.protocolVersion}, ${tools.length} tools (${tools.join(', ')})`);
    if (!tools.length) door.ok = false;
  } catch (e) { console.log(`FAIL  MCP server: ${e.message}`); door.ok = false; }
  process.exitCode = door.ok ? 0 : 1;
}

// One table: the dispatcher, the help and test/frontdoor.test.mjs all read it, so a command can no longer exist without help.
export const COMMANDS = {
  caps: () => caps(),
  route: (a) => routeCmd(pos(a)),
  setup: (a) => setup(a[0]),
  doctor: async () => { const { doctor } = await import('./lib/doctor.mjs'); const r = await doctor(); caps(); process.exitCode = r.ok ? 0 : 1; },
  new: (a) => newFilm(pos(a)[0], flags(a)),
  review: (a) => reviewCmd(pos(a)[0], flags(a)),
  voice: (a) => voiceCmd(pos(a), flags(a)),
  transcript: (a) => transcriptCmd(pos(a)[0], flags(a)),
  captions: (a) => captionsCmd(pos(a)[0], flags(a)),
  mixcheck: async (a) => { const f = pos(a)[0]; if (!f) throw usage('node studio.mjs mixcheck <audio|video>'); if (!existsSync(f)) throw new Error(`no such file: ${f}`); const { mixCheck } = await import('./lib/mixcheck.mjs'); console.log(JSON.stringify(await mixCheck(f), null, 2)); },
  color: (a) => colorCmd(pos(a), flags(a)),
  build: (a) => buildCmd(a),
  cleanup: () => cleanupCmd(),
  agents: (a) => agentsCmd(flags(a)),
  toolkit: (a) => toolkitCmd(pos(a), flags(a)),
  triage: (a) => triageCmd(pos(a), flags(a)),
  taste: (a) => tasteCmd(pos(a), flags(a)),
  styles: async (a) => { const st = await import('./lib/styles.mjs'), o = flags(a), slug = pos(a)[0]; if (slug) console.log(st.readStyle(slug)); else for (const s of st.listStyles({ library: o.library })) console.log(s.library === 'lemo' ? `${pad(s.slug, 30)}${s.essence}` : `${pad(s.slug, 17)}${pad(s.route, 9)}${pad(s.from.join(', '), 34)}${s.bestFor}`); },
  web: (a) => webCmd(pos(a), flags(a)),
  lab: () => labCmd(),
  gallery: () => galleryCmd(),
  storyboard: (a) => storyboardCmd(pos(a)),
  director: (a) => directorCmd(pos(a), flags(a)),
  moves: (a) => movesCmd(pos(a), flags(a)),
  sfx: (a) => sfxCmd(pos(a).join(' '), flags(a)),
  sounds: async (a) => { const { searchSounds } = await import('./lib/sounds.mjs'); for (const s of searchSounds(pos(a)[0] || '')) console.log(`${pad(s.id, 20)}${pad(s.category, 11)}${pad(s.kind, 7)}${s.use}  [${s.rights}]`); },
  cover: async (a) => (await import('./lib/covers.mjs')).coverCli(pos(a)[0], flags(a)),
};

// Returns the exit code. A failed command prints ONE line an agent (or the owner) can act on; --debug or STUDIO_DEBUG=1 adds the stack.
export async function main(argv = process.argv.slice(2), { log = console.log, err = console.error } = {}) {
  const [cmd, ...args] = argv;
  if (!cmd || ['help', '--help', '-h'].includes(cmd)) { log(helpText(pos(args)[0])); return 0; }
  const run = COMMANDS[cmd];
  if (!run) { const near = nearest(cmd, Object.keys(COMMANDS)); err(`unknown command "${cmd}"${near.length ? ` — did you mean: ${near.join(', ')}?` : ''}\nnode studio.mjs lists every command`); return 2; }
  if (args.some((a) => a === '--help' || a === '-h')) { log(helpText(cmd)); return 0; }
  try { await run(args); return process.exitCode ?? 0; }
  catch (e) {
    err(e?.usage ? e.message : `error: ${e?.message || e}`);
    if (args.includes('--debug') || process.env.STUDIO_DEBUG) err(e?.stack || ''); else if (!e?.usage) err('(add --debug for the stack trace)');
    return e?.usage ? 2 : 1;
  }
}

if (isMain(import.meta.url)) {
  const code = await main();
  process.exitCode = code;
  // a failed command must not hang on a server or browser it opened before failing
  if (code !== 0) setTimeout(() => process.exit(code), 300).unref();
}
