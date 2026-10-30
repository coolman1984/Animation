// External-engine adapter for Motion Canvas: config and command only. No Vite, no browser, no render.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEngine, motionCanvasEngine, motionCanvasManual, MOTION_CANVAS_VARIANTS, MOTION_CANVAS_HEADLESS, ENGINE_NOTES } from '../lib/engines.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('motion canvas adapter is an external command that does not render', () => {
  const engine = motionCanvasEngine();
  assert.equal(engine.type, 'external');
  assert.equal(engine.name, 'motion-canvas');
  assert.equal(engine.headless, false);
  assert.equal(MOTION_CANVAS_HEADLESS, false);
  assert.deepEqual(validateEngine(engine), []);
  assert.ok(engine.command.some((a) => a.includes('{out}')));
  assert.ok(engine.command.some((a) => a.includes('{variant}')));
  assert.ok(engine.command[1].endsWith('engines/motion-canvas/render-manual.mjs'));
  assert.deepEqual(MOTION_CANVAS_VARIANTS.landscape, { w: 1920, h: 1080, project: 'src/landscape.js', file: 'landscape.mp4' });
  assert.deepEqual(MOTION_CANVAS_VARIANTS.reel, { w: 1080, h: 1920, project: 'src/reel.js', file: 'reel.mp4' });
  const steps = motionCanvasManual('reel').join('\n');
  assert.match(steps, /no headless render command/);
  assert.match(steps, /1080×1920/);
  assert.match(steps, /press Render/);
  assert.match(steps, /output\/reel\.mp4/);
  assert.match(ENGINE_NOTES['motion-canvas'], /MIT/);
  const src = readFileSync(join(here, '../lib/engines.mjs'), 'utf8');
  assert.doesNotMatch(src, /from ['"]@motion-canvas/);
  assert.doesNotMatch(src, /import\(['"]@motion-canvas/);
});
