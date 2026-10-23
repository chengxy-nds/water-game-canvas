import { SPECIAL_TYPES } from '../config/mechanics.js';
import { generateLevel } from './level_generator.js';

/**
 * 游戏核心状态机
 */
export class GameState {
  constructor() {
    this.currentLevelNum = 1;
    this.levelConfig = null;
    this.bottles = [];
    this.bags = [];
    this.selectedIndex = null;
    this.remainingMoves = null;
    this.packedTotal = 0;
    this.isAnimating = false;
    this.historyStack = [];

    // 道具库存与状态
    this.hintUses = 3;
    this.undoUses = 5;
    this.addBottleUses = 2;
    this.shuffleUses = 3;
    this.activeHintPair = null;
  }

  /**
   * 初始化关卡
   */
  loadLevel(levelNum, attemptSeed = null) {
    this.currentLevelNum = levelNum;
    this.levelConfig = generateLevel(levelNum, attemptSeed);
    this.bottles = this.levelConfig.bottles;
    this.bags = this.levelConfig.bags ? JSON.parse(JSON.stringify(this.levelConfig.bags)) : [];
    this.selectedIndex = null;
    this.remainingMoves = this.levelConfig.moveLimit;
    this.packedTotal = 0;
    this.isAnimating = false;
    this.historyStack = [];
    this.activeHintPair = null;
  }

  /**
   * 条件 1 & 2: 源瓶是否可以被选中拿起
   */
  canSelectBottle(srcIdx) {
    const s = this.bottles[srcIdx];
    if (!s || s.removed || s.corked || s.isGiantCat || s.isEmpty) return false;
    // 寒冰封口惩罚中不可拿起
    if (s.frozenTurns > 0) return false;
    // 已经是一整瓶纯色满瓶，不可拿起
    if (this.isCompleteBottle(s)) return false;

    // 单向与特殊瓶约束：严禁拿起 one_way_in、ice_base、stone_base、silk_drape、full_ice、paper_bag、ad_cam
    const allowedSpecial = [SPECIAL_TYPES.NONE, SPECIAL_TYPES.ONE_WAY_OUT, SPECIAL_TYPES.COLOR_LOCK];
    return allowedSpecial.includes(s.special);
  }

  /**
   * 条件 3, 4, 5, 6: 是否允许将源瓶倒入目标瓶
   */
  canPourInto(srcIdx, dstIdx) {
    if (srcIdx === dstIdx) return false;
    const s = this.bottles[srcIdx];
    const d = this.bottles[dstIdx];
    if (!s || !d || s.removed || d.removed || s.corked || d.corked) return false;
    if (s.frozenTurns > 0 || d.frozenTurns > 0) return false;
    if (d.spaceLeft <= 0) return false;

    // 目标瓶可接水类型约束：禁止向 one_way_out 或各种封印瓶注水
    const allowedSpecialDst = [
      SPECIAL_TYPES.NONE,
      SPECIAL_TYPES.ICE_BASE,
      SPECIAL_TYPES.STONE_BASE,
      SPECIAL_TYPES.ONE_WAY_IN,
      SPECIAL_TYPES.COLOR_LOCK
    ];
    if (!allowedSpecialDst.includes(d.special)) return false;

    // 色环契约校验 (color_lock)
    const pourColor = s.topColor;
    if (!pourColor) return false;
    if (d.special === SPECIAL_TYPES.COLOR_LOCK) {
      if (pourColor !== d.requiredColor) return false;
    }

    // 液面颜色匹配：目标瓶为空或颜色相同
    if (d.isEmpty) return true;
    return d.topColor === pourColor;
  }

  /**
   * 计算单次合法转移的水层数
   */
  calculatePourAmount(srcIdx, dstIdx) {
    if (!this.canPourInto(srcIdx, dstIdx)) return 0;
    const s = this.bottles[srcIdx];
    const d = this.bottles[dstIdx];
    return Math.min(s.topRunCount, d.spaceLeft);
  }

