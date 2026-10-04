import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { timeline } from '../lib/events.js';
import { lint, motion } from '../lib/gates.mjs';
import { onsetEnvelope, voiceWords } from '../lib/analyze.mjs';
import { renderScore } from '../lib/sound.mjs';
import { assetId, resolveAssets, registerAsset } from '../lib/assets.mjs';
import { plannedWorkers } from '../../lib/platform.mjs';
import { connect } from '../../lib/cdp.mjs';
import { scenePresentation } from '../lib/player.js';
import { MODULES } from '../lib/modules.js';
import { holdSpans, gateFailures, listTakes, newTake, deliveryVideo } from '../lib/pipeline.mjs';
import { forFormat, mediaAssets, musicDecodeOptions } from '../lib/spec.mjs';
import { validateProduction } from '../../lib/production.mjs';

const spec = () => ({ bpm: 120, music: { mode: 'sfx' }, scenes: [{ id: 'one', beats: 2, elements: [{ type: 'shape' }] }] });
const brand = JSON.parse(readFileSync(new URL('../brand/brand.json', import.meta.url), 'utf8'));

test('invalid clocks fail explicitly rather than concatenate or default invalid values', () => {
  for (const bpm of [0, -10, NaN, '120']) assert.throws(() => timeline({ ...spec(), bpm }), /bpm/i);
  assert.throws(() => timeline({ ...spec(), duration: 5 }), /duration/i);
  assert.throws(() => timeline({ scenes: [{ id: 'x', beats: '2' }] }), /beats/i);
});
test('malformed specs return lint errors without crashing', () => {
  for (const bad of [null, {}, { scenes: [null] }, { scenes: [{ id: 'x', beats: 2, elements: [{ type: 'words' }] }] }]) {
    assert.ok(lint(bad, brand).errors.length > 0);
  }
});
test('a silent SFX-only film writes finite, silent WAV samples', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-silence-'));
  try {
    renderScore(spec(), dir, { log: () => {} });
    for (const name of ['mix', 'music', 'sfx']) {
      const wav = readFileSync(join(dir, name + '.wav'));
      const chunk = wav.indexOf(Buffer.from('data'));
      assert.ok(chunk >= 0);
      const size = wav.readUInt32LE(chunk + 4);
      for (let i = chunk + 8; i < chunk + 8 + size; i += 4) assert.equal(wav.readFloatLE(i), 0, name);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('motion gate fails closed when video cannot be decoded', () => {
  assert.throws(() => motion('__studio_missing_video__.mp4', timeline(spec())), /motion analysis failed/i);
});
test('worker override cannot exceed memory capacity or requested count', () => {
  const saved = process.env.STUDIO_WORKERS;
  try {
    process.env.STUDIO_WORKERS = '16';
    assert.equal(plannedWorkers({ requested: 6, gpu: true, budget: { headroomGB: 1.7 } }).workers, 1);
    assert.equal(plannedWorkers({ requested: 1, budget: { headroomGB: 40 } }).workers, 1);
    process.env.STUDIO_WORKERS = 'garbage';
    assert.ok(Number.isInteger(plannedWorkers({ budget: { headroomGB: 40 } }).workers));
  } finally { if (saved === undefined) delete process.env.STUDIO_WORKERS; else process.env.STUDIO_WORKERS = saved; }
});
test('asset kinds cannot introduce directory traversal', () => {
  assert.throws(() => assetId('../escape', 'test'), /asset/i);
});
test('onset envelope preserves a hit at sample zero and rejects invalid hops', () => {
  const x = new Float32Array(1000); x.fill(1, 0, 10);
  assert.ok(onsetEnvelope(x, 1000, .01)[0] > 0);
  assert.throws(() => onsetEnvelope(x, 1000, 0), /hop/i);
});
test('fresh libraries accept film-relative media and refresh changed supplied files without rewriting on cache hits', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-assets-')), lib = join(dir, 'library');
  try {
    const file = join(dir, 'hero.png'); writeFileSync(file, 'first');
    const options = { libraryDir: lib, sourceDir: dir }, assets = [{ id: 'hero', name: 'hero', kind: 'image', file: 'hero.png' }];
    assert.ok(resolveAssets(assets, options).ready.hero);
    const index = join(lib, 'library.json'), before = statSync(index).mtimeMs;
    resolveAssets(assets, options); assert.equal(statSync(index).mtimeMs, before);
    writeFileSync(file, 'second'); resolveAssets(assets, options);
    assert.equal(readFileSync(join(lib, 'hero.png'), 'utf8'), 'second');
    assert.throws(() => resolveAssets([{ id: '../escape', kind: 'image', file }], options), /unsafe asset/);
    assert.throws(() => registerAsset({ id: '../escape' }, file, options), /unsafe asset/);
    assert.throws(() => resolveAssets([{ id: 'missing', kind: 'image', file: 'gone.png' }], options), /missing supplied asset/);
    const manifest = JSON.parse(readFileSync(index)); manifest.assets.hero.file = '../hero.png'; writeFileSync(index, JSON.stringify(manifest));
    assert.throws(() => resolveAssets([{ id: 'hero' }], options), /unsafe asset/);
    const empty = join(dir, 'empty'); resolveAssets([], { libraryDir: empty }); assert.equal(existsSync(empty), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('narration cache depends on source contents and validates the probe before transcription', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-voice-')), file = join(dir, 'voice.wav'), pack = join(dir, 'pack');
  try {
    writeFileSync(file, 'first'); let calls = 0;
    const run = (cmd, args) => {
      calls++;
      if (cmd === 'ffprobe') return { status: 0, stdout: '1.0' };
      if (args.includes('transcribe')) {
        assert.ok(existsSync(args[0]), 'absolute live.py path exists'); assert.ok(args.includes('--lang=auto'));
        writeFileSync(join(pack, 'transcript.json'), JSON.stringify({ words: [{ text: readFileSync(file, 'utf8'), start: 0 }] }));
      }
      return { status: 0 };
    };
    assert.equal(voiceWords(file, pack, { run }).words[0].text, 'first'); const initial = calls;
    voiceWords(file, pack, { run }); assert.equal(calls, initial);
    writeFileSync(file, 'second'); assert.equal(voiceWords(file, pack, { run }).words[0].text, 'second'); assert.ok(calls > initial);
    writeFileSync(file, 'third');
    assert.match(voiceWords(file, pack, { run: (cmd) => cmd === 'ffprobe' ? { status: 1 } : { status: 0 } }).error, /probe/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('hard cuts are opaque at the boundary and wipe keeps the outgoing backing scene', () => {
  const a = { a: 0, b: 4, post: 0 }, b = { a: 4, b: 8, transition: 'cut', pre: 0 };
  assert.equal(scenePresentation(a, b, 4 - 1 / 30).opacity, 1);
  assert.equal(scenePresentation(a, b, 4).visible, false);
  assert.deepEqual(scenePresentation(b, null, 4), { visible: true, opacity: 1, clipPath: 'none' });
  const wipe = { ...b, transition: 'wipe' };
  assert.equal(scenePresentation(a, wipe, 4.3).visible, true);
  assert.equal(scenePresentation(a, wipe, 4.4).visible, false);
  assert.equal(scenePresentation(wipe, null, 4).clipPath, 'inset(0 100.00% 0 0)');
});
test('intermediate holds stay inside their scene and every failed gate blocks delivery', () => {
  const tl = timeline({ bpm: 120, scenes: [{ id: 'first', beats: 8, hold: true }, { id: 'last', beats: 8 }] });
  assert.deepEqual(holdSpans(tl), [[2.6, 4]]);
  for (const input of [{ frames: ['outside'] }, { text: [{ t: 1, kind: 'overlap', text: 'A' }] }, { sync: { missed: ['late'] } }, { motion: ['still'] }]) assert.equal(gateFailures(input).length, 1);
});
test('delivery selects a new numeric take and rejects missing video or failed measurement', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-delivery-'));
  try {
    for (const name of ['take99', 'take100', 'take02', 'take-junk']) mkdirSync(join(dir, name));
    assert.deepEqual(listTakes(dir), ['take02', 'take99', 'take100']);
    assert.throws(() => newTake(dir, listTakes(dir)), /no new take/);
    const take = newTake(dir, ['take02', 'take99']); assert.equal(take, join(dir, 'take100'));
    const measure = { final: true, profile: 'final', deliveries: { youtube: { gates: [{ ok: true }] } } };
    writeFileSync(join(take, 'measure.json'), JSON.stringify(measure)); assert.throws(() => deliveryVideo(take, 'youtube'), /share MP4/);
    writeFileSync(join(take, 'film-share-29MB.mp4'), ''); assert.throws(() => deliveryVideo(take, 'youtube'), /empty/);
    writeFileSync(join(take, 'film-share-29MB.mp4'), 'video'); assert.ok(deliveryVideo(take, 'youtube').endsWith('.mp4'));
    measure.deliveries.youtube.gates[0].ok = false; writeFileSync(join(take, 'measure.json'), JSON.stringify(measure)); assert.throws(() => deliveryVideo(take, 'youtube'), /passing gates/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('CDP handshake times out and closes a socket that never opens', async () => {
  const saved = globalThis.WebSocket; let closed = false;
  globalThis.WebSocket = class { close() { closed = true; } };
  try { await assert.rejects(connect('ws://test', { timeout: 20 }), /connect timed out/); assert.equal(closed, true); }
  finally { globalThis.WebSocket = saved; }
});
test('format overrides retain nested settings, filter elements and leave source unchanged', () => {
  const source = { scenes: [{ id: 'x', beats: 4, camera: { from: 10, to: 20, drift: false }, reel: { camera: { to: 50 } }, elements: [{ type: 'shape', only: 'youtube' }, { type: 'shape' }] }] };
  const result = forFormat(source, 'reel');
  assert.deepEqual(result.scenes[0].camera, { from: 10, to: 50, drift: false }); assert.equal(result.scenes[0].elements.length, 1);
  assert.equal(source.scenes[0].camera.to, 20); assert.equal(source.scenes[0].elements.length, 2);
});
test('music alignment trims a late first beat and pads an early first beat', () => {
  assert.deepEqual(musicDecodeOptions(.25), { af: 'atrim=start=0.25,asetpts=PTS-STARTPTS' });
  assert.deepEqual(musicDecodeOptions(-.01), { af: 'adelay=10:all=1' });
  assert.deepEqual(musicDecodeOptions(), {}); assert.throws(() => musicDecodeOptions(NaN), /finite/);
});
test('supplied music carries its real rights metadata and connects to the production music asset', () => {
  const audio = { music: '/audio/song.wav', musicRights: 'Owner licensed recording', licenseScope: 'Social and paid advertising' };
  const film = JSON.parse(readFileSync(new URL('../films/form-function/spec.json', import.meta.url), 'utf8'));
  const plan = { version: 1, duration: 32, fps: 30, audience: 'designers', promise: 'form', cta: 'visit', direction: 'form', creative: film.creative,
    assets: mediaAssets({ audio }, {}), sound: { mode: 'licensed', assetId: 'supplied-music', licenseScope: audio.licenseScope },
    shots: [{ id: 'one', start: 0, end: 32, purpose: 'form', assetIds: [], craft: film.scenes[0].craft }], cues: [{ id: 'one', t: 0, kind: 'reveal', shot: 'one' }] };
  assert.equal(plan.assets[0].rights, audio.musicRights);
  assert.deepEqual(validateProduction(plan, { final: true }).errors, []);
  plan.assets[0].rights = ''; assert.ok(validateProduction(plan, { final: true }).errors.some((e) => e.includes('permission/license')));
});
test('shape morphs inherit prior geometry and keep color continuity at the handoff', () => {
  const saved = globalThis.document;
  const node = () => ({ style: {}, children: [], appendChild(n) { this.children.push(n); }, setAttribute() {} });
  globalThis.document = { createElement: node, createElementNS: node };
  try {
    const root = node(), ctx = { root, W: 1920, H: 1080, B: .5, a: 0, b: 5, T: (b) => b * .5, brand, find: () => ({ dur: .5, geo: { x: 960, y: 540, w: 400, h: 200, r: 20, c: '#00FF00' } }) };
    const render = MODULES.shape(ctx, { w: 200, color: '#FF0000', morphTo: 'next', morph: [{ at: 1, dur: .5, w: 400 }, { at: 3, dur: .5, r: 20 }] });
    render(4); assert.ok(Math.abs(parseFloat(root.children[0].style.width) - 400) < 1);
    render(4.50001); const color = root.children[0].style.background.match(/[\d.]+/g).map(Number); assert.ok(color[0] > 250 && color[2] < 5, 'red is preserved at handoff');
    const forward = { ...root.children[0].style }; render(1); render(4.50001); assert.deepEqual(root.children[0].style, forward);
    const overlappingRoot = node();
    const overlapping = MODULES.shape({ ...ctx, root: overlappingRoot }, { w: 200, morph: [{ at: 1, dur: 4, w: 600 }, { at: 2, dur: 1, w: 800 }] });
    overlapping(.99999); const before = parseFloat(overlappingRoot.children[0].style.width);
    overlapping(1); assert.ok(Math.abs(parseFloat(overlappingRoot.children[0].style.width) - before) < .1, 'retargeting starts at the current geometry');
  } finally { globalThis.document = saved; }
});
