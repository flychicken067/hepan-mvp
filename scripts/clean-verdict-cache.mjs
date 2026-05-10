#!/usr/bin/env node
// Clean verdict-cache.json with DeepSeek — extract the 1-2 most relevant
// sentences from each RAG passage, in 命书 voice, ≤ 80 chars.
//
// Usage:  DEEPSEEK_API_KEY=sk-... node scripts/clean-verdict-cache.mjs
//
// Cost estimate: 120 entries · ~600 in / ~80 out tokens each ≈ ¥0.05 total

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'assets', 'verdict-cache.json');
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('DEEPSEEK_API_KEY env var required'); process.exit(1); }

const MONTH_NAME = { 寅:'正月', 卯:'二月', 辰:'三月', 巳:'四月', 午:'五月', 未:'六月',
                    申:'七月', 酉:'八月', 戌:'九月', 亥:'十月', 子:'十一月', 丑:'十二月' };

const SYSTEM = `你是一位严谨的命理编辑。给定一段从《穷通宝鉴》或同类古籍 RAG 检索到的原文片段（可能含命例、不相关内容），你的任务是：

1. 找出这段原文里最直接讨论「该日干在该月生」的核心论断（通常包含"取用神/喜/忌/旺/弱/虚/实"等关键词）。
2. 抽出 1-2 句最关键的原文（保持文言原貌，不改词序、不加现代化）。
3. 输出格式：仅一段 30-80 字的纯文本，不带引号、不带书名、不加解释。
4. 严禁编造原文里没有的内容。如原文实在与"该日干生该月"无关，直接返回字面 "NA"。

注意：原文里大量"光绪/道光/某某命"是命例，请避开，只取理论性论断。`;

async function clean (entry, key) {
  const [stem, branch] = key.split('_');
  const monthName = MONTH_NAME[branch] || branch + '月';
  const userPrompt = `日干：${stem}\n月支：${branch}（${monthName}）\n\nRAG 原文片段：\n${entry.quote}\n\n请抽出最契合「${stem}日生${monthName}」的 1-2 句原文。`;
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.1,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  const j = await r.json();
  const out = (j.choices?.[0]?.message?.content || '').trim();
  return out;
}

async function main () {
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  const keys = Object.keys(cache.entries);
  console.log(`Cleaning ${keys.length} entries via DeepSeek…`);
  let i = 0, naCount = 0, updated = 0;

  for (const key of keys) {
    i++;
    const e = cache.entries[key];
    try {
      const cleaned = await clean(e, key);
      if (cleaned === 'NA' || cleaned.length < 10) {
        naCount++;
        process.stdout.write(`\r[${i}/${keys.length}] ${key} NA      `);
      } else {
        e.quote_raw = e.quote_raw || e.quote; // preserve original
        e.quote = cleaned;
        e.cleaned = true;
        updated++;
        process.stdout.write(`\r[${i}/${keys.length}] ${key} ✓ (${cleaned.length}字)      `);
      }
    } catch (err) {
      process.stderr.write(`\n  [warn] ${key}: ${err.message}\n`);
    }
    // small delay to be nice
    await new Promise(r => setTimeout(r, 150));
  }

  cache.cleaned = { at: new Date().toISOString(), updated, na: naCount, model: 'deepseek-chat' };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\n\nUpdated: ${updated} · NA: ${naCount}`);
  console.log(`Saved: ${CACHE_PATH}`);
  console.log(`Size: ${(fs.statSync(CACHE_PATH).size / 1024).toFixed(1)} KB`);
}

main().catch(e => { console.error(e); process.exit(1); });
