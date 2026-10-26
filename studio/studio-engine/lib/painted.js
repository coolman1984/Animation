// Studio Engine — hand-painted story shots (browser). Elements `painted` and `caption` for text-to-short films.
//   painted  one shot: a flat drawing made with the story kit (storykit.js) — from a scene description chosen by the words of
//            the line, or a custom drawing function from the film's scenes.js — then the brush pass (brush.js) paints it on the GPU.
//            A new drawing 12 times a second (on twos at 24 fps): the paint boils like hand animation. Camera moves per shot.
//   caption  the narrated line in short chunks (≤ 5 words, balanced, breaking at punctuation), each word lit when spoken.
import { clamp, lerp, hash, px, div, sm, words as lineOf, isArabic, col } from './core.js';
import { makeKit, drawScene, hashStr } from './storykit.js';
import { Brush, resolveLook } from './brush.js';

export const BOIL_FPS = 12;
export const boilIndex = (t, fps = BOIL_FPS) => Math.floor(t * fps + 1e-6);
export const MOVES = ['push', 'pull', 'pan-left', 'pan-right', 'rise', 'fall', 'drift', 'still'];
// a ridge: y(x) from summed sines with seeded phases (kept for older specs and tests)
export function ridge(seed, x, W, { base, amp, freq = 3 }) {
  let y = 0; for (let k = 1; k <= 4; k++) y += Math.sin((x / W) * Math.PI * freq * k * (0.7 + 0.6 * hash(seed, k)) + hash(seed, k + 9) * 6.28) / (k * 1.3);
  return base - amp * (0.5 + 0.45 * y);
}
// camera for a shot: scale and offset about the frame centre, eased over the shot
export function camera(move, p, W, H, amount = 1) {
  const e = p * p * (3 - 2 * p); let s = 1, x = 0, y = 0;
  if (move === 'push') s = 1 + 0.08 * amount * e; else if (move === 'pull') s = 1 + 0.08 * amount * (1 - e);
  else if (move === 'pan-left') { s = 1.12; x = W * 0.05 * amount * (1 - 2 * e); } else if (move === 'pan-right') { s = 1.12; x = -W * 0.05 * amount * (1 - 2 * e); }
  else if (move === 'rise') { s = 1.1; y = H * 0.04 * amount * (1 - 2 * e); } else if (move === 'fall') { s = 1.1; y = -H * 0.04 * amount * (1 - 2 * e); }
  else if (move === 'drift') { s = 1.05; x = W * 0.015 * amount * Math.sin(p * 2.2); y = H * 0.008 * amount * Math.cos(p * 1.7); }
  return { s, x, y };
}

const WORDS = {
  rain: /rain|مطر|المطر|أمطار|غيم/i, snow: /snow|ثلج|برد/i, sea: /sea|ocean|river|wave|بحر|البحر|نهر|موج|شط/i, mountains: /mountain|peak|cliff|جبل|الجبل|جبال|قمة/i,
  city: /city|street|town|building|مدينة|المدينة|شارع|بيوت|حارة/i, trees: /tree|forest|garden|شجر|شجرة|غابة|جنينة|بستان/i, birds: /bird|wing|fly|طير|طيور|عصفور|جناح/i,
  path: /road|path|walk|journey|way|طريق|الطريق|سكة|مشي|رحلة|درب/i, field: /field|grass|meadow|wheat|حقل|زرع|عشب|قمح|أرض/i, night: /night|dark|star|moon|ليل|الليل|ظلام|نجم|قمر/i,
  dusk: /sunset|evening|dusk|غروب|المغرب|مساء/i, dawn: /dawn|morning|sunrise|فجر|الفجر|صبح|الصبح|شروق/i, storm: /storm|thunder|wind|عاصفة|رعد|ريح|رياح/i,
  pray: /pray|god|lord|heaven|دعاء|يدعو|ربنا|الله|صلاة|يصلي/i, kneel: /kneel|bow|يركع|سجد|ركع/i, joy: /joy|happy|cheer|فرح|سعيد|فرحة/i, fireflies: /light|hope|نور|أمل|ضوء/i,
  alone: /alone|lonely|man|woman|child|he |she |وحيد|لوحده|راجل|ست|طفل|إنسان|قلب/i, mist: /mist|fog|dream|ضباب|حلم/i,
};
export function compose(text, prev = {}) {
  const has = (k) => WORDS[k].test(` ${text} `);
  const sky = has('night') ? 'night' : has('storm') || (has('rain') && !has('dusk') && !has('dawn')) ? 'storm' : has('dusk') ? 'dusk' : has('dawn') ? 'dawn' : has('mist') ? 'mist' : prev.sky || 'day';
  const s = { sky, sun: sky === 'night' ? 'moon' : sky === 'storm' || sky === 'mist' ? null : 'sun', mountains: has('mountains'), sea: has('sea'), city: has('city'),
    trees: has('trees') ? 3 : 0, field: has('field'), path: has('path'), rain: has('rain') || sky === 'storm', snow: has('snow'), birds: has('birds'),
    figure: has('path') ? 'walk' : has('alone') || has('pray') || has('kneel') || has('joy') ? 'stand' : null,
    pose: has('kneel') ? 'kneel' : has('pray') ? 'pray' : has('joy') ? 'cheer' : null, fireflies: sky === 'night' && has('fireflies') };
  if (!s.mountains && !s.sea && !s.city) s.hills = true;
  if (!s.field && !s.sea) s.field = !s.city;
  return s;
}

