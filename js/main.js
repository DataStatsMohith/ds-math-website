/* ============================================================
   main.js — App controller
   Navigation, roadmap, progress ring, section loading,
   XP system, unlock logic, topic card state
   ============================================================ */

const App = {
  currentSection: 'home',
  xp: 0,
  progress: 0,
  completed: [],

  // Section map: id → { file, mount, navId, tcId }
  sections: {
    'statistics':    { file:'sections/statistics.html',       mount:'statistics-content-mount',     nav:'nav-statistics',    tc:'tc-statistics',    ts:'ts-statistics',    tp:'tp-statistics',    prev:null,           next:'linear-algebra' },
    'linear-algebra':{ file:'sections/linear-algebra.html',   mount:'linear-algebra-content-mount', nav:'nav-linear-algebra',tc:'tc-linear-algebra',ts:'ts-linear-algebra',tp:'tp-linear-algebra',prev:'statistics',   next:'calculus' },
    'calculus':      { file:'sections/calculus.html',         mount:'calculus-content-mount',       nav:'nav-calculus',      tc:'tc-calculus',      ts:'ts-calculus',      tp:'tp-calculus',      prev:'linear-algebra',next:'optimization' },
    'optimization':  { file:'sections/optimization.html',     mount:'optimization-content-mount',   nav:'nav-optimization',  tc:'tc-optimization',  ts:'ts-optimization',  tp:'tp-optimization',  prev:'calculus',      next:'info-theory' },
    'info-theory':   { file:'sections/information-theory.html',mount:'info-theory-content-mount',   nav:'nav-info-theory',   tc:'tc-info-theory',   ts:'ts-info-theory',   tp:'tp-info-theory',   prev:'optimization',  next:null }
  },

  loaded: new Set(),

  init() {
    // Load persisted state
    this.xp       = Persistence.loadXP();
    this.progress = Persistence.loadProgress();
    this.completed= Persistence.loadCompleted();

    this.updateXPDisplay();
    this.updateProgressRing();
    this.updateTopicCards();
    this.updateNavLocks();
    this.initRoadmap();
    this.initNavigation();
    this.initHamburger();

    // Patch addXP
    this.addXP = (amount, x, y) => {
      this.xp += amount;
      Persistence.saveXP(this.xp);
      this.updateXPDisplay(true);
      if (typeof XPFloat !== 'undefined') XPFloat.show(amount, x, y);
      if (typeof SoundFX !== 'undefined') SoundFX.success();
    };
  },

  // ── Navigation ─────────────────────────────────────────
  initNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        if (el.classList.contains('locked')) {
          this.showToast('🔒 Complete the previous topic first!', 'warning');
          return;
        }
        const id = el.dataset.section;
        this.showSection(id);
        if (typeof SoundFX !== 'undefined') SoundFX.click();
        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('sidebar-overlay').classList.remove('show');
        document.getElementById('hamburger').classList.remove('open');
      });
    });
  },

  showSection(id) {
    // Enforce lock — prevent skipping ahead (topic card onclicks bypass nav lock check)
    if (id !== 'home') {
      const order = ['statistics','linear-algebra','calculus','optimization','info-theory'];
      const i = order.indexOf(id);
      const locked = i > 0 && !this.completed.includes(order[i - 1]);
      if (locked) {
        this.showToast('🔒 Complete the previous topic first!', 'warning');
        return;
      }
    }

    // Hide all
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const sectionEl = document.getElementById('section-' + id);
    if (!sectionEl) return;
    sectionEl.classList.add('active');

    const navEl = document.getElementById('nav-' + id);
    if (navEl) navEl.classList.add('active');

    // Home nav
    if (id === 'home') {
      const homeNav = document.querySelector('.nav-item[data-section="home"]');
      if (homeNav) homeNav.classList.add('active');
    }

    this.currentSection = id;

    // Load section HTML if not yet loaded
    if (id !== 'home' && !this.loaded.has(id)) {
      this.loadSection(id);
    } else {
      // Re-run scroll reveal for already-loaded sections
      if (typeof ScrollReveal !== 'undefined') ScrollReveal.refresh();
      if (typeof Tilt !== 'undefined') Tilt.init();
    }

    // Scroll to top of main
    const mc = document.querySelector('.main-content');
    if (mc) mc.scrollTo({ top: 0, behavior: 'smooth' });
  },

  loadSection(id) {
    const cfg = this.sections[id];
    if (!cfg) return;
    const mount = document.getElementById(cfg.mount);
    if (!mount) return;

    mount.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:300px;gap:12px;color:var(--text-muted)"><div style="width:20px;height:20px;border:2px solid var(--accent-cyan);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite"></div>Loading…</div>';

    fetch(cfg.file)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(html => {
        // innerHTML drops <script> tags silently - extract and re-execute them
        mount.innerHTML = html;
        this.loaded.add(id);

        // Re-execute all inline script blocks (innerHTML ignores them)
        mount.querySelectorAll('script:not([src])').forEach(oldScript => {
          const newScript = document.createElement('script');
          newScript.textContent = oldScript.textContent;
          document.body.appendChild(newScript);
          oldScript.remove(); // avoid double-run if ever re-inserted
        });

        // Re-init visual effects on new DOM
        setTimeout(() => {
          if (typeof ScrollReveal !== 'undefined') ScrollReveal.refresh();
          if (typeof Tilt !== 'undefined') Tilt.init();
          if (typeof Cursor !== 'undefined') Cursor.init();
          if (window.renderMathInElement) renderMathInElement(mount, {
            delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]
          });
        }, 100);
      })
      .catch(err => {
        mount.innerHTML = `<div style="padding:60px;text-align:center;color:var(--accent-rose)">Failed to load section: ${err.message}<br><small style="color:var(--text-muted)">Are you running a local server? (python -m http.server 8000)</small></div>`;
      });
  },

  // ── XP ─────────────────────────────────────────────────
  addXP(amount, x, y) {
    this.xp += amount;
    Persistence.saveXP(this.xp);
    this.updateXPDisplay(true);
    if (typeof XPFloat !== 'undefined') XPFloat.show(amount, x, y);
    if (typeof SoundFX !== 'undefined') SoundFX.success();
  },

  updateXPDisplay(animate = false) {
    const el = document.getElementById('xp-display');
    if (!el) return;
    if (animate && typeof Counter !== 'undefined') {
      Counter.animate(el, this.xp, 600);
    } else {
      el.textContent = this.xp;
    }
  },

  // ── Progress Ring ───────────────────────────────────────
  updateProgressRing() {
    const ring = document.getElementById('progress-ring');
    const pct  = document.getElementById('progress-pct');
    const lbl  = document.getElementById('progress-label');
    if (!ring) return;
    const r = 16;
    const circ = 2 * Math.PI * r;
    const offset = circ - (this.progress / 100) * circ;
    ring.style.strokeDashoffset = offset;

    if (pct) pct.textContent = this.progress + '%';
    if (lbl) {
      const labels = ['Getting started','Learning basics','Building up','Almost there!','Mastered! 🎉'];
      lbl.textContent = labels[Math.floor(this.progress / 25)] || 'Getting started';
    }
  },

  setProgress(pct) {
    this.progress = pct;
    Persistence.saveProgress(pct);
    this.updateProgressRing();
  },

  // ── Topic Card State ────────────────────────────────────
  updateTopicCards() {
    const sectionOrder = ['statistics','linear-algebra','calculus','optimization','info-theory'];
    const pcts = { statistics:0, 'linear-algebra':0, calculus:0, optimization:0, 'info-theory':0 };

    // Figure out fill pcts from completed
    sectionOrder.forEach((id, i) => {
      const scores = Persistence.loadQuizScores();
      if (scores[id]) pcts[id] = (scores[id].score / scores[id].total) * 100;
      if (this.completed.includes(id)) pcts[id] = 100;
    });

    sectionOrder.forEach((id, i) => {
      const unlocked = i === 0 || this.completed.includes(sectionOrder[i-1]);
      const done = this.completed.includes(id);
      const cfg = this.sections[id];

      const tc = document.getElementById(cfg.tc);
      const ts = document.getElementById(cfg.ts);
      const tp = document.getElementById(cfg.tp);

      if (tc) {
        if (!unlocked) { tc.classList.add('is-locked'); }
        else { tc.classList.remove('is-locked'); }
        if (done) tc.classList.add('done');
      }
      if (ts) {
        if (!unlocked) { ts.textContent = '🔒 Locked'; ts.className = 'topic-status locked'; }
        else if (done) { ts.textContent = '✅ Complete'; ts.className = 'topic-status done'; }
        else { ts.textContent = 'Start →'; ts.className = 'topic-status'; }
      }
      if (tp) tp.style.width = pcts[id] + '%';
    });
  },

  // ── Nav Lock State ──────────────────────────────────────
  updateNavLocks() {
    const sectionOrder = ['statistics','linear-algebra','calculus','optimization','info-theory'];
    sectionOrder.forEach((id, i) => {
      const unlocked = i === 0 || this.completed.includes(sectionOrder[i-1]);
      const navEl = document.getElementById('nav-' + id);
      if (navEl) {
        if (unlocked) navEl.classList.remove('locked');
        else navEl.classList.add('locked');
      }
    });
  },

  // ── Unlock a section ────────────────────────────────────
  unlockSection(id) {
    if (!this.completed.includes(id)) {
      this.completed.push(id);
      Persistence.markCompleted(id);
    }
    this.updateNavLocks();
    this.updateTopicCards();
    this.updateProgressRing();
    const next = this.sections[id]?.next;
    if (next) {
      this.showToast(`🔓 ${next.replace('-',' ')} unlocked!`, 'success');
    }
  },

  // ── Toast ───────────────────────────────────────────────
  showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const icons = { info:'✨', success:'🎉', warning:'⚠️', error:'❌' };
    toast.querySelector('.toast-icon').textContent = icons[type] || '✨';
    toast.querySelector('.toast-msg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  },

  // ── Hamburger ───────────────────────────────────────────
  initHamburger() {
    const btn = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!btn) return;
    const toggle = () => {
      btn.classList.toggle('open');
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('show');
    };
    btn.addEventListener('click', toggle);
    overlay.addEventListener('click', toggle);
  },

  // ── Roadmap SVG ─────────────────────────────────────────
  initRoadmap() {
    const svg = d3.select('#roadmap-svg');
    if (svg.empty()) return;

    const nodes = [
      { id:'home',          label:'Start',             icon:'🏠', x:60,   y:130, col:'#5eb8f5' },
      { id:'statistics',    label:'Statistics',        icon:'📊', x:210,  y:130, col:'#5eb8f5' },
      { id:'linear-algebra',label:'Linear Algebra',    icon:'🔢', x:380,  y:80,  col:'#a78bfa' },
      { id:'calculus',      label:'Calculus',          icon:'∫',  x:380,  y:180, col:'#fbbf24' },
      { id:'optimization',  label:'Optimization',      icon:'⚙️', x:560,  y:130, col:'#f87171' },
      { id:'info-theory',   label:'Info Theory',       icon:'ℹ️', x:730,  y:130, col:'#e879f9' },
      { id:'done',          label:'Expert',            icon:'🎓', x:870,  y:130, col:'#34d399' },
    ];
    const links = [
      { s:'home',           t:'statistics' },
      { s:'statistics',     t:'linear-algebra' },
      { s:'statistics',     t:'calculus' },
      { s:'linear-algebra', t:'optimization' },
      { s:'calculus',       t:'optimization' },
      { s:'optimization',   t:'info-theory' },
      { s:'info-theory',    t:'done' },
    ];

    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    const isUnlocked = id => {
      if (id === 'home' || id === 'statistics' || id === 'done') return true;
      const order = ['statistics','linear-algebra','calculus','optimization','info-theory'];
      const i = order.indexOf(id);
      return i > 0 && this.completed.includes(order[i-1]);
    };
    const isDone = id => this.completed.includes(id);

    // Defs
    const defs = svg.append('defs');
    defs.append('filter').attr('id','glow-rm')
      .append('feGaussianBlur').attr('stdDeviation','3').attr('result','blur');
    const glowFilter = defs.select('filter#glow-rm');
    glowFilter.append('feMerge').selectAll('feMergeNode').data(['blur','SourceGraphic']).enter().append('feMergeNode').attr('in', d => d);

    // Links
    svg.selectAll('.rm-link').data(links).enter()
      .append('line').attr('class','rm-link')
      .attr('x1', d => nodeMap[d.s].x).attr('y1', d => nodeMap[d.s].y)
      .attr('x2', d => nodeMap[d.t].x).attr('y2', d => nodeMap[d.t].y)
      .attr('stroke', d => isUnlocked(d.t) ? 'rgba(94,184,245,0.3)' : 'rgba(255,255,255,0.05)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => isUnlocked(d.t) ? 'none' : '5,5');

    // Nodes
    const nodeG = svg.selectAll('.rm-node').data(nodes).enter()
      .append('g').attr('class','rm-node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', d => isUnlocked(d.id) && d.id !== 'home' && d.id !== 'done' ? 'pointer' : 'default')
      .on('click', (e, d) => {
        if (isUnlocked(d.id) && d.id !== 'home' && d.id !== 'done') {
          this.showSection(d.id);
        }
      });

    // Outer ring (unlocked pulse)
    nodeG.filter(d => isUnlocked(d.id) && !isDone(d.id) && d.id !== 'done')
      .append('circle').attr('r', 28).attr('fill','none')
      .attr('stroke', d => d.col).attr('stroke-width',1).attr('opacity',0.3)
      .attr('class','rm-pulse');

    // Circle bg
    nodeG.append('circle').attr('r', 22)
      .attr('fill', d => isDone(d.id) ? d.col : isUnlocked(d.id) ? 'rgba(13,19,32,0.95)' : 'rgba(7,11,22,0.9)')
      .attr('stroke', d => isDone(d.id) ? d.col : isUnlocked(d.id) ? d.col : 'rgba(255,255,255,0.06)')
      .attr('stroke-width', d => isUnlocked(d.id) ? 2 : 1)
      .attr('filter', d => isUnlocked(d.id) ? 'url(#glow-rm)' : 'none');

    // Icon
    nodeG.append('text').attr('text-anchor','middle').attr('dominant-baseline','central')
      .attr('font-size','14').attr('y', 1)
      .text(d => d.icon)
      .attr('opacity', d => isUnlocked(d.id) ? 1 : 0.25);

    // Label
    nodeG.append('text').attr('text-anchor','middle').attr('y', 36)
      .attr('font-family','Space Grotesk, sans-serif').attr('font-weight','600')
      .attr('font-size','10').attr('letter-spacing','0.5')
      .attr('fill', d => isUnlocked(d.id) ? '#e8edf5' : '#3d4f6e')
      .text(d => d.label);

    // Done checkmark
    nodeG.filter(d => isDone(d.id))
      .append('text').attr('text-anchor','middle').attr('y',-18)
      .attr('font-size','10').text('✅');

    // Pulse animation via CSS
    const style = document.createElement('style');
    style.textContent = `.rm-pulse { animation: rmPulse 2.5s ease-in-out infinite; } @keyframes rmPulse { 0%,100%{r:28;opacity:.3} 50%{r:34;opacity:.08} }`;
    document.head.appendChild(style);
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
