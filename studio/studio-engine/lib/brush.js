// Studio Engine — the brush pass (browser, WebGL2). A flat drawing in, a painted frame out.
// Our own design, built on published image-processing methods, not on any third-party code:
//   oil / gouache   anisotropic Kuwahara filter (Kyprianidis, Kang & Döllner 2009): the local structure tensor gives
//                   the direction of the shapes; each pixel takes the calmest of 8 elliptical sectors along that
//                   direction, which flattens colour into strokes that follow the forms. Then a bristle texture
//                   that runs along the same direction and a lit ridge (impasto).
//   watercolour     edge darkening from the difference between a sharp and a blurred copy (pigment pools at the
//                   rim of a wash), turbulence-displaced sampling (the wash bleeds), low-frequency density blooms,
//                   paper granulation, dry-brush gaps where the paper shows.
//   ink             a Sobel outline whose width and darkness wobble with noise, over flat greyish washes.
//   pastel          luminance-driven cross hatching in two directions on toothy paper (darker = more strokes).
// Every pass: paper tooth or canvas weave, film grain, grade (saturation, contrast, warmth), vignette.
// `tick` is the drawing number: noise fields move with it, so the painting "boils" like hand animation.
const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const COMMON = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D T; uniform vec2 R; uniform float tick, k;
float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
float fb(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.1 + 3.7; a *= .5; } return s; }
vec3 at(vec2 q){ return texture(T, q / R).rgb; }
float L(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
`;

// pass 1: structure tensor, smoothed (oil only) → rg = direction, b = anisotropy
const TENSOR = COMMON + `
void main(){
  vec2 q = uv * R, e = vec2(1.5 * k, 0.);
  vec3 sx = (at(q + e.xy) - at(q - e.xy)) * .5, sy = (at(q + e.yx) - at(q - e.yx)) * .5;
  vec3 t = vec3(dot(sx, sx), dot(sy, sy), dot(sx, sy));
  o = vec4(t, 1.);
}`;
const SMOOTH = COMMON + `
uniform sampler2D S; uniform vec2 dir;
void main(){
  vec2 q = uv * R; vec3 s = vec3(0.); float w = 0.;
  for (int i = -6; i <= 6; i++){ float g = exp(-float(i * i) / 18.); s += g * texture(S, (q + dir * float(i) * 2. * k) / R).rgb; w += g; }
  o = vec4(s / w, 1.);
}`;

const PAINT = COMMON + `
uniform sampler2D S;                  // smoothed structure tensor (oil)
uniform float strokeLen, valJ, hueJ, boil, mode, radius, bristle, impasto, wash, bleed, outline, hatch, paper, grain, sat, contrast, warm, vig, posterize;
uniform vec3 paperCol, ink;

vec3 kuwahara(vec2 q){
  vec3 t = texture(S, q / R).rgb;
  float l1 = .5 * (t.x + t.y + sqrt((t.x - t.y) * (t.x - t.y) + 4. * t.z * t.z)), l2 = .5 * (t.x + t.y - sqrt((t.x - t.y) * (t.x - t.y) + 4. * t.z * t.z));
  vec2 v = vec2(l1 - t.x, -t.z); v = length(v) > 0. ? normalize(v) : vec2(0., 1.);
  float A = (l1 + l2 > 0.) ? (l1 - l2) / (l1 + l2) : 0.;
  // a slow swirl field bends the strokes where the drawing is flat, and moves with the boil
  float sw = fb(q / (180. * k) + tick * .02) * 6.2832;
  v = normalize(mix(vec2(cos(sw), sin(sw)), v, clamp(A * 3., 0., 1.)));
  float r = radius * k, a = r * (1. + A), b = r / (1. + A) * .8;
  mat2 rot = mat2(v.x, v.y, -v.y, v.x);
  vec3 m[8]; vec3 s2[8]; float w[8];
  for (int i = 0; i < 8; i++){ m[i] = vec3(0.); s2[i] = vec3(0.); w[i] = 0.; }
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++){
    vec2 d = vec2(float(x), float(y)) / 2.; if (dot(d, d) > 1.1) continue;
    vec2 off = rot * (d * vec2(a, b));
    vec3 c = at(q + off);
    float ang = atan(d.y, d.x), fall = exp(-dot(d, d) * 1.5);
    for (int i = 0; i < 8; i++){
      float da = abs(mod(ang - float(i) * .785398 + 3.14159, 6.28318) - 3.14159);
      float g = max(0., 1. - da / .785398) * fall;
      m[i] += c * g; s2[i] += c * c * g; w[i] += g;
    }
  }
  vec3 acc = vec3(0.); float tw = 0.;
  for (int i = 0; i < 8; i++){ if (w[i] <= 0.) continue; vec3 mu = m[i] / w[i]; vec3 var = abs(s2[i] / w[i] - mu * mu);
    float sg = var.r + var.g + var.b, wt = 1. / (1. + pow(sg * 2500., 4.)); acc += mu * wt; tw += wt; }
  vec3 c = acc / max(tw, 1e-4);
  // strokes: the plane is cut into stroke-shaped cells along the shape direction (length × width, edges roughened by noise).
  // Each stroke smears the colour found along its length and carries its own value and warmth; a share of strokes is
  // laid again on every drawing (boil), so the paint shimmers like hand animation.
  vec2 along0 = vec2(dot(q, v), dot(q, vec2(-v.y, v.x)));
  float len = 26. * k * strokeLen, wid = 8. * k * strokeLen;
  vec2 cq = along0 / vec2(len, wid) + (vec2(vn(q / (9. * k)), vn(q / (9. * k) + 3.)) - .5) * .7;
  vec2 cell = floor(cq); cell.x += floor(cell.y * .5) * .5;
  float again = step(h1(cell + 7.7), boil) * floor(tick);
  float hv = h1(cell + again * .37), hs = h1(cell + 13.1 + again), hw = h1(cell + 29.3 + again);
  vec3 smear = texture(T, (q + v * (hs - .5) * len * .9) / R).rgb;
  c = mix(c, smear, .45);
  c *= 1. + (hv - .5) * valJ;
  c += vec3(.03, .0, -.03) * (hw - .5) * hueJ;
  float edgeStroke = smoothstep(.5, .46, abs(fract(cq.y) - .5)) * .5 + .5;
  c *= mix(1., .93 + .07 * edgeStroke, bristle);
  // bristles: fine streaks along the stroke direction, and the ridge of thick paint catching light from the top left
  vec2 along = vec2(dot(q, v), dot(q, vec2(-v.y, v.x)));
  float br = vn(vec2(along.x / (14. * k), along.y / (1.6 * k)) + tick * .13);
  c *= 1. + bristle * (br - .5) * .28;
  float ridge = vn(vec2(along.x / (30. * k), along.y / (6. * k)) + 9.);
  c *= 1. + impasto * (ridge - .5) * dot(vec2(-v.y, v.x), normalize(vec2(-.7, -.7))) * .35;
  return c;
}

