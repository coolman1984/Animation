// Film 4 plates (run by film4/plates.mjs after the film 2/3 jobs):
//  swing-rig — wooden seat + ropes from the swing poster, AI cup removed and the seat inpainted
//              (the REAL cup is composited on it), ropes extended upward 900 px; poster space +900 y.
//  rope      — one isolated rope strand for the defocused foreground pass.
//  cup-2x    — the real cup cut-out, 2× with a gentle unsharp mask, for macro shots (origin 690,680).
async ({ layer, cup, plate }) => {
  const L0 = await lab.load(layer), CUP = await lab.load(cup), PL = await lab.load(plate);
  // Drop matte pixels that are just the poster's peach backdrop (close to the background model).
  const L = lab.clone(L0); const LD = lab.data(L); const PD = lab.data(PL).data;
  for (let i = 0; i < LD.data.length; i += 4) {
    const d = Math.hypot(LD.data[i] - PD[i], LD.data[i + 1] - PD[i + 1], LD.data[i + 2] - PD[i + 2]);
    if (d < 34) LD.data[i + 3] *= Math.max(0, (d - 22) / 12);
  }
  lab.put(L, LD);
  const W = L.width, H = L.height;
  const board = lab.pathMask(W, H, [['M', 205, 828], ['L', 870, 918], ['L', 990, 943], ['L', 1032, 968], ['L', 1028, 1045],
    ['L', 940, 1124], ['L', 870, 1110], ['L', 82, 968], ['L', 60, 940], ['L', 100, 896], ['Z']], 2);
  const knots = lab.pathMask(W, H, [['M', 105, 985], ['L', 188, 985], ['L', 188, 1030], ['L', 105, 1030], ['Z'],
    ['M', 820, 1110], ['L', 915, 1110], ['L', 915, 1185], ['L', 820, 1185], ['Z']], 2);
  const ropes = lab.pathMask(W, H, [['M', 108, 0], ['L', 252, 0], ['L', 252, 880], ['L', 108, 930], ['Z'],
    ['M', 850, 0], ['L', 1002, 0], ['L', 1002, 1000], ['L', 850, 1000], ['Z']], 2);
  const aiCup = lab.morph(lab.pathMask(W, H, [
    ['M', 384, 492], ['L', 398, 470], ['L', 450, 460], ['L', 545, 456], ['L', 650, 460], ['L', 700, 470],
    ['L', 712, 492], ['L', 700, 520], ['L', 694, 535], ['L', 656, 966], ['L', 432, 966], ['L', 400, 535],
    ['L', 392, 520], ['Z']], 1), 5);
  const keep = lab.subtract(lab.union(board, ropes), aiCup); // knots under the seat dropped: their matte carried backdrop
  const seat = lab.applyMask(L, keep);
  // Inpaint the seat where the AI cup stood (only inside the seat outline).
  const seatFilled = lab.applyMask(lab.fillHoles(lab.applyMask(L, lab.subtract(board, aiCup)), [3, 8, 20, 50]), board);
  const rig0 = lab.canvas(W, H); const g0 = rig0.getContext('2d');
  g0.drawImage(seatFilled, 0, 0); g0.drawImage(seat, 0, 0);
  const EXT = 900, rig = lab.canvas(W, H + EXT); const g = rig.getContext('2d');
  // The poster's top 280 px carry a blurred corner leaf: rebuild everything above y 280 from a clean rope band.
  for (let k = 5; k >= 1; k--) g.drawImage(rig0, 0, 270, W, 245, 0, EXT + 280 - k * 235, W, 245);
  g.drawImage(rig0, 0, 280, W, H - 280, 0, EXT + 280, W, H - 280);
  const rope = lab.crop(lab.applyMask(L, lab.pathMask(W, H, [['M', 900, 280], ['L', 1000, 280], ['L', 1000, 800], ['L', 900, 800], ['Z']], 1)), 880, 280, 140, 520, 1);
  // Cup macro plate: 2× + unsharp (amount 0.6, radius 1.6 px) on colour only.
  const big = lab.crop(CUP, 690, 680, 640, 900, 2);
  const soft = lab.data(lab.blur(big, 1.6)).data; const D = lab.data(big);
  for (let i = 0; i < D.data.length; i += 4) for (let c = 0; c < 3; c++) D.data[i + c] = Math.max(0, Math.min(255, D.data[i + c] * 1.6 - soft[i + c] * 0.6));
  lab.put(big, D);
  const dark = (src) => { const c = lab.canvas(src.width, src.height); const q = c.getContext('2d'); q.fillStyle = '#1d2a24'; q.fillRect(0, 0, c.width, c.height); q.drawImage(src, 0, 0); return c; };
  return { 'swing-rig': lab.url(rig), rope: lab.url(rope), 'cup-2x': lab.url(big), 'check-rig': lab.url(lab.crop(dark(rig), 0, 0, W, H + EXT, 0.5)) };
}
