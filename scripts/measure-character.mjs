// Independent image measurements for sequence QA (not used by the player).
export function measureCharacter(data,width,height){
 const alpha=(x,y)=>x>=0&&x<width&&y>=0&&y<height&&data[(y*width+x)*4+3]>220;
 let x1=width,y1=height,x2=0,y2=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(alpha(x,y)){x1=Math.min(x1,x);x2=Math.max(x2,x+1);y1=Math.min(y1,y);y2=Math.max(y2,y+1);}
 let sum=0,count=0;
 for(let y=y2-12;y<y2;y++)for(let x=x1;x<x2;x++)if(alpha(x,y)){sum+=x;count++;}
 const center=sum/count,cx=Math.round(center);
 const span=y=>{
  let seed=cx;
  if(!alpha(seed,y)){
   seed=-1;for(let offset=1;offset<width*.08;offset++){
    if(alpha(cx+offset,y)){seed=cx+offset;break;}
    if(alpha(cx-offset,y)){seed=cx-offset;break;}
   }
   if(seed<0)return 0;
  }
  let left=seed,right=seed;
  while(alpha(left-1,y))left--;while(alpha(right+1,y))right++;
  return right-left+1;
 };
 let pompom=false,stem=false,bodyTop=null;
 for(let y=y1;y<height*.5;y++){
  const w=span(y);
  if(!pompom&&w>width*.09)pompom=true;
  else if(pompom&&!stem&&w<width*.065)stem=true;
  else if(stem&&w>width*.13){bodyTop=y;break;}
 }
 if(bodyTop===null)throw Error('Cannot locate torso');
 const bodyHeight=y2-bodyTop,colors=[[],[],[]];
 for(let y=Math.round(bodyTop+bodyHeight*.45);y<bodyTop+bodyHeight*.78;y++)for(let x=Math.round(center-width*.13);x<center+width*.13;x++){
  const n=(y*width+x)*4;
  if(data[n+3]>250&&data[n+1]>85)for(let k=0;k<3;k++)colors[k].push(data[n+k]);
 }
 const rgb=colors.map(values=>{values.sort((a,b)=>a-b);const v=values.slice(Math.floor(values.length*.1),Math.floor(values.length*.9));return v.reduce((a,b)=>a+b,0)/v.length;});
 return {bodyTop,bodyHeight,bodyWidth:span(Math.round(bodyTop+bodyHeight*.75)),feetCenter:center,baseline:y2,rgb,luminance:rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
}
