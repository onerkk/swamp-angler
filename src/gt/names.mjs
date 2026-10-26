import {NodeIO} from '@gltf-transform/core'; import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
for(const f of process.argv.slice(2)){ const d=await io.read(f); console.log(f.split('/').pop(), d.getRoot().listMeshes().map(m=>m.getName()+'['+m.listPrimitives().map(p=>p.getMaterial()&&p.getMaterial().getName()).join(',')+']').join(' | ')); }
