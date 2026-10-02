import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { json, save, inside, round, mean } from './common.mjs';
import { motionCurve } from './metrics.mjs';
import { relationship } from './audiovisual.mjs';
import { TECHNIQUE_ATLAS, TRANSITION_FAMILIES } from './atlas.mjs';
export const SECTIONS = ['STORY STRUCTURE','SHOT LIST','PACING','SHOT-SCALE PROGRESSION','COMPOSITION','CAMERA LANGUAGE','MOTION LANGUAGE','TRANSITION LANGUAGE','DEPTH/LAYERS','TYPOGRAPHY','LIGHT/COLOR','EFFECTS','AUDIO','MUSIC/EDIT RELATIONSHIP','LIKELY IMPLEMENTATION TECHNIQUES','WHAT MAKES IT FEEL EXPENSIVE','WHAT DOES NOT MATTER','WHAT SHOULD NOT BE COPIED','WHAT OUR STUDIO CAN IMPROVE'];
export function blueprint(meta, shots, transitions, motion) {
  return { version: 1, status: 'PROVISIONAL — visual review required', assetPolicy: 'original neutral assets; reference brands/media/audio not reused', engine: 'native', externalEngine: null, duration: meta.duration, viewport: { aspect: meta.width/meta.height },
    shots: shots.map(s => {
      const pairs = motion.pairs.filter(p => p.start >= s.start && p.t < s.end), dx = pairs.reduce((v,p)=>v+p.dx,0), dy=pairs.reduce((v,p)=>v+p.dy,0);
      const zoom=Math.max(.75,Math.min(1.4,pairs.filter(p=>p.globalValid).reduce((v,p)=>v*(p.scale||1),1)));
      const curve = motionCurve(pairs), trans = transitions.find(t => Math.abs(t.t-s.end)<.05);
      return { id:s.id, start:s.start,end:s.end,duration:s.duration,scale:{value:'medium',confidence:0,observed:false}, composition:{alignment:'center',negativeSpace:'upper third',status:'neutral scaffold, not observed'}, focalPoint:[.5,.55],
        probableLayers:[], neutralLayers:[{id:'background',depth:.4},{id:'hero',depth:1},{id:'foreground',depth:1.8},{id:'type',depth:null}],
        camera:{method:pairs.some(p=>p.globalValid)?'affine-flow hypothesis':'translation hypothesis',confidence:mean(pairs.map(p=>p.confidence||0)),keys:[{t:s.start,x:0,y:0,zoom:1,focus:1,aperture:3},{t:s.end,x:-Math.max(-.18,Math.min(.18,dx)),y:-Math.max(-.12,Math.min(.12,dy)),zoom,focus:1,aperture:3}], timing:curve},
        focus:{observed:false,from:1,to:1},objectMotion:{observed:false,kind:'neutral settle demonstration',primitive:'spring'},transition:{family:trans?.likelyTechnique||'hard editorial cut',primitive:TRANSITION_FAMILIES[trans?.likelyTechnique]||'cut',duration:trans?.duration||0,confidence:trans?.confidence||0},
        typeBehavior:{observed:false,style:'mask',per:'word',stagger:.06,start:s.start+Math.min(.7,s.duration*.35),end:s.end-.1,sizeRatio:.07,alignment:'center',direction:'ltr',weight:600,tracking:0,text:'FORM IN MOTION'},lighting:{observed:false,style:'neutral diffuse'},audioCue:{kind:'candidate only',t:s.start},approvedForReconstruction:false, importantTimestamps:s.frames.map(f=>f.t), evidence:s.frames.map(f=>f.file) };
    }) };
}
export function writeAnalysis(dir) {
  const meta=json(join(dir,'metadata.json')), shots=json(join(dir,'shots.json')), transitions=json(join(dir,'transitions.json')), motion=json(join(dir,'motion.json')), audio=json(join(dir,'audio.json')), rel=json(join(dir,'audio-visual-map.json'));
  const reviewed = existsSync(join(dir,'visual-review.json')) ? json(join(dir,'visual-review.json')) : null;
  const defaults = {
    'SHOT LIST': shots.map(s=>`${s.id}: ${s.start.toFixed(3)}–${s.end.toFixed(3)} s (${s.duration.toFixed(3)} s), evidence: ${s.frames.map(f=>f.file).join(', ')}`).join('\n'),
    PACING:`${shots.length} candidate shots; mean length ${round(mean(shots.map(s=>s.duration)),2)} s. Boundaries require visual confirmation; rapid motion can create false cuts.`,
    'CAMERA LANGUAGE':`${motion.engine||'native translation fallback'}; ${motion.pairs.length} temporal measurements. Whole-scene animation remains an alternative to physical camera movement.`,
    'MOTION LANGUAGE':'Measured velocity/acceleration are in motion.json. Easing descriptions are perceptual hypotheses, not exact functions.',
    'TRANSITION LANGUAGE':transitions.map(t=>`${t.t.toFixed(3)} s: observed ${t.observedResult}; likely ${t.likelyTechnique}; confidence ${t.confidence}; alternatives ${t.alternatives.join(', ')}; strip ${t.strip||'unavailable'}`).join('\n')||'No transition detected; inspect overview for missed boundaries.',
    AUDIO:audio.available?`Analyzer ${audio.map.analyzer}; tempo estimate ${audio.map.tempo?.bpm} BPM, confidence ${audio.map.tempo?.confidence}. Beat/downbeat grids are candidates, not ground truth.`:`Unavailable: ${audio.reason}`,
    'MUSIC/EDIT RELATIONSHIP':rel.events.map(e=>`${e.t.toFixed(3)} s: ${e.visual}, nearest onset offset ${e.onsetOffset??'unavailable'} s; beat offset ${e.beatOffset??'unavailable'} s. ${e.interpretation}`).join('\n')||'No reliable audio-visual correspondence measured.',
    'LIKELY IMPLEMENTATION TECHNIQUES':'Consult technique-map.json and the atlas. Candidate signatures are consistent with multiple renderers; no source-code or software identification is claimed.',
    'WHAT SHOULD NOT BE COPIED':'Reference brand, copy, identities, music, exact appearance or distinctive creative execution. Retain reusable timing/composition principles and confirm asset rights.',
  };
  const report = [`# Reference visual grammar`, `\nStatus: ${reviewed?'VISUALLY REVIEWED (reviewer attestation)':'MACHINE EVIDENCE COMPLETE; VISUAL INTERPRETATION PENDING'}`, `\n${meta.width}×${meta.height}, ${round(meta.duration,3)} s, route ${meta.route}.`, '\nStart with evidence-pack.json and contact-sheets/. Open only targeted full-resolution frames. Stills cannot prove movement, persuasion or music fit.'];
  for(const heading of SECTIONS) report.push(`\n## ${heading}\n\n${reviewed?.sections?.[heading]||defaults[heading]||'Not inferred automatically. Visually inspect the evidence and record the principle, evidence/timecodes, confidence and alternatives.'}`);
  report.push('\n## Limits\n\n'+[...(meta.limitations||[]),...(motion.limitations||[]),'Low-cost visual-change/focus/light/reveal signals are candidates requiring inspection.','Semantic typography, layer stacks and artistic effectiveness require visual review.'].map(x=>'- '+x).join('\n'));
  writeFileSync(join(dir,'analysis.md'),report.join('\n'));
}
export function applyReview(dir, review) {
  if(!review.reviewer||!Array.isArray(review.viewedEvidence)||!review.viewedEvidence.length||!review.sections) throw new Error('Review requires reviewer, viewedEvidence and all report sections');
  for(const file of review.viewedEvidence) if(!existsSync(inside(dir,file))||!/\.(png|jpg|webp)$/i.test(file)) throw new Error('Review evidence must name real pack images: '+file);
  for(const h of SECTIONS) if(typeof review.sections[h]!=='string'||!review.sections[h].trim()) throw new Error('Missing reviewed section: '+h);
  const plan=json(join(dir,'recreation-plan.json'));
  for(const patch of review.shots||[]) {
    const shot=plan.shots.find(s=>s.id===patch.id); if(!shot)throw new Error('Unknown shot '+patch.id);
    for(const k of ['composition','scale','focalPoint','probableLayers','camera','focus','objectMotion','transition','typeBehavior','lighting','audioCue','importantTimestamps','approvedForReconstruction']) if(patch[k]!==undefined)shot[k]=patch[k];
    if(!Array.isArray(shot.focalPoint)||shot.focalPoint.length!==2||shot.focalPoint.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Focal point must be normalized');
    if(!shot.camera?.keys?.length||shot.camera.keys.some(k=>!Number.isFinite(k.t)||k.t<shot.start||k.t>shot.end||['x','y','zoom','focus','aperture'].some(f=>!Number.isFinite(k[f]))||k.zoom<=0||k.zoom>4||k.focus<=0||k.aperture<0))throw new Error('Invalid native camera keys');
    if(shot.camera.keys.some((k,i,a)=>i&&k.t<=a[i-1].t))throw new Error('Camera keys must be strictly increasing');
    if(!['mask','rise','fade','blur','scale'].includes(shot.typeBehavior?.style))throw new Error('Unsupported native typography reveal');
    if(!Object.values(TRANSITION_FAMILIES).includes(shot.transition?.primitive))throw new Error('Unsupported native transition');
    for(const layer of shot.probableLayers||[]) if(!layer.evidence||!Number.isFinite(layer.confidence)||layer.confidence<0||layer.confidence>1||!layer.reproduce)throw new Error('Each inferred layer needs evidence, confidence and reproduce');
  }
  const transitions=json(join(dir,'transitions.json'));
  for(const patch of review.transitions||[]){const target=transitions.find(t=>Math.abs(t.t-patch.t)<.01);if(!target||!patch.observedResult||!TRANSITION_FAMILIES[patch.likelyTechnique]||!Number.isFinite(patch.confidence)||patch.confidence<0||patch.confidence>1||!patch.alternatives?.length)throw new Error('Transition review needs existing timestamp, observation, family, confidence and alternatives');Object.assign(target,{observedResult:patch.observedResult,likelyTechnique:patch.likelyTechnique,confidence:patch.confidence,alternatives:patch.alternatives});}
  for(const h of review.hypotheses||[]) if(!h.observedResult||!h.likelyTechnique||!Number.isFinite(h.confidence)||h.confidence<0||h.confidence>1||!h.alternatives?.length||!h.evidence?.length)throw new Error('Technique hypotheses need observation, alternatives, confidence and evidence');
  for(const e of review.visualEvents||[])if(!Number.isFinite(e.t)||e.t<0||e.t>=plan.duration||typeof e.kind!=='string'||!e.kind.trim())throw new Error('Visual events need a valid timestamp and observed kind');
  if((review.visualEvents||[]).length>32)throw new Error('Keep observed visual events compact (<=32)');
  const av=json(join(dir,'audio-visual-map.json'));save(join(dir,'audio-visual-map.json'),relationship(json(join(dir,'audio.json')),[...av.events.map(e=>({t:e.t,kind:e.kind||e.visual})),...(review.visualEvents||[])]));
  save(join(dir,'transitions.json'),transitions);
  const evidence=json(join(dir,'evidence-pack.json'));save(join(dir,'evidence-pack.json'),{...evidence,status:'VISUALLY_REVIEWED_REVIEWER_ATTESTATION',reviewer:review.reviewer});
  const job=json(join(dir,'job.json'));save(join(dir,'job.json'),{...job,visualReview:'REVIEWER_ATTESTATION',reviewer:review.reviewer});
  plan.reconstructionReady=plan.shots.every(s=>s.approvedForReconstruction===true);
  plan.status='REVIEWED — interpretation, not recovered source';plan.reviewer=review.reviewer;
  save(join(dir,'visual-review.json'),{...review,at:new Date().toISOString(),motionPlaybackInspected:review.motionPlaybackInspected===true,audioListened:review.audioListened===true});
  save(join(dir,'technique-map.json'),{atlas:TECHNIQUE_ATLAS,hypotheses:review.hypotheses||[],rule:'Observable signatures do not prove implementation software'});save(join(dir,'recreation-plan.json'),plan);writeAnalysis(dir);return plan;
}
