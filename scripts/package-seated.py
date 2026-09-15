from pathlib import Path
import subprocess,json
from PIL import Image
import imageio_ffmpeg
root=Path(__file__).resolve().parents[1];ff=imageio_ffmpeg.get_ffmpeg_exe();out=root/'public/assets/sequences';metadata={}
key="format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='clip(255*(1-(min(r(X,Y),b(X,Y))-g(X,Y)-15)/55),0,255)'"
for pair in json.loads((root/'docs/sequences/seated-pair-sources.json').read_text()):
 p=out/f"seated-pair-{pair['i']}.png"
 subprocess.run([ff,'-v','error','-i',pair['path'],'-vf',key,'-frames:v','1','-y',str(p)],check=True)
 im=Image.open(p);metadata[p.name]=[]
 for i in range(2):
  # Reading alpha for bbox only. Original generated pixels stay unchanged.
  region=im.crop((i*im.width//2,0,(i+1)*im.width//2,im.height))
  b=region.getchannel('A').point(lambda a:255 if a>220 else 0).getbbox()
  metadata[p.name].append(b)
for name in ['wings','updown','twist']:
 im=Image.open(out/f'{name}.png');metadata[f'{name}.png']=[]
 for i in range(16):
  w=im.width/4;h=im.height/4
  region=im.crop((int(i%4*w),int(i//4*h),int((i%4+1)*w),int((i//4+1)*h)))
  metadata[f'{name}.png'].append(region.getchannel('A').point(lambda a:255 if a>220 else 0).getbbox())
(out/'bounds.json').write_text(json.dumps(metadata));print('Packaged 16 high-resolution seated frames and measured all frame bounds')
