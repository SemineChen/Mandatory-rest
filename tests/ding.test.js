import test from 'node:test';
import assert from 'node:assert/strict';
import {createRepDing, repAdvanced} from '../src/ding.js';

test('rep ding only triggers when a repetition is added',()=>{
 assert.equal(repAdvanced({stage:0,reps:1},{stage:0,reps:2}),true);
 assert.equal(repAdvanced({stage:2,reps:49},{stage:3,reps:50}),true);
 assert.equal(repAdvanced({stage:0,reps:50},{stage:1,reps:0}),false);
 assert.equal(repAdvanced({stage:0,reps:5},{stage:0,reps:5}),false);
});

test('audio context plays one short beep per counted repetition',()=>{
 const events=[];
 class FakeContext{
  constructor(){this.currentTime=1;this.destination={};this.state='running';}
  createOscillator(){return {
   type:null,frequency:{setValueAtTime:(value,time)=>events.push(['frequency',value,time])},
   connect:()=>events.push(['osc-connect']),
   start:time=>events.push(['start',time]),
   stop:time=>events.push(['stop',time])
  };}
  createGain(){return {
   gain:{
    setValueAtTime:(value,time)=>events.push(['gain',value,time]),
    exponentialRampToValueAtTime:(value,time)=>events.push(['fade',value,time])
   },
   connect:()=>events.push(['gain-connect'])
  };}
 }
 const ding=createRepDing({AudioContext:FakeContext});
 ding.playForChange({stage:0,reps:1},{stage:0,reps:2});
 ding.playForChange({stage:0,reps:50},{stage:1,reps:0});
 assert.equal(events.filter(([name])=>name==='start').length,1);
 assert.equal(events.filter(([name])=>name==='stop').length,1);
});
