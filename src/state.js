export const initialState=(now=Date.now())=>({interval:60,nextAt:now+3600000,active:false,paused:false,completed:0,stage:0,reps:0,sessionId:null});
export function transition(s,type,now=Date.now(),data={}){
 s={...s};
 if(type==='start'&&!s.active)Object.assign(s,{active:true,paused:false,stage:0,reps:0,sessionId:String(now)});
 if(type==='complete'&&s.active)Object.assign(s,{active:false,completed:s.completed+1,nextAt:now+s.interval*60000,paused:false});
 if(type==='pause')Object.assign(s,{active:false,paused:true,nextAt:data.minutes?now+data.minutes*60000:null});
 if(type==='resume')Object.assign(s,{paused:false,nextAt:now+s.interval*60000});
 if(type==='settings'){s.interval=Math.max(1,Math.min(180,Number(data.interval)||60));if(!s.active&&!s.paused)s.nextAt=now+s.interval*60000;}
 return s;
}
