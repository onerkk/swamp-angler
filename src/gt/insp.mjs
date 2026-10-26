import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds} from '@gltf-transform/core';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
for(const f of process.argv.slice(2)){
  try{ const doc=await io.read(f), r=doc.getRoot(), sc=r.listScenes()[0], b=getBounds(sc);
  const sz=b.max.map((v,i)=>(v-b.min[i]).toFixed(2));
  const tx=r.listTextures().map(t=>{const s=t.getSize();return s?s[0]:'?';});
  const an=r.listAnimations().map(a=>a.getName().slice(0,18));
  let tri=0; for(const m of r.listMeshes()) for(const p of m.listPrimitives()){ const i=p.getIndices(); tri+=(i?i.getCount():p.getAttribute('POSITION').getCount())/3; }
  console.log(f.split('/').pop().padEnd(16),'size',sz.join('x'),'| tri',Math.round(tri),'| skins',r.listSkins().length,'| mats',r.listMaterials().length,'| tex',tx.join(','),'| anim',JSON.stringify(an));
  }catch(e){ console.log(f,'ERR',e.message); }
}
