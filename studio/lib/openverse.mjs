// Openverse audio search (https://api.openverse.org/v1/audio/): free, no key, every result carries its licence.
// Owner rule (2026-10-16): any film that needs sound, SFX, ambience or music searches here FIRST (`node studio.mjs sfx`).
// Node built-ins only (global fetch). Default = commercial-use licences (license_type=commercial) so ads stay safe.
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const API = 'https://api.openverse.org/v1/audio/';
const UA = 'studio-audio-search/1.0';   // generic client name: no project address sent to an outside service (audit S1)

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

const isAudio = (file) => { const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file], { encoding: 'utf8' }); return r.status === 0 && /audio/.test(r.stdout); };
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sound';

// Download one result into <film>/assets/sfx/ and append the licence record to <film>/assets/sfx/CREDITS.json + CREDITS.md.
// A remote answer decides nothing about our paths (audit S1): known audio extensions only, a size cap, and the file must decode as audio.
export const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a', 'aac', 'opus', 'webm', 'aif', 'aiff'];
export const MAX_BYTES = 50 * 2 ** 20;
export const safeExt = (t) => { const e = String(t || '').toLowerCase().replace(/^\./, ''); return AUDIO_EXT.includes(e) ? e : 'mp3'; };
// <film> is a studio film folder, or a Studio Engine film (studio-engine/films/<film>), so engine films can follow Openverse-first (audit L3).
export function filmDir(film, root = STUDIO) {
  if (typeof film !== 'string' || !/^[a-z0-9_-]+(\/[a-z0-9_-]+)*$/i.test(film)) throw new Error(`bad film name ${film}`);
  for (const d of [join(root, film), join(root, 'studio-engine', 'films', film)]) if (existsSync(d)) return d;
  throw new Error(`film folder not found: ${film} (a studio film folder or studio-engine/films/<film>)`);
}
export async function downloadAudio(item, film, { root = STUDIO, query = '', probe = isAudio } = {}, fetchImpl = globalThis.fetch) {
  const base = filmDir(film, root);
  const res = await fetchImpl(item.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  if (+res.headers?.get?.('content-length') > MAX_BYTES) throw new Error(`download larger than ${MAX_BYTES / 2 ** 20} MB; pick a shorter sound`);
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_BYTES) throw new Error(`download larger than ${MAX_BYTES / 2 ** 20} MB; pick a shorter sound`);
  const dir = join(base, 'assets', 'sfx'); mkdirSync(dir, { recursive: true });
  const file = `${slug(item.title)}-${String(item.id).replace(/[^a-z0-9]/gi, '').slice(0, 8)}.${safeExt(item.filetype)}`;
  writeFileSync(join(dir, file), body);
  if (!probe(join(dir, file))) { rmSync(join(dir, file), { force: true }); throw new Error(`the download is not playable audio: ${item.url}`); }
  const credFile = join(dir, 'CREDITS.json');
  const creds = existsSync(credFile) ? JSON.parse(readFileSync(credFile, 'utf8')) : [];
  const rec = { file, title: item.title, creator: item.creator, creatorUrl: item.creatorUrl, license: item.license, licenseUrl: item.licenseUrl,
    source: item.page, provider: item.provider, openverseId: item.id, attribution: item.attribution, query, downloaded: new Date().toISOString().slice(0, 10) };
  creds.push(rec); writeFileSync(credFile, JSON.stringify(creds, null, 2) + '\n');
  writeFileSync(join(dir, 'CREDITS.md'), '# Sound credits (Openverse)\n\n' + creds.map(c => `- \`${c.file}\`: ${c.attribution || `"${c.title}" by ${c.creator}, ${c.license}`} Source: ${c.source || '?'}`).join('\n') + '\n');
  return { path: join(base, 'assets', 'sfx', file), dir, file, record: rec };
}
