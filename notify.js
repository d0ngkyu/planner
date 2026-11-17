// 알림 판단 로직(순수 함수). 서버(functions)와 테스트에서 공용으로 쓴다.
import { ymd, pad, occursOn, isDone, itemsOn, overdue } from './store.js';

export const REMIND_OFFSETS = [0, 5, 10, 30, 60]; // 분 전
export const NAG_STEPS = [0, 30, 60];             // 밤 체크 재알림(분 뒤)

// 서울 시간 기준 "벽시계" Date 객체 (getHours 등이 KST 값이 되도록)
export function zonedNow(date = new Date(), tz = 'Asia/Seoul') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
}
export const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const shift = (d, min) => new Date(d.getTime() + min * 60000);

// 지금(분 단위) 보내야 할 일정 알림 조회 조건들: [{time, remind, date}]
export function reminderSlots(now) {
  return REMIND_OFFSETS.map((off) => { const t = shift(now, off); return { remind: off, time: hm(t), date: ymd(t) }; });
}

export function reminderMessage(item, slot) {
  const when = slot.remind === 0 ? '지금' : slot.remind >= 60 ? `${slot.remind / 60}시간 후` : `${slot.remind}분 후`;
  return {
    title: `${item.time} ${item.title}`,
    body: item.type === 'task' ? `${when} 할 일이에요. 끝나면 체크!` : `${when} 시작해요.`,
    url: `./?date=${slot.date}&item=${item.id}`,
    tag: `r-${item.id}-${slot.date}`,
  };
}

// 이 슬롯에 실제로 알림이 나가야 하는지
export function shouldRemind(item, slot) {
  if (!item || item.deleted || item.kind !== 'item' || !item.time) return false;
  if (item.time !== slot.time || Number(item.remind) !== slot.remind) return false;
  if (!occursOn(item, slot.date)) return false;
  return !isDone(item, slot.date);
}

// 아침/밤 체크인: settings = { morning:'08:00'|'', evening:'21:00'|'', nag:bool }
export function checkinKind(settings, now) {
  const t = hm(now);
  if (settings.morning && settings.morning === t) return { kind: 'morning', step: 0 };
  if (settings.evening) {
    const steps = settings.nag === false ? [0] : NAG_STEPS;
    for (const s of steps) if (hm(shift(now, -s)) === settings.evening) return { kind: 'evening', step: s };
  }
  return null;
}

const list = (arr) => arr.slice(0, 3).map((i) => i.title).join(', ') + (arr.length > 3 ? ` 외 ${arr.length - 3}개` : '');

export function checkinMessage(records, kind, step, now) {
  const date = ymd(now);
  const tasks = itemsOn(records, date).filter((i) => i.type === 'task');
  const left = tasks.filter((i) => !isDone(i, date));
  const url = `./?date=${date}`;
  if (kind === 'morning') {
    const od = overdue(records, date).length;
    if (!tasks.length) return { title: '좋은 아침이에요', body: `오늘 할 일을 3개만 골라 보세요.${od ? ` (밀린 일 ${od}개)` : ''}`, url, tag: 'morning' };
    return { title: `오늘 할 일 ${tasks.length}개`, body: list(tasks) + (od ? ` · 밀린 일 ${od}개` : ''), url, tag: 'morning' };
  }
  // evening
  if (!tasks.length) return step === 0 ? { title: '하루 마무리', body: '오늘 한 일을 체크하고 내일 할 일 3개를 적어 두세요.', url: `./?date=${ymd(shift(now, 24 * 60))}`, tag: 'evening' } : null;
  if (!left.length) return step === 0 ? { title: `오늘 ${tasks.length}개 모두 완료 👏`, body: '내일 할 일도 미리 적어 둘까요?', url: `./?date=${ymd(shift(now, 24 * 60))}`, tag: 'evening' } : null;
  const title = step === 0 ? `아직 남은 할 일 ${left.length}개` : `다시 알려 드려요 · 남은 할 일 ${left.length}개`;
  return { title, body: `${list(left)} — 했으면 체크, 못 했으면 내일로 옮겨 주세요.`, url, tag: 'evening' };
}
