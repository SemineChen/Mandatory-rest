from pathlib import Path
import math,subprocess,cv2,numpy as np,json,shutil
import imageio_ffmpeg
from scipy.ndimage import distance_transform_edt
O=Path(__file__).resolve().parent; FF=imageio_ffmpeg.get_ffmpeg_exe()
SRC='/Users/chenyueping/.codex/generated_images/01a09ae6-4743-7f23-af95-148d6f332dc2/exec-fff2b813-dcbc-44e8-9864-b29048bebd11.png'
W,H,FPS,N=960,800,30,240
# Key the achromatic backing at video ingest. Protect the naturally black facial features.
alpha="max(clip((g(X,Y)-min(r(X,Y),b(X,Y))-6)*255/14,0,255),if(lt(pow((X/W-0.5)/0.19,2)+pow((Y/H-0.285)/0.10,2),1),255,0))"
vf="format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='"+alpha+"',scale=900:720:flags=lanczos,pad=960:800:30:40:color=black@0,format=rgba"
r=subprocess.run([FF,'-v','error','-i',SRC,'-vf',vf,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],capture_output=True,check=True)
base=np.frombuffer(r.stdout,np.uint8).reshape(H,W,4).copy();assert base[0,0,3]==0
# Refine the video matte: discard disconnected backing specks and suppress the bright fringe.
a=base[:,:,3]
_,labels,stats,_=cv2.connectedComponentsWithStats((a>24).astype(np.uint8),8)
largest=1+np.argmax(stats[1:,cv2.CC_STAT_AREA]);keep=cv2.dilate((labels==largest).astype(np.uint8),np.ones((3,3),np.uint8))
a=(a*keep).astype(np.uint8);a=cv2.erode(a,np.ones((3,3),np.uint8))
a=cv2.GaussianBlur(a,(3,3),.4);base[:,:,3]=a
solid=cv2.erode((a>250).astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)
_,near=distance_transform_edt(~solid,return_indices=True)
edge=(a>0)&~solid;base[edge,:3]=base[near[0][edge],near[1][edge],:3]
# Premultiply before deformation so the soft fur silhouette has no gray sampling fringe.
prem=base.astype(np.float32)/255;prem[:,:,:3]*=prem[:,:,3:4]
y,x=np.mgrid[:H,:W].astype(np.float32);nx=x/W;ny=y/H
upper=np.exp(-((nx-.5)/.36)**4)*np.clip((.80-ny)/.35,0,1)
belly=np.exp(-(((nx-.5)/.28)**2+((ny-.61)/.28)**2)*1.5)
antenna=np.exp(-(((nx-.5)/.07)**2+((ny-.135)/.12)**2)*1.5)
paw_left=np.exp(-(((nx-.135)/.12)**2+((ny-.55)/.14)**2)*1.8)
paw_right=np.exp(-(((nx-.865)/.12)**2+((ny-.55)/.14)**2)*1.8)
# Keep the resting feet stable while the heavy upper body settles with the breath.
def render(t):
    phase=2*math.pi*t/8
    breath=math.sin(phase)
    tilt=math.sin(phase)*math.radians(1.6)
    dx=(nx-.5)*W*.020*breath*belly
    dy=(ny-.88)*H*.014*breath*belly
    # Head and shoulders move together; the ball antenna follows a little later.
    dx+=(-(y-H*.42)*math.sin(tilt)+(x-W*.5)*(math.cos(tilt)-1))*upper
    dy+=((x-W*.5)*math.sin(tilt)+(y-H*.42)*(math.cos(tilt)-1))*upper
    dy-=3.5*breath*upper
    dx+=antenna*math.sin(phase-.55)*3.5
    dx+=paw_left*math.sin(phase-.35)*2.5-paw_right*math.sin(phase+.25)*2.0
    dy+=paw_left*math.sin(phase-.35)*5.0+paw_right*math.sin(phase+.25)*4.0
    f=cv2.remap(prem,x-dx,y-dy,cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT,borderValue=0)
    f=np.clip(f,0,1);a=f[:,:,3:4];rgb=np.where(a>.001,f[:,:,:3]/np.maximum(a,.001),0)
    return np.concatenate([np.clip(rgb,0,1),a],2)
