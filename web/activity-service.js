// Unified coding-activity ("attendance") service: GitHub + LeetCode + a third platform.
// Runs on the server so tokens stay secret and LeetCode's CORS block is avoided.
//
// Normalized result per profile:
//   { platform, username, days:[{date,count,present}], currentStreak, longestStreak,
//     totalActiveDays, lastActive, status:'ok'|'error'|'rate_limited', fetchedAt,
//     error?, resetAt?, limited?, details? }

const TZ = 'Asia/Kolkata';
const TIMEOUT_MS = 10000;
const RETRIES = 2;
const CACHE_TTL_MS = 15 * 60 * 1000;
const WINDOW_DAYS = 365;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// ---------- IST date helpers ----------
const istFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const istDate = ms => istFmt.format(new Date(ms));          // 'YYYY-MM-DD' in IST
const todayIST = () => istDate(Date.now());
const shiftDate = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---------- HTTP with timeout + retry/backoff ----------
class HttpError extends Error {
  constructor(status, message, headers) { super(message); this.status = status; this.headers = headers; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function request(url, opts = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      if (res.ok) return await res.json();
      const err = new HttpError(res.status, `HTTP ${res.status}`, res.headers);
      if (res.status < 500) throw err;            // 4xx: don't retry
      lastErr = err;
    } catch (e) {
      if (e instanceof HttpError && e.status < 500) throw e;
      lastErr = e.name === 'AbortError' ? new Error(`Timed out after ${TIMEOUT_MS / 1000}s`) : e;
    } finally { clearTimeout(timer); }
    if (attempt < RETRIES) await sleep(500 * 2 ** attempt);   // 500ms, 1000ms
  }
  throw lastErr;
}

// ---------- Normalization ----------
function normalize(platform, username, counts, extra = {}) {
  const today = todayIST();
  const start = shiftDate(today, -(WINDOW_DAYS - 1));
  const days = [];
  for (let d = start; d <= today; d = shiftDate(d, 1)) {
    const count = counts[d] || 0;
    days.push({ date: d, count, present: count > 0 });
  }
  let longest = 0, run = 0, lastActive = null, total = 0;
  for (const day of days) {
    if (day.present) { run++; total++; lastActive = day.date; longest = Math.max(longest, run); } else run = 0;
  }
  // Current streak: counts back from today, or from yesterday if today has no activity yet.
  let i = days.length - 1;
  if (!days[i].present) i--;
  let current = 0;
  while (i >= 0 && days[i].present) { current++; i--; }
  return { platform, username, days, currentStreak: current, longestStreak: longest, totalActiveDays: total,
           lastActive, status: 'ok', fetchedAt: Date.now(), ...extra };
}

function failed(platform, username, e) {
  const rate = e instanceof HttpError && (e.status === 429 || (e.status === 403 && e.headers && e.headers.get('x-ratelimit-remaining') === '0'));
  const reset = e instanceof HttpError && e.headers && e.headers.get('x-ratelimit-reset');
  return {
    platform, username, days: [], currentStreak: 0, longestStreak: 0, totalActiveDays: 0, lastActive: null,
    status: rate ? 'rate_limited' : 'error', fetchedAt: Date.now(),
    error: e.code === 'NOT_FOUND' ? `User "${username}" not found`
         : e.code === 'NOT_CONFIGURED' ? e.message
         : e instanceof HttpError && e.status === 401 ? 'Invalid or expired token (401)'
         : e instanceof HttpError && e.status === 404 ? `User "${username}" not found`
         : rate ? 'Rate limit reached' : (e.message || 'Request failed'),
    ...(reset ? { resetAt: Number(reset) * 1000 } : {})
  };
}
const coded = (code, msg) => Object.assign(new Error(msg), { code });

