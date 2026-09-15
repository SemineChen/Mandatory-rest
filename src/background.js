import { initialState, transition } from './state.js';
let queue=Promise.resolve();
async function state(){return (await chrome.storage.local.get('rest')).rest||initialState();}
async function publish(s){await chrome.storage.local.set({rest:s});await chrome.alarms.clear('rest');if(!s.active&&s.nextAt)await chrome.alarms.create('rest',{when:Math.max(Date.now()+1000,s.nextAt)});}
async function rememberWork(){
 await chrome.storage.session.remove(['workBackdrop','workTab']);
 const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});
 if(tab && /^https?:/.test(tab.url||''))await chrome.storage.session.set({workTab:tab.id});
}
async function openBreak(){
 const [active]=await chrome.tabs.query({active:true,lastFocusedWindow:true});
 const {workTab}=await chrome.storage.session.get('workTab');
 let tab=active && /^https?:/.test(active.url||'') ? active : null;
 if(!tab && workTab){try{tab=await chrome.tabs.get(workTab);}catch{}}
 if(tab && /^https?:/.test(tab.url||'')){
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
  await chrome.tabs.sendMessage(tab.id,{type:'show-rest',state:await state()});
  await chrome.tabs.update(tab.id,{active:true});
  return;
 }
 // Browser-owned pages cannot host a content script; use the standalone controls.
 const url=chrome.runtime.getURL('break.html');const tabs=await chrome.tabs.query({});
 const existing=tabs.find(t=>t.url===url);
 if(existing)await chrome.tabs.update(existing.id,{active:true});else await chrome.tabs.create({url});
}

async function handle(m,sender){
 let s=await state();const trusted=sender.id===chrome.runtime.id&&sender.url?.startsWith(chrome.runtime.getURL(''));
 if(m.type==='get')return s;
 if(m.type==='open'){if(s.active)await openBreak();return s;}
 if(!trusted)throw Error('Extension page required');
 if(m.type==='return'){const {workTab}=await chrome.storage.session.get('workTab');if(workTab){try{const tab=await chrome.tabs.update(workTab,{active:true});await chrome.windows.update(tab.windowId,{focused:true});}catch{}}return s;}

 if(m.type==='progress'){
  if(!s.active||m.sessionId!==s.sessionId)return s;
  const stage=Number(m.stage),reps=Number(m.reps);
  const same=stage===s.stage&&reps===s.reps+1&&reps<=10&&stage<3;
  const next=stage===s.stage+1&&s.reps===10&&reps===0&&stage<3;
  const done=stage===3&&s.stage===2&&s.reps===9&&reps===10;
  if(Number.isInteger(stage)&&Number.isInteger(reps)&&(same||next||done)){s.stage=stage;s.reps=reps;await publish(s);}return s;
 }
 if(m.type==='complete'&&(s.stage!==3||m.sessionId!==s.sessionId))return s;
 if(!['start','complete','pause','resume','settings'].includes(m.type))return s;
 if(m.type==='start'&&!s.active)await rememberWork();
 s=transition(s,m.type,Date.now(),m);await publish(s);if(['complete','pause'].includes(m.type))await chrome.storage.session.remove('workBackdrop');if(m.type==='start')await openBreak();return s;
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{queue=queue.catch(()=>{}).then(()=>handle(m,sender));queue.then(reply,e=>reply({error:e.message}));return true;});
async function reconcile(){const s=await state();if(!s.active&&s.nextAt&&s.nextAt<=Date.now()){await rememberWork();await publish(transition(s,'start'));await openBreak();}else await publish(s);}
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='rest')queue=queue.catch(()=>{}).then(reconcile);});
chrome.runtime.onInstalled.addListener(()=>{queue=queue.catch(()=>{}).then(async()=>{await reconcile();const tabs=await chrome.tabs.query({});await Promise.allSettled(tabs.filter(t=>/^https?:/.test(t.url||'')).map(t=>chrome.scripting.executeScript({target:{tabId:t.id},files:['content.js']})));});});
chrome.runtime.onStartup.addListener(()=>{queue=queue.catch(()=>{}).then(reconcile);});
