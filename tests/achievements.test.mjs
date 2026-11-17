import assert from 'node:assert/strict';
import * as A from '../achievements.js';

let n = 0; const t = (name, fn) => { fn(); n++; };
const T = (id, o) => [id, { id, kind: 'item', type: 'task', title: id, repeat: 'none', updatedAt: 1, ...o }];

t('stats basic', () => {
  const r = Object.fromEntries([
    T('a', { date: '2026-11-15', done: true }),
    T('b', { date: '2026-11-16', done: true, time: '07:30' }),
    T('c', { date: '2026-11-17', done: false }),
    T('d', { date: '2026-11-17', done: true }),
    T('e', { date: '2026-11-17', type: 'event', time: '10:00', end: '12:30' }),
    T('f', { date: '2026-11-18', type: 'event', time: '10:00' }), // 미래 일정은 시간 미포함
    T('x', { date: '2026-11-17', done: true, deleted: true }),
    ['n', { id: 'note:d:2026-11-17', kind: 'note', text: '메모', updatedAt: 1 }],
    ['g', { id: 'g', kind: 'goal', scope: 'w:2026-11-16', text: 'g', done: true, updatedAt: 1 }],
  ]);
  const s = A.computeStats(r, '2026-11-17');
  assert.equal(s.done, 3); assert.equal(s.tasks, 4); assert.equal(s.events, 2);
  assert.equal(s.hours, 2); assert.equal(s.early, 1); assert.equal(s.memos, 1); assert.equal(s.goals, 1);
  assert.equal(s.bestStreak, 3); assert.equal(s.streak, 3);
  assert.equal(s.perfect, 2, '15·16 완벽, 17은 c 미완');
});
t('streak keeps if today not yet done, breaks on gap', () => {
  const r = Object.fromEntries([T('a', { date: '2026-11-15', done: true }), T('b', { date: '2026-11-16', done: true }), T('c', { date: '2026-11-17' })]);
  assert.equal(A.computeStats(r, '2026-11-17').streak, 2);
  assert.equal(A.computeStats(r, '2026-11-18').streak, 0);
});
t('repeat completions + hours', () => {
  const r = Object.fromEntries([T('a', { date: '2026-11-10', repeat: 'daily', doneDates: ['2026-11-10', '2026-11-11', '2026-11-20'] }), T('e', { date: '2026-11-10', type: 'event', repeat: 'daily', time: '09:00', end: '10:00' })]);
  const s = A.computeStats(r, '2026-11-17');
  assert.equal(s.done, 2, '미래 체크 제외'); assert.equal(s.hours, 8);
});
t('minutes overnight', () => assert.equal(A.minutesOf({ time: '23:00', end: '01:00' }), 120));
t('progress & rewards', () => {
  const p = A.progress({ done: 12, tasks: 0, events: 0, hours: 0, bestStreak: 0, perfect: 0, early: 0, memos: 0, goals: 0 });
  assert.ok(p.find((x) => x.id === 'done10').done); assert.equal(p.find((x) => x.id === 'done50').value, 12);
  const rw = A.rewardsOf({ done1: 1, done50: 1 });
  assert.ok(rw.titles.includes('꾸준한 실행가')); assert.ok(rw.themes.includes('ocean'));
});
t('reward keys valid', () => {
  for (const a of A.ACHIEVEMENTS) { if (a.reward.icon) assert.ok(A.ICONS[a.reward.icon], a.id); if (a.reward.theme) assert.ok(A.THEMES[a.reward.theme], a.id); }
  assert.equal(new Set(A.ACHIEVEMENTS.map((a) => a.id)).size, A.ACHIEVEMENTS.length);
});
t('level', () => { assert.equal(A.level({ done: 0, tasks: 0, events: 0, perfect: 0, goals: 0, memos: 0, bestStreak: 0 }).lv, 1); assert.ok(A.level({ done: 100, tasks: 0, events: 0, perfect: 0, goals: 0, memos: 0, bestStreak: 0 }).lv > 3); });

console.log(`achievements tests passed: ${n}`);
