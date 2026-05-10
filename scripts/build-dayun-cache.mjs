#!/usr/bin/env node
// 大运 cache · 100 entries (10 日干 × 10 大运干), keyed by十神 like 流年
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'dayun-cache.json');
const RAG_BASE = 'http://localhost:18800';
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('DEEPSEEK_API_KEY env var required'); process.exit(1); }

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const STEM_FIVE = { 甲:'木', 乙:'木', 丙:'火', 丁:'火', 戊:'土', 己:'土', 庚:'金', 辛:'金', 壬:'水', 癸:'水' };
const STEM_YY = { 甲:'阳', 乙:'阴', 丙:'阳', 丁:'阴', 戊:'阳', 己:'阴', 庚:'阳', 辛:'阴', 壬:'阳', 癸:'阴' };
const REL = { generates: { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' }, controls: { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' } };
function getShishen(dm, t) {
  const a = STEM_FIVE[dm], b = STEM_FIVE[t], same = STEM_YY[dm] === STEM_YY[t];
  if (a === b) return same ? '比肩' : '劫财';
  if (REL.generates[a] === b) return same ? '食神' : '伤官';
  if (REL.generates[b] === a) return same ? '偏印' : '正印';
  if (REL.controls[a] === b) return same ? '偏财' : '正财';
  if (REL.controls[b] === a) return same ? '七杀' : '正官';
  return '';
}

const cleanBookName = raw => (raw||'').replace(/\s*\(Owner\).*$/i,'').replace(/_compressed.*$/,'').replace(/\s*\(Z-Library\)/i,'').replace(/^\(.+?\)\s*/,'').trim();
const ragSearch = async (q, n=3) => { const r = await fetch(`${RAG_BASE}/search?q=${encodeURIComponent(q)}&n=${n}`); if (!r.ok) throw new Error(`RAG ${r.status}`); return (await r.json()).results || []; };

const SYSTEM = `命理编辑：从原文里抽出关于「日干行某种十神大运」的论断（30-90字，1-2句原文）。要紧扣大运/行运的吉凶变化。避命例。如不含相关论断返回 NA。`;

async function clean (raw, dm, dy, ss) {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `日干：${dm}\n大运干：${dy}\n十神：${ss}\n\n原文：\n${raw}\n\n抽${ss}大运论断。` }],
      max_tokens: 200, temperature: 0.1,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  return ((await r.json()).choices?.[0]?.message?.content || '').trim();
}

async function main () {
  console.log('Building 大运 cache (100 entries)…');
  const cache = { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  let i = 0, total = 100, success = 0, na = 0;
  for (const dm of STEMS) {
    for (const dy of STEMS) {
      i++;
      const ss = getShishen(dm, dy);
      const key = `${dm}_${dy}`;
      const queries = [`${ss}大运`, `${ss}行运`, `行${dy}运`];
      let bestRaw='', bestBook='', bestQ='', bestScore=-Infinity;
      for (const q of queries) {
        try {
          const results = await ragSearch(q, 2);
          for (const r of results) {
            const t = (r.text||'').slice(0,600);
            let s=0;
            if (t.includes(ss)) s+=8;
            if (t.includes('运')) s+=3;
            if (t.includes(dm)) s+=2;
            if (/光绪|道光|命：/.test(t)) s-=8;
            if (s>bestScore) { bestScore=s; bestRaw=t; bestBook=r.book; bestQ=q; }
          }
        } catch(e) {}
      }
      if (bestScore<0 || !bestRaw) { na++; process.stdout.write(`\r[${i}/${total}] ${key}(${ss}) (no RAG)         `); continue; }
      try {
        const cleaned = await clean(bestRaw, dm, dy, ss);
        if (cleaned === 'NA' || cleaned.length < 8) { na++; process.stdout.write(`\r[${i}/${total}] ${key}(${ss}) NA      `); }
        else { cache.entries[key] = { quote: cleaned, book: cleanBookName(bestBook), q: bestQ, ss }; success++; process.stdout.write(`\r[${i}/${total}] ${key}(${ss}) ✓      `); }
      } catch(e) { process.stderr.write(`\n  [warn] ${key}: ${e.message}\n`); }
      await new Promise(r => setTimeout(r, 150));
    }
  }
  process.stdout.write('\n');
  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`Success: ${success} · NA: ${na}`);
  console.log(`Saved: ${OUT_PATH} · ${(fs.statSync(OUT_PATH).size/1024).toFixed(1)} KB`);
}
main().catch(e => { console.error(e); process.exit(1); });
