"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { characterFirestorePayload } from "@/lib/firestore-helpers";
import { getFirebaseDb } from "@/lib/firebase";
import { deleteR2Images } from "@/lib/r2-upload-client";
import type { Character, CharacterWorldEntry, UploadedImage } from "@/lib/types";
import { createBlankWorldEntry, upsertWorldEntry } from "@/lib/world-entries";
import { normalizeWorldEntries } from "@/utils/normalizers";

type UseCharacterImagesParams = {
  isAdmin: boolean;
  activeCharacter: Character | undefined;
  resolvedCharacterWorldId: string;
  activeCharacterWorldEntry: CharacterWorldEntry | undefined;
  setNotice: (message: string) => void;
  setIsSaving: (value: boolean) => void;
  uploadPendingImages: (
    characterId: string,
    persist: (uploaded: UploadedImage[], worldId: string) => Promise<void>,
  ) => Promise<void>;
};

/**
 * 캐릭터·세계관 이미지 업로드·삭제·정보 수정을 담당합니다.
 */
export const useCharacterImages = ({
  isAdmin,
  activeCharacter,
  resolvedCharacterWorldId,
  activeCharacterWorldEntry,
  setNotice,
  setIsSaving,
  uploadPendingImages,
}: UseCharacterImagesParams) => {
  const uploadImages = async () => {
    if (!activeCharacter) {
      setNotice("사진을 저장하려면 먼저 기본 · 레코드 탭에서 「본 페이지에 저장」을 눌러주세요.");
      return;
    }

    await uploadPendingImages(activeCharacter.id, async (uploaded, worldId) => {
      if (worldId) {
        const targetEntry =
          normalizeWorldEntries(activeCharacter.worldEntries).find(
            (entry) => entry.worldId === worldId,
          ) ?? createBlankWorldEntry(worldId);
        const nextEntry = {
          ...targetEntry,
          images: [...targetEntry.images, ...uploaded],
        };

        await setDoc(
          doc(getFirebaseDb(), "characters", activeCharacter.id),
          characterFirestorePayload(activeCharacter, {
            worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
            updatedAt: serverTimestamp(),
          }),
          { merge: true },
        );
        return;
      }

      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          images: [...(activeCharacter.images ?? []), ...uploaded],
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
    });
  };

  const deleteImage = async (imageId: string) => {
    if (!isAdmin || !activeCharacter) return;

    const targetImage = (activeCharacter.images ?? []).find((image) => image.id === imageId);

    if (!targetImage) {
      setNotice("삭제할 이미지 기록을 찾지 못했어요.");
      return;
    }

    try {
      setIsSaving(true);
      await deleteR2Images([targetImage]);
      const nextCharacter: Character = {
        ...activeCharacter,
        images: (activeCharacter.images ?? []).filter((image) => image.id !== imageId),
      };
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("이미지를 Cloudflare R2와 Firestore 기록에서 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "이미지 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateImageInfo = async (
    imageId: string,
    updates: Partial<Pick<UploadedImage, "category" | "name">>,
  ) => {
    if (!isAdmin || !activeCharacter) return;

    const nextImages = (activeCharacter.images ?? []).map((image) =>
      image.id === imageId ? { ...image, ...updates } : image,
    );
    const nextCharacter: Character = {
      ...activeCharacter,
      images: nextImages,
    };

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("그림 정보를 수정했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "그림 정보 수정에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWorldImage = async (imageId: string) => {
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId || !activeCharacterWorldEntry) {
      return;
    }

    const targetImage = activeCharacterWorldEntry.images.find((image) => image.id === imageId);
    if (!targetImage) {
      setNotice("삭제할 세계관 이미지를 찾지 못했어요.");
      return;
    }

    const nextEntry: CharacterWorldEntry = {
      ...activeCharacterWorldEntry,
      images: activeCharacterWorldEntry.images.filter((image) => image.id !== imageId),
    };
    const nextCharacter: Character = {
      ...activeCharacter,
      worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
    };

    try {
      setIsSaving(true);
      await deleteR2Images([targetImage]);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("세계관 이미지를 Cloudflare R2와 Firestore 기록에서 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 이미지 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateWorldImageInfo = async (
    imageId: string,
    updates: Partial<Pick<UploadedImage, "category" | "name">>,
  ) => {
    if (!isAdmin || !activeCharacter || !activeCharacterWorldEntry) return;

    const nextEntry: CharacterWorldEntry = {
      ...activeCharacterWorldEntry,
      images: activeCharacterWorldEntry.images.map((image) =>
        image.id === imageId ? { ...image, ...updates } : image,
      ),
    };
    const nextCharacter: Character = {
      ...activeCharacter,
      worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
    };

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("세계관 그림 정보를 수정했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 그림 정보 수정에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    uploadImages,
    deleteImage,
    updateImageInfo,
    deleteWorldImage,
    updateWorldImageInfo,
  };
};
