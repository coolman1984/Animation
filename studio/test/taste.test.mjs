// Taste gate (lib/tastegate.mjs) and storyboard lint (lib/storyboard.mjs): judgments any model can run. Small synthetic clips, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { tasteGate, calibrate } from '../lib/tastegate.mjs';
import { lintStoryboard } from '../lib/storyboard.mjs';

const dir = mkdtempSync(join(tmpdir(), 'taste-'));
const ff = (args) => assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', ...args, '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'ultrafast'], { encoding: 'utf8' }).status, 0);
test.after(() => rmSync(dir, { recursive: true, force: true }));

test('taste gate: motion, slideshow and an empty mid-film frame', () => {
  const moving = join(dir, 'moving.mp4'), still = join(dir, 'still.mp4'), blank = join(dir, 'blank.mp4');
  ff(['-f', 'lavfi', '-i', 'color=c=0x223344:s=320x180:r=24:d=4', '-f', 'lavfi', '-i', 'color=c=white:s=150x140:r=24:d=4', '-filter_complex', "[0][1]overlay=x='mod(t*450,320)-75':y=20", moving]);
  ff(['-f', 'lavfi', '-i', 'color=c=0x223344:s=320x180:r=24:d=4', '-vf', 'drawbox=x=40:y=40:w=120:h=60:c=white:t=fill', still]);
  ff(['-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=24:d=1.5', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=24:d=1.2', '-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=24:d=1.5', '-filter_complex', '[0][1][2]concat=n=3:v=1', blank]);
  const m = tasteGate(moving, { calibration: null }), s = tasteGate(still, { calibration: null }), b = tasteGate(blank, { calibration: null });
  const light = (r, id) => r.lights.find((l) => l.id === id).light;
  assert.ok(m.metrics.fastRatio > 0.5); assert.equal(light(m, 'motion'), 'green');
  assert.equal(s.metrics.fastRatio, 0); assert.equal(light(s, 'motion'), 'yellow', 'uncalibrated motion never goes red');
  assert.equal(light(b, 'blank-frames'), 'red'); assert.ok(b.metrics.blankRunS >= 0.9);
  const cal = { date: 'test', metrics: { fastRatio: { separates: true, red: 0.03, yellow: 0.06, n: 6 } } };
  assert.equal(tasteGate(still, { calibration: cal }).lights.find((l) => l.id === 'motion').light, 'red', 'calibrated on the owner, motion can reject');
});

test('calibration fits only a clean separation of the owner\'s verdicts', () => {
  const row = (verdict, fastRatio, about = 'picture') => ({ verdict, about, metrics: { fastRatio } });
  const ok = calibrate([row('approved', 0.12), row('approved', 0.09), row('approved', 0.2), row('rejected', 0.02), row('rejected', 0.04), row('rejected', 0.9, 'sound')]);
  assert.equal(ok.metrics.fastRatio.separates, true); assert.equal(ok.metrics.fastRatio.red, 0.065);
  assert.equal(calibrate([row('approved', 0.05), row('approved', 0.2), row('approved', 0.3), row('rejected', 0.1), row('rejected', 0.02)]).metrics.fastRatio.separates, false);
});

test('storyboard lint: a thing, an action, short copy, no text-card ends', () => {
  const good = [
    { id: 'hook', start: 0, end: 2.5, subject: 'the yellow dot', action: 'drops onto the problem line', camera: 'locked', copy: 'قهوتك بقت عادية؟', layers: ['text', 'shape'] },
    { id: 'idea', start: 2.5, end: 6, subject: 'the dot', action: 'grows into the roastery window', camera: 'push', copy: 'نور', layers: ['shape', 'text'] },
    { id: 'end', start: 6, end: 10, subject: 'logo', action: 'pops in whole; the dot becomes the button', camera: 'slow push', copy: 'احجز ترابيزتك', layers: ['image', 'text'], hold: true },
  ];
  assert.deepEqual(lintStoryboard(good).issues.filter((x) => x.level === 'red'), []);
  const bad = [
    { id: 'a', start: 0, end: 3, subject: 'title', action: 'appears', camera: 'push', copy: 'كلمة', layers: ['text'] },
    { id: 'b', start: 3, end: 12, subject: 'background', action: '', camera: 'push', copy: 'واحد اتنين تلاتة اربعة خمسة ستة سبعة تمانية تسعة عشرة حداشر اتناشر تلتاشر', layers: ['shape'] },
    { id: 'c', start: 12, end: 14, subject: 'text', action: 'shows', camera: 'zoom in', copy: 'خلاص', layers: ['text'] },
  ];
  const rules = lintStoryboard(bad).issues.map((x) => `${x.shot}:${x.rule}`);
  for (const r of ['a:thing', 'a:action', 'a:first-shot', 'b:thing', 'b:action', 'b:copy', 'b:length', 'c:last-shot', 'c:push-push-push']) assert.ok(rules.includes(r), r);
});
