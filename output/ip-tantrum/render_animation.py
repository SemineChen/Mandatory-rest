from pathlib import Path
import cv2,numpy as np,subprocess,math,json
from scipy.interpolate import RBFInterpolator
import imageio_ffmpeg
OUT=Path(__file__).resolve().parent
SRC='/Users/chenyueping/.codex/generated_images/01a09ae6-4743-7f23-af95-148d6f332dc2/exec-d81207ac-e43c-4eec-8c54-9d8b18585567.png'
FF=imageio_ffmpeg.get_ffmpeg_exe(); W=512; FPS=30
# Extract the storyboard into video source frames and remove frame numbers.
for k in range(9):
    x=7+415*(k%3);y=7+415*(k//3)
    subprocess.run([FF,'-v','error','-i',SRC,'-vf',f'crop=408:408:{x}:{y},delogo=x=9:y=8:w=45:h=29:show=0,scale=512:512:flags=lanczos','-frames:v','1','-y',str(OUT/f'key-{k+1:02}.png')],check=True)
imgs=[cv2.imread(str(OUT/f'key-{i+1:02}.png')) for i in range(9)]
# Correspondence landmarks: paws, eyes/mouth, crown, belly base, antenna and side contours.
P=[
[(58,253),(354,251),(83,330),(327,330),(149,137),(252,138),(201,148),(205,82),(203,365),(207,40),(207,80),(90,177),(322,177),(110,320),(298,320)],
[(68,170),(346,170),(77,324),(325,324),(149,169),(251,169),(200,180),(204,107),(203,367),(204,70),(204,105),(85,201),(322,201),(108,320),(301,320)],
[(110,96),(358,272),(70,243),(325,335),(224,122),(308,173),(258,151),(234,80),(225,365),(290,65),(270,103),(160,151),(338,208),(136,311),(280,322)],
[],
[(81,89),(331,110),(78,227),(319,244),(160,122),(234,125),(200,138),(202,88),(204,350),(240,63),(207,85),(116,162),(283,164),(117,302),(282,310)],
[(165,133),(357,290),(85,170),(181,276),(248,120),(310,166),(279,146),(248,89),(238,354),(294,65),(277,101),(191,152),(330,200),(153,311),(299,318)],
[(177,277),(322,276),(50,253),(295,310),(179,177),(284,210),(232,211),(200,93),(213,335),(276,67),(258,108),(126,166),(329,204),(138,300),(291,305)],
[(132,207),(273,207),(76,310),(323,311),(146,126),(250,126),(201,136),(202,74),(202,358),(204,33),(204,75),(94,160),(309,161),(117,310),(288,310)],
[(67,232),(348,232),(79,317),(326,317),(145,127),(252,127),(200,139),(203,76),(203,360),(204,32),(204,75),(89,162),(319,164),(112,315),(296,315)]
]
# The sheet repeats a left tilt in 03/04; mirror it for a real alternating kick.
imgs[3]=cv2.flip(imgs[2],1)
p=np.array(P[2],np.float32);p[:,0]=408-p[:,0];p[[0,1]]=p[[1,0]];p[[2,3]]=p[[3,2]];p[[4,5]]=p[[5,4]];p[[11,12]]=p[[12,11]];p[[13,14]]=p[[14,13]];P[3]=p.tolist()
anchors=np.array([(0,0),(204,0),(408,0),(0,204),(408,204),(0,408),(204,408),(408,408)],np.float32)
points=[np.vstack([np.array(p,np.float32),anchors])*W/408 for p in P]
yy,xx=np.mgrid[:W,:W].astype(np.float32)
coarse_y,coarse_x=np.mgrid[0:W:48j,0:W:48j];query=np.column_stack([coarse_x.ravel(),coarse_y.ravel()])
def morph(a,b,pa,pb,u):
    pm=(1-u)*pa+u*pb
    def warp(im,ps):
        d=RBFInterpolator(pm,ps-pm,kernel='thin_plate_spline',smoothing=12)(query).reshape(48,48,2).astype(np.float32)
        d=cv2.resize(d,(W,W),interpolation=cv2.INTER_CUBIC)
        return cv2.remap(im,xx+d[:,:,0],yy+d[:,:,1],cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT_101)
    if u<1e-6:return a.copy()
    if u>1-1e-6:return b.copy()
    aa=warp(a,pa);bb=warp(b,pb)
    return cv2.addWeighted(aa,1-u,bb,u,0)
def puppet(im,t,amount=1):
    # Continuous local joint motion in screen space, with lagging belly/antenna.
    phase=2*math.pi*t*2
    dx=np.zeros_like(xx);dy=np.zeros_like(yy)
    for cx,cy,rx,ry,side in [(100,113,67,61,-1),(415,138,66,63,1),(98,285,91,86,-1),(400,306,88,84,1)]:
        g=np.exp(-(((xx-cx)/rx)**2+((yy-cy)/ry)**2)*1.4)
        q=math.sin(phase+side*1.2);isfoot=cy>200
        dx+=g*q*(13 if isfoot else 10)*side*amount
        dy+=g*q*(21 if isfoot else 16)*amount
        if isfoot:
            dx+=g*(xx-cx)*q*.10*amount;dy+=g*(yy-cy)*q*.10*amount
    antenna=np.exp(-(((xx-288)/46)**2+((yy-78)/42)**2))
    dx+=antenna*math.sin(phase-.7)*12*amount
    belly=np.exp(-(((xx-256)/120)**2+((yy-309)/110)**2))
    dy+=belly*math.sin(phase-.45)*4*amount
    warped=cv2.remap(im,xx-dx,yy-dy,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT_101)
    angle=math.sin(2*math.pi*t)*5.5*amount
    mat=cv2.getRotationMatrix2D((256,320),angle,1)
    mat[1,2]-=abs(math.sin(phase))*3*amount
    return cv2.warpAffine(warped,mat,(W,W),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT_101)
def encoder(name):
    return subprocess.Popen([FF,'-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{W}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/name)],stdin=subprocess.PIPE)
# Whole action loop: anticipation, alternating kicks, sustained flailing, then recovery.
p=encoder('撒泼动画-完整循环.mp4'); checks=[]; idx=0
schedule=[(8,0,.5),(0,1,.45),(1,2,.42),(2,3,.44),(3,4,.42),(4,4,2.0),(4,5,.35),(5,4,.35),(4,1,.45),(1,7,.5),(7,8,.6),(8,8,.52)]
for a,b,duration in schedule:
    n=round(duration*FPS)
    for k in range(n):
        u=k/n;s=u*u*(3-2*u)
        frame=morph(imgs[a],imgs[b],points[a],points[b],s)
        if a==4 and b==4: frame=puppet(frame,u*2,math.sin(math.pi*u)**2)
        p.stdin.write(frame.tobytes())
        if idx%15==0:checks.append(frame.copy())
        idx+=1
    print(f'segment {a+1} -> {b+1} rendered',flush=True)
p.stdin.close();assert p.wait()==0
# Also retain a seamless, fully continuous kicking loop, without pose dissolves.
p=encoder('撒泼动画-蹬腿循环.mp4')
loop_frames=[]
for k in range(120):
    frame=puppet(imgs[4],k/FPS)
    p.stdin.write(frame.tobytes())
    if k%15==0:loop_frames.append(frame)
p.stdin.close();assert p.wait()==0
for name in ['撒泼动画-完整循环','撒泼动画-蹬腿循环']:
    subprocess.run([FF,'-v','error','-i',str(OUT/(name+'.mp4')),'-vf','fps=20,scale=448:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=sierra2_4a','-loop','0','-y',str(OUT/(name+'.gif'))],check=True)
# Video QA contact sheet, including intermediate poses rather than only endpoints.
small=[cv2.resize(f,(200,200)) for f in checks]
while len(small)%6:small.append(np.full((200,200,3),240,np.uint8))
cv2.imwrite(str(OUT/'视频中间帧检查.jpg'),np.vstack([np.hstack(small[i:i+6]) for i in range(0,len(small),6)]))
cap=cv2.VideoCapture(str(OUT/'撒泼动画-完整循环.mp4'));n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT));fps=cap.get(cv2.CAP_PROP_FPS);decoded=0
while True:
    ok,f=cap.read()
    if not ok:break
    decoded+=1
cap.release();assert n==decoded==idx
(OUT/'verification.json').write_text(json.dumps({'width':W,'height':W,'fps':fps,'frames':n,'seconds':n/fps,'all_frames_decoded':True,'method':'landmark guided inbetweens with procedural joint animation; preview, not generated 3D video'},indent=2))
print('DONE',n,'frames',n/fps,'seconds')
