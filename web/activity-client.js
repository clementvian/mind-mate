// Client for /api/activity. Caches 15 minutes in localStorage, dedupes in-flight requests.
(function () {
  const TTL = 15 * 60 * 1000;
  const inflight = new Map();

  function urlFor(users, refresh) {
    const p = new URLSearchParams();
    if (users.github) p.set('github', users.github);
    if (users.leetcode) p.set('leetcode', users.leetcode);
    if (users.third) p.set('third', users.third);
    if (refresh) p.set('refresh', '1');
    return '/api/activity?' + p.toString();
  }
  const cacheKey = u => 'mm_activity_' + [u.github, u.leetcode, u.third].join('|');

  async function load(users = {}, { force = false } = {}) {
    const key = cacheKey(users);
    if (!force) {
      try {
        const c = JSON.parse(localStorage.getItem(key) || 'null');
        if (c && Date.now() - c.at < TTL) return c.data;
      } catch (e) { /* ignore */ }
    }
    const url = urlFor(users, force);
    if (inflight.has(url)) return inflight.get(url);
    const p = fetch(url).then(async r => {
      if (!r.ok) throw new Error('Activity service returned ' + r.status);
      const data = await r.json();
      try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* quota */ }
      return data;
    }).finally(() => inflight.delete(url));
    inflight.set(url, p);
    return p;
  }

  // Render a row of present/absent dots for the last n days (oldest → newest)
  function stripHTML(profile, n = 14) {
    if (!profile || profile.status !== 'ok') return '';
    const days = profile.days.slice(-n);
    return days.map(d =>
      `<span class="att-dot${d.present ? ' on' : ''}" title="${d.date}: ${d.count} ${d.present ? 'active' : 'no activity'}"></span>`
    ).join('');
  }

  // Message for a failed / rate-limited profile
  function errorText(profile) {
    if (!profile) return 'No data';
    if (profile.status === 'rate_limited') {
      const when = profile.resetAt ? ` Try again after ${new Date(profile.resetAt).toLocaleTimeString()}.` : '';
      return 'Rate limit reached.' + when;
    }
    return profile.error || 'Could not load data';
  }

  window.ActivityService = { load, stripHTML, errorText, TTL };
})();
