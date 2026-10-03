// Voice studio: provider-neutral speech generation with performance direction, a pronunciation lexicon, a voice registry
// with rights/consent, and timing fit for dubbing. The studio never NEEDS a cloud service: offline providers always work.
//
//   generate({ text, language: 'ar'|'en', dialect, voice, performance, provider: 'auto'|<id>, out, mode: 'draft'|'final' })
//
// Providers (VOICE_PROVIDERS below):
//   windows  offline, built into Windows (Microsoft Hoda ar-EG, David/Zira en-US …). Drafts and timing.
//   local    offline sherpa-onnx Piper (ar_JO-kareem) via tools/live.py tts --each. Drafts and timing.
//   openai   gpt-4o-mini-tts: `instructions` steer tone, pace and emotion. Needs OPENAI_API_KEY.
//   elevenlabs  multilingual voices incl. Arabic variants; voice_settings for stability/style. Needs ELEVENLABS_API_KEY.
//   azure    neural voices incl. ar-EG-SalmaNeural / ar-EG-ShakirNeural with SSML prosody. Needs AZURE_SPEECH_KEY + AZURE_SPEECH_REGION.
// Cloud adapters follow the providers' public REST APIs; they are UNVERIFIED here until run with a real key (capabilities.json).
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, renameSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { run } from './render.mjs';
import { PYTHON, WINDOWS, onPath } from './platform.mjs';

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const VOICES_FILE = join(STUDIO, 'voice', 'voices.json');
export const LEXICON_FILE = join(STUDIO, 'voice', 'lexicon.json');
export const loadVoices = () => JSON.parse(readFileSync(VOICES_FILE, 'utf8'));
export const loadLexicon = () => JSON.parse(readFileSync(LEXICON_FILE, 'utf8'));

export const VOICE_PROVIDERS = {
  windows: { offline: true, ready: () => WINDOWS },
  local: { offline: true, ready: () => existsSync(join(STUDIO, 'models', 'vits-piper-ar_JO-kareem-medium')) },
  openai: { offline: false, ready: () => !!process.env.OPENAI_API_KEY },
  elevenlabs: { offline: false, ready: () => !!process.env.ELEVENLABS_API_KEY },
  azure: { offline: false, ready: () => !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) },
};

// ---------- registry, rights and consent ----------
// Every production voice has an entry: provider, voiceId, language, dialect, source, rights, commercial, ownership, consent, quality.
export function validateVoices(reg) {
  const e = [], ids = new Set();
  for (const v of reg.voices || []) {
    if (!v.id || ids.has(v.id)) e.push(`duplicate or missing voice id ${v.id}`); ids.add(v.id);
    if (!VOICE_PROVIDERS[v.provider]) e.push(`${v.id}: unknown provider ${v.provider}`);
    for (const k of ['voiceId', 'language', 'source', 'rights', 'quality']) if (!v[k]) e.push(`${v.id}: ${k} required`);
    if (typeof v.commercial !== 'boolean') e.push(`${v.id}: commercial must be true/false`);
    if (v.clone && !(v.consent?.granted === true && v.consent.by && v.consent.date && v.consent.scope)) e.push(`${v.id}: a cloned voice needs recorded consent {granted, by, date, scope}`);
  }
  return e;
}
// Pick a voice: explicit id, else the best ready one for language/dialect (final prefers commercial production quality).
export function pickVoice({ voice, language, dialect, mode = 'draft', provider = 'auto' }, reg = loadVoices()) {
  if (voice) { const v = reg.voices.find(x => x.id === voice); if (!v) throw new Error(`unknown voice ${voice} (voice/voices.json)`); return v; }
  const rank = { production: 0, good: 1, draft: 2 };
  const cands = reg.voices.filter(v => v.language === language && (provider === 'auto' || v.provider === provider) && VOICE_PROVIDERS[v.provider].ready() && !v.clone)
    .sort((a, b) => (mode === 'final' ? rank[a.quality] - rank[b.quality] : 0) + (a.dialect === dialect ? -0.5 : 0) - (b.dialect === dialect ? -0.5 : 0) + (mode === 'draft' ? (VOICE_PROVIDERS[b.provider].offline - VOICE_PROVIDERS[a.provider].offline) : 0));
  if (!cands.length) throw new Error(`no ready voice for ${language}${dialect ? '/' + dialect : ''} (provider ${provider}); see voice/voices.json and API keys`);
  return cands[0];
}
export function checkUse(v, mode) {
  if (v.clone && v.consent?.granted !== true) throw new Error(`${v.id}: cloned voice without recorded consent is refused`);
  if (mode === 'final' && !v.commercial) throw new Error(`${v.id}: not cleared for commercial delivery (${v.rights}); use it for drafts or pick a cleared voice`);
}

