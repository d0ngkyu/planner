# TASKS (planner)

| 항목 | 값 |
|---|---|
| 배포 담당 | 없음 (저장소/Pages 미생성) |
| 현재 버전 | sw `planner-v1` |

## PLANNER-001 · 첫 버전 (2026-11-17, Claude) — 완료(로컬)
- 요청: 모바일/PC 공동 사용 일·주·월 플래너. 사용자 결정: GitHub 새 프로젝트, 본인 혼자 기기 간 동기화.
- 결정: 빌드 없는 바닐라 JS PWA(세 AI 모두 수정 쉬움) + localStorage + 선택형 Firebase(Firestore/Google 로그인) 동기화, 레코드 단위 last-write-wins.
- 검증(직접): `npm test` 13개 통과. Playwright Chromium PC 1360px / 폰 390px에서 일·주·월·편집 화면 렌더, 빠른 입력·체크·메모·목표 입력, 새로고침 후 유지(6건) 확인. 콘솔 오류는 샌드박스의 글꼴 CDN 차단뿐.
- 미검증: 실제 Firebase 동기화(설정값 없음), 실제 폰 설치/iOS Safari, 서비스워커 오프라인 동작.
- 막힘: Claude 세션에 GitHub 쓰기 권한이 없어 원격 저장소 생성/푸시 못 함 → 사용자가 빈 저장소 `d0ngkyu/planner` 생성 필요.

## 다음 후보
- PLANNER-002: GitHub Pages 배포 + Firebase 연결 후 폰·PC 실제 동기화 확인
- 알림(브라우저 푸시), 항목 드래그 정렬/날짜 이동, 습관 트래커, 구글 캘린더 가져오기