vec3 watercolour(vec2 q){
  vec2 dq = (vec2(fb(q / (40. * k) + tick * .05), fb(q / (40. * k) + 7.3 + tick * .05)) - .5) * bleed * 26. * k;
  vec3 c = at(q + dq);
  vec3 soft = vec3(0.); float w = 0.;
  for (int i = 0; i < 12; i++){ float a = float(i) * .5236; vec2 d = vec2(cos(a), sin(a)) * 9. * k; soft += at(q + dq + d); w += 1.; }
  soft /= w;
  float rim = clamp(L(soft) - L(c), 0., 1.) + length(c - soft) * .5;          // darker side of an edge
  c = mix(c, c * c * 1.05, clamp(rim * 6. * wash, 0., .85));                   // pigment pools at the rim
  c *= 1. + wash * .22 * (fb(q / (120. * k) + 2.) - .5);                       // blooms where the wash dried unevenly
  c *= 1. - wash * .2 * (fb(q / (2.5 * k)) - .5);                              // granulation in the paper tooth
  float dry = smoothstep(.66, .84, fb(q / (26. * k) + 5. + tick * .03));
  c = mix(c, paperCol, wash * (.1 + .3 * dry * clamp(rim * 8., 0., 1.)));      // dry brush where the edge broke
  return mix(c, paperCol, .1 * wash);
}

