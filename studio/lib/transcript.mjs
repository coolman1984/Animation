// Canonical transcript: ONE timeline asset that drives editing, captions, search, translation, dubbing, word highlighting,
// speaker labels, jump cuts and quote extraction. Built from any engine (tools/live.py transcribe/align, a cloud adapter,
// or a corrected file) and never rewritten silently: translations and dubbing adaptations live in separate layers.
//
// {
//   version: 1, language: 'ar' | 'en' | 'mixed', source: { file, engine, model, wordTiming },
//   speakers: [{ id: 'S1', label: 'Host' }],
//   words: [{ w, start, end, conf: null | 0..1, speaker: 'S1' | null, lang: 'ar' | 'en' }],
//   sentences: [{ id: 's1', start, end, text, speaker, wordIdx: [first, last] }],
//   layers: { 'en': { kind: 'translation', of: 'ar', sentences: { s1: '…' } }, 'en-dub': { kind: 'adaptation', … } },
//   corrections: [{ at, sentence, from, to, by }]
// }
import { readFileSync, writeFileSync } from 'node:fs';
import { FILLERS_AR, pageCaptions } from './edl.mjs';

export const FILLERS_EN = Object.freeze(['um', 'uh', 'erm', 'er', 'ah', 'hmm', 'like', 'you know']);
const AR = /[\u0600-\u06FF]/, LAT = /[A-Za-z]/;
const END = /[.!?؟…]$/u;
export const wordLang = (w) => (AR.test(w) ? 'ar' : LAT.test(w) ? 'en' : null);

// From tools/live.py transcript.json ({ model, lang, words:[{w,start,end}], segments, wordTiming }) or a plain word list.
export function fromLive(tr, { file = null, speakers = null } = {}) {
  const words = (tr.words || []).map(x => ({ w: x.w, start: x.start, end: x.end, conf: x.conf ?? null, speaker: x.speaker ?? null, lang: wordLang(x.w) }));
  const langs = new Set(words.map(x => x.lang).filter(Boolean));
  const t = { version: 1, language: langs.size > 1 ? 'mixed' : [...langs][0] || tr.lang || 'ar',
    source: { file, engine: tr.model === 'script' ? 'script-alignment' : 'whisper (sherpa-onnx)', model: tr.model || null, wordTiming: tr.wordTiming || null },
    speakers: speakers || [...new Set(words.map(x => x.speaker).filter(Boolean))].map(id => ({ id, label: id })),
    words, sentences: [], layers: {}, corrections: [] };
  t.sentences = sentences(t.words, tr.segments);
  return t;
}

// Sentences: end punctuation, a speaker change, or a pause ≥ 0.6 s. Engine segments are respected as hard boundaries.
export function sentences(words, segments = [], { pause = 0.6 } = {}) {
  const hard = new Set((segments || []).map(s => +s.start.toFixed(2)));
  const out = []; let a = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i], n = words[i + 1];
    const brk = !n || END.test(w.w) || n.start - w.end >= pause || (n.speaker && n.speaker !== w.speaker) || hard.has(+n.start.toFixed(2));
    if (brk) { out.push({ id: `s${out.length + 1}`, start: words[a].start, end: w.end, text: words.slice(a, i + 1).map(x => x.w).join(' '), speaker: words[a].speaker ?? null, wordIdx: [a, i] }); a = i + 1; }
  }
  return out;
}

export function validate(t) {
  const e = [];
  if (t?.version !== 1) e.push('version must be 1');
  if (!Array.isArray(t?.words)) return [...e, 'words must be an array'];
  t.words.forEach((w, i) => { if (typeof w.w !== 'string' || !(w.end >= w.start) || (i && w.start < t.words[i - 1].start - 1e-6)) e.push(`word ${i} invalid or out of order`); });
  for (const [name, L] of Object.entries(t.layers || {})) if (!['translation', 'adaptation'].includes(L.kind)) e.push(`layer ${name}: kind must be translation or adaptation`);
  return e;
}

