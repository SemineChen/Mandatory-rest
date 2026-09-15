import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {measureCharacter} from './measure-character.mjs';
const browser=await chromium.launch(),page=await browser.newPage();
const targetRGB=[183,180,114],targetBodyHeight=620,targetBodyWidth=420;
const originals=JSON.parse(await readFile('docs/sequences/clarity/original-twist-proportions.json','utf8'));
const frontRatio=originals[0].bodyWidth/originals[0].bodyHeight;
const result={targetBodyHeight,targetBodyWidth,targetRGB,frames:{wings:[],updown:[],twist:[]}};
try{
 await page.addScriptTag({content:`window.measureCharacter=${measureCharacter.toString()}`});
 for(const mode of ['wings','updown','twist'])for(let pair=0;pair<(mode==='updown'?4:8);pair++){
  const source=`public/assets/sequences/${mode}-pair-hq-${pair}.png`;
  const output=`public/assets/sequences/${mode}-pair-stable-${pair}.png`;
  const url='data:image/png;base64,'+(await readFile(source)).toString('base64');
  const corrected=await page.evaluate(async({url,targetRGB})=>{
   const im=new Image();im.src=url;await im.decode();
   const atlas=document.createElement('canvas');atlas.width=im.width;atlas.height=im.height;
   const ac=atlas.getContext('2d');const frames=[];
   for(let local=0;local<2;local++){
    const c=document.createElement('canvas');c.width=im.width/2;c.height=im.height;
    const ctx=c.getContext('2d');ctx.drawImage(im,local*c.width,0,c.width,c.height,0,0,c.width,c.height);
    const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data;
    const before=window.measureCharacter(d,c.width,c.height);
    const gamma=targetRGB.map((target,k)=>Math.log(target/255)/Math.log(before.rgb[k]/255));
    const tables=gamma.map(g=>Array.from({length:256},(_,v)=>255*Math.pow(v/255,g)));
    const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
    for(let n=0;n<d.length;n+=4){
     if(!d[n+3])continue;
     const r=d[n],g=d[n+1],b=d[n+2],light=r*.2126+g*.7152+b*.0722;
     // Match fur midtones while protecting black eyes, green pads and peach blush.
     const weight=smooth((light-60)/60)*(1-smooth((r-g-20)/25));
     for(let k=0;k<3;k++)d[n+k]=Math.round(d[n+k]+weight*(tables[k][d[n+k]]-d[n+k]));
    }
    const after=window.measureCharacter(d,c.width,c.height);
    ctx.putImageData(pixels,0,0);ac.drawImage(c,local*c.width,0);
    frames.push({bodyTop:before.bodyTop,bodyHeight:before.bodyHeight,bodyWidth:before.bodyWidth,
     feetCenter:before.feetCenter,baseline:before.baseline,gamma,beforeRGB:before.rgb,afterRGB:after.rgb});
   }
   return {frames,data:atlas.toDataURL()};
  },{url,targetRGB});
  await writeFile(output,Buffer.from(corrected.data.split(',')[1],'base64'));
  for(const [local,frame] of corrected.frames.entries()){
   const index=pair*2+local;
   const viewRatio=mode==='twist'?(originals[index].bodyWidth/originals[index].bodyHeight)/frontRatio:1;
   result.frames[mode].push({index,...frame,targetWidth:targetBodyWidth*viewRatio});
  }
 }
 await writeFile('public/assets/sequences/motion-calibration.json',JSON.stringify(result));
 await writeFile('docs/sequences/clarity/stability-calibration.json',JSON.stringify(result,null,2));
 console.log('Calibrated fur tone in 40 frames; source image dimensions and alpha preserved.');
}finally{await browser.close();}
