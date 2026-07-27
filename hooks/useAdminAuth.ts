"use client";

import { type FormEvent, useState } from "react";
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import {
  ADMIN_AUTH_EMAIL,
  friendlyAuthError,
  resolveLoginEmail,
  validateLoginId,
} from "@/lib/auth-helpers";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuthUser } from "@/hooks/useAuth";

type LoginDraft = {
  loginId: string;
  password: string;
};

/**
 * 관리자 페이지 전용 로그인 상태와 액션입니다.
 * authUser는 useAuthUser 싱글톤을 읽어 공개 페이지와 구독을 공유합니다.
 * 저장/업로드용 notice와 구분되는 authNotice만 이 훅이 소유합니다.
 */
export const useAdminAuth = () => {
  const authUser = useAuthUser();
  const [loginDraft, setLoginDraft] = useState<LoginDraft>({ loginId: "", password: "" });
  const [authNotice, setAuthNotice] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const isAdmin = authUser?.email === ADMIN_AUTH_EMAIL;

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthNotice("");

    const loginIdError = validateLoginId(loginDraft.loginId);

    if (loginIdError) {
      setAuthNotice(loginIdError);
      return;
    }

    if (!loginDraft.password) {
      setAuthNotice("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsAuthLoading(true);
      await signInWithEmailAndPassword(
        getFirebaseAuth(),
        resolveLoginEmail(loginDraft.loginId),
        loginDraft.password,
      );
      setLoginDraft({ loginId: "", password: "" });
      setAuthNotice("로그인 완료.");
    } catch (error) {
      setAuthNotice(friendlyAuthError(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(getFirebaseAuth());
  };

  return {
    authUser,
    loginDraft,
    setLoginDraft,
    authNotice,
    setAuthNotice,
    isAuthLoading,
    signIn,
    signOut,
    isAdmin,
  };
};
