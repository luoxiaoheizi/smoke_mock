const {test}=require('node:test');const assert=require('node:assert/strict');
const {transformSync}=require('esbuild');const fs=require('node:fs');const vm=require('node:vm');
const code=transformSync(fs.readFileSync('apps/miniprogram/src/services/rewarded-ad.ts','utf8'),{loader:'ts',format:'cjs'}).code;
function setup(){
 const handlers={};let destroyed=0,shown=0;const timers=new Map();let timerId=0;
 const ad={load:async()=>{},show:async()=>{shown++;},onClose:cb=>handlers.close=cb,onError:cb=>handlers.error=cb,offClose(){},offError(){},destroy(){destroyed++;}};
 const wx={createRewardedVideoAd:()=>ad};const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,wx,Error,setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id)});
 return {player:new module.exports.RewardedAdPlayer(),ad,handlers,timers,stats:()=>({destroyed,shown})};
}
const options={mode:'wechat',adUnitId:'adunit-test',watchedCount:0,nextAmount:50,amounts:[50,100,200]};
test('SDK只有完整观看发奖，取消和未知关闭结果都不发奖',async()=>{
 for(const result of [{isEnded:true},{isEnded:false},undefined]){
  const h=setup();const task=h.player.watch(options);await Promise.resolve();
  h.handlers.close(result);assert.equal(await task,result?.isEnded===true);assert.equal(h.stats().destroyed,1);
  h.handlers.close({isEnded:true});assert.equal(h.stats().destroyed,1);
 }
});
test('SDK加载失败、无广告、超时和取消均释放广告对象',async()=>{
 const fail=setup();fail.ad.load=async()=>{throw Error('no fill');};await assert.rejects(fail.player.watch(options));assert.equal(fail.stats().destroyed,1);
 const error=setup();const task=error.player.watch(options);error.handlers.error({errCode:1004});await assert.rejects(task);
 const timeout=setup();const wait=timeout.player.watch(options);[...timeout.timers.values()][0]();await assert.rejects(wait,/超时/);
 const cancel=setup();const canceled=cancel.player.watch(options);cancel.player.cancel();assert.equal(await canceled,false);
 const unavailable=setup();await assert.rejects(unavailable.player.watch({...options,mode:'unavailable'}),/未开放/);
});
