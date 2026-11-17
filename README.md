# 플래너 (일·주·월)

폰과 PC에서 같은 데이터를 쓰는 개인 플래너. 설치 없는 웹앱(PWA)이며 홈 화면/바탕화면에 앱처럼 추가할 수 있다.

## 기능
- **일간**: 할 일(체크)·시간 일정, 진행률, 밀린 할 일 "오늘로" 이동, 오늘의 메모
- **주간**: 월~일 7칸, 칸별 빠른 추가, 이번 주 목표 체크리스트, 주간 메모
- **월간**: 달력(PC는 제목, 폰은 점 표시), 선택한 날 일정, 이번 달 목표, 월간 메모
- 반복(매일/평일/매주/매월/매년, 종료일), 색상, 메모, 검색, 되돌리기
- 빠른 입력: `14:00 회의`, `오후 3시 미팅`, `9시 반 운동` → 시간 일정으로 자동 인식
- 오프라인 사용, 다크 모드, JSON 내보내기/가져오기
- **업적**: 완료·등록·일정 시간·연속일 미션, 보상으로 칭호/앱 안 아이콘/테마, 레벨
- 알림(Android): 일정 시간, 아침 계획, 밤 체크+재알림
- 단축키(PC): ←/→ 이동, T 오늘, D/W/M 보기, N 새 항목, / 검색 · 폰은 좌우 스와이프

## 실행
정적 파일만 있으면 된다. 로컬 확인: `python3 -m http.server 8765` 후 http://localhost:8765
배포: GitHub Pages(Settings → Pages → main / root). 폰에서 주소 열기 → "홈 화면에 추가".

## 동기화 켜기 (폰 ↔ PC)
설정 전에는 각 기기에만 저장된다. Firebase 무료 플랜으로 켠다.
1. https://console.firebase.google.com 에서 프로젝트 생성
2. Authentication → 로그인 방법 → **Google** 사용 설정, 승인된 도메인에 `<계정>.github.io` 추가
3. Firestore Database 생성 → 규칙 탭에 `firestore.rules` 내용 붙여넣고 게시
4. 프로젝트 설정 → 웹 앱 추가 → 표시되는 `firebaseConfig` 값을 `firebase-config.js`에 넣고 푸시
5. 각 기기에서 ⚙ → Google로 로그인. 기존 기기 데이터는 첫 로그인 때 자동으로 합쳐진다.

동기화 규칙: 항목별로 마지막 수정이 이긴다(삭제 포함). 같은 항목을 두 기기에서 오프라인으로 동시에 고치면 나중 수정본만 남는다.

## 알림 켜기 (Android 권장, 앱 꺼져 있어도 옴)
동기화를 먼저 켠 뒤:
1. Firebase 프로젝트를 **Blaze(종량제)** 로 변경 (Cloud Functions 실행에 필요, 개인 사용량은 무료 한도 안일 가능성이 높지만 보장 아님 — 예산 알림 설정 권장)
2. 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서 생성 → 키를 `firebase-config.js`의 `vapidKey`에 넣기
3. PC에서 `npm i -g firebase-tools` → `firebase login` → `firebase use <프로젝트ID>` → `firebase deploy --only firestore,functions`
   (선택) 함수 환경변수 `APP_URL=https://<계정>.github.io/planner/` 를 `functions/.env`에 넣으면 알림 클릭 시 정확한 주소로 열림
4. 폰 크롬에서 앱 열기 → 홈 화면에 추가 → ⚙ → "이 기기에서 알림 켜기" → "테스트 알림"

보내는 알림: 항목별 일정 알림(정시~1시간 전), 아침 계획 알림, 밤 체크 알림(남은 할 일이 있으면 30분 간격 2회 재알림). 서버는 서울 시간 기준 매 분 `functions/index.js`의 `tick`이 확인한다.

## 구조
| 파일 | 역할 |
|---|---|
| `store.js` | 날짜·반복·병합 등 순수 로직 (DOM 없음, 테스트 대상) |
| `app.js` | 화면 렌더링/이벤트 |
| `sync.js` | Firebase 동기화·푸시 등록 어댑터 (`firebase-config.js`가 null이면 꺼짐) |
| `notify.js` | 알림 판단 순수 로직 (서버와 테스트 공용) |
| `functions/` | 매 분 알림 발송 Cloud Functions (서울 리전) |
| `sw.js` | 오프라인 캐시 — 앱 파일 바꾸면 `VERSION` 올리기 |
| `tests/` | `npm test` (Node 18+) |

협업 규칙은 `COLLAB.md`, 작업 상태는 `TASKS.md`.
