/* ===== 第 1 段 · 渲染核心：天空、樹林遠景、水面、光照、時間 ===== */
const SH = {};
SH.common = `
#define EYE_Y 2.4
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uLightCol;
uniform vec3 uSunDisk;
uniform vec3 uSunCol;
uniform vec3 uMoonDir;
uniform vec3 uMoonCol;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uFogCol;
uniform float uFogDen;
uniform float uMist;
uniform float uDay;
uniform float uCloud;
uniform vec3 uEye;
uniform float uRain;
uniform vec3 uWind;
uniform vec2 uCloudOff;
uniform float uCShadow;
uniform sampler2D uBandA;
uniform sampler2D uBandB;
uniform sampler2D uFullA;
uniform sampler2D uFullB;
uniform sampler2D uMask;
uniform sampler2D uOvcA;
uniform sampler2D uOvcB;
uniform float uOvcK;
uniform float uPMix;
uniform float uPhoto;
uniform float uYaw;
uniform float uExpo;
uniform float uNight;
uniform float uNightDeep;
uniform float uMoonK;
uniform float uBio;
uniform sampler2D uRefl;
uniform mat4 uReflMat;
uniform float uReflOn;
uniform float uSea;
uniform vec3 uSeaCol;
uniform float uReef;
uniform float uLightK;
float hash11(float p){ p = fract(p*0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
float hash31(vec3 p3){ p3 = fract(p3*0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y)*p3.z); }
float noise1(float x){ float i = floor(x); float f = fract(x); return mix(hash11(i), hash11(i + 1.0), f*f*(3.0 - 2.0*f)); }
float noise2(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm3(vec2 p){ float v = 0.0; float a = 0.5; for(int i = 0; i < 3; i++){ v += a*noise2(p); p = p*2.03 + vec2(11.7, 5.3); a *= 0.5; } return v/0.875; }
float fbm5(vec2 p){ float v = 0.0; float a = 0.5; for(int i = 0; i < 5; i++){ v += a*noise2(p); p = p*2.03 + vec2(11.7, 5.3); a *= 0.5; } return v/0.96875; }
float shoreR(float az){ float d = (az - 0.12)/0.30; return 54.0 + 9.0*sin(az*2.3 + 1.1) + 6.0*sin(az*5.1 + 0.3) + 3.0*sin(az*11.7 + 2.0) + 45.0*exp(-d*d); }
float cloudSh(vec2 xz){ return uCShadow*smoothstep(0.45, 0.75, noise2(xz*0.011 + uCloudOff*1.6)); }
float fogF(float d){ return 1.0 - exp(-d*uFogDen); }
vec3 fogColor(vec3 rd){ float sd = max(dot(rd, uSunDir), 0.0); return uFogCol + uGlow*(pow(sd, 6.0)*0.5 + pow(sd, 48.0)*0.7)*uDay; }

vec3 skyBase(vec3 rd, bool disks, bool lite){
  float e = rd.y;
  float eu = max(e, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.03, 0.85, eu), 0.6));
  float sd = max(dot(rd, uSunDir), 0.0);
  col += uGlow*(pow(sd, 5.0)*0.5 + pow(sd, 1.6)*0.10)*(1.0 - 0.6*eu);
  if(uDay < 0.45 && e > 0.0){
    vec3 sp = rd*360.0; vec3 cell = floor(sp); float h = hash31(cell);
    if(h > 0.9972){ vec3 f = fract(sp) - 0.5; col += vec3(0.75, 0.82, 1.0)*exp(-dot(f, f)*36.0)*(h - 0.9972)*520.0*(0.45 - uDay)*smoothstep(0.02, 0.25, e); }
  }
  if(disks){
    float d1 = dot(rd, uSunDisk);
    col += uSunCol*(smoothstep(0.99988, 0.99995, d1)*28.0 + pow(max(d1, 0.0), 1200.0)*1.2);
    float d2 = dot(rd, uMoonDir);
    col += uMoonCol*smoothstep(0.99982, 0.99988, d2)*7.0;
  }
  if(e > 0.0){
    vec2 cuv = rd.xz/(e + 0.10)*0.6 + uCloudOff;
    float n = lite ? fbm3(cuv) : fbm5(cuv);
    float cov = smoothstep(0.66 - uCloud*0.38, 0.95 - uCloud*0.30, n);
    float n2 = fbm3(cuv + uSunDir.xz*0.08);
    float lit = clamp(0.55 + (n - n2)*2.8, 0.0, 1.0);
    vec3 cDark = mix(uZenith, uHorizon, 0.65)*0.6;
    vec3 cLit = mix(uHorizon*1.05, uLightCol*0.32, 0.4) + uGlow*pow(sd, 3.0)*0.7;
    col = mix(col, mix(cDark, cLit, lit), cov*smoothstep(0.0, 0.16, e)*0.94);
  }
  return col;
}

vec4 nearLayer(float s, float y, float dist, vec3 rd, bool lite){
  if(y > 30.0) return vec4(0.0);
  vec3 amb = mix(uHorizon, uZenith, 0.45)*0.4 + uFogCol*0.15;
  vec3 sunc = uLightCol*0.24*(1.0 - 0.75*uCShadow*smoothstep(0.45, 0.75, noise1(s*0.02 + uCloudOff.x*40.0)));
  vec3 col; float a;
  if(y < 0.25){
    col = vec3(0.022, 0.024, 0.014)*(amb*2.4 + sunc*0.3);
    a = 1.0;
  } else {
    float n = lite ? noise2(vec2(s*0.55, y*0.55)) : fbm3(vec2(s*0.55, y*0.55));
    float n2 = noise2(vec2(s*2.3, y*2.3));
    float lc = lite ? n2 : noise2(vec2(s*5.5 + sin(uTime*1.7 + s)*uWind.z*0.2, y*5.5));
    float sideS = sign(rd.x*uSunDir.z - rd.z*uSunDir.x + 1e-4);
    float cw = 4.6; float ci = floor(s/cw);
    float crown = 0.0; float shade = 0.5; float trunk = 0.0; float hue = 0.5; float cbot = 30.0;
    for(int k = -1; k <= 1; k++){
      float c = ci + float(k);
      float h1 = hash11(c*1.37 + 0.5); float h2 = hash11(c*7.13); float h3 = hash11(c*3.31); float h4 = hash11(c*9.7 + 2.0);
      float cx = (c + 0.15 + 0.7*h2)*cw;
      float H = 8.0 + 10.0*h1;
      float rw = 2.2 + 2.0*h3;
      float rh = H*0.4;
      float cy = H - rh;
      vec2 d = vec2((s - cx)/rw, (y - cy)/rh);
      float r = length(d) + (n - 0.5)*0.7 + (n2 - 0.5)*0.18 + (lc - 0.5)*0.22;
      float m = 1.0 - smoothstep(0.82, 1.0, r);
      if(m > crown){ crown = m; shade = clamp(0.5 + 0.35*d.y + 0.3*d.x*sideS + (n - 0.5)*0.9, 0.0, 1.0); hue = h4; cbot = cy - rh*0.7; }
      float tw = 0.16 + 0.22*h4; float fl = 1.0 + 1.5*exp(-y*0.9);
      float dx = abs(s - cx - (h4 - 0.5)*0.25*y);
      trunk = max(trunk, (1.0 - smoothstep(tw*fl - 0.04, tw*fl + 0.04, dx))*step(y, cy));
    }
    float uTop = 2.2 + 3.2*noise1(s*0.13 + 7.7) + 1.3*noise1(s*0.7);
    float bush = clamp((uTop - y)*0.9 + (n - 0.5)*2.4 + (n2 - 0.5)*0.6, 0.0, 1.0);
    float ms = noise1(s*2.6 + 3.0);
    float moss = smoothstep(0.58, 0.66, ms)*smoothstep(cbot - 3.5*ms, cbot + 1.0, y)*step(y, cbot + 3.0)*(1.0 - crown);
    vec3 g1 = mix(vec3(0.020, 0.050, 0.016), vec3(0.042, 0.062, 0.018), hue);
    vec3 cc = g1*(amb*2.2 + sunc*(0.25 + 1.3*shade))*(0.45 + 0.75*n2)*(0.5 + 0.8*smoothstep(0.2, 0.8, lc));
    vec2 sh2 = uSunDir.xz + vec2(1e-5);
    float sdh = max(dot(normalize(rd.xz + vec2(1e-5)), normalize(sh2)), 0.0);
    cc += uGlow*pow(sdh, 8.0)*crown*(1.0 - crown)*1.4*uDay;
    vec3 tc = vec3(0.045, 0.04, 0.034)*(amb*2.0 + sunc*0.5)*(0.6 + 0.7*n2);
    vec3 bc = vec3(0.018, 0.04, 0.014)*(amb*2.3 + sunc*0.55*(0.3 + n))*(0.6 + 0.8*n2);
    vec3 mc = vec3(0.07, 0.08, 0.062)*(amb*2.3 + sunc*0.6)*(0.7 + 0.5*n2);
    col = tc; a = trunk;
    col = mix(col, mc, moss*0.8); a = max(a, moss*0.8);
    col = mix(col, cc, crown); a = max(a, crown);
    col = mix(col, bc, bush); a = max(a, bush);
  }
  float f = fogF(dist);
  float mist = uMist*exp(-max(y, 0.0)*0.25)*smoothstep(8.0, 70.0, dist);
  col = mix(col, fogColor(rd), clamp(f + mist*0.45, 0.0, 0.97));
  return vec4(col, a);
}

vec4 farLayer(float s, float y, float dist, vec3 rd){
  float top = 9.0 + 6.0*noise1(s*0.03 + 2.0) + 3.5*noise1(s*0.14) + 1.6*noise1(s*0.55) + 0.7*noise1(s*2.1);
  float a = clamp((top - y)*1.2, 0.0, 1.0);
  vec3 amb = mix(uHorizon, uZenith, 0.5)*0.5;
  vec3 col = vec3(0.024, 0.045, 0.022)*(amb*2.0 + uLightCol*0.08);
  col = mix(col, fogColor(rd), clamp(fogF(dist)*1.1 + uMist*0.3, 0.0, 0.985));
  return vec4(col, a);
}

vec3 envRayProc(vec3 P, vec3 dir, bool disks, bool lite){
  vec3 col = skyBase(dir, disks, lite);
  float hl = length(dir.xz);
  if(hl < 1e-4) return col;
  vec2 rh = dir.xz/hl;
  float tanE = dir.y/hl;
  float b = dot(P.xz, rh);
  float c = dot(P.xz, P.xz);
  float R = shoreR(atan(rh.x, -rh.y));
  float t = -b + sqrt(max(b*b - c + R*R, 0.0));
  vec2 H = P.xz + rh*t;
  float az = atan(H.x, -H.y);
  R = shoreR(az);
  t = -b + sqrt(max(b*b - c + R*R, 0.0));
  H = P.xz + rh*t; az = atan(H.x, -H.y);
  float y = P.y + tanE*t;
  if(tanE > 0.0 && y > 28.0) return col;
  float R2 = R + 160.0;
  float t2 = -b + sqrt(max(b*b - c + R2*R2, 0.0));
  vec2 H2 = P.xz + rh*t2;
  float y2 = P.y + tanE*t2;
  vec4 fl = farLayer(atan(H2.x, -H2.y)*R2, y2, length(vec3(H2.x - uEye.x, y2 - uEye.y, H2.y - uEye.z)), dir);
  col = mix(col, fl.rgb, fl.a);
  vec4 nl = nearLayer(az*R, y, length(vec3(H.x - uEye.x, y - uEye.y, H.y - uEye.z)), dir, lite);
  col = mix(col, nl.rgb, nl.a);
  return col;
}
vec3 photoS(sampler2D band, sampler2D full, vec3 d){
  float u = fract(atan(d.x, -d.z)*0.15915494 + uYaw);
  float e = asin(clamp(d.y, -1.0, 1.0));
  float vb = (e + 0.2094395)/1.0471976;
  vec3 c = (vb > 0.003 && vb < 0.997) ? texture2D(band, vec2(u, vb)).rgb : texture2D(full, vec2(u, e*0.31830989 + 0.5)).rgb;
  return pow(c, vec3(2.2));
}
vec3 photoEnv(vec3 dir){
  vec3 d = normalize(dir);
  vec3 c = mix(photoS(uBandA, uFullA, d), photoS(uBandB, uFullB, d), uPMix);
  float g = dot(c, vec3(0.3, 0.59, 0.11));
  // 陰天／下雨：天空部分換成實拍的陰天雲層照片（Poly Haven，CC0）；遠山、岸邊等地景保留原照片
  if(uOvcK > 0.01 && d.y > -0.02){
    float ou = fract(atan(d.x, -d.z)*0.15915494 + 0.37), ov = asin(clamp(d.y, -1.0, 1.0))*0.31830989 + 0.5;
    vec3 oc = mix(pow(texture2D(uOvcA, vec2(ou, ov)).rgb, vec3(2.2)), pow(texture2D(uOvcB, vec2(ou, ov)).rgb, vec3(2.2)), clamp(uRain*1.4, 0.0, 1.0));
    float skyK = smoothstep(-0.01, 0.06, d.y)*smoothstep(0.10, 0.26, g);
    float om = dot(oc, vec3(0.3, 0.59, 0.11)); oc = max(vec3(0.0), vec3(om) + (oc - vec3(om))*1.5); oc = mix(vec3(om), oc, 1.0)*mix(1.0, 1.35, smoothstep(0.0, 0.3, d.y));   // 加強雲層明暗層次
    c = mix(c, oc, skyK*uOvcK); g = mix(g, om, skyK*uOvcK);
  }
  float keepSky = 1.0 - 0.8*uOvcK*step(0.0, d.y);   // 天空已是實拍陰天照片，不再整片灰化壓暗
  c = mix(c, vec3(g)*vec3(0.94, 0.97, 1.02), clamp(uCloud - 0.3, 0.0, 1.0)*0.75*keepSky);
  c *= 1.0 - (0.35*clamp(uCloud - 0.4, 0.0, 1.0) + 0.25*uRain)*mix(1.0, 0.45, 1.0 - keepSky);
  c *= mix(1.0, uNightDeep, uNight);
  vec3 navy = mix(vec3(0.006, 0.009, 0.02), vec3(0.0012, 0.002, 0.0065), smoothstep(0.1, 0.9, d.y));
  c = mix(c, navy, uNight*0.9*smoothstep(0.02, 0.35, d.y));
  if(d.y > 0.0){
    vec2 cuv = d.xz/(d.y + 0.10)*0.6 + uCloudOff;
    float n = fbm5(cuv);
    float cov = smoothstep(0.66 - uCloud*0.38, 0.95 - uCloud*0.3, n)*clamp((uCloud - 0.35)*1.8, 0.0, 1.0)*(1.0 - 0.85*uOvcK);   // 已換成實拍雲層時，程式雲幾乎不疊
    float n2 = fbm3(cuv + uSunDir.xz*0.08);
    float lit = clamp(0.55 + (n - n2)*2.8, 0.0, 1.0);
    c = mix(c, mix(vec3(g*0.55), vec3(g*1.15), lit), cov*smoothstep(0.0, 0.16, d.y)*0.92);
  }
  float hz = exp(-abs(d.y)*10.0);
  c = mix(c, vec3(g)*0.9 + uFogCol*0.15, clamp(hz*(uMist*0.35 + max(uFogDen - 0.006, 0.0)*35.0), 0.0, 0.8)*(1.0 - 0.6*uOvcK*step(0.0, d.y)));   // 有實拍雲層時，地平線霧氣不再把雲層蓋掉
  return c;
}
vec3 envRay(vec3 P, vec3 dir, bool disks, bool lite){
  if(uPhoto > 0.5) return photoEnv(dir);
  return envRayProc(P, dir, disks, lite);
}
`;
SH.skyVS = `
varying vec3 vDir;
void main(){ vec4 wp = modelMatrix*vec4(position, 1.0); vDir = wp.xyz - cameraPosition; gl_Position = projectionMatrix*viewMatrix*wp; }
`;
SH.skyFS = `
varying vec3 vDir;
void main(){
  vec3 rd = normalize(vDir);
  vec3 col = envRay(cameraPosition, rd, true, false);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}
`;
SH.waterVS = `
varying vec3 vW;
void main(){ vec4 wp = modelMatrix*vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }
`;
SH.seaVS = `
uniform float uTime;
uniform vec3 uWind;
varying vec3 vW;
varying vec3 vNs;
varying float vH;
vec3 gW(vec2 p0, vec2 d, float L, float A, float Q, inout vec3 n){
  float k = 6.2831853/L; float w = sqrt(9.81*k); float th = k*dot(d, p0) - w*uTime; float c = cos(th); float s = sin(th);
  n.x -= d.x*k*A*c; n.z -= d.y*k*A*c; n.y -= Q*k*A*s;
  return vec3(Q*A*d.x*c, A*s, Q*A*d.y*c);
}
void main(){
  vec4 wp = modelMatrix*vec4(position, 1.0); vec2 p0 = wp.xz;
  vec2 rel = wp.xz - modelMatrix[3].xz;
  float edge = 1.0 - smoothstep(105.0, 148.0, max(abs(rel.x), abs(rel.y)));
  vec2 wd = normalize(uWind.xy + vec2(1e-4)); float s = (0.45 + 1.1*uWind.z)*edge;
  vec2 d2 = vec2(wd.x*0.77 - wd.y*0.64, wd.y*0.77 + wd.x*0.64); vec2 d3 = vec2(wd.x*0.77 + wd.y*0.64, wd.y*0.77 - wd.x*0.64);
  vec2 d4 = vec2(wd.x*0.34 - wd.y*0.94, wd.y*0.34 + wd.x*0.94);
  vec3 n = vec3(0.0, 1.0, 0.0); vec3 off = vec3(0.0);
  off += gW(p0, wd, 38.0, 0.42*s, 0.45, n);
  off += gW(p0, d2, 23.0, 0.28*s, 0.5, n);
  off += gW(p0, d3, 15.0, 0.18*s, 0.5, n);
  off += gW(p0, d4, 9.0, 0.11*s, 0.55, n);
  off += gW(p0, vec2(0.6, 0.8), 5.5, 0.06*s, 0.6, n);
  off += gW(p0, vec2(-0.8, 0.6), 3.2, 0.035*s, 0.6, n);
  wp.xyz += off; vW = wp.xyz; vNs = normalize(n); vH = off.y/(1.1*s + 1e-3);
  gl_Position = projectionMatrix*viewMatrix*wp;
}
`;
SH.waterFS = `
#ifdef SEAGRID
varying vec3 vNs;
varying float vH;
#endif
uniform vec4 uRip[12];
uniform vec3 uDeep;
uniform vec3 uScatter;
uniform float uWave;
uniform float uSunVis;
varying vec3 vW;
vec3 TM(vec3 x){ if(uPhoto < 0.5) return x; x *= uExpo; return clamp((x*(2.51*x + 0.03))/(x*(2.43*x + 0.59) + 0.14), 0.0, 1.0); }
float causF(vec2 p, float t){
  vec2 q = p*1.7 + 0.8*vec2(noise2(p*0.35 + t*0.12), noise2(p*0.35 - t*0.1 + 5.3));
  float a = abs(sin(q.x*2.3 + t*0.8) + sin(q.y*2.1 - t*0.7) + sin((q.x - q.y)*1.6 + t*0.6));
  return pow(clamp(1.0 - a*0.5, 0.0, 1.0), 5.0);
}
vec2 wv(vec2 p, vec2 d, float len, float amp, float dist){
  float k = 6.2831853/len; float w = sqrt(9.81*k);
  float ph = dot(d, p)*k - w*uTime;
  float fade = 1.0 - smoothstep(len*22.0*(1.0 + 3.0*uSea), len*80.0*(1.0 + 4.0*uSea), dist);
  return d*(amp*k*cos(ph)*fade);
}
vec3 noised(vec2 x){
  vec2 i = floor(x); vec2 f = fract(x); vec2 u = f*f*(3.0 - 2.0*f); vec2 du = 6.0*f*(1.0 - f);
  float a = hash21(i); float b = hash21(i + vec2(1.0, 0.0)); float c = hash21(i + vec2(0.0, 1.0)); float d = hash21(i + vec2(1.0, 1.0));
  return vec3(a + (b - a)*u.x + (c - a)*u.y + (a - b - c + d)*u.x*u.y, du*(vec2(b - a, c - a) + (a - b - c + d)*u.yx));
}
void main(){
  vec3 Vv = cameraPosition - vW; float dist = length(Vv); vec3 V = Vv/dist;
  #ifndef SEAGRID
  if(uSea > 0.5 && length(vW.xz - cameraPosition.xz) < 138.0) discard;
  #endif
  if(uPhoto > 0.5){ vec3 dv = normalize(vW - uEye); float ev = asin(clamp(dv.y, -1.0, 1.0));
    if(ev > -0.2094){ float uu = fract(atan(dv.x, -dv.z)*0.15915494 + uYaw); if(texture2D(uMask, vec2(uu, clamp((ev + 0.2094)/0.2094, 0.0, 1.0))).r < 0.5) discard; } }
  vec2 p = vW.xz;
  float rp = length(p); float Rs = shoreR(atan(p.x, -p.y));
  float nearShore = 1.0 - smoothstep(2.0, 20.0, Rs - rp);
  float nearDock = 1.0 - smoothstep(2.5, 7.0, length(vec2(p.x*0.8, p.y - 0.5)));
  float lane = exp(-p.x*p.x/70.0)*smoothstep(4.0, 12.0, -p.y)*(1.0 - smoothstep(40.0, 80.0, -p.y));
  float dens = fbm3(p*0.055 + vec2(7.3, 2.1)) + nearShore*0.26 + nearDock*0.12 - lane*0.3 - 0.22*smoothstep(0.55, 0.78, noise2(p*0.45 + 3.7));
  float px = length(fwidth(p));
  float fadeD = 1.0 - smoothstep(0.012, 0.03, px);
  float leaf = noise2(p*42.0)*0.6 + noise2(p*11.0)*0.4;
  float dw = smoothstep(0.6, 0.64, dens + (leaf - 0.5)*0.16*fadeD)*(1.0 - uSea);
  vec2 wd = normalize(uWind.xy + vec2(1e-4));
  float gust = smoothstep(0.35, 0.75, noise2(p*0.035 - uCloudOff*9.0)*0.7 + noise2(p*0.11 - uCloudOff*20.0)*0.3);
  float csh = 1.0 - 0.85*cloudSh(p);
  float ruff = mix(0.15, 1.0, smoothstep(0.35, 0.7, noise2(p*0.03 + vec2(uTime*0.015, -uTime*0.01))))*(0.35 + 0.65*uWind.z) + gust*uWind.z*1.4;
  float amp = uWave*ruff*(1.0 - 0.85*dw);
  vec2 g = vec2(0.0);
  g += wv(p, vec2(0.958, 0.287), 5.3, 0.010, dist);
  g += wv(p, vec2(0.6, -0.8), 3.1, 0.006, dist);
  g += wv(p, vec2(-0.316, 0.949), 1.9, 0.004, dist);
  g += wv(p, vec2(0.894, 0.447), 1.1, 0.0022, dist);
  g += wv(p, vec2(-0.857, 0.514), 0.63, 0.0012, dist);
  g += wv(p, vec2(0.196, -0.981), 0.37, 0.0007, dist);
  g += wv(p, wd, 0.8, 0.0035*uWind.z, dist) + wv(p, vec2(wd.x*0.9 - wd.y*0.42, wd.y*0.9 + wd.x*0.42), 0.5, 0.0022*uWind.z, dist);
  g *= amp;
  #ifndef SEAGRID
  g += uSea*(wv(p, vec2(0.8, 0.6), 18.0, 0.32, dist) + wv(p, vec2(0.3, -0.954), 11.0, 0.18, dist) + wv(p, vec2(-0.707, 0.707), 7.0, 0.1, dist))*(0.6 + 0.8*uWind.z);
  #endif
  vec2 gd = vec2(0.0); float na = 0.005; float nf = 1.4;
  vec2 drift = vec2(uTime*0.11, uTime*0.07);
  for(int i = 0; i < 4; i++){
    float fade = 1.0 - smoothstep(50.0*(1.0 + 2.0*uSea)/nf, 180.0*(1.0 + 2.0*uSea)/nf, dist);
    gd += noised(p*nf + drift).yz*nf*na*fade;
    nf *= 2.2; na *= 0.5; drift = vec2(-drift.y, drift.x)*1.3;
  }
  g += gd*amp;
  for(int i = 0; i < 12; i++){
    vec4 r = uRip[i];
    if(r.w > 0.001){
      vec2 dv = p - r.xy; float d = length(dv) + 0.001;
      float x = d - r.z*0.85;
      float env = exp(-x*x*4.0)*r.w*exp(-r.z*0.7)/(1.0 + r.z*1.6);
      g += (dv/d)*sin(x*15.0)*env*(1.0 - 0.6*dw);
    }
  }
  if(uRain > 0.01){
    float rf = uRain*(1.0 - smoothstep(8.0, 30.0, dist))*(1.0 - 0.8*dw)*(1.0 + uSea);
    for(int k = 0; k < 2; k++){
      float sc = k == 0 ? 2.2 : 3.4;
      vec2 q = p*sc + float(k)*7.31;
      vec2 ci = floor(q); vec2 cf = fract(q) - 0.5;
      float h = hash21(ci + float(k)*13.1);
      float ph = fract(uTime*(0.8 + h*0.7) + h*7.0);
      vec2 o = vec2(hash21(ci + 3.1), hash21(ci + 7.7)) - 0.5;
      vec2 dv = cf - o*0.4; float d = length(dv) + 1e-4;
      float x = d - ph*0.42;
      g += (dv/d)*sin(x*55.0)*exp(-x*x*700.0)*(1.0 - ph)*rf*1.4;
    }
  }
  #ifdef SEAGRID
  g += vec2(-vNs.x, -vNs.z)/max(vNs.y, 0.2);
  #endif
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float NdV = max(dot(N, V), 0.0);
  float F = 0.02 + 0.98*pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-V, N); R.y = max(R.y, 0.003); R = normalize(R);
  vec3 refl = envRay(vW, R, false, true);
  if(uReflOn > 0.5){
    vec4 rp = uReflMat*vec4(vW.x, 0.0, vW.z, 1.0);
    vec2 ruv = rp.xy/rp.w + N.xz*(0.03 + 0.05*uSea)*(1.0 - smoothstep(30.0, 160.0, dist)*0.6);
    vec4 rc = texture2D(uRefl, clamp(ruv, 0.002, 0.998));
    refl = mix(refl, TM(rc.rgb)*0.92, clamp(rc.a, 0.0, 1.0)*(1.0 - 0.35*uRain));
  }
  float sd = max(dot(R, uSunDir), 0.0);
  vec3 glint = uLightCol*(pow(sd, 1600.0)*28.0 + pow(sd, 160.0)*0.5)*uSunVis*csh;
  vec3 amb = mix(uHorizon, uZenith, 0.5);
  float ndl = max(uSunDir.y, 0.0);
  vec3 body = uDeep*(amb*0.7 + uLightCol*ndl*uSunVis*0.22*csh)
            + uScatter*(amb*0.25 + uLightCol*0.12*uSunVis)*(0.5 + 0.5*clamp(dot(N, normalize(uSunDir + vec3(0.0, 0.5, 0.0))), 0.0, 1.0));
  #ifdef SEAGRID
  body += uScatter*(amb*0.5 + uLightCol*0.3*uSunVis)*smoothstep(-0.2, 0.8, vH)*0.9;
  #endif
  vec3 bodyD = TM(body);
  if(uSea > 0.5){
    float lk = 0.22 + 0.78*uLightK;
    vec3 deepC = uSeaCol*lk*(0.72 + 0.56*clamp(dot(N, normalize(vec3(uSunDir.x, 0.6, uSunDir.z))), 0.0, 1.0));
    bodyD = deepC;
    if(uReef > 0.01){
      vec3 Vr = refract(-V, N, 0.75);
      float iy = 1.0/max(-Vr.y, 0.12);
      vec2 b0 = vW.xz + Vr.xz*4.5*iy;
      float rf_ = noise2(b0*0.08)*0.6 + noise2(b0*0.23 + 3.1)*0.4;
      float reefK = smoothstep(0.46, 0.56, rf_), grass = smoothstep(0.38, 0.46, rf_)*(1.0 - reefK);
      float Dd = 4.5 - 1.6*reefK, Lp = Dd*iy;
      vec2 bp = vW.xz + Vr.xz*Lp;
      float cs = causF(bp, uTime) + 0.6*causF(bp*1.7 + 9.0, uTime*1.2);
      vec3 rk = mix(vec3(0.10, 0.13, 0.11), vec3(0.04, 0.06, 0.06), noise2(bp*0.9));
      vec3 bed = mix(mix(vec3(0.92, 0.88, 0.72), vec3(0.45, 0.50, 0.35), grass*0.6), rk, reefK);
      bed *= lk*(0.6 + 0.75*cs*uLightK*(0.35 + 0.65*uSunVis)*(1.0 - 0.6*reefK)*(1.0 - smoothstep(6.0, 40.0, dist)));
      vec3 Tr = exp(-vec3(0.38, 0.075, 0.055)*(Lp + Dd));
      vec3 shal = bed*Tr + vec3(0.02, 0.30, 0.36)*lk*(1.0 - Tr);
      shal = mix(shal, vec3(dot(shal, vec3(0.3, 0.55, 0.15)))*vec3(0.85, 1.0, 1.0), 0.45*(1.0 - uSunVis));   // 陰天：淺水的藍綠色變得灰而柔和
      bodyD = mix(deepC, shal, uReef*(1.0 - smoothstep(20.0, 160.0, dist)));
    }
    #ifdef SEAGRID
    bodyD += vec3(0.04, 0.24, 0.26)*smoothstep(-0.1, 0.9, vH)*uLightK*(0.4 + 0.6*clamp(dot(N, normalize(vec3(uSunDir.x, 0.25, uSunDir.z))), 0.0, 1.0));
    // 浪頭白沫：風越大、浪越高越多；碎成一塊一塊、隨時間消散
    { float wcN = noise2(vW.xz*0.35 + vec2(uTime*0.05, uTime*0.03))*0.6 + noise2(vW.xz*1.3 - uTime*0.08)*0.4;
      float wc = smoothstep(0.62, 0.9, vH*0.75 + wcN*0.55)*clamp(uWind.z*1.4 - 0.25, 0.0, 1.0)*(1.0 - smoothstep(60.0, 260.0, dist));
      bodyD = mix(bodyD, vec3(0.82, 0.86, 0.88)*(0.35 + 0.65*uLightK), wc*0.75); }
    #endif
    refl *= vec3(0.74, 0.88, 1.0); F *= 0.82;
    bodyD *= mix(1.0, 0.1, uNight);
  }
  vec3 col = mix(bodyD, refl, F) + TM(glint*(0.25 + 0.75*F));
  if(uMoonK > 0.01){ float md = max(dot(R, uMoonDir), 0.0);
    col += vec3(0.78, 0.84, 1.0)*(pow(md, 700.0)*3.5 + pow(md, 40.0)*0.05)*uMoonK*(0.3 + 0.7*F); }
  if(uBio > 0.01){ float bn = noise2(p*4.2 + vec2(uTime*0.23, -uTime*0.19))*noise2(p*1.1 - uTime*0.05);
    float bs = smoothstep(0.55, 0.8, bn)*(0.5 + 0.5*sin(uTime*3.1 + p.x*5.7 + p.y*3.3));
    col += vec3(0.05, 0.42, 0.8)*bs*uBio*(1.0 - smoothstep(4.0, 50.0, dist))*0.7; }
  vec3 dwc = vec3(0.09, 0.19, 0.024)*(0.65 + 0.55*mix(0.5, leaf, fadeD))*(amb*0.75 + uLightCol*ndl*uSunVis*0.42*csh + 0.02);
  col = mix(col, TM(dwc), dw);
  float foamS = (1.0 - smoothstep(0.3, 2.5, Rs - rp))*(0.5 + 0.5*noise2(p*1.3 + uTime*0.05))*(1.0 - uSea);
  float cap = smoothstep(0.16, 0.3, length(g))*clamp((uWind.z - 0.45)*2.2, 0.0, 1.0)*(0.5 + 0.5*noise2(p*2.0 - uCloudOff*30.0));
  #ifdef SEAGRID
  cap += smoothstep(0.55, 0.95, vH)*clamp(uWind.z*1.5 - 0.2, 0.0, 1.0)*(0.4 + 0.6*noise2(p*1.7 - uCloudOff*25.0));
  #endif
  float foam = clamp(foamS*0.55 + cap*0.8, 0.0, 0.9)*(1.0 - dw);
  col = mix(col, TM((amb*0.9 + uLightCol*ndl*0.5*csh)*0.55), foam);
  float mist = uMist*0.4*smoothstep(12.0, 90.0, dist);
  vec3 fogC = uPhoto > 0.5 ? photoEnv(normalize(vec3(-V.x, 0.015, -V.z))) : fogColor(-V);
  col = mix(col, fogC, clamp((fogF(dist)*0.9 + mist)*(1.0 - 0.6*uSea), 0.0, 0.95));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}
`;
SH.ptsVS = `
attribute float aLife;
attribute float aSize;
uniform float uScale;
varying float vA;
void main(){ vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = max(1.0, aSize*uScale/max(-mv.z, 0.05)); gl_Position = projectionMatrix*mv; vA = aLife; }
`;
SH.ptsFS = `
uniform vec3 uCol;
varying float vA;
void main(){
  if(vA <= 0.0) discard;
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  float a = (1.0 - smoothstep(0.15, 0.5, d))*sqrt(vA)*0.85;
  if(a < 0.01) discard;
  gl_FragColor = vec4(uCol, a);
}
`;

