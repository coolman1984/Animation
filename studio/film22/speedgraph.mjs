// Speed graph of the hero cursor (TECHNIQUES 2026-10-11): distance moved per frame, in Node, no browser.
// A constant-speed run = linear motion; a step = a pop. Usage: node film22/speedgraph.mjs
import { hero } from './motion.js';
import { FPS, DUR } from './timing.js';
let prev = hero(0), out = [], flags = [];
for (let f = 1; f < DUR * FPS; f++) {
  const h = hero(f / FPS), d = Math.hypot(h.x - prev.x, h.y - prev.y); out.push(d); prev = h;
}
const mx = Math.max(...out);
out.forEach((d, i) => { if (d > 0.5) console.log(String(i + 1).padStart(3), (((i + 1) / FPS).toFixed(2) + 's').padStart(6), d.toFixed(1).padStart(7), '#'.repeat(Math.round((d / mx) * 50))); });
// linear-motion detector: ≥ 4 consecutive frames moving > 4 px with speed within 3 %
for (let i = 3; i < out.length; i++) { const w = out.slice(i - 3, i + 1); if (w.every(d => d > 4) && (Math.max(...w) - Math.min(...w)) / Math.max(...w) < 0.03) flags.push(`linear run ending at frame ${i + 1}`); }
// pop detector: a frame that moves > 3× the mean of its neighbours while they are moving
for (let i = 1; i < out.length - 1; i++) { const n = (out[i - 1] + out[i + 1]) / 2; if (n > 3 && out[i] > 3 * n) flags.push(`pop at frame ${i + 1}`); }
console.log(flags.length ? 'FLAGS:\n' + [...new Set(flags)].join('\n') : 'speed graph: no linear runs, no pops');
