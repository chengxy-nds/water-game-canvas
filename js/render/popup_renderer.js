import { MECHANIC_INTROS } from '../config/mechanics.js';

/**
 * 磨砂水晶玻璃弹窗体系与 IMG_6674 悬浮透光庆典解锁层渲染器
 */
export class PopupRenderer {
  constructor() {
    this.rayAngle = 0;
    this.popupButtons = [];
  }

  update(dt) {
    this.rayAngle += dt * 0.45; // 聚光灯金芒旋转速度
  }

  /**
   * 绘制弹窗（若当前有激活的弹窗）
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Object} modalState { type, data }
   * @param {Number} screenW 
   * @param {Number} screenH 
   */
  renderModal(ctx, modalState, screenW, screenH) {
    if (!modalState || !modalState.type) return;
    this.popupButtons = [];

    // 半透明全屏遮罩
    ctx.save();
    ctx.fillStyle = 'rgba(44, 30, 12, 0.48)';
    ctx.fillRect(0, 0, screenW, screenH);
    ctx.restore();

    if (modalState.type === 'new_mechanic') {
      this.renderMechanicCeremony(ctx, modalState.data, screenW, screenH);
    } else if (modalState.type === 'win') {
      this.renderWinModal(ctx, modalState.data, screenW, screenH);
    } else if (modalState.type === 'fail') {
      this.renderFailModal(ctx, modalState.data, screenW, screenH);
    } else if (modalState.type === 'settings') {
      this.renderSettingsModal(ctx, modalState.data, screenW, screenH);
    } else if (modalState.type === 'level_select') {
      this.renderLevelSelectModal(ctx, modalState.data, screenW, screenH);
    } else if (modalState.type === 'rules') {
      this.renderRulesModal(ctx, screenW, screenH);
    }
  }

  renderRulesModal(ctx, screenW, screenH) {
    const cx = screenW / 2;
    const cardW = Math.min(340, screenW * 0.9);
    const cardH = 250;
    const cardY = (screenH - cardH) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(255,251,242,0.96)';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2, cardY, cardW, cardH, 22);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7b4b18';
    ctx.font = '800 22px "Fredoka", "Microsoft YaHei", sans-serif';
    ctx.fillText('倒水规则', cx, cardY + 34);
    ctx.fillStyle = '#5b5145';
    ctx.font = '15px "Microsoft YaHei", sans-serif';
    this.wrapText(ctx, '将同色药水倒入空瓶或同色瓶中。', cx, cardY + 82, cardW - 42, 26);
    this.wrapText(ctx, '瓶子装满同色后会自动封存。', cx, cardY + 122, cardW - 42, 26);
    this.wrapText(ctx, '点击瓶子拿起，再点击目标瓶完成倾倒。', cx, cardY + 162, cardW - 42, 26);
    const closeBtn = { id: 'close_modal', x: cx - 70, y: cardY + cardH - 48, w: 140, h: 34 };
    ctx.fillStyle = '#c88022';
    ctx.beginPath();
    ctx.roundRect(closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h, 17);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('知道了', cx, closeBtn.y + 17);
    this.popupButtons.push(closeBtn);
    ctx.restore();
  }

