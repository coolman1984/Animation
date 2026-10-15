// Film 24 — 3D fly-over of the AI Essentials Academy landing page. 14.5 s, 1440×1152 @ 60 fps, one continuous camera.
// WebGL2: the page is a textured quad on a bright studio floor; every lifted piece is its own quad at its height, drawn lowest
// first with no depth buffer; per-pixel depth of field (40-tap golden-angle gather, mip-matched); 16 subframes across 0.7 of a
// frame accumulated in linear light inside the engine. Every frame is computed from t inside render(t): no timers, no CSS transitions.
import layout from './capture/layout.json' with { type: 'json' };
import { textLine } from '../lib/motion.js';
import { W, HI, F, PAGE_W, PAGE_H, HERO_B, T, camera, TILT } from './timing.js';

const BASE = new URL('./capture/', import.meta.url).href;
const SUBS = 16, SHUTTER = 0.7 / 60;
const ss = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const lerp = (a, b, p) => a + (b - a) * p;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const oC = (u) => 1 - Math.pow(1 - clamp(u), 3);
function zspring(tau, zeta = 0.72, w = 12) { if (tau <= 0) return 0; const wd = w * Math.sqrt(1 - zeta * zeta); return 1 - Math.exp(-zeta * w * tau) * (Math.cos(wd * tau) + (zeta * w / wd) * Math.sin(wd * tau)); }

let gl, CV, OVER, PROG = {}, QUAD, TEX = {}, FBO = {}, SUB = SUBS, TITLE = {};