  /**
   * 满瓶封存校验 (严格落实防死锁漏洞 2 & 3)
   */
  isCompleteBottle(b) {
    if (!b || b.removed || b.corked || b.isEmpty) return false;
    if (!b.isMonochromeFull()) return false;

    // 规则 9：单向出水古瓶豁免满瓶封存，继续作为供水瓶
    if (b.special === SPECIAL_TYPES.ONE_WAY_OUT) return false;

    // 漏洞 2：灵猫关卡非灵猫小瓶集满目标色，严禁落塞封存！
    if (this.levelConfig?.isCatBossLevel && !b.isGiantCat) {
      const catBottle = this.bottles.find(item => item.isGiantCat);
      if (catBottle && b.layers[0] === catBottle.catTargetColor) {
        return false;
      }
    }

    // 漏洞 3：异形关卡全局同色余量校验
    if (this.levelConfig?.isVariedHeight) {
      const col = b.layers[0];
      const otherSameColorCount = this.bottles
        .filter(item => item.id !== b.id && !item.removed && !item.corked)
        .reduce((sum, item) => sum + item.layers.filter(c => c === col).length, 0);

      // 如果场上其他瓶子还留有此颜色，且剩余量无法直接匹配其他空闲瓶，则暂不封存，允许中转
      if (otherSameColorCount > 0) {
        const hasMatchingSpace = this.bottles.some(
          item => item.id !== b.id && !item.removed && !item.corked && item.maxCap === otherSameColorCount
        );
        if (!hasMatchingSpace) return false;
      }
    }

    return true;
  }

  /**
   * 保存当前盘面快照至撤回栈
   */
  saveSnapshot() {
    const snapshot = {
      remainingMoves: this.remainingMoves,
      packedTotal: this.packedTotal,
      bags: JSON.parse(JSON.stringify(this.bags)),
      bottles: this.bottles.map(b => b.clone())
    };
    this.historyStack.push(snapshot);
    if (this.historyStack.length > 30) this.historyStack.shift();
  }

  /**
   * 撤回一步
   */
  undo() {
    if (this.isAnimating || this.historyStack.length === 0 || this.undoUses <= 0) return false;
    const snap = this.historyStack.pop();
    this.remainingMoves = snap.remainingMoves;
    this.packedTotal = snap.packedTotal;
    this.bags = snap.bags;
    this.bottles = snap.bottles.map(b => b.clone());
    this.selectedIndex = null;
    this.activeHintPair = null;
    this.undoUses--;
    return true;
  }

  /**
   * 执行倾倒状态结算（数据层）
   * @returns {Object} 倾倒事件明细，用于驱动动画与音效
   */
  applyPour(srcIdx, dstIdx) {
    const amount = this.calculatePourAmount(srcIdx, dstIdx);
    if (amount <= 0) return null;

    this.saveSnapshot();
    const src = this.bottles[srcIdx];
    const dst = this.bottles[dstIdx];
    const pourColor = src.topColor;

    // 1. 移动液体
    const moved = src.layers.splice(src.layers.length - amount, amount);
    dst.layers.push(...moved);

    // 2. 扣减步数
    if (typeof this.remainingMoves === 'number' && this.remainingMoves > 0) {
      this.remainingMoves--;
    }

    // 3. 盲盒揭晓
    const revealedMystery = src.revealNextMystery();

    // 4. 目标瓶是否刚达成满瓶
    const dstCompleted = this.isCompleteBottle(dst);
    if (dstCompleted) {
      dst.corked = true;
      // 封存时解除流沙炸弹
      if (dst.countdownMoves > 0) dst.countdownMoves = null;
    }

    // 源瓶是否排空
    const srcEmptied = src.isEmpty;
    let ancientVanished = false;
    if (srcEmptied) {
      if (src.countdownMoves > 0) src.countdownMoves = null;
      // 规则 9：单向出水古瓶排空瞬间原地消散
      if (src.special === SPECIAL_TYPES.ONE_WAY_OUT) {
        src.removed = true;
        ancientVanished = true;
      }
    }

    // 5. 推进流沙炸弹与寒冰封口回合 (全局步进)
    this.stepTurnBasedMechanics(srcIdx, dstIdx, dstCompleted);

    // 6. 推进霜晶 (ice_base) 与锁扣 (stone_base) 消融
    this.stepObstacleMelting(dstIdx, dstCompleted);

    // 7. 推进订单锁 (silk_drape, full_ice, paper_bag)
    if (dstCompleted) {
      this.stepUnlockOrderMechanics();
    }

    return {
      srcIdx,
      dstIdx,
      amount,
      color: pourColor,
      dstCompleted,
      revealedMystery,
      ancientVanished
    };
  }

