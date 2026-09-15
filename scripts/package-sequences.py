"""Package generated sprite atlases; ffmpeg performs chroma compositing, no redraw/upscale."""
from pathlib import Path
import subprocess,json
import imageio_ffmpeg
from PIL import Image
root=Path(__file__).resolve().parents[1]
gen=Path('/Users/chenyueping/.codex/generated_images/01a084f1-9e98-7182-ba1d-ba10e11d9158')
items={'seated':'exec-9f5c3354-4fcd-442a-9265-d279397d298d.png','wings':'exec-c9704964-b450-4553-a2e2-181f507f409f.png','updown':'exec-b433f753-f09a-4613-97d4-a6cf632c342a.png','twist':'exec-82b7aefa-72a3-4486-b027-0c543c15d44e.png','speech':'exec-fb678c0d-96b6-4fc1-932f-19b89b3c7b94.png'}
ff=imageio_ffmpeg.get_ffmpeg_exe(); manifest=[]
for name,filename in items.items():
 out=root/'public/assets/sequences'/f'{name}.png'
 subprocess.run([ff,'-v','error','-i',str(gen/filename),'-vf',"format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='clip(255*(1-(min(r(X,Y),b(X,Y))-g(X,Y)-15)/55),0,255)'",'-frames:v','1','-y',str(out)],check=True)
 im=Image.open(out); alpha=im.getchannel('A'); print(name,im.size,alpha.getextrema())
 manifest.append({'name':name,'path':f'assets/sequences/{name}.png','source':str(gen/filename),'width':im.width,'height':im.height,'columns':1 if name=='speech' else 4,'rows':1 if name=='speech' else 4,'frames':1 if name=='speech' else 16,'fps':6 if name=='seated' else 8,'alphaExtrema':alpha.getextrema(),'newPixelsGenerated':True,'resizeWasPrimaryMethod':False})
(root/'public/assets/sequences/manifest.json').write_text(json.dumps(manifest,indent=2))
(root/'docs/sequences/asset-manifest.json').write_text(json.dumps(manifest,indent=2))
