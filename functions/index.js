// 매 분 실행: 일정 알림 + 아침/밤 체크인 푸시 (서울 시간)
// shared/ 의 store.js·notify.js 는 배포 직전 루트에서 복사된다 (firebase.json predeploy).
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { reminderSlots, shouldRemind, reminderMessage, checkinKind, checkinMessage, zonedNow } from './shared/notify.js';

initializeApp();
const db = getFirestore();
const TZ = 'Asia/Seoul';
const APP_URL = process.env.APP_URL || ''; // 예: https://d0ngkyu.github.io/planner/

async function sendTo(uid, msg) {
  const devs = await db.collection(`users/${uid}/devices`).get();
  if (devs.empty) return 0;
  const tokens = devs.docs.map((d) => d.get('token')).filter(Boolean);
  const link = APP_URL ? new URL(msg.url || './', APP_URL).href : undefined;
  // data 전용 메시지 → 앱의 sw.js 가 직접 표시(클릭 시 해당 날짜로 이동)
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data: { title: msg.title, body: msg.body || '', url: link || msg.url || './', tag: msg.tag || '' },
    webpush: { headers: { Urgency: 'high', TTL: '600' } },
  });
  // 만료된 토큰 정리
  await Promise.all(res.responses.map((r, i) => {
    const code = r.error && r.error.code;
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument') return db.doc(`users/${uid}/devices/${devs.docs[i].id}`).delete();
  }));
  return res.successCount;
}

export const tick = onSchedule({ schedule: 'every 1 minutes', timeZone: TZ, region: 'asia-northeast3', retryCount: 0 }, async () => {
  const now = zonedNow(new Date(), TZ);
  const jobs = [];

  // 1) 일정 알림: time·remind 일치하는 항목만 색인 조회 (읽기 최소화)
  for (const slot of reminderSlots(now)) {
    const snap = await db.collectionGroup('records').where('time', '==', slot.time).where('remind', '==', slot.remind).get();
    for (const doc of snap.docs) {
      const item = doc.data();
      if (shouldRemind(item, slot)) jobs.push(sendTo(doc.ref.parent.parent.id, reminderMessage(item, slot)));
    }
  }

  // 2) 아침 계획 / 밤 체크(+재알림)
  const metas = await db.collectionGroup('meta').get();
  for (const m of metas.docs) {
    if (m.id !== 'settings') continue;
    const ck = checkinKind(m.data(), now);
    if (!ck) continue;
    const uid = m.ref.parent.parent.id;
    const recs = await db.collection(`users/${uid}/records`).where('kind', '==', 'item').get();
    const records = Object.fromEntries(recs.docs.map((d) => [d.id, d.data()]));
    const msg = checkinMessage(records, ck.kind, ck.step, now);
    if (msg) jobs.push(sendTo(uid, msg));
  }
  await Promise.allSettled(jobs);
});

// 설정 화면의 "테스트 알림" — users/{uid}/pings/{id} 생성 시 즉시 발송 후 삭제
export const ping = onDocumentCreated({ document: 'users/{uid}/pings/{id}', region: 'asia-northeast3' }, async (e) => {
  await sendTo(e.params.uid, { title: '알림 테스트 ✅', body: '이 기기에서 플래너 알림을 받을 수 있어요.', url: './', tag: 'ping' });
  await e.data.ref.delete();
});
