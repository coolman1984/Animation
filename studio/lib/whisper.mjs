// One-step local captions. Backends, in order: whisper.cpp (MIT), faster-whisper (MIT), then tools/live.py
// sherpa-onnx (Apache-2.0 runtime, Whisper weights MIT). Never a cloud API. Never downloads a model.
// Word times are the engine's own when it has them (whisper.cpp -ojf tokens, faster-whisper word_timestamps).
// sherpa-onnx stays proportional inside segments; that limit is copied onto the transcript, not hidden.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { STUDIO } from './capabilities.mjs';
import { onPath, PYTHON } from './platform.mjs';
import { exportAll, fromLive, validate } from './transcript.mjs';

export const USAGE = 'usage: node studio.mjs captions <video|audio> [--lang=ar|en|auto] [--model=…] [--backend=whisper.cpp|faster-whisper|sherpa-onnx] [--out=base]';
export const BACKENDS = ['whisper.cpp', 'faster-whisper', 'sherpa-onnx'];
const SHERPA = { turbo: 'sherpa-onnx-whisper-turbo', base: 'sherpa-onnx-whisper-base', small: 'sherpa-onnx-whisper-small' };
const SHERPA_KEY = Object.fromEntries(Object.entries(SHERPA).map(([k, v]) => [v, k]));
const SPECIAL = /^\[_[A-Za-z0-9_]+\]$|^<\|[^|]*\|>$/;
const PUNCT = /^[.!?؟،,…:;؛]+$/u;
const MEDIA = /\.(wav|mp3|mp4|mov|m4a|aac|flac|ogg|webm|mkv)$/i;
const r3 = (n) => Math.round(n * 1000) / 1000;

export const WORD_TIMING = {
  cpp: 'whisper.cpp token timestamps (-ojf full JSON, real)',
  cppGap: 'proportional inside whisper.cpp segments (no token timestamps in the JSON)',
  cppMix: 'whisper.cpp token timestamps where the JSON had them; other segments proportional',
  fast: 'faster-whisper word_timestamps (real)',
  fastGap: 'proportional inside faster-whisper segments (word_timestamps missing in the JSON)',
  fastMix: 'faster-whisper word_timestamps where present; other segments proportional',
};

const INSTALL_CPP = [
  'whisper.cpp — MIT (code and Whisper weights).',
  '  git clone https://github.com/ggml-org/whisper.cpp',
  '  cd whisper.cpp && cmake -B build && cmake --build build -j --config Release',
  '  Binary: build/bin/whisper-cli (whisper-cli.exe on Windows). Older trees name it main. Put it on PATH, or set WHISPER_CPP_BIN.',
  '  Model (you download it; this command will not): sh ./models/download-ggml-model.sh small',
  '  Sizes: tiny 75 MiB, base 142 MiB, small 466 MiB, medium 1.5 GiB, large-v3 2.9 GiB, large-v3-turbo 1.5 GiB.',
  '  Then: export WHISPER_MODEL=/path/ggml-small.bin   (or pass --model=that file)',
].join('\n');
const INSTALL_FASTER = [
  'faster-whisper — MIT (code). CTranslate2 conversion of the same Whisper weights.',
  '  python3 -m pip install faster-whisper',
  '  Model (you download it; captions pass local_files_only and will not download):',
  '  python3 -m pip install -U "huggingface_hub[cli]"',
  '  hf download Systran/faster-whisper-small --local-dir studio/models/faster-whisper-small',
  '  (huggingface-cli download … is the older name of the same command.)',
  '  small is a few hundred MB; large-v3 is about 3 GB. int8 compute does not shrink the download.',
  '  Then: export FASTER_WHISPER_MODEL=studio/models/faster-whisper-small   (or pass --model=that folder)',
].join('\n');
const INSTALL_SHERPA = [
  'sherpa-onnx — Apache-2.0 runtime, Whisper weights MIT. Uses tools/live.py transcribe (needs an analysis-pack model).',
  '  python3 -m pip install sherpa-onnx onnxruntime soundfile',
  '  python3 tools/live.py models --asr=turbo',
  '  The ASR tarball is hundreds of MB (turbo, or --asr=base / --asr=small). The full live model set is about 1.4 GB.',
  '  Not run unless you ask. Word times from this backend are proportional inside segments, not forced alignment.',
].join('\n');