// ---------- GitHub ----------
async function github(username) {
  if (!username) throw coded('NOT_CONFIGURED', 'GitHub username not set');
  const token = process.env.GITHUB_TOKEN;
  const headers = { 'User-Agent': 'MindMate/1.0', Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const [user, repos] = await Promise.all([
    request(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers }),
    request(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6`, { headers }).catch(() => [])
  ]);
  const details = {
    name: user.name || user.login, avatar: user.avatar_url, bio: user.bio, url: user.html_url,
    repos: user.public_repos, followers: user.followers, following: user.following,
    topRepos: (repos || []).map(r => ({ name: r.name, url: r.html_url, description: r.description, language: r.language, stars: r.stargazers_count }))
  };

  const counts = {};
  let limited = false;
  if (token) {
    const to = new Date(), from = new Date(Date.now() - (WINDOW_DAYS - 1) * 86400000);
    const query = `query($login:String!,$from:DateTime!,$to:DateTime!){ user(login:$login){ contributionsCollection(from:$from,to:$to){ contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } } } } }`;
    const data = await request('https://api.github.com/graphql', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { login: username, from: from.toISOString(), to: to.toISOString() } })
    });
    if (data.errors && !data.data) throw new Error(data.errors[0].message);
    const cal = data.data && data.data.user && data.data.user.contributionsCollection.contributionCalendar;
    if (!cal) throw coded('NOT_FOUND');
    cal.weeks.forEach(w => w.contributionDays.forEach(d => { counts[d.date] = d.contributionCount; }));
  } else {
    // No token: public contributions proxy (less accurate, no private contributions).
    const data = await request(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`, { headers: { 'User-Agent': 'MindMate/1.0' } });
    (data.contributions || []).forEach(d => { counts[d.date] = d.count; });
    limited = true;
  }
  return normalize('github', username, counts, { limited, details });
}

// ---------- LeetCode (official GraphQL API) ----------
// POST https://leetcode.com/graphql/
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

const LEETCODE_QUERY = `
query getUserFullLeetCodeData($username: String!) {
  matchedUser(username: $username) {
    username
    githubUrl
    twitterUrl
    linkedinUrl
    profile {
      ranking
      userAvatar
      realName
      aboutMe
      reputation
      countryName
      company
      school
      skillTags
    }
    badges {
      id
      displayName
      icon
      creationDate
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
      totalSubmissionNum {
        difficulty
        count
        submissions
      }
    }
    submissionCalendar
  }
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    totalParticipants
    topPercentage
    badge {
      name
    }
  }
  userContestRankingHistory(username: $username) {
    attended
    rating
    ranking
    trendDirection
    problemsSolved
    totalProblems
    contest {
      title
      startTime
    }
  }
  allQuestionsCount {
    difficulty
    count
  }
  recentSubmissionList(username: $username) {
    title
    titleSlug
    timestamp
    statusDisplay
    lang
  }
}
`;

async function fetchLeetCodeRaw(username) {
  if (!username) throw coded('NOT_CONFIGURED', 'LeetCode username not set');
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': UA,
    'Referer': 'https://leetcode.com'
  };

  const data = await request(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: LEETCODE_QUERY,
      variables: { username }
    })
  });

  if (!data || typeof data !== 'object') throw new Error('Unexpected response from LeetCode GraphQL API');

  const matchedUser = data.data && data.data.matchedUser;
  if (!matchedUser) {
    const errText = Array.isArray(data.errors) ? data.errors.map(e => e && e.message).join(' ') : '';
    if (/does not exist|not found/i.test(errText) || (data.data && data.data.matchedUser === null)) {
      throw coded('NOT_FOUND', `User "${username}" not found`);
    }
    if (/rate|too many|limit/i.test(errText)) {
      throw Object.assign(new HttpError(429, errText, null), { headers: null });
    }
    throw new Error(errText || 'LeetCode API error');
  }

  return data;
}

