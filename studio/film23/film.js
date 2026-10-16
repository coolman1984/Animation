// Film 23 — «أكاديمية أساسيات الذكاء الاصطناعي» — 30 s motion-graphics showreel-ad, 1920×1080 @ 30 fps, 120 BPM.
// House method (QUALITY_PLAYBOOK): ONE hero — a page of the book. It wakes on a click, its lines fly out and become the academy's
// six units, the page itself becomes the app window, and that one window morphs through every chapter (levels, the governing
// equation, the Excel lab, the prompt library in dark mode, the quiz). It finally breaks into the book's 41 pages, which fly into
// the academy's logo on the drop. The brand's own motifs carry the film: circuit lines with dots, the grey app window, pill buttons,
// square letter badges, Inter + IBM Plex Sans Arabic. Every frame is a closed-form function of t (springs by damping ratio).
import { clamp, lerp, ramp, ease, el, textLine, grain } from '../lib/motion.js';
import { T, HITS, LINES, tb } from './timing.js';
import { zspring, winRect, cursor, CLICKS, WIN, PAGE, COPY } from './motion.js';

const L = { bg: '#ffffff', ink: '#111114', ink2: '#4a4b53', ink3: '#85868f', line: '#ebebef', line2: '#dcdce2', s2: '#f7f7f8', s3: '#efeff2', blue: '#2f5fe6', blueHi: '#4a77f2', blueSoft: '#edf2fe', mint: '#18864f', mintSoft: '#e8f6ee', rose: '#cf3b45', roseSoft: '#fdeeee', violet: '#6a4fe0', violetSoft: '#f1eefd', dot: '#e6e6ec' };
const D = { bg: '#0b0b0d', win: '#131316', s2: '#17171b', s3: '#1f1f24', line: '#26262b', line2: '#33333a', ink: '#ededf0', ink2: '#a8a9b2', ink3: '#757680', blue: '#5b82ff', blueSoft: '#18213d', mint: '#55cf8e', mintSoft: '#11281c', dot: '#1a1a1f' };
const SIG = { green: '#34a466', blue: '#4c79ea', amber: '#e5a03a', violet: '#8b6cf6', pink: '#e2558f', teal: '#18a3a0' };
const UNIT = [{ c: '#7a5cf0', n: 'الأساسيات' }, { c: '#2f5fe6', n: 'من البرومبت إلى النظام' }, { c: '#11908c', n: 'أدوات بايثون' }, { c: '#c47d14', n: 'لوحة المعلومات' }, { c: '#d4427c', n: 'تطبيق الويب المحلي' }, { c: '#2a9a5c', n: 'النماذج والنظام والفريق' }];
const SANS = "'AcSans', 'Segoe UI', sans-serif", MONO = "'AcMono', monospace";
let W = 1920, H = 1080, CAM, GRAIN;
const px = (v) => `${(+v).toFixed(2)}px`;
const oC = ease.outCubic, ioC = ease.inOutCubic, iC = ease.inCubic;
const div = (parent, style = {}, text) => el('div', { text, style: { position: 'absolute', left: '0', top: '0', boxSizing: 'border-box', ...style } }, parent);
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const place = (n, x, y, w, h, r) => { n.style.left = px(x - w / 2); n.style.top = px(y - h / 2); n.style.width = px(Math.max(0, w)); n.style.height = px(Math.max(0, h)); if (r !== undefined) n.style.borderRadius = px(r); };
const svgEl = (parent, attrs, kids = '') => { const s = el('svg', attrs, parent); s.innerHTML = kids; return s; };
function mixHex(a, b, p) { const f = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = f(a), B = f(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(p))).toString(16).padStart(2, '0')).join(''); }
// visibility of a chapter's content: blur in after its morph, blur out before the next
const vin = (t, a, b, din = 0.24, dout = 0.2) => Math.min(oC(ramp(t, a, a + din)), 1 - iC(ramp(t, b, b + dout)));
function show(g, o, b = (1 - o) * 12) {
  if (o <= 0.01) { g.style.display = 'none'; return false; }
  g.style.display = 'block'; g.style.opacity = o.toFixed(3); g.style.filter = b > 0.2 ? `blur(${b.toFixed(2)}px)` : 'none';
  for (const w of g.querySelectorAll('.word')) w.style.opacity = o.toFixed(3);       // the text gate reads a word's own opacity (CRAFT 45)
  return true;
}
// a content group authored for chapter rect R follows the live window rect (overshoot included)
function follow(g, R, r) { g.style.transformOrigin = `${R.x}px ${R.y}px`; g.style.transform = `translate(${(r.x - R.x).toFixed(2)}px, ${(r.y - R.y).toFixed(2)}px) scale(${(r.w / R.w).toFixed(4)}, ${(r.h / R.h).toFixed(4)})`; }

// ---------- text ----------
// A display line made of word spans (.line/.word) so the studio's text gates can read it. Centered on (cx, cy).
function words(parent, text, { size, weight = 700, color = L.ink, cy, cx = COPY.cx, width = COPY.width, dir = 'rtl', accent = {}, z = 20, font = SANS, lh = 1.2 } = {}) {
  const T0 = textLine(parent, text, { left: px(cx - width / 2), top: px(cy - size * lh / 2), width: px(width), justifyContent: 'center', fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), direction: dir, zIndex: String(z), whiteSpace: 'nowrap' });
  T0.accent = accent; T0.words.forEach((w, i) => { if (accent[i]) w.dataset.acc = '1'; });
  return T0;
}
// plain text (UI chrome): not a gated line
function label(parent, text, { x, y, size = 24, weight = 400, color = L.ink2, align = 'right', w = 600, font = SANS, dir = 'rtl', z } = {}) {
  const left = align === 'right' ? x - w : align === 'left' ? x : x - w / 2;
  return div(parent, { left: px(left), top: px(y - size * 0.75), width: px(w), height: px(size * 1.5), lineHeight: px(size * 1.5), fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, textAlign: align === 'center' ? 'center' : align, direction: dir, whiteSpace: 'nowrap', zIndex: z ? String(z) : undefined }, text);
}
// slam: scale 1.3 → 1 on a ζ 0.55 spring (stays under the 1.14 text rule), blur resolves; exit blur-lift. Colours follow the theme.
function slam(Ln, t, tIn, tOut, theme, { stagger = 0.08, zeta = 0.55, w = 24 } = {}) {
  const outDur = 0.28, on = t >= tIn - 0.01 && t <= tOut + outDur + Ln.words.length * 0.03 + 0.02;
  Ln.line.style.display = on ? 'flex' : 'none'; if (!on) return;
  const ink = mixHex(L.ink, D.ink, theme), acc = mixHex(L.blue, D.blue, theme);
  Ln.words.forEach((wd, i) => {
    const a = tIn + i * stagger, s = zspring(t - a, zeta, w), q = ioC(ramp(t, tOut + i * 0.03, tOut + i * 0.03 + outDur));
    wd.style.opacity = (clamp(s * 3) * (1 - q)).toFixed(3);
    wd.style.transform = `scale(${lerp(1.3, 1, Math.min(s, 1.12)).toFixed(4)}) translateY(${(q * -26).toFixed(2)}px)`;
    const b = (1 - clamp(s)) * 14 + q * 10; wd.style.filter = b > 0.2 ? `blur(${b.toFixed(2)}px)` : 'none';
    wd.style.color = wd.dataset.acc ? acc : ink;
  });
}

// ---------- icons (24×24 stroke, the academy's own set) ----------
const ICON = {
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  logo: '<path d="M6 21V4M14 21V8M6 17h8M6 13h8M6 9h3.5"/><path d="M18.5 2.6l.9 2.2 2.1.8-2.1.8-.9 2.2-.9-2.2-2.1-.8 2.1-.8z" fill="currentColor" stroke="none"/>',
};
const icon = (parent, name, { x, y, size = 24, color = L.ink3, sw = 1.8, z } = {}) => svgEl(parent, { viewBox: '0 0 24 24', width: size, height: size, style: { position: 'absolute', left: px(x - size / 2), top: px(y - size / 2), fill: 'none', stroke: color, strokeWidth: String(sw), strokeLinecap: 'round', strokeLinejoin: 'round', overflow: 'visible', zIndex: z ? String(z) : undefined, color } }, ICON[name]);

