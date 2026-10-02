// Original 115.2 BPM / twelve bars / 25 seconds. Retro electric keys, syncopated bass, modern drums.
import {mkdirSync} from 'node:fs';
import {SR,Bus,rhodes,bass,pluck,kick,noiseHit,ice,whoosh,bell,reverb,writeWav,peak} from '../lib/audio.mjs';
const OUT=new URL('../takes/film5/',import.meta.url).pathname;mkdirSync(OUT,{recursive:true});
const DUR=25,B=60/115.2,BAR=4*B,keys=new Bus(27),low=new Bus(27),drums=new Bus(27),lead=new Bus(27),fx=new Bus(27);
const chords=[{v:[60,64,67,71],r:36},{v:[57,60,64,67],r:33},{v:[57,60,64,67],r:41},{v:[59,62,65,69],r:43}];
for(let bar=0;bar<12;bar++){
 const c=chords[bar%4],t=bar*BAR,quiet=bar===6,end=bar===11;
 for(let beat of (quiet?[0]:end?[0,2]:[0,.75,1.5,2.75,3.5]))c.v.forEach((m,i)=>rhodes(keys,t+beat*B+i*.006,m,(quiet?3:1.25)*B,quiet?.23:.27,{p:-.3+i*.2}));
 for(let beat of (quiet?[0]:end?[0]:[0,.75,1.5,2,2.75,3.5]))bass(low,t+beat*B,c.r+(beat===2.75?7:beat===3.5?12:0),B*(quiet?3:.55),.55);
 if(quiet)continue;
 if(!end){for(let beat of [0,1,2,3])kick(drums,t+beat*B,.64);for(let beat of [1,3]){noiseHit(drums,t+beat*B,{dur:.12,vel:.17,bp:1900,q:.7,tone:170,seed:bar*7+beat});for(let j=0;j<3;j++)noiseHit(drums,t+beat*B+j*.012,{dur:.025,vel:.04,hp:1200,seed:j+bar*19});}for(let e=0;e<8;e++)noiseHit(drums,t+e*B/2+(e%2?.014:0),{dur:e%2?.09:.035,vel:e%2?.058:.04,hp:6500,p:.3,seed:e+100*bar});}
 const mel=[0,4,7,11,7,4,2,4];for(let i=0;i<8;i++){if((bar<2&&i>3)||end&&i>1)continue;pluck(lead,t+i*B/2,c.v[0]+12+mel[(i+bar%2*2)%8],bar<7?.10:.14,{p:i%2?.25:-.25,bright:.6,seed:bar*13+i});}
}
for(let t of [0,4.166667,8.333333,15.625,19.791667,21.875]){ice(fx,t+.04,.4,Math.round(t*10+1));if(t)whoosh(fx,t-.22,.42,.055,{f0:300,f1:2200,p0:-.5,p1:.5,seed:Math.round(t*10)});}
for(let t of [9.7222,11.1111])noiseHit(fx,t,{dur:.05,vel:.08,hp:1700,seed:Math.round(t*10)});
[72,76,79,83].forEach((n,i)=>bell(lead,22.9167+i*.04,n,.1,{decay:1.8,p:i*.12-.2}));
const music=new Bus(27);keys.mixInto(music,1);low.mixInto(music,1);drums.mixInto(music,1);lead.mixInto(music,1);
const send=new Bus(27);keys.mixInto(send,.25);lead.mixInto(send,.3);reverb(send,{room:.55,damp:.4}).mixInto(music,.5);
const mix=new Bus(25),sfx=new Bus(25);for(let bus of [music,fx])for(let i=0;i<bus.n;i++){let t=i/SR,g=t>=25?0:t>24.5?Math.cos((t-24.5)*Math.PI):1;bus.L[i]*=g;bus.R[i]*=g;}
fx.mixInto(sfx,1.2);music.mixInto(mix,1);sfx.mixInto(mix,1);let gain=.7/peak(mix);writeWav(OUT+'music.wav',music,{gain});writeWav(OUT+'sfx.wav',sfx,{gain});writeWav(OUT+'mix.wav',mix,{gain});console.log('25s original 115.2 BPM score');
