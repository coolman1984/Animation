#!/usr/bin/env node
// Text → short film. A verse, a quote or a small story + a look → films/<film>/spec.json (+ voice.wav), ready for run.mjs.
//   node studio-engine/story.mjs <film> --text="…" | --file=story.txt  [--look=watercolour|oil|crayon|ink|storybook]
//        [--format=reel|youtube|square] [--voice=auto|local|azure|elevenlabs|openai|windows|none] [--title="…"] [--bpm=80] [--seed=7]
// Then: node studio-engine/run.mjs <film> --stage=stills  (look at the sheet)  →  node studio-engine/run.mjs <film>  (the film).
// One line of text = one painted scene; its composition comes from the words (rain, sea, mountain, night, road … in Arabic or English).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { compose } from './lib/painted.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const LOOKS = ['watercolour', 'oil', 'crayon', 'ink', 'storybook'];

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

export function storySpec({ lines, look = 'watercolour', format = 'reel', title, bpm = 80, seed = 7, durations, voice }) {
  if (!LOOKS.includes(look)) throw new Error(`look must be one of ${LOOKS.join(', ')}`);
  let prev = {};
  const scenes = lines.map((line, i) => {
    const scene = compose(line, prev); prev = scene;
    const sec = durations?.[i] != null ? durations[i] + 0.9 : readSeconds(line);
    const titled = i === 0 && !!title;
    const elements = [{ type: 'painted', look, scene, seed: seed + i, text: line }, { type: 'caption', text: line, at: titled ? 3 : 0.5, voiceLine: i }];
    if (titled) elements.push({ type: 'words', text: title, size: 150, y: 0.42, at: 0, out: 2.5, style: 'rise', weight: 800, shadow: '0 2px 30px rgba(0,0,0,0.55)' });
    return { id: `s${i + 1}`, beats: beatsFor(sec + (i === 0 && title ? 2.2 : 0), bpm), music: i === lines.length - 1 && lines.length > 2 ? 'finale' : 'verse', transition: i ? 'fade' : 'cut', elements };
  });
  const spec = { title: title || lines[0].slice(0, 60), format, bpm, shake: 0, grid: false, vignette: true, background: 'ink',
    music: { progression: ['Am', 'F', 'C', 'G'], final: 'C' }, direction: `text-to-short: ${look}, one painted scene per narrated line`, scenes };
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
  if (!film || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(film)) { console.log('usage: node studio-engine/story.mjs <film> --text="…"|--file=… [--look=…] [--format=reel|youtube|square] [--voice=auto|local|azure|none] [--title=…]'); process.exit(2); }
  const text = opt.file ? readFileSync(resolve(opt.file), 'utf8') : opt.text;
  const lines = splitLines(text), bpm = +(opt.bpm || 80), dir = join(HERE, 'films', film); mkdirSync(dir, { recursive: true });
  const base = { lines, look: opt.look || 'watercolour', format: opt.format || 'reel', title: opt.title, bpm, seed: +(opt.seed || 7) };
  let spec = storySpec(base), note = 'no voice (captions are timed by reading speed)';
  const provider = opt.voice || 'auto';
  if (provider !== 'none') {
    try { const n = await narrate(lines, provider, dir, bpm, (durations) => storySpec({ ...base, durations, voice: 'voice.wav' })); spec = n.spec; note = `voice: ${n.voices[0].voice} (${n.voices[0].provider})`; }
    catch (error) { note = `no voice: ${error.message.split('\n')[0]} — captions are timed by reading speed`; }
  }
  writeFileSync(join(dir, 'story.json'), JSON.stringify({ text, ...base, voice: provider, note, made: new Date().toISOString() }, null, 2) + '\n');
  writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec, null, 2) + '\n');
  const sec = spec.scenes.reduce((s, x) => s + x.beats, 0) * 60 / bpm;
  console.log(`[story] ${film}: ${lines.length} scenes, ${sec.toFixed(1)} s, ${base.look}, ${base.format} · ${note}`);
  console.log(`[story] next: node studio-engine/run.mjs ${film} --stage=stills   then   node studio-engine/run.mjs ${film}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error('[story]', e.message); process.exit(1); });
