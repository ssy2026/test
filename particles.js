/**
 * particles.js — A lightweight, configurable particle system for canvas.
 * No dependencies. No build step. Works with any canvas element.
 *
 * Usage:
 *   const ps = new ParticleSystem(canvas, { count: 200 });
 *   ps.start();
 *
 * To integrate with the existing index.html, replace the inline script
 * with a <script src="particles.js"></script> and initialize on load.
 */

class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }

  reset() {
    const { width: w, height: h } = this.canvas;
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = (Math.random() - 0.5) * 0.8;
    this.radius = Math.random() * 1.8 + 0.4;
    this.baseAlpha = Math.random() * 0.6 + 0.2;
    this.alpha = this.baseAlpha;
    this.color = `hsl(${Math.random() * 60 + 180}, 70%, 65%)`;
    this.life = 1;
    this.decay = Math.random() * 0.002 + 0.0005;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Soft wrap-around edges
    const { width: w, height: h } = this.canvas;
    if (this.x < -10) this.x = w + 10;
    if (this.x > w + 10) this.x = -10;
    if (this.y < -10) this.y = h + 10;
    if (this.y > h + 10) this.y = -10;

    // Gentle fade cycle
    this.life -= this.decay * dt;
    if (this.life <= 0) this.reset();
    this.alpha = this.baseAlpha * Math.min(1, this.life * 3);
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.lastTime = 0;
    this.frameId = null;

    this.config = {
      count: options.count ?? 180,
      connectDistance: options.connectDistance ?? 110,
      maxConnections: options.maxConnections ?? 3,
      backgroundColor: options.backgroundColor ?? '#0b0b0f',
      particleColor: options.particleColor ?? null,
      lineColor: options.lineColor ?? 'rgba(100, 180, 255, 0.12)',
      speed: options.speed ?? 1,
    };

    this.particles = [];
    this._boundResize = () => this._resize();
    this._boundLoop = (t) => this._loop(t);

    this._init();
  }

  _init() {
    this._resize();
    this.particles = Array.from(
      { length: this.config.count },
      () => new Particle(this.canvas)
    );
    window.addEventListener('resize', this._boundResize);
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.canvas._logicalWidth = w;
    this.canvas._logicalHeight = h;
  }

  get width() {
    return this.canvas._logicalWidth ?? this.canvas.width;
  }

  get height() {
    return this.canvas._logicalHeight ?? this.canvas.height;
  }

  _loop(timestamp) {
    if (!this.running) return;

    const dt = this.lastTime
      ? Math.min((timestamp - this.lastTime) / 16.67, 3)
      : 1;
    this.lastTime = timestamp;

    this._update(dt);
    this._draw();

    this.frameId = requestAnimationFrame(this._boundLoop);
  }

  _update(dt) {
    const speed = this.config.speed;
    for (const p of this.particles) {
      p.vx *= speed;
      p.vy *= speed;
      p.update(dt);
      p.vx /= speed;
      p.vy /= speed;
    }
  }

  _draw() {
    const { ctx, config } = this;
    const w = this.width;
    const h = this.height;

    // Background
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    // Connection lines
    const maxDist = config.connectDistance;
    const maxDistSq = maxDist * maxDist;
    const particles = this.particles;

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      let connections = 0;

      for (let j = i + 1; j < particles.length; j++) {
        if (connections >= config.maxConnections) break;
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / maxDist) * 0.35;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = config.lineColor.replace(
            /[\d.]+\)$/,
            `${alpha.toFixed(3)})`
          );
          ctx.lineWidth = 0.6;
          ctx.stroke();
          connections++;
        }
      }
    }

    // Particles
    for (const p of particles) {
      p.draw(ctx);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = 0;
    this.frameId = requestAnimationFrame(this._boundLoop);
  }

  stop() {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._boundResize);
    this.particles = [];
  }

  // --- Runtime API ---

  setCount(n) {
    const current = this.particles.length;
    if (n > current) {
      for (let i = current; i < n; i++) {
        this.particles.push(new Particle(this.canvas));
      }
    } else {
      this.particles.length = n;
    }
    this.config.count = n;
  }

  setSpeed(s) {
    this.config.speed = s;
  }

  setConnectDistance(d) {
    this.config.connectDistance = d;
  }
}

// Expose globally for non-module usage
if (typeof window !== 'undefined') {
  window.ParticleSystem = ParticleSystem;
}

// Module export (for future bundling)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Particle, ParticleSystem };
}
