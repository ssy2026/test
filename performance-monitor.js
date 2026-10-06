/**
 * performance-monitor.js — 轻量级运行时性能面板。
 * 显示 FPS、粒子数量、实时连接数。
 * 按 P 键切换面板显隐。
 */
(function () {
  'use strict';

  let panel = null;
  let psRef = null;
  let lastTime = 0;
  let frames = 0;
  let rafId = null;
  let visible = true;

  function createPanel() {
    panel = document.createElement('div');
    panel.id = 'perf-monitor';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '8px',
      right: '8px',
      padding: '6px 10px',
      font: '12px/1.5 monospace',
      color: '#9cf',
      background: 'rgba(10, 10, 18, 0.78)',
      border: '1px solid rgba(100, 180, 255, 0.25)',
      borderRadius: '6px',
      pointerEvents: 'none',
      zIndex: 10,
      userSelect: 'none',
      backdropFilter: 'blur(4px)'
    });
    panel.textContent = 'FPS -- | Particles -- | Links --';
    document.body.appendChild(panel);
  }

  function countLinks() {
    if (!psRef || !psRef.particles) return 0;
    const maxDist = psRef.config.connectDistance;
    const maxDistSq = maxDist * maxDist;
    let count = 0;
    const particles = psRef.particles;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      let connections = 0;
      for (let j = i + 1; j < particles.length; j++) {
        if (connections >= psRef.config.maxConnections) break;
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (dx * dx + dy * dy < maxDistSq) {
          count++;
          connections++;
        }
      }
    }
    return count;
  }

  function update() {
    if (!psRef) return;
    const now = performance.now();
    frames++;
    if (lastTime === 0) lastTime = now;
    if (now - lastTime >= 500) {
      const fps = Math.round((frames * 1000) / (now - lastTime));
      frames = 0;
      lastTime = now;
      const particleCount = psRef.particles ? psRef.particles.length : 0;
      const linkCount = countLinks();
      if (panel) {
        panel.textContent = `FPS ${fps} | Particles ${particleCount} | Links ${linkCount}`;
      }
    }
    rafId = requestAnimationFrame(update);
  }

  function toggle() {
    visible = !visible;
    if (panel) panel.style.display = visible ? 'block' : 'none';
  }

  function initPerformanceMonitor(psInstance) {
    if (!psInstance || psRef) return;
    psRef = psInstance;
    createPanel();
    lastTime = 0;
    frames = 0;
    rafId = requestAnimationFrame(update);
    window.addEventListener('keydown', function (e) {
      if (e.key === 'p' || e.key === 'P') toggle();
    });
  }

  window.initPerformanceMonitor = initPerformanceMonitor;
})();
