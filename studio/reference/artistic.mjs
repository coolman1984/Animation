// Artistic judgments come from inspected evidence, never optical-flow scores or colour stereotypes.
import { join } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { inside, json, save } from './common.mjs';
export const ARTISTIC_SECTIONS = [
  'STYLE LANGUAGE','EMOTIONAL ARC','ATTENTION CURVE','PACING CURVE','VISUAL HIERARCHY',
  'COLOUR PSYCHOLOGY IN CONTEXT','LIGHT AND SHADOW LANGUAGE','CAMERA PSYCHOLOGY','MOTION CHARACTER',
  'SURPRISE AND NOVELTY','TENSION AND RELEASE','INFORMATION DENSITY','HOOK MECHANICS','BOREDOM RISKS',
  'PAYOFF STRUCTURE','WHAT MAKES THE WORK MEMORABLE','WHAT MAKES IT FEEL PREMIUM','WHAT IS PURE DECORATION',
  'WHAT SHOULD BE LEARNED','WHAT SHOULD NOT BE COPIED'
];
export const PACING_AXES = ['visualEnergy','informationDensity','cameraEnergy','editFrequency','motionDensity','audioEnergy','emotionalIntensity'];
export const ATTENTION_AXES = ['hookStrength','novelty','informationDensity','visualChange','motionIntensity','soundIntensity'];
export const ARTISTIC_LAYERS = ['visualArtLanguage','emotionalPerceptualEffect','attentionRetention','directorialPacing','cinematicIntent'];
export const VISUAL_TOPICS = ['composition','negative space','balance','symmetry/asymmetry','visual weight','scale relationships','shape language','texture','material feeling','depth','foreground/background','light','shadow','contrast','colour relationships','image density','visual rhythm','symbolism','metaphor','abstraction','realism/stylisation'];
const fail = message => { throw new Error('Artistic review: '+message); };
const words = v => typeof v === 'string' && v.trim().length > 0;
const confidence = v => Number.isFinite(v) && v >= 0 && v <= 1;
const md = v => String(v ?? 'unknown').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
function range(item, duration) {
  if (!Number.isFinite(item.start) || !Number.isFinite(item.end) || item.start < 0 || item.end <= item.start || item.end > duration + .001) fail('invalid time range');
}
export function artisticScaffold(duration, shots = []) {
  return {version:1,status:'PENDING_ARTISTIC_REVIEW',duration,scale:'0–5 reviewer estimates; null means unknown. Not measured retention or universal psychology.',
    layers:ARTISTIC_LAYERS,visualTopics:VISUAL_TOPICS,
    sections:Object.fromEntries(ARTISTIC_SECTIONS.map(h=>[h,{summary:'Not assessed. Inspect visible decisions and explain why they may work for this viewer/context.',observationIds:[],status:'not-assessed'}])),
    layerCoverage:Object.fromEntries(ARTISTIC_LAYERS.map(k=>[k,'not-assessed'])),observations:[],timeline:[],suggestedRanges:shots.map(s=>({start:s.start,end:s.end,shot:s.id,evidenceCoverage:s.evidenceCoverage||'unknown'})),
    limitations:['No automatic style label, emotional claim, attention score or creative intention inferred from pixels.','Still frames cannot establish pacing, retention, camera velocity or sound fit.','Actual audience retention needs viewer data.']};
}
export function validateArtistic(dna, {duration,dir,review,audioAvailable}) {
  if(dna?.autoSections===true && Array.isArray(dna.observations)) {
    for(const o of dna.observations)if(!Array.isArray(o.topics)||o.topics.some(h=>!ARTISTIC_SECTIONS.includes(h)))fail('autoSections needs valid observation topics');
    dna={...dna,sections:Object.fromEntries(ARTISTIC_SECTIONS.map(h=>{
      const decisions=dna.observations.filter(o=>o.topics.includes(h));
      return [h,decisions.length?{status:'reviewed',observationIds:decisions.map(o=>o.id),summary:decisions.map(o=>`${o.observedChoice} → ${o.likelyIntention} (confidence ${o.confidence}).`).join(' ')}:{status:'not-assessed',observationIds:[],summary:'Not assessed; no inspected decision supplied for this topic.'}];
    }))};
  }
  if (!dna || dna.version !== 1 || !Array.isArray(dna.observations) || dna.observations.length > 80 || !Array.isArray(dna.timeline) || !dna.timeline.length || dna.timeline.length > 48) fail('version 1, <=80 observations and 1–48 whole-film timeline intervals required');
  if (!words(dna.context?.viewer) || !words(dna.context?.purpose) || !words(dna.context?.viewingSituation)) fail('viewer, purpose and viewingSituation required');
  const ids = new Set();
  for (const o of dna.observations) {
    if (!words(o.id) || ids.has(o.id)) fail('unique observation ids required'); ids.add(o.id);
    range(o,duration);
    for (const k of ['observedChoice','likelyIntention','context','whyItMayWork','alternative','transferablePrinciple','counterCase']) if (!words(o[k])) fail('observation '+o.id+' needs '+k);
    if (!ARTISTIC_LAYERS.includes(o.layer) || !['still','motion','audio'].includes(o.basis) || !confidence(o.confidence)) fail('layer, basis and confidence required');
    if (o.basis === 'motion' && review.motionPlaybackInspected !== true) fail('motion claims require inspected playback');
    if (o.basis === 'audio' && (review.audioListened !== true || !audioAvailable)) fail('audio claims require available, listened audio');
    if (!Array.isArray(o.evidence) || !o.evidence.length) fail('timestamped evidence required');
    for (const e of o.evidence) if (!words(e.file) || !review.viewedEvidence.includes(e.file) || !existsSync(inside(dir,e.file)) || !Number.isFinite(e.t) || e.t < o.start || e.t > o.end) fail('evidence must be viewed pack images with timecodes in the observation range');
  }
  const refs = list => { if (!Array.isArray(list) || list.some(id=>!ids.has(id))) fail('unknown observation reference'); };
  for (const h of ARTISTIC_SECTIONS) {
    const s=dna.sections?.[h]; if (!words(s?.summary) || !['reviewed','not-assessed'].includes(s.status)) fail('missing section '+h);
    refs(s.observationIds); if (s.status==='reviewed' && !s.observationIds.length) fail('reviewed sections need evidence-linked observations: '+h);
  }
  let cursor=0;
  for (const row of dna.timeline) {
    range(row,duration); if (Math.abs(row.start-cursor)>.001) fail('timeline must cover the whole film without gaps/overlaps; mark unseen intervals unknown'); cursor=row.end;
    if (!['still','motion','unknown'].includes(row.basis) || !confidence(row.confidence) || !words(row.why) || !words(row.narrativeRole)) fail('timeline basis, confidence, narrativeRole and why required');
    refs(row.observationIds); if(row.basis!=='unknown' && !row.observationIds.length) fail('timeline needs evidence-linked observations');
    if(row.basis==='motion' && review.motionPlaybackInspected!==true) fail('pacing needs inspected playback');
    for (const [key,axes] of [['attention',ATTENTION_AXES],['pacing',PACING_AXES]]) for (const axis of axes) {
      const value=row[key]?.[axis]; if (value!==null && (!Number.isFinite(value)||value<0||value>5)) fail('ratings must be 0–5 or null: '+axis);
      if (value!==null && (row.basis==='unknown'||(row.basis==='still'&&!(key==='attention'&&axis==='informationDensity')))) fail('unseen/still-only temporal ratings must remain null');
      if (value!==null && ['soundIntensity','audioEnergy'].includes(axis) && (review.audioListened!==true||!audioAvailable)) fail('audio energy needs listened audio; otherwise null');
    }
    for(const key of ['firstNotice','expectation','delayedAnswer','microPayoff','majorPayoff','quietMoment','patternBreak','repetition','boredomRisk','overloadRisk','slowingOpportunity']) if (!words(row[key])) fail('timeline needs '+key+' (use unknown or none when appropriate)');
  }
  if(Math.abs(cursor-duration)>.001) fail('timeline must end at film duration');
  return {...dna,layerCoverage:Object.fromEntries(ARTISTIC_LAYERS.map(k=>[k,dna.observations.some(o=>o.layer===k)?'evidence-linked interpretation':'not-assessed'])),status:'REVIEWER_INTERPRETATION',duration,scale:'0–5 subjective reviewer estimates; null unknown. Not audience retention measurements.',reviewer:review.reviewer,
    motionPlaybackInspected:review.motionPlaybackInspected===true,audioListened:review.audioListened===true,
    limitations:['Effects depend on viewer, culture, message and viewing situation.','Intention is inferred; effectiveness and retention need audience evidence.','Unknown intervals/axes remain unknown; zero is an assessed low value.']};
}
function table(timeline,key,axes) {
  if(!timeline.length)return 'Pending inspected whole-film timeline; no curve fabricated.';
  return ['| Seconds | '+axes.join(' | ')+' | Basis / confidence |','|---|'+axes.map(()=>'---').join('|')+'|---|',...timeline.map(r=>`| ${r.start}–${r.end} | ${axes.map(a=>r[key][a]??'?').join(' | ')} | ${md(r.basis)} / ${r.confidence} |`)].join('\n');
}
export function renderArtistic(dna) {
  const out=['## ARTISTIC DNA',`Status: ${dna.status}. ${dna.scale}`,dna.context?`Viewer: ${md(dna.context.viewer)}. Purpose: ${md(dna.context.purpose)}. Situation: ${md(dna.context.viewingSituation)}.`:'Viewer/context not yet supplied.'];
  out.push('Five-layer coverage: '+Object.entries(dna.layerCoverage||{}).map(([k,v])=>`${k}: ${v}`).join('; '));
  for(const h of ARTISTIC_SECTIONS){const s=dna.sections[h];out.push(`### ${h}\n\n${s.summary}\n\nEvidence observations: ${s.observationIds.join(', ')||'none — not assessed'}`);if(h==='ATTENTION CURVE')out.push(table(dna.timeline,'attention',ATTENTION_AXES));if(h==='PACING CURVE')out.push(table(dna.timeline,'pacing',PACING_AXES));}
  for(const o of dna.observations)out.push(`### Decision ${md(o.id)} (${o.start}–${o.end}s)\n\nObserved: ${o.observedChoice}\n\nLikely intention: ${o.likelyIntention}\n\nWhy it may work: ${o.whyItMayWork}\n\nContext: ${o.context}. Confidence: ${o.confidence}. Basis: ${o.basis}.\n\nAlternative: ${o.alternative}\n\nLearn: ${o.transferablePrinciple}\n\nCounter-case: ${o.counterCase}\n\nEvidence: ${o.evidence.map(e=>`${md(e.file)} @ ${e.t}s`).join(', ')}`);
  for(const r of dna.timeline)out.push(`### Viewer experience ${r.start}–${r.end}s\n\nRole: ${r.narrativeRole}. ${r.why}\n\n`+['firstNotice','expectation','delayedAnswer','microPayoff','majorPayoff','quietMoment','patternBreak','repetition','boredomRisk','overloadRisk','slowingOpportunity'].map(k=>`${k}: ${r[k]}`).join('\n\n'));
  out.push('### Interpretation limits\n\n'+dna.limitations.map(x=>'- '+x).join('\n'));return out.join('\n\n');
}
export function originalDirection(dir, brief) {
  const dna=json(join(dir,'artistic-dna.json'));
  if(dna.status!=='REVIEWER_INTERPRETATION') throw new Error('Original direction requires reviewed artistic DNA');
  for(const k of ['subject','viewer','objective','concept','visualLanguage','emotionalArc','pacingStrategy','cameraStrategy','soundStrategy','payoff','avoidCopying']) if(!words(brief[k])) throw new Error('Original direction needs '+k);
  if(!Array.isArray(brief.transformations)||!brief.transformations.length||brief.transformations.length>12)throw new Error('Use 1–12 explicit principle-to-original-execution transformations');
  for(const t of brief.transformations){for(const k of ['principle','originalExecution','whyItFitsSubject','differenceFromReference','counterCase'])if(!words(t[k]))throw new Error('Original transformation needs '+k);if(!t.observationIds?.length||t.observationIds.some(id=>!dna.observations.some(o=>o.id===id)))throw new Error('Transformation needs reviewed observation references');}
  const result={...brief,status:'REVIEWER_PROPOSED_ORIGINAL_DIRECTION',referenceReviewer:dna.reviewer,policy:'Learn grammar; create a new sentence. No imported reference artwork, characters, branding, exact composition or soundtrack. Originality is reviewer judgment, not machine certification.'};
  save(join(dir,'original-direction.json'),result);
  writeFileSync(join(dir,'original-direction.md'),'# Original creative direction\n\n'+Object.entries(result).filter(([k])=>k!=='transformations').map(([k,v])=>`## ${k}\n\n${v}`).join('\n\n')+'\n\n## Principle → original execution\n\n'+result.transformations.map(t=>`- ${t.principle} → ${t.originalExecution}. Fit: ${t.whyItFitsSubject}. Difference: ${t.differenceFromReference}. Counter-case: ${t.counterCase}. Evidence: ${t.observationIds.join(', ')}.`).join('\n'));
  return join(dir,'original-direction.md');
}

