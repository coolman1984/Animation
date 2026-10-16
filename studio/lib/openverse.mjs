// Openverse audio search (https://api.openverse.org/v1/audio/): free, no key, every result carries its licence.
// Owner rule (2026-10-16): any film that needs sound, SFX, ambience or music searches here FIRST (`node studio.mjs sfx`).
// Node built-ins only (global fetch). Default = commercial-use licences (license_type=commercial) so ads stay safe.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const API = 'https://api.openverse.org/v1/audio/';
const UA = 'AnimationStudio/1.0 (+https://github.com/coolman1984/Animation)';

export function searchUrl(q, { n = 8, anyLicense = false, category, page = 1 } = {}) {
  const u = new URL(API);
  u.searchParams.set('q', q);
  u.searchParams.set('page_size', String(Math.min(Math.max(+n || 8, 1), 20)));
  if (page > 1) u.searchParams.set('page', String(page));
  if (!anyLicense) u.searchParams.set('license_type', 'commercial');
  if (category) u.searchParams.set('category', category); // sound_effect | music | ...
  return u.toString();
}

export const fmtDur = ms => (ms == null ? '?' : (ms / 1000).toFixed(1) + ' s');
export const licenceOf = r => `${String(r.license || '?').toUpperCase()} ${r.license_version || ''}`.trim();

export function normalise(r) {
  return { id: r.id, title: r.title || '(untitled)', duration: r.duration ?? null, license: licenceOf(r), licenseUrl: r.license_url || null,
    creator: r.creator || '?', creatorUrl: r.creator_url || null, url: r.url, page: r.foreign_landing_url || null, provider: r.source || r.provider,
    filetype: r.filetype || (r.url || '').split('.').pop(), attribution: r.attribution || null };
}

export async function searchAudio(q, opts = {}, fetchImpl = globalThis.fetch) {
  if (!String(q || '').trim()) throw new Error('search words required, e.g. sfx "door slam"');
  const res = await fetchImpl(searchUrl(q, opts), { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Openverse HTTP ${res.status}`);
  const j = await res.json();
  return { total: j.result_count ?? 0, results: (j.results || []).map(normalise) };
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sound';

// Download one result into <film>/assets/sfx/ and append the licence record to <film>/assets/sfx/CREDITS.json + CREDITS.md.
export async function downloadAudio(item, film, { root = STUDIO, query = '' } = {}, fetchImpl = globalThis.fetch) {
  if (!/^[a-z0-9_-]+$/i.test(film)) throw new Error(`bad film name ${film}`);
  if (!existsSync(join(root, film))) throw new Error(`film folder not found: ${film}`);
  const res = await fetchImpl(item.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const dir = join(root, film, 'assets', 'sfx'); mkdirSync(dir, { recursive: true });
  const file = `${slug(item.title)}-${String(item.id).slice(0, 8)}.${item.filetype || 'mp3'}`;
  writeFileSync(join(dir, file), Buffer.from(await res.arrayBuffer()));
  const credFile = join(dir, 'CREDITS.json');
  const creds = existsSync(credFile) ? JSON.parse(readFileSync(credFile, 'utf8')) : [];
  const rec = { file, title: item.title, creator: item.creator, creatorUrl: item.creatorUrl, license: item.license, licenseUrl: item.licenseUrl,
    source: item.page, provider: item.provider, openverseId: item.id, attribution: item.attribution, query, downloaded: new Date().toISOString().slice(0, 10) };
  creds.push(rec); writeFileSync(credFile, JSON.stringify(creds, null, 2) + '\n');
  writeFileSync(join(dir, 'CREDITS.md'), '# Sound credits (Openverse)\n\n' + creds.map(c => `- \`${c.file}\`: ${c.attribution || `"${c.title}" by ${c.creator}, ${c.license}`} Source: ${c.source || '?'}`).join('\n') + '\n');
  return { path: join(film, 'assets', 'sfx', file), record: rec };
}
