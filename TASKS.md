# TASKS (planner)

| 항목 | 값 |
|---|---|
| 배포 담당 | Codex (INSPIRATION-010 글귀/영감함/캐릭터 구현) |
| 현재 버전 | 웹 sw `planner-v8` / Android 0.3.0 (versionCode 4) — 게시 완료, 폰 적용 미확인 |

## INSPIRATION-010 · Codex · 진행 · 2026-11-17
- 승인: 시간대별 한조각+누를때마다 새글, 저장/느낌별하위분류/비슷한글추천. 앞선 캐릭터상태/Android접속간격에따른아이콘/위젯표정 제안 포함.
- 기준 main9191816, clean/열린PR0/배포담당없음 확인. branch codex/inspiration-010. 소유: 콘텐츠/영감모델·UI/캐릭터벡터/네이티브아이콘·작업예약/위젯 및 검증·기록.
- 기본 글귀는 직접 창작/전래속담/출처확인된 고전의 자체의역을 구분. 현대작품 장문/잘못된명언출처 사용안함. 외부유료AI추천 없이 태그기반 오프라인 유사추천.
- 저장본문스냅샷을 신규 inspiration 레코드로 보존(백업/미래동기화), 기존 모델호환검사. Firebase실연결미완료 유지. 아이콘배경작업은 OS절전·런처지연 가능, 실제폰확인 별도.

## DAY-DIAL-009 · Codex · 진행 · 2026-11-17
- 승인: 24시간 원판/목록 전환, 카테고리 색, 현재시간 바늘, 선택 일정 카드, 시간없는 일은 아래 목록. 기본 원판/보기 선택 보존. Firebase 미연결 범위 유지.
- 기준 main0781fc9, 로컬 clean/열린PR0 확인. 브랜치 codex/day-dial-009. 소유: 원판 모듈·일간 UI·관련 검사/앱버전·배포. 기존 데이터모델 보존, 기존 담당 없음 확인 후 인수.
- 겹치는 시간은 동심원으로 구분, 자정 넘는 일정은 날짜별 나눔, 종료 없는 일정은 1시간 표시(안내). 짧은 구역은 자세한 시간목록으로도 선택 가능.

## PLANNER-008 · Codex · 진행 · 2026-11-17
- 승인 범위/순서: 폰-PC 동기화 → 날짜 없는 카드 보관함 → 같은 날 순서 변경 → Android 홈 위젯 → 직관적인 화면 재구성/글꼴·크기·카테고리별 입력·색상.
- 기준 main03cbe66, 열린 PR0/로컬 변경0 확인. 브랜치 codex/planner-008. 소유: 앱 데이터/UI/동기화/Android 위젯 및 관련 검증·문서. 이전 기능과 데이터 보존.
- Firebase 설정 null 및 Android 로그인 비활성 확인. 프로젝트 연결정보 확인 요청 중; 서비스 연결/실제 두 기기 검증은 소스 구현과 구분한다.
- 카테고리 기본: 일반·운동·자기계발·공부·업무·생활. 오늘 화면 중심, 부가 기록 접기. 미정 항목은 날짜·알림 없이 보관, 편집에서 날짜 지정.

## PLANNER-001 · 첫 버전 (2026-11-17, Claude) — 완료(로컬)
- 요청: 모바일/PC 공동 사용 일·주·월 플래너. 사용자 결정: GitHub 새 프로젝트, 본인 혼자 기기 간 동기화.
- 결정: 빌드 없는 바닐라 JS PWA(세 AI 모두 수정 쉬움) + localStorage + 선택형 Firebase(Firestore/Google 로그인) 동기화, 레코드 단위 last-write-wins.
- 검증(직접): `npm test` 13개 통과. Playwright Chromium PC 1360px / 폰 390px에서 일·주·월·편집 화면 렌더, 빠른 입력·체크·메모·목표 입력, 새로고침 후 유지(6건) 확인. 콘솔 오류는 샌드박스의 글꼴 CDN 차단뿐.
- 미검증: 실제 Firebase 동기화(설정값 없음), 실제 폰 설치/iOS Safari, 서비스워커 오프라인 동작.
- 막힘: Claude 세션에 GitHub 쓰기 권한이 없어 원격 저장소 생성/푸시 못 함 → 사용자가 빈 저장소 `d0ngkyu/planner` 생성 필요.