// Prepare paperwork and candidate evidence only; the agent still opens the actual images/playback.
export function prepareReview(dir) {
  const file=join(dir,'review-draft.json');if(existsSync(file))throw new Error('Review draft already exists; edit it without overwriting work');
  const template=json(join(import.meta.dirname,'review-template.json')),meta=json(join(dir,'metadata.json')),shots=json(join(dir,'shots.json'));
  const dna=artisticScaffold(meta.duration,shots),blank=template.artisticDNA.timeline[0];
  const count=Math.min(12,Math.max(1,shots.length)),bounds=Array.from({length:count+1},(_,i)=>i===count?meta.duration:shots.length?shots[Math.floor(i*shots.length/count)].start:0);
  dna.autoSections=true;dna.context=template.artisticDNA.context;
  dna.timeline=Array.from({length:count},(_,i)=>({...structuredClone(blank),start:bounds[i],end:bounds[i+1],suggestedEvidence:shots.filter(s=>s.start>=bounds[i]&&s.start<bounds[i+1]).flatMap(s=>s.frames.map(f=>({file:f.file,t:f.t}))).slice(0,9)}));
  template.artisticDNA=dna;
  template.sections=Object.fromEntries(Object.keys(template.sections).map(h=>[h,'Not visually interpreted yet. Machine evidence remains in analysis.md; replace this where inspected evidence supports a technical conclusion.']));
  template.workflowNote='Open suggested evidence first; record actual viewedEvidence. Write each important observation once with topics from ARTISTIC_SECTIONS. autoSections routes it into the report. Set reviewer/context and honest playback/listening flags. Keep unknown timeline fields/axes unchanged when uninspected. Never treat this prepared draft as a completed review.';
  save(file,template);return file;
}
