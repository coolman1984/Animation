// Film 13 — Hessa «٤ أسئلة» — the 9:16 REELS cut of film 12. 1080×1920 @ 30 fps, 25 s, same 120 BPM clock and the same score (film12/timing.js, film12/score.mjs).
// Not a letterboxed landscape: every chapter is re-composed for the phone. Copy stays inside the published safe band (x 65–1015, y 269–1248); the bottom third gets motion only.
//   hook: ball hops down four ruled lines (right margin) · A: 7×17 student field, card born from the dot · B: the form closes on save, two receipts print side by side
//   C: one column of rows (FLIP sort), moon toggle · D: night modal · payoff: chips → 2×2 tiles → logo tile, the owner's poster lines.
// Owner order: no offline-use claim anywhere. All data fictional.
import { cursorAt, cursorClick } from '../lib/uimorph.js';
import { grain } from '../lib/motion.js';
import { PRESENT, dotLit, GX, GY } from '../film12/timing.js';
import { clamp, lerp, ramp, ease, el, hash, T, C, DISP, UIF, px, oE, ioC, oC, ioQ, sm, spr, div, place, setBlur, pulse, mixHex, num, icon, tline, colourMark, rise } from '../film12/kit.js';

const W = 1080, H = 1920, CX = 540, CY = 960;
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const S = {}, SC = [];
let stage, shell, hudLayer, ball, ballGlow, curNode, curRing, noteNode;
const QS = ['مين حضر؟', 'مين دفع؟', 'مين عليه فلوس؟', 'والدرج فيه كام؟'];
const SHAKES = [[T.hop[0], 0.8], [T.hop[1], 0.9], [T.hop[2], 1.0], [T.hop[3], 1.35], [T.HIT, 2.0]];

// ---------- small UI builders ----------
const box = (parent, x, y, w, h, st = {}) => div(parent, { left: px(x), top: px(y), width: px(w), height: px(h), ...st });
const txt = (parent, s, x, y, w, { size = 24, weight = 400, color = C.text, font = UIF, align = 'right', lh = 1.25, h, st = {} } = {}) => {
  const n = div(parent, { left: px(x), top: px(y), width: px(w), height: h ? px(h) : 'auto', fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, textAlign: align, lineHeight: String(lh), whiteSpace: 'nowrap', direction: 'rtl', ...st });
  n.textContent = s; return n;
};
const chipBox = (parent, s, x, y, w, h, { bg, color, size = 22, weight = 500, font = UIF, r = 999 } = {}) => {
  const n = box(parent, x, y, w, h, { background: bg, borderRadius: px(r), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, whiteSpace: 'nowrap', direction: 'rtl' });
  n.textContent = s; return n;
};
const gridCss = (c, s = 60) => `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px ${s}px), repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px ${s}px)`;
const camera = (cam, t, a, b, k = 0.035) => { const u = ramp(t, a, b); cam.style.transform = `scale(${(1 + k * ioC(u)).toFixed(4)}) translate(${(-8 * u).toFixed(2)}px, ${(-8 * u).toFixed(2)}px)`; };
const circleClip = (n, r, x, y) => { n.style.clipPath = r >= 2600 ? 'none' : `circle(${Math.max(0, r).toFixed(1)}px at ${x}px ${y}px)`; };
const bgGrid = (parent, c) => div(parent, { left: '-60px', top: '-60px', width: px(W + 120), height: px(H + 120), backgroundImage: gridCss(c, 60) });

// ---------- the hero dot in the hook (portrait): a ball hopping down four ruled lines along the right margin ----------
const PH = { xBall: 992, R: 44, y0: 520, pitch: 190, drop: 70, x0: 70, x1: 1014, tx0: 60, tx1: 930 };
const lineY = (i) => PH.y0 + i * PH.pitch, floorY = (i) => lineY(i) + PH.drop;
const HOOKC = { x: CX, y: CY + 14 };
function ballAt(t) {
  const L = T.hop, R = PH.R, fl = [0, 1, 2, 3].map(floorY);
  let x = PH.xBall, bottom, sx = 1, sy = 1, r = R;
  if (t < L[0]) { const u = t / L[0]; bottom = lerp(150, fl[0], u * u); sy = 1 + 0.2 * sm(0.55, 1, u); sx = 1 - 0.08 * sm(0.55, 1, u); }
  else if (t < T.hookExit) {
    let i = 0; while (i < 3 && t >= L[i + 1]) i++;
    const last = i === 3, t0 = L[i], t1 = last ? T.hookExit : L[i + 1], u = ramp(t, t0, t1), h = last ? 0 : 150;
    bottom = last ? fl[3] : lerp(fl[i], fl[i + 1], u) - 4 * h * u * (1 - u);
    if (!last) { const v = Math.abs(1 - 2 * u); sy = 1 + 0.16 * v * v * v; sx = 1 - 0.07 * v * v * v; }
    const tau = t - t0, sq = tau < 0.12 ? Math.sin(Math.PI * tau / 0.12) : 0; sy *= 1 - 0.34 * sq; sx *= 1 + 0.28 * sq;
    if (last) for (const b of [2.5, 3.0]) { const q = t - b; if (q > 0 && q < 0.2) { const k = Math.sin(Math.PI * q / 0.2); sy *= 1 - 0.14 * k; sx *= 1 + 0.1 * k; } }
  } else {
    const u = ramp(t, T.hookExit, T.A), e = ioC(u), by = lerp(fl[3], HOOKC.y, e) - Math.sin(Math.PI * u) * 360;
    r = lerp(R, 14, ioC(ramp(t, T.hookExit + 0.1, T.A)));
    return { x: lerp(PH.xBall, HOOKC.x, e), y: by, sx: 1 - 0.05 * Math.sin(Math.PI * u), sy: 1 + 0.12 * Math.sin(Math.PI * u), r };
  }
  return { x, y: bottom - R * sy, sx, sy, r };
}

// =====================================================================================================
// HOOK
SC.push({ id: 'hook', a: 0, b: 4.5, z: 1, init(root) {
  full(root, { background: `radial-gradient(ellipse 90% 70% at 70% 45%, #101C38 0%, ${C.ink} 72%)` });
  const grid = bgGrid(root, 'rgba(120,160,230,0.05)');
  const glow = div(root, { width: '1200px', height: '1200px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(242,169,0,0.30), rgba(242,169,0,0))' });
  const rules = [0, 1, 2, 3].map((i) => ({ base: box(root, PH.x0, floorY(i) - 2, PH.x1 - PH.x0, 4, { background: 'rgba(255,255,255,0.14)', borderRadius: '2px' }), lit: box(root, PH.x1, floorY(i) - 3, 0, 6, { background: C.amberL, borderRadius: '3px', opacity: '0' }) }));
  const lines = QS.map((q, i) => { const L = tline(root, q, { size: 94, weight: 800, cy: lineY(i), x0: PH.tx0, x1: PH.tx1, z: 5 }); colourMark(L, C.amber); return L; });
  S.hook = { root, grid, glow, rules, lines };
}, render(t) {
  const s = S.hook, b = ballAt(Math.min(t, T.A - 0.001));
  s.grid.style.transform = `translate(${(-24 * t / 4).toFixed(1)}px, ${(24 * t / 4).toFixed(1)}px)`;
  place(s.glow, b.x - 40, b.y, 1200, 1200); s.glow.style.opacity = (0.75 * (1 - sm(3.5, 4.3, t))).toFixed(3);
  s.rules.forEach((r, i) => {
    const L0 = T.hop[i], p = oE(ramp(t, L0, L0 + 0.45)), len = (PH.x1 - PH.x0) * p, out = 1 - sm(3.45, 3.95, t);
    r.lit.style.left = px(PH.x1 - len); r.lit.style.width = px(len);
    r.lit.style.height = px(4 + 3 * pulse(t, L0, 0.18)); r.lit.style.top = px(floorY(i) - 2 - 1.5 * pulse(t, L0, 0.18));
    r.lit.style.opacity = (t < L0 ? 0 : (0.4 + 0.55 * Math.exp(-(t - L0) * 3.2)) * out).toFixed(3);
    r.base.style.opacity = out.toFixed(3);
  });
  s.lines.forEach((L, i) => {
    const t0 = T.hop[i] + 0.02, tOut = 3.45 + i * 0.06, vis = t >= t0 && t <= tOut + 0.6;
    L.line.style.display = vis ? 'flex' : 'none'; if (!vis) return;
    L.words.forEach((w, k) => {
      const a = t0 + k * 0.06, e = spr(t, a, 0.5, 0.26), kk = clamp(e, 0, 1.08), o = ioC(ramp(t, tOut + k * 0.03, tOut + k * 0.03 + 0.4));
      w.style.opacity = (clamp((t - a) / 0.07) * (1 - clamp(o * 1.6))).toFixed(3);
      w.style.transform = `translate(${((1 - kk) * 120).toFixed(1)}px, ${(-o * 40).toFixed(1)}px) scale(${(lerp(0.72, 1, kk) * (1 + 0.05 * o)).toFixed(4)})`;
      setBlur(w, (1 - clamp(e)) * 14 + o * 12);
    });
  });
} });

