import { addDays, ymd, parse, occursOn, isDone } from '../store.js';
import { reminderMessage, REMIND_OFFSETS } from '../notify.js';

// Refresh on edits/resume. Bound the queue, never schedule already completed items.
export function planNotifications(records, settings = {}, focus = null, now = new Date()) {
  const out = [];
  const start = ymd(now);
  const add = (at, title, body, extra) => {
    if (at > now) out.push({ title, body, schedule: { at }, extra });
  };
  for (let day = 0; day < 30; day++) {
    const date = addDays(start, day);
    for (const item of Object.values(records)) {
      if (!item.time || !REMIND_OFFSETS.includes(Number(item.remind)) || !occursOn(item, date) || isDone(item, date)) continue;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) continue;
      const at = parse(date), [h, m] = item.time.split(':').map(Number);
      at.setHours(h, m - Number(item.remind), 0, 0);
      const message = reminderMessage(item, { date, remind: Number(item.remind) });
      add(at, message.title, message.body, { date, item: item.id });
    }
    for (const [key, title, body] of [
      ['morning', '오늘의 계획', '플래너를 열어 오늘 할 일을 확인해 보세요.'],
      ['evening', '하루 마무리', '오늘 한 일을 체크하고 내일 계획을 정리해 보세요.'],
    ]) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(settings[key] || '')) continue;
      const at = parse(date), [h, m] = settings[key].split(':').map(Number);
      at.setHours(h, m, 0, 0);
      add(at, title, body, { date });
      // No stale "remaining task" counts while the app is closed.
    }
  }
  out.sort((a, b) => a.schedule.at - b.schedule.at);
  const result = out.slice(0, 400).map((n, i) => ({ ...n, id: i + 1 }));
  if (focus && !focus.paused && focus.endsAt > now.getTime()) result.push({
    id: 10001, title: '집중 완료 ✅', body: `${focus.title || '집중'} · ${Math.round(focus.total / 60)}분`,
    schedule: { at: new Date(focus.endsAt) }, extra: { date: start },
  });
  return result;
}
