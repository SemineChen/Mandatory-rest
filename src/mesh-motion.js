// Deform one consistent texture so motion never dissolves between different faces.
export function drawMotion(ctx,img,mode,phase){
 const w=img.width,h=img.height,N=18;
 const ease=(1-Math.cos(phase))/2;
 function point(x,y){
  let dx=0,dy=0;
  if(mode==='twist'){const t=Math.sin(phase)*.065,weight=Math.sin(Math.PI*Math.min(1,y/h));dx=t*w*weight;}
  else for(const side of [-1,1]){
   const px=w*(side<0?.27:.73),py=h*.49;
   const outer=side<0?(w*.32-x)/(w*.19):(x-w*.68)/(w*.19);
   const vert=Math.max(0,Math.min(1,(y/h-.38)/.13))*Math.max(0,Math.min(1,(.84-y/h)/.12));
   const weight=Math.max(0,Math.min(1,outer))*vert;
   const amount=mode==='wings'?ease:(side<0?Math.max(0,Math.sin(phase)):Math.max(0,-Math.sin(phase)));
   const angle=-side*amount*1.5,xx=x-px,yy=y-py;
   dx+=(xx*Math.cos(angle)-yy*Math.sin(angle)-xx)*weight;
   dy+=(xx*Math.sin(angle)+yy*Math.cos(angle)-yy)*weight;
  }
  return [x+dx,y+dy];
 }
 function tri(s,d){
  const [a,b,c]=s,[p,q,r]=d;
  const den=a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]);
  const calc=k=>[(p[k]*(b[1]-c[1])+q[k]*(c[1]-a[1])+r[k]*(a[1]-b[1]))/den,(p[k]*(c[0]-b[0])+q[k]*(a[0]-c[0])+r[k]*(b[0]-a[0]))/den,(p[k]*(b[0]*c[1]-c[0]*b[1])+q[k]*(c[0]*a[1]-a[0]*c[1])+r[k]*(a[0]*b[1]-b[0]*a[1]))/den];
  const X=calc(0),Y=calc(1);ctx.save();const cx=(p[0]+q[0]+r[0])/3,cy=(p[1]+q[1]+r[1])/3;const pad=v=>{const dx=v[0]-cx,dy=v[1]-cy,k=.65/Math.hypot(dx,dy);return [v[0]+dx*k,v[1]+dy*k];};ctx.beginPath();ctx.moveTo(...pad(p));ctx.lineTo(...pad(q));ctx.lineTo(...pad(r));ctx.closePath();ctx.clip();ctx.transform(X[0],Y[0],X[1],Y[1],X[2],Y[2]);ctx.drawImage(img,0,0);ctx.restore();
 }
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const a=[x*w/N,y*h/N],b=[(x+1)*w/N,y*h/N],c=[x*w/N,(y+1)*h/N],d=[(x+1)*w/N,(y+1)*h/N];
  tri([a,b,c],[point(...a),point(...b),point(...c)]);tri([b,d,c],[point(...b),point(...d),point(...c)]);
 }
}