// =====================================================================================================
// A — مين حضر؟  (the student field turns 90°: 7 columns × 17 rows; the card is born from the dot)
const FX = (j) => CX + (j - 3) * 135, FY = (i) => CY + (i - 8) * 75;
const countAt = (t) => { let n = 0; for (const k of PRESENT) { const [i, j] = k.split(',').map(Number); if (t >= dotLit(i, j)) n++; } return n; };
const CARD = { x: 110, y: 750, w: 860, h: 420 }, BTN = { y: 296, h: 100 };
SC.push({ id: 'attend', a: 3.7, b: 8.15, z: 2, init(root) {
  full(root, { background: `radial-gradient(ellipse 90% 60% at 50% 46%, #1B3764 0%, ${C.navy} 55%, #0D1C36 100%)` });
  const cam = full(root, {});
  const grid = bgGrid(cam, 'rgba(120,160,230,0.05)');
  const numeral = div(cam, { left: '0', top: px(CY - 360), width: px(W), height: '720px', textAlign: 'center', fontFamily: DISP, fontWeight: '900', fontSize: '600px', lineHeight: '720px', color: 'rgba(255,255,255,0.06)' });
  const cv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H) } }, cam);
  const card = box(cam, CARD.x, CARD.y, CARD.w, CARD.h, { background: C.white, borderRadius: '36px', boxShadow: '0 50px 110px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.4) inset', transformOrigin: '50% 50%' });
  const input = box(card, 32, 32, CARD.w - 64, 92, { background: C.surf2, borderRadius: '22px', border: `3px solid ${C.amber}`, boxShadow: '0 0 0 7px rgba(242,169,0,0.18)' });
  const mag = icon(input, 'search', 38, C.text3, { sw: 2 }); mag.style.right = '26px'; mag.style.top = '27px';
  const ph = txt(input, 'كود البطاقة أو الاسم أو رقم الهاتف', 24, 22, 640, { size: 30, color: C.text3 });
  const typed = txt(input, '', 24, 20, 640, { size: 40, weight: 500, color: C.text }); typed.style.right = '86px'; typed.style.left = 'auto'; typed.style.width = 'auto';
  const caret = box(input, 0, 24, 4, 44, { background: C.amber }); caret.style.right = '78px'; caret.style.left = 'auto';
  const row = box(card, 32, 148, CARD.w - 64, 120, { opacity: '0' });
  const av = box(row, CARD.w - 64 - 84, 18, 80, 80, { background: C.navy, borderRadius: '50%', color: '#fff', fontFamily: DISP, fontWeight: '700', fontSize: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }); av.textContent = 'س';
  txt(row, 'سلمى محمود', 150, 12, 560, { size: 44, weight: 500 });
  chipBox(row, 'رياضيات · الصف الثالث الإعدادي', 250, 70, 430, 40, { bg: '#E2ECFC', color: '#1F5FCF', size: 24, r: 20 });
  const btn = box(cam, CARD.x + 32, CARD.y + BTN.y, CARD.w - 64, BTN.h, { background: C.amber, borderRadius: '22px', boxShadow: '0 12px 28px rgba(242,169,0,0.35)', overflow: 'hidden' });
  const bt = txt(btn, 'تسجيل الحضور', 0, 24, CARD.w - 64, { size: 40, weight: 700, color: '#201500', align: 'center', font: DISP });
  const key = chipBox(btn, 'Enter', 36, 28, 110, 44, { bg: 'rgba(255,255,255,0.7)', color: '#201500', size: 24, weight: 500, r: 10 });
  const bck = icon(btn, 'check', 54, '#201500', { sw: 3 }); bck.style.top = '23px'; bck.style.opacity = '0';
  const plate = box(cam, 0, 1090, W, 150, { background: 'linear-gradient(180deg, rgba(13,28,54,0) 0%, rgba(13,28,54,0.92) 30%, rgba(13,28,54,0.92) 70%, rgba(13,28,54,0) 100%)', opacity: '0' });
  const line = tline(cam, 'بكارت.. أو اسم.. أو رقم', { size: 66, weight: 800, cy: 1165, x0: 65, x1: 1015, justify: 'center', z: 9 });
  S.attend = { root, cam, grid, numeral, cv, g: cv.getContext('2d'), card, ph, typed, caret, row, btn, bt, key, bck, line, plate };
}, render(t) {
  const s = S.attend, g = s.g;
  circleClip(s.root, lerp(24, 1500, ioC(ramp(t, T.A - 0.02, T.A + 0.6))), CX, CY);
  camera(s.cam, t, T.A, T.aOut, 0.03);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const n = countAt(t);
  for (let i = 0; i < GX; i++) for (let j = 0; j < GY; j++) {
    const x = FX(j), y = FY(i), d = Math.hypot((i - 8) * 75, (j - 3) * 135), ap = spr(t, T.A + 0.05 + d / 1800, 0.45, 0.3);
    if (ap <= 0) continue;
    const pres = PRESENT.has(i + ',' + j), L = dotLit(i, j), u = t - L;
    let r = 7 * clamp(ap, 0, 1.2), col = C.navy3, ch = 0;
    if (u > 0 && pres) { const k = spr(t, L, 0.42, 0.38); r = lerp(7, 25, clamp(k, 0, 1.25)); col = mixHex(C.navy3, C.amber, sm(0, 0.12, u)); ch = ramp(u, 0.07, 0.3); r += 0.7 * Math.sin(t * 2.2 + hash(i, j, 5) * 6.28) * sm(0.5, 1, u); }
    else if (u > 0) { r = 7 - 3 * pulse(t, L, 0.3); col = mixHex(C.navy3, '#1E2F55', 0.7); }
    else if (i === 8 && j === 3) { r = 0; }
    g.fillStyle = col; g.globalAlpha = (u > 0 && !pres ? 0.5 : 0.95) * clamp(ap * 1.5); g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 6.2832); g.fill(); g.globalAlpha = 1;
    if (ch > 0) { g.strokeStyle = '#201500'; g.lineWidth = 3.6; g.lineCap = 'round'; g.lineJoin = 'round'; const s0 = [x - 9, y + 1], s1 = [x - 3, y + 7], s2 = [x + 10, y - 7]; g.beginPath(); g.moveTo(...s0);
      const a1 = clamp(ch * 2), a2 = clamp(ch * 2 - 1); g.lineTo(lerp(s0[0], s1[0], a1), lerp(s0[1], s1[1], a1)); if (a2 > 0) g.lineTo(lerp(s1[0], s2[0], a2), lerp(s1[1], s2[1], a2)); g.stroke(); }
  }
  s.numeral.textContent = String(n); s.numeral.style.opacity = (sm(T.aWave0, T.aWave0 + 0.3, t) * (1 - sm(T.aOut, T.aOut + 0.4, t))).toFixed(3);
  const cIn = spr(t, T.aCard, 0.55, 0.2), cOut = ioC(ramp(t, T.aClick + 0.12, T.aClick + 0.42)), cs = lerp(0.04, 1, clamp(cIn, 0, 1.06)) * (1 - 0.07 * cOut);
  s.card.style.transform = `scale(${cs.toFixed(4)})`; s.card.style.opacity = (clamp(cIn * 3) * (1 - cOut)).toFixed(3); setBlur(s.card, (1 - clamp(cIn)) * 10 + cOut * 10);
  s.card.style.display = t >= T.aCard - 0.01 && cOut < 1 ? 'block' : 'none';
  const word = 'سلمى محمود', k = Math.floor(clamp(ramp(t, T.aType0, T.aType1)) * word.length + 1e-6);
  s.typed.textContent = word.slice(0, k); s.ph.style.opacity = (1 - sm(T.aType0 - 0.05, T.aType0 + 0.05, t)).toFixed(3);
  s.caret.style.opacity = (t > T.aType0 - 0.1 && t < T.aRow + 0.4 ? (Math.floor(t * 2.4) % 2 === 0 || t < T.aType1 ? 1 : 0.15) : 0).toFixed(3);
  const rin = oE(ramp(t, T.aRow, T.aRow + 0.4)); s.row.style.opacity = rin.toFixed(3); s.row.style.transform = `translateY(${((1 - rin) * 22).toFixed(1)}px)`;
  const press = pulse(t, T.aClick - 0.06, 0.16), mu = ioC(ramp(t, T.aClick + 0.04, T.aClick + 0.36)), fly = ioC(ramp(t, T.aClick + 0.34, T.aClick + 0.6));
  const kk = clamp(cs, 0, 1.06), ccx = CARD.x + CARD.w / 2, ccy = CARD.y + CARD.h / 2, bw0 = (CARD.w - 64) * kk, bh0 = BTN.h * kk;
  const by = ccy + (CARD.y + BTN.y + BTN.h / 2 - ccy) * kk, bw = lerp(bw0, 100, mu), bh = lerp(bh0, 100, mu);
  const cy = lerp(by, CY, fly), sc = lerp(1, 14 / 50, fly) * (1 - 0.04 * press);
  place(s.btn, ccx, cy, bw, bh, lerp(22, 50, mu) * Math.max(0.2, kk)); s.btn.style.transform = `scale(${sc.toFixed(4)})`;
  s.btn.style.display = t >= T.aCard - 0.01 && t < T.aWave0 + 0.02 ? 'block' : 'none';
  s.btn.style.opacity = clamp(cIn * 3).toFixed(3); s.btn.style.boxShadow = `0 ${(12 * (1 - mu)).toFixed(0)}px ${(28 * (1 - mu)).toFixed(0)}px rgba(242,169,0,${(0.35 * (1 - mu)).toFixed(2)})`;
  s.bt.style.opacity = (1 - sm(T.aClick, T.aClick + 0.1, t)).toFixed(3); s.key.style.opacity = s.bt.style.opacity;
  s.bck.style.opacity = (sm(T.aClick + 0.02, T.aClick + 0.2, t) * (1 - fly)).toFixed(3); s.bck.style.left = px(bw / 2 - 27);
  s.plate.style.opacity = (sm(T.aLine - 0.05, T.aLine + 0.3, t) * (1 - sm(T.aOut, T.aOut + 0.4, t))).toFixed(3);
  rise(s.line, t, T.aLine, T.aOut + 0.35, { stagger: 0.09, dur: 0.7, dy: 22 });
} });

