import {readFileSync} from 'node:fs';
import {runLab} from '../lib/imagelab.mjs';
const src=f=>`data:image/jpeg;base64,${readFileSync(new URL('./source/'+f,import.meta.url)).toString('base64')}`;
const dir=new URL('./plates/',import.meta.url).pathname;
console.log(await runLab({job:new URL('../film2/plates-hero.js',import.meta.url).pathname,outDir:dir,args:{hero:src('hero-duo.jpg')}}));
console.log(await runLab({job:new URL('../film2/plates-swing.js',import.meta.url).pathname,outDir:dir,args:{swing:src('swing.jpg')}}));
console.log(await runLab({job:new URL('./plates-job.js',import.meta.url).pathname,outDir:dir,args:{mood:src('mood.jpg'),story:src('story.jpg'),swing:src('swing.jpg'),cup:`data:image/png;base64,${readFileSync(dir+'hero-cup.png').toString('base64')}`}}));
