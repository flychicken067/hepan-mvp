#!/usr/bin/env node
// 合婚卦象 cache · keyed by 男卦_女卦 (8x8=64 entries from 八卦)
// Usage: DEEPSEEK_API_KEY=sk-... node scripts/build-hehun-cache.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'hehun-cache.json');
const RAG_BASE = 'http://localhost:18800';
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('DEEPSEEK_API_KEY env var required'); process.exit(1); }

const TRIGRAMS = ['乾','兑','离','震','巽','坎','艮','坤'];
const SYMBOL = { 乾:'☰', 兑:'☱', 离:'☲', 震:'☳', 巽:'☴', 坎:'☵', 艮:'☶', 坤:'☷' };

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

const SYSTEM = `你是周易编辑。从给定 RAG 原文里抽出关于某一卦（六十四卦之一）的核心卦辞或彖辞。

要求：
1. 1-2 句原文，30-90 字
2. 引用《周易》原文（如「亨」「利贞」「文饰」等）和卦辞
3. 避免抄整个卦的完整解读
4. 如原文不含相关卦辞，返回 NA`;

// 八卦 + 八卦 = 64 卦. 上为内/下为外，命书惯例: 男为外（上），女为内（下）.
// 卦名表 (上下卦组合 → 64 卦名)
const HEXAGRAM = {
  '乾乾':'乾','乾兑':'夬','乾离':'大有','乾震':'大壮','乾巽':'小畜','乾坎':'需','乾艮':'大畜','乾坤':'泰',
  '兑乾':'履','兑兑':'兑','兑离':'睽','兑震':'归妹','兑巽':'中孚','兑坎':'节','兑艮':'损','兑坤':'临',
  '离乾':'同人','离兑':'革','离离':'离','离震':'丰','离巽':'家人','离坎':'既济','离艮':'贲','离坤':'明夷',
  '震乾':'无妄','震兑':'随','震离':'噬嗑','震震':'震','震巽':'恒','震坎':'屯','震艮':'颐','震坤':'复',
  '巽乾':'姤','巽兑':'大过','巽离':'鼎','巽震':'恒','巽巽':'巽','巽坎':'井','巽艮':'蛊','巽坤':'升',
  '坎乾':'讼','坎兑':'困','坎离':'未济','坎震':'解','坎巽':'涣','坎坎':'坎','坎艮':'蒙','坎坤':'师',
  '艮乾':'遁','艮兑':'咸','艮离':'旅','艮震':'小过','艮巽':'渐','艮坎':'蹇','艮艮':'艮','艮坤':'谦',
  '坤乾':'否','坤兑':'萃','坤离':'晋','坤震':'豫','坤巽':'观','坤坎':'比','坤艮':'剥','坤坤':'坤',
};

async function clean (rawText, hexName) {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `卦名：${hexName}\n\n原文：\n${rawText}\n\n抽${hexName}卦辞。` },
      ],
      max_tokens: 200, temperature: 0.1,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  return ((await r.json()).choices?.[0]?.message?.content || '').trim();
}

async function main () {
  console.log('Building 合婚卦象 cache (64 hexagrams)…');
  const cache = { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  let i = 0, total = TRIGRAMS.length * TRIGRAMS.length, success = 0, na = 0;

  for (const upper of TRIGRAMS) {  // 男 (outer)
    for (const lower of TRIGRAMS) {  // 女 (inner)
      i++;
      const key = `${upper}_${lower}`;
      const hex = HEXAGRAM[upper + lower] || `${upper}${lower}`;
      const queries = [`${hex}卦`, `${hex} 周易`, `${hex}彖`];
      let bestRaw = '', bestBook = '', bestQ = '';
      let bestScore = -Infinity;
      for (const q of queries) {
        try {
          const results = await ragSearch(q, 2);
          for (const r of results) {
            const t = (r.text || '').slice(0, 600);
            let s = 0;
            if (t.includes(hex)) s += 10;
            if (/(亨|贞|利|凶|吝|悔|彖|象)/.test(t)) s += 3;
            if (/光绪|道光|命：/.test(t)) s -= 8;
            if (s > bestScore) { bestScore = s; bestRaw = t; bestBook = r.book; bestQ = q; }
          }
        } catch (e) { /* skip */ }
      }
      if (bestScore < 0 || !bestRaw) { na++; process.stdout.write(`\r[${i}/${total}] ${key}(${hex}) (no RAG)         `); continue; }

      try {
        const cleaned = await clean(bestRaw, hex);
        if (cleaned === 'NA' || cleaned.length < 8) {
          na++;
          process.stdout.write(`\r[${i}/${total}] ${key}(${hex}) NA      `);
        } else {
          cache.entries[key] = { quote: cleaned, book: cleanBookName(bestBook), q: bestQ, hex };
          success++;
          process.stdout.write(`\r[${i}/${total}] ${key}(${hex}) ✓ (${cleaned.length}字)      `);
        }
      } catch (e) { process.stderr.write(`\n  [warn] ${key}: ${e.message}\n`); }
      await new Promise(r => setTimeout(r, 150));
    }
  }
  process.stdout.write('\n');

  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\nSuccess: ${success} · NA: ${na}`);
  console.log(`Saved: ${OUT_PATH} · ${(fs.statSync(OUT_PATH).size / 1024).toFixed(1)} KB`);
}

main().catch(e => { console.error(e); process.exit(1); });