// ---------------- shaders ----------------
const VS = `#version 300 es
in vec2 aUV; uniform vec3 uO, uX, uY; uniform mat4 uVP; out vec2 vUV; out vec3 vW;
void main(){ vUV = aUV; vW = uO + aUV.x * uX + aUV.y * uY; gl_Position = uVP * vec4(vW, 1.0); }`;
// mode: 0 floor, 1 textured (page / piece / tile), 2 shadow, 3 page shadow, 4 solid (card edge)
const FS = `#version 300 es
precision highp float;
in vec2 vUV; in vec3 vW;
uniform int uMode; uniform sampler2D uTex; uniform float uLod, uAlpha, uHaze, uFocus; uniform vec3 uCam, uFwd, uColor;
uniform vec4 uMask; uniform float uMaskR, uFadeY, uFade, uNoMask; uniform vec2 uRes;
layout(location=0) out vec4 oC; layout(location=1) out vec4 oD;
const vec3 HAZE = vec3(0.965, 0.972, 0.976);
float rrect(vec2 p, vec4 r, float rad){ vec2 c = (r.xy + r.zw) * 0.5, h = (r.zw - r.xy) * 0.5; vec2 q = abs(p - c) - h + rad; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad; }
float coc(float z){ float r = z < uFocus ? 75.0 * (uFocus - z) / z : 6.0 * (z - uFocus) / z; return min(r, 120.0); }
void main(){
  float z = dot(vW - uCam, uFwd);
  vec4 c;
  if (uMode == 0) {                                   // studio floor: #f9fbfb in the middle → #f2f3f6 in the corners
    vec2 q = gl_FragCoord.xy / uRes - 0.5; float k = clamp(length(q * vec2(1.0, 0.85)) / 0.68, 0.0, 1.0);
    c = vec4(mix(vec3(0.976, 0.984, 0.984), vec3(0.949, 0.953, 0.965), k * k), 1.0);
  } else if (uMode == 3) {                            // the page's soft wide shadow
    float d = rrect(vW.xy, uMask + vec4(0.0, 18.0, 0.0, 18.0), uMaskR);
    float a = 0.11 * (1.0 - smoothstep(-40.0, 150.0, d)) + 0.07 * (1.0 - smoothstep(-6.0, 26.0, d));
    c = vec4(0.10, 0.13, 0.20, a * uAlpha);
  } else if (uMode == 2) {                            // piece shadow: the same picture in flat #1a2133, blurred, 26 %
    float a = textureLod(uTex, vUV, uLod).a;
    c = vec4(0.102, 0.129, 0.2, a * 0.26 * uAlpha);
  } else if (uMode == 4) {
    c = vec4(uColor, uAlpha);
  } else {
    c = texture(uTex, vUV);
    c.rgb = mix(c.rgb, HAZE, uHaze); c.a *= uAlpha;
  }
  if (uMode == 1 && uNoMask < 0.5) {                  // the page mask (full page → hero card) and the fade below the hero
    float d = rrect(vW.xy, uMask, uMaskR); float m = 1.0 - smoothstep(-0.6, 0.6, d);
    float below = smoothstep(uFadeY, uFadeY + 40.0, vW.y);
    c.rgb = mix(c.rgb, HAZE, below * clamp(uFade * 1.4, 0.0, 1.0)); c.a *= m * (1.0 - below * smoothstep(0.55, 1.0, uFade));
  }
  oC = c; oD = vec4(coc(z) / 120.0, z / 20000.0, 0.0, c.a);
}`;
const VS2 = `#version 300 es
in vec2 aUV; out vec2 vUV; void main(){ vUV = aUV; gl_Position = vec4(aUV * 2.0 - 1.0, 0.0, 1.0); }`;
// depth of field: 40 taps on a golden-angle disc; near taps scatter over sharper pixels, far taps never smear over nearer ones
const DOF = `#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uC, uD; uniform vec2 uRes; uniform float uGain; out vec4 o;
void main(){
  vec4 cd = texture(uD, vUV); float rc = cd.r * 120.0, zc = cd.g;
  float R = max(rc, textureLod(uD, vUV, 5.0).r * 120.0 * 1.6);         // reach of nearby foreground blur
  R = min(R, 120.0);
  vec3 acc = vec3(0.0); float wsum = 0.0;
  float lod = clamp(log2(max(1.0, R / 6.3)) + 0.3, 0.0, 6.0);
  vec3 c0 = textureLod(uC, vUV, clamp(log2(max(1.0, rc / 6.3)), 0.0, 6.0)).rgb;
  acc += pow(c0, vec3(2.2)) * 1.0; wsum += 1.0;
  if (R > 0.6) {
    for (int i = 0; i < 40; i++) {
      float fi = float(i) + 0.5, rr = sqrt(fi / 40.0) * R, th = fi * 2.39996323;
      vec2 off = vec2(cos(th), sin(th)) * rr; vec2 uv = vUV + off / uRes;
      vec4 td = texture(uD, uv); float rt = td.r * 120.0;
      float reach = td.g < zc - 0.0004 ? rt : min(rt, rc);                // behind-the-centre taps only spread as far as the centre's own blur
      float w = smoothstep(rr - 1.5, rr + 0.5, reach);
      acc += pow(textureLod(uC, uv, lod).rgb, vec3(2.2)) * w; wsum += w;
    }
  }
  o = vec4(acc / wsum * uGain, 1.0);
}`;
const FIN = `#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uA; out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){ vec3 c = pow(max(texture(uA, vUV).rgb, 0.0), vec3(1.0 / 2.2)); c += (hash(gl_FragCoord.xy) - 0.5) / 255.0; o = vec4(c, 1.0); }`;

