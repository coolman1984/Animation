// Studio Engine — hand-painted story scenes (browser). Elements `painted` and `caption` for text-to-short films.
//   painted  a full-frame landscape painted in code: sky, sun/moon, mountains, hills, sea, field, path, trees, city, a figure,
//            rain/snow/birds. Looks: watercolour · oil · crayon · ink · storybook. Lines "boil" like hand animation: the drawing
//            is re-painted with fresh seeded jitter 12 times a second (on twos at 24 fps), while the camera drifts smoothly.
//   caption  the narrated line, every word lit in reading order when it is spoken (voice word times, else evenly spaced).
// Pure in t: each boil frame is painted once into a cached layer set, every video frame only composites the layers.
import { clamp, lerp, hash, px, div, sm, words as lineOf, isArabic, col } from './core.js';

const LOOKS = {
  watercolour: { paper: '#F3EBDD', grain: 0.22, passes: 5, alpha: 0.16, edge: 0.32, jitter: 0.9, stroke: 'wash' },
  oil: { paper: '#E9DCC2', grain: 0.14, passes: 2, alpha: 0.82, edge: 0, jitter: 0.55, stroke: 'dab' },
  crayon: { paper: '#F6F0E4', grain: 0.3, passes: 1, alpha: 0.85, edge: 0, jitter: 1.1, stroke: 'hatch' },
  ink: { paper: '#EEE8DA', grain: 0.2, passes: 3, alpha: 0.2, edge: 0.85, jitter: 0.7, stroke: 'wash', mono: true },
  storybook: { paper: '#F1E6D0', grain: 0.16, passes: 3, alpha: 0.42, edge: 0.45, jitter: 0.6, stroke: 'wash' },
};
const SKIES = {
  dawn: ['#F6C9A8', '#F4E3C3', '#C9D9E0'], day: ['#8FC0DE', '#C7E1EE', '#EEF2E6'], dusk: ['#3D3B6E', '#C8607A', '#F2A65A'],
  night: ['#0E1630', '#1E2C55', '#3B4A78'], storm: ['#4B5563', '#7A8594', '#A9B2BC'], mist: ['#D9DDD8', '#E7E8E1', '#F1EFE6'],
};
const INK = (hexA, k) => { const c = [1, 3, 5].map((i) => parseInt(hexA.slice(i, i + 2), 16)); const g = Math.round(0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]); return `rgb(${[0, 1, 2].map(() => Math.round(lerp(g, 28, k))).join(',')})`; };
const shade = (hex, f) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return `rgb(${c.map((v) => Math.round(clamp(f >= 0 ? v + (255 - v) * f : v * (1 + f), 0, 255))).join(',')})`; };
export const BOIL_FPS = 12;
export const boilIndex = (t, fps = BOIL_FPS) => Math.floor(t * fps + 1e-6);

// a ridge: y(x) from summed sines with seeded phases, the same for every boil frame (only the edge jitter boils)
export function ridge(seed, x, W, { base, amp, freq = 3 }) {
  let y = 0; for (let k = 1; k <= 4; k++) y += Math.sin((x / W) * Math.PI * freq * k * (0.7 + 0.6 * hash(seed, k)) + hash(seed, k + 9) * 6.28) / (k * 1.3);
  return base - amp * (0.5 + 0.45 * y);
}

