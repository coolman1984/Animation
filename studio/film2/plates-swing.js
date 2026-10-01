// Plates for source/swing.jpg (1080x1350): text-free clean plate, swing assembly cut-out for the
// sway, and the brand logo (window + BALACONBAR) extracted as a crisp alpha matte.
async ({ swing }) => {
  const img = await lab.load(swing);
  const W = img.width, H = img.height;
  const px = lab.data(img).data;

  // 1. Remove the baked English headline: white letters + teal letters in a known box.
  const text = lab.canvas(W, H); const T = lab.data(text);
  for (let y = 200; y < 415; y++) for (let x = 210; x < 905; x++) {
    const i = (y * W + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
    const white = b > 206 && g > 212 && r > 225;
    const teal = r < 175 && g < 175;
    if (white || teal) T.data[i + 3] = 255;
  }
  lab.put(text, T);
  const textMask = lab.morph(text, 5);
  const clean = lab.fillHoles(lab.applyMask(img, lab.invert(textMask)), [3, 8, 20, 50]);

  // 2. Background model: blur away anything that is not smooth peach, twice.
  const dist = (A, B, i) => Math.hypot(A[i] - B[i], A[i + 1] - B[i + 1], A[i + 2] - B[i + 2]);
  const C = lab.data(clean).data;
  const rough = lab.canvas(W, H); const R = lab.data(rough);
  const blur1 = lab.data(lab.blur(clean, 50)).data;
  for (let i = 0; i < C.length; i += 4) if (dist(C, blur1, i) > 38) R.data[i + 3] = 255;
  lab.put(rough, R);
  const bgPlate = lab.fillHoles(lab.applyMask(clean, lab.invert(lab.morph(rough, 14))), [10, 30, 80, 200]);
  const BG = lab.data(lab.blur(bgPlate, 6)).data;

  // 3. Swing assembly = differs from the background, inside a generous region (ropes, board, cup,
  //    small leaf). Corner blurred leaves and the top logo stay in the plate.
  const region = lab.pathMask(W, H, [
    ['M', 120, 0], ['L', 230, 0], ['L', 240, 470], ['L', 480, 440], ['L', 470, 455], ['L', 740, 455],
    ['L', 905, 470], ['L', 915, 0], ['L', 985, 0], ['L', 990, 560], ['L', 1045, 950], ['L', 1040, 1110],
    ['L', 900, 1185], ['L', 820, 1160], ['L', 140, 1035], ['L', 50, 1000], ['L', 52, 880], ['L', 110, 840], ['Z'],
  ], 2);
  // Foreground test that ignores the faint ghost logo (same hue as the peach, only ~10 % darker):
  // much darker, clearly brighter, or a different hue (green cup, leaves, tan rope, wood).
  const ramp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  const fg = lab.canvas(W, H); const F = lab.data(fg);
  for (let i = 0; i < C.length; i += 4) {
    const s1 = C[i] + C[i + 1] + C[i + 2] + 1, s2 = BG[i] + BG[i + 1] + BG[i + 2] + 1;
    const L = s1 / s2;
    const hue = Math.hypot(C[i] / s1 - BG[i] / s2, C[i + 1] / s1 - BG[i + 1] / s2, C[i + 2] / s1 - BG[i + 2] / s2);
    const a = Math.max(ramp(-L, -0.72, -0.64), ramp(L, 1.07, 1.13), ramp(hue, 0.03, 0.045));
    F.data[i] = F.data[i + 1] = F.data[i + 2] = 255; F.data[i + 3] = 255 * a;
  }
  lab.put(fg, F);
  // Close small holes (milky cup areas, wood highlights), then add a solid cup core.
  const cupCore = lab.pathMask(W, H, [
    ['M', 384, 492], ['L', 398, 470], ['L', 450, 460], ['L', 545, 456], ['L', 650, 460], ['L', 700, 470],
    ['L', 712, 492], ['L', 700, 520], ['L', 694, 535], ['L', 656, 960], ['L', 432, 960], ['L', 400, 535],
    ['L', 392, 520], ['Z'],
  ], 1);
  const closed = lab.morph(lab.morph(fg, 7), -7);
  const swingMask = lab.intersect(lab.union(closed, cupCore), region);
  // Plate: no swing, no ghost watermark — a smooth peach field (the composer redraws a ghost logo
  // and a contact shadow that moves with the swing).
  const holes = lab.fillHoles(lab.applyMask(clean, lab.invert(lab.morph(swingMask, 16))), [10, 30, 80, 200, 400]);
  const plateBehind = lab.blur(holes, 90);

  const PB = lab.data(plateBehind).data;
  // Peach pixels caught inside the matte (ghost watermark, bridges) are flattened to the plate
  // colour so nothing ghost-like moves with the swing; real shadows (< 85 % brightness) survive.
  const flat = lab.clone(clean); const FL = lab.data(flat); const CC = lab.data(cupCore).data;
  for (let i = 0; i < C.length; i += 4) {
    const s1 = C[i] + C[i + 1] + C[i + 2] + 1, s2 = BG[i] + BG[i + 1] + BG[i + 2] + 1;
    const L = s1 / s2;
    const hue = Math.hypot(C[i] / s1 - BG[i] / s2, C[i + 1] / s1 - BG[i + 1] / s2, C[i + 2] / s1 - BG[i + 2] / s2);
    const bgLike = (1 - CC[i + 3] / 255) * (1 - Math.max(ramp(hue, 0.02, 0.035), ramp(-L, -0.86, -0.8), ramp(L, 1.16, 1.22)));
    const k = L < 0.86 ? L / 0.86 : 1;
    for (let c = 0; c < 3; c++) FL.data[i + c] = C[i + c] * (1 - bgLike) + PB[i + c] * k * bgLike;
  }
  lab.put(flat, FL);
  const swingLayer = lab.applyMask(flat, swingMask);
  // 4. Logo: project each pixel onto the peach→teal line → alpha. Then upscale 3x with a
  //    contrast curve on alpha so edges stay crisp when enlarged.
  const lx = 450, ly = 6, lw = 200, lh = 172;
  const bgc = [240, 206, 176], teal = [31, 93, 84];
  const v = teal.map((t, k) => t - bgc[k]); const vv = v.reduce((s, x) => s + x * x, 0);
  const small = lab.canvas(lw, lh); const S = lab.data(small);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = ((y + ly) * W + (x + lx)) * 4, o = (y * lw + x) * 4;
    const p = [px[i] - bgc[0], px[i + 1] - bgc[1], px[i + 2] - bgc[2]];
    let a = (p[0] * v[0] + p[1] * v[1] + p[2] * v[2]) / vv;
    a = Math.max(0, Math.min(1, (a - 0.12) / 0.7));
    S.data[o] = 255; S.data[o + 1] = 255; S.data[o + 2] = 255; S.data[o + 3] = 255 * a;
  }
  lab.put(small, S);
  const up = lab.canvas(lw * 4, lh * 4); const ug = up.getContext('2d');
  ug.imageSmoothingQuality = 'high'; ug.filter = 'blur(1.2px)'; ug.drawImage(small, 0, 0, up.width, up.height);
  const U = lab.data(up);
  for (let i = 3; i < U.data.length; i += 4) {
    const a = U.data[i] / 255; const s = Math.max(0, Math.min(1, (a - 0.5) * 3.2 + 0.5));
    U.data[i] = 255 * s * s * (3 - 2 * s);
  }
  lab.put(up, U);
  const tint = (c, col) => { const o = lab.clone(c); const g = o.getContext('2d'); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, o.width, o.height); return o; };

  const check = lab.overlay(clean, swingMask);
  const onDark = (() => { const c = lab.canvas(W, H); const g = c.getContext('2d'); g.fillStyle = '#203040'; g.fillRect(0, 0, W, H); g.drawImage(swingLayer, 0, 0); return c; })();
  return {
    'swing-clean': lab.url(clean),
    'swing-plate': lab.url(plateBehind),
    'swing-layer': lab.url(swingLayer),
    'logo-white': lab.url(up),
    'logo-teal': lab.url(tint(up, '#1F5E55')),
    'check-swing': lab.url(lab.crop(onDark, 0, 0, W, H, 0.5)),
    'check-logo': lab.url((() => { const c = lab.canvas(up.width, up.height); const g = c.getContext('2d'); g.fillStyle = '#F4EBDD'; g.fillRect(0, 0, c.width, c.height); g.drawImage(tint(up, '#1F5E55'), 0, 0); return c; })()),
  };
}
