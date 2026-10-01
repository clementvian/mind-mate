const http = require('http');
const fs = require('fs');
const path = require('path');

// Minimal .env loader (no dependencies)
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.trim().match(/^([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2];
  });
} catch (e) { /* no .env file */ }

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const https = require('https');
const activity = require('./activity-service');

// GET /api/sheets?action=...&data=...  →  forwards to the Apps Script web app (URL stays server-side)
function forwardToAppsScript(target, res, redirectsLeft) {
  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(obj));
  };
  https.get(target, upstream => {
    const loc = upstream.headers.location;
    if (upstream.statusCode >= 300 && upstream.statusCode < 400 && loc) {
      upstream.resume();
      if (redirectsLeft <= 0) return json(502, { error: 'Too many redirects from Apps Script' });
      return forwardToAppsScript(new URL(loc, target).toString(), res, redirectsLeft - 1);
    }
    res.writeHead(upstream.statusCode || 502, {
      'Content-Type': upstream.headers['content-type'] || 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    upstream.pipe(res);
  }).on('error', err => json(502, { error: err.message }));
}

// POST /api/attendance/biometric  →  body: { rfidUid?, faceId?, ... }
function handleBiometricPost(req, res) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' };
  let raw = '';
  req.on('data', chunk => {
    raw += chunk;
    if (raw.length > 1e6) req.destroy();   // ignore oversized bodies
  });
  req.on('end', () => {
    let body;
    try { body = JSON.parse(raw || '{}'); } catch (e) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }
    // TODO: look up the student by body.rfidUid / body.faceId (see STUDENTS) and write the row to the sheet.
    res.writeHead(200, headers);
    res.end(JSON.stringify({ ok: true, received: body }));
  });
}

// GET /api/attendance?date=YYYY-MM-DD  →  rows from the Google Sheet (as objects keyed by header)
function fetchAttendanceFromSheet(date, res) {
  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(obj));
  };
  const { GOOGLE_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SHEET_RANGE = 'A:Z' } = process.env;
  if (!GOOGLE_API_KEY || !GOOGLE_SHEET_ID) {
    return json(500, { error: 'Set GOOGLE_API_KEY and GOOGLE_SHEET_ID in web/.env' });
  }
  const sheetPath = `/v4/spreadsheets/${encodeURIComponent(GOOGLE_SHEET_ID)}/values/${encodeURIComponent(GOOGLE_SHEET_RANGE)}?key=${encodeURIComponent(GOOGLE_API_KEY)}`;
  https.get({ hostname: 'sheets.googleapis.com', path: sheetPath, headers: { 'Accept': 'application/json' } }, apiRes => {
    let body = '';
    apiRes.on('data', c => body += c);
    apiRes.on('end', () => {
      let data;
      try { data = JSON.parse(body); } catch (e) { return json(502, { error: 'Bad response from Google Sheets' }); }
      if (apiRes.statusCode !== 200) return json(apiRes.statusCode, { error: (data.error && data.error.message) || 'Sheets API error' });
      const [header = [], ...rows] = data.values || [];
      const keys = header.map(h => String(h).trim());
      let records = rows.map(r => Object.fromEntries(keys.map((k, i) => [k, r[i] || ''])));
      if (date) records = records.filter(r => String(r.date || r.Date || '').slice(0, 10) === date);
      json(200, { records });
    });
  }).on('error', err => json(502, { error: err.message }));
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // GET /api/sheets?action=<action>&data=<urlencoded json>  — proxy to Google Apps Script
  if (req.url.startsWith('/api/sheets')) {
    const q = new URL(req.url, 'http://localhost').searchParams;
    if (!process.env.GAS_URL) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Set GAS_URL in web/.env' }));
      return;
    }
    const target = `${process.env.GAS_URL}?action=${encodeURIComponent(q.get('action') || '')}&data=${encodeURIComponent(q.get('data') || '')}`;
    forwardToAppsScript(target, res, 5);
    return;
  }

  // POST /api/attendance/biometric  — ESP32 sends rfidUid or faceId, resolved to real student
  if (req.method === 'POST' && req.url.startsWith('/api/attendance/biometric')) {
    handleBiometricPost(req, res);
    return;
  }

  // GET /api/attendance?date=YYYY-MM-DD  — fetch rows from Google Sheet
  if (req.url.startsWith('/api/attendance')) {
    const date = new URL(req.url, 'http://localhost').searchParams.get('date') || '';
    fetchAttendanceFromSheet(date, res);
    return;
  }

  // --- Coding activity (attendance) ---
  // GET /api/activity?github=&leetcode=&third=&refresh=1  → all three profiles + combined
  // GET /api/github?username=                             → GitHub only (normalized)
  // GET /api/leetcode?username=                           → LeetCode activity only (normalized)
  // GET /api/leetcode-profile?username=                   → LeetCode full profile (badges, contest history, skills, stats)
  if (req.url.startsWith('/api/activity') || req.url.startsWith('/api/github') || req.url.startsWith('/api/leetcode')) {
    const q = new URL(req.url, 'http://localhost').searchParams;
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(obj));
    };
    if (req.url.startsWith('/api/activity')) {
      activity.getActivity(
        { github: q.get('github'), leetcode: q.get('leetcode'), third: q.get('third') },
        { refresh: q.get('refresh') === '1' }
      ).then(v => send(200, v), e => send(500, { error: e.message }));
    } else if (req.url.startsWith('/api/leetcode-profile')) {
      const user = (q.get('username') || '').trim().replace(/^@/, '');
      if (!user) return send(400, { error: 'username required' });
      activity.getLeetCodeFullProfile(user).then(v => send(200, v), e => send(e.status || (e.code === 'NOT_FOUND' ? 404 : 502), { error: e.message }));
    } else if (req.url.startsWith('/api/leetcode')) {
      const user = (q.get('username') || '').trim().replace(/^@/, '');
      if (!user) return send(400, { error: 'username required' });
      activity.leetcode(user).then(v => send(200, v), e => send(e.status || (e.code === 'NOT_FOUND' ? 404 : 502), { error: e.message }));
    } else {
      const fn = activity.github;
      const user = (q.get('username') || '').trim().replace(/^@/, '');
      if (!user) return send(400, { error: 'username required' });
      fn(user).then(v => send(200, v), e => send(e.status || (e.code === 'NOT_FOUND' ? 404 : 502), { error: e.message }));
    }
    return;
  }

  let cleanUrl = req.url.split('?')[0];
  if (cleanUrl === '/') {
    // Redirect to login page; session guard in app.js redirects authenticated users
    res.writeHead(302, { 'Location': '/login.html' });
    res.end();
    return;
  }

  const filePath = path.join(PUBLIC_DIR, cleanUrl);

  // Security check: ensure file is within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA-style routing if needed
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`MindMate Web Dev Server running at: http://localhost:${PORT}`);
});
