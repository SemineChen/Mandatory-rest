import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceGuide} from '../src/voice.js';
function setup(){
 const clips=[];let warnings=0;
 const guide=createVoiceGuide({createAudio:src=>{const a={src,currentTime:2,paused:false,play(){return new Promise((resolve,reject)=>{this.reject=reject;});},pause(){this.paused=true;}};clips.push(a);return a;},onUnavailable:()=>warnings++});
 return {guide,clips,get warnings(){return warnings;}};
}
test('plays each recorded cue once and interrupts the previous cue',()=>{
 const s=setup();
 const states=[{stage:0},{stage:0,transitioning:true},{stage:1},{stage:1,transitioning:true},{stage:2},{stage:3}];
 const names=['wings','next-updown','updown','next-twist','twist','complete'];
 states.forEach((state,i)=>{s.guide.announce(state);s.guide.announce({...state,reps:2});assert.equal(s.clips.length,i+1);assert.equal(s.clips[i].src,`assets/voice/${names[i]}.m4a`);if(i)assert.equal(s.clips[i-1].paused,true);});
});
test('stop silences playback and allows the same action to restart',()=>{
 const s=setup();s.guide.announce({stage:0});s.guide.stop();assert.equal(s.clips[0].paused,true);assert.equal(s.clips[0].currentTime,0);s.guide.announce({stage:0});assert.equal(s.clips.length,2);
});
test('ignores interrupted playback errors but reports a current failure once',async()=>{
 const s=setup();s.guide.announce({stage:0});const oldError=s.clips[0].onerror;s.guide.announce({stage:1});s.clips[0].reject(Error('interrupted'));oldError();await Promise.resolve();assert.equal(s.warnings,0);
 s.clips[1].onerror();s.clips[1].reject(Error('decode'));await Promise.resolve();assert.equal(s.warnings,1);
});
test('unavailable audio reports failure without throwing',()=>{
 let warnings=0;const g=createVoiceGuide({createAudio:()=>{throw Error('unavailable');},onUnavailable:()=>warnings++});assert.doesNotThrow(()=>g.announce({stage:0}));assert.equal(warnings,1);
});
