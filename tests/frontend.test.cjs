const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function harness(){
 const store=new Map(),timeouts=new Map(),intervals=new Map(),toasts=[];let seq=0;const app={globalData:{}};
 const wx={getStorageSync:k=>store.has(k)?structuredClone(store.get(k)):'',setStorageSync:(k,v)=>store.set(k,structuredClone(v)),removeStorageSync:k=>store.delete(k),
 showToast:opts=>toasts.push(opts.title),switchTab(){},navigateTo(){},vibrateShort(){},
 createInnerAudioContext:()=>({stop(){},destroy(){},play(){},onError(){},onEnded(){}})};
 function load(name){let def;const code=fs.readFileSync(path.join(__dirname,'../apps/miniprogram/dist/pages',name,'index.js'),'utf8');
 vm.runInNewContext(code,{Page:x=>def=x,getApp:()=>app,wx,console,Date,Math,Promise,Error,
 setTimeout:fn=>{timeouts.set(++seq,fn);return seq},clearTimeout:id=>timeouts.delete(id),setInterval:fn=>{intervals.set(++seq,fn);return seq},clearInterval:id=>intervals.delete(id)});
 def.data=structuredClone(def.data);def.setData=patch=>Object.assign(def.data,patch);return def;}
 return {load,toasts,timeouts,intervals,store,wx,flush(){const list=[...timeouts.values()];timeouts.clear();list.forEach(fn=>fn());}};
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

test('从钱包领取补给返回商品详情，余额同步更新',async()=>{
 const h=harness(),product=h.load('product');product.productId='rain';await product.refresh();
 const wallet=h.load('wallet');await wallet.refresh();await wallet.claim();
 if(product.onShow)await product.onShow();
 assert.equal(product.data.coins,wallet.data.coins);
});

test('记录刷新期间不追加旧分页，避免重复或遗漏',async()=>{
 for(const name of ['history','wallet']){
  const h=harness(),page=h.load(name);await page.refresh();
  page.data.rows=[];page.data.total=10;page.data.loading=true;
  await page.more();assert.equal(page.data.total,10, name+' 刷新期间不应发起分页请求');
 }
});

test('未点燃时结束失败，保留未点燃状态并允许重试',async()=>{
 const h=harness(),page=h.load('experience');page.visible=true;await page.refresh();await page.enter();
 const write=h.wx.setStorageSync;
 h.wx.setStorageSync=(key,value)=>{if(key==='smoke-local-player-v1'&&value.sessions.some(s=>s.status==='ended'))throw new Error('保存暂时失败');write(key,value);};
 await page.finish();assert.equal(page.data.phase,'ready');assert.ok(page.data.sessionId);assert.match(page.data.actionError,/保存暂时失败/);
 h.wx.setStorageSync=write;await page.finish();assert.equal(page.data.sessionId,'');page.onHide();await page.syncTask;
});

test('地点可选择，活动体验中切换地点不会重抽事件',async()=>{
 const h=harness(),p=h.load('experience');p.visible=true;await p.refresh();
 p.openScenes();assert.equal(p.data.showScenes,true);
 await p.selectScene({currentTarget:{dataset:{id:'balcony'}}});assert.equal(p.data.sceneId,'balcony');assert.equal(p.data.showScenes,false);
 await p.enter();const event=p.data.eventText;p.openScenes();assert.equal(p.data.showScenes,false);
 await p.selectScene({currentTarget:{dataset:{id:'office-restroom'}}});assert.equal(p.data.sceneId,'balcony');assert.equal(p.data.eventText,event);
 p.onHide();await p.syncTask;
});

test('设置保存失败保持原值，恢复存储后可以重试',async()=>{
 const h=harness(),p=h.load('settings');await p.refresh();const previous=p.data.sound;
 const write=h.wx.setStorageSync;h.wx.setStorageSync=()=>{throw new Error('存储暂不可用');};
 const change={currentTarget:{dataset:{key:'sound'}},detail:{value:!previous}};
 await p.change(change);assert.equal(p.data.sound,previous);assert.equal(p.data.busy,false);
 h.wx.setStorageSync=write;await p.change(change);assert.equal(p.data.sound,!previous);
});


test('品牌商品跨页流程和图片失败降级',async()=>{
 const h=harness(),shop=h.load('shop');await shop.refresh();
 assert.equal(shop.data.products[0].id,'zhonghua-hard');
 assert.equal(shop.data.products.filter(p=>p.image).length,4);
 shop.imageError({currentTarget:{dataset:{id:'zhonghua-hard'}}});
 assert.equal(shop.data.imageErrors['zhonghua-hard'],true);
 const detail=h.load('product');detail.onLoad({id:'zhonghua-hard'});await detail.onShow();
 assert.equal(detail.data.product.name,'中华（硬）');
 detail.imageError();assert.equal(detail.data.imageFailed,true);
 await detail.buy();assert.equal(detail.data.owned,20);assert.equal(detail.data.coins,40);
 await detail.use();
 const experience=h.load('experience');experience.visible=true;await experience.refresh();
 assert.equal(experience.data.productName,'中华（硬）');await experience.enter();
 await experience.finish();experience.onHide();await experience.syncTask;
 const collection=h.load('collection');await collection.refresh();
 assert.equal(collection.data.products.find(p=>p.id==='zhonghua-hard').owned,19);
 collection.imageError({currentTarget:{dataset:{id:'zhonghua-hard'}}});
 assert.equal(collection.data.imageErrors['zhonghua-hard'],true);
 const history=h.load('history');await history.refresh();assert.equal(history.data.rows[0].product,'中华（硬）');
});
