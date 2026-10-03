// The studio must run on Linux CI and on the owner's Windows machine (paths with spaces and drive letters).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMain, slash, browserCandidates, PYTHON, devNull, plannedWorkers } from '../lib/platform.mjs';
import { tmpdir } from 'node:os';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('render workers are sized by memory headroom, never by the request alone', () => {
  const b = (headroomGB) => ({ headroomGB, freeGB: headroomGB, commitFreeGB: headroomGB });
  assert.equal(plannedWorkers({ requested: 6, w: 1920, h: 1080, gpu: true, budget: b(1.7) }).workers, 1, 'the crash case: 1.7 GB headroom gets one worker, with low:true');
  assert.equal(plannedWorkers({ requested: 6, w: 1920, h: 1080, gpu: true, budget: b(1.7) }).low, true);
  assert.equal(plannedWorkers({ requested: 6, w: 1920, h: 1080, gpu: true, budget: b(7.2) }).workers, 4, '7.2 GB: (7.2 − 3) / ~1.03 ≈ 4');
  const roomy = plannedWorkers({ requested: 4, w: 1080, h: 1920, gpu: false, budget: b(40) });
  assert.ok(roomy.workers <= 4 && roomy.workers >= 1, 'never more than requested; capped by cores − 1');
});

test('process registry: entries whose launching node is dead are reaped; live ones are kept', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'procs-')), file = join(dir, 'procs.json');
  process.env.STUDIO_PROCS_FILE = file;
  try {
    const procs = await import('../lib/procs.mjs?' + Date.now());
    procs.register({ pid: 999999991, profile: join(dir, 'p1'), kind: 'chrome' });        // parent = this test (alive), pid dead
    assert.deepEqual(procs.orphans(), [], 'a dead pid is not an orphan, just gone');
    const killed = procs.reap();
    assert.deepEqual(killed, [], 'nothing alive to kill');
    assert.equal(JSON.parse((await import('node:fs')).readFileSync(file, 'utf8')).length, 0, 'dead entries are dropped');
  } finally { delete process.env.STUDIO_PROCS_FILE; rmSync(dir, { recursive: true, force: true }); assert.equal(existsSync(dir), false); }
});

test('platform helpers: main-module check, slashes, browser list, python, null device', () => {
  const saved = process.argv[1];
  try {
    const script = join(ROOT, 'some dir', 'tool.mjs');
    process.argv[1] = script;
    assert.equal(isMain(pathToFileURL(script).href), true, 'a path with spaces still matches');
    assert.equal(isMain(pathToFileURL(join(ROOT, 'other.mjs')).href), false);
  } finally { process.argv[1] = saved; }
  assert.equal(slash('D:\\WORK\\a b\\film.js'), 'D:/WORK/a b/film.js');
  assert.equal(browserCandidates({ STUDIO_CHROMIUM: '/x/chrome' })[0], '/x/chrome', 'STUDIO_CHROMIUM wins');
  assert.ok(Array.isArray(browserCandidates({})));
  assert.ok(process.env.STUDIO_PYTHON || PYTHON === (process.platform === 'win32' ? 'python' : 'python3'));
  assert.ok(devNull === (process.platform === 'win32' ? '\\\\.\\nul' : '/dev/null'));
});

test('no module uses POSIX-only idioms that broke on Windows', () => {
  const files = [];
  const walk = d => { for (const e of readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'takes', 'out', 'test'].includes(e.name)) continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.(mjs|js)$/.test(e.name) && e.name !== 'platform.mjs') files.push(p);
  } };
  walk(ROOT);
  const bad = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if (src.includes('`file://${process.argv[1]}`')) bad.push(`${f}: raw file:// main check (use isMain)`);
    if (/['"]\/dev\/null['"]/.test(src)) bad.push(`${f}: /dev/null (use devNull)`);
    if (/['"]python3['"]/.test(src)) bad.push(`${f}: hard-coded python3 (use PYTHON)`);
    if (/\b(execFileSync|spawnSync|spawn|run)\('(rm|mv|cp)'/.test(src)) bad.push(`${f}: shell file command (use node:fs)`);
    if (src.includes("'-pattern_type', 'glob'")) bad.push(`${f}: FFmpeg glob input (unsupported on Windows builds)`);
  }
  assert.deepEqual(bad, []);
});
