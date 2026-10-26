import sys,shutil,os
from gradio_client import Client, handle_file
k=sys.argv[1]; c=Client('tencent/Hunyuan3D-2mv',verbose=False)
try:
    bk=handle_file(f'{k}_back.png') if os.path.exists(f'{k}_back.png') else None
    sd=lambda f: handle_file(f) if os.path.exists(f) else None
    r=c.predict(None,None,handle_file(f'{k}_front.png'),bk,sd(f'{k}_side.png'),sd(f'{k}_side2.png'),30,5.0,1234,256,False,8000,False,api_name='/shape_generation')
except Exception as e: print(k,'ERR',str(e)[:200]); sys.exit()
def find(x):
    if isinstance(x,str) and os.path.exists(x): return [x]
    if isinstance(x,dict): return sum([find(v) for v in x.values()],[])
    if isinstance(x,(list,tuple)): return sum([find(v) for v in x],[])
    return []
for p in find(r): shutil.copy(p,f'{k}_shape.glb'); print(k,'ok',os.path.getsize(p))
