import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyze, refine } from '../reference/analyze.mjs';
import { compare, reconstruct, representativeRange, segmentPlan } from '../reference/recreate.mjs';
import { json, work, safeURL, inside } from '../reference/common.mjs';
import { translation, seriesMetrics } from '../reference/metrics.mjs';
import { SECTIONS, applyReview } from '../reference/report.mjs';
import { serve } from '../lib/serve.mjs';
import { browserSource } from '../reference/browser.mjs';
const render=process.env.STUDIO_RENDER_TEST==='1';
async function seekableServer(dir){
 const server=createServer((req,rsp)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);if(!['index.html','reference.mp4'].includes(name)){rsp.writeHead(404);return rsp.end();}
  const body=readFileSync(join(dir,name)),type=name.endsWith('.mp4')?'video/mp4':'text/html';
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  if(range){const a=Number(range[1]),b=Math.min(body.length-1,range[2]?Number(range[2]):body.length-1);if(a>b){rsp.writeHead(416,{'content-range':`bytes */${body.length}`});return rsp.end();}rsp.writeHead(206,{'content-type':type,'accept-ranges':'bytes','content-range':`bytes ${a}-${b}/${body.length}`,'content-length':b-a+1});return rsp.end(body.subarray(a,b+1));}
  rsp.writeHead(200,{'content-type':type,'content-length':body.length,'accept-ranges':'bytes'});rsp.end(body);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return {port:server.address().port,close:()=>server.close()};
}
async function fixture(dir){
  const file=join(dir,'reference.mp4');
  await work('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=320x180:rate=24:duration=4','-f','lavfi','-i','smptebars=size=320x180:rate=24:duration=4','-f','lavfi','-i','sine=frequency=440:sample_rate=22050:duration=8','-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[v]','-map','[v]','-map','2:a','-c:v','libx264','-threads','1','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac',file]);return file;
}
test('motion distinguishes small global translations, static holds and cut crossings',()=>{
  const a=Buffer.alloc(160*90);for(let y=0;y<90;y++)for(let x=0;x<160;x++)a[y*160+x]=(x*47+y*31+x*y)%255;
  const b=Buffer.alloc(a.length);for(let y=0;y<90;y++)for(let x=2;x<160;x++)b[y*160+x]=a[y*160+x-2];
  const m=translation(a,b);assert.equal(m.dx,2/160);assert.equal(m.dy,0);
  assert.equal(translation(a,a).magnitude,0);assert.equal(seriesMetrics([a,b],[0,.2],[.1]).pairs.length,0);
  assert.throws(()=>safeURL('https://user:password@example.com/a'),/credentials/);assert.throws(()=>inside('/tmp/pack','../escape'),/inside/);
});
test('local reference creates bounded scientific evidence, reports unknown semantics, compares matched timelines and refines without corrupting provenance',{timeout:120000},async()=>{
  const dir=mkdtempSync(join(tmpdir(),'reference-test-'));
  try{
    const source=await fixture(dir),pack=await analyze(source,{out:join(dir,'pack'),maxFrames:36,motion:'none'});
    const evidence=json(join(pack,'evidence-pack.json')),meta=json(join(pack,'metadata.json')),shots=json(join(pack,'shots.json'));
    assert.ok(evidence.extracted<=36);assert.ok(evidence.uniqueForVision<evidence.extracted);assert.equal(evidence.sourceDurationSeconds,8);assert.equal(meta.width,320);assert.ok(json(join(pack,'scientific-summary.json')).audiovisualCandidates.length<=24);assert.equal(meta.audio.channels,1);assert.ok(shots.some(s=>Math.abs(s.start-4)<.1));assert.ok(shots.every(s=>s.frames.length===3));
    assert.ok(existsSync(join(pack,'contact-sheets/overview-1.png')));assert.ok(json(join(pack,'transitions.json'))[0].strip);assert.equal(json(join(pack,'audio.json')).available,true);
    assert.ok(json(join(pack,'frames.json')).some(f=>Math.abs(f.actual-f.requested)<1/24+.01));
    assert.equal(json(join(pack,'job.json')).status,'DONE_MACHINE_PACK');assert.match(json(join(pack,'recreation-plan.json')).status,/PROVISIONAL/);
    assert.throws(()=>applyReview(pack,{reviewer:'fake',viewedEvidence:['missing.png'],sections:{}}),/real pack images/);
    await assert.rejects(reconstruct(pack,{}),/Visual review/);
    const c=await compare(pack,source,{refStart:2,ourStart:2,duration:4,samples:3});assert.equal(c.pairs.length,3);assert.ok(c.motionCurves.every(p=>p.referenceSpeed===p.ourSpeed));
    const review={reviewer:'schema fixture',viewedEvidence:['contact-sheets/overview-1.png'],sections:Object.fromEntries(SECTIONS.map(s=>[s,'Fixture observation with uncertainty.'])),visualEvents:[{t:2,kind:'observed typography entrance'}]};applyReview(pack,review);assert.equal(json(join(pack,'recreation-plan.json')).reconstructionReady,false);assert.match(json(join(pack,'evidence-pack.json')).status,/VISUALLY_REVIEWED/);await assert.rejects(reconstruct(pack,{}),/explicit approval/);assert.ok(json(join(pack,'audio-visual-map.json')).events.some(e=>e.visual==='observed typography entrance'));
    const before=json(join(pack,'source.json'));const refined=await refine(pack,{range:[3.95,4.05],reason:'inspect hard-cut boundary',count:3});assert.ok(existsSync(join(refined,'strip.png')));assert.deepEqual(json(join(pack,'source.json')),before);
    await assert.rejects(refine(pack,{range:[0,4],reason:'too much'}),/<=2s/);await assert.rejects(analyze(source,{out:pack}),/already exists/);
    const plan=json(join(pack,'recreation-plan.json')),range=representativeRange(plan,{start:2,duration:5}),segment=segmentPlan(plan,range);assert.equal(segment.duration,5);assert.ok(segment.shots.every(s=>s.start>=0&&s.end<=5));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('direct media URL streams through FFmpeg; protected manifests are refused',{timeout:120000},async()=>{
  const dir=mkdtempSync(join(tmpdir(),'reference-url-'));let srv;
  try{await fixture(dir);writeFileSync(join(dir,'protected.m3u8'),'#EXTM3U\n');srv=await serve(dir);const base=`http://127.0.0.1:${srv.port}`;
    const pack=await analyze(base+'/reference.mp4',{out:join(dir,'pack'),maxFrames:24,motion:'none'});assert.equal(json(join(pack,'source.json')).route,'direct-url');
    await assert.rejects(analyze(base+'/protected.m3u8',{out:join(dir,'blocked')}),/manifests/);assert.equal(json(join(dir,'blocked/job.json')).status,'BLOCKED');
  }finally{srv?.close();rmSync(dir,{recursive:true,force:true});}
});
test('browser video seeks record actual timestamps; native neutral reconstruction and comparison render',{skip:!render,timeout:180000},async()=>{
  const dir=mkdtempSync(join(tmpdir(),'reference-browser-'));let srv,handle;
  try{
    const src=await fixture(dir);writeFileSync(join(dir,'index.html'),'<video controls width="640" src="reference.mp4"></video>');srv=await seekableServer(dir);
    handle=await browserSource(`http://127.0.0.1:${srv.port}/index.html`);assert.equal(handle.metadata.duration,8);assert.equal(handle.metadata.width,320);assert.ok(handle.metadata.seekable.length);
    const f=await handle.frame(2.5,join(dir,'browser.png'));assert.ok(Math.abs(f.actual-2.5)<.02);assert.ok(['requestVideoFrameCallback','currentTime-after-seeked'].includes(f.timestampSource));assert.ok(existsSync(join(dir,'browser.png')));await handle.close();handle=null;
    const pack=await analyze(src,{out:join(dir,'pack'),maxFrames:24,motion:'none'}),plan=json(join(pack,'recreation-plan.json'));
    const review={reviewer:'fixture schema exercise (not artistic certification)',viewedEvidence:['contact-sheets/overview-1.png'],sections:Object.fromEntries(SECTIONS.map(s=>[s,'Test fixture only; visual/artistic judgment not exercised here.'])),shots:plan.shots.map(s=>({id:s.id,approvedForReconstruction:true})),hypotheses:[]};applyReview(pack,review);
    const result=await reconstruct(pack,{start:2,duration:5,width:320});assert.equal(result.rendered.frames,150);assert.ok(existsSync(result.output));
    const c=await compare(pack,result.output,{samples:3});assert.equal(c.refStart,2);assert.equal(c.duration,5);assert.ok(existsSync(join(c.folder,'comparison.json')));
  }finally{await handle?.close();srv?.close();rmSync(dir,{recursive:true,force:true});}
});

test('optional Python engines analyze motion, adaptive shots and music together',{skip:process.env.REFERENCE_PYTHON_TEST!=='1',timeout:180000},async()=>{
  const dir=mkdtempSync(join(tmpdir(),'reference-python-'));
  try{const source=await fixture(dir),pack=await analyze(source,{out:join(dir,'pack'),maxFrames:24,motion:'python',sceneEngine:'python',audioEngine:'python'});
    assert.match(json(join(pack,'motion.json')).engine,/opencv/i);assert.ok(json(join(pack,'motion.json')).pairs.length>10);
    assert.match(json(join(pack,'detected-boundaries.json')).engine,/PySceneDetect/);assert.ok(json(join(pack,'shots.json')).some(s=>Math.abs(s.start-4)<.1));
    assert.match(json(join(pack,'audio.json')).map.analyzer,/librosa/i);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('a static silent reference deduplicates to one visual cell without inventing audio',{timeout:60000},async()=>{
 const dir=mkdtempSync(join(tmpdir(),'reference-static-'));
 try{const src=join(dir,'static.mp4');await work('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=navy:s=320x180:r=24:d=3','-c:v','libx264','-threads','1',src]);
  const pack=await analyze(src,{out:join(dir,'pack'),maxFrames:24,motion:'none'});assert.equal(json(join(pack,'evidence-pack.json')).uniqueForVision,1);assert.equal(json(join(pack,'audio.json')).available,false);assert.ok(existsSync(join(pack,'contact-sheets/evidence-1.png')));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
