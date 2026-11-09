#!/usr/bin/env node
// Text → short film. A verse, a quote or a small story + a look → films/<film>/spec.json (+ voice.wav), ready for run.mjs.
//   node studio-engine/story.mjs <film> --text="…" | --file=story.txt  [--look=watercolour|oil|crayon|ink|storybook]
//        [--format=reel|youtube|square] [--voice=auto|local|azure|elevenlabs|openai|windows|none] [--title="…"] [--bpm=80] [--seed=7]
// Then: node studio-engine/run.mjs <film> --stage=stills  (look at the sheet)  →  node studio-engine/run.mjs <film>  (the film).
// One line of text = one painted scene; its composition comes from the words (rain, sea, mountain, night, road … in Arabic or English).
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { compose, chunkLine } from './lib/painted.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const LOOKS = ['watercolour', 'oil', 'gouache', 'pastel', 'crayon', 'ink', 'storybook', 'flat'];

// split into narrated lines: the author's own line breaks win; one paragraph is cut at sentence ends, long sentences at commas
export function splitLines(text, maxWords = 14) {
  const raw = String(text || '').replace(/\r/g, '').trim();
  if (!raw) throw new Error('no text: pass --text="…" or --file=story.txt');
  let lines = raw.includes('\n') ? raw.split(/\n+/) : raw.split(/(?<=[.!?؟。!…])\s+|(?<=[.!?؟])(?=\S)/);
  lines = lines.map((l) => l.trim()).filter(Boolean).flatMap((l) => {
    const w = l.split(/\s+/); if (w.length <= maxWords) return [l];
    const parts = l.split(/(?<=[,،؛;:])\s+/); if (parts.length > 1) return parts.map((p) => p.trim()).filter(Boolean);
    const out = []; for (let i = 0; i < w.length; i += maxWords) out.push(w.slice(i, i + maxWords).join(' ')); return out;
  });
  return lines;
}
// seconds a line needs on screen without a voice: ~2.4 spoken words per second + a breath
export const readSeconds = (line) => Math.max(2.6, line.split(/\s+/).length / 2.4 + 0.9);
const beatsFor = (sec, bpm) => Math.max(2, Math.ceil((sec / (60 / bpm)) * 2) / 2);

const MOVE_CYCLE = ['push', 'pan-left', 'rise', 'pull', 'pan-right', 'drift'];
// how many shots a line gets: a new picture every ~1.5–3 s, cut on the caption chunks (at most 3 per line)
export function shotsFor(line, sec) { const n = chunkLine(line).length; return Math.max(1, Math.min(3, n, Math.floor(sec / 1.6))); }

