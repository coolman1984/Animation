// Render a composer film: stills for review, or the full video in parallel time slices.
// Each worker = its own Chromium. Frames go as PNG straight into ffmpeg (x264, bt709, yuv420p),
// slices are joined without re-encoding.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import { once } from 'node:events';
import { frameRange, PROFILES } from './build-options.mjs';
import { launch, imageWidth, settleCapture, screenshot } from './cdp.mjs';
import { serve } from './serve.mjs';
import { isMain, slash, memoryBudget, plannedWorkers } from './platform.mjs';

const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} cmd @param {string[]} args @param {{ input?: Buffer | string, quiet?: boolean, cwd?: string, env?: Record<string, string> }} [opts] @returns {Promise<{ out: string, err: string }>} */
export function run(cmd, args, { input, quiet = true, cwd, env } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'], ...(cwd ? { cwd } : {}), ...(env ? { env: { ...process.env, ...env } } : {}) });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res({ out, err }) : rej(new Error(`${cmd} exited ${c}: ${args.join(' ').slice(0, 400)}\n${err.slice(-2000)}${out ? `\n--- stdout tail ---\n${out.slice(-1500)}` : ""}`))));
    if (input) { p.stdin.end(input); }
  });
}

// WebGL via SwiftShader (CPU, deterministic) for films that declare gpu: true. Off by default.
// STUDIO_GPU=hardware uses the machine's graphics card instead (much faster for shader passes such as the story brush pass;
// pixels may differ slightly between machines, so reviews and finals of one film should use one mode).
export const GPU_ARGS = process.env.STUDIO_GPU === 'hardware'
  ? ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', `--use-angle=${process.platform === 'win32' ? 'd3d11' : process.platform === 'darwin' ? 'metal' : 'default'}`]
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
// A film's start (module import, init, fonts, images, registered waits) may take this long before it is called stuck.
const READY_TIMEOUT = Math.max(5000, +process.env.STUDIO_READY_TIMEOUT || 90000);
/** @param {number} port @param {string} film @param {{ w: number, h: number, variant?: string, segments?: string, fadeOut?: number, scale?: number, gpu?: boolean }} o */
export async function openFilm(port, film, { w, h, variant, segments, fadeOut, scale = 1, gpu = false }) {
  const client = await launch({ width: w, height: h, scale, extraArgs: gpu ? GPU_ARGS : [] });
  try {
    const query = new URLSearchParams({ film: '/' + slash(relative(STUDIO, film)), w: String(w), h: String(h), variant: variant || 'hero' });
    if (segments) query.set('segments', segments);
    if (fadeOut) query.set('fadeOut', String(fadeOut));
    const errors = [], missing = [];
    client.on('Runtime.exceptionThrown', p => errors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
    // Any file the page asked for and did not get (font, texture, JSON, module chunk) fails the render (audit R4): <img> alone was checked.
    await client.send('Network.enable').catch(() => {});
    client.on('Network.responseReceived', p => { if (p.response?.status >= 400 && !/favicon\.ico$/.test(p.response.url)) missing.push(`${p.response.status} ${p.response.url.replace(/^https?:\/\/127\.0\.0\.1:\d+/, '')}`); });
    client.on('Network.loadingFailed', p => { if (!p.canceled && p.type !== 'Ping') missing.push(`${p.errorText} (${p.type || 'request'})`); });
    await client.goto(`http://127.0.0.1:${port}/lib/composer.html?${query}`);
    // Wait as long as any browser call may take (a heavy init on a slow machine), and say which start phase never finished (audit R3).
    const deadline = Date.now() + READY_TIMEOUT;
    while (!(await client.eval('!!window.ready'))) {
      if (errors.length) throw new Error('composer error: ' + errors.join('\n'));
      if (Date.now() > deadline) throw new Error(`composer did not become ready in ${Math.round(READY_TIMEOUT / 1000)} s; stuck at: ${await client.eval('window.__phase || "page load"').catch(() => '?')}`);
      await new Promise(r => setTimeout(r, 50));
    }
    const info = await client.eval('window.ready');
    if (!info || errors.length) throw new Error('composer failed to become ready: ' + errors.join('\n'));
    if (missing.length) throw new Error(`the film asked for files that did not load:\n  ${[...new Set(missing)].slice(0, 8).join('\n  ')}`);
    const generic = /^(serif|sans-serif|monospace|system-ui|cursive|fantasy|emoji|math|ui-[a-z-]+|-apple-system|inherit|initial)$/i;
    const fallback = (info.usedFonts || []).filter((f) => f && !generic.test(f) && !info.fonts.includes(f));
    if (fallback.length) console.warn(`warning: text asks for font(s) the composer never loaded, shown in a fallback face: ${fallback.join(', ')} (declare them in lib/composer.html)`);
    await settleCapture(client);
    return { client, info, errors };
  } catch (error) { await client.close(); throw error; }
}

async function frameAt(client, t, frame, { format = 'png', quality = 95 } = {}) {
  await client.eval(`window.renderAt(${t}, ${frame})`);
  const r = await screenshot(client, { format, captureBeyondViewport: false,
    ...(format === 'jpeg' ? { quality } : { optimizeForSpeed: true }) });
  return Buffer.from(r.data, 'base64');
}

// Stills at given times → PNGs (+ a contact sheet and text boxes for QA).
export async function stills({ film, times, outDir, w = 1080, h = 1350, variant, sheetCols = 5, gpu = false }) {
  const srv = await serve(STUDIO);
  mkdirSync(outDir, { recursive: true });
  let client, info;
  const boxes = {};
  try {
    ({ client, info } = await openFilm(srv.port, film, { w, h, variant, gpu }));
    for (const t of times) {
      const png = await frameAt(client, t, Math.round(t * info.fps));
      if (imageWidth(png) !== w) throw new Error(`frame width ${imageWidth(png)} != ${w}`);
      writeFileSync(join(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`), png);
      boxes[t] = await client.eval('window.textBoxes()');
    }
  } finally { await client?.close(); srv.close(); }
  writeFileSync(join(outDir, 'boxes.json'), JSON.stringify(boxes, null, 1));
  const rows = Math.ceil(times.length / sheetCols);
  // An explicit list instead of `-pattern_type glob`, which Windows FFmpeg builds do not support.
  const list = join(outDir, 'sheet-list.txt');
  writeFileSync(list, times.map(t => `t${t.toFixed(2).padStart(6, '0')}.png`).map(f => `file '${slash(join(outDir, f)).replaceAll("'", "'\\''")}'`).join('\n'));
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `scale=${Math.round(w / 4)}:-1,tile=${sheetCols}x${rows}:padding=6:color=0x222222`, '-frames:v', '1', join(outDir, 'sheet.png')]);
  return { info, boxes };
}

// Sample the composition's text every `step` seconds: caption timeline + layout checks, read back
// from the DOM (what is really on screen, not what the script intended).
export async function textTimeline({ film, w = 1080, h = 1350, variant, segments, step = 0.1, safe = 24, safeRect, t0 = 0, t1, fadeOut, gpu = false }) {
  const [sx0, sy0, sx1, sy1] = safeRect || [safe, safe, w - safe, h - safe];
  const srv = await serve(STUDIO);
  let client, info, end, camera;
  const spans = new Map(); const issues = [];
  try {
    ({ client, info } = await openFilm(srv.port, film, { w, h, variant, segments, fadeOut, gpu }));
    end = t1 ?? info.duration;
    frameRange(t0, end, info.duration, 1 / step);
    for (let t = t0; t < end - 1e-9; t += step) {
      await client.eval(`window.renderAt(${t})`);
      const boxes = await client.eval('window.textBoxes()');
      const seen = new Map();
      for (const b of boxes) {
        // Two lines with the same words on screen at once are two spans, not one merged box (audit R13b).
        const nth = seen.get(b.text) || 0; seen.set(b.text, nth + 1);
        const key = nth ? `${b.text}\u0000${nth}` : b.text;
        const s = spans.get(key) || []; const last = s[s.length - 1];
        const box = [b.x0, b.y0, b.x1, b.y1].map(Math.round);
        if (last && Math.abs(last.end - (t - step)) < step / 2) { last.end = t; last.box = [Math.min(last.box[0], box[0]), Math.min(last.box[1], box[1]), Math.max(last.box[2], box[2]), Math.max(last.box[3], box[3])]; }
        else s.push({ start: t, end: t, box });
        spans.set(key, s);
        if (b.x0 < sx0 || b.x1 > sx1 || b.y0 < sy0 || b.y1 > sy1) issues.push({ t: +t.toFixed(2), kind: 'outside-safe', text: b.text, box: [b.x0, b.y0, b.x1, b.y1].map(Math.round) });
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > 4 && oy > 4) issues.push({ t: +t.toFixed(2), kind: 'overlap', text: `${a.text} | ${b.text}` });
      }
    }
    // Films exposing camera(t) also get a camera timeline (for motion diagnostics and review sampling).
    if (await client.eval('typeof window.cameraAt === "function"')) {
      const dt = 1 / (2 * info.fps);
      camera = await client.eval(`(() => { const out = []; for (let t = ${t0}; t < ${end} - 1e-9; t += ${dt}) { const c = window.cameraAt(t) || {}; out.push([+t.toFixed(5), c.x ?? 0, c.y ?? 0, c.zoom ?? 1, c.focus ?? 1, c.aperture ?? 0]); } return out; })()`);
    }
  } finally { await client?.close(); srv.close(); }
  const lines = [...spans.entries()].flatMap(([key, ss]) => ss.map((s) => ({ text: key.split('\u0000')[0], start: +s.start.toFixed(2), end: +Math.min(end, s.end + step).toFixed(2), box: s.box }))).sort((a, b) => a.start - b.start);
  return { lines, issues, ...(camera ? { camera: { fields: ['t', 'x', 'y', 'zoom', 'focus', 'aperture'], samples: camera } } : {}) };
}

// RGB frames → bt709 limited-range yuv420p. dither (opt-in, config.dither): convert through 16-bit RGB and 10-bit YUV with
// error diffusion, so slow dark/saturated gradients do not step into visible chroma rings (8-bit RGB→YUV rounding).
// Optional creative grade (config.lut: a .cube, e.g. from tools/ocio_bake.py) runs in RGB before the YUV conversion.
// Windows: forward slashes, escaped drive colon, quoted for spaces.
export const lutFilter = (file) => `lut3d=file='${slash(resolve(file)).replace(/:/g, '\\:')}':interp=tetrahedral`;
/** @param {{ dither?: boolean, lut?: string }} [opts] */
export function encodeFilter({ dither = false, lut } = {}) {
  const pad = (lut ? lutFilter(lut) + ',' : '') + 'pad=ceil(iw/2)*2:ceil(ih/2)*2';
  return dither
    ? `${pad},format=rgb48le,scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int:sws_dither=ed,format=yuv420p10le,scale=flags=accurate_rnd:sws_dither=ed,format=yuv420p`
    : `${pad},scale=out_color_matrix=bt709:out_range=tv`;
}

// Motion blur (config.subframes = S): S captures per output frame, averaged in 16-bit gamma-2.2 "linear" light, one kept per group.
export const shutterFilter = (S, fps) => {
  const lin = (e) => `lutrgb=r='${e}':g='${e}':b='${e}'`;
  return `format=gbrp16le,${lin('pow(val/65535,2.2)*65535')},tmix=frames=${S},${lin('pow(val/65535,1/2.2)*65535')},select='not(mod(n+1\\,${S}))',setpts=N/${fps}/TB,format=rgb48le`;
};

// The frame number a film sees for time t is always its OWN fps grid, whatever the build fps (drafts render at 15).
export const captureFrameNumber = (t, filmFps) => Math.round(t * filmFps);
// Capture times for one output frame: just t, or S sub-frames over half a frame centred on t, clamped inside the film.
export function subframeTimes(t, S, fps, duration) {
  if (S <= 1) return [t];
  return Array.from({ length: S }, (_, i) => Math.min(Math.max(t + (i / (S - 1) - 0.5) * 0.5 / fps, 0), duration - 1e-4));
}

// Fixed-length time slices (about 4 s of output frames): the resume unit. Pure, so it is tested without a browser.
export function planSlices(first, last, fps, seconds = 4) {
  const len = Math.max(1, Math.round(seconds * fps)), out = [];
  for (let a = first; a < last; a += len) out.push({ a, b: Math.min(last, a + len) });
  return out;
}
// A crashed render resumes only when it was the same render: same content key, frames, fps and slice length (never the worker count).
export const canResume = (previous, stamp) => !!stamp.key && !!previous && ['key', 'fps', 'first', 'last', 'slice'].every((k) => previous[k] === stamp[k]);

// Frames actually stored in a slice file (ffprobe packet count): a crashed run leaves complete and partial slices behind.
async function frameCount(file) {
  try { const { out } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file]); return +out.trim() || 0; }
  catch { return 0; }
}

// Full render in parallel slices → out.mp4 (video only).
// workers is a REQUEST: the count actually used is capped by memory headroom (plannedWorkers; STUDIO_WORKERS requests a bounded count).
// resumeKey: content key of this render (make.mjs); when the previous attempt crashed with the same key, its complete
// slices are reused and only the missing ones are rendered. Slices are deleted only after a successful join.
export async function video({ film, out, w = 1080, h = 1350, variant, segments, fadeOut,
  workers = Math.min(4, cpus().length), crf = 14, preset = 'slow', t0 = 0, t1,
  fps: fpsOverride, scale = 1, format = 'png', quality = 95, gpu = false, dither = false, lut, subframes = 1, resumeKey = null, log = (m) => console.log(m), expect = null }) {
  if (!Number.isInteger(workers) || workers < 1 || workers > 16 || !Number.isFinite(scale) || scale <= 0 || scale > 2)
    throw new Error('invalid workers or capture scale');
  if (!['png', 'jpeg'].includes(format)) throw new Error('invalid capture format');
  const srv = await serve(STUDIO);
  const tmp = out + '.slices', keyFile = join(tmp, 'key.json');
  let probe;
  try {
    probe = await openFilm(srv.port, film, { w, h, variant, segments, fadeOut, scale, gpu });
    const info = probe.info;
    // film.js against config.mjs (audit R6): another fps shifts every frame number; a longer film is silently cut to the delivery.
    if (expect?.fps && info.fps !== expect.fps) throw new Error(`film.js says ${info.fps} fps but config.mjs says ${expect.fps} fps: make them the same`);
    if (expect?.duration && info.duration - expect.duration > 1 / info.fps) log(`  note: film.js runs ${info.duration} s; this delivery keeps the first ${expect.duration} s`);
    const fps = fpsOverride ?? info.fps, end = t1 ?? info.duration;
    const { first, last, frames: total } = frameRange(t0, end, info.duration, fps);
    const plan = plannedWorkers({ requested: workers, w, h, scale, gpu }), budget = memoryBudget();
    if (plan.workers !== workers || plan.low) log(`  workers ${workers} → ${plan.workers}: memory headroom ${budget.headroomGB} GB (RAM free ${budget.freeGB}${budget.commitFreeGB !== null ? `, commit free ${budget.commitFreeGB}` : ''} GB), ~${plan.perWorkerGB} GB per worker${plan.low ? '  LOW: close other apps or enlarge the Windows page file' : ''}${plan.forced ? ' (bounded STUDIO_WORKERS request)' : ''}`);
    // Slices are cut by TIME, not by worker count (audit L2): with one worker the film used to be one slice, so a crash at 95 %
    // lost everything, and a different worker count on the next run cancelled the resume. Workers pull slices from a queue.
    const slices = planSlices(first, last, fps);
    const count = Math.min(plan.workers, slices.length);
    // Resume only when the previous attempt was the same render (same content key, frames, fps and slice length).
    const stamp = { key: resumeKey, fps, first, last, slice: slices[0].b - slices[0].a };
    let previous = null; try { previous = JSON.parse(readFileSync(keyFile, 'utf8')); } catch {}
    const resume = canResume(previous, stamp);
    if (!resume) rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true }); writeFileSync(keyFile, JSON.stringify(stamp));
    const SUB = Math.max(1, Math.round(subframes));
    const captureWidth = Math.round(w * scale), captureHeight = Math.round(h * scale);
    const outputWidth = Math.ceil(captureWidth / 2) * 2, outputHeight = Math.ceil(captureHeight / 2) * 2;
    const started = Date.now(); let done = 0, reused = 0;
    const open = () => openFilm(srv.port, film, { w, h, variant, segments, fadeOut, scale, gpu });
    const queue = slices.map((sl, k) => ({ ...sl, k, file: join(tmp, `s${String(k).padStart(3, '0')}.mp4`) }));
    // One slice = one encoder fed by this worker's page. `page` is the worker's state, so a reopened page stays with the worker.
    const encodeSlice = async (page, { a, b, k, file }) => {
      let reopened = 0;
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', format === 'png' ? 'png' : 'mjpeg', '-framerate', String(fps * SUB), '-i', '-',
        '-c:v', 'libx264', '-threads', '1', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-vf', (SUB > 1 ? shutterFilter(SUB, fps) + ',' : '') + encodeFilter({ dither, lut }), ...(SUB > 1 ? ['-r', String(fps)] : []),
        '-x264-params', 'keyint=60:min-keyint=30',
        // Exact timescales: with B-frames the slice's edit list is written in the MOVIE timescale (1000 by default), so each
        // slice lost up to 1 ms and every worker join shifted later frames (FFmpeg 9: 15 frames measured 30.039 fps).
        '-video_track_timescale', String(Math.round(fps) * 1000), '-movie_timescale', String(Math.round(fps) * 1000), file], { stdio: ['pipe', 'ignore', 'pipe'] });
      let ferr = ''; ff.stderr.on('data', d => (ferr += d));
      ff.stdin.on('error', () => {});
      const closed = new Promise((res, rej) => {
        ff.on('error', rej);
        ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg: ' + ferr)));
      });
      closed.catch(() => {}); // Capture failures still await/reap the encoder below.
      // One capture path for every frame and sub-frame (audit B6): the film's own frame number, stall recovery, width gate.
      // Sub-frames of one output frame share its frame number, so per-frame grain does not smear into the average.
      const capture = async (ts, frameNo) => {
        try { return await frameAt(page.client, ts, frameNo, { format, quality }); }
        catch (error) {
          // A page that has rendered hundreds of heavy 3D frames can stop answering captures (film 11, headless software mode);
          // frames are pure functions of t, so a fresh page continues the slice with identical pixels.
          if (!/did not answer/.test(error.message) || reopened >= 3) throw error;
          reopened++; log(`\n  slice ${k}: capture stalled at ${ts.toFixed(3)} s; reopening the page (${reopened}/3)`);
          await page.client.close().catch(() => {}); ({ client: page.client } = await open());
          return frameAt(page.client, ts, frameNo, { format, quality });
        }
      };
      try {
        for (let f = a; f < b; f++) {
          const t = f / fps;
          // A lower preview fps must keep the film's authored frame-dependent motion.
          // 180° shutter: SUB captures spread over half a frame centred on t; ffmpeg averages them in (approximate) linear light.
          const frameNo = captureFrameNumber(t, info.fps);
          for (const ts of subframeTimes(t, SUB, fps, info.duration)) {
            const image = await capture(ts, frameNo);
            if (!page.checked) { if (imageWidth(image) !== captureWidth) throw new Error(`frame width ${imageWidth(image)} != ${captureWidth}`); page.checked = true; }
            if (ff.stdin.destroyed) throw new Error('encoder stopped: ' + ferr);
            if (!ff.stdin.write(image)) await once(ff.stdin, 'drain');
          }
          done++;
          if (done % 60 === 0) {
            const el = (Date.now() - started) / 1000;
            process.stdout.write(`\r  frames ${done}/${total}  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el)).toFixed(0)}s   `);
          }
        }
        ff.stdin.end(); await closed;
      } catch (error) { ff.kill('SIGKILL'); await closed.catch(() => {}); rmSync(file, { force: true }); throw error; }
    };
    let probeClient = probe.client, failed = null;
    const worker = async () => {
      // The probe's page is reused by the first worker (one browser start fewer); later workers open their own.
      const page = { client: null, checked: false };
      try {
        while (!failed && queue.length) {
          const sl = queue.shift();
          if (resume && existsSync(sl.file)) {
            const n = await frameCount(sl.file);
            if (n === sl.b - sl.a) { done += n; reused += n; continue; }
            rmSync(sl.file, { force: true });
          }
          if (!page.client) { if (probeClient) { page.client = probeClient; probeClient = null; } else ({ client: page.client } = await open()); }
          await encodeSlice(page, sl);
        }
      } catch (error) { failed ||= error; throw error; }
      finally { await page.client?.close(); }
    };
    // Reap all workers before closing the server or deleting their slices.
    const results = await Promise.allSettled(Array.from({ length: count }, worker));
    await probeClient?.close();
    const rejected = results.find(r => r.status === 'rejected');
    if (rejected) throw rejected.reason;
    if (reused) log(`  ${reused} frames reused from a crashed run`);
    const files = slices.map((_, k) => join(tmp, `s${String(k).padStart(3, '0')}.mp4`));
    process.stdout.write('\n');
    writeFileSync(join(tmp, 'list.txt'), files.map(f => `file '${slash(f).replaceAll("'", "'\\''")}'`).join('\n'));
    await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', out]);
    rmSync(tmp, { recursive: true, force: true }); // only after a successful join: a failed run keeps its slices for resume
    return { frames: total, fps, width: outputWidth, height: outputHeight, range: [first / fps, last / fps], seconds: (Date.now() - started) / 1000, workers: count, workersRequested: workers, reusedFrames: reused, headroomGB: budget.headroomGB };
  } finally { await probe?.client.close().catch(() => {}); srv.close(); }
}

if (isMain(import.meta.url)) {
  const [cmd, film, ...rest] = process.argv.slice(2);
  const opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, '').split('=')));
  const filmPath = resolve(film);
  if (cmd === 'stills') {
    const times = opt.times.split(',').map(Number);
    const r = await stills({ film: filmPath, times, outDir: resolve(opt.out), w: +(opt.w || 1080), h: +(opt.h || 1350), variant: opt.variant, gpu: opt.gpu === '1' });
    console.log(JSON.stringify(r.info));
  } else if (cmd === 'video') {
    const profile = PROFILES[opt.profile || 'final'];
    if (!profile) throw new Error('unknown render profile');
    const r = await video({ ...profile, film: filmPath, out: resolve(opt.out), w: +(opt.w || 1080), h: +(opt.h || 1350), variant: opt.variant,
      segments: opt.segments, fadeOut: opt.fadeOut ? +opt.fadeOut : undefined,
      preset: opt.preset || profile.preset, crf: opt.crf ? +opt.crf : profile.crf, fps: opt.fps ? +opt.fps : profile.fps,
      t0: +(opt.t0 || 0), t1: opt.t1 ? +opt.t1 : undefined, workers: +(opt.workers || Math.min(4, cpus().length)), gpu: opt.gpu === '1' });
    console.log(JSON.stringify(r));
  }
}
