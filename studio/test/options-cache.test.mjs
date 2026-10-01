import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildOptions, frameRange } from '../lib/build-options.mjs';
import { fingerprint, cacheHit, saveCache, cached } from '../lib/cache.mjs';
import { gates } from '../lib/measure.mjs';
const cfg = { fps: 30, deliveries: [{ name: 'hero60', duration: 60 }, { name: 'cut15', duration: 15 }, { name: 'bumper6', duration: 6 }], preview: { delivery: 'hero60', range: [0, 12] } };
test('safe default: one 12s draft; final includes every delivery at original fps', () => {
  const d = buildOptions(cfg, []);
  assert.deepEqual(d.selected.map(x => x.name), ['hero60']); assert.deepEqual(d.range, [0, 12]);
  assert.equal(d.settings.fps, 15); assert.equal(d.settings.scale, 0.5);
  const f = buildOptions(cfg, ['--profile=final']); assert.equal(f.selected.length, 3); assert.equal(f.settings.fps, 30); assert.equal(f.settings.format, 'png'); assert.equal(f.range, undefined);
  assert.deepEqual(buildOptions(cfg, ['--only=bumper6']).range, [0, 6]);
});
test('bad options cannot produce a vacuous pass or partial final', () => {
  for (const flags of [['--profile=oops'], ['--only=missing'], ['--only='], ['--only=hero60,hero60'], ['--only=hero60,cut15'], ['--workers=0'], ['--workers=1.5'], ['--range=12:4'], ['--range=0:99'], ['--range=NaN:12'], ['--range=:12'], ['--profile=final', '--range=0:12'], ['--typo=1'], ['--profile=draft', '--profile=final']]) assert.throws(() => buildOptions(cfg, flags), flags.join(' '));
});
test('non-zero ranges cover exact frame bounds, never duplicate the last frame', () => {
  assert.deepEqual(frameRange(2, 3, 60, 15), { first: 30, last: 45, frames: 15 });
  assert.throws(() => frameRange(1, 1.001, 60, 15));
});
test('content/settings/dependencies invalidate cache even with preserved timestamps; corrupt outputs rebuild', async () => {
  const root = mkdtempSync(join(tmpdir(), 'studio-cache-test-'));
  try {
    mkdirSync(join(root, 'film')); mkdirSync(join(root, 'lib')); mkdirSync(join(root, 'assets'));
    const picture = join(root, 'film', 'film.js'), score = join(root, 'film', 'score.mjs'), asset = join(root, 'assets', 'photo.png');
    writeFileSync(picture, 'old'); writeFileSync(score, 'audio'); writeFileSync(asset, 'image');
    const key = () => fingerprint(root, ['film', 'lib', 'assets'], { segments: '0-12', fps: 15 }, ['film/score.mjs']);
    const k1 = key(), out = join(root, 'video.mp4'), manifest = join(root, 'manifest.json');
    writeFileSync(out, 'valid'); saveCache(manifest, k1, [out]); assert.equal(cacheHit(manifest, key(), [out]), true);
    writeFileSync(score, 'audio change'); assert.equal(key(), k1);
    writeFileSync(picture, 'new'); utimesSync(picture, 1, 1); assert.notEqual(key(), k1);
    assert.equal(cacheHit(manifest, key(), [out]), false);
    const k2 = key(); writeFileSync(asset, 'changed image'); assert.notEqual(key(), k2);
    assert.notEqual(fingerprint(root, ['film'], { fps: 15 }), fingerprint(root, ['film'], { fps: 30 }));
    saveCache(manifest, key(), [out]); writeFileSync(out, 'broken'); assert.equal(cacheHit(manifest, key(), [out]), false);
    let builds = 0; const build = async () => { builds++; writeFileSync(out, 'restored'); };
    await cached(manifest, key(), [out], build, () => {}); await cached(manifest, key(), [out], build, () => {}); assert.equal(builds, 1);
    rmSync(out); assert.equal(cacheHit(manifest, key(), [out]), false);
    await assert.rejects(cached(manifest, key(), [out], async () => { throw new Error('build failed'); }, () => {}));
    assert.equal(cacheHit(manifest, key(), [out]), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
const brief = { w: 1080, h: 1350, duration: 60, fps: 30, lufs: -14, tp: -1.5 };
const measured = { probe: { width: 1080, height: 1350, duration: 60, fps: 30 }, loud: { I: -14, TP: -1.5, LRA: 3 }, frozen: [], black: [], text: { lines: [], issues: [] } };
test('final gates retain blockers and allow explicitly declared holds/fades', () => {
  assert.equal(gates(measured, brief).every(g => g.ok), true);
  assert.equal(gates({ ...measured, probe: { ...measured.probe, fps: 15 } }, brief).every(g => g.ok), false);
  assert.equal(gates({ ...measured, loud: { I: null, TP: null, LRA: null } }, brief).every(g => g.ok), false);
  assert.equal(gates({ ...measured, black: [{ start: 10, end: 60 }] }, brief).every(g => g.ok), false);
  assert.equal(gates({ ...measured, black: [{ start: 59.6, end: 60 }] }, { ...brief, fadeOut: 0.6 }).every(g => g.ok), true);
  const hold = { ...measured, frozen: [{ start: 58, end: null }] };
  assert.equal(gates(hold, brief).every(g => g.ok), false);
  assert.equal(gates(hold, { ...brief, holds: [[58, 60]] }).every(g => g.ok), true);
});
