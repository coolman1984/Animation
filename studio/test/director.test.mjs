// Director's kit for any model (ANY_MODEL.md): plan → critic → eyes. Pure functions only (no browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { plan, arc } from '../studio-engine/lib/director.mjs';
import { critique, PRINCIPLES, principleDoc } from '../studio-engine/lib/critic.mjs';
import { lint } from '../studio-engine/lib/gates.mjs';
import { timeline } from '../studio-engine/lib/events.js';
import { analyze, asciiMap, contrastOf } from '../lib/scenegraph.mjs';
import { STUDIO } from '../lib/capabilities.mjs';

const brand = JSON.parse(readFileSync(join(STUDIO, 'studio-engine/brand/brand.json'), 'utf8'));
const fillAll = (o) => typeof o === 'string' && /^‹.*›$/.test(o) ? 'نص تجريبي' : Array.isArray(o) ? o.map(fillAll) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fillAll(v)])) : o;

test('arc: whole bars that add up, hook first, payoff last', () => {
  for (const d of [8, 9, 10, 15, 20, 30, 45, 60]) { const a = arc(d); assert.equal(a.hook + a.chapters.reduce((s, b) => s + b, 0) + a.payoff, d * 2, `${d} s`); assert.ok(a.hook <= 8 && a.payoff >= 6); }
  assert.throws(() => arc(5.5)); assert.throws(() => arc(6));
});

test('plan: a skeleton with the house structure, one hero chain, and placeholders that block rendering', () => {
  for (const placement of ['reels', 'youtube']) for (const duration of [8, 9, 10, 15, 30]) {
    const { spec, todo } = plan({ placement, duration, brand: 'نور', cta: 'احجز' });
    const tl = timeline(spec);
    assert.equal(tl.duration, duration);
    assert.ok(todo.length > 3);
    assert.ok(lint(spec, brand).errors.some((e) => /placeholder left/.test(e)), 'placeholders must stop the engine');
    const ids = new Set(spec.scenes.flatMap((s) => s.elements.map((e) => e.id)).filter(Boolean));
    for (const s of spec.scenes) for (const e of s.elements) if (e.morphTo) assert.ok(ids.has(e.morphTo), `${s.id} morphTo ${e.morphTo}`);
    const filled = fillAll(spec);
    assert.deepEqual(lint(filled, brand).errors, [], `${placement} ${duration}`);
    const r = critique(filled, brand);
    assert.deepEqual(r.rules.filter((x) => x.status === 'fail').map((x) => x.id), [], `${placement} ${duration}`);
    for (const id of ['hook-2s', 'payoff', 'one-action', 'one-hero', 'settled-end', 'drops', 'music-hook', 'no-template']) assert.equal(r.rules.find((x) => x.id === id).status, 'pass', `${placement} ${duration} ${id}`);
  }
});

test('critic: names the broken house rule with evidence and a fix', () => {
  const bad = { title: 'x', format: 'reel', scenes: [
    { id: 'a', beats: 8, elements: [{ type: 'words', text: 'سطر', size: 120, at: 6 }] },
    { id: 'b', beats: 8, elements: [{ type: 'words', text: 'سطر صغير', size: 28, at: 0 }, { type: 'sparks' }] },
    { id: 'c', beats: 8, elements: [{ type: 'words', text: '٥٠٪ خصم', size: 120, y: 0.8 }] }] };
  const r = critique(bad, brand), get = (id) => r.rules.find((x) => x.id === id);
  assert.equal(get('hook-2s').status, 'fail'); assert.match(get('hook-2s').evidence, /3\.00 s/);
  assert.equal(get('payoff').status, 'fail');
  assert.equal(get('type-size').status, 'fail');
  assert.equal(get('reel-band').status, 'warn');
  assert.equal(get('numbers-sourced').status, 'warn');
  assert.equal(get('taste-guard').status, 'warn');
  assert.ok(r.rules.every((x) => x.source && x.fix));
  assert.ok(r.score < 70);
});

