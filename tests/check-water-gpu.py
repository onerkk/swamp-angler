#!/usr/bin/env python3
"""Compile and render the production water shaders using EGL/Mesa without a browser.
Requires libEGL, numpy and Pillow. Run from the repository root.
Use --output-dir to retain the temporal comparison frames.
"""
import subprocess,tempfile,argparse,os
from pathlib import Path
import numpy as np
from PIL import Image
args=argparse.ArgumentParser();args.add_argument('--output-dir');args=args.parse_args()
root=Path(__file__).resolve().parents[1];os.chdir(root)
temporary=tempfile.TemporaryDirectory();output=Path(args.output_dir or temporary.name);output.mkdir(parents=True,exist_ok=True)
import water_egl as gl
import ctypes as C,json
f=gl.fn
shaderSource=gl.source
cfg=json.loads(subprocess.check_output(['node','tests/export-water-shaders.cjs'],cwd=root))
assert gl.check('far water vertex',0x8B31,cfg['farVS'])
assert gl.check('far water fragment',0x8B30,cfg['farFS'])

def es3(code,vertex=False):
 prefix='#version 300 es\n#define texture2D texture\n'
 prefix+=('#define attribute in\n#define varying out\n' if vertex else '#define varying in\nout highp vec4 pc_fragColor;\n#define gl_FragColor pc_fragColor\n')
 return prefix+code.replace('#extension GL_OES_standard_derivatives : enable\n','')
for name,key,vertex in [('near vertex','vs',True),('near fragment','fs',False),('far vertex','farVS',True),('far fragment','farFS',False)]:
 assert gl.check('WebGL 1 '+name,0x8B31 if vertex else 0x8B30,cfg[key])
 converted=es3(cfg[key],vertex)
 assert gl.check('WebGL 2 '+name,0x8B31 if vertex else 0x8B30,converted)
 if key in ('vs','fs'):cfg[key]=converted

def shader(kind,code):
 s=gl.create(kind);p=C.c_char_p(code.encode());shaderSource(s,1,C.byref(p),None);gl.compile(s);ok=C.c_int();gl.get(s,0x8B81,C.byref(ok));assert ok.value;return s
createProgram=f('glCreateProgram',C.c_uint,[]);attach=f('glAttachShader',None,[C.c_uint,C.c_uint]);link=f('glLinkProgram',None,[C.c_uint]);use=f('glUseProgram',None,[C.c_uint]);program=createProgram();attach(program,shader(0x8B31,cfg['vs']));attach(program,shader(0x8B30,cfg['fs']));link(program);use(program)
loc=f('glGetUniformLocation',C.c_int,[C.c_uint,C.c_char_p]);u1=f('glUniform1f',None,[C.c_int,C.c_float]);u3=f('glUniform3f',None,[C.c_int,C.c_float,C.c_float,C.c_float]);ui=f('glUniform1i',None,[C.c_int,C.c_int]);um=f('glUniformMatrix4fv',None,[C.c_int,C.c_int,C.c_ubyte,C.c_void_p])
def uniform(name,v):
 l=loc(program,name.encode())
 if l<0:return
 if isinstance(v,(list,tuple)):
  if len(v)==3:u3(l,*v)
  else:a=np.array(v,dtype=np.float32);um(l,1,0,a.ctypes.data)
 else:u1(l,v)
