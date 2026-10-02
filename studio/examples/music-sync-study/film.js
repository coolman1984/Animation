// MUSIC-SYNC STUDY — picture driven by a measured music map (lib/musicmap.mjs output, imported as JSON).
// The energy line is the analyzer's curve; pulses fire only on detected beats (none in the quiet
// hold, because none were measured there); the frame floods on the measured release downbeat, which
// is also the cue the score's impact uses. Nothing is forced onto a grid that the music doesn't have.
import { el, ramp } from '../../lib/motion.js';
import { springStep } from '../../lib/kinetics.js';
import { applyTransition } from '../../lib/transitions.js';
import { textBlock, reveal } from '../../lib/typography.js';
import { cueTime } from '../../lib/cuesheet.js';
import map from './track.musicmap.json' with { type: 'json' };
import plan from './production.json' with { type: 'json' };

const C = { night: '#0F1220', cream: '#F1E9D8', yellow: '#F2D14A', blue: '#5B6CFF' };
let W, H, u, night, day, overlay, line, dotsA, dotsB, waitWord, nowWord, labels;
const RELEASE = cueTime(plan, 'release');
const pts = () => map.curves.energy.map((e, i) => [W * 0.08 + (i / (map.curves.energy.length - 1)) * W * 0.84, H * 0.62 - e * H * 0.22]);

function pulses(parent, color) {
  return map.beats.map((b, i) => el('div', { style: { position: 'absolute', left: W * 0.08 + (b / map.duration) * W * 0.84 - u + 'px', top: H * 0.7 + 'px', width: 2 * u + 'px', height: 2 * u + 'px',
    borderRadius: '50%', background: map.downbeats.some(d => Math.abs(d - b) < 1e-3) ? color : 'transparent', border: `${u * 0.3}px solid ${color}`, boxSizing: 'border-box' } }, parent));
}
export default {
  duration: 16, fps: 30,
  init(stage, { W: w, H: h }) {
    W = w; H = h; u = Math.min(w, h) / 100;
    night = el('div', { style: { position: 'absolute', inset: '0', background: C.night } }, stage);
    day = el('div', { style: { position: 'absolute', inset: '0', background: C.yellow } }, stage);
    overlay = el('div', { style: { position: 'absolute', inset: '0', zIndex: '30', display: 'none' } }, stage);
    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0' } }, night);
    line = el('path', { d: 'M' + pts().map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L'), fill: 'none', stroke: C.cream, 'stroke-width': u * 0.6, 'stroke-linejoin': 'round' }, svg);
    for (const q of map.quiet) el('div', { style: { position: 'absolute', left: W * 0.08 + q.start / map.duration * W * 0.84 + 'px', width: (q.end - q.start) / map.duration * W * 0.84 + 'px', top: H * 0.38 + 'px', height: H * 0.26 + 'px', background: 'rgba(91,108,255,0.10)' } }, night);
    dotsA = pulses(night, C.cream); dotsB = pulses(day, C.night);
    waitWord = textBlock(night, 'استنى…', { left: '0', width: W + 'px', top: H * 0.16 + 'px', fontFamily: 'Aref Ruqaa', fontWeight: 700, fontSize: u * 11 + 'px', color: C.cream });
    nowWord = textBlock(day, 'دلوقتي', { left: '0', width: W + 'px', top: H * 0.3 + 'px', fontFamily: 'Aref Ruqaa', fontWeight: 700, fontSize: u * 22 + 'px', color: C.night });
    labels = textBlock(stage, `${map.tempo.bpm} BPM · RELEASE ${RELEASE.toFixed(2)} s · ${map.analyzer.toUpperCase()}`, { left: '0', width: W + 'px', top: H * 0.86 + 'px', fontFamily: 'Montserrat', fontWeight: 500, fontSize: u * 2.4 + 'px', letterSpacing: '0.16em', color: C.blue, zIndex: 40 });
  },
  render(t) {
    // The line draws in sync with playback (its x is time); length via dash offset.
    const L = line.getTotalLength(); line.style.strokeDasharray = `${L}`; line.style.strokeDashoffset = String(L * (1 - Math.min(1, t / map.duration)));
    for (const [i, b] of map.beats.entries()) {
      const k = t >= b ? 1 + 0.9 * (1 - springStep(t - b, { duration: 0.35, bounce: 0.3 }).value) : 0.6;
      for (const d of [dotsA[i], dotsB[i]]) { d.style.transform = `scale(${k.toFixed(3)})`; d.style.opacity = t >= b - 0.02 ? '1' : '0.25'; }
    }
    applyTransition('colorHandoff', t, { a: night, b: day, overlay, start: RELEASE - 0.18, duration: 0.36, w: W, h: H, color: C.yellow, cx: 0.5, cy: 0.62, ease: p => p });
    reveal(waitWord, t, { tIn: 1.2, tOut: 6.0, style: 'fade', stagger: 0.1, dur: 0.8, exitDur: 0.5 });
    const hit = t >= RELEASE ? springStep(t - RELEASE, { duration: 0.5, bounce: 0.35 }).value : 0;
    nowWord.box.style.transform = `scale(${(0.7 + 0.3 * hit).toFixed(4)})`;
    reveal(nowWord, t, { tIn: RELEASE + 0.05, style: 'fade', stagger: 0, dur: 0.12 });
    reveal(labels, t, { tIn: 0.2, style: 'fade', stagger: 0.02, dur: 0.6 });
  },
};
