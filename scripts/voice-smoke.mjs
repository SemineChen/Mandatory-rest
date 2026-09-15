import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.goto('http://localhost:4173/break.html');
 const source=await readFile('src/voice.js','utf8');
 await page.evaluate(async source=>{
  const {createVoiceGuide}=await import(URL.createObjectURL(new Blob([source],{type:'text/javascript'})));
  window.voiceClips=[];window.voiceWarnings=0;
  window.guide=createVoiceGuide({createAudio:src=>{const a=new Audio(src);window.voiceClips.push(a);return a;},onUnavailable:()=>window.voiceWarnings++});
  const button=document.createElement('button');button.id='voice-test';button.textContent='Test audio';button.style='position:fixed;top:0;left:0;z-index:2147483647';document.body.append(button);
  button.onclick=()=>window.guide.announce(window.voiceState);
 },source);
 const states=[{stage:0},{stage:0,transitioning:true},{stage:1},{stage:1,transitioning:true},{stage:2},{stage:3}];
 const result=[];
 for(const state of states){
  await page.evaluate(state=>window.voiceState=state,state);
  await page.locator('#voice-test').click();
  await page.waitForFunction(()=>window.voiceClips.at(-1)?.ended||window.voiceWarnings>0,{},{timeout:12000});
  const info=await page.evaluate(()=>{const a=window.voiceClips.at(-1);return {file:a.src.split('/').pop(),duration:a.duration,ended:a.ended,warnings:window.voiceWarnings};});
  assert.equal(info.warnings,0);assert.equal(info.ended,true);result.push(info);
 }
 await page.evaluate(()=>window.voiceState={stage:0});await page.locator('#voice-test').click();
 await page.waitForFunction(()=>window.voiceClips.at(-1).currentTime>.1);
 const stopped=await page.evaluate(()=>{window.guide.stop();return {paused:window.voiceClips.at(-1).paused,time:window.voiceClips.at(-1).currentTime};});
 assert.deepEqual(stopped,{paused:true,time:0});
 console.log(JSON.stringify({clips:result,stop:stopped},null,2));
}finally{await browser.close();}
