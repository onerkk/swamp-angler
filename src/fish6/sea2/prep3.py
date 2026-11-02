import subprocess,json,os,numpy as np,cv2
from PIL import Image
U='/mnt/user-data/uploads'
V={'prawn':('269777','269776'),'lobster':('269775','269774'),'wahoo':('269773','269772')}
def cut(name,path):
    im=Image.open(path); w,h=im.size
    r=subprocess.run(['python3','cutbox.py',name,path,json.dumps({'front':[0,0,w,h],'side':[0,0,w,h]})],capture_output=True,text=True)
    if r.returncode: print(r.stderr[-400:])
def thin_off(fn,k):
    # 生成形狀用的圖去掉觸角這類細長構造（開運算），避免 AI 生出雜亂薄片；貼圖仍用原圖
    im=Image.open(fn).convert('RGBA'); a=np.asarray(im).copy(); m=(a[:,:,3]>128).astype(np.uint8)*255
    o=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((k,k),np.uint8)); n,lab,st,_=cv2.connectedComponentsWithStats(o); 
    if n>1: big=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); o=np.where(lab==big,255,0).astype(np.uint8)
    rgb=a[:,:,:3]; bg=np.full_like(rgb,255); keep=o>0; a[:,:,:3]=np.where(keep[:,:,None],rgb,bg); Image.fromarray(a[:,:,:3]).save(fn)
for k,(a,b) in V.items():
    cut(k,f'{U}/{a}.png')
    Image.open(f'{U}/{b}.png').convert('RGB').rotate(-90,expand=True).save(f'{k}_sraw.png'); cut(k+'S',f'{k}_sraw.png')
    os.replace(f'{k}S_front.png',f'{k}_side.png'); os.replace(f'{k}S_front_t.png',f'{k}_side_t.png')
    im=Image.open(f'{k}_front_t.png').convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT); wht=Image.new('RGBA',im.size,(228,232,234,255)); bb=Image.blend(im,wht,.6); bb.putalpha(im.split()[3]); bb.save(f'{k}_back_t.png')
    Image.open(f'{k}_side.png').transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2.png'); Image.open(f'{k}_side_t.png').transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2_t.png')
    for f in [f'{k}S_side.png',f'{k}S_side2.png',f'{k}S_side_t.png',f'{k}_sraw.png']:
        if os.path.exists(f): os.remove(f)
    print(k,'prepped')
