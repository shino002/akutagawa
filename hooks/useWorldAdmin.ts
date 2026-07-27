"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useWorlds } from "@/hooks/useWorlds";
import { omitUndefined } from "@/lib/firestore-helpers";
import { getFirebaseDb } from "@/lib/firebase";
import { buildTextGlitchFirestorePatch } from "@/lib/text-glitch-persistence";
import {
  compactWorldDraftTextGlitch,
  createBlankWorldDraft,
  pruneWorldDraftTextGlitch,
  worldToDraft,
  type WorldDraft,
} from "@/lib/world-glitch-fields";
import type { World } from "@/lib/types";
import { slugifyId } from "@/utils/slugifyId";

type UseWorldAdminOptions = {
  isAdmin: boolean;
  onNotice: (message: string) => void;
  setIsSaving: (value: boolean) => void;
};

/**
 * 관리자 World 카테고리 편집 상태입니다.
 * 목록 읽기는 useWorlds 싱글톤을 재사용합니다.
 *
 * activeCharacterWorldId / worldSettingsText / worldWorkDraft 는
 * 캐릭터 편집 화면의 "참가 세계관" 상태라 이 훅에 넣지 않습니다.
 */
export const useWorldAdmin = ({ isAdmin, onNotice, setIsSaving }: UseWorldAdminOptions) => {
  const { data: worlds, error: worldsError } = useWorlds();
  const [activeWorldId, setActiveWorldId] = useState("");
  const [worldDraft, setWorldDraft] = useState<WorldDraft>(() => createBlankWorldDraft());
  const worldsRef = useRef(worlds);
  worldsRef.current = worlds;

  useEffect(() => {
    if (worldsError) {
      onNotice(worldsError);
    }
  }, [worldsError, onNotice]);

  useEffect(() => {
    setActiveWorldId((current) => current || worlds[0]?.id || "");
    setWorldDraft((current) => {
      if (current.id) return current;
      const firstWorld = worlds[0];
      return firstWorld ? worldToDraft(firstWorld) : current;
    });
  }, [worlds]);

  const startNewWorld = () => {
    setActiveWorldId("");
    setWorldDraft(createBlankWorldDraft());
    onNotice("새 World 정보를 입력해주세요.");
  };

  const selectWorld = (world: World) => {
    setActiveWorldId(world.id);
    setWorldDraft(worldToDraft(world));
  };

  const saveWorld = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      onNotice("관리자만 세계관을 저장할 수 있어요.");
      return;
    }

    const title = worldDraft.title.trim();
    const id = slugifyId(worldDraft.id || title);

    if (!id || !title) {
      onNotice("세계관 이름은 꼭 입력해주세요.");
      return;
    }

    const existingWorld = worlds.find((world) => world.id === id);
    const prunedDraft: WorldDraft = {
      ...worldDraft,
      textGlitch: pruneWorldDraftTextGlitch(worldDraft.textGlitch, worldDraft),
    };
    const textGlitch = compactWorldDraftTextGlitch(prunedDraft);
    const textGlitchPatch = buildTextGlitchFirestorePatch(textGlitch, existingWorld?.textGlitch);

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "worlds", id),
        omitUndefined({
          id,
          title,
          subtitle: prunedDraft.subtitle.trim(),
          description: prunedDraft.description.trim(),
          password: prunedDraft.password.trim(),
          ...textGlitchPatch,
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setActiveWorldId(id);
      setWorldDraft({
        ...prunedDraft,
        id,
        title,
        password: prunedDraft.password.trim(),
        textGlitch: textGlitch ?? prunedDraft.textGlitch,
      });
      onNotice(
        textGlitch ? "세계관을 저장했어요. 오류 구간도 함께 저장됐습니다." : "세계관을 저장했어요.",
      );
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "세계관 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWorld = async (worldId: string) => {
    if (!isAdmin || !worldId) return;

    try {
      setIsSaving(true);
      await deleteDoc(doc(getFirebaseDb(), "worlds", worldId));
      setActiveWorldId("");
      setWorldDraft(createBlankWorldDraft());
      onNotice("세계관 목록에서 삭제했어요. 자캐 안의 참가 기록은 보존됩니다.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "세계관 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    worlds,
    worldsRef,
    activeWorldId,
    setActiveWorldId,
    worldDraft,
    setWorldDraft,
    startNewWorld,
    selectWorld,
    saveWorld,
    deleteWorld,
  };
};