// ---------- camera: a slow breathing drift + decaying impacts ----------
function camera(t) {
  let x = 0, y = 0, r = 0;
  for (const [h, a] of HITS) { if (t < h) continue; const d = Math.exp(-(t - h) / 0.12) * a; x += d * 6 * Math.sin((t - h) * 61 + h); y += d * 8 * Math.cos((t - h) * 53 + 2 * h); r += d * 0.06 * Math.sin((t - h) * 47); }
  // a slow push inside each chapter (keeps holds alive), eased back during the next chapter's morph
  const SEG = [0, T.wake, T.lv, T.sc, T.lab, T.dark, T.qz, T.light, T.drop];
  let s = 1;
  if (t >= T.drop) s = 1 + 0.06 * ioC(ramp(t, T.drop + 0.3, T.end));
  else { let k = 0; while (k + 1 < SEG.length && t >= SEG[k + 1]) k++; const a = SEG[k], b = SEG[k + 1] ?? T.drop, prevPeak = k ? 0.035 : 0;
    s = 1 + 0.035 * ease.inOutSine(ramp(t, a + 0.3, b)) + prevPeak * (1 - ioC(ramp(t, a, a + 0.45))); }
  return { x, y, r, s };
}

const S = {};
function build(stage) {
  // ----- worlds: light ground, a dark circle (moon), a light circle (sun), a dot grid -----
  S.bg = full(stage, { background: L.bg, zIndex: '0' });
  S.dark = full(stage, { background: D.bg, zIndex: '1', clipPath: 'circle(0px at 0 0)' });
  S.light = full(stage, { background: L.bg, zIndex: '2', clipPath: 'circle(0px at 0 0)' });
  S.grid = svgEl(stage, { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', zIndex: '3' } },
    `<defs><pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="18" cy="18" r="1.6" fill="${L.dot}"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/>`);
  S.dotFill = S.grid.querySelector('circle');
  CAM = full(stage, { transformOrigin: '960px 540px', zIndex: '4' });

  // ----- circuit lines (the site's hero motif): drawn when the page wakes, and again into the logo -----
  const lines1 = [['M110 300 H60 Q30 300 30 270 V120 H0', SIG.violet], ['M110 640 H40 Q12 640 12 668 V760 H0', SIG.green], ['M300 925 V990 Q300 1010 280 1010 H0', SIG.teal], ['M760 925 V1040 Q760 1060 780 1060 H1020', SIG.blue], ['M820 165 V60 Q820 40 840 40 H1100', SIG.amber]];
  const lines2 = [['M0 330 H520 Q560 330 560 300 V260 H760', SIG.violet], ['M1920 330 H1400 Q1360 330 1360 360 V400 H1160', SIG.pink], ['M0 760 H600', SIG.teal], ['M1920 760 H1320', SIG.amber]];
  S.circ = svgEl(CAM, { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '2' } },
    [...lines1.map(([d, c], i) => `<path class="c1" d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" data-i="${i}"/>`),
     ...lines2.map(([d, c], i) => `<path class="c2" d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" data-i="${i}"/>`)].join(''));
  S.c1 = [...S.circ.querySelectorAll('.c1')]; S.c2 = [...S.circ.querySelectorAll('.c2')];
  S.pulses = lines2.map(([, c]) => { const d = el('circle', { r: 5, fill: c }, S.circ); return d; });

  // ----- THE HERO: page → window frame -----
  S.win = div(CAM, { background: L.bg, border: `1px solid ${L.line2}`, zIndex: '5', overflow: 'hidden' });
  S.tbar = div(S.win, { left: '0', top: '0', width: '100%', height: '56px', borderBottom: `1px solid ${L.line}`, background: L.s2 });
  S.lights = ['#ff5f57', '#febc2e', '#28c840'].map((c, i) => div(S.tbar, { left: px(22 + i * 22), top: '22px', width: '12px', height: '12px', borderRadius: '50%', background: c }));
  S.moon = icon(S.tbar, 'moon', { x: 152, y: 28, size: 22, color: L.ink3 }); S.sun = icon(S.tbar, 'sun', { x: 152, y: 28, size: 22, color: D.ink2 });
  S.wtitle = div(S.tbar, { left: '0', top: '0', width: '100%', height: '56px', lineHeight: '56px', textAlign: 'center', fontFamily: SANS, fontSize: '18px', color: L.ink3, direction: 'rtl' }, 'أكاديمية أساسيات الذكاء الاصطناعي');
  // the page's own face (hook): title bar + 7 text lines + page number
  S.pageFace = full(CAM, { zIndex: '7' });
  S.ptitle = div(S.pageFace, { background: L.ink, borderRadius: '7px' });
  S.plines = [0.86, 0.94, 0.78, 0.9, 0.7, 0.88, 0.6].map((f) => ({ f, n: div(CAM, { background: L.line2, borderRadius: '6px', zIndex: '8' }) }));
  S.pnum = label(S.pageFace, '٧', { x: PAGE.x, y: PAGE.y + PAGE.h / 2 - 34, size: 20, color: L.ink3, align: 'center', w: 80 });

  // ----- sidebar (units) for the academy and levels chapters -----
  const A = WIN.ac, sx1 = A.x + A.w / 2, sx0 = sx1 - 230, top = A.y - A.h / 2;
  S.side = full(CAM, { zIndex: '6' });
  S.sideBg = div(S.side, { left: px(sx0), top: px(top + 56), width: '230px', height: px(A.h - 56), background: L.s2, borderLeft: `1px solid ${L.line}` });
  S.sideH = label(S.side, 'الوحدات', { x: sx1 - 26, y: top + 96, size: 18, color: L.ink3, w: 180 });
  S.urows = UNIT.map((u, i) => {
    const y = top + 140 + i * 56;
    const nm = label(S.side, u.n, { x: sx1 - 58, y, size: 16.5, weight: 500, color: L.ink, w: 162 });
    const num = label(S.side, String(i), { x: sx1 - 31, y, size: 13, weight: 600, color: '#ffffff', align: 'center', w: 22, font: SANS, dir: 'ltr', z: 9 });
    return { y, nm, num, bx: sx1 - 31 };
  });

  // ----- chapter: academy (four counters) -----
  S.ac = full(CAM, { zIndex: '7' });
  const mx = (A.x - A.w / 2 + sx0) / 2;              // main pane centre x
  S.acHead = label(S.ac, 'أكاديمية كاملة من كتاب واحد', { x: sx0 - 40, y: top + 104, size: 22, weight: 600, color: L.ink, w: 560 });
  S.stats = [[41, 'درسًا'], [35, 'مشهدًا متحركًا'], [13, 'مختبرًا'], [97, 'برومبت']].map(([n, lb], i) => {
    const cx = mx + (i % 2 ? -160 : 160), cy = top + 250 + Math.floor(i / 2) * 230;
    const card = div(S.ac, { background: L.s2, border: `1px solid ${L.line}`, borderRadius: '16px' }); place(card, cx, cy, 300, 200, 16);
    const num = words(S.ac, '0', { size: 84, weight: 600, cx, cy: cy - 22, width: 280, dir: 'ltr', z: 9, lh: 1.15 });
    const lab = label(S.ac, lb, { x: cx, y: cy + 56, size: 24, color: L.ink2, align: 'center', w: 280 });
    return { n, cx, cy, card, num, lab };
  });

  // ----- chapter: levels -----
  S.lv = full(CAM, { zIndex: '7' });
  S.seg = div(S.lv, { background: L.s2, border: `1px solid ${L.line}`, borderRadius: '30px' }); place(S.seg, mx, top + 120, 580, 60, 30);
  S.segPill = div(S.lv, { background: '#ffffff', borderRadius: '24px', boxShadow: '0 1px 2px rgba(17,17,20,.10), 0 0 0 1px #ebebef' });
  S.segX = [mx + 217, mx + 72, mx - 72, mx - 217];
  S.segL = ['بسيط', 'الآلية', 'التطبيق', 'متقدم'].map((s, i) => label(S.lv, s, { x: S.segX[i], y: top + 120, size: 21, weight: 500, color: L.ink3, align: 'center', w: 140, z: 9 }));
  S.lvTitle = words(S.lv, 'ماذا يحدث خلف الشاشة؟', { size: 34, weight: 600, cx: mx, cy: top + 270, width: 600, z: 9 });
  S.lvQ = div(S.lv, { background: L.violetSoft, color: L.violet, fontFamily: SANS, fontSize: '17px', fontWeight: '500', textAlign: 'center', borderRadius: '13px', direction: 'rtl' });
  S.lvQs = ['ما هو؟', 'كيف يعمل؟', 'طبّقه بنفسك', 'علاقته بما سبق'];
  S.lvBars = [0, 1, 2, 3, 4, 5].map(() => div(S.lv, { borderRadius: '6px', background: L.line2 }));
  S.lvW = [[0.92, 0.84, 0.6, 0, 0, 0], [0.95, 0.9, 0.86, 0.7, 0, 0], [0.9, 0.95, 0.8, 0.88, 0.55, 0], [0.96, 0.92, 0.9, 0.94, 0.86, 0.62]];
  S.lvMark = [[1], [0, 2], [1, 3], [0, 2, 4]];

  // ----- chapter: scene (the governing equation, book p. 7) -----
  const C = WIN.sc, ctop = C.y - C.h / 2;
  S.sc = full(CAM, { zIndex: '7' });
  S.scChip = div(S.sc, { background: L.blueSoft, color: L.blue, fontFamily: SANS, fontSize: '17px', fontWeight: '600', textAlign: 'center', borderRadius: '14px', direction: 'rtl', lineHeight: '30px' }, 'ص ٧ من الكتاب'); place(S.scChip, C.x - C.w / 2 + 110, ctop + 100, 140, 30, 15);
  S.parts = [['هدف', 'واضح'], ['سياق', 'كافٍ'], ['طلب', 'محدد'], ['شكل', 'المخرج']].map(([a, b], i) => {
    const x = C.x + (1.5 - i) * 226, y = ctop + 220;
    const box = div(S.sc, { borderRadius: '18px' }); place(box, x, y, 176, 124, 18);
    const t1 = words(S.sc, a, { size: 34, weight: 600, cx: x, cy: y - 16, width: 170, z: 9 });
    const t2 = label(S.sc, b, { x, y: y + 30, size: 19, color: L.ink3, align: 'center', w: 170, z: 9 });
    return { x, y, box, t1, t2 };
  });
  S.plus = [0, 1, 2].map((i) => label(S.sc, '+', { x: C.x + (1 - i) * 226, y: ctop + 220, size: 40, weight: 300, color: L.ink3, align: 'center', w: 60, font: SANS, dir: 'ltr' }));
  S.eqSign = label(S.sc, '=', { x: C.x, y: ctop + 340, size: 44, weight: 300, color: L.ink3, align: 'center', w: 60, dir: 'ltr' });
  S.res = div(S.sc, { borderRadius: '48px' }); place(S.res, C.x, ctop + 440, 400, 96, 48);
  S.resT = words(S.sc, 'نتيجة تتنفّذ', { size: 38, weight: 600, cx: C.x, cy: ctop + 440, width: 380, z: 9 });
  S.meterBg = div(S.sc, { background: L.s3, borderRadius: '5px' }); place(S.meterBg, C.x + 30, ctop + 560, 600, 10, 5);
  S.meter = div(S.sc, { borderRadius: '5px', background: `linear-gradient(90deg, ${SIG.green}, ${SIG.amber}, ${SIG.pink})` });
  S.meterT = label(S.sc, '0%', { x: C.x - 300, y: ctop + 560, size: 22, weight: 600, color: L.ink, align: 'right', w: 90, dir: 'ltr' });

  // ----- chapter: lab (Excel formula — a real calculation) -----
  const B = WIN.lab, ltop = B.y - B.h / 2, lr = B.x + B.w / 2, ll = B.x - B.w / 2;
  S.lab = full(CAM, { zIndex: '7' });
  S.labH = label(S.lab, 'مختبر معادلة إكسل', { x: lr - 40, y: ltop + 104, size: 26, weight: 600, color: L.ink, w: 500 });
  S.labChip = div(S.lab, { background: L.mintSoft, color: L.mint, fontFamily: SANS, fontSize: '17px', fontWeight: '600', textAlign: 'center', borderRadius: '15px', direction: 'rtl', lineHeight: '30px' }, 'حساب حقيقي'); place(S.labChip, ll + 110, ltop + 104, 130, 30, 15);
  S.cbx = div(S.lab, { border: `2px solid ${L.line2}`, borderRadius: '7px', background: '#fff' }); place(S.cbx, lr - 54, ltop + 162, 28, 28, 7);
  S.cbxTick = icon(S.lab, 'check', { x: lr - 54, y: ltop + 162, size: 20, color: '#fff', sw: 3 });
  S.cbxL = label(S.lab, 'معالجة البيانات الناقصة', { x: lr - 84, y: ltop + 162, size: 22, weight: 500, color: L.ink, w: 400 });
  const cols = [lr - 130, lr - 330, lr - 530, lr - 730], heads = ['المنتج', 'السعر', 'التكلفة', 'الهامش'];
  S.tbl = div(S.lab, { border: `1px solid ${L.line}`, borderRadius: '12px', overflow: 'hidden' }); place(S.tbl, B.x, ltop + 400, 820, 360, 12);
  S.th = div(S.lab, { background: L.s2, borderBottom: `1px solid ${L.line}` }); place(S.th, B.x, ltop + 250, 818, 58, 0);
  heads.forEach((hh, i) => label(S.lab, hh, { x: cols[i], y: ltop + 250, size: 20, weight: 600, color: L.ink3, align: 'center', w: 180 }));
  const rows = [['شاشة', '12000', '9000', '25.0%'], ['ثلاجة', '', '7000', '#DIV/0!'], ['غسالة', '0', '6500', '#DIV/0!'], ['مكيف', '15000', '11200', '25.3%']];
  S.cells = rows.map((r, j) => {
    const y = ltop + 316 + j * 72;
    if (j) { const sep = div(S.lab, { background: L.line }); place(sep, B.x, y - 36, 818, 1, 0); }
    r.slice(0, 3).forEach((v, i) => label(S.lab, v, { x: cols[i], y, size: 22, color: L.ink, align: 'center', w: 180, dir: i ? 'ltr' : 'rtl' }));
    const bg = div(S.lab, {}); place(bg, cols[3], y, 196, 70, 0);
    const out = label(S.lab, r[3], { x: cols[3], y, size: 22, weight: 600, color: L.ink, align: 'center', w: 180, dir: 'ltr' });
    return { err: r[3].startsWith('#'), bg, out, y };
  });
  S.fx0 = label(S.lab, 'E2  =(C2-D2)/C2', { x: ll + 60, y: ltop + 640, size: 22, color: L.ink2, align: 'left', w: 780, font: MONO, dir: 'ltr' });
  S.fx1 = label(S.lab, 'E2  =IF(OR(C2="",C2=0),"",(C2-D2)/C2)', { x: ll + 60, y: ltop + 640, size: 22, color: L.blue, align: 'left', w: 780, font: MONO, dir: 'ltr' });

  // ----- chapter: prompt library (dark) -----
  const P = WIN.pr, ptop = P.y - P.h / 2, pr = P.x + P.w / 2, pl = P.x - P.w / 2;
  S.pr = full(CAM, { zIndex: '7' });
  S.search = div(S.pr, { background: D.s2, border: `1px solid ${D.line2}`, borderRadius: '14px' }); place(S.search, P.x, ptop + 120, 820, 64, 14);
  icon(S.pr, 'search', { x: pr - 76, y: ptop + 120, size: 24, color: D.ink3 });
  S.query = label(S.pr, '', { x: pr - 104, y: ptop + 120, size: 26, weight: 500, color: D.ink, w: 400 });
  S.caret = div(S.pr, { background: D.blue, width: '2px', height: '30px' });
  S.prRows = [['طلب بالعناصر الخمسة', 'التطبيق في العمل'], ['أعد كتابة طلبي', 'التعلم والفهم'], ['أقوى تقنية في الدليل', 'التعلم والفهم'], ['ثلاثة سيناريوهات', 'التحليل']].map(([a, b], i) => {
    const y = ptop + 212 + i * 70, g = full(S.pr, {});
    const bg = div(g, { borderRadius: '12px' }); place(bg, P.x, y, 820, 60, 12);
    label(g, a, { x: pr - 80, y, size: 24, weight: 500, color: D.ink, w: 460 });
    const chip = div(g, { border: `1px solid ${D.line2}`, color: D.ink3, fontFamily: SANS, fontSize: '16px', textAlign: 'center', borderRadius: '13px', direction: 'rtl', lineHeight: '26px' }, b); place(chip, pl + 130, y, 170, 28, 14);
    return { g, bg, y };
  });
  S.card = div(S.pr, { background: D.s2, border: `1px solid ${D.line2}` });
  S.cardIn = full(S.pr, {});
  S.cardT = label(S.cardIn, 'طلب بالعناصر الخمسة', { x: pr - 80, y: ptop + 240, size: 30, weight: 600, color: D.ink, w: 520 });
  S.cardChip = div(S.cardIn, { border: `1px solid ${D.line2}`, color: D.ink3, fontFamily: SANS, fontSize: '16px', textAlign: 'center', borderRadius: '13px', direction: 'rtl', lineHeight: '26px' }, 'التطبيق في العمل'); place(S.cardChip, pl + 130, ptop + 240, 170, 28, 14);
  S.vars = [['الهدف:', 'ما تريد أن تقرره', 'سبب انخفاض المبيعات'], ['الجمهور:', 'لمن النتيجة', 'مدير القسم'], ['شكل المخرج:', 'جدول، نقاط…', 'جدول من ثلاثة أعمدة']].map(([k, ph, val], i) => {
    const y = ptop + 330 + i * 76;
    const row = div(S.cardIn, { left: px(pl + 80), top: px(y - 26), width: px(740), height: '52px', display: 'flex', alignItems: 'center', gap: '12px', direction: 'rtl', fontFamily: SANS, fontSize: '26px', color: D.ink2 });
    el('span', { text: k, style: { fontWeight: '500' } }, row);
    const chip = el('span', { style: { position: 'relative', display: 'inline-flex', alignItems: 'center', height: '42px', padding: '0 14px', borderRadius: '10px', background: D.blueSoft, color: D.blue, fontWeight: '500', whiteSpace: 'nowrap' } }, row);
    const a = el('span', { text: `[${ph}]` }, chip), b = el('span', { text: val, style: { position: 'absolute', right: '14px', top: '0', lineHeight: '42px', opacity: '0' } }, chip);
    return { chip, a, b, ph, val };
  });
  S.copyBtn = div(S.cardIn, { background: `linear-gradient(180deg, #7396ff, ${D.blue})`, borderRadius: '28px', boxShadow: '0 8px 22px -8px rgba(91,130,255,.7), inset 0 1px 0 rgba(255,255,255,.25)' }); place(S.copyBtn, pl + 126, ptop + 627, 168, 56, 28);
  icon(S.cardIn, 'copy', { x: pl + 168, y: ptop + 627, size: 22, color: '#fff', sw: 2 });
  label(S.cardIn, 'نسخ', { x: pl + 104, y: ptop + 627, size: 24, weight: 600, color: '#fff', align: 'center', w: 80 });
  S.toast = full(S.pr, { zIndex: '12' });
  S.toastBg = div(S.toast, { background: D.ink, borderRadius: '28px' }); place(S.toastBg, P.x, ptop + 712, 230, 56, 28);
  icon(S.toast, 'check', { x: P.x + 64, y: ptop + 712, size: 24, color: '#18864f', sw: 3 });
  label(S.toast, 'اتنسخ', { x: P.x - 14, y: ptop + 712, size: 24, weight: 600, color: D.bg, align: 'center', w: 120 });

  // ----- chapter: quiz (dark) -----
  const Q = WIN.qz, qtop = Q.y - Q.h / 2, qr = Q.x + Q.w / 2;
  S.qz = full(CAM, { zIndex: '7' });
  S.qChip = div(S.qz, { background: D.s3, color: '#a994ff', fontFamily: SANS, fontSize: '17px', fontWeight: '600', textAlign: 'center', borderRadius: '15px', direction: 'rtl', lineHeight: '30px' }, 'اكتشف الخطأ'); place(S.qChip, qr - 110, qtop + 100, 140, 30, 15);
  S.qText = div(S.qz, { left: px(Q.x - 390), top: px(qtop + 132), width: '780px', fontFamily: SANS, fontSize: '28px', fontWeight: '600', lineHeight: '1.6', color: D.ink, direction: 'rtl', textAlign: 'right' }, 'زميلك يقول: «النموذج أجاب بثقة عالية، إذن الإجابة صحيحة». أين الخلل؟');
  S.opts = ['الثقة في الصياغة ليست دليلًا على الصحة', 'لا خلل؛ النماذج لا تخطئ حين تكون واثقة', 'الخلل أن السؤال كان بالعربية'].map((s, i) => {
    const y = qtop + 287 + i * 86;
    const box = div(S.qz, { border: `1px solid ${D.line2}`, borderRadius: '14px', background: D.win }); place(box, Q.x, y, 780, 70, 14);
    const key = div(S.qz, { background: D.s3, borderRadius: '8px', color: D.ink3, fontFamily: SANS, fontSize: '17px', fontWeight: '600', textAlign: 'center', lineHeight: '30px' }, ['أ', 'ب', 'ج'][i]); place(key, qr - 70, y, 30, 30, 8);
    const kc = icon(S.qz, 'check', { x: qr - 70, y, size: 20, color: '#fff', sw: 3 });
    const tx = label(S.qz, s, { x: qr - 104, y, size: 23, color: D.ink, w: 640 });
    return { box, key, kc, tx, y };
  });
  S.fb = div(S.qz, { background: D.mintSoft, borderRadius: '14px' }); place(S.fb, Q.x, qtop + 560, 780, 64, 14);
  S.fbT = label(S.qz, 'صحيح — النموذج قد يخطئ بثقة؛ راجِع وتحقّق من المصادر.', { x: qr - 70, y: qtop + 560, size: 22, weight: 500, color: D.mint, w: 700 });

  // ----- chapter: the 41 pages -----
  S.tiles = []; S.tileL = full(CAM, { zIndex: '9' });
  const unitOf = (p) => (p <= 6 || p === 41 ? 0 : p <= 16 ? 1 : p <= 23 ? 2 : p <= 25 ? 3 : p <= 31 ? 4 : 5);
  for (let n = 1; n <= 41; n++) {
    const row = Math.floor((n - 1) / 9), col = (n - 1) % 9, x = 936 - col * 94, y = 290 + row * 118;
    const card = div(S.tileL, { background: '#fff', border: `1px solid ${L.line2}`, borderRadius: '10px', overflow: 'hidden' });
    const bar = div(card, { left: '0', top: 'auto', bottom: '0', width: '100%', height: '6px', background: L.line });
    const num = div(card, { left: '0', top: '30px', width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: '24px', fontWeight: '600', color: L.ink3, direction: 'ltr' }, String(n));
    S.tiles.push({ n, x, y, card, bar, num, c: UNIT[unitOf(n)].c });
  }
  S.count = words(CAM, '0 / 41', { size: 60, weight: 600, cx: COPY.cx, cy: 720, width: 400, dir: 'ltr', z: 20, font: SANS });

  // ----- headline column -----
  S.lines = LINES.map((ln) => ({ ...ln, L: words(CAM, ln.text, { size: ln.size, cy: ['l3', 'l6'].includes(ln.id) ? (COPY.y1 + COPY.y2) / 2 : ln.id.endsWith('b') || ln.id === 'l2' ? COPY.y2 : COPY.y1, accent: Object.fromEntries(Object.keys(ln.accent || {}).map((k) => [k, 1])) }) }));
  S.eyebrow = words(CAM, '01 / 07', { size: 26, weight: 500, cy: 300, width: 300, dir: 'ltr', font: MONO, accent: { 0: 1 } });
  S.chapters = [[T.wake, T.acOut], [T.lv, T.lvOut], [T.sc, T.scOut], [T.lab, T.labOut], [T.pal, T.prOut], [T.qz, T.qzOut], [T.light, T.implode - 0.25]];

  // ----- payoff -----
  S.pay = full(CAM, { zIndex: '14' });
  S.tile = div(S.pay, { background: `linear-gradient(180deg, ${L.blueHi}, ${L.blue})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), 0 2px 4px rgba(47,95,230,.25), 0 26px 60px -18px rgba(47,95,230,.6)' });
  S.tileIcon = svgEl(S.tile, { viewBox: '0 0 24 24', width: 100, height: 100, style: { position: 'absolute', left: '34px', top: '34px', fill: 'none', stroke: '#fff', strokeWidth: '1.9', strokeLinecap: 'round', strokeLinejoin: 'round', color: '#fff', overflow: 'visible' } }, ICON.logo);
  S.name = words(S.pay, 'أكاديمية أساسيات الذكاء الاصطناعي', { size: 76, weight: 700, cx: 960, cy: 520, width: 1500 });
  S.tag = words(S.pay, 'كتاب الذكاء الاصطناعي، أصبح أكاديمية حيّة.', { size: 42, weight: 400, cx: 960, cy: 612, width: 1300, color: L.ink2 });
  S.cta = div(S.pay, { background: `linear-gradient(180deg, ${L.blueHi}, ${L.blue})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), 0 1px 2px rgba(47,95,230,.3), 0 12px 26px -8px rgba(47,95,230,.55)' });
  S.ctaT = words(S.pay, 'ابدأ الرحلة', { size: 36, weight: 600, cx: 940, cy: 760, width: 300, color: '#ffffff', z: 16 });
  S.ctaIcon = icon(S.pay, 'play', { x: 1060, y: 760, size: 22, color: '#fff', z: 16 });
  S.ring = div(S.pay, { border: `2px solid ${L.blue}`, borderRadius: '50%', zIndex: '15' });
  S.stat = words(S.pay, '٤١ درسًا، ٣٥ مشهدًا، ١٣ مختبرًا، ٩٧ برومبت، ٨٣ سؤالًا', { size: 28, weight: 500, cx: 960, cy: 880, width: 1300, color: L.ink3 });
  S.credit = words(S.pay, 'من كتاب محمد فوزي', { size: 26, weight: 400, cx: 960, cy: 940, width: 600, color: L.ink3 });

  // ----- the cursor narrator (always on top) -----
  S.cur = svgEl(CAM, { viewBox: '0 0 24 24', width: 40, height: 40, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: '30', transformOrigin: '4px 3px' } },
    '<path d="M4 3l14 7.5-6.2 1.6L8.6 18z" fill="#111114" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>');
  S.clickRing = div(CAM, { border: `2.5px solid ${L.blue}`, borderRadius: '50%', zIndex: '29' });
}

