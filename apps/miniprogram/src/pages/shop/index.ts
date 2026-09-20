import { getTimeContext, PRODUCTS } from '../../../../../packages/domain/src/index';
import { api } from '../../services/api';
import { toastError } from '../../services/preferences';
Page({
  data: { products: PRODUCTS.map(p => ({ ...p, owned: 0 })), coins: 0, claimed: false, loading: true, busy: false, error: '' },
  onShow() { void this.refresh(); },
  async refresh() {
    this.setData({ loading: true, error: '' });
    try {
      const { products, player, serverTime } = await api.bootstrap();
      this.setData({ products: products.map(p => ({ ...p, owned: player.inventory[p.id] ?? 0 })), coins: player.coins, claimed: player.lastClaimDay === getTimeContext(new Date(serverTime)).day });
    } catch (error) { this.setData({ error: error instanceof Error ? error.message : '货架暂时没准备好' }); }
    finally { this.setData({ loading: false }); }
  },
  detail(event: WechatMiniprogram.TouchEvent) { wx.navigateTo({ url: '/pages/product/index?id=' + encodeURIComponent(String(event.currentTarget.dataset.id)) }); },
  wallet() { wx.navigateTo({ url: '/pages/wallet/index' }); },
  async claim() {
    if (this.data.busy || this.data.claimed || this.data.loading) return;
    this.setData({ busy: true });
    try { const player = await api.claim(); this.setData({ coins: player.coins, claimed: true }); wx.showToast({ title: '今日补给已到账', icon: 'success' }); }
    catch (error) { toastError(error); } finally { this.setData({ busy: false }); }
  },
});

