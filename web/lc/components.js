// UI components: each returns an HTML string. All dynamic text goes through esc().

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (n === null || n === undefined ? 'N/A' : n.toLocaleString('en-US'));
const pct = (n, d = 1) => (n === null ? 'N/A' : `${n.toFixed(d)}%`);
const safeUrl = u => (/^https?:\/\//i.test(u) ? u : '#');

const ICON = {
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'
};
export const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;

export const Card = (cls, body, label) =>
  `<section class="card ${cls}"${label ? ` aria-label="${esc(label)}"` : ''}>${body}</section>`;
const CardTitle = (text, right = '') => `<div class="card-head"><h2 class="card-title">${esc(text)}</h2>${right}</div>`;

// ---------- Profile hero ----------
export function ProfileHero(p) {
  const initial = esc((p.username[0] || '?').toUpperCase());
  const avatar = p.avatar
    ? `<img class="avatar" src="${esc(p.avatar)}" alt="Avatar of ${esc(p.username)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'avatar avatar-fallback',textContent:'${initial}'}))">`
    : `<div class="avatar avatar-fallback" aria-hidden="true">${initial}</div>`;
  const meta = [p.country, p.company, p.school].filter(Boolean).map(m => `<span class="chip">${esc(m)}</span>`).join('');
  const links = p.links.map(l => `<a class="link-pill" href="${esc(safeUrl(l.url))}" target="_blank" rel="noreferrer noopener">${esc(l.label)}</a>`).join('');
  const kpis = [
    p.ranking !== null ? `<div class="kpi"><span class="kpi-label">Rank</span><span class="kpi-value">${fmt(p.ranking)}</span></div>` : '',
    p.reputation !== null ? `<div class="kpi"><span class="kpi-label">Reputation</span><span class="kpi-value">${fmt(p.reputation)}</span></div>` : ''
  ].join('');
  return Card('hero', `
    <div class="hero-main">
      ${avatar}
      <div class="hero-text">
        <h1 class="hero-name">${esc(p.username)}</h1>
        ${p.realName ? `<p class="hero-real">${esc(p.realName)}</p>` : ''}
        ${p.bio ? `<p class="hero-bio">${esc(p.bio)}</p>` : ''}
        ${meta || links ? `<div class="hero-tags">${meta}${links}</div>` : ''}
      </div>
    </div>
    ${kpis ? `<div class="hero-kpis">${kpis}</div>` : ''}`, 'Profile');
}

// ---------- Solved problems ----------
function Ring(value, max, label) {
  const R = 52, C = 2 * Math.PI * R;
  const frac = max ? Math.min(value / max, 1) : 0;
  return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${esc(label)}">
    <circle cx="60" cy="60" r="${R}" class="ring-track"/>
    <circle cx="60" cy="60" r="${R}" class="ring-fill" stroke-dasharray="${(frac * C).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 60 60)"/>
  </svg>`;
}

export function SolvedProblems(p) {
  const s = p.solved;
  if (s.total === null) return '';
  const totalRing = s.totalAvailable
    ? `<div class="ring-wrap">${Ring(s.total, s.totalAvailable, `${s.total} of ${s.totalAvailable} problems solved`)}
         <div class="ring-center"><span class="ring-num">${fmt(s.total)}</span><span class="ring-sub">of ${fmt(s.totalAvailable)}</span></div></div>`
    : `<div class="big-num">${fmt(s.total)}</div>`;
  const tile = (key, label, value, avail) => value === null ? '' : `
    <div class="card tile tile-${key}">
      <span class="tile-label">${label}</span>
      <span class="tile-value">${fmt(value)}</span>
      ${avail ? `<span class="tile-sub">of ${fmt(avail)}</span><div class="bar"><span style="width:${Math.min(100, (value / avail) * 100).toFixed(1)}%"></span></div>` : '<span class="tile-sub">solved</span>'}
    </div>`;
  return `<div class="solved-grid">
    <section class="card tile tile-total" aria-label="Total solved">
      <span class="tile-label">Total solved</span>${totalRing}
    </section>
    ${tile('easy', 'Easy', s.easy, s.easyAvailable)}
    ${tile('medium', 'Medium', s.medium, s.mediumAvailable)}
    ${tile('hard', 'Hard', s.hard, s.hardAvailable)}
  </div>`;
}

// ---------- Difficulty chart (donut + legend) ----------
export function DifficultyChart(p) {
  const { easy, medium, hard } = p.solved;
  const parts = [['Easy', easy, 'easy'], ['Medium', medium, 'medium'], ['Hard', hard, 'hard']].filter(x => x[1] !== null);
  const sum = parts.reduce((a, x) => a + x[1], 0);
  if (!parts.length) return '';
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  const segs = sum ? parts.map(([, v, k]) => {
    const len = (v / sum) * C, seg = `<circle cx="60" cy="60" r="${R}" class="seg seg-${k}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 60 60)"/>`;
    offset += len; return seg;
  }).join('') : '';
  const legend = parts.map(([label, v, k]) => `
    <li class="legend-row"><span class="dot dot-${k}"></span><span class="legend-name">${label}</span>
      <span class="legend-count">${fmt(v)}</span><span class="legend-pct">${sum ? ((v / sum) * 100).toFixed(0) : 0}%</span></li>`).join('');
  return Card('chart-card', `${CardTitle('Difficulty breakdown')}
    <div class="donut-layout">
      <div class="ring-wrap">
        <svg class="ring" viewBox="0 0 120 120" role="img" aria-label="Solved problems by difficulty">
          <circle cx="60" cy="60" r="${R}" class="ring-track"/>${segs}
        </svg>
        <div class="ring-center"><span class="ring-num">${fmt(sum)}</span><span class="ring-sub">solved</span></div>
      </div>
      <ul class="legend">${legend}</ul>
    </div>`);
}

// ---------- Contest ----------
function RatingChart(history) {
  if (history.length < 2) return '';
  const W = 600, H = 180, pad = 8;
  const ratings = history.map(h => h.rating);
  const min = Math.min(...ratings), max = Math.max(...ratings), span = max - min || 1;
  const pts = history.map((h, i) => [pad + (i / (history.length - 1)) * (W - 2 * pad), H - pad - ((h.rating - min) / span) * (H - 2 * pad)]);
  const line = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`;
  const d = t => t ? new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
  return `<figure class="rating-chart">
    <div class="chart-scale"><span>${Math.round(max)}</span><span>${Math.round(min)}</span></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Contest rating over ${history.length} contests, from ${Math.round(ratings[0])} to ${Math.round(ratings[ratings.length - 1])}">
      <path d="${area}" class="area"/><path d="${line}" class="line"/>
    </svg>
    <figcaption class="chart-x"><span>${esc(d(history[0].at))}</span><span>${esc(d(history[history.length - 1].at))}</span></figcaption>
  </figure>`;
}

export function ContestCard(p) {
  const c = p.contest;
  const stats = [
    c.rating !== null ? ['Rating', fmt(Math.round(c.rating))] : null,
    c.ranking !== null ? ['Global rank', fmt(c.ranking)] : null,
    c.topPercentage !== null ? ['Top', `${c.topPercentage}%`] : null,
    c.attended !== null ? ['Contests', fmt(c.attended)] : null
  ].filter(Boolean);
  const body = stats.length
    ? `<div class="stat-row">${stats.map(([l, v]) => `<div class="mini"><span class="mini-label">${l}</span><span class="mini-value">${esc(v)}</span></div>`).join('')}</div>
       ${c.badge ? `<p class="muted small">Contest badge: ${esc(c.badge)}</p>` : ''}
       ${RatingChart(c.history)}`
    : `<p class="empty">No contest activity yet.</p>`;
  return Card('contest', CardTitle('Contest performance', icon('trophy')) + body);
}

// ---------- Overview ----------
export function StatsGrid(p) {
  const items = [
    p.solved.total !== null ? ['check', 'Problems solved', fmt(p.solved.total)] : null,
    p.acceptance !== null ? ['award', 'Acceptance rate', pct(p.acceptance)] : null,
    p.totalSubmissions !== null ? ['list', 'Total submissions', fmt(p.totalSubmissions)] : null,
    p.ranking !== null ? ['hash', 'Global ranking', fmt(p.ranking)] : null,
    p.contest.rating !== null ? ['trophy', 'Contest rating', fmt(Math.round(p.contest.rating))] : null,
    p.badges.length ? ['award', 'Badges', fmt(p.badges.length)] : null
  ].filter(Boolean);
  if (!items.length) return '';
  return Card('overview', CardTitle('Profile overview') + `<ul class="stat-list">${items.map(([i, l, v]) =>
    `<li><span class="stat-ico">${icon(i, 16)}</span><span class="stat-name">${l}</span><span class="stat-val">${esc(v)}</span></li>`).join('')}</ul>`);
}

// ---------- Badges ----------
export function BadgesSection(p) {
  const body = p.badges.length
    ? `<ul class="badge-row">${p.badges.map(b => `
        <li class="badge-card">
          <div class="badge-img">${b.icon ? `<img src="${esc(b.icon)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>
          <span class="badge-name">${esc(b.name)}</span>
          ${b.date ? `<span class="badge-date">${esc(b.date)}</span>` : ''}
        </li>`).join('')}</ul>`
    : `<p class="empty">No badges earned yet.</p>`;
  return Card('badges', CardTitle('Badges', p.badges.length ? `<span class="count">${p.badges.length}</span>` : '') + body);
}

// ---------- Submissions ----------
const statusClass = s => {
  const v = (s || '').toLowerCase();
  if (v === 'accepted') return 'ok';
  if (v.includes('wrong')) return 'bad';
  if (v.includes('time limit') || v.includes('memory limit')) return 'warn';
  if (v) return 'err';
  return '';
};
const ago = ms => {
  const diff = (ms - Date.now()) / 1000, rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
  return 'just now';
};

export function SubmissionsTable(p) {
  const body = p.submissions.length
    ? `<ul class="sub-list">${p.submissions.map(s => `
        <li class="sub-row">
          <div class="sub-main">
            ${s.slug ? `<a class="sub-title" href="https://leetcode.com/problems/${encodeURIComponent(s.slug)}/" target="_blank" rel="noreferrer noopener">${esc(s.title)}</a>` : `<span class="sub-title">${esc(s.title)}</span>`}
            ${s.at ? `<time class="sub-time" datetime="${new Date(s.at).toISOString()}" title="${esc(new Date(s.at).toLocaleString())}">${esc(ago(s.at))}</time>` : ''}
          </div>
          <div class="sub-meta">
            ${s.status ? `<span class="status status-${statusClass(s.status)}">${esc(s.status)}</span>` : ''}
            ${s.lang ? `<span class="lang">${esc(s.lang)}</span>` : ''}
          </div>
        </li>`).join('')}</ul>`
    : `<p class="empty">No recent submissions.</p>`;
  return Card('submissions', CardTitle('Recent submissions') + body);
}

// ---------- States ----------
export function LoadingSkeleton() {
  const sk = (cls) => `<div class="card skeleton ${cls}" aria-hidden="true"></div>`;
  return `<div class="dash" aria-busy="true"><p class="sr-only" role="status">Loading profile</p>
    ${sk('sk-hero')}
    <div class="solved-grid">${sk('sk-tile sk-total')}${sk('sk-tile')}${sk('sk-tile')}${sk('sk-tile')}</div>
    ${sk('sk-chart')}
    <div class="row-contest">${sk('sk-chart')}${sk('sk-chart')}</div>
    ${sk('sk-badges')}${sk('sk-list')}
  </div>`;
}

export function ErrorState(kind, username) {
  const msg = kind === 'not_found' ? 'Unable to find this LeetCode profile.'
    : kind === 'rate_limited' ? 'Too many requests right now. Please wait a moment and try again.'
    : 'Unable to load profile data. Please try again.';
  return `<div class="state card" role="alert">
    <span class="state-ico">${icon('alert', 28)}</span>
    <h2 class="state-title">${esc(msg)}</h2>
    ${kind === 'not_found' ? `<p class="muted">Check the spelling of &ldquo;${esc(username)}&rdquo; and try again.</p>` : ''}
    <button type="button" class="btn" data-retry>Retry</button>
  </div>`;
}

export function EmptyState() {
  return `<div class="state card"><span class="state-ico">${icon('search', 28)}</span>
    <h2 class="state-title">View any LeetCode profile</h2>
    <p class="muted">Enter a username above to see solved problems, contests, badges and recent submissions.</p></div>`;
}

export function Dashboard(p) {
  const partial = p.missing.length ? `<p class="notice" role="status">Some sections could not be loaded and are hidden.</p>` : '';
  return `<div class="dash">
    ${partial}
    ${ProfileHero(p)}
    ${SolvedProblems(p)}
    ${DifficultyChart(p)}
    <div class="row-contest">${ContestCard(p)}${StatsGrid(p)}</div>
    ${BadgesSection(p)}
    ${SubmissionsTable(p)}
  </div>`;
}
