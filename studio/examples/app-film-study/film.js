// APP FILM STUDY — real product state vs film presentation. capture/ holds what the real app showed
// (screens, element boxes, read-back values verified against the app's own state; capture.mjs).
// This film only PRESENTS it: a phone frame, a camera that pushes toward real element boxes, a focus
// ring and a spotlight placed from the captured boxes, and a caption quoting the verified value.
import { el } from '../../lib/motion.js';
import { cameraSpline } from '../../lib/cinema.js';
import { screenPlate, focusRing, spotlight } from '../../lib/screen.js';
import { textBlock, reveal } from '../../lib/typography.js';
import { formatNumber, curves } from '../../lib/kinetics.js';
import capture from './capture/capture.json' with { type: 'json' };

const P = f => new URL(`./capture/${f}`, import.meta.url).href;
let W, H, u, rig, plates = {}, ring, spot, title, value, phoneW, phoneX, phoneY;
const SCREENS = [['empty', 0, 1.8], ['filled', 1.8, 3.7], ['ordered', 3.7, 6]];
export default {
  duration: 6, fps: 30,
  init(stage, { W: w, H: h }) {
    W = w; H = h; u = Math.min(w, h) / 100;
    stage.style.background = 'linear-gradient(160deg,#EEF1EA,#DCE5DA)';
    rig = el('div', { style: { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px', transformOrigin: '0 0' } }, stage);
    phoneW = Math.min(W * 0.66, H * 0.64 * 390 / 560); const phoneH = phoneW * 560 / 390;
    phoneX = (W - phoneW) / 2; phoneY = H * 0.53 - phoneH / 2;
    el('div', { style: { position: 'absolute', left: phoneX - u * 2 + 'px', top: phoneY - u * 2 + 'px', width: phoneW + u * 4 + 'px', height: phoneH + u * 4 + 'px', borderRadius: u * 6 + 'px', background: '#1B1F1D', boxShadow: `0 ${u * 4}px ${u * 10}px rgba(20,40,30,0.35)` } }, rig);
    for (const [name] of SCREENS) plates[name] = screenPlate(rig, capture, name, { src: P(`${name}.png`), x: phoneX, y: phoneY, width: phoneW, radius: u * 4.2, shadow: 'none', z: 2 });
    ring = focusRing(rig, { color: '#1F6F5C', width: u * 0.7, radius: u * 2.2, pad: u * 1.2, z: 6 });
    spot = spotlight(rig, { w: W, h: H, color: '20,30,25', z: 5 });
    title = textBlock(stage, 'رقم حقيقي من التطبيق', { left: '0', width: W + 'px', top: H * 0.055 + 'px', fontFamily: 'El Messiri', fontWeight: 600, fontSize: u * 6.4 + 'px', color: '#14322A', zIndex: 10 });
    // The caption quotes the VERIFIED read-back value, formatted for display — never typed by hand.
    value = textBlock(stage, `الإجمالي ${formatNumber(capture.values.total, { decimals: 2, suffix: ' ج.م' })}`, { left: '0', width: W + 'px', top: H * 0.9 + 'px', fontFamily: 'Plex Arabic', fontWeight: 500, fontSize: u * 3.6 + 'px', color: '#1F6F5C', zIndex: 10 });
  },
  camera(t) {
    const b = plates.filled.box('total'), cx = b.x + b.w / 2 - W / 2, cy = b.y + b.h / 2 - H / 2;
    const s = plates.ordered.box('status'), sx = s.x + s.w / 2 - W / 2, sy = s.y + s.h / 2 - H / 2;
    return cameraSpline([{ t: 0, x: 0, y: 0, zoom: 1 }, { t: 1.8, x: 0, y: 0, zoom: 1.02 }, { t: 2.8, x: cx * 0.8, y: cy * 0.8, zoom: 1.3, hold: true },
      { t: 3.7, x: cx * 0.8, y: cy * 0.8, zoom: 1.3 }, { t: 4.7, x: sx * 0.8, y: sy * 0.8, zoom: 1.25, hold: true }, { t: 6, x: sx * 0.8, y: sy * 0.8, zoom: 1.24 }], t);
  },
  render(t) {
    for (const [name, a, b] of SCREENS) plates[name].node.style.display = t >= a && t < b ? 'block' : 'none';
    const c = this.camera(t);
    // 2D camera: pan target (x,y offsets from centre) and zoom about the frame centre.
    rig.style.transform = `translate(${W / 2}px, ${H / 2}px) scale(${c.zoom}) translate(${-W / 2 - c.x}px, ${-H / 2 - c.y}px)`;
    const onTotal = t >= 2.2 && t < 3.7, onStatus = t >= 4.4;
    ring(plates.filled.box('total'), onTotal ? curves.decelerate(Math.min(1, (t - 2.2) / 0.5)) : 0);
    spot(onStatus ? plates.ordered.box('status') : { x: -9999, y: -9999, w: 1, h: 1 }, onStatus ? 0.5 * Math.min(1, (t - 4.4) / 0.5) : 0);
    reveal(title, t, { tIn: 0.3, tOut: 1.7, style: 'mask', stagger: 0.08, dur: 0.8, exit: 'mask' });
    reveal(value, t, { tIn: 2.5, style: 'rise', stagger: 0.06, dur: 0.6 });
  },
};
