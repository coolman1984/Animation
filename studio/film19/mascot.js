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
uniform float u_light; uniform float u_blush; uniform float u_bounce; uniform float u_shadow; uniform float u_stride;
uniform vec2 u_armL; uniform vec2 u_armR; // (shoulder angle, forearm angle): 0 hangs down, pi points up
uniform vec3 u_c[10]; // ink/paper pairs: skin, hair + face ink, hoodie, jeans, shoes

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

const vec3 PIVOT=vec3(0.,.05,0.); const vec3 HC=vec3(0.,.98,0.); const vec3 HIP=vec3(0.,-1.7,0.);
mat3 headM(){return rotZ(-u_roll)*rotX(-u_pitch)*rotY(-u_yaw);}   // world -> head local
mat3 bodyM(){return rotZ(-u_lean)*rotY(-u_bodyYaw);}   // turns / leans the whole body about the hips
vec3 toBody(vec3 p){p.y-=u_bounce;return bodyM()*(p-HIP)+HIP;}

// Character: a cute young person, full body, chibi proportions (head ≈ 2 of 5 units tall).
// Materials: 1 skin, 2 hair, 3 hoodie, 4 jeans, 7 trainers, 8 soles. Origin = the neck; feet at y ≈ -3.
float armSdf(vec3 pb,float side,vec2 a,out float hand){
  vec3 S=vec3(side*.84,-.62,0.);
  vec3 d1=vec3(side*sin(a.x),-cos(a.x),0.), d2=vec3(side*sin(a.y),-cos(a.y),0.);
  vec3 E=S+.62*d1, W=E+.56*d2;
  hand=length(pb-(W+.12*d2))-.26;
  return smin(sdCap(pb,S,E,.25),sdCap(pb,E,W,.21),.08);
}
float hairSdf(vec3 q){
  float ell=sdEll(q-vec3(0.,.05,-.06),vec3(1.09,1.06,1.0));
  float hl=.60-.62*q.x*q.x-.85*max(-q.z,0.);                 // hairline: low at the sides and the nape
  float d=max(ell,hl-q.y);
  for(int i=0;i<5;i++){float x=(float(i)-2.)*.36; d=smin(d,length(q-vec3(x,.64-.05*abs(x),.80-.10*x*x))-.23,.12);}   // fringe bumps
  d=smin(d,length(q-vec3(.12,1.02,.08))-.30,.14);
  d=smin(d,length(q-vec3(.38,1.06,-.08))-.24,.12);
  return d;
}
vec2 mapChar(vec3 p){
  vec3 pb=toBody(p);
  float torso=smin(sdEll(pb-vec3(0.,-1.02,0.),vec3(.88,.82,.64)),sdEll(pb-vec3(0.,-1.62,0.),vec3(.82,.42,.60)),.25);
  vec2 r=vec2(torso,3.);
  float neck=sdCap(pb,vec3(0.,-.5,0.),vec3(0.,.12,0.),.30);
  if(neck<r.x)r=vec2(neck,1.);
  float hand;
  for(int i=0;i<2;i++){
    float side=i==0?-1.:1.; vec2 a=i==0?u_armL:u_armR;
    float arm=armSdf(pb,side,a,hand);
    if(arm<r.x)r=vec2(arm,3.);
    if(hand<r.x)r=vec2(hand,1.);
    vec3 hip=vec3(side*.36,-1.75,0.);
    float fwd=side*u_stride;
    vec3 ank=vec3(side*.38,-2.62+.2*max(0.,fwd),.42*fwd);
    float leg=sdCap(pb,hip,ank,.31);
    if(leg<r.x)r=vec2(leg,4.);
    float shoe=sdEll(pb-ank-vec3(0.,-.16,.24),vec3(.37,.22,.56));
    if(shoe<r.x)r=vec2(shoe,7.);
    float sole=sdEll(pb-ank-vec3(0.,-.34,.22),vec3(.38,.08,.58));
    if(sole<r.x)r=vec2(sole,8.);
  }
  vec3 q=headM()*(pb-PIVOT)-HC;
  float head=sdEll(q,vec3(1.05,.96,.94));
  head=smin(head,length(q-vec3(1.0,-.06,-.05))-.20,.08);
  head=smin(head,length(q-vec3(-1.0,-.06,-.05))-.20,.08);
  head=smin(head,length(q-vec3(.46,-.30,.50))-.40,.22);
  head=smin(head,length(q-vec3(-.46,-.30,.50))-.40,.22);
  head=smin(head,sdEll(q-vec3(0.,-.10,.92),vec3(.10,.11,.09)),.05);
  if(head<r.x)r=vec2(head,1.);
  float hair=hairSdf(q);
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

// Face decals in head-local space: ink amount 0/1, glint (eye highlights, teeth) and blush (rosy cheeks).
float face(vec3 q, out float glint, out float blush){
  glint=0.; blush=0.; if(q.z<.35)return 0.;
  float ink=0.; vec2 f=q.xy;
  for(int s=0;s<2;s++){
    float side=s==0?-1.:1.;
    float open=(1.-u_blink)*(s==0?(1.-u_wink):1.);
    vec2 c=vec2(side*.37,.07)+u_look*vec2(.07,.05);
    vec2 d=(f-c)/vec2(.155,.215*max(open,.02));
    if(open>.12&&dot(d,d)<1.){ink=1.;
      vec2 g=(f-c-vec2(.055,.08*open))/.062; if(dot(g,g)<1.)glint=1.;
      vec2 g2=(f-c-vec2(-.06,-.09*open))/.028; if(dot(g2,g2)<1.)glint=1.;}
    float closed=1.-smoothstep(.05,.25,open);
    float arc=abs(length((f-c-vec2(0.,-.08))/vec2(1.,.75))-.14);
    if(closed>.5&&arc<.032&&f.y>c.y-.08)ink=1.;
    float bx=(f.x-side*.40)/.17, by=.42+u_brow*.09-(s==0?u_wink*.05:0.)+.045*(1.-bx*bx);
    if(abs(bx)<1.&&abs(f.y-by)<.034)ink=1.;
    vec2 bq=(f-vec2(side*.66,-.20))/vec2(.17,.105); if(dot(bq,bq)<1.)blush=u_blush;
  }
  float x=f.x/.25;
  float yu=-.38+u_smile*.11*x*x;
  if(abs(f.x)<.25){
    float lower=yu-.03-u_open*.19*(1.-x*x);
    if(f.y<yu+.024&&f.y>lower){ink=1.; if(u_open>.15&&f.y>yu-.075&&abs(f.x)<.15)glint=1.;}
  }
  return ink;
}
float hoodieMarks(vec3 pb){ // «+» pin on the left chest and two drawstrings
  if(pb.z<.25)return 0.; vec2 f=pb.xy;
  vec2 g=f-vec2(-.50,-.90); vec2 a=abs(g); float sq=max(a.x,a.y);
  if(abs(sq-.12)<.022)return 1.;
  if((a.x<.03&&a.y<.075)||(a.y<.03&&a.x<.075))return 1.;
  if(f.y<-.40&&f.y>-.72&&(abs(f.x-.09)<.017||abs(f.x+.09)<.017))return 1.;
  return 0.;
}
vec4 groundShadow(vec2 s){ // soft dithered contact shadow under the feet
  if(u_shadow<.5||u_scene>.5)return vec4(0.);
  vec2 d=(s-vec2(0.,-3.0))/vec2(1.55-.3*u_bounce,.21-.04*u_bounce);
  float k=1.-dot(d,d);
  if(k<=0.)return vec4(0.);
  float dens=clamp(k*1.1,0.,1.)*.62/(1.+1.2*u_bounce);
  return dens>bayer8(gl_FragCoord.xy)?vec4(u_c[2],1.):vec4(0.);
}

void main(){
  vec2 px=gl_FragCoord.xy; float asp=u_res.x/u_res.y;
  vec2 s=(uv-u_pos)*vec2(asp,1.)/u_size;
  vec3 ro=vec3(0.,0.,9.), rd=normalize(vec3(s,0.)-ro);
  vec3 bc=u_scene<.5?vec3(0.,-.45,0.):vec3(0.);float br=u_scene<.5?3.5:1.6;
  vec3 oc=ro-bc; float b=dot(oc,rd), c=dot(oc,oc)-br*br, h=b*b-c;
  if(h<0.){o=groundShadow(s);return;}
  float t=max(-b-sqrt(h),0.), tmax=-b+sqrt(h); vec2 m=vec2(0.); bool hit=false;
  for(int i=0;i<100;i++){vec3 p=ro+rd*t; m=mapAll(p); if(m.x<.0015*t){hit=true;break;} t+=m.x*.9; if(t>tmax)break;}
  if(!hit){o=groundShadow(s);return;}
  vec3 p=ro+rd*t, n=nrm(p);
  vec3 L=normalize(vec3(-.55*u_light,.75,.65)); float dif=clamp((dot(n,L)+.25)/1.25,0.,1.);
  float ao=clamp(.45+mapAll(p+n*.18).x/.18*.55,0.,1.);
  float edge=pow(1.-clamp(dot(n,-rd),0.,1.),2.4);
  float spec=pow(clamp(dot(reflect(rd,n),L),0.,1.),24.)*.35;
  bool ch=u_scene<.5;
  float alb=ch?(m.y<1.5?.98:m.y<2.5?.40:m.y<3.5?.90:m.y<4.5?.50:m.y<7.5?.92:.28):(m.y<5.5?.95:.30);
  float lum=m.y<1.5&&ch?alb*(.42+.75*dif)*mix(1.,ao,.6)+spec:alb*(.18+.95*dif)*ao+spec;
  lum*=1.-(m.y<1.5&&ch?.38:.55)*edge;
  float ink=0., glint=0., blush=0.;
  if(ch){
    vec3 pb=toBody(p);
    if(m.y<1.5){vec3 q=headM()*(pb-PIVOT)-HC; if(pb.y>.1&&length(q)<1.25)ink=face(q,glint,blush);}
    if(m.y>2.5&&m.y<3.5)ink=hoodieMarks(pb);
  }
  lum=pow(clamp(lum,0.,1.),m.y<1.5&&ch?u_gamma*.8:u_gamma);
  if(ch&&m.y>2.5&&m.y<3.5)lum=min(lum,.9);     // the hoodie keeps a few dots on its lit side: outline never dissolves into a white background
  float bay=bayer8(px);
  float on=lum<bay?1.:0.;
  vec3 inkC=u_ink, papC=u_paper;
  if(ch){int k=m.y<1.5?0:m.y<2.5?1:m.y<3.5?2:m.y<4.5?3:m.y<7.5?4:1; inkC=u_c[k*2]; papC=u_c[k*2+1];}
  if(blush>.5&&ink<.5){on=bay<.55?1.:0.; inkC=vec3(.94,.40,.44);}
  if(ink>.5){on=1.; inkC=u_c[2];}
  if(glint>.5){on=0.; papC=vec3(1.);}
  o=vec4(mix(papC,inkC,on),1.);
}`;

export const MASCOT_FRAG = FRAG;

// mascotLayer(parent, { w, h, cell, z, ink, paper }) → { canvas, render(t, pose) }
// pose: { x, y (canvas uv of the NECK, y up), size (1 unit = size × canvas height; head radius ≈ 1 unit, feet ≈ 3 units below the neck),
// yaw, pitch, roll (head), bodyYaw, lean, blink, wink, smile, open, brow, look:[x,y], bounce (hop height, units), stride (-1..1),
// armL/armR:[shoulder, forearm] angles (0 down … π up), blush, shadow, gamma, scene (0 character, 1–3 objects), spin, light }
// ink / paper per material: skin, hair + face ink, hoodie, jeans, trainers
export const FRIEND_PALETTE = ['#8A4B2A', '#F0B88A', '#150E0B', '#3C2B22', '#B8650A', '#FFC63A', '#10183F', '#4F66C8', '#1B1B1F', '#FFFFFF'];
export function mascotLayer(parent, { w, h, cell = 4, z = 10, ink = '#0B0B0C', paper = '#FFFFFF', style = {}, palette = FRIEND_PALETTE } = {}) {
  const layer = shaderLayer(parent, { w, h, fragment: FRAG, scale: 1 / cell, z });
  Object.assign(layer.canvas.style, { imageRendering: 'pixelated' }, style);
  const cache = new Map(), col = hex => { if (!cache.has(hex)) cache.set(hex, rgb(hex)); return cache.get(hex); };
  // ink/paper pairs per material: skin, hair + moustache + face decals, shirt, tarboosh, tassel
  const pal = palette.flatMap(col);
  return {
    canvas: layer.canvas, ready: layer.ready,
    render(t, pose = {}, opts = {}) {
      const P = { x: 0.5, y: 0.3, size: 0.12, yaw: 0, pitch: 0, roll: 0, bodyYaw: 0, lean: 0, blink: 0, wink: 0, smile: 0.5, open: 0,
        brow: 0, look: [0, 0], gamma: 1, bounce: 0, stride: 0, shadow: 1, blush: 1, armL: [0.3, 0.2], armR: [0.3, 0.2], scene: 0, spin: 0, light: 1, ...pose };
      layer.render(t, { u_pos: [P.x, P.y], u_size: P.size, u_yaw: P.yaw, u_pitch: P.pitch, u_roll: P.roll, u_bodyYaw: P.bodyYaw,
        u_lean: P.lean, u_blink: P.blink, u_wink: P.wink, u_smile: P.smile, u_open: P.open, u_brow: P.brow, u_look: P.look,
        u_ink: col(P.ink || ink), u_paper: col(P.paper || paper), u_gamma: P.gamma, u_scene: P.scene, u_spin: P.spin, u_light: P.light, u_bounce: P.bounce, u_stride: P.stride, u_shadow: P.shadow, u_blush: P.blush, u_armL: P.armL, u_armR: P.armR, u_c: pal }, opts);
    },
  };
}
