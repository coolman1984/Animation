// Film 6 — PIXEL Plus (agency ad), 20 s, 9:16 1080×1920 @ 30 fps, 120 BPM (beat 0.5 s, bar 2 s).
// Grammar learned from an owner-supplied SaaS promo (white / ink / electric blue, dithered 3-D mascot, bold sans
// headline + one handwritten accent word, HUD + timecode, dot / push / whip / iris / bloom transitions), re-authored
// as an original Arabic film: our own mascot (film6/mascot.js), copy, layout, logo and music. Pure in t.
import { el, clamp, lerp, ramp, ease } from '../lib/motion.js';
import { spring, curves, noise1 } from '../lib/kinetics.js';
import { planeTransform, tiltSettle, planeDrift, pulseRing } from '../lib/uimotion.js';
import { lineDraw } from '../lib/fx.js';
import { fitFontSize } from '../lib/typography.js';
import { mascotLayer } from './mascot.js';

const W = 1080, H = 1920, FPS = 30;
const C = { white: '#FFFFFF', ink: '#0B0B0C', blue: '#2348FF', grey: '#74757B', dim: '#6E6F75', light: '#F2F3F6', line: '#E2E3E8', blueOnDark: '#8197FF' };
const F = { head: "'Alexandria'", accent: "'Aref Ruqaa'", mono: "'Space Mono'", label: "'Plex Arabic'" };
const SAFE_R = 1015, SAFE_L = 65;
const ARD = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const sp = (t, start, { dur = 0.6, bounce = 0.3, from = 0, to = 1 } = {}) => (t <= start ? from : spring(t, { from, to, start, duration: dur, bounce }));
const ein = curves.emphasized;
const abs = (style = {}) => ({ position: 'absolute', ...style });
const setVis = (n, on) => { n.style.display = on ? 'block' : 'none'; };
// A single-span text line the text gate can read back (class line > span.word).
function wline(parent, text, style = {}, inner = {}) {
  const line = el('div', { class: 'line', style: { whiteSpace: 'nowrap', ...style } }, parent);
  line.dataset.text = text;
  el('span', { class: 'word', text, style: { display: 'inline-block', ...inner } }, line);
  return line;
}

// ---------- text: lines of words; each word may use its own face (Alexandria / Ruqaa accent) ----------
const STY = {
  h: { fontFamily: F.head, fontWeight: 800 },
  m: { fontFamily: F.head, fontWeight: 500 },
  a: { fontFamily: F.accent, fontWeight: 700, color: C.blue, lineHeight: '1.0' },
};
function rich(parent, parts, box, size) {
  const line = el('div', { class: 'line', style: abs({ direction: 'rtl', whiteSpace: 'nowrap', fontFamily: F.head, fontWeight: 800, fontSize: size + 'px', lineHeight: '1.25', ...box }) }, parent);
  line.dataset.text = parts.map(p => p[0]).join(' ');
  const words = parts.map(([txt, key, extra = {}], i) => {
    const outer = el('span', { class: 'word-clip', style: { display: 'inline-block', verticalAlign: 'baseline', paddingBlock: '0.15em', marginBlock: '-0.15em' } }, line);
    const span = el('span', { class: 'word', text: txt, style: { display: 'inline-block', ...STY[key], ...extra } }, outer);
    if (i < parts.length - 1) line.appendChild(document.createTextNode(' '));
    return { outer, span, key };
  });
  return { line, words };
}
// Word state. A word at rest carries no transform/filter (history-independent raster).
function wset(w, { op = 1, x = 0, y = 0, sc = 1, blur = 0, clip = 0 } = {}) {
  w.span.style.opacity = op.toFixed(4);
  const rest = Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && Math.abs(sc - 1) < 1e-4;
  w.span.style.transform = rest ? 'none' : `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(4)})`;
  w.span.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
  w.span.style.clipPath = clip > 0.001 ? `inset(-20% -10% -30% ${(clip * 110).toFixed(2)}%)` : 'none';
}
// Rise-with-blur entrance (the reference's word reveal), optional exit at tOut.
function wordIn(w, t, t0, { dur = 0.55, dist = 0.42, blur = 0.16, tOut = Infinity, outDur = 0.3 } = {}) {
  const em = parseFloat(w.span.style.fontSize || w.span.parentNode.parentNode.style.fontSize) || 100;
  const p = ein(ramp(t, t0, t0 + dur)), q = ease.inCubic(ramp(t, tOut, tOut + outDur));
  if (w.key === 'a') { // handwritten accent: written right → left (clip), with a small pop
    wset(w, { op: ramp(t, t0, t0 + 0.08) * (1 - q), clip: 1 - ease.outCubic(ramp(t, t0, t0 + dur * 0.9)), sc: lerp(1.08, 1, p), y: -q * em * 0.3 });
    return;
  }
  wset(w, { op: ramp(t, t0, t0 + dur * 0.6) * (1 - q), y: (1 - p) * em * dist - q * em * 0.3, blur: (1 - p) * em * blur + q * em * 0.12 });
}
function lineIn(L, t, t0, each = 0.09, opts) { L.words.forEach((w, i) => wordIn(w, t, t0 + i * each, opts)); }

// Hand-drawn underline under a word, drawn right → left (RTL writing direction).
function underline(parent, color = C.blue, width = 7) {
  const svg = el('svg', { width: String(W), height: String(H), style: abs({ left: '0', top: '0', overflow: 'visible', pointerEvents: 'none' }) }, parent);
  const path = el('path', { fill: 'none', stroke: color, 'stroke-width': String(width), 'stroke-linecap': 'round' }, svg);
  return { svg, path, placed: false };
}
function placeUnder(U, word) {
  if (U.placed) return;
  const r = layoutRect(word);
  const x1 = r.right - 6, x0 = r.left + 10, y = r.bottom - r.height * 0.16;
  U.path.setAttribute('d', `M ${x1} ${y - 4} C ${lerp(x1, x0, 0.3)} ${y + 10}, ${lerp(x1, x0, 0.7)} ${y + 6}, ${x0} ${y - 10}`);
  U.placed = true;
}
// A word's untransformed layout box in scene coordinates (independent of the current animation state,
// so every renderer/worker gets the same answer whatever frame it draws first).
function layoutRect(word) {
  const line = word.outer.parentNode;
  const left = line.offsetLeft + word.outer.offsetLeft, top = line.offsetTop + word.outer.offsetTop;
  return { left, top, right: left + word.outer.offsetWidth, bottom: top + word.outer.offsetHeight, width: word.outer.offsetWidth, height: word.outer.offsetHeight };
}

