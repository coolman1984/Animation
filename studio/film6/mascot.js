// PIXEL Plus mascot and object "clay" renders: a ray-marched signed-distance model shaded with one key
// light, then ordered-dithered (Bayer 8×8) to two inks on a LOW-RES canvas shown with nearest-neighbour
// scaling. Every dither cell is one visible square "pixel" locked to the screen grid — the agency's name
// is the motif. Pure in t: every pose value arrives as a uniform; nothing animates on its own.
// Needs config.gpu = true (SwiftShader WebGL2 in the studio renderer).
import { shaderLayer, rgb } from '../lib/gpu.js';

const FRAG = `
uniform vec2 u_pos; uniform float u_size;
uniform float u_yaw; uniform float u_pitch; uniform float u_roll; uniform float u_bodyYaw; uniform float u_lean;
uniform float u_blink; uniform float u_wink; uniform float u_smile; uniform float u_open; uniform float u_brow;
uniform vec2 u_look; uniform vec3 u_ink; uniform vec3 u_paper; uniform float u_gamma; uniform float u_scene; uniform float u_spin;
uniform float u_light; uniform float u_glasses;

mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0., -s,c,0., 0.,0.,1.);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdEll(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/max(k1,1e-4);}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float sdRBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float sdCyl(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.yz),p.x))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}
float sdCone(vec3 p,float h,float r1,float r2){vec2 q=vec2(length(p.yz),p.x);vec2 k1=vec2(r2,h),k2=vec2(r2-r1,2.*h);
  vec2 ca=vec2(q.x-min(q.x,(q.y<0.)?r1:r2),abs(q.y)-h);vec2 cb=q-k1+k2*clamp(dot(k1-q,k2)/dot(k2,k2),0.,1.);
  float s=(cb.x<0.&&ca.y<0.)?-1.:1.;return s*sqrt(min(dot(ca,ca),dot(cb,cb)));}

const vec3 PIVOT=vec3(0.,.05,0.); const vec3 HC=vec3(0.,.98,0.);
mat3 headM(){return rotZ(-u_roll)*rotX(-u_pitch)*rotY(-u_yaw);}   // world -> head local
mat3 bodyM(){return rotZ(-u_lean)*rotY(-u_bodyYaw);}

// Character: returns (distance, material). 1 skin, 2 hair, 3 sweater.
vec2 mapChar(vec3 p){
  vec3 pb=bodyM()*p;
  float body=sdEll(pb-vec3(0.,-1.42,-.08),vec3(1.85,1.22,1.02));
  body=smin(body,sdTorus(pb-vec3(0.,-.22,0.),vec2(.38,.12)),.10);
  vec2 r=vec2(body,3.);
  float neck=sdCap(pb,vec3(0.,-.4,0.),vec3(0.,.3,0.),.31);
  if(neck<r.x)r=vec2(neck,1.);
  vec3 q=headM()*(pb-PIVOT)-HC;
  float head=sdEll(q,vec3(1.,.98,.92));
  head=smin(head,length(q-vec3(.96,-.08,-.05))-.19,.08);
  head=smin(head,length(q-vec3(-.96,-.08,-.05))-.19,.08);
  head=smin(head,length(q-vec3(0.,-.10,.92))-.15,.06);
  if(head<r.x)r=vec2(head,1.);
  float hair=1e5;
  for(int i=0;i<34;i++){
    float t=(float(i)+.5)/34.;
    float y=1.-t*1.30; float rr=sqrt(max(0.,1.-y*y)); float ph=float(i)*2.39996+.6;
    vec3 d=vec3(rr*cos(ph),y,rr*sin(ph));
    if(d.z>.25&&d.y<.50)continue;
    if(d.y<.12&&d.z>-.45)continue;
    float rad=.29+.06*fract(sin(float(i)*12.9898)*43758.5453);
    hair=smin(hair,length(q-d*vec3(1.0,1.0,.96))-rad,.09);
  }
  hair+=.024*sin(14.*q.x+1.)*sin(13.*q.y)*sin(15.*q.z+2.);
  if(hair<r.x)r=vec2(hair,2.);
  return r;
}

// Service objects for the cards: 1 megaphone, 2 motion shapes, 3 cinema camera. Material 5 light, 6 dark.
vec2 mapObj(vec3 p){
  p=rotY(-u_spin)*rotX(-.35)*p;
  vec2 r=vec2(1e5,5.);
  if(u_scene<1.5){
    float cone=sdCone(p-vec3(.25,0.,0.),.75,.30,.78)-.03;
    float bell=sdTorus(rotZ(1.5708)*(p-vec3(1.0,0.,0.)),vec2(.78,.06));
    float back=sdCyl(p-vec3(-.62,0.,0.),.34,.16)-.03;
    float handle=sdCap(p,vec3(-.2,-.25,0.),vec3(-.35,-.95,0.),.13);
    r=vec2(min(cone,bell),5.); float d2=min(back,handle); if(d2<r.x)r=vec2(d2,6.);
  }else if(u_scene<2.5){
    float tor=sdTorus(rotX(1.2)*(p-vec3(-.55,.45,0.)),vec2(.42,.15));
    float sph=length(p-vec3(.55,.55,.1))-.42;
    float box=sdRBox(rotY(.6)*rotZ(.3)*(p-vec3(0.,-.55,0.)),vec3(.45),.08);
    r=vec2(min(tor,box),5.); if(sph<r.x)r=vec2(sph,6.);
  }else{
    float bodyc=sdRBox(p,vec3(.75,.48,.42),.08);
    float lens=sdCyl(rotY(1.5708)*(p-vec3(0.,0.,.62)),.30,.24)-.02;
    float reel1=sdCyl(rotY(1.5708)*(p-vec3(-.38,.80,0.)),.40,.08);
    float reel2=sdCyl(rotY(1.5708)*(p-vec3(.42,.78,0.)),.34,.08);
    r=vec2(bodyc,5.); float d2=min(lens,min(reel1,reel2)); if(d2<r.x)r=vec2(d2,6.);
  }
  return r;
}

vec2 mapAll(vec3 p){return u_scene<.5?mapChar(p):mapObj(p);}
vec3 nrm(vec3 p){vec2 e=vec2(.004,-.004);
  return normalize(e.xyy*mapAll(p+e.xyy).x+e.yyx*mapAll(p+e.yyx).x+e.yxy*mapAll(p+e.yxy).x+e.xxx*mapAll(p+e.xxx).x);}

float bayer8(vec2 f){ivec2 c=ivec2(mod(f,8.));int x=c.x,y=c.y;
  int v=0; int xr=x^y;
  v=((xr&1)<<5)|((x&1)<<4)|(((xr>>1)&1)<<3)|(((x>>1)&1)<<2)|(((xr>>2)&1)<<1)|((x>>2)&1);
  return (float(v)+.5)/64.;}

// Face decals in head-local space: returns ink amount 0..1 (1 = feature ink, 2 = glint as negative).
float face(vec3 q, out float glint){
  glint=0.; if(q.z<.35)return 0.;
  float ink=0.; vec2 f=q.xy;
  for(int s=0;s<2;s++){
    float side=s==0?-1.:1.;
    float open=(1.-u_blink)*(s==0?(1.-u_wink):1.);
    vec2 c=vec2(side*.34,.12)+u_look*vec2(.07,.05);
    vec2 d=(f-c)/vec2(.12,.17*max(open,.02));
    if(open>.12&&dot(d,d)<1.){ink=1.; vec2 g=(f-c-vec2(.04,.06*open))/.048; if(dot(g,g)<1.)glint=1.;}
    float closed=1.-smoothstep(.05,.25,open);
    float arc=abs(length((f-c-vec2(0.,-.08))/vec2(1.,.75))-.12);
    if(closed>.5&&arc<.03&&f.y>c.y-.07)ink=1.;
    if(u_glasses>.5){vec2 gc=vec2(side*.34,.12); float ring=abs(length((f-gc)/vec2(.23,.21))-1.);
      if(ring<.11)ink=1.; if(s==0&&abs(f.y-.16)<.028&&abs(f.x)<.12)ink=1.;}
    vec2 b0=vec2(side*.18,.43+u_brow*.08-(s==0?u_wink*.05:0.)),b1=vec2(side*.47,.44+u_brow*.09);
    if(u_glasses>.5){b0.y+=.08;b1.y+=.08;}
    vec2 pa=f-b0,ba=b1-b0; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
    if(length(pa-ba*h)<.05)ink=1.;
  }
  float x=f.x/.28;
  float yu=-.40+u_smile*.12*x*x;
  if(abs(f.x)<.28){
    float lower=yu-u_open*.22*(1.-x*x)-.03;
    if(f.y<yu+.026&&f.y>lower)ink=1.;
  }
  return ink;
}
float chestMark(vec3 pb){ // the "+" patch on the sweater, body-local
  if(pb.z<.3)return 0.; vec2 f=pb.xy-vec2(-.70,-.98);
  vec2 a=abs(f); float sq=max(a.x,a.y);
  if(abs(sq-.22)<.03)return 1.;
  if((a.x<.04&&a.y<.13)||(a.y<.04&&a.x<.13))return 1.;
  return 0.;
}

void main(){
  vec2 px=gl_FragCoord.xy; float asp=u_res.x/u_res.y;
  vec2 s=(uv-u_pos)*vec2(asp,1.)/u_size;
  vec3 ro=vec3(0.,0.,9.), rd=normalize(vec3(s,0.)-ro);
  vec3 bc=u_scene<.5?vec3(0.,.15,0.):vec3(0.);float br=u_scene<.5?3.1:1.6;
  vec3 oc=ro-bc; float b=dot(oc,rd), c=dot(oc,oc)-br*br, h=b*b-c;
  if(h<0.){o=vec4(0.);return;}
  float t=max(-b-sqrt(h),0.), tmax=-b+sqrt(h); vec2 m=vec2(0.); bool hit=false;
  for(int i=0;i<90;i++){vec3 p=ro+rd*t; m=mapAll(p); if(m.x<.0015*t){hit=true;break;} t+=m.x*.9; if(t>tmax)break;}
  if(!hit){o=vec4(0.);return;}
  vec3 p=ro+rd*t, n=nrm(p);
  vec3 L=normalize(vec3(-.55*u_light,.75,.65)); float dif=clamp((dot(n,L)+.25)/1.25,0.,1.);
  float ao=clamp(.45+mapAll(p+n*.18).x/.18*.55,0.,1.);
  float edge=pow(1.-clamp(dot(n,-rd),0.,1.),2.4);
  float spec=pow(clamp(dot(reflect(rd,n),L),0.,1.),24.)*.35;
  float alb=m.y<1.5?.98:m.y<2.5?.42:m.y<3.5?.66:m.y<4.5?.18:m.y<5.5?.95:.30;
  float lum=m.y<1.5?alb*(.42+.75*dif)*mix(1.,ao,.6)+spec:alb*(.18+.95*dif)*ao+spec;
  lum*=1.-(m.y<1.5?.42:.55)*edge;
  float ink=0., glint=0.;
  if(u_scene<.5){
    vec3 pb=bodyM()*p;
    if(m.y<1.5&&pb.y>.2){vec3 q=headM()*(pb-PIVOT)-HC; ink=face(q,glint);}
    if(m.y>2.5&&m.y<3.5)ink=chestMark(pb);
  }
  lum=pow(clamp(lum,0.,1.),m.y<1.5?u_gamma*.75:u_gamma);
  float on=lum<bayer8(px)?1.:0.;
  if(ink>.5)on=1.; if(glint>.5)on=0.;
  o=vec4(mix(u_paper,u_ink,on),1.);
}`;

