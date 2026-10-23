import { Platform, installRoundRectPolyfill } from './platform/platform.js';
import { GameState } from './core/game_state.js';
import { StageLayout } from './render/stage_layout.js';
import { BottleRenderer } from './render/bottle_renderer.js';
import { LiquidStreamRenderer } from './render/liquid_stream.js';
import { UIRenderer } from './render/ui_renderer.js';
import { PopupRenderer } from './render/popup_renderer.js';
import { PourAnimator } from './anim/pour_animator.js';
import { ParticleSystem } from './anim/particle_system.js';
import { ASMRAudioManager } from './audio/asmr_audio_manager.js';
import { findBestPourMove, shuffleBoard } from './core/solver_ai.js';
import { SHOP_THEMES } from './config/colors.js';
import { Easing } from './anim/tween.js';

/**
 * 《倒水不能停 · 星光琉璃工坊》微信小游戏主程序 (100% 对标 demo.html 原型视觉与交互)
 */
export default class Main {
  constructor() {
    this.canvas = Platform.createCanvas();
    this.ctx = this.canvas.getContext('2d');

    this.layout = new StageLayout();
    this.gameState = new GameState();
    this.bottleRenderer = new BottleRenderer();
    this.streamRenderer = new LiquidStreamRenderer();
    this.uiRenderer = new UIRenderer();
    this.popupRenderer = new PopupRenderer();
    this.pourAnimator = new PourAnimator();
    this.particleSystem = new ParticleSystem(300);
    this.audioManager = new ASMRAudioManager();

    this.activeTheme = SHOP_THEMES[0];
    this.modalState = null;
    this.lastTime = 0;
    this.aniId = null;

    this.init();
  }

  init() {
    const sysInfo = Platform.getSystemInfo();
    this.canvas.width = sysInfo.windowWidth * sysInfo.pixelRatio;
    this.canvas.height = sysInfo.windowHeight * sysInfo.pixelRatio;
    this.ctx.scale(sysInfo.pixelRatio, sysInfo.pixelRatio);

    installRoundRectPolyfill(this.ctx);

    const savedLevel = Platform.getStorageSync('water_game_cur_level', 1);
    this.loadLevel(savedLevel);

    Platform.onTouchStart(this.handleTouchStart.bind(this));

    this.lastTime = Date.now();
    this.loop();
  }

  loadLevel(levelNum) {
    this.gameState.loadLevel(levelNum);
    const sysInfo = Platform.getSystemInfo();
    const hasBags = !!this.gameState.levelConfig.hasBags;
    this.layout.resize(sysInfo, hasBags, !!this.gameState.levelConfig.isCatBossLevel || this.gameState.remainingMoves !== null);
    this.layout.layoutBottles(this.gameState.bottles, this.gameState.levelConfig.layoutType);

    const introKey = this.gameState.levelConfig.introMechanicKey;
    const shownKey = `water_game_intro_shown_${introKey}`;
    if (introKey && !Platform.getStorageSync(shownKey, false)) {
      this.modalState = { type: 'new_mechanic', data: introKey };
      Platform.setStorageSync(shownKey, true);
    }
  }

  handleTouchStart(e) {
    const x = e.clientX !== undefined ? e.clientX : (e.x || 0);
    const y = e.clientY !== undefined ? e.clientY : (e.y || 0);

    // 1. 优先处理弹窗交互
    if (this.modalState) {
      const modalBtn = this.popupRenderer.hitTest(x, y);
      if (modalBtn) {
        this.handleModalAction(modalBtn);
      }
      return;
    }

    // 2. 动画期间忽略操作
    if (this.pourAnimator.isBusy || this.gameState.isAnimating) return;

    // 3. UI 按钮交互 (顶部设置/地图，底部4枚大圆章按钮)
    const uiBtn = this.uiRenderer.hitTest(x, y);
    if (uiBtn) {
      this.handleUIAction(uiBtn);
      return;
    }

    // 4. 水瓶点击拾取与倒水
    this.handleBottleTouch(x, y);
  }

