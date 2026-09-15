import {build} from 'esbuild';
import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Keep editable/legacy assets in public, but do not ship inactive renderers
// or superseded animation exports. Current animation uses *-pair-hq-* and
// seated-pair-0/4 (body and blink patches); all MediaPipe WASM variants stay.
function includePublicAsset(path){
 const relative=path.replace(/^public\//,'');
 if(/\.blend1?$/.test(relative))return false;
 if(['assets/hand_landmarker.task','assets/mascot.glb'].includes(relative))return false;
 if(relative==='assets/poses'||relative.startsWith('assets/poses/'))return false;
 if(/^assets\/sequences\/(?:seated|wings|updown|twist)\.png$/.test(relative))return false;
 if(/^assets\/sequences\/(?:wings|updown|twist)-(?:hd-\d+|frames-v2)\.png$/.test(relative))return false;
 if(/^assets\/sequences\/seated-pair-[123567]\.png$/.test(relative))return false;
 return true;
}
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true,filter:includePublicAsset});
await cp('node_modules/@mediapipe/tasks-vision/wasm','dist/wasm',{recursive:true});
await build({entryPoints:['src/background.js','src/content.js','src/break.js','src/popup.js'],outdir:'dist',bundle:true,format:'esm',target:'chrome120',minify:true});
console.log('Extension built in dist/');
await build({entryPoints:['src/pose-worker.js'],outdir:'dist',bundle:true,format:'iife',target:'chrome120',minify:true});
// A refreshed document must not reuse a previous build's cached script.
for(const name of ['break','popup']){
 const hash=createHash('sha256').update(await readFile('dist/'+name+'.js')).digest('hex').slice(0,12);
 const file='dist/'+name+'.html';
 const html=await readFile(file,'utf8');
 await writeFile(file,html.replace('src="'+name+'.js"','src="'+name+'.js?v='+hash+'"'));
}