async function leetcode(username) {
  const data = await fetchLeetCodeRaw(username);
  const matchedUser = data.data.matchedUser;
  const profile = matchedUser.profile || {};
  const acList = (matchedUser.submitStatsGlobal && matchedUser.submitStatsGlobal.acSubmissionNum) || [];
  const findCount = diff => {
    const item = acList.find(x => String(x.difficulty).toLowerCase() === diff.toLowerCase());
    return item ? Number(item.count) || 0 : 0;
  };
  const total = findCount('all');
  const easy = findCount('easy');
  const medium = findCount('medium');
  const hard = findCount('hard');

  const allQuestions = (data.data && data.data.allQuestionsCount) || [];
  const findTotal = diff => {
    const item = allQuestions.find(x => String(x.difficulty).toLowerCase() === diff.toLowerCase());
    return item ? Number(item.count) || 0 : 0;
  };
  const totalQuestions = findTotal('all');
  const totalEasy = findTotal('easy');
  const totalMedium = findTotal('medium');
  const totalHard = findTotal('hard');

  const contest = (data.data && data.data.userContestRanking) || {};

  // submissionCalendar: stringified JSON "{\"<unix_ts>\": count}" -> IST calendar days
  const counts = {};
  let cal = matchedUser.submissionCalendar;
  if (typeof cal === 'string') {
    try { cal = JSON.parse(cal); } catch (e) { cal = {}; }
  }
  if (!cal || typeof cal !== 'object') cal = {};
  for (const [ts, n] of Object.entries(cal)) {
    const c = Number(n), t = Number(ts);
    if (!(c > 0) || !isFinite(t)) continue;
    const d = istDate(t * 1000);
    counts[d] = (counts[d] || 0) + c;
  }

  const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
  const details = {
    total, totalQuestions,
    easy, medium, hard,
    totalEasy, totalMedium, totalHard,
    ranking: num(profile.ranking) || null,
    reputation: num(profile.reputation),
    contributionPoint: num(profile.reputation),
    contestRating: contest.rating ? Math.round(contest.rating) : null,
    contestRank: contest.globalRanking || null,
    contestsAttended: num(contest.attendedContestsCount),
    avatar: profile.userAvatar || null,
    realName: profile.realName || matchedUser.username,
    recent: (Array.isArray(data.data && data.data.recentSubmissionList) ? data.data.recentSubmissionList : []).slice(0, 20).map(x => ({
      title: x.title || 'Untitled',
      slug: x.titleSlug || '',
      at: Number(x.timestamp) * 1000 || 0,
      status: x.statusDisplay || '',
      lang: x.lang || ''
    }))
  };

  return normalize('leetcode', username, counts, { details });
}

async function getLeetCodeFullProfile(username) {
  const data = await fetchLeetCodeRaw(username);
  const user = data.data.matchedUser;
  const prof = user.profile || {};
  const acList = user.submitStatsGlobal?.acSubmissionNum || [];
  const totList = user.submitStatsGlobal?.totalSubmissionNum || [];

  const find = (arr, d) => arr.find(x => String(x.difficulty).toLowerCase() === d.toLowerCase());
  const acAll = find(acList, 'all'), totAll = find(totList, 'all');

  const allQuestions = data.data.allQuestionsCount || [];
  const findTotal = d => {
    const item = find(allQuestions, d);
    return item ? Number(item.count) || null : null;
  };

  const easy = find(acList, 'easy')?.count ?? null;
  const medium = find(acList, 'medium')?.count ?? null;
  const hard = find(acList, 'hard')?.count ?? null;
  const total = acAll?.count ?? null;

  const totalSubs = totAll?.submissions ?? null;
  const acSubs = acAll?.submissions ?? null;
  const acceptance = (acSubs && totalSubs) ? (acSubs / totalSubs) * 100 : null;

  const links = [];
  if (user.githubUrl) links.push({ label: 'GitHub', url: user.githubUrl });
  if (user.twitterUrl) links.push({ label: 'Twitter', url: user.twitterUrl });
  if (user.linkedinUrl) links.push({ label: 'LinkedIn', url: user.linkedinUrl });

  const badges = (Array.isArray(user.badges) ? user.badges : []).map(b => ({
    id: String(b.id || b.displayName),
    name: b.displayName,
    icon: b.icon ? (b.icon.startsWith('/') ? 'https://leetcode.com' + b.icon : b.icon) : null,
    date: b.creationDate || null
  }));

  const contest = data.data.userContestRanking || {};
  const history = (Array.isArray(data.data.userContestRankingHistory) ? data.data.userContestRankingHistory : [])
    .filter(h => h && h.attended && h.rating != null && h.contest)
    .map(h => ({
      title: h.contest?.title || 'Contest',
      at: h.contest?.startTime ? Number(h.contest.startTime) : null,
      rating: h.rating,
      ranking: h.ranking || null,
      solved: h.problemsSolved ?? null,
      totalProblems: h.totalProblems ?? null
    }));

  const submissions = (Array.isArray(data.data.recentSubmissionList) ? data.data.recentSubmissionList : []).map(s => ({
    title: s.title,
    slug: s.titleSlug || null,
    status: s.statusDisplay || null,
    lang: s.lang || null,
    at: s.timestamp ? Number(s.timestamp) * 1000 : null
  }));

  return {
    username: user.username || username,
    avatar: prof.userAvatar || null,
    realName: prof.realName || null,
    bio: prof.aboutMe || null,
    country: prof.countryName || null,
    company: prof.company || null,
    school: prof.school || null,
    skills: Array.isArray(prof.skillTags) ? prof.skillTags : [],
    links,
    ranking: prof.ranking || null,
    reputation: prof.reputation || null,
    solved: {
      total, easy, medium, hard,
      totalAvailable: findTotal('all'),
      easyAvailable: findTotal('easy'),
      mediumAvailable: findTotal('medium'),
      hardAvailable: findTotal('hard')
    },
    acceptance,
    totalSubmissions: totalSubs,
    badges,
    contest: {
      rating: contest.rating || null,
      ranking: contest.globalRanking || null,
      topPercentage: contest.topPercentage || null,
      attended: contest.attendedContestsCount ?? 0,
      participants: contest.totalParticipants || null,
      badge: contest.badge?.name || null,
      history
    },
    submissions,
    missing: []
  };
}

