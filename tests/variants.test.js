const test=require('node:test'), assert=require('node:assert'), fs=require('fs');
function load(){ const w={__SAVE:{}}; const f=new Function('window','setInterval',fs.readFileSync(__dirname+'/../src/variants.js','utf8')); f(w,()=>0); return w; }
const sp={id:'carp'};
test('一般魚才會變異；物品、練習、特殊魚不會',()=>{ const V=load().__VAR;
  assert.equal(V.roll({sp,item:{},value:10},0),null); assert.equal(V.roll({sp,practice:true,value:10},0),null); assert.equal(V.roll({sp:{id:'m',special:'mermaid'},value:10},0),null);
  const fd={sp,value:100}; assert.equal(V.roll(fd,0).id,'albino'); assert.equal(fd.vr,'albino'); assert.equal(fd.value,400); });
test('機率落點：白化→黑化→黃金→一般',()=>{ const V=load().__VAR;
  assert.equal(V.roll({sp,value:1},1/45+.001).id,'melan'); assert.equal(V.roll({sp,value:1},2/45+.001).id,'gold'); assert.equal(V.roll({sp,value:1},.2),null); });
test('保底：連續沒出機率提高，出了歸零；圖鑑格數與三色齊全',()=>{ const w=load(), V=w.__VAR, S=w.__SAVE;
  for(let i=0;i<70;i++) V.record({sp,value:1}); assert.equal(S.varPity,70);
  assert.equal(V.roll({sp,value:1},.06).id,'albino');   /* 平常 .06 不會中，保底後會 */
  for(const id of ['albino','melan','gold']){ const r=V.record({sp,vr:id,value:1}); assert.equal(r.first,true); }
  assert.equal(S.varPity,0); assert.equal(V.count(),3); assert.equal(V.fullSets(),1); assert.equal(V.countOf('gold'),1);
  assert.equal(V.record({sp,vr:'gold',value:1}).first,false); assert.equal(S.vars.carp.gold,2); });
