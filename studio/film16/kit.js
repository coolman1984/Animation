// Film 16 — small kit shared by film.js: palette, helpers, text lines, the product's own icons, the hero dot's physics.
// Pure in t, seeded, no wall clock. The icon paths are copied from Teachers/js/core.js (24×24 stroke set) so the UI is the real one.
import { clamp, lerp, ramp, ease, el, textLine } from '../lib/motion.js';
import { springStep, hash } from '../lib/kinetics.js';
import { T } from './timing.js';
export { clamp, lerp, ramp, ease, el, hash, T };

export const W = 1920, H = 1080;
export const C = {
  ink: '#070D1C', navy: '#13294B', navy2: '#1B3764', navy3: '#2C4474',
  amber: '#F2A900', amberL: '#FFC23D', amberD: '#B97F00', amberSoft: '#FFF1CC',
  paper: '#EAF0F8', white: '#FFFFFF', text: '#0F1B33', text2: '#4A5A75', text3: '#6B7A93', line: '#D6DDE9', line2: '#E6EBF3', surf2: '#F4F7FB',
  green: '#1FBF75', greenD: '#126A34', greenSoft: '#DCF3E5', red: '#E5484D', redD: '#B52B2B', redSoft: '#FBE2E2',
  night: '#0A1120', nightS: '#121A2C', nightS2: '#17213A', nightLine: '#27334F', nightInk: '#E8EDF6', nightInk2: '#A3B0C8', nightBrand: '#9DBCFF',
};
export const DISP = "'Alexandria'", UIF = "'Plex Arabic'";

export const px = (v) => `${(+v).toFixed(2)}px`;
export const oE = ease.outExpo, ioC = ease.inOutCubic, oC = ease.outCubic, ioQ = ease.inOutQuint, iC = ease.inCubic;
export const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const spr = (t, start, duration = 0.5, bounce = 0.2) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
export const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
export const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
export const place = (n, x, y, w, h, r) => { n.style.left = px(x - w / 2); n.style.top = px(y - h / 2); n.style.width = px(Math.max(0, w)); n.style.height = px(Math.max(0, h)); if (r !== undefined) n.style.borderRadius = px(Math.max(0, r)); };
export const setBlur = (n, b) => { n.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : 'none'; };
export const pulse = (t, t0, d) => Math.pow(Math.sin(Math.PI * clamp((t - t0) / d)), 2);
export const mixHex = (a, b, p) => { const h = (c, k) => parseInt(c.slice(1 + 2 * k, 3 + 2 * k), 16); return '#' + [0, 1, 2].map((k) => Math.round(lerp(h(a, k), h(b, k), clamp(p))).toString(16).padStart(2, '0')).join(''); };
export const num = (n) => Math.round(n).toLocaleString('en-US');

