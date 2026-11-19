// Upscale a still (client photo, plate) — 2026-11-06.
// AI route: Real-ESRGAN (xinntao, BSD-3-Clause; weights BSD-3) through its ncnn-Vulkan build: one portable binary, no Python,
// no CUDA, runs on integrated GPUs through Vulkan. Never auto-downloaded (setup profile `upscale` prints the official link);
// set REALESRGAN_BIN or put realesrgan-ncnn-vulkan on PATH. The x4plus model only works at 4×, so 2×/3× = 4× then a Lanczos
// downscale (the usual practice). Classic route (always available, our own): FFmpeg Lanczos + a mild unsharp, labelled.
// Rules (data-honesty): an upscaled image is never evidence (no product proof, no document, no face of a real person shown as
// real); every output gets a sidecar <out>.upscale.json saying how it was made, and the LEDGER records it.
//   upscale({ input, output, scale, engine: 'auto'|'ai'|'classic', model }) → { method, scale, size, sidecar }
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { onPath, isMain } from './platform.mjs';

export const findUpscaler = (env = process.env) => (env.REALESRGAN_BIN && existsSync(env.REALESRGAN_BIN) ? env.REALESRGAN_BIN : onPath('realesrgan-ncnn-vulkan', env));
const sh = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] }); let e = ''; p.stderr.on('data', (d) => (e += d)); p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${basename(cmd)} exited ${c}: ${e.slice(-400)}`)))); });
const size = (f) => spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim().split(',').map(Number);

/** The FFmpeg filter of the classic route (exported for tests). */
export const classicFilter = (scale) => `scale=iw*${scale}:ih*${scale}:flags=lanczos,unsharp=5:5:0.55:5:5:0`;

export async function upscale({ input, output, scale = 2, engine = 'auto', model = 'realesrgan-x4plus' }) {
  if (![2, 3, 4].includes(+scale)) throw new Error('scale must be 2, 3 or 4');
  if (!existsSync(input)) throw new Error(`no such file ${input}`);
  const bin = findUpscaler(), useAi = engine === 'ai' || (engine === 'auto' && bin);
  if (engine === 'ai' && !bin) throw new Error('Real-ESRGAN not found: node studio.mjs setup upscale (download the official ncnn-Vulkan build, set REALESRGAN_BIN)');
  let method;
  if (useAi) {
    const tmp = mkdtempSync(join(tmpdir(), 'studio-upscale-')), x4 = join(tmp, 'x4.png');
    try {
      await sh(bin, ['-i', input, '-o', x4, '-n', model, '-s', '4', '-f', 'png']);
      const [w, h] = size(input);
      await sh('ffmpeg', ['-v', 'error', '-y', '-i', x4, '-vf', `scale=${w * scale}:${h * scale}:flags=lanczos`, '-frames:v', '1', output]);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
    method = `Real-ESRGAN ncnn-Vulkan (${model}) 4× → Lanczos to ${scale}×`;
  } else {
    await sh('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vf', classicFilter(scale), '-frames:v', '1', output]);
    method = `classic FFmpeg Lanczos ${scale}× + unsharp (not AI: no new detail is invented)`;
  }
  const sidecar = output + '.upscale.json';
  writeFileSync(sidecar, JSON.stringify({ source: basename(input), sourceSha256: createHash('sha256').update(readFileSync(input)).digest('hex'), method, scale: +scale,
    rule: 'Upscaled image: never evidence, never a real person shown as real. Record in the film LEDGER / site DESIGN.md.' }, null, 2));
  return { method, scale: +scale, size: size(output), sidecar };
}

if (isMain(import.meta.url)) {
  const [input, output, ...rest] = process.argv.slice(2), opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, '').split('=')));
  console.log(JSON.stringify(await upscale({ input, output, scale: +(opt.scale || 2), engine: opt.engine || 'auto', model: opt.model })));
}
