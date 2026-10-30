// Physics bake (fallback always; Rapier when setup physics has installed it) and the anatomy explainer's data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { autoCollider, bake, bakeFallback, hashBake, sample, STEP_120, STEP_240, PREVIEW_LABEL } from '../lib/physics.mjs';
import { poseAt, validateParts, ANATOMY_DURATION } from '../web/explainers/anatomy/anatomy.mjs';

const STUDIO = fileURLToPath(new URL('..', import.meta.url));
const rapier = existsSync(join(STUDIO, 'vendor/node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs'));

const drop = {
  gravity: [0, -9.81, 0], step: STEP_120, duration: 2,
  ground: { hx: 4, hy: 0.2, hz: 4, y: -0.2, friction: 0.5, restitution: 0.2 },
  bodies: [{ id: 'box', type: 'dynamic', shape: 'cuboid', args: [0.25, 0.25, 0.25], position: [0, 1.6, 0], restitution: 0.55, friction: 0.25, canSleep: true }],
};

test('auto colliders turn a mesh into a Rapier shape (cuboid, ball, hull)', () => {
  assert.deepEqual(autoCollider({ kind: 'box', size: [2, 4, 6] }), { shape: 'cuboid', args: [1, 2, 3] });
  assert.deepEqual(autoCollider({ kind: 'sphere', radius: 0.4 }), { shape: 'ball', args: [0.4] });
  assert.equal(autoCollider({ kind: 'hull', points: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]] }).shape, 'convexHull');
  assert.throws(() => autoCollider({ kind: 'capsule' }), /auto collider/);
});

test('fallback bake is deterministic, stays above the ground, and sample() interpolates', () => {
  const a = bakeFallback(drop);
  const b = bakeFallback(drop);
  assert.equal(a.engine, 'fallback');
  assert.equal(a.label, PREVIEW_LABEL);
  assert.equal(hashBake(a), hashBake(b));
  assert.equal(a.hash, b.hash);
  const fine = bakeFallback({ ...drop, step: STEP_240, duration: 0.5 });
  assert.equal(fine.hash, bakeFallback({ ...drop, step: STEP_240, duration: 0.5 }).hash);
  assert.equal(fine.step, STEP_240);
  assert.throws(() => bakeFallback({ ...drop, step: 1 / 60 }), /1\/120/);

  const ys = a.frames.map((f) => f.bodies.box.p[1]);
  assert.ok(Math.min(...ys) >= 0.25 - 1e-6, 'the box does not fall through the ground');
  let i = 8;
  while (i < ys.length - 2 && Math.abs(ys[i + 1] - ys[i]) < 1e-4) i++;
  const mid = sample(a, (i + 0.5) * a.step);
  assert.ok(Math.abs(mid.alpha - 0.5) < 1e-6);
  assert.ok(Math.abs(mid.bodies.box.p[1] - (ys[i] + ys[i + 1]) / 2) < 1e-6, 'position samples are the blend of the two steps');
  assert.ok(ys.some((y, k) => k > 40 && y > ys[k - 1] + 0.01), 'the box bounces');
  assert.equal(a.frames.at(-1).bodies.box.sleep, true);
  assert.equal(sample(a, -1).bodies.box.p[1], ys[0]);
  assert.equal(sample(a, 99).bodies.box.sleep, true);
});

test('forced fallback stays the preview even when Rapier is installed', async () => {
  const clip = await bake(drop, { engine: 'fallback' });
  assert.equal(clip.engine, 'fallback');
  assert.match(clip.label, /preview/);
  assert.equal(clip.hash, bakeFallback(drop).hash);
});

test('Rapier bake hash is stable across two runs', { skip: rapier ? false : 'Rapier is not installed (node studio.mjs setup physics)' }, async () => {
  const spec = { ...drop, duration: 1.2 };
  const a = await bake(spec, { engine: 'rapier' });
  const b = await bake(spec, { engine: 'rapier' });
  assert.equal(a.engine, 'rapier');
  assert.equal(a.label, 'rapier');
  assert.equal(a.hash, b.hash);
  assert.equal(hashBake(a), a.hash);
  const y0 = sample(a, 0).bodies.box.p[1];
  const y1 = sample(a, 0.45).bodies.box.p[1];
  assert.ok(y1 < y0 - 0.2, 'the body has fallen');
  const frame = Math.floor(0.2 / a.step);
  const mid = sample(a, (frame + 0.5) * a.step);
  const p0 = a.frames[frame].bodies.box.p[1], p1 = a.frames[frame + 1].bodies.box.p[1];
  assert.ok(Math.abs(mid.bodies.box.p[1] - (p0 + p1) / 2) < 1e-5);
  assert.notEqual(a.hash, bakeFallback(spec).hash);
});

test('anatomy parts JSON validates, Arabic labels stay whole, and the page is local MIT only', () => {
  const dir = join(STUDIO, 'web/explainers/anatomy');
  const data = validateParts(JSON.parse(readFileSync(join(dir, 'parts.json'), 'utf8')));
  assert.ok(data.parts.length >= 4);
  assert.ok(data.parts.some((p) => /[\u0600-\u06FF]/.test(p.label) && /[\u0600-\u06FF]/.test(p.note)));
  assert.throws(() => validateParts({ parts: [{ id: 'x', label: 'قطعة', note: 'ملاحظة', offset: [0, 1], colour: '#fff' }] }), /offset|colour/);
  const pose = poseAt(5, data.parts.length);
  assert.deepEqual(pose, poseAt(5, data.parts.length));
  assert.ok(pose.explode > 0.7 && pose.selected >= 0 && pose.selected < data.parts.length);
  assert.equal(poseAt(0, data.parts.length).explode, 0);
  assert.ok(ANATOMY_DURATION > 8);

  const names = readdirSync(dir).filter((f) => /\.(html|mjs|json)$/.test(f));
  const src = names.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
  // The SVG namespace is the W3C name of the element, not a request. Anything else with a URL is a remote module.
  const local = src.replaceAll('http://www.w3.org/2000/svg', '');
  assert.equal((local.match(/https?:\/\//g) || []).length, 0, 'no CDN or remote module');
  assert.doesNotMatch(src, /unpkg|jsdelivr|cdnjs|skypack|esm\.sh/);
  const specs = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(specs.includes('three'));
  for (const spec of specs) assert.ok(spec === 'three' || spec.startsWith('.'), spec);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.match(html, /dir="rtl"/);
  assert.match(html, /lang="ar"/);
  assert.match(html, /engine\/three\/build\/three\.module\.js/);
  assert.match(html, /anatomyRender/);
  const threePkg = join(STUDIO, 'vendor/node_modules/three/package.json');
  if (existsSync(threePkg)) assert.equal(JSON.parse(readFileSync(threePkg, 'utf8')).license, 'MIT');
});
