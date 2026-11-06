// Site promo reel (WEB.md "Promo reel of a site", 2026-11-06): film a built site scrolling on a phone screen over CDP and encode a
// vertical 1080×1920 H.264 short that content-factory can post once the owner approves. Scroll position is a pure function of the
// frame number (hold → ease-in-out → hold), so two runs of the same site scroll identically; time-based page animations still run
// in real time, so keep the hero motion scroll-driven (data-story) for an exact repeat.
//   scrollReel({ dir, out, seconds, fps, page }) → { file, frames, seconds, height }
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, screenshot } from '../../lib/cdp.mjs';
import { serve } from '../../lib/serve.mjs';

// 0 → 1 over the frames: hold the first screen 12 %, ease through the page, hold the closing action 14 %
export function scrollCurve(i, n, hold0 = 0.12, hold1 = 0.14) {
  const u = n <= 1 ? 1 : i / (n - 1);
  if (u <= hold0) return 0;
  if (u >= 1 - hold1) return 1;
  const k = (u - hold0) / (1 - hold0 - hold1);
  return k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
}

export async function scrollReel({ dir, out, seconds = 12, fps = 30, page = 'index.html' }) {
  if (!dir || !out) throw new Error('scrollReel needs { dir, out }');
  mkdirSync(dirname(out), { recursive: true });
  const n = Math.max(2, Math.round(seconds * fps)), srv = await serve(dir);
  let client, ff;
  try {
    client = await launch({ width: 360, height: 640, scale: 3 });
    await client.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 3, mobile: true });
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await client.goto(`http://127.0.0.1:${srv.port}/${page}`);
    await client.eval('document.fonts.ready.then(() => new Promise((r) => setTimeout(() => r(true), 600)))');
    const height = await client.eval('document.documentElement.scrollHeight - innerHeight');
    ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = ''; ff.stderr.on('data', (d) => { err += d; });
    const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}: ${err.slice(-300)}`)))));
    for (let i = 0; i < n; i++) {
      const y = Math.round(scrollCurve(i, n) * height);
      await client.eval(`scrollTo({ top: ${y}, behavior: 'instant' }); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))`);
      const jpg = Buffer.from((await screenshot(client, { format: 'jpeg', quality: 92 })).data, 'base64');
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await done;
    return { file: out, frames: n, seconds: n / fps, height };
  } finally { try { ff?.stdin.destroy(); } catch {} await client?.close(); srv.close(); }
}
