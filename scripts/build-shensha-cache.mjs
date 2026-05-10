#!/usr/bin/env node
// 神煞 cache · scan RAG for 神煞 definitions, store canonical description per 神煞
// Usage: DEEPSEEK_API_KEY=sk-... node scripts/build-shensha-cache.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'shensha-cache.json');
const RAG_BASE = 'http://localhost:18800';
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('DEEPSEEK_API_KEY env var required'); process.exit(1); }

// Top 神煞 — most frequently referenced
const SHENSHA = [
  '天乙贵人', '天德贵人', '月德贵人', '文昌贵人', '太极贵人',
  '驿马', '桃花', '华盖', '天罗地网', '红艳煞', '咸池',
  '将星', '羊刃', '禄神', '魁罡', '天医',
  '空亡', '亡神', '劫煞', '灾煞', '大耗', '小耗',
  '披麻', '吊客', '丧门', '勾绞', '飞刃', '六厄',
  '十恶大败', '孤辰寡宿',
];

const cleanBookName = raw => {
  const r = (raw||'').replace(/\s*\(Owner\).*$/i,'').replace(/_compressed.*$/,'').replace(/\s*\(Z-Library\)/i,'').replace(/^\(.+?\)\s*/,'').trim();
  return r === '三命通会.PDF (Administrator)' ? '三命通会' : r === '八字提要 (韦千里)' ? '八字提要' : r;
};

const ragSearch = async (q, n=3) => { const r = await fetch(`${RAG_BASE}/search?q=${encodeURIComponent(q)}&n=${n}`); if (!r.ok) throw new Error(`RAG ${r.status}`); return (await r.json()).results || []; };

const SYSTEM = `命理编辑：从给定 RAG 原文里抽出关于某一神煞的核心定义（30-80 字，1-2 句原文）。
要求：
1. 紧扣这个神煞的查法 + 吉凶意义
2. 半文言原貌
3. 避命例
4. 如原文不含相关定义，返回 NA`;

async function summarize (raw, name) {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `神煞名：${name}\n\n原文：\n${raw}\n\n抽${name}定义。` }],
      max_tokens: 200, temperature: 0.1,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  return ((await r.json()).choices?.[0]?.message?.content || '').trim();
}

async function main () {
  console.log(`Building 神煞 cache (${SHENSHA.length} entries)…`);
  const cache = { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  let i = 0, success = 0, na = 0;
  for (const name of SHENSHA) {
    i++;
    let bestRaw='', bestBook='', bestQ='', bestScore=-Infinity;
    for (const q of [name, `${name}查法`, `命带${name}`]) {
      try {
        const results = await ragSearch(q, 2);
        for (const r of results) {
          const cleanBook = cleanBookName(r.book);
          if (!['穷通宝鉴','三命通会','八字提要','滴天髓','周易','麻衣神相'].includes(cleanBook)) continue;
          const t = (r.text||'').slice(0, 600);
          let s = 0;
          if (t.includes(name)) s += 12;
          if (/(查|属|遇|逢|主)/.test(t)) s += 3;
          if (/光绪|道光|命：/.test(t)) s -= 6;
          if (s > bestScore) { bestScore=s; bestRaw=t; bestBook=r.book; bestQ=q; }
        }
      } catch(e) {}
    }
    if (bestScore<0 || !bestRaw) { na++; process.stdout.write(`\r[${i}/${SHENSHA.length}] ${name} (no RAG)         `); continue; }
    try {
      const cleaned = await summarize(bestRaw, name);
      if (cleaned === 'NA' || cleaned.length < 8) { na++; process.stdout.write(`\r[${i}/${SHENSHA.length}] ${name} NA      `); }
      else { cache.entries[name] = { quote: cleaned, book: cleanBookName(bestBook), q: bestQ }; success++; process.stdout.write(`\r[${i}/${SHENSHA.length}] ${name} ✓ (${cleaned.length}字)      `); }
    } catch(e) { process.stderr.write(`\n  [warn] ${name}: ${e.message}\n`); }
    await new Promise(r => setTimeout(r, 150));
  }
  process.stdout.write('\n');
  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\nSuccess: ${success} · NA: ${na}`);
  console.log(`Saved: ${OUT_PATH} · ${(fs.statSync(OUT_PATH).size/1024).toFixed(1)} KB`);
}
main().catch(e => { console.error(e); process.exit(1); });
