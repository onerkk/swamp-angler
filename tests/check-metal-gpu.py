"""Render real metallic PBR spheres: an IBL regression must show a measurable response."""
import ctypes as C,json,subprocess,numpy as np
from pathlib import Path
import water_egl as gl
s=json.loads(subprocess.check_output(['node','tests/export-metal-shaders.cjs'],cwd=Path(__file__).resolve().parents[1]));f=gl.fn
assert gl.check('metal vertex',0x8B31,s['vs']);assert gl.check('metal fragment with CubeUV IBL',0x8B30,s['fs'])
p=f('glCreateProgram',C.c_uint,[])();attach=f('glAttachShader',None,[C.c_uint,C.c_uint])
for typ,code in [(0x8B31,s['vs']),(0x8B30,s['fs'])]:
 sh=gl.create(typ);v=C.c_char_p(code.encode());gl.source(sh,1,C.byref(v),None);gl.compile(sh);attach(p,sh)
f('glLinkProgram',None,[C.c_uint])(p);f('glUseProgram',None,[C.c_uint])(p)
loc=f('glGetUniformLocation',C.c_int,[C.c_uint,C.c_char_p]);u1=f('glUniform1f',None,[C.c_int,C.c_float]);u3=f('glUniform3f',None,[C.c_int,C.c_float,C.c_float,C.c_float]);ui=f('glUniform1i',None,[C.c_int,C.c_int]);um=f('glUniformMatrix4fv',None,[C.c_int,C.c_int,C.c_ubyte,C.c_void_p])
for name,a in [('modelMatrix',np.eye(4).T.flatten()),('modelViewMatrix',s['view']),('viewMatrix',s['view']),('projectionMatrix',s['projection'])]:
 a=np.ascontiguousarray(a,dtype=np.float32);um(loc(p,name.encode()),1,0,a.ctypes.data)
a=np.eye(3,dtype=np.float32);f('glUniformMatrix3fv',None,[C.c_int,C.c_int,C.c_ubyte,C.c_void_p])(loc(p,b'normalMatrix'),1,0,a.ctypes.data);u3(loc(p,b'cameraPosition'),0,0,3);ui(loc(p,b'isOrthographic'),1)
for name,value in [('metalness',1),('roughness',.2),('envMapIntensity',1),('opacity',1),('flipEnvMap',-1),('reflectivity',.5),('refractionRatio',.98)]:u1(loc(p,name.encode()),value)
u3(loc(p,b'diffuse'),.72,.46,.12)
gen=f('glGenBuffers',None,[C.c_int,C.POINTER(C.c_uint)]);bind=f('glBindBuffer',None,[C.c_uint,C.c_uint]);data=f('glBufferData',None,[C.c_uint,C.c_ssize_t,C.c_void_p]);ena=f('glEnableVertexAttribArray',None,[C.c_uint]);at=f('glGetAttribLocation',C.c_int,[C.c_uint,C.c_char_p]);attr=f('glVertexAttribPointer',None,[C.c_uint,C.c_int,C.c_uint,C.c_ubyte,C.c_int,C.c_void_p])
for name in ['position','normal']:
 a=np.array(s[name],np.float32);b=C.c_uint();gen(1,C.byref(b));bind(0x8892,b);data(0x8892,a.nbytes,a.ctypes.data,0x88E4);l=at(p,name.encode());ena(l);attr(l,3,0x1406,0,0,None)
t=C.c_uint();f('glGenTextures',None,[C.c_int,C.POINTER(C.c_uint)])(1,C.byref(t));f('glBindTexture',None,[C.c_uint,C.c_uint])(0x0DE1,t);ui(loc(p,b'envMap'),0)
param=f('glTexParameteri',None,[C.c_uint,C.c_uint,C.c_int]);tex=f('glTexImage2D',None,[C.c_uint,C.c_int,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p])
for key,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:param(0x0DE1,key,v)
f('glViewport',None,[C.c_int]*4)(0,0,512,384);f('glEnable',None,[C.c_uint])(0x0B71);f('glEnable',None,[C.c_uint])(0x0B44);read=f('glReadPixels',None,[C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p]);frames=[]
for bright in [0,1]:
 env=np.ones((768,768,4),np.float32);env[:,:,:3]=0 if not bright else .55;tex(0x0DE1,0,0x1908,768,768,0,0x1908,0x1406,env.ctypes.data)
 f('glClearColor',None,[C.c_float]*4)(0,0,0,0);f('glClear',None,[C.c_uint])(0x4000|0x100);f('glDrawArrays',None,[C.c_uint,C.c_int,C.c_int])(4,0,len(s['position'])//3)
 frame=np.zeros((384,512,4),np.uint8);read(0,0,512,384,0x1908,0x1401,frame.ctypes.data);frames.append(frame)
mask=frames[1][:,:,3]>0;dark=frames[0][:,:,:3][mask].mean();gold=frames[1][:,:,:3][mask].mean(axis=0)
assert dark<2,'metal without lights/environment must not glow';assert gold[0]>gold[1]*1.3 and gold[1]>gold[2]*1.7 and gold.mean()>dark+20,'gold must reflect its environment instead of looking like flat paint'
print('Actual metallic BRDF: black environment mean',round(float(dark),2),'lit gold RGB',gold.round(2).tolist(),'centre',frames[1][192,256].tolist())