test('eyes: contrast, overlap, safe box, empty frame and the character map', () => {
  assert.equal(contrastOf('rgb(255, 255, 255)', 'rgb(0, 0, 0)'), 21);
  const items = [
    { kind: 'backdrop', color: 'rgb(10, 10, 10)', x0: 0, y0: 0, x1: 100, y1: 200, opacity: 1, z: 0 },
    { kind: 'shape', color: 'rgb(255, 210, 31)', x0: 20, y0: 120, x1: 80, y1: 180, opacity: 1, z: 1 },
    { kind: 'text', text: 'أ', size: 20, color: 'rgb(255, 230, 60)', x0: 30, y0: 140, x1: 70, y1: 160, opacity: 1, z: 2 },
    { kind: 'text', text: 'ب', size: 40, color: 'rgb(255, 255, 255)', x0: 2, y0: 10, x1: 60, y1: 40, opacity: 1, z: 2 },
    { kind: 'text', text: 'ج', size: 40, color: 'rgb(255, 255, 255)', x0: 40, y0: 20, x1: 90, y1: 50, opacity: 1, z: 2 },
  ];
  const a = analyze(items, { w: 100, h: 200, safe: [5, 5, 95, 195] }), rules = a.findings.map((f) => f.rule);
  for (const r of ['contrast', 'overlap', 'safe-area']) assert.ok(rules.includes(r), r);
  assert.equal(analyze([items[0]], { w: 100, h: 200 }).findings[0].rule, 'empty');
  const map = asciiMap(items, { w: 100, h: 200, cols: 10 });
  assert.ok(map.includes('T') && map.includes('#'));
  assert.equal(map.split('\n').length, 10);
});

test('direction rules: the plan moves its camera, breathes before the peak, and copies are caught as "the demo again"', async () => {
  const { plan } = await import('../studio-engine/lib/director.mjs');
  const { spec } = plan({ placement: 'reels', duration: 30, brand: 'نور', cta: 'احجز' });
  const r = critique(fillAll(spec), brand), get = (id) => r.rules.find((x) => x.id === id);
  for (const id of ['camera-variety', 'breath-before-peak', 'not-the-demo']) assert.equal(get(id).status, 'pass', `${id}: ${get(id).evidence}`);
  assert.equal(critique(spec, brand).rules.find((x) => x.id === 'three-structures').status, 'warn');   // placeholders are not a treatment
  const copy = JSON.parse(readFileSync(join(STUDIO, 'studio-engine/films/aixhr/spec.json'), 'utf8')); copy.title = 'my new film';
  assert.equal(critique(copy, brand).rules.find((x) => x.id === 'not-the-demo').status, 'warn');
});

