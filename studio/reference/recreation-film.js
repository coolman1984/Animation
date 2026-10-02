// Native neutral study. Shared deterministic camera, independent depth planes, motivated handoff and type.
import { el } from '../lib/motion.js';
import { depthScene, contactShadow, projectLayer } from '../lib/depth.js';
import { cameraPath } from '../lib/cinema.js';
import { spring, curves } from '../lib/kinetics.js';
import { textBlock, reveal } from '../lib/typography.js';
import { applyTransition } from '../lib/transitions.js';
export function recreationFilm(plan) {
  let W,H,sets,wrappers,overlay;
  return {
    duration:plan.duration,fps:30,
    init(stage,{W:w,H:h}) {
      W=w;H=h;wrappers=[];
      sets=plan.shots.map((s,i)=>{
        const wrapper=el('div',{style:{position:'absolute',inset:'0',overflow:'hidden'}},stage);wrappers.push(wrapper);
        const ds=depthScene(wrapper,{w,h,atmosphere:{density:.15}});
        const bg=ds.add('background',{width:w*1.8,height:h*1.5,x:w*.5,y:h*.5,depth:.4,z:0});bg.style.background=i%2?'linear-gradient(135deg,#EAE8DE,#ADB8BC)':'linear-gradient(135deg,#B5C6CC,#EBE4D6)';
        const mid=ds.add('midground',{width:w*.12,height:h*1.5,x:w*.82,y:h*.6,depth:.7,z:1});mid.style.background='linear-gradient(90deg,#AAA899,#D8D1C2)';
        const hero=ds.add('hero',{width:w*.32,height:w*.32,x:w*s.focalPoint[0],y:h*s.focalPoint[1],depth:1,z:4});hero.style.borderRadius='50%';hero.style.background='radial-gradient(circle at 32% 25%,#E2AA79,#B46646 55%,#643C33)';
        const sh=contactShadow(ds.root,{width:w*.39,height:w*.04,color:'#403F39',z:3});
        const fg=ds.add('foreground',{width:w*.07,height:h*1.5,x:w*.16,y:h*.6,depth:1.8,z:6});fg.style.background='linear-gradient(90deg,#666B6A,#A9A898)';
        const type=s.typeBehavior;
        const title=textBlock(wrapper,type.text||'FORM IN MOTION',{left:w*.1+'px',width:w*.8+'px',top:h*.1+'px',fontFamily:type.direction==='rtl'?'El Messiri':'Montserrat',fontSize:Math.min(w,h)*(type.sizeRatio||.07)+'px',fontWeight:type.weight||600,color:'#293237',letterSpacing:(type.tracking||0)+'em',zIndex:30},{align:type.alignment||'center',dir:type.direction||'ltr'});
        return {ds,sh,title,shot:s};
      });
      overlay=el('div',{style:{position:'absolute',inset:'0',pointerEvents:'none',zIndex:50}},stage);
    },
    render(t) {
      for(let i=0;i<sets.length;i++){
        const {ds,sh,title,shot:s}=sets[i],keys=s.camera.keys.map(k=>({...k,x:k.x*W,y:k.y*H}));
        const camera=cameraPath(keys,t);ds.render(camera,{hero:{scale:spring(t,{from:.94,to:1,start:s.start,duration:.8,bounce:.12})}});
        const ground=projectLayer({width:1,height:1,x:W*s.focalPoint[0],y:H*s.focalPoint[1]+W*.18,depth:1},camera,{w:W,h:H});sh({x:ground.x,y:ground.y,scale:ground.scale});
        reveal(title,t,{tIn:s.typeBehavior.start,tOut:s.typeBehavior.end,style:s.typeBehavior.style||'mask',per:s.typeBehavior.per||'word',stagger:s.typeBehavior.stagger??.06,dur:.55,curve:curves.emphasized});
        Object.assign(wrappers[i].style,{display:'block',opacity:i===Math.max(0,plan.shots.findIndex(x=>t>=x.start&&t<x.end))?'1':'0',transform:'none',filter:'none',clipPath:'none',maskImage:'none'});
      }
      overlay.style.opacity='0';
      for(let i=0;i<sets.length-1;i++){
        const s=sets[i].shot,d=Math.min(s.transition.duration||.3,.6,s.duration*.3),start=s.end-d;
        if(t>=start&&t<s.end){applyTransition(s.transition.primitive,t,{a:wrappers[i],b:wrappers[i+1],overlay,start,duration:d,w:W,h:H});}
      }
    },
  };
}
