// Preview uses this actual document as the host, with the same transparent surface.
if(new URLSearchParams(location.search).has('rest-preview')){
 const frame=document.createElement('iframe');
 frame.src='break.html?overlay=1';frame.title='禁止久坐 · 页面覆盖层预览';frame.allow='camera; autoplay';
 frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647;background:transparent;color-scheme:normal';
 document.body.append(frame);
 window.addEventListener('message',event=>{
  if(event.source===frame.contentWindow&&event.origin===location.origin&&event.data?.type==='rest-preview-close')frame.remove();
 });
}
