// Transition vocabulary: how one shot hands the viewer's eye to the next. Pure state per frame.
// A transition is a grammar choice, not decoration. Each entry records its purpose, when it helps,
// when it hurts and its parameters; `suggestTransitions` reasons from the visual relationship of
// the two shots. Implementations return styles for the outgoing root (a), incoming root (b) and an
// optional overlay; applyTransition sets them. Use dedicated wrapper roots you do not style otherwise.
import { clamp, lerp } from './motion.js';
import { cinematicEase } from './cinema.js';
import { fbm } from './kinetics.js';
import { softWipeMask, clipCircle, clipInset, clipPolygon, coverRadius, setMask } from './fx.js';

export const TRANSITIONS = Object.freeze({
  cut: { family: 'editorial', purpose: 'Instant change of idea, angle or scale; the strongest, most honest transition.',
    use: 'action continues, new information, rhythmic accents, any time in doubt', avoid: 'two near-identical framings (jump cut) unless intended',
    params: {} },
  jcut: { family: 'editorial', purpose: 'Sound of the next shot arrives before its picture: pulls the viewer forward.',
    use: 'scene/chapter changes, reveals that are heard first', avoid: 'silent edits', params: { audioLead: 0.3 }, audio: 'lead' },
  lcut: { family: 'editorial', purpose: 'Sound of the outgoing shot continues over the next picture: continuity of feeling.',
    use: 'emotional carry-over, a phrase that should finish', avoid: 'conflicting sounds', params: { audioTail: 0.4 }, audio: 'tail' },
  matchCut: { family: 'match', purpose: 'Same position/shape/scale across a change of context: says "same thing, new meaning".',
    use: 'same product in a new light/place, shape rhymes', avoid: 'subjects that cannot be aligned truthfully',
    params: { boxA: 'subject box in a (px)', boxB: 'subject box in b (px)', dissolve: 0, settle: true } },
  dissolve: { family: 'blend', purpose: 'Time passing, softness, memory.', use: 'abstract textures, atmosphere, time cuts',
    avoid: 'solid products in both shots (reads as a doubled product) unless pixel-matched', params: {} },
  wipe: { family: 'graphic', purpose: 'Directional page-turn: graphic, deliberate, editorial.', use: 'motion graphics, lists, chapters',
    avoid: 'premium photographic moments where it looks like a template', params: { angle: 90, softness: 0.12 } },
  maskedReveal: { family: 'graphic', purpose: 'The next shot grows out of a point or shape in this one.',
    use: 'reveal from a button, a lens, a window, a product opening', avoid: 'reveals with no motivating origin',
    params: { cx: 0.5, cy: 0.5, shape: 'circle', box: null } },
  shapeMatch: { family: 'match', purpose: 'An object\'s outline becomes the window into the next shot.',
    use: 'round lid → round world, phone screen → app close-up', avoid: 'shapes that do not rhyme', params: { box: 'outgoing object box', round: 0 } },
  foregroundWipe: { family: 'occlusion', purpose: 'A real foreground object crossing the lens hides the cut: feels shot, not edited.',
    use: 'ropes, pillars, leaves, hands, a passing product', avoid: 'no physical occluder in the world', params: { direction: 'rtl', occluder: null } },
  lightWipe: { family: 'light', purpose: 'A flash/band of light carries the change; energy and polish.',
    use: 'peaks, product gleam, a lamp turning on', avoid: 'calm, low-key films; repeated use', params: { angle: 100, width: 0.22, color: 'rgba(255,246,228,0.95)' } },
  textureWipe: { family: 'texture', purpose: 'The next shot appears through an organic matte (ink, smoke, paper).',
    use: 'handmade/organic brands, memory, craft', avoid: 'clean tech products', params: { seed: 7, scale: 3, softness: 0.08 } },
  focusHandoff: { family: 'focus', purpose: 'The lens lets go of one subject and finds the next; attention moves by optics.',
    use: 'same space, two depths; calm premium pacing', avoid: 'fast cuts, readable text inside the blur', params: { maxBlur: 22 } },
  colorHandoff: { family: 'color', purpose: 'A colour in the outgoing shot floods the frame and becomes the next background.',
    use: 'brand colour beats, product colour into a graphic', avoid: 'muddy or low-contrast colour pairs', params: { color: '#000', cx: 0.5, cy: 0.5 } },
  zoomContinuation: { family: 'motion', purpose: 'Push through one image into the next at continuous zoom velocity.',
    use: 'going inside/deeper, "zoom into the detail"', avoid: 'overuse; nausea-level speed', params: { cx: 0.5, cy: 0.5, factor: 2.2, maxBlur: 10 } },
  push: { family: 'motion', purpose: 'Both shots travel along one vector: the story continues in a direction.',
    use: 'timelines, before→after, sequences', avoid: 'premium still life', params: { direction: 'left' } },
  cameraPass: { family: 'motion', purpose: 'A fast camera move (whip) carries energy across the cut.',
    use: 'energy peaks, montage', avoid: 'calm films, readable text mid-move', params: { direction: 'left', maxBlur: 26 } },
});