## PLANNER-002 · 푸시 알림 (2026-11-17, Claude) — 구현 완료, 실제 발송 미검증
- 사용자: Android, Firebase Blaze(카드 등록) 허락.
- 일정별 알림(없음/정시/5·10·30·60분 전), 아침 계획 알림, 밤 체크 알림+남은 일 있으면 30분 간격 2회 재알림, 테스트 알림.
- 구조: 클라이언트 FCM 토큰 → users/{uid}/devices, 설정 → users/{uid}/meta/settings. `functions/index.js` tick(매 분, asia-northeast3, Asia/Seoul)이 collectionGroup(records) time+remind 색인 조회 → data 메시지 → sw.js가 표시/클릭 시 해당 날짜·항목 열기. 판단 로직 `notify.js`(서버와 공용).
- 검증(직접): notify 테스트 7개, functions 모듈 로드(export tick/ping), 브라우저에서 알림 선택 UI·저장·?date= 열기 확인.
- 미검증: 실제 FCM 발송/수신(Firebase 프로젝트 없음), Blaze 비용, Android 실기기.
- 커밋 1a35a19 (claude/notifications).

## PLANNER-003 · 업적·보상·애니메이션 (2026-11-17, Claude) — 구현 완료
- 업적 26개(완료 수/할 일 등록/일정 등록·총시간/연속일/완벽한 날/아침 완료/메모/목표). 보상: 칭호 22종, 앱 안 아이콘 11종(로고+탭 파비콘), 테마 색 6종. 레벨/XP. 달성 시 축하 창+색종이. 획득 기록은 `profile` 레코드(동기화됨), 데이터를 지워도 획득 유지.
- 일정에 끝 시간 추가(`14:00-15:30 회의` 빠른 입력). 끝 시간 없는 일정은 1시간으로 계산.
- 애니메이션: 기간 이동 슬라이드, 보기 전환 페이드, 추가 항목 팝, 체크 튀기+취소선 그리기+불꽃, 하루 완료 색종이, 진행 막대, 시트 등장. 동작 줄이기 설정 존중.
- 제한: 홈 화면 앱 아이콘 자체는 PWA 제한으로 사용자별 변경 불가(앱 안 로고·탭 아이콘만 변경).
- 검증(직접): achievements 테스트 7개(총 27개), Playwright PC/폰에서 체크→축하창, 업적 화면, 칭호 장착, 끝 시간 저장 확인. 콘솔 오류 없음.

## PLANNER-004 · 추천 기능 7종 (2026-11-17, Claude) — 구현 완료
- 루틴 묶음(추천 3종+직접 만들기, 날짜에 한 번에 넣기·중복 방지), 잔디 달력(20주), 집중 타이머(10/15/25/50분, 새로고침 유지, 완료 시 기록·진동·알림·할 일 체크 제안), 컨디션(기분·에너지 5단계, 14일 그래프), 미루기(↷ 횟수, 3회 이상이면 쪼개기/10분만 해 보기 제안), 주간 리포트(실행률·요일 막대·집중·컨디션·자주 미룬 일, 공유/복사), 끌어서 날짜 이동(주간·월간, PC 마우스/폰 길게 누르기, 되돌리기).
- 새 화면 "기록"(S 단축키). 새 레코드 종류 routine/focus/mood (동기화·백업 대상). 업적 5개 추가(집중 1/10/50시간, 컨디션 7/30회) + 아이콘 2·테마 1.
- 검증(직접): 테스트 33개(store13·notify7·achievements7·extras6). Playwright PC/폰: 루틴 추가·적용(5개), 컨디션, 미루기 3회→힌트→쪼개기(원본 삭제·2단계 생성), 타이머 시작→완료(새로고침 후 완료 처리·기록), 마우스/터치 길게누르기 드래그로 다음 날 이동, 기록 화면 렌더. 콘솔 오류 없음.
- 미검증: 실제 Android 기기 터치감·진동·백그라운드 타이머 알림, 공유 시트.

