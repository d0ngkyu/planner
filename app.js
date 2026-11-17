import * as S from './store.js';
import { createSync } from './sync.js';
import * as ACH from './achievements.js';
import * as X from './extras.js';
import { enableDrag } from './drag.js';
import { createTimer } from './timer.js';
import { native } from './platform.js';

const KEY = 'planner.records.v1';
const UIKEY = 'planner.ui.v1';
const COLORS = ['#3b6e5c', '#3b6fd8', '#d0544b', '#d99a2b', '#8a5cc7', '#6b7280'];
const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let records = load();
let navAnim = 'fade', fxKey = null, addedId = null, barPrev = null, lastBarDate = null;
const ui = Object.assign({ view: 'day', date: S.today(), theme: 'system' }, safeJSON(localStorage.getItem(UIKEY)) || {});
ui.date = S.today(); // 열 때는 항상 오늘부터

function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }
function load() { return safeJSON(localStorage.getItem(KEY)) || {}; }
let saveTimer;
function flushRecords() { clearTimeout(saveTimer); localStorage.setItem(KEY, JSON.stringify(records)); }
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { flushRecords(); native?.reschedule().catch((e) => toast('알림 예약 실패: ' + e.message)); }, 150); }
window.addEventListener('planner-flush', flushRecords);
window.addEventListener('pagehide', flushRecords);
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
  onStatus(s) { syncState = s; renderSync(); renderPush(); },
  onSettings(st) { pushSettings = st; renderPush(); },
});
let pushSettings = null;

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
  if (ui.view === 'stats') { const days = S.weekDays(d); return `기록 <small>${fmtMD(days[0])} – ${fmtMD(days[6])} 주</small>`; }
  return `${d.slice(0, 4)}년 ${Number(d.slice(5, 7))}월`;
}

function itemRow(it, date, compact = false, actions = false) {
  const done = S.isDone(it, date), single = (it.repeat || 'none') === 'none';
  const rep = (it.repeat && it.repeat !== 'none' ? '<span class="rep" title="반복">↻</span>' : '') + (it.time && it.remind >= 0 && !compact ? '<span class="bell" title="알림">🔔</span>' : '');
  const mark = it.type === 'task'
    ? `<button class="check ${done ? 'on' : ''}" data-toggle="${it.id}" data-date="${date}" aria-label="완료" style="--c:${it.color || COLORS[0]}"></button>`
    : `<span class="ev" style="--c:${it.color || COLORS[1]}"></span>`;
  const fxc = fxKey === it.id + '@' + date ? (done ? 'just-done' : 'just-undone') : addedId === it.id ? 'pop-in' : '';
  const pp = it.postponed ? `<span class="pp ${it.postponed >= 3 ? 'hot' : ''}" title="미룬 횟수">↷${it.postponed}</span>` : '';
  const acts = actions && it.type === 'task' && !done ? `<span class="acts"><button class="act" data-focus="${it.id}" title="집중 시작" aria-label="집중 시작">▶</button>${single ? `<button class="act" data-postpone="${it.id}" title="내일로 미루기" aria-label="내일로">↷</button>` : ''}</span>` : '';
  return `<li class="item ${done ? 'done' : ''} ${compact ? 'compact' : ''} ${fxc}" data-edit="${it.id}" data-date="${date}" ${single ? `data-drag="${it.id}"` : ''} style="--c:${it.color || COLORS[0]}">
    ${mark}${it.time ? `<span class="time">${it.time}${it.end && !compact ? '–' + it.end : ''}</span>` : ''}<span class="t"><span class="tx">${esc(it.title)}</span></span>${rep}${pp}${!compact && it.note ? '<span class="has-note">✎</span>' : ''}${acts}
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
    <ul>${list.map((g) => `<li class="goal ${g.done ? 'done' : ''} ${addedId === g.id ? 'pop-in' : ''}"><button class="check ${g.done ? 'on' : ''}" data-goal="${g.id}" aria-label="완료"></button><span class="t" data-goal-edit="${g.id}">${esc(g.text)}</span><button class="x" data-goal-del="${g.id}" aria-label="삭제">✕</button></li>`).join('')}</ul>
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
      <h3>할 일 · 일정 ${tasks.length ? `<span class="count">${doneN}/${tasks.length}</span>` : ''}<button class="chip" data-routine-open>＋ 루틴</button></h3>
      ${tasks.length ? `<div class="bar"><i data-pct="${(doneN / tasks.length) * 100}" style="width:${barPrev ?? (doneN / tasks.length) * 100}%"></i></div>` : ''}
      <ul class="list">${items.map((i) => itemRow(i, d, false, true)).join('') || '<li class="empty">비어 있어요. 아래에서 추가하거나 루틴을 넣어 보세요.</li>'}</ul>
      ${quickAdd(d, 'qa-day')}
    </section>
    ${hintCard(d)}
    ${od.length ? `<section class="card overdue"><h3>밀린 할 일 <span class="count">${od.length}</span><button class="chip" data-carry-all>모두 오늘로</button></h3>
      <ul class="list">${od.map((i) => `<li class="item" data-edit="${i.id}" data-date="${i.date}"><button class="check" data-toggle="${i.id}" data-date="${i.date}" style="--c:${i.color || COLORS[0]}"></button><span class="time">${fmtMD(i.date)}</span><span class="t">${esc(i.title)}</span><button class="chip" data-carry="${i.id}">오늘로</button></li>`).join('')}</ul></section>` : ''}
    ${d <= S.today() ? moodCard(d) : ''}
    <section class="card"><h3>오늘의 메모</h3>${noteBox('d:' + d, '생각, 기록, 회고…')}</section>
  </div>`;
}