  handleBottleTouch(x, y) {
    let clickedIdx = -1;
    for (let i = this.gameState.bottles.length - 1; i >= 0; i--) {
      const b = this.gameState.bottles[i];
      if (b.removed) continue;
      // 容差判定区域：上下左右各扩大 10px
      if (
        x >= b.x - 10 &&
        x <= b.x + b.width + 10 &&
        y >= b.y - 14 &&
        y <= b.y + b.height + 14
      ) {
        clickedIdx = i;
        break;
      }
    }

    if (clickedIdx === -1) {
      if (this.gameState.selectedIndex !== null) {
        this.deselectBottle();
      }
      return;
    }

    const selIdx = this.gameState.selectedIndex;

    // A. 尚未选中任何瓶子 -> 拿起
    if (selIdx === null) {
      if (this.gameState.canSelectBottle(clickedIdx)) {
        this.selectBottle(clickedIdx);
      } else {
        Platform.vibrateShort();
      }
      return;
    }

    // B. 点击已选中的瓶子 -> 放回
    if (selIdx === clickedIdx) {
      this.deselectBottle();
      return;
    }

    // C. 尝试倾倒至目标瓶
    if (this.gameState.canPourInto(selIdx, clickedIdx)) {
      this.triggerPour(selIdx, clickedIdx);
    } else {
      // 若不能倒入，但点击的目标瓶可作为源瓶拿起，则直接切换
      if (this.gameState.canSelectBottle(clickedIdx)) {
        this.deselectBottle();
        this.selectBottle(clickedIdx);
      } else {
        Platform.vibrateShort();
      }
    }
  }

  selectBottle(idx) {
    this.gameState.selectedIndex = idx;
    const b = this.gameState.bottles[idx];
    b.isLifting = true;
    b.liftTime = 0;
    b.settleTime = undefined;
    b.sloshAmp = 0.48; // 激起温润晃动
    this.audioManager.playNoiseBrush();
    Platform.vibrateShort();
  }

  deselectBottle() {
    if (this.gameState.selectedIndex === null) return;
    const b = this.gameState.bottles[this.gameState.selectedIndex];
    b.isLifting = false;
    b.settleTime = 0;
    b.settleStartY = b.y;
    b.sloshAmp = 0.52;
    this.gameState.selectedIndex = null;
    this.audioManager.playNoiseBrush();
  }

  /**
   * 瓶子物理浮空与落座阻尼回弹帧更新
   */
  updateBottles(dt) {
    const selectedIdx = this.gameState.selectedIndex;
    this.gameState.bottles.forEach((b, idx) => {
      if (b.isFlying) return; // 飞行倾倒期间由 pourAnimator 全权驱动物理轨迹

      const isSelected = (selectedIdx === idx);

      if (isSelected) {
        b.liftTime = (b.liftTime || 0) + dt;
        const p = Math.min(1, b.liftTime / 0.18);
        const easeLift = Easing.easeOutBack(p, 1.45);

        // 饱满呼吸浮空微动 (Idle Hover Float)
        b.hoverTimer = (b.hoverTimer || 0) + dt * 3.6;
        const hover = Math.sin(b.hoverTimer) * 1.8;

        b.y = b.baseY - (25 * easeLift) + hover;
      } else {
        b.hoverTimer = 0;
        b.liftTime = 0;

        // 落座物理阻尼衰减回弹
        if (b.settleTime !== undefined && b.settleTime < 0.28) {
          b.settleTime += dt;
          const dropP = Math.min(1, b.settleTime / 0.18);
          const easeDrop = Easing.easeOutCubic(dropP);
          const bounce = Easing.bottleLandingOffset(b.settleTime);
          const startY = (b.settleStartY !== undefined) ? b.settleStartY : (b.baseY - 25);

          b.y = startY + (b.baseY - startY) * easeDrop + bounce;

          if (b.settleTime >= 0.28) {
            b.y = b.baseY;
            b.settleTime = undefined;
            b.settleStartY = undefined;
          }
        } else if (!b.isLifting) {
          b.y = b.baseY;
        }
      }
    });
  }

