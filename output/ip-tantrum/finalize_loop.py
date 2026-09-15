from pathlib import Path
import subprocess,cv2,numpy as np,math,json
import imageio_ffmpeg
O=Path(__file__).resolve().parent;FF=imageio_ffmpeg.get_ffmpeg_exe()
SRC='/Users/chenyueping/.codex/generated_images/01a09ae6-4743-7f23-af95-148d6f332dc2/exec-d81207ac-e43c-4eec-8c54-9d8b18585567.png'
# Read only the verified, continuous-motion function from the render source.
s=(O/'render_animation.py').read_text();part=s[s.index('def puppet('):s.index('def encoder(')]
W=512;yy,xx=np.mgrid[:W,:W].astype(np.float32);exec(part)
subprocess.run([FF,'-v','error','-i',SRC,'-vf','crop=408:402:422:422,delogo=x=9:y=8:w=45:h=29,scale=512:512:flags=lanczos','-frames:v','1','-y',str(O/'loop-source.png')],check=True)
im=cv2.imread(str(O/'loop-source.png'));path=O/'撒泼动画.mp4';N=120
p=subprocess.Popen([FF,'-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','512x512','-r','30','-i','-','-an','-c:v','libx264','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(path)],stdin=subprocess.PIPE)
frames=[]
for k in range(N):
    f=puppet(im,k/30,1.2);p.stdin.write(f.tobytes())
    if k%15==0:frames.append(cv2.resize(f,(256,256)))
p.stdin.close();assert p.wait()==0
subprocess.run([FF,'-v','error','-i',str(path),'-vf','fps=20,scale=448:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=sierra2_4a','-loop','0','-y',str(O/'撒泼动画.gif')],check=True)
cv2.imwrite(str(O/'循环动作检查.jpg'),np.vstack([np.hstack(frames[:4]),np.hstack(frames[4:])]))
assert np.array_equal(puppet(im,0,1.2),puppet(im,4,1.2))
cap=cv2.VideoCapture(str(path));count=0
while True:
    ok,f=cap.read()
    if not ok:break
    assert f.shape==(512,512,3);count+=1
cap.release();assert count==120
(O/'verification.json').write_text(json.dumps({'width':512,'height':512,'fps':30,'frames':count,'duration_seconds':4,'decoded_every_frame':True,'loop_boundary_exact_before_encoding':True,'method':'continuous 2D puppet deformation of approved key pose; large-pose transitions excluded due to ghosting'},ensure_ascii=False,indent=2))
print('Verified: 120/120 decoded frames; exact 4-second loop boundary; MP4 and GIF exported.')
