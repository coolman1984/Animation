import test from 'node:test';
import assert from 'node:assert/strict';
import { creativeIssues, creativeFingerprint, validateCraft } from '../lib/creative.mjs';

test('creative fingerprint describes the plan without pretending to score taste', () => {
  const plan = { shots: [
    { craft: { scale: 'macro', transition: 'cut', camera: 'locked', focal: 'label' } },
    { craft: { scale: 'wide', transition: 'occlusion', camera: 'push', focal: 'product' } },
  ] };
  assert.deepEqual(creativeFingerprint(plan), {
    shots: 2, craftCoverage: 1, scales: { macro: 1, wide: 1 },
    transitions: { cut: 1, occlusion: 1 }, cameras: { locked: 1, push: 1 }, focals: { label: 1, product: 1 },
  });
});

test('creative issues catch accidental repetition and overloaded motion', () => {
  const shots = Array.from({ length: 5 }, (_, i) => ({
    id: `s${i + 1}`,
    craft: { scale: 'close', transition: 'wipe', camera: 'push', focal: 'hero', primaryMotions: ['camera', 'type', 'foreground'] },
  }));
  const issues = creativeIssues({ shots });
  assert.ok(issues.some(x => x.includes('primary motions')));
  assert.ok(issues.some(x => x.includes('repeated "close" scale')));
  assert.ok(issues.some(x => x.includes('transition "wipe" repeats')));
  assert.ok(issues.some(x => x.includes('appears in 5/5 shots')));
});

test('craft validation is strict on structure but optional for legacy plans', () => {
  assert.deepEqual(validateCraft(undefined, 's1'), []);
  assert.ok(validateCraft({ depthLayers: 0 }, 's1')[0].includes('1..12'));
  assert.ok(validateCraft({ primaryMotions: ['camera', ''] }, 's1')[0].includes('nonempty'));
  assert.deepEqual(validateCraft({ scale: 'hero', transition: 'cut', camera: 'settle', focal: 'logo', depthLayers: 4, primaryMotions: ['camera'] }, 's1'), []);
});
