// Firebase(Firestore + Google 로그인) 동기화 어댑터. 설정이 없으면 비활성.
// 저장 경로: users/{uid}/records/{recordId}  — 레코드 단위 last-write-wins (store.merge)
import { firebaseConfig, vapidKey } from './firebase-config.js';
import { native } from './platform.js';
import { mergeRecord } from './store.js';

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
        pending.clear();
        if (unsub) { unsub(); unsub = null; }
        if (unsubMeta) { unsubMeta(); unsubMeta = null; }
        if (!u) { onStatus({ state: 'signedOut' }); return; }
        const owner = localStorage.getItem('planner.syncOwner');
        if(owner && owner !== u.uid) { onStatus({state:'error',email:u.email,message:'기존 데이터를 보호하려면 처음 연결한 계정으로 로그인하세요.'}); user = null; return; }
        localStorage.setItem('planner.syncOwner', u.uid);
        onStatus({ state: 'syncing', email: u.email });
        listen();
      });
    } catch (e) { onStatus({ state: 'error', message: '동기화 모듈을 불러오지 못했습니다 (오프라인?)' }); }
  }

  function listen() {
    const { fs, db } = fb;
    const col = fs.collection(db, 'users', user.uid, 'records');
    let first = true;
    unsub = fs.onSnapshot(col, { includeMetadataChanges: true }, (snap) => {
      if(first && snap.metadata.fromCache) { onStatus({state:'offline', email:user.email}); return; }
      const remote = {};
      snap.docs.forEach((c) => { remote[c.id] = c.data(); });
      if (Object.keys(remote).length || first) onRemote(remote, first);
      first = false;
      onStatus({ state: snap.metadata.fromCache ? 'offline' : 'synced', email: user.email, at: Date.now() });
    }, (err) => onStatus({ state: 'error', message: err.code || String(err) }));
    unsubMeta = fs.onSnapshot(fs.doc(db, 'users', user.uid, 'meta', 'settings'), (d) => onSettings(d.exists() ? d.data() : null), () => {});
  }

  // ---- 푸시 알림 ----
  const pushSupported = () => !native && enabled && !!vapidKey && 'Notification' in self && 'serviceWorker' in navigator && 'PushManager' in self;
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
    const owner = user.uid, items = [...pending.values()]; pending.clear();
    for (const r of items) {
      if(user?.uid !== owner) return;
      try {
        await fs.runTransaction(db, async tx => {
          const ref = fs.doc(db, 'users', owner, 'records', r.id), old = await tx.get(ref);
          const winner = mergeRecord(old.exists() ? old.data() : null, r);
          tx.set(ref, JSON.parse(JSON.stringify(winner)));
        });
      } catch(e) {
        if(user?.uid !== owner) return;
        pending.set(r.id, mergeRecord(r, pending.get(r.id)));
        onStatus({state:'offline',email:user.email});
        clearTimeout(timer); timer=setTimeout(flush,5000);
      }
    }
  }

  async function signIn(email, password, register = false) {
    const { auth, au } = await load();
    if(register) return auth.createUserWithEmailAndPassword(au,email,password);
    return auth.signInWithEmailAndPassword(au,email,password);
  }
  async function resetPassword(email) { const {auth,au} = await load(); return auth.sendPasswordResetEmail(au,email); }
  async function signOut() { if (fb) await fb.auth.signOut(fb.au); }

  return { enabled, start, push, signIn, signOut, resetPassword, enablePush, saveSettings, ping, pushSupported, get user() { return user; } };
}
