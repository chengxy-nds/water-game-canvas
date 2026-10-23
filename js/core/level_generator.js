import { COLOR_KEYS } from '../config/colors.js';
import { BottleModel } from './bottle_model.js';

/**
 * 确定性伪随机数生成器 (Mulberry32)
 */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296.0;
  };
}

/**
 * 构建高交错且无死局的试管药水分布
 */
function buildVerifiedColorTubes(palette, cap, rng) {
  const n = palette.length;
  if (n <= 1) return [Array(cap).fill(palette[0])];
  const pool = [];
  palette.forEach(c => {
    for (let k = 0; k < cap; k++) pool.push(c);
  });

  let bestCandidate = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < 90; attempt++) {
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }

    const tubes = [];
    let valid = true;
    let totalTransitions = 0;
    const distinctBottoms = new Set();
    const distinctTops = new Set();

    for (let i = 0; i < n; i++) {
      const t = arr.slice(i * cap, (i + 1) * cap);
      if (t.every(c => c === t[0])) {
        valid = false;
        break;
      }
      let trans = 0;
      let maxRun = 1;
      let curRun = 1;
      for (let k = 1; k < cap; k++) {
        if (t[k] !== t[k - 1]) {
          trans++;
          curRun = 1;
        } else {
          curRun++;
          if (curRun > maxRun) maxRun = curRun;
        }
      }
      const allowedRun = cap >= 8 ? 2 : 1;
      if (maxRun > allowedRun && attempt < 65) {
        valid = false;
        break;
      }
      if (cap >= 4 && t[cap - 1] === t[cap - 2] && attempt < 75) {
        valid = false;
        break;
      }
      distinctBottoms.add(t[0]);
      distinctTops.add(t[cap - 1]);
      totalTransitions += trans;
      tubes.push(t);
    }

    if (!valid) continue;
    const score = totalTransitions * 10 + distinctBottoms.size * 6 + distinctTops.size * 8;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = tubes;
    }
    if (totalTransitions >= n * (cap - 1) * 0.94 && distinctTops.size >= Math.min(n, 4)) {
      return tubes;
    }
  }

  if (bestCandidate) return bestCandidate;
  return palette.map((_, i) => Array.from({ length: cap }, (__, k) => palette[(i + k * 2 + 1) % n]));
}

/**
 * 确保开局有可立即合并的明牌顶层颜色对 (防死锁工程规范)
 */
function ensureOpeningPairs(tubes, minPairs = 2, customFreeIndices = null) {
  if (!tubes || tubes.length < 3) return tubes;
  const cap = tubes[0].length;
  const freeIndices = customFreeIndices ? customFreeIndices.slice() : [];
  if (freeIndices.length === 0) {
    for (let i = 0; i < tubes.length; i += 2) freeIndices.push(i);
    for (let i = 1; i < tubes.length; i += 2) freeIndices.push(i);
  }

  const usedPairColors = new Set();
  const pairsToMake = Math.min(minPairs, Math.floor(freeIndices.length / 2));

  for (let step = 0; step < pairsToMake; step++) {
    const targetIdx = freeIndices[step * 2];
    const partnerIdx = freeIndices[step * 2 + 1];
    if (partnerIdx === undefined || partnerIdx >= tubes.length) break;

    let desiredColor = tubes[targetIdx][cap - 1];
    if (usedPairColors.has(desiredColor)) {
      for (let m = 0; m < tubes.length; m++) {
        for (let k = 0; k < cap; k++) {
          const cand = tubes[m][k];
          if (!usedPairColors.has(cand)) {
            const tmp = tubes[targetIdx][cap - 1];
            tubes[targetIdx][cap - 1] = cand;
            tubes[m][k] = tmp;
            desiredColor = cand;
            break;
          }
        }
        if (!usedPairColors.has(desiredColor)) break;
      }
    }
    usedPairColors.add(desiredColor);

    if (tubes[partnerIdx][cap - 1] !== desiredColor) {
      let swapped = false;
      for (let m = 0; m < tubes.length && !swapped; m++) {
        if (m === targetIdx) continue;
        for (let k = 0; k < cap - 1; k++) {
          if (tubes[m][k] === desiredColor && tubes[m][k] !== tubes[partnerIdx][cap - 1]) {
            const tmp = tubes[partnerIdx][cap - 1];
            tubes[partnerIdx][cap - 1] = desiredColor;
            tubes[m][k] = tmp;
            swapped = true;
            break;
          }
        }
      }
    }
  }

  return tubes;
}

