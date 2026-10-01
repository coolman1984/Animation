// One-command builds: a short draft by default, one review, or all final deliveries.
// See WORKFLOW.md for profiles, targeted ranges, cache dependencies and artistic acceptance.
// Each run writes a new numbered take in out/<film>/takeNN — nothing is overwritten.
import { mkdirSync, readdirSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildOptions, frameRange } from './lib/build-options.mjs';
import { fingerprint, cached } from './lib/cache.mjs';
import { doctor } from './lib/doctor.mjs';
import { run, video, textTimeline } from './lib/render.mjs';
import { probe, loudness, frozen, black, contactSheet, gates } from './lib/measure.mjs';
import { assembleAudio, masterAudio, mux, shareCopy, captions, stillAt, webpPreview } from './lib/finish.mjs';
import { loadProduction, reviewTimes } from './lib/production.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const [filmName, ...flags] = process.argv.slice(2);
if (!filmName || !/^[a-zA-Z0-9_-]+$/.test(filmName)) { console.error('usage: node make.mjs <film> [--profile=draft|review|final] [--only=name] [--range=start:end] [--workers=1..16]'); process.exit(2); }
const cfg = (await import(pathToFileURL(join(ROOT, filmName, 'config.mjs')).href)).default;
let options;
try { options = buildOptions(cfg, flags); } catch (error) { console.error(error.message); process.exit(2); }
const { profile, selected, range, workers, settings } = options;
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const started = performance.now();
// Fail on missing inputs/contradictory content before launching browsers or synthesizing a score.
const production = loadProduction(ROOT, cfg, { final: profile === 'final' });
for (const warning of production.warnings) log('content note:', warning);
if (production.errors.length) { console.error(production.errors.join('\n')); process.exit(1); }

// 0. Tools + syntax.
const doc = await doctor({ quiet: true });
if (!doc.ok) { console.error('doctor failed — run node lib/doctor.mjs'); process.exit(1); }
for (const f of [cfg.film, cfg.score, 'lib/motion.js', 'lib/render.mjs', 'lib/audio.mjs']) await run('node', ['--check', join(ROOT, f)]);

const TAKES = join(ROOT, 'takes', filmName);
mkdirSync(TAKES, { recursive: true });
// Score imports can live outside the film folder: conservative studio inputs keep reuse safe.
const audioAssets = (production.plan?.assets || []).filter(a => ['music', 'sfx'].includes(a.role)).map(a => a.path);
const visualAssets = (production.plan?.assets || []).filter(a => !['music', 'sfx', 'reference'].includes(a.role)).map(a => a.path);
const scoreInputs = [cfg.score, 'lib', 'assets', ...(cfg.production ? [cfg.production] : []), ...audioAssets, ...(cfg.cacheInputs || [])];
const scoreKey = fingerprint(ROOT, scoreInputs, { node: process.version });
let scoreCached = false;
if (profile !== 'draft') {
  log('score');
  scoreCached = await cached(join(TAKES, 'score.cache.json'), scoreKey, ['mix.wav', 'music.wav', 'sfx.wav'].map(f => join(TAKES, f)),
    () => run('node', [join(ROOT, cfg.score)]), log);
}

// 2. New take folder.
const outBase = join(ROOT, 'out', filmName); mkdirSync(outBase, { recursive: true });
const n = Math.max(0, ...readdirSync(outBase).map((d) => +(d.match(/^take(\d+)$/)?.[1] || 0))) + 1;
const OUT = join(outBase, `take${String(n).padStart(2, '0')}`); mkdirSync(OUT);
log('take', OUT);

// Picture cache includes local imported code, fonts and images, not just their mtimes.
// A sound-only edit leaves silent video reusable. Config values are hashed per artifact.
const pictureInputs = [filmName, 'lib', 'assets', ...(cfg.production ? [cfg.production] : []), ...visualAssets, ...(cfg.cacheInputs || [])];
const pictureKey = fingerprint(ROOT, pictureInputs, { chromium: doc.chromium.version }, [cfg.score, ...audioAssets]);

