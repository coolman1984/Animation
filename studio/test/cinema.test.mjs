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

import { cameraSpline, moves, handheld, breathe, focusTrack, cameraVelocity, handoff, choreography, cameraDiagnostics } from '../lib/cinema.js';

test('cameraSpline hits every key, flows through interior keys (no dead stop) and never overshoots', () => {
  const keys = [{ t: 0, x: 0, zoom: 1 }, { t: 1, x: 100, zoom: 1.2 }, { t: 2, x: 200, zoom: 1.44 }, { t: 3, x: 200, zoom: 1.44 }];
  for (const k of keys) { const c = cameraSpline(keys, k.t); assert.ok(Math.abs(c.x - k.x) < 1e-9 && Math.abs(c.zoom - k.zoom) < 1e-9); }
  const f = t => cameraSpline(keys, t);
  assert.ok(Math.abs(cameraVelocity(f, 1).x) > 50, 'keeps moving through interior key');
  assert.ok(Math.abs(cameraVelocity(t => cameraPath(keys, t), 1).x) < 1, 'legacy cameraPath stops at keys');
  for (let t = 0; t <= 3; t += 0.01) { const c = f(t); assert.ok(c.x >= -1e-9 && c.x <= 200 + 1e-9, 'monotone, no overshoot'); }
  // log-zoom: equal ratios per second across the 1→1.2→1.44 run.
  assert.ok(Math.abs(cameraVelocity(f, 1).zoom - Math.log(1.2)) < 0.05);
  const held = [{ t: 0, x: 0 }, { t: 1, x: 100, hold: true }, { t: 2, x: 200 }];
  assert.ok(Math.abs(cameraVelocity(t => cameraSpline(held, t), 1, 1e-5).x) < 0.05, 'hold forces a settle');
});

test('intent moves: push-in, truck, hero settle with optional overshoot, macro discovery and follow', () => {
  const push = moves.pushIn({ start: 0, end: 2, from: 1, to: 1.2 });
  assert.equal(push(0).zoom, 1); assert.ok(Math.abs(push(2).zoom - 1.2) < 1e-9);
  assert.ok(Math.abs(push(1).zoom - Math.sqrt(1.2)) < 1e-9, 'log-uniform zoom midpoint');
  assert.equal(moves.truck({ start: 0, end: 1, from: -50, to: 50 })(1).x, 50);
  const settle = moves.heroSettle({ start: 0, from: { x: -200 }, to: { x: 0 }, duration: 0.8, bounce: 0.2 });
  const xs = Array.from({ length: 200 }, (_, i) => settle(i / 100).x);
  assert.ok(Math.max(...xs) > 1, 'bouncy settle overshoots slightly'); assert.ok(Math.abs(settle(5).x) < 1e-3);
  const calm = moves.heroSettle({ start: 0, from: { x: -200 }, to: { x: 0 }, bounce: 0 });
  assert.ok(Math.max(...Array.from({ length: 200 }, (_, i) => calm(i / 100).x)) <= 1e-9);
  const macro = moves.macroDiscovery({ start: 0, end: 3, waypoints: [[0, 0], [80, 20], [160, 0]], zoom: 2.4, settleZoom: 1.5 });
  assert.equal(macro(0).zoom, 2.4); assert.ok(Math.abs(macro(3).zoom - 1.5) < 1e-9); assert.ok(Math.abs(macro(3).x - 160) < 1e-6);
  const follow = moves.follow({ subject: t => ({ x: t < 1 ? 0 : 300, y: 0 }) });
  assert.ok(follow(1.1).x > 0 && follow(1.1).x < 150, 'operator lags the subject'); assert.ok(Math.abs(follow(8).x - 300) < 1e-6);
  assert.deepEqual(handheld(1.5, { seed: 2 }), handheld(1.5, { seed: 2 }));
  assert.ok(Math.abs(breathe({ x: 0, y: 0, zoom: 1, focus: 2, aperture: 0 }).zoom - 1) <= 0.02);
  const ft = focusTrack(3, t => (t < 1 ? 0.6 : 1.4)); assert.ok(Math.abs(ft.focus - 1.4) < 1e-6);
});

