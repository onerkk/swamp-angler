import numpy as np, cv2, sys
from PIL import Image
from cut import square, tight
def exact(g,guess,axis,rng=14):
    # 在估計位置附近找分隔線：該行（列）落在線條灰度的比例最高者
    best=None
    for i in range(guess-rng,guess+rng+1):
        v=g[i,:] if axis==0 else g[:,i]; f=((v<238)&(v>120)).mean()
        if best is None or f>best[1]: best=(i,f)
    return best[0]
def mask(a,thr=246):
    mn=a.min(2).astype(int); bgc=(mn>thr).astype(np.uint8)
    pad=cv2.copyMakeBorder(bgc,1,1,1,1,cv2.BORDER_CONSTANT,value=1)
    n,lab=cv2.connectedComponents(pad,connectivity=4); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    m=(~np.isin(lab,list(border))[1:-1,1:-1]).astype(np.uint8)*255; m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m); big=np.argmax(st[1:,4])+1; keep=np.zeros_like(m)
    for i in range(1,n):
        if i==big or st[i,4]>st[big,4]*.01: keep[lab==i]=255
    return cv2.GaussianBlur(keep,(3,3),0)
if __name__=="__main__":
  k,f,y1,y2,x1=sys.argv[1],sys.argv[2],*map(int,sys.argv[3:6])
  a=np.asarray(Image.open(f).convert('RGB')); g=cv2.cvtColor(a,cv2.COLOR_RGB2GRAY).astype(int); H,W=g.shape
  y1=exact(g,y1,0); y2=exact(g,y2,0); x1=exact(g[y2+3:],x1,1)
  P={'side':a[0:y1-2],'top':a[y1+3:y2-2],'front':a[y2+3:,0:x1-2],'belly':a[y2+3:,x1+3:]}
  for nm,img in P.items():
      m=mask(img); 
      if nm=='belly':   # 腹部格右邊若還有特寫格，只留最大的那塊
          pass
      P[nm]=(img,m); tight(img,m).save(f'{k}_{nm}_t.png')
  square(*P['side']).save(f'{k}_side.png'); square(*P['side']).transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2.png'); square(*P['front']).save(f'{k}_front.png')
  print(k,'橫線',y1,y2,'直線',x1)