let splitting = null;
function hintCard(d) {
  const hs = X.postponeHints(records, d); if (!hs.length) return '';
  const h = hs[0];
  return `<section class="card hint"><h3>💡 너무 큰 일일지도 몰라요</h3>
    <p>「${esc(h.title)}」을(를) <b>${h.postponed}번</b> 미뤘어요. 5~15분짜리 작은 단계로 쪼개 볼까요?</p>
    ${splitting === h.id ? `<form class="split" data-split="${h.id}"><textarea id="splitTa" rows="3" placeholder="한 줄에 한 단계씩&#10;예: 자료 폴더 열기&#10;첫 문단만 쓰기"></textarea><div class="row-btns"><button class="primary">쪼개서 오늘 할 일로</button><button type="button" data-split-cancel>취소</button></div></form>`
      : `<div class="row-btns"><button class="primary" data-split-open="${h.id}">쪼개기</button><button data-focus="${h.id}">▶ 10분만 해 보기</button></div>`}
  </section>`;
}
const MOODS = ['😣', '😕', '😐', '🙂', '😄'];
function moodCard(d) {
  const m = X.moodOf(records, d) || {};
  const row = (k, label, icons) => `<div class="mood-row"><span>${label}</span>${icons.map((ic, i) => `<button class="mood ${m[k] === i + 1 ? 'on' : ''}" data-mood="${k}" data-v="${i + 1}" aria-label="${label} ${i + 1}">${ic}</button>`).join('')}</div>`;
  return `<section class="card"><h3>${d === S.today() ? '오늘' : '그날'} 컨디션 ${m.mood ? '<span class="count">기록됨</span>' : ''}</h3>
    ${row('mood', '기분', MOODS)}${row('energy', '에너지', ['▁', '▂', '▄', '▆', '█'])}</section>`;
}

