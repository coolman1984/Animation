import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mediaProbe } from '../reference/common.mjs';

test('probe duration follows the video stream when the audio runs longer (screen recordings)', { timeout: 60000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'refmedia-'));
  try {
    const f = join(dir, 'longer-audio.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=128x72:rate=30:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', f]);
    assert.ok(existsSync(f));
    const m = await mediaProbe(f);
    assert.ok(m.duration < 1.1, `duration ${m.duration} must be the video length (~1 s), not the container (~1.6 s)`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