  triggerPour(srcIdx, dstIdx) {
    const srcBottle = this.gameState.bottles[srcIdx];
    const dstBottle = this.gameState.bottles[dstIdx];
    const pourAmount = this.gameState.calculatePourAmount(srcIdx, dstIdx);
    const pourColor = srcBottle.topColor;

    this.gameState.isAnimating = true;
    this.gameState.selectedIndex = null;

    this.audioManager.playPourSound({
      maxCap: dstBottle.maxCap,
      isGiantCat: dstBottle.isGiantCat,
      initialLayers: dstBottle.layers.length,
      moveCount: pourAmount
    });

    this.pourAnimator.startPourAnimation({
      srcBottle,
      dstBottle,
      pourAmount,
      pourColor,
      onPourWaterImpact: (impactX, impactY, col) => {
        this.particleSystem.emitSplash(impactX, impactY, col, 12);
      },
      onPourComplete: () => {
        const eventDetail = this.gameState.applyPour(srcIdx, dstIdx);

        if (eventDetail?.dstCompleted) {
          this.audioManager.playCorkSlam();
          this.particleSystem.emitCelebrationStars(
            dstBottle.x + dstBottle.width / 2,
            dstBottle.y + dstBottle.height * 0.18,
            24
          );
        }

        this.gameState.isAnimating = false;

        if (this.gameState.checkWin()) {
          this.audioManager.playWinChime();
          this.modalState = { type: 'win', data: { levelNum: this.gameState.currentLevelNum } };
          Platform.setStorageSync('water_game_cur_level', this.gameState.currentLevelNum + 1);
        } else if (this.gameState.checkMoveLimitFailed()) {
          this.modalState = { type: 'fail', data: {} };
        }
      }
    });
  }

  /**
   * 处理底部4大原图按钮与顶部设置
   */
  handleUIAction(btn) {
    if (btn.id === 'settings') {
      this.modalState = { type: 'settings', data: { sound: this.audioManager.soundEnabled } };
    } else if (btn.id === 'rules') {
      this.modalState = { type: 'rules', data: {} };
    } else if (btn.id === 'level_map') {
      this.modalState = { type: 'level_select', data: { currentLevel: this.gameState.currentLevelNum } };
    } else if (btn.id === 'restart') {
      // 重新开始本关
      this.loadLevel(this.gameState.currentLevelNum);
      this.audioManager.playNoiseBrush();
    } else if (btn.id === 'undo') {
      // 撤回一步
      if (this.gameState.undo()) {
        this.audioManager.playNoiseBrush();
      } else {
        Platform.vibrateShort();
      }
    } else if (btn.id === 'shuffle') {
      // 打乱重排
      if (this.gameState.shuffleUses > 0) {
        if (shuffleBoard(this.gameState)) {
          this.gameState.shuffleUses--;
          this.audioManager.playWinChime();
        }
      } else {
        Platform.vibrateShort();
      }
    } else if (btn.id === 'hint') {
      // 智能提示下一步最优倒法
      if (this.gameState.hintUses > 0) {
        const bestMove = findBestPourMove(this.gameState);
        if (bestMove) {
          this.gameState.hintUses--;
          this.selectBottle(bestMove.srcIdx);
        } else {
          // 死局时自动触发免费星轨重塑洗牌
          shuffleBoard(this.gameState);
          this.audioManager.playWinChime();
        }
      } else {
        Platform.vibrateShort();
      }
    }
  }

  handleModalAction(btn) {
    if (btn.id === 'dismiss_mechanic' || btn.id === 'close_modal') {
      this.modalState = null;
    } else if (btn.id === 'next_level') {
      this.modalState = null;
      this.loadLevel(this.gameState.currentLevelNum + 1);
    } else if (btn.id === 'retry_level' || btn.id === 'restart_current') {
      this.modalState = null;
      this.loadLevel(this.gameState.currentLevelNum);
    } else if (btn.id === 'continue_moves') {
      this.modalState = null;
      this.gameState.remainingMoves = (this.gameState.remainingMoves || 0) + 5;
    } else if (btn.id === 'toggle_sound') {
      this.audioManager.soundEnabled = !this.audioManager.soundEnabled;
      if (this.modalState.data) {
        this.modalState.data.sound = this.audioManager.soundEnabled;
      }
    } else if (btn.id.startsWith('select_level_')) {
      this.modalState = null;
      this.loadLevel(btn.levelNum);
    }
  }

