import {
  claimDaily, createPlayer, endSession, normalizePlayer, PRODUCTS, purchase, SCENES, startSession, saveProgress, updatePreferences,
  type Bootstrap, type PlayerState, type PurchaseInput, type PurchaseResult, type SessionResult, type StartSessionInput,
  type Preferences, type Progress, type PageResult, type LedgerEntry, type Session, type LoginResult,
} from '../../../../packages/domain/src/index';
import { savePreferences } from './preferences';
const PLAYER_KEY = 'smoke-local-player-v1';
const AUTH_KEY = 'smoke-auth-v2:' + __API_BASE_URL__;
export const isLocalDemo = __USE_MOCK__;
interface AuthApp { globalData: { authFlight?: Promise<string> } }
export class ApiError extends Error { constructor(message: string, readonly status = 0, readonly code = '') { super(message); } }
export function newRequestId(): string { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12); }
function pendingKey(key: string) { return 'smoke-pending-' + (isLocalDemo ? 'local' : __API_BASE_URL__) + '-' + key; }
export function operationId(key: string): string {
  const stored = wx.getStorageSync(pendingKey(key));
  if (typeof stored === 'string' && stored.length >= 8) return stored;
  const id = newRequestId(); wx.setStorageSync(pendingKey(key), id); return id;
}
export function completeOperation(key: string) { wx.removeStorageSync(pendingKey(key)); }
function loadPlayer(): PlayerState {
  const saved = wx.getStorageSync(PLAYER_KEY) as PlayerState | undefined;
  if (!saved) return createPlayer();
  if (saved.version !== 1 || !Number.isFinite(saved.coins) || !saved.inventory || !Array.isArray(saved.sessions) || !Array.isArray(saved.purchases)) throw new Error('本地存档不兼容，请清除本项目缓存');
  return normalizePlayer(saved);
}
function local<T>(action: (player: PlayerState) => T): Promise<T> {
  return Promise.resolve().then(() => {
    const player = loadPlayer(); const result = action(player);
    wx.setStorageSync(PLAYER_KEY, player); return result;
  });
}
function raw<T extends object>(path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: object, token?: string): Promise<T> {
  return new Promise((resolve, reject) => wx.request<T>({
    url: __API_BASE_URL__ + path, method, data, timeout: 12_000,
    header: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    success(response) {
      if (response.statusCode >= 200 && response.statusCode < 300) { resolve(response.data); return; }
      const body = response.data as { message?: string | string[]; code?: string };
      reject(new ApiError(Array.isArray(body.message) ? body.message.join('；') : body.message || '请求失败，请重试', response.statusCode, body.code));
    }, fail() { reject(new ApiError('暂时连接不上，请检查网络后重试')); },
  }));
}
async function authenticate(force = false): Promise<string> {
  const saved = wx.getStorageSync(AUTH_KEY) as LoginResult | undefined;
  if (!force && saved?.token && Date.parse(saved.expiresAt) > Date.now() + 60_000) return saved.token;
  const shared = getApp<AuthApp>().globalData;
  if (shared.authFlight) return shared.authFlight;
  shared.authFlight = (async () => {
    let result: LoginResult;
    if (saved?.refreshToken) result = await raw<LoginResult>('/auth/refresh', 'POST', { refreshToken: saved.refreshToken });
    else {
      const catalog = await raw<{ authMode: 'guest' | 'wechat' }>('/catalog');
      const body: { code?: string } = {};
      if (catalog.authMode === 'wechat') body.code = await new Promise<string>((resolve, reject) => wx.login({ success: r => r.code ? resolve(r.code) : reject(new Error('微信登录失败')), fail: () => reject(new Error('微信登录失败，请重试')) }));
      result = await raw<LoginResult>('/auth/login', 'POST', body);
    }
    wx.setStorageSync(AUTH_KEY, result);
    return result.token;
  })();
  try { return await shared.authFlight; } finally { shared.authFlight = undefined; }
}
async function request<T extends object>(path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: object): Promise<T> {
  const token = await authenticate();
  try { return await raw<T>(path, method, data, token); }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) return raw<T>(path, method, data, await authenticate(true));
    throw error;
  }
}
function remember(player: PlayerState) { if (player.preferences) savePreferences(player.preferences); return player; }
function page<T>(items: T[], offset: number, limit: number): PageResult<T> { return { items: items.slice(offset, offset + limit), total: items.length, offset, limit }; }
export const api = {
  async bootstrap(): Promise<Bootstrap> {
    const result = isLocalDemo ? await local(player => ({ scenes: SCENES, products: PRODUCTS, player, serverTime: new Date().toISOString(), mode: 'local-demo' as const })) : await request<Bootstrap>('/bootstrap');
    remember(result.player); return result;
  },
  purchase(input: PurchaseInput): Promise<PurchaseResult> { return isLocalDemo ? local(p => purchase(p, input)) : request('/purchases', 'POST', input); },
  start(input: StartSessionInput): Promise<SessionResult> { return isLocalDemo ? local(p => startSession(p, input)) : request('/sessions', 'POST', input); },
  end(id: string): Promise<SessionResult> { return isLocalDemo ? local(p => endSession(p, id)) : request('/sessions/' + encodeURIComponent(id) + '/end', 'POST'); },
  progress(id: string, progress: Progress): Promise<SessionResult> { return isLocalDemo ? local(p => saveProgress(p, id, progress)) : request('/sessions/' + encodeURIComponent(id) + '/progress', 'PUT', progress); },
  claim(): Promise<PlayerState> { return isLocalDemo ? local(p => claimDaily(p)) : request('/wallet/daily-claim', 'POST'); },
  async preferences(patch: Partial<Preferences>): Promise<PlayerState> { return remember(isLocalDemo ? await local(p => updatePreferences(p, patch)) : await request<PlayerState>('/preferences', 'POST', patch)); },
  history(offset = 0, limit = 20): Promise<PageResult<Session>> { return isLocalDemo ? local(p => page(p.sessions.filter(s => s.status === 'ended').reverse(), offset, limit)) : request('/sessions?offset=' + offset + '&limit=' + limit); },
  ledger(offset = 0, limit = 20): Promise<PageResult<LedgerEntry>> { return isLocalDemo ? local(p => page([...(p.ledger ?? [])].reverse(), offset, limit)) : request('/wallet/ledger?offset=' + offset + '&limit=' + limit); },
};
