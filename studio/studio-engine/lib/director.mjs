// Studio Engine — the director's plan: a brief becomes a spec skeleton that already follows the house method (ANY_MODEL.md).
// Structure is the hard part a strong model does by instinct; here it is given: hook in the first 2 s → the idea on a drop →
// proof chapters on whole bars → payoff with the brand whole and ONE action, one hero object carried through every scene by
// morphTo, a hook in the music, holds that breathe. The model only writes the words (‹…› placeholders) and picks icons.
//   plan({ title, subject, mode, viewer, problem, endState, promise, cta, brand, logo, placement, duration, style }) → { spec, todo }
// Treatment fields (after Lemo-Opuscar's DIRECTOR.md): three candidate structures + the chosen one, and a benchmark (learn / avoid).
const ICONS = ['spark', 'bolt', 'check', 'star', 'rocket', 'chat', 'clock', 'gear', 'heart', 'globe', 'people', 'doc', 'mag', 'board', 'bars'];
const P = (what) => `‹${what}›`;

export function arc(duration) {
  if (!Number.isInteger(duration) || duration < 8 || duration > 90) throw new Error('duration must be whole seconds between 8 and 90 (shorter leaves a chapter too short to read)');
  const total = duration * 2, hook = duration <= 15 ? 4 : 8, payoff = duration <= 10 ? 6 : duration <= 20 ? 8 : 12;
  let middle = total - hook - payoff;
  const chapters = [];
  while (middle > 0) { const b = middle >= 16 || middle === 8 ? 8 : middle >= 12 ? 6 : middle; chapters.push(b); middle -= b; }
  return { hook, chapters, payoff };
}

