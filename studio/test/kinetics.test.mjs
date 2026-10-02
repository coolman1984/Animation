import test from 'node:test';
import assert from 'node:assert/strict';
import { cubicBezier, curves, backOut, springConfig, springStep, spring, springTrack, springSettleTime, springFollow,
  inertia, inertiaVelocity, anticipate, stagger, staggerGrid, delayChain, hash, shuffle, noise1, noise2, fbm, drift,
  parsePath, catmullRom, motionPath, morphPath, countValue, formatNumber } from '../lib/kinetics.js';

const near = (a, b, eps = 1e-6, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} ${a} ≉ ${b}`);

test('cubic-bezier matches CSS endpoints, linear identity and named intent curves stay monotone', () => {
  const lin = cubicBezier(0, 0, 1, 1);
  for (const p of [0, 0.1, 0.5, 0.9, 1]) near(lin(p), p, 1e-6);
  const ease = cubicBezier(0.25, 0.1, 0.25, 1); // CSS "ease"
  near(ease(0.5), 0.8024033877399112, 1e-4);
  for (const f of Object.values(curves)) { let last = -1; for (let p = 0; p <= 1.0001; p += 0.01) { const v = f(Math.min(1, p)); assert.ok(v >= last - 1e-9); last = v; } }
  assert.throws(() => cubicBezier(1.5, 0, 0, 1), /x values/);
  assert.ok(Math.max(...Array.from({ length: 101 }, (_, i) => backOut()(i / 100))) > 1.05, 'backOut overshoots');
});

test('analytic springs: exact rest, overshoot only when bouncy, velocity continuity on retarget', () => {
  for (const bounce of [-0.5, 0, 0.35]) {
    const cfg = springConfig({ duration: 0.5, bounce });
    near(springStep(0, cfg).value, 0); near(springStep(5, cfg).value, 1, 1e-6, `rest bounce ${bounce}`);
    const peak = Math.max(...Array.from({ length: 400 }, (_, i) => springStep(i / 200, cfg).value));
    if (bounce > 0) assert.ok(peak > 1.05, 'bouncy spring overshoots'); else assert.ok(peak <= 1 + 1e-9, 'non-bouncy never overshoots');
    // Numerical derivative agrees with analytic velocity.
    const t = 0.13, h = 1e-5;
    near((springStep(t + h, cfg).value - springStep(t - h, cfg).value) / (2 * h), springStep(t, cfg).velocity, 1e-3);
    assert.ok(springSettleTime(cfg) > 0 && Math.abs(springStep(springSettleTime(cfg), cfg).value - 1) < 0.0011);
  }
  near(spring(3, { from: 10, to: 20, start: 1, duration: 0.4 }), 20, 1e-6);
  assert.equal(spring(0.5, { from: 10, to: 20, start: 1 }), 10);
  const keys = [[0, 0], [1, 100], [1.2, 40]];
  assert.equal(springTrack(keys, 0.5), 0); near(springTrack(keys, 9, { duration: 0.4 }), 40, 1e-6);
  // Retargeting at 1.2 s keeps the curve continuous (no jump).
  near(springTrack(keys, 1.2 - 1e-6, { duration: 0.4 }), springTrack(keys, 1.2 + 1e-6, { duration: 0.4 }), 1e-3);
  assert.deepEqual(springTrack(keys, 1.37, { duration: 0.4 }), springTrack(keys, 1.37, { duration: 0.4 }));
});

test('springFollow lags a moving source, overshoots when bouncy and rests exactly on a still source', () => {
  const src = t => (t < 1 ? 0 : 100);
  near(springFollow(src, 0.5, { duration: 0.4 }), 0, 1e-9);
  near(springFollow(src, 6, { duration: 0.4 }), 100, 1e-9, 'DC gain is exactly 1');
  assert.ok(springFollow(src, 1.1, { duration: 0.4 }) < 60, 'secondary motion lags');
  const bouncy = Math.max(...Array.from({ length: 80 }, (_, i) => springFollow(src, 1 + i / 40, { duration: 0.4, bounce: 0.4 })));
  assert.ok(bouncy > 103, 'follow-through overshoots with bounce');
  assert.throws(() => springFollow(5, 1), /function/);
});

test('inertia comes to rest on target; anticipation pulls back before moving', () => {
  const v = inertiaVelocity({ from: 0, to: 300, friction: 5 });
  near(inertia(20, { velocity: v, friction: 5 }), 300, 1e-6);
  assert.equal(inertia(-1, { start: 0, from: 7, velocity: 100 }), 7);
  const vals = Array.from({ length: 101 }, (_, i) => anticipate(i / 100, { start: 0, end: 1, from: 0, to: 100 }));
  assert.ok(Math.min(...vals) < -2, 'pulls back'); near(vals[100], 100, 1e-9);
});

test('stagger orders, centres, edges, totals and seeded randomness are deterministic', () => {
  assert.deepEqual([0, 1, 2, 3].map(i => stagger(i, 4, { each: 0.1 })).map(v => +v.toFixed(3)), [0, 0.1, 0.2, 0.3]);
  assert.deepEqual([0, 1, 2, 3, 4].map(i => stagger(i, 5, { each: 1, from: 'center' })), [2, 1, 0, 1, 2]);
  assert.deepEqual([0, 1, 2, 3, 4].map(i => stagger(i, 5, { each: 1, from: 'edges' })), [0, 1, 2, 1, 0]);
  near(stagger(4, 5, { total: 1 }), 1);
  const r = [0, 1, 2, 3, 4].map(i => stagger(i, 5, { from: 'random', seed: 9 }));
  assert.deepEqual(r, [0, 1, 2, 3, 4].map(i => stagger(i, 5, { from: 'random', seed: 9 })));
  assert.deepEqual([...r].sort(), [0, 0.05, 0.1, 0.15000000000000002, 0.2].sort());
  assert.throws(() => stagger(5, 5), /range/);
  near(staggerGrid(3, 4, 5, 5, { from: [0, 0], each: 1 }), 5);
  assert.equal(delayChain(t => t * 2, 1, 2, 0.25), 1);
});

test('noise is seeded, smooth, bounded; shuffle/hash are stable', () => {
  assert.equal(hash(1, 2, 3), hash(1, 2, 3)); assert.notEqual(hash(1, 2, 3), hash(1, 2, 4));
  assert.deepEqual(shuffle([1, 2, 3, 4, 5], 3), shuffle([1, 2, 3, 4, 5], 3));
  let max = 0, maxStep = 0, prev = noise1(0, 4);
  for (let x = 0; x < 50; x += 0.01) {
    const v = noise1(x, 4); max = Math.max(max, Math.abs(v)); maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v;
    assert.ok(Math.abs(noise2(x, x * 0.7, 2)) <= 1.5); assert.ok(Math.abs(fbm(x, 1)) <= 1.2);
  }
  assert.ok(max <= 1.01 && max > 0.3); assert.ok(maxStep < 0.06, 'continuous');
  assert.notEqual(noise1(3.3, 1), noise1(3.3, 2));
  assert.deepEqual(drift(2.5, { seed: 3 }), drift(2.5, { seed: 3 }));
});

test('paths: SVG parsing, constant-speed following, Catmull-Rom waypoints and outline morph', () => {
  const p = motionPath('M0 0 L100 0 l0 100 H0 Z');
  near(p.length, 400, 1e-6);
  const mid = p.at(0.5); near(mid.x, 100, 1e-6); near(mid.y, 100, 1e-6);
  near(p.at(0.125).x, 50, 1e-6); near(p.at(0.125).angle, 0, 1e-6);
  near(p.at(0.375).angle, 90, 1e-6);
  const curve = motionPath('M0 0 C 0 100 100 100 100 0 S 200 -100 200 0 Q 250 50 300 0 T 400 0');
  assert.ok(curve.length > 400); near(curve.at(1).x, 400, 1e-6);
  const cr = motionPath(catmullRom([[0, 0], [100, 50], [200, 0]]));
  near(cr.at(0).x, 0); near(cr.at(1).x, 200);
  assert.ok(cr.points.some(([x, y]) => Math.abs(x - 100) < 2 && Math.abs(y - 50) < 2), 'passes through waypoint');
  const square = 'M0 0 H100 V100 H0 Z', diamond = 'M50 0 L100 50 L50 100 L0 50 Z';
  assert.equal(morphPath(square, diamond, 0), morphPath(square, diamond, 0));
  assert.match(morphPath(square, diamond, 0.5), /^M[\d.]+ [\d.]+ .*Z$/);
  assert.throws(() => parsePath('X 1 2'), /path|command/);
});

test('numbers count deterministically with Arabic-Indic or Latin digits', () => {
  assert.equal(countValue(0, { start: 0, end: 1, from: 0, to: 185.5, decimals: 2 }), 0);
  assert.equal(countValue(1, { start: 0, end: 1, from: 0, to: 185.5, decimals: 2 }), 185.5);
  assert.equal(formatNumber(1250, { digits: 'arab' }), '١٬٢٥٠');
  assert.equal(formatNumber(1250, { digits: 'latn', grouping: false }), '1250');
  assert.equal(formatNumber(185.5, { digits: 'arab', decimals: 2, suffix: ' ج.م' }), '١٨٥٫٥٠ ج.م');
  assert.throws(() => formatNumber(1, { digits: 'roman' }), /digits/);
});
