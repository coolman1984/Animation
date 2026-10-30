// Motion lab (web/lab): Bezier, spring samples, timecode, and real export flags. No browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ease } from '../lib/motion.js';
import {
  HOUSE, cubicBezier, evaluateBezier, solveBezierX, houseFn, sampleSpring, linearEase,
  cssCode, waapiCode, gsapCode, filmCode, smpte, frameState, addMarker, removeMarker, exportCommands,
} from '../web/lab/labcore.mjs';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('bezier endpoints, known ease value, and a monotonic x solve', () => {
  assert.equal(evaluateBezier(0.25, 0.1, 0.25, 1, 0), 0);
  assert.equal(evaluateBezier(0.25, 0.1, 0.25, 1, 1), 1);
  const cssEase = cubicBezier(0.25, 0.1, 0.25, 1);
  near(cssEase(0.5), 0.8024033877399112, 1e-4);
  near(evaluateBezier(0.25, 0.1, 0.25, 1, 0.5), cssEase(0.5));
  const lin = cubicBezier(0, 0, 1, 1);
  for (const p of [0, 0.25, 0.5, 0.75, 1]) near(lin(p), p);
  assert.equal(solveBezierX(0.42, 1, 0), 0);
  assert.equal(solveBezierX(0.42, 1, 1), 1);
  let prev = -1;
  for (let i = 0; i <= 40; i++) {
    const t = solveBezierX(0.25, 0.25, i / 40);
    assert.ok(t >= prev - 1e-9, `solve went backwards at ${i / 40}`);
    prev = t;
  }
  assert.throws(() => cubicBezier(1.5, 0, 0, 1), /x values/);
});

test('house functions match studio/lib/motion.js ease', () => {
  for (const name of Object.keys(HOUSE)) {
    const fn = houseFn(name);
    for (let i = 0; i <= 20; i++) near(fn(i / 20), ease[name](i / 20), 1e-12, name);
  }
  assert.ok(houseFn('outBack')(0.58) > 1.05);
});

