// Package image_gen redraws with real PNG alpha; never resample source pixels.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch();
const page=await browser.newPage();
const report=[];
try{
 for(const mode of ['wings','updown','twist'])for(let pair=0;pair<(mode==='updown'?4:8);pair++){
  const path=`public/assets/sequences/${mode}-pair-hq-${pair}.png`;
  const source='data:image/png;base64,'+(await readFile(path)).toString('base64');
  const result=await page.evaluate(async source=>{
   const image=new Image();image.src=source;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
   let transparent=0,opaque=0,magenta=0;
   for(let i=0;i<d.length;i+=4){
    const spill=Math.min(d[i],d[i+2])-d[i+1];
    const alpha=Math.max(0,Math.min(1,(100-spill)/75));
    d[i+3]=Math.round(d[i+3]*alpha);
    if(alpha<1){d[i]=Math.min(d[i],d[i+1]+25);d[i+2]=Math.min(d[i+2],d[i+1]+25);}
    if(d[i+3]===0)transparent++;
    if(d[i+3]>220){opaque++;if(d[i]>200&&d[i+1]<80&&d[i+2]>200)magenta++;}
   }
   ctx.putImageData(pixels,0,0);
   return {width:canvas.width,height:canvas.height,transparent,opaque,magenta,data:canvas.toDataURL()};
  },source);
  if(result.width!==result.height*2||result.height<800||!result.transparent||!result.opaque||result.magenta)throw Error(`Invalid redraw: ${path}`);
  await writeFile(path,Buffer.from(result.data.split(',')[1],'base64'));
  delete result.data;report.push({path,...result});
 }
 await writeFile('docs/sequences/clarity/alpha-check.json',JSON.stringify(report,null,2));
 console.log(`Packaged ${report.length} high-resolution pairs with real alpha; no resizing.`);
}finally{await browser.close();}
