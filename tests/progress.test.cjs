const {test}=require('node:test');const assert=require('node:assert/strict');
const {createPlayer,startSession,saveProgress,updatePreferences,claimDaily,purchase}=require('../packages/domain/dist');
test('存档修订号过滤乱序，剩余进度不可倒退，结束后不能修改',()=>{
 const p=createPlayer();startSession(p,{requestId:'session-0001',sceneId:'balcony',productId:'plain'});
 saveProgress(p,'session-0001',{remaining:60,ash:3,phase:'burning',revision:3});
 saveProgress(p,'session-0001',{remaining:80,ash:1,phase:'ready',revision:2});
 assert.equal(p.sessions[0].progress.remaining,60);
 assert.throws(()=>saveProgress(p,'session-0001',{remaining:70,ash:0,phase:'burning',revision:4}),e=>e.code==='INVALID_PROGRESS');
 assert.throws(()=>saveProgress(p,'session-0001',{remaining:55,ash:0,phase:'ready',revision:4}),e=>e.code==='INVALID_PROGRESS');
 p.sessions[0].status='ended';
 saveProgress(p,'session-0001',{remaining:40,ash:2,phase:'burning',revision:5});
 assert.equal(p.sessions[0].progress.remaining,60);
});
test('偏好更新不能选用未拥有商品，经济变更写入一致账本',()=>{
 const p=createPlayer();assert.throws(()=>updatePreferences(p,{productId:'night'}),e=>e.code==='OUT_OF_STOCK');
 purchase(p,{requestId:'purchase-0001',productId:'rain'});updatePreferences(p,{productId:'rain',sound:false});
 claimDaily(p);claimDaily(p);
 assert.equal(p.preferences.productId,'rain');assert.equal(p.preferences.sound,false);
 assert.equal(p.ledger.reduce((n,e)=>n+e.amount,0),p.coins);assert.equal(p.ledger.length,3);
});

