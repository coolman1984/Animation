// Presentation layer for real-app captures (capture.json from lib/app-capture.mjs). Places a captured
// screen in the frame and maps the app's real element boxes to stage pixels, so highlights and
// callouts sit exactly on what the app displayed. It never edits the captured pixels or values.
import { el, clamp } from './motion.js';

// screenPlate(parent, capture, shotName, { src, x, y, width, radius, shadow }) → { node, box(label), at(px, py), scale }
export function screenPlate(parent, capture, shot, { src, x = 0, y = 0, width, radius = 0, shadow = '0 30px 80px rgba(0,0,0,0.35)', z = 1 } = {}) {
  const s = capture?.shots?.[shot];
  if (!s) throw new Error(`capture has no shot ${shot}`);
  const scale = (width ?? s.css.w) / s.css.w, h = s.css.h * scale;
  const node = el('div', { style: { position: 'absolute', left: x + 'px', top: y + 'px', width: s.css.w * scale + 'px', height: h + 'px', borderRadius: radius + 'px',
    overflow: 'hidden', boxShadow: shadow, zIndex: String(z) } }, parent);
  el('img', { src, alt: '', style: { width: '100%', height: '100%', display: 'block' } }, node);
  const at = (px, py) => [x + (px - s.origin.x) * scale, y + (py - s.origin.y) * scale];
  const box = label => {
    const b = s.boxes[label]; if (!b) throw new Error(`shot ${shot} has no box ${label}`);
    const [bx, by] = at(b.x, b.y); return { x: bx, y: by, w: b.w * scale, h: b.h * scale, text: b.text };
  };
  return { node, box, at, scale, width: s.css.w * scale, height: h };
}

// Focus ring around a real element box; p in 0..1 draws it in (pure in p).
export function focusRing(parent, { color = '#ffd25a', width = 4, radius = 12, pad = 8, z = 5 } = {}) {
  const node = el('div', { style: { position: 'absolute', border: `${width}px solid ${color}`, borderRadius: radius + 'px', pointerEvents: 'none', zIndex: String(z), boxSizing: 'border-box' } }, parent);
  return (b, p = 1) => {
    const k = clamp(p), grow = (1 - k) * 18;
    Object.assign(node.style, { left: b.x - pad - grow + 'px', top: b.y - pad - grow + 'px', width: b.w + 2 * (pad + grow) + 'px', height: b.h + 2 * (pad + grow) + 'px', opacity: String(k) });
  };
}

// Dim everything except a real element box (spotlight), strength 0..1.
export function spotlight(parent, { w, h, color = '0,0,0', z = 4 } = {}) {
  const node = el('div', { style: { position: 'absolute', left: '0', top: '0', width: w + 'px', height: h + 'px', pointerEvents: 'none', zIndex: String(z) } }, parent);
  return (b, strength = 0.55, pad = 10) => {
    const rx = b.w / 2 + pad, ry = b.h / 2 + pad;
    node.style.background = `radial-gradient(ellipse ${(rx * 1.35).toFixed(1)}px ${(ry * 1.35).toFixed(1)}px at ${b.x + b.w / 2}px ${b.y + b.h / 2}px, rgba(${color},0) 72%, rgba(${color},${clamp(strength)}) 100%)`;
  };
}
