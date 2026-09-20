import { Injectable } from '@nestjs/common';
import { claimDaily, endSession, PRODUCTS, purchase, SCENES, startSession, saveProgress, updatePreferences, type PlayerState, type Bootstrap, type PageResult } from '@smoke/domain';
import { PlayerRepository } from './player.repository';
import { PurchaseDto, StartSessionDto, PreferencesDto, ProgressDto, PageDto } from './dto';
/** 限制 bootstrap 响应体；完整记录在数据库中，列表接口分页读取。 */
export function snapshot(player: PlayerState): PlayerState {
  return { ...player, sessions: player.sessions.slice(-20), purchases: player.purchases.slice(-20), ledger: player.ledger?.slice(-20) };
}
@Injectable()
export class GameService {
  constructor(private readonly players: PlayerRepository) {}
  async bootstrap(id: string): Promise<Bootstrap> { return { scenes: SCENES, products: PRODUCTS, player: snapshot(await this.players.get(id)), serverTime: new Date().toISOString(), mode: 'api' }; }
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