const kindOf = (p) => { try { const s = statSync(p); return s.isFile() ? 'file' : s.isDirectory() ? 'dir' : null; } catch { return null; } };
const hms = (s) => { const m = /^(\d+):(\d+):(\d+)[,.](\d+)$/.exec(String(s ?? '').trim()); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 10 ** m[4].length : null; };
const spanOf = (node) => {
  const o = node?.offsets;
  if (o && Number.isFinite(+o.from) && Number.isFinite(+o.to)) return [+o.from / 1000, +o.to / 1000];
  const a = hms(node?.timestamps?.from), b = hms(node?.timestamps?.to);
  return a != null && b != null ? [a, b] : null;
};
const confOf = (ps) => ps.length ? r3(ps.reduce((a, b) => a + b, 0) / ps.length) : null;
const leaf = (p) => { const b = basename(String(p || '')); return b || null; };

function pyMods() {
  const code = 'import importlib\nfor m in ("faster_whisper", "sherpa_onnx"):\n    try:\n        importlib.import_module(m); print(m)\n    except Exception:\n        pass\n';
  const r = spawnSync(PYTHON, ['-c', code], { encoding: 'utf8' });
  const got = new Set((r.stdout || '').split(/\r?\n/).filter(Boolean));
  return { faster_whisper: got.has('faster_whisper'), sherpa_onnx: got.has('sherpa_onnx') };
}
function probeWhisper(exe) {
  const r = spawnSync(exe, ['-h'], { encoding: 'utf8', timeout: 8000 });
  return /whisper/i.test(`${r.stdout || ''}\n${r.stderr || ''}`);
}
function findCpp(which, probe, env, kind) {
  const pin = env.WHISPER_CPP_BIN;
  if (pin && kind(pin) === 'file') return pin;
  const cli = which('whisper-cli');
  if (cli) return cli;
  const main = which('main');
  if (main && probe(main)) return main;
  return null;
}
function resolveModel(model, kind, backend) {
  if (!model) return null;
  const abs = resolve(model), k = kind(abs);
  if (k) return { path: abs, kind: k, sherpa: k === 'dir' ? SHERPA_KEY[basename(abs)] : null };
  // "small" is both a sherpa key and a faster-whisper name. The backend flag decides; auto means sherpa.
  if (SHERPA[model] && backend !== 'faster-whisper') return { name: model, sherpa: model };
  return { name: model };
}

// Sub-word tokens join the previous word unless the token text starts with a space (whisper.cpp's word boundary).
// Special tokens ([_BEG_], [_TT_N], <|…|>) are dropped. Bare punctuation sticks to the previous word.
export function tokensToWords(tokens) {
  const raw = []; let cur = null;
  const flush = () => { if (cur && cur.w) raw.push(cur); cur = null; };
  for (const tok of tokens || []) {
    const text = String(tok?.text ?? ''), trimmed = text.trim();
    if (!trimmed || SPECIAL.test(trimmed)) continue;
    const t = spanOf(tok), p = Number.isFinite(+tok.p) ? +tok.p : null;
    if (PUNCT.test(trimmed) && cur) { cur.w += trimmed; if (t) cur.end = t[1]; if (p != null) cur.ps.push(p); continue; }
    if (/^\s/u.test(text) || !cur) {
      flush();
      cur = { w: trimmed, start: t?.[0] ?? null, end: t?.[1] ?? null, ps: p != null ? [p] : [] };
    } else {
      cur.w += trimmed;
      if (t) { if (cur.start == null) cur.start = t[0]; cur.end = t[1]; }
      if (p != null) cur.ps.push(p);
    }
  }
  flush();
  let prev = 0;
  return raw.filter(w => w.w).map(w => {
    let start = w.start == null ? prev : w.start, end = w.end == null ? start : w.end;
    if (start < prev) start = prev;
    if (end < start) end = start;
    prev = end;
    return { w: w.w, start: r3(start), end: r3(end), conf: confOf(w.ps) };
  });
}
function spread(text, start, end) {
  const parts = String(text || '').trim().split(/\s+/u).filter(Boolean);
  const span = Math.max(0, end - start);
  return parts.map((w, i) => ({ w, start: r3(start + span * i / parts.length), end: r3(start + span * (i + 1) / parts.length), conf: null }));
}
function timingLabel(real, gap, mix, anyReal, anyGap) {
  if (anyReal && anyGap) return mix;
  return anyReal ? real : gap;
}

