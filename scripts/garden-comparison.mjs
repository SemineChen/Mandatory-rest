import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/garden-ui';
const browser=await chromium.launch();const page=await browser.newPage();
const images=await Promise.all(['artifacts/ui-reference/reference.png',dir+'/exercise-waiting.png'].map(async f=>'data:image/png;base64,'+(await readFile(f)).toString('base64')));
const result=await page.evaluate(async images=>{
 const load=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src;});
 const [a,b]=await Promise.all(images.map(load));const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;const c=canvas.getContext('2d');
 c.drawImage(a,0,0);c.globalAlpha=.5;c.drawImage(b,0,0);const overlay=canvas.toDataURL();
 c.globalAlpha=1;c.drawImage(a,0,0);c.globalCompositeOperation='difference';c.drawImage(b,0,0);return{overlay,diff:canvas.toDataURL()};
},images);
for(const [key,data]of Object.entries(result))await writeFile(dir+'/'+key+'.png',Buffer.from(data.split(',')[1],'base64'));
await browser.close();
