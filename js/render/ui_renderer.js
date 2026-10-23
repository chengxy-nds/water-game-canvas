import { COLORS } from '../config/colors.js';

/**
 * 顶部极简大字号、次顶礼盒袋与底部 4 枚超椭圆鹅卵石圆章大按钮 Canvas 渲染器 (100% 对齐 demo.html 视觉)
 */
export class UIRenderer {
  constructor() {
    this.buttons = [];
  }

  renderUI(ctx, layout, gameState) {
    this.buttons = [];

    // 1. 顶部极简纯净大字号与左侧设置按钮 (规避右上角微信胶囊)
    this.renderTopBar(ctx, layout, gameState);

    // 2. 次顶高定礼盒袋 (仅在礼盒关渲染)
    if (gameState.levelConfig?.hasBags) {
      this.renderBagsStage(ctx, layout.bagsRect, gameState.bags);
    }

    this.renderModeBanner(ctx, layout.modeBannerRect, gameState);

    // 3. 底部 4 枚原图级超椭圆鹅卵石水晶玻璃大按钮
    this.renderBottomDock(ctx, layout.bottomBarRect, gameState);
  }

  renderModeBanner(ctx, rect, gameState) {
    if (!rect || rect.h <= 0) return;
    let title = '';
    let progress = '';
    if (gameState.levelConfig?.hasBags) {
      if (gameState.remainingMoves === null) return;
      title = '🛍 倒满同色水装入礼袋';
      progress = `完成 ${gameState.packedTotal}/${gameState.bags.length}`;
    } else if (gameState.levelConfig?.isCatBossLevel) {
      const cat = gameState.bottles.find(b => b.isGiantCat);
      title = '🐱 倒满中央灵猫瓶';
      progress = `完成 ${cat?.layers.length || 0}/8`;
    } else if (gameState.remainingMoves !== null) {
      const done = gameState.bottles.filter(b => b.corked).length;
      const total = gameState.bottles.filter(b => !b.removed && b.layers.length > 0).length;
      title = '⏳ 在步数耗尽前完成归类';
      progress = `完成 ${done}/${total}`;
    } else {
      return;
    }
    ctx.save();
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, 'rgba(255,248,232,0.36)');
    grad.addColorStop(1, 'rgba(215,175,110,0.28)');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = '800 11px "Fredoka", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(90,52,10,0.45)';
    ctx.shadowBlur = 3;
    ctx.fillText(title, rect.x + 10, rect.y + rect.h / 2);
    ctx.textAlign = 'center';
    ctx.font = '800 10px sans-serif';
    const tagW = gameState.remainingMoves !== null ? 56 : 66;
    ctx.fillStyle = 'rgba(200,125,34,0.95)';
    ctx.beginPath();
    ctx.roundRect(rect.x + rect.w - tagW - 6, rect.y + 7, tagW, rect.h - 14, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.fillText(progress, rect.x + rect.w - tagW / 2 - 6, rect.y + rect.h / 2);
    if (gameState.remainingMoves !== null) {
      const pillX = rect.x + rect.w - tagW - 78;
      const pillY = rect.y + 7;
      ctx.fillStyle = gameState.remainingMoves <= 5 ? '#e43d3d' : '#e89a22';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, 68, rect.h - 14, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '800 10px sans-serif';
      ctx.fillText(`⏱ ${gameState.remainingMoves}步`, pillX + 34, rect.y + rect.h / 2);
    }
    ctx.restore();
  }

  /**
   * 1. 顶部纯净极简大字号导航 (对标 demo.html 原图)
   */
  renderTopBar(ctx, layout, gameState) {
    const rect = layout.topBarRect;
    const safeX = Number.isFinite(rect?.x) ? rect.x : 0;
    const safeY = Number.isFinite(rect?.y) ? rect.y : 44;
    const safeW = Number.isFinite(rect?.w) ? rect.w : 375;
    const safeH = Number.isFinite(rect?.h) ? rect.h : 46;
    const centerY = safeY + safeH / 2;
    const btnSize = 42;

    // 左设置按钮 (超椭圆鹅卵石暖色玻璃 ⚙️)
    const settingsBtn = {
      id: 'settings',
      x: safeX + 14,
      y: centerY - btnSize / 2,
      w: btnSize,
      h: btnSize
    };
    this.drawTopBarGlassButton(ctx, settingsBtn.x, settingsBtn.y, btnSize, 'settings');
    this.buttons.push(settingsBtn);

    // 规则按钮（原型右侧问号）
    const lightningBtn = {
      id: 'rules',
      x: safeX + safeW - 14 - btnSize,
      y: centerY - btnSize / 2,
      w: btnSize,
      h: btnSize
    };
    this.drawTopBarGlassButton(ctx, lightningBtn.x, lightningBtn.y, btnSize, 'rules');
    this.buttons.push(lightningBtn);

    // 顶部中央超大圆润关卡字 (纯净大字，无厚重边框，带微光阴影)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 32px "Fredoka", "Quicksand", "SF Pro Rounded", sans-serif';
    ctx.shadowColor = 'rgba(110, 68, 14, 0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillText(`第 ${gameState.currentLevelNum} 关`, safeX + safeW / 2, centerY - 2);
    this.buttons.push({ id: 'level_map', x: safeX + safeW * 0.34, y: safeY, w: safeW * 0.32, h: safeH });

    ctx.restore();
  }

