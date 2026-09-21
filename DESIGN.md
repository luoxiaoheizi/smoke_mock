---
version: alpha
name: "此刻"
description: "第一人称虚拟互动体验，以灰绿场景与随身橱窗连接日常片刻。"
colors:
  primary: "#344f41"
  on-primary: "#ffffff"
  background: "#f0f3ee"
  surface: "#fcfdf9"
  text: "#243b32"
  muted: "#586d5f"
  border: "#d5dfd2"
  soft: "#e5ecdf"
  accent: "#866438"
  danger: "#8a3f32"
  error-bg: "#f9e9e2"
  focus: "#8d692f"
  scrollbar: "#8c9b87"
  scrollbar-hover: "#586d5f"
  scrollbar-track: "#e5ecdf"
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
  display:
    fontFamily: '"Songti SC", "SimSun", serif'
  number:
    fontFamily: '"SFMono-Regular", Consolas, monospace'
rounded:
  control: "8px"
  panel: "12px"
spacing:
  page-gutter: "18px"
components:
  button:
    height: "44px"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  loading:
    height: "110px"
    textColor: "{colors.muted}"
  panel:
    rounded: "{rounded.panel}"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  page:
    backgroundColor: "{colors.background}"
  divider:
    backgroundColor: "{colors.border}"
  selected:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.primary}"
  coin:
    textColor: "{colors.accent}"
  error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.danger}"
  focus-ring:
    backgroundColor: "{colors.focus}"
  scrollbar-thumb:
    backgroundColor: "{colors.scrollbar}"
  scrollbar-hover:
    backgroundColor: "{colors.scrollbar-hover}"
  scrollbar-track:
    backgroundColor: "{colors.scrollbar-track}"
---

# 此刻设计规范

## Overview

手机上的第一人称虚拟体验，面向使用简体中文的用户。产品依据为《项目大纲.md》、docs/API.md 和用户确认的交互：时间自动获取，地点由用户选择，事件自动生成，商品仅用虚拟火花币兑换。

视觉延续原项目灰绿配色。具体参照是生活中的小型陈列柜：安静的绿色内壁、可辨识的商品包装、横向层板和清楚的价签。签名元素留在橱窗；设置、钱包、收藏用熟悉的列表结构。

产品型界面，无日本市场或日文需求。不采用排行榜、充值入口和满屏圆形图标；不照搬参考产品。根据 2026-09-21 用户确认，商店加入中华（硬）、钻石（荷花）、玉溪（软）、白沙（硬）四款品牌参考包装，保留三款原创外观。品牌图片作为本地独立素材维护，使用 aspectFit 完整展示；火花币价格独立配置，不代表实物售价。

令牌所有权采用 Model B：apps/miniprogram/src/app.wxss 的 page 变量是运行时来源，本文同步记录数值和语义。colors 的每个键映射到同名 --color-*；typography 映射 --font-body/display/number；rounded 映射 --radius-control/panel；spacing.page-gutter 映射 --page-gutter。文档 px 以 375px 设计宽度计，运行时用两倍 rpx。scripts/verify-ui.mjs 检查漂移。

## Colors

primary 用于主操作；surface 是卡片和面板；background 是全局背景；text/muted 是正文和辅助文字，不能以低对比度装饰色承载说明。accent 仅用于火花币和支出。danger/error-bg 配对用于持久错误。选中项同时显示文字或勾选，不能只变色。

场景页使用深背景的专属语义变体，文字为浅色；Canvas 的场景、肤色和道具色不纳入 UI 语义令牌。商品包装颜色由 packages/domain/src/catalog.ts 唯一维护。app.json 的原生导航、Tab 色值及 switch 的颜色因平台属性需要字面值，由验证脚本检查与共享令牌一致。

## Typography

中文正文使用系统无衬线字体，标题 54rpx/600，正文 28rpx，说明 24–26rpx；字形依设备系统字体变化。宋体只用于商品包装与商品名。等宽字仅用于时钟、余额和日期。中文优先，英文 MOMENT 仅作品牌标记，不能代替操作说明。包装微字是画面装饰，不承担关键功能。

## Layout

以手机竖屏为主，测试宽度 320、390、430px。横向边距 36rpx，按钮常规高度至少 88rpx；主要信息采用自然文档滚动，底部兑换栏预留安全区域。首页为固定视口场景，控制区固定底部；场景选择面板限定 88vh 并可滚动。

字体和媒体无需网络下载。加载用统一 loading-state，取代各页不同的闪动骨架；加载和错误不显示默认商品作为真实内容。余额待加载显示破折号。错误重试使用原生 button。

## Elevation & Depth

普通卡片用边框和底色区分，不增加悬浮阴影。仅商品包装和层板使用阴影表达陈列关系。弹层遮罩为最高层，固定兑换栏次之；保留原生导航与 Tab。

## Shapes

控件圆角 16rpx，面板圆角 24rpx；胶囊只用于余额入口和场景选择入口。历史手记使用左侧竖线表达连续记录，避免重复装饰编号。

## Components

共享 button / primary / secondary / small / link-button、loading-state、error-panel、empty、badge、pack 由 app.wxss 维护。页面样式只管理具体布局和有业务意义的变体。

按钮有默认、按下、键盘聚焦、禁用和忙碌状态。原生 loading 属性提供提交反馈。导航同样用 button 接微信路由 API，无匿名图标。轻量通知由微信 wx.showToast 承载，持久失败留在页面。画质选择采用微信 picker，开关采用 switch，接受平台负责的弹出层和读屏行为。

动效仅用于状态变化；CSS 响应 prefers-reduced-motion。Canvas 是体验的核心动态内容，本轮未实现跟随系统减少动态设置，保留“流畅优先”选项，不能宣称已完成完整无障碍认证。场景热点另有底部操作按钮，主流程不依赖发现透明热点。

## Do's and Don'ts

- 同一操作统一为“领取补给”“已领取”“加载更多”“重新加载”。
- 必须保留当前事件、库存、进度和服务端经济规则。
- 新增场景美术应独立管理素材，本轮不增加程序化绘画，不将整页截图代替可访问文字和按钮。
- 不将浏览器转换预览视为微信运行时验收，不声称原生 picker 或读屏已通过真机测试。