function weekView() {
  const days = S.weekDays(ui.date), t = S.today(), wk = S.weekKey(ui.date);
  return `<div class="week-layout">
    <div class="week-grid">${days.map((d, i) => {
      const items = S.itemsOn(records, d);
      return `<section class="card wday ${d === t ? 'today' : ''} ${i >= 5 ? 'weekend' : ''}" data-drop="${d}">
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
        return `<button class="mcell ${cls}" data-pick="${d}" data-drop="${d}"><span class="num">${Number(d.slice(8))}</span>
          <span class="chips">${items.slice(0, 3).map((it) => `<span class="mchip ${S.isDone(it, d) ? 'done' : ''}" ${(it.repeat || 'none') === 'none' ? `data-drag="${it.id}" data-date="${d}"` : ''} style="--c:${it.color || COLORS[0]}">${esc(it.title)}</span>`).join('')}${items.length > 3 ? `<span class="more">+${items.length - 3}</span>` : ''}</span>
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

function statsView() {
  const today = S.today(), heat = X.heatmap(records, today, 20), rep = X.weekReport(records, ui.date, today);
  const st = stats || ACH.computeStats(records, today);
  const total = heat.flat().reduce((a, c) => a + c.n, 0);
  const pct = rep.rate == null ? '–' : Math.round(rep.rate * 100) + '%';
  const months = heat.map((w, i) => { const m = Number(w[0].date.slice(5, 7)); return i === 0 || Number(heat[i - 1][0].date.slice(5, 7)) !== m ? `<span style="grid-column:${i + 1}">${m}월</span>` : ''; }).join('');
  return `<div class="stats-layout">
    <section class="card heat"><h3>실행 잔디 <span class="count">최근 20주 · ${total}개 완료</span></h3>
      <div class="heat-wrap"><div class="heat-months" style="grid-template-columns:repeat(${heat.length},1fr)">${months}</div>
      <div class="heat-grid" style="grid-template-columns:repeat(${heat.length},1fr)">${heat.map((w) => w.map((c) => `<button class="hc l${c.lv}" ${c.lv >= 0 ? `data-goto="${c.date}"` : 'disabled'} title="${c.date} · ${c.n}개"></button>`).join('')).join('')}</div></div>
      <div class="heat-foot"><span>🔥 연속 <b>${st.streak}일</b> · 최고 ${st.bestStreak}일</span><span class="legend">적음 ${[0, 1, 2, 3, 4].map((l) => `<i class="hc l${l}"></i>`).join('')} 많음</span></div>
    </section>
    <section class="card report"><h3>주간 리포트 <button class="chip" data-share>공유</button></h3>
      <div class="rep-top"><div class="big">${pct}<small>실행률</small></div>
        <div class="rep-kv"><span>완료 <b>${rep.done}/${rep.total}</b></span><span>집중 <b>${Math.floor(rep.focus / 60)}시간 ${rep.focus % 60}분</b></span>
        <span>컨디션 <b>${rep.mood == null ? '–' : `${MOODS[Math.round(rep.mood) - 1]} ${rep.mood}`}</b></span><span>최고의 날 <b>${rep.best ? rep.best.dow + '요일' : '–'}</b></span></div></div>
      <div class="rep-bars">${rep.perDay.map((d) => `<div class="rb ${d.future ? 'fut' : ''}" data-goto="${d.date}"><div class="rb-col"><i style="height:${d.rate == null ? 0 : Math.max(6, d.rate * 100)}%"></i></div><span>${d.dow}</span><small>${d.total ? `${d.done}/${d.total}` : ''}</small></div>`).join('')}</div>
      ${rep.procrastinated.length ? `<p class="muted small">↷ 자주 미룬 일: ${rep.procrastinated.map((t) => `${esc(t.title)}(${t.postponed})`).join(', ')}</p>` : ''}
    </section>
    <section class="card"><h3>컨디션 <span class="count">최근 14일</span></h3>${moodChart(X.moodSeries(records, today, 14))}</section>
    <section class="card"><h3>집중 기록 <span class="count">이번 주 ${rep.focus}분</span></h3>
      <ul class="list">${Object.values(records).filter((r) => r.kind === 'focus' && !r.deleted && r.date >= rep.from && r.date <= rep.to).sort((a, b) => b.at - a.at).slice(0, 8).map((f) => `<li class="item compact"><span class="time">${fmtMD(f.date)}</span><span class="t">${esc(f.title || '집중')}</span><span class="time">${f.minutes}분</span></li>`).join('') || '<li class="empty">할 일의 ▶ 버튼으로 집중을 시작해 보세요.</li>'}</ul>
    </section>
  </div>`;
}
function moodChart(series) {
  const W = 560, H = 150, px = (i) => 24 + (i * (W - 40)) / (series.length - 1), py = (v) => 12 + ((5 - v) * (H - 40)) / 4;
  const line = (k, cls) => {
    const segs = []; let cur = [];
    series.forEach((d, i) => { if (d[k] == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([px(i), py(d[k])]); });
    if (cur.length) segs.push(cur);
    return segs.map((sg) => sg.length > 1 ? `<polyline class="${cls}" points="${sg.map((p) => p.join(',')).join(' ')}"/>` : '').join('') + series.map((d, i) => d[k] == null ? '' : `<circle class="${cls}" cx="${px(i)}" cy="${py(d[k])}" r="3.5"/>`).join('');
  };
  if (!series.some((d) => d.mood != null || d.energy != null)) return '<p class="empty">일간 화면에서 기분·에너지를 기록하면 그래프가 그려져요.</p>';
  return `<svg class="mood-chart" viewBox="0 0 ${W} ${H}">${[1, 3, 5].map((v) => `<line x1="20" x2="${W - 12}" y1="${py(v)}" y2="${py(v)}" class="grid"/><text x="4" y="${py(v) + 4}">${v}</text>`).join('')}
    ${line('mood', 'm')}${line('energy', 'e')}${series.map((d, i) => i % 2 === series.length % 2 ? '' : `<text x="${px(i)}" y="${H - 6}" text-anchor="middle">${Number(d.date.slice(8))}</text>`).join('')}</svg>
    <div class="chart-legend"><span><i class="m"></i>기분</span><span><i class="e"></i>에너지</span></div>`;
}

// ---------- 렌더 ----------
function render() {
  const a = document.activeElement, focusId = a && a.id, sel = a && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
  const typing = a && a.dataset && a.dataset.note ? a.value : null;
  $('#label').innerHTML = labelText();
  $('#dockDate').textContent = `${ui.date === S.today() ? '오늘' : fmtMD(ui.date)}에 추가`;
  document.querySelectorAll('#views button').forEach((b) => b.setAttribute('aria-selected', b.dataset.view === ui.view));
  const m = $('#main');
  m.innerHTML = ui.view === 'day' ? dayView() : ui.view === 'week' ? weekView() : ui.view === 'stats' ? statsView() : monthView();
  m.dataset.view = ui.view;
  if (navAnim) { m.classList.remove('anim-next', 'anim-prev', 'anim-fade'); void m.offsetWidth; m.classList.add('anim-' + navAnim); navAnim = null; }
  const bar = m.querySelector('.bar i[data-pct]');
  if (bar) { requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = bar.dataset.pct + '%'; })); barPrev = Number(bar.dataset.pct); } else barPrev = null;
  fxKey = null; addedId = null;
  scheduleAch();
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
  if (native) $('#syncText').textContent = '현재 이 휴대폰에 저장됩니다. 폰·PC 동기화는 추후 연결합니다. 기존 웹 데이터는 JSON 백업 파일로 가져올 수 있어요.';
  const btn = $('#authBtn');
  btn.hidden = false; btn.disabled = !sync.enabled;
  btn.textContent = !sync.enabled ? '동기화 준비 중' : s.email ? '로그아웃' : 'Google로 로그인';
  $('#syncBadge').textContent = !sync.enabled ? '미연결' : s.email ? '연결됨' : '로그인 필요';
}

// ---------- 편집 시트 ----------
const dlg = $('#editDlg'), form = $('#editForm');
let editing = null, editType = 'task', editColor = COLORS[0];
$('#swatches').innerHTML = COLORS.map((c) => `<button type="button" data-color="${c}" style="--c:${c}" aria-label="색"></button>`).join('');

function openEdit(id, preset = {}) {
  const it = id ? records[id] : { id: null, type: 'task', date: ui.date, repeat: 'none', color: COLORS[0], ...preset };
  editing = id; editType = it.type; editColor = it.color || COLORS[0];
  form.title.value = it.title || ''; form.date.value = it.date; form.time.value = it.time || ''; form.end.value = it.end || '';
  form.repeat.value = it.repeat || 'none'; form.until.value = it.until || ''; form.note.value = it.note || '';
  form.remind.value = String(it.remind ?? (it.time ? 0 : -1));
  $('#delBtn').hidden = !id;
  $('#taskActs').hidden = !id || it.type !== 'task' || S.isDone(it, ui.date);
  $('#postponeBtn').hidden = (it.repeat || 'none') !== 'none';
  syncEditUI(); dlg.showModal();
  if (!id) setTimeout(() => form.title.focus(), 50);
}
function syncEditUI() {
  document.querySelectorAll('#typeSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.type === editType));
  document.querySelectorAll('#swatches button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.color === editColor));
  $('.until').hidden = form.repeat.value === 'none';
  $('.remind').hidden = !form.time.value; $('.endl').hidden = !form.time.value;
}
$('#typeSeg').onclick = (e) => { const b = e.target.closest('button'); if (b) { editType = b.dataset.type; syncEditUI(); } };
$('#swatches').onclick = (e) => { const b = e.target.closest('button'); if (b) { editColor = b.dataset.color; syncEditUI(); } };
form.repeat.onchange = syncEditUI;
form.time.oninput = () => { if (form.time.value && form.remind.value === '-1' && !editing) form.remind.value = '0'; syncEditUI(); };
form.onsubmit = (e) => {
  e.preventDefault();
  const title = form.title.value.trim(); if (!title) return;
  const base = editing ? records[editing] : { id: S.uid(), kind: 'item', done: false, doneDates: [] };
  const saved = put({ ...base, title, type: editType, date: form.date.value, time: form.time.value || '', end: form.time.value ? form.end.value : '', repeat: form.repeat.value, until: form.repeat.value === 'none' ? '' : form.until.value, color: editColor, note: form.note.value.trim(), remind: form.time.value ? Number(form.remind.value) : -1 });
  if (!editing) addedId = saved.id;
  dlg.close(); render();
};
$('#delBtn').onclick = () => {
  const it = records[editing];
  if (it.repeat && it.repeat !== 'none' && !confirm('반복 항목 전체를 삭제할까요?')) return;
  remove(editing); dlg.close(); render(); toast('삭제했어요', () => { put({ ...records[it.id], deleted: false }); render(); });
};

$('#focusBtn').onclick = () => { const id = editing; dlg.close(); openFocus(id); };
$('#postponeBtn').onclick = () => { const id = editing; dlg.close(); postpone(id); };
function postpone(id) {
  const it = records[id], base = it.date < S.today() ? S.today() : it.date, to = S.addDays(base, 1);
  put({ ...it, date: to, postponed: (it.postponed || 0) + 1 }); render();
  toast(`내일(${fmtMD(to)})로 미뤘어요 · ${(it.postponed || 0) + 1}번째`, () => { put({ ...records[id], date: it.date, postponed: it.postponed || 0 }); render(); });
}

// 빠른 입력: "14:00 회의", "9시 운동", "오후 3시 미팅"
function parseQuick(text) {
  let time = '', m;
  let end = '';
  if ((m = text.match(/^(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})\s+(.+)$/))) { time = `${S.pad(+m[1])}:${m[2]}`; end = `${S.pad(+m[3])}:${m[4]}`; text = m[5]; }
  else if ((m = text.match(/^(\d{1,2}):(\d{2})\s+(.+)$/))) { time = `${S.pad(+m[1])}:${m[2]}`; text = m[3]; }
  else if ((m = text.match(/^(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분|\s*반)?\s+(.+)$/))) {
    let h = +m[2]; if (m[1] === '오후' && h < 12) h += 12; if (m[1] === '오전' && h === 12) h = 0;
    const min = m[0].includes('반') ? 30 : +(m[3] || 0);
    if (h < 24 && min < 60) { time = `${S.pad(h)}:${S.pad(min)}`; text = m[4]; }
  }
  return { title: text.trim(), time, end, type: time ? 'event' : 'task' };
}

// ---------- 이벤트 ----------
function go(n) {
  navAnim = n > 0 ? 'next' : 'prev'; barPrev = null;
  ui.date = ui.view === 'day' ? S.addDays(ui.date, n) : ui.view === 'week' || ui.view === 'stats' ? S.addDays(ui.date, 7 * n) : S.addMonths(ui.date, n);
  render();
}
function setView(v) { navAnim = 'fade'; barPrev = null; ui.view = v; saveUI(); render(); scrollTo(0, 0); }
$('#prev').onclick = () => go(-1); $('#next').onclick = () => go(1);
$('#todayBtn').onclick = () => { navAnim = 'fade'; barPrev = null; ui.date = S.today(); render(); };
$('#views').onclick = (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); };
$('#fab').onclick = () => openEdit(null);
function addQuickItem(value, date) {
  const q = parseQuick(value);
  addedId = put({ id: S.uid(), kind: 'item', ...q, date, repeat: 'none', color: q.type === 'event' ? COLORS[1] : COLORS[0], note: '', done: false, doneDates: [], order: S.itemsOn(records, date).length, remind: q.time ? 0 : -1 }).id;
}
$('#quickDock').onsubmit = (e) => {
  e.preventDefault();
  const input = $('#dockInput'), value = input.value.trim();
  if (!value) { input.focus(); return; }
  addQuickItem(value, ui.date); input.value = ''; ui.view = 'day'; saveUI(); render();
  toast(`${fmtMD(ui.date)}에 추가했어요`);
};

const main = $('#main');
main.addEventListener('click', (e) => {
  const t = e.target;
  let el;
  if ((el = t.closest('[data-toggle]'))) {
    const it = records[el.dataset.toggle], d = el.dataset.date, nu = put(S.toggleDone(it, d));
    fxKey = it.id + '@' + d; if (ui.view !== 'day' || d !== ui.date) barPrev = null;
    render();
    if (S.isDone(nu, d)) {
      const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 14);
      const ts = S.itemsOn(records, d).filter((i) => i.type === 'task');
      if (ts.length >= 1 && ts.every((i) => S.isDone(i, d))) { confetti(); toast(d === S.today() ? '오늘 할 일 모두 완료! 🎉' : '그날 할 일 모두 완료!'); }
    }
    return;
  }
  if ((el = t.closest('[data-carry]'))) { const i = records[el.dataset.carry]; put({ ...i, date: S.today(), postponed: (i.postponed || 0) + 1 }); render(); return; }
  if (t.closest('[data-carry-all]')) { S.overdue(records, S.today()).forEach((i) => put({ ...i, date: S.today(), postponed: (i.postponed || 0) + 1 })); render(); return; }
  if ((el = t.closest('[data-focus]'))) { openFocus(el.dataset.focus); return; }
  if ((el = t.closest('[data-postpone]'))) { postpone(el.dataset.postpone); return; }
  if ((el = t.closest('[data-mood]'))) {
    const d = ui.date, cur = X.moodOf(records, d) || { id: 'mood:' + d, kind: 'mood', date: d };
    const v = Number(el.dataset.v), k = el.dataset.mood;
    put({ ...cur, deleted: false, [k]: cur[k] === v ? null : v }); render();
    const b = document.querySelector(`[data-mood="${k}"][data-v="${v}"]`); if (b) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 8); }
    return;
  }
  if ((el = t.closest('[data-split-open]'))) { splitting = el.dataset.splitOpen; render(); setTimeout(() => $('#splitTa')?.focus(), 30); return; }
  if (t.closest('[data-split-cancel]')) { splitting = null; render(); return; }
  if (t.closest('[data-routine-open]')) { openRoutines(); return; }
  if (t.closest('[data-share]')) { shareReport(); return; }
  if ((el = t.closest('[data-goal]'))) { const g = records[el.dataset.goal]; put({ ...g, done: !g.done }); const r = el.getBoundingClientRect(); render(); if (!g.done) burst(r.left + 10, r.top + 10, 18); return; }
  if ((el = t.closest('[data-goal-del]'))) { const g = records[el.dataset.goalDel]; remove(g.id); render(); toast('목표를 지웠어요', () => { put({ ...records[g.id], deleted: false }); render(); }); return; }
  if ((el = t.closest('[data-goal-edit]'))) { const g = records[el.dataset.goalEdit]; const v = prompt('목표 수정', g.text); if (v && v.trim()) { put({ ...g, text: v.trim() }); render(); } return; }
  if ((el = t.closest('[data-goto]'))) { ui.date = el.dataset.goto; setView('day'); return; }
  if ((el = t.closest('[data-pick]'))) {
    if (ui.date === el.dataset.pick && matchMedia('(min-width: 900px)').matches) { setView('day'); return; }
    ui.date = el.dataset.pick; render(); const a = document.querySelector('.agenda'); a && (a.classList.remove('flash'), void a.offsetWidth, a.classList.add('flash')); return;
  }
  if ((el = t.closest('[data-edit]'))) { openEdit(el.dataset.edit); }
});
main.addEventListener('dblclick', (e) => { const el = e.target.closest('[data-pick]'); if (el) { ui.date = el.dataset.pick; setView('day'); } });
main.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.dataset.split) {
    const orig = records[f.dataset.split], steps = X.parseSteps($('#splitTa').value);
    if (!steps.length) return;
    steps.forEach((st, i) => put({ id: S.uid(), kind: 'item', type: 'task', title: st.title, date: ui.date, time: st.time, end: '', repeat: 'none', color: orig.color || COLORS[0], note: `「${orig.title}」에서 쪼갬`, done: false, doneDates: [], order: i, remind: st.time ? 0 : -1 }));
    remove(orig.id); splitting = null; render(); confetti(40); toast(`${steps.length}단계로 쪼갰어요. 첫 단계부터!`);
    return;
  }
  const input = f.querySelector('input'), v = input.value.trim();
  if (!v) return;
  if (f.dataset.add) {
    addQuickItem(v, f.dataset.add);
  } else if (f.dataset.goalAdd) {
    addedId = put({ id: S.uid(), kind: 'goal', scope: f.dataset.goalAdd, text: v, done: false, order: S.goalsOf(records, f.dataset.goalAdd).length }).id;
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
$('#settingsBtn').onclick = () => { renderSync(); renderPush(); syncTheme(); $('#settingsDlg').showModal(); };
$('#authBtn').onclick = async () => { try { syncState.email ? await sync.signOut() : await sync.signIn(); } catch (e) { toast('로그인 실패: ' + (e.code || e.message)); } };
function renderPush() {
  if (native) {
    $('#pushBadge').textContent = native.granted ? '휴대폰 예약' : '권한 필요';
    $('#nagStatus').hidden = false;
    const st = native.settings;
    $('#pushText').textContent = native.granted
      ? '휴대폰 알림 사용 중 · 앞으로 30일/최대 400건을 예약하고 앱을 열면 갱신해요. 절전 상태에서는 늦을 수 있어요.'
      : '로그인 없이 휴대폰에 일정·집중 완료 알림을 예약해요. 알림 권한을 허용해 주세요.';
    $('#pushBtn').textContent = native.granted ? '알림 다시 연결' : '이 기기에서 알림 켜기';
    ['#pushBtn', '#pingBtn', '#morningAt', '#eveningAt'].forEach((q) => { $(q).disabled = false; });
    if (document.activeElement !== $('#morningAt')) $('#morningAt').value = st.morning;
    if (document.activeElement !== $('#eveningAt')) $('#eveningAt').value = st.evening;
    $('#nagOn').checked = false; $('#nagOn').disabled = true;
    $('#nagOn').closest('label').title = '앱 버전의 조건부 밤 재알림은 추후 연결합니다.';
    return;
  }
  const ok = sync.pushSupported(), on = !!localStorage.getItem('planner.pushDevice') && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  $('#pushBadge').textContent = !ok ? '미연결' : on ? '연결됨' : '설정 필요';
  $('#nagStatus').hidden = ok;
  const st = pushSettings || {};
  $('#pushText').textContent = !sync.enabled || !ok ? '알림은 동기화(Firebase) 설정과 웹 푸시 키를 넣은 뒤 쓸 수 있어요 (README "알림 켜기").'
    : !syncState.email ? 'Google로 로그인하면 알림을 켤 수 있어요.'
    : on ? '이 기기에서 알림을 받고 있어요.' : '이 기기는 아직 알림이 꺼져 있어요.';
  $('#pushBtn').textContent = on ? '알림 다시 연결' : '이 기기에서 알림 켜기';
  const can = ok && !!syncState.email;
  ['#pushBtn', '#pingBtn', '#morningAt', '#eveningAt', '#nagOn'].forEach((q) => { $(q).disabled = !can; });
  if (document.activeElement !== $('#morningAt')) $('#morningAt').value = st.morning ?? '08:00';
  if (document.activeElement !== $('#eveningAt')) $('#eveningAt').value = st.evening ?? '21:00';
  $('#nagOn').checked = st.nag !== false;
}
const saveCheckin = async () => {
  try { const settings = { morning: $('#morningAt').value, evening: $('#eveningAt').value, nag: $('#nagOn').checked }; await (native ? native.saveSettings(settings) : sync.saveSettings(settings)); toast('알림 시간을 저장했어요'); }
  catch (e) { toast(e.message); }
};
$('#morningAt').onchange = saveCheckin; $('#eveningAt').onchange = saveCheckin; $('#nagOn').onchange = saveCheckin;
$('#pushBtn').onclick = async () => {
  try { flushRecords(); await (native ? native.enable() : sync.enablePush()); if (!native && !pushSettings) await saveCheckin(); toast('알림을 켰어요. "테스트 알림"으로 확인해 보세요'); }
  catch (e) { toast(e.message); }
  renderPush();
};
$('#pingBtn').onclick = async () => { try { await (native ? native.ping() : sync.ping()); renderPush(); toast('테스트 알림을 보냈어요 (몇 초 걸릴 수 있어요)'); } catch (e) { toast(e.message); } };

$('#themeSeg').onclick = (e) => { const b = e.target.closest('button'); if (b) { ui.theme = b.dataset.theme; saveUI(); syncTheme(); } };
function syncTheme() {
  document.documentElement.dataset.theme = ui.theme; lastCos = ''; if (typeof renderMe === 'function' && stats) renderMe();
  document.querySelectorAll('#themeSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.theme === ui.theme));
}
$('#exportBtn').onclick = async () => {
  if (native) {
    try { await native.exportBackup(JSON.stringify({ app: 'planner', version: 1, exportedAt: new Date().toISOString(), records }, null, 1), `planner-${S.today()}.json`); }
    catch (e) { toast('백업 공유를 완료하지 못했어요: ' + e.message); }
    return;
  }
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
  else if (k === 'd') setView('day'); else if (k === 'w') setView('week'); else if (k === 'm') setView('month'); else if (k === 's') setView('stats');
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

// ---------- 효과 ----------
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const FXC = ['#2f6f5e', '#3b6fd8', '#d0544b', '#e6a92e', '#8a5cc7', '#43b58c', '#f07aa0'];
function burst(x, y, n = 12) {
  if (reduce.matches) return;
  const fx = $('#fx');
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'), a = (Math.PI * 2 * i) / n + Math.random() * .4, d = 24 + Math.random() * 26;
    p.className = 'spark'; p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;background:${FXC[i % FXC.length]}`;
    fx.appendChild(p); setTimeout(() => p.remove(), 700);
  }
}
function confetti(n = 70) {
  if (reduce.matches) return;
  const fx = $('#fx'), w = innerWidth;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'conf'; p.style.cssText = `left:${Math.random() * w}px;--x:${(Math.random() - .5) * 160}px;--r:${(Math.random() - .5) * 900}deg;--t:${1.4 + Math.random() * 1.2}s;--dl:${Math.random() * .25}s;background:${FXC[i % FXC.length]};${Math.random() > .5 ? 'border-radius:50%;' : ''}`;
    fx.appendChild(p); setTimeout(() => p.remove(), 3000);
  }
}