const report = { film: filmName, take: n, profile, final: profile === 'final', at: new Date().toISOString(),
  content: { available: !!production.plan, warnings: production.warnings }, scoreCached, deliveries: {} };
if (production.plan) writeFileSync(join(OUT, 'review-plan.json'), JSON.stringify({
  timeline: 'source film seconds, not cut-down delivery seconds',
  times: reviewTimes(production.plan), shots: production.plan.shots,
  note: 'Inspect selected-delivery cut joins separately. Samples do not replace motion/audio playback.'
}, null, 2));
let allOk = true;
for (const d of selected) {
  const deliveryStarted = performance.now();
  const dw = d.w || cfg.w, dh = d.h || cfg.h;
  const renderSettings = { ...settings, w: dw, h: dh, variant: d.variant, segments: d.segments, fadeOut: d.fadeOut, t0: range?.[0] ?? 0, t1: range?.[1] ?? d.duration };
  const key = fingerprint(ROOT, [], { pictureKey, ...renderSettings });
  const silent = join(TAKES, `${d.name}-${profile}-video.mp4`);
  let renderStats;
  log(`render ${d.name} (${profile})`);
  const reused = await cached(silent + '.cache.json', key, [silent], async () => {
    renderStats = await video({ ...renderSettings, workers, film: join(ROOT, cfg.film), out: silent });
    log(`  ${renderStats.frames} frames in ${renderStats.seconds.toFixed(1)} s`);
  }, log);
  if (profile === 'draft') {
    const file = join(OUT, `${filmName}-${d.name}-DRAFT.mp4`); copyFileSync(silent, file);
    const p = await probe(file);
    const expected = frameRange(range[0], range[1], d.duration, settings.fps);
    const ok = p.width === Math.ceil(Math.round(dw * settings.scale) / 2) * 2 && p.height === Math.ceil(Math.round(dh * settings.scale) / 2) * 2 && p.fps === settings.fps && Math.abs(p.duration - expected.frames / settings.fps) < 1 / settings.fps;
    report.deliveries[d.name] = { file, probe: p, range, cached: reused, seconds: (performance.now() - deliveryStarted) / 1000, render: renderStats, gates: [{ name: 'draft size/fps/duration', ok }], note: 'Silent low-resolution preview; final QA and artistic review still required.' };
    allOk &&= ok; continue;
  }
  log(`text read-back ${d.name}`);
  const textOptions = { w: dw, h: dh, variant: d.variant, segments: d.segments, fadeOut: d.fadeOut, safeRect: d.safe, t0: range?.[0] ?? 0, t1: range?.[1] ?? d.duration, step: 0.1 };
  const textFile = join(TAKES, `${d.name}-${profile}-text.json`);
  const textKey = fingerprint(ROOT, [], { pictureKey, ...textOptions });
  const textCached = await cached(textFile + '.cache.json', textKey, [textFile], async () => {
    writeFileSync(textFile, JSON.stringify(await textTimeline({ film: join(ROOT, cfg.film), ...textOptions })));
  }, log);
  const text = JSON.parse(readFileSync(textFile, 'utf8'));
  log(`audio ${d.name}`);
  const cut = join(TAKES, `${d.name}-${profile}-mix.wav`);
  const master = join(TAKES, `${d.name}-${profile}-master.wav`);
  const audioKey = fingerprint(ROOT, [cfg.score, 'lib/audio.mjs', 'lib/finish.mjs', 'lib/measure.mjs', `takes/${filmName}/mix.wav`], { scoreKey, segments: d.segments, fadeOut: d.fadeOut, range, lufs: cfg.lufs, tp: cfg.tp });
  const audioCached = await cached(master + '.cache.json', audioKey, [master], async () => {
    await assembleAudio(join(TAKES, 'mix.wav'), cut, { segments: d.segments, fadeOut: d.fadeOut });
    if (range) {
      const slice = cut + '.range.wav';
      await run('ffmpeg', ['-v', 'error', '-y', '-i', cut, '-ss', String(range[0]), '-t', String(range[1] - range[0]), '-c:a', 'pcm_f32le', slice]);
      await masterAudio(slice, master, { lufs: cfg.lufs, tp: cfg.tp });
    } else await masterAudio(cut, master, { lufs: cfg.lufs, tp: cfg.tp });
  }, log);
  const file = join(OUT, `${filmName}-${d.name}${profile === 'review' ? '-REVIEW' : ''}-${dw}x${dh}.mp4`);
  await mux(silent, master, file);
  const m = { probe: await probe(file), loud: await loudness(file), frozen: await frozen(file), black: await black(file), text };
  if (profile === 'final' && d.name === 'hero60') {
    log('share copy');
    const share = join(OUT, `${filmName}-${d.name}-share-${cfg.shareMB}MB.mp4`);
    await shareCopy(file, share, { targetMB: cfg.shareMB, duration: m.probe.duration });
    m.share = await probe(share);
    log('music-only, captions, thumbnails, sheet');
    const mus = join(TAKES, 'music-master.wav');
    await cached(mus + '.cache.json', fingerprint(ROOT, ['lib', `takes/${filmName}/music.wav`], { lufs: cfg.lufs, tp: cfg.tp }), [mus], () => masterAudio(join(TAKES, 'music.wav'), mus, { lufs: cfg.lufs, tp: cfg.tp }), log);
    const musLoud = await loudness(mus);
    await run('ffmpeg', ['-v', 'error', '-y', '-i', mus, '-c:a', 'aac', '-b:a', '256k', join(OUT, `${filmName}-music-only.m4a`)]);
    m.musicOnly = musLoud;
    captions(text.lines, join(OUT, `${filmName}-${d.name}.ar`));
    captions(text.lines, join(OUT, `${filmName}-${d.name}.en`), { translate: cfg.en });
    for (const [i, t] of cfg.thumbs.entries()) await stillAt(file, t, join(OUT, `thumb-${i + 1}.jpg`));
    await stillAt(file, cfg.poster, join(OUT, 'poster.jpg'));
    await contactSheet(file, join(OUT, 'contact-sheet.png'));
  }
  if (profile === 'final' && d.shareMB) {
    const share = join(OUT, `${filmName}-${d.name}-share-${d.shareMB}MB.mp4`);
    await shareCopy(file, share, { targetMB: d.shareMB, duration: m.probe.duration });
    m.share = await probe(share);
  }
  if (profile === 'final' && d.poster) await stillAt(file, d.poster, join(OUT, `poster-${d.name}.jpg`));
  if (profile === 'final' && d.name === 'bumper6') await webpPreview(file, join(OUT, `${filmName}-bumper6-preview.webp`));
  const g = gates(m, { w: dw, h: dh, duration: range ? range[1] - range[0] : d.duration, fps: settings.fps, lufs: cfg.lufs, tp: cfg.tp, fadeOut: range ? Math.max(0, range[1] - (d.duration - (d.fadeOut || 0))) : (d.fadeOut || 0), shareMB: d.shareMB || cfg.shareMB, holds: (d.holds || (d.segments ? [] : cfg.holds) || []).map(([a, b]) => [a - (range?.[0] || 0), b - (range?.[0] || 0)]) });
  report.deliveries[d.name] = { file, ...m, cached: reused, textCached, audioCached,
    seconds: (performance.now() - deliveryStarted) / 1000, render: renderStats, range, gates: g };
  console.log(`\n  ${d.name}`);
  for (const x of g) { console.log(`   ${x.ok ? 'PASS' : 'FAIL'}  ${x.name.padEnd(36)} ${x.value}`); allOk &&= x.ok; }
}
report.seconds = (performance.now() - started) / 1000;
writeFileSync(join(OUT, 'measure.json'), JSON.stringify(report, (k, v) => (k === 'lines' ? undefined : v), 2));
log(`build ${report.seconds.toFixed(1)}s; score ${profile === 'draft' ? 'skipped' : scoreCached ? 'reused' : 'built'}`);
log(allOk ? (profile === 'final' ? 'TECHNICAL GATES PASSED — ARTISTIC REVIEW REQUIRED' : 'PREVIEW CHECKS PASSED — NOT A FINAL DELIVERY') : 'SOME GATES FAILED', OUT);
process.exit(allOk ? 0 : 1);
