import * as S from './store.js';
import { createSync } from './sync.js';

const KEY = 'planner.records.v1';
const UIKEY = 'planner.ui.v1';
const COLORS = ['#2f6f5e', '#3b6fd8', '#d0544b', '#d99a2b', '#8a5cc7', '#6b7280'];
const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let records = load();
const ui = Object.assign({ view: 'day', date: S.today(), theme: 'system' }, safeJSON(localStorage.getItem(UIKEY)) || {});
ui.date = S.today(); // 열 때는 항상 오늘부터

function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }
function load() { return safeJSON(localStorage.getItem(KEY)) || {}; }
let saveTimer;
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(() => localStorage.setItem(KEY, JSON.stringify(records)), 150); }
function saveUI() { localStorage.setItem(UIKEY, JSON.stringify({ view: ui.view, theme: ui.theme })); }

// ---------- 동기화 ----------
let syncState = { state: 'off' };
const sync = createSync({
  onRemote(remote, first) {
    if (first) {
      // 첫 연결: 서버에 없거나 로컬이 더 최신인 항목 업로드
      for (const r of Object.values(records)) if (!remote[r.id] || r.updatedAt > remote[r.id].updatedAt) sync.push(r);
    }
    records = S.merge(records, remote); persist(); render();
  },
  onStatus(s) { syncState = s; renderSync(); },
});

function put(rec) {
  rec = { ...rec, updatedAt: Math.max(Date.now(), (records[rec.id]?.updatedAt || 0) + 1) };
  records[rec.id] = rec; persist(); sync.push(rec); return rec;
}
function remove(id) { if (records[id]) put({ ...records[id], deleted: true }); }

// ---------- 공통 조각 ----------
const fmtMD = (s) => `${Number(s.slice(5, 7))}.${Number(s.slice(8, 10))}`;
function labelText() {
  const d = ui.date;
  if (ui.view === 'day') return `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일 <small>${S.dowOf(d)}요일</small>`;
  if (ui.view === 'week') { const w = S.weekOfMonth(d); const days = S.weekDays(d); return `${w.month}월 ${w.n}주 <small>${fmtMD(days[0])} – ${fmtMD(days[6])}</small>`; }
  return `${d.slice(0, 4)}년 ${Number(d.slice(5, 7))}월`;
}

function itemRow(it, date, compact = false) {
  const done = S.isDone(it, date);
  const rep = it.repeat && it.repeat !== 'none' ? '<span class="rep" title="반복">↻</span>' : '';
  const mark = it.type === 'task'
    ? `<button class="check ${done ? 'on' : ''}" data-toggle="${it.id}" data-date="${date}" aria-label="완료" style="--c:${it.color || COLORS[0]}"></button>`
    : `<span class="ev" style="--c:${it.color || COLORS[1]}"></span>`;
  return `<li class="item ${done ? 'done' : ''} ${compact ? 'compact' : ''}" data-edit="${it.id}" data-date="${date}" style="--c:${it.color || COLORS[0]}">
    ${mark}${it.time ? `<span class="time">${it.time}</span>` : ''}<span class="t">${esc(it.title)}</span>${rep}${!compact && it.note ? '<span class="has-note">✎</span>' : ''}
  </li>`;
}

function quickAdd(date, id, ph = '할 일 추가 · 예: 14:00 회의') {
  return `<form class="quick" data-add="${date}"><input id="${id}" placeholder="${ph}" autocomplete="off" enterkeyhint="done"><button aria-label="추가">＋</button></form>`;
}

function noteBox(key, ph) {
  const r = records['note:' + key];
  return `<textarea class="memo" id="memo-${key}" data-note="${key}" placeholder="${ph}" rows="3">${esc(r && !r.deleted ? r.text : '')}</textarea>`;
}

function goals(scope, title) {
  const list = S.goalsOf(records, scope);
  const done = list.filter((g) => g.done).length;
  return `<section class="card goals"><h3>${title}${list.length ? `<span class="count">${done}/${list.length}</span>` : ''}</h3>
    <ul>${list.map((g) => `<li class="goal ${g.done ? 'done' : ''}"><button class="check ${g.done ? 'on' : ''}" data-goal="${g.id}" aria-label="완료"></button><span class="t" data-goal-edit="${g.id}">${esc(g.text)}</span><button class="x" data-goal-del="${g.id}" aria-label="삭제">✕</button></li>`).join('')}</ul>
    <form class="quick" data-goal-add="${scope}"><input id="goal-${scope}" placeholder="목표 추가" autocomplete="off"><button aria-label="추가">＋</button></form>
  </section>`;
}

