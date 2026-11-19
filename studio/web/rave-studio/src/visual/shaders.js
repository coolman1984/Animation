// GLSL shared by the stage: noise, the VJ program library (also shown on the LED walls),
// volumetric beams, crowd silhouettes, skies and the final compositing pass.

export const NOISE = /* glsl */ `
float hash11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }
float vnoise3(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*(3.-2.*f);
  float n = i.x + i.y*57. + i.z*113.;
  return mix(mix(mix(hash11(n),hash11(n+1.),u.x), mix(hash11(n+57.),hash11(n+58.),u.x),u.y),
             mix(mix(hash11(n+113.),hash11(n+114.),u.x), mix(hash11(n+170.),hash11(n+171.),u.x),u.y), u.z); }
`;

// VJ programs. uv in 0..1, aspect corrects circles. Returns rgb (not clamped).
export const VJ = /* glsl */ `
uniform sampler2D uSpectrum;
float spec(float x){ return texture2D(uSpectrum, vec2(clamp(x,0.,1.), .5)).r; }
vec3 vjProgram(float prog, vec2 uv, float t, float aspect, float beat, float kick, float bass, float high, vec3 c0, vec3 c1, vec3 c2){
  vec2 p = (uv-.5)*vec2(aspect,1.);
  float r = length(p), a = atan(p.y,p.x);
  vec3 col = vec3(0.);
  if (prog < 1.5) { // 1 tunnel
    float z = .35/(r+.04) + t*1.2;
    float bands = smoothstep(.45,.5,fract(z)) * smoothstep(.95,.9,fract(z));
    float spokes = smoothstep(.92,1.,abs(sin(a*6.+t*.4)));
    col = mix(c0,c1,fract(floor(z)*.5)) * (bands*(.6+kick) + spokes*.3) * smoothstep(0.,.25,r);
  } else if (prog < 2.5) { // 2 rings from the centre on the beat
    float w = fract(r*3.-t*.6-beat*.25);
    col = mix(c0,c2,step(.5,fract(r*1.5-t*.3))) * smoothstep(.05,0.,abs(w-.5)-.02) * (1.+kick);
  } else if (prog < 3.5) { // 3 spectrum bars (mirrored)
    float x = abs(uv.x-.5)*2.;
    float s = spec(x*.85);
    float bars = step(.15, fract(x*40.));
    col = mix(c0,c1,uv.y) * step(abs(uv.y-.5)*2., s*1.1) * bars;
  } else if (prog < 4.5) { // 4 scanner sweep
    float y = fract(uv.y*1. - t*.5);
    col = c0 * pow(smoothstep(.0,.02,y)*smoothstep(.12,.02,y),1.) * 2. + c1*step(.985,fract(uv.x*24.))*.4*(.3+bass);
    col += c2 * smoothstep(.02,0.,abs(uv.x-fract(t*.37)))*kick;
  } else if (prog < 5.5) { // 5 star warp
    float s = 0.;
    for (int i=0;i<3;i++){ float fi=float(i); vec2 q = vec2(a*12.732+fi*7.1, log(r+.001)*1.5 - t*(1.6+fi*.7));
      vec2 id=floor(q); vec2 f=fract(q); float h=hash21(id+fi*31.);
      s += step(.85,h) * smoothstep(.08,0.,abs(f.x-.5)) * smoothstep(0.,.5,f.y)*smoothstep(1.,.5,f.y); }
    col = mix(c2,c0,s) * s * (1.+high*2.) * smoothstep(0.,.3,r);
  } else if (prog < 6.5) { // 6 hex pulse
    vec2 q = p*8.; q.x *= 1.1547; q.y += mod(floor(q.x),2.)*.5;
    vec2 id = floor(q), f = fract(q)-.5;
    float d = max(abs(f.x)*1.5+abs(f.y)*.87, abs(f.y)*1.73);
    float pulse = fract(hash21(id)*4. + t*.5 + beat*.25);
    col = mix(c1,c0,pulse) * smoothstep(.5,.45,d) * smoothstep(.35,.45,d) * (.5+kick) + c0*step(.92,pulse)*smoothstep(.45,.2,d);
  } else if (prog < 7.5) { // 7 plasma
    float v = sin(p.x*4.+t) + sin(p.y*3.-t*1.3) + sin((p.x+p.y)*5.+t*.7) + sin(r*8.-t*2.);
    col = .5+.5*cos(vec3(0.,2.,4.)+v+vec3(dot(c0,vec3(2.)),0.,0.));
    col = mix(c0,c1,col.r)*col.g*(.6+bass*.8);
  } else { // 8 kaleidoscope noise
    float seg = 6.2831/8.; float aa = mod(a+t*.1, seg); aa = abs(aa-seg*.5);
    vec2 q = r*vec2(cos(aa),sin(aa));
    float n = fbm(q*4.-t*.3);
    col = mix(c1,c0,smoothstep(.3,.7,n)) * smoothstep(.45,.75,n+kick*.2) * 1.4;
  }
  return col;
}
`;

