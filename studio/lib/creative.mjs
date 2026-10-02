// Creative-plan diagnostics. Warning signals only, never a taste score.

const filled = v => typeof v === 'string' && v.trim().length > 0;

function runLength(shots, getter) {
  const runs = []; let start = 0, value;
  for (let i = 0; i <= shots.length; i++) {
    const v = i < shots.length ? getter(shots[i]) : Symbol('end');
    if (i === 0) { value = v; continue; }
    if (v !== value) {
      if (value !== undefined && value !== null && value !== '') runs.push({ value, start, end: i - 1, count: i - start });
      start = i; value = v;
    }
  }
  return runs;
}

export function creativeFingerprint(plan) {
  const shots = Array.isArray(plan?.shots) ? plan.shots : [];
  const count = key => {
    const map = {};
    for (const s of shots) {
      const v = s?.craft?.[key];
      if (!filled(v)) continue;
      map[v] = (map[v] || 0) + 1;
    }
    return map;
  };
  return {
    shots: shots.length,
    craftCoverage: shots.length ? shots.filter(s => s?.craft && typeof s.craft === 'object').length / shots.length : 0,
    scales: count('scale'), transitions: count('transition'), cameras: count('camera'), focals: count('focal'),
  };
}

export function creativeIssues(plan, { minCraftCoverage = 0.75, maxPrimaryMotions = 2, sameScaleRun = 3, sameCameraRun = 4, sameTransitionRun = 3 } = {}) {
  const issues = [];
  const shots = Array.isArray(plan?.shots) ? plan.shots : [];
  if (shots.length < 2) return issues;
  const craftShots = shots.filter(s => s?.craft && typeof s.craft === 'object');
  if (craftShots.length / shots.length < minCraftCoverage)
    issues.push(`craft metadata covers ${craftShots.length}/${shots.length} shots; describe scale/camera/focal/transition before full production`);

  for (const s of craftShots) {
    const id = s.id || '(unnamed shot)';
    const motions = s.craft.primaryMotions;
    if (Array.isArray(motions) && motions.length > maxPrimaryMotions)
      issues.push(`${id}: ${motions.length} primary motions compete at once; keep at most ${maxPrimaryMotions} unless the overload is deliberate`);
    if (s.craft.depthLayers !== undefined && (!Number.isInteger(s.craft.depthLayers) || s.craft.depthLayers < 1))
      issues.push(`${id}: depthLayers must be a positive integer`);
  }

  for (const r of runLength(shots, s => s?.craft?.scale))
    if (r.count >= sameScaleRun) issues.push(`shots ${r.start + 1}-${r.end + 1}: repeated "${r.value}" scale ${r.count} times; confirm the visual progression is intentional`);
  for (const r of runLength(shots, s => s?.craft?.camera))
    if (r.count >= sameCameraRun) issues.push(`shots ${r.start + 1}-${r.end + 1}: repeated "${r.value}" camera treatment ${r.count} times; consider a motivated change of viewpoint/energy`);
  for (const r of runLength(shots, s => s?.craft?.transition))
    if (r.count >= sameTransitionRun && r.value !== 'cut') issues.push(`shots ${r.start + 1}-${r.end + 1}: transition "${r.value}" repeats ${r.count} times in a row`);

  const fp = creativeFingerprint(plan);
  for (const [name, count] of Object.entries(fp.transitions).filter(([k]) => k !== 'cut')) {
    if (shots.length >= 5 && count > Math.ceil(shots.length * 0.55))
      issues.push(`transition "${name}" appears in ${count}/${shots.length} shots; one effect is becoming the film instead of supporting it`);
  }
  return issues;
}

export function validateCraft(craft, id = '(unnamed shot)') {
  const errors = [];
  if (craft === undefined) return errors;
  if (!craft || typeof craft !== 'object' || Array.isArray(craft)) return [`${id}: craft must be an object`];
  for (const field of ['scale', 'transition', 'camera', 'focal', 'audioCue'])
    if (craft[field] !== undefined && !filled(craft[field])) errors.push(`${id}: craft.${field} must be a nonempty string`);
  if (craft.primaryMotions !== undefined && (!Array.isArray(craft.primaryMotions) || craft.primaryMotions.some(x => !filled(x))))
    errors.push(`${id}: craft.primaryMotions must be an array of nonempty strings`);
  if (craft.depthLayers !== undefined && (!Number.isInteger(craft.depthLayers) || craft.depthLayers < 1 || craft.depthLayers > 12))
    errors.push(`${id}: craft.depthLayers must be an integer 1..12`);
  return errors;
}