  /**
   * 2. 次顶 4 列高定购物袋
   */
  renderBagsStage(ctx, rect, bags) {
    if (!bags || bags.length === 0) return;
    const count = 4;
    const gap = 12;
    const bagW = Math.min(74, (rect.w - gap * (count - 1)) / count);
    const bagH = rect.h;
    const totalW = count * bagW + gap * (count - 1);
    const startX = rect.x + (rect.w - totalW) / 2;

    bags.forEach((bag, idx) => {
      const bagX = startX + idx * (bagW + gap);
      const bagY = rect.y;

      this.buttons.push({
        id: `bag_${idx}`,
        idx,
        x: bagX,
        y: bagY,
        w: bagW,
        h: bagH
      });

      ctx.save();
      if (bag.locked) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bagX, bagY + 12, bagW, bagH - 14, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', bagX + bagW / 2, bagY + bagH / 2 + 5);
      } else {
        const colObj = COLORS[bag.color] || COLORS.red;
        // 圆绳提手
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(bagX + bagW / 2, bagY + 14, 10, Math.PI, 0);
        ctx.stroke();

        // 袋身渐变
        const bagGrad = ctx.createLinearGradient(bagX, bagY + 12, bagX, bagY + bagH);
        bagGrad.addColorStop(0, colObj.bagMain);
        bagGrad.addColorStop(1, colObj.bagDark || colObj.mid);

        ctx.fillStyle = bagGrad;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(bagX, bagY + 12, bagW, bagH - 14, 10);
        ctx.fill();
        ctx.stroke();

        // 透明视窗
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.beginPath();
        ctx.arc(bagX + bagW / 2, bagY + 12 + (bagH - 14) / 2, 13, 0, Math.PI * 2);
        ctx.fill();

        // 目标药水圆点
        ctx.fillStyle = colObj.mid;
        ctx.beginPath();
        ctx.arc(bagX + bagW / 2, bagY + 12 + (bagH - 14) / 2, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  /**
   * 3. 底部 4 枚原图级超椭圆鹅卵石水晶玻璃大按钮 (100% 对标 demo.html 2340 行)
   */
  renderBottomDock(ctx, rect, gameState) {
    const dockButtons = [
      { id: 'restart', type: 'restart', badge: null },
      { id: 'shuffle', type: 'shuffle', badge: gameState.shuffleUses },
      { id: 'undo',    type: 'undo',    badge: gameState.undoUses },
      { id: 'hint',    type: 'hint',    badge: gameState.hintUses }
    ];

    const count = 4;
    const btnSize = Math.min(64, Math.max(52, (rect.w - 14 * 3) / count));
    const totalW = count * btnSize + 14 * (count - 1);
    const startX = rect.x + (rect.w - totalW) / 2;
    const startY = rect.y + Math.max(0, (rect.h - btnSize) / 2);

    dockButtons.forEach((btn, idx) => {
      const bx = startX + idx * (btnSize + 14);
      const by = startY;

      this.buttons.push({
        id: btn.id,
        x: bx,
        y: by,
        w: btnSize,
        h: btnSize
      });

      this.drawMedallionButton(ctx, bx, by, btnSize, btn.type, btn.badge);
    });
  }

  /**
   * 绘制单枚 100% 原图级超椭圆鹅卵石水晶玻璃大按钮
   */
  drawMedallionButton(ctx, x, y, size, type, badgeCount) {
    ctx.save();
    ctx.translate(x, y);
    const scale = size / 100;
    ctx.scale(scale, scale);

    // A. 原图阴影
    ctx.shadowColor = 'rgba(70, 42, 10, 0.32)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // B. 超椭圆鹅卵石底座 (M 50,5 C 84,5 95,16 95,50 ...)
    this.createSuperEllipsePath(ctx);
    const baseGrad = ctx.createLinearGradient(0, 5, 0, 95);
    baseGrad.addColorStop(0, 'rgba(255, 250, 235, 0.42)');
    baseGrad.addColorStop(0.5, 'rgba(255, 240, 205, 0.20)');
    baseGrad.addColorStop(1, 'rgba(180, 130, 60, 0.32)');
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // 内部底部阴影
    const innerShade = ctx.createLinearGradient(0, 50, 0, 95);
    innerShade.addColorStop(0, 'rgba(120, 70, 18, 0)');
    innerShade.addColorStop(1, 'rgba(120, 70, 18, 0.28)');
    ctx.fillStyle = innerShade;
    ctx.fill();

    ctx.shadowBlur = 0;

    // C. 顶部新月形高光弧 (topCrescentSheen)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.beginPath();
    ctx.moveTo(50, 7);
    ctx.bezierCurveTo(80, 7, 91, 16, 92, 43);
    ctx.bezierCurveTo(70, 50, 34, 39, 8, 46);
    ctx.bezierCurveTo(9, 17, 20, 7, 50, 7);
    ctx.closePath();
    ctx.fill();

    // 上缘亮白描边弧
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(14, 34);
    ctx.bezierCurveTo(16, 16, 27, 9.5, 50, 9.5);
    ctx.bezierCurveTo(68, 9.5, 79, 13.5, 84, 24);
    ctx.stroke();

    // 外圈金玻璃边缘高光描边
    this.createSuperEllipsePath(ctx);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // D. 绘制纯白高清矢量图标 (对标原图 2340 行)
    this.drawButtonIcon(ctx, type);

    ctx.restore();

    // E. 温润半透明红金次数角标
    if (typeof badgeCount === 'number') {
      ctx.save();
      const badgeR = 10;
      const bx = x + size - 4;
      const by = y + 4;

      const badgeGrad = ctx.createLinearGradient(bx, by - badgeR, bx, by + badgeR);
      badgeGrad.addColorStop(0, '#ffd86b');
      badgeGrad.addColorStop(1, '#e59b29');
      ctx.fillStyle = badgeGrad;
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${badgeCount}`, bx, by + 1);
      ctx.restore();
    }
  }

  /**
   * 绘制 4 种专属高清矢量图标
   */
  drawButtonIcon(ctx, type) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';

    if (type === 'restart') {
      // 环形圆角三角箭头
      ctx.lineWidth = 7.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(50, 52, 18.5, -0.6 * Math.PI, 1.15 * Math.PI);
      ctx.stroke();

      // 箭头三角
      ctx.beginPath();
      ctx.moveTo(47.5, 24.5);
      ctx.lineTo(46.5, 43.5);
      ctx.lineTo(30.8, 35.8);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'shuffle') {
      // 双箭头交叉洗牌
      ctx.lineWidth = 6.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(24, 64);
      ctx.lineTo(33, 64);
      ctx.bezierCurveTo(41, 64, 46, 59, 51, 48);
      ctx.bezierCurveTo(56, 37, 61, 33, 69, 33);
      ctx.lineTo(76, 33);
      ctx.stroke();

      // 右上箭头
      ctx.beginPath();
      ctx.moveTo(67, 24);
      ctx.lineTo(78, 33);
      ctx.lineTo(67, 42);
      ctx.stroke();

      // 下半部
      ctx.beginPath();
      ctx.moveTo(24, 33);
      ctx.lineTo(33, 33);
      ctx.bezierCurveTo(38, 33, 42, 35.5, 45.5, 41);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(56.5, 56.5);
      ctx.bezierCurveTo(60, 61.5, 64, 64, 69, 64);
      ctx.lineTo(76, 64);
      ctx.stroke();

      // 右下箭头
      ctx.beginPath();
      ctx.moveTo(67, 55);
      ctx.lineTo(78, 64);
      ctx.lineTo(67, 73);
      ctx.stroke();
    } else if (type === 'undo') {
      // 流线型左弯实心大箭头
      ctx.beginPath();
      ctx.moveTo(44, 31);
      ctx.lineTo(25.5, 48.5);
      ctx.lineTo(45.5, 61.5);
      ctx.lineTo(48.8, 58.6);
      ctx.lineTo(47.0, 52.2);
      ctx.bezierCurveTo(58.2, 51.0, 66.8, 54.8, 72.5, 62.2);
      ctx.bezierCurveTo(75.5, 62.5, 75.2, 60.8, 72.8, 44.2);
      ctx.bezierCurveTo(61.2, 36.8, 46.8, 38.2, 48.0, 32.8);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'hint') {
      // 发光灯泡 + 放射金芒
      ctx.strokeStyle = '#ffe866';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      const rays = [
        [50, 13, 50, 20], [33, 17.5, 37, 23.5], [67, 17.5, 63, 23.5],
        [21, 29, 27, 32.5], [79, 29, 73, 32.5], [17, 44.5, 24, 44.5],
        [83, 44.5, 76, 44.5]
      ];
      rays.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // 灯泡球体
      ctx.fillStyle = '#ffea3b';
      ctx.beginPath();
      ctx.moveTo(50, 24);
      ctx.bezierCurveTo(38.2, 24, 29, 33.0, 29, 44.2);
      ctx.bezierCurveTo(29, 51.4, 33.0, 57.6, 38.8, 61.2);
      ctx.lineTo(42.2, 67.0);
      ctx.lineTo(57.8, 67.0);
      ctx.lineTo(61.2, 61.2);
      ctx.bezierCurveTo(67.0, 57.6, 71, 51.4, 71, 44.2);
      ctx.bezierCurveTo(71, 33.0, 61.8, 24, 50, 24);
      ctx.closePath();
      ctx.fill();

      // 底座螺旋
      ctx.fillStyle = '#6f7b88';
      ctx.beginPath();
      ctx.roundRect(42.2, 67.2, 15.6, 4.8, 2.2);
      ctx.fill();
      ctx.fillStyle = '#596573';
      ctx.beginPath();
      ctx.roundRect(43.4, 72.0, 13.2, 4.5, 2.0);
      ctx.fill();
    }

    ctx.restore();
  }

  createSuperEllipsePath(ctx) {
    ctx.beginPath();
    ctx.moveTo(50, 5);
    ctx.bezierCurveTo(84, 5, 95, 16, 95, 50);
    ctx.bezierCurveTo(95, 84, 84, 95, 50, 95);
    ctx.bezierCurveTo(16, 95, 5, 84, 5, 50);
    ctx.bezierCurveTo(5, 16, 16, 5, 50, 5);
    ctx.closePath();
  }

  drawTopBarGlassButton(ctx, x, y, size, type) {
    ctx.save();
    ctx.translate(x, y);
    const scale = size / 100;
    ctx.scale(scale, scale);

    // A. 柔和地面投影
    ctx.shadowColor = 'rgba(70, 42, 10, 0.32)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    // B. 超椭圆鹅卵石底座
    this.createSuperEllipsePath(ctx);
    const baseGrad = ctx.createLinearGradient(0, 5, 0, 95);
    baseGrad.addColorStop(0, 'rgba(255, 250, 235, 0.44)');
    baseGrad.addColorStop(0.5, 'rgba(255, 240, 205, 0.22)');
    baseGrad.addColorStop(1, 'rgba(180, 130, 60, 0.36)');
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // 内部底部阴影
    const innerShade = ctx.createLinearGradient(0, 50, 0, 95);
    innerShade.addColorStop(0, 'rgba(120, 70, 18, 0)');
    innerShade.addColorStop(1, 'rgba(120, 70, 18, 0.28)');
    ctx.fillStyle = innerShade;
    ctx.fill();
    ctx.shadowBlur = 0;

    // C. 顶部新月形高光弧
    ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.beginPath();
    ctx.moveTo(50, 7);
    ctx.bezierCurveTo(80, 7, 91, 16, 92, 43);
    ctx.bezierCurveTo(70, 50, 34, 39, 8, 46);
    ctx.bezierCurveTo(9, 17, 20, 7, 50, 7);
    ctx.closePath();
    ctx.fill();

    // 上缘亮白描边弧
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(14, 34);
    ctx.bezierCurveTo(16, 16, 27, 9.5, 50, 9.5);
    ctx.bezierCurveTo(68, 9.5, 79, 13.5, 84, 24);
    ctx.stroke();

    // 外圈金玻璃边缘高光描边
    this.createSuperEllipsePath(ctx);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.90)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // D. 绘制高清矢量图标
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    if (type === 'settings') {
      // 100% 对标原图 3 条圆润高定汉堡白线 (带立体微阴影)
      ctx.beginPath();
      ctx.roundRect(30, 32, 40, 7.6, 3.8);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(30, 46.2, 40, 7.6, 3.8);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(30, 60.4, 40, 7.6, 3.8);
      ctx.fill();
    } else if (type === 'level_map') {
      // 折叠地图折纸矢量图标 (3 面立体折叠折纸)
      ctx.beginPath();
      ctx.moveTo(30, 34);
      ctx.lineTo(44, 28);
      ctx.lineTo(44, 66);
      ctx.lineTo(30, 72);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.moveTo(44, 28);
      ctx.lineTo(58, 34);
      ctx.lineTo(58, 72);
      ctx.lineTo(44, 66);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(58, 34);
      ctx.lineTo(72, 28);
      ctx.lineTo(72, 66);
      ctx.lineTo(58, 72);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'rules') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(50, 43, 15, Math.PI * 1.08, Math.PI * 1.94);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(65, 43);
      ctx.bezierCurveTo(65, 53, 51, 53, 50, 63);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(50, 76, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  hitTest(touchX, touchY) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const btn = this.buttons[i];
      if (
        touchX >= btn.x &&
        touchX <= btn.x + btn.w &&
        touchY >= btn.y &&
        touchY <= btn.y + btn.h
      ) {
        return btn;
      }
    }
    return null;
  }
}
