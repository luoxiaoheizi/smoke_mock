const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdirSync, mkdtempSync } = require('node:fs');
const path = require('node:path');
const { createApp } = require('../apps/api/dist/app');
const { DatabaseService } = require('../apps/api/dist/database.service');
const basePath = path.resolve(__dirname, '../.cache/api-tests');
mkdirSync(basePath, { recursive: true });
const dataDir = mkdtempSync(path.join(basePath, 'run-'));
const options = { dataDir, authMode: 'guest', production: false, migrate: true };
async function boot() {
  const app = await createApp(options); await app.listen(0, '127.0.0.1');
  const base = await app.getUrl() + '/api/v1';
  const call = async (route, { method = 'GET', body, token } = {}) => {
    const response = await fetch(base + route, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  };
  return { app, call };
}
test('持久化 HTTP 流程：身份隔离、校验、并发事务、会话、设置和分页', async () => {
  let app; let call; let account;
  try {
    ({app,call}=await boot());
    assert.equal((await call('/health')).data.storage, 'pglite');
    assert.equal((await call('/bootstrap')).status, 401);
    account = (await call('/auth/login', {method:'POST',body:{}})).data;
    assert.match(account.token,/^[a-f0-9]{64}$/);
    const token=account.token;
    const user=(route,opts={})=>call(route,{...opts,token});
    assert.equal((await user('/bootstrap')).data.player.coins,100);
    const catalog=(await user('/bootstrap')).data.products;
    assert.deepEqual(catalog.filter(p=>p.brand).map(p=>p.id),['zhonghua-hard','hehua-hard','yuxi-soft','baisha-hard']);
    assert.equal(catalog.find(p=>p.id==='zhonghua-hard').image,'/assets/products/zhonghua-hard.jpg');
    assert.equal((await user('/purchases',{method:'POST',body:{requestId:'buy-00000001',productId:'rain',price:0}})).status,400);
    assert.equal((await user('/preferences',{method:'POST',body:{sound:'false'}})).status,400);
    assert.equal((await user('/sessions?offset=-1')).status,400);
    const same=()=>user('/purchases',{method:'POST',body:{requestId:'buy-00000001',productId:'rain'}});
    const duplicates=await Promise.all([same(),same(),same()]);
    assert(duplicates.every(r=>r.status===201));
    assert.equal((await user('/bootstrap')).data.player.coins,80);
    assert.equal((await user('/bootstrap')).data.player.inventory.rain,10);
    const conflict=await user('/purchases',{method:'POST',body:{requestId:'buy-00000001',productId:'night'}});
    assert.equal(conflict.status,409);
    // 四个并发购买最多成功两个，余额不可负。
    const concurrent=await Promise.all([0,1,2,3].map(i=>user('/purchases',{method:'POST',body:{requestId:'night-purchase-'+i,productId:'night'}})));
    assert.equal(concurrent.filter(r=>r.status===201).length,2);
    assert.equal((await user('/bootstrap')).data.player.coins,20);
    const stranger=(await call('/auth/login',{method:'POST',body:{}})).data.token;
    assert.equal((await call('/bootstrap',{token:stranger})).data.player.coins,100);
    assert.equal((await user('/preferences',{method:'POST',body:{sceneId:'balcony',productId:'rain',sound:false,quality:'standard'}})).status,201);
    const input={requestId:'session-0001',productId:'rain',sceneId:'office-restroom'};
    assert.equal((await user('/sessions',{method:'POST',body:{...input,eventId:'forced'}})).status,400);
    const started=await user('/sessions',{method:'POST',body:input});
    const replay=await user('/sessions',{method:'POST',body:input});
    assert.deepEqual(started.data.session,replay.data.session);
    assert.equal(replay.data.player.inventory.rain,9);
    assert.equal((await user('/sessions',{method:'POST',body:{...input,requestId:'session-0002'}})).data.code,'SESSION_ACTIVE');
    assert.equal((await call('/sessions/session-0001/end',{token:stranger,method:'POST'})).status,404);
    assert.equal((await user('/sessions/session-0001/progress',{method:'PUT',body:{remaining:78,ash:8,phase:'burning',revision:2}})).status,200);
    const stale=await user('/sessions/session-0001/progress',{method:'PUT',body:{remaining:90,ash:3,phase:'burning',revision:1}});
    assert.equal(stale.data.session.progress.remaining,78);
    assert.equal((await user('/sessions/session-0001/progress',{method:'PUT',body:{remaining:99,ash:3,phase:'burning',revision:3}})).status,409);
    await Promise.all([user('/wallet/daily-claim',{method:'POST'}),user('/wallet/daily-claim',{method:'POST'})]);
    assert.equal((await user('/bootstrap')).data.player.coins,40);
    const ledger=await user('/wallet/ledger?offset=0&limit=2');assert.equal(ledger.data.items.length,2);assert.equal(ledger.data.total,5);
    assert.equal((await user('/sessions')).data.total,0);
    // 关闭进程内数据库再打开同一目录，凭证、钱包、进度和偏好必须恢复。
    await app.close();app=undefined;
    ({app,call}=await boot());
    const resumed=await call('/bootstrap',{token});
    assert.equal(resumed.data.player.coins,40);
    assert.equal(resumed.data.player.preferences.sound,false);
    assert.equal(resumed.data.player.sessions[0].progress.remaining,78);
    assert.equal(resumed.data.player.sessions[0].eventText,started.data.session.eventText);
    const ended=await call('/sessions/session-0001/end',{method:'POST',token});
    const endedAgain=await call('/sessions/session-0001/end',{method:'POST',token});
    assert.equal(ended.data.session.endedAt,endedAgain.data.session.endedAt);
    assert.equal((await call('/sessions',{token})).data.total,1);
    // 令牌续期不创建新用户，不返回数据库中存储的哈希。
    await app.get(DatabaseService).query('UPDATE smoke_tokens SET expires_at=now()-interval \'1 minute\'');
    assert.equal((await call('/bootstrap',{token})).status,401);
    const refreshed=await call('/auth/refresh',{method:'POST',body:{refreshToken:account.refreshToken}});
    assert.equal(refreshed.status,201);assert.notEqual(refreshed.data.token,token);
    assert.equal((await call('/bootstrap',{token:refreshed.data.token})).data.player.coins,40);
    const audit=await app.get(DatabaseService).query('SELECT SUM(amount)::integer AS total FROM smoke_wallet_ledger WHERE player_id=(SELECT player_id FROM smoke_tokens WHERE refresh_hash=$1)',[require('../apps/api/dist/auth.service').tokenHash(account.refreshToken)]);
    assert.equal(audit.rows[0].total,40);
  } finally { if(app)await app.close(); }
});
test('生产配置拒绝游客和嵌入式数据库',()=>{
 const {appConfig}=require('../apps/api/dist/config');
 assert.throws(()=>appConfig({production:true,authMode:'guest'}),/生产环境必须/);
 assert.throws(()=>appConfig({production:true,databaseUrl:'postgresql://example/db',authMode:'wechat',wechatAppId:undefined,wechatSecret:undefined}),/微信登录需要/);
});

