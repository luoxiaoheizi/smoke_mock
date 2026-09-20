import { DEFAULT_PREFERENCES, getTimeContext, SCENES, type Session, type Progress } from '../../../../../packages/domain/src/index';
import { api, isLocalDemo, operationId, completeOperation, ApiError } from '../../services/api';
import { getPreferences, toastError } from '../../services/preferences';
import { playSound, stopSound } from '../../services/sound';
import { SceneRenderer, type Phase } from '../../rendering/scene';
const VISUAL_KEY = isLocalDemo ? 'smoke-visual-v2-local' : 'smoke-visual-v2-api';
type SavedVisual = Progress & { sessionId: string };
Page({
  data: {
    scenes: SCENES, sceneId: 'office-restroom', sceneName: '公司厕所', theme: 'toilet' as 'toilet' | 'balcony',
    productName: '留白', color: '#d4c5aa', time: '--:--', period: 'day' as 'day' | 'dusk' | 'night',
    eventText: '', sessionId: '', phase: 'ready' as Phase, remaining: 100, ash: 0,
    showStory: false, showScenes: false, loading: true, busy: false, error: '', syncFailed: false,
    hint: '留一点时间，给此刻。', completed: false, highQuality: true, canvasFailed: false,
  },
  visible: false, renderer: new SceneRenderer(), canvas: undefined as WechatMiniprogram.Canvas | undefined,
  context: undefined as WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D | undefined,
  width: 390, height: 760, frame: 0, lastFrame: 0, lastTick: 0, exhaleAt: 0, ashAt: 0, revision: 0,
  timer: undefined as ReturnType<typeof setInterval> | undefined,
  actionTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  storyTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  syncTask: Promise.resolve(), refreshVersion: 0,
  onReady() { this.initCanvas(); },
  onShow() { this.visible = true; void this.refresh(); this.animate(); },
  onHide() { this.visible = false; this.pause(); },
  onUnload() { this.visible = false; this.pause(); },
  onResize() { this.stopFrames(); this.initCanvas(); },
  initCanvas() {
    wx.createSelectorQuery().in(this).select('#sceneCanvas').fields({ node: true, size: true }).exec((results: Array<{ node?: WechatMiniprogram.Canvas; width?: number; height?: number }>) => {
      const result = results[0];
      if (!result?.node || !result.width || !result.height) { this.setData({ canvasFailed: true }); return; }
      this.canvas = result.node; this.width = result.width; this.height = result.height;
      const ratio = Math.min(wx.getWindowInfo().pixelRatio, getPreferences().quality === 'high' ? 2 : 1.5);
      this.canvas.width = this.width * ratio; this.canvas.height = this.height * ratio;
      this.context = this.canvas.getContext('2d'); this.context!.scale(ratio, ratio);
      this.setData({ canvasFailed: false }); this.animate();
    });
  },
  animate() {
    if (!this.visible || !this.canvas || !this.context || this.frame) return;
    const draw = () => {
      this.frame = 0;
      if (!this.visible || !this.canvas || !this.context) return;
      const now = Date.now();
      if (now - this.lastFrame >= (this.data.highQuality ? 32 : 65)) {
        this.renderer.draw(this.context, this.width, this.height, { theme: this.data.theme, period: this.data.period, phase: this.data.phase,
          remaining: this.data.remaining, ash: this.data.ash, color: this.data.color, time: now, exhaleAt: this.exhaleAt, ashAt: this.ashAt, highQuality: this.data.highQuality });
        this.lastFrame = now;
      }
      this.frame = this.canvas.requestAnimationFrame(draw);
    };
    this.frame = this.canvas.requestAnimationFrame(draw);
  },
  stopFrames() { if (this.canvas && this.frame) this.canvas.cancelAnimationFrame(this.frame); this.frame = 0; },
  async refresh() {
    const version = ++this.refreshVersion;
    this.setData({ loading: true, error: '' });
    try {
      await this.syncTask;
      const result = await api.bootstrap();
      if (version !== this.refreshVersion) return;
      const prefs = result.player.preferences ?? DEFAULT_PREFERENCES;
      const active = result.player.sessions.find(s => s.status === 'active');
      const scene = result.scenes.find(s => s.id === (active?.sceneId ?? prefs.sceneId)) ?? result.scenes[0]!;
      let product = result.products.find(p => p.id === (active?.productId ?? prefs.productId)) ?? result.products[0]!;
      if (!active && !product.unlimited && !(result.player.inventory[product.id]! > 0)) {
        await api.preferences({ productId: 'plain' }); product = result.products.find(p => p.id === 'plain')!;
        wx.showToast({ title: '上一款已用完，已为你换成留白', icon: 'none' });
      }
      const time = getTimeContext(new Date(result.serverTime));
      this.setData({ scenes: result.scenes, sceneId: scene.id, sceneName: scene.name, theme: scene.theme, productName: product.name, color: product.color,
        time: active?.timeLabel ?? time.label, period: active?.period ?? time.period, sessionId: active?.id ?? '', eventText: active?.eventText ?? '', highQuality: prefs.quality === 'high' });
      if (active) this.restore(active);
      else { this.setData({ phase: 'ready', remaining: 100, ash: 0, hint: '留一点时间，给此刻。' }); this.startTick(); }
    } catch (error) { if (version === this.refreshVersion) this.setData({ error: error instanceof Error ? error.message : '加载失败，请重试' }); }
    finally { if (version === this.refreshVersion) this.setData({ loading: false }); }
  },
  restore(session: Session) {
    const saved = wx.getStorageSync(VISUAL_KEY) as SavedVisual | undefined;
    const server = session.progress ?? { remaining: 100, ash: 0, phase: 'ready', revision: 0 };
    const valid = saved?.sessionId === session.id && Number.isFinite(saved.remaining) && saved.remaining >= 0 && saved.remaining <= 100 && saved.revision >= server.revision;
    const progress = valid ? saved : server;
    this.revision = progress.revision;
    this.setData({ phase: progress.phase, remaining: progress.remaining, ash: progress.ash, hint: progress.remaining <= 0 ? '已燃尽，结束这一刻。' : progress.phase === 'ready' ? '轻触打火机，点亮这一刻。' : '长按右手或下方按钮，松开吐出烟雾。' });
    this.startTick();
  },
  openScenes() {
    if (this.data.sessionId) { wx.showToast({ title: '结束这一刻后，就可以换个地方', icon: 'none' }); return; }
    if (!this.data.loading && !this.data.busy) this.setData({ showScenes: true });
  },
  closeScenes() { this.setData({ showScenes: false }); },
  async selectScene(event: WechatMiniprogram.TouchEvent) {
    if (this.data.busy || this.data.sessionId) return;
    const scene = this.data.scenes.find(s => s.id === event.currentTarget.dataset.id);
    if (!scene) return;
    this.setData({ busy: true });
    try { await api.preferences({ sceneId: scene.id }); this.setData({ sceneId: scene.id, sceneName: scene.name, theme: scene.theme, showScenes: false }); }
    catch (error) { toastError(error); } finally { this.setData({ busy: false }); }
  },
  async enter() {
    if (this.data.loading || this.data.busy || this.data.sessionId) return;
    this.setData({ busy: true, completed: false });
    const productId = getPreferences().productId;
    const key = 'start:' + this.data.sceneId + ':' + productId;
    try {
      const { session } = await api.start({ requestId: operationId(key), sceneId: this.data.sceneId, productId });
      completeOperation(key);
      if (session.status === 'ended') { await this.refresh(); return; }
      this.revision = 0;
      this.setData({ sessionId: session.id, time: session.timeLabel, period: session.period, eventText: session.eventText, showStory: this.visible,
        remaining: session.progress?.remaining ?? 100, ash: session.progress?.ash ?? 0, phase: session.progress?.phase ?? 'ready',
        hint: '轻触打火机，点亮这一刻。' });
      this.cacheProgress();
      if (this.visible) this.storyTimer = setTimeout(() => this.setData({ showStory: false }), 4500);
      this.startTick();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SESSION_ACTIVE') await this.refresh();
      else toastError(error);
    } finally { this.setData({ busy: false }); }
  },
  ignite() {
    if (!this.data.sessionId || this.data.phase !== 'ready' || this.data.busy || !this.visible) return;
    this.setData({ phase: 'lighting', hint: '火光亮了。' }); this.vibrate(); playSound('ignite');
    this.actionTimer = setTimeout(() => { this.setData({ phase: 'burning', hint: '长按右手或下方按钮，松开吐出烟雾。' }); this.save(); }, 1100);
  },
  inhale() {
    if (!this.data.sessionId || this.data.busy || this.data.phase !== 'burning' || this.data.remaining <= 0) return;
    this.setData({ phase: 'inhaling' }); this.vibrate();
  },
  release() {
    if (this.data.phase !== 'inhaling') return;
    this.exhaleAt = Date.now(); this.setData({ phase: 'burning' }); this.save();
  },
  ash() {
    if (this.data.phase !== 'burning' || this.data.busy || !this.data.sessionId) return;
    this.setData({ phase: 'ashing', ash: 0 }); this.ashAt = Date.now(); this.vibrate(); playSound('ash');
    this.actionTimer = setTimeout(() => { this.setData({ phase: 'burning' }); this.save(); }, 550);
  },
  async finish() {
    if (!this.data.sessionId || this.data.busy) return;
    const id = this.data.sessionId;
    this.clearTimers(); this.save();
    this.setData({ busy: true, phase: 'extinguishing', showStory: false }); playSound('end');
    try {
      await this.syncTask;
      await api.end(id);
      wx.removeStorageSync(VISUAL_KEY);
      this.setData({ sessionId: '', phase: 'ready', eventText: '', completed: true, hint: '这一刻，先到这里。', remaining: 100, ash: 0 });
      await this.refresh();
    } catch (error) { toastError(error); this.setData({ phase: 'burning' }); this.startTick(); }
    finally { this.setData({ busy: false }); }
  },
  startTick() {
    if (this.timer) clearInterval(this.timer);
    if (!this.visible) return;
    this.lastTick = Date.now(); let ticks = 0;
    this.timer = setInterval(() => {
      const now = Date.now(), delta = Math.min(2, (now - this.lastTick) / 1000); this.lastTick = now;
      if (!this.data.sessionId) { const context = getTimeContext(new Date()); this.setData({ time: context.label, period: context.period }); return; }
      if (!['burning','inhaling','ashing'].includes(this.data.phase) || this.data.busy) return;
      const rate = this.data.phase === 'inhaling' ? 1.5 : .22;
      const remaining = Math.max(0, this.data.remaining - rate * delta);
      this.setData({ remaining: Math.round(remaining * 100) / 100, ash: Math.min(25, this.data.ash + rate * delta * .7) });
      this.cacheProgress();
      if (++ticks % 10 === 0) this.save();
      if (remaining <= 0) { this.clearTimers(); void this.finish(); }
    }, 500);
  },
  cacheProgress(): SavedVisual {
    const progress: SavedVisual = { sessionId: this.data.sessionId, remaining: this.data.remaining, ash: this.data.ash,
      phase: this.data.phase === 'ready' ? 'ready' : 'burning', revision: ++this.revision };
    if (progress.sessionId) wx.setStorageSync(VISUAL_KEY, progress);
    return progress;
  },
  save() {
    if (!this.data.sessionId) return;
    const { sessionId, ...progress } = this.cacheProgress();
    this.syncTask = this.syncTask.then(async () => {
      try { await api.progress(sessionId, progress); this.setData({ syncFailed: false }); }
      catch { this.setData({ syncFailed: true }); }
    });
  },
  clearTimers() {
    if (this.timer) clearInterval(this.timer); if (this.actionTimer) clearTimeout(this.actionTimer); if (this.storyTimer) clearTimeout(this.storyTimer);
    this.timer = undefined; this.actionTimer = undefined; this.storyTimer = undefined;
  },
  pause() {
    this.clearTimers(); this.stopFrames(); stopSound();
    if (['lighting','inhaling','ashing'].includes(this.data.phase)) this.setData({ phase: 'burning' });
    this.setData({ showStory: false }); this.save();
  },
  retrySync() { this.save(); },
  goCollection() { wx.switchTab({ url: '/pages/collection/index' }); },
  goSettings() { wx.navigateTo({ url: '/pages/settings/index' }); },
  stopTap() {},
  vibrate() { if (getPreferences().vibration) wx.vibrateShort({ type: 'light', fail() {} }); },
});

