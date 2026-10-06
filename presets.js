/**
 * presets.js — 粒子网络视觉主题预设。
 * 提供多套参数组合，可通过 applyPreset() 一键切换粒子系统的外观与行为。
 * 依赖：window.ParticleSystem 实例（由 particles.js 暴露）。
 * 用法：
 *   applyPreset(psInstance, 'aurora');
 *   applyPreset(psInstance, 'nebula');
 *   applyPreset(psInstance, 'matrix');
 */

(function (global) {
  'use strict';

  /* ----------------------------------------------------------------
   *  预设定义
   *  每个预设包含：粒子数量、连线距离、最大连接数、颜色、速度等。
   * ---------------------------------------------------------------- */
  var PRESETS = {
    /* 极光：冷色系，密集连线，缓慢流动 */
    aurora: {
      label: '极光',
      count: 220,
      connectDistance: 130,
      maxConnections: 3,
      backgroundColor: '#080c14',
      lineColor: 'rgba(80, 200, 255, 0.10)',
      speed: 0.85,
      particleColor: function () {
        return 'hsl(' + (180 + Math.random() * 40) + ', 75%, 68%)';
      }
    },

    /* 星云：暖紫系，稀疏大粒子，慢速漂移 */
    nebula: {
      label: '星云',
      count: 140,
      connectDistance: 160,
      maxConnections: 2,
      backgroundColor: '#0c0812',
      lineColor: 'rgba(200, 120, 255, 0.08)',
      speed: 0.55,
      particleColor: function () {
        return 'hsl(' + (270 + Math.random() * 40) + ', 65%, 70%)';
      }
    },

    /* 矩阵：经典绿，快速短线，高密度 */
    matrix: {
      label: '矩阵',
      count: 260,
      connectDistance: 90,
      maxConnections: 4,
      backgroundColor: '#050a05',
      lineColor: 'rgba(60, 255, 120, 0.14)',
      speed: 1.4,
      particleColor: function () {
        return 'hsl(' + (120 + Math.random() * 30) + ', 85%, 62%)';
      }
    },

    /* 日落：橙红渐变，中等密度，温暖 */
    sunset: {
      label: '日落',
      count: 180,
      connectDistance: 110,
      maxConnections: 3,
      backgroundColor: '#140a06',
      lineColor: 'rgba(255, 140, 60, 0.10)',
      speed: 0.9,
      particleColor: function () {
        var h = 15 + Math.random() * 35;
        return 'hsl(' + h + ', 80%, 65%)';
      }
    },

    /* 深海：深蓝青，极慢速，连线极淡 */
    abyss: {
      label: '深海',
      count: 200,
      connectDistance: 140,
      maxConnections: 2,
      backgroundColor: '#040810',
      lineColor: 'rgba(40, 120, 200, 0.06)',
      speed: 0.4,
      particleColor: function () {
        return 'hsl(' + (200 + Math.random() * 30) + ', 60%, 55%)';
      }
    }
  };

  /* ----------------------------------------------------------------
   *  内部工具
   * ---------------------------------------------------------------- */

  /** 获取预设名称列表 */
  function listPresets() {
    return Object.keys(PRESETS);
  }

  /** 按名称获取预设对象；不存在时返回 null */
  function getPreset(name) {
    return PRESETS[name] || null;
  }

  /** 重置单个粒子的视觉属性（颜色、透明度基准等） */
  function recolorParticles(ps, preset) {
    if (!ps || !ps.particles) return;
    var colorFn = preset.particleColor;
    for (var i = 0; i < ps.particles.length; i++) {
      var p = ps.particles[i];
      if (colorFn) {
        p.color = colorFn();
      }
      /* 微调透明度基准，让不同主题观感差异更明显 */
      p.baseAlpha = 0.2 + Math.random() * 0.5;
      p.alpha = p.baseAlpha * Math.min(1, p.life * 3);
    }
  }

  /** 调整粒子数量（增加或减少），保持画布尺寸兼容 */
  function resizeParticlePool(ps, targetCount) {
    if (!ps || !ps.particles) return;
    var current = ps.particles.length;
    if (targetCount === current) return;

    if (targetCount < current) {
      ps.particles.length = targetCount;
      return;
    }

    var ParticleCtor = ps.particles[0] ? ps.particles[0].constructor : null;
    if (!ParticleCtor) return;
    for (var i = current; i < targetCount; i++) {
      ps.particles.push(new ParticleCtor(ps.canvas));
    }
  }

  /* ----------------------------------------------------------------
   *  公开 API
   * ---------------------------------------------------------------- */

  /**
   * 将预设应用到粒子系统实例。
   * @param {ParticleSystem} ps  - 粒子系统实例
   * @param {string}          name - 预设名称（aurora / nebula / matrix / sunset / abyss）
   * @param {Object}          [opts]
   * @param {boolean}         [opts.recolor=true]   - 是否重新着色粒子
   * @param {boolean}         [opts.resize=true]    - 是否调整粒子数量
   * @returns {boolean} 是否成功应用
   */
  function applyPreset(ps, name, opts) {
    var preset = PRESETS[name];
    if (!ps || !preset) return false;

    opts = opts || {};
    var doRecolor = opts.recolor !== false;
    var doResize = opts.resize !== false;

    /* 1. 更新配置 */
    ps.config.count = preset.count;
    ps.config.connectDistance = preset.connectDistance;
    ps.config.maxConnections = preset.maxConnections;
    ps.config.backgroundColor = preset.backgroundColor;
    ps.config.lineColor = preset.lineColor;
    ps.config.speed = preset.speed;

    /* 2. 调整粒子池大小 */
    if (doResize) {
      resizeParticlePool(ps, preset.count);
    }

    /* 3. 重新着色 */
    if (doRecolor) {
      recolorParticles(ps, preset);
    }

    /* 4. 重绘背景（如果粒子系统公开了 _resize 或类似方法） */
    if (typeof ps._resize === 'function') {
      ps._resize();
    }

    return true;
  }

  /**
   * 循环切换到下一个预设（用于按键或按钮交互）。
   * @param {ParticleSystem} ps
   * @returns {string} 切换后的预设名称
   */
  function cyclePreset(ps) {
    var names = listPresets();
    if (!names.length || !ps) return null;

    /* 从当前配置反推当前预设（粗略匹配 connectDistance + count） */
    var currentName = names[0];
    for (var i = 0; i < names.length; i++) {
      var p = PRESETS[names[i]];
      if (
        ps.config.connectDistance === p.connectDistance &&
        ps.config.count === p.count
      ) {
        currentName = names[i];
        break;
      }
    }

    var nextIndex = (names.indexOf(currentName) + 1) % names.length;
    var nextName = names[nextIndex];
    applyPreset(ps, nextName);
    return nextName;
  }

  /* ----------------------------------------------------------------
   *  导出
   * ---------------------------------------------------------------- */
  global.ParticlePresets = {
    list: listPresets,
    get: getPreset,
    apply: applyPreset,
    cycle: cyclePreset,
    /* 原始数据，供外部读取 */
    data: PRESETS
  };
})(typeof window !== 'undefined' ? window : this);