test('spring linear() sampling starts at 0 and ends at 1', () => {
  for (const dampingRatio of [0.35, 1, 1.6]) {
    const s = sampleSpring({ dampingRatio, stiffness: 120, steps: 16 });
    assert.equal(s.values[0], 0);
    assert.equal(s.values.at(-1), 1);
    assert.match(s.easing, /^linear\(/);
    assert.ok(s.easing.endsWith('1)'));
    assert.equal(linearEase(s.values)(0), 0);
    assert.equal(linearEase(s.values)(1), 1);
    assert.ok(s.values.every((v) => Number.isFinite(v)));
  }
  const bouncy = sampleSpring({ dampingRatio: 0.3, stiffness: 100, steps: 32 });
  assert.equal(bouncy.values.at(-1), 1);
  assert.ok(Math.max(...bouncy.values) > 1, 'underdamped spring overshoots before it rests');
});

test('code generators contain the curve numbers and only real film helpers', () => {
  const curve = { x1: 0.25, y1: 0.1, x2: 0.58, y2: 1, seconds: 0.8 };
  const css = cssCode(curve);
  assert.match(css, /transition/);
  assert.match(css, /cubic-bezier\(0\.25, 0\.1, 0\.58, 1\)/);
  assert.match(css, /0\.8s/);
  const waapi = waapiCode(curve);
  assert.match(waapi, /cubic-bezier\(0\.25, 0\.1, 0\.58, 1\)/);
  assert.match(waapi, /duration: 800/);
  const gsap = gsapCode({ ...curve, house: 'inOutCubic' });
  assert.match(gsap, /CustomEase/);
  assert.match(gsap, /power2\.inOut/);
  assert.match(gsap, /0\.65|0\.25/);
  const film = filmCode({ x1: 0.65, y1: 0, x2: 0.35, y2: 1, seconds: 0.8, house: 'inOutCubic' });
  assert.match(film, /from '\.\.\/lib\/motion\.js'/);
  assert.match(film, /ease\.inOutCubic/);
  assert.match(film, /prog\(t,/);
  assert.match(film, /track\(/);
  assert.doesNotMatch(film, /ease\.spring|cubicBezier\(/);
  const spring = sampleSpring({ dampingRatio: 1, stiffness: 180, steps: 8 });
  const sprung = cssCode({ seconds: 0.8, spring });
  assert.match(sprung, /linear\(/);
  assert.match(sprung, new RegExp(String(spring.values[1]).replace('.', '\\.')));
  assert.match(filmCode({ seconds: 0.8, spring, x1: 0, y1: 0, x2: 1, y2: 1 }), /does not export a spring/);
});

test('timecode at 30, 25 and 24 fps, and eased progress at a frame', () => {
  assert.equal(smpte(0, 30), '00:00:00:00');
  assert.equal(smpte(29, 30), '00:00:00:29');
  assert.equal(smpte(30, 30), '00:00:01:00');
  assert.equal(smpte(31, 30), '00:00:01:01');
  assert.equal(smpte(30 * 60 + 2, 30), '00:01:00:02');
  assert.equal(smpte(25, 25), '00:00:01:00');
  assert.equal(smpte(49, 25), '00:00:01:24');
  assert.equal(smpte(24, 24), '00:00:01:00');
  assert.equal(smpte(24 * 3600, 24), '01:00:00:00');
  assert.equal(smpte(60, 60), '00:00:01:00');
  const mid = frameState(15, 30, 1, cubicBezier(0, 0, 1, 1));
  assert.equal(mid.smpte, '00:00:00:15');
  near(mid.seconds, 0.5);
  near(mid.eased, 0.5);
  near(frameState(30, 30, 1, cubicBezier(0.25, 0.1, 0.25, 1)).eased, 1);
  assert.deepEqual(addMarker([10], 2), [2, 10]);
  assert.deepEqual(removeMarker([2, 10], 2), [10]);
});

const ALLOWED = new Set(['format', 'fps', 'stage', 'profile', 'range', 'placement', 'duration', 'only', 'workers', 'scene', 'shot']);

function assertFlags(text) {
  for (const flag of text.match(/--[a-z]+/g) || []) assert.ok(ALLOWED.has(flag.slice(2)), `unexpected flag ${flag}`);
}

function textOf(cmd) {
  assert.equal(typeof cmd.engine, 'string');
  assert.equal(typeof cmd.hand, 'string');
  assert.match(cmd.engine, /spec\.json/);
  assert.match(cmd.hand, /film\.js/);
  assert.match(cmd.hand, /studio\.mjs new /);
  assert.doesNotMatch(cmd.engine, /studio\.mjs new /);
  assert.doesNotMatch(cmd.hand, /run\.mjs/);
  return `${cmd.engine}\n${cmd.hand}`;
}

test('command builder uses real flags, and 1:1 is an ffmpeg reframe', () => {
  const reelCmd = exportCommands({ film: 'demo', aspect: '9:16', fps: 30, duration: 8, mode: 'preview' });
  const reel = textOf(reelCmd);
  assert.match(reelCmd.engine, /run\.mjs/);
  assert.match(reelCmd.engine, /studio-engine\/b-demo-reel/);
  assert.doesNotMatch(reelCmd.hand, /studio-engine\/b-demo-reel/);
  assertFlags(reel);
  assert.match(reel, /--format=reel/);
  assert.match(reel, /--stage=preview/);
  assert.match(reel, /--fps=30/);
  assert.match(reel, /--profile=draft/);
  assert.match(reel, /--range=0:8/);
  assert.doesNotMatch(reel, /--aspect|--width|--height|--crf|--preset/);

  const wideCmd = exportCommands({ film: 'demo', aspect: '16:9', fps: 24, duration: 10, mode: 'final' });
  const wide = textOf(wideCmd);
  assert.match(wideCmd.engine, /run\.mjs/);
  assertFlags(wide);
  assert.match(wide, /--format=youtube/);
  assert.match(wide, /--stage=final/);
  assert.match(wide, /--fps=24/);
  assert.match(wide, /studio-engine\/b-demo-youtube/);
  assert.match(wide, /--profile=final/);
  assert.doesNotMatch(wide, /--range/);
  assert.doesNotMatch(wide, /--aspect|--width|--height|--crf|--preset/);

  const squareCmd = exportCommands({ film: 'demo', aspect: '1:1', fps: 30, duration: 8, mode: 'final' });
  const square = textOf(squareCmd);
  assert.doesNotMatch(squareCmd.engine.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).join('\n'), /run\.mjs/);
  assert.match(squareCmd.engine, /ffmpeg/);
  assertFlags(square);
  assert.doesNotMatch(square, /--format/);
  assert.match(square, /reframe/i);
  assert.match(square, /scale=1080:1080/);
  assert.match(square, /crop=1080:1080/);
  assert.match(square, /pad=1080:1080/);
  assert.match(square, /yuv420p/);
  assert.match(square, /faststart/);
  assert.match(square, /--placement=square/);

  for (const text of [reel, wide, square]) {
    for (const line of text.split('\n')) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      if (s.includes('studio.mjs build')) assert.doesNotMatch(s, /--fps|--format/);
      if (s.includes('run.mjs')) {
        assert.match(s, /--format=(reel|youtube)/);
        assert.doesNotMatch(s, /--profile|--range/);
      }
    }
  }
  assert.throws(() => exportCommands({ film: '../etc', aspect: '16:9', fps: 30, duration: 4, mode: 'final' }), /folder/);
  const html = readFileSync(new URL('../web/lab/index.html', import.meta.url), 'utf8');
  assert.match(html, /Studio Engine film \(spec\.json\)/);
  assert.match(html, /Hand-coded film \(film\.js\)/);
  assert.match(html, /id="vline"[^>]*clip-path="url\(#plot-clip\)"/);
  assert.doesNotMatch(html, /<h3>Commands<\/h3>/);
});
