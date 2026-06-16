"use client";

import { type FormEvent, useState, useSyncExternalStore } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
} from "firebase/auth";
import { friendlyAuthError, resolveLoginEmail, validateLoginId } from "@/lib/auth-helpers";
import { getFirebaseAuth } from "@/lib/firebase";

type Listener = () => void;

let authUser: User | null = null;
let unsubscribe: Unsubscribe | null = null;
const listeners = new Set<Listener>();

const emit = (next: User | null) => {
  authUser = next;
  listeners.forEach((listener) => listener());
};

const start = () => {
  if (unsubscribe) return;

  try {
    unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => emit(user));
  } catch {
    emit(null);
  }
};

const stop = () => {
  unsubscribe?.();
  unsubscribe = null;
  authUser = null;
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  if (listeners.size === 1) start();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
};

const getSnapshot = (): User | null => authUser;
const getServerSnapshot = (): User | null => null;

/**
 * Firebase Auth 로그인 상태 싱글톤 구독을 읽습니다.
 * 어디서 호출하든 같은 사용자 객체를 반환하며, onAuthStateChanged 구독은 1개만 유지됩니다.
 */
export const useAuthUser = (): User | null => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

type AuthDraft = {
  loginId: string;
  password: string;
};

type AuthMode = "login" | "signup";

/**
 * 로그인/회원가입 폼의 로컬 상태와 제출/로그아웃 액션을 관리합니다.
 * authUser는 useAuthUser의 싱글톤 store에서 읽어와 다른 페이지와 공유됩니다.
 * setNotice는 인증 흐름에서 발생한 메시지를 상위 페이지의 알림 영역에 전달하기 위한 콜백입니다.
 */
export const useAuth = (setNotice: (message: string) => void) => {
  const authUser = useAuthUser();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authDraft, setAuthDraft] = useState<AuthDraft>({ loginId: "", password: "" });
  const [showPassword, setShowPassword] = useState(true);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    const loginIdError = validateLoginId(authDraft.loginId);

    if (loginIdError) {
      setNotice(loginIdError);
      return;
    }

    if (!authDraft.password) {
      setNotice("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsAuthLoading(true);
      const auth = getFirebaseAuth();
      const loginEmail = resolveLoginEmail(authDraft.loginId);

      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, loginEmail, authDraft.password);
        setNotice("회원가입 완료. 로그인 상태입니다.");
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, authDraft.password);
        setNotice("로그인 완료.");
      }

      setAuthDraft({ loginId: "", password: "" });
    } catch (error) {
      setNotice(friendlyAuthError(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    await signOut(getFirebaseAuth());
    setNotice("로그아웃했습니다.");
  };

  return {
    authUser,
    authMode,
    setAuthMode,
    authDraft,
    setAuthDraft,
    showPassword,
    setShowPassword,
    authPanelOpen,
    setAuthPanelOpen,
    isAuthLoading,
    submitAuth,
    logout,
  };
};
