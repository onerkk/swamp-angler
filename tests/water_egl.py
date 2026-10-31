"""Minimal EGL shader compiler used by check-water-gpu.py."""
import ctypes as C,json,sys
E=C.CDLL('libEGL.so.1');E.eglGetProcAddress.restype=C.c_void_p;E.eglGetProcAddress.argtypes=[C.c_char_p]
PF=C.CFUNCTYPE(C.c_void_p,C.c_uint,C.c_void_p,C.POINTER(C.c_int));getplat=PF(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
display=getplat(0x31DD,None,None)
E.eglInitialize.argtypes=[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_int)];major=C.c_int();minor=C.c_int()
assert E.eglInitialize(display,C.byref(major),C.byref(minor)),'egl init'
E.eglBindAPI(0x30A0)
attrs=(C.c_int*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)
config=C.c_void_p();num=C.c_int();E.eglChooseConfig.argtypes=[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_void_p),C.c_int,C.POINTER(C.c_int)];assert E.eglChooseConfig(display,attrs,C.byref(config),1,C.byref(num)) and num.value
E.eglCreatePbufferSurface.restype=C.c_void_p;E.eglCreatePbufferSurface.argtypes=[C.c_void_p,C.c_void_p,C.POINTER(C.c_int)];surf=E.eglCreatePbufferSurface(display,config,(C.c_int*5)(0x3057,512,0x3056,384,0x3038))
E.eglCreateContext.restype=C.c_void_p;E.eglCreateContext.argtypes=[C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int)];ctx=E.eglCreateContext(display,config,None,(C.c_int*3)(0x3098,2,0x3038));assert ctx,'context'
E.eglMakeCurrent.argtypes=[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p];assert E.eglMakeCurrent(display,surf,surf,ctx)
def fn(name,restype,args):return C.CFUNCTYPE(restype,*args)(E.eglGetProcAddress(name.encode()))
getstr=fn('glGetString',C.c_char_p,[C.c_uint]);print(getstr(0x1F02).decode(),getstr(0x8B8C).decode())
create=fn('glCreateShader',C.c_uint,[C.c_uint]);source=fn('glShaderSource',None,[C.c_uint,C.c_int,C.POINTER(C.c_char_p),C.POINTER(C.c_int)]);compile=fn('glCompileShader',None,[C.c_uint]);get=fn('glGetShaderiv',None,[C.c_uint,C.c_uint,C.POINTER(C.c_int)]);log=fn('glGetShaderInfoLog',None,[C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_char_p])
def check(name,kind,code):
 shader=create(kind);s=C.c_char_p(code.encode());source(shader,1,C.byref(s),None);compile(shader);ok=C.c_int();get(shader,0x8B81,C.byref(ok));buf=C.create_string_buffer(10000);log(shader,10000,None,buf);print(name,ok.value,buf.value.decode());return ok.value
