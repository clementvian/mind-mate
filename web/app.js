/**
 * MindMate Web - Reactive Application Logic
 * Role-based: Teacher → teacher.html | Student → index.html
 */

(function () {
  'use strict';

  // ─── Session Guard ──────────────────────────────────────────
  // Read auth from localStorage (persistent across orientation changes).
  // Use sessionStorage as a same-tab flag to prevent redundant redirects
  // if the browser re-evaluates scripts on orientation/resize events.
  const SESSION = JSON.parse(localStorage.getItem('mm_session') || 'null');
  if (!SESSION) {
    if (!sessionStorage.getItem('mm_redirecting')) {
      sessionStorage.setItem('mm_redirecting', '1');
      window.location.replace('/login.html');
    }
    return;
  }
  sessionStorage.removeItem('mm_redirecting');
  if (SESSION.role === 'teacher') { window.location.replace('/teacher.html'); return; }
  // At this point: student role confirmed

  // No preloaded data — journal entries, sessions and routines start empty
  const INITIAL_ENTRIES = [];
  const INITIAL_STUDY_SESSIONS = [];
  const ROUTINE_ITEMS = [];


  // --- App State ---
  const state = {
    viewMode: localStorage.getItem('mm_view_mode') || 'desktop',
    activeTab: 'hub',
    currentFilter: 'All',
    journalEntries: JSON.parse(localStorage.getItem('mm_entries')) || INITIAL_ENTRIES,
    studySessions: JSON.parse(localStorage.getItem('mm_sessions')) || INITIAL_STUDY_SESSIONS,
    todayMinutes: 0,
    targetMinutes: JSON.parse(localStorage.getItem('mm_dev_cfg') || '{}').targetMinutes || 240,
    streak: 0,
    stabilityScore: 0,
    stepperHours: 1,
    stepperMins: 30,
    selectedSubject: 'COMPETITIVE_PROGRAMMING',
    devConfig: (function() {
      const saved = JSON.parse(localStorage.getItem('mm_dev_cfg') || 'null');
      if (saved && saved.leetCodeUser) return saved;
      return { leetCodeUser: (saved && saved.leetCodeUser) || 'clementvian', githubUser: (saved && saved.githubUser) || 'clementvian', targetMinutes: (saved && saved.targetMinutes) || 240 };
    })(),
    // Timer state
    timerActive: false,
    timerSeconds: 25 * 60,
    timerInterval: null
  };

  // --- DOM Elements ---
  const appContainer = document.getElementById('app-container');
  const viewModeToggle = document.getElementById('view-mode-toggle');
  const frameIcon = document.getElementById('frame-icon');
  const statusClock = document.getElementById('status-clock');
  const toastContainer = document.getElementById('toast-container');

  // Navigation
  const navTabs = document.querySelectorAll('.nav-tab');
  const phoneNavItems = document.querySelectorAll('.phone-nav-item');
  const screenViews = document.querySelectorAll('.screen-view');

  // Hub Elements
  const hubEntriesList = document.getElementById('hub-entries-list');
  const hubFilterPills = document.getElementById('hub-filter-pills');
  const entriesCountPill = document.getElementById('entries-count-pill');
  const btnStartJournaling = document.getElementById('btn-start-journaling');
  const btnQuickNewEntry = document.getElementById('btn-quick-new-entry');
  const btnSeeMoreInsights = document.getElementById('btn-see-more-insights');

  // Study Logger Elements
  const studySubjectSelect = document.getElementById('study-subject-select');
  const stepperHoursVal = document.getElementById('stepper-hours-val');
  const stepperMinsVal = document.getElementById('stepper-mins-val');
  const btnHoursMinus = document.getElementById('btn-hours-minus');
  const btnHoursPlus = document.getElementById('btn-hours-plus');
  const btnMinsMinus = document.getElementById('btn-mins-minus');
  const btnMinsPlus = document.getElementById('btn-mins-plus');
  const btnLogStudySession = document.getElementById('btn-log-study-session');
  const btnLogTotalTime = document.getElementById('btn-log-total-time');
  const studyTodaySummary = document.getElementById('study-today-summary');
  const loggerGaugeStroke = document.getElementById('logger-gauge-stroke');
  const loggerGaugePct = document.getElementById('logger-gauge-pct');
  const productivityGaugeVal = document.getElementById('productivity-gauge-val');
  const productivityPercent = document.getElementById('productivity-percent');

  // Modals
  const modalCreateEntry = document.getElementById('modal-create-entry');
  const btnCloseCreateModal = document.getElementById('btn-close-create-modal');
  const btnCancelEntry = document.getElementById('btn-cancel-entry');
  const createEntryForm = document.getElementById('create-entry-form');
  const entryTitleInput = document.getElementById('entry-title-input');
  const entryContentInput = document.getElementById('entry-content-input');
  const entryMoodButtons = document.querySelectorAll('#entry-mood-buttons .mood-choice');
  const crisisAlertBox = document.getElementById('crisis-alert-box');

  const modalDevConfig = document.getElementById('modal-dev-config');
  const btnCloseDevModal = document.getElementById('btn-close-dev-modal');
  const btnCancelDevCfg = document.getElementById('btn-cancel-dev-cfg');
  const devConfigForm = document.getElementById('dev-config-form');
  const btnOpenDevConfig = document.getElementById('btn-open-dev-config');
  const btnDevHubSetupTrigger = document.getElementById('btn-dev-hub-setup-trigger');

  // Dev Timer Elements
  const focusTimerText = document.getElementById('focus-timer-text');
  const btnTimerToggle = document.getElementById('btn-timer-toggle');
  const btnTimerReset = document.getElementById('btn-timer-reset');

  // --- Helpers & UI Sync ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function updateClock() {
    if (!statusClock) return;
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    hours = hours % 12 || 12;
    statusClock.textContent = `${hours}:${minutes}`;
  }

  // --- View Mode ---
  function applyViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem('mm_view_mode', mode);
    if (mode === 'phone') {
      appContainer.classList.remove('mode-desktop');
      appContainer.classList.add('mode-phone');
      frameIcon.innerHTML = `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`;
      showToast('Switched to Android Mobile View (Pixel 10 Frame)');
    } else {
      appContainer.classList.remove('mode-phone');
      appContainer.classList.add('mode-desktop');
      frameIcon.innerHTML = `<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>`;
      showToast('Switched to Fluid Desktop Dashboard View');
    }
  }

  // --- Tab Navigation ---
  function switchTab(tabId) {
    state.activeTab = tabId;

    // Desktop nav buttons
    navTabs.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Mobile nav buttons
    phoneNavItems.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Screen views
    screenViews.forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    // Render tab-specific elements if needed
    if (tabId === 'journal') renderJournalFullGrid();
    if (tabId === 'insights') renderInsightsCharts();
    if (tabId === 'dev') renderDevHubHistory();
    if (tabId === 'schedule') renderScheduleTimeline();
    if (tabId === 'dev') requestAnimationFrame(centerDateStrip);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Render Entries on Hub ---
  function renderHubEntries() {
    if (!hubEntriesList) return;
    const filtered = state.currentFilter === 'All'
      ? state.journalEntries
      : state.journalEntries.filter(e => e.mood.toLowerCase() === state.currentFilter.toLowerCase());

    entriesCountPill.textContent = `${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}`;

    if (filtered.length === 0) {
      hubEntriesList.innerHTML = `
        <div class="glass-card" style="padding: 24px; text-align: center; color: var(--text-secondary);">
          <p>No reflections recorded for "${state.currentFilter}".</p>
        </div>
      `;
      return;
    }

    hubEntriesList.innerHTML = filtered.map(entry => `
      <article class="glass-card entry-item-card" data-entry-id="${entry.id}">
        <div class="entry-card-header">
          <span class="entry-mood-badge mood-${entry.mood.toLowerCase()}">
            <span>${entry.mood}</span>
          </span>
          <span class="entry-date-time">${entry.date}</span>
        </div>
        <h4 class="entry-card-title">${escapeHtml(entry.title)}</h4>
        <p class="entry-card-preview">${escapeHtml(entry.content)}</p>
      </article>
    `).join('');

    // Attach click listeners to view detail
    hubEntriesList.querySelectorAll('.entry-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = Number(card.getAttribute('data-entry-id'));
        const entry = state.journalEntries.find(e => e.id === id);
        if (entry) {
          showToast(`Viewing: ${entry.title}`);
        }
      });
    });
  }

  function renderJournalFullGrid(searchTerm = '', moodFilter = 'All') {
    const grid = document.getElementById('journal-full-grid');
    if (!grid) return;

    let list = state.journalEntries;
    if (moodFilter !== 'All') {
      list = list.filter(e => e.mood.toLowerCase() === moodFilter.toLowerCase());
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q));
    }

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="glass-card" style="grid-column: 1 / -1; padding: 36px; text-align: center; color: var(--text-secondary);">
          <p style="font-size: 1.1rem; margin-bottom: 8px;">No matching reflections found.</p>
          <small>Try a different keyword or filter.</small>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(entry => `
      <article class="glass-card entry-item-card" style="padding: 22px;">
        <div class="entry-card-header">
          <span class="entry-mood-badge mood-${entry.mood.toLowerCase()}">
            <span>${entry.mood}</span>
          </span>
          <span class="entry-date-time">${entry.date}</span>
        </div>
        <h3 class="entry-card-title" style="margin-top: 6px;">${escapeHtml(entry.title)}</h3>
        <p class="entry-card-preview" style="-webkit-line-clamp: 4;">${escapeHtml(entry.content)}</p>
      </article>
    `).join('');
  }

  // --- Study Logger Logic ---
  function updateStudyLoggerUI() {
    stepperHoursVal.textContent = state.stepperHours;
    stepperMinsVal.textContent = state.stepperMins;

    const totalStepMinutes = state.stepperHours * 60 + state.stepperMins;
    const h = Math.floor(totalStepMinutes / 60);
    const m = totalStepMinutes % 60;
    btnLogTotalTime.textContent = `${h}h ${m}m`;

    // Today's summary
    const todayH = Math.floor(state.todayMinutes / 60);
    const todayM = state.todayMinutes % 60;
    const targetH = Math.floor(state.targetMinutes / 60);
    studyTodaySummary.textContent = `${todayH}h ${todayM}m of ${targetH}h today`;

    // Progress percentage
    const pct = Math.min(100, Math.round((state.todayMinutes / state.targetMinutes) * 100));
    loggerGaugePct.textContent = `${pct}%`;
    loggerGaugeStroke.setAttribute('stroke-dasharray', `${pct}, 100`);

    // Hub Productivity Gauge
    const prodScore = Math.min(100, Math.round((state.todayMinutes / state.targetMinutes) * 80 + 15));
    productivityPercent.textContent = `${prodScore}%`;
    productivityGaugeVal.setAttribute('stroke-dasharray', `${prodScore}, 100`);
  }

  function logStudySession() {
    const minutes = state.stepperHours * 60 + state.stepperMins;
    if (minutes <= 0) {
      showToast('Please select at least 15 minutes to log.', 'warning');
      return;
    }

    const subjectLabels = {
      COMPETITIVE_PROGRAMMING: "Competitive Programming (LeetCode)",
      SYSTEM_DESIGN: "System Design & Architecture",
      ANDROID_DEV: "Android & Jetpack Compose",
      FULLSTACK_WEB: "Modern Web & React",
      MACHINE_LEARNING: "Machine Learning & Data",
      DEVOPS: "Cloud & DevOps"
    };

    const newSession = {
      id: Date.now(),
      subject: subjectLabels[state.selectedSubject] || state.selectedSubject,
      minutes: minutes,
      time: "Just now"
    };

    state.studySessions.unshift(newSession);
    state.todayMinutes += minutes;

    localStorage.setItem('mm_sessions', JSON.stringify(state.studySessions));
    updateStudyLoggerUI();
    renderDevHubHistory();
    showToast(`Logged ${Math.floor(minutes / 60)}h ${minutes % 60}m of focus time! `, 'success');
  }

  // --- Insights & Charts Rendering ---
  function renderInsightsCharts() {
    const weeklyContainer = document.getElementById('weekly-mood-bars');
    if (!weeklyContainer) return;

    const days = [
      { day: "Mon", score: 65 },
      { day: "Tue", score: 80 },
      { day: "Wed", score: 72 },
      { day: "Thu", score: 88 },
      { day: "Fri", score: 70 },
      { day: "Sat", score: 92 },
      { day: "Sun", score: 85 }
    ];

    weeklyContainer.innerHTML = days.map(d => `
      <div class="day-bar-col">
        <div class="bar-pill" style="height: ${d.score}%;" title="${d.day}: ${d.score}% stability"></div>
        <span class="day-name">${d.day}</span>
      </div>
    `).join('');

    const emotionsContainer = document.getElementById('emotions-distribution-bars');
    if (!emotionsContainer) return;

    const emotions = [
      { name: "Joyful & Accomplished", pct: 45, color: "#10b981" },
      { name: "Focused Calm", pct: 28, color: "#8b5cf6" },
      { name: "High Energy", pct: 15, color: "#a78bfa" },
      { name: "Work Fatigue / Stress", pct: 12, color: "#f59e0b" }
    ];

    emotionsContainer.innerHTML = emotions.map(e => `
      <div class="emotion-dist-row">
        <div class="emotion-dist-meta">
          <span>${e.name}</span>
          <span>${e.pct}%</span>
        </div>
        <div class="dist-bar-track">
          <div class="dist-bar-fill" style="width: ${e.pct}%; background: ${e.color};"></div>
        </div>
      </div>
    `).join('');
  }

  // --- Dev Hub Sessions & Heatmap ---
  function renderDevHubHistory() {
    const container = document.getElementById('study-history-items');
    if (!container) return;

    if (state.studySessions.length === 0) {
      container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No study sessions logged yet.</p>`;
      return;
    }

    container.innerHTML = state.studySessions.map(s => `
      <div class="history-item">
        <div>
          <strong>${escapeHtml(s.subject)}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${s.time}</div>
        </div>
        <span class="history-time-tag">${Math.floor(s.minutes / 60)}h ${s.minutes % 60}m</span>
      </div>
    `).join('');

    // GitHub Heatmap dots
    const dotsContainer = document.getElementById('gh-heatmap-dots');
    if (dotsContainer && dotsContainer.children.length === 0) {
      let dotsHtml = '';
      for (let i = 0; i < 28; i++) {
        const lvl = Math.floor(Math.random() * 5);
        dotsHtml += `<div class="heatmap-dot ${lvl > 0 ? `lvl-${lvl}` : ''}" title="Day ${i + 1}: ${lvl * 2} commits"></div>`;
      }
      dotsContainer.innerHTML = dotsHtml;
    }
  }

  // --- Date strip (Study screen) ---
  function renderDateStrip() {
    const strip = document.getElementById('date-strip');
    if (!strip) return;
    const today = new Date();
    strip.innerHTML = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - 6 + i);
      const sel = i === 6;
      return `<button type="button" class="date-chip${sel ? ' active' : ''}" role="tab" aria-selected="${sel}">
        <span class="dow">${d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
        <span class="dom">${d.getDate()}</span>
      </button>`;
    }).join('');
    strip.addEventListener('click', e => {
      const chip = e.target.closest('.date-chip');
      if (!chip) return;
      strip.querySelectorAll('.date-chip').forEach(c => { c.classList.toggle('active', c === chip); c.setAttribute('aria-selected', c === chip); });
    });
    centerDateStrip();
  }

  // The Study screen is hidden at init (offsets are 0), so this also runs when it is opened.
  function centerDateStrip() {
    const strip = document.getElementById('date-strip');
    const active = strip && strip.querySelector('.active');
    if (active && strip.clientWidth) strip.scrollLeft = active.offsetLeft - strip.clientWidth / 2 + active.offsetWidth / 2;
  }

  // --- Schedule Rendering ---
  function renderScheduleTimeline() {
    const container = document.getElementById('schedule-timeline-container');
    if (!container) return;

    container.innerHTML = ROUTINE_ITEMS.map(item => `
      <div class="tl-row">
       <div class="tl-time">${item.time}</div>
       <div class="glass-card schedule-item-card">
        <div class="schedule-content">
          <h4 class="schedule-title" style="${item.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHtml(item.title)}</h4>
          <p class="schedule-desc">${escapeHtml(item.desc)}</p>
        </div>
        <div class="schedule-check ${item.completed ? 'completed' : ''}" data-task-id="${item.id}">
          ${item.completed ? '✓' : ''}
        </div>
       </div>
      </div>
    `).join('');

    container.querySelectorAll('.schedule-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-task-id'));
        const item = ROUTINE_ITEMS.find(i => i.id === id);
        if (item) {
          item.completed = !item.completed;
          renderScheduleTimeline();
          showToast(item.completed ? `Completed: ${item.title}` : `Marked incomplete`);
        }
      });
    });
  }

  // --- Vulnerability Keywords & Teacher Alert System ---
  const CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'end my life', 'hurt myself', 'want to die',
    "can't go on", 'hopeless', 'end it all', 'self harm', 'no reason to live',
    'worthless', 'nobody cares', 'give up on life', 'not safe', 'harming myself'
  ];

  function checkCrisisKeywords(text) {
    const lower = text.toLowerCase();
    return CRISIS_KEYWORDS.some(w => lower.includes(w));
  }

  function getMatchedKeywords(text) {
    const lower = text.toLowerCase();
    return CRISIS_KEYWORDS.filter(w => lower.includes(w));
  }

  async function pushToSheets(action, payload) {
    try {
      const url = `${window.API_BASE || ''}/api/sheets?action=${encodeURIComponent(action)}&data=${encodeURIComponent(JSON.stringify(payload))}`;
      await fetch(url);
      return true;
    } catch(e) { return false; }
  }

  function triggerVulnerabilityAlert(title, content, mood) {
    const keywords = getMatchedKeywords(content);
    if (keywords.length === 0) return;
    const alert = {
      id: 'alert_' + Date.now(),
      studentUser: SESSION.user,
      studentName: SESSION.name,
      timestamp: Date.now(),
      title, mood,
      excerpt: content.substring(0, 120) + (content.length > 120 ? '…' : ''),
      fullContent: content,
      keywords,
      resolved: false
    };
    const existing = JSON.parse(localStorage.getItem('mm_vulnerability_alerts') || '[]');
    existing.push(alert);
    localStorage.setItem('mm_vulnerability_alerts', JSON.stringify(existing));
    // Push to Sheets for teacher record
    pushToSheets('vulnerability_alert', alert);
    return alert;
  }

  function logJournalEntry(entry, hasAlert) {
    const log = JSON.parse(localStorage.getItem('mm_journal_log') || '[]');
    log.push({
      studentUser: SESSION.user,
      studentName: SESSION.name,
      timestamp: Date.now(),
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      hasAlert
    });
    localStorage.setItem('mm_journal_log', JSON.stringify(log));
    pushToSheets('journal_entry', { studentUser: SESSION.user, studentName: SESSION.name, title: entry.title, mood: entry.mood, hasAlert, timestamp: Date.now() });
  }

  // --- Safety Utility ---
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Live API Integration (LeetCode & GitHub) ---
  const LANG_COLORS = {
    'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Python': '#3572A5', 'Java': '#b07219',
    'Kotlin': '#A97BFF', 'C++': '#f34b7d', 'C': '#555555', 'C#': '#178600', 'Go': '#00ADD8',
    'Rust': '#dea584', 'Dart': '#00B4AB', 'Swift': '#F05138', 'PHP': '#4F5D95', 'Ruby': '#701516',
    'HTML': '#e34c26', 'CSS': '#563d7c', 'Shell': '#89e051'
  };

  // --- Live coding activity (GitHub / LeetCode / third profile) via /api/activity ---
  let activityData = null;
  const ACT_STRIP_DAYS = 14;

  function activityUsers() {
    return { github: state.devConfig.githubUser, leetcode: state.devConfig.leetCodeUser, third: state.devConfig.thirdUser };
  }

  function retryButton() {
    return ` <button type="button" class="btn-ghost-sm" data-retry-activity>Retry</button>`;
  }

  function timeAgo(ms) {
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.round(m / 60)}h ago`;
    return `${Math.round(m / 1440)}d ago`;
  }

  function setActivityLoading(on) {
    document.querySelectorAll('.att-strip').forEach(s => s.classList.toggle('skeleton', on));
    const lcOverlay = document.getElementById('lc-loading-overlay');
    const lcContent = document.getElementById('lc-live-content');
    if (on && !activityData) {
      if (lcOverlay) lcOverlay.style.display = 'flex';
      if (lcContent) lcContent.style.display = 'none';
    }
    const btn = document.getElementById('btn-refresh-activity');
    if (btn) { btn.disabled = on; btn.classList.toggle('is-loading', on); }
  }

  async function refreshActivity({ force = false } = {}) {
    setActivityLoading(true);
    try {
      activityData = await ActivityService.load(activityUsers(), { force });
    } catch (err) {
      console.error('Activity fetch failed:', err);
      activityData = { error: err.message || 'Could not reach the activity service' };
    }
    renderLeetCode();
    renderGitHub();
    renderAttendanceRows();
    renderCorrelation();
    setActivityLoading(false);
  }

  // Entry points used by init and the Setup dialog; both share one cached request.
  function fetchLiveLeetCode() { return refreshActivity(); }
  function fetchLiveGitHub() { return refreshActivity(); }

  function renderLeetCode() {
    const $ = id => document.getElementById(id);
    const p = activityData && activityData.profiles && activityData.profiles.leetcode;
    const cleanUser = (state.devConfig.leetCodeUser || '').replace(/^@/, '');
    if ($('lc-username-tag')) $('lc-username-tag').textContent = `@${(p && p.username) || cleanUser}`;
    if ($('lc-loading-overlay')) $('lc-loading-overlay').style.display = 'none';

    const err = $('lc-live-error');
    if (!p || p.status !== 'ok') {
      if ($('lc-live-content')) $('lc-live-content').style.display = 'none';
      if (err) {
        err.innerHTML = escapeHtml(p ? ActivityService.errorText(p) : (activityData && activityData.error) || 'No data') + retryButton();
        err.style.display = 'block';
      }
      return;
    }
    if (err) { err.style.display = 'none'; err.textContent = ''; }
    const d = p.details;
    $('lc-easy-count').textContent = d.easy;
    $('lc-medium-count').textContent = d.medium;
    $('lc-hard-count').textContent = d.hard;
    $('lc-total-solved').textContent = d.total;
    $('lc-contest-rating').textContent = d.contestRating ? Math.round(d.contestRating) : (d.ranking ? d.ranking.toLocaleString() : 'N/A');
    $('lc-contest-rank').textContent = d.contestRank ? d.contestRank.toLocaleString() : (d.contributionPoint != null ? d.contributionPoint.toLocaleString() : 'N/A');
    $('lc-contest-attended').textContent = d.contestsAttended ?? p.totalActiveDays ?? 0;
    const last = d.recent && d.recent[0];
    $('lc-api-source').textContent = last ? `Last submission: ${last.title} · ${last.at ? timeAgo(last.at) : ''}` : 'leetcode.com/graphql';

    // "Active Solver" = any submission in the last 7 days (IST)
    const active = p.days.slice(-7).some(x => x.present);
    const activeText = $('lc-active-text');
    if (activeText) activeText.textContent = active ? 'Active Solver' : 'Inactive';

    // Recent submissions feed (latest 3)
    const feed = $('lc-recent-list');
    if (feed) {
      feed.innerHTML = (d.recent || []).slice(0, 3).map(r => `
        <a class="lc-recent-item" ${r.slug ? `href="https://leetcode.com/problems/${encodeURIComponent(r.slug)}/" target="_blank" rel="noreferrer"` : ''}>
          <span class="lc-recent-title">${escapeHtml(r.title)}</span>
          <span class="lc-recent-meta${/^accepted$/i.test(r.status) ? ' ok' : ''}">${escapeHtml(r.status || r.lang || '')}</span>
        </a>`).join('');
    }
    const badge = $('profile-badge-leetcode');
    if (badge) badge.textContent = `${d.total} LeetCode Solved`;

    const strip = $('lc-att-strip');
    if (strip) strip.innerHTML = ActivityService.stripHTML(p, ACT_STRIP_DAYS) +
      `<span class="att-caption">${p.currentStreak}-day streak</span>`;
    $('lc-live-content').style.display = 'block';
  }

  function renderGitHub() {
    const $ = id => document.getElementById(id);
    const p = activityData && activityData.profiles && activityData.profiles.github;
    const cleanUser = (state.devConfig.githubUser || '').replace(/^@/, '');
    if ($('gh-username-tag')) $('gh-username-tag').textContent = `@${(p && p.username) || cleanUser}`;
    const list = $('gh-live-repos-list');
    const note = $('gh-limited-note');

    if (!p || p.status !== 'ok') {
      if ($('gh-name-val')) $('gh-name-val').textContent = p && p.status === 'rate_limited' ? 'Rate Limited' : 'Unavailable';
      ['gh-repos-count', 'gh-followers-count', 'gh-following-count'].forEach(id => { if ($(id)) $(id).textContent = '--'; });
      if ($('gh-att-strip')) $('gh-att-strip').innerHTML = '';
      if (note) note.style.display = 'none';
      if (list) list.innerHTML = `<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:.85rem;">${escapeHtml(p ? ActivityService.errorText(p) : (activityData && activityData.error) || 'No data')}${retryButton()}</div>`;
      return;
    }
    const d = p.details;
    const fmt = n => (n || 0) >= 1000 ? `${(n / 1000).toFixed(1)}k` : (n ?? 0);
    $('gh-name-val').textContent = d.name;
    if (d.avatar) $('gh-avatar-img').src = d.avatar;
    $('gh-repos-count').textContent = d.repos ?? 0;
    $('gh-repos-badge').textContent = `${d.repos ?? 0} Repos`;
    $('gh-followers-count').textContent = fmt(d.followers);
    $('gh-following-count').textContent = d.following ?? 0;
    const bio = $('gh-bio-val');
    if (bio) { bio.textContent = d.bio || ''; bio.style.display = d.bio ? 'block' : 'none'; }
    const link = $('gh-profile-link');
    if (link && d.url) { link.href = d.url; link.textContent = `@${p.username}`; }

    const strip = $('gh-att-strip');
    if (strip) strip.innerHTML = ActivityService.stripHTML(p, ACT_STRIP_DAYS) +
      `<span class="att-caption">${p.currentStreak}-day streak</span>`;
    if (note) note.style.display = p.limited ? 'block' : 'none';

    if (!list) return;
    if (!d.topRepos.length) {
      list.innerHTML = `<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:.85rem;">No public repositories found for @${escapeHtml(p.username)}.</div>`;
      return;
    }
    list.innerHTML = d.topRepos.map(repo => {
      const langColor = LANG_COLORS[repo.language] || 'var(--primary)';
      return `
        <a href="${repo.url}" target="_blank" rel="noreferrer" class="gh-repo-card">
          <div class="gh-repo-header">
            <span class="gh-repo-name">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              ${escapeHtml(repo.name)}
            </span>
            <div class="gh-repo-meta">
              ${repo.language ? `<span class="gh-lang-pill"><span class="gh-lang-dot" style="background:${langColor};"></span>${escapeHtml(repo.language)}</span>` : ''}
              <span class="gh-stars-pill">${fmt(repo.stars)}</span>
            </div>
          </div>
          ${repo.description ? `<p class="gh-repo-desc">${escapeHtml(repo.description)}</p>` : ''}
        </a>`;
    }).join('');
  }

  // Attendance card: one strip per profile + combined
  function renderAttendanceRows() {
    const host = document.getElementById('activity-rows');
    if (!host) return;
    const profiles = activityData && activityData.profiles;
    if (!profiles) {
      host.innerHTML = `<div class="att-row"><span class="att-caption">${escapeHtml((activityData && activityData.error) || 'No data')}</span>${retryButton()}</div>`;
      return;
    }
    const rows = [
      ['Overall', activityData.combined],
      ['GitHub', profiles.github],
      ['LeetCode', profiles.leetcode],
      [profiles.third.platform === 'codeforces' ? 'Codeforces' : 'Third', profiles.third]
    ];
    host.innerHTML = rows.map(([label, p]) => {
      if (p.status !== 'ok') {
        if (/not set/.test(p.error || '')) return '';
        return `<div class="att-row"><span class="att-label">${label}</span><span class="att-caption">${escapeHtml(ActivityService.errorText(p))}</span></div>`;
      }
      const empty = p.totalActiveDays === 0;
      return `<div class="att-row"><span class="att-label">${label}</span>
        <span class="att-strip">${ActivityService.stripHTML(p, ACT_STRIP_DAYS)}</span>
        <span class="att-caption">${empty ? 'No activity yet' : `${p.currentStreak}d`}</span></div>`;
    }).join('');
  }

  // Analytics correlation: daily coding activity vs. daily journal mood (both bucketed by IST)
  function renderCorrelation() {
    const card = document.getElementById('correlation-card');
    if (!card) return;
    const badge = card.querySelector('.correlation-score-badge');
    const fill = card.querySelector('.trend-fill');
    const text = card.querySelector('.correlation-insight-text');
    const combined = activityData && activityData.combined;
    if (!combined || combined.status !== 'ok') {
      badge.textContent = 'No data'; fill.style.width = '0%';
      text.textContent = 'Connect at least one coding profile to see how activity relates to your mood.';
      return;
    }
    const istKey = ms => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(ms));
    const MOOD = { Happy: 1, Excited: 0.9, Calm: 0.8, Neutral: 0.5, Anxious: 0.25, Sad: 0 };
    const moodByDay = {};
    state.journalEntries.forEach(e => {
      if (!(e.id > 1e12) || MOOD[e.mood] === undefined) return;
      const k = istKey(e.id);
      (moodByDay[k] = moodByDay[k] || []).push(MOOD[e.mood]);
    });
    const codeByDay = Object.fromEntries(combined.days.map(d => [d.date, d.count]));
    const pairs = Object.entries(moodByDay).map(([day, arr]) => [codeByDay[day] || 0, arr.reduce((a, b) => a + b, 0) / arr.length]);
    if (pairs.length < 5) {
      badge.textContent = 'Need 5+ days'; fill.style.width = '0%';
      text.textContent = `Journal on at least 5 different days to unlock this. Right now: ${pairs.length}.`;
      return;
    }
    const n = pairs.length;
    const mx = pairs.reduce((a, p) => a + p[0], 0) / n, my = pairs.reduce((a, p) => a + p[1], 0) / n;
    const sxy = pairs.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
    const sxx = pairs.reduce((a, p) => a + (p[0] - mx) ** 2, 0), syy = pairs.reduce((a, p) => a + (p[1] - my) ** 2, 0);
    const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    const label = Math.abs(r) >= 0.6 ? 'Strong' : Math.abs(r) >= 0.3 ? 'Moderate' : 'Weak';
    badge.textContent = `${r >= 0 ? '+' : ''}${r.toFixed(2)} ${label}`;
    fill.style.width = `${Math.round(Math.abs(r) * 100)}%`;
    const avg = arr => arr.length ? Math.round(arr.reduce((a, p) => a + p[1], 0) / arr.length * 100) : null;
    const on = avg(pairs.filter(p => p[0] > 0)), off = avg(pairs.filter(p => p[0] === 0));
    text.innerHTML = on !== null && off !== null
      ? `<strong>Your data:</strong> on days you coded, mood averaged <strong>${on}%</strong> vs <strong>${off}%</strong> on days you did not (${n} journal days).`
      : `<strong>Your data:</strong> based on ${n} journal days; not enough variety in coding activity to compare yet.`;
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-retry-activity]') || e.target.closest('#btn-refresh-activity')) refreshActivity({ force: true });
  });

  // --- Setup Event Listeners ---
  function setupEventListeners() {
    // Clock
    setInterval(updateClock, 1000);
    updateClock();

    // View Mode Switch (Desktop Wide vs Phone Frame)
    viewModeToggle.addEventListener('click', () => {
      applyViewMode(state.viewMode === 'desktop' ? 'phone' : 'desktop');
    });

    // Navigation Tabs
    navTabs.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
    });

    phoneNavItems.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
    });

    document.getElementById('brand-logo').addEventListener('click', () => switchTab('hub'));
    document.getElementById('header-avatar-trigger').addEventListener('click', () => switchTab('profile'));
    document.getElementById('btn-user-avatar').addEventListener('click', () => switchTab('profile'));
    btnSeeMoreInsights.addEventListener('click', () => switchTab('insights'));

    // Hub Filter Pills
    hubFilterPills.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        hubFilterPills.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentFilter = btn.getAttribute('data-filter');
        renderHubEntries();
      });
    });

    // Journal Search and Filter
    const journalSearchInput = document.getElementById('journal-search-input');
    const journalFilterPills = document.getElementById('journal-filter-pills');

    if (journalSearchInput) {
      journalSearchInput.addEventListener('input', () => {
        const activePill = journalFilterPills.querySelector('.pill-btn.active');
        const filter = activePill ? activePill.getAttribute('data-filter') : 'All';
        renderJournalFullGrid(journalSearchInput.value, filter);
      });
    }

    if (journalFilterPills) {
      journalFilterPills.querySelectorAll('.pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          journalFilterPills.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filter = btn.getAttribute('data-filter');
          const query = journalSearchInput ? journalSearchInput.value : '';
          renderJournalFullGrid(query, filter);
        });
      });
    }

    // Stepper Controls
    btnHoursMinus.addEventListener('click', () => {
      if (state.stepperHours > 0) {
        state.stepperHours--;
        updateStudyLoggerUI();
      }
    });

    btnHoursPlus.addEventListener('click', () => {
      if (state.stepperHours < 12) {
        state.stepperHours++;
        updateStudyLoggerUI();
      }
    });

    btnMinsMinus.addEventListener('click', () => {
      if (state.stepperMins >= 15) {
        state.stepperMins -= 15;
      } else if (state.stepperHours > 0) {
        state.stepperHours--;
        state.stepperMins = 45;
      }
      updateStudyLoggerUI();
    });

    btnMinsPlus.addEventListener('click', () => {
      if (state.stepperMins <= 45) {
        state.stepperMins += 15;
      } else {
        state.stepperHours++;
        state.stepperMins = 0;
      }
      updateStudyLoggerUI();
    });

    studySubjectSelect.addEventListener('change', (e) => {
      state.selectedSubject = e.target.value;
    });

    btnLogStudySession.addEventListener('click', () => {
      if (btnLogStudySession.classList.contains('is-loading')) return;
      btnLogStudySession.classList.add('is-loading');
      try { logStudySession(); } finally {
        setTimeout(() => btnLogStudySession.classList.remove('is-loading'), 450);
      }
    });

    // Modal: Create Entry
    function openCreateModal() {
      modalCreateEntry.classList.add('active');
      entryTitleInput.value = '';
      entryContentInput.value = '';
      crisisAlertBox.style.display = 'none';
      entryTitleInput.focus();
    }

    function closeCreateModal() {
      modalCreateEntry.classList.remove('active');
    }

    btnStartJournaling.addEventListener('click', openCreateModal);
    btnQuickNewEntry.addEventListener('click', openCreateModal);
    document.getElementById('btn-open-create-entry').addEventListener('click', openCreateModal);
    btnCloseCreateModal.addEventListener('click', closeCreateModal);
    btnCancelEntry.addEventListener('click', closeCreateModal);

    // Mood Selector in Modal
    entryMoodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        entryMoodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Real-time sentiment / crisis check
    entryContentInput.addEventListener('input', () => {
      const isDistressed = checkCrisisKeywords(entryContentInput.value);
      crisisAlertBox.style.display = isDistressed ? 'flex' : 'none';
    });

    // Save Entry Form
    createEntryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = entryTitleInput.value.trim();
      const content = entryContentInput.value.trim();
      const activeMoodBtn = document.querySelector('#entry-mood-buttons .mood-choice.active');
      const mood = activeMoodBtn ? activeMoodBtn.getAttribute('data-mood') : 'Happy';

      if (!title || !content) return;

      const newEntry = {
        id: Date.now(),
        title,
        content,
        mood,
        date: "Just now",
        timestamp: Date.now()
      };

      state.journalEntries.unshift(newEntry);
      localStorage.setItem('mm_entries', JSON.stringify(state.journalEntries));

      // --- Vulnerability Detection & Teacher Notification ---
      const isCrisis = checkCrisisKeywords(content);
      if (isCrisis) {
        triggerVulnerabilityAlert(title, content, mood);
        showToast('We noticed something concerning. Your teacher has been notified and support is on the way. You are not alone. ', 'crisis');
      }

      // Log every entry to teacher dashboard
      logJournalEntry(newEntry, isCrisis);

      renderHubEntries();
      if (state.activeTab === 'journal') renderJournalFullGrid();
      closeCreateModal();
      if (!isCrisis) showToast('Reflection saved to your MindMate Journal! ', 'success');
    });


    // Modal: Dev Config
    function openDevConfigModal() {
      modalDevConfig.classList.add('active');
      const lcInput = document.getElementById('cfg-leetcode-user');
      const ghInput = document.getElementById('cfg-github-user');
      const targetInput = document.getElementById('cfg-daily-target');
      if (lcInput) lcInput.value = state.devConfig.leetCodeUser || '';
      if (ghInput) ghInput.value = state.devConfig.githubUser || '';
      if (targetInput) targetInput.value = state.targetMinutes || 240;
    }

    function closeDevConfigModal() {
      modalDevConfig.classList.remove('active');
    }

    btnOpenDevConfig.addEventListener('click', openDevConfigModal);
    btnDevHubSetupTrigger.addEventListener('click', openDevConfigModal);
    btnCloseDevModal.addEventListener('click', closeDevConfigModal);
    btnCancelDevCfg.addEventListener('click', closeDevConfigModal);

    devConfigForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const lcUser = document.getElementById('cfg-leetcode-user').value.trim().replace(/^@/, '') || 'clementvian';
      const ghUser = document.getElementById('cfg-github-user').value.trim().replace(/^@/, '') || 'clementvian';
      const targetMin = Number(document.getElementById('cfg-daily-target').value) || 240;

      state.devConfig = { leetCodeUser: lcUser, githubUser: ghUser, targetMinutes: targetMin };
      state.targetMinutes = targetMin;
      localStorage.setItem('mm_dev_cfg', JSON.stringify(state.devConfig));

      updateStudyLoggerUI();
      closeDevConfigModal();

      // Immediately fetch live data with the new usernames
      if (lcUser) {
        fetchLiveLeetCode(lcUser);
        showToast(`Fetching LeetCode data for @${lcUser}...`, 'info');
      }
      if (ghUser) {
        fetchLiveGitHub(ghUser);
        if (lcUser) showToast(`Also fetching GitHub for @${ghUser}...`, 'info');
        else showToast(`Fetching GitHub data for @${ghUser}...`, 'info');
      }
      if (!lcUser && !ghUser) showToast('No usernames set. Enter a LeetCode or GitHub handle.', 'warning');
    });

    // Dev Focus Timer
    btnTimerToggle.addEventListener('click', () => {
      if (state.timerActive) {
        clearInterval(state.timerInterval);
        state.timerActive = false;
        btnTimerToggle.textContent = 'Resume Focus';
        showToast('Focus session paused.');
      } else {
        state.timerActive = true;
        btnTimerToggle.textContent = 'Pause Focus';
        showToast('Focus session started! Deep work in progress...');
        state.timerInterval = setInterval(() => {
          if (state.timerSeconds > 0) {
            state.timerSeconds--;
            const m = String(Math.floor(state.timerSeconds / 60)).padStart(2, '0');
            const s = String(state.timerSeconds % 60).padStart(2, '0');
            focusTimerText.textContent = `${m}:${s}`;
          } else {
            clearInterval(state.timerInterval);
            state.timerActive = false;
            btnTimerToggle.textContent = 'Start Focus';
            state.timerSeconds = 25 * 60;
            focusTimerText.textContent = "25:00";
            showToast('Focus sprint completed! Great job.', 'success');
          }
        }, 1000);
      }
    });

    btnTimerReset.addEventListener('click', () => {
      clearInterval(state.timerInterval);
      state.timerActive = false;
      state.timerSeconds = 25 * 60;
      focusTimerText.textContent = "25:00";
      btnTimerToggle.textContent = 'Start Focus';
      showToast('Focus stopwatch reset.');
    });

    // Profile actions
    document.getElementById('btn-export-data').addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.journalEntries, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mindmate_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Journal export downloaded successfully.');
    });

    // btn-reset-data → clear all stored data for this account
    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Clear all your MindMate data? This cannot be undone.')) {
          // Remove only MindMate-specific keys, preserve session
          ['mm_entries','mm_sessions','mm_dev_cfg','mm_view_mode',
           'mm_vulnerability_alerts','mm_journal_log'].forEach(k => localStorage.removeItem(k));
          state.journalEntries = [];
          state.studySessions = [];
          state.todayMinutes = 0;
          renderHubEntries();
          updateStudyLoggerUI();
          showToast('All data cleared.');
        }
      });
    }

    // Routine additions
    document.getElementById('btn-add-schedule-item').addEventListener('click', () => {
      const title = prompt('Enter routine item:');
      if (title && title.trim()) {
        ROUTINE_ITEMS.push({
          id: Date.now(),
          time: "11:00 AM",
          title: title.trim(),
          desc: "Personal routine block",
          completed: false
        });
        renderScheduleTimeline();
        showToast(`Added routine: "${title}"`);
      }
    });
  }

  // --- Initialize App ---
  function init() {
    localStorage.removeItem('mm_theme');   // dark theme removed: drop any saved preference
    applyViewMode(state.viewMode);
    renderHubEntries();
    updateStudyLoggerUI();
    renderInsightsCharts();
    renderDevHubHistory();
    renderScheduleTimeline();
    renderDateStrip();
    setupEventListeners();

    // --- Populate student session info ---
    if (SESSION) {
      const displayName = SESSION.name || SESSION.user || 'Student';
      const initial = displayName.charAt(0).toUpperCase();

      // Header elements
      const nameEl = document.getElementById('student-session-name');
      const avatarEl = document.getElementById('avatar-initial');
      const greetingEl = document.getElementById('greeting-username');
      const avatarTrigger = document.getElementById('header-avatar-trigger');
      if (nameEl) nameEl.textContent = displayName;
      if (avatarEl) avatarEl.textContent = initial;
      if (greetingEl) greetingEl.textContent = displayName;
      if (avatarTrigger) avatarTrigger.textContent = initial;

      // Profile card
      const profileAvatar = document.getElementById('profile-avatar-large');
      const profileName   = document.getElementById('profile-name');
      const profileRole   = document.getElementById('profile-role');
      if (profileAvatar) profileAvatar.textContent = initial;
      if (profileName)   profileName.textContent = displayName;
      if (profileRole)   profileRole.textContent = 'Student';

      // Live streak from journal entries count
      const streakEl = document.getElementById('streak-days');
      if (streakEl) streakEl.textContent = state.journalEntries.length;

      // Profile badge: streak
      const streakBadge = document.getElementById('profile-badge-streak');
      if (streakBadge) streakBadge.textContent = `${state.journalEntries.length}-Entry Journal`;
    }

    // --- Sign Out ---
    const signOutBtn = document.getElementById('btn-signout');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        localStorage.removeItem('mm_session');
        window.location.href = '/login.html';
      });
    }

    // --- Attendance Status (biometric/RFID — read-only, driven by tagged flag) ---
    // The ESP32 writes:  localStorage["mm_att_YYYY-MM-DD"][SESSION.user] = { tagged: true/false }
    // or the server resolver sets the legacy string form ("present"/"absent").
    // We normalise both formats here.
    const attDateLabel = document.getElementById('att-date-label');
    const attStatusEl  = document.getElementById('att-status-indicator');
    const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    if (attDateLabel) attDateLabel.textContent = todayStr;

    function refreshAttStatus() {
      if (!SESSION || !attStatusEl) return;
      const key = `mm_att_${new Date().toISOString().slice(0, 10)}`;
      const rec = JSON.parse(localStorage.getItem(key) || '{}');
      const entry = rec[SESSION.user];

      // Support both object form { tagged: true } and legacy string form "present"
      const tagged =
        (typeof entry === 'object' && entry !== null) ? !!entry.tagged :
        (typeof entry === 'string')                   ? entry === 'present' :
        false;

      if (tagged) {
        attStatusEl.textContent = 'Present';
        attStatusEl.style.background = 'rgba(16,185,129,.15)';
        attStatusEl.style.color = '#059669';
        const card = document.getElementById('attendance-checkin-card');
        if (card) { card.style.background = 'rgba(16,185,129,.09)'; card.style.borderColor = 'rgba(16,185,129,.35)'; }
      } else {
        attStatusEl.textContent = 'Absent';
        attStatusEl.style.background = 'rgba(239,68,68,.1)';
        attStatusEl.style.color = '#ef4444';
        const card = document.getElementById('attendance-checkin-card');
        if (card) { card.style.background = 'rgba(239,68,68,.05)'; card.style.borderColor = 'rgba(239,68,68,.18)'; }
      }
    }

    refreshAttStatus();
    // Poll every 10 s so badge updates live when ESP32 tags the student
    setInterval(refreshAttStatus, 10000);


    // Fetch 100% Live LeetCode & GitHub Data
    refreshActivity();

    console.log("MindMate Web App initialized successfully with live API data.");
  }

  document.addEventListener('DOMContentLoaded', init);
})();

