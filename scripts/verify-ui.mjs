import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'apps/miniprogram/src');
const css = await readFile(join(source, 'app.wxss'), 'utf8');
const design = await readFile(join(root, 'DESIGN.md'), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*(#[\da-f]{6})/gi)].map(m => [m[1], m[2]]));
for (const [key, value] of Object.entries(tokens)) {
  assert(design.includes(`  ${key}: "${value}"`), `DESIGN.md 颜色漂移：${key}`);
}
for (const [variable, value] of [['radius-control','16rpx'],['radius-panel','24rpx'],['page-gutter','36rpx']]) {
  assert(css.includes(`--${variable}:${value}`), `布局令牌漂移：${variable}`);
}
function luminance(hex) {
  const c = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
}
for (const [fg, bg] of [['text','background'],['muted','background'],['muted','surface'],['primary','soft'],['on-primary','primary'],['danger','error-bg']]) {
  const values = [luminance(tokens[fg]), luminance(tokens[bg])].sort((a,b) => b-a);
  assert((values[0]+.05)/(values[1]+.05) >= 4.5, `正文对比度不足：${fg}/${bg}`);
}
const app = JSON.parse(await readFile(join(source, 'app.json'), 'utf8'));
assert.equal(app.window.backgroundColor, tokens.background);
assert.equal(app.window.navigationBarBackgroundColor, tokens.background);
assert.equal(app.tabBar.backgroundColor, tokens.background);
assert.equal(app.tabBar.selectedColor, tokens.primary);
assert.equal(app.tabBar.color, tokens.muted);
for (const route of app.pages) {
  const xml = await readFile(join(source, route + '.wxml'), 'utf8');
  const stack = [];
  for (const [tag, name] of xml.matchAll(/<\/?([a-z][\w-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/g)) {
    if (tag.startsWith('</')) assert.equal(stack.pop(), name, route + ' 标签未闭合');
    else if (!tag.endsWith('/>')) stack.push(name);
    if (tag.startsWith('<view') && /bindtap=/.test(tag)) {
      assert(/lighter-hotspot|modal-mask/.test(tag), route + ' 普通操作应使用 button');
    }
  }
  assert.equal(stack.length, 0, route + ' 标签未闭合');
  assert(!xml.includes('class="skeleton"'), '统一使用有文字的加载状态');
  const styles = css + await readFile(join(source, route + '.wxss'), 'utf8');
  for (const [,variable] of styles.matchAll(/var\((--[\w-]+)\)/g)) {
    assert(styles.includes(variable + ':'), `${route} 未定义令牌 ${variable}`);
  }
}
assert(css.includes('prefers-reduced-motion'));
assert(css.includes('focus-visible'));
console.log('UI 检查通过：7 页标签闭合、操作语义、令牌映射、6 组正文对比度、导航配色和动态偏好规则。');
