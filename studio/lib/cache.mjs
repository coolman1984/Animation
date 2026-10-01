// Content-addressed artifacts. Input AND output hashes: timestamps cannot cause stale reuse.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
const hash = data => createHash('sha256').update(data).digest('hex');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
export function fingerprint(root, paths, settings = {}, exclude = []) {
  const files = new Set();
  function visit(path, explicit = false) {
    if (exclude.includes(relative(root, path))) return;
    if (!existsSync(path)) { files.add(path); return; }
    if (statSync(path).isDirectory()) for (const name of readdirSync(path).sort()) {
      if (!['node_modules', '.git', 'takes', 'out'].includes(name)) visit(join(path, name));
    } else if (explicit || !/\.md$/i.test(path)) files.add(path);
  }
  for (const path of paths) visit(join(root, path), true);
  return hash(JSON.stringify(stable({ settings, files: [...files].sort().map(path => [relative(root, path), existsSync(path) ? hash(readFileSync(path)) : 'MISSING']) })));
}
export function cacheHit(manifest, key, outputs) {
  try {
    const saved = JSON.parse(readFileSync(manifest, 'utf8'));
    return saved.key === key && outputs.every(file => existsSync(file) && saved.outputs[file] === hash(readFileSync(file)));
  } catch { return false; }
}
export function saveCache(manifest, key, outputs) {
  const record = { key, outputs: Object.fromEntries(outputs.map(file => [file, hash(readFileSync(file))])) };
  mkdirSync(dirname(manifest), { recursive: true });
  const temp = manifest + '.tmp';
  writeFileSync(temp, JSON.stringify(record)); renameSync(temp, manifest);
}
export async function cached(manifest, key, outputs, build, log = console.log) {
  if (cacheHit(manifest, key, outputs)) { log('cached'); return true; }
  await build(); saveCache(manifest, key, outputs); return false;
}