// ---------- pixel transitions: chunky dithered circle on a low-res canvas (12 px cells) ----------
const CELL = 12, GW = W / CELL, GH = H / CELL;
const BAYER = (() => { const m = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
  const xr = x ^ y; m.push(((((xr & 1) << 5) | ((x & 1) << 4) | (((xr >> 1) & 1) << 3) | (((x >> 1) & 1) << 2) | (((xr >> 2) & 1) << 1) | ((x >> 2) & 1)) + 0.5) / 64); } return m; })();
const bayer = (x, y) => BAYER[(y & 7) * 8 + (x & 7)];
function pixelCanvas(parent, z, w = GW, h = GH, style = {}) {
  const c = el('canvas', { width: String(w), height: String(h), style: abs({ left: '0', top: '0', width: w * CELL + 'px', height: h * CELL + 'px', imageRendering: 'pixelated', zIndex: String(z), pointerEvents: 'none', ...style }) }, parent);
  const g = c.getContext('2d'); const img = g.createImageData(w, h);
  return { c, g, img, w, h };
}
// Circle of colour `hex` centred at (cx, cy) px with radius r px; `band` = dithered edge width as a fraction of r.
function pixelCircle(P, { cx, cy, r, band = 0.25, hex }) {
  const n = parseInt(hex.slice(1), 16), R = n >> 16, G = (n >> 8) & 255, B = n & 255, d = P.img.data;
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    const dist = Math.hypot((x + 0.5) * CELL - cx, (y + 0.5) * CELL - cy);
    const edge = (r - dist) / Math.max(1, r * band); // >1 solid, <0 empty, in between dithered
    const on = edge >= 1 || (edge > 0 && edge > bayer(x, y)), i = (y * P.w + x) * 4;
    d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = on ? 255 : 0;
  }
  P.g.putImageData(P.img, 0, 0);
}
const cover = (cx, cy) => Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));

// ---------- scene graph ----------
let stage, bg, hud, hudL, hudR, mascot, tr, svgDefs, hblur;
const S = {};

