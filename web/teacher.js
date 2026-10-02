// Teacher screens. Uses the same shared components and the same attendance service as the student app.
(function () {
  const sess = MM.requireSession('teacher');
  if (!sess) return;

  const STUDENT_IDS = ['BHARUNESH', 'BRANESH', 'HEMANTH'];
  const HIGH_RISK = ['suicide', 'kill myself', 'end my life', 'want to die', 'self harm', 'hurt myself', 'harming myself', 'end it all', 'no reason to live'];
  const $ = id => document.getElementById(id);
  const esc = MM.esc;

  MM.renderTopBar($('main-header'), { role: 'teacher', name: sess.name });

  // ---------- state ----------
  const today = MM.istToday();
  let selectedDate = today;
  let month = today.slice(0, 7);
  let attData = null;
  let loading = false;
  let tab = 'home';
  let returnTab = 'attendance';
  let detailId = null;
  let alertFilter = 'all';
  let modalAlertId = null;

  // ---------- navigation ----------
  function show(next) {
    if (next === 'detail') returnTab = tab === 'students' ? 'students' : 'attendance';
    tab = next;
    document.querySelectorAll('.screen-view').forEach(s => s.classList.toggle('active', s.id === 't-' + next));
    const navTab = next === 'detail' ? returnTab : next;
    document.querySelectorAll('#t-nav .phone-nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === navTab));
    if (next === 'attendance') MM.centerDateStrip($('t-date-strip'));
    window.scrollTo({ top: 0 });
  }
  $('t-nav').addEventListener('click', e => { const b = e.target.closest('.phone-nav-item'); if (b) show(b.dataset.tab); });
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-goto]');
    if (go) show(go.dataset.goto);
    const card = e.target.closest('[data-student]');
    if (card) openDetail(card.dataset.student);
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-student]')) { e.preventDefault(); openDetail(e.target.dataset.student); }
  });
  $('t-back').addEventListener('click', () => show(returnTab));

  // ---------- helpers ----------
  const fmtLong = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fmtShort = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayOf = (p, date) => p.days.find(d => d.date === date);
  const skeleton = n => '<div class="entries-list">' + Array.from({ length: n }, () => '<div class="glass-card skeleton" style="height:92px"></div>').join('') + '</div>';

  // ---------- attendance data (same service/endpoint as the student view) ----------
  async function load({ force = false, nextMonth } = {}) {
    if (nextMonth) month = nextMonth;
    loading = true;
    $('t-refresh').disabled = true;
    if (!attData || force || nextMonth) {   // skeletons only for visible loads, not the 2-minute background refresh
      $('t-att-pill').textContent = 'Loading';
      $('t-home-att').innerHTML = '<div class="att-skel-stats"><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span></div>';
      $('t-att-list').innerHTML = skeleton(3);
      $('t-student-list').innerHTML = skeleton(3);
      $('t-att-state').innerHTML = '';
    }
    try {
      attData = await MM.fetchAttendance({ month, force });
      render();
    } catch (err) {
      attData = null;
      const html = `<p class="att-error" role="alert">${esc(err.message)} <button type="button" class="btn-ghost-sm" data-retry>Retry</button></p>`;
      $('t-att-pill').textContent = 'Unavailable';
      $('t-home-att').innerHTML = html;
      $('t-att-list').innerHTML = '';
      $('t-student-list').innerHTML = html;
      $('t-att-state').innerHTML = html;
      if (tab === 'detail') $('t-detail-card').innerHTML = html;
    } finally { loading = false; $('t-refresh').disabled = false; }
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-retry]')) load({ force: true }); });
  $('t-refresh').addEventListener('click', () => load({ force: true }));

  function render() {
    renderHome(); renderAttendanceList(); renderStudents();
    if (tab === 'detail') renderDetail();
    const stale = attData.meta.stale;
    $('t-att-state').innerHTML = stale ? `<p class="att-error">Showing the last saved data (${esc(stale)}).</p>` : '';
  }

  // ---------- Home ----------
  function renderHome() {
    const profiles = attData.profiles;
    const todays = profiles.map(p => dayOf(p, attData.today));
    const count = s => todays.filter(d => d && d.status === s).length;
    const present = count('Present'), absent = count('Absent');
    const pct = present + absent ? Math.round((present / (present + absent)) * 1000) / 10 + '%' : 'N/A';
    const statuses = new Set(todays.filter(Boolean).map(d => d.status));
    const rest = ['Sunday', 'Holiday', 'Pending', 'Future'].find(s => statuses.has(s) && present + absent === 0);

    $('t-att-sub').textContent = fmtLong(attData.today);
    const pill = $('t-att-pill');
    pill.textContent = rest || `${present} of ${profiles.length} present`;
    pill.dataset.status = rest || (present > 0 ? 'Present' : 'Absent');
    $('t-home-att').innerHTML =
      `<div class="att-stats grid-2x2">${MM.statTile('Present', present)}${MM.statTile('Absent', absent)}${MM.statTile('Attendance', pct)}${MM.statTile('Total students', profiles.length)}</div>` +
      (profiles.some(p => !p.linked) ? `<p class="att-note">${profiles.filter(p => !p.linked).map(p => esc(p.name)).join(', ')}: no RFID card linked yet.</p>` : '');
  }

  // ---------- Attendance tab ----------
  function renderAttendanceList() {
    $('t-att-day-label').textContent = fmtLong(selectedDate);
    const list = $('t-att-list');
    if (!attData) return;
    list.innerHTML = attData.profiles.map(p => {
      const d = dayOf(p, selectedDate);
      const status = d ? d.status : 'No data';
      return `<article class="glass-card student-card" role="button" tabindex="0" data-student="${esc(p.profileId)}" aria-label="${esc(p.name)}: ${esc(status)}. Open details">
        <div class="sc-top"><strong class="sc-name">${esc(p.name)}</strong>${MM.statusPill(status)}</div>
        <div class="sc-times">
          <div><span class="sc-lbl">IN</span><span class="sc-val">${d && d.checkIn ? esc(d.checkIn) : '—'}</span></div>
          <div><span class="sc-lbl">OUT</span><span class="sc-val">${d && d.checkOut && d.checkOut !== d.checkIn ? esc(d.checkOut) : '—'}</span></div>
          <div><span class="sc-lbl">MONTH</span><span class="sc-val">${esc(MM.monthText(p.summary))}</span></div>
        </div>
        ${p.linked ? '' : '<p class="att-note">No RFID card linked</p>'}
      </article>`;
    }).join('') || MM.emptyState('No students found.');

    const un = $('t-unmatched');
    const rows = attData.unmatched || [];
    un.style.display = rows.length ? '' : 'none';
    un.innerHTML = rows.length ? `<h3 class="card-heading" style="margin-bottom:12px">Unmatched taps</h3><ul class="unmatched-list">${rows.map(u =>
      `<li><code>${esc(u.uid)}</code><span>${esc(u.name || 'Unknown')}</span><span class="muted small">${u.taps} tap${u.taps === 1 ? '' : 's'}, last ${esc(u.lastSeen)}</span></li>`).join('')}</ul>` : '';
  }

  function mountDateStrip() {
    MM.dateStrip($('t-date-strip'), {
      selected: selectedDate,
      onSelect: date => {
        selectedDate = date;
        if (date.slice(0, 7) !== month) { month = date.slice(0, 7); load(); } else renderAttendanceList();
      }
    });
  }

  // ---------- Students tab ----------
  function renderStudents() {
    $('t-students-sub').textContent = new Date(attData.month + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    $('t-student-list').innerHTML = attData.profiles.map(p => {
      const taps = p.days.filter(d => d.checkIn && d.date <= attData.today);
      const last = taps[taps.length - 1];
      const lastText = last ? `Last tap: ${fmtShort(last.date)}, ${last.checkOut || last.checkIn}` : 'No taps this month';
      return `<article class="glass-card student-card" role="button" tabindex="0" data-student="${esc(p.profileId)}" aria-label="${esc(p.name)} details">
        <div class="sc-top"><span class="sc-avatar" aria-hidden="true">${esc(p.name.charAt(0))}</span>
          <div class="sc-id"><strong class="sc-name">${esc(p.name)}</strong><span class="muted small">${esc(lastText)}</span></div>
          <span class="att-pill" data-status="${p.summary.percentage !== null && p.summary.percentage >= 75 ? 'Present' : p.summary.percentage === null ? '' : 'Absent'}">${esc(MM.pctText(p.summary))}</span></div>
      </article>`;
    }).join('') || MM.emptyState('No students found.');
  }

  // ---------- Student detail ----------
  function openDetail(id) { detailId = id; show('detail'); if (attData) renderDetail(); }

  function renderDetail() {
    const p = attData && attData.profiles.find(x => x.profileId === detailId);
    $('t-month-label').textContent = new Date(attData.month + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    if (!p) { $('t-detail-card').innerHTML = MM.emptyState('Student not found.'); return; }
    $('t-detail-card').innerHTML =
      `<div class="sc-top" style="margin-bottom:16px"><span class="sc-avatar" aria-hidden="true">${esc(p.name.charAt(0))}</span>
        <div class="sc-id"><strong class="sc-name">${esc(p.name)}</strong><span class="muted small">${esc(MM.monthText(p.summary))}</span></div></div>` +
      MM.attendanceSummary(p, attData.today) + `<div class="detail-cal">${MM.monthCalendar(p)}</div>`;
  }
  function shiftMonth(delta) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    $('t-detail-card').innerHTML = skeleton(2);
    load({ nextMonth: d.toISOString().slice(0, 7) });
  }
  $('t-prev-month').addEventListener('click', () => shiftMonth(-1));
  $('t-next-month').addEventListener('click', () => shiftMonth(1));

  // ---------- Alerts + journal (browser-stored, as before) ----------
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } };
  const alertsForMyStudents = () => read('mm_vulnerability_alerts').filter(a => STUDENT_IDS.includes(a.studentUser));
  const severity = a => a.resolved ? 'resolved' : (a.keywords || []).some(k => HIGH_RISK.includes(String(k).toLowerCase())) ? 'high' : 'medium';
  const sevLabel = { high: 'High', medium: 'Medium', resolved: 'Resolved' };

  function renderAlerts() {
    const all = alertsForMyStudents().slice().reverse();
    const open = all.filter(a => !a.resolved);
    const badge = $('t-alert-badge');
    badge.style.display = open.length ? '' : 'none';
    badge.textContent = open.length;

    // Home summary
    $('t-alert-summary').innerHTML = `<div class="insights-summary-header"><h3 class="card-heading">Alerts</h3>
        <button type="button" class="btn-text-arrow" data-goto="alerts" aria-label="Open alerts"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button></div>` +
      (open.length
        ? `<p><strong>${open.length}</strong> open alert${open.length === 1 ? '' : 's'}</p><ul class="mini-alerts">${open.slice(0, 2).map(a =>
            `<li><span class="sev-pill sev-${severity(a)}">${sevLabel[severity(a)]}</span><span>${esc(a.studentName)}</span><span class="muted small">${esc(new Date(a.timestamp).toLocaleString())}</span></li>`).join('')}</ul>`
        : '<p class="muted">No alerts right now.</p>');

    // Alerts tab
    $('t-alert-filters').innerHTML = MM.chipRow([['all', 'All'], ['open', 'Open'], ['resolved', 'Resolved']], alertFilter, 'data-alert-filter');
    const shown = all.filter(a => alertFilter === 'all' || (alertFilter === 'open' ? !a.resolved : a.resolved));
    $('t-alert-list').innerHTML = shown.length ? shown.map(a => {
      const sev = severity(a);
      return `<article class="glass-card alert-card">
        <div class="entry-card-header"><span class="sev-pill sev-${sev}">${sevLabel[sev]}</span><span class="entry-date-time">${esc(new Date(a.timestamp).toLocaleString())}</span></div>
        <h4 class="entry-card-title">${esc(a.studentName)}</h4>
        <p class="entry-card-preview">&ldquo;${esc(a.excerpt || '')}&rdquo;</p>
        ${(a.keywords || []).length ? `<div class="kw-row">${a.keywords.map(k => `<span class="chip">${esc(k)}</span>`).join('')}</div>` : ''}
        <div class="alert-actions">
          <button type="button" class="btn-ghost-sm" data-view-alert="${esc(a.id)}">View entry</button>
          ${a.resolved ? '' : `<button type="button" class="btn-primary btn-sm" data-resolve-alert="${esc(a.id)}">Resolve</button>`}
        </div></article>`;
    }).join('') : MM.emptyState(alertFilter === 'resolved' ? 'No resolved alerts yet.' : 'No alerts right now.');
  }

  function pushToSheets(action, payload) {
    return fetch(`${window.API_BASE || ''}/api/sheets?action=${encodeURIComponent(action)}&data=${encodeURIComponent(JSON.stringify(payload))}`).then(() => true, () => false);
  }
  function resolveAlert(id) {
    const all = read('mm_vulnerability_alerts');
    const a = all.find(x => x.id === id);
    if (!a) return;
    a.resolved = true;
    localStorage.setItem('mm_vulnerability_alerts', JSON.stringify(all));
    renderAlerts();
    MM.toast('Alert marked as resolved');
    pushToSheets('alert_resolved', { alertId: id, teacher: sess.name, resolvedAt: Date.now() });
  }
  function openModal(id) {
    const a = read('mm_vulnerability_alerts').find(x => x.id === id);
    if (!a) return;
    modalAlertId = id;
    $('t-modal-title').textContent = `Alert: ${a.studentName}`;
    $('t-modal-meta').textContent = `Submitted ${new Date(a.timestamp).toLocaleString()} · Mood: ${a.mood || 'Unknown'}`;
    $('t-modal-body').textContent = a.fullContent || a.excerpt || '';
    $('t-modal-resolve').style.display = a.resolved ? 'none' : '';
    $('t-modal').classList.add('active');
  }
  const closeModal = () => $('t-modal').classList.remove('active');

  document.addEventListener('click', e => {
    const f = e.target.closest('[data-alert-filter]');
    if (f) { alertFilter = f.dataset.alertFilter; renderAlerts(); return; }
    const r = e.target.closest('[data-resolve-alert]');
    if (r) { resolveAlert(r.dataset.resolveAlert); return; }
    const v = e.target.closest('[data-view-alert]');
    if (v) openModal(v.dataset.viewAlert);
  });
  $('t-modal-close').addEventListener('click', closeModal);
  $('t-modal-dismiss').addEventListener('click', closeModal);
  $('t-modal').addEventListener('click', e => { if (e.target === $('t-modal')) closeModal(); });
  $('t-modal-resolve').addEventListener('click', () => { if (modalAlertId) resolveAlert(modalAlertId); closeModal(); });

  function renderJournal() {
    const rows = read('mm_journal_log').filter(l => STUDENT_IDS.includes(l.studentUser)).slice(-5).reverse();
    $('t-journal').innerHTML = rows.length ? rows.map(l => {
      const preview = String(l.content || '').slice(0, 80) + (l.content && l.content.length > 80 ? '…' : '');
      return `<article class="glass-card entry-item-card">
        <div class="entry-card-header">
          <span class="entry-mood-badge mood-${esc(String(l.mood || 'neutral').toLowerCase())}"><span>${esc(l.mood || 'Unknown')}</span></span>
          <span class="entry-date-time">${esc(new Date(l.timestamp).toLocaleString())}</span>
        </div>
        <h4 class="entry-card-title">${esc(l.studentName)}${l.hasAlert ? ' <span class="sev-pill sev-high">Flagged</span>' : ''}</h4>
        <p class="entry-card-preview">${esc(preview)}</p></article>`;
    }).join('') : MM.emptyState('No journal activity yet.');
  }

  // ---------- init ----------
  $('t-greeting').textContent = `Hello, ${sess.name}`;
  $('t-date').textContent = fmtLong(today);
  mountDateStrip();
  renderAlerts();
  renderJournal();
  load();
  setInterval(() => { renderAlerts(); renderJournal(); }, 5000);
  window.addEventListener('storage', () => { renderAlerts(); renderJournal(); });
  setInterval(() => { if (!loading) load(); }, 2 * 60 * 1000);   // the server caches the sheet for 2 minutes
})();
