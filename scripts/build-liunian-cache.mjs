#!/usr/bin/env node
// 流年 cache · keyed by 日干_流年干 (100 entries)
// Usage: DEEPSEEK_API_KEY=sk-... node scripts/build-liunian-cache.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'liunian-cache.json');
const RAG_BASE = 'http://localhost:18800';
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('DEEPSEEK_API_KEY env var required'); process.exit(1); }

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

// Ten Gods relationship: 流年干 vs 日干
const STEM_FIVE = { 甲:'木', 乙:'木', 丙:'火', 丁:'火', 戊:'土', 己:'土', 庚:'金', 辛:'金', 壬:'水', 癸:'水' };
const STEM_YY   = { 甲:'阳', 乙:'阴', 丙:'阳', 丁:'阴', 戊:'阳', 己:'阴', 庚:'阳', 辛:'阴', 壬:'阳', 癸:'阴' };
const SHISHEN_REL = { generates: { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' },
                      controls: { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' } };
function getShishen(dm, t) {
  const a = STEM_FIVE[dm], b = STEM_FIVE[t];
  const same = STEM_YY[dm] === STEM_YY[t];
  if (a === b) return same ? '比肩' : '劫财';
  if (SHISHEN_REL.generates[a] === b) return same ? '食神' : '伤官';
  if (SHISHEN_REL.generates[b] === a) return same ? '偏印' : '正印';
  if (SHISHEN_REL.controls[a] === b) return same ? '偏财' : '正财';
  if (SHISHEN_REL.controls[b] === a) return same ? '七杀' : '正官';
  return '';
}

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

const SYSTEM = `你是命理编辑。从给定 RAG 原文里抽出关于「日干遇某种十神（正官/七杀/正印/偏印/正财/偏财/食神/伤官/比肩/劫财）流年」的论断。

要求：
1. 1-2 句原文，30-90 字
2. 必须紧扣这种十神当流年时的吉凶意义（如「正官行运富贵」「七杀须制」「比劫劫财」等）
3. 避开命例（光绪/某某命）
4. 若原文不含相关论断，返回 NA`;

async function clean (rawText, dayMaster, yearStem, shishen) {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `日干：${dayMaster}\n流年干：${yearStem}\n十神关系：${shishen}\n\n原文：\n${rawText}\n\n抽${shishen}流年论断。` },
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
  console.log('Building 流年 cache (100 entries)…');
  const cache = { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  let i = 0, total = STEMS.length * STEMS.length, success = 0, na = 0;

  for (const dm of STEMS) {
    for (const ys of STEMS) {
      i++;
      const ss = getShishen(dm, ys);
      const key = `${dm}_${ys}`;
      const queries = [
        `${ss}流年`,
        `${ss}行运`,
        `${dm}见${ys}流年`,
      ];
      let bestRaw = '', bestBook = '', bestQ = '';
      let bestScore = -Infinity;
      for (const q of queries) {
        try {
          const results = await ragSearch(q, 2);
          for (const r of results) {
            const t = (r.text || '').slice(0, 600);
            let s = 0;
            if (t.includes(ss)) s += 8;
            if (t.includes(dm)) s += 3;
            if (t.includes(ys)) s += 3;
            if (/(吉|凶|发|败|贵|贱|忌|喜)/.test(t)) s += 2;
            if (/光绪|道光|命：/.test(t)) s -= 8;
            if (s > bestScore) { bestScore = s; bestRaw = t; bestBook = r.book; bestQ = q; }
          }
        } catch (e) { /* skip */ }
      }
      if (bestScore < 0 || !bestRaw) { na++; process.stdout.write(`\r[${i}/${total}] ${key}(${ss}) (no RAG)         `); continue; }

      try {
        const cleaned = await clean(bestRaw, dm, ys, ss);
        if (cleaned === 'NA' || cleaned.length < 8) {
          na++;
          process.stdout.write(`\r[${i}/${total}] ${key}(${ss}) NA      `);
        } else {
          cache.entries[key] = { quote: cleaned, book: cleanBookName(bestBook), q: bestQ, ss };
          success++;
          process.stdout.write(`\r[${i}/${total}] ${key}(${ss}) ✓ (${cleaned.length}字)      `);
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
