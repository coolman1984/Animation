// BALACONBAR: paper memory / present-tense flavour. Original supplied pixels, pure time.
import {el,show,textLine,playLine,ramp,lerp,ease,rng,grain} from '../lib/motion.js';
const P=f=>new URL('./plates/'+f+'.png',import.meta.url).href;
const C={cream:'#F4E5C8',ink:'#153D31',lime:'#C8DA61',red:'#A3442C',gold:'#C1A465'};
const cuts=[0,4.166667,8.333333,12.5,15.625,19.791667,21.875,25];
let stage,S=[],wipe,iris,shutters=[],texture,edges;
const D=(p,s={})=>el('div',{style:{position:'absolute',...s}},p);
function img(p,f,x,y,w,h,s={}){return el('img',{src:P(f),style:{position:'absolute',left:x+'px',top:y+'px',width:w+'px',height:h+'px',objectFit:'cover',...s}},p);}
function type(p,text,y,size,color=C.ink,font='Plex Arabic'){return textLine(p,text,{top:y+'px',left:'50%',transform:'translateX(-50%)',fontFamily:font,fontSize:size+'px',fontWeight:500,color,lineHeight:1.35,zIndex:8});}
function circle(p,x,y,size,color){return D(p,{left:x+'px',top:y+'px',width:size+'px',height:size+'px',borderRadius:'50%',background:color});}
function mark(p,light=false){return img(p,light?'logo-white':'logo-teal',74,278,140,120,{objectFit:'contain',zIndex:9});}
function border(p){return D(p,{inset:'48px',border:'1px solid rgba(21,61,49,.25)',pointerEvents:'none'});}
function pose(e,x,y,rot=0,sx=1,sy=sx){e.style.transform=`translate(${x}px,${y}px) rotate(${rot}deg) scale(${sx},${sy})`;}
function kinetic(L,t,a,b,{dur=.65,stretch=.18,...rest}={}){
 playLine(L,t,a,b,{dur,rise:80,blur:0,stagger:.085,exitDur:.17,exitRise:-30,...rest});
 for(let i=0;i<L.words.length;i++){let u=t-a-i*.085,p=ramp(u,0,dur),q=u>=0?Math.sin(p*Math.PI*2)*Math.exp(-p*3):0;L.words[i].style.transform+=` scaleX(${1+stretch*q}) scaleY(${1-stretch*q*.35})`;}
}
function scene(color){const r=D(stage,{inset:0,overflow:'hidden',background:color});S.push({r});return S.at(-1);}
export default{
 duration:25,fps:30,
 init(root){stage=root;
 // Hook: oversized editorial lettering, diagonal memories, a green present-tense portal.
 {let s=scene(C.cream);border(s.r);mark(s.r);s.a=type(s.r,'روح',330,176,C.red,'Aref Ruqaa');s.b=type(s.r,'زمان…',660,175,C.ink,'Aref Ruqaa');s.photo=img(s.r,'facade',48,965,985,754,{boxShadow:'0 28px 50px #3f2d2645',border:'12px solid #f9edd7'});s.news=img(s.r,'newspaper',-180,1350,450,371,{border:'9px solid #F8EDD8'});s.badge=circle(s.r,780,752,214,C.lime);s.tick=D(s.badge,{inset:'24px',border:'2px dashed #153D31',borderRadius:'50%'});s.dot=circle(s.r,903,703,42,C.red);}
 // Real cup becomes the hero; its photograph does not turn into a fictitious 3D object.
 {let s=scene(C.ink);mark(s.r,true);s.ring=circle(s.r,-220,670,1350,C.lime);s.ring.style.border='24px solid #e7e9b655';s.a=type(s.r,'بمزاج',345,111,C.cream);s.b=type(s.r,'النهارده',585,119,C.lime);s.cup=img(s.r,'cup',170,730,740,1041,{objectFit:'contain',filter:'drop-shadow(15px 35px 25px #0e271e66)'});s.disk=circle(s.r,840,1250,300,C.red);s.stroke=D(s.r,{left:'76px',top:'693px',width:'928px',height:'2px',background:C.cream});}
 // Three sensory details, one readable thought. Cut scales on the rhythm, not constant noise.
 {let s=scene(C.cream);mark(s.r);s.a=type(s.r,'ماتشا',350,145);s.b=type(s.r,'على مزاجك',650,80);s.tiles=[];for(let i=0;i<3;i++){let w=D(s.r,{left:i*360+'px',top:'854px',width:'360px',height:'900px',overflow:'hidden',borderRight:'3px solid '+C.cream});let im=el('img',{src:new URL('./source/hero-duo.jpg',import.meta.url).href,style:{position:'absolute',width:'2300px',height:'2300px'}},w);s.tiles.push({w,im});}}
 // Intentional breakdown: the swing earns breathing room before the next lift.
 {let s=scene(C.cream);border(s.r);mark(s.r);s.a=type(s.r,'خد لك',350,104);s.b=type(s.r,'لحظة',560,151,C.red,'Aref Ruqaa');s.swing=img(s.r,'swing-card',60,835,960,756,{objectFit:'contain',border:'10px solid #F4E5C8',boxShadow:'0 25px 40px #153D3133',transformOrigin:'50% -40%'});s.shadow=D(s.r,{left:'170px',top:'1650px',width:'740px',height:'85px',background:'#153D3120',borderRadius:'50%',filter:'blur(28px)'});}
 // A tangible paper collage celebrates the supplied illustrated cafe identity.
 {let s=scene(C.ink);mark(s.r,true);s.a=type(s.r,'وقعدة',350,116,C.cream);s.b=type(s.r,'ليها روح',600,108,C.lime);s.bg=img(s.r,'cafe',-110,833,1300,554,{filter:'brightness(.8)'});s.cards=[];for(let i=0;i<5;i++)s.cards.push(img(s.r,'menu'+i,360,1020,355,510,{border:'10px solid #F4E5C8',boxShadow:'0 12px 30px #06190e77',transformOrigin:'50% 130%'}));s.ribbon=D(s.r,{left:'-100px',top:'1630px',width:'1280px',height:'120px',background:C.lime,transform:'rotate(-7deg)'});}
 // Short bridge: ingredient illustration / authentic photographed drink share the rhythm.
 {let s=scene(C.lime);s.a=type(s.r,'مزاجك',350,136);s.b=type(s.r,'له مكان',630,107);s.panel=img(s.r,'ingredients',-60,820,1200,580,{borderTop:'12px solid #F4E5C8',borderBottom:'12px solid #F4E5C8'});s.cup=img(s.r,'cup',264,960,550,773,{objectFit:'contain',filter:'drop-shadow(0 24px 18px #153D3170)'});}
 // Legible branded resolve, no address invented. Branding is extracted from supplied poster.
 {let s=scene(C.ink);s.orbit=circle(s.r,-100,977,1280,C.lime);s.orbit.style.opacity='.16';s.logo=img(s.r,'logo-white',314,315,452,389,{objectFit:'contain'});s.a=type(s.r,'جرّبها في بني سويف',758,66,C.cream);s.b=type(s.r,'روح زمان… بمزاج النهارده',885,47,C.lime);s.cup=img(s.r,'cup',290,1050,500,703,{objectFit:'contain',filter:'drop-shadow(0 28px 24px #071c1460)'});s.line=D(s.r,{left:'200px',top:'1000px',width:'680px',height:'2px',background:'#f4e5c855'});}
 wipe=D(stage,{left:0,top:'-200px',width:'1500px',height:'2400px',background:C.lime,zIndex:40,borderLeft:'20px solid '+C.cream,transform:'translateX(1800px) rotate(-8deg)'});
 iris=circle(stage,-910,-440,2900,C.lime);iris.style.zIndex=41;iris.style.border='20px solid '+C.cream;
 for(let i=0;i<4;i++)shutters.push(D(stage,{left:0,top:i*480+'px',width:'1080px',height:'482px',background:i%2?C.ink:C.cream,zIndex:42}));
 edges=D(stage,{inset:0,pointerEvents:'none',zIndex:30,background:'radial-gradient(ellipse at 50% 48%,transparent 45%,rgba(21,40,22,.12))'});
 texture=grain(stage,{opacity:.032});
 },
 render(t,frame){
 let idx=cuts.findIndex((c,i)=>i<7&&t>=c&&t<cuts[i+1]);if(idx<0)idx=6;
 S.forEach((s,i)=>show(s.r,i===idx));let s=S[idx],u=t-cuts[idx];
 if(idx===0){kinetic(s.a,t,.12,3.85,{dur:.7,stretch:.25});kinetic(s.b,t,.5,3.9,{dur:.8,stretch:.2});let p=ease.outBack(ramp(t,0,1.2));pose(s.photo,0,lerp(320,0,p),lerp(-14,-4,p),1+.03*Math.sin(t));pose(s.news,120*ease.outCubic(ramp(t,1.2,2)),0,10+3*Math.sin(t));pose(s.badge,0,0,35*t,.6+.4*ease.outBack(ramp(t,.65,1.25)));pose(s.dot,0,Math.sin(t*3)*20);}
 if(idx===1){kinetic(s.a,t,4.27,8.06);kinetic(s.b,t,4.43,8.06,{stretch:.3});let p=ease.outBack(ramp(u,0,.8));pose(s.cup,lerp(-440,0,p),lerp(360,0,p),lerp(-19,-3,p)+Math.sin(u*1.5)*2,lerp(.7,1,p));pose(s.ring,0,70*Math.sin(u*.9),u*4,1+.035*Math.sin(u*2));pose(s.disk,Math.sin(u*2)*60,0,0,.8+.1*Math.sin(u*3));}
 if(idx===2){kinetic(s.a,t,8.45,12.25,{stretch:.26});kinetic(s.b,t,8.64,12.25,{rise:35});s.tiles.forEach(({w,im},i)=>{let p=ease.outExpo(ramp(u,i*.15,i*.15+.7));pose(w,0,lerp(800,0,p));let k=Math.floor(u/1.3889)%3;let coords=[[-1100,-850],[-1130,-1160],[-1150,-1400]];let c=coords[(i+k)%3];im.style.left=c[0]+'px';im.style.top=c[1]+'px';im.style.transform=`scale(${1+.03*Math.sin(u*1.5+i)})`;});}
 if(idx===3){kinetic(s.a,t,12.67,15.45,{rise:30,dur:.8,stretch:.03});kinetic(s.b,t,12.9,15.45,{rise:20,dur:1,stretch:.06});pose(s.swing,0,lerp(180,0,ease.outCubic(ramp(u,0,.8))),4*Math.cos(u*1.8)*Math.exp(-u*.35));pose(s.shadow,30*Math.cos(u*1.8),0,0,.9+.06*Math.sin(u));}
 if(idx===4){kinetic(s.a,t,15.75,19.5);kinetic(s.b,t,15.95,19.5,{stretch:.24});let p=ease.outCubic(ramp(u,0,.75));pose(s.bg,0,0,0,1+.03*u);s.cards.forEach((im,i)=>{let q=ease.outBack(ramp(u,.15+i*.1,.95+i*.1));let a=(i-2)*16;pose(im,(i-2)*115*q,lerp(700,0,q)+Math.sin(u*2+i)*12,a*q,1);im.style.zIndex=5-Math.abs(i-2);});}
 if(idx===5){kinetic(s.a,t,19.85,21.7,{dur:.5});kinetic(s.b,t,20.0,21.7,{dur:.5,stretch:.27});pose(s.panel,lerp(600,0,ease.outExpo(ramp(u,0,.7))),0,-7);pose(s.cup,0,lerp(500,0,ease.outBack(ramp(u,.25,1))),5*Math.sin(u*2));}
 if(idx===6){let p=ease.outCubic(ramp(u,0,.65));pose(s.logo,0,lerp(38,0,p),0,lerp(.86,1,p));s.logo.style.opacity=p;kinetic(s.a,t,22.05,99,{dur:.6,rise:28,stretch:.05});kinetic(s.b,t,22.3,99,{dur:.65,rise:20,stretch:.04});pose(s.cup,0,lerp(150,0,p),0,1);pose(s.orbit,0,0,0,1+.02*Math.sin(u));}
 let cut=cuts.slice(1,-1).find(c=>Math.abs(t-c)<.23),n=cuts.indexOf(cut);show(wipe,cut!==undefined&&[4,5].includes(n));show(iris,cut!==undefined&&n===1);shutters.forEach(e=>show(e,cut!==undefined&&n===2));
 if(cut!==undefined){let p=ease.inOutCubic(ramp(t,cut-.23,cut+.23));if([4,5].includes(n))pose(wipe,lerp(1400,-1750,p),0,-8);if(n===1)pose(iris,0,0,0,Math.sin(p*Math.PI));if(n===2)shutters.forEach((e,i)=>pose(e,(i%2?-1:1)*1080*(1-Math.sin(p*Math.PI)),0));}

 texture(frame);
 }
};
