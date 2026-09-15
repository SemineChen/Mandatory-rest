import {MotionCounter} from './motion.js';
import {ACTIONS} from './flow.js';
export const TARGET=10;
export class PoseCounter {
 constructor(saved={}) {
  this.stage=saved.stage||0;this.reps=Math.min(TARGET,Math.max(0,saved.reps||0));
  if(this.stage===2&&this.reps===TARGET)this.stage=3;
  this.motion=new MotionCounter(ACTIONS[this.stage]?.id||'wings');
  this.visible=false;this.partial=false;this.hold=0;this.transitionAt=null;this.remaining=3;
 }
 get transitioning(){return this.stage<2&&this.reps===TARGET;}
 resetTracking(){this.motion.reset();this.visible=false;this.hold=0;this.transitionAt=null;}
 update(p,t) {
  if(this.stage===3)return this;
  if(this.transitioning){
   if(this.transitionAt===null)this.transitionAt=t;
   this.remaining=Math.max(0,Math.ceil((3000-(t-this.transitionAt))/1000));
   if(t-this.transitionAt>=3000){this.stage++;this.reps=0;this.motion=new MotionCounter(ACTIONS[this.stage].id);this.transitionAt=null;}
   return this;
  }
  const counted=this.motion.update(p,t);this.visible=this.motion.visible;this.partial=this.motion.partial;this.hold=this.motion.hold;
  if(counted){this.reps++;if(this.reps===TARGET){this.motion.reset();this.hold=0;if(this.stage===2)this.stage=3;else{this.transitionAt=t;this.remaining=3;}}}
  return this;
 }
}
