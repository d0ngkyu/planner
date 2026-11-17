// 끌어서 날짜 옮기기. [data-drag="id"][data-date] 를 [data-drop="YYYY-MM-DD"] 위에 놓으면 onDrop(id, from, to)
// 마우스: 6px 이상 움직이면 시작 / 터치: 0.35초 꾹 누른 뒤 끌기 (그냥 스크롤은 그대로)
export function enableDrag(root, { onDrop }) {
  let st = null, suppress = 0;

  const begin = (x, y) => {
    const r = st.el.getBoundingClientRect();
    const g = st.el.cloneNode(true);
    g.className += ' drag-ghost';
    g.style.cssText = `width:${r.width}px;left:0;top:0;transform:translate(${x - st.ox}px,${y - st.oy}px)`;
    document.body.appendChild(g);
    st.ghost = g; st.el.classList.add('dragging'); document.body.classList.add('is-dragging');
    navigator.vibrate?.(15);
  };
  const move = (x, y) => {
    st.ghost.style.transform = `translate(${x - st.ox}px,${y - st.oy}px) rotate(2deg)`;
    const t = document.elementFromPoint(x, y)?.closest('[data-drop]');
    if (t !== st.over) { st.over?.classList.remove('drop-over'); t?.classList.add('drop-over'); st.over = t; }
    // 화면 가장자리에서 자동 스크롤
    if (y < 70) scrollBy(0, -12); else if (y > innerHeight - 70) scrollBy(0, 12);
  };
  const end = (cancel) => {
    if (!st) return;
    clearTimeout(st.timer);
    if (st.ghost) {
      const to = st.over?.dataset.drop;
      st.ghost.remove(); st.el.classList.remove('dragging'); document.body.classList.remove('is-dragging'); st.over?.classList.remove('drop-over');
      suppress = Date.now();
      if (!cancel && to && to !== st.from) onDrop(st.id, st.from, to);
    }
    st = null;
  };
  const start = (e, x, y, touch) => {
    const el = e.target.closest('[data-drag]');
    if (!el || e.target.closest('button:not([data-drop]), input, textarea')) return false;
    const r = el.getBoundingClientRect();
    st = { el, id: el.dataset.drag, from: el.dataset.date, sx: x, sy: y, ox: x - r.left, oy: y - r.top, ghost: null, over: null, touch };
    if (touch) st.timer = setTimeout(() => st && begin(st.sx, st.sy), 350);
    return true;
  };

  // 마우스/펜
  root.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' || e.button !== 0) return; start(e, e.clientX, e.clientY, false); });
  addEventListener('pointermove', (e) => {
    if (!st || st.touch) return;
    if (!st.ghost && Math.hypot(e.clientX - st.sx, e.clientY - st.sy) > 6) begin(e.clientX, e.clientY);
    if (st.ghost) { e.preventDefault(); move(e.clientX, e.clientY); }
  });
  addEventListener('pointerup', () => { if (st && !st.touch) end(false); });

  // 터치 (길게 누르기)
  root.addEventListener('touchstart', (e) => { if (e.touches.length === 1) start(e, e.touches[0].clientX, e.touches[0].clientY, true); }, { passive: true });
  root.addEventListener('touchmove', (e) => {
    if (!st) return;
    const p = e.touches[0];
    if (!st.ghost) { if (Math.hypot(p.clientX - st.sx, p.clientY - st.sy) > 8) { clearTimeout(st.timer); st = null; } return; }
    e.preventDefault(); move(p.clientX, p.clientY);
  }, { passive: false });
  root.addEventListener('touchend', () => end(false));
  root.addEventListener('touchcancel', () => end(true));
  root.addEventListener('contextmenu', (e) => { if (st?.touch) e.preventDefault(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') end(true); });

  // 끌기 직후의 클릭(편집 열림) 무시
  root.addEventListener('click', (e) => { if (Date.now() - suppress < 300) { e.stopPropagation(); e.preventDefault(); } }, true);
}
