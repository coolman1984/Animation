import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { save, json, STUDIO, round, work, sheet, grayOf, inside } from './common.mjs';
import { video } from '../lib/render.mjs';
import { seriesMetrics } from './metrics.mjs';
import { ingest } from './ingest.mjs';
export function representativeRange(plan,{start,duration=5}={}){
  if(plan.duration<3)throw new Error('A 3–8 s reconstruction requires a reference at least 3 seconds long');
  if(!Number.isFinite(duration))throw new Error("Duration must be finite");
  duration=Math.min(plan.duration,duration);if(duration<3||duration>8)throw new Error('Reconstruct only 3–8 seconds');
  if(start===undefined){const target=plan.shots.find(s=>s.transition?.primitive!=='cut')||plan.shots[0];start=Math.max(0,Math.min(plan.duration-duration,target.end-duration*.5));}
  if(!Number.isFinite(start)||start<0||start+duration>plan.duration+.0001)throw new Error('Reconstruction range outside reference');
  return [round(start),round(start+duration)];
}
export function segmentPlan(plan,range){
  const [a,b]=range,sh=t=>round(Math.max(0,Math.min(b-a,t-a)));
  return {...plan,duration:round(b-a),referenceRange:range,shots:plan.shots.filter(s=>s.end>a&&s.start<b).map(s=>{
    const start=sh(s.start),end=sh(s.end);
    // Interpolate the incoming camera at a clipped shot boundary, rather than restarting the move.
    const keys=s.camera.keys;
    const at=t=>{if(t<=keys[0].t)return {...keys[0]};if(t>=keys.at(-1).t)return {...keys.at(-1)};const i=keys.findIndex(k=>k.t>=t),x=keys[i-1],y=keys[i],p=(t-x.t)/(y.t-x.t);return Object.fromEntries(['x','y','zoom','focus','aperture'].map(k=>[k,x[k]+(y[k]-x[k])*p]));};
    const lo=Math.max(a,s.start),hi=Math.min(b,s.end);
    return {...s,start,end,duration:round(end-start),camera:{...s.camera,keys:[{...at(lo),t:start},...keys.filter(k=>k.t>lo&&k.t<hi).map(k=>({...k,t:sh(k.t)})),{...at(hi),t:end}]},typeBehavior:{...s.typeBehavior,start:sh(s.typeBehavior.start),end:Math.max(start+.1,sh(s.typeBehavior.end))}};
  })};
}
export async function reconstruct(dir,opts={}){
  const original=json(join(dir,'recreation-plan.json'));
  if((!original.status.startsWith('REVIEWED')||!original.reconstructionReady)&&!opts.study)throw new Error('Visual review and explicit approval of every shot blueprint are required before reconstruction. --study permits an explicitly provisional neutral experiment.');
  const range=representativeRange(original,opts),plan=segmentPlan(original,range),id='ref-'+Date.now(),folder=join(STUDIO,'recreations',id);mkdirSync(folder,{recursive:true});save(join(folder,'plan.json'),plan);
  writeFileSync(join(folder,'film.js'),`import { recreationFilm } from '../../reference/recreation-film.js';\nimport plan from './plan.json' with {type:'json'};\nexport default recreationFilm(plan);\n`);
  const meta=json(join(dir,'metadata.json')),w=opts.width||640,h=Math.round(w*meta.height/meta.width/2)*2;
  if(w<160||w>1920||h>2560)throw new Error('Reconstruction dimensions exceed study budget');
  const output=join(dir,'comparisons/reconstruction.mp4');if(existsSync(output))throw new Error('Reconstruction already exists; keep comparisons reviewable in a new pack');
  const rendered=await video({film:join(folder,'film.js'),out:output,w,h,workers:1,fps:30,crf:18,preset:'fast'});
  const result={status:opts.study?'PROVISIONAL_NEUTRAL_STUDY':'REVIEWED_GRAMMAR_RECONSTRUCTION',referenceRange:range,sourceFilm:relative(STUDIO,folder),output,assets:'original procedural neutral shapes; source video, brands and audio not reused',audio:'silent; reference rhythm is measured in the comparison map, not copied',rendered};save(join(dir,'comparisons/reconstruction.json'),result);return result;
}
function ownFilm(source){
  if(existsSync(source))return resolve(source);
  const folder=inside(join(STUDIO,'out'),source);if(!existsSync(folder))throw new Error('Provide our rendered video file, or a film name with existing out/<film>/takeNN');
  const take=readdirSync(folder).filter(x=>/^take\d+$/.test(x)).sort().at(-1);if(!take)throw new Error('Our film has no rendered take');const files=readdirSync(join(folder,take)).filter(x=>/\.mp4$/.test(x)&&!/silent|share/.test(x));if(files.length!==1)throw new Error('Specify a delivery video path when our film has multiple outputs');return join(folder,take,files[0]);
}
export async function compare(dir,ours,opts={}){
  const meta=json(join(dir,'metadata.json')),source=json(join(dir,'source.json')),rec=existsSync(join(dir,'comparisons/reconstruction.json'))?json(join(dir,'comparisons/reconstruction.json')):null;
  const refStart=opts.refStart??rec?.referenceRange[0]??0,ourStart=opts.ourStart??0;
  const folder=join(dir,'comparisons','comparison-'+Date.now());mkdirSync(folder,{recursive:true});
  const request=existsSync(join(dir,'source/request.json'))?json(join(dir,'source/request.json')):{};
  const src=source.privateRuntimeMedia?resolve(dir,source.privateRuntimeMedia):request.url||source.input;
  const ref=await ingest(src,join(folder,'reference'),{browser:source.route==='browser',maxDuration:meta.duration+1,rights:source.authorization,selector:request.selector,frameURL:request.frameURL,playSelector:request.playSelector});let own;
  try{
    own=await ingest(ownFilm(ours),join(folder,'ours'),{maxDuration:3600});
    const duration=opts.duration??Math.min(8,rec?.referenceRange[1]-rec?.referenceRange[0]||8,meta.duration-refStart,own.metadata.duration-ourStart);
    if(!(duration>0)||refStart<0||ourStart<0||refStart+duration>meta.duration+.001||ourStart+duration>own.metadata.duration+.001)throw new Error('Comparison timeline exceeds a source');
    const pairs=[],referenceGrays=[],ourGrays=[],times=[],count=opts.samples||9;if(!Number.isInteger(count)||count<3||count>16)throw new Error('Comparison samples must be 3–16');
    for(let i=0;i<count;i++){
      const t=Math.max(0,duration-1/30)*i/(count-1),a=join(folder,`reference-${i}.png`),b=join(folder,`ours-${i}.png`);
      const ri=await ref.frame(refStart+t,a),oi=await own.frame(ourStart+t,b);
      const side=join(folder,`pair-${i}.png`);await sheet([a,b],side,[ri.mediaTime??ri.actual??refStart+t,oi.actual??ourStart+t]);
      pairs.push({elapsed:round(t),reference:{file:a,...ri},ours:{file:b,...oi},comparison:side});referenceGrays.push(await grayOf(a));ourGrays.push(await grayOf(b));times.push(t);
    }
    const cuts=json(join(dir,'detected-boundaries.json')).times.filter(t=>t>=refStart&&t<refStart+duration).map(t=>t-refStart);
    const rm=seriesMetrics(referenceGrays,times,cuts),om=seriesMetrics(ourGrays,times,cuts);
    const curves=rm.pairs.map((p,i)=>({t:p.t,referenceSpeed:p.speed,ourSpeed:om.pairs[i]?.speed??null,referenceDirection:p.direction,ourDirection:om.pairs[i]?.direction??null,referenceChange:p.visualChange,ourChange:om.pairs[i]?.visualChange??null}));
    const result={status:'COMPARISON_EVIDENCE_READY_VISUAL_JUDGMENT_PENDING',refStart,ourStart,duration,pairs,motionCurves:curves,units:'normalized frame displacement / second',objective:'understand and improve purpose; do not minimize pixel error',inspect:['framing','timing','motion direction/magnitude','transition timing','focal hierarchy','type hierarchy','depth','visual energy','rhythm'],questions:['What principle makes the reference effective?','Can our version achieve the same purpose more clearly or beautifully?'],limitations:['Measured grayscale translation cannot judge hierarchy or artistic quality.','Different neutral assets make pixel equality an inappropriate objective.','Audio/music relationship lives in audio-visual-map.json; the neutral study is silent.']};save(join(folder,'comparison.json'),result);
    writeFileSync(join(folder,'comparison.md'),`# Reference vs our version\n\nStatus: visual inspection required.\n\nMatched ranges: reference ${refStart}–${refStart+duration} s; ours ${ourStart}–${ourStart+duration} s.\n\n${pairs.map(p=>`![${p.elapsed} s](${p.comparison.split('/').at(-1)})`).join('\n\n')}\n\nInspect framing, timing, motion, hierarchy, depth and rhythm. Record the reusable principle, improvement and remaining limitation; do not chase pixel-perfect imitation.\n`);return {folder,...result};
  }finally{await ref.close();await own?.close();}
}
