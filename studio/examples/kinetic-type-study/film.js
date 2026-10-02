// KINETIC TYPE STUDY — directed typography that RECOMPOSES per aspect ratio (lib/layout.js +
// lib/typography.js). Same content, real layouts for 16:9 / 1:1 / 4:5 / 9:16: slots move, sizes fit
// their slot (fitFontSize), Arabic reveals by line with a mask (never by letter), a highlight marker
// draws in reading direction, a number counts in Arabic-Indic digits with tabular figures, and the
// Latin line may reveal by grapheme because Latin letters do not join.
import { el } from '../../lib/motion.js';
import { compose } from '../../lib/layout.js';
import { textBlock, reveal, counter, highlight, fitFontSize, fitBlock } from '../../lib/typography.js';
import { curves } from '../../lib/kinetics.js';

const C = { paper: '#F1EDE4', ink: '#141414', accent: '#2F5BFF', soft: '#8A8478' };
const SLOTS = {
  headline: { wide: [0.0, 0.08, 0.55, 0.5], square: [0, 0.06, 1, 0.42], portrait: [0, 0.06, 1, 0.38], tall: [0, 0.04, 1, 0.3] },
  number: { wide: [0.6, 0.12, 0.4, 0.42], square: [0, 0.5, 1, 0.26], portrait: [0, 0.48, 1, 0.26], tall: [0, 0.4, 1, 0.24] },
  latin: { wide: [0.0, 0.66, 0.55, 0.1], square: [0, 0.82, 1, 0.08], portrait: [0, 0.8, 1, 0.08], tall: [0, 0.7, 1, 0.07] },
  rule: { wide: [0.0, 0.6, 0.55, 0.01], square: [0.3, 0.78, 0.4, 0.008], portrait: [0.3, 0.77, 0.4, 0.008], tall: [0.3, 0.67, 0.4, 0.006] },
};
let W, H, L, head, num, latin, rule, marker, numSize;
const px = v => `${v}px`;

export default {
  duration: 5, fps: 30,
  init(stage, { W: w, H: h }) {
    W = w; H = h;
    stage.style.background = C.paper;
    L = compose(SLOTS, w, h, { safe: h > w * 1.6 ? 'reels' : 'titleSafe' });
    const r = L.rects, wide = L.aspect === 'wide';
    const hs = Math.min(r.headline.w / 6.2, r.headline.h / 2.6);
    head = textBlock(stage, 'الكلام اللي يتقري… يتصمم', { left: px(r.headline.x), top: px(r.headline.y), width: px(r.headline.w), fontFamily: 'El Messiri', fontWeight: 700,
      fontSize: px(hs), lineHeight: 1.25, color: C.ink }, { align: wide ? 'start' : 'center' });
    num = counter(stage, { left: px(r.number.x), top: px(r.number.y), width: px(r.number.w), textAlign: 'center', fontFamily: 'Montserrat', fontWeight: 300, color: C.accent, lineHeight: 1 },
      { digits: 'arab', suffix: '' });
    latin = textBlock(stage, 'EDITORIAL MOTION', { left: px(r.latin.x), top: px(r.latin.y), width: px(r.latin.w), fontFamily: 'Montserrat', fontWeight: 600,
      fontSize: px(Math.min(r.latin.h * 0.55, r.latin.w / 18)), letterSpacing: '0.3em', color: C.soft }, { by: 'grapheme', align: wide ? 'right' : 'center', lang: 'en' });
    rule = el('div', { style: { position: 'absolute', left: px(r.rule.x), top: px(r.rule.y), width: px(r.rule.w), height: px(Math.max(2, r.rule.h)), background: C.ink, transformOrigin: wide ? '100% 50%' : '50% 50%' } }, stage);
    marker = highlight(head, [3], { color: 'rgba(47,91,255,0.22)', height: 0.38, offset: 0.62 });
    numSize = null; this.slot = r.number;
  },
  render(t) {
    // Size the number to its slot once fonts are ready (first render), from the widest value shown.
    if (!head.fitted) fitBlock(head, { maxWidth: L.rects.headline.w, maxHeight: L.rects.headline.h, max: L.rects.headline.h / 1.2 });
    if (!numSize) { numSize = Math.min(fitFontSize('١٬٢٥٠', { family: 'Montserrat', weight: 300, maxWidth: this.slot.w * 0.8, max: this.slot.h * 0.95 }), this.slot.h * 0.95); num.line.style.fontSize = numSize + 'px'; }
    reveal(head, t, { tIn: 0.3, style: 'mask', per: 'line', stagger: 0.22, dur: 0.9, curve: curves.emphasized });
    marker(t, { start: 1.5, dur: 0.6 });
    rule.style.transform = `scaleX(${curves.decelerate(Math.min(1, Math.max(0, (t - 1.1) / 0.8))).toFixed(4)})`;
    num.render(t, { start: 1.4, end: 3.2, from: 0, to: 1250, visible: t >= 1.3 });
    reveal(latin, t, { tIn: 2.2, style: 'rise', stagger: 0.035, dur: 0.5 });
  },
};
