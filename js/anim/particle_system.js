/**
 * 高性能对象池化粒子系统 (星尘微粒、水花气泡、满瓶庆典礼花、碎冰消散)
 */
export class ParticleSystem {
  constructor(maxParticles = 300) {
    this.maxParticles = maxParticles;
    this.pool = [];
    this.active = [];

    // 初始化粒子池
    for (let i = 0; i < maxParticles; i++) {
      this.pool.push({
        x: 0, y: 0,
        vx: 0, vy: 0,
        r: 2,
        color: '#ffffff',
        alpha: 1,
        life: 0,
        maxLife: 1,
        type: 'dust', // 'dust' | 'splash' | 'bubble' | 'star' | 'ice'
        rotation: 0,
        rotSpeed: 0
      });
    }

    // 默认背景浮游星尘微粒
    this.bgDust = [];
    for (let i = 0; i < 28; i++) {
      this.bgDust.push({
        x: Math.random(),
        y: Math.random(),
        r: 1.2 + Math.random() * 2.2,
        alpha: 0.2 + Math.random() * 0.5,
        speedY: -0.00015 - Math.random() * 0.00025,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  spawn(options) {
    if (this.pool.length === 0) return;
    const p = this.pool.pop();
    p.x = options.x || 0;
    p.y = options.y || 0;
    p.vx = options.vx || 0;
    p.vy = options.vy || 0;
    p.r = options.r || 3;
    p.color = options.color || '#ffd700';
    p.alpha = options.alpha !== undefined ? options.alpha : 1;
    p.life = 0;
    p.maxLife = options.maxLife || 0.6;
    p.type = options.type || 'dust';
    p.rotation = Math.random() * Math.PI * 2;
    p.rotSpeed = (Math.random() - 0.5) * 6;

    this.active.push(p);
  }

  /**
   * 爆发水花与气泡 (倒水流入瓶口时)
   */
  emitSplash(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const speed = 40 + Math.random() * 90;
      this.spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.8 + Math.random() * 2.2,
        color,
        maxLife: 0.35 + Math.random() * 0.25,
        type: 'splash'
      });
    }
  }

  /**
   * 爆发满瓶落塞金星礼花
   */
  emitCelebrationStars(cx, cy, count = 24) {
    const starColors = ['#fde047', '#f59e0b', '#ffffff', '#38bdf8', '#ec4899'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      const col = starColors[Math.floor(Math.random() * starColors.length)];
      this.spawn({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 3 + Math.random() * 3.5,
        color: col,
        maxLife: 0.6 + Math.random() * 0.4,
        type: 'star'
      });
    }
  }

  /**
   * 爆发冰晶消融碎片
   */
  emitIceShatter(cx, cy, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      this.spawn({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2.5 + Math.random() * 2.5,
        color: '#bae6fd',
        maxLife: 0.5 + Math.random() * 0.3,
        type: 'ice'
      });
    }
  }

  update(dt) {
    // 1. 更新背景环境金光微粒
    this.bgDust.forEach(d => {
      d.y += d.speedY * dt * 1000;
      if (d.y < 0) d.y = 1;
      d.phase += dt * 2;
    });

    // 2. 更新动态爆发粒子
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.active.splice(i, 1);
        this.pool.push(p);
        continue;
      }

      // 重力加速度
      if (p.type === 'splash' || p.type === 'star' || p.type === 'ice') {
        p.vy += 220 * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotSpeed * dt;

      // 线性衰减
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    }
  }

  render(ctx, screenWidth, screenHeight) {
    // 1. 渲染背景星尘
    ctx.save();
    this.bgDust.forEach(d => {
      const px = d.x * screenWidth;
      const py = d.y * screenHeight;
      const dynamicAlpha = d.alpha * (0.6 + 0.4 * Math.sin(d.phase));
      ctx.fillStyle = `rgba(255, 235, 160, ${dynamicAlpha})`;
      ctx.beginPath();
      ctx.arc(px, py, d.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. 渲染动态活跃粒子
    this.active.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'star') {
        this.drawTinyStar(ctx, 0, 0, 5, p.r, p.r * 0.45);
      } else if (p.type === 'ice') {
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    ctx.restore();
  }

  drawTinyStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
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
    ctx.fill();
  }
}