// whisper.cpp -oj / -ojf document: transcription[].tokens[] with offsets in milliseconds.
export function parseWhisperCpp(doc, { model } = {}) {
  const segs = [], words = []; let anyReal = false, anyGap = false;
  for (const seg of doc?.transcription || []) {
    const sp = spanOf(seg) || [0, 0];
    const text = String(seg.text || '').trim();
    segs.push({ start: r3(sp[0]), end: r3(sp[1]), text });
    if (seg.tokens?.length) { anyReal = true; words.push(...tokensToWords(seg.tokens)); }
    else if (text) { anyGap = true; words.push(...spread(text, sp[0], sp[1])); }
  }
  const named = model || doc?.params?.model || null;
  const ordered = monotonic(words);
  return {
    engine: 'whisper.cpp', model: leaf(named), lang: doc?.result?.language || doc?.params?.language || null,
    wordTiming: timingLabel(WORD_TIMING.cpp, WORD_TIMING.cppGap, WORD_TIMING.cppMix, anyReal, anyGap),
    segments: segs, words: ordered, text: ordered.map(w => w.w).join(' '),
  };
}

// JSON our faster-whisper runner writes (segment.words[].word/start/end/probability). Also accepts "text".
export function parseFasterWhisper(doc, { model } = {}) {
  const segs = [], words = []; let anyReal = false, anyGap = false;
  for (const seg of doc?.segments || []) {
    const start = +seg.start || 0, end = Number.isFinite(+seg.end) ? +seg.end : start;
    const text = String(seg.text || '').trim();
    segs.push({ start: r3(start), end: r3(end), text });
    if (seg.words?.length) {
      anyReal = true;
      for (const w of seg.words) {
        const piece = String(w.word ?? w.text ?? '').trim();
        if (!piece) continue;
        const ws = Number.isFinite(+w.start) ? +w.start : start, we = Number.isFinite(+w.end) ? +w.end : ws;
        const p = w.probability ?? w.conf;
        words.push({ w: piece, start: ws, end: we, conf: Number.isFinite(+p) ? +p : null });
      }
    } else if (text) { anyGap = true; words.push(...spread(text, start, end)); }
  }
  const ordered = monotonic(words);
  return {
    engine: 'faster-whisper', model: model || doc?.model || null, lang: doc?.language || null,
    wordTiming: timingLabel(WORD_TIMING.fast, WORD_TIMING.fastGap, WORD_TIMING.fastMix, anyReal, anyGap),
    segments: segs, words: ordered, text: ordered.map(w => w.w).join(' '),
  };
}
function monotonic(words) {
  let prev = 0;
  return words.filter(w => w.w).map(w => {
    let start = Number.isFinite(+w.start) ? +w.start : prev, end = Number.isFinite(+w.end) ? +w.end : start;
    if (start < prev) start = prev;
    if (end < start) end = start;
    prev = end;
    return { w: w.w, start: r3(start), end: r3(end), conf: w.conf == null || !Number.isFinite(+w.conf) ? null : r3(+w.conf) };
  });
}

