/**
 * utils.js
 * 无依赖工具层：数学、颜色、DOM、事件总线。
 * 供 particles.js / interaction.js / performance-monitor.js 共享使用。
 */
(function (global) {
  'use strict';

  /* ---------------- 数学 ---------------- */

  const MathUtils = {
    clamp(v, min, max) {
      return v < min ? min : v > max ? max : v;
    },

    lerp(a, b, t) {
      return a + (b - a) * t;
    },

    /** 把 v 从 [inMin,inMax] 线性映射到 [outMin,outMax]，并夹紧 */
    map(v, inMin, inMax, outMin, outMax) {
      if (inMax === inMin) return outMin;
      const t = MathUtils.clamp((v - inMin) / (inMax - inMin), 0, 1);
      return outMin + t * (outMax - outMin);
    },

    /** 平滑步进，用于淡入淡出 */
    smoothstep(edge0, edge1, x) {
      const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    },

    randFloat(min, max) {
      return min + Math.random() * (max - min);
    },

    randInt(min, max) {
      return Math.floor(MathUtils.randFloat(min, max + 1));
    },

    /** 从数组中随机取一个元素 */
    pick(arr) {
      return arr[MathUtils.randInt(0, arr.length - 1)];
    },

    dist(x1, y1, x2, y2) {
      return Math.hypot(x2 - x1, y2 - y1);
    },

    /** 距离平方，避免开方，用于粒子连线的阈值比较 */
    distSq(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return dx * dx + dy * dy;
    },

    /** 角度归一化到 [0, 2PI) */
    normalizeAngle(a) {
      a %= Math.PI * 2;
      return a < 0 ? a + Math.PI * 2 : a;
    }
  };

  /* ---------------- 颜色 ---------------- */

  const ColorUtils = {
    /** hsl: h[0,360], s[0,100], l[0,100] -> {r,g,b} 0-255 */
    hslToRgb(h, s, l) {
      h = ((h % 360) + 360) % 360;
      s /= 100;
      l /= 100;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;
      if (h < 60) [r, g, b] = [c, x, 0];
      else if (h < 120) [r, g, b] = [x, c, 0];
      else if (h < 180) [r, g, b] = [0, c, x];
      else if (h < 240) [r, g, b] = [0, x, c];
      else if (h < 300) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
      };
    },

    /** #rgb / #rrggbb -> {r,g,b}；失败返回 null */
    hexToRgb(hex) {
      if (typeof hex !== 'string') return null;
      let h = hex.replace('#', '').trim();
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
      const n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    },

    rgba(r, g, b, a) {
      return `rgba(${r},${g},${b},${a})`;
    }
  };

  /* ---------------- DOM / Canvas ---------------- */

  const DomUtils = {
    /** 把 canvas 的像素尺寸同步为 CSS 尺寸 * dpr，返回 ctx */
    fitCanvas(canvas, ctx) {
      const dpr = global.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width: rect.width, height: rect.height, dpr };
    },

    /** 获取鼠标在 canvas 坐标系（CSS 像素）中的位置 */
    getPointer(canvas, evt) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
      };
    }
  };

  /* ---------------- 事件总线 ---------------- */

  class EventBus {
    constructor() {
      this._map = new Map();
    }
    on(type, fn) {
      if (!this._map.has(type)) this._map.set(type, new Set());
      this._map.get(type).add(fn);
      return () => this.off(type, fn);
    }
    off(type, fn) {
      const set = this._map.get(type);
      if (set) set.delete(fn);
    }
    once(type, fn) {
      const off = this.on(type, (payload) => {
        off();
        fn(payload);
      });
      return off;
    }
    emit(type, payload) {
      const set = this._map.get(type);
      if (!set) return;
      // 复制一份，避免回调中增删订阅导致迭代异常
      for (const fn of Array.from(set)) {
        try { fn(payload); }
        catch (e) { console.error(`[EventBus] handler error on "${type}":`, e); }
      }
    }
    clear(type) {
      if (type) this._map.delete(type);
      else this._map.clear();
    }
  }

  /* ---------------- 节流 / 防抖 ---------------- */

  function throttle(fn, wait) {
    let last = 0, timer = null, lastArgs = null;
    return function throttled(...args) {
      const now = Date.now();
      lastArgs = args;
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          last = Date.now();
          fn.apply(this, lastArgs);
        }, wait - (now - last));
      }
    };
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* ---------------- 导出 ---------------- */

  const Utils = {
    math: MathUtils,
    color: ColorUtils,
    dom: DomUtils,
    EventBus,
    throttle,
    debounce,
    /** 全局默认总线，各模块可直接用，也可各自 new EventBus() */
    bus: new EventBus()
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
  }
  global.Utils = Utils;
})(typeof window !== 'undefined' ? window : globalThis);
