/**
 * interaction.js — 为 ParticleSystem 添加鼠标/触摸排斥交互与力场光晕。
 * 依赖：全局 ParticleSystem（由 particles.js 暴露）。
 * 用法：initInteraction(psInstance);
 */
(function () {
  'use strict';

  let overlay = null;
  let octx = null;
  let ps = null;
  let animationId = null;

  const mouse = {
    x: null,
    y: null,
    active: false,
    radius: 160,
    strength: 0.35,
    repulse: true,
    maxSpeed: 4,
  };

  /* ---------- overlay canvas ---------- */

  function createOverlay() {
    overlay = document.createElement('canvas');
    overlay.id = 'interaction-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1',
    });
    document.body.appendChild(overlay);
    octx = overlay.getContext('2d');
    resizeOverlay();
    window.addEventListener('resize', resizeOverlay);
  }

  function resizeOverlay() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    overlay.width = w * dpr;
    overlay.height = h * dpr;
    overlay.style.width = w + 'px';
    overlay.style.height = h + 'px';
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- input ---------- */

  function setMouse(clientX, clientY) {
    mouse.x = clientX;
    mouse.y = clientY;
    mouse.active = true;
  }

  function onMouseMove(e) {
    setMouse(e.clientX, e.clientY);
  }

  function onMouseLeave() {
    mouse.active = false;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      setMouse(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  }

  function onTouchEnd() {
    mouse.active = false;
  }

  /* ---------- force field ---------- */

  function applyForce() {
    if (!ps || !mouse.active || mouse.x === null || mouse.y === null) return;

    const particles = ps.particles;
    const radius = mouse.radius;
    const radiusSq = radius * radius;
    const strength = mouse.strength;
    const direction = mouse.repulse ? 1 : -1;
    const maxSpeed = mouse.maxSpeed;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > radiusSq || distSq < 0.0001) continue;

      const dist = Math.sqrt(distSq);
      const falloff = 1 - dist / radius;
      const force = falloff * strength * direction;
      const nx = dx / dist;
      const ny = dy / dist;

      p.vx += nx * force;
      p.vy += ny * force;

      // 受影响粒子轻微阻尼，避免能量无限累积
      p.vx *= 0.985;
      p.vy *= 0.985;

      // 速度上限
      if (p.vx > maxSpeed) p.vx = maxSpeed;
      else if (p.vx < -maxSpeed) p.vx = -maxSpeed;
      if (p.vy > maxSpeed) p.vy = maxSpeed;
      else if (p.vy < -maxSpeed) p.vy = -maxSpeed;
    }
  }

  /* ---------- overlay drawing ---------- */

  function drawOverlay() {
    if (!octx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    octx.clearRect(0, 0, w, h);

    if (!mouse.active || mouse.x === null || mouse.y === null) return;

    const r = mouse.radius;

    // 力场径向渐变
    const gradient = octx.createRadialGradient(
      mouse.x, mouse.y, 0,
      mouse.x, mouse.y, r
    );
    gradient.addColorStop(0, 'rgba(120, 190, 255, 0.18)');
    gradient.addColorStop(0.45, 'rgba(120, 190, 255, 0.06)');
    gradient.addColorStop(1, 'rgba(120, 190, 255, 0)');

    octx.beginPath();
    octx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2);
    octx.fillStyle = gradient;
    octx.fill();

    // 中心光点
    octx.beginPath();
    octx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
    octx.fillStyle = 'rgba(160, 210, 255, 0.7)';
    octx.fill();

    // 外圈细环
    octx.beginPath();
    octx.arc(mouse.x, mouse.y, r * 0.98, 0, Math.PI * 2);
    octx.strokeStyle = 'rgba(120, 190, 255, 0.08)';
    octx.lineWidth = 1;
    octx.stroke();
  }

  /* ---------- main loop ---------- */

  function loop() {
    applyForce();
    drawOverlay();
    animationId = requestAnimationFrame(loop);
  }

  /* ---------- public api ---------- */

  function initInteraction(particleSystem) {
    if (!particleSystem || !particleSystem.particles) return;

    ps = particleSystem;

    if (!overlay) createOverlay();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    if (animationId) cancelAnimationFrame(animationId);
    loop();
  }

  window.initInteraction = initInteraction;
})();