// =====================================================================================================
// B — مين دفع؟  the form closes on save; two receipts (original + reversal) print side by side
const PR = { y: 1030, wy: 330, ww: 520, pw: 400, ph: 600, s: 400 / 340, x1: 70, x2: 610 };
const BCARD = { x: 110, y: 340, w: 860, h: 600 };
SC.push({ id: 'paid', a: 7.4, b: 12.25, z: 3, init(root) {
  full(root, { background: `radial-gradient(ellipse 90% 60% at 50% 40%, #FFC94F 0%, ${C.amber} 55%, #E09700 100%)` });
  const cam = full(root, {});
  const grid = bgGrid(cam, 'rgba(19,41,75,0.07)');
  const cw = BCARD.w, iw = cw - 64;
  const card = box(cam, BCARD.x, BCARD.y, cw, BCARD.h, { background: C.white, borderRadius: '36px', boxShadow: '0 40px 90px rgba(80,50,0,0.35)', transformOrigin: '50% 50%' });
  txt(card, 'تحصيل من سلمى محمود', 32, 30, iw, { size: 38, weight: 700, font: DISP, color: C.text });
  chipBox(card, 'رياضيات · بالحصة', cw - 32 - 330, 96, 330, 48, { bg: '#E2ECFC', color: '#1F5FCF', size: 26, r: 14 });
  txt(card, 'المبلغ', 32, 168, iw, { size: 26, weight: 500, color: C.text2 });
  const field = box(card, 32, 206, iw, 104, { background: '#fff', border: `3px solid ${C.amber}`, borderRadius: '20px', boxShadow: '0 0 0 7px rgba(242,169,0,0.16)' });
  const amt = box(field, 0, 0, 0, 66, { background: C.amber, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISP, fontWeight: '800', fontSize: '60px', color: '#201500' }); amt.style.right = '28px'; amt.style.left = 'auto'; amt.style.top = '18px';
  txt(field, 'ج.م', 28, 32, 110, { size: 30, weight: 500, color: C.text3, align: 'left' });
  txt(card, 'طريقة الدفع', 32, 336, iw, { size: 26, weight: 500, color: C.text2 });
  const seg = box(card, 32, 374, iw, 84, { background: C.surf2, borderRadius: '20px', border: `1px solid ${C.line}` });
  ['نقدًا', 'فودافون كاش', 'إنستاباي', 'فوري'].forEach((m, i) => { const on = i === 0, sw = (iw - 12) / 4; const c = chipBox(seg, m, iw - 6 - (i + 1) * sw, 8, sw - 2, 66, { bg: on ? '#fff' : 'transparent', color: on ? C.text : C.text2, size: on ? 28 : 24, weight: on ? 600 : 500, r: 14 }); if (on) c.style.boxShadow = '0 2px 8px rgba(15,27,51,0.18)'; });
  const btn = box(card, 32, 482, iw, 192 - 74, { background: C.amber, borderRadius: '22px', boxShadow: '0 12px 28px rgba(242,169,0,0.35)', transformOrigin: '50% 50%' });
  txt(btn, 'حفظ الإيصال', 0, 26, iw, { size: 40, weight: 700, font: DISP, color: '#201500', align: 'center' });
  const bck = icon(btn, 'check', 48, '#201500', { sw: 3 }); bck.style.left = '150px'; bck.style.top = '35px';
  // two printers, scaled ×1.18 from the landscape receipt
  const s = PR.s;
  const mk = (x0, kind) => {
    const win = box(cam, x0 - 60, PR.wy, PR.ww, PR.y - PR.wy, { overflow: 'hidden' });
    const paper = box(win, 60, PR.y - PR.wy - PR.ph, PR.pw, PR.ph, { background: '#fff', boxShadow: '0 18px 40px rgba(80,50,0,0.30), 0 2px 6px rgba(80,50,0,0.2)' });
    const bx = (p, x, y, w, h, st) => box(p, x * s, y * s, w * s, h * s, st);
    const tx = (p, t0, x, y, w, o = {}) => txt(p, t0, x * s, y * s, w * s, { ...o, size: (o.size || 24) * s });
    const zig = el('svg', { viewBox: '0 0 340 12', width: PR.pw, height: 12 * s, style: { position: 'absolute', left: '0', top: px(-11 * s) } }, paper); let d = 'M0 12 L0 4'; for (let x = 10; x <= 340; x += 10) d += ` L${x} ${x % 20 ? 12 : 4}`; d += ' L340 12 Z'; el('path', { d, fill: '#fff' }, zig);
    const red = kind === 'rev', ink = red ? C.redD : C.text;
    const logo = bx(paper, 262, 26, 52, 52, { background: red ? C.red : C.amber, borderRadius: px(14 * s) }); icon(logo, red ? 'x' : 'cap', 30 * s, red ? '#fff' : '#201500', { sw: 2.2, style: { left: px(11 * s), top: px(11 * s) } });
    tx(paper, red ? 'قيد عكسي' : 'إيصال تحصيل', 24, 30, 230, { size: 32, weight: 800, font: DISP, color: ink });
    tx(paper, red ? 'يعكس الإيصال 000142' : 'رقم 000142', 24, 74, 230, { size: 21, color: C.text3 });
    bx(paper, 24, 118, 292, 0, { borderTop: `2px dashed ${C.line}` });
    const rows = red ? [['السبب', 'تصحيح مبلغ'], ['الطالب', 'سلمى محمود'], ['الطريقة', 'نقدًا']] : [['الطالب', 'سلمى محمود'], ['المادة', 'رياضيات'], ['الطريقة', 'نقدًا']];
    rows.forEach((r, i) => { tx(paper, r[0], 200, 140 + i * 48, 116, { size: 21, color: C.text3 }); tx(paper, r[1], 24, 138 + i * 48, 176, { size: 24, weight: 500, color: C.text, align: 'left' }); });
    bx(paper, 24, 296, 292, 0, { borderTop: `2px dashed ${C.line}` });
    tx(paper, red ? 'المبلغ' : 'الإجمالي', 200, 318, 116, { size: 22, weight: 500, color: C.text2 });
    tx(paper, red ? '− 45' : '45', 24, 304, 176, { size: 60, weight: 800, font: DISP, color: red ? C.red : C.text, align: 'left', st: { direction: 'ltr' } });
    tx(paper, 'ج.م', 24, 372, 80, { size: 22, weight: 500, color: C.text3, align: 'left' });
    if (red) { const net = bx(paper, 24, 424, 292, 56, { background: C.greenSoft, borderRadius: px(14 * s), opacity: '0' }); txt(net, 'الصافي ج.م 0', 0, 12 * s, 292 * s, { size: 26 * s, weight: 700, color: C.greenD, align: 'center' }); paper._net = net; }
    const bc = el('svg', { viewBox: '0 0 292 44', width: 292 * s, height: 44 * s, style: { position: 'absolute', left: px(24 * s), top: px((red ? 496 : 448) * s) } }, paper); let x = 0, k = 0; while (x < 292) { const w = 2 + (hash(k, red ? 9 : 4) * 5 | 0); el('rect', { x, y: 0, width: w, height: 44, fill: C.text }, bc); x += w + 2 + (hash(k, 8) * 3 | 0); k++; }
    if (!red) tx(paper, 'احتفظ بهذا الإيصال', 24, 500, 292, { size: 20, color: C.text3, align: 'center' });
    const pr = box(cam, x0 - 30, PR.y - 6, 460, 70, { background: 'linear-gradient(180deg, #24365A 0%, #0F1B33 100%)', borderRadius: '24px', boxShadow: '0 22px 40px rgba(60,40,0,0.45)' });
    box(pr, 26, 0, 408, 13, { background: '#050A14', borderRadius: '0 0 6px 6px' });
    const led = box(pr, 420, 32, 13, 13, { background: C.amberL, borderRadius: '50%' });
    return { win, paper, pr, led, x0 };
  };
  const R1 = mk(PR.x1, 'orig'), R2 = mk(PR.x2, 'rev');
  const stamp = box(R1.win, 60 + 96 * s, PR.y - PR.ph - PR.wy + 416 * s, 220 * s, 70 * s, { border: `4px solid ${C.red}`, borderRadius: '16px', color: C.red, fontFamily: DISP, fontWeight: '800', fontSize: px(44 * s), display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-8deg)', opacity: '0' });
  stamp.textContent = 'معكوس';
  const action = box(R1.win, 60 + 24 * s, PR.y - PR.ph - PR.wy + 430 * s, 200 * s, 48 * s, { background: C.redSoft, borderRadius: '16px', color: C.redD, fontFamily: UIF, fontWeight: '500', fontSize: px(24 * s), display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: '0' }); action.textContent = 'قيد عكسي';
  const lk = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, cam);
  const ay = 700;
  const arc = el('path', { d: `M 482 ${ay} C 510 ${ay - 60}, 570 ${ay - 60}, 598 ${ay}`, fill: 'none', stroke: C.navy, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': '1 1', pathLength: '1', 'stroke-dashoffset': '1' }, lk);
  const head = el('path', { d: `M 582 ${ay - 22} L 599 ${ay + 2} L 574 ${ay + 6}`, fill: 'none', stroke: C.navy, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '0' }, lk);
  const lab = chipBox(cam, 'يعكس', 540 - 56, ay - 112, 112, 46, { bg: C.navy, color: '#fff', size: 26, weight: 600, r: 23 }); lab.style.opacity = '0';
  const line = tline(cam, 'الإيصال مبيتمسحش.. بيتعكس', { size: 54, weight: 800, cy: 1170, x0: 65, x1: 1015, justify: 'center', color: C.ink, z: 9 });
  S.paid = { root, cam, grid, card, field, amt, btn, bck, R1, R2, stamp, action, arc, head, lab, line };
}, render(t) {
  const s = S.paid;
  circleClip(s.root, lerp(24, 1500, ioC(ramp(t, T.A + 3.45, T.B))), CX, CY);
  const scroll = ioQ(ramp(t, T.bOut, T.C + 0.1)); s.root.style.transform = `translateY(${(-H * scroll).toFixed(1)}px)`;
  camera(s.cam, t, T.B, T.bOut, 0.03);
  const cIn = spr(t, T.bCard, 0.55, 0.22), cOut = ioC(ramp(t, T.bClick + 0.12, T.bClick + 0.45));            // the form closes on save (as the product's dialog does)
  s.card.style.transform = `translateY(${((1 - clamp(cIn, 0, 1.05)) * 70 - cOut * 90).toFixed(1)}px) scale(${(lerp(0.9, 1, clamp(cIn, 0, 1.05)) * (1 - 0.1 * cOut)).toFixed(4)})`;
  s.card.style.opacity = (clamp(cIn * 3) * (1 - cOut)).toFixed(3); s.card.style.display = cOut < 1 ? 'block' : 'none';
  const aw = lerp(0, 112, ioC(ramp(t, T.bAmount, T.bAmount + 0.22))); s.amt.style.width = px(aw); s.amt.textContent = aw > 48 ? '45' : '';
  const press = pulse(t, T.bClick - 0.05, 0.16); s.btn.style.transform = `scale(${(1 - 0.045 * press).toFixed(4)})`; s.btn.style.background = mixHex(C.amber, '#FFC23D', press);
  const feed = (t0, dur) => { const u = ramp(t, t0, t0 + dur), n = 14, v = u * n; return u >= 1 ? 1 : (Math.floor(v) + oC(v % 1)) / n; };
  const q1 = feed(T.bPrint1, 0.78), q2 = feed(T.bPrint2, 0.78);
  s.R1.paper.style.transform = `translateY(${((1 - q1) * (PR.ph + 20)).toFixed(1)}px)`; s.R2.paper.style.transform = `translateY(${((1 - q2) * (PR.ph + 20)).toFixed(1)}px)`;
  s.R1.led.style.opacity = (0.4 + 0.6 * (q1 > 0 && q1 < 1 ? 1 : 0)).toFixed(2); s.R2.led.style.opacity = (0.4 + 0.6 * (q2 > 0 && q2 < 1 ? 1 : 0)).toFixed(2);
  s.R1.pr.style.opacity = s.R2.pr.style.opacity = clamp((t - T.bClick) * 6).toFixed(3);
  s.R1.pr.style.display = s.R1.win.style.display = t >= T.bClick - 0.05 ? 'block' : 'none';
  s.R2.pr.style.display = s.R2.win.style.display = t >= T.bRev0 - 0.05 ? 'block' : 'none';
  const act = oE(ramp(t, T.bPrint1 + 0.7, T.bPrint1 + 0.95)); s.action.style.opacity = (act * (1 - sm(T.bRev0 + 0.05, T.bRev0 + 0.2, t))).toFixed(3); s.action.style.transform = `scale(${(1 - 0.06 * pulse(t, T.bRev0 - 0.06, 0.16)).toFixed(3)})`;
  const sp = spr(t, T.bRev0 + 0.55, 0.4, 0.34); s.stamp.style.opacity = clamp(sp * 2.5).toFixed(3); s.stamp.style.transform = `rotate(-8deg) scale(${lerp(1.7, 1, clamp(sp, 0, 1.1)).toFixed(3)})`;
  const al = ramp(t, T.bRev0 + 0.5, T.bRev0 + 0.95); s.arc.setAttribute('stroke-dashoffset', (1 - ioC(al)).toFixed(3)); s.head.setAttribute('opacity', (al >= 1 ? 1 : 0).toFixed(1));
  s.lab.style.opacity = clamp((al - 0.3) * 3).toFixed(3); s.lab.style.transform = `scale(${lerp(0.7, 1, clamp(spr(t, T.bRev0 + 0.7, 0.4, 0.3), 0, 1.1)).toFixed(3)})`;
  const net = spr(t, T.bNet, 0.45, 0.3); s.R2.paper._net.style.opacity = clamp(net * 2).toFixed(3); s.R2.paper._net.style.transform = `scale(${lerp(0.8, 1, clamp(net, 0, 1.1)).toFixed(3)})`;
  rise(s.line, t, T.bLine, T.bOut - 0.05, { stagger: 0.09, dur: 0.7, dy: 22 });
} });

// =====================================================================================================
// C — مين عليه فلوس؟  one column of rows; the moon toggle flips the world to night
const ROWS = [
  { n: 'ملك أحمد', s: 'إنجليزي', d: 0 }, { n: 'يوسف عادل', s: 'رياضيات', d: 330 }, { n: 'ندى حسام', s: 'علوم', d: 0 }, { n: 'عمر خالد', s: 'رياضيات', d: 75 },
  { n: 'مريم طارق', s: 'عربي', d: 650 }, { n: 'كريم ياسر', s: 'علوم', d: 150 }, { n: 'آدم سامي', s: 'إنجليزي', d: 0 }, { n: 'هدى سعيد', s: 'رياضيات', d: 540 },
];
const ORDER = ROWS.map((r, i) => i).sort((a, b) => (ROWS[b].d > 0) - (ROWS[a].d > 0) || ROWS[b].d - ROWS[a].d);
const FINAL = ROWS.map((r, i) => ORDER.indexOf(i));
const WIN = { x: 60, y: 350, w: 960, h: 760 }, RY0 = WIN.y + 190, RH = 68;
const MOON = { x: WIN.x + 40 + 2 * 52 + 14, y: WIN.y + 38 };
const flagAt = (i) => T.cCount0 + ORDER.indexOf(i) * 0.1;
SC.push({ id: 'dues', a: 11.6, b: 15.3, z: 4, init(root) {
  full(root, { background: C.paper });
  const cam = full(root, {});
  bgGrid(cam, 'rgba(19,41,75,0.05)');
  const win = box(cam, WIN.x, WIN.y, WIN.w, WIN.h, { background: '#fff', borderRadius: '34px', boxShadow: '0 40px 100px rgba(15,27,51,0.22), 0 0 0 1px rgba(15,27,51,0.06)', overflow: 'hidden', transformOrigin: '50% 50%' });
  box(win, 0, 0, WIN.w, 76, { background: '#fff', borderBottom: `1px solid ${C.line}` });
  const sr = box(win, 280, 14, 400, 48, { background: C.surf2, borderRadius: '24px', border: `1px solid ${C.line}` }); txt(sr, 'ابحث أو انتقل إلى...', 60, 11, 290, { size: 22, color: C.text3 }); icon(sr, 'search', 24, C.text3, { sw: 2, style: { right: '18px', top: '12px' } });
  const ics = ['keyboard', 'help', 'moon', 'globe'].map((n, k) => icon(win, n, 28, C.text2, { sw: 1.8, style: { left: px(40 + k * 52), top: '24px' } }));
  txt(win, 'الطلاب', 40, 98, 880, { size: 44, weight: 800, font: DISP });
  txt(win, 'ملفات الطلاب والقيد وروابط أولياء الأمور.', 40, 154, 880, { size: 21, color: C.text3 });
  const pill = box(win, 40, 98, 430, 52, { background: C.surf2, borderRadius: '26px', border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UIF, fontSize: '23px', fontWeight: '500', color: C.text2, direction: 'rtl', whiteSpace: 'nowrap' }); pill.textContent = 'الطلاب: 420';
  const rows = ROWS.map((r, i) => {
    const rw = WIN.w - 60;
    const row = box(win, 30, 0, rw, RH - 8, { background: '#fff', borderRadius: '18px', border: `1px solid ${C.line2}` });
    const dot = box(row, rw - 36, 23, 14, 14, { background: C.red, borderRadius: '50%', opacity: '0' });
    box(row, rw - 94, 8, 44, 44, { background: C.navy, borderRadius: '50%', color: '#fff', fontFamily: DISP, fontWeight: '700', fontSize: '23px', display: 'flex', alignItems: 'center', justifyContent: 'center' }).textContent = r.n[0];
    txt(row, r.n, 400, 13, rw - 94 - 14 - 400, { size: 31, weight: 500 });
    chipBox(row, r.s, 258, 14, 120, 34, { bg: '#E2ECFC', color: '#1F5FCF', size: 21, r: 17 });
    const amt = txt(row, r.d ? `ج.م ${r.d}` : '', 26, 10, 210, { size: 30, weight: 700, font: DISP, color: C.redD, align: 'left', st: { direction: 'rtl', opacity: '0' } });
    const ok = chipBox(row, 'مسدّد', 26, 14, 120, 34, { bg: C.greenSoft, color: C.greenD, size: 21, r: 17 }); ok.style.opacity = r.d ? '0' : '1';
    return { row, dot, amt, ok, r };
  });
  const line = tline(cam, 'بالاسم.. وبالمبلغ', { size: 66, weight: 800, cy: 1190, x0: 65, x1: 1015, justify: 'center', color: C.ink, z: 9 });
  S.dues = { root, cam, win, pill, rows, ics, line };
}, render(t) {
  const s = S.dues;
  s.root.style.transform = `translateY(${(H * (1 - ioQ(ramp(t, T.bOut, T.C + 0.1)))).toFixed(1)}px)`;
  camera(s.cam, t, T.C, 15.0, 0.02);
  let cnt = 0, sum = 0;
  s.rows.forEach((o, i) => {
    const r = o.r, a = flagAt(i), fl = r.d ? sm(a, a + 0.18, t) : 0, e = clamp(spr(t, T.cSort + (ORDER.indexOf(i)) * 0.045, 0.62, 0.18), 0, 1.04), mv = lerp(i, FINAL[i], e);
    const y = RY0 + mv * RH, ent = spr(t, T.cList + i * 0.05, 0.5, 0.2);
    o.row.style.top = px(y - WIN.y); o.row.style.opacity = (clamp(ent * 3) * (r.d || t < T.cSort ? 1 : lerp(1, 0.5, sm(T.cSort + 0.3, T.cSort + 0.8, t)))).toFixed(3);
    o.row.style.transform = `translateX(${((1 - clamp(ent, 0, 1.05)) * 60).toFixed(1)}px)`;
    o.row.style.background = mixHex('#FFFFFF', '#FDF1F1', fl); o.row.style.borderColor = mixHex(C.line2, '#F2B8B8', fl);
    o.dot.style.opacity = fl.toFixed(3); o.dot.style.transform = `scale(${(1 + 0.6 * pulse(t, a, 0.25)).toFixed(3)})`;
    o.amt.style.opacity = fl.toFixed(3); o.ok.style.opacity = (r.d ? 0 : clamp(ent * 2)).toFixed(3);
    if (r.d && t >= a + 0.05) { cnt++; sum += r.d; }
  });
  const cs = Math.min(sum, 1745), up = pulse(t, T.cCount0, 1.2);
  s.pill.textContent = cnt ? `عليهم مستحقات: ${cnt} · ج.م ${num(cs)}` : 'الطلاب: 420';
  s.pill.style.background = cnt ? '#FBE2E2' : C.surf2; s.pill.style.color = cnt ? C.redD : C.text2; s.pill.style.borderColor = cnt ? '#F2B8B8' : C.line;
  s.pill.style.transform = `scale(${(1 + 0.04 * up).toFixed(3)})`;
  const moon = s.ics[2], k = sm(T.cMoon, T.cMoon + 0.12, t); moon.setAttribute('stroke', mixHex(C.text2, C.amberD, clamp(k))); moon.style.transform = `scale(${(1 + 0.3 * pulse(t, T.cMoon - 0.05, 0.3)).toFixed(3)})`;
  rise(s.line, t, T.cLine, 14.95, { stagger: 0.09, dur: 0.7, dy: 22 });
} });

// =====================================================================================================
// D — والدرج فيه كام؟
const DEN = [[200, 6], [100, 11], [50, 10], [20, 17], [10, 15], [5, 14], [1, 60], [0.5, 0]];
const EXPECTED = 3420;
const MOD = { x: 60, y: 340, w: 960, h: 730 };
SC.push({ id: 'drawer', a: 14.5, b: 19.35, z: 5, init(root) {
  full(root, { background: `radial-gradient(ellipse 90% 60% at 50% 42%, #16243F 0%, ${C.night} 70%)` });
  const cam = full(root, {});
  bgGrid(cam, 'rgba(120,160,230,0.045)');
  const mod = box(cam, MOD.x, MOD.y, MOD.w, MOD.h, { background: C.nightS, borderRadius: '34px', border: `1px solid ${C.nightLine}`, boxShadow: '0 50px 120px rgba(0,0,0,0.6)', transformOrigin: '50% 50%' });
  txt(mod, 'إغلاق الوردية', 36, 30, MOD.w - 72, { size: 40, weight: 700, font: DISP, color: C.nightInk });
  icon(mod, 'x', 30, C.nightInk2, { style: { left: '34px', top: '38px' } });
  txt(mod, 'عُدّ الأوراق النقدية في الخزنة، وستقارنها حصة بالمبلغ المفترض.', 36, 94, MOD.w - 72, { size: 22, color: C.nightInk2 });
  box(mod, 0, 138, MOD.w, 0, { borderTop: `1px solid ${C.nightLine}` });
  const tiles = DEN.map(([d, c], i) => {
    const col = i % 4, rw = Math.floor(i / 4), x = 709 - col * 222, y = 160 + rw * 150;
    const tile = box(mod, x, y, 208, 136, { background: C.nightS2, borderRadius: '18px', border: `1px solid ${C.nightLine}`, boxSizing: 'border-box' });
    txt(tile, String(d), 0, 8, 208, { size: 32, weight: 700, font: DISP, color: C.nightInk, align: 'center' });
    const inp = box(tile, 16, 54, 176, 52, { background: C.night, borderRadius: '13px', border: `2px solid ${C.nightLine}`, boxSizing: 'border-box' });
    const cn = txt(inp, '0', 0, 5, 176, { size: 30, weight: 600, font: DISP, color: C.nightInk, align: 'center' });
    const sb = txt(tile, '0', 0, 108, 208, { size: 20, color: C.nightInk2, align: 'center' });
    return { tile, inp, cn, sb, d, c };
  });
  box(mod, 0, 474, MOD.w, 0, { borderTop: `1px solid ${C.nightLine}` });
  const mkBox = (title, x) => { const b = box(mod, x, 494, 286, 112, { background: C.nightS2, borderRadius: '18px', border: `1px solid ${C.nightLine}`, boxSizing: 'border-box' }); txt(b, title, 20, 12, 246, { size: 22, color: C.nightInk2 }); const v = txt(b, '', 20, 50, 246, { size: 36, weight: 700, font: DISP, color: C.nightInk }); return { b, v }; };
  const bExp = mkBox('المفترض في الخزنة', 643), bCnt = mkBox('الجرد الفعلي', 337), bDif = mkBox('الفرق', 31);
  const btn = box(mod, 36, 640, 320, 66, { background: C.amber, borderRadius: '18px', boxShadow: '0 10px 24px rgba(242,169,0,0.3)', overflow: 'hidden', transformOrigin: '50% 50%' });
  const bt = txt(btn, 'إغلاق الوردية', 0, 16, 320, { size: 30, weight: 700, font: DISP, color: '#201500', align: 'center', st: { paddingLeft: '54px', boxSizing: 'border-box' } });
  const bl = icon(btn, 'lock', 32, '#201500', { sw: 2.4, style: { left: '26px', top: '17px' } });
  txt(mod, 'إلغاء', 390, 654, 110, { size: 28, weight: 500, color: C.nightInk, align: 'left' });
  const line = tline(cam, 'والفرق قدّامك', { size: 66, weight: 800, cy: 1190, x0: 65, x1: 1015, justify: 'center', color: C.white, z: 9 });
  S.drawer = { root, cam, mod, tiles, bExp, bCnt, bDif, btn, bt, bl, line };
}, render(t) {
  const s = S.drawer;
  circleClip(s.root, lerp(26, 2500, ioC(ramp(t, T.cMoon, T.cReveal1))), MOON.x, MOON.y);
  camera(s.cam, t, T.D, T.dOut, 0.03);
  const mIn = spr(t, T.dModal, 0.6, 0.2), mOut = ioC(ramp(t, T.dOut, T.PAY + 0.3));
  s.mod.style.transform = `translateY(${((1 - clamp(mIn, 0, 1.05)) * 70 - mOut * 40).toFixed(1)}px) scale(${(lerp(0.92, 1, clamp(mIn, 0, 1.05)) * (1 - 0.12 * mOut)).toFixed(4)})`;
  s.mod.style.opacity = (clamp(mIn * 3) * (1 - mOut)).toFixed(3);
  let counted = 0;
  s.tiles.forEach((o, i) => {
    const a = T.dTile0 + i * T.dTileStep, u = ioC(ramp(t, a, a + 0.5)), cnt = Math.round(o.c * u), sub = o.d * cnt;
    counted += sub; o.cn.textContent = String(cnt); o.sb.textContent = sub ? `ج.م ${num(sub)}${sub % 1 ? '.5' : ''}` : '0';
    const hot = pulse(t, a, 0.55) * (o.c ? 1 : 0); o.inp.style.borderColor = mixHex(C.nightLine, C.amber, hot); o.tile.style.transform = `scale(${(1 + 0.025 * hot).toFixed(3)})`;
    o.sb.style.color = sub ? mixHex(C.nightInk2, C.amberL, 0.6 * sm(0, 0.2, u)) : C.nightInk2;
  });
  s.bExp.v.textContent = `ج.م ${num(EXPECTED)}`; s.bCnt.v.textContent = `ج.م ${num(counted)}`;
  const diff = counted - EXPECTED, ok = counted === EXPECTED && t >= T.dZero - 0.05;
  s.bDif.v.textContent = ok ? 'ج.م 0' : `ج.م −${num(Math.abs(diff))}`; s.bDif.v.style.color = ok ? C.green : C.red;
  s.bDif.b.style.borderColor = ok ? C.green : (t > T.dTile0 ? '#7a2f35' : C.nightLine);
  s.bDif.b.style.background = ok ? '#0F3324' : C.nightS2; s.bDif.b.style.transform = `scale(${(1 + 0.06 * pulse(t, T.dZero, 0.4)).toFixed(3)})`;
  s.bCnt.b.style.borderColor = ok ? mixHex(C.nightLine, C.amber, 0.6) : C.nightLine;
  const press = pulse(t, T.dClick - 0.05, 0.16), done = sm(T.dClick + 0.05, T.dClick + 0.3, t);
  s.btn.style.transform = `scale(${(1 - 0.05 * press).toFixed(4)})`; s.btn.style.background = mixHex(C.amber, '#1FBF75', done);
  s.bt.textContent = done > 0.5 ? 'أُغلقت الوردية' : 'إغلاق الوردية';
  s.bl.style.transform = `scale(${(1 + 0.3 * pulse(t, T.dClick, 0.35)).toFixed(3)})`;
  rise(s.line, t, T.dLine, T.dOut + 0.2, { stagger: 0.09, dur: 0.7, dy: 22 });
} });

// =====================================================================================================
// PAYOFF — four chips become a 2×2 grid of tiles, converge on the dot, the logo tile blooms; the owner's poster lines
const TILES = [
  { label: 'الحضور اليوم', v: 82, fmt: (v) => String(Math.round(v)), icon: 'users' },
  { label: 'المحصّل اليوم', v: 3420, fmt: (v) => `ج.م ${num(v)}`, icon: 'sheet' },
  { label: 'الرسوم المستحقة', v: 1745, fmt: (v) => `ج.م ${num(v)}`, icon: 'alert' },
  { label: 'فرق الدرج', v: 0, fmt: () => 'ج.م 0', icon: 'check' },
];
const CHIPS = [{ q: 'مين حضر؟', a: 'حضر', v: () => String(Math.min(82, countAt(T.chip[0] + 0.2))) }, { q: 'مين دفع؟', a: 'دفع', v: () => 'ج.م 45' }, { q: 'مين عليه فلوس؟', a: 'عليه فلوس', v: () => '5' }, { q: 'والدرج فيه كام؟', a: 'فرق الدرج', v: () => '0' }];
const CHIP_W = 228, CHIP_H = 58, CHIP_Y = 300, CHIP_X = (i) => CX + (1.5 - i) * 238;
const TILE_W = 440, TILE_H = 300, TILE_X = (i) => (i % 2 === 0 ? CX + 235 : CX - 235), TILE_Y = (i) => (i < 2 ? 520 : 850);
const HERO = { x: CX, y: 540, s: 260, wordY: 800 }, ROW = { y: 385, tileX: 392, tileS: 128, wordX: 672 };
const slam = (L, t, t0, { stagger = 0.08, dur = 0.55, s0 = 1.14 } = {}) => {
  L.line.style.display = t >= t0 - 0.005 ? 'flex' : 'none'; if (t < t0 - 0.005) return;
  L.words.forEach((w, i) => { const k = spr(t, t0 + i * stagger, dur, 0.3), kk = clamp(k, 0, 1.1); w.style.opacity = clamp(k * 3).toFixed(3); w.style.transform = `translateY(${((1 - kk) * 34).toFixed(1)}px) scale(${lerp(s0, 1, kk).toFixed(4)})`; setBlur(w, (1 - clamp(k)) * 14); });
};
SC.push({ id: 'pay', a: 18.6, b: 25.1, z: 6, init(root) {
  full(root, { background: `radial-gradient(ellipse 90% 55% at 50% 40%, #1B3764 0%, ${C.navy} 48%, #0A1428 100%)` });
  const grid = bgGrid(root, 'rgba(120,160,230,0.05)');
  const halo = box(root, HERO.x - 800, HERO.y - 800, 1600, 1600, { borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(242,169,0,0.36), rgba(242,169,0,0))' });
  const cv = el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H) } }, root);
  const tile = box(root, HERO.x - HERO.s / 2, HERO.y - HERO.s / 2, HERO.s, HERO.s, { borderRadius: '68px', background: 'linear-gradient(160deg, #FFC94F 0%, #F2A900 55%, #D98F00 100%)', boxShadow: '0 30px 70px rgba(242,169,0,0.38), 0 0 0 1px rgba(255,255,255,0.25) inset', transformOrigin: '50% 50%' });
  const clip = box(tile, 0, 0, HERO.s, HERO.s, { overflow: 'hidden', borderRadius: '68px' });
  const shine = box(clip, -140, -30, 80, 330, { background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))', transform: 'rotate(20deg)' });
  icon(tile, 'cap', 146, '#201500', { sw: 1.9, style: { left: px((HERO.s - 146) / 2), top: px((HERO.s - 146) / 2) } });
  const core = box(root, 0, 0, 10, 10, { borderRadius: '50%', background: 'radial-gradient(circle at 36% 30%, #FFE08A 0%, #FFC23D 40%, #F2A900 100%)', boxShadow: '0 0 70px rgba(242,169,0,0.85)', opacity: '0' });
  const word = tline(root, 'حِصّة', { size: 150, weight: 900, cy: ROW.y, x0: ROW.wordX - 330, x1: ROW.wordX + 330, justify: 'center', z: 8 });
  const h1 = tline(root, 'سنترك كله', { size: 140, weight: 900, cy: 610, x0: 65, x1: 1015, justify: 'center', z: 8 });
  const h2 = tline(root, 'قدام عينك', { size: 140, weight: 900, cy: 800, x0: 65, x1: 1015, justify: 'center', color: C.amberL, z: 8 });
  const sub = tline(root, 'برنامج لإدارة السنتر', { size: 52, weight: 500, cy: 950, x0: 65, x1: 1015, justify: 'center', color: '#C9D6EE', z: 8 });
  const cta = box(root, CX - 420, 1115 - 50, 840, 100, { borderRadius: '50px', background: 'linear-gradient(180deg, #FFD15C 0%, #F2A900 100%)', boxShadow: '0 18px 40px rgba(242,169,0,0.38), 0 0 0 1px rgba(255,255,255,0.3) inset', transformOrigin: '50% 50%', overflow: 'hidden' });
  txt(cta, 'راسلني واحجز عرض البرنامج', 0, 22, 840, { size: 42, weight: 800, font: DISP, color: '#201500', align: 'center', st: { paddingLeft: '80px', boxSizing: 'border-box' } });
  icon(cta, 'send', 48, '#201500', { sw: 2.2, style: { left: '78px', top: '26px', transform: 'rotate(-12deg)' } });
  const sheen = box(cta, -160, -10, 90, 130, { background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.65), rgba(255,255,255,0))', transform: 'rotate(18deg)' });
  const ring1 = box(root, 0, 0, 10, 10, { borderRadius: '50%', border: `4px solid ${C.amberL}`, opacity: '0' }), ring2 = box(root, 0, 0, 10, 10, { borderRadius: '50%', border: `3px solid ${C.white}`, opacity: '0' });
  S.pay = { root, grid, halo, cv, g: cv.getContext('2d'), tile, shine, word, h1, h2, sub, cta, sheen, ring1, ring2, core };
}, render(t) {
  const s = S.pay, hit = T.HIT, p2 = ioQ(ramp(t, T.shift, T.shift + 0.5));
  s.root.style.opacity = sm(T.PAY - 0.4, T.PAY + 0.1, t).toFixed(3);
  const p = spr(t, hit - 0.06, 0.6, 0.3), beat = pulse(t % 0.5, 0, 0.5) * sm(hit + 0.9, hit + 1.2, t);
  s.tile.style.opacity = clamp(p * 3).toFixed(3); setBlur(s.tile, (1 - clamp(p)) * 18);
  const k0 = lerp(0.2, 1, clamp(p, 0, 1.12)) * lerp(1, ROW.tileS / HERO.s, p2) * (1 + 0.012 * beat);
  s.tile.style.transform = `translate(${lerp(0, ROW.tileX - HERO.x, p2).toFixed(1)}px, ${lerp(0, ROW.y - HERO.y, p2).toFixed(1)}px) scale(${k0.toFixed(4)}) rotate(${lerp(-12, 0, clamp(p, 0, 1.1)).toFixed(2)}deg)`;
  s.shine.style.left = px(lerp(-160, 340, ioC(ramp(t, hit + 0.55, hit + 1.25))));
  s.halo.style.opacity = (sm(hit, hit + 0.5, t) * (0.75 + 0.15 * Math.sin(t * 2.2)) * (1 - 0.35 * p2)).toFixed(3);
  for (const [n, d] of [[s.ring1, 0], [s.ring2, 0.12]]) { const u = ramp(t, hit + d, hit + d + 1.1), r = lerp(80, 1000, oE(u)); place(n, HERO.x, HERO.y, 2 * r, 2 * r, r); n.style.opacity = (u > 0 && u < 1 ? 0.7 * Math.pow(1 - u, 1.5) : 0).toFixed(3); }
  { const c = ioQ(ramp(t, hit - 0.4, hit - 0.02)), z = (6 + 70 * c) * (1 - sm(hit, hit + 0.16, t)); place(s.core, HERO.x, HERO.y, z, z, z / 2); s.core.style.opacity = (c > 0 && z > 0.5 ? 1 : 0).toFixed(1); }
  s.word.line.style.display = t >= hit + 0.1 ? 'flex' : 'none';
  s.word.line.style.transform = `translate(${lerp(HERO.x - ROW.wordX, 0, p2).toFixed(1)}px, ${lerp(HERO.wordY - ROW.y, 0, p2).toFixed(1)}px) scale(${lerp(230 / 150, 1, p2).toFixed(4)})`;
  s.word.words.forEach((w, i) => { const k = spr(t, hit + 0.14 + i * 0.07, 0.55, 0.3); w.style.opacity = clamp(k * 3).toFixed(3); w.style.transform = `scale(${lerp(1.5, 1, clamp(k, 0, 1.1)).toFixed(4)}) translateY(${((1 - clamp(k, 0, 1.1)) * -40).toFixed(1)}px)`; setBlur(w, (1 - clamp(k)) * 14); });
  slam(s.h1, t, T.tag); slam(s.h2, t, T.tag + 0.32);
  rise(s.sub, t, T.sub, 99, { stagger: 0.07, dur: 0.8, dy: 26 });
  const ck = spr(t, T.cta, 0.6, 0.3), br = 1 + 0.016 * pulse(t % 1, 0, 1) * sm(T.cta + 0.8, T.cta + 1.1, t);
  s.cta.style.opacity = clamp(ck * 3).toFixed(3); s.cta.style.transform = `translateY(${((1 - clamp(ck, 0, 1.08)) * 56).toFixed(1)}px) scale(${(lerp(0.9, 1, clamp(ck, 0, 1.08)) * br).toFixed(4)})`;
  s.sheen.style.left = px(lerp(-160, 1000, ioC(ramp(t, T.cta + 0.55, T.cta + 1.3))));
  // embers: the students who came back drift up around the copy (never behind it)
  const g = s.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  if (t >= hit) { const lt = t - hit; for (let i = 0; i < 82; i++) {
    const e = spr(t, hit + 0.1 + hash(i, 2) * 0.5, 0.8, 0.1), x = hash(i, 1) * W, y = ((hash(i, 3) * (H + 200) - lt * (24 + 34 * hash(i, 4))) % (H + 200) + (H + 200)) % (H + 200) - 100;
    const inText = x > 70 && x < 1010 && y > 250 && y < 1200; if (inText) continue;
    g.globalAlpha = clamp(e * 2) * (0.22 + 0.3 * (0.5 + 0.5 * Math.sin(lt * 1.5 + i))); g.fillStyle = i % 9 === 0 ? C.white : C.amber; g.beginPath(); g.arc(x, y, 3 + 4 * hash(i, 5), 0, 6.2832); g.fill(); } }
  g.globalAlpha = 1;
} });

