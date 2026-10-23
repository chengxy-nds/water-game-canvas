import { SPECIAL_TYPES } from '../config/mechanics.js';

/**
 * 智能提示启发式寻路与星轨重塑洗牌
 */

/**
 * 寻找当前最优移动走法 (白皮书 2.3 策略重构规范)
 */
export function findBestPourMove(gameState) {
  const { bottles, bags } = gameState;
  let bestMove = null;
  let maxScore = -9999;

  const activeBagColors = new Set(bags.filter(b => !b.locked && b.color).map(b => b.color));

  for (let sIdx = 0; sIdx < bottles.length; sIdx++) {
    if (!gameState.canSelectBottle(sIdx)) continue;
    const src = bottles[sIdx];
    const pourAmount = src.topRunCount;
    const pourColor = src.topColor;

    for (let dIdx = 0; dIdx < bottles.length; dIdx++) {
      if (sIdx === dIdx) continue;
      if (!gameState.canPourInto(sIdx, dIdx)) continue;
      const dst = bottles[dIdx];
      const actualAmount = Math.min(pourAmount, dst.spaceLeft);
      if (actualAmount <= 0) continue;

      let score = 0;

      // 1. 异形空瓶精准满塞极值加权 (+220分)
      const isExactFitEmpty = dst.isEmpty && dst.maxCap === actualAmount;
      if (isExactFitEmpty) {
        score += 220;
      }

      // 2. 促成满瓶封存 (+120分)
      const willDstComplete = (dst.layers.length + actualAmount === dst.maxCap) &&
        (dst.isEmpty || dst.layers.every(c => c === pourColor));
      if (willDstComplete) {
        score += 120;
      }

      // 3. 打开中的购物袋导流加权 (+68分)
      if (activeBagColors.has(pourColor)) {
        score += 68;
      }

      // 4. 定向破冰消融 (+65分)
      if (dst.special === SPECIAL_TYPES.ICE_BASE || dst.special === SPECIAL_TYPES.STONE_BASE) {
        score += 65;
      }

      // 5. 专属色环契约匹配注入 (+75分)
      if (dst.special === SPECIAL_TYPES.COLOR_LOCK && dst.requiredColor === pourColor) {
        score += 75;
      }

      // 6. 倒入单向漏斗瓶 (+55分)
      if (dst.special === SPECIAL_TYPES.ONE_WAY_IN) {
        score += 55;
      }

      // 7. 源瓶能够被完全排空 (+45分)
      if (src.layers.length === actualAmount) {
        score += 45;
        // 若源瓶是单向古瓶，排空直接消散消去障碍 (+30分)
        if (src.special === SPECIAL_TYPES.ONE_WAY_OUT) {
          score += 30;
        }
      }

      // 8. 揭晓源瓶的盲盒 (+50分)
      if (src.mysteryCount > 0 && src.layers.length - actualAmount <= src.mysteryCount) {
        score += 50;
      }

      // 9. 普通倒入空瓶 (+20分，避免盲目占用空瓶)
      if (dst.isEmpty && !isExactFitEmpty) {
        // 如果源瓶本身已经是纯色，倒向空瓶通常扣分，避免无意义搬家
        if (src.layers.every(c => c === pourColor)) {
          score -= 30;
        } else {
          score += 20;
        }
      }

      // 10. 相同颜色连续性奖励
      score += actualAmount * 15;

      if (score > maxScore) {
        maxScore = score;
        bestMove = { srcIdx: sIdx, dstIdx: dIdx, score };
      }
    }
  }

  return bestMove;
}

/**
 * 星轨重塑（原地洗牌）：在无可走步或死局时触发 (白皮书漏洞 7 规范)
 */
export function shuffleBoard(gameState) {
  const { bottles } = gameState;

  // 1. 收集所有未封存、未锁定、可自由移动的药水层
  const movableLayers = [];
  const targetBottles = [];

  bottles.forEach(b => {
    if (b.removed || b.corked || b.isGiantCat) return;
    // 忽略被丝绸/全冰雕/纸袋完全锁死的瓶子
    if (b.unlockOrder > 0) return;
    targetBottles.push(b);

    // 提取超出盲盒以上的明牌水
    const visibleCount = Math.max(0, b.layers.length - b.mysteryCount);
    if (visibleCount > 0) {
      const removed = b.layers.splice(b.layers.length - visibleCount, visibleCount);
      movableLayers.push(...removed);
    }
  });

  if (movableLayers.length === 0 || targetBottles.length === 0) return false;

  // 2. 按颜色聚合排序，使同色尽量聚合在同一瓶内，促成破局
  movableLayers.sort();

  // 3. 优先回填非空瓶，留出空瓶供玩家中转
  let layerIdx = 0;
  for (const b of targetBottles) {
    while (b.layers.length < b.maxCap && layerIdx < movableLayers.length) {
      b.layers.push(movableLayers[layerIdx++]);
    }
  }

  return true;
}
