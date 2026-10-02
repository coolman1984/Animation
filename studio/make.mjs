// One-command builds: a short draft by default, one review, or all final deliveries.
// See WORKFLOW.md for profiles, targeted ranges, cache dependencies and artistic acceptance.
// Each run writes a new numbered take in out/<film>/takeNN — nothing is overwritten.
import { mkdirSync, readdirSync, writeFileSync, copyFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildOptions, frameRange } from './lib/build-options.mjs';
import { fingerprint, cached } from './lib/cache.mjs';
import { doctor } from './lib/doctor.mjs';
import { run, video, textTimeline } from './lib/render.mjs';
import { probe, loudness, frozen, black, contactSheet, gates } from './lib/measure.mjs';
import { assembleAudio, masterAudio, mux, shareCopy, captions, stillAt, webpPreview } from './lib/finish.mjs';
import { loadProduction, reviewTimes } from './lib/production.mjs';
import { reviewEvidence, aspectCompare } from './lib/review.mjs';
import { loadMusicMap } from './lib/musicmap.mjs';
import { externalRender, validateEngine } from './lib/engines.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
// Films live in <name>/ or examples/<name>/; output file names use the last path part.
const [filmName, ...flags] = process.argv.slice(2);
if (!filmName || !/^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?$/.test(filmName)) { console.error('usage: node make.mjs <film> [--profile=draft|review|final] [--only=name] [--range=start:end | --shot=id[,id]] [--workers=1..16]'); process.exit(2); }
const cfg = (await import(pathToFileURL(join(ROOT, filmName, 'config.mjs')).href)).default;
const label = filmName.split('/').pop();
// --shot=id[,id] → the range covering those production shots plus 0.5 s of entry/exit context.
const shotFlag = flags.find(f => f.startsWith('--shot='));
if (shotFlag) {
  try {
    const plan = JSON.parse(readFileSync(join(ROOT, cfg.production), 'utf8'));
    const ids = shotFlag.slice(7).split(','), shots = plan.shots.filter(s => ids.includes(s.id));
    if (shots.length !== ids.length) throw new Error(`unknown shot in ${shotFlag}; shots: ${plan.shots.map(s => s.id).join(', ')}`);
    const a = Math.max(0, Math.min(...shots.map(s => s.start)) - 0.5), b = Math.min(plan.duration, Math.max(...shots.map(s => s.end)) + 0.5);
    flags.splice(flags.indexOf(shotFlag), 1, `--range=${+a.toFixed(3)}:${+b.toFixed(3)}`);
  } catch (error) { console.error(error.message); process.exit(2); }
}
let options;
try { options = buildOptions(cfg, flags); } catch (error) { console.error(error.message); process.exit(2); }
const { profile, selected, range, workers, settings } = options;
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const started = performance.now();
// Fail on missing inputs/contradictory content before launching browsers or synthesizing a score.
const production = loadProduction(ROOT, cfg, { final: profile === 'final' });
for (const warning of production.warnings) log('content note:', warning);
production.errors.push(...validateEngine(cfg.engine));
const external = cfg.engine?.type === 'external';
if (production.errors.length) { console.error(production.errors.join('\n')); process.exit(1); }

// 0. Tools + syntax.
const doc = await doctor({ quiet: true });
if (!doc.ok) { console.error('doctor failed — run node lib/doctor.mjs'); process.exit(1); }
for (const f of [...(external ? [] : [cfg.film]), cfg.score, 'lib/motion.js', 'lib/render.mjs', 'lib/audio.mjs']) await run('node', ['--check', join(ROOT, f)]);

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
const pictureInputs = [filmName, 'lib', 'assets', ...(cfg.production ? [cfg.production] : []), ...visualAssets, ...(cfg.cacheInputs || []), ...(cfg.engine?.inputs || [])];
const pictureKey = fingerprint(ROOT, pictureInputs, { chromium: doc.chromium.version, engine: cfg.engine ?? 'native' }, [cfg.score, ...audioAssets]);

const report = { film: filmName, take: n, profile, final: profile === 'final', at: new Date().toISOString(),
  content: { available: !!production.plan, warnings: production.warnings }, scoreCached, deliveries: {} };
