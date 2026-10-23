import { COLORS, MYSTERY_COLOR } from '../config/colors.js';
import { SPECIAL_TYPES } from '../config/mechanics.js';

/**
 * 2.5D 琉璃瓶与物理重力液面纯 Canvas 2D 渲染器 (100% 对标 demo.html 原型级晶莹通透感)
 */
export class BottleRenderer {
  constructor() {
    this.sloshTimer = 0;
  }

  update(dt) {
    this.sloshTimer += dt;
  }

  /**
   * 绘制单只水瓶：
   * 阶段 A: 桌面粗麻布软垫底座与地面投影 (永远稳固锚定在桌面 baseY)
   * 阶段 B: 晶莹水晶琉璃瓶身 (根据实时坐标与倾倒旋转姿态渲染)
   */
  renderBottle(ctx, b, isSelected = false) {
    if (b.removed) return;

    const w = Number.isFinite(b.width) && b.width > 0 ? b.width : 52;
    const h = Number.isFinite(b.height) && b.height > 0 ? b.height : 136;
    const rawX = Number.isFinite(b.x) ? b.x : 0;
    const rawBaseY = Number.isFinite(b.baseY) ? b.baseY : (Number.isFinite(b.y) ? b.y : 180);
    const rawY = Number.isFinite(b.y) ? b.y : rawBaseY;

    const halfW = w / 2;
    const halfH = h / 2;

    const outerRx = halfW * 0.90;
    const innerRx = halfW * 0.81;
    const outerBotY = halfH - h * 0.05;
    const innerBotY = halfH - h * 0.088;

    // =========================================================================
    // 阶段 A: 桌面 3D 粗麻布软垫底座 (锚定在桌面 rawBaseY，无论瓶子悬空或飞走永远在桌面)
    // =========================================================================
    const tableCenterX = rawX + halfW;
    const tableCenterY = rawBaseY + halfH;
    const liftDist = Math.max(0, rawBaseY - rawY);

    ctx.save();
    ctx.translate(tableCenterX, tableCenterY);
    this.renderBurlapCoaster(ctx, b, halfW, halfH, liftDist, outerBotY);
    ctx.restore();

    // =========================================================================
    // 阶段 B: 水晶琉璃瓶身 (根据瓶子实时坐标与 Lip-Anchored 飞行倾倒姿态渲染)
    // =========================================================================
    const bottleCenterX = rawX + halfW;
    const bottleCenterY = rawY + halfH;

    ctx.save();
    // 刚体逆向运动学 (Lip-Anchored Pose): 倒水时围绕精准对位瓶嘴旋转
    if (b.isFlying && Number.isFinite(b.lipX) && Number.isFinite(b.lipY)) {
      const localLipX = (b.pourDir || 1) * (outerRx * 0.38);
      const localLipY = -halfH + h * 0.05;
      ctx.translate(b.lipX, b.lipY);
      if (b.rotation) ctx.rotate(b.rotation);
      if (b.scale && b.scale !== 1) ctx.scale(b.scale, b.scale);
      ctx.translate(-localLipX, -localLipY);
    } else {
      ctx.translate(bottleCenterX, bottleCenterY);
      if (b.rotation) ctx.rotate(b.rotation);
      if (b.scale && b.scale !== 1) ctx.scale(b.scale, b.scale);
    }

    // 1. 瓶身外壁微光玻璃背板
    this.renderGlassBackdrop(ctx, outerRx, -halfH, w, h);

    // 2. 左右两侧壁真实厚度垂直折射光带 (体现实体玻璃厚度纵深)
    this.renderSideWallRefractionBars(ctx, outerRx, -halfH, w, h, innerBotY);

    // 3. 瓶底内壁椭圆台面 (立体纵深内底)
    this.renderInnerBaseFloor(ctx, innerRx, innerBotY);

    // 4. 构建内腔路径并裁切 (绘制充盈液体与内壁高光)
    ctx.save();
    this.createBottleInnerPath(ctx, innerRx, innerBotY, -halfH, w, h);
    ctx.clip();

    // 绘制 2.5D 液体圆柱体体积 (柱面+顶面椭圆+底部透视弧+注水微晃)
    this.renderLiquidLayers(ctx, b, innerRx, innerBotY, -halfH, w, h);

    // 瓶内高光柱与纵深折射
    this.renderInnerWallRefraction(ctx, innerRx, -halfH, w, h);
    ctx.restore();

    // 5. 3D 沉底厚玻璃高折射层与月牙焦散弧 (晶莹剔透水晶底)
    this.renderThickGlassBase(ctx, outerRx, innerRx, outerBotY, innerBotY);

    // 6. 外壁高光玻璃壳、溜肩反光弧与圆润瓶口
    this.renderGlassBodyAndNeck(ctx, outerRx, outerBotY, -halfH, w, h, isSelected, b.isGiantCat);

    // 7. 特殊机制 (🎬 广告场记板、色环契约、冰晶、锁扣、流沙炸弹等)
    this.renderSpecialMechanics(ctx, b, -halfW, -halfH, w, h);

    // 8. 宜家原木塞 (已封存满瓶)
    if (b.corked) {
      this.renderCork(ctx, -halfW, -halfH, w, h);
    }

    ctx.restore();
  }

