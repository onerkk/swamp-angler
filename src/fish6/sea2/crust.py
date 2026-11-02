import numpy as np,cv2,os
from PIL import Image
from cut import square, tight
U='/mnt/user-data/uploads'
V={'prawn':('269777','269776'),'lobster':('269775','269774')}
def mask(a):
    m=(a.min(2)<236).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    keep=np.zeros_like(m); big=1+np.argmax(st[1:,cv2.CC_STAT_AREA])
    for i in range(1,n):
        if i==big or st[i,cv2.CC_STAT_AREA]>st[big,cv2.CC_STAT_AREA]*.002: keep[lab==i]=255
    return keep
def thin(m):
    K=max(5,int(min(m.shape)*.012)); o=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((K,K),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(o); big=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); return cv2.dilate(np.where(lab==big,255,0).astype(np.uint8),np.ones((3,3),np.uint8))
for k,(a,b) in V.items():
    top=np.asarray(Image.open(f'{U}/{a}.png').convert('RGB')); side=np.asarray(Image.open(f'{U}/{b}.png').convert('RGB').rotate(-90,expand=True))
    mt,ms=mask(top),mask(side)
    tight(top,mt).save(f'{k}_front_t.png'); tight(side,ms).save(f'{k}_side_t.png')
    square(top,thin(mt)).save(f'{k}_front.png'); s=square(side,thin(ms)); s.save(f'{k}_side.png'); s.transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2.png')
    im=Image.open(f'{k}_front_t.png').convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT); wht=Image.new('RGBA',im.size,(228,232,234,255)); bb=Image.blend(im,wht,.6); bb.putalpha(im.split()[3]); bb.save(f'{k}_back_t.png')
    Image.open(f'{k}_side_t.png').transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2_t.png')
    print(k,'ok')
