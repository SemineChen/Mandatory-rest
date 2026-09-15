import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const phase=process.argv.includes('--before')?'before':'after';
const out='artifacts/sequence-clarity';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const results=[];
try {
 for(const [stage,mode] of ['wings','updown','twist'].entries()){
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(stage=>sessionStorage.setItem('rest-progress',JSON.stringify({stage,reps:0})),stage);
  await page.goto('http://localhost:4173/break.html');
  await page.locator('#start').click();
  await page.waitForFunction(mode=>document.querySelector('#mascot').dataset.sequence===mode,mode);
  await page.waitForFunction(()=>document.querySelector('#mascot').dataset.frame==='1');
  const detail=await page.locator('#mascot').evaluate(canvas=>({
   width:canvas.width,height:canvas.height,displayWidth:canvas.getBoundingClientRect().width,
   displayHeight:canvas.getBoundingClientRect().height,data:canvas.toDataURL()
  }));
  await writeFile(`${out}/${phase}-${mode}-frame.png`,Buffer.from(detail.data.split(',')[1],'base64'));
  await page.screenshot({path:`${out}/${phase}-${mode}.png`});
  delete detail.data;results.push({mode,...detail,errors});
  await page.close();
 }
 await writeFile(`${out}/${phase}.json`,JSON.stringify(results,null,2));
 console.log(results);
 for(const r of results){
  assert.deepEqual(r.errors,[]);
  assert.ok(r.width>=800&&r.height>=800,`${r.mode}: ${r.width} x ${r.height} source is too small for the 800px design`);
  assert.ok(r.width>=r.displayWidth&&r.height>=r.displayHeight,`${r.mode}: canvas is enlarged on desktop`);
 }
}finally{await browser.close();}