  /**
   * 1. 100% 复刻原型的 3D 粗麻布编织软垫底座 (无论瓶子浮空与否，稳停在原桌面)
   */
  renderBurlapCoaster(ctx, b, halfW, halfH, liftDist = 0, outerBotY = 0) {
    const isDarkStar = b.corked || b.isGiantCat;
    const hasBeadedRing = (b.special && b.special !== SPECIAL_TYPES.NONE) || (b.mysteryCount && b.mysteryCount > 0);
    const coasterW = halfW * 2.3;
    const coasterTopY = outerBotY;

    ctx.save();

    // A. 原图标志性左下方暖赤陶色柔和地面投影 (rotate -5deg, terracottaShadowGrad)
    const effectiveLift = b.isFlying ? Math.max(liftDist, 45) : liftDist;
    const shadowAlpha = Math.max(0.06, (1 - effectiveLift / 140) * 0.32);
    ctx.save();
    ctx.translate(-2, coasterTopY + 10);
    ctx.rotate(-0.08); // 约 -5 度
    const shadowGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, coasterW * 0.52);
    shadowGrad.addColorStop(0.00, `rgba(142, 60, 8, ${shadowAlpha})`);
    shadowGrad.addColorStop(0.65, `rgba(110, 42, 6, ${shadowAlpha * 0.5})`);
    shadowGrad.addColorStop(1.00, 'rgba(110, 42, 6, 0.0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, coasterW * (0.46 + effectiveLift * 0.002), 7.0 + effectiveLift * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // B. 3D 软垫厚实侧面 (上亮金棕 -> 下柔和深棕)
    const sideGrad = ctx.createLinearGradient(0, coasterTopY - 2, 0, coasterTopY + 16);
    if (isDarkStar) {
      sideGrad.addColorStop(0.0, '#5a421b');
      sideGrad.addColorStop(1.0, '#2c1e09');
    } else {
      sideGrad.addColorStop(0.0, '#deb87a');
      sideGrad.addColorStop(0.4, '#ba8b45');
      sideGrad.addColorStop(1.0, '#6d451a');
    }
    ctx.fillStyle = sideGrad;
    ctx.beginPath();
    ctx.ellipse(0, coasterTopY + 4.8, coasterW * 0.44, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // C. 3D 软垫饱满拱起顶面 (微突起亮光台面，清爽通透暖金米白)
    const topGrad = ctx.createLinearGradient(0, coasterTopY - 6, 0, coasterTopY + 4);
    if (isDarkStar) {
      topGrad.addColorStop(0.0, '#8c6b32');
      topGrad.addColorStop(1.0, '#4e3b1c');
    } else {
      topGrad.addColorStop(0.0, '#faedd2');
      topGrad.addColorStop(0.5, '#e5c48b');
      topGrad.addColorStop(1.0, '#b88d4d');
    }
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(0, coasterTopY, coasterW * 0.43, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 顶缘极细亮金色高光线
    ctx.strokeStyle = isDarkStar ? 'rgba(255, 220, 160, 0.45)' : 'rgba(255, 252, 240, 0.88)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // D. 软垫表面接触暗影 (Contact AO): 瓶底在原位时紧实吸附，浮空起飞时彻底清除黑斑
    const contactAlpha = b.isFlying ? 0 : Math.max(0, (1 - liftDist / 20) * 0.45);
    if (contactAlpha > 0.01) {
      const aoGrad = ctx.createRadialGradient(0, coasterTopY + 0.5, 2, 0, coasterTopY + 0.5, halfW * 0.82);
      aoGrad.addColorStop(0.0, `rgba(45, 18, 4, ${contactAlpha})`);
      aoGrad.addColorStop(0.6, `rgba(45, 18, 4, ${contactAlpha * 0.4})`);
      aoGrad.addColorStop(1.0, 'rgba(45, 18, 4, 0.0)');
      ctx.fillStyle = aoGrad;
      ctx.beginPath();
      ctx.ellipse(0, coasterTopY + 0.5, halfW * 0.78, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // E. 软垫表面细腻饰纹：特殊瓶白色双圈珠点圆环，满瓶3D发光金星
    if (isDarkStar) {
      ctx.fillStyle = '#ffee44';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      this.drawStar(ctx, 0, coasterTopY, 5, 6.2, 2.7);
      ctx.fill();
      ctx.stroke();
    } else if (hasBeadedRing) {
      // 原图同款高定白色双圈珠点圆环
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.ellipse(0, coasterTopY, coasterW * 0.32, 4.4, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([1.5, 2.5]);
      ctx.beginPath();
      ctx.ellipse(0, coasterTopY, coasterW * 0.24, 3.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /**
   * 瓶身微光背景背板 (100% 对齐 demo.html glassBodyGrad)
   */
  renderGlassBackdrop(ctx, rx, topY, w, h) {
    const bodyTop = topY + h * 0.22;
    const bodyH = h * 0.72;

    const bgGrad = ctx.createLinearGradient(-rx, 0, rx, 0);
    bgGrad.addColorStop(0.00, 'rgba(255, 252, 242, 0.24)');
    bgGrad.addColorStop(0.22, 'rgba(255, 248, 232, 0.09)');
    bgGrad.addColorStop(0.58, 'rgba(255, 246, 225, 0.06)');
    bgGrad.addColorStop(0.84, 'rgba(255, 254, 248, 0.26)');
    bgGrad.addColorStop(1.00, 'rgba(255, 250, 235, 0.20)');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(-rx, bodyTop, rx * 2, bodyH);
  }

  /**
   * 2. 左右两侧壁真实厚度垂直折射光带 (贯穿瓶身，空瓶与满瓶皆具立体纵深)
   */
  renderSideWallRefractionBars(ctx, rx, topY, w, h, innerBotY) {
    const shoulderBot = topY + h * 0.26;
    const barH = innerBotY - shoulderBot;
    const barW = 2.4;

    // 左侧厚度折射带 (glassWallSideRefractL)
    const leftGrad = ctx.createLinearGradient(-rx, 0, -rx + barW, 0);
    leftGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.42)');
    leftGrad.addColorStop(0.6, 'rgba(175, 220, 255, 0.16)');
    leftGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(-rx, shoulderBot, barW, barH);

    // 右侧厚度折射带 (glassWallSideRefractR)
    const rightGrad = ctx.createLinearGradient(rx - barW, 0, rx, 0);
    rightGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    rightGrad.addColorStop(0.4, 'rgba(175, 220, 255, 0.18)');
    rightGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.48)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(rx - barW, shoulderBot, barW, barH);
  }

  /**
   * 3. 瓶底内壁椭圆台面 (立体纵深内底)
   */
  renderInnerBaseFloor(ctx, innerRx, innerBotY) {
    ctx.save();
    const floorGrad = ctx.createLinearGradient(-innerRx, 0, innerRx, 0);
    floorGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.55)');
    floorGrad.addColorStop(0.25, 'rgba(160, 212, 255, 0.28)');
    floorGrad.addColorStop(0.50, 'rgba(30, 42, 68, 0.35)');
    floorGrad.addColorStop(0.78, 'rgba(175, 224, 255, 0.42)');
    floorGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.62)');

    ctx.fillStyle = 'rgba(22, 32, 58, 0.16)';
    ctx.strokeStyle = floorGrad;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.ellipse(0, innerBotY, innerRx, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 构造内腔三次贝塞尔圆润溜肩与透视底弧 Path (裁切液体)
   */
  createBottleInnerPath(ctx, innerRx, innerBotY, topY, w, h) {
    const neckHalfW = innerRx * 0.38;
    const neckTop = topY + h * 0.05;
    const shoulderTop = topY + h * 0.12;
    const shoulderBot = topY + h * 0.25;

    ctx.beginPath();
    ctx.moveTo(-neckHalfW, neckTop);
    ctx.lineTo(neckHalfW, neckTop);
    ctx.lineTo(neckHalfW, shoulderTop);
    ctx.bezierCurveTo(neckHalfW * 1.05, shoulderTop + h * 0.03, innerRx, shoulderTop + h * 0.07, innerRx, shoulderBot);
    ctx.lineTo(innerRx, innerBotY);
    // 2.5D 透视底弧 (向下方拱出)
    ctx.ellipse(0, innerBotY, innerRx, 5.6, 0, 0, Math.PI, false);
    ctx.lineTo(-innerRx, shoulderBot);
    ctx.bezierCurveTo(-innerRx, shoulderTop + h * 0.07, -neckHalfW * 1.05, shoulderTop + h * 0.03, -neckHalfW, shoulderTop);
    ctx.closePath();
  }

  /**
   * 构造外壁圆润溜肩与透视底弧 Path (外边框与高光壳)
   */
  createBottleOuterPath(ctx, outerRx, outerBotY, topY, w, h) {
    const neckHalfW = outerRx * 0.38;
    const neckTop = topY + h * 0.05;
    const shoulderTop = topY + h * 0.12;
    const shoulderBot = topY + h * 0.25;

    ctx.beginPath();
    ctx.moveTo(-neckHalfW, neckTop);
    ctx.lineTo(neckHalfW, neckTop);
    ctx.lineTo(neckHalfW, shoulderTop);
    ctx.bezierCurveTo(neckHalfW * 1.05, shoulderTop + h * 0.03, outerRx, shoulderTop + h * 0.07, outerRx, shoulderBot);
    ctx.lineTo(outerRx, outerBotY);
    // 2.5D 外底透视底弧
    ctx.ellipse(0, outerBotY, outerRx, 6.8, 0, 0, Math.PI, false);
    ctx.lineTo(-outerRx, shoulderBot);
    ctx.bezierCurveTo(-outerRx, shoulderTop + h * 0.07, -neckHalfW * 1.05, shoulderTop + h * 0.03, -neckHalfW, shoulderTop);
    ctx.closePath();
  }

  /**
   * 4. 绘制 2.5D 药水层 (4区 PBR 体积圆柱体 + 拱起顶面椭圆亮唇 + 倾角重力水平面)
   */
  renderLiquidLayers(ctx, b, innerRx, innerBotY, topY, w, h) {
    const halfW = w / 2;
    const halfH = h / 2;
    const layers = b.layers;
    const maxCap = b.maxCap || 4;
    const fullTopY = topY + h * 0.24;
    const totalLiquidH = innerBotY - fullTopY;
    const layerH = totalLiquidH / maxCap;
    const ry = 5.6;

    // 动态倾角
    const rotRad = b.rotation || 0;
    const isTilting = Math.abs(rotRad) >= 0.05;

    // A. 未倾斜常规状态：立体圆柱体逐层堆叠
    if (!isTilting) {
      let sloshOffset = 0;
      if (b.sloshAmp > 0.001) {
        sloshOffset = Math.sin(b.sloshPhase + this.sloshTimer * 12) * b.sloshAmp * 5;
        b.sloshAmp = Math.max(0, b.sloshAmp - 0.02);
      }

      // 构建绘制层列表：若有正在注入的层，虚拟追加
      const drawLayers = [...layers];
      let topLayerDrainScale = 1.0;
      if (b.drainRatio !== undefined && drawLayers.length > 0) {
        topLayerDrainScale = Math.max(0.02, 1 - b.drainRatio);
      }

      let curBottom = innerBotY;

      for (let i = 0; i < drawLayers.length; i++) {
        const colorKey = drawLayers[i];
        const isMystery = (i < (b.mysteryCount || 0));
        const col = isMystery ? MYSTERY_COLOR : (COLORS[colorKey] || COLORS.red);
        const isTop = (i === drawLayers.length - 1 && b.fillRatio === undefined);
        const scale = isTop ? topLayerDrainScale : 1.0;
        const curTop = curBottom - layerH * scale;

        // 1. 4区 PBR 体积水平渐变 (highlight -> topMid -> mid -> right -> left)
        const grad = ctx.createLinearGradient(-innerRx, 0, innerRx, 0);
        grad.addColorStop(0.00, col.highlight);
        grad.addColorStop(0.18, col.topMid || col.mid);
        grad.addColorStop(0.52, col.mid);
        grad.addColorStop(0.84, col.right);
        grad.addColorStop(1.00, col.left);

        // 2. 2.5D 圆柱体侧壁与底部透视弧
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-innerRx, curTop);
        ctx.lineTo(innerRx, curTop);
        ctx.lineTo(innerRx, curBottom);
        // 底部弧向下凸
        ctx.ellipse(0, curBottom, innerRx, ry, 0, 0, Math.PI, false);
        ctx.lineTo(-innerRx, curTop);
        ctx.closePath();
        ctx.fill();

        // 3. 层与层之间的接缝微暗 meniscus 阴影弧
        if (i < drawLayers.length - 1 || b.fillRatio !== undefined) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(0, curTop, innerRx * 0.98, ry, 0, 0, Math.PI);
          ctx.stroke();
        }

        // 4. 最顶层液体饱满拱起透视椭圆 (topGrad) 与亮唇高光线
        if (isTop) {
          const topGrad = ctx.createLinearGradient(-innerRx * 0.4, curTop - ry, innerRx * 0.4, curTop + ry);
          topGrad.addColorStop(0.00, col.topLight);
          topGrad.addColorStop(0.38, col.topRim || col.highlight);
          topGrad.addColorStop(0.85, col.topMid || col.mid);
          topGrad.addColorStop(1.00, col.mid);

          ctx.fillStyle = topGrad;
          ctx.beginPath();
          ctx.ellipse(0, curTop + sloshOffset, innerRx, ry, 0, 0, Math.PI * 2);
          ctx.fill();

          // 顶面极细微光唇线
          ctx.strokeStyle = col.topLight;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.ellipse(0, curTop + sloshOffset, innerRx * 0.96, ry * 0.95, 0, 0, Math.PI);
          ctx.stroke();
        }

        // 盲盒问号
        if (isMystery) {
          ctx.fillStyle = '#fffef0';
          ctx.font = 'bold 20px "Fredoka", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 4;
          ctx.fillText('?', 0, curTop + (layerH * scale) / 2);
          ctx.shadowBlur = 0;
        }

        curBottom = curTop;
      }

      // 如果有目标瓶正在注入的动态层
      if (b.fillRatio !== undefined && b.fillRatio > 0.01 && b.fillingColor) {
        const col = COLORS[b.fillingColor] || COLORS.blue;
        const fillScale = Math.min(1.0, b.fillRatio);
        const fillTop = curBottom - layerH * fillScale;

        const grad = ctx.createLinearGradient(-innerRx, 0, innerRx, 0);
        grad.addColorStop(0.00, col.highlight);
        grad.addColorStop(0.18, col.topMid || col.mid);
        grad.addColorStop(0.52, col.mid);
        grad.addColorStop(0.84, col.right);
        grad.addColorStop(1.00, col.left);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-innerRx, fillTop);
        ctx.lineTo(innerRx, fillTop);
        ctx.lineTo(innerRx, curBottom);
        ctx.ellipse(0, curBottom, innerRx, ry, 0, 0, Math.PI, false);
        ctx.lineTo(-innerRx, fillTop);
        ctx.closePath();
        ctx.fill();

        // 顶层透视椭圆
        const topGrad = ctx.createLinearGradient(-innerRx * 0.4, fillTop - ry, innerRx * 0.4, fillTop + ry);
        topGrad.addColorStop(0.00, col.topLight);
        topGrad.addColorStop(0.50, col.topRim || col.highlight);
        topGrad.addColorStop(1.00, col.mid);

        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.ellipse(0, fillTop + sloshOffset, innerRx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = col.topLight;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(0, fillTop + sloshOffset, innerRx * 0.96, ry * 0.95, 0, 0, Math.PI);
        ctx.stroke();
      }

      return;
    }

    // B. 物理倾斜状态：真实重力水平面物理流体裁切 (Gravity-Aligned Physical Fluid)
    const layersCount = layers.length;
    if (layersCount === 0) return;

    const pourDir = b.pourDir || (rotRad >= 0 ? 1 : -1);
    const absRad = Math.abs(rotRad);
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    // 瓶身内腔在世界重力方向 (+Y 为下) 的最低点与瓶嘴出水口
    // 变换公式：xg = x*cosR + y*sinR, yg = -x*sinR + y*cosR
    const yBotG = innerBotY * cosR + innerRx * Math.abs(sinR);

    // 瓶嘴在瓶身局部坐标为 (pourDir * innerRx * 0.38, topY + h * 0.05)
    const lipRx = innerRx * 0.38;
    const lipLocalX = pourDir * lipRx;
    const lipLocalY = topY + h * 0.05;
    const yLipG = -lipLocalX * sinR + lipLocalY * cosR;

    // 出水最大重力深度
    const spillDepth = Math.max(16, yBotG - yLipG);

    // 计算当前剩余总液量比例 (考虑实时倒出 drainRatio)
    const curDrainRatio = (b.drainRatio !== undefined) ? b.drainRatio : 0;
    const totalRemaining = Math.max(0.01, layersCount - curDrainRatio);
    const volRatio = Math.max(0.01, totalRemaining / maxCap);

    // 根据倾斜角度平滑插值重力液面深度
    const tiltT = Math.min(1, absRad / (75 * Math.PI / 180));
    const uprightH = volRatio * totalLiquidH;
    const tiltH = spillDepth * Math.sqrt(volRatio);
    const curGravityH = (1 - tiltT) * (uprightH * cosR) + tiltT * tiltH;

    // 水面最高处 (如果正在倒水，水面自然流至瓶嘴)
    let yTopG = yBotG - curGravityH;
    if (b.drainRatio !== undefined) {
      yTopG = Math.max(yTopG, yLipG + curDrainRatio * (spillDepth * 0.22));
    }

    // 进入世界重力坐标系 (逆旋转瓶身倾角，Y 轴绝对垂直向下)
    ctx.save();
    ctx.rotate(-rotRad);

    // 从瓶底往上计算各层占有的重力厚度
    const effectiveGravityDepth = Math.max(4, yBotG - yTopG);
    let curLayerBotG = yBotG;

    for (let i = 0; i < layersCount; i++) {
      const colorKey = layers[i];
      const isMystery = (i < (b.mysteryCount || 0));
      const col = isMystery ? MYSTERY_COLOR : (COLORS[colorKey] || COLORS.red);
      const isTop = (i === layersCount - 1);
      const layerWeight = isTop ? Math.max(0.01, 1 - curDrainRatio) : 1.0;
      const layerGravityH = (layerWeight / totalRemaining) * effectiveGravityDepth;
      const layerTopG = curLayerBotG - layerGravityH;

      // 在重力空间水平填充矩形 (借助父级 createBottleInnerPath 的 clip 自动裁出自然倾斜液面)
      const grad = ctx.createLinearGradient(-w, 0, w, 0);
      grad.addColorStop(0.00, col.highlight);
      grad.addColorStop(0.20, col.topMid || col.mid);
      grad.addColorStop(0.55, col.mid);
      grad.addColorStop(0.82, col.right);
      grad.addColorStop(1.00, col.left);

      ctx.fillStyle = grad;
      ctx.fillRect(-w * 1.5, layerTopG, w * 3, curLayerBotG - layerTopG + 0.5);

      // 最顶层水面绘制纯白微光水平亮线与亮唇
      if (isTop) {
        ctx.strokeStyle = col.topLight;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-w * 1.5, layerTopG);
        ctx.lineTo(w * 1.5, layerTopG);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-w * 1.5, layerTopG + 0.6);
        ctx.lineTo(w * 1.5, layerTopG + 0.6);
        ctx.stroke();
      }

      curLayerBotG = layerTopG;
    }

    ctx.restore();
  }

  /**
   * 5. 瓶内壁通透高光柱与纵深折射
   */
  renderInnerWallRefraction(ctx, rx, topY, w, h) {
    const bodyTop = topY + h * 0.22;
    const bodyH = h * 0.70;

    // 左侧垂直高光柱 (leftWallSheen)
    const leftGrad = ctx.createLinearGradient(-rx, 0, -rx + 7, 0);
    leftGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.42)');
    leftGrad.addColorStop(0.6, 'rgba(255, 250, 235, 0.14)');
    leftGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(-rx + 1, bodyTop, 6, bodyH);

    // 右侧修长高光柱 (rightPillarSheen)
    const rightGrad = ctx.createLinearGradient(rx - 9, 0, rx, 0);
    rightGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    rightGrad.addColorStop(0.4, 'rgba(255, 252, 240, 0.24)');
    rightGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.42)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(rx - 8, bodyTop, 8, bodyH);
  }

