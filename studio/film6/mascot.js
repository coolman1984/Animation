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
uniform vec3 u_c[10]; // ink/paper pairs: skin, hair, shirt, tarboosh, tassel

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

// Character «ابن البلد»: returns (distance, material). 1 skin, 2 hair + moustache, 3 shirt, 7 tarboosh, 8 tassel.
float sdConeY(vec3 p,float h,float r1,float r2){vec2 q=vec2(length(p.xz),p.y);vec2 k1=vec2(r2,h),k2=vec2(r2-r1,2.*h);
  vec2 ca=vec2(q.x-min(q.x,(q.y<0.)?r1:r2),abs(q.y)-h);vec2 cb=q-k1+k2*clamp(dot(k1-q,k2)/dot(k2,k2),0.,1.);
  float s=(cb.x<0.&&ca.y<0.)?-1.:1.;return s*sqrt(min(dot(ca,ca),dot(cb,cb)));}
vec2 mapChar(vec3 p){
  vec3 pb=bodyM()*p;
  float body=sdEll(pb-vec3(0.,-1.42,-.08),vec3(1.85,1.22,1.02));
  body=smin(body,sdTorus(pb-vec3(0.,-.22,0.),vec2(.38,.12)),.10);
  vec2 r=vec2(body,3.);
  float neck=sdCap(pb,vec3(0.,-.4,0.),vec3(0.,.3,0.),.31);
  if(neck<r.x)r=vec2(neck,1.);
  vec3 q=headM()*(pb-PIVOT)-HC;
  float head=sdEll(q,vec3(1.,.96,.92));
  head=smin(head,length(q-vec3(.97,-.06,-.05))-.20,.08);
  head=smin(head,length(q-vec3(-.97,-.06,-.05))-.20,.08);
  head=smin(head,length(q-vec3(.40,-.30,.52))-.38,.20);
  head=smin(head,length(q-vec3(-.40,-.30,.52))-.38,.20);
  head=smin(head,sdEll(q-vec3(0.,-.05,.90),vec3(.17,.21,.17)),.06);
  if(head<r.x)r=vec2(head,1.);
  // short dark hair below the tarboosh (sides and back) + sideburns
  float hair=1e5;
  for(int i=0;i<14;i++){
    float a=1.45+float(i)/13.*3.38;
    vec3 c=vec3(sin(a)*.90,.36+.05*sin(3.*a),cos(a)*.86);
    hair=smin(hair,length(q-c)-.21,.10);
  }
  hair=smin(hair,sdEll(q-vec3(.90,.08,.22),vec3(.10,.26,.14)),.06);
  hair=smin(hair,sdEll(q-vec3(-.90,.08,.22),vec3(.10,.26,.14)),.06);
  // the moustache: two full lobes drooping outwards
  vec3 m1=rotZ(.30)*(q-vec3(.19,-.31,.90)), m2=rotZ(-.30)*(q-vec3(-.19,-.31,.90));
  float mou=smin(sdEll(m1,vec3(.22,.085,.10)),sdEll(m2,vec3(.22,.085,.10)),.05);
  hair=min(hair,mou);
  hair+=.012*sin(30.*q.x)*sin(28.*q.y);
  if(hair<r.x)r=vec2(hair,2.);
  // tarboosh, tilted a little back, with a black tassel falling behind
  vec3 tq=rotX(.14)*(q-vec3(0.,.60,-.04));
  float hat=sdConeY(tq-vec3(0.,.40,0.),.40,.80,.60)-.035;
  if(hat<r.x)r=vec2(hat,7.);
  float tas=min(sdCap(tq,vec3(0.,.84,0.),vec3(-.58,.86,.02),.05),sdCap(tq,vec3(-.58,.86,.02),vec3(-.90,.40,.08),.05));
  tas=min(tas,sdEll(tq-vec3(-.93,.22,.08),vec3(.11,.22,.11)));
  if(tas<r.x)r=vec2(tas,8.);
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
    vec2 c=vec2(side*.33,.15)+u_look*vec2(.07,.05);
    vec2 d=(f-c)/vec2(.115,.165*max(open,.02));
    if(open>.12&&dot(d,d)<1.){ink=1.; vec2 g=(f-c-vec2(.038,.058*open))/.046; if(dot(g,g)<1.)glint=1.;}
    float closed=1.-smoothstep(.05,.25,open);
    float arc=abs(length((f-c-vec2(0.,-.08))/vec2(1.,.75))-.12);
    if(closed>.5&&arc<.03&&f.y>c.y-.07)ink=1.;
    // arched, thick brows
    float bx=(f.x-side*.33)/.17, by=.42+u_brow*.08-(s==0?u_wink*.05:0.)+.05*(1.-bx*bx);
    if(abs(bx)<1.&&abs(f.y-by)<.05)ink=1.;
  }
  float x=f.x/.25;
  float yu=-.47+u_smile*.10*x*x;
  if(abs(f.x)<.25){
    float lower=yu-.03-u_open*.20*(1.-x*x);
    if(f.y<yu+.022&&f.y>lower){ink=1.; if(u_open>.15&&f.y>yu-.06&&abs(f.x)<.18)glint=1.;}
  }
  return ink;
}
float placket(vec3 pb){ // galabeya neck opening: a short centre seam with two buttons
  if(pb.z<.3)return 0.; vec2 f=pb.xy;
  if(abs(f.x)<.022&&f.y<-.36&&f.y>-1.05)return 1.;
  if(length(f-vec2(.07,-.58))<.045||length(f-vec2(.07,-.84))<.045)return 1.;
  return 0.;
}
float chestMark(vec3 pb){ // the "+" pin, body-local
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
  float alb=m.y<1.5?.98:m.y<2.5?.42:m.y<3.5?.86:m.y<5.5?.95:m.y<6.5?.30:m.y<7.5?.80:.30;
  float lum=m.y<1.5?alb*(.42+.75*dif)*mix(1.,ao,.6)+spec:alb*(.18+.95*dif)*ao+spec;
  lum*=1.-(m.y<1.5?.42:.55)*edge;
  float ink=0., glint=0.;
  if(u_scene<.5){
    vec3 pb=bodyM()*p;
    if(m.y<1.5&&pb.y>.2){vec3 q=headM()*(pb-PIVOT)-HC; ink=face(q,glint);}
    if(m.y>2.5&&m.y<3.5)ink=max(chestMark(pb),placket(pb));
  }
  lum=pow(clamp(lum,0.,1.),m.y<1.5?u_gamma*.8:u_gamma);
  if(u_scene<.5&&m.y>2.5&&m.y<3.5)lum=min(lum,.9); // the shirt keeps a few dots on its lit side: outline never dissolves into a white background
  float on=lum<bayer8(px)?1.:0.;
  vec3 inkC=u_ink, papC=u_paper;
  if(u_scene<.5){int k=m.y<1.5?0:m.y<2.5?1:m.y<3.5?2:m.y<7.5?3:4; inkC=u_c[k*2]; papC=u_c[k*2+1];}
  if(ink>.5){on=1.; inkC=u_c[2];}
  if(glint>.5){on=0.; papC=vec3(1.);}
  o=vec4(mix(papC,inkC,on),1.);
}`;

export const MASCOT_FRAG = FRAG;

// mascotLayer(parent, { w, h, cell, z, ink, paper }) → { canvas, render(t, pose) }
// pose: { x, y (canvas uv of the neck, y up), size (head radius / canvas height), yaw, pitch, roll,
// bodyYaw, lean, blink, wink, smile, open, brow, look:[x,y], gamma, scene (0 mascot, 1–3 objects), spin, light }
export const EGYPT_PALETTE = ['#6B3A20', '#E8B184', '#120C0A', '#4A3328', '#1B1B1F', '#FFFFFF', '#6A0C12', '#D7262E', '#0B0B0C', '#2A2A2E'];
export function mascotLayer(parent, { w, h, cell = 4, z = 10, ink = '#0B0B0C', paper = '#FFFFFF', style = {}, palette = EGYPT_PALETTE } = {}) {
  const layer = shaderLayer(parent, { w, h, fragment: FRAG, scale: 1 / cell, z });
  Object.assign(layer.canvas.style, { imageRendering: 'pixelated' }, style);
  const cache = new Map(), col = hex => { if (!cache.has(hex)) cache.set(hex, rgb(hex)); return cache.get(hex); };
  // ink/paper pairs per material: skin, hair + moustache + face decals, shirt, tarboosh, tassel
  const pal = palette.flatMap(col);
  return {
    canvas: layer.canvas, ready: layer.ready,
    render(t, pose = {}, opts = {}) {
      const P = { x: 0.5, y: 0.3, size: 0.12, yaw: 0, pitch: 0, roll: 0, bodyYaw: 0, lean: 0, blink: 0, wink: 0, smile: 0.5, open: 0,
        brow: 0, look: [0, 0], gamma: 1, glasses: 0, scene: 0, spin: 0, light: 1, ...pose };
      layer.render(t, { u_pos: [P.x, P.y], u_size: P.size, u_yaw: P.yaw, u_pitch: P.pitch, u_roll: P.roll, u_bodyYaw: P.bodyYaw,
        u_lean: P.lean, u_blink: P.blink, u_wink: P.wink, u_smile: P.smile, u_open: P.open, u_brow: P.brow, u_look: P.look,
        u_ink: col(P.ink || ink), u_paper: col(P.paper || paper), u_gamma: P.gamma, u_scene: P.scene, u_spin: P.spin, u_light: P.light, u_glasses: P.glasses, u_c: pal }, opts);
    },
  };
}
