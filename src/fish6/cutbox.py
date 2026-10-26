import numpy as np, cv2, sys, json
from PIL import Image
from cut import square, tight
from cutman import mask
k,f,spec=sys.argv[1],sys.argv[2],json.loads(sys.argv[3])
a=np.asarray(Image.open(f).convert('RGB')); out={}
for nm,(x0,y0,x1,y1) in spec.items():
    img=a[y0:y1,x0:x1]; m=mask(img); out[nm]=(img,m); tight(img,m).save(f'{k}_{nm}_t.png')
square(*out['side']).save(f'{k}_side.png'); square(*out['side']).transpose(Image.FLIP_LEFT_RIGHT).save(f'{k}_side2.png'); square(*out['front']).save(f'{k}_front.png')
if 'back' in out: square(*out['back']).save(f'{k}_back.png')
print(k,sorted(out))
