// Directed typography for composer pages: Arabic-safe splitting, balanced blocks, fitted sizes,
// line/word reveals, counting numbers. Text elements keep the studio's `.line` / `.word` classes so
// the text read-back (safe area, overlaps, captions) sees exactly what is on screen.
// Arabic is cursive: it is split by WORD or LINE, never by letter (letters would lose their joins).
import { clamp, lerp, ramp, ease, el, show } from './motion.js';
import { formatNumber, countValue, curves } from './kinetics.js';

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u;
const STRONG_RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/u, STRONG_LTR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/u;
export const isArabic = text => ARABIC.test(text);
// Base direction from the first strong character (Unicode bidi rule P2).
export function direction(text) {
  for (const ch of text) { if (/[\u0660-\u0669\u06F0-\u06F9]/u.test(ch)) continue; // Arabic-Indic digits are weak (AN)
    if (STRONG_RTL.test(ch)) return 'rtl'; if (STRONG_LTR.test(ch)) return 'ltr'; }
  return 'ltr';
}

// Split into reveal units. 'word' and 'line' are safe for every script; 'grapheme' only for scripts
// whose letters do not join (throws for Arabic so a film cannot ship broken shaping by accident).
export function units(text, by = 'word', locale) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('text required');
  if (by === 'grapheme') {
    if (isArabic(text)) throw new Error('Arabic letters join: reveal by word or line, never by letter');
    return [...new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text)].map(s => s.segment);
  }
  if (by === 'word') return text.trim().split(/\s+/u);
  throw new Error('units by must be word or grapheme');
}

// Reading time for a fully readable hold: characters (without diacritics) at `cps`, with a floor.
export function readingTime(text, { cps = 15, min = 1.2 } = {}) {
  const chars = [...text.normalize('NFC').replace(/[ً-ٰٟـ\s]/gu, '')].length;
  return Math.max(min, chars / cps);
}

// A text block whose words wrap naturally (balanced lines) and can be revealed per word or per line.
// Lines are measured lazily on the first render, after fonts have loaded (composer awaits fonts).
// style: CSS for the block (font, size, colour, width/maxWidth, position); options.align: start|center|end.
export function textBlock(parent, text, style = {}, { by = 'word', align = 'center', dir, lang } = {}) {
  const d = dir || direction(text);
  const box = el('div', { class: 'line', style: { position: 'absolute', direction: d, textAlign: align, textWrap: 'balance', whiteSpace: 'normal', ...style } }, parent);
  if (lang) box.setAttribute('lang', lang);
  box.dataset.text = text; // read-back uses the true string (graphemes are not re-joined with spaces)
  const parts = by === 'grapheme' ? units(text, 'grapheme', lang) : units(text, 'word');
  const words = parts.map((w, i) => {
    const outer = el('span', { class: 'word-clip', style: { display: 'inline-block', verticalAlign: 'top', paddingBlock: '0.12em', marginBlock: '-0.12em' } }, box);
    const span = el('span', { class: 'word', text: /^\s+$/u.test(w) ? '\u00A0' : w, style: { display: 'inline-block' } }, outer);
    if (by !== 'grapheme' && i < parts.length - 1) box.appendChild(document.createTextNode(' '));
    return { outer, span };
  });
  return { box, words, text, dir: d, lines: null };
}

// Group words into visual lines (by offsetTop) once fonts are ready.
function measure(B) {
  if (B.lines) return B.lines;
  const rows = [];
  for (const [i, w] of B.words.entries()) {
    const top = w.outer.offsetTop, row = rows.find(r => Math.abs(r.top - top) < 2);
    if (row) row.items.push(i); else rows.push({ top, items: [i] });
  }
  B.lines = rows.sort((a, b) => a.top - b.top).map(r => r.items);
  return B.lines;
}

// Reveal styles. All are pure in t. 'mask' clips each word inside its own box (the classic premium
// line reveal), 'rise' lifts with opacity, 'fade', 'blur', 'scale', 'cascade' (per line, words as one).
// Exit mirrors with `exit` style at tOut. stagger is per unit (word or line, see `per`).
export function reveal(B, t, { tIn, tOut = Infinity, style = 'mask', per = 'word', stagger = 0.06, dur = 0.7, exit = 'fade', exitDur = 0.45,
  curve = curves.emphasized, distance = 0.9 } = {}) {
  const lines = measure(B);
  const visible = t >= tIn - 0.01 && t <= tOut + exitDur + stagger * B.words.length + 0.05;
  show(B.box, visible);
  if (!visible) return;
  const order = per === 'line' ? lines.flatMap((l, li) => l.map(i => [i, li])) : B.words.map((_, i) => [i, i]);
  for (const [i, k] of order) {
    const w = B.words[i];
    const pin = curve(ramp(t, tIn + k * stagger, tIn + k * stagger + dur));
    const pout = ease.inOutCubic(ramp(t, tOut + k * stagger * 0.5, tOut + k * stagger * 0.5 + exitDur));
    const em = parseFloat(getComputedStyle(w.span).fontSize) || 16;
    let y = 0, op = 1, blur = 0, sc = 1;
    if (style === 'mask') { w.outer.style.overflow = 'hidden'; y = (1 - pin) * em * 1.25 * distance; }
    else if (style === 'rise') { y = (1 - pin) * em * 0.45 * distance; op = pin; }
    else if (style === 'fade') op = pin;
    else if (style === 'blur') { op = pin; blur = (1 - pin) * em * 0.25; }
    else if (style === 'scale') { op = pin; sc = lerp(0.86, 1, pin); }
    else throw new Error(`unknown reveal style ${style}`);
    if (exit === 'fade') op *= 1 - pout; else if (exit === 'mask') { w.outer.style.overflow = 'hidden'; y -= pout * em * 1.25; }
    else if (exit === 'rise') { y -= pout * em * 0.35; op *= 1 - pout; }
    w.span.style.opacity = op.toFixed(4);
    // A word at rest carries NO transform: a leftover translate(0) promotes it to its own layer, whose
    // raster then depends on whether the word was animating before (history-dependent pixels).
    const rest = Math.abs(y) < 0.005 && Math.abs(sc - 1) < 1e-5;
    w.span.style.transform = rest ? 'none' : `translateY(${y.toFixed(2)}px) scale(${sc.toFixed(4)})`;
    w.span.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
  }
}