function scene(z = 10) { return el('div', { style: abs({ left: '0', top: '0', width: W + 'px', height: H + 'px', zIndex: String(z), transformOrigin: '50% 45%' }) }, stage); }
function label(parent, text, { top, right = W - SAFE_R, color = C.grey, size = 28 } = {}) {
  return wline(parent, text, abs({ top: top + 'px', right: right + 'px', direction: 'rtl', fontFamily: F.label, fontWeight: 500, fontSize: size + 'px', color, letterSpacing: '0.02em' }));
}
function card(parent, { x, y, w, h, radius = 30, bgc = C.white, border = true }) {
  return el('div', { style: abs({ left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', background: bgc, borderRadius: radius + 'px',
    border: border ? `2px solid ${C.line}` : 'none', overflow: 'hidden', transformOrigin: '50% 60%' }) }, parent);
}
const check = (parent, { x, y, size = 40 }) => {
  const box = el('div', { style: abs({ left: x + 'px', top: y + 'px', width: size + 'px', height: size + 'px', borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }) }, parent);
  const svg = el('svg', { width: String(size * 0.6), height: String(size * 0.6), viewBox: '0 0 24 24' }, box);
  const p = el('path', { d: 'M4 12.5 L9.5 18 L20 6.5', fill: 'none', stroke: '#fff', 'stroke-width': '3.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  return { box, p };
};
function checkAt(ch, t, t0) { const s = sp(t, t0, { dur: 0.4, bounce: 0.45 }); ch.box.style.transform = `scale(${s.toFixed(4)})`; ch.box.style.opacity = t >= t0 ? '1' : '0'; lineDraw(ch.p, ein(ramp(t, t0 + 0.05, t0 + 0.3))); }

export default {
  duration: 20, fps: FPS,
  init(root) {
    stage = root;
    bg = el('div', { style: abs({ inset: '0', background: C.white, zIndex: '0' }) }, stage);
    svgDefs = el('svg', { width: '0', height: '0', style: abs({}) }, stage);
    const filt = el('filter', { id: 'hblur', x: '-20%', y: '-5%', width: '140%', height: '110%' }, el('defs', {}, svgDefs));
    hblur = el('feGaussianBlur', { stdDeviation: '0 0' }, filt);

    // ---- 1 HOOK ----
    S.hook = scene();
    S.hookLabel = label(S.hook, '// لأصحاب المشاريع', { top: 400 });
    S.h1 = rich(S.hook, [['عندك', 'h'], ['فكرة', 'h'], ['حلوة', 'h']], { top: '455px', right: W - SAFE_R + 'px' }, 118);
    S.h2 = rich(S.hook, [['عايزها', 'h'], ['تتشاف؟', 'a', { fontSize: '178px' }]], { top: '614px', right: W - SAFE_R + 'px' }, 118);
    S.hookU = underline(S.hook);

    // ---- 2 SERVICES ----
    S.serv = scene();
    S.servLabel = label(S.serv, '// خدماتنا', { top: 400, color: 'rgba(255,255,255,0.75)' });
    S.servTitle = rich(S.serv, [['كل', 'h'], ['اللي', 'h'], ['محتاجه', 'h']], { top: '445px', right: W - SAFE_R + 'px', color: C.white }, 92);
    const CW = 292, CH = 500, CY = 640;
    S.cards = [
      { t: 'إعلانات', tag: 'ريلز · فيسبوك · يوتيوب', obj: 1 },
      { t: 'موشن جرافيك', tag: 'شخصيات · حركة · خط', obj: 2 },
      { t: 'فيديو منتجك', tag: 'منتجك هو البطل', obj: 3 },
    ].map((d, i) => {
      const x = SAFE_R - CW - i * (CW + 37);
      const c = card(S.serv, { x, y: CY, w: CW, h: CH, radius: 28, border: false });
      el('div', { text: `// ${ARD(i + 1).padStart(2, '٠')}`, style: abs({ top: '22px', right: '24px', fontFamily: F.label, fontSize: '24px', color: C.grey, direction: 'rtl' }) }, c);
      const objBox = el('div', { style: abs({ left: '16px', top: '66px', width: '260px', height: '260px' }) }, c);
      const m = mascotLayer(objBox, { w: 260, h: 260, cell: 4, z: 1 });
      const title = wline(c, d.t, abs({ right: '24px', top: '348px', direction: 'rtl', fontFamily: F.head, fontWeight: 700, color: C.ink, fontSize: '50px' }));
      const tag = wline(c, d.tag, abs({ right: '24px', top: '430px', direction: 'rtl', fontFamily: F.label, fontWeight: 500, color: C.grey, fontSize: '24px' }));
      return { ...d, c, m, title, tag };
    });

    // ---- 3 RESULT ----
    S.res = scene(); S.res.style.transformOrigin = '1015px 380px';
    S.r0 = rich(S.res, [['بيكسل', 'm'], ['بلس', 'm'], ['بتحوّلها', 'm'], ['لـ', 'm']], { top: '385px', right: W - SAFE_R + 'px', color: C.dim }, 54);
    S.r1 = rich(S.res, [['إعلان', 'h']], { top: '455px', right: W - SAFE_R + 'px' }, 140);
    S.r2 = rich(S.res, [['يتشاف', 'h'], ['ويتفتكر.', 'a', { fontSize: '150px' }]], { top: '630px', right: W - SAFE_R + 'px' }, 128);
    S.resU = underline(S.res);
    S.phone = el('div', { style: abs({ left: '92px', top: '905px', width: '372px', height: '760px', borderRadius: '58px', background: C.ink, padding: '14px', transformOrigin: '50% 80%' }) }, S.res);
    S.screen = el('div', { style: { position: 'relative', width: '100%', height: '100%', borderRadius: '46px', background: C.blue, overflow: 'hidden' } }, S.phone);
    el('div', { style: abs({ left: '50%', top: '16px', width: '108px', height: '30px', marginLeft: '-54px', borderRadius: '15px', background: C.ink, zIndex: '5' }) }, S.screen);
    S.phoneM = mascotLayer(S.screen, { w: 344, h: 732, cell: 4, z: 1 });
    S.phoneText = el('div', { text: 'عندك فكرة حلوة؟', style: abs({ top: '96px', right: '26px', direction: 'rtl', fontFamily: F.head, fontWeight: 800, fontSize: '33px', color: C.white, zIndex: '3', whiteSpace: 'nowrap' }) }, S.screen);
    S.bar = el('div', { style: abs({ left: '26px', right: '26px', bottom: '34px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.35)', zIndex: '3' }) }, S.screen);
    S.barFill = el('div', { style: { height: '100%', width: '0%', borderRadius: '3px', background: C.white } }, S.bar);
    S.heart = el('svg', { width: '64', height: '64', viewBox: '0 0 24 24', style: abs({ right: '26px', bottom: '96px', zIndex: '4', overflow: 'visible' }) }, S.screen);
    S.heartP = el('path', { d: 'M12 20.5 C 5 15.5 2.5 12.5 2.5 8.8 C 2.5 6 4.6 4 7.2 4 C 9.2 4 10.9 5.1 12 6.8 C 13.1 5.1 14.8 4 16.8 4 C 19.4 4 21.5 6 21.5 8.8 C 21.5 12.5 19 15.5 12 20.5 Z', fill: 'none', stroke: C.white, 'stroke-width': '2' }, S.heart);
    S.ring = el('div', { style: abs({ zIndex: '4', borderRadius: '50%', border: `3px solid ${C.white}`, opacity: '0' }) }, S.screen);

    // ---- 4 WHIP + CLICK ----
    S.whip = scene(30);
    S.whipBg = el('div', { style: abs({ inset: '0', background: C.ink }) }, S.whip);
    S.whipWords = ['فكرة.', 'صورة.', 'صوت.'].map(w => el('div', { class: 'line', text: w, style: abs({ left: '0', width: W + 'px', top: '600px', textAlign: 'center', direction: 'rtl', fontFamily: F.head, fontWeight: 800, fontSize: '250px', color: C.white, lineHeight: '1.2', willChange: 'transform' }) }, S.whip));
    S.pill = el('div', { style: abs({ left: '50%', top: '760px', width: '360px', height: '150px', marginLeft: '-180px', borderRadius: '75px', background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }) }, S.whip);
    S.grow = el('div', { style: abs({ borderRadius: '50%', background: C.light, zIndex: '3', visibility: 'hidden' }) }, S.whip);
    S.pillT = el('div', { class: 'line', text: 'ابدأ', style: { fontFamily: F.head, fontWeight: 700, fontSize: '70px', color: C.white, direction: 'rtl' } }, S.pill);
    S.cursor = el('svg', { width: '90', height: '110', viewBox: '0 0 18 22', style: abs({ zIndex: '40', left: '0', top: '0', overflow: 'visible' }) }, stage);
    el('path', { d: 'M1 1 L1 18 L5.4 13.8 L8.4 20.6 L11.4 19.3 L8.5 12.6 L14.6 12.4 Z', fill: C.ink, stroke: C.white, 'stroke-width': '1.4', 'stroke-linejoin': 'round' }, S.cursor);
    S.click = el('div', { style: abs({ zIndex: '39', borderRadius: '50%', border: `4px solid ${C.blue}`, opacity: '0' }) }, stage);

    // ---- 5 BOARD ----
    S.board = scene();
    const GX = [552, 65], GY = [372, 668, 964], BW = 463, BH = 272;
    const box = (col, row) => card(S.board, { x: GX[col], y: GY[row], w: BW, h: BH, radius: 26 });
    const head = (c, text) => wline(c, text, abs({ top: '20px', right: '24px', direction: 'rtl', fontFamily: F.label, fontWeight: 500, fontSize: '25px', color: C.grey }));
    S.bA = box(0, 0); head(S.bA, '// السيناريو');
    S.script = ['١ — الفكرة في جملة', '٢ — المشاهد والإيقاع', '٣ — الكلام والخط'].map((s, i) => wline(S.bA, s, abs({ right: '24px', top: 78 + i * 58 + 'px', direction: 'rtl', fontFamily: F.head, fontWeight: 500, fontSize: '33px', color: C.ink })));
    S.chA = check(S.bA, { x: 22, y: 18, size: 42 });
    S.bB = box(1, 0); head(S.bB, '// على الهوا');
    S.boardM = mascotLayer(S.bB, { w: BW, h: BH, cell: 4, z: 0 });
    S.liveDot = el('div', { style: abs({ left: '28px', top: '28px', width: '18px', height: '18px', borderRadius: '50%', background: C.blue, zIndex: '2' }) }, S.bB);
    S.bC = box(0, 1); head(S.bC, '// الإيقاع');
    S.bpm = el('div', { class: 'line', text: '١٢٠', style: abs({ right: '24px', top: '62px', direction: 'rtl', fontFamily: F.head, fontWeight: 800, fontSize: '118px', color: C.ink, lineHeight: '1.1' }) }, S.bC);
    el('div', { text: 'نبضة في الدقيقة', style: abs({ right: '228px', top: '118px', direction: 'rtl', fontFamily: F.label, fontWeight: 500, fontSize: '27px', color: C.grey, whiteSpace: 'nowrap' }) }, S.bC);
    S.beatLine = el('div', { style: abs({ left: '36px', right: '36px', top: '222px', height: '3px', background: C.line }) }, S.bC);
    S.beats = Array.from({ length: 8 }, (_, i) => el('div', { style: abs({ top: '212px', left: 36 + i * ((BW - 72 - 22) / 7) + 'px', width: '22px', height: '22px', borderRadius: '50%', background: C.blue }) }, S.bC));
    S.bD = box(1, 1); head(S.bD, '// الحركة والصوت');
    S.wave = Array.from({ length: 26 }, (_, i) => el('div', { style: abs({ left: 30 + i * 15.8 + 'px', width: '9px', borderRadius: '5px', background: C.ink }) }, S.bD));
    S.chD = check(S.bD, { x: 22, y: 18, size: 42 });
    S.bE = box(0, 2); head(S.bE, '// المقاسات');
    S.chips = ['٩:١٦', '١:١', '١٦:٩'].map((s, i) => {
      const c = el('div', { style: abs({ right: 24 + i * 142 + 'px', top: '100px', width: '128px', height: '74px', borderRadius: '37px', border: `2px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.head, fontWeight: 700, fontSize: '32px', direction: 'ltr' }) }, S.bE);
      el('span', { class: 'line', text: s, style: { position: 'relative' } }, c); return c;
    });
    S.ratioNote = wline(S.bE, 'نفس الإعلان لكل مكان', abs({ right: '24px', top: '200px', direction: 'rtl', fontFamily: F.label, fontWeight: 500, fontSize: '26px', color: C.grey }));
    S.bF = box(1, 2); head(S.bF, '// التسليم');
    S.ready = wline(S.bF, 'جاهز للنشر', abs({ right: '24px', top: '66px', direction: 'rtl', fontFamily: F.head, fontWeight: 700, fontSize: '50px', color: C.ink }));
    S.pctT = el('div', { class: 'line', text: '٪٠', style: abs({ left: '30px', top: '150px', fontFamily: F.head, fontWeight: 800, fontSize: '58px', color: C.blue, direction: 'rtl', fontVariantNumeric: 'tabular-nums' }) }, S.bF);
    S.prog = el('div', { style: abs({ left: '30px', right: '30px', top: '228px', height: '12px', borderRadius: '6px', background: C.light }) }, S.bF);
    S.progF = el('div', { style: { height: '100%', width: '0%', borderRadius: '6px', background: C.blue, marginLeft: 'auto' } }, S.prog);
    S.chF = check(S.bF, { x: 22, y: 18, size: 42 });
    S.boardCards = [S.bA, S.bB, S.bC, S.bD, S.bE, S.bF];
    // stamp
    S.stamp = el('div', { style: abs({ left: '0', top: '0', width: W + 'px', height: H + 'px', zIndex: '20', pointerEvents: 'none' }) }, S.board);
    S.circle = el('svg', { width: String(W), height: String(H), style: abs({ left: '0', top: '0' }) }, S.stamp);
    S.circleP = el('path', { d: `M ${540 + 470} 820 A 470 470 0 1 1 ${540 + 470 - 0.01} 819.9`, fill: 'none', stroke: C.blue, 'stroke-width': '3' }, S.circle);
    S.stampTag = el('div', { style: abs({ left: '540px', top: '820px', transform: 'translate(-50%,-50%)', padding: '8px 64px 26px', borderRadius: '40px', border: `7px solid ${C.blue}`, background: 'rgba(255,255,255,0.94)', whiteSpace: 'nowrap' }) }, S.stamp);
    S.stampT = el('div', { class: 'line', text: 'اتظبط.', style: { fontFamily: F.accent, fontWeight: 700, fontSize: '190px', color: C.blue, direction: 'rtl', lineHeight: '1.15' } }, S.stampTag);

    // ---- 6 DARK ----
    S.dark = scene();
    S.d1 = rich(S.dark, [['إنت', 'h'], ['عليك', 'h'], ['الفكرة.', 'a', { fontSize: '148px', color: C.white }]], { top: '480px', right: W - SAFE_R + 'px', color: C.white }, 112);
    S.d2 = rich(S.dark, [['وإحنا', 'h'], ['علينا', 'h'], ['الباقي.', 'a', { fontSize: '148px', color: C.blueOnDark }]], { top: '668px', right: W - SAFE_R + 'px', color: '#8E8F95' }, 112);
    S.darkU = underline(S.dark, C.blueOnDark);

    // ---- 7 BRAND ----
    S.brand = scene();
    S.mark = el('div', { class: 'line', style: abs({ left: '0', width: W + 'px', top: '790px', textAlign: 'center', direction: 'ltr', whiteSpace: 'nowrap', zIndex: '12', lineHeight: '1' }) }, S.brand);
    S.mark.dataset.text = 'PIXEL Plus';
    const mw = el('span', { class: 'word', style: { display: 'inline-block' } }, S.mark);
    el('span', { text: 'PIXEL', style: { fontFamily: F.head, fontWeight: 800, fontSize: '170px', color: C.ink, letterSpacing: '-0.02em' } }, mw);
    el('span', { text: 'Plus', style: { fontFamily: "'Instrument Serif'", fontStyle: 'italic', fontSize: '188px', color: C.blue, marginLeft: '0.2em' } }, mw);
    S.tag = rich(S.brand, [['وكالة', 'm'], ['إعلانات', 'm'], ['بتخلّي', 'm'], ['فكرتك', 'm'], ['تتشاف.', 'a', { fontSize: '74px' }]], { left: '0', width: W + 'px', top: '1004px', textAlign: 'center', color: C.ink }, 50);
    S.cta = el('div', { style: abs({ left: '0', width: W + 'px', top: '1128px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '28px', direction: 'rtl' }) }, S.brand);
    S.ctaPill = el('div', { style: { background: C.blue, borderRadius: '40px', padding: '10px 40px 16px', transformOrigin: '50% 50%' } }, S.cta);
    wline(S.ctaPill, 'ابدأ مشروعك', { position: 'relative', fontFamily: F.head, fontWeight: 600, fontSize: '42px', color: C.white, direction: 'rtl' });
    S.ctaNote = wline(S.cta, 'ابعتلنا رسالة', { position: 'relative', fontFamily: F.label, fontWeight: 500, fontSize: '36px', color: C.dim, direction: 'rtl' });
    S.resolve = pixelCanvas(S.brand, 13, GW, 22, { top: '768px' });

    // ---- mascot, HUD, transitions ----
    mascot = mascotLayer(stage, { w: W, h: H, cell: 4, z: 8 });
    hud = el('div', { style: abs({ left: '0', top: '0', width: W + 'px', zIndex: '45', pointerEvents: 'none' }) }, stage);
    hudR = el('div', { class: 'line', style: abs({ top: '290px', right: W - SAFE_R + 'px', direction: 'rtl', fontFamily: F.label, fontWeight: 500, fontSize: '25px', whiteSpace: 'nowrap' }) }, hud);
    hudL = el('div', { class: 'line', style: abs({ top: '290px', left: SAFE_L + 'px', direction: 'ltr', fontFamily: F.label, fontWeight: 500, fontSize: '25px', whiteSpace: 'nowrap', letterSpacing: '0.03em' }) }, hud);
    hudL.style.display = 'flex'; hudL.style.gap = '14px';
    el('span', { style: { unicodeBidi: 'isolate', direction: 'ltr', fontVariantNumeric: 'tabular-nums' } }, hudL);
    el('span', { text: '—' }, hudL);
    el('span', { text: 'بيكسل بلس', style: { unicodeBidi: 'isolate', direction: 'rtl' } }, hudL);
    hudL.style.flexDirection = 'row-reverse'; hudL.style.justifyContent = 'flex-end';
    tr = pixelCanvas(stage, 60);
  },

  render(t, frame) {
    const sec = (a, b) => t >= a && t < b;
    // ----- backgrounds and scene visibility -----
    const bgCol = t < 3.0 ? C.white : t < 5.92 ? C.blue : t < 9 ? C.white : t < 10.02 ? C.white : t < 13.0 ? C.light : t < 16.0 ? C.ink : C.white;
    bg.style.background = bgCol;
    for (const [k, a, b] of [['hook', 0, 3.05], ['serv', 3.0, 6.2], ['res', 5.7, 9.0], ['board', 9.95, 13.05], ['dark', 12.95, 16.0], ['brand', 16.0, 20.1]]) setVis(S[k], sec(a, b));
    setVis(S.whip, sec(9, 10.04));
    hblur.setAttribute('stdDeviation', '0 0');

    // ----- 1 HOOK (0–3) -----
    if (sec(0, 3.05)) {
      S.hookLabel.firstChild.style.opacity = '1';
      lineIn(S.h1, t, -0.45, 0.14);
      wordIn(S.h2.words[0], t, 1.0);
      wordIn(S.h2.words[1], t, 1.32, { dur: 0.5 });
      placeUnder(S.hookU, S.h2.words[1]);
      lineDraw(S.hookU.path, ein(ramp(t, 1.62, 2.0)));
    }

    // ----- 2 SERVICES (3–6), push out 5.7–6.15 -----
    const push = ease.inOutCubic(ramp(t, 5.7, 6.15));
    const pushV = Math.sin(Math.PI * push); // 0 → 1 → 0 : speed proxy for blur
    if (pushV > 0.02) hblur.setAttribute('stdDeviation', `${(70 * pushV).toFixed(1)} 0`);
    if (sec(3.0, 6.2)) {
      S.serv.style.transform = push > 0 ? `translateX(${(push * W).toFixed(1)}px)` : 'none';
      S.serv.style.filter = pushV > 0.02 ? 'url(#hblur)' : 'none';
      S.servLabel.firstChild.style.opacity = (ramp(t, 3.2, 3.5) * (1 - ramp(t, 5.66, 5.76))).toFixed(3);
      lineIn(S.servTitle, t, 3.2, 0.1, { tOut: 5.66, outDur: 0.1 });
      S.cards.forEach((c, i) => {
        const t0 = 3.55 + i * 0.25;
        const pl = tiltSettle(t, { start: t0, duration: 0.7, bounce: 0.25, from: { y: 260, rx: -28, rz: i === 1 ? 0 : (i ? -5 : 5), scale: 0.9 }, to: {} });
        const dr = planeDrift(t, { rx: 0.8, ry: 1.2, rz: 0.3, period: 5, phase: i * 1.7 });
        c.c.style.transform = planeTransform({ ...pl, rx: pl.rx + dr.rx * ramp(t, t0 + 0.6, t0 + 1.2), ry: dr.ry * ramp(t, t0 + 0.6, t0 + 1.2), perspective: 1200 });
        c.c.style.opacity = ramp(t, t0, t0 + 0.15).toFixed(3);
        if (!c.fitted) { const s = fitFontSize(c.t, { family: 'Alexandria', weight: 700, maxWidth: 244, max: 50 }); c.title.style.fontSize = s + 'px'; c.fitted = true; }
        const on = t >= t0 - 0.05;
        for (const w of c.c.querySelectorAll('.word')) w.style.opacity = (ramp(t, t0 + 0.25, t0 + 0.4) * (1 - ramp(t, 5.66, 5.76))).toFixed(3);
        c.m.render(t, { x: 0.5, y: 0.5, size: 0.33, scene: c.obj, spin: [0.55, 0.35, -0.5][i] + 2.2 * (1 - ein(ramp(t, t0, t0 + 1.0))) + 0.05 * Math.sin(t * 1.3 + i), gamma: 0.95 }, { visible: on });
      });
    } else S.cards.forEach(c => c.m.render(t, {}, { visible: false }));

    // ----- 3 RESULT (6–9) -----
    if (sec(5.7, 9.0)) {
      const inP = 1 - push; // arrives from the left during the push
      const z = lerp(1, 1.035, ease.inOutSine(ramp(t, 6.15, 9.0)));
      S.res.style.transform = `translateX(${(-inP * W).toFixed(1)}px) scale(${z.toFixed(4)})`;
      S.res.style.filter = pushV > 0.02 ? 'url(#hblur)' : 'none';
      lineIn(S.r0, t, 6.2, 0.07, { dur: 0.45 });
      lineIn(S.r1, t, 6.55, 0.1);
      wordIn(S.r2.words[0], t, 7.0);
      wordIn(S.r2.words[1], t, 7.35, { dur: 0.55 });
      placeUnder(S.resU, S.r2.words[1]);
      lineDraw(S.resU.path, ein(ramp(t, 7.7, 8.05)));
      const pl = tiltSettle(t, { start: 6.3, duration: 0.85, bounce: 0.18, from: { y: 700, rx: 32, rz: -9, scale: 0.92 }, to: { rz: -3, ry: 8 } });
      const dr = planeDrift(t, { rx: 1, ry: 1.5, rz: 0.4, period: 6 });
      S.phone.style.transform = planeTransform({ ...pl, rx: pl.rx + dr.rx, ry: pl.ry + dr.ry, rz: pl.rz + dr.rz, perspective: 1600 });
      const pt = t - 6.3;
      S.phoneM.render(t, { x: 0.5, y: 0.30, size: 0.135, smile: 0.8 + 0.2 * Math.sin(pt * 3), yaw: 0.25 * Math.sin(pt * 2.2), roll: 0.05 * Math.sin(pt * 2.2 + 1), blink: t > 7.6 && t < 7.72 ? 1 : 0, open: t > 8.0 && t < 8.5 ? 0.5 : 0 }, { visible: t > 6.25 });
      S.phoneText.style.opacity = ramp(t, 6.7, 6.9).toFixed(3);
      S.barFill.style.width = (100 * ramp(t, 6.6, 9.4)).toFixed(2) + '%';
      const hp = sp(t, 8.0, { dur: 0.45, bounce: 0.5 });
      S.heartP.setAttribute('fill', t >= 8.0 ? C.white : 'none');
      S.heart.style.transform = `scale(${(t >= 8.0 ? lerp(0.6, 1, hp) : 1).toFixed(4)})`;
      const rg = pulseRing(t, { start: 8.0, dur: 0.7, r0: 20, r1: 90, width: 4 });
      Object.assign(S.ring.style, { right: 58 - rg.r + 'px', bottom: 128 - rg.r + 'px', width: rg.r * 2 + 'px', height: rg.r * 2 + 'px', opacity: rg.opacity.toFixed(3) });
    } else S.phoneM.render(t, {}, { visible: false });

    // ----- 4 WHIP (9–9.75) + CLICK (9.75–10.05) -----
    let cursorOn = false;
    if (sec(9, 10.04)) {
      const wt = [9.0, 9.25, 9.5];
      S.whipBg.style.background = t < 9.75 ? C.ink : C.white;
      S.whipBg.style.opacity = '1';
      let blurPx = 0;
      S.whipWords.forEach((w, i) => {
        const a = wt[i], u = ramp(t, a, a + 0.25), on = t >= a && t < a + 0.25;
        w.style.visibility = on ? 'visible' : 'hidden';
        if (!on) return;
        const xin = (1 - ease.outCubic(ramp(t, a, a + 0.07))) * -760, xout = ease.inCubic(ramp(t, a + 0.18, a + 0.25)) * 760;
        w.style.transform = `translateX(${(xin + xout).toFixed(1)}px) scale(${lerp(1.08, 1, ease.outCubic(ramp(t, a, a + 0.12))).toFixed(4)})`;
        blurPx = Math.max(blurPx, 60 * (1 - ramp(t, a, a + 0.07)), 60 * ramp(t, a + 0.18, a + 0.25));
      });
      hblur.setAttribute('stdDeviation', `${blurPx.toFixed(1)} 0`);
      S.whipWords.forEach(w => { w.style.filter = blurPx > 0.5 ? 'url(#hblur)' : 'none'; });
      // pill + cursor click
      const pOn = t >= 9.75;
      S.pill.style.visibility = pOn ? 'visible' : 'hidden';
      if (pOn) {
        const pop = sp(t, 9.75, { dur: 0.3, bounce: 0.4, from: 0.6 });
        const press = 1 - 0.08 * Math.sin(Math.PI * ramp(t, 9.84, 9.92));
        S.pill.style.transform = `scale(${(pop * press).toFixed(4)})`;
        // the click opens ONE light circle (the board's colour) from the button; the cut happens under full cover
        const gr = ease.inOutCubic(ramp(t, 9.88, 10.03)) * cover(540, 835);
        Object.assign(S.grow.style, { left: 540 - gr + 'px', top: 835 - gr + 'px', width: 2 * gr + 'px', height: 2 * gr + 'px', visibility: gr > 1 ? 'visible' : 'hidden' });
        cursorOn = t < 9.98;
        const cx = lerp(980, 560, ease.outCubic(ramp(t, 9.75, 9.84))), cy = lerp(1200, 860, ease.outCubic(ramp(t, 9.75, 9.84)));
        const cs = 1 - 0.15 * Math.sin(Math.PI * ramp(t, 9.84, 9.92));
        S.cursor.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) scale(${cs.toFixed(3)})`;
        const rg = pulseRing(t, { start: 9.86, dur: 0.3, r0: 16, r1: 110 });
        Object.assign(S.click.style, { left: 562 - rg.r + 'px', top: 862 - rg.r + 'px', width: 2 * rg.r + 'px', height: 2 * rg.r + 'px', opacity: rg.opacity.toFixed(3) });
      }
    }

    // ----- 5 BOARD (10–13) -----
    if (sec(9.95, 13.05)) {
      const zb = lerp(1, 1.035, ease.inOutSine(ramp(t, 10.0, 12.0))) * (1 + 0.012 * Math.sin(Math.PI * ramp(t, 12.0, 12.18)));
      S.board.style.transform = `scale(${zb.toFixed(4)})`;
      const order = [0, 1, 2, 3, 4, 5];
      S.boardCards.forEach((c, i) => {
        const t0 = 10.0 + order[i] * 0.09;
        const pl = tiltSettle(t, { start: t0, duration: 0.6, bounce: 0.25, from: { y: 120, rx: -22, scale: 0.94 }, to: {} });
        c.style.transform = planeTransform({ ...pl, perspective: 1200 });
        c.style.opacity = ramp(t, t0, t0 + 0.12).toFixed(3);
        for (const w of c.querySelectorAll('.word')) w.style.opacity = ramp(t, t0 + 0.22, t0 + 0.36).toFixed(3);
      });
      S.script.forEach((s, i) => { const a = 10.2 + i * 0.13; s.style.opacity = ramp(t, a, a + 0.12).toFixed(3); s.style.transform = `translateX(${(-(1 - ein(ramp(t, a, a + 0.35))) * 30).toFixed(1)}px)`; });
      checkAt(S.chA, t, 10.55);
      S.boardM.render(t, { x: 0.5, y: -0.12, size: 0.40, smile: 0.9, yaw: 0.18 * Math.sin((t - 10) * Math.PI), pitch: 0.06 * Math.sin((t - 10) * 2 * Math.PI), wink: t > 11.6 && t < 11.95 ? 1 : 0 }, { visible: true });
      S.liveDot.style.opacity = (0.35 + 0.65 * (Math.floor(t * 2) % 2 ? 0.4 : 1)).toFixed(3);
      S.beats.forEach((b, i) => { const lit = t >= 10.25 + i * 0.25; b.style.transform = `scale(${lit ? sp(t, 10.25 + i * 0.25, { dur: 0.3, bounce: 0.5, from: 0.3 }).toFixed(3) : 0.3})`; b.style.opacity = lit ? '1' : '0.25'; });
      S.wave.forEach((b, i) => { const a = 0.25 + 0.75 * Math.abs(noise1(i * 0.7 + t * 6, 4)) * (0.6 + 0.4 * Math.sin(i * 0.5 + t * 9)); const hgt = 14 + 120 * clamp(a) * ramp(t, 10.2, 10.6); b.style.height = hgt.toFixed(1) + 'px'; b.style.top = (160 - hgt / 2).toFixed(1) + 'px'; });
      checkAt(S.chD, t, 11.1);
      S.chips.forEach((c, i) => { const a = 10.75 + i * 0.25, on = t >= a; c.style.background = on ? C.ink : 'transparent'; c.style.color = on ? C.white : C.ink; c.style.transform = `scale(${on ? sp(t, a, { dur: 0.3, bounce: 0.5, from: 0.85 }).toFixed(3) : 1})`; });
      const pr = ease.inOutCubic(ramp(t, 10.5, 11.75));
      S.progF.style.width = (pr * 100).toFixed(2) + '%';
      S.pctT.textContent = '٪' + ARD(Math.round(pr * 100));
      checkAt(S.chF, t, 11.8);
      // stamp
      const st = sp(t, 12.0, { dur: 0.45, bounce: 0.38, from: 1.7, to: 1 });
      S.stampTag.style.opacity = ramp(t, 12.0, 12.05).toFixed(3);
      S.stampTag.style.transform = `translate(-50%,-50%) rotate(-6deg) scale(${st.toFixed(4)})`;
      lineDraw(S.circleP, ein(ramp(t, 11.82, 12.35)));
    }

    // ----- 6 DARK (13–16) -----
    if (sec(12.95, 16.05)) {
      lineIn(S.d1, t, 13.25, 0.1);
      wordIn(S.d2.words[0], t, 13.9); wordIn(S.d2.words[1], t, 14.02);
      wordIn(S.d2.words[2], t, 14.18, { dur: 0.42 });
      placeUnder(S.darkU, S.d2.words[2]);
      lineDraw(S.darkU.path, ein(ramp(t, 14.5, 14.85)));
    }

    // ----- 7 BRAND (16–20) -----
    if (sec(15.95, 20.1)) {
      // wordmark resolves out of pixels: white cells dissolve in Bayer order
      const rp = ramp(t, 16.12, 16.6), P = S.resolve, d = P.img.data;
      for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { const i = (y * P.w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = bayer(x, y) >= rp ? 255 : 0; }
      P.g.putImageData(P.img, 0, 0); P.c.style.visibility = rp < 1 ? 'visible' : 'hidden';
      lineIn(S.tag, t, 16.85, 0.08, { dur: 0.5 });
      const cp = sp(t, 17.45, { dur: 0.45, bounce: 0.45 }) * (1 - 0.06 * Math.sin(Math.PI * ramp(t, 18.42, 18.55)));
      S.ctaPill.style.transform = `scale(${cp.toFixed(4)})`; S.ctaPill.style.opacity = ramp(t, 17.45, 17.5).toFixed(3);
      S.ctaNote.style.opacity = ramp(t, 17.7, 17.95).toFixed(3);
      if (t >= 18.05 && t < 18.85) {
        cursorOn = true;
        const u = ease.outCubic(ramp(t, 18.05, 18.4)), fade = 1 - ramp(t, 18.65, 18.85);
        const cx = lerp(1000, 660, u), cy = lerp(1480, 1172, u), cs = 1 - 0.15 * Math.sin(Math.PI * ramp(t, 18.42, 18.55));
        S.cursor.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) scale(${cs.toFixed(3)})`;
        S.cursor.style.opacity = fade.toFixed(3);
        const rg = pulseRing(t, { start: 18.45, dur: 0.4, r0: 14, r1: 120 });
        Object.assign(S.click.style, { left: 662 - rg.r + 'px', top: 1174 - rg.r + 'px', width: 2 * rg.r + 'px', height: 2 * rg.r + 'px', opacity: rg.opacity.toFixed(3) });
      }
    }
    S.cursor.style.visibility = cursorOn ? 'visible' : 'hidden';
    if (!cursorOn) S.click.style.opacity = '0';
    if (t < 18.05) S.cursor.style.opacity = '1';

    // ----- mascot (one shared canvas, re-staged per scene) -----
    this.mascotAt(t, push);

    // ----- HUD -----
    const sceneN = t < 3 ? ['٠١', 'البداية'] : t < 6 ? ['٠٢', 'خدماتنا'] : t < 9 ? ['٠٣', 'النتيجة'] : t < 10 ? null : t < 13 ? ['٠٤', 'الشغل'] : t < 16 ? ['٠٥', 'الفكرة'] : ['٠٦', 'بيكسل بلس'];
    const onDark = (t >= 3 && t < 5.92) || (t >= 13 && t < 16);
    hud.style.visibility = sceneN ? 'visible' : 'hidden';
    if (sceneN) {
      hudR.textContent = `// ${sceneN[0]} — ${sceneN[1]}`;
      const f = frame ?? Math.round(t * FPS), ss = Math.floor(f / FPS), ff = f % FPS;
      hudL.firstChild.textContent = ARD(`00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`);
      const col = onDark ? 'rgba(255,255,255,0.62)' : 'rgba(11,11,12,0.45)';
      hudR.style.color = col; hudL.style.color = col;
      hud.style.opacity = '1';
    }

    // ----- transitions on the pixel canvas -----
    tr.c.style.visibility = 'hidden';
    if (sec(2.62, 3.08)) { // blue dot from the question mark of «تتشاف؟»
      const r = layoutRect(S.h2.words[1]);
      const cx = r.left + 26, cy = r.top + r.height * 0.62;
      const pop = sp(t, 2.62, { dur: 0.25, bounce: 0.5, from: 0, to: 22 });
      const grow = ease.inCubic(ramp(t, 2.74, 3.04));
      tr.c.style.visibility = 'visible';
      pixelCircle(tr, { cx, cy, r: pop + grow * cover(cx, cy), band: 0.12, hex: C.blue });
    }
    if (sec(12.7, 13.12)) { // black pixel iris from the stamp
      const g = ease.inCubic(ramp(t, 12.7, 13.08));
      tr.c.style.visibility = 'visible';
      pixelCircle(tr, { cx: 540, cy: 820, r: g * cover(540, 820) * 1.15, band: 0.35, hex: C.ink });
    }
    if (sec(15.62, 16.0)) { // white pixel bloom from «الباقي.»
      const r = layoutRect(S.d2.words[2]);
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      const g = ease.inCubic(ramp(t, 15.62, 15.97));
      tr.c.style.visibility = 'visible';
      pixelCircle(tr, { cx, cy, r: 40 + g * cover(cx, cy) * 1.2, band: 0.45, hex: C.white });
    }
  },

  // Mascot staging per scene. Pose y is canvas uv (0 bottom, 1 top); size = head radius / H.
  mascotAt(t, push) {
    const at = (xPx, headYPx, rPx) => ({ x: xPx / W, y: 1 - (headYPx + 1.03 * rPx) / H, size: rPx / H });
    let pose = null, z = 8, clip = 'none';
    const blink = (...times) => (times.some(b => t > b && t < b + 0.12) ? 1 : 0);
    if (t < 2.75) { // hook: pops up bottom-left, looks up at the headline, delighted when the accent lands
      const rise = sp(t, 0, { dur: 0.6, bounce: 0.4, from: 0.82 });
      const delight = ein(ramp(t, 1.45, 1.75));
      pose = { ...at(330, lerp(2400, 1250, rise), 225), yaw: lerp(0.05, 0.32, ein(ramp(t, 0.5, 0.9))) - 0.1 * delight, pitch: lerp(-0.1, 0.16, ein(ramp(t, 0.5, 0.9))) - 0.12 * delight,
        roll: 0.06 * Math.sin(t * 2.4) + 0.08 * (1 - rise), look: [lerp(0, 0.7, ein(ramp(t, 0.5, 0.9))) * (1 - delight), 0.5 * (1 - delight)],
        smile: lerp(0.55, 1, delight), open: 0.55 * delight * (1 - ramp(t, 2.2, 2.5)), brow: 0.8 * delight * (1 - ramp(t, 2.3, 2.6)), blink: blink(0.95, 2.45) };
    } else if (t >= 3.05 && t < 5.92) { // services: peeks in from the left corner, watches the cards arrive
      const inn = sp(t, 3.15, { dur: 0.7, bounce: 0.3 });
      const ox = push * W;
      const look = t < 3.6 ? 0.8 : t < 3.85 ? 0.45 : t < 4.6 ? 0.1 : -0.2;
      pose = { ...at(lerp(-260, 215, inn) + ox, 1380, 205), yaw: lerp(0.5, 0.4, ein(ramp(t, 3.5, 4.4))) - (t > 4.7 ? 0.35 * ein(ramp(t, 4.7, 5.1)) : 0), pitch: 0.2 - 0.18 * ein(ramp(t, 4.7, 5.1)),
        roll: -0.1 + 0.08 * inn, look: [look, 0.6 * (1 - ein(ramp(t, 4.7, 5.1)))], smile: t > 4.7 ? 1 : 0.7, open: t > 4.75 && t < 5.4 ? 0.45 : 0, wink: t > 5.15 && t < 5.5 ? 1 : 0,
        blink: blink(4.05) };
    } else if (t >= 5.92 && t < 9.0) { // result: bottom-right, arrives with the push, looks at the phone, then at us
      const ox = -(1 - push) * W;
      const turn = ein(ramp(t, 8.05, 8.4));
      pose = { ...at(840 + ox, 1440, 135), yaw: lerp(-0.42, 0, turn), pitch: lerp(-0.05, 0.05, turn), roll: 0.05 * Math.sin(t * 2), look: [lerp(-0.8, 0, turn), lerp(-0.3, 0, turn)],
        smile: lerp(0.7, 1, turn), wink: t > 8.45 && t < 8.85 ? 1 : 0, blink: blink(7.1) };
    } else if (t >= 12.95 && t < 16.05) { // dark: bottom-left, white on black, winks when «الباقي.» lands
      const rise = sp(t, 13.15, { dur: 0.7, bounce: 0.3 });
      const turn = ein(ramp(t, 14.45, 14.8));
      pose = { ...at(300, lerp(2300, 1345, rise), 215), yaw: lerp(0.34, 0.04, turn), pitch: lerp(0.15, 0.02, turn), roll: 0.04 * Math.sin(t * 2.2),
        look: [lerp(0.7, 0, turn), lerp(0.5, 0, turn)], smile: lerp(0.6, 1, turn), wink: t > 14.75 && t < 15.25 ? 1 : 0, blink: blink(13.9) };
    } else if (t >= 16.05) { // brand: rises behind the wordmark (clipped at the logo) and greets
      const rise = sp(t, 16.45, { dur: 0.8, bounce: 0.28 });
      pose = { ...at(540, lerp(1100, 545, rise), 185), yaw: 0.22 * Math.sin((t - 16.5) * 1.6) * (1 - ramp(t, 18.0, 18.4)), pitch: 0.05, roll: 0.05 * Math.sin((t - 16.5) * 2.1) * (1 - ramp(t, 18.0, 18.4)),
        smile: 0.85 + 0.15 * ramp(t, 18.1, 18.3), wink: t > 18.15 && t < 18.6 ? 1 : 0, open: t > 17.0 && t < 17.4 ? 0.35 : 0, blink: blink(17.7, 19.3), look: [0, 0] };
      clip = 'inset(0 0 1130px 0)'; z = 9;
    }
    mascot.canvas.style.zIndex = String(z);
    mascot.canvas.style.clipPath = clip;
    if (pose) {
      mascot.canvas.style.filter = push > 0 && push < 1 ? 'url(#hblur)' : 'none';
      if (push > 0 && push < 1) hblur.setAttribute('stdDeviation', `${(70 * Math.sin(Math.PI * push)).toFixed(1)} 0`);
      mascot.render(t, pose);
    } else mascot.render(t, {}, { visible: false });
  },
};
