import { createApp } from './app';
async function main() {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须是 1–65535 的整数');
  const app = await createApp();
  try { await app.listen(port, process.env.HOST ?? '127.0.0.1'); }
  catch (error) { await app.close(); throw error; }
  console.log('服务已就绪，默认数据保存在项目 .data/pglite，API 路径 /api/v1');
}
main().catch(error => { console.error(error instanceof Error ? error.message : '服务启动失败'); process.exitCode = 1; });

