/**
 * demo.js — 粒子网络演示入口（v3 修复版）
 * 修复：
 *  - canvas 被 particles.js 用 clientWidth=300 的默认值钉成 300x150 并覆盖内联样式，
 *    这里改用 style.setProperty(..., 'important') 强制全屏，并 rAF 双帧后重设像素尺寸
 *  - 尺寸变化时主动通知 ps.resize / setSize / onResize
 *  - 保留 v2 的所有防御性能力（模块缺失自动降级）
 */
(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }

  function callMethod(obj, names, args, label) {
    if (!obj) return false;
    for (var i = 0; i < names.length; i++) {
      var fn = obj[names[i]];
      if (typeof fn === 'function') {
        try { fn.apply(obj, args || []); return true; }
        catch (e) { console.warn('[demo] ' + label + '.' + names[i] + ' 失败:', e); }
      }
    }
    return false;
  }

  function callGlobal(names, args, label) {
    for (var i = 0; i < names.length; i++) {
      var fn = window[names[i]];
      if (typeof fn === 'function') {
        try { fn.apply(null, args || []); return true; }
        catch (e) { console.warn('[demo] ' + label + ' 失败:', e); }
      }
    }
    return false;
  }

  /* --------------- 强制 canvas 铺满视口（关键修复） ---------------- */

  function forceFullscreenStyle(canvas) {
    var s = canvas.style;
    // 用 !important 覆盖 particles.js 写入的普通内联样式
    s.setProperty('position', 'fixed', 'important');
    s.setProperty('top', '0', 'important');
    s.setProperty('left', '0', 'important');
    s.setProperty('right', 'auto', 'important');
    s.setProperty('bottom', 'auto', 'important');
    s.setProperty('width', '100vw', 'important');
    s.setProperty('height', '100vh', 'important');
    s.setProperty('display', 'block', 'important');
    s.setProperty('z-index', '0', 'important');
    s.setProperty('margin', '0', 'important');
    s.setProperty('padding', '0', 'important');
    s.setProperty('border', '0', 'important');
    s.setProperty('background', 'transparent', 'important');
  }

  function fitCanvas(canvas, ps) {
    forceFullscreenStyle(canvas);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    var pw = Math.max(1, Math.round(w * dpr));
    var ph = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    // 通知粒子系统重新计算内部坐标
    callMethod(ps, ['resize', 'setSize', 'setDimensions', 'onResize'],
               [w, h], 'ps');
    callMethod(ps, ['resize', 'setSize', 'setDimensions', 'onResize'],
               [{ width: w, height: h, dpr: dpr }], 'ps');
    // 兼容某些实现需要传 canvas 本身
    callMethod(ps, ['resize', 'setSize'], [canvas, w, h], 'ps');
  }

  /* ------------------------- 内置回退系统 ------------------------- */

  function createFallbackSystem(canvas, cfg) {
    var ctx = canvas.getContext('2d');
    var particles = [];
    var count = (cfg && (cfg.particleCount || cfg.count)) || 80;
    var connectDist = (cfg && cfg.connectDistance) || 120;
    var raf = null, running = false, W = 0, H = 0;

    function measure() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      if (canvas.width !== Math.round(W * dpr) ||
          canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      particles.length = 0;
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: 1 + Math.random() * 1.6
        });
      }
    }

    function step() {
      measure();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(120, 180, 255, 0.9)';
      ctx.strokeStyle = 'rgba(120, 180, 255, 0.12)';
      ctx.lineWidth = 1;
      var i, j, p, a, b, dx, dy, d2, max2 = connectDist * connectDist;
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        else if (p.x > W) { p.x = W; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        else if (p.y > H) { p.y = H; p.vy = -Math.abs(p.vy); }
      }
      for (i = 0; i < particles.length; i++) {
        a = particles[i];
        for (j = i + 1; j < particles.length; j++) {
          b = particles[j];
          dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
          if (d2 < max2) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      if (running) raf = requestAnimationFrame(step);
    }

    return {
      isFallback: true,
      start: function () { if (!running) { running = true; raf = requestAnimationFrame(step); } },
      stop:  function () { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } },
      resize: function () { measure(); spawn(); }
    };
  }

  /* ------------------------- 预设（探测式） ------------------------ */

  function collectPresetNames(P) {
    try {
      if (typeof P.list === 'function') {
        var r = P.list();
        if (Array.isArray(r)) return r;
        if (r && typeof r === 'object') return Object.keys(r);
      }
      if (Array.isArray(P.names)) return P.names.slice();
      if (P.presets && typeof P.presets === 'object') return Object.keys(P.presets);
      if (P.all && typeof P.all === 'object') return Object.keys(P.all);
    } catch (e) {}
    return [];
  }

  function applyPreset(P, name, ps) {
    var methods = ['apply', 'use', 'set', 'activate', 'select', 'load'];
    for (var i = 0; i < methods.length; i++) {
      if (typeof P[methods[i]] !== 'function') continue;
      var fn = P[methods[i]];
      var argSets = [[ps, name], [name, ps], [name], [ps, { name: name }]];
      for (var k = 0; k < argSets.length; k++) {
        try { fn.apply(P, argSets[k]); return true; } catch (e) {}
      }
    }
    return false;
  }

  function buildPresetBar(ps) {
    var P = window.ParticlePresets;
    if (!P) return;
    var names = collectPresetNames(P);
    if (!names.length) return;

    var bar = document.createElement('div');
    bar.id = 'preset-bar';
    bar.style.cssText =
      'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);' +
      'display:flex;gap:8px;padding:8px 12px;background:rgba(10,10,18,.72);' +
      'border:1px solid rgba(100,180,255,.18);border-radius:10px;' +
      'backdrop-filter:blur(6px);z-index:20;font:13px/1 monospace;';

    names.forEach(function (name) {
      var btn = document.createElement('button');
      var meta = null;
      try {
        if (typeof P.get === 'function') meta = P.get(name);
        else if (P.presets) meta = P.presets[name];
        else if (P.all) meta = P.all[name];
      } catch (e) {}
      btn.textContent = (meta && (meta.label || meta.name)) || name;
      btn.style.cssText =
        'padding:4px 10px;border:1px solid rgba(100,180,255,.3);border-radius:6px;' +
        'background:rgba(100,180,255,.1);color:#9cf;cursor:pointer;font:inherit;';
      btn.addEventListener('click', function () { applyPreset(P, name, ps); });
      bar.appendChild(btn);
    });
    document.body.appendChild(bar);
  }

  /* ------------------------------- 主流程 ------------------------------ */

  function init() {
    // 优先使用页面里的 canvas；没有就创建一个
    var canvas = document.getElementById('particle-canvas');
    if (!(canvas && canvas.tagName === 'CANVAS')) {
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = document.createElement('canvas');
      canvas.id = 'particle-canvas';
      document.body.appendChild(canvas);
    }

    // ★ 关键：在构造 ps 之前，就把 canvas 钉成全屏
    forceFullscreenStyle(canvas);

    var cfg = window.PARTICLE_CONFIG || {};

    // 实例化粒子系统
    var ps = null;
    var Ctor = window.ParticleSystem || window.Particles || window.ParticleEngine;
    if (typeof Ctor === 'function') {
      try { ps = new Ctor(canvas, cfg); }
      catch (e) {
        console.warn('[demo] ParticleSystem 构造失败，降级到内置实现:', e);
        ps = null;
      }
    }
    if (!ps) ps = createFallbackSystem(canvas, cfg);

    // ★ 构造完之后，再强制一次样式（覆盖 ps 可能写入的内联样式）
    forceFullscreenStyle(canvas);

    // 预设
    if (window.ParticlePresets) {
      var names = collectPresetNames(window.ParticlePresets);
      var defaultName = (cfg && cfg.defaultPreset) || (names.length ? names[0] : null);
      if (defaultName) applyPreset(window.ParticlePresets, defaultName, ps);
      buildPresetBar(ps);
    }

    // 交互 / 性能监控
    callGlobal(['initInteraction', 'initParticleInteraction'], [ps], 'interaction');
    callMethod(window.ParticleInteraction, ['init', 'attach', 'enable'], [ps], 'interaction');
    callGlobal(['initPerformanceMonitor'], [ps], 'performance');
    callMethod(window.PerformanceMonitor, ['init', 'attach', 'start'], [ps], 'performance');

    // 启动
    var started = callMethod(ps, ['start', 'run', 'resume', 'play'], [], 'ps');
    if (!started && ps.isFallback) ps.start();

    // ★ 布局稳定后再修正尺寸：双 rAF + 一次 setTimeout 兜底
    requestAnimationFrame(function () {
      fitCanvas(canvas, ps);
      requestAnimationFrame(function () { fitCanvas(canvas, ps); });
    });
    setTimeout(function () { fitCanvas(canvas, ps); }, 100);
    setTimeout(function () { fitCanvas(canvas, ps); }, 500);

    // 后续窗口变化
    var rT = null;
    window.addEventListener('resize', function () {
      if (rT) cancelAnimationFrame(rT);
      rT = requestAnimationFrame(function () { fitCanvas(canvas, ps); });
    });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () { fitCanvas(canvas, ps); }, 200);
    });

    window.__particleDemo = ps;
  }

  onReady(function () {
    try { init(); }
    catch (e) { console.error('[demo] 初始化异常:', e); }
  });
})();