// Largest font size (px) in [min, max] at which `text` fits `maxWidth` on one line, using canvas
// metrics with real shaping. Call during render (fonts loaded), cache the result per text.
const fitCache = new Map();
export function fitFontSize(text, { family, weight = 400, maxWidth, max = 160, min = 12, letterSpacing = 0 } = {}) {
  const key = [text, family, weight, maxWidth, max, min, letterSpacing].join('|');
  if (fitCache.has(key)) return fitCache.get(key);
  const g = (fitFontSize.c ||= document.createElement('canvas')).getContext('2d');
  const widthAt = s => { g.font = `${weight} ${s}px "${family}"`; return g.measureText(text).width + letterSpacing * s * [...text].length; };
  let lo = min, hi = max;
  if (widthAt(min) > maxWidth) { fitCache.set(key, min); return min; }
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (widthAt(mid) <= maxWidth) lo = mid; else hi = mid; }
  const size = Math.floor(lo * 10) / 10; fitCache.set(key, size); return size;
}

// Largest font size at which a (wrapping) block fits maxWidth × maxHeight, measured live with real
// shaping and balanced wrapping. Call on the first render (fonts loaded); re-measures lines afterwards.
export function fitBlock(B, { maxWidth, maxHeight, max = 400, min = 8 } = {}) {
  if (B.fitted) return B.fitted;
  const style = B.box.style;
  if (maxWidth) style.width = maxWidth + 'px';
  const fits = size => { style.fontSize = size + 'px'; return B.box.scrollHeight <= maxHeight + 0.5 && B.box.scrollWidth <= (maxWidth || Infinity) + 0.5; };
  let lo = min, hi = max;
  if (!fits(lo)) { B.fitted = lo; B.lines = null; return lo; }
  for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  B.fitted = Math.floor(lo * 10) / 10; style.fontSize = B.fitted + 'px'; B.lines = null;
  return B.fitted;
}

// A counting number with tabular figures (digits keep their width, so the number never wobbles).
export function counter(parent, style = {}, { digits = 'arab', locale = 'ar-EG', decimals = 0, prefix = '', suffix = '' } = {}) {
  const line = el('div', { class: 'line', style: { position: 'absolute', direction: digits === 'arab' ? 'rtl' : 'ltr', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...style } }, parent);
  const word = el('span', { class: 'word', style: { display: 'inline-block' } }, line);
  return {
    line,
    render(t, { start, end, from = 0, to, curve = curves.decelerate, visible = true }) {
      show(line, visible);
      word.textContent = formatNumber(countValue(t, { start, end, from, to, decimals, ease: curve }), { digits, locale, decimals, prefix, suffix });
      line.dataset.text = formatNumber(to, { digits, locale, decimals, prefix, suffix }); // captions/read-back: the value it lands on
    },
  };
}

// Marker highlight behind a word range (draws in reading direction). Returns render(t).
export function highlight(B, wordIndexes, { color = 'rgba(255,214,90,0.55)', height = 0.42, offset = 0.55 } = {}) {
  const marks = wordIndexes.map(i => {
    const w = B.words[i]; w.outer.style.position = 'relative';
    const m = el('span', { style: { position: 'absolute', left: '0', right: '0', top: `${offset * 100}%`, height: `${height}em`, background: color, zIndex: '-1',
      transformOrigin: B.dir === 'rtl' ? '100% 50%' : '0% 50%', transform: 'scaleX(0)' } }, w.outer);
    w.outer.style.isolation = 'isolate';
    return m;
  });
  return (t, { start, dur = 0.5, stagger = 0.12 }) => marks.forEach((m, k) => { m.style.transform = `scaleX(${curves.decelerate(ramp(t, start + k * stagger, start + k * stagger + dur)).toFixed(4)})`; });
}

// Clamp a block's live box inside a safe rectangle [x0,y0,x1,y1] by translating it; returns the shift.
// A layout aid for recomposed aspect ratios, not a substitute for designing each ratio.
export function keepInside(node, [x0, y0, x1, y1]) {
  node.style.translate = '0px 0px';
  const r = node.getBoundingClientRect();
  const dx = r.left < x0 ? x0 - r.left : r.right > x1 ? x1 - r.right : 0;
  const dy = r.top < y0 ? y0 - r.top : r.bottom > y1 ? y1 - r.bottom : 0;
  node.style.translate = `${dx}px ${dy}px`;
  return { dx, dy, fits: r.width <= x1 - x0 && r.height <= y1 - y0 };
}
