// Shared by the student and teacher screens: session, the one logout function, the top bar,
// and the small UI components (stat tile, status pill, empty state, date strip, attendance summary, calendar).
(function () {
  const SESSION_KEY = 'mm_session';
  const MM = {};
  window.MM = MM;

  MM.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- session ----------
  MM.session = function () {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  };

  // Redirect to the login page unless a valid session for `role` exists. Returns the session or null.
  MM.requireSession = function (role) {
    const s = MM.session();
    if (!s || !s.token) { try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } location.replace('/login.html'); return null; }
    if (role && s.role !== role) { location.replace(s.role === 'teacher' ? '/teacher.html' : '/index.html'); return null; }
    return s;
  };

  // The one logout used by every screen. Clears the session and everything cached for it, then
  // replaces the history entry so Back cannot return to a signed-in page.
  // Journal entries and study logs are the student's own content and are deliberately kept.
  MM.logout = function () {
    try {
      Object.keys(localStorage)
        .filter(k => k === SESSION_KEY || k === 'mm_theme' || k.startsWith('mm_activity_') || k.startsWith('mm_att'))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) { /* storage unavailable */ }
    try { sessionStorage.clear(); } catch (e) { /* ignore */ }
    location.replace('/login.html');
  };

  // Any element marked data-signout signs out, whichever page or component rendered it.
  document.addEventListener('click', e => {
    if (e.target.closest('[data-signout]')) { e.preventDefault(); MM.logout(); }
  });
  // A page restored from the back/forward cache must not show a signed-out dashboard.
  window.addEventListener('pageshow', e => {
    if (e.persisted && !MM.session() && !/login\.html$/.test(location.pathname)) location.replace('/login.html');
  });

  // ---------- one top bar for both roles ----------
  const ICON_STAR = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>';
  const ICON_PLUS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const ICON_OUT = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
  const ICON_FRAME = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="frame-icon"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';

  // opts: { role, name, student: boolean }  (student extras are the elements the student app wires up)
  MM.renderTopBar = function (host, opts) {
    const role = opts.role === 'teacher' ? 'teacher' : 'student';
    const student = role === 'student';
    host.innerHTML = `
      <div class="nav-brand" id="brand-logo">
        <div class="brand-icon">${ICON_STAR}</div>
        <div class="brand-text"><span class="brand-title">MindMate</span><span class="brand-badge">${role.toUpperCase()}</span></div>
      </div>
      <div class="nav-actions">
        ${student ? `<button type="button" class="btn-icon" id="view-mode-toggle" title="Toggle layout frame" aria-label="Toggle layout frame">${ICON_FRAME}</button>` : ''}
        ${student ? `<button type="button" class="btn-primary btn-sm" id="btn-quick-new-entry">${ICON_PLUS}<span>New Entry</span></button>` : ''}
        <div class="session-badge" id="student-session-badge"><span id="student-session-name">${MM.esc(opts.name || '')}</span></div>
        <button type="button" class="btn-icon btn-signout" id="btn-signout" data-signout title="Sign out" aria-label="Sign out">${ICON_OUT}<span class="signout-label">Sign out</span></button>
        ${student ? `<div class="user-avatar-badge" id="btn-user-avatar" title="My Profile"><div class="avatar-circle" id="avatar-initial"></div></div>` : ''}
      </div>`;
  };

  // ---------- small components ----------
  MM.statTile = (label, value) =>
    `<div class="att-stat"><span class="att-stat-label">${MM.esc(label)}</span><span class="att-stat-value">${MM.esc(value)}</span></div>`;

  MM.statusPill = status => `<span class="att-pill" data-status="${MM.esc(status)}">${MM.esc(status)}</span>`;

  MM.emptyState = text =>
    `<div class="glass-card" style="padding: 24px; text-align: center; color: var(--text-secondary);"><p>${MM.esc(text)}</p></div>`;

  MM.chipRow = (items, active, attr = 'data-chip') =>
    `<div class="filter-pills">${items.map(([value, label]) =>
      `<button type="button" class="pill-btn${value === active ? ' active' : ''}" ${attr}="${MM.esc(value)}">${MM.esc(label)}</button>`).join('')}</div>`;

  MM.istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  MM.addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

  // Horizontal day picker: 6 days back to 7 days ahead. onSelect(dateString) fires on tap.
  MM.dateStrip = function (host, opts = {}) {
    if (!host) return;
    const today = MM.istToday();
    const selected = opts.selected || today;
    const days = Array.from({ length: 14 }, (_, i) => MM.addDays(today, i - 6));
    host.innerHTML = days.map(d => {
      const dt = new Date(d + 'T00:00:00Z');
      const sel = d === selected;
      return `<button type="button" class="date-chip${sel ? ' active' : ''}" role="tab" data-date="${d}" aria-selected="${sel}">
        <span class="dow">${dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span>
        <span class="dom">${dt.getUTCDate()}</span></button>`;
    }).join('');
    host.onclick = e => {
      const chip = e.target.closest('.date-chip');
      if (!chip) return;
      host.querySelectorAll('.date-chip').forEach(c => { c.classList.toggle('active', c === chip); c.setAttribute('aria-selected', c === chip); });
      if (opts.onSelect) opts.onSelect(chip.dataset.date);
    };
    MM.centerDateStrip(host);
  };
  // The strip may be inside a hidden screen at render time (offsets are 0), so this is callable again later.
  MM.centerDateStrip = function (host) {
    const active = host && host.querySelector('.active');
    if (active && host.clientWidth) host.scrollLeft = active.offsetLeft - host.clientWidth / 2 + active.offsetWidth / 2;
  };

  // ---------- attendance (the one client for /api/school-attendance) ----------
  MM.fetchAttendance = async function ({ month, force = false } = {}) {
    const s = MM.session();
    const qs = new URLSearchParams();
    if (month) qs.set('month', month);
    if (force) qs.set('refresh', '1');
    const res = await fetch(`${window.API_BASE || ''}/api/school-attendance${qs.toString() ? '?' + qs : ''}`, {
      headers: { Authorization: 'Bearer ' + (s ? s.token : '') }
    });
    if (res.status === 401) { MM.logout(); throw new Error('Session expired'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not load attendance');
    return data;
  };

  const dotTitle = d => `${d.date}: ${d.status}${d.checkIn ? ` (in ${d.checkIn}${d.checkOut && d.checkOut !== d.checkIn ? `, out ${d.checkOut}` : ''})` : ''}`;
  MM.attendanceDots = p => p.days.map(d =>
    `<span class="att-dot ${d.status === 'Present' ? 'on' : d.status === 'Absent' ? 'absent' : ''}" title="${MM.esc(dotTitle(d))}"></span>`).join('');

  MM.pctText = sm => (sm.percentage === null ? 'N/A' : sm.percentage + '%');
  MM.monthText = sm => `${sm.present}P / ${sm.absent}A, ${MM.pctText(sm)}`;

  // Stat tiles + dot strip for one profile (used by the student's card and the teacher's student detail)
  MM.attendanceSummary = function (p, today) {
    const sm = p.summary;
    const day = p.days.find(d => d.date === today);
    return (p.linked ? '' : `<p class="att-note">No RFID card is linked to this profile yet, so no taps can be matched.</p>`) +
      `<div class="att-stats">${MM.statTile('Present', sm.present)}${MM.statTile('Absent', sm.absent)}${MM.statTile('Attendance', MM.pctText(sm))}${MM.statTile('Streak', sm.streak + (sm.streak === 1 ? ' day' : ' days'))}</div>` +
      `<div class="att-strip" aria-label="Attendance this month">${MM.attendanceDots(p)}</div>` +
      (day && day.checkIn ? `<p class="att-note">Today: in ${day.checkIn}${day.checkOut && day.checkOut !== day.checkIn ? `, out ${day.checkOut}` : ''}</p>` : '');
  };

  // Month grid (Monday first) for one profile
  MM.monthCalendar = function (p) {
    if (!p.days.length) return '';
    const first = new Date(p.days[0].date + 'T00:00:00Z');
    const lead = (first.getUTCDay() + 6) % 7;
    const heads = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(h => `<span class="cal-head">${h}</span>`).join('');
    const blanks = Array.from({ length: lead }, () => '<span class="cal-cell blank"></span>').join('');
    const cells = p.days.map(d => `<span class="cal-cell cal-${d.status.toLowerCase()}" title="${MM.esc(dotTitle(d))}">${Number(d.date.slice(8))}</span>`).join('');
    return `<div class="calendar" role="img" aria-label="Attendance calendar">${heads}${blanks}${cells}</div>
      <div class="cal-legend"><span><i class="cal-key cal-present"></i>Present</span><span><i class="cal-key cal-absent"></i>Absent</span><span><i class="cal-key cal-other"></i>Other</span></div>`;
  };

  MM.toast = function (message) {
    let host = document.getElementById('toast-container');
    if (!host) { host = document.createElement('div'); host.id = 'toast-container'; host.className = 'toast-container'; document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3200);
  };
})();