## REPO-005 · 원격 저장소 첫 반영 (2026-11-17, Claude)
- 사용자가 빈 저장소 d0ngkyu/planner(Public) 생성. 빈 저장소이고 작업자가 Claude뿐이라 PLANNER-001~004의 일직선 커밋을 PR 없이 main에 그대로 올림(빨리감기). 작업 브랜치 claude/notifications·achievements·extras도 보존용으로 푸시. 이후 변경은 브랜치+PR 원칙.
- 남은 사용자 작업: GitHub Pages 켜기(Settings → Pages → Deploy from a branch → main / root). 이 세션은 저장소 설정 API 권한 없음.
- 다음: Pages 주소 확인 → Firebase 프로젝트 연결(동기화) → functions 배포(알림, PC 필요).

## 다음 후보
- PLANNER-002: GitHub Pages 배포 + Firebase 연결 후 폰·PC 실제 동기화 확인
- 구글 캘린더 가져오기, 같은 날 안에서 순서 드래그, 루틴 자동 반복 넣기

## ANDROID-006 · Android 설치 앱 · Codex · 게시 완료 / 폰 확인 대기 (2026-11-17)
- 사용자 결정: 기존 기능/디자인을 유지하는 Android 앱으로 전환, 기능·디자인 개선은 후속으로 천천히 진행.
- 기준 main c3ac08f, 열린 PR 없음 확인. REPO-005는 설정 인계 상태이며 실행 중 배포 기록 없음. 이번 앱 패키징 담당 Codex 인수.
- 소유: Android 프로젝트/패키징/필수 네이티브 어댑터/관련 테스트·문서. 기존 데이터 모델 유지. 브랜치 codex/android-006.
- Pages 주소 HTTP 200 및 플래너 HTML 직접 확인(이전 세션). Firebase 연결/실기기 검증 미완료 유지.
- 계획: Capacitor 기반 로컬 번들 APK, 백업/뒤로가기/알림 호환 확인, 빌드와 회귀 테스트 후 PR. 서명 키·자격증명은 저장소에 올리지 않음.

### ANDROID-006 검증 및 게시 인수
- APK 소스 df08bd801d98e402c305479df954ec669c1e1c1d, release 0.1.0/versionCode1, 담당 Codex. PR1. 기능/디자인 확장 없이 기존 화면과 모델을 공유. 번들 로딩, 네이티브 뒤로가기·JSON 공유·일정/집중/아침/밤 일반 알림 연결.
- 직접 검증: 기존33개 테스트 + 모바일12 assertions 통과. Playwright 실제 Chromium 390/1360px 웹 및 네이티브 어댑터 **모의**에서 생성/재실행 보존/뷰 전환/설정/백업 인자 확인, JS 오류0. APK 실기기 시험과 구분.
- Actions44014961176: pnpm 설치/전체검사/mobile:sync/assembleRelease/lintRelease 성공. unsigned artifact ZIP SHA256 cbc47bba892739c3f7e252a6482fdbece244aa4c4874cdfa442683649f594db6 직접 대조.
- 로컬 개인 키로 APK v2/v3 서명·검증 성공. APK SHA256 3d77ad348f62e6fb9a584616dc7ed12a9b856e0ae606280eddc11e688d62dd45, 공개 인증서 SHA256 8197dcd546b9e42c683f51455c46e477858d9a6278fa478074a1f5cdbab4d908. 키/암호는 무시된 .tools/signing에만 저장(암호 DPAPI), 원격 키 백업 아님. 동일 키/상승 versionCode로 업데이트할 것.
- 확인된 실패/해결: 샌드박스 DNS/localhost/패키지 캐시 제한은 승인된 범위 재실행으로 통과. 첫 서명에서 DPAPI 텍스트 끝 개행 파싱 실패 → Trim 처리 후 동일 키로 서명 검증 성공. 키 교체/데이터 삭제 없음.
- 남은 한계: Android 실제 설치/백그라운드 수신/재부팅/파일 선택 실기기 확인 필요. 예약은 앞으로30일 최대400건, 수정/실행 때 갱신. Android Firebase 로그인/동기화와 조건부 밤 재알림은 미연결. 웹 Google 로그인 코드 보존.
- 게시 대상 downloads/planner-0.1.0.apk 및 설치 안내 /downloads/. APK/웹 변경은 이 작업자가 PR1 병합 후 Pages와 실제 파일 해시를 재확인. 아직 게시 완료/폰 적용으로 기록하지 않음.
- ai-collaboration PR3 병합 9f4a732, projects/planner.md 원격 재조회 확인. 등록 누락 해결, 다른 AI 열람/동의 확인을 뜻하지 않음.


