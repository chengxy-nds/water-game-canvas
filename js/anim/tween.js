/**
 * 补间动画缓动曲线与数学物理衰减函数
 */
export const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeOutBack: (t, s = 1.70158) => {
    t = t - 1;
    return t * t * ((s + 1) * t + s) + 1;
  },
  easeOutElastic: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  /**
   * 真实微物理落座阻尼回弹衰减 (白皮书 1.7: amp(t) = exp(-3.4t) * 0.58)
   */
  sloshDamping: (t) => {
    return Math.exp(-3.4 * t) * Math.sin(12.8 * t) * 0.58;
  },
  /**
   * 瓶子落座阻尼物理位移偏移量 (t: 0 -> 1, 返回额外 Y 像素偏移)
   */
  bottleLandingOffset: (t) => {
    if (t >= 1) return 0;
    // 采用阻尼衰减震荡函数：下压微弹再归零
    return Math.exp(-4.2 * t) * Math.sin(Math.PI * 2.8 * t) * 4.5;
  }
};

/**
 * 动态出水临界倾角计算 (白皮书 1.4: 真实物理重力倾倒模型)
 * @param {Number} volumeLayers 剩余液量层数 (0~4)
 * @param {Number} maxCap 瓶子最大容量
 * @returns {Number} 倾角 (角度 Deg)
 */
export function getPhysicalSpillAngleDeg(volumeLayers, maxCap = 4) {
  const v = Math.max(0.0, Math.min(4.0, (volumeLayers / maxCap) * 4.0));
  return v >= 1.0 ? (96.0 - (v - 1.0) * 11.0) : (96.0 + (1.0 - v) * 7.0);
}
