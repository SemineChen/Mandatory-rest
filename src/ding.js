export function repAdvanced(before,after){
 return Number.isInteger(before?.stage)&&Number.isInteger(before?.reps)&&Number.isInteger(after?.stage)&&Number.isInteger(after?.reps)&&after.reps===before.reps+1&&(after.stage===before.stage||before.stage===2&&after.stage===3);
}

export function createRepDing({AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext}={}){
 let ctx=null;
 function context(){
  if(!AudioContext)return null;
  ctx??=new AudioContext();
  if(ctx.state==='suspended')ctx.resume?.();
  return ctx;
 }
 function play(){
  const audio=context();if(!audio)return;
  const start=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
  osc.type='sine';
  osc.frequency.setValueAtTime(880,start);
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(.12,start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+.12);
  osc.connect(gain);gain.connect(audio.destination);
  osc.start(start);osc.stop(start+.13);
 }
 function playForChange(before,after){if(repAdvanced(before,after))play();}
 return {unlock:context,play,playForChange};
}
