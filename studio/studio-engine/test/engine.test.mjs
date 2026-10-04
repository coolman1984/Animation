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
