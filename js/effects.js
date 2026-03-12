/* ============================================================
   effects.js — Visual effects layer
   Particle field, custom cursor, 3D tilt, scroll reveal,
   XP float animations, streak counter
   ============================================================ */

// ── Custom Cursor ─────────────────────────────────────────────
const Cursor = {
  el: null, ring: null, mx: 0, my: 0, rx: 0, ry: 0, _ready: false,

  init() {
    this.el   = document.getElementById('cursor');
    this.ring = document.getElementById('cursor-ring');
    if (!this.el) return;
    if (this._ready) return; // guard: only bind document listeners once
    this._ready = true;
    document.addEventListener('mousemove', e => { this.mx = e.clientX; this.my = e.clientY; });
    document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
    document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));
    // Use event delegation so dynamically loaded section elements are covered
    const HOVER_SEL = 'button,a,[onclick],[role=button],input,textarea,select,.nav-item,.tilt-card,.quiz-opt,.proof-btn,.la-level-btn,.calc-lvl-btn,.opt-lvl-btn,.it-lvl-btn';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(HOVER_SEL)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(HOVER_SEL)) document.body.classList.remove('cursor-hover');
    });
    this.animate();
  },

  animate() {
    // Lag the ring for a trailing effect
    this.rx += (this.mx - this.rx) * 0.12;
    this.ry += (this.my - this.ry) * 0.12;
    if (this.el)   { this.el.style.left = this.mx + 'px'; this.el.style.top = this.my + 'px'; }
    if (this.ring) { this.ring.style.left = this.rx + 'px'; this.ring.style.top = this.ry + 'px'; }
    requestAnimationFrame(() => this.animate());
  }
};

// ── Particle Field ────────────────────────────────────────────
const Particles = {
  canvas: null, ctx: null, particles: [], mouse: {x:-9999,y:-9999},
  symbols: ['∑','∫','∇','λ','∂','σ','μ','π','∞','≈','∈','⊗','√','Δ','ε','θ'],
  W: 0, H: 0,

  init() {
    this.canvas = document.getElementById('particle-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    this.spawn();
    this.loop();
  },

  resize() {
    this.W = this.canvas.width  = window.innerWidth;
    this.H = this.canvas.height = window.innerHeight;
  },

  spawn() {
    this.particles = [];
    const count = Math.min(60, Math.floor(this.W * this.H / 18000));
    for (let i = 0; i < count; i++) this.particles.push(this.newParticle(true));
  },

  newParticle(random = false) {
    const sym = this.symbols[Math.floor(Math.random() * this.symbols.length)];
    return {
      x: random ? Math.random() * this.W : Math.random() * this.W,
      y: random ? Math.random() * this.H : this.H + 20,
      size: 10 + Math.random() * 14,
      speed: 0.15 + Math.random() * 0.3,
      opacity: 0.04 + Math.random() * 0.1,
      symbol: sym,
      drift: (Math.random() - 0.5) * 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.005,
      hue: [210, 270, 160, 45][Math.floor(Math.random() * 4)],
    };
  },

  loop() {
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.particles.forEach((p, i) => {
      // Mouse repulsion
      const dx = p.x - this.mouse.x;
      const dy = p.y - this.mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 120) {
        const force = (120 - dist) / 120 * 0.8;
        p.x += (dx / dist) * force;
        p.y += (dy / dist) * force;
      }
      p.y -= p.speed;
      p.x += p.drift;
      p.rotation += p.rotSpeed;
      if (p.y < -30) this.particles[i] = this.newParticle(false);

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = p.opacity;
      this.ctx.font = `${p.size}px 'JetBrains Mono', monospace`;
      this.ctx.fillStyle = `hsl(${p.hue}, 70%, 70%)`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(p.symbol, 0, 0);
      this.ctx.restore();
    });
    requestAnimationFrame(() => this.loop());
  }
};

// ── 3D Tilt Cards ─────────────────────────────────────────────
const Tilt = {
  init() {
    document.querySelectorAll('.tilt-card').forEach(card => {
      if (card.dataset.tiltBound) return; // guard: skip already-bound cards
      card.dataset.tiltBound = '1';
      card.addEventListener('mousemove', e => this.onMove(e, card));
      card.addEventListener('mouseleave', () => this.onLeave(card));
    });
  },

  onMove(e, card) {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const cx = r.width / 2, cy = r.height / 2;
    const rotX = ((y - cy) / cy) * -8;
    const rotY = ((x - cx) / cx) * 8;
    const gx = (x / r.width) * 100;
    const gy = (y / r.height) * 100;
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    card.style.setProperty('--gx', gx + '%');
    card.style.setProperty('--gy', gy + '%');
  },

  onLeave(card) {
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
    card.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
    setTimeout(() => card.style.transition = '', 500);
  }
};

