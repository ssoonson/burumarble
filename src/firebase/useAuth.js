import { useEffect, useState, useCallback } from "react";
import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider, isAllowedEmail, ALLOWED_DOMAIN } from "./config.js";

/**
 * 로그인 상태 + 도메인 제한 + 교사 권한을 함께 관리하는 훅.
 *
 * 주의: 여기서의 도메인/권한 검사는 화면 제어용입니다.
 * 실제 차단은 firestore.rules 에서 이루어집니다.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setIsTeacher(false);
        setLoading(false);
        return;
      }

      // 학교 도메인이 아니면 즉시 로그아웃 처리
      if (!isAllowedEmail(fbUser.email)) {
        setError(`${ALLOWED_DOMAIN} 계정으로만 로그인할 수 있어요.`);
        await fbSignOut(auth);
        setUser(null);
        setIsTeacher(false);
        setLoading(false);
        return;
      }

      setUser({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
      });

      // 교사 여부 확인 (/admins/{uid} 문서 존재 여부)
      try {
        const adminSnap = await getDoc(doc(db, "admins", fbUser.uid));
        setIsTeacher(adminSnap.exists());
      } catch {
        setIsTeacher(false);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!isAllowedEmail(result.user.email)) {
        await fbSignOut(auth);
        setError(`${ALLOWED_DOMAIN} 계정으로만 로그인할 수 있어요.`);
      }
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user") return;
      setError("로그인 중 문제가 발생했어요. 다시 시도해주세요.");
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  return { user, isTeacher, loading, error, signIn, signOut };
}
