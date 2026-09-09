(()=>{
 if(globalThis.__xieyihuiLoaded)return;globalThis.__xieyihuiLoaded=true;
 let overlay=null;
 function sync(s){
  if(!s?.active){overlay?.remove();overlay=null;return;}
  if(overlay?.isConnected)return;
  if(!document.documentElement)return;
  overlay=document.createElement('div');overlay.style.cssText='position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important';
  const root=overlay.attachShadow({mode:'closed'});
  root.innerHTML=`<style>:host{all:initial}section{position:fixed;inset:0;background:rgba(25,43,33,.86);backdrop-filter:blur(16px);display:grid;place-content:center;text-align:center;color:#f7f6eb;font:18px system-ui;pointer-events:auto}h1{font-size:42px;letter-spacing:-2px;margin:24px 0 8px}p{color:#d2dbc9;line-height:1.8}button{background:#d0e2a8;color:#2b4735;border:0;border-radius:50px;padding:18px 38px;font:600 17px system-ui;cursor:pointer;margin:20px auto}.bud{font-size:60px}small{color:#aebdaa;margin-top:20px}</style><section role="dialog" aria-modal="true" aria-label="休息时间"><div class="bud">🌱</div><h1>先歇一会，再继续吧。</h1><p>小怪兽正在等你伸个懒腰。<br>完成这一组动作，网页就会恢复。</p><button>去休息 · 和它一起动一动 ↗</button><small>需要临时离开？休息页内可紧急退出</small></section>`;
  root.querySelector('button').onclick=()=>chrome.runtime.sendMessage({type:'open'});
  document.documentElement.append(overlay);root.querySelector('button').focus();
 }
 for(const name of ['keydown','keyup','keypress','pointerdown','click','wheel','touchstart'])window.addEventListener(name,e=>{if(overlay&&!e.composedPath().includes(overlay)){e.stopImmediatePropagation();if(e.cancelable)e.preventDefault();}},true);
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.rest)sync(changes.rest.newValue);});
 chrome.runtime.sendMessage({type:'get'}).then(sync).catch(()=>{});
 new MutationObserver(()=>{if(overlay&&!overlay.isConnected)document.documentElement?.append(overlay);}).observe(document,{childList:true,subtree:true});
})();
