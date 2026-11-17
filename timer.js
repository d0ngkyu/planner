// 집중 타이머(뽀모도로). 상태는 localStorage 에 두어 새로고침/앱 전환에도 이어진다.
const KEY = 'planner.focus.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

export function createTimer({ onTick, onFinish, onChange }) {
  let s = load(), iv = null;
  const save = () => { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); onChange(s); };
  const left = () => (!s ? 0 : s.paused ? s.remaining : Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)));
  const loop = () => {
    clearInterval(iv);
    if (!s) return;
    iv = setInterval(() => {
      const l = left(); onTick(l, s);
      if (l <= 0 && !s.paused) { const done = s; s = null; clearInterval(iv); save(); onFinish(done, Math.round(done.total / 60)); }
    }, 500);
    onTick(left(), s);
  };
  return {
    get state() { return s; },
    left,
    start(info, minutes) { s = { ...info, total: minutes * 60, endsAt: Date.now() + minutes * 60000, paused: false, startedAt: Date.now() }; save(); loop(); },
    pause() { if (!s || s.paused) return; s = { ...s, paused: true, remaining: left() }; save(); onTick(left(), s); },
    resume() { if (!s || !s.paused) return; s = { ...s, paused: false, endsAt: Date.now() + s.remaining * 1000 }; save(); loop(); },
    // 중간 종료: 집중한 분 수를 돌려준다
    stop() { if (!s) return 0; const used = Math.floor((s.total - left()) / 60); const d = s; s = null; clearInterval(iv); save(); return { info: d, minutes: used }; },
    resumeIfRunning() { if (s) { if (!s.paused && left() <= 0) { const d = s; s = null; save(); onFinish(d, Math.round(d.total / 60)); } else loop(); } },
  };
}
