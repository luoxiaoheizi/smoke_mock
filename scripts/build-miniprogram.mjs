import { build, context } from 'esbuild';
import { cp, mkdir, readdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'apps/miniprogram/src');
const output = join(root, 'apps/miniprogram/dist');
const useMock = process.env.SMOKE_USE_MOCK !== 'false';
const apiUrl = process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:3000/api/v1';
const parsed = new URL(apiUrl);
if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('API 地址必须使用 HTTP 或 HTTPS');
const entries = [];
async function copyAssets(directory, collectEntries = true) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) { await copyAssets(file, collectEntries); continue; }
    if (entry.name.endsWith('.ts')) {
      if (collectEntries && (entry.name === 'app.ts' || file.includes(join('pages', '')) && entry.name === 'index.ts')) entries.push(file);
    } else {
      const target = join(output, relative(source, file));
      await mkdir(dirname(target), { recursive: true });
      await cp(file, target);
    }
  }
}
await mkdir(output, { recursive: true });
await copyAssets(source);
const options = {
  entryPoints: entries, outbase: source, outdir: output, bundle: true,
  platform: 'neutral', format: 'cjs', target: 'es2018', sourcemap: true,
  alias: { '@smoke/domain': join(root, 'packages/domain/src/index.ts') },
  define: { __USE_MOCK__: JSON.stringify(useMock), __API_BASE_URL__: JSON.stringify(apiUrl) },
  logLevel: 'info',
};
if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  // 监听模板和样式，TS 变更由 esbuild 自身处理。
  let copyTimer;
  const watcher = watch(source, { recursive: true }, (_event, filename) => {
    if (filename && !filename.endsWith('.ts')) {
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copyAssets(source, false).catch(console.error); }, 120);
    }
  });
  process.on('SIGINT', async () => { watcher.close(); await ctx.dispose(); process.exit(0); });
  console.log('正在监听小程序源码；新增页面后请重启此命令。');
} else {
  await build(options);
}
console.log(useMock ? '构建完成：本地演示模式，无需启动后端。' : '构建完成：持久化 API 模式。');