function prog(vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(p, s); }
  gl.bindAttribLocation(p, 0, 'aUV'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
function texFrom(src, aniso) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return t;
}
function target(w, h, fmt, mips) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  const levels = mips ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
  gl.texStorage2D(gl.TEXTURE_2D, levels, fmt, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
const LOGO_PATH = ['M6 21V4M14 21V8M6 17h8M6 13h8M6 9h3.5', 'M18.5 2.6l.9 2.2 2.1.8-2.1.8-.9 2.2-.9-2.2-2.1-.8 2.1-.8z'];
function logoTile(px = 512) {
  const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d');
  const m = px * 0.06, s = px - 2 * m, r = s * 0.27;
  const rr = () => { g.beginPath(); g.roundRect(m, m, s, s, r); };
  const grd = g.createLinearGradient(0, m, 0, m + s); grd.addColorStop(0, '#5a84f5'); grd.addColorStop(1, '#2f5fe6');
  rr(); g.fillStyle = grd; g.fill();
  const hl = g.createLinearGradient(0, m, 0, m + s * 0.5); hl.addColorStop(0, 'rgba(255,255,255,0.28)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.save(); rr(); g.clip(); g.fillStyle = hl; g.fillRect(m, m, s, s * 0.5); g.restore();
  g.save(); g.translate(m + s * 0.2, m + s * 0.2); g.scale(s * 0.6 / 24, s * 0.6 / 24);
  g.strokeStyle = '#fff'; g.lineWidth = 2.0; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(new Path2D(LOGO_PATH[0]));
  g.fillStyle = '#fff'; g.fill(new Path2D(LOGO_PATH[1])); g.restore();
  return c;
}

// ---------------- camera matrices ----------------
function camState(t) {
  const c = camera(t), th = c.theta;
  const L = [PAGE_W / 2, c.ly, 0], C = [L[0], L[1] + c.D * Math.sin(th), c.D * Math.cos(th)];
  const Fw = [0, -Math.sin(th), -Math.cos(th)], U = [0, -Math.cos(th), Math.sin(th)], R = [1, 0, 0];
  // projection with focal F px on a W×HI image; view basis R, U, -Fw
  const n = 10, f = 40000, sx = 2 * F / W, sy = 2 * F / HI;
  const V = [R[0], U[0], -Fw[0], 0, R[1], U[1], -Fw[1], 0, R[2], U[2], -Fw[2], 0,
    -(R[0] * C[0] + R[1] * C[1] + R[2] * C[2]), -(U[0] * C[0] + U[1] * C[1] + U[2] * C[2]), (Fw[0] * C[0] + Fw[1] * C[1] + Fw[2] * C[2]), 1];
  const P = [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0];
  const VP = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += P[k * 4 + j] * V[i * 4 + k]; VP[i * 4 + j] = s; }
  return { ...c, C, Fw, U, R, VP, focus: c.D };
}
// world point for a screen position at a given height above the floor (used to place tiles from screen-space intent)
function worldAt(cs, sx, sy, depth) { const x = (sx - W / 2) * depth / F, y = -(sy - HI / 2) * depth / F; return [cs.C[0] + cs.Fw[0] * depth + cs.R[0] * x + cs.U[0] * y, cs.C[1] + cs.Fw[1] * depth + cs.R[1] * x + cs.U[1] * y, cs.C[2] + cs.Fw[2] * depth + cs.R[2] * x + cs.U[2] * y]; }

// ---------------- the pieces ----------------
const P = layout.pieces.map((p) => ({ ...p, cx: p.x + p.w / 2, cy: p.y + p.h / 2, iw: p.clip.width, ih: p.clip.height, ix: p.clip.x, iy: p.clip.y }));
const HERO_IDS = new Set([0, 1, 2, 3, 4]);
const BASEZ = { card: 26, photo: 34, chip: 30, testimonial: 22, mockup: 24, button: 4 };
function pieceState(p, t, cs) {
  // returns { z, a (stand-up, rad), dx, dy, s, alpha, haze }
  let z = BASEZ[p.kind] + (p.id % 3) * 4, a = 0, dx = 0, dy = 0, alpha = 1, haze = 0;
  const d = p.cy - glideLy(t);                           // > 0: between the look-at and the lens (lower part of frame)
  if (p.kind === 'button') { const u = oC((t - 0.1 - p.id * 0.08) / 1.25); z = lerp(4, p.id ? 64 : 76, u); a = 30 * u; }
  else if (p.id === 4) { const u = ss(0.9, 3.3, t); z = lerp(24, 92, u); a = 30 * u; }                       // the product window
  else if (p.id === 2 || p.id === 3) { const u = ss(1.0, 3.0, t); z = lerp(30, 160, u); a = 44 * u; dx = (p.id === 2 ? -420 : 380) * ss(1.0, 3.0, t); dy = -60 * u; }
  else if (p.kind === 'testimonial') { const u = ss(5.45, 6.3, t); z = lerp(22, 112, u); a = 30 * u; }
  else { const u = ss(1150, 380, d); const amax = p.kind === 'photo' ? 26 : p.kind === 'chip' ? 38 : 15; a = amax * u; z = z + (p.kind === 'chip' ? 46 : p.kind === 'photo' ? 30 : 8) * u; }
  // settle for the overhead strip, and the hero pieces lie flat for the end card
  const flat = HERO_IDS.has(p.id) ? ss(9.47, 9.92, t) : ss(8.2, 9.15, t);
  a *= 1 - flat; z = lerp(z, HERO_IDS.has(p.id) ? 0.5 : z * 0.45, flat);
  if (HERO_IDS.has(p.id)) { dx *= 1 - ss(9.3, 9.92, t); dy *= 1 - ss(9.3, 9.92, t); }
  return { z, a: a * Math.PI / 180, dx, dy, alpha, haze };
}
let glideLy = (t) => camera(Math.min(t, 8.2)).ly;

// ---------------- the logo tiles ----------------
// k0–k3 lift off beside the hero button; k3 later passes the left edge close and blurred; k4, k5 are the end card's huge soft blurs.
let TILES;
function buildTiles() {
  const end = camState(T.dive1);
  const at = (sx, sy, z) => { const p = worldAt(end, sx, sy, end.D - z); return [p[0], p[1], z]; };
  const c54 = camState(5.4), left = worldAt(c54, 40, 690, 470);
  TILES = [
    { start: [924, 443], hang: [-150, 150, 180], size: 170, end: at(211, 283, 30), endSize: 112 },
    { start: [966, 443], hang: [-40, -40, 120], size: 140, end: at(1229, 283, 46), endSize: 96 },
    { start: [1008, 443], hang: [1590, 110, 210], size: 200, end: at(1386, 660, 4), endSize: 132 },
    { start: [1050, 443], hang: [1500, -60, 140], size: 150, pass: left, end: at(70, 1150, 1850), endSize: 230 },
    { end: at(1395, 1170, 1900), endSize: 240, from: at(1750, 1400, 1900) },
  ];
}
function tileState(k, tile, t) {
  if (k === 4) { const u = oC((t - 9.6) / 1.0), drift = Math.sin(t * 0.9) * 6; const p = tile.end.map((v, i) => lerp(tile.from[i], v, u)); return t < 9.6 ? null : { p: [p[0] + drift, p[1] - drift * 0.5, p[2]], s: tile.endSize, a: 0, alpha: 0.72 }; }
  if (k === 3 && t > 3.4 && t < 9.47) {
    if (t < 4.7 || t > 6.2) return null;
    return { p: tile.pass, s: 170, a: 0.4, alpha: ss(4.7, 5.0, t) * (1 - ss(5.9, 6.2, t)) };
  }
  const lift = oC((t - 0.1 - k * 0.07) / 1.25);
  let x = lerp(tile.start[0], tile.hang[0], lift), y = lerp(tile.start[1], tile.hang[1], lift) + 300 * ss(1.2, 2.4, t), z = lerp(1, tile.hang[2], lift) + Math.sin(t * 1.3 + k) * 8 * lift;
  let s = lerp(32, tile.size, lift), a = 0.6 * lift;
  if (k === 3 && t >= 9.47) { const u = oC((t - 9.55) / 0.9); return { p: tile.end.map((v, i) => lerp([-600, 1400, 1900][i], v, u)), s: tile.endSize, a: 0, alpha: 0.72 }; }
  const dv = ioQ(clamp((t - T.over1) / (T.dive1 - T.over1)));
  if (t >= T.over1) { x = lerp(x, tile.end[0], dv); y = lerp(y, tile.end[1], dv); z = lerp(z, tile.end[2], dv); s = lerp(s, tile.endSize, dv); a = lerp(a, 0, dv); }
  if (t >= T.dive1) { const w = Math.sin(t * 1.1 + k * 2) * 3; x += w; y += Math.cos(t * 0.8 + k) * 2; }
  return { p: [x, y, z], s, a, alpha: 1 };
}
const ioQ = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

// ---------------- drawing ----------------
function quad(pr, o, x, y) { gl.uniform3fv(pr.u.uO, o); gl.uniform3fv(pr.u.uX, x); gl.uniform3fv(pr.u.uY, y); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
function maskAt(t) {
  const u = ioQ(clamp((t - T.over1) / (T.dive1 - T.over1)));
  const fade = ss(9.5, 9.86, t);
  return { rect: [0, 0, PAGE_W, PAGE_H], r: lerp(24, 38 / 0.707, u), fadeY: HERO_B, fade, shadowRect: [0, 0, PAGE_W, lerp(PAGE_H, HERO_B, fade)] };
}
function drawScene(t) {
  const cs = camState(t), pr = PROG.scene, m = maskAt(t);
  gl.bindFramebuffer(gl.FRAMEBUFFER, FBO.scene); gl.viewport(0, 0, W, HI);
  gl.useProgram(pr.p); gl.bindVertexArray(QUAD);
  gl.uniformMatrix4fv(pr.u.uVP, false, cs.VP); gl.uniform3fv(pr.u.uCam, cs.C); gl.uniform3fv(pr.u.uFwd, cs.Fw); gl.uniform1f(pr.u.uFocus, cs.focus); gl.uniform2f(pr.u.uRes, W, HI);
  gl.uniform4fv(pr.u.uMask, m.rect); gl.uniform1f(pr.u.uMaskR, m.r); gl.uniform1f(pr.u.uFadeY, m.fadeY); gl.uniform1f(pr.u.uFade, m.fade); gl.uniform1f(pr.u.uNoMask, 0);
  gl.disable(gl.BLEND);
  gl.uniform1i(pr.u.uMode, 0); quad(pr, [-60000, -60000, 0], [130000, 0, 0], [0, 130000, 0]);
  gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  // page shadow, then the page tiles
  gl.uniform1i(pr.u.uMode, 3); gl.uniform1f(pr.u.uAlpha, 1); gl.uniform4fv(pr.u.uMask, m.shadowRect);
  quad(pr, [-400, -400, 0.01], [PAGE_W + 800, 0, 0], [0, PAGE_H + 800, 0]);
  gl.uniform4fv(pr.u.uMask, m.rect);
  gl.uniform1i(pr.u.uMode, 1); gl.uniform1f(pr.u.uAlpha, 1); gl.uniform1f(pr.u.uHaze, 0);
  for (const tl of layout.tiles) { gl.bindTexture(gl.TEXTURE_2D, TEX[tl.f]); quad(pr, [0, tl.y, 0.02], [PAGE_W, 0, 0], [0, tl.h, 0]); }
  // pieces: shadows first, then the pieces themselves, lowest first
  const items = P.map((p) => ({ p, s: pieceState(p, t, cs) }));
  const tiles = TILES.map((tile, k) => ({ k, s: tileState(k, tile, t) })).filter((x) => x.s && x.s.alpha > 0.002);
  gl.uniform1i(pr.u.uMode, 2);
  for (const { p, s } of items) {
    const z = s.z, off = [0.10 * z, 4 + 0.36 * z], blur = 7 + 0.5 * z, hh = p.ih * Math.cos(s.a);
    gl.bindTexture(gl.TEXTURE_2D, TEX['piece-' + p.id]); gl.uniform1f(pr.u.uLod, Math.log2(Math.max(1, blur * 2 / 1.4))); gl.uniform1f(pr.u.uAlpha, s.alpha);
    quad(pr, [p.ix + s.dx + off[0], p.cy + s.dy - hh / 2 + off[1], 0.03], [p.iw, 0, 0], [0, hh, 0]);
  }
  for (const { s } of tiles) { const z = s.p[2], blur = 7 + 0.5 * z, off = [0.10 * z, 4 + 0.36 * z]; gl.bindTexture(gl.TEXTURE_2D, TEX.logo); gl.uniform1f(pr.u.uLod, Math.log2(Math.max(1, blur * 512 / s.s / 1.4))); gl.uniform1f(pr.u.uAlpha, s.alpha * clamp(1 - z / 1200));
    quad(pr, [s.p[0] - s.s / 2 + off[0], s.p[1] - s.s / 2 + off[1], 0.03], [s.s, 0, 0], [0, s.s * Math.cos(s.a), 0]); }
  const draws = [...items.map((x) => ({ z: x.s.z, fn: () => drawPiece(pr, x.p, x.s) })), ...tiles.map((x) => ({ z: x.s.p[2] + 0.5, fn: () => drawTile(pr, x.s) }))].sort((a, b) => a.z - b.z);
  for (const d of draws) d.fn();
  return cs;
}
function drawPiece(pr, p, s) {
  const ca = Math.cos(s.a), sa = Math.sin(s.a), cx = p.ix + s.dx, cy = p.cy + s.dy;
  gl.uniform1i(pr.u.uMode, 1); gl.uniform1f(pr.u.uAlpha, s.alpha); gl.uniform1f(pr.u.uHaze, s.haze); gl.uniform1f(pr.u.uNoMask, s.a > 0.02 ? 1 : 0);
  gl.bindTexture(gl.TEXTURE_2D, TEX['piece-' + p.id]);
  quad(pr, [cx, cy - p.ih / 2 * ca, s.z + p.ih / 2 * sa], [p.iw, 0, 0], [0, p.ih * ca, -p.ih * sa]);
  if (p.kind === 'testimonial' && s.a > 0.01) {                               // the card's 34 px white edge, facing the lens
    const by = cy + p.h / 2 * ca, bz = s.z - p.h / 2 * sa, N = [0, sa, ca];
    gl.uniform1i(pr.u.uMode, 4); gl.uniform3f(pr.u.uColor, 0.955, 0.96, 0.97); gl.uniform1f(pr.u.uAlpha, clamp(s.a * 6));
    quad(pr, [p.x + s.dx + 8, by, bz], [p.w - 16, 0, 0], [-N[0] * 34, -N[1] * 34, -N[2] * 34]);
  }
  gl.uniform1f(pr.u.uNoMask, 0);
}
function drawTile(pr, s) {
  gl.uniform1i(pr.u.uMode, 1); gl.uniform1f(pr.u.uAlpha, s.alpha); gl.uniform1f(pr.u.uHaze, 0); gl.uniform1f(pr.u.uNoMask, 1);
  gl.bindTexture(gl.TEXTURE_2D, TEX.logo);
  const ca = Math.cos(s.a), sa = Math.sin(s.a), h = s.s;
  quad(pr, [s.p[0] - h / 2, s.p[1] - h / 2 * ca, s.p[2] + h / 2 * sa], [h, 0, 0], [0, h * ca, -h * sa]);
  gl.uniform1f(pr.u.uNoMask, 0);
}
function dofInto(gain) {
  gl.bindTexture(gl.TEXTURE_2D, FBO.color); gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, FBO.depth); gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindFramebuffer(gl.FRAMEBUFFER, FBO.accum); gl.viewport(0, 0, W, HI);
  const pr = PROG.dof; gl.useProgram(pr.p); gl.bindVertexArray(QUAD);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, FBO.color); gl.uniform1i(pr.u.uC, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, FBO.depth); gl.uniform1i(pr.u.uD, 1);
  gl.uniform2f(pr.u.uRes, W, HI); gl.uniform1f(pr.u.uGain, gain);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.activeTexture(gl.TEXTURE0);
}
function frame(t) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, FBO.accum); gl.viewport(0, 0, W, HI); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  for (let k = 0; k < SUB; k++) {
    const ts = SUB > 1 ? t - SHUTTER / 2 + SHUTTER * (k + 0.5) / SUB : t;
    drawScene(Math.max(0, Math.min(T.end, ts)));
    dofInto(1 / SUB);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, HI); gl.disable(gl.BLEND);
  const pr = PROG.fin; gl.useProgram(pr.p); gl.bindVertexArray(QUAD); gl.bindTexture(gl.TEXTURE_2D, FBO.accumTex); gl.uniform1i(pr.u.uA, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.finish();
  titleFrame(t);
}

