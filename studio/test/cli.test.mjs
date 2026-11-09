// Front-door checks (audit B3, B4): help lists every command, typos fail, review/taste find takes in out/, never the source folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolveTake, judgedVideo, listTakes } from '../studio-engine/lib/pipeline.mjs';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = (...a) => spawnSync(process.execPath, ['studio.mjs', ...a], { cwd: STUDIO, encoding: 'utf8' });

test('help lists every dispatched command; an unknown command exits 2', () => {
  const r = cli();
  assert.equal(r.status, 0);
  for (const c of ['caps', 'build', 'cleanup', 'director', 'triage', 'taste', 'storyboard', 'styles', 'web', 'lab', 'gallery', 'moves', 'toolkit', 'agents']) assert.match(r.stdout, new RegExp(`studio\\.mjs ${c}\\b`), c);
  const bad = cli('bulid');
  assert.equal(bad.status, 2); assert.match(bad.stderr, /unknown command: bulid/);
});

test('takes sort by number; a film name means out/<film>, the source folder is never a take', () => {
  const root = mkdtempSync(join(tmpdir(), 'cli-')), out = join(root, 'out');
  try {
    for (const t of ['take9', 'take10', 'take100']) mkdirSync(join(out, 'f1', t), { recursive: true });
    mkdirSync(join(root, 'f1'));   // a source folder with the same name
    assert.deepEqual(listTakes(join(out, 'f1')), ['take9', 'take10', 'take100']);
    assert.equal(resolveTake('f1', out), join(out, 'f1', 'take100'));
    assert.equal(resolveTake(join(out, 'f1', 'take9'), out), join(out, 'f1', 'take9'));
    assert.equal(resolveTake('nope', out), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('taste judges the newest FINAL share/master, never a draft', () => {
  const root = mkdtempSync(join(tmpdir(), 'cli-')), base = join(root, 'f1');
  try {
    mkdirSync(join(base, 'take1'), { recursive: true }); writeFileSync(join(base, 'take1', 'measure.json'), '{"profile":"final"}');
    writeFileSync(join(base, 'take1', 'f1-reel-1080x1920.mp4'), ''); writeFileSync(join(base, 'take1', 'f1-reel-share-29MB.mp4'), '');
    mkdirSync(join(base, 'take2')); writeFileSync(join(base, 'take2', 'measure.json'), '{"profile":"draft"}'); writeFileSync(join(base, 'take2', 'f1-reel-DRAFT.mp4'), '');
    assert.equal(judgedVideo('f1', root).file, join(base, 'take1', 'f1-reel-share-29MB.mp4'));
    rmSync(join(base, 'take1'), { recursive: true });
    assert.equal(judgedVideo('f1', root), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