// ---------- pronunciation lexicon (spoken text only; captions keep the written form) ----------
export function applyLexicon(text, language, lex = loadLexicon()) {
  let out = text;
  for (const e of lex.entries || []) {
    const say = e.say?.[language]; if (!say) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${e.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, `gu${e.caseSensitive ? '' : 'i'}`);
    out = out.replace(re, (m, pre) => pre + say);
  }
  return out;
}

// ---------- performance direction → provider parameters ----------
// performance: { style, pace: 0.8–1.25, energy: 'low'|'mid'|'high', pauseAfter: s, emphasis: [words], ending: 'falling'|'lifted', notes }
const STYLE_WORDS = { warm: 'warm and close', authoritative: 'confident and authoritative', intimate: 'intimate, near the microphone', energetic: 'energetic and bright',
  luxury: 'slow, refined, premium', documentary: 'measured documentary narration', friendly: 'friendly and smiling', conversational: 'natural and conversational, not read',
  'egyptian-commercial': 'a lively Egyptian Arabic TV commercial voice in Cairene dialect', 'corporate-english': 'clear corporate English', whispered: 'soft, almost whispered',
  urgent: 'urgent and driving', reflective: 'reflective, with space between ideas' };
export function direct(p = {}) {
  const pace = Math.min(1.25, Math.max(0.8, p.pace ?? 1)), energy = p.energy || 'mid';
  const instructions = [STYLE_WORDS[p.style] || p.style || 'natural and conversational, not read', pace < 0.95 ? 'unhurried pace' : pace > 1.05 ? 'brisk pace' : 'moderate pace',
    { low: 'low energy', mid: 'medium energy', high: 'high energy' }[energy], p.emphasis?.length ? `emphasise: ${p.emphasis.join(', ')}` : '', p.ending === 'lifted' ? 'lift the end of the line' : 'let sentence endings fall naturally',
    'leave natural breathing space', p.notes || ''].filter(Boolean).join('; ');
  return {
    pace, instructions,
    elevenlabs: { stability: { low: 0.7, mid: 0.5, high: 0.3 }[energy], similarity_boost: 0.8, style: { low: 0.1, mid: 0.35, high: 0.6 }[energy], speed: pace },
    windowsRate: Math.round((pace - 1) * 10), pauseAfter: p.pauseAfter ?? 0, emphasis: p.emphasis || [],
  };
}
const esc = s => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
function ssml(text, lang, d, { voiceName, azure = false } = {}) {
  let body = esc(text);
  for (const w of d.emphasis) body = body.replace(esc(w), `<emphasis level="strong">${esc(w)}</emphasis>`);
  // A bare "0%" rate reads as speed zero on some engines (System.Speech dragged a 3 s line to 9.5 s): use explicit signs or "default".
  const pct = Math.round((d.pace - 1) * 100), rate = pct === 0 ? 'default' : `${pct > 0 ? '+' : ''}${pct}%`, brk = d.pauseAfter ? `<break time="${Math.round(d.pauseAfter * 1000)}ms"/>` : '';
  const inner = `<prosody rate="${rate}">${body}</prosody>${brk}`;
  return azure ? `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voiceName}">${inner}</voice></speak>`
    : `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">${inner}</speak>`;
}

