// Text-to-short (story.mjs + lib/painted.js): line splitting, word-driven composition, and a spec the engine accepts. No browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitLines, storySpec, readSeconds } from '../story.mjs';
import { compose, boilIndex, ridge, chunkLine, camera } from '../lib/painted.js';
import { lineSpans, shotsFor } from '../story.mjs';
import { resolveLook } from '../lib/brush.js';
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
  assert.throws(() => storySpec({ lines, look: 'neon' }), /look must be one of/);
});

test('caption chunks: at most five words, balanced, landing on punctuation, "/" forces a break', () => {
  assert.deepEqual(chunkLine('one two three four five six seven'), ['one two three four', 'five six seven']);
  assert.deepEqual(chunkLine('a b c, d e f g h'), ['a b c,', 'd e f g h']);
  assert.deepEqual(chunkLine('قال لي / اصبر'), ['قال لي', 'اصبر']);
  assert.ok(chunkLine('w '.repeat(23).trim()).every((c) => c.split(' ').length <= 5));
});

test('shots and camera: a new picture every ~1.5–3 s, cut on the chunks; moves stay gentle and end where they say', () => {
  assert.equal(shotsFor('short line', 2), 1);
  assert.equal(shotsFor('one two three four five six seven eight nine ten eleven', 6), 3);
  const spec = storySpec({ lines: ['مشى وحيدًا على الطريق تحت المطر، وكان قلبه مليان أسئلة.', 'وصل.'] });
  const shots = spec.scenes[0].elements.filter((e) => e.type === 'painted');
  assert.ok(shots.length >= 2); assert.ok(shots.every((s, i) => !i || s.at > shots[i - 1].at || shots[i - 1].at == null));
  assert.notEqual(shots[0].move, shots[1].move);
  for (const m of ['push', 'pull', 'pan-left', 'pan-right', 'rise', 'fall', 'drift']) { const c0 = camera(m, 0, 1000, 1000), c1 = camera(m, 1, 1000, 1000); assert.ok(c0.s >= 1 && c0.s <= 1.12 && c1.s <= 1.12, m); }
});

test('own recording: each line starts where its first word is said', () => {
  const words = [0.5, 0.9, 1.3, 2.4, 2.8, 3.1, 3.5].map((s2, i) => ({ start: s2, end: s2 + 0.3, w: `w${i}` }));
  assert.deepEqual(lineSpans(words, ['a b c', 'd e f g']).map((x) => x.start), [0.5, 2.4]);
  const spec = storySpec({ lines: ['a b c', 'd e f g'], seconds: Object.assign([2.4, 2.3], { lead: 0.5 }), voice: 'voice.m4a' });
  const tl = timeline(spec); assert.ok(Math.abs(tl.scenes[1].a - 2.4) < 0.2, `line 2 starts at ${tl.scenes[1].a}`);
});

test('looks: named bases, words move the numbers, explicit numbers win', () => {
  assert.equal(resolveLook('oil').mode, 0); assert.equal(resolveLook('watercolour').mode, 1); assert.equal(resolveLook('crayon').mode, 2);
  assert.ok(resolveLook('oil', 'thick bold paint').radius > resolveLook('oil').radius);
  assert.equal(resolveLook('ink', 'comic book').posterize, 6);
  assert.equal(resolveLook({ base: 'oil', radius: 3 }).radius, 3);
});

test('a recording with one extra recognised word does not shift the later lines (audit R13o)', () => {
  const at = (w, t) => ({ w, start: t, end: t + 0.3 });
  const heard = [at('the', 0.5), at('sea', 0.9), at('uh', 1.3), at('was', 1.6), at('calm', 2.0), at('night', 3.0), at('fell', 3.4), at('slowly', 3.8)];
  const s = lineSpans(heard, ['the sea was calm', 'night fell slowly']);
  assert.equal(s[0].start, 0.5); assert.equal(s[1].start, 3.0); assert.equal(s[0].end, 2.3);
  const ar = [at('الْبَحْرُ', 0.2), at('هادئ', 0.7), at('والليل', 1.5), at('طويل', 2.0)];
  assert.deepEqual(lineSpans(ar, ['البحر هادئ', 'والليل طويل']).map((x) => x.start), [0.2, 1.5]);
});
