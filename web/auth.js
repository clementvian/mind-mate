// Server-side authentication: bcrypt password check + signed, expiring session tokens.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf8'));
let rfidMap = {};
try { rfidMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'rfid-map.json'), 'utf8')); } catch (e) { /* optional */ }

// A random per-process secret works locally; set SESSION_SECRET on the host so tokens survive restarts.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) console.warn('SESSION_SECRET not set: sessions reset whenever the server restarts.');

// Compared against when the username is unknown, so response time does not reveal which names exist.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(8).toString('hex'), 12);

// Same normalization the sheet service uses, so env/seed values match tapped UIDs.
const normUid = v => String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

function rfidFor(username) {
  // RFID_UID_<USERNAME> in .env overrides data/rfid-map.json
  return normUid(process.env[`RFID_UID_${username}`] || rfidMap[username] || '');
}

function publicUser(u) {
  return { username: u.username, name: u.name, role: u.role, rfidUid: rfidFor(u.username) };
}

const listUsers = () => users.map(publicUser);

// ---------- login ----------
const attempts = new Map();   // ip -> { n, first }
function throttled(ip) {
  const now = Date.now(), rec = attempts.get(ip);
  if (!rec || now - rec.first > 15 * 60 * 1000) { attempts.set(ip, { n: 0, first: now }); return false; }
  return rec.n >= 10;
}

async function login(username, password, ip = '') {
  if (throttled(ip)) return { ok: false, status: 429, error: 'Too many attempts. Try again later.' };
  const name = String(username || '').trim().toUpperCase();
  const user = users.find(u => u.username === name);
  const valid = await bcrypt.compare(String(password || ''), user ? user.passwordHash : DUMMY_HASH);
  if (!user || !valid) {
    const rec = attempts.get(ip); if (rec) rec.n++;
    return { ok: false, status: 401, error: 'Invalid username or password' };
  }
  attempts.delete(ip);
  return { ok: true, token: sign({ u: user.username, r: user.role, exp: Date.now() + TOKEN_TTL_MS }), user: publicUser(user) };
}

// ---------- tokens ----------
const b64 = b => Buffer.from(b).toString('base64url');
function sign(payload) {
  const body = b64(JSON.stringify(payload));
  return body + '.' + crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
}
function verify(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expect = crypto.createHmac('sha256', SECRET).update(body).digest();
  let given; try { given = Buffer.from(mac, 'base64url'); } catch (e) { return null; }
  if (given.length !== expect.length || !crypto.timingSafeEqual(given, expect)) return null;
  let p; try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!p.exp || p.exp < Date.now()) return null;
  const user = users.find(u => u.username === p.u);
  return user ? publicUser(user) : null;
}

function userFromRequest(req) {
  const h = req.headers.authorization || '';
  return verify(h.startsWith('Bearer ') ? h.slice(7) : '');
}

module.exports = { login, userFromRequest, listUsers, normUid };
