const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function classifyHand(p){
 if(!p||p.length<21)return null;
 const scale=distance(p[5],p[17]);if(scale<.015)return null;
 const extended=([tip,pip])=>distance(p[tip],p[0])>distance(p[pip],p[0])*1.15;
 if(distance(p[4],p[8])<scale*.4&&[[12,10],[16,14],[20,18]].every(extended))return 'ok';
 if([[8,6],[12,10],[16,14],[20,18]].every(extended))return 'palm';
 return null;
}
export function gestureForPhase(hands,pose,phase){
 const types=(hands||[]).map(classifyHand);
 if(['waiting','paused'].includes(phase)&&types.includes('ok'))return 'ok';
 if(phase==='paused'&&types.filter(t=>t==='palm').length>=2)return 'exit';
 if(['exercise','countdown','unclear'].includes(phase)&&pose?.[0]){
  const span=Math.abs(pose[11]?.x-pose[12]?.x)||.2;
  if(hands.some((h,i)=>types[i]==='palm'&&Math.abs(h[9].y-pose[0].y)<span*.75&&Math.abs(h[9].x-pose[0].x)<span*1.4))return 'pause';
 }
 return null;
}
export class GestureGate{
 constructor(){this.reset();}
 reset(){this.kind=null;this.since=null;this.fired=false;this.progress=0;}
 update(kind,t){if(!kind){this.reset();return null;}if(kind!==this.kind){this.kind=kind;this.since=t;this.fired=false;}
 const duration=kind==='exit'?3000:kind==='pause'?2000:1000;this.progress=Math.min(1,(t-this.since)/duration);
 if(this.progress===1&&!this.fired){this.fired=true;return kind;}return null;
 }
}
