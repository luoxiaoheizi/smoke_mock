import { Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createPlayer, type LoginResult } from '@smoke/domain';
import { DatabaseService, type SqlClient } from './database.service';
import { APP_CONFIG, type AppConfig } from './config';
import { PlayerRepository } from './player.repository';

export function tokenHash(value: string) { return createHash('sha256').update(value).digest('hex'); }
@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService, private readonly players: PlayerRepository, @Inject(APP_CONFIG) private readonly config: AppConfig) {}
  async login(code?: string): Promise<LoginResult> {
    let identity: string;
    if (this.config.authMode === 'wechat') {
      if (!code) throw new UnauthorizedException('需要微信登录 code');
      const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
      url.search = new URLSearchParams({ appid: this.config.wechatAppId!, secret: this.config.wechatSecret!, js_code: code, grant_type: 'authorization_code' }).toString();
      let response: { openid?: string; errcode?: number };
      try {
        const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!upstream.ok) throw new Error('upstream');
        response = await upstream.json() as typeof response;
      } catch { throw new ServiceUnavailableException('微信登录服务暂不可用，请稍后重试'); }
      if (response.errcode || !response.openid) throw new UnauthorizedException('微信登录凭证无效，请重新登录');
      identity = 'wechat:' + tokenHash(this.config.wechatAppId! + ':' + response.openid);
    } else {
      if (this.config.production) throw new UnauthorizedException('生产环境禁止游客登录');
      identity = 'guest:' + randomUUID();
    }
    return this.db.transaction(async tx => {
      const id = randomUUID();
      const player = createPlayer();
      await tx.query('INSERT INTO smoke_players(id,identity,state) VALUES($1,$2,$3::jsonb) ON CONFLICT(identity) DO NOTHING', [id, identity, JSON.stringify(player)]);
      const result = await tx.query<{ id: string }>('SELECT id FROM smoke_players WHERE identity=$1', [identity]);
      const playerId = result.rows[0]!.id;
      if (playerId === id) await this.players.appendLedger(tx, id, player);
      return this.issue(tx, playerId);
    });
  }
  private async issue(tx: SqlClient, playerId: string): Promise<LoginResult> {
    const token = randomBytes(32).toString('hex');
    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();
    await tx.query('DELETE FROM smoke_tokens WHERE refresh_expires_at <= now()');
    await tx.query('INSERT INTO smoke_tokens(id,player_id,access_hash,refresh_hash,expires_at,refresh_expires_at) VALUES($1,$2,$3,$4,$5,$6)',
      [randomUUID(), playerId, tokenHash(token), tokenHash(refreshToken), expiresAt, new Date(Date.now() + 180 * 86400_000).toISOString()]);
    return { token, refreshToken, expiresAt };
  }
  async refresh(refreshToken: string): Promise<LoginResult> {
    return this.db.transaction(async tx => {
      const result = await tx.query<{ id: string; player_id: string }>('SELECT id,player_id FROM smoke_tokens WHERE refresh_hash=$1 AND refresh_expires_at>now() FOR UPDATE', [tokenHash(refreshToken)]);
      if (!result.rows[0]) throw new UnauthorizedException('登录已过期，请重新登录');
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();
      await tx.query('UPDATE smoke_tokens SET access_hash=$1,expires_at=$2 WHERE id=$3', [tokenHash(token), expiresAt, result.rows[0].id]);
      return { token, refreshToken, expiresAt };
    });
  }
  async identify(token: string): Promise<string> {
    const result = await this.db.query<{ player_id: string }>('SELECT player_id FROM smoke_tokens WHERE access_hash=$1 AND expires_at>now()', [tokenHash(token)]);
    if (!result.rows[0]) throw new UnauthorizedException('登录已失效，请重新登录');
    return result.rows[0].player_id;
  }
}