export function detectBackends({ which = onPath, probe = probeWhisper, py = null, env = process.env, kind = kindOf, backend = null, model = null, modelsDir = null } = {}) {
  const root = modelsDir || env.STUDIO_MODELS || join(STUDIO, 'models');
  const mods = py || pyMods();
  const asked = resolveModel(model, kind, backend);
  const exe = findCpp(which, probe, env, kind);
  const cppFile = asked?.kind === 'file' ? asked.path : (env.WHISPER_MODEL && kind(resolve(env.WHISPER_MODEL)) === 'file' ? resolve(env.WHISPER_MODEL) : null);
  const fastDir = asked?.kind === 'dir' && !asked.sherpa ? asked.path : (env.FASTER_WHISPER_MODEL && kind(resolve(env.FASTER_WHISPER_MODEL)) === 'dir' ? resolve(env.FASTER_WHISPER_MODEL) : null);
  const fastName = !fastDir && asked?.name && !asked.sherpa ? asked.name : null;
  const sherpaWant = asked?.sherpa || null;
  const sherpaHit = (sherpaWant ? [sherpaWant] : Object.keys(SHERPA)).find(k => kind(join(root, SHERPA[k])) === 'dir') || null;

  const cpp = { id: 'whisper.cpp', licence: 'MIT', exe, model: cppFile, installed: !!exe, ready: !!exe && !!cppFile };
  cpp.detail = !exe ? 'whisper-cli / main not on PATH' : cppFile ? `model ${cppFile}` : 'binary found, no model file (--model= or WHISPER_MODEL)';
  const fast = { id: 'faster-whisper', licence: 'MIT', exe: null, model: fastDir || (backend === 'faster-whisper' ? fastName : null), installed: !!mods.faster_whisper };
  fast.ready = fast.installed && !!(fastDir || (backend === 'faster-whisper' && fastName));
  fast.detail = !fast.installed ? 'faster-whisper is not importable' : fast.model ? `model ${fast.model}` : 'package installed, no local model directory (FASTER_WHISPER_MODEL or --model=)';
  const sherpa = { id: 'sherpa-onnx', licence: 'Apache-2.0 runtime, Whisper weights MIT', exe: null, model: sherpaHit, installed: !!mods.sherpa_onnx, ready: !!mods.sherpa_onnx && !!sherpaHit };
  sherpa.detail = !sherpa.installed ? 'sherpa_onnx is not importable' : sherpaHit ? `model ${sherpaHit} in ${root}` : 'package installed, no ASR model (python3 tools/live.py models --asr=turbo)';
  const backends = [cpp, fast, sherpa];
  const known = !backend || BACKENDS.includes(backend);
  const named = backend ? backends.find(b => b.id === backend) : null;
  const chosen = !known || (named && !named.ready) ? null : (named ? named.id : backends.find(b => b.ready)?.id || null);
  return { chosen, backend, backends, modelsDir: root };
}

export function installText(det) {
  const lines = ['No local Whisper backend is ready. Captions stay on this machine: no cloud API, and this command does not download models.'];
  if (det.backend && !BACKENDS.includes(det.backend)) lines.push(`Unknown --backend=${det.backend}. Use ${BACKENDS.join(', ')}.`);
  else if (det.backend) lines.push(`Requested backend ${det.backend} is not ready.`);
  for (const b of det.backends || []) lines.push(`- ${b.id}: ${b.detail}`);
  lines.push('', 'Install one, then re-run. You run these; nothing here downloads a model.', '', INSTALL_CPP, '', INSTALL_FASTER, '', INSTALL_SHERPA);
  return lines.join('\n');
}

// A chosen backend is already installed. A later failure is a run error, not a missing install.
const RUN_HINT = {
  'whisper.cpp': 'whisper.cpp is installed. This is a run failure, not a missing install.',
  'faster-whisper': 'faster-whisper is installed. This is a run failure, not a missing install.',
  'sherpa-onnx': 'sherpa-onnx is installed. This is a run failure, not a missing install.',
};
export function failureText(backend, message) {
  return `${message}\n${RUN_HINT[backend] || 'The backend is installed. This is a run failure, not a missing install.'}`;
}