// ---------- 업적 ----------
const PID = 'profile';
const profile = () => { const p = records[PID]; return p && !p.deleted ? p : { id: PID, kind: 'profile', unlocked: {}, icon: 'base', theme: 'base', equippedTitle: '새내기 플래너' }; };
let achTimer, stats = null;
function scheduleAch() { clearTimeout(achTimer); achTimer = setTimeout(checkAch, 250); }
function checkAch() {
  stats = ACH.computeStats(records, S.today());
  const p = profile(), unlocked = { ...(p.unlocked || {}) }, fresh = [];
  for (const a of ACH.progress(stats)) if (a.done && !unlocked[a.id]) { unlocked[a.id] = Date.now(); fresh.push(a); }
  if (fresh.length) { put({ ...p, unlocked }); celebrate(fresh); }
  renderMe();
}
function renderMe() {
  const p = profile(), lv = stats ? ACH.level(stats) : { lv: 1, pct: 0 };
  $('#meIcon').innerHTML = ACH.iconSVG(p.icon, 32);
  $('#meTitle').textContent = p.equippedTitle || '새내기 플래너';
  $('#meLv').innerHTML = `Lv.${lv.lv} <span class="xp"><i style="width:${Math.round(lv.pct * 100)}%"></i></span>`;
  applyCosmetics(p);
}
let lastCos = '';
function applyCosmetics(p) {
  const key = p.icon + '|' + p.theme; if (key === lastCos) return; lastCos = key;
  const th = ACH.THEMES[p.theme] || ACH.THEMES.base, dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement.style;
  if (p.theme && p.theme !== 'base') { root.setProperty('--accent', dark ? th.dark : th.light); root.setProperty('--today', dark ? th.dark : th.light); root.setProperty('--accent-ink', dark ? '#111' : '#fff'); }
  else ['--accent', '--today', '--accent-ink'].forEach((v) => root.removeProperty(v));
  $('#favicon').href = 'data:image/svg+xml,' + encodeURIComponent(ACH.iconSVG(p.icon));
}
function celebrate(list) {
  const rw = (a) => [a.reward.title && `칭호 「${esc(a.reward.title)}」`, a.reward.icon && `아이콘 ${ACH.ICONS[a.reward.icon].emoji} ${ACH.ICONS[a.reward.icon].name}`, a.reward.theme && `테마 ${ACH.THEMES[a.reward.theme].name}`].filter(Boolean).join(' · ');
  const top = list[list.length - 1], icon = top.reward.icon || 'base';
  $('#celebBody').innerHTML = `<div class="celeb-icon">${ACH.iconSVG(icon, 88)}</div>
    <p class="celeb-k">업적 달성${list.length > 1 ? ` ×${list.length}` : ''}</p>
    ${list.slice(-4).map((a) => `<div class="celeb-row"><b>${esc(a.name)}</b><span>${rw(a) || '경험치 보너스'}</span></div>`).join('')}
    ${list.length > 4 ? `<p class="muted small">외 ${list.length - 4}개</p>` : ''}
    <p class="muted small">보상은 업적 화면에서 장착할 수 있어요.</p>`;
  const d = $('#celebDlg'); if (!d.open) d.showModal(); confetti(90);
  $('#meBtn').classList.add('glow'); setTimeout(() => $('#meBtn').classList.remove('glow'), 4000);
}
$('#celebMore').onclick = () => { $('#celebDlg').close(); openAch(); };
let achTab = 'list';
function openAch() { checkAchNow(); renderAch(); $('#achDlg').showModal(); }
function checkAchNow() { clearTimeout(achTimer); checkAch(); }
function renderAch() {
  const p = profile(), rw = ACH.rewardsOf(p.unlocked || {}), lv = ACH.level(stats), prog = ACH.progress(stats);
  const got = prog.filter((a) => (p.unlocked || {})[a.id]).length;
  const stat = (k, v) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`;
  const tabs = [['list', `미션 ${got}/${prog.length}`], ['title', '칭호'], ['icon', '아이콘'], ['theme', '테마']];
  let body = '';
  if (achTab === 'list') {
    const groups = [...new Set(prog.map((a) => a.group))];
    body = groups.map((g) => `<h4>${g}</h4><ul class="ach-list">${prog.filter((a) => a.group === g).map((a) => {
      const own = (p.unlocked || {})[a.id], r = [a.reward.title && '칭호', a.reward.icon && ACH.ICONS[a.reward.icon].emoji, a.reward.theme && '테마'].filter(Boolean).join(' ');
      return `<li class="${own ? 'own' : ''}"><span class="medal">${own ? '🏅' : '🔒'}</span><div class="ach-main"><b>${esc(a.name)}</b><div class="mini"><i style="width:${(a.value / a.target) * 100}%"></i></div></div><span class="ach-v">${own ? '달성' : `${a.value}/${a.target}`}<small>${r}</small></span></li>`;
    }).join('')}</ul>`).join('');
  } else if (achTab === 'title') {
    body = `<div class="pick-list">${rw.titles.map((tt) => `<button class="pick ${p.equippedTitle === tt ? 'on' : ''}" data-eq-title="${esc(tt)}">${esc(tt)}</button>`).join('')}</div>`;
  } else if (achTab === 'icon') {
    body = `<div class="pick-grid">${Object.keys(ACH.ICONS).map((k) => { const own = rw.icons.includes(k); return `<button class="pick-ic ${p.icon === k ? 'on' : ''}" ${own ? `data-eq-icon="${k}"` : 'disabled'}>${ACH.iconSVG(k, 52)}<span>${own ? ACH.ICONS[k].name : '🔒'}</span></button>`; }).join('')}</div>
      <p class="muted small">앱 안 로고·탭 아이콘이 바뀌어요. 홈 화면 아이콘은 웹앱 제한으로 바꿀 수 없어요.</p>`;
  } else {
    body = `<div class="pick-grid">${Object.entries(ACH.THEMES).map(([k, th]) => { const own = rw.themes.includes(k); return `<button class="pick-th ${p.theme === k ? 'on' : ''}" ${own ? `data-eq-theme="${k}"` : 'disabled'} style="--c:${th.light}"><i></i><span>${own ? th.name : '🔒'}</span></button>`; }).join('')}</div>`;
  }
  $('#achBody').innerHTML = `<div class="ach-head">${ACH.iconSVG(p.icon, 56)}<div><b>${esc(p.equippedTitle || '새내기 플래너')}</b><div class="lv">Lv.${lv.lv} · ${lv.xp} XP</div><div class="xpbar"><i style="width:${Math.round(lv.pct * 100)}%"></i></div></div></div>
    <div class="stats">${stat('완료', stats.done)}${stat('연속', stats.streak + '일')}${stat('최고 연속', stats.bestStreak + '일')}${stat('완벽한 날', stats.perfect)}${stat('일정 시간', stats.hours + 'h')}${stat('등록', stats.tasks + stats.events)}</div>
    <nav class="seg tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" aria-pressed="${achTab === k}">${n}</button>`).join('')}</nav>
    <div class="ach-pane">${body}</div>`;
}
$('#achBody').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const p = profile();
  if (b.dataset.tab) { achTab = b.dataset.tab; renderAch(); return; }
  if (b.dataset.eqTitle) put({ ...p, equippedTitle: b.dataset.eqTitle });
  else if (b.dataset.eqIcon) put({ ...p, icon: b.dataset.eqIcon });
  else if (b.dataset.eqTheme) put({ ...p, theme: b.dataset.eqTheme });
  else return;
  renderMe(); renderAch(); const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 10);
});
$('#meBtn').onclick = openAch;

