import {ACTIONS} from './flow.js';
export function createVoiceGuide(synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onUnavailable=()=>{}){
 let last=null,version=0;
 function stop(){version++;last=null;synth?.cancel();}
 function announce({stage,transitioning=false}){
  const key=stage+':'+transitioning;
  if(key===last)return;
  stop();last=key;const token=version;
  if(!synth||!Utterance){onUnavailable();return;}
  const action=ACTIONS[stage];
  const text=stage===3?'三组动作，150 次全部完成。可以休息了。':transitioning?'接下来，'+ACTIONS[stage+1].name+'。':'第'+(stage+1)+'组，'+action.name+'，50 次。'+action.instruction;
  try{
   const utterance=new Utterance(text);utterance.lang='zh-CN';utterance.rate=1;
   const voices=synth.getVoices().filter(v=>/^zh/i.test(v.lang));
   utterance.voice=voices.find(v=>v.localService)||voices[0]||null;
   utterance.onerror=e=>{if(token===version&&!['canceled','interrupted'].includes(e.error))onUnavailable();};
   synth.speak(utterance);
  }catch{onUnavailable();}
 }
 return {announce,stop};
}
