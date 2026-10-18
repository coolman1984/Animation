// Move library (library/README.md): vendored Motion Prompt + Cinetic data, search, prompts, the seeded technique draw, MCP tools.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from '../lib/movelib.mjs';
import { TOOLS } from '../mcp/server.mjs';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');

test('both libraries are vendored whole, with their MIT licences', () => {
  for (const f of ['motion-prompt/LICENSE', 'cinetic/LICENSE']) assert.match(readFileSync(join(M.LIB, f), 'utf8'), /^MIT License/);
  const { elements, packs } = M.motionPrompt();
  assert.equal(elements.length, 120);
  assert.deepEqual(Object.keys(packs).sort(), ['camera', 'lp', 'motion', 'photo', 'ui']);
  assert.ok(elements.every((e) => e.ar?.name && e.ar?.meaning), 'every element has an Arabic name and meaning');
  assert.equal(M.cinetic().techniques.length, 273);
  for (const p of Object.keys(packs)) assert.match(readFileSync(join(M.LIB, 'motion-prompt/packs', `${p}.js`), 'utf8'), /^\/\* Motion Prompt · pack .* MIT License/);
});

test('pack modules export 24 pure cells each (browser globals stubbed)', async () => {
  globalThis.document ??= { createElement: () => ({ getContext: () => null }) };
  for (const p of Object.keys(M.motionPrompt().packs)) {
    const pack = (await import(`../library/motion-prompt/packs/${p}.js`)).default;
    assert.equal(pack.id, p);
    assert.equal(pack.cells.filter((c) => typeof c === 'function').length, 24, p);
    assert.ok(pack.width > 0 && pack.height > 0 && pack.cycle > 0);
  }
});

test('ids, search, prompt and code', () => {
  for (const x of ['12', '012', '#012', 'https://showheyohtaki.github.io/motion-prompt/#012']) assert.equal(M.mpId(x), '012');
  assert.equal(M.mpId('121'), null);
  assert.equal(M.search('typewriter')[0].id, '#006');
  assert.equal(M.search('انتقال سائل', { library: 'motion-prompt' })[0].id, '#019');
  assert.ok(M.search('velocity handoff', { library: 'cinetic' }).some((r) => r.id === 'tr-velocity-handoff-cut'));
  const p = M.mpPrompt('#012');
  assert.match(p, /Motion Prompt #012/); assert.match(p, /packs\/motion\.js, cells\[11\]/);
  const c = M.mpCode(12);
  assert.match(c, /^\/\/ Motion Prompt #012 · MIT License/); assert.match(c, /CELLS\[11\] =/); assert.doesNotMatch(c, /CELLS\[12\] =/);
});

test('technique draw: seeded, format-shaped, calm never draws high energy, ban-safe by default', () => {
  const a = M.draw({ format: 'launch', seconds: 30, seed: 7 }), b = M.draw({ format: 'launch', seconds: 30, seed: 7 });
  assert.deepEqual(a.picks.map((t) => t.id), b.picks.map((t) => t.id));
  assert.equal(a.picks.length, M.planSize('launch', 30, 'calm'));
  assert.equal(new Set(a.picks.map((t) => t.id)).size, a.picks.length);
  const lib = M.cinetic().techniques;
  for (let seed = 0; seed < 20; seed++) {
    const r = M.draw({ format: 'vertical', energy: 'calm', seed });
    assert.ok(r.picks.every((t) => lib.find((x) => x.id === t.id).energy !== 'high'));
    assert.ok(r.picks.filter((t) => t.role === 'signature').length <= 1);
  }
  const banned = lib.find((t) => t.ban_safe === false);
  assert.equal(M.technique(banned.id).build, banned.ban_safe_variant);
  assert.equal(M.technique(banned.id, new Set(banned.bans)).build, banned.recipe);
  assert.throws(() => M.draw({ format: 'epic' }), /format must be/);
});

test('MCP move tools answer', async () => {
  const run = (name, args) => TOOLS.find((t) => t.name === name).run(args);
  assert.match((await run('moves_search', { query: 'count up' }))[0].text, /#007/);
  const show = JSON.parse((await run('moves_show', { id: '7' }))[0].text);
  assert.equal(show.id, '#007'); assert.match(show.film, /drawCard/);
  assert.equal(JSON.parse((await run('moves_draw', { format: 'sting', seed: 1 }))[0].text).seed, 1);
  assert.ok(existsSync(join(STUDIO, 'lib', 'mpcard.js')));
});
