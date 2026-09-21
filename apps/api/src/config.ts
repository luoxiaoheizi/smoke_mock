import { resolve } from 'node:path';
export const APP_CONFIG = Symbol('APP_CONFIG');
export interface AppConfig { dataDir: string; databaseUrl?: string; authMode: 'guest' | 'wechat'; wechatAppId?: string; wechatSecret?: string; production: boolean; migrate: boolean; rewardedAdUnitId?: string; rewardDemo: boolean }
export function appConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const production = process.env.NODE_ENV === 'production';
  const config: AppConfig = {
    dataDir: resolve(__dirname, '../../..', '.data/pglite'),
    databaseUrl: process.env.DATABASE_URL || undefined,
    authMode: process.env.AUTH_MODE === 'wechat' ? 'wechat' : 'guest',
    wechatAppId: process.env.WECHAT_APP_ID, wechatSecret: process.env.WECHAT_APP_SECRET,
    production, migrate: !production || process.env.AUTO_MIGRATE === 'true',
    rewardedAdUnitId: process.env.WECHAT_REWARDED_AD_UNIT_ID || undefined,
    rewardDemo: process.env.REWARD_DEMO === 'true',
    ...overrides,
  };
  if (config.production && (!config.databaseUrl || config.authMode !== 'wechat')) throw new Error('生产环境必须使用独立 PostgreSQL 与微信登录');
  if (config.authMode === 'wechat' && (!config.wechatAppId || !config.wechatSecret)) throw new Error('微信登录需要配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET');
  if (config.production && config.rewardDemo) throw new Error('生产环境禁止广告奖励演示');
  if (config.rewardedAdUnitId && !/^adunit-[a-zA-Z0-9]+$/.test(config.rewardedAdUnitId)) throw new Error('广告位 ID 格式错误');
  return config;
}
