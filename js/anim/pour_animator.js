import { Easing, getPhysicalSpillAngleDeg } from './tween.js';

/**
 * 零跳动轨迹与物理阻尼倾倒动画管线 (白皮书 1.4 & 1.8 规范)
 * 严格对标 demo.html 原版 Lip-Anchored 刚体运动学与流体级注水
 */
export class PourAnimator {
  constructor() {
    this.currentAnim = null;
    this.streamInfo = null;
  }

  get isBusy() {
    return this.currentAnim !== null;
  }

  /**
   * 启动一次完整的物理倒水动画
   */
  startPourAnimation(options) {
    const {
      srcBottle,
      dstBottle,
      pourAmount,
      pourColor,
      onPourProgress,
      onPourComplete,
      onPourWaterImpact
    } = options;

    // 确定倾倒朝向：若目标瓶在源瓶右边，向右倾斜；若在左边，向左倾斜
    const isPouringRight = dstBottle.x >= srcBottle.x;
    const pourDir = isPouringRight ? 1 : -1;

    // 源瓶在原位的瓶嘴世界坐标 (Lip Pivot)
    const halfW = srcBottle.width / 2;
    const halfH = srcBottle.height / 2;
    const outerRx = halfW * 0.90;
    const localLipX = pourDir * (outerRx * 0.38);
    const localLipY = -halfH + srcBottle.height * 0.05;
    const originLipX = srcBottle.x + halfW + localLipX;
    const originLipY = srcBottle.y + halfH + localLipY;

    // 目标瓶口中心世界坐标
    const dstMouthX = dstBottle.x + dstBottle.width / 2;
    const dstMouthY = dstBottle.y + dstBottle.height * 0.05;

    // 源瓶倾倒目标位：源瓶瓶嘴直接精准搭在目标瓶口正上方 5px 处 (对齐 demo.html targetLipX/Y)
    const targetLipX = dstMouthX - pourDir * 3.5;
    const targetLipY = dstMouthY - 6.0;

    // 求解物理临界出水倾角 (63度 ~ 96度)
    const spillAngleDeg = getPhysicalSpillAngleDeg(srcBottle.layers.length, srcBottle.maxCap);
    const finalRotRad = (spillAngleDeg * Math.PI / 180) * pourDir;

    srcBottle.isFlying = true;
    srcBottle.pourDir = pourDir;
    srcBottle.lipX = originLipX;
    srcBottle.lipY = originLipY;
    srcBottle.rotation = 0;

    this.currentAnim = {
      phase: 'fly_to_target', // 'fly_to_target' -> 'pour_liquid' -> 'fly_back'
      elapsed: 0,
      srcBottle,
      dstBottle,
      originLipX,
      originLipY,
      targetLipX,
      targetLipY,
      dstMouthX,
      dstMouthY,
      finalRotRad,
      pourDir,
      pourAmount,
      pourColor,
      onPourProgress,
      onPourComplete,
      onPourWaterImpact,
      waterImpactTriggered: false
    };

    this.streamInfo = null;
  }

