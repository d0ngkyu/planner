import assert from 'node:assert/strict';
import * as X from '../extras.js';

let n = 0; const t = (name, fn) => { fn(); n++; };
const T = (id, o) => [id, { id, kind: 'item', type: 'task', title: id, repeat: 'none', updatedAt: 1, ...o }];

t('heatmap', () => {
  const r = Object.fromEntries([T('a', { date: '2026-11-17', done: true }), T('b', { date: '2026-11-17', done: true }), T('c', { date: '2026-11-16', done: true }), T('d', { date: '2026-11-19', done: true })]);
  const h = X.heatmap(r, '2026-11-17', 4);
  assert.equal(h.length, 4); assert.equal(h[3][0].date, '2026-11-16');
  assert.equal(h[3][1].n, 2); assert.equal(h[3][1].lv, 2); assert.equal(h[3][0].lv, 1);
  assert.equal(h[3][3].lv, -1, '미래');
});
t('weekReport', () => {
  const r = Object.fromEntries([
    T('a', { date: '2026-11-16', done: true }), T('b', { date: '2026-11-16' }),
    T('c', { date: '2026-11-17', done: true }), T('z', { date: '2026-11-20' }),
    T('p', { date: '2026-11-17', postponed: 3 }),
    ['f', { id: 'f', kind: 'focus', date: '2026-11-17', minutes: 25, updatedAt: 1 }],
    ['m', { id: 'mood:2026-11-16', kind: 'mood', date: '2026-11-16', mood: 4, energy: 2, updatedAt: 1 }],
    ['m2', { id: 'mood:2026-11-17', kind: 'mood', date: '2026-11-17', mood: 3, energy: 3, updatedAt: 1 }],
  ]);
  r['mood:2026-11-16'] = r.m; r['mood:2026-11-17'] = r.m2;
  const w = X.weekReport(r, '2026-11-18', '2026-11-17');
  assert.equal(w.total, 4); assert.equal(w.done, 2); assert.equal(w.rate, .5);
  assert.equal(w.focus, 25); assert.equal(w.mood, 3.5); assert.equal(w.energy, 2.5);
  assert.equal(w.procrastinated[0].id, 'p'); assert.ok(w.perDay[4].future);
  assert.match(X.reportText(w, { streak: 2 }), /실행률 50%/);
});
t('moodSeries', () => { const s = X.moodSeries({}, '2026-11-17', 3); assert.deepEqual(s.map((x) => x.date), ['2026-11-15', '2026-11-16', '2026-11-17']); });
t('postponeHints', () => {
  const r = Object.fromEntries([T('a', { date: '2026-11-17', postponed: 3 }), T('b', { date: '2026-11-17', postponed: 2 }), T('c', { date: '2026-11-17', postponed: 5, done: true })]);
  assert.deepEqual(X.postponeHints(r, '2026-11-17').map((x) => x.id), ['a']);
});
t('steps parse', () => {
  const s = X.parseSteps('7:05 기상\n\n 물 한 잔 ');
  assert.deepEqual(s, [{ time: '07:05', title: '기상' }, { time: '', title: '물 한 잔' }]);
  assert.equal(X.stepsText(s), '07:05 기상\n물 한 잔');
});
t('routineItems no duplicates', () => {
  let k = 0; const uid = () => 'n' + k++;
  const ex = Object.fromEntries([T('w', { title: '기상', date: '2026-11-17' })]);
  const items = X.routineItems({ id: 'r1', steps: X.parseSteps('07:00 기상\n물 한 잔') }, '2026-11-17', ex, uid);
  assert.equal(items.length, 1); assert.equal(items[0].title, '물 한 잔'); assert.equal(items[0].routine, 'r1');
});

console.log(`extras tests passed: ${n}`);
