import assert from 'node:assert/strict';
import * as N from '../notify.js';

let n = 0; const t = (name, fn) => { fn(); n++; };
const at = (s) => { const [d, h] = s.split(' '); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = h.split(':').map(Number); return new Date(y, m - 1, dd, hh, mm); };
const item = (o) => ({ id: 'a', kind: 'item', type: 'event', title: '회의', date: '2026-11-17', time: '14:00', remind: 0, repeat: 'none', updatedAt: 1, ...o });

t('zonedNow KST', () => { const z = N.zonedNow(new Date('2026-11-17T05:30:00Z')); assert.equal(N.hm(z), '14:30'); assert.equal(z.getDate(), 17); });
t('slots', () => { const s = N.reminderSlots(at('2026-11-17 13:50')); assert.deepEqual(s.find((x) => x.remind === 10), { remind: 10, time: '14:00', date: '2026-11-17' }); });
t('slot crosses midnight', () => { const s = N.reminderSlots(at('2026-11-17 23:40')); assert.deepEqual(s.find((x) => x.remind === 30), { remind: 30, time: '00:10', date: '2026-11-18' }); });
t('shouldRemind', () => {
  const slot = { remind: 0, time: '14:00', date: '2026-11-17' };
  assert.ok(N.shouldRemind(item(), slot));
  assert.ok(!N.shouldRemind(item({ remind: 10 }), slot));
  assert.ok(!N.shouldRemind(item({ type: 'task', done: true }), slot));
  assert.ok(!N.shouldRemind(item({ deleted: true }), slot));
  assert.ok(!N.shouldRemind(item({ date: '2026-11-18' }), slot));
  assert.ok(N.shouldRemind(item({ date: '2026-11-10', repeat: 'weekly' }), slot));
  assert.ok(!N.shouldRemind(item({ date: '2026-11-10', repeat: 'weekly', doneDates: ['2026-11-17'] }), slot));
  assert.ok(N.shouldRemind(item({ remind: '0' }), slot), 'string remind tolerated');
});
t('reminderMessage', () => { const m = N.reminderMessage(item({ type: 'task' }), { remind: 60, date: '2026-11-17' }); assert.match(m.body, /1시간 후/); assert.match(m.url, /item=a/); });
t('checkinKind', () => {
  const s = { morning: '08:00', evening: '21:00', nag: true };
  assert.deepEqual(N.checkinKind(s, at('2026-11-17 08:00')), { kind: 'morning', step: 0 });
  assert.deepEqual(N.checkinKind(s, at('2026-11-17 21:30')), { kind: 'evening', step: 30 });
  assert.equal(N.checkinKind({ ...s, nag: false }, at('2026-11-17 21:30')), null);
  assert.equal(N.checkinKind(s, at('2026-11-17 12:00')), null);
  assert.deepEqual(N.checkinKind({ evening: '23:40', nag: true }, at('2026-11-18 00:10')), { kind: 'evening', step: 30 });
});
t('checkinMessage', () => {
  const now = at('2026-11-17 21:00');
  const r = { a: item({ id: 'a', type: 'task', title: '장보기', time: '' }), b: item({ id: 'b', type: 'task', title: '운동', time: '', done: true }) };
  assert.match(N.checkinMessage(r, 'evening', 0, now).title, /남은 할 일 1개/);
  assert.match(N.checkinMessage(r, 'evening', 30, now).title, /다시/);
  const allDone = { b: r.b };
  assert.match(N.checkinMessage(allDone, 'evening', 0, now).title, /모두 완료/);
  assert.equal(N.checkinMessage(allDone, 'evening', 30, now), null, 'no nag when done');
  assert.match(N.checkinMessage({}, 'morning', 0, at('2026-11-17 08:00')).body, /3개/);
  assert.match(N.checkinMessage(r, 'morning', 0, at('2026-11-17 08:00')).title, /오늘 할 일 2개/);
});

console.log(`notify tests passed: ${n}`);
