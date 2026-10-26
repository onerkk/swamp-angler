# 人形模型的平面投影烘焙：正面那一半貼正面圖、背面那一半貼背面圖，臉和頭髮保有設定圖的完整解析度
import sys,os,numpy as np,trimesh; sys.path.insert(0,'/home/claude/bake'); from bake2 import prep,export
from PIL import Image
k=sys.argv[1]; faces=int(os.environ.get('BAKE_FACES',12000)); sm=int(os.environ.get('BAKE_SMOOTH',6)); H=int(os.environ.get('BAKE_H',2048))
m=prep(f'{k}_shape.glb',faces)
if sm: trimesh.smoothing.filter_laplacian(m,lamb=.5,iterations=sm)
Vt,Ft=m.vertices,m.faces; mn,mx=Vt.min(0),Vt.max(0); r=mx-mn
F_img=Image.open(f'{k}_front_t.png').convert('RGBA'); B_img=Image.open(f'{k}_back_t.png').convert('RGBA')
def fit(im): w=int(round(im.width*H/im.height)); return im.resize((w,H),Image.LANCZOS)
F_img,B_img=fit(F_img),fit(B_img); wf,wb=F_img.width,B_img.width
atlas=Image.new('RGB',(wf+wb,H),(200,190,180))
# 透明處填周圍顏色，避免邊緣露出背景色
def flat(im):
    bg=Image.new('RGB',im.size,(0,0,0)); a=np.asarray(im).astype(np.float32); rgb=a[:,:,:3]; al=a[:,:,3:4]/255
    from scipy import ndimage
    mask=al[:,:,0]>.5; idx=ndimage.distance_transform_edt(~mask,return_distances=False,return_indices=True)
    filled=rgb[idx[0],idx[1]]; return Image.fromarray(np.clip(filled,0,255).astype(np.uint8))
atlas.paste(flat(F_img),(0,0)); atlas.paste(flat(B_img),(wf,0)); W=atlas.width
V=Vt[Ft].reshape(-1,3); N=m.vertex_normals[Ft].reshape(-1,3); F=np.arange(len(V)).reshape(-1,3)
fn=m.face_normals; front=(fn[:,2]>=0); front3=np.repeat(front,3)
wx=(V[:,0]-mn[0])/r[0]; h=(mx[1]-V[:,1])/r[1]
u=np.where(front3,(1-wx)*wf,wf+wx*wb)/W; v=np.clip(h,0,1)
uv=np.stack([u,v],1)
kb=export(V,N,F,uv,np.asarray(atlas),f'fish_{k}.glb',rough=.5,metal=.05); print(k,'KB',kb,'atlas',atlas.size)