  /**
   * 1. 100% 对标参考图 IMG_6674 的悬浮透光聚光灯庆典层 (白皮书 1.5 规范)
   */
  renderMechanicCeremony(ctx, mechanicKey, screenW, screenH) {
    const info = MECHANIC_INTROS[mechanicKey] || {
      title: '解锁新玩法',
      desc: '探索更多神奇药水与特殊琉璃器皿！',
      tip: '运筹帷幄'
    };

    const cx = screenW / 2;
    const cy = screenH / 2;

    ctx.save();
    // A. 360度旋转聚光灯金芒 (16道放射金芒)
    ctx.save();
    ctx.translate(cx, cy - 30);
    ctx.rotate(this.rayAngle);
    const rayCount = 16;
    for (let i = 0; i < rayCount; i++) {
      ctx.rotate((Math.PI * 2) / rayCount);
      const grad = ctx.createLinearGradient(0, 0, 180, 0);
      grad.addColorStop(0, 'rgba(255, 235, 130, 0.45)');
      grad.addColorStop(1, 'rgba(255, 235, 130, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(180, -16);
      ctx.lineTo(180, 16);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // B. 中央道具高亮展示区光晕
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy - 30, 75, 0, Math.PI * 2);
    ctx.fill();

    // C. 拱起折叠双翼主绶带 (暖金向深橙过渡)
    const ribbonW = Math.min(280, screenW * 0.78);
    const ribbonH = 46;
    const ribbonY = cy - 145;

    const ribbonGrad = ctx.createLinearGradient(cx - ribbonW / 2, ribbonY, cx + ribbonW / 2, ribbonY + ribbonH);
    ribbonGrad.addColorStop(0.0, '#ffd27d');
    ribbonGrad.addColorStop(0.5, '#f89c3e');
    ribbonGrad.addColorStop(1.0, '#e0741e');

    ctx.fillStyle = ribbonGrad;
    ctx.strokeStyle = '#fff5cf';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(cx - ribbonW / 2, ribbonY, ribbonW, ribbonH, 14);
    ctx.fill();
    ctx.stroke();

    // 绶带主标题文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(120, 50, 0, 0.65)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillText('✨ 解锁新玩法 ✨', cx, ribbonY + ribbonH / 2);
    ctx.shadowBlur = 0;

    // D. 底部双层金边米白说明横幅
    const cardW = Math.min(320, screenW * 0.88);
    const cardH = 135;
    const cardY = cy + 70;

    ctx.fillStyle = 'rgba(255, 252, 244, 0.96)';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2, cardY, cardW, cardH, 18);
    ctx.fill();
    ctx.stroke();

    // 机制名称
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(info.title, cx, cardY + 28);

    // 机制说明文字 (自动换行)
    ctx.fillStyle = '#475569';
    ctx.font = '13px sans-serif';
    this.wrapText(ctx, info.desc, cx, cardY + 56, cardW - 32, 18);

    // 重点标签
    if (info.tip) {
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`💡 诀窍：${info.tip}`, cx, cardY + 98);
    }

    // 点击任意位置继续
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '12px sans-serif';
    ctx.fillText('点击任意位置继续', cx, cardY + cardH + 24);

    // 全屏可点击继续按钮
    this.popupButtons.push({
      id: 'dismiss_mechanic',
      x: 0, y: 0, w: screenW, h: screenH
    });

