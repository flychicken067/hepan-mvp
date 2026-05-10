#!/usr/bin/env node
// 命例 cache · scan RAG for 历史命例 (王一亭命 etc), extract 4-pillars + summary
// Usage: DEEPSEEK_API_KEY=sk-... node scripts/build-mingli-cache.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'mingli-cache.json');
const RAG_BASE = 'http://localhost:18800';
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('DEEPSEEK_API_KEY env var required'); process.exit(1); }

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const WHITE = new Set(['穷通宝鉴','三命通会.PDF (Administrator)','八字提要 (韦千里)','滴天髓','周易','麻衣神相']);

const cleanBookName = raw => {
  const r = (raw||'').replace(/\s*\(Owner\).*$/i,'').replace(/_compressed.*$/,'').replace(/\s*\(Z-Library\)/i,'').replace(/^\(.+?\)\s*/,'').trim();
  return r === '三命通会.PDF (Administrator)' ? '三命通会' : r === '八字提要 (韦千里)' ? '八字提要' : r;
};

const ragSearch = async (q, n=5) => { const r = await fetch(`${RAG_BASE}/search?q=${encodeURIComponent(q)}&n=${n}`); if (!r.ok) throw new Error(`RAG ${r.status}`); return (await r.json()).results || []; };

// Real pattern in RAG: "辛巳，戊戌，丙戌，壬辰。道光元年十月初九日辰时。马新贻命：辛金泄土生壬..."
// i.e. [4 pillars] [date]. [Name]命/造[: or ，][summary]
function extractMingli (text) {
  if (!text) return [];
  const out = [];
  // Find every 4-pillar sequence
  const pillarRe = /([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])[，、][甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥][，、][甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥][，、][甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g;
  let m;
  while ((m = pillarRe.exec(text)) !== null) {
    const seq = m[0];
    const parts = seq.split(/[，、]/);
    if (parts.length !== 4) continue;
    const [year, month, day, hour] = parts;
    // Look in next 100 chars for name+命/造 pattern
    const afterStart = m.index + seq.length;
    const after = text.slice(afterStart, afterStart + 150);
    const nameMatch = after.match(/([一-龥]{2,4})(命|造)[：，:,。]/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (/光绪|道光|宣统|嘉庆|乾隆|同治|咸丰|嘉佑|至元/.test(name)) continue; // dates not names
    if (name.length < 2) continue;
    out.push({
      name, year, month, day, hour,
      context: text.slice(Math.max(0, m.index - 30), Math.min(text.length, m.index + seq.length + 250)),
    });
  }
  return out;
}

const SYSTEM = `命理编辑：根据给定的 RAG 原文片段（包含一个历史人物的命例和后续解读），生成一句 30-60 字的命例摘要：
- 必须提到：人物名 + 主要成就/历史地位
- 风格：半文言，紧扣命书原文意思，不要现代化
- 如原文不足以判断，返回 NA`;

async function summarize (name, context) {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `人物：${name}\n\n命书原文：\n${context}\n\n生成 30-60 字摘要。` }],
      max_tokens: 150, temperature: 0.1,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  return ((await r.json()).choices?.[0]?.message?.content || '').trim();
}

async function main () {
  console.log('Crawling RAG for 命例 (historical case studies)…');

  // Crawl strategy: query each (stem, branch) day-pillar to surface 命例 in different chunks
  const seen = new Set();
  const cache = { version: 1, generatedAt: new Date().toISOString(), entries: [] };
  let crawled = 0, found = 0;

  // RAG semantic embedding doesn't surface 命例 by name well — use era + role queries.
  const queries = [];
  // 朝代+年号+年 (most effective per testing)
  for (const era of ['乾隆', '嘉庆', '道光', '咸丰', '同治', '光绪', '宣统', '康熙', '雍正', '崇祯']) {
    for (const yr of ['元年', '十年', '二十年', '三十年', '四十年', '五十年']) queries.push(`${era}${yr}`);
  }
  // 官职头衔
  const titles = ['翰林', '大学士', '尚书', '总督', '巡抚', '布政', '军机', '宰相', '首辅', '太傅', '太尉',
                  '进士', '状元', '探花', '殿试', '榜眼', '贡士', '举人',
                  '总理', '总统', '总裁', '内阁', '部长', '校长'];
  for (const t of titles) queries.push(t);
  // 命例 modifiers
  queries.push('运行 富贵', '官至 总督', '位至 大学士', '寿七十', '寿六十', '殒命', '殁于', '秀才', '富翁', '巨富');

  for (const q of queries) {
    crawled++;
    process.stdout.write(`\r[${crawled}/${queries.length}] q=${q} found=${found}      `);
    try {
      const results = await ragSearch(q, 3);
      for (const r of results) {
        const cleanBook = cleanBookName(r.book);
        if (!['穷通宝鉴','三命通会','八字提要','滴天髓','周易','麻衣神相'].includes(cleanBook)) continue;
        const cases = extractMingli(r.text);
        for (const c of cases) {
          const sig = `${c.name}_${c.year}${c.month}${c.day}${c.hour}`;
          if (seen.has(sig)) continue;
          seen.add(sig);
          cache.entries.push({ ...c, book: cleanBook, q });
          found++;
        }
      }
    } catch (e) { /* skip */ }
    await new Promise(r => setTimeout(r, 50));
  }
  process.stdout.write('\n');
  console.log(`\nUnique 命例 found: ${cache.entries.length}`);

  // DeepSeek summarize each
  console.log('Summarizing each via DeepSeek…');
  for (let i = 0; i < cache.entries.length; i++) {
    const e = cache.entries[i];
    process.stdout.write(`\r[${i+1}/${cache.entries.length}] ${e.name}      `);
    try {
      const s = await summarize(e.name, e.context);
      if (s !== 'NA' && s.length > 8) e.summary = s;
    } catch (err) { /* skip */ }
    await new Promise(r => setTimeout(r, 150));
  }
  process.stdout.write('\n');

  // Drop entries without summary
  const before = cache.entries.length;
  cache.entries = cache.entries.filter(e => e.summary);
  console.log(`Final: ${cache.entries.length}/${before} (with summary)`);

  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`Saved: ${OUT_PATH} · ${(fs.statSync(OUT_PATH).size/1024).toFixed(1)} KB`);
}

main().catch(e => { console.error(e); process.exit(1); });
