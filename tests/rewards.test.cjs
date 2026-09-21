const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPlayer,beginAdReward,claimAdReward,adRewardStatus,PRODUCTS,purchase}=require('../packages/domain/dist');
const now=new Date('2026-09-21T02:00:00Z');
test('广告三次依次50/100/200，重复到账幂等，第四次拒绝',()=>{
 const p=createPlayer();
 for(const [i,amount] of [50,100,200].entries()){
  const id='reward-'+i;const ticket=beginAdReward(p,id,now);
  assert.equal(beginAdReward(p,'other-'+i,now).id,ticket.id);
  assert.equal(claimAdReward(p,id,now).amount,amount);
  const balance=p.coins;claimAdReward(p,id,now);assert.equal(p.coins,balance);
 }
 assert.equal(p.coins,450);assert.equal(p.ledger.filter(r=>r.kind==='ad').length,3);
 assert.equal(adRewardStatus(p,now).nextAmount,0);
 assert.throws(()=>beginAdReward(p,'fourth',now),e=>e.code==='AD_DAILY_LIMIT');
});
test('广告按北京时间跨日重置，昨日已发奖励重试不增加当日次数',()=>{
 const p=createPlayer();const before=new Date('2026-09-21T15:59:00Z'),after=new Date('2026-09-21T16:01:00Z');
 beginAdReward(p,'yesterday',before);claimAdReward(p,'yesterday',before);
 beginAdReward(p,'unfinished',before);
 assert.equal(adRewardStatus(p,after).watchedCount,0);
 claimAdReward(p,'yesterday',after);assert.equal(p.coins,150);
 assert.throws(()=>claimAdReward(p,'unfinished',after),e=>e.code==='AD_TICKET_EXPIRED');
 beginAdReward(p,'today',after);claimAdReward(p,'today',after);assert.equal(p.coins,200);
});
test('不存在、过期机会不发奖，旧存档无需清除余额与库存',()=>{
 const p=createPlayer();p.inventory.rain=7;delete p.adRewards;
 assert.throws(()=>claimAdReward(p,'forged',now),e=>e.code==='AD_TICKET_NOT_FOUND');
 beginAdReward(p,'expired',now);
 assert.throws(()=>claimAdReward(p,'expired',new Date(now.getTime()+1800000)),e=>e.code==='AD_TICKET_EXPIRED');
 assert.equal(p.coins,100);assert.equal(p.inventory.rain,7);
 assert.equal(adRewardStatus(p,now).watchedCount,0);
});
test('购买的是20支烟，品牌价格按参考值扣款，保留旧库存数量',()=>{
 for(const [id,price] of Object.entries({'zhonghua-hard':45,'hehua-hard':32,'yuxi-soft':23,'baisha-hard':6})){
  const p=createPlayer();p.inventory[id]=3;
  purchase(p,{requestId:'purchase-check',productId:id});
  assert.equal(p.coins,100-price);assert.equal(p.inventory[id],23);
 }
 assert(PRODUCTS.filter(p=>!p.unlimited).every(p=>p.packSize===20));
});
