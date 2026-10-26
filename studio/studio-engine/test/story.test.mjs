// Text-to-short (story.mjs + lib/painted.js): line splitting, word-driven composition, and a spec the engine accepts. No browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitLines, storySpec, readSeconds } from '../story.mjs';
import { compose, boilIndex, ridge } from '../lib/painted.js';
import { lint } from '../lib/gates.mjs';
import { timeline } from '../lib/events.js';
const brand = JSON.parse(readFileSync(new URL('../brand/brand.json', import.meta.url), 'utf8'));

test('lines: the author line breaks win; one paragraph splits at sentence ends; long lines at commas', () => {
  assert.deepEqual(splitLines('سطر أول\nسطر تاني'), ['سطر أول', 'سطر تاني']);
  assert.deepEqual(splitLines('He walked. The sea was calm! Was it night?'), ['He walked.', 'The sea was calm!', 'Was it night?']);
  assert.deepEqual(splitLines('مشى طويلًا؟ ثم وصل.'), ['مشى طويلًا؟', 'ثم وصل.']);
  const long = splitLines('one two three four five six seven eight, nine ten eleven twelve thirteen fourteen fifteen sixteen');
  assert.equal(long.length, 2);
  assert.throws(() => splitLines('  '), /no text/);
});

test('composition follows the words in Arabic and English, and the sky carries over', () => {
  const a = compose('مشى وحيدًا على الطريق تحت المطر');
  assert.equal(a.path, true); assert.equal(a.rain, true); assert.equal(a.figure, 'walk'); assert.equal(a.sky, 'storm'); assert.equal(a.sun, null);
  const b = compose('the moon over the sea at night'); assert.equal(b.sky, 'night'); assert.equal(b.sun, 'moon'); assert.equal(b.sea, true);
  assert.equal(compose('and then', { sky: 'dusk' }).sky, 'dusk');
  assert.equal(compose('جبل عالي').mountains, true);
});

test('hand-animation boil: 12 drawings a second, ridges are stable between drawings', () => {
  assert.equal(boilIndex(0), 0); assert.equal(boilIndex(1 / 12 - 1e-3), 0); assert.equal(boilIndex(1 / 12), 1); assert.equal(boilIndex(1), 12);
  assert.equal(ridge(5, 300, 1000, { base: 500, amp: 100 }), ridge(5, 300, 1000, { base: 500, amp: 100 }));
});

test('a story spec passes the engine lint in every format, with readable durations and a calm camera', () => {
  const lines = ['مشى على الطريق.', 'وصل إلى البحر عند الغروب.', 'وفي الليل لمعت النجوم.'];
  for (const format of ['reel', 'youtube', 'square']) {
    const spec = storySpec({ lines, look: 'ink', format, title: 'الطريق' }), L = lint(spec, brand);
    assert.deepEqual(L.errors, [], `${format}: ${L.errors.join('; ')}`);
    assert.equal(spec.shake, 0);
    const tl = timeline(spec); tl.scenes.forEach((s, i) => assert.ok(s.b - s.a >= readSeconds(lines[i]) - 1e-6, `scene ${s.id} shorter than its line`));
  }
  const voiced = storySpec({ lines, durations: [3, 4, 5], voice: 'voice.wav' });
  assert.equal(voiced.audio.voice, 'voice.wav');
  assert.ok(timeline(voiced).scenes[2].b - timeline(voiced).scenes[2].a >= 5.9);
  assert.throws(() => storySpec({ lines, look: 'pastel' }), /look must be one of/);
});
