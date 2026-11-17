# TASKS (planner)

| 항목 | 값 |
|---|---|
| 배포 담당 | Codex (ANDROID-006 앱 패키징 인수, 2026-11-17) |
| 현재 버전 | sw `planner-v4` — main 반영 |

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

## ANDROID-006 · Android 설치 앱 · Codex · 진행 중 (2026-11-17)
- 사용자 결정: 기존 기능/디자인을 유지하는 Android 앱으로 전환, 기능·디자인 개선은 후속으로 천천히 진행.
- 기준 main c3ac08f, 열린 PR 없음 확인. REPO-005는 설정 인계 상태이며 실행 중 배포 기록 없음. 이번 앱 패키징 담당 Codex 인수.
- 소유: Android 프로젝트/패키징/필수 네이티브 어댑터/관련 테스트·문서. 기존 데이터 모델 유지. 브랜치 codex/android-006.
- Pages 주소 HTTP 200 및 플래너 HTML 직접 확인(이전 세션). Firebase 연결/실기기 검증 미완료 유지.
- 계획: Capacitor 기반 로컬 번들 APK, 백업/뒤로가기/알림 호환 확인, 빌드와 회귀 테스트 후 PR. 서명 키·자격증명은 저장소에 올리지 않음.
