// Eyes for any model: what is on screen at given times, as data and as a character map (ANY_MODEL.md).
// Works for every composer film (Studio Engine packages and hand-written film.js). Research basis: rendered-frame diagnostics
// beat code reading for layout errors (OmniManim, SGA 2026) — so the frame itself is read back, not the script's intent.
//   inspect({ film, times, w, h, safe })  → [{ t, items, findings, map }]
//   analyze(items, { w, h, safe })        → { findings, focal, balance }   (pure; unit-tested)
//   asciiMap(items, { w, h, safe, cols }) → string (T text · # shape · o outline · @ image · * vector · : canvas · . empty · + safe corners)
import { serve } from './serve.mjs';
import { openFilm } from './render.mjs';
import { STUDIO } from './capabilities.mjs';

const rgb = (c) => { if (!c) return null; const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c); if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]];
  const h = /^#([0-9a-f]{6})/i.exec(c); return h ? [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)).concat(1) : null; };
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const contrastOf = (a, b) => { const A = rgb(a), B = rgb(b); if (!A || !B) return null; const [x, y] = [lum(A), lum(B)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
const areaOf = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const inside = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

// What sits under a point (topmost opaque-ish non-text item), for text contrast.
function under(items, x, y, self) {
  let best = null;
  for (const it of items) if (it !== self && ['shape', 'backdrop', 'image'].includes(it.kind) && it.color && (rgb(it.color)?.[3] ?? 1) > 0.6 && inside(it, x, y) && it.opacity > 0.5 && (!best || it.z >= best.z)) best = it;
  return best;
}

export function analyze(items, { w, h, safe = [0, 0, w, h] } = {}) {
  const findings = [], frame = w * h, add = (level, rule, msg, fix) => findings.push({ level, rule, msg, fix });
  const visual = items.filter((i) => !['backdrop', 'texture'].includes(i.kind) && !(i.kind === 'canvas' && areaOf(i) > frame * 0.9) && i.opacity > 0.15 && (rgb(i.color)?.[3] ?? 1) > 0.25);
  const text = items.filter((i) => i.kind === 'text');
  if (!visual.length) add('warn', 'empty', 'nothing but the background is visible', 'Every frame needs a subject unless it is a declared breath (scene hold) or a cut point.');
  for (const t of text) {
    const cx = (t.x0 + t.x1) / 2, cy = (t.y0 + t.y1) / 2, bg = under(items, cx, cy, t), c = contrastOf(t.color, bg?.color);
    t.on = bg?.color || null; t.contrast = c;
    if (c != null && c < 3) add('fail', 'contrast', `"${t.text}" contrast ${c}:1 on ${bg.color}`, 'Raise contrast to ≥ 3:1 (4.5:1 for small text): change the text colour or what it sits on.');
    if (t.size < Math.min(w, h) * 0.031) add('warn', 'small-type', `"${t.text}" is ${t.size} px`, `On a phone keep text ≥ ${Math.round(Math.min(w, h) * 0.031)} px (Arabic body ≥ 34 px at 1080).`);
    if (t.x0 < safe[0] - 2 || t.y0 < safe[1] - 2 || t.x1 > safe[2] + 2 || t.y1 > safe[3] + 2) add('fail', 'safe-area', `"${t.text}" leaves the safe box`, 'Move it toward the centre or make it smaller.');
    if (t.blur > 3 && t.opacity > 0.8) add('note', 'blurred-text', `"${t.text}" is blurred ${t.blur}px at full opacity`, 'Fine during an entrance; it must be sharp while it is read.');
  }
  for (let i = 0; i < text.length; i++) for (let j = i + 1; j < text.length; j++) {
    const a = text[i], b = text[j], ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (ox > 4 && oy > 4) add('fail', 'overlap', `"${a.text}" overlaps "${b.text}"`, 'Separate their y positions or use one stack.');
  }
  const lines = text.filter((t) => t.opacity > 0.5);
  if (lines.length > 3) add('warn', 'one-idea', `${lines.length} text lines on screen at once`, 'One idea per bar: at most a headline and a support line (plus a small label).');
  const big = visual.filter((i) => areaOf(i) > frame * 0.08 && i.kind !== 'text');
  if (big.length > 2) add('warn', 'competing-focus', `${big.length} large objects compete for attention`, 'Keep one hero object large; make the others smaller, dimmer or later.');
  const cropped = visual.filter((i) => i.cut && i.kind !== 'canvas' && areaOf(i) < frame * 0.6);
  if (cropped.length) add('note', 'cropped', `${cropped.length} object(s) cut by the frame edge (${cropped.slice(0, 3).map((i) => i.kind + (i.text ? ` "${i.text}"` : '')).join(', ')})`, 'Intentional bleed is fine; an accidental crop is not — check it.');
  // focal point: the largest sharp item weighted by opacity (text counts double: it is read)
  const weight = (i) => areaOf(i) * i.opacity * (i.kind === 'text' ? 2 : 1) / (1 + (i.blur || 0) / 4);
  const focal = visual.slice().sort((a, b) => weight(b) - weight(a))[0] || null;
  const tw = visual.reduce((s, i) => s + weight(i), 0) || 1;
  const balance = { x: +(visual.reduce((s, i) => s + weight(i) * ((i.x0 + i.x1) / 2), 0) / tw / w - 0.5).toFixed(2), y: +(visual.reduce((s, i) => s + weight(i) * ((i.y0 + i.y1) / 2), 0) / tw / h - 0.5).toFixed(2) };
  return { findings, focal: focal && { kind: focal.kind, ...(focal.text ? { text: focal.text } : {}), box: [focal.x0, focal.y0, focal.x1, focal.y1] }, balance };
}

export function asciiMap(items, { w, h, safe, cols = 18 } = {}) {
  const rows = Math.max(6, Math.round(cols * (h / w) * 0.5)), cw = w / cols, ch = h / rows, CH = { text: 'T', shape: '#', outline: 'o', image: '@', vector: '*', canvas: ':' };
  const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
    const x = (c + 0.5) * cw, y = (r + 0.5) * ch;
    let top = null; for (const it of items) if (CH[it.kind] && it.opacity > 0.15 && (rgb(it.color)?.[3] ?? 1) > 0.25 && inside(it, x, y) && !(it.kind === 'canvas' && areaOf(it) > w * h * 0.9) && (!top || it.z >= top.z || it.kind === 'text')) top = it;
    return top ? CH[top.kind] : '.';
  }));
  if (safe) for (const [x, y] of [[safe[0], safe[1]], [safe[2], safe[1]], [safe[0], safe[3]], [safe[2], safe[3]]]) { const r = Math.min(rows - 1, Math.floor(y / ch)), c = Math.min(cols - 1, Math.floor(x / cw)); if (grid[r][c] === '.') grid[r][c] = '+'; }
  return grid.map((r) => r.join('')).join('\n');
}

export async function inspect({ film, times, w, h, safe, gpu = false }) {
  const srv = await serve(STUDIO);
  let client;
  const out = [];
  try {
    let info; ({ client, info } = await openFilm(srv.port, film, { w, h, gpu }));
    for (const t of times) {
      await client.eval(`window.renderAt(${t}, ${Math.round(t * info.fps)})`);
      const items = await client.eval('window.sceneGraph()');
      const a = analyze(items, { w, h, safe });
      out.push({ t: +t.toFixed(2), focal: a.focal, balance: a.balance, findings: a.findings,
        items: items.filter((i) => !['backdrop', 'texture'].includes(i.kind)).slice(0, 60).map(({ z, ...i }) => i), map: asciiMap(items, { w, h, safe }) });
    }
  } finally { await client?.close(); srv.close(); }
  return out;
}
