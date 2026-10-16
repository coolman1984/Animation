#!/usr/bin/env node
// Front door of the studio. One command for the questions an agent asks before making a film:
//   node studio.mjs                          this help
//   node studio.mjs caps                     every capability: maturity, installed?, best use
//   node studio.mjs route text particles:4000 3d     which engine for these layers (or: route <film>)
//   node studio.mjs setup <profile>          install a tool pack (vision, audio, live, logo, gpu, color) or show links (core, pro)
//   node studio.mjs doctor                   full machine check (lib/doctor.mjs)
//   node studio.mjs new <film> --placement=reels|youtube|feed|square --duration=30 [--fps=30]
//   node studio.mjs review <film | out/<film>/takeNN>     playback review: frame steps, A/B, timed notes, hash-bound approval
//   node studio.mjs voice [status | say <text> --lang=ar | script <film>]   voice studio (VOICE_STUDIO.md)
//   node studio.mjs transcript <pack>  ·  mixcheck <audio|video>  ·  color check|scopes|range  ·  sounds [category]  ·  sfx "words" [--n=8] [--music|--effects] [--any-license] [--download=filmNN --pick=1]
//   node studio.mjs build <film> [make flags]   the safe way to render: reaps orphans, sizes workers to memory, logs everything to takes/<film>/build-full.log
//   node studio.mjs cleanup                     kill browsers left by crashed runs, remove their temp profiles, show memory headroom
//   node studio.mjs director plan <film> --placement=reels|youtube --duration=15 [--brand= --cta= --problem= --promise= --viewer= --logo=]
//   node studio.mjs director review <film> [--format=reel|youtube] [--frames]   ·   director inspect <film | path/film.js> [--times=1,2.5]
//   node studio.mjs taste <video.mp4 | film> [--json]  ·  taste calibrate     the owner-calibrated taste gate on a finished export
//   node studio.mjs storyboard <film>                 shot-list check before any render (production.json or engine spec)
//   node studio.mjs styles [slug]                     house style cards from our delivered films (styles/README.md)
//   node studio.mjs web plan <site> [--brand= --style= --lang=ar|en --cta= --problem= --promise=] · web build|check|serve <site> · web styles   (web/WEB.md)
//   node studio.mjs agents [--sync]             any-model door: AGENTS.md, skill mirror for other agents, MCP client configs + server handshake (ANY_MODEL.md)
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
    const [r] = await v.generate({ id: 'say', text: rest.join(' '), language: opt.lang || 'ar', dialect: opt.dialect, voice: opt.voice, provider: opt.provider || 'auto',
      performance: { style: opt.style, pace: opt.pace ? +opt.pace : undefined, energy: opt.energy }, out: opt.out || join(STUDIO, 'takes', 'voice-say.wav') }, { mode: opt.final ? 'final' : 'draft' });
    console.log(`${r.file} · ${r.duration}s · ${r.voice} (${r.provider}) · spoken: ${r.spoken}`); return;
  }
  if (sub === 'script') {
    const m = await v.renderScript(rest[0], { mode: opt.final ? 'final' : 'draft', duration: opt.duration ? +opt.duration : undefined });
    for (const l of m.lines) console.log(`${pad(l.id, 8)} t=${pad(l.t, 7)} ${pad(l.duration + 's', 9)} slot ${l.slot ?? '-'}${l.overruns ? '  OVERRUNS: shorten the line' : ''}  ${l.voice}`);
    console.log(`manifest: takes/${rest[0]}/voice/manifest.json — listen before calling it natural.`); return;
  }
  console.error('usage: node studio.mjs voice [status] | say <text> --lang=ar|en [--voice=id --provider=… --style=warm --pace=0.95 --final] | script <film> [--final]');
}
async function transcriptCmd(src, opt) {
  if (!src) { console.error('usage: node studio.mjs transcript <pack-folder | transcript.json> [--out=base] [--translation=layer.json --layer=en]'); process.exit(2); }
  const T = await import('./lib/transcript.mjs');
  const file = existsSync(join(src, 'transcript.json')) ? join(src, 'transcript.json') : src;
  const raw = JSON.parse(readFileSync(file, 'utf8')), t = raw.version === 1 && raw.sentences ? raw : T.fromLive(raw, { file });
  if (opt.translation) T.addLayer(t, opt.layer || 'en', 'translation', t.language, JSON.parse(readFileSync(opt.translation, 'utf8')));
  const out = T.exportAll(t, opt.out || file.replace(/\.json$/, ''), { layer: opt.translation ? opt.layer || 'en' : undefined });
  console.log(`${t.sentences.length} sentences, ${t.words.length} words, language ${t.language}, speakers ${t.speakers.map(s => s.id).join(',') || '-'}`);
  console.log(`fillers ${T.fillers(t).length}, repeated phrases ${T.repeats(t).length}, best cut points: ${T.cutPoints(t).slice(0, 3).map(c => c.t + 's').join(', ')}`);
  for (const [k, f] of Object.entries(out)) console.log(`  ${pad(k, 10)} ${f}`);
}
async function colorCmd([sub, video, t], opt) {
  const c = await import('./lib/color.mjs');
  if (sub === 'check') { const r = await c.colorCheck({ dither: !!opt.dither, lut: opt.lut }); console.log(`ΔE mean ${r.meanDE}, max ${r.maxDE} over ${r.patches.length} patches (< 1 invisible, > 3 a real shift)${r.lut ? ' with LUT ' + r.lut : ''}`); return; }
  if (sub === 'scopes') { console.log(await c.scopes(video, +(t || 0), opt.out || join(STUDIO, 'takes', 'scopes.png'))); return; }
  if (sub === 'range') { console.log(JSON.stringify(await c.legalRange(video))); return; }
  console.error('usage: node studio.mjs color check [--dither --lut=file.cube] | scopes <video> <t> [--out=png] | range <video>   (LUTs: python tools/ocio_bake.py)');
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
  if (!film) { console.error('usage: node studio.mjs build <film> [--profile=draft|review|final] [--range=a:b] [--only=…] [--workers=n]'); process.exit(2); }
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
  if (!take) { console.error('usage: node studio.mjs review <film | out/<film>/takeNN> [--port=8765] [--no-open]'); process.exit(2); }
  const players = readdirSync(take).filter(d => d.startsWith('review-') && existsSync(join(take, d, 'player.html')));
  if (!players.length) { console.error(`${take} has no review player (build it with --profile=review or final)`); process.exit(1); }
  const { reviewServer } = await import('./lib/review-server.mjs');
  const srv = await reviewServer(dirname(take), { port: Number(opt.port || 0) });
  const urls = players.map(p => `http://127.0.0.1:${srv.port}/${basename(take)}/${p}/player.html`);
  console.log(`Review server for ${dirname(take)} (Ctrl+C to stop):\n${urls.map(u => '  ' + u).join('\n')}\nNotes and approval are saved next to each export (<video>.review.json); approval is tied to the file's SHA-256.`);
  if (!opt['no-open']) spawnSync(WINDOWS ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open', WINDOWS ? ['/c', 'start', '', urls[0]] : [urls[0]], { stdio: 'ignore' });
}

// Openverse first (owner rule 2026-10-16): search free licensed audio, optionally download one with its credit record.
async function sfxCmd(q, opt) {
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
  if (sub === 'plan') {
    if (!film || !/^[a-z0-9][a-z0-9_-]*$/.test(film)) throw new Error('usage: director plan <film> --placement=reels|youtube --duration=15');
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
    const spec = JSON.parse(rf(join(dir, 'spec.json'), 'utf8')), brand = brandOf(), format = opt.format || spec.format || 'youtube';
    let frames;
    if (opt.frames) {
      const pkg = spawnSync(process.execPath, ['studio-engine/run.mjs', film, '--stage=check', `--format=${format}`], { cwd: STUDIO, encoding: 'utf8' });
      if (pkg.status !== 0) throw new Error('spec check failed:\n' + pkg.stdout + pkg.stderr);
      const { inspect } = await import('./lib/scenegraph.mjs'), { timeline } = await import('./studio-engine/lib/events.js'), { forFormat } = await import('./studio-engine/lib/spec.mjs');
      const tl = timeline(forFormat(spec, format)), fmt = brand.export.formats[format];
      const times = tl.scenes.flatMap((s) => [s.a + (s.b - s.a) * 0.5, s.b - 0.3]).map((t) => +Math.max(0.05, Math.min(tl.duration - 0.05, t)).toFixed(2));
      frames = await inspect({ film: join(ENG, `b-${film}-${format}`, 'film.js'), times, w: fmt.w, h: fmt.h, safe: fmt.safe });
    }
    const r = critique(spec, brand, { format, frames });
    if (opt.json) { console.log(JSON.stringify(r, null, 2)); return; }
    console.log(`${film} · ${format} · house score ${r.score}/100 — ${r.verdict}`);
    for (const x of r.rules) console.log(`${x.status === 'pass' ? 'PASS' : x.status === 'warn' ? 'WARN' : 'FAIL'}  ${pad(x.id, 22)} ${x.evidence}${x.status !== 'pass' && x.fix ? `\n      → ${x.fix}` : ''}`);
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
      const spec = JSON.parse(rf(join(dir, 'spec.json'), 'utf8')), format = opt.format || spec.format || 'youtube', fmt = brandOf().export.formats[format];
      const pkg = spawnSync(process.execPath, ['studio-engine/run.mjs', film, '--stage=check', `--format=${format}`], { cwd: STUDIO, encoding: 'utf8' });
      if (pkg.status !== 0) throw new Error('spec check failed:\n' + pkg.stdout + pkg.stderr);
      const { timeline } = await import('./studio-engine/lib/events.js'); duration = timeline(spec).duration;
      path = join(ENG, `b-${film}-${format}`, 'film.js'); ({ w, h, safe } = fmt);
    } else throw new Error('usage: director inspect <studio film folder | engine film> [--times=1,2.5]');
    const times = opt.times ? String(opt.times).split(',').map(Number) : Array.from({ length: Math.max(1, Math.floor(duration || 10)) }, (_, i) => i + 0.5);
    for (const f of await inspect({ film: path, times, w, h, safe })) {
      console.log(`\n── ${f.t} s · focal ${f.focal ? f.focal.kind + (f.focal.text ? ` "${f.focal.text}"` : '') : 'none'} · balance x ${f.balance.x} y ${f.balance.y}`);
      console.log(f.map);
      for (const i of f.items.filter((i) => i.kind === 'text')) console.log(`  T "${i.text}" ${i.size}px ${i.color} on ${i.on || '?'} contrast ${i.contrast ?? '?'} box ${[i.x0, i.y0, i.x1, i.y1].join(',')}`);
      for (const x of f.findings) console.log(`  ${x.level.toUpperCase()} ${x.rule}: ${x.msg}`);
    }
    return;
  }
  console.log('usage: node studio.mjs director plan|review|inspect … (ANY_MODEL.md)');
}

