import { test } from 'node:test';
import assert from 'node:assert/strict';
import { morphBox, morphBlur, swap, cursorAt, cursorClick, gridDots, ripple, twinkle, coverRadius, portal, circleWipe, assembly, flight, mixHex } from '../lib/uimorph.js';

const near = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m}: ${a} vs ${b}`);

test('morphBox settles on each target; blur is zero when settled and positive mid-morph', () => {
  const tracks = { w: [[0, 176], [1, 470], [2, 112]], h: [[0, 96], [1, 112]] };
  near(morphBox(0.9, tracks).w, 176, 1e-9, 'before first move');
  near(morphBox(1.95, tracks).w, 470, 2, 'settled on 470'); near(morphBox(4, tracks).w, 112, 0.5, 'settled on 112');
  assert.equal(morphBlur(4, tracks), 0); assert.ok(morphBlur(1.08, tracks) > 1, 'blurs while moving');
  assert.equal(morphBox(1.3, tracks).w, morphBox(1.3, tracks).w, 'deterministic');
});

test('swap: old content leaves before the new resolves', () => {
  const a = swap(0.98, 1), b = swap(1.3, 1);
  assert.ok(a.old.opacity < 1 && a.next.opacity === 0); assert.equal(b.old.opacity, 0); near(b.next.opacity, 1, 1e-9, 'new in');
});

test('cursor follows keys on a bow, dips on click, ring expands and fades', () => {
  const keys = [{ t: 0, x: 1000, y: 1500 }, { t: 1, x: 600, y: 700 }];
  assert.deepEqual(cursorAt(keys, -1), { x: 1000, y: 1500 }); assert.deepEqual(cursorAt(keys, 2), { x: 600, y: 700 });
  const mid = cursorAt(keys, 0.5); assert.ok(Math.hypot(mid.x - 800, mid.y - 1100) > 30, 'bowed path');
  const c = cursorClick(1.0, [1.0]); assert.ok(c.scale < 1); assert.equal(cursorClick(3, [1]).scale, 1);
  assert.ok(cursorClick(1.2, [1]).ring.opacity > 0 && cursorClick(1.6, [1]).ring.opacity === 0);
});

test('grid, ripple and twinkle are bounded and seeded', () => {
  const d = gridDots(1080, 1920); assert.ok(d.length > 600); assert.ok(d.every((p) => p.x >= -1 && p.x <= 1081));
  assert.equal(ripple(0.4, 0.5, 0, 0, 0, 0), 0); near(ripple(0.5, 0.5, 0, 0, 0, 0), 1, 1e-9, 'front at origin');
  for (let t = 0; t < 10; t += 0.13) { const v = twinkle(t, 3, 4, 9); assert.ok(v >= 0 && v <= 0.75); assert.equal(v, twinkle(t, 3, 4, 9)); }
});

test('portal grows past the frame; circle wipe covers the frame before its end', () => {
  const p = portal(4, { a: 3.5, b: 4, x: 160, y: 1150, size0: 30, W: 1080, H: 1920 });
  assert.ok(p.size >= 5000 && p.camera > 3); assert.equal(portal(3, { a: 3.5, b: 4, x: 0, y: 0, size0: 30, W: 10, H: 10 }).clip, 'none');
  const R = coverRadius(860, 520, 1080, 1920), w = circleWipe(9.75 + 0.32 * 0.75, { a: 9.75, b: 10.07, x: 860, y: 520, W: 1080, H: 1920 });
  assert.ok(w.r >= R, 'covered at 75 % of the wipe'); assert.equal(circleWipe(11, { a: 9.75, b: 10.07, x: 860, y: 520, W: 1080, H: 1920 }).clip, 'none');
});

test('assembly particles start at the burst point and land on their targets', () => {
  const ps = assembly([{ x: 100, y: 200, color: '#000000' }, { x: 900, y: 300, color: '#0a66ff' }], { ox: 540, oy: 760, t0: 24 });
  for (const p of ps) {
    assert.equal(flight(p, 24), null); assert.ok(p.delay > 0 && p.delay < 0.33);
    const f = flight(p, 26); near(f.x, p.x, 0.5, 'x lands'); near(f.y, p.y, 0.5, 'y lands'); near(f.rot, 0, 0.5, 'rotation settles');
  }
  assert.equal(mixHex('#000000', '#ffffff', 0.5), 'rgb(128,128,128)'); assert.throws(() => mixHex('red', '#fff', 0), /bad colour/);
});