// ---------- 뷰 ----------
function dayView() {
  const d = ui.date, items = S.itemsOn(records, d);
  const od = d === S.today() ? S.overdue(records, d) : [];
  const tasks = items.filter((i) => i.type === 'task'), doneN = tasks.filter((i) => S.isDone(i, d)).length;
  return `<div class="day-layout">
    <section class="card">
      <h3>할 일 · 일정 ${tasks.length ? `<span class="count">${doneN}/${tasks.length}</span>` : ''}</h3>
      ${tasks.length ? `<div class="bar"><i style="width:${(doneN / tasks.length) * 100}%"></i></div>` : ''}
      <ul class="list">${items.map((i) => itemRow(i, d)).join('') || '<li class="empty">비어 있어요. 아래에서 추가하세요.</li>'}</ul>
      ${quickAdd(d, 'qa-day')}
    </section>
    ${od.length ? `<section class="card overdue"><h3>밀린 할 일 <span class="count">${od.length}</span><button class="chip" data-carry-all>모두 오늘로</button></h3>
      <ul class="list">${od.map((i) => `<li class="item" data-edit="${i.id}" data-date="${i.date}"><button class="check" data-toggle="${i.id}" data-date="${i.date}" style="--c:${i.color || COLORS[0]}"></button><span class="time">${fmtMD(i.date)}</span><span class="t">${esc(i.title)}</span><button class="chip" data-carry="${i.id}">오늘로</button></li>`).join('')}</ul></section>` : ''}
    <section class="card"><h3>오늘의 메모</h3>${noteBox('d:' + d, '생각, 기록, 회고…')}</section>
  </div>`;
}

function weekView() {
  const days = S.weekDays(ui.date), t = S.today(), wk = S.weekKey(ui.date);
  return `<div class="week-layout">
    <div class="week-grid">${days.map((d, i) => {
      const items = S.itemsOn(records, d);
      return `<section class="card wday ${d === t ? 'today' : ''} ${i >= 5 ? 'weekend' : ''}">
        <h3 class="wday-h" data-goto="${d}"><span class="num">${Number(d.slice(8))}</span>${S.DOW[i]}</h3>
        <ul class="list">${items.map((it) => itemRow(it, d, true)).join('')}</ul>
        ${quickAdd(d, 'qa-' + d, '추가')}
      </section>`;
    }).join('')}</div>
    <div class="side">${goals(wk, '이번 주 목표')}<section class="card"><h3>주간 메모</h3>${noteBox(wk, '이번 주 회고, 메모…')}</section></div>
  </div>`;
}

function monthView() {
  const grid = S.monthGrid(ui.date), mk = S.monthKey(ui.date), t = S.today();
  const sel = ui.date;
  const selItems = S.itemsOn(records, sel);
  return `<div class="month-layout">
    <section class="card month">
      <div class="mhead">${S.DOW.map((w, i) => `<span class="${i >= 5 ? 'weekend' : ''}">${w}</span>`).join('')}</div>
      <div class="mgrid">${grid.map((d, i) => {
        const items = S.itemsOn(records, d);
        const cls = [S.monthKey(d) !== mk && 'out', d === t && 'today', d === sel && 'sel', i % 7 >= 5 && 'weekend'].filter(Boolean).join(' ');
        return `<button class="mcell ${cls}" data-pick="${d}"><span class="num">${Number(d.slice(8))}</span>
          <span class="chips">${items.slice(0, 3).map((it) => `<span class="mchip ${S.isDone(it, d) ? 'done' : ''}" style="--c:${it.color || COLORS[0]}">${esc(it.title)}</span>`).join('')}${items.length > 3 ? `<span class="more">+${items.length - 3}</span>` : ''}</span>
          <span class="dots">${items.slice(0, 4).map((it) => `<i style="--c:${it.color || COLORS[0]}"></i>`).join('')}</span></button>`;
      }).join('')}</div>
    </section>
    <div class="side">
      <section class="card agenda"><h3 data-goto="${sel}">${Number(sel.slice(5, 7))}월 ${Number(sel.slice(8))}일 ${S.dowOf(sel)} <span class="go">일간 보기 ›</span></h3>
        <ul class="list">${selItems.map((it) => itemRow(it, sel)).join('') || '<li class="empty">일정이 없어요</li>'}</ul>${quickAdd(sel, 'qa-month')}</section>
      ${goals('m:' + mk, '이번 달 목표')}
      <section class="card"><h3>월간 메모</h3>${noteBox('m:' + mk, '이번 달 메모…')}</section>
    </div>
  </div>`;
}