// ---------- 끌어서 옮기기 ----------
enableDrag(main, {
  onDrop(id, from, to) {
    const it = records[id]; if (!it) return;
    put({ ...it, date: to }); addedId = id; render();
    toast(`「${it.title}」 → ${fmtMD(to)} ${S.dowOf(to)}`, () => { put({ ...records[id], date: from }); render(); });
  },
});

// ---------- 루틴 ----------
let routineEdit = null; // null=목록, 'new' 또는 id
const routines = () => Object.values(records).filter((r) => r.kind === 'routine' && !r.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.updatedAt - b.updatedAt);
function openRoutines() { routineEdit = null; renderRoutines(); $('#routineDlg').showModal(); }
function renderRoutines() {
  const list = routines(), date = ui.date;
  if (routineEdit) {
    const r = routineEdit === 'new' ? { name: '', steps: [] } : records[routineEdit];
    $('#routineBody').innerHTML = `<form id="routineForm" class="routine-form">
      <input name="name" class="title-input" placeholder="루틴 이름 (예: 아침 루틴)" value="${esc(r.name)}" required>
      <label>단계 (한 줄에 하나, 시간은 앞에 "07:00")<textarea name="steps" rows="7" placeholder="07:00 기상&#10;물 한 잔&#10;이불 정리">${esc(X.stepsText(r.steps || []))}</textarea></label>
      <div class="sheet-actions">${routineEdit !== 'new' ? '<button type="button" class="danger" data-r-del>삭제</button>' : '<button type="button" data-r-back>뒤로</button>'}<button class="primary">저장</button></div></form>`;
    return;
  }
  const card = (r, preset) => `<li class="routine"><div><b>${esc(r.name)}</b><small>${r.steps.map((s) => esc(s.title)).join(' · ')}</small></div>
    <div class="row-btns">${preset ? `<button data-r-preset="${esc(r.name)}">내 루틴에 추가</button>` : `<button data-r-edit="${r.id}">편집</button><button class="primary" data-r-apply="${r.id}">${fmtMD(date)}에 넣기</button>`}</div></li>`;
  const used = new Set(list.map((r) => r.name));
  const presets = X.PRESET_ROUTINES.filter((p) => !used.has(p.name));
  $('#routineBody').innerHTML = `<ul class="routines">${list.map((r) => card(r)).join('') || '<li class="empty">아직 루틴이 없어요. 추천 루틴으로 시작해 보세요.</li>'}</ul>
    <button class="btn new-r" data-r-new>＋ 새 루틴 만들기</button>
    ${presets.length ? `<h4 class="muted small">추천 루틴</h4><ul class="routines">${presets.map((p) => card(p, true)).join('')}</ul>` : ''}`;
}
$('#routineBody').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.rNew !== undefined) { routineEdit = 'new'; renderRoutines(); return; }
  if (b.dataset.rBack !== undefined) { routineEdit = null; renderRoutines(); return; }
  if (b.dataset.rEdit) { routineEdit = b.dataset.rEdit; renderRoutines(); return; }
  if (b.dataset.rDel !== undefined) { remove(routineEdit); routineEdit = null; renderRoutines(); return; }
  if (b.dataset.rPreset) { const p = X.PRESET_ROUTINES.find((x) => x.name === b.dataset.rPreset); put({ id: 'routine:' + S.uid(), kind: 'routine', name: p.name, steps: p.steps, order: routines().length }); renderRoutines(); toast('루틴을 추가했어요. 단계는 편집에서 바꿀 수 있어요'); return; }
  if (b.dataset.rApply) {
    const r = records[b.dataset.rApply], items = X.routineItems(r, ui.date, records, S.uid);
    items.forEach((it) => put(it));
    $('#routineDlg').close(); navAnim = 'fade'; render();
    toast(items.length ? `「${r.name}」 ${items.length}개를 넣었어요` : '이미 다 들어가 있어요');
  }
});
$('#routineBody').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, steps = X.parseSteps(f.steps.value), name = f.name.value.trim();
  if (!name || !steps.length) { toast('이름과 단계를 하나 이상 적어 주세요'); return; }
  const base = routineEdit === 'new' ? { id: 'routine:' + S.uid(), kind: 'routine', order: routines().length } : records[routineEdit];
  put({ ...base, name, steps }); routineEdit = null; renderRoutines();
});

