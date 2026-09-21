# 此刻交互约定

## 业务依据

以 项目大纲.md、docs/API.md、packages/domain/src/player.ts 为准。自动事件、不选事件、虚拟货币、单活动会话和幂等规则保持现状。本轮不新增支付、删除记录、权限或数据留存政策。

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | 微信 picker；体验页场景按钮面板 | docs/API.md + DESIGN.md | 原生画质选择；场景选择 | 前端逻辑测试；面板视觉检查；原生弹出层待真机 |
| Date | domain/getTimeContext 和 services/preferences.ts | docs/API.md，北京时间 | 当前时间、会话开始时间、记录日期 | tests/domain.test.cjs |
| Scrollbar | app.wxss；微信页面自然滚动 | DESIGN.md | 页面滚动；场景面板滚动 | 窄屏预览，微信待验证 |
| Toast | 微信 wx.showToast；services/preferences.ts 的 toastError | 本交互约定 | 成功提示、轻量错误；关键失败留在页面 | tests/frontend.test.cjs |
| CRUD | services/api.ts + 原生路由 API | docs/API.md | 兑换、选用、开始、结束；不提供删除 | tests/frontend.test.cjs + tests/api.test.cjs |

## 状态与恢复

- 加载、失败、正常内容按互斥状态展示；失败提供原地重试。
- 初始商品信息未确认时不能兑换；余额不足提供钱包入口；从钱包回到详情必须刷新。
- 兑换等待服务端确认，重试复用操作编号。选用后回到体验；兑换成功留在详情，可继续选用。
- 领取补给在橱窗与钱包保持相同文案，按北京时间每日去重；忙碌时禁止重复点击。
- 历史与钱包显式加载更多，同时支持到底触发；正在刷新、出错、忙碌或加载分页时不能另起分页。
- 开始体验只选地点；事件生成一次。切后台暂停并保存，恢复不重新生成。
- 结束失败保持先前未点燃或燃烧状态，保留会话与错误，可再次结束；不能凭空进入燃烧。
- 设置保存失败保持原偏好。场景面板允许关闭，保存时阻止重复选择。体验中不换场景，给出提示。

## 平台与验证边界

简体中文界面，无需浏览器 URL 搜索状态。真实小程序 button/picker/switch 和微信路由为规范所有者，不引入 Web UI 框架。浏览器预览仅转换模板供排版验证，不模拟微信授权、原生焦点管理、picker 弹出层或真实手势。

读屏、原生控件弹出层、实际触控区域与低端设备性能仍需微信开发者工具和真机验证。

## 包装图片与商品信息

商店将四款品牌参考商品优先展示，收藏保留默认免费款顺序。商店、详情、收藏统一读取共享商品目录，原生 image 使用本地素材和 aspectFit，固定区域防止跳动；加载失败降级为名称占位，不影响兑换与选用。详情展示包装、长度和生产企业；全部价格为独立配置的火花币，禁止展示为人民币或接入实物购买。来源与授权状态见 docs/商品素材说明.md。
