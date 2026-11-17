// 기기 간 동기화를 켜려면 Firebase 콘솔의 웹 앱 설정값을 붙여 넣는다 (README 참고).
// 이 값은 공개되어도 되는 클라이언트 식별자이며, 데이터 보호는 firestore.rules 가 담당한다.
// null 이면 동기화 없이 이 기기에만 저장된다.
export const firebaseConfig = null;
/* 예시
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "my-planner.firebaseapp.com",
  projectId: "my-planner",
  appId: "1:...:web:...",
};
*/
