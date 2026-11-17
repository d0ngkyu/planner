# TASKS (planner)

| 항목 | 값 |
|---|---|
| 배포 담당 | 없음 (저장소/Pages 미생성) |
| 현재 버전 | sw `planner-v3` (브랜치 claude/achievements, 미배포) |

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

## 다음 후보
- PLANNER-002: GitHub Pages 배포 + Firebase 연결 후 폰·PC 실제 동기화 확인
- 알림(브라우저 푸시), 항목 드래그 정렬/날짜 이동, 습관 트래커, 구글 캘린더 가져오기
