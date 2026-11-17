// 업적(미션)·보상 정의와 통계 계산 — 순수 로직 (tests/achievements.test.mjs)
import { addDays, occursOn, isDone, parse } from './store.js';

// ---- 보상 ----
export const ICONS = {
  base:     { name: '기본 달력', emoji: '✔', bg: ['#2f6f5e', '#3d8b75'] },
  sprout:   { name: '새싹', emoji: '🌱', bg: ['#4f9a5a', '#86c46a'] },
  sun:      { name: '햇살', emoji: '☀️', bg: ['#f2a93b', '#f7d270'] },
  sunrise:  { name: '해돋이', emoji: '🌅', bg: ['#f08a5d', '#f9c46b'] },
  flame:    { name: '불꽃', emoji: '🔥', bg: ['#d4473b', '#f59e3a'] },
  compass:  { name: '나침반', emoji: '🧭', bg: ['#2d5d9f', '#4f8fd6'] },
  hourglass:{ name: '모래시계', emoji: '⏳', bg: ['#8a6a3d', '#c9a46a'] },
  feather:  { name: '깃펜', emoji: '🪶', bg: ['#5b6b8c', '#94a3c4'] },
  moon:     { name: '달', emoji: '🌙', bg: ['#262f5a', '#4a5699'] },
  target:   { name: '과녁', emoji: '🎯', bg: ['#b8323f', '#e0606c'] },
  diamond:  { name: '다이아몬드', emoji: '💎', bg: ['#2b7a8c', '#6fd0dd'] },
  bolt:     { name: '번개', emoji: '⚡', bg: ['#3a3f9e', '#7b6ff0'] },
  leaf:     { name: '네잎클로버', emoji: '🍀', bg: ['#2f8a63', '#8fd18a'] },
  crown:    { name: '왕관', emoji: '👑', bg: ['#7a4fc2', '#e1b13c'] },
};
// light/dark 각각의 강조색
export const THEMES = {
  base:     { name: '숲 (기본)', light: '#2f6f5e', dark: '#5fb39a' },
  ocean:    { name: '바다', light: '#2b62c4', dark: '#6fa0ef' },
  sunset:   { name: '노을', light: '#d0612b', dark: '#f0965e' },
  lavender: { name: '라벤더', light: '#7650c0', dark: '#ab8cec' },
  rose:     { name: '장미', light: '#c23b62', dark: '#ec7d9b' },
  midnight: { name: '한밤', light: '#26335f', dark: '#8ea2e6' },
  mint:     { name: '민트', light: '#1f8a7a', dark: '#5fd1c0' },
  gold:     { name: '황금', light: '#a87412', dark: '#e3b44a' },
};

// ---- 업적 정의: stat 값이 target 이상이면 달성 ----
const A = (id, group, name, stat, target, reward = {}) => ({ id, group, name, stat, target, reward });
export const ACHIEVEMENTS = [
  A('done1', '완료', '첫 체크', 'done', 1, { title: '다시 시작한 사람' }),
  A('done10', '완료', '열 번의 체크', 'done', 10, { icon: 'sprout' }),
  A('done50', '완료', '오십 번의 체크', 'done', 50, { title: '꾸준한 실행가', theme: 'ocean' }),
  A('done100', '완료', '백 번의 체크', 'done', 100, { icon: 'flame' }),
  A('done300', '완료', '삼백 번의 체크', 'done', 300, { title: '실행의 달인', theme: 'sunset' }),
  A('done1000', '완료', '천 번의 체크', 'done', 1000, { title: '전설의 실천가', icon: 'crown', theme: 'gold' }),
  A('task10', '계획', '할 일 10개 등록', 'tasks', 10, { title: '계획 초보' }),
  A('task50', '계획', '할 일 50개 등록', 'tasks', 50, { title: '계획가', icon: 'compass' }),
  A('task200', '계획', '할 일 200개 등록', 'tasks', 200, { title: '전략가' }),
  A('event10', '일정', '일정 10개 등록', 'events', 10, { title: '약속을 지키는 사람' }),
  A('hours10', '일정', '일정 총 10시간', 'hours', 10, { icon: 'hourglass' }),
  A('hours50', '일정', '일정 총 50시간', 'hours', 50, { title: '시간 설계자', theme: 'midnight' }),
  A('hours200', '일정', '일정 총 200시간', 'hours', 200, { title: '시간의 지배자' }),
  A('streak3', '연속', '3일 연속 실행', 'bestStreak', 3, { title: '다시 일어선 사람', icon: 'sun' }),
  A('streak7', '연속', '7일 연속 실행', 'bestStreak', 7, { title: '일주일 생존자', theme: 'lavender' }),
  A('streak14', '연속', '14일 연속 실행', 'bestStreak', 14, { title: '습관 장착' }),
  A('streak30', '연속', '30일 연속 실행', 'bestStreak', 30, { title: '루틴 장인', icon: 'moon' }),
  A('streak100', '연속', '100일 연속 실행', 'bestStreak', 100, { title: '인생 재건축가', icon: 'diamond' }),
  A('perfect1', '완벽한 날', '할 일을 모두 끝낸 날', 'perfect', 1, { title: '완벽한 하루' }),
  A('perfect7', '완벽한 날', '완벽한 날 7일', 'perfect', 7, { title: '완벽주의자', theme: 'rose' }),
  A('perfect30', '완벽한 날', '완벽한 날 30일', 'perfect', 30, { icon: 'target', title: '빈틈없는 사람' }),
  A('early10', '생활', '오전 9시 전 할 일 10번 완료', 'early', 10, { title: '아침형 인간', icon: 'sunrise' }),
  A('memo7', '생활', '메모 7번 쓰기', 'memos', 7, { title: '기록하는 사람' }),
  A('memo30', '생활', '메모 30번 쓰기', 'memos', 30, { icon: 'feather' }),
  A('focus1', '집중', '집중 1시간', 'focusHours', 1, { title: '몰입 입문' }),
  A('focus10', '집중', '집중 10시간', 'focusHours', 10, { title: '몰입의 달인', icon: 'bolt' }),
  A('focus50', '집중', '집중 50시간', 'focusHours', 50, { title: '딥워커' }),
  A('mood7', '생활', '컨디션 7번 기록', 'moods', 7, { title: '나를 돌보는 사람' }),
  A('mood30', '생활', '컨디션 30번 기록', 'moods', 30, { theme: 'mint', icon: 'leaf' }),
  A('goal5', '목표', '목표 5개 달성', 'goals', 5, { title: '목표 사냥꾼' }),
  A('goal30', '목표', '목표 30개 달성', 'goals', 30, { title: '꿈을 이루는 사람' }),
];

