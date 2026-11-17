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
export function companionPaths(state='happy') {
  const out=[{d:'M22 4 H78 Q96 4 96 22 V78 Q96 96 78 96 H22 Q4 96 4 78 V22 Q4 4 22 4 Z',fill:'#3B6E5C'},
    {d:'M28 28 Q50 20 72 28 Q84 34 84 58 Q84 80 64 84 H36 Q16 80 16 58 Q16 34 28 28 Z',fill:'#FAF9F6'},
    {d:'M50 30 Q35 26 35 14 Q50 14 50 30 M50 30 Q50 13 66 12 Q66 26 50 30',fill:'#8DBDA5'}];
  const line=d=>out.push({d,fill:'none',stroke:'#294D40',width:3.5});
  if(['sleep','waiting'].includes(state)) {line('M29 49 Q35 54 41 49 M59 49 Q65 54 71 49');line('M46 64 Q50 67 54 64');}
  else if(state==='proud'||state==='crown') {line('M29 51 Q35 43 41 51 M59 51 Q65 43 71 51');line('M41 61 Q50 72 59 61');}
  else {out.push({d:'M33 45 A3 3 0 1 0 33 51 A3 3 0 1 0 33 45 M67 45 A3 3 0 1 0 67 51 A3 3 0 1 0 67 45',fill:'#294D40'});line('M42 61 Q50 68 58 61');}
  out.push({d:'M24 57 Q30 53 36 57 Q30 62 24 57 M64 57 Q70 53 76 57 Q70 62 64 57',fill:'#E9B9A2'});
  if(state==='crown') out.push({d:'M32 25 L29 9 L43 16 L50 5 L57 16 L71 9 L68 25 Z',fill:'#E6B954'});
  if(state==='sleep') out.push({d:'M72 18 H84 L73 29 H85',fill:'none',stroke:'#FAF9F6',width:3});
  if(state==='waiting') out.push({d:'M15 65 Q30 56 50 66 Q70 76 85 64 V77 Q80 88 64 88 H36 Q20 86 15 77 Z',fill:'#8DBDA5'});
  if(state==='welcome') {line('M16 60 L9 44 M9 44 L6 40 M9 44 L10 37 M9 44 L15 40');out.push({d:'M78 20 L81 13 L84 20 L91 23 L84 26 L81 33 L78 26 L71 23 Z',fill:'#E6B954'});}
  return out;
}
export function companionSVG(state='happy') {
  if(!COMPANION_STATES[state]) state='happy';
  return `<svg viewBox="0 0 100 100" aria-hidden="true" class="companion-svg">${companionPaths(state).map(p=>`<path d="${p.d}" fill="${p.fill}"${p.stroke?` stroke="${p.stroke}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round"`:''}/>`).join('')}</svg>`;
}
