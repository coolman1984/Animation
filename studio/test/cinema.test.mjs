import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraPath, microDrift, composeCamera, rackFocus, lensBreathing, cameraKinematics } from '../lib/cinema.js';

test('cameraPath is deterministic, seek-safe and settles exactly on keys', () => {
  const keys = [
    { t: 0, x: 0, y: 0, zoom: 1, focus: 0.8, aperture: 8 },
    { t: 1, x: 100, y: -20, zoom: 1.1, focus: 1.2, aperture: 10 },
    { t: 2, x: 80, y: 0, zoom: 1.05, focus: 1, aperture: 4 },
  ];
  assert.deepEqual(cameraPath(keys, 0), { x: 0, y: 0, zoom: 1, focus: 0.8, aperture: 8 });
  assert.deepEqual(cameraPath(keys, 2), { x: 80, y: 0, zoom: 1.05, focus: 1, aperture: 4 });
  assert.deepEqual(cameraPath(keys, 0.73), cameraPath(keys, 0.73));
  const mid = cameraPath(keys, 0.5);
  assert.equal(mid.x, 50); assert.equal(mid.y, -10);
});

test('microDrift is seeded and composeCamera keeps offsets subtle and explicit', () => {
  const a = microDrift(1.25, { seed: 12, x: 2, y: 1, zoom: 0.005 });
  assert.deepEqual(a, microDrift(1.25, { seed: 12, x: 2, y: 1, zoom: 0.005 }));
  const c = composeCamera({ x: 10, y: 20, zoom: 1.1, focus: 1, aperture: 6 }, a);
  assert.ok(c.zoom > 1.09 && c.zoom < 1.11);
  assert.ok(Math.abs(c.x - 10) <= 2); assert.ok(Math.abs(c.y - 20) <= 1);
});

test('rack focus and lens breathing are bounded', () => {
  assert.deepEqual(rackFocus(0, { start: 0, end: 1, from: 0.7, to: 1.3, aperture: 9 }), { focus: 0.7, aperture: 9 });
  assert.deepEqual(rackFocus(1, { start: 0, end: 1, from: 0.7, to: 1.3, aperture: 9 }), { focus: 1.3, aperture: 9 });
  assert.ok(Math.abs(lensBreathing(9, { reference: 1, amount: 1, max: 0.02 })) <= 0.02);
});

test('camera kinematics reports finite diagnostics', () => {
  const k = cameraKinematics([{ t: 0, x: 0, y: 0, zoom: 1 }, { t: 2, x: 100, y: 20, zoom: 1.2 }], 1);
  for (const group of [k.velocity, k.acceleration]) for (const value of Object.values(group)) assert.ok(Number.isFinite(value));
});
