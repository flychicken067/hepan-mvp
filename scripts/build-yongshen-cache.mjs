#!/usr/bin/env node
// 用神 cache builder — for each (干, 月支) combo, query RAG with
// "{stem}日{month}月用神" focus, then DeepSeek-clean.
// Usage:  DEEPSEEK_API_KEY=sk-... node scripts/build-yongshen-cache.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'yongshen-cache.json');
const RAG_BASE = 'http://localhost:18800';
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('DEEPSEEK_API_KEY env var required'); process.exit(1); }

const STEMS    = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const MONTH_NAME = { 寅:'正月', 卯:'二月', 辰:'三月', 巳:'四月', 午:'五月', 未:'六月',
                    申:'七月', 酉:'八月', 戌:'九月', 亥:'十月', 子:'十一月', 丑:'十二月' };

function cleanBookName (raw) {
  return (raw || '').replace(/\s*\(Owner\).*$/i, '')
    .replace(/_compressed.*$/, '').replace(/\s*\(Z-Library\)/i, '')
    .replace(/^\(.+?\)\s*/, '').trim();
}

async function ragSearch (q, n = 3) {
  const r = await fetch(`${RAG_BASE}/search?q=${encodeURIComponent(q)}&n=${n}`);
  if (!r.ok) throw new Error(`RAG ${r.status}`);
  return (await r.json()).results || [];
}

const SYSTEM = `你是命理编辑。从给定 RAG 原文里抽出关于「该日干在该月生取何用神」的核心论断（提到「用 X」「以 X 为用」「专用 X」「次取 X」之类）。

要求：
1. 1-2 句原文，30-80 字
2. 必须包含具体用神（壬/庚/丁/甲 等）和理由
3. 避开命例（光绪/某某命）
4. 若原文不含用神论断，返回 NA`;

async function clean (rawText, stem, branch, monthName) {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `日干：${stem}\n月支：${branch}（${monthName}）\n\n原文：\n${rawText}\n\n抽用神。` },
      ],
      max_tokens: 200,
      temperature: 0.1,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

async function main () {
  console.log('Building 用神 cache (RAG + DeepSeek)…');
  const cache = { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  let i = 0, total = STEMS.length * BRANCHES.length, success = 0, na = 0;

  for (const stem of STEMS) {
    for (const branch of BRANCHES) {
      i++;
      const monthName = MONTH_NAME[branch];
      const queries = [
        `${stem}日${monthName}用神`,
        `${monthName}${stem}用`,
        `${stem}生${monthName}取`,
      ];
      let bestRaw = '', bestBook = '', bestQ = '';
      let bestScore = -Infinity;
      for (const q of queries) {
        try {
          const results = await ragSearch(q, 2);
          for (const r of results) {
            // crude score: contains 用/取 keyword + stem + monthName
            const t = (r.text || '').slice(0, 600);
            let s = 0;
            if (/用|取/.test(t)) s += 5;
            if (t.includes(stem)) s += 5;
            if (t.includes(monthName) || t.includes(branch)) s += 3;
            if (/光绪|道光|命：/.test(t)) s -= 10;
            if (s > bestScore) { bestScore = s; bestRaw = t; bestBook = r.book; bestQ = q; }
          }
        } catch (e) { /* skip */ }
      }
      if (bestScore < 0 || !bestRaw) { na++; process.stdout.write(`\r[${i}/${total}] ${stem}_${branch} (no RAG)         `); continue; }

      try {
        const cleaned = await clean(bestRaw, stem, branch, monthName);
        if (cleaned === 'NA' || cleaned.length < 8) {
          na++;
          process.stdout.write(`\r[${i}/${total}] ${stem}_${branch} NA      `);
        } else {
          cache.entries[`${stem}_${branch}`] = {
            quote: cleaned,
            book: cleanBookName(bestBook),
            q: bestQ,
          };
          success++;
          process.stdout.write(`\r[${i}/${total}] ${stem}_${branch} ✓ (${cleaned.length}字)      `);
        }
      } catch (e) {
        process.stderr.write(`\n  [warn] ${stem}_${branch}: ${e.message}\n`);
      }
      await new Promise(r => setTimeout(r, 150));
    }
  }
  process.stdout.write('\n');

  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\nSuccess: ${success} · NA: ${na}`);
  console.log(`Saved: ${OUT_PATH}`);
  console.log(`Size: ${(fs.statSync(OUT_PATH).size / 1024).toFixed(1)} KB`);
}

main().catch(e => { console.error(e); process.exit(1); });
