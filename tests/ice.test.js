const {test}=require('node:test'),assert=require('node:assert/strict'),{iceFixture}=require('./ice-fixture.cjs');
test('drilled ice rim shares the sheet textures, world UV mapping and lighting',()=>{
 const {sheet,rim,shader,ice,base}=iceFixture();
 for(const key of ['map','normalMap','roughnessMap'])assert.equal(rim.material[key],sheet.material[key]);
 const ground=shader(sheet.material),edge=shader(rim.material);
 assert.equal(ground.vertexShader,edge.vertexShader);assert(ground.vertexShader.includes('vIceWorld.x,-vIceWorld.z'));
 assert.equal(ground.uniforms.iceMap.value,edge.uniforms.iceMap.value);assert.equal(ground.uniforms.iceNor.value,edge.uniforms.iceNor.value);
 base.set(23,0,-41);ice.update(.016);assert.equal(sheet.material.map.offset.length(),0);
 assert(sheet.receiveShadow&&rim.receiveShadow);assert.notEqual(sheet.material.customProgramCacheKey(),rim.material.customProgramCacheKey());
});
test('drilling opens only the sheet and closes the old hole after movement or leaving ice',()=>{
 const {ice,state,base,sheet,rim,shader,hole}=iceFixture(),ground=shader(sheet.material),edge=shader(rim.material),cut=ground.uniforms.iceHole;
 assert.equal(cut.value.z,0);assert(ground.fragmentShader.includes('discard;'));assert(!edge.fragmentShader.includes('distance(vIceWorld.xz,iceHole.xy)<iceHole.z'));
 ice.drill(2);assert.equal(cut.value.z,.17);assert(hole.visible);assert.equal(cut.value.y,ice.holePos().z);
 base.x=8;ice.update(.016);assert.equal(cut.value.z,0);assert(!hole.visible);
 ice.drill(2);state.loc='lake';ice.update(.016);assert.equal(cut.value.z,0);
});
test('chipped edge is narrow and tapers into the surrounding sheet without a white torus',()=>{
 const {rim,hole}=iceFixture(),p=rim.geometry.attributes.position;let outer=0;
 for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getZ(i));assert(r<=.285001);if(r>.284){outer++;assert(Math.abs(p.getY(i)-.0015)<1e-6);}assert(p.getY(i)<.016);}
 assert(outer>60);assert(!hole.children.some(m=>m.geometry?.type==='TorusGeometry'));
 const wall=hole.children.find(m=>m.geometry?.type==='CylinderGeometry'),water=hole.children.find(m=>m.geometry?.type==='CircleGeometry');
 assert(wall.geometry.parameters.height>=.35);assert(water.position.y<0);assert.equal(hole.children.filter(m=>m.geometry?.type==='IcosahedronGeometry').length,11);
});
