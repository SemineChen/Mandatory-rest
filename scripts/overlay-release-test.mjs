import {chromium,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const source=await readFile('src/content.js','utf8');
const browser=await chromium.launch({headless:true});
try{
 for(const scenario of ['complete','pause','missed-notification','disabled','reloaded','unresponsive','stale-response','original-inert']){
  const page=await browser.newPage();
  await page.setContent('<body><button id="work">Work</button><input id="text"></body>');
  await page.evaluate(scenario=>{
   window.clicked=0;document.querySelector('#work').onclick=()=>window.clicked++;
   document.querySelector('#text').focus();
   if(scenario==='original-inert')document.body.inert=true;
   window.rest={active:true};window.listeners={};window.mode='normal';
   window.chrome={runtime:{id:'test',getURL:p=>'https://extension.invalid/'+p,onMessage:{addListener:fn=>listeners.message=fn,removeListener(){}},sendMessage(){
    if(mode==='throw')throw Error('Extension context invalidated.');
    if(mode==='reject')return Promise.reject(Error('Receiving end does not exist.'));
    if(mode==='hang')return new Promise(()=>{});
    if(mode==='defer')return new Promise(resolve=>window.resolvePending=resolve);
    return Promise.resolve({...rest});
   }},storage:{onChanged:{addListener:fn=>listeners.storage=fn,removeListener(){}}}};
  },scenario);
  await page.route('https://extension.invalid/**',r=>r.fulfill({body:'<button>Rest</button>',contentType:'text/html'}));
  await page.addScriptTag({content:source});
  await expect.poll(()=>page.evaluate(()=>document.body.inert)).toBe(true);
  await expect(page.locator('iframe')).toHaveCount(1);
  if(scenario==='stale-response'){
   await page.evaluate(()=>mode='defer');
   await expect.poll(()=>page.evaluate(()=>!!window.resolvePending),{timeout:4000}).toBe(true);
  }
  await page.evaluate(scenario=>{
   if(['complete','pause','original-inert','stale-response'].includes(scenario)){
    rest={active:false};listeners.storage({rest:{newValue:rest}},'local');
    if(scenario==='stale-response')resolvePending({active:true});
   }else if(scenario==='missed-notification')rest={active:false};
   else if(scenario==='disabled')mode='throw';
   else if(scenario==='reloaded')mode='reject';
   else mode='hang';
  },scenario);
  await expect(page.locator('iframe')).toHaveCount(0,{timeout:7000});
  expect(await page.evaluate(()=>document.body.inert)).toBe(scenario==='original-inert');
  if(scenario!=='original-inert'){
   await page.locator('#work').click();await page.locator('#text').fill('Recovered');
   expect(await page.evaluate(()=>window.clicked)).toBe(1);
   await expect(page.locator('#text')).toHaveValue('Recovered');
  }
  await page.evaluate(()=>document.body.append(document.createElement('div')));
  await expect(page.locator('iframe')).toHaveCount(0);
  console.log('PASS',scenario);await page.close();
 }
}finally{await browser.close();}
