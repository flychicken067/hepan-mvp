// Bazi calculator + interpretation library
// Uses lunar-javascript (loaded via CDN) for accurate Chinese calendar conversion
// Provides: parsePillars, interpretChart, computeWuxing, getDashu

(function (global) {
  'use strict';

  // ============== STEMS / BRANCHES ==============
  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const STEM_FIVE = { 甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水' };
  const BRANCH_FIVE = { 子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水' };
  const STEM_YIN_YANG = { 甲:'阳',乙:'阴',丙:'阳',丁:'阴',戊:'阳',己:'阴',庚:'阳',辛:'阴',壬:'阳',癸:'阴' };

  // 藏干 (hidden stems in branches)
  const BRANCH_HIDDEN = {
    子: ['癸'],
    丑: ['己','癸','辛'],
    寅: ['甲','丙','戊'],
    卯: ['乙'],
    辰: ['戊','乙','癸'],
    巳: ['丙','戊','庚'],
    午: ['丁','己'],
    未: ['己','丁','乙'],
    申: ['庚','壬','戊'],
    酉: ['辛'],
    戌: ['戊','辛','丁'],
    亥: ['壬','甲'],
  };

  // Day-master English-friendly nicknames
  const DAY_MASTER_PERSONA = {
    甲: { metaphor: '参天大树', en: 'Towering Pine', trait: '正直、有主见、有原则' },
    乙: { metaphor: '柔藤花草', en: 'Climbing Vine', trait: '柔韧、有亲和力、能屈能伸' },
    丙: { metaphor: '太阳之火', en: 'The Sun', trait: '热情、外向、光明磊落、有领导力' },
    丁: { metaphor: '烛灯之火', en: 'Candlelight', trait: '细腻、温柔、有钻研精神' },
    戊: { metaphor: '高山厚土', en: 'Mountain', trait: '稳重、踏实、诚信、宽厚' },
    己: { metaphor: '田园沃土', en: 'Garden Soil', trait: '包容、务实、滋养他人' },
    庚: { metaphor: '钢铁刀剑', en: 'Forged Steel', trait: '果断、刚毅、敢作敢为' },
    辛: { metaphor: '珠宝美玉', en: 'Jewel', trait: '精致、敏感、追求美感' },
    壬: { metaphor: '江河大海', en: 'River', trait: '智慧、灵活、流动不羁' },
    癸: { metaphor: '雨露细水', en: 'Dew', trait: '温柔、细腻、滋润万物' },
  };

  // 十神 lookup (from day-master perspective)
  // Returns the role of `target` stem against `dayMaster`
  function getShiShen(dayMaster, target) {
    const dmFive = STEM_FIVE[dayMaster];
    const tFive = STEM_FIVE[target];
    const dmYY = STEM_YIN_YANG[dayMaster];
    const tYY = STEM_YIN_YANG[target];
    const sameYY = dmYY === tYY;

    // Same five = 比肩(同) / 劫财(异)
    if (dmFive === tFive) return sameYY ? '比肩' : '劫财';

    // Generates relationship
    const generates = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };
    if (generates[dmFive] === tFive) return sameYY ? '食神' : '伤官';
    if (generates[tFive] === dmFive) return sameYY ? '偏印' : '正印';

    // Controls relationship
    const controls = { 木:'土', 土:'水', 水:'火', 火:'金', 金:'木' };
    if (controls[dmFive] === tFive) return sameYY ? '偏财' : '正财';
    if (controls[tFive] === dmFive) return sameYY ? '七杀' : '正官';

    return '?';
  }

  // ============== MAIN: build pillars from date ==============
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM' (24h)
  // Requires window.Lunar (loaded via CDN: https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js)
  function buildPillars(dateStr, timeStr) {
    if (!global.Solar) {
      throw new Error('lunar-javascript not loaded. Include <script src="https://cdn.jsdelivr.net/npm/lunar-javascript@1.6.13/lunar.min.js"></script>');
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    const solar = global.Solar.fromYmdHms(y, m, d, hh, mm, 0);
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();

    return {
      year:  { stem: ec.getYear()[0],  branch: ec.getYear()[1]  },
      month: { stem: ec.getMonth()[0], branch: ec.getMonth()[1] },
      day:   { stem: ec.getDay()[0],   branch: ec.getDay()[1]   },
      hour:  { stem: ec.getTime()[0],  branch: ec.getTime()[1]  },
      raw: {
        year: ec.getYear(), month: ec.getMonth(), day: ec.getDay(), hour: ec.getTime(),
        gender: null,
      },
      lunar: {
        year: lunar.getYearInChinese(),
        month: lunar.getMonthInChinese(),
        day: lunar.getDayInChinese(),
      },
      solar: { y, m, d, hh, mm }
    };
  }

  // ============== WU XING (五行强弱) ==============
  function computeWuxing(pillars) {
    const score = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

    // Tian gan ×2
    [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].forEach(s => {
      score[STEM_FIVE[s]] += 2;
    });

    // Month branch ×3
    score[BRANCH_FIVE[pillars.month.branch]] += 3;

    // Other branches ×1.5
    [pillars.year.branch, pillars.day.branch, pillars.hour.branch].forEach(b => {
      score[BRANCH_FIVE[b]] += 1.5;
    });

    // Hidden stems ×0.8
    [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch].forEach(b => {
      (BRANCH_HIDDEN[b] || []).forEach(hs => {
        score[STEM_FIVE[hs]] += 0.8;
      });
    });

    // Round to 1 decimal
    Object.keys(score).forEach(k => score[k] = Math.round(score[k] * 10) / 10);
    return score;
  }

  // ============== 大运 (decade cycles) ==============
  // For male solar year stem 阳 → forward, 阴 → backward; female opposite.
  function getDashu(pillars, gender) {
    if (!global.Solar) return [];
    const yStem = pillars.year.stem;
    const yangYear = STEM_YIN_YANG[yStem] === '阳';
    const forward = (gender === 'male' && yangYear) || (gender === 'female' && !yangYear);

    const monthIdx = STEMS.indexOf(pillars.month.stem) * 12 + BRANCHES.indexOf(pillars.month.branch);
    // Use 60 jiazi
    const jiazi = [];
    for (let i = 0; i < 60; i++) {
      jiazi.push({ stem: STEMS[i % 10], branch: BRANCHES[i % 12] });
    }
    const startMonthSexagenaryIdx = jiaziIdx(pillars.month.stem, pillars.month.branch);

    const result = [];
    for (let i = 1; i <= 8; i++) {
      const offset = forward ? i : -i;
      const idx = ((startMonthSexagenaryIdx + offset) % 60 + 60) % 60;
      const ds = jiazi[idx];
      result.push({
        index: i,
        stem: ds.stem,
        branch: ds.branch,
        ageStart: i * 10 - 7,  // approx, real should compute by jiri
        ageEnd: i * 10 + 3,
      });
    }
    return result;
  }

  function jiaziIdx(stem, branch) {
    // Find sexagenary cycle index for a stem-branch pair
    const sIdx = STEMS.indexOf(stem);
    const bIdx = BRANCHES.indexOf(branch);
    // Sexagenary number where (i % 10 == sIdx) and (i % 12 == bIdx)
    for (let i = 0; i < 60; i++) {
      if (i % 10 === sIdx && i % 12 === bIdx) return i;
    }
    return -1;
  }

  // ============== INTERPRETATION (high-level) ==============
  function interpretChart(pillars, gender) {
    const dayMaster = pillars.day.stem;
    const persona = DAY_MASTER_PERSONA[dayMaster];
    const wuxing = computeWuxing(pillars);

    // Find strongest and weakest
    const sorted = Object.entries(wuxing).sort((a, b) => b[1] - a[1]);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    // 十神 for each non-day stem
    const shiShen = {
      year:  getShiShen(dayMaster, pillars.year.stem),
      month: getShiShen(dayMaster, pillars.month.stem),
      hour:  getShiShen(dayMaster, pillars.hour.stem),
    };

    return {
      dayMaster, persona, wuxing,
      strongest: { five: strongest[0], score: strongest[1] },
      weakest: { five: weakest[0], score: weakest[1] },
      shiShen,
      pillarsString: `${pillars.year.stem}${pillars.year.branch} · ${pillars.month.stem}${pillars.month.branch} · ${pillars.day.stem}${pillars.day.branch} · ${pillars.hour.stem}${pillars.hour.branch}`,
    };
  }

  // ============== COUPLE COMPATIBILITY ==============
  function computeCompatibility(maleChart, femaleChart) {
    const maleWuxing = maleChart.wuxing;
    const femaleWuxing = femaleChart.wuxing;

    // Mirror score: how well male's strong fives complement female's weak ones
    const fives = ['木','火','土','金','水'];
    let mirrorScore = 0;
    fives.forEach(f => {
      const m = maleWuxing[f] || 0;
      const fe = femaleWuxing[f] || 0;
      // If male strong + female weak (or vice versa) → +mirror
      if (m > 5 && fe < 2) mirrorScore += 15;
      else if (fe > 5 && m < 2) mirrorScore += 15;
      else if (Math.abs(m - fe) > 4) mirrorScore += 5;
    });
    mirrorScore = Math.min(mirrorScore, 40); // cap

    // Tian gan he hua check (天干六合)
    const liuhe = {
      '甲己':true, '己甲':true,
      '乙庚':true, '庚乙':true,
      '丙辛':true, '辛丙':true,
      '丁壬':true, '壬丁':true,
      '戊癸':true, '癸戊':true,
    };
    let heScore = 0;
    const malePillars = [maleChart.dayMaster];
    const femalePillars = [femaleChart.shiShen ? null : null]; // simplified
    // We need original pillars — let's add to chart return
    // For now, just check if there's any liuhe between any 2 stems

    // Day-master 相生 / 相克
    const dmM = STEM_FIVE[maleChart.dayMaster];
    const dmF = STEM_FIVE[femaleChart.dayMaster];
    const generates = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };
    let dmScore = 0;
    if (generates[dmM] === dmF) { dmScore = 25; /* male generates female */ }
    else if (generates[dmF] === dmM) { dmScore = 22; /* female generates male */ }
    else if (dmM === dmF) { dmScore = 18; /* same */ }
    else dmScore = 12; // neutral

    // Base score
    const total = Math.min(40 + mirrorScore + dmScore, 99);

    return {
      score: total,
      mirrorScore,
      dmScore,
      tier: total >= 80 ? '上佳合婚' : total >= 65 ? '良缘' : total >= 50 ? '中等' : '需努力',
      dayMasterRelation: generates[dmM] === dmF ? `${dmM} 生 ${dmF}（男生女）`
                       : generates[dmF] === dmM ? `${dmF} 生 ${dmM}（女生男）`
                       : dmM === dmF ? `同为 ${dmM}`
                       : `${dmM} 与 ${dmF} 中性`,
    };
  }

  // ============== TIANGAN LIUHE (天干六合) ==============
  // Returns { product, score, label } if any pair forms liuhe
  const LIUHE_PAIRS = {
    '甲己': { product: '土', label: '甲己合化土' },
    '乙庚': { product: '金', label: '乙庚合化金' },
    '丙辛': { product: '水', label: '丙辛合化水' },
    '丁壬': { product: '木', label: '丁壬合化木' },
    '戊癸': { product: '火', label: '戊癸合化火' },
  };
  function findTianganLiuhe(stems1, stems2) {
    const matches = [];
    stems1.forEach(s1 => stems2.forEach(s2 => {
      const k1 = s1 + s2;
      const k2 = s2 + s1;
      if (LIUHE_PAIRS[k1]) matches.push({ ...LIUHE_PAIRS[k1], stems: [s1, s2] });
      else if (LIUHE_PAIRS[k2]) matches.push({ ...LIUHE_PAIRS[k2], stems: [s1, s2] });
    }));
    return matches;
  }

  // ============== DIZHI 冲 / 刑 (branch conflicts) ==============
  const CHONG_PAIRS = ['子午','丑未','寅申','卯酉','辰戌','巳亥'];
  const ZIXING = ['辰辰','午午','酉酉','亥亥','申申']; // 自刑
  function findBranchConflicts(branches1, branches2) {
    const all = [...branches1, ...branches2];
    const conflicts = [];
    // chong
    CHONG_PAIRS.forEach(p => {
      const a = p[0], b = p[1];
      const inA = branches1.includes(a) || branches2.includes(a);
      const inB = branches1.includes(b) || branches2.includes(b);
      if (inA && inB) conflicts.push({ type: 'chong', branches: [a, b], label: `${a}${b}冲` });
    });
    // self-刑 (same branch in both pillars)
    branches1.forEach(b => {
      const count = all.filter(x => x === b).length;
      if (count >= 2 && ['辰','午','酉','亥','申'].includes(b)) {
        if (!conflicts.find(c => c.label === `${b}${b}自刑`)) {
          conflicts.push({ type: 'zixing', branches: [b, b], label: `${b}${b}自刑` });
        }
      }
    });
    return conflicts;
  }

  // ============== ENRICHED COMPATIBILITY ==============
  function fullCompatibility(maleChart, malePillars, femaleChart, femalePillars) {
    const baseCompat = computeCompatibility(maleChart, femaleChart);

    const maleStems = [malePillars.year.stem, malePillars.month.stem, malePillars.day.stem, malePillars.hour.stem];
    const femaleStems = [femalePillars.year.stem, femalePillars.month.stem, femalePillars.day.stem, femalePillars.hour.stem];
    const maleBranches = [malePillars.year.branch, malePillars.month.branch, malePillars.day.branch, malePillars.hour.branch];
    const femaleBranches = [femalePillars.year.branch, femalePillars.month.branch, femalePillars.day.branch, femalePillars.hour.branch];

    const liuhe = findTianganLiuhe(maleStems, femaleStems);
    const conflicts = findBranchConflicts(maleBranches, femaleBranches);

    // bonus for liuhe whose product fills male's weakness
    let bonus = 0;
    liuhe.forEach(h => {
      if (h.product === maleChart.weakest.five || h.product === femaleChart.weakest.five) bonus += 5;
    });
    // penalty for chong involving day-pillar
    conflicts.forEach(c => {
      if (c.type === 'chong' && (c.branches.includes(malePillars.day.branch) || c.branches.includes(femalePillars.day.branch))) bonus -= 4;
      if (c.type === 'zixing' && (c.branches[0] === malePillars.day.branch || c.branches[0] === femalePillars.day.branch)) bonus -= 3;
    });

    const finalScore = Math.max(40, Math.min(99, baseCompat.score + bonus));

    // Day-master family kanyou (similar group)
    const maleFive = STEM_FIVE[maleChart.dayMaster];
    const femaleFive = STEM_FIVE[femaleChart.dayMaster];
    const generates = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };
    let trigram = ['离', '坤']; // default
    const FIVE_TO_TRIGRAM = { 木: '震', 火: '离', 土: '坤', 金: '兑', 水: '坎' };
    trigram = [FIVE_TO_TRIGRAM[maleFive] || '离', FIVE_TO_TRIGRAM[femaleFive] || '坤'];

    const TRIGRAM_SYMBOL = { 乾:'☰', 坤:'☷', 震:'☳', 巽:'☴', 坎:'☵', 离:'☲', 艮:'☶', 兑:'☱' };
    const heGua = `${TRIGRAM_SYMBOL[trigram[1]]}${TRIGRAM_SYMBOL[trigram[0]]}`;

    return {
      ...baseCompat,
      score: finalScore,
      tier: finalScore >= 80 ? '上佳合婚' : finalScore >= 65 ? '良缘' : finalScore >= 50 ? '中等' : '需努力',
      liuhe,
      conflicts,
      trigrams: { male: trigram[0], female: trigram[1] },
      heGuaSymbol: heGua,
    };
  }

  // ============== SUMMARY HELPERS ==============
  // Year stem-branch from solar year (approximates by Chinese New Year)
  function getYearGanZhi(year) {
    // Reference: 1984 = 甲子 (cycle index 0)
    const idx = ((year - 1984) % 60 + 60) % 60;
    return STEMS[idx % 10] + BRANCHES[idx % 12];
  }

  // Find which dashu the person is currently in (very rough — by age)
  function getCurrentDashu(dashuList, currentAge) {
    return dashuList.find(d => currentAge >= d.ageStart && currentAge < d.ageEnd) || dashuList[Math.min(3, dashuList.length - 1)];
  }

  // ============== EXPORTS ==============
  global.Hepan = {
    STEMS, BRANCHES, STEM_FIVE, BRANCH_FIVE, STEM_YIN_YANG, BRANCH_HIDDEN,
    DAY_MASTER_PERSONA, LIUHE_PAIRS, CHONG_PAIRS,
    buildPillars, computeWuxing, getDashu, interpretChart, computeCompatibility,
    fullCompatibility, findTianganLiuhe, findBranchConflicts,
    getShiShen, getYearGanZhi, getCurrentDashu,
  };

})(typeof window !== 'undefined' ? window : globalThis);
