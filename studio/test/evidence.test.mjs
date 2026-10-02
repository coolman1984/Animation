// make → review evidence (frames at cuts/copy, strips, crops, notes) and the external-engine adapter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../lib/render.mjs';
import { validateEngine } from '../lib/engines.mjs';
import { reviewSamples, boxContrast } from '../lib/review.mjs';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const enabled = process.env.STUDIO_RENDER_TEST === '1';

test('review sampling covers boundaries, copy, style frames and camera peaks; contrast estimate is sane', () => {
  const plan = { shots: [{ id: 'a', start: 0, end: 2 }, { id: 'b', start: 2, end: 4 }], creative: { styleFrames: { hook: 0.5, proof: 2.5, payoff: 3.5 } } };
  const s = reviewSamples({ duration: 4, fps: 30, plan, text: { lines: [{ text: 'مرحبا', start: 1, end: 2 }] }, camera: { peakSpeedTime: 3.1, events: [] } });
  const has = (t, re) => s.some(x => Math.abs(x.t - t) < 1 / 30 + 1e-9 && x.why.some(w => re.test(w)));
  assert.ok(has(2 - 1 / 30, /frame before cut/) && has(2, /first frame after cut/) && has(1.5, /copy/) && has(2.5, /style frame/) && has(3.1, /peak speed/));
  const black = Buffer.alloc(300), mixed = Buffer.from([...Array(60)].flatMap((_, i) => (i < 30 ? [0, 0, 0] : [255, 255, 255])));
  assert.ok(boxContrast(black) < 1.1); assert.ok(boxContrast(mixed) > 15);
  assert.deepEqual(validateEngine(undefined), []); assert.ok(validateEngine({ type: 'external', command: ['x'] })[0].includes('{out}'));
});

test('review build writes looking evidence; external engine renders silent picture through the same gates', { skip: !enabled, timeout: 240000 }, async () => {
  const name = `evidence-test-${process.pid}`, ext = `external-test-${process.pid}`;
  const dirs = [name, ext].flatMap(n => [join(ROOT, n), join(ROOT, 'takes', n), join(ROOT, 'out', n)]);
  const score = (n) => `import { mkdirSync } from 'node:fs'; import { Bus, writeWav, pad } from '../lib/audio.mjs'; import { placeCues } from '../lib/cues.mjs'; import plan from './production.json' with { type: 'json' };
const dir = ${JSON.stringify(join(ROOT, 'takes'))} + '/${n}'; mkdirSync(dir, { recursive: true });
const music = new Bus(4), sfx = new Bus(4); pad(music, 0, [57, 60, 64], 4, 1.2); placeCues(sfx, plan.cues);
const mix = new Bus(4); music.mixInto(mix); sfx.mixInto(mix); writeWav(dir + '/music.wav', music); writeWav(dir + '/sfx.wav', sfx); writeWav(dir + '/mix.wav', mix);`;
  const production = { version: 1, duration: 4, fps: 30, audience: 'QA', promise: 'p', cta: 'c', direction: 'd', assets: [], sound: { mode: 'original' },
    shots: [{ id: 'one', start: 0, end: 2, purpose: 'a', assetIds: [] }, { id: 'two', start: 2, end: 4, purpose: 'b', assetIds: [] }],
    cues: [{ id: 'hit', t: 2, kind: 'transition', sound: { type: 'softHit', vel: 0.8 } }],
    creative: { styleFrames: { hook: 0.5, proof: 1.5, payoff: 3.5 } } };
  try {
    for (const n of [name, ext]) { mkdirSync(join(ROOT, n)); writeFileSync(join(ROOT, n, 'production.json'), JSON.stringify(production)); writeFileSync(join(ROOT, n, 'score.mjs'), score(n)); }
    writeFileSync(join(ROOT, name, 'film.js'), "export { default } from '../test/fixture/film.js';\n");
    writeFileSync(join(ROOT, name, 'config.mjs'), `export default { film: '${name}/film.js', score: '${name}/score.mjs', production: '${name}/production.json', w: 400, h: 450, fps: 30, lufs: -14, tp: -1.5, shareMB: 27, deliveries: [{ name: 'clip4', duration: 4 }], cacheInputs: ['test/fixture'], holds: [] };`);
    await run('node', [join(ROOT, 'make.mjs'), name, '--profile=review', '--workers=1']);
    const take = join(ROOT, 'out', name, readdirSync(join(ROOT, 'out', name)).sort().at(-1));
    const measure = JSON.parse(readFileSync(join(take, 'measure.json'), 'utf8'));
    const ev = JSON.parse(readFileSync(join(take, 'review-clip4', 'review.json'), 'utf8'));
    assert.ok(existsSync(join(take, 'review-clip4', 'index.html')) && existsSync(join(take, 'review-clip4', 'strips', 'cut-two.jpg')));
    assert.ok(ev.samples.some(s => s.why.some(w => /first frame after cut/.test(w))));
    assert.ok(ev.copy.length === 1 && ev.copy[0].crop && ev.copy[0].contrast > 1, JSON.stringify(ev.copy));
    assert.equal(ev.sync.length, 1); assert.ok(ev.sync[0].ok, `cue sync ${JSON.stringify(ev.sync)}`);
    assert.ok(Array.isArray(measure.deliveries.clip4.review.notes));
    // --shot resolves to the shot's range with half a second of context.
    await run('node', [join(ROOT, 'make.mjs'), name, '--shot=two', '--workers=1']);
    const draft = JSON.parse(readFileSync(join(ROOT, 'out', name, readdirSync(join(ROOT, 'out', name)).sort().at(-1), 'measure.json'), 'utf8'));
    assert.deepEqual(draft.deliveries.clip4.range, [1.5, 4]);
    // External engine: ffmpeg stands in for HyperFrames/Remotion and must honour size/fps/range.
    writeFileSync(join(ROOT, ext, 'config.mjs'), `export default { score: '${ext}/score.mjs', production: '${ext}/production.json', w: 400, h: 450, fps: 30, lufs: -14, tp: -1.5, shareMB: 27,
      engine: { type: 'external', name: 'ffmpeg-testsrc', command: ['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s={w}x{h}:r={fps}:d={duration}', '-pix_fmt', 'yuv420p', '{out}'] },
      deliveries: [{ name: 'clip4', duration: 4 }], holds: [] };`);
    await run('node', [join(ROOT, 'make.mjs'), ext, '--profile=review', '--workers=1']);
    const em = JSON.parse(readFileSync(join(ROOT, 'out', ext, 'take01', 'measure.json'), 'utf8'));
    const g = em.deliveries.clip4.gates;
    assert.ok(g.every(x => x.ok), JSON.stringify(g)); assert.ok(g.some(x => /NOT CHECKED/.test(x.value)), 'text read-back is declared unavailable, not passed silently');
    assert.equal(em.deliveries.clip4.render.engine, 'ffmpeg-testsrc');
  } finally { for (const d of dirs) rmSync(d, { recursive: true, force: true }); }
});
