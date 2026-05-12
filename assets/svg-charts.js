// SVG chart components for the 7 ontology chapters.
// All functions take chart data and return an SVG string.
// No external dependencies — pure SVG.

(function (global) {
  'use strict';

  const COLORS = {
    paper: 'rgba(255,255,255,0.14)',
    paperWarm: 'rgba(255,255,255,0.22)',
    ink: 'rgba(255,255,255,0.93)',
    inkSoft: 'rgba(255,255,255,0.78)',
    inkMute: 'rgba(255,255,255,0.45)',
    vermillion: '#ff8a75',
    vermillionSoft: '#ffb3a8',
    gold: '#ffd060',
    goldSoft: '#ffe49a',
    jade: '#7ecfc6',
    fiveColors: { '木': '#7ecfc6', '火': '#ff8a75', '土': '#ffd060', '金': '#c8d0d8', '水': '#7eb3ff' }
  };

  // ============== 01 · 排盘 (Both charts side by side) ==============
  function chartPillars(malePillars, femalePillars) {
    const pillarHTML = (p, color) => {
      const cells = [
        ['时', p.hour.stem, p.hour.branch],
        ['日', p.day.stem, p.day.branch, true],
        ['月', p.month.stem, p.month.branch],
        ['年', p.year.stem, p.year.branch],
      ];
      return cells.map(([label, stem, branch, isDay], i) => `
        <g transform="translate(${i * 50}, 0)">
          <text x="20" y="14" font-family="Noto Serif SC, serif" font-size="9" fill="${COLORS.inkMute}" text-anchor="middle" letter-spacing="2">${label}</text>
          <rect x="2" y="20" width="36" height="36" fill="${isDay ? color : 'none'}" stroke="${color}" stroke-width="${isDay ? 2 : 1}" rx="4"/>
          <text x="20" y="42" font-family="Noto Serif SC, serif" font-weight="700" font-size="22" fill="${isDay ? COLORS.paper : COLORS.vermillion}" text-anchor="middle">${stem}</text>
          <rect x="2" y="62" width="36" height="36" fill="none" stroke="${color}" stroke-width="0.6" rx="4" stroke-opacity="0.5"/>
          <text x="20" y="84" font-family="Noto Serif SC, serif" font-weight="600" font-size="20" fill="${COLORS.ink}" text-anchor="middle">${branch}</text>
        </g>
      `).join('');
    };

    return `
      <svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:380px;display:block;">
        <text x="100" y="14" font-family="JetBrains Mono, monospace" font-size="10" fill="${COLORS.inkMute}" text-anchor="middle" letter-spacing="3">男 · MALE</text>
        <g transform="translate(0, 20)">${pillarHTML(malePillars, COLORS.vermillion)}</g>
        <text x="100" y="160" font-family="JetBrains Mono, monospace" font-size="10" fill="${COLORS.inkMute}" text-anchor="middle" letter-spacing="3">女 · FEMALE</text>
        <g transform="translate(0, 166)">${pillarHTML(femalePillars, COLORS.gold)}</g>
      </svg>
    `;
  }

  // ============== 02 · 五行雷达 ==============
  function chartWuxing(maleWuxing, femaleWuxing) {
    const fives = ['木', '火', '土', '金', '水'];
    const cx = 140, cy = 150, r = 95;
    const max = 12;

    const polygon = (wx, color, opacity) => {
      const points = fives.map((f, i) => {
        const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
        const v = Math.min((wx[f] || 0) / max, 1) * r;
        return `${cx + Math.cos(angle) * v},${cy + Math.sin(angle) * v}`;
      }).join(' ');
      return `<polygon points="${points}" fill="${color}" fill-opacity="${opacity}" stroke="${color}" stroke-width="1.5"/>`;
    };

    const grid = [0.25, 0.5, 0.75, 1].map(scale => {
      const points = fives.map((f, i) => {
        const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
        return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`;
      }).join(' ');
      return `<polygon points="${points}" fill="none" stroke="${COLORS.inkMute}" stroke-width="0.4" stroke-opacity="0.3"/>`;
    }).join('');

    const labels = fives.map((f, i) => {
      const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
      const x = cx + Math.cos(angle) * (r + 16);
      const y = cy + Math.sin(angle) * (r + 16);
      return `<text x="${x}" y="${y + 5}" font-family="Noto Serif SC, serif" font-weight="700" font-size="14" fill="${COLORS.fiveColors[f]}" text-anchor="middle">${f}</text>`;
    }).join('');

    return `
      <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;display:block;">
        ${grid}
        ${polygon(maleWuxing, COLORS.vermillion, 0.18)}
        ${polygon(femaleWuxing, COLORS.gold, 0.18)}
        ${labels}
        <g transform="translate(40, 280)">
          <rect width="12" height="3" fill="${COLORS.vermillion}" y="6"/>
          <text x="18" y="12" font-family="JetBrains Mono, monospace" font-size="10" fill="${COLORS.inkMute}">男</text>
          <rect width="12" height="3" fill="${COLORS.gold}" x="60" y="6"/>
          <text x="78" y="12" font-family="JetBrains Mono, monospace" font-size="10" fill="${COLORS.inkMute}">女</text>
        </g>
      </svg>
    `;
  }

  // ============== 03 · 格局 (Trigram pair) ==============
  const TRIGRAM_LINES = {
    '乾': [1,1,1], '坤': [0,0,0], '震': [1,0,0], '巽': [0,1,1],
    '坎': [0,1,0], '离': [1,0,1], '艮': [1,0,0], '兑': [0,1,1],
  };
  const TRIGRAM_SYMBOL = { 乾:'☰', 坤:'☷', 震:'☳', 巽:'☴', 坎:'☵', 离:'☲', 艮:'☶', 兑:'☱' };

  function chartGeju(maleTrigram, femaleTrigram, maleMaster, femaleMaster) {
    return `
      <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;display:block;">
        <circle cx="140" cy="140" r="120" fill="none" stroke="${COLORS.inkMute}" stroke-width="0.6" stroke-opacity="0.3"/>
        <circle cx="140" cy="140" r="80" fill="none" stroke="${COLORS.gold}" stroke-width="0.5" stroke-opacity="0.4"/>

        <!-- male trigram top -->
        <g transform="translate(140, 50)">
          <text x="0" y="0" font-family="serif" font-size="56" fill="${COLORS.vermillion}" text-anchor="middle">${TRIGRAM_SYMBOL[maleTrigram] || '☰'}</text>
          <text x="0" y="20" font-family="Noto Serif SC, serif" font-weight="700" font-size="14" fill="${COLORS.ink}" text-anchor="middle">${maleTrigram}</text>
          <text x="0" y="36" font-family="JetBrains Mono, monospace" font-size="10" fill="${COLORS.inkMute}" text-anchor="middle" letter-spacing="2">男 · ${maleMaster}</text>
        </g>

        <!-- female trigram bottom -->
        <g transform="translate(140, 220)">
          <text x="0" y="0" font-family="serif" font-size="56" fill="${COLORS.gold}" text-anchor="middle">${TRIGRAM_SYMBOL[femaleTrigram] || '☷'}</text>
          <text x="0" y="20" font-family="Noto Serif SC, serif" font-weight="700" font-size="14" fill="${COLORS.ink}" text-anchor="middle">${femaleTrigram}</text>
          <text x="0" y="-22" font-family="JetBrains Mono, monospace" font-size="10" fill="${COLORS.inkMute}" text-anchor="middle" letter-spacing="2">女 · ${femaleMaster}</text>
        </g>

        <!-- center connector -->
        <line x1="140" y1="120" x2="140" y2="160" stroke="${COLORS.vermillion}" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="140" y="146" font-family="Noto Serif SC, serif" font-weight="600" font-size="12" fill="${COLORS.vermillion}" text-anchor="middle">合</text>
      </svg>
    `;
  }

  // ============== 04 · 用神 (Five-element cycle with weakest highlighted) ==============
  function chartYongshen(maleWuxing, femaleWuxing, maleWeakest, femaleWeakest) {
    const fives = ['木', '火', '土', '金', '水'];
    const cx = 140, cy = 140, r = 80;

    const nodes = fives.map((f, i) => {
      const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const isMaleWeak = f === maleWeakest;
      const isFemaleWeak = f === femaleWeakest;
      const fill = (isMaleWeak || isFemaleWeak) ? COLORS.fiveColors[f] : COLORS.paper;
      const strokeColor = COLORS.fiveColors[f];
      const radius = (isMaleWeak || isFemaleWeak) ? 28 : 22;
      const labelColor = (isMaleWeak || isFemaleWeak) ? COLORS.paper : COLORS.fiveColors[f];
      return `
        <g transform="translate(${x}, ${y})">
          <circle r="${radius}" fill="${fill}" stroke="${strokeColor}" stroke-width="${(isMaleWeak || isFemaleWeak) ? 2 : 1}"/>
          <text x="0" y="6" font-family="Noto Serif SC, serif" font-weight="700" font-size="20" fill="${labelColor}" text-anchor="middle">${f}</text>
          ${isMaleWeak ? `<text x="0" y="38" font-family="JetBrains Mono, monospace" font-size="9" fill="${COLORS.vermillion}" text-anchor="middle" letter-spacing="1">他缺</text>` : ''}
          ${isFemaleWeak ? `<text x="0" y="${isMaleWeak ? 50 : 38}" font-family="JetBrains Mono, monospace" font-size="9" fill="${COLORS.gold}" text-anchor="middle" letter-spacing="1">她缺</text>` : ''}
        </g>
      `;
    }).join('');

    // generation arrows (木→火→土→金→水→木)
    const arrows = [];
    for (let i = 0; i < 5; i++) {
      const a1 = (Math.PI * 2 * i / 5) - Math.PI / 2;
      const a2 = (Math.PI * 2 * ((i + 1) % 5) / 5) - Math.PI / 2;
      const x1 = cx + Math.cos(a1) * (r * 0.7);
      const y1 = cy + Math.sin(a1) * (r * 0.7);
      const x2 = cx + Math.cos(a2) * (r * 0.7);
      const y2 = cy + Math.sin(a2) * (r * 0.7);
      arrows.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.inkMute}" stroke-width="0.6" stroke-opacity="0.4" stroke-dasharray="2,2"/>`);
    }

    return `
      <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;display:block;">
        ${arrows.join('')}
        ${nodes}
        <text x="140" y="148" font-family="Noto Serif SC, serif" font-weight="600" font-size="11" fill="${COLORS.inkMute}" text-anchor="middle" letter-spacing="3">生 克 之 道</text>
      </svg>
    `;
  }

  // ============== 05 · 大运 (Decade timeline) ==============
  function chartDashu(maleDashu, femaleDashu, maleAge, femaleAge) {
    const w = 360, h = 260, lineY1 = 100, lineY2 = 180;
    const stepW = w / 8;

    const renderTrack = (track, age, color, lineY) => {
      return track.map((d, i) => {
        const x = i * stepW + stepW / 2;
        const isCurrent = age >= d.ageStart && age < d.ageEnd;
        return `
          <g transform="translate(${x}, ${lineY})">
            <circle r="${isCurrent ? 18 : 13}" fill="${isCurrent ? color : COLORS.paper}" stroke="${color}" stroke-width="${isCurrent ? 2 : 1}"/>
            <text x="0" y="${isCurrent ? 4 : 3}" font-family="Noto Serif SC, serif" font-weight="700" font-size="${isCurrent ? 13 : 10}" fill="${isCurrent ? COLORS.paper : color}" text-anchor="middle">${d.stem}${d.branch}</text>
            <text x="0" y="${isCurrent ? 36 : 30}" font-family="JetBrains Mono, monospace" font-size="9" fill="${COLORS.inkMute}" text-anchor="middle">${d.ageStart}–${d.ageEnd}</text>
          </g>
        `;
      }).join('') + `<line x1="${stepW/2}" y1="${lineY}" x2="${(track.length - 1) * stepW + stepW/2}" y2="${lineY}" stroke="${color}" stroke-width="0.4" stroke-opacity="0.3"/>`;
    };

    return `
      <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:380px;display:block;">
        <text x="${stepW/2}" y="${lineY1 - 30}" font-family="JetBrains Mono, monospace" font-size="10" fill="${COLORS.inkMute}" letter-spacing="2">男 · ${maleAge}岁</text>
        ${renderTrack(maleDashu.slice(0, 8), maleAge, COLORS.vermillion, lineY1)}
        <text x="${stepW/2}" y="${lineY2 - 30}" font-family="JetBrains Mono, monospace" font-size="10" fill="${COLORS.inkMute}" letter-spacing="2">女 · ${femaleAge}岁</text>
        ${renderTrack(femaleDashu.slice(0, 8), femaleAge, COLORS.gold, lineY2)}
      </svg>
    `;
  }

  // ============== 06 · 流年 (Year wheel: 12 branches) ==============
  function chartLiunian(currentYearStem, currentYearBranch, maleSS, femaleSS) {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const cx = 140, cy = 140, r = 90;

    const slots = branches.map((b, i) => {
      const angle = (Math.PI * 2 * i / 12) - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const isCurrent = b === currentYearBranch;
      return `
        <g transform="translate(${x}, ${y})">
          <circle r="${isCurrent ? 16 : 11}" fill="${isCurrent ? COLORS.vermillion : COLORS.paper}" stroke="${COLORS.vermillion}" stroke-width="${isCurrent ? 1.5 : 0.6}" stroke-opacity="${isCurrent ? 1 : 0.5}"/>
          <text x="0" y="${isCurrent ? 5 : 4}" font-family="Noto Serif SC, serif" font-weight="700" font-size="${isCurrent ? 14 : 11}" fill="${isCurrent ? COLORS.paper : COLORS.inkSoft}" text-anchor="middle">${b}</text>
        </g>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;display:block;">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLORS.inkMute}" stroke-width="0.4" stroke-opacity="0.3"/>
        ${slots}
        <text x="${cx}" y="${cy - 14}" font-family="JetBrains Mono, monospace" font-size="9" fill="${COLORS.inkMute}" text-anchor="middle" letter-spacing="2">2026 流年</text>
        <text x="${cx}" y="${cy + 6}" font-family="Noto Serif SC, serif" font-weight="700" font-size="32" fill="${COLORS.vermillion}" text-anchor="middle">${currentYearStem}${currentYearBranch}</text>
        <text x="${cx}" y="${cy + 28}" font-family="Noto Serif SC, serif" font-size="11" fill="${COLORS.inkSoft}" text-anchor="middle">男 ${maleSS} · 女 ${femaleSS}</text>
      </svg>
    `;
  }

  // ============== 07 · 合婚 (Score + Trigram) ==============
  function chartHehun(score, tier, heGuaSymbol, trigramMale, trigramFemale) {
    const cx = 140, cy = 140;

    // Outer score ring
    const ringR = 100, ringStroke = 8;
    const circumference = 2 * Math.PI * ringR;
    const offset = circumference - (score / 100) * circumference;

    return `
      <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;display:block;">
        <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${COLORS.paperWarm}" stroke-width="${ringStroke}"/>
        <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${COLORS.vermillion}" stroke-width="${ringStroke}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round"/>

        <text x="${cx}" y="${cy - 18}" font-family="JetBrains Mono, monospace" font-size="10" fill="${COLORS.inkMute}" text-anchor="middle" letter-spacing="3">合 婚 评 分</text>
        <text x="${cx}" y="${cy + 22}" font-family="Noto Serif SC, serif" font-weight="900" font-size="56" fill="${COLORS.ink}" text-anchor="middle">${score}</text>
        <text x="${cx}" y="${cy + 44}" font-family="Noto Serif SC, serif" font-size="13" fill="${COLORS.vermillion}" text-anchor="middle" letter-spacing="2">${tier}</text>

        <text x="${cx}" y="${cy + 82}" font-family="serif" font-size="36" fill="${COLORS.gold}" text-anchor="middle" letter-spacing="6">${heGuaSymbol}</text>
        <text x="${cx}" y="${cy + 102}" font-family="JetBrains Mono, monospace" font-size="9" fill="${COLORS.inkMute}" text-anchor="middle" letter-spacing="3">${trigramMale} · ${trigramFemale}</text>
      </svg>
    `;
  }

  // ============== EXPORTS ==============
  global.HepanCharts = {
    chartPillars,
    chartWuxing,
    chartGeju,
    chartYongshen,
    chartDashu,
    chartLiunian,
    chartHehun,
  };

})(typeof window !== 'undefined' ? window : globalThis);
