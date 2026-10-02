// Inspect only normally playable HTML media. No network interception, decryption or stream extraction.
import { launch } from '../lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { publicURL } from './common.mjs';
const bounded = (promise, ms, label) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(label + ' timed out')), ms); promise.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });
export async function browserSource(url, { selector, frameURL, playSelector, timeout = 12000 } = {}) {
  const client = await bounded(launch({ width: 1920, height: 1080 }), 25000, 'Chromium launch');
  const send=client.send.bind(client);client.send=(method,args)=>bounded(send(method,args),method==='Runtime.evaluate'?2*timeout+2000:timeout,'CDP '+method);
  let context;
  const evaluate = async expr => {
    const r = await bounded(client.send('Runtime.evaluate', { expression: expr, contextId: context, awaitPromise: true, returnByValue: true }), 2*timeout + 1500, 'Media evaluation');
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  try {
    await client.send('Page.addScriptToEvaluateOnNewDocument', { worldName: 'reference-inspect', source: `window.__refEncrypted = new WeakSet(); document.addEventListener('encrypted', e => window.__refEncrypted.add(e.target), true);` });
    await bounded(client.goto(url), timeout, 'Page navigation');
    const tree = await client.send('Page.getFrameTree');
    const flatten = f => [f.frame, ...(f.childFrames || []).flatMap(flatten)];
    const choices = [];
    for (const frame of flatten(tree.frameTree)) {
      if (frameURL && !frame.url.includes(frameURL)) continue;
      const world = await client.send('Page.createIsolatedWorld', { frameId: frame.id, worldName: 'reference-inspect' });
      context = world.executionContextId;
      if(playSelector)await evaluate(`(() => {const c=document.querySelector(${JSON.stringify(playSelector)});if(c)c.click();return true;})()`);
      const candidates = await evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(selector || 'video')})].map((v,i) => v instanceof HTMLVideoElement ? ({i,area:v.getBoundingClientRect().width*v.getBoundingClientRect().height,w:v.videoWidth,h:v.videoHeight}) : null).filter(Boolean))()`);
      for (const c of candidates) choices.push({ ...c, context, frameId:frame.id, frame: publicURL(frame.url.startsWith('http') ? frame.url : url) });
    }
    choices.sort((a, b) => b.area - a.area);
    if (!choices.length) throw new Error('No HTML video found. Canvas/custom players, sign-in walls and inaccessible frames require a supplied local video; no access bypass attempted.');
    const chosen = choices[0]; context = chosen.context;
    const selection = `document.querySelectorAll(${JSON.stringify(selector || 'video')})[${chosen.i}]`;
    await evaluate(`window.__refVideo = ${selection}; true`);
    const meta = await evaluate(`(async () => { const v=window.__refVideo; if(v.mediaKeys || window.__refEncrypted?.has(v)) throw Error('Protected media: inspection refused');
      if(v.readyState<1){v.muted=true;v.play().catch(()=>{});}
      if(v.readyState<1) await new Promise((r,j)=>{ const done=()=>{clearTimeout(timer);v.removeEventListener('loadedmetadata',done);r()}; const timer=setTimeout(()=>{v.removeEventListener('loadedmetadata',done);j(Error('Metadata unavailable; play normally or supply local media'))},${timeout});v.addEventListener('loadedmetadata',done)});
      if(v.mediaKeys || window.__refEncrypted?.has(v))throw Error('Encrypted media: inspection refused');
      v.pause(); v.preload='auto'; v.controls=false; v.scrollIntoView({block:'center'}); v.style.objectFit='contain';
      const ranges=Array.from({length:v.seekable.length},(_,i)=>[v.seekable.start(i),v.seekable.end(i)]);
      return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,seekable:ranges,source:v.currentSrc,frameAware:typeof v.requestVideoFrameCallback==='function'}; })()`);
    if (!Number.isFinite(meta.duration) || !meta.width || !meta.seekable.some(([a,b])=>b>a)) throw new Error('Finite seekable media is required; live/unloaded/protected media cannot be inspected.');
    const result = { duration: meta.duration, width: meta.width, height: meta.height, fps: null, audio: null, route: 'browser', seekable: meta.seekable, frameAware: meta.frameAware, frameURL: chosen.frame, limitations: ['Browser-only audio unavailable; supply authorized local media for audio forensics.', 'Browser seek accuracy is best effort; actual media timestamps are recorded.', 'Custom overlays may appear in compositor captures.'] };
    return {
      metadata: result,
      async frame(t, file) {
        const evidence = await evaluate(`(async () => {
          const v=window.__refVideo; if(v.mediaKeys || window.__refEncrypted?.has(v)) throw Error('Protected media: inspection refused');
          const ranges=()=>Array.from({length:v.seekable.length},(_,i)=>[v.seekable.start(i),v.seekable.end(i)]);
          const available=()=>ranges().some(([a,b])=>${t}>=a&&${t}<b);
          const deadline=performance.now()+${timeout};while(!available()&&performance.now()<deadline&&!v.error)await new Promise(r=>setTimeout(r,50));
          if(!available())throw Error('Timestamp outside loaded seekable ranges: '+JSON.stringify(ranges())+'; supply normally seekable/local media');
          v.pause(); let callbackId, frameTime=null, frameResolved;
          const awareness = new Promise(r=>{frameResolved=r; if(v.requestVideoFrameCallback) callbackId=v.requestVideoFrameCallback((_,m)=>{frameTime=m.mediaTime;r()});else r()});
          if(Math.abs(v.currentTime-${t})>0.00001 || v.readyState<2) await new Promise((r,j)=>{
            const done=()=>{clearTimeout(timer);v.removeEventListener('seeked',done);r()};
            const timer=setTimeout(()=>{v.removeEventListener('seeked',done);j(Error('Video seek timed out'))},${timeout});
            v.addEventListener('seeked',done);v.currentTime=${t};
          });
          await Promise.race([awareness,new Promise(r=>setTimeout(r,400))]);
          if(callbackId!==undefined) v.cancelVideoFrameCallback(callbackId);
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          let png=null;try{const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);png=c.toDataURL('image/png').split(',')[1]}catch{}
          const r=v.getBoundingClientRect(); return {requested:${t},actual:v.currentTime,mediaTime:frameTime,timestampSource:frameTime!==null?'requestVideoFrameCallback':'currentTime-after-seeked',png,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
        })()`);
        if (evidence.png) { writeFileSync(file, Buffer.from(evidence.png, 'base64')); evidence.capture = 'native-video-canvas'; }
        else {
          const rect = evidence.rect;
          if(chosen.frameId!==tree.frameTree.frame.id){
            const owner=await client.send('DOM.getFrameOwner',{frameId:chosen.frameId});
            const box=await client.send('DOM.getBoxModel',{backendNodeId:owner.backendNodeId});
            rect.x+=box.model.content[0];rect.y+=box.model.content[1];
          }
          if (rect.width <= 0 || rect.height <= 0 || rect.x < 0 || rect.y < 0) throw new Error('Video element is obscured/offscreen; supply local media or a suitable player page');
          const scale = Math.min(3, result.width / rect.width);
          const r = await bounded(client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...rect, scale } }), timeout, 'Video capture');
          writeFileSync(file, Buffer.from(r.data, 'base64')); evidence.capture = 'element-compositor';
        }
        delete evidence.png; return evidence;
      },
      close: () => client.close(),
    };
  } catch (e) { await client.close(); throw e; }
}
