// Pure parts of the web delivery tools: responsive image widths and markup, page text for font subsets, Lighthouse-style scoring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { widthsFor, rewriteImg, pageText } from '../web/lib/optimize.mjs';
import { scoreMetric, totalScore, findings } from '../web/lib/vitals.mjs';

test('widths never upscale and end at the source width', () => {
  assert.deepEqual(widthsFor(2400), [480, 800, 1200, 1600, 2000, 2400]);
  assert.deepEqual(widthsFor(900), [480, 800, 900]);
  assert.deepEqual(widthsFor(5000).at(-1), 2400);
});

test('img becomes a picture with sizes from its width, lazy below the fold only', () => {
  const v = { natural: [2400, 1600], webp: [[480, 'opt/a-480.webp'], [2400, 'opt/a-2400.webp']], avif: [[480, 'opt/a-480.avif']] };
  const below = rewriteImg('<img src="a.jpg" alt="قهوة" width="720" height="480">', v);
  assert.match(below, /^<picture><source type="image\/avif" srcset="opt\/a-480.avif 480w" sizes="\(max-width: 720px\) 100vw, 720px">/);
  assert.match(below, /<img src="a.jpg" alt="قهوة" width="720" height="480" loading="lazy" decoding="async"><\/picture>$/);
  const hero = rewriteImg('<img src="a.jpg" alt="">', v, { first: true });
  assert.match(hero, /width="2400" height="1600"/);
  assert.doesNotMatch(hero, /loading=/);
});

test('page text keeps Arabic, attribute text and entities, drops markup and scripts', () => {
  const t = pageText('<p>قهوة &amp; شاي</p><img alt="Menu"><script>var zzz=1</script>');
  for (const ch of 'قهوةشاي&Menu0٪') assert.ok(t.includes(ch), ch);
  assert.ok(!t.includes('z') && !t.includes('<'));
});

test('scores follow the Lighthouse curves: p10 → 0.9, median → 0.5', () => {
  assert.ok(Math.abs(scoreMetric('lcp', 2500) - 0.9) < 0.01);
  assert.ok(Math.abs(scoreMetric('lcp', 4000) - 0.5) < 0.01);
  assert.ok(Math.abs(scoreMetric('cls', 0.25) - 0.5) < 0.01);
  assert.equal(totalScore({ fcp: 500, lcp: 900, tbt: 0, cls: 0 }), 100);
  assert.ok(totalScore({ fcp: 6000, lcp: 9000, tbt: 2000, cls: 0.6 }) < 10);
});

test('findings flag wide, old-format, unsized images and raw fonts', () => {
  const f = findings({ fcp: 800, lcp: 900, tbt: 0, cls: 0, blocking: [], fonts: [{ file: 'Plex.ttf', bytes: 240000 }],
    images: [{ src: 'a.jpg', natural: 2400, shown: 650, bytes: 300000, sized: false, lazy: false, below: true, modern: false }] });
  const light = Object.fromEntries(f.map((x) => [x.id, x.light]));
  assert.deepEqual([light['image-size'], light['image-format'], light['image-layout'], light.fonts, light.lcp], ['yellow', 'yellow', 'yellow', 'yellow', 'green']);
});
