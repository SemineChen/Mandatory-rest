(()=>{
 if(globalThis.__xieyihuiLoaded)return;globalThis.__xieyihuiLoaded=true;
 let overlay=null,previousFocus=null,revision=0,pending=false,disposed=false;
 const lockedBodies=new Map();
 function lockPage(){const body=document.body;if(body&&!lockedBodies.has(body)){lockedBodies.set(body,body.inert);body.inert=true;}}
 function unlockPage(){for(const [body,inert] of lockedBodies)body.inert=inert;lockedBodies.clear();}
 function sync(s){
  if(disposed)return;
  revision++;
  if(!s?.active){overlay?.remove();overlay=null;unlockPage();previousFocus?.focus?.({preventScroll:true});previousFocus=null;return;}
  if(overlay?.isConnected)return;
  if(!document.documentElement)return;
  previousFocus=document.activeElement;lockPage();
  overlay=document.createElement('div');
  overlay.style.cssText='all:initial!important;position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;display:block!important;background:transparent!important;';
  const root=overlay;
  const frame=document.createElement('iframe');
  frame.src=chrome.runtime.getURL('break.html?overlay=1');
  frame.title='歇一会 · 休息练习';
  frame.allow='camera; autoplay';
  frame.style.cssText='display:block!important;width:100%!important;height:100%!important;border:0!important;background:transparent!important;pointer-events:auto!important;color-scheme:normal';
  root.append(frame);document.documentElement.append(overlay);frame.focus();
 }
 function onStorage(changes,area){if(area==='local'&&changes.rest)sync(changes.rest.newValue);}
 function onMessage(m,sender,reply){
  if(m.type!=='show-rest'||sender.id!==chrome.runtime.id)return;
  sync(m.state);reply({visible:!!overlay});
 }
 function dispose(){
  if(disposed)return;
  sync(null);disposed=true;observer.disconnect();clearInterval(heartbeat);
  window.removeEventListener('focus',checkState);
  document.removeEventListener('visibilitychange',checkState);
  window.removeEventListener('xieyihui-release',dispose);
  try{chrome.storage.onChanged.removeListener(onStorage);chrome.runtime.onMessage.removeListener(onMessage);}catch{}
  globalThis.__xieyihuiLoaded=false;
 }
 // A storage event can be missed, and disabling/reloading an extension leaves
 // its DOM edits behind. Treat an unreachable background as a release, never
 // as permission to keep the page locked indefinitely.
 async function checkState(){
  if(disposed||pending)return;
  const version=revision;pending=true;let timeout;
  try{
   const s=await Promise.race([
    chrome.runtime.sendMessage({type:'get'}),
    new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Rest connection timed out')),3000);})
   ]);
   if(!s||typeof s.active!=='boolean')throw Error('Rest state unavailable');
   if(version===revision)sync(s);
  }catch{if(version===revision)dispose();}
  finally{clearTimeout(timeout);pending=false;}
 }
 // Let an older content-script context restore its own inert/focus snapshot
 // before this instance takes ownership after an extension reload.
 window.dispatchEvent(new Event('xieyihui-release'));
 window.addEventListener('xieyihui-release',dispose);
 const observer=new MutationObserver(()=>{if(overlay){lockPage();if(!overlay.isConnected)document.documentElement?.append(overlay);}});
 observer.observe(document,{childList:true,subtree:true});
 const heartbeat=setInterval(()=>{if(overlay)checkState();},1000);
 chrome.storage.onChanged.addListener(onStorage);
 chrome.runtime.onMessage.addListener(onMessage);
 window.addEventListener('focus',checkState);
 document.addEventListener('visibilitychange',checkState);
 checkState();
})();
