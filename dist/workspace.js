let frame;
function openRest(){
 if(frame)return;
 frame=document.createElement('iframe');frame.className='rest-overlay';frame.src='break.html?overlay=1';frame.title='歇一会 · 摄像头动作休息';frame.allow='camera; autoplay';
 document.querySelector('.workspace-layout').inert=true;document.querySelector('.workspace-header').inert=true;document.body.append(frame);document.body.style.overflow='hidden';
}
document.getElementById('rest-again').onclick=openRest;
window.addEventListener('message',event=>{if(event.source!==frame?.contentWindow||event.origin!==location.origin||event.data?.type!=='rest-preview-close')return;frame.remove();frame=null;document.body.style.overflow='';document.querySelector('.workspace-layout').inert=false;document.querySelector('.workspace-header').inert=false;document.getElementById('rest-again').focus();});
if(!new URLSearchParams(location.search).has('rest'))openRest();