// Taste gate (lib/tastegate.mjs) and storyboard lint (lib/storyboard.mjs): judgments any model can run, calibrated on the owner's verdicts.
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
  if (!file) throw new Error('usage: node studio.mjs taste <video.mp4 | film with out/<film>/takeNN> [--json] · taste calibrate');
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
  else throw new Error('usage: node studio.mjs storyboard <film folder with production.json | engine film>');
  const r = sb.lintStoryboard(shots);
  for (const s of shots) console.log(`${pad(s.id, 14)} ${pad(`${(+s.start).toFixed(1)}–${(+s.end).toFixed(1)} s`, 12)} ${String(s.subject || '—').slice(0, 40)} → ${String(s.action || '—').slice(0, 50)}`);
  console.log(r.ok ? (r.issues.length ? 'storyboard OK, with notes:' : 'storyboard OK') : 'storyboard has RED issues: fix before any render');
  for (const x of r.issues) console.log(`${pad(x.level.toUpperCase(), 7)} ${pad(x.shot, 14)} ${x.msg}\n        → ${x.fix}`);
  process.exitCode = r.ok ? 0 : 1;
}

// Web department (web/WEB.md): plan → write → build → check (phone / tablet / desktop) → serve.
async function webCmd([sub, name], opt) {
  const W = await import('./web/lib/site.mjs'), { existsSync: ex, readFileSync: rf, writeFileSync: wf, mkdirSync: mk } = await import('node:fs');
  if (sub === 'styles') { for (const s of W.STYLES().styles) console.log(`${pad(s.slug, 18)}${pad(s.mood, 52)}${s.bestFor}`); return; }
  if (!name || !/^[a-z0-9][a-z0-9_-]*$/.test(name)) throw new Error('usage: node studio.mjs web plan|build|check|serve <site> (lowercase folder name) · web styles');
  const dir = join(STUDIO, 'web', 'sites', name), file = join(dir, 'site.json'), dist = join(dir, 'dist');
  if (sub === 'plan') {
    if (ex(file) && !opt.force) throw new Error(`${name} already has a site.json (use --force to replace it)`);
    const r = W.plan(opt); mk(dir, { recursive: true }); wf(file, JSON.stringify(r.site, null, 2) + '\n');
    console.log(`web/sites/${name}/site.json — style ${r.site.style}, ${r.site.sections.length} sections. First answer the ambition questions, then write these (${r.todo.length}):`);
    for (const t of r.todo) console.log(`  ${pad(t.path, 30)} ${t.write}`);
    console.log(`Then: node studio.mjs web build ${name} → node studio.mjs web check ${name}`);
    return;
  }
  if (!ex(file)) throw new Error(`no web/sites/${name}/site.json (node studio.mjs web plan ${name})`);
  const site = JSON.parse(rf(file, 'utf8'));
  if (sub === 'build') { const r = W.build(site, dist, { siteDir: dir }); console.log(`built web/sites/${name}/dist: ${r.files.length} files, ${Math.round(r.bytes / 1024)} KB`); for (const w of r.warnings) console.log(`note: ${w}`); return; }
  if (sub === 'check') {
    if (!ex(join(dist, 'index.html'))) W.build(site, dist, { siteDir: dir });
    const { checkSite } = await import('./web/lib/check.mjs'), out = join(STUDIO, 'takes', 'web', name), r = await checkSite({ dir: dist, outDir: out });
    console.log(`${name}: ${r.verdict}`); for (const l of r.lights) console.log(`${pad(l.light.toUpperCase(), 7)} ${pad(l.id, 20)} ${l.why}`);
    console.log(`screenshots: ${r.viewports.filter((v) => v.sheet).map((v) => v.sheet).join(' · ')}`);
    process.exitCode = r.lights.some((l) => l.light === 'red') ? 1 : 0; return;
  }
  if (sub === 'serve') { if (!ex(join(dist, 'index.html'))) W.build(site, dist, { siteDir: dir }); const { serve } = await import('./lib/serve.mjs'); const s = await serve(dist); console.log(`http://127.0.0.1:${s.port}/index.html  (Ctrl+C to stop)`); return; }
  throw new Error('usage: node studio.mjs web plan|build|check|serve <site> · web styles');
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

if (isMain(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'caps') caps();
  else if (cmd === 'route') await routeCmd(args.filter(a => !a.startsWith('--')));
  else if (cmd === 'setup') setup(args[0]);
  else if (cmd === 'doctor') { const { doctor } = await import('./lib/doctor.mjs'); const r = await doctor(); caps(); process.exitCode = r.ok ? 0 : 1; }
  else if (cmd === 'new') newFilm(args[0], flags(args));
  else if (cmd === 'review') await reviewCmd(args[0], flags(args));
  else if (cmd === 'voice') await voiceCmd(args.filter(a => !a.startsWith('--')), flags(args));
  else if (cmd === 'transcript') await transcriptCmd(args[0], flags(args));
  else if (cmd === 'mixcheck') { const { mixCheck } = await import('./lib/mixcheck.mjs'); console.log(JSON.stringify(await mixCheck(args[0]), null, 2)); }
  else if (cmd === 'color') await colorCmd(args.filter(a => !a.startsWith('--')), flags(args));
  else if (cmd === 'build') await buildCmd(args);
  else if (cmd === 'cleanup') await cleanupCmd();
  else if (cmd === 'agents') await agentsCmd(flags(args));
  else if (cmd === 'taste') await tasteCmd(args.filter(a => !a.startsWith('--')), flags(args));
  else if (cmd === 'styles') { const st = await import('./lib/styles.mjs'); if (args[0]) console.log(st.readStyle(args[0])); else for (const s of st.listStyles()) console.log(`${pad(s.slug, 17)}${pad(s.route, 9)}${pad(s.from.join(', '), 34)}${s.bestFor}`); }
  else if (cmd === 'web') await webCmd(args.filter(a => !a.startsWith('--')), flags(args));
  else if (cmd === 'storyboard') await storyboardCmd(args);
  else if (cmd === 'director') await directorCmd(args.filter(a => !a.startsWith('--')), flags(args));
  else if (cmd === 'sfx') await sfxCmd(args.filter(a => !a.startsWith('--')).join(' '), flags(args));
  else if (cmd === 'sounds') { const { searchSounds } = await import('./lib/sounds.mjs'); for (const s of searchSounds(args[0] || '')) console.log(`${pad(s.id, 20)}${pad(s.category, 11)}${pad(s.kind, 7)}${s.use}  [${s.rights}]`); }
  else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
}
