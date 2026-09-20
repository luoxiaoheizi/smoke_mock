import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { APP_CONFIG, type AppConfig } from './config';
import { SCHEMA } from './schema';
export interface SqlClient { query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> }

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private embedded?: PGlite;
  private pool?: Pool;
  constructor(@Inject(APP_CONFIG) readonly config: AppConfig) {}
  get kind() { return this.config.databaseUrl ? 'postgresql' : 'pglite'; }
  async onModuleInit() {
    if (this.config.databaseUrl) this.pool = new Pool({ connectionString: this.config.databaseUrl, max: 10, connectionTimeoutMillis: 5000 });
    else this.embedded = await PGlite.create(this.config.dataDir);
    if (this.config.migrate) await this.transaction(async tx => { for (const sql of SCHEMA) await tx.query(sql); });
    const version = await this.query<{ version: number }>('SELECT version FROM smoke_migrations ORDER BY version DESC LIMIT 1');
    if (version.rows[0]?.version !== 1) throw new Error('数据库版本不匹配，请先运行迁移');
  }
  async query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    if (this.pool) return this.pool.query<T>(sql, params);
    if (!this.embedded) throw new Error('数据库未初始化');
    return this.embedded.query<T>(sql, params);
  }
  async transaction<T>(action: (tx: SqlClient) => Promise<T>): Promise<T> {
    if (this.pool) {
      const client = await this.pool.connect();
      try { await client.query('BEGIN'); const result = await action(client); await client.query('COMMIT'); return result; }
      catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    if (!this.embedded) throw new Error('数据库未初始化');
    return this.embedded.transaction(tx => action(tx));
  }
  async onModuleDestroy() { await this.embedded?.close(); await this.pool?.end(); }
}

