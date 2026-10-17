// Studio Engine — the house critic: the owner's taste and the studio's craft rules as checks any model can run (ANY_MODEL.md).
// A strong model carries these in its head; here each one is a named rule with its source, the evidence and the next edit.
//   critique(spec, brand, { format, frames, facts }) → { score, verdict, rules: [{ id, status: pass|warn|fail, source, evidence, fix }] }
// frames = optional output of lib/scenegraph.mjs inspect() at sampled times (rendered evidence, not intent).
// facts = optional films/<film>/facts.json { claims: [{ id, text, source, sentence }], copy: [approved lines] } (QUALITY_PLAYBOOK §10).
import { timeline } from './events.js';
import { lint } from './gates.mjs';
import { forFormat } from './spec.mjs';
import { lintStoryboard, shotsFromSpec } from '../../lib/storyboard.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILMS = join(dirname(fileURLToPath(import.meta.url)), '..', 'films');
export const EXAMPLES = ['aixhr', 'demo', 'form-function'];   // worked examples a new film must not repeat (Lemo-Opuscar: "not the demo again")
// what a scene's camera really does (labels from craft.camera, else read from the engine fields)
export function cameraOf(s) {
  if (s.craft?.camera) return String(s.craft.camera).toLowerCase().split(/[,(]/)[0].trim();
  const els = s.elements || [];
  if (els.some((e) => e.type === 'lockup' && e.orbit !== false)) return 'orbit';
  if (els.some((e) => e.type === 'ring' && e.pushAt != null)) return 'push-through';
  if (s.camera && (s.camera.from ?? 0) !== (s.camera.to ?? 0)) return (s.camera.to ?? 0) > (s.camera.from ?? 0) ? 'push in' : 'pull back';
  if (s.transition === 'wipe' || els.some((e) => e.type === 'wipes')) return 'whip';
  if (s.breathe) return 'slow push';
  return 'locked';
}
// six things that make a film itself; ≥ 3 equal to a worked example = the demo again
export function fingerprint(spec) {
  const sc = spec.scenes || [], types = (s) => [...new Set((s?.elements || []).map((e) => e.type))].sort().join('+');
  const heroes = {}; sc.forEach((s) => (s.elements || []).forEach((e) => { if (!['words', 'stack', 'pill'].includes(e.type)) heroes[e.type] = (heroes[e.type] || 0) + 1; }));
  return { opening: types(sc[0]), hero: Object.entries(heroes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none', transitions: sc.slice(1).map((s) => s.transition || 'cut').join(' '),
    structure: sc.map((s) => s.beats).join('-'), ending: types(sc.at(-1)), music: JSON.stringify([spec.music?.progression, spec.music?.hook]) };
}

const PLACEHOLDER = /[‹›]/;
const TEXT_TYPES = new Set(['words', 'stack', 'pill', 'slab', 'slice', 'wipes', 'cards', 'hosts', 'extrude', 'lockup', 'mark']);
const HERO_TYPES = new Set(['shape', 'path', 'ribbon', 'extrude', 'lockup', 'mark', 'cursor', 'image', 'ring', 'icon']);
const PAYOFF_TYPES = new Set(['pill', 'lockup', 'mark', 'extrude']);
// every visible string of an element, with its size (px at a 1080 short side) and its window in beats
export function copyOf(e) {
  const at = e.at ?? 0, out = [];
  if (e.type === 'words' && e.text) out.push({ text: e.text, size: e.size, at, end: e.out });
  if (e.type === 'stack') for (const [i, l] of (e.lines || []).entries()) out.push({ text: l.text, size: l.size || e.size || 120, at: l.at ?? at + i * 0.5, end: e.out, fact: l.fact });
  if (e.type === 'pill') { const parts = (e.parts || [e.text]).filter(Boolean); out.push({ text: parts.map((p) => (typeof p === 'string' ? p : p.text)).join(' '), size: Math.min(...parts.map((p) => (typeof p === 'object' && p.size) || e.size || 70)), at, end: e.out }); }
  if (e.type === 'slab') for (const l of e.lines || []) out.push({ text: l.text, size: l.size || 120, at: l.at ?? at, end: e.out, fact: l.fact });
  if (['slice', 'extrude'].includes(e.type) && e.text) out.push({ text: e.text, size: e.size || 300, at, end: e.out });
  if (e.type === 'wipes') for (const w of e.items || []) out.push({ text: w.text, size: w.size || 250, at: w.at, end: w.at + 2, fact: w.fact });
  if (e.type === 'cards') for (const [i, it] of (e.items || []).entries()) for (const [k, size] of [['title', 76], ['titleAr', 48], ['old', 46], ['oldAr', 40], ['new', 46], ['newAr', 40]]) if (it?.[k]) out.push({ text: it[k], size, at: (e.start ?? 1) + i * (e.step ?? 5), end: (e.start ?? 1) + (i + 1) * (e.step ?? 5), fact: it.fact });
  if (['lockup', 'mark'].includes(e.type)) out.push({ text: (e.parts || []).join(' '), size: e.size || 300, at, end: e.out });
  return out.filter((c) => typeof c.text === 'string' && c.text.trim());
}

// pace of new compositions per mode (motion-director prompt 2026-10-17): the longest gap with nothing new entering or morphing
export const PACE = { showreel: [1, 2.5], product: [1.4, 3.5] };
export function compositionGaps(s, B) {
  const t = new Set([0, s.b - s.a]), beat = (v) => { if (Number.isFinite(v)) t.add(Math.min(s.b - s.a, v * B)); };
  for (const e of s.elements || []) {
    beat(e.at ?? 0); beat(e.out); beat(e.clickAt); beat(e.pushAt); beat(e.implodeAt); beat(e.midAt);
    for (const k of [...(e.morph || []), ...(e.items || []), ...(e.lines || []), ...(e.points || [])]) beat(k?.at);
    for (const v of e.times || []) beat(v);
    if (e.type === 'cards') (e.items || []).forEach((_, i) => beat((e.start ?? 1) + i * (e.step ?? 5)));
  }
  const ts = [...t].sort((a, b) => a - b);
  return ts.slice(1).reduce((m, v, i) => (v - ts[i] > m.gap ? { gap: v - ts[i], at: s.a + ts[i] } : m), { gap: 0, at: s.a });
}
const digits = (x) => (String(x).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).match(/\d+(?:[.,٫]\d+)?/g) || []).map((n) => n.replace(/[,٫]/, '.'));
const norm = (x) => String(x).replace(/[\u064B-\u0652\u0640]/g, '').replace(/\s+/g, ' ').trim();

export function critique(base, brand, { format, frames, facts } = {}) {
  const rules = [], add = (id, status, source, evidence, fix = '') => rules.push({ id, status, source, evidence, fix });
  const fmt = format || base.format || 'youtube', spec = forFormat(base, fmt), portrait = fmt === 'reel';
  let tl; try { tl = timeline(spec); } catch (e) { return { score: 0, verdict: 'broken spec', rules: [{ id: 'spec', status: 'fail', source: 'catalog.json', evidence: e.message, fix: 'Fix the spec structure first (spec_check).' }] }; }
  const L = lint(spec, brand), scenes = tl.scenes, n = scenes.length, dur = tl.duration;
  const copy = scenes.flatMap((s) => (s.elements || []).flatMap((e) => copyOf(e).map((c) => ({ ...c, fact: c.fact ?? e.fact, scene: s.id, a: s.a + c.at * tl.B, b: c.end != null ? s.a + c.end * tl.B : s.b, y: e.y ?? 0.5, type: e.type }))));

  // 1. structure the owner asked for: hook → idea → payoff (QUALITY_PLAYBOOK §0 "Shape of every film")
  const first = copy.reduce((m, c) => Math.min(m, c.a), Infinity);
  add('hook-2s', first <= 2.0 ? 'pass' : 'fail', 'QUALITY_PLAYBOOK §0', first === Infinity ? 'no copy at all' : `first line at ${first.toFixed(2)} s`, 'Open with a line that names the viewer\'s problem within 2 s.');
  const last = scenes.at(-1), tail = scenes.filter((s) => s.b > dur * 0.7);   // scenes that overlap the last 30 % (a short film's payoff starts just before it)
  const payoff = tail.some((s) => (s.elements || []).some((e) => PAYOFF_TYPES.has(e.type) || (e.type === 'image' && e.role === 'logo')));
  const action = tail.some((s) => (s.elements || []).some((e) => e.type === 'pill'));
  add('payoff', payoff ? 'pass' : 'fail', 'QUALITY_PLAYBOOK §0', payoff ? `payoff in ${tail.map((s) => s.id).join(', ')}` : 'no logo / lock-up / CTA in the last 30 %', 'End on the brand whole (image role logo, lockup or mark) and one action.');
  add('one-action', action ? 'pass' : 'warn', 'QUALITY_PLAYBOOK §0', action ? 'CTA pill present' : 'no CTA pill in the last 30 %', 'Give the viewer one action: a pill with the client\'s own CTA words.');

  // 2. one hero object, not a montage of effects (QUALITY_PLAYBOOK §1, CRAFT 35/48)
  const sig = {}; scenes.forEach((s) => new Set((s.elements || []).filter((e) => HERO_TYPES.has(e.type)).map((e) => e.hero || e.id || e.type)).forEach((k) => { sig[k] = (sig[k] || 0) + 1; }));
  const chain = scenes.filter((s) => (s.elements || []).some((e) => e.morphTo || e.hero)).length;
  const [heroKey, heroN] = Object.entries(sig).sort((a, b) => b[1] - a[1])[0] || ['none', 0];
  const cont = Math.max(heroN, chain + 1) / n;
  add('one-hero', n < 3 || cont >= 0.6 ? 'pass' : 'warn', 'QUALITY_PLAYBOOK §1 · CRAFT 35', `hero "${heroKey}" carries ${Math.round(cont * 100)} % of scenes${chain ? `, ${chain} morphTo/hero link(s)` : ''}`, 'Pick ONE object (the logo\'s dot, the product, a symbol of the name) and let it do every job: give it the same id/"hero" key and morphTo across scenes.');

  // 3. reading: one idea per bar, time to read, size on a phone (QUALITY_PLAYBOOK §6, STUDIO.md rule 3)
  let maxLines = 0, at = '';
  for (let t = 0; t < dur; t += 0.25) { const on = copy.filter((c) => c.a <= t && c.b > t), groups = new Set(on.map((c, i) => (c.type === 'cards' ? `${c.scene}:cards:${c.at}` : i))).size; if (groups > maxLines) { maxLines = groups; at = `${t.toFixed(2)} s (${on[0].scene})`; } }
  add('one-idea', maxLines <= 3 ? 'pass' : 'warn', 'QUALITY_PLAYBOOK §0 "one idea per bar"', `at most ${maxLines} copy lines at once${at ? ` at ${at}` : ''}`, 'A headline and one support line per bar; move the rest to the next bar.');
  const shortReads = L.warns.filter((w) => { const m = /readable ([\d.]+) s, needs ~([\d.]+) s/.exec(w); return m && +m[1] < +m[2] - 0.15; });
  add('read-time', shortReads.length ? 'fail' : 'pass', 'STUDIO.md rule 3', shortReads.length ? shortReads.slice(0, 3).join(' · ') : 'every line stays long enough', 'Raise "out" or the scene beats (~17 characters per second, ≥ 1.8 s per line).');
  const tiny = copy.filter((c) => c.size < (/[\u0600-\u06FF]/.test(c.text) ? 34 : 26));
  add('type-size', tiny.length ? 'fail' : 'pass', 'QUALITY_PLAYBOOK §6', tiny.length ? tiny.slice(0, 3).map((c) => `"${c.text}" ${c.size}px`).join(', ') : 'Arabic ≥ 34 px, Latin ≥ 26 px', 'Arabic ≥ 34 px, Latin/mono ≥ 26 px, headlines ≥ 86 px at a 1080 short side.');
  const words = copy.reduce((s, c) => s + c.text.split(/\s+/).length, 0), budget = Math.round(dur * 2.2);
  add('copy-budget', words <= budget ? 'pass' : 'warn', 'QUALITY_PLAYBOOK §0', `${words} words in ${dur} s (budget ${budget})`, 'Cut copy: the motion carries the idea, the words only name it.');
  if (portrait) { const low = copy.filter((c) => c.y > 0.66 && !['wipes', 'cards'].includes(c.type));
    add('reel-band', low.length ? 'warn' : 'pass', 'QUALITY_PLAYBOOK §6', low.length ? low.slice(0, 3).map((c) => `"${c.text}" at y ${c.y}`).join(', ') : 'copy above the bottom 35 %', 'On Reels the bottom 35 % is covered by the app UI: keep copy above y 0.65.'); }
  const fams = new Set([brand.fonts?.display, ...scenes.flatMap((s) => (s.elements || []).map((e) => e.font).filter(Boolean)).map((f) => brand.fonts?.[f] || f)].filter(Boolean));
  add('two-families', fams.size <= 2 ? 'pass' : 'warn', 'WORKFLOW taste guard', `${fams.size} type families (${[...fams].join(', ')})`, 'One display family and one text/UI family.');

  // 4. motion and edit (WORKFLOW creative variety, QUALITY_PLAYBOOK §5)
  const tr = scenes.slice(1).map((s) => s.transition || 'cut');
  const run3 = tr.some((x, i) => x !== 'cut' && i >= 2 && tr[i - 1] === x && tr[i - 2] === x);
  add('transition-variety', run3 ? 'warn' : 'pass', 'WORKFLOW creative variety', `transitions: ${tr.join(' → ') || 'none'}`, 'Motivate each transition by an object (morphTo, wipe from the hero); avoid the same effect three times in a row.');
  const mode = spec.mode || spec.creative?.mode, pace = PACE[mode];
  if (pace) {
    const slow = scenes.filter((s) => !s.hold && s.music !== 'breath').map((s) => ({ s, ...compositionGaps(s, tl.B) })).filter((g) => g.gap > pace[1] + 0.05);
    const breaths = scenes.filter((s) => s.hold || s.music === 'breath').length;
    add('edit-pace', slow.length || breaths > 2 ? 'warn' : 'pass', 'QUALITY_PLAYBOOK §10 (motion-director prompt)', `${mode}: a new composition every ${pace[0]}–${pace[1]} s; ${slow.length ? slow.slice(0, 3).map((g) => `${g.s.id} holds ${g.gap.toFixed(1)} s from ${g.at.toFixed(1)} s`).join(', ') : 'no gap too long'}${breaths > 2 ? `; ${breaths} held scenes (at most two breaths)` : ''}`, 'Bring something new in (an element, a morph keyframe, a cursor click, a wipe) inside the gap, or shorten the scene; keep at most two held breaths.');
  }
  const sets = scenes.map((s) => [...new Set((s.elements || []).map((e) => e.type))].sort().join('+'));
  const rep = sets.findIndex((x, i) => i >= 2 && x === sets[i - 1] && x === sets[i - 2]);
  add('no-template', rep < 0 ? 'pass' : 'warn', 'WORKFLOW creative variety', rep < 0 ? 'scene compositions change' : `scenes ${scenes[rep - 2].id}, ${scenes[rep - 1].id}, ${scenes[rep].id} use the same elements (${sets[rep]})`, 'Change scale, camera or composition between neighbouring scenes.');
  const short = scenes.filter((s) => (s.b - s.a) < 1.5 && (s.elements || []).some((e) => TEXT_TYPES.has(e.type)));
  add('scene-length', short.length ? 'warn' : 'pass', 'STUDIO.md rule 3', short.length ? short.map((s) => `${s.id} ${(s.b - s.a).toFixed(2)} s`).join(', ') : 'every scene with copy ≥ 1.5 s', 'A scene with words needs time to be read; merge it or lengthen it.');
  const endHold = last.hold || last.breathe;
  add('settled-end', endHold ? 'pass' : 'warn', 'QUALITY_PLAYBOOK §5 "holds breathe"', endHold ? `end scene ${last.id} ${last.hold ? 'holds' : 'breathes'}` : `end scene ${last.id} neither holds nor breathes`, 'Set "hold": true and "breathe": true on the end card so the logo and action settle.');
  const deco = scenes.filter((s) => (s.elements || []).some((e) => e.type === 'sparks' || (e.glow && e.type !== 'extrude')) && !s.craft?.reason);
  add('taste-guard', deco.length ? 'warn' : 'pass', 'WORKFLOW taste guard', deco.length ? `sparks/glow without a reason in ${deco.map((s) => s.id).join(', ')}` : 'no unexplained decoration', 'Give sparks/glow a reason in the scene\'s craft.reason, or remove them.');

  // 5. sound (QUALITY_PLAYBOOK §0 music)
  const music = spec.audio?.music || spec.music?.hook;
  add('music-hook', spec.music === false || music ? 'pass' : 'warn', 'QUALITY_PLAYBOOK §0', spec.music === false ? 'no music by request (effects only)' : music ? `hook ${spec.music?.hook || 'from the supplied track'}` : 'no hook set', 'Set music.hook (e.g. "pop332"): one catchy hook that returns every chapter.');
  const drops = scenes.filter((s) => s.drop).map((s) => s.id);
  add('drops', drops.length && (last.drop || tail.some((s) => s.drop)) ? 'pass' : 'warn', 'QUALITY_PLAYBOOK §0', drops.length ? `drops on ${drops.join(', ')}` : 'no drop', 'Put a drop on the idea\'s arrival and on the payoff (scene "drop": true).');

  // 6. honesty and finish (data-honesty, catalog rules)
  const nums = copy.filter((c) => /[0-9٠-٩]/.test(c.text));
  add('numbers-sourced', !nums.length || nums.every((c) => c.fact) || spec.honesty || spec.creative?.sources ? 'pass' : 'warn', 'skill data-honesty', nums.length ? `${nums.length} line(s) with numbers${spec.honesty ? '; honesty note present' : ''}` : 'no numbers in copy', 'Numbers must be the client\'s: name their source in spec.honesty (or creative.sources).');
  if (facts) {
    const claims = new Map((facts.claims || []).map((c) => [c.id, c])), ok = new Set([...(facts.claims || []).map((c) => norm(c.text)), ...(facts.copy || []).map(norm)]);
    const broken = [...claims.values()].filter((c) => !c.id || !c.source || !c.sentence).map((c) => c.id || norm(c.text || '?'));
    const ids = (f) => (Array.isArray(f) ? f : f ? [f] : []), unknown = copy.flatMap((c) => ids(c.fact).filter((id) => !claims.has(id)).map((id) => `${c.scene}: "${c.text}" → ${id}`));
    const loose = copy.filter((c) => !ids(c.fact).length && !ok.has(norm(c.text)));
    // a tagged line may paraphrase its claim, but every number it shows must be in the claim's text or source sentence
    const off = copy.filter((c) => ids(c.fact).length && ids(c.fact).every((id) => claims.has(id))).flatMap((c) => { const have = new Set(ids(c.fact).flatMap((id) => [...digits(claims.get(id).text), ...digits(claims.get(id).sentence)])); return digits(c.text).filter((n) => !have.has(n)).map((n) => `${c.scene}: "${c.text}" shows ${n}, not in ${ids(c.fact).join('+')}`); });
    unknown.push(...off);
    add('facts-traced', broken.length || unknown.length ? 'fail' : loose.length ? 'warn' : 'pass', 'QUALITY_PLAYBOOK §10 · skill data-honesty', broken.length ? `claim(s) without source URL + exact sentence: ${broken.slice(0, 4).join(', ')}` : unknown.length ? `unknown fact id or number not in its claim: ${unknown.slice(0, 3).join(' · ')}` : loose.length ? `${loose.length} line(s) not traced: ${loose.slice(0, 3).map((c) => `${c.scene}: "${c.text}"`).join(' · ')}` : `${copy.length} line(s) traced to ${claims.size} claim(s)`, 'Give each line "fact": "<claim id>" from facts.json (claim = id, text, source URL, the exact source sentence) or list brand-approved copy (tagline, CTA) in facts.copy.');
  }
  const ph = copy.filter((c) => PLACEHOLDER.test(c.text));
  add('no-placeholders', ph.length ? 'fail' : 'pass', 'director plan', ph.length ? ph.slice(0, 4).map((c) => `${c.scene}: ${c.text}`).join(' · ') : 'all copy written', 'Replace every ‹…› placeholder with the real line.');
  const need = ['viewer', 'problem', 'endState', 'hero', 'payoff', 'cta'], miss = need.filter((k) => !spec.creative?.[k] || PLACEHOLDER.test(String(spec.creative[k])));
  add('director-brief', miss.length ? 'warn' : 'pass', 'ANY_MODEL.md step 2', miss.length ? `creative block lacks ${miss.join(', ')}` : 'viewer, problem, hero, payoff and CTA decided', 'Decide before writing: fill spec.creative.viewer/problem/endState (what they feel, know or do in the last second)/hero/payoff/cta.');
  const sb = lintStoryboard(shotsFromSpec(spec)).issues, sbRed = sb.filter((x) => x.level === 'red');
  add('storyboard', sbRed.length ? 'fail' : sb.length ? 'warn' : 'pass', 'lib/storyboard.mjs (after huashu storyboard_lint)', sb.length ? sb.slice(0, 4).map((x) => `${x.shot}: ${x.msg}`).join(' · ') : 'every scene names a thing, an action and short copy', (sbRed[0] || sb[0])?.fix || 'Give each scene "purpose" (what the thing does) and a concrete subject.');
  // 8. direction (after Lemo-Opuscar's DIRECTOR.md, MIT): treatment, benchmark, camera variety, a breath before the peak, not the demo again
  const cr = spec.creative || {}, filled = (v) => typeof v === 'string' && v.trim() && !PLACEHOLDER.test(v);
  const st = Array.isArray(cr.structures) ? cr.structures.filter(filled) : [];
  add('three-structures', st.length >= 3 && filled(cr.choice) ? 'pass' : 'warn', 'DIRECTOR (Lemo-Opuscar) §4 · creative-director', `${st.length} candidate structure(s)${filled(cr.choice) ? ', choice given' : ', no choice'}`, 'Write three different structures (journey, before/after, countdown…) in creative.structures and the chosen one + why in creative.choice.');
  add('benchmark', filled(cr.benchmark?.learn) && filled(cr.benchmark?.avoid) ? 'pass' : 'warn', 'DIRECTOR (Lemo-Opuscar) §2', filled(cr.benchmark?.learn) ? 'benchmark set' : 'no benchmark', 'Name one or two reference works: creative.benchmark.learn (pacing, camera, colour) and .avoid (never copy designs, melodies, shots).');
  const cams = [...new Set(scenes.map(cameraOf))], needCams = Math.min(4, n - 1);
  add('camera-variety', n < 3 || cams.length >= needCams ? 'pass' : 'warn', 'DIRECTOR (Lemo-Opuscar) §8 · camera-director', `${cams.length} camera move(s): ${cams.join(', ')}`, 'Use different motivated moves (push in, pull back, orbit, whip, locked hold): scene.camera {from,to}, a lockup orbit, a ring push, breathe.');
  const peak = scenes.reduce((m, s, i) => (s.drop && i > 0 ? i : m), -1);
  const breath = peak > 0 && ['build', 'breath'].includes(scenes[peak - 1].music);
  add('breath-before-peak', n < 4 || breath ? 'pass' : 'warn', 'DIRECTOR (Lemo-Opuscar) §6', breath ? `${scenes[peak - 1].id} (${scenes[peak - 1].music}) drops out before ${scenes[peak].id}` : 'no near-silence before the last drop', 'Give the scene before the payoff music "build" (the beat drops out in its last bar) or "breath": the first sound after the silence is the biggest.');
  const linger = copy.filter((c) => ['words', 'stack', 'pill'].includes(c.type) && c.b - c.a < Math.max(1.8, [...c.text.replace(/\s/g, '')].length / 15 + 1.5) - 0.05);
  add('read-hold', linger.length ? 'warn' : 'pass', 'DIRECTOR (Lemo-Opuscar) §7 readcheck', linger.length ? linger.slice(0, 3).map((c) => `"${c.text}" ${(c.b - c.a).toFixed(1)} s`).join(', ') : 'every line holds letters ÷ 15 + 1.5 s', 'Hold each line about letters ÷ 15 + 1.5 s (≥ 1.8 s): fewer words per screen, not faster cuts.');
  const me = fingerprint(base), sameAs = [];
  for (const ex of EXAMPLES) { const p = join(FILMS, ex, 'spec.json'); if (!existsSync(p) || base.title === JSON.parse(readFileSync(p, 'utf8')).title) continue; const f = fingerprint(JSON.parse(readFileSync(p, 'utf8'))), same = Object.keys(me).filter((k) => me[k] === f[k]); if (same.length >= 3) sameAs.push(`${ex} (${same.join(', ')})`); }
  add('not-the-demo', sameAs.length ? 'warn' : 'pass', 'DIRECTOR (Lemo-Opuscar) §11 "not the demo again"', sameAs.length ? `shares ≥ 3 of 6 with ${sameAs.join('; ')}` : 'differs from every worked example in at least 4 of 6 (opening, hero, transitions, structure, ending, music)', 'Change the opening, the hero, the transition grammar, the structure, the ending or the music until at least four differ.');
  add('lint', L.errors.length ? 'fail' : 'pass', 'lib/gates.mjs', L.errors.length ? L.errors.slice(0, 4).join(' · ') : 'no lint errors', 'Fix the lint errors (spec_check gives a hint for each).');

  // 7. rendered evidence (lib/scenegraph.mjs), when sampled frames are supplied
  if (frames?.length) {
    const by = {}; for (const f of frames) for (const x of f.findings) (by[x.rule] ||= []).push(`${f.t} s`);
    const level = (rule) => (frames.some((f) => f.findings.some((x) => x.rule === rule && x.level === 'fail')) ? 'fail' : 'warn');
    for (const rule of ['contrast', 'safe-area', 'overlap', 'small-type', 'empty', 'competing-focus', 'one-idea']) {
      const hits = by[rule] || [];
      add(`frame-${rule}`, !hits.length ? 'pass' : level(rule) === 'fail' ? 'fail' : 'warn', 'lib/scenegraph.mjs (rendered frames)', hits.length ? `${hits.length}/${frames.length} sampled frames: ${hits.slice(0, 5).join(', ')}` : `clean in ${frames.length} sampled frames`, frames.flatMap((f) => f.findings).find((x) => x.rule === rule)?.fix || '');
    }
  }
  const pts = { pass: 1, warn: 0.5, fail: 0 }, score = Math.round(100 * rules.reduce((s, r) => s + pts[r.status], 0) / rules.length);
  const fails = rules.filter((r) => r.status === 'fail').length, warns = rules.filter((r) => r.status === 'warn').length;
  return { score, verdict: fails ? `fix ${fails} failing rule(s) before rendering` : warns ? `renderable; ${warns} warning(s) worth a look` : 'meets the house rules that can be checked', rules };
}
