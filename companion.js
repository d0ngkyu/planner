import { today,itemsOn,isDone } from './store.js';
export const COMPANION_STATES={happy:'오늘도 반가워요',proud:'하나 해냈네요!',crown:'오늘 계획을 마쳤어요',sleep:'잠깐 쉬고 있어요',waiting:'언제든 돌아와도 좋아요',welcome:'다시 만나 반가워요'};
export function companionProgress(records,date=today()) {
  const tasks=itemsOn(records,date).filter(r=>r.type==='task');
  return {date,total:tasks.length,done:tasks.filter(r=>isDone(r,date)).length};
}
export function visitCompanion(previous={},now=Date.now()) {
  return {lastVisit:now,welcomeUntil:previous.lastVisit && now-previous.lastVisit>=2*864e5 ? now+4*36e5 : previous.welcomeUntil||0};
}
export function companionState(progress,visit,now=Date.now()) {
  const away=visit.lastVisit?Math.max(0,now-visit.lastVisit):0;
  if(away>=5*864e5) return 'waiting';
  if(away>=2*864e5) return 'sleep';
  if(progress.total>0 && progress.done>=progress.total) return 'crown';
  if(progress.done>0) return 'proud';
  if(visit.welcomeUntil>now) return 'welcome';
  return 'happy';
}
// Original vector mascot, shared by SVG UI and generated Android vector drawables.
export function companionPaths(state='happy',background=true) {
  const out=background?[{d:'M22 0 H78 Q100 0 100 22 V78 Q100 100 78 100 H22 Q0 100 0 78 V22 Q0 0 22 0 Z',fill:'#3E5C50'}]:[];
  const line=d=>out.push({d,fill:'none',stroke:'#F6F5F0',width:2.8});
  // Calendar outline and expression only. Keep the mark inside adaptive-icon safe area.
  line('M36 28 H64 Q72 28 72 36 V66 Q72 74 64 74 H36 Q28 74 28 66 V36 Q28 28 36 28 M38 24 V32 M62 24 V32');
  if(state==='sleep') line('M37 48 L43 48 M57 48 L63 48 M47 61 H53');
  else if(state==='waiting') line('M37 49 Q40 52 43 49 M57 49 Q60 52 63 49 M46 62 Q50 58 54 62');
  else if(state==='proud') line('M37 49 Q40 44 43 49 M57 49 Q60 44 63 49 M43 59 Q50 66 57 59');
  else if(state==='crown') line('M37 49 Q40 44 43 49 M57 49 Q60 44 63 49 M44 60 L49 64 L57 56');
  else if(state==='welcome') line('M38 46 V50 M58 48 Q61 44 64 48 M43 59 Q50 66 57 59');
  else line('M39 46 V50 M61 46 V50 M44 59 Q50 64 56 59');
  return out;
}
export function companionSVG(state='happy') {
  if(!COMPANION_STATES[state]) state='happy';
  return `<svg viewBox="0 0 100 100" aria-hidden="true" class="companion-svg">${companionPaths(state).map(p=>`<path d="${p.d}" fill="${p.fill}"${p.stroke?` stroke="${p.stroke}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round"`:''}/>`).join('')}</svg>`;
}
