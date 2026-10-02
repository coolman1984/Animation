// Agent-facing numerical reduction. Full machine arrays remain available for targeted investigations.
import { mean, round } from './common.mjs';
import { motionCurve } from './metrics.mjs';
export function scientificSummary(meta,shots,motion,audio,relationships){
  const selected=shots.filter(s=>s.frames.length).slice(0,12);
  return {version:1,duration:meta.duration,viewport:[meta.width,meta.height],motionEngine:motion.engine,
    inspectedShotCoverage:[selected.length,shots.length],rawPairCount:motion.pairs.length,
    shots:selected.map(s=>{const p=motion.pairs.filter(p=>p.start>=s.start&&p.t<s.end),dx=p.reduce((v,x)=>v+x.dx,0),dy=p.reduce((v,x)=>v+x.dy,0);return {id:s.id,range:[s.start,s.end],pairCount:p.length,meanSpeed:round(mean(p.map(x=>x.speed))),peakSpeed:round(Math.max(0,...p.map(x=>x.speed))),netDisplacement:[round(dx),round(dy)],direction:Math.abs(dx)+Math.abs(dy)<.003?'static/ambiguous':Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up',meanConfidence:round(mean(p.map(x=>x.confidence||0))),staticPairFraction:round(p.filter(x=>x.speed<.003).length/Math.max(1,p.length)),possibleParallaxPairs:p.filter(x=>x.possibleParallax).length,curve:motionCurve(p)};}),
    audio:audio.available?{available:true,analyzer:audio.map.analyzer,tempo:audio.map.tempo,downbeatConfidence:audio.map.downbeatConfidence,onsetCount:audio.map.onsets?.length||0,peaks:(audio.map.peaks||[]).slice(0,12),builds:(audio.map.builds||[]).slice(0,8),releases:(audio.map.releases||[]).slice(0,8),sections:(audio.map.sections||[]).slice(0,12)}:{available:false,reason:audio.reason},
    audiovisualCandidates:relationships.events.slice(0,24),omittedAudiovisualEvents:Math.max(0,relationships.events.length-24),
    drillDown:'Do not dump raw arrays into vision context. Inspect a selected shot/time window only when the compact evidence leaves a concrete question.',
    limitations:motion.limitations};
}
