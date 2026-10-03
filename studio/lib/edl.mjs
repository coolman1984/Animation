// Edit decisions for live-action footage — pure functions, no media I/O (tests in test/live.test.mjs).
// The studio's answer to the jump-cut / text-based editing tools (auto-editor, Descript-style rough cuts, OpusClip punch-ins):
//   keepRanges      speech segments → what to keep (auto-editor's "margin" idea: pad, bridge short gaps, drop slivers)
//   cutWords        remove words/fillers from a transcript → keep ranges (edit video by editing text)
//   timeline        keep ranges → clips on a film timeline (source in/out ↔ film time), with optional J/L audio offsets
//   sourceTime      film time → source time (what frame of the footage to show now)
//   punchIns        alternate zoom per clip so every jump cut reads as a deliberate "punch-in" instead of a glitch
//   pageCaptions    timed words → caption pages (≤ maxWords / maxChars, never across a long pause) with per-word timing
//   cutSfx          one designed sound per cut kind (whoosh on punch-in, soft tick on a plain jump cut) — sparse, not on every cut
//   toOTIO          timeline → OpenTimelineIO JSON (Premiere Pro, DaVinci Resolve, Avid import it) so a human editor can finish
const num = (v, n) => { if (!Number.isFinite(v)) throw new Error(`${n} must be a finite number`); return v; };
const r3 = (v) => Math.round(v * 1000) / 1000;

// speech: [[start, end], …] seconds in source time. pad: kept before/after speech; bridge: gaps shorter than this stay in;
// minKeep: drop kept slivers shorter than this. duration clamps the last range.
export function keepRanges(speech, { pad = 0.12, bridge = 0.35, minKeep = 0.25, duration = Infinity } = {}) {
  if (!Array.isArray(speech)) throw new Error('keepRanges needs speech segments');
  const segs = speech.map(([a, b]) => [Math.max(0, num(a, 'start') - pad), Math.min(duration, num(b, 'end') + pad)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && s[0] - last[1] <= bridge) last[1] = Math.max(last[1], s[1]); else out.push([...s]);
  }
  return out.filter(([a, b]) => b - a >= minKeep).map(([a, b]) => [r3(a), r3(b)]);
}

// words: [{ w, start, end }]; remove: Set/array of word indexes or a predicate (w, i) → true to cut (e.g. fillers "يعني", "اممم").
export function cutWords(words, remove, { pad = 0.04, bridge = 0.2, minKeep = 0.2 } = {}) {
  const drop = typeof remove === 'function' ? remove : ((set) => (_, i) => set.has(i))(new Set(remove));
  const kept = words.filter((w, i) => !drop(w, i)).map((w) => [w.start, w.end]);
  return keepRanges(kept, { pad, bridge, minKeep });
}
export const FILLERS_AR = Object.freeze(['اممم', 'امم', 'ام', 'آآ', 'ااا', 'يعني', 'اه', 'إيه']);

// keep: [[srcIn, srcOut], …] → clips laid end to end from film time `at`. jl: optional per-cut audio offset in seconds
// (negative = J cut: next clip's audio starts early; positive = L cut: previous clip's audio runs late).
export function timeline(keep, { at = 0, speed = 1, jl = 0, src = 'A' } = {}) {
  if (!(speed > 0)) throw new Error('speed must be positive');
  let t = num(at, 'at');
  return keep.map(([a, b], i) => {
    const dur = (b - a) / speed, clip = { i, src, in: r3(a), out: r3(b), start: r3(t), end: r3(t + dur), speed };
    const off = typeof jl === 'function' ? jl(i) : i > 0 ? jl : 0;
    clip.audio = { start: r3(Math.max(0, t + Math.min(0, off))), in: r3(Math.max(0, a + Math.min(0, off) * speed)) };
    t += dur; return clip;
  });
}
// Film time → { clip, src: source seconds } (null outside the edit). Exact at boundaries: a clip owns [start, end).
export function sourceTime(clips, t) {
  for (const c of clips) if (t >= c.start && t < c.end) return { clip: c, src: c.in + (t - c.start) * c.speed };
  const last = clips[clips.length - 1];
  return last && Math.abs(t - last.end) < 1e-9 ? { clip: last, src: last.out } : null;
}