// ---------- 렌더 ----------
function render() {
  const a = document.activeElement, focusId = a && a.id, sel = a && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
  const typing = a && a.dataset && a.dataset.note ? a.value : null;
  $('#label').innerHTML = labelText();
  document.querySelectorAll('#views button').forEach((b) => b.setAttribute('aria-selected', b.dataset.view === ui.view));
  $('#main').innerHTML = ui.view === 'day' ? dayView() : ui.view === 'week' ? weekView() : monthView();
  $('#main').dataset.view = ui.view;
  if (focusId) { const el = document.getElementById(focusId); if (el) { if (typing !== null) el.value = typing; el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(...sel); } catch {} } }
  document.querySelectorAll('textarea.memo').forEach(autoGrow);
}
function autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.max(80, el.scrollHeight + 2) + 'px'; }

function renderSync() {
  const dot = $('#syncDot'), s = syncState;
  const map = { off: ['', '이 기기에만 저장 중'], signedOut: ['warn', '로그인하면 동기화됩니다'], syncing: ['busy', '동기화 중…'], synced: ['ok', '동기화됨'], offline: ['warn', '오프라인 — 연결되면 자동 동기화'], error: ['err', '동기화 오류: ' + (s.message || '')] };
  const [cls, txt] = map[s.state] || map.off;
  dot.className = 'sync-dot ' + cls; dot.title = txt;
  $('#syncText').textContent = sync.enabled ? (s.email ? `${s.email} · ${txt}` : txt) : '동기화가 아직 설정되지 않아 이 기기에만 저장됩니다. README의 "동기화 켜기"를 따라 Firebase 설정을 넣으면 폰·PC가 같은 데이터를 씁니다.';
  const btn = $('#authBtn');
  btn.hidden = !sync.enabled;
  btn.textContent = s.email ? '로그아웃' : 'Google로 로그인';
}

// ---------- 편집 시트 ----------
const dlg = $('#editDlg'), form = $('#editForm');
let editing = null, editType = 'task', editColor = COLORS[0];
$('#swatches').innerHTML = COLORS.map((c) => `<button type="button" data-color="${c}" style="--c:${c}" aria-label="색"></button>`).join('');

