// Cover specs and the Satori element tree. No browser. A real PNG runs only when setup covers has been installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STUDIO } from '../lib/capabilities.mjs';
import {
  PRESETS, validateSpec, elementTree, coverDir, hasArabic, coverHtml, cover, coversInstalled, SATORI_ARABIC,
} from '../lib/covers.mjs';

const readSpec = (name) => JSON.parse(readFileSync(join(STUDIO, 'examples/cover-study', name), 'utf8'));

function texts(node, out = []) {
  const children = node?.props?.children;
  if (typeof children === 'string') out.push(children);
  else if (Array.isArray(children)) for (const c of children) texts(c, out);
  return out;
}

function directionOf(node) {
  if (node?.props?.style?.direction) return node.props.style.direction;
  const children = node?.props?.children;
  if (Array.isArray(children)) for (const c of children) { const d = directionOf(c); if (d) return d; }
  return null;
}

test('presets are the cover sizes', () => {
  assert.deepEqual(PRESETS.youtube, { w: 1280, h: 720 });
  assert.deepEqual(PRESETS.reel, { w: 1080, h: 1920 });
  assert.deepEqual(PRESETS.square, { w: 1080, h: 1080 });
  assert.deepEqual(PRESETS['title-card'], { w: 1920, h: 1080 });
});

test('spec validation accepts the study and rejects a broken spec', () => {
  assert.deepEqual(validateSpec(readSpec('youtube.json')), []);
  assert.deepEqual(validateSpec(readSpec('youtube-ar.json')), []);
  const bad = validateSpec({ preset: 'poster', title: '', font: 'Comic Sans', brand: { bg: '#fff', glow: '#ffffff' }, logo: '../secrets' });
  assert.ok(bad.some(e => /preset/.test(e)));
  assert.ok(bad.some(e => /title/.test(e)));
  assert.ok(bad.some(e => /font/.test(e)));
  assert.ok(bad.some(e => /brand\.bg/.test(e)));
  assert.ok(bad.some(e => /unknown brand/.test(e)));
  assert.ok(bad.some(e => /logo/.test(e)));
  assert.ok(validateSpec(null).length);
});

test('element tree keeps each phrase whole and sets rtl for Arabic', () => {
  const latin = readSpec('youtube.json');
  const tree = elementTree(latin);
  assert.equal(coverDir(latin), 'ltr');
  assert.ok(texts(tree).includes('Pixel Plus'));
  assert.equal(texts(tree).filter(t => t === 'Pixel Plus').length, 1);
  assert.equal(directionOf(tree), 'ltr');
  const ar = readSpec('youtube-ar.json');
  assert.equal(hasArabic(ar.title), true);
  assert.equal(coverDir(ar), 'rtl');
  const arTree = elementTree(ar);
  assert.equal(directionOf(arTree), 'rtl');
  assert.ok(texts(arTree).includes('بكسل بلس'));
  assert.ok(texts(arTree).includes('فيلم يُصنع بالكود'));
  assert.ok(!texts(arTree).some(t => t.length === 1), 'Arabic is not split into letters');
  const html = coverHtml(ar);
  assert.match(html, /dir="rtl"/);
  assert.equal(html.split('بكسل بلس').length, 2);
  assert.ok(SATORI_ARABIC === 'ok' || SATORI_ARABIC === 'broken' || SATORI_ARABIC === 'pending');
});

test('satori renders the latin study to a png of the preset size', { skip: !coversInstalled(), timeout: 60000 }, async () => {
  const r = await cover(readSpec('youtube.json'), { renderer: 'satori' });
  assert.equal(r.renderer, 'satori');
  assert.match(r.svg, /<svg/);
  assert.equal(r.png.readUInt32BE(16), 1280);
  assert.equal(r.png.readUInt32BE(20), 720);
});
