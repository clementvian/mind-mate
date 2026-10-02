// Run:  node --test web/test/attendance.test.js      (uses a fake sheet; no network or credentials needed)
const test = require('node:test');
const assert = require('node:assert');

process.env.SHEET_ID = 'TESTSHEET';
process.env.TAB_NAME = '';
process.env.GOOGLE_API_KEY = '';
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '';
process.env.HOLIDAYS = '2026-08-15';
process.env.CUTOFF_TIME = '10:00';
process.env.RFID_UID_HEMANTH = '04:A1:B2';     // separators are stripped before matching
process.env.RFID_UID_BHARUNESH = 'bb22';
process.env.RFID_UID_BRANESH = 'CC33';

// Aug 2026: 31 days - 5 Sundays - 1 holiday (Sat 15th) = 25 working days.
const rows = [['Timestamp', 'RFID UID', 'Name']];
const sundays = new Set([2, 9, 16, 23, 30]);
const working = []; for (let d = 1; d <= 31; d++) if (!sundays.has(d) && d !== 15) working.push(d);
const p2 = n => String(n).padStart(2, '0');
working.slice(0, 20).forEach((d, i) => {          // HEMANTH: 20 days, alternating ISO and DD/MM/YYYY formats
  rows.push([i % 2 ? `${p2(d)}/08/2026 09:10:00` : `2026-08-${p2(d)}T09:10:00`, '04-a1-b2', 'Hemanth']);
  rows.push([i % 2 ? `${p2(d)}/08/2026 16:30:00` : `2026-08-${p2(d)}T16:30:00`, '04A1B2', 'Hemanth']);   // check-out
});
rows.push(['2026-08-03T03:45:00Z', 'BB22', 'Bharunesh']);   // 09:15 IST on Aug 3
rows.push(['', '', '']);                                     // blank row
rows.push(['2026-08-04T09:00:00', 'ZZ99', 'Stranger']);      // unknown card
const csv = rows.map(r => r.join(',')).join('\n');

global.fetch = async url => {
  assert.match(String(url), /gviz\/tq\?tqx=out:csv/);
  return { ok: true, status: 200, text: async () => csv };
};

const attendance = require('../attendance-service');

test('computes statuses, times, percentages and unmatched taps', async () => {
  const teacher = { username: 'SABITHA', role: 'teacher' };
  const out = await attendance.getAttendance({ month: '2026-08', requester: teacher });
  const by = Object.fromEntries(out.profiles.map(p => [p.profileId, p]));

  const h = by.HEMANTH;
  assert.equal(h.summary.present, 20);
  assert.equal(h.summary.absent, 5);
  assert.equal(h.summary.percentage, 80);
  const first = h.days.find(d => d.date === `2026-08-${p2(working[0])}`);
  assert.deepEqual([first.status, first.checkIn, first.checkOut], ['Present', '09:10', '16:30']);

  assert.equal(h.days.find(d => d.date === '2026-08-02').status, 'Sunday');
  assert.equal(h.days.find(d => d.date === '2026-08-15').status, 'Holiday');

  const b = by.BHARUNESH.days.find(d => d.date === '2026-08-03');
  assert.deepEqual([b.status, b.checkIn], ['Present', '09:15']);       // UTC converted to IST
  assert.equal(by.BRANESH.summary.present, 0);
  assert.equal(by.BRANESH.summary.absent, 25);

  assert.equal(out.unmatched.length, 1);
  assert.equal(out.unmatched[0].uid, 'ZZ99');
  assert.equal(out.meta.columns.headerDetected, true);
});

test('a student only receives their own record and no unmatched list', async () => {
  const out = await attendance.getAttendance({ month: '2026-08', requester: { username: 'BRANESH', role: 'student' } });
  assert.deepEqual(out.profiles.map(p => p.profileId), ['BRANESH']);
  assert.equal(out.unmatched, undefined);
});

test('future dates are never marked absent', () => {
  const ctx = { today: '2026-10-02', nowMin: 700, cutoffMin: 600, holidays: new Set(), startDate: '' };
  assert.equal(attendance.statusFor('2026-10-05', null, ctx), 'Future');
  assert.equal(attendance.statusFor('2026-09-27', null, ctx), 'Sunday');
  assert.equal(attendance.statusFor('2026-10-02', null, { ...ctx, nowMin: 540 }), 'Pending');
  assert.equal(attendance.statusFor('2026-10-02', null, ctx), 'Absent');
});

// Real sheet layout: separate date/time columns, "rifd" header (typo), CAMERA rows matched by name.
// The student view must show exactly the same day status and totals the teacher sees for that student.
test('student and teacher views agree on the real sheet layout', async () => {
  const sheet = [['date', 'time', 'name ', 'rifd', '', 'attendance'],
    ['03/08/2026', '11:38:02', 'HEMANTH', '04A1B2', '1', 'Present'],
    ['03/08/2026', '11:38:40', 'BHARUNESH', 'CAMERA', '0.81', 'Present'],
    ['03/08/2026', '16:05:10', 'HEMANTH', '04:A1:B2', '1', 'Present'],
    ['04/08/2026', '9:01:00', 'BRANESH', 'CC33', '1', 'Absent']];
  global.fetch = async () => ({ ok: true, status: 200, text: async () => sheet.map(r => r.map(x => `"${x}"`).join(',')).join('\n') });
  delete require.cache[require.resolve('../attendance-service')];
  const svc = require('../attendance-service');
  const teacher = await svc.getAttendance({ month: '2026-08', requester: { username: 'SABITHA', role: 'teacher' }, force: true });
  assert.equal(teacher.meta.columns.rfid, 'rifd');
  for (const t of teacher.profiles) {
    const mine = await svc.getAttendance({ month: '2026-08', requester: { username: t.profileId, role: 'student' } });
    assert.equal(mine.profiles.length, 1);
    assert.deepStrictEqual(mine.profiles[0].days, t.days, `${t.profileId} days differ`);
    assert.deepStrictEqual(mine.profiles[0].summary, t.summary, `${t.profileId} summary differs`);
  }
  const by = Object.fromEntries(teacher.profiles.map(p => [p.profileId, p]));
  const day = (id, d) => by[id].days.find(x => x.date === d);
  assert.equal(day('HEMANTH', '2026-08-03').checkIn, '11:38');
  assert.equal(day('HEMANTH', '2026-08-03').checkOut, '16:05');
  assert.equal(day('BHARUNESH', '2026-08-03').status, 'Present');      // camera row, matched by name
  assert.notEqual(day('BRANESH', '2026-08-04').status, 'Present');     // row marked Absent is ignored
});