def enc(name,alpha=False):
    args=[FF,'-v','error','-y','-f','rawvideo','-pix_fmt','rgba' if alpha else 'rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an']
    args+=['-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf','24','-deadline','good','-cpu-used','4','-row-mt','1','-auto-alt-ref','0'] if alpha else ['-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart']
    return subprocess.Popen(args+[str(O/name)],stdin=subprocess.PIPE)
webm=enc('慵懒坐姿-透明.webm',True);mp4=enc('慵懒坐姿-预览.mp4');proof=[]
for k in range(N):
    f=render(k/FPS);b=(f*255+.5).astype(np.uint8)
    webm.stdin.write(b.tobytes())
    bg=np.array([.91,.925,.905],np.float32)
    view=(f[:,:,:3]*f[:,:,3:4]+bg*(1-f[:,:,3:4]))
    mp4.stdin.write((view*255+.5).astype(np.uint8).tobytes())
    if k==0:
        cv2.imwrite(str(O/'慵懒坐姿-透明.png'),cv2.cvtColor(b,cv2.COLOR_RGBA2BGRA))
    if k in [0,60,120,180]:
        dark=f[:,:,:3]*f[:,:,3:4]+np.array([.105,.125,.12])*(1-f[:,:,3:4])
        proof.append(np.hstack([cv2.resize(view,(384,320)),cv2.resize(dark,(384,320))]))
    if k%60==0:print('rendered',k,'/',N,flush=True)
for p in [webm,mp4]:p.stdin.close();assert p.wait()==0
# GIF is a convenience preview; the WebM and PNG retain actual transparency.
subprocess.run([FF,'-v','error','-i',str(O/'慵懒坐姿-预览.mp4'),'-vf','fps=15,scale=480:400:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=4','-loop','0','-y',str(O/'慵懒坐姿-预览.gif')],check=True)
# Animated WebP is useful directly in a web page's img element.
subprocess.run([FF,'-v','error','-c:v','libvpx-vp9','-i',str(O/'慵懒坐姿-透明.webm'),'-vf','fps=20,scale=720:600:flags=lanczos','-c:v','libwebp_anim','-quality','85','-loop','0','-y',str(O/'慵懒坐姿-透明.webp')],check=True)
cv2.imwrite(str(O/'深浅背景检查.jpg'),cv2.cvtColor((np.vstack(proof)*255).astype(np.uint8),cv2.COLOR_RGB2BGR))
# Force the alpha-capable decoder; some default VP9 decoders discard alpha.
v=subprocess.run([FF,'-v','error','-c:v','libvpx-vp9','-i',str(O/'慵懒坐姿-透明.webm'),'-frames:v','1','-pix_fmt','rgba','-f','rawvideo','-'],capture_output=True,check=True)
a=np.frombuffer(v.stdout,np.uint8).reshape(H,W,4)[:,:,3]
assert a[0,0]==0 and a[H//2,W//2]>250 and np.any((a>0)&(a<255))
assert np.max(np.abs(render(0)-render(8)))<.00001
cap=cv2.VideoCapture(str(O/'慵懒坐姿-预览.mp4'));count=0
while cap.read()[0]:count+=1
cap.release();assert count==240
(O/'verification.json').write_text(json.dumps({'seconds':8,'fps':30,'frames':240,'width':W,'height':H,'all_frames_decode':True,'webm_alpha_verified':True,'soft_alpha_edges_verified':True,'exact_loop_boundary':True,'method':'generated character asset with continuous 2D deformation'},indent=2))
print('PASS: 240 frames; 8 second loop; transparent VP9 alpha decoded and verified.',flush=True)