// ---------- 집중 타이머 ----------
let focusPick = 25, focusTarget = null, focusDone = null;
const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const timer = createTimer({
  onTick(left, st) {
    const pill = $('#focusPill');
    pill.hidden = !st || $('#focusDlg').open;
    if (st) pill.innerHTML = `<span class="pulse"></span>${mmss(left)} · ${esc(st.title || '집중')}${st.paused ? ' (일시정지)' : ''}`;
    const ring = $('#focusRing'); if (ring && st) { ring.style.strokeDashoffset = String(2 * Math.PI * 88 * (1 - left / st.total)); $('#focusTime').textContent = mmss(left); }
    document.title = st && !st.paused ? `${mmss(left)} · 플래너` : '플래너';
  },
  onChange(st) { native?.reschedule().catch((e) => toast('집중 알림 예약 실패: ' + e.message)); if (!st) { $('#focusPill').hidden = true; document.title = '플래너'; } if ($('#focusDlg').open) renderFocus(); },
  onFinish(info, minutes) {
    logFocus(info, minutes);
    focusDone = { ...info, minutes };
    navigator.vibrate?.([200, 100, 200]);
    if (!native && document.hidden && 'Notification' in self && Notification.permission === 'granted') navigator.serviceWorker?.ready.then((r) => r.showNotification('집중 완료 ✅', { body: `${info.title || '집중'} · ${minutes}분`, icon: 'icon-192.png', tag: 'focus' }));
    renderFocus(); if (!$('#focusDlg').open) $('#focusDlg').showModal();
    confetti(60);
  },
});
function logFocus(info, minutes) {
  if (minutes < 1) return;
  put({ id: 'focus:' + S.uid(), kind: 'focus', date: S.today(), minutes, itemId: info.itemId || '', title: info.title || '', at: Date.now() });
  if (ui.view === 'stats') render();
}
function openFocus(itemId) {
  if (timer.state && itemId && timer.state.itemId !== itemId && !confirm('진행 중인 집중을 끝내고 새로 시작할까요?')) { renderFocus(); $('#focusDlg').showModal(); return; }
  if (timer.state && itemId && timer.state.itemId !== itemId) { const r = timer.stop(); logFocus(r.info, r.minutes); }
  focusTarget = itemId ? records[itemId] : null; focusDone = null;
  renderFocus(); $('#focusDlg').showModal();
}
function renderFocus() {
  const st = timer.state, C = 2 * Math.PI * 88;
  if (focusDone) {
    const it = records[focusDone.itemId], can = it && it.type === 'task' && !S.isDone(it, S.today());
    $('#focusBody').innerHTML = `<div class="focus-done"><div class="big-emoji">🎉</div><b>${focusDone.minutes}분 집중 완료!</b><p class="muted">${esc(focusDone.title || '')}</p>
      <div class="row-btns center">${can ? `<button class="primary" data-f-complete="${it.id}">할 일 완료 체크</button>` : ''}<button data-f-again>한 번 더</button><button data-f-close>닫기</button></div></div>`;
    return;
  }
  if (!st) {
    $('#focusBody').innerHTML = `<div class="focus-setup"><b class="f-title">${esc(focusTarget?.title || '자유 집중')}</b>
      <div class="pick-list center">${[10, 15, 25, 50].map((m) => `<button class="pick ${focusPick === m ? 'on' : ''}" data-f-min="${m}">${m}분</button>`).join('')}</div>
      <p class="muted small">폰을 내려놓고, 이 일 하나만. 끝나면 알려 드릴게요.</p>
      <button class="primary f-start" data-f-start>시작</button></div>`;
    return;
  }
  const left = timer.left();
  $('#focusBody').innerHTML = `<div class="focus-run"><b class="f-title">${esc(st.title || '자유 집중')}</b>
    <svg viewBox="0 0 200 200" class="ring"><circle cx="100" cy="100" r="88" class="bg"/><circle id="focusRing" cx="100" cy="100" r="88" class="fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - left / st.total)}"/></svg>
    <div class="f-time" id="focusTime">${mmss(left)}</div>
    <div class="row-btns center">${st.paused ? '<button class="primary" data-f-resume>계속</button>' : '<button data-f-pause>일시정지</button>'}<button class="danger" data-f-stop>그만하기</button></div></div>`;
}
$('#focusBody').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.fMin) { focusPick = Number(b.dataset.fMin); renderFocus(); }
  else if (b.dataset.fStart !== undefined) { timer.start({ itemId: focusTarget?.id || '', title: focusTarget?.title || '자유 집중' }, focusPick); renderFocus(); }
  else if (b.dataset.fPause !== undefined) { timer.pause(); renderFocus(); }
  else if (b.dataset.fResume !== undefined) { timer.resume(); renderFocus(); }
  else if (b.dataset.fStop !== undefined) {
    const r = timer.stop(); logFocus(r.info, r.minutes); focusDone = null;
    $('#focusDlg').close(); toast(r.minutes >= 1 ? `${r.minutes}분 집중을 기록했어요` : '1분 미만이라 기록하지 않았어요');
  } else if (b.dataset.fComplete) { const it = records[b.dataset.fComplete]; put(S.toggleDone(it, S.today())); focusDone = null; $('#focusDlg').close(); render(); confetti(); }
  else if (b.dataset.fAgain !== undefined) { focusTarget = records[focusDone.itemId] || null; focusDone = null; renderFocus(); }
  else if (b.dataset.fClose !== undefined) { focusDone = null; $('#focusDlg').close(); }
});
$('#focusDlg').addEventListener('close', () => { if (timer.state) $('#focusPill').hidden = false; });
$('#focusPill').onclick = () => { focusDone = null; renderFocus(); $('#focusDlg').showModal(); $('#focusPill').hidden = true; };

