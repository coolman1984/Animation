import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../lib/render.mjs';
import { probe } from '../lib/measure.mjs';
import { assembleAudio, masterAudio, mux } from '../lib/finish.mjs';
import { prepareMusic } from '../lib/music.mjs';
test('real audio: exact cuts, unsegmented tail fade, recording preparation, silence and short-source rejection', { skip: process.env.STUDIO_RENDER_TEST !== '1', timeout: 60000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-audio-'));
  const src = join(dir, 'source.wav'), out = join(dir, 'out.wav');
  try {
    await run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4:sample_rate=48000', '-c:a', 'pcm_f32le', src]);
    await assembleAudio(src, out, { fadeOut: 1 });
    assert.equal((await probe(out)).duration, 4);
    const rms = (start, duration) => {
      const data = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(start), '-i', out, '-t', String(duration), '-f', 'f32le', '-']);
      let power = 0; for (let i = 0; i < data.length; i += 4) power += data.readFloatLE(i) ** 2;
      return Math.sqrt(power / (data.length / 4));
    };
    assert.ok(rms(3.9, 0.08) < rms(1, 0.08) * 0.15, 'fade must actually lower the tail');
    await assembleAudio(src, out, { segments: '0-1,2-3', fadeOut: 0.2 });
    assert.equal((await probe(out)).duration, 2, 'edge fades must not shorten picture sync');
    await assert.rejects(assembleAudio(src, out, { segments: '0-9' }), /source too short/);
    await assert.rejects(prepareMusic({ src, out, duration: 5 }), /too short/);
    const ready = await prepareMusic({ src, out, duration: 2, start: 1, fadeOut: 0.4 });
    assert.ok(Math.abs(ready.duration - 2) < 0.02); assert.ok(Math.abs(ready.loudness.I + 14) <= 1);
    const silent = join(dir, 'silent.wav');
    await run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '2', silent]);
    await assert.rejects(masterAudio(silent, out), /silent or unmeasurable/);
    const video = join(dir, 'video.mp4');
    await run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=green:s=100x100:d=3', '-c:v', 'libx264', video]);
    await assert.rejects(mux(video, out, join(dir, 'mux.mp4')), /shorter than picture/);
    const mixed = join(dir, 'short-audio.mkv');
    await run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', out, '-c:v', 'copy', '-c:a', 'pcm_f32le', mixed]);
    await assert.rejects(prepareMusic({ src: mixed, out: join(dir, 'bad.wav'), duration: 2.8, fadeOut: 0.2 }), /decoded music source too short/);
    await assert.rejects(assembleAudio(mixed, join(dir, 'cut.wav')), /audio-only input/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
