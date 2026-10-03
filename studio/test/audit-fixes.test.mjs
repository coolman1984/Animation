// Regression tests for the 2026-10-03 audit findings (STUDIO_AUDIT_AND_TECHNOLOGY_REPORT_2026-10-03.md). All fast: no browser, no ffmpeg.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inside, serve } from '../lib/serve.mjs';
import { validateCreative } from '../lib/creative.mjs';
import { validateProduction } from '../lib/production.mjs';
import { gates } from '../lib/measure.mjs';
import { shareCopy } from '../lib/finish.mjs';

test('B01/B02 preview server: shared-prefix sibling and traversal are refused, malformed escapes get 400', async () => {
  const base = mkdtempSync(join(tmpdir(), 'serve-')), root = join(base, 'root');
  mkdirSync(root); mkdirSync(join(base, 'root-private'));
  writeFileSync(join(root, 'ok.txt'), 'ok'); writeFileSync(join(base, 'root-private', 'secret.txt'), 'secret');
  assert.ok(inside(root, '/ok.txt'));
  assert.equal(inside(root, '/../root-private/secret.txt'), null);
  const srv = await serve(root);
  try {
    const get = p => fetch(`http://127.0.0.1:${srv.port}${p}`).then(r => r.status);
    assert.equal(await get('/ok.txt'), 200);
    assert.notEqual(await get('/%2e%2e%2froot-private%2fsecret.txt'), 200);
    assert.equal(await get('/%E0%A4%A'), 400);
  } finally { srv.close(); rmSync(base, { recursive: true, force: true }); }
});

test('B03/B04 validators report malformed input instead of crashing', () => {
  for (const typography of [null, [], 'x', {}]) assert.ok(validateCreative({ duration: 10, creative: { typography } }).errors.some(e => /typography/.test(e)));
  for (const shots of [[null], {}]) assert.ok(validateProduction({ version: 1, shots, cues: [] }).errors.length > 0);
});

test('B10 an unavailable text check is marked unchecked, not silently passed', () => {
  const m = { probe: { width: 10, height: 10, duration: 1, fps: 30 }, frozen: [], black: [], text: { unavailable: 'external engine', lines: [], issues: [] } };
  const g = gates(m, { w: 10, h: 10, duration: 1, fps: 30 }).find(x => x.name === 'text read-back');
  assert.equal(g.unchecked, true);
});

test('B12 impossible share budgets fail before encoding', async () => {
  await assert.rejects(shareCopy('in.mp4', 'out.mp4', { targetMB: 1, duration: 120 }), /minimum 300/);
  await assert.rejects(shareCopy('in.mp4', 'out.mp4', { targetMB: 10, duration: 0 }), /positive duration/);
});
