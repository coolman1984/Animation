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
