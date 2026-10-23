/**
 * 跨平台环境适配层 (微信小游戏 wx / 抖音小游戏 tt / 浏览器 Web)
 */
const isWx = typeof wx !== 'undefined' && typeof wx.createCanvas === 'function';
const isTt = typeof tt !== 'undefined' && typeof tt.createCanvas === 'function';
const envType = isWx ? 'wx' : (isTt ? 'tt' : 'web');

export function installRoundRectPolyfill(ctx) {
  if (ctx && typeof ctx.roundRect !== 'function') {
    ctx.roundRect = function(x, y, w, h, radii = 0) {
      let r = [0, 0, 0, 0];
      if (typeof radii === 'number') {
        r = [radii, radii, radii, radii];
      } else if (Array.isArray(radii)) {
        if (radii.length === 1) r = [radii[0], radii[0], radii[0], radii[0]];
        else if (radii.length === 2) r = [radii[0], radii[1], radii[0], radii[1]];
        else if (radii.length === 3) r = [radii[0], radii[1], radii[2], radii[1]];
        else if (radii.length >= 4) r = [radii[0], radii[1], radii[2], radii[3]];
      }
      const [rTL, rTR, rBR, rBL] = r;
      this.moveTo(x + rTL, y);
      this.lineTo(x + w - rTR, y);
      this.arcTo(x + w, y, x + w, y + rTR, rTR);
      this.lineTo(x + w, y + h - rBR);
      this.arcTo(x + w, y + h, x + w - rBR, y + h, rBR);
      this.lineTo(x + rBL, y + h);
      this.arcTo(x, y + h, x, y + h - rBL, rBL);
      this.lineTo(x, y + rTL);
      this.arcTo(x, y, x + rTL, y, rTL);
      this.closePath();
      return this;
    };
  }
}

