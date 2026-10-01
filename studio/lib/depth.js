// Deterministic 2.5D staging. Coordinates are authored pixels; depth=1 is the hero plane.
// This is photographic parallax, not reconstructed 3D or optical lens simulation.
import { el, clamp } from './motion.js';

export function projectLayer(layer, camera = {}, viewport) {
  const { width, height, x = viewport.w / 2, y = viewport.h / 2, depth = 1,
    scale = 1, rotation = 0, anchor = [0.5, 0.5] } = layer;
  const { x: panX = 0, y: panY = 0, zoom = 1, focus = 1, aperture = 0, maxBlur = 16 } = camera;
  if (![width, height, scale, zoom, viewport.w, viewport.h].every(v => Number.isFinite(v) && v > 0)
      || ![x, y, depth, rotation, panX, panY, focus, aperture, maxBlur, ...anchor].every(Number.isFinite)
      || anchor.length !== 2 || depth < 0 || aperture < 0 || maxBlur < 0)
    throw new Error('invalid layer/camera geometry');
  const s = scale * zoom ** depth;
  const px = viewport.w / 2 + (x - viewport.w / 2 - panX * depth) * zoom ** depth;
  const py = viewport.h / 2 + (y - viewport.h / 2 - panY * depth) * zoom ** depth;
  return { x: px, y: py, left: px - width * anchor[0], top: py - height * anchor[1],
    scale: s, rotation, blur: Math.min(maxBlur, Math.abs(depth - focus) * aperture) };
}

// Clamp a cover photo's source-space camera so a pan cannot expose unfilled borders.
export function coverCamera({ cx, cy, scale }, source, viewport) {
  if (![cx, cy, scale, source.w, source.h, viewport.w, viewport.h].every(Number.isFinite)
      || Math.min(scale, source.w, source.h, viewport.w, viewport.h) <= 0)
    throw new Error('invalid cover camera');
  const s = Math.max(scale, viewport.w / source.w, viewport.h / source.h);
  const hx = viewport.w / (2 * s), hy = viewport.h / (2 * s);
  return { cx: clamp(cx, hx, source.w - hx), cy: clamp(cy, hy, source.h - hy), scale: s };
}

// Keep text outside this scene: focus filters must never blur captions or brand overlays.
export function depthScene(parent, { w, h }) {
  const root = el('div', { style: { position: 'absolute', inset: '0', overflow: 'hidden', isolation: 'isolate' } }, parent);
  const layers = new Map();
  return {
    root,
    add(id, spec) {
      if (layers.has(id)) throw new Error('duplicate layer: ' + id);
      projectLayer(spec, {}, { w, h });
      const anchor = spec.anchor || [0.5, 0.5];
      const node = el('div', { 'data-layer': id, style: { position: 'absolute', left: '0', top: '0',
        width: spec.width + 'px', height: spec.height + 'px',
        transformOrigin: `${anchor[0] * 100}% ${anchor[1] * 100}%`, zIndex: String(spec.z ?? 0) } }, root);
      const content = el('div', { style: { width: '100%', height: '100%',
        ...(spec.mask ? { maskImage: `url(${JSON.stringify(spec.mask)})`, maskMode: 'alpha', maskSize: '100% 100%', maskRepeat: 'no-repeat' } : {}) } }, node);
      if (spec.src) el('img', { src: spec.src, alt: '', style: { width: '100%', height: '100%' } }, content);
      layers.set(id, { spec: { ...spec }, node, content });
      return content;
    },
    // Always calculate from the base spec, including when seeking backwards or rendering in parallel.
    render(camera = {}, overrides = {}) {
      for (const [id, { spec, node }] of layers) {
        const state = { ...spec, ...overrides[id] };
        const p = projectLayer(state, camera, { w, h });
        const anchor = state.anchor || [0.5, 0.5];
        node.style.transformOrigin = `${anchor[0] * 100}% ${anchor[1] * 100}%`;
        node.style.width = state.width + 'px'; node.style.height = state.height + 'px';
        node.style.transform = `translate(${p.left}px,${p.top}px) rotate(${p.rotation}deg) scale(${p.scale})`;
        node.style.filter = p.blur > 0.01 ? `blur(${p.blur}px)` : 'none';
        node.style.opacity = String(clamp(state.opacity ?? 1));
      }
    },
  };
}

// Place a shadow at the ground contact, sharing the subject's camera plane and horizontal motion.
// Elevation changes softness/opacity, never detaches the shadow into a separate camera move.
export function contactShadow(parent, { width = 240, height = 36, color = '#102820', z = 2 } = {}) {
  const node = el('div', { style: { position: 'absolute', width: width + 'px', height: height + 'px',
    borderRadius: '50%', background: color, zIndex: String(z), transformOrigin: '50% 50%', pointerEvents: 'none' } }, parent);
  return ({ x, y, scale = 1, elevation = 0, opacity = 0.24 }) => {
    if (![x, y, scale, elevation, opacity].every(Number.isFinite) || scale <= 0 || elevation < 0)
      throw new Error('invalid contact shadow');
    node.style.left = x - width / 2 + 'px'; node.style.top = y - height / 2 + 'px';
    node.style.transform = `scale(${scale * (1 + elevation * 0.001)})`;
    node.style.filter = `blur(${3 + Math.min(elevation, 100) * 0.12}px)`;
    node.style.opacity = String(clamp(opacity / (1 + elevation * 0.025)));
  };
}
