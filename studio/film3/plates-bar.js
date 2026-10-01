// Clean bar plate from the real hero photo: the product region (x 360–1320) is rebuilt row by row from
// mirrored clean strips on both sides (shelves and counter are horizontal bands), then softened, so no
// ghost of the original cup/carton remains when the cut-outs move.
async ({ hero }) => {
  const img = await lab.load(hero);
  const W = img.width, H = img.height, A = 360, B = 1320;
  const src = lab.data(img).data;
  const out = lab.clone(img); const O = lab.data(out);
  for (let y = 0; y < H; y++) for (let x = A; x < B; x++) {
    const t = (x - A) / (B - A);
    const xl = A - 1 - ((x - A) % (A - 20)), xr = B + ((B - 1 - x) % (W - B - 1));
    const il = (y * W + xl) * 4, ir = (y * W + xr) * 4, o = (y * W + x) * 4;
    const k = t * t * (3 - 2 * t);
    for (let c = 0; c < 3; c++) O.data[o + c] = src[il + c] * (1 - k) + src[ir + c] * k;
  }
  lab.put(out, O);
  // Soften only the rebuilt band (feathered), keep the untouched sides sharp-as-shot.
  const soft = lab.blur(out, 14);
  const band = lab.pathMask(W, H, [['M', A + 30, -10], ['L', B - 30, -10], ['L', B - 30, H + 10], ['L', A + 30, H + 10], ['Z']], 40);
  const g = out.getContext('2d'); g.drawImage(lab.applyMask(soft, band), 0, 0);
  // Tall version for 9:16: the counter (rows 1304–1600) continues downward by mirroring, darkening
  // toward the bottom like a surface falling out of the light.
  const tall = lab.canvas(W, 2400); const tg = tall.getContext('2d');
  tg.drawImage(out, 0, 0);
  for (let k = 0; k < 3; k++) {
    const y0 = 1600 + k * 296;
    tg.save(); tg.translate(0, y0 + (k % 2 === 0 ? 296 : 0)); tg.scale(1, k % 2 === 0 ? -1 : 1);
    tg.drawImage(out, 0, 1304, W, 296, 0, 0, W, 296); tg.restore();
  }
  const grad = tg.createLinearGradient(0, 1560, 0, 2400); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.75)');
  tg.fillStyle = grad; tg.fillRect(0, 1560, W, 840);
  return { 'bar-clean': lab.url(out), 'bar-tall': lab.url(tall), 'check-bar': lab.url(lab.crop(tall, 0, 0, W, 2400, 0.3)) };
}
