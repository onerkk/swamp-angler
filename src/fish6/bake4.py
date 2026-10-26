import sys,time,os,numpy as np; sys.path.insert(0,'/home/claude/bake'); from bake2 import prep,bake,export
from PIL import Image
def ld(fn):
    a=np.asarray(Image.open(fn).convert('RGBA')).astype(np.float32); return a
def samp(a,u,v):
    H,W=a.shape[:2]; px=np.clip((u*(W-1)).astype(int),0,W-1); py=np.clip((v*(H-1)).astype(int),0,H-1); return a[py,px]
def fish(k,br=1.0,faces=12000,size=1536):
    size=int(os.environ.get('BAKE_SIZE',size)); faces=int(os.environ.get('BAKE_FACES',faces))
    m=prep(f'{k}_shape.glb',faces)
    sm=int(os.environ.get('BAKE_SMOOTH',0))
    if sm: import trimesh; trimesh.smoothing.filter_laplacian(m,lamb=.5,iterations=sm)   # 把 AI 形狀的顆粒感磨平
    mn,mx=m.vertices.min(0),m.vertices.max(0); r=mx-mn
    def ldo(v): f=f'{k}_{v}_t.png'; return ld(f) if os.path.exists(f) else None
    S,T,B,F,BK=[ldo(v) for v in ('side','top','belly','front','back')]
    Z=lambda n: np.zeros((n,4),np.float32)
    def colorfn(p,n):
        u=(mx[2]-p[:,2])/r[2]                       # 0＝頭（+Z）、1＝尾，四張圖都是頭朝左
        h=(mx[1]-p[:,1])/r[1]; wx=(p[:,0]-mn[0])/r[0]
        N=len(p); sm=lambda A,a,b_: samp(A,a,b_) if A is not None else Z(N)
        cS=sm(S,u,h); cT=sm(T,u,wx); cB=sm(B,u,1-wx); cF=sm(F,1-wx,h); cK=sm(BK,wx,h)
        pw=1 if S is None else 3   # 沒有側面圖時，側邊由正面與背面線性混合
        wS=(np.abs(n[:,0])**2+.05) if S is not None else np.zeros(N,np.float32); wT=np.clip(n[:,1],0,1)**2; wB=np.clip(-n[:,1],0,1)**2; wF=np.clip(n[:,2],0,1)**pw; wK=np.clip(-n[:,2],0,1)**pw
        cs=(cS,cT,cB,cF,cK); ws=[w*(c[:,3]/255)**2 for w,c in zip((wS,wT,wB,wF,wK),cs)]   # 取到透明處（魚身外）或沒有那張圖，就不採用
        ws[0]=ws[0]+1e-3; tot=sum(ws)
        col=sum(w[:,None]*c[:,:3] for w,c in zip(ws,cs))/tot[:,None]
        # 兩張圖都照不到的地方（側邊輪廓），用正面或背面最近的顏色補，不留黑縫
        fb=np.where((n[:,2]>=0)[:,None],cF[:,:3] if F is not None else cS[:,:3],cK[:,:3] if BK is not None else cS[:,:3])
        col=np.where((tot<.03)[:,None],fb,col)
        return np.clip(col*br,0,255)
    V,N,F_,uv,img=bake(m,colorfn,size); kb=export(V,N,F_,uv,img,f'fish_{k}.glb'); Image.fromarray(img).resize((512,512)).save(f'{k}_tex.jpg',quality=80); return kb
for k in sys.argv[1:]:
    t0=time.time(); print(k,'KB',fish(k),'sec',round(time.time()-t0,1),flush=True)