// ---------- providers ----------
async function toWav(src, out) { await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', out]); rmSync(src, { force: true }); }
async function http(url, opts, out) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  const tmp = out + '.download'; writeFileSync(tmp, Buffer.from(await r.arrayBuffer())); await toWav(tmp, out);
}
const PROVIDER_RUN = {
  // Batch: all lines in ONE PowerShell launch (System.Speech, SSML for rate/emphasis/breaks).
  async windows(jobs) {
    const dir = join(tmpdir(), `studio-voice-${process.pid}`); mkdirSync(dir, { recursive: true });
    // xml:lang must be the voice's own locale (ar-EG, en-US): a bare "ar" made Hoda render silence.
    const items = jobs.map((j, i) => ({ voice: j.v.voiceId, ssml: ssml(j.spoken, j.v.locale || j.lang, j.d), raw: join(dir, `w${i}.wav`), out: j.out }));
    writeFileSync(join(dir, 'jobs.json'), JSON.stringify(items));
    // PowerShell 7 (pwsh) sees the OneCore voices (Microsoft Hoda ar-EG); Windows PowerShell 5 does not, and a failed
    // SelectVoice there silently fell back to an English voice that rendered Arabic as silence. Stop on any error.
    const ps = `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.Speech; $jobs = Get-Content -Raw -Encoding UTF8 '${join(dir, 'jobs.json')}' | ConvertFrom-Json; foreach ($j in $jobs) { $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice($j.voice); $s.SetOutputToWaveFile($j.raw); $s.SpeakSsml($j.ssml); $s.Dispose() }`;
    await run(onPath('pwsh') ? 'pwsh' : 'powershell', ['-NoProfile', '-NonInteractive', '-Command', ps]);
    for (const it of items) await toWav(it.raw, it.out);
    if (!process.env.STUDIO_VOICE_KEEP) rmSync(dir, { recursive: true, force: true }); else console.log('kept', dir);
  },
  // Batch: one python launch writes line_NNN.wav for every line.
  async local(jobs) {
    const dir = join(tmpdir(), `studio-voice-${process.pid}`); mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'lines.txt'), jobs.map(j => j.spoken.replace(/\s+/g, ' ')).join('\n'), 'utf8');
    await run(PYTHON, [join(STUDIO, 'tools', 'live.py'), 'tts', join(dir, 'lines.txt'), join(dir, 'out'), '--each=1', `--speed=${jobs[0].d.pace}`]);
    for (const [i, j] of jobs.entries()) await toWav(join(dir, 'out', `line_${String(i + 1).padStart(3, '0')}.wav`), j.out);
    rmSync(dir, { recursive: true, force: true });
  },
  async openai(jobs) {
    for (const j of jobs) await http('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: j.v.model || 'gpt-4o-mini-tts', voice: j.v.voiceId, input: j.spoken, instructions: j.d.instructions, response_format: 'wav' }) }, j.out);
  },
  async elevenlabs(jobs) {
    for (const j of jobs) await http(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(j.v.voiceId)}?output_format=mp3_44100_128`, { method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ text: j.spoken, model_id: j.v.model || 'eleven_multilingual_v2', language_code: j.lang, voice_settings: j.d.elevenlabs }) }, j.out);
  },
  async azure(jobs) {
    for (const j of jobs) await http(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, { method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY, 'content-type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'riff-48khz-16bit-mono-pcm', 'user-agent': 'studio' },
      body: ssml(j.spoken, j.v.locale || j.lang, j.d, { voiceName: j.v.voiceId, azure: true }) }, j.out);
  },
};

async function seconds(file) {
  const { out } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return +(+out.trim()).toFixed(3);
}

// Generate one or many lines; jobs sharing a provider run as one batch (one process launch for offline providers).
export async function generate(lines, { mode = 'draft' } = {}) {
  const reg = loadVoices(), lex = loadLexicon(), errs = validateVoices(reg);
  if (errs.length) throw new Error('voice/voices.json: ' + errs.join('; '));
  const jobs = (Array.isArray(lines) ? lines : [lines]).map(l => {
    const lang = l.language || 'ar', v = pickVoice({ voice: l.voice, language: lang, dialect: l.dialect, mode, provider: l.provider || 'auto' }, reg);
    checkUse(v, mode);
    if (!VOICE_PROVIDERS[v.provider].ready()) throw new Error(`${v.id}: provider ${v.provider} is not ready (offline model missing or API key unset)`);
    const out = resolve(l.out); mkdirSync(dirname(out), { recursive: true });
    return { ...l, lang, v, out, spoken: applyLexicon(l.text, lang, lex), d: direct(l.performance) };
  });
  for (const p of [...new Set(jobs.map(j => j.v.provider))]) await PROVIDER_RUN[p](jobs.filter(j => j.v.provider === p));
  for (const j of jobs) j.duration = await seconds(j.out);
  return jobs.map(j => ({ id: j.id, file: j.out, duration: j.duration, voice: j.v.id, provider: j.v.provider, text: j.text, spoken: j.spoken, performance: j.performance || null, mode }));
}

// ---------- film voice script → stems + manifest on the shared timeline ----------
// <film>/voice.json: { lines: [{ id, t, text, language, dialect?, voice?, performance?, shot?, slot? }] }
// slot = seconds available (default: until the next line). The manifest places each line at t on the film clock, next to
// picture cues and music: one creative cue can be "8.42 s voice emphasis + camera settle + title resolve + music hit".
export function validateScript(script, duration) {
  const e = [], ids = new Set(); let last = -1;
  for (const l of script.lines || []) {
    if (!l.id || ids.has(l.id)) e.push(`duplicate or missing line id ${l.id}`); ids.add(l.id);
    if (!(l.t >= 0) || (duration && l.t >= duration)) e.push(`${l.id}: t outside the film`);
    if (l.t < last) e.push(`${l.id}: lines must be ordered by t`); last = l.t;
    if (!String(l.text || '').trim()) e.push(`${l.id}: text required`);
  }
  return e;
}
export async function renderScript(film, { mode = 'draft', duration } = {}) {
  const script = JSON.parse(readFileSync(join(STUDIO, film, 'voice.json'), 'utf8'));
  const errs = validateScript(script, duration); if (errs.length) throw new Error(errs.join('; '));
  const dir = join(STUDIO, 'takes', film, 'voice');
  const res = await generate(script.lines.map(l => ({ ...l, out: join(dir, `${l.id}.wav`) })), { mode });
  const lines = script.lines.map((l, i) => {
    const r = res[i], slot = l.slot ?? ((script.lines[i + 1]?.t ?? duration ?? Infinity) - l.t);
    return { ...r, t: l.t, end: +(l.t + r.duration).toFixed(3), slot: Number.isFinite(slot) ? +slot.toFixed(3) : null, overruns: Number.isFinite(slot) && r.duration > slot + 0.05 };
  });
  const manifest = { film, mode, lines, note: 'Listen before calling a voice natural; duration and metadata cannot judge performance.' };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

// Dubbing / timing fit: natural tempo change only within ±8 %; beyond that the line must be rewritten shorter (adaptation layer).
export async function fitToSlot(file, slot, { maxStretch = 0.08 } = {}) {
  const dur = await seconds(file), ratio = dur / slot;
  if (ratio <= 1 + 0.005) return { file, duration: dur, changed: false };
  if (ratio > 1 + maxStretch) return { file, duration: dur, changed: false, needsRewrite: true, ratio: +ratio.toFixed(3), message: `line is ${(100 * (ratio - 1)).toFixed(0)} % too long for its ${slot}s slot: shorten the adaptation, do not speed the voice` };
  const tmp = file + '.fit.wav';
  await run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-filter:a', `atempo=${ratio.toFixed(4)}`, tmp]); renameSync(tmp, file);
  return { file, duration: await seconds(file), changed: true, ratio: +ratio.toFixed(3) };
}

// Voice stems → one dialogue track at film time (adelay per line), then the studio's ducking against the music.
export async function mixScript(manifest, { music, out, duck = true }) {
  const lines = manifest.lines;
  const inputs = lines.flatMap(l => ['-i', l.file]), musicIdx = lines.length;
  const delays = lines.map((l, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(l.t * 1000)}:all=1[v${i}]`);
  const voice = `${lines.map((_, i) => `[v${i}]`).join('')}amix=inputs=${lines.length}:normalize=0:duration=longest[vo]`;
  const { duck: duckGraph } = await import('./dialogue.mjs');
  const tail = duck ? `;${duckGraph({ voice: 'vo', music: 'mu', out: 'md' })};[md][voo]amix=inputs=2:normalize=0:duration=first[out]` : `;[mu][vo]amix=inputs=2:normalize=0:duration=first[out]`;
  const graph = `${delays.join(';')};${voice};[${musicIdx}:a]aresample=48000[mu]${tail}`;
  await run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-i', music, '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_f32le', out]);
  return out;
}

export function voiceStatus() {
  const reg = loadVoices();
  return Object.entries(VOICE_PROVIDERS).map(([id, p]) => ({ provider: id, offline: p.offline, ready: p.ready(), voices: reg.voices.filter(v => v.provider === id).map(v => `${v.id} (${v.language}${v.dialect ? '/' + v.dialect : ''}, ${v.quality}${v.commercial ? ', commercial' : ', draft only'})`) }));
}
export const listOutputs = (dir) => (existsSync(dir) ? readdirSync(dir) : []);
