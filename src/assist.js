/* Account assistance follows the authenticated Google identity, never a saved flag. */
function createAccountAssist(){
  let enabled=false;
  function authenticate(user){
    enabled=!!(user&&user.emailVerified===true&&String(user.email||'').toLowerCase()==='crazyice5240@gmail.com'&&Array.isArray(user.providerData)&&user.providerData.some(p=>p.providerId==='google.com'));
    return enabled;
  }
  function grant(save){
    if(!enabled) return false;
    save.coins=Math.max(Number(save.coins)||0,9999999);
    save.lv=Math.max(save.lv||1,60); save.kayak=true; save.yacht=true;
    save.mer=save.mer||{}; save.mer.n=Math.max(save.mer.n||0,20);
    return true;
  }
  const policy={holeCount:440,roamerMultiplier:4,bedMultiplier:3,fishSeconds:1,digSeconds:.25};
  return {authenticate,grant,active:()=>enabled,policy};
}
if(typeof window!=='undefined') window.__ASSIST=createAccountAssist();
if(typeof module!=='undefined'&&module.exports) module.exports={createAccountAssist};