// Correction: replaces a sentence's words with corrected text, keeping its time span, and logs the change (who/when/what).
export function correct(t, sentenceId, text, by = 'editor') {
  const s = t.sentences.find(x => x.id === sentenceId); if (!s) throw new Error(`unknown sentence ${sentenceId}`);
  const [a, b] = s.wordIdx, ws = text.trim().split(/\s+/u), span = s.end - s.start;
  const repl = ws.map((w, i) => ({ w, start: +(s.start + span * i / ws.length).toFixed(3), end: +(s.start + span * (i + 1) / ws.length).toFixed(3), conf: null, speaker: s.speaker, lang: wordLang(w), corrected: true }));
  t.corrections.push({ at: new Date().toISOString(), sentence: sentenceId, from: s.text, to: text, by });
  t.words.splice(a, b - a + 1, ...repl);
  t.sentences = sentences(t.words);
  return t;
}

// Translation / adaptation layers: the original words are never touched.
export function addLayer(t, name, kind, of, bySentence) {
  if (!['translation', 'adaptation'].includes(kind)) throw new Error('kind must be translation or adaptation');
  t.layers[name] = { kind, of, sentences: { ...bySentence } };
  return t;
}
export function coverage(t, layer) {
  const L = t.layers[layer]; if (!L) return { layer, covered: 0, total: t.sentences.length, missing: t.sentences.map(s => s.id) };
  const missing = t.sentences.filter(s => !String(L.sentences[s.id] || '').trim()).map(s => s.id);
  return { layer, covered: t.sentences.length - missing.length, total: t.sentences.length, missing };
}

