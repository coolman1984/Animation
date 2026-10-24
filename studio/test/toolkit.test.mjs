// Toolkit (toolkit/README.md): vendored third-party tools are present, licensed, routed, and their offline tools answer. Fast: no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { packages, checkToolkit, selected, destOf } from '../lib/toolkit.mjs';
import { shotcraft, shotCard, search } from '../lib/movelib.mjs';
import { listStyles, readStyle } from '../lib/styles.mjs';
import { STUDIO } from '../lib/capabilities.mjs';

const ROOT = join(STUDIO, '..');

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

test('gsap-skills and animation-principles are vendored, licensed and routed', () => {
  for (const name of ['gsap-skills', 'animation-principles']) {
    const p = packages().find((x) => x.name === name);
    assert.ok(p, name);
    assert.equal(p.licence, 'MIT');
    const dir = destOf(p);
    assert.ok(existsSync(join(dir, 'LICENSE')), `${name} licence`);
    assert.match(readFileSync(join(dir, 'LICENSE'), 'utf8'), /MIT License/);
    const skill = readFileSync(join(ROOT, '.claude/skills', p.skill, 'SKILL.md'), 'utf8');
    assert.match(skill, new RegExp(p.skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(skill, /studio\/toolkit\/|library\//);
  }
  const gsap = destOf(packages().find((x) => x.name === 'gsap-skills'));
  assert.equal(readdirSync(gsap).filter((d) => d.startsWith('gsap-') && existsSync(join(gsap, d, 'SKILL.md'))).length, 8);
  assert.ok(existsSync(join(gsap, 'llms.txt')));
  assert.match(readFileSync(join(ROOT, '.claude/skills/gsap-skills/SKILL.md'), 'utf8'), /gsap-core[\s\S]*gsap-timeline[\s\S]*gsap-scrolltrigger[\s\S]*gsap-plugins[\s\S]*gsap-utils[\s\S]*gsap-react[\s\S]*gsap-frameworks[\s\S]*gsap-performance/);
  assert.match(readFileSync(join(ROOT, '.claude/skills/gsap-skills/SKILL.md'), 'utf8'), /not MIT/);
  assert.equal(packages().find((x) => x.name === 'gsap-skills').department, 'web');
  const prin = destOf(packages().find((x) => x.name === 'animation-principles'));
  const folders = readdirSync(prin).filter((d) => existsSync(join(prin, d, 'SKILL.md')));
  assert.equal(folders.length, 12);
  const wrap = readFileSync(join(ROOT, '.claude/skills/animation-principles/SKILL.md'), 'utf8');
  for (const d of folders) assert.match(wrap, new RegExp(d));
  assert.equal(packages().find((x) => x.name === 'animation-principles').department, 'motion');
  assert.ok(checkToolkit().items.filter((i) => /^(gsap-skills|animation-principles):/.test(i.what)).every((i) => i.ok));
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