// ---------- Generation 2: creative direction block + cross-film anti-repetition ----------
// production.creative = { viewer, problem, promise, evidence, emotion, motif, palette: ['#hex'...], light,
//   typography: { display, text }, camera, transitions: [names], motion, sound, pacing, payoff, cta,
//   styleFrames: { hook, proof, payoff } (seconds), proof: { start, end } (the 8–12 s proof segment) }
export const CREATIVE_FIELDS = ['viewer', 'problem', 'promise', 'evidence', 'emotion', 'motif', 'light', 'camera', 'motion', 'sound', 'pacing', 'payoff', 'cta'];
const HEX = /^#[0-9a-f]{6}$/i;

export function validateCreative(plan) {
  const errors = [], warnings = [];
  const c = plan?.creative;
  if (c === undefined) { warnings.push('no creative block: define viewer, promise, motif, palette, light, type, camera/transition/motion/sound language, pacing, payoff and style frames (templates/production.json)'); return { errors, warnings }; }
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { errors: ['creative must be an object'], warnings };
  const missing = CREATIVE_FIELDS.filter(f => !filled(c[f]));
  if (missing.length) warnings.push(`creative direction is missing: ${missing.join(', ')}`);
  if (c.palette !== undefined && (!Array.isArray(c.palette) || c.palette.some(x => !HEX.test(x)))) errors.push('creative.palette must be an array of #rrggbb colours');
  if (Array.isArray(c.palette) && c.palette.length > 6) warnings.push(`palette has ${c.palette.length} colours; a directed palette is usually 3–5`);
  if (c.typography !== undefined && (typeof c.typography !== 'object' || !filled(c.typography.display))) errors.push('creative.typography needs at least a display font');
  if (c.transitions !== undefined && (!Array.isArray(c.transitions) || c.transitions.some(x => !filled(x)))) errors.push('creative.transitions must be an array of names');
  const d = plan.duration;
  if (c.styleFrames !== undefined) {
    for (const k of ['hook', 'proof', 'payoff']) {
      const t = c.styleFrames?.[k];
      if (!Number.isFinite(t) || t < 0 || (d && t > d)) errors.push(`creative.styleFrames.${k} must be a time inside the film`);
    }
  } else warnings.push('no styleFrames (hook / proof / payoff): pick the three frames that must look right before expanding');
  if (c.proof !== undefined) {
    const { start, end } = c.proof || {};
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start < 0 || (d && end > d)) errors.push('creative.proof must be { start, end } inside the film');
    else if (end - start < 6 || end - start > 14) warnings.push(`proof segment is ${(end - start).toFixed(1)} s; 8–12 s with one real transition and sound is the useful size`);
  }
  return { errors, warnings };
}

const lab = hex => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const xyz = [(c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883]
    .map(v => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
};
export const deltaE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const words = s => new Set(String(s || '').toLowerCase().match(/[a-z؀-ۿ]{4,}/gu) || []);

// Engineering is reused; aesthetics should not be by accident. Compare this plan's look with other films.
export function lookOverlap(plan, others = []) {
  const warnings = [], c = plan?.creative;
  if (!c) return warnings;
  const mineT = new Set([...(c.transitions || []), ...(plan.shots || []).map(s => s?.craft?.transition).filter(Boolean)]);
  for (const { name, plan: o } of others) {
    const oc = o?.creative || {};
    const fontsA = [c.typography?.display, c.typography?.text].filter(Boolean).map(x => x.toLowerCase());
    const fontsB = [oc.typography?.display, oc.typography?.text].filter(Boolean).map(x => x.toLowerCase());
    if (fontsA.length && fontsA.length === fontsB.length && fontsA.every(f => fontsB.includes(f))) warnings.push(`same font pairing as ${name} (${fontsA.join(' + ')})`);
    if (Array.isArray(c.palette) && Array.isArray(oc.palette)) {
      const shared = c.palette.filter(x => oc.palette.some(y => deltaE(x, y) < 10)).length;
      if (shared >= Math.min(3, c.palette.length)) warnings.push(`palette nearly matches ${name} (${shared} colours within ΔE 10)`);
    }
    const mw = words(c.motif), ow = words(oc.motif), sharedMotif = [...mw].filter(w => ow.has(w));
    if (sharedMotif.length) warnings.push(`motif shares "${sharedMotif.join(', ')}" with ${name}`);
    const theirT = new Set([...(oc.transitions || []), ...(o?.shots || []).map(s => s?.craft?.transition).filter(Boolean)]);
    const overlap = [...mineT].filter(x => x !== 'cut' && theirT.has(x));
    const denom = [...mineT].filter(x => x !== 'cut').length;
    if (denom >= 2 && overlap.length / denom >= 0.7) warnings.push(`transition language repeats ${name} (${overlap.join(', ')})`);
    const cam = [...words(c.camera)].filter(w => words(oc.camera).has(w));
    if (cam.length >= 3) warnings.push(`camera language overlaps ${name} (${cam.slice(0, 4).join(', ')})`);
  }
  return warnings;
}
