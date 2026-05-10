#!/usr/bin/env node
// 离线生成 verdict-cache.json — 跑一次，把本地 RAG 拍成静态查找表。
// Usage:  node scripts/build-verdict-cache.mjs
// Requires: localhost:18800 (bazi-bot) running

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'verdict-cache.json');
const RAG_BASE = 'http://localhost:18800';

const STEMS    = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const MONTH_NAME = { 寅:'正月', 卯:'二月', 辰:'三月', 巳:'四月', 午:'五月', 未:'六月',
                    申:'七月', 酉:'八月', 戌:'九月', 亥:'十月', 子:'十一月', 丑:'十二月' };

// Strip cruft from RAG-returned book identifiers
function cleanBookName (raw) {
  let b = raw || '';
  b = b.replace(/\s*\(Owner\).*$/i, '').replace(/_compressed.*$/, '').replace(/\s*\(Z-Library\)/i, '');
  b = b.replace(/^\(.+?\)\s*/, '').trim();
  return b;
}

// Score-based sentence extractor: prefer sentences that contain BOTH
// the day-master stem AND the month name, AND avoid 命例 timestamps.
function extractBest (raw, stem, branch, monthName) {
  if (!raw) return '';
  const text = raw.replace(/\n+/g, '').replace(/\s+/g, '').replace(/[（）]/g, '');
  const sentences = text.split(/[。！？]/).map(s => s.trim()).filter(s => s.length > 6);

  const scored = sentences.map(s => {
    let score = 0;
    const hasStem = s.includes(stem);
    const hasMonth = s.includes(monthName) || s.includes(branch);
    if (hasStem && hasMonth) score += 12;
    else if (hasStem) score += 4;
    else if (hasMonth) score += 2;
    if (/(用|取|宜|忌|喜|畏)/.test(s)) score += 3;
    if (/(贵|富|官|印|财|杀|食|伤)/.test(s)) score += 1;
    // Penalize 命例 timestamps and named-person 命书 case studies
    if (/(光绪|道光|宣统|民国|嘉庆|乾隆)/.test(s)) score -= 20;
    if (/(命：|命:|某命|公命|侯命)/.test(s)) score -= 10;
    if (/[一二三四五六七八九十]+月.{0,6}日/.test(s)) score -= 8; // dates like 五月初九日
    if (/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥].{0,4}[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/.test(s)) score -= 8; // 干支命例
    return { s, score };
  }).sort((a, b) => b.score - a.score);

  // Take top 1-2 sentences with positive score, join with 。
  const best = scored.filter(x => x.score > 4).slice(0, 2);
  if (best.length === 0) {
    // Fallback: first reasonable-length sentence
    const fallback = sentences.find(s => s.length >= 12 && s.length <= 70 && !/(光绪|道光|命：)/.test(s));
    return (fallback || sentences[0] || '').slice(0, 90) + '。';
  }
  let out = best.map(x => x.s).join('。') + '。';
  if (out.length > 120) out = out.slice(0, 110) + '⋯';
  return out;
}

async function ragSearch (q, n = 2) {
  const url = `${RAG_BASE}/search?q=${encodeURIComponent(q)}&n=${n}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`RAG ${r.status} on "${q}"`);
  const j = await r.json();
  return j.results || [];
}

async function main () {
  console.log('Building verdict cache from local RAG...');
  const cache = { version: 2, generatedAt: new Date().toISOString(), entries: {} };
  let i = 0, total = STEMS.length * BRANCHES.length;

  for (const stem of STEMS) {
    for (const branch of BRANCHES) {
      i++;
      const key = `${stem}_${branch}`;
      const monthName = MONTH_NAME[branch] || `${branch}月`;
      const queries = [
        `${monthName}${stem}`,                         // canonical 月柱+日干
        `${stem}日生于${branch}月`,
        `${stem}生${branch}`,
      ];
      // Pull n=3 across canonical query, pick the result whose extracted snippet scores best.
      let bestEntry = null, bestScore = -Infinity;
      for (const q of queries) {
        try {
          const results = await ragSearch(q, 3);
          for (const r of results) {
            const quote = extractBest(r.text, stem, branch, monthName);
            // Prefer longer extractions and ones that mention the stem
            const s = (quote.includes(stem) ? 10 : 0) + (quote.includes(monthName) ? 8 : 0)
                    + Math.min(quote.length / 10, 10)
                    - (/(光绪|道光|命：)/.test(quote) ? 30 : 0);
            if (s > bestScore && quote.length >= 12) {
              bestScore = s;
              bestEntry = { quote, book: cleanBookName(r.book), q };
            }
          }
        } catch (e) {
          process.stderr.write(`  [warn] ${q}: ${e.message}\n`);
        }
        if (bestScore > 18) break; // good enough
      }
      const chosen = bestEntry;
      if (chosen) cache.entries[key] = chosen;
      process.stdout.write(`\r[${i}/${total}] ${key} ${chosen ? '✓' : '✗'}      `);
    }
  }
  process.stdout.write('\n');

  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`Entries: ${Object.keys(cache.entries).length}`);
  console.log(`Size: ${(fs.statSync(OUT_PATH).size / 1024).toFixed(1)} KB`);
}

main().catch(e => { console.error(e); process.exit(1); });