function createWorld(opts){
'use strict';
const T = THREE, EYE_Y = 2.4, DEG = Math.PI/180;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
let seaMode=false;
function shoreR(az){ return seaMode?1400:shoreR0(az); }
function shoreR0(az){ const d=(az-0.12)/0.30; return 54+9*Math.sin(az*2.3+1.1)+6*Math.sin(az*5.1+0.3)+3*Math.sin(az*11.7+2.0)+45*Math.exp(-d*d); }

const renderer = new T.WebGLRenderer({canvas:opts.canvas, antialias:true, powerPreference:'high-performance'});
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(70, 1, 0.04, 2500);
const player = new T.Group(); player.position.set(0, EYE_Y, 0); scene.add(player);
const head = new T.Group(); head.rotation.x = -0.16; player.add(head); head.add(camera);

const V = () => new T.Vector3();
const U = { uTime:{value:0}, uSunDir:{value:new T.Vector3(0,1,0)}, uLightCol:{value:V()}, uSunDisk:{value:new T.Vector3(0,1,0)},
  uSunCol:{value:V()}, uMoonDir:{value:new T.Vector3(0,1,0)}, uMoonCol:{value:V()}, uZenith:{value:V()}, uHorizon:{value:V()},
  uGlow:{value:V()}, uFogCol:{value:V()}, uFogDen:{value:0.01}, uMist:{value:0.5}, uDay:{value:1}, uCloud:{value:0.45}, uOvcA:{value:null}, uOvcB:{value:null}, uOvcK:{value:0}, uSunVis:{value:1}, uEye:{value:new T.Vector3(0,2.4,0)}, uRain:{value:0}, uWind:{value:new T.Vector3(1,0,.15)}, uCloudOff:{value:new T.Vector2()}, uCShadow:{value:0}, uBandA:{value:null}, uBandB:{value:null}, uFullA:{value:null}, uFullB:{value:null}, uMask:{value:null}, uPMix:{value:0}, uPhoto:{value:0}, uYaw:{value:.25}, uExpo:{value:1}, uSea:{value:0}, uSeaCol:{value:new T.Vector3(.035,.25,.40)}, uReef:{value:0}, uNight:{value:0}, uNightDeep:{value:.1}, uMoonK:{value:0}, uBio:{value:0}, uLightK:{value:1} };

// 天空球（含樹林遠景）
const skyMat = new T.ShaderMaterial({uniforms:U, vertexShader:SH.skyVS, fragmentShader:SH.common+SH.skyFS, side:T.BackSide, depthWrite:false, depthTest:false});
const sky = new T.Mesh(new T.SphereGeometry(900, 48, 24), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false; sky.position.set(0, EYE_Y, 0); scene.add(sky);

// 水面：形狀貼合岸線的圓盤
const rip = []; for(let i=0;i<12;i++) rip.push(new T.Vector4(0,0,0,0));
const WU = Object.assign({}, U, { uRip:{value:rip}, uDeep:{value:new T.Vector3(0.010,0.019,0.011)}, uScatter:{value:new T.Vector3(0.018,0.045,0.026)}, uWave:{value:1.0} });
const waterMat = new T.ShaderMaterial({uniforms:WU, vertexShader:SH.waterVS, fragmentShader:SH.common+SH.waterFS, extensions:{derivatives:true}, depthWrite:false});
const SEG = 256, wpos = [0,0,0], widx = [];
for(let i=0;i<=SEG;i++){ const az=-Math.PI+2*Math.PI*i/SEG, R=1500; wpos.push(Math.sin(az)*R, 0, -Math.cos(az)*R); }
for(let i=1;i<=SEG;i++) widx.push(0, i+1, i);
const wgeo = new T.BufferGeometry(); wgeo.setAttribute('position', new T.Float32BufferAttribute(wpos,3)); wgeo.setIndex(widx);
const water = new T.Mesh(wgeo, waterMat); water.frustumCulled = false; scene.add(water);
const seaMat = new T.ShaderMaterial({uniforms:WU, vertexShader:SH.seaVS, fragmentShader:SH.common+SH.waterFS, defines:{SEAGRID:1}, extensions:{derivatives:true}, depthWrite:false});
const seaGrid = new T.Mesh(new T.PlaneGeometry(300,300,220,220).rotateX(-Math.PI/2), seaMat); seaGrid.visible=false; seaGrid.frustumCulled=false; scene.add(seaGrid);

// 光源
const sunLight = new T.DirectionalLight(0xffffff, 0.9); scene.add(sunLight); scene.add(sunLight.target);
const hemi = new T.HemisphereLight(0xffffff, 0x223322, 0.55); scene.add(hemi);

// 環境光照貼圖（由同一套天空/樹林產生）
const pmrem = new T.PMREMGenerator(renderer);
const envScene = new T.Scene();
envScene.add(new T.Mesh(new T.SphereGeometry(40,32,16), new T.ShaderMaterial({uniforms:U, vertexShader:SH.skyVS, fragmentShader:SH.common+SH.skyFS, side:T.BackSide, depthWrite:false, depthTest:false})));
let envRT = null, envHour = -99;
function regenEnv(){ const rt = pmrem.fromScene(envScene, 0, 0.1, 100); if(envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture; }

const lin = hex => { const c = new T.Color(hex).convertSRGBToLinear(); return new T.Vector3(c.r,c.g,c.b); };
const KEYS = [
 {h:0,    zen:'#03060d',hor:'#0e1622',glow:'#18243a',sun:'#ffb070',si:0,  fog:'#0b121a',fd:0.0072, mist:0.33,day:0,  exp:1.3, cl:.35},
 {h:4.8,  zen:'#060b17',hor:'#1a2230',glow:'#2a3248',sun:'#ff9a60',si:0,  fog:'#151d27',fd:0.0072, mist:0.42, day:.03,exp:1.3, cl:.35},
 {h:6.0,  zen:'#2c4064',hor:'#c89a86',glow:'#ffa868',sun:'#ffaa70',si:1.4,fog:'#6e6a5e',fd:0.0084, mist:0.60,day:.45,exp:1.05,cl:.4},
 {h:7.6,  zen:'#45699a',hor:'#b2bcac',glow:'#ffd6a0',sun:'#ffdcb4',si:2.6,fog:'#7d8a76',fd:0.0066, mist:0.48, day:.85,exp:.95, cl:.45},
 {h:11.5, zen:'#3a69a6',hor:'#b4c4c8',glow:'#fff2dc',sun:'#fff3e4',si:3.1,fog:'#86968a',fd:0.0042, mist:0.18, day:1,  exp:.9,  cl:.5},
 {h:15.5, zen:'#3f6aa2',hor:'#bcc6c0',glow:'#ffe8c8',sun:'#ffeedc',si:3.0,fog:'#8a9482',fd:0.0045,mist:0.18, day:1,  exp:.9,  cl:.5},
 {h:17.6, zen:'#3a5788',hor:'#e6bc8c',glow:'#ffb060',sun:'#ffc48a',si:2.6,fog:'#9a8a6e',fd:0.0057,mist:0.27,day:.9, exp:.95, cl:.45},
 {h:18.5, zen:'#2a3c68',hor:'#e8925a',glow:'#ff7830',sun:'#ff9450',si:1.6,fog:'#8e6c54',fd:0.0066, mist:0.36, day:.55,exp:1.05,cl:.45},
 {h:19.3, zen:'#121a34',hor:'#5a4250',glow:'#7a3a32',sun:'#ff7040',si:.3, fog:'#2e2836',fd:0.0072, mist:0.36, day:.18,exp:1.2, cl:.4},
 {h:20.6, zen:'#04080f',hor:'#111a26',glow:'#1c283e',sun:'#ff7040',si:0,  fog:'#0d141c',fd:0.0072, mist:0.33,day:.02,exp:1.3, cl:.35},
 {h:24,   zen:'#03060d',hor:'#0e1622',glow:'#18243a',sun:'#ffb070',si:0,  fog:'#0b121a',fd:0.0072, mist:0.33,day:0,  exp:1.3, cl:.35},
].map(k=>({h:k.h, zen:lin(k.zen), hor:lin(k.hor), glow:lin(k.glow), sun:lin(k.sun), si:k.si, fog:lin(k.fog), fd:k.fd, mist:k.mist, day:k.day, exp:k.exp, cl:k.cl}));
const MOON = lin('#a9bde6');
const dirFrom = (el, az) => new T.Vector3(Math.sin(az)*Math.cos(el), Math.sin(el), -Math.cos(az)*Math.cos(el));
const moonDir = dirFrom(32*DEG, -0.45);
const tv = V();
const info = {day:1, light:1};

const wx={cloud:0,rain:0,fog:0}; let wxDirty=false, wxLast=0;
function setWeather(c,r,fo){ wx.cloud=c; wx.rain=r; wx.fog=fo; const s=c+r*.6+fo*.6; if(Math.abs(s-wxLast)>.12){ wxDirty=true; wxLast=s; } }
function setTime(hour, force){
  const h = ((hour%24)+24)%24;
  let i = 0; while(i < KEYS.length-2 && KEYS[i+1].h <= h) i++;
  const a = KEYS[i], b = KEYS[i+1], f = sstep(0, 1, (h-a.h)/(b.h-a.h));
  U.uZenith.value.copy(a.zen).lerp(b.zen, f);
  U.uHorizon.value.copy(a.hor).lerp(b.hor, f);
  U.uGlow.value.copy(a.glow).lerp(b.glow, f);
  U.uFogCol.value.copy(a.fog).lerp(b.fog, f);
  U.uFogDen.value = lerp(a.fd, b.fd, f);
  U.uMist.value = lerp(a.mist, b.mist, f);
  U.uDay.value = lerp(a.day, b.day, f);
  U.uCloud.value = lerp(a.cl, b.cl, f);
  { const cK=wx.cloud, rK=wx.rain, fK=wx.fog; U.uCloud.value=Math.max(U.uCloud.value,cK*.98); U.uRain.value=rK;
    for(const v of [U.uZenith.value,U.uHorizon.value,U.uFogCol.value]){ const g=(v.x+v.y+v.z)/3; v.lerp(tv.set(g,g,g*1.03),cK*.75).multiplyScalar(1-.36*cK-.25*rK); }
    U.uGlow.value.multiplyScalar(1-.8*cK); U.uFogDen.value*=1+fK*4+rK*1.6; U.uMist.value=Math.min(1.4,U.uMist.value+fK*.9+rK*.45); U.uCShadow.value=cK*(1-cK)*3.2*Math.min(1,U.uDay.value*2); }
  const si = lerp(a.si, b.si, f);
  const sunCol = tv.copy(a.sun).lerp(b.sun, f).clone();
  const el = 62*DEG*Math.sin(Math.PI*(h-6)/12.4);
  const az = -1.2 + 1.4*clamp((h-6)/12.4, -0.3, 1.3);
  const sd = dirFrom(el, az);
  U.uSunDisk.value.copy(sd);
  const sinEl = Math.sin(el);
  const eTop = Math.atan((12.5-EYE_Y)/shoreR(az));
  const vis = sstep(eTop-0.025, eTop+0.03, el);
  const wS = si*sstep(-0.03, 0.04, sinEl);
  const direct = wS*(0.12+0.88*vis)*(1-0.85*wx.cloud);
  const night = 1 - sstep(-0.14, 0.0, sinEl);
  const wM = 0.42*night;
  U.uSunCol.value.copy(sunCol).multiplyScalar(wS*(1-wx.cloud*.95));
  U.uLightCol.value.copy(sunCol).multiplyScalar(direct).addScaledVector(MOON, wM);
  const ld = sd.clone().multiplyScalar(direct+1e-4).addScaledVector(moonDir, wM).normalize();
  U.uSunDir.value.copy(ld);
  U.uMoonDir.value.copy(moonDir);
  U.uMoonCol.value.copy(MOON).multiplyScalar(night*0.9);
  U.uSunVis.value = (direct*vis + wM)/(direct + wM + 1e-4);
  renderer.toneMappingExposure = lerp(a.exp, b.exp, f)*(1+.1*wx.cloud);
  const lc = U.uLightCol.value;
  sunLight.color.setRGB(lc.x, lc.y, lc.z); sunLight.intensity = 0.85;
  sunLight.position.copy(ld).multiplyScalar(60);
  const z = U.uZenith.value, hz = U.uHorizon.value;
  hemi.color.setRGB((z.x+hz.x)*0.6, (z.y+hz.y)*0.6, (z.z+hz.z)*0.6);
  hemi.groundColor.setRGB(0.012, 0.022, 0.014);
  info.day = U.uDay.value; info.light = Math.min(1.2, 0.08 + (lc.x+lc.y+lc.z)/3*0.35 + (hz.x+hz.y+hz.z)/3*0.5);
  if(photoHook){ const o=photoHook(h,wx); if(o){
    U.uSunDir.value.copy(o.dir); U.uSunDisk.value.copy(o.dir); U.uLightCol.value.set(o.lc[0],o.lc[1],o.lc[2]); U.uSunVis.value=1-wx.cloud*.85;
    renderer.toneMappingExposure=o.exp; U.uExpo.value=o.exp; sunLight.color.setRGB(o.lc[0],o.lc[1],o.lc[2]); sunLight.intensity=.35*(1-wx.cloud*.8);
    sunLight.position.copy(o.dir).multiplyScalar(60); hemi.intensity=0; info.light=o.light; return info; } }
  let dh = Math.abs(h - envHour); if(dh > 12) dh = 24 - dh;
  if(force || dh > 0.35 || wxDirty){ wxDirty = false; envHour = h; regenEnv(); }
  return info;
}

const ripS = []; for(let i=0;i<12;i++) ripS.push({x:0,z:0,age:9,amp:0}); let ripI = 0;
function addRipple(x, z, amp){ const r = ripS[ripI]; ripI = (ripI+1)%12; r.x=x; r.z=z; r.age=0; r.amp=amp; }
function seaH(x,z,t){ const w=U.uWind.value, L=Math.hypot(w.x,w.y)||1, dx=w.x/L, dz=w.y/L, s=.45+1.1*w.z;
  const D=[[dx,dz],[dx*.77-dz*.64,dz*.77+dx*.64],[dx*.77+dz*.64,dz*.77-dx*.64],[dx*.34-dz*.94,dz*.34+dx*.94],[.6,.8],[-.8,.6]], LL=[38,23,15,9,5.5,3.2], A=[.42,.28,.18,.11,.06,.035];
  let h=0; for(let i=0;i<6;i++){ const k=6.2831853/LL[i]; h+=A[i]*s*Math.sin(k*(D[i][0]*x+D[i][1]*z)-Math.sqrt(9.81*k)*t); } return h; }
function swell(x, z, t){ if(seaMode) return seaH(x,z,t); return 0.006*Math.sin(t*1.9+x*0.7) + 0.004*Math.sin(t*2.6+z*0.9+1.3); }
function update(dt, t){
  U.uTime.value = t; camera.getWorldPosition(U.uEye.value); U.uLightK.value = Math.min(1, Math.max(0, info.light));
  if(seaGrid.visible) seaGrid.position.set(Math.round(U.uEye.value.x/1.5)*1.5, 0, Math.round(U.uEye.value.z/1.5)*1.5);
  { const w=U.uWind.value, k=(.002+.01*w.z)*dt; U.uCloudOff.value.x+=w.x*k; U.uCloudOff.value.y+=w.y*k; }
  for(let i=0;i<12;i++){ const r = ripS[i]; r.age += dt; rip[i].set(r.x, r.z, r.age, r.age < 5 ? r.amp : 0); }
}

let pr = Math.min(window.devicePixelRatio || 1, 2), lw = 1, lh = 1;
function resize(w, h){ lw = w; lh = h; camera.aspect = w/h; camera.fov = w < h ? 70 : 52; camera.updateProjectionMatrix(); renderer.setPixelRatio(pr); renderer.setSize(w, h); }
function setPR(v){ pr = v; renderer.setPixelRatio(pr); renderer.setSize(lw, lh); }
/* 水面倒影：鏡像相機只拍物體（不含天空、水面），水面依波紋扭曲取樣 */
const reflRT=new T.WebGLRenderTarget(4,4,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,depthBuffer:true});
const reflCam=new T.PerspectiveCamera(), reflTM=new T.Matrix4();
WU.uRefl={value:reflRT.texture}; WU.uReflMat={value:reflTM}; WU.uReflOn={value:0};
const _rp=new T.Vector3(), _cp=new T.Vector3(), _rm=new T.Matrix4(), _la=new T.Vector3(), _tg=new T.Vector3(), _n=new T.Vector3(0,1,0), _vw=new T.Vector3();
const _pl=new T.Plane(), _cpl=new T.Vector4(), _q=new T.Vector4(), _sz=new T.Vector2(); let reflScale=.35, reflEnabled=true, reflHide=[];
function setRefl(on,scale){ reflEnabled=on; if(scale) reflScale=scale; WU.uReflOn.value=0; }
function renderRefl(){
  camera.updateMatrixWorld(); _cp.setFromMatrixPosition(camera.matrixWorld);
  if(_cp.y<.05){ WU.uReflOn.value=0; return; }
  renderer.getDrawingBufferSize(_sz); const w=Math.max(64,Math.round(_sz.x*reflScale)), h=Math.max(64,Math.round(_sz.y*reflScale));
  if(reflRT.width!==w||reflRT.height!==h) reflRT.setSize(w,h);
  _rp.set(_cp.x,0,_cp.z); _vw.subVectors(_rp,_cp).reflect(_n).negate().add(_rp);
  _rm.extractRotation(camera.matrixWorld); _la.set(0,0,-1).applyMatrix4(_rm).add(_cp);
  _tg.subVectors(_rp,_la).reflect(_n).negate().add(_rp);
  reflCam.position.copy(_vw); reflCam.up.set(0,1,0).applyMatrix4(_rm).reflect(_n); reflCam.lookAt(_tg);
  reflCam.far=camera.far; reflCam.near=camera.near; reflCam.updateMatrixWorld(); reflCam.projectionMatrix.copy(camera.projectionMatrix);
  reflTM.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1).multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
  _pl.setFromNormalAndCoplanarPoint(_n,_rp).applyMatrix4(reflCam.matrixWorldInverse);
  _cpl.set(_pl.normal.x,_pl.normal.y,_pl.normal.z,_pl.constant);
  const pm=reflCam.projectionMatrix;
  _q.x=(Math.sign(_cpl.x)+pm.elements[8])/pm.elements[0]; _q.y=(Math.sign(_cpl.y)+pm.elements[9])/pm.elements[5]; _q.z=-1; _q.w=(1+pm.elements[10])/pm.elements[14];
  _cpl.multiplyScalar(2/_cpl.dot(_q)); pm.elements[2]=_cpl.x; pm.elements[6]=_cpl.y; pm.elements[10]=_cpl.z+1-.003; pm.elements[14]=_cpl.w;
  const hid=[water,seaGrid,sky,...reflHide].filter(o=>o&&o.visible); hid.forEach(o=>o.visible=false);
  const oc=renderer.getClearColor(new T.Color()), oa=renderer.getClearAlpha(), ort=renderer.getRenderTarget(), bg=scene.background, sh=renderer.shadowMap.autoUpdate;
  scene.background=null; renderer.shadowMap.autoUpdate=false;
  renderer.setRenderTarget(reflRT); renderer.setClearColor(0x000000,0); renderer.clear(); renderer.render(scene,reflCam);
  renderer.setRenderTarget(ort); renderer.setClearColor(oc,oa); scene.background=bg; renderer.shadowMap.autoUpdate=sh;
  hid.forEach(o=>o.visible=true); WU.uReflOn.value=1; }
function render(){ if(reflEnabled){ try{ renderRefl(); }catch(e){ reflEnabled=false; WU.uReflOn.value=0; console.warn('refl off',e); } } renderer.render(scene, camera); }

function setIce(on){ water.visible=!on; if(on) seaGrid.visible=false; }
function setSea(on){ seaMode=on; U.uSea.value=on?1:0; seaGrid.visible=on; if(on){ WU.uDeep.value.set(.006,.03,.06); WU.uScatter.value.set(.02,.10,.12); } else { WU.uDeep.value.set(.010,.019,.011); WU.uScatter.value.set(.018,.045,.026); } }
let photoHook=null;
function setPhotoHook(f){ photoHook=f; }
function setPhotoActive(){ U.uPhoto.value=1; skyMat.toneMapped=false; skyMat.needsUpdate=true; waterMat.toneMapped=false; waterMat.needsUpdate=true; seaMat.toneMapped=false; seaMat.needsUpdate=true; }
function setWind(x,z,s){ U.uWind.value.set(x,z,s); }
// 水色：每個水域的水本身顏色不同（浮萍灣藻綠、倒木區單寧茶色、深水中央墨綠藍…），換釣點時慢慢轉過去
const WT={d:new T.Vector3(.010,.019,.011),s:new T.Vector3(.018,.045,.026)};
function setWaterTint(d,s){ WT.d.set(d[0],d[1],d[2]); WT.s.set(s[0],s[1],s[2]); }
function tintTick(dt){ const k=Math.min(1,dt*.6); WU.uDeep.value.lerp(WT.d,k); WU.uScatter.value.lerp(WT.s,k); }
return { setWaterTint, tintTick, setIce, setRefl, reflHide:o=>reflHide.push(o), setSea, isSea:()=>seaMode, setPhotoHook, setPhotoActive, setWind, setWeather, renderer, scene, camera, player, head, U, EYE_Y, shoreR, setTime, update, addRipple, swell, resize, setPR, getPR:()=>pr, render, info };
}
