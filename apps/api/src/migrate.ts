import 'reflect-metadata';
import { appConfig } from './config';
import { DatabaseService } from './database.service';
async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('显式迁移需要配置 DATABASE_URL；本地嵌入式库启动时自动初始化');
  const db = new DatabaseService(appConfig({ production: false, authMode: 'guest', migrate: true }));
  try { await db.onModuleInit(); console.log('数据库迁移完成：v1'); }
  finally { await db.onModuleDestroy(); }
}
migrate().catch(error => { console.error(error instanceof Error ? error.message : '迁移失败'); process.exitCode = 1; });

