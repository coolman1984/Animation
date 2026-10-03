// Live footage inside a composer film — deterministic frames, people cut out by their matte, anchors that follow them.
// Reads a footage pack made by tools/live.py (frames/, matte/, tracks.json, transcript.json, reframe.json, space.json).
// The "sandwich" that puts animation around real people:   plate  →  behind-graphics  →  cutout (person)  →  front-graphics
//   const F = await footage(new URL('./plates/pack/', import.meta.url), { plate, cutout })   // two <canvas> you place in z order
//   await F.draw(srcSeconds, { crop, dest, freeze, outline })    // decode + draw the exact frame (film.render returns the promise)
//   F.toStage([nx, ny])     normalised source point → stage px through the current crop/dest/zoom
//   F.anchor(id, 'head', s) tracked point of a person at source time s (interpolated between frames)
// Everything a frame shows is a function of the requested time: frames are decoded and awaited before capture.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const fetchJSON = async (u) => { try { const r = await fetch(u); return r.ok ? r.json() : null; } catch { return null; } };

export async function footage(base, { plate, cutout, matte = true } = {}) {
  const href = (p) => new URL(p, base).href;
  const info = await fetchJSON(href('pack.json'));
  if (!info) throw new Error(`footage pack not found at ${base} (run tools/live.py)`);
  const [tracks, transcript, reframe, space, speech] = await Promise.all(['tracks.json', 'transcript.json', 'reframe.json', 'space.json', 'speech.json'].map((f) => fetchJSON(href(f))));
  const hasMatte = matte && !!(await fetchJSON(href('matte.json')));
  const cache = new Map();
  // fetch + createImageBitmap: decodes off-DOM reliably (a detached <img>.decode() can wait forever in headless capture)
  const load = (url) => {
    if (cache.has(url)) return cache.get(url);
    const p = fetch(url).then((r) => { if (!r.ok) throw new Error(`footage frame missing: ${url}`); return r.blob(); }).then((b) => createImageBitmap(b));
    cache.set(url, p); if (cache.size > 8) cache.delete(cache.keys().next().value);
    return p;
  };
  const frameOf = (s) => clamp(Math.round(s * info.fps) + 1, 1, info.frames);
  const pad = (n) => String(n).padStart(6, '0');
  const alpha = document.createElement('canvas'), actx = alpha.getContext('2d', { willReadFrequently: true });
  let view = { crop: { cx: 0.5, cy: 0.5, w: 1, h: 1 }, dest: { x: 0, y: 0, w: plate?.width || 1, h: plate?.height || 1 } };

  // crop: normalised source rect (centre + size); dest: stage rect; zoom > 1 punches in around `focus` (normalised source point).
  function geometry(crop, dest, zoom = 1, focus) {
    const c = { ...crop }; if (zoom !== 1) { const f = focus || [c.cx, c.cy]; c.w /= zoom; c.h /= zoom; c.cx = f[0] + (c.cx - f[0]) / zoom; c.cy = f[1] + (c.cy - f[1]) / zoom; }
    c.cx = clamp(c.cx, c.w / 2, 1 - c.w / 2); c.cy = clamp(c.cy, c.h / 2, 1 - c.h / 2);
    return { crop: c, dest };
  }
  const sx = (g) => [(g.crop.cx - g.crop.w / 2) * info.w, (g.crop.cy - g.crop.h / 2) * info.h, g.crop.w * info.w, g.crop.h * info.h];

  const person = document.createElement('canvas'), pctx = person.getContext('2d');
  const tint = document.createElement('canvas'), tctx = tint.getContext('2d');
  // outline: { px, color } draws a sticker stroke around the person on the cutout canvas itself (12 offset silhouettes).
  // Do NOT build this with chained CSS drop-shadow filters on a full-frame layer: in software capture that froze
  // Page.captureScreenshot for > 90 s (film live1, 2026-10-03).
  async function draw(s, { crop = view.crop, dest = view.dest, zoom = 1, focus, freeze, people = true, outline: stroke } = {}) {
    const n = frameOf(freeze ?? s), g = geometry(crop, dest, zoom, focus); view = g;
    const [fr, mt] = await Promise.all([load(href(`frames/f${pad(n)}.jpg`)), hasMatte && cutout ? load(href(`matte/f${pad(n)}.png`)) : null]);
    const src = sx(g);
    if (plate) { const p = plate.getContext('2d'); p.clearRect(0, 0, plate.width, plate.height); p.drawImage(fr, ...src, dest.x, dest.y, dest.w, dest.h); }
    if (cutout) {
      const c = cutout.getContext('2d'); c.clearRect(0, 0, cutout.width, cutout.height);
      if (mt && people) {
        // matte PNGs are grey (luminance = alpha): convert once into a real alpha mask at the matte's own size, then mask the frame
        alpha.width = mt.width; alpha.height = mt.height; actx.drawImage(mt, 0, 0);
        const d = actx.getImageData(0, 0, alpha.width, alpha.height), px = d.data;
        for (let i = 0; i < px.length; i += 4) { px[i + 3] = px[i]; px[i] = px[i + 1] = px[i + 2] = 255; }
        actx.putImageData(d, 0, 0);
        const k = alpha.width / info.w, msrc = [src[0] * k, src[1] * k, src[2] * k, src[3] * k];
        person.width = cutout.width; person.height = cutout.height;
        pctx.drawImage(fr, ...src, dest.x, dest.y, dest.w, dest.h);
        pctx.globalCompositeOperation = 'destination-in'; pctx.drawImage(alpha, ...msrc, dest.x, dest.y, dest.w, dest.h); pctx.globalCompositeOperation = 'source-over';
        if (stroke && stroke.px > 0.2) {
          tint.width = cutout.width; tint.height = cutout.height;
          // a crisp sticker edge comes from a hard silhouette (alpha ≥ 50 %), not from the soft matte
          const hd = actx.getImageData(0, 0, alpha.width, alpha.height), hp = hd.data;
          for (let i = 3; i < hp.length; i += 4) hp[i] = hp[i] >= 128 ? 255 : 0;
          actx.putImageData(hd, 0, 0);
          tctx.drawImage(alpha, ...msrc, dest.x, dest.y, dest.w, dest.h);
          tctx.globalCompositeOperation = 'source-in'; tctx.fillStyle = stroke.color || '#fff'; tctx.fillRect(0, 0, tint.width, tint.height); tctx.globalCompositeOperation = 'source-over';
          for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.drawImage(tint, Math.cos(a) * stroke.px, Math.sin(a) * stroke.px); }
        }
        c.drawImage(person, 0, 0);
      }
    }
    // Canvas pixels changed but the compositor may not see damage in software capture, and a screenshot can then wait for a
    // frame that never comes. A frame-parity opacity nudge (invisible: 0.9999) forces paint invalidation every frame.
    for (const cv of [plate, cutout]) if (cv) cv.style.opacity = n % 2 ? '0.9999' : '1';
    return n;
  }
  const toStage = ([nx, ny], g = view) => [g.dest.x + ((nx - (g.crop.cx - g.crop.w / 2)) / g.crop.w) * g.dest.w, g.dest.y + ((ny - (g.crop.cy - g.crop.h / 2)) / g.crop.h) * g.dest.h];

  // Tracked point of person `id` at source time s: linear interpolation between the two nearest frames that have it.
  function anchor(id, key, s) {
    const p = (tracks?.people || []).find((q) => q.id === id); if (!p) return null;
    const f = s * info.fps + 1, a = Math.floor(f), get = (n) => { const q = p.frames[String(n)]; return q && q[key] ? q[key] : null; };
    let A = get(a), B = get(a + 1);
    if (!A && !B) { for (let d = 1; d < info.fps; d++) { A = get(a - d) || get(a + d); if (A) break; } return A; }
    if (!A || !B) return A || B;
    const u = f - a; return Array.isArray(A[0]) ? A.map((v, i) => v.map((x, j) => x + (B[i][j] - x) * u)) : A.map((x, i) => x + (B[i] - x) * u);
  }
  const people = () => (tracks?.people || []).map((p) => ({ id: p.id, first: (p.first - 1) / info.fps, last: (p.last - 1) / info.fps }));
  // 9:16 crop that follows the subject (tools/live.py reframe), as a crop rect for draw().
  const follow = (s) => reframe ? { cx: reframe.cx[frameOf(s) - 1], cy: 0.5, w: reframe.cropW, h: 1 } : { cx: 0.5, cy: 0.5, w: 1, h: 1 };
  return { info, tracks, transcript, reframe, space, speech, draw, toStage, anchor, people, follow, frameOf, get view() { return view; } };
}