export function painted(ctx, e) {
  // a shot may cover part of its scene (at/out in beats): several shots cut inside one narrated line
  const { W, H } = ctx, a = e.at != null ? ctx.T(e.at) : ctx.a, b = e.out != null ? ctx.T(e.out) : ctx.b, look = resolveLook(e.look || 'watercolour', e.lookWords || '');
  const S = e.scene || compose(e.text || ''), seed = hashStr(`${e.draw || ''}${e.seed ?? 7}${e.text || ''}`), fps = e.boil ?? BOIL_FPS;
  const scale = clamp(e.paintScale ?? (globalThis.STORY_PAINT_SCALE || 1), 0.25, 1), PW = Math.round(W * scale), PH = Math.round(H * scale);
  const host = div(ctx.root, { width: px(W), height: px(H), zIndex: String(e.z ?? 1), overflow: 'hidden' });
  const flat = document.createElement('canvas'); flat.width = PW; flat.height = PH; const fg = flat.getContext('2d');
  const out = document.createElement('canvas'); out.width = PW; out.height = PH;
  Object.assign(out.style, { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H) }); host.appendChild(out);
  let brush = null; try { brush = Brush(out); } catch (error) { console.warn('brush pass unavailable: ' + error.message); }
  if (!brush) { out.remove(); Object.assign(flat.style, { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H) }); host.appendChild(flat); }
  const custom = e.draw && globalThis.STORY_SCENES?.[e.draw];
  let last = -1;
  return (t) => {
    const on = t >= a - 1e-4 && (e.out == null || t < b); host.style.display = on ? 'block' : 'none'; if (!on) return;
    const d = boilIndex(t, fps); if (d === last) return; last = d;
    const tt = d / fps, p = clamp((tt - a) / Math.max(0.1, b - a)), cam = camera(e.move || 'push', p, PW, PH, e.amount ?? 1);
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.fillStyle = '#000'; fg.fillRect(0, 0, PW, PH);
    // a close shot frames the figure (or the focus point) 1.5× larger, the move still runs on top
    const close = !!S.close, cs = cam.s * (close ? 1.5 : 1), fx = (S.focus?.[0] ?? 0.5) * PW, fy = (S.focus?.[1] ?? (S.figure ? 0.8 : 0.6)) * PH;
    if (close) fg.setTransform(cs, 0, 0, cs, PW / 2 - fx * cs + cam.x, PH * 0.66 - fy * cs + cam.y);
    else fg.setTransform(cs, 0, 0, cs, PW / 2 - (PW / 2) * cs + cam.x, PH / 2 - (PH / 2) * cs + cam.y);
    const k = makeKit(fg, PW, PH, { t: Math.max(0, tt - a), p, seed, palette: e.palette || {} });
    try { if (custom) custom(k); else drawScene(k, S, { portrait: ctx.portrait }); } catch (error) { console.error(`painted ${e.draw || 'scene'}: ${error.message}`); }
    fg.setTransform(1, 0, 0, 1, 0, 0);
    if (brush) brush.paint(flat, look, d);
  };
}

