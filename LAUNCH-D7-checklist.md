# D7 · 上线日清单 + 多平台文案

**Live URL:** https://hepan-mvp.vercel.app
**GitHub:** https://github.com/flychicken067/hepan-mvp
**邮箱:** liufan067@gmail.com

---

## ⏰ Timeline（北京时间）

| 时间 | 动作 | 渠道 |
|------|------|------|
| **08:00** | 公众号长文发布 | 一万刘 |
| **09:00** | X / Twitter 长贴 + 截图 | @vanyiliu |
| **10:00** | 即刻动态 + 短视频 | 即刻 |
| **11:00** | 视频号短视频 | 微信视频号 |
| **12:00** | 小红书图文笔记 | 小红书 |
| **15:00** | 知识星球分享 | 一万刘的知识星球 |
| **20:00** | 当日复盘 + 第二轮转发 | 全平台 |

---

## ✅ 上线前 30 分钟检查

- [ ] 打开 https://hepan-mvp.vercel.app —— 落地页正常
- [ ] 填表 → 跳 report.html —— 能算出真实四柱
- [ ] 锁屏状态 —— 前 3 张卡可见，后 11 张模糊 + ¥29 CTA
- [ ] 点 ¥29 解锁 —— 弹出付款 modal
- [ ] 「已付款」→ 进 step 2 —— 显示 liufan067@gmail.com
- [ ] 加 `?token=unlocked` —— 解锁后显示 PDF + 分享按钮
- [ ] Cmd+P —— PDF 排版正常
- [ ] 手机访问 —— 移动端布局 OK
- [ ] OG 卡 —— 用 https://www.opengraph.xyz/ 检查
- [ ] 微信收款码截图准备好（贴在 Notion / 备忘录）
- [ ] 邮箱客户端打开 —— 准备 30 分钟内回复

---

## 📱 多平台文案（直接复制粘贴）

### 1. X / Twitter（英文长贴 · @vanyiliu）

```
Just shipped: a marriage compatibility report based on classical Chinese astrology texts. Each conclusion cited with original-text page numbers.

Built in one weekend with Claude Code. 1.2 RMB compute cost.

Stack: vanilla JS + lunar-javascript (browser-side bazi calc) + RAG database of《穷通宝鉴》《三命通会》《八字提要》《周易》(1,461 passages).

Pricing: ¥29 once. No subscription. No tiers. PDF forever.

Why: 99% of "AI astrology" apps make stuff up. I built one where every claim has a page number you can verify in the actual book.

Code: https://github.com/flychicken067/hepan-mvp
Live: https://hepan-mvp.vercel.app

Inspired by @turingou's pay-per-use philosophy.

#buildinpublic #indieDev #chinaTech
```

### 2. 即刻动态（中文 · 1000+ 粉丝）

```
做了一个小产品 —— 古籍合婚合盘。

¥29 一次买断。每条结论附《穷通宝鉴》页码（可翻书验证）。
不订阅，不会员等级，不充值。

技术：Claude Code 一个周末，~¥1.2 算力成本。
理念：抄郭宇 @turingou 的"按需付费 vs 订阅经济"。

链接：https://hepan-mvp.vercel.app

求点过的兄弟姐妹给点反馈 🙏
```

### 3. 小红书图文（2200+ 粉丝）

**封面图：** 用 hepan 报告里第 1 张卡片截图（83/100 + 山火贲卦）

**标题候选（A/B 测）：**
- A. 「我和对象算了次合盘 · ¥29 比 fatetell 靠谱多了」
- B. 「90% 的合盘 APP 在编故事 · 这一份每条都有古籍页码」
- C. 「准备结婚？这份合盘报告把你们的兼容性写明白了」

