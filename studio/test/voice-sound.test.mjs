// Voice & sound department, colour helpers, review server: fast checks (no TTS, no browser; one tiny HTTP server).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as T from '../lib/transcript.mjs';
import { applyLexicon, direct, validateVoices, checkUse, loadVoices, validateScript } from '../lib/voice.mjs';
import { validateSounds, loadSounds, searchSounds } from '../lib/sounds.mjs';
import { deltaE } from '../lib/color.mjs';
import { reviewServer } from '../lib/review-server.mjs';

const live = { model: 'sherpa-onnx-whisper-turbo', lang: 'ar', wordTiming: 'proportional', segments: [{ start: 0, end: 2.4, text: '' }, { start: 3, end: 4.6, text: '' }],
  words: [{ w: 'يعني', start: 0, end: 0.3, speaker: 'S1' }, { w: 'كل', start: 0.35, end: 0.6, speaker: 'S1' }, { w: 'فكرة', start: 0.65, end: 1.0, speaker: 'S1' }, { w: 'كل', start: 1.1, end: 1.3, speaker: 'S1' }, { w: 'فكرة', start: 1.35, end: 1.7, speaker: 'S1' }, { w: 'عظيمة.', start: 1.75, end: 2.4, speaker: 'S1' },
    { w: 'Every', start: 3.0, end: 3.3, speaker: 'S2' }, { w: 'great', start: 3.35, end: 3.7, speaker: 'S2' }, { w: 'idea.', start: 3.75, end: 4.6, speaker: 'S2' }] };

test('canonical transcript: mixed language, sentences by speaker/pause, fillers, repeats, cut points, search, layers', () => {
  const t = T.fromLive(live);
  assert.deepEqual(T.validate(t), []);
  assert.equal(t.language, 'mixed');
  assert.deepEqual(t.sentences.map(s => s.speaker), ['S1', 'S2']);
  assert.equal(T.fillers(t)[0].w, 'يعني');
  assert.equal(T.repeats(t)[0].phrase, 'كل فكرة', 'a restart is detected');
  assert.ok(T.cutPoints(t)[0].gap >= 0.6, 'the longest breath gap comes first');
  assert.equal(T.find(t, 'great idea').length, 1);
  T.addLayer(t, 'en', 'translation', 'ar', { s1: 'Every great idea.' });
  assert.deepEqual(T.coverage(t, 'en').missing, ['s2'], 'untranslated sentences are reported, never filled with the original');
  const before = t.words.length; T.correct(t, 's1', 'كل فكرة عظيمة.', 'test');
  assert.equal(t.corrections.length, 1); assert.ok(t.words.length < before);
  assert.match(T.toSRT(T.bilingual(t, 'en')), /‫.*‬\nEvery great idea\./u, 'RTL mark per line: the English line stays LTR');
  assert.match(T.toVTT(T.cues(t, { by: 'sentences' })), /^WEBVTT/);
  assert.match(T.toASS(T.cues(t)), /Dialogue: 0,0:00:00\.00/);
  assert.deepEqual(T.keepSentences(t, ['s2']).keep.length, 1);
});

test('voice: lexicon changes only spoken text, performance maps to providers, registry and consent rules', () => {
  assert.equal(applyLexicon('مرحبا في Pixel Plus و AI', 'ar'), 'مرحبا في بِكسِل بلَس و إيه آي');
  assert.equal(applyLexicon('PAID is not AI', 'en'), 'PAID is not A.I.', 'case-sensitive acronyms only match whole words');
  const d = direct({ style: 'egyptian-commercial', pace: 1.4, energy: 'high', emphasis: ['واحد'] });
  assert.equal(d.pace, 1.25, 'pace is clamped to a natural range'); assert.match(d.instructions, /Egyptian/); assert.equal(d.elevenlabs.stability, 0.3);
  assert.deepEqual(validateVoices(loadVoices()), []);
  assert.ok(validateVoices({ voices: [{ id: 'x', provider: 'openai', voiceId: 'v', language: 'ar', source: 's', rights: 'r', quality: 'production', commercial: true, clone: true }] }).some(e => /consent/.test(e)));
  assert.throws(() => checkUse({ id: 'hoda', commercial: false, rights: 'draft' }, 'final'), /not cleared/);
  assert.deepEqual(validateScript({ lines: [{ id: 'a', t: 1, text: 'x' }, { id: 'b', t: 0.5, text: 'y' }] }, 10), ['b: lines must be ordered by t']);
});

test('sound library entries carry rights; colour ΔE is sane', () => {
  assert.deepEqual(validateSounds(loadSounds()), []);
  assert.ok(searchSounds('room-tone').length >= 1);
  assert.ok(validateSounds({ categories: ['impact'], entries: [{ id: 'x', category: 'impact', kind: 'file', path: 'nope.wav' }] }, { checkFiles: false }).some(e => /rights/.test(e)));
  assert.equal(deltaE([128, 128, 128], [128, 128, 128]), 0);
  assert.ok(deltaE([255, 0, 0], [0, 0, 255]) > 50);
});

test('review server: range requests for seeking, notes and approval bound to the file hash', async () => {
  const root = mkdtempSync(join(tmpdir(), 'review-')); mkdirSync(join(root, 'take01'));
  writeFileSync(join(root, 'take01', 'v.mp4'), Buffer.alloc(1000, 7));
  const srv = await reviewServer(root), base = `http://127.0.0.1:${srv.port}`;
  try {
    const r = await fetch(`${base}/take01/v.mp4`, { headers: { range: 'bytes=10-19' } });
    assert.equal(r.status, 206); assert.equal((await r.arrayBuffer()).byteLength, 10);
    const post = (p, b) => fetch(`${base}/take01/review/api/${p}`, { method: 'POST', body: JSON.stringify(b) }).then(x => x.json());
    await post('notes', { video: 'take01/v.mp4', notes: [{ t: 1, severity: 'major', text: 'x' }] });
    const a = await post('approve', { video: 'take01/v.mp4', reviewer: 'QA' });
    assert.equal(a.approval.sha256, a.sha256); assert.equal(a.notes.length, 1);
    writeFileSync(join(root, 'take01', 'v.mp4'), Buffer.alloc(1000, 8));
    const s = await fetch(`${base}/take01/review/api/state?video=take01/v.mp4`).then(x => x.json());
    assert.notEqual(s.approval.sha256, s.sha256, 'a changed export no longer matches its approval');
    assert.equal((await fetch(`${base}/take01/review/api/state?video=../x.mp4`)).status, 404);
  } finally { srv.close(); rmSync(root, { recursive: true, force: true }); }
});
