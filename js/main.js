// ============================================
// DS MATH — MOHIT
// Main Application Controller
// ============================================

const App = {
  currentSection: 'home',
  xp: 0,
  progress: 0,

  init() {
    this.bindNav();
    this.initProgress();
    this.animateHeroStats();
    this.showSection('home');
    Persistence.load();
  },

  bindNav() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.nav;
        if (el.classList.contains('locked')) {
          this.showToast('🔒 Complete the previous topic first!');
          return;
        }
        this.showSection(target);
      });
    });
  },

  showSection(id) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.remove('active'));
    const section = document.getElementById('section-' + id);
    if (section) section.classList.add('active');
    const navEl = document.querySelector(`[data-nav="${id}"]`);
    if (navEl) navEl.classList.add('active');
    this.currentSection = id;
    if (id === 'home') { setTimeout(() => RoadmapViz.init(), 100); }
    if (id === 'statistics') { this.loadSection('statistics', 'statistics-content-mount'); }
    if (id === 'linear-algebra') { this.loadSection('linear-algebra', 'linear-algebra-content-mount'); }
    if (id === 'calculus') { this.loadSection('calculus', 'calculus-content-mount'); }
    if (id === 'optimization') { this.loadSection('optimization', 'optimization-content-mount'); }
    if (id === 'info-theory') { this.loadSection('information-theory', 'info-theory-content-mount'); }
    window.scrollTo(0, 0);
    // Close mobile sidebar on navigation
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btn = document.getElementById('hamburger-btn');
    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('show');
    btn?.classList.remove('open');
  },

  loadSection(name, mountId) {
    const mount = document.getElementById(mountId);
    if (!mount || mount.dataset.loaded) return;
    mount.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:#4a5568;font-size:13px;gap:12px;"><div style="width:20px;height:20px;border:2px solid #63b3ed;border-top-color:transparent;border-radius:50%;animation:spin-cw 0.7s linear infinite;"></div> Loading section...</div>';
    fetch('sections/' + name + '.html')
      .then(r => { if (!r.ok) throw new Error('not ok'); return r.text(); })
      .then(html => {
        mount.innerHTML = html;
        mount.dataset.loaded = '1';
        mount.querySelectorAll('script').forEach(oldScript => {
          const ns = document.createElement('script');
          ns.textContent = oldScript.textContent;
          document.body.appendChild(ns);
          oldScript.remove();
        });
      })
      .catch(() => {
        mount.innerHTML = `<div style="padding:60px;text-align:center;color:#4a5568;font-size:13px;line-height:1.8;">⚠️ Could not load section.<br>Open the site with a local server:<br><code style="background:#1a2233;padding:4px 10px;border-radius:4px;color:#63b3ed;">python -m http.server 8000</code><br>Then visit <strong>http://localhost:8000</strong></div>`;

      });
  },

  initProgress() {
    const fill = document.querySelector('.progress-bar-fill');
    const pct  = document.querySelector('.progress-pct');
    const xpFill = document.querySelector('.xp-bar-fill');
    setTimeout(() => {
      if (fill) fill.style.width = this.progress + '%';
      if (pct)  pct.textContent = this.progress + '%';
      if (xpFill) xpFill.style.width = (this.xp / 10) + '%';
    }, 600);
  },

  addXP(amount) {
    this.xp += amount;
    const el = document.querySelector('.xp-value');
    if (el) el.textContent = this.xp + ' XP';
    const xpFill = document.querySelector('.xp-bar-fill');
    if (xpFill) xpFill.style.width = Math.min(100, this.xp / 10) + '%';
    this.showToast(`⭐ +${amount} XP earned!`);
  },

  animateHeroStats() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target);
          const suffix = el.dataset.suffix || '';
          let current = 0;
          const step = target / 60;
          const timer = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = Math.floor(current) + suffix;
            if (current >= target) clearInterval(timer);
          }, 16);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
  },

  toastTimer: null,
  showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.querySelector('.toast-msg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  },

  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btn = document.getElementById('hamburger-btn');
    if (!sidebar) return;
    const isOpen = sidebar.classList.toggle('mobile-open');
    overlay?.classList.toggle('show', isOpen);
    btn?.classList.toggle('open', isOpen);
  }
};

