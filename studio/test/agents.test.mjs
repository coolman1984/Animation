// Any-model door (ANY_MODEL.md): the same rules, skills and MCP tools for every agent. Fast: no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { doorCheck, skillFormat, handshake } from '../lib/agents.mjs';
import { STUDIO } from '../lib/capabilities.mjs';

test('door: AGENTS.md, CLAUDE.md import, skill format, skill mirror and every client config', () => {
  const r = doorCheck();
  assert.deepEqual(r.items.filter((i) => !i.ok).map((i) => `${i.what}: ${i.detail}`), []);
});

test('Agent Skills front matter rules', () => {
  assert.equal(skillFormat('a-b', '---\nname: a-b\ndescription: does x\n---\nbody'), '');
  assert.match(skillFormat('a-b', '---\nname: other\ndescription: x\n---\n'), /must equal the folder/);
  assert.match(skillFormat('A_b', '---\nname: A_b\ndescription: x\n---\n'), /lowercase/);
  assert.match(skillFormat('a', '---\nname: a\n---\n'), /description is required/);
  assert.match(skillFormat('a', 'no front matter'), /missing front matter/);
});

test('MCP: a client with no Claude features can read the method, validate and save a spec', async () => {
  const film = 'zz-mcp-test', dir = join(STUDIO, 'studio-engine', 'films', film);
  rmSync(dir, { recursive: true, force: true });
  const good = { title: 'MCP test', format: 'reel', bpm: 120, scenes: [{ id: 'one', beats: 8, elements: [{ type: 'words', text: 'جرّب', size: 200, at: 0 }] }] };
  const bad = { title: 'bad', scenes: [{ id: 'x', beats: 4, elements: [{ type: 'wordz', text: 'a' }, { type: 'words', text: 'hello', size: 120, at: 9, color: '#030818' }] }] };
  try {
    const h = await handshake({ calls: [['studio_guide', {}], ['engine_catalog', {}], ['spec_save', { film, spec: bad }], ['spec_save', { film: '../etc', spec: good }], ['spec_save', { film, spec: good }], ['spec_check', { film }]] });
    assert.ok(['2025-06-18', '2025-11-25'].includes(h.initialize.result.protocolVersion));
    assert.equal(h.tools.result.tools.length, 9);
    for (const t of h.tools.result.tools) assert.equal(t.inputSchema.type, 'object', t.name);
    const [guide, catalog, refused, escape, saved, checked] = h.calls.map((c) => c.result);
    assert.match(guide.content[0].text, /The film loop/);
    assert.ok(JSON.parse(catalog.content[0].text).elements.words);
    const r = JSON.parse(refused.content[0].text);
    assert.equal(r.saved, false);
    assert.ok(r.issues.some((i) => /unknown element/.test(i.message) && /words/.test(i.fix)));
    assert.ok(r.issues.some((i) => /starts after the scene ends/.test(i.message) && i.scene === 'x' && i.fix));
    assert.ok(r.issues.some((i) => /contrast/.test(i.message) && i.fix));
    assert.equal(escape.isError, true);
    assert.equal(JSON.parse(saved.content[0].text).saved, true);
    assert.ok(existsSync(join(dir, 'spec.json')));
    const c = JSON.parse(checked.content[0].text);
    assert.equal(c.ok, true, JSON.stringify(c.engine));
    assert.equal(c.summary.seconds, 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    for (const f of ['reel', 'youtube']) rmSync(join(STUDIO, 'studio-engine', `b-${film}-${f}`), { recursive: true, force: true });
  }
});