### ANDROID-006 게시 완료 확인 · 2026-11-17 · Codex
- PR1 main 병합 dd99e2a2d0a4f93c278c78334ee9fc7c387f4fe5. Pages Actions44015970189 성공. https://d0ngkyu.github.io/planner/downloads/ HTTP200, 공개 APK를 재다운로드해 SHA256 3d77ad348f62e6fb9a584616dc7ed12a9b856e0ae606280eddc11e688d62dd45 일치 확인.
- 서명 APK 앱 소스 df08bd8, 빌드 Actions44014961176 성공. 포함된6개 web asset 대조: Windows/Linux CRLF만 정규화한 텍스트 일치, PNG 해시 일치. 첫 Pages 확인은 GitHub 오류 페이지 반환, 배포 성공 후 재조회로 해소.
- 설치 파일/소스 원격 보관 완료. 실제 폰 설치·알림 수신은 미확인. 다음: 사용자 폰 설치 확인 → Firebase Android 동기화 연결 → 기능/디자인 점진 개선. 새 기능을 임의로 착수하지 않음.
- Codex 게시 잠금 해제. 후속 작업자는 TASKS/열린 PR 확인 후 소유를 기록할 것. 키 로컬 보관이며 원격 키 백업 아님(ANDROID.md). 협업 허브 PR3 등록 및 원격 요약 재조회 확인.

## SOLO-CALM-007 · Codex · 게시 완료 · 2026-11-17
- 사용자 승인: Gemini가 제안한 1인용 미니멀 디자인을 Codex가 직접 적용·검증·APK 업데이트까지 수행. Gemini CLI 설치 요청이 아님.
- 최신 결정: Gemini 협업 제외, Codex·Claude 운영. 기존 기여/이력 보존. ZIP 원본은 이 세션에 없으므로 전달된 요구사항을 기준으로 구현하며 원본 ZIP 적용이라고 주장하지 않음.
- 기준 main099d382, 열린 PR0 확인. 브랜치 codex/solo-calm-007, 소유 styles.css/index.html/app.js의 디자인·빠른 입력·미연결 표시, 캐시/Android 버전/검증·기록. 배포 담당 Codex 인수.
- 범위: 라이트 #FAF9F6 / 다크 #141517 / 세이지 #3B6E5C, 하단 빠른 입력, 터치44px, 눌림·체크 애니메이션, 미연결 표시. 기존 데이터 모델/기능 보존. 0.1.1 versionCode2/웹v6 예정.

