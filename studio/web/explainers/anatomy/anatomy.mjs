// Pure helpers for the anatomy explainer. No Three.js here, so a film or a test can
// ask for the pose at time t without starting a renderer. The page is Arabic (dir=rtl);
// labels and notes stay whole strings.

export const ANATOMY_DURATION = 16;

function smooth(p) {
  const x = Math.min(1, Math.max(0, p));
  return 1 - (1 - x) ** 3;
}

// Deterministic pose. Same t → same orbit, explode and selected part. Out-of-order calls are safe.
export function poseAt(t, count) {
  const u = Math.max(0, Number(t) || 0);
  const n = Math.max(0, count | 0);
  const orbit = 0.5 + 0.65 * Math.sin(u * 0.35);
  const polar = 0.28 + 0.08 * Math.sin(u * 0.22);
  let explode = u < 1 ? 0 : u < 3.4 ? smooth((u - 1) / 2.4) : 1;
  let selected = -1;
  if (u >= 4 && n > 0) {
    selected = Math.min(n - 1, Math.floor((u - 4) / 1.35));
    explode = Math.max(explode, 0.72);
  }
  return { orbit, polar, explode, selected };
}

export function validateParts(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.parts) || !data.parts.length) throw new Error('parts JSON needs a parts array');
  const ids = new Set();
  for (const p of data.parts) {
    if (!p || typeof p.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(p.id) || ids.has(p.id)) throw new Error(`bad part id: ${p && p.id}`);
    ids.add(p.id);
    if (typeof p.label !== 'string' || !p.label.trim()) throw new Error(`${p.id}: label`);
    if (typeof p.note !== 'string' || !p.note.trim()) throw new Error(`${p.id}: note`);
    if (!Array.isArray(p.offset) || p.offset.length !== 3 || p.offset.some((n) => typeof n !== 'number' || !Number.isFinite(n))) throw new Error(`${p.id}: offset`);
    if (typeof p.colour !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(p.colour)) throw new Error(`${p.id}: colour`);
  }
  return data;
}
