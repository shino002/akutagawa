"use client";

import { type Dispatch, type FormEvent, type SetStateAction } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { characterFirestorePayload } from "@/lib/firestore-helpers";
import { getFirebaseDb } from "@/lib/firebase";
import { deleteR2Images } from "@/lib/r2-upload-client";
import type { Character, UploadedImage, Work } from "@/lib/types";

type UseCharacterWorksParams = {
  isAdmin: boolean;
  activeCharacter: Character | undefined;
  workDraft: {
    title: string;
    kind: string;
    date: string;
    body: string;
  };
  setWorkDraft: Dispatch<
    SetStateAction<{
      title: string;
      kind: string;
      date: string;
      body: string;
    }>
  >;
  workImageFiles: File[];
  setWorkImageFiles: Dispatch<SetStateAction<File[]>>;
  setNotice: (message: string) => void;
  setIsSaving: (value: boolean) => void;
  uploadWorkImages: (
    characterId: string,
    files: File[],
    worldId?: string,
  ) => Promise<UploadedImage[]>;
};

/**
 * 캐릭터 연성(작품) 추가·삭제를 담당합니다.
 */
export const useCharacterWorks = ({
  isAdmin,
  activeCharacter,
  workDraft,
  setWorkDraft,
  workImageFiles,
  setWorkImageFiles,
  setNotice,
  setIsSaving,
  uploadWorkImages,
}: UseCharacterWorksParams) => {
  const addWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin || !activeCharacter) return;

    if (!workDraft.title.trim() || !workDraft.body.trim()) {
      setNotice("글 제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      const uploadedImages = await uploadWorkImages(activeCharacter.id, workImageFiles);
      const newWork: Work = {
        title: workDraft.title.trim(),
        kind: workDraft.kind.trim() || "연성",
        date: workDraft.date.trim() || "today",
        body: workDraft.body.trim(),
        images: uploadedImages,
      };

      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          works: [newWork, ...activeCharacter.works],
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setWorkDraft({ title: "", kind: "새 연성", date: "", body: "" });
      setWorkImageFiles([]);
      setNotice("글을 추가했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "글 추가에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWork = async (workIndex: number) => {
    if (!isAdmin || !activeCharacter) return;
    const targetWork = activeCharacter.works[workIndex];

    try {
      setIsSaving(true);
      await deleteR2Images(targetWork?.images ?? []);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          works: activeCharacter.works.filter((_, index) => index !== workIndex),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("글을 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "글 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return { addWork, deleteWork };
};