// ---------- the product's icons ----------
export const IC = {
  cap: '<path d="m2 9 10-5 10 5-10 5L2 9ZM6 11v6c4 3 8 3 12 0v-6M22 9v8"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.8"/><circle cx="12" cy="16.9" r=".5"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 20c0-3.3 2.7-5.7 6-5.7s6 2.4 6 5.7"/><path d="M16 5.6a3.2 3.2 0 0 1 0 6"/><path d="M18.2 14.6c1.7.7 2.8 2.4 2.8 5.4"/>',
  sheet: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M4 9h16M4 15h16M10 9v12"/>',
  alert: '<path d="M12 3.5 2.8 19.5h18.4L12 3.5Z"/><path d="M12 10v4.2"/><circle cx="12" cy="17" r=".5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  down: '<path d="m6 9.5 6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  right: '<path d="m9.5 6 6 6-6 6"/>',
  send: '<path d="M21 3 3 10.5l7 3 3 7L21 3Z"/><path d="M10 13.5 21 3"/>',
};
export function icon(parent, name, size, color, { sw = 2, style = {} } = {}) {
  const sv = el('svg', { viewBox: '0 0 24 24', width: size, height: size, style: { position: 'absolute', overflow: 'visible', ...style } }, parent);
  sv.setAttribute('fill', 'none'); sv.setAttribute('stroke', color); sv.setAttribute('stroke-width', sw); sv.setAttribute('stroke-linecap', 'round'); sv.setAttribute('stroke-linejoin', 'round');
  sv.innerHTML = IC[name];
  return sv;
}
export const iconInline = (name, size, color, sw = 2) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${IC[name]}</svg>`;

// ---------- text ----------
// A right-aligned (RTL) line inside [x0, x1] centred on cy. These are the only nodes the text gate reads (class "line"/"word").
export function tline(parent, text, { size, weight = 800, color = C.white, cy, x0 = 200, x1 = 1720, font = DISP, dir = 'rtl', track = 0, lh = 1.25, justify, z = 8, accent = {} } = {}) {
  const L = textLine(parent, text, { left: px(x0), top: px(cy - (size * lh) / 2), width: px(x1 - x0), justifyContent: justify || (dir === 'rtl' ? 'flex-start' : 'center'), fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), letterSpacing: `${track}em`, direction: dir, zIndex: String(z) });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; });
  return L;
}
// the closing "؟" as its own coloured run INSIDE the last word (no space before it, shaping untouched)
export function colourMark(L, color, mark = '؟') {
  const w = L.words[L.words.length - 1];
  if (w.textContent.endsWith(mark)) w.innerHTML = `${w.textContent.slice(0, -mark.length)}<span style="color:${color}">${mark}</span>`;
}
export function rise(L, t, tIn, tOut = 99, { stagger = 0.07, dur = 0.8, dy = 34, blur = 10, outDur = 0.38, outDy = -18 } = {}) {
  const vis = t >= tIn - 0.01 && t <= tOut + outDur + L.words.length * 0.03 + 0.02;
  L.line.style.display = vis ? 'flex' : 'none';
  if (!vis) return;
  L.words.forEach((w, i) => {
    const a = tIn + i * stagger, pin = oE(ramp(t, a, a + dur)), b0 = tOut + i * 0.03, pout = ioC(ramp(t, b0, b0 + outDur));
    w.style.opacity = (clamp(pin * 1.4) * (1 - pout)).toFixed(3);
    w.style.transform = `translateY(${((1 - pin) * dy + pout * outDy).toFixed(2)}px)`;
    setBlur(w, (1 - pin) * blur + pout * 8);
  });
}

// ---------- the hero dot in the hook: a ball hopping down four ruled lines ----------
export const HOOK = { xBall: 1700, R: 44, y0: 250, pitch: 200, ruleDrop: 78, x0: 300, x1: 1640 };
export const lineY = (i) => HOOK.y0 + i * HOOK.pitch;                // centre of question line i
export const floorY = (i) => lineY(i) + HOOK.ruleDrop;               // the rule the ball lands on
// returns { x, y, sx, sy, r } — y is the ball CENTRE; squash is anchored at the floor so the contact point never slides
export function ballAt(t) {
  const L = T.hop, R = HOOK.R, fl = [0, 1, 2, 3].map(floorY);
  let x = HOOK.xBall, bottom, sx = 1, sy = 1, r = R;
  const start = { y: 70 };                                              // already falling in frame 1
  if (t < L[0]) { const u = t / L[0]; bottom = lerp(start.y, fl[0], u * u); const v = u; sy = 1 + 0.2 * sm(0.55, 1, v); sx = 1 - 0.08 * sm(0.55, 1, v); }
  else if (t < T.hookExit) {
    let i = 0; while (i < 3 && t >= L[i + 1]) i++;                      // last landing index
    const last = i === 3, t0 = L[i], t1 = last ? T.hookExit : L[i + 1], u = ramp(t, t0, t1);
    const h = last ? 0 : 160;
    bottom = last ? fl[3] : lerp(fl[i], fl[i + 1], u) - 4 * h * u * (1 - u);
    if (!last) { const v = Math.abs(1 - 2 * u); sy = 1 + 0.16 * v * v * v; sx = 1 - 0.07 * v * v * v; }           // stretch along the fall, strongest near contact
    const tau = t - t0, sq = tau < 0.12 ? Math.sin(Math.PI * tau / 0.12) : 0;                                     // contact squash
    sy *= 1 - 0.34 * sq; sx *= 1 + 0.28 * sq;
    if (last) { const beats = [2.5, 3.0]; for (const b of beats) { const q = t - b; if (q > 0 && q < 0.2) { const k = Math.sin(Math.PI * q / 0.2); sy *= 1 - 0.14 * k; sx *= 1 + 0.1 * k; } } }
  } else {                                                              // leaves the list: one long arc to the centre of the frame, shrinking into a student dot
    const u = ramp(t, T.hookExit, T.A), e = ioC(u);
    const cx = lerp(HOOK.xBall, 960, e), cyEnd = 540, by = lerp(fl[3], cyEnd + 14, e) - Math.sin(Math.PI * u) * 330;
    x = cx; r = lerp(R, 14, ioC(ramp(t, T.hookExit + 0.1, T.A)));
    bottom = by + r * 0; sy = 1 + 0.12 * Math.sin(Math.PI * u); sx = 1 - 0.05 * Math.sin(Math.PI * u);
    return { x, y: by, sx, sy, r };
  }
  return { x, y: bottom - R * sy, sx, sy, r };
}
