import { COLORS } from '../config/colors.js';

/**
 * 物理动态倾倒出水柱与飞瀑水流渲染器 (100% 对标 demo.html buildGravityStreamSVG)
 */
export class LiquidStreamRenderer {
  constructor() {
    this.streamTime = 0;
  }

  update(dt) {
    this.streamTime += dt;
  }

  /**
   * 绘制倾倒飞瀑水柱
   */
  renderStream(ctx, streamInfo) {
    if (!streamInfo || streamInfo.progress <= 0) return;

    const {
      startX, startY,
      mouthX = startX, mouthY = startY + 6,
      endX = mouthX, endY,
      colorKey,
      progress = 1,
      pourDir = 1
    } = streamInfo;

    const col = COLORS[colorKey] || COLORS.blue;

    ctx.save();

    // 水流展开与收束比例 (前10%展开，后10%收尾)
    const headRatio = Math.min(1, progress / 0.10);
    const tailRatio = progress > 0.90 ? Math.min(1, (progress - 0.90) / 0.10) : 0;

    const totalDrop = Math.max(16, endY - startY);
    const yTop = startY + totalDrop * (tailRatio * tailRatio * 0.85);
    const yBot = startY + totalDrop * (headRatio * headRatio);

    if (yBot - yTop < 4) {
      ctx.restore();
      return;
    }

    // 20 点精细流体采样：瓶嘴至瓶口微拱过渡 -> 瓶内垂直落瀑 (对标 demo.html 6885行)
    const N = 20;
    const leftPts = [];
    const rightPts = [];
    const centerPts = [];

    const dropToMouth = Math.max(4, mouthY - startY);

    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const y = yTop + (yBot - yTop) * s;

      let x = mouthX;
      if (y < mouthY) {
        // 瓶嘴至瓶口的平滑抛物过渡
        const archT = (y - startY) / dropToMouth;
        const easeArch = Math.sin(archT * Math.PI * 0.5);
        x = startX + (mouthX - startX) * easeArch;
      } else {
        // 瓶内垂直下落，带微幅流体抖动
        const fallRatio = (y - mouthY) / Math.max(1, endY - mouthY);
        x = mouthX + Math.sin(fallRatio * 8.5 + this.streamTime * 14) * 0.6;
      }

      // 重力加速导致下端水柱自然收窄 (Bernoulli 连续性方程)
      const globalS = (y - startY) / totalDrop;
      const gravityNarrow = 1.0 - 0.28 * Math.pow(globalS, 0.65);
      const mouthTaper = (y - startY) < 8 ? (0.68 + 0.32 * ((y - startY) / 8)) : 1.0;
      const surfaceFlare = (globalS > 0.88) ? (1.0 + Math.pow((globalS - 0.88) / 0.12, 1.4) * 0.45) : 1.0;
      const tailShrink = (1 - tailRatio * 0.65);

      const halfW = 3.6 * gravityNarrow * mouthTaper * surfaceFlare * tailShrink;

      leftPts.push({ x: x - halfW, y });
      rightPts.push({ x: x + halfW, y });
      centerPts.push({ x: x - halfW * 0.22, y });
    }

    // 1. 水柱外层多边形填充 (4区 PBR 渐变)
    ctx.beginPath();
    ctx.moveTo(leftPts[0].x, leftPts[0].y);
    for (let i = 1; i < leftPts.length; i++) ctx.lineTo(leftPts[i].x, leftPts[i].y);
    ctx.lineTo(rightPts[rightPts.length - 1].x, rightPts[rightPts.length - 1].y);
    for (let i = rightPts.length - 2; i >= 0; i--) ctx.lineTo(rightPts[i].x, rightPts[i].y);
    ctx.closePath();

    const streamGrad = ctx.createLinearGradient(mouthX - 7, 0, mouthX + 7, 0);
    streamGrad.addColorStop(0.00, col.highlight);
    streamGrad.addColorStop(0.25, col.topMid || col.mid);
    streamGrad.addColorStop(0.65, col.mid);
    streamGrad.addColorStop(1.00, col.right);
    ctx.fillStyle = streamGrad;
    ctx.fill();

    // 2. 水柱内层纯白高光线 (反光白金流线)
    ctx.beginPath();
    ctx.moveTo(centerPts[0].x, centerPts[0].y);
    for (let i = 1; i < centerPts.length; i++) ctx.lineTo(centerPts[i].x, centerPts[i].y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.lineWidth = 1.35;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. 接触液面微光扩散涟漪与动态冲击微水花 (100% 对标 demo.html 6960行)
    if (headRatio >= 0.95 && tailRatio < 0.90) {
      const timeNow = this.streamTime * 12;

      // A. 3 圈多相连续向外扩散同心柔和涟漪
      for (let r = 0; r < 3; r++) {
        const phase = (timeNow * 0.45 + r * 0.33) % 1.0;
        const curRx = 3.5 + phase * 10.5;
        const curRy = curRx * 0.28;
        const alpha = (1 - phase) * 0.55;
        ctx.strokeStyle = (r % 2 === 0) ? 'rgba(255, 255, 255, ' + alpha + ')' : col.topLight;
        ctx.lineWidth = Math.max(0.6, 1.4 - phase * 0.8);
        ctx.beginPath();
        ctx.ellipse(endX, endY, curRx, curRy, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // B. 入水点柔光冲击凹窝 (取代原先突兀白斑)
      const craterGrad = ctx.createRadialGradient(endX, endY, 0, endX, endY, 6.5);
      craterGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.48)');
      craterGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
      craterGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = craterGrad;
      ctx.beginPath();
      ctx.ellipse(endX, endY, 6.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // C. 水下上浮微泡 (2-3 颗轻灵错落上浮微泡)
      for (let b = 0; b < 3; b++) {
        const bPhase = (timeNow * 0.6 + b * 0.38) % 1.0;
        const bubbleY = endY + (1 - bPhase) * 12;
        const bubbleX = endX + Math.sin(timeNow * 2 + b * 3) * 3.2;
        const bubbleR = 0.8 + Math.sin(bPhase * Math.PI) * 0.7;
        const bubbleA = Math.sin(bPhase * Math.PI) * 0.6;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + bubbleA + ')';
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
