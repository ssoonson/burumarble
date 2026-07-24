import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 콘솔 → 프로젝트 설정 → 내 앱 에서 복사한 값을
// .env 파일에 VITE_FIREBASE_* 형태로 넣어주세요 (.env.example 참고).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 허용할 학교 도메인. firestore.rules 의 allowedDomain() 과 반드시 동일하게 유지하세요.
export const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || "sen.go.kr";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
// Google 계정 선택 화면에서 학교 도메인 계정을 우선 노출 (UX 힌트일 뿐, 보안 아님)
googleProvider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: "select_account" });

export function isAllowedEmail(email) {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN.toLowerCase()}`);
}
