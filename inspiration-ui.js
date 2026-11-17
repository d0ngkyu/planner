import {PIECES,MOODS,pieceSlot,pieceAt,savedPieces,savedId,inspirationRecord,recommendations,groupName} from './inspiration.js';
import {companionSVG,companionProgress,companionState,visitCompanion,COMPANION_STATES} from './companion.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const safeUrl=url=>{try{return new URL(url).protocol==='https:'?url:'';}catch{return '';}};
export function createInspiration({getRecords,save,remove,native}) {
  let sequence=read('planner.piece.v1',{}), visit=read('planner.companion.v1',{}), activeMood='all', lastSignature='', nativeState=null;
  let enabled=read('planner.companion.enabled',true), lastNativeProgress='';
  const host=document.querySelector('#inspirationHost'), dlg=document.querySelector('#inspirationDlg'), body=document.querySelector('#inspirationBody');
  function current() {
    const slot=pieceSlot();
    if(sequence.slot!==slot) {sequence={slot,cursor:0};localStorage.setItem('planner.piece.v1',JSON.stringify(sequence));}
    return pieceAt(slot,sequence.cursor);
  }
  const isSaved=id=>{const r=getRecords()[savedId(id)];return r&&!r.deleted;};
  const sourceLine=p=>`<small class="piece-source">${esc(p.author)} · ${esc(p.source)}${safeUrl(p.url)?` · <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">출처 읽기</a>`:''}</small>`;
  function toggle(id) {
    const old=getRecords()[savedId(id)], p=PIECES.find(p=>p.id===id);
    if(isSaved(id)) remove(savedId(id));
    else if(p) save(inspirationRecord(p));
    else if(old) save({...old,deleted:false,savedAt:Date.now()});
    refresh();
  }
  function savedCard(r) {
    return `<article class="inspiration-entry"><span class="piece-kind">${esc(r.format||'저장한 글')}</span><p>${esc(r.text)}</p>${sourceLine(r)}<button data-piece-save="${esc(r.pieceId)}" aria-label="이 글 저장 해제">♥ 저장됨 · 해제</button></article>`;
  }
  function recommendedCard(p) {
    return `<article class="inspiration-entry recommended"><span class="piece-kind">${esc(p.kind)} · ${esc(groupName(p.mood,p.sub))}</span><p>${esc(p.text)}</p>${sourceLine(p)}<button data-piece-save="${esc(p.id)}">♡ 저장</button></article>`;
  }
  function library() {
    const all=savedPieces(getRecords()), scroll=dlg.scrollTop;
    const groups=Object.entries(MOODS).filter(([key])=>activeMood==='all'||activeMood===key);
    body.innerHTML=`<p class="muted small">저장한 글을 느낌별로 모았어요. 각 모음 아래에서 주제가 비슷한 글도 만나보세요.</p><div class="inspiration-filters"><button data-mood-filter="all" aria-pressed="${activeMood==='all'}">전체 ${all.length}</button>${Object.entries(MOODS).map(([id,m])=>`<button data-mood-filter="${id}" aria-pressed="${activeMood===id}">${m.name} ${all.filter(r=>r.mood===id).length}</button>`).join('')}</div>${all.length?'':'<p class="empty">마음에 드는 글의 ♡ 저장을 눌러 나만의 영감함을 만들어보세요.</p>'}${groups.map(([id,m])=>{
      const saved=all.filter(r=>r.mood===id); if(!saved.length) return '';
      const subIds=[...new Set(saved.map(r=>r.sub))];
      return `<section class="inspiration-group" style="--c:${m.color}"><h3>${m.name}</h3>${subIds.map(sub=>`<details class="inspiration-sub" open><summary>${esc(groupName(id,sub))} · ${saved.filter(r=>r.sub===sub).length}개</summary><div class="saved-pieces">${saved.filter(r=>r.sub===sub).map(savedCard).join('')}</div><h4>이 느낌이 좋았다면</h4><div class="recommended-pieces">${recommendations(getRecords(),id,sub).map(recommendedCard).join('')||'<p class="muted small">이 주제의 글을 모두 모았어요.</p>'}</div></details>`).join('')}</section>`;
    }).join('')}${all.filter(r=>!MOODS[r.mood]).map(savedCard).join('')}`;
    dlg.scrollTop=scroll;
  }
  const bookmark='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z"/></svg>';
  const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';
  function refresh() {
    const p=current(), progress=companionProgress(getRecords()), state=nativeState||companionState(progress,visit), saved=isSaved(p.id), count=savedPieces(getRecords()).length;
    const signature=JSON.stringify([p.id,saved,count,state]);
    if(signature!==lastSignature) {
      host.innerHTML=`<section class="piece-card" aria-label="오늘의 한 조각"><div class="piece-heading">오늘의 한 조각</div><button class="piece-text" id="nextPiece" aria-label="다른 한 조각 보기">${esc(p.text)}</button><div class="piece-bottom"><button id="pieceSource" aria-label="글귀 출처와 전체 내용">${esc(p.author)}${p.kind==='고전의 한 문장'?' · 자체 의역':''}</button><div class="piece-actions"><button data-piece-save="${p.id}" aria-label="${saved?'글 저장 해제':'글 저장'}" aria-pressed="${!!saved}">${bookmark}</button><button id="advancePiece" aria-label="다음 한 조각">${arrow}</button><button id="openInspiration">영감함<span>${count||''}</span></button></div></div></section>`;
      const preview=document.querySelector("#companionPreview");
      if(preview) preview.innerHTML=`${companionSVG(state)}<span>${COMPANION_STATES[state]}</span>`;
      lastSignature=signature;
    }
    if(dlg.open) library();
    const fingerprint=JSON.stringify(progress);
    if(native?.companion && fingerprint!==lastNativeProgress) {
      lastNativeProgress=fingerprint;
      native.companion({...progress}).then(status=>{nativeState=status.state;enabled=status.enabled;document.querySelector('#dynamicIcon').checked=enabled;refresh();}).catch(()=>{lastNativeProgress='';});
    }
  }
  function change(direction) { current(); sequence.cursor=(sequence.cursor||0)+direction; localStorage.setItem('planner.piece.v1',JSON.stringify(sequence)); refresh(); document.querySelector('#nextPiece').focus({preventScroll:true}); }
  host.onclick=e=>{
    const saveButton=e.target.closest('[data-piece-save]'); if(saveButton){toggle(saveButton.dataset.pieceSave);return;}
    if(e.target.closest('#nextPiece,#advancePiece'))change(1);

    if(e.target.closest('#openInspiration'))open();
    if(e.target.closest('#pieceSource')){ const p=current();document.querySelector('#pieceDetailBody').innerHTML=`<p>${esc(p.text)}</p>${sourceLine(p)}<button id="previousPiece" class="piece-previous">← 이전 글 보기</button>`;document.querySelector('#pieceDetailDlg').showModal(); }
  };
  document.querySelector('#pieceDetailBody').onclick=e=>{if(e.target.closest('#previousPiece')){document.querySelector('#pieceDetailDlg').close();change(-1);}};
  body.onclick=e=>{
    const saveButton=e.target.closest('[data-piece-save]'); if(saveButton){toggle(saveButton.dataset.pieceSave);return;}
    const filter=e.target.closest('[data-mood-filter]');if(filter){activeMood=filter.dataset.moodFilter;library();}
  };
  function open() {library();dlg.showModal();}
  async function onVisit() {
    visit=visitCompanion(visit);localStorage.setItem('planner.companion.v1',JSON.stringify(visit));
    if(native?.companion) try { const status=await native.companion({visit:true,...companionProgress(getRecords())});nativeState=status.state;enabled=status.enabled; }catch{}
    document.querySelector('#dynamicIcon').checked=enabled;refresh();
  }
  const setting=document.querySelector('#dynamicIcon'); setting.disabled=!native?.companion;
  document.querySelector('#dynamicIconNote').textContent=native?.companion?'방문·완료에 따라 표정이 바뀌어요. 2일 쉬면 졸고, 5일 쉬면 기다리는 표정이 돼요. 휴대폰 절전/홈 화면 앱에 따라 변경이 늦거나 기존 바로가기에 바로 반영되지 않을 수 있어요.':'캐릭터는 앱 안에서 만날 수 있어요. 홈 화면 아이콘 자동 변경은 Android 설치 앱에서 지원합니다.';
  setting.onchange=async()=>{setting.disabled=true;try{const status=await native.companion({enabled:setting.checked,...companionProgress(getRecords())});enabled=status.enabled;nativeState=status.state;localStorage.setItem('planner.companion.enabled',JSON.stringify(enabled));refresh();}catch{setting.checked=enabled;document.querySelector('#dynamicIconNote').textContent='아이콘 설정을 바꾸지 못했어요. 다시 시도해 주세요.';}finally{setting.disabled=false;}};
  document.querySelector('#inspirationSettings').onclick=()=>{document.querySelector('#settingsDlg').close();open();};
  setInterval(()=>{if(!document.hidden)refresh();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)onVisit();});
  window.addEventListener('planner-resume',onVisit);
  onVisit();
  return {refresh,open};
}
