# API v0.2

根路径 /api/v1。成功 GET/PUT 为 200，POST 为 201。参数校验禁止额外字段；微信 wx.request 不支持 PATCH，本工程采用 POST 更新偏好、PUT 保存完整进度。

## 登录

GET /catalog 返回 products、scenes、authMode，不要求登录。

POST /auth/login：guest 模式提交 {}；wechat 模式提交 {"code":"wx.login 返回值"}。游客登录只允许开发环境，不接受客户端指定身份。

返回 token、refreshToken、expiresAt。token 为 256 位随机字符串；数据库只保存凭证哈希。访问令牌有效期 7 天，续期凭证 180 天。

POST /auth/refresh：提交 {"refreshToken":"..."}，获得新的访问令牌，原访问令牌失效。续期保持同一玩家，不重置存档。

受保护接口统一使用 Authorization: Bearer TOKEN。已经移除 x-demo-client-id 伪身份。微信 session_key 不会返回给客户端。

## 接口

| 方法 | 路径 | 请求 | 响应 |
| --- | --- | --- | --- |
| GET | /health | 无 | status、storage |
| GET | /catalog | 无 | 商品、场景、authMode |
| GET | /bootstrap | Bearer | 目录、玩家快照、serverTime |
| POST | /purchases | requestId、productId | purchase、player |
| POST | /sessions | requestId、sceneId、productId | session、player |
| PUT | /sessions/:id/progress | remaining、ash、phase、revision | session、player |
| POST | /sessions/:id/end | 无 | session、player |
| GET | /sessions?offset=0&limit=20 | 分页参数 | 已结束体验列表 |
| POST | /wallet/daily-claim | 无 | player |
| GET | /wallet/ledger?offset=0&limit=20 | 分页参数 | 钱包流水列表 |
| POST | /preferences | 可选偏好字段 | player |

分页结果为 items、total、offset、limit，limit 最大 50。bootstrap 和写操作中的 player 只返回最近 20 条会话、购买和账本记录；数据库保留完整记录。

## 进度与偏好

进度：remaining 为 0–100；ash 为 0–30；phase 为 ready 或 burning；revision 为递增整数。其余短暂动画只在前端运行。迟到或重复的 revision 不覆盖新进度，剩余量不能增加，已经点燃后不能回到 ready。结束后的更新不再生效。

偏好：sceneId、productId、vibration、sound、quality（standard/high）。类型严格校验，不能选用未持有的非免费商品。偏好不会修改已经开始的会话。

## 经济、会话与错误

- 服务端决定商品价格、支数、事件与时间。客户端不能注入 price/eventId/time。
- requestId 是 8–100 位字母、数字、下划线或短横线。前端把未确认操作的编号落本地，重试沿用。
- 同编号同参数返回原结果；不同参数返回 REQUEST_CONFLICT。
- 同一玩家同时只能有一个活动会话；活动状态通过玩家行锁保护。
- 兑换、开局、补给与设置/进度使用数据库事务；钱包流水与经济变更原子提交。
- 开局消耗一支，免费留白不限量。尚未点燃后结束也不返还，这与产品当前规则一致。
- 每日补给以服务端北京时间自然日去重。
- 400 参数错误；401 身份无效；404 对象不存在；409 业务冲突；503 微信服务暂不可用。
- 错误体含 statusCode、message，领域错误另有 code。message 可能为数组。

## 数据与运行范围

PGlite 和 pg 使用相同的建表 SQL 与仓储查询。当前玩家数据为 JSONB 聚合，独立钱包流水可审计；它适合当前主要功能阶段，未进行大规模数据/并发压测。

登录上游使用微信官方 code2Session 地址；本轮未用真实 AppID 实测。独立 PostgreSQL 适配器已实现，自动测试使用落盘 PGlite。事件编辑暂通过源码，不提供公网管理接口。

