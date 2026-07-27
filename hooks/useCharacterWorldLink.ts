"use client";

import { type Dispatch, type FormEvent, type SetStateAction, useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { characterFirestorePayload } from "@/lib/firestore-helpers";
import { getFirebaseDb } from "@/lib/firebase";
import { deleteR2Images } from "@/lib/r2-upload-client";
import type { Character, CharacterWorldEntry, UploadedImage, World } from "@/lib/types";
import { createBlankWorldEntry, upsertWorldEntry } from "@/lib/world-entries";
import { linesToList } from "@/utils/linesToList";
import { normalizeWorks, normalizeWorldEntries } from "@/utils/normalizers";

type UseCharacterWorldLinkParams = {
  isAdmin: boolean;
  activeCharacter: Character | undefined;
  worlds: World[];
  setNotice: (message: string) => void;
  setIsSaving: (value: boolean) => void;
  worldWorkImageFiles: File[];
  setWorldWorkImageFiles: Dispatch<SetStateAction<File[]>>;
  uploadWorkImages: (
    characterId: string,
    files: File[],
    worldId?: string,
  ) => Promise<UploadedImage[]>;
};

/**
 * 캐릭터–세계관 연결·설정·세계관 연성 관리를 담당합니다.
 */
export const useCharacterWorldLink = ({
  isAdmin,
  activeCharacter,
  worlds,
  setNotice,
  setIsSaving,
  worldWorkImageFiles,
  setWorldWorkImageFiles,
  uploadWorkImages,
}: UseCharacterWorldLinkParams) => {
  const [activeCharacterWorldId, setActiveCharacterWorldId] = useState("");
  const [worldSettingsText, setWorldSettingsText] = useState("");
  const [worldWorkDraft, setWorldWorkDraft] = useState({
    title: "",
    kind: "세계관 연성",
    date: "",
    body: "",
  });

  // 세계관 목록이 생기면 선택값이 비어 있을 때만 첫 항목을 표시용으로 씁니다.
  const resolvedCharacterWorldId = activeCharacterWorldId || worlds[0]?.id || "";

  const activeCharacterWorldEntry = useMemo(
    () =>
      normalizeWorldEntries(activeCharacter?.worldEntries).find(
        (entry) => entry.worldId === resolvedCharacterWorldId,
      ),
    [activeCharacter, resolvedCharacterWorldId],
  );

  const resetWorldForm = () => {
    setActiveCharacterWorldId("");
    setWorldSettingsText("");
    setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
  };

  const selectCharacterWorld = (worldId: string) => {
    const entry = normalizeWorldEntries(activeCharacter?.worldEntries).find(
      (worldEntry) => worldEntry.worldId === worldId,
    );
    setActiveCharacterWorldId(worldId);
    setWorldSettingsText(entry?.settings.join("\n") ?? "");
    setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
  };

  const saveCharacterWorldSettings = async () => {
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId) return;

    const nextEntry: CharacterWorldEntry = {
      ...(activeCharacterWorldEntry ?? createBlankWorldEntry(resolvedCharacterWorldId)),
      settings: linesToList(worldSettingsText),
    };

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("세계관별 설정을 저장했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관별 설정 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const addWorldWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId) return;

    if (!worldWorkDraft.title.trim() || !worldWorkDraft.body.trim()) {
      setNotice("세계관 연성/로그 제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      const uploadedImages = await uploadWorkImages(
        activeCharacter.id,
        worldWorkImageFiles,
        resolvedCharacterWorldId,
      );
      const nextEntry: CharacterWorldEntry = {
        ...(activeCharacterWorldEntry ?? createBlankWorldEntry(resolvedCharacterWorldId)),
        works: [
          {
            title: worldWorkDraft.title.trim(),
            kind: worldWorkDraft.kind.trim() || "세계관 연성",
            date: worldWorkDraft.date.trim() || "today",
            body: worldWorkDraft.body.trim(),
            images: uploadedImages,
          },
          ...(activeCharacterWorldEntry?.works ?? []),
        ],
      };
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
      setWorldWorkImageFiles([]);
      setNotice("세계관 연성/로그를 추가했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 연성/로그 추가에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWorldWork = async (workIndex: number) => {
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId || !activeCharacterWorldEntry) {
      return;
    }
    const targetWork = activeCharacterWorldEntry.works[workIndex];

    const nextEntry: CharacterWorldEntry = {
      ...activeCharacterWorldEntry,
      works: activeCharacterWorldEntry.works.filter((_, index) => index !== workIndex),
    };

    try {
      setIsSaving(true);
      await deleteR2Images(targetWork?.images ?? []);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("세계관 연성/로그를 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 연성/로그 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCharacterWorldEntry = async () => {
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId || !activeCharacterWorldEntry) {
      return;
    }

    const nextCharacter: Character = {
      ...activeCharacter,
      worldEntries: normalizeWorldEntries(activeCharacter.worldEntries).filter(
        (entry) => entry.worldId !== resolvedCharacterWorldId,
      ),
    };

    try {
      setIsSaving(true);
      await deleteR2Images([
        ...activeCharacterWorldEntry.images,
        ...normalizeWorks(activeCharacterWorldEntry.works).flatMap((work) => work.images ?? []),
      ]);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setActiveCharacterWorldId("");
      setWorldSettingsText("");
      setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
      setNotice("이 자캐의 세계관 참가 기록과 세계관 전용 이미지를 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 참가 기록 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    activeCharacterWorldId,
    setActiveCharacterWorldId,
    worldSettingsText,
    setWorldSettingsText,
    worldWorkDraft,
    setWorldWorkDraft,
    resolvedCharacterWorldId,
    activeCharacterWorldEntry,
    resetWorldForm,
    selectCharacterWorld,
    saveCharacterWorldSettings,
    addWorldWork,
    deleteWorldWork,
    deleteCharacterWorldEntry,
  };
};
