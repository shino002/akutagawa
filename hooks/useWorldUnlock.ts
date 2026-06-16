"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { World } from "@/lib/types";

/**
 * 세계관 비밀번호 입력 임시값과 계정별 잠금 해제 상태를 관리합니다.
 * 로그인한 사용자가 비밀번호를 한 번 맞히면 Firestore에 기록해 다음 방문부터 자동으로 엽니다.
 */
export const useWorldUnlock = (
  worlds: World[],
  authUser: User | null,
  setNotice: (message: string) => void,
  onRequireAuth: () => void,
) => {
  const [worldPasswordDrafts, setWorldPasswordDrafts] = useState<Record<string, string>>({});
  const [unlockState, setUnlockState] = useState<{
    userId: string;
    worldIds: Record<string, boolean>;
  }>({ userId: "", worldIds: {} });
  const unlockedWorldIds = authUser?.uid === unlockState.userId ? unlockState.worldIds : {};

  useEffect(() => {
    if (!authUser) return;

    return onSnapshot(
      collection(getFirebaseDb(), "users", authUser.uid, "worldUnlocks"),
      (snapshot) => {
        const nextUnlockedWorldIds: Record<string, boolean> = {};
        snapshot.docs.forEach((unlockDoc) => {
          nextUnlockedWorldIds[unlockDoc.id] = true;
        });
        setUnlockState({ userId: authUser.uid, worldIds: nextUnlockedWorldIds });
      },
      (error) => {
        setNotice(
          error instanceof Error
            ? error.message
            : "세계관 잠금 해제 기록을 불러오지 못했어요.",
        );
      },
    );
  }, [authUser, setNotice]);

  const unlockWorldById = async (event: FormEvent<HTMLFormElement>, worldId: string) => {
    event.preventDefault();
    const targetWorld = worlds.find((world) => world.id === worldId);
    const targetPassword = targetWorld?.password?.trim() ?? "";

    if (!targetWorld) return;

    if (!authUser) {
      setNotice("세계관 비밀번호는 회원가입 또는 로그인 후 입력할 수 있어요.");
      onRequireAuth();
      return;
    }

    if (!targetPassword || worldPasswordDrafts[worldId]?.trim() === targetPassword) {
      setUnlockState((current) => ({
        userId: authUser.uid,
        worldIds: {
          ...(current.userId === authUser.uid ? current.worldIds : {}),
          [worldId]: true,
        },
      }));
      setWorldPasswordDrafts((current) => ({ ...current, [worldId]: "" }));
      try {
        await setDoc(
          doc(getFirebaseDb(), "users", authUser.uid, "worldUnlocks", worldId),
          {
            worldId,
            unlockedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "세계관 잠금 해제 기록을 저장하지 못했어요.",
        );
      }
      return;
    }

    setNotice("세계관 비밀번호가 맞지 않아요.");
  };

  return {
    worldPasswordDrafts,
    setWorldPasswordDrafts,
    unlockedWorldIds,
    unlockWorldById,
  };
};