test('styles: every card exists, its fonts are registered in the composer, and the brand merges over the default', async () => {
  const { listStyles, readStyle, brandFor } = await import('../lib/styles.mjs');
  const composer = readFileSync(join(STUDIO, 'lib/composer.html'), 'utf8');
  const rows = listStyles(); assert.ok(rows.length >= 6);
  for (const s of rows) {
    assert.match(readStyle(s.slug), /## 1\. Essence[\s\S]*## 10\. How to build it here/);
    const b = brandFor(s.slug);
    for (const f of Object.values(b.fonts)) assert.ok(composer.includes(`font-family: '${f}'`), `${s.slug}: font ${f} not registered`);
    for (const c of Object.values(b.colors)) assert.match(c, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(b.export?.formats?.reel);
  }
  assert.throws(() => readStyle('nope'));
});

test('quality bar (motion-director prompt): facts traced, edit pace per mode, contrast 4.5:1', async () => {
  const { compositionGaps } = await import('../studio-engine/lib/critic.mjs');
  const spec = { title: 'facts', format: 'youtube', mode: 'product', scenes: [
    { id: 'a', beats: 8, elements: [{ type: 'words', text: 'وفّر ٣٠٪', size: 120, at: 0, out: 6, fact: 'c1' }, { type: 'stack', lines: [{ text: 'احجز دلوقتي', size: 96 }, { text: 'سطر حر', size: 90 }] }] },
    { id: 'b', beats: 12, elements: [{ type: 'words', text: 'وفّر ٣٠٪', size: 120, at: 0, fact: 'nope' }] }] };
  const facts = { claims: [{ id: 'c1', text: 'وفّر ٣٠٪', source: 'https://example.com/offer', sentence: 'وفّر ٣٠٪ على أول طلب' }], copy: ['احجز دلوقتي'] };
  const get = (r, id) => r.rules.find((x) => x.id === id);
  let r = critique(spec, brand, { facts });
  assert.equal(get(r, 'facts-traced').status, 'fail'); assert.match(get(r, 'facts-traced').evidence, /nope/);
  spec.scenes[1].elements[0].fact = 'c1';
  r = critique(spec, brand, { facts });
  assert.equal(get(r, 'facts-traced').status, 'warn'); assert.match(get(r, 'facts-traced').evidence, /سطر حر/);
  assert.equal(get(r, 'numbers-sourced').status, 'pass');
  facts.copy.push('سطر حر'); assert.equal(get(critique(spec, brand, { facts }), 'facts-traced').status, 'pass');
  assert.equal(get(critique(spec, brand, { facts: { claims: [{ id: 'c1', text: 'x' }] } }), 'facts-traced').status, 'fail');   // no source / sentence
  spec.scenes[1].elements[0].text = 'خصم ٩٩٪';   // a valid id does not launder a different number
  r = critique(spec, brand, { facts }); assert.equal(get(r, 'facts-traced').status, 'fail'); assert.match(get(r, 'facts-traced').evidence, /shows 99/);
  spec.scenes[1].elements[0].text = 'خصم 30٪';   // same number in Latin digits, paraphrased words: fine
  assert.equal(get(critique(spec, brand, { facts }), 'facts-traced').status, 'pass');
  assert.equal(get(critique(spec, brand), 'facts-traced'), undefined);   // no facts file: the rule stays out
  // pace: scene b holds 6 s with nothing new → too slow for product (≤ 3.5 s), fine once a morph lands mid-scene
  assert.ok(Math.abs(compositionGaps({ a: 0, b: 6, elements: spec.scenes[1].elements }, 0.5).gap - 6) < 1e-9);
  assert.equal(get(r, 'edit-pace').status, 'warn'); assert.match(get(r, 'edit-pace').evidence, /b holds 6\.0 s/);
  spec.scenes[1].elements.push({ type: 'shape', x: 0.5, y: 0.6, w: 100, h: 100, at: 4, morph: [{ at: 8, w: 200 }] });
  assert.equal(get(critique(spec, brand, { facts }), 'edit-pace').status, 'pass');
  delete spec.mode; assert.equal(get(critique(spec, brand), 'edit-pace'), undefined);
  // Disney's 12: the ones a spec can show are rules with evidence; the rest are a manual checklist, not scored
  const scored = ['slow-in-out', 'anticipation', 'follow-through', 'staging', 'timing', 'arc'];
  const base = critique(fillAll(plan({ placement: 'reels', duration: 15, brand: 'نور' }).spec), brand);
  for (const id of scored) {
    const rule = base.rules.find((x) => x.id === `principle-${id}`);
    assert.ok(rule && rule.evidence && rule.fix, id);
    assert.equal(rule.source, `animation-principles: ${PRINCIPLES.find((p) => p.id === id).skill}`);
  }
  assert.deepEqual(base.principles.map((p) => p.id), PRINCIPLES.filter((p) => !p.rule).map((p) => p.id));
  for (const p of base.principles) assert.ok(p.skill && p.question && !base.rules.some((x) => x.id === `principle-${p.id}`));
  const loose = { title: 'loose', format: 'youtube', bpm: 120, scenes: [
    { id: 'a', beats: 8, elements: [{ type: 'words', text: 'فكرة', size: 120, at: 0 }, { type: 'shape', hero: 'a', x: 0.2, y: 0.2, w: 80, h: 80, at: 0, ease: 'linear' }] },
    { id: 'pay', beats: 8, elements: [{ type: 'shape', hero: 'a', id: 'btn', x: 0.8, y: 0.8, w: 200, h: 80, at: 0, morph: [{ at: 7, dur: 1, w: 400, h: 120, ease: 'none' }] }, { type: 'ribbon', hero: 'b', at: 0 }, { type: 'pill', text: 'ابدأ', size: 64, at: 7 }] },
  ] };
  const looseR = critique(loose, brand), looseGet = (id) => looseR.rules.find((x) => x.id === id);
  assert.equal(looseGet('principle-slow-in-out').status, 'warn');
  assert.match(looseGet('principle-slow-in-out').evidence, /linear/);
  assert.equal(looseGet('principle-follow-through').status, 'warn');
  assert.match(looseGet('principle-follow-through').evidence, /no hold/);
  assert.equal(looseGet('principle-staging').status, 'warn');
  assert.equal(principleDoc('slow-in-out').skill, 'slow-in-out-mastery');
  assert.match(principleDoc('arc-mastery').text, /Arc/);
  const arcFix = base.rules.find((x) => x.id === 'principle-arc').fix;
  assert.match(arcFix, /two morph keys/);
  assert.match(arcFix, /intermediate key/);
  assert.doesNotMatch(arcFix, /"arc"|"via"|set bend/);
  const diagonal = { title: 'diag', format: 'youtube', bpm: 120, scenes: [
    { id: 'a', beats: 4, hold: true, elements: [{ type: 'shape', hero: 'h', x: 0.2, y: 0.2, w: 80, h: 80, at: 0, morph: [{ at: 2, x: 0.8, y: 0.8 }] }] },
  ] };
  const split = { title: 'split', format: 'youtube', bpm: 120, scenes: [
    { id: 'a', beats: 4, hold: true, elements: [{ type: 'shape', hero: 'h', x: 0.2, y: 0.2, w: 80, h: 80, at: 0, morph: [{ at: 1, x: 0.8 }, { at: 2, y: 0.5 }] }] },
  ] };
  assert.equal(get(critique(diagonal, brand), 'principle-arc').status, 'warn');
  assert.match(get(critique(diagonal, brand), 'principle-arc').evidence, /straight diagonal/);
  assert.equal(get(critique(split, brand), 'principle-arc').status, 'pass');
  for (const [film, floor] of [['aixhr', 80], ['demo', 79], ['form-function', 74]]) {
    const spec = JSON.parse(readFileSync(join(STUDIO, 'studio-engine/films', film, 'spec.json'), 'utf8'));
    const bp = join(STUDIO, 'studio-engine/films', film, 'brand.json');
    const own = JSON.parse(readFileSync(existsSync(bp) ? bp : join(STUDIO, 'studio-engine/brand/brand.json'), 'utf8'));
    assert.ok(critique(spec, own).score >= floor, `${film} score dropped below ${floor}`);
  }
  // eyes: 3:1–4.5:1 is a warning, under 3:1 a failure
  const grey = analyze([{ kind: 'backdrop', color: 'rgb(0, 0, 0)', x0: 0, y0: 0, x1: 100, y1: 100, opacity: 1, z: 0 },
    { kind: 'text', text: 'x', size: 40, color: 'rgb(110, 110, 110)', x0: 10, y0: 10, x1: 90, y1: 50, opacity: 1, z: 1 }], { w: 100, h: 100 });
  assert.deepEqual(grey.findings.filter((f) => f.rule === 'contrast').map((f) => f.level), ['warn']);
});
