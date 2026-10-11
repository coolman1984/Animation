// Film 22 — «Claude Code» — 10 s Reels ad, 1080×1920 @ 30 fps, 120 BPM. House method: one hero (the orange terminal cursor) does every job —
// it is the problem's blinking cursor, the window it grows into, the typing caret, the bullet of each step the agent takes, the edit marker on the
// fixed line, the dot that visits three tests, and finally the circle that wipes the world cream for the payoff.
// Methods of the 2026-10-11 notes: springs by damping ratio (motion.js zspring), every beat computed from time (timing.js), subframe motion blur
// (config.subframes), named ban list (BRIEF). Every frame is a closed-form function of t.
import { clamp, lerp, ramp, ease, el, textLine, grain } from '../lib/motion.js';
import { T, HITS, tb } from './timing.js';
import { zspring, spr, hero, cursorOn, typedCount, WIN, PROMPT, ROWS, DIFF, CHIP, HOOK_CURSOR } from './motion.js';

const C = { ink: '#15130f', panel: '#1e1b17', panel2: '#12100d', line: '#3a342c', cream: '#f4efe6', dim: '#8a8174', orange: '#d97757', orangeD: '#b9553a', red: '#ef6f63', green: '#6fcf97', greenD: '#173226', redD: '#3a1f1b' };
const DISP = "'Alexandria'", MONO = "'Space Mono'";
let W = 1080, H = 1920, CAM, STAGE, GRAIN;
const px = (v) => `${(+v).toFixed(2)}px`;
const oC = ease.outCubic, ioC = ease.inOutCubic;
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const rect = (n, x, y, w, h, r) => { n.style.left = px(x - w / 2); n.style.top = px(y - h / 2); n.style.width = px(Math.max(0, w)); n.style.height = px(Math.max(0, h)); if (r !== undefined) n.style.borderRadius = px(r); };
const op = (n, o) => { n.style.opacity = clamp(o).toFixed(3); };
const vis = (n, on) => { n.style.display = on ? 'block' : 'none'; };
const blur = (n, b) => { n.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : 'none'; };

// Arabic/Latin display line: words are spans (.line/.word) so the studio's text gates read it.
function words(parent, text, { size, weight = 800, color = C.cream, cy, cx = W / 2, width = W, dir = 'rtl', accent = {}, z = 6 } = {}) {
  const L = textLine(parent, text, { left: px(cx - width / 2), top: px(cy - size * 0.6), width: px(width), justifyContent: 'center', fontFamily: DISP, fontSize: px(size), fontWeight: String(weight), color, lineHeight: '1.2', direction: dir, zIndex: String(z) });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; });
  return L;
}
// Slam: scale 1.35 → 1 on a ζ 0.5 spring (overshoot stays under the 1.14 text rule), blur resolves, exits blur-lift.
function slam(L, t, tIn, tOut = 99, { stagger = 0.09, zeta = 0.5, w = 24 } = {}) {
  const outDur = 0.3, on = t >= tIn - 0.01 && t <= tOut + outDur + L.words.length * 0.03 + 0.02;
  L.line.style.display = on ? 'flex' : 'none'; if (!on) return;
  L.words.forEach((wd, i) => {
    const a = tIn + i * stagger, s = zspring(t - a, zeta, w), q = ioC(ramp(t, tOut + i * 0.03, tOut + i * 0.03 + outDur));
    wd.style.opacity = (clamp(s * 3) * (1 - q)).toFixed(3);
    wd.style.transform = `scale(${lerp(1.35, 1, Math.min(s, 1.14)).toFixed(4)}) translateY(${(q * -30).toFixed(2)}px)`;
    blur(wd, (1 - clamp(s)) * 14 + q * 10);
  });
}
// Mono text: one span.word with preserved spaces, left-aligned at x, vertically centred on y.
function mono(parent, text, { x, y, size = 32, color = C.cream, weight = 400, z = 6 } = {}) {
  const line = el('div', { class: 'line', style: { position: 'absolute', left: px(x), top: px(y - size * 0.62), height: px(size * 1.24), display: 'flex', alignItems: 'center', whiteSpace: 'pre', direction: 'ltr', fontFamily: MONO, fontSize: px(size), fontWeight: String(weight), color, lineHeight: '1.24', zIndex: String(z) } }, parent);
  const word = el('span', { class: 'word', text, style: { display: 'inline-block' } }, line);
  return { line, word };
}
// Left-to-right clip reveal (no fade-slide-up): u 0→1.
const reveal = (n, u) => { n.style.clipPath = `inset(-6px ${(100 - clamp(u) * 100).toFixed(2)}% -6px -6px)`; };
const wipeIn = (t, a, d = 0.24) => oC(ramp(t, a, a + d));

