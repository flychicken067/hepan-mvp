# BENCHMARKS · 河畔三对标

> 任何改动 / 加功能前，先回看这一页，确认哪个维度需要补 / 哪个维度已超标 / 哪个维度该停手。
> 三个对标互相独立，**不许混着用**。

---

## 一、wayofcode (Rick Rubin)
**用途：内容 + 设计哲学**

URL: https://thewayofcode.com

### 核心特征（实测）
- Title H1: serif 90px / weight 400 / letter-spacing 36px
- Subtitle H2: italic 40.5px Garamond
- Body: 22px serif / line-height 1.4
- Color: 墨 #1F1E1D + 极淡米白 #FAF9F5 + art 框 #F0EEE6（**朱色 0**）
- Canvas art: 207×207 (cover) · 450×450 (chapter)
- 一页 76,000px 长，81 章纵向排列
- 章节字号小 (22px serif inline)，verse 才是主角
- Modify ↗ 让用户 prompt 重生 3D
- **每一句都不可删**
- **无 self-marketing**（没有「最好」「最准」）

### 适配规则
- 文案必须达到「克制+文学」级
- 每章只讲一件事，大量留白
- 我们的「白贲无咎」对应他们的「Tao Te Ching」——必须贯穿
- 朱色仅在 score + em，其余墨色

### 当前评分: **8.5/10**
- ✅ 字体 LXGW + EB Garamond
- ✅ 大留白 + 单色为主
- ✅ 文案克制（无「最好」「最准」）
- ⚠️ 哲学贯穿度未足 —「白贲无咎」只在 colophon 出现 1 次
- ⚠️ 章节英文副标用 Cormorant 比 Goudy 单薄

---

## 二、Moonly (App)
**用途：美观度 / 视觉精致**

### 核心特征
- 渐变背景 per scene（cosmic purples）
- 手绘月相 / 星座 SVG，非 stock
- Rich layered hero card（多层信息分层）
- 高度编排的滚动体验
- 微动效（hover lift / focus 底线 / scroll reveal）
- Onboarding 仪式感（不是直接 form，而是「3 步引导」）
- 每个 scene 独立配色 + 独立插画
- Brand mascot（连续视觉锚）

### 适配规则
- 至少 3 个 micro-interaction（hover / focus / scroll）
- 预览卡 (rp-card) 必须分层 + 渐变
- Trust bar / score bar 必须有微动
- 每个章节背景视觉区分

### 当前评分: **7.5/10**
- ✅ rp-card 分数预览
- ✅ Trust bar (312 对)
- ✅ Skeleton 加载
- ✅ Per-chapter 3D 形态
- ⚠️ 3D 现在所有章节同一族（Stella Octangula 变体），不像 Moonly 每屏独立插画
- ❌ 缺 onboarding ritual（直接表单 → 不够仪式感）
- ❌ Brand mascot 不够强（只有「合」字 + 「河畔」name）
- ❌ Mobile 章节背景不够分层（仅 ch1 starfield，其余空白）

---

## 三、Gank 案例 · 单人 5 万用户
**用途：最小化 MVP / 首单速度**

来源: https://www.gankinterview.cn/zh-CN/blog/...

### 核心特征
- 首版只 3 元素：输入框 + 生成按钮 + 支付入口
- 上线 **3 天**
- **当晚通过精准社群分发获首单**
- 容忍非核心 bug
- 砍 80% 边缘功能
- "现金流 > 完美代码"

### 适配规则
- 没首单前任何功能都是奢侈
- 容忍体验瑕疵，不容忍发不出去
- 每次想加功能，问：「这能直接换成钱吗？」
- 5 天没发 = 反例

### 当前评分: **3/10 — 致命**
- ⚠️ MVP 元素已经远超 3 个（30+）
- ✅ 支付链路完整（QR + WeChat + 6 位码）
- ✅ 真实 RAG + 真原文（差异化护城河）
- 🔴 **从未发布到任何社群**
- 🔴 **5 天迭代 0 真实订单**
- 🔴 **每次「再修一刀」都在重复 Gank 反例**

---

## 决策规则（今后所有改动用此过滤）

每次想动代码前，逐条问：

1. **wayofcode 维度**：这一改让文案/哲学更克制吗？
2. **Moonly 维度**：这一改让用户摸到屏幕想多看一眼吗？
3. **Gank 维度**：这一改换得到首单吗？

**Gank 优先级 > Moonly > wayofcode**（当未发布时）
**wayofcode + Moonly 优先级 > Gank**（当已经有 ≥10 单时）

当前状态：**Gank 维度致命，其他维度暂停打磨**。
