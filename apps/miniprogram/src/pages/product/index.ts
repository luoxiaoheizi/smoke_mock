import { PRODUCTS, type Product } from '../../../../../packages/domain/src/index';
import { api, operationId, completeOperation } from '../../services/api';
import { toastError } from '../../services/preferences';
Page({
  data: { imageFailed: false, product: PRODUCTS[0]! as Product, coins: 0, owned: 0, loading: true, busy: false, error: '', bought: false },
  imageError() { this.setData({ imageFailed: true }); },
  productId: '',
  onLoad(options: Record<string,string>) { this.productId = options.id ?? ''; },
  onShow() { return this.refresh(); },
  async refresh() {
    if (this.data.busy || this.refreshing) return;
    this.refreshing = true;
    this.setData({ loading: true, error: '' });
    try {
      const { products, player } = await api.bootstrap();
      const product = products.find(p => p.id === this.productId);
      if (!product) throw new Error('这款商品没有找到，请返回橱窗重新选择');
      this.setData({ product, coins: player.coins, owned: player.inventory[product.id] ?? 0 });
    } catch (error) { this.setData({ error: error instanceof Error ? error.message : '加载失败' }); }
    finally { this.refreshing = false; this.setData({ loading: false }); }
  },
  refreshing: false,
  async buy() {
    if (this.data.busy || this.data.loading || this.data.error) return;
    if (this.data.product.unlimited) { await this.use(); return; }
    this.setData({ busy: true });
    const key = 'purchase:' + this.productId;
    try {
      const { player } = await api.purchase({ requestId: operationId(key), productId: this.productId });
      completeOperation(key);
      this.setData({ coins: player.coins, owned: player.inventory[this.productId] ?? 0, bought: true });
      wx.showToast({ title: '已购买 20 支', icon: 'success' });
    } catch (error) { toastError(error); } finally { this.setData({ busy: false }); }
  },
  async use() {
    if (this.data.busy || this.data.loading || this.data.error) return;
    this.setData({ busy: true });
    try { await api.preferences({ productId: this.productId }); wx.switchTab({ url: '/pages/experience/index' }); }
    catch (error) { toastError(error); } finally { this.setData({ busy: false }); }
  },
  wallet() { wx.navigateTo({ url: '/pages/wallet/index' }); },
});
