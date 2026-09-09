import {createMascot} from './mascot.js';
import {PoseCounter} from './pose.js';
import {ACTIONS} from './flow.js';
import {createVoiceGuide} from './voice.js';
import {createRepDing} from './ding.js';
const $=id=>document.getElementById(id),extension=!!globalThis.chrome?.runtime?.id;
const voice=createVoiceGuide(undefined,undefined,()=>{$('voice-status').hidden=false;});
const ding=createRepDing();
const send=async m=>{if(!extension)return null;const r=await chrome.runtime.sendMessage(m);if(r?.error)throw Error(r.error);return r;};
let mascot,counter=new PoseCounter(),session=null,stream,detector,frameId,generation=0,running=false,finished=false,lastVideo=-1,lastInference=0,busy=false,workerReadyReject=null;
createMascot($('mascot')).then(m=>mascot=m).catch(e=>{$('model-error').hidden=false;console.error(e);});
function setView(view){document.body.dataset.view=view;}
let backdropGeneration=0;
function clearBackdrop(){backdropGeneration++;$('work-snapshot').removeAttribute('src');$('work-snapshot').hidden=true;}
async function loadBackdrop(){
 const request=++backdropGeneration;
 if(!extension){$('preview-workspace').src='demo-workspace.html';$('preview-workspace').hidden=false;$('preview-label').hidden=false;$('background-empty').hidden=true;return;}
 const {image}=await send({type:'backdrop'});if(request!==backdropGeneration)return;const img=$('work-snapshot');img.hidden=!image;$('background-empty').hidden=!!image;if(image)img.src=image;else img.removeAttribute('src');
}
loadBackdrop().catch(console.warn);

