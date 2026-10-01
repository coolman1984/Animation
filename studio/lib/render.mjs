// Render a composer film: stills for review, or the full video in parallel time slices.
// Each worker = its own Chromium. Frames go as PNG straight into ffmpeg (x264, bt709, yuv420p),
// slices are joined without re-encoding.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import { launch, imageWidth } from './cdp.mjs';
import { serve } from './serve.mjs';

const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function run(cmd, args, { input, quiet = true } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c === 0 ? res({ out, err }) : rej(new Error(`${cmd} exited ${c}\n${err.slice(-2000)}`))));
    if (input) { p.stdin.end(input); }
  });
}

async function openFilm(port, film, { w, h, variant, segments, fadeOut }) {
  const client = await launch({ width: w, height: h, scale: 1 });
  const url = `http://127.0.0.1:${port}/lib/composer.html?film=${encodeURIComponent('/' + relative(STUDIO, film))}&w=${w}&h=${h}&variant=${variant || 'hero'}${segments ? `&segments=${segments}` : ''}${fadeOut ? `&fadeOut=${fadeOut}` : ''}`;
  const errors = [];
  client.on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  await client.goto(url);
  for (let i = 0; i < 100 && !(await client.eval('!!window.ready')); i++) await new Promise((r) => setTimeout(r, 50));
  const info = await client.eval('window.ready');
  if (errors.length) throw new Error('composer error: ' + errors.join('\n'));
  return { client, info, errors };
}

async function frameAt(client, t, frame) {
  await client.eval(`window.renderAt(${t}, ${frame})`);
  const r = await client.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  return Buffer.from(r.data, 'base64');
}

// Stills at given times → PNGs (+ a contact sheet and text boxes for QA).
export async function stills({ film, times, outDir, w = 1080, h = 1350, variant, sheetCols = 5 }) {
  const srv = await serve(STUDIO);
  mkdirSync(outDir, { recursive: true });
  const { client, info } = await openFilm(srv.port, film, { w, h, variant });
  const boxes = {};
  try {
    for (const t of times) {
      const png = await frameAt(client, t, Math.round(t * info.fps));
      if (imageWidth(png) !== w) throw new Error(`frame width ${imageWidth(png)} != ${w}`);
      writeFileSync(join(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`), png);
      boxes[t] = await client.eval('window.textBoxes()');
    }
  } finally { await client.close(); srv.close(); }
  writeFileSync(join(outDir, 'boxes.json'), JSON.stringify(boxes, null, 1));
  const rows = Math.ceil(times.length / sheetCols);
  await run('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', join(outDir, 't*.png'), '-vf', `scale=${Math.round(w / 4)}:-1,tile=${sheetCols}x${rows}:padding=6:color=0x222222`, '-frames:v', '1', join(outDir, 'sheet.png')]);
  return { info, boxes };
}

// Sample the composition's text every `step` seconds: caption timeline + layout checks, read back
// from the DOM (what is really on screen, not what the script intended).
export async function textTimeline({ film, w = 1080, h = 1350, variant, segments, step = 0.1, safe = 24 }) {
  const srv = await serve(STUDIO);
  const { client, info } = await openFilm(srv.port, film, { w, h, variant, segments });
  const spans = new Map(); const issues = [];
  try {
    for (let t = 0; t <= info.duration + 1e-9; t += step) {
      await client.eval(`window.renderAt(${t})`);
      const boxes = await client.eval('window.textBoxes()');
      for (const b of boxes) {
        const key = b.text;
        const s = spans.get(key) || []; const last = s[s.length - 1];
        if (last && Math.abs(last.end - (t - step)) < step / 2) last.end = t; else s.push({ start: t, end: t });
        spans.set(key, s);
        if (b.x0 < safe || b.x1 > w - safe || b.y0 < safe || b.y1 > h - safe) issues.push({ t: +t.toFixed(2), kind: 'outside-safe', text: key, box: [b.x0, b.y0, b.x1, b.y1].map(Math.round) });
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > 4 && oy > 4) issues.push({ t: +t.toFixed(2), kind: 'overlap', text: `${a.text} | ${b.text}` });
      }
    }
  } finally { await client.close(); srv.close(); }
  const lines = [...spans.entries()].flatMap(([text, ss]) => ss.map((s) => ({ text, start: +s.start.toFixed(2), end: +(s.end + step).toFixed(2) }))).sort((a, b) => a.start - b.start);
  return { lines, issues };
}

// Full render in parallel slices → out.mp4 (video only).
export async function video({ film, out, w = 1080, h = 1350, variant, segments, fadeOut, workers = Math.min(4, cpus().length), crf = 14, preset = 'slow', t0 = 0, t1, fps: fpsOverride }) {
  const srv = await serve(STUDIO);
  const tmp = out + '.slices';
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  try {
    const probe = await openFilm(srv.port, film, { w, h, variant, segments, fadeOut });
    const fps = fpsOverride || probe.info.fps; const end = t1 ?? probe.info.duration;
    await probe.client.close();
    const first = Math.round(t0 * fps), last = Math.round(end * fps); // [first, last)
    const total = last - first; const per = Math.ceil(total / workers);
    const started = Date.now(); let done = 0;
    const jobs = Array.from({ length: workers }, async (_, k) => {
      const a = first + k * per, b = Math.min(last, a + per);
      if (a >= b) return null;
      const { client } = await openFilm(srv.port, film, { w, h, variant, segments, fadeOut });
      const file = join(tmp, `s${String(k).padStart(2, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', '-',
        '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-x264-params', 'keyint=60:min-keyint=30', file], { stdio: ['pipe', 'ignore', 'pipe'] });
      let ferr = ''; ff.stderr.on('data', (d) => (ferr += d));
      const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg: ' + ferr)))));
      try {
        for (let f = a; f < b; f++) {
          const png = await frameAt(client, f / fps, f);
          if (f === a && imageWidth(png) !== w) throw new Error(`frame width ${imageWidth(png)} != ${w}`);
          if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
          done++;
          if (done % 60 === 0) {
            const el = (Date.now() - started) / 1000;
            process.stdout.write(`\r  frames ${done}/${total}  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el)).toFixed(0)}s   `);
          }
        }
      } finally { ff.stdin.end(); await client.close(); }
      await closed;
      return file;
    });
    const files = (await Promise.all(jobs)).filter(Boolean);
    process.stdout.write('\n');
    writeFileSync(join(tmp, 'list.txt'), files.map((f) => `file '${f}'`).join('\n'));
    await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', out]);
    rmSync(tmp, { recursive: true, force: true });
    return { frames: total, fps, seconds: (Date.now() - started) / 1000 };
  } finally { srv.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, film, ...rest] = process.argv.slice(2);
  const opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, '').split('=')));
  const filmPath = resolve(film);
  if (cmd === 'stills') {
    const times = opt.times.split(',').map(Number);
    const r = await stills({ film: filmPath, times, outDir: resolve(opt.out), w: +(opt.w || 1080), h: +(opt.h || 1350), variant: opt.variant });
    console.log(JSON.stringify(r.info));
  } else if (cmd === 'video') {
    const r = await video({ film: filmPath, out: resolve(opt.out), w: +(opt.w || 1080), h: +(opt.h || 1350), variant: opt.variant, preset: opt.preset || 'slow', crf: +(opt.crf || 14), t0: +(opt.t0 || 0), t1: opt.t1 ? +opt.t1 : undefined, workers: +(opt.workers || Math.min(4, cpus().length)) });
    console.log(JSON.stringify(r));
  }
}