// =====================================================================================================
// global layers
const CUR = [
  { a: 4.9, b: 5.95, keys: [{ t: 4.9, x: 900, y: 1280 }, { t: 5.2, x: 600, y: 1112, arc: 60 }, { t: 5.9, x: 700, y: 1250, arc: 40 }], clicks: [T.aClick] },
  { a: 9.0, b: 10.7, keys: [{ t: 9.0, x: 800, y: 1250 }, { t: 9.18, x: 640, y: 880, arc: 50 }, { t: 9.55, x: 560, y: 1120, arc: 20 }, { t: 9.98, x: 232, y: 976, arc: 50 }, { t: 10.6, x: 400, y: 1230, arc: 40 }], clicks: [T.bClick, T.bRev0] },
  { a: 13.55, b: 14.85, keys: [{ t: 13.55, x: 760, y: 1000 }, { t: 14.5, x: MOON.x, y: MOON.y + 6, arc: 120 }, { t: 14.85, x: MOON.x + 90, y: MOON.y + 90, arc: 30 }], clicks: [T.cMoon] },
  { a: 16.75, b: 17.95, keys: [{ t: 16.75, x: 760, y: 1150 }, { t: 17.28, x: MOD.x + 36 + 160, y: MOD.y + 640 + 33, arc: 70 }, { t: 17.95, x: 600, y: 1130, arc: 30 }], clicks: [T.dClick] },
];
const NOTE = [[4.2, 8.0, 'rgba(255,255,255,0.6)'], [8.0, 12.0, 'rgba(19,41,75,0.7)'], [12.0, 15.0, 'rgba(19,41,75,0.6)'], [15.0, 19.2, 'rgba(255,255,255,0.55)']];

