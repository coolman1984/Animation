// Pure parts of the composition toolkit: layout, transitions, depth clamping/haze, typography rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aspectClass, pick, safeArea, compose, frameSubject, fitRect, overlaps, grid } from '../lib/layout.js';
import { TRANSITIONS, transitionState, matchTransform, suggestTransitions, transitionIssues } from '../lib/transitions.js';
import { clampCamera, hazeFilter, PLANES, projectLayer } from '../lib/depth.js';
import { units, direction, readingTime, isArabic } from '../lib/typography.js';

test('aspect classes and pick() recompose by ratio, with exact keys and nearest fallback', () => {
  assert.deepEqual([[1920, 1080], [1440, 1080], [1080, 1080], [1080, 1350], [1080, 1920]].map(([w, h]) => aspectClass(w, h)), ['wide', 'landscape', 'square', 'portrait', 'tall']);
  const o = { wide: 'W', tall: 'T', '4:5': 'four-five' };
  assert.equal(pick(o, 1920, 1080), 'W'); assert.equal(pick(o, 1080, 1350), 'four-five'); assert.equal(pick(o, 1080, 1080), 'W');
  assert.equal(pick({ tall: 1 }, 1920, 1080), 1); assert.throws(() => pick({}, 100, 100), /no layout/);
});

test('compose() gives every slot real geometry per aspect inside the safe area; overlaps are reported', () => {
  const slots = { product: { wide: [0.5, 0, 0.5, 1], tall: [0, 0.3, 1, 0.7] }, title: { wide: [0, 0.3, 0.45, 0.3], tall: [0, 0, 1, 0.25] } };
  const wide = compose(slots, 1920, 1080, { safe: 'titleSafe' }), tall = compose(slots, 1080, 1920, { safe: 'reels' });
  assert.equal(wide.aspect, 'wide'); assert.equal(tall.aspect, 'tall');
  assert.deepEqual(tall.safe, safeArea(1080, 1920, 'reels'));
  assert.ok(tall.rects.title.y >= tall.safe[1] && tall.rects.product.y + tall.rects.product.h <= tall.safe[3] + 1e-6);
  assert.deepEqual(overlaps(wide.rects), []);
  const over = compose(slots, 1920, 1080, { overrides: { title: { wide: [0.4, 0.3, 0.45, 0.3] } } });
  assert.equal(overlaps(over.rects)[0][0], 'product');
  assert.equal(grid([0, 0, 120, 120], { cols: 12, rows: 12 }).cell(1, 1, 2, 2).w, 20);
  assert.deepEqual(fitRect(200, 100, { x: 0, y: 0, w: 100, h: 100 }), { x: 0, y: 25, w: 100, h: 50, scale: 0.5 });
});

test('frameSubject frames by intent and reports when the source cannot honour it', () => {
  const source = { w: 1600, h: 1600 }, subject = { x: 700, y: 500, w: 400, h: 800 };
  const ok = frameSubject({ subject, source, viewport: { w: 1080, h: 1350 }, anchor: [0.5, 0.5], fill: 0.6 });
  assert.ok(Math.abs(ok.anchor[0] - 0.5) < 1e-6 && Math.abs(ok.fill - 0.6) < 1e-6 && !ok.compromised);
  assert.ok(ok.x <= 0 && ok.y <= 0 && ok.x + 1600 * ok.scale >= 1080 && ok.y + 1600 * ok.scale >= 1350, 'image still covers the frame');
  const edge = frameSubject({ subject: { x: 0, y: 0, w: 200, h: 400 }, source, viewport: { w: 1080, h: 1920 }, anchor: [0.5, 0.5], fill: 0.3 });
  assert.equal(edge.compromised, true, 'subject in the corner cannot be centred without exposing edges');
  const zoom = frameSubject({ subject: { x: 780, y: 780, w: 40, h: 40 }, source, viewport: { w: 1080, h: 1080 }, fill: 0.8, maxScale: 1.5 });
  assert.ok(zoom.scale <= 1.5 && zoom.note);
});

