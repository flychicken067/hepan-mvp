# 合盘 · 古籍合婚 — MVP

A marriage compatibility report based on classical Chinese astrology texts (《穷通宝鉴》《三命通会》《八字提要》). Each conclusion cited with original-text page numbers.

**Live:** https://hepan.vercel.app (TBD)

## What it is

- Pure static frontend (HTML/CSS/JS)
- Browser-side bazi calculation via `lunar-javascript@1.6.13`
- 14-card Spotify-Wrapped narrative + 7-chapter classical long-form
- Pay-once unlock (no subscription)

## Pricing

- 免费试看 — 评分 + 3 张卡 + 第 1 章
- ¥29 完整报告 — 14 卡 + 7 章 + Dashboard + PDF
- ¥99 黄金版 — 完整 + 个性化择吉日 + 排盘原始数据

## Files

```
index.html       Landing page (hero + comparison + form + pricing + FAQ)
report.html      Personalized report (paywall when locked)
assets/bazi.js   Browser-side bazi calculator
vercel.json      Deploy config
```

## Local dev

```bash
python3 -m http.server 4400
open http://localhost:4400/
```

## Roadmap

- [x] D1: Landing + paywall preview mode
- [x] D2: Browser bazi calc + URL-param personalization
- [ ] D3: Payment (manual QR fallback initial, 易支付 later)
- [ ] D4: PDF export + share OG images
- [ ] D5: Vercel deploy + 5 internal testers
- [ ] D6: WeChat article + 3 video shorts
- [ ] D7: Launch day across 5 channels

## Author

By [@vanyiliu](https://x.com/vanyiliu) · WeChat 公众号「一万刘」
Code: [github.com/flychicken067](https://github.com/flychicken067)

MIT.