function frame(t) {
  const c = camera(t);
  CAM.style.transform = `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) rotate(${c.r.toFixed(3)}deg) scale(${c.s.toFixed(4)})`;
  // theme: 0 light → 1 dark (the window and copy follow the circle as it passes)
  const R1 = 2300 * 1.08;
  // the window (centre ≈ 560,545) changes theme as the circle's soft edge crosses it: ~420 px from either toggle
  const edge = (t0, d = 420) => (t < t0 ? 0 : ioC(clamp((oC(ramp(t, t0, t0 + 0.75)) * R1 + 70 - d + 160) / 320)));
  const theme = edge(T.dark) - edge(T.light), themeCopy = edge(T.dark, 1250) - edge(T.light, 1230);
  // feathered circle reveals (a hard edge bands under subframe motion blur)
  const reveal = (n, t0, cx, cy) => { const on = t >= t0; n.style.clipPath = 'none'; n.style.display = on ? 'block' : 'none'; if (!on) return; const rr = oC(ramp(t, t0, t0 + 0.75)) * R1; const m = `radial-gradient(circle at ${cx}px ${cy}px, #000 ${rr.toFixed(1)}px, transparent ${(rr + 140).toFixed(1)}px)`; n.style.maskImage = m; n.style.webkitMaskImage = m; };
  reveal(S.dark, T.dark, 262, 223); reveal(S.light, T.light, 282, 253);
  S.dotFill.setAttribute('fill', mixHex(L.dot, D.dot, theme));
  S.grid.style.opacity = (t < T.drop - 0.4 ? 1 : 1 - ramp(t, T.drop - 0.4, T.drop)).toFixed(3);

  // ----- the hero: page → window → tiles -----
  const r = winRect(t), pageMode = t < T.wake;
  const fl = 7 * Math.sin(2 * Math.PI * (t - 0.8) / 2.4) * ramp(t, 0.8, 1.6) * (1 - ramp(t, 3.6, 4.0));
  const winOn = t < T.tiles + 0.25;
  S.win.style.display = winOn ? 'block' : 'none';
  if (winOn) {
    const pIn = zspring(t - T.page, 0.62, 14), wq = t >= T.tiles ? 1 - ioC(ramp(t, T.tiles, T.tiles + 0.25)) : 1;
    const sc = pageMode ? lerp(0.55, 1, Math.min(pIn, 1.08)) : 1;
    place(S.win, r.x, r.y, r.w * sc, r.h * sc, r.r);
    S.win.style.transform = pageMode ? `translateY(${fl.toFixed(2)}px) rotate(${((1 - clamp(pIn)) * -9 + fl * 0.12).toFixed(2)}deg)` : 'none';
    S.win.style.opacity = (pageMode ? clamp(pIn * 3) : wq).toFixed(3);
    const wc = mixHex(L.bg, D.win, theme);
    S.win.style.background = wc; S.win.style.borderColor = mixHex(L.line2, D.line2, theme);
    const shadowA = (pageMode ? 0.10 : 0.07) * (1 - theme) + 0.45 * theme;
    S.win.style.boxShadow = `0 1px 2px rgba(0,0,0,${(shadowA * 0.5).toFixed(3)}), 0 30px 80px -10px rgba(0,0,0,${shadowA.toFixed(3)})`;
    const tb0 = clamp((t - T.wake) / 0.35);
    S.tbar.style.display = t >= T.wake ? 'block' : 'none';
    S.tbar.style.opacity = tb0.toFixed(3); S.tbar.style.background = mixHex(L.s2, D.s2, theme); S.tbar.style.borderColor = mixHex(L.line, D.line, theme);
    S.wtitle.style.color = mixHex(L.ink3, D.ink3, theme);
    S.moon.style.display = theme < 0.5 ? 'block' : 'none'; S.sun.style.display = theme >= 0.5 ? 'block' : 'none';
  }
  // page face
  const faceO = pageMode ? clamp(zspring(t - T.page, 0.62, 14) * 3) : 1 - ramp(t, T.wake, T.wake + 0.12);
  if (show(S.pageFace, faceO, 0)) {
    const sc = lerp(0.55, 1, Math.min(zspring(t - T.page, 0.62, 14), 1.08));
    place(S.ptitle, PAGE.x + 30, PAGE.y - PAGE.h / 2 + 72, 220 * sc, 18 * sc, 7);
    S.pageFace.style.transformOrigin = `${PAGE.x}px ${PAGE.y}px`; S.pageFace.style.transform = `translateY(${fl.toFixed(2)}px) rotate(${((1 - clamp(zspring(t - T.page, 0.62, 14))) * -9 + fl * 0.12).toFixed(2)}deg)`;
  }
  // the page's lines: grey text bars → they light up on the click and fly to become the six unit badges
  S.plines.forEach((ln, i) => {
    const pIn = zspring(t - T.page - 0.08 - i * 0.03, 0.7, 16), y0 = PAGE.y - PAGE.h / 2 + 130 + i * 44, w0 = (PAGE.w - 80) * ln.f, x0 = PAGE.x + (PAGE.w - 80) / 2 - w0 / 2;
    if (t < T.wake) { place(ln.n, x0, y0, w0 * clamp(pIn), 12, 6); ln.n.style.opacity = clamp(pIn * 2).toFixed(3); const rd = T.l1 + 0.4 + i * 0.36, hl = Math.max(0, Math.min(ramp(t, rd, rd + 0.18), 1 - ramp(t, rd + 0.25, rd + 1.1))); ln.n.style.background = mixHex(L.line2, L.blue, hl * 0.85); ln.n.style.display = 'block'; ln.n.style.transformOrigin = `${PAGE.x - x0 + w0 / 2}px ${PAGE.y - y0 + 6}px`; ln.n.style.transform = `translateY(${fl.toFixed(2)}px) rotate(${((1 - clamp(zspring(t - T.page, 0.62, 14))) * -9 + fl * 0.12).toFixed(2)}deg)`; ln.n.style.filter = 'none'; return; }
    if (i >= 6) { ln.n.style.display = t < T.wake + 0.15 ? 'block' : 'none'; ln.n.style.opacity = (1 - ramp(t, T.wake, T.wake + 0.15)).toFixed(3); return; }
    const u = S.urows[i], a = T.wake + 0.06 + i * 0.05, p = zspring(t - a, 0.62, 15), q = Math.min(p, 1.1), litU = oC(ramp(t, T.wake, T.wake + 0.12));
    const x = lerp(x0, u.bx, q), y = lerp(y0, u.y, q) - Math.sin(Math.PI * clamp((t - a) / 0.5)) * 70, w = lerp(w0, 26, q), h = lerp(12, 26, q), rr = lerp(6, 7, clamp(p));
    const sideO = vin(t, T.wake, T.sc - 0.1, 0.01, 0.2);
    ln.n.style.display = sideO > 0.01 ? 'block' : 'none'; ln.n.style.opacity = sideO.toFixed(3); ln.n.style.transform = 'none';
    place(ln.n, x, y, w, h, rr); ln.n.style.background = mixHex(L.line2, UNIT[i].c, litU);
    const sp = Math.abs(zspring(t + 1 / 240 - a, 0.62, 15) - p) * 240; ln.n.style.filter = sp > 1 ? `blur(${Math.min(5, sp * 0.4).toFixed(2)}px)` : 'none';
  });
  // sidebar
  const sideO = vin(t, T.wake + 0.2, T.sc - 0.1, 0.25, 0.2);
  if (show(S.side, sideO, 0)) {
    follow(S.side, WIN.ac, r);
    S.urows.forEach((u, i) => { const a = T.units[i], v = oC(ramp(t, a, a + 0.25)); u.nm.style.opacity = v.toFixed(3); u.nm.style.transform = `translateX(${((1 - v) * 18).toFixed(1)}px)`; u.num.style.opacity = clamp((t - T.wake - 0.4) * 4).toFixed(3); });
  }
  // ----- academy: counters -----
  if (show(S.ac, vin(t, T.wake + 0.35, T.acOut))) {
    follow(S.ac, WIN.ac, r);
    S.stats.forEach((s, i) => {
      const a = T.stats[i], p = zspring(t - a, 0.6, 18), v = clamp(p * 2);
      s.card.style.transform = `scale(${lerp(0.85, 1, Math.min(p, 1.06)).toFixed(4)})`; s.card.style.opacity = v.toFixed(3);
      const k = ioC(ramp(t, a + 0.05, a + 0.9)); s.num.words[0].textContent = String(Math.round(k * s.n));
      s.num.words[0].style.opacity = (v * clamp(sideO > 0 ? 1 : 1)).toFixed(3); s.num.line.style.display = t >= a - 0.02 ? 'flex' : 'none';
      s.lab.style.opacity = v.toFixed(3);
    });
  }
  // ----- levels -----
  if (show(S.lv, vin(t, T.lv + 0.02, T.lvOut))) {
    follow(S.lv, WIN.lv, r);
    const sel = T.lvSteps.slice(0, 3).filter((x) => t >= x).length, ps = T.lvSteps[Math.max(0, sel - 1)];
    const k = sel === 0 ? 1 : zspring(t - ps, 0.62, 22), xFrom = S.segX[Math.max(0, sel - 1)], xTo = S.segX[sel];
    const stretch = Math.sin(Math.PI * clamp(k)) * 40;
    place(S.segPill, lerp(xFrom, xTo, Math.min(k, 1.08)), WIN.lv.y - WIN.lv.h / 2 + 120, 136 + stretch, 48, 24);
    S.segL.forEach((n, i) => { n.style.color = i === sel ? L.ink : L.ink3; n.style.fontWeight = i === sel ? '600' : '500'; });
    const top = WIN.lv.y - WIN.lv.h / 2, mx = (WIN.lv.x - WIN.lv.w / 2 + WIN.lv.x + WIN.lv.w / 2 - 230) / 2;
    S.lvQ.textContent = S.lvQs[sel]; place(S.lvQ, mx + 300 - 70, top + 350, 140, 28, 14); S.lvQ.style.lineHeight = '28px';
    S.lvBars.forEach((b, i) => {
      const wPrev = S.lvW[Math.max(0, sel - 1)][i], wNow = S.lvW[sel][i], kk = sel === 0 ? 1 : zspring(t - ps - i * 0.035, 0.7, 20), ww = lerp(wPrev, wNow, Math.min(kk, 1.05)) * 600;
      place(b, mx + 300 - ww / 2, top + 420 + i * 46, Math.max(0, ww), 13, 6.5);
      b.style.background = S.lvMark[sel].includes(i) ? mixHex(L.line2, L.blue, 0.75) : L.line2;
    });
  }
  // ----- scene: the equation -----
  if (show(S.sc, vin(t, T.sc + 0.25, T.scOut))) {
    follow(S.sc, WIN.sc, r);
    let score = 0;
    S.parts.forEach((pp, i) => {
      const a = T.parts[i], p = zspring(t - a, 0.55, 20), on = t >= a;
      pp.box.style.border = on ? `2px solid ${L.blue}` : `2px dashed ${L.line2}`; pp.box.style.background = on ? L.blueSoft : L.s2;
      pp.box.style.transform = on ? `translateY(${((1 - Math.min(p, 1.1)) * 40).toFixed(1)}px) scale(${lerp(0.8, 1, Math.min(p, 1.06)).toFixed(4)})` : 'none';
      pp.t1.words.forEach((w) => { w.style.color = on ? L.blue : L.ink3; });
      pp.t2.style.color = on ? L.blue : L.ink3;
      if (on) score += 25 * clamp(p);
    });
    S.plus.forEach((n, i) => { n.style.opacity = (0.4 + 0.6 * clamp((t - T.parts[i + 1]) * 5)).toFixed(3); });
    const rp = zspring(t - T.result, 0.5, 20), ron = t >= T.result;
    S.res.style.background = ron ? `linear-gradient(180deg, ${L.blueHi}, ${L.blue})` : L.s2; S.res.style.border = ron ? '0' : `2px dashed ${L.line2}`;
    S.res.style.boxShadow = ron ? '0 14px 30px -10px rgba(47,95,230,.55)' : 'none';
    S.res.style.transform = ron ? `scale(${lerp(0.7, 1, Math.min(rp, 1.1)).toFixed(4)})` : 'none';
    S.resT.words.forEach((w) => { w.style.color = ron ? '#ffffff' : L.ink3; });
    const fill = Math.min(100, score) / 100, Cr = WIN.sc;
    place(S.meter, Cr.x + 30 + 300 - 300 * fill, Cr.y - Cr.h / 2 + 560, 600 * fill, 10, 5);
    S.meterT.textContent = Math.round(fill * 100) + '%';
  }
  // ----- lab -----
  if (show(S.lab, vin(t, T.lab + 0.25, T.labOut))) {
    follow(S.lab, WIN.lab, r);
    const on = t >= T.labClick, k = zspring(t - T.labClick, 0.5, 26);
    S.cbx.style.background = on ? L.blue : '#fff'; S.cbx.style.borderColor = on ? L.blue : L.line2;
    S.cbx.style.transform = on ? `scale(${(1 + 0.18 * Math.sin(Math.PI * clamp((t - T.labClick) / 0.22))).toFixed(4)})` : 'none';
    S.cbxTick.style.opacity = on ? clamp(k * 2).toFixed(3) : '0';
    S.cells.forEach((cl, j) => {
      if (!cl.err) { cl.bg.style.background = 'transparent'; return; }
      const a = T.labClick + 0.12 + (j - 1) * 0.12, fixed = t >= a, u = oC(ramp(t, a, a + 0.2));
      cl.bg.style.background = fixed ? mixHex(L.roseSoft, L.mintSoft, u) : L.roseSoft;
      cl.out.textContent = fixed ? '' : '#DIV/0!'; cl.out.style.color = L.rose;
      cl.bg.style.transform = fixed ? `scale(${(1 + 0.06 * Math.sin(Math.PI * u)).toFixed(4)})` : 'none';
    });
    const fu = oC(ramp(t, T.labClick + 0.1, T.labClick + 0.55));
    S.fx0.style.opacity = (1 - clamp(fu * 3)).toFixed(3); S.fx1.style.clipPath = `inset(0 ${(100 - fu * 100).toFixed(1)}% 0 0)`; S.fx1.style.opacity = fu > 0 ? '1' : '0';
  }
  // ----- prompts (dark) -----
  if (show(S.pr, vin(t, T.dark + 0.3, T.prOut))) {
    follow(S.pr, WIN.pr, r);
    const q = 'طلب', n = Math.min(q.length, Math.floor(Math.max(0, t - T.type0) / 0.16));
    S.query.textContent = q.slice(0, n);
    const ptop = WIN.pr.y - WIN.pr.h / 2, cardP = zspring(t - T.pick, 0.78, 15), opened = t >= T.pick;
    S.caret.style.display = t < T.pick ? 'block' : 'none'; S.caret.style.opacity = (Math.floor(t / 0.25) % 2 ? 0.25 : 1).toString();
    const cw = n ? 26 * 0.62 * n + 8 : 0; place(S.caret, WIN.pr.x + 410 - 104 - cw - 4, ptop + 120, 2, 30, 0);
    S.prRows.forEach((rw, i) => {
      const a = T.type0 + 0.35 + i * 0.07, v = oC(ramp(t, a, a + 0.22)) * (1 - (opened ? clamp((t - T.pick) * 6) : 0) * (i ? 1 : 0));
      show(rw.g, i === 0 && opened ? 1 - clamp((t - T.pick - 0.08) * 8) : v, 0);
      rw.g.style.transform = `translateY(${((1 - oC(ramp(t, a, a + 0.22))) * 14).toFixed(1)}px)`;
      const hov = i === 0 && t >= T.pick - 0.35; rw.bg.style.background = hov ? D.s3 : 'transparent';
    });
    // the first row morphs into the card
    const rowR = { x: WIN.pr.x, y: ptop + 212, w: 820, h: 60 }, cardR = { x: WIN.pr.x, y: ptop + 430, w: 820, h: 500 };
    const cq = Math.min(cardP, 1.05);
    S.card.style.display = opened ? 'block' : 'none';
    place(S.card, lerp(rowR.x, cardR.x, cq), lerp(rowR.y, cardR.y, cq), lerp(rowR.w, cardR.w, cq), lerp(rowR.h, cardR.h, cq), lerp(12, 18, clamp(cardP)));
    show(S.cardIn, opened ? oC(ramp(t, T.pick + 0.22, T.pick + 0.45)) : 0, 0);
    S.vars.forEach((vv, i) => {
      const a = T.fill[i], u = oC(ramp(t, a, a + 0.22)), f = t >= a;
      vv.a.style.opacity = (1 - u).toFixed(3); vv.b.style.opacity = u.toFixed(3);
      vv.a.style.visibility = u >= 1 ? 'hidden' : 'visible';
      vv.chip.style.background = f ? mixHex(D.blueSoft, '#11281b', u) : D.blueSoft; vv.chip.style.color = f ? mixHex(D.blue, '#5fd596', u) : D.blue;
      vv.chip.style.transform = f ? `scale(${(1 + 0.08 * Math.sin(Math.PI * u)).toFixed(4)})` : 'none';
      vv.chip.style.minWidth = px(lerp(vv.ph.length * 13 + 40, vv.val.length * 13.5 + 30, u));
    });
    const cp = t >= T.copy ? 1 - 0.07 * Math.sin(Math.PI * clamp((t - T.copy) / 0.16)) : 1;
    S.copyBtn.style.transform = `scale(${cp.toFixed(4)})`;
    const tq = zspring(t - T.copy - 0.08, 0.6, 18);
    show(S.toast, t >= T.copy + 0.06 ? clamp(tq * 2) * (1 - ramp(t, T.prOut - 0.1, T.prOut)) : 0, 0);
    S.toast.style.transform = `translateY(${((1 - Math.min(tq, 1.05)) * 30).toFixed(1)}px)`;
  }
  // ----- quiz (dark) -----
  if (show(S.qz, vin(t, T.qz + 0.25, T.qzOut))) {
    follow(S.qz, WIN.qz, r);
    const picked = t >= T.qzPick, u = oC(ramp(t, T.qzPick, T.qzPick + 0.2));
    S.opts.forEach((o, i) => {
      const a = T.qz + 0.35 + i * 0.08, v = oC(ramp(t, a, a + 0.24));
      o.box.style.opacity = o.tx.style.opacity = o.key.style.opacity = (v * (picked && i ? 1 - 0.5 * u : 1)).toFixed(3);
      o.box.style.transform = `translateY(${((1 - v) * 16).toFixed(1)}px)` + (picked && !i ? ` scale(${(1 + 0.03 * Math.sin(Math.PI * u)).toFixed(4)})` : '');
      o.box.style.borderColor = picked && !i ? mixHex(D.line2, D.mint, u) : D.line2; o.box.style.background = picked && !i ? mixHex(D.win, D.mintSoft, u) : D.win;
      o.key.style.background = picked && !i ? mixHex(D.s3, D.mint, u) : D.s3; o.key.style.color = picked && !i ? `rgba(0,0,0,${(1 - u).toFixed(2)})` : D.ink3;
      o.kc.style.opacity = picked && !i ? u.toFixed(3) : '0';
    });
    const fp = zspring(t - T.qzPick - 0.2, 0.7, 18);
    S.fb.style.opacity = S.fbT.style.opacity = (t >= T.qzPick + 0.2 ? clamp(fp * 2) : 0).toFixed(3);
    S.fb.style.transform = `translateY(${((1 - Math.min(fp, 1.05)) * 16).toFixed(1)}px)`;
  }
  // ----- the 41 pages -----
  const tilesOn = t >= T.tiles - 0.02 && t < T.drop + 0.1;
  S.tileL.style.display = tilesOn ? 'block' : 'none';
  if (tilesOn) {
    S.tiles.forEach((tl, i) => {
      const a = T.tiles + i * 0.008, p = zspring(t - a, 0.6, 20);
      const lit = T.cascade[0] + (tl.n - 1) / 40 * (T.cascade[1] - T.cascade[0]), lu = oC(ramp(t, lit, lit + 0.18));
      const d = Math.hypot(tl.x - 960, tl.y - 330), ia = T.implode + d / 2600 * 0.18, iu = iC(ramp(t, ia, ia + 0.36));
      const x = lerp(tl.x, 960, iu), y = lerp(tl.y, 330, iu), s = lerp(lerp(0.4, 1, Math.min(p, 1.08)), 0.18, iu);
      place(tl.card, x, y, 80, 104, 10);
      tl.card.style.transform = `scale(${s.toFixed(4)}) rotate(${(iu * (i % 2 ? 24 : -24)).toFixed(1)}deg)`;
      tl.card.style.opacity = (clamp(p * 3) * (1 - ramp(iu, 0.75, 1))).toFixed(3);
      tl.bar.style.background = lu > 0 ? mixHex(L.line, tl.c, lu) : L.line;
      tl.num.style.color = lu > 0 ? mixHex(L.ink3, L.ink, lu) : L.ink3;
      tl.card.style.borderColor = lu > 0 && lu < 1 ? mixHex(L.line2, L.blue, Math.sin(Math.PI * lu)) : L.line2;
      const sp = iu > 0 && iu < 1 ? 6 * Math.sin(Math.PI * iu) : 0; tl.card.style.filter = sp > 0.3 ? `blur(${sp.toFixed(2)}px)` : 'none';
    });
  }
  const litN = Math.max(0, Math.min(41, Math.floor((t - T.cascade[0]) / ((T.cascade[1] - T.cascade[0]) / 40)) + 1));
  S.count.words.forEach((w, i) => { if (i === 0) w.textContent = String(t < T.cascade[0] ? 0 : litN); });
  slam(S.count, t, T.tiles + 0.1, T.implode - 0.25, 0);

  // ----- headline column + eyebrow -----
  for (const ln of S.lines) slam(ln.L, t, ln.a, ln.b, themeCopy);
  const ch = S.chapters.findIndex(([a, b]) => t >= a && t < b + 0.3);
  if (ch >= 0) { const [a, b] = S.chapters[ch]; S.eyebrow.words[0].textContent = `0${ch + 1}`; slam(S.eyebrow, t, a, b, themeCopy, { stagger: 0 }); } else S.eyebrow.line.style.display = 'none';

  // ----- circuit lines -----
  S.c1.forEach((p, i) => {
    const a = T.wake + 0.05 + i * 0.06, u = oC(ramp(t, a, a + 0.75)), out = ioC(ramp(t, T.tiles - 0.1, T.tiles + 0.3));
    p.setAttribute('stroke-dashoffset', (1 - u + out).toFixed(4)); p.style.display = t >= a && out < 1 ? 'block' : 'none'; p.style.opacity = (0.9 - 0.4 * theme).toFixed(3);
  });
  S.c2.forEach((p, i) => { const a = T.drop - 0.05 + i * 0.05, u = oC(ramp(t, a, a + 0.7)); p.setAttribute('stroke-dashoffset', (1 - u).toFixed(4)); p.style.display = t >= a ? 'block' : 'none';
    const dot = S.pulses[i], per = 1.6, ph = ((t - T.drop - 0.9 - i * 0.37) % per + per) % per / per, onP = t >= T.drop + 0.9;
    dot.style.display = onP ? 'block' : 'none';
    if (onP) { const len = p.getTotalLength(), pt = p.getPointAtLength(ease.inOutSine(ph) * len); dot.setAttribute('cx', pt.x.toFixed(1)); dot.setAttribute('cy', pt.y.toFixed(1)); dot.setAttribute('opacity', Math.sin(Math.PI * ph).toFixed(3)); } });

  // ----- payoff -----
  const pOn = t >= T.drop - 0.02;
  S.pay.style.display = pOn ? 'block' : 'none';
  if (pOn) {
    const ts = zspring(t - T.drop, 0.5, 18), sq = 1 + 0.07 * Math.max(0, 1 - (t - T.drop) / 0.12);
    place(S.tile, 960, 330, 168, 168, 44);
    S.tile.style.transform = `scale(${lerp(0.2, 1, Math.min(ts, 1.15)).toFixed(4)}, ${(lerp(0.2, 1, Math.min(ts, 1.15)) / sq).toFixed(4)}) rotate(${((1 - clamp(ts)) * -16).toFixed(2)}deg)`;
    S.tile.style.opacity = clamp(ts * 4).toFixed(3);
    slam(S.name, t, T.name, 99, 0, { stagger: 0.07 });
    slam(S.tag, t, T.tag, 99, 0, { stagger: 0.06, zeta: 0.7 });
    S.tag.words.forEach((w) => { w.style.color = L.ink2; });
    S.name.words.forEach((w, i) => { w.style.color = i === 0 ? L.blue : L.ink; });
    const cs = zspring(t - T.cta, 0.55, 20), press = t >= T.ctaClick ? 1 - 0.06 * Math.sin(Math.PI * clamp((t - T.ctaClick) / 0.18)) : 1;
    place(S.cta, 960, 760, 300, 84, 42); S.cta.style.transform = `scale(${(lerp(0.6, 1, Math.min(cs, 1.1)) * press).toFixed(4)})`; S.cta.style.opacity = clamp(cs * 3).toFixed(3);
    S.ctaIcon.style.opacity = clamp((t - T.cta - 0.1) * 5).toFixed(3);
    slam(S.ctaT, t, T.cta + 0.05, 99, 0, { stagger: 0.06 }); S.ctaT.words.forEach((w) => { w.style.color = '#ffffff'; });
    const ru = ramp(t, T.ctaClick, T.ctaClick + 0.6); S.ring.style.display = ru > 0 && ru < 1 ? 'block' : 'none';
    place(S.ring, 960, 760, 300 + ru * 120, 84 + ru * 120, 42 + ru * 60); S.ring.style.opacity = (1 - ru).toFixed(3);
    slam(S.stat, t, T.cta + 0.4, 99, 0, { stagger: 0.03, zeta: 0.75 }); S.stat.words.forEach((w) => { w.style.color = L.ink3; });
    slam(S.credit, t, T.cta + 0.7, 99, 0, { stagger: 0.05, zeta: 0.75 }); S.credit.words.forEach((w) => { w.style.color = L.ink3; });
  }

  // ----- cursor + click ring -----
  const cu = cursor(t), cOn = t >= T.cur0 - 0.6 && !(t > T.implode && t < T.cta + 0.2);
  S.cur.style.display = cOn ? 'block' : 'none';
  S.cur.style.left = px(cu.x - 4); S.cur.style.top = px(cu.y - 3);
  S.cur.style.transform = `rotate(${cu.tilt.toFixed(2)}deg) scale(${cu.s.toFixed(4)})`;
  const lc = CLICKS.filter((x) => t >= x).pop(), cr = lc === undefined ? 1 : ramp(t, lc, lc + 0.42);
  S.clickRing.style.display = cr < 1 && cOn ? 'block' : 'none';
  if (cr < 1) { const d = 14 + 70 * oC(cr); place(S.clickRing, cu.x, cu.y, d, d, d / 2); S.clickRing.style.opacity = (1 - cr).toFixed(3); S.clickRing.style.borderColor = theme > 0.5 ? D.blue : L.blue; }
}

