"use client";

import { type FormEvent, useState } from "react";
import type { World } from "@/lib/types";

/**
 * 세계관 비밀번호 입력 임시값과 잠금 해제 상태를 관리합니다.
 * 비밀번호가 없거나 일치하면 해당 세계관을 잠금 해제하고, 일치하지 않으면 setNotice로 알립니다.
 */
export const useWorldUnlock = (worlds: World[], setNotice: (message: string) => void) => {
  const [worldPasswordDrafts, setWorldPasswordDrafts] = useState<Record<string, string>>({});
  const [unlockedWorldIds, setUnlockedWorldIds] = useState<Record<string, boolean>>({});

  const unlockWorldById = (event: FormEvent<HTMLFormElement>, worldId: string) => {
    event.preventDefault();
    const targetWorld = worlds.find((world) => world.id === worldId);
    const targetPassword = targetWorld?.password?.trim() ?? "";

    if (!targetWorld) return;

    if (!targetPassword || worldPasswordDrafts[worldId]?.trim() === targetPassword) {
      setUnlockedWorldIds((current) => ({ ...current, [worldId]: true }));
      setWorldPasswordDrafts((current) => ({ ...current, [worldId]: "" }));
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
