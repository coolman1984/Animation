import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {STUDIO} from '../lib/capabilities.mjs';
import {resolveDesign,validate,build} from '../web/lib/site.mjs';
const site=()=>JSON.parse(readFileSync(join(STUDIO,'web/sites/example/site.json'),'utf8'));
test('custom identity merges safe tokens, checks contrast and registers script coverage',()=>{
 const s={...site(),theme:{tokens:{bg:'#ffffff',ink:'#182820',muted:'#384840',radius:'4px'},fonts:{display:'Readex Pro',text:'Alexandria',label:'Alexandria'}},layout:{hero:'stacked',features:'grid',width:'wide'}};
 assert.deepEqual(resolveDesign(s).errors,[]);assert.equal(resolveDesign(s).style.tokens.bg,'#ffffff');assert.equal(resolveDesign(s).layout.hero,'stacked');
 for(const theme of [{tokens:{bg:'red;display:none'}},{tokens:{ink:['#182820']}},{fonts:{display:['Readex Pro']}},{tokens:{ink:'#ffffff',bg:'#ffffff'}},{fonts:{text:'Missing font'}},{tokens:{radius:'999px'}},{fonts:{display:'Lora'}}])assert.ok(resolveDesign({...s,theme}).errors.length,JSON.stringify(theme));
 assert.ok(resolveDesign({...s,layout:{hero:'invented'}}).errors.length);
 assert.ok(validate({...s,sections:[{...s.sections[0],imageWidth:-1,imageHeight:200}]}).errors.some(e=>e.includes('image dimensions')));
});
test('different compositions and English typography generate complete independent output',()=>{
 const out=mkdtempSync(join(tmpdir(),'web-design-'));
 try {for(const hero of ['split','media-first','stacked']){
  const s={...site(),lang:'en',theme:{fonts:{display:'Lora',text:'Geist',label:'Geist'}},layout:{hero,features:'grid',width:'wide'}};
  build(s,out,{siteDir:join(STUDIO,'web/sites/example')});const html=readFileSync(join(out,'index.html'),'utf8');
  assert.match(html,new RegExp(`hero-${hero} features-grid width-wide`));assert.match(readFileSync(join(out,'assets/site.css'),'utf8'),/Lora/);
 }}finally{rmSync(out,{recursive:true,force:true});}
});

test('art-directed hero compositions keep media and text readable at three viewports',{skip:process.env.STUDIO_RENDER_TEST!=='1',timeout:60000},async()=>{
 const {launch}=await import('../lib/cdp.mjs'),{serve}=await import('../lib/serve.mjs'),{writeFileSync}=await import('node:fs');
 const source=mkdtempSync(join(tmpdir(),'web-art-source-')),out=join(source,'dist');
 writeFileSync(join(source,'study.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#9daea4"/></svg>');
 let server,client;
 try{server=await serve(out);client=await launch({width:1440,height:900});
 for(const hero of ['split','media-first','stacked']){
  const s={...site(),lang:'en',theme:{fonts:{display:'Lora',text:'Geist',label:'Geist'}},layout:{hero,features:'grid',width:'wide'},sections:[{type:'hero',id:'top',title:'Studio studies',subtitle:'Original work in form and composition.',image:'study.svg',imageAlt:'Test composition panel',imageWidth:600,imageHeight:800,cta:{label:'Read the notes',href:'#notes'}},{type:'cta',id:'notes',title:'Study notes',text:'A browser layout fixture.',cta:{label:'Return to start',href:'#top'}}]};
  build(s,out,{siteDir:source});
  for(const width of [390,820,1440]){
   await client.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
   await client.goto(`http://127.0.0.1:${server.port}/index.html?hero=${hero}&width=${width}`);await client.eval('document.fonts.ready.then(()=>true)');
   const r=await client.eval(`(()=>{const t=document.querySelector('.hero .wrap > :first-child').getBoundingClientRect(),m=document.querySelector('.visual').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,loaded:document.querySelector('.visual img').naturalWidth,text:{x:t.x,y:t.y,bottom:t.bottom},media:{x:m.x,y:m.y}}})()`);
   assert.equal(r.overflow,false,`${hero} at ${width}`);assert.ok(r.loaded>0);
   if(width===1440&&hero==='media-first')assert.ok(r.media.x<r.text.x);
   if(width===1440&&hero==='stacked')assert.ok(r.media.y>=r.text.bottom);
  }
 }
 }finally{await client?.close();server?.close();rmSync(source,{recursive:true,force:true});}
});
