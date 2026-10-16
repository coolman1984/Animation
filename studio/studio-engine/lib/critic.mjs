// Studio Engine — the house critic: the owner's taste and the studio's craft rules as checks any model can run (ANY_MODEL.md).
// A strong model carries these in its head; here each one is a named rule with its source, the evidence and the next edit.
//   critique(spec, brand, { format, frames }) → { score, verdict, rules: [{ id, status: pass|warn|fail, source, evidence, fix }] }
// frames = optional output of lib/scenegraph.mjs inspect() at sampled times (rendered evidence, not intent).
import { timeline } from './events.js';
import { lint } from './gates.mjs';
import { forFormat } from './spec.mjs';

const PLACEHOLDER = /[‹›]/;
const TEXT_TYPES = new Set(['words', 'stack', 'pill', 'slab', 'slice', 'wipes', 'cards', 'hosts', 'extrude', 'lockup', 'mark']);
const HERO_TYPES = new Set(['shape', 'path', 'ribbon', 'extrude', 'lockup', 'mark', 'cursor', 'image', 'ring', 'icon']);
const PAYOFF_TYPES = new Set(['pill', 'lockup', 'mark', 'extrude']);
// every visible string of an element, with its size (px at a 1080 short side) and its window in beats
export function copyOf(e) {
  const at = e.at ?? 0, out = [];
  if (e.type === 'words' && e.text) out.push({ text: e.text, size: e.size, at, end: e.out });
  if (e.type === 'stack') for (const [i, l] of (e.lines || []).entries()) out.push({ text: l.text, size: l.size || e.size || 120, at: l.at ?? at + i * 0.5, end: e.out });
  if (e.type === 'pill') { const parts = (e.parts || [e.text]).filter(Boolean); out.push({ text: parts.map((p) => (typeof p === 'string' ? p : p.text)).join(' '), size: Math.min(...parts.map((p) => (typeof p === 'object' && p.size) || e.size || 70)), at, end: e.out }); }
  if (e.type === 'slab') for (const l of e.lines || []) out.push({ text: l.text, size: l.size || 120, at: l.at ?? at, end: e.out });
  if (['slice', 'extrude'].includes(e.type) && e.text) out.push({ text: e.text, size: e.size || 300, at, end: e.out });
  if (e.type === 'wipes') for (const w of e.items || []) out.push({ text: w.text, size: w.size || 250, at: w.at, end: w.at + 2 });
  if (e.type === 'cards') for (const [i, it] of (e.items || []).entries()) for (const [k, size] of [['title', 76], ['titleAr', 48], ['old', 46], ['oldAr', 40], ['new', 46], ['newAr', 40]]) if (it?.[k]) out.push({ text: it[k], size, at: (e.start ?? 1) + i * (e.step ?? 5), end: (e.start ?? 1) + (i + 1) * (e.step ?? 5) });
  if (['lockup', 'mark'].includes(e.type)) out.push({ text: (e.parts || []).join(' '), size: e.size || 300, at, end: e.out });
  return out.filter((c) => typeof c.text === 'string' && c.text.trim());
}

export function critique(base, brand, { format, frames } = {}) {
  const rules = [], add = (id, status, source, evidence, fix = '') => rules.push({ id, status, source, evidence, fix });
  const fmt = format || base.format || 'youtube', spec = forFormat(base, fmt), portrait = fmt === 'reel';
  let tl; try { tl = timeline(spec); } catch (e) { return { score: 0, verdict: 'broken spec', rules: [{ id: 'spec', status: 'fail', source: 'catalog.json', evidence: e.message, fix: 'Fix the spec structure first (spec_check).' }] }; }
  const L = lint(spec, brand), scenes = tl.scenes, n = scenes.length, dur = tl.duration;
  const copy = scenes.flatMap((s) => (s.elements || []).flatMap((e) => copyOf(e).map((c) => ({ ...c, scene: s.id, a: s.a + c.at * tl.B, b: c.end != null ? s.a + c.end * tl.B : s.b, y: e.y ?? 0.5, type: e.type }))));

  // 1. structure the owner asked for: hook → idea → payoff (QUALITY_PLAYBOOK §0 "Shape of every film")
  const first = copy.reduce((m, c) => Math.min(m, c.a), Infinity);
  add('hook-2s', first <= 2.0 ? 'pass' : 'fail', 'QUALITY_PLAYBOOK §0', first === Infinity ? 'no copy at all' : `first line at ${first.toFixed(2)} s`, 'Open with a line that names the viewer\'s problem within 2 s.');
  const last = scenes.at(-1), tail = scenes.filter((s) => s.a >= dur * 0.7);
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
  add('numbers-sourced', !nums.length || spec.honesty || spec.creative?.sources ? 'pass' : 'warn', 'skill data-honesty', nums.length ? `${nums.length} line(s) with numbers${spec.honesty ? '; honesty note present' : ''}` : 'no numbers in copy', 'Numbers must be the client\'s: name their source in spec.honesty (or creative.sources).');
  const ph = copy.filter((c) => PLACEHOLDER.test(c.text));
  add('no-placeholders', ph.length ? 'fail' : 'pass', 'director plan', ph.length ? ph.slice(0, 4).map((c) => `${c.scene}: ${c.text}`).join(' · ') : 'all copy written', 'Replace every ‹…› placeholder with the real line.');
  const need = ['viewer', 'problem', 'hero', 'payoff', 'cta'], miss = need.filter((k) => !spec.creative?.[k] || PLACEHOLDER.test(String(spec.creative[k])));
  add('director-brief', miss.length ? 'warn' : 'pass', 'ANY_MODEL.md step 2', miss.length ? `creative block lacks ${miss.join(', ')}` : 'viewer, problem, hero, payoff and CTA decided', 'Decide before writing: fill spec.creative.viewer/problem/hero/payoff/cta.');
  add('lint', L.errors.length ? 'fail' : 'pass', 'lib/gates.mjs', L.errors.length ? L.errors.slice(0, 4).join(' · ') : 'no lint errors', 'Fix the lint errors (spec_check gives a hint for each).');

  // 7. rendered evidence (lib/scenegraph.mjs), when sampled frames are supplied
  if (frames?.length) {
    const by = {}; for (const f of frames) for (const x of f.findings) (by[x.rule] ||= []).push(`${f.t} s`);
    const level = (rule) => frames.flatMap((f) => f.findings).find((x) => x.rule === rule)?.level;
    for (const rule of ['contrast', 'safe-area', 'overlap', 'small-type', 'empty', 'competing-focus', 'one-idea']) {
      const hits = by[rule] || [];
      add(`frame-${rule}`, !hits.length ? 'pass' : level(rule) === 'fail' ? 'fail' : 'warn', 'lib/scenegraph.mjs (rendered frames)', hits.length ? `${hits.length}/${frames.length} sampled frames: ${hits.slice(0, 5).join(', ')}` : `clean in ${frames.length} sampled frames`, frames.flatMap((f) => f.findings).find((x) => x.rule === rule)?.fix || '');
    }
  }
  const pts = { pass: 1, warn: 0.5, fail: 0 }, score = Math.round(100 * rules.reduce((s, r) => s + pts[r.status], 0) / rules.length);
  const fails = rules.filter((r) => r.status === 'fail').length, warns = rules.filter((r) => r.status === 'warn').length;
  return { score, verdict: fails ? `fix ${fails} failing rule(s) before rendering` : warns ? `renderable; ${warns} warning(s) worth a look` : 'meets the house rules that can be checked', rules };
}