function fail(cmd, r) {
  const tail = `${r.stderr || ''}\n${r.stdout || ''}`.trim().slice(-600);
  return new Error(`${cmd} failed (${r.status}): ${tail}`);
}
function extractWav(src, dest) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', dest], { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error(`ffmpeg could not extract 16 kHz mono WAV (core profile). ${(r.stderr || r.error?.message || '').slice(-400)}`);
}
function runCpp(exe, model, wav, lang, dir) {
  const base = join(dir, 'cpp');
  // -p 1: token timestamps reset at chunk boundaries when processors > 1 (ggml-org/whisper.cpp#2702).
  const r = spawnSync(exe, ['-m', model, '-f', wav, '-l', lang, '-oj', '-ojf', '-of', base, '-np', '-p', '1'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw fail(exe, r);
  const file = base + '.json';
  const doc = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : JSON.parse((r.stdout || '').trim());
  return parseWhisperCpp(doc, { model: leaf(model) });
}
// ffmpeg already wrote 16 kHz mono pcm_s16le. Decode that WAV here so transcribe() never
// calls PyAV (av>=16 crashes on metadata_errors; av<16 is unused either way).
// Float32 samples are int16 / 32768. Silero VAD ships inside faster-whisper; leave it on
// or a music-only clip is transcribed as speech ("Thanks for watching!").
export const FAST_PY = `
import json, sys, wave
import numpy as np
from faster_whisper import WhisperModel
name, wav, lang, out = sys.argv[1:5]
with wave.open(wav, "rb") as w:
    if w.getnchannels() != 1 or w.getsampwidth() != 2 or w.getframerate() != 16000:
        raise SystemExit("expected 16 kHz mono pcm_s16le WAV")
    pcm = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2")
audio = np.ascontiguousarray(pcm, dtype=np.float32) / np.float32(32768)
model = WhisperModel(name, device="cpu", compute_type="int8", local_files_only=True)
kw = {"word_timestamps": True, "vad_filter": True}
if lang and lang != "auto":
    kw["language"] = lang
segments, info = model.transcribe(audio, **kw)
doc = {"language": info.language, "language_probability": getattr(info, "language_probability", None),
       "duration": getattr(info, "duration", None), "model": name, "segments": []}
for s in segments:
    doc["segments"].append({"id": s.id, "start": s.start, "end": s.end, "text": s.text,
        "words": [{"word": w.word, "start": w.start, "end": w.end, "probability": w.probability} for w in (s.words or [])]})
json.dump(doc, open(out, "w", encoding="utf-8"), ensure_ascii=False)
`;
function runFaster(model, wav, lang, dir) {
  const out = join(dir, 'faster.json');
  const r = spawnSync(PYTHON, ['-c', FAST_PY, model, wav, lang, out], { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw fail('faster-whisper', r);
  return parseFasterWhisper(JSON.parse(readFileSync(out, 'utf8')), { model: leaf(model) || model });
}
function runSherpa(modelKey, wav, lang, dir, src) {
  const pack = join(dir, 'pack');
  mkdirSync(pack);
  writeFileSync(join(pack, 'pack.json'), JSON.stringify({ source: src, fps: 1, frames: 1, w: 1, h: 1, duration: 0, audio: true }));
  const r = spawnSync(PYTHON, [join(STUDIO, 'tools', 'live.py'), 'transcribe', pack, `--lang=${lang}`, `--model=${modelKey}`, `--wav=${wav}`], { encoding: 'utf8', cwd: STUDIO });
  if (r.error || r.status !== 0) throw fail('tools/live.py transcribe', r);
  const doc = JSON.parse(readFileSync(join(pack, 'transcript.json'), 'utf8'));
  return { ...doc, engine: 'whisper (sherpa-onnx)' };
}

// Returns { ok, code, message?, backend?, model?, wordTiming?, transcript?, files? }. Does not download.
export function caption(src, opt = {}) {
  const lang = opt.lang || 'auto';
  if (!['ar', 'en', 'auto'].includes(lang)) return { ok: false, code: 2, message: `${USAGE}\nlang must be ar, en or auto` };
  const det = (opt.detect || detectBackends)({ backend: opt.backend || null, model: opt.model || null, env: opt.env, which: opt.which, probe: opt.probe, py: opt.py, kind: opt.kind, modelsDir: opt.modelsDir });
  if (!det.chosen) return { ok: false, code: 2, message: installText(det) };
  if (!src || !existsSync(src)) return { ok: false, code: 2, message: `no such file: ${src || '(missing)'}\n${USAGE}` };
  const picked = det.backends.find(b => b.id === det.chosen);
  const dir = mkdtempSync(join(tmpdir(), 'whisper-'));
  try {
    const wav = join(dir, 'audio16k.wav');
    extractWav(src, wav);
    const live = det.chosen === 'whisper.cpp' ? runCpp(picked.exe, picked.model, wav, lang, dir)
      : det.chosen === 'faster-whisper' ? runFaster(picked.model, wav, lang, dir)
        : runSherpa(picked.model, wav, lang, dir, src);
    const t = fromLive(live, { file: src });
    const errs = validate(t);
    if (errs.length) return { ok: false, code: 1, message: `transcript failed validation: ${errs.join('; ')}` };
    const base = opt.out || src.replace(MEDIA, '');
    const files = exportAll(t, base);
    return { ok: true, code: 0, backend: t.source.engine, model: t.source.model, wordTiming: t.source.wordTiming, transcript: t, files };
  } catch (e) {
    return { ok: false, code: 2, message: failureText(det.chosen, e.message) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
