// 微信模板的浏览器排版检查；不替代原生微信运行时的交互验收。
const { chromium } = require(process.argv[2] || 'playwright');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
  const results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../artifacts/preview/index.html')).href);
    await page.waitForFunction(() => document.querySelectorAll('iframe').length === 7);
    for (const width of [320, 390, 430]) {
      for (const state of ['ready', 'loading', 'error', 'long']) {
        await page.evaluate(({ width, state }) => {
          for (const p of window.previewPages) {
            const frame = document.querySelector(`iframe[data-route="${p.route}"]`);
            frame.style.width = width + 'px';
            frame.style.height = (width === 320 ? 568 : 780) + 'px';
            const data = { ...p.data, showStory: false };
            if (state === 'loading') data.loading = true;
            if (state === 'error') data.error = '暂时连接不上，请检查网络后重试';
            if (state === 'long') {
              data.rows = p.route.includes('wallet')
                ? [{ id:'one', title:'每日补给 · 保留完整收支说明', date:'2026-09-21 10:16', balance:120, amount:20, amountLabel:'+20' }]
                : [{ id:'one', date:'2026-09-21 10:16', place:'出租屋阳台', product:'雨后', eventText:'晚饭的香味从楼下飘来，远处的车声渐渐远去。'.repeat(5) }];
              data.total = 1;
              if (p.route.includes('experience')) Object.assign(data, { showScenes:true });
            }
            window.renderPreview({ ...p, data }, frame);
          }
        }, { width, state });
        for (const frame of page.frames().slice(1)) {
          await frame.waitForFunction(() => [...document.images].every(img => img.complete));
          assert(await frame.evaluate(() => [...document.images].every(img => img.naturalWidth > 0)), '包装图应加载成功');
          const metrics = await frame.evaluate(() => {
            const button = [...document.querySelectorAll('button')].find(b => !b.disabled);
            if (button) button.focus();
            return {
              route: frameElement.dataset.route,
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
              textColor: getComputedStyle(document.querySelector('.screen')).color,
              focus: !button || getComputedStyle(button).outlineStyle !== 'none',
              unnamed: [...document.querySelectorAll('button')].filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
            };
          });
          assert(!metrics.overflow, `${metrics.route} / ${width} / ${state} 横向溢出`);
          assert(metrics.focus, `${metrics.route} 缺少聚焦样式`);
          assert.equal(metrics.unnamed, 0);
          assert.equal(metrics.textColor, 'rgb(36, 59, 50)', '预览没有正确继承文字令牌');
          results.push({ width, state, ...metrics });
        }
        if (width === 320 && state === 'long') {
          await page.locator('iframe[data-route="pages/experience/index"]').screenshot({ path:path.resolve(__dirname,'../artifacts/preview/scene-sheet-320.png'), animations:'disabled' });
          await page.locator('iframe[data-route="pages/history/index"]').screenshot({ path:path.resolve(__dirname,'../artifacts/preview/history-long-320.png'), animations:'disabled' });
        }
      }
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.resolve(__dirname,'../artifacts/preview/layout-report.json'), JSON.stringify({ scope:'WXML 浏览器转换排版，不是微信运行时', results }, null, 2));
    console.log(`${results.length} 个页面/宽度/状态组合通过：无横向溢出、按钮命名与聚焦可见、文字令牌正确。`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
