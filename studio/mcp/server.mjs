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
      instructions: 'A code-driven film studio. Call studio_guide first, then engine_catalog. Make a film by saving ONE spec (spec_save), checking it (spec_check, film_stills) and rendering it (film_render, film_job).' };
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