  update(dt) {
    if (!this.currentAnim) return;

    const anim = this.currentAnim;
    anim.elapsed += dt;

    // 阶段 1：起飞并以自然抛物线飞向目标瓶口上方 (280ms)
    if (anim.phase === 'fly_to_target') {
      const duration = 0.28;
      const t = Math.min(1, anim.elapsed / duration);
      const easeT = Easing.easeOutCubic(t);
      const arcLiftY = -Math.sin(t * Math.PI) * 18; // 跨越其他水瓶的自然抛物线抬升

      anim.srcBottle.lipX = anim.originLipX + (anim.targetLipX - anim.originLipX) * easeT;
      anim.srcBottle.lipY = anim.originLipY + (anim.targetLipY - anim.originLipY) * easeT + arcLiftY;
      anim.srcBottle.rotation = anim.finalRotRad * easeT;

      if (t >= 1) {
        anim.phase = 'pour_liquid';
        anim.elapsed = 0;
      }
    }
    // 阶段 2：倾倒出水与流体实时转移推进 (480ms)
    else if (anim.phase === 'pour_liquid') {
      const duration = 0.48;
      const t = Math.min(1, anim.elapsed / duration);

      anim.srcBottle.lipX = anim.targetLipX;
      anim.srcBottle.lipY = anim.targetLipY;

      // 随液量排空瓶身微调物理倾角
      const dynamicRot = anim.finalRotRad * (1 + 0.06 * Math.sin(t * Math.PI));
      anim.srcBottle.rotation = dynamicRot;

      // 实时流体体积转移：源瓶实时排空，目标瓶实时上涨
      anim.srcBottle.drainRatio = t;
      anim.dstBottle.fillRatio = t * (anim.pourAmount || 1);
      anim.dstBottle.fillingColor = anim.pourColor;
      anim.dstBottle.sloshAmp = Math.sin(t * Math.PI) * 0.35;

      // 目标瓶口接水点 (直抵目标瓶内实时上升的液面顶层)
      const dstTopY = anim.dstBottle.y + anim.dstBottle.height * 0.24;
      const dstBottomY = anim.dstBottle.y + anim.dstBottle.height * 0.912;
      const layerH = (dstBottomY - dstTopY) / (anim.dstBottle.maxCap || 4);
      const currentFillLayers = anim.dstBottle.layers.length + t * (anim.pourAmount || 1);
      const currentSurfaceY = Math.max(dstTopY, dstBottomY - currentFillLayers * layerH);

      this.streamInfo = {
        startX: anim.targetLipX,
        startY: anim.targetLipY,
        mouthX: anim.dstMouthX,
        mouthY: anim.dstMouthY,
        endX: anim.dstMouthX,
        endY: currentSurfaceY,
        colorKey: anim.pourColor,
        progress: t,
        pourDir: anim.pourDir
      };

      if (!anim.waterImpactTriggered && t > 0.12) {
        anim.waterImpactTriggered = true;
        if (anim.onPourWaterImpact) {
          anim.onPourWaterImpact(anim.dstMouthX, currentSurfaceY, anim.pourColor);
        }
      }

      if (anim.onPourProgress) {
        anim.onPourProgress(t);
      }

      if (t >= 1) {
        // 清除过渡标志
        anim.srcBottle.drainRatio = undefined;
        anim.dstBottle.fillRatio = undefined;
        anim.dstBottle.fillingColor = undefined;
        this.streamInfo = null;
        anim.phase = 'fly_back';
        anim.elapsed = 0;
      }
    }
    // 阶段 3：平滑回正飞回桌面原点 (260ms)
    else if (anim.phase === 'fly_back') {
      const duration = 0.26;
      const t = Math.min(1, anim.elapsed / duration);
      const easeT = Easing.easeOutQuad(t);
      const arcLiftY = -Math.sin(t * Math.PI) * 14;

      anim.srcBottle.lipX = anim.targetLipX + (anim.originLipX - anim.targetLipX) * easeT;
      anim.srcBottle.lipY = anim.targetLipY + (anim.originLipY - anim.targetLipY) * easeT + arcLiftY;
      anim.srcBottle.rotation = anim.finalRotRad * (1 - easeT);

      if (t >= 1) {
        // 落座归位彻底消除二次拔高 (白皮书 1.8 规范)
        anim.srcBottle.isFlying = false;
        anim.srcBottle.lipX = undefined;
        anim.srcBottle.lipY = undefined;
        anim.srcBottle.rotation = 0;

        // 激活微物理落座阻尼回弹衰减 (白皮书 1.7)
        anim.srcBottle.settleTime = 0;
        anim.srcBottle.sloshAmp = 0.55;
        anim.srcBottle.sloshPhase = 0;

        const completeCb = anim.onPourComplete;
        this.currentAnim = null;
        this.streamInfo = null;

        if (completeCb) completeCb();
      }
    }
  }
}
