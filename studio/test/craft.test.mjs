import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyIssues, validateProduction, loadProduction, reviewTimes } from '../lib/production.mjs';
import { projectLayer, coverCamera } from '../lib/depth.js';
import { ramp } from '../lib/motion.js';
import { fingerprint } from '../lib/cache.mjs';
const plan = () => ({ version: 1, audience: 'Café guests', promise: 'A calm moment', cta: 'Try it', direction: 'Warm restrained still life',
  duration: 4, fps: 30, assets: [], sound: { mode: 'original' }, shots: [
    { id: 'a', start: 0, end: 2, purpose: 'hook', assetIds: [], copy: { text: 'على مهلك', start: 0, end: 2 } },
    { id: 'b', start: 2, end: 4, purpose: 'CTA', assetIds: [] },
  ] });
test('production preflight catches missing assets, false evidence, holes and malformed data', () => {
  assert.deepEqual(validateProduction(plan()).errors, []);
  const p = plan(); p.assets = [{ id: 'ref', role: 'reference', path: 'missing.png', rights: '' }];
  p.shots[0].assetIds = ['ref', 'unknown']; p.shots[0].claim = 'Best in town'; p.shots[1].start = 3;
  const r = validateProduction(p, { root: tmpdir(), final: true });
  for (const pattern of [/missing asset/, /permission/, /mood reference/, /unknown asset/, /claim needs evidence/, /uncovered/]) assert.ok(r.errors.some(e => pattern.test(e)), pattern);
  assert.ok(validateProduction({}).errors.length);
  p.assets[0].rights = 3; p.shots[0].purpose = 2;
  assert.doesNotThrow(() => validateProduction(p));
  assert.ok(validateProduction({ ...plan(), sound: { mode: 'licensed', assetId: 'bad' } }, { final: true }).errors.length >= 2);
});
test('Arabic copy checks real readable time, diacritics, punctuation and digit consistency', () => {
  assert.deepEqual(copyIssues('جرّبها النهارده', 2), []);
  assert.ok(copyIssues('نص طويل جدًا لا يقدر المشاهد على قراءته في اللحظة', 0.5).length >= 3);
  assert.ok(copyIssues('١٠ و20 ؟', 2).includes('mixed Arabic-Indic and Latin digits'));
  assert.ok(copyIssues('سؤال ؟', 2).includes('space before Arabic punctuation'));
  assert.deepEqual(copyIssues('', 2), ['empty copy']);
});
test('load plan before rendering and sample both sides of shot boundaries deterministically', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-plan-'));
  try {
    const p = plan(); writeFileSync(join(dir, 'production.json'), JSON.stringify(p));
    assert.deepEqual(loadProduction(dir, { production: 'production.json', fps: 30, deliveries: [{ name: 'full', duration: 4 }] }).errors, []);
    assert.ok(loadProduction(dir, { production: 'missing.json' }).errors.length);
    writeFileSync(join(dir, 'null.json'), 'null');
    assert.ok(loadProduction(dir, { production: 'null.json' }).errors.length);
    assert.ok(loadProduction(dir, { production: 123 }).errors.length);
    const times = reviewTimes(p);
    for (const t of [0, 59 / 30, 2, 61 / 30, 119 / 30]) assert.ok(times.includes(t));
    assert.ok(reviewTimes(p, { range: [2, 3] }).every(t => t >= 2 && t < 3));
    assert.throws(() => reviewTimes(p, { range: [3, 2] }), /invalid/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('one camera produces ordered parallax/selective focus; cover camera never exposes an edge', () => {
  const viewport = { w: 400, h: 450 }, base = { width: 100, height: 200 };
  const camera = { x: 20, zoom: 1.1, focus: 1, aperture: 12 };
  const near = projectLayer({ ...base, depth: 1.8 }, camera, viewport);
  const hero = projectLayer({ ...base, depth: 1 }, camera, viewport);
  const far = projectLayer({ ...base, depth: 0.3 }, camera, viewport);
  assert.ok(near.x < hero.x && hero.x < far.x); assert.equal(hero.blur, 0); assert.ok(far.blur > 0);
  assert.deepEqual(projectLayer({ ...base, depth: 1 }, camera, viewport), hero);
  const clamped = coverCamera({ cx: -100, cy: 2000, scale: 0.01 }, { w: 600, h: 600 }, viewport);
  assert.equal(clamped.scale, 0.75); assert.ok(clamped.cx >= 400 / (2 * clamped.scale)); assert.equal(clamped.cy, 300);
  assert.throws(() => projectLayer({ ...base, depth: NaN }, camera, viewport), /invalid/);
  assert.equal(ramp(1, 1, 1), 1); assert.equal(ramp(0, 1, 1), 0);
});
test('absolute external assets participate in cache hashes and normalized exclusions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-external-'));
  try {
    const file = join(dir, 'music.txt'); writeFileSync(file, 'first');
    const root = join(dir, 'studio');
    const first = fingerprint(root, [file]);
    writeFileSync(file, 'changed'); assert.notEqual(fingerprint(root, [file]), first);
    assert.equal(fingerprint(root, [file], {}, [file]), fingerprint(root, [file], {}, ['../music.txt']));
    assert.equal(fingerprint(root, [file]), fingerprint(root, ['../music.txt']));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