// ---------------- the end card's type (DOM over the canvas) ----------------
function buildTitle(stage) {
  OVER = document.createElement('div'); Object.assign(OVER.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: HI + 'px', pointerEvents: 'none' }); stage.appendChild(OVER);
  const pill = document.createElement('div');
  Object.assign(pill.style, { position: 'absolute', left: '50%', top: '44px', transform: 'translate(-50%,-50%)', height: '42px', padding: '0 18px 0 8px', display: 'flex', alignItems: 'center', gap: '10px', background: '#ffffff', borderRadius: '21px', boxShadow: '0 1px 2px rgba(17,17,20,.06), 0 6px 18px -6px rgba(17,33,51,.18)', fontFamily: "'Geist'", fontWeight: '500', fontSize: '21px', color: '#111114', whiteSpace: 'nowrap', letterSpacing: '-0.01em' });
  const lg = logoTile(64); lg.style.width = lg.style.height = '30px'; pill.appendChild(lg);
  const nm = document.createElement('span'); nm.textContent = 'AI Essentials Academy'; pill.appendChild(nm);
  OVER.appendChild(pill); TITLE.pill = pill;
  const mk = (text, opts) => textLine(OVER, text, { left: '0', top: (opts.cy - opts.size * 0.6) + 'px', width: W + 'px', justifyContent: 'center', fontFamily: opts.font, fontSize: opts.size + 'px', fontWeight: opts.weight, fontStyle: opts.italic ? 'italic' : 'normal', color: opts.color, lineHeight: '1.2', letterSpacing: opts.ls || '0', whiteSpace: 'nowrap', gap: '0', direction: 'ltr' });
  TITLE.l1 = mk('The AI handbook,', { cy: 128, size: 74, font: "'Geist'", weight: '500', color: '#111114', ls: '-0.035em' });
  TITLE.l2 = mk('now a living academy.', { cy: 222, size: 82, font: "'Instrument Serif'", weight: '400', italic: true, color: '#8b8b92', ls: '-0.01em' });
  for (const L of [TITLE.l1, TITLE.l2]) L.words.forEach((w, i) => { if (i < L.words.length - 1) w.style.marginRight = '0.24em'; });
}
function titleFrame(t) {
  const pa = ss(T.badge, T.badge + 0.3, t); TITLE.pill.style.opacity = pa.toFixed(3); TITLE.pill.style.display = pa > 0 ? 'flex' : 'none';
  const run = (L, t0, step) => { L.line.style.display = t >= t0 - 0.01 ? 'flex' : 'none'; L.words.forEach((w, i) => { const u = clamp((t - t0 - i * step) / 0.34), e = oC(u); w.style.opacity = e.toFixed(3); w.style.transform = `translateY(${((1 - e) * 16).toFixed(2)}px)`; const b = (1 - e) * 12; w.style.filter = b > 0.2 ? `blur(${b.toFixed(2)}px)` : 'none'; }); };
  run(TITLE.l1, T.line1, 0.06); run(TITLE.l2, T.line2, 0.05);
}

