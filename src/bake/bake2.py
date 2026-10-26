"""三角形成對打包的貼圖烘焙（不依賴 xatlas）：每兩個三角形共用一個方格，向量化取色"""
import trimesh,numpy as np,os
from PIL import Image
def ld(fn):
    a=np.asarray(Image.open(fn).convert('RGBA')).astype(np.float32); ys,xs=np.where(a[:,:,3]>128); return a[:,:,:3],(xs.min(),xs.max(),ys.min(),ys.max())
def samp(a,box,u,t):
    x0,x1,y0,y1=box; px=np.clip((x0+u*(x1-x0)).astype(int),0,a.shape[1]-1); py=np.clip((y0+t*(y1-y0)).astype(int),0,a.shape[0]-1); return a[py,px]
def prep(fn,faces):
    m=trimesh.load(fn,force='mesh'); comps=sorted(m.split(only_watertight=False),key=lambda c:-len(c.faces))
    m=trimesh.util.concatenate([c for c in comps if len(c.faces)>len(comps[0].faces)*.02]); return m.simplify_quadric_decimation(face_count=faces)
def bake(m,colorfn,size=2048,pad=1.2):
    Vt,Nt,Ft=m.vertices,m.vertex_normals,m.faces; nF=len(Ft); cells=(nF+1)//2; g=int(np.ceil(np.sqrt(cells))); cs=size/g
    # 方格內兩個直角三角形的標準 UV（扣掉邊距）
    e=pad/cs; A=np.array([[e,e],[1-2*e,e],[e,1-2*e]]); B=np.array([[1-e,1-e],[2*e,1-e],[1-e,2*e]])
    fi=np.arange(nF); cell=fi//2; half=fi%2; cx=(cell%g).astype(np.float32); cy=(cell//g).astype(np.float32)
    tri=np.where(half[:,None,None]==0,A[None],B[None])                                 # nF×3×2
    uvpx=(np.stack([cx,cy],1)[:,None,:]+tri)*cs                                      # 像素座標
    # 逐方格取樣：每個像素歸屬到所在的半邊三角形，重心座標可略超出範圍以填滿方格
    n=int(np.ceil(cs)); gy,gx=np.mgrid[0:n,0:n]; lx=(gx.ravel()+.5)/cs; ly=(gy.ravel()+.5)/cs; ok=(lx<1)&(ly<1); lx,ly=lx[ok],ly[ok]
    tex=np.zeros((size,size,3),np.float32)
    for h,T in ((0,A),(1,B)):
        sel=(lx+ly<1) if h==0 else (lx+ly>=1)
        qx,qy=lx[sel],ly[sel]; a,b,c=T; d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        l1=((b[1]-c[1])*(qx-c[0])+(c[0]-b[0])*(qy-c[1]))/d; l2=((c[1]-a[1])*(qx-c[0])+(a[0]-c[0])*(qy-c[1]))/d; L=np.clip(np.stack([l1,l2,1-l1-l2],1),0,1); L/=L.sum(1,keepdims=True)
        faces=fi[half==h]
        for s in range(0,len(faces),1500):                                               # 分批避免記憶體爆掉
            fb=faces[s:s+1500]; pos=np.einsum('sk,fkd->fsd',L,Vt[Ft[fb]]).reshape(-1,3); nor=np.einsum('sk,fkd->fsd',L,Nt[Ft[fb]]).reshape(-1,3); nor/=np.linalg.norm(nor,axis=1,keepdims=True)+1e-9
            col=colorfn(pos,nor).reshape(len(fb),-1,3)
            px=(cx[fb][:,None]*cs+qx[None]*cs).astype(int); py=(cy[fb][:,None]*cs+qy[None]*cs).astype(int)
            tex[np.clip(py,0,size-1),np.clip(px,0,size-1)]=col
    V=Vt[Ft].reshape(-1,3); N=Nt[Ft].reshape(-1,3); F=np.arange(nF*3).reshape(-1,3); uv=(uvpx/size).reshape(-1,2)
    return V,N,F,uv,np.clip(tex,0,255).astype(np.uint8)
def export(V,N,F,uv,img,out,rough=.55,metal=.05):
    tm=trimesh.Trimesh(vertices=V,faces=F,vertex_normals=N,process=False)
    uv2=uv.copy(); uv2[:,1]=1-uv2[:,1]                                                  # glTF 的 V 軸朝下
    mat=trimesh.visual.material.PBRMaterial(baseColorTexture=Image.fromarray(img),metallicFactor=metal,roughnessFactor=rough)
    tm.visual=trimesh.visual.TextureVisuals(uv=uv2,material=mat); tm.export(out); return os.path.getsize(out)//1024
