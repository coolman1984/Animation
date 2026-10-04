// Studio Engine — asset library. Every generated or supplied asset gets a stable id, its file, its prompt and provider;
// an asset that exists is never generated again. Providers are adapters; Higgsfield (GPT Image 2.5 / Gemini Omni / ElevenLabs v4)
// is reached through its MCP tools from the agent session, so the engine records the request and the agent fulfils it once.
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, renameSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const safeName = (name) => {
  if (typeof name !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name) || ['__proto__', 'constructor', 'prototype'].includes(name)) throw new Error(`unsafe asset name: ${name}`);
  return name;
};
const load = (lib) => {
  const index = join(lib, 'library.json');
  const db = existsSync(index) ? JSON.parse(readFileSync(index, 'utf8')) : { assets: {} };
  if (!db.assets || typeof db.assets !== 'object' || Array.isArray(db.assets)) throw new Error('invalid asset library');
  return db;
};
const save = (db, lib) => { mkdirSync(lib, { recursive: true }); const index = join(lib, 'library.json'); writeFileSync(index + '.tmp', JSON.stringify(db, null, 2)); renameSync(index + '.tmp', index); };
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
export const assetId = (kind, prompt, refs = []) => `${safeName(kind)}-${createHash('sha1').update(JSON.stringify([kind, prompt, refs])).digest('hex').slice(0, 10)}`;

// resolve a spec's asset list → { ready: {id: path}, todo: [requests for the agent] }
export function resolveAssets(list = [], { libraryDir = LIB, sourceDir = process.cwd() } = {}) {
  const db = load(libraryDir), ready = Object.create(null), todo = [];
  let changed = false;
  for (const a of list) {
    const id = safeName(a.id || assetId(a.kind, a.prompt, a.refs)), alias = safeName(a.name || id);
    if (Object.hasOwn(ready, alias) || todo.some((r) => r.name === alias)) throw new Error(`duplicate asset name: ${alias}`);
    const hit = Object.hasOwn(db.assets, id) ? db.assets[id] : null;
    if (hit) safeName(hit.file);
    const source = a.file ? resolve(sourceDir, a.file) : null;
    if (source) {
      if (!existsSync(source)) throw new Error(`missing supplied asset: ${source}`);
      const file = safeName(`${id}${extname(source)}`), hash = digest(source);
      if (!hit || hit.hash !== hash || hit.file !== file || !existsSync(join(libraryDir, file)) || digest(join(libraryDir, file)) !== hash) {
        mkdirSync(libraryDir, { recursive: true });
        if (resolve(source) !== resolve(libraryDir, file)) copyFileSync(source, join(libraryDir, file));
        db.assets[id] = { file, hash, kind: a.kind, prompt: a.prompt || null, provider: 'supplied', refs: a.refs || [], added: new Date().toISOString() }; changed = true;
      }
      ready[alias] = join('studio-engine', 'assets', file); continue;
    }
    if (hit && existsSync(join(libraryDir, hit.file))) { ready[alias] = join('studio-engine', 'assets', hit.file); continue; }
    todo.push({ id, name: a.name || id, kind: a.kind, provider: a.provider || { image: 'higgsfield:gpt-image-2.5', video: 'higgsfield:gemini-omni', voice: 'higgsfield:elevenlabs-v4' }[a.kind], prompt: a.prompt, refs: a.refs || [], save_as: join('studio-engine', 'assets', `${id}${{ image: '.png', video: '.mp4', voice: '.wav' }[a.kind] || ''}`) });
  }
  if (changed) save(db, libraryDir);
  return { ready, todo };
}
// the agent calls this after a provider returned a file, so the asset is cached with its prompt forever
export function registerAsset(req, file, { libraryDir = LIB } = {}) {
  const id = safeName(req.id), db = load(libraryDir), name = safeName(`${id}${extname(file)}`);
  mkdirSync(libraryDir, { recursive: true }); copyFileSync(file, join(libraryDir, name));
  db.assets[id] = { file: name, kind: req.kind, prompt: req.prompt, provider: req.provider, refs: req.refs, added: new Date().toISOString() }; save(db, libraryDir);
  return join('studio-engine', 'assets', name);
}
