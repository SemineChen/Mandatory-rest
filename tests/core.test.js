import test from 'node:test';
import assert from 'node:assert/strict';
import {PoseCounter} from '../src/pose.js';
import {initialState,transition} from '../src/state.js';
function pose(kind='down') {
 const p=Array.from({length:33},()=>({x:.5,y:.2,z:0,visibility:1}));
 for(const [i,x,y] of [[11,.4,.3],[12,.6,.3],[13,.35,.45],[14,.65,.45],[15,.35,.58],[16,.65,.58]])p[i]={x,y,z:0,visibility:1};
 if(kind==='open')for(const [i,x] of [[13,.25],[14,.75],[15,.1],[16,.9]])p[i]={x,y:.3,z:0,visibility:1};
 if(kind==='leftUp')p[15].y=.05;
 if(kind==='rightUp')p[16].y=.05;
 if(kind==='left')p[11].z=-.15;
 if(kind==='right')p[11].z=.15;
 for(let i=23;i<33;i++)p[i].visibility=0;
 return p;
}
function driver(c){let t=0;return kind=>{for(let i=0;i<8;i++){c.update(kind===null?null:pose(kind),t);t+=100;}};}
test('three actions require 50 complete cycles each with transitions',()=>{
 const c=new PoseCounter(),hold=driver(c);
 for(const [stage,cycle] of [[0,['open','down']],[1,['leftUp','rightUp']],[2,['left','right','down']]]){
  assert.equal(c.stage,stage);
  for(let n=0;n<50;n++){for(const kind of cycle)hold(kind);assert.equal(c.reps,n+1);}
  if(c.stage<2){assert.equal(c.transitioning,true);hold(cycle[0]);assert.equal(c.reps,50);for(let n=0;n<4;n++)hold('down');assert.equal(c.reps,0);}
 }
 assert.equal(c.stage,3);assert.equal(c.reps,50);
});
test('holding a pose and losing tracking cannot complete repetitions',()=>{
 const c=new PoseCounter(),hold=driver(c);hold('open');hold('open');assert.equal(c.reps,0);hold(null);hold('down');assert.equal(c.reps,0);hold('open');hold('down');assert.equal(c.reps,1);
});
test('reload preserves counts but discards partial movement',()=>{
 const c=new PoseCounter({stage:1,reps:49}),hold=driver(c);hold('rightUp');assert.equal(c.reps,49);hold('leftUp');hold('rightUp');assert.equal(c.reps,50);assert.equal(c.transitioning,true);
 const restored=new PoseCounter({stage:1,reps:50});assert.equal(restored.transitioning,true);
});
test('paused and hidden intervals discard unfinished movement',()=>{
 const c=new PoseCounter(),hold=driver(c);hold('open');c.resetTracking();hold('down');assert.equal(c.reps,0);
});
test('skip differs from completion and pause survives restart',()=>{
 let s=transition(initialState(0),'start',0);s=transition(s,'pause',1000,{minutes:30});assert.equal(s.active,false);assert.equal(s.completed,0);assert.equal(s.nextAt,1801000);
 s=transition(s,'start',2000);s=transition(s,'complete',3000);assert.equal(s.completed,1);assert.equal(transition(s,'complete',4000).completed,1);
});
test('manual pause stays paused, settings do not undo it',()=>{let s=transition(initialState(0),'pause',5,{minutes:0});s=transition(s,'settings',10,{interval:25});assert.equal(s.nextAt,null);assert.equal(s.paused,true);s=transition(s,'resume',100);assert.equal(s.nextAt,1500100);});