// the owner's own recording: find where each line starts in the transcript (lines are said in order, word counts match)
// Matched by the WORDS, not only counted (audit R13o): one extra or missing recognised word used to shift every later line.
const norm = (w) => String(w || '').toLowerCase().normalize('NFC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}]/gu, '');
export function lineSpans(words, lines) {
  const W = words.filter((w) => Number.isFinite(w.start ?? w.t)), T = W.map((w) => norm(w.w ?? w.word ?? w.text)); let wi = 0;
  return lines.map((line, li) => {
    const L = line.split(/\s+/).filter(Boolean).map(norm), n = L.length;
    // best start near the expected place: the most line words found in order in the next n + 3 recognised words
    let best = Math.min(wi, Math.max(0, W.length - 1)), bestScore = -1;
    if (T.some(Boolean)) for (let s = Math.max(0, wi - 3); s <= Math.min(W.length - 1, wi + 4); s++) {
      let k = 0, hit = 0; for (let j = s; j < Math.min(W.length, s + n + 3) && k < n; j++) if (T[j] && T[j] === L[k]) { hit++; k++; } else if (T[j] && L.indexOf(T[j], k) > k) { k = L.indexOf(T[j], k) + 1; hit++; }
      const score = hit - 0.01 * Math.abs(s - wi); if (score > bestScore) { bestScore = score; best = s; }
    }
    // the line ends where its last word was heard; else at the count
    let end = Math.min(best + n - 1, W.length - 1);
    for (let j = Math.min(W.length - 1, best + n + 2); j >= best; j--) if (T[j] && T[j] === L[n - 1]) { end = j; break; }
    const next = li < lines.length - 1 ? end + 1 : W.length; wi = next;
    const a = W[best], b = W[end];
    return { start: a.start ?? a.t, end: b.end ?? (b.start ?? b.t) + 0.3 };
  });
}

export function storySpec({ lines, look = 'watercolour', lookWords = '', format = 'reel', title, bpm = 80, seed = 7, durations, seconds, voice, captions = 'plain', plan = [] }) {
  if (!LOOKS.includes(look)) throw new Error(`look must be one of ${LOOKS.join(', ')}`);
  let prev = {}, mv = 0, cum = 0, cumBeats = 0;
  const B = 60 / bpm;
  const scenes = lines.map((line, i) => {
    const scene = compose(line, prev); prev = scene;
    const titled = i === 0 && !!title;
    let beats;
    if (seconds) { cum += seconds[i]; const endBeats = Math.max(cumBeats + 2, Math.round((cum / B) * 4) / 4); beats = endBeats - cumBeats; cumBeats = endBeats; }   // exact, no drift
    else beats = beatsFor((durations?.[i] != null ? durations[i] + 0.9 : readSeconds(line)) + (titled ? 2.2 : 0), bpm);
    const sec = beats * B;
    // shots: the plan's own (draw = a function in scenes.js, scene = a description), else the line's scene and its close-up
    const given = plan[i]?.shots, n = given?.length || shotsFor(line, sec);
    const lead = seconds ? (i === 0 ? Math.max(0, Math.round((seconds.lead ?? 0) / B * 4) / 4) : 0) : titled ? 3 : 0.5, span = beats - lead, chars = chunkLine(line).map((c) => c.length + 2), tot = chars.reduce((x, y) => x + y, 0);
    let acc = 0; const cuts = [0, ...chars.map((c) => { acc += c; return acc / tot; })];
    const at = (j) => (j === 0 ? 0 : Math.round((lead + span * 0.9 * cuts[Math.round((j * (cuts.length - 1)) / n)]) * 4) / 4);
    const shots = Array.from({ length: n }, (_, j) => {
      const g = given?.[j] || {}, out = j < n - 1 ? at(j + 1) : null;
      return { type: 'painted', look, lookWords, seed: seed + i * 7 + j, text: line, ...(g.draw ? { draw: g.draw } : { scene: g.scene || (j % 2 ? { ...scene, close: !!scene.figure, sky: scene.sky } : scene) }),
        move: g.move || MOVE_CYCLE[mv++ % MOVE_CYCLE.length], ...(j ? { at: at(j) } : {}), ...(out != null ? { out } : {}) };
    });
    const elements = [...shots, { type: 'caption', text: line, at: lead, voiceLine: i, style: captions }];
    if (titled) elements.push({ type: 'words', text: title, size: 150, y: 0.42, at: 0, out: 2.5, style: 'rise', weight: 800, shadow: '0 2px 30px rgba(0,0,0,0.55)' });
    return { id: `s${i + 1}`, beats, music: i === lines.length - 1 && lines.length > 2 ? 'finale' : 'verse', transition: plan[i]?.transition || (i ? 'cut' : 'cut'), elements };
  });
  const spec = { title: title || lines[0].slice(0, 60), format, bpm, shake: 0, grid: false, vignette: true, background: 'ink', gpu: true,
    music: { progression: ['Am', 'F', 'C', 'G'], final: 'C' }, direction: `text-to-short: ${look}, painted shots cut on the caption chunks`, scenes };
  spec.scenes.at(-1).transition = lines.length > 1 ? 'fade' : 'cut';
  if (voice) spec.audio = { voice, voiceRights: 'studio-generated narration' };
  return spec;
}

async function narrate(lines, provider, dir, bpm, specOf) {
  const { generate } = await import('../lib/voice.mjs');
  const jobs = lines.map((text, i) => ({ id: `l${i + 1}`, text, language: /[؀-ۿ]/.test(text) ? 'ar' : 'en', provider, out: join(dir, 'voice', `l${i + 1}.wav`), performance: { style: 'reflective', pace: 0.95 } }));
  const res = await generate(jobs, { mode: 'draft' });
  const durations = res.map((r) => r.duration), spec = specOf(durations);
  // one narration track on the film clock: each line starts 0.25 s after its scene does
  const B = 60 / bpm; let beat = 0; const starts = spec.scenes.map((s) => { const a = beat * B; beat += s.beats; return a + 0.25; });
  const inputs = res.flatMap((r) => ['-i', r.file]), delays = res.map((_, i) => `[${i}:a]aresample=48000,adelay=${Math.round(starts[i] * 1000)}:all=1[v${i}]`).join(';');
  const mix = `${delays};${res.map((_, i) => `[v${i}]`).join('')}amix=inputs=${res.length}:normalize=0[out]`;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', mix, '-map', '[out]', '-ac', '1', join(dir, 'voice.wav')], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('voice mix failed: ' + (r.stderr || r.error?.message));
  return { spec, voices: res };
}

async function main() {
  const [film, ...flags] = process.argv.slice(2);
  const opt = Object.fromEntries(flags.map((f) => { const m = /^--([a-z]+)=(.*)$/s.exec(f); if (!m) throw new Error(`bad flag ${f}`); return [m[1], m[2]]; }));
  if (!film || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(film)) { console.log('usage: node studio-engine/story.mjs <film> --text="…"|--file=… [--look=…] [--style="words about the look"] [--format=reel|youtube|square|post] [--voice=auto|local|azure|none] [--recording=my-voice.m4a] [--captions=plain|box] [--plan=plan.json] [--title=…]'); process.exit(2); }
  const text = opt.file ? readFileSync(resolve(opt.file), 'utf8') : opt.text;
  const lines = splitLines(text), bpm = +(opt.bpm || 80), dir = join(HERE, 'films', film); mkdirSync(dir, { recursive: true });
  // plan.json (optional): [{ shots: [{ draw: "name in scenes.js" | scene: {…}, move }], transition }] per line
  const plan = opt.plan ? JSON.parse(readFileSync(resolve(opt.plan), 'utf8')) : existsSync(join(dir, 'plan.json')) ? JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8')) : [];
  const base = { lines, look: opt.look || 'watercolour', lookWords: opt.style || '', format: opt.format || 'reel', title: opt.title, bpm, seed: +(opt.seed || 7), captions: opt.captions || 'plain', plan };
  let spec = storySpec(base), note = 'no voice (captions are timed by reading speed)';
  const provider = opt.recording ? 'recording' : opt.voice || 'auto';
  if (opt.recording) {
    // their own voice: copy it in, transcribe for word times, cut the scenes where each line starts
    const src = resolve(opt.recording), dst = join(dir, 'voice' + extname(src)); copyFileSync(src, dst);
    const { voiceWords } = await import('./lib/analyze.mjs'), w = voiceWords(dst, join(dir, 'voice-words'));
    if (w?.error) throw new Error(`cannot time the recording: ${w.error}`);
    const spans = lineSpans((w.words || w).map((x) => ({ start: x.start ?? x.t, end: x.end, w: x.w ?? x.word ?? x.text })), lines);
    const seconds = spans.map((sp, i) => (i < spans.length - 1 ? spans[i + 1].start - sp.start : sp.end - sp.start + 1.2)); seconds[0] += spans[0].start; seconds.lead = spans[0].start;
    spec = storySpec({ ...base, title: undefined, seconds, voice: basename(dst) }); note = `voice: the owner's recording (${lines.length} lines aligned)`;
  } else if (provider !== 'none') {
    try { const n = await narrate(lines, provider, dir, bpm, (durations) => storySpec({ ...base, durations, voice: 'voice.wav' })); spec = n.spec; note = `voice: ${n.voices[0].voice} (${n.voices[0].provider})`; }
    catch (error) {
      // A named provider that fails is an error; `auto` may fall back to captions only, but says so loudly and in the spec (audit R13p).
      if (provider !== 'auto') throw new Error(`narration with ${provider} failed: ${error.message.split('\n')[0]} (use --voice=none for a captions-only film)`);
      note = `NO VOICE: ${error.message.split('\n')[0]}; captions are timed by reading speed`; spec.narration = note; console.warn(`[story] ${note}`);
    }
  }
  writeFileSync(join(dir, 'story.json'), JSON.stringify({ text, ...base, plan: undefined, voice: provider, note, made: new Date().toISOString() }, null, 2) + '\n');
  writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec, null, 2) + '\n');
  const sec = spec.scenes.reduce((s2, x) => s2 + x.beats, 0) * 60 / bpm, shots = spec.scenes.reduce((s2, x) => s2 + x.elements.filter((e) => e.type === 'painted').length, 0);
  console.log(`[story] ${film}: ${lines.length} lines, ${shots} shots, ${sec.toFixed(1)} s, ${base.look}, ${base.format} · ${note}`);
  console.log(`[story] next: node studio-engine/run.mjs ${film} --stage=stills   then   node studio-engine/fast.mjs ${film}  (quick)  or  node studio-engine/run.mjs ${film}  (every gate)`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error('[story]', e.message); process.exit(1); });
