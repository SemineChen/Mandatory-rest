import {chromium,expect} from '@playwright/test';
import path from 'node:path';
for(const scenario of ['pause','complete','disable','reload']){
const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:false,args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`]});
try{
 const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
 const page=await ctx.newPage();
 await page.route('https://release.test/',r=>r.fulfill({contentType:'text/html',body:'<button id="work">Work</button><input id="text">'}));
 await page.goto('https://release.test/');
 let popup=await ctx.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
 {
  await page.bringToFront();await popup.evaluate(()=>chrome.runtime.sendMessage({type:'start'}));
  await expect.poll(()=>page.evaluate(()=>document.body.inert)).toBe(true);
  await expect(page.locator('iframe')).toHaveCount(1);
  if(scenario==='pause'){
   const frame=page.frameLocator('iframe');await frame.locator('#exit').click();await frame.locator('[data-minutes="30"]').click();
  }else if(scenario==='complete'){
   const result=await popup.evaluate(async()=>{
    const s=await chrome.runtime.sendMessage({type:'get'});
    const send=(stage,reps)=>chrome.runtime.sendMessage({type:'progress',sessionId:s.sessionId,stage,reps});
    for(let stage=0;stage<3;stage++){if(stage)await send(stage,0);for(let reps=1;reps<=10;reps++)await send(stage===2&&reps===10?3:stage,reps);}
    return chrome.runtime.sendMessage({type:'complete',sessionId:s.sessionId});
   });expect(result.completed).toBe(1);expect(result.active).toBe(false);
  }else if(scenario==='reload'){
   await popup.evaluate(()=>{setTimeout(()=>chrome.runtime.reload(),100);});
   await expect.poll(()=>page.evaluate(()=>document.body.inert),{timeout:8000}).toBe(false);
  }else{
   const manager=await ctx.newPage();await manager.goto('chrome://extensions/');
   await manager.locator('extensions-item').filter({hasText:'歇一会'}).locator('#enableToggle').click();
   await page.bringToFront();
  }
  await expect.poll(()=>page.evaluate(()=>document.body.inert),{timeout:8000}).toBe(false);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.locator('#work').click();await page.locator('#text').fill(scenario);
  await expect(page.locator('#text')).toHaveValue(scenario);
  console.log('PASS real extension:',scenario);
 }
}finally{await ctx.close();}
}
