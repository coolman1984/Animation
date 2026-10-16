// Openverse audio search: URL, parsing and download + credit record, with a mocked fetch (no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { searchUrl, searchAudio, downloadAudio, fmtDur } from '../lib/openverse.mjs';

const hit = { id: 'eab8a6e2-0ac8', title: 'Deep Whoosh #1', duration: 3155, license: 'cc0', license_version: '1.0', license_url: 'https://cc/zero',
  creator: 'Kinoton', url: 'https://cdn.example/w.mp3', foreign_landing_url: 'https://freesound.org/s/1', source: 'freesound', filetype: 'mp3', attribution: '"Deep Whoosh #1" by Kinoton is marked with CC0 1.0.' };
const mock = calls => async (url) => { calls.push(String(url));
  return String(url).startsWith('https://api.openverse.org') ? { ok: true, json: async () => ({ result_count: 240, results: [hit] }) }
    : { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }; };

test('openverse search defaults to commercial licences and parses results', async () => {
  assert.match(searchUrl('door slam'), /license_type=commercial/);
  assert.doesNotMatch(searchUrl('x', { anyLicense: true }), /license_type/);
  assert.match(searchUrl('x', { category: 'music', n: 99 }), /category=music.*|page_size=20/);
  const calls = [], r = await searchAudio('whoosh', {}, mock(calls));
  assert.equal(r.total, 240); assert.equal(r.results[0].license, 'CC0 1.0'); assert.equal(fmtDur(r.results[0].duration), '3.2 s');
  await assert.rejects(searchAudio(' ', {}, mock([])));
});

test('openverse download writes the file and a licence record', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ov-')); mkdirSync(join(root, 'film99'));
  const { results } = await searchAudio('whoosh', {}, mock([]));
  const d = await downloadAudio(results[0], 'film99', { root, query: 'whoosh' }, mock([]));
  assert.ok(existsSync(join(root, d.path)));
  const creds = JSON.parse(readFileSync(join(root, 'film99/assets/sfx/CREDITS.json'), 'utf8'));
  assert.equal(creds[0].license, 'CC0 1.0'); assert.equal(creds[0].creator, 'Kinoton');
  assert.match(readFileSync(join(root, 'film99/assets/sfx/CREDITS.md'), 'utf8'), /Kinoton/);
  await assert.rejects(downloadAudio(results[0], '../x', { root }, mock([])));
});
