import { DEFAULT_PREFERENCES } from '../../../../../packages/domain/src/index';
import { api } from '../../services/api';
import { toastError } from '../../services/preferences';
Page({
  data: { ...DEFAULT_PREFERENCES, loading: true, busy: false, error: '', qualities: ['流畅优先','细腻画面'], qualityIndex: 1 },
  onLoad() { void this.refresh(); },
  async refresh() { this.setData({ loading: true, error: '' }); try { const { player } = await api.bootstrap(); const prefs=player.preferences ?? DEFAULT_PREFERENCES; this.setData({ ...prefs, qualityIndex: prefs.quality === 'high' ? 1 : 0 }); } catch(error){this.setData({error:error instanceof Error?error.message:'加载失败'});} finally { this.setData({loading:false}); } },
  async change(event: WechatMiniprogram.SwitchChange) {
    const key = event.currentTarget.dataset.key as 'sound' | 'vibration';
    if(this.data.busy || !['sound','vibration'].includes(key))return;
    this.setData({busy:true});
    try { await api.preferences({[key]:event.detail.value});this.setData({[key]:event.detail.value}); }
    catch(error){toastError(error);this.setData({[key]:this.data[key]});} finally {this.setData({busy:false});}
  },
  async quality(event: WechatMiniprogram.PickerChange) {
    if(this.data.busy)return;const qualityIndex=Number(event.detail.value);const quality=qualityIndex===1?'high':'standard';
    this.setData({busy:true});try{await api.preferences({quality});this.setData({quality,qualityIndex});}catch(error){toastError(error);}finally{this.setData({busy:false});}
  },
});

