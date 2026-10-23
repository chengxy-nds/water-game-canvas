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
    const geometry = this.getBottleGeometry(b, w, h);
    const { outerRx, innerRx, outerBotY, innerBotY } = geometry;

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
      const localLipX = (b.pourDir || 1) * Math.abs(geometry.mapX(62));
      const localLipY = geometry.mapY(9.2 + geometry.neckOffset);
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
    this.renderGlassBackdrop(ctx, geometry);

    // 2. 左右两侧壁真实厚度垂直折射光带 (体现实体玻璃厚度纵深)
    this.renderSideWallRefractionBars(ctx, geometry);

    // 3. 瓶底内壁椭圆台面 (立体纵深内底)
    this.renderInnerBaseFloor(ctx, geometry);

    // 4. 构建内腔路径并裁切 (绘制充盈液体与内壁高光)
    ctx.save();
    this.createBottleInnerPath(ctx, geometry);
    ctx.clip();

    // 绘制 2.5D 液体圆柱体体积 (柱面+顶面椭圆+底部透视弧+注水微晃)
    this.renderLiquidLayers(ctx, b, geometry);

    // 瓶内高光柱与纵深折射
    this.renderInnerWallRefraction(ctx, geometry);
    ctx.restore();

    // 5. 3D 沉底厚玻璃高折射层与月牙焦散弧 (晶莹剔透水晶底)
    this.renderThickGlassBase(ctx, geometry);

    // 6. 外壁高光玻璃壳、溜肩反光弧与圆润瓶口
    this.renderGlassBodyAndNeck(ctx, geometry, isSelected, b.isGiantCat);

    // 7. 特殊机制 (🎬 广告场记板、色环契约、冰晶、锁扣、流沙炸弹等)
    this.renderSpecialMechanics(ctx, b, -halfW, -halfH, w, h);

    // 8. 宜家原木塞 (已封存满瓶)
    if (b.corked) {
      this.renderCork(ctx, -halfW, -halfH, w, h);
    }

    ctx.restore();
  }

  /** Map the prototype SVG's 67×204 bottle geometry into the bottle's Canvas box. */
  getBottleGeometry(b, w, h) {
    const maxCap = b.maxCap || 4;
    const isTall = maxCap === 8 && !b.isGiantCat;
    const vbW = isTall ? 70 : 67;
    const vbH = isTall ? 298 : 204;
    const centerY = isTall ? 152 : 105;
    const sx = w / vbW;
    const sy = h / vbH;
    const bottomY = isTall ? 288 : 193;
    const neckOffset = Number.isFinite(b.neckOffsetY)
      ? b.neckOffsetY
      : (maxCap === 2 ? 80 : 0);
    const mapX = (x) => (x - 50) * sx;
    const mapY = (y) => (y - centerY) * sy;

    return {
      w, h, sx, sy, mapX, mapY, centerY, bottomY, neckOffset,
      maxCap,
      layerH: maxCap === 8 ? 29.8 : maxCap === 6 ? 24.2 : maxCap === 2 ? 33.5 : 36.2,
      layerRy: maxCap === 8 ? 7.6 : 7.8,
      outerRx: 32.2 * sx,
      innerRx: 30.2 * sx,
      outerBotY: mapY(bottomY + 2.4),
      innerBotY: mapY(bottomY - 1.8),
      shoulderTopY: mapY(26 + neckOffset),
      shoulderBottomY: mapY(55 + neckOffset),
      bodyTopY: mapY(46.5 + neckOffset)
    };
  }

  /**
   * 1. 100% 复刻原型的 3D 粗麻布编织软垫底座 (无论瓶子浮空与否，稳停在原桌面)
   */
  renderBurlapCoaster(ctx, b, halfW, halfH, liftDist = 0, outerBotY = 0) {
    const isDarkStar = b.corked || b.isGiantCat;
    const hasBeadedRing = (b.special && b.special !== SPECIAL_TYPES.NONE) || (b.mysteryCount && b.mysteryCount > 0);
    const coasterW = halfW * 2.4;
    const scale = coasterW / 100;
    const coasterTopY = outerBotY;

    ctx.save();
    const effectiveLift = b.isFlying ? Math.max(liftDist, 45) : liftDist;
    const shadowAlpha = Math.max(0.06, (1 - effectiveLift / 140) * 0.32);
    ctx.save();
    ctx.translate(-2, coasterTopY - 7.5 * scale + effectiveLift * 0.03);
    ctx.scale(scale, scale);
    ctx.rotate(-0.08);
    const shadowGrad = ctx.createRadialGradient(42, 34, 3, 42, 34, 48 + effectiveLift * 0.2);
    shadowGrad.addColorStop(0, `rgba(142, 60, 8, ${shadowAlpha})`);
    shadowGrad.addColorStop(0.62, `rgba(110, 42, 6, ${shadowAlpha * 0.45})`);
    shadowGrad.addColorStop(1, 'rgba(110, 42, 6, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(42, 34, 45 + effectiveLift * 0.15, 11.5 + effectiveLift * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Match the prototype's pillow-shaped pad silhouette and its stitched woven surface.
    ctx.translate(0, coasterTopY - 7.5 * scale);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';

    const sidePath = () => {
      ctx.beginPath();
      ctx.moveTo(11, 19.5);
      ctx.bezierCurveTo(11, 13, 25, 10, 50, 10);
      ctx.bezierCurveTo(75, 10, 89, 13, 89, 19.5);
      ctx.lineTo(87.5, 27.5);
      ctx.bezierCurveTo(86, 35.5, 72, 39.5, 50, 39.5);
      ctx.bezierCurveTo(28, 39.5, 14, 35.5, 12.5, 27.5);
      ctx.closePath();
    };
    const topPath = () => {
      ctx.beginPath();
      ctx.moveTo(50, 7.5);
      ctx.bezierCurveTo(76, 7.5, 89, 11.5, 89, 19.2);
      ctx.bezierCurveTo(89, 26.8, 76, 31.2, 50, 31.2);
      ctx.bezierCurveTo(24, 31.2, 11, 26.8, 11, 19.2);
      ctx.bezierCurveTo(11, 11.5, 24, 7.5, 50, 7.5);
      ctx.closePath();
    };

    const sideGrad = ctx.createLinearGradient(0, 10, 0, 40);
    if (isDarkStar) {
      sideGrad.addColorStop(0, '#786032');
      sideGrad.addColorStop(0.48, '#503b1d');
      sideGrad.addColorStop(1, '#2c1e09');
    } else {
      sideGrad.addColorStop(0, '#d5b77b');
      sideGrad.addColorStop(0.4, '#a17b45');
      sideGrad.addColorStop(1, '#60451f');
    }
    ctx.fillStyle = sideGrad;
    sidePath();
    ctx.fill();

    // Crossed fibers add the soft burlap grain visible in the SVG prototype.
    ctx.save();
    sidePath();
    ctx.clip();
    ctx.lineWidth = 0.55;
    for (let y = 13; y < 40; y += 3.6) {
      ctx.strokeStyle = (Math.round(y * 10) % 2)
        ? 'rgba(255, 232, 184, 0.16)' : 'rgba(48, 31, 12, 0.14)';
      ctx.beginPath();
      ctx.moveTo(7, y);
      ctx.lineTo(93, y + 0.8);
      ctx.stroke();
    }
    for (let x = 14; x < 90; x += 4.2) {
      ctx.strokeStyle = (Math.round(x * 10) % 2)
        ? 'rgba(255, 236, 194, 0.12)' : 'rgba(42, 28, 12, 0.12)';
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x - 1.2, 42);
      ctx.stroke();
    }
    ctx.restore();

    const topGrad = ctx.createLinearGradient(0, 7.5, 0, 31.2);
    if (isDarkStar) {
      topGrad.addColorStop(0, '#a17e3b');
      topGrad.addColorStop(1, '#4e3b1c');
    } else {
      topGrad.addColorStop(0, '#ead8ae');
      topGrad.addColorStop(0.48, '#c4ad82');
      topGrad.addColorStop(1, '#927448');
    }
    ctx.fillStyle = topGrad;
    topPath();
    ctx.fill();

    ctx.save();
    topPath();
    ctx.clip();
    ctx.lineWidth = 0.62;
    for (let y = 9; y < 31; y += 3.4) {
      ctx.strokeStyle = (Math.round(y * 10) % 2)
        ? 'rgba(255, 252, 230, 0.32)' : 'rgba(86, 64, 32, 0.16)';
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(92, y + 0.5);
      ctx.stroke();
    }
    for (let x = 13; x < 90; x += 4.0) {
      ctx.strokeStyle = (Math.round(x * 10) % 2)
        ? 'rgba(255, 255, 239, 0.26)' : 'rgba(91, 69, 36, 0.14)';
      ctx.beginPath();
      ctx.moveTo(x, 6);
      ctx.lineTo(x - 0.8, 33);
      ctx.stroke();
    }
    ctx.restore();

    topPath();
    ctx.strokeStyle = isDarkStar ? 'rgba(255, 220, 160, 0.45)' : 'rgba(255, 243, 214, 0.68)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    const contactAlpha = b.isFlying ? 0 : Math.max(0, (1 - liftDist / 20) * 0.45);
    if (contactAlpha > 0.01) {
      const aoGrad = ctx.createRadialGradient(50, 18.5, 2, 50, 18.5, 30);
      aoGrad.addColorStop(0.0, `rgba(45, 18, 4, ${contactAlpha})`);
      aoGrad.addColorStop(0.6, `rgba(45, 18, 4, ${contactAlpha * 0.4})`);
      aoGrad.addColorStop(1.0, 'rgba(45, 18, 4, 0.0)');
      ctx.fillStyle = aoGrad;
      ctx.beginPath();
      ctx.ellipse(50, 18.5, 28, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isDarkStar) {
      ctx.fillStyle = '#ffee44';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      this.drawStar(ctx, 50, 20, 7.2, 14.5, 4.4);
      ctx.fill();
      ctx.stroke();
    } else if (hasBeadedRing) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 1.9;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.ellipse(50, 19.5, 22, 6.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([1.5, 2.5]);
      ctx.beginPath();
      ctx.ellipse(50, 19.5, 17, 4.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /**
   * 瓶身微光背景背板 (100% 对齐 demo.html glassBodyGrad)
   */
  renderGlassBackdrop(ctx, geometry) {
    const { outerRx, outerBotY, w, h } = geometry;
    const bgGrad = ctx.createLinearGradient(-outerRx, 0, outerRx, 0);
    bgGrad.addColorStop(0.00, 'rgba(255, 252, 242, 0.24)');
    bgGrad.addColorStop(0.22, 'rgba(255, 248, 232, 0.09)');
    bgGrad.addColorStop(0.58, 'rgba(255, 246, 225, 0.06)');
    bgGrad.addColorStop(0.84, 'rgba(255, 254, 248, 0.26)');
    bgGrad.addColorStop(1.00, 'rgba(255, 250, 235, 0.20)');

    ctx.save();
    this.createBottleOuterPath(ctx, geometry);
    ctx.clip();
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-outerRx, -h / 2, outerRx * 2, h);
    ctx.restore();
  }

  /**
   * 2. 左右两侧壁真实厚度垂直折射光带 (贯穿瓶身，空瓶与满瓶皆具立体纵深)
   */
  renderSideWallRefractionBars(ctx, geometry) {
    const { mapX, mapY, sx, sy, innerBotY } = geometry;
    const shoulderBot = mapY(55 + geometry.neckOffset);
    const barH = innerBotY - shoulderBot;
    const barW = 2.4 * sx;

    ctx.save();
    this.createBottleOuterPath(ctx, geometry);
    ctx.clip();

    const leftX = mapX(17.8);
    const rightX = mapX(79.8);
    const leftGrad = ctx.createLinearGradient(leftX, 0, leftX + barW, 0);
    leftGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.42)');
    leftGrad.addColorStop(0.6, 'rgba(175, 220, 255, 0.16)');
    leftGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(leftX, shoulderBot, barW, barH);

    const rightGrad = ctx.createLinearGradient(rightX, 0, rightX + barW, 0);
    rightGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    rightGrad.addColorStop(0.4, 'rgba(175, 220, 255, 0.18)');
    rightGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.48)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(rightX, shoulderBot, barW, barH);
    ctx.restore();
  }

  /**
   * 3. 瓶底内壁椭圆台面 (立体纵深内底)
   */
  renderInnerBaseFloor(ctx, geometry) {
    const { innerRx, innerBotY, sx, sy } = geometry;
    ctx.save();
    const floorGrad = ctx.createLinearGradient(-innerRx, 0, innerRx, 0);
    floorGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.55)');
    floorGrad.addColorStop(0.25, 'rgba(160, 212, 255, 0.28)');
    floorGrad.addColorStop(0.50, 'rgba(30, 42, 68, 0.35)');
    floorGrad.addColorStop(0.78, 'rgba(175, 224, 255, 0.42)');
    floorGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.62)');

    ctx.fillStyle = 'rgba(22, 32, 58, 0.16)';
    ctx.strokeStyle = floorGrad;
    ctx.lineWidth = 1.15 * Math.min(sx, sy);
    ctx.beginPath();
    ctx.ellipse(0, innerBotY, innerRx, 6.6 * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 构造内腔三次贝塞尔圆润溜肩与透视底弧 Path (裁切液体)
   */
  createBottleInnerPath(ctx, geometry) {
    const { mapX: x, mapY: y, innerRx, innerBotY, neckOffset } = geometry;
    const lipTop = 9.2 + neckOffset;
    const shoulderTop = 26 + neckOffset;
    const shoulderBot = 55 + neckOffset;
    ctx.beginPath();
    ctx.moveTo(x(37.2), y(lipTop));
    ctx.lineTo(x(62.8), y(lipTop));
    ctx.lineTo(x(62.8), y(shoulderTop));
    ctx.bezierCurveTo(x(74.8), y(shoulderTop + 4.2), x(80.2), y(shoulderTop + 13), x(80.2), y(shoulderBot));
    ctx.lineTo(innerRx, innerBotY);
    ctx.ellipse(0, innerBotY, innerRx, 7.5 * geometry.sy, 0, 0, Math.PI, false);
    ctx.lineTo(x(19.8), y(shoulderBot));
    ctx.bezierCurveTo(x(19.8), y(shoulderTop + 13), x(25.2), y(shoulderTop + 4.2), x(37.2), y(shoulderTop));
    ctx.closePath();
  }

  /**
   * 构造外壁圆润溜肩与透视底弧 Path (外边框与高光壳)
   */
  createBottleOuterPath(ctx, geometry) {
    const { mapX: x, mapY: y, outerBotY, neckOffset } = geometry;
    const neckStemTop = 20 + neckOffset;
    const shoulderTop = 26 + neckOffset;
    const shoulderBot = 55 + neckOffset;
    ctx.beginPath();
    ctx.moveTo(x(36.4), y(neckStemTop));
    ctx.lineTo(x(63.6), y(neckStemTop));
    ctx.lineTo(x(63.6), y(shoulderTop));
    ctx.bezierCurveTo(x(76.4), y(shoulderTop + 3.8), x(82.2), y(shoulderTop + 12.5), x(82.2), y(shoulderBot));
    ctx.lineTo(x(82.2), outerBotY);
    ctx.ellipse(0, outerBotY, 32.2 * geometry.sx, 8.8 * geometry.sy, 0, 0, Math.PI, false);
    ctx.lineTo(x(17.8), y(shoulderBot));
    ctx.bezierCurveTo(x(17.8), y(shoulderTop + 12.5), x(23.6), y(shoulderTop + 3.8), x(36.4), y(shoulderTop));
    ctx.closePath();
  }

  /**
   * 4. 绘制 2.5D 药水层 (4区 PBR 体积圆柱体 + 拱起顶面椭圆亮唇 + 倾角重力水平面)
   */
  renderLiquidLayers(ctx, b, geometry) {
    const { innerRx, innerBotY, w, h, sy, mapY, bottomY, layerH: sourceLayerH, layerRy, neckOffset } = geometry;
    const layers = b.layers;
    const maxCap = b.maxCap || 4;
    const liquidBottomY = mapY(bottomY);
    const fullTopY = mapY(bottomY - maxCap * sourceLayerH);
    const totalLiquidH = liquidBottomY - fullTopY;
    const layerH = sourceLayerH * sy;
    const ry = layerRy * sy;

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

      let curBottom = liquidBottomY;

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
    const yBotG = liquidBottomY * cosR + innerRx * Math.abs(sinR);

    // 瓶嘴在瓶身局部坐标为 (pourDir * innerRx * 0.38, topY + h * 0.05)
    const lipLocalX = pourDir * Math.abs(geometry.mapX(62));
    const lipLocalY = mapY(9.2 + neckOffset);
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
  renderInnerWallRefraction(ctx, geometry) {
    const { mapX: x, mapY: y, sx, sy, innerBotY, neckOffset } = geometry;
    const pillarTop = y(46.5 + neckOffset);
    const pillarH = innerBotY - pillarTop;

    const dome = ctx.createRadialGradient(x(34), y(37.5 + neckOffset), 1, x(34), y(37.5 + neckOffset), 13.5 * sx);
    dome.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
    dome.addColorStop(0.58, 'rgba(255, 250, 235, 0.14)');
    dome.addColorStop(1, 'rgba(255, 250, 235, 0)');
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.ellipse(x(34), y(37.5 + neckOffset), 13.5 * sx, 9.2 * sy, 0, 0, Math.PI * 2);
    ctx.fill();

    const leftGrad = ctx.createLinearGradient(0, pillarTop, 0, pillarTop + pillarH);
    leftGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    leftGrad.addColorStop(0.65, 'rgba(255, 250, 235, 0.10)');
    leftGrad.addColorStop(1, 'rgba(255, 250, 235, 0)');
    ctx.fillStyle = leftGrad;
    ctx.beginPath();
    ctx.roundRect(x(21), pillarTop, 5.5 * sx, pillarH, 2.7 * sx);
    ctx.fill();

    const shoulderGrad = ctx.createLinearGradient(x(53.8), y(28.2 + neckOffset), x(74.5), y(43.2 + neckOffset));
    shoulderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.52)');
    shoulderGrad.addColorStop(0.5, 'rgba(255, 253, 245, 0.62)');
    shoulderGrad.addColorStop(0.9, 'rgba(255, 248, 225, 0.30)');
    shoulderGrad.addColorStop(1, 'rgba(255, 248, 225, 0.05)');
    ctx.fillStyle = shoulderGrad;
    ctx.beginPath();
    ctx.moveTo(x(53.8), y(28.2 + neckOffset));
    ctx.bezierCurveTo(x(64.8), y(30.2 + neckOffset), x(72), y(35.5 + neckOffset), x(74.5), y(42.8 + neckOffset));
    ctx.lineTo(x(62.5), y(43.2 + neckOffset));
    ctx.bezierCurveTo(x(60.6), y(36.5 + neckOffset), x(56.8), y(31.5 + neckOffset), x(51.2), y(29.8 + neckOffset));
    ctx.closePath();
    ctx.fill();

    const rightGrad = ctx.createLinearGradient(0, pillarTop, 0, pillarTop + pillarH);
    rightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.38)');
    rightGrad.addColorStop(0.45, 'rgba(255, 252, 240, 0.22)');
    rightGrad.addColorStop(0.85, 'rgba(255, 248, 225, 0.08)');
    rightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.roundRect(x(63), pillarTop, 11.4 * sx, pillarH, 2.4 * sx);
    ctx.fill();

    ctx.strokeStyle = 'rgba(225, 242, 255, 0.65)';
    ctx.lineWidth = 1.5 * Math.min(sx, sy);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x(65.2), y(29.8 + neckOffset));
    ctx.bezierCurveTo(x(74.2), y(34.2 + neckOffset), x(78), y(40.2 + neckOffset), x(78.6), y(47.5 + neckOffset));
    ctx.stroke();
  }

  /**
   * 6. 3D 沉底厚玻璃高折射层与月牙焦散弧 (100% 对齐 demo.html baseCushionGrad)
   */
  renderThickGlassBase(ctx, geometry) {
    ctx.save();
    const { mapX: x, mapY: y, sx, sy, outerBotY, innerBotY } = geometry;

    const outerRx = 32.2 * sx;
    const innerRx = 30.2 * sx;
    const baseGrad = ctx.createLinearGradient(-outerRx, 0, outerRx, 0);
    baseGrad.addColorStop(0.00, 'rgba(255, 252, 240, 0.62)');
    baseGrad.addColorStop(0.14, 'rgba(165, 215, 255, 0.34)');
    baseGrad.addColorStop(0.32, 'rgba(28, 36, 58, 0.44)');
    baseGrad.addColorStop(0.52, 'rgba(18, 26, 48, 0.52)');
    baseGrad.addColorStop(0.72, 'rgba(42, 56, 88, 0.38)');
    baseGrad.addColorStop(0.88, 'rgba(195, 232, 255, 0.58)');
    baseGrad.addColorStop(1.00, 'rgba(255, 252, 240, 0.68)');

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.moveTo(x(19.6), innerBotY);
    ctx.ellipse(0, innerBotY, 30.4 * sx, 7.5 * sy, 0, Math.PI, Math.PI * 2, false);
    ctx.lineTo(x(82.2), outerBotY);
    ctx.ellipse(0, outerBotY, 32.2 * sx, 8.8 * sy, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();

    const rim = ctx.createLinearGradient(-outerRx, 0, outerRx, 0);
    rim.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    rim.addColorStop(0.18, 'rgba(255, 255, 255, 0.78)');
    rim.addColorStop(0.5, 'rgba(190, 230, 255, 0.42)');
    rim.addColorStop(0.82, 'rgba(255, 255, 255, 0.88)');
    rim.addColorStop(1, 'rgba(255, 255, 255, 0.20)');
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.55 * Math.min(sx, sy);
    ctx.beginPath();
    ctx.ellipse(0, y(geometry.bottomY + 2.1), 31.6 * sx, 8.6 * sy, 0, Math.PI, 0, true);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.lineWidth = 0.95 * Math.min(sx, sy);
    ctx.beginPath();
    ctx.ellipse(0, y(geometry.bottomY + 4.8), 25 * sx, 5.2 * sy, 0, Math.PI, 0, true);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 7. 外壁高光玻璃壳、溜肩反光斑与圆润瓶口
   */
  renderGlassBodyAndNeck(ctx, geometry, isSelected, isGiantCat) {
    const { mapX: x, mapY: y, sx, sy, neckOffset } = geometry;
    const neckY = (value) => y(value + neckOffset);
    const scale = Math.min(sx, sy);
    ctx.save();

    this.createBottleOuterPath(ctx, geometry);
    const rimGrad = ctx.createLinearGradient(0, y(9.2 + neckOffset), 0, y(geometry.bottomY + 2.4));
    rimGrad.addColorStop(0.00, isSelected ? '#ffdf6b' : 'rgba(255, 255, 255, 0.85)');
    rimGrad.addColorStop(0.25, isSelected ? '#fde047' : 'rgba(255, 248, 225, 0.65)');
    rimGrad.addColorStop(0.65, isSelected ? '#facc15' : 'rgba(255, 255, 255, 0.48)');
    rimGrad.addColorStop(1.00, isSelected ? '#eab308' : 'rgba(255, 250, 235, 0.40)');

    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = (isSelected ? 2.6 : 1.7) * scale;
    ctx.stroke();

    // Tight glass neck and rounded double rim, matching the prototype SVG paths.
    ctx.fillStyle = 'rgba(27, 67, 138, 0.32)';
    ctx.beginPath();
    ctx.moveTo(x(36), neckY(20.2));
    ctx.quadraticCurveTo(x(37.2), neckY(23.2), x(36.4), neckY(26.2));
    ctx.ellipse(0, neckY(26.2), 13.8 * sx, 2.7 * sy, 0, Math.PI, 0, true);
    ctx.quadraticCurveTo(x(62.8), neckY(23.2), x(64), neckY(20.2));
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(120, 175, 255, 0.24)';
    ctx.beginPath();
    ctx.ellipse(0, neckY(24.5), 10.4 * sx, 1.6 * sy, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = geometry.maxCap === 8 ? '#fde047' : '#4a80db';
    ctx.globalAlpha = 0.88;
    ctx.lineWidth = (geometry.maxCap === 8 ? 1.5 : 1.15) * scale;
    ctx.beginPath();
    ctx.ellipse(0, neckY(25.8), 13.4 * sx, 2.5 * sy, 0, 0, Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const lipGrad = ctx.createLinearGradient(x(31.4), 0, x(68.6), 0);
    lipGrad.addColorStop(0.00, 'rgba(255, 248, 230, 0.65)');
    lipGrad.addColorStop(0.18, 'rgba(255, 255, 255, 0.88)');
    lipGrad.addColorStop(0.48, 'rgba(240, 225, 195, 0.42)');
    lipGrad.addColorStop(0.76, 'rgba(255, 255, 255, 0.92)');
    lipGrad.addColorStop(1.00, 'rgba(245, 230, 200, 0.68)');

    ctx.fillStyle = lipGrad;
    ctx.strokeStyle = '#3b73cc';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(x(31.4), neckY(9.2));
    ctx.bezierCurveTo(x(29.8), neckY(13.5), x(31), neckY(18.2), x(36.2), neckY(20.6));
    ctx.ellipse(0, neckY(20.6), 13.8 * sx, 3.3 * sy, 0, Math.PI, 0, true);
    ctx.bezierCurveTo(x(69), neckY(18.2), x(70.2), neckY(13.5), x(68.6), neckY(9.2));
    ctx.ellipse(0, neckY(9.2), 18.6 * sx, 3.8 * sy, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Elongated specular facets on both sides of the neck give the lip real depth.
    ctx.fillStyle = 'rgba(230, 245, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x(57.2), neckY(11.2));
    ctx.bezierCurveTo(x(61.5), neckY(11), x(63.6), neckY(11.6), x(62.8), neckY(15.2));
    ctx.bezierCurveTo(x(62.2), neckY(18.2), x(60), neckY(19.8), x(56.4), neckY(20.1));
    ctx.bezierCurveTo(x(57), neckY(17.2), x(57.5), neckY(14), x(57.2), neckY(11.2));
    ctx.fill();

    ctx.fillStyle = 'rgba(140, 190, 255, 0.62)';
    ctx.beginPath();
    ctx.moveTo(x(32.8), neckY(11));
    ctx.bezierCurveTo(x(35.2), neckY(11.4), x(36.4), neckY(12.8), x(36.6), neckY(16.2));
    ctx.bezierCurveTo(x(36.8), neckY(18.6), x(35.8), neckY(19.6), x(34), neckY(19));
    ctx.bezierCurveTo(x(32.4), neckY(16.8), x(32), neckY(13.5), x(32.8), neckY(11));
    ctx.fill();

    ctx.strokeStyle = '#6ea6f7';
    ctx.lineWidth = 1.3 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(0, neckY(20.4), 14.2 * sx, 3.3 * sy, 0, Math.PI, 0, true);
    ctx.stroke();

    const topRimGrad = ctx.createLinearGradient(x(31.5), 0, x(68.5), 0);
    topRimGrad.addColorStop(0, 'rgba(255, 250, 235, 0.82)');
    topRimGrad.addColorStop(0.3, '#ffffff');
    topRimGrad.addColorStop(0.65, 'rgba(254, 243, 199, 0.75)');
    topRimGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = topRimGrad;
    ctx.strokeStyle = '#6b9fed';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.ellipse(0, neckY(9.2), 18.5 * sx, 3.7 * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(95, 159, 199, 0.8)';
    ctx.lineWidth = 1.3 * scale;
    ctx.beginPath();
    ctx.ellipse(0, neckY(9.6), 18.1 * sx, 3.5 * sy, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    const mouthGrad = ctx.createLinearGradient(0, neckY(7.1), 0, neckY(11));
    mouthGrad.addColorStop(0, 'rgba(180, 140, 85, 0.28)');
    mouthGrad.addColorStop(0.6, 'rgba(255, 248, 230, 0.36)');
    mouthGrad.addColorStop(1, 'rgba(255, 255, 255, 0.65)');
    ctx.fillStyle = mouthGrad;
    ctx.strokeStyle = '#5c92e6';
    ctx.lineWidth = 0.95 * scale;
    ctx.beginPath();
    ctx.ellipse(0, neckY(9), 10.2 * sx, 1.9 * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(140, 186, 255, 0.88)';
    ctx.lineWidth = 0.95 * scale;
    ctx.beginPath();
    ctx.ellipse(0, neckY(9.4), 9.5 * sx, 1.7 * sy, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

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
