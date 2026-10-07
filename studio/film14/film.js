// Film 14 — «اتكلم كورة» 2D football motion showreel. 20 s, 1080×1920 (Facebook Reels), 30 fps, 150 BPM. Pure DOM/SVG.
// Owner direction (2026-10-07): 2D only — tactics, fast words, analysis, catchy fast music, match results, Egyptian league,
// Al Ahly, Zamalek, Premier League, Egypt, team shirts, all moving; end with the host and the show title as in his video.
// Hero: THE BALL. It bounces the name in, gets kicked through the lens into the tactics board, becomes the glowing pass dot,
// the colour wipe between shirts, the score digit, the heat-map peak, the word blast, and the flash into the host's freeze.
// Results are real and sourced (BRIEF.md). Club/league marks: drawn as named colour roundels and original shirts, not official crests.
import { clamp, lerp, ramp, ease, el, textLine, rng } from '../lib/motion.js';
import { springStep, hash, noise1 } from '../lib/kinetics.js';
import { EV, DUR, BEAT } from './timing.js';

const W = 1080, H = 1920, AR = "'Alexandria'";
const C = { ink: '#05080F', navy: '#0A1430', chalk: '#F3F6F1', board: '#0F3A24', gold: '#FFC83D', ahly: '#C8102E', zam: '#E2231A', egypt: '#CE1126', plP: '#38003C', plG: '#00FF85', plM: '#E90052', lime: '#C6FF3D' };
const px = (v) => `${(+v).toFixed(2)}px`;
const spr = (t, a, d = 0.45, b = 0.25) => (t <= a ? 0 : springStep(t - a, { duration: d, bounce: b }).value);
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const ar = (s) => String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
const div = (p, s = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...s } }, p);
const blur = (n, b) => { n.style.filter = b > 0.25 ? `blur(${b.toFixed(2)}px)` : 'none'; };
const show = (n, v) => { n.style.display = v ? 'block' : 'none'; return v; };
const svg = (p, s = {}, vb = `0 0 ${W} ${H}`) => el('svg', { width: String(W), height: String(H), viewBox: vb, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', ...s } }, p);
function words(parent, text, { size, weight = 900, color = '#fff', cx = 540, top, width = 960, lh = 1.12, shadow = '', dir = 'rtl' } = {}) {
  const L = textLine(parent, text, { left: px(cx - width / 2), top: px(top), width: px(width), justifyContent: 'center', fontFamily: AR, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), textShadow: shadow, direction: dir });
  return L;
}
// slam: words pop up from 0.55× with a short overshoot and blur (stays inside its own box → text gate safe)
function slam(L, t, a, b, { stagger = 0.06, s0 = 0.55, dur = 0.32, bl = 14, out = 0.18 } = {}) {
  const vis = t >= a - 0.01 && t <= b + out + 0.05; L.line.style.display = vis ? 'flex' : 'none'; if (!vis) return;
  L.words.forEach((w, i) => { const s = a + i * stagger, e = spr(t, s, dur, 0.2), o = ease.inCubic(ramp(t, b, b + out));
    w.style.opacity = (clamp((t - s) / 0.05) * (1 - o)).toFixed(3); w.style.transform = `scale(${(lerp(s0, 1, e) * (1 + 0.15 * o)).toFixed(4)})`; blur(w, (1 - clamp(e)) * bl + o * 12); });
}
// football glyph: white ball with a pentagon pattern, rotated by angle
const BALL = (r) => `<circle r="${r}" fill="#fff"/><g fill="#14171c">${[0, 72, 144, 216, 288].map((a) => `<path transform="rotate(${a})" d="M ${-r * 0.2} ${-r * 0.98} L ${r * 0.2} ${-r * 0.98} L ${r * 0.33} ${-r * 0.72} L 0 ${-r * 0.55} L ${-r * 0.33} ${-r * 0.72} Z"/>`).join('')}<path d="${[0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + k * Math.PI * 0.4; return `${k ? 'L' : 'M'} ${(Math.cos(a) * r * 0.3).toFixed(1)} ${(Math.sin(a) * r * 0.3).toFixed(1)}`; }).join(' ')} Z"/></g><circle r="${r}" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="${r * 0.06}"/>`;
// original shirt silhouette (viewBox 400×420)
const SHIRT_BODY = 'M128 22 L82 34 L12 96 L54 168 L92 142 L92 404 Q200 418 308 404 L308 142 L346 168 L388 96 L318 34 L272 22 C 252 60, 148 60, 128 22 Z';
const SLEEVE_L = 'M82 34 L12 96 L54 168 L92 142 Z', SLEEVE_R = 'M318 34 L388 96 L346 168 L308 142 Z';
const TEAMS = [
  { name: 'الأهلي', bg: ['#7A0716', '#C8102E'], body: '#C8102E', sleeve: '#C8102E', trim: '#FFFFFF', stripes: null, text: '#FFFFFF' },
  { name: 'الزمالك', bg: ['#EDEFF2', '#FFFFFF'], body: '#F7F7F5', sleeve: '#F7F7F5', trim: '#E2231A', stripes: '#E2231A', text: '#E2231A' },
  { name: 'منتخب مصر', bg: ['#1A1A1A', '#CE1126'], body: '#CE1126', sleeve: '#111111', trim: '#FFFFFF', stripes: null, text: '#FFFFFF' },
];
// real results (BRIEF.md lists the sources): [right team, right score, left score, left team, caption, colours]
const RESULTS = [
  ['الأهلي', 3, 0, 'الزمالك', 'الدوري المصري · مايو ٢٠٢٦', [C.ahly, '#FFFFFF']],
  ['الزمالك', 1, 0, 'سيراميكا كليوباترا', 'الزمالك بطل الدوري ٢٠٢٥–٢٦', ['#FFFFFF', '#3B6FD8']],
  ['مصر', 3, 1, 'نيوزيلندا', 'كأس العالم ٢٠٢٦', [C.egypt, '#FFFFFF']],
];

let S = {};
// ---------------------------------------------------------------- formations (portrait pitch: own goal at the bottom)
const P442 = [[540, 1690], [230, 1500], [430, 1530], [650, 1530], [850, 1500], [230, 1230], [430, 1260], [650, 1260], [850, 1230], [430, 960], [650, 960]];
const P433 = [[540, 1690], [230, 1500], [430, 1530], [650, 1530], [850, 1500], [330, 1280], [540, 1230], [750, 1280], [240, 960], [540, 900], [840, 960]];
const OPP = [[300, 820], [540, 780], [780, 820], [420, 1060], [690, 1080]];

export default {
  duration: DUR, fps: 30,
  init(stage) {
    stage.style.background = C.ink; stage.style.overflow = 'hidden';
    const R = (z) => div(stage, { width: px(W), height: px(H), zIndex: String(z), overflow: 'hidden' });
    // grain tiles (deterministic), reused on top of everything
    S.grainUrls = []; for (let k = 0; k < 6; k++) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), d = g.createImageData(256, 256), r = rng(11 + k * 7); for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() - 0.5) * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); S.grainUrls.push(c.toDataURL()); }

    // ---------- A · KICK-OFF (0–1.6)
    S.A = R(1); S.A.style.background = `radial-gradient(70% 45% at 50% 58%, #123C26 0%, #07140D 55%, ${C.ink} 100%)`;
    S.Asvg = svg(S.A); S.Asvg.innerHTML = `<g id="pitch" stroke="${C.chalk}" stroke-width="7" fill="none" opacity="0.85"><line x1="-20" y1="1100" x2="1100" y2="1100" pathLength="1"/><circle cx="540" cy="1100" r="250" pathLength="1"/><circle cx="540" cy="1100" r="10" fill="${C.chalk}"/></g>
      <ellipse id="shadow" cx="540" cy="1110" rx="90" ry="20" fill="rgba(0,0,0,0.55)"/><g id="ball">${BALL(80)}</g>`;
    S.Aball = S.Asvg.querySelector('#ball'); S.Ash = S.Asvg.querySelector('#shadow'); S.Alines = [...S.Asvg.querySelectorAll('#pitch line, #pitch circle')];
    S.A1 = words(S.A, 'اتكلم', { size: 220, top: 330, shadow: '0 10px 40px rgba(0,0,0,0.6)' });
    S.A2 = words(S.A, 'كورة', { size: 220, top: 592, color: C.gold, shadow: '0 0 50px rgba(255,200,61,0.45)' });

    // ---------- B · TACTICS (1.6–4.8)
    S.B = R(2); S.B.style.background = `radial-gradient(90% 60% at 50% 55%, #145034 0%, ${C.board} 60%, #082416 100%)`;
    S.Bboard = div(S.B, { width: px(W), height: px(H), transformOrigin: '50% 60%' });
    { const c = el('canvas', { width: '540', height: '960', style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), opacity: '0.35', mixBlendMode: 'screen' } }, S.Bboard); const g = c.getContext('2d'), r = rng(4);
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${(0.02 + r() * 0.06).toFixed(3)})`; g.fillRect(r() * 540, r() * 960, 1 + r() * 3, 1); } for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 8 + r() * 20; g.beginPath(); const x = r() * 540, y = r() * 960; g.moveTo(x, y); g.lineTo(x + 80 + r() * 160, y + (r() - 0.5) * 30); g.stroke(); } }
    S.Bsvg = svg(S.Bboard);
    const ch = 'stroke="rgba(243,246,241,0.75)" stroke-width="6" fill="none"';
    S.Bsvg.innerHTML = `<g ${ch}><rect x="90" y="600" width="900" height="1240" rx="6"/><line x1="90" y1="1220" x2="990" y2="1220"/><circle cx="540" cy="1220" r="130"/><rect x="300" y="1640" width="480" height="200"/><rect x="420" y="1770" width="240" height="70"/><rect x="300" y="600" width="480" height="200"/></g>
      <g id="opp"></g><g id="arrows"></g><g id="dots"></g><g id="bdot"><circle r="22" fill="${C.gold}"/><circle r="44" fill="none" stroke="${C.gold}" stroke-width="5" opacity="0.6"/></g>`;
    S.dots = P442.map(() => { const g = el('g', {}, S.Bsvg.querySelector('#dots')); g.innerHTML = `<circle r="34" fill="${C.ahly}" stroke="#fff" stroke-width="6"/><circle r="34" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="16"/>`; return g; });
    S.opp = OPP.map(([x, y]) => { const g = el('g', { transform: `translate(${x},${y})` }, S.Bsvg.querySelector('#opp')); g.innerHTML = `<path d="M-24 -24 L24 24 M24 -24 L-24 24" stroke="${C.chalk}" stroke-width="10" stroke-linecap="round"/>`; return g; });
    const ARW = [[P433[6], P433[9], -120], [P433[9], P433[8], 140], [P433[8], [330, 700], -90], [P433[7], P433[10], 120]];
    S.arws = ARW.map(([a, b, bend]) => { const mx = (a[0] + b[0]) / 2 + bend * 0.6, my = (a[1] + b[1]) / 2 - Math.abs(bend) * 0.3; const p = el('path', { d: `M ${a[0]} ${a[1]} Q ${mx} ${my} ${b[0]} ${b[1]}`, stroke: C.chalk, 'stroke-width': '9', fill: 'none', 'stroke-linecap': 'round', pathLength: '1', 'stroke-dasharray': '0 1' }, S.Bsvg.querySelector('#arrows'));
      const ang = Math.atan2(b[1] - my, b[0] - mx) * 180 / Math.PI, h = el('path', { d: 'M -30 -18 L 0 0 L -30 18', stroke: C.chalk, 'stroke-width': '9', fill: 'none', 'stroke-linecap': 'round', transform: `translate(${b[0]},${b[1]}) rotate(${ang})` }, S.Bsvg.querySelector('#arrows')); return { p, h, a, b, mx, my }; });
    S.bdot = S.Bsvg.querySelector('#bdot');
    S.B1 = words(S.B, 'التكتيك', { size: 132, top: 292, shadow: '0 6px 24px rgba(0,0,0,0.5)' });
    S.Bf = div(S.B, { left: '390px', top: '462px', width: '300px', height: '96px', borderRadius: '48px', background: C.gold, overflow: 'hidden' });
    S.Bf1 = words(S.Bf, '٤-٤-٢', { size: 64, weight: 900, color: '#111', cx: 150, top: 10, width: 300, lh: 1.2, dir: 'ltr' });
    S.Bf2 = words(S.Bf, '٤-٣-٣', { size: 64, weight: 900, color: '#111', cx: 150, top: 10, width: 300, lh: 1.2, dir: 'ltr' });

    // ---------- C · TEAMS (4.8–8.0): one shirt, re-coloured by a diagonal wipe on every half bar
    S.C = R(3);
    S.Cbg = TEAMS.map((tm) => { const d = div(S.C, { width: px(W), height: px(H), background: `linear-gradient(160deg, ${tm.bg[0]} 0%, ${tm.bg[1]} 100%)` });
      const st = div(d, { width: px(W * 2), height: px(H * 2), left: px(-W / 2), top: px(-H / 2), opacity: '0.12', background: 'repeating-linear-gradient(-30deg, rgba(255,255,255,0.9) 0 26px, rgba(255,255,255,0) 26px 90px)' }); return { d, st }; });
    S.Cmarq = TEAMS.map((tm, i) => { const m = div(S.C, { left: '-200px', top: px(1380), whiteSpace: 'nowrap', fontFamily: AR, fontWeight: '900', fontSize: '260px', color: 'transparent', WebkitTextStroke: `3px ${i === 1 ? 'rgba(226,35,26,0.35)' : 'rgba(255,255,255,0.28)'}`, direction: 'rtl' }); m.textContent = `${tm.name}  ${tm.name}  ${tm.name}  ${tm.name}`; return m; });
    S.Cshirt = div(S.C, { left: '240px', top: '560px', width: '600px', height: '630px', transformOrigin: '50% 50%' });
    S.CshirtSvg = el('svg', { viewBox: '0 0 400 420', width: '600', height: '630', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, S.Cshirt);
    S.CshirtSvg.innerHTML = `<defs><linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.28"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.10"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/></linearGradient><clipPath id="sc"><path d="${SHIRT_BODY}"/></clipPath></defs>
      <path id="body" d="${SHIRT_BODY}"/><path id="sl" d="${SLEEVE_L}"/><path id="sr" d="${SLEEVE_R}"/>
      <g clip-path="url(#sc)"><rect id="st1" x="0" y="168" width="400" height="34"/><rect id="st2" x="0" y="214" width="400" height="34"/><path d="M150 120 Q 140 260 160 400 M260 120 Q 270 260 250 400" stroke="#000" stroke-opacity="0.12" stroke-width="10" fill="none"/></g>
      <path id="collar" d="M128 22 C 148 60, 252 60, 272 22" fill="none" stroke-width="12"/><path id="cuffL" d="M12 96 L54 168" stroke-width="10"/><path id="cuffR" d="M388 96 L346 168" stroke-width="10"/>
      <path d="${SHIRT_BODY}" fill="url(#shade)"/><g id="crest" transform="translate(270 128)"><circle r="26" id="cr1"/><circle r="17" fill="none" stroke-width="4" id="cr2"/><g transform="scale(0.32)">${BALL(40)}</g></g>`;
    S.sh = Object.fromEntries(['body', 'sl', 'sr', 'st1', 'st2', 'collar', 'cuffL', 'cuffR', 'cr1', 'cr2'].map((k) => [k, S.CshirtSvg.querySelector('#' + k)]));
    S.Cname = TEAMS.map((tm) => words(S.C, tm.name, { size: tm.name.length > 7 ? 128 : 150, top: 300, color: tm.text, shadow: tm.text === '#FFFFFF' ? '0 8px 30px rgba(0,0,0,0.45)' : '' }));
    S.Cwipe = div(S.C, { width: px(W), height: px(H), zIndex: '5' });
    // the two leagues: roundels in their colours with the names
    S.Cl = div(S.C, { width: px(W), height: px(H), zIndex: '6', background: `linear-gradient(90deg, #0B1E3F 0 50%, ${C.plP} 50% 100%)` });
    S.CL = [['الدوري المصري', ['#D21034', '#FFFFFF', '#111111'], 790, 'top'], ['الدوري الإنجليزي', [C.plM, C.plG, '#FFFFFF'], 290, 'bottom']].map(([name, cols, cx, k], i) => {
      const g = div(S.Cl, { left: px(cx - 200), top: px(i ? 700 : 470), width: '400px', height: '400px', transformOrigin: '50% 50%' });
      const s = el('svg', { viewBox: '-200 -200 400 400', width: '400', height: '400', style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } }, g);
      s.innerHTML = `<circle r="180" fill="${cols[0]}"/><circle r="150" fill="none" stroke="${cols[1]}" stroke-width="16"/><circle r="118" fill="${i ? C.plP : '#0B1E3F'}"/><g transform="rotate(${i ? 18 : -12})">${BALL(70)}</g><circle r="190" fill="none" stroke="${cols[2]}" stroke-width="5" stroke-dasharray="14 12"/>`;
      const L = words(S.Cl, name, { size: i ? 56 : 62, top: i ? 1124 : 330, cx: i ? 320 : 770, width: 470, lh: 1.2, color: i ? C.plG : '#FFFFFF' });
      return { g, L }; });

    // ---------- D · RESULTS (8.0–11.2)
    S.D = R(4); S.D.style.background = `radial-gradient(90% 60% at 50% 40%, #13254D 0%, ${C.navy} 50%, ${C.ink} 100%)`;
    S.Dled = div(S.D, { width: px(W), height: px(H), opacity: '0.18', background: 'radial-gradient(circle, rgba(255,255,255,0.9) 1.6px, transparent 2px) 0 0 / 14px 14px' });
    S.D1 = words(S.D, 'النتايج', { size: 132, top: 292, shadow: '0 6px 24px rgba(0,0,0,0.5)' });
    S.cards = RESULTS.map(([ta, sa, sb, tb, cap, cols], i) => {
      const y = 470 + i * 255, card = div(S.D, { left: '50px', top: px(y), width: '980px', height: '220px', borderRadius: '26px', background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))', border: '2px solid rgba(255,255,255,0.18)', overflow: 'hidden', transformOrigin: '100% 50%' });
      div(card, { left: '952px', top: '0', width: '28px', height: '220px', background: cols[0] }); div(card, { left: '0', top: '0', width: '28px', height: '220px', background: cols[1] });
      const nA = words(card, ta, { size: 54, cx: 820, top: 50, width: 300, lh: 1.2 }), nB = words(card, tb, { size: tb.length > 9 ? 36 : 54, cx: 175, top: tb.length > 9 ? 62 : 50, width: 320, lh: 1.2 });
      const box = div(card, { left: '355px', top: '22px', width: '270px', height: '128px', borderRadius: '18px', background: '#050A18' });
      const dA = words(box, ar(sa), { size: 92, weight: 900, color: C.gold, cx: 205, top: 4, width: 110, lh: 1.25 }), dB = words(box, ar(sb), { size: 92, weight: 900, color: C.gold, cx: 65, top: 4, width: 110, lh: 1.25 });
      const dash = div(box, { left: '120px', top: '58px', width: '30px', height: '10px', borderRadius: '5px', background: '#fff' });
      const capL = words(card, cap, { size: 34, weight: 600, color: '#BFD0FF', cx: 490, top: 160, width: 900, lh: 1.2 });
      const shine = div(card, { left: '-300px', top: '0', width: '160px', height: '220px', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.18), rgba(255,255,255,0))', transform: 'skewX(-20deg)' });
      return { card, nA, nB, dA, dB, sa, sb, capL, shine };
    });

    // ---------- E · ANALYSIS (11.2–14.4)
    S.E = R(5); S.E.style.background = `linear-gradient(180deg, ${C.ink} 0%, #0B1A2E 100%)`;
    S.E1 = words(S.E, 'التحليل', { size: 132, top: 292, shadow: '0 6px 24px rgba(0,0,0,0.5)' });
    S.Eclk = words(S.E, '٠٠:٠٠', { size: 84, weight: 800, color: C.lime, top: 452, width: 500, lh: 1.2, dir: 'ltr' });
    S.Eheat = el('canvas', { width: '270', height: '360', style: { position: 'absolute', left: '135px', top: '590px', width: '810px', height: '1080px', borderRadius: '20px' } }, S.E);
    S.Esvg = svg(S.E); S.Esvg.innerHTML = `<g stroke="rgba(255,255,255,0.55)" stroke-width="4" fill="none"><rect x="135" y="590" width="810" height="1080" rx="20"/><line x1="135" y1="1130" x2="945" y2="1130"/><circle cx="540" cy="1130" r="100"/><rect x="330" y="590" width="420" height="160"/><rect x="330" y="1510" width="420" height="160"/></g>
      <g id="net"></g><g id="run"></g><g id="radar" transform="translate(860 1560)"></g><g id="ring" transform="translate(220 1560)"><circle r="92" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" stroke-width="16"/><circle id="ringv" r="92" fill="none" stroke="${C.lime}" stroke-width="16" pathLength="1" transform="rotate(-90)" stroke-linecap="round"/></g>`;
    { const net = S.Esvg.querySelector('#net'), N = [[540, 1600], [300, 1460], [460, 1480], [620, 1480], [780, 1460], [360, 1260], [540, 1210], [720, 1260], [290, 940], [540, 860], [790, 940]], E = [[0, 2], [2, 6], [1, 5], [5, 6], [6, 7], [3, 7], [4, 7], [5, 8], [6, 9], [7, 10], [8, 9], [9, 10], [2, 3], [6, 8]];
      S.Eedges = E.map(([a, b], i) => el('line', { x1: N[a][0], y1: N[a][1], x2: N[b][0], y2: N[b][1], stroke: C.lime, 'stroke-width': String(4 + (i % 4) * 3), 'stroke-linecap': 'round', pathLength: '1', 'stroke-dasharray': '0 1', opacity: '0.85' }, net));
      S.Enodes = N.map(([x, y]) => el('circle', { cx: x, cy: y, r: '0', fill: '#fff', stroke: C.lime, 'stroke-width': '6' }, net)); }
    S.Erad = S.Esvg.querySelector('#radar'); S.Erad.innerHTML = [0.33, 0.66, 1].map((k) => `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return `${(Math.cos(a) * 110 * k).toFixed(1)},${(Math.sin(a) * 110 * k).toFixed(1)}`; }).join(' ')}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>`).join('') + `<polygon id="rp" fill="rgba(198,255,61,0.35)" stroke="${C.lime}" stroke-width="5"/>`;
    S.Erp = S.Erad.querySelector('#rp'); S.Eringv = S.Esvg.querySelector('#ringv'); S.Erun = S.Esvg.querySelector('#run');
    S.Erun.innerHTML = `<path id="runp" d="M 300 1500 C 260 1300, 420 1180, 380 1000 S 520 820, 600 700" stroke="${C.gold}" stroke-width="10" fill="none" stroke-dasharray="2 22" stroke-linecap="round"/><g id="runb">${BALL(22)}</g>`;
    S.Erp2 = S.Erun.querySelector('#runp'); S.Erb = S.Erun.querySelector('#runb');

    // ---------- F · WORD BLAST (14.4–16.0)
    S.F = R(6);
    S.Fw = [['تكتيك', '#0F3A24', '#FFFFFF'], ['نتايج', C.ahly, '#FFFFFF'], ['تحليل', '#FFFFFF', '#0A1430'], ['جووول!', C.gold, '#111111']].map(([w, bg, fg]) => { const d = div(S.F, { width: px(W), height: px(H), background: bg }); const L = words(d, w, { size: 230, top: 700, color: fg }); return { d, L }; });
    S.Fball = svg(S.F, { zIndex: '3' }); S.Fball.innerHTML = `<g id="fb">${BALL(70)}</g>`; S.Ffb = S.Fball.querySelector('#fb');

    // ---------- G · THE HOST (16.0–20.0): his own footage until the title has flown in, then a freeze with 2D accents
    S.G = R(7); S.G.style.background = C.ink;
    S.Gbg = div(S.G, { width: px(W), height: px(H), background: `radial-gradient(50% 18% at 20% 22%, rgba(220,235,255,0.35), transparent 70%), radial-gradient(50% 18% at 80% 20%, rgba(220,235,255,0.32), transparent 70%), radial-gradient(80% 30% at 50% 82%, rgba(31,107,53,0.55), transparent 75%), linear-gradient(180deg, #0A1226 0%, ${C.ink} 55%, #06140C 100%)`, transformOrigin: '50% 50%' });
    S.Gcard = div(S.G, { left: '0', top: '640px', width: px(W), height: px(608), overflow: 'hidden', transformOrigin: '50% 50%', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' });
    S.Gframes = []; for (let i = 1; i <= 24; i++) S.Gframes.push(el('img', { src: new URL(`./plates/end/e${String(i).padStart(3, '0')}.jpg`, import.meta.url).href, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(608), display: 'none' } }, S.Gcard));
    S.Gsweep = div(S.Gcard, { left: '-400px', top: '0', width: '260px', height: '608px', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,240,200,0.45), rgba(255,255,255,0))', transform: 'skewX(-18deg)' });
    S.Gsvg = svg(S.G); S.Gsvg.innerHTML = `<g id="brk" stroke="${C.gold}" stroke-width="10" fill="none" stroke-linecap="round"></g><g id="spk"></g><rect id="top" x="0" y="600" width="1080" height="12" fill="${C.gold}"/><rect id="bot" x="0" y="1276" width="1080" height="12" fill="${C.gold}"/>`;
    S.Gbrk = S.Gsvg.querySelector('#brk'); S.Gtop = S.Gsvg.querySelector('#top'); S.Gbot = S.Gsvg.querySelector('#bot');
    S.Gspk = []; { const r = rng(91); for (let i = 0; i < 46; i++) S.Gspk.push({ e: el('circle', { r: (2 + r() * 5).toFixed(1), fill: i % 3 ? C.gold : '#FFFFFF' }, S.Gsvg.querySelector('#spk')), x: r() * 1080, y: 300 + r() * 1400, v: 40 + r() * 120, ph: r() * 6 }); }
    S.flash = div(stage, { width: px(W), height: px(H), zIndex: '20', background: '#fff', opacity: '0' });
    S.grain = div(stage, { width: px(W), height: px(H), zIndex: '21', opacity: '0.06', mixBlendMode: 'overlay', backgroundSize: '256px 256px' });
  },

  render(t, frame) {
    S.grain.style.backgroundImage = `url(${S.grainUrls[(frame ?? Math.round(t * 30)) % 6]})`;
    let flash = 0;
    // ================= A
    if (show(S.A, t < 1.75)) {
      S.Alines.forEach((l, i) => l.setAttribute('stroke-dasharray', `${ease.outCubic(ramp(t, 0.02 + i * 0.08, 0.4 + i * 0.08)).toFixed(4)} 1`));
      // ball drops in, bounces on the beats with squash, then is kicked through the lens
      let by, sx = 1, sy = 1, sc = 1, rot = t * 260;
      if (t < 0.4) by = lerp(-200, 1020, ease.inCubic(ramp(t, 0, 0.4)));
      else if (t < EV.kickBall) { const k = ((t - 0.4) % 0.4) / 0.4, hgt = t < 0.8 ? 360 : 200; by = 1020 - hgt * 4 * k * (1 - k); const c = Math.exp(-((t - 0.4) % 0.4) / 0.04); sy = 1 - 0.28 * c; sx = 1 + 0.2 * c; }
      else { const k = ease.inCubic(ramp(t, EV.kickBall, 1.6)); by = lerp(1020, 900, k); sc = lerp(1, 26, k); rot += k * 400; }
      S.Aball.setAttribute('transform', `translate(540 ${by.toFixed(1)}) scale(${(sx * sc).toFixed(3)} ${(sy * sc).toFixed(3)}) rotate(${rot.toFixed(1)})`);
      S.Ash.setAttribute('rx', (90 * (0.5 + 0.5 * clamp(by / 1020))).toFixed(1)); S.Ash.style.opacity = (t < EV.kickBall ? clamp(by / 1020) : 1 - ramp(t, EV.kickBall, 1.4)).toFixed(3);
      slam(S.A1, t, EV.slamA, 1.35); slam(S.A2, t, EV.slamB, 1.38);
      if (t > 1.5) flash = Math.max(flash, 0.0);
    }
    // ================= B
    if (show(S.B, t >= 1.52 && t < 4.95)) {
      const enter = ease.outCubic(ramp(t, 1.52, 1.9)); S.B.style.clipPath = t < 1.9 ? `circle(${(enter * 1300).toFixed(0)}px at 540px 900px)` : 'none';
      const m = ease.inOutCubic(ramp(t, EV.morph, EV.morph + 0.45)), pass = [0, 1, 2].reduce((s, i) => s + ease.inOutSine(ramp(t, EV.passes[i], EV.passes[i] + 0.3)), 0);
      const zoom = 1 + 0.06 * ramp(t, 1.6, 4.8) + 0.05 * Math.sin(ramp(t, 3.6, 4.6) * Math.PI);
      S.Bboard.style.transform = `scale(${zoom.toFixed(4)}) rotate(${(-1.2 + 2.4 * ramp(t, 1.6, 4.8)).toFixed(3)}deg)`;
      S.dots.forEach((d, i) => { const p = spr(t, EV.dots + i * 0.05, 0.35, 0.4), [x, y] = [lerp(P442[i][0], P433[i][0], m), lerp(P442[i][1], P433[i][1], m)]; d.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${Math.max(0.001, p).toFixed(3)})`); });
      S.opp.forEach((o, i) => { const p = spr(t, EV.dots + 0.35 + i * 0.06, 0.3, 0.4); o.style.opacity = clamp(p).toFixed(3); });
      S.arws.forEach((a, i) => { const t0 = i < 3 ? EV.passes[i] - 0.15 : EV.arrows, p = ease.inOutSine(ramp(t, t0, t0 + 0.3)); a.p.setAttribute('stroke-dasharray', `${p.toFixed(4)} 1`); a.h.style.opacity = (p > 0.97 ? 1 : 0).toString(); });
      // the ball as a glowing dot runs the passes
      const seg = Math.min(2, Math.floor(pass)), u = pass - seg, A = S.arws[seg]; const q = (1 - u) ** 2, bx = q * A.a[0] + 2 * (1 - u) * u * A.mx + u * u * A.b[0], byy = q * A.a[1] + 2 * (1 - u) * u * A.my + u * u * A.b[1];
      S.bdot.style.display = t >= EV.passes[0] - 0.1 ? 'inline' : 'none'; S.bdot.setAttribute('transform', `translate(${bx.toFixed(1)},${byy.toFixed(1)}) scale(${(1 + 0.25 * Math.sin(t * 30)).toFixed(3)})`);
      slam(S.B1, t, 1.7, 4.55); const fv = t >= 1.95 && t < 4.75; S.Bf.style.display = fv ? 'block' : 'none';
      if (fv) { const p = spr(t, 1.95, 0.4, 0.3), sw = ease.inOutCubic(ramp(t, EV.morph, EV.morph + 0.25)); S.Bf.style.transform = `scale(${lerp(0.4, 1, p).toFixed(3)})`; S.Bf.style.opacity = clamp(p * 2 * (1 - ramp(t, 4.55, 4.7))).toFixed(3);
        S.Bf1.line.style.transform = `translateY(${(-96 * sw).toFixed(1)}px)`; S.Bf2.line.style.transform = `translateY(${(96 * (1 - sw)).toFixed(1)}px)`;
        S.Bf1.words.forEach((w) => { w.style.opacity = sw < 0.5 ? '1' : '0'; }); S.Bf2.words.forEach((w) => { w.style.opacity = sw >= 0.5 ? '1' : '0'; }); }
      else { S.Bf1.words.forEach((w) => { w.style.opacity = '0'; }); S.Bf2.words.forEach((w) => { w.style.opacity = '0'; }); }
    }
    // ================= C
    if (show(S.C, t >= EV.wipe && t < 8.15)) {
      const k = t < EV.teams[1] ? 0 : t < EV.teams[2] ? 1 : 2, tm = TEAMS[k];
      S.C.style.clipPath = t < EV.teams[0] ? `polygon(0 0, ${(ease.inOutCubic(ramp(t, EV.wipe, EV.teams[0])) * 260).toFixed(1)}% 0, ${(ease.inOutCubic(ramp(t, EV.wipe, EV.teams[0])) * 260 - 60).toFixed(1)}% 100%, 0 100%)` : 'none';
      S.Cbg.forEach((b, i) => { b.d.style.display = i === k ? 'block' : 'none'; b.st.style.transform = `translateX(${((t * 120) % 104).toFixed(1)}px)`; });
      S.Cmarq.forEach((m, i) => { m.style.display = i === k ? 'block' : 'none'; m.style.transform = `translateX(${(-300 + ((t - 4.8) * 260) % 900).toFixed(1)}px)`; });
      // shirt: flips on every change (scaleX through 0 = the colour swap), breathes, sways
      const tc = EV.teams[k], flip = k > 0 ? Math.abs(Math.cos(Math.min(1, (t - tc + 0.12) / 0.24) * Math.PI / 2 + Math.PI / 2)) : 1, inA = spr(t, EV.teams[0], 0.5, 0.3);
      const sway = Math.sin(t * 5) * 3;
      S.Cshirt.style.transform = `translateY(${((1 - clamp(inA)) * 300).toFixed(1)}px) rotate(${sway.toFixed(2)}deg) scale(${(Math.max(0.02, k > 0 && t < tc + 0.12 ? flip : 1) * (0.9 + 0.1 * clamp(inA))).toFixed(3)}, ${(0.9 + 0.1 * clamp(inA)).toFixed(3)})`;
      const cur = k > 0 && t < tc ? TEAMS[k - 1] : tm;
      S.sh.body.setAttribute('fill', cur.body); S.sh.sl.setAttribute('fill', cur.sleeve); S.sh.sr.setAttribute('fill', cur.sleeve);
      ['st1', 'st2'].forEach((s) => { S.sh[s].setAttribute('fill', cur.stripes || 'none'); }); ['collar', 'cuffL', 'cuffR'].forEach((s) => S.sh[s].setAttribute('stroke', cur.trim));
      S.sh.cr1.setAttribute('fill', cur.trim); S.sh.cr2.setAttribute('stroke', cur.body);
      S.Cname.forEach((L, i) => slam(L, t, EV.teams[i] + 0.05, i < 2 ? EV.teams[i + 1] - 0.12 : EV.teams[3] - 0.12, { s0: 0.4 }));
      // leagues: split screen, two roundels spin in
      const lv = show(S.Cl, t >= EV.teams[3] - 0.15);
      if (lv) { const w = ease.inOutCubic(ramp(t, EV.teams[3] - 0.15, EV.teams[3] + 0.1)); S.Cl.style.clipPath = `inset(${((1 - w) * 100).toFixed(2)}% 0 0 0)`;
        S.CL.forEach((l, i) => { const p = spr(t, EV.teams[3] + i * 0.15, 0.5, 0.3); l.g.style.transform = `scale(${Math.max(0.01, p).toFixed(3)}) rotate(${((1 - clamp(p)) * (i ? 180 : -180) + Math.sin(t * 3 + i) * 4).toFixed(1)}deg)`; slam(l.L, t, EV.teams[3] + 0.1 + i * 0.15, 7.92); }); }
    }
    // ================= D
    if (show(S.D, t >= 7.92 && t < 11.35)) {
      const e = ease.outCubic(ramp(t, 7.92, 8.15)); S.D.style.clipPath = t < 8.15 ? `inset(0 0 ${((1 - e) * 100).toFixed(2)}% 0)` : 'none';
      slam(S.D1, t, 8.0, 11.05); S.Dled.style.backgroundPosition = `${(t * 21).toFixed(1)}px ${(t * 9).toFixed(1)}px`; S.Dled.style.opacity = (0.14 + 0.06 * Math.sin(t * 7)).toFixed(3);
      S.cards.forEach((c, i) => { const a = EV.cards[i], p = spr(t, a, 0.5, 0.22), o = ease.inCubic(ramp(t, EV.cardsOut + i * 0.05, EV.cardsOut + i * 0.05 + 0.25)), vis = t >= a - 0.01 && t < EV.cardsOut + 0.4;
        c.card.style.display = vis ? 'block' : 'none'; if (!vis) return; const op = (clamp((p - 0.75) / 0.15) * (1 - o)).toFixed(3), bob = Math.sin(t * 4 + i * 1.3) * 5;
        c.card.style.transform = `translateX(${((1 - clamp(p)) * 200).toFixed(1)}px) translateY(${bob.toFixed(1)}px) skewX(${((1 - clamp(p)) * -14).toFixed(2)}deg) scale(${(1 - 0.15 * o).toFixed(3)})`; c.card.style.opacity = (clamp(p * 2) * (1 - o)).toFixed(3);
        c.shine.style.left = `${lerp(-300, 1300, ((t - a + i * 0.35) % 1.4) / 1.4).toFixed(1)}px`;
        // slot-machine digits: roll through numbers, land on the real score on the next 8th
        const roll = (L, v, d) => { const land = a + 0.3 + d; L.words[0].textContent = ar(t < land ? Math.floor(hash(i, Math.floor(t * 30), d * 10) * 10) : v); L.words[0].style.transform = `translateY(${(t < land ? Math.sin(t * 60) * 6 : -14 * Math.exp(-(t - land) / 0.06) * Math.cos((t - land) * 40)).toFixed(1)}px)`; L.words[0].style.opacity = op; };
        roll(c.dA, c.sa, 0); roll(c.dB, c.sb, 0.1); [c.nA, c.nB, c.capL].forEach((L) => L.words.forEach((w) => { w.style.opacity = op; })); });
    }
    // ================= E
    if (show(S.E, t >= 11.1 && t < 14.5)) {
      const e = ease.inOutCubic(ramp(t, 11.1, 11.35)); S.E.style.clipPath = t < 11.35 ? `circle(${(e * 1300).toFixed(0)}px at 540px 1130px)` : 'none';
      slam(S.E1, t, 11.25, 14.25); slam(S.Eclk, t, 11.4, 14.28, { s0: 0.8 });
      const sec = Math.round(ease.outCubic(ramp(t, EV.clock[0], EV.clock[1])) * 5400); S.Eclk.words[0].textContent = ar(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);
      // heat map: moving blobs (pure in t) painted into a small canvas, scaled up = soft
      { const g = S.Eheat.getContext('2d'); g.clearRect(0, 0, 270, 360); g.globalCompositeOperation = 'lighter'; const grow = ramp(t, 11.3, 12.3);
        for (let i = 0; i < 9; i++) { const x = 135 + 90 * noise1(t * 0.6 + i * 3.1, 7) * 1.4, y = 60 + i * 30 + 40 * noise1(t * 0.5 + i, 3), r = (40 + 30 * noise1(t + i * 2, 5)) * grow; if (r <= 1) continue;
          const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,60,40,0.55)'); gr.addColorStop(0.4, 'rgba(255,200,40,0.30)'); gr.addColorStop(1, 'rgba(40,255,140,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
        S.Eheat.style.opacity = (0.85 * sm(11.3, 11.8, t)).toFixed(3); }
      S.Eedges.forEach((l, i) => { const p = ease.outCubic(ramp(t, 12.0 + i * 0.05, 12.35 + i * 0.05)); l.setAttribute('stroke-dasharray', `${p.toFixed(4)} 1`); l.setAttribute('stroke-width', (4 + (i % 4) * 3 + 3 * Math.sin(t * 8 + i)).toFixed(1)); });
      S.Enodes.forEach((n, i) => n.setAttribute('r', (16 * spr(t, 11.9 + i * 0.04, 0.35, 0.4)).toFixed(2)));
      const rv = [0, 1, 2, 3, 4, 5].map((i) => 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7)) * ramp(t, 12.4, 12.9)); S.Erp.setAttribute('points', rv.map((v, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return `${(Math.cos(a) * 110 * v).toFixed(1)},${(Math.sin(a) * 110 * v).toFixed(1)}`; }).join(' '));
      S.Eringv.setAttribute('stroke-dasharray', `${(0.62 * ease.outCubic(ramp(t, 12.6, 13.4)) + 0.02 * Math.sin(t * 6)).toFixed(4)} 1`);
      const rp = ease.inOutSine(ramp(t, 12.8, 13.8)), len = S.Erp2.getTotalLength(), pt = S.Erp2.getPointAtLength(len * rp); S.Erb.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)}) rotate(${(t * 500).toFixed(0)})`);
      S.Erp2.style.strokeDashoffset = (-t * 60).toFixed(1); S.Erun.style.opacity = sm(12.7, 12.9, t).toFixed(3);
    }
    // ================= F
    if (show(S.F, t >= 14.38 && t < 16.02)) {
      const k = Math.min(3, Math.floor((t - 14.4) / BEAT + 1e-6)), a = EV.blast[Math.max(0, k)];
      S.Fw.forEach((w, i) => { w.d.style.display = i === Math.max(0, k) ? 'block' : 'none'; }); const L = S.Fw[Math.max(0, k)].L, e = spr(t, a, 0.28, 0.35), shake = k === 3 ? 10 * Math.exp(-(t - a) / 0.15) * Math.sin(t * 90) : 0;
      L.words.forEach((w) => { w.style.opacity = clamp((t - a) / 0.04).toFixed(3); w.style.transform = `translateX(${shake.toFixed(1)}px) scale(${lerp(0.5, 1, e).toFixed(4)})`; blur(w, (1 - clamp(e)) * 10); });
      S.Fw.forEach((w, i) => { if (i !== Math.max(0, k)) w.L.words.forEach((x) => { x.style.opacity = '0'; }); });
      // the ball crosses every word on its beat, then flies at the lens on "جووول!"
      const bk = (t - a) / BEAT, bx = k % 2 ? lerp(1200, -120, bk) : lerp(-120, 1200, bk), byv = 1300 - 260 * Math.sin(Math.PI * bk), sc = k === 3 ? 1 + 18 * ease.inCubic(ramp(t, 15.75, 16.0)) : 1;
      S.Ffb.setAttribute('transform', `translate(${(k === 3 ? lerp(bx, 540, ramp(t, 15.7, 16)) : bx).toFixed(1)},${(k === 3 ? lerp(byv, 960, ramp(t, 15.7, 16)) : byv).toFixed(1)}) scale(${sc.toFixed(3)}) rotate(${(t * 700).toFixed(0)})`);
    }
    // ================= G
    if (show(S.G, t >= 15.98)) {
      flash = Math.max(flash, Math.exp(-Math.max(0, t - EV.end) / 0.12) * (t >= EV.end ? 1 : 0), t >= EV.freeze ? 0.85 * Math.exp(-(t - EV.freeze) / 0.1) : 0);
      const fi = t < EV.freeze ? Math.min(23, Math.floor((t - EV.end) * 24 * 0.7)) : 23; S.Gframes.forEach((f, i) => { f.style.display = i === fi ? 'block' : 'none'; });
      const inn = spr(t, EV.end, 0.55, 0.2), push = ease.inOutSine(ramp(t, EV.freeze, 20));
      S.Gcard.style.transform = `scale(${(lerp(1.35, 1, clamp(inn)) * (1 + 0.14 * push)).toFixed(4)})`;
      S.Gbg.style.transform = `scale(${(1.05 + 0.05 * ramp(t, 16, 20)).toFixed(4)})`;
      const bar = ease.outCubic(ramp(t, EV.freeze, EV.freeze + 0.35)); [S.Gtop, S.Gbot].forEach((r, i) => { r.setAttribute('width', (1080 * bar).toFixed(1)); r.setAttribute('x', i ? (1080 * (1 - bar)).toFixed(1) : '0'); r.setAttribute('y', i ? (1248 + 0.14 * 304 * push + 8).toFixed(1) : (640 - 0.14 * 304 * push - 20).toFixed(1)); });
      const bp = ease.outCubic(ramp(t, EV.freeze + 0.1, EV.freeze + 0.5)), m = 60 * bp; const y0 = 640 - 0.14 * 304 * push - 50, y1 = 1248 + 0.14 * 304 * push + 50;
      S.Gbrk.innerHTML = bp > 0 ? `<path d="M 40 ${y0 + m} L 40 ${y0} L ${40 + m} ${y0} M ${1040 - m} ${y0} L 1040 ${y0} L 1040 ${y0 + m} M 40 ${y1 - m} L 40 ${y1} L ${40 + m} ${y1} M ${1040 - m} ${y1} L 1040 ${y1} L 1040 ${y1 - m}"/>` : '';
      EV.sweep.forEach((s) => { if (t >= s && t < s + 0.7) S.Gsweep.style.left = `${lerp(-400, 1300, ease.inOutSine(ramp(t, s, s + 0.7))).toFixed(1)}px`; });
      if (!EV.sweep.some((s) => t >= s && t < s + 0.7)) S.Gsweep.style.left = '-400px';
      const sp = sm(EV.freeze, EV.freeze + 0.4, t); S.Gspk.forEach((s) => { const y = s.y - ((t - EV.freeze) * s.v) % 1400; s.e.setAttribute('cx', (s.x + 20 * Math.sin(t * 2 + s.ph)).toFixed(1)); s.e.setAttribute('cy', (y < 300 ? y + 1400 : y).toFixed(1)); s.e.style.opacity = (sp * (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + s.ph)))).toFixed(3); });
    }
    S.flash.style.opacity = clamp(flash).toFixed(3); S.flash.style.display = flash > 0.01 ? 'block' : 'none';
  },
};