  /**
   * 6. 3D 沉底厚玻璃高折射层与月牙焦散弧 (100% 对齐 demo.html baseCushionGrad)
   */
  renderThickGlassBase(ctx, outerRx, innerRx, outerBotY, innerBotY) {
    ctx.save();

    // 1. 沉底厚玻璃高折射层 (晶莹水晶冰蓝高折射，杜绝脏暗深圈)
    const baseGrad = ctx.createLinearGradient(-outerRx, innerBotY, outerRx, outerBotY + 4);
    baseGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.70)');
    baseGrad.addColorStop(0.18, 'rgba(215, 240, 255, 0.45)');
    baseGrad.addColorStop(0.38, 'rgba(180, 222, 255, 0.26)');
    baseGrad.addColorStop(0.58, 'rgba(165, 212, 252, 0.22)');
    baseGrad.addColorStop(0.80, 'rgba(210, 238, 255, 0.52)');
    baseGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.75)');

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    // 从内底向右下到左
    ctx.ellipse(0, innerBotY, innerRx, 5.6, 0, 0, Math.PI, false);
    ctx.lineTo(-outerRx, outerBotY);
    // 外底向右 (逆时针反转连接)
    ctx.ellipse(0, outerBotY, outerRx, 6.8, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();

    // 2. 厚底玻璃内部月牙形焦散反光弧 (glassBaseRimHighlight)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.ellipse(0, outerBotY - 0.5, outerRx * 0.94, 6.2, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(195, 232, 255, 0.65)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(0, innerBotY + 1.0, innerRx * 0.92, 4.8, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 7. 外壁高光玻璃壳、溜肩反光斑与圆润瓶口
   */
  renderGlassBodyAndNeck(ctx, outerRx, outerBotY, topY, w, h, isSelected, isGiantCat) {
    const neckHalfW = outerRx * 0.38;
    const neckTop = topY + h * 0.05;

    ctx.save();

    // A. 瓶身外轮廓微光描边 (naturalRimGrad)
    this.createBottleOuterPath(ctx, outerRx, outerBotY, topY, w, h);
    const rimGrad = ctx.createLinearGradient(0, topY, 0, outerBotY);
    rimGrad.addColorStop(0.00, isSelected ? '#ffdf6b' : 'rgba(255, 255, 255, 0.85)');
    rimGrad.addColorStop(0.25, isSelected ? '#fde047' : 'rgba(255, 248, 225, 0.65)');
    rimGrad.addColorStop(0.65, isSelected ? '#facc15' : 'rgba(255, 255, 255, 0.48)');
    rimGrad.addColorStop(1.00, isSelected ? '#eab308' : 'rgba(255, 250, 235, 0.40)');

    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = isSelected ? 2.6 : 1.7;
    ctx.stroke();

    // B. 溜肩左侧柔和光斑 (leftShoulderDomeGrad)
    const shoulderGlow = ctx.createRadialGradient(-w * 0.18, topY + h * 0.18, 2, -w * 0.18, topY + h * 0.18, 14);
    shoulderGlow.addColorStop(0.0, 'rgba(255, 255, 255, 0.52)');
    shoulderGlow.addColorStop(0.58, 'rgba(255, 250, 235, 0.18)');
    shoulderGlow.addColorStop(1.0, 'rgba(255, 250, 235, 0.0)');
    ctx.fillStyle = shoulderGlow;
    ctx.beginPath();
    ctx.ellipse(-w * 0.18, topY + h * 0.18, 12, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // C. 右肩纤细修长反光弧 (shoulder-sheen)
    ctx.strokeStyle = 'rgba(225, 242, 255, 0.72)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(w * 0.18, topY + h * 0.20, 11, -Math.PI * 0.45, Math.PI * 0.12);
    ctx.stroke();

    // D. 瓶口圆润唇圈 (neckLipGrad & neckTopRimGrad)
    const lipGrad = ctx.createLinearGradient(-neckHalfW, 0, neckHalfW, 0);
    lipGrad.addColorStop(0.00, 'rgba(255, 248, 230, 0.65)');
    lipGrad.addColorStop(0.30, '#ffffff');
    lipGrad.addColorStop(0.70, 'rgba(254, 243, 199, 0.75)');
    lipGrad.addColorStop(1.00, '#ffffff');

    ctx.fillStyle = lipGrad;
    ctx.beginPath();
    ctx.ellipse(0, neckTop, neckHalfW + 2.0, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // E. 瓶口内凹孔径 (深邃孔径深度感 mouthBoreGrad)
    const mouthGrad = ctx.createLinearGradient(0, neckTop - 2, 0, neckTop + 3);
    mouthGrad.addColorStop(0.0, 'rgba(180, 140, 85, 0.28)');
    mouthGrad.addColorStop(0.6, 'rgba(255, 248, 230, 0.36)');
    mouthGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.65)');
    ctx.fillStyle = mouthGrad;
    ctx.beginPath();
    ctx.ellipse(0, neckTop + 0.3, neckHalfW * 0.65, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 8. 绘制 15 大特殊机制与徽章 (含 🎬 ad_cam 3D 电影场记板与星璇法阵)
   */
  renderSpecialMechanics(ctx, b, x, y, w, h) {
    const rx = w * 0.44;
    const neckTop = y + h * 0.05;
    const midY = y + h * 0.56;
    const bottomY = y + h * 0.94;

    // 1. 🎬 星璇场记板瓶 (ad_cam): 瓶底双层发光虚线星璇法阵 + 瓶身 3D 电影场记板
    if (b.special === SPECIAL_TYPES.AD_CAM || b.special === 'ad_cam_blue') {
      ctx.save();

      // A. 瓶底紫色星璇光晕与双层发光法阵
      const vortexGrad = ctx.createRadialGradient(0, bottomY + 2, 3, 0, bottomY + 2, rx * 1.1);
      vortexGrad.addColorStop(0.0, 'rgba(168, 85, 247, 0.48)');
      vortexGrad.addColorStop(0.6, 'rgba(126, 34, 206, 0.22)');
      vortexGrad.addColorStop(1.0, 'rgba(88, 28, 135, 0.0)');
      ctx.fillStyle = vortexGrad;
      ctx.beginPath();
      ctx.ellipse(0, bottomY + 2, rx * 1.05, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 双层发光虚线法阵
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.ellipse(0, bottomY + 2, rx * 0.92, 4.4, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 2.5]);
      ctx.beginPath();
      ctx.ellipse(0, bottomY + 2, rx * 0.68, 3.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // B. 瓶身正中斜插 12 度的 3D 电影场记板 (100% 对齐 demo.html)
      ctx.save();
      ctx.translate(0, midY);
      ctx.rotate(-0.21); // 约 -12 度

      // 场记板阴影
      ctx.shadowColor = 'rgba(59, 7, 100, 0.45)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // 场记板主体紫色背板
      const boardW = 34;
      const boardH = 26;
      const boardX = -boardW / 2;
      const boardY = -boardH / 2;

      ctx.fillStyle = '#581c87';
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(boardX, boardY, boardW, boardH, 5);
      ctx.fill();
      ctx.stroke();

      // 顶部打板夹 (黑色底带白斜条纹)
      const clapH = 8;
      ctx.fillStyle = '#3b0764';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.roundRect(boardX, boardY - 6, boardW, clapH, 2.5);
      ctx.fill();
      ctx.stroke();

      // 白斜条纹 (3 条)
      ctx.fillStyle = '#ffffff';
      const stripeOffsets = [-10, -1, 8];
      stripeOffsets.forEach(sx => {
        ctx.beginPath();
        ctx.moveTo(sx, boardY - 6);
        ctx.lineTo(sx + 5, boardY - 6);
        ctx.lineTo(sx + 2, boardY + 2);
        ctx.lineTo(sx - 3, boardY + 2);
        ctx.closePath();
        ctx.fill();
      });

      // 场记板正中亮绿播放三角形 ▶
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#a3e635';
      ctx.strokeStyle = '#365314';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-3, -1);
      ctx.lineTo(-3, 11);
      ctx.lineTo(7, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    }

    // 2. 专属色环契约瓶 (color_lock)
    if (b.special === SPECIAL_TYPES.COLOR_LOCK && b.requiredColor) {
      const colObj = COLORS[b.requiredColor] || COLORS.blue;
      ctx.save();
      ctx.fillStyle = colObj.mid;
      ctx.strokeStyle = colObj.topLight;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, neckTop, w * 0.17 + 3, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = colObj.highlight;
      ctx.beginPath();
      ctx.arc(0, neckTop + 14, 5.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // 3. 单向接水漏斗瓶 (one_way_in)
    if (b.special === SPECIAL_TYPES.ONE_WAY_IN) {
      ctx.save();
      const funnelW = w * 0.38;
      ctx.fillStyle = 'rgba(245, 180, 40, 0.90)';
      ctx.strokeStyle = '#fff4a0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-funnelW / 2, neckTop - 3);
      ctx.lineTo(funnelW / 2, neckTop - 3);
      ctx.lineTo(funnelW * 0.25, neckTop + 9);
      ctx.lineTo(-funnelW * 0.25, neckTop + 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▼', 0, neckTop + 7);
      ctx.restore();
    }

    // 4. 单向出水古瓶 (one_way_out)
    if (b.special === SPECIAL_TYPES.ONE_WAY_OUT) {
      ctx.save();
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲', 0, neckTop + 15);
      ctx.restore();
    }

    // 5. 冰晶凝霜瓶 (ice_base)
    if (b.special === SPECIAL_TYPES.ICE_BASE && b.poursToBreak > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(186, 230, 253, 0.68)';
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.5;
      const iceTop = y + h * 0.52;
      const iceH = h * 0.42;
      ctx.beginPath();
      ctx.rect(-rx, iceTop, rx * 2, iceH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 13px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`❄️ ${b.poursToBreak}`, 0, iceTop + iceH / 2);
      ctx.restore();
    }

    // 6. 鎏金锁扣瓶 (stone_base)
    if (b.special === SPECIAL_TYPES.STONE_BASE && b.poursToBreak > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(217, 119, 6, 0.90)';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-w * 0.32, midY - 9, w * 0.64, 18, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🔒 ${b.poursToBreak}`, 0, midY + 4);
      ctx.restore();
    }

    // 7. 丝绒磨砂封印 (silk_drape)
    if (b.special === SPECIAL_TYPES.SILK_DRAPE && b.unlockOrder > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(99, 102, 241, 0.82)';
      ctx.strokeStyle = '#c7d2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(-rx, y + h * 0.22, rx * 2, h * 0.72);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🧣 满${b.unlockOrder}开`, 0, midY);
      ctx.restore();
    }

    // 8. 星砂流沙炸弹倒计时
    if (typeof b.countdownMoves === 'number' && b.countdownMoves > 0) {
      ctx.save();
      const isUrgent = b.countdownMoves <= 2;
      ctx.fillStyle = isUrgent ? '#ef4444' : '#eab308';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, y + h * 0.38, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⏳${b.countdownMoves}`, 0, y + h * 0.38);
      ctx.restore();
    }

    // 9. 寒冰封口惩罚 (frozenTurns)
    if (b.frozenTurns > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.94)';
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-w * 0.28, neckTop - 7, w * 0.56, 16, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🧊${b.frozenTurns}`, 0, neckTop);
      ctx.restore();
    }

    // 10. 灵猫 Boss 瓶耳朵与铃铛
    if (b.isGiantCat) {
      this.renderGiantCatDetails(ctx, -w / 2, -h / 2, w, h);
    }
  }

  /**
   * 9. 宜家原木塞 (已封存满瓶)
   */
  renderCork(ctx, x, y, w, h) {
    const neckTop = y + h * 0.05;
    const corkW = w * 0.34;
    const corkH = 15;

    ctx.save();
    const corkGrad = ctx.createLinearGradient(-corkW / 2, 0, corkW / 2, 0);
    corkGrad.addColorStop(0.00, '#b45309');
    corkGrad.addColorStop(0.35, '#fde047');
    corkGrad.addColorStop(0.65, '#f59e0b');
    corkGrad.addColorStop(1.00, '#92400e');

    ctx.fillStyle = corkGrad;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.roundRect(-corkW / 2, neckTop - corkH * 0.75, corkW, corkH, [4, 4, 2, 2]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 200, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, neckTop - corkH * 0.7, corkW * 0.4, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderGiantCatDetails(ctx, x, y, w, h) {
    ctx.save();
    const neckTop = y + h * 0.05;
    ctx.fillStyle = '#ffb8dc';
    ctx.strokeStyle = '#b8256e';
    ctx.lineWidth = 1.2;
    // 左耳
    ctx.beginPath();
    ctx.moveTo(-w * 0.32, neckTop);
    ctx.lineTo(-w * 0.44, neckTop - 16);
    ctx.lineTo(-w * 0.22, neckTop - 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 右耳
    ctx.beginPath();
    ctx.moveTo(w * 0.32, neckTop);
    ctx.lineTo(w * 0.44, neckTop - 16);
    ctx.lineTo(w * 0.22, neckTop - 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 铃铛
    const collarY = y + h * 0.38;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.roundRect(-w * 0.36, collarY, w * 0.72, 7, 3.5);
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, collarY + 5.5, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }
}
