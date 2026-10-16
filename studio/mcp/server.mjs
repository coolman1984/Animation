#!/usr/bin/env node
// Studio MCP server — the film studio as tools for ANY model (Claude, GPT/Codex, Gemini, Grok, Llama, Qwen…) through any MCP client.
// Zero dependencies: JSON-RPC 2.0 over stdio, one JSON message per line (MCP stdio transport); logs go to stderr only.
// The loop it exposes is the Studio Engine's: guide → catalog → spec_save → spec_check → film_stills (the sheet comes back as an
// image for models that can see, and as named text issues for models that cannot) → film_render (background) → film_job.
//   node studio/mcp/server.mjs            (clients start it; see AGENTS.md for each client's config file)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, openSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lint } from '../studio-engine/lib/gates.mjs';
import { timeline } from '../studio-engine/lib/events.js';
import { forFormat } from '../studio-engine/lib/spec.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), STUDIO = resolve(HERE, '..'), ENGINE = join(STUDIO, 'studio-engine');
const FILMS = join(ENGINE, 'films'), JOBS = join(STUDIO, 'takes', 'mcp-jobs');
const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const NAME = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const log = (...a) => process.stderr.write(`[studio-mcp] ${a.join(' ')}\n`);
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const brandOf = (film) => readJSON(existsSync(join(FILMS, film, 'brand.json')) ? join(FILMS, film, 'brand.json') : join(ENGINE, 'brand', 'brand.json'));

// One hint per known failure, so a model of any size knows the next edit, not only what broke.
const HINTS = [
  [/contrast/, 'Pick a colour with ≥ 3:1 contrast on the scene bg; if the text sits on a shape/pill, set "on" to that colour.'],
  [/unknown element/, 'Use a type from engine_catalog.elements (words, stack, extrude, lockup, mark, storm, slice, cards, ring, pill, wipes, slab, hosts, sparks, shape, path, icon, image, ribbon, cursor).'],
  [/starts after the scene ends/, '"at" counts BEATS from the scene start: keep it below the scene\'s "beats".'],
  [/duration must match/, 'Delete "duration" or set it to sum(beats) × 60 / bpm.'],
  [/beats must be/, 'Every scene needs "beats" > 0 (120 BPM: 4 beats = 2 s).'],
  [/ids must be/, 'Give every scene a unique non-empty "id".'],
  [/no elements/, 'Add at least one element: a scene must move.'],
  [/mixes Arabic with Latin/, 'Split the line: one element for Arabic, one for Latin (or pill.parts).'],
  [/is readable/, 'Raise "out" or the scene beats: about 17 characters per second, ≥ 1.8 s per line.'],
  [/leaves the safe area|outside-safe/, 'Move the element toward y 0.5 / x 0.5 or reduce "size"; reels keep copy inside the safe box.'],
  [/overlaps|overlap/, 'Separate the y values or put the lines in one "stack" element.'],
  [/off the 16th grid/, 'Use beat values on quarters (0.25 steps) so picture and music stay locked.'],
  [/asset/, 'List the file in spec.assets (name, kind, prompt or a local file) and reference it with "asset": name.'],
  [/must be a finite/, 'Use a plain number there (no strings, no units).'],
  [/hard cut between two scenes with shapes/, 'Give the outgoing shape "morphTo": "<id of a shape in the next scene>".'],
];
const hint = (msg) => HINTS.find(([re]) => re.test(msg))?.[1] || '';
const issue = (level, msg) => ({ level, scene: /scene ([\w-]+)/.exec(msg)?.[1] || /\(([\w-]+)\)/.exec(msg)?.[1] || null, message: msg, fix: hint(msg) });

