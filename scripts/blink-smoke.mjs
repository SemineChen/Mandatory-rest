import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 window.__frames=[];
 window.requestAnimationFrame=cb=>(window.__frames.push(cb),window.__frames.length);
 window.cancelAnimationFrame=()=>{};
 Object.defineProperty(performance,'now',{value:()=>0});
});
await page.goto('http://localhost:4178/break.html');
await page.waitForFunction(()=>window.__frames.length&&[...document.images].every(i=>i.complete));
await page.waitForTimeout(350);
async function tick(ms){await page.evaluate(t=>{const callbacks=window.__frames.splice(0);callbacks.forEach(cb=>cb(t));},ms);}
for(const [name,ms,state] of [['open',0,'0'],['half',3220,'1'],['closed',3300,'2'],['reopen',3500,'0']]){
 await tick(ms);assert.equal(await page.locator('#mascot').getAttribute('data-blink'),state);
 await page.screenshot({path:`artifacts/blink/${name}.png`});
 const data=await page.locator('#mascot').evaluate(c=>c.toDataURL());
 await writeFile(`artifacts/blink/${name}-frame.png`,Buffer.from(data.split(',')[1],'base64'));
}
await page.emulateMedia({reducedMotion:'reduce'});await tick(3300);
assert.equal(await page.locator('#mascot').getAttribute('data-blink'),'0');
assert.deepEqual(errors,[]);
await page.setViewportSize({width:390,height:844});await tick(3500);
await page.screenshot({path:'artifacts/blink/mobile.png'});
await browser.close();console.log('Blink browser check passed: open/half/closed/reopen, reduced motion, mobile, no page errors.');
