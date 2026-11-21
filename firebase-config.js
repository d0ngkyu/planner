// 기기 간 동기화를 켜려면 Firebase 콘솔의 웹 앱 설정값을 붙여 넣는다 (README 참고).
// 이 값은 공개되어도 되는 클라이언트 식별자이며, 데이터 보호는 firestore.rules 가 담당한다.
// null 이면 동기화 없이 이 기기에만 저장된다.
export const firebaseConfig = {
  apiKey: "AIzaSyCJrI5VCEH9hGHMl7iy7sQ9eC3-7SPCyzM",
  authDomain: "my-planner-eb2d3.firebaseapp.com",
  projectId: "my-planner-eb2d3",
  storageBucket: "my-planner-eb2d3.firebasestorage.app",
  messagingSenderId: "460641523965",
  appId: "1:460641523965:web:1a8e17d13de71c0a384694",
};
// 푸시 알림용 웹 푸시 인증서 키 (Firebase 콘솔 → 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서)
export const vapidKey = null;
/* 예시
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "my-planner.firebaseapp.com",
  projectId: "my-planner",
  appId: "1:...:web:...",
};
*/