function filmDir(film) {
  if (typeof film !== 'string' || !NAME.test(film)) throw new Error('film must be a short lowercase folder name (a-z, 0-9, - or _)');
  return join(FILMS, film);
}
function check(spec, film, format) {
  const brand = brandOf(film), fmt = format || spec.format || 'youtube';
  if (!brand.export.formats[fmt]) return { ok: false, issues: [issue('error', `unknown format ${fmt} (use youtube or reel)`)] };
  const L = lint(forFormat(spec, fmt), brand);
  let summary = null;
  try { const tl = timeline(spec); summary = { seconds: +tl.duration.toFixed(2), bpm: tl.bpm, scenes: tl.scenes.map((s) => ({ id: s.id, from: +s.a.toFixed(2), to: +s.b.toFixed(2), elements: (s.elements || []).map((e) => e.type) })) }; } catch { /* reported by lint */ }
  return { ok: !L.errors.length, format: fmt, summary, issues: [...L.errors.map((m) => issue('error', m)), ...L.warns.map((m) => issue('note', m))] };
}
// Run the engine as a child (same command a person would type); resolves with its exit code and output.
function engine(film, flags, { logFile } = {}) {
  const args = ['studio-engine/run.mjs', film, ...flags];
  if (logFile) {
    // A detached wrapper owns the render and writes "[exit N]" itself, so the job outlives this server (clients restart servers).
    const fd = openSync(logFile, 'a');
    const child = spawn(process.execPath, [join(HERE, 'job.mjs'), logFile, ...args], { cwd: STUDIO, stdio: ['ignore', fd, fd], detached: true, windowsHide: true });
    child.unref();
    return child;
  }
  return new Promise((res) => {
    const child = spawn(process.execPath, args, { cwd: STUDIO, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; const keep = (d) => { out = (out + d).slice(-60000); };
    child.stdout.on('data', keep); child.stderr.on('data', keep);
    child.on('error', (e) => res({ code: 1, out: out + e.message }));
    child.on('close', (code) => res({ code, out }));
  });
}
const engineIssues = (out) => out.split('\n').filter((l) => /ERROR|frame:|\d+ issue|gates failed|rejected|^\[engine\]\s+[\w-]+: [\d.]+ s /.test(l)).map((l) => l.replace(/^\[engine\]\s*/, '').trim())
  .map((m) => issue(/ERROR|failed/.test(m) ? 'error' : 'gate', m.replace(/^ERROR\s*/, '')));
const webName = (s) => { if (typeof s !== 'string' || !NAME.test(s)) throw new Error('site must be a short lowercase folder name'); return s; };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
function jobs() {
  if (!existsSync(JOBS)) return [];
  return readdirSync(JOBS).filter((f) => f.endsWith('.json')).map((f) => readJSON(join(JOBS, f))).sort((a, b) => a.started.localeCompare(b.started));
}
function jobView(j) {
  const text = existsSync(j.log) ? readFileSync(j.log, 'utf8') : '';
  const running = alive(j.pid) && !/\[exit \d+\]/.test(text);
  const deliverable = /deliverable: (.+)/.exec(text)?.[1]?.trim() || null;
  const gates = text.split('\n').filter((l) => /PASS|FAIL|UNCHK|sync:|motion:|rejected|deliverable/.test(l)).slice(-24);
  return { id: j.id, film: j.film, stage: j.stage, format: j.format, state: running ? 'running' : deliverable ? 'delivered' : /\[exit 0\]/.test(text) ? 'finished' : 'failed', deliverable, gates, logTail: text.trim().split('\n').slice(-12), log: j.log };
}
async function sheetImage(sheet) {
  // A contact sheet small enough for any vision model: ≤ 1400 px on the long side, JPEG.
  const small = sheet.replace(/\.png$/, '-mcp.jpg');
  await new Promise((res) => { const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', sheet, '-vf', 'scale=w=1400:h=1400:force_original_aspect_ratio=decrease', '-q:v', '4', small], { stdio: 'ignore' }); p.on('error', res); p.on('close', res); });
  const path = existsSync(small) ? small : sheet;
  return { type: 'image', data: readFileSync(path).toString('base64'), mimeType: path.endsWith('.jpg') ? 'image/jpeg' : 'image/png' };
}

const text = (o) => ({ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) });
const FILM = { type: 'string', description: 'film folder under studio/studio-engine/films (lowercase, a-z 0-9 - _)' };
const FORMAT = { type: 'string', enum: ['youtube', 'reel'], description: 'youtube 1920×1080 or reel 1080×1920; default: the spec\'s format' };
export const TOOLS = [
  { name: 'studio_guide', description: 'START HERE. The studio\'s method for any model: the film loop, house taste, honesty rules and what each next tool does.', inputSchema: { type: 'object', properties: {} },
    run: () => [text(readFileSync(join(STUDIO, 'ANY_MODEL.md'), 'utf8'))] },
  { name: 'engine_catalog', description: 'The spec vocabulary: spec/scene fields and every element type with its parameters, defaults and sound. Read before writing a spec.', inputSchema: { type: 'object', properties: {} },
    run: () => [text(readFileSync(join(ENGINE, 'catalog.json'), 'utf8'))] },
  { name: 'film_list', description: 'Films made with the Studio Engine (each is one spec.json) — read one as a worked example with spec_read.', inputSchema: { type: 'object', properties: {} },
    run: () => [text(readdirSync(FILMS).filter((d) => existsSync(join(FILMS, d, 'spec.json'))).map((d) => { const s = readJSON(join(FILMS, d, 'spec.json')); return { film: d, title: s.title, format: s.format || 'youtube', scenes: s.scenes?.length }; }))] },
  { name: 'spec_read', description: 'Read a film\'s spec.json.', inputSchema: { type: 'object', properties: { film: FILM }, required: ['film'] },
    run: ({ film }) => { const p = join(filmDir(film), 'spec.json'); if (!existsSync(p)) throw new Error(`no spec for ${film}`); return [text(readFileSync(p, 'utf8'))]; } },
  { name: 'spec_save', description: 'Validate a spec and save it as studio/studio-engine/films/<film>/spec.json. Refuses (and saves nothing) while it has errors; every issue carries a "fix" hint.', inputSchema: { type: 'object', properties: { film: FILM, spec: { type: 'object', description: 'the whole spec (see engine_catalog)' }, format: FORMAT }, required: ['film', 'spec'] },
    run: ({ film, spec, format }) => {
      const dir = filmDir(film);
      if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new Error('spec must be an object');
      if (JSON.stringify(spec).length > 400000) throw new Error('spec is larger than 400 kB');
      const r = check(spec, film, format);
      if (!r.ok) return [text({ saved: false, ...r })];
      mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec, null, 2) + '\n');
      return [text({ saved: true, path: `studio/studio-engine/films/${film}/spec.json`, next: 'spec_check, then film_stills', ...r })];
    } },
  { name: 'style_list', description: 'House style cards taken from the studio\'s own delivered films (look, motion, camera grammar, sound, pitfalls). Pick one before planning instead of inventing a look.', inputSchema: { type: 'object', properties: {} },
    run: async () => { const { listStyles } = await import('../lib/styles.mjs'); return [text(listStyles())]; } },
  { name: 'style_read', description: 'Read one style card (STYLE.md). Its source film is a benchmark, never a template: the critic warns when a film repeats a worked example.', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
    run: async ({ slug }) => { const { readStyle } = await import('../lib/styles.mjs'); return [text(readStyle(String(slug)))]; } },
  { name: 'film_plan', description: 'Director\'s plan: turn a brief into a spec skeleton that already follows the house method (hook in 2 s, one hero carried by morphTo, proof chapters on whole bars, payoff with the brand whole and one action). Saves it and lists the ‹…› lines you must write. Use this instead of inventing structure.', inputSchema: { type: 'object', properties: { film: FILM, placement: { type: 'string', enum: ['reels', 'youtube'] }, duration: { type: 'integer', minimum: 8, maximum: 90 }, brand: { type: 'string' }, cta: { type: 'string', description: 'the client\'s own CTA words' }, problem: { type: 'string' }, promise: { type: 'string' }, viewer: { type: 'string' }, logo: { type: 'string', description: 'logo file path relative to the film folder' }, style: { type: 'string', description: 'a slug from style_list: its palette and fonts go to the film\'s brand.json' }, force: { type: 'boolean' } }, required: ['film', 'placement', 'duration'] },
    run: async ({ film, force, ...brief }) => {
      const dir = filmDir(film); if (existsSync(join(dir, 'spec.json')) && !force) throw new Error(`${film} already has a spec; pass force: true to replace it`);
      const { plan } = await import('../studio-engine/lib/director.mjs'), r = plan(brief);
      mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'spec.json'), JSON.stringify(r.spec, null, 2) + '\n');
      if (brief.style) { const { brandFor } = await import('../lib/styles.mjs'); writeFileSync(join(dir, 'brand.json'), JSON.stringify(brandFor(brief.style), null, 2) + '\n'); }
      return [text({ saved: `studio/studio-engine/films/${film}/spec.json`, arc: r.arc, write: r.todo, spec: r.spec, next: 'replace every ‹…› (spec_save with the whole spec), then film_review' })];
    } },
  { name: 'film_review', description: 'The house critic: the owner\'s taste and the studio\'s craft rules as a scorecard (hook in 2 s, one hero, one idea per bar, reading time, type size, payoff + one action, music hook, honesty…), each with evidence and the next edit. frames: true also renders sampled frames and reads them back (~20 s).', inputSchema: { type: 'object', properties: { film: FILM, format: FORMAT, frames: { type: 'boolean' } }, required: ['film'] },
    run: async ({ film, format, frames }) => {
      const p = join(filmDir(film), 'spec.json'); if (!existsSync(p)) throw new Error(`no spec for ${film}`);
      const spec = readJSON(p), fmt = format || spec.format || 'youtube', brand = brandOf(film), { critique } = await import('../studio-engine/lib/critic.mjs');
      let sampled;
      if (frames) {
        const e = await engine(film, ['--stage=check', `--format=${fmt}`]); if (e.code !== 0) return [text({ ok: false, issues: engineIssues(e.out) })];
        const { inspect } = await import('../lib/scenegraph.mjs'), tl = timeline(forFormat(spec, fmt)), F = brand.export.formats[fmt];
        const times = tl.scenes.flatMap((s) => [s.a + (s.b - s.a) * 0.5, s.b - 0.3]).map((t) => +Math.max(0.05, Math.min(tl.duration - 0.05, t)).toFixed(2));
        sampled = await inspect({ film: join(ENGINE, `b-${film}-${fmt}`, 'film.js'), times, w: F.w, h: F.h, safe: F.safe });
      }
      return [text(critique(spec, brand, { format: fmt, frames: sampled }))];
    } },
  { name: 'film_inspect', description: 'Eyes for any model: what is on screen at given times — every text/shape/image box with colour, size, contrast, the focal point, balance, findings, and a character map of the frame (T text, # shape, @ image, * vector, + safe-box corners). Works without vision.', inputSchema: { type: 'object', properties: { film: FILM, format: FORMAT, times: { type: 'array', items: { type: 'number' }, maxItems: 24 } }, required: ['film', 'times'] },
    run: async ({ film, format, times }) => {
      const p = join(filmDir(film), 'spec.json'); if (!existsSync(p)) throw new Error(`no spec for ${film}`);
      if (!Array.isArray(times) || !times.length || times.some((t) => !Number.isFinite(t) || t < 0)) throw new Error('times must be seconds');
      const spec = readJSON(p), fmt = format || spec.format || 'youtube', F = brandOf(film).export.formats[fmt];
      const e = await engine(film, ['--stage=check', `--format=${fmt}`]); if (e.code !== 0) return [text({ ok: false, issues: engineIssues(e.out) })];
      const { inspect } = await import('../lib/scenegraph.mjs');
      const r = await inspect({ film: join(ENGINE, `b-${film}-${fmt}`, 'film.js'), times: times.slice(0, 24), w: F.w, h: F.h, safe: F.safe });
      return r.map((f) => text(`t ${f.t} s · focal ${JSON.stringify(f.focal)} · balance ${JSON.stringify(f.balance)}\n${f.map}\nitems ${JSON.stringify(f.items)}\nfindings ${JSON.stringify(f.findings)}`));
    } },
  { name: 'film_storyboard', description: 'Shot-list check before any render: every scene must name a concrete thing on screen and what it does (scene "purpose"), keep copy short, avoid 8 s+ shots and repeated camera moves, and neither open nor close on a text card. Red issues block.', inputSchema: { type: 'object', properties: { film: FILM }, required: ['film'] },
    run: async ({ film }) => { const p = join(filmDir(film), 'spec.json'); if (!existsSync(p)) throw new Error(`no spec for ${film}`); const sb = await import('../lib/storyboard.mjs'), shots = sb.shotsFromSpec(readJSON(p)); return [text({ ...sb.lintStoryboard(shots), shots })]; } },
  { name: 'film_taste', description: 'The taste gate on a finished MP4: empty frames mid-film (red), how much of the film really moves vs a slideshow (thresholds calibrated on the owner\'s own accepted/rejected films when available), sagging 10 s windows. Pass the deliverable path from film_job.', inputSchema: { type: 'object', properties: { video: { type: 'string', description: 'path of an MP4 inside studio/out or studio/takes' } }, required: ['video'] },
    run: async ({ video }) => { const abs = resolve(STUDIO, video); if (!/\.mp4$/i.test(abs) || ![join(STUDIO, 'out'), join(STUDIO, 'takes')].some((d) => abs.startsWith(d)) || !existsSync(abs)) throw new Error('video must be an existing .mp4 under studio/out or studio/takes'); const { tasteGate } = await import('../lib/tastegate.mjs'); return [text(tasteGate(abs))]; } },
  { name: 'web_plan', description: 'Website department: a site.json skeleton in the house structure (hero → problem → features → sticky steps → 3D ring → FAQ → closing action) plus the ambition questions (what would the best studio build, from which raw material, with which methods). Lists every ‹…› to write.', inputSchema: { type: 'object', properties: { site: { type: 'string', description: 'lowercase folder name under studio/web/sites' }, brand: { type: 'string' }, style: { type: 'string', enum: ['paper-editorial', 'ink-studio', 'clay-3d'] }, lang: { type: 'string', enum: ['ar', 'en'] }, cta: { type: 'string' }, problem: { type: 'string' }, promise: { type: 'string' }, force: { type: 'boolean' } }, required: ['site'] },
    run: async ({ site, force, ...brief }) => { const W = await import('../web/lib/site.mjs'), dir = join(STUDIO, 'web', 'sites', webName(site)); if (existsSync(join(dir, 'site.json')) && !force) throw new Error(`${site} already has a site.json; pass force: true`); const r = W.plan(brief); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'site.json'), JSON.stringify(r.site, null, 2) + '\n'); return [text({ saved: `studio/web/sites/${site}/site.json`, write: r.todo, site: r.site, next: 'web_save the whole site with every ‹…› written, then web_check' })]; } },
  { name: 'web_save', description: 'Validate a whole site.json and save it (refuses while placeholders, unsourced numbers/quotes, missing alt text or links remain).', inputSchema: { type: 'object', properties: { site: { type: 'string' }, json: { type: 'object' } }, required: ['site', 'json'] },
    run: async ({ site, json }) => { const W = await import('../web/lib/site.mjs'), v = W.validate(json); if (v.errors.length) return [text({ saved: false, ...v })]; const dir = join(STUDIO, 'web', 'sites', webName(site)); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'site.json'), JSON.stringify(json, null, 2) + '\n'); return [text({ saved: true, ...v, next: 'web_check' })]; } },
  { name: 'web_check', description: 'Build the site and check it in a real browser at phone (390), tablet (820) and desktop (1440): sideways scroll, image alt, contrast, type size, tap targets, motion never hiding content (incl. the first screen), reduced motion, meta, script errors, weight. Returns the lights and the screenshot strips as images.', inputSchema: { type: 'object', properties: { site: { type: 'string' } }, required: ['site'] },
    run: async ({ site }) => { const W = await import('../web/lib/site.mjs'), dir = join(STUDIO, 'web', 'sites', webName(site)); if (!existsSync(join(dir, 'site.json'))) throw new Error(`no site ${site}`); W.build(readJSON(join(dir, 'site.json')), join(dir, 'dist'), { siteDir: dir });
      const { checkSite } = await import('../web/lib/check.mjs'), r = await checkSite({ dir: join(dir, 'dist'), outDir: join(STUDIO, 'takes', 'web', webName(site)) });
      const out = [text({ verdict: r.verdict, lights: r.lights, dist: `studio/web/sites/${site}/dist/index.html` })];
      for (const v of r.viewports.filter((x) => x.sheet && existsSync(x.sheet))) out.push(await sheetImage(v.sheet));
      return out; } },
  { name: 'spec_check', description: 'Full engine check of a saved spec (lint, assets, production plan) without a browser — about a second.', inputSchema: { type: 'object', properties: { film: FILM, format: FORMAT }, required: ['film'] },
    run: async ({ film, format }) => {
      const p = join(filmDir(film), 'spec.json'); if (!existsSync(p)) throw new Error(`no spec for ${film}; spec_save first`);
      const spec = readJSON(p), r = check(spec, film, format), e = await engine(film, ['--stage=check', ...(format ? [`--format=${format}`] : [])]);
      return [text({ ok: r.ok && e.code === 0, ...r, engine: { exit: e.code, issues: engineIssues(e.out), tail: e.out.trim().split('\n').slice(-6) }, next: r.ok && e.code === 0 ? 'film_stills' : 'fix the errors, spec_save again' })];
    } },
  { name: 'film_stills', description: 'Render key frames of every scene and run the text gates (safe area, overlaps, every 0.1 s). Returns the named issues and the contact sheet image. ~15–60 s.', inputSchema: { type: 'object', properties: { film: FILM, format: FORMAT }, required: ['film'] },
    run: async ({ film, format }) => {
      const p = join(filmDir(film), 'spec.json'); if (!existsSync(p)) throw new Error(`no spec for ${film}`);
      if (jobs().some((j) => jobView(j).state === 'running')) throw new Error('a render is running; one browser job at a time (film_job shows it)');
      const fmt = format || readJSON(p).format || 'youtube', e = await engine(film, ['--stage=stills', `--format=${fmt}`]);
      const sheet = join(STUDIO, 'takes', 'studio-engine', `b-${film}-${fmt}`, 'stills', 'sheet.png');
      const out = [text({ ok: e.code === 0, issues: engineIssues(e.out), sheet: existsSync(sheet) ? sheet : null, tail: e.out.trim().split('\n').slice(-8),
        look: 'Check every tile: one focal point, readable type, nothing cropped, colours on brief. Text gates cannot judge taste.', next: e.code === 0 ? 'film_render stage=preview (or final)' : 'fix the named scenes, spec_save, film_stills again' })];
      if (existsSync(sheet) && statSync(sheet).size) out.push(await sheetImage(sheet));
      return out;
    } },
  { name: 'film_render', description: 'Start ONE background render: stage=preview (draft, fast, optional scene) or final (full quality + all delivery gates). Returns a job id for film_job. Refuses while another render runs.', inputSchema: { type: 'object', properties: { film: FILM, format: FORMAT, stage: { type: 'string', enum: ['preview', 'final'] }, scene: { type: 'string', description: 'preview one scene id' }, fps: { type: 'integer', minimum: 1, maximum: 120 } }, required: ['film', 'stage'] },
    run: ({ film, format, stage, scene, fps }) => {
      const p = join(filmDir(film), 'spec.json'); if (!existsSync(p)) throw new Error(`no spec for ${film}`);
      if (!['preview', 'final'].includes(stage)) throw new Error('stage must be preview or final');
      if (scene != null && !/^[\w-]{1,64}$/.test(scene)) throw new Error('scene must be a scene id');
      const busy = jobs().map(jobView).find((j) => j.state === 'running'); if (busy) throw new Error(`render ${busy.id} is still running; one render at a time`);
      mkdirSync(JOBS, { recursive: true });
      const id = `${film}-${stage}-${Date.now().toString(36)}`, logFile = join(JOBS, `${id}.log`), fmt = format || readJSON(p).format || 'youtube';
      writeFileSync(logFile, `${new Date().toISOString()} node studio-engine/run.mjs ${film} --stage=${stage} --format=${fmt}\n`);
      const child = engine(film, [`--stage=${stage}`, `--format=${fmt}`, ...(scene ? [`--scene=${scene}`] : []), ...(fps ? [`--fps=${fps}`] : [])], { logFile });
      writeFileSync(join(JOBS, `${id}.json`), JSON.stringify({ id, film, stage, format: fmt, pid: child.pid, log: logFile, started: new Date().toISOString() }));
      return [text({ started: id, next: 'film_job (poll every minute or so); a 30 s final takes minutes' })];
    } },
  { name: 'film_job', description: 'State of a render job (running / delivered / finished / failed), its gate lines and the deliverable MP4 path. Without id: the latest job.', inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
    run: ({ id } = {}) => { const all = jobs(); const j = id ? all.find((x) => x.id === id) : all.at(-1); if (!j) throw new Error(id ? `no job ${id}` : 'no jobs yet'); return [text(jobView(j))]; } },
];

