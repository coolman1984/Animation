import { join, resolve, basename } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { ingest } from './ingest.mjs';
import { REFS, STUDIO, slugify, save, round, work, sheet, grayOf, diff, json } from './common.mjs';
import { decodeMetrics, cutTimes, seriesMetrics, findEvents } from './metrics.mjs';
import { blueprint, writeAnalysis } from './report.mjs';
import { TECHNIQUE_ATLAS } from './atlas.mjs';
const PY = join(STUDIO,'tools/reference_motion.py');
import { relationship } from './audiovisual.mjs';
export async function analyze(source, opts={}) {
  const maxFrames=opts.maxFrames??72;
  if(!source)throw new Error("Supply a local video or authorized HTTP(S) source");
  for(const [key,fallback,max] of [["maxDuration",300,3600],["maxMB",128,2048],["width",1280,3840]])if(!Number.isFinite(opts[key]??fallback)||(opts[key]??fallback)<=0||(opts[key]??fallback)>max)throw new Error("Invalid analysis budget: "+key);
  if(!["auto","none","python"].includes(opts.motion??"auto")||!["ffmpeg","python"].includes(opts.sceneEngine??"ffmpeg")||!["node","python"].includes(opts.audioEngine??"node"))throw new Error("Unsupported analysis engine");
  if(!Number.isInteger(maxFrames)||maxFrames<24||maxFrames>160)throw new Error('Frame budget must be 24–160');
  const name=opts.slug||slugify(basename(source).split('?')[0].replace(/\.[^.]+$/,''));
  if(name!==slugify(name))throw new Error('Use a simple reference slug');
  const dir=opts.out?resolve(opts.out):join(REFS,name);
  if(existsSync(dir))throw new Error('Reference output already exists; choose a new --slug / --out (never overwrite evidence)');
  mkdirSync(dir,{recursive:true});for(const d of ['frames','contact-sheets','comparisons'])mkdirSync(join(dir,d));
  const started=Date.now(),deadline=started+(opts.jobTimeout||600000);
  let handle;
  const checkpoint=()=>{if(Date.now()>deadline)throw new Error('Analysis time budget exhausted; pack marked BLOCKED');};
  try {
    handle=await ingest(source,dir,opts);const meta=handle.metadata,D=meta.duration,frameStep=1/(meta.fps||30),last=Math.max(0,D-frameStep);
    let machine,cuts=[],detection='ffmpeg scene-score on low-resolution frames';
    const overviewCount=Math.min(18,Math.max(6,Math.ceil(D/2))),coarseTimes=Array.from({length:overviewCount},(_,i)=>round(last*i/(overviewCount-1)));
    const evidence=[],grays=[],coarse=[];
    const capture=async(t,reason,{force=false}={})=>{
      checkpoint();t=round(Math.max(0,Math.min(last,t)));
      const existing=evidence.find(f=>Math.abs(f.t-t)<frameStep*.4);if(existing){existing.reasons.push(reason);return existing;}
      if(evidence.length>=maxFrames)return null;
      const file=`frames/f${String(evidence.length).padStart(3,'0')}.png`,info=await handle.frame(t,join(dir,file),{width:opts.width||1280});
      const g=await grayOf(join(dir,file));let duplicate=-1;
      if(!force)duplicate=grays.findIndex(x=>diff(x,g)<.003);
      const rec={t,file,...info,reasons:[reason],redundantWith:duplicate>=0?evidence[duplicate].file:null};
      // Preserve timestamp evidence, reuse visual pixels only in vision packs (raw frame still local).
      evidence.push(rec);grays.push(g);return rec;
    };
    for(const t of coarseTimes){const rec=await capture(t,'overview');if(rec)coarse.push(rec);}
    if(handle.local){
      const decoded=await decodeMetrics(handle.local,D);cuts=await cutTimes(handle.local);
      if(opts.sceneEngine==='python'){
        const r=await work(opts.python||'python3',[PY,'scenes',handle.local],{timeout:90000});const d=JSON.parse(r.stdout);if(d.unavailable)throw new Error('Requested PySceneDetect is unavailable');cuts=d.cuts;detection='PySceneDetect AdaptiveDetector';
      }
      machine=seriesMetrics(decoded.frames,decoded.times,cuts);machine.measurementFPS=decoded.fps;
    }else{
      cuts=grays.slice(1).flatMap((g,i)=>diff(grays[i],g)>.2?[coarse[i+1].t]:[]);
      machine=seriesMetrics(grays,coarse.map(f=>f.mediaTime??f.actual??f.t),cuts);detection='browser coarse change candidates (boundary timing approximate)';
    }
    cuts=[...new Set(cuts.filter(t=>t>.12&&t<D-.12).map(t=>round(t)))].sort((a,b)=>a-b).filter((t,i,a)=>!i||t-a[i-1]>=.15);
    const allCuts=[...cuts],maxShots=Math.max(2,Math.min(12,Math.floor((maxFrames-overviewCount)/4)));
    cuts=Array.from({length:Math.min(cuts.length,maxShots-1)},(_,i)=>allCuts[Math.floor(i*allCuts.length/Math.min(allCuts.length,maxShots-1))]);if(cuts.length<allCuts.length)meta.limitations=[...(meta.limitations||[]),`Detected ${allCuts.length} boundaries; detailed shot inspection capped at ${maxShots}. All shot records remain in shots.json; unsampled boundaries are recorded explicitly.`];
    save(join(dir,'detected-boundaries.json'),{engine:detection,times:allCuts,boundaryTimingPrecision:meta.route==='browser'?'coarse sample interval':`decoded frame (about ${round(frameStep,4)} seconds)`,evaluation:{default:'FFmpeg select(scene) needs no optional dependency; high motion/light can false-trigger',optional:'PySceneDetect AdaptiveDetector uses a rolling baseline; ThresholdDetector adds fade candidates but is not used as an exact transition classifier'}});
    const bounds=[0,...allCuts,D],shots=bounds.slice(0,-1).map((start,i)=>({id:`shot-${i+1}`,start:round(start),end:round(bounds[i+1]),duration:round(bounds[i+1]-start),boundaryConfidence:meta.route==='browser'?.3:.65,frames:[]}));
    const sampledShots=new Set(Array.from({length:Math.min(maxShots,shots.length)},(_,i)=>Math.floor(i*shots.length/Math.min(maxShots,shots.length))));
    for(const [i,s] of shots.entries()){s.evidenceCoverage=sampledShots.has(i)?"begin-middle-end":"budget omitted; request explicit targeted inspection";if(!sampledShots.has(i))continue;for(const [kind,t]of [['begin',s.start+Math.min(frameStep,s.duration/4)],['middle',(s.start+s.end)/2],['end',s.end-Math.min(frameStep,s.duration/4)]]){
      const f=await capture(t,`${s.id}:${kind}`,{force:true});if(f)s.frames.push({kind,t:f.mediaTime??f.actual??f.t,requested:f.t,file:f.file});
    }}
    const motion={engine:'native-pixel-translation',...machine};
    if(opts.motion!=='none'&&handle.local){
      try{const r=await work(opts.python||'python3',[PY,'motion',handle.local,'--duration',String(D),'--cuts',JSON.stringify(allCuts)],{timeout:90000});const flow=JSON.parse(r.stdout);if(!flow.unavailable){motion.nativePairs=motion.pairs;Object.assign(motion,flow);motion.samples=machine.samples;}}
      catch(e){motion.limitations.push('Optional OpenCV unavailable/failed: '+e.message.slice(0,240));if(opts.motion==='python')throw e;}
    }
    const transitions=[];
    for(const t of cuts){
      const frames=[];for(const dt of [-.18,-frameStep,0,frameStep,.18]){const f=await capture(t+dt,`transition:${t}`,{force:true});if(f)frames.push(f);}
      const near=machine.samples.filter(s=>Math.abs(s.t-t)<.4),flash=near.some(s=>s.luminance>.85),kind=flash?'light wipe':'hard editorial cut';
      const record={t,duration:kind==='hard editorial cut'?0:.3,observedResult:'scene-score or sampled-pixel change across boundary',likelyTechnique:kind,confidence:flash?.3:.5,alternatives:flash?['flash frame','lighting jump','white graphic wipe']:['occlusion wipe','fast motion','dissolve','match cut'],familiesToInspect:['dissolve','foreground occlusion','object wipe','mask wipe','shape transition','light wipe','blur transition','focus handoff','zoom handoff','directional continuation','match cut','camera pass','graphic morph'],frames:frames.map(f=>({file:f.file,requested:f.t,actual:f.mediaTime??f.actual})),strip:null};
      if(frames.length>=2){record.strip=`contact-sheets/transition-${transitions.length+1}.png`;await sheet(frames.map(f=>join(dir,f.file)),join(dir,record.strip),frames.map(f=>f.mediaTime??f.actual??f.t));}
      transitions.push(record);
    }
    let audio={available:false,reason:meta.route==='browser'?'browser route cannot provide audio without authorized local media':'no audio track'};
    if(handle.local&&meta.audio&&D>=1){
      const wav=join(dir,'source/audio.wav');await work('ffmpeg',['-v','error','-y','-i',handle.local,'-vn','-ac','1','-ar','22050',wav]);
      const module=join(STUDIO,'lib/musicmap.mjs');
      const r=await work('node',['--input-type=module','-e',`import {analyzeMusic} from ${JSON.stringify(new URL('file://'+module).href)};console.log(JSON.stringify(await analyzeMusic(${JSON.stringify(wav)},{engine:${JSON.stringify(opts.audioEngine||'node')}})));`],{timeout:90000,maxBytes:8<<20});
      audio={available:true,extracted:'source/audio.wav',map:JSON.parse(r.stdout),limitation:'Tempo/downbeats/drops are analyzer hypotheses; musical role requires listening.'};
    }
    const events=[...allCuts.map(t=>({t,kind:'cut candidate'})),...findEvents(machine,D),...(audio.map?.peaks||[]).map(p=>({t:p.t,kind:'musical energy peak'})),...(audio.map?.builds||[]).map(p=>({t:p.start,kind:'musical build begins'}))];
    for(const e of events.filter(e=>e.kind!=='cut candidate').slice(0,8))for(const dt of[-.12,0,.12])await capture(e.t+dt,e.kind);
    for(let i=0;i<coarse.length;i+=12)await sheet(coarse.slice(i,i+12).map(f=>join(dir,f.file)),join(dir,`contact-sheets/overview-${i/12+1}.png`),coarse.slice(i,i+12).map(f=>f.mediaTime??f.actual??f.t));
    const unique=evidence.filter(f=>!f.redundantWith);
    const sheets=[];for(let i=0;i<unique.length;i+=12){const file=`contact-sheets/evidence-${i/12+1}.png`;await sheet(unique.slice(i,i+12).map(f=>join(dir,f.file)),join(dir,file),unique.slice(i,i+12).map(f=>f.mediaTime??f.actual??f.t));sheets.push(file);}
    for(const t of allCuts.filter(t=>!cuts.includes(t)))transitions.push({t,duration:null,observedResult:'detected boundary; detailed visual sampling omitted by budget',likelyTechnique:null,confidence:0,alternatives:['hard cut','dissolve','flash','fast motion'],frames:[],strip:null,evidenceCoverage:'not inspected'});transitions.sort((a,b)=>a.t-b.t);
    save(join(dir,'frames.json'),evidence);save(join(dir,'shots.json'),shots);save(join(dir,'transitions.json'),transitions);save(join(dir,'motion.json'),motion);save(join(dir,'audio.json'),audio);save(join(dir,'audio-visual-map.json'),relationship(audio,events));
    save(join(dir,'technique-map.json'),{atlas:TECHNIQUE_ATLAS,hypotheses:[],status:'Await visual review; no software certainty from pixels'});save(join(dir,'recreation-plan.json'),blueprint(meta,shots,transitions,motion));
    save(join(dir,'evidence-pack.json'),{status:'MACHINE_COMPLETE_VISUAL_REVIEW_PENDING',slug:name,passes:['coarse overview','shot candidates and triads','targeted transition/motion/audio neighborhoods','near-frame requests only when justified'],maxFrames,extracted:evidence.length,uniqueForVision:unique.length,doNotSendEveryFrame:true,contactSheets:sheets,firstLook:'contact-sheets/overview-1.png',omittedDetailedBoundaries:allCuts.length-cuts.length,nearFrameCommand:`node reference.mjs refine ${name} --range=start:end --reason="observed unresolved issue"`,sourceDurationSeconds:D,analysisSeconds:(Date.now()-started)/1000,limits:meta.limitations||[]});writeAnalysis(dir);
    save(join(dir,'job.json'),{status:'DONE_MACHINE_PACK',visualReview:'PENDING',at:new Date().toISOString(),seconds:(Date.now()-started)/1000});return dir;
  }catch(e){save(join(dir,'job.json'),{status:'BLOCKED',error:e.message,at:new Date().toISOString()});throw e;}finally{await handle?.close();}
}
export async function refine(dir,{range,reason,count=8}={}){
  if(!reason||!Array.isArray(range)||range.length!==2||range.some(t=>!Number.isFinite(t))||range[0]<0||range[1]<=range[0]||range[1]-range[0]>2||!Number.isInteger(count)||count<2||count>12)throw new Error('Refine needs a justified range <=2s and 2–12 samples');
  const provenance=json(join(dir,'source.json')),meta=json(join(dir,'metadata.json'));if(range[1]>=meta.duration)throw new Error('Refine range must end before the video end');
  const requests=existsSync(join(dir,'source/request.json'))?json(join(dir,'source/request.json')):{};
  const prior=existsSync(join(dir,'refinements.json'))?json(join(dir,'refinements.json')):[];if(prior.length>=2)throw new Error('Two targeted refinement rounds used; begin a new explicit scope instead of an endless loop');
  const src=provenance.privateRuntimeMedia?resolve(dir,provenance.privateRuntimeMedia):requests.url||provenance.input;
  const h=await ingest(src,dir,{browser:provenance.route==='browser',maxDuration:meta.duration+1,rights:provenance.authorization,record:false,selector:requests.selector,frameURL:requests.frameURL,playSelector:requests.playSelector});
  const folder=join(dir,'frames/refinement-'+Date.now());mkdirSync(folder);const frames=[];
  try{for(let i=0;i<count;i++){const t=range[0]+(range[1]-range[0])*i/(count-1),file=join(folder,`f${i}.png`),info=await h.frame(t,file);frames.push({file,t,...info});}await sheet(frames.map(f=>f.file),join(folder,'strip.png'),frames.map(f=>f.mediaTime??f.actual??f.t));save(join(folder,'manifest.json'),{reason,range,frames});prior.push({reason,range,count,folder});save(join(dir,'refinements.json'),prior);return folder;}finally{await h.close();}
}