/**
 * 200关核心关卡生成工厂
 */
export function generateLevel(levelNum, attemptSeed = null) {
  const lv = Math.max(1, Math.min(200, Math.floor(levelNum || 1)));
  const seedVal = attemptSeed !== null ? attemptSeed : 1013904223;
  const rng = mulberry32((lv * 2654435761 + seedVal) >>> 0);
  const chapter = Math.floor((lv - 1) / 10) + 1;
  const pos = ((lv - 1) % 10) + 1;

  const waveStarsMap = { 1: 3, 2: 4, 3: 4, 4: 5, 5: 5, 6: 3, 7: 4, 8: 5, 9: 5, 10: 5 };
  const waveStars = lv <= 2 ? 3 : waveStarsMap[pos];

  const config = {
    levelNum: lv,
    chapter,
    pos,
    waveStars,
    title: '',
    shortTag: '',
    hasBags: false,
    isVariedHeight: false,
    isCatBossLevel: false,
    layoutType: 'grid', // 'grid' | 'cat_boss' | 'varied' | 'tall8' | 'grid21'
    moveLimit: null,
    optimalMoves: 17,
    introMechanicKey: null,
    bags: [],
    bottles: []
  };

  // 新机制首次登场排期表
  if (lv === 4) config.introMechanicKey = 'mystery';
  else if (lv === 5) config.introMechanicKey = 'giant_cat';
  else if (lv === 6) config.introMechanicKey = 'ice_base';
  else if (lv === 7) config.introMechanicKey = 'silk_drape';
  else if (lv === 8) config.introMechanicKey = 'varied_height';
  else if (lv === 9) config.introMechanicKey = 'tall_8';
  else if (lv === 10) config.introMechanicKey = 'grand_obstacles';
  else if (lv === 12) config.introMechanicKey = 'color_lock';
  else if (lv === 16) config.introMechanicKey = 'one_way_in';
  else if (lv === 22) config.introMechanicKey = 'one_way_out';
  else if (lv === 26) config.introMechanicKey = 'hourglass_bomb';

  let rawBottles = [];

  // 第 1 关
  if (lv === 1) {
    config.title = '第 1 关 · 新手试炼';
    config.shortTag = '7色精粹';
    config.hasBags = false;
    config.optimalMoves = 17;
    const pal = COLOR_KEYS.slice().sort(() => rng() - 0.5).slice(0, 7);
    const filled = ensureOpeningPairs(buildVerifiedColorTubes(pal, 4, rng), 2);
    rawBottles = [
      ...filled.map((layers, idx) => ({ id: idx, maxCap: 4, layers: layers.slice(), special: 'none' })),
      { id: 7, maxCap: 4, layers: [], special: 'none' },
      { id: 8, maxCap: 4, layers: [], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 11, maxCap: 4, layers: [], special: 'ad_cam' }
    ];
  }
  // 第 2 & 3 关
  else if (lv === 2 || lv === 3) {
    config.title = lv === 2 ? '第 2 关 · 礼盒打包' : '第 3 关 · 水色交错';
    config.shortTag = lv === 2 ? '8色礼盒' : '深层交错';
    config.hasBags = true;
    config.optimalMoves = lv === 2 ? 19 : 21;
    const pal = COLOR_KEYS.slice().sort(() => rng() - 0.5).slice(0, 8);
    const filled = ensureOpeningPairs(buildVerifiedColorTubes(pal, 4, rng), 2);
    const bagCol0 = filled[0][3];
    const bagCol1 = filled.map(t => t[3]).find(c => c !== bagCol0) || pal.find(c => c !== bagCol0);
    config.bags = [
      { slot: 0, color: bagCol0, locked: false, packedBottle: null },
      { slot: 1, color: bagCol1, locked: false, packedBottle: null },
      { slot: 2, color: null, locked: true, packedBottle: null },
      { slot: 3, color: null, locked: true, packedBottle: null }
    ];
    rawBottles = [
      ...filled.map((layers, idx) => ({ id: idx, maxCap: 4, layers: layers.slice(), special: 'none' })),
      { id: 8, maxCap: 4, layers: [], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: 'none' },
      { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 11, maxCap: 4, layers: [], special: 'ad_cam' }
    ];
  }
  // Pos 5: 章中 BOSS · 皇家灵猫瓶
  else if (pos === 5) {
    const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
    const catColorKey = shuffledAll[0];
    const otherColors = shuffledAll.slice(1, 5);
    config.title = `第 ${lv} 关 · 皇家灵猫瓶`;
    config.shortTag = '🐱灵猫典藏';
    config.hasBags = false;
    config.isCatBossLevel = true;
    config.layoutType = 'cat_boss';
    config.optimalMoves = 18 + Math.min(8, Math.floor(chapter / 2));

    const subTubes = ensureOpeningPairs(buildVerifiedColorTubes(otherColors, 4, rng), 2);
    const f0 = [catColorKey, subTubes[0][0], subTubes[0][1], catColorKey];
    const f1 = [catColorKey, subTubes[1][0], subTubes[1][1], subTubes[1][2]];
    const f2 = [catColorKey, subTubes[2][0], subTubes[2][1], subTubes[2][2]];
    const f3 = [catColorKey, subTubes[3][0], subTubes[3][1], subTubes[0][2]];
    const f4 = [catColorKey, subTubes[3][2], subTubes[3][3], subTubes[1][3]];
    const f5 = [subTubes[2][3], subTubes[0][3]];
    const useMyst = chapter >= 2 ? 2 : 1;
    const useIce = chapter >= 2;
    const useOutAncient = chapter >= 3;

    rawBottles = [
      { id: 0, maxCap: 4, layers: f0.slice(), special: 'none', mysteryCount: useMyst },
      { id: 1, maxCap: 4, layers: f1.slice(), special: useIce ? 'ice_base' : 'none', poursToBreak: useIce ? 1 : 0 },
      { id: 2, maxCap: 8, isGiantCat: true, catTargetColor: catColorKey, layers: [catColorKey, catColorKey], special: 'none' },
      { id: 3, maxCap: 4, layers: f2.slice(), special: 'none', mysteryCount: useMyst },
      { id: 4, maxCap: 4, layers: f3.slice(), special: 'none', countdownMoves: chapter >= 4 ? 9 : null },
      { id: 5, maxCap: 4, layers: f4.slice(), special: chapter >= 2 ? 'stone_base' : 'none', poursToBreak: 2 },
      { id: 6, maxCap: 4, layers: f5.slice(), special: useOutAncient ? 'one_way_out' : 'none' },
      { id: 7, maxCap: 4, layers: [], special: 'none' },
      { id: 8, maxCap: 4, layers: [], special: 'none' }
    ];
  }
  // Pos 8 或 (Pos 3 & chapter >= 2): 高低异形声学瓶
  else if (pos === 8 || (pos === 3 && chapter >= 2)) {
    config.title = `第 ${lv} 关 · ${pos === 8 ? '高低声学瓶' : '异形色环局'}`;
    config.shortTag = pos === 8 ? (lv >= 28 ? '异形+流沙' : '高低声学') : '异形+色环';
    config.hasBags = false;
    config.isVariedHeight = true;
    config.layoutType = 'varied';
    config.optimalMoves = 20 + Math.min(8, Math.floor(chapter / 2));

    const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
    const c2A = shuffledAll[0], c2B = shuffledAll[1];
    const c4A = shuffledAll[2], c4B = shuffledAll[3], c4C = shuffledAll[4];
    const c6A = shuffledAll[5], c6B = shuffledAll[6];
    const tubes4 = ensureOpeningPairs(buildVerifiedColorTubes([c4A, c4B, c4C], 4, rng), 1, [0, 2, 1]);
    const tubes6 = buildVerifiedColorTubes([c6A, c6B], 6, rng);
    const lockCol4 = tubes4[0][3] || c4A;
    const useColorLockHere = (pos === 3 && chapter >= 2);
    const useFunnelAndBombHere = (pos === 8 && lv >= 28);

    rawBottles = [
      { id: 0, maxCap: 2, layers: [c2A, c2B], special: 'none' },
      { id: 1, maxCap: 6, layers: tubes6[0].slice(0, 5), special: 'ice_base', poursToBreak: 1 },
      { id: 2, maxCap: 4, layers: tubes4[0].slice(), special: 'none', mysteryCount: useFunnelAndBombHere ? 0 : 1, countdownMoves: useFunnelAndBombHere ? 9 : null },
      { id: 3, maxCap: 6, layers: tubes6[1].slice(0, 5), special: 'none', mysteryCount: 2 },
      { id: 4, maxCap: 2, layers: [c2B, c2A], special: 'none' },
      { id: 5, maxCap: 4, layers: tubes4[1].slice(), special: 'stone_base', poursToBreak: 2 },
      { id: 6, maxCap: 2, layers: [], special: 'none' },
      { id: 7, maxCap: 4, layers: tubes4[2].slice(), special: 'none', mysteryCount: 1 },
      { id: 8, maxCap: 6, layers: [tubes6[0][5], tubes6[1][5]], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: useColorLockHere ? 'color_lock' : 'none', requiredColor: useColorLockHere ? lockCol4 : null },
      { id: 10, maxCap: 6, layers: [], special: 'none' },
      { id: 11, maxCap: 4, layers: [], special: useColorLockHere ? 'none' : 'ad_cam' }
    ];
  }
  // Pos 9: 第二波峰 · 八色皇冠长管瓶
  else if (pos === 9) {
    config.title = `第 ${lv} 关 · 皇冠长管瓶`;
    config.shortTag = chapter >= 3 ? '8层+流沙' : '8层皇冠管';
    config.hasBags = false;
    config.layoutType = 'tall8';
    config.optimalMoves = 24 + Math.min(10, Math.floor(chapter / 2));
    const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
    const tallColors = shuffledAll.slice(0, 5);
    const tallTubes = ensureOpeningPairs(buildVerifiedColorTubes(tallColors, 8, rng), 1, [0, 2, 4]);

    const secondColor = tallTubes[0][6];
    if (tallTubes[4][7] !== secondColor) {
      for (const m of [0, 2, 4, 1, 3]) {
        let done = false;
        for (let k = 0; k < 6; k++) {
          if (tallTubes[m][k] === secondColor) {
            const tmp = tallTubes[4][7];
            tallTubes[4][7] = secondColor;
            tallTubes[m][k] = tmp;
            done = true;
            break;
          }
        }
        if (done) break;
      }
    }

    rawBottles = [
      { id: 0, maxCap: 8, layers: tallTubes[0].slice(), special: 'none', mysteryCount: 2 },
      { id: 1, maxCap: 8, layers: tallTubes[1].slice(), special: 'ice_base', poursToBreak: 1 },
      { id: 2, maxCap: 8, layers: tallTubes[2].slice(), special: 'none', mysteryCount: 1, countdownMoves: chapter >= 3 ? 14 : null },
      { id: 3, maxCap: 8, layers: tallTubes[3].slice(), special: 'stone_base', poursToBreak: 2 },
      { id: 4, maxCap: 8, layers: tallTubes[4].slice(), special: 'none', mysteryCount: 1 },
      { id: 5, maxCap: 8, layers: [], special: 'none' },
      { id: 6, maxCap: 8, layers: [], special: 'none' }
    ];
  }
  // Pos 10: 关底大魔王 · 21瓶王座局
  else if (pos === 10) {
    config.title = `第 ${lv} 关 · 冰封王座局`;
    config.shortTag = '👑宗师试炼';
    config.hasBags = true;
    config.layoutType = 'grid21';
    config.optimalMoves = 30 + Math.min(12, chapter);
    const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
    const openPalette = shuffledAll.slice(0, 5);
    const lockedPalette = shuffledAll.slice(5, 8);
    const openTubes = ensureOpeningPairs(buildVerifiedColorTubes(openPalette, 4, rng), 2);
    const lockedTubes = buildVerifiedColorTubes(lockedPalette, 4, rng);

    config.bags = [
      { slot: 0, color: openPalette[0], locked: false, packedBottle: null },
      { slot: 1, color: openPalette[1], locked: false, packedBottle: null },
      { slot: 2, color: null, locked: true, packedBottle: null },
      { slot: 3, color: null, locked: true, packedBottle: null }
    ];
    const useAdv = chapter >= 2;
    const useAdv3 = chapter >= 3;
    const cRed = openPalette[4];
    const cBlue = openPalette[3];
    const cCyan = lockedPalette[0];
    const cPurple = lockedPalette[1];
    const cPink = lockedPalette[2];

    rawBottles = [
      { id: 0, maxCap: 4, layers: openTubes[0].slice(0, 3), special: 'none' },
      { id: 1, maxCap: 4, layers: openTubes[1].slice(), special: 'none', mysteryCount: 2, countdownMoves: useAdv3 ? 8 : null },
      { id: 2, maxCap: 4, layers: openTubes[2].slice(), special: 'none' },
      { id: 3, maxCap: 4, layers: lockedTubes[0].slice(), special: 'silk_drape', unlockOrder: 1 },
      { id: 4, maxCap: 4, layers: openTubes[3].slice(), special: 'none', mysteryCount: 2 },
      { id: 5, maxCap: 4, layers: openTubes[4].slice(), special: 'ice_base', poursToBreak: 2 },
      { id: 6, maxCap: 4, layers: [openTubes[0][3]], special: useAdv3 ? 'one_way_out' : 'none' },
      { id: 7, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 8, maxCap: 4, layers: [cCyan, cPurple], special: 'none' },
      { id: 9, maxCap: 4, layers: [cPurple, cCyan, cPink, cCyan], special: 'none', mysteryCount: 2 },
      { id: 10, maxCap: 4, layers: lockedTubes[1].slice(), special: 'full_ice', unlockOrder: 2 },
      { id: 11, maxCap: 4, layers: [cPink, cPurple, cCyan], special: 'none' },
      { id: 12, maxCap: 4, layers: [cPink, cPink, cPurple], special: 'none' },
      { id: 13, maxCap: 4, layers: [], special: useAdv ? 'color_lock' : 'ad_cam', requiredColor: useAdv ? cRed : null },
      { id: 14, maxCap: 4, layers: [], special: 'none' },
      { id: 15, maxCap: 4, layers: [cRed, cBlue, cRed, cBlue], special: 'none', mysteryCount: 2 },
      { id: 16, maxCap: 4, layers: [cBlue, cRed, cBlue, cRed], special: 'stone_base', poursToBreak: 3 },
      { id: 17, maxCap: 4, layers: lockedTubes[2].slice(), special: 'paper_bag', unlockOrder: 3 },
      { id: 18, maxCap: 4, layers: [], special: 'none' },
      { id: 19, maxCap: 4, layers: [], special: 'none' },
      { id: 20, maxCap: 4, layers: [], special: 'none' }
    ];
  }
  // 常规关卡 (Pos 1, 2, 4, 6, 7 等)
  else {
    config.hasBags = (pos === 2 || pos === 6 || pos === 7 || lv === 4);
    const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
    const groupAColors = shuffledAll.slice(0, 6);
    const groupBColors = shuffledAll.slice(6, 8);
    const tubesA = ensureOpeningPairs(buildVerifiedColorTubes(groupAColors, 4, rng), 2);
    const tubesB = buildVerifiedColorTubes(groupBColors, 4, rng);
    const topExposedColor = tubesA[0][3] || groupAColors[0];

    config.optimalMoves = 20 + pos + Math.min(8, Math.floor(chapter / 2));

    if (lv === 4) {
      config.title = '第 4 关 · 星雾盲盒局'; config.shortTag = '❓星雾登场'; config.hasBags = false;
    } else if (lv === 6) {
      config.title = '第 6 关 · 极地霜晶座'; config.shortTag = '❄️霜晶登场'; config.hasBags = true;
    } else if (lv === 7) {
      config.title = '第 7 关 · 星缎礼袍局'; config.shortTag = '🧣星缎登场'; config.hasBags = true;
    } else if (lv === 12) {
      config.title = '第 12 关 · 宝石色环契约'; config.shortTag = '🔒色环登场'; config.hasBags = true;
    } else if (lv === 16) {
      config.title = '第 16 关 · 单向琉璃漏斗'; config.shortTag = '⏬漏斗登场'; config.hasBags = true;
    } else if (lv === 22) {
      config.title = '第 22 关 · 远古源泉古瓶'; config.shortTag = '⏫古瓶登场'; config.hasBags = true;
    } else if (lv === 26) {
      config.title = '第 26 关 · 星砂流沙怀表'; config.shortTag = '⏳流沙登场'; config.hasBags = true;
    } else if (pos === 4) {
      config.moveLimit = config.optimalMoves + 18;
      config.title = `第 ${lv} 关 · ${lv >= 24 ? '星晷流沙双限' : '星晷限步局'}`;
      config.shortTag = lv >= 24 ? `⏳限${config.moveLimit}步+流沙` : `✨限${config.moveLimit}步`;
    } else if (pos === 2) {
      config.title = `第 ${lv} 关 · 色环契约局`; config.shortTag = '🔒色环+星缎';
    } else if (pos === 6) {
      config.title = `第 ${lv} 关 · 漏斗缓冲谷`; config.shortTag = '⏬单向漏斗';
    } else if (pos === 7) {
      config.title = `第 ${lv} 关 · 古瓶冰雕阵`; config.shortTag = lv >= 17 ? '⏫古瓶+冰雕' : '🧊极光冰雕';
    } else {
      config.title = `第 ${lv} 关 · 水色交错`; config.shortTag = chapter >= 3 ? '⏫古瓶+星雾' : '深层星雾';
    }

    if (config.hasBags) {
      const bagCol0 = tubesA[0][3] || groupAColors[0];
      const bagCol1 = (pos === 6 && lv >= 16 && tubesA[5][0] !== bagCol0)
        ? tubesA[5][0]
        : (tubesA[4][3] !== bagCol0 ? tubesA[4][3] : (groupAColors.find(c => c !== bagCol0) || groupAColors[1]));
      config.bags = [
        { slot: 0, color: bagCol0, locked: false, packedBottle: null },
        { slot: 1, color: bagCol1, locked: false, packedBottle: null },
        { slot: 2, color: null, locked: true, packedBottle: null },
        { slot: 3, color: null, locked: true, packedBottle: null }
      ];
    }

    // 装配瓶子
    if (lv === 4) {
      rawBottles = [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 2 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'none', mysteryCount: 2 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 2 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 2 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 2 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none', mysteryCount: 1 },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'none', mysteryCount: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' }
      ];
    } else if (lv === 6) {
      rawBottles = [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 1 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 1 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 1 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 1 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'none' },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' }
      ];
    } else if (lv === 7) {
      rawBottles = [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 1 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 1 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 1 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 1 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none' },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'silk_drape', unlockOrder: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'silk_drape', unlockOrder: 2 },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' }
      ];
    } else if (pos === 2 && lv !== 22) {
      rawBottles = [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 1 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 1 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 1 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 1 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none' },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none' },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'silk_drape', unlockOrder: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'color_lock', requiredColor: topExposedColor },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'none' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' }
      ];
    } else if (pos === 6 && lv >= 16) {
      const hasBombHere = (lv >= 26);
      rawBottles = [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', countdownMoves: hasBombHere ? 8 : null },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'none', mysteryCount: 1 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: (lv >= 36) ? 0 : 1, countdownMoves: (lv >= 36) ? 10 : null },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 1 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none' },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(1), special: 'none' },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'paper_bag', unlockOrder: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [tubesA[5][0]], special: 'one_way_in' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'none' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' }
      ];
    } else if (lv === 22 || (pos === 7 && lv >= 17)) {
      rawBottles = [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'one_way_out' },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 1 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none' },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 1 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 1 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none' },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'full_ice', unlockOrder: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' }
      ];
    } else {
      const useBombInPos4 = (pos === 4 && lv >= 24);
      const useAncientInPos1 = (pos === 1 && chapter >= 3);
      rawBottles = [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: useAncientInPos1 ? 'one_way_out' : 'none', mysteryCount: (useAncientInPos1 || useBombInPos4) ? 0 : 2, countdownMoves: useBombInPos4 ? 8 : null },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'none', mysteryCount: 1 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: (useBombInPos4 && chapter >= 4) ? 0 : 1, countdownMoves: (useBombInPos4 && chapter >= 4) ? 10 : null },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: pos === 4 ? 'stone_base' : 'ice_base', poursToBreak: 1 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 1 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: pos === 4 ? 'stone_base' : 'none', poursToBreak: 2, mysteryCount: 1 },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'none', mysteryCount: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' }
      ];
    }
  }

  config.bottles = rawBottles.map(opts => new BottleModel(opts));
  return config;
}