// Volumetric beam / laser: a unit cone or cylinder along +Y, instanced; brightness fades along the length,
// softens at the silhouette (view fresnel) and breaks up in drifting haze.
export const beamVert = /* glsl */ `
attribute vec3 aColor; attribute float aIntensity;
varying vec3 vColor; varying float vI; varying float vAlong; varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  vColor = aColor; vI = aIntensity; vAlong = position.y;
  vec4 w = modelMatrix * instanceMatrix * vec4(position,1.);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
export const beamFrag = /* glsl */ `
uniform float uTime; uniform float uHaze; uniform float uCore; uniform float uFadePow;
varying vec3 vColor; varying float vI; varying float vAlong; varying vec3 vN; varying vec3 vV; varying vec3 vW;
${NOISE}
void main(){
  float f = abs(dot(normalize(vN), normalize(vV)));
  float edge = pow(f, mix(1.6, 6., uCore));
  float along = pow(1.-vAlong, uFadePow) * smoothstep(0.,.015,vAlong);
  float haze = mix(1., .45 + .9*vnoise3(vW*.35 + vec3(0., -uTime*.25, uTime*.1)), uHaze);
  float a = edge * along * haze * vI;
  gl_FragColor = vec4(vColor * a, 1.);
}`;

// Crowd: thousands of silhouettes in one draw call; jump on the beat, arms rise with the energy.
export const crowdVert = /* glsl */ `
attribute float aArm; attribute vec3 aRand;
uniform float uTime; uniform float uBeat; uniform float uJump; uniform float uArms; uniform float uSway;
varying float vH; varying vec3 vN; varying vec3 vW; varying float vR;
mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }
void main(){
  vec3 p = position;
  vR = aRand.x;
  float energy = .55 + .45*aRand.y;
  float up = clamp(uArms * (.6 + .8*aRand.z) - .1, 0., 1.);
  if (aArm != 0.) {
    vec2 sh = vec2(.255*aArm, 1.42);
    float ang = -aArm * up * (2.75 + .25*sin(uTime*2.+aRand.x*20.));
    ang += -aArm * up * .25 * sin(6.2831*(uBeat + aRand.x*.15));
    p.xy = sh + rot(ang) * (p.xy - sh);
  }
  float hop = max(0., sin(3.14159*fract(uBeat + aRand.z*.12))) ;
  float jump = uJump * energy * hop * .32;
  p.y += jump;
  p.xz = rot(uSway * .25 * sin(uTime*1.3 + aRand.x*30.)) * p.xz;
  vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.);
  vW = w.xyz; vH = position.y;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