export const Platform = {
  env: envType,

  /**
   * 创建主屏 Canvas
   */
  createCanvas() {
    let c = null;
    if (isWx) c = wx.createCanvas();
    else if (isTt) c = tt.createCanvas();
    else {
      c = document.getElementById('game-canvas');
      if (!c) {
        c = document.createElement('canvas');
        c.id = 'game-canvas';
        document.body.appendChild(c);
      }
    }
    const ctx = c.getContext('2d');
    installRoundRectPolyfill(ctx);
    return c;
  },

  /**
   * 创建离屏 Canvas (用于预渲染静态纹理、徽章与背景)
   */
  createOffscreenCanvas(width = 300, height = 300) {
    if (isWx && typeof wx.createOffscreenCanvas === 'function') {
      return wx.createOffscreenCanvas({ type: '2d', width, height });
    }
    if (isTt && typeof tt.createOffscreenCanvas === 'function') {
      return tt.createOffscreenCanvas({ type: '2d', width, height });
    }
    const oc = document.createElement('canvas');
    oc.width = width;
    oc.height = height;
    return oc;
  },

  /**
   * 获取系统与屏幕信息
   */
  getSystemInfo() {
    if (isWx) {
      const info = wx.getSystemInfoSync();
      return {
        windowWidth: info.windowWidth,
        windowHeight: info.windowHeight,
        pixelRatio: info.pixelRatio || 1,
        safeArea: info.safeArea || { top: 0, bottom: info.windowHeight }
      };
    }
    if (isTt) {
      const info = tt.getSystemInfoSync();
      return {
        windowWidth: info.windowWidth,
        windowHeight: info.windowHeight,
        pixelRatio: info.pixelRatio || 1,
        safeArea: info.safeArea || { top: 0, bottom: info.windowHeight }
      };
    }
    return {
      windowWidth: window.innerWidth || 375,
      windowHeight: window.innerHeight || 667,
      pixelRatio: window.devicePixelRatio || 1,
      safeArea: { top: 0, bottom: window.innerHeight || 667 }
    };
  },

  /**
   * 创建 Web Audio 上下文 (微信原生支持标准 WebAudio)
   */
  createAudioContext() {
    if (isWx && typeof wx.createWebAudioContext === 'function') {
      return wx.createWebAudioContext();
    }
    if (isTt && typeof tt.createWebAudioContext === 'function') {
      return tt.createWebAudioContext();
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    return AudioCtx ? new AudioCtx() : null;
  },

  /**
   * 本地数据读取
   */
  getStorageSync(key, defaultValue = null) {
    try {
      if (isWx) {
        const val = wx.getStorageSync(key);
        return val === '' || val === undefined ? defaultValue : val;
      }
      if (isTt) {
        const val = tt.getStorageSync(key);
        return val === '' || val === undefined ? defaultValue : val;
      }
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  /**
   * 本地数据存储
   */
  setStorageSync(key, val) {
    try {
      if (isWx) {
        wx.setStorageSync(key, val);
        return;
      }
      if (isTt) {
        tt.setStorageSync(key, val);
        return;
      }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      // 容错处理
    }
  },

  /**
   * 轻微触感震动反馈
   */
  vibrateShort() {
    try {
      if (isWx) {
        wx.vibrateShort({ type: 'light' });
      } else if (isTt) {
        tt.vibrateShort({ style: 'light' });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch (e) {
      // 静默降级
    }
  },

  /**
   * 获取微信右上角胶囊按钮位置 (用于规避UI遮挡)
   */
  getMenuButtonBoundingClientRect() {
    if (isWx && typeof wx.getMenuButtonBoundingClientRect === 'function') {
      try {
        const rect = wx.getMenuButtonBoundingClientRect();
        if (rect && typeof rect.top === 'number' && rect.top > 0 && typeof rect.height === 'number' && rect.height > 0) {
          return rect;
        }
      } catch (e) {}
    }
    return null;
  },

  /**
   * 监听触摸/点击事件，统一提取并标准化 clientX / clientY
   */
  onTouchStart(cb) {
    const extractAndCall = (e) => {
      const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
      const x = touch.clientX !== undefined ? touch.clientX : (touch.x !== undefined ? touch.x : (touch.pageX || 0));
      const y = touch.clientY !== undefined ? touch.clientY : (touch.y !== undefined ? touch.y : (touch.pageY || 0));
      cb({ clientX: x, clientY: y, x, y, originalEvent: e });
    };

    if (isWx) {
      wx.onTouchStart(extractAndCall);
    } else if (isTt) {
      tt.onTouchStart(extractAndCall);
    } else {
      window.addEventListener('touchstart', extractAndCall, { passive: false });
      window.addEventListener('mousedown', extractAndCall);
    }
  },

  onTouchMove(cb) {
    const extractAndCall = (e) => {
      const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
      const x = touch.clientX !== undefined ? touch.clientX : (touch.x !== undefined ? touch.x : (touch.pageX || 0));
      const y = touch.clientY !== undefined ? touch.clientY : (touch.y !== undefined ? touch.y : (touch.pageY || 0));
      cb({ clientX: x, clientY: y, x, y, originalEvent: e });
    };

    if (isWx) wx.onTouchMove(extractAndCall);
    else if (isTt) tt.onTouchMove(extractAndCall);
    else window.addEventListener('touchmove', extractAndCall, { passive: false });
  },

  onTouchEnd(cb) {
    const extractAndCall = (e) => {
      const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || e;
      const x = touch.clientX !== undefined ? touch.clientX : (touch.x !== undefined ? touch.x : (touch.pageX || 0));
      const y = touch.clientY !== undefined ? touch.clientY : (touch.y !== undefined ? touch.y : (touch.pageY || 0));
      cb({ clientX: x, clientY: y, x, y, originalEvent: e });
    };

    if (isWx) wx.onTouchEnd(extractAndCall);
    else if (isTt) tt.onTouchEnd(extractAndCall);
    else window.addEventListener('touchend', extractAndCall);
  }
};
