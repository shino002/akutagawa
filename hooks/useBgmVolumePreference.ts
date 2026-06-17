"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export const DEFAULT_BGM_VOLUME = 0.2;
const SAVE_DEBOUNCE_MS = 400;

function clampVolume(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_BGM_VOLUME;
  }

  return Math.min(1, Math.max(0, value));
}

function readStoredVolume(raw: unknown) {
  if (typeof raw !== "number") {
    return DEFAULT_BGM_VOLUME;
  }

  return clampVolume(raw);
}

/**
 * 로그인한 사용자의 BGM 음량을 Firestore에 저장·불러옵니다.
 * 비로그인 상태에서는 기본 음량만 사용합니다.
 */
export function useBgmVolumePreference(authUser: User | null) {
  const [volume, setVolumeState] = useState(DEFAULT_BGM_VOLUME);
  const [isReady, setIsReady] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const hydratedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authUser) {
      hydratedUserIdRef.current = null;
      setVolumeState(DEFAULT_BGM_VOLUME);
      setIsReady(true);
      return;
    }

    setIsReady(false);

    return onSnapshot(
      doc(getFirebaseDb(), "users", authUser.uid, "preferences", "player"),
      (snapshot) => {
        if (hydratedUserIdRef.current !== authUser.uid) {
          setVolumeState(readStoredVolume(snapshot.data()?.bgmVolume));
          hydratedUserIdRef.current = authUser.uid;
        }
        setIsReady(true);
      },
      () => {
        if (hydratedUserIdRef.current !== authUser.uid) {
          setVolumeState(DEFAULT_BGM_VOLUME);
          hydratedUserIdRef.current = authUser.uid;
        }
        setIsReady(true);
      },
    );
  }, [authUser]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const setVolume = useCallback(
    (nextVolume: number) => {
      const clamped = clampVolume(nextVolume);
      setVolumeState(clamped);

      if (!authUser) {
        return;
      }

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        void setDoc(
          doc(getFirebaseDb(), "users", authUser.uid, "preferences", "player"),
          {
            bgmVolume: clamped,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }, SAVE_DEBOUNCE_MS);
    },
    [authUser],
  );

  return { volume, setVolume, isReady };
}
