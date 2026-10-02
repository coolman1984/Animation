import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planeTransform, tiltSettle, planeDrift, typeOn, caretVisible, typeEnd, stackLines, orbitPoint, scatterOut, litCells, wallCells, pulseRing } from '../lib/uimotion.js';

const near = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m}: ${a} vs ${b}`);

test('plane transform is a valid, deterministic CSS string and rejects bad input', () => {
  const s = planeTransform({ rx: 8, ry: -12, z: 40 });
  assert.match(s, /^perspective\(1400px\) translate3d\(0\.00px, 0\.00px, 40\.00px\) rotateX\(8\.000deg\) rotateY\(-12\.000deg\)/);
  assert.equal(s, planeTransform({ rx: 8, ry: -12, z: 40 }));
  assert.throws(() => planeTransform({ rx: NaN }), /finite/);
  assert.throws(() => planeTransform({ perspective: 0 }), /positive/);
});

test('tiltSettle starts at from, lands on to, overshoots only with bounce, and drift stays small', () => {
  const o = { start: 1, duration: 0.6, from: { ry: -30, x: 200 }, to: { ry: -8, x: 0 } };
  near(tiltSettle(0.5, o).ry, -30, 1e-9, 'before start'); near(tiltSettle(0.5, o).x, 200, 1e-9, 'before start x');
  near(tiltSettle(3, o).ry, -8, 0.01, 'settled'); near(tiltSettle(3, o).x, 0, 0.5, 'settled x');
  let max = -Infinity; for (let t = 1; t < 3; t += 0.01) max = Math.max(max, tiltSettle(t, { ...o, bounce: 0.35 }).ry);
  assert.ok(max > -8 + 0.2, 'bouncy spring overshoots the resting tilt');
  let maxFlat = -Infinity; for (let t = 1; t < 3; t += 0.01) maxFlat = Math.max(maxFlat, tiltSettle(t, o).ry);
  assert.ok(maxFlat <= -8 + 0.01, 'critically damped spring does not overshoot');
  for (let t = 0; t < 20; t += 0.37) { const d = planeDrift(t); assert.ok(Math.abs(d.rx) <= 0.6 + 1e-9 && Math.abs(d.ry) <= 0.9 + 1e-9); }
});

test('typeOn is monotonic, finishes, types Latin by grapheme and Arabic by whole words', () => {
  const text = 'Write a launch tagline';
  let last = 0; for (let t = 0; t < 3; t += 0.05) { const r = typeOn(text, t, { cps: 12 }); assert.ok(r.count >= last); assert.ok(text.startsWith(r.text)); last = r.count; }
  assert.equal(typeOn(text, 10).text, text); assert.ok(typeOn(text, 10).done); assert.equal(typeOn(text, -1).text, '');
  const ar = 'اكتب شعارا جميلا للمقهى';
  for (let t = 0; t < 3; t += 0.1) { const r = typeOn(ar, t, { wordsPerSecond: 2 }); const words = r.text.split(' ').filter(Boolean); assert.ok(ar.startsWith(r.text)); assert.ok(words.every(w => ar.split(' ').includes(w)), 'never a half-typed Arabic word'); }
  assert.equal(typeOn(ar, 10).text, ar);
  if (typeof Intl.Segmenter === 'function') assert.equal(typeOn('a👍🏽b', 1, { cps: 2 }).text, 'a👍🏽', 'emoji with a skin-tone modifier is one grapheme');
  near(typeEnd(text, { start: 1, cps: 11 }), 1 + text.length / 11, 1e-9, 'typeEnd');
});

test('caret is solid while typing and after, then blinks', () => {
  assert.equal(caretVisible(0.5, { start: 1 }), false);
  assert.equal(caretVisible(1.2, { start: 1, end: 2 }), true); assert.equal(caretVisible(2.3, { start: 1, end: 2 }), true);
  const seen = new Set(); for (let t = 2.5; t < 5; t += 0.05) seen.add(caretVisible(t, { start: 1, end: 2 }));
  assert.equal(seen.size, 2, 'blinks after the hold');
});

test('stackLines: appear in order, older lines dim when the next arrives, last line stays full', () => {
  const at = t => stackLines(t, 3, { start: 1, each: 0.5, dur: 0.6, dimTo: 0.5 });
  assert.equal(at(0.9)[0].opacity, 0); assert.ok(at(1.3)[0].opacity > 0 && at(1.3)[1].opacity === 0);
  const end = at(5); near(end[0].dim, 0.5, 1e-9, 'first dimmed'); near(end[1].dim, 0.5, 1e-9, 'second dimmed'); near(end[2].dim, 1, 1e-9, 'last full');
  near(end[2].opacity, 1, 1e-9, 'last opaque'); near(end[0].opacity, 0.5, 1e-9, 'first at dimTo');
  assert.ok(end.every(l => l.y === 0 && l.blur === 0 && l.clip === 1));
  assert.throws(() => stackLines(0, 0), /n >= 1/);
});

test('orbit is periodic with bounded depth; scatter is identity before start and invisible at the end', () => {
  const o = { cx: 100, cy: 50, rx: 300, ry: 100, period: 6, phase: 1 };
  const a = orbitPoint(1.3, o), b = orbitPoint(1.3 + 6, o); near(a.x, b.x, 1e-6, 'x'); near(a.y, b.y, 1e-6, 'y');
  for (let t = 0; t < 12; t += 0.2) { const p = orbitPoint(t, o); assert.ok(p.depth >= -1 && p.depth <= 1 && p.opacity > 0.7 && p.opacity <= 1 && p.blur >= 0); }
  const s0 = scatterOut(0.5, { start: 1, dur: 0.5, angle: 45 }); assert.deepEqual([s0.dx, s0.dy, s0.scale, s0.blur, s0.opacity], [0, 0, 1, 0, 1]);
  const s1 = scatterOut(2, { start: 1, dur: 0.5, angle: 0, distance: 200 }); near(s1.opacity, 0, 1e-9, 'gone'); near(s1.dx, 200, 1e-9, 'distance'); assert.ok(s1.blur > 10);
});

test('litCells: deterministic, bounded, about `count` lit, and it moves over time', () => {
  const a = litCells(2.34, 24, { count: 3, seed: 5 }), b = litCells(2.34, 24, { count: 3, seed: 5 });
  assert.deepEqual(a, b); assert.ok(a.every(v => v >= 0 && v <= 1));
  const sum = litCells(0.2, 24, { count: 3, period: 1, fade: 0.4 }).reduce((x, y) => x + y, 0); near(sum, 3, 1e-9, 'brightness sums to count at mid-epoch');
  const lit = t => litCells(t, 24, { count: 3, seed: 5 }).map((v, i) => (v > 0.5 ? i : -1)).filter(i => i >= 0).join(',');
  assert.notEqual(lit(0.2), lit(2.2), 'spotlights travel');
  assert.throws(() => litCells(0, 0), /n >= 1/);
  const cells = wallCells({ cols: 4, rows: 3 }); assert.equal(cells.length, 12); assert.deepEqual(cells, wallCells({ cols: 4, rows: 3 }));
});

test('pulseRing grows, fades in then out, and is silent outside its window', () => {
  const o = { start: 1, dur: 1, r0: 20, r1: 200 };
  assert.equal(pulseRing(0.5, o).opacity, 0); assert.equal(pulseRing(2.5, o).opacity, 0);
  let lastR = 0, peak = 0; for (let t = 1.01; t < 2; t += 0.02) { const r = pulseRing(t, o); assert.ok(r.r >= lastR); lastR = r.r; peak = Math.max(peak, r.opacity); }
  assert.ok(peak > 0.5 && peak <= 1); assert.ok(pulseRing(1.98, o).opacity < 0.2);
});
