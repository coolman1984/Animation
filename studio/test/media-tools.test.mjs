// Classic (model-free) routes of the upscale and stems tools: always available, labelled, with a sidecar record.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { upscale, classicFilter } from '../lib/upscale.mjs';
import { stems, classicGraph } from '../lib/stems.mjs';

const dir = mkdtempSync(join(tmpdir(), 'studio-media-'));
const ff = (...a) => assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', ...a]).status, 0);

test('classic upscale doubles the size and records how it was made', async () => {
  const src = join(dir, 'in.png'), out = join(dir, 'out.png');
  ff('-f', 'lavfi', '-i', 'testsrc2=s=160x90', '-frames:v', '1', src);
  const r = await upscale({ input: src, output: out, scale: 2, engine: 'classic' });
  assert.deepEqual(r.size, [320, 180]);
  assert.match(r.method, /not AI/);
  assert.match(JSON.parse(readFileSync(r.sidecar, 'utf8')).rule, /never evidence/);
  assert.match(classicFilter(3), /iw\*3:ih\*3:flags=lanczos/);
});

test('classic stems split a stereo mix into a centre voice and the sides', async () => {
  const src = join(dir, 'mix.wav');
  // centre: 220 Hz in both channels; sides: 1 kHz only on the left
  ff('-f', 'lavfi', '-i', 'sine=f=220:d=1', '-f', 'lavfi', '-i', 'sine=f=1000:d=1', '-filter_complex', '[0][1]amerge=inputs=2,pan=stereo|c0=c0+c1|c1=c0', src);
  const r = await stems({ input: src, outDir: join(dir, 'st'), engine: 'classic' });
  assert.ok(existsSync(join(dir, 'st', r.files.voice)) && existsSync(join(dir, 'st', r.files.rest)));
  assert.match(r.method, /approximate/);
  assert.match(classicGraph(false), /^\[0:a\]pan=mono/);
});
