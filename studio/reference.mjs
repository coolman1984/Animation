#!/usr/bin/env node
import { resolve, join } from 'node:path';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { analyze, refine } from './reference/analyze.mjs';
import { originalDirection } from './reference/artistic.mjs';
import { applyReview } from './reference/report.mjs';
import { reconstruct, compare } from './reference/recreate.mjs';
import { packPath, json, save, STUDIO } from './reference/common.mjs';
export async function main(args=process.argv.slice(2)){
  const [cmd,source,other,...rest]=args;const flags=[other,...rest].filter(x=>x?.startsWith('--'));
  const values=Object.fromEntries(flags.map(x=>{const i=x.indexOf('=');return i<0?[x.slice(2),true]:[x.slice(2,i),x.slice(i+1)];}));
  const num=(k,d)=>values[k]===undefined?d:Number(values[k]);
  const range=values.range?String(values.range).split(':').map(Number):undefined;
  if(cmd==='analyze')return analyze(source,{slug:values.slug,out:values.out,browser:values.browser===true,selector:values.selector,frameURL:values.frame,playSelector:values['play-selector'],rights:values.rights,maxFrames:num('max-frames',72),maxDuration:num('max-duration',300),maxMB:num('max-mb',128),width:num('width',1280),motion:values.motion||'auto',sceneEngine:values['scene-engine']||'ffmpeg',audioEngine:values['audio-engine']||'node'});
  if(!source)throw new Error('Usage: node reference.mjs analyze <media-or-page> | review <pack> --observations=file | refine <pack> --range=a:b --reason=text | reconstruct <pack> [--study] | compare <pack> <our-film> | direct <pack> --brief=file | learn <pack> --lesson=file');
  const dir=packPath(source);
  if(cmd==='review'){if(!values.observations)throw new Error('Supply --observations=review.json');applyReview(dir,json(resolve(values.observations)));return join(dir,'analysis.md');}
  if(cmd==='direct'){if(!values.brief)throw new Error('Supply --brief=original-direction.json');return originalDirection(dir,json(resolve(values.brief)));}
  if(cmd==='refine')return refine(dir,{range,reason:values.reason,count:num('samples',8)});
  if(cmd==='reconstruct')return reconstruct(dir,{start:range?.[0],duration:range?range[1]-range[0]:num('duration',5),width:num('width',640),study:values.study===true});
  if(cmd==='compare')return compare(dir,other,{refStart:num('ref-start'),ourStart:num('our-start'),duration:num('duration'),samples:num('samples',9)});
  if(cmd==='learn'){
    const review=json(join(dir,'visual-review.json')),lesson=values.lesson?json(resolve(values.lesson)):null;
    if(!review.motionPlaybackInspected||!lesson?.principle||!lesson?.evidence||!lesson?.counterCase||!lesson?.application||!Number.isFinite(lesson?.confidence)||lesson.confidence<=0||lesson.confidence>1)throw new Error('Learn needs an inspected-motion review and a concise principle/evidence/counterCase/application/confidence record');
    if(/copy|same (color|colour)|use.*like reference/i.test(lesson.principle))throw new Error('Store a transferable principle, not reference appearance');
    const file=join(STUDIO,'reference/lessons.json'),all=existsSync(file)?json(file):[];
    if(all.some(x=>x.principle.toLowerCase()===lesson.principle.toLowerCase()))throw new Error('Duplicate principle');
    all.push({...lesson,reference:source,at:new Date().toISOString(),reviewer:review.reviewer});save(file,all);return file;
  }
  throw new Error('Unknown reference command '+cmd);
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href)main().then(r=>console.log(typeof r==='string'?r:JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
