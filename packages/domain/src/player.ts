import { PRODUCTS, SCENES, STORY_EVENTS } from './catalog';
import { getTimeContext, pickEvent } from './events';
import type { PlayerState, Preferences, Progress, PurchaseInput, PurchaseResult, SessionResult, StartSessionInput } from './types';

export class DomainError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'DomainError'; }
}
export const DEFAULT_PREFERENCES: Preferences = { sceneId: 'office-restroom', productId: 'plain', vibration: true, sound: true, quality: 'high' };
export function normalizePlayer(player: PlayerState): PlayerState {
  player.preferences ??= { ...DEFAULT_PREFERENCES };
  player.ledger ??= [];
  return player;
}
export function createPlayer(now = new Date()): PlayerState {
  return { version: 1, coins: 100, inventory: {}, sessions: [], purchases: [], preferences: { ...DEFAULT_PREFERENCES },
    ledger: [{ id: 'welcome', kind: 'welcome', amount: 100, balance: 100, title: '初次见面', createdAt: now.toISOString() }] };
}
export function purchase(player: PlayerState, input: PurchaseInput, now = new Date()): PurchaseResult {
  normalizePlayer(player);
  const previous = player.purchases.find(item => item.id === input.requestId);
  if (previous) {
    if (previous.productId !== input.productId) throw new DomainError('REQUEST_CONFLICT', '请求编号已用于其他商品');
    return { purchase: previous, player };
  }
  const product = PRODUCTS.find(item => item.id === input.productId);
  if (!product) throw new DomainError('PRODUCT_NOT_FOUND', '商品不存在');
  if (product.unlimited) throw new DomainError('ALREADY_AVAILABLE', '基础款可以直接使用');
  if (player.coins < product.price) throw new DomainError('INSUFFICIENT_COINS', '火花币不足，领取每日补给或使用留白');
  const receipt = { id: input.requestId, productId: product.id, price: product.price, quantity: product.packSize, createdAt: now.toISOString() };
  player.coins -= product.price;
  player.inventory[product.id] = (player.inventory[product.id] ?? 0) + product.packSize;
  player.purchases.push(receipt);
  player.ledger!.push({ id: 'purchase-' + input.requestId, kind: 'purchase', amount: -product.price, balance: player.coins, title: '兑换 · ' + product.name, createdAt: now.toISOString() });
  return { purchase: receipt, player };
}
export function startSession(player: PlayerState, input: StartSessionInput, now = new Date(), random = Math.random): SessionResult {
  normalizePlayer(player);
  const previous = player.sessions.find(session => session.id === input.requestId);
  if (previous) {
    if (previous.sceneId !== input.sceneId || previous.productId !== input.productId) throw new DomainError('REQUEST_CONFLICT', '请求编号已用于其他体验');
    return { session: previous, player };
  }
  if (player.sessions.some(session => session.status === 'active')) throw new DomainError('SESSION_ACTIVE', '请先结束当前体验');
  if (!SCENES.some(scene => scene.id === input.sceneId)) throw new DomainError('SCENE_NOT_FOUND', '地点不存在');
  const product = PRODUCTS.find(item => item.id === input.productId);
  if (!product) throw new DomainError('PRODUCT_NOT_FOUND', '商品不存在');
  if (!product.unlimited && (player.inventory[product.id] ?? 0) < 1) throw new DomainError('OUT_OF_STOCK', '这款已用完，请到收藏选择留白或到橱窗补充');
  const event = pickEvent(STORY_EVENTS, input.sceneId, now, player.sessions, random);
  const time = getTimeContext(now);
  const session = {
    id: input.requestId, sceneId: input.sceneId, productId: input.productId, eventId: event.id,
    eventText: event.text, startedAt: now.toISOString(), timeLabel: time.label, period: time.period, status: 'active' as const,
    progress: { remaining: 100, ash: 0, phase: 'ready' as const, revision: 0 },
  };
  if (!product.unlimited) player.inventory[product.id] = player.inventory[product.id]! - 1;
  player.preferences!.sceneId = input.sceneId;
  player.sessions.push(session);
  return { session, player };
}
export function saveProgress(player: PlayerState, id: string, progress: Progress): SessionResult {
  const session = player.sessions.find(item => item.id === id);
  if (!session) throw new DomainError('SESSION_NOT_FOUND', '体验不存在');
  if (!Number.isFinite(progress.remaining) || progress.remaining < 0 || progress.remaining > 100 ||
      !Number.isFinite(progress.ash) || progress.ash < 0 || progress.ash > 30 ||
      !Number.isInteger(progress.revision) || progress.revision < 1 ||
      !['ready', 'burning'].includes(progress.phase)) throw new DomainError('INVALID_PROGRESS', '体验进度无效');
  const old = session.progress ?? { remaining: 100, ash: 0, phase: 'ready', revision: 0 };
  if (session.status === 'ended' || progress.revision <= old.revision) return { session, player };
  if (progress.remaining > old.remaining || (old.phase === 'burning' && progress.phase === 'ready')) {
    throw new DomainError('INVALID_PROGRESS', '体验进度不能倒退');
  }
  session.progress = { ...progress };
  return { session, player };
}
export function endSession(player: PlayerState, id: string, now = new Date()): SessionResult {
  const session = player.sessions.find(item => item.id === id);
  if (!session) throw new DomainError('SESSION_NOT_FOUND', '体验不存在');
  if (session.status === 'active') { session.status = 'ended'; session.endedAt = now.toISOString(); }
  return { session, player };
}
export function claimDaily(player: PlayerState, now = new Date()): PlayerState {
  normalizePlayer(player);
  const day = getTimeContext(now).day;
  if (player.lastClaimDay !== day) {
    player.coins += 20; player.lastClaimDay = day;
    player.ledger!.push({ id: 'daily-' + day, kind: 'daily', amount: 20, balance: player.coins, title: '每日补给', createdAt: now.toISOString() });
  }
  return player;
}
export function updatePreferences(player: PlayerState, patch: Partial<Preferences>): PlayerState {
  normalizePlayer(player);
  if (patch.sceneId && !SCENES.some(scene => scene.id === patch.sceneId)) throw new DomainError('SCENE_NOT_FOUND', '地点不存在');
  if (patch.productId) {
    const product = PRODUCTS.find(item => item.id === patch.productId);
    if (!product) throw new DomainError('PRODUCT_NOT_FOUND', '商品不存在');
    if (!product.unlimited && !(player.inventory[product.id]! > 0)) throw new DomainError('OUT_OF_STOCK', '请先到橱窗兑换');
  }
  player.preferences = { ...player.preferences!, ...patch };
  return player;
}

