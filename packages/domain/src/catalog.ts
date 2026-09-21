import type { Product, Scene, StoryEvent } from './types';

export const SCENES: Scene[] = [
  { id: 'office-restroom', name: '公司厕所', description: '关上隔间门，暂时离开工位。', theme: 'toilet' },
  { id: 'balcony', name: '出租屋阳台', description: '近处是栏杆，远处是城市的灯。', theme: 'balcony' },
];

export const PRODUCTS: Product[] = [
  { id: 'plain', name: '留白', subtitle: '素净原色，随时取用。', series: '常驻基础款', description: '把繁杂留在外面。素净的纸色，陪你度过那些平常的片刻。', color: '#d4c5aa', price: 0, packSize: 0, unlimited: true },
  { id: 'rain', name: '雨后', subtitle: '雨洗过的青绿色。', series: '原创外观', description: '一场雨过后，城市换了颜色。温柔的青绿，像窗边慢慢清晰的风景。', color: '#7eaaa7', price: 20, packSize: 20, unlimited: false },
  { id: 'night', name: '夜班', subtitle: '把夜色收进口袋。', series: '原创外观', description: '天色暗下来，有些时间才属于自己。把这一抹安静的紫，留给夜里的片刻。', color: '#8b89b5', price: 30, packSize: 20, unlimited: false },
  { id: 'zhonghua-hard', name: '中华（硬）', brand: '中华', subtitle: '红色硬盒 · 20 支 / 包', series: '品牌参考', description: '参考中华硬盒的红金包装。公开图鉴标注为烤烟型，以下为包装基础信息。', manufacturer: '上海烟草集团有限责任公司', packaging: '硬盒', lengthMm: 84, image: '/assets/products/zhonghua-hard.jpg', sourceUrl: 'https://www.ciggies.app/sku/187', color: '#a73530', price: 45, packSize: 20, unlimited: false },
  { id: 'hehua-hard', name: '钻石（荷花）', brand: '钻石', subtitle: '荷花系列 · 20 支 / 包', series: '品牌参考', description: '钻石品牌的荷花款，包装以绿色与荷花图案为主。公开图鉴标注为烤烟型。', manufacturer: '河北中烟工业有限责任公司', packaging: '硬盒', lengthMm: 84, image: '/assets/products/hehua-hard.jpg', sourceUrl: 'https://www.ciggies.app/sku/1968', color: '#557b48', price: 32, packSize: 20, unlimited: false },
  { id: 'yuxi-soft', name: '玉溪（软）', brand: '玉溪', subtitle: '红白软包 · 20 支 / 包', series: '品牌参考', description: '参考玉溪软包的红白配色与菱形标识。公开图鉴标注为烤烟型。', manufacturer: '红塔烟草（集团）有限责任公司', packaging: '软包', lengthMm: 84, image: '/assets/products/yuxi-soft.png', sourceUrl: 'https://www.ciggies.app/sku/282', color: '#b04735', price: 23, packSize: 20, unlimited: false },
  { id: 'baisha-hard', name: '白沙（硬）', brand: '白沙', subtitle: '白色硬盒 · 20 支 / 包', series: '品牌参考', description: '参考白沙硬盒的白底红字与古井双鹤图案。公开图鉴标注为烤烟型。', manufacturer: '湖南中烟工业有限责任公司', packaging: '硬盒', lengthMm: 84, image: '/assets/products/baisha-hard.png', sourceUrl: 'https://www.ciggies.app/sku/1', color: '#b15343', price: 6, packSize: 20, unlimited: false },
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