### SOLO-CALM-007 · 소스 검증 / 게시 준비
- APK 소스 f3b96ff44a8d804f5935cfa1d5dc166f460998e3, PR3, 담당 Codex. 구현 후 mobile:sync 실행(전달된 명령의 CSS 적용 전 sync 순서는 수정). 웹v6/Android0.1.1 versionCode2.
- 기존33 + 모바일12 검사 통과. Chromium 웹·네이티브 어댑터 모의 각각360/390/768/1360px: 신규 하단빠른입력(시간인식), 기존 편집/저장/재실행, 4뷰, 노출버튼44px, 페이지 가로넘침 없음, 다크 배경/동작줄이기/백업 인자 검증. JS오류0. 라이트/다크 캡처 확인. 실제 Android 실기기 검증과 구분.
- 발견/해결: 360px 기록 잔디 터치영역 확대 후 grid 최소너비가 페이지를 확장 → 카드 min-width:0 및 잔디 내부 가로스크롤로 수정, 8개 화면조합 재검사 통과. 어두운 테마 캡처는 색 전환 완료 후 확인.
- Actions44019274321 assembleRelease/lintRelease·테스트 성공, ZIP SHA256 5a5fe4bb2e98a565086d5695a8ac6c2119974a607912ca2eb98797d8ce3c1d21 대조. APK내6asset 소스대조(텍스트CRLF정규화/PNG해시) 일치.
- 기존0.1.0과 같은 인증서 8197dcd546b9e42c683f51455c46e477858d9a6278fa478074a1f5cdbab4d908로 v2/v3 서명검증. APK SHA256 9b50cbf04a8f59ddc046e33b2a8e5d3670511efbfc3d3bf1219380b4af71c244. 기존 앱 삭제 없이 업데이트 경로, 실제 폰 업데이트/유지/키보드·알림 수신은 미검증.
- 게시 대상 downloads/planner-0.1.1.apk / manifest / 설치페이지. PR3 병합 전에 이 기록 원격 재조회. 이전0.1.0 APK 보존, 앱 데이터 모델/서명키 변경 없음. Firebase 연결은 여전히 후속.
- 협업 변경: 허브 PR5 병합53777005 확인, 원격 README 최신 결정 재조회. 이 PC AGENTS와 프로젝트 위치 기록 반영. Gemini 설치/호출/계정권한 수정 없음, 과거 기여 보존. Codex·Claude 운영.


## SOLO-CALM-007 · 게시 완료 · 2026-11-17 · Codex
- PR3 병합 d5ce101184ec9b92b3b05a0c7c8157fc24e4045f, 웹v6/Android0.1.1 versionCode2. Pages44019817617 build/deploy/report 성공. 설치페이지0.1.1/웹quickDock HTTP200 및 공개 APK 재다운로드 SHA256 9b50cbf04a8f59ddc046e33b2a8e5d3670511efbfc3d3bf1219380b4af71c244 일치.
- 라이트#FAF9F6/다크#141517·세이지, 하단빠른입력·44px버튼·눌림/체크·미연결표시 구현. 기존33+모바일12검사, 웹/네이티브모의 각4크기 8조합·4뷰·다크·동작줄이기 검사, JS오류0. 기록화면 넘침 수정 후 통과. 실제 APK앱소스 f3b96ff/빌드44019274321, 내부6asset 대조 및 기존인증서 v2/v3검증 성공.
- 설치/웹 주소 https://d0ngkyu.github.io/planner/downloads/ , https://d0ngkyu.github.io/planner/ . 0.1.0 삭제 없이 새 APK 설치 안내, 실제 사용자 폰 업데이트/데이터유지/키보드/알림 수신은 미검증. Firebase 연결·다음 기능은 후속.
- 게시 잠금 해제. Gemini 협업 종료, Codex·Claude 운영(허브PR5 53777005·이PC AGENTS 반영). Gemini 기존 기여 보존, CLI 설치/외부 계정권한 해제/상대 통지 없음.