export const minutesOf = (it) => {
  if (!it.time) return 0;
  if (!it.end) return 60; // 끝 시간 없으면 1시간으로 계산
  const [a, b] = [it.time, it.end].map((t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; });
  return b > a ? b - a : b + 1440 - a;
};

// 통계: 오늘(today)까지의 기록 기준
export function computeStats(records, today) {
  const all = Object.values(records).filter((r) => !r.deleted);
  const items = all.filter((r) => r.kind === 'item');
  const s = { focusHours: 0, moods: 0, done: 0, tasks: 0, events: 0, hours: 0, perfect: 0, early: 0, memos: 0, goals: 0, streak: 0, bestStreak: 0 };
  const doneDays = new Set();
  let first = today;
  for (const it of items) {
    if (it.type === 'task') s.tasks++; else s.events++;
    if (it.date < first) first = it.date;
    const rep = it.repeat && it.repeat !== 'none';
    const days = rep ? (it.doneDates || []) : (it.done ? [it.date] : []);
    if (it.type === 'task') {
      for (const d of days) { if (d > today) continue; s.done++; doneDays.add(d); if (it.time && it.time < '09:00') s.early++; }
    }
    if (it.type === 'event' && it.time) {
      if (!rep) { if (it.date <= today) s.hours += minutesOf(it); }
      else {
        let n = 0, d = it.date;
        const stop = it.until && it.until < today ? it.until : today;
        for (let i = 0; i < 400 && d <= stop; i++, d = addDays(d, 1)) if (occursOn(it, d)) n++;
        s.hours += n * minutesOf(it);
      }
    }
  }
  s.hours = Math.floor(s.hours / 60);
  s.memos = all.filter((r) => r.kind === 'note' && (r.text || '').trim()).length;
  s.goals = all.filter((r) => r.kind === 'goal' && r.done).length;
  s.focusMin = all.filter((r) => r.kind === 'focus' && r.date <= today).reduce((a, f) => a + (f.minutes || 0), 0);
  s.focusHours = Math.floor(s.focusMin / 60);
  s.moods = all.filter((r) => r.kind === 'mood').length;

  // 완벽한 날 / 연속 (최대 400일 전까지)
  const tasks = items.filter((i) => i.type === 'task');
  let run = 0;
  const start = addDays(today, -400) > first ? addDays(today, -400) : first;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (doneDays.has(d)) { run++; s.bestStreak = Math.max(s.bestStreak, run); } else if (d !== today) run = 0;
    const occ = tasks.filter((t) => occursOn(t, d));
    if (occ.length && occ.every((t) => isDone(t, d))) s.perfect++;
  }
  s.streak = run; // 오늘 아직 안 했어도 어제까지 이어졌으면 유지
  return s;
}

export function progress(stats) {
  return ACHIEVEMENTS.map((a) => ({ ...a, value: Math.min(stats[a.stat] || 0, a.target), done: (stats[a.stat] || 0) >= a.target }));
}

// 경험치/레벨 (보는 재미용)
export function level(stats) {
  const xp = stats.done * 10 + stats.tasks * 2 + stats.events * 2 + stats.perfect * 30 + stats.goals * 20 + stats.memos * 5 + stats.bestStreak * 15 + Math.floor((stats.focusMin || 0) / 5) + (stats.moods || 0) * 5;
  const lv = Math.floor(Math.sqrt(xp / 60)) + 1;
  const cur = 60 * (lv - 1) ** 2, next = 60 * lv ** 2;
  return { xp, lv, pct: (xp - cur) / (next - cur) };
}

// 획득한 보상 목록 (unlocked: {id: ts})
export function rewardsOf(unlocked) {
  const out = { titles: ['새내기 플래너'], icons: ['base'], themes: ['base'] };
  for (const a of ACHIEVEMENTS) if (unlocked[a.id]) {
    if (a.reward.title) out.titles.push(a.reward.title);
    if (a.reward.icon) out.icons.push(a.reward.icon);
    if (a.reward.theme) out.themes.push(a.reward.theme);
  }
  return out;
}

export function iconSVG(key, size = 64) {
  const ic = ICONS[key] || ICONS.base;
  const glyph = key === 'base'
    ? '<path d="M18 33l9 9 19-20" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
    : `<text x="32" y="43" font-size="30" text-anchor="middle">${ic.emoji}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><defs><linearGradient id="g${key}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ic.bg[0]}"/><stop offset="1" stop-color="${ic.bg[1]}"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#g${key})"/>${glyph}</svg>`;
}
