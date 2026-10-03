// Sound library (sounds/library.json): validation and search. Recordings must carry rights; synths are original by construction.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const loadSounds = (file = join(STUDIO, 'sounds', 'library.json')) => JSON.parse(readFileSync(file, 'utf8'));

export function validateSounds(lib, { root = STUDIO, checkFiles = true } = {}) {
  const e = [], ids = new Set();
  for (const s of lib.entries || []) {
    if (!s.id || ids.has(s.id)) e.push(`duplicate or missing id ${s.id}`); ids.add(s.id);
    if (!lib.categories.includes(s.category)) e.push(`${s.id}: unknown category ${s.category}`);
    if (!['synth', 'file'].includes(s.kind)) e.push(`${s.id}: kind must be synth or file`);
    if (!String(s.rights || '').trim()) e.push(`${s.id}: rights required (licence, source, permitted use)`);
    if (s.kind === 'file') {
      if (!s.path) e.push(`${s.id}: path required`);
      else if (checkFiles && !existsSync(join(root, s.path))) e.push(`${s.id}: missing file ${s.path} (recordings stay local; restore it or remove the entry)`);
      if (!s.source) e.push(`${s.id}: source (URL, library or owner) required`);
    }
  }
  return e;
}

export function searchSounds(q = '', lib = loadSounds()) {
  const w = q.toLowerCase();
  return lib.entries.filter(s => !w || s.category === w || [s.id, s.use, s.generator, s.source].filter(Boolean).some(x => x.toLowerCase().includes(w)));
}
