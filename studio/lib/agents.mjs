// Any-model door: checks that every agent sees the same rules, skills and tools (ANY_MODEL.md).
//   doorCheck()      → { ok, items: [{ ok, what, detail }] }   (AGENTS.md, CLAUDE.md import, skill format + mirror, client configs)
//   syncSkills()     → mirror .claude/skills/<name>/ to .agents/skills/<name>/ (Codex and other Agent Skills clients read that path)
//   handshake()      → start the MCP server, initialize, list tools (no browser, < 1 s)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';
import { STUDIO } from './capabilities.mjs';

export const ROOT = join(STUDIO, '..');
const SRC = join(ROOT, '.claude', 'skills'), MIRROR = join(ROOT, '.agents', 'skills');
const MIRROR_NOTE = '<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->\n';
export const CLIENTS = { '.mcp.json': 'mcpServers', '.cursor/mcp.json': 'mcpServers', '.gemini/settings.json': 'mcpServers', '.vscode/mcp.json': 'servers' };

const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]);
export const skillNames = () => existsSync(SRC) ? readdirSync(SRC).filter((d) => existsSync(join(SRC, d, 'SKILL.md'))).sort() : [];

// Agent Skills format: YAML front matter with name (= folder, lowercase-hyphen, ≤ 64) and description (≤ 1024 chars).
export function skillFormat(name, text) {
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  if (!fm) return 'missing front matter';
  const field = (k) => new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(fm)?.[1]?.trim().replace(/^["']|["']$/g, '');
  const n = field('name'), d = field('description');
  if (n !== name) return `name "${n}" must equal the folder "${name}"`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n) || n.length > 64) return 'name must be lowercase words joined by hyphens, ≤ 64 characters';
  if (!d) return 'description is required';
  if (d.length > 1024) return `description is ${d.length} characters (max 1024)`;
  return '';
}
const mirrored = (text) => text.replace(/^(---\n[\s\S]*?\n---\n)/, `$1${MIRROR_NOTE}`);

export function syncSkills() {
  const names = skillNames(), wrote = [];
  for (const name of names) for (const file of files(join(SRC, name))) {
    const rel = relative(SRC, file), dest = join(MIRROR, rel), body = file.endsWith('SKILL.md') ? mirrored(readFileSync(file, 'utf8')) : readFileSync(file);
    mkdirSync(join(dest, '..'), { recursive: true });
    if (!existsSync(dest) || !readFileSync(dest).equals(Buffer.from(body))) { writeFileSync(dest, body); wrote.push(rel); }
  }
  const removed = existsSync(MIRROR) ? readdirSync(MIRROR).filter((d) => !names.includes(d)) : [];
  for (const d of removed) rmSync(join(MIRROR, d), { recursive: true, force: true });
  return { skills: names.length, wrote, removed };
}
export function mirrorDrift() {
  const drift = [];
  for (const name of skillNames()) for (const file of files(join(SRC, name))) {
    const rel = relative(SRC, file), dest = join(MIRROR, rel), want = file.endsWith('SKILL.md') ? mirrored(readFileSync(file, 'utf8')) : readFileSync(file, 'utf8');
    if (!existsSync(dest) || readFileSync(dest, 'utf8') !== want) drift.push(rel);
  }
  if (existsSync(MIRROR)) for (const d of readdirSync(MIRROR)) if (!skillNames().includes(d)) drift.push(`${d} (stale)`);
  return drift;
}

export function doorCheck() {
  const items = [], add = (ok, what, detail = '') => items.push({ ok: !!ok, what, detail });
  const agents = existsSync(join(ROOT, 'AGENTS.md')) ? readFileSync(join(ROOT, 'AGENTS.md'), 'utf8') : '';
  add(agents, 'AGENTS.md (door for every agent)');
  for (const must of ['ANY_MODEL.md', 'QUALITY_PLAYBOOK.md', 'Openverse', 'Testing policy', 'Rendering rule', 'studio/takes/']) add(agents.includes(must), `AGENTS.md mentions ${must}`);
  add(/^@AGENTS\.md$/m.test(existsSync(join(ROOT, 'CLAUDE.md')) ? readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8') : ''), 'CLAUDE.md imports AGENTS.md');
  const bad = skillNames().map((n) => [n, skillFormat(n, readFileSync(join(SRC, n, 'SKILL.md'), 'utf8'))]).filter(([, e]) => e);
  add(!bad.length && skillNames().length, `${skillNames().length} skills in Agent Skills format`, bad.map(([n, e]) => `${n}: ${e}`).join('; '));
  const drift = mirrorDrift();
  add(!drift.length, '.agents/skills mirrors .claude/skills', drift.length ? `${drift.length} out of date (run: node studio/studio.mjs agents --sync)` : '');
  for (const [file, key] of Object.entries(CLIENTS)) {
    let ok = false, detail = 'missing';
    try { const s = JSON.parse(readFileSync(join(ROOT, file), 'utf8'))[key]?.['animation-studio']; ok = s?.command === 'node' && s.args?.some((a) => a.endsWith('studio/mcp/server.mjs')); detail = ok ? '' : 'no animation-studio server entry'; } catch (e) { detail = e.code === 'ENOENT' ? 'missing' : e.message; }
    add(ok, `${file} starts the studio MCP server`, detail);
  }
  const codex = existsSync(join(ROOT, '.codex/config.toml')) ? readFileSync(join(ROOT, '.codex/config.toml'), 'utf8') : '';
  add(/\[mcp_servers\.animation-studio\][\s\S]*studio\/mcp\/server\.mjs/.test(codex), '.codex/config.toml starts the studio MCP server');
  add(existsSync(join(STUDIO, 'studio-engine', 'catalog.json')) && statSync(join(STUDIO, 'studio-engine', 'catalog.json')).size > 0, 'engine catalog (studio-engine/catalog.json)');
  return { ok: items.every((i) => i.ok), items };
}

// Speak MCP to our own server exactly as a client would: initialize → initialized → tools/list (→ optional calls).
export function handshake({ calls = [], timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [join(STUDIO, 'mcp', 'server.mjs')], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const pending = new Map(), results = {};
    let buf = '', id = 0;
    const timer = setTimeout(() => { p.kill(); reject(new Error('MCP server did not answer in time')); }, timeoutMs);
    const req = (method, params) => new Promise((res) => { pending.set(++id, res); p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d) => { buf += d; for (let i; (i = buf.indexOf('\n')) >= 0;) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); pending.get(m.id)?.(m); pending.delete(m.id); } });
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    (async () => {
      results.initialize = await req('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'studio-self-check', version: '1' } });
      p.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
      results.tools = await req('tools/list', {});
      results.calls = [];
      for (const [name, args] of calls) results.calls.push(await req('tools/call', { name, arguments: args }));
      clearTimeout(timer); p.stdin.end(); resolve(results);
    })().catch((e) => { clearTimeout(timer); p.kill(); reject(e); });
  });
}
