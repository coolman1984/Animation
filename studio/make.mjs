// ONE command: score -> render (every delivery) -> read-back text -> master audio -> mux ->
// share copy -> captions/thumbnails -> measure -> gates.  Usage: node make.mjs film2 [--only=hero60]
// Each run writes a new numbered take in out/<film>/takeNN — nothing is overwritten.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { doctor } from './lib/doctor.mjs';
import { run, video, textTimeline } from './lib/render.mjs';
import { probe, loudness, frozen, black, contactSheet, gates } from './lib/measure.mjs';
import { assembleAudio, masterAudio, mux, shareCopy, captions, stillAt, webpPreview } from './lib/finish.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const [filmName, ...flags] = process.argv.slice(2);
const opt = Object.fromEntries(flags.map((a) => a.replace(/^--/, '').split('=')));
if (!filmName) { console.error('usage: node make.mjs <film> [--only=name]'); process.exit(2); }
const cfg = (await import(pathToFileURL(join(ROOT, filmName, 'config.mjs')).href)).default;
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

// 0. Tools + syntax.
const doc = await doctor({ quiet: true });
if (!doc.ok) { console.error('doctor failed — run node lib/doctor.mjs'); process.exit(1); }
for (const f of [cfg.film, cfg.score, 'lib/motion.js', 'lib/render.mjs', 'lib/audio.mjs']) await run('node', ['--check', join(ROOT, f)]);

// 1. Score.
log('score'); await run('node', [join(ROOT, cfg.score)]);
const TAKES = join(ROOT, 'takes', filmName);
mkdirSync(TAKES, { recursive: true });

// 2. New take folder.
const outBase = join(ROOT, 'out', filmName); mkdirSync(outBase, { recursive: true });
const n = Math.max(0, ...readdirSync(outBase).map((d) => +(d.match(/^take(\d+)$/)?.[1] || 0))) + 1;
const OUT = join(outBase, `take${String(n).padStart(2, '0')}`); mkdirSync(OUT);
log('take', OUT);

// Render cache: a silent video is reused only if newer than every input that shapes the picture.
const inputs = [cfg.film, 'lib/motion.js', 'lib/composer.html', ...readdirSync(join(ROOT, filmName, 'plates')).map((f) => `${filmName}/plates/${f}`)].map((f) => statSync(join(ROOT, f)).mtimeMs);
const fresh = (file) => existsSync(file) && statSync(file).mtimeMs > Math.max(...inputs);

const report = { film: filmName, take: n, at: new Date().toISOString(), deliveries: {} };
let allOk = true;
for (const d of cfg.deliveries) {
  if (opt.only && !opt.only.split(',').includes(d.name)) continue;
  const dw = d.w || cfg.w, dh = d.h || cfg.h;
  const silent = join(TAKES, `${d.name}-video.mp4`);
  if (!fresh(silent)) {
    log(`render ${d.name}`);
    const r = await video({ film: join(ROOT, cfg.film), out: silent, w: dw, h: dh, segments: d.segments, fadeOut: d.fadeOut });
    log(`  ${r.frames} frames in ${r.seconds.toFixed(0)} s (${(r.frames / r.seconds).toFixed(1)} fps)`);
  } else log(`render ${d.name}: cached`);
  log(`text read-back ${d.name}`);
  const text = await textTimeline({ film: join(ROOT, cfg.film), w: dw, h: dh, segments: d.segments, safeRect: d.safe });
  log(`audio ${d.name}`);
  const cut = join(TAKES, `${d.name}-mix.wav`);
  await assembleAudio(join(TAKES, 'mix.wav'), cut, { segments: d.segments, fadeOut: d.fadeOut });
  const master = join(TAKES, `${d.name}-master.wav`);
  await masterAudio(cut, master, { lufs: cfg.lufs, tp: cfg.tp });
  const file = join(OUT, `${filmName}-${d.name}-${dw}x${dh}.mp4`);
  await mux(silent, master, file);
  const m = { probe: await probe(file), loud: await loudness(file), frozen: await frozen(file), black: await black(file), text };
  if (d.name === 'hero60') {
    log('share copy');
    const share = join(OUT, `${filmName}-${d.name}-share-${cfg.shareMB}MB.mp4`);
    await shareCopy(file, share, { targetMB: cfg.shareMB, duration: m.probe.duration });
    m.share = await probe(share);
    log('music-only, captions, thumbnails, sheet');
    const mus = join(TAKES, 'music-master.wav');
    const musLoud = await masterAudio(join(TAKES, 'music.wav'), mus, { lufs: cfg.lufs, tp: cfg.tp });
    await run('ffmpeg', ['-v', 'error', '-y', '-i', mus, '-c:a', 'aac', '-b:a', '256k', join(OUT, `${filmName}-music-only.m4a`)]);
    m.musicOnly = musLoud;
    captions(text.lines, join(OUT, `${filmName}-${d.name}.ar`));
    captions(text.lines, join(OUT, `${filmName}-${d.name}.en`), { translate: cfg.en });
    for (const [i, t] of cfg.thumbs.entries()) await stillAt(file, t, join(OUT, `thumb-${i + 1}.jpg`));
    await stillAt(file, cfg.poster, join(OUT, 'poster.jpg'));
    await contactSheet(file, join(OUT, 'contact-sheet.png'));
  }
  if (d.shareMB) {
    const share = join(OUT, `${filmName}-${d.name}-share-${d.shareMB}MB.mp4`);
    await shareCopy(file, share, { targetMB: d.shareMB, duration: m.probe.duration });
    m.share = await probe(share);
  }
  if (d.poster) await stillAt(file, d.poster, join(OUT, `poster-${d.name}.jpg`));
  if (d.name === 'bumper6') await webpPreview(file, join(OUT, `${filmName}-bumper6-preview.webp`));
  const g = gates(m, { w: dw, h: dh, duration: d.duration, lufs: cfg.lufs, shareMB: d.shareMB || cfg.shareMB, holds: cfg.holds });
  report.deliveries[d.name] = { file, ...m, gates: g };
  console.log(`\n  ${d.name}`);
  for (const x of g) { console.log(`   ${x.ok ? 'PASS' : 'FAIL'}  ${x.name.padEnd(36)} ${x.value}`); allOk &&= x.ok; }
}
writeFileSync(join(OUT, 'measure.json'), JSON.stringify(report, (k, v) => (k === 'lines' ? undefined : v), 2));
log(allOk ? 'ALL GATES PASSED' : 'SOME GATES FAILED', OUT);
process.exit(allOk ? 0 : 1);
