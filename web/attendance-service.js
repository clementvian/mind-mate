// RFID attendance from a Google Sheet. The sheet is the source of truth: everything is recomputed on every fetch.
// Sheet columns (detected by header name, falling back to this order): Timestamp, RFID UID, Name.
const crypto = require('crypto');
const auth = require('./auth');

const TIMEOUT_MS = 10000;
const RETRIES = 2;
const CACHE_MS = 2 * 60 * 1000;
const MIN_FORCED_REFRESH_MS = 10 * 1000;

const cfg = () => ({
  sheetId: process.env.SHEET_ID || process.env.GOOGLE_SHEET_ID || '',
  tab: process.env.TAB_NAME || '',
  apiKey: process.env.GOOGLE_API_KEY || '',
  serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  tz: process.env.TIMEZONE || 'Asia/Kolkata',
  cutoff: process.env.CUTOFF_TIME || '10:00',
  holidays: (process.env.HOLIDAYS || '').split(',').map(s => s.trim()).filter(Boolean),
  startDate: process.env.ATTENDANCE_START_DATE || ''
});

class SheetError extends Error { constructor(status, message) { super(message); this.status = status; } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- HTTP: 10s timeout, 2 retries with exponential backoff ----------
async function request(url, opts = {}) {
  let last;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      const text = await res.text();
      if (res.ok) return text;
      let detail = ''; try { detail = JSON.parse(text).error.message; } catch (e) { /* not JSON */ }
      const err = new SheetError(res.status, detail || `HTTP ${res.status}`);
      if (res.status < 500 && res.status !== 429) throw err;
      last = err;
    } catch (e) {
      if (e instanceof SheetError && e.status < 500 && e.status !== 429) throw e;
      last = e instanceof SheetError ? e : new SheetError(504, e.name === 'AbortError' ? 'Google Sheets timed out' : 'Could not reach Google Sheets');
    } finally { clearTimeout(timer); }
    if (attempt < RETRIES) await sleep(500 * 2 ** attempt);
  }
  throw last;
}

// ---------- Auth to Google ----------
let saCache = { token: '', exp: 0 };
async function serviceAccountToken(json) {
  if (saCache.token && saCache.exp > Date.now() + 60000) return saCache.token;
  const sa = JSON.parse(json);
  const b = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = b({ alg: 'RS256', typ: 'JWT' }) + '.' + b({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600
  });
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig });
  const out = JSON.parse(await request('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
  }));
  saCache = { token: out.access_token, exp: Date.now() + (out.expires_in || 3600) * 1000 };
  return saCache.token;
}

// ---------- Read the sheet (Sheets API v4, or the CSV export for a published sheet) ----------
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function readSheetValues(c) {
  if (!c.sheetId) throw new SheetError(500, 'SHEET_ID is not set in .env');
  try {
    if (c.serviceAccount || c.apiKey) {
      const range = encodeURIComponent(c.tab ? `${c.tab}!A:Z` : 'A:Z');
      let url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(c.sheetId)}/values/${range}?valueRenderOption=FORMATTED_VALUE`;
      const headers = {};
      if (c.serviceAccount) headers.Authorization = 'Bearer ' + await serviceAccountToken(c.serviceAccount);
      else url += '&key=' + encodeURIComponent(c.apiKey);
      return JSON.parse(await request(url, { headers })).values || [];
    }
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(c.sheetId)}/gviz/tq?tqx=out:csv${c.tab ? '&sheet=' + encodeURIComponent(c.tab) : ''}`;
    return parseCsv(await request(url));
  } catch (e) {
    if (!(e instanceof SheetError)) throw e;
    if (e.status === 403) throw new SheetError(403, 'The sheet is not accessible. Share it with the service account, or publish it / allow viewing with the link.');
    if (e.status === 404) throw new SheetError(404, 'Sheet not found. Check SHEET_ID.');
    if (e.status === 400) throw new SheetError(400, `Tab or range not found. Check TAB_NAME. (${e.message})`);
    throw e;
  }
}

