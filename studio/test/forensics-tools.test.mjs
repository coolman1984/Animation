// Precise forensics tools measured against clips whose answers are known (skipped when the optional Python modules are absent).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const has = mods => spawnSync('python3', ['-c', `import ${mods}`]).status === 0;
const near = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m}: ${a} vs ${b} (±${e})`);

test('motion curves: keyframe timing within one frame, easing family and spring parameters recovered', { skip: !has('cv2, numpy, scipy') && 'OpenCV/SciPy not installed', timeout: 180000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'motion-truth-'));
  try {
    const clip = join(dir, 'truth.mp4');
    execFileSync('python3', [join(ROOT, 'test/fixture/motion-truth.py'), clip]);
    execFileSync('python3', [join(ROOT, 'tools/motion_curves.py'), 'track', clip, '--roi', '70,150,60,60', '--out', dir], { stdio: 'pipe' });
    const { moves } = JSON.parse(readFileSync(join(dir, 'track.json'), 'utf8'));
    assert.equal(moves.length, 2, 'two moves');
    const [a, b] = moves, f = 1 / 30;
    near(a.dx, 360, 2, 'move 1 distance');
    near(a.best.keyframeStart, 0.5, f, 'move 1 keyframe start'); near(a.best.keyframeEnd, 1.3, 1.5 * f, 'move 1 keyframe end');
    assert.ok(['out5', 'cubicBezier', 'outExpo'].includes(a.best.model), `move 1 is an ease-out quint (got ${a.best.model})`);
    assert.equal(b.best.model, 'spring', 'move 2 is a spring');
    near(b.best.keyframeStart, 1.8, f, 'spring start'); near(b.best.studioSpring.duration, 0.6, 0.06, 'spring duration'); near(b.best.studioSpring.bounce, 0.3, 0.06, 'spring bounce');
    assert.ok(b.overshootPct > 2, 'overshoot measured');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('audio deep: tempo, key, chord changes and the kick pattern of a known track', { skip: !has('librosa, numpy, scipy, cv2') && 'librosa/OpenCV not installed', timeout: 240000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'audio-truth-'));
  try {
    const { writeTestTrack, TRACK } = await import('./fixture/music-track.mjs');
    const wav = join(dir, 'track.wav'); writeTestTrack(wav);
    execFileSync('python3', [join(ROOT, 'tools/audio_deep.py'), wav, '--out', dir], { stdio: 'pipe' });
    const r = JSON.parse(readFileSync(join(dir, 'audio-deep.json'), 'utf8'));
    near(r.tempoBpm, TRACK.bpm, 1, 'tempo');
    assert.equal(r.key.key, 'A minor', 'key of Am–F–G–Em');
    assert.deepEqual(r.chords.slice(0, 4).map(c => c.chord.replace(/7$/, '')), ['Am', 'F', 'G', 'Em'], 'chord order');
    near(r.chords[1].t, TRACK.offset + 2, 0.55, 'second chord within one beat of bar 2 (these soft pads swell in, so the chroma flips up to a beat late)');
    near(r.downbeats[0] % 2, TRACK.offset, 0.06, 'downbeat phase');
    const lastBar = r.drums.kick.bars.at(-1);
    for (const step of [0, 4, 8, 12]) assert.equal(lastBar[step], 'x', `kick on beat step ${step} after the drop`);
    assert.ok(r.sections.some(s => Math.abs(s.start - TRACK.drop) < 0.2), 'a section starts at the drop');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
