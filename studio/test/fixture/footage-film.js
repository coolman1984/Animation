// Test fixture: a synthetic footage pack (made by test/live.test.mjs in takes/_test-footage/) through lib/footage.js.
// Layers: plate → red "behind" graphic covering everything → cutout (the matte's circle) → nothing in front.
import { footage } from '../../lib/footage.js';
let F, plate, cutout;
export default {
  duration: 1, fps: 30,
  async init(stage, { W, H }) {
    const cv = (z) => { const c = document.createElement('canvas'); c.width = W; c.height = H; Object.assign(c.style, { position: 'absolute', left: '0', top: '0', zIndex: z }); stage.appendChild(c); return c; };
    plate = cv('1');
    const red = document.createElement('div'); Object.assign(red.style, { position: 'absolute', inset: '0', background: '#ff0000', zIndex: '2' }); stage.appendChild(red);
    cutout = cv('3');
    F = await footage(new URL('../../takes/_test-footage/', import.meta.url), { plate, cutout });
  },
  render(t) { return F.draw(t, { dest: { x: 0, y: 0, w: plate.width, h: plate.height } }); },
};
