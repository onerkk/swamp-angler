"""Compile actual production SSR and mapped/animated normal shaders on EGL ES2/ES3."""
import json,subprocess
from pathlib import Path
import water_egl as gl
s=json.loads(subprocess.check_output(['node','tests/export-radiance-shaders.cjs'],cwd=Path(__file__).resolve().parents[1]))
def es3(code,vert):
 return '#version 300 es\n#define texture2D texture\n'+('#define attribute in\n#define varying out\n' if vert else '#define varying in\nout highp vec4 outColor;\n#define gl_FragColor outColor\n')+code.replace('#extension GL_OES_standard_derivatives : enable\n','')
for name,code in s.items():
 vert=name.lower().endswith('vs');typ=0x8B31 if vert else 0x8B30
 assert gl.check(name,typ,code);assert gl.check('WebGL2 '+name,typ,es3(code,vert))
print('Production SSR and tangent-space normals compile for WebGL1/2, including skinning and instancing.')
# A real reflected-ray fixture: grey surface at z=-5, red near occluder at z=-4.5.
# Reflection must find the red object on the right; an unselected surface must stay transparent.
import ctypes as C,numpy as np
f=gl.fn
p=f('glCreateProgram',C.c_uint,[])();attach=f('glAttachShader',None,[C.c_uint,C.c_uint])
for typ,code in [(0x8B31,s['vs']),(0x8B30,s['fs'])]:
 sh=gl.create(typ);src=C.c_char_p(code.encode());gl.source(sh,1,C.byref(src),None);gl.compile(sh);attach(p,sh)
f('glLinkProgram',None,[C.c_uint])(p);f('glUseProgram',None,[C.c_uint])(p)
loc=f('glGetUniformLocation',C.c_int,[C.c_uint,C.c_char_p]);u1=f('glUniform1f',None,[C.c_int,C.c_float]);ui=f('glUniform1i',None,[C.c_int,C.c_int]);u2=f('glUniform2f',None,[C.c_int,C.c_float,C.c_float]);um=f('glUniformMatrix4fv',None,[C.c_int,C.c_int,C.c_ubyte,C.c_void_p])
near=.1;far=100.;proj=np.array([[1.299038,0,0,0],[0,1.73205,0,0],[0,0,-(far+near)/(far-near),-2*far*near/(far-near)],[0,0,-1,0]],np.float32)
for name,a in [('modelViewMatrix',np.eye(4,dtype=np.float32)),('projectionMatrix',np.eye(4,dtype=np.float32)),('cameraProjectionMatrix',proj),('cameraInverseProjectionMatrix',np.linalg.inv(proj))]:
 a=np.ascontiguousarray(a.T,dtype=np.float32);um(loc(p,name.encode()),1,0,a.ctypes.data)
for name,value in [('cameraNear',near),('cameraFar',far),('maxDistance',18),('thickness',.15),('opacity',1)]:u1(loc(p,name.encode()),value)
u2(loc(p,b'resolution'),512,384)
gen=f('glGenBuffers',None,[C.c_int,C.POINTER(C.c_uint)]);bind=f('glBindBuffer',None,[C.c_uint,C.c_uint]);data=f('glBufferData',None,[C.c_uint,C.c_ssize_t,C.c_void_p]);ena=f('glEnableVertexAttribArray',None,[C.c_uint]);at=f('glGetAttribLocation',C.c_int,[C.c_uint,C.c_char_p]);attr=f('glVertexAttribPointer',None,[C.c_uint,C.c_int,C.c_uint,C.c_ubyte,C.c_int,C.c_void_p])
verts=np.array([[-1,-1,0,0,0],[1,-1,0,1,0],[-1,1,0,0,1],[1,-1,0,1,0],[1,1,0,1,1],[-1,1,0,0,1]],np.float32);buf=C.c_uint();gen(1,C.byref(buf));bind(0x8892,buf);data(0x8892,verts.nbytes,verts.ctypes.data,0x88E4)
for name,n,offset in [('position',3,0),('uv',2,12)]:a=at(p,name.encode());ena(a);attr(a,n,0x1406,0,20,C.c_void_p(offset))
gent=f('glGenTextures',None,[C.c_int,C.POINTER(C.c_uint)]);active=f('glActiveTexture',None,[C.c_uint]);bindt=f('glBindTexture',None,[C.c_uint,C.c_uint]);param=f('glTexParameteri',None,[C.c_uint,C.c_uint,C.c_int]);tex=f('glTexImage2D',None,[C.c_uint,C.c_int,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p])
for unit,name in enumerate(['tDiffuse','tNormal','tMetalness','tDepth']):
 t=C.c_uint();gent(1,C.byref(t));active(0x84C0+unit);bindt(0x0DE1,t);ui(loc(p,name.encode()),unit)
 for key,value in [(0x2801,0x2600),(0x2800,0x2600),(0x2802,0x812F),(0x2803,0x812F)]:param(0x0DE1,key,value)
 a=np.ones((384,512,4),np.float32)
 if name=='tDiffuse':a[:,:,:3]=.2;a[:,310:420,:3]=[1,.05,.02]
 elif name=='tNormal':a[:,:,:3]=[.75,.5,.9330127];a[:,310:420,:3]=[.1,.5,.8]
 elif name=='tMetalness':a[:,:,:3]=1;a[:,:30,:3]=0
 else:
  z=np.full((384,512),-5,np.float32);z[:,310:420]=-4.5;depth=((proj[2,2]*z+proj[2,3])/(-z))*.5+.5;a[:,:,:3]=depth[:,:,None]
 tex(0x0DE1,0,0x1908,512,384,0,0x1908,0x1406,a.ctypes.data)
f('glViewport',None,[C.c_int]*4)(0,0,512,384);f('glClearColor',None,[C.c_float]*4)(0,0,0,0);f('glClear',None,[C.c_uint])(0x4000);f('glDrawArrays',None,[C.c_uint,C.c_int,C.c_int])(4,0,6)
frame=np.zeros((384,512,4),np.uint8);f('glReadPixels',None,[C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p])(0,0,512,384,0x1908,0x1401,frame.ctypes.data)
hits=(frame[:,:,0]>200)&(frame[:,:,1]<40)&(frame[:,:,3]>0);assert hits[:,100:300].sum()>100,'SSR rays failed to reflect the red occluder';assert frame[:,:30,3].max()==0,'unselected pixels must stay transparent'
print('Rendered SSR rays find the red occluder; non-reflective pixels remain transparent.',int(hits.sum()),'hits')
