import { getLeetCodeProfile } from './api.js';
import { Dashboard, LoadingSkeleton, ErrorState, EmptyState } from './components.js';

const app = document.getElementById('app');
const form = document.getElementById('search-form');
const input = document.getElementById('username');
const submit = document.getElementById('view-btn');

let current = '';
let requestId = 0;
const cache = new Map();   // username -> { at, data }, 5 minutes
const TTL = 5 * 60 * 1000;

async function load(username, { force = false } = {}) {
  const name = username.trim().replace(/^@/, '');
  if (!name) { input.focus(); return; }
  current = name;
  const id = ++requestId;

  const hit = cache.get(name.toLowerCase());
  if (!force && hit && Date.now() - hit.at < TTL) { app.innerHTML = Dashboard(hit.data); syncUrl(name); return; }

  submit.disabled = true; submit.classList.add('loading');
  app.innerHTML = LoadingSkeleton();
  try {
    const data = await getLeetCodeProfile(name);
    if (id !== requestId) return;                       // a newer search superseded this one
    cache.set(name.toLowerCase(), { at: Date.now(), data });
    app.innerHTML = Dashboard(data);
    syncUrl(name);
    try { localStorage.setItem('lc_last_user', name); } catch (e) { /* storage unavailable */ }
  } catch (err) {
    if (id !== requestId) return;
    app.innerHTML = ErrorState(err.kind || 'failed', name);
    app.querySelector('[data-retry]')?.focus();
  } finally {
    if (id === requestId) { submit.disabled = false; submit.classList.remove('loading'); }
  }
}

function syncUrl(name) {
  const url = new URL(location.href);
  url.searchParams.set('u', name);
  history.replaceState(null, '', url);
}

form.addEventListener('submit', e => { e.preventDefault(); load(input.value, { force: true }); });
app.addEventListener('click', e => { if (e.target.closest('[data-retry]')) load(current, { force: true }); });

// Start: ?u=<name> loads immediately; otherwise prefill the last username (never auto-fetch it).
const param = new URLSearchParams(location.search).get('u');
let last = '';
try { last = localStorage.getItem('lc_last_user') || ''; } catch (e) { /* ignore */ }
if (param) { input.value = param; load(param); }
else { input.value = last; app.innerHTML = EmptyState(); }
