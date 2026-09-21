import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { adRewardStatus, beginAdReward, claimAdReward, type RewardOptions } from '@smoke/domain';
import { APP_CONFIG, type AppConfig } from './config';
import { claimDaily, endSession, PRODUCTS, purchase, SCENES, startSession, saveProgress, updatePreferences, type PlayerState, type Bootstrap, type PageResult } from '@smoke/domain';
import { PlayerRepository } from './player.repository';
import { PurchaseDto, StartSessionDto, PreferencesDto, ProgressDto, PageDto } from './dto';
/** 限制 bootstrap 响应体；完整记录在数据库中，列表接口分页读取。 */
export function snapshot(player: PlayerState): PlayerState {
  return { ...player, adRewards: undefined, sessions: player.sessions.slice(-20), purchases: player.purchases.slice(-20), ledger: player.ledger?.slice(-20) };
}
@Injectable()
export class GameService {
  constructor(private readonly players: PlayerRepository, @Inject(APP_CONFIG) private readonly config: AppConfig) {}
  private rewardOptions(player: PlayerState, now: Date): RewardOptions {
    return { ...adRewardStatus(player, now), mode: this.config.rewardedAdUnitId ? 'wechat' : this.config.rewardDemo && !this.config.production ? 'demo' : 'unavailable', adUnitId: this.config.rewardedAdUnitId };
  }
  async bootstrap(id: string): Promise<Bootstrap> {
    const player = await this.players.get(id), now = new Date();
    return { scenes: SCENES, products: PRODUCTS, player: snapshot(player), serverTime: now.toISOString(), mode: 'api', rewards: this.rewardOptions(player, now) };
  }
  private requireAds() {
    if (!this.config.rewardedAdUnitId && !(this.config.rewardDemo && !this.config.production)) throw new ServiceUnavailableException('广告暂未开放');
  }
  async beginAd(id: string) { this.requireAds(); return this.players.mutate(id, p => beginAdReward(p, randomUUID())); }
  async claimAd(id: string, ticketId: string) {
    this.requireAds();
    const result = await this.players.mutate(id, p => claimAdReward(p, ticketId));
    return { amount: result.amount, player: snapshot(result.player) };
  }
  async purchase(id: string, input: PurchaseDto) { const result = await this.players.mutate(id, p => purchase(p, input)); return { ...result, player: snapshot(result.player) }; }
  async start(id: string, input: StartSessionDto) { const result = await this.players.mutate(id, p => startSession(p, input)); return { ...result, player: snapshot(result.player) }; }
  async end(id: string, sessionId: string) { const result = await this.players.mutate(id, p => endSession(p, sessionId)); return { ...result, player: snapshot(result.player) }; }
  async progress(id: string, sessionId: string, body: ProgressDto) { const result = await this.players.mutate(id, p => saveProgress(p, sessionId, body)); return { ...result, player: snapshot(result.player) }; }
  async claim(id: string) { return snapshot(await this.players.mutate(id, p => claimDaily(p))); }
  async preferences(id: string, patch: PreferencesDto) { return snapshot(await this.players.mutate(id, p => updatePreferences(p, patch))); }
  async history(id: string, page: PageDto) { const player = await this.players.get(id); return this.paginate(player.sessions.filter(s => s.status === 'ended').reverse(), page); }
  async ledger(id: string, page: PageDto) { const player = await this.players.get(id); return this.paginate([...(player.ledger ?? [])].reverse(), page); }
  private paginate<T>(items: T[], page: PageDto): PageResult<T> { return { items: items.slice(page.offset, page.offset + page.limit), total: items.length, offset: page.offset, limit: page.limit }; }
}
