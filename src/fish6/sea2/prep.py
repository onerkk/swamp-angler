import subprocess,json,os
from PIL import Image
U='/mnt/user-data/uploads'
V={'scat':('269771','269770'),'tarpon':('269769','269768'),'maori':('269767','269766'),'puffer':('269765','269764'),'rabbit':('269763','269762')}
def cut(name,path):
    im=Image.open(path); w,h=im.size
    r=subprocess.run(['python3','cutbox.py',name,path,json.dumps({'front':[0,0,w,h],'side':[0,0,w,h]})],capture_output=True,text=True)
    if r.returncode: print(r.stderr[-500:])
for k,(a,b) in V.items():
    cut(k,f'{U}/{a}.png')
    Image.open(f'{U}/{b}.png').convert('RGB').rotate(-90,expand=True).save(f'{k}_sraw.png'); cut(k+'S',f'{k}_sraw.png')
    os.replace(f'{k}S_front.png',f'{k}_side.png'); os.replace(f'{k}S_front_t.png',f'{k}_side_t.png')
    im=Image.open(f'{k}_front_t.png').convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT); wht=Image.new('RGBA',im.size,(228,232,234,255)); bb=Image.blend(im,wht,.6); bb.putalpha(im.split()[3]); bb.save(f'{k}_back_t.png')
    Image.open(f'{k}_side.png').transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2.png'); Image.open(f'{k}_side_t.png').transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2_t.png')
    for f in [f'{k}S_side.png',f'{k}S_side2.png',f'{k}S_side_t.png',f'{k}_sraw.png']:
        if os.path.exists(f): os.remove(f)
    print(k,'prepped')
