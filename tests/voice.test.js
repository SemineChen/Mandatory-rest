import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceGuide} from '../src/voice.js';
function setup(){
 const spoken=[];let cancelled=0;
 const voice={lang:'zh-CN',localService:true};
 const synth={getVoices:()=>[voice],cancel:()=>cancelled++,speak:u=>spoken.push(u)};
 const guide=createVoiceGuide(synth,class{constructor(text){this.text=text;}});
 return {guide,spoken,voice,get cancelled(){return cancelled;}};
}
test('announces each action once, including its name and target',()=>{
 const {guide,spoken,voice}=setup();
 guide.announce({stage:0});guide.announce({stage:0,reps:1});guide.announce({stage:0,reps:2});
 assert.equal(spoken.length,1);assert.match(spoken[0].text,/大鹏展翅.*50/);assert.equal(spoken[0].voice,voice);
 guide.announce({stage:1});assert.match(spoken[1].text,/上下齐发.*50/);
 guide.announce({stage:2});assert.match(spoken[2].text,/扭转乾坤.*50/);
});
test('transition, completion and resumed action have distinct announcements',()=>{
 const s=setup();s.guide.announce({stage:0,transitioning:true});s.guide.announce({stage:0,transitioning:true});
 assert.equal(s.spoken.length,1);assert.equal(s.spoken[0].text,'接下来，上下齐发。');
 s.guide.announce({stage:1});s.guide.stop();s.guide.announce({stage:1});
 assert.equal(s.spoken.length,3);s.guide.announce({stage:3});assert.match(s.spoken.at(-1).text,/150/);
 assert.ok(s.cancelled>0);
});
test('unsupported speech leaves counting available and reports unavailability',()=>{
 let warned=false;const guide=createVoiceGuide(null,null,()=>warned=true);
 assert.doesNotThrow(()=>guide.announce({stage:0}));assert.equal(warned,true);
});
