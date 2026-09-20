const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function harness(){
 const store=new Map(),timeouts=new Map(),intervals=new Map(),toasts=[];let seq=0;const app={globalData:{}};
 const wx={getStorageSync:k=>store.has(k)?structuredClone(store.get(k)):'',setStorageSync:(k,v)=>store.set(k,structuredClone(v)),removeStorageSync:k=>store.delete(k),
 showToast:opts=>toasts.push(opts.title),switchTab(){},navigateTo(){},vibrateShort(){},
 createInnerAudioContext:()=>({stop(){},destroy(){},play(){},onError(){},onEnded(){}})};
 function load(name){let def;const code=fs.readFileSync(path.join(__dirname,'../apps/miniprogram/dist/pages',name,'index.js'),'utf8');
 vm.runInNewContext(code,{Page:x=>def=x,getApp:()=>app,wx,console,Date,Math,Promise,
 setTimeout:fn=>{timeouts.set(++seq,fn);return seq},clearTimeout:id=>timeouts.delete(id),setInterval:fn=>{intervals.set(++seq,fn);return seq},clearInterval:id=>intervals.delete(id)});
 def.data=structuredClone(def.data);def.setData=patch=>Object.assign(def.data,patch);return def;}
 return {load,toasts,timeouts,intervals,store,flush(){const list=[...timeouts.values()];timeouts.clear();list.forEach(fn=>fn());}};
}
test('前端跨页主流程：兑换、选用、开局、操作、暂停恢复、结束与历史',async()=>{
 const h=harness(),shop=h.load('shop');await shop.refresh();assert.equal(shop.data.coins,100);
 const detail=h.load('product');detail.productId='rain';await detail.refresh();await detail.buy();assert.equal(detail.data.owned,10);await detail.use();
 const experience=h.load('experience');experience.visible=true;await experience.refresh();assert.equal(experience.data.productName,'雨后');
 await experience.enter();const text=experience.data.eventText;assert(experience.data.sessionId);
 experience.ignite();h.flush();assert.equal(experience.data.phase,'burning');
 experience.inhale();assert.equal(experience.data.phase,'inhaling');experience.release();assert.equal(experience.data.phase,'burning');
 experience.ash();h.flush();assert.equal(experience.data.ash,0);
 experience.onHide();await experience.syncTask;assert.equal(h.intervals.size,0);
 experience.visible=true;await experience.refresh();assert.equal(experience.data.eventText,text);assert.equal(experience.data.phase,'burning');
 await experience.finish();experience.onHide();await experience.syncTask;
 const history=h.load('history');await history.refresh();assert.equal(history.data.rows.length,1);
 const collection=h.load('collection');await collection.refresh();assert.equal(collection.data.products.find(p=>p.id==='rain').owned,9);
 const wallet=h.load('wallet');await wallet.refresh();assert.equal(wallet.data.coins,80);await wallet.claim();assert.equal(wallet.data.coins,100);
 assert.equal(h.intervals.size,0);
});
test('偏好设置可以保存，免费基础款可正常进入',async()=>{
 const h=harness(),settings=h.load('settings');await settings.refresh();
 await settings.change({currentTarget:{dataset:{key:'sound'}},detail:{value:false}});assert.equal(settings.data.sound,false);
 const p=h.load('experience');p.visible=true;await p.refresh();assert.equal(p.data.productName,'留白');await p.enter();p.onHide();await p.syncTask;assert.equal(h.intervals.size,0);
});