export const crowdFrag = /* glsl */ `
uniform vec3 uStage; uniform vec3 uRimA; uniform vec3 uRimB; uniform float uRim; uniform float uFlash; uniform vec3 uFog; uniform float uFogD;
varying float vH; varying vec3 vN; varying vec3 vW; varying float vR;
void main(){
  vec3 toStage = normalize(uStage - vW);
  vec3 v = normalize(cameraPosition - vW);
  float rim = pow(1. - abs(dot(vN, v)), 2.5);
  float face = max(0., dot(vN, toStage));
  vec3 rimC = mix(uRimA, uRimB, step(.5, vR));
  vec3 col = vec3(.012,.013,.016) + rimC * (rim*.9 + face*.35) * uRim * smoothstep(.2, 1.6, vH);
  float d = length(cameraPosition - vW);
  col *= smoothstep(3.5, 14., d);
  col += vec3(1.) * uFlash * (.15 + .5*face) * smoothstep(2., 8., d);
  col = mix(col, uFog, 1. - exp(-uFogD*uFogD*d*d));
  gl_FragColor = vec4(col, 1.);
}`;

// Soft round sprites (particles, smoke). Size attenuates with distance.
export const pointsVert = /* glsl */ `
attribute float aSize; attribute vec4 aCol;
uniform float uScale;
varying vec4 vCol;
void main(){
  vCol = aCol;
  vec4 mv = modelViewMatrix * vec4(position,1.);
  gl_PointSize = aSize * uScale / max(.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
export const pointsFrag = /* glsl */ `
uniform float uSoft;
varying vec4 vCol;
void main(){
  vec2 q = gl_PointCoord*2.-1.;
  float d = dot(q,q);
  if (d > 1.) discard;
  float a = mix(1.-smoothstep(.2,1.,d), exp(-d*3.), uSoft) * vCol.a;
  gl_FragColor = vec4(vCol.rgb * a, a);
}`;

// Smoke quads that always face the camera.
export const smokeVert = /* glsl */ `
attribute vec4 aSmoke; // x size, y rotation speed, z seed, w opacity
uniform float uTime;
varying vec2 vUv; varying float vSeed; varying float vOp;
void main(){
  vUv = uv; vSeed = aSmoke.z; vOp = aSmoke.w;
  vec3 center = (modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.)).xyz;
  float a = uTime*aSmoke.y + aSmoke.z*6.28;
  vec2 c = mat2(cos(a),-sin(a),sin(a),cos(a)) * position.xy * aSmoke.x;
  vec4 mv = viewMatrix * vec4(center,1.);
  mv.xy += c;
  gl_Position = projectionMatrix * mv;
}`;
export const smokeFrag = /* glsl */ `
uniform vec3 uColA; uniform vec3 uColB; uniform float uDensity; uniform float uTime;
varying vec2 vUv; varying float vSeed; varying float vOp;
${NOISE}
void main(){
  vec2 q = vUv-.5;
  float r = length(q)*2.;
  float n = fbm(q*3. + vSeed*10. + vec2(uTime*.03, -uTime*.05));
  float a = smoothstep(1., .1, r) * smoothstep(.25,.8,n) * uDensity * vOp;
  vec3 col = mix(uColA, uColB, n);
  gl_FragColor = vec4(col*a, a*.6);
}`;

// LED screen: a VJ program behind an LED dot mask, with the party title on top.
export const ledFrag = /* glsl */ `
uniform float uTime; uniform float uProg; uniform float uBeat; uniform float uKick; uniform float uBass; uniform float uHigh;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform float uAspect; uniform float uIntensity; uniform float uDots;
uniform sampler2D uTitle; uniform float uTitleOn;
varying vec2 vUv;
${NOISE}
${VJ}
void main(){
  vec2 cells = vec2(uDots*uAspect, uDots);
  vec2 cuv = (floor(vUv*cells)+.5)/cells;
  vec3 col = vjProgram(uProg, cuv, uTime, uAspect, uBeat, uKick, uBass, uHigh, uC0, uC1, uC2);
  vec4 tt = texture2D(uTitle, cuv);
  col = mix(col, tt.rgb*1.6, tt.a*uTitleOn);
  vec2 f = fract(vUv*cells)-.5;
  float dotm = smoothstep(.5,.28,length(f));
  gl_FragColor = vec4(col*dotm*uIntensity + col*.08*uIntensity, 1.);
}`;
export const simpleVert = /* glsl */ `
varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;

