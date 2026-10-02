// Browser-safe cue sheet access for film.js (lib/cues.mjs adds validation and sound placement in Node).
export function cueTime(plan, id) {
  const c = (plan.cues || []).find(x => x.id === id);
  if (!c) throw new Error(`unknown cue ${id}`);
  return c.t;
}
// All cues of a kind (e.g. every 'transition'), in time order.
export const cuesOf = (plan, kind) => (plan.cues || []).filter(c => c.kind === kind).sort((a, b) => a.t - b.t);