test('hand-off carries outgoing velocity into the next shot and choreography reports cuts', () => {
  const a = moves.truck({ start: 0, end: 2, from: 0, to: 400, ease: p => p });  // 200 px/s at the cut
  const b = moves.hold({ x: 1000 });
  const h = handoff(a, 1, b, { duration: 0.8 });
  assert.equal(h(1).x, 1000, 'hard cut keeps the new framing');
  assert.ok(Math.abs(cameraVelocity(h, 1 + 1e-3, 1e-4).x - 200) < 10, 'incoming shot inherits velocity');
  assert.ok(Math.abs(h(3).x - 1000) < 0.5, 'and settles into its own framing');
  const m = handoff(a, 1, b, { matchPosition: true });
  assert.ok(Math.abs(m(1).x - a(1).x) < 1e-9, 'match cut removes the position jump');
  const film = choreography([
    { id: 'one', start: 0, end: 1, camera: a },
    { id: 'two', start: 1, end: 3, camera: b, handoff: { duration: 0.8 } },
    { id: 'three', start: 3, end: 4, camera: [{ t: 3, x: 0 }, { t: 4, x: 50 }] },
  ]);
  assert.deepEqual(film.cuts, [1, 3]); assert.deepEqual(film.continuous, [true, false]);
  assert.equal(film.shotAt(2), 'two'); assert.equal(film.at(4).x, 50);
  assert.throws(() => choreography([{ start: 0, end: 2 }, { start: 1, end: 3 }]), /overlaps/);
});

test('camera diagnostics flag dead stops, pumping, abrupt moves, holds and reversed transitions', () => {
  const vp = { w: 1000, h: 1000 };
  const stop = cameraDiagnostics(t => cameraPath([{ t: 0, x: 0 }, { t: 1, x: 200 }, { t: 2, x: 400 }], t), { start: 0, end: 2, viewport: vp });
  assert.ok(stop.events.some(e => e.kind === 'dead-stop'), JSON.stringify(stop.events));
  const smooth = cameraDiagnostics(t => cameraSpline([{ t: 0, x: 0 }, { t: 1, x: 200 }, { t: 2, x: 400 }], t), { start: 0, end: 2, viewport: vp });
  assert.ok(!smooth.events.some(e => e.kind === 'dead-stop'));
  const pump = cameraDiagnostics(t => ({ zoom: 1 + 0.1 * Math.sin(t * 6) }), { start: 0, end: 3, viewport: vp });
  assert.ok(pump.events.some(e => e.kind === 'camera-pumping'));
  const whip = cameraDiagnostics(moves.truck({ start: 0, end: 0.3, from: 0, to: 900 }), { start: 0, end: 1, viewport: vp });
  assert.ok(whip.events.some(e => e.kind === 'fast-pan') && whip.events.some(e => e.kind === 'abrupt-acceleration'));
  assert.ok(whip.peakSpeedTime > 0.1 && whip.peakSpeedTime < 0.2);
  const hold = cameraDiagnostics(moves.truck({ start: 0, end: 4, from: 0, to: 300 }), { start: 0, end: 4, viewport: vp, holds: [[1, 2]] });
  assert.ok(hold.events.some(e => e.kind === 'motion-in-hold'));
  const film = choreography([{ id: 'a', start: 0, end: 1, camera: moves.truck({ start: 0, end: 2, from: 0, to: 400, ease: p => p }) },
    { id: 'b', start: 1, end: 2, camera: moves.truck({ start: 1, end: 3, from: 400, to: 0, ease: p => p }), handoff: { duration: 0.05 } }]);
  const rev = cameraDiagnostics(film.at, { start: 0, end: 2, viewport: vp, cuts: film.cuts, continuous: film.continuous });
  assert.ok(rev.boundaries[0].reversal && rev.events.some(e => e.kind === 'transition-velocity'));
  assert.deepEqual(cameraDiagnostics(film.at, { start: 0, end: 2, viewport: vp, cuts: film.cuts, continuous: film.continuous }), rev);
});
