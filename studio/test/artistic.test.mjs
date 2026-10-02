import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { artisticScaffold, validateArtistic, renderArtistic, originalDirection, ARTISTIC_SECTIONS, ATTENTION_AXES, PACING_AXES } from '../reference/artistic.mjs';
import { applyReview, SECTIONS, writeAnalysis } from '../reference/report.mjs';
const save=(d,f,v)=>writeFileSync(join(d,f),JSON.stringify(v));
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'artistic-'));writeFileSync(join(dir,'frame.png'),'schema evidence placeholder, not a visual attestation');
 const review={reviewer:'schema fixture, no artistic certification',viewedEvidence:['frame.png'],motionPlaybackInspected:true,audioListened:false,sections:Object.fromEntries(SECTIONS.map(h=>[h,'Fixture only']))};
 const dna=artisticScaffold(4);dna.context={viewer:'prospective buyer',purpose:'inspect material',viewingSituation:'phone, muted'};
 dna.observations=[{id:'push',start:0,end:4,layer:'cinematicIntent',basis:'motion',observedChoice:'Slow push followed by a hold.',likelyIntention:'May increase importance while allowing inspection.',context:'A familiar object for a patient viewer.',whyItMayWork:'The settling removes competing movement before detail is revealed.',alternative:'Could simply accommodate the crop.',confidence:.6,evidence:[{file:'frame.png',t:2}],transferablePrinciple:'Settle before important information.',counterCase:'A chase may need continuous movement.'}];
 dna.sections['CAMERA PSYCHOLOGY']={summary:'A likely inspection cue, not universal psychology.',observationIds:['push'],status:'reviewed'};
 const row={start:0,end:4,basis:'motion',confidence:.6,observationIds:['push'],narrativeRole:'inspection',why:'hold permits inspection',attention:Object.fromEntries(ATTENTION_AXES.map(k=>[k,k==='soundIntensity'?null:2])),pacing:Object.fromEntries(PACING_AXES.map(k=>[k,k==='audioEnergy'?null:2]))};
 for(const k of ['firstNotice','expectation','delayedAnswer','microPayoff','majorPayoff','quietMoment','patternBreak','repetition','boredomRisk','overloadRisk','slowingOpportunity'])row[k]='unknown';dna.timeline=[row];
 return {dir,review,dna,opts:{duration:4,dir,review,audioAvailable:false}};
}
test('whole-film artistic curves preserve unknowns and separate intention from measured audience effects',()=>{
 const f=fixture();try{const d=validateArtistic(f.dna,f.opts);assert.equal(d.status,'REVIEWER_INTERPRETATION');assert.equal(d.timeline[0].pacing.audioEnergy,null);const text=renderArtistic(d);for(const h of ARTISTIC_SECTIONS)assert.ok(text.includes('### '+h));assert.match(text,/not universal/);assert.match(text,/not-assessed|not assessed/);assert.equal(artisticScaffold(4).timeline.length,0);}finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('reject unsupported perception, false playback/audio attestation, incomplete or overlapping curves and invented evidence',()=>{
 const f=fixture();try{
  for(const [mutate,pattern] of [
   [d=>d.observations[0].confidence=2,/confidence/],
   [d=>d.observations[0].evidence[0].file='missing.png',/evidence/],
   [d=>d.observations[0].evidence[0].t=5,/evidence/],
   [d=>d.timeline[0].start=1,/whole film/],
   [d=>d.timeline[0].end=3,/film duration/],
   [d=>d.timeline.push({...d.timeline[0],start:2}),/gaps\/overlaps/],
   [d=>d.timeline[0].pacing.visualEnergy=6,/ratings/],
   [d=>d.timeline[0].attention.soundIntensity=3,/audio energy/],
   [d=>d.timeline[0].basis='still',/temporal ratings/],
   [d=>d.sections['CAMERA PSYCHOLOGY'].observationIds=['invented'],/unknown observation/]
  ]){const d=structuredClone(f.dna);mutate(d);assert.throws(()=>validateArtistic(d,f.opts),pattern);}
  assert.throws(()=>validateArtistic(f.dna,{...f.opts,review:{...f.review,motionPlaybackInspected:false}}),/inspected playback/);
  const d=structuredClone(f.dna);d.observations[0].basis='audio';assert.throws(()=>validateArtistic(d,f.opts),/listened audio/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('review integration validates before writing and legacy reviews remain explicitly artistically pending',()=>{
 const f=fixture();try{
  for(const [name,value]of Object.entries({'metadata.json':{duration:4,width:320,height:180},'shots.json':[],'transitions.json':[],'motion.json':{pairs:[],limitations:[]},'audio.json':{available:false,reason:'silent'},'audio-visual-map.json':{events:[]},'recreation-plan.json':{duration:4,shots:[]},'evidence-pack.json':{},'job.json':{}}))save(f.dir,name,value);
  const before=readFileSync(join(f.dir,'job.json'),'utf8');const bad=structuredClone(f.dna);bad.timeline[0].end=3;
  assert.throws(()=>applyReview(f.dir,{...f.review,artisticDNA:bad}),/film duration/);assert.equal(readFileSync(join(f.dir,'job.json'),'utf8'),before);assert.equal(existsSync(join(f.dir,'visual-review.json')),false);
  applyReview(f.dir,f.review);assert.equal(JSON.parse(readFileSync(join(f.dir,'artistic-dna.json'))).status,'PENDING_ARTISTIC_REVIEW');
  const plan=applyReview(f.dir,{...f.review,artisticDNA:f.dna});assert.equal(plan.artisticIntent.decisions[0].id,'push');assert.equal(JSON.parse(readFileSync(join(f.dir,'artistic-dna.json'))).status,'REVIEWER_INTERPRETATION');assert.match(readFileSync(join(f.dir,'analysis.md'),'utf8'),/ARTISTIC DNA/);
  save(f.dir,'original-direction.json',{stale:true});writeFileSync(join(f.dir,'original-direction.md'),'stale');
  applyReview(f.dir,{...f.review,artisticDNA:f.dna});assert.equal(existsSync(join(f.dir,'original-direction.json')),false);assert.equal(existsSync(join(f.dir,'original-direction.md')),false);
  writeAnalysis(f.dir);assert.match(readFileSync(join(f.dir,'analysis.md'),'utf8'),/PACING CURVE/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('new-subject direction needs artistic review and traceable original transformations',()=>{
 const f=fixture();try{
  const brief={...Object.fromEntries(['subject','viewer','objective','concept','visualLanguage','emotionalArc','pacingStrategy','cameraStrategy','soundStrategy','payoff','avoidCopying'].map(k=>[k,'original '+k])),transformations:[{observationIds:['push'],principle:'settle before proof',originalExecution:'A ceramic tile settles before revealing its true texture.',whyItFitsSubject:'Material inspection',differenceFromReference:'New layout, object and light motif.',counterCase:'Not for a rapid process overview.'}]};
  save(f.dir,'artistic-dna.json',artisticScaffold(4));assert.throws(()=>originalDirection(f.dir,brief),/reviewed artistic DNA/);
  save(f.dir,'artistic-dna.json',validateArtistic(f.dna,f.opts));assert.ok(existsSync(originalDirection(f.dir,brief)));assert.match(readFileSync(join(f.dir,'original-direction.md'),'utf8'),/ceramic tile/);
  const bad=structuredClone(brief);bad.transformations[0].observationIds=['invented'];assert.throws(()=>originalDirection(f.dir,bad),/observation references/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('unseen and still-only intervals preserve unknown temporal values rather than silently scoring zero',()=>{
 const f=fixture();try{const d=structuredClone(f.dna),r=d.timeline[0];r.basis='unknown';r.observationIds=[];r.attention=Object.fromEntries(ATTENTION_AXES.map(k=>[k,null]));r.pacing=Object.fromEntries(PACING_AXES.map(k=>[k,null]));
  assert.equal(validateArtistic(d,f.opts).timeline[0].pacing.cameraEnergy,null);r.basis='still';r.observationIds=['push'];r.attention.informationDensity=0;assert.equal(validateArtistic(d,f.opts).timeline[0].attention.informationDensity,0);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
