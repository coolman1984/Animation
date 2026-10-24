// Toolkit (toolkit/README.md): vendored third-party tools are present, licensed, routed, and their offline tools answer. Fast: no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { packages, checkToolkit, selected } from '../lib/toolkit.mjs';
import { shotcraft, shotCard, search } from '../lib/movelib.mjs';
import { listStyles, readStyle } from '../lib/styles.mjs';

test('every vendored package has its files, its licence and a routed wrapper skill', () => {
  const r = checkToolkit();
  assert.deepEqual(r.items.filter((i) => !i.ok).map((i) => i.what), []);
  assert.ok(packages().length >= 8);
});

test('include / exclude patterns pick the right files and never copy caches or .gitignore', () => {
  const rels = ['a/STYLE.md', 'a/demo/x.js', 'b/STYLE.md', 'README.md', 'x/__pycache__/m.pyc', 'x/.gitignore', 'scripts/tests/t.py', 'scripts/s.py'];
  assert.deepEqual(selected({ include: ['README.md', '*/STYLE.md'] }, rels), ['a/STYLE.md', 'b/STYLE.md', 'README.md']);
  assert.deepEqual(selected({ exclude: ['scripts/tests'] }, rels), ['a/STYLE.md', 'a/demo/x.js', 'b/STYLE.md', 'README.md', 'scripts/s.py']);
});

test('shotcraft cards are searchable in English and every card has a one-liner', () => {
  assert.equal(shotcraft().length, 124);
  assert.deepEqual(shotcraft().filter((c) => !c.en).map((c) => c.name), []);
  assert.ok(shotCard('crash-zoom-punch').text.length > 200);
  assert.ok(search('typewriter', { library: 'shotcraft' }).some((x) => x.id === 'typewriter-moves'));
});

test('Lemo-Opuscar style cards list and read as lemo/<slug>', () => {
  const lemo = listStyles({ library: 'lemo' });
  assert.ok(lemo.length >= 59 && lemo.every((s) => s.slug.startsWith('lemo/') && s.essence));
  assert.match(readStyle('lemo/swiss-motion'), /Swiss/);
  assert.ok(listStyles().every((s) => !s.slug.startsWith('lemo/')));
});
