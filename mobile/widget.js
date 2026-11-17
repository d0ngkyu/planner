import { today, addDays, itemsOn, isDone } from '../store.js';
export function widgetSnapshot(records, date = today()) {
  const days = {};
  for(let i=0;i<8;i++) {
    const d=addDays(date,i), items=itemsOn(records,d).filter(it=>!isDone(it,d));
    days[d]={ count:items.length, lines:items.slice(0,5).map(it=>(it.time ? it.time+'  ' : '□  ')+it.title) };
  }
  return {days};
}
