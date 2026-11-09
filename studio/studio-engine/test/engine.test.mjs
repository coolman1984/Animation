// Studio Engine — fast checks (no browser, < 2 s): the clock, events, lint rules, format overrides, tempo analysis.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timeline, eventsOf } from '../lib/events.js';
import { lint, contrast } from '../lib/gates.mjs';
import { tempo } from '../lib/analyze.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ENGINE = join(HERE, '..');
const brand = JSON.parse(readFileSync(join(ENGINE, 'brand', 'brand.json'), 'utf8'));
const aixhr = JSON.parse(readFileSync(join(ENGINE, 'films', 'aixhr', 'spec.json'), 'utf8'));

test('beats → seconds: AI × HR is 88 beats = 44.000 s at 120 BPM, scenes on bar lines', () => {
  const tl = timeline(aixhr);
  assert.equal(tl.beats, 88); assert.equal(tl.duration, 44);
  for (const s of tl.scenes) assert.equal(s.a0 % 4, 0, `${s.id} starts off a bar line`);
});
test('every element type that moves emits at least one event; events are sorted and inside the film', () => {
  const ev = eventsOf(aixhr), tl = timeline(aixhr);
  assert.ok(ev.length > 25);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].t >= ev[i - 1].t);
  assert.ok(ev.every((e) => e.t >= 0 && e.t <= tl.duration));
  assert.ok(ev.some((e) => e.kind === 'flip') && ev.some((e) => e.kind === 'smash') && ev.some((e) => e.kind === 'wipe'));
});
test('the shipped spec lints clean (no errors)', () => { assert.deepEqual(lint(aixhr, brand).errors, []); });
test('lint catches: unknown element, low contrast, mixed Arabic + Latin words, element after scene end', () => {
  const bad = { bpm: 120, scenes: [{ id: 'x', beats: 4, elements: [
    { type: 'nope' }, { type: 'words', text: 'ظلام', color: '#050505', at: 0 }, { type: 'words', text: 'اكتب في الكومنت I am interested', at: 0 }, { type: 'words', text: 'late', at: 9 }] }] };
  const r = lint(bad, brand);
  assert.ok(r.errors.some((e) => e.includes('unknown element')));
  assert.ok(r.errors.some((e) => e.includes('contrast')));
  assert.ok(r.errors.some((e) => e.includes('after the scene ends')));
  assert.ok(r.warns.some((w) => w.includes('mixes Arabic')));
});
test('contrast ratio matches WCAG reference values', () => {
  assert.equal(+contrast('#FFFFFF', '#000000').toFixed(1), 21);
  assert.ok(contrast('#FFD21F', '#030818') > 10);
});
test('tempo: the studio\'s own scores are detected exactly (96 / 120 BPM, beat 0 at 0 s)', { skip: !existsSync(join(ENGINE, '..', 'takes', 'film8', 'music.wav')) }, () => {
  const a = tempo(join(ENGINE, '..', 'takes', 'film8', 'music.wav'));
  assert.ok(Math.abs(a.bpm - 96) < 0.1, `got ${a.bpm}`); assert.ok(Math.abs(a.offset) < 0.03);
});

test('a spec carrying its ms-rounded duration still times out (audit B1: run.mjs writes one duration everywhere)', () => {
  for (const bpm of [110, 127.84, 133.33]) {
    const spec = { bpm, scenes: [{ id: 'a', beats: 30, elements: [{ type: 'words', text: 'x' }] }] };
    const dur = +timeline(spec).duration.toFixed(3);
    assert.equal(timeline({ ...spec, duration: dur }).duration, dur);
  }
});

test('logo width is judged on the format it plays in (audit B5)', () => {
  const spec = { bpm: 120, scenes: [{ id: 'a', beats: 4, elements: [{ type: 'image', role: 'logo', w: 400, fit: 'contain', src: 'x' }] }] };
  const wide = (fmt) => lint(spec, brand, { format: fmt }).warns.filter((w) => /logo is/.test(w));
  assert.equal(wide('youtube').length, 0);   // 400 of 1920 = 21 %
  assert.equal(wide('reel').length, 1);      // 400 of 1080 = 37 %
  assert.ok(lint({ ...spec, scenes: [{ ...spec.scenes[0], elements: [{ type: 'image', role: 'logo', w: 300, src: 'x' }] }] }, brand).warns.some((w) => /cropped/.test(w)));
});

test('one vocabulary: lint, player modules, catalog, score chords and hooks agree; typos are errors (audit R1)', async () => {
  const V = await import('../lib/vocab.js'), { CHORDS, HOOKS } = await import('../lib/sound.mjs');
  const catalog = JSON.parse(readFileSync(join(ENGINE, 'catalog.json'), 'utf8'));
  const types = Array.isArray(catalog.elements) ? catalog.elements.map((e) => e.type) : Object.keys(catalog.elements);
  const modulesSrc = readFileSync(join(ENGINE, 'lib', 'modules.js'), 'utf8');
  for (const t of V.ELEMENTS) { assert.ok(types.includes(t), `catalog lacks ${t}`); assert.match(modulesSrc, new RegExp(`\\b${t}\\b`), `modules lacks ${t}`); }
  assert.deepEqual([...types].sort(), [...V.ELEMENTS].sort());
  assert.deepEqual(Object.keys(CHORDS).sort(), [...V.CHORD_NAMES].sort());
  assert.deepEqual(Object.keys(HOOKS).sort(), [...V.HOOK_NAMES].sort());
  const bad = { bpm: 120, background: 'rooom', music: { progression: ['Am', 'Fmaj'] }, scenes: [{ id: 'a', beats: 4, music: 'drpo', transition: 'wpie', elements: [{ type: 'words', text: 'x', at: 2, out: 1 }] }] };
  const e = lint(bad, brand).errors.join('\n');
  for (const w of ['rooom', 'Fmaj', 'drpo', 'wpie', 'out (1) must come after']) assert.match(e, new RegExp(w.replace(/[()]/g, '\\$&')));
  for (const f of ['aixhr', 'form-function', 'fable-test', 'demo']) {
    const own = join(ENGINE, 'films', f, 'brand.json'), b = existsSync(own) ? JSON.parse(readFileSync(own, 'utf8')) : brand;
    assert.deepEqual(lint(JSON.parse(readFileSync(join(ENGINE, 'films', f, 'spec.json'), 'utf8')), b).errors, [], f);
  }
});

test('every brand the engine can use is complete; a missing colour is an error (audit R2)', async () => {
  const { validateBrand } = await import('../lib/gates.mjs'), { listStyles, brandFor } = await import('../../lib/styles.mjs');
  assert.deepEqual(validateBrand(brand), []);
  for (const s of listStyles()) assert.deepEqual(validateBrand(brandFor(s.slug)), [], s.slug);
  const own = join(ENGINE, 'films', 'form-function', 'brand.json'); assert.deepEqual(validateBrand(JSON.parse(readFileSync(own, 'utf8'))), []);
  const broken = { ...brand, colors: { ...brand.colors, glow: undefined } };
  assert.match(validateBrand(broken).join(), /colors\.glow/);
  assert.match(lint({ bpm: 120, scenes: [{ id: 'a', beats: 4, elements: [{ type: 'words', text: 'x' }] }] }, broken).errors.join(), /colors\.glow/);
});
