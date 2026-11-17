// 오프라인용 캐시. 앱 파일 변경 시 VERSION 을 올린다.
const VERSION = 'planner-v7';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'platform.js', 'store.js', 'categories.js', 'achievements.js', 'extras.js', 'drag.js', 'timer.js', 'sync.js', 'firebase-config.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// 같은 출처: 네트워크 우선(최신 반영), 실패 시 캐시
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

// ---- 푸시 알림 (서버 functions/index.js 가 data 메시지로 보냄) ----
self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch { p = { data: { title: '플래너', body: e.data && e.data.text() } }; }
  const d = p.data || p.notification || p;
  e.waitUntil(self.registration.showNotification(d.title || '플래너', {
    body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, icon: 'icon-192.png', badge: 'icon-192.png',
    data: { url: d.url || './' }, requireInteraction: d.tag === 'evening',
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find((c) => c.url.startsWith(self.registration.scope));
    if (w) { await w.focus(); w.postMessage({ type: 'open', url }); return; }
    await clients.openWindow(url);
  })());
});
