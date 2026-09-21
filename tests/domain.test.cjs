const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  getTimeContext, matchesEvent, pickEvent, STORY_EVENTS, SCENES, createPlayer, purchase,
  startSession, endSession, claimDaily, DomainError,
} = require('../packages/domain/dist');

const morning = new Date('2026-09-18T02:16:00.000Z'); // 周五北京时间 10:16
test('四款品牌参考商品可兑换、幂等重试、选用并消耗库存', () => {
  const { PRODUCTS, updatePreferences } = require('../packages/domain/dist');
  for (const id of ['zhonghua-hard', 'hehua-hard', 'yuxi-soft', 'baisha-hard']) {
    const product = PRODUCTS.find(p => p.id === id);
    assert(product, id + ' 应在共享商品目录中');
    const player = createPlayer();
    const input = { requestId: 'purchase-brand-001', productId: id };
    purchase(player, input); purchase(player, input);
    assert.equal(player.coins, 100 - product.price);
    assert.equal(player.inventory[id], 20);
    updatePreferences(player, { productId: id });
    assert.equal(player.preferences.productId, id);
    startSession(player, { requestId: 'session-brand-001', productId: id, sceneId: 'balcony' }, morning);
    assert.equal(player.inventory[id], 19);
    assert.equal(player.sessions[0].productId, id);
  }
});
const event = (overrides = {}) => ({
  id: 'a', text: '事件', sceneIds: ['balcony'], startMinute: 0, endMinute: 1440,
  weight: 1, cooldownMinutes: 60, enabled: true, ...overrides,
});
const history = id => [{ eventId: id, startedAt: morning.toISOString() }];

