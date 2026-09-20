# 此刻 · 第一人称抽烟模拟器

微信原生小程序 + NestJS + PostgreSQL。当前已完成主要页面与基本业务闭环，可在本地演示或持久化 API 模式使用。

- [项目大纲](./项目大纲.md)
- [API 文档](./docs/API.md)
- [本轮交付说明](./docs/功能完成情况.md)
- [验证记录](./docs/验证记录.md)

## 已有功能

- 7 个页面：第一人称体验、货架橱窗、收藏、商品详情、设置、火花币流水、历史情境。
- Canvas 原创绘制的公司厕所和阳台场景、双手、打火机、烟支、烟雾和抖灰反馈。
- 点燃、长按吸入、松开、自然燃烧、抖灰、结束；音效与震动可关闭。
- 当前时间自动获取，用户选地点；事件按北京时间、地点、星期、权重和冷却生成。
- 原创虚拟商品兑换、库存、基础款、每日补给、偏好同步、进度保存与恢复。
- 持久化账号和登录凭证；本地游客登录、可配置微信 code2Session 登录。
- 数据库事务与玩家行锁防重复扣款/扣库存，操作幂等，独立钱包账本，分页历史。
- 默认本地嵌入式 PostgreSQL（PGlite）落盘；配置 DATABASE_URL 后使用独立 PostgreSQL。

这是主要功能版本，尚未进行真实微信授权、微信专用编译器或真机验收，不等于已提审或上线。

## 技术栈

| 层 | 实现 |
| --- | --- |
| 小程序 | 原生 WXML / WXSS / Canvas 2D + TypeScript 5.9 |
| 构建 | esbuild，原生微信页面输出，无 Node 运行时依赖 |
| 后端 | Node.js 22.12+、NestJS 11、TypeScript |
| 数据库 | PostgreSQL；本地 PGlite 0.5，独立数据库用 pg 8 |
| 验证 | TypeScript、Node test runner、真实 HTTP + 数据库测试、页面逻辑测试 |
| 工程 | npm workspaces，共享领域包 |

安装环境建议 Node.js 22 LTS（至少 22.12.0）、npm 10+。

## 一、快速查看小程序

在根目录执行：

```powershell
npm ci --ignore-scripts
npm run build:mini
```

微信开发者工具导入本项目根目录（包含 project.config.json）。输出目录已配置为 apps/miniprogram/dist。默认 touristappid 可用于游客预览，工具要求时换成自己的测试 AppID。

默认本地演示无需后端，使用微信 Storage 保存数据。前端开发监听：

```powershell
npm run dev:mini
```

新增页面需重启监听，不要编辑 dist。

## 二、使用持久化后端

第一个终端：

```powershell
npm run dev:api
```

默认地址 http://127.0.0.1:3000/api/v1。首次启动会初始化本项目 .data/pglite，稍需等待；后续重启会保留玩家、余额、库存、登录凭证与会话。只启动一个使用该嵌入式目录的后端进程。

第二个终端：

```powershell
$env:SMOKE_USE_MOCK = 'false'
$env:SMOKE_API_BASE_URL = 'http://127.0.0.1:3000/api/v1'
npm run build:mini
```

微信开发者工具模拟器本地联调时，在详情中临时关闭合法域名校验。项目默认仍启用校验。手机上的 127.0.0.1 指向手机自身，真机需要可达的 HTTPS 服务及合法域名。

API 模式按后端 catalog 返回的登录方式处理：guest 自动建立开发游客，wechat 调用 wx.login。请求失败不会自动回退到本地演示。游客凭证保存在微信 Storage，清除缓存后无法找回游客账号；正式微信登录绑定稳定身份。

恢复本地演示：

```powershell
$env:SMOKE_USE_MOCK = 'true'
npm run build:mini
```

本地演示和 API 是两套独立存档，不自动迁移旧演示余额。v0.1 的内存 API 数据不能恢复。

## 三、配置独立 PostgreSQL 与微信登录

复制 apps/api/.env.example 为同目录 .env，设置：

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/smoke_mock
AUTH_MODE=wechat
WECHAT_APP_ID=你的小程序AppID
WECHAT_APP_SECRET=你的服务端Secret
```

Secret 只留在后端，不写入小程序。没有配置真实凭证时，不要切换 wechat 模式。

数据库当前使用玩家聚合 JSONB + 独立登录令牌表、钱包流水表和迁移版本表，见 docs/database/schema.sql。所有经济变更和账本写入处于同一事务中；玩家行锁串行处理同一账号的修改。后续数据规模增长时再拆分库存/会话表，避免 JSONB 全量重写成为瓶颈。

生产模式要求独立 PostgreSQL 和微信登录，并默认禁止自动建表。首次显式迁移：

```powershell
npm run db:migrate
```

迁移仅使用 smoke_ 前缀表，不要执行旧版本的大纲草案建表脚本。正式发布仍需 HTTPS、域名、类目/备案、隐私和真机验收，以及网关限流与运维备份；本轮未部署服务。

根目录 compose.yaml 是可选本地 PostgreSQL 容器配置。复制根 .env.example 设置自己的本地数据库密码后，可以手动运行 docker compose up -d db。本轮测试使用独立的临时 PGlite 数据目录，不需要也不会自动启动 Docker。

## 四、验证与开发命令

| 命令 | 用途 |
| --- | --- |
| npm run check | 类型检查、测试、构建、页面/事件绑定/资源检查 |
| npm test | 领域、数据库 HTTP、前端主要流程测试 |
| npm run build | 全工程构建 |
| npm run dev:api | 编译并启动 API，不自动监听 TS |
| npm run dev:mini | 前端源码监听 |
| npm run db:migrate | 显式迁移独立 PostgreSQL |
| npm run assets:audio | 重新生成 3 段原创合成音效 |
| npm run preview:pages | 从实际 WXML/WXSS 生成只读浏览器视觉预览 |

preview:pages 需先 build:mini，输出 artifacts/preview/index.html；它不是微信运行时，只用于布局检查。截图脚本可用已安装的 Playwright 和 Chromium，接受包路径与浏览器可执行文件参数，不自动下载浏览器。

测试在 .cache/api-tests 中创建隔离数据库，结束后关闭监听和数据库；数据目录保留便于检查，可在确认不需要时自行清理。npm 缓存也在项目 .cache 中。

## 五、目录与维护

```text
apps/miniprogram/src/
  pages/          7 个主要页面
  rendering/      第一人称 Canvas 绘制
  services/       API、本地演示、设置和音效
  assets/audio/   原创合成 WAV
apps/api/src/
  database.service.ts / schema.ts     数据库适配与迁移
  auth.service.ts / auth.guard.ts     登录与令牌验证
  player.repository.ts               事务仓储
  game.service.ts / controllers.ts    业务与接口
packages/domain/src/
  catalog.ts      商品、场景、事件库
  events.ts       时间和随机规则
  player.ts       兑换、库存、进度、补给和偏好
```

事件暂通过 catalog.ts 维护，修改后重新构建并重启 API。用户始终不填写或选择事件。场景图像由代码原创绘制，没有引用参考产品素材。手绘式画面是当前实现，后续可按需要替换写实美术。

依赖锁定在 package-lock.json。根配置保留 multer 2.3.0 安全修复覆盖；升级 NestJS 后需重新审查。当前工程没有文件上传和真实支付。

