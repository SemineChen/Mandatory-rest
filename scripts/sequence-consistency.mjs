import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='artifacts/sequence-consistency';
await mkdir(out,{recursive:true});
const layout=JSON.parse(await readFile('public/assets/sequences/motion-layout.json','utf8'));
const browser=await chromium.launch();const page=await browser.newPage();
const frames=[];
try{
 for(const mode of ['wings','updown','twist'])for(let pair=0;pair<(mode==='updown'?4:8);pair++){
  const path=`public/assets/sequences/${mode}-pair-hq-${pair}.png`;
  const url='data:image/png;base64,'+(await readFile(path)).toString('base64');
  const measurements=await page.evaluate(async url=>{
   const im=new Image();im.src=url;await im.decode();
   const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
   const ctx=c.getContext('2d');ctx.drawImage(im,0,0);
   const d=ctx.getImageData(0,0,c.width,c.height).data,w=c.width/2,h=c.height;
   return [0,1].map(frame=>{
    const alpha=(x,y)=>d[(y*c.width+frame*w+x)*4+3]>220;
    let x1=w,x2=0,y1=h,y2=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(alpha(x,y)){x1=Math.min(x1,x);x2=Math.max(x2,x+1);y1=Math.min(y1,y);y2=Math.max(y2,y+1);}
    let sumX=0,count=0;
    for(let y=y2-12;y<y2;y++)for(let x=x1;x<x2;x++)if(alpha(x,y)){sumX+=x;count++;}
    const feetCenter=sumX/count,cx=Math.round(feetCenter);
    const span=y=>{
     let seed=cx;
     if(!alpha(seed,y)){
      seed=-1;
      for(let offset=1;offset<w*.08;offset++){
       if(alpha(cx+offset,y)){seed=cx+offset;break;}
       if(alpha(cx-offset,y)){seed=cx-offset;break;}
      }
      if(seed<0)return 0;
     }
     let left=seed,right=seed;
     while(left>0&&alpha(left-1,y))left--;
     while(right<w-1&&alpha(right+1,y))right++;
     return right-left+1;
    };
    let pompom=false,stem=false,bodyTop=null;
    for(let y=y1;y<h*.5;y++){
     const width=span(y);
     if(!pompom&&width>w*.09)pompom=true;
     else if(pompom&&!stem&&width<w*.065)stem=true;
     else if(stem&&width>w*.13){bodyTop=y;break;}
    }
    if(bodyTop===null)throw Error('Cannot locate torso below pompom');
    const bodyHeight=y2-bodyTop;
    const colors=[[],[],[]];
    for(let y=Math.round(bodyTop+bodyHeight*.45);y<bodyTop+bodyHeight*.78;y++)for(let x=Math.round(feetCenter-w*.13);x<feetCenter+w*.13;x++){
     const n=(y*c.width+frame*w+x)*4;
     if(d[n+3]>250&&d[n+1]>85)for(let k=0;k<3;k++)colors[k].push(d[n+k]);
    }
    const rgb=colors.map(values=>{
     values.sort((a,b)=>a-b);const trimmed=values.slice(Math.floor(values.length*.1),Math.floor(values.length*.9));
     return trimmed.reduce((a,b)=>a+b,0)/trimmed.length;
    });
    return {width:w,height:h,box:[x1,y1,x2,y2],feetCenter,bodyTop,bodyHeight,rgb,luminance:rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
   });
  },url);
  for(const [local,m] of measurements.entries()){
   const index=pair*2+local,[rx,ry,rxx,ryy]=layout[mode][index],[ax,ay,bx,by]=m.box;
   const currentScale=Math.min((rxx-rx)*887/(bx-ax),(ryy-ry)*887/(by-ay));
   frames.push({mode,index,path,...m,currentScale,currentBodyHeight:m.bodyHeight*currentScale});
  }
 }
 await writeFile(`${out}/source-audit.json`,JSON.stringify(frames,null,2));
 for(const mode of ['wings','updown','twist']){
  const rows=frames.filter(f=>f.mode===mode);
  const range=key=>{const values=rows.map(r=>r[key]),min=Math.min(...values),max=Math.max(...values);return {min,max,variationPercent:(max/min-1)*100};};
  console.log(mode,JSON.stringify({bodyHeight:range('currentBodyHeight'),brightness:range('luminance')}));
 }
}finally{await browser.close();}