  /**
   * 处理流沙炸弹 (countdownMoves) 与寒冰封口 (frozenTurns) 回合步进
   */
  stepTurnBasedMechanics(srcIdx, dstIdx, dstCompleted) {
    this.bottles.forEach(b => {
      if (b.removed || b.corked) return;

      // A. 寒冰封口倒计时减少
      if (b.frozenTurns > 0) {
        b.frozenTurns--;
        return;
      }

      // B. 流沙炸弹步数倒计时
      if (typeof b.countdownMoves === 'number' && b.countdownMoves > 0) {
        if (b.isEmpty) {
          b.countdownMoves = null;
          return;
        }
        b.countdownMoves--;
        if (b.countdownMoves <= 0) {
          // 超时惩罚：封口 3 回合
          b.countdownMoves = null;
          b.frozenTurns = 3;
        }
      }
    });
  }

  /**
   * 冰晶霜晶 (ice_base) 与鎏金锁扣 (stone_base) 消融计算
   */
  stepObstacleMelting(dstIdx, dstWillCompleteNow) {
    this.bottles.forEach((b, idx) => {
      if (b.removed || b.corked) return;

      // 冰晶凝霜瓶：直接注入同色或场上满瓶消融 1 层；若直接注满则全融
      if (b.special === SPECIAL_TYPES.ICE_BASE && b.poursToBreak > 0) {
        const directThermalHit = (idx === dstIdx);
        if (directThermalHit || dstWillCompleteNow) {
          b.poursToBreak = (directThermalHit && dstWillCompleteNow) ? 0 : (b.poursToBreak - 1);
          if (b.poursToBreak <= 0) {
            b.special = SPECIAL_TYPES.NONE;
          }
        }
      }

      // 鎏金锁扣瓶：场上满瓶或自身凑满崩解 1 层
      if (b.special === SPECIAL_TYPES.STONE_BASE && b.poursToBreak > 0) {
        const selfFull = (idx === dstIdx && b.isFull);
        if (dstWillCompleteNow || selfFull) {
          b.poursToBreak = (idx === dstIdx && dstWillCompleteNow) ? 0 : (b.poursToBreak - 1);
          if (b.poursToBreak <= 0) {
            b.special = SPECIAL_TYPES.NONE;
          }
        }
      }
    });
  }

  /**
   * 封印类瓶 (silk_drape / full_ice / paper_bag) 解锁步进
   */
  stepUnlockOrderMechanics() {
    this.packedTotal++;
    this.bottles.forEach(b => {
      if (b.removed || b.corked) return;
      if (b.unlockOrder > 0 && this.packedTotal >= b.unlockOrder) {
        b.unlockOrder = 0;
        b.special = SPECIAL_TYPES.NONE;
      }
    });
  }

  /**
   * 查找下一个需要的购物袋颜色 (防死锁漏洞 1)
   */
  pickNextNeededBagColor(bagIdx) {
    const existingBagColors = new Set(this.bags.map(b => b.color).filter(Boolean));
    // 优先从当前可拿起的明牌瓶中提取未被已有袋子占用的颜色
    for (const b of this.bottles) {
      if (b.removed || b.corked || b.isEmpty) continue;
      if (b.special === SPECIAL_TYPES.NONE || b.special === SPECIAL_TYPES.ONE_WAY_OUT) {
        const top = b.topColor;
        if (top && !existingBagColors.has(top)) return top;
      }
    }
    // 次选场上任意有效药水色
    for (const b of this.bottles) {
      if (b.removed || b.corked || b.isEmpty) continue;
      for (const col of b.layers) {
        if (!existingBagColors.has(col)) return col;
      }
    }
    return null;
  }

  /**
   * 检查是否通关胜利
   */
  checkWin() {
    // 灵猫Boss关：灵猫瓶装满8层即胜利
    if (this.levelConfig?.isCatBossLevel) {
      const cat = this.bottles.find(b => b.isGiantCat);
      return cat ? cat.isFull && cat.isMonochromeFull() : false;
    }

    // 常规模式：所有未被移除的水瓶必须全部已落塞封存或彻底排空
    return this.bottles.every(b => {
      if (b.removed) return true;
      if (b.isEmpty && b.special !== SPECIAL_TYPES.GIANT_CAT) return true;
      return b.corked;
    });
  }

  /**
   * 检查是否步数耗尽失败
   */
  checkMoveLimitFailed() {
    if (this.levelConfig?.moveLimit === null) return false;
    return this.remainingMoves !== null && this.remainingMoves <= 0 && !this.checkWin();
  }
}