**正文：**
```
作为一个 30+ 想结婚的姐妹，我发现一件烦人的事：

市面上的合盘 APP 都在！编！故！事！

「你温柔体贴」「他事业有成」「你们注定相遇」
↑ 这种话放谁身上不能用？

我老公（程序员）这周末做了个产品我特别想推：

📖 古籍合婚 · 合盘
👉 hepan-mvp.vercel.app

不一样在哪：
✓ 每条结论都标《穷通宝鉴》页码
✓ ¥29 一次买断（不订阅！）
✓ 14 张精美卡片 + 7 章长读 + PDF 永久下载
✓ 算法基于子平命理（不是 AI 编的）

我们俩的真实评分：83/100 · 上佳合婚

最有用的一段：
「你们不是同频共振，是轮替供能。
今年她负责光，你负责土。」

打中我了。

#婚配命理 #合盘 #独立开发者 #小众好物
```

### 4. 视频号短视频脚本（30 秒）

**画面 1（5s · 痛点）：** 我对象笑：「这话放地铁上随便指一对都能用」  
**字幕：** 99% 的合盘 APP 都在编故事

**画面 2（8s · 解决）：** 显示 hepan 报告 14 张卡片滑动  
**字幕：** 我做了个不编故事的 · 每条结论都有古籍页码

**画面 3（10s · 信任）：** 翻开《穷通宝鉴》P.149 王一亭命的实物照片  
**字幕：** 你完全可以打开实体书验证

**画面 4（5s · CTA）：** 链接 + 二维码  
**字幕：** ¥29 一次买断 不订阅 · hepan-mvp.vercel.app

**配乐：** 古风钢琴

### 5. 知识星球分享（深度版）

```
【独立开发周记 · 第 1 周】

这周做了什么：

1. 用 Claude Code 一个周末做了「合盘」产品
2. 用 lunar-javascript 浏览器侧八字计算
3. RAG 数据库（1,461 条古籍片段）我之前已经做好了
4. Vercel 部署 + 手动收款 + 邮件激活模式

为什么定价 ¥29 一次买断而不是订阅：

因为我相信郭宇 @turingou 的判断 —— 订阅经济发明了 12 年，把整个互联网都驯化成了"先免费引流再绑卡续费"。我不想这样做。

所以：
- 一次性 ¥29 买断
- 不订阅
- 不会员等级
- 看完不喜欢退款

成本：¥1.2 / 单（Claude API）  
售价：¥29  
毛利：96%

收入预测（保守）：
- 公众号触达 3 万 → 5% 转化 → 450 单 → ¥13,000
- 多平台分发 1.5 倍 → ~¥20,000

这周给星球老铁一个特权：星球会员凭截图，免费解锁完整版。

代码 / 决策 / 踩坑全公开：
https://github.com/flychicken067/hepan-mvp

下周接入易支付，启动第二轮迭代。

—— Ivan
```

---

## 🎯 转化漏斗 KPI（D7 当晚复盘）

| 指标 | 目标 | 实际 |
|------|------|------|
| 公众号文章 PV | 3,000+ | __ |
| 落地页 UV | 1,500+ | __ |
| 试看率 | 30%+ | __ |
| 付费率 | 5%+ | __ |
| 第一周 GMV | ¥6,000+ | __ |
| 第一笔订单时间 | < 2 小时 | __ |

---

## 🔄 上线后 24h 优先迭代

按用户反馈优先级：

1. **如果转化率 < 3%：** 落地页 hero 重写（用真实用户截图替换抽象文案）
2. **如果跳出率 > 70%：** 表单移到 hero 上方
3. **如果有人付了不解锁：** 自动监控 + 短信提醒（手机即时收）
4. **如果有人投诉**："为什么没有 PDF 自动发"——D8 接 SendGrid

---

## 📝 第二周（Week 2）规划

- D8: 易支付接入（自动收款）
- D9: 自动 PDF 邮件发送
- D10: 加"中级版" ¥29 → ¥49 测价
- D11: 上线"夫妻档"（已婚版本，强调子女 / 财运 / 健康）
- D12: 收集 5 条用户证言加首页
- D13-14: 复盘 Week 1 数据 + 写第二篇公众号

---

## 一句话定位（最终版）

> 「合盘 · 古籍合婚 — 一份每条结论附《穷通宝鉴》页码的合盘报告。
> ¥29 买断，不订阅。」

---

GO. 🚀
