import numpy as np, cv2, sys, json
from PIL import Image
sys.path.insert(0,'/home/claude/fish6'); from cut import square, tight
def lines_white(a):
    g=cv2.cvtColor(a,cv2.COLOR_RGB2GRAY).astype(int); H,W=g.shape; out=a.copy(); wh=(g>=238)
    for axis in (0,1):
        L=(g<238)&(g>120); L2=L|np.roll(L,-1,axis); prof=L2.mean(1-axis); n=prof.shape[0]; whp=wh.mean(1-axis)
        cand=[i for i in range(n) if prof[i]>.75]; grp=[]
        for i in cand:
            if grp and i-grp[-1][-1]<=2: grp[-1].append(i)
            else: grp.append([i])
        for gp in grp:
            lo,hi=gp[0]-5,gp[-1]+5
            if len(gp)<=4 and (lo<0 or whp[lo]>.5) and (hi>=n or whp[hi]>.5):   # 線的上下要是空白，才算分隔線
                for i in range(gp[0]-1,gp[-1]+3):
                    if 0<=i<n:
                        if axis==0: out[i,:]=255
                        else: out[:,i]=255
    return out
def fgmask(a):
    mn=a.min(2).astype(int); bgc=(mn>238).astype(np.uint8)
    pad=cv2.copyMakeBorder(bgc,1,1,1,1,cv2.BORDER_CONSTANT,value=1)
    n,lab=cv2.connectedComponents(pad,connectivity=4); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    return (~np.isin(lab,list(border))[1:-1,1:-1]).astype(np.uint8)*255
def views(a):
    a=lines_white(a); H,W=a.shape[:2]; m=fgmask(a); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    d=cv2.dilate(m,np.ones((9,9),np.uint8)); n,lab,st,cen=cv2.connectedComponentsWithStats(d,connectivity=8)
    comps=[]
    for i in range(1,n):
        x,y,w,h,ar=st[i]
        if ar<H*W*.006: continue
        ys,xs=np.where((lab[y:y+h,x:x+w]==i)&(m[y:y+h,x:x+w]>0)); ax0,ax1,ay0,ay1=xs.min()+x,xs.max()+x,ys.min()+y,ys.max()+y
        if ax0<=0 or ay0<=0 or ax1>=W-1 or ay1>=H-1: continue      # 實際魚身貼到圖片邊緣＝特寫裁切，不用（用膨脹前的範圍判斷）
        comps.append(dict(i=i,x=x,y=y,w=w,h=h,ar=ar))
    sq=[c for c in comps if c['w']/c['h']<1.9]; el=[c for c in comps if c['w']/c['h']>=1.9]
    el=sorted(sorted(el,key=lambda c:-c['ar'])[:3],key=lambda c:c['y']); front=max(sq,key=lambda c:c['ar']) if sq else None
    names=['side','top','belly']; res={}
    for nm,c in zip(names,el): res[nm]=c
    if front: res['front']=c=front
    out={}
    for nm,c in res.items():
        sel=(lab==c['i']); mm=(m>0)&sel; mm=cv2.GaussianBlur(mm.astype(np.uint8)*255,(3,3),0)
        y0,y1,x0,x1=c['y'],c['y']+c['h'],c['x'],c['x']+c['w']; out[nm]=(a[y0:y1,x0:x1],mm[y0:y1,x0:x1])
    return out
if __name__=='__main__':
    k,f=sys.argv[1],sys.argv[2]; a=np.asarray(Image.open(f).convert('RGB')); V=views(a)
    for nm,(img,m) in V.items(): tight(img,m).save(f'{k}_{nm}_t.png')
    if 'side' in V: s=square(*V['side']); s.save(f'{k}_side.png'); s.transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2.png')
    if 'front' in V: square(*V['front']).save(f'{k}_front.png')
    print(k,sorted(V.keys()))