function openEdit(id, preset = {}) {
  const it = id ? records[id] : { id: null, type: 'task', date: ui.date, repeat: 'none', color: COLORS[0], ...preset };
  editing = id; editType = it.type; editColor = it.color || COLORS[0];
  form.title.value = it.title || ''; form.date.value = it.date; form.time.value = it.time || '';
  form.repeat.value = it.repeat || 'none'; form.until.value = it.until || ''; form.note.value = it.note || '';
  $('#delBtn').hidden = !id;
  syncEditUI(); dlg.showModal();
  if (!id) setTimeout(() => form.title.focus(), 50);
}
function syncEditUI() {
  document.querySelectorAll('#typeSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.type === editType));
  document.querySelectorAll('#swatches button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.color === editColor));
  $('.until').hidden = form.repeat.value === 'none';
}
$('#typeSeg').onclick = (e) => { const b = e.target.closest('button'); if (b) { editType = b.dataset.type; syncEditUI(); } };
$('#swatches').onclick = (e) => { const b = e.target.closest('button'); if (b) { editColor = b.dataset.color; syncEditUI(); } };
form.repeat.onchange = syncEditUI;
form.onsubmit = (e) => {
  e.preventDefault();
  const title = form.title.value.trim(); if (!title) return;
  const base = editing ? records[editing] : { id: S.uid(), kind: 'item', done: false, doneDates: [] };
  put({ ...base, title, type: editType, date: form.date.value, time: form.time.value || '', repeat: form.repeat.value, until: form.repeat.value === 'none' ? '' : form.until.value, color: editColor, note: form.note.value.trim() });
  dlg.close(); render();
};
$('#delBtn').onclick = () => {
  const it = records[editing];
  if (it.repeat && it.repeat !== 'none' && !confirm('반복 항목 전체를 삭제할까요?')) return;
  remove(editing); dlg.close(); render(); toast('삭제했어요', () => { put({ ...records[it.id], deleted: false }); render(); });
};

// 빠른 입력: "14:00 회의", "9시 운동", "오후 3시 미팅"
function parseQuick(text) {
  let time = '', m;
  if ((m = text.match(/^(\d{1,2}):(\d{2})\s+(.+)$/))) { time = `${S.pad(+m[1])}:${m[2]}`; text = m[3]; }
  else if ((m = text.match(/^(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분|\s*반)?\s+(.+)$/))) {
    let h = +m[2]; if (m[1] === '오후' && h < 12) h += 12; if (m[1] === '오전' && h === 12) h = 0;
    const min = m[0].includes('반') ? 30 : +(m[3] || 0);
    if (h < 24 && min < 60) { time = `${S.pad(h)}:${S.pad(min)}`; text = m[4]; }
  }
  return { title: text.trim(), time, type: time ? 'event' : 'task' };
}

// ---------- 이벤트 ----------
function go(n) {
  ui.date = ui.view === 'day' ? S.addDays(ui.date, n) : ui.view === 'week' ? S.addDays(ui.date, 7 * n) : S.addMonths(ui.date, n);
  render();
}
function setView(v) { ui.view = v; saveUI(); render(); scrollTo(0, 0); }
$('#prev').onclick = () => go(-1); $('#next').onclick = () => go(1);
$('#todayBtn').onclick = () => { ui.date = S.today(); render(); };
$('#views').onclick = (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); };
$('#fab').onclick = () => openEdit(null);

const main = $('#main');
main.addEventListener('click', (e) => {
  const t = e.target;
  let el;
  if ((el = t.closest('[data-toggle]'))) { const it = records[el.dataset.toggle]; put(S.toggleDone(it, el.dataset.date)); render(); return; }
  if ((el = t.closest('[data-carry]'))) { put({ ...records[el.dataset.carry], date: S.today() }); render(); return; }
  if (t.closest('[data-carry-all]')) { S.overdue(records, S.today()).forEach((i) => put({ ...i, date: S.today() })); render(); return; }
  if ((el = t.closest('[data-goal]'))) { const g = records[el.dataset.goal]; put({ ...g, done: !g.done }); render(); return; }
  if ((el = t.closest('[data-goal-del]'))) { const g = records[el.dataset.goalDel]; remove(g.id); render(); toast('목표를 지웠어요', () => { put({ ...records[g.id], deleted: false }); render(); }); return; }
  if ((el = t.closest('[data-goal-edit]'))) { const g = records[el.dataset.goalEdit]; const v = prompt('목표 수정', g.text); if (v && v.trim()) { put({ ...g, text: v.trim() }); render(); } return; }
  if ((el = t.closest('[data-goto]'))) { ui.date = el.dataset.goto; setView('day'); return; }
  if ((el = t.closest('[data-pick]'))) {
    if (ui.date === el.dataset.pick && matchMedia('(min-width: 900px)').matches) { setView('day'); return; }
    ui.date = el.dataset.pick; render(); return;
  }
  if ((el = t.closest('[data-edit]'))) { openEdit(el.dataset.edit); }
});
main.addEventListener('dblclick', (e) => { const el = e.target.closest('[data-pick]'); if (el) { ui.date = el.dataset.pick; setView('day'); } });
main.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, input = f.querySelector('input'), v = input.value.trim();
  if (!v) return;
  if (f.dataset.add) {
    const q = parseQuick(v);
    const n = S.itemsOn(records, f.dataset.add).length;
    put({ id: S.uid(), kind: 'item', ...q, date: f.dataset.add, repeat: 'none', color: q.type === 'event' ? COLORS[1] : COLORS[0], note: '', done: false, doneDates: [], order: n });
  } else if (f.dataset.goalAdd) {
    put({ id: S.uid(), kind: 'goal', scope: f.dataset.goalAdd, text: v, done: false, order: S.goalsOf(records, f.dataset.goalAdd).length });
  }
  input.value = ''; render();
});
main.addEventListener('input', (e) => {
  const el = e.target; if (!el.dataset.note) return;
  autoGrow(el);
  const id = 'note:' + el.dataset.note;
  put({ id, kind: 'note', text: el.value });
});

