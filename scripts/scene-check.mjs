import {chromium} from '@playwright/test';
const browser=await chromium.launch();const page=await browser.newPage();
for(const [name,width,height]of [['desktop',1536,1024],['square',1000,960]]){
 await page.setViewportSize({width,height});await page.goto('http://localhost:4178/');const f=page.frameLocator('.rest-overlay');await f.locator('#mascot[data-frame]').waitFor();if(name==='desktop')await page.screenshot({path:'artifacts/sequences/highres-welcome.png'});await f.locator('#start').click();await f.locator('#retry').waitFor({state:'visible'});await page.screenshot({path:`artifacts/sequences/grounded-${name}.png`});
 console.log(name,await f.locator('.scene').evaluate(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,viewport:innerHeight};}));
}await browser.close();
