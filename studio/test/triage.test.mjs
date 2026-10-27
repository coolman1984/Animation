// Frame triage (lib/triage.mjs): code flags the frames, the critic opens only those. One small synthetic clip, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { triage } from '../lib/triage.mjs';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..'), FONT = join(STUDIO, 'assets', 'fonts', 'Archivo.ttf').replace(/\\/g, '/').replace(':', '\\:');
const detector = existsSync(join(process.env.STUDIO_MODELS || join(STUDIO, 'models'), 'ppocr_v3_det.onnx'));
const dir = mkdtempSync(join(tmpdir(), 'triage-')), clip = join(dir, 'clip.mp4');
test.after(() => process.env.KEEP || rmSync(dir, { recursive: true, force: true }));

// 0–2 s moving texture + tiny caption · 2–4.5 s one frozen frame with a pink title and text cut by the left edge
// · 4.5–5.5 s black · 5.5–7 s moving texture. 540×960, 30 fps, a quiet tone (too soft for −14 LUFS).
test.before(() => {
  const bg = (d, seed) => `gradients=s=540x960:speed=0.1:r=30:d=${d}:seed=${seed},drawgrid=w=60:h=60:t=2:c=white@0.35`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', bg(2, 1), '-f', 'lavfi', '-i', bg(2.5, 2), '-f', 'lavfi', '-i', 'color=c=black:s=540x960:r=30:d=1', '-f', 'lavfi', '-i', bg(1.5, 3),
    '-f', 'lavfi', '-i', 'sine=f=440:d=7:sample_rate=48000,volume=0.05', '-filter_complex',
    `[0]drawtext=fontfile='${FONT}':text='tiny caption nobody reads':fontsize=12:fontcolor=white:x=(w-tw)/2:y=450[a];` +
    `[1]trim=end_frame=1,loop=74:1,setpts=N/30/TB,drawtext=fontfile='${FONT}':text='BIG TITLE':fontsize=64:fontcolor=0xFF2E88:x=(w-tw)/2:y=300,drawtext=fontfile='${FONT}':text='Edge cut words':fontsize=40:fontcolor=white:x=-40:y=650[b];` +
    '[a][b][2][3]concat=n=4,format=yuv420p[v]', '-map', '[v]', '-map', '4', '-t', '7', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', clip], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('triage: blank, frozen and delivery are measured in code; the critic gets only flagged frames', () => {
  const r = triage(clip, { format: 'reel', out: join(dir, 'a'), questions: ['Is the title on brand?'] });
  const kinds = new Set(r.moments.map((m) => m.kind)), check = (id) => r.checks.find((c) => c.id === id);
  assert.ok(kinds.has('blank'), 'the black second is flagged');
  const fz = r.moments.find((m) => m.kind === 'frozen'); assert.ok(fz && fz.t >= 1.9 && fz.t <= 2.6 && fz.value >= 2, JSON.stringify(fz));
  assert.equal(check('size').ok, false); assert.equal(check('size').value, '540x960');
  assert.equal(check('loudness').ok, false, 'a −40 LUFS tone is not delivery loudness');
  assert.ok(r.opened < r.sampled / 3, `${r.opened} of ${r.sampled} frames opened`);
  for (const m of r.moments) assert.ok(existsSync(join(r.out, m.file)), m.file);
  const brief = readFileSync(join(r.out, 'CRITIC.md'), 'utf8');
  assert.match(brief, /Open ONLY the \d+ frame/); assert.match(brief, /Is the title on brand\?/); assert.match(brief, /FAIL size/);
});

test('triage: text that is too small, cut by the edge, or off the brand palette', { skip: !detector && 'text detector not installed (python tools/textboxes.py models)' }, () => {
  const r = triage(clip, { format: 'reel', palette: ['#FFFFFF', '#1E6BFF'], out: join(dir, 'b') });
  const at = (kind) => r.moments.filter((m) => m.kind === kind).map((m) => m.t);
  assert.ok(at('text-small').some((t) => t < 2), `tiny caption: ${at('text-small')}`);
  assert.ok(at('text-edge').some((t) => t >= 2 && t < 4.5), `edge text: ${at('text-edge')}`);
  const off = r.moments.find((m) => m.kind === 'off-brand'); assert.ok(off && off.t >= 2 && off.t < 4.5, JSON.stringify(off));
  assert.equal(r.text, 'measured (PP-OCRv3 detector)');
  assert.ok(!r.moments.some((m) => m.kind === 'off-brand' && m.t < 2), 'white type is on brand');
});

test('triage: without the detector the text checks say "not measured", never pass', () => {
  const was = process.env.STUDIO_MODELS; process.env.STUDIO_MODELS = join(dir, 'no-models');
  try { const r = triage(clip, { out: join(dir, 'c') }); assert.match(r.text, /^not measured: /); assert.ok(!r.moments.some((m) => m.kind.startsWith('text'))); assert.match(readFileSync(join(r.out, 'CRITIC.md'), 'utf8'), /Text checks: not measured/); }
  finally { if (was === undefined) delete process.env.STUDIO_MODELS; else process.env.STUDIO_MODELS = was; }
});