  loop() {
    const now = Date.now();
    const dt = Math.min(0.06, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // 每一帧开头强制重置为逻辑像素缩放矩阵，杜绝帧间变换累积污染
    const pr = this.layout.pixelRatio || 1;
    if (typeof this.ctx.setTransform === 'function') {
      this.ctx.setTransform(pr, 0, 0, pr, 0, 0);
    }

    this.updateBottles(dt);
    this.bottleRenderer.update(dt);
    this.pourAnimator.update(dt);
    this.streamRenderer.update(dt);
    this.particleSystem.update(dt);
    if (this.modalState) this.popupRenderer.update(dt);

    try {
      // 1. 渲染 100% 对齐 demo.html 的三层柔和暖金琥珀渐变
      this.renderStageBackground();

      // 2. 渲染背景浮动星尘微粒
      this.particleSystem.render(this.ctx, this.layout.screenWidth, this.layout.screenHeight);

      // 3. 渲染所有琉璃水瓶
      this.gameState.bottles.forEach((b, idx) => {
        const isSelected = (this.gameState.selectedIndex === idx);
        this.bottleRenderer.renderBottle(this.ctx, b, isSelected);
      });

      // 4. 渲染水柱
      if (this.pourAnimator.streamInfo) {
        this.streamRenderer.renderStream(this.ctx, this.pourAnimator.streamInfo);
      }

      // 5. 渲染顶部与底部 UI
      this.uiRenderer.renderUI(this.ctx, this.layout, this.gameState);

      // 6. 渲染弹窗
      if (this.modalState) {
        this.popupRenderer.renderModal(
          this.ctx,
          this.modalState,
          this.layout.screenWidth,
          this.layout.screenHeight
        );
      }
    } catch (err) {
      console.error('Render error:', err);
    }

    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * 100% 还原 demo.html 第 16-23 行的三层柔和琥珀暖光渐变
   */
  renderStageBackground() {
    const w = this.layout.screenWidth;
    const h = this.layout.screenHeight;

    // Match the supplied prototype image: a clean, warm amber field without
    // the grey-sage cast caused by stretching the CSS diagonal incorrectly.
    const baseLinear = this.ctx.createLinearGradient(0, h, 0, 0);
    baseLinear.addColorStop(0.00, '#dda143');
    baseLinear.addColorStop(0.48, '#e3aa48');
    baseLinear.addColorStop(1.00, '#e8b34d');

    this.ctx.fillStyle = baseLinear;
    this.ctx.fillRect(0, 0, w, h);

    // B. 中下部琥珀橘暖阳光晕 (ellipse at 30% 56%)
    const midAmber = this.ctx.createRadialGradient(w * 0.46, h * 0.52, 10, w * 0.46, h * 0.52, w * 0.78);
    midAmber.addColorStop(0.00, 'rgba(255, 204, 95, 0.10)');
    midAmber.addColorStop(1.00, 'rgba(255, 204, 95, 0.0)');

    this.ctx.fillStyle = midAmber;
    this.ctx.fillRect(0, 0, w, h);

    // C. 顶部暖阳微光晕 (circle at 46% 19%)
    const topGlow = this.ctx.createRadialGradient(w * 0.46, h * 0.19, 0, w * 0.46, h * 0.19, w * 0.55);
    topGlow.addColorStop(0.00, 'rgba(255, 232, 135, 0.18)');
    topGlow.addColorStop(0.38, 'rgba(255, 224, 110, 0.06)');
    topGlow.addColorStop(1.00, 'rgba(255, 224, 110, 0.0)');

    this.ctx.fillStyle = topGlow;
    this.ctx.fillRect(0, 0, w, h * 0.48);
  }
}
