// Local caption parsers and backend detection. No model, no Python, no ffmpeg.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cues, exportAll, fromLive, toSRT, validate } from '../lib/transcript.mjs';
import { FAST_PY, WORD_TIMING, caption, detectBackends, failureText, installText, parseFasterWhisper, parseWhisperCpp } from '../lib/whisper.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(join(dir, 'fixture', name), 'utf8'));
const none = { which: () => null, probe: () => false, py: { faster_whisper: false, sherpa_onnx: false }, env: {}, kind: () => null };
const RLE = '\u202B', PDF = '\u202C';

function written(t) {
  const root = mkdtempSync(join(tmpdir(), 'cap-'));
  try {
    const files = exportAll(t, join(root, 'cap'));
    const srt = readFileSync(files.srt, 'utf8');
    for (const ext of ['.transcript.json', '.srt', '.vtt', '.ass', '.txt']) assert.ok(Object.values(files).some(f => f.endsWith(ext) && existsSync(f)), ext);
    return srt;
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('whisper.cpp full JSON: sub-words merge, special tokens drop, validate, Arabic SRT is RTL', () => {
  const live = parseWhisperCpp(load('whisper-cpp.json'));
  assert.equal(live.engine, 'whisper.cpp');
  assert.equal(live.model, 'ggml-small.bin');
  assert.equal(live.wordTiming, WORD_TIMING.cpp);
  assert.deepEqual(live.words.map(w => w.w), ['كل', 'فكرة', 'عظيمة.', 'Every', 'great', 'idea.']);
  assert.equal(live.words[0].start, 0.1);
  assert.equal(live.words[0].end, 0.4);
  assert.equal(live.words[1].end, 0.9, 'فكرة is فكر + ة');
  assert.equal(live.words[1].conf, 0.83);
  assert.equal(live.words[2].end, 1.9, 'the period stays on the Arabic word');
  assert.equal(live.words[4].w, 'great');
  assert.equal(live.words[4].start, 3.6);
  assert.equal(live.words[4].end, 4.1, 'offsets are used when the timestamp object is missing');
  assert.ok(live.words.every(w => !/\[_|<\|/.test(w.w)));
  const t = fromLive(live, { file: 'clip.mp4' });
  assert.deepEqual(validate(t), []);
  assert.equal(t.language, 'mixed');
  assert.equal(t.source.engine, 'whisper.cpp');
  assert.equal(t.source.model, 'ggml-small.bin');
  assert.equal(t.source.wordTiming, WORD_TIMING.cpp);
  assert.equal(t.source.file, 'clip.mp4');
  const srt = written(t);
  assert.match(srt, new RegExp(`${RLE}كل فكرة عظيمة\\.${PDF}`));
  const en = srt.split('\n').find(l => l.includes('Every'));
  assert.ok(en && !en.includes(RLE), 'the English line stays left to right');
  assert.match(toSRT(cues(t)), new RegExp(RLE));
});

test('faster-whisper JSON: word timestamps and confidence, validate, Arabic SRT is RTL', () => {
  const live = parseFasterWhisper(load('faster-whisper.json'));
  assert.equal(live.engine, 'faster-whisper');
  assert.equal(live.model, 'small');
  assert.equal(live.wordTiming, WORD_TIMING.fast);
  assert.deepEqual(live.words.map(w => [w.w, w.start, w.end, w.conf]), [
    ['كل', 0.1, 0.45, 0.9], ['فكرة', 0.5, 0.95, 0.88], ['عظيمة.', 1.05, 1.9, 0.93],
    ['Every', 3.2, 3.55, 0.96], ['great', 3.6, 4, 0.94], ['idea.', 4.1, 4.6, 0.98],
  ]);
  const t = fromLive(live, { file: 'clip.wav' });
  assert.deepEqual(validate(t), []);
  assert.equal(t.language, 'mixed');
  assert.equal(t.source.engine, 'faster-whisper');
  assert.equal(t.source.wordTiming, WORD_TIMING.fast);
  assert.match(written(t), new RegExp(`${RLE}كل فكرة عظيمة\\.${PDF}`));
});

test('a sherpa transcript with no engine field stays labelled sherpa-onnx', () => {
  const t = fromLive({ model: 'sherpa-onnx-whisper-turbo', lang: 'ar', wordTiming: 'proportional within Whisper segments, snapped to loudness dips (not forced alignment)', words: [{ w: 'كل', start: 0, end: 0.4 }] });
  assert.equal(t.source.engine, 'whisper (sherpa-onnx)');
  assert.match(t.source.wordTiming, /not forced alignment/);
  assert.deepEqual(validate(t), []);
});

test('backend detection is none when nothing is installed, and does not run a caption', () => {
  const d = detectBackends(none);
  assert.equal(d.chosen, null);
  assert.deepEqual(d.backends.map(b => b.id), ['whisper.cpp', 'faster-whisper', 'sherpa-onnx']);
  assert.ok(d.backends.every(b => b.installed === false && b.ready === false));
  const msg = installText(d);
  assert.match(msg, /whisper-cli/);
  assert.match(msg, /cmake -B build/);
  assert.match(msg, /75 MiB/);
  assert.match(msg, /466 MiB/);
  assert.match(msg, /faster-whisper/);
  assert.match(msg, /local_files_only|will not download/);
  assert.match(msg, /sherpa-onnx/);
  assert.match(msg, /tools\/live\.py models --asr=turbo/);
  assert.match(msg, /MIT/);
  assert.match(msg, /Apache-2\.0/);
  assert.match(msg, /does not download/);
  assert.doesNotMatch(msg, /api\.openai\.com/);
  const r = caption('clip.wav', { detect: () => d });
  assert.equal(r.ok, false);
  assert.equal(r.code, 2);
  assert.match(r.message, /75 MiB/);
});

test('detection order is whisper.cpp, then faster-whisper, then sherpa; a missing request does not fall through', () => {
  const kind = (p) => p === '/m/ggml-small.bin' ? 'file' : p === '/m/fw' ? 'dir' : p === '/models/sherpa-onnx-whisper-base' ? 'dir' : null;
  const env = { WHISPER_MODEL: '/m/ggml-small.bin', FASTER_WHISPER_MODEL: '/m/fw', STUDIO_MODELS: '/models' };
  const which = (n) => n === 'whisper-cli' ? '/usr/bin/whisper-cli' : null;
  const py = { faster_whisper: true, sherpa_onnx: true };
  const all = detectBackends({ which, probe: () => false, py, env, kind });
  assert.equal(all.chosen, 'whisper.cpp');
  assert.equal(all.backends.find(b => b.id === 'whisper.cpp').model, '/m/ggml-small.bin');
  assert.equal(all.backends.find(b => b.id === 'sherpa-onnx').model, 'base');
  const noCppModel = detectBackends({ which, probe: () => false, py, env: { FASTER_WHISPER_MODEL: '/m/fw', STUDIO_MODELS: '/models' }, kind });
  assert.equal(noCppModel.chosen, 'faster-whisper');
  assert.equal(noCppModel.backends.find(b => b.id === 'whisper.cpp').installed, true);
  assert.equal(noCppModel.backends.find(b => b.id === 'whisper.cpp').ready, false);
  const onlySherpa = detectBackends({ which: () => null, probe: () => false, py: { faster_whisper: false, sherpa_onnx: true }, env: { STUDIO_MODELS: '/models' }, kind });
  assert.equal(onlySherpa.chosen, 'sherpa-onnx');
  const forced = detectBackends({ which, probe: () => false, py, env, kind: (p) => p === '/m/ggml-small.bin' ? 'file' : p === '/m/fw' ? 'dir' : null, backend: 'sherpa-onnx' });
  assert.equal(forced.chosen, null, 'a requested backend that is not ready does not fall through to another');
  assert.equal(forced.backends.find(b => b.id === 'whisper.cpp').ready, true);
  const viaMain = detectBackends({ which: (n) => n === 'main' ? '/opt/whisper/main' : null, probe: (exe) => exe === '/opt/whisper/main', py: { faster_whisper: false, sherpa_onnx: false }, env: { WHISPER_MODEL: '/m/ggml-tiny.bin' }, kind: (p) => p === '/m/ggml-tiny.bin' ? 'file' : null });
  assert.equal(viaMain.chosen, 'whisper.cpp');
  assert.equal(viaMain.backends[0].exe, '/opt/whisper/main');
  const fakeMain = detectBackends({ which: (n) => n === 'main' ? '/usr/bin/main' : null, probe: () => false, py: { faster_whisper: false, sherpa_onnx: false }, env: {}, kind: () => null });
  assert.equal(fakeMain.chosen, null);
  assert.equal(fakeMain.backends[0].installed, false);
});

test('a ready backend that fails reports the failure, not the install guide', () => {
  const msg = failureText('faster-whisper', 'faster-whisper failed (1): av.open() got an unexpected keyword argument \'metadata_errors\'');
  assert.match(msg, /metadata_errors/);
  assert.match(msg, /run failure, not a missing install/);
  assert.doesNotMatch(msg, /python3 -m pip install faster-whisper/);
  assert.doesNotMatch(msg, /cmake -B build/);
  assert.doesNotMatch(msg, /hf download/);
  assert.doesNotMatch(msg, /75 MiB/);
  for (const id of ['whisper.cpp', 'sherpa-onnx']) {
    const one = failureText(id, 'boom');
    assert.match(one, /boom/);
    assert.match(one, /run failure/);
    assert.doesNotMatch(one, /Install one, then re-run/);
  }
  assert.match(FAST_PY, /import json, sys, wave/);
  assert.match(FAST_PY, /\/ np\.float32\(32768\)/);
  assert.match(FAST_PY, /vad_filter": True/);
  assert.match(FAST_PY, /model\.transcribe\(audio/);
  assert.doesNotMatch(FAST_PY, /import av|transcribe\(wav|metadata_errors|vad_filter": False/);
});