export function plan(brief = {}) {
  const portrait = (brief.placement || 'reels') !== 'youtube', duration = +(brief.duration || (portrait ? 15 : 30));
  const { hook, chapters, payoff } = arc(duration);
  const Y = portrait ? { head: 0.27, sub: 0.36, hero: 0.52, card: 0.5, cardText: 0.6, name: 0.3, line: 0.4, cta: 0.55 } : { head: 0.3, sub: 0.45, hero: 0.62, card: 0.55, cardText: 0.66, name: 0.3, line: 0.45, cta: 0.66 };
  const n = chapters.length + 2, hero = (i) => `hero-${i}`;
  const scenes = [];
  // hook: the viewer's problem in two short lines; the hero is born small (QUALITY_PLAYBOOK §0, §1)
  scenes.push({ id: 'hook', beats: hook, music: 'intro', purpose: 'name the viewer\'s problem in the first 2 s', camera: { drift: false }, craft: { scale: 'wide', camera: 'locked', reason: 'the hero is born as a small dot under the problem' },
    elements: [
      { type: 'stack', y: Y.head + 0.04, at: 0, lines: [{ text: brief.problem || P('the viewer\'s problem, ≤ 5 words'), size: 140 }, { text: P('the sting, ≤ 4 words'), size: 96, color: 'accent', at: Math.min(2, hook / 2) }] },
      { type: 'shape', id: hero(0), hero: 'hero', x: 0.5, y: Y.hero + 0.1, w: 90, h: 90, r: 45, color: 'accent', at: Math.min(1, hook / 4), morphTo: hero(1) },
    ] });
  // idea on the first drop: the hero grows into the brand's idea
  chapters.forEach((beats, k) => {
    const id = k === 0 ? 'idea' : `proof-${k}`, last = k === chapters.length - 1, idx = k + 1;
    const big = k === 0 ? { w: 560, h: 560, r: 280 } : { w: portrait ? 840 : 1100, h: portrait ? 820 : 620, r: 48 };
    const icon = ICONS[k % ICONS.length];
    const wipe = (j) => j >= 3 && j % 3 === 0, next = wipe(k + 1) ? undefined : hero(idx + 1);   // a wipe chapter covers the frame: no shape to morph into
    scenes.push({ id, beats, music: k === 0 ? 'drop' : last ? 'build' : k % 2 ? 'verse' : 'chorus', ...(k === 0 ? { drop: true } : {}), transition: k === 0 ? 'flash' : ['cut', 'wipe', 'cut'][k % 3],
      purpose: k === 0 ? 'the brand\'s own idea as motion (its name, its method)' : `proof ${k}: show what it does, not a claim`,
      // a different real camera move per chapter (critic: camera-variety): push in, pull back, locked on the click, whip of the wipe
      camera: k === 0 ? { from: -260, to: 0 } : wipe(k) ? { drift: false } : k % 3 === 1 ? { from: 0, to: -220 } : { drift: false },
      craft: { scale: k % 2 ? 'close' : 'medium', camera: k === 0 ? 'push in' : wipe(k) ? 'whip (full-frame wipe)' : k % 3 === 1 ? 'pull back' : 'locked, punch on the click', reason: k === 0 ? 'the hero grows into the idea on the drop' : 'the hero becomes the stage of this proof' },
      elements: !wipe(k) && (k === 0 || k % 3 === 1) ? [
        // the hero as the stage: a card (or the idea's circle) with an icon morph and one line
        { type: 'shape', id: hero(idx), hero: 'hero', x: 0.5, y: k === 0 ? Y.hero : Y.card, ...big, color: 'accent', at: 0, morph: k === 0 ? [{ at: beats - 2, w: 640, h: 640, r: 320 }] : [{ at: beats - 2, w: big.w * 0.94, h: big.h * 0.94 }], morphTo: next },
        { type: 'path', paths: [icon, ICONS[(k + 3) % ICONS.length]], times: [0.5, Math.max(1.5, beats / 2)], size: k === 0 ? 260 : 240, x: 0.5, y: (k === 0 ? Y.hero : Y.card) - (k === 0 ? 0 : 0.08), stroke: 'ink', width: 5 },
        { type: 'words', text: P(k === 0 ? 'the idea in the brand\'s words, ≤ 5 words' : `proof ${k}, ≤ 5 words`), size: k === 0 ? 120 : 96, y: k === 0 ? Y.head : Y.cardText, at: 0.5, out: beats - 1.25, ...(k === 0 ? {} : { color: 'ink', on: 'accent', shadow: false, width: Math.round(big.w * 0.88) }) },
      ] : !wipe(k) ? [
        // the hero as a button: a cursor causes the change (QUALITY_PLAYBOOK §5 "a cursor is a narrator")
        { type: 'shape', id: hero(idx), hero: 'hero', x: 0.5, y: Y.hero + 0.04, w: 420, h: 150, r: 75, color: 'accent', at: 0, morph: [{ at: 2.25, w: 470, h: 470, r: 235 }], morphTo: next },
        { type: 'cursor', points: [{ at: 0, x: 0.78, y: Y.hero + 0.2 }, { at: 1.75, x: 0.52, y: Y.hero + 0.05 }], clickAt: 2 },
        { type: 'icon', name: icon, size: 220, y: Y.hero + 0.04, at: 2.5, out: beats - 1, color: 'ink' },
        { type: 'stack', y: Y.head + 0.02, at: 0.25, lines: [{ text: P(`proof ${k}, ≤ 4 words`), size: 120 }, { text: P('what changes for the viewer, ≤ 5 words'), size: 76, color: 'accent', at: 2.25 }] },
      ] : [
        // the world wipes in the hero's colour: one punchy word, then a second wipe carries the support line
        { type: 'wipes', items: [{ at: 0, bg: 'accent', fg: 'ink', text: P(`proof ${k}, ONE word`), size: 210, icon }, { at: Math.round(beats / 2), bg: 'ink', fg: 'text', text: P('one support line, ≤ 4 words'), size: 104 }] },
      ] });
  });
  // payoff on the last drop: the brand whole, the promise, and the hero lands as the one action (QUALITY_PLAYBOOK §0, §5)
  const brandEl = brief.logo ? { type: 'image', asset: 'logo', role: 'logo', w: portrait ? 380 : 360, h: portrait ? 380 : 360, y: Y.name - 0.02, drift: 0, at: 0 } : { type: 'words', text: brief.brand || P('brand name exactly as the logo writes it'), size: 170, y: Y.name, at: 0 };
  scenes.push({ id: 'payoff', beats: payoff, music: 'finale', drop: true, transition: 'flash', hold: true, breathe: true, purpose: 'payoff: brand whole, one line, one action', craft: { scale: 'wide', camera: 'slow push (breathe)', reason: 'logo shown whole; the hero lands last as the CTA button' },
    elements: [
      brandEl,
      { type: 'words', text: brief.promise || P('the promise in the client\'s own words'), size: 84, weight: 600, y: Y.line + 0.02, at: 1, color: 'ice' },
      { type: 'shape', id: hero(n - 1), hero: 'hero', x: 0.5, y: Y.cta + 0.03, w: 120, h: 120, r: 60, color: 'accent', at: 0, morph: [{ at: 2, w: portrait ? 720 : 640, h: 140, r: 70 }] },
      { type: 'pill', parts: [brief.cta || P('one action, the client\'s CTA words')], w: portrait ? 720 : 640, h: 140, y: Y.cta + 0.03, bg: 'accent', color: 'ink', size: 64, at: 2.5 },
    ] });
  const spec = {
    title: brief.title || brief.subject || P('film title'), format: portrait ? 'reel' : 'youtube', bpm: 120,
    mode: ['showreel', 'product', 'launch-story', 'explainer'].includes(brief.mode) ? brief.mode : 'product',   // sets the edit pace the critic checks
    background: 'ink', grid: false, vignette: false,   // a clean stage: the brand (films/<film>/brand.json, skill brand-kit) supplies the look
    music: { progression: ['Am', 'F', 'C', 'G'], final: 'C', hook: 'pop332' },
    honesty: 'only the client\'s words, claims and numbers (QUALITY_PLAYBOOK §0, skill data-honesty)',
    creative: { viewer: brief.viewer || P('who watches, in one line'), problem: brief.problem || P('their problem, the hook'), endState: brief.endState || P('what they feel, know or do in the last second'), hero: P('ONE object that does every job, e.g. the logo\'s dot'), idea: P('the brand\'s name or method as motion'), payoff: P('logo whole + promise'), cta: brief.cta || P('one action'), music: 'western, a real beat, one hook that returns every chapter (owner taste)',
      ...(brief.style ? { style: brief.style } : {}),
      structures: [P('structure A in one line, e.g. a single journey of the hero'), P('structure B, e.g. before / after'), P('structure C, e.g. a countdown or a list that turns')],
      choice: P('which structure and why, one line'),
      benchmark: { learn: P('one or two reference works: what to learn (pacing, camera, colour logic)'), avoid: P('what NOT to take from them (characters, designs, melodies, shots, logos)') } },
    ...(brief.logo ? { assets: [{ name: 'logo', kind: 'image', file: brief.logo, rights: P('who owns the logo and the permission') }] } : {}),
    scenes,
  };
  const todo = [];
  const walk = (o, path) => { if (typeof o === 'string' && /[‹›]/.test(o)) todo.push({ path, write: o.slice(1, -1) }); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k); };
  walk(spec, '');
  return { spec, todo, arc: { hook, chapters, payoff, seconds: duration } };
}