// ---------- 주간 리포트 공유 ----------
async function shareReport() {
  const today = S.today(), rep = X.weekReport(records, ui.date, today), p = profile();
  const st = stats || ACH.computeStats(records, today);
  const from = S.parse(rep.from).getTime(), to = S.parse(rep.to).getTime() + 864e5;
  const newAch = ACH.ACHIEVEMENTS.filter((a) => { const ts = (p.unlocked || {})[a.id]; return ts >= from && ts < to; }).map((a) => a.name);
  const text = X.reportText(rep, { streak: st.streak, newAch });
  try {
    if (native) await native.share(text);
    else if (navigator.share) await navigator.share({ title: '주간 리포트', text });
    else { await navigator.clipboard.writeText(text); toast('리포트를 복사했어요. 메신저에 붙여 넣으세요'); }
  } catch (e) { if (e.name !== 'AbortError') { try { await navigator.clipboard.writeText(text); toast('리포트를 복사했어요'); } catch { toast('공유하지 못했어요'); } } }
}

// 알림에서 열기: ?date=YYYY-MM-DD&item=ID
function openFromUrl(href) {
  const u = new URL(href, location.href), d = u.searchParams.get('date'), id = u.searchParams.get('item');
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
  ui.date = d; ui.view = 'day'; render();
  if (id && records[id] && !records[id].deleted) openEdit(id);
  history.replaceState(null, '', location.pathname);
}
navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.type === 'open') openFromUrl(e.data.url); });
window.addEventListener('planner-open', (e) => openFromUrl(e.detail));
window.addEventListener('planner-resume', () => { timer.resumeIfRunning(); renderPush(); });

records = S.compact(records); persist();
syncTheme(); render(); renderSync(); sync.start();
openFromUrl(location.href);
timer.resumeIfRunning();
if (!native && 'serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