test('transition vocabulary: every entry documented, states are pure and complete at both ends', () => {
  const frame = { w: 400, h: 300 };
  const opts = { matchCut: { boxA: { x: 100, y: 50, w: 100, h: 200 }, boxB: { x: 200, y: 0, w: 50, h: 100 } }, shapeMatch: { box: { x: 150, y: 100, w: 100, h: 100 } } };
  for (const [name, def] of Object.entries(TRANSITIONS)) {
    for (const f of ['family', 'purpose', 'use', 'avoid', 'params']) assert.ok(def[f] !== undefined, `${name}.${f}`);
    if (name === 'textureWipe') continue; // needs a canvas; covered by the browser study test
    const start = transitionState(name, 0, opts[name], frame), end = transitionState(name, 1, opts[name], frame);
    assert.equal(start.a.visible, true, `${name} starts on a`); assert.equal(start.b.visible, false);
    assert.equal(end.b.visible, true, `${name} ends on b`); assert.equal(end.a.visible, false, `${name} hides a at the end`);
    assert.equal(end.b.opacity, 1); assert.equal(end.b.clipPath, 'none'); assert.equal(end.b.filter, 'none');
    assert.deepEqual(transitionState(name, 0.42, opts[name], frame), transitionState(name, 0.42, opts[name], frame));
  }
  assert.equal(transitionState('matchCut', 1, opts.matchCut, frame).b.transform.includes('scale(1.00000)'), true, 'match cut settles to identity');
  assert.throws(() => transitionState('sparkle', 0.5, {}, frame), /unknown transition/);
  const m = matchTransform({ x: 100, y: 50, w: 100, h: 200 }, { x: 200, y: 0, w: 50, h: 100 });
  assert.equal(m.scale, 2); assert.equal(m.x + 225 * 2, 150); assert.equal(m.y + 50 * 2, 150);
  const zc = [0.3, 0.45, 0.5, 0.55, 0.7].map(p => transitionState('zoomContinuation', p, {}, frame));
  assert.ok(zc.every(s => s.a.transform.startsWith('scale') && s.b.transform.startsWith('scale')));
});

test('transition suggestions follow the shot relationship; issues catch monoculture and family sprawl', () => {
  assert.equal(suggestTransitions({ sameSubject: true, alignable: true })[0].name, 'matchCut');
  assert.equal(suggestTransitions({ sameSpace: true, depthChange: true })[0].name, 'focusHandoff');
  assert.equal(suggestTransitions({}).at(-1).name, 'cut');
  assert.ok(transitionIssues(['lightWipe', 'lightWipe', 'lightWipe', 'cut']).some(x => /signature|three times/.test(x)));
  assert.ok(transitionIssues(['wipe', 'textureWipe', 'push', 'lightWipe', 'matchCut']).some(x => /families/.test(x)));
  assert.ok(transitionIssues(['rope occlusion']).some(x => /vocabulary/.test(x)));
  assert.deepEqual(transitionIssues(['cut', 'matchCut', 'cut', 'focusHandoff', 'cut']), []);
});

test('depth: cover clamping keeps plates filling the frame; haze grows with distance; planes are ordered', () => {
  const viewport = { w: 400, h: 400 };
  const layers = [{ id: 'bg', width: 600, height: 600, depth: 0.5, cover: true }, { id: 'hero', width: 100, height: 100, depth: 1 }];
  const r = clampCamera(layers, { x: 5000, y: -5000, zoom: 1 }, viewport);
  assert.equal(r.clamped, true); assert.deepEqual(r.infeasible, []);
  const p = projectLayer(layers[0], r.camera, viewport);
  assert.ok(p.left <= 1e-6 && p.top <= 1e-6 && p.left + 600 * p.scale >= 400 - 1e-6 && p.top + 600 * p.scale >= 400 - 1e-6);
  assert.equal(clampCamera(layers, { x: 10, y: 0 }, viewport).clamped, false);
  assert.deepEqual(clampCamera([{ id: 'small', width: 300, height: 300, depth: 1, cover: true }], {}, viewport).infeasible, ['small']);
  assert.equal(hazeFilter(1), ''); assert.ok(hazeFilter(0.2).includes('contrast'));
  assert.ok(PLANES.foreground > PLANES.near && PLANES.near > PLANES.hero && PLANES.hero > PLANES.mid && PLANES.mid > PLANES.background);
});

test('typography rules: Arabic never splits by letter; direction and reading time are explicit', () => {
  assert.throws(() => units('لحظتك مع الماتشا', 'grapheme'), /never by letter/);
  assert.deepEqual(units('لحظتك مع الماتشا'), ['لحظتك', 'مع', 'الماتشا']);
  assert.deepEqual(units('Café', 'grapheme'), ['C', 'a', 'f', 'é']);
  assert.equal(direction('BALACONBAR لحظتك'), 'ltr'); assert.equal(direction('لحظتك BALACONBAR'), 'rtl'); assert.equal(direction('١٢٣'), 'ltr');
  assert.ok(isArabic('مرحبا')); assert.equal(isArabic('hello'), false);
  assert.equal(readingTime('ab'), 1.2); assert.equal(readingTime('مَرْحَبًا'.repeat(6), { cps: 10, min: 0 }), 3);
});