for name,v in {'modelMatrix':cfg['model'],'viewMatrix':cfg['view'],'projectionMatrix':cfg['projection'],'cameraPosition':[0,1.4,0],'uEye':[0,1.4,0],'uPhoto':1,'uExpo':1,'uSunDir':[.5,.7,-.5],'uLightCol':[1.5,1.3,1.05],'uSunVis':1,'uHorizon':[.45,.55,.65],'uZenith':[.15,.25,.5],'uWind':[.95,.31,.25],'uWave':1,'uYaw':.25,'uNightDeep':.05,'uFogCol':[.45,.53,.6],'uFogDen':.001,'uDeep':[.012,.03,.025],'uScatter':[.028,.07,.06],'uSeaCol':[.025,.18,.26]}.items():uniform(name,v)
buffer=f('glGenBuffers',None,[C.c_int,C.POINTER(C.c_uint)]);bind=f('glBindBuffer',None,[C.c_uint,C.c_uint]);data=f('glBufferData',None,[C.c_uint,C.c_ssize_t,C.c_void_p,C.c_uint]);va=f('glGetAttribLocation',C.c_int,[C.c_uint,C.c_char_p]);enable=f('glEnableVertexAttribArray',None,[C.c_uint]);attrib=f('glVertexAttribPointer',None,[C.c_uint,C.c_int,C.c_uint,C.c_ubyte,C.c_int,C.c_void_p]);ids=(C.c_uint*2)();buffer(2,ids)
p=np.array(cfg['position'],np.float32);ix=np.array(cfg['index'],np.uint32);bind(0x8892,ids[0]);data(0x8892,p.nbytes,p.ctypes.data,0x88E4);at=va(program,b'position');enable(at);attrib(at,3,0x1406,0,0,None);bind(0x8893,ids[1]);data(0x8893,ix.nbytes,ix.ctypes.data,0x88E4)
gentex=f('glGenTextures',None,[C.c_int,C.POINTER(C.c_uint)]);activetex=f('glActiveTexture',None,[C.c_uint]);bindtex=f('glBindTexture',None,[C.c_uint,C.c_uint]);texImage=f('glTexImage2D',None,[C.c_uint,C.c_int,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p]);param=f('glTexParameteri',None,[C.c_uint,C.c_uint,C.c_int]);tex=(C.c_uint*3)();gentex(3,tex)
def texture(unit,file):
 im=Image.open(file).convert('RGBA') if file else Image.new('RGBA',(16,4),(255,255,255,255));im.thumbnail((2048,1024));im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM);a=np.array(im);activetex(0x84C0+unit);bindtex(0x0DE1,tex[unit]);texImage(0x0DE1,0,0x1908,im.width,im.height,0,0x1908,0x1401,a.ctypes.data)
 for key,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x2901),(0x2803,0x812F)]:param(0x0DE1,key,v)
for n,unit in [('uBandA',0),('uBandB',0),('uFullA',1),('uFullB',1),('uMask',2)]:ui(loc(program,n.encode()),unit)
viewport=f('glViewport',None,[C.c_int]*4);clearColor=f('glClearColor',None,[C.c_float]*4);clear=f('glClear',None,[C.c_uint]);draw=f('glDrawElements',None,[C.c_uint,C.c_int,C.c_uint,C.c_void_p]);read=f('glReadPixels',None,[C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p]);finish=f('glFinish',None,[]);viewport(0,0,512,384)
# Match the camera aspect and render the production displacement and fragment shaders.
for sea in [False,True]:
 uniform('uSea',float(sea));pre='sea' if sea else 'env';texture(0,pre+'_day_band.jpg');texture(1,pre+'_day_full.jpg');texture(2,None);frames=[]
 for t in [0,.6,1.2]:
  uniform('uTime',t);clearColor(.16,.2,.24,1);clear(0x4000);draw(0x0004,len(ix),0x1405,None);finish();a=np.zeros((384,512,4),np.uint8);read(0,0,512,384,0x1908,0x1401,a.ctypes.data);a=np.flipud(a);frames.append(a);Image.fromarray(a).save(output/('water-'+('sea' if sea else 'lake')+'-'+str(t)+'.png'))
 delta=np.abs(frames[0][220:,:,:3].astype(float)-frames[1][220:,:,:3]).mean();print(('sea' if sea else 'lake'),'animated mean RGB difference',round(float(delta),3));assert delta>1,'surface did not visibly animate'
