import type { Product, Scene, StoryEvent } from './types';

export const SCENES: Scene[] = [
  { id: 'office-restroom', name: '公司厕所', description: '关上隔间门，暂时离开工位。', theme: 'toilet' },
  { id: 'balcony', name: '出租屋阳台', description: '近处是栏杆，远处是城市的灯。', theme: 'balcony' },
];

export const PRODUCTS: Product[] = [
  { id: 'plain', name: '留白', subtitle: '基础款 · 随时可用', color: '#d4c5aa', price: 0, packSize: 0, unlimited: true },
  { id: 'rain', name: '雨后', subtitle: '原创虚拟外观 · 10 支 / 盒', color: '#7eaaa7', price: 20, packSize: 10, unlimited: false },
  { id: 'night', name: '夜班', subtitle: '原创虚拟外观 · 10 支 / 盒', color: '#8b89b5', price: 30, packSize: 10, unlimited: false },
];

export const STORY_EVENTS: StoryEvent[] = [
  { id: 'toilet-morning', text: '点上一支烟，开启粑粑时间。', sceneIds: ['office-restroom'], startMinute: 360, endMinute: 720, weekdays: [1, 2, 3, 4, 5], weight: 8, cooldownMinutes: 60, enabled: true },
  { id: 'toilet-morning-break', text: '会议还没开始，先在这里待一会儿。', sceneIds: ['office-restroom'], startMinute: 480, endMinute: 720, weekdays: [1, 2, 3, 4, 5], weight: 3, cooldownMinutes: 60, enabled: true },
  { id: 'toilet-afternoon', text: '暂时离开工位，给自己放个小假。', sceneIds: ['office-restroom'], startMinute: 720, endMinute: 1080, weekdays: [1, 2, 3, 4, 5], weight: 6, cooldownMinutes: 60, enabled: true },
  { id: 'toilet-overtime', text: '走廊安静了，办公室的灯还亮着。', sceneIds: ['office-restroom'], startMinute: 1200, endMinute: 240, weight: 5, cooldownMinutes: 90, enabled: true },
  { id: 'toilet-common-a', text: '门外传来脚步声，又渐渐远了。', sceneIds: ['office-restroom'], startMinute: 0, endMinute: 1440, weight: 1, cooldownMinutes: 10, fallback: true, enabled: true },
  { id: 'toilet-common-b', text: '把门带上，留一点自己的时间。', sceneIds: ['office-restroom'], startMinute: 0, endMinute: 1440, weight: 1, cooldownMinutes: 10, fallback: true, enabled: true },
  { id: 'balcony-evening', text: '晚饭的香味，从楼下飘了上来。', sceneIds: ['balcony'], startMinute: 1020, endMinute: 1200, weight: 5, cooldownMinutes: 60, enabled: true },
  { id: 'balcony-night', text: '楼下的灯，一盏盏灭了。', sceneIds: ['balcony'], startMinute: 1320, endMinute: 300, weight: 6, cooldownMinutes: 60, enabled: true },
  { id: 'balcony-night-wind', text: '远处还有车声，风从栏杆间穿过。', sceneIds: ['balcony'], startMinute: 1200, endMinute: 360, weight: 4, cooldownMinutes: 60, enabled: true },
  { id: 'balcony-common-a', text: '今天没什么大事，就是想待一会儿。', sceneIds: ['balcony'], startMinute: 0, endMinute: 1440, weight: 1, cooldownMinutes: 10, fallback: true, enabled: true },
  { id: 'balcony-common-b', text: '看看眼前的街道，时间慢了一点。', sceneIds: ['balcony'], startMinute: 0, endMinute: 1440, weight: 1, cooldownMinutes: 10, fallback: true, enabled: true },
];