if (production.plan) writeFileSync(join(OUT, 'review-plan.json'), JSON.stringify({
  timeline: 'source film seconds, not cut-down delivery seconds',
  times: reviewTimes(production.plan), shots: production.plan.shots,
  note: 'Inspect selected-delivery cut joins separately. Samples do not replace motion/audio playback.'
}, null, 2));
let allOk = true;
// Optional music map (production.musicMap): musical descriptions of cuts/moments in the review gallery.
let music = null;
if (production.plan?.musicMap && existsSync(join(ROOT, production.plan.musicMap))) {
  try { music = loadMusicMap(join(ROOT, production.plan.musicMap)); } catch (error) { log('music map unusable:', error.message); }
}
// Review evidence works in exported-video seconds: shift source-time plan/text by the range start.
const shifted = (offset, plan, text) => {
  if (!offset) return { plan, text };
  const sh = (a, b) => ({ start: a - offset, end: b - offset });
  return {
    plan: plan && { ...plan, shots: plan.shots.filter(x => x.end > offset).map(x => ({ ...x, ...sh(Math.max(x.start, offset), x.end) })),
      cues: (plan.cues || []).map(c => ({ ...c, t: c.t - offset })), creative: plan.creative && { ...plan.creative, styleFrames: undefined } },
    text: text && { ...text, lines: text.lines.map(l => ({ ...l, ...sh(l.start, l.end) })),
      camera: text.camera && { ...text.camera, samples: text.camera.samples.map(([t, ...v]) => [t - offset, ...v]) } },
  };
};
const reviewed = [];
for (const d of selected) {
  const deliveryStarted = performance.now();
  const dw = d.w || cfg.w, dh = d.h || cfg.h;
  const renderSettings = { ...settings, w: dw, h: dh, variant: d.variant, segments: d.segments, fadeOut: d.fadeOut, t0: range?.[0] ?? 0, t1: range?.[1] ?? d.duration, ...(cfg.gpu ? { gpu: true } : {}) };
  const key = fingerprint(ROOT, [], { pictureKey, ...renderSettings });
  const silent = join(TAKES, `${d.name}-${profile}-video.mp4`);
  let renderStats;
  log(`render ${d.name} (${profile})`);
  const reused = await cached(silent + '.cache.json', key, [silent], async () => {
    renderStats = external
      ? await externalRender(cfg.engine, { ...renderSettings, out: silent, root: ROOT, profile })
      : await video({ ...renderSettings, workers, film: join(ROOT, cfg.film), out: silent });
    log(`  ${renderStats.frames} frames in ${renderStats.seconds.toFixed(1)} s`);
  }, log);
  if (profile === 'draft') {
    const file = join(OUT, `${label}-${d.name}-DRAFT.mp4`); copyFileSync(silent, file);
    const p = await probe(file);
    const expected = frameRange(range[0], range[1], d.duration, settings.fps);
    const ok = p.width === Math.ceil(Math.round(dw * settings.scale) / 2) * 2 && p.height === Math.ceil(Math.round(dh * settings.scale) / 2) * 2 && p.fps === settings.fps && Math.abs(p.duration - expected.frames / settings.fps) < 1 / settings.fps;
    report.deliveries[d.name] = { file, probe: p, range, cached: reused, seconds: (performance.now() - deliveryStarted) / 1000, render: renderStats, gates: [{ name: 'draft size/fps/duration', ok }], note: 'Silent low-resolution preview; final QA and artistic review still required.' };
    allOk &&= ok; continue;
  }
  log(`text read-back ${d.name}`);
  const textOptions = { w: dw, h: dh, variant: d.variant, segments: d.segments, fadeOut: d.fadeOut, safeRect: d.safe, t0: range?.[0] ?? 0, t1: range?.[1] ?? d.duration, step: 0.1, ...(cfg.gpu ? { gpu: true } : {}) };
  const textFile = join(TAKES, `${d.name}-${profile}-text.json`);
  const textKey = fingerprint(ROOT, [], { pictureKey, ...textOptions });
  const textCached = await cached(textFile + '.cache.json', textKey, [textFile], async () => {
    // External engines have no composer DOM to read back: say so instead of passing vacuously.
    writeFileSync(textFile, JSON.stringify(external ? { lines: [], issues: [], unavailable: `external engine ${cfg.engine.name || ''}: no DOM text read-back` }
      : await textTimeline({ film: join(ROOT, cfg.film), ...textOptions })));
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
  const file = join(OUT, `${label}-${d.name}${profile === 'review' ? '-REVIEW' : ''}-${dw}x${dh}.mp4`);
  await mux(silent, master, file);
  const m = { probe: await probe(file), loud: await loudness(file), frozen: await frozen(file), black: await black(file), text };
  if (profile === 'final' && d.name === 'hero60') {
    log('share copy');
    const share = join(OUT, `${label}-${d.name}-share-${cfg.shareMB}MB.mp4`);
    await shareCopy(file, share, { targetMB: cfg.shareMB, duration: m.probe.duration });
    m.share = await probe(share);
    log('music-only, captions, thumbnails, sheet');
    const mus = join(TAKES, 'music-master.wav');
    await cached(mus + '.cache.json', fingerprint(ROOT, ['lib', `takes/${filmName}/music.wav`], { lufs: cfg.lufs, tp: cfg.tp }), [mus], () => masterAudio(join(TAKES, 'music.wav'), mus, { lufs: cfg.lufs, tp: cfg.tp }), log);
    const musLoud = await loudness(mus);
    await run('ffmpeg', ['-v', 'error', '-y', '-i', mus, '-c:a', 'aac', '-b:a', '256k', join(OUT, `${label}-music-only.m4a`)]);
    m.musicOnly = musLoud;
    captions(text.lines, join(OUT, `${label}-${d.name}.ar`));
    captions(text.lines, join(OUT, `${label}-${d.name}.en`), { translate: cfg.en });
    for (const [i, t] of cfg.thumbs.entries()) await stillAt(file, t, join(OUT, `thumb-${i + 1}.jpg`));
    await stillAt(file, cfg.poster, join(OUT, 'poster.jpg'));
    await contactSheet(file, join(OUT, 'contact-sheet.png'));
  }
  if (profile === 'final' && d.shareMB) {
    const share = join(OUT, `${label}-${d.name}-share-${d.shareMB}MB.mp4`);
    await shareCopy(file, share, { targetMB: d.shareMB, duration: m.probe.duration });
    m.share = await probe(share);
  }
  if (profile === 'final' && d.poster) await stillAt(file, d.poster, join(OUT, `poster-${d.name}.jpg`));
  if (profile === 'final' && d.name === 'bumper6') await webpPreview(file, join(OUT, `${label}-bumper6-preview.webp`));
  const g = gates(m, { w: dw, h: dh, duration: range ? range[1] - range[0] : d.duration, fps: settings.fps, lufs: cfg.lufs, tp: cfg.tp, fadeOut: range ? Math.max(0, range[1] - (d.duration - (d.fadeOut || 0))) : (d.fadeOut || 0), shareMB: d.shareMB || cfg.shareMB, holds: (d.holds || (d.segments ? [] : cfg.holds) || []).map(([a, b]) => [a - (range?.[0] || 0), b - (range?.[0] || 0)]) });
  report.deliveries[d.name] = { file, ...m, cached: reused, textCached, audioCached,
    seconds: (performance.now() - deliveryStarted) / 1000, render: renderStats, range, gates: g };
  console.log(`\n  ${d.name}`);
  for (const x of g) { console.log(`   ${x.ok ? 'PASS' : 'FAIL'}  ${x.name.padEnd(36)} ${x.value}`); allOk &&= x.ok; }
  // Evidence for LOOKING at the export: frames at cuts/copy/camera peaks, strips, crops, advisory notes.
  log(`review evidence ${d.name}`);
  const offset = range?.[0] || 0, sv = shifted(offset, production.plan, text);
  const evidenceDir = join(OUT, `review-${d.name}`);
  const ev = await reviewEvidence({ video: file, outDir: evidenceDir, fps: settings.fps, plan: d.segments ? null : sv.plan, text: sv.text,
    music: d.segments || offset ? null : music, sourceTimeline: !d.segments,
    holds: (d.holds || (d.segments ? [] : cfg.holds) || []).map(([a, b]) => [a - offset, b - offset]),
    sfxStem: offset || d.segments ? null : join(TAKES, 'sfx.wav'), cues: sv.plan?.cues });
  report.deliveries[d.name].review = { dir: evidenceDir, notes: ev.notes, camera: ev.camera?.max ?? null };
  if (!d.segments && !offset) reviewed.push({ name: d.name, file });
  for (const n of ev.notes) console.log(`   NOTE  ${n}`);
  console.log(`   LOOK  ${join(evidenceDir, 'index.html')}`);
}
if (reviewed.length > 1) {
  const times = production.plan?.creative?.styleFrames ? Object.values(production.plan.creative.styleFrames) : [0.25, 0.5, 0.75].map(f => f * Math.min(...selected.map(d => d.duration)));
  report.aspectCompare = await aspectCompare(reviewed.map(r => r.file), times.filter(t => selected.every(d => t < d.duration)), join(OUT, 'aspect-compare.jpg'));
  log('aspect comparison', report.aspectCompare);
}
report.seconds = (performance.now() - started) / 1000;
writeFileSync(join(OUT, 'measure.json'), JSON.stringify(report, (k, v) => (k === 'lines' || k === 'samples' ? undefined : v), 2));
log(`build ${report.seconds.toFixed(1)}s; score ${profile === 'draft' ? 'skipped' : scoreCached ? 'reused' : 'built'}`);
log(allOk ? (profile === 'final' ? 'TECHNICAL GATES PASSED — ARTISTIC REVIEW REQUIRED' : 'PREVIEW CHECKS PASSED — NOT A FINAL DELIVERY') : 'SOME GATES FAILED', OUT);
process.exit(allOk ? 0 : 1);
