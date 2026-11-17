// 기록 화면용 순수 로직: 잔디, 주간 리포트, 컨디션, 미루기, 루틴 (tests/extras.test.mjs)
import { addDays, weekStart, weekDays, occursOn, isDone, itemsOn, DOW } from './store.js';

const live = (records, kind) => Object.values(records).filter((r) => r.kind === kind && !r.deleted);

// 날짜별 완료한 할 일 수
export function completionsByDay(records, today) {
  const m = {};
  for (const it of live(records, 'item')) {
    if (it.type !== 'task') continue;
    const days = it.repeat && it.repeat !== 'none' ? (it.doneDates || []) : (it.done ? [it.date] : []);
    for (const d of days) if (d <= today) m[d] = (m[d] || 0) + 1;
  }
  return m;
}

// 최근 weeks주 잔디: [[{date, n, lv}] x7] (월~일), 미래 날짜는 lv -1
export function heatmap(records, today, weeks = 20) {
  const counts = completionsByDay(records, today);
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const out = [];
  for (let w = 0; w < weeks; w++) {
    out.push(Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, w * 7 + i), n = counts[date] || 0;
      return { date, n, lv: date > today ? -1 : n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4 };
    }));
  }
  return out;
}

export const focusMinutes = (records, from, to) => live(records, 'focus').filter((f) => f.date >= from && f.date <= to).reduce((a, f) => a + (f.minutes || 0), 0);

export function moodOf(records, date) { const r = records['mood:' + date]; return r && !r.deleted ? r : null; }

export function moodSeries(records, today, days = 14) {
  return Array.from({ length: days }, (_, i) => { const date = addDays(today, i - days + 1), m = moodOf(records, date); return { date, mood: m?.mood ?? null, energy: m?.energy ?? null }; });
}

// 주간 리포트 (date가 속한 주, today 이후는 제외)
export function weekReport(records, date, today) {
  const days = weekDays(date), items = live(records, 'item').filter((i) => i.type === 'task');
  let total = 0, done = 0, best = null;
  const perDay = days.map((d, i) => {
    const occ = d <= today ? items.filter((t) => occursOn(t, d)) : [];
    const k = occ.filter((t) => isDone(t, d)).length;
    total += occ.length; done += k;
    const row = { date: d, dow: DOW[i], total: occ.length, done: k, rate: occ.length ? k / occ.length : null, future: d > today };
    if (k && (!best || row.rate > best.rate || (row.rate === best.rate && k > best.done))) best = row;
    return row;
  });
  const moods = days.map((d) => moodOf(records, d)).filter(Boolean);
  const avg = (k) => (moods.length ? Math.round((moods.reduce((a, m) => a + (m[k] || 0), 0) / moods.length) * 10) / 10 : null);
  const procrastinated = items.filter((t) => (t.postponed || 0) >= 2 && !t.done).sort((a, b) => b.postponed - a.postponed).slice(0, 3);
  return {
    from: days[0], to: days[6], perDay, total, done, rate: total ? done / total : null, best,
    focus: focusMinutes(records, days[0], days[6]), mood: avg('mood'), energy: avg('energy'), moodDays: moods.length,
    procrastinated,
  };
}

export function reportText(rep, extra = {}) {
  const pct = rep.rate == null ? '-' : Math.round(rep.rate * 100) + '%';
  const lines = [
    `📅 주간 리포트 ${rep.from.slice(5).replace('-', '.')} ~ ${rep.to.slice(5).replace('-', '.')}`,
    `✅ 실행률 ${pct} (${rep.done}/${rep.total})`,
    `🔥 연속 ${extra.streak ?? 0}일 · ⏱ 집중 ${Math.floor(rep.focus / 60)}시간 ${rep.focus % 60}분`,
  ];
  if (rep.mood != null) lines.push(`🙂 컨디션 평균 기분 ${rep.mood} · 에너지 ${rep.energy} (5점)`);
  if (rep.best) lines.push(`🏆 가장 잘한 날 ${rep.best.dow}요일 (${rep.best.done}/${rep.best.total})`);
  if (extra.newAch?.length) lines.push(`🏅 이번 주 업적 ${extra.newAch.join(', ')}`);
  if (rep.procrastinated.length) lines.push(`↷ 자주 미룬 일 ${rep.procrastinated.map((t) => `${t.title}(${t.postponed})`).join(', ')}`);
  return lines.join('\n');
}

// 3번 이상 미루고 아직 안 한 일 (해당 날짜 이전/당일)
export const postponeHints = (records, date) => live(records, 'item').filter((t) => t.type === 'task' && (t.repeat || 'none') === 'none' && !t.done && (t.postponed || 0) >= 3 && t.date <= date);

// 루틴 단계 텍스트 ↔ 배열. "07:00 기상" / "물 한 잔"
export function parseSteps(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(\d{1,2}):(\d{2})\s+(.+)$/);
    return m ? { time: `${String(+m[1]).padStart(2, '0')}:${m[2]}`, title: m[3].trim() } : { time: '', title: l };
  });
}
export const stepsText = (steps) => steps.map((s) => (s.time ? s.time + ' ' : '') + s.title).join('\n');

export const PRESET_ROUTINES = [
  { name: '아침 루틴', steps: parseSteps('07:00 기상\n물 한 잔\n이불 정리\n씻기\n아침 먹기') },
  { name: '밤 루틴', steps: parseSteps('22:30 폰 내려놓기\n내일 할 일 3개 적기\n씻기\n23:30 잠자리') },
  { name: '집 정리', steps: parseSteps('설거지\n빨래\n바닥 청소 10분\n쓰레기 버리기') },
];

// 같은 날 같은 루틴을 두 번 넣지 않도록 기존 항목 확인
export function routineItems(routine, date, existing, uid) {
  const have = new Set(itemsOn(existing, date).map((i) => i.title));
  return routine.steps.filter((s) => !have.has(s.title)).map((s, i) => ({
    id: uid(), kind: 'item', type: 'task', title: s.title, date, time: s.time || '', end: '', repeat: 'none', color: '#d99a2b',
    note: '', done: false, doneDates: [], order: i, remind: s.time ? 0 : -1, routine: routine.id || routine.name,
  }));
}
