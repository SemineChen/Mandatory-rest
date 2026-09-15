const ACTION_CUES=['wings','updown','twist'];
const TRANSITION_CUES=['next-updown','next-twist'];

export function createVoiceGuide({createAudio=src=>new Audio(src),onUnavailable=()=>{}}={}){
 let last=null,current=null,version=0;
 function stop(){
  version++;last=null;
  if(current){current.onerror=null;current.pause();current.currentTime=0;current=null;}
 }
 function announce({stage,transitioning=false}){
  const cue=stage===3?'complete':transitioning?TRANSITION_CUES[stage]:ACTION_CUES[stage];
  if(!cue||cue===last)return;
  stop();last=cue;
  const token=version;let reported=false;
  const failed=()=>{if(token===version&&!reported){reported=true;onUnavailable();}};
  try{
   current=createAudio(`assets/voice/${cue}.m4a`);
   current.onerror=failed;
   current.play()?.catch(failed);
  }catch{failed();}
 }
 return {announce,stop};
}
