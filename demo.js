/**
 * demo.js — 粒子网络完整演示入口。
 * 负责将所有模块（粒子系统、交互、性能监控、预设）串联在一起，
 * 并提供运行时预设切换 UI 与键盘快捷键。
 * 加载顺序要求：utils.js → config.js → particles.js → interaction.js
 *               → performance-monitor.js → presets.js → demo.js
 */
(function () {
  'use strict';

  var DEFAULT_PRESET = 'aurora';

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function ensureCanvas() {
    var canvas = document.getElementById('particle-canvas');
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    canvas.id = 'particle-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100%', height: '100%', display: 'block', zIndex: '0'
    });
    document.body.appendChild(canvas);
    return canvas;
  }

  function createPresetBar(ps) {
    if (!window.ParticlePresets) return null;
    var names = window.ParticlePresets.list();
    if (!names.length) return null;

    var bar = document.createElement('div');
    bar.id = 'preset-bar';
    Object.assign(bar.style, {
      position: 'fixed', bottom: '16px', left: '50%',
      transform: 'translateX(-50%)', display: 'flex', gap: '8px',
      padding: '8px 12px', background: 'rgba(10, 10, 18, 0.72)',
      border: '1px solid rgba(100, 180, 255, 0.18)', borderRadius: '10px',
      backdropFilter: 'blur(6px)', zIndex: '20',
      fontFamily: 'monospace', fontSize: '13px'
    });

    names.forEach(function (name) {
      var preset = window.ParticlePresets.get(name);
      if (!preset) return;
      var btn = document.createElement('button');
      btn.textContent = preset.label || name;
      Object.assign(btn.style, {
        padding: '4px 10px', border: '1px solid rgba(100, 180, 255, 0.3)',
        borderRadius: '6px', background: 'rgba(100, 180, 255, 0.1)',
        color: '#9cf', cursor: 'pointer', font: 'inherit',
        transition: 'background 0.2s, color 0.2s'
      });
      btn.addEventListener('mouseenter', function () {
        btn.style.background = 'rgba(100, 180, 255, 0.25)';
        btn.style.color = '#fff';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.background = 'rgba(100, 180, 255, 0.1)';
        btn.style.color = '#9cf';
      });
      btn.addEventListener('click', function () {
        window.ParticlePresets.apply(ps, name);
      });
      bar.appendChild(btn);
    });

    var hint = document.createElement('span');
    hint.textContent = '| 按 C 键切换预设';
    hint.style.cssText = 'color:rgba(150,170,200,0.6);margin-left:4px;font-size:12px';
    bar.appendChild(hint);
    document.body.appendChild(bar);
    return bar;
  }

  function init() {
    var canvas = ensureCanvas();
    var userConfig = window.PARTICLE_CONFIG || {};
    var ps = new window.ParticleSystem(canvas, userConfig);

    if (window.ParticlePresets) {
      window.ParticlePresets.apply(ps, DEFAULT_PRESET, { recolor: true, resize: true });
    }
    if (typeof window.initInteraction === 'function') {
      window.initInteraction(ps);
    }
    if (typeof window.initPerformanceMonitor === 'function') {
      window.initPerformanceMonitor(ps);
    }

    createPresetBar(ps);

    window.addEventListener('keydown', function (e) {
      if ((e.key === 'c' || e.key === 'C') && window.ParticlePresets) {
        var next = window.ParticlePresets.cycle(ps);
        if (next) console.log('[demo] 预设已切换至:', next);
      }
    });

    ps.start();
    window.__particleDemo = ps;
  }

  onReady(init);
})();
