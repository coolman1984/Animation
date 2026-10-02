async ({mood,story,cup,swing})=>{
 const m=await lab.load(mood),s=await lab.load(story),c=await lab.load(cup),sw=await lab.load(swing);
 const o={'swing-card':lab.url(lab.crop(sw,0,420,1080,850)),'cup':lab.url(lab.crop(c,690,680,640,900)),'facade':lab.url(lab.crop(m,18,200,520,398)),'vintage':lab.url(lab.crop(m,550,20,460,650)),'newspaper':lab.url(lab.crop(m,0,1030,334,275)),'packaging':lab.url(lab.crop(m,334,1030,690,277)),'wall':lab.url(lab.crop(m,0,1310,1010,226)), 'macro':lab.url(lab.crop(s,365,4,495,304)), 'cafe':lab.url(lab.crop(s,180,925,678,289)), 'ingredients':lab.url(lab.crop(s,100,650,550,266))};
 for(let i=0;i<5;i++)o['menu'+i]=lab.url(lab.crop(m,i*204+5,743,194,278));
 return o;
}