// one painted region (polygon) in the current look
function paint(g, pts, color, L, seed, boil) {
  const j = L.jitter, n = pts.length;
  const wob = (p, i, k) => [p[0] + (hash(seed + k, i, boil) - 0.5) * 6 * j, p[1] + (hash(seed + k + 50, i, boil) - 0.5) * 6 * j];
  const path = (k) => { g.beginPath(); pts.forEach((p, i) => { const [x, y] = wob(p, i, k); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  const fill = L.mono ? INK(color, 0.35) : color;
  if (L.stroke === 'wash') {
    for (let k = 0; k < L.passes; k++) { g.globalAlpha = L.alpha; g.fillStyle = fill; path(k); g.fill(); }
    // pigment pooling: soft darker and lighter blooms inside the shape, fixed per element so only the edges boil
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const area = (x1 - x0) * (y1 - y0), blooms = Math.min(14, 2 + Math.round(area / 70000));
    g.save(); path(0); g.clip();
    for (let i = 0; i < blooms; i++) { const bx = lerp(x0, x1, hash(seed, i, 11)), by = lerp(y0, y1, hash(seed, i, 12)), r = Math.sqrt(area) * (0.12 + 0.22 * hash(seed, i, 13)), dark = hash(seed, i, 14) < 0.6;
      const rg = g.createRadialGradient(bx, by, 0, bx, by, r); rg.addColorStop(0, L.mono ? (dark ? 'rgba(20,20,20,0.16)' : 'rgba(255,255,255,0.14)') : dark ? shade(color, -0.18).replace('rgb', 'rgba').replace(')', ',0.11)') : 'rgba(255,255,255,0.16)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 1; g.fillStyle = rg; g.fillRect(bx - r, by - r, 2 * r, 2 * r); }
    g.restore();
    if (L.edge) { g.globalAlpha = L.edge * (L.mono ? 1 : 0.5); g.strokeStyle = L.mono ? '#1C1A17' : shade(color, -0.35); g.lineWidth = L.mono ? 2.4 : 1.6; path(9); g.stroke(); }
  } else if (L.stroke === 'dab') {
    g.globalAlpha = L.alpha; g.fillStyle = fill; path(0); g.fill();
    // short thick strokes inside the region, lighter and darker than the base: the hand of an oil painter
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    g.save(); path(0); g.clip(); g.lineCap = 'round';
    const count = Math.min(420, Math.round(((x1 - x0) * (y1 - y0)) / 2600));
    for (let i = 0; i < count; i++) { const x = lerp(x0, x1, hash(seed, i, 1)), y = lerp(y0, y1, hash(seed, i, 2)), a = (hash(seed, i, 3) - 0.5) * 0.9 + (hash(seed, i, boil) - 0.5) * 0.12, len = 14 + 26 * hash(seed, i, 4);
      g.strokeStyle = shade(color, (hash(seed, i, 5) - 0.5) * 0.36); g.globalAlpha = 0.55; g.lineWidth = 6 + 7 * hash(seed, i, 6);
      g.beginPath(); g.moveTo(x - Math.cos(a) * len / 2, y - Math.sin(a) * len / 2); g.lineTo(x + Math.cos(a) * len / 2, y + Math.sin(a) * len / 2); g.stroke(); }
    g.restore();
  } else { // hatch: crayon lines across the region, re-scribbled every boil frame
    g.globalAlpha = 0.28; g.fillStyle = fill; path(0); g.fill();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    g.save(); path(0); g.clip(); g.strokeStyle = fill; g.lineWidth = 3.2; g.globalAlpha = 0.6; g.beginPath();
    for (let x = x0 - (y1 - y0); x < x1; x += 7) { const d = (hash(seed, x | 0, boil) - 0.5) * 5; g.moveTo(x + d, y1); g.lineTo(x + (y1 - y0) * 0.9 + d, y0); }
    g.stroke(); g.restore();
  }
  g.globalAlpha = 1;
}

const ridgePoly = (seed, W, H, opt, bottom = H) => { const pts = []; for (let x = -40; x <= W + 40; x += 24) pts.push([x, ridge(seed, x, W, opt)]); pts.push([W + 40, bottom], [-40, bottom]); return pts; };

function figure(g, x, y, s, color, t, mode, L, seed, boil) {
  const st = mode === 'walk' ? Math.sin(boil * 1.6) * 0.09 * s : 0, c = L.mono ? '#1C1A17' : color, F = { ...L, passes: Math.max(3, L.passes), alpha: Math.max(0.55, L.alpha), stroke: L.stroke === 'hatch' ? 'hatch' : 'wash', edge: 0.4 };
  // legs (behind the coat), then the coat with shoulders and a flared hem, then the head with a slight forward lean
  g.strokeStyle = c; g.lineCap = 'round'; g.lineWidth = 0.06 * s; g.globalAlpha = 0.95;
  g.beginPath(); g.moveTo(x - 0.05 * s, y - 0.3 * s); g.lineTo(x - 0.05 * s - st, y); g.moveTo(x + 0.05 * s, y - 0.3 * s); g.lineTo(x + 0.05 * s + st, y); g.stroke();
  paint(g, [[x - 0.06 * s, y - 0.78 * s], [x + 0.06 * s, y - 0.78 * s], [x + 0.15 * s, y - 0.7 * s], [x + 0.17 * s, y - 0.5 * s], [x + 0.21 * s, y - 0.28 * s], [x - 0.21 * s, y - 0.28 * s], [x - 0.17 * s, y - 0.5 * s], [x - 0.15 * s, y - 0.7 * s]], c, F, seed, boil);
  g.fillStyle = c; g.globalAlpha = 0.95; g.beginPath(); g.ellipse(x + 0.01 * s, y - 0.87 * s, 0.085 * s, 0.1 * s, 0, 0, 6.283); g.fill(); g.globalAlpha = 1;
}
function tree(g, x, y, s, color, L, seed, boil) {
  g.strokeStyle = L.mono ? '#1C1A17' : '#5B4636'; g.lineWidth = 0.07 * s; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(seed, 1) - 0.5) * 0.1 * s, y - 0.55 * s); g.stroke(); g.globalAlpha = 1;
  const pts = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283, r = 0.32 * s * (0.8 + 0.35 * hash(seed, i)); pts.push([x + Math.cos(a) * r, y - 0.72 * s + Math.sin(a) * r * 0.9]); }
  paint(g, pts, color, L, seed, boil);
}

// keywords (Arabic and English) → a scene composition; the story command uses this, a spec may also write `scene` by hand
const WORDS = {
  rain: /rain|مطر|المطر|أمطار|غيم/i, snow: /snow|ثلج|برد/i, sea: /sea|ocean|river|wave|بحر|البحر|نهر|موج|شط/i, mountains: /mountain|peak|cliff|جبل|الجبل|جبال|قمة/i,
  city: /city|street|town|building|مدينة|المدينة|شارع|بيوت|حارة/i, trees: /tree|forest|garden|شجر|شجرة|غابة|جنينة|بستان/i, birds: /bird|wing|fly|طير|طيور|عصفور|جناح/i,
  path: /road|path|walk|journey|way|طريق|الطريق|سكة|مشي|رحلة|درب/i, field: /field|grass|meadow|wheat|حقل|زرع|عشب|قمح|أرض/i, night: /night|dark|star|moon|ليل|الليل|ظلام|نجم|قمر/i,
  dusk: /sunset|evening|dusk|غروب|المغرب|مساء/i, dawn: /dawn|morning|sunrise|فجر|الفجر|صبح|الصبح|شروق/i, storm: /storm|thunder|wind|عاصفة|رعد|ريح|رياح/i,
  alone: /alone|lonely|man|woman|child|he |she |وحيد|لوحده|راجل|ست|طفل|إنسان|قلب/i, mist: /mist|fog|dream|ضباب|حلم/i,
};
export function compose(text, prev = {}) {
  const has = (k) => WORDS[k].test(` ${text} `);
  const sky = has('night') ? 'night' : has('storm') || (has('rain') && !has('dusk') && !has('dawn')) ? 'storm' : has('dusk') ? 'dusk' : has('dawn') ? 'dawn' : has('mist') ? 'mist' : prev.sky || 'day';
  const s = { sky, sun: sky === 'night' ? 'moon' : sky === 'storm' || sky === 'mist' ? null : 'sun', mountains: has('mountains'), sea: has('sea'), city: has('city'),
    trees: has('trees') ? 3 : 0, field: has('field'), path: has('path'), rain: has('rain') || sky === 'storm', snow: has('snow'), birds: has('birds'),
    figure: has('path') ? 'walk' : has('alone') ? 'stand' : null };
  if (!s.mountains && !s.sea && !s.city) s.hills = true;
  if (!s.field && !s.sea) s.field = !s.city;
  return s;
}

export function painted(ctx, e) {
  const { W, H } = ctx, L = { ...LOOKS[e.look || 'watercolour'] || LOOKS.watercolour }, S = e.scene || compose(e.text || ''), seed = (e.seed ?? 7) * 101;
  const sky = SKIES[S.sky] || SKIES.day, PW = Math.round(W * 1.12), PH = Math.round(H * 1.12);
  const host = div(ctx.root, { width: px(W), height: px(H), zIndex: String(e.z ?? 1), overflow: 'hidden' });
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; Object.assign(cv.style, { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H) }); host.appendChild(cv);
  const out = cv.getContext('2d');
  // paper grain once per element: seeded speckle + fibres
  const grain = document.createElement('canvas'); grain.width = 512; grain.height = 512; const gg = grain.getContext('2d'), img = gg.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) { const v = 200 + 55 * hash(seed, i % 4093, (i / 4093) | 0); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  gg.putImageData(img, 0, 0);
  const layers = new Map();          // boil index → [canvas per depth]
  const mk = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; return c; };
  function build(boil) {
    const far = mk(), mid = mk(), near = mk(), [gf, gm, gn] = [far, mid, near].map((c) => c.getContext('2d'));
    const sk = gf.createLinearGradient(0, 0, 0, PH * 0.75); sk.addColorStop(0, L.mono ? INK(sky[0], 0.2) : sky[0]); sk.addColorStop(0.55, L.mono ? INK(sky[1], 0.1) : sky[1]); sk.addColorStop(1, L.mono ? INK(sky[2], 0) : sky[2]);
    gf.fillStyle = L.paper; gf.fillRect(0, 0, PW, PH); gf.globalAlpha = L.stroke === 'dab' ? 1 : 0.85; gf.fillStyle = sk; gf.fillRect(0, 0, PW, PH); gf.globalAlpha = 1;
    // uneven sky wash: large soft clouds of lighter and darker pigment
    for (let i = 0; i < 9; i++) { const cx = PW * hash(seed, i, 21), cy = PH * 0.55 * hash(seed, i, 22), r = PW * (0.18 + 0.25 * hash(seed, i, 23)), lightC = S.sky === 'night' ? 'rgba(90,110,170,0.18)' : S.sky === 'storm' ? 'rgba(40,45,55,0.22)' : 'rgba(255,255,255,0.28)';
      const rg = gf.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, i % 3 ? lightC : 'rgba(0,0,0,0.07)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); gf.fillStyle = rg; gf.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
    if (S.sky === 'night') { gf.fillStyle = '#FFF8DC'; for (let i = 0; i < 90; i++) { gf.globalAlpha = 0.4 + 0.6 * hash(seed, i, 24); gf.beginPath(); gf.arc(PW * hash(seed, i, 25), PH * 0.6 * hash(seed, i, 26), 1 + 2.4 * hash(seed, i, 27), 0, 6.283); gf.fill(); } gf.globalAlpha = 1; }
    if (S.sun) { const x = PW * (e.sunX ?? 0.68), y = PH * (S.sky === 'dusk' ? 0.42 : 0.24), r = Math.min(PW, PH) * (S.sun === 'moon' ? 0.06 : 0.1);
      const c = S.sun === 'moon' ? '#F4EFD8' : S.sky === 'dusk' ? '#E8553E' : '#F6D27A', pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
      paint(gf, pts, c, { ...L, alpha: Math.max(L.alpha, 0.5) }, seed + 3, boil); }
    if (S.mountains) { paint(gf, ridgePoly(seed + 10, PW, PH, { base: PH * 0.62, amp: PH * 0.3, freq: 2.2 }), S.sky === 'night' ? '#2B3557' : '#8C9AA8', L, seed + 10, boil);
      paint(gf, ridgePoly(seed + 11, PW, PH, { base: PH * 0.68, amp: PH * 0.2, freq: 3.1 }), S.sky === 'night' ? '#1D2542' : '#6F7F8C', L, seed + 11, boil); }
    if (S.hills) paint(gm, ridgePoly(seed + 20, PW, PH, { base: PH * 0.7, amp: PH * 0.1, freq: 1.6 }), S.sky === 'night' ? '#26364A' : '#7FA27A', L, seed + 20, boil);
    if (S.city) { const base = PH * 0.72; let x = -20; let i = 0; while (x < PW) { const w = 70 + 90 * hash(seed, i, 31), h = PH * (0.12 + 0.22 * hash(seed, i, 32));
        paint(gm, [[x, base], [x, base - h], [x + w, base - h], [x + w, base]], S.sky === 'night' ? '#202A44' : '#9A8F86', L, seed + 40 + i, boil);
        if (S.sky === 'night' || S.sky === 'dusk') { gm.fillStyle = '#F6D27A'; for (let k = 0; k < 6; k++) if (hash(seed, i, k) > 0.55) { gm.globalAlpha = 0.85; gm.fillRect(x + 12 + (k % 2) * (w - 36), base - h + 20 + Math.floor(k / 2) * 34, 12, 16); } gm.globalAlpha = 1; }
        x += w + 8; i++; } }
    if (S.sea) { const top = PH * 0.66; paint(gm, [[-40, top], [PW + 40, top], [PW + 40, PH], [-40, PH]], S.sky === 'night' ? '#1B2B4D' : S.sky === 'dusk' ? '#5B4E7A' : '#4F86A8', L, seed + 50, boil);
      gm.strokeStyle = 'rgba(255,255,255,0.55)'; gm.lineWidth = 2.2; for (let k = 0; k < 18; k++) { const y = top + 30 + k * (PH - top) / 18, x = PW * hash(seed, k, boil % 3 + 60); gm.beginPath(); gm.moveTo(x, y); gm.quadraticCurveTo(x + 40, y - 8, x + 90, y); gm.stroke(); } }
    const ground = S.sea ? null : S.sky === 'night' ? '#1F3328' : S.sky === 'snow' || S.snow ? '#E9EEF2' : '#8DB36B';
    if (S.field || (!S.sea && !S.city)) paint(gn, ridgePoly(seed + 60, PW, PH, { base: PH * 0.82, amp: PH * 0.05, freq: 1.2 }), ground || '#8DB36B', L, seed + 60, boil);
    if (S.city && !S.sea) paint(gn, [[-40, PH * 0.72], [PW + 40, PH * 0.72], [PW + 40, PH], [-40, PH]], S.sky === 'night' ? '#151B2C' : '#6E6A66', L, seed + 61, boil);
    if (S.path) paint(gn, [[PW * 0.47, PH * 0.78], [PW * 0.53, PH * 0.78], [PW * 0.78, PH], [PW * 0.22, PH]], S.sky === 'night' ? '#4A4A52' : '#D9C49A', L, seed + 62, boil);
    for (let i = 0; i < (S.trees || 0); i++) tree(gn, PW * (0.14 + 0.72 * hash(seed, i, 70)), PH * (0.82 + 0.04 * hash(seed, i, 71)), PH * (0.22 + 0.12 * hash(seed, i, 72)), S.sky === 'night' ? '#203828' : '#4E7A45', L, seed + 70 + i, boil);
    if (S.figure) figure(gn, PW * (S.figure === 'walk' ? 0.5 : 0.36), PH * (S.path ? 0.88 : 0.86), PH * (ctx.portrait ? 0.13 : 0.2), S.sky === 'night' || S.sky === 'dusk' ? '#151515' : '#3A2E2A', 0, S.figure, L, seed + 90, boil);
    return [far, mid, near];
  }
  const a = ctx.a, b = ctx.b, drift = e.drift ?? 1;
  return (t) => {
    const k = boilIndex(t, e.boil ?? BOIL_FPS); let set = layers.get(k);
    if (!set) { set = build(k); layers.set(k, set); if (layers.size > 3) layers.delete(layers.keys().next().value); }
    const u = clamp((t - a) / Math.max(0.1, b - a)), z = 1 + 0.06 * drift * u;
    out.setTransform(1, 0, 0, 1, 0, 0); out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; out.fillStyle = L.paper; out.fillRect(0, 0, W, H);
    set.forEach((c, i) => { const par = [0.25, 0.6, 1][i], ox = (PW - W) / 2 + (u - 0.5) * (PW - W) * 0.8 * par * drift, s = z * (1 + 0.02 * i * u * drift);
      out.setTransform(s, 0, 0, s, W / 2 - (W / 2) * s, H / 2 - (H / 2) * s); out.drawImage(c, -ox, -(PH - H) / 2); });
    out.setTransform(1, 0, 0, 1, 0, 0);
    // weather on top, continuous (not boiled) so it reads as motion, not jitter
    if (S.rain) { out.strokeStyle = L.mono ? 'rgba(30,30,30,0.35)' : 'rgba(70,90,120,0.42)'; out.lineWidth = 2; out.beginPath();
      for (let i = 0; i < 160; i++) { const x = (hash(seed, i, 1) * W + t * 120) % W, y = (hash(seed, i, 2) * H + t * 900 * (0.8 + 0.4 * hash(seed, i, 3))) % H; out.moveTo(x, y); out.lineTo(x - 6, y + 28); } out.stroke(); }
    if (S.snow) { out.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 120; i++) { const x = (hash(seed, i, 4) * W + Math.sin(t * 0.8 + i) * 30 + W) % W, y = (hash(seed, i, 5) * H + t * 70 * (0.6 + 0.6 * hash(seed, i, 6))) % H; out.beginPath(); out.arc(x, y, 2 + 3 * hash(seed, i, 7), 0, 6.283); out.fill(); } }
    if (S.birds) { out.strokeStyle = L.mono ? '#1C1A17' : '#2A2A2A'; out.lineWidth = 3; for (let i = 0; i < 5; i++) { const x = ((hash(seed, i, 8) * 0.6 + 0.2) * W + t * 60) % (W * 1.2) - W * 0.1, y = H * (0.2 + 0.12 * hash(seed, i, 9)), f = Math.sin(boilIndex(t) * 2 + i) * 10; out.beginPath(); out.moveTo(x - 22, y + f); out.quadraticCurveTo(x - 10, y - 8, x, y); out.quadraticCurveTo(x + 10, y - 8, x + 22, y + f); out.stroke(); } }
    // paper grain over everything, shifted per boil frame
    out.globalCompositeOperation = 'multiply'; out.globalAlpha = L.grain; const gx = (k * 37) % 512, gy = (k * 53) % 512;
    for (let y = -gy; y < H; y += 512) for (let x = -gx; x < W; x += 512) out.drawImage(grain, x, y);
    out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1;
  };
}

