const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hookTiming,hookResult}=require('../src/i.js');
const {gameplayElapsed,stepFishingPhysics}=require('../src/frame-timing.js');

test('each bite has a too-early phase, then perfect, then good, then miss',()=>{
  for(const rarity of [0,2,5]){
    for(const win of [.5,.74,1.25]){
      for(const fw of [.6,1,1.4]){
        const timing=hookTiming({sp:{rar:rarity,f:{win:fw}}},{win},false,.5), d=timing.duration;
        assert(timing.early>0&&timing.early<.45);
        assert.equal(hookResult(0,timing),'early');
        assert.equal(hookResult(d*(timing.early+timing.perfect/2),timing),'perfect');
        assert.equal(hookResult(d*(timing.early+timing.perfect+.01),timing),'good');
        assert.equal(hookResult(d,timing),'miss');
      }
    }
  }
});

test('rarer and warier fish are harder to hook than common ones',()=>{
  const D={win:.74}, easyFish=hookTiming({sp:{rar:0,f:{win:1.3}}},D,false,.5), hardFish=hookTiming({sp:{rar:5,f:{win:.6}}},D,false,.5);
  assert(hardFish.early>easyFish.early*2,'rare/wary fish mouth the bait longer');
  assert(hardFish.perfect<easyFish.perfect,'rare fish have a narrower perfect window');
  assert(hardFish.duration*hardFish.perfect<easyFish.duration*easyFish.perfect,'perfect window is shorter in seconds');
});

test('practice bites have no too-early phase',()=>{
  const t=hookTiming({sp:{rar:3,f:{win:.6}}},{win:.74},true);
  assert.equal(t.early,0); assert.equal(hookResult(0,t),'perfect');
});

test('the practice window and fishing physics preserve elapsed time at 8 FPS',()=>{
  const timing=hookTiming({sp:{rar:0,f:{win:1}}},{win:.74},true);
  for(const fps of [8,30,60,120]){
    let countdown=5,simulated=0,elapsed=0;
    for(let i=0;i<fps*5;i++){
      const seconds=gameplayElapsed(1/fps);
      elapsed+=seconds;countdown-=seconds;
      stepFishingPhysics(seconds,step=>{assert(step<=.05);simulated+=step;});
    }
    assert(Math.abs(countdown)<1e-10);
    assert(Math.abs(simulated-5)<1e-10);
    assert.equal(hookResult(elapsed/2,timing),'good');
    assert.equal(hookResult(elapsed,timing),'miss');
  }
});

test('a stalled render bounds physics work and stops stepping after a state transition',()=>{
  const steps=[];
  stepFishingPhysics(gameplayElapsed(10),step=>{steps.push(step);return steps.length<2;});
  assert.deepEqual(steps,[.05,.05]);
  assert.equal(gameplayElapsed(Infinity),0);
});