// ---------- camera: slow push per hold + decaying impacts ----------
function camera(t) {
  let x = 0, y = 0, r = 0;
  for (const [h, a] of HITS) { if (t < h) continue; const d = Math.exp(-(t - h) / 0.11) * a; x += d * 5 * Math.sin((t - h) * 61 + h); y += d * 7 * Math.cos((t - h) * 53 + 2 * h); r += d * 0.05 * Math.sin((t - h) * 47); }
  const pushDark = 1 + 0.015 * ramp(t, 0, T.hop) + 0.05 * ioC(ramp(t, T.hop, T.enter)) + 0.015 * ramp(t, T.enter, T.wipe[0]), pushEnd = 1 + 0.02 * ramp(t, T.tile, 10);
  return { x, y, r, s: t < T.wipe[1] ? pushDark : pushEnd };
}

const S = {};  // scene handles
function build(stage) {
  S.bg = full(stage, { background: C.ink, zIndex: '0' });
  CAM = full(stage, { transformOrigin: '540px 960px', zIndex: '1' });

  // ----- HOOK (z below the window) -----
  S.hook = full(CAM, { zIndex: '1' });
  S.fail = [mono(S.hook, 'FAIL  checkout.test.ts', { x: 100, y: 322, size: 34, color: C.red, weight: 700 }), mono(S.hook, 'expected  4200', { x: 100, y: 378, size: 31, color: C.dim }), mono(S.hook, 'received  42', { x: 100, y: 426, size: 31, color: C.dim })];
  S.h1 = words(S.hook, 'باج واحد', { size: 190, cy: 636 });
  S.h2 = words(S.hook, 'ضيّع يومك؟', { size: 138, cy: 846, accent: { 1: C.orange } });
  S.label = words(stage, 'مثال توضيحي', { size: 28, weight: 500, color: C.dim, cy: 1212, z: 20 });

  // ----- WINDOW -----
  S.win = div(CAM, { background: C.panel, border: `2px solid ${C.line}`, zIndex: '3', boxSizing: 'border-box' });
  S.wc = full(CAM, { zIndex: '4' });                                  // window content, clipped to the window rect
  S.brand = mono(S.wc, 'Claude Code', { x: WIN.x + 44, y: WIN.y + 56, size: 30, color: C.orange, weight: 700 });
  S.gt = mono(S.wc, '>', { x: 150, y: PROMPT.y, size: 38, color: C.orange, weight: 700 });
  S.typed = mono(S.wc, '', { x: PROMPT.x, y: PROMPT.y, size: PROMPT.size, color: C.cream });
  S.steps = [['Read', 'checkout.ts'], ['Read', 'checkout.test.ts'], ['Edit', 'checkout.ts']].map(([v, f], i) => {
    const g = full(S.wc, { zIndex: '6' }); const a = mono(g, v, { x: 196, y: ROWS[i][1], size: 38, color: C.orange, weight: 700 }), b = mono(g, f, { x: 196 + 6 * PROMPT.cw, y: ROWS[i][1], size: 38, color: C.cream });
    return { g, a, b };
  });
  S.diff = div(S.wc, { left: px(DIFF.x), top: px(DIFF.y), width: px(DIFF.w), height: px(DIFF.h), background: C.panel2, borderRadius: px(20), border: `2px solid ${C.line}`, boxSizing: 'border-box', overflow: 'hidden', zIndex: '5' });
  S.dname = mono(S.wc, 'checkout.ts', { x: DIFF.x + 28, y: DIFF.y + 34, size: 28, color: C.dim, z: 7 });
  S.redBar = div(S.wc, { left: px(DIFF.x + 4), top: px(DIFF.red - 28), width: px(DIFF.w - 8), height: px(56), background: C.redD, zIndex: '6' });
  S.redT = mono(S.wc, '- return Math.round(price * qty)', { x: DIFF.x + 56, y: DIFF.red, size: 32, color: C.red, z: 7 });
  S.strike = div(S.wc, { left: px(DIFF.x + 56), top: px(DIFF.red), height: '3px', width: px(32 * 19.58), background: C.red, zIndex: '8', transformOrigin: 'left center' });
  S.grnBar = div(S.wc, { left: px(DIFF.x + 4), top: px(DIFF.green - 28), width: px(DIFF.w - 8), height: px(56), background: C.greenD, zIndex: '6' });
  S.grnT = mono(S.wc, '+ return Math.round(price * qty * 100)', { x: DIFF.x + 56, y: DIFF.green, size: 32, color: C.green, z: 7 });
  S.front = div(S.wc, { left: '0', top: px(DIFF.green - 28), width: '10px', height: px(56), background: C.orange, zIndex: '9' });
  S.chips = CHIP.map(([cx, cy], i) => {
    const box = div(S.wc, { zIndex: '6', boxSizing: 'border-box', border: `2px solid ${C.line}` });
    const tx = mono(S.wc, ['cart', 'checkout', 'payment'][i], { x: cx - 66, y: cy, size: 28, color: C.dim, z: 7 });
    const svg = el('svg', { viewBox: '0 0 24 24', width: 38, height: 38, style: { position: 'absolute', left: px(cx + 84), top: px(cy - 20), overflow: 'visible', fill: 'none', stroke: C.green, strokeWidth: '3', strokeLinecap: 'round', strokeLinejoin: 'round', zIndex: '8' } }, S.wc);
    const path = el('path', { d: 'M4.5 12.5 9.5 17.5 19.5 6.5' }, svg); path.setAttribute('stroke-dasharray', '20'); 
    return { box, tx, path, cx, cy };
  });

  // ----- HERO CURSOR -----
  S.hero = div(CAM, { background: C.orange, zIndex: '14' });

  // ----- PAYOFF -----
  S.cream = full(CAM, { background: C.cream, zIndex: '10', clipPath: 'circle(0px at 0 0)' });
  S.pay = full(CAM, { zIndex: '12' });
  S.tile = div(S.pay, { width: '300px', height: '300px', borderRadius: '78px', background: C.orange, boxShadow: 'none' });
  const g = el('svg', { viewBox: '0 0 300 300', width: 300, height: 300, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, S.tile);
  el('path', { d: 'M92 100 148 150 92 200', fill: 'none', stroke: C.cream, 'stroke-width': 26, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  el('path', { d: 'M168 208H222', fill: 'none', stroke: C.cream, 'stroke-width': 26, 'stroke-linecap': 'round' }, g);
  S.name = words(S.pay, 'Claude Code', { size: 124, cy: 836, dir: 'ltr', color: C.ink, weight: 800 });
  S.tag = words(S.pay, 'بيقرا.. بيعدّل.. بيجرّب', { size: 84, weight: 700, cy: 984, color: C.ink, accent: { 2: C.orangeD } });
  S.cta = div(S.pay, { width: '520px', height: '118px', borderRadius: '59px', background: C.orange });
  S.ctaT = words(S.pay, 'جرّبه دلوقتي', { size: 60, weight: 800, color: C.ink, cy: 1110, z: 14 });
}

function frame(t) {
  const c = camera(t);
  CAM.style.transform = `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) rotate(${c.r.toFixed(3)}deg) scale(${c.s.toFixed(4)})`;
  const inWorld = t < T.wipe[1] + 0.05;

  // ----- hook -----
  vis(S.hook, t < T.hop + 0.4);
  S.fail.forEach((m, i) => { const a = 0.0 + i * 0.0; const o = 1 - ioC(ramp(t, T.hookOut, T.hookOut + 0.25)); m.line.style.opacity = o.toFixed(3); m.line.style.display = t < T.hookOut + 0.1 ? 'flex' : 'none'; void a; });
  slam(S.h1, t, T.h1, T.hookOut); slam(S.h2, t, T.h2, T.hookOut + 0.04);
  S.label.words[0].style.color = t >= T.wipe[1] ? '#6b6357' : C.dim; S.label.line.style.display = 'flex';

  // ----- window morph (grows out of the hook cursor) -----
  const p = zspring(t - T.hop, 0.8, 18), winOn = t >= T.hop && t < T.wipe[1];
  vis(S.win, winOn); vis(S.wc, winOn && !(t >= T.wipe[0] + 0.2));
  if (winOn) {
    const cx = lerp(HOOK_CURSOR.x, WIN.x + WIN.w / 2, p), cy = lerp(HOOK_CURSOR.y, WIN.y + WIN.h / 2, p), w = lerp(HOOK_CURSOR.w, WIN.w, p), h = lerp(HOOK_CURSOR.h, WIN.h, p), r = lerp(6, 30, clamp(p));
    rect(S.win, cx, cy, w, h, r);
    S.wc.style.clipPath = `inset(${(cy - h / 2).toFixed(1)}px ${(W - (cx + w / 2)).toFixed(1)}px ${(H - (cy + h / 2)).toFixed(1)}px ${(cx - w / 2).toFixed(1)}px round ${r.toFixed(1)}px)`;
    const co = ramp(p, 0.55, 0.95);
    for (const n of [S.brand, S.gt]) { n.line.style.opacity = co.toFixed(3); n.line.style.display = co > 0.3 ? 'flex' : 'none'; }
    // typing: two characters in some frames, a short stall after each space (a human rhythm, still a function of t)
    const n = typedCount(t);
    S.typed.word.textContent = PROMPT.text.slice(0, n);
    S.typed.line.style.opacity = t >= T.type0 ? '1' : '0';
    
    window._typedN = n;
  }
  // steps
  S.steps.forEach((s, i) => { const u = wipeIn(t, T.steps[i] + 0.1, 0.26); s.g.style.display = t >= T.steps[i] && winOn ? 'block' : 'none'; reveal(s.g, u); });
  // diff card
  const dIn = zspring(t - T.diffIn, 0.7, 24), dOn = t >= T.diffIn && winOn;
  [S.diff, S.dname, S.redBar, S.redT, S.grnBar, S.grnT, S.strike, S.front].forEach((n) => { const nl = n.line || n; nl.style.display = dOn ? (nl === S.dname.line || nl === S.redT.line || nl === S.grnT.line ? 'flex' : 'block') : 'none'; });
  if (dOn) {
    const sc = lerp(0.9, 1, Math.min(dIn, 1.06));
    S.diff.style.transformOrigin = '50% 0%';
    for (const n of [S.diff, S.redBar, S.grnBar, S.strike, S.front, S.dname.line, S.redT.line, S.grnT.line]) { n.style.transformOrigin = `${DIFF.x + DIFF.w / 2}px ${DIFF.y}px`; n.style.transform = `scale(${sc.toFixed(4)})`; }
    const opx = clamp(dIn * 2);
    for (const n of [S.diff, S.redBar, S.redT.line, S.dname.line]) n.style.opacity = opx.toFixed(3);
    const fixU = wipeIn(t, T.fix, 0.28);
    reveal(S.grnT.line, fixU); S.grnBar.style.clipPath = `inset(0 ${(100 - fixU * 100).toFixed(1)}% 0 0)`;
    S.grnBar.style.opacity = '1'; S.grnT.line.style.opacity = '1';
    S.front.style.left = px(DIFF.x + 4 + fixU * (DIFF.w - 8)); S.front.style.opacity = (fixU > 0 && fixU < 1 ? 1 : 0).toString();
    const su = oC(ramp(t, T.strike, T.strike + 0.18));
    S.strike.style.transform = `scale(${(sc * su).toFixed(4)}, ${sc.toFixed(4)})`; S.strike.style.opacity = su > 0 ? '1' : '0';
    S.redT.word.style.opacity = (1 - 0.55 * su).toFixed(3); S.redBar.style.opacity = (opx * (1 - 0.7 * su)).toFixed(3);
  }
  // chips
  S.chips.forEach((k, i) => {
    const on = t >= T.chips[i] - 0.25 && winOn, a = T.chips[i] + 0.05, s = zspring(t - a, 0.5, 26), fill = clamp(s);
    [k.box, k.tx.line].forEach((n) => { const nl = n.line || n; nl.style.display = on ? (nl === k.tx.line ? 'flex' : 'block') : 'none'; });
    k.box.style.display = on ? 'block' : 'none'; k.path.parentNode.style.display = on ? 'block' : 'none';
    const sc = 1 + 0.1 * (Math.min(s, 1.5) - clamp(s)) * 4 + (s > 0 && s < 1 ? 0.06 * (1 - s) : 0);
    rect(k.box, k.cx, k.cy, 264, 76, 38);
    k.box.style.transform = `scale(${(t >= a ? 1 + 0.14 * Math.sin(Math.PI * clamp((t - a) / 0.22)) * (1 - clamp((t - a) / 0.22) * 0.0) : 1).toFixed(4)})`;
    k.box.style.background = t >= a ? mixHex(C.panel, C.greenD, fill) : C.panel; k.box.style.borderColor = t >= a ? mixHex(C.line, C.green, fill) : C.line;
    k.tx.word.style.color = t >= a ? mixHex(C.dim, C.green, fill) : C.dim;
    const cu = oC(ramp(t, a + 0.04, a + 0.2)); k.path.setAttribute('stroke-dashoffset', (20 * (1 - cu)).toFixed(2)); k.path.style.opacity = cu > 0 ? '1' : '0';
    void sc;
  });

  // ----- hero -----
  const hs = hero(t), hOn = t < T.wipe[1] ? 1 : 0;
  S.hero.style.display = hOn ? 'block' : 'none';
  if (hOn) {
    const fell = t >= T.wipe[0];
    rect(S.hero, hs.x, hs.y, hs.w, hs.h, hs.r);
    S.hero.style.transform = `rotate(${hs.tilt.toFixed(1)}deg) scale(${hs.sx.toFixed(3)}, ${hs.sy.toFixed(3)}) rotate(${(-hs.tilt).toFixed(1)}deg)`;
    op(S.hero, fell ? 1 - ramp(t, T.wipe[0] + 0.1, T.wipe[0] + 0.25) : cursorOn(t) * (t >= T.type0 && t < T.enter ? 1 : 1));
    const blinkZone = t < T.hop || (t >= T.type0 - 0.05 && t < T.enter);
    if (blinkZone && t >= 1.5) op(S.hero, Math.floor(t / tb(0.5)) % 2 === 0 ? 1 : 0.2);
    // while typing, the caret rides the end of the text
    if (t >= T.hop + 0.5 && t < T.enter) { const n = window._typedN || 0; S.hero.style.left = px(PROMPT.x + n * PROMPT.cw); S.hero.style.top = px(PROMPT.y - 25); }
  }

  // ----- wipe + payoff -----
  const wu = oC(ramp(t, T.wipe[0], T.wipe[1])), Rmax = 2300 * 1.08, hx = CHIP[2][0] - 98, hy = CHIP[2][1];
  S.cream.style.clipPath = t >= T.wipe[0] ? `circle(${(wu * Rmax).toFixed(1)}px at ${hx}px ${hy}px)` : 'circle(0px at 0 0)';
  S.bg.style.background = t >= T.wipe[1] ? C.cream : C.ink;
  const pOn = t >= T.tile - 0.02; vis(S.pay, pOn);
  if (pOn) {
    const ts = zspring(t - T.tile, 0.5, 20), sq = 1 + 0.05 * Math.max(0, 1 - (t - T.tile) / 0.12);
    rect(S.tile, 540, 560, 300, 300); S.tile.style.transform = `scale(${lerp(0.3, 1, Math.min(ts, 1.2)).toFixed(4)}, ${(lerp(0.3, 1, Math.min(ts, 1.2)) * sq).toFixed(4)}) rotate(${((1 - clamp(ts)) * -14).toFixed(2)}deg)`;
    op(S.tile, clamp(ts * 4));
    slam(S.name, t, T.name, 99, { stagger: 0.1, zeta: 0.5, w: 24 });
    slam(S.tag, t, T.tag, 99, { stagger: 0.09, zeta: 0.55, w: 24 });
    const cs = zspring(t - T.cta, 0.6, 24);
    rect(S.cta, 540, 1110, 520, 118, 59); S.cta.style.transform = `scale(${lerp(0.6, 1, Math.min(cs, 1.1)).toFixed(4)})`; op(S.cta, clamp(cs * 3));
    slam(S.ctaT, t, T.cta + 0.04, 99, { stagger: 0.08, zeta: 0.55, w: 24 });
  }
  vis(S.cream, t >= T.wipe[0]);
}

function mixHex(a, b, p) { const f = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = f(a), B = f(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(p))).toString(16).padStart(2, '0')).join(''); }

export default {
  duration: 10, fps: 30,
  async init(st, { W: w, H: h }) {
    W = w; H = h; STAGE = st; st.style.background = C.ink;
    build(st);
    GRAIN = grain(st, { opacity: 0.045, tiles: 6, seed: 22 });
  },
  render(t, fr = Math.round(t * 30)) { frame(t); GRAIN(fr); },
};