// ---------- editing intelligence primitives (the agent decides; these only measure) ----------
const norm = (w) => w.toLowerCase().replace(/[\u064B-\u065F\u0640.,،؟?!:؛"'«»]/gu, '').replace(/[أإآ]/g, 'ا');
export function fillers(t, extra = []) {
  const set = new Set([...FILLERS_AR, ...FILLERS_EN, ...extra].map(norm));
  return t.words.map((w, i) => ({ i, ...w })).filter(w => set.has(norm(w.w)));
}
// Repeated phrases (n-grams of 2–6 words said again within `within` seconds): false starts and restarts.
export function repeats(t, { min = 2, max = 6, within = 8 } = {}) {
  const W = t.words.map(w => norm(w.w)), found = [];
  for (let n = max; n >= min; n--) for (let i = 0; i + n <= W.length; i++) {
    const key = W.slice(i, i + n).join(' ');
    if (key.replace(/ /g, '').length < 4) continue;
    for (let j = i + n; j + n <= W.length && t.words[j].start - t.words[i].start <= within; j++)
      if (W.slice(j, j + n).join(' ') === key && !found.some(f => f.second[0] <= j && j <= f.second[1])) { found.push({ phrase: t.words.slice(i, i + n).map(w => w.w).join(' '), first: [i, i + n - 1], second: [j, j + n - 1], at: t.words[j].start }); break; }
  }
  return found;
}
// Natural cut points: gaps between words, strongest (longest) first; a cut inside a breath gap is invisible to the ear.
export function cutPoints(t, { minGap = 0.25 } = {}) {
  const out = [];
  for (let i = 1; i < t.words.length; i++) { const g = t.words[i].start - t.words[i - 1].end; if (g >= minGap) out.push({ t: +((t.words[i - 1].end + t.words[i].start) / 2).toFixed(3), gap: +g.toFixed(3), after: i - 1, sentenceEnd: END.test(t.words[i - 1].w) }); }
  return out.sort((a, b) => b.gap - a.gap);
}
// Quote search: every occurrence of a phrase (normalised, Arabic-letter-insensitive) with its time span.
export function find(t, phrase) {
  const q = phrase.trim().split(/\s+/u).map(norm), W = t.words.map(w => norm(w.w)), hits = [];
  for (let i = 0; i + q.length <= W.length; i++) if (q.every((x, k) => W[i + k] === x)) hits.push({ start: t.words[i].start, end: t.words[i + q.length - 1].end, words: [i, i + q.length - 1] });
  return hits;
}
// Cut-down helper: chosen sentence ids → keep ranges for lib/edl.mjs timeline() and their total length. Words are only
// removed, never invented: a real-footage edit can shorten, not rewrite, what someone said.
export function keepSentences(t, ids, { pad = 0.08 } = {}) {
  const keep = t.sentences.filter(s => ids.includes(s.id)).map(s => [Math.max(0, s.start - pad), s.end + pad]);
  return { keep, seconds: +keep.reduce((a, [x, y]) => a + y - x, 0).toFixed(2) };
}

// ---------- exports ----------
const ts = (t, sep) => { const ms = Math.max(0, Math.round(t * 1000)); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`; };
const RLE = '\u202B', PDF = '\u202C';
// Cues: caption pages from words (edl.pageCaptions) or whole sentences; `layer` swaps in a translation by sentence.
export function cues(t, { by = 'pages', layer, maxWords = 7, maxChars = 42 } = {}) {
  if (layer) { const L = t.layers[layer]; return t.sentences.map(s => ({ start: s.start, end: s.end, text: L?.sentences[s.id] || '' })).filter(c => c.text); }
  if (by === 'sentences') return t.sentences.map(s => ({ start: s.start, end: s.end, text: s.text }));
  return pageCaptions(t.words, { maxWords, maxChars }).map(p => ({ start: p.start, end: p.end, text: p.text ?? p.words.map(w => w.w).join(' ') }));
}
// RTL lines get an embedding mark so players that ignore direction still order mixed Arabic/Latin text correctly.
const dirText = (s) => (AR.test(s) ? RLE + s + PDF : s);
// Per line, so a bilingual cue keeps its English line left-to-right.
export const toSRT = (cs) => cs.map((c, i) => `${i + 1}\n${ts(c.start, ',')} --> ${ts(c.end, ',')}\n${c.text.split('\n').map(dirText).join('\n')}\n`).join('\n');
export const toVTT = (cs) => 'WEBVTT\n\n' + cs.map(c => `${ts(c.start, '.')} --> ${ts(c.end, '.')}\n${c.text}\n`).join('\n');
export const toTXT = (t) => t.sentences.map(s => `[${ts(s.start, '.').slice(3, 11)}]${s.speaker ? ' ' + (t.speakers.find(x => x.id === s.speaker)?.label || s.speaker) + ':' : ''} ${s.text}`).join('\n');
export function toASS(cs, { font = 'Alexandria', size = 54, w = 1080, h = 1920 } = {}) {
  const t2 = (t) => ts(t, '.').slice(1, 11);
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    `Style: Default,${font},${size},&H00FFFFFF,&H00FFFFFF,&H64000000,&H64000000,0,0,0,0,100,100,0,0,1,3,0,2,60,60,${Math.round(h * 0.2)},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
    cs.map(c => `Dialogue: 0,${t2(c.start)},${t2(c.end)},Default,,0,0,0,,${c.text.replace(/\n/g, '\\N')}`).join('\n') + '\n';
}
// Bilingual: original line over its translation in one cue (sentence timing).
export function bilingual(t, layer) {
  const L = t.layers[layer] || { sentences: {} };
  return t.sentences.map(s => ({ start: s.start, end: s.end, text: L.sentences[s.id] ? `${s.text}\n${L.sentences[s.id]}` : s.text }));
}
export function exportAll(t, base, { layer } = {}) {
  const out = { json: base + '.transcript.json', txt: base + '.txt', srt: base + '.srt', vtt: base + '.vtt', ass: base + '.ass' };
  writeFileSync(out.json, JSON.stringify(t, null, 1)); writeFileSync(out.txt, toTXT(t));
  const cs = cues(t); writeFileSync(out.srt, toSRT(cs)); writeFileSync(out.vtt, toVTT(cs)); writeFileSync(out.ass, toASS(cs));
  if (layer) { const lc = cues(t, { layer }); out[layer + '.srt'] = `${base}.${layer}.srt`; writeFileSync(out[layer + '.srt'], toSRT(lc)); out.bilingual = `${base}.bilingual.srt`; writeFileSync(out.bilingual, toSRT(bilingual(t, layer))); }
  return out;
}
export const load = (file) => JSON.parse(readFileSync(file, 'utf8'));