export default {
  duration: 25, fps: 30,
  async init(st) {
    stage = st; st.style.background = C.ink;
    shell = full(stage, { zIndex: '1' });
    SC.forEach((s) => { s.root = full(shell, { overflow: 'hidden', zIndex: String(s.z), display: 'none' }); s.init(s.root); });
    ballGlow = div(shell, { width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(242,169,0,0.5), rgba(242,169,0,0))', zIndex: '44', pointerEvents: 'none' });
    ball = div(shell, { borderRadius: '50%', background: 'radial-gradient(circle at 36% 30%, #FFE08A 0%, #FFC23D 38%, #F2A900 70%, #C98600 100%)', boxShadow: '0 0 40px rgba(242,169,0,0.45)', zIndex: '45', pointerEvents: 'none' });
    hudLayer = full(shell, { zIndex: '40', pointerEvents: 'none' });
    S.hud = CHIPS.map((c, i) => {
      const node = div(hudLayer, { borderRadius: '29px', overflow: 'hidden', boxSizing: 'border-box', transformOrigin: '50% 50%' });
      const mini = div(node, { left: '0', top: '0', width: '100%', height: '100%' });
      const q = txt(mini, c.q, 0, 14, CHIP_W, { size: 24, weight: 600, font: DISP, color: '#AEBBD3', align: 'center' });
      const a = div(mini, { left: '0', top: '0', width: '100%', height: '100%', opacity: '0' });
      const ck = box(a, 0, 13, 32, 32, { background: C.amber, borderRadius: '50%' }); icon(ck, 'check', 20, '#201500', { sw: 3.2, style: { left: '6px', top: '6px' } }); ck.style.right = '12px'; ck.style.left = 'auto';
      const al = txt(a, c.a, 0, 14, 150, { size: 23, weight: 700, font: DISP, color: C.navy, align: 'right', st: { right: '52px', left: 'auto' } });
      const av = txt(a, '', 0, 14, 70, { size: 23, weight: 800, font: DISP, color: C.amberD, align: 'left', st: { left: '14px' } });
      const big = div(node, { left: '0', top: '0', width: '100%', height: '100%', opacity: '0' });
      const ti = TILES[i];
      const ic = box(big, 0, 0, 84, 84, { background: C.navy2, borderRadius: '24px' }); ic.style.right = '32px'; ic.style.top = '32px'; ic.style.left = 'auto'; icon(ic, ti.icon, 44, C.amberL, { sw: 1.8, style: { left: '20px', top: '20px' } });
      const bl = txt(big, ti.label, 0, 140, TILE_W, { size: 34, weight: 500, color: C.nightInk2, st: { right: '32px', left: 'auto', width: '380px' } });
      const bv = txt(big, '0', 0, 196, TILE_W, { size: 64, weight: 800, font: DISP, color: C.white, st: { right: '32px', left: 'auto', width: '380px' } });
      return { node, mini, q, a, al, av, big, bl, bv, i };
    });
    noteNode = div(shell, { left: px(70), top: px(1208), width: '600px', fontFamily: UIF, fontSize: '22px', fontWeight: '400', direction: 'rtl', whiteSpace: 'nowrap', zIndex: '46', textAlign: 'left' }); noteNode.textContent = 'عرض توضيحي · بيانات تجريبية';
    curNode = el('svg', { viewBox: '0 0 40 48', style: { position: 'absolute', left: '0', top: '0', width: '56px', height: '67px', zIndex: '60', overflow: 'visible', pointerEvents: 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))' } }, shell);
    el('path', { d: 'M3 3 L3 35 L12 27 L20 44 L27 40 L19 24 L32 24 Z', fill: '#fff', stroke: '#0F1B33', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, curNode);
    curRing = div(shell, { width: '10px', height: '10px', borderRadius: '50%', border: `4px solid ${C.amber}`, zIndex: '59', opacity: '0', pointerEvents: 'none' });
    div(stage, { width: px(W), height: px(H), zIndex: '80', pointerEvents: 'none', background: 'radial-gradient(ellipse 100% 90% at 50% 50%, transparent 62%, rgba(2,6,16,0.32) 100%)' });
    S.grain = grain(stage, { opacity: 0.05, tiles: 8, size: 256, seed: 12 }); stage.lastChild.style.zIndex = '90';
    S.flash = div(stage, { width: px(W), height: px(H), zIndex: '95', background: '#fff', opacity: '0', pointerEvents: 'none' });
  },
  render(t, frame = Math.round(t * 30)) {
    let sx = 0, sy = 0, sr = 0;
    for (const [t0, a] of SHAKES) { const tau = t - t0; if (tau < 0 || tau > 0.5) continue; const d = Math.exp(-tau * 10) * a; sx += Math.sin(tau * 80 + t0) * 6 * d; sy += (Math.abs(Math.cos(tau * 70)) * 12) * d; sr += Math.sin(tau * 64) * 0.25 * d; }
    shell.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) rotate(${sr.toFixed(3)}deg)`;
    for (const s of SC) { const on = t >= s.a && t < s.b; s.root.style.display = on ? 'block' : 'none'; if (on) s.render(t); }
    const b = ballAt(Math.min(t, T.A - 0.0005)), bvis = t < T.aCard + 0.02 ? 1 : 0;
    place(ball, b.x, b.y, 2 * b.r * b.sx, 2 * b.r * b.sy, 0); ball.style.borderRadius = `${(b.r * b.sx).toFixed(1)}px / ${(b.r * b.sy).toFixed(1)}px`;
    ball.style.display = bvis ? 'block' : 'none'; ballGlow.style.display = bvis ? 'block' : 'none'; place(ballGlow, b.x, b.y, 260 * (b.r / 44 + 0.3), 260 * (b.r / 44 + 0.3));
    ballGlow.style.opacity = (0.8 * (1 - sm(T.hookExit, T.A, t) * 0.4)).toFixed(3); ball.style.opacity = (1 - sm(T.aCard - 0.12, T.aCard + 0.02, t)).toFixed(3);
    const hudIn = sm(T.A + 0.2, T.A + 0.6, t), morph = ioQ(ramp(t, T.PAY, T.PAY + 0.75)), collapse = ioQ(ramp(t, T.HIT - 0.4, T.HIT - 0.02));
    S.hud.forEach((h, i) => {
      const isAns = t >= T.chip[i];
      const x = lerp(CHIP_X(i), TILE_X(i), morph), y = lerp(CHIP_Y, TILE_Y(i), morph), w = lerp(CHIP_W, TILE_W, morph), hh = lerp(CHIP_H, TILE_H, morph);
      const cs = 1 - collapse, cx = lerp(x, HERO.x, collapse), cy = lerp(y, HERO.y, collapse);
      place(h.node, cx, cy, w * cs, hh * cs, lerp(29, 40, morph));
      h.node.style.display = t >= T.A + 0.1 && t < T.HIT + 0.08 ? 'block' : 'none';
      h.node.style.opacity = (hudIn * (1 - sm(T.HIT - 0.05, T.HIT + 0.05, t))).toFixed(3);
      const pop = isAns ? 1 + 0.13 * Math.sin(Math.PI * clamp((t - T.chip[i]) / 0.4)) : 1;
      h.node.style.transform = `scale(${pop.toFixed(4)})`;
      h.node.style.background = mixHex(mixHex(isAns ? '#FFFFFF' : C.navy, C.navy2, sm(0, 0.2, morph)), C.nightS, sm(0.2, 0.6, morph));
      h.node.style.border = `2px solid ${morph > 0.5 ? C.nightLine : (isAns ? 'rgba(255,255,255,0.0)' : 'rgba(255,255,255,0.22)')}`;
      h.node.style.boxShadow = isAns && morph < 0.5 ? '0 10px 26px rgba(0,0,0,0.28)' : (morph > 0.3 ? '0 24px 60px rgba(0,0,0,0.45)' : 'none');
      h.q.style.opacity = (1 - sm(T.chip[i] - 0.02, T.chip[i] + 0.08, t)).toFixed(3);
      h.a.style.opacity = sm(T.chip[i], T.chip[i] + 0.12, t).toFixed(3);
      h.av.textContent = i === 0 ? String(Math.min(82, countAt(t))) : CHIPS[i].v();
      h.mini.style.opacity = (1 - sm(T.PAY + 0.02, T.PAY + 0.22, t)).toFixed(3);
      h.big.style.opacity = sm(T.PAY + 0.15, T.PAY + 0.45, t).toFixed(3);
      const tv = TILES[i], cu = ioC(ramp(t, T.PAY + 0.5, T.HIT - 0.05)); h.bv.textContent = tv.fmt(tv.v * cu);
    });
    let cvis = 0, cp = { x: -200, y: -200 };
    for (const w of CUR) if (t >= w.a - 0.12 && t <= w.b + 0.12) { cp = cursorAt(w.keys, t); cvis = sm(w.a - 0.12, w.a + 0.1, t) * (1 - sm(w.b - 0.1, w.b + 0.12, t)); }
    const ck = cursorClick(t, CUR.flatMap((w) => w.clicks));
    curNode.style.transform = `translate(${(cp.x - 4).toFixed(1)}px, ${(cp.y - 4).toFixed(1)}px) scale(${ck.scale.toFixed(3)})`; curNode.style.opacity = cvis.toFixed(3);
    place(curRing, cp.x, cp.y, 2 * ck.ring.r, 2 * ck.ring.r, ck.ring.r); curRing.style.opacity = (ck.ring.opacity * cvis).toFixed(3);
    let nc = 'rgba(255,255,255,0)', nv = 0; for (const [a, bb, c] of NOTE) if (t >= a && t < bb) { nc = c; nv = sm(a, a + 0.3, t) * (1 - sm(bb - 0.25, bb, t)); }
    noteNode.style.color = nc; noteNode.style.opacity = nv.toFixed(3);
    S.flash.style.opacity = (0.55 * Math.pow(Math.max(0, 1 - (t - T.HIT) / 0.2), 2) * (t >= T.HIT ? 1 : 0)).toFixed(3);
    S.grain(frame);
  },
};
