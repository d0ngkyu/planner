// 순수 데이터/날짜 로직 (DOM 없음) — tests/store.test.mjs 에서 Node로 검사한다.
// 레코드 모델: { id, kind: 'item'|'note'|'goal', updatedAt, deleted?, ...필드 }
//  item: { title, type:'task'|'event', date:'YYYY-MM-DD', time?, color, note, repeat:'none'|'daily'|'weekly'|'monthly', done, doneDates:[] }
//  note: id = 'note:d:2026-11-17' | 'note:w:2026-11-16' | 'note:m:2026-11', text
//  goal: { scope:'w:2026-11-16'|'m:2026-11', text, done, order }

export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const addMonths = (s, n) => { const d = parse(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return ymd(d); };
export const today = () => ymd(new Date());
// 주 시작: 월요일
export const weekStart = (s) => { const d = parse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return ymd(d); };
export const weekDays = (s) => { const st = weekStart(s); return Array.from({ length: 7 }, (_, i) => addDays(st, i)); };
export const monthKey = (s) => s.slice(0, 7);
export const monthGrid = (s) => {
  const first = monthKey(s) + '-01';
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};
export const weekKey = (s) => 'w:' + weekStart(s);
export const DOW = ['월', '화', '수', '목', '금', '토', '일'];
export const dowOf = (s) => DOW[(parse(s).getDay() + 6) % 7];
export const weekOfMonth = (s) => {
  // 주의 목요일이 속한 달 기준 몇째 주
  const thu = addDays(weekStart(s), 3);
  const firstThu = (() => { let d = monthKey(thu) + '-01'; while (parse(d).getDay() !== 4) d = addDays(d, 1); return d; })();
  return { month: Number(thu.slice(5, 7)), n: Math.round((parse(thu) - parse(firstThu)) / 6048e5) + 1 };
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// 반복 일정이 해당 날짜에 나타나는지
export function occursOn(item, date) {
  if (item.deleted || item.kind !== 'item') return false;
  if (date < item.date) return false;
  if (item.until && date > item.until) return false;
  switch (item.repeat || 'none') {
    case 'none': return item.date === date;
    case 'daily': return true;
    case 'weekdays': { const w = parse(date).getDay(); return w >= 1 && w <= 5; }
    case 'weekly': return parse(date).getDay() === parse(item.date).getDay();
    case 'monthly': {
      const want = parse(item.date).getDate();
      const last = new Date(parse(date).getFullYear(), parse(date).getMonth() + 1, 0).getDate();
      return parse(date).getDate() === Math.min(want, last);
    }
    case 'yearly': return date.slice(5) === item.date.slice(5);
    default: return false;
  }
}

export const isDone = (item, date) => (item.repeat && item.repeat !== 'none') ? (item.doneDates || []).includes(date) : !!item.done;

export function itemsOn(records, date) {
  return Object.values(records)
    .filter((r) => occursOn(r, date))
    .sort((a, b) => (a.time || '99') .localeCompare(b.time || '99') || (a.order ?? 0) - (b.order ?? 0) || a.updatedAt - b.updatedAt);
}

// 오늘 이전에 끝내지 못한 단발성 할 일
export function overdue(records, date) {
  return Object.values(records)
    .filter((r) => r.kind === 'item' && !r.deleted && r.type === 'task' && (r.repeat || 'none') === 'none' && !r.done && r.date < date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function goalsOf(records, scope) {
  return Object.values(records)
    .filter((r) => r.kind === 'goal' && !r.deleted && r.scope === scope)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.updatedAt - b.updatedAt);
}

export function search(records, q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  return Object.values(records)
    
    .filter((r) => ['item', 'note', 'goal'].includes(r.kind))
    .filter((r) => !r.deleted && ((r.title || '') + ' ' + (r.note || '') + ' ' + (r.text || '')).toLowerCase().includes(q))
    .sort((a, b) => (b.date || b.scope || b.id).localeCompare(a.date || a.scope || a.id))
    .slice(0, 100);
}

// 동기화 병합: 레코드별 updatedAt 큰 쪽 승리(같으면 삭제 우선)
export function mergeRecord(a, b) {
  if (!a) return b; if (!b) return a;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return a.deleted ? a : b;
}
export function merge(local, remote) {
  const out = { ...local };
  for (const [id, r] of Object.entries(remote)) out[id] = mergeRecord(local[id], r);
  return out;
}

export function toggleDone(item, date, now = Date.now()) {
  if (item.repeat && item.repeat !== 'none') {
    const s = new Set(item.doneDates || []);
    s.has(date) ? s.delete(date) : s.add(date);
    return { ...item, doneDates: [...s].sort(), updatedAt: now };
  }
  return { ...item, done: !item.done, updatedAt: now };
}

// 오래된 삭제 표시 정리(90일)
export function compact(records, now = Date.now()) {
  const out = {};
  for (const [id, r] of Object.entries(records)) if (!(r.deleted && now - r.updatedAt > 90 * 864e5)) out[id] = r;
  return out;
}

export function validateImport(data) {
  if (!data || typeof data !== 'object' || typeof data.records !== 'object') throw new Error('플래너 백업 파일이 아닙니다');
  for (const r of Object.values(data.records)) {
    if (!r || typeof r.id !== 'string' || typeof r.updatedAt !== 'number' || !['item', 'note', 'goal', 'profile', 'routine', 'focus', 'mood'].includes(r.kind)) throw new Error('손상된 항목이 있습니다');
  }
  return data.records;
}