// ---------- Cache (2 min), shared by all users ----------
let cache = { at: 0, values: null, pending: null };
async function getValues(force) {
  const age = Date.now() - cache.at;
  if (cache.values && age < (force ? MIN_FORCED_REFRESH_MS : CACHE_MS)) return { values: cache.values, cached: true, at: cache.at };
  if (cache.pending) return cache.pending;
  cache.pending = (async () => {
    try {
      const values = await readSheetValues(cfg());
      cache = { at: Date.now(), values, pending: null };
      return { values, cached: false, at: cache.at };
    } catch (e) {
      cache.pending = null;
      if (cache.values) return { values: cache.values, cached: true, at: cache.at, stale: e.message };   // serve last good data
      throw e;
    }
  })();
  return cache.pending;
}

// ---------- Parsing ----------
const normUid = auth.normUid;
const pad = n => String(n).padStart(2, '0');

function partsInZone(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
}

// Accepts ISO strings (with or without offset), "DD/MM/YYYY HH:mm:ss" (optionally AM/PM) and Sheets serial numbers.
// Values without a zone are treated as wall-clock time already in TIMEZONE.
function parseTimestamp(raw, tz) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s) && Number(s) > 20000 && Number(s) < 80000) {
    const d = new Date(Math.round((Number(s) - 25569) * 86400000));
    return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 19) };
  }
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i);
  if (m) {
    if (m[7] && m[4]) { const inst = new Date(s.replace(' ', 'T')); return isNaN(inst) ? null : partsInZone(inst, tz); }
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${pad(m[4] || 0)}:${m[5] || '00'}:${m[6] || '00'}` };
  }
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?)?$/i);
  if (m) {
    let h = Number(m[4] || 0);
    if (m[7]) { const pm = m[7].toUpperCase() === 'PM'; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    const day = Number(m[1]), mon = Number(m[2]);
    if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
    return { date: `${m[3]}-${pad(mon)}-${pad(day)}`, time: `${pad(h)}:${m[5] || '00'}:${m[6] || '00'}` };
  }
  return null;
}

function detectColumns(values, tz) {
  const first = values[0] || [];
  const looksData = parseTimestamp(first[0], tz) !== null;
  const find = re => first.findIndex(h => re.test(String(h)));
  let ts = find(/time|date|when/i), uid = find(/rfid|uid|card|tag/i), name = find(/name|student/i);
  const headerDetected = !looksData && (ts >= 0 || uid >= 0 || name >= 0);
  if (!headerDetected) { ts = 0; uid = 1; name = 2; }   // assumed order: Timestamp, RFID UID, Name
  else { if (ts < 0) ts = 0; if (uid < 0) uid = [0, 1, 2].find(i => i !== ts && i !== name) ?? 1; }
  return { ts, uid, name, headerDetected, labels: { timestamp: first[ts], rfid: first[uid], name: first[name] } };
}

function collectTaps(values, c) {
  const cols = detectColumns(values, c.tz);
  const taps = new Map();        // uid -> Map(date -> { first, last, count })
  const unknown = new Map();     // uid -> info (filled later)
  let skipped = 0, used = 0;
  for (const row of values.slice(cols.headerDetected ? 1 : 0)) {
    if (!row || row.every(x => !String(x ?? '').trim())) continue;   // blank row
    const uid = normUid(row[cols.uid]);
    const t = parseTimestamp(row[cols.ts], c.tz);
    if (!uid || !t) { skipped++; continue; }
    used++;
    const days = taps.get(uid) || new Map(); taps.set(uid, days);
    const d = days.get(t.date);
    if (!d) days.set(t.date, { first: t.time, last: t.time, count: 1, name: String(row[cols.name] ?? '').trim() });
    else { d.count++; if (t.time < d.first) d.first = t.time; if (t.time > d.last) d.last = t.time; }
  }
  return { taps, cols, skipped, used };
}

// ---------- Attendance rules ----------
const minutesOf = t => { const m = String(t).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i); if (!m) return 600; let h = Number(m[1]); if (m[3]) { const pm = m[3].toUpperCase() === 'PM'; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; } return h * 60 + Number(m[2]); };
const isSunday = d => new Date(d + 'T00:00:00Z').getUTCDay() === 0;
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const hm = t => (t ? t.slice(0, 5) : null);

function statusFor(date, tap, ctx) {
  if (tap) return 'Present';
  if (date > ctx.today) return 'Future';
  if (isSunday(date)) return 'Sunday';
  if (ctx.holidays.has(date)) return 'Holiday';
  if (date === ctx.today && ctx.nowMin < ctx.cutoffMin) return 'Pending';
  return 'Absent';
}

function buildProfile(user, tapsByDate, from, to, ctx) {
  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (ctx.startDate && d < ctx.startDate) continue;
    const tap = tapsByDate && tapsByDate.get(d);
    days.push({ profileId: user.username, date: d, status: statusFor(d, tap, ctx), checkIn: tap ? hm(tap.first) : null, checkOut: tap ? hm(tap.last) : null });
  }
  const present = days.filter(x => x.status === 'Present').length;
  const absent = days.filter(x => x.status === 'Absent').length;

  // Streak: consecutive working days present, counted back from today (non-working days and today-pending are skipped).
  let streak = 0;
  const lowest = ctx.startDate || addDays(ctx.today, -366);
  for (let d = ctx.today; d >= lowest; d = addDays(d, -1)) {
    const st = statusFor(d, tapsByDate && tapsByDate.get(d), ctx);
    if (st === 'Present') streak++;
    else if (st === 'Absent') break;
  }
  return {
    profileId: user.username, name: user.name, rfidUid: user.rfidUid || null, linked: !!user.rfidUid, days,
    summary: { present, absent, workingDays: present + absent, percentage: present + absent ? Math.round((present / (present + absent)) * 1000) / 10 : null, streak }
  };
}

async function getAttendance({ month, requester, force = false }) {
  const c = cfg();
  const { values, cached, at, stale } = await getValues(force);
  const { taps, cols, skipped, used } = collectTaps(values, c);

  const now = partsInZone(new Date(), c.tz);
  const ctx = {
    today: now.date, nowMin: Number(now.time.slice(0, 2)) * 60 + Number(now.time.slice(3, 5)),
    cutoffMin: minutesOf(c.cutoff), holidays: new Set(c.holidays), startDate: c.startDate
  };
  const ym = /^\d{4}-\d{2}$/.test(month || '') ? month : now.date.slice(0, 7);
  const from = ym + '-01';
  const [yy, mm] = ym.split('-').map(Number);
  const to = `${ym}-${pad(new Date(Date.UTC(yy, mm, 0)).getUTCDate())}`;

  const students = auth.listUsers().filter(u => u.role === 'student');
  const visible = requester.role === 'teacher' ? students : students.filter(u => u.username === requester.username);
  const profiles = visible.map(u => buildProfile(u, u.rfidUid ? taps.get(u.rfidUid) : null, from, to, ctx));

  // Taps from cards that belong to nobody (teachers only; never crashes the page)
  const known = new Set(auth.listUsers().map(u => u.rfidUid).filter(Boolean));
  const unmatched = requester.role !== 'teacher' ? undefined : [...taps.entries()].filter(([uid]) => !known.has(uid)).map(([uid, byDate]) => {
    const dates = [...byDate.keys()].sort(), lastDate = dates[dates.length - 1], lastTap = byDate.get(lastDate);
    return { uid, name: lastTap.name || null, taps: [...byDate.values()].reduce((a, x) => a + x.count, 0), lastSeen: `${lastDate} ${hm(lastTap.last)}` };
  }).sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));

  return {
    month: ym, today: ctx.today,
    meta: {
      fetchedAt: at, cached, stale: stale || null, timezone: c.tz, cutoff: c.cutoff, holidays: c.holidays,
      columns: { ...cols.labels, headerDetected: cols.headerDetected, positions: { timestamp: cols.ts, rfid: cols.uid, name: cols.name } },
      rows: { used, skipped }
    },
    profiles, unmatched
  };
}

module.exports = { getAttendance, parseTimestamp, parseCsv, statusFor, normUid };