async function init(){if(extension){session=await send({type:'get'});counter=new PoseCounter(session);if(!session.active){$('start').textContent='开始一组休息 ↗';}else if(session.stage===3){await complete();}}}
init().catch(showError);
function stopCamera(){voice.stop();counter.resetTracking();generation++;running=false;cancelAnimationFrame(frameId);stream?.getTracks().forEach(t=>t.stop());stream=null;$('video').srcObject=null;workerReadyReject?.(new DOMException('Cancelled','AbortError'));workerReadyReject=null;detector?.terminate();detector=null;busy=false;}
function showError(e){setView('exercise');document.body.dataset.tracking='unclear';stopCamera();$('retry').hidden=false;$('camera-placeholder').hidden=false;$('camera-placeholder').textContent='摄像头暂时不可用';$('feedback').textContent='进度已保留';$('hint').textContent=e.name==='NotAllowedError'?'请允许摄像头权限，然后重试。':e.name==='NotFoundError'?'没有找到摄像头，请连接设备后重试。':'未能启动识别，请检查摄像头或重新尝试。';mascot?.setMode('confused');console.error(e);}
async function start(){
 if(running)return;
 setView('exercise');document.body.dataset.tracking='pending';$('start').disabled=true;$('welcome').hidden=true;$('exercise').hidden=false;$('retry').hidden=true;
 $('voice-status').hidden=true;voice.announce(counter);ding.unlock();
 try{
  if(extension&&!session?.active){session=await send({type:'start'});counter=new PoseCounter(session);}
  setView('exercise');$('welcome').hidden=true;$('exercise').hidden=false;const token=++generation;
  const acquired=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:480},height:{ideal:360},frameRate:{ideal:15,max:20},facingMode:'user'},audio:false});
  if(token!==generation){acquired.getTracks().forEach(t=>t.stop());return;}
  stream=acquired;$('video').srcObject=stream;await $('video').play();
  const d=new Worker(new URL('pose-worker.js',location.href));detector=d;
  await new Promise((resolve,reject)=>{
   workerReadyReject=reject;
   d.onerror=e=>reject(new Error(e.message));
   d.onmessage=({data})=>{if(data.type==='ready')resolve();else if(data.type==='error')reject(new Error(data.message));};
   d.postMessage({type:'init',wasm:new URL('wasm/',location.href).href,model:new URL('assets/pose_landmarker_lite.task',location.href).href});
  });
  workerReadyReject=null;
  if(token!==generation){d.terminate();return;}
  d.onmessage=({data})=>receive(data,token);
  d.onerror=e=>{if(token===generation)showError(new Error(e.message));};
  running=true;lastVideo=-1;lastInference=0;busy=false;$('camera-placeholder').hidden=true;render();
  stream.getVideoTracks()[0].addEventListener('ended',()=>{if(running)showError(new Error('Camera ended'));});
  frameId=requestAnimationFrame(tick);
 }catch(e){if(e.name!=='AbortError')showError(e);}finally{$('start').disabled=false;}
}
function draw(p){
 const canvas=$('skeleton'),w=$('video').videoWidth||480,h=$('video').videoHeight||360;
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const c=canvas.getContext('2d');c.clearRect(0,0,w,h);if(!p)return;
 c.strokeStyle='#dcf6a9';c.fillStyle='#f4ffe7';c.lineWidth=3;
 for(const [a,b] of [[11,12],[11,13],[13,15],[12,14],[14,16]]){
  if(p[a].visibility<.5||p[b].visibility<.5)continue;
  c.beginPath();c.moveTo(p[a].x*w,p[a].y*h);c.lineTo(p[b].x*w,p[b].y*h);c.stroke();
 }
}
async function tick(t){
 if(!running)return;
 frameId=requestAnimationFrame(tick);
 if(document.hidden||busy||t-lastInference<67||lastVideo===$('video').currentTime)return;
 lastInference=t;lastVideo=$('video').currentTime;busy=true;
 const token=generation;
 try{
  const frame=await createImageBitmap($('video'));
  if(token!==generation||!running){frame.close();return;}
  detector.postMessage({type:'frame',frame,time:t},[frame]);
 }catch(e){if(token===generation)showError(e);}
}
async function receive(data,token){
 if(token!==generation||!running)return;
 if(data.type==='error'){showError(new Error(data.message));return;}
 if(data.type!=='result')return;
 try{
  if(document.hidden){counter.resetTracking();return;}
  const beforeState={stage:counter.stage,reps:counter.reps};
  const before=`${beforeState.stage}-${beforeState.reps}`;
  counter.update(data.points,data.time);draw(data.points);render();
  if(before!==`${counter.stage}-${counter.reps}`){
   ding.playForChange(beforeState,{stage:counter.stage,reps:counter.reps});
   await send({type:'progress',stage:counter.stage,reps:counter.reps,sessionId:session?.sessionId});
   if(token!==generation)return;
   if(counter.stage===3)await complete();
  }
 }catch(e){if(token===generation)showError(e);}
 finally{if(token===generation)busy=false;}
}
function render(){
 const stage=counter.stage,action=ACTIONS[stage];
 if(!action)return;
 const switching=counter.transitioning,next=ACTIONS[stage+1];
 voice.announce(counter);
 document.body.dataset.tracking=counter.visible||switching?'visible':'unclear';
 $('header-stage').textContent=`第 ${stage+1} 组 / ${action.name}`;
 $('next-action').textContent=next?`${next.name} × 50`:'完成后返回工作';
 $('action-title').textContent=switching?'这一组完成了':action.name;
 $('step-label').textContent=`${stage+1} / 3`;
 $('instruction').textContent=switching?`${counter.remaining} 秒后开始：${next.name}`:action.instruction;
 $('count').textContent=counter.reps;$('total').textContent=' / 50';
 $('hold').style.width=`${counter.reps*2}%`;
 $('status').textContent=switching?'✓ 换个动作':counter.visible?'● 正在计数':'◌ 等待入镜';
 $('feedback').textContent=switching?'放松一下，准备下一组':!counter.visible?(stage===2?'双肩入镜':'肩膀和一侧手肘入镜'):action.rule;
 $('hint').textContent=switching?next.rule:!counter.visible?'暂时看不清 · 次数保留':counter.partial?'可见手臂计数 · 连贯做':'实时计数 · 不用停住';
 $('speech').textContent=switching?`接下来，${next.name}`:!counter.visible?'调整一下，我在等你':`一起做${action.name}`;
 mascot?.setMode(switching?'idle':!counter.visible?'confused':['open','updown','twist'][stage]);
}
async function complete(){
 stopCamera();if(finished)return;
 if(extension){const r=await send({type:'complete',sessionId:session?.sessionId});if(r.active)throw Error('Completion not accepted');session=r;}
 finished=true;setView('done');document.body.dataset.tracking='visible';$('header-stage').textContent='3 组 / 150 次完成';$('exercise').hidden=true;$('welcome').hidden=true;$('done').hidden=false;$('status').textContent='✓ 休息完成';$('step-label').textContent='3 / 3';$('speech').textContent='好啦，电脑还给你';$('lock-note').textContent='✓ 网页已恢复 · 摄像头已关闭';mascot?.setMode('celebrate');voice.announce({stage:3});
}
$('start').onclick=start;$('retry').onclick=start;
$('exit').onclick=()=>{document.body.dataset.pausing='true';stopCamera();mascot?.setMode('confused');$('pause-dialog').showModal();};
$('cancel').onclick=()=>{delete document.body.dataset.pausing;$('pause-dialog').close();if(!$('exercise').hidden){$('retry').hidden=false;$('feedback').textContent='已暂停，点击重新开启摄像头';}mascot?.setMode('idle');};
$('pause-dialog').addEventListener('cancel',()=>{delete document.body.dataset.pausing;if(!$('exercise').hidden)$('retry').hidden=false;});
for(const button of document.querySelectorAll('[data-minutes]'))button.onclick=async()=>{button.disabled=true;try{stopCamera();await send({type:'pause',minutes:Number(button.dataset.minutes)});$('pause-dialog').close();delete document.body.dataset.pausing;setView('done');document.body.dataset.outcome='paused';$('welcome').hidden=true;$('exercise').hidden=true;$('done').hidden=false;document.querySelector('#done h2').textContent='给自己一点空间。';document.querySelector('#done .muted').textContent='提醒已暂停，准备好了再见。';document.querySelector('.completion-note').textContent='本次已跳过，不计完成 · 摄像头已关闭';$('status').textContent='Ⅱ 提醒已暂停';$('lock-note').textContent='网页已恢复';$('speech').textContent='没关系，我会在这里等你。';mascot?.setMode('idle');}catch(e){alert(e.message);}finally{button.disabled=false;}};
$('return').onclick=async()=>{clearBackdrop();stopCamera();if(extension){await send({type:'return'});window.close();}else location.href='popup.html';};
window.addEventListener('pagehide',()=>{clearBackdrop();stopCamera();});
function resetWelcome(s){
 setView('welcome');delete document.body.dataset.outcome;delete document.body.dataset.tracking;loadBackdrop().catch(console.warn);
 stopCamera();session=s;counter=new PoseCounter(s);finished=false;
 $('welcome').hidden=false;$('exercise').hidden=true;$('done').hidden=true;$('retry').hidden=true;
 $('status').textContent='● 准备开始';$('step-label').textContent='1 / 3';$('header-stage').textContent='第 1 组 / 大鹏展翅';
 document.querySelector('#done h2').textContent='这一组完成啦！';
 document.querySelector('#done .muted').textContent='身体松了口气，好状态也回来了。';
 document.querySelector('.completion-note').textContent='三组动作共 150 次已完成 · 摄像头已关闭';
 $('speech').textContent='新的一小段休息，一起伸个懒腰吧。';
 $('lock-note').textContent='▣ 休息完成后，网页自动恢复';mascot?.setMode('idle');
}
function showPaused(s){
 setView('welcome');
 stopCamera();session=s;$('exercise').hidden=true;$('welcome').hidden=false;$('done').hidden=true;
 $('status').textContent='Ⅱ 提醒已暂停';$('start').textContent='准备好了，开始新的一组 ↗';
 $('speech').textContent='没关系，准备好了再来找我。';$('lock-note').textContent='网页已恢复 · 摄像头已关闭';mascot?.setMode('idle');
}
document.addEventListener('visibilitychange',()=>{counter.resetTracking();if(document.hidden)voice.stop();});
if(extension)chrome.storage.onChanged.addListener(changes=>{
 const s=changes.rest?.newValue;if(!s)return;
 if(s.active&&s.sessionId!==session?.sessionId){resetWelcome(s);return;}
 if(!s.active){stopCamera();if(s.paused)showPaused(s);}
 session=s;
});