export default {
  duration: 30, fps: 30,
  async init(st, { W: w, H: h }) {
    W = w; H = h; st.style.background = L.bg;
    const css = el('style', {}, document.head);
    const ar = 'unicode-range: U+0600-06FF, U+0750-077F, U+0870-08FF, U+200C-200E, U+2010-2011, U+FB50-FDFF, U+FE70-FEFC;';
    css.textContent = `@font-face{font-family:'AcSans';src:url('../assets/fonts/Inter-latin.woff2') format('woff2');font-weight:100 900;unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF,U+2212;}`
      + [400, 500, 600, 700].map((wt) => `@font-face{font-family:'AcSans';src:url('../assets/fonts/PlexArabic-${wt}.woff2') format('woff2');font-weight:${wt === 700 ? '700 900' : wt};${ar}}`).join('')
      + `@font-face{font-family:'AcMono';src:url('../assets/fonts/JetBrainsMono-latin.woff2') format('woff2');font-weight:100 800;}`;
    await Promise.all(['400 30px AcSans', '500 30px AcSans', '600 30px AcSans', '700 30px AcSans'].flatMap((f) => [document.fonts.load(f, 'أكاديمية'), document.fonts.load(f, 'Aa12')]).concat([document.fonts.load('500 20px AcMono', '01')]));
    build(st);
    GRAIN = grain(st, { opacity: 0.03, tiles: 6, seed: 23 });
  },
  render(t, fr = Math.round(t * 30)) { frame(t); GRAIN(fr); },
};
