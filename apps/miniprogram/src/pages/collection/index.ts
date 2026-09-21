import { PRODUCTS } from '../../../../../packages/domain/src/index';
import { api } from '../../services/api';
import { toastError } from '../../services/preferences';
Page({
  data: { imageErrors: {} as Record<string, boolean>, products: PRODUCTS.map(p => ({ ...p, owned: 0 })), selectedId: 'plain', loading: true, busy: false, error: '', coins: 0 },
  imageError(event: WechatMiniprogram.TouchEvent) { this.setData({ imageErrors: { ...this.data.imageErrors, [String(event.currentTarget.dataset.id)]: true } }); },
  onShow() { void this.refresh(); },
  async refresh() {
    this.setData({ loading: true, error: '' });
    try {
      const { player, products } = await api.bootstrap();
      this.setData({ products: products.map(p => ({ ...p, owned: player.inventory[p.id] ?? 0 })), selectedId: player.preferences?.productId ?? 'plain', coins: player.coins });
    } catch (error) { this.setData({ error: error instanceof Error ? error.message : '加载失败' }); }
    finally { this.setData({ loading: false }); }
  },
  async select(event: WechatMiniprogram.TouchEvent) {
    if (this.data.busy || this.data.loading) return;
    const product = this.data.products.find(p => p.id === event.currentTarget.dataset.id);
    if (!product) return;
    if (!product.unlimited && product.owned === 0) { wx.navigateTo({ url: '/pages/product/index?id=' + product.id }); return; }
    this.setData({ busy: true });
    try { await api.preferences({ productId: product.id }); this.setData({ selectedId: product.id }); wx.showToast({ title: '下一轮就用它', icon: 'none' }); }
    catch (error) { toastError(error); } finally { this.setData({ busy: false }); }
  },
  goSettings() { wx.navigateTo({ url: '/pages/settings/index' }); },
  goWallet() { wx.navigateTo({ url: '/pages/wallet/index' }); },
  goHistory() { wx.navigateTo({ url: '/pages/history/index' }); },
  goExperience() { wx.switchTab({ url: '/pages/experience/index' }); },
});