test('时间按 UTC+8 计算，跨自然日且不依赖系统时区', () => {
  assert.deepEqual(getTimeContext(morning), { minute: 616, weekday: 5, label: '10:16', day: '2026-09-18', period: 'day' });
  assert.equal(getTimeContext(new Date('2026-09-18T16:00:00Z')).day, '2026-09-19');
  assert.equal(getTimeContext(new Date('2026-09-18T16:00:00Z')).label, '00:00');
});
test('时间窗口支持跨午夜，终点不包含，星期条件有效', () => {
  const overnight = event({ startMinute: 1320, endMinute: 300 });
  assert(matchesEvent(overnight, 'balcony', getTimeContext(new Date('2026-09-18T15:00:00Z'))));
  assert(matchesEvent(overnight, 'balcony', getTimeContext(new Date('2026-09-18T18:00:00Z'))));
  assert(!matchesEvent(overnight, 'balcony', getTimeContext(new Date('2026-09-18T21:00:00Z'))));
  assert(!matchesEvent(event({ weekdays: [1] }), 'balcony', getTimeContext(morning)));
});
test('禁用、其他地点和零权重事件不会进入候选池', () => {
  assert(!matchesEvent(event({ enabled: false }), 'balcony', getTimeContext(morning)));
  assert(!matchesEvent(event({ weight: 0 }), 'balcony', getTimeContext(morning)));
  assert(!matchesEvent(event(), 'office-restroom', getTimeContext(morning)));
});
test('同池按权重抽取且边界正确', () => {
  const entries = [event({ id: 'a', weight: 1 }), event({ id: 'b', weight: 3 })];
  assert.equal(pickEvent(entries, 'balcony', morning, [], () => 0.24).id, 'a');
  assert.equal(pickEvent(entries, 'balcony', morning, [], () => 0.25).id, 'b');
  assert.equal(pickEvent(entries, 'balcony', morning, [], () => 0.9999).id, 'b');
});
test('专属事件优先；冷却后使用通用兜底，并避免连续重复', () => {
  const entries = [event({ id: 'specific' }), event({ id: 'fallback', fallback: true })];
  assert.equal(pickEvent(entries, 'balcony', morning, [], () => 0).id, 'specific');
  assert.equal(pickEvent(entries, 'balcony', morning, history('specific'), () => 0).id, 'fallback');
  const cooling = [...history('specific'), ...history('fallback')];
  assert.equal(pickEvent(entries, 'balcony', morning, cooling, () => 0).id, 'specific');
});
test('只有一个合法候选可重复，无候选和异常随机值显式报错', () => {
  assert.equal(pickEvent([event()], 'balcony', morning, history('a'), () => 0).id, 'a');
  assert.throws(() => pickEvent([], 'balcony', morning, []), /缺少通用事件/);
  assert.throws(() => pickEvent([event()], 'balcony', morning, [], () => 1), /随机数/);
});
test('每个地点一周内每小时均有通用兜底，抽取结果符合地点与时间', () => {
  for (const scene of SCENES) {
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const now = new Date(Date.UTC(2026, 8, 14 + day, hour));
        const time = getTimeContext(now);
        assert(STORY_EVENTS.filter(e => e.fallback && matchesEvent(e, scene.id, time)).length >= 2);
        assert(matchesEvent(pickEvent(STORY_EVENTS, scene.id, now, [], () => .4), scene.id, time));
      }
    }
  }
});
test('兑换由商品目录定价，重复编号不重复扣款，冲突编号拒绝', () => {
  const player = createPlayer();
  purchase(player, { requestId: 'purchase-001', productId: 'rain' });
  purchase(player, { requestId: 'purchase-001', productId: 'rain' });
  assert.equal(player.coins, 80); assert.equal(player.inventory.rain, 20); assert.equal(player.purchases.length, 1);
  assert.throws(() => purchase(player, { requestId: 'purchase-001', productId: 'night' }), e => e.code === 'REQUEST_CONFLICT');
});
test('余额不足与未知商品不会改变玩家状态', () => {
  const player = createPlayer(); player.coins = 10;
  const before = JSON.stringify(player);
  assert.throws(() => purchase(player, { requestId: 'purchase-002', productId: 'night' }), e => e instanceof DomainError && e.code === 'INSUFFICIENT_COINS');
  assert.throws(() => purchase(player, { requestId: 'purchase-003', productId: 'missing' }), e => e.code === 'PRODUCT_NOT_FOUND');
  assert.equal(JSON.stringify(player), before);
});
test('开局消耗一支；重试不扣库存、不重抽事件、不改变情境时间', () => {
  const player = createPlayer(); player.inventory.rain = 2;
  const input = { requestId: 'session-0001', productId: 'rain', sceneId: 'office-restroom' };
  const first = startSession(player, input, morning, () => 0);
  const replay = startSession(player, input, new Date('2026-09-19T20:00:00Z'), () => .99);
  assert.equal(player.inventory.rain, 1);
  assert.equal(first.session.id, replay.session.id);
  assert.equal(replay.session.eventId, 'toilet-morning');
  assert.equal(replay.session.timeLabel, '10:16');
  assert.throws(() => startSession(player, { ...input, sceneId: 'balcony' }), e => e.code === 'REQUEST_CONFLICT');
  assert.throws(() => startSession(player, { ...input, requestId: 'session-0002' }), e => e.code === 'SESSION_ACTIVE');
});
test('库存不足或地点错误不能创建会话，免费基础款不扣库存', () => {
  const player = createPlayer();
  assert.throws(() => startSession(player, { requestId: 'session-0001', productId: 'rain', sceneId: 'balcony' }), e => e.code === 'OUT_OF_STOCK');
  assert.throws(() => startSession(player, { requestId: 'session-0001', productId: 'plain', sceneId: 'unknown' }), e => e.code === 'SCENE_NOT_FOUND');
  assert.equal(player.sessions.length, 0);
  startSession(player, { requestId: 'session-0001', productId: 'plain', sceneId: 'balcony' });
  assert.deepEqual(player.inventory, {});
});
test('结束幂等且保留首次结束时间，结束后能创建新会话', () => {
  const player = createPlayer();
  startSession(player, { requestId: 'session-0001', productId: 'plain', sceneId: 'balcony' }, morning);
  endSession(player, 'session-0001', morning);
  endSession(player, 'session-0001', new Date(morning.getTime() + 1000));
  assert.equal(player.sessions[0].endedAt, morning.toISOString());
  startSession(player, { requestId: 'session-0002', productId: 'plain', sceneId: 'balcony' }, morning);
  assert.equal(player.sessions.length, 2);
});
test('每日补给以北京时间自然日去重', () => {
  const player = createPlayer();
  claimDaily(player, new Date('2026-09-18T15:59:00Z'));
  claimDaily(player, new Date('2026-09-18T15:59:59Z'));
  assert.equal(player.coins, 120);
  claimDaily(player, new Date('2026-09-18T16:00:00Z'));
  assert.equal(player.coins, 140);
});
