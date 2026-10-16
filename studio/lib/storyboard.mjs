// Storyboard lint: a mechanical check of the shot list BEFORE any code or render (ANY_MODEL.md).
// Adapted from huashu-art-motion's storyboard_lint.py (MIT, alchaincyf) to our production.json shots and Studio Engine specs.
// Every shot must name a THING on screen and what it DOES; copy stays short; the film neither opens nor closes on a text card.
//   lintStoryboard(shots) → { ok, issues: [{ level: red|yellow, shot, rule, msg, fix }] }
//   shotsFromProduction(production) / shotsFromSpec(spec) → [{ id, start, end, subject, action, camera, copy, layers, oner, hold }]
import { timeline } from '../studio-engine/lib/events.js';
import { copyOf } from '../studio-engine/lib/critic.mjs';

const GENERIC_THING = /^(?:the\s+)?(?:title|titles|text|texts|words?|copy|headline|label|labels|list|bullets?|caption|subtitles?|card|cards|background|bg|screen|frame|image|icon|logo card|scene|shot|graphics?|motion|animation|stuff|عنوان|نص|نصوص|كلام|خلفية|كارت|شاشة|صورة|أيقونة|مشهد|لقطة|جرافيك)$/i;
const EMPTY_THING = /^(?:empty|blank|black|solid colou?r|gradient|nothing|فاضي|أسود|خلفية سادة)$/i;
const GENERIC_ACTION = /^(?:appears?|shows?|is shown|displays?|fades?(?: in| out)?|enters?|comes in|pops? up|reveals?|is visible|animates?|moves?|يظهر|تظهر|ظهور|عرض|يتعرض|يدخل)$/i;
const PUSH = /push|dolly in|zoom in|punch in|crash in|قرّب|يقرب|زووم/i;
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const clean = (s) => String(s || '').trim().replace(/[.!؟?،,:;]+$/, '');

export function shotsFromProduction(p) {
  return (Array.isArray(p?.shots) ? p.shots : []).filter((s) => s && typeof s === 'object').map((s) => ({ id: s.id, start: s.start, end: s.end, subject: s.subject || s.craft?.subject || s.craft?.hero || s.craft?.scale, action: s.action || s.purpose, camera: s.craft?.camera,
    copy: typeof s.copy?.text === 'string' ? s.copy.text : '', layers: Array.isArray(s.craft?.layers) ? s.craft.layers : [], oner: !!(s.craft?.oner || s.oner), hold: !!s.hold }));
}
export function shotsFromSpec(spec) {
  const tl = timeline(spec);
  return tl.scenes.map((s) => {
    const els = s.elements || [], visual = els.filter((e) => !['words', 'stack'].includes(e.type));
    return { id: s.id, start: s.a, end: s.b, subject: s.subject || s.craft?.subject || s.craft?.hero || (visual.length ? visual.map((e) => e.hero || e.id || e.type).join(' + ') : ''),
      action: s.action || s.purpose, camera: s.craft?.camera || s.camera?.move || (s.breathe ? 'slow push' : ''), copy: els.flatMap(copyOf).map((c) => c.text).join(' / '),
      layers: visual.length ? ['visual', 'text'] : ['text'], oner: !!s.craft?.oner, hold: !!s.hold };
  });
}

export function lintStoryboard(shots) {
  const issues = [], add = (level, shot, rule, msg, fix) => issues.push({ level, shot, rule, msg, fix });
  const textOnly = (s) => (s.layers?.length && s.layers.every((l) => /^text/.test(l))) || GENERIC_THING.test(clean(s.subject)) && /title|text|عنوان|نص|كلام|words?/i.test(s.subject);
  shots.forEach((s, i) => {
    const subj = clean(s.subject), act = clean(s.action), dur = (s.end ?? 0) - (s.start ?? 0);
    if (!subj || GENERIC_THING.test(subj) || EMPTY_THING.test(subj)) add('red', s.id, 'thing', `no concrete thing on screen ("${subj || 'empty'}")`, 'Name the object the viewer watches (the hero, the product, the cup, the logo\'s dot), not "title" or "background".');
    if (!act || GENERIC_ACTION.test(act)) add('red', s.id, 'action', `no real action ("${act || 'empty'}")`, 'Say what the thing does and why ("the dot grows into the window"), not "appears" or "shows".');
    const w = words(s.copy.replace(/\s*\/\s*/g, ' '));
    if (w > 12) add('red', s.id, 'copy', `${w} words on screen in one shot`, 'One idea per shot: at most a headline and one support line (≈ 8 words).');
    else if (w > 8) add('yellow', s.id, 'copy', `${w} words on screen in one shot`, 'Cut to ≤ 8 words; the motion carries the rest.');
    if (!s.oner && !s.hold && dur > 8 + 1e-6) add('red', s.id, 'length', `${dur.toFixed(1)} s shot`, 'Split it or mark it a deliberate one-take (craft.oner) with a reason.');
    else if (!s.oner && !s.hold && dur > 6 + 1e-6) add('yellow', s.id, 'length', `${dur.toFixed(1)} s shot`, 'Long for a short ad: check it carries new information.');
    else if (dur > 0 && dur < 1.5 - 1e-6 && words(s.copy) > 2) add('yellow', s.id, 'length', `${dur.toFixed(1)} s for ${words(s.copy)} words`, 'Too short to read: lengthen or cut the words.');
    if (i >= 2) {
      const cams = shots.slice(i - 2, i + 1).map((x) => clean(x.camera).toLowerCase());
      if (cams.every((c) => c && c === cams[0]) && !/^(?:locked|static|hold|ثابت)$/.test(cams[0])) add('yellow', s.id, 'camera-repeat', `three shots in a row with the same camera ("${cams[0]}")`, 'Change scale or move: a cut, a pull, a track, a hold.');
      if (cams.every((c) => PUSH.test(c))) add('yellow', s.id, 'push-push-push', 'three push-ins in a row', 'Alternate: pull back, track or hold between pushes.');
    }
  });
  if (shots.length && textOnly(shots[0])) add('red', shots[0].id, 'first-shot', 'the film opens on text alone', 'Open on the hero doing something; the problem line rides on it.');
  if (shots.length > 1 && textOnly(shots.at(-1))) add('red', shots.at(-1).id, 'last-shot', 'the film ends on a text card alone', 'End on the brand whole (logo) and the one action.');
  const longish = shots.filter((s) => !s.oner && (s.end - s.start) > 6 + 1e-6).length;
  if (shots.length >= 5 && longish / shots.length > 0.2) add('red', '*', 'pace', `${longish} of ${shots.length} shots are longer than 6 s`, 'Shots of 2–6 s; keep long ones for deliberate holds.');
  return { ok: !issues.some((x) => x.level === 'red'), issues };
}
