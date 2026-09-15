import bounds from '../public/assets/sequences/bounds.json' with {type:'json'};
import calibration from '../public/assets/sequences/motion-calibration.json' with {type:'json'};
export const frameAt=(elapsed,fps=8)=>Math.floor(Math.max(0,elapsed)*fps/1000)%16;
export function blinkFrameAt(elapsed){
 const time=Math.max(0,elapsed)%5200;
 return time<3200||time>=3460?0:time<3270||time>=3360?1:2;
}
export const sequenceFor=mode=>({idle:'seated',confused:'seated',celebrate:'seated',open:'wings',wings:'wings',updown:'updown',twist:'twist'}[mode]||'seated');
const twistOrder=[0,1,3,4,5,4,3,1,0,8,7,12,13,12,7,8];
export function createSequence(canvas){
 const ctx=canvas.getContext('2d'),images=new Map();
 let blinkFrames=null;
 let current='seated',start=performance.now(),raf=0,disposed=false,last=-1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function prepareBlinkFrames(){
  const base=images.get('seated-pair-0'),eyes=images.get('seated-pair-4');
  if(blinkFrames||!base?.complete||!base.naturalWidth||!eyes?.complete||!eyes.naturalWidth)return;
  const w=base.naturalWidth/2,h=base.naturalHeight;
  // Freeze the original body pixels. Only the two feathered eye patches change.
  blinkFrames=[0,1,2].map(frame=>{
   const result=document.createElement('canvas');result.width=w;result.height=h;
   const context=result.getContext('2d');context.drawImage(base,0,0,w,h,0,0,w,h);
   if(frame)for(const x of [322,550]){
    const y=156,pw=92,ph=80,patch=document.createElement('canvas');patch.width=pw;patch.height=ph;
    const pc=patch.getContext('2d');
    pc.drawImage(eyes,(frame-1)*eyes.naturalWidth/2+x,y,pw,ph,0,0,pw,ph);
    pc.globalCompositeOperation='destination-in';
    pc.translate(pw/2,ph/2);pc.scale(pw/2,ph/2);
    const mask=pc.createRadialGradient(0,0,.88,0,0,1);mask.addColorStop(0,'#fff');mask.addColorStop(1,'#fff0');
    pc.fillStyle=mask;pc.fillRect(-1,-1,2,2);context.drawImage(patch,x,y);
   }
   return result;
  });
 }
 function load(key){
  if(images.has(key))return images.get(key);
  const image=new Image();image.src=`assets/sequences/${key}.png?v=motion-stable-1`;
  image.onload=()=>{
   if(disposed)return;
   prepareBlinkFrames();last=-1;canvas.dispatchEvent(new Event('sequence-ready'));
  };
  image.onerror=()=>canvas.dispatchEvent(new Event('sequence-error'));
  images.set(key,image);return image;
 }
 function tick(time){
  if(disposed)return;raf=requestAnimationFrame(tick);if(document.hidden)return;
  const frame=reduced.matches?0:frameAt(time-start,current==='seated'||current==='updown'?4:6)%(current==='updown'?8:16);
  const seated=current==='seated',index=seated?0:current==='twist'?twistOrder[frame]:frame;
  const key=seated?'seated-pair-0':`${current}-pair-stable-${Math.floor(index/2)}`;
  const img=load(key);if(!img.complete||!img.naturalWidth)return;
  if(!seated&&last===frame)return;
  last=frame;const columns=2,rows=1;
  const w=img.naturalWidth/columns,h=img.naturalHeight/rows;
  if(canvas.width!==Math.ceil(w)||canvas.height!==Math.ceil(h)){canvas.width=Math.ceil(w);canvas.height=Math.ceil(h);ctx.imageSmoothingQuality='high';}
  const [x1,y1,x2,y2]=bounds[`${key}.png`]?.[index]||[0,0,w,h],bw=x2-x1,bh=y2-y1;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();if(seated){const breath=reduced.matches?0:Math.sin((time-start)*Math.PI/2400);ctx.translate(canvas.width/2,canvas.height*.98);ctx.scale(1+breath*.003,1+breath*.006);ctx.translate(-canvas.width/2,-canvas.height*.98);}
  const blink=seated&&!reduced.matches&&blinkFrames?blinkFrameAt(time-start):0;
  if(seated)ctx.drawImage(blinkFrames?.[blink]||img,x1,y1,bw,bh,(canvas.width-bw)/2,canvas.height*.98-bh,bw,bh);
  else {
   const anchor=calibration.frames[current][index];
   // Register generated torso proportions against shared body anchors. Hand spread
   // never changes body size; twist widths retain the original view proportions.
   const sx=anchor.targetWidth/anchor.bodyWidth,sy=calibration.targetBodyHeight/anchor.bodyHeight;
   ctx.drawImage(img,index%2*w,0,w,h,canvas.width/2-anchor.feetCenter*sx,canvas.height*.98-anchor.baseline*sy,w*sx,h*sy);
  }
  ctx.restore();canvas.dataset.frame=String(frame);canvas.dataset.sequence=current;canvas.dataset.blink=String(blink);
 }
 load('seated-pair-0');raf=requestAnimationFrame(tick);
 load('seated-pair-4');
 load('wings-pair-stable-0');
 return {setMode(mode){const next=sequenceFor(mode);if(current===next)return;current=next;start=performance.now();last=-1;
  if(next!=='seated')for(let pair=0;pair<(next==='updown'?4:8);pair++)load(`${next}-pair-stable-${pair}`);
 },dispose(){disposed=true;cancelAnimationFrame(raf);images.clear();blinkFrames=null;}};
}
