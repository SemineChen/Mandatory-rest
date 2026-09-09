import {chromium,expect} from '@playwright/test';
import path from 'node:path';
const extension=path.resolve('dist');
const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'],viewport:{width:1440,height:960}});
const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
const page=await ctx.newPage();await page.goto('http://localhost:4173/demo-workspace.html');const popup=await ctx.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
await page.bringToFront();const restPromise=ctx.waitForEvent('page');await popup.evaluate(()=>document.querySelector('#now').click());const rest=await restPromise;await rest.waitForLoadState();await expect(rest.locator('#start')).toBeVisible();
await expect(rest.locator('#work-snapshot')).toBeVisible();await expect(rest.locator('#work-snapshot')).toHaveAttribute('src',/^data:image\/jpeg/);
await rest.screenshot({path:'artifacts/revision/实际网页背景.png'});
const active=await worker.evaluate(async()=> (await chrome.storage.local.get('rest')).rest.active);if(!active)throw Error('Rest did not start');
await expect.poll(()=>page.evaluate(()=>Array.from(document.documentElement.children).some(e=>e.style.zIndex==='2147483647'))).toBe(true);
await rest.locator('#start').click();await expect(rest.locator('#camera-placeholder')).toBeHidden({timeout:45000});await expect(rest.locator('#status')).toHaveText('◌ 等待入镜',{timeout:15000});
await rest.screenshot({path:'artifacts/插件动作识别.png'});
await rest.locator('#exit').click();await rest.locator('[data-minutes="30"]').click();await expect.poll(()=>page.evaluate(()=>Array.from(document.documentElement.children).some(e=>e.style.zIndex==='2147483647'))).toBe(false);
const s=await worker.evaluate(async()=> (await chrome.storage.local.get('rest')).rest);if(s.completed!==0||!s.paused)throw Error('Skip counted as complete');if(await worker.evaluate(async()=>!!(await chrome.storage.session.get('workBackdrop')).workBackdrop))throw Error('Backdrop retained after skip');
const cameraStopped=await rest.evaluate(()=>document.querySelector('video').srcObject===null);if(!cameraStopped)throw Error('Camera remains active');
await popup.evaluate(()=>chrome.runtime.sendMessage({type:'start'}));
await expect(rest.locator('#welcome')).toBeVisible();await expect(rest.locator('#done')).toBeHidden();
await rest.locator('#start').click();await expect(rest.locator('#camera-placeholder')).toBeHidden({timeout:45000});
await popup.evaluate(()=>chrome.runtime.sendMessage({type:'pause',minutes:30}));await expect(rest.locator('#welcome')).toBeVisible();
if(!await rest.evaluate(()=>document.querySelector('video').srcObject===null))throw Error('External pause did not close camera');
await worker.evaluate(async()=>{const {rest}=await chrome.storage.local.get('rest');rest.nextAt=Date.now()+1200;await chrome.storage.local.set({rest});await chrome.alarms.create('rest',{when:rest.nextAt});});
await expect.poll(()=>worker.evaluate(async()=> (await chrome.storage.local.get('rest')).rest.active)).toBe(true);
await expect(rest.locator('#welcome')).toBeVisible();
const current=await popup.evaluate(()=>chrome.runtime.sendMessage({type:'get'}));
await rest.evaluate(async s=>{
 const send=(stage,reps)=>chrome.runtime.sendMessage({type:'progress',sessionId:s.sessionId,stage,reps});
 const rejected=await send(3,50);if(rejected.stage!==0)throw Error('Premature completion accepted');
 for(let stage=0;stage<3;stage++){
  if(stage>0)await send(stage,0);
  for(let reps=1;reps<=50;reps++)await send(stage===2&&reps===50?3:stage,reps);
 }
},current);
await rest.reload();await expect(rest.locator('#done')).toBeVisible();
const doneState=await popup.evaluate(()=>chrome.runtime.sendMessage({type:'get'}));if(doneState.completed!==1)throw Error('Completion not persisted');
await popup.evaluate(()=>chrome.runtime.sendMessage({type:'start'}));await expect(rest.locator('#welcome')).toBeVisible();await expect(rest.locator('#done')).toBeHidden();
console.log('PASS: MV3 loaded, timer state, cross-tab shield, local WASM/model inference, skip, camera stopped, external pause, alarm trigger, repeated sessions, persisted completion.');await ctx.close();
