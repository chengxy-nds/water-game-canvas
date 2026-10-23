import { Platform } from '../platform/platform.js';

/**
 * 屏幕视口与自适应四段式舞台布局计算器 (深度适配微信胶囊与消除压扁)
 */
export class StageLayout {
  constructor() {
    this.screenWidth = 375;
    this.screenHeight = 667;
    this.pixelRatio = 1;
    this.appWidth = 375;
    this.appLeft = 0;

    // 四段式核心区域
    this.topBarRect = { x: 0, y: 0, w: 0, h: 0 };
    this.menuButtonRect = null; // 微信右上角官方胶囊位置
    this.bagsRect = { x: 0, y: 0, w: 0, h: 0 };
    this.modeBannerRect = { x: 0, y: 0, w: 0, h: 0 };
    this.bottlesRect = { x: 0, y: 0, w: 0, h: 0 };
    this.bottomBarRect = { x: 0, y: 0, w: 0, h: 0 };
  }

  resize(sysInfo, hasBags = false, showModeBanner = false) {
    this.screenWidth = Number.isFinite(sysInfo?.windowWidth) ? sysInfo.windowWidth : 375;
    this.screenHeight = Number.isFinite(sysInfo?.windowHeight) ? sysInfo.windowHeight : 667;
    this.pixelRatio = Number.isFinite(sysInfo?.pixelRatio) ? sysInfo.pixelRatio : 1;

    const maxAppW = 460;
    this.appWidth = Math.min(this.screenWidth, maxAppW);
    this.appLeft = Math.max(0, (this.screenWidth - this.appWidth) / 2);

    this.menuButtonRect = Platform.getMenuButtonBoundingClientRect();

    // 智能识别移动端刘海与右上角胶囊：
    // 若胶囊有效则与胶囊等高对齐；若无胶囊但为刘海屏，顶部安全区保底 44px；标准矩形屏保底 24px
    const hasNotch = sysInfo?.safeArea && typeof sysInfo.safeArea.top === 'number' && sysInfo.safeArea.top > 20;
    const defaultTop = hasNotch ? 44 : 24;
    let safeTop = defaultTop;
    if (this.menuButtonRect && Number.isFinite(this.menuButtonRect.top) && this.menuButtonRect.top > 0) {
      safeTop = this.menuButtonRect.top;
    } else if (sysInfo?.safeArea && Number.isFinite(sysInfo.safeArea.top) && sysInfo.safeArea.top > 0) {
      safeTop = sysInfo.safeArea.top;
    }
    safeTop = Math.max(hasNotch ? 40 : 20, safeTop);

    let safeBottom = 16;
    if (sysInfo?.safeArea && Number.isFinite(sysInfo.safeArea.bottom) && sysInfo.safeArea.bottom > 0) {
      safeBottom = Math.max(10, this.screenHeight - sysInfo.safeArea.bottom);
    }

    // 1. 顶部导航栏匹配原型 58–72px 高度；微信胶囊只影响安全区，不缩小标题栏。
    const topBarH = Math.max(58, Math.min(72, this.screenHeight * 0.086));

    this.topBarRect = {
      x: this.appLeft,
      y: safeTop,
      w: this.appWidth,
      h: topBarH
    };

    // 2. 次顶目标区 (仅在有购物袋时占用高度，无购物袋时释放全部空间)
    const bagsH = hasBags ? Math.max(98, Math.min(128, this.screenHeight * 0.158)) : 0;
    this.bagsRect = {
      x: this.appLeft + 12,
      y: this.topBarRect.y + topBarH + (hasBags ? 6 : 0),
      w: this.appWidth - 24,
      h: bagsH
    };
    const modeH = showModeBanner ? 38 : 0;
    this.modeBannerRect = {
      x: this.appLeft + 12,
      y: this.bagsRect.y + bagsH + (showModeBanner ? 4 : 0),
      w: this.appWidth - 24,
      h: modeH
    };

    // 4. 底部道具栏 (4枚超椭圆圆章大按钮，高度约 74px)
    const bottomBarH = 92;
    this.bottomBarRect = {
      x: this.appLeft + 16,
      y: Math.max(0, this.screenHeight - safeBottom - bottomBarH - 12),
      w: this.appWidth - 32,
      h: bottomBarH
    };

    // 3. 中央瓶阵舞台 (占据全部充裕纵向空间)
    const bottlesTop = this.modeBannerRect.y + modeH + (modeH ? 6 : 8);
    const bottlesBottom = this.bottomBarRect.y - 8;
    const calcStageH = Math.max(0, bottlesBottom - bottlesTop);
    this.bottlesRect = {
      x: this.appLeft + 12,
      y: bottlesTop,
      w: this.appWidth - 24,
      h: Number.isFinite(calcStageH) ? calcStageH : Math.max(0, this.screenHeight - bottlesTop - 100)
    };
  }

