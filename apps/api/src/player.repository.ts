import { Injectable, UnauthorizedException } from '@nestjs/common';
import { normalizePlayer, type PlayerState } from '@smoke/domain';
import { DatabaseService, type SqlClient } from './database.service';
@Injectable()
export class PlayerRepository {
  constructor(private readonly db: DatabaseService) {}
  async get(id: string): Promise<PlayerState> {
    const { rows } = await this.db.query<{ state: PlayerState }>('SELECT state FROM smoke_players WHERE id=$1', [id]);
    if (!rows[0]) throw new UnauthorizedException('用户不存在');
    return normalizePlayer(rows[0].state);
  }
  async mutate<T>(id: string, action: (player: PlayerState) => T): Promise<T> {
    return this.db.transaction(async tx => {
      const { rows } = await tx.query<{ state: PlayerState }>('SELECT state FROM smoke_players WHERE id=$1 FOR UPDATE', [id]);
      if (!rows[0]) throw new UnauthorizedException('用户不存在');
      const state = normalizePlayer(rows[0].state);
      const oldLedgerLength = state.ledger!.length;
      const result = action(state);
      await tx.query('UPDATE smoke_players SET state=$2::jsonb, updated_at=now() WHERE id=$1', [id, JSON.stringify(state)]);
      await this.appendLedger(tx, id, state, oldLedgerLength);
      return result;
    });
  }
  async appendLedger(tx: SqlClient, id: string, state: PlayerState, from = 0) {
    for (const row of state.ledger?.slice(from) ?? []) {
      await tx.query('INSERT INTO smoke_wallet_ledger(player_id,operation_id,amount,balance,kind,title,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
        [id, row.id, row.amount, row.balance, row.kind, row.title, row.createdAt]);
    }
  }
}

