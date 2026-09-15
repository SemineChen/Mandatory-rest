import {chromium,expect} from '@playwright/test';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts/live-overlay',{recursive:true});
const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:false,args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`,'--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'],viewport:{width:1536,height:1024}});
try{
 const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
 const page=await ctx.newPage();page.on('pageerror',e=>console.log('PAGEERROR',e.message));await page.goto('http://localhost:4173/demo-workspace.html');
 await page.evaluate(()=>{const p=document.createElement('p');p.id='live-proof';p.textContent='LIVE 0';document.body.prepend(p);window.liveTick=setInterval(()=>p.textContent='LIVE '+Date.now(),100);});
 const popup=await ctx.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);await page.bringToFront();
 const count=ctx.pages().length;await popup.evaluate(()=>document.querySelector('#now').click());
 await expect.poll(()=>page.frames().some(f=>f.url().startsWith(`chrome-extension://${id}/break.html`)),{timeout:8000}).toBe(true);
 expect(ctx.pages().length).toBe(count);expect(await page.evaluate(()=>document.body.inert)).toBe(true);
 const frame=page.frames().find(f=>f.url().startsWith(`chrome-extension://${id}/break.html`));
 await expect(frame.locator('#start')).toBeVisible();
 const before=await page.locator('#live-proof').textContent();await page.waitForTimeout(250);expect(await page.locator('#live-proof').textContent()).not.toBe(before);
 expect(await frame.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 await page.screenshot({path:'artifacts/live-overlay/welcome.png'});
 await frame.locator('#start').click();await expect(frame.locator('#camera-placeholder')).toBeHidden({timeout:45000});
 await expect(frame.locator('#status')).toHaveText('◌ 等待入镜',{timeout:15000});
 await page.screenshot({path:'artifacts/live-overlay/exercise.png'});
 expect(await frame.locator('.garden-environment').isVisible()).toBe(false);
 expect((await worker.evaluate(()=>chrome.storage.session.get('workBackdrop'))).workBackdrop).toBeUndefined();
 await frame.locator('#exit').click();await frame.locator('[data-minutes="30"]').click();
 await expect.poll(()=>page.frames().some(f=>f.url().startsWith(`chrome-extension://${id}/break.html`))).toBe(false);
 await page.evaluate(()=>{window.proofClicked=false;const b=document.createElement('button');b.textContent='Return proof';b.onclick=()=>window.proofClicked=true;document.body.prepend(b);});
 await page.getByText('Return proof',{exact:true}).click();expect(await page.evaluate(()=>window.proofClicked)).toBe(true);
 const state=await worker.evaluate(async()=> (await chrome.storage.local.get('rest')).rest);expect(state.paused).toBe(true);expect(state.completed).toBe(0);expect(await page.evaluate(()=>document.body.inert)).toBe(false);
 await page.bringToFront();await popup.evaluate(()=>chrome.runtime.sendMessage({type:'start'}));
 await expect.poll(()=>page.frames().some(f=>f.url().startsWith(`chrome-extension://${id}/break.html`))).toBe(true);
 const current=await popup.evaluate(()=>chrome.runtime.sendMessage({type:'get'}));
 const completed=await popup.evaluate(async s=>{
  const send=(stage,reps)=>chrome.runtime.sendMessage({type:'progress',sessionId:s.sessionId,stage,reps});
  const rejected=await send(3,50);if(rejected.stage!==0)throw Error('Premature completion accepted');
  for(let stage=0;stage<3;stage++){if(stage>0)await send(stage,0);for(let reps=1;reps<=50;reps++)await send(stage===2&&reps===50?3:stage,reps);}
  return chrome.runtime.sendMessage({type:'complete',sessionId:s.sessionId});
 },current);
 expect(completed.completed).toBe(1);expect(completed.active).toBe(false);
 await expect.poll(()=>page.frames().some(f=>f.url().startsWith(`chrome-extension://${id}/break.html`))).toBe(false);
 expect(await page.evaluate(()=>document.body.inert)).toBe(false);
 console.log('PASS: live original DOM behind transparent overlay, no new tab, live updates continue, no stored screenshot, camera inference inside frame, pause removes overlay and restores page interaction.');
}finally{await ctx.close();}
