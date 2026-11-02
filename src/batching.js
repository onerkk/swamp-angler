/* 合併繪製：同一種材質的小零件（睡蓮花瓣、水黽的腳）合成一個網格，岸邊植物改用實例化；外觀、數量不變，只是 GPU 一次畫完。
   手機上「繪製次數」比三角形更容易成為瓶頸，每次繪製都有固定的 CPU 與驅動成本。 */
function mergeMeshesByMaterial(T,meshes,relativeTo){
 const inv=new T.Matrix4();if(relativeTo){relativeTo.updateWorldMatrix(true,false);inv.copy(relativeTo.matrixWorld).invert();}
 const groups=new Map();
 for(const m of meshes){if(!m||!m.isMesh||Array.isArray(m.material)||m.isSkinnedMesh||m.isInstancedMesh)continue;m.updateWorldMatrix(true,false);if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(m);}
 const out=[];
 for(const [mat,list]of groups){
  const hasUV=list.every(m=>m.geometry.attributes.uv),hasN=list.every(m=>m.geometry.attributes.normal),hasC=list.every(m=>m.geometry.attributes.color);let vc=0,ic=0;
  for(const m of list){const g=m.geometry;vc+=g.attributes.position.count;ic+=g.index?g.index.count:g.attributes.position.count;}
  const pos=new Float32Array(vc*3),nor=hasN?new Float32Array(vc*3):null,uv=hasUV?new Float32Array(vc*2):null,colr=hasC?new Float32Array(vc*3):null,idx=vc>65535?new Uint32Array(ic):new Uint16Array(ic);
  const mtx=new T.Matrix4(),nm=new T.Matrix3(),v=new T.Vector3();let vo=0,io=0;
  for(const m of list){const g=m.geometry,p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,cA=g.attributes.color;mtx.multiplyMatrices(inv,m.matrixWorld);nm.getNormalMatrix(mtx);
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mtx);pos.set([v.x,v.y,v.z],(vo+i)*3);if(nor){v.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();nor.set([v.x,v.y,v.z],(vo+i)*3);}if(uv)uv.set([u.getX(i),u.getY(i)],(vo+i)*2);if(colr)colr.set([cA.getX(i),cA.getY(i),cA.getZ(i)],(vo+i)*3);}
   if(g.index)for(let i=0;i<g.index.count;i++)idx[io+i]=g.index.getX(i)+vo;else for(let i=0;i<p.count;i++)idx[io+i]=vo+i;
   io+=g.index?g.index.count:p.count;vo+=p.count;}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));if(nor)geo.setAttribute('normal',new T.BufferAttribute(nor,3));if(uv)geo.setAttribute('uv',new T.BufferAttribute(uv,2));if(colr)geo.setAttribute('color',new T.BufferAttribute(colr,3));geo.setIndex(new T.BufferAttribute(idx,1));geo.computeBoundingSphere();geo.computeBoundingBox();
  const merged=new T.Mesh(geo,mat);merged.castShadow=list.some(m=>m.castShadow);merged.receiveShadow=list.some(m=>m.receiveShadow);merged.renderOrder=list[0].renderOrder;out.push(merged);
 }
 return out;
}
/* 把同一個模型的多份複本（每份可有不同位置、旋轉、大小）改成實例化：每個子網格一個 InstancedMesh */
function instanceCopies(T,template,matrices){
 template.updateWorldMatrix(true,true);const inv=new T.Matrix4().copy(template.matrixWorld).invert(),out=[],local=new T.Matrix4(),m4=new T.Matrix4();
 template.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh)return;local.multiplyMatrices(inv,o.matrixWorld);
  const im=new T.InstancedMesh(o.geometry,o.material,matrices.length);matrices.forEach((mx,i)=>{m4.multiplyMatrices(mx,local);im.setMatrixAt(i,m4);});im.instanceMatrix.needsUpdate=true;
  // 實例分散在岸邊，基底幾何的包圍球不能代表全部實例，所以不做視錐剔除
  im.frustumCulled=false;im.castShadow=o.castShadow;im.receiveShadow=o.receiveShadow;im.renderOrder=o.renderOrder;out.push(im);});
 return out;
}
if(typeof module!=='undefined'&&module.exports)module.exports={mergeMeshesByMaterial,instanceCopies};