// ---------- JSON-RPC over stdio ----------
const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');
async function handle(m) {
  if (m.method === 'initialize') {
    const asked = m.params?.protocolVersion;
    return { protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'animation-studio', version: '1.0.0' },
      instructions: 'A code-driven film studio. Call studio_guide first, then engine_catalog. Make a film: film_plan (house-method skeleton) → write the ‹…› lines → spec_save → spec_check → film_review (house critic) → film_stills / film_inspect (eyes) → film_render → film_job.' };
  }
  if (m.method === 'ping') return {};
  if (m.method === 'tools/list') return { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
  if (m.method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === m.params?.name);
    if (!tool) throw Object.assign(new Error(`unknown tool ${m.params?.name}`), { code: -32602 });
    try { return { content: await tool.run(m.params?.arguments || {}) }; } catch (e) { return { content: [text(`ERROR: ${e.message}`)], isError: true }; }
  }
  throw Object.assign(new Error(`method not found: ${m.method}`), { code: -32601 });
}
export function serve(input = process.stdin) {
  let buf = '';
  input.setEncoding('utf8');
  input.on('data', (chunk) => {
    buf += chunk;
    for (let i; (i = buf.indexOf('\n')) >= 0;) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line) continue;
      let m; try { m = JSON.parse(line); } catch { send({ id: null, error: { code: -32700, message: 'parse error' } }); continue; }
      if (m.id === undefined || m.id === null) continue;   // notifications (initialized, cancelled…) need no answer
      handle(m).then((result) => send({ id: m.id, result }), (e) => send({ id: m.id, error: { code: e.code || -32603, message: e.message } }));
    }
  });
  input.on('end', () => process.exit(0));
  log(`ready (${TOOLS.length} tools, studio ${STUDIO})`);
}
if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) serve();
export { check };
