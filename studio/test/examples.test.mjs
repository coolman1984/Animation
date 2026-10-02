// Every example study renders in real Chromium, seeks deterministically (forward vs reverse order in
// separate browser sessions give identical pixels), and the legacy films still run on the Gen-2 libs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { launch, settleCapture } from '../lib/cdp.mjs';
import { serve } from '../lib/serve.mjs';
import { GPU_ARGS, textTimeline } from '../lib/render.mjs';
import { cameraDiagnostics } from '../lib/cinema.js';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.STUDIO_RENDER_TEST === '1';
const examples = readdirSync(join(ROOT, 'examples')).filter(d => existsSync(join(ROOT, 'examples', d, 'film.js')));

async function session(server, film, { w, h, gpu }, fn) {
  const client = await launch({ width: w, height: h, extraArgs: gpu ? GPU_ARGS : [] });
  const errors = []; client.on('Runtime.exceptionThrown', p => errors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  try {
    await client.goto(`http://127.0.0.1:${server.port}/lib/composer.html?film=${film}&w=${w}&h=${h}`);
    for (let i = 0; i < 200 && !(await client.eval('!!window.ready')) && !errors.length; i++) await new Promise(r => setTimeout(r, 50));
    assert.deepEqual(errors, [], `${film}: page errors`);
    const info = await client.eval('window.ready'); await settleCapture(client);
    return await fn(client, info, errors);
  } finally { await client.close(); }
}
// Same pixels across sessions/orders. Blur-heavy scenes may differ by ONE 8-bit level on a small share
// of pixels between browser sessions (software raster rounding); that is allowed, anything more is not.
const rgb = b64 => execFileSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { input: Buffer.from(b64, 'base64'), maxBuffer: 1 << 26 });
function sameFrame(a, b, label) {
  if (a === b) return;
  const x = rgb(a), y = rgb(b); let n = 0, max = 0;
  assert.equal(x.length, y.length, `${label}: size differs`);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) { n++; max = Math.max(max, Math.abs(x[i] - y[i])); }
  assert.ok(max <= 1 && n <= x.length * 0.03, `${label}: ${n} channel values differ, max ${max} levels`);
}
const shot = async (client, t) => { await client.eval(`window.renderAt(${t})`); return (await client.send('Page.captureScreenshot', { format: 'png' })).data; };

test('example studies render and seek deterministically in any order', { skip: !enabled, timeout: 300000 }, async () => {
  const server = await serve(ROOT);
  try {
    for (const name of examples) {
      const film = `/examples/${name}/film.js`, opts = { w: 270, h: 338, gpu: name === 'shader-study' };
      const forward = await session(server, film, opts, async (c, info) => {
        const times = [0.4, info.duration * 0.45, info.duration * 0.8, info.duration - 0.05];
        const frames = []; for (const t of times) frames.push(await shot(c, t));
        return { times, frames };
      });
      const reverse = await session(server, film, opts, async (c, _, errors) => {
        const frames = []; for (const t of [...forward.times].reverse()) frames.unshift(await shot(c, t));
        assert.deepEqual(errors, [], `${name}: errors while rendering`);
        return frames;
      });
      for (const [i, t] of forward.times.entries()) sameFrame(reverse[i], forward.frames[i], `${name}: frame at ${t}s between sessions/orders`);
      assert.notEqual(forward.frames[0], forward.frames[2], `${name}: picture must change over time`);
    }
  } finally { server.close(); }
});

test('kinetic type recomposes inside the safe area at 16:9, 1:1, 4:5 and 9:16', { skip: !enabled, timeout: 240000 }, async () => {
  const film = join(ROOT, 'examples/kinetic-type-study/film.js');
  for (const [w, h] of [[640, 360], [480, 480], [432, 540], [360, 640]]) {
    const r = await textTimeline({ film, w, h, step: 0.5, t0: 3, t1: 5, safe: Math.round(Math.min(w, h) * 0.04) });
    assert.deepEqual(r.issues, [], `${w}x${h}: ${JSON.stringify(r.issues[0])}`);
    assert.ok(r.lines.length >= 3, `${w}x${h}: headline, number and latin line all read back`);
  }
});

test('camera study: choreography shows no dead stops or abrupt moves; camera timeline is exported', { skip: !enabled, timeout: 120000 }, async () => {
  const r = await textTimeline({ film: join(ROOT, 'examples/camera-study/film.js'), w: 270, h: 338, step: 0.5 });
  const S = r.camera.samples, dt = S[1][0] - S[0][0];
  const at = t => { const i = Math.min(S.length - 2, Math.max(0, Math.floor(t / dt))), u = t / dt - i, A = S[i], B = S[i + 1]; return { x: A[1] + (B[1] - A[1]) * u, y: A[2] + (B[2] - A[2]) * u, zoom: A[3] + (B[3] - A[3]) * u }; };
  const d = cameraDiagnostics(at, { start: 0.1, end: 4.9, fps: 30, viewport: { w: 270, h: 338 }, cuts: [2.0], continuous: [true] });
  assert.ok(!d.events.some(e => ['dead-stop', 'camera-pumping'].includes(e.kind)), JSON.stringify(d.events));
});

test('legacy films 2–4 still initialise and render on the Gen-2 libraries (placeholder pixels for client photos)', { skip: !enabled, timeout: 300000 }, async () => {
  const server = await serve(ROOT, { placeholder: true });
  try {
    for (const [film, w, h, variant] of [['film2', 1080, 1350, 'hero'], ['film3', 1080, 1350, 'hero'], ['film4', 1080, 1920, 'hero'], ['film4', 1080, 1350, 'hero']]) {
      await session(server, `/${film}/film.js&variant=${variant}`, { w: Math.round(w / 4), h: Math.round(h / 4) }, async (c, info, errors) => {
        for (const t of [0, info.duration * 0.33, info.duration * 0.66, info.duration - 0.1]) await shot(c, t);
        assert.deepEqual(errors, [], `${film}: errors while rendering`);
        assert.ok(info.duration > 10);
      });
    }
  } finally { server.close(); }
});
