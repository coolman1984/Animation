#!/usr/bin/env node
// Quick render for painted story shorts: the drawings change 12 times a second, so only those 12 are captured (not 30),
// straight from the page into ONE encode with the score and the narration, then a contact sheet and a loudness reading.
//   node studio-engine/fast.mjs <film> [--format=reel|youtube|square|post] [--fps=24]
// Same spec, same pixels per drawing as run.mjs; it skips the review/final/share encodes and the per-frame text and sync
// gates (run.mjs remains the delivery path with every gate). Set STUDIO_GPU=hardware to paint on the graphics card.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, copyFileSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { openFilm } from '../lib/render.mjs';
import { screenshot } from '../lib/cdp.mjs';
import { serve } from '../lib/serve.mjs';
import { BOIL_FPS } from './lib/painted.js';

const HERE = dirname(fileURLToPath(import.meta.url)), STUDIO = resolve(HERE, '..');
const [film, ...flags] = process.argv.slice(2);
const opt = Object.fromEntries(flags.map((f) => f.replace(/^--/, '').split('=')));
if (!film || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(film)) { console.log('usage: node studio-engine/fast.mjs <film> [--format=reel|youtube|square|post] [--fps=24]'); process.exit(2); }
const say = (m) => console.log(`[fast] ${m}`), started = Date.now();
const sh = (cmd, args, o = {}) => { const r = spawnSync(cmd, args, { cwd: STUDIO, encoding: 'utf8', maxBuffer: 1 << 26, ...o }); if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(' ')} failed:\n${(r.stderr || r.stdout || r.error?.message || '').slice(-1500)}`); return r.stdout; };

// 1. package (lint + generated film), 2. score with the narration
sh('node', ['studio-engine/run.mjs', film, '--stage=check', ...(opt.format ? [`--format=${opt.format}`] : [])], { stdio: 'inherit' });
const spec = JSON.parse(readFileSync(join(HERE, 'films', film, 'spec.json'), 'utf8'));
const brand = JSON.parse(readFileSync(existsSync(join(HERE, 'films', film, 'brand.json')) ? join(HERE, 'films', film, 'brand.json') : join(HERE, 'brand', 'brand.json'), 'utf8'));
const fmtName = opt.format || spec.format || 'youtube';
const fmt = brand.export.formats[fmtName], name = `b-${film}-${fmtName}`, TAKES = join(STUDIO, 'takes', 'studio-engine', name);
say('score and narration…');
sh('node', [join('studio-engine', name, 'score.mjs')]);
const mixWav = join(TAKES, 'mix.wav'); if (!existsSync(mixWav)) throw new Error('the score did not write mix.wav');

// 3. drawings: one capture per drawing, piped into one encode
const fps = +(opt.fps || 24), draw = BOIL_FPS, srv = await serve(STUDIO), OUT = join(STUDIO, 'out', 'studio-engine', name, 'fast'); mkdirSync(OUT, { recursive: true });
const file = join(OUT, `${film}-${fmtName}.mp4`);
const { client, info } = await openFilm(srv.port, join(STUDIO, 'studio-engine', name, 'film.js'), { w: fmt.w, h: fmt.h, gpu: true });
const total = Math.ceil(info.duration * draw);
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(draw), '-i', '-', '-i', mixWav,
  '-map', '0:v', '-map', '1:a', '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000',
  '-c:a', 'aac', '-b:a', '192k', '-t', info.duration.toFixed(3), '-movflags', '+faststart', file], { stdio: ['pipe', 'ignore', 'pipe'] });
let ferr = ''; ff.stderr.on('data', (d) => (ferr += d));
const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg: ' + ferr)))));
try {
  for (let d = 0; d < total; d++) {
    const t = Math.min(info.duration - 1e-3, d / draw + 1e-4);
    await client.eval(`window.renderAt(${t}, ${Math.round(t * info.fps)})`);
    const img = Buffer.from((await screenshot(client, { format: 'jpeg', quality: 92, captureBeyondViewport: false })).data, 'base64');
    if (!ff.stdin.write(img)) await once(ff.stdin, 'drain');
    if (d % 24 === 0) process.stdout.write(`\r[fast] painting ${d}/${total} drawings · ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end(); await closed;
} finally { await client.close(); srv.close(); }
process.stdout.write('\n');

// 4. a look at the real file: one frame per second on a sheet, and the loudness
const sheet = join(OUT, 'sheet.jpg'), cols = 6, n = Math.ceil(info.duration);
sh('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `fps=1,scale=${fmt.w > fmt.h ? 320 : 180}:-2,tile=${cols}x${Math.ceil(n / cols)}:padding=4:color=0x222222`, '-frames:v', '1', sheet]);
const lufs = [...(spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '').matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1];
if (opt.copy) copyFileSync(file, resolve(opt.copy));
say(`${file}\n       ${info.duration.toFixed(1)} s · ${fmt.w}×${fmt.h} · ${total} drawings → ${fps} fps · ${lufs ?? '?'} LUFS · made in ${((Date.now() - started) / 1000).toFixed(0)} s · look: ${sheet}`);
