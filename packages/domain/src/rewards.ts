import { getTimeContext } from './events';
import { DomainError } from './player';
import type { PlayerState, AdRewardStatus, AdRewardTicket } from './types';

export const AD_REWARD_AMOUNTS = [50, 100, 200] as const;
export function adRewardStatus(player: PlayerState, now = new Date()): AdRewardStatus {
  const day = getTimeContext(now).day;
  const watchedCount = (player.adRewards ?? []).filter(r => r.day === day && r.claimedAt).length;
  return { watchedCount, nextAmount: AD_REWARD_AMOUNTS[watchedCount] ?? 0, amounts: [...AD_REWARD_AMOUNTS] };
}
export function beginAdReward(player: PlayerState, id: string, now = new Date()): AdRewardTicket {
  if (!adRewardStatus(player, now).nextAmount) throw new DomainError('AD_DAILY_LIMIT', '今天的三次广告奖励已领完，明天再来');
  const day = getTimeContext(now).day;
  player.adRewards ??= [];
  // 同一账号只保留一个有效的待完成机会，避免多设备同时观看重复发奖。
  const pending = player.adRewards.find(r => r.day === day && !r.claimedAt && now.getTime() - Date.parse(r.createdAt) < 30 * 60_000);
  if (pending) return pending;
  const ticket = { id, day, createdAt: now.toISOString() };
  player.adRewards.push(ticket);
  return ticket;
}
/** 由广告完整播放回调之后调用；客户端回调本身不是平台服务端验真凭证。 */
export function claimAdReward(player: PlayerState, id: string, now = new Date()): { player: PlayerState; amount: number } {
  const ticket = player.adRewards?.find(r => r.id === id);
  if (!ticket) throw new DomainError('AD_TICKET_NOT_FOUND', '广告奖励记录不存在，请重新观看');
  if (ticket.claimedAt) return { player, amount: ticket.amount! };
  if (ticket.day !== getTimeContext(now).day || now.getTime() - Date.parse(ticket.createdAt) >= 30 * 60_000) {
    throw new DomainError('AD_TICKET_EXPIRED', '广告奖励已过期，请重新观看');
  }
  const { nextAmount } = adRewardStatus(player, now);
  if (!nextAmount) throw new DomainError('AD_DAILY_LIMIT', '今天的三次广告奖励已领完，明天再来');
  ticket.claimedAt = now.toISOString(); ticket.amount = nextAmount;
  player.coins += nextAmount;
  player.ledger ??= [];
  player.ledger.push({ id: 'ad-' + id, kind: 'ad', amount: nextAmount, balance: player.coins, title: '广告奖励', createdAt: ticket.claimedAt });
  return { player, amount: nextAmount };
}
