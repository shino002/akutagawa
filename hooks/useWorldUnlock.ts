"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { World } from "@/lib/types";

const sessionUnlockStorageKey = (userId: string) => `world-unlocks:${userId}`;

function readSessionUnlocks(userId: string): Record<string, boolean> {
  if (typeof window === "undefined" || !userId) return {};

  try {
    const raw = window.sessionStorage.getItem(sessionUnlockStorageKey(userId));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => entry[1] === true),
    );
  } catch {
    return {};
  }
}

function writeSessionUnlocks(userId: string, worldIds: Record<string, boolean>) {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.sessionStorage.setItem(sessionUnlockStorageKey(userId), JSON.stringify(worldIds));
  } catch {
    // sessionStorage unavailable — ignore
  }
}

function mergeUnlockMaps(
  ...sources: Array<Record<string, boolean>>
): Record<string, boolean> {
  return sources.reduce<Record<string, boolean>>((merged, source) => ({ ...merged, ...source }), {});
}

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
    if (!authUser) {
      setUnlockState({ userId: "", worldIds: {} });
      return;
    }

    const sessionUnlocks = readSessionUnlocks(authUser.uid);
    setUnlockState({ userId: authUser.uid, worldIds: sessionUnlocks });

    return onSnapshot(
      collection(getFirebaseDb(), "users", authUser.uid, "worldUnlocks"),
      (snapshot) => {
        const firestoreUnlocks: Record<string, boolean> = {};
        snapshot.docs.forEach((unlockDoc) => {
          firestoreUnlocks[unlockDoc.id] = true;
        });

        const mergedUnlocks = mergeUnlockMaps(
          readSessionUnlocks(authUser.uid),
          firestoreUnlocks,
        );
        writeSessionUnlocks(authUser.uid, mergedUnlocks);
        setUnlockState({ userId: authUser.uid, worldIds: mergedUnlocks });
      },
      (error) => {
        setUnlockState({ userId: authUser.uid, worldIds: readSessionUnlocks(authUser.uid) });
        setNotice(
          error instanceof Error
            ? error.message
            : "세계관 잠금 해제 기록을 불러오지 못했어요.",
        );
      },
    );
  }, [authUser, setNotice]);

  const markWorldUnlocked = (userId: string, worldId: string) => {
    setUnlockState((current) => {
      const nextWorldIds = mergeUnlockMaps(
        current.userId === userId ? current.worldIds : {},
        { [worldId]: true },
      );
      writeSessionUnlocks(userId, nextWorldIds);
      return { userId, worldIds: nextWorldIds };
    });
    setWorldPasswordDrafts((current) => ({ ...current, [worldId]: "" }));
  };

  const unlockWorldById = async (event: FormEvent<HTMLFormElement>, worldId: string) => {
    event.preventDefault();
    const targetWorld = worlds.find((world) => world.id === worldId);
    const targetPassword = targetWorld?.password?.trim() ?? "";
    const draftPassword = worldPasswordDrafts[worldId]?.trim() ?? "";

    if (!targetWorld) {
      setNotice("세계관 정보를 찾지 못했어요. 관리자에게 문의해주세요.");
      return;
    }

    if (!authUser) {
      setNotice("세계관 비밀번호는 회원가입 또는 로그인 후 입력할 수 있어요.");
      onRequireAuth();
      return;
    }

    if (!targetPassword) {
      markWorldUnlocked(authUser.uid, worldId);
      return;
    }

    if (!draftPassword) {
      setNotice("세계관 비밀번호를 입력해주세요.");
      return;
    }

    if (draftPassword !== targetPassword) {
      setNotice("세계관 비밀번호가 맞지 않아요.");
      return;
    }

    markWorldUnlocked(authUser.uid, worldId);

    try {
      await setDoc(doc(getFirebaseDb(), "users", authUser.uid, "worldUnlocks", worldId), {
        worldId,
        unlockedAt: serverTimestamp(),
      });
      setNotice("세계관 기록을 열었어요.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "세계관 잠금 해제 기록을 저장하지 못했어요.";

      setNotice(
        message.includes("permission") || message.includes("Permission")
          ? "이번 브라우저에서는 열렸지만 저장 권한이 없어요. 관리자에게 Firestore 규칙 배포를 요청해주세요."
          : message,
      );
    }
  };

  return {
    worldPasswordDrafts,
    setWorldPasswordDrafts,
    unlockedWorldIds,
    unlockWorldById,
    requireAuth: onRequireAuth,
  };
};