    ctx.restore();
  }

  /**
   * 2. 胜利通关结算弹窗
   */
  renderWinModal(ctx, data, screenW, screenH) {
    const cx = screenW / 2;
    const cy = screenH / 2;
    const cardW = Math.min(310, screenW * 0.85);
    const cardH = 260;
    const cardY = cy - cardH / 2;

    ctx.save();
    // 磨砂玻璃底板
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2, cardY, cardW, cardH, 22);
    ctx.fill();
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 24px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉 完美通关！', cx, cardY + 36);

    // 金星评分 (3颗金星)
    ctx.fillStyle = '#eab308';
    ctx.font = '32px sans-serif';
    ctx.fillText('⭐⭐⭐', cx, cardY + 85);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText(`恭喜完成第 ${data?.levelNum || 1} 关`, cx, cardY + 128);

    // 下一关按钮
    const nextBtnW = cardW - 60;
    const nextBtnH = 46;
    const nextBtnX = cx - nextBtnW / 2;
    const nextBtnY = cardY + cardH - 68;

    const btnGrad = ctx.createLinearGradient(nextBtnX, nextBtnY, nextBtnX, nextBtnY + nextBtnH);
    btnGrad.addColorStop(0, '#22c55e');
    btnGrad.addColorStop(1, '#16a34a');

    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect(nextBtnX, nextBtnY, nextBtnW, nextBtnH, 23);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('进入下一关 ✨', cx, nextBtnY + nextBtnH / 2);

    this.popupButtons.push({
      id: 'next_level',
      x: nextBtnX,
      y: nextBtnY,
      w: nextBtnW,
      h: nextBtnH
    });

    ctx.restore();
  }

  /**
   * 3. 步数耗尽续步/重试弹窗
   */
  renderFailModal(ctx, data, screenW, screenH) {
    const cx = screenW / 2;
    const cy = screenH / 2;
    const cardW = Math.min(300, screenW * 0.85);
    const cardH = 220;
    const cardY = cy - cardH / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏳ 步数已耗尽', cx, cardY + 36);

    ctx.fillStyle = '#475569';
    ctx.font = '14px sans-serif';
    ctx.fillText('是否续步 +5 步继续挑战？', cx, cardY + 75);

    // 续步按钮 (+5步)
    const btnW = cardW - 60;
    const btnH = 42;
    const btnX = cx - btnW / 2;
    const addStepY = cardY + 105;

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(btnX, addStepY, btnW, btnH, 21);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('🎬 免费续 +5 步', cx, addStepY + btnH / 2);
    this.popupButtons.push({ id: 'continue_moves', x: btnX, y: addStepY, w: btnW, h: btnH });

    // 重玩按钮
    const retryY = cardY + 158;
    ctx.fillStyle = 'rgba(100, 116, 139, 0.15)';
    ctx.beginPath();
    ctx.roundRect(btnX, retryY, btnW, btnH * 0.85, 18);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.font = '14px sans-serif';
    ctx.fillText('重新挑战 ↻', cx, retryY + (btnH * 0.85) / 2);
    this.popupButtons.push({ id: 'retry_level', x: btnX, y: retryY, w: btnW, h: btnH * 0.85 });

    ctx.restore();
  }

  /**
   * 4. 设置弹窗
   */
  renderSettingsModal(ctx, data, screenW, screenH) {
    const cx = screenW / 2;
    const cy = screenH / 2;
    const cardW = Math.min(290, screenW * 0.85);
    const cardH = 240;
    const cardY = cy - cardH / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚙️ 游戏设置', cx, cardY + 32);

    // 音效开关
    const soundY = cardY + 75;
    ctx.fillStyle = '#334155';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('温润 ASMR 音效', cx - cardW / 2 + 30, soundY);

    const soundToggle = { id: 'toggle_sound', x: cx + cardW / 2 - 65, y: soundY - 14, w: 42, h: 26 };
    ctx.fillStyle = data?.sound ? '#22c55e' : '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(soundToggle.x, soundToggle.y, soundToggle.w, soundToggle.h, 13);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(data?.sound ? soundToggle.x + 28 : soundToggle.x + 14, soundToggle.y + 13, 10, 0, Math.PI * 2);
    ctx.fill();
    this.popupButtons.push(soundToggle);

    // 重新开始按钮
    const restartBtn = { id: 'restart_current', x: cx - (cardW - 60) / 2, y: cardY + 125, w: cardW - 60, h: 40 };
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 20);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('重新开始本关 ↻', cx, restartBtn.y + 20);
    this.popupButtons.push(restartBtn);

    // 关闭按钮
    const closeBtn = { id: 'close_modal', x: cx - (cardW - 60) / 2, y: cardY + 175, w: cardW - 60, h: 40 };
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('继续游戏', cx, closeBtn.y + 20);
    this.popupButtons.push(closeBtn);

    ctx.restore();
  }

  /**
   * 5. 选关面板网格
   */
  renderLevelSelectModal(ctx, data, screenW, screenH) {
    const cx = screenW / 2;
    const cy = screenH / 2;
    const cardW = Math.min(340, screenW * 0.92);
    const cardH = 380;
    const cardY = cy - cardH / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗺️ 选择关卡 (200关典藏)', cx, cardY + 28);

    // 绘制前 20 关供快速选择测试
    const cols = 5;
    const rows = 4;
    const gridStartX = cx - cardW / 2 + 20;
    const gridStartY = cardY + 60;
    const btnSize = (cardW - 40 - 12 * (cols - 1)) / cols;

    for (let i = 0; i < cols * rows; i++) {
      const lv = i + 1;
      const r = Math.floor(i / cols);
      const c = i % cols;
      const bx = gridStartX + c * (btnSize + 12);
      const by = gridStartY + r * (btnSize + 12);

      const isCurrent = lv === data?.currentLevel;
      ctx.fillStyle = isCurrent ? '#2563eb' : 'rgba(226, 232, 240, 0.85)';
      ctx.beginPath();
      ctx.roundRect(bx, by, btnSize, btnSize, 10);
      ctx.fill();

      ctx.fillStyle = isCurrent ? '#ffffff' : '#334155';
      ctx.font = 'bold 15px "Fredoka", sans-serif';
      ctx.fillText(`${lv}`, bx + btnSize / 2, by + btnSize / 2);

      this.popupButtons.push({
        id: `select_level_${lv}`,
        levelNum: lv,
        x: bx, y: by, w: btnSize, h: btnSize
      });
    }

    // 关闭按钮
    const closeBtn = { id: 'close_modal', x: cx - 60, y: cardY + cardH - 45, w: 120, h: 34 };
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.roundRect(closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h, 17);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText('关闭', cx, closeBtn.y + 17);
    this.popupButtons.push(closeBtn);

    ctx.restore();
  }

  /**
   * 弹窗内触控命中检测
   */
  hitTest(touchX, touchY) {
    for (let i = this.popupButtons.length - 1; i >= 0; i--) {
      const btn = this.popupButtons[i];
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

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split('');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }
}
