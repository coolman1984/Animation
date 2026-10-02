// Optional GPU effects layer: WebGL2 fragment shaders on a canvas, driven only by explicit uniforms
// (time is passed in by render(t); there is no requestAnimationFrame). In the studio's headless
// Chromium this runs on SwiftShader (CPU), which is deterministic and needs config.gpu = true so the
// renderer launches with WebGL enabled. WebGPU is not available headless here; it is not used.
// Effects must serve the subject: light, air, material. Never decorative noise over the message.
import { el } from './motion.js';

const VERT = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

// Shared GLSL helpers available to every fragment shader.
export const GLSL_LIB = `
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.02; a *= 0.5; } return s; }
`;

// Built-in fragment bodies. Each declares the uniforms it reads; u_time and u_res are always set.
export const SHADERS = Object.freeze({
  // Volumetric-looking light rays from a source point (u_origin, uv space), strength u_amount.
  rays: `uniform vec2 u_origin; uniform float u_amount; uniform vec3 u_color;
void main() { vec2 d = uv - u_origin; float a = atan(d.y, d.x); float r = length(d);
  float beams = fbm(vec2(a * 6.0, u_time * 0.15)) * 0.7 + fbm(vec2(a * 17.0, u_time * 0.1 + 3.0)) * 0.3;
  float fall = smoothstep(1.2, 0.0, r); float v = pow(beams, 2.2) * fall * u_amount;
  o = vec4(u_color * v, v); }`,
  // Drifting depth haze / fog bank: density u_amount, colour u_color, rising from the bottom.
  haze: `uniform float u_amount; uniform vec3 u_color;
void main() { vec2 q = uv * vec2(u_res.x / u_res.y, 1.0) * 2.5; float n = fbm(q + vec2(u_time * 0.04, u_time * 0.015));
  float v = smoothstep(0.25, 0.95, n) * u_amount * mix(1.0, 0.35, uv.y); o = vec4(u_color * v, v); }`,
  // Animated colour field from four corner colours warped by noise: an alternative to gradient presets.
  colorField: `uniform vec3 u_c0; uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3; uniform float u_amount;
void main() { vec2 w = uv + u_amount * (vec2(fbm(uv * 2.0 + u_time * 0.05), fbm(uv * 2.0 + 7.0 - u_time * 0.04)) - 0.5);
  vec3 c = mix(mix(u_c0, u_c1, w.x), mix(u_c2, u_c3, w.x), w.y); o = vec4(c, 1.0); }`,
  // Image displacement by a flowing noise field (liquid / heat / glass). Texture u_tex, amount in uv units.
  displace: `uniform sampler2D u_tex; uniform float u_amount; uniform float u_scale;
void main() { vec2 q = uv * u_scale; vec2 off = vec2(fbm(q + u_time * 0.2), fbm(q + 5.2 - u_time * 0.17)) - 0.5;
  o = texture(u_tex, vec2(uv.x, 1.0 - uv.y) + off * u_amount); }`,
  // Radial chromatic separation for an optical edge (keep u_amount tiny: 0.001–0.004).
  chromatic: `uniform sampler2D u_tex; uniform float u_amount;
void main() { vec2 c = vec2(uv.x, 1.0 - uv.y); vec2 d = (c - 0.5) * u_amount;
  o = vec4(texture(u_tex, c + d).r, texture(u_tex, c).g, texture(u_tex, c - d).b, texture(u_tex, c).a); }`,
  // Depth-map parallax: shifts pixels by (depth - u_focus) × u_offset. Honest only for small moves and
  // only with a real depth map (u_depth: white = near). It reveals no hidden surfaces: edges stretch.
  depthParallax: `uniform sampler2D u_tex; uniform sampler2D u_depth; uniform vec2 u_offset; uniform float u_focus;
void main() { vec2 c = vec2(uv.x, 1.0 - uv.y); float d = texture(u_depth, c).r;
  vec2 s = c; for (int i = 0; i < 4; i++) { float dd = texture(u_depth, s).r; s = c - u_offset * (dd - u_focus); }
  o = texture(u_tex, s); }`,
  // Film grain, hashed per frame (u_frame) so it changes every frame yet re-renders identically.
  grain: `uniform float u_amount; uniform float u_frame;
void main() { float n = hash21(gl_FragCoord.xy + u_frame * 17.13) - 0.5; o = vec4(vec3(0.5 + n * u_amount), 1.0); }`,
});

export function gpuAvailable() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

// Load an image URL/canvas for a texture; registers with the composer's readiness wait when present.
function loadTexture(src) {
  if (src instanceof HTMLCanvasElement || src instanceof HTMLImageElement) return Promise.resolve(src);
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src;
  const p = img.decode().then(() => img);
  if (typeof window !== 'undefined' && window.studioWait) window.studioWait(p);
  return p;
}

// shaderLayer(parent, { w, h, fragment, textures: { u_tex: url }, scale, blend, z })
// fragment: a SHADERS entry or custom GLSL body writing `o` (vec4) from `uv` (0..1, y up).
export function shaderLayer(parent, { w, h, fragment, textures = {}, scale = 1, blend = 'normal', z = 5, opacity = 1 } = {}) {
  if (!(w > 0 && h > 0)) throw new Error('shaderLayer needs w and h');
  const cw = Math.round(w * scale), ch = Math.round(h * scale);
  const canvas = el('canvas', { width: cw, height: ch, style: { position: 'absolute', left: '0', top: '0', width: w + 'px', height: h + 'px',
    pointerEvents: 'none', mixBlendMode: blend, zIndex: String(z), opacity: String(opacity) } }, parent);
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  if (!gl) throw new Error('WebGL2 unavailable: set gpu: true in the film config so the renderer enables SwiftShader');
  const src = `#version 300 es\nprecision highp float;\nin vec2 uv; out vec4 o;\nuniform float u_time; uniform vec2 u_res;\n${GLSL_LIB}\n${fragment}`;
  const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, src)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('program: ' + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const units = {};
  const ready = Promise.all(Object.entries(textures).map(async ([name, s], i) => {
    const img = await loadTexture(s);
    const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    units[name] = i;
  }));
  if (typeof window !== 'undefined' && window.studioWait) window.studioWait(ready);
  const set = (name, v) => {
    const l = gl.getUniformLocation(prog, name); if (l === null) return;
    if (typeof v === 'number') gl.uniform1f(l, v);
    else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v);
    else if (v.length % 3 === 0) gl.uniform3fv(l, v); // vec3 array uniform (flat list), e.g. a palette
  };
  return {
    canvas, ready,
    render(t, uniforms = {}, { visible = true, opacity: op } = {}) {
      canvas.style.display = visible ? 'block' : 'none';
      if (op !== undefined) canvas.style.opacity = String(op);
      if (!visible) return;
      gl.viewport(0, 0, cw, ch); gl.useProgram(prog);
      set('u_time', t); set('u_res', [cw, ch]);
      for (const [name, unit] of Object.entries(units)) { const l = gl.getUniformLocation(prog, name); if (l !== null) gl.uniform1i(l, unit); }
      for (const [k, v] of Object.entries(uniforms)) set(k, v);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.finish();
    },
  };
}

// Hex colour → [r, g, b] in 0..1 for vec3 uniforms.
export const rgb = hex => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
