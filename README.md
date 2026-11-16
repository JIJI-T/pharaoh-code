# 파라오 코드 (수업용 웹 게임)

- 학생 화면: `index.html` — 접속 비밀번호 **2664**, 반·번호 입력 → 메뉴에서 선택
  - **개인 플레이**: 혼자 하는 연습 모드 (10라운드 × 30초, 점수는 그 기기에만 저장)
  - **학급 플레이**: 교사가 굴린 주사위로 반 전체가 동시에 겨루기
- 교사(방장) 화면: `admin.html` — 교사 코드 **2026**
  - 새 게임 열기 → 주사위 굴리기(누를 때마다 새 라운드) → 라운드 종료 / 게임 끝내기
  - 라운드 제한 시간, 타일당 최대 인원(기본 5명) 설정
  - 실시간 점수판 + 타일 현황(타일별로 몇 명이 가져갔는지)
- 규칙서 기준: 주사위 8·10·12면 중 **2개 또는 3개**로 식을 만들어요.
- 피라미드 10칸(노랑 4 · 파랑 3 · 빨강 2 · 검정 1), 숫자 타일 48장. 가져간 칸은 같은 색 더미에서 다시 채워요.
- 점수: 노랑 1~2 · 파랑 3~4 · 빨강 5~6 · 검정 7~8점 (같은 색에서 만들기 어려운 절반이 높은 점수, `common.js`의 HIGH 목록)
- 비밀번호와 기본값은 `config.js`에서 바꿀 수 있어요.
## 1. 깃허브에 올리기 (GitHub Pages)
1. github.com 로그인 → 오른쪽 위 **+ → New repository** → 이름 `pharaoh-code`, **Public** → Create
2. **uploading an existing file** 클릭 → 압축을 푼 파일 8개(index.html, admin.html, game.js, common.js, store.js, style.css, config.js, README.md)를 끌어다 놓기 → Commit changes
3. **Settings → Pages** → Branch: `main`, 폴더 `/ (root)` → Save
4. 1~2분 뒤 주소가 생겨요: `https://아이디.github.io/pharaoh-code/`
   - 교사 화면: `https://아이디.github.io/pharaoh-code/admin.html`

## 2. 실시간 점수 연결 (Firebase, 무료, 최초 1회)
설정 전에는 '체험 모드'라 학급 플레이가 기기 사이에 연결되지 않아요(개인 플레이는 그대로 됨).
1. console.firebase.google.com → **프로젝트 추가** (Analytics 꺼도 됨)
2. 왼쪽 **빌드 → Realtime Database → 데이터베이스 만들기** → 위치 아무거나 → **테스트 모드로 시작**
3. 프로젝트 개요 옆 ⚙ **프로젝트 설정 → 내 앱 → 웹(</>)** → 앱 등록 → 나오는 `firebaseConfig` 값을 복사
4. 깃허브에서 `config.js` 열기 → ✏️ 편집 → `FIREBASE_CONFIG` 안에 값 붙여넣기 → Commit
   (`databaseURL` 값이 꼭 있어야 해요. 없으면 Realtime Database 화면 위쪽 주소를 복사)

> 테스트 모드 규칙은 30일 뒤 만료돼요. Realtime Database → 규칙 탭에서 아래처럼 바꾸면 계속 쓸 수 있어요.
> ```json
> { "rules": { "pharaohCode": { ".read": true, ".write": true } } }
> ```