// Alternating punch-in: odd clips zoom to `scale` around a focus point (e.g. the face). Slow push inside each clip optional.
export function punchIns(clips, { scale = 1.12, every = 2, push = 0.02 } = {}) {
  return clips.map((c, i) => ({ i, base: i % every ? scale : 1, push }));
}
export function zoomAt(clips, plan, t) {
  const s = sourceTime(clips, t); if (!s) return 1;
  const p = plan[s.clip.i], u = (t - s.clip.start) / Math.max(1e-6, s.clip.end - s.clip.start);
  return p.base * (1 + p.push * u);
}

// Caption pages from timed words: break on a pause ≥ gap, at sentence punctuation, or when the page would exceed limits.
export function pageCaptions(words, { maxWords = 4, maxChars = 22, gap = 0.45, hold = 0.25 } = {}) {
  const pages = []; let cur = null;
  const close = () => { if (cur) { cur.end = r3(cur.words[cur.words.length - 1].end + hold); pages.push(cur); cur = null; } };
  words.forEach((w, i) => {
    const prev = words[i - 1], text = cur ? cur.words.map((x) => x.w).join(' ') + ' ' + w.w : w.w;
    if (cur && (w.start - prev.end >= gap || cur.words.length >= maxWords || [...text].length > maxChars || /[.!?؟،]$/.test(prev.w))) close();
    if (!cur) cur = { start: r3(w.start), words: [] };
    cur.words.push({ w: w.w, start: r3(w.start), end: r3(w.end) });
  });
  close();
  for (let i = 0; i + 1 < pages.length; i++) pages[i].end = Math.min(pages[i].end, pages[i + 1].start); // never overlap
  return pages;
}
// Word state on a page at time t: 'past' | 'now' | 'next' (drives the karaoke highlight / pop).
export const wordState = (w, t) => (t >= w.end ? 'past' : t >= w.start ? 'now' : 'next');

// One sound per cut kind; `minGap` keeps accents sparse (sound reinforces, it does not tick every edit).
export function cutSfx(clips, plan = [], { minGap = 1.2 } = {}) {
  const out = []; let last = -Infinity;
  for (const c of clips.slice(1)) {
    if (c.start - last < minGap) continue;
    const punch = plan[c.i] && plan[c.i].base !== (plan[c.i - 1] ? plan[c.i - 1].base : 1);
    out.push({ t: c.start, type: punch ? 'whoosh' : 'click', vel: punch ? 0.16 : 0.12 }); last = c.start;
  }
  return out;
}

// OpenTimelineIO (otio_json) for a single source: one video track + one audio track, RationalTime at `rate`.
export function toOTIO(clips, { name = 'studio edit', rate = 30, media, mediaDuration } = {}) {
  if (!media) throw new Error('toOTIO needs the media path or URL');
  const rt = (s) => ({ OTIO_SCHEMA: 'RationalTime.1', rate, value: Math.round(s * rate) });
  const range = (a, d) => ({ OTIO_SCHEMA: 'TimeRange.1', start_time: rt(a), duration: rt(d) });
  const ref = () => ({ OTIO_SCHEMA: 'ExternalReference.1', target_url: media, available_range: mediaDuration ? range(0, mediaDuration) : null, metadata: {} });
  const clip = (c, kind) => ({ OTIO_SCHEMA: 'Clip.2', name: `${kind} ${c.i + 1}`, source_range: range(c.in, c.out - c.in), media_references: { DEFAULT_MEDIA: ref() },
    active_media_reference_key: 'DEFAULT_MEDIA', effects: [], markers: [], enabled: true, metadata: {} });
  const track = (kind) => ({ OTIO_SCHEMA: 'Track.1', name: kind === 'Video' ? 'V1' : 'A1', kind, children: clips.map((c) => clip(c, kind)), effects: [], markers: [], enabled: true, source_range: null, metadata: {} });
  return JSON.stringify({ OTIO_SCHEMA: 'Timeline.1', name, global_start_time: null, metadata: { studio: { generator: 'lib/edl.mjs' } },
    tracks: { OTIO_SCHEMA: 'Stack.1', name: 'tracks', children: [track('Video'), track('Audio')], effects: [], markers: [], enabled: true, source_range: null, metadata: {} } }, null, 1);
}
