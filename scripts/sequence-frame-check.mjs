import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/sequence-v2';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const results=[];
try{
 for(const width of [1440,390]){
  for(const [stage,mode] of ['wings','updown','twist'].entries()){
   const page=await browser.newPage({viewport:{width,height:width===390?844:1000}});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(stage=>sessionStorage.setItem('rest-progress',JSON.stringify({stage,reps:0})),stage);
   await page.goto('http://localhost:4173/break.html');
   await page.locator('#start').click();
   await page.waitForFunction(mode=>document.querySelector('#mascot').dataset.sequence===mode,mode);
   const frames=await page.evaluate(async()=>{
    const canvas=document.querySelector('#mascot'),seen=new Map();
    const end=performance.now()+2900;
    while(performance.now()<end){
     const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
     let opaque=0,magenta=0,hash=0;
     for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]>220)opaque++;
      if(pixels[i+3]>220&&pixels[i]>200&&pixels[i+1]<80&&pixels[i+2]>200)magenta++;
      if(i%100===0)hash=(Math.imul(hash,31)+pixels[i]+pixels[i+3])|0;
     }
     seen.set(canvas.dataset.frame,{hash,opaque,magenta,corner:pixels[3]});
     await new Promise(resolve=>setTimeout(resolve,45));
    }
    return [...seen];
   });
   assert.equal(frames.length,mode==='updown'?8:16);
   assert.ok(new Set(frames.map(([,f])=>f.hash)).size>=7);
   for(const [,f] of frames){assert.ok(f.opaque>1000);assert.equal(f.magenta,0);assert.equal(f.corner,0);}
   await page.waitForFunction(()=>document.querySelector('#mascot').dataset.frame==='7');
   await page.screenshot({path:`${out}/${mode}-${width}.png`});
   assert.deepEqual(errors,[]);
   results.push({width,mode,frames:frames.length,nonblank:true,transparent:true});
   await page.close();
  }
 }
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
 console.log(results);
}finally{await browser.close();}
