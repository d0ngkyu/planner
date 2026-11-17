import { itemsOn, addDays, isDone, today } from './store.js';
import { categoryOf } from './categories.js';

export const minutes = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? Number(value.slice(0,2))*60+Number(value.slice(3)) : null;
export const clockText = n => `${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
export function daySegments(records, date) {
  const result=[];
  for(const origin of [addDays(date,-1),date]) for(const item of itemsOn(records,origin)) {
    const start=minutes(item.time); if(start === null) continue;
    const explicit=minutes(item.end);
    // Equal start/end is not a 24-hour appointment; display one hour, explicitly marked.
    const estimated=explicit === null || explicit === start;
    let end=estimated ? start+60 : explicit <= start ? explicit+1440 : explicit;
    const offset=origin===date ? 0 : -1440;
    const from=Math.max(0,start+offset), to=Math.min(1440,end+offset);
    if(to<=from) continue;
    result.push({item,origin,key:item.id+'@'+origin,from,to,estimated,overnight:end>1440,done:isDone(item,origin)});
  }
  result.sort((a,b)=>a.from-b.from || b.to-a.to || a.key.localeCompare(b.key));
  const laneEnds=[];
  for(const segment of result) {
    let lane=laneEnds.findIndex(end=>end<=segment.from);
    if(lane<0) lane=laneEnds.length;
    laneEnds[lane]=segment.to; segment.lane=lane;
  }
  return {segments:result,lanes:Math.max(1,laneEnds.length)};
}
export const point = (minute,radius) => {
  const a=minute/1440*Math.PI*2-Math.PI/2;
  return [180+Math.cos(a)*radius,180+Math.sin(a)*radius];
};
export function ringPath(from,to,inner,outer) {
  // Split full circles; SVG arcs cannot represent a full turn with identical endpoints.
  if(to-from>=1440) return ringPath(from,from+720,inner,outer)+' '+ringPath(from+720,to,inner,outer);
  const a=point(from,outer), b=point(to,outer), c=point(to,inner), d=point(from,inner), large=to-from>720?1:0;
  return `M ${a} A ${outer} ${outer} 0 ${large} 1 ${b} L ${c} A ${inner} ${inner} 0 ${large} 0 ${d} Z`;
}
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color = item => /^#[0-9a-f]{6}$/i.test(item.color||'') ? item.color : categoryOf(item.category).color;
const range = s => `${clockText(s.from)}–${s.to===1440?'24:00':clockText(s.to)}${s.origin!==s.date?'':''}`;
export function dialView(records,date,selectedKey,now=new Date()) {
  const {segments,lanes}=daySegments(records,date), current=now.getHours()*60+now.getMinutes();
  const selected=segments.find(s=>s.key===selectedKey) || (date===today() && segments.find(s=>s.from<=current && s.to>current)) || (date===today() && segments.find(s=>s.from>current)) || segments[0];
  const width=88/lanes;
  const paths=segments.map(s=>{
    const outer=140-s.lane*width, inner=outer-width+2, label=range(s)+' '+s.item.title;
    const p=point((s.from+s.to)/2,(inner+outer)/2);
    const text=s.to-s.from>=100 && lanes<=2 ? `<text x="${p[0]}" y="${p[1]}" class="dial-event-label" text-anchor="middle">${esc(s.item.title.length>7?s.item.title.slice(0,6)+'…':s.item.title)}</text>` : '';
    return `<g class="dial-segment ${s.done?'completed':''} ${s===selected?'selected':''}"><path d="${ringPath(s.from,s.to,inner,outer)}" fill="${color(s.item)}" tabindex="0" role="button" aria-label="${esc(label)}" aria-pressed="${s===selected}" data-dial-select="${esc(s.key)}"><title>${esc(label)}</title></path>${text}</g>`;
  }).join('');
  const ticks=Array.from({length:24},(_,h)=>{
    const a=point(h*60,143), b=point(h*60,h%6===0?151:147), p=point(h*60,163);
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="dial-tick"/>${h%3===0?`<text x="${p[0]}" y="${p[1]+4}" text-anchor="middle" class="dial-hour">${String(h).padStart(2,'0')}</text>`:''}`;
  }).join('');
  const selectedCard=selected ? `<div class="dial-detail" style="--c:${color(selected.item)}"><div class="dial-detail-meta"><span>${esc(categoryOf(selected.item.category).name)} · ${range(selected)}</span><span>${selected.done?'완료':'선택 일정'}</span></div><h3>${esc(selected.item.title)}</h3>${selected.origin!==date?'<p class="muted small">전날부터 이어지는 일정</p>':''}${selected.estimated?'<p class="muted small">종료 시간이 없거나 시작과 같아 원판에는 1시간으로 표시했어요.</p>':''}<div class="row-btns"><button class="primary" data-edit="${esc(selected.item.id)}">내용 · 기록 열기</button>${selected.item.type==='task'?`<button data-toggle="${esc(selected.item.id)}" data-date="${selected.origin}">${selected.done?'완료 취소':'완료하기'}</button>`:''}</div></div>` : '<p class="empty">아직 시간 있는 일정이 없어요.<br>아래에 “09:00-10:00 운동”처럼 입력해 보세요.</p>';
  return `<section class="card dial-card" aria-label="24시간 하루 원판"><div class="dial-heading"><h2>하루를 한눈에</h2><span class="muted small">24시간 · 시계 방향</span></div><svg class="day-dial" viewBox="0 0 360 360" aria-label="${date} 시간별 일정" role="group"><circle cx="180" cy="180" r="140" class="dial-base"/>${ticks}${paths}<circle cx="180" cy="180" r="49" class="dial-center"/><text x="180" y="174" text-anchor="middle" class="dial-clock-label">${date===today()?'지금':'선택한 날'}</text><text x="180" y="198" text-anchor="middle" class="dial-clock">${date===today()?clockText(current):date.slice(5).replace('-','.')}</text><g class="dial-now" style="display:${date===today()?'':'none'}"><line x1="180" y1="125" x2="180" y2="39"/><circle cx="180" cy="39" r="4"/></g></svg>${selectedCard}${segments.length?`<details class="dial-schedule"><summary>시간 일정 모두 보기 · ${segments.length}개${lanes>1?' · 겹친 시간은 동심원으로 표시':''}</summary><div>${segments.map(s=>`<button data-dial-select="${esc(s.key)}" aria-pressed="${s===selected}" style="--c:${color(s.item)}"><span>${range(s)}</span><b>${esc(s.item.title)}</b>${s.done?'<small>완료</small>':''}</button>`).join('')}</div></details>`:''}</section>`;
}

