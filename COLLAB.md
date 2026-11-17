# 협업 규칙 (planner)
공통 규칙: https://github.com/d0ngkyu/ai-collaboration (README → RULES → PROJECTS). 이 파일은 프로젝트별 보충이다.

- 시작 시 `TASKS.md`, 최근 커밋, 열린 브랜치/PR 확인 후 작업 ID를 TASKS에 기록하고 시작한다.
- 작업은 `claude/…`, `codex/…`, `gemini/…` 브랜치에서 하고 PR로 main에 합친다. force push 금지.
- 배포 = main 병합 → GitHub Pages 자동 반영. 배포 담당은 한 번에 한 명(TASKS의 "배포 담당" 칸). Gemini는 PR까지만.
- 앱 파일을 바꾸면 `sw.js`의 `VERSION`을 올린다(안 올리면 폰에 옛 캐시가 남을 수 있음).
- 데이터 형식(`store.js` 레코드 모델)을 바꾸면 기존 데이터 이전 코드와 테스트를 함께 넣는다. 사용자 데이터 삭제/초기화 코드 금지.
- 검증 구분: `npm test`(Node), 헤드리스 브라우저 화면 확인, 실제 폰/PC 확인, 사용자 확인.
- 비밀값 금지. `firebase-config.js` 값은 공개 식별자라 커밋 가능하지만 서비스 계정 키·토큰은 절대 올리지 않는다.
