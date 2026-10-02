// Documentation gate: new skills, lib modules and film ledgers must be documented; STATUS must not lag the changelog.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(STUDIO, '..');
const read = p => readFileSync(p, 'utf8');
const studioDocs = readdirSync(STUDIO).filter(f => f.endsWith('.md')).map(f => read(join(STUDIO, f))).join('\n');

test('every project skill is routed in SKILLS.md', () => {
  const skills = readdirSync(join(ROOT, '.claude/skills')).filter(d => existsSync(join(ROOT, '.claude/skills', d, 'SKILL.md')));
  const index = read(join(STUDIO, 'SKILLS.md'));
  const missing = skills.filter(s => !index.includes(s));
  assert.deepEqual(missing, [], `skills missing from studio/SKILLS.md: ${missing.join(', ')}`);
});

test('every lib module is mentioned in a studio doc', () => {
  const libs = readdirSync(join(STUDIO, 'lib')).filter(f => /\.(m?js|html)$/.test(f));
  const missing = libs.filter(f => !studioDocs.includes(f) && !studioDocs.includes(f.replace(/\.(m?js|html)$/, '')));
  assert.deepEqual(missing, [], `lib modules not documented anywhere in studio/*.md: ${missing.join(', ')}`);
});

test('showreel and numbered films with a production plan have a BRIEF and a LEDGER', () => {
  const films = readdirSync(STUDIO).filter(d => /^(film\d|showreel)/.test(d) && statSync(join(STUDIO, d)).isDirectory() && existsSync(join(STUDIO, d, 'film.js')));
  const bad = films.filter(d => d !== 'film1' && (!existsSync(join(STUDIO, d, 'BRIEF.md')) || !existsSync(join(STUDIO, d, 'LEDGER.md'))));
  assert.deepEqual(bad, [], `films lacking BRIEF.md/LEDGER.md: ${bad.join(', ')}`);
});

test('required evolution docs exist and STATUS is not older than the changelog', () => {
  for (const f of ['CHANGELOG.md', 'TECHNIQUES.md', 'CRAFT.md', 'ASSETS.md', 'GEN2.md', 'WORKFLOW.md']) assert.ok(existsSync(join(STUDIO, f)), f);
  const dates = [...read(join(STUDIO, 'CHANGELOG.md')).matchAll(/^## (\d{4}-\d{2}-\d{2})/gm)].map(m => m[1]).sort();
  const status = /Updated: (\d{4}-\d{2}-\d{2})/.exec(read(join(ROOT, 'STATUS.md')))?.[1];
  assert.ok(dates.length, 'CHANGELOG has dated entries');
  assert.ok(status && status >= dates.at(-1), `STATUS.md Updated (${status}) must be >= newest changelog entry (${dates.at(-1)})`);
});

test('every font file in assets has an ASSETS.md row', () => {
  const fonts = readdirSync(join(STUDIO, 'assets/fonts')).filter(f => /\.(ttf|woff2?)$/.test(f));
  const assets = read(join(STUDIO, 'ASSETS.md'));
  const missing = fonts.filter(f => !assets.includes(f) && !assets.includes(f.replace(/-[A-Za-z]+\.ttf$/, '-*.ttf')) && !assets.includes(f.split(/[-.]/)[0]));
  assert.deepEqual(missing, [], `fonts without an ASSETS.md row: ${missing.join(', ')}`);
});