const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const none = () => ({ visible: true, opacity: 1, transform: 'none', filter: 'none', clipPath: 'none', mask: null, origin: '50% 50%' });
const hidden = () => ({ ...none(), visible: false });
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// Transform that maps box B onto box A (both {x,y,w,h} in frame px), for match cuts.
export function matchTransform(boxA, boxB) {
  for (const b of [boxA, boxB]) if (!b || ![b.x, b.y, b.w, b.h].every(Number.isFinite) || b.w <= 0 || b.h <= 0) throw new Error('matchTransform needs boxes {x,y,w,h}');
  const scale = Math.sqrt((boxA.w * boxA.h) / (boxB.w * boxB.h));
  return { scale, x: boxA.x + boxA.w / 2 - (boxB.x + boxB.w / 2) * scale, y: boxA.y + boxA.h / 2 - (boxB.y + boxB.h / 2) * scale };
}

const noiseCache = new Map();
function noiseField(seed, scale, cw, ch) {
  const key = `${seed}:${scale}:${cw}:${ch}`;
  if (noiseCache.has(key)) return noiseCache.get(key);
  const v = new Float32Array(cw * ch); let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const n = fbm(x / cw * scale, y / cw * scale, { octaves: 4, seed }); v[y * cw + x] = n; lo = Math.min(lo, n); hi = Math.max(hi, n); }
  for (let i = 0; i < v.length; i++) v[i] = (v[i] - lo) / (hi - lo || 1);
  noiseCache.set(key, v); return v;
}
let textureCanvas;
function textureMask(p, { seed = 7, scale = 3, softness = 0.08 }, w, h) {
  const cw = 160, ch = Math.max(1, Math.round(160 * h / w)), n = noiseField(seed, scale, cw, ch);
  textureCanvas ||= document.createElement('canvas');
  textureCanvas.width = cw; textureCanvas.height = ch;
  const g = textureCanvas.getContext('2d'), img = g.createImageData(cw, ch), th = lerp(-softness, 1 + softness, p);
  for (let i = 0; i < n.length; i++) { img.data[i * 4 + 3] = Math.round(255 * (1 - smooth(th - softness, th + softness, n[i]))); }
  g.putImageData(img, 0, 0);
  return `url(${textureCanvas.toDataURL()})`;
}

