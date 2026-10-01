import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { video, textTimeline, run } from '../lib/render.mjs';
import { probe } from '../lib/measure.mjs';
import { PROFILES } from '../lib/build-options.mjs';
const enabled = process.env.STUDIO_RENDER_TEST === '1';
const film = fileURLToPath(new URL('./fixture/film.js', import.meta.url));
test('real renderer: non-zero draft range, odd-dimension padding, worker concatenation and authored fps', { skip: !enabled, timeout: 90000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-render-test-'));
  try {
    const a = join(dir, 'draft.mp4'), b = join(dir, 'single.mp4');
    const opts = { ...PROFILES.draft, film, w: 400, h: 450, t0: 2, t1: 3 };
    const r = await video({ ...opts, out: a, workers: 2 });
    assert.equal(r.frames, 15); const p = await probe(a);
    assert.equal(p.width, 200); assert.equal(p.height, 226); assert.equal(p.fps, 15); assert.equal(p.duration, 1);
    await video({ ...opts, out: b, workers: 1 });
    const md5 = async f => (await run('ffmpeg', ['-v', 'error', '-i', f, '-f', 'framemd5', '-'])).out.split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split(',').at(-1).trim());
    const pixel = (file, n, x, y) => execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `select=eq(n\\,${n}),crop=2:2:${x}:${y},format=rgb24`, '-frames:v', '1', '-f', 'rawvideo', '-']);
    assert.equal((await md5(a)).length, 15); assert.equal((await md5(b)).length, 15);
    for (const file of [a, b]) {
      const first = pixel(file, 0, 70, 60), last = pixel(file, 14, 70, 60);
      for (const [i, value] of [100, 60, 120].entries()) assert.ok(Math.abs(first[i] - value) < 9, `first RGB ${[...first.slice(0, 3)]}`);
      for (const [i, value] of [147, 88, 120].entries()) assert.ok(Math.abs(last[i] - value) < 9, `last RGB ${[...last.slice(0, 3)]}`);
    }
    const text = await textTimeline({ film, w: 400, h: 450, t0: 1, t1: 2 });
    assert.equal(text.issues.length, 0); assert.equal(text.lines[0].start, 1); assert.equal(text.lines[0].end, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('review/final profiles keep authored output size/fps and segment source mapping', { skip: !enabled, timeout: 90000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-final-test-'));
  try {
    for (const profile of ['review', 'final']) {
      const out = join(dir, profile + '.mp4');
      const r = await video({ ...PROFILES[profile], film, out, w: 400, h: 450, workers: 2, segments: '2-3,0-1', t0: 0, t1: 0.5 });
      const p = await probe(out); assert.equal(r.frames, 15); assert.equal(p.width, 400); assert.equal(p.height, 450); assert.equal(p.fps, 30); assert.equal(p.duration, 0.5);
      const pixel = execFileSync('ffmpeg', ['-v', 'error', '-i', out, '-frames:v', '1', '-vf', 'crop=2:2:110:120,format=rgb24', '-f', 'rawvideo', '-']);
      for (const [i, value] of [100, 60, 120].entries()) assert.ok(Math.abs(pixel[i] - value) < 9, 'segments must map output 0 to source 2');
    }
    await assert.rejects(video({ film, out: join(dir, 'bad.mp4'), w: 400, h: 450, t0: 3, t1: 2 }), /invalid range/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
