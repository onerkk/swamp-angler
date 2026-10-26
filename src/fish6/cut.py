import numpy as np, cv2, sys, json
from PIL import Image
def _seps(prof_line,prof_ink,n,minlen=60):
    # 分隔線：橫跨 93% 以上、厚度 ≤4 的細線；沒有分隔線時改用「幾乎全白」的空隙
    lines=[i for i in range(n) if prof_line[i]>.75]
    grp=[]
    for i in lines:
        if grp and i-grp[-1][-1]<=2: grp[-1].append(i)
        else: grp.append([i])
    grp=[g for g in grp if len(g)<=4]
    if grp:
        edges=[0]; 
        for g in grp: edges+= [g[0],g[-1]+1]
        edges.append(n); segs=[(edges[i],edges[i+1]) for i in range(0,len(edges),2)]
    else:
        ink=[prof_ink[i]>.004 for i in range(n)]; segs=[]; st=None
        for i,v in enumerate(ink+[False]):
            if v and st is None: st=i
            if not v and st is not None: segs.append((max(0,st-6),min(n,i+6))); st=None
    return [s for s in segs if s[1]-s[0]>minlen]
def panels(a):
    g=cv2.cvtColor(a,cv2.COLOR_RGB2GRAY).astype(int)
    L=(g<238)&(g>120); L2=L|np.roll(L,-1,0)   # 線可能被魚鰭蓋住、或分在相鄰兩行
    return _seps(L2.mean(1),(g<238).mean(1),g.shape[0])
def vsplit(a,y0,y1):
    g=cv2.cvtColor(a[y0:y1],cv2.COLOR_RGB2GRAY).astype(int)
    L=(g<238)&(g>120); L2=L|np.roll(L,-1,1)
    return _seps(L2.mean(0),(g<238).mean(0),g.shape[1])
def mask(a):
    h,w,_=a.shape; mn=a.min(2).astype(int)
    bgc=(mn>238).astype(np.uint8)   # 接近白
    pad=cv2.copyMakeBorder(bgc,1,1,1,1,cv2.BORDER_CONSTANT,value=1)
    n,lab=cv2.connectedComponents(pad,connectivity=4); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(border))[1:-1,1:-1]
    m=(~bg).astype(np.uint8)*255; m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m); big=np.argmax(st[1:,4])+1; keep=np.zeros_like(m)
    for i in range(1,n):
        if i==big or st[i,4]>st[big,4]*.01: keep[lab==i]=255
    return cv2.GaussianBlur(keep,(3,3),0)
def square(a,m,size=512,pad=1.08):
    ys,xs=np.where(m>128); a=a[ys.min():ys.max()+1,xs.min():xs.max()+1]; m=m[ys.min():ys.max()+1,xs.min():xs.max()+1]
    h,w=m.shape; s=int(max(h,w)*pad); can=np.zeros((s,s,4),np.uint8); y0=(s-h)//2; x0=(s-w)//2; can[y0:y0+h,x0:x0+w]=np.dstack([a,m]); return Image.fromarray(can).resize((size,size),Image.LANCZOS)
def tight(a,m):
    ys,xs=np.where(m>128); return Image.fromarray(np.dstack([a,m])[ys.min():ys.max()+1,xs.min():xs.max()+1])
if __name__=='__main__':
    k,f=sys.argv[1],sys.argv[2]; a=np.asarray(Image.open(f).convert('RGB'))
    B=panels(a); info={'bands':B}
    side=a[B[0][0]+2:B[0][1]-2]; top=a[B[1][0]+2:B[1][1]-2]; V=vsplit(a,*B[2]); info['bottom']=V
    front=a[B[2][0]+2:B[2][1]-2, V[0][0]+2:V[0][1]-2]; belly=a[B[2][0]+2:B[2][1]-2, V[1][0]+2:V[1][1]-2]
    out={}
    for nm,img in [('side',side),('top',top),('front',front),('belly',belly)]:
        m=mask(img); out[nm]=(img,m); tight(img,m).save(f'{k}_{nm}_t.png')
    square(*out['side']).save(f'{k}_side.png'); square(*out['side']).transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2.png'); square(*out['front']).save(f'{k}_front.png')
    print(k,json.dumps(info))