// Styles at eased progress p (0..1) for a w×h frame. `u` is linear progress (for velocity-continuous moves).
export function transitionState(name, p, opts = {}, { w, h } = {}) {
  const def = TRANSITIONS[name];
  if (!def) throw new Error(`unknown transition "${name}"; see TRANSITIONS`);
  if (!(w > 0 && h > 0)) throw new Error('transitionState needs frame size {w,h}');
  const o = { ...def.params, ...opts }, a = none(), b = none(); let overlay = null;
  if (p <= 0) return { a, b: hidden(), overlay };
  if (p >= 1 && !['matchCut'].includes(name)) return { a: hidden(), b, overlay };
  switch (name) {
    case 'cut': case 'jcut': case 'lcut': return { a: hidden(), b, overlay };
    case 'dissolve': b.opacity = p; break;
    case 'wipe': b.mask = softWipeMask(p, o); break;
    case 'maskedReveal': {
      const cx = o.box ? o.box.x + o.box.w / 2 : o.cx * w, cy = o.box ? o.box.y + o.box.h / 2 : o.cy * h, R = coverRadius(cx, cy, w, h);
      if (o.shape === 'diamond') { const r = lerp(0, R * 1.42, p); b.clipPath = clipPolygon([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]]); }
      else b.clipPath = clipCircle(cx, cy, lerp(0, R, p));
      break;
    }
    case 'shapeMatch': {
      const bx = o.box; if (!bx) throw new Error('shapeMatch needs box');
      b.clipPath = clipInset(lerp(bx.y, 0, p), lerp(w - bx.x - bx.w, 0, p), lerp(h - bx.y - bx.h, 0, p), lerp(bx.x, 0, p), lerp(o.round || 0, 0, p));
      break;
    }
    case 'foregroundWipe': {
      const rtl = o.direction !== 'ltr', edge = rtl ? lerp(w, 0, p) : lerp(0, w, p);
      a.clipPath = rtl ? clipInset(0, w - edge, 0, 0) : clipInset(0, 0, 0, edge);
      b.clipPath = rtl ? clipInset(0, 0, 0, edge) : clipInset(0, w - edge, 0, 0);
      if (o.occluder) overlay = { ...none(), element: o.occluder, transform: `translate(${(edge - (o.occluderWidth || 0) / 2).toFixed(2)}px, 0px)` };
      break;
    }
    case 'lightWipe': {
      const c = lerp(-o.width, 1 + o.width, p), edge = clamp(c) * w;
      a.clipPath = clipInset(0, 0, 0, edge); b.clipPath = clipInset(0, w - edge, 0, 0);
      overlay = { ...none(), blend: 'screen', background: `linear-gradient(${o.angle}deg, transparent ${(c - o.width) * 100}%, ${o.color} ${c * 100}%, transparent ${(c + o.width) * 100}%)` };
      break;
    }
    case 'textureWipe': b.mask = textureMask(p, o, w, h); break;
    case 'focusHandoff':
      a.filter = `blur(${(o.maxBlur * smooth(0, 0.55, p)).toFixed(2)}px)`;
      b.filter = `blur(${(o.maxBlur * (1 - smooth(0.45, 1, p))).toFixed(2)}px)`;
      b.opacity = smooth(0.38, 0.62, p); // blend only while both images are deeply defocused
      break;
    case 'colorHandoff': {
      const cx = o.cx * w, cy = o.cy * h, R = coverRadius(cx, cy, w, h);
      overlay = { ...none(), background: o.color, clipPath: clipCircle(cx, cy, R * smooth(0, 0.5, p)), opacity: 1 - smooth(0.55, 1, p) };
      if (p < 0.5) Object.assign(b, hidden()); else Object.assign(a, hidden());
      break;
    }
    case 'zoomContinuation': {
      const r = Math.log(o.factor) * 2, origin = `${o.cx * 100}% ${o.cy * 100}%`;
      a.origin = b.origin = origin;
      a.transform = `scale(${Math.exp(r * Math.min(p, 0.55)).toFixed(5)})`;
      b.transform = `scale(${Math.exp(r * (Math.max(p, 0.45) - 1)).toFixed(5)})`;
      a.filter = `blur(${(o.maxBlur * smooth(0.2, 0.55, p)).toFixed(2)}px)`;
      b.filter = `blur(${(o.maxBlur * (1 - smooth(0.45, 0.8, p))).toFixed(2)}px)`;
      b.opacity = smooth(0.45, 0.55, p);
      break;
    }
    case 'push': case 'cameraPass': {
      const [dx, dy] = DIRS[o.direction] || DIRS.left;
      a.transform = `translate(${(dx * w * p).toFixed(2)}px, ${(dy * h * p).toFixed(2)}px)`;
      b.transform = `translate(${(-dx * w * (1 - p)).toFixed(2)}px, ${(-dy * h * (1 - p)).toFixed(2)}px)`;
      if (name === 'cameraPass') { const bl = (o.maxBlur * Math.sin(Math.PI * p)).toFixed(2); a.filter = b.filter = `blur(${bl}px)`; }
      break;
    }
    case 'matchCut': {
      if (!o.boxA || !o.boxB) throw new Error('matchCut needs boxA and boxB');
      const m = matchTransform(o.boxA, o.boxB), k = o.settle === false ? 0 : p;
      b.origin = '0 0';
      b.transform = `translate(${lerp(m.x, 0, k).toFixed(2)}px, ${lerp(m.y, 0, k).toFixed(2)}px) scale(${Math.exp(lerp(Math.log(m.scale), 0, k)).toFixed(5)})`;
      if (o.dissolve > 0) b.opacity = clamp(p / o.dissolve); else Object.assign(a, hidden());
      if (p >= 1) Object.assign(a, hidden());
      break;
    }
  }
  return { a, b, overlay };
}

