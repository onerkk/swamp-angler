# 人形模型的平面投影烘焙：正面那一半貼正面圖、背面那一半貼背面圖，臉和頭髮保有設定圖的完整解析度
import sys,os,numpy as np,trimesh; sys.path.insert(0,'/home/claude/bake'); from bake2 import prep,export
from PIL import Image
k=sys.argv[1]; faces=int(os.environ.get('BAKE_FACES',12000)); sm=int(os.environ.get('BAKE_SMOOTH',6)); H=int(os.environ.get('BAKE_H',2048))
m=prep(f'{k}_shape.glb',faces)
if sm: trimesh.smoothing.filter_laplacian(m,lamb=.5,iterations=sm)
Vt,Ft=m.vertices,m.faces; mn,mx=Vt.min(0),Vt.max(0); r=mx-mn
F_img=Image.open(f'{k}_front_t.png').convert('RGBA'); B_img=Image.open(f'{k}_back_t.png').convert('RGBA')
hasS=os.path.exists(f'{k}_side_t.png') and os.path.exists(f'{k}_side2_t.png')
L_img=Image.open(f'{k}_side_t.png').convert('RGBA') if hasS else None; R_img=Image.open(f'{k}_side2_t.png').convert('RGBA') if hasS else None
def fit(im): w=int(round(im.width*H/im.height)); return im.resize((w,H),Image.LANCZOS)
F_img,B_img=fit(F_img),fit(B_img); wf,wb=F_img.width,B_img.width
if hasS: L_img,R_img=fit(L_img),fit(R_img); wl,wr=L_img.width,R_img.width
else: wl=wr=0
atlas=Image.new('RGB',(wf+wb+wl+wr,H),(200,190,180))
# 透明處填周圍顏色，避免邊緣露出背景色
def flat(im):
    bg=Image.new('RGB',im.size,(0,0,0)); a=np.asarray(im).astype(np.float32); rgb=a[:,:,:3]; al=a[:,:,3:4]/255
    from scipy import ndimage
    mask=al[:,:,0]>.5; idx=ndimage.distance_transform_edt(~mask,return_distances=False,return_indices=True)
    filled=rgb[idx[0],idx[1]]; return Image.fromarray(np.clip(filled,0,255).astype(np.uint8))
atlas.paste(flat(F_img),(0,0)); atlas.paste(flat(B_img),(wf,0))
if hasS: atlas.paste(flat(L_img),(wf+wb,0)); atlas.paste(flat(R_img),(wf+wb+wl,0))
W=atlas.width
V=Vt[Ft].reshape(-1,3); N=m.vertex_normals[Ft].reshape(-1,3); F=np.arange(len(V)).reshape(-1,3)
fn=m.face_normals; wx=(V[:,0]-mn[0])/r[0]; wz=(V[:,2]-mn[2])/r[2]; h=(mx[1]-V[:,1])/r[1]
# 依每個面的主要朝向選圖：前／後用正背面圖，左／右用側面圖（側面圖的橫軸對應身體前後）
side_dom=(np.abs(fn[:,0])>np.abs(fn[:,2])) if hasS else np.zeros(len(fn),bool)
cls=np.where(side_dom,np.where(fn[:,0]>0,2,3),np.where(fn[:,2]>=0,0,1))
if os.environ.get('FACEFIX'):   # 臉的前半部有些面法線歪掉被分到側面圖，近看像碎片：臉部範圍內朝前的一律用正面圖
    fc=Vt[Ft].mean(1); fh=(mx[1]-fc[:,1])/r[1]; fx=np.abs(fc[:,0]-(mn[0]+mx[0])/2); fzz=fc[:,2]-(mn[2]+mx[2])/2
    sel=(fh>.03)&(fh<.16)&(fx<.07*r[0])&(fzz>0)&(fn[:,2]>-.2); cls[sel]=0; print('facefix',int(sel.sum()))
# 選到的圖在那個位置如果是背景（透明，模型和圖片輪廓沒對齊），改用另一張在那裡有東西的圖：避免腿邊、手臂邊出現衣服或背景色的細紋
if os.environ.get('ALPHAFIX') and hasS:
    al=[np.asarray(im)[:,:,3] for im in (F_img,B_img,L_img,R_img)]; ws=[wf,wb,wl,wr]
    fc=Vt[Ft].mean(1); cx_=(fc[:,0]-mn[0])/r[0]; cz_=(fc[:,2]-mn[2])/r[2]; ch_=np.clip((mx[1]-fc[:,1])/r[1],0,.9999)
    px=[np.clip(((1-cx_)*wf).astype(int),0,wf-1),np.clip((cx_*wb).astype(int),0,wb-1),np.clip(((1-cz_)*wl).astype(int),0,wl-1),np.clip((cz_*wr).astype(int),0,wr-1)]
    py=(ch_*H).astype(int); A=np.stack([al[i][py,px[i]] for i in range(4)],1)>128
    pref=np.stack([np.maximum(fn[:,2],0),np.maximum(-fn[:,2],0),np.maximum(fn[:,0],0),np.maximum(-fn[:,0],0)],1)+.05
    bad=~A[np.arange(len(cls)),cls]; sc=np.where(A,pref,-1.); alt=sc.argmax(1); fix=bad&(sc.max(1)>0); cls=np.where(fix,alt,cls); print('alphafix',int(fix.sum()))
cls3=np.repeat(cls,3)
u=np.select([cls3==0,cls3==1,cls3==2,cls3==3],[(1-wx)*wf,wf+wx*wb,wf+wb+(1-wz)*wl,wf+wb+wl+wz*wr])/W; v=np.clip(h,0,1)
uv=np.stack([u,v],1)
kb=export(V,N,F,uv,np.asarray(atlas),f'fish_{k}.glb',rough=.5,metal=.05); print(k,'KB',kb,'atlas',atlas.size)