// Sky dome (inside of a sphere). Three looks: canyon twilight, desert night with eclipse, nebula.
export const skyFrag = /* glsl */ `
uniform float uTime; uniform float uKind; uniform vec3 uC0; uniform vec3 uC1; uniform float uBass; uniform float uKick; uniform float uCorona;
uniform vec3 uSunDir;
varying vec2 vUv; varying vec3 vW;
${NOISE}
vec3 stars(vec3 d, float dens){
  vec2 uv = vec2(atan(d.z,d.x), asin(clamp(d.y,-1.,1.)))*vec2(120.,120.);
  vec2 id = floor(uv), f = fract(uv)-.5;
  float h = hash21(id);
  float s = step(1.-dens, h) * smoothstep(.12,0.,length(f)) * (.5+.5*sin(uTime*2.+h*60.));
  return vec3(s) * mix(vec3(.7,.8,1.), vec3(1.,.85,.7), hash21(id+3.));
}
void main(){
  vec3 d = normalize(vW - cameraPosition);
  float h = d.y;
  vec3 col;
  if (uKind < .5) { // twilight canyon: navy zenith → steel blue → warm band behind the stage
    vec3 zen = vec3(.035,.07,.2), mid = vec3(.14,.27,.62), hor = vec3(.9,.46,.24);
    float warm = pow(max(0., dot(normalize(vec3(d.x,0.,d.z)), normalize(vec3(uSunDir.x,0.,uSunDir.z)))), 3.);
    col = mix(mid, zen, smoothstep(.05,.6,h));
    col = mix(col, mix(vec3(.26,.32,.6), hor, warm), smoothstep(.28,0.,h));
    col += stars(d, .006)*smoothstep(.15,.5,h)*.8;
    float cl = fbm(vec2(d.x,d.z)/(h+.25)*2.+uTime*.01);
    col = mix(col, col*.6+vec3(.09,.08,.12), smoothstep(.55,.8,cl)*smoothstep(.05,.3,h)*.6);
  } else if (uKind < 1.5) { // desert night + eclipse with a living corona
    col = mix(vec3(.01,.012,.03), vec3(.04,.05,.09), smoothstep(.4,-.05,h));
    col += stars(d, .02)*smoothstep(0.,.3,h);
    float band = exp(-pow(dot(d, normalize(vec3(.3,.5,.8))) * 4.,2.));
    col += vec3(.06,.05,.09)*band*fbm(d.xz*6.)*smoothstep(0.,.2,h);
    vec3 sd = normalize(uSunDir);
    float ang = acos(clamp(dot(d, sd),-1.,1.));
    float R = .085;
    vec3 side = normalize(cross(sd, vec3(0.,1.,0.))); vec3 upv = cross(side, sd);
    float th = atan(dot(d,upv), dot(d,side));
    float streams = fbm(vec2(th*3., ang*30.-uTime*.2)) * (1.+uBass*.8);
    float corona = exp(-(ang-R)*42./(1.+uCorona)) * step(R, ang) * (.35+streams*.9);
    col += mix(uC0, vec3(1.,.95,.85), .35) * corona * .75;
    col += uC1 * exp(-(ang-R)*9.) * step(R,ang) * .12;
    col = mix(col, vec3(0.), step(ang, R));
    col += vec3(1.,.97,.9) * exp(-pow((ang-R)*520.,2.)) * (.45 + uKick*.8);
  } else { // nebula
    vec2 q = vec2(atan(d.z,d.x), d.y*1.6);
    float n = fbm(q*1.6 + uTime*.004);
    float n2 = fbm(q*3.1 - 4. + uTime*.006);
    col = vec3(.005,.004,.02);
    col += uC0 * pow(n,3.)*1.4 + uC1 * pow(n2,4.)*1.6;
    col += stars(d, .03);
  }
  gl_FragColor = vec4(col, 1.);
}`;

