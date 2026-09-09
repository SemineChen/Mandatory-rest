import {build} from 'esbuild';
import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true,filter:p=>!p.endsWith('.blend')&&!p.endsWith('.blend1')});
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