// caption chunks: at most n words, balanced (7 words → 4 + 3), a break moves one word to land on punctuation; "/" forces a break
export function chunkLine(text, n = 5) {
  const T = String(text || '').trim(); if (!T) return [];
  if (T.includes('/')) return T.split('/').map((x) => x.trim()).filter(Boolean);
  const w = T.split(/\s+/); if (w.length <= n) return [T];
  const parts = Math.ceil(w.length / n), out = []; let i = 0;
  for (let left = parts; left > 1; left--) {
    let size = Math.round((w.length - i) / left);
    for (const d of [0, 1, -1]) { const s2 = size + d; if (s2 >= 2 && s2 <= n && w.length - i - s2 >= 2 && /[,.;:!?…،؛؟]$/.test(w[i + s2 - 1])) { size = s2; break; } }
    out.push(w.slice(i, i + size).join(' ')); i += size;
  }
  out.push(w.slice(i).join(' '));
  return out;
}

// the spoken line: one chunk at a time, each word lit in reading order when it is said (Arabic stays whole words, right to left)
export function caption(ctx, e) {
  const k = Math.min(ctx.W, ctx.H) / 1080, color = col(ctx.brand, e.color, '#FFFFFF'), boxed = (e.style ?? 'plain') === 'box';
  const parts = e.chunks === false ? [e.text] : chunkLine(e.text, e.words ?? 5), a = ctx.T(e.at ?? 0), o = e.out != null ? ctx.T(e.out) : ctx.b - 0.15;
  const y = e.y ?? (ctx.portrait ? 0.3 : ctx.W === ctx.H ? 0.18 : 0.15);
  const lines = parts.map((text) => lineOf(ctx.root, text, ctx, { size: (e.size ?? 64) * k, weight: e.weight ?? 600, color, y, z: 20, lh: 1.35,
    shadow: boxed ? '' : e.shadow ?? '0 2px 18px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.6)' }));
  if (boxed) for (const L of lines) Object.assign(L.line.style, { background: e.box ?? 'rgba(20,20,24,0.62)', borderRadius: px(12 * k), padding: `${px(6 * k)} ${px(18 * k)}`, width: 'max-content', left: px(ctx.W / 2), transform: 'translateX(-50%)' });
  // word times in seconds from the scene start (voice), else spread by characters over the spoken span
  const all = lines.flatMap((L) => L.words), n = all.length;
  let times;
  if (Array.isArray(e.wordTimes) && e.wordTimes.length === n) times = e.wordTimes.map((s) => ctx.a + s);
  else { const chars = all.map((w) => w.textContent.length + 2), tot = chars.reduce((x, y2) => x + y2, 0); let acc = 0; times = chars.map((c) => { const at = lerp(a, a + (o - a) * 0.9, acc / tot); acc += c; return at; }); }
  let wi = 0; const spans = lines.map((L) => { const s0 = wi; wi += L.words.length; return [s0, wi]; });
  return (t) => {
    lines.forEach((L, j) => {
      const [s0, s1] = spans[j], start = j === 0 ? a : times[s0] - 0.05, end = j === lines.length - 1 ? o : times[spans[j + 1][0]] - 0.15;   // a clear gap: never two chunks at once
      // one chunk on screen at a time: a chunk leaves before the next one arrives (the last one fades out after the line)
      const last = j === lines.length - 1, vis = t >= start && (last ? t <= end + 0.25 : t < end); L.line.style.display = vis ? 'flex' : 'none'; if (!vis) return;
      const fade = sm(start, start + 0.15, t) * (last ? 1 - sm(end, end + 0.25, t) : 1 - sm(end - 0.12, end, t));
      L.words.forEach((w, i) => { const lit = sm(times[s0 + i] - 0.04, times[s0 + i] + 0.18, t); w.style.opacity = (fade * (0.62 + 0.38 * lit)).toFixed(3); });
    });
  };
}
export const isRTL = isArabic;