### PLANNER-008 · 구현/검증 (2026-11-17)
- 추가 사용자 결정: 카테고리별 입력 양식 차별화, 독서는 책/범위/내용/생각·후기. 운동·공부·자기계발·업무·생활·집안일·건강·식단·돈관리·쇼핑·취미·창작·관계·여행·행정·회고까지 일반 포함18종. 첫 화면은 자주 쓰는 항목+전체 펼치기.
- 소스38c6fa9d9870f55e53eb1455140e2b52c0210525, PR5. 날짜 없는 item은 기존 모델의 date=''로 호환, 일정/연체/알림에서 제외. 날짜 지정으로 이동. categoryDetails는 카테고리 변경시 보존하며 검색/백업/병합 대상, 기존 항목 일괄 재작성 없음. 날짜별 dayOrder는 반복 일정 다른 날짜/시간 자체를 바꾸지 않음.
- 웹v7/Android0.2.0(code3). 일간 중심·하루기록접기·큰글자설정·업적설정이동, 위젯8일스냅샷/5개/마지막기록 표시. 실제 위젯 런처/리사이즈/날짜변경/앱 업데이트는 미검증.
- 직접 pnpm test: 기존45 검사 및 신규 inbox/order/backup/category/widget 데이터 검사, sync 모의(cache첫조회 차단/오래된삭제보호/업로드/다른계정차단) 통과. pnpm mobile:sync 성공. Chromium 웹/네이티브 어댑터 모의 각각360/390/768/1360 8조합, 보관함 입력/카테고리왕복기록유지/재실행/날짜이동/순서유지/5뷰/가로넘침/44px/다크/큰글자/동작줄이기 검사통과, JS오류0. 독서 양식390px 캡처 직접 확인.
- 확인된 검사 실패: 기존 smoke가 옛 동기화 안내 문구를 기대해 실패 → 새 문구에 맞게 기대값 변경 후8조합 통과. 제품 데이터 손상/원격실동기화 실패를 뜻하지 않음.
- Firebase는 여전히 null. Android/Web 공통 이메일 로그인 준비/서버트랜잭션 최신수정우선/삭제표시보존/다른계정로컬업로드차단. 실제 Auth·Firestore 생성/보안규칙배포·두기기시험 미완료. 사용자에게 기존 프로젝트 유무 요청 중이며 임의 프로젝트/과금 생성 없음.
- 위젯 구현 참고: https://developer.android.com/develop/ui/views/appwidgets/advanced ; 인증: https://firebase.google.com/docs/auth/web/password-auth . 코드/모의검사와 서비스실동작/실기기검증 구분.
- Actions44023238076 assembleRelease/lintRelease 진행 중. 빌드 검증·서명·원격 APK 해시 확인 전 게시 완료로 처리하지 않음. 허브PR7 병합12d85b2에 요청/제한 기록.

### PLANNER-008 · 게시 준비
- 담당 Codex, APK source38c6fa9d9870f55e53eb1455140e2b52c0210525, Android0.2.0(code3), 웹v7. Actions44023238076 빌드/린트/검사 전부 success. ZIP SHA256 bf8f7f11ad8de5a1dd182b3f402b9a5b5e12f0c4e55c26cd094e0d6ae3666e97 직접 대조.
- 같은 인증서8197dcd546b9e42c683f51455c46e477858d9a6278fa478074a1f5cdbab4d908로 v2/v3 서명·검증. APK SHA256 240b1e30551c90a9e7b72d945b20fc0b519de250eea42eba58ecfc0c1dacdc46. APK 내부6asset와 로컬 소스 빌드 결과 일치(텍스트CRLF 정규화, PNG바이트).
- PR5로 downloads/planner-0.2.0.apk/manifest/설치안내 및 소스 게시 예정. 이전APK 보존. Firebase 미연결 상태 명시, 실제 폰 설치/위젯/두기기 동기화 완료 아님. 게시 직전 원격 TASKS/PR5 head 재조회.


