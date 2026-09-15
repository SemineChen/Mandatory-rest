import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {measureCharacter} from './measure-character.mjs';
const phase=process.argv.includes('--before')?'before':'after',out='artifacts/sequence-consistency';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();const report=[];
try{
 for(const [stage,mode] of ['wings','updown','twist'].entries()){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.addInitScript(stage=>sessionStorage.setItem('rest-progress',JSON.stringify({stage,reps:0})),stage);
  await page.goto('http://localhost:4173/break.html');
  await page.addScriptTag({content:`window.measureCharacter=${measureCharacter.toString()}`});
  await page.locator('#start').click();
  await page.waitForFunction(mode=>document.querySelector('#mascot').dataset.sequence===mode,mode);
  const frames=await page.evaluate(async count=>{
   const c=document.querySelector('#mascot'),seen=new Map(),end=performance.now()+8000;
   while(seen.size<count&&performance.now()<end){
    const index=Number(c.dataset.frame);
    if(!seen.has(index)){
     const d=c.getContext('2d').getImageData(0,0,c.width,c.height);
     seen.set(index,{index,...window.measureCharacter(d.data,c.width,c.height),data:c.toDataURL()});
    }
    await new Promise(resolve=>setTimeout(resolve,30));
   }
   return [...seen.values()].sort((a,b)=>a.index-b.index);
  },mode==='updown'?8:16);
  assert.equal(frames.length,mode==='updown'?8:16);
  for(const frame of frames){await writeFile(`${out}/${phase}-${mode}-${frame.index}.png`,Buffer.from(frame.data.split(',')[1],'base64'));delete frame.data;}
  const range=key=>{const a=frames.map(f=>f[key]),min=Math.min(...a),max=Math.max(...a);return {min,max,variationPercent:(max/min-1)*100};};
  report.push({mode,body:range('bodyHeight'),brightness:range('luminance'),width:range('bodyWidth'),frames});
  await page.close();
 }
 await writeFile(`${out}/${phase}-playback.json`,JSON.stringify(report,null,2));
 console.log(report.map(({frames,...summary})=>summary));
 for(const r of report){
  assert.ok(r.body.variationPercent<1.5,`${r.mode} body size pumps by ${r.body.variationPercent.toFixed(1)}%`);
  assert.ok(r.brightness.variationPercent<2,`${r.mode} brightness flickers by ${r.brightness.variationPercent.toFixed(1)}%`);
  assert.ok(r.width.variationPercent<(r.mode==='twist'?6:2),`${r.mode} torso width varies by ${r.width.variationPercent.toFixed(1)}%`);
 }
}finally{await browser.close();}
