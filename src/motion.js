const visible=p=>!!p&&p.visibility>=.5&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
function arm(p,shoulder,elbow,wrist,scale,width){
 const useWrist=visible(p[wrist]),point=useWrist?p[wrist]:visible(p[elbow])?p[elbow]:null;
 if(!point)return null;
 const dy=(point.y-p[shoulder].y)/scale,dx=Math.abs(point.x-p[shoulder].x);
 if(dy>(useWrist?.55:.32))return 'down';
 if(dy<-(useWrist?.5:.32))return 'up';
 if(Math.abs(dy)<.32&&dx>width*(useWrist?.7:.4))return 'open';
 return 'middle';
}
export class MotionCounter{
 constructor(id){this.id=id;this.reset();}
 reset(){this.step=0;this.last=null;this.frames=0;this.mask=0;this.candidateMask=0;this.hold=0;this.visible=false;this.partial=false;this.lastTime=null;this.missingSince=null;}
 update(p,t){
  if(this.lastTime!==null&&t-this.lastTime>800)this.reset();
  this.lastTime=t;
  if(!p||![11,12].every(i=>visible(p[i]))){this.reset();return false;}
  const width=Math.abs(p[11].x-p[12].x),scale=Math.max(.08,width*1.25);
  let kind=null,mask=3;
  if(this.id==='twist'){
   this.visible=Number.isFinite(p[11].z)&&Number.isFinite(p[12].z);
   if(this.visible){const z=(p[11].z-p[12].z)/scale;kind=z<-.4?'left':z>.4?'right':Math.abs(z)<.2?'center':null;}
   this.partial=false;
  }else{
   const left=arm(p,11,13,15,scale,width),right=arm(p,12,14,16,scale,width);
   mask=(left?1:0)|(right?2:0);this.visible=mask!==0;
   this.partial=mask!==3||!visible(p[15])||!visible(p[16]);
   if(this.id==='wings'){
    if((!left||left==='open')&&(!right||right==='open'))kind='open';
    else if((!left||left==='down')&&(!right||right==='down'))kind='down';
   }else{
    if((!left||left==='up')&&(!right||right==='down'))kind='left';
    else if((!left||left==='down')&&(!right||right==='up'))kind='right';
   }
  }
  if(!this.visible){
   if(this.missingSince===null)this.missingSince=t;
   if(t-this.missingSince>800){this.step=0;this.mask=0;}
   this.last=null;this.frames=0;return false;
  }
  this.missingSince=null;
  if(!kind){this.last=null;this.frames=0;return false;}
  // Confirm direction across two samples, without a timed pose hold.
  if(kind!==this.last){this.last=kind;this.frames=1;this.candidateMask=mask;return false;}
  this.candidateMask&=mask;
  if(!this.candidateMask){this.frames=1;this.candidateMask=mask;return false;}
  if(++this.frames<2)return false;
  mask=this.candidateMask;
  const first=this.id==='wings'?'open':'left',second=this.id==='wings'?'down':'right';
  if(this.step===0&&kind===first){this.step=1;this.mask=mask;}
  else if(this.step===1&&kind===second){
   if(!(this.mask&mask)){this.step=0;this.mask=0;return false;}
   this.mask&=mask;
   if(this.id==='twist')this.step=2;
   else{this.step=0;this.mask=0;return true;}
  }else if(this.step===2&&kind==='center'){this.step=0;this.mask=0;return true;}
  return false;
 }
}