### PLANNER-008 · 기능 게시 완료 / Firebase 연결 미완료 · 2026-11-17
- PR5 main 병합00a72ab3827eaf18ea8e0334939ea002989f26fa. Pages44023824067 build/deploy/report 모두 success. 설치페이지0.2.0 및 웹categoryFields HTTP200 직접 확인, 공개 APK 재다운로드 SHA256 240b1e30551c90a9e7b72d945b20fc0b519de250eea42eba58ecfc0c1dacdc46 일치.
- 공개 https://d0ngkyu.github.io/planner/downloads/ , APK source38c6fa9/빌드44023238076/동일키v2v3/내부6asset 대조. 기존 앱 삭제 없이 업데이트, 실제 사용자 폰 설치·데이터유지·홈 위젯 등록/크기변경·알림 수신은 미확인.
- 완료: 18개 카테고리별 입력양식/내용검색·보존, 미정 카드→날짜이동, 날짜별 순서, Android 오늘 위젯, 오늘 중심/접기/큰글자 UI. 기존45+신규데이터/동기화모의·8화면검사 통과. 위젯은 마지막 앱 기록 기준8일/5항목, 직접체크/서버백그라운드수신 아님.
- 미완료: Firebase 프로젝트 연결정보 없음(null). 이메일 로그인/서버충돌처리 코드는 준비했지만 Auth활성화·Firestore규칙배포·실제두기기 동기화는 진행하지 못함. 프로젝트 유무 사용자 답변 대기. 연결정보 확보 후 기존계정/프로젝트 범위 확인→설정연결→실제계정 두기기/오프라인 재접속 검증→새APK가 다음 단계. 임의 클라우드 계정/과금 생성 안 함.
- 게시 잠금 해제. Codex·Claude 협업 유지, Gemini 신규 작업 없음. 공개/코드 검증과 폰 적용/실서버검증을 구분한다.

### DAY-DIAL-009 · 소스검증/게시준비 · 2026-11-17
- PR7, 담당Codex. APK소스0370af8ade9a51a94b52dc4d62c65ed9a718434d, 웹v8/Android0.3.0(code4). 기본원판/목록선택보존, 현재시간바늘30초갱신, 동심원겹침/자정분할, 선택카드·키보드/시간목록선택, 완료는 발생일 기준, 시간없는항목 아래목록. 기존 데이터모델 유지.
- 직접 pnpm test 기존전체+원판검사(겹침/자정/반복완료/미정·잘못된시간제외/종료기본/원호/HTML이스케이프) 통과; mobile:sync 성공. 원판 Chromium360/390/768/1360 기본/선택/상세/완료/전날이어짐/날짜별바늘/목록선호보존/라이트·다크·큰글자/넘침·44px 검사 및 기존 웹/네이티브모의8조합회귀통과, JS오류0. 390 라이트/다크 캡처 확인.
- 발견/해결: 선택카드가 고정입력창 밑에 놓이는 경우→선택시 보이는위치로 스크롤/여백 보완. 테스트초기데이터를 pagehide저장이 덮어써 fixture실패→앱로드전주입 수정. 업적창 자동처리와 명시닫기 중복으로 캡처시험대기→핸들러해제후닫기 수정, 최종4너비 통과. 제품데이터 손상/실기기실패 아님.
- Actions44026008032 assembleRelease/lintRelease/테스트 모두success. artifact14303515752 ZIP SHA256 153927e6af98720afecff93eb34396442c070ed3fdb72a6293c583b756a992db 대조. APK내부6asset 대조(텍스트CRLF정규화/PNG바이트) 일치.
- 기존인증서8197dcd546b9e42c683f51455c46e477858d9a6278fa478074a1f5cdbab4d908 v2/v3 서명검증. APK SHA256 92b8cf3b171b7ef9d47adcc6d219cc27135e6cdd392675735f0363474716f16a. downloads/planner-0.3.0.apk/manifest/안내 게시 예정, 기존APK보존. 원격TASKS/PR head 재확인후 병합.
- 허브PR9 병합fdc35c7에 작업/검증/범위 기록. Firebase null/실동기화미연결 유지. 실제폰 업데이트·원판터치·알림은 미검증, 게시와실폰적용 구분.


