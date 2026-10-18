// Motion Prompt cards inside a film (library/README.md). A card is a vendored Canvas 2D cell, a pure function of u in [0, cycle):
//   import motion from '../library/motion-prompt/packs/motion.js';
//   import { drawCard, holdU, loopU } from '../lib/mpcard.js';
//   drawCard(ctx, motion, 12, holdU(t - 2, 1.0), { x: 690, y: 436, scale: 1 });   // #012 shape morph, frozen after its first morph
// Time rules (upstream porting.md): loop with loopU; play an entrance once and stay with holdU(t, uHold), uHold inside the hold;
// fit a slot by lengthening the hold, never by stretching the move. The pack's palette and type are the sample's: retint before delivery.

export const loopU = (t, cycle) => ((t % cycle) + cycle) % cycle;
export const holdU = (t, uHold) => Math.max(0, Math.min(t, uHold));
// Play [0, uHold], hold for `hold` seconds, then continue from uExit (the start of the element's own exit) at its designed speed.
export const onceU = (t, uHold, hold, uExit, cycle) => (t <= uHold ? Math.max(0, t) : t <= uHold + hold ? uHold : Math.min(cycle - 1e-6, uExit + (t - uHold - hold)));

// Some photo cells (#105, #106, #111) cache scratch canvases on their first call, so the very first frame differs (measured
// 2026-10-18 in Chromium). Render slices start in fresh browsers: draw each cell off-screen across its cycle before its first real frame.
const warmed = new WeakSet();
function warm(cell, w, h, cycle) {
  if (warmed.has(cell)) return;
  warmed.add(cell);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const k = c.getContext('2d');
  for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) { k.save(); cell(k, w, h, cycle * f); k.restore(); }   // a cell may skip its cache at quiet u
}

// Draw element `no` (1–24, its number inside the pack) of `pack` (a default export from library/motion-prompt/packs/*.js)
// with its top-left card corner at (x, y), scaled uniformly; clipped to the card unless clip is false.
export function drawCard(ctx, pack, no, u, { x = 0, y = 0, scale = 1, clip = true } = {}) {
  const cell = pack.cells[no - 1];
  if (!cell) throw new Error(`Motion Prompt pack ${pack.id} has no element ${no}`);
  const w = pack.width, h = pack.height;
  warm(cell, w, h, pack.cycle);
  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);
  if (clip) { ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); }
  ctx.save(); cell(ctx, w, h, Math.max(0, Math.min(u, pack.cycle - 1e-6))); ctx.restore();
  ctx.restore();
}
