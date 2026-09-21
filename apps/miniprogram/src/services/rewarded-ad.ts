import type { RewardOptions } from '../../../../packages/domain/src/index';

/** 只有 SDK 明确报告 isEnded=true 才继续发奖。 */
export class RewardedAdPlayer {
  cancel?: () => void;
  watch(options: RewardOptions): Promise<boolean> {
    if (this.cancel) return Promise.reject(new Error('广告正在播放'));
    return new Promise((resolve, reject) => {
      let settled = false;
      let ad: WechatMiniprogram.RewardedVideoAd | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (completed: boolean, error?: Error) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        this.cancel = undefined;
        if (ad) { ad.offClose(onClose); ad.offError(onError); ad.destroy(); }
        if (error) reject(error); else resolve(completed);
      };
      const onClose = (result: WechatMiniprogram.RewardedVideoAdOnCloseListenerResult) => finish(result?.isEnded === true);
      const onError = () => finish(false, new Error('广告暂时无法播放，请稍后再试'));
      this.cancel = () => finish(false);
      try {
        if (options.mode === 'demo') {
          wx.showModal({ title: '广告奖励开发演示', content: '这里不会播放或计费真实广告。请选择模拟完整观看或中途关闭。', confirmText: '模拟看完', cancelText: '中途关闭', success: r => finish(r.confirm), fail: onError });
          return;
        }
        if (options.mode !== 'wechat' || !options.adUnitId) throw new Error('广告暂未开放');
        if (!wx.createRewardedVideoAd) throw new Error('当前微信版本不支持激励视频，请升级后重试');
        ad = wx.createRewardedVideoAd({ adUnitId: options.adUnitId });
        ad.onClose(onClose); ad.onError(onError);
        timer = setTimeout(() => finish(false, new Error('广告加载超时，请重试')), 20_000);
        void ad.load().then(() => { if (!settled) return ad!.show(); }).then(() => { if (timer) clearTimeout(timer); }).catch(onError);
      } catch (error) { finish(false, error instanceof Error ? error : new Error('广告暂时无法播放')); }
    });
  }
}
