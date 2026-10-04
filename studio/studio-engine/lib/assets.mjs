// Studio Engine — asset library. Every generated or supplied asset gets a stable id, its file, its prompt and provider;
// an asset that exists is never generated again. Providers are adapters; Higgsfield (GPT Image 2.5 / Gemini Omni / ElevenLabs v4)
// is reached through its MCP tools from the agent session, so the engine records the request and the agent fulfils it once.
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { createHash } from 'node:crypto';

const LIB = join(dirname(new URL(import.meta.url).pathname), '..', 'assets');
const INDEX = join(LIB, 'library.json');
const load = () => (existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : { assets: {} });
const save = (db) => { mkdirSync(LIB, { recursive: true }); writeFileSync(INDEX, JSON.stringify(db, null, 2)); };
export const assetId = (kind, prompt, refs = []) => `${kind}-${createHash('sha1').update(JSON.stringify([kind, prompt, refs])).digest('hex').slice(0, 10)}`;

// resolve a spec's asset list → { ready: {id: path}, todo: [requests for the agent] }
export function resolveAssets(list = []) {
  const db = load(), ready = {}, todo = [];
  for (const a of list) {
    const id = a.id || assetId(a.kind, a.prompt, a.refs);
    const hit = db.assets[id];
    if (hit && existsSync(join(LIB, hit.file))) { ready[a.name || id] = join('studio-engine', 'assets', hit.file); continue; }
    if (a.file && existsSync(a.file)) { const file = `${id}${extname(a.file)}`; copyFileSync(a.file, join(LIB, file)); db.assets[id] = { file, kind: a.kind, prompt: a.prompt || null, provider: 'supplied', refs: a.refs || [], added: new Date().toISOString() }; ready[a.name || id] = join('studio-engine', 'assets', file); continue; }
    todo.push({ id, name: a.name || id, kind: a.kind, provider: a.provider || { image: 'higgsfield:gpt-image-2.5', video: 'higgsfield:gemini-omni', voice: 'higgsfield:elevenlabs-v4' }[a.kind], prompt: a.prompt, refs: a.refs || [], save_as: join('studio-engine', 'assets', `${id}${{ image: '.png', video: '.mp4', voice: '.wav' }[a.kind] || ''}`) });
  }
  save(db);
  return { ready, todo };
}
// the agent calls this after a provider returned a file, so the asset is cached with its prompt forever
export function registerAsset(req, file) {
  const db = load(), name = `${req.id}${extname(file)}`;
  mkdirSync(LIB, { recursive: true }); copyFileSync(file, join(LIB, name));
  db.assets[req.id] = { file: name, kind: req.kind, prompt: req.prompt, provider: req.provider, refs: req.refs, added: new Date().toISOString() }; save(db);
  return join('studio-engine', 'assets', name);
}
