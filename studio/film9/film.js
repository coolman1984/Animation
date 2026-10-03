// Film 9 — NeuroAnara — «Decode the Case» — 20 s Facebook Reels, 1080×1920 @ 30 fps. NO music: sound effects only (score.mjs).
// The page's own method as motion: a sign (can't stand up from the chair) → the same sign, many causes (neural branches to the
// eight causes from the page's post) → decode: Finding → Meaning → Treatment Direction (a pulse along an axon) → فكّر. اربط. قرّر.
// → "Neuro is not memorized." → "Neuro is decoded." (letters decode) → the NeuroAnara lock-up. Calm, scientific, cream / navy / teal / gold.
import { clamp, lerp, ramp, ease, el, textLine } from '../lib/motion.js';
import { springStep, hash } from '../lib/kinetics.js';

const C = { paper: '#F7F3EA', navy: '#10264A', navyL: '#1E3B66', teal: '#2F7782', tealL: '#4499B4', gold: '#C2A15A', goldL: '#D9BE7E', ink: '#5A6474', white: '#FFFFFF' };
const AR = "'Alexandria'", SERIF = "'Lora'";
let W = 1080, H = 1920, stage;
const S = {}, SC = [];

const px = (v) => `${(+v).toFixed(2)}px`;
const oE = ease.outExpo, ioC = ease.inOutCubic, oC = ease.outCubic;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const spr = (t, start, duration = 0.5, bounce = 0.2) => (t <= start ? 0 : springStep(t - start, { duration, bounce }).value);
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const full = (parent, style = {}) => div(parent, { width: px(W), height: px(H), ...style });
const place = (n, x, y, w, h, r) => { n.style.left = px(x - w / 2); n.style.top = px(y - h / 2); n.style.width = px(Math.max(0, w)); n.style.height = px(Math.max(0, h)); if (r !== undefined) n.style.borderRadius = px(Math.max(0, r)); };
const setBlur = (n, b) => { n.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : 'none'; };
const svgIn = (parent, z = 2) => el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', zIndex: String(z) } }, parent);
function words(parent, text, { size, weight = 700, color = C.navy, cy, x0 = 70, x1 = 1010, font = AR, dir = 'rtl', track = 0, lh = 1.3, accent = {}, justify = 'center', z = 8, italic = false } = {}) {
  const L = textLine(parent, text, { left: px(x0), top: px(cy - (size * lh) / 2), width: px(x1 - x0), justifyContent: justify, fontFamily: font, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), letterSpacing: `${track}em`, direction: dir, zIndex: String(z), fontStyle: italic ? 'italic' : 'normal' });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; });
  return L;
}
function rise(L, t, tIn, tOut = 99, { stagger = 0.08, dur = 0.8, dy = 30, blur = 10, outDur = 0.38, outDy = -18 } = {}) {
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
const cub = (a, b, c, d, u) => { const v = 1 - u; return [0, 1].map((k) => v * v * v * a[k] + 3 * v * v * u * b[k] + 3 * v * u * u * c[k] + u * u * u * d[k]); };

// ---------- the seated figure (silhouette in the page's style); upper body leans by `a` degrees around the hip ----------
function figure(parent) {
  const g = el('g', {}, parent), up = el('g', {}, g);
  const def = el('defs', {}, parent), lg = el('linearGradient', { id: 's9fig', x1: 0, y1: 0, x2: 0, y2: 1 }, def);
  el('stop', { offset: '0', 'stop-color': C.navyL }, lg); el('stop', { offset: '1', 'stop-color': C.navy }, lg);
  const chair = 'M -40 10 H 120 M -40 10 L -60 190 M 120 10 L 138 190 M -40 10 L -64 -150';
  el('path', { d: chair, fill: 'none', stroke: '#3A6FB0', 'stroke-width': 13, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  el('path', { d: 'M 0 -12 L 150 -6', stroke: 'url(#s9fig)', 'stroke-width': 66, 'stroke-linecap': 'round' }, g);      // thigh
  el('path', { d: 'M 150 -6 L 158 160', stroke: 'url(#s9fig)', 'stroke-width': 52, 'stroke-linecap': 'round' }, g);     // shin
  el('ellipse', { cx: 186, cy: 182, rx: 44, ry: 17, fill: C.navy }, g);                                                  // foot
  el('path', { d: 'M 0 -20 L 6 -200', stroke: 'url(#s9fig)', 'stroke-width': 76, 'stroke-linecap': 'round' }, up);      // torso
  el('circle', { cx: 18, cy: -282, r: 46, fill: C.navyL }, up);                                                           // head
  const arm = el('path', { d: 'M 10 -180 Q 60 -100 120 -30', fill: 'none', stroke: '#16305A', 'stroke-width': 30, 'stroke-linecap': 'round' }, up);
  return { g, up, arm };
}

// ---------- background: paper, the page's curved navy/teal waves in two corners, a gold hairline curve ----------
SC.push({ id: 'paper', a: 0, b: 20.1, z: 1, init(root) {
  full(root, { background: 'radial-gradient(ellipse 90% 60% at 50% 40%, #FFFDF8 0%, #F7F3EA 60%, #ECE5D6 100%)' });
  const svg = svgIn(root, 1);
  const d = el('defs', {}, svg), g1 = el('linearGradient', { id: 's9w', x1: 0, y1: 0, x2: 1, y2: 1 }, d);
  el('stop', { offset: '0', 'stop-color': C.navy }, g1); el('stop', { offset: '1', 'stop-color': C.teal, 'stop-opacity': '0.85' }, g1);
  const wTop = el('path', { fill: 'url(#s9w)', opacity: '0.95' }, svg), wTop2 = el('path', { fill: C.tealL, opacity: '0.18' }, svg);
  const wBot = el('path', { fill: 'url(#s9w)', opacity: '0.95' }, svg), wBot2 = el('path', { fill: C.tealL, opacity: '0.18' }, svg);
  const gold1 = el('path', { fill: 'none', stroke: C.gold, 'stroke-width': 2.2, opacity: '0.7' }, svg), gold2 = el('path', { fill: 'none', stroke: C.gold, 'stroke-width': 2.2, opacity: '0.7' }, svg);
  const dots = div(root, { left: '820px', top: '300px', width: '170px', height: '120px', opacity: '0.35', backgroundImage: `radial-gradient(${C.ink} 1.6px, transparent 1.8px)`, backgroundSize: '22px 22px' });
  const dots2 = div(root, { left: '80px', top: '1330px', width: '150px', height: '110px', opacity: '0.3', backgroundImage: `radial-gradient(${C.ink} 1.6px, transparent 1.8px)`, backgroundSize: '22px 22px' });
  S.paper = { wTop, wTop2, wBot, wBot2, gold1, gold2, dots, dots2 };
}, render(t) {
  const s = S.paper, b = 14 * Math.sin(t * 0.6), c = 12 * Math.cos(t * 0.5), inn = oC(ramp(t, 0, 0.9));
  const k = (v) => (v * inn).toFixed(1);
  s.wTop.setAttribute('d', `M 0 0 H ${k(420 + b)} C ${k(300 + c)} ${k(70)} ${k(170)} ${k(150 + b)} 0 ${k(260 + c)} Z`);
  s.wTop2.setAttribute('d', `M 0 0 H ${k(560 + c)} C ${k(400)} ${k(110 + b)} ${k(220)} ${k(230)} 0 ${k(380 + b)} Z`);
  s.wBot.setAttribute('d', `M ${W} ${H} H ${W - 460 * inn - b} C ${W - 300 * inn} ${H - 90 * inn - c} ${W - 150 * inn} ${H - 170 * inn} ${W} ${H - (300 + b) * inn} Z`);
  s.wBot2.setAttribute('d', `M ${W} ${H} H ${W - 620 * inn - c} C ${W - 420 * inn} ${H - 140 * inn} ${W - 210 * inn - b} ${H - 260 * inn} ${W} ${H - (440 + c) * inn} Z`);
  s.gold1.setAttribute('d', `M 0 ${k(300 + c)} C ${k(200)} ${k(170 + b)} ${k(380)} ${k(80)} ${k(640 + b)} 0`);
  s.gold2.setAttribute('d', `M ${W} ${H - (340 + b) * inn} C ${W - 180 * inn} ${H - 190 * inn} ${W - 400 * inn - c} ${H - 90 * inn} ${W - 700 * inn} ${H}`);
  s.dots.style.transform = `translateY(${(8 * Math.sin(t * 0.7)).toFixed(1)}px)`; s.dots2.style.transform = `translateY(${(-8 * Math.sin(t * 0.7)).toFixed(1)}px)`;
} });

// ---------- the case ----------
const CAUSES = ['ضعف', 'ضعف التحكم الحركي', 'ضعف نقل الوزن', 'Tone', 'فقدان الإحساس', 'خوف أو توتر', 'ضعف التخطيط الحركي', 'تحمّل منخفض'];
const CY0 = 540, CDY = 76;                              // cause chips: centre y of chip i = CY0 + i·CDY, x 600..1000
const NODES = [{ en: 'Finding', ar: 'إيه اللي لقيته؟', y: 640 }, { en: 'Meaning', ar: 'معناه إيه؟', y: 880 }, { en: 'Treatment Direction', ar: 'هابدأ بإيه؟', y: 1120 }];
SC.push({ id: 'case', a: 0, b: 20.1, z: 4, init(root) {
  const svg = svgIn(root, 3);
  const arc = el('path', { d: 'M 640 1250 C 760 1060 720 860 560 760', fill: 'none', stroke: C.gold, 'stroke-width': 3, 'stroke-dasharray': '10 12', opacity: '0' }, svg);
  const arrow = el('path', { d: 'M -12 -10 L 4 0 L -12 10', fill: 'none', stroke: C.gold, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: '0' }, svg);
  const fig = figure(svg);
  const branches = CAUSES.map(() => el('path', { fill: 'none', stroke: C.teal, 'stroke-width': 2.4, opacity: '0.85', pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, svg));
  const sparks = CAUSES.map(() => el('circle', { r: 6, fill: C.goldL, opacity: '0' }, svg));
  const h1 = words(root, 'مش قادر يقوم من الكرسي..', { size: 66, weight: 700, cy: 400, lh: 1.25 });
  const h2 = words(root, 'أبدأ أفكر إزاي؟', { size: 70, weight: 700, cy: 510, lh: 1.25, accent: { 2: C.teal } });
  const tag = div(root, { width: '520px', height: '76px', borderRadius: '38px', background: '#EFE3C8', zIndex: '7', opacity: '0' });
  textLine(tag, 'نفس العلامة.. أسباب مختلفة', { left: '0', top: '0', width: '520px', height: '76px', justifyContent: 'center', alignItems: 'center', fontFamily: AR, fontSize: '36px', fontWeight: '600', color: C.navy, direction: 'rtl' });
  const k1 = words(root, 'لكن السبب ممكن يكون:', { size: 52, weight: 700, cy: 430, x0: 520, x1: 1010, justify: 'flex-start' });
  const chips = CAUSES.map((c) => {
    const box = div(root, { width: '410px', height: '62px', borderRadius: '14px', background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(194,161,90,0.55)', boxShadow: '0 8px 18px rgba(16,38,74,0.06)', zIndex: '6', display: 'none' });
    const dot = div(box, { left: px(410 - 34), top: '23px', width: '16px', height: '16px', borderRadius: '50%', background: C.teal });
    const L = textLine(box, c, { left: '0', top: '0', width: px(410 - 50), height: '62px', justifyContent: 'flex-start', alignItems: 'center', fontFamily: c === 'Tone' ? SERIF : AR, fontSize: '34px', fontWeight: '600', color: C.navy, direction: 'rtl' });
    return { box, dot, L };
  });
  const banner = div(root, { width: '720px', height: '92px', borderRadius: '46px', background: `linear-gradient(160deg, ${C.navyL}, ${C.navy})`, border: `1.5px solid ${C.gold}`, zIndex: '7', opacity: '0', boxShadow: '0 16px 34px rgba(16,38,74,0.25)' });
  const bL = textLine(banner, 'افهم لماذا فشلت الحركة أولاً.', { left: '0', top: '0', width: '720px', height: '92px', justifyContent: 'center', alignItems: 'center', fontFamily: AR, fontSize: '40px', fontWeight: '600', color: '#fff', direction: 'rtl' });
  // decode: an axon with three synapses
  const axon = el('path', { d: `M 300 560 C 330 700 270 800 300 900 C 330 1000 270 1100 300 1200`, fill: 'none', stroke: C.teal, 'stroke-width': 5, 'stroke-linecap': 'round', pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, svg);
  const pulse = el('circle', { r: 13, fill: C.goldL, opacity: '0' }, svg);
  const pulseG = el('circle', { r: 34, fill: C.gold, opacity: '0' }, svg);
  const ax = el('path', { d: 'M 300 560 C 330 700 270 800 300 900 C 330 1000 270 1100 300 1200', fill: 'none', stroke: 'none' }, svg);
  const head = words(root, 'من الفحص إلى خطة العلاج', { size: 64, weight: 700, cy: 420 });
  const ICONS = ['M -20 0 A 20 20 0 1 0 20 0 A 20 20 0 1 0 -20 0 M -9 0 A 9 9 0 1 0 9 0 A 9 9 0 1 0 -9 0 M 6 -6 L 26 -26 M 18 -26 H 26 V -18',
    'M -4 -24 C -18 -26 -28 -14 -24 -2 C -30 6 -24 20 -10 20 C -4 28 10 26 12 18 C 26 18 30 4 24 -4 C 28 -16 16 -28 4 -22 Z M 0 -22 V 22 M -14 -6 C -8 -4 -6 2 0 2 M 14 -10 C 8 -8 6 -2 0 -2',
    'M 0 -28 V 28 M 0 -22 H 22 L 28 -15 L 22 -8 H 0 M 0 0 H -22 L -28 7 L -22 14 H 0'];
  const nodes = NODES.map((n, i) => {
    const disc = div(root, { width: '118px', height: '118px', borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, #3B8B97, ${C.teal} 60%, #1F5C66)`, boxShadow: '0 12px 26px rgba(47,119,130,0.35)', zIndex: '6', opacity: '0' });
    const sv = el('svg', { viewBox: '-40 -40 80 80', style: { position: 'absolute', left: '19px', top: '19px', width: '80px', height: '80px', overflow: 'visible' } }, disc);
    el('path', { d: ICONS[i], fill: 'none', stroke: '#fff', 'stroke-width': 3.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
    const en = words(root, `${i + 1}. ${n.en}`, { size: i === 2 ? 46 : 54, weight: 600, font: SERIF, dir: 'ltr', cy: n.y - 34, x0: 400, x1: 1000, justify: 'flex-end' });
    const ar = words(root, n.ar, { size: 40, weight: 500, color: C.ink, cy: n.y + 30, x0: 400, x1: 1000, justify: 'flex-start' });
    const ring = div(root, { borderRadius: '50%', border: `2.5px solid ${C.gold}`, zIndex: '5', opacity: '0' });
    return { disc, en, ar, ring };
  });
  // فكّر. اربط. قرّر.
  const think = ['فكّر.', 'اربط.', 'قرّر.'].map((w, i) => words(root, w, { size: 150, weight: 800, color: [C.navy, C.teal, C.gold][i], cy: 710 + i * 200, lh: 1.15 }));
  const link = el('path', { d: 'M 540 800 V 1020', fill: 'none', stroke: C.gold, 'stroke-width': 3, 'stroke-dasharray': '4 10', opacity: '0' }, svg);
  S.case = { root, arc, arrow, fig, branches, sparks, h1, h2, tag, k1, chips, banner, bL, axon, ax, pulse, pulseG, head, nodes, think, link };
}, render(t) {
  const s = S.case;
  // ---- A: the sign (0–3.6) and the figure parking (3.6–4.2), out at 7.3
  const tries = Math.max(0, Math.sin(Math.PI * clamp((t - 0.7) / 1.0))) * 30 + Math.max(0, Math.sin(Math.PI * clamp((t - 2.0) / 1.0))) * 34;
  const fall = 7 * Math.exp(-Math.max(0, t - 1.7) * 7) * Math.sin(Math.max(0, t - 1.7) * 24) * (t > 1.7 ? 1 : 0) + 7 * Math.exp(-Math.max(0, t - 3.0) * 7) * Math.sin(Math.max(0, t - 3.0) * 24) * (t > 3.0 ? 1 : 0);
  const park = ioC(ramp(t, 3.6, 4.3)), gone = ioC(ramp(t, 7.0, 7.5));
  const fx = lerp(420, 230, park), fy = lerp(1130, 1030, park), fsc = lerp(1.35, 0.78, park);
  s.fig.g.setAttribute('transform', `translate(${fx.toFixed(1)} ${(fy + 40 * gone).toFixed(1)}) scale(${fsc.toFixed(4)})`);
  s.fig.g.setAttribute('opacity', (sm(0.05, 0.5, t) * (1 - gone)).toFixed(3));
  s.fig.up.setAttribute('transform', `translate(0 ${(-tries * 0.35).toFixed(1)}) rotate(${(-6 + tries + fall).toFixed(2)} 0 -10)`);
  const arcU = ioC(ramp(t, 0.9, 1.9)) * (1 - sm(3.4, 3.7, t));
  s.arc.setAttribute('opacity', (0.9 * arcU).toFixed(3)); s.arc.setAttribute('stroke-dashoffset', (-t * 30).toFixed(1));
  s.arrow.setAttribute('opacity', (0.9 * arcU).toFixed(3)); s.arrow.setAttribute('transform', 'translate(560 760) rotate(-150)');
  rise(s.h1, t, 0.35, 3.45); rise(s.h2, t, 1.25, 3.5, { stagger: 0.1 });
  const tg = spr(t, 2.55, 0.5, 0.25), tgo = ioC(ramp(t, 3.4, 3.7));
  place(s.tag, 540, 640, 520, 76, 38); s.tag.style.opacity = (clamp(tg * 2) * (1 - tgo)).toFixed(3); s.tag.style.transform = `scale(${lerp(0.85, 1, clamp(tg, 0, 1.1)).toFixed(3)})`;
  s.tag.style.display = t > 2.5 && t < 3.8 ? 'block' : 'none';
  // ---- B: causes branch out (3.9–7.3)
  const head = [fx + 18 * fsc, fy - 282 * fsc];
  rise(s.k1, t, 3.95, 7.0);
  s.chips.forEach(({ box, dot, L }, i) => {
    const t0 = 4.2 + i * 0.22, p = clamp(spr(t, t0, 0.5, 0.2), 0, 1.1), out = ioC(ramp(t, 7.05 + i * 0.02, 7.4 + i * 0.02));
    box.style.display = t >= t0 - 0.05 && t < 7.6 ? 'block' : 'none';
    const cy = CY0 + i * CDY;
    place(box, 805 + (1 - clamp(p)) * 40, cy, 410, 62, 14);
    const o = clamp(p * 1.8) * (1 - out); box.style.opacity = o.toFixed(3); L.words.forEach((w) => { w.style.opacity = o.toFixed(3); });
    dot.style.transform = `scale(${(1 + 0.6 * Math.max(0, Math.sin(Math.PI * clamp((t - t0 - 0.35) / 0.3)))).toFixed(3)})`;
    const end = [600, cy], c1 = [head[0] + 140, head[1] - 60 + i * 10], c2 = [520, cy];
    const br = s.branches[i], u = ioC(ramp(t, t0 - 0.25, t0 + 0.15));
    br.setAttribute('d', `M ${head[0].toFixed(1)} ${head[1].toFixed(1)} C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0]} ${c2[1]} ${end[0]} ${end[1]}`);
    br.setAttribute('stroke-dashoffset', (1 - u).toFixed(4)); br.setAttribute('opacity', (0.8 * (1 - out)).toFixed(3));
    const su = ((t - t0 - 0.2) * 0.55 + hash(i, 3)) % 1, sp = cub(head, c1, c2, end, su);
    s.sparks[i].setAttribute('cx', sp[0].toFixed(1)); s.sparks[i].setAttribute('cy', sp[1].toFixed(1));
    s.sparks[i].setAttribute('opacity', (t > t0 + 0.2 && t < 7.05 ? 0.9 * Math.sin(Math.PI * su) : 0).toFixed(3));
  });
  const bn = spr(t, 6.2, 0.55, 0.22), bno = ioC(ramp(t, 7.05, 7.4));
  place(s.banner, 540, 1190, 720, 92, 46); s.banner.style.display = t > 6.1 && t < 7.6 ? 'block' : 'none';
  s.banner.style.opacity = (clamp(bn * 2) * (1 - bno)).toFixed(3); s.banner.style.transform = `scale(${lerp(0.8, 1, clamp(bn, 0, 1.1)).toFixed(3)})`;
  s.bL.words.forEach((w) => { w.style.opacity = (clamp(bn * 2) * (1 - bno)).toFixed(3); });
  // ---- C: decode along the axon (7.5–11.8)
  const axU = ioC(ramp(t, 7.55, 8.3)), axO = 1 - ioC(ramp(t, 11.6, 11.95));
  s.axon.setAttribute('stroke-dashoffset', (1 - axU).toFixed(4)); s.axon.setAttribute('opacity', axO.toFixed(3));
  rise(s.head, t, 7.6, 11.55, { stagger: 0.07 });
  const PT = [8.35, 9.55, 10.75], L0 = s.ax.getTotalLength();
  const pu = t < PT[0] ? 0 : t < PT[2] + 0.1 ? clamp((t - PT[0] + 0.25) / (PT[2] - PT[0] + 0.25)) : 1;
  const pp = s.ax.getPointAtLength(L0 * (0.07 + 0.86 * pu));
  for (const n of [s.pulse, s.pulseG]) { n.setAttribute('cx', pp.x.toFixed(1)); n.setAttribute('cy', pp.y.toFixed(1)); }
  const pv = t > 8.1 && t < 11.0 ? 1 : 0;
  s.pulse.setAttribute('opacity', pv.toFixed(0)); s.pulseG.setAttribute('opacity', (0.22 * pv).toFixed(2));
  s.nodes.forEach(({ disc, en, ar, ring }, i) => {
    const y = NODES[i].y, p = clamp(spr(t, PT[i], 0.5, 0.3), 0, 1.15), out = ioC(ramp(t, 11.55, 11.9));
    place(disc, 300, y, 118, 118); disc.style.opacity = (clamp(p * 2) * (1 - out)).toFixed(3); disc.style.transform = `scale(${clamp(p, 0, 1.15).toFixed(3)})`;
    rise(en, t, PT[i] + 0.05, 11.5, { dy: 20 }); rise(ar, t, PT[i] + 0.2, 11.55, { dy: 20 });
    const u = ramp(t, PT[i], PT[i] + 0.8); if (u > 0 && u < 1) { const r = lerp(60, 130, oE(u)); place(ring, 300, y, 2 * r, 2 * r, r); ring.style.opacity = (0.8 * (1 - u)).toFixed(3); } else ring.style.opacity = '0';
  });
  // ---- D: فكّر. اربط. قرّر. (12.0–14.4)
  const TT = [11.95, 12.45, 12.95];
  s.think.forEach((L, i) => rise(L, t, TT[i], 13.65, { dy: 40, blur: 14, dur: 0.6 }));
  s.link.setAttribute('opacity', (0.8 * sm(13.3, 13.6, t) * (1 - sm(13.65, 13.95, t))).toFixed(3)); s.link.setAttribute('stroke-dashoffset', (-t * 40).toFixed(1));
} });

// ---------- E + F: "Neuro is decoded." and the lock-up ----------
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#%&*+=<>/';
SC.push({ id: 'brand', a: 13.7, b: 20.1, z: 5, init(root) {
  const n1 = words(root, 'Neuro is not memorized.', { size: 76, weight: 500, font: SERIF, dir: 'ltr', cy: 780, lh: 1.25 });
  const strike = div(root, { height: '5px', background: C.gold, zIndex: '9', transformOrigin: '0 50%' });
  const n2 = words(root, 'Neuro is decoded.', { size: 92, weight: 600, font: SERIF, dir: 'ltr', cy: 930, lh: 1.25, accent: { 2: C.teal } });
  const target = 'decoded.';
  const gloss = words(root, 'النيورو مش حفظ.. النيورو فهم', { size: 46, weight: 500, color: C.ink, cy: 1070 });
  // lock-up
  const star = el('svg', { viewBox: '-20 -20 40 40', style: { position: 'absolute', left: px(540 - 26), top: px(560 - 26), width: '52px', height: '52px', overflow: 'visible', zIndex: '8', opacity: '0' } }, root);
  el('path', { d: 'M 0 -18 C 2 -5 5 -2 18 0 C 5 2 2 5 0 18 C -2 5 -5 2 -18 0 C -5 -2 -2 -5 0 -18 Z', fill: C.gold }, star);
  const logo = words(root, 'NeuroAnara', { size: 146, weight: 500, font: SERIF, dir: 'ltr', cy: 672, lh: 1.0 });
  logo.words[0].innerHTML = 'Neuro<span style="color:#2F7782">Anara</span>';
  const sub = words(root, 'Where the brain finds light', { size: 34, weight: 400, font: SERIF, dir: 'ltr', cy: 790, track: 0.22, color: C.ink, italic: true });
  const hair = div(root, { left: px(540 - 260), top: '852px', width: '520px', height: '2px', background: `linear-gradient(90deg, rgba(194,161,90,0), ${C.gold} 25%, ${C.gold} 75%, rgba(194,161,90,0))`, zIndex: '6' });
  const gem = div(root, { left: px(540 - 9), top: px(853 - 9), width: '18px', height: '18px', borderRadius: '50%', background: C.paper, border: `2.5px solid ${C.gold}`, zIndex: '7' });
  const ar = words(root, 'من العلامة للقرار', { size: 60, weight: 700, cy: 935 });
  const tri = words(root, 'Decode the Sign  ·  See the Function  ·  Think Clinically', { size: 27, weight: 500, font: AR, dir: 'ltr', cy: 1020, color: C.navy });
  const dr = words(root, 'Dr. Manar El-sayed Ismail', { size: 30, weight: 500, font: SERIF, dir: 'ltr', cy: 1082, color: C.teal, italic: true });
  const cta = div(root, { width: '440px', height: '96px', borderRadius: '48px', zIndex: '8', background: `linear-gradient(160deg, ${C.navyL}, ${C.navy})`, border: `1.5px solid ${C.gold}`, boxShadow: '0 18px 36px rgba(16,38,74,0.25)' });
  const ctaL = textLine(cta, 'تابع الصفحة', { left: '0', top: '0', width: '440px', height: '96px', justifyContent: 'center', alignItems: 'center', fontFamily: AR, fontSize: '42px', fontWeight: '600', color: '#fff', direction: 'rtl' });
  S.brand = { n1, strike, n2, target, gloss, star, logo, sub, hair, gem, ar, tri, dr, cta, ctaL };
}, render(t, frame) {
  const s = S.brand;
  rise(s.n1, t, 13.75, 16.85, { stagger: 0.09 });
  // strike through "memorized." (word 3)
  const w3 = s.n1.words[3], st = oE(ramp(t, 14.55, 15.0)), so = ioC(ramp(t, 16.85, 17.2));
  if (s.n1.line.style.display !== 'none') { const r = w3.getBoundingClientRect(); s.strike.style.left = px(r.left - 6); s.strike.style.top = px(r.top + r.height * 0.56); s.strike.style.width = px(r.width + 12); }
  s.strike.style.transform = `scaleX(${st.toFixed(4)})`; s.strike.style.opacity = (st > 0 ? 1 - so : 0).toFixed(3);
  w3.style.color = t > 14.55 ? C.ink : '';
  rise(s.n2, t, 14.85, 16.9, { stagger: 0.08 });
  // decode the last word letter by letter
  const res = s.target.split('').map((ch, i) => (t > 15.15 + i * 0.09 ? ch : GLYPHS[Math.floor(hash(i, frame ?? Math.round(t * 30)) * GLYPHS.length)])).join('');
  s.n2.words[2].textContent = t > 14.8 ? res : s.target;
  rise(s.gloss, t, 15.4, 16.95, { stagger: 0.07, dy: 18 });
  const push = 1 + 0.05 * ioC(ramp(t, 14.8, 17.0)); for (const L of [s.n1, s.n2, s.gloss]) { L.line.style.transform = `scale(${push.toFixed(4)})`; L.line.style.transformOrigin = '50% 50%'; }
  // lock-up
  const sp = spr(t, 17.2, 0.6, 0.35); s.star.style.opacity = clamp(sp * 2).toFixed(3);
  s.star.style.transform = `rotate(${(lerp(-90, 0, clamp(sp, 0, 1)) + 6 * Math.sin(t * 2)).toFixed(1)}deg) scale(${(clamp(sp, 0, 1.2) * (1 + 0.08 * Math.sin(t * 3.2))).toFixed(3)})`;
  rise(s.logo, t, 17.3, 99, { dy: 30, blur: 14, dur: 1.0 });
  rise(s.sub, t, 17.7, 99, { dy: 14 });
  const hr = oE(ramp(t, 17.85, 18.5)); s.hair.style.transform = `scaleX(${hr.toFixed(4)})`; s.hair.style.opacity = hr.toFixed(3);
  s.gem.style.transform = `scale(${clamp(spr(t, 18.0, 0.5, 0.3), 0, 1.3).toFixed(3)})`;
  rise(s.ar, t, 18.05, 99, { stagger: 0.09 }); rise(s.tri, t, 18.4, 99, { stagger: 0.05, dy: 14 }); rise(s.dr, t, 18.65, 99, { dy: 12 });
  const cp = clamp(spr(t, 18.9, 0.55, 0.24), 0, 1.15);
  place(s.cta, 540, 1180, 440, 96, 48); s.cta.style.opacity = clamp(cp * 1.6).toFixed(3); s.cta.style.transform = `scale(${lerp(0.7, 1, cp).toFixed(4)})`;
  rise(s.ctaL, t, 19.0, 99, { dy: 12, blur: 6 });
} });

export default {
  duration: 20, fps: 30,
  async init(st, { W: w, H: h }) {
    stage = st; W = w; H = h; stage.style.background = C.paper;
    SC.forEach((s) => { s.root = full(stage, { overflow: 'hidden', zIndex: String(s.z), display: 'none' }); s.init(s.root); });
  },
  render(t, frame) {
    for (const s of SC) { const on = t >= s.a && t < s.b; s.root.style.display = on ? 'block' : 'none'; if (on) s.render(t, frame); }
  },
};
