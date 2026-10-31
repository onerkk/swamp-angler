/* Material assignments follow the yacht asset's named parts, not average pixel color. */
const MARINE_PARTS={
 material_3:'teak',material_5:'navy',material_40:'navy',material_1:'gelcoat',material_33:'gelcoat',material_42:'steel',material_7:'steel',material_2:'steel',material_4:'steel',material_35:'steel',material_17:'fabric',material_8:'leather'
};
function marinePart(name){return MARINE_PARTS[name]||'original';}
function createMarineMaterials(T){
 const tl=new T.TextureLoader(),texture=(f,color)=>{const t=tl.load(f);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(color)t.encoding=T.sRGBEncoding;return t;};
 const microCanvas=document.createElement('canvas');microCanvas.width=microCanvas.height=128;const g=microCanvas.getContext('2d');
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const v=128+9*Math.sin(x*1.71+y*2.13)+5*Math.cos(x*4.13-y*3.79);g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x,y,1,1);}
 const micro=new T.CanvasTexture(microCanvas);micro.wrapS=micro.wrapT=T.RepeatWrapping;micro.repeat.set(9,9);
 const teak=new T.MeshStandardMaterial({color:new T.Color('#bda47d').convertSRGBToLinear(),map:texture('dock_diff.jpg',true),normalMap:texture('dock_nor.jpg'),roughnessMap:texture('dock_rough.jpg'),normalScale:new T.Vector2(.55,.55),roughness:.87,envMapIntensity:.5});teak.name='Marine teak with caulk';
 teak.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float boardU=fract(vUv.x/.13);
   float caulk=1.0-smoothstep(.0012,.0038,min(boardU,1.0-boardU)*.13);
   float endJoint=1.0-smoothstep(.001,.003,min(fract((vUv.y+floor(vUv.x/.13)*.47)/2.1),1.0-fract((vUv.y+floor(vUv.x/.13)*.47)/2.1))*2.1);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.012,.015,.014),max(caulk,endJoint)*.86);`);};teak.customProgramCacheKey=()=> 'marine-teak-caulk-v1';
 const color=h=>new T.Color(h).convertSRGBToLinear();
 const gelcoat=new T.MeshPhysicalMaterial({color:color('#e7e6df'),roughness:.28,metalness:0,clearcoat:1,clearcoatRoughness:.15,bumpMap:micro,bumpScale:.0004});gelcoat.name='Marine fiberglass gelcoat';
 const navy=new T.MeshPhysicalMaterial({color:color('#203d50'),roughness:.25,metalness:0,clearcoat:1,clearcoatRoughness:.12,bumpMap:micro,bumpScale:.00035});navy.name='Marine navy enamel';
 const steel=new T.MeshStandardMaterial({color:color('#bfc7ca'),metalness:1,roughness:.23,bumpMap:micro,bumpScale:.00006});steel.name='Marine brushed stainless steel';
 const fabric=new T.MeshStandardMaterial({color:color('#bdb9ae'),roughness:.92,bumpMap:micro,bumpScale:.0012});
 const leather=new T.MeshStandardMaterial({color:color('#4e3224'),roughness:.64,bumpMap:micro,bumpScale:.0006});
 return{teak,gelcoat,navy,steel,fabric,leather};
}
function dressYacht(T,object,materials){
 object.updateWorldMatrix(true,true);const inverse=new T.Matrix4().copy(object.parent.matrixWorld).invert(),v=new T.Vector3();
 object.traverse(m=>{if(!m.isMesh)return;
  const source=Array.isArray(m.material)?m.material:[m.material],parts=source.map(mt=>marinePart(mt.name));
  if(parts.every(p=>p==='teak')){
   m.geometry=m.geometry.clone();const positions=m.geometry.attributes.position,uv=new Float32Array(positions.count*2),transform=new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld);
   for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(transform);uv[i*2]=v.x;uv[i*2+1]=v.z;}m.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  }
  const selected=source.map((mt,i)=>{const out=materials[parts[i]]||mt;return out;});m.material=Array.isArray(m.material)?selected:selected[0];m.castShadow=true;m.receiveShadow=true;
 });
}
function addMarineHardware(T,wrap,deck,materials){
 // Dimensions and fittings are in metres, measured after the hull is normalized.
 const fittings=new T.Group();fittings.name='Marine deck fittings';wrap.add(fittings);
 function screw(x,y,z){const head=new T.Mesh(new T.CylinderGeometry(.009,.009,.003,12),materials.steel);head.position.set(x,y,z);fittings.add(head);const slot=new T.Mesh(new T.BoxGeometry(.011,.0015,.002),new T.MeshStandardMaterial({color:0x262b2e,roughness:.6}));slot.position.set(x,y+.002,z);fittings.add(slot);}
 const rc=new T.Raycaster(),down=new T.Vector3(0,-1,0);
 for(const [x,z]of[[-.7,-3.0],[.7,-3.0]]){
  wrap.updateMatrixWorld(true);rc.set(new T.Vector3(x,deck+3,z),down);const hit=rc.intersectObject(wrap,true)[0],y=hit?hit.point.y:deck;
  const frame=new T.Mesh(new T.BoxGeometry(.24,.007,.19),materials.steel);frame.position.set(x,y+.006,z);fittings.add(frame);
  const grill=new T.Mesh(new T.BoxGeometry(.20,.007,.15),new T.MeshStandardMaterial({color:0x20272a,roughness:.8}));grill.position.set(x,y+.01,z);fittings.add(grill);
  for(let n=0;n<7;n++){const rib=new T.Mesh(new T.BoxGeometry(.18,.004,.007),materials.steel);rib.position.set(x,y+.016,z-.065+n*.0215);fittings.add(rib);}
  for(const sx of[-1,1])for(const sz of[-1,1])screw(x+sx*.106,y+.013,z+sz*.08);
 }
 // Add flush latch and hinges only when the source hatch is actually under this point.
 wrap.updateMatrixWorld(true);rc.set(new T.Vector3(0,deck+3,-1.6),down);const hatch=rc.intersectObject(wrap,true).find(h=>h.object.material===materials.gelcoat);
 if(hatch){const y=hatch.point.y,z=hatch.point.z,base=new T.Mesh(new T.BoxGeometry(.15,.004,.095),materials.steel);base.position.set(0,y+.003,z);fittings.add(base);
  const recess=new T.Mesh(new T.BoxGeometry(.116,.005,.065),new T.MeshStandardMaterial({color:0x172226,roughness:.8}));recess.position.set(0,y+.006,z);fittings.add(recess);
  const pull=new T.Mesh(new T.TorusGeometry(.025,.003,8,32),materials.steel);pull.rotation.x=-Math.PI/2;pull.position.set(0,y+.01,z);fittings.add(pull);
  for(const x of[-.36,.36]){rc.set(new T.Vector3(x,deck+3,z-.29),down);const h=rc.intersectObject(wrap,true).find(h=>h.object.material===materials.gelcoat);if(!h)continue;const hinge=new T.Mesh(new T.BoxGeometry(.1,.013,.055),materials.steel);hinge.position.set(x,h.point.y+.008,z-.29);fittings.add(hinge);screw(x-.033,h.point.y+.018,z-.29);screw(x+.033,h.point.y+.018,z-.29);}
 }
 fittings.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return fittings;
}
if(typeof module!=='undefined'&&module.exports)module.exports={MARINE_PARTS,marinePart,dressYacht};
