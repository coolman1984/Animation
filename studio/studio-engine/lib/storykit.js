// Studio Engine — the story drawing kit (browser, Canvas2D). Flat, readable shapes; the brush pass (brush.js) adds the paint.
// A drawing is a function (k) => { … } called once per drawing (12 a second). k carries:
//   k.g (2D context, camera applied) · k.W k.H · k.u = H/1920 · k.t seconds into the shot · k.p progress 0..1 · k.r() seeded random
//   k.X(x) k.Y(y) fractions → px · and the helpers below (positions are fractions of the frame; sizes scale with k.u).
// Our own kit: sky and weather, land and water, plants, built things, and people with a jointed rig and named poses.
const TAU = Math.PI * 2;
export function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
export function hashStr(s) { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; }
const smooth1 = (seed) => { const r = rng(seed), v = Array.from({ length: 256 }, r); return (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return v[i & 255] * (1 - u) + v[(i + 1) & 255] * u; }; };
export const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; };
function rgb(c) { if (c.startsWith('rgb')) return c.match(/[\d.]+/g).slice(0, 3).map(Number); const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export const alpha = (c, a) => `rgba(${rgb(c).join(',')},${a})`;

// Poses: joint angles in degrees (0 = straight down) for [upper arm, forearm] × 2 and [thigh, shin] × 2; lean of the torso.
const POSES = {
  stand: { arms: [[8, 4], [-8, -4]], legs: [[4, 0], [-4, 0]], lean: 0 },
  walk: null,                                                              // computed from the step phase
  cheer: { arms: [[160, 170], [-160, -170]], legs: [[6, 0], [-6, 0]], lean: 0 },
  open: { arms: [[80, 90], [-80, -90]], legs: [[5, 0], [-5, 0]], lean: 0 },
  wave: { arms: [[10, 4], [-150, -175]], legs: [[4, 0], [-4, 0]], lean: 0 },
  point: { arms: [[8, 4], [-95, -95]], legs: [[4, 0], [-4, 0]], lean: 0 },
  reach: { arms: [[150, 160], [-150, -160]], legs: [[0, 0], [0, 0]], lean: -4 },
  pray: { arms: [[10, -150], [-10, 150]], legs: [[2, 0], [-2, 0]], lean: 4 },          // forearms meet in front of the chest
  hug: { arms: [[70, 140], [-70, -140]], legs: [[4, 0], [-4, 0]], lean: 2 },
  hold: { arms: [[25, 100], [-25, -100]], legs: [[4, 0], [-4, 0]], lean: 0 },
  sit: { arms: [[15, 40], [-15, -40]], legs: [[85, -85], [80, -80]], lean: 0, seat: 0.45 },
  kneel: { arms: [[25, 120], [-25, -120]], legs: [[10, -95], [-8, -95]], lean: 6, seat: 0.28 },
};

export function makeKit(g, W, H, { t = 0, p = 0, seed = 1, palette = {} } = {}) {
  const u = H / 1920, X = (x) => x * W, Y = (y) => y * H, r = rng(seed);
  const k = { g, W, H, u, t, p, r, X, Y, mix, alpha, pal: palette, rng };
  const poly = (pts, color, close = true) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); g.fillStyle = color; g.fill(); };
  const circle = (x, y, rad, color) => { g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fillStyle = color; g.fill(); };

  // ---------- sky and light ----------
  k.sky = ({ stops = ['#8fb7e8', '#dfe9f2'], y0 = 0, y1 = 1 } = {}) => { const gr = g.createLinearGradient(0, Y(y0), 0, Y(y1)); stops.forEach((s, i) => gr.addColorStop(i / Math.max(1, stops.length - 1), s)); g.fillStyle = gr; g.fillRect(-W, -H, W * 3, H * 3); };
  k.sun = ({ x = 0.7, y = 0.25, r: rad = 0.07, color = '#f6d27a', glow = true } = {}) => {
    if (glow) { const gr = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), rad * 5 * H); gr.addColorStop(0, alpha(color, 0.5)); gr.addColorStop(1, alpha(color, 0)); g.fillStyle = gr; g.fillRect(X(x) - rad * 5 * H, Y(y) - rad * 5 * H, rad * 10 * H, rad * 10 * H); }
    circle(X(x), Y(y), rad * H, color);
  };
  k.glow = ({ x, y, r: rad = 0.1, color = '#ffe6a8', a = 0.6 } = {}) => { const gr = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), rad * H); gr.addColorStop(0, alpha(color, a)); gr.addColorStop(1, alpha(color, 0)); g.fillStyle = gr; g.fillRect(X(x) - rad * H, Y(y) - rad * H, rad * 2 * H, rad * 2 * H); };
  k.clouds = ({ y = 0.08, band = 0.25, n = 10, color = '#ffffff', shade = '#d4dde8', drift = 8, size = 1 } = {}) => {
    const rr = rng(seed + 11);
    for (let i = 0; i < n; i++) { const d = 0.5 + rr() * 0.8, cx = X(-0.1 + 1.2 * rr()) + t * drift * u * d, cy = Y(y + band * rr()), w = (160 + 260 * rr()) * size * u * d;
      for (let j = 0; j < 6; j++) { const px = cx + (rr() - 0.5) * w, py = cy + (rr() - 0.65) * w * 0.2, pr = w * (0.13 + 0.12 * rr()); circle(px, py + pr * 0.18, pr, shade); circle(px, py, pr, color); } }
  };
  k.stars = ({ n = 120, y1 = 0.6, color = '#fff8dc' } = {}) => { const rr = rng(seed + 12); for (let i = 0; i < n; i++) { g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * (1 + rr() * 2) + i)); circle(X(rr()), Y(rr() * y1), (1 + 2.6 * rr()) * u, color); } g.globalAlpha = 1; };
  k.rays = ({ x = 0.7, y = 0.1, n = 6, spread = 0.9, a = 0.18, color = '#fff3c4', angle = Math.PI / 2 } = {}) => {   // angle: 0 right, π/2 down
    for (let i = 0; i < n; i++) { const ang = angle + (i / Math.max(1, n - 1) - 0.5) * spread + Math.sin(t * 0.3 + i) * 0.02, len = H * 1.4, w = 0.03 + 0.03 * Math.abs(Math.sin(i * 7));
      g.globalAlpha = a; poly([[X(x), Y(y)], [X(x) + Math.cos(ang - w) * len, Y(y) + Math.sin(ang - w) * len], [X(x) + Math.cos(ang + w) * len, Y(y) + Math.sin(ang + w) * len]], color); } g.globalAlpha = 1;
  };
  k.haze = ({ y = 0.55, h = 0.15, color = '#ffffff', a = 0.35 } = {}) => { const gr = g.createLinearGradient(0, Y(y - h), 0, Y(y + h)); gr.addColorStop(0, alpha(color, 0)); gr.addColorStop(0.5, alpha(color, a)); gr.addColorStop(1, alpha(color, 0)); g.fillStyle = gr; g.fillRect(-W, Y(y - h), W * 3, Y(2 * h)); };

  // ---------- land and water ----------
  k.ridge = ({ y = 0.6, amp = 0.08, freq = 3, color = '#6f8a5c', shape = 'soft', seed: s = 1 } = {}) => {
    const n = smooth1(seed + 31 * s), pts = [];
    for (let x = -0.2; x <= 1.2; x += 0.01) {
      let v = n(x * freq) * 0.7 + n(x * freq * 2.3 + 9) * 0.3;
      if (shape === 'peaks') v = Math.max(...[0, 1, 2].map((j) => Math.pow(Math.max(0, 1 - Math.abs(x - (0.15 + 0.35 * j + 0.15 * n(j * 7 + s))) * freq * (1.2 + n(j * 3)) ), 1.3) * (0.55 + 0.45 * n(j * 11 + s)))) * 0.85 + 0.15 * n(x * freq * 6);
      if (shape === 'pines') v = 0.35 * n(x * freq) + 0.65 * Math.abs(Math.sin(x * freq * 34 + n(x * 9) * 3));
      if (shape === 'rocky') v = Math.round((n(x * freq) * 0.8 + n(x * freq * 4) * 0.2) * 6) / 6;
      pts.push([X(x), Y(y - amp * v)]);
    }
    pts.push([X(1.2), H * 2], [X(-0.2), H * 2]); poly(pts, color);
  };
  k.ground = ({ y = 0.75, color = '#7fa35a', far = null, stripes = 0, flowers = 0 } = {}) => {
    const gr = g.createLinearGradient(0, Y(y), 0, H); gr.addColorStop(0, far || mix(color, '#ffffff', 0.2)); gr.addColorStop(1, color); g.fillStyle = gr; g.fillRect(-W, Y(y), W * 3, H * 2);
    for (let i = 0; i < stripes; i++) { const yy = y + (1 - y) * Math.pow((i + 0.5) / stripes, 1.6); g.fillStyle = alpha(mix(color, '#000000', 0.12), 0.35); g.fillRect(-W, Y(yy), W * 3, Y((1 - y) / stripes) * 0.35); }
    const rr = rng(seed + 13); for (let i = 0; i < flowers; i++) { const fy = y + (1 - y) * rr(), fs = (3 + 9 * (fy - y) / (1 - y)) * u; circle(X(rr()), Y(fy), fs, ['#f2e6a0', '#f4b3c2', '#ffffff', '#e8a25b'][i % 4]); }
  };
  k.path = ({ x = 0.5, y = 0.62, near = 0.5, far = 0.02, color = '#d9c49a', bend = 0.1 } = {}) => {
    g.beginPath(); g.moveTo(X(x - far / 2), Y(y)); g.quadraticCurveTo(X(x + bend), Y((y + 1) / 2), X(x - near / 2), H * 1.02); g.lineTo(X(x + near / 2), H * 1.02); g.quadraticCurveTo(X(x + bend + 0.05), Y((y + 1) / 2), X(x + far / 2), Y(y)); g.closePath(); g.fillStyle = color; g.fill();
  };
  k.water = ({ y0 = 0.62, y1 = 1, color = '#4f86a8', deep = null, glint = '#ffffff', glints = 40 } = {}) => {
    const gr = g.createLinearGradient(0, Y(y0), 0, Y(y1)); gr.addColorStop(0, mix(color, '#ffffff', 0.25)); gr.addColorStop(1, deep || mix(color, '#000000', 0.3)); g.fillStyle = gr; g.fillRect(-W, Y(y0), W * 3, Y(y1 - y0) + H);
    const rr = rng(seed + 14); g.strokeStyle = alpha(glint, 0.7); g.lineCap = 'round';
    for (let i = 0; i < glints; i++) { const gy = y0 + (y1 - y0) * Math.pow(rr(), 1.4), len = (20 + 60 * (gy - y0) / (y1 - y0)) * u, gx = X(rr()) + Math.sin(t * 1.3 + i) * 12 * u; g.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 2 + i * 1.7)); g.lineWidth = 3 * u; g.beginPath(); g.moveTo(gx - len / 2, Y(gy)); g.lineTo(gx + len / 2, Y(gy)); g.stroke(); }
    g.globalAlpha = 1;
  };
  k.shape = ({ pts, color = '#555555', smooth = false } = {}) => { if (!smooth) return poly(pts.map(([x, y]) => [X(x), Y(y)]), color); g.beginPath(); const P = pts.map(([x, y]) => [X(x), Y(y)]); g.moveTo((P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2); for (let i = 1; i <= P.length; i++) { const a = P[i % P.length], b = P[(i + 1) % P.length]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } g.fillStyle = color; g.fill(); };

  // ---------- plants ----------
  k.tree = ({ x = 0.5, y = 0.8, h = 0.25, kind = 'round', crown = '#4e7a45', trunk = '#5b4636' } = {}) => {
    const s = h * H, bx = X(x), by = Y(y), rr = rng(hashStr(`${x},${y},${kind}`) ^ seed), sway = Math.sin(t * 0.8 + x * 9) * 0.01 * s;
    g.strokeStyle = trunk; g.lineCap = 'round'; g.lineWidth = s * (kind === 'palm' ? 0.04 : 0.06); g.beginPath(); g.moveTo(bx, by);
    if (kind === 'palm') g.quadraticCurveTo(bx + s * 0.15, by - s * 0.5, bx + s * 0.1 + sway, by - s); else g.lineTo(bx + sway, by - s * (kind === 'pine' ? 0.2 : 0.5)); g.stroke();
    if (kind === 'pine') { for (let i = 0; i < 4; i++) { const yy = by - s * (0.15 + i * 0.2), w = s * (0.32 - i * 0.065); poly([[bx - w + sway, yy], [bx + w + sway, yy], [bx + sway, yy - s * 0.32]], mix(crown, '#000000', i * 0.05)); } return; }
    if (kind === 'bare') { const branch = (x0, y0, a, len, d) => { if (d > 4) return; const x1 = x0 + Math.sin(a) * len, y1 = y0 - Math.cos(a) * len; g.lineWidth = Math.max(1, s * 0.05 / (d + 1)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 + sway, y1); g.stroke(); branch(x1, y1, a - 0.4 - rr() * 0.3, len * 0.72, d + 1); branch(x1, y1, a + 0.35 + rr() * 0.3, len * 0.7, d + 1); }; branch(bx, by - s * 0.45, 0, s * 0.22, 0); return; }
    if (kind === 'palm') { for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.95 + i * 0.32, tx = bx + s * 0.1 + sway, ty = by - s; g.strokeStyle = crown; g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * s * 0.3, ty + Math.sin(a) * s * 0.2 - s * 0.08, tx + Math.cos(a) * s * 0.42, ty + Math.sin(a) * s * 0.3 + s * 0.12); g.stroke(); } return; }
    const tall = kind === 'column' ? 1.8 : 1, col = kind === 'autumn' ? '#c8742e' : crown;
    for (let i = 0; i < 9; i++) { const a = rr() * TAU, d = rr() * 0.18 * s; circle(bx + Math.cos(a) * d + sway, by - s * 0.72 * tall + Math.sin(a) * d * tall, s * (0.17 + 0.07 * rr()), i < 3 ? mix(col, '#000000', 0.18) : i > 6 ? mix(col, '#ffffff', 0.12) : col); }
  };
  k.trees = ({ n = 5, y = 0.78, h = 0.18, x0 = 0, x1 = 1, kind = 'round', crown } = {}) => { const rr = rng(seed + 15); for (let i = 0; i < n; i++) k.tree({ x: x0 + (x1 - x0) * (i + 0.2 + 0.6 * rr()) / n, y: y + rr() * 0.02, h: h * (0.75 + 0.5 * rr()), kind, crown }); };

  // ---------- built things ----------
  k.house = ({ x = 0.5, y = 0.8, w = 0.2, h = 0.12, wall = '#e6d3b3', roof = '#8c4a3a', lit = false } = {}) => {
    g.fillStyle = wall; g.fillRect(X(x - w / 2), Y(y - h), X(w), Y(h)); poly([[X(x - w / 2 - 0.02), Y(y - h)], [X(x + w / 2 + 0.02), Y(y - h)], [X(x), Y(y - h - h * 0.7)]], roof);
    g.fillStyle = lit ? '#f6d27a' : '#4a5160'; g.fillRect(X(x - w * 0.25), Y(y - h * 0.65), X(w * 0.14), Y(h * 0.3)); g.fillRect(X(x + w * 0.1), Y(y - h * 0.65), X(w * 0.14), Y(h * 0.3)); if (lit) k.glow({ x, y: y - h * 0.5, r: w * 0.6, a: 0.25 });
  };
  k.city = ({ y = 0.72, h = 0.3, color = '#2a3350', lit = false, density = 1 } = {}) => {
    const rr = rng(seed + 16); let x = -0.05;
    while (x < 1.05) { const w = (0.05 + 0.08 * rr()) / density, bh = h * (0.35 + 0.65 * rr()); g.fillStyle = mix(color, '#000000', rr() * 0.15); g.fillRect(X(x), Y(y - bh), X(w), Y(bh) + 2);
      if (lit) { g.fillStyle = '#f6d27a'; for (let wy = y - bh + 0.02; wy < y - 0.02; wy += 0.025) for (let wx = x + 0.01; wx < x + w - 0.012; wx += 0.02) if (rr() < 0.4) { g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.7 + wx * 50 + wy * 70) ** 2; g.fillRect(X(wx), Y(wy), X(0.008), Y(0.009)); } g.globalAlpha = 1; }
      x += w + 0.004; }
  };
  k.heart = ({ x = 0.5, y = 0.5, s = 0.1, color = '#d1495b' } = {}) => { const S = s * H, cx = X(x), cy = Y(y); g.beginPath(); g.moveTo(cx, cy + S * 0.35); g.bezierCurveTo(cx - S * 0.9, cy - S * 0.2, cx - S * 0.4, cy - S * 0.8, cx, cy - S * 0.35); g.bezierCurveTo(cx + S * 0.4, cy - S * 0.8, cx + S * 0.9, cy - S * 0.2, cx, cy + S * 0.35); g.fillStyle = color; g.fill(); };

  // ---------- people: a jointed rig ----------
  // feet at (x, y); h = height as a fraction of the frame. Faces stay blank (the style reads at any size).
  k.person = ({ x = 0.5, y = 0.85, h = 0.25, pose = 'stand', facing = 'front', skin = '#c8936e', hair = 'short', hairColor = '#2b1d16', top = '#3c5a7a', bottom = '#2e2a28', robe = false, silhouette = null, rim = null, walk = 1.4, dx = 0, flip = false, build = 1 } = {}) => {
    const S = h * H, px = X(x + dx * p), py = Y(y), dir = flip ? -1 : 1, c = (col) => silhouette || col;
    let P = POSES[pose] || POSES.stand;
    const ph = t * walk * TAU;
    if (pose === 'walk') { const sw = Math.sin(ph) * 28; P = { arms: [[-sw * 0.8 + 6, -sw * 0.6 + 2], [sw * 0.8 - 6, sw * 0.6 - 2]], legs: [[sw, -Math.max(0, -Math.sin(ph)) * 30], [-sw, -Math.max(0, Math.sin(ph)) * 30]], lean: 3 }; }
    const bob = pose === 'walk' ? Math.abs(Math.sin(ph)) * 0.012 * S : Math.sin(t * 1.6) * 0.004 * S;
    const seat = P.seat || 0, legL = S * 0.47, thigh = legL * 0.52, shin = legL * 0.5;
    const hip = [px, py - legL * (1 - seat) - bob], torso = S * 0.32, shoulderW = S * 0.11 * build, lean = (P.lean || 0) * Math.PI / 180 * dir;
    const neck = [hip[0] + Math.sin(lean) * torso, hip[1] - Math.cos(lean) * torso];
    const seg = (x0, y0, ang, len) => [x0 + Math.sin(ang) * len, y0 + Math.cos(ang) * len];
    const limb = (a, b, w, col) => { g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    const rad = (d) => d * Math.PI / 180 * dir;
    // legs
    P.legs.forEach(([a, b], i) => { const off = (i ? 1 : -1) * S * 0.045 * build, h0 = [hip[0] + off, hip[1]], knee = seg(h0[0], h0[1], rad(a), thigh), foot = seg(knee[0], knee[1], rad(a + b), shin);
      if (!robe || pose === 'sit' || pose === 'kneel') { limb(h0, knee, S * 0.07 * build, c(bottom)); limb(knee, foot, S * 0.06 * build, c(bottom)); } limb(foot, [foot[0] + S * 0.04 * dir, foot[1]], S * 0.045, c('#2a221d')); });
    // body
    const hem = robe ? py - S * 0.03 : hip[1] + S * 0.04;
    poly([[neck[0] - shoulderW, neck[1] + S * 0.02], [neck[0] + shoulderW, neck[1] + S * 0.02], [hip[0] + shoulderW * (robe ? 1.5 : 0.95), hem], [hip[0] - shoulderW * (robe ? 1.5 : 0.95), hem]], c(top));
    // arms (behind or in front depends on facing: back view draws them first would hide them; flat shapes read either way)
    P.arms.forEach(([a, b], i) => { const sh = [neck[0] + (i ? 1 : -1) * shoulderW * 0.85, neck[1] + S * 0.04], el = seg(sh[0], sh[1], rad(-a), S * 0.16), hd = seg(el[0], el[1], rad(-b), S * 0.15);
      limb(sh, el, S * 0.055 * build, c(top)); limb(el, hd, S * 0.048 * build, c(top)); circle(hd[0], hd[1], S * 0.028, c(skin)); });
    // head and hair
    const head = [neck[0] + Math.sin(lean) * S * 0.08, neck[1] - S * 0.085], hr = S * 0.07;
    limb(neck, head, S * 0.045, c(skin)); circle(head[0], head[1], hr, c(facing === 'back' ? hairColor : skin));
    const hc = c(hairColor);
    if (hair === 'long') { poly([[head[0] - hr, head[1]], [head[0] + hr, head[1]], [head[0] + hr * 1.1, head[1] + hr * 2.2], [head[0] - hr * 1.1, head[1] + hr * 2.2]], hc); circle(head[0], head[1] - hr * 0.2, hr * 1.02, hc); if (facing !== 'back') circle(head[0], head[1] + hr * 0.15, hr * 0.8, c(skin)); }
    else if (hair === 'bun') { circle(head[0], head[1] - hr * 0.25, hr * 0.98, hc); circle(head[0], head[1] - hr * 1.15, hr * 0.45, hc); if (facing !== 'back') circle(head[0], head[1] + hr * 0.2, hr * 0.78, c(skin)); }
    else if (hair === 'hood') poly([[head[0] - hr * 1.3, head[1] + hr * 1.4], [head[0] - hr * 1.2, head[1] - hr * 0.9], [head[0], head[1] - hr * 1.5], [head[0] + hr * 1.2, head[1] - hr * 0.9], [head[0] + hr * 1.3, head[1] + hr * 1.4]], c(top));
    else if (hair === 'hat') { g.fillStyle = hc; g.fillRect(head[0] - hr * 1.6, head[1] - hr * 0.75, hr * 3.2, hr * 0.3); g.fillRect(head[0] - hr * 0.85, head[1] - hr * 1.6, hr * 1.7, hr * 0.95); }
    else if (hair !== 'bald') { g.beginPath(); g.arc(head[0], head[1], hr * 1.03, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = hc; g.fill(); }
    if (rim) { g.strokeStyle = rim; g.lineWidth = 2 * u; g.globalAlpha = 0.8; g.beginPath(); g.arc(head[0], head[1], hr * 1.05, -2.4, -0.7); g.stroke(); g.globalAlpha = 1; }
  };
  k.people = (list) => list.forEach((o) => k.person(o));

  // ---------- weather and life ----------
  k.rain = ({ n = 160, a = 0.6, slant = 0.15, color = '#d5dfeb' } = {}) => { const rr = rng(seed + 17); g.strokeStyle = alpha(color, a); g.lineWidth = 5 * u; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < n; i++) { const x = ((rr() * W + t * 120 * u) % W), y = ((rr() * H + t * 1100 * u * (0.8 + 0.4 * rr())) % H); g.moveTo(x, y); g.lineTo(x - slant * 70 * u, y + 70 * u); } g.stroke(); };
  k.snow = ({ n = 140, color = '#ffffff' } = {}) => { const rr = rng(seed + 18); for (let i = 0; i < n; i++) { const x = (rr() * W + Math.sin(t * 0.8 + i) * 30 * u + W) % W, y = (rr() * H + t * 80 * u * (0.6 + 0.6 * rr())) % H; circle(x, y, (2 + 4 * rr()) * u, alpha(color, 0.9)); } };
  k.birds = ({ n = 5, y = 0.2, color = '#2a2a2a' } = {}) => { const rr = rng(seed + 19); g.strokeStyle = color; g.lineWidth = 4 * u; for (let i = 0; i < n; i++) { const bx = ((rr() * 0.6 + 0.2) * W + t * 70 * u) % (W * 1.2) - W * 0.1, by = Y(y + 0.1 * rr()), f = Math.sin(t * 7 + i) * 14 * u, s = 26 * u; g.beginPath(); g.moveTo(bx - s, by + f); g.quadraticCurveTo(bx - s / 2, by - 10 * u, bx, by); g.quadraticCurveTo(bx + s / 2, by - 10 * u, bx + s, by + f); g.stroke(); } };
  k.motes = ({ n = 40, y0 = 0.4, y1 = 0.9, color = '#ffe08a' } = {}) => { const rr = rng(seed + 20); for (let i = 0; i < n; i++) { const x = X(rr()) + Math.sin(t + i) * 20 * u, y = Y(y0 + (y1 - y0) * rr()) + Math.cos(t * 0.7 + i) * 15 * u; g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); circle(x, y, (3 + 4 * rr()) * u, color); } g.globalAlpha = 1; };
  return k;
}

