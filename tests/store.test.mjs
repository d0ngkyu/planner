import assert from 'node:assert/strict';
import * as S from '../store.js';

let n = 0; const t = (name, fn) => { fn(); n++; };

t('weekStart monday', () => { assert.equal(S.weekStart('2026-11-17'), '2026-11-16'); assert.equal(S.weekStart('2026-11-22'), '2026-11-16'); assert.equal(S.weekStart('2026-11-23'), '2026-11-23'); });
t('monthGrid', () => { const g = S.monthGrid('2026-11-17'); assert.equal(g.length, 42); assert.equal(g[0], '2026-10-26'); assert.ok(g.includes('2026-11-30')); });
t('addMonths clamps', () => { assert.equal(S.addMonths('2026-01-31', 1), '2026-02-28'); assert.equal(S.addMonths('2026-12-15', 1), '2027-01-15'); });
t('weekOfMonth', () => { assert.deepEqual(S.weekOfMonth('2026-11-17'), { month: 11, n: 3 }); assert.deepEqual(S.weekOfMonth('2026-12-31'), { month: 12, n: 5 }); });
t('dow', () => assert.equal(S.dowOf('2026-11-17'), '화'));

const base = { kind: 'item', type: 'task', updatedAt: 1 };
t('repeat', () => {
  assert.ok(S.occursOn({ ...base, date: '2026-11-17', repeat: 'weekly' }, '2026-11-24'));
  assert.ok(!S.occursOn({ ...base, date: '2026-11-17', repeat: 'weekly' }, '2026-11-10'));
  assert.ok(S.occursOn({ ...base, date: '2026-01-31', repeat: 'monthly' }, '2026-02-28'));
  assert.ok(!S.occursOn({ ...base, date: '2026-11-17', repeat: 'weekdays' }, '2026-11-21'));
  assert.ok(S.occursOn({ ...base, date: '2026-03-01', repeat: 'yearly' }, '2027-03-01'));
  assert.ok(!S.occursOn({ ...base, date: '2026-11-17', repeat: 'daily', until: '2026-11-18' }, '2026-11-19'));
  assert.ok(!S.occursOn({ ...base, date: '2026-11-17', repeat: 'daily', deleted: true }, '2026-11-18'));
});
t('toggle repeat per date', () => {
  const it = S.toggleDone({ ...base, date: '2026-11-17', repeat: 'daily' }, '2026-11-18', 5);
  assert.ok(S.isDone(it, '2026-11-18')); assert.ok(!S.isDone(it, '2026-11-17'));
  assert.ok(!S.isDone(S.toggleDone(it, '2026-11-18'), '2026-11-18'));
});
t('itemsOn sorted by time', () => {
  const r = { a: { ...base, id: 'a', date: '2026-11-17', time: '15:00' }, b: { ...base, id: 'b', date: '2026-11-17', time: '09:00' }, c: { ...base, id: 'c', date: '2026-11-17' } };
  assert.deepEqual(S.itemsOn(r, '2026-11-17').map((x) => x.id), ['b', 'a', 'c']);
});
t('overdue', () => {
  const r = { a: { ...base, id: 'a', date: '2026-11-10' }, b: { ...base, id: 'b', date: '2026-11-10', done: true }, c: { ...base, id: 'c', date: '2026-11-10', type: 'event' } };
  assert.deepEqual(S.overdue(r, '2026-11-17').map((x) => x.id), ['a']);
});
t('merge LWW + tombstone', () => {
  const L = { x: { id: 'x', kind: 'item', updatedAt: 5, title: 'L' }, y: { id: 'y', kind: 'item', updatedAt: 3 } };
  const R = { x: { id: 'x', kind: 'item', updatedAt: 4, title: 'R' }, y: { id: 'y', kind: 'item', updatedAt: 3, deleted: true }, z: { id: 'z', kind: 'note', updatedAt: 1 } };
  const m = S.merge(L, R);
  assert.equal(m.x.title, 'L'); assert.ok(m.y.deleted); assert.ok(m.z);
  assert.deepEqual(S.merge(R, L).x.title, 'L');
});
t('compact', () => { const r = S.compact({ a: { deleted: true, updatedAt: 0 }, b: { deleted: true, updatedAt: 100 * 864e5 } }, 100 * 864e5); assert.deepEqual(Object.keys(r), ['b']); });
t('validateImport', () => { assert.throws(() => S.validateImport({})); assert.throws(() => S.validateImport({ records: { a: { id: 'a' } } })); assert.ok(S.validateImport({ records: { a: { id: 'a', kind: 'goal', updatedAt: 1 } } })); });
t('search', () => { const r = { a: { id: 'a', kind: 'item', title: '치과 예약', date: '2026-11-20', updatedAt: 1 }, b: { id: 'note:d:2026-11-17', kind: 'note', text: '치과', updatedAt: 1 } }; assert.equal(S.search(r, '치과').length, 2); });

console.log(`store tests passed: ${n}`);
