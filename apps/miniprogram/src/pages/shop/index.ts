import { getTimeContext, PRODUCTS } from '../../../../../packages/domain/src/index';
import { api } from '../../services/api';
import { toastError } from '../../services/preferences';
Page({
  data: { imageErrors: {} as Record<string, boolean>, products: [...PRODUCTS].sort((a, b) => Number(!!b.brand) - Number(!!a.brand)).map(p => ({ ...p, owned: 0 })), coins: 0, claimed: false, loading: true, busy: false, error: '' },
  imageError(event: WechatMiniprogram.TouchEvent) { this.setData({ imageErrors: { ...this.data.imageErrors, [String(event.currentTarget.dataset.id)]: true } }); },
  onShow() { void this.refresh(); },
  async refresh() {
    this.setData({ loading: true, error: '' });
    try {
      const { products, player, serverTime } = await api.bootstrap();
      this.setData({ products: [...products].sort((a, b) => Number(!!b.brand) - Number(!!a.brand)).map(p => ({ ...p, owned: player.inventory[p.id] ?? 0 })), coins: player.coins, claimed: player.lastClaimDay === getTimeContext(new Date(serverTime)).day });
    } catch (error) { this.setData({ error: error instanceof Error ? error.message : '货架暂时没准备好' }); }
    finally { this.setData({ loading: false }); }
  },
  detail(event: WechatMiniprogram.TouchEvent) { wx.navigateTo({ url: '/pages/product/index?id=' + encodeURIComponent(String(event.currentTarget.dataset.id)) }); },
  wallet() { wx.navigateTo({ url: '/pages/wallet/index' }); },
  async claim() {
    if (this.data.busy || this.data.claimed || this.data.loading) return;
    this.setData({ busy: true });
    try { const player = await api.claim(); this.setData({ coins: player.coins, claimed: true }); wx.showToast({ title: '今日补给已领取', icon: 'success' }); }
    catch (error) { toastError(error); } finally { this.setData({ busy: false }); }
  },
});