export const fullVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

// Final pass (display space): mirror/kaleido, glitch, chroma, transitions, VJ layer, titles, grade, grain.
export const finalFrag = /* glsl */ `
uniform sampler2D tDiffuse; uniform sampler2D tPrev; uniform sampler2D tOverlay; uniform sampler2D tWord;
uniform float uTime; uniform vec2 uRes; uniform float uAspect;
uniform float uTrans; uniform float uTransType;
uniform float uBeat; uniform float uKick; uniform float uBass; uniform float uHigh;
uniform float uChroma; uniform float uGrain; uniform float uVignette; uniform float uGlitch;
uniform float uExposure; uniform float uContrast; uniform float uSat; uniform float uHue;
uniform float uFlash; uniform float uBlack; uniform float uLetterbox; uniform float uMirror; uniform float uZoom;
uniform float uVJ; uniform float uVJOpacity; uniform float uVJBlend;
uniform float uOverlay; uniform float uWord; uniform float uWordScale; uniform float uWordY;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;
varying vec2 vUv;
${NOISE}
${VJ}
vec2 mirrorUV(vec2 uv){
  if (uMirror < .5) return uv;
  if (uMirror < 1.5) { uv.x = .5 - abs(uv.x-.5); return uv; }
  if (uMirror < 2.5) { uv.y = .5 + abs(uv.y-.5); return uv; }
  if (uMirror < 3.5) { return .5 - abs(uv-.5) + .25; }
  vec2 p = (uv-.5)*vec2(uAspect,1.);
  float r = length(p), a = atan(p.y,p.x) + uTime*.08;
  float seg = 6.2831/6.; a = mod(a,seg); a = abs(a-seg*.5);
  p = r*vec2(cos(a),sin(a));
  return p/vec2(uAspect,1.)+.5;
}
vec3 scene(sampler2D t, vec2 uv, float ca){
  vec2 d = (uv-.5)*ca;
  return vec3(texture2D(t, uv+d).r, texture2D(t, uv).g, texture2D(t, uv-d).b);
}
vec3 blurDir(sampler2D t, vec2 uv, vec2 dir){
  vec3 s = vec3(0.);
  for (int i=0;i<10;i++){ float k = float(i)/9.-.5; s += texture2D(t, uv + dir*k).rgb; }
  return s/10.;
}
vec3 hueRot(vec3 c, float a){
  const vec3 k = vec3(.57735);
  float ca = cos(a);
  return c*ca + cross(k,c)*sin(a) + k*dot(k,c)*(1.-ca);
}
void main(){
  vec2 uv = (vUv-.5)/(1.+uZoom)+.5;
  uv = mirrorUV(uv);
  if (uGlitch > 0.) {
    float tt = floor(uTime*18.);
    float blk = floor(uv.y*22.) + tt*7.;
    if (hash11(blk) < uGlitch*.45) uv.x += (hash11(blk*1.7)-.5)*.18*uGlitch;
    if (hash11(tt+3.) < uGlitch*.2) uv.y += (hash11(tt)-.5)*.05;
  }
  float ca = uChroma*.012*(1.+uKick*1.2) + uGlitch*.025;
  vec3 col = scene(tDiffuse, uv, ca);

  if (uTrans < 1.) {
    float t = uTrans;
    vec3 old = scene(tPrev, uv, ca);
    if (uTransType < 1.5) { col = mix(old, col, smoothstep(0.,1.,t)); }
    else if (uTransType < 2.5) { float w = pow(1.-abs(t-.18)/.82, 3.); col = mix(old, col, step(.18,t)) + vec3(1.)*max(0.,w)*1.4; }
    else if (uTransType < 3.5) { // whip pan
      float s = sin(3.14159*t)*.14;
      col = t < .5 ? blurDir(tPrev, uv + vec2(t*.6,0.), vec2(s,0.)) : blurDir(tDiffuse, uv - vec2((1.-t)*.6,0.), vec2(s,0.));
    }
    else if (uTransType < 4.5) { // glitch blocks
      vec2 b = floor(uv*vec2(16.,9.)); float h = hash21(b + floor(t*12.));
      vec3 o2 = vec3(texture2D(tPrev, uv+vec2(.02,0.)).r, old.g, texture2D(tPrev, uv-vec2(.02,0.)).b);
      col = h < t ? col : o2;
    }
    else if (uTransType < 5.5) { // iris with a light ring
      float r = length((vUv-.5)*vec2(uAspect,1.)); float R = t*1.2;
      col = mix(col, old, smoothstep(R-.02, R+.02, r)) + uC0*smoothstep(.03,0.,abs(r-R))*2.*(1.-t);
    }
    else if (uTransType < 6.5) { // zoom through
      vec2 zo = (vUv-.5)/(1.+t*2.5)+.5; vec2 zi = (vUv-.5)*(1.+(1.-t)*.6)+.5;
      vec3 a = blurDir(tPrev, zo, (zo-.5)*t*.25), b = texture2D(tDiffuse, zi).rgb;
      col = mix(a, b, smoothstep(.35,.85,t));
    }
    else if (uTransType < 7.5) { // slices
      float row = floor(vUv.y*12.); float dir = mod(row,2.)*2.-1.;
      float o = clamp(t*1.6 - hash11(row)*.6, 0., 1.);
      vec2 su = vUv + vec2(dir*o,0.);
      col = (su.x < 0. || su.x > 1.) ? col : texture2D(tPrev, su).rgb;
    }
    else if (uTransType < 8.5) { // luma key: the bright parts of the new picture arrive first
      float l = dot(col, vec3(.3,.59,.11));
      col = mix(old, col, smoothstep(1.-t*1.2, 1.15-t*1.2, l + t*.3));
    }
    else { // pixel dissolve
      float px = mix(4., 90., sin(3.14159*t));
      vec2 q = floor(vUv*uRes/px)*px/uRes + px/uRes*.5;
      col = mix(texture2D(tPrev,q).rgb, texture2D(tDiffuse,q).rgb, step(.5,t));
    }
  }

  if (uVJOpacity > 0.) {
    vec3 v = vjProgram(uVJ, vUv, uTime, uAspect, uBeat, uKick, uBass, uHigh, uC0, uC1, uC2) * uVJOpacity;
    if (uVJBlend < .5) col = col + v;
    else if (uVJBlend < 1.5) col = 1. - (1.-col)*(1.-clamp(v,0.,1.));
    else if (uVJBlend < 2.5) col = mix(col, col*clamp(v*2.,0.,1.), uVJOpacity);
    else col = abs(col - v);
  }

  col *= uExposure;
  col = (col - .5)*uContrast + .5;
  float l = dot(col, vec3(.2126,.7152,.0722));
  col = mix(vec3(l), col, uSat);
  if (abs(uHue) > .001) col = hueRot(col, uHue);

  vec4 ov = texture2D(tOverlay, vUv);
  col = mix(col, ov.rgb, ov.a*uOverlay);
  vec2 wbox = vec2(.26*(1600./600.)/uAspect, .26) * max(.01,uWordScale);
  vec2 wq = (vUv-vec2(.5,uWordY))/wbox+.5;
  vec4 wd = texture2D(tWord, wq) * step(0., wq.x)*step(wq.x,1.)*step(0.,wq.y)*step(wq.y,1.);
  col = mix(col, wd.rgb, wd.a*uWord);

  col += vec3(1.)*uFlash;
  col *= 1.-uBlack;
  vec2 vq = vUv-.5;
  col *= 1. - uVignette*smoothstep(.35,.95,length(vq*vec2(uAspect*.75,1.)));
  col += (hash21(vUv*uRes + fract(uTime*7.)*100.)-.5)*uGrain*.12;
  float lb = uLetterbox*.12;
  col *= step(lb, vUv.y)*step(vUv.y, 1.-lb);
  gl_FragColor = vec4(clamp(col,0.,1.), 1.);
}`;
