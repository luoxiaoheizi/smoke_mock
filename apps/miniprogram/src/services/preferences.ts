import { DEFAULT_PREFERENCES, type Preferences } from '../../../../packages/domain/src/index';
const KEY = __USE_MOCK__ ? 'smoke-preferences-v2-local' : 'smoke-preferences-v2-api';
export type { Preferences };
export function getPreferences(): Preferences {
  const saved = wx.getStorageSync(KEY);
  return { ...DEFAULT_PREFERENCES, ...(saved && typeof saved === 'object' ? saved : {}) };
}
export function savePreferences(value: Partial<Preferences>): void { wx.setStorageSync(KEY, { ...getPreferences(), ...value }); }
export function toastError(error: unknown): void { wx.showToast({ title: error instanceof Error ? error.message : '操作失败，请重试', icon: 'none', duration: 2600 }); }
export function formatDate(value: string): string {
  const date = new Date(Date.parse(value) + 8 * 3600_000);
  return date.toISOString().slice(5, 16).replace('T', ' ');
}