export const MASCOT_FRAG = FRAG;

// mascotLayer(parent, { w, h, cell, z, ink, paper }) → { canvas, render(t, pose) }
// pose: { x, y (canvas uv of the neck, y up), size (head radius / canvas height), yaw, pitch, roll,
// bodyYaw, lean, blink, wink, smile, open, brow, look:[x,y], gamma, scene (0 mascot, 1–3 objects), spin, light }
export function mascotLayer(parent, { w, h, cell = 4, z = 10, ink = '#0B0B0C', paper = '#FFFFFF', style = {} } = {}) {
  const layer = shaderLayer(parent, { w, h, fragment: FRAG, scale: 1 / cell, z });
  Object.assign(layer.canvas.style, { imageRendering: 'pixelated' }, style);
  const cache = new Map(), col = hex => { if (!cache.has(hex)) cache.set(hex, rgb(hex)); return cache.get(hex); };
  return {
    canvas: layer.canvas, ready: layer.ready,
    render(t, pose = {}, opts = {}) {
      const P = { x: 0.5, y: 0.3, size: 0.12, yaw: 0, pitch: 0, roll: 0, bodyYaw: 0, lean: 0, blink: 0, wink: 0, smile: 0.5, open: 0,
        brow: 0, look: [0, 0], gamma: 1, glasses: 0, scene: 0, spin: 0, light: 1, ...pose };
      layer.render(t, { u_pos: [P.x, P.y], u_size: P.size, u_yaw: P.yaw, u_pitch: P.pitch, u_roll: P.roll, u_bodyYaw: P.bodyYaw,
        u_lean: P.lean, u_blink: P.blink, u_wink: P.wink, u_smile: P.smile, u_open: P.open, u_brow: P.brow, u_look: P.look,
        u_ink: col(P.ink || ink), u_paper: col(P.paper || paper), u_gamma: P.gamma, u_scene: P.scene, u_spin: P.spin, u_light: P.light, u_glasses: P.glasses }, opts);
    },
  };
}
