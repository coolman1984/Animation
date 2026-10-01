import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../lib/render.mjs';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
test('one command: draft skips score; review/final mux and gate; unchanged stage outputs reuse', { skip: process.env.STUDIO_RENDER_TEST !== '1', timeout: 120000 }, async () => {
  const name = `pipeline-test-${process.pid}`;
  const film = join(ROOT, name), takes = join(ROOT, 'takes', name), out = join(ROOT, 'out', name);
  mkdirSync(film);
  try {
    writeFileSync(join(film, 'film.js'), "export { default } from '../test/fixture/film.js';\n");
    writeFileSync(join(film, 'config.mjs'), `export default { film: '${name}/film.js', score: '${name}/score.mjs', w: 400, h: 450, fps: 30, lufs: -14, tp: -1.5, shareMB: 27, deliveries: [{ name: 'clip4', duration: 4 }], cacheInputs: ['test/fixture'], holds: [] };`);
    writeFileSync(join(film, 'score.mjs'), `import { mkdirSync, copyFileSync } from 'node:fs'; import { run } from '../lib/render.mjs'; const dir = ${JSON.stringify(takes)}; mkdirSync(dir, { recursive: true }); await run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4:sample_rate=48000', '-ac', '2', '-c:a', 'pcm_f32le', dir + '/mix.wav']); for (const stem of ['music', 'sfx']) copyFileSync(dir + '/mix.wav', dir + '/' + stem + '.wav');`);
    const build = async (...flags) => {
      await run('node', [join(ROOT, 'make.mjs'), name, '--workers=1', ...flags]);
      const take = readdirSync(out).sort().at(-1);
      return JSON.parse(readFileSync(join(out, take, 'measure.json'), 'utf8'));
    };
    const first = await build();
    assert.equal(first.profile, 'draft'); assert.equal(first.final, false);
    assert.deepEqual(first.deliveries.clip4.range, [0, 4]);
    assert.equal(readdirSync(takes).includes('mix.wav'), false);
    const second = await build(); assert.equal(second.deliveries.clip4.cached, true);
    const review = await build('--profile=review', '--range=1:3');
    assert.equal(review.deliveries.clip4.probe.acodec, 'aac'); assert.equal(review.deliveries.clip4.probe.duration, 2);
    assert.ok(review.deliveries.clip4.gates.every(g => g.ok));
    const repeated = await build('--profile=review', '--range=1:3');
    assert.equal(repeated.deliveries.clip4.cached, true);
    const final = await build('--profile=final');
    assert.equal(final.final, true); assert.equal(final.deliveries.clip4.probe.fps, 30);
    assert.ok(final.deliveries.clip4.gates.every(g => g.ok));
  } finally { for (const path of [film, takes, out]) rmSync(path, { recursive: true, force: true }); }
});
