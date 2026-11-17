// Firebase(Firestore + Google 로그인) 동기화 어댑터. 설정이 없으면 비활성.
// 저장 경로: users/{uid}/records/{recordId}  — 레코드 단위 last-write-wins (store.merge)
import { firebaseConfig, vapidKey } from './firebase-config.js';

const V = '10.12.5';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export function createSync({ onRemote, onStatus, onSettings = () => {} }) {
  let fb = null, user = null, unsub = null, unsubMeta = null;
  const pending = new Map();
  let timer = null;
  const enabled = !!firebaseConfig;

  async function load() {
    if (fb) return fb;
    const [app, auth, fs] = await Promise.all([
      import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`),
    ]);
    const a = app.initializeApp(firebaseConfig);
    const db = fs.initializeFirestore(a, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    fb = { auth, fs, au: auth.getAuth(a), db };
    return fb;
  }

  async function start() {
    if (!enabled) { onStatus({ state: 'off' }); return; }
    try {
      const { auth, au } = await load();
      await auth.getRedirectResult(au).catch(() => {});
      auth.onAuthStateChanged(au, (u) => {
        user = u;
        if (unsub) { unsub(); unsub = null; }
        if (unsubMeta) { unsubMeta(); unsubMeta = null; }
        if (!u) { onStatus({ state: 'signedOut' }); return; }
        onStatus({ state: 'syncing', email: u.email });
        listen();
      });
    } catch (e) { onStatus({ state: 'error', message: '동기화 모듈을 불러오지 못했습니다 (오프라인?)' }); }
  }

  function listen() {
    const { fs, db } = fb;
    const col = fs.collection(db, 'users', user.uid, 'records');
    let first = true;
    unsub = fs.onSnapshot(col, { includeMetadataChanges: false }, (snap) => {
      const remote = {};
      snap.docChanges().forEach((c) => { if (c.type !== 'removed') remote[c.doc.id] = c.doc.data(); });
      if (Object.keys(remote).length || first) onRemote(remote, first);
      first = false;
      onStatus({ state: snap.metadata.fromCache ? 'offline' : 'synced', email: user.email, at: Date.now() });
    }, (err) => onStatus({ state: 'error', message: err.code || String(err) }));
    unsubMeta = fs.onSnapshot(fs.doc(db, 'users', user.uid, 'meta', 'settings'), (d) => onSettings(d.exists() ? d.data() : null), () => {});
  }

  // ---- 푸시 알림 ----
  const pushSupported = () => enabled && !!vapidKey && 'Notification' in self && 'serviceWorker' in navigator && 'PushManager' in self;
  async function enablePush() {
    if (!pushSupported()) throw new Error('이 브라우저/설정에서는 푸시 알림을 쓸 수 없어요');
    if (!user) throw new Error('먼저 Google로 로그인하세요');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('알림 권한이 거부됐어요. 브라우저 사이트 설정에서 허용해 주세요');
    const [m] = await Promise.all([import(`${CDN}/firebase-messaging.js`)]);
    if (!(await m.isSupported())) throw new Error('이 브라우저는 푸시 알림을 지원하지 않아요');
    const app = (await import(`${CDN}/firebase-app.js`)).getApp();
    const reg = await navigator.serviceWorker.ready;
    const token = await m.getToken(m.getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
    const { fs, db } = fb;
    const id = token.slice(-40).replace(/[^\w-]/g, '_');
    await fs.setDoc(fs.doc(db, 'users', user.uid, 'devices', id), { token, ua: navigator.userAgent.slice(0, 200), updatedAt: Date.now() });
    localStorage.setItem('planner.pushDevice', id);
    return id;
  }
  async function saveSettings(settings) {
    if (!user) throw new Error('먼저 Google로 로그인하세요');
    const { fs, db } = fb;
    await fs.setDoc(fs.doc(db, 'users', user.uid, 'meta', 'settings'), { ...settings, tz: 'Asia/Seoul', updatedAt: Date.now() }, { merge: true });
  }
  async function ping() {
    if (!user) throw new Error('먼저 Google로 로그인하세요');
    const { fs, db } = fb;
    await fs.addDoc(fs.collection(db, 'users', user.uid, 'pings'), { at: Date.now() });
  }

  function push(rec) {
    if (!enabled) return;
    pending.set(rec.id, rec);
    clearTimeout(timer);
    timer = setTimeout(flush, 400);
  }

  async function flush() {
    if (!user || !fb || !pending.size) return;
    const { fs, db } = fb;
    const items = [...pending.values()]; pending.clear();
    for (let i = 0; i < items.length; i += 400) {
      const batch = fs.writeBatch(db);
      items.slice(i, i + 400).forEach((r) => batch.set(fs.doc(db, 'users', user.uid, 'records', r.id), JSON.parse(JSON.stringify(r))));
      try { await batch.commit(); } catch (e) { items.slice(i, i + 400).forEach((r) => pending.set(r.id, r)); onStatus({ state: 'error', message: e.code || String(e) }); }
    }
  }

  async function signIn() {
    const { auth, au } = await load();
    const p = new auth.GoogleAuthProvider();
    const standalone = matchMedia('(display-mode: standalone)').matches;
    try { standalone ? await auth.signInWithRedirect(au, p) : await auth.signInWithPopup(au, p); }
    catch (e) { if (String(e.code).includes('popup')) await auth.signInWithRedirect(au, p); else throw e; }
  }
  async function signOut() { if (fb) await fb.auth.signOut(fb.au); }

  return { enabled, start, push, signIn, signOut, enablePush, saveSettings, ping, pushSupported, get user() { return user; } };
}
