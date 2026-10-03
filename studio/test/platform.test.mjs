// The studio must run on Linux CI and on the owner's Windows machine (paths with spaces and drive letters).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMain, slash, browserCandidates, PYTHON, devNull } from '../lib/platform.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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
