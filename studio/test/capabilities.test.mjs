// Capability registry + router (fast: no browser; at most one python launch in detect()).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry, route, MATURITY } from '../lib/capabilities.mjs';
import { validateCraft } from '../lib/creative.mjs';

const reg = loadRegistry();
const fake = (status) => reg.capabilities.map(c => ({ ...c, status: c.maturity === 'LEARN' ? 'reference' : status[c.id] ?? 'ready' }));

test('registry is valid: unique ids, known maturity/profile/layer types, studies exist from EXPERIMENTAL up', () => {
  assert.ok(reg.capabilities.length > 10);
  for (const c of reg.capabilities) assert.ok(MATURITY.includes(c.maturity), c.id);
});

test('router picks the most mature ready engine within limits and names a missing better one', () => {
  const all = fake({});
  const [text, few, many, threeD, sim] = route(['text', 'particles:500', 'particles:20000', '3d', 'simulation'], all);
  assert.equal(text.engine, 'dom-svg');
  assert.equal(few.engine, 'canvas2d', 'a few hundred particles stay on Canvas 2D');
  assert.equal(many.engine, 'pixi', 'twenty thousand go to PixiJS');
  assert.equal(threeD.engine, 'three');
  assert.equal(sim.engine, null); assert.deepEqual(sim.planned, ['blender'], 'planned work is reported, never pretended');
  const noPixi = route(['particles:20000'], fake({ pixi: 'missing' }))[0];
  assert.equal(noPixi.engine, 'three'); assert.ok(noPixi.install.some(s => s.startsWith('pixi')), 'the missing better engine and its setup profile are named');
});

test('craft.layers accepts registry layer types with an optional count and rejects anything else', () => {
  assert.deepEqual(validateCraft({ layers: ['text', 'particles:4000', '3d'] }, 's'), []);
  assert.ok(validateCraft({ layers: ['hologram'] }, 's').length);
  assert.ok(validateCraft({ layers: 'text' }, 's').length);
});
