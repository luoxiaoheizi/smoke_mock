import { getPreferences } from './preferences';
let audio: WechatMiniprogram.InnerAudioContext | undefined;
export function playSound(name: 'ignite' | 'ash' | 'end') {
  if (!getPreferences().sound) return;
  stopSound();
  audio = wx.createInnerAudioContext();
  audio.src = '/assets/audio/' + name + '.wav'; audio.volume = .28;
  audio.onError(() => stopSound()); audio.onEnded(() => stopSound()); audio.play();
}
export function stopSound() { if (audio) { audio.stop(); audio.destroy(); audio = undefined; } }

