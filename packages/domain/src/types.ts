export interface Scene {
  id: string; name: string; description: string; theme: 'toilet' | 'balcony';
  tag?: string;
}
export interface Product {
  id: string; name: string; subtitle: string; color: string; price: number; packSize: number; unlimited: boolean;
  description?: string; series?: string;
  /** 本地包装素材与公开图鉴参考信息；price 始终为游戏火花币。 */
  image?: string; brand?: string; manufacturer?: string; packaging?: string; lengthMm?: number; sourceUrl?: string;
}
export interface StoryEvent {
  id: string; text: string; sceneIds: string[];
  /** 北京时间分钟，左闭右开，起点大于终点表示跨午夜。 */
  startMinute: number; endMinute: number; weekdays?: number[]; weight: number;
  cooldownMinutes: number; fallback?: boolean; enabled: boolean;
}
export interface TimeContext { minute: number; weekday: number; label: string; day: string; period: 'day' | 'dusk' | 'night' }
export interface Preferences {
  sceneId: string; productId: string; vibration: boolean; sound: boolean; quality: 'standard' | 'high';
}
export interface Progress { remaining: number; ash: number; phase: 'ready' | 'burning'; revision: number }
export interface Session {
  id: string; sceneId: string; productId: string; eventId: string; eventText: string; startedAt: string;
  timeLabel: string; period: TimeContext['period']; status: 'active' | 'ended'; endedAt?: string; progress?: Progress;
}
export interface Purchase { id: string; productId: string; price: number; quantity: number; createdAt?: string }
export interface LedgerEntry { id: string; kind: 'welcome' | 'purchase' | 'daily'; amount: number; balance: number; title: string; createdAt: string }
export interface PlayerState {
  version: 1; coins: number; inventory: Record<string, number>; sessions: Session[]; purchases: Purchase[];
  lastClaimDay?: string; preferences?: Preferences; ledger?: LedgerEntry[];
}
export interface Bootstrap {
  scenes: Scene[]; products: Product[]; player: PlayerState; serverTime: string; mode: 'local-demo' | 'api';
}
export interface StartSessionInput { requestId: string; sceneId: string; productId: string }
export interface PurchaseInput { requestId: string; productId: string }
export interface SessionResult { session: Session; player: PlayerState }
export interface PurchaseResult { purchase: Purchase; player: PlayerState }
export interface PageResult<T> { items: T[]; total: number; offset: number; limit: number }
export interface LoginResult { token: string; refreshToken: string; expiresAt: string }
