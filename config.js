// ===== 파라오 코드 설정 파일 =====
window.APP_CONFIG = {
  STUDENT_PASSWORD: "2664", // 학생 접속 비밀번호
  ADMIN_PASSWORD: "2026",   // 교사(방장) 화면 코드

  // 개인 플레이(연습 모드)
  PRACTICE_ROUNDS: 10,      // 라운드 수
  PRACTICE_SECONDS: 60,     // 라운드당 제한 시간(초)

  // 학급 플레이 기본값 (교사 화면에서 바꿀 수 있음)
  CLASS_SECONDS: 60,        // 라운드당 제한 시간(초)
  CLASS_TILE_CAP: 5         // 타일 하나를 가져갈 수 있는 최대 인원
};

// Firebase 설정 — README.md 안내대로 값을 붙여 넣으세요.
// 비워 두면 '체험 모드'(같은 브라우저 안에서만 공유)로 동작합니다.
window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