export default {
  duration: 14.5, fps: 60,
  async init(stage, { variant }) {
    SUB = variant === 'still' ? 1 : variant === 'preview' ? 4 : SUBS;
    stage.style.background = '#f6f7f9';
    CV = document.createElement('canvas'); CV.width = W; CV.height = HI; Object.assign(CV.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: HI + 'px' }); stage.appendChild(CV);
    gl = CV.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: false });
    if (!gl) throw new Error('WebGL2 unavailable (config.gpu must be true)');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float unavailable');
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    PROG.scene = prog(VS, FS); PROG.dof = prog(VS2, DOF); PROG.fin = prog(VS2, FIN);
    QUAD = gl.createVertexArray(); gl.bindVertexArray(QUAD);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const load = async (f) => createImageBitmap(await (await fetch(BASE + f)).blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    for (const tl of layout.tiles) TEX[tl.f] = texFrom(await load(tl.f), aniso);
    for (const p of P) TEX['piece-' + p.id] = texFrom(await load(p.f), aniso);
    TEX.logo = texFrom(logoTile(512), aniso);
    FBO.color = target(W, HI, gl.RGBA8, true); FBO.depth = target(W, HI, gl.RGBA16F, true);
    FBO.scene = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, FBO.scene);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, FBO.color, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, FBO.depth, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    FBO.accumTex = target(W, HI, gl.RGBA16F, false); FBO.accum = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, FBO.accum); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, FBO.accumTex, 0);
    const css = document.createElement('style'); css.textContent = `@font-face{font-family:'Geist';src:url('../assets/fonts/Geist-500-latin.woff2') format('woff2');font-weight:500;}`; document.head.appendChild(css);
    await document.fonts.load("500 74px 'Geist'", 'The AI'); await document.fonts.load("italic 82px 'Instrument Serif'", 'now');
    buildTiles(); buildTitle(stage);
    window.__film24 = { aniso: !!aniso, maxAniso: aniso ? gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0 };
  },
  render(t) { frame(t); },
};