// ============================================
// Roadmap Visualization (D3)
// ============================================
const RoadmapViz = {
  initialized: false,

  nodes: [
    { id: 'stats',    label: 'Statistics &\nProbability',  icon: '📊', x: 0.2,  y: 0.2,  color: '#63b3ed', section: 'statistics',  unlocked: true  },
    { id: 'linalg',   label: 'Linear\nAlgebra',            icon: '🔢', x: 0.5,  y: 0.2,  color: '#9f7aea', section: 'linear-algebra', unlocked: false },
    { id: 'calculus', label: 'Calculus &\nDerivatives',    icon: '∂',  x: 0.8,  y: 0.2,  color: '#68d391', section: 'calculus',    unlocked: false },
    { id: 'optim',    label: 'Optimization',               icon: '⚡', x: 0.35, y: 0.55, color: '#f6ad55', section: 'optimization', unlocked: false },
    { id: 'info',     label: 'Information\nTheory',        icon: '🌀', x: 0.65, y: 0.55, color: '#fc8181', section: 'info-theory', unlocked: false },
    { id: 'ds',       label: 'Data Science\nMastery',      icon: '🎯', x: 0.5,  y: 0.85, color: '#f6e05e', section: null,         unlocked: false },
  ],

  edges: [
    { from: 'stats',    to: 'optim'   },
    { from: 'linalg',   to: 'optim'   },
    { from: 'linalg',   to: 'info'    },
    { from: 'calculus', to: 'optim'   },
    { from: 'calculus', to: 'info'    },
    { from: 'optim',    to: 'ds'      },
    { from: 'info',     to: 'ds'      },
  ],

  init() {
    if (this.initialized) return;
    const container = document.getElementById('roadmap-svg');
    if (!container || typeof d3 === 'undefined') {
      setTimeout(() => this.init(), 500);
      return;
    }
    this.initialized = true;
    this.render(container);
  },

  render(svgEl) {
    const W = svgEl.parentElement.clientWidth - 80;
    const H = 380;
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.setAttribute('height', H);

    const d3svg = d3.select(svgEl);
    d3svg.selectAll('*').remove();

    const defs = d3svg.append('defs');

    // Glow filters — one per node color
    const glowColors = [
      { name: 'cyan',    hex: '#63b3ed' },
      { name: 'violet',  hex: '#9f7aea' },
      { name: 'amber',   hex: '#f6ad55' },
      { name: 'emerald', hex: '#68d391' },
      { name: 'rose',    hex: '#fc8181' },
      { name: 'gold',    hex: '#f6e05e' },
    ];
    glowColors.forEach(({ name }) => {
      const f = defs.append('filter').attr('id', `glow-${name}`).attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%');
      f.append('feGaussianBlur').attr('stdDeviation','6').attr('result','blur');
      const feMerge = f.append('feMerge');
      feMerge.append('feMergeNode').attr('in','blur');
      feMerge.append('feMergeNode').attr('in','SourceGraphic');
    });
    // Map node colors to filter names
    const colorToGlow = {
      '#63b3ed': 'glow-cyan', '#9f7aea': 'glow-violet', '#f6ad55': 'glow-amber',
      '#68d391': 'glow-emerald', '#fc8181': 'glow-rose', '#f6e05e': 'glow-gold',
    };

    const nodeMap = {};
    this.nodes.forEach(n => { nodeMap[n.id] = n; });

    // Draw edges
    this.edges.forEach((e, i) => {
      const from = nodeMap[e.from];
      const to   = nodeMap[e.to];
      const x1 = from.x * W, y1 = from.y * H;
      const x2 = to.x * W,   y2 = to.y * H;
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - 20;

      const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
      const pathLen = 300;

      d3svg.append('path')
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(99,179,237,0.12)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', pathLen)
        .attr('stroke-dashoffset', pathLen)
        .style('animation', `dash 1.5s ${i * 0.15}s ease forwards`);

      // Moving dot
      const dot = d3svg.append('circle').attr('r', 3).attr('fill', '#63b3ed').attr('opacity', 0.6);
      const animDot = () => {
        dot.attr('opacity', 0.6)
          .transition().duration(2000).delay(i * 300)
          .attrTween('transform', () => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathD);
            const len = path.getTotalLength();
            return t => {
              const p = path.getPointAtLength(t * len);
              return `translate(${p.x},${p.y})`;
            };
          })
          .attr('opacity', 0)
          .on('end', () => setTimeout(animDot, 2000 + i * 500));
      };
      setTimeout(animDot, 1000 + i * 200);
    });

    // Draw nodes
    this.nodes.forEach((n, i) => {
      const x = n.x * W, y = n.y * H;
      const nodeG = d3svg.append('g').attr('transform', `translate(${x},${y})`).style('cursor', n.unlocked ? 'pointer' : 'default');

      // Outer ring
      nodeG.append('circle').attr('r', 44).attr('fill', 'none')
        .attr('stroke', n.color).attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 4').attr('opacity', n.unlocked ? 0.4 : 0.1)
        .style('animation', `spin-${i % 2 === 0 ? 'cw' : 'ccw'} 20s linear infinite`);

      // Main circle
      const glowId = colorToGlow[n.color] || 'glow-cyan';
      nodeG.append('circle').attr('r', 34)
        .attr('fill', n.unlocked ? `rgba(${hexToRgb(n.color)},0.12)` : 'rgba(255,255,255,0.02)')
        .attr('stroke', n.color).attr('stroke-width', n.unlocked ? 2 : 0.5)
        .attr('opacity', n.unlocked ? 1 : 0.35)
        .attr('filter', n.unlocked ? `url(#${glowId})` : '');

      // Icon
      nodeG.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('y', -6).attr('font-size', n.id === 'calculus' ? '22px' : '20px')
        .attr('opacity', n.unlocked ? 1 : 0.4)
        .text(n.icon);

      // Label lines
      const lines = n.label.split('\n');
      lines.forEach((line, li) => {
        nodeG.append('text').attr('text-anchor', 'middle').attr('y', 52 + li * 16)
          .attr('font-size', '11px').attr('font-family', "'Syne', sans-serif")
          .attr('font-weight', '600').attr('fill', n.unlocked ? n.color : '#4a5568')
          .attr('letter-spacing', '-0.3px').text(line);
      });

      // Lock icon
      if (!n.unlocked) {
        nodeG.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('y', 14).attr('font-size', '12px').attr('opacity', 0.4).text('🔒');
      }

      // Hover + click
      if (n.unlocked && n.section) {
        nodeG.style('cursor', 'pointer')
          .on('mouseenter', function() {
            d3.select(this).select('circle:nth-child(2)')
              .transition().duration(200).attr('r', 38);
          })
          .on('mouseleave', function() {
            d3.select(this).select('circle:nth-child(2)')
              .transition().duration(200).attr('r', 34);
          })
          .on('click', () => App.showSection(n.section));
      }

      // Entrance animation
      nodeG.style('opacity', 0).style('transform', `translate(${x}px,${y}px) scale(0)`);
      setTimeout(() => {
        nodeG.style('transition', 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)')
          .style('opacity', '1')
          .style('transform', `translate(${x}px,${y}px) scale(1)`);
      }, i * 120 + 200);
    });
  }
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