// the spoken line, lit word by word (Arabic stays whole words, right to left)
export function caption(ctx, e) {
  const k = Math.min(ctx.W, ctx.H) / 1080, color = col(ctx.brand, e.color, '#FFFFFF');
  const L = lineOf(ctx.root, e.text, ctx, { size: (e.size ?? 64) * k, weight: e.weight ?? 600, color, y: e.y ?? (ctx.portrait ? 0.3 : ctx.W === ctx.H ? 0.18 : 0.15), font: e.font && (ctx.brand.fonts[e.font] || e.font), z: 20, shadow: e.shadow ?? '0 2px 18px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.6)', lh: 1.35 });
  const a = ctx.T(e.at ?? 0), o = e.out != null ? ctx.T(e.out) : ctx.b - 0.15, n = L.words.length;
  // word times (seconds from the scene start, from the voice) or an even spread over the line
  const times = Array.isArray(e.wordTimes) && e.wordTimes.length === n ? e.wordTimes.map((s) => ctx.a + s) : L.words.map((_, i) => lerp(a, a + (o - a) * 0.85, i / Math.max(1, n)));
  return (t) => {
    const vis = t >= a - 0.1 && t <= o + 0.3; L.line.style.display = vis ? 'flex' : 'none'; if (!vis) return;
    const fade = sm(a - 0.1, a + 0.25, t) * (1 - sm(o, o + 0.3, t));
    L.words.forEach((w, i) => { const lit = sm(times[i] - 0.04, times[i] + 0.18, t); w.style.opacity = (fade * (0.62 + 0.38 * lit)).toFixed(3); w.style.transform = `translateY(${((1 - lit) * 4 * k).toFixed(1)}px)`; });
  };
}
export const isRTL = isArabic;
