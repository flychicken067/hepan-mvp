#!/usr/bin/env node
// 调候/五行 cache · 120 entries (10 干 × 12 月支), focuses on 寒暖燥湿 调候
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'tiaohou-cache.json');
const RAG_BASE = 'http://localhost:18800';
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('DEEPSEEK_API_KEY env var required'); process.exit(1); }

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const MONTH_NAME = { 寅:'正月', 卯:'二月', 辰:'三月', 巳:'四月', 午:'五月', 未:'六月', 申:'七月', 酉:'八月', 戌:'九月', 亥:'十月', 子:'十一月', 丑:'十二月' };
const SEASON = { 寅:'春', 卯:'春', 辰:'春', 巳:'夏', 午:'夏', 未:'夏', 申:'秋', 酉:'秋', 戌:'秋', 亥:'冬', 子:'冬', 丑:'冬' };
const WHITE = new Set(['穷通宝鉴','三命通会.PDF (Administrator)','八字提要 (韦千里)','滴天髓','周易','麻衣神相']);

const cleanBookName = raw => {
  const r = (raw||'').replace(/\s*\(Owner\).*$/i,'').replace(/_compressed.*$/,'').replace(/\s*\(Z-Library\)/i,'').replace(/^\(.+?\)\s*/,'').trim();
  return r === '三命通会.PDF (Administrator)' ? '三命通会' : r === '八字提要 (韦千里)' ? '八字提要' : r;
};
const isClassic = raw => WHITE.has(raw);
const ragSearch = async (q, n=3) => { const r = await fetch(`${RAG_BASE}/search?q=${encodeURIComponent(q)}&n=${n}`); if (!r.ok) throw new Error(`RAG ${r.status}`); return (await r.json()).results || []; };

const SYSTEM = `命理编辑：从原文里抽出关于「日干在某季/月生」的寒暖燥湿调候论断（30-90字，1-2句原文）。要紧扣气候 / 调候关键词（寒/暖/燥/湿/调候/虚/实）。避命例。如不含调候论断返回 NA。`;

async function clean (raw, dm, br, mo, se) {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `日干：${dm}\n月支：${br}（${mo}/${se}）\n\n原文：\n${raw}\n\n抽${dm}日${se}季调候论断。` }],
      max_tokens: 200, temperature: 0.1,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  return ((await r.json()).choices?.[0]?.message?.content || '').trim();
}

async function main () {
  console.log('Building 调候 cache (120 entries)…');
  const cache = { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  let i = 0, total = STEMS.length * BRANCHES.length, success = 0, na = 0;
  for (const dm of STEMS) {
    for (const br of BRANCHES) {
      i++;
      const mo = MONTH_NAME[br], se = SEASON[br];
      const queries = [`${se}${dm}调候`, `${mo}${dm}寒暖`, `${dm}生${se}调`];
      let bestRaw='', bestBook='', bestQ='', bestScore=-Infinity;
      for (const q of queries) {
        try {
          const results = await ragSearch(q, 3);
          for (const r of results) {
            if (!isClassic(r.book)) continue;
            const t = (r.text||'').slice(0,600);
            let s=0;
            if (/(寒|暖|燥|湿|调候)/.test(t)) s+=8;
            if (t.includes(dm)) s+=4;
            if (t.includes(mo) || t.includes(br)) s+=3;
            if (/光绪|道光|命：/.test(t)) s-=8;
            if (s>bestScore) { bestScore=s; bestRaw=t; bestBook=r.book; bestQ=q; }
          }
        } catch(e) {}
      }
      if (bestScore<0 || !bestRaw) { na++; process.stdout.write(`\r[${i}/${total}] ${dm}_${br} (no RAG)         `); continue; }
      try {
        const cleaned = await clean(bestRaw, dm, br, mo, se);
        if (cleaned === 'NA' || cleaned.length < 8) { na++; process.stdout.write(`\r[${i}/${total}] ${dm}_${br} NA      `); }
        else { cache.entries[`${dm}_${br}`] = { quote: cleaned, book: cleanBookName(bestBook), q: bestQ }; success++; process.stdout.write(`\r[${i}/${total}] ${dm}_${br} ✓      `); }
      } catch(e) { process.stderr.write(`\n  [warn] ${dm}_${br}: ${e.message}\n`); }
      await new Promise(r => setTimeout(r, 150));
    }
  }
  process.stdout.write('\n');
  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`Success: ${success} · NA: ${na}`);
  console.log(`Saved: ${OUT_PATH} · ${(fs.statSync(OUT_PATH).size/1024).toFixed(1)} KB`);
}
main().catch(e => { console.error(e); process.exit(1); });