function setStyles(node, s) {
  if (!node) return;
  node.style.visibility = s.visible ? 'visible' : 'hidden';
  node.style.opacity = String(+clamp(s.opacity).toFixed(4));
  node.style.transform = s.transform; node.style.transformOrigin = s.origin;
  node.style.filter = s.filter; node.style.clipPath = s.clipPath;
  setMask(node, s.mask);
}

// Apply a transition at time t over [start, start + duration]. overlay: an element above both roots
// (required by lightWipe/colorHandoff; foregroundWipe moves `occluder` itself). Returns progress.
export function applyTransition(name, t, { a, b, overlay, start, duration, ease = cinematicEase, w, h, ...opts }) {
  const u = duration > 0 ? clamp((t - start) / duration) : (t >= start ? 1 : 0);
  const state = transitionState(name, name === 'zoomContinuation' ? u : ease(u), opts, { w, h });
  setStyles(a, state.a); setStyles(b, state.b);
  if (state.b.visible && b) b.style.zIndex = String(Math.max(1, +a?.style.zIndex || 0) + 1);
  const ov = state.overlay;
  if (overlay) {
    overlay.style.display = ov && !ov.element ? 'block' : 'none';
    if (ov && !ov.element) { overlay.style.background = ov.background || 'none'; overlay.style.mixBlendMode = ov.blend || 'normal';
      overlay.style.clipPath = ov.clipPath || 'none'; overlay.style.opacity = String(ov.opacity ?? 1); }
  }
  if (opts.occluder) { opts.occluder.style.display = ov?.element ? '' : 'none'; if (ov?.element) opts.occluder.style.transform = ov.transform; }
  return u;
}

// Decision support: candidate transitions for the relationship between two shots, with reasons.
// ctx: { sameSubject, sameSpace, alignable, foreground, sharedColor, direction, energy: 'calm'|'build'|'peak',
//        depthChange, originPoint, organic, chapter }. The editor still chooses; a cut is always valid.
export function suggestTransitions(ctx = {}) {
  const out = [], add = (name, reason) => { if (!out.some(x => x.name === name)) out.push({ name, reason }); };
  if (ctx.sameSubject && ctx.alignable) add('matchCut', 'same subject can be aligned: the cut becomes a rhyme');
  if (ctx.sameSpace && ctx.depthChange) add('focusHandoff', 'same space, attention moves between depths');
  if (ctx.foreground) add('foregroundWipe', 'a real foreground object can hide the edit');
  if (ctx.originPoint) add('maskedReveal', 'the next shot can grow from a motivated point');
  if (ctx.sharedColor) add('colorHandoff', 'a shared colour can carry the eye');
  if (ctx.direction) add(ctx.energy === 'peak' ? 'cameraPass' : 'push', `motion continues ${ctx.direction}`);
  if (ctx.energy === 'peak') add('lightWipe', 'a musical/visual peak can take a flash of light');
  if (ctx.organic) add('textureWipe', 'organic material suits a textured matte');
  if (ctx.chapter) add('jcut', 'a new chapter can be heard before it is seen');
  add('cut', 'always valid; prefer it when no relationship motivates anything else');
  return out;
}

// Advisory checks on a planned sequence of transition names.
export function transitionIssues(names, { maxShare = 0.5, maxFamilies = 3 } = {}) {
  const issues = [], counts = {}, families = new Set();
  for (const n of names) {
    if (!TRANSITIONS[n]) { issues.push(`"${n}" is not in the transition vocabulary (free-text craft notes are fine; map it to a name to enable checks)`); continue; }
    counts[n] = (counts[n] || 0) + 1; if (n !== 'cut') families.add(TRANSITIONS[n].family);
  }
  for (const [n, c] of Object.entries(counts)) if (n !== 'cut' && names.length >= 4 && c / names.length > maxShare) issues.push(`"${n}" is ${c}/${names.length} of the transitions; it is becoming the film's signature effect`);
  if (families.size > maxFamilies) issues.push(`${families.size} transition families (${[...families].join(', ')}); choose at most ${maxFamilies} for one coherent language`);
  for (let i = 2; i < names.length; i++) if (names[i] !== 'cut' && names[i] === names[i - 1] && names[i] === names[i - 2]) issues.push(`"${names[i]}" three times in a row at transition ${i - 1}..${i + 1}`);
  return issues;
}
