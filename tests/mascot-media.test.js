import test from 'node:test';
import assert from 'node:assert/strict';
import {createMascotMedia} from '../src/mascot-media.js';
function video(){return {hidden:true,dataset:{},src:'',pause(){},load(){},play(){return Promise.resolve();},removeAttribute(){this.src='';},addEventListener(n,f){this[n]=f;},removeEventListener(){}};}
test('unconfigured modes stay on fallback without requesting missing files',()=>{const v=video(),fallback={hidden:false};const media=createMascotMedia(v,fallback,{});media.setMode('open');assert.equal(v.src,'');assert.equal(fallback.hidden,false);});
test('shows video only once playable and falls back after a playback error',async()=>{const v=video(),fallback={hidden:false};const media=createMascotMedia(v,fallback,{open:'assets/video/wings.webm'});media.setMode('open');assert.equal(fallback.hidden,false);await v.loadeddata();assert.equal(v.hidden,false);assert.equal(fallback.hidden,true);v.error();assert.equal(v.hidden,true);assert.equal(fallback.hidden,false);});
test('switching to an unconfigured mode restores the fallback',async()=>{const v=video(),fallback={hidden:false};const media=createMascotMedia(v,fallback,{open:'assets/video/wings.webm'});media.setMode('open');await v.loadeddata();media.setMode('confused');assert.equal(v.hidden,true);assert.equal(fallback.hidden,false);});