// ---------- Third platform (Codeforces) ----------
async function codeforces(username) {
  if (!username) throw coded('NOT_CONFIGURED', 'Third-profile username not set');
  let data;
  try {
    data = await request(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}`, { headers: { 'User-Agent': UA } });
  } catch (e) {
    if (e instanceof HttpError && e.status === 400) throw coded('NOT_FOUND');   // CF returns 400 for unknown handles
    throw e;
  }
  if (data.status !== 'OK') throw new Error(data.comment || 'Codeforces API error');
  const counts = {};
  data.result.filter(s => s.verdict === 'OK').forEach(s => {
    const d = istDate(s.creationTimeSeconds * 1000);
    counts[d] = (counts[d] || 0) + 1;
  });
  return normalize('codeforces', username, counts);
}

const THIRD = { codeforces };

// ---------- Combined + cache ----------
function combine(list) {
  const counts = {};
  list.filter(p => p.status === 'ok').forEach(p => p.days.forEach(d => { if (d.count) counts[d.date] = (counts[d.date] || 0) + d.count; }));
  const ok = list.some(p => p.status === 'ok');
  if (!ok) return { platform: 'combined', username: '', days: [], currentStreak: 0, longestStreak: 0, totalActiveDays: 0, lastActive: null, status: 'error', fetchedAt: Date.now(), error: 'No profile could be fetched' };
  return normalize('combined', list.map(p => p.username).filter(Boolean).join(' + '), counts);
}

const cache = new Map();   // key -> { at, value, pending }

function config(overrides = {}) {
  return {
    github: (overrides.github || process.env.GITHUB_USERNAME || '').trim().replace(/^@/, ''),
    leetcode: (overrides.leetcode || process.env.LEETCODE_USERNAME || '').trim().replace(/^@/, ''),
    thirdPlatform: (process.env.THIRD_PLATFORM || 'codeforces').toLowerCase(),
    third: (overrides.third || process.env.THIRD_USERNAME || '').trim()
  };
}

async function getActivity(overrides = {}, { refresh = false } = {}) {
  const cfg = config(overrides);
  const key = JSON.stringify(cfg);
  const hit = cache.get(key);
  if (!refresh && hit && hit.value && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.value, cached: true };
  if (hit && hit.pending) return hit.pending;

  const thirdFn = THIRD[cfg.thirdPlatform];
  const pending = (async () => {
    const jobs = [
      github(cfg.github), leetcode(cfg.leetcode),
      thirdFn ? thirdFn(cfg.third) : Promise.reject(coded('NOT_CONFIGURED', `Unsupported THIRD_PLATFORM "${cfg.thirdPlatform}"`))
    ];
    const names = [['github', cfg.github], ['leetcode', cfg.leetcode], [cfg.thirdPlatform, cfg.third]];
    const settled = await Promise.allSettled(jobs);
    const profiles = settled.map((r, i) => r.status === 'fulfilled' ? r.value : failed(names[i][0], names[i][1], r.reason));
    const value = {
      generatedAt: Date.now(), timezone: TZ, today: todayIST(),
      profiles: { github: profiles[0], leetcode: profiles[1], third: profiles[2] },
      combined: combine(profiles)
    };
    cache.set(key, { at: Date.now(), value });
    return value;
  })();
  cache.set(key, { ...(hit || {}), pending });
  try { return await pending; } finally { const c = cache.get(key); if (c) delete c.pending; }
}

module.exports = { getActivity, github, leetcode, getLeetCodeFullProfile, codeforces, istDate, normalize, CACHE_TTL_MS };
