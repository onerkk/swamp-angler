#!/usr/bin/env python3
"""Compile the production immersion shader and verify above/below-water alpha masks."""
import json,subprocess,ctypes as C
from pathlib import Path
import numpy as np
import water_egl as gl
root=Path(__file__).resolve().parents[1]
s=json.loads(subprocess.check_output(['node','tests/export-submerged-shaders.cjs'],cwd=root))
def es3(code,vert):
 return '#version 300 es\n#define texture2D texture\n'+('#define attribute in\n#define varying out\n' if vert else '#define varying in\nout highp vec4 outColor;\n#define gl_FragColor outColor\n')+code.replace('#extension GL_OES_standard_derivatives : enable\n','')
for key in ['vs','fs','instVS','standardVS','standardFS','skinnedVS','standardInstVS','marineVS','marineFS','physicalFS','opticsVS','opticsFS','opticsSkinVS','opticsPhysicalFS']:
 typ=0x8B30 if key.lower().endswith('fs') else 0x8B31
 assert gl.check(key,typ,s[key]);assert gl.check('WebGL2 '+key,typ,es3(s[key],typ!=0x8B30))
f=gl.fn
create=f('glCreateProgram',C.c_uint,[]);attach=f('glAttachShader',None,[C.c_uint,C.c_uint]);link=f('glLinkProgram',None,[C.c_uint]);use=f('glUseProgram',None,[C.c_uint]);p=create()
for typ,code in [(0x8B31,s['vs']),(0x8B30,s['fs'])]:
 sh=gl.create(typ);src=C.c_char_p(code.encode());gl.source(sh,1,C.byref(src),None);gl.compile(sh);attach(p,sh)
link(p);use(p)
loc=f('glGetUniformLocation',C.c_int,[C.c_uint,C.c_char_p]);u1=f('glUniform1f',None,[C.c_int,C.c_float]);u3=f('glUniform3f',None,[C.c_int,C.c_float,C.c_float,C.c_float]);um=f('glUniformMatrix4fv',None,[C.c_int,C.c_int,C.c_ubyte,C.c_void_p])
a=np.eye(4,dtype=np.float32);um(loc(p,b'modelMatrix'),1,0,a.ctypes.data);u3(loc(p,b'uSubWind'),1,0,0);u1(loc(p,b'uSubTime'),0);u1(loc(p,b'uSubSea'),0)
gen=f('glGenBuffers',None,[C.c_int,C.POINTER(C.c_uint)]);bind=f('glBindBuffer',None,[C.c_uint,C.c_uint]);data=f('glBufferData',None,[C.c_uint,C.c_ssize_t,C.c_void_p]);ena=f('glEnableVertexAttribArray',None,[C.c_uint]);at=f('glGetAttribLocation',C.c_int,[C.c_uint,C.c_char_p]);attr=f('glVertexAttribPointer',None,[C.c_uint,C.c_int,C.c_uint,C.c_ubyte,C.c_int,C.c_void_p]);b=C.c_uint();gen(1,C.byref(b));bind(0x8892,b)
verts=np.array([[-.8,-.8,0],[.8,-.8,0],[-.8,.8,0],[.8,-.8,0],[.8,.8,0],[-.8,.8,0]],np.float32);data(0x8892,verts.nbytes,verts.ctypes.data,0x88E4);l=at(p,b'position');ena(l);attr(l,3,0x1406,0,0,None)
viewport=f('glViewport',None,[C.c_int]*4);viewport(0,0,512,384);clr=f('glClearColor',None,[C.c_float]*4);clear=f('glClear',None,[C.c_uint]);draw=f('glDrawArrays',None,[C.c_uint,C.c_int,C.c_int]);read=f('glReadPixels',None,[C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p])
frames=[]
for mode in [0,1]:
 u1(loc(p,b'uSubPass'),mode);clr(0,0,0,0);clear(0x4000);draw(4,0,6);a=np.zeros((384,512,4),np.uint8);read(0,0,512,384,0x1908,0x1401,a.ctypes.data);frames.append(a)
assert frames[0][270,256,3]>250 and frames[0][100,256,3]==0,'submerged body incorrectly appears above the water'
assert frames[1][270,256,3]==0 and frames[1][100,256,3]>80,'underwater body missing from transmission target'
print('Immersion masks verified: exposed head only in main pass; submerged body only in water transmission pass.')