### DAY-DIAL-009 · 게시 완료 · 2026-11-17
- PR7 main병합 d939a2a91135cf1465325c86da55f90be8fd0f5e. Pages44026674930 build/deploy/report success. 공개설치페이지0.3.0/원판모듈HTTP200·swv8 확인. 공개APK재다운로드 SHA256 92b8cf3b171b7ef9d47adcc6d219cc27135e6cdd392675735f0363474716f16a 일치.
- 설치 https://d0ngkyu.github.io/planner/downloads/ , 웹 https://d0ngkyu.github.io/planner/ . 앱소스0370af8/빌드44026008032, 기존인증서v2v3/내부6asset 대조. 기존앱 삭제없는 업데이트. 실제 사용자폰 설치/원판터치/알림 미확인.
- 전체로직검사+원판4너비/기존웹·네이티브모의8조합 성공, 기존기능/데이터 유지. 동기화는Firebase null로미연결 유지. 다음은 실제폰사용감/원판배치 조정 또는 Firebase프로젝트정보 확보 후 연결. 게시잠금해제.

### INSPIRATION-010 구현/검증 중 · 2026-11-17
- 사용자 추가 요청에 따라 72개 초안에서 360개 고유 글로 확대(창작348/속담10/고전의역2). 출처/분류 INSPIRATION.md. 시간대 자동교체·탭 다음·이전·저장스냅샷·6느낌12하위분류·미저장 유사글3개.
- 새싹 6표정, Android launcher aliases/6시간 JobScheduler/설정해제/위젯 표정. API33이상 원자적 전환, 이전버전 새 아이콘을 먼저 활성화. OS/런처 반영과 업그레이드 실제폰은 미검증.
- 직접검증: pnpm test 전체 통과(360고유/순환/추천/백업/삭제/검색/6상태 포함), mobile:sync 성공. Chromium 웹/네이티브모의 각360/390/768/1360px에서 새글/이전/저장/재시작/영감함/추천저장·해제/출처/시간대/아이콘설정/큰글씨·다크 통과. 네이티브 실기기 검사가 아님.
- 웹v9/Android0.4.0(code5) 준비. CI/JUnit/Android lint 및 APK 게시 증거는 후속 기록. 기존 앱/원판 회귀검사 진행 중, Firebase null 유지.

### INSPIRATION-010 디자인 수정 · 사용자 최신 지시 · 2026-11-17
- 사용자 '촌스럽다, 심플하게' 및 '모바일 배경에 뜨는 앱 아이콘' 명확화. 홈 런처 아이콘을 2색 달력 외곽선/작은표정으로 교체, 볼터치·새싹·왕관 장식 제거. 6상태 로직 유지, Android8+ adaptive mask/Android13 monochrome 리소스 추가. 실제 런처 확인은 미완료.
- 앱 한조각 카드도 큰캐릭터·둥근박스·색면버튼 제거, 글 중심/선형저장·다음/영감함. 이전글은 출처 상세 안에 보존. 수정 후 웹/네이티브모의8조합 통과. 기존8조합 및 원판4너비 검사는 최초구현에서 모두 통과.
- 최초 아이콘/소스17580b3 빌드는 공개하지 않음. 수정 소스로 다시 빌드/서명 후 게시한다. 초기 Python 실행은 Windows 별칭으로 편집 미수행 확인, Node로 변경 적용/구문·UI 검사 완료.

### INSPIRATION-010 한조각 정렬 수정 · 2026-11-17
- 사용자 명확화: 정렬 대상은 '한조각'. 전체 헤더/카테고리 재배치 시도는 미커밋 상태에서 되돌림. 카드 안 제목/본문/출처 왼쪽선 통일, 하단 저장/다음/영감함을 동일너비3열로 정렬. 캐릭터는 카드에 노출하지 않고 홈 아이콘/위젯/설정에서만 사용.
- 중간 소스0d43f26의 Android29/44039918752는 JUnit·lint·APK빌드 성공. 카드 정렬 최종수정 때문에 해당 APK는 게시하지 않고 다시 빌드한다.
- 전체배치 시험 실행 중 되돌림과 겹친 기존 smoke-browser 마지막조합에서 제거된 임시 #categoryToggle 타임아웃 발생(제품오류로 확정하지 않음). 최종파일로 재검사해 기록한다. 이전 원본회귀8조합/원판4너비는 최초구현에서 통과한 별도증거.
