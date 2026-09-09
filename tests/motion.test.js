import test from 'node:test';import assert from 'node:assert/strict';import {MotionCounter} from '../src/motion.js';
function p(kind){const a=Array.from({length:33},()=>({x:.5,y:.2,z:0,visibility:1}));for(const [i,x,y] of [[11,.4,.3],[12,.6,.3],[13,.35,.45],[14,.65,.45],[15,.35,.58],[16,.65,.58]])a[i]={x,y,z:0,visibility:1};if(kind==='open')for(const [i,x]of [[13,.25],[14,.75],[15,.1],[16,.9]])a[i]={x,y:.3,z:0,visibility:1};if(kind==='leftUp'){a[15].y=.05;a[13].y=.17;}if(kind==='rightUp'){a[16].y=.05;a[14].y=.17;}if(kind==='left')a[11].z=-.15;if(kind==='right')a[11].z=.15;for(let i=23;i<33;i++)a[i].visibility=0;return a;}
function hold(c,kind,t){let n=0;for(let i=0;i<7;i++)if(c.update(p(kind),t+i*100))n++;return n;}
test('wings count only after open and return',()=>{const c=new MotionCounter('wings');assert.equal(hold(c,'open',0),0);assert.equal(hold(c,'down',800),1);assert.equal(hold(c,'down',1600),0);});
test('opposing reaches need both sides before count',()=>{const c=new MotionCounter('updown');assert.equal(hold(c,'leftUp',0),0);assert.equal(hold(c,'leftUp',800),0);assert.equal(hold(c,'rightUp',1600),1);assert.equal(hold(c,'rightUp',2400),0);});
test('twist needs left, right, then center',()=>{const c=new MotionCounter('twist');assert.equal(hold(c,'left',0),0);assert.equal(hold(c,'right',800),0);assert.equal(hold(c,'down',1600),1);});
test('lost pose cancels unfinished movement',()=>{const c=new MotionCounter('wings');hold(c,'open',0);c.update(null,800);assert.equal(hold(c,'down',1600),0);});
function sample(c,points,t){c.update(points,t);return c.update(points,t+67);}
function cropHands(points){for(const i of [15,16])points[i]={x:2,y:2,visibility:0};return points;}
test('natural movement counts without a timed hold',()=>{
 const c=new MotionCounter('wings');assert.equal(sample(c,p('open'),0),false);
 assert.equal(sample(c,p('down'),134),true);assert.equal(sample(c,p('down'),268),false);
});
test('wings and opposing reaches use elbows when wrists leave the frame',()=>{
 for(const [id,first,last] of [['wings','open','down'],['updown','leftUp','rightUp']]){
  const c=new MotionCounter(id);sample(c,cropHands(p(first)),0);
  assert.equal(sample(c,cropHands(p(last)),134),true);
 }
});
test('twists do not require head, elbows or hands',()=>{
 const c=new MotionCounter('twist');
 const shoulderPose=kind=>{const points=p(kind);for(const i of [0,13,14,15,16])points[i].visibility=0;return points;};
 sample(c,shoulderPose('left'),0);sample(c,shoulderPose('right'),134);
 assert.equal(sample(c,shoulderPose('down'),268),true);
});
test('single frame noise cannot count a rep',()=>{
 const c=new MotionCounter('wings');c.update(p('open'),0);assert.equal(sample(c,p('down'),67),false);
});
test('one visible arm can count but opposite arms cannot be stitched into one cycle',()=>{
 const side=(kind,missing)=>{const points=p(kind);for(const i of missing)points[i].visibility=0;return points;};
 const c=new MotionCounter('wings');sample(c,side('open',[14,16]),0);
 assert.equal(sample(c,side('down',[14,16]),134),true);
 sample(c,side('open',[14,16]),268);
 assert.equal(sample(c,side('down',[13,15]),402),false);
});
test('invisible limbs never count and long missing intervals discard partial cycles',()=>{
 const c=new MotionCounter('wings');sample(c,p('open'),0);
 const missing=p('down');for(const i of [13,14,15,16])missing[i].visibility=0;
 assert.equal(sample(c,missing,1000),false);assert.equal(sample(c,p('down'),1200),false);
});
