import { getTimeContext, type LedgerEntry, type RewardOptions } from '../../../../../packages/domain/src/index';
import { api, isLocalDemo } from '../../services/api';
import { formatDate, toastError } from '../../services/preferences';
import { RewardedAdPlayer } from '../../services/rewarded-ad';
type Row = LedgerEntry & { date: string; amountLabel: string };
const PENDING_AD_KEY = 'smoke-completed-ad:' + (isLocalDemo ? 'local' : __API_BASE_URL__);
Page({
  data: { coins: 0, claimed: false, loading: true, busy: false, loadingMore: false, error: '', rewardError: '', pendingAd: false, rows: [] as Row[], total: 0,
    rewards: { mode: 'unavailable', watchedCount: 0, nextAmount: 50, amounts: [50, 100, 200] } as RewardOptions },
  refreshing: false,
  disposed: false,
  adPlayer: undefined as RewardedAdPlayer | undefined,
  onShow() { if (!this.data.busy) void this.refresh(); },
  onUnload() { this.disposed = true; this.adPlayer?.cancel?.(); },
  async refresh() {
    if (this.refreshing || this.data.loadingMore) return;
    this.refreshing = true;
    this.setData({ loading: true, error: '', pendingAd: !!wx.getStorageSync(PENDING_AD_KEY) });
    try {
      const [boot, list] = await Promise.all([api.bootstrap(), api.ledger()]);
      this.setData({ coins: boot.player.coins, claimed: boot.player.lastClaimDay === getTimeContext(new Date(boot.serverTime)).day, rewards: boot.rewards, rows: this.mapRows(list.items), total: list.total });
    } catch (e) { this.setData({ error: e instanceof Error ? e.message : '加载失败' }); }
    finally { this.refreshing = false; this.setData({ loading: false }); }
  },
  mapRows(items: LedgerEntry[]): Row[] { return items.map(item => ({ ...item, title: item.title.replace('兑换 · ', '购买 · '), date: formatDate(item.createdAt), amountLabel: (item.amount > 0 ? '+￥' : '-￥') + Math.abs(item.amount) })); },
  async claim() {
    if (this.data.loadingMore || this.data.loading || this.data.error || this.data.busy || this.data.claimed) return;
    this.setData({ busy: true });
    try { await api.claim(); await this.refresh(); wx.showToast({ title: '今日补给已领取', icon: 'success' }); }
    catch (e) { toastError(e); } finally { this.setData({ busy: false }); }
  },
  async watchAd() {
    if (this.data.busy || this.data.loading || this.data.loadingMore || this.data.error) return;
    this.setData({ busy: true, rewardError: '' });
    try {
      let ticketId = wx.getStorageSync(PENDING_AD_KEY) as string;
      if (!ticketId) {
        const boot = await api.bootstrap();
        this.setData({ rewards: boot.rewards });
        if (boot.rewards.mode === 'unavailable') throw new Error('广告暂未开放');
        if (!boot.rewards.nextAmount) throw new Error('今天的三次奖励已领完，明天再来');
        const ticket = await api.beginAd();
        if (this.disposed) return;
        this.adPlayer ??= new RewardedAdPlayer();
        const completed = await this.adPlayer.watch(boot.rewards);
        if (this.disposed) return;
        if (!completed) { this.setData({ rewardError: '完整观看后才能领取奖励，本次未扣除奖励次数。' }); return; }
        ticketId = ticket.id;
        wx.setStorageSync(PENDING_AD_KEY, ticketId);
        this.setData({ pendingAd: true });
      }
      const result = await api.claimAd(ticketId);
      wx.removeStorageSync(PENDING_AD_KEY);
      this.setData({ coins: result.player.coins, pendingAd: false });
      wx.showToast({ title: '+' + result.amount + ' 元已到账', icon: 'none' });
      await this.refresh();
    } catch (e) {
      if (e instanceof Error && 'code' in e && ['AD_TICKET_NOT_FOUND', 'AD_TICKET_EXPIRED', 'AD_DAILY_LIMIT'].includes(String(e.code))) {
        wx.removeStorageSync(PENDING_AD_KEY); this.setData({ pendingAd: false });
      }
      this.setData({ rewardError: e instanceof Error ? e.message : '奖励暂未到账，请重试' });
    } finally { if (!this.disposed) this.setData({ busy: false }); }
  },
  async more() {
    if (this.data.busy || this.data.loading || this.data.error || this.data.loadingMore || this.data.rows.length >= this.data.total) return;
    this.setData({ loadingMore: true });
    try { const list = await api.ledger(this.data.rows.length); this.setData({ rows: [...this.data.rows, ...this.mapRows(list.items)], total: list.total }); }
    catch (e) { toastError(e); } finally { this.setData({ loadingMore: false }); }
  },
  onReachBottom() { void this.more(); },
});
