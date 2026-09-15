from pathlib import Path
import subprocess,json,sys
from PIL import Image
import imageio_ffmpeg
root=Path(__file__).resolve().parents[1];ff=imageio_ffmpeg.get_ffmpeg_exe();out=root/'public/assets/sequences';tmp=root/'artifacts/hd-motion';tmp.mkdir(exist_ok=True)
key="format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='clip(255*(1-(min(r(X,Y),b(X,Y))-g(X,Y)-15)/55),0,255)'"
bounds=json.loads((out/'bounds.json').read_text())
for name,source in json.loads(Path(sys.argv[1]).read_text()).items():
 d=tmp/name;d.mkdir(exist_ok=True);im=Image.open(source);w=im.width//2//2*2;h=im.height//2//2*2
 for i in range(12):
  n=i%4
  subprocess.run([ff,'-v','error','-i',source,'-vf',f'crop={w}:{h}:{n%2*(im.width//2)}:{n//2*(im.height//2)}','-frames:v','1','-y',str(d/f'key-{i:02}.png')],check=True)
 # Motion compensated in-betweens; take the middle cycle so loop has context on both ends.
 subprocess.run([ff,'-v','error','-framerate','1.5','-i',str(d/'key-%02d.png'),'-vf',"minterpolate=fps=6:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none,trim=start_frame=16:end_frame=32,setpts=PTS-STARTPTS,"+key,'-frames:v','16','-y',str(out/f'{name}-hd-%02d.png')],check=True)
 for i in range(1,17):
  p=out/f'{name}-hd-{i:02}.png';a=Image.open(p).getchannel('A');bounds[p.name]=[a.point(lambda v:255 if v>220 else 0).getbbox()]
 print(name,w,h,'16 frames',flush=True)
(out/'bounds.json').write_text(json.dumps(bounds))
