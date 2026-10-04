import test from 'node:test';
import assert from 'node:assert/strict';
import { ribbonGeometry, rotatePoint } from '../lib/ribbon.js';
import { lint } from '../lib/gates.mjs';
import { readFileSync } from 'node:fs';
const near = (a,b) => a.forEach((x,i) => assert.ok(Math.abs(x-b[i])<1e-9));
test('odd-twist ribbon seam reverses width; even-twist seam preserves it',()=> {
  for (const twist of [1,2,3,4,5]) for(const v of [-1,-.4,0,.7,1])
    near(ribbonGeometry(0,v,{twist}),ribbonGeometry(1,twist%2?-v:v,{twist}));
});
test('rotation preserves length and arbitrary-time geometry has no history',()=> {
  const p=ribbonGeometry(.37,.4,{phase:1.8,fold:.3});
  const q=rotatePoint(p,.4,1.5,-.6);
  assert.ok(Math.abs(Math.hypot(...p)-Math.hypot(...q))<1e-9);
  ribbonGeometry(.8,-.2,{phase:99}); near(p,ribbonGeometry(.37,.4,{phase:1.8,fold:.3}));
});
test('literal scene backgrounds enforce actual contrast and showreel lints clean',()=> {
  const base=new URL('../films/form-function/',import.meta.url);
  const brand=JSON.parse(readFileSync(new URL('brand.json',base)));
  const spec=JSON.parse(readFileSync(new URL('spec.json',base)));
  assert.deepEqual(lint(spec,brand).errors,[]);
  const bad={bpm:120,scenes:[{id:'paper',beats:8,bg:'#FFFFFF',elements:[{type:'words',text:'Invisible',size:80,color:'#FFFFFF'}]}]};
  assert.ok(lint(bad,brand).errors.some(e=>e.includes('contrast 1.0')));
});