document.querySelectorAll('dialog').forEach((d) => {
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
});

// 검색
$('#searchBtn').onclick = () => { $('#searchDlg').showModal(); $('#q').value = ''; $('#results').innerHTML = ''; setTimeout(() => $('#q').focus(), 50); };
$('#q').oninput = () => {
  const res = S.search(records, $('#q').value);
  $('#results').innerHTML = res.map((r) => {
    const date = r.date || (r.scope ? r.scope.slice(2) : r.id.replace(/^note:\w:/, ''));
    const kind = r.kind === 'goal' ? '목표' : r.kind === 'note' ? '메모' : r.type === 'event' ? '일정' : '할 일';
    const text = r.title || r.text || '';
    return `<li data-res="${r.id}" data-date="${date.length === 7 ? date + '-01' : date}"><span class="k">${kind}</span><span class="t">${esc(text.slice(0, 80))}</span><span class="d">${date}</span></li>`;
  }).join('') || ($('#q').value ? '<li class="empty">결과 없음</li>' : '');
};
$('#results').onclick = (e) => {
  const li = e.target.closest('[data-res]'); if (!li) return;
  const r = records[li.dataset.res]; ui.date = li.dataset.date;
  $('#searchDlg').close();
  if (r.kind === 'item') { setView('day'); openEdit(r.id); } else setView(r.id.startsWith('note:w') || (r.scope || '').startsWith('w') ? 'week' : r.id.startsWith('note:m') || (r.scope || '').startsWith('m') ? 'month' : 'day');
};

// 설정
$('#settingsBtn').onclick = () => { renderSync(); syncTheme(); $('#settingsDlg').showModal(); };
$('#authBtn').onclick = async () => { try { syncState.email ? await sync.signOut() : await sync.signIn(); } catch (e) { toast('로그인 실패: ' + (e.code || e.message)); } };
$('#themeSeg').onclick = (e) => { const b = e.target.closest('button'); if (b) { ui.theme = b.dataset.theme; saveUI(); syncTheme(); } };
function syncTheme() {
  document.documentElement.dataset.theme = ui.theme;
  document.querySelectorAll('#themeSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.theme === ui.theme));
}
$('#exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify({ app: 'planner', version: 1, exportedAt: new Date().toISOString(), records }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `planner-${S.today()}.json`; a.click(); URL.revokeObjectURL(a.href);
};
$('#importFile').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const incoming = S.validateImport(JSON.parse(await f.text()));
    const before = JSON.stringify(records);
    records = S.merge(records, incoming); persist();
    Object.values(incoming).forEach((r) => records[r.id] === r && sync.push(r));
    render(); toast(`가져오기 완료 (${Object.keys(incoming).length}개 확인)`);
    if (before === JSON.stringify(records)) toast('새로 바뀐 항목은 없어요');
  } catch (err) { toast('가져오기 실패: ' + err.message); }
  e.target.value = '';
};

// 단축키
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, dialog') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowleft') go(-1); else if (k === 'arrowright') go(1);
  else if (k === 't') { ui.date = S.today(); render(); }
  else if (k === 'd') setView('day'); else if (k === 'w') setView('week'); else if (k === 'm') setView('month');
  else if (k === 'n') { e.preventDefault(); openEdit(null); }
  else if (k === '/') { e.preventDefault(); $('#searchBtn').click(); }
});

// 모바일 좌우 스와이프로 이동
let sx = null, sy = 0;
main.addEventListener('touchstart', (e) => { if (e.target.closest('input,textarea')) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
main.addEventListener('touchend', (e) => {
  if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) go(dx < 0 ? 1 : -1);
});

let toastTimer;
function toast(msg, undo) {
  const t = $('#toast');
  t.innerHTML = esc(msg) + (undo ? ' <button>되돌리기</button>' : '');
  if (undo) t.querySelector('button').onclick = () => { undo(); t.classList.remove('show'); };
  t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
}

// 다른 탭에서 바뀐 경우 반영
addEventListener('storage', (e) => { if (e.key === KEY) { records = S.merge(records, load()); render(); } });
// 자정 넘김/앱 복귀 시 오늘 갱신
let lastToday = S.today();
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.today() !== lastToday) { if (ui.date === lastToday) ui.date = S.today(); lastToday = S.today(); render(); } });

records = S.compact(records); persist();
syncTheme(); render(); renderSync(); sync.start();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
