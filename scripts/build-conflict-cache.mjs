#!/usr/bin/env node
// 冲刑害化解 cache · for each 地支冲/刑/害 combo, get 命书原文 + 化解之道
// Usage: DEEPSEEK_API_KEY=sk-... node scripts/build-conflict-cache.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'conflict-cache.json');
const RAG_BASE = 'http://localhost:18800';
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('DEEPSEEK_API_KEY env var required'); process.exit(1); }

// 六冲: 12-branch opposing pairs
const CHONG = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
// 三刑
const XING = [['寅','巳'],['巳','申'],['申','寅'], ['丑','戌'],['戌','未'],['未','丑'], ['子','卯']];
// 自刑
const ZIXING = [['辰','辰'],['午','午'],['酉','酉'],['亥','亥']];
// 六害
const HAI = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];

const cleanBookName = raw => {
  const r = (raw||'').replace(/\s*\(Owner\).*$/i,'').replace(/_compressed.*$/,'').replace(/\s*\(Z-Library\)/i,'').replace(/^\(.+?\)\s*/,'').trim();
  return r === '三命通会.PDF (Administrator)' ? '三命通会' : r === '八字提要 (韦千里)' ? '八字提要' : r;
};
const ragSearch = async (q, n=3) => { const r = await fetch(`${RAG_BASE}/search?q=${encodeURIComponent(q)}&n=${n}`); if (!r.ok) throw new Error(`RAG ${r.status}`); return (await r.json()).results || []; };

const SYSTEM = `命理编辑：从原文里抽出关于「某种地支冲/刑/害」在命局中的吉凶意义和化解之道。
要求：
1. 1-2 句原文，30-90 字
2. 必须包含吉凶判断或化解办法
3. 避命例
4. 如不含相关论断返回 NA`;

async function summarize (raw, kind, pair) {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `${kind}：${pair[0]}${pair[1]}\n\n原文：\n${raw}\n\n抽${pair[0]}${pair[1]}${kind}论断和化解。` }],
      max_tokens: 200, temperature: 0.1,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  return ((await r.json()).choices?.[0]?.message?.content || '').trim();
}

async function main () {
  console.log('Building 冲刑害化解 cache…');
  const cache = { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  const targets = [
    ...CHONG.map(p => ({ kind: '冲', pair: p })),
    ...XING.map(p => ({ kind: '刑', pair: p })),
    ...ZIXING.map(p => ({ kind: '自刑', pair: p })),
    ...HAI.map(p => ({ kind: '害', pair: p })),
  ];
  let i = 0, success = 0, na = 0;
  for (const t of targets) {
    i++;
    const key = `${t.pair[0]}_${t.pair[1]}_${t.kind}`;
    const queries = [`${t.pair[0]}${t.pair[1]}${t.kind}`, `${t.pair[0]}${t.pair[1]}相${t.kind === '害' ? '害' : t.kind}`];
    let bestRaw='', bestBook='', bestQ='', bestScore=-Infinity;
    for (const q of queries) {
      try {
        const results = await ragSearch(q, 2);
        for (const r of results) {
          const cleanBook = cleanBookName(r.book);
          if (!['穷通宝鉴','三命通会','八字提要','滴天髓','周易','麻衣神相'].includes(cleanBook)) continue;
          const text = (r.text||'').slice(0, 600);
          let s = 0;
          if (text.includes(t.pair[0]) && text.includes(t.pair[1])) s += 10;
          if (text.includes(t.kind)) s += 5;
          if (/(化|解|忌|喜|吉|凶|主)/.test(text)) s += 3;
          if (/光绪|道光|命：/.test(text)) s -= 6;
          if (s > bestScore) { bestScore = s; bestRaw = text; bestBook = r.book; bestQ = q; }
        }
      } catch(e) {}
    }
    if (bestScore < 0 || !bestRaw) { na++; process.stdout.write(`\r[${i}/${targets.length}] ${key} (no RAG)         `); continue; }
    try {
      const cleaned = await summarize(bestRaw, t.kind, t.pair);
      if (cleaned === 'NA' || cleaned.length < 8) { na++; process.stdout.write(`\r[${i}/${targets.length}] ${key} NA      `); }
      else { cache.entries[key] = { quote: cleaned, book: cleanBookName(bestBook), q: bestQ, kind: t.kind, pair: t.pair }; success++; process.stdout.write(`\r[${i}/${targets.length}] ${key} ✓      `); }
    } catch(e) { process.stderr.write(`\n  [warn] ${key}: ${e.message}\n`); }
    await new Promise(r => setTimeout(r, 150));
  }
  process.stdout.write('\n');
  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\nSuccess: ${success} · NA: ${na}`);
  console.log(`Saved: ${OUT_PATH} · ${(fs.statSync(OUT_PATH).size/1024).toFixed(1)} KB`);
}
main().catch(e => { console.error(e); process.exit(1); });
