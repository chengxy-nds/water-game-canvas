import { SPECIAL_TYPES } from '../config/mechanics.js';

/**
 * 水瓶数据模型
 */
export class BottleModel {
  constructor(options = {}) {
    this.id = options.id ?? 0;
    this.maxCap = options.maxCap || 4;
    // 药水层：从底到顶排序，例如 ['red', 'blue', 'green']，最顶层为 layers[layers.length - 1]
    this.layers = options.layers ? options.layers.slice() : [];
    this.special = options.special || SPECIAL_TYPES.NONE;
    this.mysteryCount = options.mysteryCount || 0; // 盲盒遮蔽层数（从底部起算）
    this.requiredColor = options.requiredColor || null; // 色环指定颜色
    this.countdownMoves = options.countdownMoves ?? null; // 流沙炸弹剩余步数
    this.frozenTurns = options.frozenTurns || 0; // 寒冰封口惩罚剩余回合数
    this.poursToBreak = options.poursToBreak || 0; // 冰晶/锁扣所需破除次数
    this.unlockOrder = options.unlockOrder || 0; // 封印瓶解锁所需完成满瓶数
    this.isGiantCat = !!options.isGiantCat; // 是否是灵猫Boss瓶
    this.catTargetColor = options.catTargetColor || null;
    this.corked = !!options.corked; // 是否已落木塞封存
    this.removed = !!options.removed; // 是否已被移除/消散

    // 渲染布局与动画坐标属性 (由渲染器与布局计算器维护)
    this.x = 0;
    this.y = 0;
    this.baseY = 0; // 桌面静止时的原点 Y
    this.width = 78;
    this.height = 202;
    this.rotation = 0; // 倾斜弧度 (rad)
    this.scale = 1;
    this.sloshAmp = 0; // 水位阻尼摇晃振幅
    this.sloshPhase = 0; // 水位阻尼摇晃相位
  }

  /**
   * 顶层颜色（明牌）
   */
  get topColor() {
    if (this.layers.length === 0) return null;
    return this.layers[this.layers.length - 1];
  }

  /**
   * 剩余容量
   */
  get spaceLeft() {
    return Math.max(0, this.maxCap - this.layers.length);
  }

  /**
   * 是否为空瓶
   */
  get isEmpty() {
    return this.layers.length === 0;
  }

  /**
   * 是否已装满
   */
  get isFull() {
    return this.layers.length >= this.maxCap;
  }

  /**
   * 顶层连续同色且已明牌的层数
   */
  get topRunCount() {
    if (this.layers.length === 0) return 0;
    const top = this.topColor;
    let count = 0;
    // 只有超出 mysteryCount 的部分是明牌
    const visibleCount = Math.max(0, this.layers.length - this.mysteryCount);
    for (let i = this.layers.length - 1; i >= this.layers.length - visibleCount; i--) {
      if (this.layers[i] === top) count++;
      else break;
    }
    return count;
  }

  /**
   * 检查该瓶当前是否已满足单一纯色满瓶
   */
  isMonochromeFull() {
    if (!this.isFull) return false;
    if (this.mysteryCount > 0) return false;
    const first = this.layers[0];
    return this.layers.every(c => c === first);
  }

  /**
   * 揭晓盲盒一层（当向外倒出顶层水使层数减少到 <= mysteryCount 时）
   */
  revealNextMystery() {
    if (this.mysteryCount > 0 && this.layers.length <= this.mysteryCount) {
      this.mysteryCount--;
      return true;
    }
    return false;
  }

  /**
   * 深拷贝快照 (用于撤回栈与寻路)
   */
  clone() {
    const copy = new BottleModel({
      id: this.id,
      maxCap: this.maxCap,
      layers: this.layers.slice(),
      special: this.special,
      mysteryCount: this.mysteryCount,
      requiredColor: this.requiredColor,
      countdownMoves: this.countdownMoves,
      frozenTurns: this.frozenTurns,
      poursToBreak: this.poursToBreak,
      unlockOrder: this.unlockOrder,
      isGiantCat: this.isGiantCat,
      catTargetColor: this.catTargetColor,
      corked: this.corked,
      removed: this.removed
    });
    copy.x = this.x;
    copy.y = this.y;
    copy.baseY = this.baseY;
    copy.width = this.width;
    copy.height = this.height;
    return copy;
  }
}
