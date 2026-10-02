// Deterministic 2.5D staging. Coordinates are authored pixels; depth=1 is the hero plane.
// This is photographic parallax, not reconstructed 3D or optical lens simulation.
import { el, clamp } from './motion.js';

// Named planes (depth values). A convention, not a rule: pick what the shot needs.
// Larger depth = nearer the lens = more parallax and more defocus when focus sits on the hero.
export const PLANES = Object.freeze({ foreground: 1.8, near: 1.35, hero: 1, mid: 0.7, background: 0.4, atmosphere: 0.15, sky: 0 });

// Aerial perspective: farther layers lose contrast/saturation and lift toward the haze tone.
// Returns a CSS filter fragment for a layer at `depth` (0 at/near the hero plane).
export function hazeFilter(depth, { density = 0.35, near = 1 } = {}) {
  if (![depth, density, near].every(Number.isFinite) || density < 0 || near <= 0) throw new Error('invalid haze');
  const k = clamp(density * (1 - depth / near));
  if (k <= 0.001) return '';
  return `contrast(${(1 - 0.45 * k).toFixed(3)}) saturate(${(1 - 0.5 * k).toFixed(3)}) brightness(${(1 + 0.18 * k).toFixed(3)})`;
}

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
// options.atmosphere = { density, near } applies hazeFilter to every layer by depth (opt-in).
// Layer spec extras: blend (mix-blend-mode, e.g. 'screen' for light layers), grade (CSS filter string
// to match a cut-out to its plate), cover (true = this layer must always fill the frame; see clamp()).
export function depthScene(parent, { w, h, atmosphere } = {}) {
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
        transformOrigin: `${anchor[0] * 100}% ${anchor[1] * 100}%`, zIndex: String(spec.z ?? 0),
        ...(spec.blend ? { mixBlendMode: spec.blend } : {}) } }, root);
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
        const filters = [state.grade || '', atmosphere ? hazeFilter(state.depth ?? 1, atmosphere) : '', p.blur > 0.01 ? `blur(${p.blur}px)` : ''].filter(Boolean);
        node.style.filter = filters.length ? filters.join(' ') : 'none';
        node.style.opacity = String(clamp(state.opacity ?? 1));
      }
    },
    // Camera adjusted so no `cover: true` layer exposes an edge (see clampCamera).
    clamp(camera = {}, overrides = {}) {
      return clampCamera([...layers].map(([id, { spec }]) => ({ id, ...spec, ...overrides[id] })), camera, { w, h });
    },
    truth: 'layered photographic 2.5D: prepared planes share one camera; no hidden surfaces are reconstructed',
  };
}

// Pan range for which a layer fully covers the viewport, per axis; null if impossible at this zoom.
function coverRange(layer, camera, viewport, axis) {
  const { width, height, depth = 1, scale = 1, anchor = [0.5, 0.5] } = layer;
  const zoom = camera.zoom ?? 1, Z = zoom ** depth, s = scale * Z;
  const size = axis === 'x' ? width : height, V = axis === 'x' ? viewport.w : viewport.h;
  const pos = axis === 'x' ? (layer.x ?? viewport.w / 2) : (layer.y ?? viewport.h / 2), a = anchor[axis === 'x' ? 0 : 1];
  if (size * s < V - 1e-6) return null;
  if (depth === 0) {
    const lo = V / 2 + (pos - V / 2) * Z - size * a * s;
    return lo <= 1e-6 && lo + size * s >= V - 1e-6 ? [-Infinity, Infinity] : null;
  }
  // edgeLow(pan) = base - pan·k must be <= 0, and edgeLow + size·s >= V.
  const base = V / 2 + (pos - V / 2) * Z - size * a * s, k = depth * Z;
  return [base / k, (base + size * s - V) / k];
}

// Clamp camera pan (x/y) so every cover layer keeps the frame filled. Returns the adjusted camera and
// which layers cannot cover the frame at this zoom at all (raise zoom, enlarge the plate or reframe).
export function clampCamera(layers, camera = {}, viewport) {
  const out = { x: 0, y: 0, zoom: 1, focus: 1, aperture: 0, ...camera };
  const infeasible = []; let clamped = false;
  for (const axis of ['x', 'y']) {
    let lo = -Infinity, hi = Infinity;
    for (const layer of layers.filter(l => l.cover)) {
      const r = coverRange(layer, out, viewport, axis);
      if (!r) { if (!infeasible.includes(layer.id)) infeasible.push(layer.id); continue; }
      lo = Math.max(lo, r[0]); hi = Math.min(hi, r[1]);
    }
    if (lo > hi) { infeasible.push(`(${axis} ranges conflict)`); continue; }
    const v = clamp(out[axis], lo, hi);
    if (Math.abs(v - out[axis]) > 1e-9) clamped = true;
    out[axis] = v;
  }
  return { camera: out, clamped, infeasible };
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