  /**
   * 为当前关卡的水瓶计算精确屏幕坐标
   */
  layoutBottles(bottles, layoutType = 'grid') {
    if (!bottles || bottles.length === 0) return;
    const count = bottles.length;
    const stage = this.bottlesRect;

    // 灵猫Boss关
    if (layoutType === 'cat_boss') {
      this.layoutCatBoss(bottles, stage);
      return;
    }

    // 皇冠长管
    if (layoutType === 'tall8' && count <= 8) {
      this.layoutTall8(bottles, stage);
      return;
    }

    // 21瓶王座大阵
    if (layoutType === 'grid21' || count > 14) {
      this.layoutGrid21(bottles, stage);
      return;
    }

    // 标准双排多列 (通常 2 行 x 6 列)
    const cols = count <= 6 ? count : 6;
    const rows = count <= 6 ? 1 : 2;

    const colWidth = stage.w * 0.86 / cols;
    const gridX = stage.x + (stage.w - colWidth * cols) / 2;
    // The prototype uses a noticeably slimmer silhouette than the current
    // Canvas version; preserve bottle height and constrain width per column.
    const bottleH = Math.min(186, this.screenHeight * 0.216);
    const bottleW = Math.min(54, colWidth * 0.90, bottleH * 0.27);
    const verticalGap = rows > 1 ? Math.max(22, Math.min(30, this.screenHeight * 0.030)) : 0;
    const gridH = rows * bottleH + (rows - 1) * verticalGap;
    const startY = stage.y + Math.max(0, (stage.h - gridH) / 2) - this.screenHeight * 0.024;

    bottles.forEach((b, idx) => {
      const curBottleH = bottleH;

      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const countInRow = (r === rows - 1) ? (count - r * cols) : cols;
      const rowStartX = gridX + (cols - countInRow) * colWidth / 2;

      const centerX = rowStartX + c * colWidth + colWidth / 2;
      const rowBaseY = startY + r * (bottleH + verticalGap) + bottleH;

      b.width = Number.isFinite(bottleW) ? bottleW : 52;
      b.height = Number.isFinite(curBottleH) ? curBottleH : 136;
      b.x = Number.isFinite(centerX) ? (centerX - b.width / 2) : (18 + c * 56);
      b.baseY = Number.isFinite(rowBaseY) ? (rowBaseY - b.height) : (180 + r * 150);
      if (!b.isFlying) {
        b.y = b.baseY;
      }
    });
  }

  layoutCatBoss(bottles, stage) {
    const catBottle = bottles.find(b => b.isGiantCat);
    const sideBottles = bottles.filter(b => !b.isGiantCat);

    const catH = Math.min(296, this.screenHeight * 0.42, stage.h * 0.90);
    const catW = Math.min(168, stage.w * 0.48, catH * 124 / 224);
    const catX = stage.x + (stage.w - catW) / 2;
    const catY = stage.y + (stage.h - catH) / 2;

    if (catBottle) {
      catBottle.width = catW;
      catBottle.height = catH;
      catBottle.x = catX;
      catBottle.baseY = catY;
      if (!catBottle.isFlying) catBottle.y = catY;
    }

    const half = Math.ceil(sideBottles.length / 2);
    const leftBottles = sideBottles.slice(0, half);
    const rightBottles = sideBottles.slice(half);

    const bW = Math.min(62, (stage.w - catW) / 5, stage.h * 0.245 * 67 / 204);
    const bH = bW * (202 / 78);

    const layoutColumn = (arr, isLeft) => {
      const colStartX = isLeft ? stage.x + 4 : catX + catW + 4;
      const colW = (stage.w - catW) / 2 - 8;
      const spacingY = (stage.h - arr.length * bH) / (arr.length + 1);

      arr.forEach((b, i) => {
        b.width = bW;
        b.height = bH;
        b.x = colStartX + (colW - bW) / 2;
        b.baseY = stage.y + spacingY + i * (bH + spacingY);
        if (!b.isFlying) b.y = b.baseY;
      });
    };

    layoutColumn(leftBottles, true);
    layoutColumn(rightBottles, false);
  }

  layoutTall8(bottles, stage) {
    const cols = bottles.length;
    const colW = stage.w / cols;
    const bH = Math.min(276, this.screenHeight * 0.40, stage.h * 0.88);
    const bW = Math.min(64, colW * 0.92, bH * 70 / 298);

    bottles.forEach((b, i) => {
      const waveOffset = Math.sin(i * 1.2) * 10;
      b.width = bW;
      b.height = bH;
      b.x = stage.x + i * colW + (colW - bW) / 2;
      b.baseY = stage.y + (stage.h - bH) / 2 + waveOffset;
      if (!b.isFlying) b.y = b.baseY;
    });
  }

  layoutGrid21(bottles, stage) {
    const cols = 7;
    const rows = 3;
    const colW = stage.w / cols;
    const bH = Math.min(156, this.screenHeight * 0.192, stage.h * 0.29);
    const bW = Math.min(54, colW * 0.94, bH * 67 / 204);
    const rowSpacing = Math.max(8, (stage.h - rows * bH) / (rows + 1));

    bottles.forEach((b, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      b.width = bW;
      b.height = bH;
      b.x = stage.x + c * colW + (colW - bW) / 2;
      b.baseY = stage.y + rowSpacing + r * (bH + rowSpacing);
      if (!b.isFlying) b.y = b.baseY;
    });
  }
}