vec3 pastel(vec2 q, vec3 c){
  float l = L(c), j = (fb(q / (60. * k) + tick * .07) - .5) * .25;
  // short chalk strokes in cells, each with its own angle; darker areas get a second, crossing layer
  vec2 g1 = q / (16. * k), id = floor(g1); float ang = .8 + (h1(id + floor(tick * .5)) - .5) * .6;
  vec2 rd = vec2(cos(ang), sin(ang)); float line = abs(fract(dot(q, vec2(-rd.y, rd.x)) / (4.5 * k) + h1(id) ) - .5);
  float stroke1 = smoothstep(.32, .12, line) * smoothstep(.0, .3, h1(id + 3.) + .2);
  float line2 = abs(fract(dot(q, vec2(rd.y, rd.x)) / (5.5 * k) + h1(id + 5.)) - .5);
  float stroke2 = smoothstep(.3, .1, line2) * clamp(.7 - l, 0., 1.) * 1.4;
  float tooth = fb(q / (2.2 * k));
  float cov = clamp(.55 + j + stroke1 * .35 + stroke2 * .4, 0., 1.) * (.7 + .5 * tooth);
  return mix(paperCol, c, clamp(cov * hatch, 0., 1.));
}

void main(){
  vec2 q = vec2(uv.x, 1. - uv.y) * R;     // texture rows run top-down
  vec3 c = at(q);
  if (mode < .5) c = kuwahara(q);
  else if (mode < 1.5) c = watercolour(q);
  else if (mode < 2.5) c = pastel(q, mix(c, at(q + (vec2(vn(q / (8. * k)), vn(q / (8. * k) + 4.)) - .5) * 5. * k), .5));
  if (outline > 0.){
    vec2 e = vec2(1.6 * k, 0.);
    float gx = L(at(q + e.xy)) - L(at(q - e.xy)), gy = L(at(q + e.yx)) - L(at(q - e.yx));
    float wob = .55 + .9 * vn(q / (22. * k) + tick * .5);
    c = mix(c, ink, smoothstep(.05, .18, length(vec2(gx, gy)) * wob) * outline);
  }
  if (posterize > 1.) c = floor(c * posterize + .5) / posterize;
  float weave = sin(q.x * 1.2 / k) * sin(q.y * 1.2 / k), tooth = fb(q / (3. * k));
  c *= 1. + paper * (.045 * weave * step(mode, .5) + .1 * (tooth - .5));
  c += (h1(q + fract(tick * .173) * 517.) - .5) * grain * .08;
  float l = L(c); c = mix(vec3(l), c, sat); c = (c - .5) * contrast + .5; c += vec3(.03, .01, -.025) * warm;
  vec2 d = uv - .5; c *= 1. - vig * dot(d, d) * 1.6;
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

export const LOOK_DEFAULTS = {
  oil: { mode: 0, radius: 9, strokeLen: 1.2, valJ: 0.22, hueJ: 1, boil: 0.5, bristle: 0.8, impasto: 0.7, paper: 0.7, grain: 0.5, sat: 1.15, contrast: 1.06, warm: 0.25, vig: 0.35, paperCol: '#efe4cc' },
  gouache: { mode: 0, radius: 5, strokeLen: 0.8, valJ: 0.08, hueJ: 0.4, boil: 0.3, bristle: 0.3, impasto: 0.15, paper: 0.8, grain: 0.35, sat: 1.02, contrast: 1.02, warm: 0.1, vig: 0.15, paperCol: '#f1e6d0' },
  watercolour: { mode: 1, wash: 0.9, bleed: 0.8, paper: 0.9, grain: 0.25, sat: 0.92, contrast: 0.97, warm: 0.1, vig: 0.12, paperCol: '#f6f1e6' },
  ink: { mode: 1, wash: 0.5, bleed: 0.3, outline: 0.95, paper: 0.7, grain: 0.3, sat: 0.8, contrast: 1.05, warm: 0.1, vig: 0.1, paperCol: '#f4efe3', ink: '#1b1712' },
  pastel: { mode: 2, hatch: 1, paper: 1.4, grain: 0.7, sat: 0.85, contrast: 0.92, warm: 0.3, vig: 0.2, paperCol: '#efe6d6' },
  flat: { mode: 3, paper: 0.6, grain: 0.3, sat: 1, contrast: 1, warm: 0.05, vig: 0.15, paperCol: '#f3ece0' },
};
// words in a brief → changes to a look (applied in order on top of the base)
export const LOOK_WORDS = [
  [/thick|bold|heavy|تقيل|سميك/i, { radius: +4, impasto: +0.2 }], [/fine|delicate|رفيع|ناعم/i, { radius: -3 }],
  [/swirl|van gogh|دوام|فان جوخ/i, { bristle: +0.15, strokeLen: +0.4, valJ: +0.08 }], [/dream|soft|حالم/i, { bleed: +0.2, contrast: -0.05 }],
  [/vintage|old film|قديم/i, { sat: -0.2, warm: +0.3, grain: +0.5, vig: +0.2 }], [/comic|graphic|كوميك/i, { outline: 0.9, posterize: 6 }],
  [/poster|retro|بوستر/i, { posterize: 5 }], [/kids|children|أطفال/i, { sat: +0.12, warm: +0.1 }], [/dark|moody|غامق/i, { contrast: +0.08, vig: +0.2 }],
];
export function resolveLook(look = 'watercolour', words = '') {
  const base = typeof look === 'string' ? look : look.base || 'watercolour';
  const L = { strokeLen: 1, valJ: 0, hueJ: 0, boil: 0.4, mode: 0, radius: 7, bristle: 0, impasto: 0, wash: 0, bleed: 0, outline: 0, hatch: 0, paper: 0.6, grain: 0.3, sat: 1, contrast: 1, warm: 0, vig: 0.2, posterize: 0, paperCol: '#f3ece0', ink: '#1b1712', ...(LOOK_DEFAULTS[base === 'crayon' ? 'pastel' : base === 'storybook' ? 'gouache' : base] || LOOK_DEFAULTS.watercolour) };
  for (const [re, d] of LOOK_WORDS) if (re.test(words)) for (const [kk, v] of Object.entries(d)) L[kk] = kk === 'outline' || kk === 'posterize' ? v : Math.max(0, (L[kk] || 0) + v);
  if (typeof look === 'object') for (const [kk, v] of Object.entries(look)) if (kk !== 'base') L[kk] = v;
  return L;
}

const hex = (c) => { const n = parseInt(String(c).slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

// Brush(canvas) → { paint(source, look, tick) }; source = any canvas/image of the canvas size.
export function Brush(canvas) {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const prog = (fs) => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(p, s); }
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
  };
  const P = { tensor: prog(TENSOR), smooth: prog(SMOOTH), paint: prog(PAINT) };
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const W = canvas.width, H = canvas.height;
  const tex = (data) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);
    if (data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null); return t; };
  gl.getExtension('EXT_color_buffer_float');
  const src = tex(null), t1 = tex(null), t2 = tex(null);
  gl.bindTexture(gl.TEXTURE_2D, src); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fbo = (t) => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; };
  const F1 = fbo(t1), F2 = fbo(t2);
  const draw = (p, target, uni) => {
    gl.useProgram(p); gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, W, H);
    const loc = gl.getAttribLocation(p, 'p'); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    let unit = 0;
    for (const [n, v] of Object.entries(uni)) { const u = gl.getUniformLocation(p, n); if (!u) continue;
      if (v && v.tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(u, unit++); }
      else if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, u, v); else gl.uniform1f(u, v); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return {
    paint(source, look, tick) {
      gl.bindTexture(gl.TEXTURE_2D, src); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      const k = H / 1920, base = { T: { tex: src }, R: [W, H], tick, k };
      if (look.mode < 0.5) {   // the oil family needs the shape directions first
        draw(P.tensor, F1, base);
        draw(P.smooth, F2, { ...base, S: { tex: t1 }, dir: [1, 0] });
        draw(P.smooth, F1, { ...base, S: { tex: t2 }, dir: [0, 1] });
      }
      draw(P.paint, null, { ...base, S: { tex: t1 }, strokeLen: look.strokeLen ?? 1, valJ: look.valJ ?? 0, hueJ: look.hueJ ?? 0, boil: look.boil ?? 0.4, mode: look.mode, radius: look.radius, bristle: look.bristle, impasto: look.impasto, wash: look.wash, bleed: look.bleed,
        outline: look.outline, hatch: look.hatch, paper: look.paper, grain: look.grain, sat: look.sat, contrast: look.contrast, warm: look.warm, vig: look.vig,
        posterize: look.posterize, paperCol: hex(look.paperCol), ink: hex(look.ink) });
    },
  };
}