// A scene description (from the words of a line, story.mjs compose) drawn with the kit: the default when no custom drawing is given.
const SKY = { dawn: ['#f2b98f', '#f6dcc0', '#cfdde3'], day: ['#7fb4dc', '#bfdcee', '#eef1e4'], dusk: ['#36386a', '#c35f7a', '#f2a65a'], night: ['#0b1430', '#1b2a52', '#34477a'], storm: ['#4b5563', '#748091', '#a7b0ba'], mist: ['#cfd6d4', '#e2e5df', '#efede4'] };
export function drawScene(k, S, { portrait = true } = {}) {
  const night = S.sky === 'night', dusk = S.sky === 'dusk', grey = S.sky === 'storm' || S.sky === 'mist';
  k.sky({ stops: SKY[S.sky] || SKY.day });
  if (night) k.stars({});
  if (S.sun) k.sun({ x: 0.68, y: dusk ? 0.42 : 0.2, r: S.sun === 'moon' ? 0.045 : 0.06, color: S.sun === 'moon' ? '#f4efd8' : dusk ? '#e8553e' : '#f6d27a' });
  if (!night && !grey) k.clouds({ color: dusk ? '#f4c6a8' : '#ffffff', shade: dusk ? '#c98a8a' : '#d4dde8', n: 8 });
  if (grey) k.clouds({ color: '#9aa3ad', shade: '#6f7884', n: 16, band: 0.35, size: 1.4 });
  const horizon = S.sea ? 0.62 : S.city ? 0.7 : 0.66;
  if (S.mountains) { k.ridge({ y: horizon, amp: 0.3, freq: 2.2, color: night ? '#26304f' : '#8c9aa8', shape: 'peaks' }); k.haze({ y: horizon - 0.04, color: night ? '#3b4a78' : '#ffffff', a: 0.25 }); k.ridge({ y: horizon + 0.02, amp: 0.16, freq: 3.4, color: night ? '#1b2340' : '#6f7f8c', shape: 'peaks', seed: 2 }); }
  if (S.hills) { k.ridge({ y: horizon, amp: 0.09, freq: 1.6, color: night ? '#22324a' : '#8fae86' }); k.ridge({ y: horizon + 0.04, amp: 0.05, freq: 2.2, color: night ? '#1c2a3a' : '#6f9a66', shape: 'bush', seed: 3 }); }
  if (S.city) k.city({ y: horizon, h: 0.26, color: night ? '#1d2642' : dusk ? '#4a3a52' : '#8f8a8a', lit: night || dusk });
  if (S.sea) k.water({ y0: horizon, color: night ? '#1b2b4d' : dusk ? '#7a5c7e' : '#4f86a8', glint: night ? '#f4efd8' : '#ffffff' });
  else k.ground({ y: horizon, color: night ? '#1d3226' : S.snow ? '#e3e9ee' : S.city ? '#7a7570' : '#76a356', stripes: S.field ? 10 : 0, flowers: S.field && !night && !S.snow ? 60 : 0 });
  if (S.path) k.path({ y: horizon, color: night ? '#4a4a52' : '#d9c49a' });
  if (S.trees) { k.tree({ x: 0.14, y: 0.86, h: 0.3, kind: S.snow ? 'pine' : 'round', crown: night ? '#203828' : '#4e7a45' }); if (S.trees > 1) k.tree({ x: 0.86, y: 0.84, h: 0.26, kind: S.snow ? 'pine' : 'round', crown: night ? '#1f3326' : '#557f4a' }); if (S.trees > 2) k.trees({ n: 4, y: horizon + 0.02, h: 0.08, crown: night ? '#1a2c22' : '#5f8a52' }); }
  if (S.figure) k.person({ x: S.figure === 'walk' ? 0.5 : 0.4, y: S.path ? 0.9 : 0.88, h: portrait ? 0.16 : 0.24, pose: S.figure === 'walk' ? 'walk' : S.pose || 'stand', facing: 'back', robe: !!S.robe, silhouette: night || dusk ? '#141414' : null, top: '#5a4636', hair: 'short' });
  if (S.birds) k.birds({ y: 0.18 });
  if (S.rain) k.rain({});
  if (S.snow) k.snow({});
  if (S.fireflies) k.motes({});
}
