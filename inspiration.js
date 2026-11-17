import { PIECES, MOODS } from './inspiration-content.js';
export { PIECES, MOODS };
export const savedPieces = records => Object.values(records).filter(r=>r.kind==='inspiration' && !r.deleted).sort((a,b)=>(b.savedAt||b.updatedAt)-(a.savedAt||a.updatedAt));
export const savedId = id => 'inspiration:'+id;
export function pieceSlot(now=new Date()) {
  const hour=now.getHours(), slot=hour<5?'night':hour<12?'morning':hour<18?'afternoon':'night';
  return `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}:${slot}`;
}
export function pieceAt(slot,cursor=0) {
  // A deterministic shuffle per time block: no repeats until every piece has appeared.
  let seed=[...slot].reduce((a,c)=>(Math.imul(a,31)+c.charCodeAt(0))>>>0,17);
  const list=[...PIECES];
  for(let i=list.length-1;i>0;i--) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; const j=seed%(i+1); [list[i],list[j]]=[list[j],list[i]]; }
  return list[((Math.floor(cursor)||0)%list.length+list.length)%list.length];
}
export function inspirationRecord(piece,now=Date.now()) {
  return {id:savedId(piece.id),kind:'inspiration',pieceId:piece.id,text:piece.text,mood:piece.mood,sub:piece.sub,author:piece.author,source:piece.source,url:piece.url,format:piece.kind,savedAt:now,updatedAt:now,deleted:false};
}
export function recommendations(records,mood,sub,limit=3) {
  const saved=new Set(savedPieces(records).map(r=>r.pieceId));
  return PIECES.filter(p=>!saved.has(p.id) && p.mood===mood).sort((a,b)=>(b.sub===sub)-(a.sub===sub)||a.id.localeCompare(b.id)).slice(0,limit);
}
export const groupName = (mood,sub) => MOODS[mood]?.subs[sub] || '나의 모음';
