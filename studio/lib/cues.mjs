// One cue sheet for picture AND sound (production.json → cues). A cue is a meaningful moment:
// { id, t, kind, shot?, sound?: { type, ...params }, audioOffset?, note? }
//   kind: transition | reveal | impact | copy | ui | music | beat (free text allowed, these are conventional)
//   sound.type: a key of SFX in lib/sfx.mjs; null/absent = picture-only cue (most cues should be silent)
//   audioOffset: seconds the sound leads (negative, J-cut) or trails (positive, L-cut) the picture.
// Films read cue times for picture; score.mjs calls placeCues; validation keeps sound selective.
import { SFX } from './sfx.mjs';

export function validateCues(plan, { maxPerWindow = 3, window = 4, minGap = 0.25, maxSoundedShare = 0.6 } = {}) {
  const errors = [], warnings = [];
  const cues = plan?.cues;
  if (cues === undefined) return { errors, warnings };
  if (!Array.isArray(cues)) return { errors: ['cues must be an array'], warnings };
  // Malformed shots are reported by validateProduction; here only valid shot objects are mapped (audit B04).
  const ids = new Set(), shots = new Map((Array.isArray(plan.shots) ? plan.shots : []).filter(s => s && typeof s === 'object' && s.id).map(s => [s.id, s]));
  let last = -Infinity;
  for (const c of cues) {
    const id = c?.id || '(unnamed cue)';
    if (!c || typeof c !== 'object') { errors.push('cue must be an object'); continue; }
    if (!c.id || ids.has(c.id)) errors.push(`${id}: cue ids must be unique`); ids.add(c.id);
    if (!Number.isFinite(c.t) || c.t < 0 || (plan.duration && c.t > plan.duration)) errors.push(`${id}: cue time outside the film`);
    if (c.t < last) errors.push(`${id}: cues must be ordered by time`); last = c.t;
    if (typeof c.kind !== 'string' || !c.kind.trim()) errors.push(`${id}: cue kind required`);
    if (c.shot !== undefined) {
      const s = shots.get(c.shot);
      if (!s) errors.push(`${id}: unknown shot ${c.shot}`);
      else if (c.t < s.start - 1e-6 || c.t > s.end + 1e-6) errors.push(`${id}: time ${c.t}s is outside shot ${c.shot}`);
    }
    if (c.sound) {
      if (!SFX[c.sound.type]) errors.push(`${id}: unknown sound type ${c.sound.type}; choose from ${Object.keys(SFX).join(', ')}`);
      if (c.sound.gain !== undefined && !(c.sound.gain >= 0 && c.sound.gain <= 4)) errors.push(`${id}: sound gain must be 0..4`);
    }
    if (c.audioOffset !== undefined && !(Number.isFinite(c.audioOffset) && Math.abs(c.audioOffset) <= 2)) errors.push(`${id}: audioOffset must be within ±2 s`);
  }
  const sounded = cues.filter(c => c?.sound && Number.isFinite(c.t)).map(c => ({ id: c.id, t: c.t + (c.audioOffset || 0) })).sort((a, b) => a.t - b.t);
  for (let i = 0; i < sounded.length; i++) {
    const inWin = sounded.filter(s => s.t >= sounded[i].t && s.t < sounded[i].t + window).length;
    if (inWin > maxPerWindow) { warnings.push(`${inWin} sound accents within ${window}s from ${sounded[i].t}s: is every one earning its place?`); break; }
  }
  for (let i = 1; i < sounded.length; i++) if (sounded[i].t - sounded[i - 1].t < minGap) warnings.push(`${sounded[i - 1].id} and ${sounded[i].id} are ${Math.round((sounded[i].t - sounded[i - 1].t) * 1000)} ms apart; they will smear`);
  const transitions = cues.filter(c => c?.kind === 'transition');
  if (transitions.length >= 4 && transitions.filter(c => c.sound).length / transitions.length > maxSoundedShare)
    warnings.push(`${transitions.filter(c => c.sound).length}/${transitions.length} transitions carry a sound; let some cuts ride the music`);
  return { errors, warnings };
}

// Picture side (browser-safe, re-exported): cue time by id; throws on typos so sync cannot silently drift.
export { cueTime, cuesOf } from './cuesheet.js';

// Sound side: render every sounded cue into a bus. gain multiplies each cue's own gain.
export function placeCues(bus, cues = [], { gain = 1 } = {}) {
  let placed = 0;
  for (const c of cues) {
    if (!c?.sound) continue;
    const def = SFX[c.sound.type];
    if (!def) throw new Error(`unknown sound type ${c.sound.type}`);
    const { type, gain: g = 1, ...params } = c.sound;
    const vel = (params.vel ?? 0.4) * g * gain;
    def.fn(bus, c.t + (c.audioOffset || 0), { ...params, vel });
    placed++;
  }
  return placed;
}

// Expected audible transient for a sounded cue (for sync QA): riser → end, whoosh → peak, others → start.
export const expectedTransient = c => c.t + (c.audioOffset || 0);

// Compare sounded transient cues against onsets measured in the rendered SFX stem.
export function cueSync(cues = [], onsets = [], { tolerance = 0.04 } = {}) {
  return cues.filter(c => c?.sound && ['transient'].includes(SFX[c.sound.type]?.at)).map(c => {
    const t = expectedTransient(c);
    const near = onsets.reduce((best, o) => (Math.abs(o - t) < Math.abs(best - t) ? o : best), Infinity);
    const delta = Number.isFinite(near) ? +(near - t).toFixed(3) : null;
    return { id: c.id, t, onset: Number.isFinite(near) ? near : null, delta, ok: delta !== null && Math.abs(delta) <= tolerance };
  });
}
