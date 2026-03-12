// ============================================
// DS MATH — Persistence Module
// Saves and loads all user state via localStorage
// Keys: dsmath_xp, dsmath_progress, dsmath_completed,
//       dsmath_notes_<section>, dsmath_quiz_<section>
// ============================================

const Persistence = {
  KEYS: {
    xp:        'dsmath_xp',
    progress:  'dsmath_progress',
    completed: 'dsmath_completed',   // JSON array of section ids
    quizzes:   'dsmath_quizzes',     // JSON object: { sectionId: score }
  },

  // ── Load all persisted state into App on startup ──────────────
  load() {
    // XP
    const savedXP = parseInt(localStorage.getItem(this.KEYS.xp) || '0', 10);
    if (savedXP > 0) {
      App.xp = savedXP;
      const el = document.querySelector('.xp-value');
      if (el) el.textContent = savedXP + ' XP';
      const xpFill = document.querySelector('.xp-bar-fill');
      if (xpFill) xpFill.style.width = Math.min(100, savedXP / 10) + '%';
    }

    // Progress %
    const savedPct = parseInt(localStorage.getItem(this.KEYS.progress) || '0', 10);
    if (savedPct > 0) {
      App.progress = savedPct;
      const fill = document.querySelector('.progress-bar-fill');
      const pct  = document.querySelector('.progress-pct');
      if (fill) fill.style.width = savedPct + '%';
      if (pct)  pct.textContent  = savedPct + '%';
    }

    // Sidebar badges for completed sections
    const completed = this.getCompleted();
    completed.forEach(sectionId => {
      const navEl = document.querySelector(`[data-nav="${sectionId}"]`);
      if (navEl) {
        const badge = navEl.querySelector('.nav-badge');
        if (badge) {
          badge.textContent = '✓';
          badge.classList.add('done');
          badge.classList.remove('now');
        }
      }
    });
  },

  // ── XP ────────────────────────────────────────────────────────
  saveXP(xp) {
    localStorage.setItem(this.KEYS.xp, xp);
  },

  // ── Progress % ────────────────────────────────────────────────
  saveProgress(pct) {
    localStorage.setItem(this.KEYS.progress, pct);
  },

  // Recalculates overall progress from number of completed sections
  recalcProgress() {
    const totalSections = 5; // stats, linear-algebra, calculus, optimization, info-theory
    const completed = this.getCompleted();
    const pct = Math.round((completed.length / totalSections) * 100);
    App.progress = pct;
    this.saveProgress(pct);
    const fill = document.querySelector('.progress-bar-fill');
    const pctEl = document.querySelector('.progress-pct');
    if (fill) fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    return pct;
  },

  // ── Completed sections ────────────────────────────────────────
  getCompleted() {
    try { return JSON.parse(localStorage.getItem(this.KEYS.completed) || '[]'); }
    catch(_) { return []; }
  },

  markCompleted(sectionId) {
    const completed = this.getCompleted();
    if (!completed.includes(sectionId)) {
      completed.push(sectionId);
      localStorage.setItem(this.KEYS.completed, JSON.stringify(completed));
    }
    this.recalcProgress();

    // Update sidebar badge
    const navEl = document.querySelector(`[data-nav="${sectionId}"]`);
    if (navEl) {
      const badge = navEl.querySelector('.nav-badge');
      if (badge) {
        badge.textContent = '✓';
        badge.classList.add('done');
        badge.classList.remove('now');
      }
    }
  },

  isCompleted(sectionId) {
    return this.getCompleted().includes(sectionId);
  },

  // ── Notes (per section) ───────────────────────────────────────
  saveNote(sectionId, text) {
    localStorage.setItem('dsmath_notes_' + sectionId, text);
  },

  loadNote(sectionId) {
    return localStorage.getItem('dsmath_notes_' + sectionId) || '';
  },

  // ── Quiz scores (per section) ─────────────────────────────────
  saveQuizScore(sectionId, score, total) {
    try {
      const quizzes = JSON.parse(localStorage.getItem(this.KEYS.quizzes) || '{}');
      quizzes[sectionId] = { score, total, date: new Date().toISOString() };
      localStorage.setItem(this.KEYS.quizzes, JSON.stringify(quizzes));
    } catch(_) {}
  },

  loadQuizScore(sectionId) {
    try {
      const quizzes = JSON.parse(localStorage.getItem(this.KEYS.quizzes) || '{}');
      return quizzes[sectionId] || null;
    } catch(_) { return null; }
  },

  // ── Reset (for debugging/testing) ────────────────────────────
  reset() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    // Also wipe notes and quiz scores for all known sections
    ['statistics','linear-algebra','calculus','optimization','info-theory'].forEach(id => {
      localStorage.removeItem('dsmath_notes_' + id);
    });
    location.reload();
  }
};

// ── Patch App.addXP to also persist ──────────────────────────────
// We wait for App to be defined (this file loads before DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
  const _origAddXP = App.addXP.bind(App);
  App.addXP = function(amount) {
    _origAddXP(amount);
    Persistence.saveXP(App.xp);
  };
});