// ── Scroll Reveal ─────────────────────────────────────────────
const ScrollReveal = {
  observer: null,

  init() {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); this.observer.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => this.observer.observe(el));
  },

  // Re-run after dynamic section loads
  refresh() {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => this.observer.observe(el));
  }
};

// ── XP Float Animation ────────────────────────────────────────
const XPFloat = {
  show(amount, x, y) {
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = `+${amount} XP`;
    el.style.left = (x || window.innerWidth / 2) + 'px';
    el.style.top  = (y || window.innerHeight / 2) + 'px';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
};

// ── Counter Animation ─────────────────────────────────────────
const Counter = {
  animate(el, target, duration = 1200) {
    const suffix = el.dataset.suffix || '';
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      el.textContent = Math.floor(ease * target) + suffix;
      if (prog < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    };
    requestAnimationFrame(step);
  },

  initAll() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const target = parseInt(e.target.dataset.target);
          this.animate(e.target, target);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-target]').forEach(el => obs.observe(el));
  }
};

// ── Streak Counter ────────────────────────────────────────────
const Streak = {
  get() {
    const key = 'dsmath_streak';
    const dateKey = 'dsmath_last_visit';
    const today = new Date().toDateString();
    const last = localStorage.getItem(dateKey);
    let streak = parseInt(localStorage.getItem(key) || '0');
    if (last === today) return streak;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (last === yesterday) streak++;
    else streak = 1;
    localStorage.setItem(key, streak);
    localStorage.setItem(dateKey, today);
    return streak;
  },

  render() {
    const el = document.getElementById('streak-count');
    if (el) el.textContent = this.get();
  }
};

// ── Kinetic Title ─────────────────────────────────────────────
const KineticTitle = {
  animate(el) {
    if (!el) return;
    const text = el.textContent;
    el.innerHTML = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.cssText = `display:inline-block;animation:letterIn 0.5s ${i*0.03}s cubic-bezier(0.4,0,0.2,1) both`;
      el.appendChild(span);
    });
  }
};

// ── Sound FX (Web Audio API) ──────────────────────────────────
const SoundFX = {
  ctx: null, enabled: false,

  init() {
    this.enabled = localStorage.getItem('dsmath_sound') === 'on';
    const btn = document.getElementById('sound-toggle');
    if (btn) {
      btn.textContent = this.enabled ? '🔊' : '🔇';
      btn.addEventListener('click', () => this.toggle());
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('dsmath_sound', this.enabled ? 'on' : 'off');
    const btn = document.getElementById('sound-toggle');
    if (btn) btn.textContent = this.enabled ? '🔊' : '🔇';
  },

  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  click() {
    if (!this.enabled) return;
    this.ensure();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.connect(g); g.connect(this.ctx.destination);
    o.frequency.setValueAtTime(800, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.05);
    g.gain.setValueAtTime(0.05, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    o.start(); o.stop(this.ctx.currentTime + 0.05);
  },

  success() {
    if (!this.enabled) return;
    this.ensure();
    [523,659,784].forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.frequency.value = freq;
      o.type = 'sine';
      const t = this.ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.start(t); o.stop(t + 0.3);
    });
  }
};

// CSS for letter animation (injected)
const style = document.createElement('style');
style.textContent = `
  @keyframes letterIn {
    from { opacity:0; transform: translateY(20px) rotateX(-90deg); }
    to   { opacity:1; transform: translateY(0) rotateX(0); }
  }
  .tilt-card {
    background-image: radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgba(94,184,245,0.05) 0%, transparent 60%);
    transition: background-image 0.1s;
  }
`;
document.head.appendChild(style);

// ── Init everything on DOM ready ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Particles.init();
  Cursor.init();
  Tilt.init();
  ScrollReveal.init();
  Counter.initAll();
  Streak.render();
  SoundFX.init();
  KineticTitle.animate(document.querySelector('.hero-title'));
});
