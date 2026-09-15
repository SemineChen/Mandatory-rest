import test from 'node:test';
import assert from 'node:assert/strict';
import {frameAt,sequenceFor} from '../src/sequence.js';
import * as sequence from '../src/sequence.js';
test('idle blink rests open, closes briefly, and reopens before looping',()=>{
 assert.equal(typeof sequence.blinkFrameAt,'function');
 for(const ms of [0,3199,3460,5199,5200,-100])assert.equal(sequence.blinkFrameAt(ms),0);
 assert.equal(sequence.blinkFrameAt(3200),1);
 assert.equal(sequence.blinkFrameAt(3270),2);
 assert.equal(sequence.blinkFrameAt(3359),2);
 assert.equal(sequence.blinkFrameAt(3360),1);
 assert.equal(sequence.blinkFrameAt(8400),1);
});
test('animation loops sixteen frames and respects tempo',()=>{assert.equal(frameAt(0,8),0);assert.equal(frameAt(1875,8),15);assert.equal(frameAt(2000,8),0);assert.equal(frameAt(1000,4),4);});
test('exercise and waiting modes resolve without missing media',()=>{assert.equal(sequenceFor('open'),'wings');assert.equal(sequenceFor('confused'),'seated');assert.equal(sequenceFor('twist'),'twist');assert.equal(sequenceFor('unknown'),'seated');});

test('every exercise id selects its own demonstration',()=>{for(const id of ['wings','updown','twist'])assert.equal(sequenceFor(id),id);});
