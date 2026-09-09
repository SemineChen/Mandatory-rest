export const ACTIONS=[
 {id:'wings',name:'大鹏展翅',instruction:'双臂向两侧展开，再自然放下。',rule:'展开 → 放下，算 1 次',poster:'assets/poses/wings.png',video:null},
 {id:'updown',name:'上下齐发',instruction:'一手向上、一手向下，左右交换。',rule:'左右各伸展一次，算 1 次',poster:'assets/poses/updown.png',video:null},
 {id:'twist',name:'扭转乾坤',instruction:'双脚站稳，轻轻向左转，再向右转。',rule:'左转 → 右转 → 回正，算 1 次',poster:'assets/poses/twist.png',video:null}
];
export const POSES={waiting:{poster:'assets/poses/waiting.png',video:null},ready:{poster:'assets/poses/ready.png',video:null},complete:{poster:'assets/poses/complete.png',video:null}};
export class RestFlow{
 constructor({target=50,demo=false,action=0,reps=0}={}){this.target=target;this.demo=demo;this.action=action;this.reps=reps;this.phase='waiting';this.visible=true;}
 get canRecordCompletion(){return !this.demo&&this.phase==='complete';}
 dispatch(event){
  if(event==='skip'&&!['returned','complete'].includes(this.phase)){this.phase='skipped';return;}
  if(event==='leave'&&['complete','skipped'].includes(this.phase)){this.phase='returned';return;}
  if(event==='ready'&&this.phase==='waiting')this.phase='countdown';
  else if(event==='countdownDone'&&this.phase==='countdown')this.phase='exercise';
  else if(event==='pause'&&['exercise','countdown','unclear'].includes(this.phase))this.phase='paused';
  else if(event==='resume'&&this.phase==='paused')this.phase='countdown';
  else if(event==='lost'&&this.phase==='exercise')this.phase='unclear';
  else if(event==='found'&&this.phase==='unclear')this.phase='exercise';
  else if(event==='rep'&&this.phase==='exercise'){this.reps=Math.min(this.target,this.reps+1);if(this.reps===this.target)this.phase=this.action===2?'complete':'transition';}
  else if(event==='next'&&this.phase==='transition'){this.action++;this.reps=0;this.phase='countdown';}
 }
}
